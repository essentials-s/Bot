// frontend/assets/js/reports.js
// Замени ВЕСЬ файл

// Отправка жалобы на email через FormSubmit
function submitReportToEmail(reportData) {
    var formData = new FormData();
    formData.append('reporter', reportData.reporter || 'unknown');
    formData.append('reported_user', reportData.reportedUser || 'unknown');
    formData.append('message_id', reportData.messageId || '');
    formData.append('message_text', reportData.messageText || '');
    formData.append('reason', reportData.reason || '');
    formData.append('timestamp', new Date().toISOString());
    formData.append('_subject', 'World Chat Report from ' + (reportData.reporter || 'user'));
    formData.append('_captcha', 'false');
    formData.append('_template', 'table');

    fetch('https://formsubmit.co/ajax/erdium@internet.ru', {
        method: 'POST',
        headers: {
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            if (typeof showSuccess === 'function') {
                showSuccess('Report sent');
            } else {
                alert('Report sent');
            }
        }
    })
    .catch(function() {
        // Fallback
        if (typeof showSuccess === 'function') {
            showSuccess('Report submitted');
        } else {
            alert('Report submitted');
        }
    });
}

// Полная функция отправки жалобы
function submitFullReport(messageData, reason) {
    var reportData = {
        reporter: (currentUser && currentUser.username) || 'anonymous',
        reportedUser: messageData.username || messageData.name || 'unknown',
        messageId: messageData.id || '',
        messageText: messageData.text || '[Media]',
        reason: reason,
    };
    submitReportToEmail(reportData);
}

// Модальное окно жалобы на сообщение
function openMessageReportModal(messageData) {
    var modal = document.getElementById('reportModal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal" style="max-width:420px">
            <h3>Report Message</h3>
            
            <div style="background:var(--bg-input);border-radius:8px;padding:10px;margin:12px 0">
                <div style="font-weight:600;font-size:12px;margin-bottom:4px">
                    ${messageData.name || ''}
                    <span style="color:var(--text-muted);font-weight:400">
                        @${messageData.username || ''}
                    </span>
                </div>
                <div style="font-size:13px;color:var(--text-primary);word-break:break-word">
                    ${(messageData.text || '[Media]').substring(0, 150)}
                </div>
            </div>
            
            <textarea id="reportDetailReason" placeholder="Reason for report..." rows="4"
                      style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-light);
                             border-radius:8px;color:var(--text-primary);resize:vertical;font-family:inherit;
                             font-size:13px;margin-bottom:12px"></textarea>
            
            <div style="display:flex;gap:8px">
                <button class="btn-danger" id="submitReportBtn" style="flex:1">Send Report</button>
                <button class="btn-secondary" id="cancelReportBtn" style="flex:1">Cancel</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal._messageData = messageData;

    document.getElementById('submitReportBtn').addEventListener('click', function() {
        var reason = document.getElementById('reportDetailReason').value.trim();
        if (!reason) {
            alert('Enter reason');
            return;
        }
        submitFullReport(messageData, reason);
        modal.style.display = 'none';
    });

    document.getElementById('cancelReportBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Окно "Сообщить о проблеме"
function openProblemReport() {
    var modal = document.getElementById('reportModal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal" style="max-width:420px">
            <h3>Report a Problem</h3>
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
                Describe the issue you are experiencing. Include steps to reproduce if possible.
            </p>
            
            <textarea id="problemDescription" placeholder="Describe the problem in detail..." rows="5"
                      style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-light);
                             border-radius:8px;color:var(--text-primary);resize:vertical;font-family:inherit;
                             font-size:13px;margin-bottom:12px"></textarea>
            
            <div style="display:flex;gap:8px">
                <button class="btn-danger" id="submitProblemBtn" style="flex:1">Send Report</button>
                <button class="btn-secondary" id="cancelProblemBtn" style="flex:1">Cancel</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    document.getElementById('submitProblemBtn').addEventListener('click', function() {
        var description = document.getElementById('problemDescription').value.trim();
        if (!description) {
            alert('Please describe the problem');
            return;
        }
        
        var reportData = {
            reporter: (currentUser && currentUser.username) || 'anonymous',
            reportedUser: '',
            messageId: '',
            messageText: '',
            reason: '[PROBLEM REPORT] ' + description,
        };
        
        submitReportToEmail(reportData);
        modal.style.display = 'none';
    });

    document.getElementById('cancelProblemBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Жалоба на пользователя
function openUserReportModal(username) {
    var modal = document.getElementById('reportModal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal" style="max-width:420px">
            <h3>Report User</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
                Reporting user: <strong>@${username}</strong>
            </p>
            
            <textarea id="userReportReason" placeholder="Reason for reporting this user..." rows="4"
                      style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border-light);
                             border-radius:8px;color:var(--text-primary);resize:vertical;font-family:inherit;
                             font-size:13px;margin-bottom:12px"></textarea>
            
            <div style="display:flex;gap:8px">
                <button class="btn-danger" id="submitUserReportBtn" style="flex:1">Send Report</button>
                <button class="btn-secondary" id="cancelUserReportBtn" style="flex:1">Cancel</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    document.getElementById('submitUserReportBtn').addEventListener('click', function() {
        var reason = document.getElementById('userReportReason').value.trim();
        if (!reason) {
            alert('Enter reason');
            return;
        }
        
        var reportData = {
            reporter: (currentUser && currentUser.username) || 'anonymous',
            reportedUser: username,
            messageId: '',
            messageText: 'User report',
            reason: '[USER REPORT] ' + reason,
        };
        
        submitReportToEmail(reportData);
        modal.style.display = 'none';
    });

    document.getElementById('cancelUserReportBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Делаем доступным глобально
window.openProblemReport = openProblemReport;
window.openMessageReportModal = openMessageReportModal;
window.openUserReportModal = openUserReportModal;