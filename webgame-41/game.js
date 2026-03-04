const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageLabel = document.getElementById('stageLabel');
const timerLabel = document.getElementById('timerLabel');
const goalLabel = document.getElementById('goalLabel');
const btnStart = document.getElementById('btnStart');

const DESIGN = { w: 360, h: 640 };
const POINTER = { x: 0, y: 0, down: false, dx: 0, dy: 0, lastX: 0, lastY: 0 };

const STAGES = [
  { name: 'Steal Paper', goal: 'Tap the roll in the green zone', time: 8 },
  { name: 'Poop Fast', goal: 'Mash to fill the bar', time: 8 },
  { name: 'Wipe Fast', goal: 'Swipe left/right fast', time: 8 },
  { name: 'Run Away', goal: 'Reach the exit, avoid the cone', time: 10 },
];

let state = {
  mode: 'menu',
  stageIndex: 0,
  stageStart: 0,
  timeLeft: 0,
  success: false,
  paper: { x: 60, y: 160, vx: 120, targetX: 0, hits: 0 },
  poop: { meter: 0 },
  wipe: { meter: 0, lastDir: 0 },
  escape: { x: 40, y: 520, tx: 40, ty: 520, speed: 140 },
  guard: { x: 240, y: 420, ang: 0, angSpeed: 0.8, fov: 0.7, range: 160 },
};

function resize() {
  const ratio = DESIGN.w / DESIGN.h;
  const maxW = canvas.clientWidth || DESIGN.w;
  const maxH = canvas.clientHeight || (maxW / ratio);
  const h = Math.min(maxH, maxW / ratio);
  const w = h * ratio;
  canvas.width = DESIGN.w;
  canvas.height = DESIGN.h;
  canvas.style.height = `${(w / ratio).toFixed(0)}px`;
}

window.addEventListener('resize', resize);
resize();

function now() { return performance.now(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function setStage(index) {
  state.stageIndex = index;
  state.stageStart = now();
  state.timeLeft = STAGES[index].time;
  state.success = false;

  state.paper = { x: 60, y: 160, vx: 150, hits: 0 };
  state.poop = { meter: 0 };
  state.wipe = { meter: 0, lastDir: 0 };
  state.escape = { x: 40, y: 520, tx: 40, ty: 520, speed: 150 };
  state.guard = { x: 250, y: 420, ang: 0, angSpeed: 0.8, fov: 0.75, range: 170 };

  stageLabel.textContent = `Stage ${index + 1}/4`;
  goalLabel.textContent = `Goal: ${STAGES[index].goal}`;
}

function setMode(mode) {
  state.mode = mode;
}

function startGame() {
  setStage(0);
  setMode('playing');
}

btnStart.addEventListener('click', () => {
  startGame();
});

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
  state.timeLeft = Math.max(0, STAGES[state.stageIndex].time - t);
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
  roll.x += roll.vx * dt;
  if (roll.x > DESIGN.w - 50 || roll.x < 50) roll.vx *= -1;

  if (POINTER.down) {
    const zoneLeft = DESIGN.w * 0.35;
    const zoneRight = DESIGN.w * 0.65;
    const inZone = roll.x > zoneLeft && roll.x < zoneRight;
    const dist = Math.hypot(POINTER.x - roll.x, POINTER.y - roll.y);
    if (dist < 40 && inZone) {
      state.success = true;
      nextStage();
    } else {
      roll.hits += 1;
      if (roll.hits >= 3) setMode('fail');
    }
    POINTER.down = false;
  }
}

function updatePoop(dt) {
  const p = state.poop;
  if (POINTER.down) {
    p.meter = clamp(p.meter + 0.22, 0, 1);
    POINTER.down = false;
  }
  p.meter = clamp(p.meter - dt * 0.08, 0, 1);
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
      w.meter = clamp(w.meter + 0.18, 0, 1);
      w.lastDir = dir;
    }
  }
  w.meter = clamp(w.meter - dt * 0.05, 0, 1);
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

  const inCone = isInCone(p.x, p.y, g);
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
  if (state.stageIndex < STAGES.length - 1) {
    setStage(state.stageIndex + 1);
  } else {
    setMode('success');
  }
}

function draw() {
  ctx.clearRect(0, 0, DESIGN.w, DESIGN.h);
  drawBackground();

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

function drawPaperStage() {
  const roll = state.paper;
  const zoneLeft = DESIGN.w * 0.35;
  const zoneRight = DESIGN.w * 0.65;
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

  drawHint('Tap the roll in the green zone.', DESIGN.h * 0.82);
}

function drawPoopStage() {
  const p = state.poop;
  drawBar(60, 240, 240, 18, p.meter, '#ffcc66');
  drawHint('Mash tap to fill the bar.', DESIGN.h * 0.82);
}

function drawWipeStage() {
  const w = state.wipe;
  drawBar(60, 240, 240, 18, w.meter, '#8ff8bf');
  drawHint('Swipe left/right fast.', DESIGN.h * 0.82);
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
  drawHint('Drag to exit. Avoid the cone.', DESIGN.h * 0.82);
}

function drawCone(g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.ang);
  ctx.fillStyle = 'rgba(255, 120, 120, 0.18)';
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
  if (state.mode === 'fail' || state.mode === 'success') {
    startGame();
  }
});

// BGM/SFX hook examples:
// playBgm('poop-escape-theme')
// playSfx('tap')

setMode('menu');
requestAnimationFrame(gameLoop);
