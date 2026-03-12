const { Queue } = require("bullmq");
const connection = require("../../Config/redisBull"); // Adjust path if needed

// FIX: Name changed to 'payout-queue' to match the worker
const payoutQueue = new Queue("payout-queue", {
  connection
});

module.exports = payoutQueue;