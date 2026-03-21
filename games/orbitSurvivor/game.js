const toss = window.OrbitSurvivorToss || {
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
        // Ignore storage errors in preview mode.
      }
    },
    removeItem: async (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        // Ignore storage errors in preview mode.
      }
    },
  },
  ads: {
    isAvailable: () => false,
    isLoaded: async () => false,
    load: () => () => {},
    show: () => () => {},
  },
};

toss.ads = toss.ads || {
  isAvailable: () => false,
  isLoaded: async () => false,
  load: () => () => {},
  show: () => () => {},
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageCard = document.getElementById('stageCard');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const bridgeBadgeEl = document.getElementById('bridgeBadge');
const userKeyHintEl = document.getElementById('userKeyHint');

const btnStart = document.getElementById('btnStart');
const btnMusic = document.getElementById('btnMusic');
const btnSfx = document.getElementById('btnSfx');
const btnExit = document.getElementById('btnExit');
const btnInfo = document.getElementById('btnInfo');
const btnCloseInfo = document.getElementById('btnCloseInfo');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const btnRestart = document.getElementById('btnRestart');
const btnGameOverExit = document.getElementById('btnGameOverExit');
const btnRewardContinue = document.getElementById('btnRewardContinue');

const gameOverModal = document.getElementById('gameOverModal');
const exitModal = document.getElementById('exitModal');
const infoModal = document.getElementById('infoModal');
const finalScoreEl = document.getElementById('finalScore');
const finalBestEl = document.getElementById('finalBest');
const hitFlashEl = document.getElementById('hitFlash');
const rewardContinueHintEl = document.getElementById('rewardContinueHint');

const W = canvas.width;
const H = canvas.height;
const LEGACY_BEST_KEY = 'orbit-survivor-best';
const LEGACY_SETTINGS_KEY = 'orbit-survivor-settings';
const STORAGE_PREFIX = 'orbit-survivor';
const DEFAULT_TOSS_REWARDED_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const TOSS_REWARDED_AD_GROUP_ID = typeof window !== 'undefined'
  && typeof window.__ORBIT_SURVIVOR_TOSS_REWARDED_AD_GROUP_ID === 'string'
  && window.__ORBIT_SURVIVOR_TOSS_REWARDED_AD_GROUP_ID.trim()
  ? window.__ORBIT_SURVIVOR_TOSS_REWARDED_AD_GROUP_ID.trim()
  : DEFAULT_TOSS_REWARDED_AD_GROUP_ID;
const REWARDED_CONTINUE_INVULN_TICKS = 150;

const BASE_CENTER_X = W * 0.5;
const BASE_CENTER_Y = H * 0.52;
const center = { x: BASE_CENTER_X, y: BASE_CENTER_Y };
const ORBIT_R = 126;
const ORBIT_DRIFT_START_SCORE = 20;
const MAX_LIVES = 3;
const DRIFT_PATTERNS = [
  { id: 'horizontal', vx: 1, vy: 0 },
  { id: 'vertical', vx: 0, vy: 1 },
  { id: 'diag-left', vx: -0.75, vy: 0.75 },
  { id: 'diag-right', vx: 0.75, vy: 0.75 },
];

const settings = {
  musicEnabled: true,
  sfxEnabled: true,
};

let state = 'idle';
let pauseReason = null;
let score = 0;
let lives = MAX_LIVES;
let best = 0;
let streak = 0;
let tick = 0;
let shake = 0;
let invulnTicks = 0;
let lifeLostTextTicks = 0;

let orbitAngle = -Math.PI * 0.5;
let orbitDir = 1;
let orbitSpeed = 0.042;
let orbitDriftSpeed = 0;
let orbitDriftWarn = 0;
let orbitDriftIntroFx = 0;
let driftVX = 1;
let driftVY = 0;
let driftPatternIndex = 0;
let nextDriftPatternTick = 0;
let lastActionAt = 0;
let userHash = null;

let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};
let lastStageTouchAt = 0;
let lastGameOverStreak = 0;
let rewardedAdSupported = false;
let rewardedAdStatus = 'hidden';
let rewardedContinueUsed = false;
let rewardedAdRewardGranted = false;
let rewardedAdUnitId = null;
let rewardedAdLoadCleanup = () => {};
let rewardedAdShowCleanup = () => {};
let rewardedAdRetryTimeout = 0;

const projectiles = [];
const particles = [];

const audioCtx = window.AudioContext ? new AudioContext() : null;
const bgmAudio = new Audio('./assets/audio/orbit-survivor-pixabay-492540.mp3');
bgmAudio.loop = true;
bgmAudio.preload = 'auto';
bgmAudio.volume = 0.42;
bgmAudio.setAttribute('playsinline', '');

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

function isRunning() {
  return state === 'running' && !pauseReason;
}

function isHidden(element) {
  return element?.classList.contains('hidden');
}

function toggleBodyModalLock() {
  const modalOpen = !isHidden(exitModal) || !isHidden(infoModal);
  document.body.classList.toggle('modal-open', modalOpen);
}

