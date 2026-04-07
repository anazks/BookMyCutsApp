const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const secretkey = process.env.secretKey;

const {razorpayWebhook, completeBooking, checkAvailability,AddBooking,createOrder,getMybooking,findDashboardIncome,verifyPayment,barberFreeSlots,fetchAllAvailableTimeSlots,fetchUpComeingBooking,fetchAllbookings, getbookings} = require('../Controler/BookingController');
const { verifyToken } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const UserModel = require('../../Auth/Model/UserModel');

// const {checkAvailability,AddBooking,getMybooking} = require('../Controler/BookingController')
router.route('/getAvilablity/:barberId').get(checkAvailability)
router.route('/BookNow').post(AddBooking)
router.route('/myBookings').post(getMybooking) // Assuming this is for adding bookings
router.route('/webhook/razorpay').post(razorpayWebhook)




router.route('/getAvilablity/:barberId').get(checkAvailability)   //not completed
router.route('/BookNow').post(AddBooking) // normal curd operation just add data to db


router.route('/create-order').post(verifyToken,createOrder)
router.route('/verifyPayment').post(verifyToken,verifyPayment)

router.route('/dashboardIncome').get(findDashboardIncome)
router.route('/getBarberFreeTime').post(barberFreeSlots)
router.route('/fetchAllAvailableTimeSlots').post(fetchAllAvailableTimeSlots)
router.route('/fetchUpComingBooking/:id').get(fetchUpComeingBooking)
router.route('/bookings').get(fetchAllbookings)
router.route('/bookings/:id').get(getbookings)
router.route('/complete-booking').post(completeBooking)
router.get('/discount', async (req, res) => {
  try {

    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(token, secretkey);
    const userId = decoded.id;

    const user = await UserModel.findById(userId).select("referralDiscountAmount");

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
    console.log("discount error",error)
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
});



module.exports = router;
