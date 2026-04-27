// frontend/assets/js/main.js

// Главный файл - точка входа
(function() {
    'use strict';

    // ===== КОНФИГУРАЦИЯ =====
    const CONFIG = {
        API_URL: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : 'https://world-chat-backend-production.up.railway.app',
        WS_URL: window.location.hostname === 'localhost'
            ? 'ws://localhost:3000'
            : 'wss://world-chat-backend-production.up.railway.app',
        BOT_USERNAME: 'herrmeesagentbot',
        ADMIN_PASS: 'admin2011',
        MAX_MESSAGE_LENGTH: 500,
        MAX_USERNAME_LENGTH: 15,
        MAX_NAME_LENGTH: 20,
        RATE_LIMIT: 10,
        RATE_LIMIT_WINDOW: 60000,
    };

    // Делаем конфиг глобально доступным
    window.CONFIG = CONFIG;
    window.API_URL = CONFIG.API_URL;
    window.WS_URL = CONFIG.WS_URL;

    // ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ =====
    function init() {
        console.log('World Chat initializing...');
        
        // Проверяем, зарегистрирован ли пользователь
        const savedUser = loadUserFromStorage();
        
        if (savedUser && savedUser.name && savedUser.username) {
            // Пользователь уже зарегистрирован - показываем чат
            showChat();
            
            // Восстанавливаем настройки
            restoreSettings();
            
            // Отправляем регистрацию на сервер для восстановления сессии
            setTimeout(() => {
                registerUser(savedUser.name, savedUser.username);
            }, 1000);
        } else {
            // Новый пользователь - показываем регистрацию
            showRegistration();
        }
        
        // Инициализируем обработчики регистрации
        initRegistration();
        
        // Запрашиваем разрешение на уведомления
        requestNotificationPermission();
        
        // Обработчик видимости страницы
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Предотвращаем zoom на мобильных
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        
        console.log('World Chat initialized');
    }

    // ===== РЕГИСТРАЦИЯ =====
    function showRegistration() {
        document.getElementById('registration').style.display = 'flex';
        document.getElementById('chatContainer').style.display = 'none';
    }

    function showChat() {
        document.getElementById('registration').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        
        // Показываем приветствие
        const welcomeMsg = document.getElementById('welcomeMsg');
        if (welcomeMsg && chatState.messages.length === 0) {
            welcomeMsg.textContent = t('welcomeMessage');
        }
    }

    function initRegistration() {
        const nameInput = document.getElementById('regName');
        const usernameInput = document.getElementById('regUsername');
        const regBtn = document.getElementById('regBtn');
        const usernameStatus = document.getElementById('usernameStatus');
        const avatarInput = document.getElementById('regAvatar');
        const skipAvatar = document.getElementById('skipAvatar');
        const avatarGroup = document.getElementById('avatarGroup');

        // Placeholder'ы
        nameInput.placeholder = t('regNamePlaceholder');
        usernameInput.placeholder = t('regUsernamePlaceholder');

        // Валидация имени
        function validateName() {
            const name = nameInput.value.trim();
            return name.length >= 1 && name.length <= CONFIG.MAX_NAME_LENGTH;
        }

        // Валидация username
        function validateUsername() {
            const username = usernameInput.value.trim();
            if (username.length < 3) return false;
            if (username.length > CONFIG.MAX_USERNAME_LENGTH) return false;
            if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
            return true;
        }

        // Проверка доступности username
        const checkUsernameDebounced = debounce(() => {
            const username = usernameInput.value.trim();
            if (!validateUsername()) {
                usernameStatus.textContent = '';
                usernameStatus.className = '';
                updateRegButton();
                return;
            }

            // Проверяем через сервер
            fetch(CONFIG.API_URL + '/api/check-username/' + username)
                .then(res => res.json())
                .then(data => {
                    if (data.available) {
                        usernameStatus.textContent = t('regUsernameAvailable');
                        usernameStatus.className = 'success';
                    } else {
                        usernameStatus.textContent = t('regUsernameTaken');
                        usernameStatus.className = 'error';
                    }
                    updateRegButton();
                })
                .catch(() => {
                    usernameStatus.textContent = '';
                    usernameStatus.className = '';
                    updateRegButton();
                });
        }, 500);

        // Обновление кнопки
        function updateRegButton() {
            const nameValid = validateName();
            const usernameValid = validateUsername();
            const usernameAvailable = usernameStatus.className === 'success' || usernameStatus.textContent === '';
            
            regBtn.disabled = !(nameValid && usernameValid && usernameAvailable);
        }

        // Обработчики
        nameInput.addEventListener('input', () => {
            updateRegButton();
            if (validateName() && validateUsername()) {
                avatarGroup.style.display = 'block';
            }
        });

        usernameInput.addEventListener('input', () => {
            checkUsernameDebounced();
        });

        // Аватар
        let avatarData = null;
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showError('File too large (max 5MB)');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    avatarData = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        skipAvatar.addEventListener('click', () => {
            avatarData = null;
            completeRegistration();
        });

        // Кнопка регистрации
        regBtn.addEventListener('click', () => {
            if (validateName() && validateUsername()) {
                completeRegistration();
            }
        });

        // Enter
        usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !regBtn.disabled) {
                completeRegistration();
            }
        });

        // Завершение регистрации
        function completeRegistration() {
            const name = nameInput.value.trim();
            const username = usernameInput.value.trim();

            if (!name || !username) return;

            // Сохраняем пользователя
            currentUser = {
                id: wsUserId || generateId(),
                name: name,
                username: username,
                avatar: avatarData || '',
                verified: false,
                badge: '',
            };

            saveUserToStorage(currentUser);

            // Отправляем на сервер
            registerUser(name, username);

            // Показываем чат
            showChat();
            
            // Отправляем аватар если есть
            if (avatarData) {
                setTimeout(() => updateProfile(name, avatarData), 500);
            }

            showSuccess('Welcome, ' + name + '!');
        }
    }

    // ===== НАСТРОЙКИ =====
    function restoreSettings() {
        const theme = localStorage.getItem('chat_theme') || 'dark';
        const fontSize = localStorage.getItem('chat_fontSize') || 'medium';
        const language = localStorage.getItem('chat_language') || 'ru';

        applyTheme(theme);
        applyFontSize(fontSize);
        setLanguage(language);
    }

    // ===== ОБРАБОТЧИК ВИДИМОСТИ =====
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // Страница стала видимой - сбрасываем счетчик непрочитанных
            chatState.unreadCount = 0;
            updateScrollButton();
            
            // Обновляем заголовок
            document.title = 'World Chat';
        }
    }

    // ===== ОБРАБОТКА ОШИБОК =====
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
    });

    // ===== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ =====
    // Делаем функции доступными для onclick из HTML
    window.showUserProfile = showUserProfile;
    window.openMediaViewer = openMediaViewer;
    window.closeMediaViewer = closeMediaViewer;
    window.downloadMedia = downloadMedia;
    window.toggleVoicePlay = toggleVoicePlay;
    window.votePoll = votePoll;
    window.toggleDeleteMode = toggleDeleteMode;
    window.cancelReply = cancelReply;
    window.handleLinkClick = handleLinkClick;
    window.showDeleteConfirmation = showDeleteConfirmation;
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
    window.startVerification = startVerification;
    window.exportHistory = exportHistory;
    window.openProblemReport = openProblemReport;

    // ===== ЗАПУСК =====
    document.addEventListener('DOMContentLoaded', init);

    console.log('main.js loaded');
})();
