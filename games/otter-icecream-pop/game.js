const toss = window.OtterIcecreamPopToss || {
  isAvailable: () => false,
  closeView: async () => false,
  setDeviceOrientation: async () => false,
  setIosSwipeGestureEnabled: async () => false,
  getUserKeyForGame: async () => null,
  safeArea: {
    get: async () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    subscribe: () => () => {},
  },
  events: {
    onBack: () => () => {},
    onHome: () => () => {},
  },
  storage: {
    getItem: async (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        // Ignore preview storage failures.
      }
    },
    removeItem: async (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        // Ignore preview storage failures.
      }
    },
  },
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageEl = document.getElementById('stage');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const comboEl = document.getElementById('combo');
const timeLeftEl = document.getElementById('timeLeft');
const statusLineEl = document.getElementById('statusLine');
const userKeyHintEl = document.getElementById('userKeyHint');
const bridgeBadgeEl = document.getElementById('bridgeBadge');

const btnExit = document.getElementById('btnExit');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const exitModal = document.getElementById('exitModal');

const W = canvas.width;
const H = canvas.height;
const STORAGE_PREFIX = 'otter-icecream-pop';
const ROUND_SECONDS = 45;
const MOUTH_X = W * 0.5;
const MOUTH_Y = 578;
const POP_START_Y = 110;
const POP_END_Y = 570;
const HIT_RADIUS = 78;
const PERFECT_RADIUS = 34;

const FLAVORS = [
  { id: 'berry', label: '딸기', fill: '#ff8bb3', highlight: '#ffd7e5', stick: '#d99a6d' },
  { id: 'mint', label: '민트', fill: '#9ff2d4', highlight: '#e5fff3', stick: '#d99a6d' },
  { id: 'lemon', label: '레몬', fill: '#ffe07f', highlight: '#fff5bf', stick: '#d99a6d' },
  { id: 'blue', label: '블루', fill: '#8ad7ff', highlight: '#d8f3ff', stick: '#d99a6d' },
];

const AUDIO_PATHS = {
  tap: './assets/audio/tap.mp3',
  catch: './assets/audio/catch.mp3',
  perfect: './assets/audio/perfect.mp3',
  miss: './assets/audio/miss.mp3',
  finish: './assets/audio/finish.mp3',
};

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextCtor ? new AudioContextCtor() : null;
const audioState = { ready: false, clips: {} };

let state = 'running';
let score = 0;
let best = Number(safeLocalStorageGet(`${STORAGE_PREFIX}:browser:best`) || 0);
let combo = 0;
let timeLeft = ROUND_SECONDS;
let userKey = null;
let scopeKey = `${STORAGE_PREFIX}:browser`;
let currentPop = null;
let floaters = [];
let particles = [];
let skySparkles = [];
let shake = 0;
let pulse = 0;
let lastFrameAt = performance.now();
let frame = 0;
let exitSheetOpen = false;
let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

bestEl.textContent = String(best);
comboEl.textContent = String(combo);
timeLeftEl.textContent = String(Math.ceil(timeLeft));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function formatTime(seconds) {
  return String(Math.max(0, Math.ceil(seconds)));
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore preview storage failures.
  }
}

function getScopedKey(name) {
  return `${scopeKey}:${name}`;
}

function setStatus(message) {
  statusLineEl.textContent = message;
}

function setUserKeyHint(message) {
  userKeyHintEl.textContent = message;
}

function setBridgeBadge() {
  if (toss.isAvailable()) {
    bridgeBadgeEl.textContent = '토스 연결';
    bridgeBadgeEl.classList.remove('badge-preview', 'badge-fallback');
    bridgeBadgeEl.classList.add('badge-live');
    return;
  }

  bridgeBadgeEl.textContent = '웹 미리보기';
  bridgeBadgeEl.classList.remove('badge-live', 'badge-fallback');
  bridgeBadgeEl.classList.add('badge-preview');
}

