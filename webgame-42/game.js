const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedEl = document.getElementById('speed');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
const STORAGE_KEY = 'winter-ski-rush-best';

let state = 'idle'; // idle | running | over
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let speed = 1;
let tick = 0;

const skier = { x: W * 0.5, y: H * 0.72, r: 10, vx: 0 };
const obstacles = [];

const touch = { active: false, x: 0 };
let lastTapAt = 0;

bestEl.textContent = String(best);

function resetGame() {
  state = 'idle';
  score = 0;
  speed = 1;
  tick = 0;
  skier.x = W * 0.5;
  skier.vx = 0;
  obstacles.length = 0;
  scoreEl.textContent = '0';
  speedEl.textContent = '1.0x';
}

function startGame() {
  resetGame();
  state = 'running';
}

function addObstacle() {
  const x = 40 + Math.random() * (W - 80);
  obstacles.push({ x, y: -20, r: 12 + Math.random() * 6, type: (Math.random() < 0.34 ? 'santa' : (Math.random() < 0.5 ? 'rudolph' : 'tree')) });
}

function boost() {
  const now = performance.now();
  if (now - lastTapAt < 200) return;
  lastTapAt = now;
  speed = Math.min(1.6, speed + 0.18);
}

function update() {
  if (state !== 'running') return;
  tick += 1;
  speed = Math.max(1, speed - 0.0008);

  const targetX = touch.active ? touch.x : W * 0.5;
  const dx = targetX - skier.x;
  skier.vx = dx * 0.08;
  skier.x += skier.vx;
  skier.x = Math.max(20, Math.min(W - 20, skier.x));

  if (tick % 26 === 0) addObstacle();

  const fallSpeed = 2.4 + speed * 1.6;
  obstacles.forEach(o => { o.y += fallSpeed; });

  // collisions
  for (const o of obstacles) {
    const d = Math.hypot(o.x - skier.x, o.y - skier.y);
    if (d < o.r + skier.r) {
      state = 'over';
    }
  }

  if (state === 'over') {
    best = Math.max(best, score);
    bestEl.textContent = String(best);
    localStorage.setItem(STORAGE_KEY, String(best));
  }

  score += 0.02 * speed;
  scoreEl.textContent = String(Math.floor(score));
  speedEl.textContent = `${speed.toFixed(1)}x`;

  // cleanup
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].y > H + 30) obstacles.splice(i, 1);
  }

  // skier (simple ski silhouette)
  ctx.save();
  ctx.translate(skier.x, skier.y);
  const tilt = clamp(skier.vx * 0.03, -0.25, 0.25);
  ctx.rotate(tilt);

  // skis
  ctx.strokeStyle = '#cfe6ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, 10);
  ctx.lineTo(12, 14);
  ctx.moveTo(-12, 14);
  ctx.lineTo(14, 18);
  ctx.stroke();

  // body
  ctx.fillStyle = '#ffd88a';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-8, 8);
  ctx.lineTo(8, 8);
  ctx.closePath();
  ctx.fill();

  // head
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -14, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (state === 'idle' || state === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Crashed!', W/2, H/2 - 10);
    ctx.font = '14px system-ui';
    ctx.fillText('Swipe to steer · Tap for boost', W/2, H/2 + 18);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// input
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  touch.active = true;
  touch.x = x;
  if (state !== 'running') { startGame(); } else { boost(); }
});

canvas.addEventListener('pointermove', (e) => {
  if (!touch.active) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  touch.x = x;
});

canvas.addEventListener('pointerup', () => {
  touch.active = false;
});

btnStart.addEventListener('click', startGame);

resetGame();
loop();
