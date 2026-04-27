// frontend/assets/js/chat.js

// Состояние чата
const chatState = {
    messages: [],
    pinnedMessageId: null,
    replyTo: null,
    deleteMode: false,
    selectedForDelete: new Set(),
    unreadCount: 0,
    nearBottom: true,
};

// Инициализация чата
function initChat() {
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesContainer = document.getElementById('messagesContainer');

    // Ввод сообщения
    msgInput.addEventListener('input', handleInputChange);
    msgInput.addEventListener('keydown', handleInputKeydown);
    sendBtn.addEventListener('click', handleSendClick);

    // Скролл
    messagesContainer.addEventListener('scroll', handleScroll);

    // Кнопка скролла вниз
    document.getElementById('scrollBtn').addEventListener('click', scrollToBottom);

    // Меню (три точки)
    initChatMenu();

    // Кнопка +
    initAttachMenu();

    // Закреплённое сообщение
    initPinnedMessage();

    // Ссылки
    initLinkHandling();
}

// Обработка ввода
function handleInputChange() {
    const input = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');
    const isEmpty = !input.value.trim() && mediaState.pendingFiles.length === 0;

    sendBtn.disabled = isEmpty && mediaState.pendingFiles.length === 0;

    // Переключение между кнопкой отправки и микрофоном
    if (isEmpty && !input.dataset.editingId) {
        sendBtn.style.display = 'none';
        if (micBtn) micBtn.style.display = 'flex';
    } else {
        sendBtn.style.display = 'flex';
        if (micBtn) micBtn.style.display = 'none';
    }

    // Отправка индикатора печати
    if (input.value.trim() && !chatState._typingSent) {
        chatState._typingSent = true;
        sendTyping();
        setTimeout(() => { chatState._typingSent = false; }, 3000);
    }

    // Авто-рост поля ввода
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
}

function handleInputKeydown(e) {
    const input = document.getElementById('msgInput');

    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.dataset.editingId) {
            submitEditMessage();
        } else {
            handleSendClick();
        }
    }

    if (e.key === 'Escape') {
        if (input.dataset.editingId) {
            cancelEdit();
        }
        if (chatState.replyTo) {
            cancelReply();
        }
    }

    // Tab для вставки форматирования
    if (e.key === 'Tab') {
        e.preventDefault();
        // Можно добавить автодополнение @username
    }
}

function handleSendClick() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();

    if (input.dataset.editingId) {
        submitEditMessage();
        return;
    }

    if (mediaState.pendingFiles.length > 0 || text) {
        sendMessageWithMedia(text, chatState.replyTo);
        input.value = '';
        input.style.height = 'auto';
        cancelReply();
    }
}

// Скролл
function handleScroll() {
    const container = document.getElementById('messagesContainer');
    chatState.nearBottom = isNearBottom(100);

    if (chatState.nearBottom) {
        chatState.unreadCount = 0;
        updateScrollButton();
    }
}

function updateScrollButton() {
    const btn = document.getElementById('scrollBtn');
    const badge = document.getElementById('unreadCount');

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

// Меню чата (три точки)
function initChatMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menu = document.getElementById('menuDropdown');

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = menu.style.display === 'block';
        menu.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            positionDropdown(menu, menuBtn);
        }
    });

    menu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            handleMenuAction(action);
            menu.style.display = 'none';
        });
    });

    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });
}

function handleMenuAction(action) {
    switch (action) {
        case 'settings':
            openSettings();
            break;
        case 'clear-chat':
            showClearChatConfirmation();
            break;
        case 'delete-mode':
            toggleDeleteMode();
            break;
        case 'export':
            exportHistory('json');
            break;
    }
}

// Подтверждение очистки чата
function showClearChatConfirmation() {
    const modal = document.getElementById('deleteModal');
    const countEl = document.getElementById('deleteCount');
    if (!modal || !countEl) return;

    countEl.textContent = t('confirmClearChat');
    modal.style.display = 'flex';

    document.getElementById('confirmDelete').onclick = () => {
        // Очищаем локально
        chatState.messages = [];
        document.getElementById('messagesContainer').innerHTML = '';
        modal.style.display = 'none';
        notifyChatCleared();
    };

    document.getElementById('cancelDelete').onclick = () => {
        modal.style.display = 'none';
    };
}

// Режим удаления сообщений
function toggleDeleteMode() {
    chatState.deleteMode = !chatState.deleteMode;
    chatState.selectedForDelete.clear();

    const container = document.getElementById('chatContainer');
    if (chatState.deleteMode) {
        container.classList.add('delete-mode');
        showToast('Select messages to delete', 'info', 3000);

        // Добавляем чекбоксы
        document.querySelectorAll('.message').forEach(msg => {
            addDeleteCheckbox(msg);
        });

        // Кнопка удаления выбранных
        showDeleteModeBar();
    } else {
        container.classList.remove('delete-mode');
        document.querySelectorAll('.delete-checkbox').forEach(cb => cb.remove());
        hideDeleteModeBar();
    }
}

