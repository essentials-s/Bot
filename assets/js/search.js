// frontend/assets/js/search.js

// Состояние поиска
const searchState = {
    active: false,
    query: '',
    results: [],
    currentIndex: -1,
    allMessages: [],
};

// Инициализация поиска
function initSearch() {
    // Обработка Ctrl+F
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            openSearch();
        }
        if (e.key === 'Escape' && searchState.active) {
            closeSearch();
        }
    });
}

// Открыть поиск
function openSearch() {
    if (searchState.active) return;

    // Создаем панель поиска
    const searchBar = document.createElement('div');
    searchBar.id = 'searchBar';
    searchBar.className = 'search-bar';
    searchBar.innerHTML = `
        <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="${t('searchPlaceholder')}" autocomplete="off">
            <span id="searchCount" class="search-count"></span>
            <button id="searchPrev" class="search-nav-btn" title="Previous">▲</button>
            <button id="searchNext" class="search-nav-btn" title="Next">▼</button>
            <button id="searchClose" class="search-close-btn">✕</button>
        </div>
    `;

    const chatContainer = document.getElementById('chatContainer');
    const header = chatContainer.querySelector('.chat-header');
    header.after(searchBar);

    searchState.active = true;

    // Фокус на поле ввода
    const input = document.getElementById('searchInput');
    setTimeout(() => input.focus(), 100);

    // Собираем все сообщения для поиска
    searchState.allMessages = Array.from(document.querySelectorAll('.message')).map(el => ({
        element: el,
        text: el.querySelector('.msg-bubble')?.textContent?.toLowerCase() || '',
        messageId: el.dataset.messageId
    }));

    // Обработчики
    input.addEventListener('input', () => {
        searchState.query = input.value.trim().toLowerCase();
        performSearch();
    });

    document.getElementById('searchPrev').addEventListener('click', () => navigateResults(-1));
    document.getElementById('searchNext').addEventListener('click', () => navigateResults(1));
    document.getElementById('searchClose').addEventListener('click', closeSearch);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateResults(e.shiftKey ? -1 : 1);
        }
        if (e.key === 'Escape') {
            closeSearch();
        }
    });
}

// Выполнить поиск
function performSearch() {
    // Очищаем предыдущие результаты
    clearHighlights();
    searchState.results = [];
    searchState.currentIndex = -1;

    if (!searchState.query || searchState.query.length < 1) {
        updateSearchCount();
        return;
    }

    // Ищем совпадения
    searchState.allMessages.forEach(msg => {
        if (msg.text.includes(searchState.query)) {
            searchState.results.push(msg);
        }
    });

    // Подсвечиваем результаты
    highlightResults();
    updateSearchCount();

    // Переходим к первому результату
    if (searchState.results.length > 0) {
        navigateResults(1);
    }
}

// Подсветка результатов
function highlightResults() {
    searchState.results.forEach(msg => {
        msg.element.classList.add('search-match');
    });
}

// Очистка подсветки
function clearHighlights() {
    document.querySelectorAll('.message.search-match').forEach(el => {
        el.classList.remove('search-match');
    });
    document.querySelectorAll('.search-highlight').forEach(el => {
        el.outerHTML = el.textContent;
    });
}

// Навигация по результатам
function navigateResults(direction) {
    if (searchState.results.length === 0) return;

    // Убираем активный класс с текущего
    if (searchState.currentIndex >= 0 && searchState.currentIndex < searchState.results.length) {
        searchState.results[searchState.currentIndex].element.classList.remove('search-active');
    }

    // Обновляем индекс
    if (direction > 0) {
        searchState.currentIndex++;
        if (searchState.currentIndex >= searchState.results.length) {
            searchState.currentIndex = 0;
        }
    } else {
        searchState.currentIndex--;
        if (searchState.currentIndex < 0) {
            searchState.currentIndex = searchState.results.length - 1;
        }
    }

    // Подсвечиваем активный
    const active = searchState.results[searchState.currentIndex];
    if (active) {
        active.element.classList.add('search-active');
        
        // Скроллим к сообщению
        active.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Подсвечиваем текст внутри сообщения
        highlightTextInElement(active.element, searchState.query);
    }

    updateSearchCount();
}

// Подсветка текста внутри элемента
function highlightTextInElement(element, query) {
    const bubble = element.querySelector('.msg-bubble');
    if (!bubble) return;

    // Очищаем предыдущую подсветку в этом элементе
    bubble.querySelectorAll('.search-highlight').forEach(el => {
        el.outerHTML = el.textContent;
    });

    // Подсвечиваем совпадения
    const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach(node => {
        const text = node.textContent;
        const lower = text.toLowerCase();
        const index = lower.indexOf(query.toLowerCase());
        
        if (index >= 0) {
            const span = document.createElement('span');
            span.className = 'search-highlight';
            span.textContent = text.substring(index, index + query.length);
            
            const before = document.createTextNode(text.substring(0, index));
            const after = document.createTextNode(text.substring(index + query.length));
            
            const parent = node.parentNode;
            parent.insertBefore(before, node);
            parent.insertBefore(span, node);
            parent.insertBefore(after, node);
            parent.removeChild(node);
        }
    });
}

// Обновление счетчика
function updateSearchCount() {
    const countEl = document.getElementById('searchCount');
    if (!countEl) return;

    if (searchState.results.length === 0 && searchState.query) {
        countEl.textContent = '0/0';
    } else if (searchState.results.length > 0) {
        countEl.textContent = `${searchState.currentIndex + 1}/${searchState.results.length}`;
    } else {
        countEl.textContent = '';
    }
}

// Закрыть поиск
function closeSearch() {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.remove();

    clearHighlights();
    searchState.active = false;
    searchState.query = '';
    searchState.results = [];
    searchState.currentIndex = -1;
    searchState.allMessages = [];
}

// Простой поиск (без UI, для вызова из кода)
function searchMessages(query) {
    return searchState.allMessages.filter(msg => 
        msg.text.includes(query.toLowerCase())
    );
}

// Добавление стилей для поиска
function addSearchStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .search-bar {
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border);
            padding: 8px 14px;
            animation: fadeIn 0.2s ease;
            flex-shrink: 0;
        }
        .search-input-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--bg-input);
            border-radius: 20px;
            padding: 6px 12px;
        }
        .search-input-wrapper input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 13px;
            outline: none;
            padding: 4px 0;
        }
        .search-input-wrapper input::placeholder {
            color: var(--text-muted);
        }
        .search-icon {
            font-size: 14px;
            opacity: 0.6;
        }
        .search-count {
            font-size: 11px;
            color: var(--text-muted);
            min-width: 40px;
            text-align: center;
        }
        .search-nav-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 12px;
            padding: 4px 6px;
            border-radius: 4px;
        }
        .search-nav-btn:hover {
            background: var(--border);
            color: var(--text-primary);
        }
        .search-close-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
        }
        .search-close-btn:hover {
            color: var(--text-primary);
        }
        .message.search-match {
            background: rgba(59,130,246,0.05);
            border-radius: 6px;
        }
        .message.search-active {
            background: rgba(59,130,246,0.12) !important;
            border: 1px solid var(--accent);
            border-radius: 8px;
        }
        .search-highlight {
            background: rgba(245,158,11,0.5);
            border-radius: 2px;
            padding: 0 1px;
        }
    `;
    document.head.appendChild(style);
}

addSearchStyles();
initSearch();
