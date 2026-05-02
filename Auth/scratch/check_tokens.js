const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.DATABASE_URL;

async function checkTokens() {
    if (!MONGO_URI) {
        console.error("DATABASE_URL not found in .env");
        return;
    }
    try {
        await mongoose.connect(MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({ PushToken: String }));
        const shopOwner = mongoose.model('shopOwner', new mongoose.Schema({ PushToken: String }));

        const usersWithToken = await User.find({ PushToken: { $exists: true, $ne: null } }).limit(5).lean();
        const shopsWithToken = await shopOwner.find({ PushToken: { $exists: true, $ne: null } }).limit(5).lean();

        console.log("Users with tokens count:", (await User.countDocuments({ PushToken: { $exists: true, $ne: null } })));
        console.log("Users sample tokens:", usersWithToken.map(u => ({ id: u._id, token: u.PushToken })));
        
        console.log("Shops with tokens count:", (await shopOwner.countDocuments({ PushToken: { $exists: true, $ne: null } })));
        console.log("Shops sample tokens:", shopsWithToken.map(s => ({ id: s._id, token: s.PushToken })));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkTokens();
