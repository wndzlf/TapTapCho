const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'zigzag-rush-best';

const PATH_WIDTH = 66;
const PLAYER_RADIUS = 11;
const SPEED = 3.2;
const VIEW_ANCHOR_Y = H * 0.7;

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let shake = 0;
let moveDir = 1;

const player = {
  x: W / 2,
  y: 0,
};

const segments = [];
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
      life: 28 + Math.random() * 20,
      color,
    });
  }
}

function buildInitialPath() {
  segments.length = 0;

  let x = W / 2;
  let y = 80;
  let dir = 1;

  for (let i = 0; i < 30; i += 1) {
    const margin = 64;
    const maxToEdge = dir === 1 ? W - margin - x : x - margin;
    const maxLen = Math.max(80, Math.min(220, maxToEdge));
    const minLen = Math.min(130, maxLen);
    const length = rand(minLen, maxLen);

    const seg = {
      xStart: x,
      startY: y,
      dir,
      length,
      endY: y - length,
      passed: false,
    };

    segments.push(seg);

    x = x + dir * length;
    y = y - length;
    dir *= -1;
  }
}

function extendPathIfNeeded() {
  while (segments[segments.length - 1].endY > player.y - 2200) {
    const prev = segments[segments.length - 1];
    const x = prev.xStart + prev.dir * prev.length;
    const y = prev.endY;
    let dir = -prev.dir;

    const margin = 64;
    const maxToEdge = dir === 1 ? W - margin - x : x - margin;

    if (maxToEdge < 80) {
      dir *= -1;
    }

    const maxToEdgeFixed = dir === 1 ? W - margin - x : x - margin;
    const maxLen = Math.max(80, Math.min(220, maxToEdgeFixed));
    const minLen = Math.min(130, maxLen);
    const length = rand(minLen, maxLen);

    segments.push({
      xStart: x,
      startY: y,
      dir,
      length,
      endY: y - length,
      passed: false,
    });
  }
}

function segmentAt(y) {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    if (y <= seg.startY && y >= seg.endY) {
      return seg;
    }
  }
  return null;
}

function pathCenterX(seg, y) {
  return seg.xStart + seg.dir * (seg.startY - y);
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;
  moveDir = 1;
  particles.length = 0;

  buildInitialPath();

  const first = segments[0];
  player.y = first.startY - 20;
  player.x = pathCenterX(first, player.y);

  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  resetGame();
  state = 'running';
}

function die() {
  state = 'gameover';
  shake = 10;
  addBurst(player.x, player.y, '#ff7b74', 24);
  beep(180, 0.2, 0.06);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function switchDirection() {
  moveDir *= -1;
  addBurst(player.x, player.y, '#7de3ff', 8);
  beep(520, 0.05, 0.02);
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04;
    p.life -= 1;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  if (state !== 'running') return;

  player.x += moveDir * SPEED;
  player.y -= SPEED;

  extendPathIfNeeded();

  const seg = segmentAt(player.y);
  if (!seg) {
    die();
    return;
  }

  const centerX = pathCenterX(seg, player.y);
  if (Math.abs(player.x - centerX) > PATH_WIDTH * 0.5 - PLAYER_RADIUS * 0.35) {
    die();
    return;
  }

  for (const s of segments) {
    if (!s.passed && player.y <= s.endY) {
      s.passed = true;
      beep(760, 0.03, 0.015);
      addBurst(s.xStart + s.dir * s.length, s.endY, '#ffe08a', 10);
    }
  }

  score = Math.max(score, Math.floor((segments[0].startY - player.y) / 10));
  scoreEl.textContent = String(score);
}

function renderPath(cameraY) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const seg of segments) {
    const x1 = seg.xStart;
    const y1 = seg.startY - cameraY;
    const x2 = seg.xStart + seg.dir * seg.length;
    const y2 = seg.endY - cameraY;

    if ((y1 < -PATH_WIDTH && y2 < -PATH_WIDTH) || (y1 > H + PATH_WIDTH && y2 > H + PATH_WIDTH)) {
      continue;
    }

    ctx.strokeStyle = '#1f2f4f';
    ctx.lineWidth = PATH_WIDTH + 8;
    ctx.shadowColor = '#1f2f4f';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = '#6bf0ff';
    ctx.lineWidth = PATH_WIDTH;
    ctx.shadowColor = '#6bf0ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (!seg.passed) {
      const cx = x2;
      const cy = y2;
      if (cy > -40 && cy < H + 40) {
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function render() {
  const cameraY = player.y - VIEW_ANCHOR_Y;

  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.85;
  }

  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 44; i += 1) {
    const x = (i * 91) % W;
    const y = (i * 43 + tick * 1.1) % H;
    ctx.fillStyle = 'rgba(148, 185, 255, 0.24)';
    ctx.fillRect(x, y, 2, 2);
  }

  renderPath(cameraY);

  const px = player.x;
  const py = player.y - cameraY;

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(px, py, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  for (const p of particles) {
    const sy = p.y - cameraY;
    if (sy < -10 || sy > H + 10) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 45);
    ctx.fillRect(p.x, sy, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Game Over', W / 2, H / 2 - 12);

    ctx.font = '16px system-ui';
    ctx.fillText('Tap or press Space to change direction', W / 2, H / 2 + 20);
  }

  ctx.restore();
}

function frame() {
  update();
  render();
  requestAnimationFrame(frame);
}

function onPrimaryAction() {
  if (state !== 'running') {
    startGame();
    return;
  }
  switchDirection();
}

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') {
    onPrimaryAction();
  }
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    if (state !== 'running') {
      startGame();
    }
    moveDir = -1;
  }
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
    if (state !== 'running') {
      startGame();
    }
    moveDir = 1;
  }
});

canvas.addEventListener('pointerdown', onPrimaryAction);
btnStart.addEventListener('click', startGame);

resetGame();
frame();
