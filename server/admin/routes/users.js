const express = require('express');
const { auth, authorize } = require('../../global/middleware/auth');
const { listUsers, getUserById, updateUser } = require('../controllers/usersController');
const router = express.Router();
router.get('/', auth, authorize('admin'), listUsers);
router.get('/:id', auth, authorize('admin'), getUserById);
router.patch('/:id', auth, authorize('admin'), updateUser);
module.exports = router;
