// frontend/assets/js/markdown.js

// Парсинг Markdown-подобного текста в HTML
function parseMarkdown(text) {
    if (!text) return '';
    
    let html = escapeHtml(text);
    
    // Жирный: **text** или __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Курсив: *text* или _text_ (но не внутри ** или __)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');
    
    // Зачёркнутый: ~~text~~
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Моноширинный: `text`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Моноширинный блок: ```text```
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Спойлер: ||text||
    html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
    
    // Ссылка: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        return `<a href="${url}" class="chat-link" data-url="${url}" onclick="handleLinkClick(event)">${text}</a>`;
    });
    
    // Автоматические ссылки (которые не внутри тегов)
    html = html.replace(/(?<!href=")(?<!href=')(?<!">)(https?:\/\/[^\s<]+)/g, (match, url) => {
        // Убираем возможные знаки препинания в конце
        let cleanUrl = url.replace(/[.,;:!?)]+$/, '');
        return `<a href="${cleanUrl}" class="chat-link" data-url="${cleanUrl}" onclick="handleLinkClick(event)">${cleanUrl}</a>`;
    });
    
    // Цитата: > text
    const lines = html.split('\n');
    let inBlockquote = false;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('&gt; ')) {
            if (!inBlockquote) {
                result.push('<blockquote>');
                inBlockquote = true;
            }
            result.push(lines[i].replace('&gt; ', ''));
        } else {
            if (inBlockquote) {
                result.push('</blockquote>');
                inBlockquote = false;
            }
            result.push(lines[i]);
        }
    }
    
    if (inBlockquote) {
        result.push('</blockquote>');
    }
    
    html = result.join('\n');
    
    // Упоминания: @username
    html = html.replace(/@([a-zA-Z0-9_]{3,})/g, '<span class="mention" data-username="$1">@$1</span>');
    
    return html;
}

// Обработчик клика по ссылке
function handleLinkClick(event) {
    event.preventDefault();
    const url = event.target.dataset.url || event.target.href;
    
    if (!url) return;
    
    // Показываем подтверждение
    showLinkConfirmation(url);
}

// Простое форматирование (без ссылок, для превью)
function parseMarkdownSimple(text) {
    if (!text) return '';
    
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/\|\|(.+?)\|\|/g, '[spoiler]');
    
    return html;
}

// Получение чистого текста (без форматирования)
function stripMarkdown(text) {
    if (!text) return '';
    
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '[code]')
        .replace(/\|\|(.+?)\|\|/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^> /gm, '');
}

// Подсветка синтаксиса для кода
function highlightCode(code, language = '') {
    // Простая подсветка, можно заменить на highlight.js
    let html = escapeHtml(code);
    
    // Ключевые слова
    const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch'];
    
    keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'g');
        html = html.replace(regex, `<span class="keyword">${kw}</span>`);
    });
    
    // Строки
    html = html.replace(/(['"])(.+?)\1/g, '<span class="string">$1$2$1</span>');
    
    // Комментарии
    html = html.replace(/(\/\/.+)/g, '<span class="comment">$1</span>');
    
    return html;
}

// Вставка форматирования в поле ввода
function insertFormatting(input, format) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    
    let replacement = '';
    let cursorOffset = 0;
    
    switch (format) {
        case 'bold':
            replacement = `**${selected || 'bold'}**`;
            cursorOffset = selected ? replacement.length : 2;
            break;
        case 'italic':
            replacement = `*${selected || 'italic'}*`;
            cursorOffset = selected ? replacement.length : 1;
            break;
        case 'strikethrough':
            replacement = `~~${selected || 'strikethrough'}~~`;
            cursorOffset = selected ? replacement.length : 2;
            break;
        case 'code':
            replacement = `\`${selected || 'code'}\``;
            cursorOffset = selected ? replacement.length : 1;
            break;
        case 'spoiler':
            replacement = `||${selected || 'spoiler'}||`;
            cursorOffset = selected ? replacement.length : 2;
            break;
        case 'link':
            replacement = `[${selected || 'text'}](url)`;
            cursorOffset = selected ? replacement.length : 1;
            break;
        case 'quote':
            replacement = `> ${selected || 'quote'}`;
            cursorOffset = replacement.length;
            break;
    }
    
    input.value = text.substring(0, start) + replacement + text.substring(end);
    input.focus();
    input.setSelectionRange(start + cursorOffset, start + cursorOffset);
    
    // Триггерим input event
    input.dispatchEvent(new Event('input'));
}

// Добавление стилей для маркдаун элементов
function addMarkdownStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .spoiler {
            background: var(--text-secondary);
            color: transparent;
            border-radius: 3px;
            padding: 1px 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .spoiler:hover, .spoiler.revealed {
            background: rgba(255,255,255,0.1);
            color: inherit;
        }
        
        .chat-link {
            color: var(--accent);
            text-decoration: none;
            cursor: pointer;
        }
        .chat-link:hover {
            text-decoration: underline;
        }
        
        code {
            background: rgba(0,0,0,0.3);
            padding: 1px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: rgba(0,0,0,0.3);
            padding: 8px 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 4px 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            border-radius: 0;
        }
        
        blockquote {
            border-left: 3px solid var(--accent);
            padding-left: 10px;
            margin: 4px 0;
            opacity: 0.9;
        }
        
        .mention {
            color: var(--accent);
            cursor: pointer;
            font-weight: 500;
        }
        .mention:hover {
            text-decoration: underline;
        }
        
        .keyword { color: #c792ea; }
        .string { color: #c3e88d; }
        .comment { color: #546e7a; font-style: italic; }
        
        del {
            opacity: 0.6;
        }
    `;
    document.head.appendChild(style);
}

// Инициализация стилей
addMarkdownStyles();
