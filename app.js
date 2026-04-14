const express = require('express');
const app = express();
const dotenv = require('dotenv')
const cors = require('cors')
dotenv.config()
const connectToDatabase = require('./Config/DbConfig')
const mongoose = require('mongoose');
const User = require('./Auth/Model/UserModel')
const cron = require('node-cron')
// const redisClient = require('./Config/redis')

app.use(cors())

const os = require('os');
app.use((req, res, next) => {
    // This logs the unique ID of the specific Kubernetes Pod handling the request
    if (req.url === '/' || req.url.startsWith('/api')) {
        console.log(`[Pod ID: ${os.hostname()}] Handled -> ${req.method} ${req.url}`);
    }
    next();
});

const authRouter = require('./Auth/Routes/userRoute');
const shopRouter = require('./Shops/Router/ShopRouter');
const SlotRouter = require('./SlotManagement/SlotRouter/SlotRouter')
const BookingRouter = require('./Booking/Router/BookingRouter')
const OfferRouter = require('./Offers/Router/OfferRouter');
const setupSwagger = require('./swaggerDocs/swaggerConfig');
const checkExpiredPremium = require('./Shops/ShopScheduler/Scheduler');
const { seedKeralaCities } = require('./Auth/Controllers/seedCities');
require('./Cloudinary/CloudinaryConfig')
require('./Booking/Controler/PayoutWorker')
const PayoutRequest = require('./Shops/Model/PayoutRequest');
const Booking = require('./Booking/Models/BookingModel');

// Define a route for the root URL
connectToDatabase();

app.get('/', (req, res) => {
  res.send('Hello, this is your Express server!');
});

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Define the port
const port = 3002

app.use('/api/auth', authRouter)
app.use('/api/shop', shopRouter)
app.use('/api/slot', SlotRouter)
app.use('/api/booking', BookingRouter)
app.use('/api/offers', OfferRouter)

// Fixed cron job - runs every 10 minutes
const scheduledJob = cron.schedule('0 0 */1 * *', async () => {
  console.log("Running expired premium check:", new Date().toISOString());
  try {
    // Check if the checkExpiredPremium function exists and is callable
    if (typeof checkExpiredPremium !== 'function') {
      console.error("checkExpiredPremium is not a function");
      return;
    }

    const result = await checkExpiredPremium();
    console.log("Expired premium check completed successfully", result);
  } catch (error) {
    console.error("Error in scheduled job:", error.message);
    console.error("Stack trace:", error.stack);
  }
}, {
  scheduled: true, // Ensure the job is scheduled
  timezone: "UTC" // Set timezone explicitly
});

// Auto-cancel abandoned bookings every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
      const expirationTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      const result = await Booking.updateMany({
          bookingStatus: 'pending',
          createdAt: { $lt: expirationTime }
      }, {
          $set: { 
               bookingStatus: 'cancelled',
               paymentStatus: 'unpaid'
          }
      });
      if (result.modifiedCount > 0) {
          console.log(`Auto-cancelled ${result.modifiedCount} abandoned pending bookings.`);
      }
  } catch (error) {
      console.error("Error auto-cancelling abandoned bookings:", error);
  }
});


// Optional: Start the job manually if needed
// scheduledJob.start();


// app.get('/test-redis', async (req, res) => {
//   // Store value
//   await redisClient.set('hello', 'Memurai is working!');

//   // Retrieve value
//   const value = await redisClient.get('hello');

//   res.json({ message: value });
// });

console.log("Cron job scheduled successfully - will run every 10 minutes");

app.set('trust proxy', true);

app.get('/', (req, res) => {
    res.send('Hello from Node.js behind NGINX!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  setupSwagger(app);

  // --- TEMPORARY CLEANUP ROUTE ---
  app.post('/api/debug/clear-payouts', async (req, res) => {
    try {
      const pResult = await PayoutRequest.deleteMany({});
      const bResult = await Booking.updateMany({}, { $set: { payoutStatus: 'pending' } });
      res.json({
        message: "Data cleared successfully",
        payoutsDeleted: pResult.deletedCount,
        bookingsReset: bResult.modifiedCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Optional: Run the check once immediately when server starts
  console.log("Running initial premium check...");
  checkExpiredPremium().catch(error => {
    console.error("Error in initial premium check:", error);
  });
});