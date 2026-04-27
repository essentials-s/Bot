// backend/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const betterSqlite3 = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const bot = require('./bot');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
});

// SQLite
const db = betterSqlite3('chat.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Таблицы
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        name TEXT,
        username TEXT,
        text TEXT DEFAULT '',
        time INTEGER,
        replyTo TEXT,
        edited INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        type TEXT DEFAULT 'text',
        fileUrl TEXT,
        fileName TEXT,
        fileSize INTEGER,
        duration INTEGER,
        badge TEXT DEFAULT ''
    );
    
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        username TEXT UNIQUE,
        avatar TEXT DEFAULT '',
        verified INTEGER DEFAULT 0,
        telegramId INTEGER,
        badge TEXT DEFAULT '',
        theme TEXT DEFAULT 'dark',
        fontSize TEXT DEFAULT 'medium',
        language TEXT DEFAULT 'ru',
        notifications INTEGER DEFAULT 1,
        lastSeen INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        question TEXT,
        options TEXT,
        type TEXT DEFAULT 'poll',
        creator TEXT,
        votes TEXT DEFAULT '{}',
        closed INTEGER DEFAULT 0,
        anonymous INTEGER DEFAULT 0,
        multiple INTEGER DEFAULT 0,
        correctOption INTEGER,
        explanation TEXT DEFAULT '',
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
    
    CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        data BLOB,
        mime_type TEXT,
        original_name TEXT,
        size INTEGER,
        uploaded_at INTEGER
    );
