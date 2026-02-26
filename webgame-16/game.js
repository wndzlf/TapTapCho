const bgmAudio = window.TapTapNeonAudio?.create('webgame-16', document.querySelector('.hud'), { theme: 'pulse' });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'slide-puzzle-rush-best';

const SIZE = 4;
const CELL = 84;
const BOARD_X = (W - CELL * SIZE) * 0.5;
const BOARD_Y = 140;

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let timeLeft = 60;
let tick = 0;

let board = [];
let emptyIndex = 15;
let flash = 0;

const particles = [];

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

function indexToRC(index) {
  return [Math.floor(index / SIZE), index % SIZE];
}

function rcToIndex(r, c) {
  return r * SIZE + c;
}

function isAdjacent(a, b) {
  const [ar, ac] = indexToRC(a);
  const [br, bc] = indexToRC(b);
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

function addBurst(x, y, color, amount = 10) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 22 + Math.random() * 18,
      color,
    });
  }
}

function resetBoard() {
  board = Array.from({ length: 15 }, (_, i) => i + 1);
  board.push(0);
  emptyIndex = 15;

  for (let i = 0; i < 220; i += 1) {
    const [r, c] = indexToRC(emptyIndex);
    const opts = [];
    if (r > 0) opts.push(rcToIndex(r - 1, c));
    if (r < SIZE - 1) opts.push(rcToIndex(r + 1, c));
    if (c > 0) opts.push(rcToIndex(r, c - 1));
    if (c < SIZE - 1) opts.push(rcToIndex(r, c + 1));

    const pick = opts[Math.floor(Math.random() * opts.length)];
    board[emptyIndex] = board[pick];
    board[pick] = 0;
    emptyIndex = pick;
  }
}

function isSolved() {
  for (let i = 0; i < 15; i += 1) {
    if (board[i] !== i + 1) return false;
  }
  return board[15] === 0;
}

function resetGame() {
  state = 'idle';
  score = 0;
  timeLeft = 60;
  tick = 0;
  flash = 0;
  particles.length = 0;
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
  beep(170, 0.2, 0.055);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function tryMove(index) {
  if (state !== 'running') {
    startGame();
    return;
  }
  if (!isAdjacent(index, emptyIndex)) {
    beep(220, 0.03, 0.01);
    return;
  }

  const [r, c] = indexToRC(index);
  board[emptyIndex] = board[index];
  board[index] = 0;
  emptyIndex = index;

  const x = BOARD_X + c * CELL + CELL * 0.5;
  const y = BOARD_Y + r * CELL + CELL * 0.5;
  addBurst(x, y, '#7de3ff', 8);
  beep(560, 0.03, 0.015);

  if (isSolved()) {
    score += 1;
    scoreEl.textContent = String(score);
    timeLeft = Math.min(99, timeLeft + 18);
    flash = 28;
    beep(980, 0.08, 0.03);
    resetBoard();
  }
}

function moveByDir(dr, dc) {
  const [r, c] = indexToRC(emptyIndex);
  const nr = r + dr;
  const nc = c + dc;
  if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return;
  tryMove(rcToIndex(nr, nc));
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 1;
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (flash > 0) flash -= 1;

  if (state !== 'running') return;

  if (tick % 60 === 0) {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame();
    } else if (timeLeft <= 8) {
      beep(240, 0.04, 0.02);
    }
  }
}

function drawTile(index, value) {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  const x = BOARD_X + c * CELL;
  const y = BOARD_Y + r * CELL;

  if (value === 0) {
    ctx.fillStyle = '#111a30';
    ctx.fillRect(x + 5, y + 5, CELL - 10, CELL - 10);
    return;
  }

  const hue = (value * 20) % 360;
  ctx.fillStyle = `hsl(${hue} 78% 64%)`;
  ctx.fillRect(x + 5, y + 5, CELL - 10, CELL - 10);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x + 5, y + 5, CELL - 10, 14);

  ctx.fillStyle = '#0b1020';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px system-ui';
  ctx.fillText(String(value), x + CELL * 0.5, y + CELL * 0.55);
}

function render() {
  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 36; i += 1) {
    const x = (i * 93) % W;
    const y = (i * 41 + tick * 1.05) % H;
    ctx.fillStyle = 'rgba(140,190,255,0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = flash > 0 ? 'rgba(110, 255, 185, 0.16)' : '#101b33';
  ctx.fillRect(BOARD_X - 6, BOARD_Y - 6, CELL * SIZE + 12, CELL * SIZE + 12);

  for (let i = 0; i < board.length; i += 1) {
    drawTile(i, board[i]);
  }

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 36);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#e7eefb';
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px system-ui';
  ctx.fillText(`Time: ${timeLeft}s`, 18, 60);

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Time Up', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Solve as many boards as possible', W / 2, H / 2 + 20);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') moveByDir(1, 0);
  if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') moveByDir(-1, 0);
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') moveByDir(0, 1);
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') moveByDir(0, -1);
  if (event.key === ' ') startGame();
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  if (state !== 'running') {
    startGame();
    return;
  }

  if (x < BOARD_X || x > BOARD_X + CELL * SIZE || y < BOARD_Y || y > BOARD_Y + CELL * SIZE) return;

  const c = Math.floor((x - BOARD_X) / CELL);
  const r = Math.floor((y - BOARD_Y) / CELL);
  tryMove(rcToIndex(r, c));
});

btnStart.addEventListener('click', startGame);

resetGame();
loop();
