const toss = window.CassetteABWorldToss || {
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
const timerEl = document.getElementById('timer');
const bestEl = document.getElementById('best');
const worldHudEl = document.getElementById('worldHud');
const statusLineEl = document.getElementById('statusLine');
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
const btnSwitch = document.getElementById('btnSwitch');

const switchPulseEl = document.getElementById('switchPulse');
const gameOverModal = document.getElementById('gameOverModal');
const exitModal = document.getElementById('exitModal');
const infoModal = document.getElementById('infoModal');
const finalScoreEl = document.getElementById('finalScore');
const finalBestEl = document.getElementById('finalBest');
const finalReasonEl = document.getElementById('finalReason');
const rewardContinueHintEl = document.getElementById('rewardContinueHint');

const W = canvas.width;
const H = canvas.height;
const ROUND_MS = 59000;
const PLAYER_Y = H - 124;
const PLAYER_W = 140;
const PLAYER_H = 34;

const LEGACY_BEST_KEY = 'cassette-ab-world-best';
const LEGACY_SETTINGS_KEY = 'cassette-ab-world-settings';
const STORAGE_PREFIX = 'cassette-ab-world';

const DEFAULT_TOSS_REWARDED_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const TOSS_REWARDED_AD_GROUP_ID = typeof window !== 'undefined'
  && typeof window.__CASSETTE_AB_WORLD_TOSS_REWARDED_AD_GROUP_ID === 'string'
  && window.__CASSETTE_AB_WORLD_TOSS_REWARDED_AD_GROUP_ID.trim()
  ? window.__CASSETTE_AB_WORLD_TOSS_REWARDED_AD_GROUP_ID.trim()
  : DEFAULT_TOSS_REWARDED_AD_GROUP_ID;

const WORLD_COLORS = {
  A: {
    gate: '#ffb36b',
    glow: 'rgba(255, 179, 107, 0.46)',
    trail: 'rgba(255, 157, 105, 0.24)',
    bg: '#2a1a16',
  },
  B: {
    gate: '#6ee8ff',
    glow: 'rgba(110, 232, 255, 0.42)',
    trail: 'rgba(101, 197, 255, 0.24)',
    bg: '#12253b',
  },
};

const settings = {
  musicEnabled: true,
  sfxEnabled: true,
};

let state = 'idle'; // idle | running | gameover
let pauseReason = null;
let runEndReason = 'crash'; // crash | complete
let score = 0;
let best = 0;
let streak = 0;
let timerMs = ROUND_MS;
let elapsedMs = 0;
let world = 'A';
let worldFlash = 0;
let beatPulse = 0;
let invulnMs = 0;
let spawnTimer = 0.75;
let gateId = 0;
let lastSwitchAt = 0;
let lastSpawnWorld = 'A';
let sameWorldChain = 0;
let userHash = null;

let lastFrameAt = performance.now();
let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

let rewardedAdSupported = false;
let rewardedAdStatus = 'hidden'; // hidden | loading | ready | showing | failed
let rewardedContinueUsed = false;
let rewardedAdRewardGranted = false;
let rewardedAdLoadCleanup = () => {};
let rewardedAdShowCleanup = () => {};
let rewardedAdRetryTimeout = 0;

let gates = [];
let particles = [];

const audioCtx = window.AudioContext ? new AudioContext() : null;
const bgmAudio = new Audio('./assets/audio/on-the-road-to-the-eighties-59sec-177566.mp3');
bgmAudio.loop = true;
bgmAudio.preload = 'auto';
bgmAudio.volume = 0.4;
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

function isHidden(element) {
  return element?.classList.contains('hidden');
}

function isRunning() {
  return state === 'running' && !pauseReason;
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
  if (!element) return;
  element.classList.toggle('hidden', hidden);
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

function formatTimer(valueMs) {
  return `${Math.max(0, valueMs) / 1000}`.slice(0, 4);
}

function getStatusText() {
  if (pauseReason === 'background') {
    return '백그라운드 전환으로 일시정지';
  }

  if (pauseReason === 'info' || pauseReason === 'exit') {
    return '일시정지';
  }

  if (pauseReason === 'ad') {
    return '광고 진행 중';
  }

  if (state === 'idle') {
    return '탭으로 시작';
  }

  if (state === 'running') {
    if (invulnMs > 0) {
      return '이어달리기 보호 활성';
    }
    return world === 'A' ? 'A 채널' : 'B 채널';
  }

  if (runEndReason === 'complete') {
    return '59초 완주';
  }

  return '신호 충돌';
}

function updateWorldUi() {
  worldHudEl.textContent = world;
  worldHudEl.closest('.hud-card')?.classList.toggle('world-a', world === 'A');
  worldHudEl.closest('.hud-card')?.classList.toggle('world-b', world === 'B');
  btnSwitch.classList.toggle('world-b-active', world === 'B');
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  timerEl.textContent = formatTimer(timerMs);
  timerEl.closest('.hud-card')?.classList.toggle('timer-low', timerMs <= 10000 && state === 'running');
  statusLineEl.textContent = getStatusText();
  updateWorldUi();
  switchPulseEl.classList.toggle('hidden', state === 'running');
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
  if (!stageCard) return;

  const bounds = stageCard.getBoundingClientRect();
  const padding = 30;
  const availableWidth = Math.max(160, bounds.width - padding);
  const availableHeight = Math.max(240, bounds.height - padding);
  const ratio = W / H;
  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

async function unlockAudio() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      // Ignore autoplay restrictions until the next gesture.
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
      // Ignore autoplay restrictions until gesture.
    }
  } else {
    bgmAudio.pause();
  }

  if (!audioCtx) return;

  const suspendSfx = document.hidden || !settings.sfxEnabled || Boolean(pauseReason);
  if (suspendSfx && audioCtx.state === 'running') {
    audioCtx.suspend().catch(() => {});
  }
}