function applySafeAreaInsets(insets) {
  if (!insets) return;

  document.documentElement.style.setProperty('--safe-top', `${Math.max(0, Number(insets.top || 0))}px`);
  document.documentElement.style.setProperty('--safe-right', `${Math.max(0, Number(insets.right || 0))}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${Math.max(0, Number(insets.bottom || 0))}px`);
  document.documentElement.style.setProperty('--safe-left', `${Math.max(0, Number(insets.left || 0))}px`);
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  comboEl.textContent = String(combo);
  timeLeftEl.textContent = formatTime(timeLeft);
}

function addFloater(x, y, text, color) {
  floaters.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 16,
    vy: -28 - Math.random() * 18,
    life: 1,
    text,
    color,
  });
}

function addBurst(x, y, color) {
  for (let index = 0; index < 8; index += 1) {
    particles.push({
      x,
      y,
      vx: Math.cos((index / 8) * Math.PI * 2) * (28 + Math.random() * 36),
      vy: Math.sin((index / 8) * Math.PI * 2) * (28 + Math.random() * 36),
      life: 0.55 + Math.random() * 0.4,
      color,
      size: 3 + Math.random() * 2,
    });
  }
}

function ensureAudio() {
  if (audioState.ready) return;

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  for (const [name, path] of Object.entries(AUDIO_PATHS)) {
    const clip = new Audio(path);
    clip.preload = 'auto';
    clip.volume = name === 'finish' ? 0.45 : 0.7;
    clip.setAttribute('playsinline', '');
    audioState.clips[name] = clip;
  }

  audioState.ready = true;
}

function tone(freq, duration, gain = 0.02, type = 'triangle', freq2 = null) {
  if (!audioCtx || document.hidden) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freq2 !== null) {
    osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
  }
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function fallbackSfx(kind) {
  if (kind === 'catch') {
    tone(640, 0.08, 0.03, 'triangle', 840);
    return;
  }

  if (kind === 'perfect') {
    tone(780, 0.06, 0.028, 'triangle', 1160);
    tone(980, 0.08, 0.018, 'sine', 1320);
    return;
  }

  if (kind === 'miss') {
    tone(220, 0.12, 0.03, 'sawtooth', 160);
    return;
  }

  if (kind === 'finish') {
    tone(420, 0.08, 0.024, 'square', 260);
    tone(260, 0.16, 0.02, 'triangle', 180);
    return;
  }

  tone(520, 0.04, 0.014, 'sine');
}

function playSfx(kind) {
  const clip = audioState.clips[kind];
  if (!clip) {
    fallbackSfx(kind);
    return;
  }

  const node = clip.cloneNode();
  node.volume = clip.volume;
  node.play().catch(() => fallbackSfx(kind));
}

function spawnPop() {
  const flavor = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];
  const fromLeft = Math.random() < 0.5;
  const horizontalSpan = 34 + Math.random() * 54;
  const travelTime = Math.max(1.2, 2.2 - combo * 0.03);

  currentPop = {
    flavor,
    progress: 0,
    travelTime,
    swaySeed: Math.random() * Math.PI * 2,
    swaySpan: fromLeft ? horizontalSpan : -horizontalSpan,
    caught: false,
    rotation: (Math.random() - 0.5) * 0.25,
    stickTilt: (Math.random() - 0.5) * 0.15,
  };
}

function resetGame() {
  state = 'running';
  score = 0;
  combo = 0;
  timeLeft = ROUND_SECONDS;
  shake = 0;
  pulse = 0;
  floaters = [];
  particles = [];
  skySparkles = Array.from({ length: 12 }, (_, index) => ({
    x: (index * 97) % W,
    y: 60 + ((index * 61) % 180),
    r: 1.6 + (index % 3) * 0.6,
    speed: 8 + (index % 4) * 3,
  }));
  updateHud();
  setStatus('하이라이트에 맞춰 탭하면 수달이 바로 받아 먹습니다.');
  spawnPop();
}

function saveBestScore() {
  const nextBest = Math.max(best, score);
  best = nextBest;
  safeLocalStorageSet(getScopedKey('best'), String(nextBest));
  bestEl.textContent = String(best);
}

