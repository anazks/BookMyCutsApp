const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const { getDashboardStats, getTransactionLogs } = require('../Controller/AdminController')

// Admin auth middleware
const adminAuth = [verifyToken, authorizeRoles('admin')];

router.get('/stats', adminAuth, getDashboardStats);
router.get('/transaction-logs', adminAuth, getTransactionLogs);

module.exports = router