function beep(freq, duration, gain = 0.018, type = 'triangle') {
  if (!audioCtx || !settings.sfxEnabled || document.hidden || pauseReason) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const amplifier = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;
  amplifier.gain.setValueAtTime(gain, now);
  amplifier.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(amplifier);
  amplifier.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.01);
}

function vibrate(pattern) {
  if (!navigator.vibrate || !settings.sfxEnabled || document.hidden || pauseReason) return;
  navigator.vibrate(pattern);
}

function playSwitchSfx() {
  if (world === 'A') {
    beep(520, 0.05, 0.018, 'triangle');
    beep(720, 0.04, 0.012, 'square');
  } else {
    beep(660, 0.05, 0.018, 'triangle');
    beep(900, 0.04, 0.012, 'square');
  }
}

function playPassSfx() {
  beep(780, 0.028, 0.012, 'triangle');
}

function playFailSfx() {
  beep(220, 0.16, 0.045, 'sawtooth');
  beep(170, 0.2, 0.03, 'square');
}

function playFinishSfx() {
  beep(520, 0.05, 0.02, 'triangle');
  beep(720, 0.08, 0.02, 'triangle');
  beep(920, 0.12, 0.016, 'triangle');
}

function addBurst(x, y, color, amount = 10) {
  for (let index = 0; index < amount; index += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: 2 + Math.random() * 2,
      life: 22 + Math.random() * 18,
      color,
    });
  }
}

function updateParticles(dt) {
  const decay = dt * 60;
  for (const particle of particles) {
    particle.x += particle.vx * decay * 0.2;
    particle.y += particle.vy * decay * 0.2;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= decay;
  }
  particles = particles.filter((particle) => particle.life > 0);
}

function clearRewardedAdTimers() {
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
  }, 2600);
}

function updateRewardContinueUi() {
  const shouldShow = rewardedAdSupported && state === 'gameover' && runEndReason === 'crash';

  setElementHidden(btnRewardContinue, !shouldShow);
  setElementHidden(rewardContinueHintEl, !shouldShow);

  if (!shouldShow || !btnRewardContinue || !rewardContinueHintEl) {
    return;
  }

  let hint = '';
  if (rewardedContinueUsed) {
    btnRewardContinue.disabled = true;
    btnRewardContinue.textContent = '이어달리기 사용 완료';
    hint = '이번 런에서 이어달리기는 1회만 가능해요.';
  } else if (rewardedAdStatus === 'ready') {
    btnRewardContinue.disabled = false;
    btnRewardContinue.textContent = '광고 보고 이어달리기';
    hint = '광고 시청 후 충돌 지점에서 1회 이어달리기';
  } else if (rewardedAdStatus === 'showing') {
    btnRewardContinue.disabled = true;
    btnRewardContinue.textContent = '광고 재생 중...';
    hint = '광고가 끝나면 자동으로 처리돼요.';
  } else if (rewardedAdStatus === 'failed') {
    btnRewardContinue.disabled = true;
    btnRewardContinue.textContent = '광고 불가';
    hint = '광고 준비에 실패했어요. 잠시 후 재시도합니다.';
  } else {
    btnRewardContinue.disabled = true;
    btnRewardContinue.textContent = '광고 준비 중...';
    hint = '광고를 준비하고 있어요.';
  }

  rewardContinueHintEl.textContent = hint;
}

