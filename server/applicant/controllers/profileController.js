const User = require('../../global/models/User');
const bcrypt = require('bcryptjs');
const Resume = require('../../global/models/Resume');
const {
  body,
  validationResult
} = require('express-validator');
/**
 * Hàm phụ trợ: Bóc tách chuỗi bằng cấp thành tên bằng cấp và chuyên ngành.
 * Ví dụ: "Cử nhân - CNTT" -> qualification: "Cử nhân", fieldOfStudy: "CNTT"
 * @param {string} degreeRaw - Chuỗi thông tin bằng cấp cần xử lý
 * @returns {object} Object chứa qualification và fieldOfStudy
 */
const parseEducationDegree = degreeRaw => {
  const degree = (degreeRaw || '').toString().trim();
  if (!degree) return { qualification: '', fieldOfStudy: '' };
  if (degree.includes(' - ')) {
    const [qualification, fieldOfStudy] = degree.split(' - ');
    return {
      qualification: (qualification || '').trim(),
      fieldOfStudy: (fieldOfStudy || '').trim()
    };
  }
  if (/\sin\s/i.test(degree)) {
    const [qualification, ...rest] = degree.split(/ in /i);
    return {
      qualification: (qualification || '').trim(),
      fieldOfStudy: rest.join(' in ').trim()
    };
  }
  if (/\schuyên ngành\s/i.test(degree)) {
    const [qualification, ...rest] = degree.split(/ chuyên ngành /i);
    return {
      qualification: (qualification || '').trim(),
      fieldOfStudy: rest.join(' chuyên ngành ').trim()
    };
  }
  return { qualification: degree, fieldOfStudy: '' };
};
/**
 * API Endpoint: Lấy thông tin hồ sơ (Profile) của ứng viên.
 * - Truy vấn thông tin người dùng theo ID trong token đăng nhập.
 * - Tìm kiếm CV hiện tại đang được kích hoạt.
 * - Cấu trúc lại dữ liệu về học vấn, kinh nghiệm làm việc, kỹ năng, dự án để trả về cho Client.
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    let currentResume = null;
    if (user.profile?.currentResumeId) {
      currentResume = await Resume.findOne({
        _id: user.profile.currentResumeId,
        userId,
        isActive: true
      }).select('-fileData');
    } else if (user.currentResumeId) {
      currentResume = await Resume.findOne({
        _id: user.currentResumeId,
        userId,
        isActive: true
      }).select('-fileData');
    }
    if (!currentResume) {
      currentResume = await Resume.findOne({
        userId,
        isActive: true
      }).sort({
        createdAt: -1
      }).select('-fileData');
    }
    const profileData = {
      _id: user._id,
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      fullName: `${user.lastName} ${user.firstName}`,
      email: user.email,
      phone: user.phone || '',
      location: user.profile?.currentLocation || user.location || '',
      summary: user.profile?.summary || '',
      careerField: user.profile?.careerField || '',
      lastPasswordChange: user.lastPasswordChange || null,
      profilePicture: user.profilePicture || user.avatar || '',
      avatar: user.profilePicture || user.avatar || '',
      currentResumeId: currentResume?._id || user.profile?.currentResumeId || user.currentResumeId,
      resumeAvailable: !!currentResume,
      resume: currentResume ? {
        id: currentResume._id,
        fileName: currentResume.originalName,
        uploadDate: currentResume.createdAt.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        fileSize: `${(currentResume.fileSize / 1024).toFixed(0)} KB`
      } : null,
      profile: {
        currentLocation: user.profile?.currentLocation || user.location || '',
        careerField: user.profile?.careerField || '',
        summary: user.profile?.summary || '',
        primarySkills: user.profile?.primarySkills || user.skills || [],
        educationEntries: user.profile?.educationEntries || [],
        workExperienceEntries: user.profile?.workExperienceEntries || [],
        projects: user.profile?.projects || [],
        currentResumeId: currentResume?._id || user.profile?.currentResumeId || user.currentResumeId,
        resume: currentResume ? {
          fileName: currentResume.originalName
        } : null
      },
      education: user.profile?.educationEntries?.map(edu => ({
        id: edu._id,
        institution: edu.universityName,
        degree: [edu.qualification || '', edu.fieldOfStudy || ''].filter(Boolean).join(' - '),
        graduationDate: edu.graduationYear,
        description: `${[edu.qualification || '', edu.fieldOfStudy || ''].filter(Boolean).join(' - ')}${edu.universityName ? `, ${edu.universityName}` : ''}${edu.cgpaPercentage ? ` - GPA: ${edu.cgpaPercentage}` : ''}`
      })) || user.education?.map(edu => ({
        id: edu._id,
        institution: edu.institution,
        degree: edu.degree,
        graduationDate: edu.graduationDate,
        description: edu.description
      })) || [],
      workExperience: user.profile?.workExperienceEntries?.map(work => ({
        id: work._id,
        company: work.company,
        position: work.position,
        duration: work.isCurrentlyWorking ? `${work.startDate} - Hiện tại` : `${work.startDate} - ${work.endDate}`,
        description: work.description || work.position
      })) || user.workExperience?.map(work => ({
        id: work._id,
        company: work.company,
        position: work.position,
        duration: work.duration,
        description: work.description
      })) || [],
      skills: user.profile?.primarySkills || user.skills || [],
      projects: user.profile?.projects?.map(project => ({
        id: project._id,
        name: project.name,
        technologies: project.technologies,
        description: project.description
      })) || user.projects?.map(project => ({
        id: project._id,
        name: project.name,
        technologies: project.technologies,
        description: project.description
      })) || []
    };
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * API Endpoint: Cập nhật thông tin hồ sơ cá nhân.
 * - Xử lý kiểm tra dữ liệu đầu vào (Validation).
 * - Bóc tách Họ và Tên từ chuỗi họ tên đầy đủ (fullName).
 * - Chuẩn hóa lại mảng thông tin học vấn (education) và kinh nghiệm làm việc (workExperience).
 * - Lưu các thay đổi vào CSDL.
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    const userId = req.user._id || req.user.id;
    const {
      fullName,
      phone,
      location,
      careerField,
      summary,
      education,
      workExperience,
      skills,
      projects
    } = req.body;
    const fullNameStr = fullName ? fullName.toString().trim() : '';
    const nameParts = fullNameStr.split(' ').filter(part => part.length > 0);
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';
    const educationEntries = education?.map(edu => {
      const parsedDegree = parseEducationDegree(edu.degree);
      return {
      _id: edu.id && edu.id !== 'new' ? edu.id : undefined,
      qualification: parsedDegree.qualification,
      fieldOfStudy: parsedDegree.fieldOfStudy,
      universityName: edu.institution || '',
      graduationYear: edu.graduationDate || '',
      cgpaPercentage: ''
    };
    }) || [];
    const workExperienceEntries = workExperience?.map(work => ({
      _id: work.id && work.id !== 'new' ? work.id : undefined,
      company: work.company || '',
      position: work.position || '',
      startDate: work.duration && work.duration.includes(' - ') ? work.duration.split(' - ')[0] : work.duration || '',
      endDate: work.duration && work.duration.includes('Present') ? '' : work.duration && work.duration.includes(' - ') ? work.duration.split(' - ')[1] : '',
      isCurrentlyWorking: work.duration ? work.duration.includes('Present') : false,
      description: work.description || '',
      yearsOfExperience: ''
    })) || [];
    const projectEntries = projects?.map(project => ({
      _id: project.id && project.id !== 'new' ? project.id : undefined,
      name: project.name || '',
      technologies: project.technologies || '',
      description: project.description || ''
    })) || [];
    const updateData = {
      firstName,
      lastName,
      phone,
      location,
      'profile.currentLocation': location,
      'profile.careerField': careerField ? careerField.toString().trim() : '',
      'profile.summary': summary,
      'profile.educationEntries': educationEntries,
      'profile.workExperienceEntries': workExperienceEntries,
      'profile.primarySkills': skills || [],
      'profile.projects': projectEntries
    };
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    }).select('-password');
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        fullName: `${updatedUser.lastName} ${updatedUser.firstName}`,
        phone: updatedUser.phone,
        location: updatedUser.profile?.currentLocation || updatedUser.location,
        careerField: updatedUser.profile?.careerField || '',
        summary: updatedUser.profile?.summary
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * API Endpoint: Tải xuống hoặc xem trước CV hiện tại đang kích hoạt.
 * - Tìm CV trong cơ sở dữ liệu dựa trên currentResumeId của User.
 * - Trả về Base64 data (fileData) cùng các thông tin loại tệp (mimeType) để Client xử lý.
 */
const downloadCurrentResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    let resumeId = user.profile?.currentResumeId || user.currentResumeId;
    let resume = null;
    if (resumeId) {
      resume = await Resume.findOne({
        _id: resumeId,
        userId,
        isActive: true
      });
    }
    if (!resume) {
      resume = await Resume.findOne({
        userId,
        isActive: true
      }).sort({
        createdAt: -1
      });
    }
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }
    res.json({
      success: true,
      fileUrl: resume.fileUrl,
      fileData: resume.fileData,
      fileName: resume.originalName,
      contentType: resume.mimeType,
      fileSize: resume.fileSize
    });
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * API Endpoint: Xóa CV hiện tại của ứng viên.
 * - Tìm CV đang kích hoạt, xóa khỏi DB Collection Resume.
 * - Xóa liên kết (ID) của CV bị xóa khỏi tài liệu User tương ứng.
 */
const deleteCurrentResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    let resumeId = user.profile?.currentResumeId || user.currentResumeId;
    let resume = null;
    if (resumeId) {
      resume = await Resume.findOne({
        _id: resumeId,
        userId,
        isActive: true
      });
    }
    if (!resume) {
      resume = await Resume.findOne({
        userId,
        isActive: true
      }).sort({
        createdAt: -1
      });
    }
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'No resume found to delete'
      });
    }
    await Resume.findByIdAndDelete(resume._id);
    console.log(`Deleted resume ${resume._id} for user ${userId}`);
    const updateData = {};
    if (user.profile?.currentResumeId === resume._id.toString()) {
      updateData['profile.currentResumeId'] = null;
      updateData['profile.resume'] = null;
    }
    if (user.currentResumeId && user.currentResumeId.toString() === resume._id.toString()) {
      updateData['currentResumeId'] = null;
    }
    await User.findByIdAndUpdate(userId, updateData);
    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * Middleware: Chuỗi quy tắc xác thực (Validation) cho form cập nhật hồ sơ.
 * - Đảm bảo họ tên dài từ 2 đến 100 ký tự.
 * - Kiểm tra định dạng số điện thoại chuẩn Việt Nam.
 * - Kiểm tra giới hạn ký tự của phần giới thiệu (summary) và địa điểm (location).
 */
