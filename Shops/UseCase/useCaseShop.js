
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
        // Get total count first (up to max radius)
        let radius = 2000;
        let allShops = [];
        const maxRadius = 20000;
        
        // Collect ALL shops once (cache this in production!)
        while (allShops.length < (page * limit) && radius <= maxRadius) {
            const batch = await Shop.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                        distanceField: "distance",
                        spherical: true,
                        maxDistance: radius,
                    }
                },
                { $sort: { distance: 1 } }
            ]);
            
            // Deduplicate by shop ID
            const existingIds = new Set(allShops.map(s => s._id.toString()));
            const newShops = batch.filter(s => !existingIds.has(s._id.toString()));
            allShops = [...allShops, ...newShops];
            
            radius += 2000;
        }
        
        // Now apply pagination
        const skip = (page - 1) * limit;
        const paginatedShops = allShops.slice(skip, skip + limit);
        
        return paginatedShops;
    } catch (error) {
        console.error("Error in findNearestShops:", error);
        throw error;
    }
};