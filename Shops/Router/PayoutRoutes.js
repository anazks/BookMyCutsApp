const express = require('express');
const router = express.Router();
const {upsertPayoutAccount,getEarningsSummary,fetchBankDetails,requestWithdrawal,updatePayoutAccount} = require('../Controller/PayoutController')
const Booking = require('../../Booking/Models/BookingModel')
const PayoutRequest = require('../Model/PayoutRequest')
const crypto = require('crypto');

router.route('/accounts').post(upsertPayoutAccount).get(fetchBankDetails).put(updatePayoutAccount)
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
        
        // Retrieve the IDs we safely stored in 'notes' during the worker phase
        const bookingId = payoutData.notes?.booking_id;
        const payoutRequestId = payoutData.notes?.payout_request_id;

        if (!bookingId && !payoutRequestId) {
            console.error("❌ Webhook Error: No booking_id or payout_request_id found in notes.");
            return res.status(200).send('Missing ID'); 
        }

        // ==========================================
        // 💰 EVENT 1: MONEY SUCCESSFULLY DEPOSITED
        // ==========================================
        if (event === 'payout.processed') {
            const utr = payoutData.utr; 

            if (payoutRequestId) {
                // Handle Manual Withdrawal Request (Master Record)
                const payoutReq = await PayoutRequest.findByIdAndUpdate(payoutRequestId, {
                    status: 'settled',
                    utr: utr
                });
                
                if (payoutReq && payoutReq.bookingIds.length > 0) {
                    await Booking.updateMany(
                        { _id: { $in: payoutReq.bookingIds } },
                        { $set: { payoutStatus: 'settled', utr: utr } }
                    );
                    
                    // Also mark any individual 'earning' records corresponding to these bookings as 'settled'
                    await PayoutRequest.updateMany(
                        { bookingIds: { $in: payoutReq.bookingIds }, type: 'earning' },
                        { $set: { status: 'settled', utr: utr } }
                    );
                }
                console.log(`✅ [WEBHOOK] Manual Withdrawal Settled! Request: ${payoutRequestId}`);
            } else if (bookingId) {
                // Handle Legacy Single Booking Payout
                await Booking.findByIdAndUpdate(bookingId, {
                    payoutStatus: 'settled',
                    utr: utr
                });
                console.log(`✅ [WEBHOOK] Payout Settled! Booking ${bookingId}`);
            }
        } 
        
        // ==========================================
        // ❌ EVENT 2: BANK REJECTED THE TRANSFER 
        // ==========================================
       else if (event === 'payout.rejected' || event === 'payout.reversed') {
             const reason = payoutData.failure_reason || 'Bank rejected the transfer';

             if (payoutRequestId) {
                 const payoutReq = await PayoutRequest.findByIdAndUpdate(payoutRequestId, {
                     status: 'failed',
                     failureReason: reason
                 });

                 if (payoutReq && payoutReq.bookingIds.length > 0) {
                     // Reset bookings to pending
                     await Booking.updateMany(
                         { _id: { $in: payoutReq.bookingIds } },
                         { $set: { payoutStatus: 'pending', failureReason: reason } }
                     );

                     // Reset individual earning records to pending so they show up in balance again
                     await PayoutRequest.updateMany(
                         { bookingIds: { $in: payoutReq.bookingIds }, type: 'earning' },
                         { $set: { status: 'pending' } }
                     );
                 }
                 console.log(`❌ [WEBHOOK] Manual Withdrawal Failed! Request: ${payoutRequestId}. Reason: ${reason}`);
             } else if (bookingId) {
                 await Booking.findByIdAndUpdate(bookingId, {
                     payoutStatus: 'failed',
                     failureReason: reason
                 });
                 console.log(`❌ [WEBHOOK] Payout Failed for Booking ${bookingId}`);
             }
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
