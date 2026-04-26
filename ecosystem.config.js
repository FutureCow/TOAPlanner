module.exports = {
  apps: [
    {
      name: 'toa-superadmin',
      script: 'superadmin-server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        SUPERADMIN_PORT: 3001,
      },
    },
    {
      name: 'toa-planner',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      node_args: '--disable-warning=DEP0169',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
