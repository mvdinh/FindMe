const Job = require('../models/Job');
const JobStatusChangeRequest = require('../models/JobStatusChangeRequest');
const User = require('../models/User');
const {
  broadcastToRole,
  createAndEmit
} = require('../services/notificationService');
const {
  statusLabel
} = require('../utils/jobStatusNotifications');
const ALLOWED_TARGET = ['active', 'closed', 'inactive', 'draft'];
const submitHrRequest = async (req, res) => {
  try {
    if (String(req.user?.role || '').toLowerCase() !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản HR mới gửi yêu cầu duyệt trạng thái.'
      });
    }
    const {
      requestedStatus,
      message
    } = req.body;
    if (!ALLOWED_TARGET.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đề xuất không hợp lệ'
      });
    }
    if (requestedStatus === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Đóng tin do HR thực hiện trực tiếp, không cần gửi yêu cầu duyệt.'
      });
    }
    const text = typeof message === 'string' ? message.trim() : '';
    if (text.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do / nội dung đề xuất (tối thiểu 10 ký tự).'
      });
    }
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    if (job.lastStatusActorRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Tin này chưa bị quản trị viên khóa thao tác trạng thái — bạn có thể đổi trực tiếp.'
      });
    }
    if (job.status === requestedStatus) {
      return res.status(400).json({
        success: false,
        message: 'Tin đã ở trạng thái này.'
      });
    }
    const existing = await JobStatusChangeRequest.findOne({
      job: job._id,
      reviewStatus: 'pending'
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Đã có yêu cầu đang chờ admin duyệt cho tin này.'
      });
    }
    const doc = await JobStatusChangeRequest.create({
      job: job._id,
      requestedBy: req.user.id,
      requestedStatus,
      previousStatus: job.status,
      message: text
    });
    const hrUser = await User.findById(req.user.id).select('firstName lastName');
    const hrName = hrUser ? `${hrUser.firstName || ''} ${hrUser.lastName || ''}`.trim() || 'HR' : 'HR';
    try {
      await broadcastToRole('admin', {
        type: 'job',
        title: 'HR xin duyệt đổi trạng thái tin',
        message: `${hrName} đề xuất đổi "${job.title}" sang "${requestedStatus}".`,
        actionUrl: '/admin/job-status-requests',
        entity: {
          kind: 'job',
          id: job._id,
          extra: {
            requestId: doc._id.toString()
          }
        },
        priority: 'medium',
        createdBy: req.user.id
      });
    } catch (e) {
      console.error('Notify admins (status request):', e);
    }
    res.status(201).json({
      success: true,
      message: 'Đã gửi yêu cầu tới quản trị viên.',
      data: {
        id: doc._id,
        jobId: job._id,
        requestedStatus,
        reviewStatus: doc.reviewStatus
      }
    });
  } catch (error) {
    console.error('submitHrRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
const listPendingForHr = async (req, res) => {
  try {
    const list = await JobStatusChangeRequest.find({
      requestedBy: req.user.id,
      reviewStatus: 'pending'
    }).populate('job', 'title status').sort({
      createdAt: -1
    }).lean();
    res.json({
      success: true,
      data: list.map(r => ({
        id: r._id,
        jobId: r.job?._id != null ? String(r.job._id) : r.job != null ? String(r.job) : null,
        jobTitle: r.job?.title,
        currentJobStatus: r.job?.status,
        requestedStatus: r.requestedStatus,
        message: r.message,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('listPendingForHr:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
const listPendingForAdmin = async (req, res) => {
  try {
    const filter = {
      reviewStatus: 'pending'
    };
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const totalItems = await JobStatusChangeRequest.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const skip = (page - 1) * limit;
    const list = await JobStatusChangeRequest.find(filter).populate('job', 'title status department lastStatusActorRole').populate('requestedBy', 'firstName lastName email').sort({
      createdAt: -1
    }).skip(skip).limit(limit).lean();
    res.json({
      success: true,
      data: list.map(r => ({
        id: r._id,
        jobId: r.job?._id != null ? String(r.job._id) : r.job != null ? String(r.job) : null,
        jobTitle: r.job?.title,
        jobStatus: r.job?.status,
        department: r.job?.department,
        requestedStatus: r.requestedStatus,
        previousStatus: r.previousStatus,
        message: r.message,
        requestedByName: r.requestedBy ? `${r.requestedBy.firstName || ''} ${r.requestedBy.lastName || ''}`.trim() : '',
        requestedByEmail: r.requestedBy?.email,
        createdAt: r.createdAt
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('listPendingForAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
const approveRequest = async (req, res) => {
  try {
    const filter = {
      _id: req.params.id,
      reviewStatus: 'pending'
    };
    const reqDoc = await JobStatusChangeRequest.findOne(filter);
    if (!reqDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu hoặc đã xử lý.'
      });
    }
    const job = await Job.findById(reqDoc.job);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Tin tuyển dụng không còn tồn tại.'
      });
    }
    const previousStatus = job.status;
    job.status = reqDoc.requestedStatus;
    job.lastStatusActorRole = 'hr';
    job.updatedAt = new Date();
    if (reqDoc.requestedStatus === 'active' && previousStatus === 'draft' && !job.publishedAt) {
      job.publishedAt = new Date();
    }
    await job.save();
    reqDoc.reviewStatus = 'approved';
    reqDoc.reviewedBy = req.user.id;
    reqDoc.reviewNote = typeof req.body?.reviewNote === 'string' ? req.body.reviewNote.trim().slice(0, 1000) : '';
    await reqDoc.save();
    try {
      const adminUser = await User.findById(req.user.id).select('firstName lastName').lean();
      const adminName = adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Quản trị viên' : 'Quản trị viên';
      const st = statusLabel(reqDoc.requestedStatus);
      await createAndEmit({
        toUserId: req.user.id,
        toRole: 'admin',
        type: 'job',
        title: 'Bạn đã duyệt yêu cầu',
        message: `Bạn đã duyệt đổi trạng thái "${job.title}" sang ${st}.`,
        actionUrl: '/admin/job-status-requests',
        entity: {
          kind: 'job',
          id: job._id,
          extra: {
            requestId: reqDoc._id.toString()
          }
        },
        priority: 'low',
        createdBy: req.user.id
      });
      await createAndEmit({
        toUserId: reqDoc.requestedBy,
        toRole: 'hr',
        type: 'job',
        title: 'Yêu cầu đổi trạng thái đã được duyệt',
        message: `${adminName} đã duyệt đề xuất của bạn. "${job.title}" hiện là ${st}.`,
        actionUrl: '/hr/jobs',
        entity: {
          kind: 'job',
          id: job._id
        },
        priority: 'medium',
        createdBy: req.user.id
      });
    } catch (e) {
      console.error('approveRequest notify:', e);
    }
    res.json({
      success: true,
      message: 'Đã duyệt và cập nhật trạng thái tin.',
      data: {
        jobId: job._id,
        status: job.status,
        requestId: reqDoc._id
      }
    });
  } catch (error) {
    console.error('approveRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
const rejectRequest = async (req, res) => {
  try {
    const filter = {
      _id: req.params.id,
      reviewStatus: 'pending'
    };
    const reqDoc = await JobStatusChangeRequest.findOne(filter);
    if (!reqDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu hoặc đã xử lý.'
      });
    }
    const note = typeof req.body?.reviewNote === 'string' ? req.body.reviewNote.trim().slice(0, 1000) : '';
    if (note.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do từ chối (tối thiểu 5 ký tự).'
      });
    }
    reqDoc.reviewStatus = 'rejected';
    reqDoc.reviewedBy = req.user.id;
    reqDoc.reviewNote = note;
    await reqDoc.save();
    const jobForTitle = await Job.findById(reqDoc.job).select('title').lean();
    const jobTitle = jobForTitle?.title || 'tin tuyển dụng';
    try {
      const adminUser = await User.findById(req.user.id).select('firstName lastName').lean();
      const adminName = adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Quản trị viên' : 'Quản trị viên';
      await createAndEmit({
        toUserId: req.user.id,
        toRole: 'admin',
        type: 'job',
        title: 'Bạn đã từ chối yêu cầu',
        message: `Bạn đã từ chối đề xuất đổi trạng thái "${jobTitle}".`,
        actionUrl: '/admin/job-status-requests',
        entity: {
          kind: 'job',
          id: reqDoc.job
        },
        priority: 'low',
        createdBy: req.user.id
      });
      await createAndEmit({
        toUserId: reqDoc.requestedBy,
        toRole: 'hr',
        type: 'job',
        title: 'Yêu cầu đổi trạng thái bị từ chối',
        message: `${adminName} đã từ chối đề xuất của bạn cho "${jobTitle}". Ghi chú: ${note}`,
        actionUrl: '/hr/jobs',
        entity: {
          kind: 'job',
          id: reqDoc.job
        },
        priority: 'medium',
        createdBy: req.user.id
      });
    } catch (e) {
      console.error('rejectRequest notify:', e);
    }
    res.json({
      success: true,
      message: 'Đã từ chối yêu cầu.',
      data: {
        requestId: reqDoc._id
      }
    });
  } catch (error) {
    console.error('rejectRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
module.exports = {
  submitHrRequest,
  listPendingForHr,
  listPendingForAdmin,
  approveRequest,
  rejectRequest
};
