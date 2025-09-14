const { Client } = require('@notionhq/client');
const logger = require('./logger');

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    notionVersion: '2022-06-28'
});

// Кэш для категорий
let categoriesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

async function getCategories() {
    // Проверяем кэш
    const now = Date.now();
    if (categoriesCache && (now - cacheTimestamp) < CACHE_DURATION) {
        logger.debug('Используем кэшированные категории');
        return categoriesCache;
    }

    try {
        logger.info('Получение категорий из Notion');
        const database = await notion.databases.retrieve({
            database_id: process.env.DATABASE_ID,
        });

        const categoryProp = database.properties.Категория;
        if (!categoryProp || categoryProp.type !== 'multi_select') {
            throw new Error('Поле "Категория" должно быть типа MultiSelect!');
        }

        const categories = categoryProp.multi_select.options.map(opt => opt.name);
        logger.info('Категории получены успешно', { categories });

        // Обновляем кэш
        categoriesCache = categories;
        cacheTimestamp = now;

        return categories;
    } catch (error) {
        logger.error('Ошибка при получении категорий', {
            error: error.message,
            stack: error.stack
        });
        console.error('Ошибка при получении категорий:', error.message);
        return [];
    }
}

async function addCategoryIfMissing(categoryName) {
    // Проверяем кэш без дополнительного запроса
    if (categoriesCache && categoriesCache.includes(categoryName)) {
        logger.debug('Категория уже существует в кэше', { categoryName });
        return categoryName;
    }

    // Если кэш пустой, получаем категории
    const existing = await getCategories();
    if (existing.includes(categoryName)) return categoryName;

    try {
        logger.info('Добавление новой категории в Notion', { categoryName });
        await notion.databases.update({
            database_id: process.env.DATABASE_ID,
            properties: {
                Категория: {
                    multi_select: {
                        options: [
                            ...existing,
                            { name: categoryName, color: 'black' },
                        ],
                    },
                },
            },
        });

        // Обновляем кэш
        categoriesCache = [...existing, categoryName];
        cacheTimestamp = Date.now();

        logger.info('Новая категория добавлена успешно', { categoryName });
        return categoryName;
    } catch (error) {
        logger.error('Ошибка при добавлении категории', {
            categoryName,
            error: error.message,
            stack: error.stack
        });
        console.error('❌ Не удалось добавить категорию:', error);
        throw new Error(`Не удалось создать категорию "${categoryName}"`);
    }
}

async function createExpenseRecord(data) {
    const formattedDate = data.date ? formatDateToNotion(data.date) : getMoscowDate();

    logger.info('Создание записи расхода в Notion', {
        name: data.name,
        price: data.price,
        category: data.category,
        date: formattedDate
    });

    try {
        await notion.pages.create({
            parent: { database_id: process.env.DATABASE_ID },
            properties: {
                Название: {
                    title: [{ text: { content: data.name } }],
                },
                Цена: {
                    number: data.price,
                },
                Категория: {
                    multi_select: [{ name: data.category }],
                },
                Дата: {
                    date: {
                        start: formattedDate,
                    },
                },
                Комментарий: {
                    rich_text: data.comment ? [{ text: { content: data.comment } }] : [],
                },
            },
        });
        logger.info('Запись расхода успешно создана в Notion', {
            name: data.name,
            price: data.price,
            category: data.category
        });
        return { success: true, date: formattedDate };
    } catch (error) {
        logger.error('Ошибка записи в Notion', {
            error: error.message,
            stack: error.stack,
            data
        });
        console.error('❌ Ошибка записи в Notion:', error);
        return { success: false, error: error.message };
    }
}

function formatDateToNotion(dateStr) {
    const [day, month, year] = dateStr.split('.');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getMoscowDate() {
    const now = new Date();
    // Получаем московское время
    const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));

    // Форматируем как YYYY-MM-DD для Notion
    const year = moscowTime.getFullYear();
    const month = String(moscowTime.getMonth() + 1).padStart(2, '0');
    const day = String(moscowTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function clearCategoriesCache() {
    categoriesCache = null;
    cacheTimestamp = 0;
    logger.info('Кэш категорий очищен');
}

module.exports = {
    getCategories,
    addCategoryIfMissing,
    createExpenseRecord,
    formatDateToNotion,
    getMoscowDate,
    clearCategoriesCache,
};