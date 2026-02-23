const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'stack-tower-best';

const BLOCK_H = 28;
const BASE_W = 220;

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let shake = 0;
let tick = 0;

let blocks = [];
let active = null;
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

function blockColor(index) {
  const palette = ['#7de3ff', '#7cffb2', '#ffe08a', '#ffb074', '#ff8cb3'];
  return palette[index % palette.length];
}

function addBurst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 4,
      life: 28 + Math.random() * 16,
      color,
    });
  }
}

function topBlock() {
  return blocks[blocks.length - 1];
}

function spawnActiveBlock() {
  const top = topBlock();
  const margin = 10;
  const dir = Math.random() > 0.5 ? 1 : -1;
  const speed = 2.8 + Math.min(3.5, score * 0.12);

  active = {
    x: dir === 1 ? margin : W - margin - top.w,
    y: top.y - BLOCK_H,
    w: top.w,
    h: BLOCK_H,
    dir,
    speed,
    color: blockColor(blocks.length),
  };
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;
  particles = [];

  blocks = [{
    x: (W - BASE_W) / 2,
    y: H - 82,
    w: BASE_W,
    h: BLOCK_H,
    color: '#6bf0ff',
  }];

  spawnActiveBlock();
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
  beep(180, 0.2, 0.05);
  addBurst(active.x + active.w / 2, active.y + active.h / 2, '#ff7b74', 24);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function dropBlock() {
  if (state !== 'running') {
    startGame();
    return;
  }

  const top = topBlock();
  const left = Math.max(active.x, top.x);
  const right = Math.min(active.x + active.w, top.x + top.w);
  const overlap = right - left;

  if (overlap <= 0) {
    endGame();
    return;
  }

  const placed = {
    x: left,
    y: active.y,
    w: overlap,
    h: BLOCK_H,
    color: active.color,
  };

  blocks.push(placed);
  score += 1;
  scoreEl.textContent = String(score);
  addBurst(placed.x + placed.w / 2, placed.y + BLOCK_H / 2, '#7de3ff', 10);
  beep(550 + Math.min(300, score * 12), 0.04, 0.018);

  spawnActiveBlock();
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 1;
  }
  particles = particles.filter((p) => p.life > 0);

  if (state !== 'running') return;

  const margin = 10;
  active.x += active.dir * active.speed;

  if (active.x <= margin) {
    active.x = margin;
    active.dir = 1;
  }

  if (active.x + active.w >= W - margin) {
    active.x = W - margin - active.w;
    active.dir = -1;
  }
}

function render() {
  const highest = topBlock().y;
  const cameraY = Math.min(0, highest - H * 0.56);

  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.84;
  }

  ctx.fillStyle = '#0b1225';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 36; i += 1) {
    const x = (i * 79) % W;
    const y = (i * 41 + tick * 0.7) % H;
    ctx.fillStyle = 'rgba(140, 186, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(125, 227, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.58);
  ctx.lineTo(W, H * 0.58);
  ctx.stroke();

  for (const block of blocks) {
    const y = block.y - cameraY;
    if (y > H + 40 || y < -40) continue;
    ctx.fillStyle = block.color;
    ctx.shadowColor = block.color;
    ctx.shadowBlur = 14;
    ctx.fillRect(block.x, y, block.w, block.h);
  }
  ctx.shadowBlur = 0;

  if (active) {
    const ay = active.y - cameraY;
    ctx.fillStyle = active.color;
    ctx.shadowColor = active.color;
    ctx.shadowBlur = 16;
    ctx.fillRect(active.x, ay, active.w, active.h);
    ctx.shadowBlur = 0;
  }

  for (const p of particles) {
    const y = p.y - cameraY;
    if (y < -8 || y > H + 8) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 38);
    ctx.fillRect(p.x, y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Stack' : 'Tower Collapsed', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('Tap or press Space to drop block', W / 2, H / 2 + 18);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

function onPrimaryAction() {
  dropBlock();
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
