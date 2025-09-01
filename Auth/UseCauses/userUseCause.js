const { createUser,findUser,createShoper,findShoper, saveOtp } = require("../Repos/userRepo");
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const asyncHandler = require("express-async-handler");
const otpModel = require('../Model/OtpModel')

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
    let user = await findUser({email: email}); // Fix: Pass an object with email property
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
    let userData = {
        firstName,
        mobileNo,
        city 
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
    let user = await findShoper(data)
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
    let userData ={
            firstName,
            mobileNo,
            city 
    }
    console.log(token)
    return {token,userData}
})

const sendOtpEmail = async (toEmail, otp) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'govindjayakumar858@gmail.com', // your Gmail
        pass: 'saku lgie gqou ofmt'     // use App Password if 2FA enabled
      }
    });

    // Email options
    const mailOptions = {
      from: 'govindjayakumar858@gmail.com',
      to: toEmail,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);

  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

module.exports.createAndSendOtp = async (email) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Normalize email
    const emailNormalized = email.trim().toLowerCase();

    // Save OTP in MongoDB
    await otpModel.create({ email: emailNormalized, otp, createdAt: new Date() });

    // Send OTP via email
    await sendOtpEmail(emailNormalized, otp);

    return otp;

  } catch (error) {
    console.error('Error creating or sending OTP:', error);
    throw error;
  }
};

module.exports.verifyOtpFunction = async (otp, email) => {
  try {
    const emailNormalized = email.trim().toLowerCase();
    otp = Number(otp);

    const otpData = await otpModel.findOne({ email: emailNormalized, otp });
    console.log("otpData from DB:", otpData);

    if (!otpData) {
      return { success: false, message: "Invalid OTP" };
    }

    const token = jwt.sign({ email: emailNormalized }, process.env.secretkey, { expiresIn: "1h" });

    return { success: true, token };
  } catch (error) {
    console.log("Error verifying OTP:", error);
    return { success: false, message: "Server error" };
  }
};
