const express = require('express');
const router = express.Router();
const multer = require('multer')
const {viewMyshop,viewSingleShopBarbers,viewSingleShopService,myprofile,viewAllBookingOfShops,myShopProfile,AddShop,ViewAllShop,addService,ViewAllServices,addBarber,ViewAllBarbers,viewSigleShop,viewMyService,viewMyBarbers,updateBarber, deleteBarber,makePremium, getAllPremiumShops, saveBankDetails, viewbankDetails, deleteBankDetails, upadateBankdetails,editService, deleteService,findNearByShops,deleteShop,addProfileImage,deleteMedia,updateMediaDetails,search,fetchAllUniqueService,filterShopsByService,viewAllService} = require('../Controller/ShopController')
const {uploadMedia}  = require('../../Shops/CloudStorageCurds/CloudCurds')
const upload = require('../../Cloudinary/MulterConfig')
const WorkingHoursRoutes = require('../Router/WorkingHoursRoutes');
const { findShoper } = require('../../Auth/Repos/userRepo');

router.route('/addShop').post(AddShop)
router.route('/getMyProfile').get(myprofile)
router.route('/ViewAllShop').get(ViewAllShop)
router.route('/viewSigleShop').post(viewSigleShop)
router.route('/viewMyshop').get(viewMyshop) 
router.route('/viewMyBooking').get(viewAllBookingOfShops)
router.route('/findNearByShops').get(findNearByShops)
router.route('/deleteShop/:id').delete(deleteShop)
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
router.route('/deleteBarber/:id').delete(deleteBarber)

router.route('/premium').post(makePremium)
router.route('/getAllPremium').get(getAllPremiumShops)

router.route('/saveBankDetails/:id').post(saveBankDetails)
router.route('/viewBankDetails/:id').get(viewbankDetails)

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


router.use('/workingHours',WorkingHoursRoutes)



module.exports = router;