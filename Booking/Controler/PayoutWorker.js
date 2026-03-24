const { Worker } = require('bullmq');
const axios = require('axios');
const BookingModel = require('../Models/BookingModel');
const PayoutAccount = require('../../Shops/Model/ShopOwnerPayoutAccount');

const RAZORPAY_KEY = process.env.RAZORPAYX_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAYX_KEY_SECRET;
const RAZORPAY_ACCOUNT = process.env.RAZORPAYX_ACCOUNT_NUMBER || "2323230064459950"; // Nodal Account Number
const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64')}`;

const connection = { url: process.env.REDIS_URL };

const payoutWorker = new Worker('PayoutQueue', async (job) => {
    console.log(`[WORKER] Processing payout for booking ${job.data.bookingId}`);
    try {
        const { bookingId, amount, shopOwnerId } = job.data;
        
        // 1. Get the shop's Razorpay Fund Account
        const account = await PayoutAccount.findOne({ shopOwnerId });
        
        if (!account || !account.razorpayFundAccountId) {
            throw new Error(`No Razorpay Fund Account for Shop Owner: ${shopOwnerId}`);
        }

        // 2. Deduct the Platform Fee (Rs 15 for the company)
        const platformFee = 15;
        const payoutAmountToBarber = amount - platformFee;

        // If amount paid is less than or equal to the platform fee, we do not wire any money 
        // to avoid Razorpay throwing errors for zero/negative amounts.
        if (payoutAmountToBarber <= 0) {
            console.log(`[WORKER] No payout needed for booking ${bookingId}. Amount paid (${amount}) covers platform fee only.`);
            await BookingModel.findByIdAndUpdate(bookingId, { payoutStatus: 'not_required' });
            return; // Job succeeds gracefully without calling Razorpay API
        }

        // 3. Convert to paise (e.g. Rs 5 -> 500 paise)
        const payoutAmountInPaise = Math.round(payoutAmountToBarber * 100);

        // 3. Initiate the payout to their fund account
        const payload = {
            account_number: RAZORPAY_ACCOUNT,
            fund_account_id: account.razorpayFundAccountId,
            amount: payoutAmountInPaise,
            currency: "INR",
            mode: "NEFT",
            purpose: "payout",
            notes: {
                booking_id: bookingId.toString()
            }
        };

        const response = await axios.post('https://api.razorpay.com/v1/payouts', payload, {
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
        });

        console.log(`[WORKER] Payout initiated successfully for booking ${bookingId}`);
        
        // 4. Update the DB to show the money is "in transit" (webhook handles final 'completed' state)
        await BookingModel.findByIdAndUpdate(bookingId, { payoutStatus: 'processing' });
        
        return response.data;

    } catch (err) {
        console.error(`[WORKER] Error in payout worker for booking ${job.data.bookingId}:`, err.response?.data || err.message);
        throw err; // Throws to BullMQ so it can retry the job
    }
}, { connection });

payoutWorker.on('completed', (job) => {
    console.log(`[WORKER] Job ${job.id} completed!`);
});

payoutWorker.on('failed', (job, err) => {
    console.error(`[WORKER] Job ${job.id} failed: ${err.message}`);
});

module.exports = payoutWorker;