const bcrypt = require('bcryptjs');
const User = require('../../global/models/User');
const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
const {
  createAndEmit
} = require('../../global/services/notificationService');

/**
 * Hàm phụ trợ: Đếm số lượng hồ sơ ứng tuyển theo một trạng thái nhất định, 
 * được gom nhóm theo từng nhân viên Recruiter đã đăng tin tuyển dụng.
 * @param {Array<ObjectId>} recruiterIds - Mảng ID của các nhân sự Recruiter
 * @param {string} applicationStatus - Trạng thái hồ sơ cần đếm (VD: 'interview_scheduled')
 * @returns {Object} Object với key là recruiterId và value là số lượng đếm được.
 */
async function countAppsByRecruiterAndStatus(recruiterIds, applicationStatus) {
  if (!recruiterIds.length) return {};
  const rows = await Application.aggregate([{
    $match: {
      status: applicationStatus
    }
  }, {
    $lookup: {
      from: 'jobs',
      localField: 'job',
      foreignField: '_id',
      as: 'jobDoc'
    }
  }, {
    $unwind: '$jobDoc'
  }, {
    $match: {
      'jobDoc.postedBy': {
        $in: recruiterIds
      }
    }
  }, {
    $group: {
      _id: '$jobDoc.postedBy',
      count: {
        $sum: 1
      }
    }
  }]);
  return rows.reduce((acc, r) => {
    acc[r._id.toString()] = r.count;
    return acc;
  }, {});
}

/**
 * API Endpoint: Lấy danh sách toàn bộ người dùng có quyền Recruiter (kèm phân trang).
 * - Trả về chi tiết tài khoản Recruiter.
 * - Lấy tổng số lượng tin tuyển dụng mỗi Recruiter đã đăng.
 * - Thống kê số lượng ứng viên đã xếp lịch phỏng vấn và đã đậu phỏng vấn của từng Recruiter.
 */
const getAllRecruiterUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const baseFilter = {
      role: 'recruiter'
    };
    const totalItems = await User.countDocuments(baseFilter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const skip = (page - 1) * limit;
    const recruiterUsers = await User.find(baseFilter).select('-password').sort({
      createdAt: -1
    }).skip(skip).limit(limit);
    const recruiterIds = recruiterUsers.map(u => u._id);
    let jobsPostedMap = {};
    let scheduledMap = {};
    let passedMap = {};
    if (recruiterIds.length) {
      const jobsPostedAgg = await Job.aggregate([{
        $match: {
          postedBy: {
            $in: recruiterIds
          },
          status: {
            $ne: 'draft'
          }
        }
      }, {
        $group: {
          _id: '$postedBy',
          count: {
            $sum: 1
          }
        }
      }]);
      jobsPostedMap = jobsPostedAgg.reduce((acc, j) => {
        acc[j._id.toString()] = j.count;
        return acc;
      }, {});
      [scheduledMap, passedMap] = await Promise.all([
        countAppsByRecruiterAndStatus(recruiterIds, 'interview_scheduled'),
        countAppsByRecruiterAndStatus(recruiterIds, 'interview_passed')
      ]);
    }
    const formattedRecruiters = recruiterUsers.map(recruiter => {
      const idStr = recruiter._id.toString();
      return {
        id: recruiter._id,
        name: `${recruiter.lastName} ${recruiter.firstName}`.trim() || 'N/A',
        email: recruiter.email,
        department: recruiter.department || 'N/A',
        dateJoined: recruiter.joiningDate ? recruiter.joiningDate.toISOString().split('T')[0] : new Date(recruiter.createdAt).toISOString().split('T')[0],
        status: recruiter.isActive !== false ? 'active' : 'inactive',
        jobTitle: recruiter.jobTitle || 'Recruiter',
        location: recruiter.workLocation || recruiter.location || 'N/A',
        jobsPosted: jobsPostedMap[idStr] || 0,
        interviewScheduled: scheduledMap[idStr] || 0,
        interviewPassed: passedMap[idStr] || 0
      };
    });
    const companyJobIds = await Job.find({}).distinct('_id');
    const [summaryActiveRecruiter, summaryJobsPosted, summaryInterviewScheduled, summaryInterviewPassed] = await Promise.all([
      User.countDocuments({
        ...baseFilter,
        isActive: {
          $ne: false
        }
      }),
      Job.countDocuments({
        status: {
          $ne: 'draft'
        }
      }),
      Application.countDocuments({
        job: {
          $in: companyJobIds
        },
        status: 'interview_scheduled'
      }),
      Application.countDocuments({
        job: {
          $in: companyJobIds
        },
        status: 'interview_passed'
      })
    ]);

    res.json({
      success: true,
      data: formattedRecruiters,
      summary: {
        activeHR: summaryActiveRecruiter,
        totalJobsPosted: summaryJobsPosted,
        interviewScheduled: summaryInterviewScheduled,
        interviewPassed: summaryInterviewPassed
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching recruiter users:', error);
    res.status(500).json({
      error: 'Failed to fetch recruiter users',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Quản trị viên (Admin) tạo một tài khoản nhân sự Recruiter mới.
 * - Kiểm tra trùng lặp email.
 * - Mã hóa (hash) mật khẩu trước khi lưu.
 * - Tạo hồ sơ User với role='recruiter' và bắn thông báo (notification) chào mừng trong hệ thống.
 */
const createRecruiterUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      department,
      password,
      companyName,
      companyAddress
    } = req.body;
    if (!firstName || !lastName || !email || !department || !password) {
      return res.status(400).json({
        error: 'All fields are required: firstName, lastName, email, department, password'
      });
    }
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim()
    });
    if (existingUser) {
      return res.status(400).json({
        error: 'A user with this email already exists'
      });
    }
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newRecruiterUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'recruiter',
      department: department.trim(),
      companyName: companyName ? companyName.trim() : undefined,
      companyAddress: companyAddress ? companyAddress.trim() : undefined,
      joiningDate: new Date(),
      isActive: true,
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
      jobTitle: 'Recruiter',
      createdBy: req.user._id
    });
    const savedUser = await newRecruiterUser.save();
    try {
      await createAndEmit({
        toUserId: savedUser._id,
        toRole: 'recruiter',
        type: 'account_created',
        title: 'Chào mừng đến với findme!',
        message: `Tài khoản Nhà tuyển dụng của bạn đã được Admin tạo. Bạn có thể bắt đầu đăng tin tuyển dụng và quản lý đơn ứng tuyển.`,
        actionUrl: `/recruiter/dashboard`,
        entity: {
          kind: 'User',
          id: savedUser._id
        },
        priority: 'high',
        metadata: {
          userName: `${savedUser.lastName} ${savedUser.firstName}`,
          department: savedUser.department,
          createdBy: `${req.user.lastName} ${req.user.firstName}`
        },
        createdBy: req.user._id
      });
    } catch (notifError) {
      console.error('Failed to send recruiter account creation notification:', notifError);
    }
    const responseData = {
      id: savedUser._id,
      name: `${savedUser.lastName} ${savedUser.firstName}`.trim(),
      email: savedUser.email,
      department: savedUser.department,
      dateJoined: savedUser.joiningDate.toISOString().split('T')[0],
      status: 'active',
      jobTitle: savedUser.jobTitle,
      location: savedUser.workLocation || savedUser.location || 'N/A',
      jobsPosted: 0,
      interviewScheduled: 0,
      interviewPassed: 0
    };
    res.status(201).json({
      message: 'Recruiter user created successfully',
      recruiter: responseData
    });
  } catch (error) {
    console.error('Error creating recruiter user:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'A user with this email already exists'
      });
    }
    res.status(500).json({
      error: 'Failed to create recruiter user',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Cập nhật thông tin (họ tên, phòng ban) của một nhân viên Recruiter cụ thể.
 * @param {string} req.params.recruiterId - ID của nhân viên Recruiter cần cập nhật.
 */
const updateRecruiterUser = async (req, res) => {
  try {
    const {
      recruiterId
    } = req.params;
    const { firstName, lastName, department, companyName, companyAddress } = req.body;
    if (!firstName || !lastName || !department) {
      return res.status(400).json({
        error: 'First name, last name, and department are required'
      });
    }
    const recruiterUser = await User.findOne({
      _id: recruiterId,
      role: 'recruiter'
    });
    if (!recruiterUser) {
      return res.status(404).json({
        error: 'Recruiter user not found'
      });
    }
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      department: department.trim(),
      companyName: companyName ? companyName.trim() : undefined,
      companyAddress: companyAddress ? companyAddress.trim() : undefined,
      updatedAt: new Date(),
      updatedBy: req.user._id
    };
    const updatedUser = await User.findByIdAndUpdate(recruiterId, updateData, {
      new: true,
      runValidators: true
    }).select('-password');
    if (!updatedUser) {
      return res.status(404).json({
        error: 'Recruiter user not found'
      });
    }
    const responseData = {
      id: updatedUser._id,
      name: `${updatedUser.lastName} ${updatedUser.firstName}`.trim(),
      email: updatedUser.email,
      department: updatedUser.department,
      dateJoined: updatedUser.joiningDate ? updatedUser.joiningDate.toISOString().split('T')[0] : new Date(updatedUser.createdAt).toISOString().split('T')[0],
      status: updatedUser.isActive !== false ? 'active' : 'inactive',
      jobTitle: updatedUser.jobTitle || 'Recruiter',
      location: updatedUser.workLocation || updatedUser.location || 'N/A',
      jobsPosted: 0,
      interviewScheduled: 0,
      interviewPassed: 0
    };
    res.json({
      message: 'Recruiter user updated successfully',
      recruiter: responseData
    });
  } catch (error) {
    console.error('Error updating recruiter user:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'A user with this email already exists'
      });
    }
    res.status(500).json({
      error: 'Failed to update recruiter user',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Xóa vĩnh viễn tài khoản của một nhân viên Recruiter khỏi hệ thống.
 * @param {string} req.params.recruiterId - ID của nhân viên Recruiter cần xóa.
 */
const deleteRecruiterUser = async (req, res) => {
  try {
    const {
      recruiterId
    } = req.params;
    const deletedUser = await User.findOneAndDelete({
      _id: recruiterId,
      role: 'recruiter'
    });
    if (!deletedUser) {
      return res.status(404).json({
        error: 'Recruiter user not found'
      });
    }
    res.json({
      message: 'Recruiter user deleted successfully',
      deletedRecruiter: {
        id: deletedUser._id,
        name: `${deletedUser.lastName} ${deletedUser.firstName}`.trim(),
        email: deletedUser.email
      }
    });
  } catch (error) {
    console.error('Error deleting recruiter user:', error);
    res.status(500).json({
      error: 'Failed to delete recruiter user',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Kích hoạt (Active) hoặc Vô hiệu hóa (Deactivate) tài khoản Recruiter.
 * Khi bị vô hiệu hóa, tài khoản Recruiter đó sẽ không thể đăng nhập hoặc thao tác trên hệ thống.
 */
const toggleRecruiterUserStatus = async (req, res) => {
  try {
    const {
      recruiterId
    } = req.params;
    const recruiterUser = await User.findOne({
      _id: recruiterId,
      role: 'recruiter'
    });
    if (!recruiterUser) {
      return res.status(404).json({
        error: 'Recruiter user not found'
      });
    }
    const newStatus = recruiterUser.isActive === false ? true : false;
    const updatedUser = await User.findByIdAndUpdate(recruiterId, {
      isActive: newStatus,
      updatedAt: new Date(),
      updatedBy: req.user._id
    }, {
      new: true
    }).select('-password');
    const jobsPosted = await Job.countDocuments({
      postedBy: recruiterId,
      status: {
        $ne: 'draft'
      }
    });
    const recruiterIds = [updatedUser._id];
    const [schedMap, passMap] = await Promise.all([
      countAppsByRecruiterAndStatus(recruiterIds, 'interview_scheduled'),
      countAppsByRecruiterAndStatus(recruiterIds, 'interview_passed')
    ]);
    const pid = updatedUser._id.toString();
    const responseData = {
      id: updatedUser._id,
      name: `${updatedUser.lastName} ${updatedUser.firstName}`.trim(),
      email: updatedUser.email,
      phone: updatedUser.phone,
      department: updatedUser.department,
      dateJoined: updatedUser.joiningDate ? updatedUser.joiningDate.toISOString().split('T')[0] : new Date(updatedUser.createdAt).toISOString().split('T')[0],
      status: updatedUser.isActive ? 'active' : 'inactive',
      jobTitle: updatedUser.jobTitle || 'Recruiter',
      location: updatedUser.workLocation || updatedUser.location || 'N/A',
      jobsPosted,
      interviewScheduled: schedMap[pid] || 0,
      interviewPassed: passMap[pid] || 0
    };
    res.json({
      message: `Recruiter user ${newStatus ? 'activated' : 'deactivated'} successfully`,
      recruiter: responseData
    });
  } catch (error) {
    console.error('Error toggling recruiter user status:', error);
    res.status(500).json({
      error: 'Failed to toggle recruiter user status',
      details: error.message
    });
  }
};

module.exports = {
  getAllRecruiterUsers,
  createRecruiterUser,
  updateRecruiterUser,
  deleteRecruiterUser,
  toggleRecruiterUserStatus
};
