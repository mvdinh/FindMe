const Job = require('../../global/models/Job');
const User = require('../../global/models/User');
const Application = require('../../global/models/Application');
const Company = require('../../global/models/Company');
const mongoose = require('mongoose');
const {
  createAndEmit
} = require('../../global/services/notificationService');
const {
  notifyActorAndPeerRoleOnStatusChange
} = require('../../global/utils/jobStatusNotifications');
const {
  normalizeJobPayload,
  getSalaryPeriodLabel
} = require('../../global/utils/jobLocalization');
const JobStatusChangeRequest = require('../../global/models/JobStatusChangeRequest');

/**
 * API Endpoint: Lấy danh sách tin tuyển dụng dành cho phân hệ Recruiter.
 * - Hỗ trợ lọc theo phòng ban, loại công việc, trạng thái, người đăng.
 * - Xử lý tính toán chuỗi lương (salary string) và cấu trúc lại thông tin yêu cầu.
 * - Thống kê nhanh tổng số ứng viên và ứng viên mới nộp trong 7 ngày qua.
 */
const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      department = '',
      jobType = '',
      filter = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
    let query = {};
    if (filter === 'my-jobs') {
      query.postedBy = userId;
    }
    if (status) {
      query.status = status.toLowerCase();
    }

    if (jobType) {
      query.jobType = jobType;
    }
    if (search) {
      query.$or = [{
        title: {
          $regex: search,
          $options: 'i'
        }
      }, {
        description: {
          $regex: search,
          $options: 'i'
        }
      }];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const jobs = await Job.find(query).populate('postedBy', 'firstName lastName').populate('company').sort(sortOptions).skip(skip).limit(limitNum).lean();
    const totalJobs = await Job.countDocuments(query);
    const jobsWithStats = await Promise.all(jobs.map(async job => {
      const applicationsCount = await Application.countDocuments({
        job: job._id
      });
      const recentApplications = await Application.countDocuments({
        job: job._id,
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      });
      const createdByMe = job.postedBy._id.toString() === userId.toString();
      let salaryDisplay = 'Chưa có';
      if (job.salaryRange && (job.salaryRange.min || job.salaryRange.max)) {
        const currency = job.salaryRange.currency || 'VND';
        const period = job.salaryRange.period || 'year';
        const formatSalaryValue = value => {
          if (!value && value !== 0) return null;
          const numValue = parseFloat(value);
          if (Number.isNaN(numValue)) return null;
          return numValue.toLocaleString('vi-VN');
        };
        const minFormatted = formatSalaryValue(job.salaryRange.min);
        const maxFormatted = formatSalaryValue(job.salaryRange.max);
        const periodLabel = getSalaryPeriodLabel(period);
        const currencySuffix = currency === 'VND' ? ' VNĐ' : ` ${currency}`;
        if (minFormatted && maxFormatted) {
          salaryDisplay = `${minFormatted} - ${maxFormatted}${currencySuffix}/${periodLabel}`;
        } else if (minFormatted) {
          salaryDisplay = `${minFormatted}${currencySuffix}+/${periodLabel}`;
        } else if (maxFormatted) {
          salaryDisplay = `Tối đa ${maxFormatted}${currencySuffix}/${periodLabel}`;
        }
      }
      return {
        id: job._id,
        title: job.title,
        description: job.description,
        jobType: job.jobType,
        location: job.location,
        locationType: job.locationType,
        status: job.status.charAt(0).toUpperCase() + job.status.slice(1),
        applicants: applicationsCount,
        recentApplications,
        postedDate: job.createdAt,
        deadline: job.applicationDeadline,
        createdBy: createdByMe ? 'me' : 'other',
        postedByName: `${job.postedBy.lastName} ${job.postedBy.firstName}`,
        salary: salaryDisplay,
        requirements: job.requirements,
        benefits: job.benefits,
        views: job.views || 0,
        salaryRange: job.salaryRange,
        qualification: job.qualification,
        experienceLevel: job.experienceLevel,
        maxApplicants: job.maxApplicants,
        resumeRequired: job.resumeRequired,
        lastStatusActorRole: job.lastStatusActorRole || null,
        company: job.company
      };
    }));
    const totalActive = await Job.countDocuments({
      status: 'active'
    });
    const totalDraft = await Job.countDocuments({
      status: 'draft'
    });
    const totalClosed = await Job.countDocuments({
      status: 'closed'
    });

    const myJobs = await Job.countDocuments({
      postedBy: userId
    });
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json({
      success: true,
      data: jobsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalJobs / limitNum),
        totalJobs,
        hasNextPage: skip + limitNum < totalJobs,
        hasPrevPage: page > 1,
        limit: limitNum
      },
      summary: {
        totalJobs,
        totalActive,
        totalDraft,
        totalClosed,
        myJobs,
        totalApplicants: jobsWithStats.reduce((sum, job) => sum + job.applicants, 0)
      },
      filters: {
        applied: {
          search,
          status,

          jobType,
          filter
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching jobs'
    });
  }
};