`);

// Конфигурация
const BOT_USERNAME = process.env.BOT_USERNAME || 'herrmeesagentbot';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin2011';
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

// Хранилище WebSocket клиентов
const clients = new Map();
const rateLimits = new Map();

// ===== REST API =====

// Проверка username
app.get('/api/check-username/:username', (req, res) => {
    const { username } = req.params;
    
    if (!username || username.length < 3) {
        return res.json({ available: false, error: 'Too short' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.json({ available: false, error: 'Invalid characters' });
    }
    
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    res.json({ available: !existing });
});

// Верификация
app.post('/api/verification-code', (req, res) => {
    const { userId, userName } = req.body;
    
    if (!userId || !userName) {
        return res.status(400).json({ error: 'Missing userId or userName' });
    }
    
    const code = bot.createVerificationCode(userId, userName);
    res.json({ code, botUsername: BOT_USERNAME });
});

app.post('/api/verify', (req, res) => {
    const { userId, telegramId, telegramUsername } = req.body;
    
    if (!userId || !telegramId) {
        return res.status(400).json({ error: 'Missing data' });
    }
    
    db.prepare('UPDATE users SET verified = 1, telegramId = ? WHERE id = ?')
        .run(telegramId, userId);
    
    // Уведомляем пользователя через WebSocket
    clients.forEach((user, ws) => {
        if (user.id === userId && ws.readyState === WebSocket.OPEN) {
            user.verified = true;
            user.telegramId = telegramId;
            const userData = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            ws.send(JSON.stringify({ type: 'verified', user: userData }));
            broadcastUsers();
        }
    });
    
    res.json({ success: true });
});

// Профиль пользователя
app.get('/api/user/:username', (req, res) => {
    const user = db.prepare(
        'SELECT id, name, username, avatar, verified, badge, lastSeen FROM users WHERE username = ?'
    ).get(req.params.username);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// Быстрые сообщения
app.get('/api/quick-messages', (req, res) => {
    const messages = db.prepare('SELECT * FROM quick_messages').all();
    res.json(messages);
});

app.post('/api/quick-messages', (req, res) => {
    const { text, username } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    
    const user = db.prepare('SELECT badge FROM users WHERE username = ?').get(username);
    if (!user || user.badge !== 'admin') return res.status(403).json({ error: 'Not admin' });
    
    const id = uuidv4();
    db.prepare('INSERT INTO quick_messages (id, text, created_by) VALUES (?, ?, ?)').run(id, text, username);
    res.json({ id, text });
});

app.delete('/api/quick-messages/:id', (req, res) => {
    const { username } = req.body;
    const user = db.prepare('SELECT badge FROM users WHERE username = ?').get(username);
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
    const messages = db.prepare(
        'SELECT * FROM messages WHERE deleted = 0 ORDER BY time ASC'
    ).all();
    
    if (req.params.format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename=chat_history.json');
        res.json(messages);
    } else {
        let text = '=== World Chat History ===\n\n';
        messages.forEach(m => {
            text += `[${new Date(m.time).toLocaleString()}] ${m.name} (@${m.username}): ${m.text || '[media]'}\n`;
        });
        res.setHeader('Content-Disposition', 'attachment; filename=chat_history.txt');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(text);
    }
});

// Загрузка файлов
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    const fileId = uuidv4();
    db.prepare('INSERT INTO files (id, data, mime_type, original_name, size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(fileId, req.file.buffer, req.file.mimetype, req.file.originalname, req.file.size, Date.now());
    
    res.json({
        id: fileId,
        url: `/api/file/${fileId}`,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
    });
});

app.get('/api/file/:id', (req, res) => {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
    if (!file) return res.status(404).send('Not found');
    
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.send(file.data);
});

// ===== WebSocket =====
wss.on('connection', (ws) => {
    const userId = uuidv4();
    const user = {
        id: userId,
        ws,
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
    const historyMessages = db.prepare(
        'SELECT * FROM messages WHERE deleted = 0 ORDER BY time ASC LIMIT 200'
    ).all();
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
            console.error('Invalid message:', e);
        }
    });
    
    ws.on('close', () => {
        const u = clients.get(ws);
        if (u) {
            u.online = false;
            u.lastSeen = Date.now();
            db.prepare('UPDATE users SET lastSeen = ? WHERE id = ?').run(u.lastSeen, u.id);
        }
        clients.delete(ws);
        broadcastOnlineCount();
        broadcastUsers();
    });
    
    ws.on('error', (e) => {
        console.error('WebSocket error:', e);
    });
});

// ===== Обработчики сообщений =====
function handleMessage(ws, msg) {
    const user = clients.get(ws);
    if (!user) return;

    switch (msg.type) {
        case 'register': handleRegister(ws, user, msg); break;
        case 'update_profile': handleUpdateProfile(ws, user, msg); break;
        case 'message': handleNewMessage(ws, user, msg); break;
        case 'edit_message': handleEditMessage(ws, user, msg); break;
        case 'delete_message': handleDeleteMessage(ws, user, msg); break;
        case 'typing': handleTyping(ws, user, msg); break;
        case 'reaction': handleReaction(ws, user, msg); break;
        case 'pin_message': handlePinMessage(ws, user, msg); break;
        case 'create_poll': case 'create_quiz': handleCreatePoll(ws, user, msg); break;
        case 'vote': handleVote(ws, user, msg); break;
        case 'close_poll': handleClosePoll(ws, user, msg); break;
        case 'voice_message': handleVoiceMessage(ws, user, msg); break;
        case 'report': handleReport(ws, user, msg); break;
        case 'admin_action': handleAdminAction(ws, user, msg); break;
        case 'mention': handleMention(ws, user, msg); break;
        case 'check_username': handleCheckUsername(ws, user, msg); break;
        default:
            console.log('Unknown message type:', msg.type);
    }
}

function handleRegister(ws, user, msg) {
    if (!msg.name || !msg.username) {
        ws.send(JSON.stringify({ type: 'error', text: 'Name and username required' }));
        return;
    }
    
    if (msg.username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(msg.username)) {
        ws.send(JSON.stringify({ type: 'error', text: 'Invalid username' }));
        return;
    }
    
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(msg.username, user.id);
    if (existing) {
        ws.send(JSON.stringify({ type: 'error', text: 'Username taken' }));
        return;
    }
    
    db.prepare(`
        INSERT OR REPLACE INTO users (id, name, username, avatar, verified, badge, lastSeen)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, msg.name, msg.username, user.avatar || '', user.verified ? 1 : 0, user.badge || '', Date.now());
    
    user.name = msg.name;
    user.username = msg.username;
    
    ws.send(JSON.stringify({ type: 'registered', id: user.id, name: user.name, username: user.username }));
    broadcastUsers();
    
    // Системное сообщение
    broadcastSystemMessage(`${user.name} joined the chat`);
}

