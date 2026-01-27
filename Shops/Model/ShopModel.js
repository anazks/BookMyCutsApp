const mongoose = require('mongoose');
const shopOwner = require('../../Auth/Model/ShoperModel'); // adjust path

const ShopSchema = new mongoose.Schema(
  {
    ProfileImage:{
      type:String
    },
    ShopName: {
      type: String,
      required: true,
      trim: true
    },
    City: {
      type: String,
      required: true,
      trim: true
    },
    ExactLocation: {
      type: String,
      required: true
    },
    ExactLocationCoord: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    Mobile: {
      type: Number,
      validate: {
        validator: function (v) {
          return /^(\d{10})$/.test(v);
        },
        message: props => `${props.value} is not a valid mobile number!`
      }
    },
      media: {
        type: [{
            url: {
                type: String,
                required: true // The image URL is mandatory
            },
            title: {
                type: String,
                required: true // The title/caption is mandatory
            },
            description: {
                type: String,
                required: false // Description can be optional
            }
        }],
        required: false, // The array itself is optional
        default: [] // Good practice to default arrays to empty
    },
    ShopOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shopOwner",
      required: true
    },
    IsPremium: {
      type: Boolean,
      default: false
    },
    PremiumStartDate: {
      type: Date
    },
    PremiumEndDate: {
      type: Date
    }
  },
  { timestamps: true }
);

// ✅ Proper 2dsphere index
ShopSchema.index({ ExactLocationCoord: "2dsphere" });

const ShopModel = mongoose.model('Shop', ShopSchema);

module.exports = ShopModel;
