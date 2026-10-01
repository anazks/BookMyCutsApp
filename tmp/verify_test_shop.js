require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const ShopModel = require('../Shops/Model/ShopModel');
const connectToDatabase = require('../Config/DbConfig');

async function verifyShop() {
    await connectToDatabase();
    try {
        console.log('🔍 Searching for shop matching "Test shop"...');
        const regex = new RegExp('test shop', 'i');
        const shops = await ShopModel.find({ ShopName: regex });

        if (shops.length === 0) {
            console.log('⚠️ No shop found with name matching "Test shop". Listing all shops in DB:');
            const allShops = await ShopModel.find({}, 'ShopName isVerified isActive').lean();
            console.log(JSON.stringify(allShops, null, 2));
        } else {
            console.log(`✅ Found ${shops.length} matching shop(s):`);
            for (const shop of shops) {
                console.log(`ID: ${shop._id} | Current Name: "${shop.ShopName}" | isVerified: ${shop.isVerified} | isActive: ${shop.isActive}`);
            }

            console.log('\n🔄 Updating shop(s) to isVerified: true and isActive: true...');
            const updateResult = await ShopModel.updateMany(
                { ShopName: regex },
                { $set: { isVerified: true, isActive: true } }
            );

            console.log(`🎉 Successfully updated ${updateResult.modifiedCount} shop(s).`);

            const updatedShops = await ShopModel.find({ ShopName: regex });
            console.log('\n📌 Updated Shop Details:');
            console.log(JSON.stringify(updatedShops, null, 2));
        }
    } catch (error) {
        console.error('❌ Error executing script:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
}

verifyShop();
