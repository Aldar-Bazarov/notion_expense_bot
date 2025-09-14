const { getExpenseKeyboard } = require('./keyboard');
const { addCategoryIfMissing, createExpenseRecord } = require('./notion');
const {
    saveExpenseData,
    getExpenseData,
    clearSession,
    isWaitingForNewCategory,
    setWaitingForNewCategory,
} = require('./session');
const logger = require('./logger');

async function handleTextMessage(ctx) {
    logger.info('Получено текстовое сообщение', {
        userId: ctx.from.id,
        username: ctx.from.username,
        text: ctx.message.text.substring(0, 100) // Логируем первые 100 символов
    });

    if (isWaitingForNewCategory(ctx)) {
        return handleNewCategoryInput(ctx);
    }

    if (getExpenseData(ctx)) return;

    const lines = ctx.message.text.trim().split('\n').map(line => line.trim());
    if (lines.length < 2) {
        logger.warn('Недостаточно данных в сообщении', {
            userId: ctx.from.id,
            linesCount: lines.length
        });
        return ctx.reply(
            '📌 Отправьте данные в формате:\n\n' +
            'Название товара/услуги\n' +
            'Цена (например: 150,3 или 150.3)\n' +
            'Дата в формате dd.mm.yyyy (опционально)\n' +
            'Комментарий (опционально)\n\n' +
            'Пример:\n' +
            'Кофта красная\n' +
            '150,3\n' +
            '21.09.2025\n' +
            'Купил на распродаже'
        );
    }

    const name = lines[0];
    const priceStr = lines[1];
    const price = parseFloat(priceStr.replace(',', '.'));

    if (isNaN(price)) {
        return ctx.reply('❌ Неправильный формат цены. Используйте цифры и точку/запятую.');
    }

    let date = '';
    let comment = '';

    if (lines.length >= 3 && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(lines[2])) {
        date = lines[2];
        if (lines.length > 3) comment = lines.slice(3).join('\n');
    } else if (lines.length >= 3) {
        comment = lines.slice(2).join('\n');
    }

    saveExpenseData(ctx, { name, price, date, comment });

    const keyboard = await getExpenseKeyboard();
    await ctx.reply(
        '✅ Данные получены!\n\n' +
        `📄 Название: ${name}\n` +
        `💰 Цена: ${price} ₽\n` +
        `📅 Дата: ${date || 'сегодня'}\n` +
        `📝 Комментарий: ${comment || '—'}\n\n` +
        '👉 Выберите категорию:',
        keyboard
    );
}

async function handleCategorySelection(ctx) {
    const data = getExpenseData(ctx);
    if (!data) {
        logger.warn('Попытка выбора категории без данных', {
            userId: ctx.from.id
        });
        return ctx.answerCbQuery('❌ Данные не найдены. Попробуйте начать заново.');
    }

    const category = ctx.match[1]; // cat_Кофе → Кофе
    logger.info('Выбрана категория', {
        userId: ctx.from.id,
        category,
        expenseData: data
    });

    try {
        await addCategoryIfMissing(category);
        const result = await createExpenseRecord({ ...data, category });

        if (result.success) {
            clearSession(ctx);
            await ctx.answerCbQuery(`✅ Категория "${category}" выбрана!`);
            await ctx.editMessageText(
                `✅ Записано:\n` +
                `📄 *${data.name}*\n` +
                `💰 *${data.price} ₽*\n` +
                `📁 *${category}*\n` +
                `📅 ${result.date}\n` +
                `${data.comment ? `💬 ${data.comment}` : ''}`,
                { parse_mode: 'Markdown' }
            );
        } else {
            logger.error('Ошибка при сохранении в Notion', {
                userId: ctx.from.id,
                error: result.error
            });
            await ctx.answerCbQuery('❌ Ошибка при сохранении в Notion.');
            await ctx.editMessageText('❌ Произошла ошибка. Проверьте логи.');
        }
    } catch (error) {
        logger.error('Ошибка при выборе категории', {
            userId: ctx.from.id,
            category,
            error: error.message,
            stack: error.stack
        });
        console.error('Ошибка при выборе категории:', error);
        await ctx.answerCbQuery('❌ Не удалось добавить категорию.');
        await ctx.editMessageText('❌ Ошибка при сохранении.');
    }
}

async function handleCreateNewCategory(ctx) {
    const data = getExpenseData(ctx);
    if (!data) {
        return ctx.answerCbQuery('❌ Данные не найдены.');
    }

    await ctx.answerCbQuery('✏️ Введите название новой категории:');
    setWaitingForNewCategory(ctx);
}

async function handleCancel(ctx) {
    clearSession(ctx);
    await ctx.answerCbQuery('❌ Ввод отменён.');
    await ctx.editMessageText('🗑️ Запись отменена. Вы можете начать заново.');
}

async function handleNewCategoryInput(ctx) {
    if (!isWaitingForNewCategory(ctx)) return;

    const newCategory = ctx.message.text.trim();
    if (!newCategory) {
        return ctx.reply('❌ Название категории не может быть пустым. Попробуйте ещё раз.');
    }

    const data = getExpenseData(ctx);
    if (!data) {
        return ctx.reply('❌ Данные не найдены.');
    }

    try {
        await addCategoryIfMissing(newCategory);
        const result = await createExpenseRecord({ ...data, category: newCategory });

        if (result.success) {
            clearSession(ctx);
            await ctx.reply(
                `✅ Записано:\n` +
                `📄 *${data.name}*\n` +
                `💰 *${data.price} ₽*\n` +
                `📁 *${newCategory}*\n` +
                `📅 ${result.date}\n` +
                `${data.comment ? `💬 ${data.comment}` : ''}`,
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply('❌ Ошибка при сохранении в Notion.');
        }
    } catch (error) {
        console.error('Ошибка создания категории:', error);
        await ctx.reply('❌ Не удалось создать категорию. Попробуйте позже.');
    }
}

module.exports = {
    handleTextMessage,
    handleCategorySelection,
    handleCreateNewCategory,
    handleCancel,
    handleNewCategoryInput,
};