const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const SIZE = 4;
const CELL = 86;
const GAP = 8;
const BOARD_SIZE = SIZE * CELL + (SIZE - 1) * GAP;
const BOARD_X = (W - BOARD_SIZE) * 0.5;
const BOARD_Y = 160;
const STORAGE_KEY = 'merge-2048-tiny-best';

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let flash = 0;

let board = Array(16).fill(0);
let pointerStart = null;

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

function tileColor(v) {
  const map = {
    0: '#1a253d',
    2: '#d7ecff',
    4: '#b8ddff',
    8: '#95c8ff',
    16: '#72b1ff',
    32: '#5895ff',
    64: '#4f7cff',
    128: '#5b68ff',
    256: '#7a5dff',
    512: '#9a59ff',
    1024: '#c357ff',
    2048: '#f6c86f',
  };
  return map[v] || '#ff8a65';
}

function resetBoard() {
  board = Array(16).fill(0);
  spawnTile();
  spawnTile();
}

function spawnTile() {
  const empty = [];
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === 0) empty.push(i);
  }
  if (empty.length === 0) return;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  board[idx] = Math.random() < 0.9 ? 2 : 4;
}

function lineIndices(dir, i) {
  const idx = [];
  if (dir === 'left') {
    for (let c = 0; c < SIZE; c += 1) idx.push(i * SIZE + c);
  } else if (dir === 'right') {
    for (let c = SIZE - 1; c >= 0; c -= 1) idx.push(i * SIZE + c);
  } else if (dir === 'up') {
    for (let r = 0; r < SIZE; r += 1) idx.push(r * SIZE + i);
  } else {
    for (let r = SIZE - 1; r >= 0; r -= 1) idx.push(r * SIZE + i);
  }
  return idx;
}

function compressAndMerge(line) {
  const arr = line.filter((v) => v !== 0);
  let merged = false;

  for (let i = 0; i < arr.length - 1; i += 1) {
    if (arr[i] !== 0 && arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr.splice(i + 1, 1);
      merged = true;
    }
  }

  while (arr.length < SIZE) arr.push(0);
  return { arr, merged };
}

function hasMoves() {
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === 0) return true;
  }

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const v = board[r * SIZE + c];
      if (c < SIZE - 1 && board[r * SIZE + c + 1] === v) return true;
      if (r < SIZE - 1 && board[(r + 1) * SIZE + c] === v) return true;
    }
  }
  return false;
}

function move(dir) {
  if (state !== 'running') {
    startGame();
    return;
  }

  let changed = false;
  let mergedAny = false;

  for (let i = 0; i < SIZE; i += 1) {
    const ids = lineIndices(dir, i);
    const oldLine = ids.map((id) => board[id]);
    const { arr, merged } = compressAndMerge(oldLine);

    if (merged) mergedAny = true;

    for (let k = 0; k < SIZE; k += 1) {
      if (board[ids[k]] !== arr[k]) changed = true;
      board[ids[k]] = arr[k];
    }
  }

  if (!changed) {
    beep(230, 0.03, 0.01);
    return;
  }

  if (mergedAny) {
    flash = 10;
    beep(780, 0.045, 0.02);
  } else {
    beep(520, 0.03, 0.014);
  }

  scoreEl.textContent = String(score);
  spawnTile();

  if (!hasMoves()) {
    endGame();
  }
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  flash = 0;
  resetBoard();
  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  beep(170, 0.23, 0.06);
  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function drawBoard() {
  ctx.fillStyle = flash > 0 ? 'rgba(112, 255, 190, 0.14)' : '#12203a';
  ctx.fillRect(BOARD_X - 10, BOARD_Y - 10, BOARD_SIZE + 20, BOARD_SIZE + 20);

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const i = r * SIZE + c;
      const v = board[i];
      const x = BOARD_X + c * (CELL + GAP);
      const y = BOARD_Y + r * (CELL + GAP);

      ctx.fillStyle = tileColor(v);
      ctx.fillRect(x, y, CELL, CELL);

      if (v > 0) {
        ctx.fillStyle = v <= 4 ? '#123' : '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${v >= 1024 ? 24 : 30}px system-ui`;
        ctx.fillText(String(v), x + CELL * 0.5, y + CELL * 0.55);
      }
    }
  }
}

function update() {
  tick += 1;
  if (flash > 0) flash -= 1;
}

function render() {
  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 89) % W;
    const y = (i * 43 + tick * 0.9) % H;
    ctx.fillStyle = 'rgba(142, 188, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  drawBoard();

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'No More Moves', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('Swipe or arrow keys to merge tiles', W / 2, H / 2 + 18);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') move('up');
  if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') move('down');
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') move('left');
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') move('right');
  if (event.key === ' ') startGame();
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  if (state !== 'running') {
    startGame();
    pointerStart = null;
    return;
  }

  pointerStart = { x, y };
});

canvas.addEventListener('pointerup', (event) => {
  if (!pointerStart) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  const dx = x - pointerStart.x;
  const dy = y - pointerStart.y;
  pointerStart = null;

  if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'down' : 'up');
  }
});

btnStart.addEventListener('click', startGame);

resetGame();
loop();
