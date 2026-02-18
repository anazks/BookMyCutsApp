const express = require('express');
const router = express.Router();
const multer = require('multer')
const {fetchBookingsByShop,viewMyshop,viewSingleShopBarbers,viewSingleShopService,myprofile,viewAllBookingOfShops,myShopProfile,AddShop,ViewAllShop,addService,ViewAllServices,addBarber,ViewAllBarbers,viewSigleShop,viewMyService,viewMyBarbers,updateBarber, deleteBarber,makePremium, getAllPremiumShops, saveBankDetails, viewbankDetails, deleteBankDetails, upadateBankdetails,editService, deleteService,findNearByShops,deleteShop,addProfileImage,deleteMedia,updateMediaDetails,search,fetchAllUniqueService,filterShopsByService,viewAllService,editShop,getShop, fetchServicebyShop, fetchBarbersbyShop,viewService,delService,createAsBarber } = require('../Controller/ShopController')
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

router.route('/addShop').post(AddShop)
router.route('/getMyProfile').get(myprofile)
router.route('/ViewAllShop').get(ViewAllShop)
router.route('/viewSigleShop').post(viewSigleShop)
router.route('/viewMyshop').get(viewMyshop) 
router.route('/viewMyBooking').get(viewAllBookingOfShops)
router.route('/findNearByShops').get(findNearByShops)
router.route('/deleteShop/:id').delete(deleteShop)
router.route('/shop/:id').put(editShop)
router.route('/shop/:id').get(getShop)
// Assuming this is a function
// router.route('/viewMyShop').get(viewMyShop) // Assuming this is a function
// router.route('/viewMyShop').get(myShopProfile)
router.route('/addService').post(addService)
router.route('/viewMyService').get(viewMyService)
router.route('/ViewAllServices').get(ViewAllServices)
router.route('/viewSingleShopService/:id').get(viewSingleShopService) // Assuming this is a function
router.route('/editService/:id').put(editService)
router.route('/deleteService/:id').delete(deleteService)

router.route('/viewSingleShopBarbers/:id').get(viewSingleShopBarbers) // Assuming this is a function


router.route('/addBarber').post(addBarber)
router.route('/ViewAllBarbers').get(ViewAllBarbers)
router.route('/viewMyBarbers').get(viewMyBarbers)
router.route('/updateBarber/:id').put(updateBarber)
router.route('/deleteBarber/:id/:shopId').delete(deleteBarber)

router.route('/premium').post(makePremium)
router.route('/getAllPremium').get(getAllPremiumShops)

router.route('/saveBankDetails').post(saveBankDetails)
router.route('/viewBankDetails').get(viewbankDetails)

router.route('/deleteBankDetails/:id').delete(deleteBankDetails)
router.route('/updateBankdetails/:id').put(upadateBankdetails)

// cloude storage api
router.route('/uploadMedia/:id').post(upload.single('file'), uploadMedia);  
router.route('/addProfileImage/:id').post(upload.single('file'),addProfileImage)
router.route('/deleteMedia/:id').delete(deleteMedia)
router.route('/updateMedia/:mediaId').put(updateMediaDetails)
router.route('/search').get(search)
router.route('/fetchAllUniqueService').get(fetchAllUniqueService)
router.route('/filterShopsByService').post(filterShopsByService)
router.route('/viewAllservice').get(viewAllService)
router.route('/bookings/:shopId').get(fetchBookingsByShop)
router.route('/service/:shopId').get(fetchServicebyShop)
router.route('/barbers/:shopId').get(fetchBarbersbyShop)




router.route('/service').get(viewService)
router.route('/service/:serviceId').delete(delService)
router.route('/accounts').post(upsertPayoutAccount)

router.route('/shop-owner/create-as-barber/:shopId').post(createAsBarber)


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


 

router.use('/payout',PayoutRoutes)
router.use('/workingHours',WorkingHoursRoutes)
router.use('/admin',adminRoutes)






module.exports = router;