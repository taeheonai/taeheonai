module.exports = {
  apps: [
    {
      name: 'gateway',
      script: 'python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload',
      cwd: './gateway',
      watch: true,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'user-service',
      script: 'python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8001 --reload',
      cwd: './services/user-service',
      watch: true,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'auth-service',
      script: 'python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8002 --reload',
      cwd: './services/auth-service',
      watch: true,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'notification-service',
      script: 'python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8003 --reload',
      cwd: './services/notification-service',
      watch: true,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
}; 