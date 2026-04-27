// backend/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const betterSqlite3 = require('better-sqlite3');
const bot = require('./bot');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- SQLite База данных ---
const db = betterSqlite3('chat.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT,
    text TEXT,
    time INTEGER,
    replyTo TEXT,
    edited INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    type TEXT DEFAULT 'text',
    fileUrl TEXT,
    fileName TEXT,
    fileSize INTEGER,
    duration INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT UNIQUE,
    avatar TEXT,
    verified INTEGER DEFAULT 0,
    telegramId INTEGER,
    badge TEXT DEFAULT '',
    theme TEXT DEFAULT 'dark',
    fontSize TEXT DEFAULT 'medium',
    language TEXT DEFAULT 'ru',
    notifications INTEGER DEFAULT 1
  );
  
  CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    question TEXT,
    options TEXT,
    type TEXT,
    creator TEXT,
    votes TEXT DEFAULT '{}',
    closed INTEGER DEFAULT 0,
    anonymous INTEGER DEFAULT 0,
    multiple INTEGER DEFAULT 0,
    closeDate INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS pinned_message (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    message_id TEXT
  );
  
  CREATE TABLE IF NOT EXISTS reactions (
    message_id TEXT,
    username TEXT,
    reaction TEXT,
    PRIMARY KEY (message_id, username)
  );
  
  CREATE TABLE IF NOT EXISTS quick_messages (
    id TEXT PRIMARY KEY,
    text TEXT,
    created_by TEXT
  );
