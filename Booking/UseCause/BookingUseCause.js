const BookingModel = require('../Models/BookingModel');
const {checkBookings,addBookings,updateBooking,isSlotConflicting} = require('../Repo/BookingRepo')
const WorkingHours = require('../../Shops/Model/WorkingHours')
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






function toISTHHMM(date) {
  const options = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  return new Date(date).toLocaleTimeString("en-IN", options);
}

function formatMinutes(min) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

module.exports.getBarberFullSchedule = async (barberId, bookingDate, shopId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(shopId) || !mongoose.Types.ObjectId.isValid(barberId)) {
      return { success: false, message: "Invalid barberId or shopId" };
    }

    // === FIX 1: Correctly define the full day in IST using explicit +05:30 offset ===
    const startOfDayIST = new Date(`${bookingDate}T00:00:00+05:30`);     // 00:00:00 IST
    const endOfDayIST   = new Date(`${bookingDate}T23:59:59.999+05:30`); // 23:59:59.999 IST

    // Optional: Log for debugging (remove in production)
    // console.log("Query Range (UTC):", startOfDayIST.toISOString(), "→", endOfDayIST.toISOString());

    const workingHours = await WorkingHours.findOne({ shop: new mongoose.Types.ObjectId(shopId) }).lean();
    if (!workingHours) return { success: false, message: "Working hours not found for this shop" };

    // === FIX 2: Calculate dayOfWeek correctly in IST (independent of server timezone) ===
    const istOffsetMs = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds
    const istTimeMs = startOfDayIST.getTime() + istOffsetMs;
    const dayOfWeek = new Date(istTimeMs).getUTCDay(); // 0 = Sunday, 6 = Saturday

    const daySchedule = workingHours.days.find(d => d.day === dayOfWeek);
    if (!daySchedule || daySchedule.isClosed) {
      return { success: false, message: "Shop is closed on this day" };
    }

    const workStart = daySchedule.open;   // in minutes (e.g., 600 for 10:00)
    const workEnd = daySchedule.close;    // in minutes (e.g., 1200 for 20:00)
    const breaks = daySchedule.breaks || [];

    // === Use the fixed IST range in the query ===
    const bookings = await BookingModel.find({
      barberId: new mongoose.Types.ObjectId(barberId),
      bookingDate: { $gte: startOfDayIST, $lte: endOfDayIST },
      bookingStatus: { $in: ["pending", "confirmed"] }
    }).sort({ "timeSlot.startingTime": 1 }).lean();

    const bookingSlots = bookings.map(b => {
      const startIST = toISTHHMM(b.timeSlot.startingTime);
      const endIST = toISTHHMM(b.timeSlot.endingTime);
      const [sh, sm] = startIST.split(":").map(Number);
      const [eh, em] = endIST.split(":").map(Number);
      return {
        ...b,
        startTime: startIST,
        endTime: endIST,
        startMin: sh * 60 + sm,
        endMin: eh * 60 + em
      };
    });

    const breakSlots = breaks.map(br => ({
      startMin: br.start,
      endMin: br.end,
      startTime: formatMinutes(br.start),
      endTime: formatMinutes(br.end)
    }));

    const allSlots = [
      ...bookingSlots.map(b => ({ startMin: b.startMin, endMin: b.endMin, type: "booking" })),
      ...breakSlots.map(b => ({ ...b, type: "break" }))
    ].sort((a, b) => a.startMin - b.startMin);

    const freeSlots = [];
    let currentPos = workStart;
    for (const slot of allSlots) {
      if (slot.startMin > currentPos) {
        freeSlots.push({
          from: formatMinutes(currentPos),
          to: formatMinutes(slot.startMin),
          minutes: slot.startMin - currentPos
        });
      }
      currentPos = Math.max(currentPos, slot.endMin);
    }
    if (currentPos < workEnd) {
      freeSlots.push({
        from: formatMinutes(currentPos),
        to: formatMinutes(workEnd),
        minutes: workEnd - currentPos
      });
    }

    const schedule = {
      date: bookingDate,
      workHours: { from: formatMinutes(workStart), to: formatMinutes(workEnd) },
      breaks: breakSlots,
      bookings: bookingSlots.map(b => ({
        startTime: b.startTime,
        endTime: b.endTime,
        userId: b.userId,
        bookingStatus: b.bookingStatus
      })),
      freeSlots
    };

    return { success: true, schedule };

  } catch (err) {
    console.error("Error in getBarberFullSchedule:", err);
    return { success: false, error: err.message };
  }
};