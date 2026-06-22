const socket = io();

const boardElement = document.getElementById("board");
const wordInput = document.getElementById("word-input");
const roleDisplay = document.getElementById("role-display");
const scoreDisplay = document.getElementById("score-display");
const timerDisplay = document.getElementById("timer-display");
const restartBtn = document.getElementById("restart-btn");
const shuriScoreDisplay = document.getElementById("shuri-score");
const challiScoreDisplay = document.getElementById("challi-score");

const gameLayout = document.getElementById("game-layout");
const homeVsHero = document.getElementById("home-vs-hero");

const waitingOverlay = document.getElementById("waiting-overlay");
const waitingCharacter = document.getElementById("waiting-character");
const waitingRole = document.getElementById("waiting-role");
const waitingTitle = document.getElementById("waiting-title");

const waitingRoomCodeBox = document.getElementById("waiting-room-code-box");
const waitingRoomCode = document.getElementById("waiting-room-code");
const waitingCopyRoomBtn = document.getElementById("waiting-copy-room-btn");
const waitingReadyBtn = document.getElementById("waiting-ready-btn");

const roomStartPanel = document.getElementById("room-start-panel");
const roomReadyPanel = document.getElementById("room-ready-panel");

const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const roomIdInput = document.getElementById("room-id-input");

const roomList = document.getElementById("room-list");

const roomCodeDisplay = document.getElementById("room-code-display");
const copyRoomBtn = document.getElementById("copy-room-btn");
const roomInfo = document.getElementById("room-info");
const readyBtn = document.getElementById("ready-btn");

let myRole = null;
let myRoomId = null;

/**
 * 최초 화면 상태
 */
wordInput.disabled = true;
wordInput.placeholder = "방을 만들거나 입장해주세요.";
restartBtn.disabled = true;
restartBtn.innerText = "홈으로 가기";
readyBtn.disabled = true;

wordInput.classList.add("hidden");
restartBtn.classList.add("hidden");
timerDisplay.classList.add("hidden");
scoreDisplay.classList.add("hidden");

hideWaitingOverlay();
updateTimerUI(90);

/**
 * 방 만들기
 */
createRoomBtn.addEventListener("click", () => {
  socket.emit("createRoom");
});

/**
 * 방 입장 버튼
 */
joinRoomBtn.addEventListener("click", () => {
  joinRoom();
});

/**
 * 방 코드 입력 후 Enter로 입장
 */
roomIdInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  joinRoom();
});

function joinRoom() {
  const roomId = roomIdInput.value.trim();

  if (!roomId) {
    alert("방 코드를 입력해주세요.");
    return;
  }

  socket.emit("joinRoom", roomId);
}

/**
 * Ready 버튼
 */
readyBtn.addEventListener("click", () => {
  sendReady();
});

/**
 * 대기 팝업 안 Ready 버튼
 */
waitingReadyBtn.addEventListener("click", () => {
  sendReady();
});

function sendReady() {
  if (!myRoomId) {
    alert("먼저 방을 만들거나 입장해주세요.");
    return;
  }

  socket.emit("playerReady");

  readyBtn.disabled = true;
  readyBtn.innerText = "READY 완료";

  waitingReadyBtn.disabled = true;
  waitingReadyBtn.innerText = "READY 완료";
}

/**
 * 방 코드 복사 버튼
 */
copyRoomBtn.addEventListener("click", () => {
  copyRoomCode();
});

/**
 * 대기 팝업 안 방 코드 복사 버튼
 */
waitingCopyRoomBtn.addEventListener("click", () => {
  copyRoomCode();
});

async function copyRoomCode() {
  if (!myRoomId) return;

  try {
    await navigator.clipboard.writeText(myRoomId);
    alert(`방 코드가 복사되었습니다: ${myRoomId}`);
  } catch (error) {
    alert(`방 코드: ${myRoomId}`);
  }
}

/**
 * 홈으로 가기 버튼
 */
restartBtn.addEventListener("click", () => {
  if (!myRoomId) {
    resetToHome();
    return;
  }

  socket.emit("leaveRoom");
});

/**
 * 서버에서 방 나가기 완료 수신
 */
socket.on("leftRoom", () => {
  resetToHome();
});

/**
 * 서버에서 방 리스트 수신
 */
socket.on("roomList", (rooms) => {
  renderRoomList(rooms);
});

/**
 * 방 생성/입장 성공
 */
