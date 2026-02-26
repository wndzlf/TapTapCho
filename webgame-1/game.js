const bgmAudio = window.TapTapNeonAudio?.create('webgame-1', document.querySelector('.hud'), { theme: 'neon' });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const BEST_KEY = 'neon-dodge-best-v2';
const SFX_KEY = 'neon-dodge-sfx-v2';

const player = {
  x: W * 0.5,
  y: H - 90,
  w: 40,
  h: 40,
  targetX: W * 0.5,
  speed: 560,
  shield: 0,
  invuln: 0,
};

let state = 'idle'; // idle | running | paused | gameover
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let elapsed = 0;
let level = 1;
let spawnTimer = 0;
let flash = 0;
let shake = 0;
let combo = 0;
let comboTimer = 0;
let nearCount = 0;
let coinCount = 0;
let magnet = 0;

let obstacles = [];
let pickups = [];
let particles = [];

const keys = Object.create(null);
let pointerActive = false;

const challenge = {
  type: 'near',
  target: 6,
  progress: 0,
  done: false,
  text: '근접 회피 6회',
};

bestEl.textContent = String(best);

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function boxOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

  function tone({ freq = 440, end = null, type = 'triangle', gain = 0.04, dur = 0.08 }) {
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
      localStorage.setItem(SFX_KEY, enabled ? 'on' : 'off');
    },
    move() {
      tone({ freq: 360, end: 520, dur: 0.05, gain: 0.02 });
    },
    pickup() {
      tone({ freq: 720, end: 980, dur: 0.1, gain: 0.04 });
    },
    near() {
      tone({ freq: 560, end: 410, dur: 0.06, gain: 0.03 });
    },
    hit() {
      tone({ freq: 170, end: 70, type: 'sawtooth', dur: 0.18, gain: 0.07 });
    },
    challenge() {
      tone({ freq: 480, end: 870, dur: 0.12, gain: 0.05, type: 'square' });
    },
  };
}

const sfx = createSfx();

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

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function resetChallenge() {
  const choices = [
    { type: 'near', target: 6 + Math.floor(level * 0.4), text: '근접 회피' },
    { type: 'coin', target: 5 + Math.floor(level * 0.4), text: '코인 획득' },
    { type: 'survive', target: 18 + Math.floor(level * 0.8), text: '생존 시간' },
  ];
  const c = choices[Math.floor(Math.random() * choices.length)];
  challenge.type = c.type;
  challenge.target = c.target;
  challenge.progress = 0;
  challenge.done = false;
  challenge.text = c.text;
}

function challengeAdd(type, value) {
  if (challenge.done || challenge.type !== type) return;
  challenge.progress += value;
  if (challenge.progress >= challenge.target) {
    challenge.progress = challenge.target;
    challenge.done = true;
    player.shield = Math.min(2, player.shield + 1);
    score += 180;
    addParticles(player.x, player.y - 10, '#9dffbe', 20, 3.9);
    sfx.challenge();
    setTimeout(() => {
      if (state === 'running') resetChallenge();
    }, 600);
  }
}

function resetGame() {
  state = 'idle';
  score = 0;
  elapsed = 0;
  level = 1;
  spawnTimer = 0.62;
  flash = 0;
  shake = 0;
  combo = 0;
  comboTimer = 0;
  nearCount = 0;
  coinCount = 0;
  magnet = 0;

  obstacles = [];
  pickups = [];
  particles = [];

  player.x = W * 0.5;
  player.targetX = player.x;
  player.shield = 0;
  player.invuln = 0;

  resetChallenge();
  updateHud();
}

function startGame() {
  sfx.ensure();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  best = Math.max(best, score);
  localStorage.setItem(BEST_KEY, String(best));
  updateHud();
}

function spawnObstacle() {
  const typeRoll = Math.random();
  let type = 'block';
  if (level >= 3 && typeRoll < 0.2) type = 'wide';
  else if (level >= 4 && typeRoll < 0.4) type = 'zig';

  const size = type === 'wide' ? rand(90, 150) : rand(30, 56);
  const x = rand(8, W - size - 8);

  obstacles.push({
    type,
    x,
    y: -size,
    w: size,
    h: type === 'wide' ? 24 : size,
    vy: rand(180, 260) + level * 26,
    vx: type === 'zig' ? rand(-130, 130) : 0,
    nearGiven: false,
  });
}

