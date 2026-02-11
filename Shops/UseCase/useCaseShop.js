
const axios = require("axios");
const { findNearbyShopsFunction } = require("../Repo/ShopRepo");

module.exports.convertToGeocode = async (data) => {
  try {
    let { State, District, ExactLocation } = data;
    console.log(State,District,ExactLocation,"************")

    // Build full address string
    const address = `${ExactLocation}, ${District}, ${State}`;

    // Call OpenStreetMap Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    const response = await axios.get(url, {
      headers: { "User-Agent": "Node.js App" } // Nominatim requires this
    });
    console.log(response, "geocode")
    if (response.data.length > 0) {
      // Take the first result (best match)
      const location = response.data[0];
      return {
        success: true,
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        display_name: location.display_name
      };
    } else {
      return { success: false, message: "No results found" };
    }
  } catch (error) {
    console.error("Error in convertToGeocode:", error.message);
    return { success: false, message: "Geocoding failed" };
  }
};

module.exports.findNearestShops = async (lng, lat, options = {}) => {
    const { page = 1, limit = 10 } = options;

    try {
        let radius = 2000;        // start 2 km
        let shops = [];
        let minResults = 5;       // minimum shops before we stop expanding
        let maxRadius = 20000;    // 20 km max

        // Phase 1: Collect enough shops by expanding radius
        while (shops.length < minResults && radius <= maxRadius) {
            const batch = await findNearbyShopsFunction(lng, lat, radius);

            console.log(`Searched within ${radius}m, found ${batch.length} shops`);

            // Add new shops (you might want to deduplicate in real app)
            shops = [...shops, ...batch];

            if (shops.length < minResults) {
                radius += 2000;
            }
        }

        // Phase 2: Apply pagination on the collected results
        const skip = (page - 1) * limit;
        const paginatedShops = shops.slice(skip, skip + limit);

        return paginatedShops;
    } catch (error) {
        console.error("Error in findNearestShops:", error);
        throw error;
    }
};