function addDeleteCheckbox(msgEl) {
    if (msgEl.querySelector('.delete-checkbox')) return;

    const checkbox = document.createElement('div');
    checkbox.className = 'delete-checkbox';
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = msgEl.dataset.messageId;
        if (chatState.selectedForDelete.has(msgId)) {
            chatState.selectedForDelete.delete(msgId);
            checkbox.classList.remove('checked');
        } else {
            chatState.selectedForDelete.add(msgId);
            checkbox.classList.add('checked');
        }
        updateDeleteModeBar();
    });

    msgEl.appendChild(checkbox);
}

function showDeleteModeBar() {
    let bar = document.getElementById('deleteModeBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'deleteModeBar';
        bar.className = 'delete-mode-bar';
        bar.innerHTML = `
            <span id="deleteCountText">0 selected</span>
            <button id="cancelDeleteMode" class="btn-secondary">Cancel</button>
            <button id="confirmDeleteSelected" class="btn-danger">Delete</button>
        `;
        document.getElementById('chatContainer').appendChild(bar);

        document.getElementById('cancelDeleteMode').addEventListener('click', toggleDeleteMode);
        document.getElementById('confirmDeleteSelected').addEventListener('click', () => {
            if (chatState.selectedForDelete.size > 0) {
                showDeleteConfirmation(Array.from(chatState.selectedForDelete));
                toggleDeleteMode();
            }
        });
    }
    bar.style.display = 'flex';
    updateDeleteModeBar();
}

function hideDeleteModeBar() {
    const bar = document.getElementById('deleteModeBar');
    if (bar) bar.style.display = 'none';
}

function updateDeleteModeBar() {
    const count = chatState.selectedForDelete.size;
    const text = document.getElementById('deleteCountText');
    if (text) text.textContent = `${count} selected`;
}

// Закреплённое сообщение
function initPinnedMessage() {
    const pinnedEl = document.getElementById('pinnedMessage');
    const unpinBtn = document.getElementById('unpinBtn');

    pinnedEl.addEventListener('click', () => {
        if (chatState.pinnedMessageId) {
            const msgEl = document.querySelector(`[data-message-id="${chatState.pinnedMessageId}"]`);
            if (msgEl) {
                msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                msgEl.style.animation = 'highlightPulse 1s ease';
                setTimeout(() => msgEl.style.animation = '', 1000);
            }
        }
    });

    unpinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentUser?.badge === 'admin') {
            pinMessage(null);
        }
    });
}

// Обработка ссылок
function initLinkHandling() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.chat-link');
        if (link) {
            e.preventDefault();
            showLinkConfirmation(link.dataset.url || link.href);
        }
    });
}

