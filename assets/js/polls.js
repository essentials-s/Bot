// frontend/assets/js/polls.js

// Создание модального окна опроса/викторины
function openPollModal(type = 'poll') {
    const modal = document.getElementById('pollModal');
    if (!modal) return;

    const isQuiz = type === 'quiz';
    
    modal.innerHTML = `
        <div class="modal" style="max-width:450px">
            <h2>${isQuiz ? t('quiz') : t('poll')}</h2>
            
            <div class="input-group">
                <input type="text" id="pollQuestion" placeholder="${t('pollQuestion')}" maxlength="200">
            </div>
            
            <div id="pollOptionsContainer">
                <div class="input-group poll-option">
                    <input type="text" class="poll-option-input" placeholder="${t('pollOptions')} 1" maxlength="100">
                    ${isQuiz ? '<span class="correct-badge" style="display:none">✓</span>' : ''}
                </div>
                <div class="input-group poll-option">
                    <input type="text" class="poll-option-input" placeholder="${t('pollOptions')} 2" maxlength="100">
                    ${isQuiz ? '<span class="correct-badge" style="display:none">✓</span>' : ''}
                </div>
            </div>
            
            <button id="addPollOption" class="btn-secondary" style="margin-bottom:12px">${t('pollAddOption')}</button>
            
            ${!isQuiz ? `
                <div class="input-group" style="display:flex;align-items:center;gap:8px">
                    <input type="checkbox" id="pollAnonymous">
                    <label for="pollAnonymous" style="font-size:13px">${t('pollAnonymous')}</label>
                </div>
                <div class="input-group" style="display:flex;align-items:center;gap:8px">
                    <input type="checkbox" id="pollMultiple">
                    <label for="pollMultiple" style="font-size:13px">${t('pollMultiple')}</label>
                </div>
            ` : `
                <div class="input-group">
                    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">${t('quizCorrect')}:</p>
                    <select id="quizCorrect" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-light);border-radius:8px;color:var(--text-primary)">
                        <option value="0">${t('pollOptions')} 1</option>
                        <option value="1">${t('pollOptions')} 2</option>
                    </select>
                </div>
                <div class="input-group">
                    <input type="text" id="quizExplanation" placeholder="${t('quizExplanation')}" maxlength="200">
                </div>
            `}
            
            <button id="createPollBtn" class="btn-primary">${t('pollCreate')}</button>
            <button id="closePollModal" class="btn-secondary" style="margin-top:8px">${t('cancel')}</button>
        </div>
    `;

    modal.style.display = 'flex';

    // Обработчики
    let optionCount = 2;

    document.getElementById('addPollOption').addEventListener('click', () => {
        if (optionCount >= 10) return;
        optionCount++;
        const container = document.getElementById('pollOptionsContainer');
        const div = document.createElement('div');
        div.className = 'input-group poll-option';
        div.innerHTML = `
            <input type="text" class="poll-option-input" placeholder="${t('pollOptions')} ${optionCount}" maxlength="100">
            ${isQuiz ? '<span class="correct-badge" style="display:none">✓</span>' : ''}
        `;
        container.appendChild(div);

        // Обновляем select для викторины
        if (isQuiz) {
            const select = document.getElementById('quizCorrect');
            const opt = document.createElement('option');
            opt.value = optionCount - 1;
            opt.textContent = t('pollOptions') + ' ' + optionCount;
            select.appendChild(opt);
        }
    });

    document.getElementById('closePollModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    document.getElementById('createPollBtn').addEventListener('click', () => {
        const question = document.getElementById('pollQuestion').value.trim();
        if (!question) {
            showError('Enter question');
            return;
        }

        const optionInputs = document.querySelectorAll('.poll-option-input');
        const options = [];
        optionInputs.forEach(input => {
            const val = input.value.trim();
            if (val) options.push(val);
        });

        if (options.length < 2) {
            showError('Minimum 2 options');
            return;
        }

        const pollData = {
            question,
            options,
            pollsType: type,
            anonymous: isQuiz ? false : document.getElementById('pollAnonymous')?.checked || false,
            multiple: isQuiz ? false : document.getElementById('pollMultiple')?.checked || false,
        };

        if (isQuiz) {
            pollData.correctOption = parseInt(document.getElementById('quizCorrect').value);
            pollData.explanation = document.getElementById('quizExplanation').value.trim();
        }

        createPoll(
            pollData.question,
            pollData.options,
            pollData.pollsType,
            pollData.anonymous,
            pollData.multiple,
            null
        );

        modal.style.display = 'none';
        showSuccess(isQuiz ? 'Quiz created' : 'Poll created');
    });

    // Закрытие по клику на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Создание HTML для опроса/викторины в чате
