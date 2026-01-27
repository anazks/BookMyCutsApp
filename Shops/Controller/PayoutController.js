const express = require('express')
const PayoutAccount = require("../Model/ShopOwnerPayoutAccount");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const upsertPayoutAccount = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, ifsc } = req.body;

    if (!accountHolderName || !accountNumber || !ifsc) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const shopOwnerId = req.shopOwnerId;

    let account = await PayoutAccount.findOne({ shopOwnerId });

    // Step 1: Create Razorpay Contact if missing
    let razorpayContactId = account?.razorpayContactId;
    if (!razorpayContactId) {
      const contact = await razorpay.contacts.create({
        name: accountHolderName,
        email: req.user.email,
        contact: req.user.mobileNo,
        type: "vendor", // shopOwner/barber as vendor
        reference_id: `${shopOwnerId}`,
      });

      razorpayContactId = contact.id;
    }

    // Step 2: Create Razorpay Fund Account if missing
    let razorpayFundAccountId = account?.razorpayFundAccountId;
    if (!razorpayFundAccountId) {
      const fundAccount = await razorpay.fundAccounts.create({
        contact_id: razorpayContactId,
        account_type: "bank_account",
        bank_account: {
          name: accountHolderName,
          ifsc: ifsc,
          account_number: accountNumber,
        },
      });

      razorpayFundAccountId = fundAccount.id;
    }

    // Step 3: Upsert DB
    if (account) {
      account.accountHolderName = accountHolderName;
      account.accountNumber = accountNumber;
      account.ifsc = ifsc;
      account.razorpayContactId = razorpayContactId;
      account.razorpayFundAccountId = razorpayFundAccountId;
      await account.save();

      return res.status(200).json({
        message: "Payout account updated successfully",
        account: {
          ...account.toObject(),
          accountNumber: "****" + account.accountNumber.slice(-4),
        },
      });
    }

    account = await PayoutAccount.create({
      shopOwnerId,
      accountHolderName,
      accountNumber,
      ifsc,
      razorpayContactId,
      razorpayFundAccountId,
    });

    return res.status(201).json({
      message: "Payout account created successfully",
      account: {
        ...account.toObject(),
        accountNumber: "****" + account.accountNumber.slice(-4),
      },
    });
  } catch (error) {
    console.error("Error in upsertPayoutAccount:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { upsertPayoutAccount };
