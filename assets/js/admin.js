// frontend/assets/js/admin.js

// Состояние админ-панели
const adminState = {
    loggedIn: false,
    messages: [],
    users: [],
    quickMessages: [],
    botConfig: {
        name: 'Bot',
        tag: 'bot',
        avatar: '',
        bgColor: '#1e3a5f',
        borderColor: '#2563eb',
        textColor: '#e2e8f0',
        tagColor: '#60a5fa',
        nameColor: '#93c5fd',
    },
    activeTab: 'messages',
    activeReplyIndex: null,
};

const ADMIN_PASS = 'admin2011';
const BLOB_ID = '1352058235041792000';
const API = 'https://jsonblob.com/api/jsonBlob/' + BLOB_ID;

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initAdmin() {
    // Проверяем, залогинен ли уже
    if (sessionStorage.getItem('admin_logged') === 'true') {
        adminState.loggedIn = true;
        showPanel();
        loadAllData();
        setInterval(loadAllData, 3000);
    }

    // Обработчик входа
    document.getElementById('adminLoginBtn').addEventListener('click', handleLogin);
    document.getElementById('adminPassInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Табы
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Выход
    document.getElementById('adminLogoutBtn').addEventListener('click', handleLogout);

    // Быстрые сообщения
    document.getElementById('addQuickMsgBtn').addEventListener('click', showAddQuickMsg);
    document.getElementById('saveQuickMsg').addEventListener('click', saveQuickMsg);
    document.getElementById('cancelQuickMsg').addEventListener('click', hideAddQuickMsg);

    // Кастомизация
    document.getElementById('applyColors').addEventListener('click', applyBotColors);
    document.getElementById('changeBotAvatar').addEventListener('click', changeBotAvatar);

    // Живой превью для цветов
    ['botBgColor', 'botBorderColor', 'botTextColor', 'botTagColor', 'botNameColor'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });
    document.getElementById('botName').addEventListener('input', updatePreview);
    document.getElementById('botTag').addEventListener('input', updatePreview);

    // Загружаем сохранённую конфигурацию
    loadBotConfig();
}

// ===== ВХОД =====
function handleLogin() {
    const pass = document.getElementById('adminPassInput').value;
    if (pass === ADMIN_PASS) {
        adminState.loggedIn = true;
        sessionStorage.setItem('admin_logged', 'true');
        document.getElementById('adminLogin').style.display = 'none';
        showPanel();
        loadAllData();
        setInterval(loadAllData, 3000);
    } else {
        document.getElementById('adminLoginError').style.display = 'block';
        setTimeout(() => {
            document.getElementById('adminLoginError').style.display = 'none';
        }, 2000);
    }
}

function handleLogout() {
    adminState.loggedIn = false;
    sessionStorage.removeItem('admin_logged');
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminPassInput').value = '';
}

function showPanel() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    updatePreview();
}

// ===== ТАБЫ =====
function switchTab(tabName) {
    adminState.activeTab = tabName;
    
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
}

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadAllData() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        
        adminState.messages = data.messages || [];
        document.getElementById('adminOnlineCount').textContent = (data.online || 0) + ' online';
        
        renderMessages();
        renderUsers();
    } catch (e) {
        console.error('Failed to load data:', e);
    }
}

// ===== СОХРАНЕНИЕ =====
async function saveData() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        data.messages = adminState.messages;
        await fetch(API, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (e) {
        showAdminToast('Failed to save');
        return false;
    }
}

// ===== РЕНДЕР СООБЩЕНИЙ =====
function renderMessages() {
    const container = document.getElementById('adminMessagesList');
    const msgs = adminState.messages.filter(m => !m.deleted && !m.system).reverse();
    
    if (msgs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No messages</p>';
        return;
    }

    container.innerHTML = msgs.map((msg, displayIndex) => {
        const realIndex = adminState.messages.indexOf(msg);
        const hasReply = msg.replyTo && adminState.messages.find(m => m.id === msg.replyTo);
        
        return `
            <div class="admin-msg-item" id="adminMsg-${realIndex}">
                <div class="msg-header">
                    <span class="msg-user" style="color:${getColor(msg.name)}">${esc(msg.name)}</span>
                    <span class="msg-time">${formatFull(msg.time)}</span>
                </div>
                <div class="msg-text">${esc(msg.text || '[Media]')}</div>
                ${hasReply ? `<div style="font-size:10px;color:var(--accent);margin-bottom:4px">Reply to: ${esc(adminState.messages.find(m=>m.id===msg.replyTo)?.name||'')}</div>` : ''}
                <div class="msg-actions-row">
                    <button class="msg-action-btn" onclick="openAdminReply(${realIndex})">Reply</button>
                    <button class="msg-action-btn danger" onclick="deleteMessageAdmin(${realIndex})">Delete</button>
                    ${msg.username !== 'admin' ? `<button class="msg-action-btn" onclick="setUserBadge('${esc(msg.username)}','moderator')">Moder</button>` : ''}
                </div>
                <div class="admin-reply-box" id="replyBox-${realIndex}">
                    <div class="quick-reply-btns" id="quickBtns-${realIndex}"></div>
                    <input type="text" id="replyInput-${realIndex}" placeholder="Reply..." maxlength="500">
                    <button class="btn-primary" style="width:auto;padding:6px 12px" onclick="sendAdminReply(${realIndex})">Send</button>
                    <button class="btn-secondary" style="width:auto;padding:6px 10px" onclick="closeAdminReply(${realIndex})">X</button>
                </div>
            </div>
        `;
    }).join('');

    // Восстанавливаем активное поле ответа
    if (adminState.activeReplyIndex !== null) {
        setTimeout(() => {
            const box = document.getElementById('replyBox-' + adminState.activeReplyIndex);
            const input = document.getElementById('replyInput-' + adminState.activeReplyIndex);
            if (box && input) {
                box.classList.add('active');
                input.focus();
            }
        }, 100);
    }
}

