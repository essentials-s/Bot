// frontend/assets/js/voice.js

// Состояние записи
const voiceState = {
    recording: false,
    mediaRecorder: null,
    audioChunks: [],
    startTime: 0,
    duration: 0,
    stream: null,
    locked: false, // Режим "заблокированной" записи (свайп вверх)
};

// Инициализация голосовых сообщений
function initVoice() {
    const micBtn = document.getElementById('micBtn');
    const msgInput = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!micBtn || !msgInput) return;
    
    // Показываем кнопку микрофона когда поле ввода пустое
    const toggleMicBtn = () => {
        const isEmpty = !msgInput.value.trim() && mediaState.pendingFiles.length === 0;
        if (isEmpty) {
            sendBtn.style.display = 'none';
            micBtn.style.display = 'flex';
        } else {
            sendBtn.style.display = 'flex';
            micBtn.style.display = 'none';
        }
    };
    
    msgInput.addEventListener('input', toggleMicBtn);
    
    // Начальные состояния
    toggleMicBtn();
    
    // Начало записи (нажатие на микрофон)
    micBtn.addEventListener('pointerdown', startRecording);
    micBtn.addEventListener('pointerup', stopRecording);
    micBtn.addEventListener('pointerleave', stopRecording);
    
    // Свайп для блокировки/отмены
    micBtn.addEventListener('pointermove', handleSwipe);
    
    // Предотвращаем всплытие
    micBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startRecording(e);
    });
    micBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopRecording(e);
    });
    micBtn.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleSwipe(e);
    });
}

