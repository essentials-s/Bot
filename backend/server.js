// backend/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const bot = require('./bot');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ===== ХРАНИЛИЩЕ (JSON вместо SQLite) =====
const DATA_FILE = 'data.json';

let messages = [];
let users = [];
let polls = [];
let pinnedMessage = null;
let quickMessages = [];

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const data = JSON.parse(raw);
            messages = data.messages || [];
            users = data.users || [];
            polls = data.polls || [];
            pinnedMessage = data.pinnedMessage || null;
            quickMessages = data.quickMessages || [];
            console.log(`Loaded: ${messages.length} messages, ${users.length} users`);
        } else {
            console.log('No data file, starting fresh');
        }
    } catch (e) {
        console.error('Failed to load data:', e.message);
    }
}

function saveData() {
    try {
        const data = {
            messages: messages.slice(-5000),
            users,
            polls,
            pinnedMessage,
            quickMessages
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Failed to save data:', e.message);
    }
}

// Загружаем данные при старте
loadData();

// Автосохранение каждые 30 секунд
setInterval(saveData, 30000);

// ===== КОНФИГУРАЦИЯ =====
const BOT_USERNAME = process.env.BOT_USERNAME || 'WorldChatVerificationBot';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin2011';
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

// ===== ХРАНИЛИЩЕ КЛИЕНТОВ =====
const clients = new Map();
const rateLimits = new Map();

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function findUser(username) {
    return users.find(u => u.username === username) || null;
}

function findUserById(id) {
    return users.find(u => u.id === id) || null;
}

function findMessage(id) {
    return messages.find(m => m.id === id) || null;
}

function saveUser(user) {
    const existing = users.findIndex(u => u.id === user.id);
    if (existing >= 0) {
        users[existing] = { ...users[existing], ...user };
    } else {
        users.push(user);
    }
    saveData();
}

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
    const existing = findUser(username);
    res.json({ available: !existing });
});

// Код верификации
app.post('/api/verification-code', (req, res) => {
    const { userId, userName } = req.body;
    if (!userId || !userName) {
        return res.status(400).json({ error: 'Missing data' });
    }
    const code = bot.createVerificationCode(userId, userName);
    res.json({ code, botUsername: BOT_USERNAME });
});

// Подтверждение верификации
app.post('/api/verify', (req, res) => {
    const { userId, telegramId, telegramUsername } = req.body;
    if (!userId || !telegramId) {
        return res.status(400).json({ error: 'Missing data' });
    }
    
    const user = findUserById(userId);
    if (user) {
        user.verified = true;
        user.telegramId = telegramId;
        saveUser(user);
        
        // Уведомляем через WebSocket
        clients.forEach((u, ws) => {
            if (u.id === userId && ws.readyState === WebSocket.OPEN) {
                u.verified = true;
                ws.send(JSON.stringify({ type: 'verified', user }));
            }
        });
        broadcastUsers();
    }
    res.json({ success: true });
});

// Профиль
app.get('/api/user/:username', (req, res) => {
    const user = findUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { password, ...safe } = user;
    res.json(safe);
});

// Быстрые сообщения
app.get('/api/quick-messages', (req, res) => {
    res.json(quickMessages);
});

app.post('/api/quick-messages', (req, res) => {
    const { text, username } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    const user = findUser(username);
    if (!user || user.badge !== 'admin') return res.status(403).json({ error: 'Not admin' });
    
    const msg = { id: uuidv4(), text, createdBy: username };
    quickMessages.push(msg);
    saveData();
    res.json(msg);
});

app.delete('/api/quick-messages/:id', (req, res) => {
    const { username } = req.body;
    const user = findUser(username);
    if (!user || user.badge !== 'admin') return res.status(403).json({ error: 'Not admin' });
    
    quickMessages = quickMessages.filter(m => m.id !== req.params.id);
    saveData();
    res.json({ success: true });
});

// Админ-логин
app.post('/api/admin-login', (req, res) => {
    if (req.body.password === ADMIN_PASS) {
        res.json({ success: true, token: ADMIN_PASS });
    } else {
        res.status(403).json({ error: 'Wrong password' });
    }
});

