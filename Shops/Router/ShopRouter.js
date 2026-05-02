const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../../Middlewares/AuthMiddleWares/AuthMiddleWare');
const multer = require('multer')
const {migrateShopAudience, fetchBookingsByShop,viewMyshop,viewSingleShopBarbers,viewSingleShopService,myprofile,viewAllBookingOfShops,myShopProfile,AddShop,ViewAllShop,addService,ViewAllServices,addBarber,ViewAllBarbers,viewSigleShop,viewMyService,viewMyBarbers,updateBarber, deleteBarber,createPremiumOrder, verifyPremiumAndUpgrade, getAllPremiumShops, saveBankDetails, viewbankDetails, deleteBankDetails, upadateBankdetails,editService, deleteService,findNearByShops,deleteShop,addProfileImage,deleteMedia,updateMediaDetails,search,fetchAllUniqueService,filterShopsByService,viewAllService,editShop,getShop, fetchServicebyShop, fetchBarbersbyShop,viewService,delService,createAsBarber } = require('../Controller/ShopController')
const {uploadMedia}  = require('../../Shops/CloudStorageCurds/CloudCurds')
const upload = require('../../Cloudinary/MulterConfig')
const WorkingHoursRoutes = require('../Router/WorkingHoursRoutes');
const { findShoper } = require('../../Auth/Repos/userRepo');
const PayoutRoutes = require('../Router/PayoutRoutes')
const {upsertPayoutAccount} = require('../Controller/PayoutController');
const { getAllBookingsOfShop } = require('../Repo/ShopRepo');
const adminRoutes = require('../Router/AdminRoutes')
const ShopModel = require('../Model/ShopModel')
const Barabar = require('../Model/BarbarModel')
const City = require('../../Auth/Model/City')

// --- SHOP OWNER PROTECTED APIs ---
const shopAuth = [verifyToken, authorizeRoles('shop')];

router.route('/addShop').post(shopAuth, AddShop)
router.route('/getMyProfile').get(shopAuth, myprofile)
router.route('/viewMyshop').get(shopAuth, viewMyshop) 
router.route('/viewMyBooking').get(shopAuth, viewAllBookingOfShops)
router.route('/shop/:id').put(shopAuth, editShop)

// --- PUBLIC / COMMON APIs ---
router.route('/ViewAllShop').get(ViewAllShop)
router.route('/viewSigleShop').post(viewSigleShop)
router.route('/findNearByShops').get(findNearByShops)
router.route('/deleteShop/:id').delete(deleteShop) // Potentially admin/shop but left unprotected as per original logic unless specified
router.route('/shop/:id').get(getShop)
// Assuming this is a function
// router.route('/viewMyShop').get(viewMyShop) // Assuming this is a function
// router.route('/viewMyShop').get(myShopProfile)
// --- SHOP OWNER SERVICE APIs ---
router.route('/addService').post(shopAuth, addService)
router.route('/viewMyService').get(shopAuth, viewMyService)
router.route('/editService/:id').put(shopAuth, editService)
router.route('/deleteService/:id').delete(shopAuth, deleteService)

// --- PUBLIC SERVICE APIs ---
router.route('/ViewAllServices').get(ViewAllServices)
router.route('/viewSingleShopService/:id').get(viewSingleShopService)

router.route('/viewSingleShopBarbers/:id').get(viewSingleShopBarbers)

// --- SHOP OWNER BARBER APIs ---
router.route('/addBarber').post(shopAuth, addBarber)
router.route('/viewMyBarbers').get(shopAuth, viewMyBarbers)
router.route('/updateBarber/:id').put(shopAuth, updateBarber)
router.route('/deleteBarber/:id/:shopId').delete(shopAuth, deleteBarber)

// --- PUBLIC BARBER APIs ---
router.route('/ViewAllBarbers').get(ViewAllBarbers)

// --- SHOP OWNER PREMIUM APIs ---
router.route('/premium/order').post(shopAuth, createPremiumOrder)
router.route('/premium/verify').post(shopAuth, verifyPremiumAndUpgrade)
router.route('/getAllPremium').get(getAllPremiumShops)

// --- SHOP OWNER BANK DETAILS APIs ---
router.route('/saveBankDetails').post(shopAuth, saveBankDetails)
router.route('/viewBankDetails').get(shopAuth, viewbankDetails)
router.route('/deleteBankDetails/:id').delete(shopAuth, deleteBankDetails)
router.route('/updateBankdetails/:id').put(shopAuth, upadateBankdetails)

// --- SHOP OWNER CLOUD STORAGE APIs ---
router.route('/uploadMedia/:id').post(shopAuth, upload.single('file'), uploadMedia);  
router.route('/addProfileImage/:id').post(shopAuth, upload.single('file'), addProfileImage)
router.route('/deleteMedia/:id').delete(shopAuth, deleteMedia)
router.route('/updateMedia/:mediaId').put(shopAuth, updateMediaDetails)
router.route('/search').get(search)
router.route('/fetchAllUniqueService').get(fetchAllUniqueService)
router.route('/filterShopsByService').post(filterShopsByService)
router.route('/viewAllservice').get(viewAllService)
router.route('/bookings/:shopId').get(fetchBookingsByShop)
router.route('/service/:shopId').get(fetchServicebyShop)
router.route('/barbers/:shopId').get(fetchBarbersbyShop)




// --- ADDITIONAL PUBLIC APIs ---
router.route('/service').get(viewService)

// --- ADDITIONAL SHOP OWNER APIs ---
router.route('/service/:serviceId').delete(shopAuth, delService) // Protect delete service
router.route('/accounts').post(shopAuth, upsertPayoutAccount) // Protect payout accounts
router.route('/shop-owner/create-as-barber/:shopId').post(shopAuth, createAsBarber)


router.get('/cities', async (req, res) => {
  try {
const cities = await City.aggregate([
  {
    $project: {
      name: 1,
      lat: { $arrayElemAt: ["$location.coordinates", 1] },
      lon: { $arrayElemAt: ["$location.coordinates", 0] },
      _id: 0   // optional: remove _id if not needed
    }
  },
  { $sort: { name: 1 } }
]);     // sort alphabetically by name

    res.status(200).json({
      success: true,
      count: cities.length,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cities'
    });
  }
});

router.post('/debug/migrate-audience', migrateShopAudience);


 

router.use('/payout',PayoutRoutes)
router.use('/workingHours',WorkingHoursRoutes)
router.use('/admin',adminRoutes)

module.exports = router;