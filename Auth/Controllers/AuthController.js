const asyncHandler = require("express-async-handler");
const { registerUserUseCase,loginuserUsecause,registerShoperUseCase,loginShoperUsecause,sendOtpmobileNo,verifyOtpFunction } = require("../UseCauses/userUseCause");
const decorder = require("../../TokenDecoder/Decoder");
const {getUserProfile} = require("../Repos/userRepo")
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');

const userRegistration = asyncHandler(async (req,res)=>{
    const data = req.body;
    const result = await registerUserUseCase(data);
    console.log(result,"user registartion")
    res.json({
        success:true,
        message:"User registration successfull",
        result
    })
});
 
const userLogin = asyncHandler(async (req,res)=>{
        const data = req.body;
        console.log(data,"data")
        const user = await loginuserUsecause(data)
        console.log(user,"token")
        console.log(user,"token")
        res.json({
            success:true,
            message:"login Data",
            result:user
        })
})
const ShopRegister = asyncHandler (async (req,res)=>{
    const data = req.body;
    console.log(data)
    const shop = await registerShoperUseCase(data);
    res.json({
        success:true, 
        message:"User registration successfull",
        shop
    })
})
const login = asyncHandler(async(req,res)=>{
    const data = req.body;
    console.log(data,"data")
    const user = await loginShoperUsecause(data)
    console.log(user,"token")
    res.json({
        success:true,
        message:"login Data",
        result:user
    })
})
const userModel = require('../Model/UserModel')
const getUsers = asyncHandler(async(req,res)=>{
    let users = await userModel.find({})
    res.json(users)
})

const getProfile = asyncHandler(async (req, res) => {
    let token = req.headers['authorization']?.split(' ')[1]; // Get token from the Authorization header
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    } 
  try {
    let tokenData = await decorder(token);
    console.log(tokenData, "tokenData in getProfile");
    let userData = await getUserProfile(tokenData);
    res.json({
        success: true,
        message: "User profile fetched successfully",
        user: userData})
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
);

const otpRequest = async  (req,res) => {
    try {
        const mobileNo = req.body.mobileNo
        let otp = await sendOtpmobileNo(mobileNo)
        console.log(otp,"otp")
        if(otp){
            res.status(200).json({
                success:true,
                message:"otp is send to email"
            })
        }else{
            res.status(404).json({
                success:false,
                message:"faild to generate otp"
            })
        }
    } catch (error) {
        return res.status(401).json({ message: 'internal server error' })
    }
}

const verifyOtp = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    let { otp } = req.body;

    if (!mobileNo) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (!otp || isNaN(otp)) {
      return res.status(400).json({ success: false, message: "OTP is required and must be a number" });
    }

    otp = Number(otp); // safe now

    const result = await verifyOtpFunction(otp, mobileNo);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        token: result.token
      });
    }

    return res.status(400).json({ success: false, message: result.message });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


module.exports = {userRegistration,userLogin,ShopRegister,login,getUsers,getProfile,otpRequest,verifyOtp}