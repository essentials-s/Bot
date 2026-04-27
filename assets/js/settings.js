// frontend/assets/js/settings.js

const settingsState = {
    theme: 'dark',
    fontSize: 'medium',
    language: 'ru',
    notifications: true,
};

function initSettings() {
    // Загружаем сохранённые настройки
    settingsState.theme = localStorage.getItem('chat_theme') || 'dark';
    settingsState.fontSize = localStorage.getItem('chat_fontSize') || 'medium';
    settingsState.language = localStorage.getItem('chat_language') || 'ru';
    settingsState.notifications = localStorage.getItem('chat_notifications') !== 'false';
    
    // Применяем при загрузке
    applyTheme(settingsState.theme);
    applyFontSize(settingsState.fontSize);
    setLanguage(settingsState.language);
}

function applyTheme(theme) {
    settingsState.theme = theme;
    localStorage.setItem('chat_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
}

function applyFontSize(size) {
    settingsState.fontSize = size;
    localStorage.setItem('chat_fontSize', size);
    document.documentElement.setAttribute('data-font', size);
    
    // Применяем размер ко всем сообщениям
    const fontSizeValue = getFontSizeValue(size);
    document.querySelectorAll('.message .msg-bubble').forEach(el => {
        el.style.fontSize = fontSizeValue;
    });
    document.querySelectorAll('.message .msg-name').forEach(el => {
        el.style.fontSize = (parseInt(fontSizeValue) - 1) + 'px';
    });
    document.querySelectorAll('.message .msg-time').forEach(el => {
        el.style.fontSize = (parseInt(fontSizeValue) - 3) + 'px';
    });
}

function getFontSizeValue(size) {
    switch (size) {
        case 'small': return '12px';
        case 'medium': return '14px';
        case 'large': return '16px';
        default: return '14px';
    }
}

// frontend/assets/js/settings.js
// Замените ТОЛЬКО функцию openSettings

function openSettings() {
    const page = document.getElementById('settingsPage');
    if (!page) return;
    
    const isDark = settingsState.theme === 'dark';
    const isLight = settingsState.theme === 'light';
    const isSmall = settingsState.fontSize === 'small';
    const isMedium = settingsState.fontSize === 'medium';
    const isLarge = settingsState.fontSize === 'large';
    const isRu = settingsState.language === 'ru';
    const isEn = settingsState.language === 'en';
    
    page.innerHTML = `
        <div class="page-header">
            <button class="icon-btn" id="settingsBackBtn">←</button>
            <h2>${t('settingsTitle')}</h2>
        </div>
        
        <div class="settings-content">
            <div class="setting-group">
                <h3>${t('settingsFontSize')}</h3>
                <div class="setting-options" id="fontSizeButtons">
                    <button class="setting-btn${isSmall ? ' active' : ''}" data-size="small">${t('settingsFontSmall')}</button>
                    <button class="setting-btn${isMedium ? ' active' : ''}" data-size="medium">${t('settingsFontMedium')}</button>
                    <button class="setting-btn${isLarge ? ' active' : ''}" data-size="large">${t('settingsFontLarge')}</button>
                </div>
                <div class="font-preview" style="font-size:${getFontSizeValue(settingsState.fontSize)}">
                    Preview text - Пример текста
                </div>
            </div>
            
            <div class="setting-group">
                <h3>${t('settingsTheme')}</h3>
                <div class="setting-options" id="themeButtons">
                    <button class="setting-btn${isDark ? ' active' : ''}" data-theme="dark">🌙 ${t('settingsThemeDark')}</button>
                    <button class="setting-btn${isLight ? ' active' : ''}" data-theme="light">☀ ${t('settingsThemeLight')}</button>
                </div>
            </div>
            
            <div class="setting-group">
                <h3>${t('settingsLanguage')}</h3>
                <div class="setting-options" id="languageButtons">
                    <button class="setting-btn${isRu ? ' active' : ''}" data-lang="ru">🇷🇺 ${t('settingsLanguageRu')}</button>
                    <button class="setting-btn${isEn ? ' active' : ''}" data-lang="en">🇬🇧 ${t('settingsLanguageEn')}</button>
                </div>
            </div>
            
            <div class="setting-group">
                <h3>${t('settingsNotifications')}</h3>
                <div class="setting-toggle">
                    <label class="toggle-label">
                        <input type="checkbox" id="notifToggle" ${settingsState.notifications ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        Push notifications
                    </label>
                </div>
            </div>
            
            <div class="setting-group">
                <h3>Profile</h3>
                <button class="setting-action-btn" id="btnChangeName">✏ ${t('settingsChangeName')}</button>
                <button class="setting-action-btn" id="btnChangeAvatar">🖼 ${t('settingsChangeAvatar')}</button>
                <button class="setting-action-btn" id="btnVerify">✓ ${t('settingsChangeUsername')}</button>
            </div>
            
            <div class="setting-group">
                <h3>Data</h3>
                <button class="setting-action-btn" id="btnExportJson">📥 ${t('settingsExport')} (JSON)</button>
                <button class="setting-action-btn" id="btnExportTxt">📥 ${t('settingsExport')} (TXT)</button>
            </div>
            
            <div class="setting-group">
                <h3>Support</h3>
                <button class="setting-action-btn" id="btnProblem">❗ ${t('settingsReportProblem')}</button>
            </div>
        </div>
    `;
    
    page.style.display = 'block';
    
    // Кнопка Назад
    document.getElementById('settingsBackBtn').addEventListener('click', closeSettings);
    
    // Размер шрифта
    document.querySelectorAll('#fontSizeButtons .setting-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var size = this.getAttribute('data-size');
            applyFontSize(size);
            document.querySelectorAll('#fontSizeButtons .setting-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            var preview = document.querySelector('#settingsPage .font-preview');
            if (preview) preview.style.fontSize = getFontSizeValue(size);
        });
    });
    
    // Тема
    document.querySelectorAll('#themeButtons .setting-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var theme = this.getAttribute('data-theme');
            applyTheme(theme);
            document.querySelectorAll('#themeButtons .setting-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Язык
    document.querySelectorAll('#languageButtons .setting-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var lang = this.getAttribute('data-lang');
            settingsState.language = lang;
            localStorage.setItem('chat_language', lang);
            setLanguage(lang);
            openSettings();
        });
    });
    
    // Уведомления
    var notifToggle = document.getElementById('notifToggle');
    if (notifToggle) {
        notifToggle.addEventListener('change', function() {
            settingsState.notifications = this.checked;
            localStorage.setItem('chat_notifications', this.checked);
        });
    }
    
    // Кнопки Profile, Data, Support
    var btnChangeName = document.getElementById('btnChangeName');
    var btnChangeAvatar = document.getElementById('btnChangeAvatar');
    var btnVerify = document.getElementById('btnVerify');
    var btnExportJson = document.getElementById('btnExportJson');
    var btnExportTxt = document.getElementById('btnExportTxt');
    var btnProblem = document.getElementById('btnProblem');
    
    if (btnChangeName) btnChangeName.addEventListener('click', function() {
        var newName = prompt('New name:', currentUser ? currentUser.name : '');
        if (newName && newName.trim()) {
            if (typeof changeName === 'function') {
                changeName(newName.trim());
            } else {
                currentUser.name = newName.trim();
                saveUserToStorage(currentUser);
                if (typeof updateProfile === 'function') {
                    updateProfile(newName.trim(), currentUser.avatar);
                }
                if (typeof showToast === 'function') {
                    showToast('Name changed');
                }
            }
        }
    });
    
    if (btnChangeAvatar) btnChangeAvatar.addEventListener('click', function() {
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
                        if (typeof updateProfile === 'function') {
                            updateProfile(currentUser.name, ev.target.result);
                        }
                        if (typeof showToast === 'function') {
                            showToast('Avatar updated');
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
    
    if (btnVerify) btnVerify.addEventListener('click', function() {
        if (typeof startVerification === 'function') {
            startVerification();
        } else {
            if (typeof showToast === 'function') {
                showToast('Open @herrmeesagentbot and send /verify');
            }
        }
    });
    
    if (btnExportJson) btnExportJson.addEventListener('click', function() {
        if (typeof exportHistory === 'function') {
            exportHistory('json');
        } else {
            var data = JSON.stringify(chatState.messages || [], null, 2);
            var blob = new Blob([data], {type: 'application/json'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'chat_history.json';
            a.click();
        }
    });
    
    if (btnExportTxt) btnExportTxt.addEventListener('click', function() {
        if (typeof exportHistory === 'function') {
            exportHistory('txt');
        } else {
            var text = '';
            var msgs = chatState.messages || [];
            msgs.forEach(function(m) {
                text += '[' + new Date(m.time).toLocaleString() + '] ' + m.name + ': ' + (m.text || '[media]') + '\n';
            });
            var blob = new Blob([text], {type: 'text/plain'});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'chat_history.txt';
            a.click();
        }
    });
    
    if (btnProblem) btnProblem.addEventListener('click', function() {
        if (typeof openProblemReport === 'function') {
            openProblemReport();
        } else {
            var desc = prompt('Describe the problem:');
            if (desc && typeof sendReport === 'function') {
                sendReport('', desc);
                if (typeof showToast === 'function') showToast('Report sent');
            }
        }
    });
}
function closeSettings() {
    const page = document.getElementById('settingsPage');
    if (page) {
        page.style.display = 'none';
    }
}