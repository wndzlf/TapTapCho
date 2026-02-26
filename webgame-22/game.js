const bgmAudio = window.TapTapNeonAudio?.create('webgame-22', document.querySelector('.hud'), { theme: 'mystic' });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');
const btnMode = document.getElementById('btnMode');

const W = canvas.width;
const H = canvas.height;

const ROWS = 10;
const COLS = 8;
const CELL = 40;
const GAP = 2;
const BOARD_W = COLS * CELL + (COLS - 1) * GAP;
const BOARD_H = ROWS * CELL + (ROWS - 1) * GAP;
const BOARD_X = (W - BOARD_W) * 0.5;
const BOARD_Y = 170;

const BASE_MINES = 10;
const AUTO_REVEAL_LIMIT = 12;
const STORAGE_KEY = 'mine-sweep-sprint-best';

let state = 'idle'; // idle | running | gameover
let mode = 'reveal'; // reveal | flag
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let flash = 0;

let board = [];
let mineCount = BASE_MINES;
let safeLeft = 0;
let firstMove = true;

bestEl.textContent = String(best);

const audioCtx = window.AudioContext ? new AudioContext() : null;

function beep(freq, duration, gain = 0.02) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function idx(r, c) {
  return r * COLS + c;
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function forEachNeighbor(r, c, fn) {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      fn(nr, nc);
    }
  }
}

function makeCell() {
  return {
    mine: false,
    revealed: false,
    flagged: false,
    count: 0,
    explode: false,
  };
}

function computeCounts() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = board[idx(r, c)];
      if (cell.mine) {
        cell.count = -1;
        continue;
      }

      let count = 0;
      forEachNeighbor(r, c, (nr, nc) => {
        if (board[idx(nr, nc)].mine) count += 1;
      });
      cell.count = count;
    }
  }
}

function buildBoard(mines) {
  board = Array(ROWS * COLS).fill(0).map(makeCell);
  safeLeft = ROWS * COLS - mines;
  firstMove = true;

  const taken = new Set();
  while (taken.size < mines) {
    const pick = Math.floor(Math.random() * board.length);
    if (taken.has(pick)) continue;
    taken.add(pick);
    board[pick].mine = true;
  }

  computeCounts();
}

function relocateMine(avoidId) {
  const source = board[avoidId];
  if (!source.mine) return;

  source.mine = false;

  for (let i = 0; i < board.length; i += 1) {
    if (i !== avoidId && !board[i].mine) {
      board[i].mine = true;
      break;
    }
  }

  computeCounts();
}

function flaggedCount() {
  let total = 0;
  for (const cell of board) {
    if (cell.flagged) total += 1;
  }
  return total;
}

function setMode(nextMode) {
  mode = nextMode;
  btnMode.textContent = mode === 'reveal' ? 'Mode: Reveal' : 'Mode: Flag';
}

function nextRound() {
  score += 1;
  scoreEl.textContent = String(score);
  mineCount = Math.min(22, BASE_MINES + Math.floor(score * 0.7));
  buildBoard(mineCount);
  flash = 18;
  beep(980, 0.08, 0.03);
}

function revealFlood(startR, startC) {
  const queue = [[startR, startC]];
  const visited = new Set([idx(startR, startC)]);
  let opened = 0;

  while (queue.length > 0 && opened < AUTO_REVEAL_LIMIT) {
    const [r, c] = queue.shift();

    forEachNeighbor(r, c, (nr, nc) => {
      if (opened >= AUTO_REVEAL_LIMIT) return;

      const cellId = idx(nr, nc);
      const cell = board[cellId];
      if (cell.revealed || cell.flagged || cell.mine) return;

      cell.revealed = true;
      safeLeft -= 1;
      opened += 1;

      if (cell.count === 0 && !visited.has(cellId)) {
        visited.add(cellId);
        queue.push([nr, nc]);
      }
    });
  }
}

