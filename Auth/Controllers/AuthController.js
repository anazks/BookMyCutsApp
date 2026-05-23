const asyncHandler = require("express-async-handler");
const { registerUserUseCase, loginuserUsecause, registerShoperUseCase, loginShoperUsecause, sendOtpmobileNo, verifyOtpFunction, verifyGoogleIdToken, adminLoginUsecause, refreshAccessTokenUseCase } = require("../UseCauses/userUseCause");
const decorder = require("../../TokenDecoder/Decoder");
const { getUserProfile, deleteUserFunction, getAllShopOwners, updatePassword, fetchUsers, findUserById, modifyShopOwner, deleteShopOwner, getNearestCities } = require("../Repos/userRepo")
constm = require('bcryptjs')
const jwt = require('jsonwebtoken');
const otpModel = require('../Model/OtpModel')
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs')
const Booking = require('../../Booking/Models/BookingModel')
const AdminModel = require('../Model/AdminModel')
const User = require('../Model/UserModel')
const { sendAndSaveNotification } = require('../../utils/notificationHelper')
const Notification = require('../Model/Notification')



const userRegistration = asyncHandler(async (req, res) => {
  const data = req.body;
  const result = await registerUserUseCase(data);
  console.log(result, "user registartion")
  res.json({
    success: true,
    message: "User registration successfull",
    result
  })
});

const userLogin = asyncHandler(async (req, res) => {
  try {
    const result = await loginuserUsecause(req.body);

    if (result) {
      return res.status(200).json({
        success: true,
        message: result.message || "Login successful",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } if (result === 0) {
      res.json({
        success: false,
        message: "authentication failed"

      })
    } else {

    } {
      res.status(401).json({
        success: false,
        message: result.message || "Authentication failed"
      });
    }



  } catch (error) {
    console.error("userLogin controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      // error: error.message   // ← uncomment only during development
    });
  }
});



const ShopRegister = asyncHandler(async (req, res) => {
  const data = req.body;
  console.log(data)
  const shop = await registerShoperUseCase(data);
  res.json({
    success: true,
    message: "User registration successfull",
    shop
  })
})
const login = asyncHandler(async (req, res) => {
  const data = req.body;

  const result = await loginShoperUsecause(data);

  // ❌ Handle errors FIRST
  if (!result.success) {
    return res.status(result.statusCode || 400).json({
      success: false,
      message: result.message,
    });
  }

  // ✅ Success response
  res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.userData,
  });
});

const userModel = require('../Model/UserModel');
const ShoperModel = require("../Model/ShoperModel");
const Decoder = require("../../TokenDecoder/Decoder");
const { error } = require("console");
const { LookupRequestWithCorId } = require("twilio/lib/rest/lookups/v2/query");


const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page)
    const limit = parseInt(req.query.page)
    const users = await fetchUsers(page, limit)
    res.status(200).json({
      success: true,
      message: "succesfully fetched users",
      users
    })
  } catch (error) {
    console.error('failed to fetch users', error)
  }
}

const getProfile = asyncHandler(async (req, res) => {
  let token = req.headers['authorization']?.split(' ')[1];

  console.log("token received:", token);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const tokenData = await decorder(token);
    console.log("tokenData:", tokenData);

    const userData = await getUserProfile(tokenData);

    return res.json({
      success: true,
      message: "User profile fetched successfully",
      user: userData
    });

  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
});


const otpRequest = async (req, res) => {
  try {
    const data = req.body
    let otp = await sendOtpmobileNo(data)
    console.log(otp, "otp")
    if (otp) {
      res.status(200).json({
        success: true,
        message: "otp is send to email"
      })
    } else {
      res.status(404).json({
        success: false,
        message: "failed to generate otp"
      })
    }
  } catch (error) {
    return res.status(401).json({ message: 'internal server error' })
  }
}

const verifyOtp = async (req, res) => {
  try {
    let { mobileNo, otp, role } = req.body

    if (!mobileNo) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (!otp || isNaN(otp)) {
      return res.status(400).json({ success: false, message: "OTP is required and must be a number" });
    }

    otp = Number(otp); // safe now

    const result = await verifyOtpFunction(otp, mobileNo, role);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    }

    return res.status(400).json({ success: false, message: result.message });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id
    const deleteUser = await deleteUserFunction(userId)
    if (deleteUser) {
      res.status(200).json({
        success: true,
        message: 'successfully deleted the user'
      })
    }
    res.status(400).json({
      success: false,
      message: "failed to delete user"
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: 'internal server error'
    })
  }
}

