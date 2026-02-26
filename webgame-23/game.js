const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const shieldEl = document.getElementById('shield');
const challengeTextEl = document.getElementById('challengeText');
const challengeFillEl = document.getElementById('challengeFill');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnSound = document.getElementById('btnSound');
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

const cols = 20;
const rows = 30;
const cell = 20;
const gridW = cols * cell;
const gridH = rows * cell;
const offsetX = Math.floor((canvas.width - gridW) / 2);
const offsetY = Math.floor((canvas.height - gridH) / 2);

const BEST_KEY = 'neon-snake-best-v3';
const SOUND_KEY = 'neon-snake-sound-v3';

let state = 'idle'; // idle | running | paused | gameover

let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 10, y: 10 };
let obstacles = [];
let pickups = [];
let particles = [];

let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let shield = 0;
let combo = 0;
let comboTimer = 0;
let elapsed = 0;
let tickMs = 130;
let lastTick = 0;
let tickCarry = 0;
let flash = 0;
let nearCount = 0;
let coinCount = 0;
let slowTimer = 0;
let boostTimer = 0;

let challenge = {
  type: 'eat',
  target: 8,
  progress: 0,
  text: '먹이 8개 획득',
  done: false,
};

bestEl.textContent = String(best);

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function createSfx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let enabled = localStorage.getItem(SOUND_KEY) !== 'off';

  function ensure() {
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone({ freq = 420, end = null, type = 'triangle', gain = 0.04, dur = 0.08 }) {
    if (!enabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (end != null) osc.frequency.linearRampToValueAtTime(end, now + dur);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  return {
    ensure,
    toggle() {
      enabled = !enabled;
      localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    eat() {
      tone({ freq: 660, end: 930, dur: 0.08, gain: 0.04 });
    },
    pickup() {
      tone({ freq: 520, end: 990, dur: 0.12, gain: 0.05 });
    },
    hit() {
      tone({ freq: 170, end: 80, type: 'sawtooth', dur: 0.18, gain: 0.07 });
    },
    turn() {
      tone({ freq: 330, end: 430, dur: 0.04, gain: 0.02 });
    },
    challenge() {
      tone({ freq: 450, end: 860, type: 'square', dur: 0.12, gain: 0.05 });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  btnSound.textContent = `사운드: ${sfx.isEnabled() ? '켜짐' : '꺼짐'}`;
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);
  comboEl.textContent = `x${(1 + Math.min(1.6, combo / 5)).toFixed(1)}`;
  shieldEl.textContent = String(shield);
}

function addParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: rand(-3, 3),
      vy: rand(-3, 3),
      life: rand(16, 32),
      size: rand(2, 4),
      color,
    });
  }

  if (particles.length > 240) particles.splice(0, particles.length - 240);
}

function randomEmptyCell() {
  for (let safety = 0; safety < 500; safety += 1) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);

    if (snake.some((s) => s.x === x && s.y === y)) continue;
    if (obstacles.some((o) => o.x === x && o.y === y)) continue;
    if (pickups.some((p) => p.x === x && p.y === y)) continue;
    return { x, y };
  }

  return { x: 0, y: 0 };
}

function placeFood() {
  food = randomEmptyCell();
}

function spawnObstacleWave() {
  const count = clamp(1 + Math.floor(level / 2), 1, 6);
  for (let i = 0; i < count; i += 1) {
    const c = randomEmptyCell();
    obstacles.push({ x: c.x, y: c.y, pulse: rand(0, Math.PI * 2) });
  }
  obstacles = obstacles.slice(-80);
}

function spawnPickup() {
  const typeRoll = Math.random();
  let type = 'coin';
  if (typeRoll > 0.75) type = 'shield';
  if (typeRoll > 0.9) type = 'slow';
  if (typeRoll > 0.96) type = 'boost';

  const c = randomEmptyCell();
  pickups.push({ x: c.x, y: c.y, type, pulse: rand(0, Math.PI * 2) });
}