function handleUpdateProfile(ws, user, msg) {
    if (!msg.name) {
        ws.send(JSON.stringify({ type: 'error', text: 'Name required' }));
        return;
    }
    
    user.name = msg.name;
    if (msg.avatar !== undefined) user.avatar = msg.avatar;
    
    db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?')
        .run(user.name, user.avatar || '', user.id);
    
    ws.send(JSON.stringify({ type: 'profile_updated', name: user.name, avatar: user.avatar }));
    broadcastUsers();
}

function handleNewMessage(ws, user, msg) {
    if (!user.name) {
        ws.send(JSON.stringify({ type: 'error', text: 'Register first' }));
        return;
    }
    
    if (!checkRateLimit(user.id)) {
        ws.send(JSON.stringify({ type: 'error', text: 'Rate limit exceeded' }));
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
        badge: user.badge || '',
    };
    
    db.prepare(`
        INSERT INTO messages (id, name, username, text, time, replyTo, edited, deleted, type, fileUrl, fileName, fileSize, duration, badge)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newMsg.id, newMsg.name, newMsg.username, newMsg.text, newMsg.time,
            newMsg.replyTo, newMsg.edited, newMsg.deleted, newMsg.type,
            newMsg.fileUrl, newMsg.fileName, newMsg.fileSize, newMsg.duration, newMsg.badge);
    
    broadcast({ type: 'new_message', message: newMsg });
    
    // Проверяем упоминания
    if (msg.text) {
        const mentions = msg.text.match(/@([a-zA-Z0-9_]{3,})/g);
        if (mentions) {
            mentions.forEach(m => {
                const username = m.substring(1);
                handleMention(ws, user, { username, messageId: newMsg.id });
            });
        }
    }
}

function handleEditMessage(ws, user, msg) {
    if (!user.username) return;
    
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.messageId);
    if (!message || message.username !== user.username) {
        ws.send(JSON.stringify({ type: 'error', text: 'Cannot edit' }));
        return;
    }
    
    db.prepare('UPDATE messages SET text = ?, edited = 1 WHERE id = ?').run(msg.text, msg.messageId);
    broadcast({ type: 'message_edited', messageId: msg.messageId, text: msg.text, edited: 1 });
}

function handleDeleteMessage(ws, user, msg) {
    if (!user.username) return;
    
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.messageId);
    if (!message) return;
    
    if (msg.deleteFor === 'all') {
        if (message.username === user.username || user.badge === 'admin' || user.badge === 'moderator') {
            db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(msg.messageId);
            broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
        }
    } else if (msg.deleteFor === 'me') {
        ws.send(JSON.stringify({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'me', username: user.username }));
    }
}

function handleTyping(ws, user, msg) {
    broadcast({ type: 'typing', username: user.username }, ws);
}

function handleReaction(ws, user, msg) {
    if (!user.username) return;
    
    const existing = db.prepare(
        'SELECT * FROM reactions WHERE message_id = ? AND username = ?'
    ).get(msg.messageId, user.username);
    
    if (existing && existing.reaction === msg.reaction) {
        db.prepare('DELETE FROM reactions WHERE message_id = ? AND username = ?')
            .run(msg.messageId, user.username);
    } else {
        db.prepare('INSERT OR REPLACE INTO reactions (message_id, username, reaction) VALUES (?, ?, ?)')
            .run(msg.messageId, user.username, msg.reaction);
    }
    
    const reactions = db.prepare(
        'SELECT reaction, COUNT(*) as count FROM reactions WHERE message_id = ? GROUP BY reaction'
    ).all(msg.messageId);
    
    broadcast({ type: 'reactions_updated', messageId: msg.messageId, reactions });
}

function handlePinMessage(ws, user, msg) {
    if (user.badge !== 'admin') {
        ws.send(JSON.stringify({ type: 'error', text: 'Admin only' }));
        return;
    }
    
    if (msg.messageId) {
        db.prepare('INSERT OR REPLACE INTO pinned_message (id, message_id) VALUES (1, ?)').run(msg.messageId);
    } else {
        db.prepare('DELETE FROM pinned_message WHERE id = 1').run();
    }
    
    broadcast({ type: 'message_pinned', messageId: msg.messageId || null });
}

function handleCreatePoll(ws, user, msg) {
    if (!user.username) return;
    
    const pollId = uuidv4();
    db.prepare(`
        INSERT INTO polls (id, question, options, type, creator, anonymous, multiple, correctOption, explanation, closeDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        pollId, msg.question, JSON.stringify(msg.options),
        msg.pollsType || 'poll', user.username,
        msg.anonymous ? 1 : 0, msg.multiple ? 1 : 0,
        msg.correctOption ?? null, msg.explanation || '', msg.closeDate || null
    );
    
    broadcast({
        type: 'new_poll',
        poll: {
            id: pollId, question: msg.question, options: msg.options,
            type: msg.pollsType || 'poll', creator: user.username,
            votes: {}, closed: 0, anonymous: msg.anonymous || false,
            multiple: msg.multiple || false, correctOption: msg.correctOption,
            explanation: msg.explanation || '', closeDate: msg.closeDate || null
        }
    });
}

function handleVote(ws, user, msg) {
    if (!user.username) return;
    
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
    if (!user.name) return;
    
    const msgId = uuidv4();
    const voiceMsg = {
        id: msgId, name: user.name, username: user.username,
        text: '', time: Date.now(), replyTo: msg.replyTo || null,
        type: 'voice', fileUrl: msg.audioUrl, duration: msg.duration,
        deleted: 0, edited: 0, badge: user.badge || '',
    };
    
    db.prepare(`
        INSERT INTO messages (id, name, username, text, time, replyTo, type, fileUrl, duration, badge)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(voiceMsg.id, voiceMsg.name, voiceMsg.username, '', voiceMsg.time,
            voiceMsg.replyTo, 'voice', msg.audioUrl, msg.duration, voiceMsg.badge);
    
    broadcast({ type: 'new_message', message: voiceMsg });
}

function handleReport(ws, user, msg) {
    if (!user.username) return;
    
    console.log('REPORT:', {
        reporter: user.username,
        messageId: msg.messageId,
        reason: msg.reason,
        timestamp: new Date().toISOString()
    });
    
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
            // Обновляем badge у текущего пользователя
            clients.forEach((u, client) => {
                if (u.username === msg.username) u.badge = msg.badge;
            });
            broadcastUsers();
            break;
        case 'update_bot_name':
            user.name = msg.name;
            db.prepare('UPDATE users SET name = ? WHERE username = ?').run(msg.name, user.username);
            broadcastUsers();
            break;
        case 'update_bot_avatar':
            user.avatar = msg.avatar;
            db.prepare('UPDATE users SET avatar = ? WHERE username = ?').run(msg.avatar, user.username);
            broadcastUsers();
            break;
    }
}

function handleMention(ws, user, msg) {
    clients.forEach((u, client) => {
        if (u.username === msg.username && client.readyState === WebSocket.OPEN && client !== ws) {
            client.send(JSON.stringify({
                type: 'mentioned',
                by: user.username,
                messageId: msg.messageId
            }));
        }
    });
}

function handleCheckUsername(ws, user, msg) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(msg.username, user.id);
    ws.send(JSON.stringify({
        type: 'username_status',
        status: existing ? 'taken' : 'available'
    }));
}

// ===== Утилиты =====
function broadcast(data, except = null) {
    const json = JSON.stringify(data);
    clients.forEach((user, client) => {
        if (client !== except && client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

function broadcastUsers() {
    const userList = [];
    const seen = new Set();
    clients.forEach((u) => {
        if (!seen.has(u.username) && u.username) {
            seen.add(u.username);
            userList.push({
                id: u.id, name: u.name, username: u.username,
                avatar: u.avatar, verified: u.verified,
                badge: u.badge, online: u.online, lastSeen: u.lastSeen
            });
        }
    });
    broadcast({ type: 'users', users: userList });
}

function broadcastOnlineCount() {
    const count = Array.from(clients.values()).filter(u => u.online).length;
    broadcast({ type: 'online', count });
}

function broadcastSystemMessage(text) {
    const sysMsg = {
        id: uuidv4(), name: 'System', username: 'system',
        text, time: Date.now(), type: 'system', deleted: 0
    };
    broadcast({ type: 'new_message', message: sysMsg });
}

function checkRateLimit(userId) {
    const now = Date.now();
    const timestamps = rateLimits.get(userId) || [];
    const recent = timestamps.filter(t => now - t < RATE_WINDOW);
    recent.push(now);
    rateLimits.set(userId, recent);
    return recent.length <= RATE_LIMIT;
}

// ===== Запуск =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Bot: @${BOT_USERNAME}`);
    console.log(`Admin pass: ${ADMIN_PASS}`);
});
