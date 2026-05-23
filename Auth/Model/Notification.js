// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 1. WHO receives it?
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'accountType' // This is the magic polymorphic link!
  },
  // 2. WHAT kind of account is receiving it?
  accountType: {
    type: String,
    required: true,
    enum: ['User', 'shopOwner'] // Must match your actual Mongoose Model names exactly
  },
  // 3. The Message
  title: { type: String, required: true },
  body: { type: String, required: true },
  
  // 4. Metadata (Crucial for routing in the app)
  type: { 
    type: String, 
    // e.g., 'NEW_BOOKING', 'BOOKING_CONFIRMED', 'PROMO'
    required: true 
  },
  data: { 
    type: Object, // Store things like { bookingId: "123" } here
    default: {} 
  },
  
  // 5. State
  isRead: { type: Boolean, default: false }
}, { 
  timestamps: true // Automatically creates 'createdAt' and 'updatedAt'
});

module.exports = mongoose.model('Notification', notificationSchema);