socket.on("roomJoined", (data) => {
  myRole = data.role;
  myRoomId = data.roomId;

  gameLayout.classList.remove("home-mode");
  gameLayout.classList.add("play-mode");

  if (homeVsHero) {
    homeVsHero.classList.add("hidden");
  }

  roomStartPanel.classList.add("hidden");
  roomReadyPanel.classList.remove("hidden");

  wordInput.classList.remove("hidden");
  restartBtn.classList.remove("hidden");
  timerDisplay.classList.remove("hidden");
  scoreDisplay.classList.remove("hidden");

  restartBtn.disabled = false;
  restartBtn.innerText = "홈으로 가기";

  roomCodeDisplay.innerText = myRoomId;
  roomInfo.innerText = "상대 플레이어를 기다리는 중입니다.";

  waitingRoomCode.innerText = myRoomId;
  waitingRoomCodeBox.classList.remove("hidden");

  readyBtn.disabled = false;
  readyBtn.innerText = "Ready";

  waitingReadyBtn.classList.remove("hidden");
  waitingReadyBtn.disabled = false;
  waitingReadyBtn.innerText = "Ready";

  setRoleUI(myRole);

  updateTimerUI(data.timeLeft);

  boardElement.innerHTML = "";
  renderBoard(data.board);

  wordInput.disabled = true;
  wordInput.value = "";
  wordInput.placeholder = "Ready 후 게임 시작을 기다려주세요.";

  showWaitingOverlay("room");
});

/**
 * 방 상태 변경
 */
socket.on("roomStatus", (data) => {
  if (roomInfo) {
    roomInfo.innerText = data.message;
  }

  wordInput.disabled = true;
  wordInput.placeholder = "Ready 후 게임 시작을 기다려주세요.";

  if (myRole === "p1" || myRole === "p2") {
    showWaitingOverlay("room");
  }
});

/**
 * Ready 상태 변경
 */
socket.on("readyStatus", (data) => {
  const p1ReadyText = data.ready.p1 ? "슈리 READY" : "슈리 대기 중";
  const p2ReadyText = data.ready.p2 ? "챌리 READY" : "챌리 대기 중";

  roomInfo.innerText = `${p1ReadyText} / ${p2ReadyText}`;

  const myReady = myRole && data.ready[myRole];

  if (myReady) {
    readyBtn.disabled = true;
    readyBtn.innerText = "READY 완료";

    waitingReadyBtn.classList.remove("hidden");
    waitingReadyBtn.disabled = true;
    waitingReadyBtn.innerText = "READY 완료";
  } else {
    readyBtn.disabled = false;
    readyBtn.innerText = "Ready";

    waitingReadyBtn.classList.remove("hidden");
    waitingReadyBtn.disabled = false;
    waitingReadyBtn.innerText = "Ready";
  }

  if (myRole === "p1" || myRole === "p2") {
    showWaitingOverlay("ready");
  }
});

/**
 * 5초 카운트다운 시작
 */
socket.on("countdownStart", (data) => {
  roomInfo.innerText = data.message;

  wordInput.disabled = true;
  wordInput.value = "";
  wordInput.placeholder = "곧 게임이 시작됩니다...";

  readyBtn.disabled = true;
  readyBtn.innerText = "게임 준비 중";

  waitingReadyBtn.classList.remove("hidden");
  waitingReadyBtn.disabled = true;
  waitingReadyBtn.innerText = "게임 준비 중";

  showCountdown(data.count);
});

/**
 * 카운트다운 숫자 갱신
 */
socket.on("countdownTick", (count) => {
  if (count > 0) {
    showCountdown(count);
  } else {
    waitingTitle.innerText = "START!";
    waitingRole.innerText = "시작!";
    waitingRole.style.color = "#facc15";
  }
});

/**
 * 게임 시작
 */
socket.on("gameStart", () => {
  hideWaitingOverlay();

  readyBtn.disabled = true;
  readyBtn.innerText = "게임 중";

  waitingReadyBtn.classList.add("hidden");

  roomInfo.innerText = `방 코드 ${myRoomId} / 게임 진행 중`;

  restartBtn.disabled = false;
  restartBtn.innerText = "홈으로 가기";

  if (myRole === "p1" || myRole === "p2") {
    enableInput();
  }

  if (myRole === "p1") {
    roleDisplay.innerText = "대결 시작! 당신은 슈리입니다.";
  } else if (myRole === "p2") {
    roleDisplay.innerText = "대결 시작! 당신은 챌리입니다.";
  }
});

/**
 * 보드 초기화
 */
socket.on("boardReset", (data) => {
  if (!myRoomId) return;

  wordInput.disabled = true;
  wordInput.placeholder = "Ready 후 게임 시작을 기다려주세요.";
  wordInput.value = "";

  updateTimerUI(data.timeLeft);

  boardElement.innerHTML = "";
  renderBoard(data.board);

  readyBtn.disabled = false;
  readyBtn.innerText = "Ready";

  waitingReadyBtn.classList.remove("hidden");
  waitingReadyBtn.disabled = false;
  waitingReadyBtn.innerText = "Ready";

  if (myRole === "p1" || myRole === "p2") {
    showWaitingOverlay("room");
  }
});

