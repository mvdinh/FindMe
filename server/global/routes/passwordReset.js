const express = require('express');
const {
  body
} = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  sendPasswordResetOtp,
  verifyPasswordResetCode,
  resetPasswordWithOtp
} = require('../controllers/passwordResetController');
const router = express.Router();
const passwordResetLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Bạn đã thao tác quá nhiều lần từ IP này. Vui lòng thử lại sau.'
});
router.post('/forgot-password', passwordResetLimiter, [body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ')], sendPasswordResetOtp);
router.post('/verify-reset-code', passwordResetLimiter, [body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'), body('code').isLength({
  min: 6,
  max: 6
}).withMessage('Mã OTP phải gồm 6 chữ số')], verifyPasswordResetCode);
router.post('/reset-password', passwordResetLimiter, [body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'), body('newPassword').isLength({
  min: 6
}).withMessage('Mật khẩu phải có ít nhất 6 ký tự'), body('code').optional().isLength({
  min: 6,
  max: 6
}).withMessage('Mã OTP phải gồm 6 chữ số'), body('resetToken').optional().isString().withMessage('resetToken không hợp lệ')], resetPasswordWithOtp);
module.exports = router;