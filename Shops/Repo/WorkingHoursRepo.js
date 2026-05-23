const WorkingHours = require("../Model/WorkingHours");
const Shop = require("../Model/ShopModel");

// -------------------------
// ADD or CREATE Working Hours
// -------------------------
module.exports.addWorkingHours = async ({ shopId, days }) => {
  // Check if the shop already has a working hours document
  let existing = await WorkingHours.findOne({ shop: shopId });

  if (existing) {
    // Overwrite all days
    existing.days = days;
    return await existing.save();
  }

  // Create a new working hours document
  const record = await WorkingHours.create({ shop: shopId, days });

  // Store reference in Shop if not already present
  await Shop.findByIdAndUpdate(shopId, {
    $addToSet: { workingHours: record._id }
  });

  return record;
};

// -------------------------
// GET Working Hours by Shop
// -------------------------
module.exports.getWorkingHoursByShop = async (shopId) => {
  return await WorkingHours.findOne({ shop: shopId });
};

// -------------------------
// GET Working Hours by ID
// -------------------------
module.exports.getWorkingHoursById = async (id) => {
  return await WorkingHours.findById(id);
};

// -------------------------
// UPDATE Specific Day of Working Hours
// -------------------------

// module.exports.updateWorkingHours = async (shopId, day, updateData) => {
//   // ensure day is a Number
//   const dayNumber = Number(day);

//   // convert update keys → days.$.<field>
//   const setObject = {};
//   for (const [key, value] of Object.entries(updateData)) {
//     setObject[`days.$.${key}`] = value;
//   }

//   const record = await WorkingHours.findOneAndUpdate(
//     { shop: shopId, "days.day": dayNumber },
//     { $set: setObject },
//     { new: true }
//   );

//   return record;
// };


module.exports.updateWorkingHours = async (shopId, day, updateData) => {
  try {
    // day should be 0-6 (Sunday-Saturday)
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error('Invalid day value (must be 0-6)');
    }

    const result = await WorkingHours.findOneAndUpdate(
      { shop: shopId },
      {
        $set: {
          [`days.$[elem].isClosed`]: updateData.isClosed ?? undefined,
          [`days.$[elem].open`]: updateData.open ?? undefined,
          [`days.$[elem].close`]: updateData.close ?? undefined,
          [`days.$[elem].breaks`]: updateData.breaks ?? undefined,
        },
      },
      {
        arrayFilters: [{ 'elem.day': day }],
        new: true,              // return updated document
        runValidators: true,    // important when you have schema validators
      }
    );

    if (!result) {
      return null; // or throw new Error("Shop working hours not found")
    }

    return result;
  } catch (error) {
    throw error;
  }
}
// -------------------------
// DELETE Working Hours (whole document for shop)
// -------------------------
module.exports.deleteWorkingHours = async (shopId) => {
  const record = await WorkingHours.findOneAndDelete({ shop: shopId });

  if (record) {
    await Shop.findByIdAndUpdate(record.shop, {
      $pull: { workingHours: record._id }
    });
  }

  return record;
};
