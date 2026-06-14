const express = require('express');
const {
  query,
  validationResult
} = require('express-validator');
const {
  auth,
  authorize,
  requireCompany
} = require('../../global/middleware/auth');
const dashboardController = require('../controllers/dashboardController');
const router = express.Router();

router.get('/stats', auth, authorize('recruiter', 'admin'), requireCompany, dashboardController.getStats);
router.get('/recent-activities', auth, authorize('recruiter', 'admin'), requireCompany, dashboardController.getRecentActivities);
router.get('/trends', auth, authorize('recruiter', 'admin'), requireCompany, [query('period').optional().isInt({
  min: 1,
  max: 365
}).withMessage('Period must be between 1 and 365 days')], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
}, dashboardController.getApplicationTrends);
router.get('/top-jobs', auth, authorize('recruiter', 'admin'), requireCompany, dashboardController.getTopJobs);
router.get('/recent-jobs', auth, authorize('recruiter', 'admin'), requireCompany, dashboardController.getRecentJobs);
router.get('/recent-applications', auth, authorize('recruiter', 'admin'), requireCompany, dashboardController.getRecentApplications);
router.get('/upcoming-interviews', auth, authorize('recruiter', 'admin'), requireCompany, dashboardController.getUpcomingInterviews);

module.exports = router;