function setRewardedAdStatus(nextStatus) {
  rewardedAdStatus = nextStatus;
  updateRewardContinueUi();
}

function preloadRewardedContinueAd() {
  if (!rewardedAdSupported || !TOSS_REWARDED_AD_GROUP_ID || rewardedContinueUsed) return;
  if (rewardedAdStatus === 'loading' || rewardedAdStatus === 'showing' || rewardedAdStatus === 'ready') return;

  clearRewardedAdLoadSubscription();
  setRewardedAdStatus('loading');

  rewardedAdLoadCleanup = toss.ads.load(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      if (event?.type !== 'loaded') return;
      clearRewardedAdLoadSubscription();
      setRewardedAdStatus('ready');
    },
    onError: () => {
      clearRewardedAdLoadSubscription();
      setRewardedAdStatus('failed');
      scheduleRewardedAdReload();
    },
  });
}

async function continueFromReward() {
  if (state !== 'gameover' || runEndReason !== 'crash' || rewardedContinueUsed) return;

  rewardedContinueUsed = true;
  hideElement(gameOverModal);

  state = 'running';
  pauseReason = null;
  invulnMs = 1800;
  worldFlash = 1;
  beatPulse = 1;
  streak = 0;

  gates = gates.filter((gate) => Math.abs(gate.y - PLAYER_Y) > 180);
  addBurst(W * 0.5, PLAYER_Y, '#8fffce', 24);
  vibrate(16);

  setRewardedAdStatus('hidden');
  updateStartButtonLabel();
  updateHud();
  await syncAudio();
}

function attemptRewardContinue() {
  if (
    state !== 'gameover'
    || runEndReason !== 'crash'
    || rewardedContinueUsed
    || rewardedAdStatus !== 'ready'
    || !TOSS_REWARDED_AD_GROUP_ID
  ) {
    return;
  }

  clearRewardedAdLoadSubscription();
  clearRewardedAdShowSubscription();
  rewardedAdRewardGranted = false;
  setRewardedAdStatus('showing');
  pauseReason = 'ad';
  updateHud();

  let settled = false;
  const settle = (granted) => {
    if (settled) return;
    settled = true;

    clearRewardedAdShowSubscription();

    if (pauseReason === 'ad') {
      pauseReason = null;
    }

    if (granted) {
      void continueFromReward();
      return;
    }

    setRewardedAdStatus('failed');
    scheduleRewardedAdReload();
    void syncAudio();
  };

  rewardedAdShowCleanup = toss.ads.show(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      const type = event?.type;

      if (type === 'rewarded' || type === 'reward') {
        rewardedAdRewardGranted = true;
        return;
      }

      if (type === 'closed' || type === 'dismissed' || type === 'completed' || type === 'failed') {
        settle(rewardedAdRewardGranted);
      }
    },
    onError: () => {
      settle(false);
    },
  });
}

async function initRewardedAds() {
  rewardedAdSupported = toss.isAvailable()
    && typeof toss.ads?.isAvailable === 'function'
    && toss.ads.isAvailable() === true;

  if (!rewardedAdSupported || !TOSS_REWARDED_AD_GROUP_ID) {
    setRewardedAdStatus('hidden');
    updateRewardContinueUi();
    return;
  }

  if (typeof toss.ads.isLoaded === 'function') {
    try {
      const isLoaded = await toss.ads.isLoaded(TOSS_REWARDED_AD_GROUP_ID);
      if (isLoaded) {
        setRewardedAdStatus('ready');
        updateRewardContinueUi();
        return;
      }
    } catch (error) {
      // Ignore and fallback to load subscription.
    }
  }

  preloadRewardedContinueAd();
  updateRewardContinueUi();
}

function persistBest() {
  safeLocalStorageSet(LEGACY_BEST_KEY, String(best));
  return toss.storage.setItem(getScopedStorageKey('best'), String(best));
}

