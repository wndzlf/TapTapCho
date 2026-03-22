const toss = window.HamjjiBobaShopToss || {
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
const lifeEl = document.getElementById('life');
const statusLineEl = document.getElementById('statusLine');
const userKeyHintEl = document.getElementById('userKeyHint');
const bridgeBadgeEl = document.getElementById('bridgeBadge');

const btnExit = document.getElementById('btnExit');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const exitModal = document.getElementById('exitModal');

const LOGICAL_WIDTH = canvas.width;
const LOGICAL_HEIGHT = canvas.height;
const STORAGE_PREFIX = 'hamjji-boba-shop';
const ROUND_SECONDS = 45;
const MAX_LIFE = 3;
const CUP_BASE_WIDTH = 74;
const CUP_BASE_HEIGHT = 96;
const FEVER_TRIGGER_COMBO = 8;
const FEVER_DURATION = 5;
const FEVER_SCORE_MULTIPLIER = 2;
const GOLDEN_ORDER_MIN_SCORE = 60;
const GOLDEN_ORDER_BASE_CHANCE = 0.09;
const GOLDEN_ORDER_BONUS_SCORE = 22;
const GOLDEN_ORDER_BONUS_TIME = 2;

const DOPAMINE_THRESHOLDS = [100, 220, 360, 520];
const DIFFICULTY_LEVELS = [
  { minScore: 0, label: '포근 모드', orderTimeout: 3, timeBonus: 1.02, missPenalty: 0.9, cupScale: 1 },
  { minScore: 50, label: '분주 모드', orderTimeout: 2.55, timeBonus: 0.9, missPenalty: 1.08, cupScale: 0.94 },
  { minScore: 130, label: '피크 모드', orderTimeout: 2.15, timeBonus: 0.78, missPenalty: 1.28, cupScale: 0.88 },
  { minScore: 230, label: '폭주 모드', orderTimeout: 1.82, timeBonus: 0.66, missPenalty: 1.48, cupScale: 0.82 },
  { minScore: 330, label: '장인 모드', orderTimeout: 1.56, timeBonus: 0.54, missPenalty: 1.66, cupScale: 0.77 },
  { minScore: 430, label: '초집중 모드', orderTimeout: 1.31, timeBonus: 0.45, missPenalty: 1.86, cupScale: 0.72 },
  { minScore: 560, label: '극한 모드', orderTimeout: 1.12, timeBonus: 0.36, missPenalty: 2.05, cupScale: 0.68 },
];

const DOPAMINE_EFFECTS = {
  100: {
    title: '핑크 스파클',
    subText: '스파클 타임!',
    palette: ['#ff7aa8', '#ffc2d7', '#ffd166'],
    particleCount: 46,
    ringCount: 2,
    ringBaseRadius: 22,
    ringSpeed: 116,
    shake: 5.5,
    flash: 0.86,
    center: '255, 247, 252',
    mid: '255, 181, 217',
    bonusTime: 0.74,
    tones: [760, 980, 1220],
  },
  220: {
    title: '민트 웨이브',
    subText: '웨이브 업!',
    palette: ['#5fd6b1', '#9ef3de', '#7cc7ff'],
    particleCount: 58,
    ringCount: 3,
    ringBaseRadius: 28,
    ringSpeed: 126,
    shake: 6.7,
    flash: 0.95,
    center: '236, 255, 249',
    mid: '133, 236, 205',
    bonusTime: 0.92,
    tones: [800, 1080, 1380],
  },
  360: {
    title: '골드 잭팟',
    subText: '골드 잭팟!',
    palette: ['#ffd166', '#ffb347', '#fff1b7'],
    particleCount: 74,
    ringCount: 4,
    ringBaseRadius: 32,
    ringSpeed: 138,
    shake: 8.2,
    flash: 1.06,
    center: '255, 252, 232',
    mid: '255, 208, 112',
    bonusTime: 1.12,
    tones: [860, 1180, 1520, 1820],
  },
  520: {
    title: '레전드 레인보우',
    subText: 'LEGEND MAX!',
    palette: ['#ff7aa8', '#ffd166', '#89d8a6', '#8bc4ff', '#d7a6ff'],
    particleCount: 98,
    ringCount: 5,
    ringBaseRadius: 36,
    ringSpeed: 146,
    shake: 10.5,
    flash: 1.18,
    center: '255, 255, 255',
    mid: '205, 182, 255',
    bonusTime: 1.34,
    tones: [920, 1260, 1620, 1960, 2280],
  },
};

const FLAVORS = [
  { id: 'strawberry', label: '딸기보바', short: '딸', cup: '#ff94b8', lid: '#ffe0ec', pearl: '#ff648f' },
  { id: 'matcha', label: '말차보바', short: '말', cup: '#8fd08c', lid: '#e7f8df', pearl: '#67b460' },
  { id: 'brown', label: '흑당보바', short: '흑', cup: '#c79258', lid: '#ffe3c1', pearl: '#8b5c31' },
  { id: 'taro', label: '타로보바', short: '타', cup: '#b9a1df', lid: '#eee5ff', pearl: '#7f63b7' },
  { id: 'mango', label: '망고보바', short: '망', cup: '#ffc86f', lid: '#ffe9bd', pearl: '#e39a35' },
  { id: 'blueberry', label: '블루보바', short: '블', cup: '#8ab3ff', lid: '#dce9ff', pearl: '#4f75c9' },
  { id: 'peach', label: '복숭아보바', short: '복', cup: '#ffb7a3', lid: '#ffe5dc', pearl: '#d37a63' },
  { id: 'lavender', label: '라벤더보바', short: '라', cup: '#c8a8f2', lid: '#efe5ff', pearl: '#8f66cb' },
  { id: 'mint-choco', label: '민트보바', short: '민', cup: '#9ddfcd', lid: '#e4fff6', pearl: '#4ea383' },
];

function buildCupCenters() {
  const startY = 386;
  const gapY = 108;
  return FLAVORS.map((_, index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    return {
      x: LOGICAL_WIDTH * (0.2 + column * 0.3),
      y: startY + row * gapY,
    };
  });
}

const CUP_CENTERS = buildCupCenters();

const AUDIO_PATHS = {
  start: './assets/audio/hamjji-boba-shop-start.mp3',
  tap: './assets/audio/hamjji-boba-shop-tap.mp3',
  success: './assets/audio/hamjji-boba-shop-success.mp3',
  miss: './assets/audio/hamjji-boba-shop-miss.mp3',
  timeout: './assets/audio/hamjji-boba-shop-timeout.mp3',
};

const audioCtx = window.AudioContext ? new AudioContext() : null;
const audioState = {
  ready: false,
  clips: {},
};

let state = 'running'; // running | gameover
let gameOverReason = 'time';
let score = 0;
let best = 0;
let life = MAX_LIFE;
let combo = 0;
let timeLeft = ROUND_SECONDS;
let orderIndex = 0;
let orderIsGolden = false;
let orderDuration = DIFFICULTY_LEVELS[0].orderTimeout;
let orderTimeLeft = orderDuration;
let feverActive = false;
let feverTimeLeft = 0;
let nextFeverCombo = FEVER_TRIGGER_COMBO;
let userHash = null;
let lastFrameAt = performance.now();
let safeAreaUnsubscribe = () => {};
let backUnsubscribe = () => {};
let homeUnsubscribe = () => {};
let exitModalOpen = false;
let touchUnlocked = false;
let activeParticles = [];
let floatingTexts = [];
let steamPuffs = [];
let backgroundDots = [];
let dopamineRings = [];
let dopamineFlash = 0;
let dopamineFlashCenter = '255, 255, 255';
let dopamineFlashMid = '255, 236, 171';
let dopamineBanner = null;
let screenShake = 0;
let triggeredMilestones = new Set();
let bestPromise = Promise.resolve();
let idlePulse = 0;

for (let i = 0; i < 24; i += 1) {
  backgroundDots.push({
    x: Math.random(),
    y: Math.random(),
    r: 1.8 + Math.random() * 4.2,
    speed: 0.06 + Math.random() * 0.14,
    hue: Math.random() < 0.5 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 226, 238, 0.25)',
  });
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

function getScopedStorageKey(name) {
  const scope = userHash ? `user:${userHash}` : 'browser';
  return `${STORAGE_PREFIX}:${scope}:${name}`;
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

function resizeCanvas() {
  const stageBounds = stageEl.getBoundingClientRect();
  const availableWidth = Math.max(220, stageBounds.width - 24);
  const availableHeight = Math.max(300, stageBounds.height - 24);
  const displayWidth = Math.min(availableWidth, availableHeight * (LOGICAL_WIDTH / LOGICAL_HEIGHT));
  const displayHeight = displayWidth * (LOGICAL_HEIGHT / LOGICAL_WIDTH);
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const targetWidth = Math.round(LOGICAL_WIDTH * dpr);
  const targetHeight = Math.round(LOGICAL_HEIGHT * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function updateBridgeBadge() {
  const live = toss.isAvailable();
  bridgeBadgeEl.textContent = live ? '토스 브리지 연결됨' : '웹 미리보기';
  bridgeBadgeEl.classList.toggle('badge-live', live);
  bridgeBadgeEl.classList.toggle('badge-preview', !live);
}

function setStatus(text) {
  statusLineEl.textContent = text;
}

function setUserHint(text) {
  userKeyHintEl.textContent = text;
}

function syncHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  timeLeftEl.textContent = String(Math.ceil(timeLeft));
  lifeEl.textContent = String(life);
}

function spawnFloatingText(text, x, y, color) {
  floatingTexts.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -0.8 - Math.random() * 0.35,
    life: 40,
    text,
    color,
  });
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 8; i += 1) {
    activeParticles.push({
      x,
      y,
      vx: Math.cos((Math.PI * 2 * i) / 8) * (0.8 + Math.random() * 1.7),
      vy: Math.sin((Math.PI * 2 * i) / 8) * (0.8 + Math.random() * 1.7) - 1,
      life: 22 + Math.random() * 8,
      color,
    });
  }
}

