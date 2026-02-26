const bgmAudio = window.TapTapNeonAudio?.create('webgame-11', document.querySelector('.hud'), { theme: 'pulse', showSfxToggle: false });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const shieldEl = document.getElementById('shield');
const perfectEl = document.getElementById('perfect');
const challengeTextEl = document.getElementById('challengeText');
const challengeFillEl = document.getElementById('challengeFill');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnSound = document.getElementById('btnSound');

const W = canvas.width;
const H = canvas.height;
const BEST_KEY = 'stack-tower-best-v3';
const SOUND_KEY = 'stack-tower-sound-v3';

const BLOCK_H = 28;
const BASE_W = 220;

let state = 'idle'; // idle | running | paused | gameover
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let combo = 0;
let comboTimer = 0;
let shield = 1;
let perfectCount = 0;
let shake = 0;
let flash = 0;
let tick = 0;

let blocks = [];
let active = null;
let particles = [];

let challenge = {
  type: 'stack',
  target: 10,
  progress: 0,
  label: '블록 적층',
  done: false,
};

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
    drop() {
      tone({ freq: 500, end: 260, dur: 0.06, gain: 0.03 });
    },
    perfect() {
      tone({ freq: 760, end: 1080, dur: 0.09, gain: 0.04 });
    },
    bonus() {
      tone({ freq: 560, end: 920, dur: 0.11, gain: 0.05, type: 'triangle' });
    },
    save() {
      tone({ freq: 360, end: 760, dur: 0.12, gain: 0.05, type: 'triangle' });
    },
    challenge() {
      tone({ freq: 460, end: 860, dur: 0.13, gain: 0.05, type: 'triangle' });
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

function addBurst(x, y, color, amount = 12, spread = 5) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * spread,
      vy: (Math.random() - 0.5) * spread,
      life: 24 + Math.random() * 18,
      color,
    });
  }
  if (particles.length > 260) particles.splice(0, particles.length - 260);
}

function topBlock() {
  return blocks[blocks.length - 1];
}

function blockColor(index, type = 'normal') {
  if (type === 'bonus') return '#ffe08a';
  if (type === 'fragile') return '#ff9ec7';
  if (type === 'speed') return '#8ad0ff';
  const palette = ['#7de3ff', '#7cffb2', '#ffe08a', '#ffb074', '#ff8cb3'];
  return palette[index % palette.length];
}

function pickBlockType() {
  const roll = Math.random();
  if (roll < 0.18) return 'bonus';
  if (roll < 0.3) return 'fragile';
  if (roll < 0.42) return 'speed';
  return 'normal';
}

function setChallenge() {
  const pool = [
    { type: 'stack', target: 10 + Math.floor(level * 0.6), label: '블록 적층' },
    { type: 'perfect', target: 4 + Math.floor(level * 0.4), label: '완벽 적층' },
    { type: 'score', target: 260 + level * 40, label: '점수 획득' },
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
    score += 140;
    shield = Math.min(3, shield + 1);
    flash = Math.max(flash, 12);
    addBurst(active ? active.x + active.w * 0.5 : W * 0.5, topBlock().y, '#9dffbe', 18, 4.2);
    sfx.challenge();
    setTimeout(() => {
      if (state === 'running') setChallenge();
    }, 700);
  }
  updateChallengeUi();
}

function spawnActiveBlock() {
  const top = topBlock();
  const margin = 10;
  const dir = Math.random() > 0.5 ? 1 : -1;

  const type = pickBlockType();
  let speed = 2.6 + Math.min(4.2, level * 0.2 + score * 0.006);
  if (type === 'speed') speed *= 1.25;
  if (type === 'fragile') speed *= 1.08;

  active = {
    x: dir === 1 ? margin : W - margin - top.w,
    y: top.y - BLOCK_H,
    w: top.w,
    h: BLOCK_H,
    dir,
    speed,
    type,
    color: blockColor(blocks.length, type),
  };
}

function resetGame() {
  state = 'idle';
  score = 0;
  level = 1;
  combo = 0;
  comboTimer = 0;
  shield = 1;
  perfectCount = 0;
  shake = 0;
  flash = 0;
  tick = 0;
  particles = [];

  blocks = [{
    x: (W - BASE_W) / 2,
    y: H - 82,
    w: BASE_W,
    h: BLOCK_H,
    color: '#6bf0ff',
    type: 'base',
  }];

  setChallenge();
  spawnActiveBlock();
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
  flash = 16;
  addBurst(active.x + active.w * 0.5, active.y + active.h * 0.5, '#ff7b74', 24, 6);
  sfx.crash();

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(BEST_KEY, String(best));
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);
  comboEl.textContent = `x${(1 + Math.min(1.6, combo / 4)).toFixed(1)}`;
  shieldEl.textContent = String(shield);
  perfectEl.textContent = String(perfectCount);
}

