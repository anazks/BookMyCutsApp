const UserModel = require("../Model/UserModel")
const shoperModel = require('../Model/ShoperModel')
const asyncHandler = require("express-async-handler");
const { userLogin } = require("../Controllers/AuthController");
const otpModel = require("../Model/OtpModel");
const ShoperModel = require("../Model/ShoperModel");
const ShopModel = require("../../Shops/Model/ShopModel");

module.exports.createUser = asyncHandler(async (data)=>{
    try {
        console.log("saving user now")
        const user = await UserModel.create(data);
        console.log('user saved successful')
        return user
    } catch (error) { 
        console.error(error)
    }
})

module.exports.findUser = asyncHandler(async(data) => {
    let {email} = data;
    console.log(email, "email in rep####");
    return await UserModel.findOne({email: email});
});

module.exports.createShoper = asyncHandler(async (data)=>{
    return await shoperModel.create(data)
})
module.exports.findShoper = asyncHandler(async (data) => {
  const { email } = data;
  console.log(email, "email----------------------")
  const user = await shoperModel.findOne({ email });

  if (!user) {
    throw new Error("User not found");
  }
  const shop = await ShopModel.findOne({ ShopOwnerId: user._id });
 
  return {
    user,
    shopId: shop?._id ?? null,
  };
});
module.exports.getUserProfile = asyncHandler(async (data) => {
    try {
       let  user = await UserModel.findById({_id:data.id}); 
       return user;
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching profile' });
    }
}) 

module.exports.deleteUserFunction = async (userId) => {
    try {
        const user = UserModel.findByIdAndDelete(userId)
        return user
    } catch (error) {
        console.error(error)
    }
}

module.exports.getAllShopOwners = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

    // Fetch paginated shop owners and total count in parallel for efficiency
    const [shopOwners, totalShopOwners] = await Promise.all([
      ShoperModel.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }) // Optional: sort by newest first
        .lean(), // Use lean() for better performance if you don't need Mongoose docs

      ShoperModel.countDocuments(), // Total count for pagination metadata
    ]);

    return { shopOwners, totalShopOwners };
  } catch (error) {
    console.error("Error fetching shop owners:", error);
    throw error; // Let the controller handle the error response
  }
};

module.exports.updatePassword = async (password, email, role) => {
  try {
    let model;

    if (role === 'user') {
      model = UserModel;
    } else if (role === 'shopper') {
      model = ShoperModel;
    } else {
      throw new Error('Invalid role');
    }

    const updatedUser = await model.findOneAndUpdate(
      { email: email },           // 🔍 find by email
      { $set: { password } },     // 🔐 update password
      { new: true }               // return updated doc
    );

    return updatedUser;
  } catch (error) {
    console.error('Update password error:', error);
    throw error;
  }
};


