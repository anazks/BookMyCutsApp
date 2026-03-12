
const axios = require("axios");
const { findNearbyShopsFunction } = require("../Repo/ShopRepo");
const ShopModel = require("../Model/ShopModel");

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
    const { page = 1, limit = 10, returnMetadata = false } = options;

    try {
        // Get total count first (up to max radius)
        let radius = 2000;
        let allShops = [];
        const maxRadius = 20000;
        
        // Collect ALL shops once (cache this in production!)
        while (allShops.length < (page * limit) && radius <= maxRadius) {
            const batch = await ShopModel.aggregate([
                {
                    $geoNear: {
                        near: { 
                            type: "Point", 
                            coordinates: [longitude, latitude] 
                        },
                        distanceField: "distance",
                        spherical: true,
                        maxDistance: 20000,
                        key: 'location',
                    }
                },
                { $count: "total" }
            ]);

            const total = countResult.length > 0 ? countResult[0].total : 0;

            return {
                shops,
                total
            };
        }

        // Otherwise just return the shops array (for backward compatibility)
        return shops;
        
    } catch (error) {
        console.error("Error in findNearestShops:", error);
        return [];
    }
};