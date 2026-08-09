module.exports = {
  apps: [
    {
      name: "yunque-marketing-assistant",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: "768M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
