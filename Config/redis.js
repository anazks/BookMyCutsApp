const redis = require('redis');

// Decide which URL to use
let redisUrl;

if (process.env.NODE_ENV === 'production') {
  // On Render → must have REDIS_URL set
  if (!process.env.REDIS_URL) {
    throw new Error(
      'REDIS_URL environment variable is missing in production. ' +
      'Set it in Render dashboard → Environment tab.'
    );
  }
  redisUrl = process.env.REDIS_URL;
  console.log('Using Render Redis (production):', redisUrl);
} else {
  // Local development → use Memurai / local Redis
  redisUrl = 'redis://127.0.0.1:6379';
  console.log('Using local Redis (development):', redisUrl);
}

const redisClient = redis.createClient({
  url: redisUrl
});

// Better event logging
redisClient.on('connect', () => {
  console.log(`✅ Redis connected successfully → ${redisUrl}`);
});

redisClient.on('ready', () => {
  console.log('Redis client is ready to accept commands');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error(
      '→ Is your local Redis/Memurai running on port 6379?'
    );
  }
  if (err.code === 'ENOTFOUND') {
    console.error(
      '→ Hostname not found. Are you trying to use Render internal URL locally? Use local fallback instead.'
    );
  }
});

redisClient.on('end', () => {
  console.log('Redis connection closed');
});

// Connect once when the module loads
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connection established');
  } catch (err) {
    console.error('Failed to establish Redis connection:', err.message);
  }
})();

module.exports = redisClient;