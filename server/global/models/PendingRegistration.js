const mongoose = require('mongoose');
const pendingRegistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  type: {
    type: String,
    enum: ['applicant', 'company'],
    required: true
  },
  userData: {
    firstName: String,
    lastName: String,
    password: String,
    phone: String,
    role: String,
    profile: {
      fullName: String,
      currentLocation: String,
      currentStatus: String,
      educationEntries: [Object],
      workExperienceEntries: [Object],
      primarySkills: [String]
    }
  },
  resumeData: {
    originalName: String,
    mimeType: String,
    fileData: Buffer,
    fileSize: Number
  },
  companyData: {
    companyName: String,
    industry: String,
    companySize: String,
    headquarters: String,
    country: String,
    website: String,
    registrationNumber: String,
    description: String,
    logo: String,
    socialLinks: {
      linkedin: String,
      careers: String
    },
    hiringRegions: [String],
    remotePolicy: String,
    adminFirstName: String,
    adminLastName: String,
    adminPassword: String,
    adminPhone: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});
pendingRegistrationSchema.index({
  expiresAt: 1
}, {
  expireAfterSeconds: 0
});
module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);