function showElement(element) {
  element?.classList.remove('hidden');
  toggleBodyModalLock();
}

function hideElement(element) {
  element?.classList.add('hidden');
  toggleBodyModalLock();
}

function setElementHidden(element, hidden) {
  element?.classList.toggle('hidden', hidden);
}

function setButtonState(button, isActive, activeLabel, inactiveLabel) {
  button.dataset.active = isActive ? 'true' : 'false';
  button.setAttribute('aria-pressed', String(isActive));
  button.textContent = isActive ? activeLabel : inactiveLabel;
}

function updateAudioButtons() {
  setButtonState(btnMusic, settings.musicEnabled, 'BGM 켜짐', 'BGM 꺼짐');
  setButtonState(btnSfx, settings.sfxEnabled, '효과음 켜짐', '효과음 꺼짐');
}

function updateStartButtonLabel() {
  btnStart.textContent = state === 'running' ? '다시 시작' : '시작';
}

function updateBridgeBadge(text, className) {
  bridgeBadgeEl.textContent = text;
  bridgeBadgeEl.className = `badge ${className}`;
}

function updateStreakHud() {
  streakEl.textContent = String(streak);
  streakEl.closest('.hud-card')?.classList.toggle('hot', streak >= 3);
}

function updateLivesHud() {
  livesEl.textContent = String(lives);
  livesEl.closest('.hud-card')?.classList.toggle('lives-low', lives <= 1);
}

function updateBestHud() {
  bestEl.textContent = String(best);
}

function updateScoreHud() {
  scoreEl.textContent = String(score);
}

function flashHit() {
  if (!hitFlashEl) return;
  hitFlashEl.classList.remove('show');
  void hitFlashEl.offsetWidth;
  hitFlashEl.classList.add('show');
  window.setTimeout(() => hitFlashEl.classList.remove('show'), 150);
}

function applySafeAreaInsets(insets) {
  if (!insets) {
    document.documentElement.style.removeProperty('--safe-top');
    document.documentElement.style.removeProperty('--safe-right');
    document.documentElement.style.removeProperty('--safe-bottom');
    document.documentElement.style.removeProperty('--safe-left');
    return;
  }

  const top = Number(insets?.top || 0);
  const right = Number(insets?.right || 0);
  const bottom = Number(insets?.bottom || 0);
  const left = Number(insets?.left || 0);

  document.documentElement.style.setProperty('--safe-top', `${Math.max(0, top)}px`);
  document.documentElement.style.setProperty('--safe-right', `${Math.max(0, right)}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${Math.max(0, bottom)}px`);
  document.documentElement.style.setProperty('--safe-left', `${Math.max(0, left)}px`);
}

function resizeStage() {
  if (!stageCard) return;

  const bounds = stageCard.getBoundingClientRect();
  const padding = 36;
  const availableWidth = Math.max(160, bounds.width - padding);
  const availableHeight = Math.max(240, bounds.height - padding);
  const ratio = W / H;
  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  hitFlashEl.style.right = 'auto';
  hitFlashEl.style.bottom = 'auto';
  hitFlashEl.style.left = `${(bounds.width - displayWidth) / 2}px`;
  hitFlashEl.style.top = `${(bounds.height - displayHeight) / 2}px`;
  hitFlashEl.style.width = `${displayWidth}px`;
  hitFlashEl.style.height = `${displayHeight}px`;
}

async function unlockAudio() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      // Ignore autoplay restrictions until the next user gesture.
    }
  }
}

function shouldPlayMusic() {
  return state === 'running' && !pauseReason && settings.musicEnabled && !document.hidden;
}

async function syncAudio() {
  if (shouldPlayMusic()) {
    try {
      await bgmAudio.play();
    } catch (error) {
      // Ignore autoplay restrictions until the next user gesture.
    }
  } else {
    bgmAudio.pause();
  }

  if (!audioCtx) return;

  const shouldSuspendSfx = document.hidden || pauseReason || !settings.sfxEnabled;
  if (shouldSuspendSfx && audioCtx.state === 'running') {
    audioCtx.suspend().catch(() => {});
  }
}

function beep(freq, duration, gain = 0.02) {
  if (!audioCtx || !settings.sfxEnabled || document.hidden || pauseReason) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const amplifier = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = freq;
  amplifier.gain.setValueAtTime(gain, now);
  amplifier.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(amplifier);
  amplifier.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playTurnSfx() {
  const speedBoost = Math.min(220, Math.max(0, orbitSpeed - 0.042) * 12000);
  const base = 520 + speedBoost + Math.random() * 16;
  beep(base, 0.05, 0.034);
  beep(base * 1.38, 0.03, 0.022);
}

function addBurst(x, y, color, amount = 12) {
  for (let index = 0; index < amount; index += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 20 + Math.random() * 20,
      color,
    });
  }
}

function pickMissileType() {
  const tier = Math.min(4, Math.floor(score / 40));
  const roll = Math.random();
  if (tier >= 3 && roll < 0.22) return 'bend';
  if (tier >= 2 && roll < 0.4) return 'accel';
  if (tier >= 1 && roll < 0.62) return 'weave';
  if (tier >= 1 && roll < 0.8) return 'fast';
  return 'straight';
}

