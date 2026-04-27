// frontend/assets/js/translate.js

const translations = {
    ru: {
        regTitle: 'World Chat',
        regSubtitle: 'Выберите имя и username',
        regNamePlaceholder: 'Имя',
        regUsernamePlaceholder: 'Username',
        regAvatarLabel: 'Аватар (необязательно)',
        regSkipAvatar: 'Пропустить',
        regEnterChat: 'Войти в чат',
        regUsernameTaken: 'Username занят',
        regUsernameAvailable: 'Username доступен',
        
        chatTitle: 'World Chat',
        chatSubtitle: 'Глобальный чат',
        online: '{count} онлайн',
        messagePlaceholder: 'Сообщение...',
        typing: '{name} печатает...',
        pinnedLabel: 'Закреплённое сообщение',
        welcomeMessage: 'Добро пожаловать в World Chat!',
        noMessages: 'Нет сообщений',
        
        edited: 'изменено',
        deleted: 'Это сообщение удалено',
        
        reply: 'Ответить',
        copy: 'Копировать',
        edit: 'Изменить',
        delete: 'Удалить',
        deleteForMe: 'Удалить у себя',
        deleteForAll: 'Удалить у всех',
        report: 'Пожаловаться',
        pin: 'Закрепить',
        unpin: 'Открепить',
        
        menuSettings: 'Настройки',
        menuClearChat: 'Очистить чат',
        menuDeleteMode: 'Удалить сообщения',
        menuExport: 'Экспорт истории',
        
        settingsTitle: 'Настройки',
        settingsFontSize: 'Размер шрифта',
        settingsFontSmall: 'Маленький',
        settingsFontMedium: 'Средний',
        settingsFontLarge: 'Большой',
        settingsTheme: 'Тема',
        settingsThemeDark: 'Тёмная',
        settingsThemeLight: 'Светлая',
        settingsLanguage: 'Язык',
        settingsLanguageRu: 'Русский',
        settingsLanguageEn: 'English',
        settingsChangeName: 'Изменить имя',
        settingsChangeUsername: 'Изменить username (требуется верификация)',
        settingsChangeAvatar: 'Изменить аватар',
        settingsReportProblem: 'Сообщить о проблеме',
        settingsExport: 'Экспорт истории',
        settingsBack: 'Назад',
        settingsNotifications: 'Уведомления',
        
        confirmClearChat: 'Вы уверены что хотите очистить чат?',
        confirmDelete: 'Вы уверены что хотите удалить {count} сообщений?',
        confirmLinkTitle: 'Внешняя ссылка',
        confirmLinkText: 'Вы уверены что хотите перейти по ссылке?',
        openLink: 'Перейти',
        cancel: 'Отмена',
        confirm: 'Подтвердить',
        
        reportTitle: 'Пожаловаться на сообщение',
        reportReason: 'Причина жалобы...',
        sendReport: 'Отправить жалобу',
        reportSubmitted: 'Жалоба отправлена',
        
        problemTitle: 'Сообщить о проблеме',
        problemDescription: 'Опишите проблему подробно',
        problemSent: 'Сообщение о проблеме отправлено',
        
        profileTitle: 'Профиль',
        profileName: 'Имя',
        profileUsername: 'Username',
        profileVerified: 'Верифицирован',
        profileNotVerified: 'Не верифицирован',
        profileReport: 'Пожаловаться',
        
        photo: 'Фото',
        video: 'Видео',
        file: 'Файл',
        camera: 'Камера',
        poll: 'Опрос',
        quiz: 'Викторина',
        
        pollQuestion: 'Вопрос',
        pollOptions: 'Варианты ответа',
        pollAddOption: 'Добавить вариант',
        pollAnonymous: 'Анонимный опрос',
        pollMultiple: 'Множественный выбор',
        pollCreate: 'Создать опрос',
        quizCorrect: 'Правильный ответ',
        quizExplanation: 'Пояснение',
        
        voiceRecord: 'Удерживайте для записи',
        voiceRelease: 'Отпустите для отправки',
        voiceCancel: 'Отмена',
        
        verifyTitle: 'Верификация',
        verifyText: 'Откройте бота @{bot} и отправьте код: {code}',
        verifyComplete: 'Верификация завершена',
        
        searchPlaceholder: 'Поиск по сообщениям...',
        searchNoResults: 'Ничего не найдено',
        
        exportTitle: 'Экспорт истории',
        exportJson: 'JSON',
        exportTxt: 'TXT',
        
        errorRegisterFirst: 'Сначала зарегистрируйтесь',
        errorRateLimit: 'Превышен лимит: 10 сообщений в минуту',
        errorUsernameTaken: 'Username занят',
        errorCannotEdit: 'Нельзя изменить это сообщение',
        errorAdminOnly: 'Только для админа',
        errorFileTooBig: 'Файл слишком большой (макс 10MB)',
        
        connectionOnline: 'Онлайн',
        connectionReconnecting: 'Переподключение...',
        userJoined: '{name} присоединился к чату',
    },
    
    en: {
        regTitle: 'World Chat',
        regSubtitle: 'Choose your name and username',
        regNamePlaceholder: 'Name',
        regUsernamePlaceholder: 'Username',
        regAvatarLabel: 'Avatar (optional)',
        regSkipAvatar: 'Skip',
        regEnterChat: 'Enter Chat',
        regUsernameTaken: 'Username taken',
        regUsernameAvailable: 'Username available',
        
        chatTitle: 'World Chat',
        chatSubtitle: 'Global conversation',
        online: '{count} online',
        messagePlaceholder: 'Message...',
        typing: '{name} is typing...',
        pinnedLabel: 'Pinned message',
        welcomeMessage: 'Welcome to World Chat!',
        noMessages: 'No messages',
        
        edited: 'edited',
        deleted: 'This message was deleted',
        
        reply: 'Reply',
        copy: 'Copy',
        edit: 'Edit',
        delete: 'Delete',
        deleteForMe: 'Delete for me',
        deleteForAll: 'Delete for everyone',
        report: 'Report',
        pin: 'Pin',
        unpin: 'Unpin',
        
        menuSettings: 'Settings',
        menuClearChat: 'Clear Chat',
        menuDeleteMode: 'Delete Messages',
        menuExport: 'Export History',
        
        settingsTitle: 'Settings',
        settingsFontSize: 'Font Size',
        settingsFontSmall: 'Small',
        settingsFontMedium: 'Medium',
        settingsFontLarge: 'Large',
        settingsTheme: 'Theme',
        settingsThemeDark: 'Dark',
        settingsThemeLight: 'Light',
        settingsLanguage: 'Language',
        settingsLanguageRu: 'Русский',
        settingsLanguageEn: 'English',
        settingsChangeName: 'Change Name',
        settingsChangeUsername: 'Change Username (requires verification)',
        settingsChangeAvatar: 'Change Avatar',
        settingsReportProblem: 'Report a Problem',
        settingsExport: 'Export History',
        settingsBack: 'Back',
        settingsNotifications: 'Notifications',
        
        confirmClearChat: 'Are you sure you want to clear the chat?',
        confirmDelete: 'Are you sure you want to delete {count} messages?',
        confirmLinkTitle: 'External Link',
        confirmLinkText: 'Are you sure you want to open this link?',
        openLink: 'Open',
        cancel: 'Cancel',
        confirm: 'Confirm',
        
        reportTitle: 'Report Message',
        reportReason: 'Reason for report...',
        sendReport: 'Send Report',
        reportSubmitted: 'Report submitted',
        
        problemTitle: 'Report a Problem',
        problemDescription: 'Describe the problem in detail',
        problemSent: 'Problem report sent',
        
        profileTitle: 'Profile',
        profileName: 'Name',
        profileUsername: 'Username',
        profileVerified: 'Verified',
        profileNotVerified: 'Not verified',
        profileReport: 'Report',
        
        photo: 'Photo',
        video: 'Video',
        file: 'File',
        camera: 'Camera',
        poll: 'Poll',
        quiz: 'Quiz',
        
        pollQuestion: 'Question',
        pollOptions: 'Options',
        pollAddOption: 'Add option',
        pollAnonymous: 'Anonymous poll',
        pollMultiple: 'Multiple choice',
        pollCreate: 'Create Poll',
        quizCorrect: 'Correct answer',
        quizExplanation: 'Explanation',
        
        voiceRecord: 'Hold to record',
        voiceRelease: 'Release to send',
        voiceCancel: 'Cancel',
        
        verifyTitle: 'Verification',
        verifyText: 'Open bot @{bot} and send code: {code}',
        verifyComplete: 'Verification complete',
        
        searchPlaceholder: 'Search messages...',
        searchNoResults: 'No results found',
        
        exportTitle: 'Export History',
        exportJson: 'JSON',
        exportTxt: 'TXT',
        
        errorRegisterFirst: 'Register first',
        errorRateLimit: 'Rate limit: 10 messages per minute',
        errorUsernameTaken: 'Username already taken',
        errorCannotEdit: 'Cannot edit this message',
        errorAdminOnly: 'Admin only',
        errorFileTooBig: 'File too large (max 10MB)',
        
        connectionOnline: 'Online',
        connectionReconnecting: 'Reconnecting...',
        userJoined: '{name} joined the chat',
    }
};

