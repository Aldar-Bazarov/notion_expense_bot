require('dotenv').config();

const { Telegraf, session } = require('telegraf');
const { handleTextMessage, handleCategorySelection, handleCreateNewCategory, handleCancel } = require('./src/handler');
const logger = require('./src/logger');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.use(session({
    defaultSession: () => ({})
}));

bot.command('start', (ctx) => {
    logger.info('Пользователь запустил бота', { 
        userId: ctx.from.id, 
        username: ctx.from.username 
    });
    
    ctx.reply(
        '👋 Привет! Я бот для записи расходов в Notion.\n\n' +
        '📌 Отправьте данные в формате:\n\n' +
        '- Название траты\n' +
        '- Цена\n' +
        '- Дата в формате dd.mm.yyyy (опционально)\n' +
        '- Комментарий (опционально)\n\n' +
        'Пример:\n' +
        'Кофта красная\n' +
        '150,3\n' +
        '21.09.2025\n' +
        'Купил на распродаже\n\n' +
        '➡️ После этого я предложу выбрать категорию.'
    );
});

bot.on('text', handleTextMessage);
bot.action(/cat_(.*)/, handleCategorySelection);
bot.action('new_cat', handleCreateNewCategory);
bot.action('cancel', handleCancel);

bot.launch().then(() => {
    logger.info('🤖 Telegram-бот запущен и готов к работе!');
    console.log('🤖 Telegram-бот запущен и готов к работе!');
}).catch((error) => {
    logger.error('Ошибка при запуске бота', error);
    console.error('Ошибка при запуске бота:', error);
});

process.once('SIGINT', () => {
    logger.info('Получен сигнал SIGINT, останавливаем бота');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    logger.info('Получен сигнал SIGTERM, останавливаем бота');
    bot.stop('SIGTERM');
});