function spawnPickup() {
  const type = Math.random() < 0.75 ? 'coin' : 'shield';
  pickups.push({
    type,
    x: rand(24, W - 24),
    y: -20,
    r: 12,
    vy: rand(160, 220) + level * 14,
    spin: rand(0, Math.PI * 2),
  });
}

function playerBox() {
  return {
    x: player.x - player.w * 0.5,
    y: player.y - player.h * 0.5,
    w: player.w,
    h: player.h,
  };
}

function damagePlayer() {
  if (player.invuln > 0 || state !== 'running') return;
  if (player.shield > 0) {
    player.shield -= 1;
    player.invuln = 0.9;
    addParticles(player.x, player.y, '#9dffbe', 18, 3.5);
    sfx.pickup();
    return;
  }

  flash = 20;
  shake = 12;
  addParticles(player.x, player.y, '#ff8dbf', 30, 4.8);
  sfx.hit();
  endGame();
}

function updatePlayer(dt) {
  let dir = 0;
  if (keys.ArrowLeft || keys.KeyA) dir -= 1;
  if (keys.ArrowRight || keys.KeyD) dir += 1;

  if (dir !== 0) {
    player.targetX += dir * player.speed * dt;
    sfx.move();
  }

  player.targetX = clamp(player.targetX, player.w * 0.5, W - player.w * 0.5);
  player.x = lerp(player.x, player.targetX, clamp(dt * 12, 0, 1));

  player.invuln = Math.max(0, player.invuln - dt);
  magnet = Math.max(0, magnet - dt);
}

function updateDifficulty(dt) {
  elapsed += dt;
  level = clamp(1 + Math.floor(elapsed / 12), 1, 12);

  const spawnBase = clamp(0.78 - level * 0.045, 0.22, 0.78);
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    if (Math.random() < 0.24) spawnPickup();
    spawnTimer = spawnBase * rand(0.84, 1.18);
  }

  challengeAdd('survive', dt);
}

function updateObstacles(dt) {
  const pBox = playerBox();

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const o = obstacles[i];
    o.y += o.vy * dt;
    if (o.type === 'zig') {
      o.x += o.vx * dt;
      if (o.x < 8 || o.x + o.w > W - 8) o.vx *= -1;
      o.x = clamp(o.x, 8, W - o.w - 8);
    }

    const box = { x: o.x, y: o.y, w: o.w, h: o.h };
    if (boxOverlap(pBox, box)) {
      obstacles.splice(i, 1);
      damagePlayer();
      continue;
    }

    if (!o.nearGiven) {
      const centerX = o.x + o.w * 0.5;
      const dx = Math.abs(centerX - player.x);
      const dy = Math.abs((o.y + o.h * 0.5) - player.y);
      if (dx > 42 && dx < 90 && dy < 28) {
        o.nearGiven = true;
        nearCount += 1;
        combo += 1;
        comboTimer = 2.0;
        score += Math.floor(12 * (1 + Math.min(1.2, combo / 8)));
        challengeAdd('near', 1);
        sfx.near();
      }
    }

    if (o.y > H + 70) obstacles.splice(i, 1);
  }
}

