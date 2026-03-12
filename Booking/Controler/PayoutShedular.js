const cron = require("node-cron");
const Razorpay = require("razorpay");
const BookingModel = require("../Models/BookingModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// run every 30 seconds
cron.schedule("*/30 * * * * *", async () => {
  console.log("\n==============================");
  console.log("⏰ Payout Scheduler Triggered:", new Date().toLocaleString());
  console.log("==============================");

  try {

    const pendingBookings = await BookingModel.find({
      payoutStatus: "pending",
      paymentStatus: "paid"
    });

    console.log("🔎 Pending bookings found:", pendingBookings.length);

    if (pendingBookings.length === 0) {
      console.log("⚠️ No pending payouts");
      return;
    }

    for (const booking of pendingBookings) {

      console.log("➡️ Processing booking:", booking._id);

      const platformFee = 20;
      const salonBonus = 5;

      const servicePrice = booking.totalPrice - platformFee;
      const payoutAmount = servicePrice + salonBonus;

      console.log("💰 Calculated payout:", payoutAmount);

      try {
        if (!razorpay.payouts) {
  console.log("Payout API not available in Razorpay SDK");
  return;
}

        const payout = await razorpay.payouts.create({
          account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
          fund_account_id: booking.fundAccountId,
          amount: payoutAmount * 100,
          currency: "INR",
          mode: "IMPS",
          purpose: "payout",
          reference_id: booking._id.toString(),
          narration: "Salon payout"
        });

        console.log("✅ Razorpay payout success:", payout.id);

        booking.payoutStatus = "completed";
        booking.payoutId = payout.id;
        booking.salonPayoutAmount = payoutAmount;

        await booking.save();

        console.log("📦 Booking updated:", booking._id);

      } catch (payoutError) {

        console.error("❌ Payout failed for booking:", booking._id);
        console.error(payoutError.message);

        booking.payoutStatus = "failed";
        await booking.save();
      }
    }

  } catch (error) {
    console.error("🚨 Scheduler error:", error.message);
  }
});