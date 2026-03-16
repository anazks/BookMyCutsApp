const express = require('express');
const axios = require('axios');
const PayoutAccount = require("../Model/ShopOwnerPayoutAccount");
const Booking = require('../../Booking/Models/BookingModel'); 
const Decoder = require('../../TokenDecoder/Decoder')
const jwt = require('jsonwebtoken');
const secretkey = process.env.secretKey; 

// Prepare Basic Auth for Razorpay
const RAZORPAY_KEY = process.env.RAZORPAYX_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAYX_KEY_SECRET;
const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64')}`;

const upsertPayoutAccount = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, ifsc } = req.body;
    console.log(req.body ,"DATA")
    console.log(accountNumber

    )
    console.log
    // Validation
    if (!accountHolderName || !accountNumber || !ifsc) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const shopOwnerId = req.body.shopOwnerId;
    // if (!req.user || !req.user.email || !req.user.mobileNo) {
    //   return res.status(401).json({ message: "User profile information missing" });
    // }

    let account = await PayoutAccount.findOne({ shopOwnerId });

    // --- STEP 1: CREATE RAZORPAY CONTACT ---
    let razorpayContactId = account?.razorpayContactId;

    if (!razorpayContactId) {
      try {
        const contactResponse = await axios.post(
          'https://api.razorpay.com/v1/contacts',
          {
            name: accountHolderName,
            email: req.body.user.email,
            contact: req.body.user.mobileNo,
            type: "vendor",
            reference_id: String(shopOwnerId),
          },
          { headers: { Authorization: authHeader } }
        );
        razorpayContactId = contactResponse.data.id;
      } catch (err) {
        console.error("Razorpay Contact Error:", err.response?.data || err.message);
        return res.status(400).json({ 
          message: "Failed to create Razorpay contact", 
          error: err.response?.data?.error?.description || err.message 
        });
      }
    }

    // --- STEP 2: CREATE RAZORPAY FUND ACCOUNT ---
    let razorpayFundAccountId = account?.razorpayFundAccountId;

    // We check if the account exists but missing the fund account, OR if it's a new account
    if (!razorpayFundAccountId) {
      try {
        const fundResponse = await axios.post(
          'https://api.razorpay.com/v1/fund_accounts',
          {
            contact_id: razorpayContactId,
            account_type: "bank_account",
            bank_account: {
              name: accountHolderName,
              ifsc: ifsc,
              account_number: accountNumber,
            },
          },
          { headers: { Authorization: authHeader } }
        );
        razorpayFundAccountId = fundResponse.data.id;
      } catch (err) {
        console.error("Razorpay Fund Account Error:", err.response?.data || err.message);
        return res.status(400).json({ 
          message: "Failed to link bank account with Razorpay", 
          error: err.response?.data?.error?.description || err.message 
        });
      }
    }

    // --- STEP 3: DB UPSERT ---
    const updateData = {
      shopOwnerId,
      accountHolderName,
      accountNumber,
      ifsc,
      razorpayContactId,
      razorpayFundAccountId,
    };

    // findOneAndUpdate is cleaner for "upsert" logic
    account = await PayoutAccount.findOneAndUpdate(
      { shopOwnerId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    console.log("ACCOUNT:",account)

    // Mask account number for security in response
    const maskedNumber = "****" + account.accountNumber.toString().slice(-4);

    return res.status(200).json({
      message: "Payout account processed successfully",
      account: {
        ...account.toObject(),
        accountNumber: maskedNumber,
      },
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};

const getEarningsSummary = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: "Missing or invalid Authorization header. Expected 'Bearer <token>'" 
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, secretkey); 
    } catch (err) {
      console.error("❌ JWT Error:", err.message);
      return res.status(401).json({ success: false, message: "Token is invalid or expired" });
    }

    const shopOwnerId = decoded.id; 

    if (!shopOwnerId) {
      return res.status(400).json({ success: false, message: "Shop Owner ID not found in token" });
    }

    const bookings = await Booking.find({ 
      shopOwnerId: shopOwnerId,
      paymentStatus: { $in: ['paid', 'partial'] }, 
      bookingStatus: 'confirmed'
    }).sort({ createdAt: -1 }); 

    // 5. Set up our buckets
    let totalEarnings = 0;
    let settledAmount = 0;   
    let pendingAmount = 0;   
    let totalBonus = 0; // 💰 NEW: Bucket to track all bonuses combined

    // 6. Calculate the totals 
    bookings.forEach((booking) => {
      const amount = booking.salonPayoutAmount || booking.amountPaid || 0; 
      const bonus = booking.salonBonus || 0; // 💰 NEW: Extract bonus
      
      totalEarnings += amount;
      totalBonus += bonus; // 💰 NEW: Add to total

      if (booking.payoutStatus === 'completed') {
        settledAmount += amount;
      } else {
        pendingAmount += amount; 
      }
    });

    // 7. Get the last 5 transactions for the "Recent Activity" list
    const recentTransactions = bookings.slice(0, 5).map(b => ({
      bookingId: b._id,
      amount: b.salonPayoutAmount || b.amountPaid || 0,
      bonus: b.salonBonus || 0, // 💰 NEW: Send the specific bonus for this transaction
      status: b.payoutStatus || 'pending',
      date: b.createdAt,
      utr: b.utr || null
    }));

    // 8. Send the data to the React Native app
    return res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        settledAmount,
        pendingAmount,
        totalBonus, // 💰 NEW: Send total bonus to the frontend
        recentTransactions
      }
    });

  } catch (error) {
    console.error("Earnings API Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { upsertPayoutAccount,getEarningsSummary };