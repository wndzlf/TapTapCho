const bgmAudio = window.TapTapNeonAudio?.create('webgame-14', document.querySelector('.hud'), { theme: 'drift' });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'helix-fall-mini-best';

const BALL_X = W * 0.5;
const BALL_RADIUS = 12;
const LEVEL_GAP = 92;
const VISIBLE_LEVELS = 11;
const BASE_Y = H * 0.68;

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let shake = 0;
let spinDir = 1;

let worldY = 60;
let vy = 0;

const levels = [];
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

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function addBurst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 24 + Math.random() * 20,
      color,
    });
  }
}

function makeLevel(index) {
  return {
    y: index * LEVEL_GAP,
    phase: rand(0, Math.PI * 2),
    speed: rand(0.015, 0.033),
    gapW: rand(90, 122),
    danger: Math.random() > 0.5 ? -1 : 1,
    passed: false,
  };
}

function buildLevels() {
  levels.length = 0;
  for (let i = 0; i < 90; i += 1) {
    levels.push(makeLevel(i));
  }
}

function holeCenter(level) {
  return W * 0.5 + Math.sin(level.phase) * 118;
}

function hitDanger(level) {
  const holeC = holeCenter(level);
  const holeL = holeC - level.gapW * 0.5;
  const holeR = holeC + level.gapW * 0.5;

  if (BALL_X > holeL && BALL_X < holeR) {
    return false;
  }

  const zoneW = 42;
  if (level.danger < 0) {
    return BALL_X < holeL && BALL_X > holeL - zoneW;
  }
  return BALL_X > holeR && BALL_X < holeR + zoneW;
}

function bounce(level) {
  worldY = level.y - BALL_RADIUS - 1;
  vy = -5.6;
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;
  spinDir = 1;

  worldY = 40;
  vy = 0;

  particles.length = 0;
  buildLevels();
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
  shake = 10;
  addBurst(BALL_X, BASE_Y, '#ff7b74', 24);
  beep(170, 0.22, 0.055);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function onAction() {
  if (state !== 'running') {
    startGame();
    return;
  }
  spinDir *= -1;
  beep(500, 0.04, 0.018);
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 1;
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (state !== 'running') return;

  vy += 0.28;
  if (vy > 8.4) vy = 8.4;
  const prevY = worldY;
  worldY += vy;

  for (const level of levels) {
    level.phase += level.speed * spinDir;
  }

  for (const level of levels) {
    const crossing = prevY + BALL_RADIUS <= level.y && worldY + BALL_RADIUS >= level.y;
    if (!crossing || vy <= 0) continue;

    const holeC = holeCenter(level);
    const holeL = holeC - level.gapW * 0.5;
    const holeR = holeC + level.gapW * 0.5;

    if (BALL_X > holeL && BALL_X < holeR) {
      if (!level.passed) {
        level.passed = true;
        score += 1;
        scoreEl.textContent = String(score);
        addBurst(BALL_X, BASE_Y, '#7de3ff', 9);
        beep(760 + Math.min(240, score * 8), 0.035, 0.017);
      }
      continue;
    }

    if (hitDanger(level)) {
      endGame();
      return;
    }

    bounce(level);
    beep(300, 0.05, 0.02);
    break;
  }

  if (worldY > levels[levels.length - 1].y + LEVEL_GAP) {
    endGame();
  }
}

function renderLevel(level, camY) {
  const sy = BASE_Y - (level.y - camY);
  if (sy < -40 || sy > H + 40) return;

  const holeC = holeCenter(level);
  const holeL = holeC - level.gapW * 0.5;
  const holeR = holeC + level.gapW * 0.5;

  ctx.fillStyle = '#1e2f4e';
  ctx.fillRect(40, sy - 8, holeL - 40, 16);
  ctx.fillRect(holeR, sy - 8, W - 40 - holeR, 16);

  const zoneW = 42;
  ctx.fillStyle = '#ff6f6b';
  if (level.danger < 0) {
    ctx.fillRect(holeL - zoneW, sy - 8, zoneW, 16);
  } else {
    ctx.fillRect(holeR, sy - 8, zoneW, 16);
  }

  ctx.fillStyle = '#89a9d6';
  ctx.fillRect(36, sy - 1, W - 72, 2);
}

function render() {
  const camY = worldY - 220;

  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.85;
  }

  ctx.fillStyle = '#0a1122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 97) % W;
    const y = (i * 41 + tick * 0.9) % H;
    ctx.fillStyle = 'rgba(145, 189, 255, 0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  const currentLevel = Math.floor(worldY / LEVEL_GAP);
  for (let i = currentLevel - 2; i < currentLevel + VISIBLE_LEVELS; i += 1) {
    if (i < 0 || i >= levels.length) continue;
    renderLevel(levels[i], camY);
  }

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(BALL_X, BASE_Y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Fall' : 'Hit Red!', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap or press Space to switch spin', W / 2, H / 2 + 18);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') onAction();
});

canvas.addEventListener('pointerdown', onAction);
btnStart.addEventListener('click', startGame);

resetGame();
loop();
