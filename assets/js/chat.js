// frontend/assets/js/chat.js

var chatState = {
    messages: [],
    pinnedMessageId: null,
    replyTo: null,
    deleteMode: false,
    selectedForDelete: [],
    unreadCount: 0,
    nearBottom: true,
    typingTimeout: null,
    editingId: null,
};

function initChat() {
    var msgInput = document.getElementById('msgInput');
    var sendBtn = document.getElementById('sendBtn');
    var messagesContainer = document.getElementById('messagesContainer');

    msgInput.addEventListener('input', handleInputChange);
    msgInput.addEventListener('keydown', handleInputKeydown);
    sendBtn.addEventListener('click', handleSendClick);
    messagesContainer.addEventListener('scroll', handleScroll);

    document.getElementById('scrollBtn').addEventListener('click', function() {
        scrollToBottom();
        chatState.unreadCount = 0;
        updateScrollButton();
    });

    initChatMenu();
    initAttachMenu();
}

// Ввод
function handleInputChange() {
    var input = document.getElementById('msgInput');
    var sendBtn = document.getElementById('sendBtn');
    var micBtn = document.getElementById('micBtn');
    var isEmpty = !input.value.trim() && (!window.mediaState || window.mediaState.pendingFiles.length === 0);

    sendBtn.disabled = isEmpty;

    if (isEmpty && !chatState.editingId) {
        sendBtn.style.display = 'none';
        if (micBtn) micBtn.style.display = 'flex';
    } else {
        sendBtn.style.display = 'flex';
        if (micBtn) micBtn.style.display = 'none';
    }

    if (input.value.trim()) {
        sendTypingThrottled();
    }

    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
}

var sendTypingThrottled = throttle(function() {
    sendTyping();
}, 3000);

function handleInputKeydown(e) {
    var input = document.getElementById('msgInput');

    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (chatState.editingId) {
            submitEditMessage();
        } else {
            handleSendClick();
        }
    }

    if (e.key === 'Escape') {
        if (chatState.editingId) cancelEdit();
        if (chatState.replyTo) cancelReply();
    }
}

function handleSendClick() {
    var input = document.getElementById('msgInput');
    var text = input.value.trim();

    // Команда /admin
    if (text === '/admin') {
        input.value = '';
        document.getElementById('sendBtn').disabled = true;
        var pass = prompt('Enter admin password:');
        if (pass === 'admin2011') {
            window.location.href = '/admin.html';
        } else if (pass !== null) {
            if (typeof showToast === 'function') showToast('Wrong password', 'error');
        }
        return;
    }

    if (chatState.editingId) {
        submitEditMessage();
        return;
    }

    if (window.mediaState && window.mediaState.pendingFiles && window.mediaState.pendingFiles.length > 0) {
        if (typeof sendMessageWithMedia === 'function') {
            sendMessageWithMedia(text, chatState.replyTo);
        }
    } else if (text) {
        sendMessage(text, chatState.replyTo);
    }

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
    cancelReply();
}

// Скролл
function handleScroll() {
    var container = document.getElementById('messagesContainer');
    chatState.nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (chatState.nearBottom) {
        chatState.unreadCount = 0;
        updateScrollButton();
    }
}

function updateScrollButton() {
    var btn = document.getElementById('scrollBtn');
    var badge = document.getElementById('unreadCount');

    if (chatState.unreadCount > 0) {
        btn.style.display = 'flex';
        badge.textContent = chatState.unreadCount > 99 ? '99+' : chatState.unreadCount;
        badge.style.display = 'flex';
    } else if (!chatState.nearBottom && chatState.unreadCount === 0) {
        btn.style.display = 'flex';
        badge.style.display = 'none';
    } else {
        btn.style.display = 'none';
    }
}

