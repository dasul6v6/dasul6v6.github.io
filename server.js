const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// 36개 한국어 단어 판
// const wordList = [
//     "엔에스", "쇼핑", "신뢰", "도전", "소통", "고객", 
//     "엔바이콘", "하림", "홈플러스", "시너지커넥터", "퍼스트무버", "프로페셔널", 
//     "순우가", "왕스덕", "판교순대", "하이포크", "하림닭요리", "샵플러스", 
//     "출장", "당근", "퇴근", "브로콜리", "버섯", "모바일상품", 
//     "외근", "출근", "무념무상", "MC", "SCM", "TV식품컨텐츠", 
//     "야근", "휴가", "꽃게장", "TV영업기획", "SB식품", "TV트렌드컨텐츠"
// ];

// const wordList = [
//     "엔에스", "쇼핑", "신뢰", "도전", "소통", "고객", 
//     "엔바이콘", "하림", "홈플러스", "시너지커넥터", "퍼스트무버", "프로페셔널", 
//     "순우가", "왕스덕", "판교순대", "하이포크", "하림닭요리", "샵플러스", 
//     "출장", "당근", "퇴근", "브로콜리", "버섯", "모바일상품", 
//     "외근", "출근", "무념무상", "MC", "SCM", "TV식품컨텐츠", 
//     "야근", "휴가", "꽃게장", "TV영업기획", "SB식품", "TV트렌드컨텐츠"
// ];

// const wordList = [
//     "사과", "바나나", "포도", "딸기", "오렌지", "수박", 
//     "멜론", "복숭아", "체리", "망고", "레몬", "블루베리", 
//     "토마토", "당근", "감자", "고구마", "양파", "마늘", 
//     "오이", "호박", "시금치", "브로콜리", "버섯", "옥수수", 
//     "피망", "배추", "무", "대파", "미나리", "상추", 
//     "깻잎", "양배추", "가지", "부추", "인삼", "연근"
// ];


// 은근하게 NS홈쇼핑 감성이 녹아있는 36개(6x6) 단어 판
const wordList = [
    // 1층: 식품 홈쇼핑의 본능
    "먹방", "침샘자극", "폭풍흡입", "시식평", "지름신", "주문완료",
    
    // 2층: NS 하면 생각나는 대표 메뉴들
    "LA갈비", "간장게장", "삼계탕", "닭가슴살", "탕수육", "순대국",
    
    // 3층: 홈쇼핑 방송 현장의 리얼함
    "생방사수", "대본없음", "멘트실수", "앵콜방송", "모니터링", "택배박스",
    
    // 4층: 하림/판교 출퇴근길의 추억 (회장님의 나폴레옹 모자 오마주 포함!)
    "나폴레옹", "판교러", "신분당선", "지옥철", "영혼가출", "점심메뉴",
    
    // 5층: 직장인들의 진짜 원동력
    "아메리카노", "얼죽아", "탕비실", "법인카드", "월급날", "칼퇴근",
    
    // 6층: 사내 공감대 형성 단어들
    "야근각", "연차휴가", "월급루팡", "사내연애", "소확행", "월요병"
];

let board = wordList.map((word, index) => ({
    id: index,
    word: word,
    owner: null
}));

let players = { p1: null, p2: null };

// 타이머 변수
let timeLeft = 70; // 70초
let timerInterval = null;
let gameStarted = false;

io.on('connection', (socket) => {
    console.log('유저 접속:', socket.id);

    let role = null;
    if (!players.p1) {
        players.p1 = socket.id;
        role = 'p1';
    } else if (!players.p2) {
        players.p2 = socket.id;
        role = 'p2';
    } else {
        role = 'viewer';
    }

    // 접속 시 현재 상태 전송
    socket.emit('init', { role, board, gameStarted, timeLeft });

    // 플레이어 2가 접속하면 게임 및 타이머 시작!
    if (role === 'p2' && !gameStarted) {
        gameStarted = true;
        io.emit('gameStart');
        startTimer();
    }

    socket.on('submitWord', (typedWord) => {
        if (!gameStarted || timeLeft <= 0 || role === 'viewer') return;

        let changed = false;
        board.forEach(tile => {
            if (tile.word === typedWord.trim() && tile.owner !== role) {
                tile.owner = role;
                changed = true;
            }
        });

        if (changed) {
            io.emit('updateBoard', board);
            checkBoardComplete(); // 모든 판이 뒤집혔는지 체크
        }
    });

    socket.on('disconnect', () => {
        if (players.p1 === socket.id) players.p1 = null;
        if (players.p2 === socket.id) players.p2 = null;
        console.log('유저 접속 해제:', socket.id);
    });

    // 💡 다시 시작 요청 처리
    socket.on('requestRestart', () => {
        // 1. 보드판 소유권 전체 초기화
        board.forEach(tile => tile.owner = null);
        
        // 2. 기존 타이머가 돌고 있었다면 정지 및 시간 리셋
        clearInterval(timerInterval);
        timeLeft = 90;

        // 3. 현재 접속된 플레이어 상태에 따라 게임 재시작 여부 결정
        if (players.p1 && players.p2) {
            gameStarted = true;
            io.emit('boardReset', { board, timeLeft }); // 클라이언트 화면 청소 신호
            io.emit('gameStart'); // 게임 재시작 신호
            startTimer(); // 타이머 다시 시작
        } else {
            // 한 명밖에 없다면 대기 상태로 전환
            gameStarted = false;
            io.emit('boardReset', { board, timeLeft });
        }
    });
});

// 타이머 구동 함수
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        io.emit('timerUpdate', timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endGame("시간 종료!");
        }
    }, 1000);
}

// 모든 판이 다 채워졌는지 확인
function checkBoardComplete() {
    const isGameOver = board.every(tile => tile.owner !== null);
    if (isGameOver) {
        clearInterval(timerInterval);
        endGame("모든 판 점령!");
    }
}

// 게임 종료 처리
function endGame(reason) {
    let p1Count = board.filter(tile => tile.owner === 'p1').length;
    let p2Count = board.filter(tile => tile.owner === 'p2').length;
    let winner = p1Count > p2Count ? '슈리팀 승리!' : (p1Count < p2Count ? '챌리팀 승리!' : '무승부!');
    
    io.emit('gameOver', { reason, winner, p1Count, p2Count });
}

http.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});