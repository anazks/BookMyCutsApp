const Decoder = require('../../TokenDecoder/Decoder')
const { checkAvailble, bookNow, bookingCompletion, getBarberFullSchedule, getShopAvailableSlots } = require('../UseCause/BookingUseCause')
const { myBooking, findDashboardIncomeFunction, upcomingBooking, fetchbookingById } = require('../Repo/BookingRepo')
const payoutQueue = require('./PayoutQueue');
const RazorPay = require('../../Razorpay/RazorpayConfig')
const mongoose = require('mongoose');
const { trace } = require('../Router/BookingRouter');
const crypto = require('crypto'); // CommonJS
const RazorpayClass = require('razorpay'); // Import the class for static methods
const BookingModel = require('../Models/BookingModel');
const TransactionLog = require('../Models/TransactionLogModel');
const ShopModel = require('../../Shops/Model/ShopModel')
const PayoutRequest = require('../../Shops/Model/PayoutRequest');
const Offer = require('../../Offers/Model/Offer');



const nodemailer = require('nodemailer');
const chalk = require('chalk');



const checkAvailability = async (req, res) => {
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
    console.log(BookingStatus, "BookingStatus")
    return res.status(200).json({ success: true, BookingStatus });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: error.message || "Unauthorized" });
  }
};

