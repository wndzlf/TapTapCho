const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const lengthEl = document.getElementById('length');
const aliveEl = document.getElementById('alive');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;

const WORLD_W = 2600;
const WORLD_H = 2600;
const FOOD_COUNT = 210;
const BOT_COUNT = 10;
const SEG_SPACING = 14;
const STORAGE_KEY = 'worm-arena-rush-best';

const FOOD_COLORS = ['#ff7b74', '#ffe08a', '#9df2ff', '#b8ffa2', '#f7b8ff'];

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let flash = 0;

let player;
let bots = [];
let foods = [];
let rocks = [];
let camera = { x: 0, y: 0 };

const pointer = { x: W * 0.5, y: H * 0.5, hasMoved: false };
const keys = Object.create(null);

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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function angleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function makeFood() {
  return {
    x: rand(32, WORLD_W - 32),
    y: rand(32, WORLD_H - 32),
    r: rand(4.5, 7.5),
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
    value: 1,
  };
}

function makeRocks() {
  rocks = [];
  for (let i = 0; i < 220; i += 1) {
    rocks.push({
      x: rand(0, WORLD_W),
      y: rand(0, WORLD_H),
      r: rand(8, 28),
      a: rand(0.05, 0.16),
      rot: rand(0, Math.PI * 2),
    });
  }
}

function createWorm(options) {
  const segCount = options.segCount;
  const segments = [];
  for (let i = 0; i < segCount; i += 1) {
    segments.push({
      x: options.x - Math.cos(options.angle) * i * SEG_SPACING,
      y: options.y - Math.sin(options.angle) * i * SEG_SPACING,
    });
  }

  return {
    x: options.x,
    y: options.y,
    angle: options.angle,
    targetAngle: options.angle,
    turnSpeed: options.turnSpeed,
    baseSpeed: options.baseSpeed,
    radius: options.radius,
    headColor: options.headColor,
    bodyColor: options.bodyColor,
    eyeColor: options.eyeColor,
    segments,
    grow: 0,
    isPlayer: Boolean(options.isPlayer),
    aiTimer: 0,
    targetFood: -1,
    seed: rand(0, 9999),
  };
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  flash = 0;

  player = createWorm({
    x: WORLD_W * 0.5,
    y: WORLD_H * 0.5,
    angle: -0.35,
    segCount: 18,
    turnSpeed: 4.7,
    baseSpeed: 170,
    radius: 9.5,
    headColor: '#ffb347',
    bodyColor: '#ff932e',
    eyeColor: '#fff',
    isPlayer: true,
  });

  bots = [];
  for (let i = 0; i < BOT_COUNT; i += 1) {
    bots.push(createWorm({
      x: rand(180, WORLD_W - 180),
      y: rand(180, WORLD_H - 180),
      angle: rand(0, Math.PI * 2),
      segCount: 12 + Math.floor(rand(0, 8)),
      turnSpeed: rand(2.2, 3.5),
      baseSpeed: rand(126, 156),
      radius: rand(7.4, 8.8),
      headColor: '#e6f3ff',
      bodyColor: `hsl(${Math.floor(rand(180, 340))} 78% 62%)`,
      eyeColor: '#0d1a34',
      isPlayer: false,
    }));
  }

  foods = Array.from({ length: FOOD_COUNT }, () => makeFood());
  if (rocks.length === 0) makeRocks();

  camera.x = clamp(player.x - W * 0.5, 0, WORLD_W - W);
  camera.y = clamp(player.y - H * 0.5, 0, WORLD_H - H);

  scoreEl.textContent = '0';
  lengthEl.textContent = String(player.segments.length);
  aliveEl.textContent = String(bots.length + 1);
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  beep(160, 0.24, 0.06);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function updatePlayerTarget() {
  let inputX = 0;
  let inputY = 0;

  if (keys.ArrowUp || keys.KeyW) inputY -= 1;
  if (keys.ArrowDown || keys.KeyS) inputY += 1;
  if (keys.ArrowLeft || keys.KeyA) inputX -= 1;
  if (keys.ArrowRight || keys.KeyD) inputX += 1;

  if (inputX !== 0 || inputY !== 0) {
    player.targetAngle = Math.atan2(inputY, inputX);
    return;
  }

  if (!pointer.hasMoved) return;

  const tx = camera.x + pointer.x;
  const ty = camera.y + pointer.y;
  player.targetAngle = Math.atan2(ty - player.y, tx - player.x);
}

function updateBotTarget(bot, dt) {
  bot.aiTimer -= dt;

  if (bot.aiTimer <= 0 || !foods[bot.targetFood]) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < 18; i += 1) {
      const idx = Math.floor(Math.random() * foods.length);
      const f = foods[idx];
      const d = distSq(bot.x, bot.y, f.x, f.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    }

    bot.targetFood = bestIdx;
    bot.aiTimer = rand(0.18, 0.54);
  }

  const target = foods[bot.targetFood];
  if (!target) return;

  bot.targetAngle = Math.atan2(target.y - bot.y, target.x - bot.x) + rand(-0.14, 0.14);
}

