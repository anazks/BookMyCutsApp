const express = require('express');
const { adminLogin,userRegistration,userLogin,ShopRegister,login,getUsers,getProfile,otpRequest,verifyOtp,deleteUser,viewAllShopOwners,forgotPassword,verifyForgotPasswordOtp,resetPassword,fetchUser,removeShopOwner,updateShopOwner,userGoogleSignin,AdminRegistration,getNearbyCitiesController,saveNotificationToken,sendArrivalCheckNotification,fetchMyNotifications} = require('../Controllers/AuthController');
const { verifyToken } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const router = express.Router(); 

//USER AUTHETICATION APIs
router.route('/user/register').post(userRegistration)
router.route('/user/login').post(userLogin)

//SHOP OWNER AUTHENTICATION APIS
router.route('/shop/register').post(ShopRegister)
router.route('/shop/login').post(login)

//COMMON API FOR AUTENTTICATION 
router.route('/otpRequest').post(otpRequest)
router.route('/forgot-password').post(forgotPassword)
router.route('/verify-forgot-otp').post(verifyForgotPasswordOtp)
router.route('/reset-password').post(resetPassword)
router.route('/verifyOtp').post(verifyOtp)


//USER SIDE FRONTEND API 
router.route('/user/getProfile').get(getProfile)

//ADMIN PANEL USER's API
router.route('/getAllUser').get(getUsers)
router.route('/deleteUser/:id').delete(deleteUser)


//ADMIN PANEL SHOP OWNER API
router.route('/viewAllShopOwners').get(viewAllShopOwners)
router.route('/shop-owner/:id').get(fetchUser)
router.route('/shop-owner/:id').delete(removeShopOwner)
router.route('/shop-owner/:id').put(updateShopOwner)

router.route('/user/google-sigin').post(userGoogleSignin)

router.route('/admin-registration').post(AdminRegistration)
router.route('/admin-login').post(adminLogin)

router.route('/cities').get(getNearbyCitiesController)
router.post('/register-push-token/:token', saveNotificationToken);

router.post('/confirm-arrival/:userId',sendArrivalCheckNotification)
router.get('/notification',fetchMyNotifications)

// ADMIN / CUSTOM NOTIFICATION
const { sendCustomNotification } = require('../Controllers/NotificationController');
router.route('/send-notification').post(sendCustomNotification);

//CUSTOMIZATION API
const upload = require('../../Cloudinary/MulterConfig');
const { createCustomization, getCustomization } = require('../Controllers/CustomizationController');

router.route('/customization')
    .post(upload.single('backgroundImage'), createCustomization)
    .get(getCustomization);

module.exports = router;