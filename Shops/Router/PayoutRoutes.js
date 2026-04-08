const express = require('express');
const router = express.Router();
const {upsertPayoutAccount,getEarningsSummary,fetchBankDetails,requestWithdrawal,updatePayoutAccount} = require('../Controller/PayoutController')
const Booking = require('../../Booking/Models/BookingModel')
const PayoutRequest = require('../Model/PayoutRequest')
const crypto = require('crypto');
const RazorpayClass = require('razorpay');

router.route('/accounts').post(upsertPayoutAccount).get(fetchBankDetails).put(updatePayoutAccount)
router.route('/earnings').get(getEarningsSummary)

router.post('/razorpayx-webhook', async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const bodyToVerify = req.rawBody;

        console.log("--- RAZORPAYX PAYOUT WEBHOOK ATTEMPT ---");
        console.log("Signature Header:", !!signature);
        console.log("Webhook Secret Valid:", !!secret && secret.length > 0);
        if (secret) {
            console.log(`Webhook Secret Length: ${secret.length}`);
            console.log(`Webhook Secret starts with: ${secret.substring(0, 3)}... and ends with: ...${secret.substring(secret.length - 3)}`);
        }
        console.log("Raw Body Available:", !!bodyToVerify);

        if (!signature || !secret) {
            if (!secret) {
                console.warn("⚠️ PAYOUT WEBHOOK WARNING: No RAZORPAY_WEBHOOK_SECRET found. Skipping signature verification (INSECURE MODE).");
            } else if (!signature) {
                console.warn("❌ PAYOUT WEBHOOK ERROR: Signature missing from headers but secret is configured.");
                return res.status(400).json({ success: false, message: "Missing signature" });
            }
        } else {
            // VERIFICATION LOGIC
            if (!bodyToVerify) {
                console.error("❌ PAYOUT WEBHOOK ERROR: req.rawBody is missing. Verification might fail.");
                const fallbackBody = JSON.stringify(req.body);
                try {
                    const isValid = RazorpayClass.validateWebhookSignature(fallbackBody, signature, secret);
                    if (!isValid) throw new Error("Signature mismatch with fallback");
                    console.log("✅ PAYOUT WEBHOOK SUCCESS: Verified using fallback stringify");
                } catch (err) {
                    console.error("❌ PAYOUT WEBHOOK ERROR: Signature Mismatch (Raw body missing)", err.message);
                    return res.status(400).json({ success: false, message: "Verification failed (Signature Mismatch)" });
                }
            } else {
                try {
                    const isValid = RazorpayClass.validateWebhookSignature(bodyToVerify, signature, secret);
                    if (!isValid) {
                        console.warn('❌ PAYOUT WEBHOOK ERROR: Signature Mismatch');
                        return res.status(400).json({ success: false, message: 'Webhook verification failed: Signature mismatch' });
                    }
                    console.log("✅ PAYOUT WEBHOOK SUCCESS: Signature Verified");
                } catch (err) {
                    console.error("❌ PAYOUT WEBHOOK ERROR during signature check:", err.message);
                    return res.status(400).json({ success: false, message: "Signature verification error" });
                }
            }
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
