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
        MAX_NAME_LENGTH: 20,
        MAX_USERNAME_LENGTH: 15,
        MAX_EMAIL_REQUESTS: 2,
    };

    var regState = {
        name: '',
        username: '',
        email: '',
        code: '',
        generatedCode: '',
        emailVerified: false,
        codeSent: false,
    };

    function getEmailRequestCount(email) {
        var today = new Date().toDateString();
        var key = 'email_requests_' + email;
        var data = localStorage.getItem(key);
        if (!data) return 0;
        var parsed = JSON.parse(data);
        if (parsed.date !== today) return 0;
        return parsed.count || 0;
    }

    function incrementEmailRequestCount(email) {
        var today = new Date().toDateString();
        var key = 'email_requests_' + email;
        localStorage.setItem(key, JSON.stringify({ date: today, count: getEmailRequestCount(email) + 1 }));
    }

    function canSendEmail(email) {
        return getEmailRequestCount(email) < CONFIG.MAX_EMAIL_REQUESTS;
    }

    function init() {
        var savedUser = loadUserFromStorage();
        
        if (savedUser && savedUser.name && savedUser.username && savedUser.emailVerified) {
            showChat();
            enableMessageInput();
            setTimeout(function() {
                registerUser(savedUser.name, savedUser.username);
            }, 1000);
        } else {
            showRegistration();
        }
        
        initRegistration();
    }

    function showRegistration() {
        document.getElementById('registration').style.display = 'flex';
        document.getElementById('chatContainer').style.display = 'none';
    }

    function showChat() {
        document.getElementById('registration').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
    }

    function enableMessageInput() {
        var input = document.getElementById('msgInput');
        if (input) {
            input.disabled = false;
            input.placeholder = 'Message...';
        }
    }

    function enterChat() {
        var nameInput = document.getElementById('regName');
        var usernameInput = document.getElementById('regUsername');
        var name = nameInput.value.trim();
        var username = usernameInput.value.trim();

        if (!name || !username) return;

        currentUser = {
            id: wsUserId || generateId(),
            name: name,
            username: username,
            email: regState.email,
            emailVerified: true,
            avatar: '',
            verified: true,
            badge: ''
        };

        saveUserToStorage(currentUser);
        registerUser(name, username);
        showChat();
        enableMessageInput();

        if (typeof showToast === 'function') {
            showToast('Welcome, ' + name + '!', 'success');
        }
    }

    function initRegistration() {
        var nameInput = document.getElementById('regName');
        var usernameInput = document.getElementById('regUsername');
        var emailInput = document.getElementById('regEmail');
        var codeInput = document.getElementById('regCode');
        var regBtn = document.getElementById('regBtn');
        var sendCodeBtn = document.getElementById('sendCodeBtn');
        var verifyCodeBtn = document.getElementById('verifyCodeBtn');
        var usernameStatus = document.getElementById('usernameStatus');
        var emailStatus = document.getElementById('emailStatus');
        var codeStatus = document.getElementById('codeStatus');
        var codeGroup = document.getElementById('codeGroup');

        codeInput.setAttribute('inputmode', 'numeric');
        codeInput.setAttribute('pattern', '[0-9]*');

        console.log('Registration init - all elements found');

        // Проверка username
        var checkUsernameDebounced = debounce(function() {
            var username = usernameInput.value.trim();
            if (username.length < 3) {
                usernameStatus.textContent = '';
                updateRegButton();
                return;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                usernameStatus.textContent = 'Invalid';
                usernameStatus.style.color = 'var(--danger)';
                updateRegButton();
                return;
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
                })
                .catch(function() {
                    updateRegButton();
                });
        }, 500);

        usernameInput.addEventListener('input', checkUsernameDebounced);

        // SEND CODE
        sendCodeBtn.addEventListener('click', function() {
            console.log('=== SEND CODE CLICKED ===');
            var email = emailInput.value.trim();
            console.log('Email:', email);
            
            if (!email || !email.includes('@') || !email.includes('.')) {
                emailStatus.textContent = 'Enter valid email';
                emailStatus.style.color = 'var(--danger)';
                console.log('Invalid email');
                return;
            }

            if (!canSendEmail(email)) {
                emailStatus.textContent = 'Limit reached (2 per day)';
                emailStatus.style.color = 'var(--danger)';
                if (typeof showToast === 'function') showToast('Limit reached', 'error');
                console.log('Limit reached');
                return;
            }

            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = 'Sending...';
            
            regState.generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            regState.email = email;
            console.log('Generated code:', regState.generatedCode);
            console.log('Calling EmailJS...');

            emailjs.send("service_5sjv2tl", "template_4cs7weu", {
                to_name: (nameInput.value.trim() || "User"),
                code: regState.generatedCode,
                to_email: email
            })
            .then(function(response) {
                console.log('EmailJS SUCCESS:', response);
                incrementEmailRequestCount(email);
                emailStatus.textContent = 'Code sent to ' + email;
                emailStatus.style.color = 'var(--success)';
                regState.codeSent = true;
                codeGroup.style.display = 'block';
                codeInput.focus();
                sendCodeBtn.textContent = 'Resend';
                sendCodeBtn.disabled = false;
                
                var remaining = CONFIG.MAX_EMAIL_REQUESTS - getEmailRequestCount(email);
                if (remaining <= 0) {
                    sendCodeBtn.disabled = true;
                    sendCodeBtn.textContent = 'Limit reached';
                }
                
                updateRegButton();
                if (typeof showToast === 'function') showToast('Code sent!', 'success');
            })
            .catch(function(error) {
                console.error('EmailJS ERROR:', error);
                emailStatus.textContent = 'Failed to send';
                emailStatus.style.color = 'var(--danger)';
                sendCodeBtn.textContent = 'Send Code';
                sendCodeBtn.disabled = false;
                
                var remaining = CONFIG.MAX_EMAIL_REQUESTS - getEmailRequestCount(email);
                if (remaining <= 0) {
                    sendCodeBtn.disabled = true;
                    sendCodeBtn.textContent = 'Limit reached';
                }
                
                if (typeof showToast === 'function') showToast('Failed', 'error');
            });
        });

        // VERIFY CODE
        verifyCodeBtn.addEventListener('click', function() {
            var code = codeInput.value.trim();
            console.log('Verify code:', code, 'Expected:', regState.generatedCode);
            
            if (code === regState.generatedCode) {
                console.log('Code correct!');
                regState.emailVerified = true;
                codeStatus.textContent = 'Verified!';
                codeStatus.style.color = 'var(--success)';
                codeInput.disabled = true;
                verifyCodeBtn.disabled = true;
                updateRegButton();
                
                if (typeof showToast === 'function') showToast('Verified!', 'success');
                
                setTimeout(function() {
                    enterChat();
                }, 500);
            } else {
                console.log('Wrong code');
                codeStatus.textContent = 'Wrong code';
                codeStatus.style.color = 'var(--danger)';
                codeInput.value = '';
                codeInput.focus();
            }
        });

        codeInput.addEventListener('input', function() {
            codeInput.value = codeInput.value.replace(/[^0-9]/g, '');
            if (codeInput.value.length === 6) {
                verifyCodeBtn.click();
            }
        });

        function updateRegButton() {
            var nameValid = nameInput.value.trim().length >= 1;
            var usernameStatusColor = usernameStatus.style.color;
            var usernameValid = (usernameStatusColor === 'rgb(16, 185, 129)' || usernameStatus.textContent === 'Available');
            var emailValid = regState.emailVerified;
            
            regBtn.disabled = !(nameValid && usernameValid && emailValid);
        }

        nameInput.addEventListener('input', function() {
            regState.name = nameInput.value.trim();
            updateRegButton();
        });

        // ENTER CHAT BUTTON
        regBtn.addEventListener('click', function() {
            if (regBtn.disabled) return;
            enterChat();
        });

        emailInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendCodeBtn.click();
            }
        });

        updateRegButton();
        console.log('Registration fully initialized');
    }

    // Глобальные функции
    window.changeNamePrompt = function() {
        var name = prompt('New name:', currentUser ? currentUser.name : '');
        if (name && name.trim() && currentUser) {
            currentUser.name = name.trim();
            saveUserToStorage(currentUser);
            updateProfile(name.trim());
            showToast('Name changed', 'success');
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
                        showToast('Avatar updated', 'success');
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    window.exportHistory = function(format) {
        fetch(API_URL + '/api/export/' + (format || 'json'))
            .then(function(r) { return r.blob(); })
            .then(function(blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'chat.' + (format || 'json');
                a.click();
                showToast('Exported', 'success');
            });
    };

    window.openProblemReport = function() {
        var text = prompt('Describe the problem:');
        if (text && text.trim()) {
            sendToServer({ type: 'report', reason: text.trim() });
            showToast('Report sent', 'success');
        }
    };

    document.addEventListener('DOMContentLoaded', init);
    console.log('main.js loaded');
})();