function spawnSteam(x, y) {
  steamPuffs.push({
    x,
    y,
    vy: -0.25 - Math.random() * 0.2,
    life: 36 + Math.random() * 10,
    size: 6 + Math.random() * 6,
  });
}

function getDifficultyProfile(currentScore = score) {
  let profile = DIFFICULTY_LEVELS[0];
  for (const candidate of DIFFICULTY_LEVELS) {
    if (currentScore >= candidate.minScore) {
      profile = candidate;
    } else {
      break;
    }
  }
  return profile;
}

function collectScoreMilestones(previousScore, currentScore) {
  const crossed = [];
  for (const threshold of DOPAMINE_THRESHOLDS) {
    if (previousScore < threshold && currentScore >= threshold && !triggeredMilestones.has(threshold)) {
      crossed.push(threshold);
    }
  }
  return crossed;
}

function triggerDifficultyPulse(profile) {
  spawnFloatingText(`${profile.label} 진입!`, LOGICAL_WIDTH / 2, 248, '#ff89b4');
  spawnParticles(LOGICAL_WIDTH / 2, 268, '#ff89b4');
}

function shouldSpawnGoldenOrder() {
  if (score < GOLDEN_ORDER_MIN_SCORE) return false;
  if (orderIsGolden) return false;
  const chanceBoostByScore = Math.min(0.1, score / 1400);
  const chanceBoostByFever = feverActive ? 0.08 : 0;
  const chance = Math.min(0.26, GOLDEN_ORDER_BASE_CHANCE + chanceBoostByScore + chanceBoostByFever);
  return Math.random() < chance;
}

