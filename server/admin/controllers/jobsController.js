const mongoose = require('mongoose');
const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
const User = require('../../global/models/User');
const Company = require('../../global/models/Company');
const JobStatusChangeRequest = require('../../global/models/JobStatusChangeRequest');
const {
  createAndEmit,
  broadcastToRole
} = require('../../global/services/notificationService');
const {
  notifyActorAndPeerRoleOnStatusChange,
  statusLabel
} = require('../../global/utils/jobStatusNotifications');
/**
 * Hàm phụ trợ: Chuẩn hóa dữ liệu của một tin tuyển dụng (Job) trước khi trả về.
 * Xử lý định dạng mức lương (thêm dấu phẩy, đuôi VNĐ/USD), tên người đăng và các chỉ số thống kê ứng viên.
 * @param {Object} job - Document của tin tuyển dụng.
 * @param {Object} metrics - Dữ liệu thống kê số lượng ứng viên theo trạng thái.
 */
const formatJob = (job, metrics = {}) => {
  const postedBy = job.postedByObj ? `${job.postedByObj.lastName} ${job.postedByObj.firstName}`.trim() : 'Unknown';
  const salaryMin = job.salaryRange?.min;
  const salaryMax = job.salaryRange?.max;
  const currency = job.salaryRange?.currency || 'INR';
  const formatVal = val => {
    if (!val && val !== 0) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num.toLocaleString('vi-VN');
  };
  const minF = formatVal(salaryMin);
  const maxF = formatVal(salaryMax);
  const suffix = currency === 'VND' ? ' VNĐ' : ` ${currency}`;
  let salary = 'N/A';
  if (minF && maxF) salary = `${minF} - ${maxF}${suffix}`;
  else if (minF) salary = `${minF}${suffix}+`;
  else if (maxF) salary = `Tối đa ${maxF}${suffix}`;
  const posterId = job.postedByObj?._id != null ? String(job.postedByObj._id) : job.postedBy && typeof job.postedBy === 'object' && job.postedBy._id != null ? String(job.postedBy._id) : null;
  return {
    id: job._id,
    title: job.title,
    company: job.company?.name || 'Chưa cập nhật',
    department: job.department,
    location: job.location || 'N/A',
    type: job.jobType,
    status: job.status,
    applications: metrics.applications || 0,
    interviewScheduled: metrics.interviewScheduled || 0,
    interviewPassed: metrics.interviewPassed || 0,
    postedBy,
    postedById: posterId,
    postedDate: job.publishedAt || job.createdAt,
    deadline: job.applicationDeadline,
    salary,
    lastStatusActorRole: job.lastStatusActorRole || null
  };
};
/**
 * API Endpoint: Lấy danh sách toàn bộ các tin tuyển dụng trên hệ thống (dành cho Admin).
 * - Hỗ trợ lọc theo trạng thái, phòng ban, loại công việc, thời gian tạo, người đăng.
 * - Tìm kiếm theo từ khóa (regex) trên tiêu đề, phòng ban, địa điểm.
 * - Hỗ trợ phân trang, sắp xếp và đếm số lượng hồ sơ ứng tuyển (tổng số, lịch phỏng vấn, đậu phỏng vấn, đã tuyển).
 */
