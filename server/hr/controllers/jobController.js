const Job = require('../../global/models/Job');
const User = require('../../global/models/User');
const Application = require('../../global/models/Application');
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
    let query = {
    };
    if (filter === 'my-jobs') {
      query.postedBy = userId;
    }
    if (status) {
      query.status = status.toLowerCase();
    }
    if (department) {
      query.department = {
        $regex: department,
        $options: 'i'
      };
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
        department: {
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
    const jobs = await Job.find(query).populate('postedBy', 'firstName lastName').sort(sortOptions).skip(skip).limit(limitNum).lean();
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
        department: job.department,
        jobType: job.jobType,
        location: job.location,
        locationType: job.locationType,
        status: job.status.charAt(0).toUpperCase() + job.status.slice(1),
        applicants: applicationsCount,
        recentApplications,
        postedDate: job.createdAt,
        deadline: job.applicationDeadline,
        createdBy: createdByMe ? 'me' : 'other',
        postedByName: `${job.postedBy.firstName} ${job.postedBy.lastName}`,
        salary: salaryDisplay,
        requirements: [...(job.requiredSkills || []), job.qualification, job.experienceLevel].filter(Boolean),
        views: job.views || 0,
        salaryRange: job.salaryRange,
        requiredSkills: job.requiredSkills || [],
        preferredSkills: job.preferredSkills || [],
        qualification: job.qualification,
        experienceLevel: job.experienceLevel,
        maxApplicants: job.maxApplicants,
        resumeRequired: job.resumeRequired,
        lastStatusActorRole: job.lastStatusActorRole || null
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
    const totalInactive = await Job.countDocuments({
      status: 'inactive'
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
        totalInactive,
        myJobs,
        totalApplicants: jobsWithStats.reduce((sum, job) => sum + job.applicants, 0)
      },
      filters: {
        applied: {
          search,
          status,
          department,
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
const createJob = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
    const normalizedInput = normalizeJobPayload(req.body);
    const jobData = {
      ...normalizedInput,
      postedBy: userId,
      status: normalizedInput.status || 'draft'
    };
    const job = new Job(jobData);
    await job.save();
    const populatedJob = await Job.findById(job._id).populate('postedBy', 'firstName lastName').lean();
    try {
      const hrUser = await User.findById(userId).select('firstName lastName');
      if (hrUser) {
        try {
          await createAndEmit({
            toRole: 'admin',
            type: 'job_created',
            title: 'Việc làm mới đã đăng',
            message: `${hrUser.firstName} ${hrUser.lastName} đã đăng việc làm mới: ${normalizedInput.title}`,
            actionUrl: `/admin/jobs/${job._id}`,
            entity: {
              kind: 'Job',
              id: job._id
            },
            priority: 'low',
            metadata: {
              hrName: `${hrUser.firstName} ${hrUser.lastName}`,
              jobTitle: normalizedInput.title,
              department: normalizedInput.department
            },
            createdBy: userId
          });
        } catch (e) {
          console.error('Failed to notify admins (job created):', e);
        }
        try {
          await createAndEmit({
            toUserId: userId,
            toRole: 'hr',
            type: 'job_created',
            title: 'Bạn đã tạo tin tuyển dụng',
            message: `Tin "${normalizedInput.title}" đã được lưu. Quản trị viên cũng nhận được thông báo.`,
            actionUrl: '/hr/jobs',
            entity: {
              kind: 'Job',
              id: job._id
            },
            priority: 'low',
            createdBy: userId
          });
        } catch (e) {
          console.error('Failed to notify HR self (job created):', e);
        }
      }
    } catch (notifError) {
      console.error('Failed to send job creation notification:', notifError);
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
const getJobById = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
    const job = await Job.findById(req.params.id).populate('postedBy', 'firstName lastName').lean();
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
const updateJob = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
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
    if (patch.status != null && patch.status !== existing.status) {
      patch.lastStatusActorRole = String(req.user.role || '').toLowerCase() === 'admin' ? 'admin' : 'hr';
    }
    const job = await Job.findOneAndUpdate({
      _id: req.params.id
    }, {
      ...patch
    }, {
      new: true,
      runValidators: true
    }).populate('postedBy', 'firstName lastName').lean();
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
    if (patch.status != null && String(patch.status) !== String(existing.status)) {
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