const express = require('express');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const User = require('../../global/models/User');
const router = express.Router();

router.get('/', auth, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const recruiters = await User.find({
      role: 'recruiter',
      isActive: {
        $ne: false
      }
    }).select('firstName lastName email department jobTitle interviewerProfile');
    const formatted = recruiters.map(i => ({
      id: i._id,
      name: `${i.lastName} ${i.firstName}`.trim(),
      email: i.email,
      department: i.department || i.jobTitle || 'N/A',
      expertise: i.interviewerProfile?.expertise || []
    }));
    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Recruiter get interviewers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
