const express = require('express');
const router = express.Router();

const {razorpayWebhook, completeBooking, checkAvailability, AddBooking,createOrder,getMybooking,findDashboardIncome,verifyPayment,barberFreeSlots,fetchAllAvailableTimeSlots,fetchUpComeingBooking,fetchAllbookings, getbookings} = require('../Controler/BookingController');
const { verifyToken, authorizeRoles } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const UserModel = require('../../Auth/Model/UserModel');

// --- AUTH DEFS ---
const userAuth = [verifyToken, authorizeRoles('user')];
const shopAuth = [verifyToken, authorizeRoles('shop')];

// --- EXTERNAL WEBHOOKS ---
// Razorpay sends server-to-server callbacks here, so it CANNOT have authentication
router.route('/webhook/razorpay').post(razorpayWebhook);

// --- SHOP APIs ---
router.route('/dashboardIncome').get(shopAuth, findDashboardIncome);

// --- USER APIs ---
router.route('/getAvilablity/:barberId').get(userAuth, checkAvailability);
router.route('/BookNow').post(userAuth, AddBooking);
router.route('/myBookings').post(userAuth, getMybooking);
router.route('/create-order').post(userAuth, createOrder);
router.route('/verifyPayment').post(userAuth, verifyPayment);
router.route('/getBarberFreeTime').post(userAuth, barberFreeSlots);
router.route('/fetchAllAvailableTimeSlots').post(userAuth, fetchAllAvailableTimeSlots);
router.route('/fetchUpComingBooking/:id').get(userAuth, fetchUpComeingBooking);
router.route('/bookings').get(userAuth, fetchAllbookings);
router.route('/bookings/:id').get(userAuth, getbookings);
router.route('/complete-booking').post(userAuth, completeBooking);

// Simplified discount API using the new userAuth middleware!
router.get('/discount', userAuth, async (req, res) => {
  try {
    // req.userId is automatically populated by verifyToken
    const user = await UserModel.findById(req.userId).select("referralDiscountAmount");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      referralDiscount: user.referralDiscountAmount
    });

  } catch (error) {
    console.log("discount error", error);
    return res.status(500).json({
      success: false,
      message: "Server internal error"
    });
  }
});

module.exports = router;
