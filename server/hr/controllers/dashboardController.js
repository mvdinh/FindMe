const Job = require('../../global/models/Job');
const Application = require('../../global/models/Application');
const User = require('../../global/models/User');
const mongoose = require('mongoose');
exports.getRecentJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      postedBy: req.user.id
    }).sort({
      createdAt: -1
    }).limit(8).populate('postedBy', 'firstName lastName').lean();
    const jobIds = jobs.map(j => j._id);
    const counts = await Application.aggregate([{
      $match: {
        job: {
          $in: jobIds
        }
      }
    }, {
      $group: {
        _id: '$job',
        count: {
          $sum: 1
        }
      }
    }]);
    const countMap = counts.reduce((acc, c) => {
      acc[c._id.toString()] = c.count;
      return acc;
    }, {});
    const formatted = jobs.map(j => ({
      id: j._id,
      title: j.title,
      department: j.department,
      status: j.status.charAt(0).toUpperCase() + j.status.slice(1),
      applicants: countMap[j._id.toString()] || 0,
      postedDate: j.publishedAt || (j.status === 'active' ? j.updatedAt : j.createdAt),
      createdBy: j.postedBy?._id.toString() === req.user.id ? 'me' : 'other'
    }));
    res.json({
      success: true,
      recentJobs: formatted
    });
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent jobs',
      details: error.message
    });
  }
};
exports.getRecentApplications = async (req, res) => {
  try {
    const myJobIds = await Job.find({
      postedBy: req.user.id
    }).distinct('_id');
    const apps = await Application.find({
      job: {
        $in: myJobIds
      }
    }).populate('applicant', 'firstName lastName').populate('job', 'title requiredSkills preferredSkills experienceLevel qualification').sort({
      createdAt: -1
    }).limit(5).lean();
    const calculateJobMatchingScore = (app, job) => {
      if (!job) return 5.0;
      let totalScore = 0;
      let maxScore = 0;
      const skillsWeight = 4;
      const candidateSkills = app.aiAnalysis?.extractedInfo?.skills || app.parsedResume?.skills || app.skills || [];
      const requiredSkills = job.requiredSkills || [];
      const preferredSkills = job.preferredSkills || [];
      if (requiredSkills.length > 0 || preferredSkills.length > 0) {
        const allJobSkills = [...requiredSkills, ...preferredSkills];
        const matchingSkills = candidateSkills.filter(skill => allJobSkills.some(jobSkill => jobSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill.toLowerCase())));
        const skillsScore = allJobSkills.length > 0 ? matchingSkills.length / allJobSkills.length * 10 : 5;
        totalScore += skillsScore * skillsWeight;
        maxScore += 10 * skillsWeight;
      }
      const expWeight = 3.5;
      const candidateExp = app.experience || 0;
      const requiredExpLevel = job.experienceLevel || 'entry';
      let expScore = 5;
      if (requiredExpLevel === 'entry' && candidateExp >= 0) expScore = 8;else if (requiredExpLevel === 'mid' && candidateExp >= 2) expScore = 8;else if (requiredExpLevel === 'senior' && candidateExp >= 4) expScore = 9;else if (requiredExpLevel === 'lead' && candidateExp >= 6) expScore = 9;
      totalScore += expScore * expWeight;
      maxScore += 10 * expWeight;
      const eduWeight = 2.5;
      const candidateEducation = app.aiAnalysis?.extractedInfo?.education || app.parsedResume?.education || [];
      const requiredQualification = job.qualification || '';
      let eduScore = 5;
      if (candidateEducation.length > 0) {
        const hasRelevantEducation = candidateEducation.some(edu => requiredQualification.toLowerCase().includes(edu.degree?.toLowerCase() || '') || edu.degree?.toLowerCase().includes(requiredQualification.toLowerCase()) || requiredQualification.toLowerCase().includes('bachelor') && edu.degree?.toLowerCase().includes('bachelor') || requiredQualification.toLowerCase().includes('master') && edu.degree?.toLowerCase().includes('master'));
        eduScore = hasRelevantEducation ? 8 : 6;
      }
      totalScore += eduScore * eduWeight;
      maxScore += 10 * eduWeight;
      const finalScore = maxScore > 0 ? totalScore / maxScore * 10 : 5;
      return Math.round(finalScore * 10) / 10;
    };
    const formatted = apps.map(a => {
      const resumeScore = a.aiAnalysis?.overallScore || calculateJobMatchingScore(a, a.job);
      return {
        id: a._id,
        candidate: `${a.applicant.firstName} ${a.applicant.lastName}`,
        job: a.job?.title || 'Unknown',
        appliedDate: a.createdAt,
        resumeScore: resumeScore,
        status: a.status
      };
    });
    res.json({
      success: true,
      recentApplications: formatted
    });
  } catch (error) {
    console.error('Error fetching recent applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent applications',
      details: error.message
    });
  }
};
exports.getUpcomingInterviews = async (req, res) => {
  return res.json({
    success: true,
    upcomingInterviews: []
  });
};
exports.getStats = async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments({
      postedBy: req.user.id
    });
    const hrJobs = await Job.find({
      postedBy: req.user.id
    }).select('_id');
    const hrJobIds = hrJobs.map(job => job._id);
    const totalApplicants = await Application.countDocuments({
      job: {
        $in: hrJobIds
      }
    });
    const candidatesInterviewScheduled = await Application.countDocuments({
      job: {
        $in: hrJobIds
      },
      $or: [
        {
          status: {
            $in: ['interview_scheduled', 'interview_confirmed', 'interview_passed', 'offer_extended', 'offer_accepted', 'offer_declined']
          }
        },
        {
          'interviewInvite.scheduledAt': {
            $exists: true,
            $ne: null
          }
        }
      ]
    });
    const candidatesInterviewPassed = await Application.countDocuments({
      job: {
        $in: hrJobIds
      },
      status: {
        $in: ['interview_passed', 'offer_extended', 'offer_accepted']
      }
    });
    const applicationsByStatus = await Application.aggregate([{
      $match: {
        job: {
          $in: hrJobIds
        }
      }
    }, {
      $group: {
        _id: '$status',
        count: {
          $sum: 1
        }
      }
    }]);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentApplications = await Application.countDocuments({
      job: {
        $in: hrJobIds
      },
      createdAt: {
        $gte: sevenDaysAgo
      }
    });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const jobsPostedLastMonth = await Job.countDocuments({
      postedBy: req.user.id,
      createdAt: {
        $gte: thirtyDaysAgo
      }
    });
    res.json({
      success: true,
      stats: {
        totalJobs,
        totalApplicants,
        candidatesInterviewScheduled,
        candidatesInterviewPassed,
        interviewsScheduled: 0,
        recentApplications,
        jobsPostedLastMonth,
        applicationsByStatus: applicationsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching HR dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
};
exports.getRecentActivities = async (req, res) => {
  try {
    const hrJobs = await Job.find({
      postedBy: req.user.id
    }).select('_id title');
    const hrJobIds = hrJobs.map(job => job._id);
    const hrJobsMap = hrJobs.reduce((acc, job) => {
      acc[job._id] = job.title;
      return acc;
    }, {});
    const recentApplications = await Application.find({
      job: {
        $in: hrJobIds
      }
    }).populate('applicant', 'firstName lastName email').populate('job', 'title').sort({
      createdAt: -1
    }).limit(10);
    const activities = [];
    recentApplications.forEach(app => {
      activities.push({
        type: 'application',
        title: `New application received`,
        description: `${app.applicant.firstName} ${app.applicant.lastName} applied for ${app.job.title}`,
        timestamp: app.createdAt,
        data: {
          applicantName: `${app.applicant.firstName} ${app.applicant.lastName}`,
          jobTitle: app.job.title,
          status: app.status
        }
      });
    });
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({
      success: true,
      activities: activities.slice(0, 15)
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities',
      details: error.message
    });
  }
};
exports.getApplicationTrends = async (req, res) => {
  try {
    const {
      period = '30'
    } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const hrJobs = await Job.find({
      postedBy: req.user.id
    }).select('_id');
    const hrJobIds = hrJobs.map(job => job._id);
    const trends = await Application.aggregate([{
      $match: {
        job: {
          $in: hrJobIds
        },
        createdAt: {
          $gte: startDate
        }
      }
    }, {
      $group: {
        _id: {
          year: {
            $year: '$createdAt'
          },
          month: {
            $month: '$createdAt'
          },
          day: {
            $dayOfMonth: '$createdAt'
          }
        },
        applications: {
          $sum: 1
        }
      }
    }, {
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
        '_id.day': 1
      }
    }]);
    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Error fetching application trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application trends',
      details: error.message
    });
  }
};
exports.getTopJobs = async (req, res) => {
  try {
    const topJobs = await Job.aggregate([{
      $match: {
        postedBy: mongoose.Types.ObjectId(req.user.id)
      }
    }, {
      $lookup: {
        from: 'applications',
        localField: '_id',
        foreignField: 'job',
        as: 'applications'
      }
    }, {
      $addFields: {
        applicationCount: {
          $size: '$applications'
        },
        interviewScheduledCount: {
          $size: {
            $filter: {
              input: '$applications',
              cond: {
                $eq: ['$$this.status', 'interview_scheduled']
              }
            }
          }
        }
      }
    }, {
      $project: {
        title: 1,
        location: 1,
        jobType: 1,
        status: 1,
        createdAt: 1,
        applicationCount: 1,
        interviewScheduledCount: 1
      }
    }, {
      $sort: {
        applicationCount: -1
      }
    }, {
      $limit: 10
    }]);
    res.json({
      success: true,
      topJobs
    });
  } catch (error) {
    console.error('Error fetching top jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top jobs',
      details: error.message
    });
  }
};