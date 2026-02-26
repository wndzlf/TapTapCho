const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'air-striker-lite-best';

const player = {
  x: W * 0.5,
  y: H - 94,
  r: 15,
  speed: 320,
  fireCd: 0,
};

const keys = Object.create(null);
const pointer = { x: player.x, y: player.y, active: false };

let state = 'idle'; // idle | running | gameover
let score = 0;
let hp = 3;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let spawnTimer = 0;
let flash = 0;

let bullets = [];
let enemies = [];
let particles = [];

bestEl.textContent = String(best);

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function addBurst(x, y, color, count = 12) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: rand(-3, 3),
      vy: rand(-3, 3),
      life: rand(18, 34),
      color,
    });
  }
}

function spawnEnemy() {
  const type = Math.random() < 0.2 ? 'heavy' : 'normal';
  const hpEnemy = type === 'heavy' ? 3 : 1;

  enemies.push({
    x: rand(24, W - 24),
    y: -26,
    vx: rand(-22, 22),
    vy: rand(100, 180) + Math.min(110, score * 1.2),
    r: type === 'heavy' ? 18 : 14,
    hp: hpEnemy,
    type,
    rot: rand(0, Math.PI * 2),
  });
}

function resetGame() {
  state = 'idle';
  score = 0;
  hp = 3;
  tick = 0;
  spawnTimer = 0;
  flash = 0;

  player.x = W * 0.5;
  player.y = H - 94;
  player.fireCd = 0;

  bullets = [];
  enemies = [];
  particles = [];

  scoreEl.textContent = '0';
  hpEl.textContent = '3';
}

function startGame() {
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function shoot() {
  bullets.push({ x: player.x, y: player.y - 20, vy: -560, r: 4 });
  bullets.push({ x: player.x - 8, y: player.y - 10, vy: -560, r: 4 });
  bullets.push({ x: player.x + 8, y: player.y - 10, vy: -560, r: 4 });
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;

  if (keys.ArrowLeft || keys.KeyA) mx -= 1;
  if (keys.ArrowRight || keys.KeyD) mx += 1;
  if (keys.ArrowUp || keys.KeyW) my -= 1;
  if (keys.ArrowDown || keys.KeyS) my += 1;

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my) || 1;
    player.x += (mx / len) * player.speed * dt;
    player.y += (my / len) * player.speed * dt;
  } else if (pointer.active) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const step = Math.min(player.speed * dt, dist);
      player.x += (dx / dist) * step;
      player.y += (dy / dist) * step;
    }
  }

  player.x = clamp(player.x, 22, W - 22);
  player.y = clamp(player.y, 70, H - 22);

  player.fireCd -= dt;
  if (player.fireCd <= 0) {
    player.fireCd = 0.12;
    shoot();
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.y += b.vy * dt;
    if (b.y < -20) bullets.splice(i, 1);
  }
}

function updateEnemies(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(0.24, 0.78 - score * 0.003);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.rot += dt * 1.9;

    if (e.x < e.r || e.x > W - e.r) e.vx *= -1;

    if (e.y > H + 32) {
      enemies.splice(i, 1);
      hp -= 1;
      hpEl.textContent = String(Math.max(0, hp));
      flash = 20;
      if (hp <= 0) endGame();
    }
  }
}

function hitCheck() {
  for (let ei = enemies.length - 1; ei >= 0; ei -= 1) {
    const e = enemies[ei];

    for (let bi = bullets.length - 1; bi >= 0; bi -= 1) {
      const b = bullets[bi];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const rr = b.r + e.r;
      if (dx * dx + dy * dy > rr * rr) continue;

      bullets.splice(bi, 1);
      e.hp -= 1;
      addBurst(b.x, b.y, '#ffe9a8', 5);

      if (e.hp <= 0) {
        enemies.splice(ei, 1);
        addBurst(e.x, e.y, '#9df2ff', e.type === 'heavy' ? 28 : 16);
        score += e.type === 'heavy' ? 20 : 10;
        scoreEl.textContent = String(score);
      }
      break;
    }

    const pdx = player.x - e.x;
    const pdy = player.y - e.y;
    const pr = player.r + e.r - 2;
    if (pdx * pdx + pdy * pdy <= pr * pr) {
      enemies.splice(ei, 1);
      addBurst(player.x, player.y, '#ff7b74', 24);
      hp -= 1;
      hpEl.textContent = String(Math.max(0, hp));
      flash = 28;
      if (hp <= 0) {
        endGame();
        return;
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.09;
    p.life -= dt * 60;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function renderBackground() {
  ctx.fillStyle = '#15285f';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 60; i += 1) {
    const x = (i * 79) % W;
    const y = (i * 53 + tick * 1.3) % H;
    ctx.fillStyle = 'rgba(190, 218, 255, 0.28)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = '#ff9a36';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-14, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(14, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9ecff';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(-6, 2);
  ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffd372';
  ctx.fillRect(-4, 10, 8, 8);
  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = '#f7fbff';
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);

    ctx.fillStyle = e.type === 'heavy' ? '#93f6ff' : '#61dfff';
    ctx.beginPath();
    ctx.moveTo(0, -e.r);
    ctx.lineTo(-e.r, 0);
    ctx.lineTo(-e.r * 0.5, e.r * 0.9);
    ctx.lineTo(e.r * 0.5, e.r * 0.9);
    ctx.lineTo(e.r, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff7b74';
    ctx.beginPath();
    ctx.arc(0, -e.r * 0.2, e.type === 'heavy' ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function renderOverlay() {
  if (flash > 0) {
    ctx.fillStyle = 'rgba(255, 123, 116, 0.13)';
    ctx.fillRect(0, 0, W, H);
  }

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Game Over', W / 2, H / 2 - 10);
    ctx.font = '16px system-ui';
    ctx.fillText('Move and survive enemy waves', W / 2, H / 2 + 20);
  }
}

function render() {
  renderBackground();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles();
  renderOverlay();
}

function update(dt) {
  tick += 1;
  if (flash > 0) flash -= 1;

  updateParticles(dt);

  if (state !== 'running') return;

  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  hitCheck();

  if (score > best) {
    best = score;
    bestEl.textContent = String(best);
    localStorage.setItem(STORAGE_KEY, String(best));
  }
}

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) * (W / rect.width);
  pointer.y = (event.clientY - rect.top) * (H / rect.height);
}

btnStart.addEventListener('click', startGame);

canvas.addEventListener('pointerdown', (event) => {
  updatePointer(event);
  pointer.active = true;
  if (state !== 'running') startGame();
});

canvas.addEventListener('pointermove', (event) => {
  updatePointer(event);
});

window.addEventListener('pointerup', () => {
  pointer.active = false;
});

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space' && state !== 'running') {
    event.preventDefault();
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

resetGame();
requestAnimationFrame(loop);
