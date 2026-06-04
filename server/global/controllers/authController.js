const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  validationResult
} = require('express-validator');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const ALLOWED_ROLES = new Set(['applicant', 'hr']);
const register = async (req, res) => {
  let normalizedEmail = '';
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
      fullName,
      email,
      password,
      phone,
      currentLocation,
      educationEntries,
      currentStatus,
      careerField,
      primarySkills,
      workExperienceEntries,
      role = 'applicant'
    } = req.body;
    const normalizedRole = ALLOWED_ROLES.has(role) ? role : 'applicant';
    normalizedEmail = email.toLowerCase().trim();
    let existingUser = await User.findOne({
      email: normalizedEmail
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã tồn tại trong hệ thống'
      });
    }
    let pendingReg = await PendingRegistration.findOne({
      email: normalizedEmail,
      type: 'applicant'
    });
    const nameParts = fullName ? fullName.trim().split(' ') : ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    let parsedEducationEntries = [];
    let parsedWorkExperienceEntries = [];
    let parsedPrimarySkills = [];
    try {
      parsedEducationEntries = typeof educationEntries === 'string' ? JSON.parse(educationEntries) : educationEntries || [];
      parsedWorkExperienceEntries = typeof workExperienceEntries === 'string' ? JSON.parse(workExperienceEntries) : workExperienceEntries || [];
      parsedPrimarySkills = typeof primarySkills === 'string' ? JSON.parse(primarySkills) : primarySkills || [];
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Định dạng dữ liệu không hợp lệ'
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userData = {
      firstName,
      lastName,
      password: hashedPassword,
      phone,
      role: normalizedRole,
      profile: {
        fullName,
        careerField,
        currentLocation,
        currentStatus,
        educationEntries: parsedEducationEntries,
        workExperienceEntries: parsedWorkExperienceEntries,
        primarySkills: parsedPrimarySkills
      }
    };
    let resumeData = null;
    if (req.file) {
      console.log('Resume file received:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer
      });
      resumeData = {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileData: req.file.buffer,
        fileSize: req.file.size
      };
    } else {
      console.log('No resume file in request');
    }
    if (pendingReg) {
      pendingReg.userData = userData;
      pendingReg.resumeData = resumeData;
      pendingReg.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pendingReg.save();
      console.log('Updated existing pending registration for:', email);
    } else {
      pendingReg = new PendingRegistration({
        email: normalizedEmail,
        type: 'applicant',
        userData: userData,
        resumeData: resumeData
      });
      await pendingReg.save();
      console.log('Created new pending registration for:', normalizedEmail);
    }
    console.log('Pending registration saved with resume:', !!resumeData);
    res.status(200).json({
      success: true,
      message: 'Đăng ký đã được tạo. Vui lòng xác thực email bằng mã OTP.',
      data: {
        email: normalizedEmail,
        requiresVerification: true,
        resumeUploaded: !!resumeData
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: 'Email này đã có yêu cầu đăng ký chờ xác thực. Vui lòng nhập OTP.',
        data: {
          email: normalizedEmail,
          requiresVerification: true,
          pendingExists: true
        }
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu gửi lên không hợp lệ',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống trong quá trình đăng ký',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đăng nhập không hợp lệ',
        errors: errors.array()
      });
    }
    const {
      email,
      password
    } = req.body;
    let user = await User.findOne({
      email
    }).select('+password');
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.'
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }
    if (user.accountStatus !== 'active') {
      const status = user.accountStatus;
      if (status === 'pending_verification') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản chưa xác thực email. Vui lòng xác thực để tiếp tục.',
          code: 'EMAIL_VERIFICATION_REQUIRED',
          data: { email: user.email }
        });
      }
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Tài khoản đang bị tạm ngưng hoặc chưa được kích hoạt. Vui lòng liên hệ Admin.'
      });
    }
    const payload = {
      id: user.id,
      role: user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
    const Resume = require('../models/Resume');
    let currentResume = null;
    if (user.profile?.currentResumeId || user.currentResumeId) {
      currentResume = await Resume.findOne({
        _id: user.profile?.currentResumeId || user.currentResumeId,
        userId: user._id,
        isActive: true
      }).select('-fileData');
    }
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture,
        avatar: user.avatar,
        profile: {
          currentLocation: user.profile?.currentLocation || user.location,
          careerField: user.profile?.careerField,
          summary: user.profile?.summary,
          primarySkills: user.profile?.primarySkills || user.skills || [],
          educationEntries: user.profile?.educationEntries || [],
          workExperienceEntries: user.profile?.workExperienceEntries || [],
          projects: user.profile?.projects || [],
          currentResumeId: currentResume?._id || user.profile?.currentResumeId || user.currentResumeId,
          resume: currentResume ? {
            fileName: currentResume.originalName
          } : null
        },
        skills: user.profile?.primarySkills || user.skills || [],
        currentResumeId: currentResume?._id || user.profile?.currentResumeId || user.currentResumeId,
        resumeAvailable: !!currentResume
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};
const getMe = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    res.json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        avatar: user.avatar,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
};
module.exports = {
  register,
  login,
  getMe,
  logout
};