const ShopModel = require('../Model/ShopModel');
const ServiceModel = require('../Model/ServiceModel');
const BarberModel = require('../Model/BarbarModel');
const BookingModel = require('../../Booking/Models/BookingModel')

const UserModel = require('../../Auth/Model/UserModel')

const ShopperModel = require('../../Auth/Model/ShoperModel');
const BankDetailsModel = require('../Model/BankDetails');

module.exports.addShop = async (data) => {
    try {
       return await ShopModel.create(data);
    } catch (error) {
        console.log(error);
    }
}

module.exports.viewAllShops = async () => {
    try {
        return await ShopModel.find();
    } catch (error) {
        console.log(error);
    }
}

module.exports.addServices = async (data) => {
        try {
           return  await  ServiceModel.create(data); 
        } catch (error) {
            console.log(error);
        }
}
module.exports.viewAllServices = async () => {
    try {
       return await ServiceModel.find(); 
    } catch (error) {
        console.log(error);
    }
}
module.exports.addBarbers = async (data) => {
    try {
        return await BarberModel.create(data);
    } catch (error) {
        console.log(error);   
    }
}
module.exports.viewAllBarbers = async () => {
    try {
        return await BarberModel.find();
    } catch (error) {
        console.log(error);
    }
}
module.exports.getAShop = async(shopOwnerId)=>{
    try {
        return await ShopModel.find({_id:shopOwnerId})
    } catch (error) {
        console.log(error)
    }
}
module.exports.getMyService = async(id)=>{
    try {
        return await ServiceModel.find({shoperId:id})
    } catch (error) {
        console.log(error)
        res.json(false)   
    }
}
module.exports.getMyBarbers = async(id)=>{
    try {
        console.log("Fetching barbers for shop ID:", id);
        return await BarberModel.find({shoperId:id})
    } catch (error) {
        console.log(error)
        res.json(false)   
    }
}


module.exports.getAllBookingsOfShop = async (shopOwnerId) => {
  try {
    // Step 1: Find shops owned by the given shopOwnerId
    const shops = await ShopModel.find({ ShopOwnerId: shopOwnerId }).lean();

    // Step 2: Extract their _id values as strings
    const shopIds = shops.map(shop => shop._id.toString());

    if (shopIds.length === 0) {
      return []; // No shops found for this owner
    }

    // Step 3: Find bookings for those shop IDs
    const bookings = await BookingModel.find({
      shopId: { $in: shopIds }
    }).lean();

    // Step 4: Attach shopDetails to each booking
    const shopMap = {};
    shops.forEach(shop => {
      shopMap[shop._id.toString()] = shop;
    });

    // Step 5: Get all userIds from bookings
    const userIds = [...new Set(bookings.map(b => b.userId))]; // Remove duplicates

    // Step 6: Get all users for those IDs
    const users = await UserModel.find({
      _id: { $in: userIds }
    }).lean();

    // Step 7: Create a map for user lookup
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    // Step 8: Combine all data
    const bookingsWithDetails = bookings.map(booking => ({
      ...booking,
      shopDetails: shopMap[booking.shopId] || null,
      userDetails: userMap[booking.userId] || null
    }));

    return bookingsWithDetails;

  } catch (error) {
    console.error("Error in getAllBookingsOfShop:", error);
    return null;
  }
};

module.exports.getShopUser = async (shopId) => {
    try {
        return await ShopperModel.findById({_id:shopId});
    } catch (error) {
        console.log(error);
        return null;

    }
}
module.exports.getMyshop = async (shopOwnerId) => {
    try {
        console.log("Fetching shop for owner ID:", shopOwnerId);
        return await ShopModel.findOne({ShopOwnerId: shopOwnerId});
    } catch (error) {
        console.log(error);
        return null;
    }
}
module.exports.getShopService = async (shopId) => {
    try {
        console.log("Fetching services for shop ID:", shopId);
        return await ServiceModel.find({shopId: shopId});
    } catch (error) {
        console.log(error);
        return null;
    }
}
module.exports.getShopBarbers = async (shopId) => {
    try {
        console.log("Fetching barbers for shop ID:", shopId);
        return await BarberModel.find({shopId: shopId});
    } catch (error) {
        console.log(error);
        return null;
    }
}

module.exports.editBarberProfile = async (barberId,data) => {
    try {
        return await BarberModel.findByIdAndUpdate(barberId, data, {$set: data}, {new: true});
    } catch (error) {
        console.error(error)
    }
}

module.exports.deleteBarberFunction = async (barberId) => {
    try {
        return await BarberModel.findByIdAndDelete(barberId)
    } catch (error) {
        console.error(error)
    }
}

module.exports.makePremiumFunction = async (shopId,data) => {
    try {
        const premiumStartDate = new Date()
        const premiumEndDate = new Date(premiumStartDate)
        premiumStartDate.setDate(premiumStartDate.getDate() + 30)
        const premium = await ShopModel.findByIdAndUpdate(shopId,{
            IsPremium:true,
            PremiumStartDate:premiumStartDate,
            PremiumEndDate:premiumEndDate
        });
        return premium;
    } catch (error) {
        console.error(error)
    }
}

module.exports.getAllPremiumShopsFunction = async () => {
    try {
        return await ShopModel.find({IsPremium:true})
    } catch (error) {
        console.error(error)
    }
}

module.exports.saveBankDetailsFunction = async (data) => {
    try {
        return await BankDetailsModel.create(data)
    } catch (error) {
        console.error(error)
    }
}

module.exports.viewbankDetailsFunction = async (shoperId) => {
    try {
        const bank = await BankDetailsModel.findOne({ ShoperId: shoperId });
        return bank
    } catch (error) {
       console.error(error) 
    }
}

module.exports.deleteBankdetailsFunction = async (shoperId) => {
    try {
        const result = await BankDetailsModel.deleteOne({ ShoperId: shoperId });
        
        if (result.deletedCount > 0) {
            console.log('✅ Bank details deleted successfully');
        } else {
            console.log('⚠️ No bank details found for this ShoperId');
        }
    } catch (error) {
        console.error('❌ Error deleting bank details:', error);
    }
};


module.exports.updateBankDetailsFunction = async (shoperId,data) => {
    try {
        const Bank = await BankDetailsModel.findOneAndUpdate({ShoperId: shoperId}, data,{new:true})
        return Bank
    } catch (error) {
        console.error(error)
    }
}

module.exports.editServiceFunction = async (serviceId,data) => {
    try {
        const editedService = await  ServiceModel.findByIdAndUpdate(serviceId, {$set: data},{new:true})
        console.log(editedService,"edtited service")
        return editedService
    } catch (error) {
        console.error(error)
    }
}

module.exports.deleteServiceFunction = async (serviceId) => {
    try {
        console.log("service Id:",serviceId)
       const service = await ServiceModel.findByIdAndDelete(serviceId)
       if (service) {
        console.log("Deleted service:", service)
        return service
    } else {
        console.log("No service found with ID:", serviceId)
        return null
    }
    } catch (error) {
        console.error(error)
    }
}