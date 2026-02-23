const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'knife-hit-lite-best';
const TAU = Math.PI * 2;

const target = {
  x: W / 2,
  y: H * 0.34,
  r: 76,
  rot: 0,
  speed: 0.025,
};

const flyingKnife = {
  active: false,
  x: W / 2,
  y: H - 88,
  vy: 14,
};

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let level = 1;
let knivesLeft = 6;
let tick = 0;
let shake = 0;

let stuck = [];
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

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeAngle(a) {
  let n = a % TAU;
  if (n < 0) n += TAU;
  return n;
}

function shortestAngleDiff(a, b) {
  let d = normalizeAngle(a) - normalizeAngle(b);
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function addBurst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 26 + Math.random() * 20,
      color,
    });
  }
}

function addSeedKnives(count) {
  const minGap = 0.36;

  for (let i = 0; i < count; i += 1) {
    let tries = 0;
    while (tries < 100) {
      const candidate = rand(0, TAU);
      let valid = true;
      for (const angle of stuck) {
        if (Math.abs(shortestAngleDiff(candidate, angle)) < minGap) {
          valid = false;
          break;
        }
      }
      if (valid) {
        stuck.push(candidate);
        break;
      }
      tries += 1;
    }
  }
}

function setupLevel() {
  target.rot = rand(0, TAU);
  target.speed = (Math.random() > 0.5 ? 1 : -1) * (0.02 + Math.min(0.03, level * 0.0026));
  knivesLeft = Math.min(12, 5 + Math.floor(level * 0.75));
  stuck = [];

  const seedCount = Math.min(6, Math.floor((level - 1) / 2));
  addSeedKnives(seedCount);

  flyingKnife.active = false;
  flyingKnife.y = H - 88;
}

function resetGame() {
  state = 'idle';
  score = 0;
  level = 1;
  tick = 0;
  shake = 0;
  particles = [];

  setupLevel();
  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  shake = 12;
  addBurst(flyingKnife.x, flyingKnife.y, '#ff7b74', 24);
  beep(170, 0.22, 0.06);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function onPrimaryAction() {
  if (state !== 'running') {
    startGame();
    return;
  }

  if (!flyingKnife.active) {
    flyingKnife.active = true;
    flyingKnife.y = H - 88;
    beep(420, 0.035, 0.02);
  }
}

function stickKnife(hitAngleRelative) {
  stuck.push(hitAngleRelative);
  score += 1;
  knivesLeft -= 1;
  scoreEl.textContent = String(score);

  const hitAngleWorld = hitAngleRelative + target.rot;
  const hitX = target.x + Math.cos(hitAngleWorld) * target.r;
  const hitY = target.y + Math.sin(hitAngleWorld) * target.r;
  addBurst(hitX, hitY, '#7de3ff', 10);
  beep(720 + Math.min(260, score * 9), 0.04, 0.018);

  flyingKnife.active = false;
  flyingKnife.y = H - 88;

  if (knivesLeft <= 0) {
    level += 1;
    addBurst(target.x, target.y, '#ffe08a', 28);
    beep(1020, 0.09, 0.028);
    setupLevel();
  }
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.life -= 1;
  }
  particles = particles.filter((p) => p.life > 0);

  if (state !== 'running') return;

  target.rot += target.speed;

  if (tick % 280 === 0) {
    target.speed *= -1;
  }

  if (flyingKnife.active) {
    flyingKnife.y -= flyingKnife.vy;

    const knifeTipY = flyingKnife.y - 22;
    const dy = knifeTipY - target.y;
    const dx = flyingKnife.x - target.x;
    const dist = Math.hypot(dx, dy);

    if (dist <= target.r + 2) {
      const hitAngleWorld = Math.atan2(dy, dx);
      const hitRelative = normalizeAngle(hitAngleWorld - target.rot);
      const minGap = 0.24;

      for (const existing of stuck) {
        if (Math.abs(shortestAngleDiff(hitRelative, existing)) < minGap) {
          endGame();
          return;
        }
      }

      stickKnife(hitRelative);
    }
  }
}

function drawKnifeAt(x, y, angle, len = 52, color = '#ffffff') {
  const tipX = x + Math.cos(angle) * len;
  const tipY = y + Math.sin(angle) * len;

  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const handleX = x - Math.cos(angle) * 8;
  const handleY = y - Math.sin(angle) * 8;
  ctx.fillStyle = '#ff8a65';
  ctx.beginPath();
  ctx.arc(handleX, handleY, 4, 0, TAU);
  ctx.fill();
}

function render() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.85;
  }

  ctx.fillStyle = '#0b1121';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 83) % W;
    const y = (i * 39 + tick * 0.8) % H;
    ctx.fillStyle = 'rgba(142, 190, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = '#18294f';
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r + 10, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#6bf0ff';
  ctx.shadowColor = '#6bf0ff';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  for (const relativeAngle of stuck) {
    const angle = relativeAngle + target.rot;
    const baseX = target.x + Math.cos(angle) * target.r;
    const baseY = target.y + Math.sin(angle) * target.r;
    drawKnifeAt(baseX, baseY, angle, 46, '#ffffff');
  }

  drawKnifeAt(flyingKnife.x, flyingKnife.y, -Math.PI / 2, 46, '#fefefe');

  for (const p of particles) {
    if (p.y < -10 || p.y > H + 10) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#e6eefb';
  ctx.font = 'bold 17px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`Level ${level}`, 16, 32);
  ctx.fillText(`Left ${knivesLeft}`, 16, 56);

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Throw' : 'Knife Crash', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap or press Space to throw knife', W / 2, H / 2 + 18);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') {
    onPrimaryAction();
  }
});

canvas.addEventListener('pointerdown', onPrimaryAction);
btnStart.addEventListener('click', startGame);

resetGame();
loop();
