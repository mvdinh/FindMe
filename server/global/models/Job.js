const mongoose = require('mongoose');
const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Job title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [5000, 'Job description cannot be more than 5000 characters']
  },
  requirements: {
    type: String,
    maxlength: [5000, 'Requirements description cannot be more than 5000 characters']
  },
  benefits: {
    type: String,
    maxlength: [5000, 'Benefits description cannot be more than 5000 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Temporary', 'Toàn thời gian', 'Bán thời gian', 'Thực tập', 'Hợp đồng', 'Tự do', 'Thời vụ'],
    required: [true, 'Job type is required']
  },
  location: {
    type: String,
    trim: true
  },
  locationType: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid'],
    default: 'onsite'
  },
  salaryRange: {
    min: {
      type: String
    },
    max: {
      type: String
    },
    currency: {
      type: String,
      default: 'VND'
    },
    period: {
      type: String,
      enum: ['year', 'month', 'hour'],
      default: 'year'
    },
    format: {
      type: String,
      enum: ['absolute', 'lpa'],
      default: 'absolute'
    }
  },
  qualification: {
    type: [String],
    required: [true, 'Required qualification is required']
  },
  experienceLevel: {
    type: String,
    required: [true, 'Experience level is required']
  },
  requiredSkills: {
    type: [String],
    default: []
  },
  preferredSkills: {
    type: [String],
    default: []
  },
  applicationDeadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  maxApplicants: {
    type: Number
  },
  atsEnabled: {
    type: Boolean,
    default: false
  },
  atsResumeThreshold: {
    type: Number,
    min: 0,
    max: 100,
    default: 60
  },
  atsSkipWhenCoverLetter: {
    type: Boolean,
    default: false
  },
  atsEngine: {
    type: String,
    enum: ['gemini', 'scan_cv'],
    default: 'gemini'
  },
  resumeRequired: {
    type: Boolean,
    default: true
  },
  defaultInterviewRounds: {
    type: [String],
    default: []
  },
  defaultInterviewer: {
    type: String
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'closed'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
  },
  applicationsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
jobSchema.add({
  publishedAt: {
    type: Date
  },
  lastStatusActorRole: {
    type: String,
    enum: ['admin', 'hr']
  }
});
jobSchema.index({
  title: 'text',
  description: 'text'
});
jobSchema.index({
  status: 1
});
jobSchema.index({
  locationType: 1
});
jobSchema.index({
  jobType: 1
});
jobSchema.index({
  experienceLevel: 1
});
jobSchema.index({
  location: 1
});
jobSchema.index({
  createdAt: -1
});
jobSchema.index({
  postedBy: 1
});
jobSchema.index({
  department: 1
});
jobSchema.virtual('daysSincePosted').get(function () {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});
jobSchema.set('toJSON', {
  virtuals: true
});
module.exports = mongoose.model('Job', jobSchema);