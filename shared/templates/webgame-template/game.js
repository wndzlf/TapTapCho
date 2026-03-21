const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = '__LOCALSTORAGE_KEY__-best';

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let shake = 0;

const player = {
  x: W / 2,
  y: H - 90,
  w: 44,
  h: 28,
  speed: 6,
  vx: 0,
};

let obstacles = [];
let particles = [];

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

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;
  obstacles = [];
  particles = [];
  player.x = W / 2;
  player.vx = 0;
  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  resetGame();
  state = 'running';
}

function spawnObstacle() {
  const w = 18 + Math.random() * 40;
  const h = 18 + Math.random() * 40;
  const x = 8 + Math.random() * (W - w - 16);
  const v = 2.6 + Math.random() * 2 + Math.min(2.8, score / 350);
  obstacles.push({ x, y: -h, w, h, v });
}

function addBurst(x, y, color) {
  for (let i = 0; i < 10; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 30 + Math.random() * 16,
      color,
    });
  }
}

function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
  if (state !== 'running') return;

  tick += 1;
  if (tick % 32 === 0) {
    spawnObstacle();
  }

  player.x += player.vx;
  const halfW = player.w / 2;
  if (player.x < halfW) player.x = halfW;
  if (player.x > W - halfW) player.x = W - halfW;

  for (const obs of obstacles) {
    obs.y += obs.v;
  }
  obstacles = obstacles.filter((obs) => obs.y < H + 50);

  const pBox = {
    x: player.x - player.w / 2,
    y: player.y - player.h / 2,
    w: player.w,
    h: player.h,
  };

  for (const obs of obstacles) {
    if (collide(pBox, obs)) {
      state = 'gameover';
      shake = 12;
      addBurst(player.x, player.y, '#ff7b74');
      beep(180, 0.2, 0.05);
      best = Math.max(best, score);
      bestEl.textContent = String(best);
      localStorage.setItem(STORAGE_KEY, String(best));
      return;
    }
  }

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  }
  particles = particles.filter((p) => p.life > 0);

  score += 1;
  scoreEl.textContent = String(score);
  if (score % 120 === 0) {
    beep(620, 0.04);
  }
}

function render() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.85;
  }

  ctx.fillStyle = '#0c1324';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 97) % W;
    const y = (i * 37 + tick * 1.4) % H;
    ctx.fillStyle = 'rgba(140, 190, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  for (const obs of obstacles) {
    ctx.fillStyle = '#ff8a65';
    ctx.shadowColor = '#ff8a65';
    ctx.shadowBlur = 12;
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#7de3ff';
  ctx.shadowColor = '#7de3ff';
  ctx.shadowBlur = 20;
  ctx.fillRect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h);
  ctx.shadowBlur = 0;

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Game Over', W / 2, H / 2 - 10);
    ctx.font = '16px system-ui';
    ctx.fillText('Press Space or Tap to restart', W / 2, H / 2 + 22);
  }

  ctx.restore();
}

function frame() {
  update();
  render();
  requestAnimationFrame(frame);
}

function refreshVelocity() {
  if (inputLeft && !inputRight) player.vx = -player.speed;
  else if (!inputLeft && inputRight) player.vx = player.speed;
  else player.vx = 0;
}

let inputLeft = false;
let inputRight = false;

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    inputLeft = true;
    refreshVelocity();
  }
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
    inputRight = true;
    refreshVelocity();
  }
  if (event.key === ' ') {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    inputLeft = false;
    refreshVelocity();
  }
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
    inputRight = false;
    refreshVelocity();
  }
});

canvas.addEventListener('pointerdown', (event) => {
  if (state !== 'running') {
    startGame();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  inputLeft = x < rect.width / 2;
  inputRight = !inputLeft;
  refreshVelocity();
});

canvas.addEventListener('pointermove', (event) => {
  if (state !== 'running') return;
  if (!(event.buttons & 1)) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = W / rect.width;
  const x = (event.clientX - rect.left) * ratio;
  player.x = x;
});

canvas.addEventListener('pointerup', () => {
  inputLeft = false;
  inputRight = false;
  refreshVelocity();
});

btnStart.addEventListener('click', startGame);

resetGame();
frame();