let currentLang = 'ru';

function t(key, params = {}) {
    const langData = translations[currentLang] || translations['ru'];
    let text = langData[key];
    
    if (!text) {
        text = translations['ru'][key] || key;
    }
    
    Object.keys(params).forEach(param => {
        text = text.replace('{' + param + '}', params[param]);
    });
    
    return text;
}

function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('chat_language', lang);
        updateAllTexts();
    }
}

function updateAllTexts() {
    // Обновляем data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const translated = t(key);
        if (translated && translated !== key) {
            el.textContent = translated;
        }
    });
    
    // Обновляем data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const translated = t(key);
        if (translated && translated !== key) {
            el.placeholder = translated;
        }
    });
    
    // Обновляем приветственное сообщение
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg && chatState && chatState.messages && chatState.messages.length === 0) {
        welcomeMsg.textContent = t('welcomeMessage');
    }
    
    // Обновляем пункты меню
    updateMenuTexts();
}

function updateMenuTexts() {
    const menuItems = {
        'settings': t('menuSettings'),
        'clear-chat': t('menuClearChat'),
        'delete-mode': t('menuDeleteMode'),
        'export': t('menuExport'),
    };
    
    document.querySelectorAll('#menuDropdown .dropdown-item').forEach(item => {
        const action = item.dataset.action;
        if (menuItems[action]) {
            // Сохраняем иконку если есть
            const icon = item.textContent.trim().charAt(0);
            if (icon === '⚙' || icon === '🗑' || icon === '❌' || icon === '📥') {
                item.textContent = icon + ' ' + menuItems[action];
            } else {
                item.textContent = menuItems[action];
            }
        }
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('chat_language');
    if (savedLang && translations[savedLang]) {
        currentLang = savedLang;
    }
    updateAllTexts();
});