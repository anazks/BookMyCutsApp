const mongoose = require('mongoose');
const City = require('../Model/City'); // adjust path if needed

// List of major cities in Kerala
const keralaCities = [
  { name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366 },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673 },
  { name: 'Kozhikode', lat: 11.2588, lon: 75.7804 },
  { name: 'Kollam', lat: 8.8932, lon: 76.6141 },
  { name: 'Thrissur', lat: 10.5276, lon: 76.2144 },
  { name: 'Alappuzha', lat: 9.4981, lon: 76.3388 },
  { name: 'Palakkad', lat: 10.7867, lon: 76.6548 },
  { name: 'Kannur', lat: 11.8745, lon: 75.3704 },
  { name: 'Kottayam', lat: 9.5916, lon: 76.5222 },
  { name: 'Malappuram', lat: 11.0410, lon: 76.0823 },
  { name: 'Kasaragod', lat: 12.4996, lon: 74.9895 },
  { name: 'Pathanamthitta', lat: 9.2648, lon: 76.7870 },
  { name: 'Idukki', lat: 9.8433, lon: 76.9761 },
  { name: 'Wayanad', lat: 11.6050, lon: 76.0830 },
  { name: 'Ernakulam', lat: 10.0000, lon: 76.2500 },
  { name: 'Thalassery', lat: 11.7481, lon: 75.4929 },
  { name: 'Ponnani', lat: 10.7667, lon: 75.9250 },
  { name: 'Thiruvalla', lat: 9.3835, lon: 76.5741 },
  { name: 'Chalakudy', lat: 10.3119, lon: 76.3320 },
  { name: 'Manjeri', lat: 11.1200, lon: 76.1200 },
  { name: 'Neyyattinkara', lat: 8.4000, lon: 77.0833 },
  { name: 'Kayamkulam', lat: 9.1667, lon: 76.5000 },
  { name: 'Vadakara', lat: 11.6000, lon: 75.5833 },
  { name: 'Ottappalam', lat: 10.7667, lon: 76.3833 },
  { name: 'Changanassery', lat: 9.4667, lon: 76.5500 },
  { name: 'Taliparamba', lat: 12.0333, lon: 75.3500 },
  { name: 'Payyanur', lat: 12.1000, lon: 75.2000 },
  { name: 'Nedumangad', lat: 8.6028, lon: 77.0014 },
  { name: 'Mavelikara', lat: 9.2667, lon: 76.5500 },
  { name: 'Perumbavoor', lat: 10.1333, lon: 76.4833 },
];

// Seeder function
async function seedKeralaCities() {
  try {
    const count = await City.countDocuments();

    if (count > 0) {
      console.log(`Already ${count} cities in DB - skipping seed`);
      return;
    }

    // Convert to GeoJSON format
    const formattedCities = keralaCities.map(city => ({
      name: city.name,
      location: {
        type: 'Point',
        coordinates: [city.lon, city.lat], // IMPORTANT: [longitude, latitude]
      },
      state: 'Kerala',
    }));

    const inserted = await City.insertMany(formattedCities);

    console.log(`Successfully added ${inserted.length} cities to DB`);
  } catch (error) {
    console.error('Error seeding cities:', error);
  }
}

module.exports = { seedKeralaCities };
