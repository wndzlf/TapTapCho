const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageLabel = document.getElementById('stageLabel');
const bestLabel = document.getElementById('bestLabel');
const timerLabel = document.getElementById('timerLabel');
const goalLabel = document.getElementById('goalLabel');
const btnStart = document.getElementById('btnStart');

const DESIGN = { w: 360, h: 640 };
const POINTER = { x: 0, y: 0, down: false, dx: 0, dy: 0, lastX: 0, lastY: 0, taps: 0, tapAt: 0 };

const MINI = [
  { name: 'Steal Paper', baseTime: 8, goal: 'Tap the roll in the green zone' },
  { name: 'Poop Fast', baseTime: 8, goal: 'Mash to fill the bar' },
  { name: 'Wipe Fast', baseTime: 8, goal: 'Swipe left/right fast' },
  { name: 'Run Away', baseTime: 10, goal: 'Reach the exit, avoid the cone' },
];

const BEST_STAGE_KEY = 'poop-escape-best-stage';
let bestStage = Number(localStorage.getItem(BEST_STAGE_KEY) || 1);

let state = {
  mode: 'menu',
  stageIndex: 0,
  runStage: 1,
  stageStart: 0,
  timeLeft: 0,
  success: false,
  paper: { x: 60, y: 160, vx: 120, zoneX: 0, zoneW: 0, hits: 0 },
  poop: { meter: 0, shake: 0 },
  wipe: { meter: 0, lastDir: 0 },
  escape: { x: 40, y: 520, tx: 40, ty: 520, speed: 140 },
  guard: { x: 240, y: 420, ang: 0, angSpeed: 0.8, fov: 0.7, range: 160, blink: 0 },
  guy: { x: 110, y: 520, mood: 0 },
  gimmick: '',
};

function resize() {
  canvas.width = DESIGN.w;
  canvas.height = DESIGN.h;
}
window.addEventListener('resize', resize);
resize();

