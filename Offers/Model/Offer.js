const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    offerLevel: {
        type: String,
        enum: ['shop', 'platform'],
        required: true
    },
    offerType: {
        type: String,
        enum: ['discount', 'bundle'],
        required: true
    },
    discountValue: {
        type: Number,
        default: 0 // Used if offerType is 'discount'
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        default: 'flat'
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: function() { return this.offerLevel === 'shop'; }
    },
    validUntil: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