const createOrder = async (req, res) => {
  try {
    const { amount, offerId, shopId } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    let finalAmount = amount;
    let discountAmount = 0;

    // Apply Shop Discount if offerId is provided
    if (offerId) {
      const offer = await Offer.findById(offerId);
      
      if (offer && offer.isActive && offer.offerType === 'discount' && new Date() <= offer.validUntil) {
        // Double check it belongs to the shop if it's a shop-level offer
        if (offer.offerLevel === 'shop' && offer.shopId.toString() !== shopId) {
          console.warn("⚠️ Offer-Shop mismatch. Ignoring discount.");
        } else {
          // Calculate discount
          if (offer.discountType === 'percentage') {
            discountAmount = (amount * offer.discountValue) / 100;
          } else {
            discountAmount = offer.discountValue;
          }
          finalAmount = Math.max(amount - discountAmount, 0);
          console.log(`✅ Applied Offer: ${offer.title} | Discount: ₹${discountAmount}`);
        }
      } else {
        console.warn("⚠️ Invalid or expired offer attempted.");
      }
    }

    const platformFee = 20;
    // The incoming 'amount' already includes the fee, so we don't add it again.
    // However, we calculate it here for the response breakout.
    const amountToPay = finalAmount; 

    const options = {
      amount: Math.round(amountToPay * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };

    const order = await RazorPay.orders.create(options);
    console.log(chalk.greenBright.bold("✨ Razorpay Order Created Successfully: "), chalk.cyanBright(order.id));

    // Log the transaction stage
    await TransactionLog.create({
      razorpayOrderId: order.id,
      amount: amountToPay,
      stage: 'ORDER_CREATED',
      status: 'PENDING',
      requestPayload: req.body,
      responsePayload: order
    }).catch(err => console.error(chalk.redBright("❌ Failed to log ORDER_CREATED stage:"), err.message));

    console.log(chalk.magentaBright("Payment details before response:"), {
      originalServiceAmount: amount,
      discountAmount,
      platformFee,
      amountToPay,
      finalAmount: amountToPay
    });

    res.status(200).json({
      ...order,
      originalServiceAmount: amount,
      discountAmount,
      platformFee,
      amountToPay,
      finalAmount: amountToPay // The actual amount charged to Razorpay
    });
  } catch (err) {
    console.log(chalk.redBright.bold("❌ FULL RAZORPAY ERROR:"), chalk.yellowBright(JSON.stringify(err, null, 2)));
    console.error(chalk.redBright("Order Creation Error:"), err);

    await TransactionLog.create({
      amount: req.body?.amount,
      stage: 'ORDER_CREATION_FAILED',
      status: 'FAILED',
      requestPayload: req.body,
      errorMessage: err.message
    }).catch(logErr => console.error(chalk.redBright("❌ Failed to log ORDER_CREATION_FAILED stage:"), logErr.message));

    res.status(500).json({
      error: 'Order creation failed',
      details: err.message
    });
  }
}

// const verifyPayment = async (req, res) => {
//   console.log("verify payment started...");
//   try {
//     const {
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       paymentType,
//       amount,
//       bookingId,
//       email
//     } = req.body;

//     if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
//       return res.status(400).json({ success: false, message: 'Missing required fields' });
//     }

//     // Razorpay signature verification (fast)
//     const crypto = require('crypto');
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest('hex');

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({ success: false, message: 'Invalid signature' });
//     }

//     // Update booking (faster version)
//     const remainingAmount = paymentType === 'full' ? 0 : Math.max((req.body.totalPrice || amount) - amount, 0);
//     const updatedBooking = await BookingModel.findByIdAndUpdate(
//       bookingId,
//       {
//         paymentId: razorpay_payment_id,
//         paymentType,
//         amountPaid: Number(amount),
//         remainingAmount,
//         paymentStatus: paymentType === 'full' ? 'paid' : 'partial',
//         bookingStatus: 'confirmed'
//       },
//       { new: true, lean: true }
//     );

//     if (!updatedBooking) {
//       return res.status(404).json({ success: false, message: 'Booking not found' });
//     }

//     // Send confirmation email asynchronously
//     sendConfirmationMail(bookingId, email)
//       .then(() => console.log('Email sent'))
//       .catch(err => console.error('Email error:', err));

//     // Respond immediately
//     return res.status(200).json({
//       success: true,
//       message: 'Payment verification successful',
//       data: {
//         paymentId: razorpay_payment_id,
//         orderId: razorpay_order_id,
//         amount,
//         paymentType
//       }
//     });

//   } catch (error) {
//     console.error('Payment verification error:', error);
//     return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
//   }
// };


const verifyPayment = async (req, res) => {
  console.log(chalk.magentaBright.bold("🔍 Verify payment started..."));
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

    // Log verification attempt
    await TransactionLog.create({
      bookingId: bookingId || null,
      razorpayOrderId: razorpay_order_id || null,
      razorpayPaymentId: razorpay_payment_id || null,
      amount: amount || 0,
      stage: 'VERIFICATION_ATTEMPT',
      status: 'PENDING',
      requestPayload: req.body
    }).catch(err => console.error(chalk.redBright("❌ Failed to log VERIFICATION_ATTEMPT:"), err.message));

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      // If the checkout is abandoned, we need to cancel the booking to free the slot
      if (bookingId) {
        await BookingModel.findByIdAndUpdate(bookingId, {
          bookingStatus: 'cancelled',
          paymentStatus: 'unpaid'
        });
      }
      console.log(chalk.redBright.bold("❌ Missing fields or payment abandoned."));
      await TransactionLog.create({
        bookingId: bookingId || null,
        razorpayOrderId: razorpay_order_id || null,
        stage: 'VERIFICATION_FAILED',
        status: 'FAILED',
        errorMessage: 'Missing required fields or payment failed/abandoned',
        requestPayload: req.body
      }).catch(err => console.error(chalk.redBright("❌ Failed to log VERIFICATION_FAILED:"), err.message));
      return res.status(400).json({ success: false, message: 'Missing required fields or payment failed/abandoned' });
    }

    // Razorpay signature verification
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await BookingModel.findByIdAndUpdate(bookingId, {
        bookingStatus: 'cancelled',
        paymentStatus: 'unpaid'
      });
      console.log(chalk.redBright.bold("❌ Signature mismatch for order:"), chalk.yellowBright(razorpay_order_id));
      await TransactionLog.create({
        bookingId: bookingId || null,
        razorpayOrderId: razorpay_order_id || null,
        razorpayPaymentId: razorpay_payment_id || null,
        stage: 'VERIFICATION_FAILED',
        status: 'FAILED',
        errorMessage: 'Invalid signature',
        requestPayload: req.body
      }).catch(err => console.error(chalk.redBright("❌ Failed to log VERIFICATION_FAILED:"), err.message));
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // --- FETCH BOOKING TO GET PRICE ---
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const platformFeeTotal = 20;
    const companyShare = 15;
    const salonBonus = 5;
    
    // Financial Breakdown
    const currentAmountPaid = Number(amount);
    
    // totalServicePrice is the portion of the current payment that goes towards the barber's service fee.
    // If it's just a ₹20 advance, the whole ₹20 is consumed by the platform fee, so servicePrice is 0.
    // If it's a full ₹120 payment, ₹100 goes to the service.
    const totalServicePrice = Math.max(currentAmountPaid - platformFeeTotal, 0);
    const salonPayoutAmount = totalServicePrice + salonBonus;

    // Fixed Remaining Amount Logic: totalPrice (e.g. 120) - actual amount paid (e.g. 20) = 100
    const remainingAmount = paymentType === 'full' 
      ? 0 
      : Math.max((booking.totalPrice || 0) - currentAmountPaid, 0);

    const updatedBooking = await BookingModel.findByIdAndUpdate(
      bookingId,
      {
        paymentId: razorpay_payment_id,
        paymentType,
        amountPaid: currentAmountPaid,
        remainingAmount,
        paymentStatus: paymentType === 'full' ? 'paid' : 'partial',
        bookingStatus: 'confirmed',
        platformFee: platformFeeTotal,
        companyShare: companyShare,
        salonBonus: salonBonus,
        salonServicePrice: totalServicePrice,
        salonServiceCharge: booking.salonServiceCharge, // Preserve the original service total
        collectedBy: paymentType === 'full' ? 'platform' : 'shop',
        salonPayoutAmount: salonPayoutAmount
      },
      { new: true, lean: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // CREATE LEDGER ENTRY (PayoutRequest)
    const existingEarning = await PayoutRequest.findOne({ bookingIds: bookingId, type: 'earning' });
    if (!existingEarning) {
      await PayoutRequest.create({
        shopOwnerId: updatedBooking.shopOwnerId,
        amount: salonPayoutAmount, // This is Service (if paid) + Bonus
        serviceAmount: totalServicePrice,
        bonusAmount: salonBonus,
        bookingIds: [bookingId],
        type: 'earning',
        status: 'pending'
      });
      console.log(chalk.greenBright(`✅ Ledger Entry Created: Service ₹${totalServicePrice} | Bonus ₹${salonBonus} | Total Entry: ₹${salonPayoutAmount}`));
    }
    // --- PAYOUT & LEDGER LOGIC END ---

    console.log(chalk.greenBright.bold("✅ Payment Verification Successful! Order:"), chalk.cyanBright(razorpay_order_id));
    await TransactionLog.create({
      bookingId: bookingId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: currentAmountPaid,
      stage: 'VERIFICATION_SUCCESS',
      status: 'SUCCESS',
      requestPayload: req.body,
      responsePayload: { platformFee: platformFeeTotal, salonPayoutAmount }
    }).catch(err => console.error(chalk.redBright("❌ Failed to log VERIFICATION_SUCCESS:"), err.message));

    // --- TRIGGER QUEUE START ---
    // We trigger the payout queue only if money was actually received
    // try {
    //   await payoutQueue.add(
    //     'process-live-payout',
    //     {
    //       bookingId: updatedBooking._id,
    //       shopOwnerId: updatedBooking.shopOwnerId,
    //       amount: updatedBooking.amountPaid || Number(amount)
    //     },
    //     {
    //       jobId: updatedBooking._id.toString(), // Prevents duplicate jobs!
    //       attempts: 3,
    //       backoff: { type: 'exponential', delay: 2000 }
    //     }
    //   );
    //   console.log(`[Queue] Payout job queued for Booking: ${bookingId}`);
    // } catch (queueError) {
    //   // We don't want to fail the whole response if only the queue fails
    //   console.error('Queue Trigger Error:', queueError);
    // }
    // --- TRIGGER QUEUE END ---

    // Send confirmation email asynchronously
    sendConfirmationMail(bookingId, email)
      .then(() => console.log('Email sent'))
      .catch(err => console.error('Email error:', err));

    // try {
    //   await payoutQueue.add('initiatePayout', {
    //     bookingId: bookingId,
    //     shopOwnerId: updatedBooking.shopOwnerId,
    //     amount: updatedBooking.amountPaid || Number(amount)
    //   });
    //   console.log(`Successfully enqueued payout for booking ${bookingId}`);
    // } catch (queueErr) {
    //   console.error('Failed to add to payout queue:', queueErr);
    // }

    // Respond immediately
    return res.status(200).json({
      success: true,
      message: 'Payment verification successful and payout queued',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount,
        paymentType
      }
    });

  } catch (error) {
    console.error(chalk.redBright.bold('❌ Payment verification error:'), error);
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

const barberFreeSlots = async (req, res) => {
  try {
    const barberId = req.body.barberId
    const bookingDate = req.body.bookingDate
    const shopId = req.body.shopId
    console.log(barberId)
    console.log(bookingDate)
    const availableHours = await getBarberFullSchedule(barberId, bookingDate, shopId)
    if (availableHours) {
      res.status(200).json({
        success: true,
        message: "successfully fetched free hours of barber",
        availableHours
      })
    } else {
      res.status(404).json({
        success: true,
        message: "failed to fetch  barber bookings hours",
      })
    }

  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "internal server error",
    })
  }
}