const viewAllShopOwners = async (req, res) => {
  try {
    // Get page and limit from query params, with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate page and limit
    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive integers",
      });
    }

    const { shopOwners, totalShopOwners } = await getAllShopOwners(page, limit);
    console.log("shop Owner:", shopOwners)
    console.log("totalShopOwner:", totalShopOwners)
    const totalPages = Math.ceil(totalShopOwners / limit);

    res.status(200).json({
      success: true,
      message: "Shop owners fetched successfully",
      shopOwners
    });
  } catch (error) {
    console.error("Error in viewAllShopOwners:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


const sendForgotPasswordOtp = async (email, otp, expiryMinutes = 5) => {
  try {
    // Create transporter (Gmail example with app password)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'anazksunil2@gmail.com',
        pass: 'gefdcystfetieztk' // replace with your Gmail App Password (no spaces)
      }
    });

    // Mail content
    const mailOptions = {
      from: '"BookMyCuts" <anazksunil2@gmail.com>',
      to: email,
      subject: 'Reset Your Password – BookMyCuts',
      html: `
        <h2>Reset Password OTP ✂️</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password.</p>
        <p><strong>🔑 Your OTP is:</strong> <span style="font-size: 20px;">${otp}</span></p>
        <p>This OTP is valid for <strong>${expiryMinutes} minutes</strong>.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <br/>
        <p>Regards,<br/>BookMyCuts Team</p>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to: ${email}`);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
  }
};

const OTP_DIGITS = 6;
const OTP_VALIDITY_MINUTES = 5;       // matches your 300s TTL index
const OTP_COOLDOWN_MINUTES = 2;       // prevent spam / rapid requests
// ────────────────────────────────────────────────

/**
 * Generate 6-digit OTP using crypto.randomBytes (compatible with Node < 14.10)
 * @returns {string} 6-digit string, always padded with leading zeros if needed
 */
function generateOtp() {
  // 3 bytes → 24 bits → values up to ~16M, enough for 1M range
  const buf = crypto.randomBytes(3);
  const num = buf.readUIntBE(0, 3);           // big-endian unsigned int
  const inRange = num % 1000000;              // 0 .. 999999
  return inRange.toString().padStart(OTP_DIGITS, '0');
}

const forgotPassword = async (req, res) => {
  try {
    const { email, role, mobileNo } = req.body;

    // ─── Input validation ───────────────────────────────────────
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required',
      });
    }

    if (!['user', 'shopper'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed: user, shopper',
      });
    }

    // Choose model
    const UserModel = role === 'user' ? userModel : ShoperModel;

    // Only check existence (anti-enumeration protection)
    const userExists = await UserModel.exists({ email: email.toLowerCase() });

    // Generic success message (prevents leaking whether email exists)
    const genericSuccess = {
      success: true,
      message: 'If the account exists, an OTP has been sent.',
    };

    if (!userExists) {
      // Optional: small random delay to frustrate timing attacks
      await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 700)));
      return res.status(200).json(genericSuccess);
    }

    // ─── Cooldown check (anti-spam) ─────────────────────────────
    const cooldownMs = OTP_COOLDOWN_MINUTES * 60 * 1000;

    const recentOtp = await otpModel.findOne({
      $or: [
        { email: email.toLowerCase() },
        ...(mobileNo ? [{ mobileNo: mobileNo.trim() }] : [])
      ],
      createdAt: { $gte: new Date(Date.now() - cooldownMs) }
    })
      .sort({ createdAt: -1 })
      .lean();

    if (recentOtp) {
      const retryAfterSec = Math.ceil(
        (recentOtp.createdAt.getTime() + cooldownMs - Date.now()) / 1000
      );

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait before trying again.',
        retryAfter: retryAfterSec > 0 ? retryAfterSec : 30,
      });
    }

    // ─── Generate & store OTP ───────────────────────────────────
    const otp = generateOtp();                    // ← secure string "123456"
    const otpNumeric = Number(otp);               // your schema expects Number

    await otpModel.create({
      email: email.toLowerCase(),
      mobileNo: mobileNo ? mobileNo.trim() : undefined,
      otp: otpNumeric,
      createdAt: new Date(),
    });

    // ─── Send OTP (email or SMS) ────────────────────────────────
    try {
      if (mobileNo && mobileNo.trim()) {
        // Implement SMS sending here when ready
        // sendOtpViaSms(mobileNo, otp).catch(e => console.error(e));
        console.log(`[SMS OTP] → ${mobileNo} : ${otp}`);
      } else {
        // Run in background without awaiting to prevent API delay
        sendForgotPasswordOtp(email, otp, OTP_VALIDITY_MINUTES)
          .catch((sendErr) => console.error('OTP delivery failed in background:', sendErr));
      }
    } catch (setupErr) {
      console.error('OTP setup failed:', setupErr);
    }

    return res.status(200).json(genericSuccess);

  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
};


