// frontend/assets/js/websocket.js

// WebSocket подключение
let ws = null;
let wsReconnectTimer = null;
let wsUserId = null;

// Получаем URL сервера
const WS_URL = (() => {
    // Замени на свой Railway URL
    if (window.location.hostname === 'localhost') {
        return 'ws://localhost:3000';
    }
    return 'wss://world-chat-backend-production.up.railway.app';
})();

// Подключение к WebSocket
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            clearReconnectTimer();
            
            // Если пользователь уже зарегистрирован, восстанавливаем сессию
            const savedUser = loadUserFromStorage();
            if (savedUser && savedUser.id) {
                wsUserId = savedUser.id;
            }
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
            console.log('WebSocket disconnected:', event.code);
            scheduleReconnect();
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
    } catch (e) {
        console.error('Failed to connect:', e);
        scheduleReconnect();
    }
}

// Расписание переподключения
function scheduleReconnect() {
    clearReconnectTimer();
    wsReconnectTimer = setTimeout(() => {
        console.log('Reconnecting...');
        connectWebSocket();
    }, 3000);
}

// Очистка таймера переподключения
function clearReconnectTimer() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }
}

// Отправка сообщения на сервер
function sendToServer(data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showError('Connection lost. Reconnecting...');
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

// Регистрация пользователя
function registerUser(name, username) {
    sendToServer({
        type: 'register',
        name: name,
        username: username
    });
}

// Обновление профиля
function updateProfile(name, avatar = null) {
    sendToServer({
        type: 'update_profile',
        name: name,
        avatar: avatar
    });
}

// Проверка username
function checkUsername(username) {
    sendToServer({
        type: 'check_username',
        username: username
    });
}

// Отправка сообщения
function sendMessage(text, replyTo = null, msgType = 'text', fileData = null) {
    const msg = {
        type: 'message',
        text: text,
        replyTo: replyTo,
        msgType: msgType
    };
    
    if (fileData) {
        msg.fileUrl = fileData.url;
        msg.fileName = fileData.name;
        msg.fileSize = fileData.size;
    }
    
    sendToServer(msg);
}

// Отправка голосового сообщения
function sendVoiceMessage(audioUrl, duration, replyTo = null) {
    sendToServer({
        type: 'voice_message',
        audioUrl: audioUrl,
        duration: duration,
        replyTo: replyTo
    });
}

// Редактирование сообщения
function editMessage(messageId, newText) {
    sendToServer({
        type: 'edit_message',
        messageId: messageId,
        text: newText
    });
}

// Удаление сообщения
function deleteMessage(messageId, deleteFor = 'me') {
    sendToServer({
        type: 'delete_message',
        messageId: messageId,
        deleteFor: deleteFor
    });
}

// Отправка реакции
function sendReaction(messageId, reaction) {
    sendToServer({
        type: 'reaction',
        messageId: messageId,
        reaction: reaction
    });
}

// Закрепление сообщения
function pinMessage(messageId) {
    sendToServer({
        type: 'pin_message',
        messageId: messageId
    });
}

// Индикатор печати
function sendTyping() {
    sendToServer({
        type: 'typing'
    });
}

// Создание опроса
function createPoll(question, options, pollsType, anonymous, multiple, closeDate) {
    sendToServer({
        type: pollsType === 'quiz' ? 'create_quiz' : 'create_poll',
        question: question,
        options: options,
        pollsType: pollsType,
        anonymous: anonymous,
        multiple: multiple,
        closeDate: closeDate
    });
}

// Голосование
function votePoll(pollId, option) {
    sendToServer({
        type: 'vote',
        pollId: pollId,
        option: option
    });
}

// Закрытие опроса
function closePoll(pollId) {
    sendToServer({
        type: 'close_poll',
        pollId: pollId
    });
}

// Отправка жалобы
function sendReport(messageId, reason) {
    sendToServer({
        type: 'report',
        messageId: messageId,
        reason: reason
    });
}

// Действие админа
function adminAction(action, data) {
    sendToServer({
        type: 'admin_action',
        action: action,
        ...data
    });
}

// Загрузка пользователя из localStorage
function loadUserFromStorage() {
    try {
        const data = localStorage.getItem('chat_user');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

// Сохранение пользователя в localStorage
function saveUserToStorage(user) {
    try {
        localStorage.setItem('chat_user', JSON.stringify({
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            verified: user.verified,
            badge: user.badge
        }));
    } catch (e) {
        console.error('Failed to save user:', e);
    }
}

// Обработка сообщений от сервера
function handleServerMessage(data) {
    switch (data.type) {
        case 'init':
            handleInit(data);
            break;
        case 'registered':
            handleRegistered(data);
            break;
        case 'new_message':
            handleNewMessage(data);
            break;
        case 'message_edited':
            handleMessageEdited(data);
            break;
        case 'message_deleted':
            handleMessageDeleted(data);
            break;
        case 'reactions_updated':
            handleReactionsUpdated(data);
            break;
        case 'message_pinned':
            handleMessagePinned(data);
            break;
        case 'typing':
            handleTyping(data);
            break;
        case 'online':
            handleOnline(data);
            break;
        case 'users':
            handleUsers(data);
            break;
        case 'verified':
            handleVerified(data);
            break;
        case 'mentioned':
            handleMentioned(data);
            break;
        case 'new_poll':
            handleNewPoll(data);
            break;
        case 'poll_updated':
            handlePollUpdated(data);
            break;
        case 'poll_closed':
            handlePollClosed(data);
            break;
        case 'username_status':
            handleUsernameStatus(data);
            break;
        case 'profile_updated':
            handleProfileUpdated(data);
            break;
        case 'report_submitted':
            notifyReportSubmitted();
            break;
        case 'error':
            showError(data.text);
            break;
    }
}

// Заглушки для обработчиков (будут переопределены в chat.js)
function handleInit(data) { console.log('Init:', data); }
function handleRegistered(data) { console.log('Registered:', data); }
function handleNewMessage(data) { console.log('New message:', data); }
function handleMessageEdited(data) { console.log('Message edited:', data); }
function handleMessageDeleted(data) { console.log('Message deleted:', data); }
function handleReactionsUpdated(data) { console.log('Reactions:', data); }
function handleMessagePinned(data) { console.log('Pinned:', data); }
function handleTyping(data) { console.log('Typing:', data); }
function handleOnline(data) { console.log('Online:', data); }
function handleUsers(data) { console.log('Users:', data); }
function handleVerified(data) { console.log('Verified:', data); }
function handleMentioned(data) { console.log('Mentioned:', data); }
function handleNewPoll(data) { console.log('New poll:', data); }
function handlePollUpdated(data) { console.log('Poll updated:', data); }
function handlePollClosed(data) { console.log('Poll closed:', data); }
function handleUsernameStatus(data) { console.log('Username status:', data); }
function handleProfileUpdated(data) { console.log('Profile updated:', data); }

// Инициализация WebSocket при загрузке
connectWebSocket();
