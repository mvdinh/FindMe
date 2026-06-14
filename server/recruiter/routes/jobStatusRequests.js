const express = require('express');
const {
  auth,
  authorize,
  requireCompany
} = require('../../global/middleware/auth');
const {
  listPendingForRecruiter
} = require('../../global/controllers/jobStatusChangeRequestController');
const router = express.Router();

router.get('/pending', auth, authorize('recruiter'), requireCompany, listPendingForRecruiter);

module.exports = router;