function updatePickups(dt) {
  const pBox = playerBox();

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const p = pickups[i];
    p.y += p.vy * dt;
    p.spin += dt * 7;

    if (magnet > 0 && p.type === 'coin') {
      p.x = lerp(p.x, player.x, clamp(dt * 2.8, 0, 1));
    }

    const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    if (boxOverlap(pBox, box)) {
      if (p.type === 'coin') {
        coinCount += 1;
        score += 30;
        combo += 1;
        comboTimer = 2.4;
        challengeAdd('coin', 1);
      } else {
        player.shield = Math.min(2, player.shield + 1);
        magnet = Math.max(magnet, 6);
        score += 20;
      }
      sfx.pickup();
      addParticles(p.x, p.y, '#ffe7a2', 14, 2.8);
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

  updatePlayer(dt);
  updateDifficulty(dt);
  updateObstacles(dt);
  updatePickups(dt);

  score += Math.floor((4 + level * 0.6) * dt * 10);

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  if (flash > 0) flash -= 1;
  if (shake > 0) shake = Math.max(0, shake - dt * 30);

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }
  updateHud();
}

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#142751');
  grd.addColorStop(1, '#0b1328');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 66; i += 1) {
    const x = (i * 71 + Math.sin(i * 1.7 + elapsed) * 5 + elapsed * 22) % W;
    const y = (i * 41 + elapsed * (40 + level * 6)) % H;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.30)' : 'rgba(170,210,255,0.22)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.invuln > 0) {
    ctx.globalAlpha = 0.45 + Math.sin(elapsed * 18) * 0.2;
  }

  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(157,255,190,0.84)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30 + Math.sin(elapsed * 5), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#66f0ff';
  ctx.shadowColor = '#66f0ff';
  ctx.shadowBlur = 16;
  ctx.fillRect(-player.w * 0.5, -player.h * 0.5, player.w, player.h);

  ctx.fillStyle = '#08203e';
  ctx.fillRect(-10, -8, 20, 16);

  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawObstacles() {
  for (const o of obstacles) {
    ctx.fillStyle = o.type === 'wide' ? '#ff9d50' : o.type === 'zig' ? '#ff7fc2' : '#ff7b00';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillRect(o.x, o.y, o.w, o.h);
  }
  ctx.shadowBlur = 0;
}

function drawPickups() {
  for (const p of pickups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);

    ctx.fillStyle = p.type === 'coin' ? '#ffe08a' : '#9dffbe';
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#132743';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'coin' ? '$' : 'S', 0, 0);

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

function drawUiOnCanvas() {
  ctx.fillStyle = 'rgba(4, 10, 25, 0.34)';
  ctx.fillRect(10, 10, 220, 72);
  ctx.fillStyle = '#d7ebff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`레벨 ${level} · 콤보 x${(1 + Math.min(1.4, combo / 8)).toFixed(1)}`, 16, 32);
  ctx.fillText(`코인 ${coinCount} · 근접회피 ${nearCount}`, 16, 50);

  const p = Math.min(challenge.target, Math.floor(challenge.progress));
  ctx.fillText(`챌린지: ${challenge.text} ${p}/${challenge.target}`, 16, 68);

  if (challenge.done) {
    ctx.fillStyle = '#9dffbe';
    ctx.textAlign = 'right';
    ctx.fillText('완료! +실드 +보너스', W - 16, 32);
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,120,165,${0.06 + flash / 260})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawOverlay() {
  if (state === 'idle' || state === 'gameover' || state === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';

    if (state === 'idle') ctx.fillText('Tap to Start', W * 0.5, H * 0.46);
    else if (state === 'paused') ctx.fillText('Paused', W * 0.5, H * 0.46);
    else ctx.fillText('Game Over', W * 0.5, H * 0.46);

    ctx.font = '16px system-ui';
    ctx.fillText('A/D, 방향키, 드래그로 회피 · M 사운드', W * 0.5, H * 0.52);
    ctx.fillText('실드와 코인을 모아 점수 가속', W * 0.5, H * 0.56);

    if (state === 'gameover') {
      ctx.fillStyle = '#ffe3a4';
      ctx.font = 'bold 20px system-ui';
      ctx.fillText(`점수 ${score}`, W * 0.5, H * 0.62);
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
  drawObstacles();
  drawPickups();
  drawPlayer();
  drawParticles();
  drawUiOnCanvas();
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
  } else if (state === 'paused') {
    state = 'running';
  } else {
    startGame();
  }
}

btnStart.addEventListener('click', startOrRestart);

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if ((e.code === 'Space' || e.code === 'Enter') && state !== 'running') {
    e.preventDefault();
    startGame();
  }
  if (e.code === 'KeyP' && (state === 'running' || state === 'paused')) {
    e.preventDefault();
    state = state === 'running' ? 'paused' : 'running';
  }
  if (e.code === 'KeyM') {
    e.preventDefault();
    sfx.ensure();
    sfx.toggle();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('pointerdown', (e) => {
  sfx.ensure();
  pointerActive = true;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  player.targetX = x;

  if (state !== 'running') {
    startGame();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointerActive || state !== 'running') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  player.targetX = x;
});

window.addEventListener('pointerup', () => {
  pointerActive = false;
});

resetGame();
requestAnimationFrame(loop);
