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
const BEST_KEY = 'zigzag-rush-best-v3';
const SOUND_KEY = 'zigzag-rush-sound-v3';

const BASE_PATH_WIDTH = 62;
const PLAYER_RADIUS = 11;
const BASE_SPEED = 2.9;
const VIEW_ANCHOR_Y = H * 0.7;

let state = 'idle'; // idle | running | paused | gameover
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let combo = 0;
let comboTimer = 0;
let shield = 1;
let checkpoint = 0;
let moveDir = 1;
let speed = BASE_SPEED;
let tick = 0;
let shake = 0;
let flash = 0;
let cornersPassed = 0;
let bonusCount = 0;

let challenge = {
  type: 'score',
  target: 80,
  progress: 0,
  label: '점수 달성',
  done: false,
};

const player = {
  x: W / 2,
  y: 0,
};

const segments = [];
const particles = [];

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
    turn() {
      tone({ freq: 520, end: 740, dur: 0.06, gain: 0.02 });
    },
    bonus() {
      tone({ freq: 640, end: 1080, dur: 0.1, gain: 0.04 });
    },
    checkpoint() {
      tone({ freq: 430, end: 960, dur: 0.13, gain: 0.05, type: 'triangle' });
    },
    shield() {
      tone({ freq: 360, end: 780, dur: 0.12, gain: 0.05, type: 'triangle' });
    },
    crash() {
      tone({ freq: 190, end: 80, dur: 0.2, gain: 0.07, type: 'sawtooth' });
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
      life: 20 + Math.random() * 24,
      color,
    });
  }
  if (particles.length > 240) particles.splice(0, particles.length - 240);
}

function setChallenge() {
  const pool = [
    { type: 'score', target: 80 + level * 12, label: '점수 달성' },
    { type: 'bonus', target: 5 + Math.floor(level * 0.5), label: '보너스 노드' },
    { type: 'corners', target: 12 + Math.floor(level * 0.8), label: '코너 통과' },
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
    flash = Math.max(flash, 12);
    addBurst(player.x, player.y, '#9dffbe', 18, 4.5);
    sfx.checkpoint();
    setTimeout(() => {
      if (state === 'running') setChallenge();
    }, 700);
  }
  updateChallengeUi();
}

function makeSegment(x, y, dir, length, levelNow) {
  let kind = 'normal';
  const roll = Math.random();
  if (roll < Math.min(0.22, 0.12 + levelNow * 0.01)) kind = 'bonus';
  else if (roll > 0.9) kind = 'risk';

  const width = kind === 'risk' ? BASE_PATH_WIDTH - 10 : kind === 'bonus' ? BASE_PATH_WIDTH + 4 : BASE_PATH_WIDTH;

  return {
    xStart: x,
    startY: y,
    dir,
    length,
    endY: y - length,
    kind,
    width,
    passed: false,
  };
}

function buildInitialPath() {
  segments.length = 0;
  let x = W / 2;
  let y = 80;
  let dir = 1;

  for (let i = 0; i < 34; i += 1) {
    const margin = 64;
    const maxToEdge = dir === 1 ? W - margin - x : x - margin;
    const maxLen = Math.max(84, Math.min(220, maxToEdge));
    const minLen = Math.min(130, maxLen);
    const length = rand(minLen, maxLen);

    const seg = makeSegment(x, y, dir, length, level);
    segments.push(seg);

    x += dir * length;
    y -= length;
    dir *= -1;
  }
}

function extendPathIfNeeded() {
  while (segments[segments.length - 1].endY > player.y - 2400) {
    const prev = segments[segments.length - 1];
    const x = prev.xStart + prev.dir * prev.length;
    const y = prev.endY;
    let dir = -prev.dir;

    const margin = 64;
    const maxToEdge = dir === 1 ? W - margin - x : x - margin;
    if (maxToEdge < 88) dir *= -1;

    const fixedMax = dir === 1 ? W - margin - x : x - margin;
    const maxLen = Math.max(84, Math.min(220, fixedMax));
    const minLen = Math.min(130, maxLen);
    const length = rand(minLen, maxLen);

    segments.push(makeSegment(x, y, dir, length, level));
  }
}

function segmentAt(y) {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    if (y <= seg.startY && y >= seg.endY) return seg;
  }
  return null;
}

function pathCenterX(seg, y) {
  return seg.xStart + seg.dir * (seg.startY - y);
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);
  comboEl.textContent = `x${(1 + Math.min(1.6, combo / 4)).toFixed(1)}`;
  shieldEl.textContent = String(shield);
  checkpointEl.textContent = String(checkpoint);
}

function resetGame() {
  state = 'idle';
  score = 0;
  level = 1;
  combo = 0;
  comboTimer = 0;
  shield = 1;
  checkpoint = 0;
  moveDir = 1;
  speed = BASE_SPEED;
  tick = 0;
  shake = 0;
  flash = 0;
  cornersPassed = 0;
  bonusCount = 0;
  particles.length = 0;

  buildInitialPath();

  const first = segments[0];
  player.y = first.startY - 20;
  player.x = pathCenterX(first, player.y);

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
  shake = 12;
  flash = 18;
  addBurst(player.x, player.y, '#ff7b74', 24, 6);
  sfx.crash();

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(BEST_KEY, String(best));
}

function switchDirection() {
  moveDir *= -1;
  addBurst(player.x, player.y, '#7de3ff', 8, 4.2);
  sfx.turn();
}

