const express = require('express');
const {
  body
} = require('express-validator');
const {
  auth
} = require('../middleware/auth');
const {
  uploadResumeMemory
} = require('../middleware/upload');
const {
  register,
  login,
  getMe,
  logout
} = require('../controllers/authController');
const router = express.Router();
router.get('/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});
const otpRoutes = require('./otp');
router.use('/otp', otpRoutes);
const passwordResetRoutes = require('./passwordReset');
router.use('/', passwordResetRoutes);
router.post('/register', uploadResumeMemory.single('resume'), [
  body('fullName').trim().custom((value, { req }) => {
    if (req.body.role === 'recruiter' && (!value || !value.trim())) {
      throw new Error('Full name is required');
    }
    return true;
  }),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('currentLocation').optional().trim(),
  body('currentStatus').optional().trim(),
  body('role').optional().isIn(['applicant', 'recruiter']).withMessage('Invalid role'),
  body('companyName').optional().trim(),
  body('companyAddress').optional().trim(),
  body('jobTitle').optional().trim()
], register);
router.post('/login', [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'), body('password').notEmpty().withMessage('Password is required')], login);
router.get('/me', auth, getMe);
router.post('/logout', auth, logout);
module.exports = router;