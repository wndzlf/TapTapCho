const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'orbit-survivor-best';

const center = { x: W * 0.5, y: H * 0.52 };
const ORBIT_R = 126;

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let shake = 0;

let orbitAngle = -Math.PI * 0.5;
let orbitDir = 1;
let orbitSpeed = 0.042;

const projectiles = [];
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

function addBurst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 20 + Math.random() * 20,
      color,
    });
  }
}

function spawnProjectile() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 250 + Math.random() * 120;
  const speed = 2.1 + Math.random() * 1.6 + Math.min(1.4, score / 160);

  const sx = center.x + Math.cos(angle) * dist;
  const sy = center.y + Math.sin(angle) * dist;
  const dx = center.x - sx;
  const dy = center.y - sy;
  const len = Math.hypot(dx, dy);

  projectiles.push({
    x: sx,
    y: sy,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    size: 8 + Math.random() * 6,
    passed: false,
  });
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;

  orbitAngle = -Math.PI * 0.5;
  orbitDir = 1;
  orbitSpeed = 0.042;

  projectiles.length = 0;
  particles.length = 0;
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
  beep(180, 0.22, 0.055);

  const px = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const py = center.y + Math.sin(orbitAngle) * ORBIT_R;
  addBurst(px, py, '#ff7b74', 24);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function action() {
  if (state !== 'running') {
    startGame();
    return;
  }
  orbitDir *= -1;
  beep(560, 0.04, 0.018);
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.life -= 1;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (state !== 'running') return;

  orbitAngle += orbitDir * orbitSpeed;
  orbitSpeed = Math.min(0.075, 0.042 + score * 0.00006);

  if (tick % Math.max(22, 52 - Math.floor(score / 35)) === 0) {
    spawnProjectile();
  }

  const px = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const py = center.y + Math.sin(orbitAngle) * ORBIT_R;

  for (const s of projectiles) {
    s.x += s.vx;
    s.y += s.vy;

    const d = Math.hypot(s.x - px, s.y - py);
    if (d < s.size + 10) {
      endGame();
      return;
    }

    const dc = Math.hypot(s.x - center.x, s.y - center.y);
    if (dc < 12 && !s.passed) {
      s.passed = true;
      score += 1;
      scoreEl.textContent = String(score);
      addBurst(s.x, s.y, '#7de3ff', 10);
      beep(780 + Math.min(200, score * 6), 0.03, 0.015);
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const s = projectiles[i];
    if (s.x < -100 || s.x > W + 100 || s.y < -100 || s.y > H + 100) {
      projectiles.splice(i, 1);
    }
  }
}

function render() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.84;
  }

  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 44; i += 1) {
    const x = (i * 89) % W;
    const y = (i * 43 + tick * 0.9) % H;
    ctx.fillStyle = 'rgba(145,190,255,0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(109, 200, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, ORBIT_R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1a2c4a';
  ctx.beginPath();
  ctx.arc(center.x, center.y, 13, 0, Math.PI * 2);
  ctx.fill();

  for (const s of projectiles) {
    ctx.fillStyle = '#ff8a65';
    ctx.shadowColor = '#ff8a65';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  const px = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const py = center.y + Math.sin(orbitAngle) * ORBIT_R;

  ctx.fillStyle = '#7de3ff';
  ctx.shadowColor = '#7de3ff';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 35);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Orbit' : 'Shattered', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Switch direction to survive', W / 2, H / 2 + 20);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') action();
});

canvas.addEventListener('pointerdown', action);
btnStart.addEventListener('click', startGame);

resetGame();
loop();
