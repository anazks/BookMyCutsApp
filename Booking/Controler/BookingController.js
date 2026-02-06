const Decoder = require('../../TokenDecoder/Decoder')
const {checkAvailble,bookNow,bookingCompletion,getBarberFullSchedule,getShopAvailableSlots} = require('../UseCause/BookingUseCause')
const {myBooking,findDashboardIncomeFunction,upcomingBooking,fetchbookingById} = require('../Repo/BookingRepo')
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

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Razorpay signature verification (fast)
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Update booking (faster version)
    const remainingAmount = paymentType === 'full' ? 0 : Math.max((req.body.totalPrice || amount) - amount, 0);
    const updatedBooking = await BookingModel.findByIdAndUpdate(
      bookingId,
      {
        paymentId: razorpay_payment_id,
        paymentType,
        amountPaid: Number(amount),
        remainingAmount,
        paymentStatus: paymentType === 'full' ? 'paid' : 'partial',
        bookingStatus: 'confirmed'
      },
      { new: true, lean: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Send confirmation email asynchronously
    sendConfirmationMail(bookingId, email)
      .then(() => console.log('Email sent'))
      .catch(err => console.error('Email error:', err));

    // Respond immediately
    return res.status(200).json({
      success: true,
      message: 'Payment verification successful',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount,
        paymentType
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};



const getMybooking = async (req, res) => {
  try {
    // 1. Get User ID from Token
    let token = req.headers['authorization']?.split(' ')[1]; 
    let decodedValue = await Decoder(token);
    let userId = decodedValue.id; 
    
    // 2. Get Pagination Params from BODY (since frontend uses POST)
    const { limit = 10, lastDate } = req.body;   // ← changed from req.query

    // Optional: make limit safe
    const parsedLimit = parseInt(limit, 10);
    const finalLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 10 : parsedLimit;

    // 3. Call Service Function
    let bookings = await myBooking(userId, finalLimit, lastDate);

    // 4. Calculate the NEXT cursor
    const nextCursor = bookings.length > 0 
      ? bookings[bookings.length - 1].createdAt.toISOString()
      : null;

    // 5. Send Response
    return res.status(200).json({ 
      success: true, 
      bookings,     
      nextCursor    
    });

  } catch (error) {
    console.error("Controller Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || "Internal Server Error" 
    });
  }
};

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
            console.log(booking,"upcoming booking found")
            let shopDetails = await ShopModel.findById(booking.shopId)
            console.log(shopDetails,"shop details") 
            res.status(200).json({
                success:true,
                message:"succesfully fetched upcominbooking",
                booking,
                shopDetails
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
    console.log(email, 'Booking details for email');
    if (!booking) {
      throw new Error('Booking not found');
    }

    const { bookingDate, timeSlot } = booking;
    const start = timeSlot.startingTime;
    const end = timeSlot.endingTime;    

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'anazksunil2@gmail.com',
        pass: 'gefd cyst feti eztk' // app password (no spaces)
      }
    });

    const mailOptions = {
      from: '"BookMyCuts" <anazksunil2@gmail.com>',
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

// bookingController.js

const fetchAllbookings = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      date,
      startDate,
      endDate,
      period,
      bookingStatus,
      paymentStatus
    } = req.query;

    let filter = {};

    // 🔹 Booking status
    if (bookingStatus) {
      filter.bookingStatus = bookingStatus;
    }

    // 🔹 Payment status
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    /* =======================
       📅 DATE FILTER LOGIC
    ======================= */

    // 1️⃣ Single day (calendar click)
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      filter.bookingDate = { $gte: start, $lte: end };
    }

    // 2️⃣ Custom date range
    else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filter.bookingDate = { $gte: start, $lte: end };
    }

    // 3️⃣ Quick filters (today / lastWeek / lastMonth)
    else if (period) {
      const now = new Date();
      let start, end;

      if (period === "today") {
        start = new Date();
        start.setHours(0, 0, 0, 0);

        end = new Date();
        end.setHours(23, 59, 59, 999);
      }

      if (period === "lastWeek") {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - 7);
      }

      if (period === "lastMonth") {
        end = new Date();
        start = new Date();
        start.setMonth(start.getMonth() - 1);
      }

      if (start && end) {
        filter.bookingDate = { $gte: start, $lte: end };
      }
    }

    /* ======================= */

    const total = await BookingModel.countDocuments(filter);

    const bookings = await BookingModel.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ bookingDate: -1 });

    res.status(200).json({
      success: true,
      message: "Successfully fetched bookings",
      total,
      page,
      totalPages: Math.ceil(total / limit),
      bookings
    });

  } catch (error) {
    console.error("error in fetchAllBookings", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


const getbookings = async (req,res) => {
    try {
        const bookingId = req.params.id
        const bookings = await fetchbookingById(bookingId)
        if(bookings){
            return res.status(200).json({
                success:true,
                message:"successfully fetch bookings",
                bookings
            })
        }
            return res.status(404).json({
            success:false,
            message:"failed to fetch bookings",
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success:false,
            message:"internal server error"
        })
    }
}




module.exports = {getbookings,findShopByService,fetchUpComeingBooking,checkAvailability,AddBooking,getMybooking,createOrder,findDashboardIncome,verifyPayment,barberFreeSlots,fetchAllAvailableTimeSlots,fetchAllbookings}


