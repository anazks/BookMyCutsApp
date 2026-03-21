const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomizationSchema = new Schema({
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
