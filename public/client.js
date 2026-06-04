const socket = io();

const boardElement = document.getElementById('board');
const wordInput = document.getElementById('word-input');
const roleDisplay = document.getElementById('role-display');
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display');
const restartBtn = document.getElementById('restart-btn');
const shuriScoreDisplay = document.getElementById('shuri-score');
const challiScoreDisplay = document.getElementById('challi-score');
const waitingOverlay = document.getElementById('waiting-overlay');
const waitingCharacter = document.getElementById('waiting-character');
const waitingRole = document.getElementById('waiting-role');
const waitingTitle = document.getElementById('waiting-title');


let myRole = null;

restartBtn.addEventListener('click', () => {
    socket.emit('requestRestart');
});

socket.on('init', (data) => {
    myRole = data.role;

    if (myRole === 'p1') {
        roleDisplay.innerText = '당신은 슈리입니다.';
        roleDisplay.style.color = '#4f46e5';
    } else if (myRole === 'p2') {
        roleDisplay.innerText = '당신은 챌리입니다.';
        roleDisplay.style.color = '#e11d48';
    } else {
        roleDisplay.innerText = '자리가 찼습니다. 관전 중입니다.';
        roleDisplay.style.color = '#66748a';
    }

    updateTimerUI(data.timeLeft);
    renderBoard(data.board);

    if (data.gameStarted && (myRole === 'p1' || myRole === 'p2')) {
        hideWaitingOverlay();
        enableInput();
    } else {
        wordInput.disabled = true;
        wordInput.placeholder = '다른 플레이어를 기다리는 중입니다...';
        showWaitingOverlay();
    }
});

socket.on('gameStart', () => {
    hideWaitingOverlay();

    if (myRole === 'p1' || myRole === 'p2') {
        enableInput();
    }

    if (myRole === 'p1') {
        roleDisplay.innerText = '대결 시작! 당신은 슈리입니다.';
    } else if (myRole === 'p2') {
        roleDisplay.innerText = '대결 시작! 당신은 챌리입니다.';
    }
});

socket.on('boardReset', (data) => {
    wordInput.disabled = true;
    wordInput.placeholder = '다른 플레이어를 기다리는 중입니다...';
    wordInput.value = '';

    updateTimerUI(data.timeLeft);
    boardElement.innerHTML = '';
    renderBoard(data.board);

    if (myRole === 'p1' || myRole === 'p2') {
        showWaitingOverlay();
    }
});

socket.on('timerUpdate', (timeLeft) => {
    updateTimerUI(timeLeft);
});

socket.on('updateBoard', (board) => {
    renderBoard(board);
});

socket.on('gameOver', (data) => {
    alert(`게임 종료 (${data.reason})\n\n결과: ${data.winner}\n슈리: ${data.p1Count}개 vs 챌리: ${data.p2Count}개`);
    wordInput.disabled = true;
    wordInput.placeholder = '게임이 종료되었습니다.';
    wordInput.value = '';
});

function enableInput() {
    wordInput.disabled = false;
    wordInput.placeholder = '여기에 단어를 입력하고 엔터!';
    wordInput.focus();
}

function updateTimerUI(timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    timerDisplay.innerText = `남은 시간: ${formattedTime}`;
    timerDisplay.style.color = timeLeft <= 10 ? '#e11d48' : '#101827';
}

function showWaitingOverlay() {
    waitingOverlay.classList.remove('hidden');

    if (myRole === 'p1') {
        waitingCharacter.src = 'shuri.png';
        waitingRole.innerText = '당신은 슈리입니다';
        waitingRole.style.color = '#4f46e5';
        waitingTitle.innerText = '챌리를 기다리는 중...';
    } else if (myRole === 'p2') {
        waitingCharacter.src = 'challi.png';
        waitingRole.innerText = '당신은 챌리입니다';
        waitingRole.style.color = '#e11d48';
        waitingTitle.innerText = '슈리를 기다리는 중...';
    } else {
        waitingCharacter.src = 'shuri.png';
        waitingRole.innerText = '관전 모드입니다';
        waitingRole.style.color = '#66748a';
        waitingTitle.innerText = '이미 대결 인원이 가득 찼습니다';
    }
}

function hideWaitingOverlay() {
    waitingOverlay.classList.add('hidden');
}

function renderBoard(board) {
    if (boardElement.children.length === 0) {
        board.forEach((tile) => {
            const tileDiv = document.createElement('div');
            tileDiv.classList.add('tile');
            tileDiv.id = `tile-${tile.id}`;
            tileDiv.innerText = tile.word;
            boardElement.appendChild(tileDiv);
        });
    }

    let p1Count = 0;
    let p2Count = 0;

    board.forEach((tile) => {
        const tileDiv = document.getElementById(`tile-${tile.id}`);
        if (!tileDiv) return;

        const isCurrentlyP1 = tileDiv.classList.contains('p1');
        const isCurrentlyP2 = tileDiv.classList.contains('p2');
        const currentOwner = isCurrentlyP1 ? 'p1' : (isCurrentlyP2 ? 'p2' : null);

        if (tile.owner !== currentOwner) {
            tileDiv.classList.remove('p1', 'p2');

            if (tile.owner) {
                tileDiv.classList.add(tile.owner);
                tileDiv.classList.remove('pop-ani');
                void tileDiv.offsetWidth;
                tileDiv.classList.add('pop-ani');
            }
        }

        if (tile.owner === 'p1') p1Count++;
        if (tile.owner === 'p2') p2Count++;
    });

    scoreDisplay.innerText = `SHURI ${p1Count}  VS  ${p2Count} CHALLI`;
    shuriScoreDisplay.innerText = p1Count;
    challiScoreDisplay.innerText = p2Count;
}

wordInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;

    const text = wordInput.value.trim();
    if (text) {
        socket.emit('submitWord', text);
    }
    wordInput.value = '';
});
