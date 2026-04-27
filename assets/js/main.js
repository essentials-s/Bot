// frontend/assets/js/main.js

(function() {
    'use strict';

    // EmailJS
    (function() {
        emailjs.init("eK_3lZjCFvgkwvuUZ");
    })();

    window.CONFIG = {
        EMAILJS_SERVICE_ID: 'service_5sjv2tl',
        EMAILJS_TEMPLATE_ID: 'template_4cs7weu',
        MAX_EMAIL_REQUESTS: 2,
    };

    var regState = {
        name: '',
        username: '',
        email: '',
        password: '',
        generatedCode: '',
        emailVerified: false,
        codeSent: false,
    };

    function getEmailRequestCount(email) {
        var today = new Date().toDateString();
        var key = 'er_' + email.replace(/[^a-z0-9]/gi, '');
        var data = localStorage.getItem(key);
        if (!data) return 0;
        try {
            var parsed = JSON.parse(data);
            if (parsed.date !== today) return 0;
            return parsed.count || 0;
        } catch(e) { return 0; }
    }

    function incrementEmailRequestCount(email) {
        var today = new Date().toDateString();
        var key = 'er_' + email.replace(/[^a-z0-9]/gi, '');
        localStorage.setItem(key, JSON.stringify({ date: today, count: getEmailRequestCount(email) + 1 }));
    }

    function canSendEmail(email) {
        return getEmailRequestCount(email) < 2;
    }

    function init() {
        var savedUser = loadUserFromStorage();
        
        if (savedUser && savedUser.name && savedUser.username && savedUser.emailVerified) {
            showChat();
            setTimeout(function() {
                registerUser(savedUser.name, savedUser.username);
            }, 800);
        } else {
            showRegistration();
        }
        
        initRegistration();
        initLogin();
        initTabs();
    }

    function showRegistration() {
        document.getElementById('registration').style.display = 'flex';
        document.getElementById('chatContainer').style.display = 'none';
    }

    function showChat() {
        document.getElementById('registration').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        var input = document.getElementById('msgInput');
        if (input) { input.disabled = false; input.placeholder = 'Message...'; }
    }

    function initTabs() {
        var tabs = document.querySelectorAll('.reg-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                tabs.forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                
                var tabName = tab.dataset.tab;
                document.getElementById('form-register').style.display = tabName === 'register' ? 'block' : 'none';
                document.getElementById('form-login').style.display = tabName === 'login' ? 'block' : 'none';
            });
        });
    }

    function initRegistration() {
        var nameInput = document.getElementById('regName');
        var usernameInput = document.getElementById('regUsername');
        var emailInput = document.getElementById('regEmail');
        var passwordInput = document.getElementById('regPassword');
        var codeInput = document.getElementById('regCode');
        var regBtn = document.getElementById('regBtn');
        var sendCodeBtn = document.getElementById('sendCodeBtnRegister');
        var verifyCodeBtn = document.getElementById('verifyCodeBtn');
        var usernameStatus = document.getElementById('usernameStatus');
        var codeStatus = document.getElementById('codeStatus');
        var codeGroup = document.getElementById('codeGroup');
        var regError = document.getElementById('regError');

        codeInput.setAttribute('inputmode', 'numeric');
        codeInput.setAttribute('pattern', '[0-9]*');

        // Проверка username
        var checkUsernameDebounced = debounce(function() {
            var username = usernameInput.value.trim();
            if (username.length < 3) { usernameStatus.textContent = ''; updateRegButton(); return; }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                usernameStatus.textContent = 'Invalid characters';
                usernameStatus.style.color = 'var(--danger)';
                updateRegButton(); return;
            }
            fetch(API_URL + '/api/check-username/' + username)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.available) {
                        usernameStatus.textContent = 'Available';
                        usernameStatus.style.color = 'var(--success)';
                    } else {
                        usernameStatus.textContent = 'Taken';
                        usernameStatus.style.color = 'var(--danger)';
                    }
                    updateRegButton();
                }).catch(function() { updateRegButton(); });
        }, 500);
        usernameInput.addEventListener('input', checkUsernameDebounced);

        // SEND CODE
        sendCodeBtn.addEventListener('click', function() {
            var email = emailInput.value.trim();
            if (!email || !email.includes('@') || !email.includes('.')) {
                regError.textContent = 'Enter valid email';
                regError.style.display = 'block';
                return;
            }
            if (!canSendEmail(email)) {
                regError.textContent = 'Limit: 2 emails per day';
                regError.style.display = 'block';
                return;
            }
            regError.style.display = 'none';
            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = 'Sending...';
            
            regState.generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            regState.email = email;

            emailjs.send("service_5sjv2tl", "template_4cs7weu", {
                to_name: (nameInput.value.trim() || "User"),
                code: regState.generatedCode,
                to_email: email
            })
            .then(function() {
                incrementEmailRequestCount(email);
                regState.codeSent = true;
                codeGroup.style.display = 'block';
                codeInput.focus();
                sendCodeBtn.textContent = 'Resend';
                sendCodeBtn.disabled = false;
                if (getEmailRequestCount(email) >= 2) { sendCodeBtn.disabled = true; sendCodeBtn.textContent = 'Limit'; }
                updateRegButton();
                if (typeof showToast === 'function') showToast('Code sent!', 'success');
            })
            .catch(function(error) {
                console.error('EmailJS:', error);
                regError.textContent = 'Failed to send code';
                regError.style.display = 'block';
                sendCodeBtn.textContent = 'Send Code';
                sendCodeBtn.disabled = false;
            });
        });

        // VERIFY CODE
        verifyCodeBtn.addEventListener('click', function() {
            var code = codeInput.value.trim();
            if (code === regState.generatedCode) {
                regState.emailVerified = true;
                codeStatus.textContent = 'Verified!';
                codeStatus.style.color = 'var(--success)';
                codeInput.disabled = true;
                verifyCodeBtn.disabled = true;
                updateRegButton();
                if (typeof showToast === 'function') showToast('Email verified!', 'success');
            } else {
                codeStatus.textContent = 'Wrong code';
                codeStatus.style.color = 'var(--danger)';
                codeInput.value = '';
                codeInput.focus();
            }
        });

        codeInput.addEventListener('input', function() {
            codeInput.value = codeInput.value.replace(/[^0-9]/g, '');
            if (codeInput.value.length === 6) verifyCodeBtn.click();
        });

        function updateRegButton() {
            var nameValid = nameInput.value.trim().length >= 1;
            var usernameValid = (usernameStatus.style.color === 'rgb(16, 185, 129)' || usernameStatus.textContent === 'Available');
            var passValid = passwordInput.value.length >= 3;
            regBtn.disabled = !(nameValid && usernameValid && regState.emailVerified && passValid);
        }
        nameInput.addEventListener('input', function() { regState.name = nameInput.value.trim(); updateRegButton(); });
        passwordInput.addEventListener('input', updateRegButton);

        // REGISTER
        regBtn.addEventListener('click', function() {
            if (regBtn.disabled) return;
            var name = nameInput.value.trim();
            var username = usernameInput.value.trim();
            var email = regState.email;
            var password = passwordInput.value;

            fetch(API_URL + '/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, username: username, email: email, password: password })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success) {
                    saveUserToStorage({ id: data.userId, name: name, username: username, email: email, emailVerified: true, verified: true, badge: '', avatar: '' });
                    currentUser = { id: data.userId, name: name, username: username, email: email, emailVerified: true, verified: true, badge: '', avatar: '' };
                    registerUser(name, username);
                    showChat();
                    if (typeof showToast === 'function') showToast('Welcome, ' + name + '!', 'success');
                } else {
                    regError.textContent = data.error || 'Registration failed';
                    regError.style.display = 'block';
                }
            })
            .catch(function() {
                regError.textContent = 'Server error';
                regError.style.display = 'block';
            });
        });
    }

    function initLogin() {
        var loginBtn = document.getElementById('loginBtn');
        var loginEmail = document.getElementById('loginEmail');
        var loginPassword = document.getElementById('loginPassword');
        var loginError = document.getElementById('loginError');

        loginBtn.addEventListener('click', function() {
            var email = loginEmail.value.trim();
            var password = loginPassword.value;
            if (!email || !password) {
                loginError.textContent = 'Fill all fields';
                loginError.style.display = 'block';
                return;
            }
            loginError.style.display = 'none';

            fetch(API_URL + '/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success) {
                    saveUserToStorage({ id: data.user.id, name: data.user.name, username: data.user.username, email: email, emailVerified: true, verified: data.user.verified, badge: data.user.badge || '', avatar: data.user.avatar || '' });
                    currentUser = { id: data.user.id, name: data.user.name, username: data.user.username, email: email, emailVerified: true, verified: data.user.verified, badge: data.user.badge || '', avatar: data.user.avatar || '' };
                    registerUser(data.user.name, data.user.username);
                    showChat();
                    if (typeof showToast === 'function') showToast('Welcome back, ' + data.user.name + '!', 'success');
                } else {
                    loginError.textContent = data.error || 'Wrong email or password';
                    loginError.style.display = 'block';
                }
            })
            .catch(function() {
                loginError.textContent = 'Server error';
                loginError.style.display = 'block';
            });
        });
    }

    // LOGOUT
    window.logout = function() {
        localStorage.removeItem('chat_user');
        currentUser = null;
        location.reload();
    };

    window.changeNamePrompt = function() {
        var name = prompt('New name:', currentUser ? currentUser.name : '');
        if (name && name.trim() && currentUser) {
            currentUser.name = name.trim();
            saveUserToStorage(currentUser);
            updateProfile(name.trim());
            if (typeof showToast === 'function') showToast('Name changed', 'success');
        }
    };

    window.uploadAvatar = function() {
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
                        updateProfile(currentUser.name, ev.target.result);
                        if (typeof showToast === 'function') showToast('Avatar updated', 'success');
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    document.addEventListener('DOMContentLoaded', init);
})();