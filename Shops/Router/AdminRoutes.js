const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../Controller/AdminController')


    router.get('/stats', getDashboardStats);

module.exports = router