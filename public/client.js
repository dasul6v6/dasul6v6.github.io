const socket = io();

const boardElement = document.getElementById("board");
const wordInput = document.getElementById("word-input");
const roleDisplay = document.getElementById("role-display");
const scoreDisplay = document.getElementById("score-display");
const timerDisplay = document.getElementById("timer-display");
const restartBtn = document.getElementById("restart-btn");
const shuriScoreDisplay = document.getElementById("shuri-score");
const challiScoreDisplay = document.getElementById("challi-score");

const waitingOverlay = document.getElementById("waiting-overlay");
const waitingCharacter = document.getElementById("waiting-character");
const waitingRole = document.getElementById("waiting-role");
const waitingTitle = document.getElementById("waiting-title");

const roomStartPanel = document.getElementById("room-start-panel");
const roomReadyPanel = document.getElementById("room-ready-panel");

const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const roomIdInput = document.getElementById("room-id-input");

const roomCodeDisplay = document.getElementById("room-code-display");
const copyRoomBtn = document.getElementById("copy-room-btn");
const roomInfo = document.getElementById("room-info");
const readyBtn = document.getElementById("ready-btn");

let myRole = null;
let myRoomId = null;

wordInput.disabled = true;
wordInput.placeholder = "방을 만들거나 입장해주세요.";
restartBtn.disabled = true;
readyBtn.disabled = true;

hideWaitingOverlay();
updateTimerUI(90);

createRoomBtn.addEventListener("click", () => {
  socket.emit("createRoom");
});

joinRoomBtn.addEventListener("click", () => {
  joinRoom();
});

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

readyBtn.addEventListener("click", () => {
  if (!myRoomId) {
    alert("먼저 방을 만들거나 입장해주세요.");
    return;
  }

  socket.emit("playerReady");

  readyBtn.disabled = true;
  readyBtn.innerText = "READY 완료";
});

copyRoomBtn.addEventListener("click", async () => {
  if (!myRoomId) return;

  try {
    await navigator.clipboard.writeText(myRoomId);
    alert(`방 코드가 복사되었습니다: ${myRoomId}`);
  } catch (error) {
    alert(`방 코드: ${myRoomId}`);
  }
});

restartBtn.addEventListener("click", () => {
  if (!myRoomId) {
    alert("먼저 방을 만들거나 입장해주세요.");
    return;
  }

  socket.emit("requestRestart");
});

socket.on("roomJoined", (data) => {
  myRole = data.role;
  myRoomId = data.roomId;

  roomStartPanel.classList.add("hidden");
  roomReadyPanel.classList.remove("hidden");

  roomCodeDisplay.innerText = myRoomId;
  roomInfo.innerText = "상대 플레이어를 기다리는 중입니다.";

  readyBtn.disabled = false;
  readyBtn.innerText = "Ready";

  restartBtn.disabled = false;

  setRoleUI(myRole);

  updateTimerUI(data.timeLeft);

  boardElement.innerHTML = "";
  renderBoard(data.board);

  wordInput.disabled = true;
  wordInput.value = "";
  wordInput.placeholder = "Ready 후 게임 시작을 기다려주세요.";

  showWaitingOverlay("room");
});

socket.on("roomStatus", (data) => {
  roomInfo.innerText = data.message;

  wordInput.disabled = true;
  wordInput.placeholder = "Ready 후 게임 시작을 기다려주세요.";

  if (myRole === "p1" || myRole === "p2") {
    showWaitingOverlay("room");
  }
});

socket.on("readyStatus", (data) => {
  const p1ReadyText = data.ready.p1 ? "슈리 READY" : "슈리 대기 중";
  const p2ReadyText = data.ready.p2 ? "챌리 READY" : "챌리 대기 중";

  roomInfo.innerText = `${p1ReadyText} / ${p2ReadyText}`;

  if (myRole === "p1" || myRole === "p2") {
    showWaitingOverlay("ready");
  }
});

