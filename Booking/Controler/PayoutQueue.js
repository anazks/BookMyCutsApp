const { Queue } = require('bullmq');

// Ensure you have REDIS_URL configured in your .env
// e.g. REDIS_URL="redis://red-d603ajt6ubrc73d0jnd0:6379"
const connection = { url: process.env.REDIS_URL };

// Create the Payout Queue
const payoutQueue = new Queue('PayoutQueue', { connection });

console.log("bullmq PayoutQueue initialized.");

module.exports = payoutQueue;