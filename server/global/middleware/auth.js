const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = async (req, res, next) => {
  try {
    const ready = mongoose.connection && mongoose.connection.readyState === 1;
    if (!ready) {
      console.warn('Auth middleware - DB not connected');
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable'
      });
    }
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.'
      });
    }
    if (user.accountStatus !== 'active') {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Tài khoản chưa sẵn sàng để sử dụng. Vui lòng liên hệ Admin.'
      });
    }
    req.user = {
      ...user.toObject(),
      id: user._id.toString()
    };
    next();
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    const isTokenError =
      msg.includes('jwt malformed') ||
      msg.includes('jwt expired') ||
      msg.includes('invalid token') ||
      msg.includes('tokenexpirederror');
    res.status(isTokenError ? 401 : 500).json({
      success: false,
      message: isTokenError ? 'Token is not valid' : 'Internal server error'
    });
  }
};
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user?.role || 'undefined'} is not authorized to access this route`
      });
    }
    next();
  };
};
const requireCompany = (req, res, next) => {
  next();
};
const requireCompanyAdmin = (req, res, next) => {
  next();
};
module.exports = {
  auth,
  authorize,
  requireCompany,
  requireCompanyAdmin
};