function spawnProjectile() {
  const angle = Math.random() * Math.PI * 2;
  const distance = 250 + Math.random() * 120;
  const baseSpeed = 2.1 + Math.random() * 1.6 + Math.min(1.6, score / 140);

  const sourceX = center.x + Math.cos(angle) * distance;
  const sourceY = center.y + Math.sin(angle) * distance;
  const deltaX = center.x - sourceX;
  const deltaY = center.y - sourceY;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const dirX = deltaX / length;
  const dirY = deltaY / length;

  const type = pickMissileType();
  const fastMultiplier = type === 'fast' ? 1.35 : 1;
  const speed = baseSpeed * fastMultiplier;
  const size = type === 'fast' ? 7 + Math.random() * 4 : 8 + Math.random() * 6;
  const color = type === 'accel'
    ? '#7cffc5'
    : type === 'weave'
      ? '#ffd86d'
      : type === 'bend'
        ? '#c8a6ff'
        : type === 'fast'
          ? '#ff6b6b'
          : '#ff8a65';

  projectiles.push({
    x: sourceX,
    y: sourceY,
    dirX,
    dirY,
    speed,
    speedMax: speed + 1.6 + Math.min(1.2, score / 120),
    accel: type === 'accel' ? 0.02 + Math.min(0.035, score / 1800) : 0,
    weaveAmp: type === 'weave' ? 5 + Math.min(7, score / 70) : 0,
    weavePhase: Math.random() * Math.PI * 2,
    weaveSpeed: 0.12 + Math.random() * 0.08,
    perpX: -dirY,
    perpY: dirX,
    size,
    color,
    type,
    passed: false,
    bendTurnTick: type === 'bend' ? 22 + Math.floor(Math.random() * 32) : 0,
    bendDir: Math.random() < 0.5 ? -1 : 1,
    turned: false,
  });
}

function hideGameOverModal() {
  hideElement(gameOverModal);
  updateRewardedContinueUi();
}

function showGameOverModal() {
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  showElement(gameOverModal);
  updateRewardedContinueUi();
}

function clearRewardedAdRetry() {
  if (rewardedAdRetryTimeout) {
    window.clearTimeout(rewardedAdRetryTimeout);
    rewardedAdRetryTimeout = 0;
  }
}

function clearRewardedAdLoadSubscription() {
  rewardedAdLoadCleanup();
  rewardedAdLoadCleanup = () => {};
}

function clearRewardedAdShowSubscription() {
  rewardedAdShowCleanup();
  rewardedAdShowCleanup = () => {};
}

function scheduleRewardedAdReload() {
  if (!rewardedAdSupported || rewardedAdRetryTimeout) return;

  rewardedAdRetryTimeout = window.setTimeout(() => {
    rewardedAdRetryTimeout = 0;
    preloadRewardedContinueAd();
  }, 2500);
}

function updateRewardedContinueUi() {
  const shouldShow = rewardedAdSupported && state === 'gameover';
  setElementHidden(btnRewardContinue, !shouldShow);
  setElementHidden(rewardContinueHintEl, !shouldShow);

  if (!shouldShow || !btnRewardContinue || !rewardContinueHintEl) {
    return;
  }

  let buttonLabel = '광고 준비 중...';
  let hint = '광고를 불러오는 중이에요. 준비가 끝나면 1회 이어하기를 사용할 수 있어요.';
  let isDisabled = true;

  if (rewardedContinueUsed) {
    buttonLabel = '이번 판 이어하기 사용 완료';
    hint = '보상형 이어하기는 한 라운드에 한 번만 사용할 수 있어요.';
  } else if (rewardedAdStatus === 'ready') {
    buttonLabel = '광고 보고 1회 이어하기';
    hint = '광고 시청이 끝나면 목숨 1개와 잠깐의 보호막으로 이어서 플레이할 수 있어요.';
    isDisabled = false;
  } else if (rewardedAdStatus === 'showing') {
    buttonLabel = '광고 재생 중...';
    hint = '광고가 닫히면 이어하기 가능 여부를 바로 반영할게요.';
  } else if (rewardedAdStatus === 'failed') {
    buttonLabel = '광고 다시 준비 중...';
    hint = '광고를 불러오지 못했어요. 네트워크 상태를 확인한 뒤 자동으로 다시 시도하고 있어요.';
  }

  btnRewardContinue.textContent = buttonLabel;
  btnRewardContinue.disabled = isDisabled;
  rewardContinueHintEl.textContent = hint;
}

function setRewardedAdStatus(nextStatus) {
  rewardedAdStatus = nextStatus;
  updateRewardedContinueUi();
}

