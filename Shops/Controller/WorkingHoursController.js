const workingHoursRepo = require("../Repo/WorkingHoursRepo");

// Helper function: convert "HH:MM" to minutes from midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// -------------------------
// CREATE Working Hours
// -------------------------
module.exports.createWorkingHours = async (req, res) => {
  try {
    const { shopId, days } = req.body;

    if (!shopId || !days || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        success: false,
        message: "shopId and days array are required",
      });
    }

    // Convert times for all days
    const daysInMinutes = days.map((d) => ({
      day: d.day,
      isClosed: d.isClosed,
      open: timeToMinutes(d.open),
      close: timeToMinutes(d.close),
      breaks: (d.breaks || []).map((b) => ({
        start: timeToMinutes(b.start),
        end: timeToMinutes(b.end),
      })),
    }));

    const result = await workingHoursRepo.addWorkingHours({
      shopId,
      days: daysInMinutes,
    });

    return res.status(201).json({
      success: true,
      message: "Working hours added successfully",
      result,
    });
  } catch (error) {
    console.error("Error creating working hours:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// -------------------------
// GET all Working Hours by Shop
// -------------------------
module.exports.getShopWorkingHours = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id, "shop id")

    const result = await workingHoursRepo.getWorkingHoursByShop(id);

    if (!result) {
      return res.status(404).json({   
        success: false,
        message: "No working hours found for this shop",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Working hours fetched successfully",
      result,
    });
  } catch (error) {
    console.error("Error fetching working hours:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// -------------------------
// UPDATE Working Hours
// -------------------------

module.exports.updateWorkingHours = async (req, res) => {
  try {
    const { shopId, day, open, close, breaks, isClosed } = req.body;

    if (!shopId || day === undefined) {
      return res.status(400).json({
        success: false,
        message: "shopId and day are required",
      });
    }

    const updateData = {};

    if (open) updateData.open = timeToMinutes(open);
    if (close) updateData.close = timeToMinutes(close);

    if (Array.isArray(breaks)) {
      updateData.breaks = breaks.map(b => ({
        start: timeToMinutes(b.start),
        end: timeToMinutes(b.end)
      }));
    }

    if (typeof isClosed === "boolean") {
      updateData.isClosed = isClosed;
    }

    const result = await workingHoursRepo.updateWorkingHours(
      shopId,
      Number(day),
      updateData
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Working hours record not found for this day",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Working hours updated successfully",
      result,
    });

  } catch (error) {
    console.error("Error updating working hours:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



// -------------------------
// DELETE Working Hours
// -------------------------
module.exports.deleteWorkingHours = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "shopId is required",
      });
    }

    const result = await workingHoursRepo.deleteWorkingHours(shopId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Working hours not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Working hours deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting working hours:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