function showLinkConfirmation(url) {
    const modal = document.getElementById('linkModal');
    const urlEl = document.getElementById('linkUrl');
    if (!modal || !urlEl) return;

    urlEl.textContent = url;
    modal.style.display = 'flex';

    document.getElementById('openLink').onclick = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
        modal.style.display = 'none';
    };

    document.getElementById('cancelLink').onclick = () => {
        modal.style.display = 'none';
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Превью ответа
function setReply(messageId, name, text) {
    chatState.replyTo = messageId;
    const preview = document.getElementById('replyPreview');
    document.getElementById('rpName').textContent = name;
    document.getElementById('rpText').textContent = text || '';
    preview.style.display = 'flex';

    document.getElementById('rpClose').addEventListener('click', cancelReply);
    document.getElementById('msgInput').focus();
}

function cancelReply() {
    chatState.replyTo = null;
    document.getElementById('replyPreview').style.display = 'none';
}

// Рендеринг сообщения
function renderMessage(msg) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    div.dataset.messageId = msg.id;

    const isOwn = currentUser && msg.username === currentUser.username;
    const isAdmin = msg.username === 'admin' || msg.badge === 'admin';

    // Аватарка
    const avatarHtml = createAvatarHtml({ name: msg.name, username: msg.username, avatar: msg.avatar });

    // Имя
    const nameColor = getColor(msg.name);
    const verifiedIcon = msg.verified ? ' <span style="color:var(--accent);font-size:10px">✓</span>' : '';

    // Время
    const time = formatMessageTime(msg.time);

    // Текст с маркдауном
    let textHtml = '';
    if (msg.deleted) {
        textHtml = `<span class="deleted-msg">${t('deleted')}</span>`;
    } else if (msg.type === 'text' || !msg.type) {
        textHtml = parseMarkdown(msg.text || '');
    } else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'file' || msg.type === 'voice') {
        textHtml = createMediaMessageHtml(msg);
        if (msg.text) {
            textHtml += parseMarkdown(msg.text);
        }
    }

    // Ответ
    let replyHtml = '';
    if (msg.replyTo) {
        const repliedMsg = chatState.messages.find(m => m.id === msg.replyTo);
        if (repliedMsg && !repliedMsg.deleted) {
            replyHtml = `
                <div class="reply-block" onclick="scrollToMessage('${repliedMsg.id}')">
                    <strong>${escapeHtml(repliedMsg.name)}</strong>
                    ${escapeHtml((repliedMsg.text || '[Media]').substring(0, 50))}
                </div>
            `;
        } else {
            replyHtml = `<div class="reply-block"><em>${t('deleted')}</em></div>`;
        }
    }

    // Редактирование
    const editedLabel = msg.edited ? `<span class="edited-label">${t('edited')}</span>` : '';

    // Галочки
    let checkmarks = '';
    if (isOwn) {
        checkmarks = `<span class="checkmarks">${t('sent')}</span>`;
    }

    // Реакции
    let reactionsHtml = '';
    if (msg.reactions && msg.reactions.length > 0) {
        reactionsHtml = '<div class="reactions">';
        msg.reactions.forEach(r => {
            reactionsHtml += `<span class="reaction${r.users.includes(currentUser?.username) ? ' active' : ''}" 
                                   onclick="sendReaction('${msg.id}', '${r.reaction}')">
                ${r.reaction} ${r.count}
            </span>`;
        });
        reactionsHtml += '</div>';
    }

    div.innerHTML = `
        ${avatarHtml}
        <div class="msg-content">
            <div class="msg-header">
                <span class="msg-name" style="color:${nameColor}" onclick="showUserProfile('${msg.username}')">${escapeHtml(msg.name)}${verifiedIcon}</span>
                <span class="msg-username">@${escapeHtml(msg.username)}</span>
                <span class="msg-time">${time}${checkmarks}</span>
            </div>
            <div class="msg-bubble ${msg.edited ? 'edited' : ''} ${isAdmin ? 'admin' : ''}">
                ${replyHtml}
                ${textHtml}
            </div>
            ${editedLabel}
            ${reactionsHtml}
        </div>
        <div class="msg-actions">
            <button class="msg-action-btn" title="${t('reply')}" onclick="setReply('${msg.id}','${escapeHtml(msg.name)}','${escapeHtml((msg.text||'').substring(0,50))}')">↩</button>
            ${msg.text ? `<button class="msg-action-btn" title="${t('copy')}" onclick="copyToClipboard('${escapeHtml(msg.text).replace(/'/g, "\\'")}');notifyCopied()">📋</button>` : ''}
            ${isOwn && msg.text && msg.type === 'text' ? `<button class="msg-action-btn" title="${t('edit')}" onclick="startEditMessage('${msg.id}','${escapeHtml(msg.text).replace(/'/g, "\\'")}')">✏</button>` : ''}
        </div>
    `;

    // Контекстное меню
    div.addEventListener('contextmenu', (e) => {
        showContextMenu(e, msg);
    });

    // Долгое нажатие для мобильных
    let longPressTimer;
    div.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            showContextMenu(e, msg);
        }, 500);
    });
    div.addEventListener('touchend', () => clearTimeout(longPressTimer));
    div.addEventListener('touchmove', () => clearTimeout(longPressTimer));

    container.appendChild(div);
}

// Добавление системного сообщения
function addSystemMessage(text) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = text;
    container.appendChild(div);
    scrollToBottom();
}

// Скролл к сообщению
function scrollToMessage(messageId) {
    const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (msgEl) {
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgEl.style.animation = 'highlightPulse 1s ease';
        setTimeout(() => msgEl.style.animation = '', 1000);
    }
}

// Позиционирование выпадающего меню
function positionDropdown(menu, trigger) {
    const rect = trigger.getBoundingClientRect();
    menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
}

// Инициализация меню вложений
function initAttachMenu() {
    const plusBtn = document.getElementById('plusBtn');
    const attachMenu = document.getElementById('attachMenu');

    plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = attachMenu.style.display === 'block';
        attachMenu.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            positionDropdown(attachMenu, plusBtn);
        }
    });

    attachMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            handleAttachAction(action);
            attachMenu.style.display = 'none';
        });
    });

    document.addEventListener('click', () => {
        attachMenu.style.display = 'none';
    });
}

function handleAttachAction(action) {
    switch (action) {
        case 'photo':
            openPhotoPicker();
            break;
        case 'video':
            openVideoPicker();
            break;
        case 'file':
            openFilePicker();
            break;
        case 'poll':
            openPollModal('poll');
            break;
        case 'quiz':
            openPollModal('quiz');
            break;
    }
}

// Обработчики сообщений с сервера
function handleInit(data) {
    if (data.messages) {
        chatState.messages = data.messages;
        data.messages.forEach(msg => renderMessage(msg));
        scrollToBottom(false);
    }
    if (data.pinned) {
        chatState.pinnedMessageId = data.pinned;
        updatePinnedMessage(data.pinned);
    }
    if (data.userId) {
        wsUserId = data.userId;
    }
    if (data.polls) {
        allPolls = data.polls;
    }
}

function handleNewMessage(data) {
    const msg = data.message;
    chatState.messages.push(msg);
    renderMessage(msg);

    if (chatState.nearBottom) {
        scrollToBottom();
    } else {
        chatState.unreadCount++;
        updateScrollButton();
    }

    // Уведомление
    if (msg.username !== currentUser?.username) {
        notifyNewMessage(msg.name, msg.text);
    }
}

function handleMessageEdited(data) {
    const msg = chatState.messages.find(m => m.id === data.messageId);
    if (msg) {
        msg.text = data.text;
        msg.edited = true;
        // Перерендериваем
        const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (msgEl) {
            const bubble = msgEl.querySelector('.msg-bubble');
            if (bubble) {
                bubble.innerHTML = parseMarkdown(data.text);
                bubble.classList.add('edited');
            }
            if (!msgEl.querySelector('.edited-label')) {
                const label = document.createElement('span');
                label.className = 'edited-label';
                label.textContent = t('edited');
                bubble.after(label);
            }
        }
    }
}

function handleMessageDeleted(data) {
    if (data.deleteFor === 'all') {
        const msg = chatState.messages.find(m => m.id === data.messageId);
        if (msg) msg.deleted = true;
        const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (msgEl) {
            const bubble = msgEl.querySelector('.msg-bubble');
            if (bubble) {
                bubble.innerHTML = `<span class="deleted-msg">${t('deleted')}</span>`;
                bubble.classList.remove('edited');
            }
            const edited = msgEl.querySelector('.edited-label');
            if (edited) edited.remove();
        }
    } else if (data.deleteFor === 'me' && data.username === currentUser?.username) {
        const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (msgEl) msgEl.remove();
    }
}

function handleMessagePinned(data) {
    chatState.pinnedMessageId = data.messageId;
    updatePinnedMessage(data.messageId);
    notifyPinned();
}

function updatePinnedMessage(messageId) {
    const pinnedEl = document.getElementById('pinnedMessage');
    const pinnedText = document.getElementById('pinnedText');

    if (messageId) {
        const msg = chatState.messages.find(m => m.id === messageId);
        if (msg) {
            pinnedText.textContent = (msg.text || '[Media]').substring(0, 80);
            pinnedEl.style.display = 'flex';
        }
    } else {
        pinnedEl.style.display = 'none';
    }
}

function handleOnline(data) {
    document.getElementById('onlineCount').textContent = t('online', { count: data.count });
}

function handleTyping(data) {
    const indicator = document.getElementById('typingIndicator');
    const text = document.getElementById('typingText');
    if (indicator && text) {
        text.textContent = t('typing', { name: data.username });
        indicator.style.display = 'block';
        clearTimeout(chatState._typingTimeout);
        chatState._typingTimeout = setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }
}

function handleMentioned(data) {
    notifyMention(data.by);
}

// Добавление стилей
function addChatStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes highlightPulse {
            0%,100% { background: transparent; }
            50% { background: rgba(59,130,246,0.15); }
        }
        .delete-mode-bar {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-tertiary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius);
            padding: 8px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 50;
            box-shadow: var(--shadow);
            animation: fadeIn 0.2s ease;
        }
        .file-message {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: var(--bg-input);
            border-radius: 8px;
            cursor: pointer;
        }
        .file-message:hover { background: var(--border); }
        .file-icon { font-size: 24px; }
        .file-info { flex: 1; }
        .file-name { font-size: 12px; display: block; }
        .file-size { font-size: 10px; color: var(--text-muted); }
        .file-download { font-size: 16px; }
        .msg-image {
            max-width: 250px;
            max-height: 250px;
            border-radius: 8px;
            cursor: pointer;
        }
        .msg-video {
            max-width: 250px;
            max-height: 250px;
            border-radius: 8px;
            cursor: pointer;
        }
        #sendBtn, #micBtn { transition: none; }
    `;
    document.head.appendChild(style);
}

addChatStyles();
initChat();
