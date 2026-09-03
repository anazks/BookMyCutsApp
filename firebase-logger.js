const admin = require('firebase-admin');
const { Tail } = require('tail');

// Load the Service Account Key you provided
const serviceAccount = require('./bookmycuts-185db-firebase-adminsdk-fbsvc-06f37dba04.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bookmycuts-185db-default-rtdb.asia-southeast1.firebasedatabase.app" 
});

// Reference the live_server_logs node in Realtime DB
const dbRef = admin.database().ref('live_server_logs');

// The PM2 text file we want to watch
const logFilePath = "C:/Users/Govind/pm2-logs/bookmycut-out.log";

// Initialize the Tail library to watch the file
const tail = new Tail(logFilePath, {
  fromBeginning: false, // Don't upload the entire history, just new lines
  follow: true
});

tail.on("line", function(data) {
  // Every time a new line is written to the file, push it to Firebase
  if(data && data.trim() !== '') {
    dbRef.push({
      log: data,
      timestamp: admin.database.ServerValue.TIMESTAMP
    }).catch(err => console.error("Firebase push failed:", err));
  }
});

tail.on("error", function(error) {
  console.log('Tail error: ', error);
});

console.log(`Firebase Log Streaming started. Watching ${logFilePath}...`);
