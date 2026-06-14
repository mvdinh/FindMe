const Company = require('../models/Company');
const Job = require('../models/Job');
const User = require('../models/User');
const { broadcastToRole, createAndEmit } = require('../services/notificationService');

// ========== PUBLIC & RECRUITER APIs ==========

exports.getCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    let query = { status: 'active', verificationStatus: 'approved' };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const companies = await Company.find(query).skip(skip).limit(parseInt(limit)).lean();
    const total = await Company.countDocuments(query);
    
    res.json({
      success: true,
      data: companies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('getCompanies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (error) {
    console.error('getCompanyById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ createdBy: req.user.id }).lean();
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (error) {
    console.error('getMyCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const existingCompany = await Company.findOne({ createdBy: req.user.id });
    if (existingCompany) {
      return res.status(400).json({ success: false, message: 'You already have a company registered.' });
    }
    
    const companyData = {
      ...req.body,
      createdBy: req.user.id,
      verificationStatus: 'pending'
    };
    
    const company = new Company(companyData);
    await company.save();
    
    try {
      await broadcastToRole('admin', {
        type: 'system',
        title: 'Yêu cầu duyệt doanh nghiệp mới',
        message: `Doanh nghiệp "${company.name}" vừa đăng ký và đang chờ duyệt.`,
        actionUrl: '/admin/companies',
        priority: 'high',
        createdBy: req.user.id
      });
    } catch (notifyErr) {
      console.error('Failed to send admin notification for new company:', notifyErr);
    }
    
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    console.error('createCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const currentCompany = await Company.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!currentCompany) return res.status(404).json({ success: false, message: 'Company not found or unauthorized' });

    // Nếu công ty bị khóa, không cho cập nhật
    if (currentCompany.verificationStatus === 'locked') {
      return res.status(403).json({ success: false, message: 'Doanh nghiệp đang bị khóa. Vui lòng gửi yêu cầu mở khóa.' });
    }

    const updateData = {
      ...req.body,
      verificationStatus: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    };

    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );
    
    try {
      await broadcastToRole('admin', {
        type: 'system',
        title: 'Doanh nghiệp cập nhật thông tin',
        message: `Doanh nghiệp "${company.name}" vừa cập nhật thông tin và cần được duyệt lại.`,
        actionUrl: '/admin/companies',
        priority: 'high',
        createdBy: req.user.id
      });
    } catch (notifyErr) {
      console.error('Failed to send admin notification for company update:', notifyErr);
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('updateCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found or unauthorized' });
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('deleteCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Recruiter yêu cầu mở khóa
exports.requestUnlock = async (req, res) => {
  try {
    const { message } = req.body;
    const company = await Company.findOne({ createdBy: req.user.id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (company.verificationStatus !== 'locked') {
      return res.status(400).json({ success: false, message: 'Doanh nghiệp không ở trạng thái bị khóa.' });
    }

    company.unlockRequestedAt = new Date();
    company.unlockRequestMessage = message || 'Yêu cầu mở khóa tài khoản doanh nghiệp.';
    await company.save();

    try {
      await broadcastToRole('admin', {
        type: 'system',
        title: 'Yêu cầu mở khóa doanh nghiệp',
        message: `Doanh nghiệp "${company.name}" đã gửi yêu cầu mở khóa tài khoản. Lý do: ${company.unlockRequestMessage}`,
        actionUrl: '/admin/companies',
        priority: 'high',
        createdBy: req.user.id
      });
    } catch (notifyErr) {
      console.error('Failed to send unlock request notification:', notifyErr);
    }

    res.json({ success: true, message: 'Đã gửi yêu cầu mở khóa thành công.' });
  } catch (error) {
    console.error('requestUnlock error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ========== ADMIN APIs ==========

// Lấy tất cả doanh nghiệp (có lọc theo trạng thái)
exports.getAllCompanies = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['pending', 'approved', 'rejected', 'locked'].includes(status)) {
      filter.verificationStatus = status;
    }
    const companies = await Company.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName')
      .populate('lockedBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .lean();

    // Đếm số lượng theo trạng thái
    const counts = await Company.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
    ]);
    const statusCounts = { pending: 0, approved: 0, rejected: 0, locked: 0 };
    counts.forEach(c => { statusCounts[c._id] = c.count; });

    res.json({ success: true, data: companies, counts: statusCounts });
  } catch (error) {
    console.error('getAllCompanies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPendingCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ verificationStatus: 'pending' }).populate('createdBy', 'firstName lastName email').lean();
    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('getPendingCompanies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approveCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { 
        verificationStatus: 'approved', 
        verifiedAt: new Date(), 
        verifiedBy: req.user.id,
        rejectionReason: null,
        lockReason: null,
        lockedAt: null,
        lockedBy: null,
        unlockRequestedAt: null,
        unlockRequestMessage: null
      },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    
    try {
      await createAndEmit({
        toUserId: company.createdBy,
        type: 'system',
        title: 'Doanh nghiệp đã được duyệt',
        message: `Chúc mừng! Doanh nghiệp "${company.name}" của bạn đã được quản trị viên duyệt thành công. Bạn có thể bắt đầu đăng tin tuyển dụng.`,
        actionUrl: '/recruiter/dashboard',
        priority: 'high',
        createdBy: req.user.id
      });
    } catch (notifyErr) {
      console.error('Failed to send recruiter notification for company approval:', notifyErr);
    }

    res.json({ success: true, message: 'Company approved', data: company });
  } catch (error) {
    console.error('approveCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectCompany = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'rejected', rejectionReason, verifiedAt: new Date(), verifiedBy: req.user.id },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    
    try {
      await createAndEmit({
        toUserId: company.createdBy,
        type: 'system',
        title: 'Yêu cầu duyệt doanh nghiệp bị từ chối',
        message: `Yêu cầu duyệt doanh nghiệp "${company.name}" của bạn đã bị từ chối. Lý do: ${rejectionReason}`,
        actionUrl: '/recruiter/profile',
        priority: 'high',
        createdBy: req.user.id
      });
    } catch (notifyErr) {
      console.error('Failed to send recruiter notification for company rejection:', notifyErr);
    }

    res.json({ success: true, message: 'Company rejected', data: company });
  } catch (error) {
    console.error('rejectCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin khóa doanh nghiệp
exports.lockCompany = async (req, res) => {
  try {
    const { lockReason } = req.body;
    if (!lockReason) return res.status(400).json({ success: false, message: 'Lock reason is required' });

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { 
        verificationStatus: 'locked', 
        lockReason, 
        lockedAt: new Date(), 
        lockedBy: req.user.id 
      },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    // Ẩn tất cả tin tuyển dụng đang active của company
        await Job.updateMany(
          { company: req.params.id, status: 'active' },
          { $set: { status: 'closed', lastStatusActorRole: 'admin' } }
        );

    try {
      await createAndEmit({
        toUserId: company.createdBy,
        type: 'system',
        title: 'Tài khoản doanh nghiệp bị khóa',
        message: `Tài khoản doanh nghiệp "${company.name}" đã bị quản trị viên khóa. Lý do: ${lockReason}. Bạn có thể gửi yêu cầu mở khóa.`,
        actionUrl: '/recruiter/profile',
        priority: 'high',
        createdBy: req.user.id
      });
    } catch (notifyErr) {
      console.error('Failed to send lock notification:', notifyErr);
    }

    res.json({ success: true, message: 'Company locked', data: company });
  } catch (error) {
    console.error('lockCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin mở khóa doanh nghiệp
exports.unlockCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { 
        verificationStatus: 'approved', 
        lockReason: null, 
        lockedAt: null, 
        lockedBy: null,
        unlockRequestedAt: null,
        unlockRequestMessage: null,
        verifiedAt: new Date(),
        verifiedBy: req.user.id
      },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    try {
      await createAndEmit({
        toUserId: company.createdBy,
        type: 'system',
        title: 'Tài khoản doanh nghiệp đã được mở khóa',
        message: `Tài khoản doanh nghiệp "${company.name}" đã được mở khóa. Bạn có thể hoạt động bình thường trở lại.`,
        actionUrl: '/recruiter/dashboard',
        priority: 'high',
        createdBy: req.user.id
      });
    } catch (notifyErr) {
      console.error('Failed to send unlock notification:', notifyErr);
    }

    res.json({ success: true, message: 'Company unlocked', data: company });
  } catch (error) {
    console.error('unlockCompany error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Lấy chi tiết doanh nghiệp (Admin)
exports.getCompanyDetail = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email phone')
      .populate('verifiedBy', 'firstName lastName')
      .populate('lockedBy', 'firstName lastName')
      .lean();
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    // Lấy lịch sử tin tuyển dụng
    const jobs = await Job.find({ company: company._id })
      .select('title status createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: { ...company, jobs } });
  } catch (error) {
    console.error('getCompanyDetail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
