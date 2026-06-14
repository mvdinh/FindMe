const bcrypt = require('bcryptjs');
const User = require('../../global/models/User');

/**
 * API Endpoint: Lấy thông tin tài khoản (Profile) của recruiter hiện tại.
 * Ẩn trường mật khẩu (password) và trả về các cấu hình thông báo (notifications).
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    const profile = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      jobTitle: user.jobTitle,
      isActive: user.isActive,
      avatar: user.avatar,
      lastPasswordChange: user.lastPasswordChange || null,
      joiningDate: user.joiningDate,
      createdAt: user.createdAt,
      location: user.location,
      workLocation: user.workLocation,
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      notifications: user.notifications || {
        emailAlerts: true,
        interviewUpdates: true,
        applicationNotifications: true,
        weeklyReports: false
      }
    };
    res.json({
      success: true,
      ...profile
    });
  } catch (error) {
    console.error('Error fetching recruiter profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Cập nhật thông tin hồ sơ của recruiter.
 * Cho phép chỉnh sửa họ tên, số điện thoại, chức danh, địa điểm và cấu hình nhận thông báo.
 */
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      department,
      jobTitle,
      location,
      workLocation,
      companyName,
      companyAddress,
      notifications
    } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (department !== undefined) user.department = department.trim();
    if (jobTitle !== undefined) user.jobTitle = jobTitle.trim();
    if (location !== undefined) user.location = location.trim();
    if (workLocation !== undefined) user.workLocation = workLocation.trim();
    if (companyName !== undefined) user.companyName = companyName.trim();
    if (companyAddress !== undefined) user.companyAddress = companyAddress.trim();
    if (notifications !== undefined) user.notifications = notifications;
    const updatedUser = await user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        department: updatedUser.department,
        jobTitle: updatedUser.jobTitle,
        isActive: updatedUser.isActive,
        avatar: updatedUser.avatar,
        joiningDate: updatedUser.joiningDate,
        location: updatedUser.location,
        workLocation: updatedUser.workLocation,
        companyName: updatedUser.companyName,
        companyAddress: updatedUser.companyAddress,
        notifications: updatedUser.notifications
      }
    });
  } catch (error) {
    console.error('Error updating recruiter profile:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Cập nhật ảnh đại diện (Avatar) cho Recruiter.
 * Nhận ảnh dưới dạng Base64, kiểm tra giới hạn 5MB và định dạng ảnh.
 */
exports.updateAvatar = async (req, res) => {
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
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    user.avatar = imageData;
    await user.save();
    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      avatarData: imageData
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Đổi mật khẩu tài khoản Recruiter.
 * Xác thực mật khẩu cũ và băm (hash) mật khẩu mới trước khi lưu.
 */
exports.changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng'
      });
    }
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu hiện tại không đúng'
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
      password: hashedNewPassword,
      updatedAt: new Date(),
      lastPasswordChange: new Date()
    }, {
      new: true,
      runValidators: true
    });
    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
      lastPasswordChange: updatedUser?.lastPasswordChange || null
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      details: error.message
    });
  }
};
