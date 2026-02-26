const bgmAudio = window.TapTapNeonAudio?.create('webgame-20', document.querySelector('.hud'), { theme: 'drift' });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const SIZE = 5;
const CELL = 66;
const GAP = 8;
const BOARD_SIZE = SIZE * CELL + (SIZE - 1) * GAP;
const BOARD_X = (W - BOARD_SIZE) * 0.5;
const BOARD_Y = 170;
const STORAGE_KEY = 'lights-out-rush-best';

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let timeLeft = 45;
let flash = 0;

let board = Array(SIZE * SIZE).fill(false);
let cursor = { r: 2, c: 2 };

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
  return r * SIZE + c;
}

function toggle(r, c) {
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
  board[idx(r, c)] = !board[idx(r, c)];
}

function applyMove(r, c) {
  toggle(r, c);
  toggle(r - 1, c);
  toggle(r + 1, c);
  toggle(r, c - 1);
  toggle(r, c + 1);
}

function allOff() {
  for (const cell of board) {
    if (cell) return false;
  }
  return true;
}

function scramble() {
  board = Array(SIZE * SIZE).fill(false);

  const moves = 9 + Math.min(26, score * 2);
  for (let i = 0; i < moves; i += 1) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    applyMove(r, c);
  }

  if (allOff()) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    applyMove(r, c);
  }
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  timeLeft = 45;
  flash = 0;
  cursor = { r: 2, c: 2 };
  scramble();
  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  beep(170, 0.22, 0.06);
  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function playCell(r, c) {
  if (state !== 'running') {
    startGame();
    return;
  }

  applyMove(r, c);
  beep(520, 0.03, 0.015);

  if (allOff()) {
    score += 1;
    scoreEl.textContent = String(score);
    timeLeft = Math.min(99, timeLeft + 12);
    flash = 24;
    beep(960, 0.08, 0.03);
    scramble();
  }
}

function update() {
  tick += 1;
  if (flash > 0) flash -= 1;

  if (state !== 'running') return;

  if (tick % 60 === 0) {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame();
    } else if (timeLeft <= 8) {
      beep(230, 0.04, 0.02);
    }
  }
}

function render() {
  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 89) % W;
    const y = (i * 41 + tick * 1.0) % H;
    ctx.fillStyle = 'rgba(143, 188, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = flash > 0 ? 'rgba(117, 255, 189, 0.14)' : '#11203a';
  ctx.fillRect(BOARD_X - 10, BOARD_Y - 10, BOARD_SIZE + 20, BOARD_SIZE + 20);

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const x = BOARD_X + c * (CELL + GAP);
      const y = BOARD_Y + r * (CELL + GAP);
      const on = board[idx(r, c)];

      ctx.fillStyle = on ? '#7de3ff' : '#182642';
      ctx.fillRect(x, y, CELL, CELL);

      if (cursor.r === r && cursor.c === c && state === 'running') {
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
      }
    }
  }

  ctx.fillStyle = '#e8effb';
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px system-ui';
  ctx.fillText(`Time: ${timeLeft}s`, 18, 66);

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Time Up', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Turn all lights off', W / 2, H / 2 + 20);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') cursor.r = Math.max(0, cursor.r - 1);
  if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') cursor.r = Math.min(SIZE - 1, cursor.r + 1);
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') cursor.c = Math.max(0, cursor.c - 1);
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') cursor.c = Math.min(SIZE - 1, cursor.c + 1);
  if (event.key === ' ' || event.key === 'Enter') playCell(cursor.r, cursor.c);
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  if (state !== 'running') {
    startGame();
    return;
  }

  if (x < BOARD_X || x > BOARD_X + BOARD_SIZE || y < BOARD_Y || y > BOARD_Y + BOARD_SIZE) return;

  const c = Math.floor((x - BOARD_X) / (CELL + GAP));
  const r = Math.floor((y - BOARD_Y) / (CELL + GAP));
  cursor = { r, c };
  playCell(r, c);
});

btnStart.addEventListener('click', startGame);

resetGame();
loop();
