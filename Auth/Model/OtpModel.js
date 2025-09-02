const mongoose = require('mongoose')

const OtpSchema = new mongoose.Schema({
    mobileNo:{
        type:String,
        required:true
    },
    otp:{
        type:Number,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now,
        required:true,
        index:{expires:300}
    }
})

const otpModel = mongoose.model('otp',OtpSchema)
module.exports = otpModel