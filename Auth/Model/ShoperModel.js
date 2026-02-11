const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShopOwner = new Schema({
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
    email:{
        type : String,
        required : true,
        maxlenght : 100
    },
    city:{
        type : String,
    },
    password:{
        type : String,
    },
    role:{
        type:String,
        default:'shop'
    }
})

module.exports = mongoose.model('shopOwner',ShopOwner);