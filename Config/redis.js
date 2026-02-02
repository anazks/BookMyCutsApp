const redis = require('redis');


// Connect to Memurai (Redis server)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL ||  'redis://127.0.0.1:6379' // Memurai default
});

// Event listeners
redisClient.on('connect', () => {
  console.log('✅ Redis (Memurai) connected');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connect asynchronously
(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;