function preloadRewardedContinueAd() {
  if (!rewardedAdSupported || !TOSS_REWARDED_AD_GROUP_ID) return;
  if (rewardedAdStatus === 'loading' || rewardedAdStatus === 'showing') return;

  clearRewardedAdRetry();
  clearRewardedAdLoadSubscription();
  rewardedAdUnitId = null;
  setRewardedAdStatus('loading');

  rewardedAdLoadCleanup = toss.ads.load(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      if (event?.type !== 'loaded') return;

      rewardedAdUnitId = event.data?.adUnitId || null;
      clearRewardedAdLoadSubscription();
      setRewardedAdStatus('ready');
    },
    onError: () => {
      clearRewardedAdLoadSubscription();
      rewardedAdUnitId = null;
      setRewardedAdStatus('failed');
      scheduleRewardedAdReload();
    },
  });
}

function grantRewardedContinue() {
  if (state !== 'gameover' || rewardedContinueUsed) return;

  const playerX = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const playerY = center.y + Math.sin(orbitAngle) * ORBIT_R;
  const restoredStreak = lastGameOverStreak;

  rewardedContinueUsed = true;
  rewardedAdRewardGranted = false;
  state = 'running';
  lives = Math.max(1, lives);
  streak = Math.max(streak, restoredStreak);
  lastGameOverStreak = 0;
  invulnTicks = REWARDED_CONTINUE_INVULN_TICKS;
  lifeLostTextTicks = 0;
  shake = 6;
  projectiles.length = 0;

  addBurst(playerX, playerY, '#8dffdb', 24);
  addBurst(center.x, center.y, '#7de3ff', 16);
  updateLivesHud();
  updateStreakHud();
  hideGameOverModal();
  updateStartButtonLabel();
  setPauseReason(null);
  void syncAudio();
}

async function handleRewardContinueClick() {
  await unlockAudio();

  if (state !== 'gameover' || rewardedContinueUsed || rewardedAdStatus !== 'ready') {
    return;
  }

  clearRewardedAdRetry();
  clearRewardedAdLoadSubscription();
  clearRewardedAdShowSubscription();
  rewardedAdRewardGranted = false;
  setPauseReason('ad');
  setRewardedAdStatus('showing');

  rewardedAdShowCleanup = toss.ads.show(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      switch (event?.type) {
        case 'userEarnedReward':
          rewardedAdRewardGranted = true;
          break;
        case 'dismissed':
          clearRewardedAdShowSubscription();
          if (rewardedAdRewardGranted) {
            grantRewardedContinue();
          } else {
            rewardedAdRewardGranted = false;
            setPauseReason(null);
          }
          preloadRewardedContinueAd();
          break;
        case 'failedToShow':
          clearRewardedAdShowSubscription();
          rewardedAdRewardGranted = false;
          setPauseReason(null);
          setRewardedAdStatus('failed');
          scheduleRewardedAdReload();
          break;
        default:
          break;
      }
    },
    onError: () => {
      clearRewardedAdShowSubscription();
      rewardedAdRewardGranted = false;
      setPauseReason(null);
      setRewardedAdStatus('failed');
      scheduleRewardedAdReload();
    },
  });
}

async function initializeRewardedAds() {
  rewardedAdSupported = toss.isAvailable()
    && Boolean(TOSS_REWARDED_AD_GROUP_ID)
    && toss.ads.isAvailable() === true;

  if (!rewardedAdSupported) {
    rewardedAdUnitId = null;
    setRewardedAdStatus('hidden');
    return;
  }

  if (typeof toss.ads.isLoaded === 'function') {
    try {
      const isLoaded = await toss.ads.isLoaded(TOSS_REWARDED_AD_GROUP_ID);
      if (isLoaded) {
        setRewardedAdStatus('ready');
        return;
      }
    } catch (error) {
      rewardedAdUnitId = null;
    }
  }

  preloadRewardedContinueAd();
}

function setPauseReason(nextReason) {
  pauseReason = nextReason;
  void syncAudio();
}

function pauseForOverlay(reason) {
  if (state === 'running' && !pauseReason) {
    setPauseReason(reason);
  }
}

function resumeFromOverlay(reason) {
  if (pauseReason === reason) {
    setPauseReason(null);
  }
}

function openInfoModal() {
  pauseForOverlay('info');
  showElement(infoModal);
}

function closeInfoModal() {
  hideElement(infoModal);
  resumeFromOverlay('info');
}

function openExitModal() {
  pauseForOverlay('exit');
  showElement(exitModal);
}

function closeExitModal() {
  hideElement(exitModal);
  resumeFromOverlay('exit');
}

function setNextDriftPattern(force = false) {
  if (force) {
    driftPatternIndex = Math.floor(Math.random() * DRIFT_PATTERNS.length);
  } else {
    driftPatternIndex = (driftPatternIndex + 1 + Math.floor(Math.random() * 2)) % DRIFT_PATTERNS.length;
  }

  const pattern = DRIFT_PATTERNS[driftPatternIndex];
  driftVX = pattern.vx;
  driftVY = pattern.vy;

  const cadence = Math.max(240, 430 - score * 0.9);
  nextDriftPatternTick = tick + cadence + Math.floor(Math.random() * 90);
  orbitDriftWarn = 20;
}

