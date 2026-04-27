// backend/bot.js
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
const VERIFY_URL = process.env.VERIFY_URL || 'https://worldchat-kappa.vercel.app/';

if (!TOKEN) {
    console.error('BOT_TOKEN not set');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище кодов верификации
const pendingVerifications = new Map();

// Генерация кода
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Очистка старых кодов каждые 5 минут
setInterval(() => {
    const now = Date.now();
    pendingVerifications.forEach((data, key) => {
        if (now - data.timestamp > 300000) {
            pendingVerifications.delete(key);
        }
    });
}, 300000);

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'User';
    
    bot.sendMessage(chatId,
        `Hello, ${name}!\n\n` +
        `This bot is used for verification in World Chat.\n` +
        `Use /verify to verify your account.\n\n` +
        `Этот бот используется для верификации в World Chat.\n` +
        `Используйте /verify для верификации аккаунта.`,
        {
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Open World Chat', url: VERIFY_URL }
                ]]
            }
        }
    );
});

// /verify
bot.onText(/^\/verify$/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId,
        'To verify your account:\n' +
        '1. Open World Chat\n' +
        '2. Go to Settings\n' +
        '3. Click "Verify"\n' +
        '4. Send the verification code here\n\n' +
        'Для верификации:\n' +
        '1. Откройте World Chat\n' +
        '2. Перейдите в Настройки\n' +
        '3. Нажмите "Верификация"\n' +
        '4. Отправьте код сюда'
    );
});

// /verify CODE
bot.onText(/^\/verify ([A-Z0-9]{8})$/, (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1];
    const telegramId = msg.from.id;
    const telegramUsername = msg.from.username || '';
    
    // Ищем код
    let foundKey = null;
    pendingVerifications.forEach((data, key) => {
        if (data.code === code) {
            foundKey = key;
        }
    });
    
    if (!foundKey) {
        bot.sendMessage(chatId, 'Invalid or expired code. Please try again.');
        return;
    }
    
    const verificationData = pendingVerifications.get(foundKey);
    verificationData.telegramId = telegramId;
    verificationData.telegramUsername = telegramUsername;
    verificationData.verified = true;
    
    bot.sendMessage(chatId,
        'Verification successful! Your account is now verified.\n\n' +
        'You can return to World Chat.',
        {
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Return to Chat', url: VERIFY_URL }
                ]]
            }
        }
    );
});

// /whoami
bot.onText(/\/whoami/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        `Your Telegram ID: \`${msg.from.id}\`\n` +
        `Username: @${msg.from.username || 'none'}\n` +
        `Name: ${msg.from.first_name} ${msg.from.last_name || ''}`,
        { parse_mode: 'Markdown' }
    );
});

// /code - показать код (если есть активный)
bot.onText(/\/code/, (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    
    let userCode = null;
    pendingVerifications.forEach((data, key) => {
        if (data.telegramId === telegramId) {
            userCode = data.code;
        }
    });
    
    if (userCode) {
        bot.sendMessage(chatId,
            `Your verification code: \`${userCode}\`\n` +
            `Send this in World Chat to verify.`,
            { parse_mode: 'Markdown' }
        );
    } else {
        bot.sendMessage(chatId,
            'No active verification code found.\n' +
            'Go to World Chat Settings and click "Verify" to get a code.'
        );
    }
});

// Функция создания кода верификации (вызывается из server.js)
function createVerificationCode(userId, userName) {
    const code = generateCode();
    pendingVerifications.set(userId, {
        code,
        userName,
        telegramId: null,
        telegramUsername: null,
        verified: false,
        timestamp: Date.now(),
    });
    return code;
}

// Функция проверки статуса верификации
function getVerificationStatus(userId) {
    const data = pendingVerifications.get(userId);
    if (!data) return null;
    return {
        verified: data.verified,
        telegramId: data.telegramId,
        telegramUsername: data.telegramUsername,
    };
}

// Экспорт
module.exports = {
    bot,
    createVerificationCode,
    getVerificationStatus,
};

console.log('Telegram bot started');