function endGame() {
  state = 'gameover';
  beep(160, 0.24, 0.06);
  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function revealCell(r, c) {
  if (!inBounds(r, c)) return;
  const id = idx(r, c);
  const cell = board[id];

  if (cell.revealed || cell.flagged) return;

  if (firstMove) {
    firstMove = false;
    relocateMine(id);
  }

  cell.revealed = true;

  if (cell.mine) {
    cell.explode = true;
    endGame();
    return;
  }

  safeLeft -= 1;
  beep(500 + cell.count * 70, 0.02, 0.012);

  if (cell.count === 0) {
    revealFlood(r, c);
  }

  if (safeLeft <= 0) {
    nextRound();
  }
}

function toggleFlag(r, c) {
  if (!inBounds(r, c)) return;
  const cell = board[idx(r, c)];
  if (cell.revealed) return;

  cell.flagged = !cell.flagged;
  beep(cell.flagged ? 760 : 420, 0.03, 0.014);
}

function playAt(r, c, forceFlag = false) {
  if (state !== 'running') {
    startGame();
  }

  if (forceFlag || mode === 'flag') {
    toggleFlag(r, c);
  } else {
    revealCell(r, c);
  }
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  flash = 0;
  mineCount = BASE_MINES;
  scoreEl.textContent = '0';
  setMode('reveal');
  buildBoard(mineCount);
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  state = 'running';
}

function boardCellFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  if (x < BOARD_X || x > BOARD_X + BOARD_W || y < BOARD_Y || y > BOARD_Y + BOARD_H) {
    return null;
  }

  const c = Math.floor((x - BOARD_X) / (CELL + GAP));
  const r = Math.floor((y - BOARD_Y) / (CELL + GAP));
  if (!inBounds(r, c)) return null;
  return { r, c };
}

function update() {
  tick += 1;
  if (flash > 0) flash -= 1;
}

function numberColor(n) {
  const map = {
    1: '#9ad0ff',
    2: '#89f7c8',
    3: '#ffe08a',
    4: '#ffb880',
    5: '#ff9b9b',
    6: '#dd95ff',
    7: '#cfd8e8',
    8: '#ffffff',
  };
  return map[n] || '#ffffff';
}

function drawFlag(x, y) {
  ctx.strokeStyle = '#cfe3ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + CELL * 0.38, y + CELL * 0.75);
  ctx.lineTo(x + CELL * 0.38, y + CELL * 0.28);
  ctx.stroke();

  ctx.fillStyle = '#ff7b74';
  ctx.beginPath();
  ctx.moveTo(x + CELL * 0.39, y + CELL * 0.30);
  ctx.lineTo(x + CELL * 0.75, y + CELL * 0.42);
  ctx.lineTo(x + CELL * 0.39, y + CELL * 0.54);
  ctx.closePath();
  ctx.fill();
}

function render() {
  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 40; i += 1) {
    const x = (i * 87) % W;
    const y = (i * 41 + tick * 1.0) % H;
    ctx.fillStyle = 'rgba(143, 188, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = flash > 0 ? 'rgba(120, 255, 190, 0.14)' : '#13213b';
  ctx.fillRect(BOARD_X - 10, BOARD_Y - 10, BOARD_W + 20, BOARD_H + 20);

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const x = BOARD_X + c * (CELL + GAP);
      const y = BOARD_Y + r * (CELL + GAP);
      const cell = board[idx(r, c)];

      const showMine = state === 'gameover' && cell.mine;

      if (cell.revealed || showMine) {
        if (cell.mine) {
          ctx.fillStyle = cell.explode ? '#ff5f6d' : '#2f2030';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.fillStyle = cell.explode ? '#fff3f3' : '#ff9ba4';
          ctx.beginPath();
          ctx.arc(x + CELL * 0.5, y + CELL * 0.5, CELL * 0.18, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#20365c';
          ctx.fillRect(x, y, CELL, CELL);

          if (cell.count > 0) {
            ctx.fillStyle = numberColor(cell.count);
            ctx.font = 'bold 20px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cell.count), x + CELL * 0.5, y + CELL * 0.56);
          }
        }
      } else {
        ctx.fillStyle = '#172846';
        ctx.fillRect(x, y, CELL, CELL);
        if (cell.flagged) drawFlag(x, y);
      }

      ctx.strokeStyle = 'rgba(225, 238, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    }
  }

  const minesLeft = mineCount - flaggedCount();
  ctx.fillStyle = '#e8effb';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 18px system-ui';
  ctx.fillText(`Mines: ${minesLeft}`, 18, 66);
  ctx.fillText(`Mode: ${mode === 'reveal' ? 'Reveal' : 'Flag'}`, 18, 92);

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Boom!', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('Clear all safe tiles to score', W / 2, H / 2 + 18);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

btnStart.addEventListener('click', startGame);

btnMode.addEventListener('click', () => {
  setMode(mode === 'reveal' ? 'flag' : 'reveal');
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'f' || event.key === 'F') {
    setMode(mode === 'reveal' ? 'flag' : 'reveal');
  }

  if (event.key === ' ') {
    if (state !== 'running') {
      startGame();
    }
  }
});

canvas.addEventListener('pointerdown', (event) => {
  const cell = boardCellFromPointer(event);
  if (!cell) {
    if (state !== 'running') startGame();
    return;
  }

  playAt(cell.r, cell.c, false);
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const cell = boardCellFromPointer(event);
  if (!cell) return;

  if (state !== 'running') {
    startGame();
    return;
  }

  playAt(cell.r, cell.c, true);
});

resetGame();
loop();
