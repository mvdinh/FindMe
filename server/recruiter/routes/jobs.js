const express = require('express');
const mongoose = require('mongoose');
const {
  query,
  body,
  param,
  validationResult
} = require('express-validator');
const {
  auth,
  authorize,
  requireCompany
} = require('../../global/middleware/auth');
const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
const User = require('../../global/models/User');
const {
  getJobs,
  createJob,
  getJobById,
  updateJob,
  deleteJob
} = require('../controllers/jobController');
const {
  notifyActorAndPeerRoleOnStatusChange
} = require('../../global/utils/jobStatusNotifications');
const router = express.Router();
const ALLOWED_JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance'];

router.get('/', auth, authorize('recruiter', 'admin'), requireCompany, [query('page').optional().isInt({
  min: 1
}).withMessage('Page must be a positive integer'), query('limit').optional().isInt({
  min: 1,
  max: 50
}).withMessage('Limit must be between 1 and 50'), query('search').optional().isLength({
  min: 1,
  max: 200
}).withMessage('Search term must be between 1 and 200 characters'), query('status').optional().isIn(['active', 'closed', 'draft']).withMessage('Invalid status'), query('department').optional().isLength({
  min: 1,
  max: 100
}).withMessage('Department must be between 1 and 100 characters'), query('employmentType').optional().isIn(['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance']).withMessage('Invalid employment type'), query('sortBy').optional().isIn(['createdAt', 'title', 'department', 'applicants']).withMessage('Invalid sort field'), query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')], getJobs);

router.post('/', auth, authorize('recruiter', 'admin'), requireCompany, [body('title').notEmpty().withMessage('Job title is required').isLength({
  min: 3,
  max: 200
}).withMessage('Job title must be between 3 and 200 characters'), body('description').notEmpty().withMessage('Job description is required').isLength({
  min: 10,
  max: 5000
}).withMessage('Job description must be between 10 and 5000 characters'), body('department').notEmpty().withMessage('Department is required').isLength({
  min: 2,
  max: 100
}).withMessage('Department must be between 2 and 100 characters'), body('jobType').custom(value => ALLOWED_JOB_TYPES.includes(value)).withMessage('Invalid job type'), body('locationType').optional().isIn(['Onsite', 'Remote', 'Hybrid']).withMessage('Invalid location type'), body('qualification').notEmpty().withMessage('Required qualification is required'), body('experienceLevel').isIn(['Fresher', 'Junior', 'Middle', 'Senior', 'Tech Lead', 'Manager', 'Director']).withMessage('Experience level is required and must be valid'), body('applicationDeadline').isISO8601().withMessage('Application deadline must be a valid date').custom(value => {
  if (new Date(value) <= new Date()) {
    throw new Error('Application deadline must be in the future');
  }
  return true;
}), body('maxApplicants').optional().isInt({
  min: 1
}).withMessage('Max applicants must be a positive integer'), body('atsEnabled').optional().isBoolean().withMessage('atsEnabled must be boolean'), body('atsResumeThreshold').optional().isFloat({
  min: 0,
  max: 100
}).withMessage('atsResumeThreshold must be between 0 and 100'), body('atsSkipWhenCoverLetter').optional().isBoolean().withMessage('atsSkipWhenCoverLetter must be boolean'), body('atsEngine').optional().isIn(['gemini', 'scan_cv']).withMessage('atsEngine must be gemini or scan_cv'), body('requiredSkills').optional().isArray().withMessage('Required skills must be an array'), body('preferredSkills').optional().isArray().withMessage('Preferred skills must be an array'), body('status').optional().isIn(['draft', 'active']).withMessage('Invalid status'), body('requirements').optional().isLength({ max: 5000 }).withMessage('Requirements must be at most 5000 characters'), body('benefits').optional().isLength({ max: 5000 }).withMessage('Benefits must be at most 5000 characters')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  createJob(req, res);
});

const {
  submitHrRequest
} = require('../../global/controllers/jobStatusChangeRequestController');
router.post('/:id/status-request', auth, authorize('recruiter'), requireCompany, [param('id').isMongoId().withMessage('Invalid job ID'), body('requestedStatus').isIn(['active', 'closed', 'draft']).withMessage('Invalid requested status'), body('message').trim().isLength({
  min: 10,
  max: 2000
}).withMessage('Nội dung đề xuất cần từ 10 đến 2000 ký tự')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  submitHrRequest(req, res);
});

router.get('/:id', auth, authorize('recruiter', 'admin'), requireCompany, [param('id').isMongoId().withMessage('Invalid job ID')], getJobById);
router.put('/:id', auth, authorize('recruiter', 'admin'), requireCompany, [param('id').isMongoId().withMessage('Invalid job ID'), body('title').optional().isLength({
  min: 3,
  max: 200
}).withMessage('Job title must be between 3 and 200 characters'), body('description').optional().isLength({
  min: 50,
  max: 5000
}).withMessage('Job description must be between 50 and 5000 characters'), body('department').optional().isLength({
  min: 2,
  max: 100
}).withMessage('Department must be between 2 and 100 characters'), body('jobType').optional().custom(value => ALLOWED_JOB_TYPES.includes(value)).withMessage('Invalid job type'), body('location').optional().isLength({
  min: 2,
  max: 200
}).withMessage('Location must be between 2 and 200 characters'), body('experienceLevel').optional().isIn(['Fresher', 'Junior', 'Middle', 'Senior', 'Tech Lead', 'Manager', 'Director']).withMessage('Invalid experience level'), body('status').optional().isIn(['active', 'closed', 'draft']).withMessage('Invalid status'), body('applicationDeadline').optional().isISO8601().withMessage('Application deadline must be a valid date'), body('atsEnabled').optional().isBoolean().withMessage('atsEnabled must be boolean'), body('atsResumeThreshold').optional().isFloat({
  min: 0,
  max: 100
}).withMessage('atsResumeThreshold must be between 0 and 100'), body('atsSkipWhenCoverLetter').optional().isBoolean().withMessage('atsSkipWhenCoverLetter must be boolean'), body('atsEngine').optional().isIn(['gemini', 'scan_cv']).withMessage('atsEngine must be gemini or scan_cv'), body('requirements').optional().isLength({ max: 5000 }).withMessage('Requirements must be at most 5000 characters'), body('benefits').optional().isLength({ max: 5000 }).withMessage('Benefits must be at most 5000 characters')], updateJob);
router.delete('/:id', auth, authorize('recruiter', 'admin'), requireCompany, [param('id').isMongoId().withMessage('Invalid job ID')], deleteJob);

router.patch('/:id/status', auth, authorize('recruiter', 'admin'), requireCompany, [param('id').isMongoId().withMessage('Invalid job ID'), body('status').isIn(['active', 'closed']).withMessage('Status must be active or closed')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      status
    } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    const previousStatus = job.status;
    job.status = status;
    if (status !== previousStatus) {
      job.lastStatusActorRole = String(req.user.role || '').toLowerCase() === 'admin' ? 'admin' : 'recruiter';
    }
    job.updatedAt = new Date();
    if (status === 'active' && previousStatus === 'draft' && !job.publishedAt) {
      job.publishedAt = new Date();
    }
    if (status === 'closed') {
      job.closedAt = new Date();
    }
    await job.save();
    const actorRole = String(req.user.role || '').toLowerCase();
    await notifyActorAndPeerRoleOnStatusChange({
      actorUserId: req.user.id,
      actorRole,
      jobId: job._id,
      jobTitle: job.title,
      previousStatus,
      newStatus: status
    });
    res.json({
      success: true,
      message: `Job ${status} successfully`,
      data: {
        id: job._id,
        status: job.status,
        lastStatusActorRole: job.lastStatusActorRole
      }
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/:id/applications', auth, authorize('recruiter', 'admin'), requireCompany, [param('id').isMongoId().withMessage('Invalid job ID'), query('page').optional().isInt({
  min: 1
}).withMessage('Page must be a positive integer'), query('limit').optional().isInt({
  min: 1,
  max: 50
}).withMessage('Limit must be between 1 and 50'), query('status').optional().isIn(['submitted', 'under_review', 'rejected', 'interview_passed', 'offer_extended', 'offer_accepted', 'offer_declined', 'interview_scheduled', 'interview_confirmed']).withMessage('Invalid status')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      page: pageRaw = 1,
      limit: limitRaw = 20,
      status
    } = req.query;
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 20));
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    let filter = {
      job: req.params.id
    };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const jobOnly = {
      job: req.params.id
    };
    const applications = await Application.find(filter).sort({
      createdAt: -1
    }).skip(skip).limit(limit).populate('applicant', 'firstName lastName email profilePicture').populate('job', 'title department').lean();
    const totalApplications = await Application.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalApplications / limit));
    const [statsTotal, statsInterview, statsReview, statsRejected] = await Promise.all([
      Application.countDocuments(jobOnly),
      Application.countDocuments({
        ...jobOnly,
        status: 'interview_scheduled'
      }),
      Application.countDocuments({
        ...jobOnly,
        status: {
          $in: ['under_review', 'shortlisted']
        }
      }),
      Application.countDocuments({
        ...jobOnly,
        status: 'rejected'
      })
    ]);
    res.json({
      success: true,
      data: {
        applications,
        stats: {
          totalApplications: statsTotal,
          interviewScheduled: statsInterview,
          underReview: statsReview,
          rejected: statsRejected
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalApplications,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
