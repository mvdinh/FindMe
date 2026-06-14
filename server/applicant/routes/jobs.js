const express = require('express');
const {
  body,
  query,
  validationResult
} = require('express-validator');
const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const router = express.Router();
router.get('/', [query('search').optional().trim(), query('workType').optional().isIn(['Remote', 'Hybrid', 'Onsite']), query('jobType').optional().isIn(['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance']), query('experienceLevel').optional().isIn(['Fresher', 'Junior', 'Middle', 'Senior', 'Tech Lead', 'Manager', 'Director']), query('location').optional().trim(), query('minSalary').optional().isNumeric(), query('maxSalary').optional().isNumeric(), query('page').optional().isInt({
  min: 1
}), query('limit').optional().isInt({
  min: 1,
  max: 50
}), query('sortBy').optional().isIn(['createdAt', 'salaryRange.min', 'salaryRange.max', 'title']), query('sortOrder').optional().isIn(['asc', 'desc'])], async (req, res) => {
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
      search,
      workType,
      jobType,
      experienceLevel,
      location,
      minSalary,
      maxSalary,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    let query = {
      status: 'active'
    };
    if (search) {
      query.$text = {
        $search: search
      };
    }
    if (workType) query.locationType = workType;
    if (jobType) query.jobType = jobType;
    if (experienceLevel) query.experienceLevel = experienceLevel;
    if (location) query.location = new RegExp(location, 'i');
    if (minSalary || maxSalary) {
      query.$and = [];
      if (minSalary) {
        query.$and.push({
          $or: [{
            'salaryRange.min': {
              $gte: parseInt(minSalary)
            }
          }, {
            'salaryRange.max': {
              $gte: parseInt(minSalary)
            }
          }]
        });
      }
      if (maxSalary) {
        query.$and.push({
          $or: [{
            'salaryRange.min': {
              $lte: parseInt(maxSalary)
            }
          }, {
            'salaryRange.max': {
              $lte: parseInt(maxSalary)
            }
          }]
        });
      }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortOptions = {};
    if (sortBy === 'createdAt') {
      sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy.includes('salaryRange')) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }
    const jobs = await Job.find(query).populate('postedBy', 'firstName lastName email').populate('company').sort(sortOptions).skip(skip).limit(parseInt(limit)).lean();
    const transformedJobs = jobs.map(job => {
      const daysSincePosted = Math.ceil((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));
      let postedDate;
      if (daysSincePosted === 1) {
        postedDate = '1 day ago';
      } else if (daysSincePosted < 30) {
        postedDate = `${daysSincePosted} days ago`;
      } else {
        postedDate = '30+ days ago';
      }
      return {
        id: job._id,
        title: job.title,
        company: job.company?.name || 'FindMe',
        companyDetails: job.company || null,
        postedDate,
        location: job.location || 'Not specified',
        country: 'Not specified',
        workType: job.locationType === 'onsite' ? 'On-site' : job.locationType === 'remote' ? 'Remote' : 'Hybrid',
        jobType: job.jobType,
        experience: job.experienceLevel,
        salary: (() => {
          if (!job.salaryRange || (!job.salaryRange.min && !job.salaryRange.max)) return 'Not disclosed';
          const currency = job.salaryRange.currency || 'VND';
          const min = job.salaryRange.min;
          const max = job.salaryRange.max;
          const formatVal = val => {
            if (!val && val !== 0) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num.toLocaleString('vi-VN');
          };
          const minF = formatVal(min);
          const maxF = formatVal(max);
          const suffix = currency === 'VND' ? ' VNĐ' : ` ${currency}`;
          if (minF && maxF) return `${minF} - ${maxF}${suffix}`;
          if (minF) return `${minF}${suffix}+`;
          if (maxF) return `Max ${maxF}${suffix}`;
          return 'Not disclosed';
        })(),
        description: job.description,
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        department: job.department,
        requiredSkills: job.requiredSkills || [],
        preferredSkills: job.preferredSkills || [],
        qualification: job.qualification || [],
        applicationDeadline: job.applicationDeadline,
        companyLogo: job.company?.logo || null
      };
    });
    const totalJobs = await Job.countDocuments(query);
    const limitNum = parseInt(limit, 10) || 10;
    const pageNum = parseInt(page, 10) || 1;
    const totalPages = Math.max(1, Math.ceil(totalJobs / limitNum));
    res.json({
      success: true,
      data: {
        jobs: transformedJobs,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalJobs,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'firstName lastName email').populate('company').lean();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    if (job.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    await Job.findByIdAndUpdate(req.params.id, {
      $inc: {
        views: 1
      }
    });
    const daysSincePosted = Math.ceil((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));
    let postedDate;
    if (daysSincePosted === 1) {
      postedDate = '1 day ago';
    } else if (daysSincePosted < 30) {
      postedDate = `${daysSincePosted} days ago`;
    } else {
      postedDate = '30+ days ago';
    }
    const transformedJob = {
      id: job._id,
      title: job.title,
      description: job.description,
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      company: job.company?.name || 'FindMe',
      companyDetails: job.company || null,
      companyLogo: job.company?.logo || null,
      postedDate,
      location: job.location || 'Not specified',
      country: 'Not specified',
      workType: job.locationType === 'onsite' ? 'On-site' : job.locationType === 'remote' ? 'Remote' : 'Hybrid',
      jobType: job.jobType,
      experience: job.experienceLevel,
      salary: (() => {
        if (!job.salaryRange || (!job.salaryRange.min && !job.salaryRange.max)) return 'Not disclosed';
        const currency = job.salaryRange.currency || 'VND';
        const min = job.salaryRange.min;
        const max = job.salaryRange.max;
        const formatVal = val => {
          if (!val && val !== 0) return null;
          const num = parseFloat(val);
          return isNaN(num) ? null : num.toLocaleString('vi-VN');
        };
        const minF = formatVal(min);
        const maxF = formatVal(max);
        const suffix = currency === 'VND' ? ' VNĐ' : ` ${currency}`;
        if (minF && maxF) return `${minF} - ${maxF}${suffix}`;
        if (minF) return `${minF}${suffix}+`;
        if (maxF) return `Max ${maxF}${suffix}`;
        return 'Not disclosed';
      })(),
      department: job.department,
      requiredSkills: job.requiredSkills || [],
      preferredSkills: job.preferredSkills || [],
      qualification: job.qualification || [],
      applicationDeadline: job.applicationDeadline,
      maxApplicants: job.maxApplicants,
      applicationsCount: job.applicationsCount,
      views: job.views,
      postedBy: job.postedBy
    };
    let hasApplied = false;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const application = await Application.findOne({
          job: req.params.id,
          applicant: decoded.id
        });
        hasApplied = !!application;
      } catch (error) {}
    }
    res.json({
      success: true,
      data: {
        job: {
          ...transformedJob,
          hasApplied
        }
      }
    });
  } catch (error) {
    console.error('Get job error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.post('/', auth, authorize('hr', 'admin'), [body('title').trim().notEmpty().withMessage('Job title is required'), body('description').trim().notEmpty().withMessage('Job description is required'), body('company').trim().notEmpty().withMessage('Company name is required'), body('location').trim().notEmpty().withMessage('Location is required'), body('country').trim().notEmpty().withMessage('Country is required'), body('workType').isIn(['Remote', 'Hybrid', 'Onsite']).withMessage('Invalid work type'), body('jobType').isIn(['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance']).withMessage('Invalid job type'), body('experienceLevel').isIn(['Fresher', 'Junior', 'Middle', 'Senior', 'Tech Lead', 'Manager', 'Director']).withMessage('Invalid experience level'), body('salary.min').isNumeric().withMessage('Minimum salary must be a number'), body('salary.max').isNumeric().withMessage('Maximum salary must be a number'), body('requirements').isArray().withMessage('Requirements must be an array'), body('skills').isArray().withMessage('Skills must be an array')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const jobData = {
      ...req.body,
      postedBy: req.user.id
    };
    const job = new Job(jobData);
    await job.save();
    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/stats/overview', async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments({
      status: 'active'
    });
    const jobsByType = await Job.aggregate([{
      $match: {
        status: 'active'
      }
    }, {
      $group: {
        _id: '$jobType',
        count: {
          $sum: 1
        }
      }
    }]);
    const jobsByWorkType = await Job.aggregate([{
      $match: {
        status: 'active'
      }
    }, {
      $group: {
        _id: '$locationType',
        count: {
          $sum: 1
        }
      }
    }]);
    res.json({
      success: true,
      data: {
        totalJobs,
        jobsByType,
        jobsByWorkType
      }
    });
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;