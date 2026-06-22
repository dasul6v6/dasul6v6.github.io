const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

/**
 * 최대 방 개수
 */
const MAX_ROOMS = 5;

/**
 * 여러 개의 단어판
 * 방 생성 / 다시 시작 시 이 중 하나를 랜덤으로 선택
 */
const wordBoards = [
  [
    "엔에스",
    "쇼핑",
    "신뢰",
    "도전",
    "소통",
    "고객",
    "엔바이콘",
    "하림",
    "홈플러스",
    "시너지커넥터",
    "퍼스트무버",
    "프로페셔널",
    "순우가",
    "왕스덕",
    "판교순대",
    "하이포크",
    "하림닭요리",
    "샵플러스",
    "출장",
    "당근",
    "퇴근",
    "브로콜리",
    "버섯",
    "모바일상품",
    "외근",
    "출근",
    "무념무상",
    "MC",
    "SCM",
    "TV식품컨텐츠",
    "야근",
    "휴가",
    "꽃게장",
    "TV영업기획",
    "SB식품",
    "TV트렌드컨텐츠",
  ],
  [
    "사과",
    "바나나",
    "포도",
    "딸기",
    "오렌지",
    "수박",
    "멜론",
    "복숭아",
    "체리",
    "망고",
    "레몬",
    "블루베리",
    "토마토",
    "당근",
    "감자",
    "고구마",
    "양파",
    "마늘",
    "오이",
    "호박",
    "시금치",
    "브로콜리",
    "버섯",
    "옥수수",
    "피망",
    "배추",
    "무",
    "대파",
    "미나리",
    "상추",
    "깻잎",
    "양배추",
    "가지",
    "부추",
    "인삼",
    "연근",
  ],
  [
    "먹방",
    "침샘자극",
    "폭풍흡입",
    "시식평",
    "지름신",
    "주문완료",
    "LA갈비",
    "간장게장",
    "삼계탕",
    "닭가슴살",
    "탕수육",
    "순대국",
    "생방사수",
    "대본없음",
    "멘트실수",
    "앵콜방송",
    "모니터링",
    "택배박스",
    "나폴레옹",
    "판교러",
    "신분당선",
    "지옥철",
    "영혼가출",
    "점심메뉴",
    "아메리카노",
    "얼죽아",
    "탕비실",
    "법인카드",
    "월급날",
    "칼퇴근",
    "야근각",
    "연차휴가",
    "월급루팡",
    "사내연애",
    "소확행",
    "월요병",
  ],
];

/**
 * 방 목록
 *
 * rooms = {
 *   ABC123: {
 *      board,
 *      players: { p1, p2 },
 *      ready: { p1, p2 },
 *      timeLeft,
 *      timerInterval,
 *      countdownInterval,
 *      gameStarted,
 *      isCountingDown
 *   }
 * }
 */
const rooms = {};

function shuffleWords(words) {
  const copiedWords = [...words];

  for (let i = copiedWords.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copiedWords[i], copiedWords[randomIndex]] = [
      copiedWords[randomIndex],
      copiedWords[i],
    ];
  }

  return copiedWords;
}

function getRandomWordList() {
  const randomIndex = Math.floor(Math.random() * wordBoards.length);
  return wordBoards[randomIndex];
}

function createBoard() {
  const selectedWords = getRandomWordList();

  return shuffleWords(selectedWords).map((word, index) => ({
    id: index,
    word,
    owner: null,
  }));
}

function createRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom(socketId) {
  return {
    board: createBoard(),
    players: {
      p1: socketId,
      p2: null,
    },
    ready: {
      p1: false,
      p2: false,
    },
    timeLeft: 90,
    timerInterval: null,
    countdownInterval: null,
    gameStarted: false,
    isCountingDown: false,
  };
}

/**
 * 방 리스트 생성
 */
function getRoomList() {
  return Object.keys(rooms).map((roomId) => {
    const room = rooms[roomId];

    const playerCount = (room.players.p1 ? 1 : 0) + (room.players.p2 ? 1 : 0);

    return {
      roomId,
      playerCount,
      maxPlayers: 2,
      gameStarted: room.gameStarted,
      isCountingDown: room.isCountingDown,
    };
  });
}

/**
 * 모든 접속자에게 방 리스트 전송
 */
function emitRoomList() {
  io.emit("roomList", getRoomList());
}

/**
 * 방 상태 메시지
 */