// Экспорт
app.get('/api/export/:format', (req, res) => {
    const visible = messages.filter(m => !m.deleted);
    if (req.params.format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename=chat.json');
        res.json(visible);
    } else {
        let text = '=== World Chat ===\n\n';
        visible.forEach(m => {
            text += `[${new Date(m.time).toLocaleString()}] ${m.name}: ${m.text || '[media]'}\n`;
        });
        res.setHeader('Content-Disposition', 'attachment; filename=chat.txt');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(text);
    }
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
        lastSeen: Date.now()
    };
    clients.set(ws, user);
    
    // Отправляем историю
    const history = messages.filter(m => !m.deleted).slice(-200);
    const openPolls = polls.filter(p => !p.closed).map(p => ({
        ...p,
        options: p.options,
        votes: p.votes || {}
    }));
    
    ws.send(JSON.stringify({
        type: 'init',
        userId,
        messages: history,
        pinned: pinnedMessage,
        polls: openPolls,
        quickMessages
    }));
    
    broadcastOnlineCount();
    broadcastUsers();
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleMessage(ws, msg);
        } catch (e) {
            console.error('Invalid message:', e.message);
        }
    });
    
    ws.on('close', () => {
        const u = clients.get(ws);
        if (u) {
            u.online = false;
            u.lastSeen = Date.now();
            const dbUser = findUserById(u.id);
            if (dbUser) {
                dbUser.lastSeen = u.lastSeen;
                saveData();
            }
        }
        clients.delete(ws);
        broadcastOnlineCount();
        broadcastUsers();
    });
});