function getPopPosition(pop) {
  const p = clamp(pop.progress, 0, 1);
  const eased = easeOutCubic(p);
  const x = MOUTH_X + Math.sin(p * Math.PI * 2.25 + pop.swaySeed) * pop.swaySpan;
  const y = lerp(POP_START_Y, POP_END_Y, eased);
  const wobble = Math.sin((frame * 0.04) + pop.swaySeed) * 0.03;
  return { x, y, wobble };
}

function hitWindow(pop) {
  if (!pop || pop.caught) return null;

  const pos = getPopPosition(pop);
  const dx = pos.x - MOUTH_X;
  const dy = pos.y - MOUTH_Y;
  const distance = Math.hypot(dx, dy);
  const accuracy = 1 - clamp(distance / HIT_RADIUS, 0, 1);

  if (distance > HIT_RADIUS) {
    return null;
  }

  return {
    ...pos,
    distance,
    accuracy,
    flavor: pop.flavor,
  };
}

function handleCatch(hit) {
  const perfect = hit.accuracy >= 0.78;
  const great = hit.accuracy >= 0.48;
  const comboBonus = Math.min(12, combo);
  const points = 10 + Math.round(hit.accuracy * 12) + comboBonus;

  score += points;
  combo += 1;
  timeLeft = Math.min(ROUND_SECONDS, timeLeft + (perfect ? 0.95 : great ? 0.55 : 0.25));
  pulse = 1;
  shake = perfect ? 0 : 2;

  addFloater(hit.x, hit.y - 18, perfect ? `완벽 +${points}` : `+${points}`, perfect ? '#0e7c5f' : '#0c4d73');
  addBurst(hit.x, hit.y, hit.flavor.fill);
  saveBestScore();
  updateHud();

  if (perfect) {
    setStatus(`완벽! ${hit.flavor.label} 아이스팝을 번쩍 받아냈습니다.`);
    playSfx('perfect');
  } else {
    setStatus(`${hit.flavor.label} 아이스팝 냠! 콤보 ${combo}개.`);
    playSfx('catch');
  }

  spawnPop();
}

function handleMiss() {
  combo = 0;
  timeLeft = Math.max(0, timeLeft - 1.35);
  shake = 6;
  pulse = 0.6;
  addFloater(MOUTH_X, MOUTH_Y - 6, '-1.35s', '#d94c5e');
  setStatus('놓쳤습니다. 다음 팝을 바로 노려보세요.');
  playSfx('miss');
  updateHud();
  spawnPop();

  if (timeLeft <= 0) {
    endGame();
  }
}

function endGame() {
  state = 'gameover';
  saveBestScore();
  playSfx('finish');
  setStatus('아이스가 녹았습니다. 다시 탭하면 즉시 재시작합니다.');
}

function tapGame() {
  if (exitSheetOpen) return;

  ensureAudio();

  if (state === 'gameover') {
    resetGame();
    return;
  }

  if (state !== 'running') return;

  const hit = hitWindow(currentPop);
  if (hit) {
    currentPop.caught = true;
    handleCatch(hit);
    return;
  }

  handleMiss();
}

