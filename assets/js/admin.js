// frontend/assets/js/admin.js

(function() {
    'use strict';

    var ADMIN_PASS = 'admin2011';
    var WS_URL = window.WS_URL || 'wss://world-chat-0twp.onrender.com';
    var API_URL = window.API_URL || 'https://world-chat-0twp.onrender.com';

    var ws = null;
    var messages = [];
    var users = [];
    var quickMessages = [];
    var botConfig = {
        name: 'Bot',
        tag: 'bot',
        avatar: '',
        bgColor: '#1e3a5f',
        textColor: '#e2e8f0',
        nameColor: '#93c5fd'
    };

    var adminState = {
        loggedIn: false,
        activeTab: 'chat',
        activeReplyIndex: null
    };

    // Загружаем конфиг
    function loadBotConfig() {
        var saved = localStorage.getItem('admin_bot_config');
        if (saved) {
            try { botConfig = JSON.parse(saved); } catch(e) {}
        }
        document.getElementById('botName').value = botConfig.name;
        document.getElementById('botTag').value = botConfig.tag;
        document.getElementById('botBgColor').value = botConfig.bgColor;
        document.getElementById('botTextColor').value = botConfig.textColor;
        document.getElementById('botNameColor').value = botConfig.nameColor;
        updatePreview();
    }

    function saveBotConfig() {
        botConfig.name = document.getElementById('botName').value || 'Bot';
        botConfig.tag = document.getElementById('botTag').value || 'bot';
        botConfig.bgColor = document.getElementById('botBgColor').value;
        botConfig.textColor = document.getElementById('botTextColor').value;
        botConfig.nameColor = document.getElementById('botNameColor').value;
        localStorage.setItem('admin_bot_config', JSON.stringify(botConfig));
    }

    function updatePreview() {
        document.getElementById('previewName').textContent = botConfig.name;
        document.getElementById('previewName').style.color = botConfig.nameColor;
        document.getElementById('previewBubble').style.background = botConfig.bgColor;
        document.getElementById('previewBubble').style.color = botConfig.textColor;
    }

    // WebSocket
    function connectWS() {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        try {
            ws = new WebSocket(WS_URL);
            ws.onopen = function() {
                console.log('Admin WS connected');
                document.getElementById('adminOnlineCount').textContent = 'Connected';
                document.getElementById('adminOnlineCount').style.color = 'var(--success)';
            };
            ws.onmessage = function(event) {
                try {
                    var data = JSON.parse(event.data);
                    handleWSMessage(data);
                } catch(e) {}
            };
            ws.onclose = function() {
                document.getElementById('adminOnlineCount').textContent = 'Disconnected';
                document.getElementById('adminOnlineCount').style.color = 'var(--danger)';
                setTimeout(connectWS, 3000);
            };
            ws.onerror = function() {
                setTimeout(connectWS, 3000);
            };
        } catch(e) {
            setTimeout(connectWS, 3000);
        }
    }

    function sendWS(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    function handleWSMessage(data) {
        if (data.type === 'init' || data.type === 'history') {
            messages = data.messages || [];
            renderAdminChat();
            renderMessages();
        }
        if (data.type === 'new_message') {
            messages.push(data.message);
            renderAdminChat();
            renderMessages();
        }
        if (data.type === 'message_deleted') {
            var msg = messages.find(function(m) { return m.id === data.messageId; });
            if (msg) msg.deleted = true;
            renderAdminChat();
            renderMessages();
        }
        if (data.type === 'message_edited') {
            var msg = messages.find(function(m) { return m.id === data.messageId; });
            if (msg) { msg.text = data.text;
                msg.edited = true; }
            renderAdminChat();
            renderMessages();
        }
        if (data.type === 'online') {
            document.getElementById('adminOnlineCount').textContent = data.count + ' online';
            document.getElementById('adminOnlineCount').style.color = 'var(--success)';
        }
        if (data.type === 'users') {
            users = data.users || [];
            renderUsers();
        }
    }

    // Вход
    function initLogin() {
        if (sessionStorage.getItem('admin_logged') === 'true') {
            adminState.loggedIn = true;
            showPanel();
            connectWS();
            return;
        }
        document.getElementById('adminLoginBtn').addEventListener('click', function() {
            var pass = document.getElementById('adminPassInput').value;
            if (pass === ADMIN_PASS) {
                adminState.loggedIn = true;
                sessionStorage.setItem('admin_logged', 'true');
                document.getElementById('adminLogin').style.display = 'none';
                showPanel();
                connectWS();
            } else {
                document.getElementById('adminLoginError').style.display = 'block';
                setTimeout(function() {
                    document.getElementById('adminLoginError').style.display = 'none';
                }, 2000);
            }
        });
    }

    function showPanel() {
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
    }

    // Табы
    function initTabs() {
        document.querySelectorAll('.admin-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.admin-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                var tabName = tab.dataset.tab;
                document.querySelectorAll('.admin-tab-content').forEach(function(c) { c.classList.remove('active'); });
                document.getElementById('tab-' + tabName).classList.add('active');
                adminState.activeTab = tabName;
            });
        });
    }

    // Вкладка Chat
    function renderAdminChat() {
        var container = document.getElementById('adminChatMessages');
        if (!container) return;
        var visible = messages.filter(function(m) { return !m.deleted; }).slice(-50);
        container.innerHTML = visible.map(function(msg) {
            var isAdmin = msg.username === 'admin' || msg.username === botConfig.tag || msg.badge === 'admin';
            return '<div class="admin-chat-msg ' + (isAdmin ? 'admin' : 'user') + '">' +
                '<div class="admin-chat-name">' + esc(msg.name || '') + '</div>' +
                '<div>' + esc((msg.text || '[media]').substring(0, 200)) + '</div>' +
                '<div class="admin-chat-time">' + new Date(msg.time).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) + '</div>' +
                '</div>';
        }).join('');
        container.scrollTop = container.scrollHeight;
    }

    function sendAsBot() {
        var input = document.getElementById('adminChatInput');
        var text = input.value.trim();
        if (!text) return;

        sendWS({
            type: 'message',
            text: text,
            name: botConfig.name || 'Bot',
            username: botConfig.tag || 'bot',
            msgType: 'text'
        });

        // Также добавляем локально для мгновенного отображения
        messages.push({
            id: 'bot_' + Date.now(),
            name: botConfig.name || 'Bot',
            username: botConfig.tag || 'bot',
            text: text,
            time: Date.now(),
            edited: false,
            deleted: false,
            type: 'text',
            badge: 'admin'
        });

        input.value = '';
        renderAdminChat();
        renderMessages();
    }

    // Вкладка Messages
    function renderMessages() {
        var container = document.getElementById('adminMessagesList');
        if (!container) return;
        var msgs = messages.filter(function(m) { return !m.deleted && !m.system; }).reverse();
        if (msgs.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No messages</p>';
            return;
        }
        container.innerHTML = msgs.map(function(msg, displayIndex) {
            var realIndex = messages.indexOf(msg);
            return '<div class="admin-msg-item">' +
                '<div class="msg-header">' +
                '<span class="msg-user" style="color:' + getColor(msg.name) + '">' + esc(msg.name) + '</span>' +
                '<span class="msg-time">' + new Date(msg.time).toLocaleString('ru-RU') + '</span>' +
                '</div>' +
                '<div class="msg-text">' + esc((msg.text || '[media]').substring(0, 300)) + '</div>' +
                '<div class="msg-actions-row">' +
                '<button class="msg-action-btn" onclick="openAdminReply(' + realIndex + ')">Reply</button>' +
                '<button class="msg-action-btn danger" onclick="deleteMsgAdmin(' + realIndex + ')">Delete</button>' +
                '</div>' +
                '<div class="admin-reply-box" id="replyBox-' + realIndex + '">' +
                '<input type="text" id="replyInput-' + realIndex + '" placeholder="Reply...">' +
                '<button class="btn-primary" style="width:auto;padding:4px 10px;font-size:11px" onclick="sendAdminReply(' + realIndex + ')">Send</button>' +
                '<button class="btn-secondary" style="width:auto;padding:4px 10px;font-size:11px" onclick="closeAdminReply(' + realIndex + ')">X</button>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    window.openAdminReply = function(index) {
        document.querySelectorAll('.admin-reply-box.active').forEach(function(b) { b.classList.remove('active'); });
        var box = document.getElementById('replyBox-' + index);
        if (box) { box.classList.add('active');
            document.getElementById('replyInput-' + index).focus(); }
        adminState.activeReplyIndex = index;
    };

    window.closeAdminReply = function(index) {
        var box = document.getElementById('replyBox-' + index);
        if (box) box.classList.remove('active');
        adminState.activeReplyIndex = null;
    };

    window.sendAdminReply = function(index) {
        var input = document.getElementById('replyInput-' + index);
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;
        var originalMsg = messages[index];
        sendWS({
            type: 'message',
            text: text,
            name: botConfig.name || 'Bot',
            username: botConfig.tag || 'bot',
            msgType: 'text',
            replyTo: originalMsg ? originalMsg.id : null
        });
        messages.push({
            id: 'bot_' + Date.now(),
            name: botConfig.name || 'Bot',
            username: botConfig.tag || 'bot',
            text: text,
            time: Date.now(),
            replyTo: originalMsg ? originalMsg.id : null,
            edited: false,
            deleted: false,
            type: 'text',
            badge: 'admin'
        });
        input.value = '';
        closeAdminReply(index);
        renderAdminChat();
        renderMessages();
    };

    window.deleteMsgAdmin = function(index) {
        if (!confirm('Delete this message?')) return;
        var msg = messages[index];
        if (msg) {
            sendWS({ type: 'admin_action', action: 'delete_message', messageId: msg.id });
            msg.deleted = true;
            renderAdminChat();
            renderMessages();
        }
    };

    // Вкладка Users
    function renderUsers() {
        var container = document.getElementById('adminUsersList');
        if (!container) return;
        if (!users || users.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No users</p>';
            return;
        }
        container.innerHTML = users.map(function(u) {
            return '<div class="admin-user-item">' +
                '<div class="user-info">' +
                '<div class="user-name">' + esc(u.name || '') + '</div>' +
                '<div class="user-username">@' + esc(u.username || '') + '</div>' +
                '</div>' +
                (u.badge ? '<span class="user-badge">' + esc(u.badge) + '</span>' : '') +
                '</div>';
        }).join('');
    }

    // Быстрые сообщения
    function loadQuickMessages() {
        var saved = localStorage.getItem('admin_quick_messages');
        if (saved) {
            try { quickMessages = JSON.parse(saved); } catch(e) {}
        }
        renderQuickMessages();
    }

    function saveQuickMessages() {
        localStorage.setItem('admin_quick_messages', JSON.stringify(quickMessages));
    }

    function renderQuickMessages() {
        var container = document.getElementById('quickMessagesList');
        if (!container) return;
        if (quickMessages.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No quick messages</p>';
            return;
        }
        container.innerHTML = quickMessages.map(function(qm) {
            return '<div class="quick-msg-item">' +
                '<span class="quick-msg-text">' + esc(qm.text) + '</span>' +
                '<button class="quick-msg-delete" data-id="' + qm.id + '">X</button>' +
                '</div>';
        }).join('');
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

    function showAdminToast(text) {
        var toast = document.getElementById('adminToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminToast';
            toast.className = 'admin-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = text;
        toast.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(function() { toast.classList.remove('show'); }, 2000);
    }

    // Инициализация
    function init() {
        loadBotConfig();
        loadQuickMessages();
        initLogin();
        initTabs();

        // Отправка из вкладки Chat
        document.getElementById('adminChatSend').addEventListener('click', sendAsBot);
        document.getElementById('adminChatInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sendAsBot();
        });

        // Применить цвета
        document.getElementById('applyColors').addEventListener('click', function() {
            saveBotConfig();
            updatePreview();
            showAdminToast('Colors applied');
        });

        // Быстрые сообщения
        document.getElementById('addQuickMsgBtn').addEventListener('click', function() {
            document.getElementById('addQuickMsgForm').style.display = 'block';
        });
        document.getElementById('cancelQuickMsg').addEventListener('click', function() {
            document.getElementById('addQuickMsgForm').style.display = 'none';
        });
        document.getElementById('saveQuickMsg').addEventListener('click', function() {
            var text = document.getElementById('quickMsgInput').value.trim();
            if (!text) return;
            quickMessages.push({ id: 'qm_' + Date.now(), text: text });
            saveQuickMessages();
            renderQuickMessages();
            document.getElementById('addQuickMsgForm').style.display = 'none';
            document.getElementById('quickMsgInput').value = '';
        });

        // Удаление быстрых сообщений
        document.getElementById('quickMessagesList').addEventListener('click', function(e) {
            if (e.target.classList.contains('quick-msg-delete')) {
                var id = e.target.dataset.id;
                quickMessages = quickMessages.filter(function(q) { return q.id !== id; });
                saveQuickMessages();
                renderQuickMessages();
            }
        });

        // Выход
        document.getElementById('adminLogoutBtn').addEventListener('click', function() {
            sessionStorage.removeItem('admin_logged');
            location.reload();
        });

        // Live preview кастомизации
        ['botName', 'botTag', 'botBgColor', 'botTextColor', 'botNameColor'].forEach(function(id) {
            document.getElementById(id).addEventListener('input', function() {
                botConfig[id.replace('bot', '').charAt(0).toLowerCase() + id.replace('bot', '').slice(1)] = this.value;
                if (id === 'botName') botConfig.name = this.value;
                if (id === 'botTag') botConfig.tag = this.value;
                if (id === 'botBgColor') botConfig.bgColor = this.value;
                if (id === 'botTextColor') botConfig.textColor = this.value;
                if (id === 'botNameColor') botConfig.nameColor = this.value;
                updatePreview();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();