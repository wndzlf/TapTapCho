const bgmAudio = window.TapTapNeonAudio?.create('webgame-12', document.querySelector('.hud'), { theme: 'arcade', showSfxToggle: false });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const shieldEl = document.getElementById('shield');
const leftEl = document.getElementById('left');
const challengeTextEl = document.getElementById('challengeText');
const challengeFillEl = document.getElementById('challengeFill');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnSound = document.getElementById('btnSound');

const W = canvas.width;
const H = canvas.height;
const BEST_KEY = 'knife-hit-lite-best-v3';
const SOUND_KEY = 'knife-hit-lite-sound-v3';
const TAU = Math.PI * 2;

const target = {
  x: W / 2,
  y: H * 0.34,
  r: 76,
  rot: 0,
  speed: 0.025,
  pattern: [0.025],
  patternIndex: 0,
  patternTimer: 0,
};

const flyingKnife = {
  active: false,
  x: W / 2,
  y: H - 88,
  vy: 14,
};

let state = 'idle'; // idle | running | paused | gameover
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let knivesLeft = 6;
let combo = 0;
let comboTimer = 0;
let shield = 1;
let tick = 0;
let shake = 0;
let streak = 0;
let clearedLevels = 0;
let bossRound = false;

let stuck = [];
let fruits = [];
let particles = [];

let challenge = {
  type: 'fruit',
  target: 4,
  progress: 0,
  label: '과일 명중',
  done: false,
};

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

function shortestAngleDiff(a, b) {
  let d = normalizeAngle(a) - normalizeAngle(b);
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
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
    throw() {
      tone({ freq: 420, end: 520, dur: 0.04, gain: 0.02 });
    },
    hit() {
      tone({ freq: 720, end: 980, dur: 0.06, gain: 0.03 });
    },
    fruit() {
      tone({ freq: 620, end: 1040, dur: 0.1, gain: 0.05, type: 'triangle' });
    },
    level() {
      tone({ freq: 500, end: 900, dur: 0.12, gain: 0.05, type: 'triangle' });
    },
    save() {
      tone({ freq: 350, end: 760, dur: 0.12, gain: 0.05, type: 'triangle' });
    },
    challenge() {
      tone({ freq: 460, end: 860, dur: 0.13, gain: 0.05, type: 'triangle' });
    },
    crash() {
      tone({ freq: 170, end: 80, dur: 0.22, gain: 0.07, type: 'sawtooth' });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  btnSound.textContent = `사운드: ${sfx.isEnabled() ? '켜짐' : '꺼짐'}`;
}

function addBurst(x, y, color, amount = 12, spread = 6) {
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

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);
  comboEl.textContent = `x${(1 + Math.min(1.6, combo / 5)).toFixed(1)}`;
  shieldEl.textContent = String(shield);
  leftEl.textContent = String(knivesLeft);
}

function setChallenge() {
  const pool = [
    { type: 'fruit', target: 4 + Math.floor(level * 0.4), label: '과일 명중' },
    { type: 'level', target: 2 + Math.floor(level * 0.2), label: '레벨 클리어' },
    { type: 'streak', target: 8 + Math.floor(level * 0.6), label: '연속 성공' },
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
    score += 120;
    shield = Math.min(3, shield + 1);
    addBurst(target.x, target.y, '#9dffbe', 18, 4.4);
    sfx.challenge();
    setTimeout(() => {
      if (state === 'running') setChallenge();
    }, 700);
  }
  updateChallengeUi();
}

function canPlaceAt(angle, minGap = 0.34) {
  for (const existing of stuck) {
    if (Math.abs(shortestAngleDiff(angle, existing)) < minGap) return false;
  }
  return true;
}

function addSeedKnives(count) {
  const minGap = bossRound ? 0.3 : 0.34;
  for (let i = 0; i < count; i += 1) {
    let tries = 0;
    while (tries < 80) {
      const candidate = rand(0, TAU);
      if (canPlaceAt(candidate, minGap)) {
        stuck.push(candidate);
        break;
      }
      tries += 1;
    }
  }
}

