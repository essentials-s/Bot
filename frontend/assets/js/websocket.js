// frontend/assets/js/websocket.js

// Определение URL сервера
function getServerUrl() {
    // Если запущено локально
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return {
            ws: 'ws://localhost:3000',
            api: 'http://localhost:3000'
        };
    }
    
    // Если на Vercel - используем Railway backend
    // Замени на свой Railway URL после деплоя
    const railwayUrl = 'world-chat-0twp.onrender.com';
    
    return {
        ws: `wss://` + railwayUrl,
        api: `https://` + railwayUrl
    };
}

const serverConfig = getServerUrl();
const WS_URL = serverConfig.ws;
const API_URL = serverConfig.api;

// Делаем доступным глобально
window.API_URL = API_URL;
window.WS_URL = WS_URL;

// WebSocket соединение
let ws = null;
let wsReconnectTimer = null;
let wsReconnectAttempts = 0;
let wsUserId = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

// Подключение
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (ws && ws.readyState === WebSocket.CONNECTING) return;
    
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            wsReconnectAttempts = 0;
            clearReconnectTimer();
            
            // Восстанавливаем сессию
            const savedUser = loadUserFromStorage();
            if (savedUser && savedUser.name && savedUser.username) {
                wsUserId = savedUser.id;
                // Отправляем регистрацию для восстановления
                setTimeout(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'register',
                            name: savedUser.name,
                            username: savedUser.username
                        }));
                    }
                }, 500);
            }
            
            // Обновляем статус
            updateConnectionStatus(true);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleServerMessage(data);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };
        
        ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            updateConnectionStatus(false);
            
            // Не переподключаемся если закрыто нормально
            if (event.code !== 1000 && event.code !== 1001) {
                scheduleReconnect();
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus(false);
        };
        
    } catch (e) {
        console.error('Failed to create WebSocket:', e);
        scheduleReconnect();
    }
}

