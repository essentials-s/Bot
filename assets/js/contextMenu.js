// frontend/assets/js/contextMenu.js

// Состояние контекстного меню
const contextMenuState = {
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
    messageData: null,
};

// Инициализация контекстного меню
function initContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    // Закрытие при клике вне меню
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
        }
    });

    // Закрытие при скролле
    document.getElementById('messagesContainer')?.addEventListener('scroll', hideContextMenu);
}

// Показать контекстное меню
function showContextMenu(event, messageData) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    const isOwn = messageData.username === currentUser?.username;
    const isAdmin = currentUser?.badge === 'admin';
    const isModerator = currentUser?.badge === 'moderator';
    const canDelete = isOwn || isAdmin || isModerator;

    // Позиция
    let x = event.clientX || (event.touches && event.touches[0].clientX) || 0;
    let y = event.clientY || (event.touches && event.touches[0].clientY) || 0;

    // Корректировка чтобы меню не выходило за экран
    const menuWidth = 200;
    const menuHeight = 300;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    // Строим меню
    let menuHTML = '';

    // Кнопка Ответить
    menuHTML += `<button class="dropdown-item" data-action="reply">
        ↩ ${t('reply')}
    </button>`;

    // Кнопка Копировать
    if (messageData.text) {
        menuHTML += `<button class="dropdown-item" data-action="copy">
            📋 ${t('copy')}
        </button>`;
    }

    // Кнопка Изменить (только свои)
    if (isOwn && messageData.text && messageData.type === 'text') {
        menuHTML += `<button class="dropdown-item" data-action="edit">
            ✏ ${t('edit')}
        </button>`;
    }

    // Кнопка Удалить
    if (canDelete) {
        menuHTML += `<button class="dropdown-item danger" data-action="delete-me">
            🗑 ${t('deleteForMe')}
        </button>`;
        menuHTML += `<button class="dropdown-item danger" data-action="delete-all">
            🗑 ${t('deleteForAll')}
        </button>`;
    }

    // Кнопка Пожаловаться (не на себя)
    if (!isOwn) {
        menuHTML += `<div class="dropdown-divider"></div>`;
        menuHTML += `<button class="dropdown-item" data-action="report">
            🚩 ${t('report')}
        </button>`;
    }

    // Кнопка Закрепить (только админ)
    if (isAdmin) {
        menuHTML += `<div class="dropdown-divider"></div>`;
        menuHTML += `<button class="dropdown-item" data-action="pin">
            📌 ${t('pin')}
        </button>`;
    }

    // Кнопки реакций
    menuHTML += `<div class="dropdown-divider"></div>`;
    menuHTML += `<div class="reaction-row">
        <button class="reaction-btn" data-reaction="👍">👍</button>
        <button class="reaction-btn" data-reaction="❤">❤</button>
        <button class="reaction-btn" data-reaction="😂">😂</button>
        <button class="reaction-btn" data-reaction="😮">😮</button>
        <button class="reaction-btn" data-reaction="😢">😢</button>
        <button class="reaction-btn" data-reaction="👏">👏</button>
    </div>`;

    menu.innerHTML = menuHTML;
    menu.style.cssText = `
        display: block;
        left: ${x}px;
        top: ${y}px;
    `;

    // Сохраняем состояние
    contextMenuState.visible = true;
    contextMenuState.messageId = messageData.id;
    contextMenuState.messageData = messageData;

    // Обработчики
    menu.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleContextAction(action, messageData);
            hideContextMenu();
        });
    });

    // Обработчики реакций
    menu.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const reaction = btn.dataset.reaction;
            sendReaction(messageData.id, reaction);
            hideContextMenu();
        });
    });
}

// Скрыть контекстное меню
function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) {
        menu.style.display = 'none';
    }
    contextMenuState.visible = false;
    contextMenuState.messageId = null;
    contextMenuState.messageData = null;
}

// Обработка действия из контекстного меню
function handleContextAction(action, messageData) {
    switch (action) {
        case 'reply':
            setReply(messageData.id, messageData.name, messageData.text?.substring(0, 50) || '');
            break;

        case 'copy':
            if (messageData.text) {
                copyToClipboard(messageData.text).then(() => notifyCopied());
            }
            break;

        case 'edit':
            startEditMessage(messageData.id, messageData.text);
            break;

        case 'delete-me':
            deleteMessage(messageData.id, 'me');
            break;

        case 'delete-all':
            showDeleteConfirmation([messageData.id]);
            break;

        case 'report':
            openReportModal(messageData);
            break;

        case 'pin':
            pinMessage(messageData.id);
            break;
    }
}