socket.on("countdownStart", (data) => {
  roomInfo.innerText = data.message;

  wordInput.disabled = true;
  wordInput.value = "";
  wordInput.placeholder = "곧 게임이 시작됩니다...";

  readyBtn.disabled = true;
  readyBtn.innerText = "게임 준비 중";

  showCountdown(data.count);
});

socket.on("countdownTick", (count) => {
  if (count > 0) {
    showCountdown(count);
  } else {
    waitingTitle.innerText = "START!";
    waitingRole.innerText = "시작!";
    waitingRole.style.color = "#facc15";
  }
});

socket.on("gameStart", () => {
  hideWaitingOverlay();

  readyBtn.disabled = true;
  readyBtn.innerText = "게임 중";

  roomInfo.innerText = `방 코드 ${myRoomId} / 게임 진행 중`;

  if (myRole === "p1" || myRole === "p2") {
    enableInput();
  }

  if (myRole === "p1") {
    roleDisplay.innerText = "대결 시작! 당신은 슈리입니다.";
  } else if (myRole === "p2") {
    roleDisplay.innerText = "대결 시작! 당신은 챌리입니다.";
  }
});

socket.on("boardReset", (data) => {
  wordInput.disabled = true;
  wordInput.placeholder = "Ready 후 게임 시작을 기다려주세요.";
  wordInput.value = "";

  updateTimerUI(data.timeLeft);

  boardElement.innerHTML = "";
  renderBoard(data.board);

  readyBtn.disabled = false;
  readyBtn.innerText = "Ready";

  if (myRole === "p1" || myRole === "p2") {
    showWaitingOverlay("room");
  }
});

socket.on("timerUpdate", (timeLeft) => {
  updateTimerUI(timeLeft);
});

socket.on("updateBoard", (board) => {
  renderBoard(board);
});

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

  roomInfo.innerText = `게임 종료 / ${data.winner}`;
});

socket.on("joinError", (message) => {
  alert(message);
});

wordInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  const text = wordInput.value.trim();

  if (text) {
    socket.emit("submitWord", text);
  }

  wordInput.value = "";
});

function setRoleUI(role) {
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

function enableInput() {
  wordInput.disabled = false;
  wordInput.placeholder = "여기에 단어를 입력하고 엔터!";
  wordInput.focus();
}

function updateTimerUI(timeLeft) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  timerDisplay.innerText = `남은 시간: ${formattedTime}`;
  timerDisplay.style.color = timeLeft <= 10 ? "#e11d48" : "#101827";
}

function showWaitingOverlay(mode = "room") {
  waitingOverlay.classList.remove("hidden");

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

function showCountdown(count) {
  waitingOverlay.classList.remove("hidden");

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

function hideWaitingOverlay() {
  waitingOverlay.classList.add("hidden");
}

function renderBoard(board) {
  if (boardElement.children.length === 0) {
    board.forEach((tile) => {
      const tileDiv = document.createElement("div");
      tileDiv.classList.add("tile");
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

    const isCurrentlyP1 = tileDiv.classList.contains("p1");
    const isCurrentlyP2 = tileDiv.classList.contains("p2");
    const currentOwner = isCurrentlyP1 ? "p1" : isCurrentlyP2 ? "p2" : null;

    if (tile.owner !== currentOwner) {
      tileDiv.classList.remove("p1", "p2");

      if (tile.owner) {
        tileDiv.classList.add(tile.owner);
        tileDiv.classList.remove("pop-ani");
        void tileDiv.offsetWidth;
        tileDiv.classList.add("pop-ani");
      }
    }

    if (tile.owner === "p1") p1Count++;
    if (tile.owner === "p2") p2Count++;
  });

  scoreDisplay.innerText = `SHURI ${p1Count}  VS  ${p2Count} CHALLI`;
  shuriScoreDisplay.innerText = p1Count;
  challiScoreDisplay.innerText = p2Count;
}
