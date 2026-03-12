const IORedis = require("ioredis");

let redisUrl;

if (process.env.NODE_ENV === "production") {
  redisUrl = process.env.REDIS_URL;
  console.log("Using Render Redis for BullMQ:", redisUrl);
} else {
  redisUrl = "redis://127.0.0.1:6379";
  console.log("Using Local Redis for BullMQ:", redisUrl);
}

// FIX: Added maxRetriesPerRequest: null
const connection = new IORedis(redisUrl, { 
    maxRetriesPerRequest: null 
});

connection.on("connect", () => {
  console.log("BullMQ Redis connected");
});

connection.on("error", (err) => {
  console.error("BullMQ Redis error:", err.message);
});

module.exports = connection;