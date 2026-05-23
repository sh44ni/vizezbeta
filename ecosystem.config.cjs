module.exports = {
  apps: [
    {
      name: 'vizez-frontend',
      cwd: './',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
    },
    {
      name: 'vizez-backend',
      cwd: './backend',
      script: 'server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        CORS_ORIGIN: 'https://earlyaccess.vizez.cloud',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
    },
    {
      name: 'vizez-lens',
      cwd: './lens',
      script: 'node_modules/.bin/next',
      args: 'start -p 3002',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
    },
  ],
};