const getAllJobs = async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      department,
      jobType,
      fromDate,
      toDate,
      deadlineFrom,
      deadlineTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    const numericPage = Math.max(parseInt(page) || 1, 1);
    const numericLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const filter = {};
    if (status && ['active', 'closed', 'draft'].includes(status)) filter.status = status;
    if (department && department !== 'all') filter.department = department;
    if (jobType && jobType !== 'all') filter.jobType = jobType;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }
    if (deadlineFrom || deadlineTo) {
      filter.applicationDeadline = {};
      if (deadlineFrom) filter.applicationDeadline.$gte = new Date(deadlineFrom);
      if (deadlineTo) {
        const d = new Date(deadlineTo);
        d.setHours(23, 59, 59, 999);
        filter.applicationDeadline.$lte = d;
      }
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      
      const companies = await Company.find({ name: regex }).select('_id').lean();
      const companyIds = companies.map(c => c._id);

      filter.$or = [{
        title: regex
      }, {
        department: regex
      }, {
        location: regex
      }, {
        company: { $in: companyIds }
      }];
    }
    const postedByParam = req.query.postedBy;
    if (postedByParam && postedByParam !== 'all' && mongoose.Types.ObjectId.isValid(postedByParam)) {
      filter.postedBy = new mongoose.Types.ObjectId(postedByParam);
    }
    const sortFieldsMap = {
      createdAt: 'createdAt',
      title: 'title',
      applications: 'applicationsCount',
      status: 'status'
    };
    const resolvedSort = sortFieldsMap[sortBy] || 'createdAt';
    const sortObj = {
      [resolvedSort]: sortOrder === 'asc' ? 1 : -1
    };
    const totalItems = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / numericLimit) || 1;
    const skip = (numericPage - 1) * numericLimit;
    const jobs = await Job.find(filter).populate({
      path: 'postedBy',
      select: 'firstName lastName',
      model: User
    }).populate('company', 'name').sort(sortObj).skip(skip).limit(numericLimit).lean();
    const jobIds = jobs.map(j => j._id);
    const appsAgg = await Application.aggregate([{
      $match: {
        job: {
          $in: jobIds
        }
      }
    }, {
      $group: {
        _id: {
          job: '$job',
          status: '$status'
        },
        count: {
          $sum: 1
        }
      }
    }]);
    const metricsMap = {};
    appsAgg.forEach(r => {
      const jobId = r._id.job.toString();
      metricsMap[jobId] = metricsMap[jobId] || {
        applications: 0,
        interviewScheduled: 0,
        interviewPassed: 0,
        hired: 0
      };
      metricsMap[jobId].applications += r.count;
      if (r._id.status === 'interview_scheduled') metricsMap[jobId].interviewScheduled += r.count;
      if (r._id.status === 'interview_passed') metricsMap[jobId].interviewPassed += r.count;
      if (r._id.status === 'offer_accepted') metricsMap[jobId].hired += r.count;
    });
    const formatted = jobs.map(j => formatJob({
      ...j,
      postedByObj: j.postedBy
    }, metricsMap[j._id.toString()]));
    const jobIdsForTotals = await Job.find(filter).distinct('_id');
    const [totalsApplications, totalsInterviewPassed] = await Promise.all([Application.countDocuments({
      job: {
        $in: jobIdsForTotals
      }
    }), Application.countDocuments({
      job: {
        $in: jobIdsForTotals
      },
      status: 'interview_passed'
    })]);
    // Single-tenant: no company scoping
    const hrPosterFilter = { role: 'hr' };
    const hrPosterDocs = await User.find(hrPosterFilter).select('firstName lastName email').sort({
      lastName: 1,
      firstName: 1
    }).lean();
    const hrPosterOptions = hrPosterDocs.map(u => ({
      id: String(u._id),
      label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'HR'
    }));
    const departmentList = await Job.distinct('department', filter);
    const jobTypes = await Job.distinct('jobType', filter);
    res.json({
      jobs: formatted,
      hrPosterOptions,
      departments: departmentList,
      jobTypes,
      totals: {
        totalJobs: totalItems,
        activeJobs: await Job.countDocuments({
          ...filter,
          status: 'active'
        }),
        totalApplications: totalsApplications,
        totalInterviewPassed: totalsInterviewPassed,
        closedJobs: await Job.countDocuments({
          ...filter,
          status: 'closed'
        })
      },
      pagination: {
        page: numericPage,
        limit: numericLimit,
        totalPages,
        totalItems,
        hasNextPage: numericPage < totalPages,
        hasPrevPage: numericPage > 1
      }
    });
  } catch (error) {
    console.error('Error fetching admin jobs:', error);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      details: error.message
    });
  }
};
/**
 * API Endpoint: Cập nhật trạng thái của một tin tuyển dụng (active, inactive, closed, v.v.).
 * - Admin cập nhật trạng thái trực tiếp mà không cần duyệt.
 * - Tự động đánh dấu các "Yêu cầu thay đổi trạng thái" (JobStatusChangeRequest) đang pending của tin này thành approved.
 * - Bắn thông báo (notification) cho người tạo tin (HR) và các HR khác.
 */
const updateJobStatus = async (req, res) => {
  try {
    const {
      jobId
    } = req.params;
    const {
      status
    } = req.body;
    const allowed = ['active', 'closed', 'draft'];
    if (!allowed.includes(status)) return res.status(400).json({
      error: 'Invalid status value'
    });
    const job = await Job.findById(jobId).populate({
      path: 'postedBy',
      select: 'firstName lastName',
      model: User
    });
    if (!job) return res.status(404).json({
      error: 'Job not found'
    });
    const previousStatus = job.status;
    job.status = status;
    if (status !== previousStatus) {
      job.lastStatusActorRole = 'admin';
    }
    job.updatedAt = new Date();
    if (status === 'active' && previousStatus === 'draft' && !job.publishedAt) {
      job.publishedAt = new Date();
    }
    await job.save();
    try {
      await JobStatusChangeRequest.updateMany(
        { job: jobId, reviewStatus: 'pending' },
        {
          $set: {
            reviewStatus: 'approved',
            reviewedBy: req.user.id,
            reviewNote: `Thay đổi trạng thái trực tiếp sang ${status} bởi quản trị viên.`
          }
        }
      );
    } catch (err) {
      console.error('Failed to auto-resolve pending requests:', err);
    }
    await notifyActorAndPeerRoleOnStatusChange({
      actorUserId: req.user.id,
      actorRole: 'admin',
      jobId: job._id,
      jobTitle: job.title,
      previousStatus,
      newStatus: status
    });
    const appsAgg = await Application.aggregate([{
      $match: {
        job: job._id
      }
    }, {
      $group: {
        _id: '$status',
        count: {
          $sum: 1
        }
      }
    }]);
    const metrics = {
      applications: 0,
      interviewScheduled: 0,
      hired: 0
    };
    appsAgg.forEach(r => {
      metrics.applications += r.count;
      if (r._id === 'interview_scheduled') metrics.interviewScheduled = r.count;
      if (r._id === 'offer_accepted') metrics.hired = r.count;
    });
    res.json({
      job: formatJob({
        ...job.toObject(),
        postedByObj: job.postedBy
      }, metrics)
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      error: 'Failed to update job status',
      details: error.message
    });
  }
};
/**
 * API Endpoint: Lấy chi tiết thông tin của một tin tuyển dụng cụ thể (Admin view).
 * - Populate thông tin của người đăng (HR).
 * - Tính toán thống kê lượng hồ sơ nộp vào theo từng trạng thái để làm biểu đồ/báo cáo.
 */