`);

// Сохранённые WebSocket клиенты
const clients = new Map(); // { ws: userData }
const rateLimits = new Map(); // { userId: [timestamps] }

// --- Инициализация ---
const BOT_USERNAME = process.env.BOT_USERNAME || 'herrmeesagentbot';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin2011';

// --- REST API ---

// Верификация через Telegram
app.post('/api/verify', (req, res) => {
  const { userId, telegramId, telegramUsername } = req.body;
  if (!userId || !telegramId) {
    return res.status(400).json({ error: 'Missing data' });
  }
  
  db.prepare('UPDATE users SET verified = 1, telegramId = ? WHERE id = ?')
    .run(telegramId, userId);
  
  // Уведомить пользователя через WebSocket
  clients.forEach((user, client) => {
    if (user.id === userId && client.readyState === WebSocket.OPEN) {
      user.verified = true;
      user.telegramId = telegramId;
      const userData = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      client.send(JSON.stringify({ type: 'verified', user: userData }));
      broadcastUsers();
    }
  });
  
  res.json({ success: true });
});

// Получить код верификации
app.post('/api/verification-code', (req, res) => {
  const { userId, userName } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  
  const code = bot.createVerificationCode(userId, userName);
  res.json({ code, botUsername: BOT_USERNAME });
});

// Проверить username
app.get('/api/check-username/:username', (req, res) => {
  const { username } = req.params;
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  res.json({ available: !existing });
});

// Получить профиль пользователя
app.get('/api/user/:username', (req, res) => {
  const user = db.prepare('SELECT id, name, username, avatar, verified, badge FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Получить быстрые сообщения
app.get('/api/quick-messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM quick_messages').all();
  res.json(messages);
});

// Добавить быстрое сообщение (только админ)
app.post('/api/quick-messages', (req, res) => {
  const { text, username } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.badge !== 'admin') return res.status(403).json({ error: 'Not admin' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO quick_messages (id, text, created_by) VALUES (?, ?, ?)').run(id, text, username);
  res.json({ id, text });
});

// Удалить быстрое сообщение (только админ)
app.delete('/api/quick-messages/:id', (req, res) => {
  const { username } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.badge !== 'admin') return res.status(403).json({ error: 'Not admin' });
  
  db.prepare('DELETE FROM quick_messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Админ-логин
app.post('/api/admin-login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASS) return res.status(403).json({ error: 'Wrong password' });
  res.json({ success: true, token: ADMIN_PASS });
});

// Экспорт истории
app.get('/api/export/:format', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages WHERE deleted = 0 ORDER BY time ASC').all();
  
  if (req.params.format === 'json') {
    res.setHeader('Content-Disposition', 'attachment; filename=chat_history.json');
    res.json(messages);
  } else if (req.params.format === 'txt') {
    let text = '=== World Chat History ===\n\n';
    messages.forEach(m => {
      text += `[${new Date(m.time).toLocaleString()}] ${m.name} (@${m.username}): ${m.text || '[media]'}\n`;
    });
    res.setHeader('Content-Disposition', 'attachment; filename=chat_history.txt');
    res.send(text);
  }
});

// Отправка жалобы
app.post('/api/report', (req, res) => {
  const { reporter, reportedUser, messageId, messageText, reason } = req.body;
  
  // Отправляем на почту через внешний сервис или просто логируем
  console.log('REPORT:', { reporter, reportedUser, messageId, messageText, reason });
  
  // Здесь можно добавить отправку на email через nodemailer или FormSubmit
  res.json({ success: true });
});

// --- WebSocket ---
wss.on('connection', (ws) => {
  const userId = uuidv4();
  const user = {
    id: userId,
    ws: ws,
    name: '',
    username: '',
    avatar: '',
    verified: false,
    badge: '',
    online: true,
    lastSeen: Date.now(),
  };
  clients.set(ws, user);
  
  // Отправляем историю
  const historyMessages = db.prepare('SELECT * FROM messages WHERE deleted = 0 ORDER BY time ASC LIMIT 200').all();
  const pinned = db.prepare('SELECT * FROM pinned_message WHERE id = 1').get();
  const quickMessages = db.prepare('SELECT * FROM quick_messages').all();
  const pollsData = db.prepare('SELECT * FROM polls WHERE closed = 0').all().map(p => ({
    ...p,
    options: JSON.parse(p.options),
    votes: JSON.parse(p.votes)
  }));
  
  ws.send(JSON.stringify({
    type: 'init',
    userId,
    messages: historyMessages,
    pinned: pinned?.message_id || null,
    quickMessages,
    polls: pollsData
  }));
  
  broadcastOnlineCount();
  broadcastUsers();
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Invalid message', e);
    }
  });
  
  ws.on('close', () => {
    const u = clients.get(ws);
    if (u) {
      u.online = false;
      u.lastSeen = Date.now();
    }
    clients.delete(ws);
    broadcastOnlineCount();
    broadcastUsers();
  });
});

// --- WebSocket обработчики ---
function handleMessage(ws, msg) {
  const user = clients.get(ws);
  if (!user) return;
  
  switch (msg.type) {
    case 'register':
      handleRegister(ws, user, msg);
      break;
    case 'update_profile':
      handleUpdateProfile(ws, user, msg);
      break;
    case 'message':
      handleNewMessage(ws, user, msg);
      break;
    case 'edit_message':
      handleEditMessage(ws, user, msg);
      break;
    case 'delete_message':
      handleDeleteMessage(ws, user, msg);
      break;
    case 'typing':
      broadcast({ type: 'typing', username: user.username }, ws);
      break;
    case 'reaction':
      handleReaction(ws, user, msg);
      break;
    case 'pin_message':
      handlePinMessage(ws, user, msg);
      break;
    case 'create_poll':
      handleCreatePoll(ws, user, msg);
      break;
    case 'vote':
      handleVote(ws, user, msg);
      break;
    case 'close_poll':
      handleClosePoll(ws, user, msg);
      break;
    case 'voice_message':
      handleVoiceMessage(ws, user, msg);
      break;
    case 'report':
      handleReport(ws, user, msg);
      break;
    case 'admin_action':
      handleAdminAction(ws, user, msg);
      break;
    case 'mention':
      handleMention(ws, user, msg);
      break;
  }
}

function handleRegister(ws, user, msg) {
  if (!msg.name || !msg.username) {
    ws.send(JSON.stringify({ type: 'error', text: 'Name and username required' }));
    return;
  }
  
  if (msg.username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(msg.username)) {
    ws.send(JSON.stringify({ type: 'error', text: 'Username: 3+ chars, letters/numbers/underscore' }));
    return;
  }
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(msg.username, user.id);
  if (existing) {
    ws.send(JSON.stringify({ type: 'error', text: 'Username already taken' }));
    return;
  }
  
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, username, avatar, verified, badge)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, msg.name, msg.username, user.avatar || '', user.verified ? 1 : 0, user.badge || '');
  
  user.name = msg.name;
  user.username = msg.username;
  
  ws.send(JSON.stringify({ type: 'registered', id: user.id, name: user.name, username: user.username }));
  broadcastUsers();
  
  // Системное сообщение
  const sysMsg = {
    id: uuidv4(),
    name: 'System',
    username: 'system',
    text: `${user.name} joined the chat`,
    time: Date.now(),
    type: 'system'
  };
  broadcast({ type: 'new_message', message: sysMsg });
}

function handleNewMessage(ws, user, msg) {
  if (!user.name) {
    ws.send(JSON.stringify({ type: 'error', text: 'Register first' }));
    return;
  }
  
  if (!checkRateLimit(user.id)) {
    ws.send(JSON.stringify({ type: 'error', text: 'Rate limit: 10 messages per minute' }));
    return;
  }
  
  const msgId = uuidv4();
  const newMsg = {
    id: msgId,
    name: user.name,
    username: user.username,
    text: msg.text || '',
    time: Date.now(),
    replyTo: msg.replyTo || null,
    edited: 0,
    deleted: 0,
    type: msg.msgType || 'text',
    fileUrl: msg.fileUrl || null,
    fileName: msg.fileName || null,
    fileSize: msg.fileSize || null,
    duration: msg.duration || null,
  };
  
  db.prepare(`
    INSERT INTO messages (id, name, username, text, time, replyTo, edited, deleted, type, fileUrl, fileName, fileSize, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newMsg.id, newMsg.name, newMsg.username, newMsg.text, newMsg.time,
          newMsg.replyTo, newMsg.edited, newMsg.deleted, newMsg.type,
          newMsg.fileUrl, newMsg.fileName, newMsg.fileSize, newMsg.duration);
  
  broadcast({ type: 'new_message', message: newMsg });
}

