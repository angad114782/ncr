// pm2 process file — keeps the API running, restarts it after a crash or a server reboot (pm2 startup + pm2 save).
//   pm2 startOrReload ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: 'ncr-api',
      script: 'src/server.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      time: true,
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production' },
    },
  ],
}
