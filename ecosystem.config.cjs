module.exports = {
  apps: [{
    name: 'pms-backend',
    script: 'server/index.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
