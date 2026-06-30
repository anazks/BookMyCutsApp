const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const ShopModel = require('../Shops/Model/ShopModel');
const BarberModel = require('../Shops/Model/BarbarModel');
const BookingModel = require('../Booking/Models/BookingModel');
const WorkingHoursModel = require('../Shops/Model/WorkingHours');
const { getBarberFullSchedule, getShopAvailableSlots } = require('../Booking/UseCause/BookingUseCause');

const DATABASE_URL = "mongodb+srv://bookmycuts:bookmycuts2026@cluster0.ogs8ppq.mongodb.net/bookmycuts-testing?appName=Cluster0";

async function run() {
    try {
        await mongoose.connect(DATABASE_URL);
        console.log("Connected to DB:", DATABASE_URL);

        let shop = await ShopModel.findOne({ ShopName: { $regex: /clever/i } });
        if (!shop) {
             console.log("Shop not found");
             return;
        }

        const barber = await BarberModel.findOne({ shopId: shop._id, BarberName: { $regex: /alby/i } });
        if (!barber) {
             console.log("Barber not found");
             return;
        }

        console.log("Barber:", barber.BarberName);
        console.log("Shop:", shop.ShopName);

        const dateStr = "2026-06-30";
        console.log(`\n--- Calling getBarberFullSchedule for ${dateStr} ---`);
        const barberSchedule = await getBarberFullSchedule(barber._id, dateStr, shop._id);
        console.log(JSON.stringify(barberSchedule, null, 2));

        console.log(`\n--- Calling getShopAvailableSlots for ${dateStr} ---`);
        const shopSchedule = await getShopAvailableSlots(shop._id, dateStr);
        console.log(JSON.stringify(shopSchedule, null, 2));
        
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
