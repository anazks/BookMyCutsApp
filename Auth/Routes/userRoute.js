const express = require('express');
const { userRegistration,userLogin,ShopRegister,login,getUsers,getProfile,otpRequest,verifyOtp,deleteUser,viewAllShopOwners,forgotPassword,verifyForgotPasswordOtp,resetPassword,} = require('../Controllers/AuthController');
const { verifyToken } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const router = express.Router(); 

router.route('/user/register').post(userRegistration)
router.route('/user/login').post(userLogin)
router.route('/user/getProfile').get(getProfile)

router.route('/shop/register').post(ShopRegister)
router.route('/shop/login').post(login)
router.route('/getAllUser').get(getUsers)
router.route('/deleteUser/:id').delete(deleteUser)
router.route('/otpRequest').post(otpRequest)
router.route('/verifyOtp').post(verifyOtp)

router.route('/viewAllShopOwners').get(viewAllShopOwners)
router.route('/forgot-password').post(forgotPassword)
router.route('/verify-forgot-otp').post(verifyForgotPasswordOtp)
router.route('/reset-password').post(resetPassword)

// router.route('/userLogin').post(userLogin)

module.exports = router;