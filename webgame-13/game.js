const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const shieldEl = document.getElementById('shield');
const checkpointEl = document.getElementById('checkpoint');
const challengeTextEl = document.getElementById('challengeText');
const challengeFillEl = document.getElementById('challengeFill');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnSound = document.getElementById('btnSound');

const W = canvas.width;
const H = canvas.height;
const BEST_KEY = 'color-switch-dot-best-v4';
const SOUND_KEY = 'color-switch-dot-sound-v4';

const TAU = Math.PI * 2;
const SEGMENT_ARC = TAU / 4;
const BASE_GAP_ANGLE = 0.24;
const KEEP_COLOR_CHANCE = 0.78;
const BASE_GRAVITY = 0.18;
const BASE_JUMP = -7.2;

const COLORS = ['#ff5f6d', '#ffd166', '#4ecdc4', '#5f8cff'];

let state = 'idle'; // idle | running | paused | gameover
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let combo = 0;
let comboTimer = 0;
let shield = 1;
let checkpoint = 0;
let tick = 0;
let cameraY = 0;
let shake = 0;
let flash = 0;
let slowTimer = 0;
let elapsed = 0;

let challenge = {
  type: 'clear',
  target: 6,
  progress: 0,
  label: '링 통과',
  done: false,
};

const player = {
  x: W / 2,
  y: 560,
  vy: 0,
  r: 11,
  color: COLORS[0],
  invuln: 0,
};

let obstacles = [];
let particles = [];
let bonusCount = 0;

bestEl.textContent = String(best);

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngle(a) {
  let n = a % TAU;
  if (n < 0) n += TAU;
  return n;
}

function randomColorExcept(current) {
  let candidate = current;
  while (candidate === current) {
    candidate = COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  return candidate;
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

  function tone({ freq = 440, end = null, type = 'square', gain = 0.03, dur = 0.08 }) {
    if (!enabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (end != null) osc.frequency.linearRampToValueAtTime(end, now + dur);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.01);
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
    jump() {
      tone({ freq: 540, end: 740, dur: 0.06, gain: 0.03 });
    },
    clear() {
      tone({ freq: 760, end: 1080, dur: 0.08, gain: 0.03 });
    },
    bonus() {
      tone({ freq: 640, end: 980, dur: 0.12, gain: 0.05, type: 'triangle' });
    },
    checkpoint() {
      tone({ freq: 420, end: 860, dur: 0.12, gain: 0.05, type: 'triangle' });
    },
    shield() {
      tone({ freq: 330, end: 740, dur: 0.12, gain: 0.05, type: 'triangle' });
    },
    crash() {
      tone({ freq: 180, end: 80, dur: 0.2, gain: 0.07, type: 'sawtooth' });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  btnSound.textContent = `사운드: ${sfx.isEnabled() ? '켜짐' : '꺼짐'}`;
}

function addBurst(x, y, color, amount = 10, spread = 5) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * spread,
      vy: (Math.random() - 0.5) * spread,
      life: 24 + Math.random() * 20,
      color,
    });
  }
  if (particles.length > 260) particles.splice(0, particles.length - 260);
}

function setChallenge() {
  const pool = [
    { type: 'clear', target: 6 + Math.floor(level * 0.5), label: '링 통과' },
    { type: 'bonus', target: 3 + Math.floor(level * 0.4), label: '보너스 링' },
    { type: 'survive', target: 18 + level * 1.2, label: '생존 시간' },
  ];
  const c = pool[Math.floor(Math.random() * pool.length)];
  challenge = { ...c, progress: 0, done: false };
  updateChallengeUi();
}

function updateChallengeUi() {
  const progress = Math.min(challenge.target, Math.floor(challenge.progress));
  challengeTextEl.textContent = `${challenge.label} ${progress}/${challenge.target}`;
  const ratio = clamp(challenge.progress / Math.max(1, challenge.target), 0, 1);
  challengeFillEl.style.width = `${ratio * 100}%`;
}

function addChallenge(type, value) {
  if (challenge.done || challenge.type !== type) return;
  challenge.progress += value;
  if (challenge.progress >= challenge.target) {
    challenge.progress = challenge.target;
    challenge.done = true;
    score += 100;
    shield = Math.min(3, shield + 1);
    flash = Math.max(flash, 12);
    addBurst(player.x, player.y, '#9dffbe', 18, 4.2);
    sfx.checkpoint();
    setTimeout(() => {
      if (state === 'running') setChallenge();
    }, 700);
  }
  updateChallengeUi();
}

function makeObstacle(y) {
  const roll = Math.random();
  let kind = 'normal';
  if (roll > 0.8 && roll < 0.92) kind = 'bonus';
  if (roll >= 0.92) kind = 'slow';

  return {
    y,
    r: rand(62, 78),
    thickness: kind === 'bonus' ? 13 : 12,
    rot: rand(0, TAU),
    rotSpeed: (Math.random() > 0.5 ? 1 : -1) * rand(0.0042, 0.0082),
    kind,
    cleared: false,
    checkedThisPass: false,
  };
}

