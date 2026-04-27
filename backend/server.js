// backend/server.js
var express = require('express');
var http = require('http');
var WebSocket = require('ws');
var cors = require('cors');
var { v4: uuidv4 } = require('uuid');
var fs = require('fs');
var path = require('path');

var app = express();
var server = http.createServer(app);
var wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ===== ХРАНИЛИЩЕ =====
var DATA_FILE = 'data.json';

var messages = [];
var users = [];
var polls = [];
var pinnedMessage = null;
var quickMessages = [];

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            var raw = fs.readFileSync(DATA_FILE, 'utf8');
            var data = JSON.parse(raw);
            messages = data.messages || [];
            users = data.users || [];
            polls = data.polls || [];
            pinnedMessage = data.pinnedMessage || null;
            quickMessages = data.quickMessages || [];
            console.log('Loaded: ' + messages.length + ' messages, ' + users.length + ' users');
        }
    } catch (e) {
        console.error('Load error:', e.message);
    }
}

function saveData() {
    try {
        var data = {
            messages: messages.slice(-5000),
            users: users,
            polls: polls,
            pinnedMessage: pinnedMessage,
            quickMessages: quickMessages
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
    } catch (e) {
        console.error('Save error:', e.message);
    }
}

loadData();
setInterval(saveData, 30000);

// ===== КОНФИГ =====
var ADMIN_PASS = process.env.ADMIN_PASS || 'admin2011';

// ===== КЛИЕНТЫ =====
var clients = new Map();
var rateLimits = new Map();

// ===== ПОИСК =====
function findUser(username) {
    return users.find(function(u) { return u.username === username; }) || null;
}

function findUserById(id) {
    return users.find(function(u) { return u.id === id; }) || null;
}

function findUserByEmail(email) {
    return users.find(function(u) { return u.email === email; }) || null;
}

function findMessage(id) {
    return messages.find(function(m) { return m.id === id; }) || null;
}

function saveUser(user) {
    var idx = users.findIndex(function(u) { return u.id === user.id; });
    if (idx >= 0) {
        users[idx] = Object.assign(users[idx], user);
    } else {
        users.push(user);
    }
    saveData();
}

// ===== ПРОСТОЙ ХЭШ ПАРОЛЯ =====
function hashPassword(password) {
    var hash = 0;
    for (var i = 0; i < password.length; i++) {
        var char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36);
}

// ===== REST API =====

// Регистрация
app.post('/api/register', function(req, res) {
    var name = req.body.name;
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    if (!name || !username || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields required' });
    }

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ success: false, error: 'Invalid username' });
    }

    if (password.length < 3) {
        return res.status(400).json({ success: false, error: 'Password too short' });
    }

    if (findUser(username)) {
        return res.status(400).json({ success: false, error: 'Username taken' });
    }

    if (findUserByEmail(email)) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    var userId = uuidv4();
    var user = {
        id: userId,
        name: name,
        username: username,
        email: email,
        password: hashPassword(password),
        avatar: '',
        verified: true,
        badge: '',
        lastSeen: Date.now()
    };

    users.push(user);
    saveData();

    res.json({
        success: true,
        userId: userId,
        user: {
            id: userId,
            name: name,
            username: username,
            email: email,
            verified: true,
            badge: '',
            avatar: ''
        }
    });
});

// Вход
app.post('/api/login', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    var user = findUserByEmail(email);
    if (!user) {
        return res.status(400).json({ success: false, error: 'Account not found' });
    }

    var hashed = hashPassword(password);
    if (user.password !== hashed) {
        return res.status(400).json({ success: false, error: 'Wrong password' });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            verified: user.verified,
            badge: user.badge || '',
            avatar: user.avatar || ''
        }
    });
});

// Проверка username
app.get('/api/check-username/:username', function(req, res) {
    var username = req.params.username;
    if (!username || username.length < 3) {
        return res.json({ available: false });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.json({ available: false });
    }
    var existing = findUser(username);
    res.json({ available: !existing });
});

// Профиль
app.get('/api/user/:username', function(req, res) {
    var user = findUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        verified: user.verified,
        badge: user.badge
    });
});

// Быстрые сообщения
app.get('/api/quick-messages', function(req, res) {
    res.json(quickMessages);
});

app.post('/api/quick-messages', function(req, res) {
    var text = req.body.text;
    var username = req.body.username;
    if (!text) return res.status(400).json({ error: 'Text required' });
    var user = findUser(username);
    if (!user || user.badge !== 'admin') return res.status(403).json({ error: 'Not admin' });
    var msg = { id: uuidv4(), text: text, createdBy: username };
    quickMessages.push(msg);
    saveData();
    res.json(msg);
});

