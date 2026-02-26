const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnSound = document.getElementById('btnSound');

const W = canvas.width;
const H = canvas.height;
const BEST_KEY = 'ball-bounce-best-v2';
const SFX_KEY = 'ball-bounce-sfx-v2';

let state = 'idle'; // idle | running | paused | gameover
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let lives = 3;
let elapsed = 0;
let combo = 0;
let comboTimer = 0;
let flash = 0;
let shake = 0;

const paddle = {
  x: W * 0.5,
  y: H - 48,
  w: 104,
  h: 14,
  speed: 520,
  targetX: W * 0.5,
  growTimer: 0,
};

let balls = [];
let bricks = [];
let pickups = [];
let particles = [];

const keys = Object.create(null);
let pointerDown = false;

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
  let enabled = localStorage.getItem(SFX_KEY) !== 'off';

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
    amp.gain.linearRampToValueAtTime(gain, now + 0.008);
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
      localStorage.setItem(SFX_KEY, enabled ? 'on' : 'off');
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    paddle() {
      tone({ freq: 520, end: 780, dur: 0.05, gain: 0.03 });
    },
    brick() {
      tone({ freq: 340, end: 170, type: 'square', dur: 0.06, gain: 0.03 });
    },
    pickup() {
      tone({ freq: 720, end: 990, dur: 0.12, gain: 0.05 });
    },
    over() {
      tone({ freq: 170, end: 80, type: 'sawtooth', dur: 0.2, gain: 0.08 });
    },
    levelup() {
      tone({ freq: 460, end: 920, type: 'triangle', dur: 0.16, gain: 0.06 });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  btnSound.textContent = `사운드: ${sfx.isEnabled() ? '켜짐' : '꺼짐'}`;
}

function addParticles(x, y, color, count = 12, spread = 3.2) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: rand(-spread, spread),
      vy: rand(-spread, spread),
      life: rand(18, 34),
      size: rand(2, 4),
      color,
    });
  }
  if (particles.length > 220) particles.splice(0, particles.length - 220);
}

function ballTemplate() {
  return {
    x: paddle.x,
    y: paddle.y - 16,
    r: 9,
    vx: rand(-120, 120),
    vy: -360,
    stuck: true,
  };
}

function buildLevel(levelNum) {
  bricks = [];
  const cols = 8;
  const rows = clamp(3 + Math.floor((levelNum - 1) / 2), 3, 8);
  const gap = 6;
  const marginX = 14;
  const brickW = (W - marginX * 2 - gap * (cols - 1)) / cols;
  const brickH = 22;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (Math.random() < 0.07) continue;
      const hp = Math.random() < Math.min(0.55, levelNum * 0.06) ? 2 : 1;
      bricks.push({
        x: marginX + x * (brickW + gap),
        y: 80 + y * (brickH + gap),
        w: brickW,
        h: brickH,
        hp,
        maxHp: hp,
      });
    }
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);
  livesEl.textContent = String(lives);
}

function resetGame() {
  state = 'idle';
  score = 0;
  level = 1;
  lives = 3;
  elapsed = 0;
  combo = 0;
  comboTimer = 0;
  flash = 0;
  shake = 0;

  paddle.x = W * 0.5;
  paddle.targetX = paddle.x;
  paddle.growTimer = 0;
  paddle.w = 104;

  balls = [ballTemplate()];
  pickups = [];
  particles = [];
  buildLevel(level);

  updateHud();
}

function startGame() {
  sfx.ensure();
  resetGame();
  state = 'running';
}

function togglePause() {
  if (state === 'running') state = 'paused';
  else if (state === 'paused') state = 'running';
}

function endGame() {
  state = 'gameover';
  best = Math.max(best, score);
  localStorage.setItem(BEST_KEY, String(best));
  updateHud();
  sfx.over();
}

function launchBall() {
  for (const b of balls) {
    if (b.stuck) {
      b.stuck = false;
      b.vx = rand(-150, 150);
      b.vy = -360 - level * 8;
    }
  }
}

