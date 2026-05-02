const mongoose = require('mongoose');

const transactionLogSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  razorpayOrderId: {
    type: String,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    index: true
  },
  amount: Number,
  currency: { type: String, default: 'INR' },
  stage: {
    type: String,
    enum: [
      'ORDER_CREATED',
      'ORDER_CREATION_FAILED',
      'VERIFICATION_ATTEMPT',
      'VERIFICATION_SUCCESS',
      'VERIFICATION_FAILED',
      'WEBHOOK_RECEIVED',
      'WEBHOOK_FAILED_EVENT'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    required: true
  },
  requestPayload: { type: mongoose.Schema.Types.Mixed },
  responsePayload: { type: mongoose.Schema.Types.Mixed },
  errorMessage: String,
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TransactionLog', transactionLogSchema);
