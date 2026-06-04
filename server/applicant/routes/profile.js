const express = require('express');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const {
  getProfile,
  updateProfile,
  validateProfileUpdate,
  updateAvatar,
  deleteAvatar,
  changePassword,
  downloadCurrentResume,
  deleteCurrentResume
} = require('../controllers/profileController');
const router = express.Router();
router.get('/', auth, authorize('applicant'), getProfile);
router.put('/', auth, authorize('applicant'), ...validateProfileUpdate, updateProfile);
router.put('/avatar', auth, authorize('applicant'), updateAvatar);
router.delete('/avatar', auth, authorize('applicant'), deleteAvatar);
router.put('/change-password', auth, authorize('applicant'), changePassword);
router.get('/resume/download', auth, authorize('applicant'), downloadCurrentResume);
router.delete('/resume', auth, authorize('applicant'), deleteCurrentResume);
module.exports = router;
