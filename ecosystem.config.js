module.exports = {
    apps: [{
        name: 'notion_expense_bot',
        script: 'index.js',
        cwd: '/opt/notion_expense_bot',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: '/var/log/notion_expense_bot/error.log',
        out_file: '/var/log/notion_expense_bot/out.log',
        log_file: '/var/log/notion_expense_bot/combined.log',
        time: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        max_restarts: 10,
        min_uptime: '10s'
    }]
};