// Меню (три точки)
function initChatMenu() {
    var menuBtn = document.getElementById('menuBtn');
    var menu = document.getElementById('menuDropdown');

    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', function() {
        menu.style.display = 'none';
    });

    menu.addEventListener('click', function(e) {
        var action = e.target.dataset.action;
        if (!action) return;
        menu.style.display = 'none';

        if (action === 'settings') {
            if (typeof openSettings === 'function') openSettings();
        } else if (action === 'clear-chat') {
            if (confirm('Clear all messages?')) {
                document.getElementById('messagesContainer').innerHTML = '<div class="system-msg">Chat cleared</div>';
                chatState.messages = [];
                if (typeof showToast === 'function') showToast('Chat cleared', 'success');
            }
        } else if (action === 'delete-mode') {
            toggleDeleteMode();
        } else if (action === 'export') {
            if (typeof exportHistory === 'function') exportHistory('json');
        } else if (action === 'logout') {
            if (typeof window.logout === 'function') window.logout();
        }
    });
}

// Меню вложений
function initAttachMenu() {
    var plusBtn = document.getElementById('plusBtn');
    var attachMenu = document.getElementById('attachMenu');

    plusBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        attachMenu.style.display = attachMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', function() {
        attachMenu.style.display = 'none';
    });

    attachMenu.addEventListener('click', function(e) {
        var action = e.target.dataset.action;
        if (!action) return;
        attachMenu.style.display = 'none';

        if (action === 'photo' && typeof openPhotoPicker === 'function') openPhotoPicker();
        if (action === 'video' && typeof openVideoPicker === 'function') openVideoPicker();
        if (action === 'file' && typeof openFilePicker === 'function') openFilePicker();
        if (action === 'camera' && typeof openCamera === 'function') openCamera();
        if (action === 'poll' && typeof openPollModal === 'function') openPollModal('poll');
        if (action === 'quiz' && typeof openPollModal === 'function') openPollModal('quiz');
    });
}

// Режим удаления
function toggleDeleteMode() {
    chatState.deleteMode = !chatState.deleteMode;
    chatState.selectedForDelete = [];

    document.querySelectorAll('.message').forEach(function(msg) {
        if (chatState.deleteMode) {
            var cb = document.createElement('div');
            cb.className = 'delete-checkbox';
            cb.addEventListener('click', function(e) {
                e.stopPropagation();
                var msgId = msg.dataset.messageId;
                var idx = chatState.selectedForDelete.indexOf(msgId);
                if (idx >= 0) {
                    chatState.selectedForDelete.splice(idx, 1);
                    cb.classList.remove('checked');
                } else {
                    chatState.selectedForDelete.push(msgId);
                    cb.classList.add('checked');
                }
            });
            msg.appendChild(cb);
        } else {
            var existing = msg.querySelector('.delete-checkbox');
            if (existing) existing.remove();
        }
    });

    if (!chatState.deleteMode && chatState.selectedForDelete.length > 0) {
        if (confirm('Delete ' + chatState.selectedForDelete.length + ' messages?')) {
            chatState.selectedForDelete.forEach(function(id) {
                deleteMessage(id, 'all');
            });
            if (typeof showToast === 'function') showToast('Deleted', 'success');
        }
    }
}

// Ответ
function setReply(messageId, name, text) {
    chatState.replyTo = messageId;
    document.getElementById('rpName').textContent = name;
    document.getElementById('rpText').textContent = text || '';
    document.getElementById('replyPreview').style.display = 'flex';
    document.getElementById('msgInput').focus();
}

function cancelReply() {
    chatState.replyTo = null;
    document.getElementById('replyPreview').style.display = 'none';
}

// Редактирование
function startEditMessage(messageId, text) {
    var input = document.getElementById('msgInput');
    chatState.editingId = messageId;
    input.value = text;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new Event('input'));

    var indicator = document.getElementById('editingIndicator');
    if (indicator) indicator.style.display = 'flex';
}

function submitEditMessage() {
    var input = document.getElementById('msgInput');
    if (!chatState.editingId) return;
    editMessage(chatState.editingId, input.value.trim());
    chatState.editingId = null;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    var indicator = document.getElementById('editingIndicator');
    if (indicator) indicator.style.display = 'none';
}

function cancelEdit() {
    var input = document.getElementById('msgInput');
    chatState.editingId = null;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    var indicator = document.getElementById('editingIndicator');
    if (indicator) indicator.style.display = 'none';
}

