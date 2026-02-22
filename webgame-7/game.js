const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');

const W = canvas.width;
const H = canvas.height;

const lanes = 3;
const laneWidth = W / lanes;
const roadPadding = 12;

const player = {
  lane: 1,
  x: 0,
  y: H - 140,
  w: 50,
  h: 90,
  img: null,
};

const enemyCars = [];
const particles = [];
let speed = 4.2;
let score = 0;
let best = Number(localStorage.getItem('laneDashBest') || 0);
let running = true;
let spawnTimer = 0;
let lastTime = 0;

const assetBase = '../assets/kenney_car-kit/Previews/';
const carImages = [
  'race.png',
  'taxi.png',
  'police.png',
  'sedan.png',
  'suv.png',
  'hatchback-sports.png'
].map(name => loadImage(assetBase + name));

player.img = loadImage(assetBase + 'race-future.png');

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function laneX(lane) {
  return lane * laneWidth + laneWidth / 2;
}

function spawnEnemy() {
  const lane = Math.floor(Math.random() * lanes);
  const img = carImages[Math.floor(Math.random() * carImages.length)];
  enemyCars.push({
    lane,
    x: laneX(lane),
    y: -120,
    w: 50,
    h: 90,
    img
  });
}

function drawRoad() {
  ctx.fillStyle = '#0b0f16';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#161b24';
  ctx.fillRect(roadPadding, 0, W - roadPadding * 2, H);

  ctx.strokeStyle = '#2a3242';
  ctx.lineWidth = 2;
  ctx.strokeRect(roadPadding, 0, W - roadPadding * 2, H);

  ctx.strokeStyle = '#3b4457';
  ctx.setLineDash([20, 20]);
  for (let i = 1; i < lanes; i++) {
    const x = i * laneWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCar(obj) {
  const x = obj.x - obj.w / 2;
  const y = obj.y - obj.h / 2;
  if (obj.img && obj.img.complete && obj.img.naturalWidth) {
    ctx.drawImage(obj.img, x, y, obj.w, obj.h);
  } else {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, y, obj.w, obj.h);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.fillStyle = `rgba(255,200,80,${p.life})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.y += p.vy * dt;
    p.x += p.vx * dt;
    p.life -= 0.015 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function crashEffect(x, y) {
  for (let i = 0; i < 24; i++) {
    particles.push({
      x, y,
      r: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 1
    });
  }
}

function rectsOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
         Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function update(dt) {
  if (!running) return;

  speed = 4.2 + Math.min(6, score / 600);
  spawnTimer += dt;
  if (spawnTimer > Math.max(420, 900 - score * 0.4)) {
    spawnTimer = 0;
    spawnEnemy();
  }

  for (let i = enemyCars.length - 1; i >= 0; i--) {
    const e = enemyCars[i];
    e.y += speed * dt * 0.06;
    if (e.y > H + 120) enemyCars.splice(i, 1);
    if (rectsOverlap(player, e)) {
      gameOver();
      crashEffect(player.x, player.y);
      break;
    }
  }

  score += speed * dt * 0.05;
  scoreEl.textContent = Math.floor(score);
  updateParticles(dt);
}

function draw() {
  drawRoad();
  for (const e of enemyCars) drawCar(e);
  drawCar(player);
  drawParticles();
}

function gameLoop(time = 0) {
  const dt = time - lastTime;
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function moveLane(dir) {
  if (!running) return;
  player.lane = Math.min(lanes - 1, Math.max(0, player.lane + dir));
  player.x = laneX(player.lane);
}

function gameOver() {
  running = false;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = 'Game Over';
  if (score > best) {
    best = Math.floor(score);
    localStorage.setItem('laneDashBest', best);
  }
  bestEl.textContent = best;
}

function restart() {
  enemyCars.length = 0;
  particles.length = 0;
  score = 0;
  running = true;
  player.lane = 1;
  player.x = laneX(player.lane);
  player.y = H - 140;
  spawnTimer = 0;
  overlay.classList.add('hidden');
  scoreEl.textContent = 0;
  bestEl.textContent = best;
}

// Input

document.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') moveLane(-1);
  if (e.code === 'ArrowRight') moveLane(1);
  if (e.code === 'KeyR') restart();
});

let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, {passive:true});
canvas.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 30) moveLane(dx > 0 ? 1 : -1);
  else moveLane(dx >= 0 ? 1 : -1);
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  moveLane(x < rect.width / 2 ? -1 : 1);
});

document.getElementById('btnLeft').addEventListener('click', () => moveLane(-1));
document.getElementById('btnRight').addEventListener('click', () => moveLane(1));
document.getElementById('btnRestart').addEventListener('click', () => restart());
document.getElementById('btnResume').addEventListener('click', () => restart());

// Init
bestEl.textContent = best;
player.x = laneX(player.lane);
restart();
requestAnimationFrame(gameLoop);