function handleEditMessage(ws, user, msg) {
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.messageId);
  if (!message || message.username !== user.username) {
    ws.send(JSON.stringify({ type: 'error', text: 'Cannot edit this message' }));
    return;
  }
  
  db.prepare('UPDATE messages SET text = ?, edited = 1 WHERE id = ?').run(msg.text, msg.messageId);
  broadcast({ type: 'message_edited', messageId: msg.messageId, text: msg.text, edited: 1 });
}

function handleDeleteMessage(ws, user, msg) {
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.messageId);
  if (!message) return;
  
  if (msg.deleteFor === 'all') {
    if (message.username === user.username || user.badge === 'admin' || user.badge === 'moderator') {
      db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(msg.messageId);
      broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
    }
  } else if (msg.deleteFor === 'me') {
    broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'me', username: user.username });
  }
}

function handleReaction(ws, user, msg) {
  const existing = db.prepare('SELECT * FROM reactions WHERE message_id = ? AND username = ?').get(msg.messageId, user.username);
  
  if (existing && existing.reaction === msg.reaction) {
    db.prepare('DELETE FROM reactions WHERE message_id = ? AND username = ?').run(msg.messageId, user.username);
  } else {
    db.prepare('INSERT OR REPLACE INTO reactions (message_id, username, reaction) VALUES (?, ?, ?)')
      .run(msg.messageId, user.username, msg.reaction);
  }
  
  const reactions = db.prepare('SELECT reaction, COUNT(*) as count FROM reactions WHERE message_id = ? GROUP BY reaction').all(msg.messageId);
  broadcast({ type: 'reactions_updated', messageId: msg.messageId, reactions });
}

function handlePinMessage(ws, user, msg) {
  if (user.badge !== 'admin') {
    ws.send(JSON.stringify({ type: 'error', text: 'Only admin can pin messages' }));
    return;
  }
  
  db.prepare('INSERT OR REPLACE INTO pinned_message (id, message_id) VALUES (1, ?)').run(msg.messageId);
  broadcast({ type: 'message_pinned', messageId: msg.messageId });
}

function handleCreatePoll(ws, user, msg) {
  const pollId = uuidv4();
  db.prepare('INSERT INTO polls (id, question, options, type, creator, anonymous, multiple, closeDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(pollId, msg.question, JSON.stringify(msg.options), msg.pollsType, user.username,
         msg.anonymous ? 1 : 0, msg.multiple ? 1 : 0, msg.closeDate || null);
  
  broadcast({
    type: 'new_poll',
    poll: {
      id: pollId,
      question: msg.question,
      options: msg.options,
      type: msg.pollsType,
      creator: user.username,
      votes: {},
      closed: 0,
      anonymous: msg.anonymous || false,
      multiple: msg.multiple || false,
      closeDate: msg.closeDate || null
    }
  });
}