function moveWorm(worm, dt) {
  const turnStep = worm.turnSpeed * dt;
  const diff = angleDiff(worm.targetAngle, worm.angle);
  worm.angle += clamp(diff, -turnStep, turnStep);

  let speed = worm.baseSpeed;
  if (worm.isPlayer && (keys.ShiftLeft || keys.ShiftRight || keys.Space)) {
    speed += 92;
  }
  if (!worm.isPlayer) {
    speed += Math.sin((tick + worm.seed) * 0.035) * 14;
  }

  worm.x += Math.cos(worm.angle) * speed * dt;
  worm.y += Math.sin(worm.angle) * speed * dt;

  worm.x = clamp(worm.x, 14, WORLD_W - 14);
  worm.y = clamp(worm.y, 14, WORLD_H - 14);

  worm.segments[0].x = worm.x;
  worm.segments[0].y = worm.y;

  for (let i = 1; i < worm.segments.length; i += 1) {
    const prev = worm.segments[i - 1];
    const seg = worm.segments[i];
    const dx = seg.x - prev.x;
    const dy = seg.y - prev.y;
    const dist = Math.hypot(dx, dy) || 0.0001;

    if (dist > SEG_SPACING) {
      const k = (dist - SEG_SPACING) / dist;
      seg.x -= dx * k;
      seg.y -= dy * k;
    }
  }

  while (worm.grow >= 1) {
    const tail = worm.segments[worm.segments.length - 1];
    worm.segments.push({ x: tail.x, y: tail.y });
    worm.grow -= 1;
  }
}

function consumeFood(worm) {
  for (let i = 0; i < foods.length; i += 1) {
    const food = foods[i];
    const rr = worm.radius + food.r + 2;
    if (distSq(worm.x, worm.y, food.x, food.y) > rr * rr) continue;

    foods[i] = makeFood();
    worm.grow += worm.isPlayer ? 0.95 : 0.62;

    if (worm.isPlayer) {
      score += food.value;
      flash = 6;
      scoreEl.textContent = String(score);
      lengthEl.textContent = String(worm.segments.length);

      if (score % 10 === 0) {
        beep(820, 0.045, 0.02);
      } else {
        beep(560, 0.018, 0.01);
      }
    }
  }
}

function checkPlayerCrash() {
  const hitRadius = (player.radius + 7.5) * (player.radius + 7.5);

  for (let i = 8; i < player.segments.length; i += 2) {
    const seg = player.segments[i];
    if (distSq(player.x, player.y, seg.x, seg.y) < hitRadius) {
      endGame();
      return;
    }
  }

  for (const bot of bots) {
    for (let i = 4; i < bot.segments.length; i += 2) {
      const seg = bot.segments[i];
      if (distSq(player.x, player.y, seg.x, seg.y) < hitRadius) {
        endGame();
        return;
      }
    }
  }
}

