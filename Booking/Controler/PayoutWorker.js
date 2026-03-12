const { Worker } = require('bullmq');
const connection = require('../../Config/redisBull'); // FIX: ../Use the shared connection
const Booking = require('../Models/BookingModel');
const PayoutAccount = require('../../Shops/Model/ShopOwnerPayoutAccount');

// FIX: Name matches the queue exactly
const worker = new Worker('payout-queue', async (job) => {
    
    if (job.name === 'process-dummy-payout') {
        const { bookingId } = job.data;
        
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new Error("Booking not found");

        console.log(`[DUMMY] Processing payout for Booking: ${bookingId}`);

        // Simulate network delay
        await new Promise(res => setTimeout(res, 2000));

        const account = await PayoutAccount.findOne({ shopOwnerId: booking.shopOwnerId });
        if (!account || !account.razorpayFundAccountId) {
            console.error("❌ No Bank Account Linked for owner");
            booking.payoutStatus = 'failed';
            await booking.save();
            return;
        }

        // ==========================================
        // 💰 NEW: PAYOUT CALCULATION LOGIC
        // ==========================================
        
        let totalBonus = 0;

        // 1. Sum up the bonus for multiple services
        // Assuming your booking has an array of services: [{ name: 'Haircut', price: 120, bonus: 5 }]
        if (booking.services && booking.services.length > 0) {
            booking.services.forEach(service => {
                totalBonus += (service.bonus || 0);
            });
        } else {
            // Fallback just in case: If no services array, assume a flat bonus of 5
            totalBonus = 5; 
        }

        // 2. Define the Platform Fee 
        // (You can change this to be dynamic later, e.g., booking.amountPaid * 0.10)
        const platformFee = 15; 

        // 3. Calculate the Final Payout Amount
        // Math: Total Paid (120) - Platform Fee (15) + Total Bonus (5) = 110
        const finalPayoutAmount = (booking.amountPaid || 0) - platformFee + totalBonus;

        // ==========================================

        const mockResponse = {
            id: `pout_mock_${Math.random().toString(36).substring(7)}`,
            status: "processed",
            utr: `MOCKUTR${Date.now()}` 
        };

        // Update the "Source of Truth"
        booking.payoutStatus = 'completed';
        booking.payoutId = mockResponse.id;
        booking.utr = mockResponse.utr; 
        
        // Save our new calculated financial fields!
        booking.salonBonus = totalBonus;
        booking.salonPayoutAmount = finalPayoutAmount;

        await booking.save();

        console.log("📝 Updated Booking Data:\n", JSON.stringify(booking, null, 2)); 
        console.log(`[DUMMY] ✅ Payout settled! Transferred ₹${finalPayoutAmount} | UTR: ${mockResponse.utr}`);
    }
}, { 
    connection 
});