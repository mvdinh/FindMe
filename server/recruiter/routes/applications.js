const express = require('express');
const {
  query,
  body,
  param,
  validationResult
} = require('express-validator');
const Application = require('../../global/models/Application');
const Job = require('../../global/models/Job');
const User = require('../../global/models/User');
const Interview = require('../../global/models/Interview');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const mongoose = require('mongoose');
const {
  createAndEmit
} = require('../../global/services/notificationService');
const {
  sendJobOfferEmail,
  sendRejectionEmail
} = require('../../global/services/emailService');
const {
  INTERVIEW_PASSED
} = require('../../global/constants/applicationStatuses');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildJobAddressLine(job) {
  if (!job) return '';
  const loc = (job.location || '').trim();
  const lt = job.locationType;
  const typeLabel = lt === 'remote' ? 'Làm việc từ xa' : lt === 'hybrid' ? 'Kết hợp onsite/remote' : lt === 'onsite' ? 'Làm việc tại văn phòng' : '';
  const parts = [loc, typeLabel].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}

const geminiService = require('../../global/services/geminiService');
const router = express.Router();

async function fetchBufferFromUrl(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

router.get('/', auth, authorize('recruiter', 'admin'), [query('page').optional().isInt({
  min: 1
}).withMessage('Page must be a positive integer'), query('limit').optional().isInt({
  min: 1,
  max: 100
}).withMessage('Limit must be between 1 and 100'), query('status').optional().isIn(['submitted', 'under_review', 'rejected', 'interview_passed', 'offer_extended', 'offer_accepted', 'offer_declined', 'interview_scheduled', 'interview_confirmed']).withMessage('Invalid status'), query('job').optional().isMongoId().withMessage('Invalid job ID'), query('search').optional().isLength({
  min: 1,
  max: 200
}).withMessage('Search term must be between 1 and 200 characters'), query('sortBy').optional().isIn(['appliedDate', 'resumeScore', 'name', 'createdAt', 'aiScore', 'status', 'applicantName']).withMessage('Invalid sort field'), query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      page = 1,
      limit = 20,
      status,
      job: jobFilter,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    const userId = req.user.id;
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const companyJobs = await Job.find({}).select('_id title department requiredSkills preferredSkills experienceLevel qualification');
    const jobIds = companyJobs.map(job => job._id);
    const filter = requesterRole === 'admin' ? {} : {
      job: {
        $in: jobIds
      }
    };
    if (status && status !== 'all') filter.status = status;
    if (jobFilter && jobFilter !== 'all') {
      if (requesterRole === 'admin' || jobIds.some(id => id.toString() === jobFilter)) {
        filter.job = new mongoose.Types.ObjectId(jobFilter);
      }
    }
    const skip = (page - 1) * limit;
    let pipeline = [{
      $match: filter
    }];
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'applicant',
        foreignField: '_id',
        as: 'applicantDetails'
      }
    }, {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'jobDetails'
      }
    }, {
      $unwind: '$applicantDetails'
    }, {
      $unwind: '$jobDetails'
    }, {
      $lookup: {
        from: 'resumes',
        localField: 'profileResumeId',
        foreignField: '_id',
        as: 'profileResumeData'
      }
    });
    if (search) {
      pipeline.push({
        $match: {
          $or: [{
            'applicantDetails.firstName': {
              $regex: search,
              $options: 'i'
            }
          }, {
            'applicantDetails.lastName': {
              $regex: search,
              $options: 'i'
            }
          }, {
            'applicantDetails.email': {
              $regex: search,
              $options: 'i'
            }
          }, {
            'jobDetails.title': {
              $regex: search,
              $options: 'i'
            }
          }, {
            'jobDetails.department': {
              $regex: search,
              $options: 'i'
            }
          }, {
            'parsedResume.skills': {
              $regex: search,
              $options: 'i'
            }
          }, {
            $expr: {
              $regexMatch: {
                input: {
                  $toString: '$_id'
                },
                regex: escapeRegex(search),
                options: 'i'
              }
            }
          }, {
            $expr: {
              $regexMatch: {
                input: {
                  $toString: '$jobDetails._id'
                },
                regex: escapeRegex(search),
                options: 'i'
              }
            }
          }]
        }
      });
    }
    let sortStage = {};
    switch (sortBy) {
      case 'resumeScore':
      case 'aiScore':
        sortStage = {
          'aiAnalysis.overallScore': sortOrder === 'asc' ? 1 : -1
        };
        break;
      case 'name':
      case 'applicantName':
        sortStage = {
          'applicantDetails.firstName': sortOrder === 'asc' ? 1 : -1
        };
        break;
      case 'appliedDate':
        sortStage = {
          createdAt: sortOrder === 'asc' ? 1 : -1
        };
        break;
      case 'status':
        sortStage = {
          status: sortOrder === 'asc' ? 1 : -1
        };
        break;
      default:
        sortStage = {
          createdAt: sortOrder === 'asc' ? 1 : -1
        };
    }
    pipeline.push({
      $sort: sortStage
    });
    pipeline.push({
      $skip: skip
    }, {
      $limit: parseInt(limit)
    });
    pipeline.push({
      $project: {
        _id: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        resumeUrl: 1,
        coverLetter: 1,
        aiAnalysis: 1,
        parsedResume: 1,
        timeline: 1,
        notes: 1,
        personalInfo: 1,
        skills: 1,
        experience: 1,
        useProfileResume: 1,
        profileResumeId: 1,
        'customResume.fileName': 1,
        'customResume.fileUrl': 1,
        'customResume.uploadDate': 1,
        'applicantDetails._id': 1,
        'applicantDetails.firstName': 1,
        'applicantDetails.lastName': 1,
        'applicantDetails.email': 1,
        'applicantDetails.profile.experience': 1,
        'applicantDetails.profile.skills': 1,
        'jobDetails._id': 1,
        'jobDetails.title': 1,
        'jobDetails.department': 1,
        'jobDetails.employmentType': 1,
        'interviewInvite.scheduledAt': 1,
        'interviewInvite.jobAddressLine': 1,
        'interviewInvite.venueOrLink': 1,
        'interviewInvite.recruiterNote': 1,
        'interviewInvite.confirmedAt': 1
      }
    });
    const applications = await Application.aggregate(pipeline);
    const totalApplications = await Application.countDocuments(filter);
    const totalPages = Math.ceil(totalApplications / limit);
    const calculateJobMatchingScore = (app, jobsData) => {
      const job = jobsData.find(j => j._id.toString() === app.jobDetails._id.toString());
      if (!job) return 5.0;
      let totalScore = 0;
      let maxScore = 0;
      const skillsWeight = 4;
      const candidateSkills = app.aiAnalysis?.extractedInfo?.skills || app.parsedResume?.skills || [];
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
      const candidateExp = app.applicantDetails?.profile?.experience?.length || 0;
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
    const formattedApplications = applications.map(app => {
      const aiOverall = typeof app.aiAnalysis?.overallScore === 'number' ? app.aiAnalysis.overallScore : null;
      const resumeScore = aiOverall !== null ? Math.round(aiOverall / 10 * 10) / 10 : calculateJobMatchingScore(app, companyJobs);
      return {
        id: app._id,
        candidate: {
          name: `${app.applicantDetails.lastName} ${app.applicantDetails.firstName}`,
          email: app.applicantDetails.email,
          phone: app.personalInfo?.phone || 'Not provided'
        },
        job: {
          id: app.jobDetails._id,
          title: app.jobDetails.title,
          department: app.jobDetails.department
        },
        interviewInvite: {
          scheduledAt: app.interviewInvite?.scheduledAt ?? null,
          confirmedAt: app.interviewInvite?.confirmedAt ?? null
        },
        appliedDate: app.createdAt,
        resumeScore,
        status: app.status,
        experience: app.experience === 'fresher' ? 'Fresher' : app.experience || 'Not specified',
        skills: app.skills || [],
        coverLetter: typeof app.coverLetter === 'string' ? app.coverLetter : '',
        resumeUrl: app.resumeUrl || `/api/recruiter/applications/${app._id}/resume`,
        useProfileResume: app.useProfileResume,
        profileResumeId: app.profileResumeId,
        aiAnalysis: {
          skillsMatch: typeof app.aiAnalysis?.skillsMatch === 'number' ? app.aiAnalysis.skillsMatch : Math.round(resumeScore * 7.5),
          experienceMatch: typeof app.aiAnalysis?.experienceMatch === 'number' ? app.aiAnalysis.experienceMatch : Math.round(resumeScore * 7),
          overallFit: aiOverall !== null ? Math.round(aiOverall) : Math.round(resumeScore * 10),
          strengths: Array.isArray(app.aiAnalysis?.keyStrengths) ? app.aiAnalysis.keyStrengths : ['Skills assessment pending'],
          concerns: Array.isArray(app.aiAnalysis?.potentialConcerns) ? app.aiAnalysis.potentialConcerns : ['Detailed analysis pending']
        }
      };
    });
    res.json({
      success: true,
      data: formattedApplications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalApplications,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      filters: {
        applied: {
          job: jobFilter,
          status,
          search,
          sortBy,
          sortOrder
        }
      }
    });
  } catch (error) {
    console.error('Get recruiter applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/:id', [param('id').isMongoId().withMessage('Invalid application ID')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const recruiterJobs = await Job.find({
      postedBy: req.user?.id || new mongoose.Types.ObjectId()
    }).select('_id');
    const recruiterJobIds = recruiterJobs.map(job => job._id);
    const application = await Application.findOne({
      _id: req.params.id,
      job: {
        $in: recruiterJobIds
      }
    }).populate('applicant', 'firstName lastName email phone profilePicture profile').populate('job', 'title department location employmentType requirements responsibilities skills').lean();
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    const interviews = await Interview.find({
      application: application._id
    }).populate('interviewer', 'firstName lastName').sort({
      scheduledDate: -1
    }).lean();
    res.json({
      success: true,
      data: {
        ...application,
        interviews
      }
    });
  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/:id/status', auth, authorize('recruiter', 'admin'), [param('id').isMongoId().withMessage('Invalid application ID'), body('status').isIn(['submitted', 'under_review', 'rejected', 'interview_passed', 'offer_extended', 'offer_accepted', 'offer_declined', 'interview_scheduled']).withMessage('Invalid status'), body('notes').optional().isLength({
  max: 1000
}).withMessage('Notes must be less than 1000 characters'), body('interviewScheduledAt').optional().isISO8601().withMessage('interviewScheduledAt must be ISO 8601 date'), body('interviewVenue').optional().isLength({
  max: 500
}).withMessage('interviewVenue too long')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      status,
      notes,
      interviewScheduledAt,
      interviewVenue
    } = req.body;
    const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const userId = req.user.id;
    const user = await User.findById(userId);
    let application = null;
    if (requesterRole === 'admin') {
      application = await Application.findById(req.params.id);
    } else {
      const jobIds = await Job.find({}).distinct('_id');
      application = await Application.findOne({
        _id: req.params.id,
        job: {
          $in: jobIds
        }
      });
    }
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    const oldStatus = application.status;
    if (requesterRole === 'recruiter') {
      const recruiterOk = status === 'interview_scheduled' || status === INTERVIEW_PASSED && oldStatus === 'interview_confirmed' || status === 'rejected' && ['submitted', 'under_review', 'interview_scheduled', 'interview_confirmed'].includes(oldStatus);
      if (!recruiterOk) {
        return res.status(403).json({
          success: false,
          message: 'Nhà tuyển dụng không được phép cập nhật trạng thái này cho hồ sơ hiện tại.'
        });
      }
    }
    const notesRequired = status === 'interview_scheduled' || status === 'offer_accepted' || status === 'rejected' || status === INTERVIEW_PASSED && oldStatus === 'interview_confirmed';
    if (notesRequired && !normalizedNotes) {
      return res.status(400).json({
        success: false,
        message: `Vui lòng nhập lý do hoặc nội dung gửi ứng viên khi cập nhật trạng thái "${status}".`
      });
    }
    if (status === 'interview_scheduled') {
      const hasIncoming = !!interviewScheduledAt;
      const hasExisting = !!application.interviewInvite?.scheduledAt;
      if (!hasIncoming && !hasExisting) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn thời gian phỏng vấn khi mời phỏng vấn.'
        });
      }
    }
    if (oldStatus === 'interview_confirmed' && (status === INTERVIEW_PASSED || status === 'rejected')) {
      const inv = application.interviewInvite || {};
      if (!inv.confirmedAt) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu xác nhận lịch từ ứng viên.'
        });
      }
    }
    application.status = status;
    application.updatedAt = new Date();
    if (status === 'interview_scheduled') {
      const jobDoc = await Job.findById(application.job).select('title location locationType');
      const jobAddressLine = buildJobAddressLine(jobDoc);
      let scheduledAt = null;
      if (interviewScheduledAt) {
        const d = new Date(interviewScheduledAt);
        if (!isNaN(d.getTime())) scheduledAt = d;
      }
      const venue = typeof interviewVenue === 'string' ? interviewVenue.trim() : '';
      application.interviewInvite = application.interviewInvite || {};
      application.interviewInvite.jobAddressLine = jobAddressLine;
      application.interviewInvite.recruiterNote = normalizedNotes;
      application.interviewInvite.venueOrLink = venue;
      application.interviewInvite.scheduledAt = scheduledAt || application.interviewInvite.scheduledAt || undefined;
      application.interviewInvite.confirmedAt = undefined;
      application.markModified('interviewInvite');
    }
    application.timeline.push({
      status,
      date: new Date(),
      note: normalizedNotes || undefined,
      updatedBy: req.user?.id || new mongoose.Types.ObjectId()
    });
    if (normalizedNotes) {
      application.notes.push({
        text: normalizedNotes,
        author: req.user?.id || new mongoose.Types.ObjectId()
      });
    }
    await application.save();
    try {
      const applicant = await User.findById(application.applicant).select('firstName lastName email');
      const job = await Job.findById(application.job).select('title location locationType');
      if (applicant && job) {
        // Send email based on status change
        if (status === INTERVIEW_PASSED) {
          sendJobOfferEmail({
            to: applicant.email,
            candidateName: `${applicant.lastName} ${applicant.firstName}`,
            jobTitle: job.title,
            notes: normalizedNotes
          }).catch(err => {
            console.error('Error sending job offer email:', err.message);
          });
        } else if (status === 'rejected' && oldStatus === 'interview_confirmed') {
          sendRejectionEmail({
            to: applicant.email,
            candidateName: `${applicant.lastName} ${applicant.firstName}`,
            jobTitle: job.title,
            notes: normalizedNotes
          }).catch(err => {
            console.error('Error sending rejection email:', err.message);
          });
        }

        const passInterviewMsg = `Kết quả phỏng vấn vị trí ${job.title} đã được cập nhật.${normalizedNotes ? ` Nội dung từ nhà tuyển dụng: ${normalizedNotes}` : ''}`;
        const statusMessages = {
          submitted: `Đơn ứng tuyển vị trí ${job.title} đã được ghi nhận thành công.`,
          under_review: `Đơn ứng tuyển vị trí ${job.title} của bạn đang được xem xét.`,
          rejected: `Rất tiếc, đơn ứng tuyển vị trí ${job.title} chưa phù hợp ở thời điểm hiện tại.${normalizedNotes ? ` Lý do: ${normalizedNotes}` : ''}`,
          [INTERVIEW_PASSED]: passInterviewMsg,
          offer_extended: `Chúc mừng! Bạn đã nhận được đề nghị làm việc cho vị trí ${job.title}.`,
          offer_accepted: `Chúc mừng! Bạn đã được duyệt tuyển cho vị trí ${job.title}.${normalizedNotes ? ` Ghi chú: ${normalizedNotes}` : ''}`,
          offer_declined: `Hệ thống đã ghi nhận bạn từ chối đề nghị cho vị trí ${job.title}.`,
          interview_scheduled: `Chúc mừng! Bạn được mời phỏng vấn cho vị trí ${job.title}.${normalizedNotes ? ` Thông tin từ nhà tuyển dụng: ${normalizedNotes}` : ''} Vui lòng mở mục xác nhận lịch trên hệ thống để hoàn tất.`
        };
        const notifTitle = status === 'interview_scheduled' ? 'Thông báo phỏng vấn' : status === INTERVIEW_PASSED ? 'Kết quả phỏng vấn' : 'Cập nhật trạng thái đơn ứng tuyển';
        const actionUrl = status === 'interview_scheduled'
          ? `/applicant/confirm-interview?applicationId=${application._id}`
          : (status === 'rejected' ? `/applicant/applications?showFeedback=${application._id}` : '/applicant/applications');
        await createAndEmit({
          toUserId: application.applicant,
          toRole: 'applicant',
          type: 'application_status_changed',
          title: notifTitle,
          message: statusMessages[status] || `Trạng thái đơn ứng tuyển vị trí ${job.title} đã được cập nhật.`,
          actionUrl,
          entity: {
            kind: 'Application',
            id: application._id
          },
          priority: status === 'offer_extended' || status === 'interview_scheduled' ? 'high' : 'medium',
          metadata: {
            applicantName: `${applicant.lastName} ${applicant.firstName}`,
            jobTitle: job.title,
            oldStatus,
            newStatus: status
          },
          createdBy: req.user?.id
        });
      }
    } catch (notifError) {
      console.error('Failed to send status change notification:', notifError);
    }
    res.json({
      success: true,
      message: `Application status updated from ${oldStatus} to ${status}`,
      data: {
        id: application._id,
        status: application.status
      }
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/:id/notes', [param('id').isMongoId().withMessage('Invalid application ID'), body('content').notEmpty().withMessage('Note content is required').isLength({
  min: 1,
  max: 1000
}).withMessage('Note content must be between 1 and 1000 characters')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const recruiterJobs = await Job.find({
      postedBy: req.user?.id || new mongoose.Types.ObjectId()
    }).select('_id');
    const recruiterJobIds = recruiterJobs.map(job => job._id);
    const application = await Application.findOne({
      _id: req.params.id,
      job: {
        $in: recruiterJobIds
      }
    });
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    const newNote = {
      text: req.body.content,
      author: req.user?.id || new mongoose.Types.ObjectId()
    };
    application.notes.push(newNote);
    application.updatedAt = new Date();
    await application.save();
    res.json({
      success: true,
      message: 'Note added successfully',
      data: newNote
    });
  } catch (error) {
    console.error('Add application note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/bulk/export', [query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'), query('status').optional().isIn(['submitted', 'under_review', 'rejected', 'interview_passed', 'offer_extended', 'offer_accepted', 'offer_declined', 'interview_scheduled', 'interview_confirmed']).withMessage('Invalid status'), query('jobId').optional().isMongoId().withMessage('Invalid job ID'), query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'), query('endDate').optional().isISO8601().withMessage('End date must be a valid date')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      format = 'json',
      status,
      jobId,
      startDate,
      endDate
    } = req.query;
    const recruiterJobs = await Job.find({
      postedBy: req.user?.id || new mongoose.Types.ObjectId()
    }).select('_id');
    const recruiterJobIds = recruiterJobs.map(job => job._id);
    let filter = {
      job: {
        $in: recruiterJobIds
      }
    };
    if (status) filter.status = status;
    if (jobId) filter.job = jobId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const applications = await Application.find(filter).populate('applicant', 'firstName lastName email phone').populate('job', 'title department employmentType').sort({
      createdAt: -1
    }).lean();
    const exportData = applications.map(app => ({
      applicationId: app._id,
      applicantName: `${app.applicant.lastName} ${app.applicant.firstName}`,
      applicantEmail: app.applicant.email,
      applicantPhone: app.applicant.phone,
      jobTitle: app.job.title,
      department: app.job.department,
      employmentType: app.job.employmentType,
      status: app.status,
      aiScore: app.aiAnalysis?.overallScore,
      appliedDate: app.createdAt,
      lastUpdated: app.updatedAt,
      skills: app.parsedResume?.skills?.join(', '),
      experience: app.parsedResume?.experience?.length || 0,
      education: app.parsedResume?.education?.length || 0
    }));
    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [headers.join(','), ...exportData.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=applications-export.csv');
      return res.send(csvContent);
    }
    res.json({
      success: true,
      data: exportData,
      summary: {
        totalApplications: exportData.length,
        filters: {
          status,
          jobId,
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Export applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.patch('/bulk/status', [body('applicationIds').isArray({
  min: 1
}).withMessage('Application IDs must be a non-empty array'), body('applicationIds.*').isMongoId().withMessage('Each application ID must be valid'), body('status').isIn(['under_review', 'rejected', 'interview_scheduled']).withMessage('Invalid bulk status operation'), body('notes').optional().isLength({
  max: 500
}).withMessage('Notes must be less than 500 characters')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      applicationIds,
      status,
      notes
    } = req.body;
    const recruiterJobs = await Job.find({
      postedBy: req.user?.id || new mongoose.Types.ObjectId()
    }).select('_id');
    const recruiterJobIds = recruiterJobs.map(job => job._id);
    const applications = await Application.find({
      _id: {
        $in: applicationIds
      },
      job: {
        $in: recruiterJobIds
      }
    });
    if (applications.length !== applicationIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some applications were not found or do not belong to you'
      });
    }
    const updatePromises = applications.map(async app => {
      app.status = status;
      app.updatedAt = new Date();
      app.timeline.push({
        status,
        date: new Date(),
        note: notes || `Bulk status update to ${status}`,
        updatedBy: req.user?.id || new mongoose.Types.ObjectId()
      });
      if (notes) {
        app.notes.push({
          text: notes,
          author: req.user?.id || new mongoose.Types.ObjectId()
        });
      }
      return app.save();
    });
    await Promise.all(updatePromises);
    res.json({
      success: true,
      message: `Successfully updated ${applications.length} applications to ${status}`,
      data: {
        updatedCount: applications.length,
        status
      }
    });
  } catch (error) {
    console.error('Bulk update applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/:id/resume', auth, authorize('recruiter', 'admin'), [param('id').isMongoId().withMessage('Invalid application ID')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      id
    } = req.params;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const application = await Application.findById(id).populate({
      path: 'job',
      select: 'title postedBy'
    }).populate({
      path: 'applicant',
      select: 'firstName lastName email profile'
    }).populate({
      path: 'profileResumeId',
      model: 'Resume',
      select: 'fileName originalName fileSize mimeType uploadDate'
    });
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    if (!application.job) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    if (application.useProfileResume) {
      if (application.profileResumeId) {
        const Resume = require('../../global/models/Resume');
        const resume = await Resume.findById(application.profileResumeId);
        if (!resume) {
          return res.status(404).json({
            success: false,
            message: 'Profile resume not found'
          });
        }
        let fileBuffer = null;
        if (resume.fileData) {
          fileBuffer = Buffer.from(resume.fileData, 'base64');
        } else if (resume.fileUrl) {
          fileBuffer = await fetchBufferFromUrl(resume.fileUrl);
        }
        if (!fileBuffer) {
          return res.status(404).json({
            success: false,
            message: 'Resume file not found'
          });
        }
        const contentType = resume.mimeType || 'application/pdf';
        const isViewableInBrowser = contentType.includes('pdf') || contentType.includes('image/');
        const safeName = String(resume.originalName || resume.fileName || 'cv.pdf').replace(/["\r\n]/g, '');
        res.set({
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length,
          'Content-Disposition': `${isViewableInBrowser ? 'inline' : 'attachment'}; filename="${safeName}"`,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        return res.send(fileBuffer);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Profile resume not found for this application'
        });
      }
    } else {
      if (application.customResume) {
        if (application.customResume.fileData) {
          const fileBuffer = Buffer.isBuffer(application.customResume.fileData) ? application.customResume.fileData : Buffer.from(application.customResume.fileData, 'base64');
          const contentType = application.customResume.fileMimeType || 'application/pdf';
          const isViewableInBrowser = contentType.includes('pdf') || contentType.includes('image/');
          const safeName = String(application.customResume.fileName || 'cv.pdf').replace(/["\r\n]/g, '');
          res.set({
            'Content-Type': contentType,
            'Content-Length': fileBuffer.length,
            'Content-Disposition': `${isViewableInBrowser ? 'inline' : 'attachment'}; filename="${safeName}"`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          });
          return res.send(fileBuffer);
        } else if (application.customResume.fileUrl) {
          const fileBuffer = await fetchBufferFromUrl(application.customResume.fileUrl);
          if (!fileBuffer) {
            return res.status(404).json({ success: false, message: 'Resume file not found' });
          }
          const contentType = application.customResume.fileMimeType || 'application/pdf';
          const isViewableInBrowser = contentType.includes('pdf') || contentType.includes('image/');
          const safeName = String(application.customResume.fileName || 'cv.pdf').replace(/["\r\n]/g, '');
          res.set({
            'Content-Type': contentType,
            'Content-Length': fileBuffer.length,
            'Content-Disposition': `${isViewableInBrowser ? 'inline' : 'attachment'}; filename="${safeName}"`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          });
          return res.send(fileBuffer);
        }
      }
      return res.status(404).json({
        success: false,
        message: 'Custom resume not found for this application'
      });
    }
  } catch (error) {
    console.error('Get application resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching resume'
    });
  }
});

const aiAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => `${req.user?.id || 'anon'}:${req.params?.id || 'app'}`,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'AI analysis rate-limited. Please wait ~1 minute.'
    });
  }
});

router.post('/:id/ai-feedback-analysis', auth, authorize('recruiter', 'admin'), aiAnalysisLimiter, [param('id').isMongoId().withMessage('Invalid application ID')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const {
      id
    } = req.params;
    const user = await User.findById(req.user.id).select('_id');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const jobIds = await Job.find({}).distinct('_id');
    const application = await Application.findOne({
      _id: id,
      job: {
        $in: jobIds
      }
    }).populate('job', 'title description requiredSkills preferredSkills').lean();
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    const interviews = await Interview.find({
      application: id,
      $or: [{
        'feedback.submittedAt': {
          $ne: null
        }
      }, {
        status: 'completed'
      }]
    }).sort({
      scheduledDate: 1
    }).lean();
    const parts = [];
    if (!interviews.length) {
      parts.push('No interview feedback available.');
    } else {
      interviews.forEach((iv, idx) => {
        const fb = iv.feedback || {};
        const seg = [`Interview #${idx + 1} (${iv.type || 'n/a'} round ${iv.round || 1})`, fb.overallRating ? `Overall rating: ${fb.overallRating}/5` : null, fb.technicalSkills ? `Technical: ${fb.technicalSkills}/5` : null, fb.communicationSkills ? `Communication: ${fb.communicationSkills}/5` : null, fb.problemSolving ? `Problem Solving: ${fb.problemSolving}/5` : null, fb.culturalFit ? `Cultural Fit: ${fb.culturalFit}/5` : null, Array.isArray(fb.strengths) && fb.strengths.length ? `Strengths: ${fb.strengths.join('; ')}` : null, Array.isArray(fb.weaknesses) && fb.weaknesses.length ? `Concerns: ${fb.weaknesses.join('; ')}` : null, fb.recommendation ? `Recommendation: ${fb.recommendation}` : null, fb.additionalNotes ? `Notes: ${fb.additionalNotes}` : null].filter(Boolean).join('\n');
        parts.push(seg);
      });
    }
    if (Array.isArray(application.notes) && application.notes.length) {
      const noteTexts = application.notes.map(n => n.text || n.content).filter(Boolean);
      if (noteTexts.length) {
        parts.push('Recruiter Notes:');
        parts.push(noteTexts.join('\n'));
      }
    }
    const aggregated = parts.join('\n\n');
    const contentHash = crypto.createHash('sha256').update(aggregated).digest('hex');
    const aiResult = await geminiService.analyzeInterviewFeedback({
      feedbackText: aggregated,
      candidateName: application.personalInfo?.firstName ? `${application.personalInfo.lastName || ''} ${application.personalInfo.firstName}`.trim() : undefined,
      jobTitle: application.job?.title,
      jobDescription: application.job?.description,
      applicationId: application._id?.toString?.() || id,
      jobId: application.job?._id?.toString?.(),
      skills: Array.from(new Set([...(Array.isArray(application.skills) ? application.skills : []), ...(application.aiAnalysis?.extractedInfo?.skills || []), ...(application.job?.requiredSkills || [])])),
      status: application.status
    });
    const normalized = {
      sentiment: aiResult.sentiment || 'neutral',
      confidence: typeof aiResult.confidence === 'number' ? Math.max(0, Math.min(1, aiResult.confidence)) : 0.5,
      summary: aiResult.summary || 'No summary produced',
      strengths: Array.isArray(aiResult.strengths) ? aiResult.strengths : [],
      concerns: Array.isArray(aiResult.concerns) ? aiResult.concerns : [],
      flags: Array.isArray(aiResult.flags) ? aiResult.flags : [],
      suggestedDecisionNote: aiResult.suggestedDecisionNote || '',
      generatedAt: new Date(),
      interviewsConsidered: interviews.map(iv => iv._id),
      contentHash,
      model: geminiService.modelId
    };
    await Application.findByIdAndUpdate(id, {
      $set: {
        aiFeedback: normalized
      }
    });
    return res.json({
      success: true,
      cached: false,
      data: normalized
    });
  } catch (error) {
    console.error('AI feedback analysis error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze interview feedback'
    });
  }
});

module.exports = router;