function setChallenge() {
  const opts = [
    { type: 'eat', target: 8 + Math.floor(level * 0.4), text: '먹이 획득' },
    { type: 'coin', target: 5 + Math.floor(level * 0.4), text: '코인 획득' },
    { type: 'near', target: 6 + Math.floor(level * 0.4), text: '근접 회피' },
  ];
  const c = opts[Math.floor(Math.random() * opts.length)];
  challenge = { ...c, progress: 0, done: false };
  updateChallengeUi();
}

function updateChallengeUi() {
  const p = Math.floor(challenge.progress);
  challengeTextEl.textContent = `${challenge.text} ${Math.min(challenge.target, p)}/${challenge.target}`;
  const ratio = clamp(challenge.progress / Math.max(1, challenge.target), 0, 1);
  challengeFillEl.style.width = `${ratio * 100}%`;
}

function addChallenge(type, amount) {
  if (challenge.done || challenge.type !== type) return;

  challenge.progress += amount;
  if (challenge.progress >= challenge.target) {
    challenge.progress = challenge.target;
    challenge.done = true;
    score += 160;
    shield = Math.min(2, shield + 1);
    addParticles(offsetX + snake[0].x * cell, offsetY + snake[0].y * cell, '#9dffbe', 20);
    sfx.challenge();

    setTimeout(() => {
      if (state === 'running') setChallenge();
    }, 700);
  }

  updateChallengeUi();
}

function reset() {
  snake = [
    { x: 7, y: 15 },
    { x: 6, y: 15 },
    { x: 5, y: 15 },
    { x: 4, y: 15 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };

  obstacles = [];
  pickups = [];
  particles = [];

  score = 0;
  level = 1;
  shield = 0;
  combo = 0;
  comboTimer = 0;
  elapsed = 0;
  tickMs = 130;
  tickCarry = 0;
  flash = 0;
  nearCount = 0;
  coinCount = 0;
  slowTimer = 0;
  boostTimer = 0;

  placeFood();
  spawnObstacleWave();
  spawnPickup();
  spawnPickup();

  setChallenge();
  updateHud();
}

function startGame() {
  sfx.ensure();
  reset();
  state = 'running';
  lastTick = 0;
  tickCarry = 0;
}

function setDir(x, y) {
  if (state !== 'running') return;
  if (x === -dir.x && y === -dir.y) return;
  nextDir = { x, y };
  sfx.turn();
}

function gameOver() {
  state = 'gameover';
  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }
  updateHud();
  sfx.hit();
}

function handleCollision() {
  if (shield > 0) {
    shield -= 1;
    flash = 18;
    addParticles(offsetX + snake[0].x * cell, offsetY + snake[0].y * cell, '#9dffbe', 20);
    return;
  }
  gameOver();
}

function applyPickup(type) {
  if (type === 'coin') {
    coinCount += 1;
    score += 30;
    addChallenge('coin', 1);
  } else if (type === 'shield') {
    shield = Math.min(2, shield + 1);
    score += 20;
  } else if (type === 'slow') {
    slowTimer = Math.max(slowTimer, 6);
    score += 20;
  } else if (type === 'boost') {
    boostTimer = Math.max(boostTimer, 6);
    score += 40;
  }

  addParticles(offsetX + snake[0].x * cell, offsetY + snake[0].y * cell, '#ffe4a1', 16);
  sfx.pickup();
}