// Рендер сообщений
function renderMessage(msg) {
    var container = document.getElementById('messagesContainer');
    var div = document.createElement('div');
    div.className = 'message';
    div.dataset.messageId = msg.id;

    var isOwn = currentUser && msg.username === currentUser.username;
    var isAdmin = msg.badge === 'admin' || msg.username === 'admin';
    var nameColor = getColor(msg.name);
    var time = new Date(msg.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    var replyHTML = '';
    if (msg.replyTo) {
        var replied = chatState.messages.find(function(m) { return m.id === msg.replyTo; });
        if (replied) {
            replyHTML = '<div class="reply-block" onclick="scrollToMessage(\'' + replied.id + '\')"><strong>' + esc(replied.name) + '</strong>: ' + esc((replied.text||'').substring(0,40)) + '</div>';
        }
    }

    var textHTML = '';
    if (msg.deleted) {
        textHTML = '<span class="deleted-msg">This message was deleted</span>';
    } else if (msg.type === 'image' && msg.fileUrl) {
        textHTML = '<img src="' + msg.fileUrl + '" class="msg-image" onclick="openMediaViewer(\'' + msg.fileUrl + '\',\'image\')" style="max-width:200px;max-height:200px;border-radius:8px;cursor:pointer">';
    } else if (msg.type === 'voice' && msg.fileUrl) {
        textHTML = '<div class="voice-msg"><button class="voice-play-btn" onclick="toggleVoicePlay(this,\'' + msg.fileUrl + '\')">&#9654;</button><span>' + (msg.duration||0) + 's</span></div>';
    } else {
        textHTML = typeof parseMarkdown === 'function' ? parseMarkdown(msg.text || '') : esc(msg.text || '');
    }

    var editedLabel = msg.edited ? '<span class="edited-label">edited</span>' : '';

    div.innerHTML = 
        '<div class="msg-avatar" style="background:' + getAvatarColor(msg.name) + '" onclick="showUserProfile(\'' + (msg.username||'') + '\')">' + getInitial(msg.name) + '</div>' +
        '<div class="msg-content">' +
            '<div class="msg-header">' +
                '<span class="msg-name" style="color:' + nameColor + '">' + esc(msg.name) + '</span>' +
                '<span class="msg-username">@' + esc(msg.username||'') + '</span>' +
                '<span class="msg-time">' + time + '</span>' +
                (isOwn ? '<span class="checkmarks sent">&#10003;</span>' : '') +
            '</div>' +
            '<div class="msg-bubble' + (msg.edited?' edited':'') + (isAdmin?' admin-bot':'') + '">' +
                replyHTML + textHTML +
            '</div>' +
            editedLabel +
        '</div>' +
        '<div class="msg-actions">' +
            '<button class="msg-action-btn" onclick="setReply(\'' + msg.id + '\',\'' + esc(msg.name) + '\',\'' + esc((msg.text||'').substring(0,50)) + '\')">&#8617;</button>' +
            (msg.text && isOwn ? '<button class="msg-action-btn" onclick="startEditMessage(\'' + msg.id + '\',\'' + esc(msg.text).replace(/'/g,"\\'") + '\')">&#9998;</button>' : '') +
            '<button class="msg-action-btn" onclick="copyToClipboard(\'' + esc(msg.text||'').replace(/'/g,"\\'") + '\');if(typeof showToast==\'function\')showToast(\'Copied\',\'success\')">&#128203;</button>' +
            (isOwn ? '<button class="msg-action-btn danger" onclick="if(confirm(\'Delete?\'))deleteMessage(\'' + msg.id + '\',\'all\')">&#128465;</button>' : '') +
        '</div>';

    container.appendChild(div);

    // Контекстное меню
    div.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (typeof showContextMenu === 'function') showContextMenu(e, msg);
    });
}

// Системное сообщение
function addSystemMessage(text) {
    var container = document.getElementById('messagesContainer');
    var div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = text;
    container.appendChild(div);
    scrollToBottom();
}

// Скролл к сообщению
function scrollToMessage(messageId) {
    var el = document.querySelector('[data-message-id="' + messageId + '"]');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.animation = 'highlightPulse 1s ease';
        setTimeout(function() { el.style.animation = ''; }, 1000);
    }
}

// Утилиты
function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}

