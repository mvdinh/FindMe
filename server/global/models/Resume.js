const mongoose = require('mongoose');
const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    enum: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
  },
  fileUrl: {
    type: String
  },
  cloudinaryPublicId: {
    type: String
  },
  fileData: {
    type: String
  },
  parsedData: {
    fullName: String,
    email: String,
    phone: String,
    currentLocation: String,
    primarySkills: [String],
    educationEntries: [{
      qualification: String,
      fieldOfStudy: String,
      universityName: String,
      graduationYear: String,
      cgpaPercentage: String
    }],
    workExperienceEntries: [{
      company: String,
      position: String,
      startDate: String,
      endDate: String,
      isCurrentlyWorking: Boolean,
      description: String,
      yearsOfExperience: String
    }],
    rawText: String
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingErrors: [String],
  processingCompletedAt: Date,
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
resumeSchema.index({
  userId: 1,
  isActive: 1
});
resumeSchema.index({
  processingStatus: 1
});
resumeSchema.index({
  createdAt: -1
});
resumeSchema.virtual('filePath').get(function () {
  return this.fileUrl;
});
resumeSchema.statics.findByUser = function (userId) {
  return this.find({
    userId,
    isActive: true
  }).sort({
    createdAt: -1
  });
};
resumeSchema.statics.findLatestByUser = function (userId) {
  return this.findOne({
    userId,
    isActive: true
  }).sort({
    createdAt: -1
  });
};
resumeSchema.statics.findPendingProcessing = function () {
  return this.find({
    processingStatus: 'pending'
  });
};
resumeSchema.methods.markAsProcessing = function () {
  this.processingStatus = 'processing';
  return this.save();
};
resumeSchema.methods.markAsCompleted = function (parsedData) {
  this.processingStatus = 'completed';
  this.parsedData = parsedData;
  this.processingCompletedAt = new Date();
  return this.save();
};
resumeSchema.methods.markAsFailed = function (errors) {
  this.processingStatus = 'failed';
  this.processingErrors = Array.isArray(errors) ? errors : [errors];
  return this.save();
};
resumeSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};
resumeSchema.pre('save', function (next) {
  if (this.isModified('parsedData') && !this.isNew) {
    this.version += 1;
  }
  next();
});
resumeSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    return ret;
  }
});
module.exports = mongoose.model('Resume', resumeSchema);