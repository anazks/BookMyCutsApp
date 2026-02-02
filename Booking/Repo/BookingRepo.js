const { response } = require("express")
const BookingModel = require("../Models/BookingModel")
const mongoose = require("mongoose");

module.exports.checkBookings = async(data)=>{
    try {
        
    } catch (error) {
        
    }
}
module.exports.addBookings = async(data)=>{
    try {
        let bookings = BookingModel.create(data)
            return bookings
    } catch (error) {
        console.log(error)
        return error
    }
}

module.exports. isSlotConflicting = async (
  barberId,
  bookingDate,
  startDateTime,
  endDateTime
) => {
  const conflict = await BookingModel.findOne({
    barberId: new mongoose.Types.ObjectId(barberId),

    // Make sure bookingDate is the same DAY
    bookingDate: new Date(bookingDate),

    bookingStatus: { $in: ["pending", "confirmed"] },

    "timeSlot.startingTime": { $lt: endDateTime },
    "timeSlot.endingTime": { $gt: startDateTime }
  });

  console.log(conflict, "already bookings");  
  return !!conflict;
};


module.exports.myBooking = async (userId,  limit) => {
  try {
    // Ensure safe numbers
    const bookings = await BookingModel.find({ userId })
      .populate("shopId", "ShopName")
      .populate("barberId", "BarberName")
      // .populate("serviceId", "ServiceName")
      .sort({ createdAt: -1 })     // newest first – change field if needed
      .limit(limit)
      .lean()                      // optional: faster if you don't modify docs
      .exec();

    return bookings;               // ← only the array, same shape as your original

  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
};



module.exports.findDashboardIncomeFunction = async (shopId) => {
  console.log('🔍 [DASHBOARD] Starting income calc for shopId:', shopId);
  
  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    console.error('❌ [DASHBOARD] Invalid shop ID:', shopId);
    throw new Error('Invalid shop ID');
  }

  try {
    const now = new Date();
    console.log('📅 [DASHBOARD] Current time (IST):', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    // Today boundaries
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    
    console.log('🕐 [DASHBOARD] Today range:', startOfToday.toISOString(), '→', endOfToday.toISOString());

    // Last 7 days
    const startOfLast7Days = new Date(startOfToday);
    startOfLast7Days.setDate(startOfLast7Days.getDate() - 6);
    console.log('📊 [DASHBOARD] Last 7 days start:', startOfLast7Days.toISOString());

    // This month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    console.log('📈 [DASHBOARD] Month start:', startOfMonth.toISOString());

    const baseQuery = {
      shopId: new mongoose.Types.ObjectId(shopId),
      bookingStatus: { $in: ['confirmed', 'completed'] }
    };

    // ❌ DEBUG: Total bookings for shop (ignore status/date)
    const totalBookings = await BookingModel.countDocuments({ shopId: new mongoose.Types.ObjectId(shopId) });
    console.log('📋 [DASHBOARD] TOTAL bookings for shop:', totalBookings);

    // ❌ DEBUG: Bookings matching baseQuery (status filter)
    const validStatusBookings = await BookingModel.countDocuments(baseQuery);
    console.log('✅ [DASHBOARD] Valid status bookings:', validStatusBookings);

    if (totalBookings === 0) {
      console.log('🚫 [DASHBOARD] NO bookings exist for this shop. All zeros expected.');
      return { last7Days: 0, todayReceived: 0, todayExpectedRemaining: 0, todayTotalPotential: 0, thisMonthReceived: 0, currency: '₹' };
    }

    // 1. Today received
    console.log('🔎 [DASHBOARD] Querying today received...');
    const todayReceivedDocs = await BookingModel.find({
      ...baseQuery,
      bookingTimestamp: { $gte: startOfToday, $lte: endOfToday }
    }).select('amountPaid bookingTimestamp bookingStatus').limit(5); // limit for log

    console.log('📄 [DASHBOARD] Today received docs count:', todayReceivedDocs.length);
    todayReceivedDocs.forEach((doc, i) => {
      console.log(`  → Doc ${i}: amountPaid=${doc.amountPaid}, timestamp=${doc.bookingTimestamp}, status=${doc.bookingStatus}`);
    });

    const todayReceived = todayReceivedDocs.reduce((sum, doc) => sum + (doc.amountPaid || 0), 0);

    // 2. Today expected remaining
    console.log('🔎 [DASHBOARD] Querying today expected...');
    const todayExpectedDocs = await BookingModel.find({
      ...baseQuery,
      bookingDate: { $gte: startOfToday, $lte: endOfToday },
      remainingAmount: { $gt: 0 }
    }).select('remainingAmount bookingDate bookingStatus').limit(5);

    console.log('📄 [DASHBOARD] Today expected docs count:', todayExpectedDocs.length);
    todayExpectedDocs.forEach((doc, i) => {
      console.log(`  → Doc ${i}: remaining=${doc.remainingAmount}, bookingDate=${doc.bookingDate}, status=${doc.bookingStatus}`);
    });

    const todayExpectedRemaining = todayExpectedDocs.reduce((sum, doc) => sum + (doc.remainingAmount || 0), 0);

    // 3. Last 7 days
    console.log('🔎 [DASHBOARD] Querying last 7 days...');
    const last7DaysDocs = await BookingModel.find({
      ...baseQuery,
      bookingTimestamp: { $gte: startOfLast7Days, $lte: endOfToday }
    }).select('amountPaid').limit(5);

    console.log('📄 [DASHBOARD] Last 7 days docs count:', last7DaysDocs.length);
    const last7Days = last7DaysDocs.reduce((sum, doc) => sum + (doc.amountPaid || 0), 0);

    // 4. This month
    console.log('🔎 [DASHBOARD] Querying this month...');
    const thisMonthDocs = await BookingModel.find({
      ...baseQuery,
      bookingTimestamp: { $gte: startOfMonth }
    }).select('amountPaid').limit(5);

    console.log('📄 [DASHBOARD] This month docs count:', thisMonthDocs.length);
    const thisMonthReceived = thisMonthDocs.reduce((sum, doc) => sum + (doc.amountPaid || 0), 0);

    const result = {
      last7Days: Math.round(last7Days),
      todayReceived: Math.round(todayReceived),
      todayExpectedRemaining: Math.round(todayExpectedRemaining),
      todayTotalPotential: Math.round(todayReceived + todayExpectedRemaining),
      thisMonthReceived: Math.round(thisMonthReceived),
      currency: '₹',
      debug: {
        totalBookings,
        validStatusBookings,
        todayDocsCount: todayReceivedDocs.length,
        expectedDocsCount: todayExpectedDocs.length
      }
    };

    console.log('✅ [DASHBOARD] Final result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('💥 [DASHBOARD] ERROR:', error);
    throw error;
  }
};
 

// module.exports.getShopIncomeStats = async (shopId) => {
//   if (!mongoose.isValidObjectId(shopId)) {
//     throw new Error('Invalid shopId');
//   }

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const tomorrow = new Date(today);
//   tomorrow.setDate(tomorrow.getDate() + 1);

//   // Week starts from Sunday (common in India/business)
//   // Change to Monday start if needed: + (today.getDay() === 0 ? -6 : 1 - today.getDay())
//   const startOfWeek = new Date(today);
//   startOfWeek.setDate(today.getDate() - today.getDay());

//   const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

//   const match = {
//     shopId: new mongoose.Types.ObjectId(shopId),
//     bookingStatus: { $in: ['confirmed', 'completed'] },
//     paymentStatus: { $in: ['partial', 'paid'] }
//   };

//   const result = await Booking.aggregate([
//     { $match: match },
//     {
//       $facet: {
//         // Money actually received TODAY
//         todayReceived: [
//           { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
//           { $group: { _id: null, total: { $sum: '$amountPaid' } } }
//         ],

//         // Expected remaining amount from TODAY's bookings (COD / advance / partial)
//         todayExpectedRemaining: [
//           { $match: { bookingDate: { $gte: today, $lt: tomorrow } } },
//           { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
//         ],

//         // Total money actually received this WEEK
//         weekReceived: [
//           { $match: { createdAt: { $gte: startOfWeek } } },
//           { $group: { _id: null, total: { $sum: '$amountPaid' } } }
//         ],

//         // Total money actually received this MONTH
//         monthReceived: [
//           { $match: { createdAt: { $gte: startOfMonth } } },
//           { $group: { _id: null, total: { $sum: '$amountPaid' } } }
//         ],

//         // Optional: count of bookings today (for reference)
//         todayBookingsCount: [
//           { $match: { bookingDate: { $gte: today, $lt: tomorrow } } },
//           { $count: 'count' }
//         ]
//       }
//     }
//   ]);

//   const data = result[0] || {};

//   const format = (val) => Math.round(val || 0);

//   return {
//     today: {
//       received: format(data.todayReceived?.[0]?.total),
//       expectedRemaining: format(data.todayExpectedRemaining?.[0]?.total),
//       totalPotential: format(
//         (data.todayReceived?.[0]?.total || 0) +
//         (data.todayExpectedRemaining?.[0]?.total || 0)
//       )
//     },
//     thisWeekReceived: format(data.weekReceived?.[0]?.total),
//     thisMonthReceived: format(data.monthReceived?.[0]?.total),
//     todayBookings: data.todayBookingsCount?.[0]?.count || 0,

//     // You can add currency if stored per shop/document
//     currency: 'INR' // ← change as needed
//   };
// }

module.exports.updateBooking = async ({
  bookingId,
  paymentId,
  paymentType,
  amountPaid,
  totalPrice
}) => {
  try {
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Calculate remaining amount
    const remainingAmount =
      paymentType === 'full'
        ? 0
        : Math.max(totalPrice - amountPaid, 0);

    // Update fields
    booking.paymentId = paymentId;
    booking.paymentType = paymentType;
    booking.amountPaid = amountPaid;
    booking.remainingAmount = remainingAmount;
    booking.paymentStatus =
      paymentType === 'full' ? 'paid' : 'partial';
    booking.bookingStatus = 'confirmed';

    await booking.save();

    return booking;
  } catch (error) {
    console.error('updateBooking error:', error);
    throw error;
  }
};

module.exports.upcomingBooking = async (userId) => {
  try {
    const upcomingBooking = await BookingModel
      .findOne({
        userId: new mongoose.Types.ObjectId(userId),
        'timeSlot.startingTime': { $gt: new Date() },  // Start time > now (UTC comparison)
        bookingStatus: { $in: ['confirmed', 'pending'] }
      })
      .sort({ 'timeSlot.startingTime': 1 })  // Earliest upcoming first
      .lean();  // Optional: for better performance

    return upcomingBooking;
  } catch (error) {
    console.error('Error fetching upcoming booking:', error);
    return null;
  }
};

module.exports.fetchbookingById = async (bookingId) => {
  try {
   const bookings = await BookingModel.findById(bookingId)
  .populate("shopId", "ShopName")        // only shopName from Shop
  .populate("barberId", "BarberName")          // barber name (assuming 'name' field in Barber model)
  .populate("userId", "firstName lastName") // firstName + lastName from User
  .lean(); // optional: returns plain JS objects, easier to manipulate
   
  return bookings
  } catch (error) {
    console.log(error)
  }
}

