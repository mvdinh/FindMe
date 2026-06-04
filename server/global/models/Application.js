const mongoose = require('mongoose');
const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required']
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant ID is required']
  },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interview_confirmed', 'interview_passed', 'offer_extended', 'offer_accepted', 'offer_declined', 'rejected', 'withdrawn'],
    default: 'submitted'
  },
  interviewInvite: {
    scheduledAt: Date,
    jobAddressLine: {
      type: String,
      default: ''
    },
    venueOrLink: {
      type: String,
      default: ''
    },
    hrNote: {
      type: String,
      default: ''
    },
    confirmedAt: Date
  },
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    }
  },
  useProfileResume: {
    type: Boolean,
    default: true
  },
  profileResumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume'
  },
  customResume: {
    fileName: String,
    fileUrl: String,
    fileData: Buffer,
    fileMimeType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    fileSize: Number
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: String,
    enum: ['fresher', 'mid-level', 'senior', 'expert']
  },
  expectedSalary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  coverLetter: {
    type: String,
    maxlength: [2000, 'Cover letter cannot be more than 2000 characters']
  },
  aiAnalysis: {
    resumeScore: {
      type: Number,
      min: 0,
      max: 100
    },
    skillsMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    experienceMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100
    },
    keyStrengths: [String],
    potentialConcerns: [String],
    recommendedQuestions: [String],
    analysisDate: {
      type: Date,
      default: Date.now
    },
    extractedInfo: {
      personalInfo: {
        name: String,
        title: String
      },
      contactInfo: {
        email: String,
        phone: String,
        linkedin: String,
        github: String
      },
      skills: [String],
      education: [{
        degree: String,
        institution: String,
        year: String
      }],
      workExperience: [{
        company: String,
        position: String,
        duration: String,
        achievements: [String]
      }],
      projects: [{
        name: String,
        description: String,
        technologies: [String]
      }],
      certifications: [String]
    },
    documentMetadata: {
      fileSize: Number,
      fileName: String,
      fileType: String,
      extractedAt: Date,
      pages: Number,
      wordCount: Number,
      characterCount: Number
    },
    validation: {
      isValid: Boolean,
      warnings: [String],
      confidence: Number
    },
    atsEngine: {
      type: String,
      enum: ['gemini', 'scan_cv', 'gemini_fallback']
    },
    scanDetails: {
      embedding_score: Number,
      rerank_score: Number,
      rerank_raw: Number,
      final_score: Number,
      explanation: String,
      breakdown: mongoose.Schema.Types.Mixed
    }
  },
  aiFeedback: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: undefined
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    summary: String,
    strengths: [String],
    concerns: [String],
    flags: [String],
    suggestedDecisionNote: String,
    generatedAt: Date,
    interviewsConsidered: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview'
    }],
    contentHash: String,
    model: String
  },
  aiProcessing: {
    status: {
      type: String,
      enum: ['idle', 'queued', 'processing', 'done', 'error'],
      default: 'idle'
    },
    startedAt: Date,
    finishedAt: Date,
    error: String,
    engine: {
      type: String,
      enum: ['gemini', 'scan_cv', 'gemini_fallback'],
      default: undefined
    }
  },
  timeline: [{
    status: String,
    date: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notes: [{
    text: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot be more than 1000 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],
  interviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview'
  }],
  source: {
    type: String,
    enum: ['website', 'job_board', 'referral', 'social_media', 'recruiter', 'other'],
    default: 'website'
  },
  referralInfo: {
    referredBy: String,
    referralBonus: Number
  }
}, {
  timestamps: true
});
applicationSchema.index({
  job: 1,
  applicant: 1
}, {
  unique: true
});
applicationSchema.index({
  job: 1
});
applicationSchema.index({
  applicant: 1
});
applicationSchema.index({
  status: 1
});
applicationSchema.index({
  createdAt: -1
});
applicationSchema.index({
  'aiAnalysis.overallScore': -1
});
applicationSchema.virtual('daysOld').get(function () {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});
applicationSchema.virtual('applicantFullName').get(function () {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});
applicationSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      date: new Date()
    });
  }
  next();
});
applicationSchema.set('toJSON', {
  virtuals: true
});
module.exports = mongoose.model('Application', applicationSchema);