function drawWorm(worm) {
  for (let i = worm.segments.length - 1; i >= 0; i -= 1) {
    const seg = worm.segments[i];
    const sx = seg.x - camera.x;
    const sy = seg.y - camera.y;

    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

    const t = 1 - i / worm.segments.length;
    const r = worm.radius * (0.68 + t * 0.34);

    ctx.fillStyle = worm.bodyColor;
    ctx.shadowColor = worm.bodyColor;
    ctx.shadowBlur = worm.isPlayer ? 10 : 5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  const hx = worm.x - camera.x;
  const hy = worm.y - camera.y;

  ctx.fillStyle = worm.headColor;
  ctx.beginPath();
  ctx.arc(hx, hy, worm.radius + 2, 0, Math.PI * 2);
  ctx.fill();

  const nx = Math.cos(worm.angle);
  const ny = Math.sin(worm.angle);
  const lx = -ny;
  const ly = nx;

  const eyeOffset = worm.radius * 0.45;
  const eyeForward = worm.radius * 0.55;

  ctx.fillStyle = worm.eyeColor;
  ctx.beginPath();
  ctx.arc(hx + nx * eyeForward + lx * eyeOffset, hy + ny * eyeForward + ly * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.arc(hx + nx * eyeForward - lx * eyeOffset, hy + ny * eyeForward - ly * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0b1225';
  ctx.beginPath();
  ctx.arc(hx + nx * eyeForward + lx * eyeOffset, hy + ny * eyeForward + ly * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.arc(hx + nx * eyeForward - lx * eyeOffset, hy + ny * eyeForward - ly * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMiniMap() {
  const size = 108;
  const x = W - size - 12;
  const y = 12;

  ctx.fillStyle = 'rgba(4, 8, 24, 0.72)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(230, 240, 255, 0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  for (let i = 0; i < foods.length; i += 8) {
    const f = foods[i];
    const mx = x + (f.x / WORLD_W) * size;
    const my = y + (f.y / WORLD_H) * size;
    ctx.fillStyle = '#dce6ff';
    ctx.fillRect(mx, my, 1.6, 1.6);
  }

  for (const bot of bots) {
    const mx = x + (bot.x / WORLD_W) * size;
    const my = y + (bot.y / WORLD_H) * size;
    ctx.fillStyle = '#ff7b74';
    ctx.fillRect(mx - 1, my - 1, 2.2, 2.2);
  }

  const px = x + (player.x / WORLD_W) * size;
  const py = y + (player.y / WORLD_H) * size;
  ctx.fillStyle = '#7effb6';
  ctx.beginPath();
  ctx.arc(px, py, 3.2, 0, Math.PI * 2);
  ctx.fill();

  const cw = (W / WORLD_W) * size;
  const ch = (H / WORLD_H) * size;
  const cx = x + (camera.x / WORLD_W) * size;
  const cy = y + (camera.y / WORLD_H) * size;
  ctx.strokeStyle = 'rgba(126, 255, 182, 0.55)';
  ctx.strokeRect(cx, cy, cw, ch);
}

function render() {
  ctx.fillStyle = '#2d448f';
  ctx.fillRect(0, 0, W, H);

  for (const rock of rocks) {
    const x = rock.x - camera.x;
    const y = rock.y - camera.y;
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rock.rot);
    ctx.fillStyle = `rgba(154, 181, 255, ${rock.a})`;
    ctx.beginPath();
    ctx.moveTo(-rock.r, -rock.r * 0.2);
    ctx.lineTo(-rock.r * 0.25, -rock.r * 0.8);
    ctx.lineTo(rock.r * 0.9, -rock.r * 0.14);
    ctx.lineTo(rock.r * 0.5, rock.r * 0.8);
    ctx.lineTo(-rock.r * 0.45, rock.r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const food of foods) {
    const x = food.x - camera.x;
    const y = food.y - camera.y;
    if (x < -12 || x > W + 12 || y < -12 || y > H + 12) continue;

    ctx.fillStyle = food.color;
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, food.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  for (const bot of bots) {
    drawWorm(bot);
  }
  drawWorm(player);

  if (flash > 0) {
    ctx.fillStyle = 'rgba(255, 235, 149, 0.08)';
    ctx.fillRect(0, 0, W, H);
  }

  drawMiniMap();

  ctx.fillStyle = '#eaf1ff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px system-ui';
  ctx.fillText(`Score ${score}`, 14, 26);
  ctx.fillText(`Length ${player.segments.length}`, 14, 48);

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Worm Crashed', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Eat food and avoid bodies', W / 2, H / 2 + 18);
  }
}

function update(dt) {
  tick += 1;
  if (flash > 0) flash -= 1;

  if (state !== 'running') return;

  updatePlayerTarget();
  for (const bot of bots) updateBotTarget(bot, dt);

  moveWorm(player, dt);
  for (const bot of bots) moveWorm(bot, dt);

  consumeFood(player);
  for (const bot of bots) consumeFood(bot);

  checkPlayerCrash();
  if (state !== 'running') return;

  camera.x = clamp(player.x - W * 0.5, 0, WORLD_W - W);
  camera.y = clamp(player.y - H * 0.5, 0, WORLD_H - H);

  lengthEl.textContent = String(player.segments.length);
  aliveEl.textContent = String(bots.length + 1);
}

let lastTime = 0;
function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min(0.033, (ts - lastTime) / 1000);
  lastTime = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) * (W / rect.width);
  pointer.y = (event.clientY - rect.top) * (H / rect.height);
  pointer.hasMoved = true;
}

btnStart.addEventListener('click', startGame);

canvas.addEventListener('pointerdown', (event) => {
  updatePointer(event);
  if (state !== 'running') {
    startGame();
  }
});

canvas.addEventListener('pointermove', (event) => {
  updatePointer(event);
});

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') {
    event.preventDefault();
    if (state !== 'running') startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

resetGame();
requestAnimationFrame(loop);
