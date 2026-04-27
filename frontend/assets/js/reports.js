// frontend/assets/js/reports.js

// Отправка жалобы на email
function submitReportToEmail(reportData) {
    // Используем FormSubmit для отправки на email
    const formData = new FormData();
    formData.append('reporter', reportData.reporter);
    formData.append('reported_user', reportData.reportedUser);
    formData.append('message_id', reportData.messageId);
    formData.append('message_text', reportData.messageText);
    formData.append('reason', reportData.reason);
    formData.append('timestamp', new Date().toISOString());
    formData.append('chat', 'World Chat');

    // FormSubmit отправляет на email: erdium@internet.ru
    fetch('https://formsubmit.co/ajax/erdium@internet.ru', {
        method: 'POST',
        headers: {
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Report sent to moderation');
        } else {
            showError('Failed to send report');
        }
    })
    .catch(() => {
        // Если FormSubmit недоступен, пробуем альтернативный метод
        fallbackReport(reportData);
    });
}

// Запасной метод отправки (через сервер)
function fallbackReport(reportData) {
    sendToServer({
        type: 'report',
        messageId: reportData.messageId,
        reason: reportData.reason
    });
    showSuccess('Report submitted');
}

// Полная функция отправки жалобы
function submitFullReport(messageData, reason) {
    if (!currentUser) {
        showError('Register first');
        return;
    }

    const reportData = {
        reporter: currentUser.username,
        reportedUser: messageData.username || messageData.name,
        messageId: messageData.id || '',
        messageText: messageData.text || '[Media]',
        reason: reason,
    };

    submitReportToEmail(reportData);
}

// Модальное окно жалобы на пользователя (из профиля)
function openUserReportModal(username) {
    const modal = document.getElementById('reportModal');
    if (!modal) return;

    document.getElementById('reportModal').innerHTML = `
        <div class="modal" style="max-width:400px">
            <h3>Report User</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
                Reporting user: <strong>@${escapeHtml(username)}</strong>
            </p>
            <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">
                Please describe why you are reporting this user. 
                Include any relevant details or evidence.
            </p>
            <textarea id="userReportReason" placeholder="Reason for reporting this user..." rows="4"
                      style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-light);
                             border-radius:8px;color:var(--text-primary);resize:vertical;font-family:inherit;
                             font-size:13px"></textarea>
            <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
                Common reasons: spam, harassment, impersonation, inappropriate content
            </div>
            <button class="btn-danger" style="margin-top:12px" 
                    onclick="submitUserReport('${escapeHtml(username)}')">
                Submit Report
            </button>
            <button class="btn-secondary" style="margin-top:8px" 
                    onclick="document.getElementById('reportModal').style.display='none'">
                Cancel
            </button>
        </div>
    `;

    document.getElementById('reportModal').style.display = 'flex';
    document.getElementById('reportModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('reportModal')) {
            document.getElementById('reportModal').style.display = 'none';
        }
    });
}

// Отправка жалобы на пользователя
function submitUserReport(username) {
    const reason = document.getElementById('userReportReason')?.value.trim();
    if (!reason) {
        showError('Please enter a reason');
        return;
    }

    const reportData = {
        reporter: currentUser?.username || 'anonymous',
        reportedUser: username,
        messageId: '',
        messageText: 'User report',
        reason: `[USER REPORT] ${reason}`,
    };

    submitReportToEmail(reportData);
    document.getElementById('reportModal').style.display = 'none';
}

// Модальное окно жалобы на сообщение (полная версия)
function openMessageReportModal(messageData) {
    const modal = document.getElementById('reportModal');
    if (!modal) return;

    document.getElementById('reportModal').innerHTML = `
        <div class="modal" style="max-width:420px">
            <h3>Report Message</h3>
            
            <div style="background:var(--bg-input);border-radius:8px;padding:10px;margin:12px 0">
                <div style="font-weight:600;font-size:12px;margin-bottom:4px">
                    ${escapeHtml(messageData.name || '')}
                    <span style="color:var(--text-muted);font-weight:400">
                        @${escapeHtml(messageData.username || '')}
                    </span>
                </div>
                <div style="font-size:13px;color:var(--text-primary);word-break:break-word">
                    ${escapeHtml((messageData.text || '[Media]').substring(0, 150))}
                </div>
            </div>
            
            <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
                This report will be sent to the moderation team.
                Please select a reason:
            </p>
            
            <div class="report-reasons">
                <button class="report-reason-btn" onclick="selectReason('Spam')">Spam</button>
                <button class="report-reason-btn" onclick="selectReason('Harassment')">Harassment</button>
                <button class="report-reason-btn" onclick="selectReason('Inappropriate content')">Inappropriate</button>
                <button class="report-reason-btn" onclick="selectReason('Impersonation')">Impersonation</button>
                <button class="report-reason-btn" onclick="selectReason('Violence')">Violence</button>
                <button class="report-reason-btn" onclick="selectReason('Other')">Other</button>
            </div>
            
            <textarea id="reportDetailReason" placeholder="Additional details (optional)..." rows="3"
                      style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-light);
                             border-radius:8px;color:var(--text-primary);resize:vertical;font-family:inherit;
                             font-size:13px;margin-top:8px"></textarea>
            
            <button class="btn-danger" style="margin-top:12px" onclick="submitDetailedReport()">
                Send Report
            </button>
            <button class="btn-secondary" style="margin-top:8px" 
                    onclick="document.getElementById('reportModal').style.display='none'">
                Cancel
            </button>
        </div>
    `;

    document.getElementById('reportModal')._messageData = messageData;
    document.getElementById('reportModal').style.display = 'flex';
    document.getElementById('reportModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('reportModal')) {
            document.getElementById('reportModal').style.display = 'none';
        }
    });
}

// Выбор причины жалобы
function selectReason(reason) {
    const detailInput = document.getElementById('reportDetailReason');
    if (detailInput) {
        detailInput.dataset.reason = reason;
        detailInput.placeholder = `Reason: ${reason}. Add details...`;
        detailInput.focus();
    }
    
    // Подсветка выбранной кнопки
    document.querySelectorAll('.report-reason-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.textContent === reason) {
            btn.classList.add('selected');
        }
    });
}

// Отправка детальной жалобы
function submitDetailedReport() {
    const detailInput = document.getElementById('reportDetailReason');
    const reason = detailInput?.dataset?.reason || 'Not specified';
    const details = detailInput?.value?.trim() || '';
    
    const fullReason = details ? `${reason}: ${details}` : reason;
    const messageData = document.getElementById('reportModal')._messageData;
    
    if (messageData) {
        submitFullReport(messageData, fullReason);
        document.getElementById('reportModal').style.display = 'none';
    }
}

// Добавление стилей для жалоб
function addReportStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .report-reasons {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .report-reason-btn {
            padding: 6px 12px;
            background: var(--bg-input);
            border: 1px solid var(--border-light);
            border-radius: 16px;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 12px;
            transition: var(--transition);
        }
        .report-reason-btn:hover {
            background: var(--border);
        }
        .report-reason-btn.selected {
            background: var(--accent);
            border-color: var(--accent);
            color: #fff;
        }
    `;
    document.head.appendChild(style);
}

addReportStyles();
