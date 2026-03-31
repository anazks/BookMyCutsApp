const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log("Razorpay Initialized with Key ID:", process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 8)}...` : "UNDEFINED");

module.exports = razorpay