const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, role, otp } = req.body;

    // ─── 1. Basic validation ───────────────────────────────────────
    if (!email || !role || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email, role and OTP are required',
      });
    }

    if (!['user', 'shopper'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Allowed: user, shopper',
      });
    }

    if (!Number.isInteger(Number(otp)) || String(otp).length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be a 6-digit number',
      });
    }

    const otpNumber = Number(otp);

    // ─── 2. Find the OTP document ──────────────────────────────────
    const otpRecord = await otpModel.findOne({
      email: email.toLowerCase(),
      otp: otpNumber,
    }).sort({ createdAt: -1 }); // get the most recent one

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // ─── 3. Check if OTP is still valid (TTL already deletes, but extra safety) ──
    const now = Date.now();
    const createdTime = otpRecord.createdAt.getTime();
    const ageInSeconds = (now - createdTime) / 1000;

    if (ageInSeconds > 300) { // 5 minutes
      await otpRecord.deleteOne(); // cleanup
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }

    // ─── 4. OTP is valid → find the user ───────────────────────────
    const UserModel = role === 'user' ? userModel : ShoperModel;

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Rare case: user was deleted after OTP was sent
      await otpRecord.deleteOne();
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // ─── 5. Success – delete OTP so it can't be reused ─────────────
    await otpRecord.deleteOne();

    // Optional: You can generate a reset token here instead of sending user data
    // Example: const resetToken = jwt.sign({ id: user._id, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      // resetToken,             // ← send this if implementing password reset link/token
      // userId: user._id,       // or minimal info
      // email: user.email,
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    console.log(req.body)
    const { role, password, email } = req.body

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = await updatePassword(hashedPassword, email, role)
    if (user) {
      res.status(200).json({
        success: true,
        message: "successfully updated password",
        user
      })
    } else {
      res.status(404).json({
        success: false,
        message: "failed to update password",
      })
    }

  } catch (error) {
    console.log(error)
  }
}

