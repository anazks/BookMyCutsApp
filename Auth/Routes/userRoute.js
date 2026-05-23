const express = require('express');
const { refreshToken, adminLogin, userRegistration, userLogin, ShopRegister, login, getUsers, getProfile, otpRequest, verifyOtp, deleteUser, viewAllShopOwners, forgotPassword, verifyForgotPasswordOtp, resetPassword, fetchUser, removeShopOwner, updateShopOwner, userGoogleSignin, AdminRegistration, getNearbyCitiesController, saveNotificationToken, sendArrivalCheckNotification, fetchMyNotifications } = require('../Controllers/AuthController');
const { verifyToken, authorizeRoles } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const router = express.Router();

//USER AUTHETICATION APIs
router.route('/user/register').post(userRegistration)
router.route('/user/login').post(userLogin)

//SHOP OWNER AUTHENTICATION APIS
router.route('/shop/register').post(ShopRegister)
router.route('/shop/login').post(login)

//COMMON API FOR AUTENTTICATION 
router.route('/refresh-token').post(refreshToken)
router.route('/otpRequest').post(otpRequest)
router.route('/forgot-password').post(forgotPassword)
router.route('/verify-forgot-otp').post(verifyForgotPasswordOtp)
router.route('/reset-password').post(resetPassword)
router.route('/verifyOtp').post(verifyOtp)


//USER SIDE FRONTEND API 
// (Consolidated with protected profile route below)


//ADMIN PANEL USER'S API (Admin only)
router.route('/getAllUser').get(verifyToken, authorizeRoles('admin'), getUsers)
router.route('/deleteUser/:id').delete(verifyToken, authorizeRoles('admin'), deleteUser)


//ADMIN PANEL SHOP OWNER API (Admin only)
router.route('/viewAllShopOwners').get(verifyToken, authorizeRoles('admin'), viewAllShopOwners)
router.route('/shop-owner/:id')
    .get(verifyToken, authorizeRoles('admin', 'shop'), fetchUser) // Admin and Shop owner can view
    .delete(verifyToken, authorizeRoles('admin'), removeShopOwner) // Only Admin can remove
    .put(verifyToken, authorizeRoles('admin', 'shop'), updateShopOwner); // Admin and Shop owner can update


router.route('/user/google-signin').post(userGoogleSignin)

router.route('/admin-registration').post(AdminRegistration)
router.route('/admin-login').post(adminLogin)

router.route('/cities').get(getNearbyCitiesController)
router.post('/register-push-token/:token', saveNotificationToken);

router.post('/confirm-arrival/:userId', sendArrivalCheckNotification)
router.get('/notification', fetchMyNotifications)

// ADMIN / CUSTOM NOTIFICATION (Admin only)
const { sendCustomNotification } = require('../Controllers/NotificationController');
router.route('/send-notification').post(verifyToken, authorizeRoles('admin'), sendCustomNotification);

// COMMON ROUTE (All logged-in users)
router.route('/user/getProfile').get(verifyToken, getProfile)

//CUSTOMIZATION API (Admin and Shop)
const upload = require('../../Cloudinary/MulterConfig');
const { createCustomization, getCustomization } = require('../Controllers/CustomizationController');

router.route('/customization')
    .post(verifyToken, authorizeRoles('admin', 'shop'), upload.single('backgroundImage'), createCustomization)
    .get(getCustomization); // Public or common? Keeping it common logic

/**
 * RBAC FLOW SUMMARY:
 * Request → verifyToken (Authentication: Who are you?)
 *         → authorizeRoles (Authorization: Do you have permission?)
 *         → Controller (Action: Execution)
 */

module.exports = router;