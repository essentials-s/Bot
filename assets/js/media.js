// frontend/assets/js/media.js

// Состояние медиа
const mediaState = {
    pendingFiles: [],      // Файлы ожидающие отправки
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImages: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideos: ['video/mp4', 'video/webm', 'video/ogg'],
    uploading: false,
};

// Инициализация медиа
function initMedia() {
    // Обработчики для input[type=file]
    document.getElementById('photoInput').addEventListener('change', (e) => handleFileSelect(e, 'image'));
    document.getElementById('videoInput').addEventListener('change', (e) => handleFileSelect(e, 'video'));
    document.getElementById('fileInput').addEventListener('change', (e) => handleFileSelect(e, 'file'));
    document.getElementById('cameraInput').addEventListener('change', (e) => handleFileSelect(e, 'camera'));
}

// Открыть выбор фото
function openPhotoPicker() {
    document.getElementById('photoInput').click();
}

// Открыть выбор видео
function openVideoPicker() {
    document.getElementById('videoInput').click();
}

// Открыть выбор файлов
function openFilePicker() {
    document.getElementById('fileInput').click();
}

// Открыть камеру
function openCamera() {
    document.getElementById('cameraInput').click();
}

// Обработка выбранных файлов
function handleFileSelect(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    files.forEach(file => {
        // Проверка размера
        if (file.size > mediaState.maxFileSize) {
            showError(t('errorFileTooBig'));
            return;
        }
        
        // Проверка типа
        if (type === 'image' && !mediaState.allowedImages.includes(file.type)) {
            showError('Invalid image format');
            return;
        }
        if (type === 'video' && !mediaState.allowedVideos.includes(file.type)) {
            showError('Invalid video format');
            return;
        }
        
        // Добавляем в очередь
        const preview = {
            id: generateId(),
            file: file,
            type: type === 'camera' ? (file.type.startsWith('video/') ? 'video' : 'image') : type,
            url: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
        };
        
        mediaState.pendingFiles.push(preview);
        addMediaPreview(preview);
    });
    
    // Очищаем input
    event.target.value = '';
}

// Добавление превью в поле ввода
function addMediaPreview(preview) {
    const container = document.getElementById('mediaPreview');
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = 'media-preview-item';
    item.id = 'preview-' + preview.id;
    
    if (preview.type === 'image') {
        const img = document.createElement('img');
        img.src = preview.url;
        item.appendChild(img);
    } else if (preview.type === 'video') {
        const video = document.createElement('video');
        video.src = preview.url;
        video.muted = true;
        item.appendChild(video);
    } else {
        const icon = document.createElement('div');
        icon.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--bg-input);';
        icon.textContent = '📄';
        item.appendChild(icon);
    }
    
    // Кнопка удаления
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove';
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeMediaPreview(preview.id);
    };
    item.appendChild(removeBtn);
    
    // Клик для просмотра
    item.addEventListener('click', () => {
        if (preview.type === 'image' || preview.type === 'video') {
            openMediaViewer(preview.url, preview.type);
        }
    });
    
    container.appendChild(item);
    container.style.display = 'flex';
}

// Удаление превью
function removeMediaPreview(id) {
    // Удаляем из массива
    mediaState.pendingFiles = mediaState.pendingFiles.filter(f => f.id !== id);
    
    // Удаляем элемент
    const element = document.getElementById('preview-' + id);
    if (element) {
        // Освобождаем URL
        const preview = mediaState.pendingFiles.find(f => f.id === id);
        if (preview && preview.url) {
            URL.revokeObjectURL(preview.url);
        }
        element.remove();
    }
    
    // Скрываем контейнер если пусто
    const container = document.getElementById('mediaPreview');
    if (container && mediaState.pendingFiles.length === 0) {
        container.style.display = 'none';
    }
}

// Очистка всех превью
function clearMediaPreviews() {
    mediaState.pendingFiles.forEach(p => {
        if (p.url) URL.revokeObjectURL(p.url);
    });
    mediaState.pendingFiles = [];
    const container = document.getElementById('mediaPreview');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
}

