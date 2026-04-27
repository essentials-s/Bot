// frontend/assets/js/settings.js

// Состояние настроек
const settingsState = {
    theme: localStorage.getItem('chat_theme') || 'dark',
    fontSize: localStorage.getItem('chat_fontSize') || 'medium',
    language: localStorage.getItem('chat_language') || 'ru',
    notifications: localStorage.getItem('chat_notifications') !== 'false',
};

// Инициализация настроек
function initSettings() {
    applyTheme(settingsState.theme);
    applyFontSize(settingsState.fontSize);
    setLanguage(settingsState.language);
    
    if (settingsState.notifications) {
        requestNotificationPermission();
    }
}

// Применить тему
function applyTheme(theme) {
    settingsState.theme = theme;
    localStorage.setItem('chat_theme', theme);
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // Обновляем мета-тег для мобильных
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.content = theme === 'dark' ? '#0a0e17' : '#ffffff';
    }
}

// Применить размер шрифта
function applyFontSize(size) {
    settingsState.fontSize = size;
    localStorage.setItem('chat_fontSize', size);
    
    document.documentElement.setAttribute('data-font', size);
}

// Открыть страницу настроек
function openSettings() {
    const page = document.getElementById('settingsPage');
    if (!page) return;

    page.innerHTML = `
        <div class="page-header">
            <button class="icon-btn" onclick="closeSettings()">←</button>
            <h2>${t('settingsTitle')}</h2>
        </div>
        
        <div class="settings-content">
            <!-- Размер шрифта -->
            <div class="setting-group">
                <h3>${t('settingsFontSize')}</h3>
                <div class="setting-options">
                    <button class="setting-btn ${settingsState.fontSize === 'small' ? 'active' : ''}" 
                            onclick="applyFontSize('small');updateSettingButtons()">
                        ${t('settingsFontSmall')}
                    </button>
                    <button class="setting-btn ${settingsState.fontSize === 'medium' ? 'active' : ''}" 
                            onclick="applyFontSize('medium');updateSettingButtons()">
                        ${t('settingsFontMedium')}
                    </button>
                    <button class="setting-btn ${settingsState.fontSize === 'large' ? 'active' : ''}" 
                            onclick="applyFontSize('large');updateSettingButtons()">
                        ${t('settingsFontLarge')}
                    </button>
                </div>
                <div class="font-preview" style="font-size:${getFontSizeValue(settingsState.fontSize)}">
                    Preview text - Пример текста
                </div>
            </div>
            
            <!-- Тема -->
            <div class="setting-group">
                <h3>${t('settingsTheme')}</h3>
                <div class="setting-options">
                    <button class="setting-btn ${settingsState.theme === 'dark' ? 'active' : ''}" 
                            onclick="applyTheme('dark');updateSettingButtons()">
                        🌙 ${t('settingsThemeDark')}
                    </button>
                    <button class="setting-btn ${settingsState.theme === 'light' ? 'active' : ''}" 
                            onclick="applyTheme('light');updateSettingButtons()">
                        ☀ ${t('settingsThemeLight')}
                    </button>
                </div>
            </div>
            
            <!-- Язык -->
            <div class="setting-group">
                <h3>${t('settingsLanguage')}</h3>
                <div class="setting-options">
                    <button class="setting-btn ${settingsState.language === 'ru' ? 'active' : ''}" 
                            onclick="changeSettingLanguage('ru')">
                        🇷🇺 ${t('settingsLanguageRu')}
                    </button>
                    <button class="setting-btn ${settingsState.language === 'en' ? 'active' : ''}" 
                            onclick="changeSettingLanguage('en')">
                        🇬🇧 ${t('settingsLanguageEn')}
                    </button>
                </div>
            </div>
            
            <!-- Уведомления -->
            <div class="setting-group">
                <h3>Notifications</h3>
                <div class="setting-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" ${settingsState.notifications ? 'checked' : ''} 
                               onchange="toggleNotifications(this.checked)">
                        <span class="toggle-slider"></span>
                        Push notifications
                    </label>
                </div>
            </div>
            
            <!-- Профиль -->
            <div class="setting-group">
                <h3>Profile</h3>
                <button class="setting-action-btn" onclick="changeNamePrompt()">
                    ✏ ${t('settingsChangeName')}
                </button>
                <button class="setting-action-btn" onclick="uploadAvatar()">
                    🖼 ${t('settingsChangeAvatar')}
                </button>
                <button class="setting-action-btn" onclick="startVerification()">
                    ✓ ${t('settingsChangeUsername')}
                </button>
            </div>
            
            <!-- Данные -->
            <div class="setting-group">
                <h3>Data</h3>
                <button class="setting-action-btn" onclick="exportHistory('json')">
                    📥 ${t('settingsExport')} (JSON)
                </button>
                <button class="setting-action-btn" onclick="exportHistory('txt')">
                    📥 ${t('settingsExport')} (TXT)
                </button>
            </div>
            
            <!-- Проблема -->
            <div class="setting-group">
                <h3>Support</h3>
                <button class="setting-action-btn" onclick="openProblemReport()">
                    ❗ ${t('settingsReportProblem')}
                </button>
            </div>
        </div>
    `;

    page.style.display = 'block';
    page.style.animation = 'slideIn 0.3s ease';
}

