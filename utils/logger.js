const winston = require('winston');
const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  const keyPath = path.join(__dirname, '..', 'bookmycuts-b8e1d-firebase-adminsdk-fbsvc-dd91b48126.json');
  const serviceAccount = require(keyPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://bookmycuts-b8e1d-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

// Helper function to deep-clean objects for Firebase (removes $ and . from keys)
function cleanObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Handle Mongoose documents specifically
  if (obj.toObject && typeof obj.toObject === 'function') {
    obj = obj.toObject();
  }

  const clean = Array.isArray(obj) ? [] : {};
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Replace illegal Firebase characters in keys
      const cleanKey = key.replace(/[\.\$\[\]\#\/]/g, '_');
      clean[cleanKey] = cleanObject(obj[key]);
    }
  }
  return clean;
}

class FirebaseRTDBTransport extends winston.Transport {
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    const { level, message, timestamp, ...meta } = info;

    // CLEAN THE DATA BEFORE PUSHING TO FIREBASE
    const safeMeta = cleanObject(meta);

    db.ref('server_logs').push({
      level,
      message,
      timestamp: timestamp || new Date().toISOString(),
      meta: safeMeta
    }).then(() => callback())
      .catch((err) => {
        console.error('🔥 FIREBASE LOGGING ERROR:', err.message);
        callback();
      });
  }
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new FirebaseRTDBTransport()
  ]
});

logger.info("🚀 Winston Firebase Logger Fixed & Initialized!");

module.exports = logger;
