const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'cross-road-micro-best';

const COLS = 9;
const ROWS = 13;
const CELL = 44;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BOARD_X = (W - BOARD_W) * 0.5;
const BOARD_Y = 74;

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let shake = 0;

const player = { c: Math.floor(COLS / 2), r: ROWS - 1 };
let lanes = [];
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

function addBurst(x, y, color, amount = 10) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 20 + Math.random() * 16,
      color,
    });
  }
}

function makeLanes() {
  lanes = [];
  for (let r = 1; r < ROWS - 1; r += 1) {
    const dir = r % 2 === 0 ? 1 : -1;
    const speed = 0.025 + (r % 3) * 0.012 + score * 0.0007;
    const cars = [];
    const carCount = 2 + (r % 2);
    for (let i = 0; i < carCount; i += 1) {
      cars.push({ x: Math.random() * W + i * 140 });
    }
    lanes.push({ r, dir, speed, cars });
  }
}

function resetPlayer() {
  player.c = Math.floor(COLS / 2);
  player.r = ROWS - 1;
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;
  particles.length = 0;
  resetPlayer();
  makeLanes();
  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  shake = 10;
  beep(170, 0.23, 0.055);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function movePlayer(dc, dr) {
  if (state !== 'running') {
    startGame();
    return;
  }
  const nc = Math.max(0, Math.min(COLS - 1, player.c + dc));
  const nr = Math.max(0, Math.min(ROWS - 1, player.r + dr));
  if (nc === player.c && nr === player.r) return;
  player.c = nc;
  player.r = nr;
  beep(520, 0.03, 0.015);

  const px = BOARD_X + player.c * CELL + CELL * 0.5;
  const py = BOARD_Y + player.r * CELL + CELL * 0.5;
  addBurst(px, py, '#7de3ff', 8);

  if (player.r === 0) {
    score += 1;
    scoreEl.textContent = String(score);
    beep(980, 0.08, 0.03);
    addBurst(px, py, '#ffe08a', 22);
    resetPlayer();
    makeLanes();
  }
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (state !== 'running') return;

  for (const lane of lanes) {
    for (const car of lane.cars) {
      car.x += lane.dir * lane.speed * 16;
      if (lane.dir > 0 && car.x > W + 60) car.x = -60;
      if (lane.dir < 0 && car.x < -60) car.x = W + 60;

      if (lane.r === player.r) {
        const px = BOARD_X + player.c * CELL + CELL * 0.5;
        if (Math.abs(car.x - px) < 28) {
          endGame();
          return;
        }
      }
    }
  }
}

function render() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.85;
  }

  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let r = 0; r < ROWS; r += 1) {
    const y = BOARD_Y + r * CELL;
    if (r === 0 || r === ROWS - 1) {
      ctx.fillStyle = '#173a2b';
    } else {
      ctx.fillStyle = r % 2 === 0 ? '#2a3242' : '#242c3c';
    }
    ctx.fillRect(BOARD_X, y, BOARD_W, CELL - 1);
  }

  for (let c = 0; c < COLS; c += 1) {
    const x = BOARD_X + c * CELL + CELL * 0.5;
    ctx.fillStyle = 'rgba(180,200,230,0.25)';
    ctx.fillRect(x - 2, BOARD_Y + CELL, 4, BOARD_H - CELL * 2);
  }

  for (const lane of lanes) {
    const y = BOARD_Y + lane.r * CELL + CELL * 0.5;
    for (const car of lane.cars) {
      ctx.fillStyle = '#ff8a65';
      ctx.fillRect(car.x - 22, y - 13, 44, 26);
      ctx.fillStyle = '#0f1628';
      ctx.fillRect(car.x - 10, y - 7, 20, 14);
    }
  }

  const px = BOARD_X + player.c * CELL + CELL * 0.5;
  const py = BOARD_Y + player.r * CELL + CELL * 0.5;
  ctx.fillStyle = '#7de3ff';
  ctx.shadowColor = '#7de3ff';
  ctx.shadowBlur = 14;
  ctx.fillRect(px - 14, py - 14, 28, 28);
  ctx.shadowBlur = 0;

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Cross' : 'Crash!', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Reach the top row repeatedly', W / 2, H / 2 + 20);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') movePlayer(0, -1);
  if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') movePlayer(0, 1);
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') movePlayer(-1, 0);
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') movePlayer(1, 0);
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

  const px = BOARD_X + player.c * CELL + CELL * 0.5;
  const py = BOARD_Y + player.r * CELL + CELL * 0.5;
  const dx = x - px;
  const dy = y - py;
  if (Math.abs(dx) > Math.abs(dy)) {
    movePlayer(dx > 0 ? 1 : -1, 0);
  } else {
    movePlayer(0, dy > 0 ? 1 : -1);
  }
});

btnStart.addEventListener('click', startGame);

resetGame();
loop();
