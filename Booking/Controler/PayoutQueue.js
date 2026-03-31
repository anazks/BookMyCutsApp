const { Queue } = require('bullmq');

const connection = require('../../Config/redisBull');

// Create the Payout Queue
const payoutQueue = new Queue('PayoutQueue', { 
    connection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false
    }
});

console.log("bullmq PayoutQueue initialized.");

module.exports = payoutQueue;