function buildSpeedPattern() {
  const base = 0.02 + Math.min(0.03, level * 0.0028);
  if (bossRound) {
    const fast = base * 1.35;
    target.pattern = [fast, -fast * 0.9, fast * 1.15, -fast];
  } else {
    target.pattern = [base, -base * 0.95, base * 1.05];
  }
  target.patternIndex = 0;
  target.patternTimer = 0;
  target.speed = target.pattern[0];
}

function addFruits(count) {
  fruits = [];
  for (let i = 0; i < count; i += 1) {
    let tries = 0;
    while (tries < 80) {
      const angle = rand(0, TAU);
      if (!canPlaceAt(angle, 0.26)) {
        tries += 1;
        continue;
      }
      let ok = true;
      for (const f of fruits) {
        if (Math.abs(shortestAngleDiff(angle, f.angle)) < 0.3) {
          ok = false;
          break;
        }
      }
      if (ok) {
        fruits.push({ angle, type: Math.random() > 0.65 ? 'gold' : 'apple' });
        break;
      }
      tries += 1;
    }
  }
}

function setupLevel() {
  bossRound = level % 4 === 0;
  target.r = bossRound ? 92 : 76;
  target.rot = rand(0, TAU);

  buildSpeedPattern();

  knivesLeft = bossRound ? Math.min(14, 8 + Math.floor(level * 0.6)) : Math.min(12, 5 + Math.floor(level * 0.75));
  stuck = [];

  const seedCount = Math.min(7, Math.floor((level - 1) / 2));
  addSeedKnives(seedCount);

  addFruits(bossRound ? 5 : 3);

  flyingKnife.active = false;
  flyingKnife.y = H - 88;
}

function resetGame() {
  state = 'idle';
  score = 0;
  level = 1;
  knivesLeft = 6;
  combo = 0;
  comboTimer = 0;
  shield = 1;
  tick = 0;
  shake = 0;
  streak = 0;
  clearedLevels = 0;
  particles = [];

  setChallenge();
  setupLevel();
  updateHud();
}

function startGame() {
  sfx.ensure();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  shake = 12;
  addBurst(flyingKnife.x, flyingKnife.y, '#ff7b74', 24, 6);
  sfx.crash();

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(BEST_KEY, String(best));
}

function onPrimaryAction() {
  if (state !== 'running') {
    startGame();
    return;
  }

  if (!flyingKnife.active) {
    flyingKnife.active = true;
    flyingKnife.y = H - 88;
    sfx.throw();
  }
}

function consumeSave() {
  if (shield <= 0) return false;
  shield -= 1;
  combo = 0;
  comboTimer = 0;
  streak = 0;
  addBurst(flyingKnife.x, flyingKnife.y, '#9dffbe', 16, 5);
  sfx.save();
  flyingKnife.active = false;
  flyingKnife.y = H - 88;
  updateHud();
  return true;
}

function tryHitFruit(hitRelative) {
  for (let i = fruits.length - 1; i >= 0; i -= 1) {
    if (Math.abs(shortestAngleDiff(hitRelative, fruits[i].angle)) < 0.18) {
      const fruit = fruits[i];
      fruits.splice(i, 1);
      const gain = fruit.type === 'gold' ? 40 : 24;
      score += gain;
      addBurst(target.x, target.y, '#ffe08a', 14, 5);
      sfx.fruit();
      addChallenge('fruit', 1);
      if (fruit.type === 'gold') shield = Math.min(3, shield + 1);
      return;
    }
  }
}