/**
 * 타이머 갱신
 */
socket.on("timerUpdate", (timeLeft) => {
  updateTimerUI(timeLeft);
});

/**
 * 보드 점령 상태 갱신
 */
socket.on("updateBoard", (board) => {
  renderBoard(board);
});

/**
 * 게임 종료
 */
socket.on("gameOver", (data) => {
  alert(
    `게임 종료 (${data.reason})\n\n` +
      `결과: ${data.winner}\n` +
      `슈리: ${data.p1Count}개 vs 챌리: ${data.p2Count}개`,
  );

  wordInput.disabled = true;
  wordInput.placeholder = "게임이 종료되었습니다.";
  wordInput.value = "";

  readyBtn.disabled = false;
  readyBtn.innerText = "다시 Ready";

  waitingReadyBtn.classList.remove("hidden");
  waitingReadyBtn.disabled = false;
  waitingReadyBtn.innerText = "다시 Ready";

  roomInfo.innerText = `게임 종료 / ${data.winner}`;

  restartBtn.disabled = false;
  restartBtn.innerText = "홈으로 가기";
});

/**
 * 방 입장 실패
 */
socket.on("joinError", (message) => {
  alert(message);
});

/**
 * 방 생성 실패
 */
socket.on("createRoomError", (message) => {
  alert(message);
});

/**
 * 단어 입력
 */
wordInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  const text = wordInput.value.trim();

  if (text) {
    socket.emit("submitWord", text);
  }

  wordInput.value = "";
});

/**
 * 역할 UI 세팅
 */
function setRoleUI(role) {
  if (!roleDisplay) {
    console.warn("role-display 요소가 없습니다.");
    return;
  }

  if (role === "p1") {
    roleDisplay.innerText = "당신은 슈리입니다.";
    roleDisplay.style.color = "#4f46e5";
  } else if (role === "p2") {
    roleDisplay.innerText = "당신은 챌리입니다.";
    roleDisplay.style.color = "#e11d48";
  } else {
    roleDisplay.innerText = "관전 중입니다.";
    roleDisplay.style.color = "#66748a";
  }
}

/**
 * 입력창 활성화
 */
function enableInput() {
  wordInput.disabled = false;
  wordInput.placeholder = "여기에 단어를 입력하고 엔터!";
  wordInput.focus();
}

/**
 * 타이머 UI
 */
function updateTimerUI(timeLeft) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  timerDisplay.innerText = `남은 시간: ${formattedTime}`;
  timerDisplay.style.color = timeLeft <= 10 ? "#e11d48" : "#101827";
}

/**
 * 대기 오버레이 표시
 */
function showWaitingOverlay(mode = "room") {
  waitingOverlay.classList.remove("hidden");

  if (myRoomId) {
    waitingRoomCode.innerText = myRoomId;
    waitingRoomCodeBox.classList.remove("hidden");

    waitingReadyBtn.classList.remove("hidden");
  } else {
    waitingRoomCodeBox.classList.add("hidden");
    waitingReadyBtn.classList.add("hidden");
  }

  if (myRole === "p1") {
    waitingCharacter.src = "shuri.png";
    waitingRole.innerText = "당신은 슈리입니다";
    waitingRole.style.color = "#4f46e5";

    if (mode === "ready") {
      waitingTitle.innerText = "챌리의 Ready를 기다리는 중...";
    } else {
      waitingTitle.innerText = "챌리를 기다리는 중...";
    }
  } else if (myRole === "p2") {
    waitingCharacter.src = "challi.png";
    waitingRole.innerText = "당신은 챌리입니다";
    waitingRole.style.color = "#e11d48";

    if (mode === "ready") {
      waitingTitle.innerText = "슈리의 Ready를 기다리는 중...";
    } else {
      waitingTitle.innerText = "슈리를 기다리는 중...";
    }
  } else {
    waitingCharacter.src = "shuri.png";
    waitingRole.innerText = "대기 중";
    waitingRole.style.color = "#66748a";
    waitingTitle.innerText = "방을 만들거나 입장해주세요";
  }
}

/**
 * 카운트다운 표시
 */
