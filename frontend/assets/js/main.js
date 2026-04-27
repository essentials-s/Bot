// frontend/assets/js/main.js
(function() {
    'use strict';

    const CONFIG = {
        ADMIN_PASS: 'admin2011',
    };
    window.CONFIG = CONFIG;

    // Ждём полной загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing...');
        initApp();
    });

    function initApp() {
        // Загружаем пользователя
        const savedUser = loadUserFromStorage();
        
        if (savedUser && savedUser.name && savedUser.username) {
            // Пользователь зарегистрирован - показываем чат
            showChat();
            currentUser = savedUser;
            
            // Подключаемся и регистрируем
            setTimeout(function() {
                if (typeof registerUser === 'function') {
                    registerUser(savedUser.name, savedUser.username);
                }
            }, 1500);
        } else {
            // Новый пользователь - показываем регистрацию
            showRegistration();
        }
        
        // Инициализируем регистрацию
        setupRegistration();
        
        // Загружаем настройки
        loadSettings();
    }

    function showRegistration() {
        document.getElementById('registration').style.display = 'flex';
        document.getElementById('chatContainer').style.display = 'none';
    }

    function showChat() {
        document.getElementById('registration').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
    }

    function loadSettings() {
        const theme = localStorage.getItem('chat_theme') || 'dark';
        const fontSize = localStorage.getItem('chat_fontSize') || 'medium';
        const language = localStorage.getItem('chat_language') || 'ru';
        
        if (typeof applyTheme === 'function') applyTheme(theme);
        if (typeof applyFontSize === 'function') applyFontSize(fontSize);
        if (typeof setLanguage === 'function') setLanguage(language);
    }

    function setupRegistration() {
        var nameInput = document.getElementById('regName');
        var usernameInput = document.getElementById('regUsername');
        var regBtn = document.getElementById('regBtn');
        var usernameStatus = document.getElementById('usernameStatus');
        var avatarGroup = document.getElementById('avatarGroup');
        var regAvatarBtn = document.getElementById('regAvatarBtn');
        var regAvatar = document.getElementById('regAvatar');
        var skipAvatar = document.getElementById('skipAvatar');
        var avatarPreviewReg = document.getElementById('avatarPreviewReg');
        var avatarImgReg = document.getElementById('avatarImgReg');

        if (!nameInput || !usernameInput || !regBtn) {
            console.error('Registration elements not found!');
            return;
        }

        var avatarData = null;
        var usernameOk = false;

        // Аватар
        if (regAvatarBtn) {
            regAvatarBtn.addEventListener('click', function() {
                if (regAvatar) regAvatar.click();
            });
        }
        
        if (regAvatar) {
            regAvatar.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        alert('File too large');
                        return;
                    }
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        avatarData = ev.target.result;
                        if (avatarImgReg) {
                            avatarImgReg.src = avatarData;
                        }
                        if (avatarPreviewReg) {
                            avatarPreviewReg.style.display = 'block';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (skipAvatar) {
            skipAvatar.addEventListener('click', function() {
                avatarData = null;
                if (avatarPreviewReg) avatarPreviewReg.style.display = 'none';
                doRegister();
            });
        }

        // Проверка формы
        function checkForm() {
            var name = nameInput.value.trim();
            var username = usernameInput.value.trim();
            var nameValid = name.length >= 1 && name.length <= 20;
            var usernameFormat = username.length >= 3 && username.length <= 15 && /^[a-zA-Z0-9_]+$/.test(username);
            
            if (nameValid && usernameFormat && avatarGroup) {
                avatarGroup.style.display = 'block';
            }
            
            // Кнопка активна только если всё ок и username проверен
            regBtn.disabled = !(nameValid && usernameFormat && usernameOk);
        }

        nameInput.addEventListener('input', checkForm);
        usernameInput.addEventListener('input', function() {
            usernameOk = false;
            checkForm();
            checkUsername();
        });

        // Проверка username
        function checkUsername() {
            var username = usernameInput.value.trim();
            if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
                if (usernameStatus) {
                    usernameStatus.textContent = '';
                    usernameStatus.className = '';
                }
                return;
            }

            var apiUrl = (window.API_URL || '') + '/api/check-username/' + encodeURIComponent(username);
            
            fetch(apiUrl)
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.available) {
                        usernameOk = true;
                        if (usernameStatus) {
                            usernameStatus.textContent = 'Username available';
                            usernameStatus.className = 'success';
                        }
                    } else {
                        usernameOk = false;
                        if (usernameStatus) {
                            usernameStatus.textContent = 'Username taken';
                            usernameStatus.className = 'error';
                        }
                    }
                    checkForm();
                })
                .catch(function() {
                    // Если сервер недоступен - разрешаем
                    usernameOk = true;
                    checkForm();
                });
        }

        // Кнопка регистрации
        regBtn.addEventListener('click', doRegister);
        
        usernameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !regBtn.disabled) {
                doRegister();
            }
        });

        function doRegister() {
            var name = nameInput.value.trim();
            var username = usernameInput.value.trim();

            if (!name || !username) return;

            // Сохраняем
            currentUser = {
                id: 'u_' + Date.now(),
                name: name,
                username: username,
                avatar: avatarData || '',
                verified: false,
                badge: '',
            };

            try {
                localStorage.setItem('chat_user', JSON.stringify(currentUser));
            } catch(e) {}

            // Отправляем на сервер
            if (typeof registerUser === 'function') {
                registerUser(name, username);
            }

            // Показываем чат
            showChat();

            // Аватар
            if (avatarData && typeof updateProfile === 'function') {
                setTimeout(function() {
                    updateProfile(name, avatarData);
                }, 500);
            }

            if (typeof showToast === 'function') {
                showToast('Welcome, ' + name + '!');
            }
        }
    }

    // Глобальные ссылки
    window.showUserProfile = showUserProfile;
    window.openMediaViewer = openMediaViewer;
    window.closeMediaViewer = closeMediaViewer;
    window.toggleVoicePlay = toggleVoicePlay;
    window.votePoll = votePoll;
    window.cancelReply = cancelReply;
    window.handleLinkClick = handleLinkClick;
    window.showDeleteConfirmation = showDeleteConfirmation;
    window.openReportModal = openReportModal;
    window.startEditMessage = startEditMessage;
    window.cancelEdit = cancelEdit;
    window.setReply = setReply;
    window.scrollToMessage = scrollToMessage;
    window.sendReaction = sendReaction;
    window.openSettings = openSettings;
    window.closeSettings = closeSettings;
    window.changeNamePrompt = changeNamePrompt;
    window.uploadAvatar = uploadAvatar;
    window.startVerification = startVerification;
    window.exportHistory = exportHistory;
    window.openProblemReport = openProblemReport;

    console.log('main.js loaded');
})();