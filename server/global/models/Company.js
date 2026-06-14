const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    logo: {
        type: String
    },
    description: {
        type: String
    },
    industry: {
        type: String
    },
    size: {
        type: String
    },
    website: {
        type: String
    },
    address: {
        type: String
    },
    email: {
        type: String
    },
    phone: {
        type: String
    },
    taxCode: {
        type: String
    },
    businessLicenseNumber: {
        type: String
    },
    businessLicenseFile: {
        type: String
    },
    verificationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected", "locked"],
        default: "pending"
    },
    verifiedAt: {
        type: Date
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    rejectionReason: {
        type: String
    },
    // --- Lock / Unlock ---
    lockReason: {
        type: String
    },
    lockedAt: {
        type: Date
    },
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // Đếm số lần tin tuyển dụng bị Admin từ chối (auto-lock khi >= 5)
    jobRejectionCount: {
        type: Number,
        default: 0
    },
    // Yêu cầu mở khóa từ Recruiter
    unlockRequestedAt: {
        type: Date
    },
    unlockRequestMessage: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
}, {
    timestamps: true
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