// Показать подтверждение удаления
function showDeleteConfirmation(messageIds) {
    const modal = document.getElementById('deleteModal');
    const countEl = document.getElementById('deleteCount');
    if (!modal || !countEl) return;

    countEl.textContent = t('confirmDelete', { count: messageIds.length });
    modal.style.display = 'flex';

    // Сохраняем ID для удаления
    modal._messageIds = messageIds;

    document.getElementById('confirmDelete').onclick = () => {
        messageIds.forEach(id => deleteMessage(id, 'all'));
        modal.style.display = 'none';
        if (messageIds.length > 1) {
            notifyDeleted(messageIds.length);
        }
    };

    document.getElementById('cancelDelete').onclick = () => {
        modal.style.display = 'none';
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Модальное окно жалобы
function openReportModal(messageData) {
    const modal = document.getElementById('reportModal');
    if (!modal) return;

    const preview = document.getElementById('reportPreview');
    if (preview) {
        preview.innerHTML = `
            <div style="margin-bottom:12px;padding:8px;background:var(--bg-input);border-radius:8px">
                <strong>${escapeHtml(messageData.name)}</strong><br>
                <span style="font-size:12px;color:var(--text-secondary)">${escapeHtml(messageData.text?.substring(0, 100) || '[Media]')}</span>
            </div>
        `;
    }

    modal.style.display = 'flex';
    modal._messageData = messageData;

    document.getElementById('submitReport').onclick = () => {
        const reason = document.getElementById('reportReason').value.trim();
        if (!reason) {
            showError('Enter reason');
            return;
        }
        sendReport(messageData.id, reason);
        modal.style.display = 'none';
        document.getElementById('reportReason').value = '';
        notifyReportSubmitted();
    };

    document.getElementById('cancelReport').onclick = () => {
        modal.style.display = 'none';
        document.getElementById('reportReason').value = '';
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.getElementById('reportReason').value = '';
        }
    });
}

// Начать редактирование сообщения
function startEditMessage(messageId, currentText) {
    const msgInput = document.getElementById('msgInput');
    if (!msgInput) return;

    // Сохраняем ID редактируемого сообщения
    msgInput.dataset.editingId = messageId;
    msgInput.value = currentText;
    msgInput.focus();
    
    // Курсор в конец
    msgInput.setSelectionRange(msgInput.value.length, msgInput.value.length);
    
    // Обновляем кнопку отправки
    msgInput.dispatchEvent(new Event('input'));
    
    // Показываем индикатор редактирования
    showEditingIndicator(messageId);
}

// Отправить отредактированное сообщение
function submitEditMessage() {
    const msgInput = document.getElementById('msgInput');
    if (!msgInput || !msgInput.dataset.editingId) return;

    const messageId = msgInput.dataset.editingId;
    const newText = msgInput.value.trim();
    
    if (!newText) return;
    
    editMessage(messageId, newText);
    
    // Очищаем
    delete msgInput.dataset.editingId;
    msgInput.value = '';
    msgInput.dispatchEvent(new Event('input'));
    hideEditingIndicator();
}

// Показать индикатор редактирования
function showEditingIndicator(messageId) {
    hideEditingIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'editingIndicator';
    indicator.className = 'reply-preview';
    indicator.style.borderLeftColor = 'var(--warning)';
    indicator.innerHTML = `
        <div class="rp-info">
            <span style="color:var(--warning)">Editing message</span>
        </div>
        <button class="icon-btn-sm" onclick="cancelEdit()">✕</button>
    `;
    
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.parentNode.insertBefore(indicator, messagesContainer.nextSibling);
    }
}

// Скрыть индикатор редактирования
function hideEditingIndicator() {
    const indicator = document.getElementById('editingIndicator');
    if (indicator) indicator.remove();
}

// Отменить редактирование
function cancelEdit() {
    const msgInput = document.getElementById('msgInput');
    if (msgInput) {
        delete msgInput.dataset.editingId;
        msgInput.value = '';
        msgInput.dispatchEvent(new Event('input'));
    }
    hideEditingIndicator();
}

// Инициализация при загрузке
initContextMenu();
