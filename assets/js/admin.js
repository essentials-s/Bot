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

    // Загрузка конфига
    function loadBotConfig() {
        var saved = localStorage.getItem('admin_bot_config');
        if (saved) {
            try { botConfig = JSON.parse(saved); } catch(e) {}
        }
        var botName = document.getElementById('botName');
        var botTag = document.getElementById('botTag');
        var botBgColor = document.getElementById('botBgColor');
        var botTextColor = document.getElementById('botTextColor');
        var botNameColor = document.getElementById('botNameColor');
        if (botName) botName.value = botConfig.name;
        if (botTag) botTag.value = botConfig.tag;
        if (botBgColor) botBgColor.value = botConfig.bgColor;
        if (botTextColor) botTextColor.value = botConfig.textColor;
        if (botNameColor) botNameColor.value = botConfig.nameColor;
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
        var previewName = document.getElementById('previewName');
        var previewBubble = document.getElementById('previewBubble');
        if (previewName) {
            previewName.textContent = botConfig.name;
            previewName.style.color = botConfig.nameColor;
        }
        if (previewBubble) {
            previewBubble.style.background = botConfig.bgColor;
            previewBubble.style.color = botConfig.textColor;
        }
    }

    // WebSocket
    function connectWS() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
        
        console.log('Admin connecting to WS:', WS_URL);
        
        try {
            ws = new WebSocket(WS_URL);
            
            ws.onopen = function() {
                console.log('Admin WS connected');
                var onlineEl = document.getElementById('adminOnlineCount');
                if (onlineEl) {
                    onlineEl.textContent = 'Connected';
                    onlineEl.style.color = 'var(--success)';
                }
            };
            
            ws.onmessage = function(event) {
                try {
                    var data = JSON.parse(event.data);
                    handleWSMessage(data);
                } catch(e) {
                    console.error('Admin parse error:', e);
                }
            };
            
            ws.onclose = function() {
                console.log('Admin WS disconnected');
                var onlineEl = document.getElementById('adminOnlineCount');
                if (onlineEl) {
                    onlineEl.textContent = 'Reconnecting...';
                    onlineEl.style.color = 'var(--warning)';
                }
                setTimeout(connectWS, 3000);
            };
            
            ws.onerror = function(e) {
                console.error('Admin WS error:', e);
            };
            
        } catch(e) {
            console.error('Admin WS connect error:', e);
            setTimeout(connectWS, 3000);
        }
    }

    function sendWS(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
            console.log('Admin sent:', data.type);
            return true;
        } else {
            console.log('Admin WS not connected');
            showAdminToast('Not connected to server');
            return false;
        }
    }

    function handleWSMessage(data) {
        if (data.type === 'init') {
            messages = data.messages || [];
            console.log('Admin received', messages.length, 'messages');
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
            if (msg) { msg.text = data.text; msg.edited = true; }
            renderAdminChat();
            renderMessages();
        }
        if (data.type === 'online') {
            var onlineEl = document.getElementById('adminOnlineCount');
            if (onlineEl) {
                onlineEl.textContent = data.count + ' online';
                onlineEl.style.color = 'var(--success)';
            }
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
                var errorEl = document.getElementById('adminLoginError');
                if (errorEl) {
                    errorEl.style.display = 'block';
                    setTimeout(function() { errorEl.style.display = 'none'; }, 2000);
                }
            }
        });
        
        document.getElementById('adminPassInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('adminLoginBtn').click();
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
                var target = document.getElementById('tab-' + tabName);
                if (target) target.classList.add('active');
                adminState.activeTab = tabName;
            });
        });
    }

    // Вкладка Chat
    function renderAdminChat() {
        var container = document.getElementById('adminChatMessages');
        if (!container) return;
        
        var visible = messages.filter(function(m) { return !m.deleted; }).slice(-50);
        
        if (visible.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px">No messages yet</div>';
            return;
        }
        
        container.innerHTML = visible.map(function(msg) {
            var isAdmin = msg.badge === 'admin' || msg.username === 'admin' || msg.username === botConfig.tag;
            return '<div class="admin-chat-msg ' + (isAdmin ? 'admin' : 'user') + '">' +
                '<div class="admin-chat-name">' + esc(msg.name || '') + '</div>' +
                '<div>' + esc((msg.text || (msg.fileUrl ? '[media]' : '')).substring(0, 300)) + '</div>' +
                '<div class="admin-chat-time">' + new Date(msg.time).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) + '</div>' +
                '</div>';
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    function sendAsBot() {
        var input = document.getElementById('adminChatInput');
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;

        var msgData = {
            type: 'message',
            name: botConfig.name,
            username: botConfig.tag,
            text: text,
            msgType: 'text',
            replyTo: null
        };

        if (sendWS(msgData)) {
            input.value = '';
            showAdminToast('Sent');
        }
    }

    // Вкладка Messages
    function renderMessages() {
        var container = document.getElementById('adminMessagesList');
        if (!container) return;
        
        var msgs = messages.filter(function(m) { return !m.deleted && !m.system; }).reverse();
        
        if (msgs.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px">No messages</p>';
            return;
        }
        
        container.innerHTML = msgs.map(function(msg) {
            var realIndex = messages.indexOf(msg);
            return '<div class="admin-msg-item">' +
                '<div class="msg-header">' +
                '<span class="msg-user" style="color:' + getColor(msg.name) + '">' + esc(msg.name) + ' (@' + esc(msg.username) + ')</span>' +
                '<span class="msg-time">' + new Date(msg.time).toLocaleString('ru-RU') + '</span>' +
                '</div>' +
                '<div class="msg-text">' + esc((msg.text || (msg.fileUrl ? '[media]' : '')).substring(0, 300)) + '</div>' +
                '<div class="msg-actions-row">' +
                '<button class="msg-action-btn" onclick="openAdminReply(' + realIndex + ')">Reply</button>' +
                '<button class="msg-action-btn danger" onclick="deleteMsgAdmin(' + realIndex + ')">Delete</button>' +
                '</div>' +
                '<div class="admin-reply-box" id="replyBox-' + realIndex + '">' +
                '<div style="display:flex;gap:6px">' +
                '<input type="text" id="replyInput-' + realIndex + '" placeholder="Reply..." style="flex:1;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-light);border-radius:6px;color:var(--text-primary);font-size:12px">' +
                '<button style="padding:6px 10px;background:var(--accent);border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:11px" onclick="sendAdminReply(' + realIndex + ')">Send</button>' +
                '<button style="padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-light);border-radius:6px;color:var(--text-secondary);cursor:pointer;font-size:11px" onclick="closeAdminReply(' + realIndex + ')">X</button>' +
                '</div>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    window.openAdminReply = function(index) {
        document.querySelectorAll('.admin-reply-box').forEach(function(b) { b.classList.remove('active'); });
        var box = document.getElementById('replyBox-' + index);
        if (box) {
            box.classList.add('active');
            var input = document.getElementById('replyInput-' + index);
            if (input) input.focus();
        }
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
        
        var msgData = {
            type: 'message',
            name: botConfig.name,
            username: botConfig.tag,
            text: text,
            msgType: 'text',
            replyTo: originalMsg ? originalMsg.id : null
        };

        if (sendWS(msgData)) {
            input.value = '';
            closeAdminReply(index);
            showAdminToast('Reply sent');
        }
    };

    window.deleteMsgAdmin = function(index) {
        if (!confirm('Delete this message permanently?')) return;
        var msg = messages[index];
        if (msg) {
            sendWS({ type: 'admin_action', action: 'delete_message', messageId: msg.id });
            msg.deleted = true;
            renderAdminChat();
            renderMessages();
            showAdminToast('Message deleted');
        }
    };

    // Вкладка Users
    function renderUsers() {
        var container = document.getElementById('adminUsersList');
        if (!container) return;
        
        if (!users || users.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px">No users online</p>';
            return;
        }
        
        container.innerHTML = users.map(function(u) {
            return '<div class="admin-user-item">' +
                '<div class="user-info">' +
                '<div class="user-name">' + esc(u.name || '') + ' ' + (u.verified ? '&#10003;' : '') + '</div>' +
                '<div class="user-username">@' + esc(u.username || '') + (u.online ? ' <span style="color:var(--success)">online</span>' : '') + '</div>' +
                '</div>' +
                (u.badge ? '<span class="user-badge ' + u.badge + '" style="padding:3px 8px;border-radius:10px;font-size:10px;font-weight:600;background:' + (u.badge==='admin'?'var(--accent)':'var(--warning)') + ';color:' + (u.badge==='admin'?'#fff':'#000') + '">' + esc(u.badge) + '</span>' : '') +
                '</div>';
        }).join('');
    }

    // Быстрые сообщения
    function loadQuickMessages() {
        var saved = localStorage.getItem('admin_quick_messages');
        if (saved) {
            try { quickMessages = JSON.parse(saved); } catch(e) { quickMessages = []; }
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
                '<button class="quick-msg-delete" data-id="' + qm.id + '">&#10005;</button>' +
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
        var sendBtn = document.getElementById('adminChatSend');
        var chatInput = document.getElementById('adminChatInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', sendAsBot);
        }
        if (chatInput) {
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendAsBot();
                }
            });
        }

        // Применить цвета
        var applyBtn = document.getElementById('applyColors');
        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                saveBotConfig();
                updatePreview();
                showAdminToast('Colors applied');
            });
        }

        // Быстрые сообщения
        var addBtn = document.getElementById('addQuickMsgBtn');
        var cancelBtn = document.getElementById('cancelQuickMsg');
        var saveQMbtn = document.getElementById('saveQuickMsg');
        
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                var form = document.getElementById('addQuickMsgForm');
                if (form) form.style.display = 'block';
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                var form = document.getElementById('addQuickMsgForm');
                if (form) form.style.display = 'none';
            });
        }
        if (saveQMbtn) {
            saveQMbtn.addEventListener('click', function() {
                var input = document.getElementById('quickMsgInput');
                if (!input) return;
                var text = input.value.trim();
                if (!text) return;
                quickMessages.push({ id: 'qm_' + Date.now(), text: text });
                saveQuickMessages();
                renderQuickMessages();
                var form = document.getElementById('addQuickMsgForm');
                if (form) form.style.display = 'none';
                input.value = '';
            });
        }

        // Удаление быстрых сообщений через делегирование
        var qmList = document.getElementById('quickMessagesList');
        if (qmList) {
            qmList.addEventListener('click', function(e) {
                if (e.target.classList.contains('quick-msg-delete')) {
                    var id = e.target.dataset.id;
                    quickMessages = quickMessages.filter(function(q) { return q.id !== id; });
                    saveQuickMessages();
                    renderQuickMessages();
                }
            });
        }

        // Выход
        var logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                sessionStorage.removeItem('admin_logged');
                location.reload();
            });
        }

        // Live preview
        var liveInputs = ['botName', 'botTag', 'botBgColor', 'botTextColor', 'botNameColor'];
        liveInputs.forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', function() {
                if (id === 'botName') botConfig.name = this.value;
                if (id === 'botTag') botConfig.tag = this.value;
                if (id === 'botBgColor') botConfig.bgColor = this.value;
                if (id === 'botTextColor') botConfig.textColor = this.value;
                if (id === 'botNameColor') botConfig.nameColor = this.value;
                updatePreview();
            });
        });

        console.log('Admin panel initialized');
    }

    document.addEventListener('DOMContentLoaded', init);
})();