const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomizationSchema = new Schema({
    screen: {
        type: String,
        enum: ['home', 'booking'],
        default: 'home',
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    textColor: {
        type: String,
    },
    subTextColor: {
        type: String,
    },
    backgroundImage: {
        type: String,
    },
    backgroundColor: {
        type: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('Customization', CustomizationSchema);