const fetchUser = async (req, res) => {
  try {
    const userId = req.params.id
    const user = await findUserById(userId)
    if (user) {
      res.status(200).json({
        success: true,
        message: "successfully get user data",
        user
      })
    } else {
      res.status(404).json({
        success: false,
        message: "failed to get shop owner"
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "internal server error"
    })
  }
}

const removeShopOwner = async (req, res) => {
  try {
    const userId = req.params.id
    const user = await deleteShopOwner(userId)
    if (user) {
      res.status(200).json({
        success: true,
        message: "successfully deleted user",
        user
      })
    } else {
      res.status(404).json({
        success: false,
        message: "deletion failed"
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "internal server error"
    })
  }
}

const updateShopOwner = async (req, res) => {
  try {
    const userId = req.params.id
    const updatedData = req.body
    const shopOwner = await modifyShopOwner(userId, updatedData)
    if (shopOwner) {
      res.status(200).json({
        success: true,
        message: "successfully updated shop owner",
        shopOwner
      })
    } else {
      res.status(404).json({
        success: false,
        message: "failed to update shop owner"
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "internal server error"
    })
    console.log(error)
  }
}

const userGoogleSignin = async (req, res) => {
  try {
    const data = req.body
    console.log("REQUEST HIT THE BACKEND >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    const verified = await verifyGoogleIdToken(data)
    console.log(verified, "verified ")
    const { accessToken, refreshToken } = verified
    console.log(accessToken, "token >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    const user = {
      id: verified.data._id,
      firstName: verified.data.firstName,
      lastName: verified.data.lastName,
      email: verified.data.email,
      shopId: verified.data.shopId || null
    }
    console.log("user .................", user)
    if (verified) {
      res.status(200).json({
        success: true,
        message: "login successfully",
        accessToken,
        refreshToken,
        user
      })
    } else {
      res.status(404).json({
        success: false,
        message: "login failed",
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "interval server error"
    })
  }
}

const AdminRegistration = async (req, res) => {
  try {
    const data = req.body
    const password = data.password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    data.password = hashedPassword;  // assign properly
    const admin = await AdminModel.create(data);
    res.status(200).json({
      success: true,
      message: "successfull registered as admin",
      admin
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "internal server error"
    })
  }
}

const adminLogin = asyncHandler(async (req, res) => {
  try {
    const result = await adminLoginUsecause(req.body);

    if (result) {
      return res.status(200).json({
        success: true,
        message: result.message || "Login successful",
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.admin
      });
    } if (result === 0) {
      res.json({
        success: false,
        message: "authentication failed"

      })
    } else {

    } {
      res.status(401).json({
        success: false,
        message: result.message || "Authentication failed"
      });
    }



  } catch (error) {
    console.error("userLogin controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      // error: error.message   // ← uncomment only during development
    });
  }
});

const refreshToken = asyncHandler(async (req, res) => {
    try {
        const token = req.body.refreshToken;
        if (!token) {
            return res.status(400).json({ success: false, message: "Refresh Token is required" });
        }
        
        const result = await refreshAccessTokenUseCase(token);
        res.status(200).json({ success: true, accessToken: result.accessToken });
    } catch (error) {
        console.error("Refresh Token Error:", error.message);
        res.status(401).json({ success: false, message: error.message || "Invalid refresh token" });
    }
});


async function getNearbyCitiesController(req, res) {
  try {
    const { lat, lng } = req.query; // corrected here

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng are required'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const nearbyCities = await getNearestCities(userLat, userLng, 8);

    res.json({
      success: true,
      count: nearbyCities.length,
      userLocation: { lat: userLat, lng: userLng },
      data: nearbyCities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}


const saveNotificationToken = async (req, res) => {
  try {
    // 1. Extract the JWT from the Authorization Header
    const authHeader = req.headers.authorization;

    // Check if header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1]; // Get the actual token string

    // 2. Decode and Verify the User ID
    const secretKey = process.env.secretKey || "iamAnaz";
    const decoded = jwt.verify(token, secretKey);

    // Most JWTs store the ID in 'id' or 'userId'. Adjust based on your login payload.
    const userId = decoded.id || decoded.userId;

    // 3. Get the Push Token from Params (as per your code setup)
    const pushToken = req.params.token;

    // 4. Update the Model
    // We first try to find the ID in the userModel. 
    // Since MongoDB ObjectIds are unique, if it's not a user, it will return null.
    let userOrShop = await userModel.findByIdAndUpdate(
      userId,
      { PushToken: pushToken }, // Your model uses 'PushToken' (Capital P)
      { new: true }
    );

    // If not found in userModel, try ShoperModel
    if (!userOrShop) {
      userOrShop = await ShoperModel.findByIdAndUpdate(
        userId,
        { PushToken: pushToken },
        { new: true }
      );
    }

    if (!userOrShop) {
      return res.status(404).json({ message: "User or Shop Owner not found" });
    }

    res.status(200).json({
      success: true,
      message: "Push token saved successfully"
    });

  } catch (error) {
    console.log("Error in saveNotificationToken:", error);

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid Token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token Expired" });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
};

const sendArrivalCheckNotification = async (req, res) => {
  try {
    // 1. Get the userId directly from the URL
    const { userId } = req.params;

    // Optional: Get bookingId from the request body if the frontend sends it
    const { bookingId } = req.body;

    // 2. Find the user directly in the database
    const user = await User.findById(userId);

    // 3. Safety Check A: Does the user exist?
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // 4. Safety Check B: Does the user have a push token saved?
    if (!user.PushToken) {
      return res.status(400).json({
        success: false,
        message: 'This customer does not have notifications enabled.'
      });
    }

    // 5. Send the interactive push notification
    await sendAndSaveNotification({
      recipientId: user._id,
      accountType: 'User',
      pushToken: user.PushToken,
      title: 'Are you on your way? ✂️',
      body: 'Your barber is ready! Will you be arriving on time?',
      type: 'ARRIVAL_CHECK',
      // Pass the bookingId here so the user's phone knows which appointment to update
      data: { bookingId: bookingId || null },
      categoryId: 'arrival_check'
    });

    res.status(200).json({
      success: true,
      message: 'Arrival check sent to the customer successfully.'
    });

  } catch (error) {
    console.error('Error in sendArrivalCheckNotification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification to customer.',
      error: error.message
    });
  }
};

const fetchMyNotifications = async (req, res) => {
  try {
    // 1. Extract the Authorization header from the incoming request
    const authHeader = req.headers.authorization;

    // 2. Check if the token actually exists and is formatted correctly
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: No token provided.'
      });
    }

    // 3. Split the string "Bearer <token_string>" to get just the token
    const token = authHeader.split(' ')[1];

    // 4. Verify and decode the token using your secret key
    // Note: Ensure 'secretKey' exactly matches the casing in your .env file
    const decoded = jwt.verify(token, process.env.secretKey);

    // 5. Grab the ID straight from the decoded payload
    // (If you signed it as _id instead of id, change this to decoded._id)
    const documentId = decoded.id;

    // 6. Fetch directly using ONLY the recipientId. 
    const notifications = await Notification.find({ recipientId: documentId })
      .sort({ createdAt: -1 }) // Newest first
      .limit(30);              // Keep it fast by only loading the latest 30

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications.'
    });
  }
};


module.exports = { refreshToken, fetchMyNotifications, sendArrivalCheckNotification, getNearbyCitiesController, adminLogin, AdminRegistration, userGoogleSignin, updateShopOwner, removeShopOwner, resetPassword, verifyForgotPasswordOtp, forgotPassword, viewAllShopOwners, deleteUser, userRegistration, userLogin, ShopRegister, login, getUsers, getProfile, otpRequest, verifyOtp, fetchUser, saveNotificationToken }