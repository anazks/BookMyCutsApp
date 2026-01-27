const { createUser,findUser,createShoper,findShoper, saveOtp } = require("../Repos/userRepo");
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const asyncHandler = require("express-async-handler");
const twilio = require("twilio");
const otpModel = require('../Model/OtpModel');
const ShoperModel = require("../Model/ShoperModel");
const UserModel = require("../Model/UserModel")

const secretKey =  process.env.secretKey;



module.exports.registerUserUseCase = async (data)=>{
    let {password} = data ;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    data.password = hashedPassword;
    const user = await createUser(data);
    console.log(user,"user in usecase")
    return user;
}

module.exports.loginuserUsecause = async (data) => {
    let email = data.email;
    console.log(email, "email in usecause");
    // Problem: You're passing email directly, but findUser expects an object with email property
    let user = await findUser({email: email}); 
    // Check if user exists
    if (!user) {
        return {message: "User not found"};
    }
    
    let {password} = data;
    console.log(password, "---------", user);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return {message: "Invalid password",success:false}; // Password is incorrect
    }
    
    const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '1h' });
    let {firstName} = user;
    let {mobileNo} = user;
    let {city} = user;
    let {id} = user;
    let userData = {
        firstName,
        mobileNo,
        city,
        id
    };
    
    console.log(token);
    return {token, userData};
};

module.exports.registerShoperUseCase =asyncHandler (async(data)=>{
    let {password} = data ;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    data.password = hashedPassword;
    const shop = await createShoper(data);
    return shop;
})
module.exports.loginShoperUsecause = asyncHandler(async(data)=>{
    console.log(data,"data in usecase shoperlll")
    const result = await findShoper(data);
    if (!result?.shopId) {
      throw new Error("Shop ID missing");
    }
    const { user, shopId } = result;
    let {password} = data;
    console.log(user,"shoper")
    console.log(data,"---------0000")
    if(!user){
        return {message:"Invalid Email"}
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid password'); // Password is incorrect
    }
    const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
    let  {firstName} = user;
    let {mobileNo} = user;
    let {city} = user;
    let {_id} = user;
    let userData ={
            _id,
            firstName,
            mobileNo,
            city,
            shopId
    }
    console.log(token)
    return {token,userData}
})

module.exports.sendOtpmobileNo = async (data) => {
  // Input validation
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid input data provided');
  }
  const { mobileNo, role } = data;
  if (!mobileNo || typeof mobileNo !== 'string' || mobileNo.length < 10) {
    throw new Error('Invalid mobile number provided');
  }
  if (!role || (role !== 'user' && role !== 'shopper')) {
    throw new Error('Invalid role specified. Must be "user" or "shopper"');
  }

  // Twilio credentials (standardized names - update your Render env vars!)
  const accountSid = process.env.ACCOUNT_SID;
  const authToken = process.env.AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error('Twilio credentials missing! SID present:', !!accountSid, 'Token length:', authToken ? authToken.length : 0);
    throw new Error('Twilio configuration required - check environment variables');
  }

  const client = twilio(accountSid, authToken);

  let model;
  try {
    // Select model based on role
    if (role === 'user') {
      model = UserModel;
    } else if (role === 'shopper') {
      model = ShoperModel;
    }

    // Check if mobile exists
    const exists = await model.exists({ mobileNo });
    if (!exists) {
      throw new Error('The mobile number is not registered');
    }

    // Generate and store OTP with expiration
    const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
    await otpModel.create({
      mobileNo,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)  // Expires in 10 minutes
    });

    // Format phone number (basic; use libphonenumber-js for advanced)
    const formattedNumber = mobileNo.startsWith('+') ? mobileNo : `+91${mobileNo}`;

    // Send SMS
    await client.messages.create({
      body: `Your OTP is ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER || '+18573746399',  // Use env var for 'from' number
      to: formattedNumber,
    });

    // Return success with OTP (for testing; in prod, don't return OTP—use separate verify endpoint)
    return { success: true, otp };

  } catch (error) {
    console.error('Error sending OTP for mobile (anonymized):', mobileNo.substring(0, 3) + '...', error.message);
    throw error;  // Re-throw for caller (e.g., AuthController) to handle
  }
};

module.exports.verifyOtpFunction = async (otp, mobileNo,role) => {
  try {
    // const emailNormalized = email.trim().toLowerCase();
    otp = Number(otp);

    const otpData = await otpModel.findOne({ mobileNo, otp });
    console.log("otpData from DB:", otpData);

    if (!otpData) {
      return { success: false, message: "Invalid OTP" };
    }

    let model;
    if (role === "user") {
      model = UserModel;
    } else if (role === "shopper") {
      model = ShoperModel;
    } else {
      // Handle an invalid role, if necessary
      return "Invalid role specified";
    }
    const user = await model.findOne({mobileNo})
    console.log(user,"user fetching using mobile---------")
    
    

    const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour

    return { success: true, token };
  } catch (error) {
    console.log("Error verifying OTP:", error);
    return { success: false, message: "Server error" };
  }
};
