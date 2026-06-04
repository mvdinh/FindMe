const express = require('express');
const {
  auth
} = require('../../global/middleware/auth');
const {
  body
} = require('express-validator');
const {
  uploadResume,
  saveParsedResumeData,
  getUserResumes,
  getResume,
  getResumeFileUrl,
  deleteResume,
  downloadResume,
  previewResume,
  upload
} = require('../controllers/resumeController');
const router = express.Router();
router.use(auth);
router.post('/upload', upload.single('resume'), uploadResume);
router.post('/parsed-data', [body('parsedData').isObject().withMessage('Parsed data must be an object')], saveParsedResumeData);
router.get('/', getUserResumes);
router.get('/:id', getResume);
router.get('/:id/file-url', getResumeFileUrl);
router.get('/:id/download', downloadResume);
router.get('/:id/preview', previewResume);
router.delete('/:id', deleteResume);
module.exports = router;