const getJobDetail = async (req, res) => {
  try {
    const {
      jobId
    } = req.params;
    const job = await Job.findById(jobId).populate({
      path: 'postedBy',
      select: 'firstName lastName email',
      model: User
    }).lean();
    if (!job) return res.status(404).json({
      error: 'Job not found'
    });
    const apps = await Application.find({
      job: job._id
    }).select('status createdAt');
    const statusCounts = apps.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
    res.json({
      job: {
        ...job,
        postedBy: job.postedBy ? `${job.postedBy.lastName} ${job.postedBy.firstName}`.trim() : 'Unknown',
        applicationStats: {
          total: apps.length,
          interviewScheduled: statusCounts.interview_scheduled || 0,
          interviewPassed: statusCounts.interview_passed || 0,
          byStatus: statusCounts
        }
      }
    });
  } catch (error) {
    console.error('Error fetching job detail:', error);
    res.status(500).json({
      error: 'Failed to fetch job detail',
      details: error.message
    });
  }
};
/**
 * API Endpoint: Cập nhật trạng thái hàng loạt cho nhiều tin tuyển dụng cùng lúc (Bulk Update).
 * - Tương tự như updateJobStatus nhưng áp dụng cho nhiều jobIds.
 * - Tự động duyệt các yêu cầu pending của các job này.
 * - Gửi một thông báo tổng hợp duy nhất cho toàn bộ nhóm HR để tránh spam thông báo.
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const {
      jobIds = [],
      status
    } = req.body;
    if (!Array.isArray(jobIds) || jobIds.length === 0) return res.status(400).json({
      error: 'jobIds array required'
    });
    const allowed = ['active', 'closed', 'draft'];
    if (!allowed.includes(status)) return res.status(400).json({
      error: 'Invalid status value'
    });
    const query = {
      _id: {
        $in: jobIds
      }
    };
    const result = await Job.updateMany(query, {
      $set: {
        status,
        lastStatusActorRole: 'admin'
      }
    });
    try {
      await JobStatusChangeRequest.updateMany(
        { job: { $in: jobIds }, reviewStatus: 'pending' },
        {
          $set: {
            reviewStatus: 'approved',
            reviewedBy: req.user.id,
            reviewNote: `Thay đổi trạng thái hàng loạt sang ${status} bởi quản trị viên.`
          }
        }
      );
    } catch (err) {
      console.error('Failed to auto-resolve pending requests bulk:', err);
    }
    try {
      const n = result.modifiedCount;
      const sl = statusLabel(status);
      const adminUser = await User.findById(req.user.id).select('firstName lastName').lean();
      const adminName = adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Quản trị viên' : 'Quản trị viên';
      await createAndEmit({
        toUserId: req.user.id,
        toRole: 'admin',
        type: 'job',
        title: 'Đã cập nhật trạng thái hàng loạt',
        message: `Bạn đã đổi ${n} tin sang ${sl}.`,
        actionUrl: '/admin/jobs',
        priority: 'low',
        createdBy: req.user.id
      });
      // Single-tenant: broadcast by role (no company scoping)
      await broadcastToRole('hr', {
        type: 'job',
        title: 'Admin cập nhật trạng thái hàng loạt',
        message: `${adminName} đã đổi ${n} tin tuyển dụng sang ${sl}.`,
        actionUrl: '/hr/jobs',
        priority: 'medium',
        createdBy: req.user.id
      });
    } catch (e) {
      console.error('bulkUpdateStatus notify:', e);
    }
    res.json({
      message: 'Statuses updated',
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating job status:', error);
    res.status(500).json({
      error: 'Failed bulk status update',
      details: error.message
    });
  }
};
module.exports = {
  getAllJobs,
  updateJobStatus,
  getJobDetail,
  bulkUpdateStatus
};