const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const { getDashboardStats, getTransactionLogs } = require('../Controller/AdminController')
const { getAllPremiumShops, migrateShopAudience, deleteShop, verifyShop, fetchAllShopsForAdmin } = require('../Controller/ShopController');

// Admin auth middleware
const adminAuth = [verifyToken, authorizeRoles('admin')];

router.get('/stats', adminAuth, getDashboardStats);
router.get('/transaction-logs', adminAuth, getTransactionLogs);

// Shop Management
router.get('/shops', adminAuth, fetchAllShopsForAdmin);
router.get('/premium-shops', adminAuth, getAllPremiumShops);
router.post('/verify-shop', adminAuth, verifyShop);
router.delete('/shops/:id', adminAuth, deleteShop);

module.exports = router