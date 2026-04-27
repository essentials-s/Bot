// backend/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const betterSqlite3 = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- SQLite База данных ---
const db = betterSqlite3('chat.db');
db.pragma('journal_mode = WAL');

// Таблицы
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
    fileSize INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT UNIQUE,
    avatar TEXT,
    verified INTEGER DEFAULT 0,
    telegramId INTEGER,
    badge TEXT DEFAULT ''
  );
  
  CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    question TEXT,
    options TEXT,
    type TEXT,
    creator TEXT,
    votes TEXT DEFAULT '{}',
    closed INTEGER DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS pinned_message (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    message_id TEXT
  );
`);

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
  
  // Отправляем историю
  const history = db.prepare('SELECT * FROM messages WHERE deleted = 0 ORDER BY time DESC LIMIT 100').all().reverse();
  const pinned = db.prepare('SELECT * FROM pinned_message WHERE id = 1').get();
  ws.send(JSON.stringify({ type: 'history', messages: history, pinned: pinned?.message_id || null }));
  
  users.set(ws, user);
  broadcastOnlineCount();
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Invalid message', e);
    }
  });
  
  ws.on('close', () => {
    const u = users.get(ws);
    if (u) {
      u.online = false;
      u.lastSeen = Date.now();
    }
    users.delete(ws);
    broadcastOnlineCount();
  });
});

// --- Функции ---
function broadcast(data, except = null) {
  const json = JSON.stringify(data);
  users.forEach((user, client) => {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

function broadcastOnlineCount() {
  const count = Array.from(users.values()).filter(u => u.online).length;
  broadcast({ type: 'online', count });
}

function broadcastUsers() {
  const userList = Array.from(users.values()).map(u => ({
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

function handleMessage(ws, msg) {
  const user = users.get(ws);
  if (!user) return;

  switch (msg.type) {
    case 'register':
      if (!msg.name || !msg.username) {
        ws.send(JSON.stringify({ type: 'error', text: 'Name and username required' }));
        return;
      }
      // Проверка username в БД
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(msg.username);
      if (existingUser && existingUser.id !== user.id) {
        ws.send(JSON.stringify({ type: 'error', text: 'Username already taken' }));
        return;
      }
      // Сохраняем/обновляем пользователя
      db.prepare(`
        INSERT OR REPLACE INTO users (id, name, username, avatar, verified, telegramId, badge)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user.id, msg.name, msg.username, user.avatar, user.verified ? 1 : 0, user.telegramId || null, user.badge);
      
      user.name = msg.name;
      user.username = msg.username;
      ws.send(JSON.stringify({ type: 'registered', name: user.name, username: user.username, id: user.id }));
      broadcastUsers();
      break;

    case 'update_profile':
      if (!msg.name) {
        ws.send(JSON.stringify({ type: 'error', text: 'Name required' }));
        return;
      }
      user.name = msg.name;
      user.avatar = msg.avatar || user.avatar;
      db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(user.name, user.avatar, user.id);
      ws.send(JSON.stringify({ type: 'profile_updated', name: user.name, avatar: user.avatar }));
      broadcastUsers();
      break;

    case 'verify':
      // Проверка через Telegram бота
      ws.send(JSON.stringify({ type: 'verification_url', url: `https://t.me/${process.env.BOT_USERNAME}?start=${user.id}` }));
      break;

    case 'check_username':
      const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(msg.username);
      if (exist && exist.id !== user.id) {
        ws.send(JSON.stringify({ type: 'username_status', status: 'taken' }));
      } else {
        ws.send(JSON.stringify({ type: 'username_status', status: 'available' }));
      }
      break;

    case 'message':
      if (!user.name) {
        ws.send(JSON.stringify({ type: 'error', text: 'Register first' }));
        return;
      }
      if (!canSendMessage(user.id)) {
        ws.send(JSON.stringify({ type: 'error', text: 'Rate limit exceeded (10/min)' }));
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
      };
      db.prepare(`
        INSERT INTO messages (id, name, username, text, time, replyTo, edited, deleted, type, fileUrl, fileName, fileSize)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newMsg.id, newMsg.name, newMsg.username, newMsg.text, newMsg.time,
              newMsg.replyTo, newMsg.edited, newMsg.deleted, newMsg.type,
              newMsg.fileUrl, newMsg.fileName, newMsg.fileSize);
      broadcast({ type: 'new_message', message: newMsg });
      break;

    case 'edit_message':
      const editMsg = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.messageId);
      if (editMsg && editMsg.username === user.username) {
        db.prepare('UPDATE messages SET text = ?, edited = 1 WHERE id = ?').run(msg.text, msg.messageId);
        broadcast({ type: 'message_edited', messageId: msg.messageId, text: msg.text });
      }
      break;

    case 'delete_message':
      const delMsg = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.messageId);
      if (delMsg) {
        if (msg.deleteFor === 'me' && delMsg.username === user.username) {
          // Удалить у себя (просто не показываем в истории, но для простоты помечаем)
          broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: user.username });
        } else if (msg.deleteFor === 'all' && (delMsg.username === user.username || user.badge === 'admin' || user.badge === 'moderator')) {
          db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(msg.messageId);
          broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
        }
      }
      break;

    case 'reaction':
      broadcast({ type: 'reaction', messageId: msg.messageId, reaction: msg.reaction, username: user.username }, ws);
      break;

    case 'pin_message':
      if (user.badge === 'admin') {
        db.prepare('INSERT OR REPLACE INTO pinned_message (id, message_id) VALUES (1, ?)').run(msg.messageId);
        broadcast({ type: 'message_pinned', messageId: msg.messageId });
      }
      break;

    case 'create_poll':
    case 'create_quiz':
      const pollId = uuidv4();
      db.prepare('INSERT INTO polls (id, question, options, type, creator) VALUES (?, ?, ?, ?, ?)')
        .run(pollId, msg.question, JSON.stringify(msg.options), msg.pollsType, user.username);
      broadcast({ type: 'new_poll', poll: { id: pollId, question: msg.question, options: msg.options, type: msg.pollsType, creator: user.username, votes: {}, closed: 0 } });
      break;

    case 'vote':
      const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(msg.pollId);
      if (poll && !poll.closed) {
        const votes = JSON.parse(poll.votes);
        votes[user.username] = msg.option;
        db.prepare('UPDATE polls SET votes = ? WHERE id = ?').run(JSON.stringify(votes), msg.pollId);
        broadcast({ type: 'poll_updated', pollId: msg.pollId, votes });
      }
      break;

    case 'close_poll':
      const closePoll = db.prepare('SELECT * FROM polls WHERE id = ?').get(msg.pollId);
      if (closePoll && (closePoll.creator === user.username || user.badge === 'admin')) {
        db.prepare('UPDATE polls SET closed = 1 WHERE id = ?').run(msg.pollId);
        broadcast({ type: 'poll_closed', pollId: msg.pollId });
      }
      break;

    case 'report':
      // Отправка жалобы на почту через FormSubmit или EmailJS
      broadcast({ type: 'report_submitted', reportedMessage: msg.messageId });
      break;

    case 'typing':
      broadcast({ type: 'typing', username: user.username }, ws);
      break;

    case 'voice_message':
      const voiceMsg = {
        id: uuidv4(),
        name: user.name,
        username: user.username,
        text: '',
        time: Date.now(),
        replyTo: msg.replyTo || null,
        edited: 0,
        deleted: 0,
        type: 'voice',
        fileUrl: msg.audioUrl,
        duration: msg.duration,
      };
      db.prepare('INSERT INTO messages (id, name, username, text, time, replyTo, type, fileUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(voiceMsg.id, voiceMsg.name, voiceMsg.username, '', voiceMsg.time, voiceMsg.replyTo, 'voice', msg.audioUrl);
      broadcast({ type: 'new_message', message: voiceMsg });
      break;

    case 'admin_action':
      if (user.badge === 'admin') {
        if (msg.action === 'delete_message') {
          db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(msg.messageId);
          broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
        } else if (msg.action === 'set_badge') {
          db.prepare('UPDATE users SET badge = ? WHERE username = ?').run(msg.badge, msg.username);
          broadcastUsers();
        }
      }
      break;
  }
}

function canSendMessage(userId) {
  const now = Date.now();
  if (!canSendMessage.timestamps) canSendMessage.timestamps = {};
  const timestamps = canSendMessage.timestamps[userId] || [];
  const recent = timestamps.filter(t => now - t < 60000);
  recent.push(now);
  canSendMessage.timestamps[userId] = recent;
  return recent.length <= 10;
}

// --- REST API для файлов ---
app.post('/upload', (req, res) => {
  // Заглушка: в реальности нужен multer для загрузки файлов
  res.json({ url: '/files/placeholder' });
});

// --- REST API для верификации ---
app.post('/verify', (req, res) => {
  const { userId, telegramId, telegramUsername } = req.body;
  db.prepare('UPDATE users SET verified = 1, telegramId = ? WHERE id = ?').run(telegramId, userId);
  
  // Уведомить пользователя через WebSocket
  users.forEach((user, client) => {
    if (user.id === userId && client.readyState === WebSocket.OPEN) {
      user.verified = true;
      user.telegramId = telegramId;
      client.send(JSON.stringify({ type: 'verified', username: user.username }));
      broadcastUsers();
    }
  });
  
  res.json({ success: true });
});

// --- Запуск ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