function now() { return performance.now(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function difficulty() {
  return Math.min(2.2, 1 + (state.runStage - 1) * 0.08);
}

function gimmickForStage() {
  const mod = state.runStage % 6;
  if (mod === 1) return 'Moving safe zone';
  if (mod === 2) return 'Double-tap poop';
  if (mod === 3) return 'Blinking guard';
  if (mod === 4) return 'Fake roll';
  if (mod === 5) return 'Slippery wipe';
  return 'Noisy run';
}

function setStage(index) {
  state.stageIndex = index;
  state.stageStart = now();
  state.success = false;

  const diff = difficulty();
  const mini = MINI[index];
  const timeBoost = Math.max(0.6, 1 - (state.runStage - 1) * 0.03);
  state.timeLeft = Math.max(4, mini.baseTime * timeBoost);

  const zoneW = clamp(90 - (state.runStage - 1) * 3, 50, 90);
  state.paper = { x: 60, y: 160, vx: 120 * diff, zoneX: DESIGN.w * 0.35, zoneW, hits: 0 };
  state.poop = { meter: 0, shake: 0 };
  state.wipe = { meter: 0, lastDir: 0 };
  state.escape = { x: 40, y: 520, tx: 40, ty: 520, speed: 120 + diff * 40 };
  state.guard = { x: 250, y: 420, ang: 0, angSpeed: 0.8 + diff * 0.35, fov: 0.7 + diff * 0.05, range: 150 + diff * 20, blink: 0 };
  state.guy = { x: 110, y: 520, mood: 0 };

  state.gimmick = gimmickForStage();

  stageLabel.textContent = `Stage ${state.runStage} - ${mini.name}`;
  bestLabel.textContent = `Best Stage ${bestStage}`;
  goalLabel.textContent = `Goal: ${mini.goal} (${state.gimmick})`;
}

function setMode(mode) {
  state.mode = mode;
}

function startGame() {
  state.runStage = 1;
  bestStage = Number(localStorage.getItem(BEST_STAGE_KEY) || 1);
  setStage(0);
  setMode('playing');
}

btnStart.addEventListener('click', startGame);

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * DESIGN.w;
  const y = ((e.clientY - rect.top) / rect.height) * DESIGN.h;
  return { x, y };
}

function onPointerDown(e) {
  const p = getPointerPos(e);
  POINTER.down = true;
  POINTER.x = p.x;
  POINTER.y = p.y;
  POINTER.lastX = p.x;
  POINTER.lastY = p.y;
  const t = now();
  if (t - POINTER.tapAt < 260) POINTER.taps += 1; else POINTER.taps = 1;
  POINTER.tapAt = t;
}

function onPointerMove(e) {
  if (!POINTER.down) return;
  const p = getPointerPos(e);
  POINTER.dx = p.x - POINTER.lastX;
  POINTER.dy = p.y - POINTER.lastY;
  POINTER.x = p.x;
  POINTER.y = p.y;
  POINTER.lastX = p.x;
  POINTER.lastY = p.y;
}

function onPointerUp() {
  POINTER.down = false;
  POINTER.dx = 0;
  POINTER.dy = 0;
}

canvas.addEventListener('pointerdown', (e) => { onPointerDown(e); canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);

function update(dt) {
  if (state.mode !== 'playing') return;

  const t = (now() - state.stageStart) / 1000;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  timerLabel.textContent = `Time ${formatTime(state.timeLeft)}`;

  if (state.timeLeft <= 0 && !state.success) {
    setMode('fail');
    return;
  }

  if (state.stageIndex === 0) updatePaper(dt);
  if (state.stageIndex === 1) updatePoop(dt);
  if (state.stageIndex === 2) updateWipe(dt);
  if (state.stageIndex === 3) updateEscape(dt);
}

function updatePaper(dt) {
  const roll = state.paper;
  if (state.gimmick === 'Moving safe zone') {
    roll.zoneX += Math.sin(now() * 0.002) * dt * 40;
    roll.zoneX = clamp(roll.zoneX, 60, DESIGN.w - 60 - roll.zoneW);
  }
  roll.x += roll.vx * dt;
  if (roll.x > DESIGN.w - 50 || roll.x < 50) roll.vx *= -1;

  if (POINTER.down) {
    const zoneLeft = roll.zoneX;
    const zoneRight = roll.zoneX + roll.zoneW;
    const inZone = roll.x > zoneLeft && roll.x < zoneRight;
    const dist = Math.hypot(POINTER.x - roll.x, POINTER.y - roll.y);
    if (dist < 40 && inZone) {
      state.success = true;
      nextStage();
    } else {
      roll.hits += 1;
      if (state.gimmick === 'Fake roll') {
        roll.x = 60 + Math.random() * (DESIGN.w - 120);
      }
      if (roll.hits >= 3) setMode('fail');
    }
    POINTER.down = false;
  }
}

function updatePoop(dt) {
  const p = state.poop;
  const needDouble = state.gimmick === 'Double-tap poop';
  if (POINTER.down) {
    const bonus = needDouble ? (POINTER.taps >= 2 ? 0.22 : 0.08) : 0.22;
    p.meter = clamp(p.meter + bonus, 0, 1);
    p.shake = 0.6;
    POINTER.down = false;
  }
  p.meter = clamp(p.meter - dt * (0.08 + difficulty() * 0.02), 0, 1);
  p.shake = Math.max(0, p.shake - dt * 1.2);
  if (p.meter >= 1) {
    state.success = true;
    nextStage();
  }
}

function updateWipe(dt) {
  const w = state.wipe;
  if (POINTER.down) {
    const dir = Math.sign(POINTER.dx || 0);
    if (dir !== 0 && dir !== w.lastDir) {
      w.meter = clamp(w.meter + 0.16, 0, 1);
      w.lastDir = dir;
    }
  }
  const slip = state.gimmick === 'Slippery wipe' ? 0.06 : 0;
  w.meter = clamp(w.meter - dt * (0.05 + difficulty() * 0.02 + slip), 0, 1);
  if (w.meter >= 1) {
    state.success = true;
    nextStage();
  }
}

function updateEscape(dt) {
  const p = state.escape;
  if (POINTER.down) {
    p.tx = clamp(POINTER.x, 20, DESIGN.w - 20);
    p.ty = clamp(POINTER.y, 200, DESIGN.h - 20);
  }
  const dx = p.tx - p.x;
  const dy = p.ty - p.y;
  const d = Math.hypot(dx, dy);
  if (d > 1) {
    p.x += (dx / d) * p.speed * dt;
    p.y += (dy / d) * p.speed * dt;
  }

  const g = state.guard;
  g.ang += g.angSpeed * dt;
  if (state.gimmick === 'Blinking guard') g.blink = (Math.sin(now() * 0.006) + 1) * 0.5;
  else g.blink = 1;

  const noisy = state.gimmick === 'Noisy run';
  const rangeMul = noisy ? (0.85 + 0.3 * Math.sin(now() * 0.004)) : 1;
  const inCone = g.blink > 0.35 && isInCone(p.x, p.y, { ...g, range: g.range * rangeMul });
  if (inCone) {
    setMode('fail');
    return;
  }

  if (p.x > DESIGN.w - 40) {
    state.success = true;
    nextStage();
  }
}

function isInCone(px, py, g) {
  const dx = px - g.x;
  const dy = py - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > g.range) return false;
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(ang - g.ang);
  diff = Math.min(diff, Math.PI * 2 - diff);
  return diff < g.fov;
}

function nextStage() {
  if (state.stageIndex < MINI.length - 1) {
    setStage(state.stageIndex + 1);
  } else {
    state.runStage += 1;
    if (state.runStage > bestStage) {
      bestStage = state.runStage;
      localStorage.setItem(BEST_STAGE_KEY, String(bestStage));
    }
    setStage(0);
  }
}

function draw() {
  ctx.clearRect(0, 0, DESIGN.w, DESIGN.h);
  drawBackground();
  drawGuy();

  if (state.mode === 'menu') {
    drawCenterText('Tap Start', DESIGN.h * 0.5, 22);
    return;
  }

  if (state.mode === 'fail') {
    drawCenterText('Busted!', DESIGN.h * 0.45, 28);
    drawCenterText('Tap to retry', DESIGN.h * 0.52, 14);
    return;
  }

  if (state.mode === 'success') {
    drawCenterText('Escape Success!', DESIGN.h * 0.45, 26);
    drawCenterText('Tap to replay', DESIGN.h * 0.52, 14);
    return;
  }

  if (state.stageIndex === 0) drawPaperStage();
  if (state.stageIndex === 1) drawPoopStage();
  if (state.stageIndex === 2) drawWipeStage();
  if (state.stageIndex === 3) drawEscapeStage();
}

function drawBackground() {
  ctx.fillStyle = '#0d1422';
  ctx.fillRect(0, 0, DESIGN.w, DESIGN.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y <= DESIGN.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(DESIGN.w, y);
    ctx.stroke();
  }
}

function drawGuy() {
  const baseX = 70;
  const baseY = 510;
  const shake = state.stageIndex === 1 ? Math.sin(now() * 0.03) * 2 * state.poop.shake : 0;
  ctx.save();
  ctx.translate(baseX + shake, baseY);
  ctx.fillStyle = '#ffd1a8';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2f2a';
  ctx.fillRect(-6, 14, 12, 18);
  ctx.fillStyle = '#ff8c8c';
  ctx.beginPath();
  ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPaperStage() {
  const roll = state.paper;
  const zoneLeft = roll.zoneX;
  const zoneRight = roll.zoneX + roll.zoneW;
  ctx.fillStyle = 'rgba(80, 200, 120, 0.15)';
  ctx.fillRect(zoneLeft, 110, zoneRight - zoneLeft, 90);

  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.arc(roll.x, roll.y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd6e8';
  ctx.beginPath();
  ctx.arc(roll.x, roll.y, 10, 0, Math.PI * 2);
  ctx.fill();

  drawHint(state.gimmick === 'Fake roll' ? 'Tap roll in zone. Wrong tap teleports it.' : 'Tap the roll in the green zone.', DESIGN.h * 0.82);
}

function drawPoopStage() {
  const p = state.poop;
  drawBar(60, 240, 240, 18, p.meter, '#ffcc66');
  drawHint(state.gimmick === 'Double-tap poop' ? 'Double-tap to fill fast.' : 'Mash tap to fill the bar.', DESIGN.h * 0.82);
}

function drawWipeStage() {
  const w = state.wipe;
  drawBar(60, 240, 240, 18, w.meter, '#8ff8bf');
  drawHint(state.gimmick === 'Slippery wipe' ? 'Swipe fast. It slips away.' : 'Swipe left/right fast.', DESIGN.h * 0.82);
}

function drawEscapeStage() {
  const g = state.guard;
  const p = state.escape;
  drawCone(g);

  ctx.fillStyle = '#ffcc66';
  ctx.fillRect(DESIGN.w - 20, 0, 20, DESIGN.h);
  ctx.fillStyle = '#f5f5ff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.fill();
  drawHint(state.gimmick === 'Noisy run' ? 'Run. Cone pulses.' : 'Drag to exit. Avoid the cone.', DESIGN.h * 0.82);
}

function drawCone(g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.ang);
  ctx.fillStyle = `rgba(255, 120, 120, ${0.08 + g.blink * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, g.range, -g.fov, g.fov);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ff7a9b';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawBar(x, y, w, h, t, color) {
  ctx.fillStyle = '#1b2538';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * t, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.strokeRect(x, y, w, h);
}

function drawHint(text, y) {
  ctx.fillStyle = '#cdd7ee';
  ctx.font = '14px Pretendard, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, DESIGN.w / 2, y);
}

function drawCenterText(text, y, size) {
  ctx.fillStyle = '#f7fbff';
  ctx.font = `700 ${size}px Pretendard, system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText(text, DESIGN.w / 2, y);
}

function gameLoop() {
  const t = now();
  if (!state.lastTime) state.lastTime = t;
  const dt = Math.min(0.033, (t - state.lastTime) / 1000);
  state.lastTime = t;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('pointerdown', () => {
  if (state.mode === 'fail') startGame();
});

// BGM/SFX hooks
// playBgm('poop-escape-theme')
// playSfx('tap')

setMode('menu');
requestAnimationFrame(gameLoop);