function activateFeverMode() {
  feverActive = true;
  feverTimeLeft = FEVER_DURATION;
  screenShake = Math.max(screenShake, 6.5);
  dopamineFlash = Math.max(dopamineFlash, 0.8);
  dopamineFlashCenter = '255, 245, 233';
  dopamineFlashMid = '255, 205, 124';
  dopamineBanner = {
    title: '피버 타임',
    subText: `${FEVER_DURATION}초 x${FEVER_SCORE_MULTIPLIER}`,
    color: '#ffb347',
    life: 1.2,
    maxLife: 1.2,
  };
  spawnFloatingText('FEVER TIME!', LOGICAL_WIDTH / 2, 306, '#ff9f43');
  spawnParticles(LOGICAL_WIDTH / 2, 330, '#ffb347');
  fallbackTone(980, 0.1, 0.028, 'triangle');
  fallbackTone(1340, 0.12, 0.02, 'triangle');
  setStatus(`피버 타임 발동! ${FEVER_DURATION}초 동안 점수 x${FEVER_SCORE_MULTIPLIER}.`);
}

function stopFeverMode() {
  feverActive = false;
  feverTimeLeft = 0;
}

function getDopamineEffect(threshold) {
  return DOPAMINE_EFFECTS[threshold] || DOPAMINE_EFFECTS[520];
}

function triggerDopamineBurst(threshold) {
  const centerX = LOGICAL_WIDTH / 2;
  const centerY = 352;
  const effect = getDopamineEffect(threshold);
  const palette = effect.palette;

  for (let i = 0; i < effect.particleCount; i += 1) {
    const angle = (Math.PI * 2 * i) / effect.particleCount;
    const speed = 1.35 + Math.random() * 3.9;
    activeParticles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.25,
      life: 34 + Math.random() * 24,
      color: palette[i % palette.length],
    });
  }

  for (let i = 0; i < effect.ringCount; i += 1) {
    const ringLife = 0.72 + i * 0.1;
    dopamineRings.push({
      radius: effect.ringBaseRadius + i * 16,
      speed: effect.ringSpeed + i * 18,
      life: ringLife,
      maxLife: ringLife,
      color: palette[(i + 1) % palette.length],
      lineWidth: 2 + i * 0.45,
    });
  }

  dopamineFlash = Math.max(dopamineFlash, effect.flash);
  dopamineFlashCenter = effect.center;
  dopamineFlashMid = effect.mid;
  dopamineBanner = {
    title: effect.title,
    subText: effect.subText,
    color: palette[0],
    life: 1.3,
    maxLife: 1.3,
  };
  screenShake = Math.max(screenShake, effect.shake);
  spawnFloatingText(`도파민 폭발! ${threshold}점`, centerX, centerY - 26, '#ff5f8b');
  spawnFloatingText(effect.subText, centerX, centerY + 8, palette[1] || '#ffd166');
  for (let i = 0; i < effect.tones.length; i += 1) {
    fallbackTone(effect.tones[i], 0.08 + i * 0.018, 0.028 - Math.min(0.012, i * 0.003), i >= 2 ? 'sine' : 'triangle');
  }
  timeLeft = Math.min(ROUND_SECONDS, timeLeft + effect.bonusTime);
  setStatus(`${effect.title}! ${threshold}점 돌파, 햄찌가 ${FLAVORS[orderIndex].label}을(를) 기다려요.`);
}

