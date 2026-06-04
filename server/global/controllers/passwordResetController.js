const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  validationResult
} = require('express-validator');
const VerificationToken = require('../models/VerificationToken');
const User = require('../models/User');
const {
  sendPasswordResetEmail
} = require('../services/emailService');
function otpConfig() {
  return {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    resendCooldownSec: parseInt(process.env.OTP_RESEND_COOLDOWN_SEC || '60', 10),
    maxResends: parseInt(process.env.OTP_MAX_RESENDS || '10', 10)
  };
}
function generateCode() {
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, '0');
}
async function sendPasswordResetOtp(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }
    const {
      email
    } = req.body;
    const cfg = otpConfig();
    const user = await User.findOne({
      email: email.toLowerCase()
    });
    if (!user) {
      return res.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, mã OTP đặt lại mật khẩu đã được gửi.',
        data: {
          email
        }
      });
    }
    const lastToken = await VerificationToken.findOne({
      email: user.email,
      type: 'password_reset'
    }).sort({
      createdAt: -1
    });
    const now = Date.now();
    if (lastToken && lastToken.lastSentAt && now - lastToken.lastSentAt.getTime() < cfg.resendCooldownSec * 1000) {
      const waitSec = Math.ceil((cfg.resendCooldownSec * 1000 - (now - lastToken.lastSentAt.getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Vui lòng chờ ${waitSec} giây trước khi yêu cầu mã mới.`
      });
    }
    const since = new Date(now - 24 * 60 * 60 * 1000);
    const resendCount24h = await VerificationToken.countDocuments({
      email: user.email,
      type: 'password_reset',
      createdAt: {
        $gte: since
      }
    });
    if (resendCount24h >= cfg.maxResends) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau.'
      });
    }
    const code = generateCode();
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);
    const expiresAt = new Date(now + cfg.expiryMinutes * 60 * 1000);
    await VerificationToken.create({
      userId: user._id,
      email: user.email,
      type: 'password_reset',
      codeHash,
      expiresAt,
      attemptsRemaining: cfg.maxAttempts,
      resendCount: lastToken ? lastToken.resendCount + 1 : 0,
      lastSentAt: new Date()
    });
    await sendPasswordResetEmail(user.email, code);
    return res.json({
      success: true,
      message: 'Mã OTP đặt lại mật khẩu đã được gửi tới email của bạn',
      data: {
        email: user.email,
        expiresAt,
        resendCooldownSec: cfg.resendCooldownSec
      }
    });
  } catch (error) {
    console.error('sendPasswordResetOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
}

function signPasswordResetSession({
  email,
  tokenId
}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({
    type: 'password_reset_session',
    email,
    tokenId
  }, secret, {
    expiresIn: '10m'
  });
}

function verifyPasswordResetSession(resetToken) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const payload = jwt.verify(resetToken, secret);
  if (!payload || payload.type !== 'password_reset_session' || !payload.email || !payload.tokenId) {
    const err = new Error('Invalid reset token');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return payload;
}

async function verifyPasswordResetCode(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }
    const {
      email,
      code
    } = req.body;
    const user = await User.findOne({
      email: email.toLowerCase()
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    const token = await VerificationToken.findOne({
      email: user.email,
      type: 'password_reset',
      usedAt: null
    }).sort({
      createdAt: -1
    });
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Không có mã OTP còn hiệu lực. Vui lòng yêu cầu mã mới.'
      });
    }
    if (token.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.'
      });
    }
    if (token.attemptsRemaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.'
      });
    }
    const match = await bcrypt.compare(code, token.codeHash);
    if (!match) {
      token.attemptsRemaining = Math.max(0, token.attemptsRemaining - 1);
      await token.save();
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không đúng. Vui lòng thử lại.'
      });
    }
    const resetToken = signPasswordResetSession({
      email: user.email,
      tokenId: token._id.toString()
    });
    return res.json({
      success: true,
      message: 'Xác thực mã OTP thành công',
      data: {
        email: user.email,
        resetToken
      }
    });
  } catch (error) {
    console.error('verifyPasswordResetCode error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
}

async function resetPasswordWithOtp(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }
    const {
      email,
      code,
      newPassword,
      resetToken
    } = req.body;
    const user = await User.findOne({
      email: email.toLowerCase()
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    let token = null;
    let verifiedBySession = false;
    if (resetToken) {
      const session = verifyPasswordResetSession(resetToken);
      if (String(session.email).toLowerCase() !== String(user.email).toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'resetToken không hợp lệ'
        });
      }
      token = await VerificationToken.findOne({
        _id: session.tokenId,
        email: user.email,
        type: 'password_reset',
        usedAt: null
      });
      verifiedBySession = !!token;
    }
    if (!token) {
      token = await VerificationToken.findOne({
        email: user.email,
        type: 'password_reset',
        usedAt: null
      }).sort({
        createdAt: -1
      });
    }
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Không có mã OTP còn hiệu lực. Vui lòng yêu cầu mã mới.'
      });
    }
    if (token.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.'
      });
    }
    if (!verifiedBySession) {
      if (token.attemptsRemaining <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.'
        });
      }
      const match = await bcrypt.compare(code, token.codeHash);
      if (!match) {
        token.attemptsRemaining = Math.max(0, token.attemptsRemaining - 1);
        await token.save();
        return res.status(400).json({
          success: false,
          message: 'Mã OTP không đúng. Vui lòng thử lại.'
        });
      }
    }
    token.usedAt = new Date();
    await token.save();
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.lastPasswordChange = new Date();
    await user.save();
    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'
    });
  } catch (error) {
    console.error('resetPasswordWithOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
}
module.exports = {
  sendPasswordResetOtp,
  verifyPasswordResetCode,
  resetPasswordWithOtp
};