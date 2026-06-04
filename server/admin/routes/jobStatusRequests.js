const express = require('express');
const {
  param,
  body,
  validationResult
} = require('express-validator');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const {
  listPendingForAdmin,
  approveRequest,
  rejectRequest
} = require('../../global/controllers/jobStatusChangeRequestController');
const router = express.Router();
router.get('/', auth, authorize('admin'), listPendingForAdmin);
router.put('/:id/approve', auth, authorize('admin'), [param('id').isMongoId().withMessage('Invalid id'), body('reviewNote').optional().trim().isLength({
  max: 1000
}).withMessage('Ghi chú quá dài')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  approveRequest(req, res);
});
router.put('/:id/reject', auth, authorize('admin'), [param('id').isMongoId().withMessage('Invalid id'), body('reviewNote').trim().isLength({
  min: 5,
  max: 1000
}).withMessage('Lý do từ chối cần 5–1000 ký tự')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  rejectRequest(req, res);
});
module.exports = router;