function resetGame() {
  state = 'idle';
  pauseReason = null;
  score = 0;
  lives = MAX_LIVES;
  streak = 0;
  lastGameOverStreak = 0;
  tick = 0;
  shake = 0;
  invulnTicks = 0;
  lifeLostTextTicks = 0;
  rewardedContinueUsed = false;

  orbitAngle = -Math.PI * 0.5;
  orbitDir = 1;
  orbitSpeed = 0.042;
  orbitDriftSpeed = 0;
  orbitDriftWarn = 0;
  orbitDriftIntroFx = 0;
  driftVX = 1;
  driftVY = 0;
  driftPatternIndex = 0;
  nextDriftPatternTick = 0;
  center.x = BASE_CENTER_X;
  center.y = BASE_CENTER_Y;

  projectiles.length = 0;
  particles.length = 0;
  updateScoreHud();
  updateLivesHud();
  updateStreakHud();
  hideGameOverModal();
  updateRewardedContinueUi();
  updateStartButtonLabel();
}

async function startGame() {
  await unlockAudio();
  closeInfoModal();
  closeExitModal();
  hideGameOverModal();
  resetGame();
  state = 'running';
  updateStartButtonLabel();
  void syncAudio();
}

async function persistBest() {
  const value = String(best);
  await toss.storage.setItem(getScopedStorageKey('best'), value);
  safeLocalStorageSet(LEGACY_BEST_KEY, value);
}

async function persistSettings() {
  const raw = JSON.stringify(settings);
  await toss.storage.setItem(getScopedStorageKey('settings'), raw);
  safeLocalStorageSet(LEGACY_SETTINGS_KEY, raw);
}

function endGame() {
  state = 'gameover';
  setPauseReason(null);
  shake = 10;
  beep(180, 0.22, 0.055);

  const playerX = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const playerY = center.y + Math.sin(orbitAngle) * ORBIT_R;
  addBurst(playerX, playerY, '#ff7b74', 24);

  best = Math.max(best, score);
  updateBestHud();
  void persistBest();
  lastGameOverStreak = streak;
  streak = 0;
  updateStreakHud();
  showGameOverModal();
  updateStartButtonLabel();
  void syncAudio();
}

function loseLife(hitX, hitY) {
  if (state !== 'running' || invulnTicks > 0) return;

  lives = Math.max(0, lives - 1);
  invulnTicks = 60;
  lifeLostTextTicks = 70;
  shake = 8;
  flashHit();
  updateLivesHud();

  beep(210, 0.11, 0.04);
  addBurst(hitX, hitY, '#ff7b74', 16);

  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const shard = projectiles[index];
    if (Math.hypot(shard.x - hitX, shard.y - hitY) < 52) {
      projectiles.splice(index, 1);
    }
  }

  if (lives <= 0) {
    endGame();
  }
}

function action() {
  const now = performance.now();
  if (now - lastActionAt < 120) return;
  lastActionAt = now;

  if (!isRunning()) return;

  orbitDir *= -1;
  playTurnSfx();
}

