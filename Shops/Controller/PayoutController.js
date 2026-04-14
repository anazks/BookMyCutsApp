const express = require('express');
const axios = require('axios');
require('dotenv').config();
const PayoutAccount = require("../Model/ShopOwnerPayoutAccount");
const Booking = require('../../Booking/Models/BookingModel');
const Decoder = require('../../TokenDecoder/Decoder')
const jwt = require('jsonwebtoken');
const secretkey = process.env.secretKey;
const PayoutRequest = require("../Model/PayoutRequest");
const payoutQueue = require('../../Booking/Controler/PayoutQueue');

// Prepare Basic Auth for Razorpay
const RAZORPAY_SECRET = process.env.RAZORPAYX_KEY_SECRET;
const RAZORPAY_KEY = process.env.RAZORPAYX_KEY_ID;
const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64')}`;

const upsertPayoutAccount = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, ifsc } = req.body;
    console.log(req.body, "DATA")
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

    // --- STEP 2: CREATE/LINK RAZORPAY FUND ACCOUNT ---
    let razorpayFundAccountId = null;

    // ALWAYS create a fresh fund account link if we are updating, 
    // to ensure it matches the current credentials in .env
    if (true) {
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

    console.log("ACCOUNT:", account)

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
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, secretkey);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Token is invalid" });
    }

    const shopOwnerId = decoded.id;

    // 1. Fetch ALL PayoutRequests for calculations
    const allPayoutRequests = await PayoutRequest.find({ shopOwnerId });

    // 2. Calculate SETTLED and PENDING totals from Ledger (PayoutRequests)
    let totalSettledAmount = 0;
    let totalPendingAmount = 0;
    let totalPendingBonus = 0;

    allPayoutRequests.forEach(p => {
      // SETTLED: Money that has successfully reached the bank
      if (p.status === 'settled') {
        if (p.type === 'withdrawal') {
            totalSettledAmount += (p.amount || 0);
        } else if (p.type === 'earning') {
            // To prevent double counting: Only count 'settled' earnings 
            // if they were NOT part of a withdrawal (Legacy/Instant payout case)
            // In the manual system, settled earnings are always part of a withdrawal.
            // We can check if they are standalone by seeing if they were ever marked 'processing' 
            // or if the shop logic allows individual settlement.
            // For now, let's assume if it's an earning and it's settled, it's counted 
            // ONLY if there is no parent withdrawal. 
            // Actually, a simpler way: totalSettledAmount = Sum of all withdrawal.settled 
            // + sum of all earning.settled that are NOT linked to any withdrawal.
            
            // However, to keep it simple and consistent with your manual system:
            // The master withdrawal record is the source of truth for settled funds.
        }
      }
      // PENDING EARNINGS: Individual earnings ready to be withdrawn
      else if (p.type === 'earning' && p.status === 'pending') {
        totalPendingAmount += (p.serviceAmount || 0);
        totalPendingBonus += (p.bonusAmount || 0);
      }
      // PENDING WITHDRAWALS: Requests already submitted but not yet in bank
      else if (p.type === 'withdrawal' && (p.status === 'pending' || p.status === 'processing')) {
        // You might want to show this in a separate bucket called "In Transit"
        // For now, let's keep totalEarnings as the sum of everything earned.
      }
    });

    // 3. Total Earnings tracked in PayoutRequests (Settled + Pending + In-Transit)
    const totalEarnings = allPayoutRequests
      .filter(p => p.type === 'earning' && p.status !== 'failed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // 4. Fetch Paginated Payout History (with optional filtering)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // Optional status filter

    const query = { shopOwnerId };
    if (status) query.status = status;

    const totalPayouts = await PayoutRequest.countDocuments(query);
    const payoutHistory = await PayoutRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        totalSettledAmount,
        totalPendingAmount,
        totalPendingBonus,
        pagination: {
          total: totalPayouts,
          page,
          limit,
          totalPages: Math.ceil(totalPayouts / limit)
        },
        payoutHistory
      }
    });

  } catch (error) {
    console.error("Earnings API Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const fetchBankDetails = async (req, res) => {
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

    const account = await PayoutAccount.findOne({ shopOwnerId });

    if (!account) {
      return res.status(404).json({ success: false, message: "Bank details not found for this shop owner" });
    }

    return res.status(200).json({
      success: true,
      message: "Bank details fetched successfully",
      account: account,
    });

  } catch (error) {
    console.error("Fetch Bank Details Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const requestWithdrawal = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, secretkey);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Token is invalid" });
    }
    const shopOwnerId = decoded.id;

    // 1. Get all individual 'earning' records that are 'pending'
    const pendingEarnings = await PayoutRequest.find({
      shopOwnerId,
      type: 'earning',
      status: 'pending'
    });

    if (!pendingEarnings || pendingEarnings.length === 0) {
      return res.status(400).json({ success: false, message: "No pending earnings found to withdraw" });
    }

    // 2. Calculate total amount and collect booking IDs
    let totalWithdrawable = 0;
    const bookingIds = [];
    const earningIds = [];

    pendingEarnings.forEach(record => {
      totalWithdrawable += (record.amount || 0);
      if (record.bookingIds && record.bookingIds.length > 0) {
        bookingIds.push(...record.bookingIds);
      }
      earningIds.push(record._id);
    });

    if (totalWithdrawable <= 0) {
      return res.status(400).json({ success: false, message: "Withdrawable amount must be greater than 0" });
    }

    // 3. Create a NEW 'withdrawal' type PayoutRequest record (The Master record)
    const payoutRequest = await PayoutRequest.create({
      shopOwnerId,
      amount: totalWithdrawable,
      bookingIds,
      status: 'pending',
      type: 'withdrawal'
    });

    // 4. Mark individual earnings as 'processing' (they are now part of a pending withdrawal)
    const updateResult = await PayoutRequest.updateMany(
      { _id: { $in: earningIds } },
      { $set: { status: 'processing' } }
    );
    console.log(`[Withdrawal] Updated ${updateResult.modifiedCount} individual earning records to 'processing' status.`);

    // 5. Add TO PAYOUT QUEUE
    try {
      await payoutQueue.add(
        'process-manual-withdrawal',
        { payoutRequestId: payoutRequest._id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true
        }
      );
      console.log(`🚀 [Queue] Withdrawal job added for Request: ${payoutRequest._id}`);
    } catch (queueError) {
      console.error('❌ BullMQ Queue Error:', queueError);
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawal: {
        id: payoutRequest._id,
        amount: totalWithdrawable,
        status: payoutRequest.status
      }
    });

  } catch (error) {
    console.error("Request Withdrawal Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const updatePayoutAccount = async (req, res) => {
  try {
    const { shopOwnerId } = req.params; // Usually passed in URL
    const { accountHolderName, accountNumber, ifsc, user } = req.body;

    // 1. Find existing account
    let account = await PayoutAccount.findOne({ shopOwnerId });
    if (!account) {
      return res.status(404).json({ message: "Payout account not found" });
    }

    // 2. Check if bank details have changed
    const isBankDetailsChanged = 
      account.accountNumber !== accountNumber || 
      account.ifsc !== ifsc;

    let razorpayContactId = account.razorpayContactId;
    let razorpayFundAccountId = account.razorpayFundAccountId;

    // 3. If Bank Details changed, we need a NEW Fund Account
    if (isBankDetailsChanged) {
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
        console.error("Razorpay Update Error:", err.response?.data);
        return res.status(400).json({
          message: "Failed to update bank details with Razorpay",
          error: err.response?.data?.error?.description
        });
      }
    }

    // 4. Update Database
    const updatedAccount = await PayoutAccount.findOneAndUpdate(
      { shopOwnerId },
      { 
        $set: { 
          accountHolderName, 
          accountNumber, 
          ifsc, 
          razorpayFundAccountId // Update to the new ID
        } 
      },
      { new: true }
    );

    // Mask for security
    const maskedNumber = "****" + updatedAccount.accountNumber.toString().slice(-4);

    return res.status(200).json({
      message: "Payout account updated successfully",
      account: { ...updatedAccount.toObject(), accountNumber: maskedNumber }
    });

  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = { updatePayoutAccount,upsertPayoutAccount, getEarningsSummary, fetchBankDetails, requestWithdrawal };