// ===== ОТВЕТ =====
function openAdminReply(index) {
    // Закрываем все другие
    document.querySelectorAll('.admin-reply-box.active').forEach(b => b.classList.remove('active'));
    
    const box = document.getElementById('replyBox-' + index);
    const input = document.getElementById('replyInput-' + index);
    
    if (box && input) {
        box.classList.add('active');
        adminState.activeReplyIndex = index;
        input.value = '';
        input.focus();
        
        // Добавляем быстрые сообщения
        const quickBtns = document.getElementById('quickBtns-' + index);
        if (quickBtns && adminState.quickMessages.length > 0) {
            quickBtns.innerHTML = adminState.quickMessages.map((qm, qi) => 
                `<button class="quick-reply-btn" onclick="useQuickMsg(${index},'${esc(qm.text.replace(/'/g,"\\'"))}')">${esc(qm.text.substring(0,15))}</button>`
            ).join('');
        }
    }
}

function closeAdminReply(index) {
    const box = document.getElementById('replyBox-' + index);
    if (box) {
        box.classList.remove('active');
        const input = document.getElementById('replyInput-' + index);
        if (input) input.value = '';
    }
    adminState.activeReplyIndex = null;
}

function useQuickMsg(index, text) {
    const input = document.getElementById('replyInput-' + index);
    if (input) {
        input.value = text;
        input.focus();
    }
}

async function sendAdminReply(index) {
    const input = document.getElementById('replyInput-' + index);
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    const originalMsg = adminState.messages[index];
    
    adminState.messages.push({
        id: 'a_' + Date.now(),
        name: adminState.botConfig.name || 'Bot',
        username: adminState.botConfig.tag || 'bot',
        text: text,
        time: Date.now(),
        replyTo: originalMsg.id,
        deleted: false,
        type: 'text'
    });
    
    await saveData();
    closeAdminReply(index);
    await loadAllData();
    showAdminToast('Reply sent');
}

// ===== УДАЛЕНИЕ =====
async function deleteMessageAdmin(index) {
    if (!confirm('Delete this message?')) return;
    
    adminState.messages[index].deleted = true;
    await saveData();
    await loadAllData();
    showAdminToast('Message deleted');
}

// ===== БЫСТРЫЕ СООБЩЕНИЯ =====
function showAddQuickMsg() {
    document.getElementById('addQuickMsgForm').style.display = 'block';
    document.getElementById('quickMsgInput').focus();
}

function hideAddQuickMsg() {
    document.getElementById('addQuickMsgForm').style.display = 'none';
    document.getElementById('quickMsgInput').value = '';
}

function saveQuickMsg() {
    const text = document.getElementById('quickMsgInput').value.trim();
    if (!text) return;
    
    adminState.quickMessages.push({
        id: 'qm_' + Date.now(),
        text: text
    });
    
    saveQuickMessages();
    renderQuickMessages();
    hideAddQuickMsg();
    showAdminToast('Quick message added');
}

function deleteQuickMsg(id) {
    adminState.quickMessages = adminState.quickMessages.filter(q => q.id !== id);
    saveQuickMessages();
    renderQuickMessages();
    showAdminToast('Quick message deleted');
}

function renderQuickMessages() {
    const container = document.getElementById('quickMessagesList');
    if (adminState.quickMessages.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No quick messages</p>';
        return;
    }
    
    container.innerHTML = adminState.quickMessages.map(qm => `
        <div class="quick-msg-item">
            <span class="quick-msg-text">${esc(qm.text)}</span>
            <button class="quick-msg-delete" onclick="deleteQuickMsg('${qm.id}')">X</button>
        </div>
    `).join('');
}

function saveQuickMessages() {
    localStorage.setItem('admin_quick_messages', JSON.stringify(adminState.quickMessages));
}

function loadQuickMessages() {
    const saved = localStorage.getItem('admin_quick_messages');
    if (saved) {
        adminState.quickMessages = JSON.parse(saved);
    }
    renderQuickMessages();
}

