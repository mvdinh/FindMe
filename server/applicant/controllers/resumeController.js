const Resume = require('../../global/models/Resume');
const User = require('../../global/models/User');
const multer = require('multer');
const { uploadResumeBuffer, deleteByPublicId } = require('../../global/services/cloudinaryService');
const { getResource } = require('../../global/services/cloudinaryService');
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/msword') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const uploadResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    console.log('[RESUME][upload] start', {
      userId: String(userId),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size
    });
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `resume-${uniqueSuffix}${getFileExtension(req.file.originalname)}`;
    const cloud = await uploadResumeBuffer(req.file.buffer, {
      userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype
    });
    console.log('[RESUME][upload] cloudinary ok', {
      userId: String(userId),
      publicId: cloud?.publicId,
      url: cloud?.url,
      bytes: cloud?.bytes
    });

    const deleteResult = await Resume.deleteMany({
      userId,
      isActive: true
    });
    console.log(`Deleted ${deleteResult.deletedCount} previous resumes for user ${userId}`);
    const resume = new Resume({
      userId,
      fileName,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileUrl: cloud?.url,
      cloudinaryPublicId: cloud?.publicId,
      processingStatus: 'completed'
    });
    await resume.save();
    console.log('[RESUME][upload] saved to DB', {
      resumeId: String(resume._id),
      userId: String(userId),
      fileUrl: resume.fileUrl,
      cloudinaryPublicId: resume.cloudinaryPublicId
    });
    const updateData = {
      'profile.currentResumeId': resume._id,
      'profile.resume': {
        fileName,
        uploadDate: new Date(),
        fileSize: req.file.size
      }
    };
    const user = await User.findById(userId);
    if (user.currentResumeId !== undefined) {
      updateData.currentResumeId = resume._id;
    }
    await User.findByIdAndUpdate(userId, updateData);
    console.log('Updated user resume reference:', updateData);
    console.log('New resume ID:', resume._id);
    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        originalName: resume.originalName,
        fileSize: resume.fileSize,
        uploadDate: resume.createdAt,
        fileUrl: resume.fileUrl
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during resume upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
function getFileExtension(filename) {
  return filename.substring(filename.lastIndexOf('.'));
}
const saveParsedResumeData = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      parsedData
    } = req.body;
    if (!parsedData) {
      return res.status(400).json({
        success: false,
        message: 'No parsed data provided'
      });
    }
    const resume = await Resume.findLatestByUser(userId);
    if (resume) {
      await resume.markAsCompleted(parsedData);
    }
    const updateData = {};
    if (parsedData.fullName) {
      const nameParts = parsedData.fullName.trim().split(' ');
      updateData.firstName = nameParts[0] || '';
      updateData.lastName = nameParts.slice(1).join(' ') || '';
      updateData['profile.fullName'] = parsedData.fullName;
    }
    if (parsedData.phone) updateData.phone = parsedData.phone;
    if (parsedData.currentLocation) updateData['profile.currentLocation'] = parsedData.currentLocation;
    if (parsedData.primarySkills && parsedData.primarySkills.length > 0) {
      updateData['profile.primarySkills'] = parsedData.primarySkills;
    }
    if (parsedData.educationEntries && parsedData.educationEntries.length > 0) {
      updateData['profile.educationEntries'] = parsedData.educationEntries;
    }
    if (parsedData.workExperienceEntries && parsedData.workExperienceEntries.length > 0) {
      updateData['profile.workExperienceEntries'] = parsedData.workExperienceEntries;
    }
    await User.findByIdAndUpdate(userId, updateData);
    res.json({
      success: true,
      message: 'Resume data saved successfully',
      parsedData
    });
  } catch (error) {
    console.error('Save parsed data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving parsed data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const getUserResumes = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumes = await Resume.findByUser(userId);
    res.json({
      success: true,
      data: resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const getResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumeId = req.params.id;
    const resume = await Resume.findOne({
      _id: resumeId,
      userId
    });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }
    res.json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getResumeFileUrl = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumeId = req.params.id;
    const resume = await Resume.findOne({ _id: resumeId, userId, isActive: true }).select('fileUrl cloudinaryPublicId originalName mimeType fileSize');
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }
    const refresh = String(req.query?.refresh || '').toLowerCase() === '1' || String(req.query?.refresh || '').toLowerCase() === 'true';
    if ((!resume.fileUrl || refresh) && resume.cloudinaryPublicId) {
      try {
        const r = await getResource(resume.cloudinaryPublicId, 'raw');
        const newUrl = r?.secure_url || r?.url;
        if (newUrl && newUrl !== resume.fileUrl) {
          resume.fileUrl = newUrl;
          await resume.save();
        }
      } catch (e) {
      }
    }
    if (!resume.fileUrl) return res.status(404).json({ success: false, message: 'Resume fileUrl not found' });
    return res.json({
      success: true,
      data: {
        fileUrl: resume.fileUrl,
        cloudinaryPublicId: resume.cloudinaryPublicId,
        originalName: resume.originalName,
        mimeType: resume.mimeType,
        fileSize: resume.fileSize
      }
    });
  } catch (error) {
    console.error('Get resume fileUrl error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const deleteResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumeId = req.params.id;
    const resume = await Resume.findOne({
      _id: resumeId,
      userId
    });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }
    await resume.deactivate();
    const user = await User.findById(userId);
    if (user.profile.currentResumeId && user.profile.currentResumeId.toString() === resumeId) {
      await User.findByIdAndUpdate(userId, {
        'profile.currentResumeId': null,
        'profile.resume': null
      });
    }
    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const downloadResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumeId = req.params.id;
    const resume = await Resume.findOne({
      _id: resumeId,
      userId,
      isActive: true
    });
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }
    if (resume.fileUrl) {
      return res.redirect(302, resume.fileUrl);
    }
    if (!resume.fileData) {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found'
      });
    }
    const fileBuffer = Buffer.from(resume.fileData, 'base64');
    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${resume.originalName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const previewResume = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const resumeId = req.params.id;
    const resume = await Resume.findOne({ _id: resumeId, userId, isActive: true }).select(
      'fileUrl cloudinaryPublicId originalName mimeType fileSize fileData'
    );
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Base64 legacy
    if (resume.fileData) {
      const fileBuffer = Buffer.from(resume.fileData, 'base64');
      res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${resume.originalName || 'cv.pdf'}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(fileBuffer);
    }

    // Cloudinary URL (refresh if needed)
    let fileUrl = resume.fileUrl;
    if (!fileUrl && resume.cloudinaryPublicId) {
      try {
        const r = await getResource(resume.cloudinaryPublicId, 'raw');
        const newUrl = r?.secure_url || r?.url;
        if (newUrl) {
          fileUrl = newUrl;
          resume.fileUrl = newUrl;
          await resume.save();
        }
      } catch {}
    }
    if (!fileUrl) {
      return res.status(404).json({ success: false, message: 'Resume file not available' });
    }

    // Server-side fetch Cloudinary (no CORS). Then stream back inline with proper filename.
    const upstream = await fetch(fileUrl);
    if (!upstream.ok) {
      return res.status(502).json({ success: false, message: 'Không thể tải CV từ storage' });
    }
    const arrayBuffer = await upstream.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', resume.mimeType || upstream.headers.get('content-type') || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resume.originalName || 'cv.pdf'}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Preview resume error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadResume,
  saveParsedResumeData,
  getUserResumes,
  getResume,
  getResumeFileUrl,
  deleteResume,
  downloadResume,
  previewResume,
  upload
};