module.exports = {
  apps: [{
    name: 'portalv2',
    // Koristite npm start umesto direktnog pokretanja server.ts
    // jer Next.js build proces kompajlira TypeScript
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // Restart aplikacije ako koristi više od 1GB RAM-a
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};