function getColor(name) {
    var hash = 0;
    for (var i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return 'hsl(' + (Math.abs(hash) % 360) + ',55%,60%)';
}

function getAvatarColor(name) {
    var hash = 0;
    for (var i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return 'hsl(' + (Math.abs(hash) % 360) + ',40%,50%)';
}

function getInitial(name) {
    return (name||'?').charAt(0).toUpperCase();
}

function scrollToBottom(smooth) {
    var container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
    }
}

// Обработчики с сервера
function handleInit(data) {
    if (data.messages) {
        chatState.messages = data.messages;
        document.getElementById('messagesContainer').innerHTML = '';
        data.messages.forEach(function(msg) { renderMessage(msg); });
        scrollToBottom(false);
    }
    if (data.pinned) {
        chatState.pinnedMessageId = data.pinned;
        updatePinnedMessage(data.pinned);
    }
    if (data.userId) {
        wsUserId = data.userId;
    }
}

function handleNewMessage(data) {
    var msg = data.message;
    if (msg.type === 'system') {
        addSystemMessage(msg.text);
        return;
    }
    chatState.messages.push(msg);
    renderMessage(msg);

    if (chatState.nearBottom) {
        scrollToBottom();
    } else {
        chatState.unreadCount++;
        updateScrollButton();
    }
}

function handleMessageEdited(data) {
    var msg = chatState.messages.find(function(m) { return m.id === data.messageId; });
    if (msg) {
        msg.text = data.text;
        msg.edited = true;
    }
    var el = document.querySelector('[data-message-id="' + data.messageId + '"]');
    if (el) {
        var bubble = el.querySelector('.msg-bubble');
        if (bubble) {
            bubble.innerHTML = (typeof parseMarkdown === 'function' ? parseMarkdown(data.text) : esc(data.text));
            bubble.classList.add('edited');
        }
        if (!el.querySelector('.edited-label')) {
            var label = document.createElement('span');
            label.className = 'edited-label';
            label.textContent = 'edited';
            bubble.parentNode.appendChild(label);
        }
    }
}

function handleMessageDeleted(data) {
    if (data.deleteFor === 'all') {
        var msg = chatState.messages.find(function(m) { return m.id === data.messageId; });
        if (msg) msg.deleted = true;
        var el = document.querySelector('[data-message-id="' + data.messageId + '"]');
        if (el) {
            var bubble = el.querySelector('.msg-bubble');
            if (bubble) bubble.innerHTML = '<span class="deleted-msg">This message was deleted</span>';
            var actions = el.querySelector('.msg-actions');
            if (actions) actions.remove();
        }
    }
}

function handleMessagePinned(data) {
    chatState.pinnedMessageId = data.messageId;
    updatePinnedMessage(data.messageId);
}

function updatePinnedMessage(messageId) {
    var el = document.getElementById('pinnedMessage');
    var text = document.getElementById('pinnedText');
    if (messageId) {
        var msg = chatState.messages.find(function(m) { return m.id === messageId; });
        if (msg) {
            text.textContent = (msg.text || '[media]').substring(0, 80);
            el.style.display = 'flex';
        }
    } else {
        el.style.display = 'none';
    }
}

function handleOnline(data) {
    var el = document.getElementById('onlineCount');
    if (el) el.textContent = data.count + ' online';
}

function handleTyping(data) {
    var el = document.getElementById('typingIndicator');
    var text = document.getElementById('typingText');
    if (el && text) {
        text.textContent = data.username + ' is typing...';
        el.style.display = 'block';
        clearTimeout(chatState.typingTimeout);
        chatState.typingTimeout = setTimeout(function() { el.style.display = 'none'; }, 3000);
    }
}

function handleMentioned(data) {
    if (typeof showToast === 'function') showToast(data.by + ' mentioned you', 'info');
}

// Инициализация
initChat();