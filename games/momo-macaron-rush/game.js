const toss = window.MomoMacaronRushToss || {
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

const STORAGE_PREFIX = 'momo-macaron-rush';
const ROUND_SECONDS = 45;
const START_LIVES = 3;
const LANES = [W * 0.34, W * 0.66];
const CATCH_Y = H - 166;
const PLAYER_Y = H - 106;

const FLAVORS = [
  { id: 'strawberry', label: '딸기', short: '딸', shell: '#ff88b4', cream: '#ffe8f0', glow: 'rgba(255, 136, 180, 0.18)' },
  { id: 'mint', label: '민트', short: '민', shell: '#8fe0c7', cream: '#e6fff6', glow: 'rgba(143, 224, 199, 0.18)' },
  { id: 'lemon', label: '레몬', short: '레', shell: '#ffd77f', cream: '#fff4cf', glow: 'rgba(255, 215, 127, 0.2)' },
];

const AUDIO_PATHS = {
  start: './assets/audio/momo-macaron-rush-start.mp3',
  collect: './assets/audio/momo-macaron-rush-collect.mp3',
  miss: './assets/audio/momo-macaron-rush-miss.mp3',
  tick: './assets/audio/momo-macaron-rush-tick.mp3',
};

const audioCtx = window.AudioContext ? new AudioContext() : null;
const audioState = {
  ready: false,
  clips: {},
};

let state = 'running';
let pauseReason = null;
let gameOverReason = 'time';

let score = 0;
let best = 0;
let timeLeft = ROUND_SECONDS;
let lives = START_LIVES;
let combo = 0;
let playerLane = 0;
let craving = 0;
let userHash = null;

let items = [];
let particles = [];
let nextItemId = 1;
let spawnTimer = 0.55;
let spawnBase = 1.05;
let tick = 0;
let lastFrameAt = performance.now();
let statusMessage = '화면을 탭하면 모모가 반대로 점프합니다.';

let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

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

function getScopedStorageKey(name) {
  const scope = userHash ? `user:${userHash}` : 'browser';
  return `${STORAGE_PREFIX}:${scope}:${name}`;
}

function isHidden(element) {
  return element?.classList.contains('hidden');
}

function isRoundActive() {
  return state === 'running' && !pauseReason;
}

function applySafeAreaInsets(insets) {
  if (!insets) {
    document.documentElement.style.removeProperty('--safe-top');
    document.documentElement.style.removeProperty('--safe-right');
    document.documentElement.style.removeProperty('--safe-bottom');
    document.documentElement.style.removeProperty('--safe-left');
    return;
  }

  document.documentElement.style.setProperty('--safe-top', `${Math.max(0, Number(insets.top || 0))}px`);
  document.documentElement.style.setProperty('--safe-right', `${Math.max(0, Number(insets.right || 0))}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${Math.max(0, Number(insets.bottom || 0))}px`);
  document.documentElement.style.setProperty('--safe-left', `${Math.max(0, Number(insets.left || 0))}px`);
}

function resizeStage() {
  if (!stageEl) return;

  const bounds = stageEl.getBoundingClientRect();
  const padding = 24;
  const availableWidth = Math.max(160, bounds.width - padding);
  const availableHeight = Math.max(280, bounds.height - padding);
  const ratio = W / H;

  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

function randomFlavor(except = -1) {
  const choices = FLAVORS.map((_, index) => index).filter((index) => index !== except);
  return choices[Math.floor(Math.random() * choices.length)];
}

function randomLane() {
  return Math.random() < 0.5 ? 0 : 1;
}

function randomSeed() {
  return Math.random() * Math.PI * 2;
}

function updateBridgeBadge(text, className) {
  bridgeBadgeEl.textContent = text;
  bridgeBadgeEl.className = `badge ${className}`;
}

function updateStatus(text = '') {
  if (text) {
    statusMessage = text;
  }

  if (pauseReason === 'background') {
    statusLineEl.textContent = '토스 앱이 백그라운드로 이동했습니다. 돌아오면 이어서 할 수 있어요.';
    return;
  }

  if (pauseReason === 'exit') {
    statusLineEl.textContent = '종료 확인 중입니다.';
    return;
  }

  if (state === 'gameover') {
    if (gameOverReason === 'life') {
      statusLineEl.textContent = '모모가 너무 바빴어요. 탭하면 바로 다시 시작합니다.';
      return;
    }

    statusLineEl.textContent = '시간이 끝났어요. 탭하면 다시 러시를 시작합니다.';
    return;
  }

  statusLineEl.textContent = statusMessage;
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  timeLeftEl.textContent = String(Math.ceil(timeLeft));
  updateStatus();
}

async function persistBest() {
  const value = String(best);
  await toss.storage.setItem(getScopedStorageKey('best'), value);
  safeLocalStorageSet(getScopedStorageKey('best'), value);
}

async function loadBestScore() {
  const scopedBest = Number(await toss.storage.getItem(getScopedStorageKey('best')) || 0);
  const browserBest = Number(safeLocalStorageGet(getScopedStorageKey('best')) || 0);
  best = Math.max(scopedBest, browserBest);

  if (best > 0) {
    void persistBest();
  }

  updateHud();
}

function openExitModal() {
  if (isHidden(exitModal)) {
    exitModal.classList.remove('hidden');
  }
  document.body.classList.add('modal-open');

  if (state === 'running') {
    pauseReason = 'exit';
    updateHud();
  }
}

function closeExitModal() {
  exitModal.classList.add('hidden');
  document.body.classList.remove('modal-open');

  if (pauseReason === 'exit') {
    pauseReason = null;
    updateHud();
  }
}

function fallbackTone(freq, duration, gain = 0.02, type = 'triangle') {
  if (!audioCtx || document.hidden) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const amp = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(amp);
  amp.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function fallbackSfx(kind) {
  if (kind === 'collect') {
    fallbackTone(780, 0.07, 0.03, 'triangle');
    fallbackTone(1040, 0.1, 0.018, 'triangle');
    return;
  }

  if (kind === 'miss') {
    fallbackTone(220, 0.14, 0.03, 'sawtooth');
    return;
  }

  if (kind === 'start') {
    fallbackTone(520, 0.09, 0.025, 'triangle');
    return;
  }

  fallbackTone(420, 0.04, 0.012, 'sine');
}

function unlockAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  if (!audioState.ready) {
    for (const [kind, src] of Object.entries(AUDIO_PATHS)) {
      const clip = new Audio(src);
      clip.preload = 'auto';
      clip.volume = kind === 'miss' ? 0.8 : 0.72;
      clip.setAttribute('playsinline', '');
      audioState.clips[kind] = clip;
    }

    audioState.ready = true;
  }
}

function playSfx(kind) {
  const source = audioState.clips[kind];
  if (!source) {
    fallbackSfx(kind);
    return;
  }

  const clip = source.cloneNode();
  clip.volume = source.volume;
  clip.play().catch(() => {
    fallbackSfx(kind);
  });
}

function resetRound({ withStartSound = false } = {}) {
  state = 'running';
  pauseReason = null;
  gameOverReason = 'time';

  score = 0;
  timeLeft = ROUND_SECONDS;
  lives = START_LIVES;
  combo = 0;
  playerLane = 0;
  craving = randomFlavor(-1);
  items = [];
  particles = [];
  nextItemId = 1;
  spawnTimer = 0.45;
  spawnBase = 1.08;

  statusMessage = '탭 한 번으로 모모를 옮겨 같은 맛 마카롱을 받아내세요.';
  if (withStartSound) {
    playSfx('start');
  }
  updateHud();
}

function endRound(reason) {
  state = 'gameover';
  pauseReason = null;
  gameOverReason = reason;
  items = [];
  spawnTimer = 0;

  if (score > best) {
    best = score;
    void persistBest();
  }

  updateHud();
}

function toggleLane() {
  playerLane = playerLane === 0 ? 1 : 0;
  playSfx('tick');
  if (navigator.vibrate) navigator.vibrate(8);
}

function addParticle(x, y, text, color) {
  particles.push({
    x,
    y,
    vy: -0.7 - Math.random() * 0.5,
    life: 30,
    text,
    color,
  });
}

function spawnItem() {
  const lane = randomLane();
  const flavor = Math.random() < 0.72 ? craving : randomFlavor(craving);
  const progress = Math.min(1, (ROUND_SECONDS - timeLeft) / ROUND_SECONDS);
  const speed = 210 + progress * 125 + Math.random() * 36;

  items.push({
    id: nextItemId,
    lane,
    flavor,
    y: -72,
    speed,
    wobble: randomSeed(),
  });

  nextItemId += 1;
}

function collectItem(item) {
  const flavor = FLAVORS[item.flavor];
  const gain = 1 + Math.floor(combo / 4);
  score += gain;
  combo += 1;

  craving = randomFlavor(craving);
  addParticle(LANES[item.lane], CATCH_Y - 54, `+${gain}`, flavor.shell);
  addParticle(LANES[item.lane] + 16, CATCH_Y - 82, '모모!', '#fff');
  playSfx('collect');

  if (navigator.vibrate) navigator.vibrate(10);

  if (score > best) {
    best = score;
    void persistBest();
  }

  statusMessage = `${flavor.label} 마카롱 성공! 콤보 x${combo}`;
  updateHud();
}

function missItem(item) {
  const flavor = FLAVORS[item.flavor];
  lives -= 1;
  combo = 0;
  addParticle(LANES[item.lane], CATCH_Y - 54, '놓침', '#d3725b');
  playSfx('miss');

  if (navigator.vibrate) navigator.vibrate([24, 18, 24]);

  if (lives <= 0) {
    endRound('life');
    return;
  }

  statusMessage = `${flavor.label}는 놓쳤어요. 모모를 다시 옮겨보세요.`;
  updateHud();
}

function handleCaughtItem(item) {
  if (item.flavor === craving) {
    collectItem(item);
    return;
  }

  missItem(item);
}

function update(dt) {
  tick += 1;

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const fx = particles[i];
    fx.y += fx.vy;
    fx.life -= 1;
    if (fx.life <= 0) {
      particles.splice(i, 1);
    }
  }

  if (!isRoundActive()) {
    return;
  }

  timeLeft = Math.max(0, timeLeft - dt);
  if (timeLeft <= 0) {
    timeLeft = 0;
    endRound('time');
    return;
  }

  const progress = Math.min(1, (ROUND_SECONDS - timeLeft) / ROUND_SECONDS);
  spawnBase = Math.max(0.52, 1.08 - progress * 0.48);
  spawnTimer -= dt;

  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = spawnBase;
  }

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    item.y += item.speed * dt;
    item.wobble += dt * 6;

    if (item.y >= CATCH_Y && item.lane === playerLane) {
      items.splice(i, 1);
      handleCaughtItem(item);
      continue;
    }

    if (item.y > H + 84) {
      items.splice(i, 1);
    }
  }

  updateHud();
}

function drawRoundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawFlavorBadge(x, y, flavorIndex, scale = 1) {
  const flavor = FLAVORS[flavorIndex];

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = flavor.glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = flavor.shell;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = flavor.cream;
  ctx.beginPath();
  ctx.ellipse(0, 6, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(-10, -10, 7, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '700 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flavor.short, 0, 0);
  ctx.restore();
}

function drawPlayer() {
  const x = LANES[playerLane];
  const sway = Math.sin(tick * 0.08) * 2;

  ctx.save();
  ctx.translate(x, PLAYER_Y + sway);

  ctx.fillStyle = 'rgba(255, 187, 151, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 52, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffb28e';
  ctx.beginPath();
  ctx.arc(0, -6, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff4ef';
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a2a1e';
  ctx.beginPath();
  ctx.arc(-10, -4, 3.4, 0, Math.PI * 2);
  ctx.arc(10, -4, 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4a2a1e';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.quadraticCurveTo(0, 14, 8, 8);
  ctx.stroke();

  drawFlavorBadge(0, -34, craving, 0.72);

  ctx.restore();
}

function drawItem(item) {
  const x = LANES[item.lane];
  const bob = Math.sin(item.wobble) * 2;
  const y = item.y + bob;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  drawFlavorBadge(0, 0, item.flavor, 0.88);

  ctx.restore();
}

function drawLane(index) {
  const x = LANES[index];

  ctx.save();
  ctx.strokeStyle = index === playerLane ? 'rgba(255, 142, 115, 0.38)' : 'rgba(74, 42, 30, 0.12)';
  ctx.lineWidth = index === playerLane ? 7 : 4;
  ctx.beginPath();
  ctx.moveTo(x, 66);
  ctx.lineTo(x, H - 82);
  ctx.stroke();

  ctx.fillStyle = index === playerLane ? 'rgba(255, 255, 255, 0.68)' : 'rgba(255, 255, 255, 0.52)';
  ctx.beginPath();
  ctx.roundRect(x - 34, CATCH_Y - 14, 68, 28, 12);
  ctx.fill();

  ctx.fillStyle = 'rgba(74, 42, 30, 0.18)';
  ctx.font = '700 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(index === 0 ? '왼쪽' : '오른쪽', x, CATCH_Y);
  ctx.restore();
}

function drawHeaderChip() {
  const target = FLAVORS[craving];
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.strokeStyle = 'rgba(74, 42, 30, 0.08)';
  ctx.lineWidth = 1;
  drawRoundRect(W * 0.5 - 126, 20, 252, 46, 20);
  ctx.fill();
  ctx.stroke();

  drawFlavorBadge(W * 0.5 - 86, 43, craving, 0.72);

  ctx.fillStyle = '#4a2a1e';
  ctx.font = '700 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`지금 원하는 맛`, W * 0.5 - 28, 43);

  ctx.fillStyle = target.shell;
  ctx.font = '800 17px sans-serif';
  ctx.fillText(target.label, W * 0.5 + 86, 43);
  ctx.restore();
}

function drawBottomHint() {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.strokeStyle = 'rgba(74, 42, 30, 0.08)';
  ctx.lineWidth = 1;
  drawRoundRect(54, H - 66, W - 108, 34, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(74, 42, 30, 0.78)';
  ctx.font = '700 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('탭 = 점프 · 좌우로만 이동 · 같은 맛만 받기', W * 0.5, H - 49);
  ctx.restore();
}

function drawStats() {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
  ctx.strokeStyle = 'rgba(74, 42, 30, 0.08)';
  ctx.lineWidth = 1;
  drawRoundRect(20, 70, 82, 96, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4a2a1e';
  ctx.font = '800 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(lives), 61, 108);

  ctx.font = '700 12px sans-serif';
  ctx.fillStyle = 'rgba(74, 42, 30, 0.6)';
  ctx.fillText('남은 생명', 61, 136);
  ctx.restore();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#fffdf9');
  gradient.addColorStop(0.5, '#fff1e4');
  gradient.addColorStop(1, '#ffd9bf');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 18; i += 1) {
    const x = (i * 83 + tick * 0.5) % W;
    const y = (i * 54 + tick * 0.24) % H;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 178, 142, 0.14)' : 'rgba(143, 224, 199, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
  ctx.beginPath();
  ctx.ellipse(W * 0.18, 154, 74, 32, -0.15, 0, Math.PI * 2);
  ctx.ellipse(W * 0.82, 174, 84, 36, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 216, 188, 0.7)';
  ctx.beginPath();
  ctx.roundRect(0, H - 112, W, 112, 28);
  ctx.fill();
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = 'rgba(56, 31, 16, 0.48)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.fillStyle = 'rgba(255, 252, 248, 0.96)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 1;
  drawRoundRect(34, H * 0.5 - 108, W - 68, 216, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4a2a1e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 30px sans-serif';
  ctx.fillText(title, W * 0.5, H * 0.5 - 34);

  ctx.font = '600 17px sans-serif';
  ctx.fillStyle = 'rgba(74, 42, 30, 0.76)';
  ctx.fillText(subtitle, W * 0.5, H * 0.5 + 6);

  drawFlavorBadge(W * 0.5, H * 0.5 + 54, craving, 0.92);

  ctx.font = '700 14px sans-serif';
  ctx.fillStyle = 'rgba(74, 42, 30, 0.58)';
  ctx.fillText('탭하면 바로 다시 시작합니다', W * 0.5, H * 0.5 + 102);
  ctx.restore();
}

function render() {
  drawBackground();
  drawHeaderChip();

  for (let lane = 0; lane < LANES.length; lane += 1) {
    drawLane(lane);
  }

  for (const item of items) {
    drawItem(item);
  }

  drawPlayer();
  drawStats();
  drawBottomHint();

  for (const fx of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, fx.life / 30);
    ctx.fillStyle = fx.color;
    ctx.font = '800 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.text, fx.x, fx.y);
    ctx.restore();
  }

  if (state === 'gameover') {
    drawOverlay('모모가 쉬어요', gameOverReason === 'life' ? '마카롱을 더 받아내지 못했어요' : '시간 종료');
  } else if (pauseReason === 'background') {
    drawOverlay('일시정지', '토스 앱으로 돌아오면 이어서 플레이할 수 있어요');
  } else if (pauseReason === 'exit') {
    drawOverlay('종료 확인', '진짜로 나가려면 아래 버튼을 눌러주세요');
  }
}

function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;

  update(dt);
  render();
  window.requestAnimationFrame(loop);
}

async function leaveGame() {
  await toss.setIosSwipeGestureEnabled(true);

  const closedInToss = await toss.closeView();
  if (closedInToss !== false) {
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = new URL('../', window.location.href).toString();
}

function handleBackRequest() {
  if (!isHidden(exitModal)) {
    closeExitModal();
    return;
  }

  openExitModal();
}

function handleHomeRequest() {
  if (state === 'running' && !pauseReason) {
    pauseReason = 'background';
    updateHud();
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    handleHomeRequest();
    return;
  }

  if (pauseReason === 'background') {
    pauseReason = null;
    updateHud();
  }
}

function handleCanvasPointer() {
  unlockAudio();

  if (pauseReason) {
    return;
  }

  if (state === 'gameover') {
    resetRound({ withStartSound: true });
    return;
  }

  toggleLane();
}

function attachEventListeners() {
  window.addEventListener('resize', resizeStage);
  window.addEventListener('orientationchange', resizeStage);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  window.addEventListener('pagehide', () => {
    handleHomeRequest();
  });

  window.addEventListener('pageshow', () => {
    if (pauseReason === 'background' && !document.hidden) {
      pauseReason = null;
      updateHud();
    }
  });

  canvas.addEventListener('pointerdown', handleCanvasPointer);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleBackRequest();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleCanvasPointer();
      return;
    }

    if (pauseReason || state !== 'running') return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      toggleLane();
    }
  });

  btnExit.addEventListener('click', openExitModal);
  btnCancelExit.addEventListener('click', closeExitModal);
  btnConfirmExit.addEventListener('click', () => {
    void leaveGame();
  });

  exitModal.addEventListener('click', (event) => {
    if (event.target === exitModal) {
      closeExitModal();
    }
  });

  window.addEventListener('beforeunload', () => {
    unsubscribeSafeArea();
    unsubscribeBack();
    unsubscribeHome();
    void toss.setIosSwipeGestureEnabled(true);
  });
}

async function initializeTossBridge() {
  updateBridgeBadge('웹 미리보기', 'badge-preview');
  userKeyHintEl.textContent = '브라우저에서도 같은 화면을 미리 볼 수 있습니다.';

  if (toss.isAvailable()) {
    try {
      applySafeAreaInsets(await toss.safeArea.get());
    } catch (error) {
      applySafeAreaInsets(null);
    }

    unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
      applySafeAreaInsets(insets);
      resizeStage();
    });
  } else {
    applySafeAreaInsets(null);
  }

  await toss.setDeviceOrientation('portrait');
  await toss.setIosSwipeGestureEnabled(false);

  unsubscribeBack = toss.events.onBack(() => {
    handleBackRequest();
  });

  unsubscribeHome = toss.events.onHome(() => {
    handleHomeRequest();
  });

  const userKeyResult = await toss.getUserKeyForGame();
  if (userKeyResult && userKeyResult.type === 'HASH') {
    userHash = userKeyResult.hash;
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '점수는 토스 게임 계정 단위로 저장됩니다.';
  } else if (toss.isAvailable()) {
    updateBridgeBadge('토스 미리보기', 'badge-fallback');
    userKeyHintEl.textContent = '토스 브리지는 연결됐지만 계정 키가 없어 브라우저 저장소를 함께 씁니다.';
  }

  await loadBestScore();
}

attachEventListeners();
resetRound();
updateHud();
resizeStage();
render();
loop();
void initializeTossBridge();