function buildInitialObstacles() {
  obstacles = [];
  let y = 420;
  for (let i = 0; i < 10; i += 1) {
    obstacles.push(makeObstacle(y));
    y -= rand(280, 340);
  }
}

function extendObstacles() {
  while (obstacles[obstacles.length - 1].y > player.y - 2000) {
    const last = obstacles[obstacles.length - 1];
    obstacles.push(makeObstacle(last.y - rand(280, 340)));
  }
}

function resetGame() {
  state = 'idle';
  score = 0;
  level = 1;
  combo = 0;
  comboTimer = 0;
  shield = 1;
  checkpoint = 0;
  tick = 0;
  cameraY = 0;
  shake = 0;
  flash = 0;
  slowTimer = 0;
  elapsed = 0;
  bonusCount = 0;

  player.y = 560;
  player.vy = 0;
  player.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  player.invuln = 0;

  particles = [];
  buildInitialObstacles();
  setChallenge();
  updateHud();
}

function startGame() {
  sfx.ensure();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  shake = 10;
  flash = 14;
  addBurst(player.x, player.y, '#ff7b74', 24, 6);
  sfx.crash();

  best = Math.max(best, score);
  localStorage.setItem(BEST_KEY, String(best));
  bestEl.textContent = String(best);
}

function jump() {
  if (state !== 'running') {
    startGame();
    return;
  }

  player.vy = BASE_JUMP;
  addBurst(player.x, player.y, player.color, 8, 4.5);
  sfx.jump();
}

function absorbHit() {
  if (player.invuln > 0) return true;
  if (shield <= 0) return false;

  shield -= 1;
  player.invuln = 1.0;
  combo = 0;
  comboTimer = 0;
  flash = Math.max(flash, 16);
  addBurst(player.x, player.y, '#9dffbe', 16, 5);
  sfx.shield();
  return true;
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);
  comboEl.textContent = `x${(1 + Math.min(1.4, combo / 5)).toFixed(1)}`;
  shieldEl.textContent = String(shield);
  checkpointEl.textContent = String(checkpoint);
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.05;
    p.life -= dt * 60;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function handleObstacle(obs, dt) {
  const rotMul = slowTimer > 0 ? 0.7 : 1;
  obs.rot += obs.rotSpeed * rotMul * dt * 60;

  if (!obs.cleared && obs.checkedThisPass && player.y > obs.y + obs.r + 30) {
    obs.checkedThisPass = false;
  }

  if (obs.cleared) return true;

  const dy = player.y - obs.y;
  const radial = Math.abs(dy);
  const inner = obs.r - obs.thickness * 0.5;
  const outer = obs.r + obs.thickness * 0.5;

  const intersectsBand = radial + player.r > inner && radial - player.r < outer;

  if (!obs.checkedThisPass && intersectsBand && player.vy < 0 && dy > 0) {
    obs.checkedThisPass = true;
    const contactAngle = dy < 0 ? -Math.PI / 2 : Math.PI / 2;
    const localAngle = normalizeAngle(contactAngle - obs.rot);
    const angleInSegment = localAngle % SEGMENT_ARC;
    const gapAngle = slowTimer > 0 ? BASE_GAP_ANGLE + 0.03 : BASE_GAP_ANGLE;

    if (angleInSegment < gapAngle || angleInSegment > SEGMENT_ARC - gapAngle) {
      return true;
    }

    const segmentIndex = Math.floor(localAngle / SEGMENT_ARC) % 4;
    const segmentColor = COLORS[segmentIndex];

    if (segmentColor !== player.color) {
      if (!absorbHit()) {
        endGame();
        return false;
      }
    }
  }

  if (!obs.cleared && player.y < obs.y - obs.r - 16) {
    obs.cleared = true;
    combo += 1;
    comboTimer = 2.4;

    score += 1 + Math.floor(combo / 5);
    addChallenge('clear', 1);

    if (obs.kind === 'bonus') {
      bonusCount += 1;
      score += 18 + level * 2;
      addChallenge('bonus', 1);
      addBurst(player.x, player.y, '#ffe08a', 14, 4.5);
      sfx.bonus();
      if (bonusCount % 3 === 0) shield = Math.min(3, shield + 1);
    } else if (obs.kind === 'slow') {
      slowTimer = Math.max(slowTimer, 4.5);
      addBurst(player.x, player.y, '#9fd8ff', 12, 3.8);
      sfx.bonus();
    } else {
      sfx.clear();
    }

    if (Math.random() > KEEP_COLOR_CHANCE) {
      player.color = randomColorExcept(player.color);
    }
  }

  return true;
}

