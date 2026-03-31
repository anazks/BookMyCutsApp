const { Worker } = require('bullmq');
require('dotenv').config();
const axios = require('axios');
const BookingModel = require('../Models/BookingModel');
const PayoutAccount = require('../../Shops/Model/ShopOwnerPayoutAccount');
const PayoutRequest = require('../../Shops/Model/PayoutRequest');

const RAZORPAY_KEY = process.env.RAZORPAYX_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAYX_KEY_SECRET;
const RAZORPAY_ACCOUNT = process.env.RAZORPAYX_ACCOUNT_NUMBER || "2323230064459950"; // Nodal Account Number
const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64')}`;

console.log("PayoutWorker Initialized with Key ID:", RAZORPAY_KEY ? `${RAZORPAY_KEY.substring(0, 8)}...` : "UNDEFINED");

const connection = require('../../Config/redisBull');

const payoutWorker = new Worker('PayoutQueue', async (job) => {
    console.log(`[WORKER] Processing payout for booking ${job.data.bookingId}`);
    try {
        const { bookingId, amount, shopOwnerId, payoutRequestId } = job.data;

        // --- NEW: Handle Manual Payout Request ---
        if (payoutRequestId) {
            console.log(`[WORKER] Processing manual withdrawal for request ${payoutRequestId}`);
            const payoutReq = await PayoutRequest.findById(payoutRequestId);
            if (!payoutReq || payoutReq.type !== 'withdrawal') {
                throw new Error(`PayoutRequest ${payoutRequestId} not found or invalid type`);
            }

            const sOwnerId = payoutReq.shopOwnerId;
            const account = await PayoutAccount.findOne({ shopOwnerId: sOwnerId });
            if (!account || !account.razorpayFundAccountId) {
                throw new Error(`No Razorpay Fund Account for Shop Owner: ${sOwnerId}`);
            }

            const payload = {
                account_number: RAZORPAY_ACCOUNT,
                fund_account_id: account.razorpayFundAccountId,
                amount: Math.round(payoutReq.amount * 100), // convert to paise
                currency: "INR",
                mode: "NEFT",
                purpose: "payout",
                notes: {
                    payout_request_id: payoutRequestId.toString()
                }
            };

            const response = await axios.post('https://api.razorpay.com/v1/payouts', payload, {
                headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
            });

            await PayoutRequest.findByIdAndUpdate(payoutRequestId, { 
                status: 'processing',
                razorpayPayoutId: response.data.id 
            });

            return response.data;
        }

        // --- OLD: Handle Single Booking Payout (Legacy/Instant) ---
        if (bookingId) {
            // 1. Get the shop's Razorpay Fund Account
            const account = await PayoutAccount.findOne({ shopOwnerId });
            // ... (rest of the existing logic)
            if (!account || !account.razorpayFundAccountId) {
                throw new Error(`No Razorpay Fund Account for Shop Owner: ${shopOwnerId}`);
            }

            const platformFee = 15;
            const payoutAmountToBarber = amount - platformFee;

            if (payoutAmountToBarber <= 0) {
                console.log(`[WORKER] No payout needed for booking ${bookingId}.`);
                await BookingModel.findByIdAndUpdate(bookingId, { payoutStatus: 'not_required' });
                return;
            }

            const payload = {
                account_number: RAZORPAY_ACCOUNT,
                fund_account_id: account.razorpayFundAccountId,
                amount: Math.round(payoutAmountToBarber * 100),
                currency: "INR",
                mode: "NEFT",
                purpose: "payout",
                notes: { booking_id: bookingId.toString() }
            };

            const response = await axios.post('https://api.razorpay.com/v1/payouts', payload, {
                headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
            });

            await BookingModel.findByIdAndUpdate(bookingId, { payoutStatus: 'processing' });
            return response.data;
        }

    } catch (err) {
        console.error(`[WORKER] Error in payout worker:`, err.response?.data || err.message);
        throw err;
    }
}, { connection });

payoutWorker.on('completed', (job) => {
    console.log(`[WORKER] Job ${job.id} completed!`);
});

payoutWorker.on('failed', (job, err) => {
    console.error(`[WORKER] Job ${job.id} failed: ${err.message}`);
});

module.exports = payoutWorker;