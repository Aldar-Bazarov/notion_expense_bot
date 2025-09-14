function saveExpenseData(ctx, data) {
    if (!ctx.session) {
        ctx.session = {};
    }
    ctx.session.expenseData = data;
}

function getExpenseData(ctx) {
    if (!ctx.session) {
        return null;
    }
    return ctx.session.expenseData;
}

function clearSession(ctx) {
    if (!ctx.session) {
        return;
    }
    delete ctx.session.expenseData;
    delete ctx.session.waitingForNewCategory;
}

function isWaitingForNewCategory(ctx) {
    if (!ctx.session) {
        return false;
    }
    return ctx.session.waitingForNewCategory;
}

function setWaitingForNewCategory(ctx) {
    if (!ctx.session) {
        ctx.session = {};
    }
    ctx.session.waitingForNewCategory = true;
}

module.exports = {
    saveExpenseData,
    getExpenseData,
    clearSession,
    isWaitingForNewCategory,
    setWaitingForNewCategory,
};