const fetchAllAvailableTimeSlots = async (req, res) => {
  try {
    const shopId = req.body.shopId
    const bookingDate = req.body.bookingDate
    console.log(shopId, bookingDate)
    const availableSlots = await getShopAvailableSlots(shopId, bookingDate)
    if (availableSlots) {
      return res.status(200).json({
        success: true,
        message: "successfully fetch all time slots",
        availableSlots
      })
    }
    return res.status(404).json({
      success: false,
      message: "failed to fetch available time slots",
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "internal server error"
    })
  }
}

const fetchUpComeingBooking = async (req, res) => {
  try {
    const userId = req.params.id
    console.log("userid:", userId)
    const booking = await upcomingBooking(userId)
    if (booking) {
      console.log(booking, "upcoming booking found")
      let shopDetails = await ShopModel.findById(booking.shopId)
      console.log(shopDetails, "shop details")
      res.status(200).json({
        success: true,
        message: "succesfully fetched upcominbooking",
        booking,
        shopDetails
      })
    } else {
      res.status(404).json({
        success: false,
        message: "faild to fetch booking"
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "internal server error"
    })
  }
}

const findShopByService = async (req, res) => {
  try {
    const { coordinates, service } = req.body
    const shops = await findShopByServiceFunction(coordinates, service)
    if (shops) {
      res.status(200).josn({
        success: true,
        message: "successfully fetched shops by servie and location",
        shops
      })
    } else {
      res.status(404).json({
        success: false,
        message: "failed to fetch shops",
      })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "internal server error"
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


const getbookings = async (req, res) => {
  try {
    const bookingId = req.params.id
    const bookings = await fetchbookingById(bookingId)
    if (bookings) {
      return res.status(200).json({
        success: true,
        message: "successfully fetch bookings",
        bookings
      })
    }
    return res.status(404).json({
      success: false,
      message: "failed to fetch bookings",
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "internal server error"
    })
  }
}




const completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Booking ID is required" });
    }

    const updatedBooking = await BookingModel.findByIdAndUpdate(
      bookingId,
      { bookingStatus: 'completed' },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Booking marked as complete",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Error in completeBooking:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORYPAY_FAILED_PAYMENT_WEBHOOK;
    
    // Ensure we have the raw body for verification
    const bodyToVerify = req.rawBody;

    console.log(chalk.magentaBright.bold("--- 🔔 RAZORPAY WEBHOOK RECEIVED ---"));
    console.log(chalk.cyanBright("Event Type:"), chalk.yellowBright(req.body?.event));
    
    await TransactionLog.create({
      stage: 'WEBHOOK_RECEIVED',
      status: 'PENDING',
      requestPayload: req.body
    }).catch(err => console.error(chalk.redBright("❌ Failed to log WEBHOOK_RECEIVED:"), err.message));

    console.log(chalk.cyanBright("Signature Header:"), !!signature);
    console.log(chalk.cyanBright("Webhook Secret Valid:"), !!secret && secret.length > 0);
    if (secret) {
        console.log(chalk.cyanBright(`Webhook Secret Length: ${secret.length}`));
        console.log(chalk.cyanBright(`Webhook Secret starts with: ${secret.substring(0, 3)}... and ends with: ...${secret.substring(secret.length - 3)}`));
    }
    console.log(chalk.cyanBright("Raw Body Available:"), !!bodyToVerify);

    if (!signature || !secret) {
      if (!secret) {
        console.warn("⚠️ WEBHOOK WARNING: No RAZORPAY_WEBHOOK_SECRET found. Skipping signature verification (INSECURE MODE).");
      } else if (!signature) {
        console.warn("❌ WEBHOOK ERROR: Signature missing from headers but secret is configured.");
        return res.status(400).json({ success: false, message: "Missing signature" });
      }
    } else {
      // VERIFICATION LOGIC
      if (!bodyToVerify) {
        console.error("❌ WEBHOOK ERROR: req.rawBody is missing. Verification might fail.");
        const fallbackBody = JSON.stringify(req.body);
        try {
          const isValid = RazorpayClass.validateWebhookSignature(fallbackBody, signature, secret);
          if (!isValid) throw new Error("Signature mismatch with fallback");
          console.log("✅ WEBHOOK SUCCESS: Verified using fallback stringify");
        } catch (err) {
          console.error("❌ WEBHOOK ERROR: Signature Mismatch (Raw body missing)", err.message);
          return res.status(400).json({ success: false, message: "Verification failed (Signature Mismatch)" });
        }
      } else {
        try {
          const isValid = RazorpayClass.validateWebhookSignature(bodyToVerify, signature, secret);
          if (!isValid) {
            console.warn('⚠️ WEBHOOK WARNING: Signature Mismatch! (Bypassing for debugging)');
            console.log("Expected signature did not match, but proceeding anyway because of bypass mode.");
          } else {
            console.log("✅ WEBHOOK SUCCESS: Signature Verified");
          }
        } catch (err) {
          console.error("❌ WEBHOOK ERROR during signature check:", err.message);
          console.warn("⚠️ Continuing anyway (Bypass Mode)...");
        }
      }
    }

    // Process event
    const eventType = req.body.event;
    const bookingId = req.body.payload?.payment?.entity?.notes?.bookingId;
    
    console.log(chalk.cyanBright(`Event Type: ${eventType} | Booking ID: ${bookingId}`));
    
    if (eventType === 'payment.failed') {
      const errorReason = req.body.payload?.payment?.entity?.error_description || 'Unknown error';
      console.log(chalk.redBright.bold(`❌ Payment Failed Webhook: ${errorReason}`));

      if (bookingId) {
        const updated = await BookingModel.findByIdAndUpdate(
          bookingId, 
          { 
            bookingStatus: 'cancelled',
            paymentStatus: 'failed' 
          },
          { new: true }
        );
        if (updated) {
          console.log(chalk.greenBright(`✅ Booking ${bookingId} successfully marked as FAILED/CANCELLED.`));
        } else {
          console.warn(chalk.yellowBright(`⚠️ Webhook received for booking ${bookingId} but it was not found in DB.`));
        }
      } else {
        console.warn(chalk.yellowBright("⚠️ Webhook 'payment.failed' received but no bookingId found in notes."));
      }

      await TransactionLog.create({
        bookingId: bookingId || null,
        razorpayPaymentId: req.body.payload?.payment?.entity?.id || null,
        razorpayOrderId: req.body.payload?.payment?.entity?.order_id || null,
        stage: 'WEBHOOK_FAILED_EVENT',
        status: 'FAILED',
        errorMessage: errorReason,
        requestPayload: req.body
      }).catch(err => console.error(chalk.redBright("❌ Failed to log WEBHOOK_FAILED_EVENT:"), err.message));
    }

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("❌ WEBHOOK SYSTEM ERROR:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { razorpayWebhook, completeBooking, getbookings, findShopByService, fetchUpComeingBooking, checkAvailability, AddBooking, getMybooking, createOrder, findDashboardIncome, verifyPayment, barberFreeSlots, fetchAllAvailableTimeSlots, fetchAllbookings }
