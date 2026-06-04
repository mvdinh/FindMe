const express = require('express');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const profileController = require('../controllers/profileController');
const router = express.Router();
router.get('/', auth, authorize('hr'), profileController.getProfile);
router.put('/', auth, authorize('hr'), profileController.updateProfile);
router.put('/avatar', auth, authorize('hr'), profileController.updateAvatar);
router.put('/change-password', auth, authorize('hr'), profileController.changePassword);
module.exports = router;