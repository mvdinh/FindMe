const mongoose = require('mongoose');
const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
const User = require('../../global/models/User');
function getLastMonths(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    out.unshift(`${year}-${month}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}
exports.getOverview = async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 24);
    const monthKeys = getLastMonths(months);
    const monthKeySet = new Set(monthKeys);
    const jobsFilter = {};
    const usersFilter = {};
    const jobs = await Job.find(jobsFilter).select('_id createdAt status').lean();
    const jobIds = jobs.map(j => j._id);
    const [applicationsAgg, usersAgg] = await Promise.all([Application.aggregate([{
      $match: {
        job: {
          $in: jobIds
        }
      }
    }, {
      $project: {
        job: 1,
        applicant: 1,
        status: 1,
        month: {
          $dateToString: {
            format: '%Y-%m',
            date: '$createdAt'
          }
        }
      }
    }, {
      $group: {
        _id: {
          month: '$month'
        },
        applications: {
          $sum: 1
        },
        interviewScheduled: {
          $sum: {
            $cond: [{
              $in: ['$status', ['interview_scheduled', 'interview_confirmed']]
            }, 1, 0]
          }
        },
        interviewPassed: {
          $sum: {
            $cond: [{
              $eq: ['$status', 'interview_passed']
            }, 1, 0]
          }
        },
        selected: {
          $sum: {
            $cond: [{
              $in: ['$status', ['interview_scheduled', 'interview_confirmed', 'interview_passed', 'offer_extended', 'offer_accepted']]
            }, 1, 0]
          }
        }
      }
    }]), User.aggregate([{
      $match: usersFilter
    }, {
      $group: {
        _id: '$role',
        count: {
          $sum: 1
        }
      }
    }])]);
    const roleCounts = usersAgg.reduce((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});
    const distinctApplicants = await Application.distinct('applicant', {
      job: {
        $in: jobIds
      }
    });
    const selectedCandidates = await Application.countDocuments({
      job: {
        $in: jobIds
      },
      status: 'offer_accepted'
    });
    const pendingStatuses = ['submitted', 'under_review', 'interview_scheduled', 'interview_confirmed', 'interview_passed', 'offer_extended'];
    const pendingApplications = await Application.countDocuments({
      job: {
        $in: jobIds
      },
      status: {
        $in: pendingStatuses
      }
    });
    const trendMap = monthKeys.map(m => ({
      month: m,
      applications: 0,
      interviewScheduled: 0,
      hired: 0,
      selected: 0
    }));
    const indexByMonth = trendMap.reduce((acc, obj, idx) => {
      acc[obj.month] = idx;
      return acc;
    }, {});
    applicationsAgg.forEach(r => {
      const m = r._id.month;
      if (monthKeySet.has(m)) {
        const idx = indexByMonth[m];
        trendMap[idx].applications = r.applications;
        trendMap[idx].interviewScheduled = r.interviewScheduled || 0;
        trendMap[idx].interviewPassed = r.interviewPassed || 0;
        trendMap[idx].selected = r.selected;
      }
    });
    const [recentJobs, recentAppStatus, recentNewUsers] = await Promise.all([Job.find(jobsFilter).sort({
      createdAt: -1
    }).limit(5).select('title createdAt').lean(), Application.find({
      job: {
        $in: jobIds
      }
    }).sort({
      updatedAt: -1
    }).limit(5).select('status createdAt updatedAt').lean(), User.find({
      role: 'hr'
    }).sort({
      createdAt: -1
    }).limit(5).select('firstName lastName role createdAt').lean()]);
    const statusLabels = { submitted: 'Đã nộp', under_review: 'Đang xem xét', shortlisted: 'Đang xem xét', rejected: 'Từ chối', interview_passed: 'Đạt phỏng vấn', offer_extended: 'Đã gửi offer', offer_accepted: 'Đã chấp nhận', offer_declined: 'Từ chối offer', interview_scheduled: 'Đã lên lịch', interview_confirmed: 'Đã xác nhận lịch PV' };
    const recentActivity = [...recentJobs.map(j => ({
      type: 'job_posted',
      message: `Đã đăng việc làm: "${j.title}"`,
      time: j.createdAt
    })), ...recentAppStatus.map(a => ({
      type: 'application_update',
      message: `Trạng thái đơn: ${statusLabels[a.status] || a.status}`,
      time: a.updatedAt || a.createdAt
    })), ...recentNewUsers.map(u => ({
      type: 'hr_added',
      message: `HR mới: ${u.firstName} ${u.lastName}`.trim(),
      time: u.createdAt
    }))].sort((a, b) => b.time - a.time).slice(0, 12);
    const interviewScheduledCandidates = await Application.countDocuments({
      job: {
        $in: jobIds
      },
      status: {
        $in: ['interview_scheduled', 'interview_confirmed']
      }
    });
    const interviewPassedCandidates = await Application.countDocuments({
      job: {
        $in: jobIds
      },
      status: 'interview_passed'
    });
    res.json({
      stats: {
        totalJobs: jobs.length,
        totalCandidates: distinctApplicants.length,
        totalHRs: roleCounts.hr || 0,
        selectedCandidates,
        interviewScheduledCandidates,
        interviewPassedCandidates,
        pendingApplications
      },
      trend: trendMap,
      recentActivity: recentActivity.map(r => ({
        type: r.type,
        message: r.message,
        time: r.time
      }))
    });
  } catch (error) {
    console.error('Admin dashboard overview error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard overview',
      details: error.message
    });
  }
};