const Razorpay = require('razorpay');
require('dotenv').config();

const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

logger.info("Razorpay Initialized", { keyId: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 8)}...` : "UNDEFINED" });

module.exports = razorpay