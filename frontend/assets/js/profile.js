// frontend/assets/js/profile.js

// Текущий пользователь
let currentUser = null;

// Инициализация профиля
function initProfile() {
    // Загружаем сохранённого пользователя
    const saved = loadUserFromStorage();
    if (saved && saved.name) {
        currentUser = saved;
    }
}

// Показать профиль пользователя
function showUserProfile(username) {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    // Ищем пользователя в списке
    const user = findUserByUsername(username);
    if (!user) {
        showError('User not found');
        return;
    }

    const avatarColor = getAvatarColor(user.name || user.username);
    const initial = getInitial(user.name || user.username);
    const avatarUrl = user.avatar || '';

    modal.innerHTML = `
        <div class="modal" style="text-align:center;max-width:320px">
            <div class="profile-avatar" style="
                width:80px;height:80px;border-radius:50%;margin:0 auto 12px;
                background:${avatarUrl ? `url(${avatarUrl})` : avatarColor};
                background-size:cover;background-position:center;
                display:flex;align-items:center;justify-content:center;
                font-size:32px;color:#fff;font-weight:700;
            ">
                ${avatarUrl ? '' : initial}
            </div>
            
            <h3>${escapeHtml(user.name || '')}</h3>
            <p style="color:var(--text-secondary);font-size:13px">@${escapeHtml(user.username || '')}</p>
            
            ${user.verified ? 
                '<span style="color:var(--accent);font-size:12px">✓ Verified</span>' : 
                '<span style="color:var(--text-muted);font-size:12px">Not verified</span>'
            }
            
            ${user.badge ? 
                `<div style="margin-top:8px"><span class="badge" style="background:var(--accent);color:#fff">${user.badge}</span></div>` : 
                ''
            }
            
            <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">
                ${user.online ? 
                    '<span style="color:var(--success)">● Online</span>' : 
                    `<span>Last seen ${formatTime(user.lastSeen)}</span>`
                }
            </div>
            
            ${user.username !== currentUser?.username ? `
                <button class="btn-danger" style="margin-top:16px" onclick="openReportModal({name:'${escapeHtml(user.name)}',username:'${escapeHtml(user.username)}',id:'',text:''});document.getElementById('profileModal').style.display='none'">
                    🚩 Report
                </button>
            ` : ''}
            
            <button class="btn-secondary" style="margin-top:8px" onclick="document.getElementById('profileModal').style.display='none'">
                Close
            </button>
        </div>
    `;

    modal.style.display = 'flex';

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Найти пользователя по username
function findUserByUsername(username) {
    // Ищем среди онлайн пользователей
    const allUsers = window._onlineUsers || [];
    return allUsers.find(u => u.username === username) || null;
}

// Обновить онлайн-пользователей
function updateOnlineUsers(users) {
    window._onlineUsers = users;
}

// Аватарка для сообщения
function createAvatarHtml(user) {
    const color = getAvatarColor(user.name || user.username);
    const initial = getInitial(user.name || user.username);
    const avatarUrl = user.avatar || '';

    if (avatarUrl) {
        return `<div class="msg-avatar" style="background-image:url(${avatarUrl});background-size:cover;background-position:center;cursor:pointer" onclick="showUserProfile('${user.username}')" title="${escapeHtml(user.name)}"></div>`;
    }

    return `<div class="msg-avatar" style="background:${color};cursor:pointer" onclick="showUserProfile('${user.username}')" title="${escapeHtml(user.name)}">${initial}</div>`;
}

// Обновление профиля пользователя
function handleProfileUpdated(data) {
    if (currentUser && currentUser.id === data.id) {
        currentUser.name = data.name;
        currentUser.avatar = data.avatar;
        saveUserToStorage(currentUser);
    }

    // Обновляем аватарки в сообщениях
    document.querySelectorAll(`.msg-avatar[title="${data.name}"]`).forEach(avatar => {
        if (data.avatar) {
            avatar.style.backgroundImage = `url(${data.avatar})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.textContent = '';
        } else {
            avatar.style.backgroundImage = '';
            avatar.style.background = getAvatarColor(data.name);
            avatar.textContent = getInitial(data.name);
        }
    });

    // Обновляем имена в сообщениях
    document.querySelectorAll('.msg-name').forEach(nameEl => {
        if (nameEl.textContent === data.name) {
            nameEl.textContent = data.name;
        }
    });
}

// Обработка верификации
function handleVerified(data) {
    if (currentUser && data.user && currentUser.id === data.user.id) {
        currentUser.verified = true;
        saveUserToStorage(currentUser);
    }
    notifyVerified();
}

// Изменение аватара
function changeAvatar(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const avatarUrl = e.target.result;
        if (currentUser) {
            currentUser.avatar = avatarUrl;
            saveUserToStorage(currentUser);
            updateProfile(currentUser.name, avatarUrl);
            notifyAvatarChanged();
        }
    };
    reader.readAsDataURL(file);
}

// Изменение имени
function changeName(newName) {
    if (!newName || !currentUser) return;
    if (newName === currentUser.name) return;

    currentUser.name = newName;
    saveUserToStorage(currentUser);
    updateProfile(newName, currentUser.avatar);
    notifyNameChanged(newName);
}

// Загрузка аватара из галереи
function uploadAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showError('File too large (max 5MB)');
                return;
            }
            changeAvatar(file);
        }
    };
    input.click();
}

// Верификация через Telegram
function startVerification() {
    if (!currentUser) return;

    // Получаем код верификации с сервера
    fetch(API_URL + '/api/verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: currentUser.id,
            userName: currentUser.name
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code) {
            showToast(
                t('verifyText', { bot: data.botUsername, code: data.code }),
                'info',
                10000
            );
            // Открываем Telegram
            window.open(`https://t.me/${data.botUsername}`, '_blank');
        }
    })
    .catch(() => {
        showError('Verification failed');
    });
}

// Инициализация
initProfile();