function createPollHtml(poll) {
    const totalVotes = Object.values(poll.votes).length;
    const isQuiz = poll.type === 'quiz';
    const isClosed = poll.closed;

    let html = `<div class="poll-container" data-poll-id="${poll.id}">`;
    html += `<div class="poll-question">${isQuiz ? '❓' : '📊'} ${escapeHtml(poll.question)}</div>`;
    
    // Если викторина и пользователь уже ответил - показываем правильный ответ
    const userVote = poll.votes[currentUser?.username];
    const showResults = isClosed || (isQuiz && userVote !== undefined);

    poll.options.forEach((option, index) => {
        const voteCount = Object.values(poll.votes).filter(v => v === index).length;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isCorrect = isQuiz && index === poll.correctOption;
        const isSelected = userVote === index;
        
        let barColor = 'var(--accent)';
        if (showResults && isQuiz) {
            if (isCorrect) barColor = 'var(--success)';
            else if (isSelected && !isCorrect) barColor = 'var(--danger)';
        }

        html += `
            <div class="poll-option ${isSelected ? 'selected' : ''} ${showResults && isCorrect ? 'correct' : ''}" 
                 data-index="${index}" 
                 onclick="${isClosed ? '' : `votePoll('${poll.id}', ${index})`}">
                <div class="poll-option-bar" style="width:${showResults ? percentage : 0}%;background:${barColor}"></div>
                <span class="poll-option-text">${escapeHtml(option)}</span>
                ${showResults ? `<span class="poll-option-votes">${percentage}% (${voteCount})</span>` : ''}
                ${showResults && isCorrect ? '<span class="poll-correct">✓</span>' : ''}
            </div>
        `;
    });

    html += `<div class="poll-footer">`;
    html += `<span class="poll-total">${totalVotes} votes</span>`;
    if (poll.anonymous) html += '<span class="poll-anonymous">Anonymous</span>';
    if (isQuiz && poll.explanation && showResults) {
        html += `<div class="poll-explanation">💡 ${escapeHtml(poll.explanation)}</div>`;
    }
    if (isClosed) html += '<span class="poll-closed">Closed</span>';
    html += `</div>`;
    html += `</div>`;

    return html;
}

// Обновление опроса в DOM
function updatePollInDOM(pollId, votes) {
    const pollEl = document.querySelector(`[data-poll-id="${pollId}"]`);
    if (!pollEl) return;

    const totalVotes = Object.values(votes).length;
    const poll = allPolls.find(p => p.id === pollId);
    if (!poll) return;

    const isQuiz = poll.type === 'quiz';
    const userVote = votes[currentUser?.username];
    const showResults = poll.closed || (isQuiz && userVote !== undefined);

    poll.options.forEach((option, index) => {
        const optionEl = pollEl.querySelector(`[data-index="${index}"]`);
        if (!optionEl) return;

        const voteCount = Object.values(votes).filter(v => v === index).length;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isCorrect = isQuiz && index === poll.correctOption;
        const isSelected = userVote === index;

        let barColor = 'var(--accent)';
        if (showResults && isQuiz) {
            if (isCorrect) barColor = 'var(--success)';
            else if (isSelected && !isCorrect) barColor = 'var(--danger)';
        }

        const bar = optionEl.querySelector('.poll-option-bar');
        const votesEl = optionEl.querySelector('.poll-option-votes');

        if (bar) {
            bar.style.width = showResults ? percentage + '%' : '0%';
            bar.style.background = barColor;
        }
        if (votesEl) {
            votesEl.textContent = showResults ? percentage + '% (' + voteCount + ')' : '';
        }
        if (showResults && isCorrect) {
            optionEl.classList.add('correct');
            if (!optionEl.querySelector('.poll-correct')) {
                const check = document.createElement('span');
                check.className = 'poll-correct';
                check.textContent = '✓';
                optionEl.appendChild(check);
            }
        }
        if (isSelected) {
            optionEl.classList.add('selected');
        }
    });

    // Обновляем счетчик
    const totalEl = pollEl.querySelector('.poll-total');
    if (totalEl) {
        totalEl.textContent = totalVotes + ' votes';
    }
}

// Все опросы (загружаются при init)
let allPolls = [];

// Обработчики событий опросов
function handleNewPoll(data) {
    allPolls.push(data.poll);
    // Рендерится при следующем обновлении чата
}

function handlePollUpdated(data) {
    const poll = allPolls.find(p => p.id === data.pollId);
    if (poll) {
        poll.votes = data.votes;
    }
    updatePollInDOM(data.pollId, data.votes);
}

function handlePollClosed(data) {
    const poll = allPolls.find(p => p.id === data.pollId);
    if (poll) {
        poll.closed = 1;
    }
    updatePollInDOM(data.pollId, poll?.votes || {});
}

// Стили для опросов
function addPollStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .poll-container {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius);
            padding: 12px;
            margin: 4px 0;
            max-width: 350px;
        }
        .poll-question {
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 10px;
        }
        .poll-option {
            position: relative;
            padding: 8px 12px;
            margin-bottom: 6px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            overflow: hidden;
            background: var(--bg-input);
            border: 1px solid transparent;
            transition: var(--transition);
            font-size: 13px;
        }
        .poll-option:hover {
            border-color: var(--accent);
        }
        .poll-option.selected {
            border-color: var(--accent);
        }
        .poll-option.correct {
            border-color: var(--success);
            background: rgba(16,185,129,0.1);
        }
        .poll-option-bar {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            transition: width 0.3s ease;
            z-index: 0;
            opacity: 0.3;
        }
        .poll-option-text {
            position: relative;
            z-index: 1;
        }
        .poll-option-votes {
            position: relative;
            z-index: 1;
            float: right;
            font-size: 11px;
            opacity: 0.7;
        }
        .poll-correct {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--success);
            font-size: 16px;
            z-index: 2;
        }
        .poll-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 8px;
        }
        .poll-explanation {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 6px;
            font-style: italic;
        }
        .poll-closed {
            color: var(--warning);
            font-weight: 600;
        }
        .poll-modal .poll-option {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: default;
        }
        .poll-modal .poll-option-input {
            flex: 1;
        }
        .correct-badge {
            color: var(--success);
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

addPollStyles();
