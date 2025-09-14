const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Создаем директорию для логов если её нет
let logsDir = process.env.NODE_ENV === 'production' 
    ? '/var/log/notion_expense_bot' 
    : path.join(__dirname, '../logs');

if (!fs.existsSync(logsDir)) {
    try {
        fs.mkdirSync(logsDir, { recursive: true, mode: 0o755 });
        console.log(`Создана директория для логов: ${logsDir}`);
    } catch (error) {
        console.error(`Ошибка создания директории логов: ${error.message}`);
        // Fallback на локальную директорию
        const fallbackDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(fallbackDir)) {
            fs.mkdirSync(fallbackDir, { recursive: true });
        }
        logsDir = fallbackDir;
    }
}

// Создаем логгер
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'expense-bot' },
    transports: [
        // Записываем все логи в файл
        new winston.transports.File({ 
            filename: path.join(logsDir, 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(logsDir, 'combined.log') 
        })
    ]
});

// В продакшене также выводим в консоль для PM2
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.simple()
        )
    }));
} else {
    // В разработке выводим с цветами
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
