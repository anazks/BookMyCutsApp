const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.DATABASE_URL;

async function checkTokensDetailed() {
    if (!MONGO_URI) return;
    try {
        await mongoose.connect(MONGO_URI);
        const users = await mongoose.connection.db.collection('users').find({}).limit(10).toArray();
        const shopowners = await mongoose.connection.db.collection('shopowners').find({}).limit(10).toArray();

        console.log("USERS FIELDS:", users.filter(u => u.PushToken || u.pushToken).map(u => ({ id: u._id, PushToken: u.PushToken, pushToken: u.pushToken })));
        console.log("SHOPS FIELDS:", shopowners.filter(u => u.PushToken || u.pushToken).map(u => ({ id: u._id, PushToken: u.PushToken, pushToken: u.pushToken })));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkTokensDetailed();
