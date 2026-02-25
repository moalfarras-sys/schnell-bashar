require("dotenv").config({ path: ".env" });

module.exports = {
  apps: [
    {
      name: "schnell-sicher-umzug",
      cwd: ".",
      script: ".next/standalone/server.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      merge_logs: true,
      time: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: 3001,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};

