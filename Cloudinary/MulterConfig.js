// Corrected Multer Configuration File (e.g., middleware/multerConfig.js)

// 1. Correctly require the Multer package
const multer = require('multer'); 

// 2. Define the storage engine
// The storage object is a method ON the multer package itself.
const storage = multer.memoryStorage(); 

// 3. Create the Multer instance with the defined storage
// This instance holds the methods like .single(), .array(), etc.
const upload = multer({ storage: storage }); 

// 4. Export the configured instance
module.exports = upload;