function advanceOneCell() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const willEat = head.x === food.x && head.y === food.y;

  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    handleCollision();
    return;
  }

  const selfHit = snake.some((s, index) => {
    if (!willEat && index === snake.length - 1) return false;
    return s.x === head.x && s.y === head.y;
  });
  if (selfHit) {
    handleCollision();
    return;
  }

  if (obstacles.some((o) => o.x === head.x && o.y === head.y)) {
    handleCollision();
    return;
  }

  snake.unshift(head);

  for (const o of obstacles) {
    const dx = Math.abs(o.x - head.x);
    const dy = Math.abs(o.y - head.y);
    if (dx + dy === 1) {
      nearCount += 1;
      score += 8;
      combo += 1;
      comboTimer = 2.2;
      addChallenge('near', 1);
    }
  }

  if (willEat) {
    const mult = 1 + Math.min(1.6, combo / 5);
    score += Math.floor(20 * mult);
    combo += 1;
    comboTimer = 2.8;
    addChallenge('eat', 1);
    placeFood();
    sfx.eat();
    addParticles(offsetX + head.x * cell, offsetY + head.y * cell, '#ff9fe0', 14);
    if (Math.random() < 0.28) spawnPickup();
  }

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const p = pickups[i];
    if (p.x === head.x && p.y === head.y) {
      applyPickup(p.type);
      pickups.splice(i, 1);
    }
  }

  if (!willEat) {
    snake.pop();
  }

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }
}

function step(ts) {
  if (lastTick === 0) {
    lastTick = ts;
    return;
  }

  const frameMs = ts - lastTick;
  const dt = frameMs / 1000;
  lastTick = ts;

  elapsed += dt;

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  if (slowTimer > 0) slowTimer = Math.max(0, slowTimer - dt);
  if (boostTimer > 0) boostTimer = Math.max(0, boostTimer - dt);

  const lv = 1 + Math.floor(elapsed / 18);
  if (lv > level) {
    level = lv;
    spawnObstacleWave();
    spawnPickup();
  }

  const baseTick = 130 - Math.min(54, (level - 1) * 5);
  tickMs = baseTick + (slowTimer > 0 ? 28 : 0) - (boostTimer > 0 ? 22 : 0);

  tickCarry += frameMs;
  let steps = 0;
  while (tickCarry >= tickMs && state === 'running' && steps < 5) {
    tickCarry -= tickMs;
    steps += 1;
    advanceOneCell();
  }

  updateChallengeUi();
  updateHud();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(80, 120, 180, 0.15)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c += 1) {
    const x = offsetX + c * cell;
    ctx.beginPath();
    ctx.moveTo(x, offsetY);
    ctx.lineTo(x, offsetY + gridH);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r += 1) {
    const y = offsetY + r * cell;
    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + gridW, y);
    ctx.stroke();
  }
}

function drawBackground(ts) {
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 48; i += 1) {
    const y = (i * 43 + ts * 0.06) % H;
    const x = (i * 97) % W;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(200,220,255,0.33)' : 'rgba(160,200,255,0.22)';
    ctx.fillRect(x, y, 2, 2);
  }
}

const W = canvas.width;
const H = canvas.height;

function drawFood() {
  ctx.fillStyle = '#ff7bd0';
  ctx.shadowColor = '#ff7bd0';
  ctx.shadowBlur = 12;
  ctx.fillRect(offsetX + food.x * cell + 3, offsetY + food.y * cell + 3, cell - 6, cell - 6);
  ctx.shadowBlur = 0;
}

function drawSnake() {
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#7cffc5' : '#6df3ff';
    ctx.shadowColor = i === 0 ? '#7cffc5' : '#6df3ff';
    ctx.shadowBlur = i === 0 ? 16 : 8;
    ctx.fillRect(offsetX + seg.x * cell + 2, offsetY + seg.y * cell + 2, cell - 4, cell - 4);
  });
  ctx.shadowBlur = 0;
}

function drawObstacles(ts) {
  obstacles.forEach((o) => {
    o.pulse += 0.08;
    const glow = 0.55 + Math.sin(o.pulse + ts * 0.004) * 0.45;
    ctx.fillStyle = `rgba(255,135,170,${0.45 + glow * 0.35})`;
    ctx.fillRect(offsetX + o.x * cell + 3, offsetY + o.y * cell + 3, cell - 6, cell - 6);
  });
}

function pickupColor(type) {
  if (type === 'coin') return '#ffe08a';
  if (type === 'shield') return '#9dffbe';
  if (type === 'slow') return '#9fd8ff';
  return '#ffb3ff';
}

