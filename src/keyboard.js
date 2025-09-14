const { getCategories } = require('./notion');

async function getExpenseKeyboard() {
    const categories = await getCategories();
    const rows = categories.map(cat => [{ text: cat, callback_data: `cat_${cat}` }]);
    rows.push(
        [{ text: '➕ Создать новую', callback_data: 'new_cat' }],
        [{ text: '❌ Отмена', callback_data: 'cancel' }]
    );

    return { reply_markup: { inline_keyboard: rows } };
}

module.exports = { getExpenseKeyboard };