function randomFlavor(exceptIndex = -1) {
  const candidates = FLAVORS.map((_, index) => index).filter((index) => index !== exceptIndex);
  if (candidates.length === 0) return 0;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function setNewOrder(animate = true) {
  const previous = orderIndex;
  orderIndex = randomFlavor(previous);
  orderIsGolden = shouldSpawnGoldenOrder();
  const difficulty = getDifficultyProfile(score);
  const comboPressure = Math.min(0.34, combo * 0.02);
  const feverRelief = feverActive ? 0.2 : 0;
  orderDuration = Math.max(0.95, difficulty.orderTimeout - comboPressure + feverRelief);
  orderTimeLeft = orderDuration;

  if (animate) {
    const flavor = FLAVORS[orderIndex];
    const center = CUP_CENTERS[orderIndex];
    const orderTitle = orderIsGolden ? `골든 주문! ${flavor.label}` : `새 주문! ${flavor.label}`;
    const orderColor = orderIsGolden ? '#ffb347' : flavor.cup;
    spawnFloatingText(orderTitle, center.x, 176, orderColor);
    spawnSteam(center.x, center.y - 64);
    if (orderIsGolden) {
      spawnParticles(center.x, center.y - 62, '#ffd166');
      fallbackTone(1260, 0.06, 0.016, 'triangle');
    }
  }

  if (orderIsGolden) {
    setStatus(`황금 주문! 햄찌가 ${FLAVORS[orderIndex].label} 황금컵을 원해요.`);
    return;
  }
  setStatus(`햄찌가 ${FLAVORS[orderIndex].label}을(를) 원해요.`);
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
  if (kind === 'success') {
    fallbackTone(720, 0.08, 0.03, 'triangle');
    fallbackTone(960, 0.1, 0.018, 'triangle');
    return;
  }

  if (kind === 'miss') {
    fallbackTone(260, 0.12, 0.03, 'sawtooth');
    return;
  }

  if (kind === 'timeout') {
    fallbackTone(180, 0.16, 0.03, 'square');
    return;
  }

  if (kind === 'start') {
    fallbackTone(540, 0.08, 0.02, 'triangle');
    return;
  }

  fallbackTone(420, 0.04, 0.012, 'sine');
}

function unlockAudio() {
  if (touchUnlocked) return;
  touchUnlocked = true;

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  if (!audioState.ready) {
    for (const [kind, src] of Object.entries(AUDIO_PATHS)) {
      const clip = new Audio(src);
      clip.preload = 'auto';
      clip.volume = kind === 'tap' ? 0.46 : 0.68;
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

function setBestValue(value) {
  if (value <= best) return;
  best = value;
  bestEl.textContent = String(best);
  bestPromise = toss.storage.setItem(getScopedStorageKey('best'), String(best)).catch(() => {});
}

function openExitModal() {
  exitModalOpen = true;
  exitModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeExitModal() {
  exitModalOpen = false;
  exitModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

async function requestClose() {
  closeExitModal();
  const closed = await toss.closeView();
  if (!closed) {
    setStatus('토스 앱에서만 화면을 닫을 수 있어요.');
  }
}

function endGame(reason) {
  state = 'gameover';
  gameOverReason = reason;
  stopFeverMode();
  nextFeverCombo = FEVER_TRIGGER_COMBO;
  orderIsGolden = false;
  setBestValue(score);
  syncHud();

  if (reason === 'timeout') {
    setStatus('시간이 끝났어요. 화면을 탭하면 다시 시작합니다.');
  } else {
    setStatus('기회가 모두 끝났어요. 화면을 탭하면 다시 시작합니다.');
  }
}

function resetGame() {
  state = 'running';
  gameOverReason = 'time';
  score = 0;
  life = MAX_LIFE;
  combo = 0;
  timeLeft = ROUND_SECONDS;
  orderIsGolden = false;
  orderDuration = DIFFICULTY_LEVELS[0].orderTimeout;
  orderTimeLeft = orderDuration;
  feverActive = false;
  feverTimeLeft = 0;
  nextFeverCombo = FEVER_TRIGGER_COMBO;
  activeParticles = [];
  floatingTexts = [];
  steamPuffs = [];
  dopamineRings = [];
  dopamineFlash = 0;
  dopamineFlashCenter = '255, 255, 255';
  dopamineFlashMid = '255, 236, 171';
  dopamineBanner = null;
  screenShake = 0;
  triggeredMilestones = new Set();
  setNewOrder(false);
  setStatus(`햄찌가 ${FLAVORS[orderIndex].label}을(를) 원해요.`);
  playSfx('start');
  syncHud();
}

function cupMetrics(index, now = 0, withPulse = true) {
  const center = CUP_CENTERS[index];
  const difficulty = getDifficultyProfile(score);
  const selected = index === orderIndex;
  const pulse = withPulse
    ? (selected ? 1 + Math.sin(now * 0.008 + index) * 0.045 : 1 + Math.sin(now * 0.004 + index) * 0.01)
    : 1;
  const cupWidth = CUP_BASE_WIDTH * difficulty.cupScale * pulse;
  const cupHeight = CUP_BASE_HEIGHT * difficulty.cupScale * pulse;
  return {
    center,
    selected,
    cupWidth,
    cupHeight,
    x: center.x - cupWidth / 2,
    y: center.y - cupHeight / 2,
  };
}

function cupBounds(index) {
  const { x, y, cupWidth, cupHeight } = cupMetrics(index, 0, false);
  return {
    left: x - 8,
    right: x + cupWidth + 8,
    top: y - 12,
    bottom: y + cupHeight + 18,
  };
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.clientX ?? (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
  const clientY = event.clientY ?? (event.touches && event.touches[0] ? event.touches[0].clientY : 0);

  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
  };
}

function hitTestCup(point) {
  for (let index = 0; index < CUP_CENTERS.length; index += 1) {
    const bounds = cupBounds(index);
    if (point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) {
      return index;
    }
  }
  return -1;
}

function handleSuccess(index, point) {
  const flavor = FLAVORS[index];
  const wasGoldenOrder = orderIsGolden;
  const previousScore = score;
  const previousDifficulty = getDifficultyProfile(previousScore);
  combo += 1;
  const baseGained = 10 + Math.min(14, combo * 2) + (wasGoldenOrder ? GOLDEN_ORDER_BONUS_SCORE : 0);
  const scoreMultiplier = feverActive ? FEVER_SCORE_MULTIPLIER : 1;
  const gained = Math.round(baseGained * scoreMultiplier);
  score += gained;
  const nextDifficulty = getDifficultyProfile(score);
  const goldenBonusTime = wasGoldenOrder ? GOLDEN_ORDER_BONUS_TIME : 0;
  const feverBonusTime = feverActive ? 0.16 : 0;
  timeLeft = Math.min(ROUND_SECONDS, timeLeft + nextDifficulty.timeBonus + goldenBonusTime + feverBonusTime);
  setBestValue(score);
  playSfx('success');
  spawnParticles(point.x, point.y, flavor.cup);
  spawnFloatingText(
    scoreMultiplier > 1 ? `+${gained} x${scoreMultiplier}` : `+${gained}`,
    point.x,
    point.y - 24,
    wasGoldenOrder ? '#ffb347' : flavor.cup
  );
  spawnSteam(point.x, point.y - 34);
  if (wasGoldenOrder) {
    spawnParticles(point.x, point.y - 20, '#ffd166');
    spawnFloatingText(`골든 +${GOLDEN_ORDER_BONUS_SCORE}`, point.x, point.y - 48, '#ffb347');
    fallbackTone(1420, 0.09, 0.022, 'triangle');
  }
  setStatus(
    wasGoldenOrder
      ? `대성공! 황금 ${flavor.label} 주문 완료!`
      : `좋아요! ${flavor.label}이(가) 딱 맞아요.`
  );
  const milestones = collectScoreMilestones(previousScore, score);

  if (combo >= nextFeverCombo) {
    if (feverActive) {
      feverTimeLeft = Math.min(FEVER_DURATION + 2.5, feverTimeLeft + 2.1);
      spawnFloatingText('피버 연장!', point.x, point.y - 62, '#ff9f43');
      fallbackTone(1280, 0.08, 0.018, 'triangle');
    } else {
      activateFeverMode();
    }
    nextFeverCombo += FEVER_TRIGGER_COMBO;
  }

  setNewOrder(true);

  if (nextDifficulty !== previousDifficulty) {
    triggerDifficultyPulse(nextDifficulty);
  }

  for (const threshold of milestones) {
    triggeredMilestones.add(threshold);
    triggerDopamineBurst(threshold);
  }
}

function handleMiss(point) {
  const comboPenalty = Math.min(0.72, combo * 0.06);
  const wasFeverActive = feverActive;
  combo = 0;
  nextFeverCombo = FEVER_TRIGGER_COMBO;
  stopFeverMode();
  life -= 1;
  playSfx('miss');
  spawnParticles(point.x, point.y, '#ff6d95');
  spawnFloatingText('-1', point.x, point.y - 24, '#ff5f8b');
  if (wasFeverActive) {
    spawnFloatingText('피버 종료', point.x, point.y - 52, '#ff9f43');
  }
  setStatus('햄찌가 고개를 절레절레 했어요.');

  if (life <= 0) {
    endGame('life');
    return;
  }

  const difficulty = getDifficultyProfile(score);
  timeLeft = Math.max(0, timeLeft - (difficulty.missPenalty + comboPenalty));
  setNewOrder(true);
}

function handleTimeout() {
  const wasFeverActive = feverActive;
  life -= 1;
  combo = 0;
  nextFeverCombo = FEVER_TRIGGER_COMBO;
  stopFeverMode();
  playSfx('timeout');
  const center = CUP_CENTERS[orderIndex];
  spawnFloatingText('지각!', center.x, center.y - 70, '#ff6d95');
  if (wasFeverActive) {
    spawnFloatingText('피버 종료', center.x, center.y - 96, '#ff9f43');
  }
  spawnSteam(center.x, center.y - 84);
  setStatus(`${FLAVORS[orderIndex].label} 주문이 늦었어요.`);

  if (life <= 0) {
    endGame('life');
    return;
  }

  setNewOrder(true);
}

function handleTap(event) {
  event.preventDefault();
  unlockAudio();
  playSfx('tap');

  if (exitModalOpen) {
    closeExitModal();
    return;
  }

  if (state === 'gameover') {
    resetGame();
    return;
  }

  if (state !== 'running') {
    return;
  }

  const point = pointFromEvent(event);
  const cupIndex = hitTestCup(point);
  if (cupIndex === -1) {
    handleMiss(point);
    return;
  }

  if (cupIndex === orderIndex) {
    handleSuccess(cupIndex, point);
    return;
  }

  handleMiss(point);
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBackground(now) {
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  gradient.addColorStop(0, '#fff9fe');
  gradient.addColorStop(0.55, '#fff0f6');
  gradient.addColorStop(1, '#ffe1eb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.85;
  for (const dot of backgroundDots) {
    const x = (dot.x * LOGICAL_WIDTH + now * dot.speed * 0.03) % LOGICAL_WIDTH;
    const y = dot.y * LOGICAL_HEIGHT;
    ctx.fillStyle = dot.hue;
    ctx.beginPath();
    ctx.arc(x, y, dot.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.beginPath();
  ctx.ellipse(LOGICAL_WIDTH * 0.16, 118, 42, 24, -0.12, 0, Math.PI * 2);
  ctx.ellipse(LOGICAL_WIDTH * 0.82, 124, 58, 28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeaderCard() {
  const x = 20;
  const y = 24;
  const width = LOGICAL_WIDTH - 40;
  const height = 184;

  ctx.save();
  ctx.shadowColor = 'rgba(96, 45, 64, 0.12)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  drawRoundedRect(x, y, width, height, 26);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ff7aa8';
  ctx.font = '700 18px "Pretendard", sans-serif';
  ctx.fillText('오늘의 주문', x + 20, y + 34);

  const flavor = FLAVORS[orderIndex];
  const difficulty = getDifficultyProfile(score);
  const orderLabel = orderIsGolden ? `황금 ${flavor.label}` : flavor.label;
  const orderTitleColor = orderIsGolden ? '#d89a2e' : flavor.cup;
  const bubbleX = x + 20;
  const bubbleY = y + 52;
  const bubbleWidth = width - 40;
  const bubbleHeight = 64;
  ctx.fillStyle = orderIsGolden ? 'rgba(255, 248, 233, 0.98)' : 'rgba(255, 242, 247, 0.98)';
  drawRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 22);
  ctx.fill();

  ctx.fillStyle = orderTitleColor;
  ctx.font = `800 ${orderLabel.length >= 7 ? 21 : 26}px "Pretendard", sans-serif`;
  ctx.fillText(orderLabel, bubbleX + 20, bubbleY + 41);
  ctx.fillStyle = 'rgba(75, 47, 61, 0.62)';
  ctx.font = '600 13px "Pretendard", sans-serif';
  ctx.fillText(orderIsGolden ? '황금 주문은 보너스 점수와 시간 +2초를 줘요.' : '정답 컵을 탭하면 바로 다음 주문이 열려요.', bubbleX + 20, bubbleY + 56);

  const meterX = bubbleX + 20;
  const meterY = y + 128;
  const meterWidth = bubbleWidth - 40;
  ctx.fillStyle = 'rgba(75, 47, 61, 0.1)';
  drawRoundedRect(meterX, meterY, meterWidth, 14, 999);
  ctx.fill();
  ctx.fillStyle = orderIsGolden ? '#efba55' : flavor.cup;
  const meterRatio = orderDuration > 0 ? orderTimeLeft / orderDuration : 0;
  drawRoundedRect(meterX, meterY, meterWidth * Math.max(0.08, meterRatio), 14, 999);
  ctx.fill();

  ctx.fillStyle = 'rgba(75, 47, 61, 0.76)';
  ctx.font = '700 12px "Pretendard", sans-serif';
  ctx.fillText('손님 기다리는 시간', meterX, meterY + 31);
  ctx.textAlign = 'right';
  ctx.fillText(`난이도 ${difficulty.label}`, meterX + meterWidth, meterY + 31);
  ctx.textAlign = 'start';

  if (feverActive) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 180, 82, 0.2)';
    drawRoundedRect(meterX, meterY + 34, 140, 20, 999);
    ctx.fill();
    ctx.fillStyle = '#c2721f';
    ctx.font = '700 12px "Pretendard", sans-serif';
    ctx.fillText(`피버 x${FEVER_SCORE_MULTIPLIER} ${Math.max(0, feverTimeLeft).toFixed(1)}초`, meterX + 10, meterY + 48);
    ctx.restore();
  }

  const hamsterX = x + width - 88;
  const hamsterY = y + 130;
  ctx.save();
  ctx.translate(hamsterX, hamsterY);
  ctx.shadowColor = 'rgba(96, 45, 64, 0.14)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff7ef';
  ctx.beginPath();
  ctx.arc(28, 18, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd7e4';
  ctx.beginPath();
  ctx.arc(10, 2, 10, 0, Math.PI * 2);
  ctx.arc(46, 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5a3342';
  ctx.beginPath();
  ctx.arc(20, 16, 3, 0, Math.PI * 2);
  ctx.arc(36, 16, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a3342';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(28, 22, 7, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawCup(index, now) {
  const flavor = FLAVORS[index];
  const goldenTarget = orderIsGolden && index === orderIndex;
  const {
    center,
    selected,
    cupWidth,
    cupHeight,
    x,
    y,
  } = cupMetrics(index, now);

  ctx.save();
  if (goldenTarget) {
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 24;
  } else if (selected) {
    ctx.shadowColor = flavor.cup;
    ctx.shadowBlur = 18;
  } else {
    ctx.shadowColor = 'rgba(96, 45, 64, 0.12)';
    ctx.shadowBlur = 10;
  }
  ctx.shadowOffsetY = 5;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  drawRoundedRect(x - 3, y + 16, cupWidth + 6, cupHeight - 4, 20);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = goldenTarget ? '#d6a14d' : flavor.cup;
  drawRoundedRect(x + cupWidth * 0.12, y + cupHeight * 0.23, cupWidth * 0.76, cupHeight * 0.62, 14);
  ctx.fill();

  ctx.fillStyle = goldenTarget ? '#ffe7b3' : flavor.lid;
  drawRoundedRect(x + 2, y + 6, cupWidth - 4, cupHeight * 0.25, 12);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
  drawRoundedRect(x + cupWidth * 0.28, y + 10, cupWidth * 0.44, 7, 999);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(x + cupWidth * 0.22, y + cupHeight * 0.3, 3, cupHeight * 0.46);

  const pearls = [
    [x + cupWidth * 0.26, y + cupHeight * 0.74],
    [x + cupWidth * 0.39, y + cupHeight * 0.82],
    [x + cupWidth * 0.61, y + cupHeight * 0.74],
    [x + cupWidth * 0.74, y + cupHeight * 0.82],
  ];
  const pearlOuterRadius = Math.max(4, cupWidth * 0.075);
  const pearlInnerRadius = pearlOuterRadius * 0.62;
  for (const [px, py] of pearls) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.beginPath();
    ctx.arc(px, py, pearlOuterRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = goldenTarget ? '#84531f' : flavor.pearl;
    ctx.beginPath();
    ctx.arc(px, py, pearlInnerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = goldenTarget ? '#fff8e8' : '#fff';
  ctx.font = `800 ${Math.max(18, Math.round(cupWidth * 0.32))}px "Pretendard", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(flavor.short, center.x, y + cupHeight * 0.56);
  ctx.textAlign = 'start';

  if (selected || goldenTarget) {
    ctx.strokeStyle = goldenTarget ? '#ffd166' : flavor.cup;
    ctx.lineWidth = goldenTarget ? 4 : 3;
    drawRoundedRect(x - 5, y + 14, cupWidth + 10, cupHeight + 2, 20);
    ctx.stroke();
  }

  if (goldenTarget) {
    const sparkle = (Math.sin(now * 0.012 + index) + 1) * 0.5;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 243, 209, ${0.5 + sparkle * 0.45})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const sx = x + 8 + i * (cupWidth * 0.26);
      const sy = y + 2 + (i % 2) * 8;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy);
      ctx.lineTo(sx + 4, sy);
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx, sy + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(75, 47, 61, 0.7)';
  ctx.font = '700 12px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(flavor.label, center.x, y + cupHeight + 16);
  ctx.textAlign = 'start';
}

function drawSteam(now) {
  for (const puff of steamPuffs) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, puff.life / 50);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.ellipse(puff.x, puff.y - (50 - puff.life) * 0.22, puff.size, puff.size * 1.25, Math.sin(now * 0.004) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of activeParticles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / 30);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const text of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, text.life / 40);
    ctx.fillStyle = text.color;
    ctx.font = '800 18px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text.text, text.x, text.y);
    ctx.restore();
  }
}

function drawDopamineOverlay() {
  const centerX = LOGICAL_WIDTH / 2;
  const centerY = 352;

  if (feverActive) {
    const pulse = (Math.sin(performance.now() * 0.012) + 1) * 0.5;
    ctx.save();
    ctx.fillStyle = `rgba(255, 184, 92, ${0.06 + pulse * 0.06})`;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
  }

  for (const ring of dopamineRings) {
    const ratio = ring.maxLife > 0 ? ring.life / ring.maxLife : 0;
    ctx.save();
    ctx.globalAlpha = Math.max(0, ratio);
    ctx.strokeStyle = ring.color || 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = (ring.lineWidth || 2) + (1 - ratio) * 2.2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (dopamineFlash > 0) {
    const gradient = ctx.createRadialGradient(centerX, centerY, 26, centerX, centerY, 280);
    gradient.addColorStop(0, `rgba(${dopamineFlashCenter}, ${0.34 * dopamineFlash})`);
    gradient.addColorStop(0.45, `rgba(${dopamineFlashMid}, ${0.24 * dopamineFlash})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
  }

  if (!dopamineBanner || dopamineBanner.life <= 0) return;
  const bannerRatio = dopamineBanner.maxLife > 0 ? dopamineBanner.life / dopamineBanner.maxLife : 0;
  ctx.save();
  ctx.globalAlpha = bannerRatio;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  drawRoundedRect(LOGICAL_WIDTH / 2 - 122, 266, 244, 54, 16);
  ctx.fill();
  ctx.strokeStyle = dopamineBanner.color;
  ctx.lineWidth = 2;
  drawRoundedRect(LOGICAL_WIDTH / 2 - 122, 266, 244, 54, 16);
  ctx.stroke();
  ctx.fillStyle = 'rgba(75, 47, 61, 0.92)';
  ctx.font = '800 15px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dopamineBanner.title, LOGICAL_WIDTH / 2, 287);
  ctx.fillStyle = dopamineBanner.color;
  ctx.font = '700 12px "Pretendard", sans-serif';
  ctx.fillText(dopamineBanner.subText, LOGICAL_WIDTH / 2, 305);
  ctx.textAlign = 'start';
  ctx.restore();
}

function drawFooterHint() {
  ctx.save();
  ctx.fillStyle = 'rgba(75, 47, 61, 0.7)';
  ctx.font = '700 12px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('골든 주문 + 피버 타임을 노려 최고 점수를 갱신하세요.', LOGICAL_WIDTH / 2, 740);
  ctx.restore();
}

function drawHearts() {
  const baseX = 32;
  const baseY = 214;
  for (let i = 0; i < MAX_LIFE; i += 1) {
    const filled = i < life;
    ctx.save();
    ctx.translate(baseX + i * 26, baseY);
    ctx.fillStyle = filled ? '#ff6d95' : 'rgba(75, 47, 61, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.bezierCurveTo(-8, -12, -18, -1, -18, 9);
    ctx.bezierCurveTo(-18, 18, -8, 24, 0, 32);
    ctx.bezierCurveTo(8, 24, 18, 18, 18, 9);
    ctx.bezierCurveTo(18, -1, 8, -12, 0, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawGameOverOverlay() {
  if (state !== 'gameover') return;

  ctx.save();
  ctx.fillStyle = 'rgba(45, 24, 32, 0.38)';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.fillStyle = 'rgba(255, 250, 252, 0.98)';
  drawRoundedRect(36, 250, LOGICAL_WIDTH - 72, 220, 28);
  ctx.fill();

  ctx.fillStyle = '#ff7aa8';
  ctx.font = '800 30px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('장사가 끝났어요', LOGICAL_WIDTH / 2, 304);

  ctx.fillStyle = 'rgba(75, 47, 61, 0.78)';
  ctx.font = '700 16px "Pretendard", sans-serif';
  ctx.fillText(`점수 ${score} · 최고 ${best}`, LOGICAL_WIDTH / 2, 344);

  ctx.font = '600 14px "Pretendard", sans-serif';
  const message = gameOverReason === 'timeout'
    ? '화면을 탭하면 바로 다시 시작합니다.'
    : '화면을 탭하면 바로 다시 시작합니다.';
  ctx.fillText(message, LOGICAL_WIDTH / 2, 374);
  ctx.fillStyle = 'rgba(255, 122, 168, 0.16)';
  drawRoundedRect(LOGICAL_WIDTH / 2 - 68, 400, 136, 42, 18);
  ctx.fill();
  ctx.fillStyle = '#ff5f8b';
  ctx.font = '800 15px "Pretendard", sans-serif';
  ctx.fillText('탭해서 재시작', LOGICAL_WIDTH / 2, 427);
  ctx.restore();
}

function update(dt) {
  idlePulse += dt;

  for (const dot of backgroundDots) {
    dot.x += dt * dot.speed * 0.02;
    if (dot.x > 1.05) dot.x = -0.05;
  }

  for (const particle of activeParticles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.02;
    particle.life -= 1;
  }
  activeParticles = activeParticles.filter((particle) => particle.life > 0);

  for (const text of floatingTexts) {
    text.x += text.vx;
    text.y += text.vy;
    text.life -= 1;
  }
  floatingTexts = floatingTexts.filter((text) => text.life > 0);

  for (const puff of steamPuffs) {
    puff.y += puff.vy;
    puff.life -= 1;
  }
  steamPuffs = steamPuffs.filter((puff) => puff.life > 0);

  for (const ring of dopamineRings) {
    ring.radius += ring.speed * dt;
    ring.life -= dt;
  }
  dopamineRings = dopamineRings.filter((ring) => ring.life > 0);
  dopamineFlash = Math.max(0, dopamineFlash - dt * 2.4);
  if (dopamineBanner) {
    dopamineBanner.life -= dt;
    if (dopamineBanner.life <= 0) {
      dopamineBanner = null;
    }
  }
  screenShake = Math.max(0, screenShake - dt * 15);

  if (state !== 'running') {
    return;
  }

  if (feverActive) {
    feverTimeLeft = Math.max(0, feverTimeLeft - dt);
    if (feverTimeLeft <= 0) {
      stopFeverMode();
      spawnFloatingText('피버 종료', LOGICAL_WIDTH / 2, 320, '#ff9f43');
      setStatus(`피버 종료. 햄찌가 ${FLAVORS[orderIndex].label}을(를) 기다려요.`);
    }
  }

  timeLeft = Math.max(0, timeLeft - dt);
  orderTimeLeft = Math.max(0, orderTimeLeft - dt);

  if (orderTimeLeft <= 0) {
    handleTimeout();
  }

  if (timeLeft <= 0 && state === 'running') {
    endGame('timeout');
  }

  syncHud();
}

function draw(now) {
  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 0.7 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground(now);
  drawHeaderCard();
  drawHearts();
  drawSteam(now);

  for (let index = 0; index < FLAVORS.length; index += 1) {
    drawCup(index, now);
  }

  drawParticles();
  drawDopamineOverlay();
  drawFooterHint();
  drawGameOverOverlay();
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  update(dt);
  draw(now);
  requestAnimationFrame(loop);
}

function normalizeUserKey(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, 16);
}

async function loadBestForCurrentUser() {
  const storedBest = Number(await toss.storage.getItem(getScopedStorageKey('best')) || 0);
  best = Number.isFinite(storedBest) ? storedBest : 0;
  syncHud();
}

async function bootstrapProfile() {
  const userKeyResult = await toss.getUserKeyForGame();
  userHash = normalizeUserKey(userKeyResult);
  setUserHint(userHash ? `게임 계정: ${userHash}` : '게스트 모드로 플레이 중입니다.');
  await loadBestForCurrentUser();
  setStatus(`햄찌가 ${FLAVORS[orderIndex].label}을(를) 원해요.`);
}

async function configureBridge() {
  updateBridgeBadge();

  try {
    await toss.setDeviceOrientation('portrait');
  } catch (error) {
    // Ignore preview failures.
  }

  try {
    await toss.setIosSwipeGestureEnabled(false);
  } catch (error) {
    // Ignore preview failures.
  }

  try {
    applySafeAreaInsets(await toss.safeArea.get());
  } catch (error) {
    applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  }

  safeAreaUnsubscribe = toss.safeArea.subscribe((insets) => {
    applySafeAreaInsets(insets);
  });

  backUnsubscribe = toss.events.onBack(() => {
    openExitModal();
  });

  homeUnsubscribe = toss.events.onHome(() => {
    openExitModal();
  });
}

async function init() {
  resizeCanvas();
  syncHud();
  setStatus('화면을 탭해서 맞는 보바 컵을 골라 주세요.');
  setUserHint('토스 게임 계정 연결 상태를 확인 중입니다.');

  await configureBridge();
  await bootstrapProfile();

  setNewOrder(false);
  playSfx('start');
  requestAnimationFrame(loop);
}

btnExit.addEventListener('click', () => {
  openExitModal();
});

btnCancelExit.addEventListener('click', () => {
  closeExitModal();
});

btnConfirmExit.addEventListener('click', () => {
  void requestClose();
});

exitModal.addEventListener('click', (event) => {
  if (event.target === exitModal) {
    closeExitModal();
  }
});

canvas.addEventListener('pointerdown', handleTap, { passive: false });
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
window.addEventListener('beforeunload', () => {
  safeAreaUnsubscribe();
  backUnsubscribe();
  homeUnsubscribe();
});

init();
