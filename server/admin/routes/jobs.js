const express = require('express');
const mongoose = require('mongoose');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const {
  getAllJobs,
  updateJobStatus,
  getJobDetail,
  bulkUpdateStatus
} = require('../controllers/jobsController');
const router = express.Router();
router.get('/', auth, authorize('admin'), getAllJobs);
router.put('/bulk/status', auth, authorize('admin'), bulkUpdateStatus);
router.param('jobId', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      error: 'Invalid jobId format'
    });
  }
  next();
});
router.put('/:jobId/status', auth, authorize('admin'), updateJobStatus);
router.get('/:jobId', auth, authorize('admin'), getJobDetail);
module.exports = router;