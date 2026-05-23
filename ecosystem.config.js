module.exports = {
  apps: [
    {
      name: "bookmycut",
      script: "./app.js",
      error_file: "C:/Users/Govind/pm2-logs/bookmycut-error.log",
      out_file: "C:/Users/Govind/pm2-logs/bookmycut-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    }
  ],
};
