const mongoose = require("mongoose");

const PayoutRequestSchema = new mongoose.Schema(
  {
    shopOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shopOwner",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    bookingIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
    status: {
      type: String,
      enum: ["pending", "processing", "settled", "failed"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["earning", "withdrawal"],
      default: "earning",
    },
    razorpayPayoutId: String,
    utr: String,
    failureReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PayoutRequest", PayoutRequestSchema);
