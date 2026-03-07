const bgmAudio = window.TapTapNeonAudio?.create('webgame-18', document.querySelector('.hud'), {
  theme: 'mystic',
  mediaSrc: '../assets/audio/orbit-survivor-pixabay-492540.mp3',
  showThemeToggle: false,
  showSfxToggle: false,
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'orbit-survivor-best';

const BASE_CENTER_X = W * 0.5;
const BASE_CENTER_Y = H * 0.52;
const center = { x: BASE_CENTER_X, y: BASE_CENTER_Y };
const ORBIT_R = 126;
const ORBIT_DRIFT_START_SCORE = 20;

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let streak = 0;
let tick = 0;
let shake = 0;

let orbitAngle = -Math.PI * 0.5;
let orbitDir = 1;
let orbitSpeed = 0.042;
let orbitDriftDir = 1;
let orbitDriftSpeed = 0;
let orbitDriftWarn = 0;
let orbitDriftIntroFx = 0;
let lastActionAt = 0;

const projectiles = [];
const particles = [];

bestEl.textContent = String(best);

const audioCtx = window.AudioContext ? new AudioContext() : null;

function beep(freq, duration, gain = 0.02) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
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

function playTurnSfx() {
  const speedBoost = Math.min(220, Math.max(0, orbitSpeed - 0.042) * 12000);
  const base = 520 + speedBoost + Math.random() * 16;
  beep(base, 0.05, 0.034);
  beep(base * 1.38, 0.03, 0.022);
  bgmAudio?.fx?.('ui');
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

function pickMissileType() {
  const tier = Math.min(3, Math.floor(score / 45));
  const roll = Math.random();
  if (tier >= 2 && roll < 0.18) return 'accel';
  if (tier >= 1 && roll < 0.45) return 'weave';
  if (tier >= 1 && roll < 0.7) return 'fast';
  return 'straight';
}

function spawnProjectile() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 250 + Math.random() * 120;
  const baseSpeed = 2.1 + Math.random() * 1.6 + Math.min(1.6, score / 140);

  const sx = center.x + Math.cos(angle) * dist;
  const sy = center.y + Math.sin(angle) * dist;
  const dx = center.x - sx;
  const dy = center.y - sy;
  const len = Math.hypot(dx, dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;

  const type = pickMissileType();
  const fastMul = type === 'fast' ? 1.35 : 1;
  const speed = baseSpeed * fastMul;
  const size = type === 'fast'
    ? 7 + Math.random() * 4
    : 8 + Math.random() * 6;

  const color = type === 'accel'
    ? '#7cffc5'
    : (type === 'weave' ? '#ffd86d' : (type === 'fast' ? '#ff6b6b' : '#ff8a65'));

  projectiles.push({
    x: sx,
    y: sy,
    dirX,
    dirY,
    speed,
    speedMax: speed + 1.6 + Math.min(1.2, score / 120),
    accel: type === 'accel' ? (0.02 + Math.min(0.035, score / 1800)) : 0,
    weaveAmp: type === 'weave' ? (5 + Math.min(7, score / 70)) : 0,
    weavePhase: Math.random() * Math.PI * 2,
    weaveSpeed: 0.12 + Math.random() * 0.08,
    perpX: -dirY,
    perpY: dirX,
    size,
    color,
    type,
    passed: false,
  });
}

function updateStreakHud() {
  streakEl.parentElement?.classList.toggle('hot', streak >= 3);
}

function resetGame() {
  state = 'idle';
  score = 0;
  streak = 0;
  tick = 0;
  shake = 0;

  orbitAngle = -Math.PI * 0.5;
  orbitDir = 1;
  orbitSpeed = 0.042;
  orbitDriftDir = 1;
  orbitDriftSpeed = 0;
  orbitDriftWarn = 0;
  orbitDriftIntroFx = 0;
  center.x = BASE_CENTER_X;
  center.y = BASE_CENTER_Y;

  projectiles.length = 0;
  particles.length = 0;
  scoreEl.textContent = '0';
  streakEl.textContent = '0';
  updateStreakHud();
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
  streak = 0;
  streakEl.textContent = '0';
  updateStreakHud();
}

function action() {
  const nowTime = performance.now();
  if (nowTime - lastActionAt < 120) return;
  lastActionAt = nowTime;

  if (state !== 'running') {
    startGame();
    return;
  }
  orbitDir *= -1;
  playTurnSfx();
}

function update() {
  tick += 1;
  orbitDriftWarn = Math.max(0, orbitDriftWarn - 1);
  orbitDriftIntroFx = Math.max(0, orbitDriftIntroFx - 1);

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

  if (score >= ORBIT_DRIFT_START_SCORE) {
    if (orbitDriftSpeed <= 0) {
      orbitDriftDir = Math.random() < 0.5 ? -1 : 1;
      orbitDriftIntroFx = 26;
      beep(430, 0.07, 0.028);
    }
    orbitDriftSpeed = Math.min(1.85, 0.55 + (score - ORBIT_DRIFT_START_SCORE) * 0.025);
    const minX = ORBIT_R + 34;
    const maxX = W - ORBIT_R - 34;
    center.x += orbitDriftDir * orbitDriftSpeed;
    if (center.x <= minX) {
      center.x = minX;
      orbitDriftDir = 1;
      orbitDriftWarn = 18;
      beep(360, 0.04, 0.02);
    } else if (center.x >= maxX) {
      center.x = maxX;
      orbitDriftDir = -1;
      orbitDriftWarn = 18;
      beep(360, 0.04, 0.02);
    }
  } else {
    orbitDriftSpeed = 0;
    center.x += (BASE_CENTER_X - center.x) * 0.08;
    center.y += (BASE_CENTER_Y - center.y) * 0.08;
  }

  orbitAngle += orbitDir * orbitSpeed;
  orbitSpeed = Math.min(
    0.082,
    0.042
      + score * 0.00006
      + (score >= ORBIT_DRIFT_START_SCORE ? 0.006 : 0)
  );

  const spawnInterval = Math.max(18, 52 - Math.floor(score / 28));
  if (tick % spawnInterval === 0) {
    spawnProjectile();
    if (score > 120 && Math.random() < 0.22) spawnProjectile();
  }

  const px = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const py = center.y + Math.sin(orbitAngle) * ORBIT_R;

  for (const s of projectiles) {
    if (s.accel) {
      s.speed = Math.min(s.speedMax, s.speed + s.accel);
    }
    const vx = s.dirX * s.speed;
    const vy = s.dirY * s.speed;
    if (s.weaveAmp) {
      s.weavePhase += s.weaveSpeed;
      const w = Math.sin(s.weavePhase) * s.weaveAmp;
      s.x += vx + s.perpX * w;
      s.y += vy + s.perpY * w;
    } else {
      s.x += vx;
      s.y += vy;
    }

    const d = Math.hypot(s.x - px, s.y - py);
    if (d < s.size + 10) {
      endGame();
      return;
    }

    const dc = Math.hypot(s.x - center.x, s.y - center.y);
    if (dc < 12 && !s.passed) {
      s.passed = true;
      streak += 1;
      score += 1 + Math.floor(streak / 4);
      scoreEl.textContent = String(score);
      streakEl.textContent = String(streak);
      updateStreakHud();
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

  const driftActive = score >= ORBIT_DRIFT_START_SCORE && state === 'running';
  if (driftActive) {
    const flowDir = orbitDriftDir > 0 ? 1 : -1;
    const flowPhase = (tick * (0.45 + orbitDriftSpeed * 0.22)) % 38;
    const glow = orbitDriftWarn > 0 ? 0.84 : 0.46;
    for (let i = 0; i < 7; i += 1) {
      const y = 108 + i * 18;
      const span = 160 + i * 12;
      const baseX = center.x - flowDir * 14;
      const x1 = baseX - flowDir * ((flowPhase + i * 9) % span);
      const x2 = x1 + flowDir * (8 + i * 0.55);
      ctx.strokeStyle = `rgba(124, 219, 255, ${0.1 + i * 0.035 + glow * 0.16})`;
      ctx.lineWidth = 1.2 + i * 0.1;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(109, 200, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, ORBIT_R, 0, Math.PI * 2);
  ctx.stroke();

  if (driftActive || orbitDriftIntroFx > 0) {
    const flowDir = orbitDriftDir > 0 ? 1 : -1;
    const introBoost = orbitDriftIntroFx > 0 ? (orbitDriftIntroFx / 26) : 0;
    const markerAlpha = 0.36 + introBoost * 0.34 + (orbitDriftWarn > 0 ? 0.22 : 0);
    const ringPulse = 0.5 + 0.5 * Math.sin(tick * 0.18);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(137, 228, 255, ${markerAlpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, ORBIT_R + 10 + ringPulse * 2.4, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i += 1) {
      const yOff = -36 + i * 24;
      const tipX = center.x + flowDir * (ORBIT_R + 17 + i * 3);
      const tipY = center.y + yOff;
      ctx.fillStyle = `rgba(176, 238, 255, ${0.2 + markerAlpha * 0.56})`;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - flowDir * 9, tipY - 5);
      ctx.lineTo(tipX - flowDir * 9, tipY + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = '#1a2c4a';
  ctx.beginPath();
  ctx.arc(center.x, center.y, 13, 0, Math.PI * 2);
  ctx.fill();

  for (const s of projectiles) {
    const tail = 14 + s.size * 1.2;
    ctx.strokeStyle = (s.color || '#ff8a65');
    ctx.lineWidth = 2.2;
    ctx.shadowColor = (s.color || '#ff8a65');
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(s.x - s.dirX * tail, s.y - s.dirY * tail);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    ctx.fillStyle = s.color;
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

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(orbitAngle + (orbitDir > 0 ? Math.PI / 2 : -Math.PI / 2));
  ctx.fillStyle = 'rgba(125, 227, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(4, -5);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (driftActive || orbitDriftIntroFx > 0) {
    const flowDir = orbitDriftDir > 0 ? 1 : -1;
    const glow = orbitDriftWarn > 0 ? 0.9 : 0.55;
    ctx.save();
    ctx.translate(W - 38, 34);
    ctx.fillStyle = 'rgba(8, 18, 36, 0.78)';
    ctx.strokeStyle = `rgba(121, 214, 255, ${0.52 + glow * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = `rgba(182, 239, 255, ${0.6 + glow * 0.34})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-8 * flowDir, 0);
    ctx.lineTo(6 * flowDir, 0);
    ctx.stroke();

    ctx.fillStyle = `rgba(206, 248, 255, ${0.72 + glow * 0.24})`;
    ctx.beginPath();
    ctx.moveTo(9 * flowDir, 0);
    ctx.lineTo(3 * flowDir, -5);
    ctx.lineTo(3 * flowDir, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

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
  if (event.key === ' ' || event.key === 'Tab') {
    event.preventDefault();
    action();
  }
});

canvas.addEventListener('pointerdown', action);
btnStart.addEventListener('click', startGame);

resetGame();
loop();