// Закрыть страницу настроек
function closeSettings() {
    const page = document.getElementById('settingsPage');
    if (page) {
        page.style.display = 'none';
    }
}

// Обновление кнопок настроек
function updateSettingButtons() {
    document.querySelectorAll('.setting-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Активные кнопки обновятся через onclick
}

// Получить значение размера шрифта
function getFontSizeValue(size) {
    switch (size) {
        case 'small': return '12px';
        case 'medium': return '14px';
        case 'large': return '16px';
        default: return '14px';
    }
}

// Смена языка из настроек
function changeSettingLanguage(lang) {
    setLanguage(lang);
    settingsState.language = lang;
    localStorage.setItem('chat_language', lang);
    notifyLanguageChanged(lang);
    
    // Перезагружаем страницу настроек для обновления текстов
    openSettings();
    updateAllTexts();
}

// Переключение уведомлений
function toggleNotifications(enabled) {
    settingsState.notifications = enabled;
    localStorage.setItem('chat_notifications', enabled);
    
    if (enabled) {
        requestNotificationPermission();
    }
}

// Изменение имени (промпт)
function changeNamePrompt() {
    const newName = prompt(t('settingsChangeName'), currentUser?.name || '');
    if (newName && newName.trim()) {
        changeName(newName.trim());
    }
}

// Экспорт истории
function exportHistory(format) {
    const messages = document.querySelectorAll('.message');
    let content = '';
    
    if (format === 'json') {
        const data = Array.from(messages).map(msg => ({
            name: msg.querySelector('.msg-name')?.textContent || '',
            text: msg.querySelector('.msg-bubble')?.textContent?.replace(/\n/g, ' ') || '',
            time: msg.querySelector('.msg-time')?.textContent || '',
        }));
        content = JSON.stringify(data, null, 2);
        downloadFile(content, 'chat_history.json', 'application/json');
    } else {
        messages.forEach(msg => {
            const name = msg.querySelector('.msg-name')?.textContent || '';
            const text = msg.querySelector('.msg-bubble')?.textContent?.replace(/\n/g, ' ') || '';
            const time = msg.querySelector('.msg-time')?.textContent || '';
            content += `[${time}] ${name}: ${text}\n`;
        });
        downloadFile(content, 'chat_history.txt', 'text/plain');
    }
    
    notifyExported();
}

// Скачать файл
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Окно "Сообщить о проблеме"
function openProblemReport() {
    const modal = document.getElementById('reportModal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal" style="max-width:400px">
            <h3>${t('problemTitle')}</h3>
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
                Describe the issue you're experiencing. Include steps to reproduce if possible.
            </p>
            <textarea id="problemDescription" placeholder="${t('problemDescription')}" rows="5" 
                      style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-light);
                             border-radius:8px;color:var(--text-primary);resize:vertical;font-family:inherit"></textarea>
            <button class="btn-primary" style="margin-top:12px" onclick="submitProblem()">
                ${t('sendReport')}
            </button>
            <button class="btn-secondary" style="margin-top:8px" onclick="document.getElementById('reportModal').style.display='none'">
                ${t('cancel')}
            </button>
        </div>
    `;

    modal.style.display = 'flex';
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Отправка проблемы
function submitProblem() {
    const description = document.getElementById('problemDescription')?.value.trim();
    if (!description) {
        showError('Describe the problem');
        return;
    }

    // Отправляем на сервер
    sendToServer({
        type: 'report',
        messageId: '',
        reason: 'Problem report: ' + description
    });

    document.getElementById('reportModal').style.display = 'none';
    showSuccess(t('problemSent'));
}

// Инициализация
initSettings();