function showCountdown(count) {
  waitingOverlay.classList.remove("hidden");

  if (myRoomId) {
    waitingRoomCode.innerText = myRoomId;
    waitingRoomCodeBox.classList.remove("hidden");
  }

  waitingReadyBtn.classList.remove("hidden");
  waitingReadyBtn.disabled = true;
  waitingReadyBtn.innerText = "게임 준비 중";

  if (myRole === "p1") {
    waitingCharacter.src = "shuri.png";
  } else if (myRole === "p2") {
    waitingCharacter.src = "challi.png";
  } else {
    waitingCharacter.src = "shuri.png";
  }

  waitingTitle.innerText = "5초 뒤에 게임이 시작됩니다!";
  waitingRole.innerText = count;
  waitingRole.style.color = "#101827";
}

/**
 * 대기 오버레이 숨김
 */
function hideWaitingOverlay() {
  waitingOverlay.classList.add("hidden");
}

/**
 * 홈 화면으로 초기화
 */
function resetToHome() {
  myRole = null;
  myRoomId = null;

  gameLayout.classList.add("home-mode");
  gameLayout.classList.remove("play-mode");

  if (homeVsHero) {
    homeVsHero.classList.remove("hidden");
  }

  roomStartPanel.classList.remove("hidden");
  roomReadyPanel.classList.add("hidden");

  roleDisplay.innerText = "방을 만들거나 입장해주세요.";
  roleDisplay.style.color = "#66748a";

  roomIdInput.value = "";
  roomCodeDisplay.innerText = "------";
  roomInfo.innerText = "상대 플레이어를 기다리는 중입니다.";

  boardElement.innerHTML = "";

  wordInput.disabled = true;
  wordInput.value = "";
  wordInput.placeholder = "방을 만들거나 입장해주세요.";
  wordInput.classList.add("hidden");

  restartBtn.disabled = true;
  restartBtn.innerText = "홈으로 가기";
  restartBtn.classList.add("hidden");

  timerDisplay.classList.add("hidden");
  scoreDisplay.classList.add("hidden");

  readyBtn.disabled = true;
  readyBtn.innerText = "Ready";

  waitingReadyBtn.classList.add("hidden");
  waitingReadyBtn.disabled = false;
  waitingReadyBtn.innerText = "Ready";

  waitingRoomCodeBox.classList.add("hidden");
  waitingRoomCode.innerText = "------";

  hideWaitingOverlay();

  updateTimerUI(90);

  scoreDisplay.innerText = "SHURI 0  VS  0 CHALLI";
  shuriScoreDisplay.innerText = "0";
  challiScoreDisplay.innerText = "0";
}

/**
 * 방 리스트 렌더링
 */
function renderRoomList(rooms) {
  if (!roomList) return;

  roomList.innerHTML = "";

  if (!rooms || rooms.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.classList.add("empty-room-message");
    emptyMessage.innerText = "새로운 방을 만들어주세요!";
    roomList.appendChild(emptyMessage);
    return;
  }

  rooms.forEach((room) => {
    const roomItem = document.createElement("div");
    roomItem.classList.add("room-item");

    const isFull = room.playerCount >= room.maxPlayers;
    const isPlaying = room.gameStarted || room.isCountingDown;

    const statusText = isPlaying
      ? "게임 중"
      : isFull
        ? "인원 가득 참"
        : "입장 가능";

    const roomText = document.createElement("div");
    roomText.classList.add("room-item-text");

    roomText.innerHTML = `
      <strong>${room.roomId}</strong>
      <span>${room.playerCount}/${room.maxPlayers} · ${statusText}</span>
    `;

    const joinButton = document.createElement("button");
    joinButton.type = "button";
    joinButton.innerText = "입장";
    joinButton.disabled = isFull || isPlaying;

    joinButton.addEventListener("click", () => {
      socket.emit("joinRoom", room.roomId);
    });

    roomItem.appendChild(roomText);
    roomItem.appendChild(joinButton);

    roomList.appendChild(roomItem);
  });
}

/**
 * 보드 렌더링
 */
function renderBoard(board) {
  boardElement.innerHTML = "";

  if (!Array.isArray(board) || board.length === 0) {
    console.warn("보드 데이터가 없습니다:", board);
    return;
  }

  let p1Count = 0;
  let p2Count = 0;

  board.forEach((tile) => {
    const tileDiv = document.createElement("div");
    tileDiv.classList.add("tile");
    tileDiv.id = `tile-${tile.id}`;
    tileDiv.innerText = tile.word;

    if (tile.owner) {
      tileDiv.classList.add(tile.owner);
    }

    if (tile.owner === "p1") p1Count++;
    if (tile.owner === "p2") p2Count++;

    boardElement.appendChild(tileDiv);
  });

  scoreDisplay.innerText = `SHURI ${p1Count}  VS  ${p2Count} CHALLI`;
  shuriScoreDisplay.innerText = p1Count;
  challiScoreDisplay.innerText = p2Count;
}
