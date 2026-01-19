const Decoder = require('../../TokenDecoder/Decoder')
const {checkAvailble,bookNow,bookingCompletion,getBarberFullSchedule,getShopAvailableSlots} = require('../UseCause/BookingUseCause')
const {mybooking,findDashboardIncomeFunction,upcomingBooking} = require('../Repo/BookingRepo')
const RazorPay = require('../../Razorpay/RazorpayConfig')
const mongoose = require('mongoose');
const { trace } = require('../Router/BookingRouter');
const crypto = require('crypto'); // CommonJS
const BookingModel = require('../Models/BookingModel');
const ShopModel  = require('../../Shops/Model/ShopModel')
 

const nodemailer = require('nodemailer');



const checkAvailability = async(req,res)=>{
    try {
        let availableStatus = await checkAvailble(req.params.id)
        res.json(availableStatus)
    } catch (error) {
        console.log(error)
        res.json(error)
    }
}

const AddBooking = async (req, res) => {
    try {
        console.log(req.body, "req.body in BookingController");
        let token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>
        let decodedValue = await Decoder(token);
        console.log(decodedValue, "decodedValue");
        let BookingStatus = await bookNow(req.body, decodedValue); // Assuming bookNow is async
        console.log(BookingStatus,"BookingStatus")
        return res.status(200).json({ success: true, BookingStatus });
    } catch (error) {
        console.error(error);
        return res.status(401).json({ success: false, message: error.message || "Unauthorized" });
    }
};

const createOrder = async (req, res) => {
    console.log(req.body)
    try {
    const options = {
      amount: req.body.amount * 100, // convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };

    const order = await RazorPay.orders.create(options);
    console.log(order)
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Order creation failed' });
  }
}

const verifyPayment = async (req, res) => {
    console.log("verify payment started...");
    console.log("Request body:", req.body);
    
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            paymentType,
            amount,
            bookingId,
            email
        } = req.body;
        let Details = req.body

        // Validate required fields
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment verification fields'
            });
        }
        // Create signature verification string
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;
        console.log("Signature verification:", isAuthentic);
        console.log("Expected signature:", expectedSignature);
        console.log("Received signature:", razorpay_signature);

        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed - Invalid signature'
            });
        }else{
            
            let response = await bookingCompletion(Details)
            console.log(response,"booking controller response after pay")
            await sendConfirmationMail(bookingId,email)
            return res.status(200).json({
            success: true,
            message: 'Payment verification successful',
            data: {
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                amount: amount,
                paymentType: paymentType
            }
        });
        }
 
      
    } catch (error) {
        console.log("Payment verification error:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during payment verification',
            error: error.message
        });
    }
}; 




const getMybooking = async (req, res) => {
    try {
        let token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>
        let decodedValue = await Decoder(token);
        console.log(decodedValue, "decodedValue");
        let userId = decodedValue.id; // Assuming the user ID is in the decoded token
        let bookings = await mybooking(userId)
        console.log(bookings,"my bookings...")
        return res.status(200).json({ success: true, bookings });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
}

const findDashboardIncome = async (req, res) => {
    try {
        // 1. Get and validate token
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Missing or invalid authorization header"
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = await Decoder(token);

        // 2. Get user id from token
        const userId = decoded.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token - user id not found"
            });
        }

        // 3. Find the shop owned by this user
        const shop = await ShopModel.findOne(
            { ShopOwnerId: userId },   // ← IMPORTANT: use userId here
            { _id: 1 }                 // we only need the _id
        ).lean();

        if (!shop?._id) {
            return res.status(404).json({
                success: false,
                message: "No shop found for this user"
            });
        }

        const shopId = shop._id;

        console.log(`[DASHBOARD] User ${userId} → Shop ${shopId}`);

        // 4. Calculate income using the correct shopId
        const dashboardIncome = await findDashboardIncomeFunction(shopId);

        console.log("Dashboard Income Result:", dashboardIncome);

        // 5. Return response
        return res.status(200).json({
            success: true,
            message: "Successfully fetched dashboard income",
            dashboardIncome
        });

    } catch (error) {
        console.error("Error in findDashboardIncome:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            // only show error details in development
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

const barberFreeSlots = async (req,res) => { 
    try {
        const barberId = req.body.barberId
        const bookingDate = req.body.bookingDate
        const shopId = req.body.shopId
        console.log(barberId)
        console.log(bookingDate)
        const availableHours = await getBarberFullSchedule(barberId,bookingDate,shopId)
        if(availableHours){
            res.status(200).json({
                success:true,
                message:"successfully fetched free hours of barber",
                availableHours
            })
        }else{
            res.status(404).json({
                success:true,
                message:"failed to fetch  barber bookings hours",
            })
        }

    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:"internal server error",
        })
    }
}

const fetchAllAvailableTimeSlots = async (req,res) => {
    try {
        const shopId = req.body.shopId
        const bookingDate  = req.body.bookingDate
        console.log(shopId,bookingDate)
        const availableSlots =await getShopAvailableSlots(shopId,bookingDate)
        if(availableSlots){
            return res.status(200).json({
                success:true,
                message:"successfully fetch all time slots",
                availableSlots
            })
        }
            return res.status(404).json({
            success:false,
            message:"failed to fetch available time slots",
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
}

const fetchUpComeingBooking = async (req,res) => {
    try {
        const userId = req.params.id
        console.log("userid:",userId)
        const booking = await upcomingBooking(userId)
        if(booking){
            res.status(200).json({
                success:true,
                message:"succesfully fetched upcominbooking",
                booking
            })
        }else{
            res.status(404).json({
                success:false,
                message:"faild to fetch booking"
            })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
}

const findShopByService = async (req,res) => {
    try {
        const {coordinates,service} = req.body
        const shops =  await  findShopByServiceFunction(coordinates,service)
        if(shops){
            res.status(200).josn({
                success:true,
                message:"successfully fetched shops by servie and location",
                shops
            })
        }else{
            res.status(404).json({
                success:false, 
                message:"failed to fetch shops",
            })
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
}


const sendConfirmationMail = async (bookingId, email) => {
  try {
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    const { bookingDate, timeSlot } = booking;
    const start = timeSlot.startingTime;
    const end = timeSlot.endingTime;    

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'govindjayakumar858@gmail.com',
        pass: 'hchvyofxmtmuqqfs' // app password (no spaces)
      }
    });

    const mailOptions = {
      from: '"BookMyCuts" <govindjayakumar858@gmail.com>',
      to: email,
      subject: 'Booking Confirmation – BookMyCuts',
      html: `
        <h2>Booking Confirmed ✂️</h2>
        <p>Hello,</p>

        <p>Your appointment has been <strong>successfully confirmed</strong>.</p>

        <p><strong>📅 Date:</strong> ${bookingDate}</p>
        <p><strong>⏰ Time:</strong> ${start} - ${end}</p>

        <p>Please arrive 10 minutes early.</p>

        <p>Thank you for choosing <strong>BookMyCuts</strong>.</p>

        <br />
        <p>Regards,<br/>BookMyCuts Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent to:', email);

  } catch (error) {
    console.error('❌ Error sending confirmation email:', error.message);
  }
};

module.exports = {findShopByService,fetchUpComeingBooking,checkAvailability,AddBooking,getMybooking,createOrder,findDashboardIncome,verifyPayment,barberFreeSlots,fetchAllAvailableTimeSlots}


