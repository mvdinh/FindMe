const express = require('express');
const {
  body
} = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  sendOtp,
  verifyOtp
} = require('../controllers/otpController');
const router = express.Router();
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau 5 phút.',
  skip: req => req.method === 'OPTIONS' || req.method === 'HEAD'
});
router.post('/send', otpLimiter, [body('email').optional().isEmail().withMessage('Valid email required'), body('userId').optional().isString()], sendOtp);
router.post('/verify', otpLimiter, [body('email').optional().isEmail().withMessage('Valid email required'), body('userId').optional().isString(), body('code').isLength({
  min: 4
}).withMessage('Code is required')], verifyOtp);
module.exports = router;