function applyMissSave() {
  if (shield <= 0) return false;
  shield -= 1;
  combo = 0;
  comboTimer = 0;
  flash = Math.max(flash, 14);
  shake = Math.max(shake, 8);
  addBurst(active.x + active.w * 0.5, active.y + active.h * 0.5, '#9dffbe', 18, 5);
  sfx.save();
  spawnActiveBlock();
  return true;
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
    if (!applyMissSave()) {
      endGame();
    }
    updateHud();
    return;
  }

  const activeCenter = active.x + active.w * 0.5;
  const topCenter = top.x + top.w * 0.5;
  const perfect = Math.abs(activeCenter - topCenter) < 6;

  let placedW = overlap;
  if (active.type === 'bonus') placedW = Math.min(top.w + 12, overlap + 8);
  if (active.type === 'fragile') placedW = Math.max(36, overlap - 6);

  const overlapCenter = (left + right) * 0.5;
  const placedX = clamp(overlapCenter - placedW * 0.5, 10, W - 10 - placedW);

  const placed = {
    x: placedX,
    y: active.y,
    w: placedW,
    h: BLOCK_H,
    color: active.color,
    type: active.type,
  };

  blocks.push(placed);

  let gained = 10;
  if (perfect) {
    perfectCount += 1;
    combo += 1;
    comboTimer = 2.4;
    gained += 24 + combo * 3;
    addBurst(placed.x + placed.w * 0.5, placed.y + BLOCK_H * 0.5, '#ffffff', 14, 4.2);
    sfx.perfect();
    addChallenge('perfect', 1);
  } else {
    combo = 0;
    gained += 8;
    sfx.drop();
  }

  if (active.type === 'bonus') {
    gained += 18;
    shield = Math.min(3, shield + 1);
    addBurst(placed.x + placed.w * 0.5, placed.y + BLOCK_H * 0.5, '#ffe08a', 12, 4.5);
    sfx.bonus();
  }

  if (active.type === 'speed') {
    gained += 12;
  }

  score += Math.floor(gained * (1 + Math.min(1.2, combo / 6)));
  level = clamp(1 + Math.floor(score / 260), 1, 12);

  if ((blocks.length - 1) % 8 === 0) {
    shield = Math.min(3, shield + 1);
    flash = Math.max(flash, 10);
    addBurst(placed.x + placed.w * 0.5, placed.y + BLOCK_H * 0.5, '#9dffbe', 12, 4.2);
    sfx.challenge();
  }

  addChallenge('stack', 1);
  addChallenge('score', gained);

  spawnActiveBlock();
  updateHud();
  updateChallengeUi();
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.08;
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

  const margin = 10;
  active.x += active.dir * active.speed * dt * 60;

  if (active.x <= margin) {
    active.x = margin;
    active.dir = 1;
  }

  if (active.x + active.w >= W - margin) {
    active.x = W - margin - active.w;
    active.dir = -1;
  }

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  if (flash > 0) flash -= 1;
  updateHud();
}

function render(dt) {
  const highest = topBlock().y;
  const cameraY = Math.min(0, highest - H * 0.56);

  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake = Math.max(0, shake - dt * 34);
  }

  ctx.fillStyle = '#0b1225';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 36; i += 1) {
    const x = (i * 79) % W;
    const y = (i * 41 + tick * 0.8) % H;
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

    ctx.fillStyle = '#dcecff';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    const label = active.type === 'bonus' ? 'BONUS' : active.type === 'fragile' ? 'FRAGILE' : active.type === 'speed' ? 'SPEED' : 'NORMAL';
    ctx.fillText(label, W - 14, 30);
  }

  for (const p of particles) {
    const y = p.y - cameraY;
    if (y < -8 || y > H + 8) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 38);
    ctx.fillRect(p.x, y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 145, 190, ${0.04 + flash / 220})`;
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
    ctx.fillText(state === 'idle' ? 'Tap to Stack' : 'Tower Collapsed', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('탭/Space로 블록을 떨어뜨리세요', W / 2, H / 2 + 18);
    ctx.fillText('완벽 적층 + 특수 블록으로 점수 가속', W / 2, H / 2 + 42);
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

function onPrimaryAction() {
  dropBlock();
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
