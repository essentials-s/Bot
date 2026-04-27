// frontend/assets/js/main.js

(function() {
    'use strict';

    // Инициализация EmailJS
    (function() {
        emailjs.init('eK_3lZjCFvgkwvuUZ'); // Замени на свой public key из EmailJS
    })();

    const CONFIG = {
        EMAILJS_SERVICE_ID: 'service_5sjv2tl', // Замени
        EMAILJS_TEMPLATE_ID: 'template_4cs7weu', // Замени
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
        sendCodeBtn.addEventListener('click', function() {
            var email = emailInput.value.trim();
            if (!email || !email.includes('@') || !email.includes('.')) {
                emailStatus.textContent = 'Enter valid email';
                emailStatus.style.color = 'var(--danger)';
                return;
            }

            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = 'Sending...';
            emailStatus.textContent = 'Sending code...';
            emailStatus.style.color = 'var(--text-secondary)';

            // Генерируем 6-значный код
            regState.generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            regState.email = email;

            // Отправляем через EmailJS
            var templateParams = {
                to_email: email,
                to_name: nameInput.value || 'User',
                code: regState.generatedCode,
                from_name: 'World Chat'
            };

            emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, templateParams)
                .then(function() {
                    emailStatus.textContent = 'Code sent to ' + email;
                    emailStatus.style.color = 'var(--success)';
                    regState.codeSent = true;
                    codeGroup.style.display = 'block';
                    codeInput.focus();
                    sendCodeBtn.textContent = 'Resend';
                    sendCodeBtn.disabled = false;
                    updateRegButton();
                })
                .catch(function(error) {
                    console.error('EmailJS error:', error);
                    emailStatus.textContent = 'Failed to send. Try again.';
                    emailStatus.style.color = 'var(--danger)';
                    sendCodeBtn.textContent = 'Send Code';
                    sendCodeBtn.disabled = false;
                    regState.codeSent = false;
                });
        });

        // Проверка кода
        verifyCodeBtn.addEventListener('click', function() {
            var code = codeInput.value.trim();
            if (code.length !== 6) {
                codeStatus.textContent = 'Enter 6-digit code';
                codeStatus.style.color = 'var(--danger)';
                return;
            }

            if (code === regState.generatedCode) {
                regState.emailVerified = true;
                codeStatus.textContent = 'Verified!';
                codeStatus.style.color = 'var(--success)';
                codeInput.disabled = true;
                verifyCodeBtn.disabled = true;
                codeInput.style.borderColor = 'var(--success)';
                updateRegButton();
            } else {
                codeStatus.textContent = 'Wrong code';
                codeStatus.style.color = 'var(--danger)';
                regState.emailVerified = false;
                codeInput.value = '';
                codeInput.focus();
            }
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
            showSuccess('Welcome, ' + user.name + '!');
        });

        // Enter на поле кода
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

    document.addEventListener('DOMContentLoaded', init);
})();