function openExitSheet() {
  exitSheetOpen = true;
  exitModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeExitSheet() {
  exitSheetOpen = false;
  exitModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

async function confirmExit() {
  const closed = await toss.closeView();
  if (!closed) {
    setStatus('미리보기에서는 종료 호출만 시도했습니다.');
  }
  closeExitSheet();
}

function drawBackground(dt) {
  ctx.save();
  ctx.fillStyle = '#dff7ff';
  ctx.fillRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#f6feff');
  sky.addColorStop(0.5, '#c0eff9');
  sky.addColorStop(1, '#7ac9ea');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  for (let i = 0; i < 10; i += 1) {
    const x = (i * 83 + frame * 0.3) % (W + 120) - 60;
    const y = 40 + (i % 4) * 22;
    ctx.beginPath();
    ctx.ellipse(x, y, 28 + (i % 3) * 10, 12 + (i % 2) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const sparkle of skySparkles) {
    sparkle.y += sparkle.speed * dt;
    if (sparkle.y > 240) {
      sparkle.y = -20;
      sparkle.x = Math.random() * W;
    }
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, sparkle.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const water = ctx.createLinearGradient(0, H * 0.55, 0, H);
  water.addColorStop(0, 'rgba(255,255,255,0.14)');
  water.addColorStop(1, 'rgba(50,154,193,0.2)');
  ctx.fillStyle = water;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);
  ctx.restore();
}

function drawPlatform() {
  ctx.save();
  ctx.translate(MOUTH_X, MOUTH_Y + 18);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fefefe';
  ctx.beginPath();
  ctx.roundRect(-154, -14, 308, 42, 20);
  ctx.fill();

  ctx.fillStyle = '#9ad6ec';
  ctx.fillRect(-118, 8, 236, 8);
  ctx.restore();
}

function drawOtter() {
  ctx.save();
  ctx.translate(MOUTH_X, 650);
  ctx.shadowColor = 'rgba(66, 94, 117, 0.18)';
  ctx.shadowBlur = 18;

  ctx.fillStyle = '#a86a3e';
  ctx.beginPath();
  ctx.ellipse(0, 18, 92, 74, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8ddbc';
  ctx.beginPath();
  ctx.ellipse(0, 0, 70, 58, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a86a3e';
  ctx.beginPath();
  ctx.ellipse(-54, -46, 24, 22, -0.32, 0, Math.PI * 2);
  ctx.ellipse(54, -46, 24, 22, 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4c9a4';
  ctx.beginPath();
  ctx.ellipse(-54, -46, 12, 11, 0, 0, Math.PI * 2);
  ctx.ellipse(54, -46, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#3d4252';
  ctx.beginPath();
  ctx.arc(-18, -6, 5, 0, Math.PI * 2);
  ctx.arc(18, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8e5a33';
  ctx.beginPath();
  ctx.arc(0, 7, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#6f4b32';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 13, 16, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.fillStyle = '#ffb9cd';
  ctx.beginPath();
  ctx.arc(-31, 14, 11, 0, Math.PI * 2);
  ctx.arc(31, 14, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f7f1ea';
  ctx.beginPath();
  ctx.ellipse(-42, 60, 28, 18, -0.25, 0, Math.PI * 2);
  ctx.ellipse(42, 60, 28, 18, 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b17b4c';
  ctx.beginPath();
  ctx.ellipse(-62, 44, 18, 20, -0.5, 0, Math.PI * 2);
  ctx.ellipse(62, 44, 18, 20, 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCatchZone() {
  const progress = clamp(currentPop?.progress || 0, 0, 1);
  const glow = 0.3 + Math.sin((frame * 0.07) + pulse * Math.PI) * 0.08;
  const size = 70 + Math.max(0, 1 - progress) * 26;

  ctx.save();
  ctx.translate(MOUTH_X, MOUTH_Y);
  ctx.globalAlpha = glow;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#fffdf9';
  ctx.beginPath();
  ctx.arc(0, 0, size - 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPop() {
  if (!currentPop) return;

  const pos = getPopPosition(currentPop);
  const flavor = currentPop.flavor;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(pos.wobble + currentPop.rotation);

  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.ellipse(2, 8, 38, 70, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = flavor.fill;
  ctx.shadowColor = flavor.fill;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(-30, -66, 60, 132, 28);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = flavor.highlight;
  ctx.beginPath();
  ctx.roundRect(-22, -54, 16, 94, 10);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(-12, -24, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = flavor.stick;
  ctx.beginPath();
  ctx.roundRect(-8, 56, 16, 40, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -38);
  ctx.lineTo(16, -38);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 12px Pretendard, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flavor.label, 0, -90);

  ctx.restore();
}

function drawParticles(dt) {
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    particle.life -= dt;
  }

  for (let index = particles.length - 1; index >= 0; index -= 1) {
    if (particles[index].life <= 0) {
      particles.splice(index, 1);
    }
  }

  ctx.save();
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / 0.9, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters(dt) {
  for (const floater of floaters) {
    floater.x += floater.vx * dt;
    floater.y += floater.vy * dt;
    floater.life -= dt * 0.7;
  }

  for (let index = floaters.length - 1; index >= 0; index -= 1) {
    if (floaters[index].life <= 0) {
      floaters.splice(index, 1);
    }
  }

  ctx.save();
  ctx.font = '700 18px Pretendard, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const floater of floaters) {
    ctx.globalAlpha = clamp(floater.life, 0, 1);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.restore();
}

function updatePop(dt) {
  if (!currentPop || state !== 'running') return;

  currentPop.progress += dt / currentPop.travelTime;
  if (currentPop.progress >= 1.02) {
    handleMiss();
  }
}

function updateGame(dt) {
  frame += 1;
  pulse = Math.max(0, pulse - dt * 1.5);
  shake = Math.max(0, shake - dt * 8);

  if (state === 'running') {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHud();
      endGame();
      return;
    }
    updatePop(dt);
    updateHud();
  }

  if (state === 'gameover') {
    updateHud();
  }
}

function render(dt) {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  drawBackground(dt);
  drawCatchZone();
  drawPlatform();
  drawPop();
  drawOtter();
  drawParticles(dt);
  drawFloaters(dt);

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#08324d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 34px Pretendard, sans-serif';
    ctx.fillText('한 판 종료', W * 0.5, H * 0.38);
    ctx.font = '700 18px Pretendard, sans-serif';
    ctx.fillText('다시 탭하면 바로 재시작합니다.', W * 0.5, H * 0.44);
  }

  ctx.restore();
}

function frameLoop(now) {
  const dt = Math.min(0.032, (now - lastFrameAt) / 1000 || 0);
  lastFrameAt = now;
  updateGame(dt);
  render(dt);
  requestAnimationFrame(frameLoop);
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('button, a, [role="dialog"], input, textarea, select'));
}

function onPointerDown(event) {
  ensureAudio();

  if (exitSheetOpen) {
    if (!event.target.closest?.('#exitModal .sheet-card')) {
      closeExitSheet();
    }
    return;
  }

  if (isInteractiveTarget(event.target)) {
    return;
  }

  tapGame();
}

async function initBridge() {
  setBridgeBadge();

  try {
    await toss.setDeviceOrientation('portrait');
  } catch (error) {
    // Ignore preview bridge failures.
  }

  try {
    await toss.setIosSwipeGestureEnabled(false);
  } catch (error) {
    // Ignore preview bridge failures.
  }

  try {
    const insets = await toss.safeArea.get();
    applySafeAreaInsets(insets);
  } catch (error) {
    // Ignore preview bridge failures.
  }

  unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
    applySafeAreaInsets(insets);
  });

  unsubscribeBack = toss.events.onBack(() => {
    openExitSheet();
  });

  unsubscribeHome = toss.events.onHome(() => {
    openExitSheet();
  });

  try {
    const result = await toss.getUserKeyForGame();
    userKey = result || null;
    scopeKey = userKey ? `${STORAGE_PREFIX}:user:${userKey}` : `${STORAGE_PREFIX}:browser`;

    const storedBest = Number((await toss.storage.getItem(getScopedKey('best'))) || 0);
    if (Number.isFinite(storedBest) && storedBest > best) {
      best = storedBest;
      bestEl.textContent = String(best);
    }

    if (userKey) {
      setUserKeyHint('토스 계정에 최고 점수를 저장합니다.');
    } else {
      setUserKeyHint('브라우저 미리보기는 로컬 저장소를 사용합니다.');
    }
  } catch (error) {
    setUserKeyHint('브리지 연결이 없어 로컬 저장소만 사용합니다.');
  }
}

function attachEvents() {
  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  btnExit.addEventListener('click', openExitSheet);
  btnCancelExit.addEventListener('click', closeExitSheet);
  btnConfirmExit.addEventListener('click', confirmExit);
  window.addEventListener('blur', () => {
    if (state === 'running') {
      saveBestScore();
    }
  });
}

async function boot() {
  setStatus('하이라이트에 맞춰 탭하면 수달이 바로 받아 먹습니다.');
  setUserKeyHint('토스 계정 연결 상태를 확인하는 중입니다.');
  setBridgeBadge();
  attachEvents();
  await initBridge();
  spawnPop();
  updateHud();
  requestAnimationFrame(frameLoop);
}

boot();
