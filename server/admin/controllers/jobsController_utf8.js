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
 * H├ám phß╗Ñ trß╗ú: Chuß║⌐n h├│a dß╗» liß╗çu cß╗ºa mß╗Öt tin tuyß╗ân dß╗Ñng (Job) tr╞░ß╗¢c khi trß║ú vß╗ü.
 * Xß╗¡ l├╜ ─æß╗ïnh dß║íng mß╗⌐c l╞░╞íng (th├¬m dß║Ñu phß║⌐y, ─æu├┤i VN─É/USD), t├¬n ng╞░ß╗¥i ─æ─âng v├á c├íc chß╗ë sß╗æ thß╗æng k├¬ ß╗⌐ng vi├¬n.
 * @param {Object} job - Document cß╗ºa tin tuyß╗ân dß╗Ñng.
 * @param {Object} metrics - Dß╗» liß╗çu thß╗æng k├¬ sß╗æ l╞░ß╗úng ß╗⌐ng vi├¬n theo trß║íng th├íi.
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
  const suffix = currency === 'VND' ? ' VN─É' : ` ${currency}`;
  let salary = 'N/A';
  if (minF && maxF) salary = `${minF} - ${maxF}${suffix}`;
  else if (minF) salary = `${minF}${suffix}+`;
  else if (maxF) salary = `Tß╗æi ─æa ${maxF}${suffix}`;
  const posterId = job.postedByObj?._id != null ? String(job.postedByObj._id) : job.postedBy && typeof job.postedBy === 'object' && job.postedBy._id != null ? String(job.postedBy._id) : null;
  return {
    id: job._id,
    title: job.title,
    company: job.company?.name || 'Ch╞░a cß║¡p nhß║¡t',
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
 * API Endpoint: Lß║Ñy danh s├ích to├án bß╗Ö c├íc tin tuyß╗ân dß╗Ñng tr├¬n hß╗ç thß╗æng (d├ánh cho Admin).
 * - Hß╗ù trß╗ú lß╗ìc theo trß║íng th├íi, ph├▓ng ban, loß║íi c├┤ng viß╗çc, thß╗¥i gian tß║ío, ng╞░ß╗¥i ─æ─âng.
 * - T├¼m kiß║┐m theo tß╗½ kh├│a (regex) tr├¬n ti├¬u ─æß╗ü, ph├▓ng ban, ─æß╗ïa ─æiß╗âm.
 * - Hß╗ù trß╗ú ph├ón trang, sß║»p xß║┐p v├á ─æß║┐m sß╗æ l╞░ß╗úng hß╗ô s╞í ß╗⌐ng tuyß╗ân (tß╗òng sß╗æ, lß╗ïch phß╗Ång vß║Ñn, ─æß║¡u phß╗Ång vß║Ñn, ─æ├ú tuyß╗ân).
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
 * API Endpoint: Cß║¡p nhß║¡t trß║íng th├íi cß╗ºa mß╗Öt tin tuyß╗ân dß╗Ñng (active, inactive, closed, v.v.).
 * - Admin cß║¡p nhß║¡t trß║íng th├íi trß╗▒c tiß║┐p m├á kh├┤ng cß║ºn duyß╗çt.
 * - Tß╗▒ ─æß╗Öng ─æ├ính dß║Ñu c├íc "Y├¬u cß║ºu thay ─æß╗òi trß║íng th├íi" (JobStatusChangeRequest) ─æang pending cß╗ºa tin n├áy th├ánh approved.
 * - Bß║»n th├┤ng b├ío (notification) cho ng╞░ß╗¥i tß║ío tin (HR) v├á c├íc HR kh├íc.
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
            reviewNote: `Thay ─æß╗òi trß║íng th├íi trß╗▒c tiß║┐p sang ${status} bß╗ƒi quß║ún trß╗ï vi├¬n.`
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
 * API Endpoint: Lß║Ñy chi tiß║┐t th├┤ng tin cß╗ºa mß╗Öt tin tuyß╗ân dß╗Ñng cß╗Ñ thß╗â (Admin view).
 * - Populate th├┤ng tin cß╗ºa ng╞░ß╗¥i ─æ─âng (HR).
 * - T├¡nh to├ín thß╗æng k├¬ l╞░ß╗úng hß╗ô s╞í nß╗Öp v├áo theo tß╗½ng trß║íng th├íi ─æß╗â l├ám biß╗âu ─æß╗ô/b├ío c├ío.
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
 * API Endpoint: Cß║¡p nhß║¡t trß║íng th├íi h├áng loß║ít cho nhiß╗üu tin tuyß╗ân dß╗Ñng c├╣ng l├║c (Bulk Update).
 * - T╞░╞íng tß╗▒ nh╞░ updateJobStatus nh╞░ng ├íp dß╗Ñng cho nhiß╗üu jobIds.
 * - Tß╗▒ ─æß╗Öng duyß╗çt c├íc y├¬u cß║ºu pending cß╗ºa c├íc job n├áy.
 * - Gß╗¡i mß╗Öt th├┤ng b├ío tß╗òng hß╗úp duy nhß║Ñt cho to├án bß╗Ö nh├│m HR ─æß╗â tr├ính spam th├┤ng b├ío.
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
            reviewNote: `Thay ─æß╗òi trß║íng th├íi h├áng loß║ít sang ${status} bß╗ƒi quß║ún trß╗ï vi├¬n.`
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
      const adminName = adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Quß║ún trß╗ï vi├¬n' : 'Quß║ún trß╗ï vi├¬n';
      await createAndEmit({
        toUserId: req.user.id,
        toRole: 'admin',
        type: 'job',
        title: '─É├ú cß║¡p nhß║¡t trß║íng th├íi h├áng loß║ít',
        message: `Bß║ín ─æ├ú ─æß╗òi ${n} tin sang ${sl}.`,
        actionUrl: '/admin/jobs',
        priority: 'low',
        createdBy: req.user.id
      });
      // Single-tenant: broadcast by role (no company scoping)
      await broadcastToRole('hr', {
        type: 'job',
        title: 'Admin cß║¡p nhß║¡t trß║íng th├íi h├áng loß║ít',
        message: `${adminName} ─æ├ú ─æß╗òi ${n} tin tuyß╗ân dß╗Ñng sang ${sl}.`,
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
