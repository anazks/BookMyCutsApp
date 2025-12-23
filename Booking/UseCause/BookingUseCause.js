const BookingModel = require('../Models/BookingModel');
const {checkBookings,addBookings,updateBooking,isSlotConflicting} = require('../Repo/BookingRepo')
const mongoose = require('mongoose');

module.exports.checkAvailable = async (data) => {
    try {
        let checkByDate = data.Date
        let available = await checkBookings(checkByDate)
        //find  the time is also avaible
    } catch (error) {
        console.log(error);
        return false;
    }
};






module.exports.bookNow = async (data, decodedValue) => {
  try {
    data.userId = decodedValue.id;

    // ✅ Extract dates directly from request
    const startTime = new Date(data.timeSlot.startingTime);
    const endTime = new Date(data.timeSlot.endingTime);

    // 🛡️ Safety check (VERY IMPORTANT)
    if (isNaN(startTime.valueOf()) || isNaN(endTime.valueOf())) {
      throw new Error("Invalid time slot provided");
    }

    // --- STEP 1: CONFLICT CHECK ---
    const hasConflict = await isSlotConflicting(
      data.barberId,
      data.bookingDate,
      startTime,
      endTime
    );

    if (hasConflict) {
      throw new Error("This time slot is already booked by someone else.");
    }

    // --- STEP 2: PREPARE BOOKING DATA ---
    const bookingData = {
      barberId: new mongoose.Types.ObjectId(data.barberId),

      userId: new mongoose.Types.ObjectId(data.userId),
      shopId: new mongoose.Types.ObjectId(data.shopId),

      serviceIds: data.serviceIds?.map(id => new mongoose.Types.ObjectId(id)) || [],
      services: data.services?.map(service => ({
        id: new mongoose.Types.ObjectId(service.id),
        name: service.name,
        price: service.price,
        duration: service.duration
      })) || [],

      bookingDate: new Date(data.bookingDate),

      timeSlot: {
        startingTime: startTime,
        endingTime: endTime
      },

      totalPrice: data.totalPrice,
      totalDuration: data.totalDuration,

      paymentType: data.paymentType,
      amountToPay: data.amountToPay,
      remainingAmount: data.remainingAmount,
      currency: data.currency,

      bookingTimestamp: new Date(),

      bookingStatus: "pending",
      paymentStatus:
        data.paymentType === "advance"
          ? (data.remainingAmount > 0 ? "partial" : "paid")
          : "unpaid",

      amountPaid:
        data.paymentType === "advance" ? data.amountToPay : 0,

      createdAt: new Date()
    };

    // --- STEP 3: SAVE ---
    const newBooking = await addBookings(bookingData);
    return newBooking;

  } catch (error) {
    console.error("Booking error:", error.message);
    throw error;
  }
};


module.exports.bookingCompletion = async (details) => {
  try {
    const {
      bookingId,
      razorpay_payment_id,
      paymentType,
      amount
    } = details;

    const updatedBooking = await updateBooking({
      bookingId,
      paymentId: razorpay_payment_id,
      paymentType,
      amountPaid: Number(amount),
      totalPrice: Number(details.totalPrice || amount)
    });

    return updatedBooking;
  } catch (error) {
    console.error('bookingCompletion error:', error);
    throw error;
  }
}  






const formatMinutes = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

module.exports.getBarberFreeTime = async (barberId, bookingDate) => {
  try {
    // Convert bookingDate to start and end of day in UTC
 const bookingDay = new Date(bookingDate); // bookingDate is '2025-12-23'
bookingDay.setHours(0, 0, 0, 0); // Start of day local time

const startOfDay = new Date(bookingDay);
const endOfDay = new Date(bookingDay);
endOfDay.setHours(23, 59, 59, 999);

    // Fetch all bookings for that barber on that day
console.log("Querying bookings for:", barberId, startOfDay, endOfDay);
const bookings = await BookingModel.find({
  barberId: new mongoose.Types.ObjectId(barberId),
  bookingDate: { $gte: startOfDay, $lte: endOfDay },
  bookingStatus: { $in: ["pending", "confirmed"] }
});
console.log("Found bookings:", bookings);


BookingModel.find({ barberId: new mongoose.Types.ObjectId(barberId) })
  .then(bookings => console.log("Booking of barber",bookings))
  .catch(err => console.error(err));
    console.log('Bookings for the day:', bookings);

    // Define working hours (example: 09:00 to 18:00)
    const workStart = 9 * 60; // 09:00 in minutes
    const workEnd = 18 * 60;  // 18:00 in minutes

    let currentPos = workStart; // Start from beginning of working hours
    const freeGaps = [];

    bookings.forEach(booking => {
      // Extract starting and ending time in local minutes
      const bStart = booking.timeSlot.startingTime.getHours() * 60 + booking.timeSlot.startingTime.getMinutes();
      const bEnd = booking.timeSlot.endingTime.getHours() * 60 + booking.timeSlot.endingTime.getMinutes();

      // If there's space before this booking
      if (bStart > currentPos) {
        freeGaps.push({
          from: formatMinutes(currentPos),
          to: formatMinutes(bStart),
          minutes: bStart - currentPos
        });
      }

      // Move pointer to the end of this booking
      currentPos = Math.max(currentPos, bEnd);
    });

    // Check for gap after the last booking until end of workday
    if (currentPos < workEnd) {
      freeGaps.push({
        from: formatMinutes(currentPos),
        to: formatMinutes(workEnd),
        minutes: workEnd - currentPos
      });
    }

    return { success: true, freeGaps };

  } catch (error) {
    console.error("Availability error:", error);
    return { success: false, error: error.message };
  }
};