function persistSettings() {
  safeLocalStorageSet(LEGACY_SETTINGS_KEY, JSON.stringify(settings));
  return toss.storage.setItem(getScopedStorageKey('settings'), JSON.stringify(settings));
}

async function loadPersistedState() {
  const scopedBest = await toss.storage.getItem(getScopedStorageKey('best'));
  const legacyBest = safeLocalStorageGet(LEGACY_BEST_KEY);
  const bestRaw = scopedBest || legacyBest;

  const parsedBest = Number(bestRaw || 0);
  best = Number.isFinite(parsedBest) && parsedBest > 0 ? Math.floor(parsedBest) : 0;

  const scopedSettingsRaw = await toss.storage.getItem(getScopedStorageKey('settings'));
  const legacySettingsRaw = safeLocalStorageGet(LEGACY_SETTINGS_KEY);
  const settingsRaw = scopedSettingsRaw || legacySettingsRaw;

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
  updateHud();
  await syncAudio();
}

function setPauseReason(nextReason) {
  pauseReason = nextReason;
  updateHud();
  void syncAudio();
}

function openInfoModal() {
  showElement(infoModal);
  if (state === 'running' && !pauseReason) {
    setPauseReason('info');
  }
}

function closeInfoModal() {
  hideElement(infoModal);
  if (pauseReason === 'info') {
    setPauseReason(null);
  }
}

function openExitModal() {
  showElement(exitModal);
  if (state === 'running' && !pauseReason) {
    setPauseReason('exit');
  }
}

function closeExitModal() {
  hideElement(exitModal);
  if (pauseReason === 'exit') {
    setPauseReason(null);
  }
}

function showGameOverModal() {
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  if (runEndReason === 'complete') {
    finalReasonEl.textContent = '59초 완주 성공';
    document.getElementById('gameOverTitle').textContent = 'Tape Complete';
  } else {
    finalReasonEl.textContent = '게이트와 신호가 충돌했어요.';
    document.getElementById('gameOverTitle').textContent = 'Signal Lost';
  }
  gameOverModal.classList.remove('hidden');
  updateRewardContinueUi();
}

function hideGameOverModal() {
  gameOverModal.classList.add('hidden');
}

function chooseGateWorld() {
  let nextWorld = Math.random() < 0.62 ? world : world === 'A' ? 'B' : 'A';

  if (nextWorld === lastSpawnWorld) {
    sameWorldChain += 1;
  } else {
    sameWorldChain = 0;
  }

  if (sameWorldChain >= 2) {
    nextWorld = lastSpawnWorld === 'A' ? 'B' : 'A';
    sameWorldChain = 0;
  }

  return nextWorld;
}

function scheduleNextSpawn() {
  const elapsedSec = elapsedMs / 1000;
  const maxGap = Math.max(0.54, 0.88 - elapsedSec * 0.0055);
  const minGap = Math.max(0.28, maxGap - 0.26);
  spawnTimer = minGap + Math.random() * (maxGap - minGap);
}

function spawnGate() {
  const gateWorld = chooseGateWorld();
  const widthScale = 0.66 + Math.random() * 0.16;

  gates.push({
    id: gateId += 1,
    y: -64,
    w: W * widthScale,
    h: 44,
    world: gateWorld,
    speedMul: 0.96 + Math.random() * 0.14,
    scored: false,
  });

  lastSpawnWorld = gateWorld;
  scheduleNextSpawn();
}

function scoreGate(gate, now) {
  if (gate.scored) return;
  gate.scored = true;

  const switchedRecently = now - lastSwitchAt <= 420;
  if (switchedRecently) {
    streak = Math.min(24, streak + 1);
  } else {
    streak = Math.max(0, streak - 1);
  }

  const base = 10;
  const bonus = (switchedRecently ? 6 : 0) + Math.min(24, streak * 2);
  score += base + bonus;

  beatPulse = 1;
  playPassSfx();
  addBurst(W * 0.5, gate.y, gate.world === 'A' ? '#ffc78f' : '#9beeff', switchedRecently ? 8 : 5);
}

function gateCollidesWithPlayer(gate) {
  const gateTop = gate.y - gate.h * 0.5;
  const gateBottom = gate.y + gate.h * 0.5;
  const playerTop = PLAYER_Y - PLAYER_H * 0.5;
  const playerBottom = PLAYER_Y + PLAYER_H * 0.5;
  return gateBottom >= playerTop && gateTop <= playerBottom;
}