function addScore(base) {
  const mult = 1 + Math.min(1.4, combo / 8);
  score += Math.floor(base * mult);
}

function applyPickup(type) {
  if (type === 'grow') {
    paddle.growTimer = Math.max(paddle.growTimer, 8);
    paddle.w = 144;
    addScore(30);
  } else if (type === 'multi') {
    const extra = [];
    for (const b of balls.slice(0, 2)) {
      extra.push({ x: b.x, y: b.y, r: b.r, vx: -b.vx || -140, vy: b.vy, stuck: false });
      extra.push({ x: b.x, y: b.y, r: b.r, vx: b.vx || 140, vy: b.vy, stuck: false });
    }
    balls.push(...extra);
    addScore(45);
  } else if (type === 'life') {
    lives = Math.min(5, lives + 1);
    addScore(35);
  } else if (type === 'slow') {
    for (const b of balls) {
      b.vx *= 0.84;
      b.vy *= 0.84;
    }
    addScore(24);
  }

  addParticles(paddle.x, paddle.y - 12, '#ffe9ac', 18, 3.2);
  sfx.pickup();
}

function randomPickupType() {
  const r = Math.random();
  if (r < 0.56) return 'grow';
  if (r < 0.78) return 'multi';
  if (r < 0.9) return 'life';
  return 'slow';
}

