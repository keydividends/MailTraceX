/**
 * PM2 ecosystem config for running backend and web in development via `npm run dev`.
 * Usage (from repo root):
 *   npx pm2 start ecosystem.config.js
 *   npx pm2 stop ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'mailtracex-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev',
      exec_interpreter: 'bash',
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'mailtracex-web',
      cwd: './web',
      script: 'npm',
      args: 'run dev',
      exec_interpreter: 'bash',
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
