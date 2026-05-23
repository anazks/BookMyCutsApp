require('dotenv').config();
const mongoose = require('mongoose');
const ShopModel = require('../Shops/Model/ShopModel');
const connectToDatabase = require('../Config/DbConfig');
const fs = require('fs');

async function debugViewAll() {
    await connectToDatabase();
    try {
        let out = '--- ALL SHOPS ---\n';
        const activeShops = await ShopModel.find({ isActive: true });
        out += `There are ${activeShops.length} active shops.\n`;
        
        const inActiveShops = await ShopModel.find({ isActive: false });
        out += `There are ${inActiveShops.length} inactive shops.\n`;
        
        const nullShops = await ShopModel.find({ isActive: { $exists: false } });
        out += `There are ${nullShops.length} shops with no isActive field.\n`;

        const allShops = await ShopModel.find().populate('ShopOwnerId');
        
        allShops.forEach(shop => {
            out += `\nShop: ${shop.ShopName}\n`;
            out += `isActive: ${shop.isActive}\n`;
            if (shop.ShopOwnerId) {
                out += `Owner: ${shop.ShopOwnerId.firstName} (Google? ${shop.ShopOwnerId.authProvider || 'No auth provider field'})\n`;
            } else {
                out += `Owner: MISSING (ShopOwnerId is null or invalid ObjectId string)\n`;
            }
        });
        
        fs.writeFileSync('tmp/debug_shops_out.txt', out, 'utf8');
        console.log('Done writing debug_shops_out.txt');
    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

debugViewAll();
