const bcrypt = require('bcryptjs');
const User = require('../../global/models/User');
const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
const {
  createAndEmit
} = require('../../global/services/notificationService');
/**
 * Hàm phụ trợ: Đếm số lượng hồ sơ ứng tuyển theo một trạng thái nhất định, 
 * được gom nhóm theo từng nhân viên HR đã đăng tin tuyển dụng.
 * @param {Array<ObjectId>} hrIds - Mảng ID của các nhân sự HR
 * @param {string} applicationStatus - Trạng thái hồ sơ cần đếm (VD: 'interview_scheduled')
 * @returns {Object} Object với key là hrId và value là số lượng đếm được.
 */
async function countAppsByHrAndStatus(hrIds, applicationStatus) {
  if (!hrIds.length) return {};
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
        $in: hrIds
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
 * API Endpoint: Lấy danh sách toàn bộ người dùng có quyền HR (kèm phân trang).
 * - Trả về chi tiết tài khoản HR.
 * - Lấy tổng số lượng tin tuyển dụng mỗi HR đã đăng.
 * - Thống kê số lượng ứng viên đã xếp lịch phỏng vấn và đã đậu phỏng vấn của từng HR.
 */
const getAllHRUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const baseFilter = {
      role: 'hr'
    };
    const totalItems = await User.countDocuments(baseFilter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const skip = (page - 1) * limit;
    const hrUsers = await User.find(baseFilter).select('-password').sort({
      createdAt: -1
    }).skip(skip).limit(limit);
    const hrIds = hrUsers.map(u => u._id);
    let jobsPostedMap = {};
    let scheduledMap = {};
    let passedMap = {};
    if (hrIds.length) {
      const jobsPostedAgg = await Job.aggregate([{
        $match: {
          postedBy: {
            $in: hrIds
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
      [scheduledMap, passedMap] = await Promise.all([countAppsByHrAndStatus(hrIds, 'interview_scheduled'), countAppsByHrAndStatus(hrIds, 'interview_passed')]);
    }
    const formattedHRs = hrUsers.map(hr => {
      const idStr = hr._id.toString();
      return {
        id: hr._id,
        name: `${hr.lastName} ${hr.firstName}`.trim() || 'N/A',
        email: hr.email,
        department: hr.department || 'N/A',
        dateJoined: hr.joiningDate ? hr.joiningDate.toISOString().split('T')[0] : new Date(hr.createdAt).toISOString().split('T')[0],
        status: hr.isActive !== false ? 'active' : 'inactive',
        jobTitle: hr.jobTitle || 'HR',
        location: hr.workLocation || hr.location || 'N/A',
        jobsPosted: jobsPostedMap[idStr] || 0,
        interviewScheduled: scheduledMap[idStr] || 0,
        interviewPassed: passedMap[idStr] || 0
      };
    });
    const companyJobIds = await Job.find({}).distinct('_id');
    const [summaryActiveHR, summaryJobsPosted, summaryInterviewScheduled, summaryInterviewPassed] = await Promise.all([User.countDocuments({
      ...baseFilter,
      isActive: {
        $ne: false
      }
    }), Job.countDocuments({
      status: {
        $ne: 'draft'
      }
    }), Application.countDocuments({
      job: {
        $in: companyJobIds
      },
      status: 'interview_scheduled'
    }), Application.countDocuments({
      job: {
        $in: companyJobIds
      },
      status: 'interview_passed'
    })]);
    res.json({
      success: true,
      data: formattedHRs,
      summary: {
        activeHR: summaryActiveHR,
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
    console.error('Error fetching HR users:', error);
    res.status(500).json({
      error: 'Failed to fetch HR users',
      details: error.message
    });
  }
};
/**
 * API Endpoint: Quản trị viên (Admin) tạo một tài khoản nhân sự HR mới.
 * - Kiểm tra trùng lặp email.
 * - Mã hóa (hash) mật khẩu trước khi lưu.
 * - Tạo hồ sơ User với role='hr' và bắn thông báo (notification) chào mừng trong hệ thống.
 */
const createHRUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      department,
      password
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
    const newHRUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'hr',
      department: department.trim(),
      joiningDate: new Date(),
      isActive: true,
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
      jobTitle: 'HR',
      createdBy: req.user._id
    });
    const savedUser = await newHRUser.save();
    try {
      await createAndEmit({
        toUserId: savedUser._id,
        toRole: 'hr',
        type: 'account_created',
        title: 'Chào mừng đến với findme!',
        message: `Tài khoản HR của bạn đã được Admin tạo. Bạn có thể bắt đầu đăng tin tuyển dụng và quản lý đơn ứng tuyển.`,
        actionUrl: `/hr/dashboard`,
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
      console.error('Failed to send HR account creation notification:', notifError);
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
      message: 'HR user created successfully',
      hr: responseData
    });
  } catch (error) {
    console.error('Error creating HR user:', error);
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
      error: 'Failed to create HR user',
      details: error.message
    });
  }
};
/**
 * API Endpoint: Cập nhật thông tin (họ tên, phòng ban) của một nhân viên HR cụ thể.
 * @param {string} req.params.hrId - ID của nhân viên HR cần cập nhật.
 */
const updateHRUser = async (req, res) => {
  try {
    const {
      hrId
    } = req.params;
    const { firstName, lastName, department } = req.body;
    if (!firstName || !lastName || !department) {
      return res.status(400).json({
        error: 'First name, last name, and department are required'
      });
    }
    const hrUser = await User.findOne({
      _id: hrId,
      role: 'hr'
    });
    if (!hrUser) {
      return res.status(404).json({
        error: 'HR user not found'
      });
    }
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      department: department.trim(),
      updatedAt: new Date(),
      updatedBy: req.user._id
    };
    const updatedUser = await User.findByIdAndUpdate(hrId, updateData, {
      new: true,
      runValidators: true
    }).select('-password');
    if (!updatedUser) {
      return res.status(404).json({
        error: 'HR user not found'
      });
    }
    const responseData = {
      id: updatedUser._id,
      name: `${updatedUser.lastName} ${updatedUser.firstName}`.trim(),
      email: updatedUser.email,
      department: updatedUser.department,
      dateJoined: updatedUser.joiningDate ? updatedUser.joiningDate.toISOString().split('T')[0] : new Date(updatedUser.createdAt).toISOString().split('T')[0],
      status: updatedUser.isActive !== false ? 'active' : 'inactive',
      jobTitle: updatedUser.jobTitle || 'HR',
      location: updatedUser.workLocation || updatedUser.location || 'N/A',
      jobsPosted: 0,
      interviewScheduled: 0,
      interviewPassed: 0
    };
    res.json({
      message: 'HR user updated successfully',
      hr: responseData
    });
  } catch (error) {
    console.error('Error updating HR user:', error);
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
      error: 'Failed to update HR user',
      details: error.message
    });
  }
};
/**
 * API Endpoint: Xóa vĩnh viễn tài khoản của một nhân viên HR khỏi hệ thống.
 * @param {string} req.params.hrId - ID của nhân viên HR cần xóa.
 */
