const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { auth, authorize } = require('../middleware/auth');

// Recruiter routes (phải đặt trước /:id)
router.get('/me', auth, authorize('recruiter'), companyController.getMyCompany);
router.post('/request-unlock', auth, authorize('recruiter'), companyController.requestUnlock);

// Public routes
router.get('/', companyController.getCompanies);
router.get('/:id', companyController.getCompanyById);

router.post('/', auth, authorize('recruiter'), companyController.createCompany);
router.put('/:id', auth, authorize('recruiter'), companyController.updateCompany);
router.delete('/:id', auth, authorize('recruiter'), companyController.deleteCompany);

module.exports = router;