function finishRun(reason) {
  state = 'gameover';
  runEndReason = reason;

  if (score > best) {
    best = score;
    void persistBest();
  }

  if (reason === 'complete') {
    playFinishSfx();
    rewardedContinueUsed = true;
    setRewardedAdStatus('hidden');
  } else {
    playFailSfx();
    if (!rewardedContinueUsed && rewardedAdSupported) {
      preloadRewardedContinueAd();
    }
  }

  showGameOverModal();
  updateStartButtonLabel();
  updateHud();
  void syncAudio();
}

function resetRunState() {
  score = 0;
  streak = 0;
  timerMs = ROUND_MS;
  elapsedMs = 0;
  world = 'A';
  worldFlash = 0;
  beatPulse = 0;
  invulnMs = 0;
  spawnTimer = 0.72;
  gateId = 0;
  lastSwitchAt = performance.now();
  lastSpawnWorld = 'A';
  sameWorldChain = 0;
  runEndReason = 'crash';

  gates = [];
  particles = [];

  rewardedContinueUsed = false;
  rewardedAdRewardGranted = false;
  if (rewardedAdSupported) {
    setRewardedAdStatus('hidden');
    preloadRewardedContinueAd();
  }
}

async function startGame() {
  await unlockAudio();

  hideGameOverModal();
  closeInfoModal();
  closeExitModal();

  resetRunState();
  state = 'running';
  pauseReason = null;

  updateStartButtonLabel();
  updateHud();
  await syncAudio();
}

function switchWorld(source = 'input') {
  if (state !== 'running' || pauseReason) return;

  world = world === 'A' ? 'B' : 'A';
  lastSwitchAt = performance.now();
  worldFlash = source === 'input' ? 1 : 0.55;
  beatPulse = Math.max(beatPulse, 0.65);

  if (source === 'input') {
    playSwitchSfx();
    vibrate(10);
  }

  updateHud();
}

function crashNow() {
  addBurst(W * 0.5, PLAYER_Y, '#ff8e89', 24);
  vibrate([24, 28, 22]);
  finishRun('crash');
}

function updateRunning(dt, now) {
  if (!isRunning()) return;

  elapsedMs += dt * 1000;
  timerMs = Math.max(0, ROUND_MS - elapsedMs);

  if (timerMs <= 0) {
    finishRun('complete');
    return;
  }

  if (invulnMs > 0) {
    invulnMs = Math.max(0, invulnMs - dt * 1000);
  }

  const speed = 260 + Math.min(160, elapsedMs / 1000 * 2.2);

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnGate();
  }

  for (const gate of gates) {
    gate.y += speed * gate.speedMul * dt;

    if (!gate.scored && gate.y > PLAYER_Y + PLAYER_H) {
      scoreGate(gate, now);
    }

    if (invulnMs <= 0 && gate.world === world && gateCollidesWithPlayer(gate)) {
      crashNow();
      return;
    }
  }

  gates = gates.filter((gate) => gate.y < H + 100);

  worldFlash = Math.max(0, worldFlash - dt * 2.6);
  beatPulse = Math.max(0, beatPulse - dt * 3.2);

  updateHud();
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBackground(now) {
  const active = WORLD_COLORS[world];
  const opposite = WORLD_COLORS[world === 'A' ? 'B' : 'A'];

  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#080f18');
  gradient.addColorStop(0.55, active.bg);
  gradient.addColorStop(1, '#070b12');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const drift = (now * 0.03) % H;
  ctx.strokeStyle = 'rgba(196, 213, 235, 0.07)';
  ctx.lineWidth = 1;

  for (let index = 0; index < 34; index += 1) {
    const y = (index * 28 + drift) % H;
    ctx.beginPath();
    ctx.moveTo(34, y);
    ctx.lineTo(W - 34, y);
    ctx.stroke();
  }

  ctx.fillStyle = active.trail;
  ctx.fillRect(0, 0, 20 + worldFlash * 12, H);
  ctx.fillRect(W - (20 + worldFlash * 12), 0, 20 + worldFlash * 12, H);

  ctx.fillStyle = opposite.trail;
  ctx.fillRect(20, 0, 8, H);
  ctx.fillRect(W - 28, 0, 8, H);
}

function drawBeatLine() {
  const pulse = beatPulse * 0.7;
  const y = PLAYER_Y + 44;

  ctx.fillStyle = `rgba(235, 243, 252, ${0.18 + pulse * 0.28})`;
  drawRoundedRect(34, y, W - 68, 6 + pulse * 8, 6);
  ctx.fill();
}

