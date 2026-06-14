const express = require('express');
const {
  body,
  validationResult
} = require('express-validator');
const Application = require('../../global/models/Application');
const Job = require('../../global/models/Job');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const {
  uploadResumeMemory
} = require('../../global/middleware/upload');
const {
  enrichApplicationForApplicantList
} = require('../../global/utils/applicationCode');

const router = express.Router();

// CV được lưu vào hàng chờ
router.post('/', auth, authorize('applicant'), uploadResumeMemory.single('resume'), [body('jobId').isMongoId().withMessage('Valid job ID is required'), body('firstName').trim().notEmpty().withMessage('First name is required'), body('lastName').trim().notEmpty().withMessage('Last name is required'), body('email').isEmail().normalizeEmail().withMessage('Valid email is required'), body('phone').trim().notEmpty().withMessage('Phone number is required'), body('coverLetter').optional().trim().isLength({
  max: 2000
}).withMessage('Cover letter too long')], async (req, res) => {
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
      jobId,
      firstName,
      lastName,
      email,
      phone,
      coverLetter
    } = req.body;
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Job not found or not available for applications'
      });
    }
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user.id
    });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required'
      });
    }
    const applicationData = {
      job: jobId,
      applicant: req.user.id,
      personalInfo: {
        firstName,
        lastName,
        email,
        phone
      },
      customResume: {
        fileName: req.file.originalname,
        fileData: req.file.buffer,
        fileMimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadDate: new Date()
      },
      useProfileResume: false,
      coverLetter,
      timeline: [{
        status: 'submitted',
        date: new Date(),
        note: 'Application submitted'
      }]
    };
    const application = new Application(applicationData);
    await application.save();
    await Job.findByIdAndUpdate(jobId, {
      $inc: {
        applicationsCount: 1
      }
    });
    await application.populate([{
      path: 'job',
      select: 'title location workType jobType'
    }, {
      path: 'applicant',
      select: 'firstName lastName email'
    }]);

    // respond immediately; cron worker will run ATS/AI and updates aiProcessing + aiAnalysis
    await Application.findByIdAndUpdate(application._id, {
      $set: {
        'aiProcessing.status': 'queued',
        'aiProcessing.startedAt': new Date(),
        'aiProcessing.finishedAt': null,
        'aiProcessing.error': null
      }
    });
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });

    // Note: no inline background processing here; handled by cron worker.
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/my-applications', auth, authorize('applicant'), async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10
    } = req.query;
    let query = {
      applicant: req.user.id
    };
    if (status) {
      query.status = status;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const applications = await Application.find(query).populate('job', 'title location workType jobType salary status').sort({
      createdAt: -1
    }).skip(skip).limit(parseInt(limit)).lean();
    const totalApplications = await Application.countDocuments(query);
    const totalPages = Math.ceil(totalApplications / parseInt(limit));
    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalApplications,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('job', 'title location workType jobType salary requirements skills').populate('applicant', 'firstName lastName email phone profile').populate('timeline.updatedBy', 'firstName lastName').populate('notes.author', 'firstName lastName').lean();
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    if (req.user.role === 'applicant' && application.applicant._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/:id/withdraw', auth, authorize('applicant'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    if (application.applicant.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    if (['offer_accepted', 'withdrawn'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Application cannot be withdrawn at this stage'
      });
    }
    application.status = 'withdrawn';
    application.timeline.push({
      status: 'withdrawn',
      date: new Date(),
      note: 'Application withdrawn by candidate'
    });
    await application.save();
    await Job.findByIdAndUpdate(application.job, {
      $inc: {
        applicationsCount: -1
      }
    });
    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      data: application
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/stats/dashboard', auth, authorize('applicant'), async (req, res) => {
  try {
    const applicantId = req.user.id;
    const totalApplications = await Application.countDocuments({
      applicant: applicantId
    });
    const statusStats = await Application.aggregate([{
      $match: {
        applicant: applicantId
      }
    }, {
      $group: {
        _id: '$status',
        count: {
          $sum: 1
        }
      }
    }]);
    const recentApplicationsRaw = await Application.find({
      applicant: applicantId
    }).populate({
      path: 'job',
      select: 'title location jobType salaryRange jobCode code referenceCode'
    }).sort({
      createdAt: -1
    }).limit(5).lean();
    const recentApplications = recentApplicationsRaw.map(enrichApplicationForApplicantList);
    const stats = {
      totalApplications,
      submitted: 0,
      under_review: 0,
      interview_scheduled: 0,
      interview_confirmed: 0,
      interview_passed: 0,
      offer_extended: 0,
      rejected: 0
    };
    statusStats.forEach(stat => {
      stats[stat._id] = stat.count;
    });
    res.json({
      success: true,
      data: {
        stats,
        recentApplications
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;
