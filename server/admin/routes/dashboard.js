const express = require('express');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const {
  getOverview
} = require('../controllers/dashboardController');
const router = express.Router();
router.get('/overview', auth, authorize('admin'), getOverview);
module.exports = router;