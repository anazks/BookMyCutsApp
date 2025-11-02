
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

module.exports.findNearestShops = async (lng, lat) => {
    try {
        let radius = 2000; // start 2 km
        let shops = [];
        let minResults = 5;
        let maxRadius = 20000;

        while (shops.length < minResults && radius <= maxRadius) {
            shops = await findNearbyShopsFunction(lng, lat, radius); // ✅ Added await and correct order
            
            console.log(`Searched within ${radius}m, found ${shops.length} shops`); // Debug log

            if (shops.length < minResults) {
                radius += 2000; // expand by 2 km
            }
        }
        
        return shops;
    } catch (error) {
        console.error("Error in findNearestShops:", error);
        throw error;
    }
}