/**
 * API Endpoint: Tạo tin tuyển dụng mới.
 * - Chuẩn hóa (normalize) dữ liệu form đầu vào trước khi lưu để tránh lỗi định dạng.
 * - Đánh dấu người đăng (postedBy) là Recruiter hiện tại.
 * - Phát thông báo (notification) cho Admin và cho chính Recruiter vừa đăng tin.
 */
const createJob = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
    const company = await Company.findOne({ createdBy: userId });
    
    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa thiết lập thông tin doanh nghiệp. Vui lòng thiết lập trước khi đăng tin.'
      });
    }
    if (company.verificationStatus === 'locked') {
      return res.status(403).json({
        success: false,
        message: `Tài khoản doanh nghiệp đang bị khóa. Lý do: ${company.lockReason || 'Vi phạm quy định'}. Vui lòng gửi yêu cầu mở khóa.`
      });
    }
    if (company.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Doanh nghiệp chưa được xác thực. Vui lòng chờ Admin phê duyệt giấy phép kinh doanh.'
      });
    }

    const normalizedInput = normalizeJobPayload(req.body);
    let finalStatus = normalizedInput.status || 'draft';
    let needsRequest = false;

    if (finalStatus === 'active') {
      finalStatus = 'pending_approval';
      needsRequest = true;
    }

    const jobData = {
      ...normalizedInput,
      postedBy: userId,
      company: company._id,
      status: finalStatus
    };
    const job = new Job(jobData);
    await job.save();

    if (needsRequest) {
      await JobStatusChangeRequest.create({
        job: job._id,
        requestedBy: userId,
        requestedStatus: 'active',
        message: 'Yêu cầu đăng tin mới (tự động)',
        reviewStatus: 'pending'
      });
    }

    const populatedJob = await Job.findById(job._id).populate('postedBy', 'firstName lastName').populate('company').lean();
    if (finalStatus !== 'draft') {
      try {
        const recruiterUser = await User.findById(userId).select('firstName lastName');
        if (recruiterUser) {
          try {
            await createAndEmit({
              toRole: 'admin',
              type: 'job_created',
              title: 'Việc làm mới đã đăng',
              message: `${recruiterUser.lastName} ${recruiterUser.firstName} đã đăng việc làm mới: ${normalizedInput.title}`,
              actionUrl: `/admin/jobs/${job._id}`,
              entity: {
                kind: 'Job',
                id: job._id
              },
              priority: 'low',
              metadata: {
                recruiterName: `${recruiterUser.lastName} ${recruiterUser.firstName}`,
                jobTitle: normalizedInput.title,
                department: normalizedInput.department
              },
              createdBy: userId
            });
          } catch (e) {
            console.error('Failed to notify admins (job created):', e);
          }
        }
      } catch (notifError) {
        console.error('Failed to send job creation notification:', notifError);
      }
    }
    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: populatedJob
    });
  } catch (error) {
    console.error('Create job error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error occurred while creating job'
    });
  }
};