function handleVote(ws, user, msg) {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(msg.pollId);
  if (!poll || poll.closed) return;
  
  const votes = JSON.parse(poll.votes);
  votes[user.username] = msg.option;
  db.prepare('UPDATE polls SET votes = ? WHERE id = ?').run(JSON.stringify(votes), msg.pollId);
  
  broadcast({ type: 'poll_updated', pollId: msg.pollId, votes });
}

function handleClosePoll(ws, user, msg) {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(msg.pollId);
  if (poll && (poll.creator === user.username || user.badge === 'admin')) {
    db.prepare('UPDATE polls SET closed = 1 WHERE id = ?').run(msg.pollId);
    broadcast({ type: 'poll_closed', pollId: msg.pollId });
  }
}

function handleVoiceMessage(ws, user, msg) {
  const msgId = uuidv4();
  const voiceMsg = {
    id: msgId,
    name: user.name,
    username: user.username,
    text: '',
    time: Date.now(),
    replyTo: msg.replyTo || null,
    type: 'voice',
    fileUrl: msg.audioUrl,
    duration: msg.duration,
  };
  
  db.prepare('INSERT INTO messages (id, name, username, text, time, replyTo, type, fileUrl, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(voiceMsg.id, voiceMsg.name, voiceMsg.username, '', voiceMsg.time, voiceMsg.replyTo, 'voice', msg.audioUrl, msg.duration);
  
  broadcast({ type: 'new_message', message: voiceMsg });
}

function handleReport(ws, user, msg) {
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.messageId);
  if (!message) return;
  
  const reportData = {
    reporter: user.username,
    reportedUser: message.username,
    messageId: msg.messageId,
    messageText: message.text,
    reason: msg.reason
  };
  
  // POST запрос для отправки на email (через FormSubmit или EmailJS)
  // Здесь можно добавить реальную отправку
  
  ws.send(JSON.stringify({ type: 'report_submitted' }));
}

function handleAdminAction(ws, user, msg) {
  if (user.badge !== 'admin') {
    ws.send(JSON.stringify({ type: 'error', text: 'Admin only' }));
    return;
  }
  
  switch (msg.action) {
    case 'delete_message':
      db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(msg.messageId);
      broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
      break;
      
    case 'set_badge':
      db.prepare('UPDATE users SET badge = ? WHERE username = ?').run(msg.badge, msg.username);
      broadcastUsers();
      break;
      
    case 'update_bot_name':
      db.prepare('UPDATE users SET name = ? WHERE username = ?').run(msg.name, user.username);
      user.name = msg.name;
      broadcastUsers();
      break;
      
    case 'update_bot_avatar':
      db.prepare('UPDATE users SET avatar = ? WHERE username = ?').run(msg.avatar, user.username);
      user.avatar = msg.avatar;
      broadcastUsers();
      break;
  }
}

function handleMention(ws, user, msg) {
  const mentionedUser = db.prepare('SELECT * FROM users WHERE username = ?').get(msg.username);
  if (!mentionedUser) return;
  
  // Отправляем уведомление упомянутому пользователю
  clients.forEach((u, client) => {
    if (u.username === msg.username && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'mentioned',
        by: user.username,
        messageId: msg.messageId
      }));
    }
  });
}

// --- Утилиты ---
function broadcast(data, except = null) {
  const json = JSON.stringify(data);
  clients.forEach((user, client) => {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

function broadcastUsers() {
  const userList = Array.from(clients.values()).map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    avatar: u.avatar,
    verified: u.verified,
    badge: u.badge,
    online: u.online,
    lastSeen: u.lastSeen
  }));
  broadcast({ type: 'users', users: userList });
}

function broadcastOnlineCount() {
  const count = Array.from(clients.values()).filter(u => u.online).length;
  broadcast({ type: 'online', count });
}

function checkRateLimit(userId) {
  const now = Date.now();
  const timestamps = rateLimits.get(userId) || [];
  const recent = timestamps.filter(t => now - t < 60000);
  recent.push(now);
  rateLimits.set(userId, recent);
  return recent.length <= 10;
}

// --- Запуск ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bot username: @${BOT_USERNAME}`);
});
