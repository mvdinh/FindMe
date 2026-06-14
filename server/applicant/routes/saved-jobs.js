const express = require('express');
const router = express.Router();
const {
  auth
} = require('../../global/middleware/auth');
const Job = require('../../global/models/Job');
const User = require('../../global/models/User');
router.use(auth);
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'applicant') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Applicant role required.'
      });
    }
    const user = await User.findById(req.user._id).populate({
      path: 'savedJobs'
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const savedJobsData = user.savedJobs.map(job => ({
      id: job._id,
      title: job.title,
      company: 'FindMe',
      location: job.location,
      workType: job.workType,
      jobType: job.jobType,
      experience: job.experience,
      salary: job.salary,
      postedDate: job.createdAt,
      savedAt: user.savedJobsMetadata?.find(meta => meta.jobId?.toString() === job._id.toString())?.savedAt || job.createdAt,
      status: job.status,
      applicationDeadline: job.applicationDeadline
    }));
    savedJobsData.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    res.json({
      success: true,
      message: 'Saved jobs retrieved successfully',
      data: savedJobsData
    });
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
router.post('/:jobId', async (req, res) => {
  try {
    if (req.user.role !== 'applicant') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Applicant role required.'
      });
    }
    const {
      jobId
    } = req.params;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot save closed or drafted job'
      });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (user.savedJobs.includes(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Job is already saved'
      });
    }
    user.savedJobs.push(jobId);
    if (!user.savedJobsMetadata) {
      user.savedJobsMetadata = [];
    }
    user.savedJobsMetadata.push({
      jobId: jobId,
      savedAt: new Date()
    });
    await user.save();
    res.json({
      success: true,
      message: 'Job saved successfully'
    });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save job',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
router.delete('/:jobId', async (req, res) => {
  try {
    if (req.user.role !== 'applicant') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Applicant role required.'
      });
    }
    const {
      jobId
    } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (!user.savedJobs.includes(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Job is not in saved jobs'
      });
    }
    user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
    if (user.savedJobsMetadata) {
      user.savedJobsMetadata = user.savedJobsMetadata.filter(meta => meta.jobId?.toString() !== jobId);
    }
    await user.save();
    res.json({
      success: true,
      message: 'Job removed from saved jobs successfully'
    });
  } catch (error) {
    console.error('Error removing saved job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove saved job',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
module.exports = router;