const validateProfileUpdate = [body('fullName').trim().isLength({
  min: 2,
  max: 100
}).withMessage('Full name must be between 2 and 100 characters'),
body('phone').trim().optional({
  checkFalsy: true
}).isMobilePhone('vi-VN').withMessage('Please provide a valid phone number'),
body('location').trim().optional({
  checkFalsy: true
}).isLength({
  max: 200
}).withMessage('Location must not exceed 200 characters'), body('summary').trim().optional({
  checkFalsy: true
}).isLength({
  max: 1000
}).withMessage('Summary must not exceed 1000 characters'), body('skills').optional().isArray().withMessage('Skills must be an array'), body('education').optional().isArray().withMessage('Education must be an array'), body('workExperience').optional().isArray().withMessage('Work experience must be an array'), body('projects').optional().isArray().withMessage('Projects must be an array')];
/**
 * API Endpoint: Cập nhật ảnh đại diện (Avatar).
 * - Xử lý chuỗi ảnh Base64.
 * - Kiểm tra định dạng có đúng là ảnh hay không.
 * - Tính toán và chặn ảnh vượt quá giới hạn 5MB.
 * - Lưu chuỗi Base64 vào DB của User.
 */
const updateAvatar = async (req, res) => {
  try {
    const {
      imageData
    } = req.body;
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format',
        message: 'Please upload only image files (JPEG, JPG, PNG, GIF)'
      });
    }
    const base64Data = imageData.split(',')[1];
    const imageSizeBytes = base64Data.length * 3 / 4;
    const maxSizeBytes = 5 * 1024 * 1024;
    if (imageSizeBytes > maxSizeBytes) {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Profile picture must be smaller than 5MB'
      });
    }
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    user.avatar = imageData;
    user.profilePicture = imageData;
    await user.save();
    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      avatarData: imageData
    });
  } catch (error) {
    console.error('Applicant updateAvatar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * API Endpoint: Xóa ảnh đại diện.
 * - Xóa chuỗi Base64 của ảnh trong tài liệu User.
 */
const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    if (!user.profilePicture && !user.avatar) {
      return res.status(400).json({
        success: false,
        error: 'No profile picture to delete'
      });
    }
    user.avatar = null;
    user.profilePicture = null;
    await user.save();
    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });
  } catch (error) {
    console.error('Applicant deleteAvatar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile picture',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * API Endpoint: Đổi mật khẩu tài khoản.
 * - Xác thực mật khẩu cũ bằng bcrypt.compare.
 * - Kiểm tra độ dài mật khẩu mới.
 * - Băm (hash) mật khẩu mới và lưu vào DB, cập nhật thời gian đổi mật khẩu gần nhất.
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      currentPassword,
      newPassword
    } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.lastPasswordChange = new Date();
    await user.save();
    return res.json({
      success: true,
      message: 'Password changed successfully',
      lastPasswordChange: user.lastPasswordChange
    });
  } catch (error) {
    console.error('Applicant changePassword error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};
module.exports = {
  getProfile,
  updateProfile,
  downloadCurrentResume,
  deleteCurrentResume,
  validateProfileUpdate,
  updateAvatar,
  deleteAvatar,
  changePassword
};