/**
 * API Endpoint: Lấy chi tiết thông tin của 1 tin tuyển dụng.
 * Kèm theo thông số ứng viên tổng cộng và ứng viên ứng tuyển trong tuần qua.
 */
const getJobById = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
    const job = await Job.findById(req.params.id).populate('postedBy', 'firstName lastName').populate('company').lean();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    const applicationsCount = await Application.countDocuments({
      job: job._id
    });
    const recentApplications = await Application.countDocuments({
      job: job._id,
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    });
    const jobWithStats = {
      ...job,
      id: job._id,
      applicants: applicationsCount,
      recentApplications
    };
    res.json({
      success: true,
      data: jobWithStats
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching job'
    });
  }
};

/**
 * API Endpoint: Cập nhật thông tin chi tiết một tin tuyển dụng.
 * - Ghi nhận lại chức danh của người cập nhật trạng thái gần nhất (lastStatusActorRole).
 * - Bắn thông báo nếu có sự thay đổi về trạng thái (status).
 */
const updateJob = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;

    const company = await Company.findOne({ createdBy: userId });
    
    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa thiết lập thông tin doanh nghiệp.'
      });
    }
    if (company.verificationStatus === 'locked') {
      return res.status(403).json({
        success: false,
        message: `Tài khoản doanh nghiệp đang bị khóa. Lý do: ${company.lockReason || 'Vi phạm quy định'}. Vui lòng gửi yêu cầu mở khóa.`
      });
    }
    if (company.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Doanh nghiệp chưa được xác thực. Vui lòng chờ Admin phê duyệt giấy phép kinh doanh.'
      });
    }

    const normalizedInput = normalizeJobPayload(req.body);
    const existing = await Job.findById(req.params.id).select('status title');
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    const patch = {
      ...normalizedInput
    };
    
    let needsRequest = false;
    if (patch.status === 'active' && existing.status !== 'active') {
      patch.status = 'pending_approval'; // Enforce admin approval by setting to pending_approval
      needsRequest = true;
    } else if (patch.status != null && patch.status !== existing.status) {
      patch.lastStatusActorRole = String(req.user.role || '').toLowerCase() === 'admin' ? 'admin' : 'recruiter';
    }
    const job = await Job.findOneAndUpdate({
      _id: req.params.id
    }, {
      ...patch
    }, {
      new: true,
      runValidators: true
    }).populate('postedBy', 'firstName lastName').populate('company').lean();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    const jobWithId = {
      ...job,
      id: job._id
    };

    if (needsRequest) {
      const existingReq = await JobStatusChangeRequest.findOne({ job: job._id, reviewStatus: 'pending' });
      if (!existingReq) {
        await JobStatusChangeRequest.create({
          job: job._id,
          requestedBy: userId,
          requestedStatus: 'active',
          message: 'Yêu cầu cập nhật tin lên trạng thái Đăng tuyển (tự động)',
          reviewStatus: 'pending'
        });
      }
    }

    if (!needsRequest && patch.status != null && String(patch.status) !== String(existing.status)) {
      await notifyActorAndPeerRoleOnStatusChange({
        actorUserId: userId,
        actorRole: String(req.user.role || '').toLowerCase(),
        jobId: job._id,
        jobTitle: job.title || existing.title,
        previousStatus: existing.status,
        newStatus: job.status
      });
    }
    res.json({
      success: true,
      message: 'Job updated successfully',
      data: jobWithId
    });
  } catch (error) {
    console.error('Update job error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error occurred while updating job'
    });
  }
};

/**
 * API Endpoint: Xóa tin tuyển dụng.
 * - Chặn không cho xóa nếu tin đó đã có hồ sơ ứng tuyển nộp vào. (Chỉ cho phép đổi sang trạng thái closed/inactive).
 */
const deleteJob = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    const applicationCount = await Application.countDocuments({
      job: req.params.id
    });
    if (applicationCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete job with existing applications. Consider closing it instead.'
      });
    }
    await Job.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error occurred while deleting job'
    });
  }
};

module.exports = {
  getJobs,
  createJob,
  getJobById,
  updateJob,
  deleteJob
};
