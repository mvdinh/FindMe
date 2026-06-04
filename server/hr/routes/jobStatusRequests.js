const express = require('express');
const {
  auth,
  authorize,
  requireCompany
} = require('../../global/middleware/auth');
const {
  listPendingForHr
} = require('../../global/controllers/jobStatusChangeRequestController');
const router = express.Router();
router.get('/pending', auth, authorize('hr'), requireCompany, listPendingForHr);
module.exports = router;