// Начало записи
async function startRecording(event) {
    if (voiceState.recording) return;
    
    try {
        // Запрашиваем доступ к микрофону
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceState.stream = stream;
        
        // Создаем MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        });
        
        voiceState.mediaRecorder = mediaRecorder;
        voiceState.audioChunks = [];
        voiceState.startTime = Date.now();
        voiceState.recording = true;
        voiceState.locked = false;
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                voiceState.audioChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            if (voiceState.audioChunks.length === 0) return;
            
            const audioBlob = new Blob(voiceState.audioChunks, { type: mediaRecorder.mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            const duration = Math.round((Date.now() - voiceState.startTime) / 1000);
            
            // Проверяем, была ли отмена (очень короткая запись)
            if (duration < 1) {
                URL.revokeObjectURL(audioUrl);
                return;
            }
            
            // Если свайп влево - отмена
            if (voiceState.cancelled) {
                URL.revokeObjectURL(audioUrl);
                voiceState.cancelled = false;
                return;
            }
            
            // Отправляем голосовое
            sendVoiceMessage(audioUrl, duration);
            notifyVoiceSent();
        };
        
        // Начинаем запись
        mediaRecorder.start();
        
        // Показываем индикатор записи
        showRecordingIndicator();
        
        // Вибрируем если поддерживается
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
    } catch (e) {
        console.error('Failed to start recording:', e);
        showError('Microphone access denied');
    }
}

// Остановка записи
function stopRecording(event) {
    if (!voiceState.recording) return;
    
    const duration = (Date.now() - voiceState.startTime) / 1000;
    
    // Если запись заблокирована (свайп вверх), не останавливаем
    if (voiceState.locked) return;
    
    voiceState.recording = false;
    
    // Останавливаем MediaRecorder
    if (voiceState.mediaRecorder && voiceState.mediaRecorder.state === 'recording') {
        voiceState.mediaRecorder.stop();
    }
    
    // Останавливаем поток
    if (voiceState.stream) {
        voiceState.stream.getTracks().forEach(track => track.stop());
        voiceState.stream = null;
    }
    
    // Убираем индикатор
    hideRecordingIndicator();
}

// Обработка свайпа
function handleSwipe(event) {
    if (!voiceState.recording) return;
    
    const touch = event.touches ? event.touches[0] : event;
    const micBtn = document.getElementById('micBtn');
    const rect = micBtn.getBoundingClientRect();
    
    const deltaY = rect.top - touch.clientY;
    const deltaX = rect.left - touch.clientX;
    
    // Свайп вверх - блокировка записи
    if (deltaY > 60 && !voiceState.locked) {
        voiceState.locked = true;
        updateRecordingIndicator('locked');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
    
    // Свайп влево - отмена
    if (deltaX > 80) {
        voiceState.cancelled = true;
        voiceState.recording = false;
        
        if (voiceState.mediaRecorder && voiceState.mediaRecorder.state === 'recording') {
            voiceState.mediaRecorder.stop();
        }
        if (voiceState.stream) {
            voiceState.stream.getTracks().forEach(track => track.stop());
            voiceState.stream = null;
        }
        
        hideRecordingIndicator();
        showError('Recording cancelled');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
}

// Показать индикатор записи
function showRecordingIndicator() {
    let indicator = document.getElementById('recordingIndicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'recordingIndicator';
        indicator.className = 'recording-overlay';
        indicator.innerHTML = `
            <div class="recording-dot"></div>
            <span id="recordingText">${t('voiceRecord')}</span>
            <span id="recordingTimer">0:00</span>
        `;
        document.body.appendChild(indicator);
    }
    
    indicator.style.display = 'flex';
    
    // Обновляем таймер
    voiceState._timerInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - voiceState.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('recordingTimer').textContent = 
            mins + ':' + secs.toString().padStart(2, '0');
    }, 200);
}

// Обновить индикатор записи
function updateRecordingIndicator(state) {
    const text = document.getElementById('recordingText');
    if (!text) return;
    
    switch (state) {
        case 'locked':
            text.textContent = t('voiceRelease');
            break;
        case 'cancel':
            text.textContent = t('voiceCancel');
            text.style.color = 'var(--danger)';
            break;
        default:
            text.textContent = t('voiceRecord');
            text.style.color = '';
    }
}

// Скрыть индикатор записи
function hideRecordingIndicator() {
    const indicator = document.getElementById('recordingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
    if (voiceState._timerInterval) {
        clearInterval(voiceState._timerInterval);
        voiceState._timerInterval = null;
    }
}

// Создание HTML для голосового сообщения
function createVoiceMessageHtml(msg) {
    const duration = msg.duration || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationStr = mins + ':' + secs.toString().padStart(2, '0');
    
    return `
        <div class="voice-msg" data-audio="${msg.fileUrl}" data-duration="${duration}">
            <button class="voice-play-btn" onclick="toggleVoicePlay(this, '${msg.fileUrl}')" title="Play">
                ▶
            </button>
            <div class="voice-waveform">
                <div class="voice-progress" style="width:0%"></div>
            </div>
            <span class="voice-duration">${durationStr}</span>
        </div>
    `;
}

// Текущий воспроизводимый аудио
let currentAudio = null;
let currentAudioBtn = null;

// Воспроизведение / пауза голосового
function toggleVoicePlay(btn, audioUrl) {
    // Если уже играет это аудио - пауза
    if (currentAudio && currentAudio.src === audioUrl && !currentAudio.paused) {
        currentAudio.pause();
        btn.textContent = '▶';
        return;
    }
    
    // Останавливаем предыдущее
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentAudioBtn) {
            currentAudioBtn.textContent = '▶';
            const prevProgress = currentAudioBtn.parentElement.querySelector('.voice-progress');
            if (prevProgress) prevProgress.style.width = '0%';
        }
    }
    
    // Создаем новое аудио
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    currentAudioBtn = btn;
    
    btn.textContent = '⏸';
    
    audio.ontimeupdate = () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        const progressBar = btn.parentElement.querySelector('.voice-progress');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
        // Обновляем длительность
        const remaining = audio.duration - audio.currentTime;
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        const durationEl = btn.parentElement.querySelector('.voice-duration');
        if (durationEl) {
            durationEl.textContent = mins + ':' + secs.toString().padStart(2, '0');
        }
    };
    
    audio.onended = () => {
        btn.textContent = '▶';
        const progressBar = btn.parentElement.querySelector('.voice-progress');
        if (progressBar) progressBar.style.width = '0%';
        // Восстанавливаем исходную длительность
        const duration = btn.parentElement.dataset.duration || 0;
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const durationEl = btn.parentElement.querySelector('.voice-duration');
        if (durationEl) {
            durationEl.textContent = mins + ':' + secs.toString().padStart(2, '0');
        }
        currentAudio = null;
        currentAudioBtn = null;
    };
    
    audio.onerror = () => {
        btn.textContent = '▶';
        currentAudio = null;
        currentAudioBtn = null;
        showError('Failed to play audio');
    };
    
    audio.play().catch(e => {
        console.error('Play failed:', e);
        btn.textContent = '▶';
    });
}

// Инициализация
      initVoice();
