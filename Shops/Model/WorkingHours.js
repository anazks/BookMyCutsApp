const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  shop: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Shop",
    required: true,
    unique: true  // one document per shop
  },
  days: [
    {
      day: { type: Number, required: true, min: 0, max: 6 },  // 0 = Sun, 6 = Sat
      isClosed: { type: Boolean, default: false },
      open: { 
        type: Number, 
        default: 540,   // 9 AM
        min: 0,
        max: 1439
      },   
      close: { 
        type: Number, 
        default: 1020,  // 5 PM
        min: 0,
        max: 1439
      },  
      breaks: [
        {
          start: { type: Number, min: 0, max: 1439 },
          end: { type: Number, min: 0, max: 1439 }
        }
      ]
    }
  ]
}, { 
  timestamps: true 
});

// Pre-save middleware to ensure all 7 days exist with default values
workingHoursSchema.pre('save', function(next) {
  if (this.isNew) { // Only for new documents
    // Create default days (0-6)
    const defaultDays = [];
    for (let day = 0; day < 7; day++) {
      defaultDays.push({
        day: day,
        isClosed: day === 0 || day === 6, // Closed on Sunday and Saturday by default
        open: 540,   // 9 AM
        close: 1020, // 5 PM
        breaks: []
      });
    }
    
    this.days = defaultDays;
  }
  next();
});

module.exports = mongoose.model('WorkingHours', workingHoursSchema);