function update() {
  tick += 1;
  orbitDriftWarn = Math.max(0, orbitDriftWarn - 1);
  orbitDriftIntroFx = Math.max(0, orbitDriftIntroFx - 1);

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.06;
    particle.life -= 1;
  }

  for (let index = particles.length - 1; index >= 0; index -= 1) {
    if (particles[index].life <= 0) {
      particles.splice(index, 1);
    }
  }

  if (!isRunning()) return;

  if (invulnTicks > 0) invulnTicks -= 1;
  if (lifeLostTextTicks > 0) lifeLostTextTicks -= 1;

  if (score >= ORBIT_DRIFT_START_SCORE) {
    if (orbitDriftSpeed <= 0) {
      setNextDriftPattern(true);
      orbitDriftIntroFx = 26;
      beep(430, 0.07, 0.028);
    }

    orbitDriftSpeed = Math.min(2.05, 0.62 + (score - ORBIT_DRIFT_START_SCORE) * 0.028);

    if (tick >= nextDriftPatternTick) {
      setNextDriftPattern(false);
      orbitDriftIntroFx = 20;
      beep(380, 0.04, 0.02);
    }

    const minX = ORBIT_R + 34;
    const maxX = W - ORBIT_R - 34;
    const minY = ORBIT_R + 48;
    const maxY = H - ORBIT_R - 38;

    center.x += driftVX * orbitDriftSpeed;
    center.y += driftVY * orbitDriftSpeed;

    if (center.x <= minX) {
      center.x = minX;
      driftVX = Math.abs(driftVX);
      orbitDriftWarn = 18;
      beep(360, 0.04, 0.02);
    } else if (center.x >= maxX) {
      center.x = maxX;
      driftVX = -Math.abs(driftVX);
      orbitDriftWarn = 18;
      beep(360, 0.04, 0.02);
    }

    if (center.y <= minY) {
      center.y = minY;
      driftVY = Math.abs(driftVY);
      orbitDriftWarn = 18;
      beep(360, 0.04, 0.02);
    } else if (center.y >= maxY) {
      center.y = maxY;
      driftVY = -Math.abs(driftVY);
      orbitDriftWarn = 18;
      beep(360, 0.04, 0.02);
    }
  } else {
    orbitDriftSpeed = 0;
    center.x += (BASE_CENTER_X - center.x) * 0.08;
    center.y += (BASE_CENTER_Y - center.y) * 0.08;
  }

  orbitAngle += orbitDir * orbitSpeed;
  orbitSpeed = Math.min(
    0.082,
    0.042 + score * 0.00006 + (score >= ORBIT_DRIFT_START_SCORE ? 0.006 : 0)
  );

  const spawnInterval = Math.max(18, 52 - Math.floor(score / 28));
  if (tick % spawnInterval === 0) {
    spawnProjectile();
    if (score > 120 && Math.random() < 0.22) {
      spawnProjectile();
    }
  }

  const playerX = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const playerY = center.y + Math.sin(orbitAngle) * ORBIT_R;

  for (const shard of projectiles) {
    if (shard.accel) {
      shard.speed = Math.min(shard.speedMax, shard.speed + shard.accel);
    }

    if (shard.type === 'bend') {
      if (!shard.turned) {
        shard.bendTurnTick -= 1;
        if (shard.bendTurnTick <= 0) {
          const previousDirX = shard.dirX;
          const previousDirY = shard.dirY;
          if (shard.bendDir > 0) {
            shard.dirX = -previousDirY;
            shard.dirY = previousDirX;
          } else {
            shard.dirX = previousDirY;
            shard.dirY = -previousDirX;
          }
          shard.turned = true;
          shard.speed = Math.min(shard.speedMax + 0.4, shard.speed * 1.08);
          addBurst(shard.x, shard.y, '#c8a6ff', 6);
        }
      }
      shard.x += shard.dirX * shard.speed;
      shard.y += shard.dirY * shard.speed;
    } else if (shard.weaveAmp) {
      const velocityX = shard.dirX * shard.speed;
      const velocityY = shard.dirY * shard.speed;
      shard.weavePhase += shard.weaveSpeed;
      const wobble = Math.sin(shard.weavePhase) * shard.weaveAmp;
      shard.x += velocityX + shard.perpX * wobble;
      shard.y += velocityY + shard.perpY * wobble;
    } else {
      shard.x += shard.dirX * shard.speed;
      shard.y += shard.dirY * shard.speed;
    }

    const distanceToPlayer = Math.hypot(shard.x - playerX, shard.y - playerY);
    if (distanceToPlayer < shard.size + 10 && invulnTicks <= 0) {
      loseLife(playerX, playerY);
      if (state === 'gameover') {
        return;
      }
    }

    const distanceToCenter = Math.hypot(shard.x - center.x, shard.y - center.y);
    if (distanceToCenter < 12 && !shard.passed) {
      shard.passed = true;
      streak += 1;
      score += 1 + Math.floor(streak / 4);
      updateScoreHud();
      updateStreakHud();
      addBurst(shard.x, shard.y, '#7de3ff', 10);
      beep(780 + Math.min(200, score * 6), 0.03, 0.015);
    }
  }

  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const shard = projectiles[index];
    if (shard.x < -100 || shard.x > W + 100 || shard.y < -100 || shard.y > H + 100) {
      projectiles.splice(index, 1);
    }
  }
}

