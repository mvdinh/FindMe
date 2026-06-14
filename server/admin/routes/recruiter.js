const express = require('express');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const {
  getAllRecruiterUsers,
  createRecruiterUser,
  updateRecruiterUser,
  deleteRecruiterUser,
  toggleRecruiterUserStatus
} = require('../controllers/recruiterController');
const router = express.Router();

router.get('/', auth, authorize('admin'), getAllRecruiterUsers);
router.post('/', auth, authorize('admin'), createRecruiterUser);
router.put('/:recruiterId', auth, authorize('admin'), updateRecruiterUser);
router.delete('/:recruiterId', auth, authorize('admin'), deleteRecruiterUser);
router.put('/:recruiterId/status', auth, authorize('admin'), toggleRecruiterUserStatus);

module.exports = router;