app.delete('/api/quick-messages/:id', function(req, res) {
    var username = req.body.username;
    var user = findUser(username);
    if (!user || user.badge !== 'admin') return res.status(403).json({ error: 'Not admin' });
    quickMessages = quickMessages.filter(function(m) { return m.id !== req.params.id; });
    saveData();
    res.json({ success: true });
});

// Админ-логин
app.post('/api/admin-login', function(req, res) {
    if (req.body.password === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(403).json({ error: 'Wrong password' });
    }
});

// Экспорт
app.get('/api/export/:format', function(req, res) {
    var visible = messages.filter(function(m) { return !m.deleted; });
    if (req.params.format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename=chat.json');
        res.json(visible);
    } else {
        var text = '=== World Chat ===\n\n';
        visible.forEach(function(m) {
            text += '[' + new Date(m.time).toLocaleString() + '] ' + m.name + ': ' + (m.text || '[media]') + '\n';
        });
        res.setHeader('Content-Disposition', 'attachment; filename=chat.txt');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(text);
    }
});

// ===== WebSocket =====
wss.on('connection', function(ws) {
    var userId = uuidv4();
    var user = {
        id: userId,
        ws: ws,
        name: '',
        username: '',
        email: '',
        verified: false,
        avatar: '',
        badge: '',
        online: true,
        lastSeen: Date.now()
    };
    clients.set(ws, user);
    
    var history = messages.filter(function(m) { return !m.deleted; }).slice(-200);
    var openPolls = polls.filter(function(p) { return !p.closed; });
    
    ws.send(JSON.stringify({
        type: 'init',
        userId: userId,
        messages: history,
        pinned: pinnedMessage,
        polls: openPolls
    }));
    
    broadcastOnlineCount();
    broadcastUsers();
    
    ws.on('message', function(data) {
        try {
            var msg = JSON.parse(data);
            handleMessage(ws, msg);
        } catch (e) {
            console.error('Parse error:', e.message);
        }
    });
    
    ws.on('close', function() {
        var u = clients.get(ws);
        if (u) {
            u.online = false;
            u.lastSeen = Date.now();
        }
        clients.delete(ws);
        broadcastOnlineCount();
        broadcastUsers();
    });
});

