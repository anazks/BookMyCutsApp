const express = require('express');
const router = express.Router();
const {upsertPayoutAccount,getEarningsSummary} = require('../Controller/PayoutController')
const Booking = require('../../Booking/Models/BookingModel')
const crypto = require('crypto');

router.route('/accounts').post(upsertPayoutAccount)
router.route('/earnings').get(getEarningsSummary)


router.post('/razorpayx-webhook', async (req, res) => {
    try {
        // 1. Get the signature from the headers
        const signature = req.headers['x-razorpay-signature'];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // 2. Cryptographically verify the signature
        // Note: We use JSON.stringify(req.body) to recreate the raw payload
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error("🚨 ALERT: Invalid Webhook Signature! Possible hacking attempt.");
            return res.status(400).send('Invalid signature');
        }

        // 3. Extract the event type and data
        const event = req.body.event;
        const payoutData = req.body.payload.payout.entity;
        
        // Retrieve the bookingId we safely stored in 'notes' during the worker phase
        const bookingId = payoutData.notes?.booking_id;

        if (!bookingId) {
            console.error("❌ Webhook Error: No booking_id found in notes.");
            return res.status(200).send('Missing booking ID'); // Still return 200 so Razorpay stops retrying
        }

        // ==========================================
        // 💰 EVENT 1: MONEY SUCCESSFULLY DEPOSITED
        // ==========================================
        if (event === 'payout.processed') {
            const utr = payoutData.utr; // The official Bank Reference Number!

            await Booking.findByIdAndUpdate(bookingId, {
                payoutStatus: 'completed',
                utr: utr
            });

            console.log(`✅ [WEBHOOK] Payout Settled! UTR: ${utr} saved to Booking ${bookingId}`);
        } 
        
        // ==========================================
        // ❌ EVENT 2: BANK REJECTED THE TRANSFER 
        // (e.g., Shop Owner gave a closed bank account number)
        // ==========================================
       else if (event === 'payout.rejected' || event === 'payout.reversed') {
             await Booking.findByIdAndUpdate(bookingId, {
                 payoutStatus: 'failed',
                 failureReason: payoutData.failure_reason || 'Bank rejected the transfer'
             });
             
             console.log(`❌ [WEBHOOK] Payout Failed for Booking ${bookingId}. Reason: ${payoutData.failure_reason}`);
        }

        // 4. ALWAYS return a 200 OK instantly. 
        // If you don't, Razorpay will think your server is down and spam you with retries!
        res.status(200).json({ status: "ok" });

    } catch (error) {
        console.error('Webhook Server Error:', error);
        // Return 500 only if your database actually crashed, so Razorpay tries again later
        res.status(500).send('Internal Server Error'); 
    }
});

module.exports = router