function update(dt) {
  tick += 1;
  updateParticles(dt);

  if (state !== 'running') return;

  elapsed += dt;
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  if (slowTimer > 0) slowTimer -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  const gravity = BASE_GRAVITY + (level - 1) * 0.007 - (slowTimer > 0 ? 0.05 : 0);
  player.vy += gravity * dt * 60;
  player.vy = Math.min(player.vy, 6.2);
  player.y += player.vy * dt * 60;

  if (player.y < cameraY + H * 0.44) {
    cameraY = player.y - H * 0.44;
  }

  if (player.y - cameraY > H + 90) {
    if (!absorbHit()) {
      endGame();
      return;
    }
    player.vy = BASE_JUMP * 0.5;
  }

  extendObstacles();

  for (const obs of obstacles) {
    const ok = handleObstacle(obs, dt);
    if (!ok) return;
  }

  level = clamp(1 + Math.floor(score / 6), 1, 12);

  const nextCheckpoint = Math.floor(score / 5) * 5;
  if (nextCheckpoint > checkpoint) {
    checkpoint = nextCheckpoint;
    shield = Math.min(3, shield + 1);
    flash = Math.max(flash, 10);
    addBurst(player.x, player.y, '#9dffbe', 16, 4.2);
    sfx.checkpoint();
  }

  addChallenge('survive', dt);

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  updateHud();
  updateChallengeUi();

  if (flash > 0) flash -= 1;
}

function obstacleColor(kind, index) {
  if (kind === 'bonus') {
    return ['#ffd166', '#ffe08a', '#ffbf69', '#ffe29f'][index];
  }
  if (kind === 'slow') {
    return ['#9fd8ff', '#77d6ff', '#8fc7ff', '#9fd8ff'][index];
  }
  return COLORS[index];
}

function drawObstacle(obs) {
  const y = obs.y - cameraY;
  if (y < -130 || y > H + 130) return;

  ctx.lineCap = 'round';

  for (let i = 0; i < 4; i += 1) {
    const start = obs.rot + i * SEGMENT_ARC + BASE_GAP_ANGLE;
    const end = obs.rot + (i + 1) * SEGMENT_ARC - BASE_GAP_ANGLE;

    const color = obstacleColor(obs.kind, i);
    ctx.strokeStyle = color;
    ctx.lineWidth = obs.thickness;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(W / 2, y, obs.r, start, end);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  if (obs.kind === 'bonus' && !obs.cleared) {
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(W / 2, y, 4.5, 0, TAU);
    ctx.fill();
  }

  if (obs.kind === 'slow' && !obs.cleared) {
    ctx.fillStyle = '#9fd8ff';
    ctx.fillRect(W / 2 - 4, y - 4, 8, 8);
  }
}

function render(dt) {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake = Math.max(0, shake - dt * 36);
  }

  ctx.fillStyle = '#091122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 40; i += 1) {
    const x = (i * 89) % W;
    const y = (i * 37 + tick * 1.1) % H;
    ctx.fillStyle = 'rgba(142, 188, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  for (const obs of obstacles) {
    drawObstacle(obs);
  }

  const py = player.y - cameraY;
  if (player.invuln > 0) {
    ctx.globalAlpha = 0.45 + Math.sin(tick * 0.25) * 0.3;
  }
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(player.x, py, player.r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  for (const p of particles) {
    const y = p.y - cameraY;
    if (y < -10 || y > H + 10) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 38);
    ctx.fillRect(p.x, y, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(8, 14, 30, 0.35)';
  ctx.fillRect(10, 10, 238, 46);
  ctx.fillStyle = '#d3e7ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`레벨 ${level} · 보너스 ${bonusCount}`, 16, 30);
  ctx.fillText(`현재색`, 16, 46);
  ctx.fillStyle = player.color;
  ctx.fillRect(54, 36, 16, 10);

  if (slowTimer > 0) {
    ctx.fillStyle = '#9fd8ff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`SLOW ${slowTimer.toFixed(1)}s`, W - 14, 30);
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 144, 190, ${0.04 + flash / 220})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state === 'paused') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText('일시정지', W / 2, H / 2 - 10);
    ctx.font = '16px system-ui';
    ctx.fillText('P 또는 일시정지 버튼으로 재개', W / 2, H / 2 + 20);
  }

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Jump' : 'Game Over', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('같은 색 구간만 통과하세요', W / 2, H / 2 + 18);
    ctx.fillText('실드/체크포인트로 안정적으로 성장', W / 2, H / 2 + 42);
  }

  ctx.restore();
}

function togglePause() {
  if (state === 'idle' || state === 'gameover') return;
  state = state === 'running' ? 'paused' : 'running';
}

let lastTs = 0;
function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.033, (ts - lastTs) / 1000);
  lastTs = ts;

  update(dt);
  render(dt);
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') {
    event.preventDefault();
    jump();
  }

  if (event.key === 'p' || event.key === 'P') {
    event.preventDefault();
    togglePause();
  }

  if (event.key === 'm' || event.key === 'M') {
    event.preventDefault();
    sfx.ensure();
    sfx.toggle();
    updateSoundButton();
  }
});

canvas.addEventListener('pointerdown', jump);
btnStart.addEventListener('click', startGame);
btnPause.addEventListener('click', togglePause);
btnSound.addEventListener('click', () => {
  sfx.ensure();
  sfx.toggle();
  updateSoundButton();
});

resetGame();
updateSoundButton();
requestAnimationFrame(loop);
