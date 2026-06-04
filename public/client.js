const socket = io();

const boardElement = document.getElementById('board');
const wordInput = document.getElementById('word-input');
const roleDisplay = document.getElementById('role-display');
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display');
// public/client.js 맨 위에 변수 선언 추가
const restartBtn = document.getElementById('restart-btn');

const shuriScoreDisplay = document.getElementById('shuri-score');
const challiScoreDisplay = document.getElementById('challi-score');

// public/client.js 맨 아래에 이벤트 및 리스너 추가

// 💡 1. 버튼 클릭 시 서버에 초기화 요청하기
restartBtn.addEventListener('click', () => {
    socket.emit('requestRestart');
});

// 💡 2. 서버로부터 리셋 신호를 받았을 때 화면 처리
socket.on('boardReset', (data) => {
    // 입력창 초기화 및 잠금
    wordInput.disabled = true;
    wordInput.placeholder = "다른 플레이어를 기다리는 중입니다...";
    wordInput.value = "";
    
    // 타이머 UI 초기화
    updateTimerUI(data.timeLeft);
    
    // 보드판 HTML 완전히 지우고 처음부터 다시 그리도록 유도
    boardElement.innerHTML = '';
    renderBoard(data.board);
});


let myRole = null;

// 초기 설정 수신
socket.on('init', (data) => {
    myRole = data.role;
    
    if (myRole === 'p1') {
    roleDisplay.innerText = "당신은 슈리팀입니다.";
    roleDisplay.style.color = "#4f46e5";
} else if (myRole === 'p2') {
    roleDisplay.innerText = "당신은 챌리팀입니다.";
    roleDisplay.style.color = "#f43f5e";
} else {
    roleDisplay.innerText = "자리가 찼습니다. 관전 중입니다.";
    roleDisplay.style.color = "#64748b";
}

    updateTimerUI(data.timeLeft);
    renderBoard(data.board);
});

// 게임 시작 이벤트 (두 명 다 들어왔을 때)
socket.on('gameStart', () => {
    if (myRole === 'p1' || myRole === 'p2') {
        wordInput.disabled = false;
        wordInput.placeholder = "여기에 단어를 입력하고 엔터!";
        wordInput.focus();
    }
 if (myRole === 'p1') roleDisplay.innerText = "⚔️ 대결 시작! 당신은 슈리팀입니다.";
if (myRole === 'p2') roleDisplay.innerText = "⚔️ 대결 시작! 당신은 챌리팀입니다.";
});

// 타이머 실시간 업데이트 수신
socket.on('timerUpdate', (timeLeft) => {
    updateTimerUI(timeLeft);
});

// 보드판 업데이트 수신
socket.on('updateBoard', (board) => {
    renderBoard(board);
});

// 게임 종료 수신
socket.on('gameOver', (data) => {
    alert(`📢 게임 종료 (${data.reason})\n\n🏆 결과: ${data.winner}\n(슈리팀: ${data.p1Count}개 vs 챌리팀: ${data.p2Count}개)`);
    wordInput.disabled = true;
    wordInput.placeholder = "게임이 종료되었습니다.";
    wordInput.value = "";
});

// 타이머 시간 변환 및 반영 함수
function updateTimerUI(timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timerDisplay.innerText = `남은 시간: ${formattedTime}`;
    
    // 10초 남았을 때 타이머 색상을 빨갛게 변경해 긴장감 조성
    if (timeLeft <= 10) {
        timerDisplay.style.color = "#f43f5e";
    } else {
        timerDisplay.style.color = "#0f172a";
    }
}

// 화면에 보드판 및 점수 그리기 (애니메이션 탑재)
function renderBoard(board) {
    // 1. 처음 실행 시 타일 DOM 요소들을 생성함
    if (boardElement.children.length === 0) {
        board.forEach(tile => {
            const tileDiv = document.createElement('div');
            tileDiv.classList.add('tile');
            tileDiv.id = `tile-${tile.id}`;
            tileDiv.innerText = tile.word;
            boardElement.appendChild(tileDiv);
        });
    }

    let p1Count = 0;
    let p2Count = 0;

    // 2. 상태 데이터를 바탕으로 기존 타일들의 클래스를 업데이트함
    board.forEach(tile => {
        const tileDiv = document.getElementById(`tile-${tile.id}`);
        if (!tileDiv) return;

        // 기존에 어떤 상태였는지 체크
        const isCurrentlyP1 = tileDiv.classList.contains('p1');
        const isCurrentlyP2 = tileDiv.classList.contains('p2');
        const currentOwner = isCurrentlyP1 ? 'p1' : (isCurrentlyP2 ? 'p2' : null);

        // 주인이 바뀌었을 때만 팡 터지는 애니메이션(pop-ani) 부여
        if (tile.owner !== currentOwner) {
            tileDiv.classList.remove('p1', 'p2');
            if (tile.owner) {
                tileDiv.classList.add(tile.owner);
                
                // CSS 애니메이션 초기화 후 재실행하는 트릭
                tileDiv.classList.remove('pop-ani');
                void tileDiv.offsetWidth; // 리플로우 강제 유도
                tileDiv.classList.add('pop-ani');
            }
        }

        if (tile.owner === 'p1') p1Count++;
        if (tile.owner === 'p2') p2Count++;
    });

    scoreDisplay.innerText = `슈리팀: ${p1Count} | 챌리팀: ${p2Count}`;

if (shuriScoreDisplay) shuriScoreDisplay.innerText = p1Count;
if (challiScoreDisplay) challiScoreDisplay.innerText = p2Count;
}

// 엔터키 입력 시 단어 제출
wordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const text = wordInput.value.trim();
        if (text) {
            socket.emit('submitWord', text);
        }
        wordInput.value = '';
    }
});