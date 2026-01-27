const BookingModel = require('../Models/BookingModel');
const BarberModel = require('../../Shops/Model/BarbarModel')
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


const assignBarber = async (startTime, endTime, bookingDate, shopId) => {
  // 1️⃣ Find all bookings that overlap with this time slot
  const overlappingBookings = await BookingModel.find({
    shopId: new mongoose.Types.ObjectId(shopId),
    bookingDate: bookingDate,
    bookingStatus: { $in: ["pending", "confirmed"] },

    // TIME OVERLAP CONDITION
    $or: [
      {
        "timeSlot.startingTime": { $lt: endTime },
        "timeSlot.endingTime": { $gt: startTime }
      }
    ]
  }).select("barberId");

  // 2️⃣ Extract busy barber IDs
  const busyBarberIds = overlappingBookings.map(
    b => b.barberId.toString()
  );

  // 3️⃣ Fetch all barbers of the shop
  const shopBarbers = await BarberModel.find({
    shopId: new mongoose.Types.ObjectId(shopId)
  });

  // 4️⃣ Filter free barbers
  const freeBarbers = shopBarbers.filter(
    barber => !busyBarberIds.includes(barber._id.toString())
  );

  // 5️⃣ No barber available
  if (freeBarbers.length === 0) {
    // throw new Error("No barber available for selected time slot");
    return null;
  }

  // 6️⃣ Assign barber (simple strategy)
  return freeBarbers[0]; // later you can change strategy
};



module.exports.bookNow = async (data, decodedValue) => {
  try {
    data.userId = decodedValue.id;

    console.log("BOOKING DATA FROM FRONTEND:",data)

    // ✅ Extract dates directly from request
      const startTime = new Date(data.timeSlot.startingTime);
    const endTime = new Date(data.timeSlot.endingTime);

    console.log("START")

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


    if (!data.barberId) {
  const barber = await assignBarber(
    startTime,
    endTime,
    data.bookingDate,
    data.shopId
  );

  data.barberId = barber ? barber._id : null;


  console.log("ASSIGNED BARBER ID:", data.barberId);
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
    console.log("BOOKING DATA -",bookingData)

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

module.exports.getShopAvailableSlots = async (shopId, bookingDate) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return { success: false, message: "Invalid shopId" };
    }

    // Input date is YYYY-MM-DD (e.g., "2026-01-01")
    const startOfDayUTC = new Date(`${bookingDate}T00:00:00.000Z`);
    const endOfDayUTC = new Date(`${bookingDate}T23:59:59.999Z`);

    // ---- Get shop working hours ----
    console.log("shopId",shopId)
    const workingHours = await WorkingHours.findOne({ shop: new mongoose.Types.ObjectId(shopId) }).lean();
    console.log("working hours:",workingHours)

    if (!workingHours) {
      return { success: false, message: "Working hours not found" };
    }

    // Determine day of week in IST (India uses IST = UTC+5:30)
    const dayOfWeek = new Date(startOfDayUTC.getTime() + 5.5 * 60 * 60 * 1000).getUTCDay();

    const daySchedule = workingHours.days.find(d => d.day === dayOfWeek);
    if (!daySchedule || daySchedule.isClosed) {
      return {
        success: true,
        schedule: {
          date: bookingDate,
          workHours: { from: "closed", to: "closed" },
          breaks: [],
          bookings: [],
          freeSlots: []
        }
      };
    }

    const workStartMin = daySchedule.open;   // e.g., 540 for 09:00
    const workEndMin   = daySchedule.close;  // e.g., 1020 for 17:00
    const breaks = daySchedule.breaks || [];

    const breakSlots = breaks.map(br => ({
      startMin: br.start,
      endMin: br.end
    }));

    // ---- Fetch ALL relevant bookings for this shop and date ----
    const bookings = await BookingModel.find({
      shopId: new mongoose.Types.ObjectId(shopId),
      bookingDate: { $gte: startOfDayUTC, $lte: endOfDayUTC },
      bookingStatus: { $in: ["pending", "confirmed"] }
    })
      .sort({ "timeSlot.startingTime": 1 }) // Critical: Sort by start time
      .lean();

    console.log(`Found ${bookings.length} bookings for ${bookingDate}`);

    // ---- Convert booking times to minutes since midnight (in IST) ----
    const bookingSlots = bookings.map(booking => {
      // timeSlot.startingTime and endingTime are stored as UTC Date objects
      const startLocal = new Date(booking.timeSlot.startingTime);
      const endLocal = new Date(booking.timeSlot.endingTime);

      // Convert to IST minutes
      const startMin = startLocal.getUTCHours() * 60 + startLocal.getUTCMinutes();
      const endMin = endLocal.getUTCHours() * 60 + endLocal.getUTCMinutes();

      return { startMin, endMin };
    });

    // ---- Combine and SORT all busy periods (bookings + breaks) ----
    let busySlots = [...bookingSlots, ...breakSlots];
    busySlots.sort((a, b) => a.startMin - b.startMin);

    // ---- Merge overlapping or adjacent busy slots ----
    const mergedBusySlots = [];
    for (const slot of busySlots) {
      if (mergedBusySlots.length === 0 || mergedBusySlots[mergedBusySlots.length - 1].endMin < slot.startMin) {
        mergedBusySlots.push({ ...slot });
      } else {
        // Overlap or adjacent: extend the last slot
        mergedBusySlots[mergedBusySlots.length - 1].endMin = Math.max(
          mergedBusySlots[mergedBusySlots.length - 1].endMin,
          slot.endMin
        );
      }
    }

    // ---- Calculate free slots within working hours ----
    const freeSlots = [];
    let currentPos = workStartMin;

    for (const busy of mergedBusySlots) {
      if (busy.startMin > currentPos) {
        freeSlots.push({
          from: formatMinutes(currentPos),
          to: formatMinutes(busy.startMin),
          minutes: busy.startMin - currentPos
        });
      }
      currentPos = Math.max(currentPos, busy.endMin);
    }

    // Add final free slot if any time left till closing
    if (currentPos < workEndMin) {
      freeSlots.push({
        from: formatMinutes(currentPos),
        to: formatMinutes(workEndMin),
        minutes: workEndMin - currentPos
      });
    }

    // ---- Return in the exact format you want ----
    return {
      success: true,
      schedule: {
        date: bookingDate,
        workHours: {
          from: formatMinutes(workStartMin),
          to: formatMinutes(workEndMin)
        },
        breaks: breaks.map(b => ({
          startMin: b.start,
          endMin: b.end,
          startTime: formatMinutes(b.start),
          endTime: formatMinutes(b.end)
        })),
        bookings: bookings.map(b => ({
          barberId: b.barberId,
          timeSlot: {
            startingTime: new Date(b.timeSlot.startingTime).toISOString(),
            endingTime: new Date(b.timeSlot.endingTime).toISOString()
          },
          totalPrice: b.totalPrice,
          bookingStatus: b.bookingStatus
        })),
        freeSlots
      }
    };

  } catch (err) {
    console.error("Error in getShopAvailableSlots:", err);
    return { success: false, error: err.message };
  }
};
