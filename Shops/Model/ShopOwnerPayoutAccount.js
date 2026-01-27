const mongoose = require("mongoose");

const ShopOwnerPayoutAccountSchema = new mongoose.Schema(
  {
    shopOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shopOwner",
      required: true,
      unique: true
    },

    accountHolderName: {
      type: String,
      required: true
    },

    accountNumber: {
      type: String,
      required: true,
      select: false
    },

    ifsc: {
      type: String,
      required: true
    },

    razorpayContactId: String,
    razorpayFundAccountId: String,

    kycStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ShopOwnerPayoutAccount",
  ShopOwnerPayoutAccountSchema
);
