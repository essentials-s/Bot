// frontend/assets/js/translate.js

const translations = {
    ru: {
        // Регистрация
        regTitle: 'World Chat',
        regSubtitle: 'Выберите имя и username',
        regNamePlaceholder: 'Имя',
        regUsernamePlaceholder: 'Username',
        regAvatarLabel: 'Аватар (необязательно)',
        regSkipAvatar: 'Пропустить',
        regEnterChat: 'Войти в чат',
        regUsernameTaken: 'Username занят',
        regUsernameAvailable: 'Username доступен',
        
        // Чат
        chatTitle: 'World Chat',
        chatSubtitle: 'Глобальный чат',
        online: '● {count} онлайн',
        messagePlaceholder: 'Сообщение...',
        typing: '{name} печатает...',
        pinnedLabel: 'Закреплённое сообщение',
        welcomeMessage: 'Добро пожаловать в World Chat!',
        noMessages: 'Нет сообщений',
        
        // Сообщения
        edited: 'изменено',
        deleted: 'Это сообщение удалено',
        sent: '✓',
        delivered: '✓✓',
        read: '✓✓',
        
        // Кнопки действий
        reply: 'Ответить',
        copy: 'Копировать',
        edit: 'Изменить',
        delete: 'Удалить',
        deleteForMe: 'Удалить у себя',
        deleteForAll: 'Удалить у всех',
        report: 'Пожаловаться',
        pin: 'Закрепить',
        unpin: 'Открепить',
        
        // Меню
        menuSettings: 'Настройки',
        menuClearChat: 'Очистить чат',
        menuDeleteMode: 'Удалить сообщения',
        menuExport: 'Экспорт истории',
        
        // Настройки
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
        
        // Подтверждения
        confirmClearChat: 'Вы уверены что хотите очистить чат?',
        confirmDelete: 'Вы уверены что хотите удалить {count} сообщений?',
        confirmLinkTitle: 'Внешняя ссылка',
        confirmLinkText: 'Вы уверены что хотите перейти по ссылке?',
        openLink: 'Перейти',
        cancel: 'Отмена',
        confirm: 'Подтвердить',
        
        // Жалоба
        reportTitle: 'Пожаловаться на сообщение',
        reportReason: 'Причина жалобы...',
        sendReport: 'Отправить жалобу',
        reportSubmitted: 'Жалоба отправлена',
        
        // Проблема
        problemTitle: 'Сообщить о проблеме',
        problemDescription: 'Опишите проблему подробно',
        problemSent: 'Сообщение о проблеме отправлено',
        
        // Профиль
        profileTitle: 'Профиль',
        profileName: 'Имя',
        profileUsername: 'Username',
        profileVerified: 'Верифицирован',
        profileNotVerified: 'Не верифицирован',
        profileReport: 'Пожаловаться',
        
        // Медиа
        photo: 'Фото',
        video: 'Видео',
        file: 'Файл',
        camera: 'Камера',
        poll: 'Опрос',
        quiz: 'Викторина',
        
        // Опрос
        pollQuestion: 'Вопрос',
        pollOptions: 'Варианты ответа',
        pollAddOption: 'Добавить вариант',
        pollAnonymous: 'Анонимный опрос',
        pollMultiple: 'Множественный выбор',
        pollCreate: 'Создать опрос',
        quizCorrect: 'Правильный ответ',
        quizExplanation: 'Пояснение',
        
        // Голосовые
        voiceRecord: 'Удерживайте для записи',
        voiceRelease: 'Отпустите для отправки',
        voiceCancel: 'Отмена',
        
        // Верификация
        verifyTitle: 'Верификация',
        verifyText: 'Откройте бота @{bot} и отправьте код: {code}',
        verifyComplete: 'Верификация завершена',
        
        // Поиск
        searchPlaceholder: 'Поиск по сообщениям...',
        searchNoResults: 'Ничего не найдено',
        
        // Экспорт
        exportTitle: 'Экспорт истории',
        exportJson: 'JSON',
        exportTxt: 'TXT',
        
        // Ошибки
        errorRegisterFirst: 'Сначала зарегистрируйтесь',
        errorRateLimit: 'Превышен лимит: 10 сообщений в минуту',
        errorUsernameTaken: 'Username занят',
        errorCannotEdit: 'Нельзя изменить это сообщение',
        errorAdminOnly: 'Только для админа',
        errorFileTooBig: 'Файл слишком большой (макс 10MB)',
    },
    
    en: {
        // Registration
        regTitle: 'World Chat',
        regSubtitle: 'Choose your name and username',
        regNamePlaceholder: 'Name',
        regUsernamePlaceholder: 'Username',
        regAvatarLabel: 'Avatar (optional)',
        regSkipAvatar: 'Skip',
        regEnterChat: 'Enter Chat',
        regUsernameTaken: 'Username taken',
        regUsernameAvailable: 'Username available',
        
        // Chat
        chatTitle: 'World Chat',
        chatSubtitle: 'Global conversation',
        online: '● {count} online',
        messagePlaceholder: 'Message...',
        typing: '{name} is typing...',
        pinnedLabel: 'Pinned message',
        welcomeMessage: 'Welcome to World Chat!',
        noMessages: 'No messages',
        
        // Messages
        edited: 'edited',
        deleted: 'This message was deleted',
        sent: '✓',
        delivered: '✓✓',
        read: '✓✓',
        
        // Action buttons
        reply: 'Reply',
        copy: 'Copy',
        edit: 'Edit',
        delete: 'Delete',
        deleteForMe: 'Delete for me',
        deleteForAll: 'Delete for everyone',
        report: 'Report',
        pin: 'Pin',
        unpin: 'Unpin',
        
        // Menu
        menuSettings: 'Settings',
        menuClearChat: 'Clear Chat',
        menuDeleteMode: 'Delete Messages',
        menuExport: 'Export History',
        
        // Settings
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
        
        // Confirmations
        confirmClearChat: 'Are you sure you want to clear the chat?',
        confirmDelete: 'Are you sure you want to delete {count} messages?',
        confirmLinkTitle: 'External Link',
        confirmLinkText: 'Are you sure you want to open this link?',
        openLink: 'Open',
        cancel: 'Cancel',
        confirm: 'Confirm',
        
        // Report
        reportTitle: 'Report Message',
        reportReason: 'Reason for report...',
        sendReport: 'Send Report',
        reportSubmitted: 'Report submitted',
        
        // Problem
        problemTitle: 'Report a Problem',
        problemDescription: 'Describe the problem in detail',
        problemSent: 'Problem report sent',
        
        // Profile
        profileTitle: 'Profile',
        profileName: 'Name',
        profileUsername: 'Username',
        profileVerified: 'Verified',
        profileNotVerified: 'Not verified',
        profileReport: 'Report',
        
        // Media
        photo: 'Photo',
        video: 'Video',
        file: 'File',
        camera: 'Camera',
        poll: 'Poll',
        quiz: 'Quiz',
        
        // Poll
        pollQuestion: 'Question',
        pollOptions: 'Options',
        pollAddOption: 'Add option',
        pollAnonymous: 'Anonymous poll',
        pollMultiple: 'Multiple choice',
        pollCreate: 'Create Poll',
        quizCorrect: 'Correct answer',
        quizExplanation: 'Explanation',
        
        // Voice
        voiceRecord: 'Hold to record',
        voiceRelease: 'Release to send',
        voiceCancel: 'Cancel',
        
        // Verification
        verifyTitle: 'Verification',
        verifyText: 'Open bot @{bot} and send code: {code}',
        verifyComplete: 'Verification complete',
        
        // Search
        searchPlaceholder: 'Search messages...',
        searchNoResults: 'No results found',
        
        // Export
        exportTitle: 'Export History',
        exportJson: 'JSON',
        exportTxt: 'TXT',
        
        // Errors
        errorRegisterFirst: 'Register first',
        errorRateLimit: 'Rate limit: 10 messages per minute',
        errorUsernameTaken: 'Username already taken',
        errorCannotEdit: 'Cannot edit this message',
        errorAdminOnly: 'Admin only',
        errorFileTooBig: 'File too large (max 10MB)',
    }
};

// Текущий язык
let currentLang = localStorage.getItem('chat_language') || 'ru';

// Функция перевода
function t(key, params = {}) {
    const lang = translations[currentLang] || translations['ru'];
    let text = lang[key] || translations['ru'][key] || key;
    
    // Замена параметров
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// Смена языка
function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('chat_language', lang);
    }
}

// Обновление всех текстов на странице
function updateAllTexts() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = t(key);
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        el.placeholder = t(key);
    });
      }