// ===== КАСТОМИЗАЦИЯ =====
function applyBotColors() {
    adminState.botConfig.bgColor = document.getElementById('botBgColor').value;
    adminState.botConfig.borderColor = document.getElementById('botBorderColor').value;
    adminState.botConfig.textColor = document.getElementById('botTextColor').value;
    adminState.botConfig.tagColor = document.getElementById('botTagColor').value;
    adminState.botConfig.nameColor = document.getElementById('botNameColor').value;
    adminState.botConfig.name = document.getElementById('botName').value || 'Bot';
    adminState.botConfig.tag = document.getElementById('botTag').value || 'bot';
    
    saveBotConfig();
    updatePreview();
    showAdminToast('Colors applied');
}

function updatePreview() {
    const name = document.getElementById('botName').value || 'Bot';
    const tag = document.getElementById('botTag').value || 'bot';
    const bg = document.getElementById('botBgColor').value;
    const border = document.getElementById('botBorderColor').value;
    const text = document.getElementById('botTextColor').value;
    const tagColor = document.getElementById('botTagColor').value;
    const nameColor = document.getElementById('botNameColor').value;
    
    document.getElementById('previewName').textContent = name;
    document.getElementById('previewName').style.color = nameColor;
    document.getElementById('previewTag').textContent = tag;
    document.getElementById('previewTag').style.color = tagColor;
    
    const bubble = document.getElementById('previewBubble');
    bubble.style.background = bg;
    bubble.style.borderColor = border;
    bubble.style.color = text;
}

function changeBotAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                adminState.botConfig.avatar = ev.target.result;
                saveBotConfig();
                updateBotAvatarPreview();
                showAdminToast('Avatar updated');
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function updateBotAvatarPreview() {
    const preview = document.getElementById('botAvatarPreview');
    if (adminState.botConfig.avatar) {
        preview.style.backgroundImage = `url(${adminState.botConfig.avatar})`;
        preview.textContent = '';
    } else {
        preview.style.backgroundImage = '';
        preview.textContent = 'B';
    }
}

function saveBotConfig() {
    localStorage.setItem('admin_bot_config', JSON.stringify(adminState.botConfig));
}

function loadBotConfig() {
    const saved = localStorage.getItem('admin_bot_config');
    if (saved) {
        adminState.botConfig = { ...adminState.botConfig, ...JSON.parse(saved) };
    }
    
    document.getElementById('botName').value = adminState.botConfig.name;
    document.getElementById('botTag').value = adminState.botConfig.tag;
    document.getElementById('botBgColor').value = adminState.botConfig.bgColor;
    document.getElementById('botBorderColor').value = adminState.botConfig.borderColor;
    document.getElementById('botTextColor').value = adminState.botConfig.textColor;
    document.getElementById('botTagColor').value = adminState.botConfig.tagColor;
    document.getElementById('botNameColor').value = adminState.botConfig.nameColor;
    
    updateBotAvatarPreview();
    updatePreview();
}

// ===== ПОЛЬЗОВАТЕЛИ =====
function renderUsers() {
    const container = document.getElementById('adminUsersList');
    
    // Собираем уникальных пользователей
    const userMap = {};
    adminState.messages.forEach(msg => {
        if (!msg.username || msg.username === 'system') return;
        if (!userMap[msg.username]) {
            userMap[msg.username] = {
                name: msg.name,
                username: msg.username,
                badge: msg.badge || '',
                messageCount: 0,
                lastSeen: msg.time,
            };
        }
        userMap[msg.username].messageCount++;
        if (msg.time > userMap[msg.username].lastSeen) {
            userMap[msg.username].lastSeen = msg.time;
        }
    });
    
    const users = Object.values(userMap);
    
    if (users.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No users</p>';
        return;
    }
    
    container.innerHTML = users.map(u => `
        <div class="admin-user-item">
            <div class="user-info">
                <div class="user-name">${esc(u.name)}</div>
                <div class="user-username">@${esc(u.username)} - ${u.messageCount} msgs</div>
            </div>
            ${u.badge ? `<span class="user-badge ${u.badge}">${u.badge}</span>` : ''}
            <div class="user-actions">
                <button class="user-action-btn" onclick="setUserBadge('${esc(u.username)}','vip')">VIP</button>
                <button class="user-action-btn" onclick="setUserBadge('${esc(u.username)}','moderator')">Mod</button>
                <button class="user-action-btn" onclick="setUserBadge('${esc(u.username)}','')">Clear</button>
            </div>
        </div>
    `).join('');
}

function setUserBadge(username, badge) {
    adminState.messages.forEach(msg => {
        if (msg.username === username) {
            msg.badge = badge;
        }
    });
    saveData().then(() => {
        loadAllData();
        showAdminToast('Badge updated');
    });
}

// ===== УТИЛИТЫ =====
function showAdminToast(text) {
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.className = 'admin-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2000);
}

function formatFull(ts) {
    return new Date(ts).toLocaleString('ru-RU', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function getColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360},55%,60%)`;
}

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
    loadQuickMessages();
    loadBotConfig();
    console.log('Admin panel loaded');
});
