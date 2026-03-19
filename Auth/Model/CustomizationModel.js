const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomizationSchema = new Schema({
    textColor: {
        type: String,
        default: '#000000'
    },
    subTextColor: {
        type: String,
        default: '#666666'
    },
    backgroundImage: {
        type: String,
        default: ''
    },
    backgroundColor: {
        type: String,
        default: '#FFFFFF'
    }
}, { timestamps: true });

module.exports = mongoose.model('Customization', CustomizationSchema);