function pickupLabel(type) {
  if (type === 'coin') return '$';
  if (type === 'shield') return 'S';
  if (type === 'slow') return 'T';
  return 'B';
}

function drawPickups(ts) {
  pickups.forEach((p) => {
    p.pulse += 0.1;
    const cx = offsetX + p.x * cell + cell * 0.5;
    const cy = offsetY + p.y * cell + cell * 0.5;
    const r = 7 + Math.sin(p.pulse + ts * 0.004) * 1.6;

    ctx.fillStyle = pickupColor(p.type);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a1b39';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pickupLabel(p.type), cx, cy);
  });

  ctx.textBaseline = 'alphabetic';
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 1;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawCanvasHud() {
  ctx.fillStyle = 'rgba(5, 11, 24, 0.36)';
  ctx.fillRect(offsetX, offsetY - 34, gridW, 24);
  ctx.fillStyle = '#d6e8ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`코인 ${coinCount} · 근접회피 ${nearCount}`, offsetX + 8, offsetY - 16);

  ctx.textAlign = 'right';
  ctx.fillText(`속도 ${Math.round(1000 / tickMs)} tick/s`, offsetX + gridW - 8, offsetY - 16);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 130, 180, ${0.05 + flash / 220})`;
    ctx.fillRect(offsetX, offsetY, gridW, gridH);
    flash -= 1;
  }
}

function drawOverlay() {
  if (state === 'running') return;

  ctx.fillStyle = 'rgba(4, 10, 20, 0.68)';
  ctx.fillRect(offsetX, offsetY, gridW, gridH);
  ctx.fillStyle = '#e5f1ff';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';

  if (state === 'idle') ctx.fillText('Tap Start', canvas.width / 2, canvas.height / 2 - 10);
  if (state === 'paused') ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - 10);
  if (state === 'gameover') ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = '16px system-ui';
  ctx.fillText('파워업과 챌린지로 점수를 가속하세요', canvas.width / 2, canvas.height / 2 + 18);
}

function loop(ts) {
  drawBackground(ts);
  drawGrid();

  if (state === 'running') {
    step(ts);
  }

  drawFood();
  drawObstacles(ts);
  drawPickups(ts);
  drawSnake();
  drawParticles();
  drawCanvasHud();
  drawOverlay();

  requestAnimationFrame(loop);
}

function togglePause() {
  if (state !== 'running' && state !== 'paused') return;
  state = state === 'running' ? 'paused' : 'running';
}

btnStart.addEventListener('click', () => {
  startGame();
});

btnPause.addEventListener('click', () => {
  togglePause();
});

btnSound.addEventListener('click', () => {
  sfx.ensure();
  sfx.toggle();
  updateSoundButton();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w') setDir(0, -1);
  if (e.key === 'ArrowDown' || e.key === 's') setDir(0, 1);
  if (e.key === 'ArrowLeft' || e.key === 'a') setDir(-1, 0);
  if (e.key === 'ArrowRight' || e.key === 'd') setDir(1, 0);

  if (e.key === ' ') {
    e.preventDefault();
    if (state === 'idle' || state === 'gameover') startGame();
    else togglePause();
  }

  if (e.key === 'm') {
    sfx.ensure();
    sfx.toggle();
    updateSoundButton();
  }
});

btnUp.addEventListener('pointerdown', () => setDir(0, -1));
btnDown.addEventListener('pointerdown', () => setDir(0, 1));
btnLeft.addEventListener('pointerdown', () => setDir(-1, 0));
btnRight.addEventListener('pointerdown', () => setDir(1, 0));

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 20) setDir(1, 0);
    if (dx < -20) setDir(-1, 0);
  } else {
    if (dy > 20) setDir(0, 1);
    if (dy < -20) setDir(0, -1);
  }
  touchStart = null;
});

updateSoundButton();
reset();
requestAnimationFrame(loop);
