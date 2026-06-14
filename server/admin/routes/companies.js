const express = require('express');
const router = express.Router();
const companyController = require('../../global/controllers/companyController');
const { auth, authorize } = require('../../global/middleware/auth');

router.use(auth);
router.use(authorize('admin'));

// Tất cả doanh nghiệp (có lọc theo trạng thái)
router.get('/', companyController.getAllCompanies);
// Chỉ pending
router.get('/pending', companyController.getPendingCompanies);
// Chi tiết
router.get('/:id', companyController.getCompanyDetail);
// Duyệt / Từ chối / Khóa / Mở khóa
router.put('/:id/approve', companyController.approveCompany);
router.put('/:id/reject', companyController.rejectCompany);
router.put('/:id/lock', companyController.lockCompany);
router.put('/:id/unlock', companyController.unlockCompany);

module.exports = router;
