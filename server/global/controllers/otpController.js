const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const {
  validationResult
} = require('express-validator');
const VerificationToken = require('../models/VerificationToken');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const {
  sendOtpEmail
} = require('../services/emailService');
const { uploadResumeBuffer } = require('../services/cloudinaryService');
const ALLOWED_ROLES = new Set(['applicant', 'hr']);
function otpConfig() {
  return {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    resendCooldownSec: parseInt(process.env.OTP_RESEND_COOLDOWN_SEC || '60', 10),
    maxResends: parseInt(process.env.OTP_MAX_RESENDS || '5', 10)
  };
}
function generateCode() {
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, '0');
}
async function sendOtp(req, res) {
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
      userId
    } = req.body;
    const cfg = otpConfig();
    let user = null;
    let pendingReg = null;
    if (userId) {
      user = await User.findById(userId);
    }
    if (!user && email) {
      user = await User.findOne({
        email: email.toLowerCase()
      });
    }
    if (!user && email) {
      pendingReg = await PendingRegistration.findOne({
        email: email.toLowerCase()
      });
      if (!pendingReg) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đăng ký cho email này. Vui lòng đăng ký trước.'
        });
      }
    }
    const targetEmail = user ? user.email : pendingReg.email;
    const lastToken = await VerificationToken.findOne({
      email: targetEmail,
      type: 'email_otp'
    }).sort({
      createdAt: -1
    });
    const now = Date.now();
    if (lastToken && lastToken.lastSentAt && now - lastToken.lastSentAt.getTime() < cfg.resendCooldownSec * 1000) {
      const waitSec = Math.ceil((cfg.resendCooldownSec * 1000 - (now - lastToken.lastSentAt.getTime())) / 1000);
      return res.status(429).json({
        success: false,
        message: `Vui lòng chờ ${waitSec} giây trước khi gửi lại mã.`
      });
    }
    const since = new Date(now - 24 * 60 * 60 * 1000);
    const resendCount24h = await VerificationToken.countDocuments({
      email: targetEmail,
      type: 'email_otp',
      createdAt: {
        $gte: since
      }
    });
    if (resendCount24h >= cfg.maxResends) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.'
      });
    }
    const code = generateCode();
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);
    const expiresAt = new Date(now + cfg.expiryMinutes * 60 * 1000);
    const tokenDoc = await VerificationToken.create({
      userId: user ? user._id : null,
      email: targetEmail,
      type: 'email_otp',
      codeHash,
      expiresAt,
      attemptsRemaining: cfg.maxAttempts,
      resendCount: lastToken ? lastToken.resendCount + 1 : 0,
      lastSentAt: new Date()
    });
    await sendOtpEmail(targetEmail, code);
    return res.json({
      success: true,
      message: 'Mã OTP đã được gửi tới email của bạn',
      data: {
        userId: user ? user._id : null,
        email: targetEmail,
        expiresAt,
        resendCooldownSec: cfg.resendCooldownSec
      }
    });
  } catch (error) {
    console.error('sendOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
}
async function verifyOtp(req, res) {
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
      userId,
      code
    } = req.body;
    let user = null;
    let pendingReg = null;
    if (userId) {
      user = await User.findById(userId);
    }
    if (!user && email) {
      user = await User.findOne({
        email: email.toLowerCase()
      });
    }
    if (!user && email) {
      pendingReg = await PendingRegistration.findOne({
        email: email.toLowerCase()
      });
      if (!pendingReg) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đăng ký cho email này'
        });
      }
    }
    const targetEmail = user ? user.email : pendingReg.email;
    const token = await VerificationToken.findOne({
      email: targetEmail,
      type: 'email_otp',
      usedAt: null
    }).sort({
      createdAt: -1
    });
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Không có mã xác thực còn hiệu lực. Vui lòng yêu cầu mã mới.'
      });
    }
    if (token.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.'
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
        message: 'Mã xác thực không đúng. Vui lòng thử lại.'
      });
    }
    token.usedAt = new Date();
    await token.save();
    if (pendingReg) {
      if (pendingReg.type === 'applicant') {
        const safeRole = ALLOWED_ROLES.has(pendingReg.userData?.role) ? pendingReg.userData.role : 'applicant';
        const userData = {
          firstName: pendingReg.userData.firstName,
          lastName: pendingReg.userData.lastName,
          email: pendingReg.email,
          password: pendingReg.userData.password,
          phone: pendingReg.userData.phone,
          role: safeRole,
          profile: pendingReg.userData.profile,
          accountStatus: 'active',
          emailVerifiedAt: new Date()
        };
        user = await User.create(userData);
        let resumeId = null;
        if (pendingReg.resumeData && pendingReg.resumeData.fileData) {
          try {
            console.log('========== RESUME CREATION START ==========');
            console.log('Resume data found in pending registration:', {
              originalName: pendingReg.resumeData.originalName,
              mimeType: pendingReg.resumeData.mimeType,
              fileSize: pendingReg.resumeData.fileSize,
              hasFileData: !!pendingReg.resumeData.fileData,
              fileDataType: typeof pendingReg.resumeData.fileData
            });
            if (!pendingReg.resumeData.fileData || !Buffer.isBuffer(pendingReg.resumeData.fileData)) {
              console.error('Invalid file data - not a Buffer:', typeof pendingReg.resumeData.fileData);
              throw new Error('Invalid resume file data');
            }
            const timestamp = Date.now();
            const ext = pendingReg.resumeData.originalName.split('.').pop() || 'pdf';
            const fileName = `resume_${user._id}_${timestamp}.${ext}`;
            const Resume = require('../models/Resume');
            const cloud = await uploadResumeBuffer(pendingReg.resumeData.fileData, {
              userId: user._id,
              originalName: pendingReg.resumeData.originalName,
              mimeType: pendingReg.resumeData.mimeType
            });
            const resumeDoc = {
              userId: user._id,
              fileName: fileName,
              originalName: pendingReg.resumeData.originalName || 'resume.pdf',
              mimeType: pendingReg.resumeData.mimeType || 'application/pdf',
              fileUrl: cloud?.url,
              cloudinaryPublicId: cloud?.publicId,
              fileSize: pendingReg.resumeData.fileSize || pendingReg.resumeData.fileData.length,
              isActive: true,
              processingStatus: 'completed'
            };
            console.log('Creating Resume document with:', {
              userId: resumeDoc.userId,
              fileName: resumeDoc.fileName,
              originalName: resumeDoc.originalName,
              fileSize: resumeDoc.fileSize,
              fileUrl: resumeDoc.fileUrl
            });
            const resume = new Resume(resumeDoc);
            const savedResume = await resume.save();
            resumeId = savedResume._id;
            console.log('✅ Resume document saved successfully:', {
              resumeId: resumeId,
              userId: user._id
            });
            user.currentResumeId = resumeId;
            if (!user.profile) {
              user.profile = {};
            }
            user.profile.currentResumeId = resumeId;
            await user.save();
            console.log('✅ User updated with resumeId:', resumeId);
            console.log('========== RESUME CREATION END ==========');
          } catch (resumeError) {
            console.error('❌ ERROR saving resume after OTP verification:', {
              error: resumeError.message,
              stack: resumeError.stack,
              name: resumeError.name
            });
          }
        } else {
          console.log('⚠️ No resume data found in pending registration:', {
            hasResumeData: !!pendingReg.resumeData,
            hasFileData: !!pendingReg.resumeData?.fileData
          });
        }
        await PendingRegistration.deleteOne({
          _id: pendingReg._id
        });
        return res.json({
          success: true,
          message: 'Xác thực email thành công! Tài khoản của bạn đã được tạo.',
          data: {
            userId: user._id,
            email: user.email,
            role: user.role,
            resumeUploaded: !!resumeId
          }
        });
      }
    }
    user.accountStatus = 'active';
    user.emailVerifiedAt = new Date();
    await user.save();
    return res.json({
      success: true,
      message: 'Xác thực email thành công',
      data: {
        userId: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('verifyOtp error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống trong quá trình xác thực OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
module.exports = {
  sendOtp,
  verifyOtp
};