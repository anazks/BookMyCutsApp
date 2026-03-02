const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstName:{
        type : String,
        required : true,
        maxlenght : 40
    },
    lastName:{
        type : String,
        required : true,
        maxlenght : 100
    },
    mobileNo:{
        type : String,
        maxlenght : 100
    },
    city:{
        type : String,
    },
    password:{
        type : String,
    },
    email:{
        type : String,
        maxlenght : 100
    },
    role:{
        type:String,
        default:'user'
    },
    referralCode:{
        type:String
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    hasCompletedFirstBooking: {
        type: Boolean,
         default: false
    },
    referralCompletedCount: {
        type: Number,
        default: 0
    },
    referralDiscountAmount: {
        type: Number,
        default: 0
    }
})

module.exports = mongoose.model('User',UserSchema);