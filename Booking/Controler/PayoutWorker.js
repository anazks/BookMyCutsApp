require('dotenv').config();
const { Worker } = require('bullmq');
const axios = require('axios')
const connection = require('../../Config/redisBull'); 
const Booking = require('../Models/BookingModel');
const PayoutAccount = require('../../Shops/Model/ShopOwnerPayoutAccount');

// 👈 NEW: Initialize Razorpay with your keys
// const razorpay = new Razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

const worker = new Worker('payout-queue', async (job) => {
    
    // 👈 CHANGE 1: Renamed the job to represent real payouts
    if (job.name === 'process-live-payout') { 
        const { bookingId } = job.data;
        
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new Error("Booking not found");

        console.log(`[RAZORPAY-X] Processing payout for Booking: ${bookingId}`);

        const account = await PayoutAccount.findOne({ shopOwnerId: booking.shopOwnerId });
        if (!account || !account.razorpayFundAccountId) {
            console.error("❌ No Bank Account Linked for owner");
            booking.payoutStatus = 'failed';
            await booking.save();
            return;
        }

        // ==========================================
        // 💰 PAYOUT CALCULATION LOGIC (Stays exactly the same)
        // ==========================================
        let totalBonus = 0;
        if (booking.services && booking.services.length > 0) {
            booking.services.forEach(service => { totalBonus += (service.bonus || 0); });
        } else {
            totalBonus = 5; 
        }

        const platformFee = 15; 
        const finalPayoutAmount = (booking.amountPaid || 0) - platformFee + totalBonus;
        // ==========================================

        // 👈 CHANGE 2: Convert Rupees to Paise (Razorpay requirement)
        const amountInPaise = finalPayoutAmount * 100;

        try {
            console.log(`[RAZORPAY-X] Sending ₹${finalPayoutAmount} to Bank...`);

            // ✅ NEW: Bypassing the SDK and hitting the Razorpay API directly
            const response = await axios.post('https://api.razorpay.com/v1/payouts', {
                account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER, 
                fund_account_id: account.razorpayFundAccountId,        
                amount: amountInPaise,
                currency: "INR",
                mode: "IMPS", 
                purpose: "payout",
                reference_id: booking._id.toString(), 
                queue_if_low_balance: true, 
                notes: { booking_id: booking._id.toString() }
            }, {
                // Axios handles the secure basic authentication automatically!
                auth: {
                    username: process.env.RAZORPAYX_KEY_ID,                          
                    password: process.env.RAZORPAYX_KEY_SECRET
                }
            });

            // Extract the data from the Axios response
            const payoutResponse = response.data;

            // Update DB to 'processing'
            booking.payoutStatus = 'processing'; 
            booking.payoutId = payoutResponse.id;
            booking.salonBonus = totalBonus;
            booking.salonPayoutAmount = finalPayoutAmount;

            await booking.save();

            console.log("📝 Updated Booking Data to Processing!"); 
            console.log(`✅ Payout Sent to Bank! Razorpay ID: ${payoutResponse.id}`);

        } catch (error) {
            // Axios errors are nested inside error.response.data
            console.error("❌ Razorpay API Error:", error.response?.data || error.message);
            booking.payoutStatus = 'failed';
            await booking.save();
        }
    }
}, {    
    connection 
});