const deleteHRUser = async (req, res) => {
  try {
    const {
      hrId
    } = req.params;
    const deletedUser = await User.findOneAndDelete({
      _id: hrId,
      role: 'hr'
    });
    if (!deletedUser) {
      return res.status(404).json({
        error: 'HR user not found'
      });
    }
    res.json({
      message: 'HR user deleted successfully',
      deletedHR: {
        id: deletedUser._id,
        name: `${deletedUser.lastName} ${deletedUser.firstName}`.trim(),
        email: deletedUser.email
      }
    });
  } catch (error) {
    console.error('Error deleting HR user:', error);
    res.status(500).json({
      error: 'Failed to delete HR user',
      details: error.message
    });
  }
};
/**
 * API Endpoint: Kích hoạt (Active) hoặc Vô hiệu hóa (Deactivate) tài khoản HR.
 * Khi bị vô hiệu hóa, tài khoản HR đó sẽ không thể đăng nhập hoặc thao tác trên hệ thống.
 */
const toggleHRUserStatus = async (req, res) => {
  try {
    const {
      hrId
    } = req.params;
    const hrUser = await User.findOne({
      _id: hrId,
      role: 'hr'
    });
    if (!hrUser) {
      return res.status(404).json({
        error: 'HR user not found'
      });
    }
    const newStatus = hrUser.isActive === false ? true : false;
    const updatedUser = await User.findByIdAndUpdate(hrId, {
      isActive: newStatus,
      updatedAt: new Date(),
      updatedBy: req.user._id
    }, {
      new: true
    }).select('-password');
    const jobsPosted = await Job.countDocuments({
      postedBy: hrId,
      status: {
        $ne: 'draft'
      }
    });
    const posterIds = [updatedUser._id];
    const [schedMap, passMap] = await Promise.all([countAppsByHrAndStatus(posterIds, 'interview_scheduled'), countAppsByHrAndStatus(posterIds, 'interview_passed')]);
    const pid = updatedUser._id.toString();
    const responseData = {
      id: updatedUser._id,
      name: `${updatedUser.lastName} ${updatedUser.firstName}`.trim(),
      email: updatedUser.email,
      phone: updatedUser.phone,
      department: updatedUser.department,
      dateJoined: updatedUser.joiningDate ? updatedUser.joiningDate.toISOString().split('T')[0] : new Date(updatedUser.createdAt).toISOString().split('T')[0],
      status: updatedUser.isActive ? 'active' : 'inactive',
      jobTitle: updatedUser.jobTitle || 'HR',
      location: updatedUser.workLocation || updatedUser.location || 'N/A',
      jobsPosted,
      interviewScheduled: schedMap[pid] || 0,
      interviewPassed: passMap[pid] || 0
    };
    res.json({
      message: `HR user ${newStatus ? 'activated' : 'deactivated'} successfully`,
      hr: responseData
    });
  } catch (error) {
    console.error('Error toggling HR user status:', error);
    res.status(500).json({
      error: 'Failed to toggle HR user status',
      details: error.message
    });
  }
};
module.exports = {
  getAllHRUsers,
  createHRUser,
  updateHRUser,
  deleteHRUser,
  toggleHRUserStatus
};