function circleRectCollision(ball, rect) {
  const cx = clamp(ball.x, rect.x, rect.x + rect.w);
  const cy = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

function updatePaddle(dt) {
  let dir = 0;
  if (keys.ArrowLeft || keys.KeyA) dir -= 1;
  if (keys.ArrowRight || keys.KeyD) dir += 1;

  if (dir !== 0) {
    paddle.targetX += dir * paddle.speed * dt;
  }

  paddle.targetX = clamp(paddle.targetX, paddle.w * 0.5, W - paddle.w * 0.5);
  paddle.x = lerp(paddle.x, paddle.targetX, clamp(dt * 14, 0, 1));

  if (paddle.growTimer > 0) {
    paddle.growTimer -= dt;
    if (paddle.growTimer <= 0) paddle.w = 104;
  }
}

function updateBalls(dt) {
  for (let i = balls.length - 1; i >= 0; i -= 1) {
    const b = balls[i];

    if (b.stuck) {
      b.x = paddle.x;
      b.y = paddle.y - 16;
      continue;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx = Math.abs(b.vx);
    }
    if (b.x + b.r > W) {
      b.x = W - b.r;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy = Math.abs(b.vy);
    }

    const paddleRect = {
      x: paddle.x - paddle.w * 0.5,
      y: paddle.y - paddle.h * 0.5,
      w: paddle.w,
      h: paddle.h,
    };

    if (b.vy > 0 && circleRectCollision(b, paddleRect)) {
      const ratio = (b.x - paddle.x) / (paddle.w * 0.5);
      const speed = Math.hypot(b.vx, b.vy) + 6;
      b.vx = speed * ratio;
      b.vy = -Math.abs(speed * (0.8 + Math.random() * 0.08));
      combo = Math.min(combo + 1, 24);
      comboTimer = 3;
      addScore(8);
      sfx.paddle();
    }

    let hitBrick = false;
    for (let j = bricks.length - 1; j >= 0; j -= 1) {
      const brick = bricks[j];
      if (!circleRectCollision(b, brick)) continue;

      hitBrick = true;
      brick.hp -= 1;
      combo = Math.min(combo + 1, 24);
      comboTimer = 3.2;
      addScore(brick.maxHp > 1 ? 28 : 18);
      addParticles(b.x, b.y, '#8ee7ff', 10, 2.8);
      sfx.brick();

      const prevX = b.x - b.vx * dt;
      const prevY = b.y - b.vy * dt;
      const wasLeft = prevX <= brick.x;
      const wasRight = prevX >= brick.x + brick.w;
      const wasTop = prevY <= brick.y;
      const wasBottom = prevY >= brick.y + brick.h;

      if (wasLeft || wasRight) b.vx *= -1;
      else if (wasTop || wasBottom) b.vy *= -1;
      else b.vy *= -1;

      if (brick.hp <= 0) {
        bricks.splice(j, 1);
        if (Math.random() < 0.22) {
          pickups.push({
            type: randomPickupType(),
            x: brick.x + brick.w * 0.5,
            y: brick.y + brick.h * 0.5,
            r: 11,
            vy: rand(120, 170),
            spin: rand(0, Math.PI * 2),
          });
        }
      }
      break;
    }

    if (!hitBrick && b.y - b.r > H) {
      balls.splice(i, 1);
    }
  }

  if (balls.length === 0) {
    lives -= 1;
    combo = 0;
    comboTimer = 0;
    flash = 16;
    shake = 10;
    if (lives <= 0) {
      endGame();
    } else {
      balls = [ballTemplate()];
    }
  }

  if (bricks.length === 0 && state === 'running') {
    level += 1;
    addScore(120 + level * 20);
    balls = [ballTemplate()];
    buildLevel(level);
    pickups = [];
    sfx.levelup();
    addParticles(W * 0.5, H * 0.4, '#9dffbe', 42, 4.2);
  }
}

function updatePickups(dt) {
  const paddleRect = {
    x: paddle.x - paddle.w * 0.5,
    y: paddle.y - paddle.h * 0.5,
    w: paddle.w,
    h: paddle.h,
  };

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const p = pickups[i];
    p.y += p.vy * dt;
    p.spin += dt * 6;

    const rect = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    if (rect.x < paddleRect.x + paddleRect.w && rect.x + rect.w > paddleRect.x && rect.y < paddleRect.y + paddleRect.h && rect.y + rect.h > paddleRect.y) {
      applyPickup(p.type);
      pickups.splice(i, 1);
      continue;
    }

    if (p.y > H + 30) pickups.splice(i, 1);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= dt * 60;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function update(dt) {
  updateParticles(dt);

  if (state !== 'running') return;

  elapsed += dt;
  updatePaddle(dt);
  updateBalls(dt);
  updatePickups(dt);

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  if (flash > 0) flash -= 1;
  if (shake > 0) shake = Math.max(0, shake - dt * 32);

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  updateHud();
}

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#17346d');
  grd.addColorStop(1, '#0b1735');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 55; i += 1) {
    const x = (i * 77 + elapsed * (18 + level * 2)) % W;
    const y = (i * 49 + elapsed * 34) % H;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(160,210,255,0.2)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function brickColor(brick) {
  if (brick.maxHp > 1) return brick.hp > 1 ? '#f9a8d4' : '#fbcfe8';
  return '#8ee7ff';
}

function drawBricks() {
  for (const b of bricks) {
    ctx.fillStyle = brickColor(b);
    ctx.fillRect(b.x, b.y, b.w, b.h);

    if (b.maxHp > 1) {
      ctx.fillStyle = '#243d66';
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = '#ffe4f2';
      ctx.fillRect(b.x + 4, b.y + 4, (b.w - 8) * (b.hp / b.maxHp), b.h - 8);
    }
  }
}

function drawPaddle() {
  ctx.fillStyle = '#79f3ff';
  ctx.shadowColor = '#79f3ff';
  ctx.shadowBlur = 14;
  ctx.fillRect(paddle.x - paddle.w * 0.5, paddle.y - paddle.h * 0.5, paddle.w, paddle.h);
  ctx.shadowBlur = 0;
}

function drawBalls() {
  for (const b of balls) {
    ctx.fillStyle = '#fff5bf';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd76c';
    ctx.beginPath();
    ctx.arc(b.x - 2, b.y - 2, b.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups() {
  for (const p of pickups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);

    let fill = '#ffe8a7';
    let label = 'P';
    if (p.type === 'multi') {
      fill = '#b7b2ff';
      label = 'M';
    } else if (p.type === 'life') {
      fill = '#a9ffc7';
      label = 'L';
    } else if (p.type === 'slow') {
      fill = '#9fdcff';
      label = 'S';
    }

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#12254a';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawCanvasHud() {
  ctx.fillStyle = 'rgba(5, 10, 25, 0.34)';
  ctx.fillRect(10, 10, 226, 62);
  ctx.fillStyle = '#d9ecff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`레벨 ${level} · 볼 ${balls.length}개 · 콤보 x${(1 + Math.min(1.4, combo / 8)).toFixed(1)}`, 16, 33);
  ctx.fillText(`브릭 ${bricks.length}개 · 생명 ${lives}`, 16, 52);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 132, 168, ${0.05 + flash / 220})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawOverlay() {
  if (state === 'idle' || state === 'paused' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';

    if (state === 'idle') ctx.fillText('Tap to Start', W * 0.5, H * 0.45);
    else if (state === 'paused') ctx.fillText('Paused', W * 0.5, H * 0.45);
    else ctx.fillText('Game Over', W * 0.5, H * 0.45);

    ctx.font = '16px system-ui';
    ctx.fillText('드래그로 패들 이동 · 탭/스페이스 발사', W * 0.5, H * 0.51);
    ctx.fillText('파워업(성장/멀티볼/라이프/슬로우)으로 점수 상승', W * 0.5, H * 0.55);

    if (state === 'gameover') {
      ctx.fillStyle = '#ffe5a8';
      ctx.font = 'bold 20px system-ui';
      ctx.fillText(`최종 점수 ${score}`, W * 0.5, H * 0.62);
    }
  }
}

function render() {
  let sx = 0;
  let sy = 0;
  if (shake > 0) {
    sx = rand(-shake, shake);
    sy = rand(-shake, shake);
  }

  ctx.save();
  ctx.translate(sx, sy);

  drawBackground();
  drawBricks();
  drawPickups();
  drawPaddle();
  drawBalls();
  drawParticles();
  drawCanvasHud();
  drawOverlay();

  ctx.restore();
}

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function startOrRestart() {
  if (state === 'running') {
    startGame();
    return;
  }
  if (state === 'paused') {
    state = 'running';
    return;
  }
  startGame();
}

btnStart.addEventListener('click', startOrRestart);
btnPause.addEventListener('click', () => {
  if (state === 'idle' || state === 'gameover') return;
  togglePause();
});
btnSound.addEventListener('click', () => {
  sfx.ensure();
  sfx.toggle();
  updateSoundButton();
});

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if ((e.code === 'Space' || e.code === 'Enter') && state !== 'running') {
    e.preventDefault();
    startGame();
    return;
  }

  if (e.code === 'Space' && state === 'running') {
    e.preventDefault();
    launchBall();
  }

  if (e.code === 'KeyP' && (state === 'running' || state === 'paused')) {
    e.preventDefault();
    togglePause();
  }

  if (e.code === 'KeyM') {
    e.preventDefault();
    sfx.ensure();
    sfx.toggle();
    updateSoundButton();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('pointerdown', (e) => {
  sfx.ensure();
  pointerDown = true;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  paddle.targetX = x;

  if (state === 'idle' || state === 'gameover') {
    startGame();
    return;
  }

  if (state === 'running') launchBall();
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointerDown || state !== 'running') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  paddle.targetX = x;
});

window.addEventListener('pointerup', () => {
  pointerDown = false;
});

function updateKeyboardPaddle(dt) {
  let dir = 0;
  if (keys.ArrowLeft || keys.KeyA) dir -= 1;
  if (keys.ArrowRight || keys.KeyD) dir += 1;
  if (dir !== 0) paddle.targetX += dir * paddle.speed * dt;
}

const originalUpdate = update;
update = function patchedUpdate(dt) {
  updateKeyboardPaddle(dt);
  originalUpdate(dt);
};

updateSoundButton();
resetGame();
requestAnimationFrame(loop);
