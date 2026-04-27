// frontend/assets/js/main.js

(function() {
    'use strict';

    // Инициализация EmailJS
    (function() {
        emailjs.init('eK_3lZjCFvgkwvuUZ');
    })();

    const CONFIG = {
        EMAILJS_SERVICE_ID: 'service_5sjv2tl',
        EMAILJS_TEMPLATE_ID: 'template_4cs7weu',
        SENDER_EMAIL: 'erdium@internet.ru',
        MAX_NAME_LENGTH: 20,
        MAX_USERNAME_LENGTH: 15,
    };

    window.CONFIG = CONFIG;

    // Состояние регистрации
    const regState = {
        name: '',
        username: '',
        email: '',
        code: '',
        generatedCode: '',
        emailVerified: false,
        codeSent: false,
    };

    function init() {
        const savedUser = loadUserFromStorage();
        
        if (savedUser && savedUser.name && savedUser.username && savedUser.emailVerified) {
            showChat();
            enableMessageInput();
            setTimeout(function() {
                registerUser(savedUser.name, savedUser.username);
            }, 1000);
        } else {
            showRegistration();
        }
        
        initRegistration();
        requestNotificationPermission();
    }

    function showRegistration() {
        document.getElementById('registration').style.display = 'flex';
        document.getElementById('chatContainer').style.display = 'none';
    }

    function showChat() {
        document.getElementById('registration').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
    }

    function enableMessageInput() {
        var input = document.getElementById('msgInput');
        if (input) {
            input.disabled = false;
            input.placeholder = 'Message...';
        }
    }

    function initRegistration() {
        var nameInput = document.getElementById('regName');
        var usernameInput = document.getElementById('regUsername');
        var emailInput = document.getElementById('regEmail');
        var codeInput = document.getElementById('regCode');
        var regBtn = document.getElementById('regBtn');
        var sendCodeBtn = document.getElementById('sendCodeBtn');
        var verifyCodeBtn = document.getElementById('verifyCodeBtn');
        var usernameStatus = document.getElementById('usernameStatus');
        var emailStatus = document.getElementById('emailStatus');
        var codeStatus = document.getElementById('codeStatus');
        var codeGroup = document.getElementById('codeGroup');

        // Стилизуем кнопку Send Code
        sendCodeBtn.style.background = '#3b82f6';
        sendCodeBtn.style.color = '#fff';
        sendCodeBtn.style.border = 'none';
        sendCodeBtn.style.fontWeight = '600';

        // Проверка username
        var checkUsernameDebounced = debounce(function() {
            var username = usernameInput.value.trim();
            if (username.length < 3) {
                usernameStatus.textContent = '';
                usernameStatus.className = '';
                updateRegButton();
                return;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                usernameStatus.textContent = 'Invalid characters';
                usernameStatus.className = 'error';
                updateRegButton();
                return;
            }
            
            fetch(API_URL + '/api/check-username/' + username)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.available) {
                        usernameStatus.textContent = 'Available';
                        usernameStatus.className = 'success';
                    } else {
                        usernameStatus.textContent = 'Taken';
                        usernameStatus.className = 'error';
                    }
                    updateRegButton();
                })
                .catch(function() {
                    usernameStatus.textContent = '';
                    updateRegButton();
                });
        }, 500);

        usernameInput.addEventListener('input', checkUsernameDebounced);

        // Отправка кода на email
        // В функции initRegistration(), замени sendCodeBtn.addEventListener:

sendCodeBtn.addEventListener('click', function() {
    var email = emailInput.value.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
        emailStatus.textContent = 'Enter valid email';
        emailStatus.style.color = 'var(--danger)';
        showSendNotification('error', 'Invalid Email', 'Please enter a valid email address');
        return;
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.classList.add('sending');
    sendCodeBtn.innerHTML = '<span class="spinner"></span> Sending...';
    
    regState.generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    regState.email = email;

    fetch(API_URL + '/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, code: regState.generatedCode })
    }).catch(function() {});

    var templateParams = {
        email: email,
        to_name: nameInput.value || 'User',
        code: regState.generatedCode,
        from_name: 'World Chat',
        subject: 'World Chat - Verification Code'
    };

    emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, templateParams)
        .then(function() {
            emailStatus.textContent = 'Code sent to ' + email;
            emailStatus.style.color = 'var(--success)';
            regState.codeSent = true;
            codeGroup.style.display = 'block';
            codeInput.focus();
            sendCodeBtn.innerHTML = 'Resend';
            sendCodeBtn.disabled = false;
            sendCodeBtn.classList.remove('sending');
            updateRegButton();
            showSendNotification('success', 'Code Sent!', 'Check your email: ' + email);
        })
        .catch(function(error) {
    emailStatus.textContent = 'Error: ' + (error.message || error.status || 'Unknown');
    emailStatus.style.color = 'var(--danger)';
            emailStatus.textContent = 'Failed to send. Try again.';
            emailStatus.style.color = 'var(--danger)';
            sendCodeBtn.innerHTML = 'Send Code';
            sendCodeBtn.disabled = false;
            sendCodeBtn.classList.remove('sending');
            regState.codeSent = false;
            showSendNotification('error', 'Failed', 'Could not send code. Try again.');
        });
});

