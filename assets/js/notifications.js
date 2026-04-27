// frontend/assets/js/notifications.js

// Показать уведомление
function showToast(text, type = 'info', duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // Очищаем предыдущий таймер
    if (toast._timeout) {
        clearTimeout(toast._timeout);
    }
    
    // Устанавливаем текст и тип
    toast.textContent = text;
    toast.className = 'toast ' + type;
    
    // Показываем
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Скрываем через duration
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Уведомление об успехе
function showSuccess(text) {
    showToast(text, 'success');
}

// Уведомление об ошибке
function showError(text) {
    showToast(text, 'error');
}

// Уведомление-предупреждение
function showWarning(text) {
    showToast(text, 'warning');
}

// Информационное уведомление
function showInfo(text) {
    showToast(text, 'info');
}

// Браузерное уведомление
function showBrowserNotification(title, body, icon = null) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body, icon });
            }
        });
    }
}

// Запрос разрешения на уведомления
function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Проверка, включены ли уведомления
function areNotificationsEnabled() {
    return Notification.permission === 'granted';
}

// Уведомление о новом сообщении
function notifyNewMessage(name, text) {
    if (!areNotificationsEnabled()) return;
    if (document.visibilityState === 'visible') return; // Не показываем если страница активна
    
    const body = text ? text.substring(0, 100) : '[Media]';
    showBrowserNotification(
        t('chatTitle'),
        name + ': ' + body
    );
}

// Уведомление об упоминании
function notifyMention(name) {
    if (!areNotificationsEnabled()) return;
    
    showBrowserNotification(
        t('chatTitle'),
        name + ' mentioned you'
    );
}

// Уведомление о верификации
function notifyVerified() {
    showSuccess(t('verifyComplete'));
    showBrowserNotification(
        t('verifyTitle'),
        t('verifyComplete')
    );
}

// Уведомление о жалобе
function notifyReportSubmitted() {
    showSuccess(t('reportSubmitted'));
}

// Уведомление об удалении
function notifyDeleted(count = 1) {
    if (count === 1) {
        showInfo('Message deleted');
    } else {
        showInfo(count + ' messages deleted');
    }
}

// Уведомление о закреплении
function notifyPinned() {
    showInfo('Message pinned');
}

// Уведомление об очистке чата
function notifyChatCleared() {
    showInfo('Chat cleared');
}

// Уведомление о копировании
function notifyCopied() {
    showSuccess('Copied to clipboard');
}

// Уведомление об экспорте
function notifyExported() {
    showSuccess('History exported');
}

// Уведомление о лимите
function notifyRateLimit() {
    showError(t('errorRateLimit'));
}

// Уведомление о загрузке файла
function notifyFileUploading() {
    showInfo('Uploading...');
}

// Уведомление о завершении загрузки
function notifyFileUploaded() {
    showSuccess('File uploaded');
}

// Уведомление об ошибке загрузки
function notifyFileError() {
    showError('Upload failed');
}

// Уведомление о начале записи голосового
function notifyVoiceRecording() {
    showInfo(t('voiceRecord'));
}

// Уведомление об отправке голосового
function notifyVoiceSent() {
    showInfo('Voice message sent');
}

// Уведомление о входе пользователя
function notifyUserJoined(name) {
    showInfo(name + ' joined the chat');
}

// Уведомление о выходе пользователя
function notifyUserLeft(name) {
    showInfo(name + ' left the chat');
}

// Уведомление о смене имени
function notifyNameChanged(newName) {
    showSuccess('Name changed to ' + newName);
}

// Уведомление о смене аватара
function notifyAvatarChanged() {
    showSuccess('Avatar updated');
}

// Уведомление о смене темы
function notifyThemeChanged(theme) {
    showInfo('Theme: ' + theme);
}

// Уведомление о смене языка
function notifyLanguageChanged(lang) {
    showInfo('Language: ' + lang);
}

// Уведомление о смене размера шрифта
function notifyFontSizeChanged(size) {
    showInfo('Font size: ' + size);
}