// Переподключение
function scheduleReconnect() {
    if (wsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Max reconnect attempts reached');
        return;
    }
    
    clearReconnectTimer();
    
    const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, wsReconnectAttempts), 30000);
    wsReconnectAttempts++;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${wsReconnectAttempts})`);
    
    wsReconnectTimer = setTimeout(() => {
        connectWebSocket();
    }, delay);
}

function clearReconnectTimer() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
}

// Обновление статуса соединения
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.textContent = connected ? '● Online' : '● Reconnecting...';
        statusEl.style.color = connected ? 'var(--success)' : 'var(--warning)';
    }
}

// Отправка сообщения
function sendToServer(data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected, reconnecting...');
        connectWebSocket();
        return false;
    }
    
    try {
        ws.send(JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Failed to send:', e);
        return false;
    }
}

// Функции отправки
function registerUser(name, username) {
    return sendToServer({ type: 'register', name, username });
}

function updateProfile(name, avatar = null) {
    return sendToServer({ type: 'update_profile', name, avatar });
}

function checkUsername(username) {
    return sendToServer({ type: 'check_username', username });
}

function sendMessage(text, replyTo = null, msgType = 'text', fileData = null) {
    const msg = { type: 'message', text, replyTo, msgType };
    if (fileData) {
        msg.fileUrl = fileData.url;
        msg.fileName = fileData.name;
        msg.fileSize = fileData.size;
    }
    return sendToServer(msg);
}

function sendVoiceMessage(audioUrl, duration, replyTo = null) {
    return sendToServer({ type: 'voice_message', audioUrl, duration, replyTo });
}

function editMessage(messageId, newText) {
    return sendToServer({ type: 'edit_message', messageId, text: newText });
}

function deleteMessage(messageId, deleteFor = 'me') {
    return sendToServer({ type: 'delete_message', messageId, deleteFor });
}

function sendReaction(messageId, reaction) {
    return sendToServer({ type: 'reaction', messageId, reaction });
}

function pinMessage(messageId) {
    return sendToServer({ type: 'pin_message', messageId });
}

function sendTyping() {
    return sendToServer({ type: 'typing' });
}

function createPoll(question, options, pollsType, anonymous, multiple, closeDate) {
    return sendToServer({
        type: pollsType === 'quiz' ? 'create_quiz' : 'create_poll',
        question, options, pollsType, anonymous, multiple, closeDate
    });
}

function votePoll(pollId, option) {
    return sendToServer({ type: 'vote', pollId, option });
}

function closePoll(pollId) {
    return sendToServer({ type: 'close_poll', pollId });
}

function sendReport(messageId, reason) {
    return sendToServer({ type: 'report', messageId, reason });
}

function adminAction(action, data) {
    return sendToServer({ type: 'admin_action', action, ...data });
}

// Загрузка/сохранение пользователя
function loadUserFromStorage() {
    try {
        const data = localStorage.getItem('chat_user');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function saveUserToStorage(user) {
    try {
        localStorage.setItem('chat_user', JSON.stringify({
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar || '',
            verified: user.verified || false,
            badge: user.badge || ''
        }));
    } catch (e) {
        console.error('Failed to save user:', e);
    }
}

// Обработка сообщений от сервера
function handleServerMessage(data) {
    switch (data.type) {
        case 'init':
            if (typeof handleInit === 'function') handleInit(data);
            break;
        case 'registered':
            if (typeof handleRegistered === 'function') handleRegistered(data);
            break;
        case 'new_message':
            if (typeof handleNewMessage === 'function') handleNewMessage(data);
            break;
        case 'message_edited':
            if (typeof handleMessageEdited === 'function') handleMessageEdited(data);
            break;
        case 'message_deleted':
            if (typeof handleMessageDeleted === 'function') handleMessageDeleted(data);
            break;
        case 'reactions_updated':
            if (typeof handleReactionsUpdated === 'function') handleReactionsUpdated(data);
            break;
        case 'message_pinned':
            if (typeof handleMessagePinned === 'function') handleMessagePinned(data);
            break;
        case 'typing':
            if (typeof handleTyping === 'function') handleTyping(data);
            break;
        case 'online':
            if (typeof handleOnline === 'function') handleOnline(data);
            break;
        case 'users':
            if (typeof handleUsers === 'function') handleUsers(data);
            break;
        case 'verified':
            if (typeof handleVerified === 'function') handleVerified(data);
            break;
        case 'mentioned':
            if (typeof handleMentioned === 'function') handleMentioned(data);
            break;
        case 'new_poll':
            if (typeof handleNewPoll === 'function') handleNewPoll(data);
            break;
        case 'poll_updated':
            if (typeof handlePollUpdated === 'function') handlePollUpdated(data);
            break;
        case 'poll_closed':
            if (typeof handlePollClosed === 'function') handlePollClosed(data);
            break;
        case 'username_status':
            if (typeof handleUsernameStatus === 'function') handleUsernameStatus(data);
            break;
        case 'profile_updated':
            if (typeof handleProfileUpdated === 'function') handleProfileUpdated(data);
            break;
        case 'report_submitted':
            if (typeof notifyReportSubmitted === 'function') notifyReportSubmitted();
            break;
        case 'error':
            if (typeof showError === 'function') showError(data.text);
            console.error('Server error:', data.text);
            break;
    }
}

// Заглушки для обработчиков (переопределяются в других файлах)
window.handleInit = function(data) { console.log('Init:', data); };
window.handleRegistered = function(data) { console.log('Registered:', data); };
window.handleNewMessage = function(data) { console.log('New message:', data); };
window.handleMessageEdited = function(data) {};
window.handleMessageDeleted = function(data) {};
window.handleReactionsUpdated = function(data) {};
window.handleMessagePinned = function(data) {};
window.handleTyping = function(data) {};
window.handleOnline = function(data) {};
window.handleUsers = function(data) {};
window.handleVerified = function(data) {};
window.handleMentioned = function(data) {};
window.handleNewPoll = function(data) {};
window.handlePollUpdated = function(data) {};
window.handlePollClosed = function(data) {};
window.handleUsernameStatus = function(data) {};
window.handleProfileUpdated = function(data) {};

// Автоподключение
connectWebSocket();

// Переподключение при восстановлении сети
window.addEventListener('online', () => {
    console.log('Network restored');
    connectWebSocket();
});

window.addEventListener('offline', () => {
    console.log('Network lost');
    updateConnectionStatus(false);
});