function getRoomStatusMessage(room) {
  if (!room.players.p1 || !room.players.p2) {
    return "상대 플레이어를 기다리는 중입니다.";
  }

  if (!room.ready.p1 && !room.ready.p2) {
    return "두 명이 입장했습니다. Ready를 눌러주세요.";
  }

  if (room.ready.p1 && !room.ready.p2) {
    return "슈리는 Ready 완료! 챌리를 기다리는 중입니다.";
  }

  if (!room.ready.p1 && room.ready.p2) {
    return "챌리는 Ready 완료! 슈리를 기다리는 중입니다.";
  }

  return "두 플레이어 모두 Ready 완료!";
}

/**
 * 해당 방에만 방 상태 전송
 */
function emitRoomStatus(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  io.to(roomId).emit("roomStatus", {
    roomId,
    message: getRoomStatusMessage(room),
    ready: room.ready,
    players: {
      p1: !!room.players.p1,
      p2: !!room.players.p2,
    },
  });
}

/**
 * 소켓 연결
 */
io.on("connection", (socket) => {
  console.log("유저 접속:", socket.id);

  let currentRoomId = null;
  let currentRole = null;

  /**
   * 접속하자마자 현재 방 리스트 전송
   */
  socket.emit("roomList", getRoomList());

  /**
   * 방 만들기
   */
  socket.on("createRoom", () => {
    if (currentRoomId) {
      socket.emit("createRoomError", "이미 방에 입장해 있습니다.");
      return;
    }

    if (Object.keys(rooms).length >= MAX_ROOMS) {
      socket.emit(
        "createRoomError",
        `방은 최대 ${MAX_ROOMS}개까지만 만들 수 있습니다.`,
      );
      return;
    }

    let roomId = createRoomId();

    while (rooms[roomId]) {
      roomId = createRoomId();
    }

    rooms[roomId] = createRoom(socket.id);

    currentRoomId = roomId;
    currentRole = "p1";

    socket.join(roomId);

    socket.emit("roomJoined", {
      roomId,
      role: currentRole,
      board: rooms[roomId].board,
      gameStarted: rooms[roomId].gameStarted,
      timeLeft: rooms[roomId].timeLeft,
    });

    emitRoomStatus(roomId);
    emitRoomList();

    console.log(`${socket.id} 방 생성: ${roomId}`);
  });

  /**
   * 방 입장
   */
  socket.on("joinRoom", (roomId) => {
    if (currentRoomId) {
      socket.emit("joinError", "이미 방에 입장해 있습니다.");
      return;
    }

    const normalizedRoomId = String(roomId || "")
      .trim()
      .toUpperCase();
    const room = rooms[normalizedRoomId];

    if (!normalizedRoomId) {
      socket.emit("joinError", "방 코드를 입력해주세요.");
      return;
    }

    if (!room) {
      socket.emit("joinError", "존재하지 않는 방입니다.");
      return;
    }

    if (room.players.p1 && room.players.p2) {
      socket.emit("joinError", "이미 인원이 가득 찬 방입니다.");
      return;
    }

    if (room.gameStarted || room.isCountingDown) {
      socket.emit("joinError", "이미 게임이 진행 중인 방입니다.");
      return;
    }

    /**
     * 비어 있는 자리에 입장
     * 보통은 p2로 들어가지만, p1이 나간 방이면 p1로 들어감
     */
    if (!room.players.p1) {
      room.players.p1 = socket.id;
      currentRole = "p1";
    } else {
      room.players.p2 = socket.id;
      currentRole = "p2";
    }

    currentRoomId = normalizedRoomId;

    socket.join(normalizedRoomId);

    socket.emit("roomJoined", {
      roomId: normalizedRoomId,
      role: currentRole,
      board: room.board,
      gameStarted: room.gameStarted,
      timeLeft: room.timeLeft,
    });

    emitRoomStatus(normalizedRoomId);
    emitRoomList();

    console.log(
      `${socket.id} 방 입장: ${normalizedRoomId}, 역할: ${currentRole}`,
    );
  });

  /**
   * Ready 버튼 클릭
   */
  socket.on("playerReady", () => {
    const room = rooms[currentRoomId];

    if (!room || !currentRole) return;
    if (room.gameStarted || room.isCountingDown) return;

    room.ready[currentRole] = true;

    io.to(currentRoomId).emit("readyStatus", {
      ready: room.ready,
    });

    emitRoomStatus(currentRoomId);

    if (room.players.p1 && room.players.p2 && room.ready.p1 && room.ready.p2) {
      startCountdown(currentRoomId);
    }
  });

  /**
   * 단어 입력
   */
  socket.on("submitWord", (typedWord) => {
    const room = rooms[currentRoomId];

    if (!room) return;
    if (!room.gameStarted) return;
    if (room.timeLeft <= 0) return;
    if (!currentRole) return;

    const word = String(typedWord || "").trim();
    if (!word) return;

    let changed = false;

    room.board.forEach((tile) => {
      if (tile.word === word && tile.owner !== currentRole) {
        tile.owner = currentRole;
        changed = true;
      }
    });

    if (changed) {
      io.to(currentRoomId).emit("updateBoard", room.board);
      checkBoardComplete(currentRoomId);
    }
  });

  /**
   * 다시 시작
   */
  socket.on("requestRestart", () => {
    const room = rooms[currentRoomId];
    if (!room) return;

    clearInterval(room.timerInterval);
    clearInterval(room.countdownInterval);

    room.board = createBoard();
    room.timeLeft = 90;
    room.gameStarted = false;
    room.isCountingDown = false;
    room.ready = {
      p1: false,
      p2: false,
    };

    io.to(currentRoomId).emit("boardReset", {
      board: room.board,
      timeLeft: room.timeLeft,
    });

    io.to(currentRoomId).emit("readyStatus", {
      ready: room.ready,
    });

    emitRoomStatus(currentRoomId);
    emitRoomList();
  });

  /**
   * 접속 해제
   */
  socket.on("disconnect", () => {
    console.log("유저 접속 해제:", socket.id);

    const room = rooms[currentRoomId];
    if (!room) return;

    if (room.players.p1 === socket.id) {
      room.players.p1 = null;
      room.ready.p1 = false;
    }

    if (room.players.p2 === socket.id) {
      room.players.p2 = null;
      room.ready.p2 = false;
    }

    clearInterval(room.timerInterval);
    clearInterval(room.countdownInterval);

    room.gameStarted = false;
    room.isCountingDown = false;
    room.timeLeft = 90;

    io.to(currentRoomId).emit("boardReset", {
      board: room.board,
      timeLeft: room.timeLeft,
    });

    emitRoomStatus(currentRoomId);

    if (!room.players.p1 && !room.players.p2) {
      delete rooms[currentRoomId];
      console.log(`빈 방 삭제: ${currentRoomId}`);
    }

    emitRoomList();
  });
});

