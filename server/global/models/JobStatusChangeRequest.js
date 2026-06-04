const mongoose = require('mongoose');
const jobStatusChangeRequestSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedStatus: {
    type: String,
    enum: ['active', 'closed', 'inactive', 'draft'],
    required: true
  },
  previousStatus: {
    type: String
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNote: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true
});
jobStatusChangeRequestSchema.index({
  job: 1,
  reviewStatus: 1
});
module.exports = mongoose.model('JobStatusChangeRequest', jobStatusChangeRequestSchema);