// ===== ОБРАБОТЧИКИ СООБЩЕНИЙ =====
function handleMessage(ws, msg) {
    const user = clients.get(ws);
    if (!user) return;
    
    switch (msg.type) {
        case 'register':
            if (!msg.name || !msg.username) {
                ws.send(JSON.stringify({ type: 'error', text: 'Name and username required' }));
                return;
            }
            if (msg.username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(msg.username)) {
                ws.send(JSON.stringify({ type: 'error', text: 'Invalid username' }));
                return;
            }
            const existing = findUser(msg.username);
            if (existing && existing.id !== user.id) {
                ws.send(JSON.stringify({ type: 'error', text: 'Username taken' }));
                return;
            }
            
            user.name = msg.name;
            user.username = msg.username;
            saveUser({
                id: user.id,
                name: msg.name,
                username: msg.username,
                avatar: user.avatar || '',
                verified: user.verified || false,
                badge: user.badge || '',
                lastSeen: Date.now()
            });
            
            ws.send(JSON.stringify({ type: 'registered', id: user.id, name: user.name, username: user.username }));
            broadcastUsers();
            broadcastSystemMessage(`${user.name} joined`);
            break;
            
        case 'update_profile':
            if (!msg.name) return;
            user.name = msg.name;
            if (msg.avatar !== undefined) user.avatar = msg.avatar;
            saveUser({
                id: user.id,
                name: user.name,
                username: user.username,
                avatar: user.avatar || '',
                verified: user.verified,
                badge: user.badge
            });
            ws.send(JSON.stringify({ type: 'profile_updated', name: user.name, avatar: user.avatar }));
            broadcastUsers();
            break;
            
        case 'message':
            if (!user.name) {
                ws.send(JSON.stringify({ type: 'error', text: 'Register first' }));
                return;
            }
            if (!checkRateLimit(user.id)) {
                ws.send(JSON.stringify({ type: 'error', text: 'Rate limit: 10/min' }));
                return;
            }
            
            const newMsg = {
                id: uuidv4(),
                name: user.name,
                username: user.username,
                text: msg.text || '',
                time: Date.now(),
                replyTo: msg.replyTo || null,
                edited: false,
                deleted: false,
                type: msg.msgType || 'text',
                fileUrl: msg.fileUrl || null,
                fileName: msg.fileName || null,
                fileSize: msg.fileSize || null,
                duration: msg.duration || null,
                badge: user.badge || ''
            };
            
            messages.push(newMsg);
            if (messages.length > 10000) messages = messages.slice(-5000);
            saveData();
            
            broadcast({ type: 'new_message', message: newMsg });
            
            // Проверка упоминаний
            if (msg.text) {
                const mentions = msg.text.match(/@([a-zA-Z0-9_]{3,})/g);
                if (mentions) {
                    mentions.forEach(m => {
                        const mentioned = m.substring(1);
                        handleMention(ws, user, { username: mentioned, messageId: newMsg.id });
                    });
                }
            }
            break;
            
        case 'edit_message':
            const editMsg = findMessage(msg.messageId);
            if (!editMsg || editMsg.username !== user.username) {
                ws.send(JSON.stringify({ type: 'error', text: 'Cannot edit' }));
                return;
            }
            editMsg.text = msg.text;
            editMsg.edited = true;
            saveData();
            broadcast({ type: 'message_edited', messageId: msg.messageId, text: msg.text, edited: true });
            break;
            
        case 'delete_message':
            const delMsg = findMessage(msg.messageId);
            if (!delMsg) return;
            if (msg.deleteFor === 'all') {
                if (delMsg.username === user.username || user.badge === 'admin' || user.badge === 'moderator') {
                    delMsg.deleted = true;
                    saveData();
                    broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
                }
            } else {
                ws.send(JSON.stringify({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'me' }));
            }
            break;
            
        case 'typing':
            broadcast({ type: 'typing', username: user.username }, ws);
            break;
            
        case 'reaction':
            if (!findMessage(msg.messageId)) return;
            if (!msg.messageReactions) msg.messageReactions = {};
            const key = `${msg.messageId}_${user.username}`;
            if (!msg.messageReactions) {
                if (!msg.messageReactions) msg.messageReactions = {};
            }
            broadcast({ type: 'reactions_updated', messageId: msg.messageId, reaction: msg.reaction, username: user.username });
            break;
            
        case 'pin_message':
            if (user.badge !== 'admin') {
                ws.send(JSON.stringify({ type: 'error', text: 'Admin only' }));
                return;
            }
            pinnedMessage = msg.messageId || null;
            saveData();
            broadcast({ type: 'message_pinned', messageId: pinnedMessage });
            break;
            
        case 'create_poll':
        case 'create_quiz':
            const poll = {
                id: uuidv4(),
                question: msg.question,
                options: msg.options,
                type: msg.pollsType || 'poll',
                creator: user.username,
                votes: {},
                closed: false,
                anonymous: msg.anonymous || false,
                multiple: msg.multiple || false,
                correctOption: msg.correctOption,
                explanation: msg.explanation || '',
                closeDate: msg.closeDate || null
            };
            polls.push(poll);
            saveData();
            broadcast({ type: 'new_poll', poll });
            break;
            
        case 'vote':
            const votePoll = polls.find(p => p.id === msg.pollId);
            if (!votePoll || votePoll.closed) return;
            votePoll.votes[user.username] = msg.option;
            saveData();
            broadcast({ type: 'poll_updated', pollId: msg.pollId, votes: votePoll.votes });
            break;
            
        case 'close_poll':
            const closeP = polls.find(p => p.id === msg.pollId);
            if (closeP && (closeP.creator === user.username || user.badge === 'admin')) {
                closeP.closed = true;
                saveData();
                broadcast({ type: 'poll_closed', pollId: msg.pollId });
            }
            break;
            
        case 'voice_message':
            if (!user.name) return;
            const voiceMsg = {
                id: uuidv4(),
                name: user.name,
                username: user.username,
                text: '',
                time: Date.now(),
                replyTo: msg.replyTo || null,
                type: 'voice',
                fileUrl: msg.audioUrl,
                duration: msg.duration,
                deleted: false,
                badge: user.badge || ''
            };
            messages.push(voiceMsg);
            saveData();
            broadcast({ type: 'new_message', message: voiceMsg });
            break;
            
        case 'report':
            console.log('REPORT:', {
                reporter: user.username,
                messageId: msg.messageId,
                reason: msg.reason,
                time: new Date().toISOString()
            });
            ws.send(JSON.stringify({ type: 'report_submitted' }));
            break;
            
        case 'admin_action':
            if (user.badge !== 'admin') {
                ws.send(JSON.stringify({ type: 'error', text: 'Admin only' }));
                return;
            }
            if (msg.action === 'delete_message') {
                const adminDel = findMessage(msg.messageId);
                if (adminDel) {
                    adminDel.deleted = true;
                    saveData();
                    broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
                }
            } else if (msg.action === 'set_badge') {
                const badgeUser = findUser(msg.username);
                if (badgeUser) {
                    badgeUser.badge = msg.badge;
                    saveUser(badgeUser);
                    clients.forEach((u, client) => {
                        if (u.username === msg.username) u.badge = msg.badge;
                    });
                    broadcastUsers();
                }
            }
            break;
            
        case 'check_username':
            const exists = findUser(msg.username);
            ws.send(JSON.stringify({
                type: 'username_status',
                status: (exists && exists.id !== user.id) ? 'taken' : 'available'
            }));
            break;
    }
}

// ===== УТИЛИТЫ =====
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
    clients.forEach(u => {
        if (u.username && !seen.has(u.username)) {
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
        text, time: Date.now(), type: 'system', deleted: false
    };
    broadcast({ type: 'new_message', message: sysMsg });
}

function handleMention(ws, user, msg) {
    clients.forEach((u, client) => {
        if (u.username === msg.username && client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'mentioned',
                by: user.username,
                messageId: msg.messageId
            }));
        }
    });
}

function checkRateLimit(userId) {
    const now = Date.now();
    const timestamps = rateLimits.get(userId) || [];
    const recent = timestamps.filter(t => now - t < RATE_WINDOW);
    recent.push(now);
    rateLimits.set(userId, recent);
    return recent.length <= RATE_LIMIT;
}

// ===== ЗАПУСК =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Bot: @${BOT_USERNAME}`);
});