function absorbCrash(seg) {
  if (shield <= 0) {
    endGame();
    return;
  }

  shield -= 1;
  combo = 0;
  comboTimer = 0;
  flash = Math.max(flash, 16);
  shake = Math.max(shake, 9);
  player.x = pathCenterX(seg, player.y);
  moveDir = seg.dir;
  addBurst(player.x, player.y, '#9dffbe', 18, 5);
  sfx.shield();
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.04;
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

  speed = BASE_SPEED + (level - 1) * 0.2;
  const velocity = speed * 60 * dt;

  player.x += moveDir * velocity;
  player.y -= velocity;

  extendPathIfNeeded();

  const seg = segmentAt(player.y);
  if (!seg) {
    endGame();
    return;
  }

  const centerX = pathCenterX(seg, player.y);
  const tolerance = seg.width * 0.5 - PLAYER_RADIUS * 0.35;
  if (Math.abs(player.x - centerX) > tolerance) {
    absorbCrash(seg);
  }

  for (const s of segments) {
    if (s.passed || player.y > s.endY) continue;
    s.passed = true;
    cornersPassed += 1;
    combo += 1;
    comboTimer = 2.2;

    if (s.kind === 'bonus') {
      bonusCount += 1;
      score += 26 + level * 3;
      addChallenge('bonus', 1);
      addBurst(s.xStart + s.dir * s.length, s.endY, '#ffe08a', 14, 4.8);
      sfx.bonus();
      if (bonusCount % 4 === 0) shield = Math.min(3, shield + 1);
    } else if (s.kind === 'risk') {
      score += 18;
      addBurst(s.xStart + s.dir * s.length, s.endY, '#ff9ac3', 10, 3.8);
      sfx.turn();
    } else {
      score += 8;
    }

    addChallenge('corners', 1);
  }

  const distanceScore = Math.floor((segments[0].startY - player.y) / 9);
  score = Math.max(score, distanceScore + Math.floor(combo * 1.4));

  level = clamp(1 + Math.floor(score / 160), 1, 12);

  const nextCheckpoint = Math.floor(score / 120) * 120;
  if (nextCheckpoint > checkpoint) {
    checkpoint = nextCheckpoint;
    shield = Math.min(3, shield + 1);
    flash = Math.max(flash, 12);
    shake = Math.max(shake, 6);
    addBurst(player.x, player.y, '#9dffbe', 18, 4.6);
    sfx.checkpoint();
  }

  addChallenge('score', distanceScore);

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  updateHud();
  updateChallengeUi();

  if (flash > 0) flash -= 1;
}

function segmentColor(seg) {
  if (seg.kind === 'bonus') return '#ffe08a';
  if (seg.kind === 'risk') return '#ff9ac3';
  return '#6bf0ff';
}

function renderPath(cameraY) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const seg of segments) {
    const x1 = seg.xStart;
    const y1 = seg.startY - cameraY;
    const x2 = seg.xStart + seg.dir * seg.length;
    const y2 = seg.endY - cameraY;

    if ((y1 < -80 && y2 < -80) || (y1 > H + 80 && y2 > H + 80)) continue;

    ctx.strokeStyle = '#203456';
    ctx.lineWidth = seg.width + 9;
    ctx.shadowColor = '#203456';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = segmentColor(seg);
    ctx.lineWidth = seg.width;
    ctx.shadowColor = segmentColor(seg);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (!seg.passed) {
      const cx = x2;
      const cy = y2;
      if (cy > -40 && cy < H + 40) {
        ctx.fillStyle = seg.kind === 'bonus' ? '#ffe08a' : seg.kind === 'risk' ? '#ff9ac3' : '#d2ecff';
        ctx.beginPath();
        ctx.arc(cx, cy, seg.kind === 'bonus' ? 5.5 : 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function renderOverlay() {
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 140, 188, ${0.04 + flash / 220})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state === 'paused') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText('일시정지', W / 2, H / 2 - 10);
    ctx.font = '16px system-ui';
    ctx.fillText('P 또는 일시정지 버튼으로 재개', W / 2, H / 2 + 20);
  }

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Game Over', W / 2, H / 2 - 14);

    ctx.font = '16px system-ui';
    ctx.fillText('탭/Space로 방향 전환', W / 2, H / 2 + 18);
    ctx.fillText('보너스 노드 + 체크포인트 보상으로 점수 가속', W / 2, H / 2 + 42);
  }
}

function render(dt) {
  const cameraY = player.y - VIEW_ANCHOR_Y;

  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake = Math.max(0, shake - dt * 36);
  }

  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 44; i += 1) {
    const x = (i * 91) % W;
    const y = (i * 43 + tick * 1.4) % H;
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

  ctx.fillStyle = 'rgba(8, 14, 30, 0.35)';
  ctx.fillRect(10, 10, 240, 46);
  ctx.fillStyle = '#d3e7ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`속도 ${speed.toFixed(1)} · 레벨 ${level}`, 16, 30);
  ctx.fillText(`코너 ${cornersPassed} · 보너스 ${bonusCount}`, 16, 46);

  renderOverlay();
  ctx.restore();
}

function togglePause() {
  if (state === 'gameover' || state === 'idle') return;
  state = state === 'running' ? 'paused' : 'running';
}

function onPrimaryAction() {
  if (state !== 'running') {
    startGame();
    return;
  }
  switchDirection();
}

let lastTs = 0;
function frame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.033, (ts - lastTs) / 1000);
  lastTs = ts;

  update(dt);
  render(dt);
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') {
    event.preventDefault();
    onPrimaryAction();
  }

  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    event.preventDefault();
    if (state !== 'running') startGame();
    moveDir = -1;
  }

  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
    event.preventDefault();
    if (state !== 'running') startGame();
    moveDir = 1;
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
requestAnimationFrame(frame);