function drawGate(gate) {
  const isActive = gate.world === world;
  const theme = WORLD_COLORS[gate.world];
  const alpha = isActive ? 0.96 : 0.28;
  const glow = isActive ? 18 : 6;

  const x = W * 0.5 - gate.w * 0.5;
  const y = gate.y - gate.h * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = glow;

  const gateGradient = ctx.createLinearGradient(x, y, x + gate.w, y + gate.h);
  gateGradient.addColorStop(0, gate.world === 'A' ? '#ffd39a' : '#b3f4ff');
  gateGradient.addColorStop(1, theme.gate);
  ctx.fillStyle = gateGradient;
  drawRoundedRect(x, y, gate.w, gate.h, 12);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = isActive ? 0.8 : 0.2;
  ctx.fillStyle = '#102136';
  drawRoundedRect(x + 18, y + 9, gate.w - 36, gate.h - 18, 8);
  ctx.fill();

  ctx.globalAlpha = isActive ? 0.55 : 0.12;
  ctx.fillStyle = '#f4f9ff';
  for (let index = 0; index < 5; index += 1) {
    const stripeX = x + 28 + index * ((gate.w - 56) / 4);
    ctx.fillRect(stripeX, y + 13, 2, gate.h - 26);
  }

  ctx.restore();
}

