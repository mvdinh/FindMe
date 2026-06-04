const express = require('express');
const {
  auth,
  authorize
} = require('../../global/middleware/auth');
const User = require('../../global/models/User');
const router = express.Router();
router.get('/', auth, authorize('hr', 'admin'), async (req, res) => {
  try {
    const interviewers = await User.find({
      role: 'hr',
      isActive: {
        $ne: false
      }
    }).select('firstName lastName email department jobTitle interviewerProfile');
    const formatted = interviewers.map(i => ({
      id: i._id,
      name: `${i.firstName} ${i.lastName}`.trim(),
      email: i.email,
      department: i.department || i.jobTitle || 'N/A',
      expertise: i.interviewerProfile?.expertise || []
    }));
    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('HR get interviewers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;