/**
 * 5초 카운트다운
 */
function startCountdown(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.gameStarted || room.isCountingDown) return;

  room.isCountingDown = true;

  let count = 5;

  io.to(roomId).emit("countdownStart", {
    message: "5초 뒤에 게임이 시작됩니다!",
    count,
  });

  emitRoomList();

  room.countdownInterval = setInterval(() => {
    count--;

    io.to(roomId).emit("countdownTick", count);

    if (count <= 0) {
      clearInterval(room.countdownInterval);

      room.isCountingDown = false;
      room.gameStarted = true;
      room.timeLeft = 90;

      io.to(roomId).emit("gameStart");
      io.to(roomId).emit("timerUpdate", room.timeLeft);

      emitRoomList();
      startTimer(roomId);
    }
  }, 1000);
}

/**
 * 타이머 시작
 */
function startTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    room.timeLeft--;

    io.to(roomId).emit("timerUpdate", room.timeLeft);

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      endGame(roomId, "시간 종료!");
    }
  }, 1000);
}

/**
 * 모든 판이 점령됐는지 확인
 */
function checkBoardComplete(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const isGameOver = room.board.every((tile) => tile.owner !== null);

  if (isGameOver) {
    clearInterval(room.timerInterval);
    endGame(roomId, "모든 판 점령!");
  }
}

/**
 * 게임 종료
 */
function endGame(roomId, reason) {
  const room = rooms[roomId];
  if (!room) return;

  const p1Count = room.board.filter((tile) => tile.owner === "p1").length;
  const p2Count = room.board.filter((tile) => tile.owner === "p2").length;

  const winner =
    p1Count > p2Count
      ? "슈리팀 승리!"
      : p1Count < p2Count
        ? "챌리팀 승리!"
        : "무승부!";

  room.gameStarted = false;
  room.isCountingDown = false;

  io.to(roomId).emit("gameOver", {
    reason,
    winner,
    p1Count,
    p2Count,
  });

  emitRoomList();
}

http.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