function drawPlayer(now) {
  const theme = WORLD_COLORS[world];
  const width = PLAYER_W;
  const height = PLAYER_H;
  const x = W * 0.5 - width * 0.5;
  const y = PLAYER_Y - height * 0.5;
  const wobble = Math.sin(now * 0.008) * 1.8;

  ctx.save();
  ctx.translate(0, wobble);

  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 20;
  const bodyGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  bodyGradient.addColorStop(0, world === 'A' ? '#ffe3bc' : '#d3f6ff');
  bodyGradient.addColorStop(1, theme.gate);
  ctx.fillStyle = bodyGradient;
  drawRoundedRect(x, y, width, height, 12);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#111f31';
  drawRoundedRect(x + 16, y + 7, width - 32, height - 14, 8);
  ctx.fill();

  ctx.fillStyle = world === 'A' ? '#ffcd97' : '#9beeff';
  ctx.beginPath();
  ctx.arc(x + 38, y + height * 0.5, 8, 0, Math.PI * 2);
  ctx.arc(x + width - 38, y + height * 0.5, 8, 0, Math.PI * 2);
  ctx.fill();

  if (invulnMs > 0) {
    const ratio = invulnMs / 1800;
    ctx.strokeStyle = `rgba(143, 255, 206, ${0.25 + ratio * 0.5})`;
    ctx.lineWidth = 3;
    drawRoundedRect(x - 8, y - 8, width + 16, height + 16, 16);
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 36);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWorldMark() {
  const activeA = world === 'A';
  const aAlpha = activeA ? 1 : 0.35;
  const bAlpha = activeA ? 0.35 : 1;

  ctx.globalAlpha = aAlpha;
  ctx.fillStyle = '#ffb36b';
  drawRoundedRect(20, 20, 42, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#0f1c2d';
  ctx.font = 'bold 16px "SF Pro Display", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', 41, 33);

  ctx.globalAlpha = bAlpha;
  ctx.fillStyle = '#6ee8ff';
  drawRoundedRect(68, 20, 42, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#0f1c2d';
  ctx.fillText('B', 89, 33);

  ctx.globalAlpha = 1;
}

function drawIdleOverlay() {
  if (state === 'running') return;

  ctx.fillStyle = 'rgba(4, 10, 17, 0.42)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#eef3fa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 26px "SF Pro Display", "Avenir Next", sans-serif';

  if (state === 'idle') {
    ctx.fillText('TAP TO PLAY', W * 0.5, H * 0.48);
  } else if (runEndReason === 'complete') {
    ctx.fillText('59 SEC COMPLETE', W * 0.5, H * 0.48);
  } else {
    ctx.fillText('TAP TO RETRY', W * 0.5, H * 0.48);
  }

  ctx.font = '600 14px "SF Pro Display", "Avenir Next", sans-serif';
  ctx.fillStyle = 'rgba(230, 239, 251, 0.8)';
  ctx.fillText('A/B', W * 0.5, H * 0.53);
}

function drawPauseOverlay() {
  if (!pauseReason || state !== 'running') return;

  ctx.fillStyle = 'rgba(4, 9, 15, 0.46)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#eef3fa';
  ctx.font = '700 20px "SF Pro Display", "Avenir Next", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', W * 0.5, H * 0.5);
}

function render(now) {
  drawBackground(now);

  for (const gate of gates) {
    drawGate(gate);
  }

  drawBeatLine();
  drawPlayer(now);
  drawParticles();
  drawWorldMark();
  drawPauseOverlay();
  drawIdleOverlay();
}

function update(now) {
  const dt = Math.min(0.033, (now - lastFrameAt) / 1000);
  lastFrameAt = now;

  if (state === 'running') {
    updateRunning(dt, now);
  } else {
    worldFlash = Math.max(0, worldFlash - dt * 2.4);
    beatPulse = Math.max(0, beatPulse - dt * 2.8);
  }

  updateParticles(dt);
}

function frame(now) {
  update(now);
  render(now);
  requestAnimationFrame(frame);
}

function preventMultiTouchZoom(event) {
  if (event.touches && event.touches.length > 1) {
    event.preventDefault();
  }
}

function preventDoubleTapZoom(event) {
  if (!event.changedTouches || event.changedTouches.length !== 1) return;

  const now = Date.now();
  const delta = now - (preventDoubleTapZoom.lastTapAt || 0);
  preventDoubleTapZoom.lastTapAt = now;

  if (delta > 0 && delta < 320) {
    event.preventDefault();
  }
}

function preventZoomGesture(event) {
  event.preventDefault();
}

function handlePrimaryAction() {
  void unlockAudio();

  if (pauseReason) return;

  if (state === 'running') {
    switchWorld('input');
    return;
  }

  void startGame();
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

function attachEventListeners() {
  window.addEventListener('resize', resizeStage);
  window.addEventListener('orientationchange', resizeStage);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  window.addEventListener('pagehide', () => {
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    }
  });

  window.addEventListener('pageshow', () => {
    if (pauseReason === 'background' && !document.hidden) {
      setPauseReason(null);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleBackRequest();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handlePrimaryAction();
      return;
    }

    if (state !== 'running' || pauseReason) return;

    if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
      event.preventDefault();
      if (world !== 'A') switchWorld('input');
      return;
    }

    if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (world !== 'B') switchWorld('input');
    }
  });

  stageCard.addEventListener('touchstart', preventMultiTouchZoom, { passive: false });
  stageCard.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });
  stageCard.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
  document.addEventListener('gesturestart', preventZoomGesture, { passive: false });
  document.addEventListener('gesturechange', preventZoomGesture, { passive: false });
  document.addEventListener('gestureend', preventZoomGesture, { passive: false });

  canvas.addEventListener('pointerdown', handlePrimaryAction);
  btnSwitch.addEventListener('click', handlePrimaryAction);

  btnStart.addEventListener('click', () => {
    void startGame();
  });

  btnRestart.addEventListener('click', () => {
    void startGame();
  });

  btnRewardContinue?.addEventListener('click', () => {
    attemptRewardContinue();
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
    unsubscribeSafeArea();
    unsubscribeBack();
    unsubscribeHome();
    clearRewardedAdTimers();
    clearRewardedAdLoadSubscription();
    clearRewardedAdShowSubscription();
    void toss.setIosSwipeGestureEnabled(true);
  });
}

async function initTossBridge() {
  updateBridgeBadge('웹 미리보기', 'badge-preview');
  userKeyHintEl.textContent = '브라우저 미리보기에서도 같은 UI/조작으로 테스트할 수 있어요.';

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
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    }
  });

  const userKeyResult = await toss.getUserKeyForGame();
  if (userKeyResult && userKeyResult.type === 'HASH') {
    userHash = userKeyResult.hash;
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '최고 기록과 설정이 토스 게임 계정 기준으로 저장됩니다.';
  } else if (toss.isAvailable()) {
    updateBridgeBadge('토스 미리보기', 'badge-fallback');
    userKeyHintEl.textContent = '토스 브리지 연동은 되었지만 계정 키를 받지 못해 로컬 저장소를 함께 사용합니다.';
  }

  await loadPersistedState();
  await initRewardedAds();
}

attachEventListeners();
updateAudioButtons();
updateStartButtonLabel();
updateHud();
resizeStage();

void initTossBridge();
requestAnimationFrame(frame);