// Добавь функцию показа уведомления:
function showSendNotification(type, title, message) {
    // Убираем старое
    var old = document.querySelector('.send-notification');
    if (old) old.remove();
    
    var notif = document.createElement('div');
    notif.className = 'send-notification ' + type;
    notif.innerHTML = '<div class="icon">' + (type === 'success' ? '&#10003;' : '&#10007;') + '</div><div class="text"><strong>' + title + '</strong><br><span style="font-size:12px;color:var(--text-secondary)">' + message + '</span></div>';
    document.body.appendChild(notif);
    
    setTimeout(function() {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(function() { notif.remove(); }, 300);
    }, 2500);
}

        // Проверка кода
        verifyCodeBtn.addEventListener('click', function() {
            var code = codeInput.value.trim();
            if (code.length !== 6) {
                codeStatus.textContent = 'Enter 6-digit code';
                codeStatus.style.color = 'var(--danger)';
                showToast('Enter 6-digit code', 'error');
                return;
            }

            // Проверяем через сервер
            fetch(API_URL + '/api/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: regState.email, code: code })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success || data.verified) {
                    regState.emailVerified = true;
                    codeStatus.textContent = 'Verified!';
                    codeStatus.style.color = 'var(--success)';
                    codeInput.disabled = true;
                    verifyCodeBtn.disabled = true;
                    codeInput.style.borderColor = 'var(--success)';
                    updateRegButton();
                    showToast('Email verified!', 'success');
                } else {
                    codeStatus.textContent = data.error || 'Wrong code';
                    codeStatus.style.color = 'var(--danger)';
                    regState.emailVerified = false;
                    codeInput.value = '';
                    codeInput.focus();
                    showToast('Wrong code', 'error');
                }
            })
            .catch(function() {
                // Если сервер недоступен, проверяем локально
                if (code === regState.generatedCode) {
                    regState.emailVerified = true;
                    codeStatus.textContent = 'Verified!';
                    codeStatus.style.color = 'var(--success)';
                    codeInput.disabled = true;
                    verifyCodeBtn.disabled = true;
                    updateRegButton();
                    showToast('Email verified!', 'success');
                } else {
                    codeStatus.textContent = 'Wrong code';
                    codeStatus.style.color = 'var(--danger)';
                    codeInput.value = '';
                    codeInput.focus();
                    showToast('Wrong code', 'error');
                }
            });
        });

        // Ввод кода
        codeInput.addEventListener('input', function() {
            codeInput.value = codeInput.value.replace(/[^0-9]/g, '');
            if (codeInput.value.length === 6) {
                verifyCodeBtn.click();
            }
        });

        // Обновление кнопки регистрации
        function updateRegButton() {
            var nameValid = nameInput.value.trim().length >= 1;
            var usernameValid = usernameStatus.className === 'success';
            var emailValid = regState.emailVerified;
            
            regBtn.disabled = !(nameValid && usernameValid && emailValid);
            
            if (!nameValid) regBtn.textContent = 'Enter name';
            else if (!usernameValid) regBtn.textContent = 'Username not available';
            else if (!emailValid) regBtn.textContent = 'Verify email first';
            else regBtn.textContent = 'Enter Chat';
        }

        nameInput.addEventListener('input', function() {
            regState.name = nameInput.value.trim();
            updateRegButton();
        });

        // Кнопка входа
        regBtn.addEventListener('click', function() {
            if (regBtn.disabled) return;
            
            var user = {
                id: wsUserId || generateId(),
                name: nameInput.value.trim(),
                username: usernameInput.value.trim(),
                email: regState.email,
                emailVerified: true,
                avatar: '',
                verified: true,
                badge: ''
            };

            currentUser = user;
            saveUserToStorage(user);
            registerUser(user.name, user.username);
            showChat();
            enableMessageInput();
            showToast('Welcome, ' + user.name + '!', 'success');
        });

        // Enter на поле email
        emailInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sendCodeBtn.click();
        });

        updateRegButton();
    }

    // Экспорт
    window.showUserProfile = showUserProfile;
    window.openMediaViewer = openMediaViewer;
    window.closeMediaViewer = closeMediaViewer;
    window.downloadMedia = downloadMedia;
    window.toggleVoicePlay = toggleVoicePlay;
    window.votePoll = votePoll;
    window.cancelReply = cancelReply;
    window.handleLinkClick = handleLinkClick;
    window.openReportModal = openReportModal;
    window.startEditMessage = startEditMessage;
    window.cancelEdit = cancelEdit;
    window.setReply = setReply;
    window.scrollToMessage = scrollToMessage;
    window.copyToClipboard = copyToClipboard;
    window.sendReaction = sendReaction;
    window.openSettings = openSettings;
    window.closeSettings = closeSettings;
    window.changeNamePrompt = changeNamePrompt;
    window.uploadAvatar = uploadAvatar;
    window.exportHistory = exportHistory;
    window.openProblemReport = openProblemReport;
    window.changeNamePrompt = function() {
    var newName = prompt('Enter new name:', currentUser ? currentUser.name : '');
    if (newName && newName.trim()) {
        if (currentUser) {
            currentUser.name = newName.trim();
            saveUserToStorage(currentUser);
            updateProfile(newName.trim());
            showToast('Name changed to ' + newName.trim(), 'success');
        }
    }
};

    window.uploadAvatar = function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                if (currentUser) {
                    currentUser.avatar = ev.target.result;
                    saveUserToStorage(currentUser);
                    updateProfile(currentUser.name, ev.target.result);
                    showToast('Avatar updated', 'success');
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
};

    window.exportHistory = function(format) {
    fetch(API_URL + '/api/export/' + (format || 'json'))
        .then(function(r) { return r.blob(); })
        .then(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'chat_history.' + (format || 'json');
            a.click();
            showToast('History exported', 'success');
        })
        .catch(function() {
            showToast('Export failed', 'error');
        });
};

    window.openProblemReport = function() {
    var reason = prompt('Describe the problem:');
    if (reason && reason.trim()) {
        sendToServer({ type: 'report', reason: reason.trim() });
        showToast('Report sent', 'success');
    }
};
    document.addEventListener('DOMContentLoaded', init);
})();