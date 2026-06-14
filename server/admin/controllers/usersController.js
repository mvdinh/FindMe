const mongoose = require('mongoose');
const User = require('../../global/models/User');
const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
/**
 * Hàm phụ trợ: Kiểm tra xem Admin hiện tại có quyền quản lý tài khoản đích hay không.
 * Đảm bảo Admin không tự chỉnh sửa hoặc khóa tài khoản Admin khác thông qua API này.
 * @param {Object} adminUser - Đối tượng User của Admin đang thực hiện thao tác.
 * @param {string} targetId - ID của User đích.
 * @returns {Object|null} Trả về đối tượng User đích nếu hợp lệ, ngược lại trả về null.
 */
async function assertCanManageUser(adminUser, targetId) {
  if (!mongoose.Types.ObjectId.isValid(targetId)) return null;
  const target = await User.findById(targetId);
  if (!target) return null;
  if (target.role === 'admin') return null;
  return target;
}

/**
 * Hàm phụ trợ: Lọc và định dạng lại các trường thông tin của một User
 * để trả về cho giao diện danh sách bảng (Table) một cách gọn nhẹ.
 */
function formatUserRow(u) {
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    accountStatus: u.accountStatus,
    isActive: u.isActive !== false,
    department: u.department || '',
    jobTitle: u.jobTitle || '',
    createdAt: u.createdAt,
    lastLogin: u.lastLogin || null
  };
}

/**
 * API Endpoint: Lấy danh sách tài khoản (Users) trên hệ thống (dành cho Admin).
 * - Phân trang, tìm kiếm theo tên/email/sđt.
 * - Lọc theo vai trò (HR, Applicant) và trạng thái tài khoản (Active, Inactive).
 */
const listUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = req.query.role;
    const accountStatus = req.query.accountStatus;
    const isActiveQ = req.query.isActive;
    const andParts = [{ role: { $ne: 'admin' } }];

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      andParts.push({
        $or: [{ email: rx }, { firstName: rx }, { lastName: rx }, { phone: rx }]
      });
    }
    if (role && ['applicant', 'hr'].includes(role)) {
      andParts.push({ role });
    }
    if (accountStatus && ['pending_verification', 'active', 'suspended', 'inactive'].includes(accountStatus)) {
      andParts.push({ accountStatus });
    }
    if (isActiveQ === 'true') andParts.push({ isActive: true });
    if (isActiveQ === 'false') andParts.push({ isActive: false });

    const filter = andParts.length === 1 ? andParts[0] : { $and: andParts };

    const totalItems = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select(
        'firstName lastName email phone role accountStatus isActive department jobTitle createdAt lastLogin'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: users.map(u => formatUserRow(u)),
      pagination: {
        page,
        limit,
        totalPages,
        totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('listUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Không tải được danh sách tài khoản.',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Lấy chi tiết thông tin của một User bất kỳ dựa vào ID.
 * - Kiểm tra quyền bằng assertCanManageUser.
 * - Không trả về password hay lịch sử đăng nhập nhạy cảm.
 */
const getUserById = async (req, res) => {
  try {
    const target = await assertCanManageUser(req.user, req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng hoặc không có quyền xem.' });
    }
    const u = await User.findById(target._id)
      .select(
        '-password -loginHistory -savedJobsMetadata'
      )
      .lean();

    res.json({
      success: true,
      data: {
        id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        accountStatus: u.accountStatus,
        isActive: u.isActive !== false,
        department: u.department || '',
        jobTitle: u.jobTitle || '',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLogin: u.lastLogin || null,
        emailVerifiedAt: u.emailVerifiedAt || null
      }
    });
  } catch (error) {
    console.error('getUserById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Cập nhật thông tin/trạng thái tài khoản của một User.
 * - Hiện tại chỉ cho phép Admin thay đổi trạng thái kích hoạt (isActive) để khóa/mở khóa tài khoản.
 * - Chặn không cho phép Admin tự khóa tài khoản của chính mình.
 */
const updateUser = async (req, res) => {
  try {
    const target = await assertCanManageUser(req.user, req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng hoặc không có quyền sửa.' });
    }

    const body = req.body || {};
    const keys = Object.keys(body).filter(k => body[k] !== undefined);
    if (keys.some(k => k !== 'isActive')) {
      return res.status(403).json({
        success: false,
        message: 'Không được phép chỉnh sửa thông tin tài khoản tại đây.'
      });
    }
    if (body.isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể bật hoặc tắt đăng nhập (isActive).'
      });
    }

    if (String(target._id) === String(req.user.id || req.user._id)) {
      if (body.isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể tự vô hiệu hóa tài khoản của chính mình.'
        });
      }
    }

    target.isActive = Boolean(body.isActive);
    if (target.isActive) {
      target.accountStatus = 'active';
    } else {
      target.accountStatus = 'inactive';
    }
    await target.save();

    res.json({
      success: true,
      message: 'Đã cập nhật trạng thái đăng nhập.',
      data: {
        id: target._id,
        firstName: target.firstName,
        lastName: target.lastName,
        email: target.email,
        accountStatus: target.accountStatus,
        isActive: target.isActive !== false
      }
    });
  } catch (error) {
    console.error('updateUser:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map(e => e.message)
          .join(' ')
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      details: error.message
    });
  }
};

module.exports = {
  listUsers,
  getUserById,
  updateUser
};
