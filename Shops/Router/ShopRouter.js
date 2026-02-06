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
const BarberModel = require('../Model/BarbarModel')
const ShopModel = require('../Model/ShopModel')

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


router.post('/migrate/shop-isActive', async (req, res) => {
  try {
    // Optional: Add authentication/authorization
    // if (!req.user.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
    
    console.log('Starting shop isActive migration...');
    
    // Get all shop IDs from barbers collection
    const barberShops = await BarberModel.aggregate([
      {
        $group: {
          _id: "$shopId",
          barberCount: { $sum: 1 }
        }
      }
    ]);
    
    const shopIdsWithBarbers = barberShops.map(b => b._id);
    console.log(`Found ${shopIdsWithBarbers.length} shops with barbers`);
    
    // Update shops WITH barbers to isActive: true
    const updateActive = await ShopModel.updateMany(
      { 
        _id: { $in: shopIdsWithBarbers },
        $or: [
          { isActive: { $exists: false } },
          { isActive: false }
        ]
      },
      { $set: { isActive: true } }
    );
    
    // Update shops WITHOUT barbers to isActive: false
    const allShopIds = await ShopModel.find({}, '_id');
    const allShopIdsStr = allShopIds.map(s => s._id.toString());
    
    // Find shops that don't have barbers
    const shopIdsWithoutBarbers = allShopIdsStr.filter(
      shopId => !shopIdsWithBarbers.includes(shopId)
    );
    
    const updateInactive = await ShopModel.updateMany(
      { 
        _id: { $in: shopIdsWithoutBarbers },
        $or: [
          { isActive: { $exists: false } },
          { isActive: true }
        ]
      },
      { $set: { isActive: false } }
    );
    
    // Get final counts
    const activeCount = await ShopModel.countDocuments({ isActive: true });
    const inactiveCount = await ShopModel.countDocuments({ isActive: false });
    const totalShops = await ShopModel.countDocuments();
    
    res.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        totalShops,
        activeShops: activeCount,
        inactiveShops: inactiveCount,
        updatedToActive: updateActive.modifiedCount,
        updatedToInactive: updateInactive.modifiedCount
      }
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

router.route('/service').get(viewService)
router.route('/service/:serviceId').delete(delService)
router.route('/accounts').post(upsertPayoutAccount)

router.route('/shop-owner/create-as-barber/:shopId').post(createAsBarber)


 

router.use('/payout',PayoutRoutes)
router.use('/workingHours',WorkingHoursRoutes)





module.exports = router;