// ===== ОБРАБОТЧИКИ =====
function handleMessage(ws, msg) {
    var user = clients.get(ws);
    if (!user) return;
    
    if (msg.type === 'register') {
        if (!msg.name || !msg.username) {
            ws.send(JSON.stringify({ type: 'error', text: 'Name and username required' }));
            return;
        }
        
        var existing = findUser(msg.username);
        if (existing && existing.id !== user.id) {
            ws.send(JSON.stringify({ type: 'error', text: 'Username taken' }));
            return;
        }
        
        user.name = msg.name;
        user.username = msg.username;
        
        var savedUser = findUserById(user.id) || {};
        saveUser({
            id: user.id,
            name: msg.name,
            username: msg.username,
            email: savedUser.email || '',
            password: savedUser.password || '',
            verified: true,
            avatar: savedUser.avatar || '',
            badge: savedUser.badge || '',
            lastSeen: Date.now()
        });
        
        ws.send(JSON.stringify({ type: 'registered', id: user.id, name: user.name, username: user.username }));
        broadcastUsers();
        broadcastSystemMessage(user.name + ' joined');
    }
    
    else if (msg.type === 'update_profile') {
        if (!msg.name) return;
        user.name = msg.name;
        if (msg.avatar !== undefined) user.avatar = msg.avatar;
        saveUser({
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar || '',
            verified: user.verified,
            badge: user.badge,
            email: user.email,
            password: user.password
        });
        ws.send(JSON.stringify({ type: 'profile_updated', name: user.name }));
        broadcastUsers();
    }
    
    else if (msg.type === 'message') {
        if (!user.name) {
            ws.send(JSON.stringify({ type: 'error', text: 'Register first' }));
            return;
        }
        if (!checkRateLimit(user.id)) {
            ws.send(JSON.stringify({ type: 'error', text: 'Rate limit' }));
            return;
        }
        
        var newMsg = {
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
        
        if (msg.text) {
            var mentions = msg.text.match(/@([a-zA-Z0-9_]{3,})/g);
            if (mentions) {
                mentions.forEach(function(m) {
                    var mentionedUser = findUser(m.substring(1));
                    if (mentionedUser) {
                        clients.forEach(function(u, client) {
                            if (u.username === m.substring(1) && client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'mentioned',
                                    by: user.username,
                                    messageId: newMsg.id
                                }));
                            }
                        });
                    }
                });
            }
        }
    }
    
    else if (msg.type === 'edit_message') {
        var editMsg = findMessage(msg.messageId);
        if (!editMsg || editMsg.username !== user.username) {
            ws.send(JSON.stringify({ type: 'error', text: 'Cannot edit' }));
            return;
        }
        editMsg.text = msg.text;
        editMsg.edited = true;
        saveData();
        broadcast({ type: 'message_edited', messageId: msg.messageId, text: msg.text });
    }
    
    else if (msg.type === 'delete_message') {
        var delMsg = findMessage(msg.messageId);
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
    }
    
    else if (msg.type === 'typing') {
        broadcast({ type: 'typing', username: user.username }, ws);
    }
    
    else if (msg.type === 'pin_message') {
        if (user.badge !== 'admin') return;
        pinnedMessage = msg.messageId || null;
        saveData();
        broadcast({ type: 'message_pinned', messageId: pinnedMessage });
    }
    
    else if (msg.type === 'create_poll' || msg.type === 'create_quiz') {
        var poll = {
            id: uuidv4(),
            question: msg.question,
            options: msg.options,
            type: msg.pollsType || 'poll',
            creator: user.username,
            votes: {},
            closed: false,
            anonymous: msg.anonymous || false,
            multiple: msg.multiple || false
        };
        polls.push(poll);
        saveData();
        broadcast({ type: 'new_poll', poll: poll });
    }
    
    else if (msg.type === 'vote') {
        var votePoll = polls.find(function(p) { return p.id === msg.pollId; });
        if (!votePoll || votePoll.closed) return;
        votePoll.votes[user.username] = msg.option;
        saveData();
        broadcast({ type: 'poll_updated', pollId: msg.pollId, votes: votePoll.votes });
    }
    
    else if (msg.type === 'voice_message') {
        if (!user.name) return;
        var voiceMsg = {
            id: uuidv4(),
            name: user.name,
            username: user.username,
            text: '',
            time: Date.now(),
            type: 'voice',
            fileUrl: msg.audioUrl,
            duration: msg.duration,
            deleted: false
        };
        messages.push(voiceMsg);
        saveData();
        broadcast({ type: 'new_message', message: voiceMsg });
    }
    
    else if (msg.type === 'report') {
        console.log('REPORT:', {
            reporter: user.username,
            messageId: msg.messageId,
            reason: msg.reason,
            time: new Date().toISOString()
        });
        ws.send(JSON.stringify({ type: 'report_submitted' }));
    }
    
    else if (msg.type === 'admin_action') {
        if (user.badge !== 'admin') return;
        if (msg.action === 'delete_message') {
            var admDel = findMessage(msg.messageId);
            if (admDel) {
                admDel.deleted = true;
                saveData();
                broadcast({ type: 'message_deleted', messageId: msg.messageId, deleteFor: 'all' });
            }
        } else if (msg.action === 'set_badge') {
            var badgeUser = findUser(msg.username);
            if (badgeUser) {
                badgeUser.badge = msg.badge;
                saveUser(badgeUser);
                clients.forEach(function(u, client) {
                    if (u.username === msg.username) u.badge = msg.badge;
                });
                broadcastUsers();
            }
        }
    }
}

// ===== УТИЛИТЫ =====
function broadcast(data, except) {
    var json = JSON.stringify(data);
    clients.forEach(function(user, client) {
        if (client !== except && client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

function broadcastUsers() {
    var userList = [];
    var seen = {};
    clients.forEach(function(u) {
        if (u.username && !seen[u.username]) {
            seen[u.username] = true;
            userList.push({
                id: u.id, name: u.name, username: u.username,
                avatar: u.avatar, verified: u.verified,
                badge: u.badge, online: u.online
            });
        }
    });
    broadcast({ type: 'users', users: userList });
}

function broadcastOnlineCount() {
    var count = 0;
    clients.forEach(function(u) { if (u.online) count++; });
    broadcast({ type: 'online', count: count });
}

function broadcastSystemMessage(text) {
    var sysMsg = {
        id: uuidv4(), name: 'System', username: 'system',
        text: text, time: Date.now(), type: 'system', deleted: false
    };
    broadcast({ type: 'new_message', message: sysMsg });
}

function checkRateLimit(userId) {
    var now = Date.now();
    var timestamps = rateLimits.get(userId) || [];
    var recent = timestamps.filter(function(t) { return now - t < 60000; });
    recent.push(now);
    rateLimits.set(userId, recent);
    return recent.length <= 10;
}

// ===== ЗАПУСК =====
var PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', function() {
    console.log('Server running on port ' + PORT);
});