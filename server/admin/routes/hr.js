const express = require('express');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const {
  getAllHRUsers,
  createHRUser,
  updateHRUser,
  deleteHRUser,
  toggleHRUserStatus
} = require('../controllers/hrController');
const router = express.Router();
router.get('/', auth, authorize('admin'), getAllHRUsers);
router.post('/', auth, authorize('admin'), createHRUser);
router.put('/:hrId', auth, authorize('admin'), updateHRUser);
router.delete('/:hrId', auth, authorize('admin'), deleteHRUser);
router.put('/:hrId/status', auth, authorize('admin'), toggleHRUserStatus);
module.exports = router;