function render() {
  ctx.save();

  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.84;
  }

  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let index = 0; index < 44; index += 1) {
    const x = (index * 89) % W;
    const y = (index * 43 + tick * 0.9) % H;
    ctx.fillStyle = 'rgba(145,190,255,0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  const driftActive = score >= ORBIT_DRIFT_START_SCORE && state === 'running';
  if (driftActive) {
    const flowLength = Math.hypot(driftVX, driftVY) || 1;
    const flowX = driftVX / flowLength;
    const flowY = driftVY / flowLength;
    const sideX = -flowY;
    const sideY = flowX;
    const flowPhase = (tick * (0.45 + orbitDriftSpeed * 0.22)) % 38;
    const glow = orbitDriftWarn > 0 ? 0.84 : 0.46;

    for (let index = 0; index < 7; index += 1) {
      const spread = -50 + index * 16;
      const trail = (flowPhase + index * 8) % 78;
      const x1 = center.x + sideX * spread - flowX * (trail + 10);
      const y1 = center.y + sideY * spread - flowY * (trail + 10);
      const x2 = x1 + flowX * (9 + index * 0.85);
      const y2 = y1 + flowY * (9 + index * 0.85);
      ctx.strokeStyle = `rgba(124, 219, 255, ${0.1 + index * 0.035 + glow * 0.16})`;
      ctx.lineWidth = 1.2 + index * 0.1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(109, 200, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, ORBIT_R, 0, Math.PI * 2);
  ctx.stroke();

  if (driftActive || orbitDriftIntroFx > 0) {
    const flowLength = Math.hypot(driftVX, driftVY) || 1;
    const flowX = driftVX / flowLength;
    const flowY = driftVY / flowLength;
    const sideX = -flowY;
    const sideY = flowX;
    const introBoost = orbitDriftIntroFx > 0 ? orbitDriftIntroFx / 26 : 0;
    const markerAlpha = 0.36 + introBoost * 0.34 + (orbitDriftWarn > 0 ? 0.22 : 0);
    const ringPulse = 0.5 + 0.5 * Math.sin(tick * 0.18);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(137, 228, 255, ${markerAlpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, ORBIT_R + 10 + ringPulse * 2.4, 0, Math.PI * 2);
    ctx.stroke();

    for (let index = 0; index < 4; index += 1) {
      const spread = -36 + index * 24;
      const tipX = center.x + flowX * (ORBIT_R + 17 + index * 3) + sideX * spread;
      const tipY = center.y + flowY * (ORBIT_R + 17 + index * 3) + sideY * spread;
      ctx.fillStyle = `rgba(176, 238, 255, ${0.2 + markerAlpha * 0.56})`;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - flowX * 9 + sideX * 5, tipY - flowY * 9 + sideY * 5);
      ctx.lineTo(tipX - flowX * 9 - sideX * 5, tipY - flowY * 9 - sideY * 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = '#1a2c4a';
  ctx.beginPath();
  ctx.arc(center.x, center.y, 13, 0, Math.PI * 2);
  ctx.fill();

  for (const shard of projectiles) {
    const tail = 14 + shard.size * 1.2;
    ctx.strokeStyle = shard.color || '#ff8a65';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = shard.color || '#ff8a65';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(shard.x - shard.dirX * tail, shard.y - shard.dirY * tail);
    ctx.lineTo(shard.x, shard.y);
    ctx.stroke();

    ctx.fillStyle = shard.color;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, shard.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  const playerX = center.x + Math.cos(orbitAngle) * ORBIT_R;
  const playerY = center.y + Math.sin(orbitAngle) * ORBIT_R;

  const blink = invulnTicks > 0 ? (tick % 10 < 5 ? 0.25 : 1) : 1;
  const playerColor = `rgba(125, 227, 255, ${blink})`;
  ctx.fillStyle = playerColor;
  ctx.shadowColor = playerColor;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(playerX, playerY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.translate(playerX, playerY);
  ctx.rotate(orbitAngle + (orbitDir > 0 ? Math.PI / 2 : -Math.PI / 2));
  ctx.fillStyle = 'rgba(125, 227, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(4, -5);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (driftActive || orbitDriftIntroFx > 0) {
    const flowLength = Math.hypot(driftVX, driftVY) || 1;
    const flowX = driftVX / flowLength;
    const flowY = driftVY / flowLength;
    const sideX = -flowY;
    const sideY = flowX;
    const glow = orbitDriftWarn > 0 ? 0.9 : 0.55;

    ctx.save();
    ctx.translate(W - 38, 34);
    ctx.fillStyle = 'rgba(8, 18, 36, 0.78)';
    ctx.strokeStyle = `rgba(121, 214, 255, ${0.52 + glow * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = `rgba(182, 239, 255, ${0.6 + glow * 0.34})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-flowX * 8, -flowY * 8);
    ctx.lineTo(flowX * 6, flowY * 6);
    ctx.stroke();

    ctx.fillStyle = `rgba(206, 248, 255, ${0.72 + glow * 0.24})`;
    ctx.beginPath();
    ctx.moveTo(flowX * 9, flowY * 9);
    ctx.lineTo(flowX * 3 + sideX * 5, flowY * 3 + sideY * 5);
    ctx.lineTo(flowX * 3 - sideX * 5, flowY * 3 - sideY * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const particle of particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life / 35);
    ctx.fillRect(particle.x, particle.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (lifeLostTextTicks > 0 && state === 'running') {
    const alpha = Math.min(1, lifeLostTextTicks / 30);
    ctx.fillStyle = `rgba(255, 140, 140, ${alpha})`;
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`Life Lost! (${lives} left)`, W / 2, H / 2 - 14);
  }

  if (state === 'idle') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Tap Start', W / 2, H / 2 - 14);
    ctx.font = '16px sans-serif';
    ctx.fillText('Tap / Space to switch orbit direction', W / 2, H / 2 + 18);
  }

  if (pauseReason && state === 'running') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Paused', W / 2, H / 2 - 6);
    ctx.font = '16px sans-serif';
    ctx.fillText('Return to continue the run', W / 2, H / 2 + 20);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  window.requestAnimationFrame(loop);
}

async function loadPersistedState() {
  const storedBest = Number(await toss.storage.getItem(getScopedStorageKey('best')) || 0);
  const legacyBest = Number(safeLocalStorageGet(LEGACY_BEST_KEY) || 0);
  best = Math.max(storedBest, legacyBest);
  updateBestHud();

  const storedSettingsRaw = await toss.storage.getItem(getScopedStorageKey('settings'));
  const legacySettingsRaw = safeLocalStorageGet(LEGACY_SETTINGS_KEY);
  const settingsRaw = storedSettingsRaw || legacySettingsRaw;
  if (settingsRaw) {
    try {
      const parsed = JSON.parse(settingsRaw);
      settings.musicEnabled = parsed.musicEnabled !== false;
      settings.sfxEnabled = parsed.sfxEnabled !== false;
    } catch (error) {
      settings.musicEnabled = true;
      settings.sfxEnabled = true;
    }
  }

  updateAudioButtons();
  if (best > 0) {
    void persistBest();
  }
  void persistSettings();
}

async function initializeTossBridge() {
  updateBridgeBadge('웹 미리보기', 'badge-preview');
  userKeyHintEl.textContent = '브라우저 미리보기에서도 동일한 게임 화면을 확인할 수 있어요.';

  if (toss.isAvailable()) {
    try {
      const insets = await toss.safeArea.get();
      applySafeAreaInsets(insets);
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
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    }
  });

  const userKeyResult = await toss.getUserKeyForGame();
  if (userKeyResult && userKeyResult.type === 'HASH') {
    userHash = userKeyResult.hash;
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '최고 기록과 사운드 설정이 토스 게임 계정 기준으로 저장돼요.';
  } else if (toss.isAvailable()) {
    updateBridgeBadge('토스 미리보기', 'badge-fallback');
    userKeyHintEl.textContent = '토스 브리지는 연결됐지만 게임 계정 키를 받지 못해 로컬 저장소를 함께 사용해요.';
  }

  await loadPersistedState();
  await initializeRewardedAds();
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    } else {
      void syncAudio();
    }
    return;
  }

  if (pauseReason === 'background') {
    setPauseReason(null);
  } else {
    void syncAudio();
  }
}

function handleBackRequest() {
  if (!isHidden(infoModal)) {
    closeInfoModal();
    return;
  }

  if (!isHidden(exitModal)) {
    closeExitModal();
    return;
  }

  openExitModal();
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

function handleCanvasPress() {
  void unlockAudio();

  if (state === 'running') {
    action();
    return;
  }

  void startGame();
}

function installTouchZoomGuard() {
  if (!stageCard) return;

  const preventZoomGesture = (event) => {
    event.preventDefault();
  };

  const preventMultiTouchZoom = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  const preventDoubleTapZoom = (event) => {
    const now = performance.now();
    if (now - lastStageTouchAt < 280) {
      event.preventDefault();
    }
    lastStageTouchAt = now;
  };

  stageCard.addEventListener('touchstart', preventMultiTouchZoom, { passive: false });
  stageCard.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });
  stageCard.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
  document.addEventListener('gesturestart', preventZoomGesture, { passive: false });
  document.addEventListener('gesturechange', preventZoomGesture, { passive: false });
  document.addEventListener('gestureend', preventZoomGesture, { passive: false });
}

function attachEventListeners() {
  installTouchZoomGuard();
  window.addEventListener('resize', resizeStage);
  window.addEventListener('orientationchange', resizeStage);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => {
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    } else {
      void syncAudio();
    }
  });
  window.addEventListener('pageshow', () => {
    if (pauseReason === 'background' && !document.hidden) {
      setPauseReason(null);
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Tab') {
      event.preventDefault();
      if (state === 'running') {
        action();
      }
    }

    if (event.key === 'Enter' && state !== 'running') {
      event.preventDefault();
      void startGame();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleBackRequest();
    }
  });

  canvas.addEventListener('pointerdown', handleCanvasPress);
  btnStart.addEventListener('click', () => {
    void startGame();
  });
  btnRestart.addEventListener('click', () => {
    void startGame();
  });
  btnRewardContinue?.addEventListener('click', () => {
    void handleRewardContinueClick();
  });
  btnGameOverExit.addEventListener('click', openExitModal);
  btnExit.addEventListener('click', openExitModal);
  btnCancelExit.addEventListener('click', closeExitModal);
  btnConfirmExit.addEventListener('click', () => {
    void leaveGame();
  });

  btnInfo.addEventListener('click', openInfoModal);
  btnCloseInfo.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', (event) => {
    if (event.target === infoModal) {
      closeInfoModal();
    }
  });
  exitModal.addEventListener('click', (event) => {
    if (event.target === exitModal) {
      closeExitModal();
    }
  });

  btnMusic.addEventListener('click', async () => {
    settings.musicEnabled = !settings.musicEnabled;
    updateAudioButtons();
    await unlockAudio();
    await persistSettings();
    await syncAudio();
  });

  btnSfx.addEventListener('click', async () => {
    settings.sfxEnabled = !settings.sfxEnabled;
    updateAudioButtons();
    await unlockAudio();
    await persistSettings();
    await syncAudio();
  });

  window.addEventListener('beforeunload', () => {
    clearRewardedAdRetry();
    clearRewardedAdLoadSubscription();
    clearRewardedAdShowSubscription();
    unsubscribeSafeArea();
    unsubscribeBack();
    unsubscribeHome();
    void toss.setIosSwipeGestureEnabled(true);
  });
}

attachEventListeners();
updateAudioButtons();
updateStartButtonLabel();
updateScoreHud();
updateLivesHud();
updateBestHud();
updateStreakHud();
resizeStage();
resetGame();
loop();
void initializeTossBridge();
