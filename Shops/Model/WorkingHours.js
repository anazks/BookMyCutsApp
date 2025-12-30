const mongoose = require('mongoose')

const workingHoursSchema = new mongoose.Schema({
  shop: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Shop",
    required: true,
    unique: true  // one document per shop
  },
  days: [
    {
      day: { type: Number, required: true },  // 0 = Sun, 6 = Sat
      isClosed: { type: Boolean, default: false },
      open: Number,   // minutes from midnight
      close: Number,  // minutes from midnight
      breaks: [
        {
          start: Number,
          end: Number
        }
      ]
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('workingHours',workingHoursSchema);