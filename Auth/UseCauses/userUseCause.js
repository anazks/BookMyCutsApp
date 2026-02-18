const { createUser,findUserByEmail ,createShoper,findShoper, saveOtp,isUserIsNew,findAdminByUserName } = require("../Repos/userRepo");
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const asyncHandler = require("express-async-handler");
const twilio = require("twilio");
const otpModel = require('../Model/OtpModel');
const ShoperModel = require("../Model/ShoperModel");
const UserModel = require("../Model/UserModel")
const { OAuth2Client } = require('google-auth-library');
const crypto = require("crypto");


const secretKey =  process.env.secretKey;



const generateReferralCode = async () => {
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const existingUser = await UserModel.findOne({ referralCode: code });
    if (!existingUser) isUnique = true;
  }

  return code;
};


const findReferrerByCode = async (referralCode) => {
  if (!referralCode) return null;

  const referrer = await UserModel.findOne({
    referralCode: referralCode.trim().toUpperCase()
  });

  console.log('REFERRER', referrer);

  if (!referrer) return null;

  return referrer._id;
};


module.exports.registerUserUseCase = async (data) => {
  const { password, referralCodeInput } = data;
  const newReferralCode = await generateReferralCode();
  let refUser = null;
  if (referralCodeInput) {
     refUser = await findReferrerByCode(referralCodeInput);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await createUser({
    ...data,
    password: hashedPassword,
    referralCode: newReferralCode,
    referredBy:refUser || null
  });

  return user;
};

// usecase / service layer
module.exports.loginuserUsecause = async (data) => {
    try {
        const { email, password } = data;

        if (!email || !password) {
            return {
                success: false,
                message: "Email and password are required"
            };
        }

        console.log(`Login attempt for email: ${email}`);

        const user = await findUserByEmail({ email });
        if (!user) {
            return {
                success: false,
                message: "User not found"
            };
        }

        // Safety check: prevent bcrypt crash if password field is missing/corrupted
        if (!user.password || typeof user.password !== 'string' || !user.password.startsWith('$2')) {
            console.error(`Invalid or missing password hash for user: ${email}`);
            return {
                success: false,
                message: "Invalid account credentials"
            };
        }

        let isMatch;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (bcryptErr) {
            console.error("bcrypt.compare failed:", bcryptErr.message);
            return {
                success: false,
                message: "Authentication error – please try again"
            };
        }

        if (!isMatch) {
            return {
                success: false,
                message: "Invalid password"
            };
        }

        // ── Successful login ────────────────────────────────────────────────
        const token = jwt.sign(
            { id: user._id.toString() },
            secretKey,
            { expiresIn: '1h' }
        );

        const userData = {
            id: user._id.toString(),
            firstName: user.firstName || '',
            mobileNo: user.mobileNo || '',
            city: user.city || ''
            // Add any other safe fields you want to return
        };

        return {
            success: true,
            message: "Login successful",
            token,
            user: userData
        };

    } catch (error) {
        console.error("loginuserUsecause error:", error);
        return {
            success: false,
            message: "Server error during login"
        };
    }
};

// Controller
const userLogin = asyncHandler(async (req, res) => {
    const data = req.body;
    console.log("Login request body:", data);

    const result = await loginuserUsecause(data);

    // We always return 200 with success flag (most common REST pattern for auth)
    // Alternative: use 401 for auth failures — choose your preference

    if (result.success) {
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: result.token,
            user: result.user
        });
    }

    // failed cases (user not found / wrong password)
    return res.status(401).json({
        success: false,
        message: result.message
    });
});

module.exports.registerShoperUseCase =asyncHandler (async(data)=>{
    let {password} = data ;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    data.password = hashedPassword;
    const shop = await createShoper(data);
    return shop;
})
module.exports.loginShoperUsecause = async (data) => {
  const result = await findShoper(data);
  const { user, shopId } = result;
  const { password } = data;

  if (!user) {
    return {
      success: false,
      statusCode: 401,
      message: "Invalid email",
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return {
      success: false,
      statusCode: 401,
      message: "Invalid password",
    };
  }

  const token = jwt.sign({ id: user._id }, secretKey, {
    expiresIn: "1h",
  });

  const { firstName, mobileNo, city, _id } = user;

  return {
    success: true,
    token,
    userData: {
      _id,
      firstName,
      mobileNo,
      city,
      shopId,
    },
  };
};


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

const CLIENT_ID = '805182446508-gvphqj7e7kigpreinncsi480u4dficea.apps.googleusercontent.com'; // ← Your WEB client ID
const client = new OAuth2Client(CLIENT_ID);   // ← this line was missing


module.exports.verifyGoogleIdToken = async (data) => {
  try {
    const idToken = data.idToken;
    const role = data.role || 'user'; // ✅ backward compatible

    if (!idToken) {
      throw new Error('idToken is required');
    }

    // 1️⃣ Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // 2️⃣ Common user data
    const userData = {
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      googleId: payload.sub,
      authProvider: 'google',
    };

    let account;

    // 3️⃣ Role-based DB handling
    if (role === 'user') {
      account = await UserModel.findOne({ email: userData.email });

      if (!account) {
        account = await UserModel.create(userData);
      }
    } 
    else if (role === 'shop') {
      account = await ShopOwnerModel.findOne({ email: userData.email });

      if (!account) {
        account = await ShopOwnerModel.create({
          ...userData,
          isProfileCompleted: false
        });
      }
    } 
    else {
      throw new Error('Invalid role');
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      { id: account._id, role },
      secretKey,
      { expiresIn: '1h' }
    );

    // 5️⃣ Unified return
    return {
      success: true,
      role,
      token,
      data: account
    };

  } catch (error) {
    console.error('Google Auth Error:', error);
    throw error; // let controller handle response
  }
};


module.exports.adminLoginUsecause = async (data) => {
    try {
        const { userName, password } = data;

        if (!userName || !password) {
            return {
                success: false,
                message: "Email and password are required"
            };
        }

        console.log(`Login attempt for userName: ${userName}`);

        const admin = await findAdminByUserName({ userName });
        if (!admin) {
            return {
                success: false,
                message: "admin not found"
            };
        }

        // Safety check: prevent bcrypt crash if password field is missing/corrupted
        if (!admin.password || typeof admin.password !== 'string' || !admin.password.startsWith('$2')) {
            console.error(`Invalid or missing password hash for user: ${admin}`);
            return {
                success: false,
                message: "Invalid account credentials"
            };
        }

        let isMatch;
        try {
            isMatch = await bcrypt.compare(password, admin.password);
        } catch (bcryptErr) {
            console.error("bcrypt.compare failed:", bcryptErr.message);
            return {
                success: false,
                message: "Authentication error – please try again"
            };
        }

        if (!isMatch) {
            return {
                success: false,
                message: "Invalid password"
            };
        }

        // ── Successful login ────────────────────────────────────────────────
        const token = jwt.sign(
            { id: admin._id.toString() },
            secretKey,
            { expiresIn: '1h' }
        );

        const userData = {
            id: admin._id.toString(),
            userName: admin.userName || '',
            password: admin.password || '',
            // Add any other safe fields you want to return
        };

        return {
            success: true,
            message: "Login successful",
            token,
            admin: userData
        };

    } catch (error) {
        console.error("loginuserUsecause error:", error);
        return {
            success: false,
            message: "Server error during login"
        };
    }
};

