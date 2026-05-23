const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (val) {
          return val.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  district: String,
  state: {
    type: String,
    default: 'Kerala',
  },
}, {
  timestamps: true,
});

citySchema.index({ location: '2dsphere' });

const City = mongoose.model('City', citySchema);

module.exports = City;   // ✅ Use this instead