// Загрузка файла на сервер (возвращает URL)
async function uploadFile(file) {
    return new Promise((resolve, reject) => {
        // Для файлов больше 1MB используем сжатие если это изображение
        if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
            compressImage(file).then(resolve).catch(() => {
                // Если сжатие не удалось, возвращаем data URL
                const reader = new FileReader();
                reader.onload = () => resolve({ url: reader.result, name: file.name, size: file.size });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } else {
            // Для остальных файлов используем data URL (в реальном проекте - загрузка на сервер)
            const reader = new FileReader();
            reader.onload = () => resolve({ url: reader.result, name: file.name, size: file.size });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }
    });
}

// Сжатие изображения
function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({ url: reader.result, name: file.name, size: blob.size });
                    reader.readAsDataURL(blob);
                }, file.type, quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Загрузка всех файлов и отправка сообщения
async function sendMessageWithMedia(text, replyTo = null) {
    if (mediaState.pendingFiles.length === 0 && !text) return;
    
    notifyFileUploading();
    mediaState.uploading = true;
    
    try {
        // Загружаем каждый файл
        for (const preview of mediaState.pendingFiles) {
            const uploaded = await uploadFile(preview.file);
            
            sendMessage(
                text || '', 
                replyTo, 
                preview.type === 'image' ? 'image' : preview.type === 'video' ? 'video' : 'file',
                uploaded
            );
            
            // Небольшая задержка между отправками
            await new Promise(r => setTimeout(r, 200));
        }
        
        // Если есть текст без файлов
        if (text && mediaState.pendingFiles.length === 0) {
            sendMessage(text, replyTo);
        }
        
        notifyFileUploaded();
    } catch (e) {
        console.error('Upload failed:', e);
        notifyFileError();
    }
    
    // Очищаем
    clearMediaPreviews();
    mediaState.uploading = false;
}

// Открытие просмотрщика медиа
function openMediaViewer(url, type) {
    const viewer = document.getElementById('mediaViewer');
    const content = document.getElementById('mediaContent');
    if (!viewer || !content) return;
    
    content.innerHTML = '';
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = url;
        content.appendChild(img);
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        content.appendChild(video);
    }
    
    viewer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Закрытие просмотрщика
function closeMediaViewer() {
    const viewer = document.getElementById('mediaViewer');
    const content = document.getElementById('mediaContent');
    if (!viewer) return;
    
    viewer.style.display = 'none';
    if (content) content.innerHTML = '';
    document.body.style.overflow = '';
}

// Скачивание медиа
function downloadMedia(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Инициализация просмотрщика
function initMediaViewer() {
    document.getElementById('closeViewer').addEventListener('click', closeMediaViewer);
    document.getElementById('viewerMenu').addEventListener('click', (e) => {
        e.stopPropagation();
        // Показать меню с опцией Скачать
        const url = document.querySelector('#mediaContent img, #mediaContent video')?.src;
        if (url) {
            downloadMedia(url);
        }
    });
    
    // Закрытие по клику на фон
    document.getElementById('mediaViewer').addEventListener('click', (e) => {
        if (e.target === document.getElementById('mediaViewer')) {
            closeMediaViewer();
        }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMediaViewer();
        }
    });
}

// Создание HTML для медиа-сообщения
function createMediaMessageHtml(msg) {
    if (msg.type === 'image') {
        return `<img src="${msg.fileUrl}" class="msg-image" onclick="openMediaViewer('${msg.fileUrl}', 'image')" loading="lazy">`;
    }
    if (msg.type === 'video') {
        return `<video src="${msg.fileUrl}" class="msg-video" onclick="openMediaViewer('${msg.fileUrl}', 'video')" controls preload="metadata"></video>`;
    }
    if (msg.type === 'file') {
        const size = msg.fileSize ? formatFileSize(msg.fileSize) : '';
        return `
            <div class="file-message" onclick="downloadMedia('${msg.fileUrl}', '${msg.fileName || 'file'}')">
                <span class="file-icon">📄</span>
                <div class="file-info">
                    <span class="file-name">${msg.fileName || 'File'}</span>
                    ${size ? `<span class="file-size">${size}</span>` : ''}
                </div>
                <span class="file-download">⬇</span>
            </div>
        `;
    }
    if (msg.type === 'voice') {
        return createVoiceMessageHtml(msg);
    }
    return '';
}

// Инициализация при загрузке
initMedia();
initMediaViewer();
