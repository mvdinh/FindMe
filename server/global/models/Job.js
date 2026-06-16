const mongoose = require('mongoose');
const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [function() { return this.status !== 'draft'; }, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Job title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [function() { return this.status !== 'draft'; }, 'Job description is required'],
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
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance'],
    required: [function() { return this.status !== 'draft'; }, 'Job type is required']
  },
  location: {
    type: String,
    trim: true
  },
  locationType: {
    type: String,
    enum: ['Onsite', 'Remote', 'Hybrid'],
    default: 'Onsite'
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
    required: function() { return this.status !== 'draft'; }
  },
  experienceLevel: {
    type: String,
    enum: ['Fresher', 'Junior', 'Middle', 'Senior', 'Tech Lead', 'Manager', 'Director'],
    required: [function() { return this.status !== 'draft'; }, 'Experience level is required']
  },
  applicationDeadline: {
    type: Date,
    required: [function() { return this.status !== 'draft'; }, 'Application deadline is required']
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
    default: 'scan_cv'
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
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'active', 'closed', 'rejected'],
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

// Đánh index
jobSchema.add({
  publishedAt: {
    type: Date
  },
  lastStatusActorRole: {
    type: String,
    enum: ['admin', 'recruiter']
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

jobSchema.virtual('daysSincePosted').get(function () {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});
jobSchema.set('toJSON', {
  virtuals: true
});
module.exports = mongoose.model('Job', jobSchema);