function stickKnife(hitAngleRelative) {
  stuck.push(hitAngleRelative);
  knivesLeft -= 1;

  streak += 1;
  combo += 1;
  comboTimer = 2.6;

  let gain = 10 + Math.floor(combo * 1.8);
  if (bossRound) gain += 6;
  score += gain;

  addChallenge('streak', 1);

  const hitAngleWorld = hitAngleRelative + target.rot;
  const hitX = target.x + Math.cos(hitAngleWorld) * target.r;
  const hitY = target.y + Math.sin(hitAngleWorld) * target.r;
  addBurst(hitX, hitY, '#7de3ff', 10, 4.6);
  sfx.hit();

  tryHitFruit(hitAngleRelative);

  flyingKnife.active = false;
  flyingKnife.y = H - 88;

  if (knivesLeft <= 0) {
    level += 1;
    clearedLevels += 1;
    shield = Math.min(3, shield + 1);
    addChallenge('level', 1);
    addBurst(target.x, target.y, '#ffe08a', 30, 5.2);
    sfx.level();
    setupLevel();
  }

  updateHud();
  updateChallengeUi();
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.06;
    p.life -= dt * 60;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function update(dt) {
  tick += 1;
  updateParticles(dt);

  if (state !== 'running') return;

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  target.patternTimer += dt;
  if (target.patternTimer >= (bossRound ? 1.2 : 1.8)) {
    target.patternTimer = 0;
    target.patternIndex = (target.patternIndex + 1) % target.pattern.length;
    target.speed = target.pattern[target.patternIndex];
  }
  target.rot += target.speed * dt * 60;

  if (flyingKnife.active) {
    flyingKnife.y -= flyingKnife.vy * dt * 60;

    const knifeTipY = flyingKnife.y - 22;
    const dy = knifeTipY - target.y;
    const dx = flyingKnife.x - target.x;
    const dist = Math.hypot(dx, dy);

    if (dist <= target.r + 2) {
      const hitAngleWorld = Math.atan2(dy, dx);
      const hitRelative = normalizeAngle(hitAngleWorld - target.rot);
      const minGap = bossRound ? 0.22 : 0.24;

      for (const existing of stuck) {
        if (Math.abs(shortestAngleDiff(hitRelative, existing)) < minGap) {
          if (!consumeSave()) {
            endGame();
            return;
          }
          return;
        }
      }

      stickKnife(hitRelative);
    }
  }

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }
}

function drawKnifeAt(x, y, angle, len = 52, color = '#ffffff') {
  const tipX = x + Math.cos(angle) * len;
  const tipY = y + Math.sin(angle) * len;

  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const handleX = x - Math.cos(angle) * 8;
  const handleY = y - Math.sin(angle) * 8;
  ctx.fillStyle = '#ff8a65';
  ctx.beginPath();
  ctx.arc(handleX, handleY, 4, 0, TAU);
  ctx.fill();
}

function drawFruits() {
  for (const fruit of fruits) {
    const angle = fruit.angle + target.rot;
    const r = target.r - 10;
    const x = target.x + Math.cos(angle) * r;
    const y = target.y + Math.sin(angle) * r;

    ctx.fillStyle = fruit.type === 'gold' ? '#ffe08a' : '#ff8b7d';
    ctx.beginPath();
    ctx.arc(x, y, fruit.type === 'gold' ? 7 : 6, 0, TAU);
    ctx.fill();
  }
}

function render(dt) {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake = Math.max(0, shake - dt * 34);
  }

  ctx.fillStyle = '#0b1121';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 83) % W;
    const y = (i * 39 + tick * 0.8) % H;
    ctx.fillStyle = 'rgba(142, 190, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = bossRound ? '#3d2b59' : '#18294f';
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r + 10, 0, TAU);
  ctx.fill();

  ctx.fillStyle = bossRound ? '#c59dff' : '#6bf0ff';
  ctx.shadowColor = bossRound ? '#c59dff' : '#6bf0ff';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  drawFruits();

  for (const relativeAngle of stuck) {
    const angle = relativeAngle + target.rot;
    const baseX = target.x + Math.cos(angle) * target.r;
    const baseY = target.y + Math.sin(angle) * target.r;
    drawKnifeAt(baseX, baseY, angle, 46, '#ffffff');
  }

  drawKnifeAt(flyingKnife.x, flyingKnife.y, -Math.PI / 2, 46, '#fefefe');

  for (const p of particles) {
    if (p.y < -10 || p.y > H + 10) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#e6eefb';
  ctx.font = 'bold 17px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`레벨 ${level}${bossRound ? ' BOSS' : ''}`, 16, 32);
  ctx.fillText(`남은 칼 ${knivesLeft}`, 16, 56);

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
    ctx.fillText(state === 'idle' ? 'Tap to Throw' : 'Knife Crash', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('같은 각도의 칼을 피해서 투척하세요', W / 2, H / 2 + 18);
    ctx.fillText('보스 원판/과일 보너스로 점수 가속', W / 2, H / 2 + 42);
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
    onPrimaryAction();
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

canvas.addEventListener('pointerdown', onPrimaryAction);
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
