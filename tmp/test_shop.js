require('dotenv').config();
const mongoose = require('mongoose');
const ShopModel = require('../Shops/Model/ShopModel');
const connectToDatabase = require('../Config/DbConfig');

async function debugShops() {
    await connectToDatabase();
    try {
        console.log('--- FETCHING ALL SHOPS ---');
        const shops = await ShopModel.find({}).limit(5).lean();
        
        if (shops.length === 0) {
            console.log('NO SHOPS FOUND IN DB!');
        } else {
            console.log('Found', shops.length, 'shops:');
            shops.forEach(shop => {
                console.log(`Shop Name: ${shop.ShopName}`);
                console.log(`_id: ${shop._id}`);
                console.log(`ShopOwnerId: ${shop.ShopOwnerId}`);
                console.log('-------------------------');
            });

            // Let's test the exact query from uploadMedia on the first shop we found
            const testId = shops[0]._id.toString();
            console.log(`\nTesting findOneAndUpdate with ID: ${testId}`);
            const query = {
                $or: [
                    { _id: testId },
                    { ShopOwnerId: testId }
                ]
            };
            const result = await ShopModel.findOneAndUpdate(query, { $set: { isActive: true } }, { new: true });
            if (result) {
                console.log('✅ Query SUCCESS: Found shop dynamically');
            } else {
                console.log('❌ Query FAILED: Shop not found with this query');
            }
        }
    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

debugShops();
