// backend/bot.js
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const TOKEN = process.env.BOT_TOKEN || '// backend/bot.js
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const TOKEN = process.env.BOT_TOKEN || '8672346594:AAE9Q-6m8E_CkrLtF8mQ3Jf7bWfMNmLcKSk';
const VERIFY_URL = process.env.VERIFY_URL || 'https://hambot-six.vercel.app';

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище временных кодов верификации
const pendingVerifications = new Map(); // { userId: { code, telegramId, timestamp } }

// Генерация случайного кода
function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    '🌍 *World Chat Verification*\n\n' +
    'Use /verify to verify your account.\n' +
    'Используйте /verify для верификации.',
    { parse_mode: 'Markdown' }
  );
});

// Команда /verify
bot.onText(/\/verify/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    '🔐 *Verification*\n\n' +
    'Send the verification code from the website.\n' +
    'Отправьте код верификации с сайта.',
    { parse_mode: 'Markdown' }
  );
});

// Команда /verify с кодом
bot.onText(/\/verify (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1].trim();
  
  // Ищем код в pendingVerifications
  let foundUserId = null;
  pendingVerifications.forEach((data, userId) => {
    if (data.code === code && Date.now() - data.timestamp < 300000) { // 5 минут
      foundUserId = userId;
    }
  });
  
  if (foundUserId) {
    const userData = pendingVerifications.get(foundUserId);
    userData.telegramId = msg.from.id;
    userData.telegramUsername = msg.from.username || '';
    
    // Отправляем подтверждение на сервер
    const postData = JSON.stringify({
      userId: foundUserId,
      telegramId: msg.from.id,
      telegramUsername: msg.from.username || ''
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        bot.sendMessage(chatId, '✅ Verification successful! Your account is now verified.');
      }
    });
    req.write(postData);
    req.end();
    
    pendingVerifications.delete(foundUserId);
  } else {
    bot.sendMessage(chatId, '❌ Invalid or expired code. Please try again.');
  }
});

// Команда /whoami
bot.onText(/\/whoami/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `Your Telegram ID: \`${msg.from.id}\`\n` +
    `Username: @${msg.from.username || 'none'}`,
    { parse_mode: 'Markdown' }
  );
});

// API для создания кода верификации (вызывается из server.js)
function createVerificationCode(userId, userName) {
  const code = generateCode();
  pendingVerifications.set(userId, {
    code,
    telegramId: null,
    telegramUsername: null,
    timestamp: Date.now(),
    userName
  });
  return code;
}

// Очистка старых кодов каждые 10 минут
setInterval(() => {
  const now = Date.now();
  pendingVerifications.forEach((data, userId) => {
    if (now - data.timestamp > 600000) { // 10 минут
      pendingVerifications.delete(userId);
    }
  });
}, 600000);

// Экспорт функции для использования в server.js
module.exports = { createVerificationCode };

console.log('Telegram bot started...');';
const VERIFY_URL = process.env.VERIFY_URL || 'https://hambot-six.vercel.app';

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище временных кодов верификации
const pendingVerifications = new Map(); // { userId: { code, telegramId, timestamp } }

// Генерация случайного кода
function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    '🌍 *World Chat Verification*\n\n' +
    'Use /verify to verify your account.\n' +
    'Используйте /verify для верификации.',
    { parse_mode: 'Markdown' }
  );
});

// Команда /verify
bot.onText(/\/verify/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    '🔐 *Verification*\n\n' +
    'Send the verification code from the website.\n' +
    'Отправьте код верификации с сайта.',
    { parse_mode: 'Markdown' }
  );
});

// Команда /verify с кодом
bot.onText(/\/verify (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1].trim();
  
  // Ищем код в pendingVerifications
  let foundUserId = null;
  pendingVerifications.forEach((data, userId) => {
    if (data.code === code && Date.now() - data.timestamp < 300000) { // 5 минут
      foundUserId = userId;
    }
  });
  
  if (foundUserId) {
    const userData = pendingVerifications.get(foundUserId);
    userData.telegramId = msg.from.id;
    userData.telegramUsername = msg.from.username || '';
    
    // Отправляем подтверждение на сервер
    const postData = JSON.stringify({
      userId: foundUserId,
      telegramId: msg.from.id,
      telegramUsername: msg.from.username || ''
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        bot.sendMessage(chatId, '✅ Verification successful! Your account is now verified.');
      }
    });
    req.write(postData);
    req.end();
    
    pendingVerifications.delete(foundUserId);
  } else {
    bot.sendMessage(chatId, '❌ Invalid or expired code. Please try again.');
  }
});

// Команда /whoami
bot.onText(/\/whoami/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `Your Telegram ID: \`${msg.from.id}\`\n` +
    `Username: @${msg.from.username || 'none'}`,
    { parse_mode: 'Markdown' }
  );
});

// API для создания кода верификации (вызывается из server.js)
function createVerificationCode(userId, userName) {
  const code = generateCode();
  pendingVerifications.set(userId, {
    code,
    telegramId: null,
    telegramUsername: null,
    timestamp: Date.now(),
    userName
  });
  return code;
}

// Очистка старых кодов каждые 10 минут
setInterval(() => {
  const now = Date.now();
  pendingVerifications.forEach((data, userId) => {
    if (now - data.timestamp > 600000) { // 10 минут
      pendingVerifications.delete(userId);
    }
  });
}, 600000);

// Экспорт функции для использования в server.js
module.exports = { createVerificationCode };

console.log('Telegram bot started...');
