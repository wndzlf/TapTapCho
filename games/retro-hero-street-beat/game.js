const toss = window.RetroHeroStreetBeatToss || {
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
        // Ignore local storage errors in preview mode.
      }
    },
    removeItem: async (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        // Ignore local storage errors in preview mode.
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

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const comboEl = document.getElementById('combo');
const hpEl = document.getElementById('hp');
const waveEl = document.getElementById('wave');
const heroStateEl = document.getElementById('heroState');
const heroGaugeFillEl = document.getElementById('heroGaugeFill');
const statusLineEl = document.getElementById('statusLine');
const userKeyHintEl = document.getElementById('userKeyHint');
const bridgeBadgeEl = document.getElementById('bridgeBadge');

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

const btnLane0 = document.getElementById('btnLane0');
const btnLane1 = document.getElementById('btnLane1');
const btnLane2 = document.getElementById('btnLane2');

const exitModal = document.getElementById('exitModal');
const infoModal = document.getElementById('infoModal');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const finalBestEl = document.getElementById('finalBest');
const rewardContinueHintEl = document.getElementById('rewardContinueHint');

const W = canvas.width;
const H = canvas.height;

const STORAGE_PREFIX = 'retro-hero-street-beat';
const LEGACY_BEST_KEY = `${STORAGE_PREFIX}-best`;
const LEGACY_BEST_COMBO_KEY = `${STORAGE_PREFIX}-best-combo`;
const LEGACY_SETTINGS_KEY = `${STORAGE_PREFIX}-settings`;

const DEFAULT_TOSS_REWARDED_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const TOSS_REWARDED_AD_GROUP_ID = typeof window !== 'undefined'
  && typeof window.__RETRO_HERO_STREET_BEAT_TOSS_REWARDED_AD_GROUP_ID === 'string'
  && window.__RETRO_HERO_STREET_BEAT_TOSS_REWARDED_AD_GROUP_ID.trim()
  ? window.__RETRO_HERO_STREET_BEAT_TOSS_REWARDED_AD_GROUP_ID.trim()
  : DEFAULT_TOSS_REWARDED_AD_GROUP_ID;

const BPM = 118;
const BEAT_SEC = 60 / BPM;
const SONG_BEAT_OFFSET_SEC = 0.08;
const MAX_HP = 3;
const HERO_GAUGE_TARGET = 12;
const HERO_MODE_DURATION = 8;
const REVIVE_SHIELD_SEC = 2.2;

const ENEMY_SPAWN_Y = -82;
const HERO_Y = H - 134;
const HIT_LINE_Y = H - 228;
const LANES = [W * 0.21, W * 0.5, W * 0.79];

const audioCtx = window.AudioContext ? new AudioContext() : null;
const bgmAudio = new Audio('./assets/audio/a-hero-of-the-80s-126684.mp3');
bgmAudio.loop = true;
bgmAudio.preload = 'auto';
bgmAudio.volume = 0.58;
bgmAudio.setAttribute('playsinline', '');

const settings = {
  musicEnabled: true,
  sfxEnabled: true,
};

let state = 'idle'; // idle | running | gameover
let pauseReason = null;
let score = 0;
let best = 0;
let combo = 0;
let bestCombo = 0;
let hp = MAX_HP;
let wave = 1;
let heroGauge = 0;
let heroModeSec = 0;
let reviveShieldSec = 0;

let targetLane = 1;
let heroX = LANES[1];
let enemyIdSeed = 1;
let spawnSeed = 1;
let lastSpawnLane = 1;
let lastBeatIndex = -1;
let lastFrameTs = 0;
let songClockFallbackSec = 0;
let shake = 0;

let userHash = null;
let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

let messageTimer = 0;
let statusMessage = '';

let rewardedAdSupported = false;
let rewardedAdStatus = 'hidden';
let rewardedContinueUsed = false;
let rewardedAdRewardGranted = false;
let rewardedAdLoadCleanup = () => {};
let rewardedAdShowCleanup = () => {};
let rewardedAdRetryTimeout = 0;

const enemies = [];
const particles = [];
const slashFx = [];
const laneFlash = [0, 0, 0];

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
    // Ignore local storage errors in preview mode.
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function random() {
  const x = Math.sin(spawnSeed * 12.9898) * 43758.5453;
  spawnSeed += 1;
  return x - Math.floor(x);
}

function getScopedStorageKey(name) {
  const scope = userHash ? `user:${userHash}` : 'browser';
  return `${STORAGE_PREFIX}:${scope}:${name}`;
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

function updateBridgeBadge(text, className) {
  bridgeBadgeEl.textContent = text;
  bridgeBadgeEl.className = `badge ${className}`;
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
  if (state === 'running') {
    btnStart.textContent = pauseReason === 'manual' ? '재개' : '일시정지';
    return;
  }

  btnStart.textContent = state === 'gameover' ? '다시 시작' : '시작';
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  comboEl.textContent = String(combo);
  hpEl.textContent = String(hp);
  waveEl.textContent = String(wave);

  const comboCard = comboEl.closest('.hud-card');
  comboCard?.classList.toggle('hot', combo >= 8);

  if (heroModeSec > 0) {
    heroStateEl.textContent = `ON ${heroModeSec.toFixed(1)}s`;
    heroGaugeFillEl.style.width = '100%';
    return;
  }

  heroStateEl.textContent = heroGauge >= HERO_GAUGE_TARGET ? 'READY' : 'CHARGE';
  const gaugeRatio = clamp(heroGauge / HERO_GAUGE_TARGET, 0, 1);
  heroGaugeFillEl.style.width = `${gaugeRatio * 100}%`;
}

function defaultStatusByState() {
  if (state === 'idle') {
    return '레인을 탭해 공격. 비트 라인 타이밍을 맞추면 Perfect 보너스가 커집니다.';
  }

  if (state === 'gameover') {
    return '다시 시작하거나 광고를 보고 1회 이어하기를 사용할 수 있습니다.';
  }

  if (pauseReason) {
    return '일시정지 상태입니다. 복귀하면 바로 이어서 플레이할 수 있어요.';
  }

  return 'NEON HIT 라인에 맞춰 공격하면 Perfect, 콤보가 유지됩니다.';
}

function setStatus(message, durationSec = 1.1) {
  statusMessage = message;
  messageTimer = durationSec;
  statusLineEl.textContent = message;
}

function refreshStatusLine() {
  if (messageTimer > 0) {
    statusLineEl.textContent = statusMessage;
  } else {
    statusLineEl.textContent = defaultStatusByState();
  }
}

function applySafeAreaInsets(insets) {
  const next = insets || { top: 0, right: 0, bottom: 0, left: 0 };
  document.documentElement.style.setProperty('--safe-top', `${Number(next.top || 0)}px`);
  document.documentElement.style.setProperty('--safe-right', `${Number(next.right || 0)}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${Number(next.bottom || 0)}px`);
  document.documentElement.style.setProperty('--safe-left', `${Number(next.left || 0)}px`);
}

function closeOverlays() {
  hideElement(infoModal);
  hideElement(exitModal);
}

function isGameplayActive() {
  return state === 'running' && !pauseReason;
}

async function unlockAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      // Resume can fail before interaction; ignore.
    }
  }
}

function playTone({
  freq = 440,
  endFreq = null,
  gain = 0.05,
  duration = 0.09,
  type = 'square',
}) {
  if (!audioCtx || settings.sfxEnabled !== true) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq != null) {
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
  }

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(amp);
  amp.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

const sfx = {
  attack() {
    playTone({ freq: 380, endFreq: 640, gain: 0.03, duration: 0.05 });
  },
  perfect() {
    playTone({ freq: 720, endFreq: 1040, gain: 0.06, duration: 0.1, type: 'triangle' });
  },
  good() {
    playTone({ freq: 560, endFreq: 780, gain: 0.045, duration: 0.08, type: 'triangle' });
  },
  miss() {
    playTone({ freq: 220, endFreq: 150, gain: 0.05, duration: 0.1, type: 'sawtooth' });
  },
  hurt() {
    playTone({ freq: 170, endFreq: 84, gain: 0.075, duration: 0.16, type: 'sawtooth' });
  },
  hero() {
    playTone({ freq: 660, endFreq: 1280, gain: 0.07, duration: 0.14, type: 'square' });
  },
  over() {
    playTone({ freq: 130, endFreq: 70, gain: 0.08, duration: 0.22, type: 'sawtooth' });
  },
  ui() {
    playTone({ freq: 520, endFreq: 710, gain: 0.035, duration: 0.06, type: 'triangle' });
  },
};

async function syncAudio() {
  const shouldPlay = settings.musicEnabled && isGameplayActive();

  if (shouldPlay) {
    await unlockAudio();
    const playPromise = bgmAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    return;
  }

  bgmAudio.pause();
}

function getSongSeconds() {
  if (!Number.isNaN(bgmAudio.currentTime) && bgmAudio.currentTime > 0) {
    return Math.max(0, bgmAudio.currentTime - SONG_BEAT_OFFSET_SEC);
  }

  return Math.max(0, songClockFallbackSec - SONG_BEAT_OFFSET_SEC);
}

function getBeatErrorSec() {
  const beatFloat = getSongSeconds() / BEAT_SEC;
  const nearest = Math.round(beatFloat);
  return Math.abs(beatFloat - nearest) * BEAT_SEC;
}

function pickSpawnLane() {
  let lane = Math.floor(random() * LANES.length);
  if (lane === lastSpawnLane && random() < 0.52) {
    lane = (lane + (random() < 0.5 ? 1 : 2)) % LANES.length;
  }
  lastSpawnLane = lane;
  return lane;
}

function addBurst(x, y, color, amount = 12, spread = 3.2) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (random() - 0.5) * spread,
      vy: (random() - 0.5) * spread,
      life: 0.4 + random() * 0.5,
      maxLife: 0.5 + random() * 0.6,
      color,
      size: 1.6 + random() * 2.6,
    });
  }

  if (particles.length > 360) {
    particles.splice(0, particles.length - 360);
  }
}

function addSlash(lane, verdict = 'good') {
  slashFx.push({
    lane,
    life: 0.18,
    maxLife: 0.18,
    verdict,
  });
}

function spawnEnemy(beatIndex, forcedLane = null) {
  const lane = forcedLane == null ? pickSpawnLane() : forcedLane;
  const travelBeats = clamp(3.2 - wave * 0.08, 2.1, 3.2);
  const travelSec = travelBeats * BEAT_SEC;
  const speed = (HIT_LINE_Y - ENEMY_SPAWN_Y) / travelSec;

  enemies.push({
    id: enemyIdSeed,
    lane,
    x: LANES[lane],
    y: ENEMY_SPAWN_Y,
    speed,
    phase: random() * Math.PI * 2,
    beatBorn: beatIndex,
  });

  enemyIdSeed += 1;
}

function updateWaveFromBeat(beatIndex) {
  wave = 1 + Math.floor(beatIndex / 16);
}

function handleBeat(beatIndex) {
  updateWaveFromBeat(beatIndex);

  const density = clamp(0.54 + beatIndex * 0.003, 0.54, 0.95);
  if (random() < density) {
    spawnEnemy(beatIndex);
  }

  if (wave >= 3 && beatIndex % 8 === 4 && random() < 0.5) {
    let bonusLane = pickSpawnLane();
    if (enemies.length > 0 && bonusLane === enemies[enemies.length - 1].lane) {
      bonusLane = (bonusLane + 1) % LANES.length;
    }
    spawnEnemy(beatIndex, bonusLane);
  }
}

function loseHp() {
  if (reviveShieldSec > 0) {
    return;
  }

  hp = Math.max(0, hp - 1);
  combo = 0;
  heroGauge = Math.max(0, heroGauge - 2);
  shake = Math.max(shake, 12);
  sfx.hurt();
  addBurst(heroX, HERO_Y - 24, '#ff8a9d', 18, 4.5);

  if (hp <= 0) {
    endRun();
  } else {
    setStatus(`피격! HP ${hp}`, 0.8);
  }

  updateHud();
}

function findClosestEnemyInLane(lane) {
  let bestIndex = -1;
  let bestDistance = Infinity;

  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (enemy.lane !== lane) continue;

    const distance = Math.abs(enemy.y - HIT_LINE_Y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) {
    return { index: -1, enemy: null, distance: Infinity };
  }

  return {
    index: bestIndex,
    enemy: enemies[bestIndex],
    distance: bestDistance,
  };
}

function awardHit(verdict, enemy, lane) {
  const base = verdict === 'perfect' ? 120 : 84;
  const comboBonus = Math.min(120, combo * 6);
  let earned = base + comboBonus;

  if (heroModeSec > 0) {
    earned = Math.round(earned * 2);
  }

  score += earned;
  combo += 1;
  bestCombo = Math.max(bestCombo, combo);
  heroGauge = clamp(heroGauge + (verdict === 'perfect' ? 2 : 1), 0, HERO_GAUGE_TARGET);

  if (heroModeSec <= 0 && heroGauge >= HERO_GAUGE_TARGET) {
    heroModeSec = HERO_MODE_DURATION;
    heroGauge = 0;
    setStatus('HERO MODE ON! 점수 2배', 1.4);
    sfx.hero();
    addBurst(heroX, HERO_Y - 18, '#ffd463', 24, 5.1);
  } else if (verdict === 'perfect') {
    setStatus(`PERFECT +${earned}`, 0.65);
    sfx.perfect();
  } else {
    setStatus(`GOOD +${earned}`, 0.55);
    sfx.good();
  }

  laneFlash[lane] = 1;
  addSlash(lane, verdict);
  addBurst(enemy.x, enemy.y, verdict === 'perfect' ? '#ffe06c' : '#8ad5ff', 10, 3.2);

  updateHud();
}

function attemptAttack(lane) {
  if (!isGameplayActive()) return;

  targetLane = clamp(lane, 0, LANES.length - 1);
  laneFlash[targetLane] = 1;
  addSlash(targetLane, 'miss');
  sfx.attack();

  const pick = findClosestEnemyInLane(targetLane);
  const beatError = getBeatErrorSec();
  const perfectWindow = heroModeSec > 0 ? 0.12 : 0.085;
  const goodWindow = heroModeSec > 0 ? 0.2 : 0.16;

  const perfectDistance = 58;
  const goodDistance = 98;

  if (!pick.enemy || beatError > goodWindow || pick.distance > goodDistance) {
    combo = 0;
    heroGauge = Math.max(0, heroGauge - 1);
    shake = Math.max(shake, 4);
    setStatus('MISS', 0.45);
    sfx.miss();
    updateHud();
    return;
  }

  const verdict = beatError <= perfectWindow && pick.distance <= perfectDistance ? 'perfect' : 'good';
  enemies.splice(pick.index, 1);
  awardHit(verdict, pick.enemy, targetLane);
}

function startRun() {
  state = 'running';
  pauseReason = null;
  score = 0;
  combo = 0;
  hp = MAX_HP;
  wave = 1;
  heroGauge = 0;
  heroModeSec = 0;
  reviveShieldSec = 0;

  targetLane = 1;
  heroX = LANES[1];
  lastBeatIndex = -1;
  songClockFallbackSec = 0;
  shake = 0;
  messageTimer = 0;

  rewardedContinueUsed = false;

  enemies.length = 0;
  particles.length = 0;
  slashFx.length = 0;

  for (let i = 0; i < laneFlash.length; i += 1) {
    laneFlash[i] = 0;
  }

  bgmAudio.currentTime = 0;

  hideGameOverModal();
  closeOverlays();
  updateHud();
  updateStartButtonLabel();
  refreshStatusLine();
  void syncAudio();

  if (rewardedAdSupported) {
    preloadRewardedContinueAd();
  }
}

function pauseGame(reason = 'manual') {
  if (state !== 'running') return;
  pauseReason = reason;
  updateStartButtonLabel();
  refreshStatusLine();
  void syncAudio();
}

function resumeGame(reason = null) {
  if (state !== 'running') return;
  if (reason && pauseReason !== reason) return;
  pauseReason = null;
  updateStartButtonLabel();
  refreshStatusLine();
  void syncAudio();
}

function showGameOverModal() {
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  showElement(gameOverModal);
  updateRewardedContinueUi();
}

function hideGameOverModal() {
  hideElement(gameOverModal);
  updateRewardedContinueUi();
}

function endRun() {
  state = 'gameover';
  pauseReason = null;
  heroModeSec = 0;
  reviveShieldSec = 0;
  updateStartButtonLabel();

  if (score > best) {
    best = score;
    void persistBest();
  }

  if (combo > bestCombo) {
    bestCombo = combo;
    void persistBestCombo();
  }

  setStatus('RUN END', 1.1);
  sfx.over();
  void syncAudio();
  updateHud();
  showGameOverModal();

  if (rewardedAdSupported && rewardedAdStatus !== 'ready') {
    preloadRewardedContinueAd();
  }
}

function getLaneFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (W / rect.width);

  if (x < W / 3) return 0;
  if (x < (W * 2) / 3) return 1;
  return 2;
}

function updateGame(dt) {
  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) {
      messageTimer = 0;
      refreshStatusLine();
    }
  }

  for (let i = 0; i < laneFlash.length; i += 1) {
    laneFlash[i] = Math.max(0, laneFlash[i] - dt * 3.8);
  }

  heroX = lerp(heroX, LANES[targetLane], clamp(dt * 12, 0, 1));
  shake = Math.max(0, shake - dt * 20);

  for (let i = slashFx.length - 1; i >= 0; i -= 1) {
    const fx = slashFx[i];
    fx.life -= dt;
    if (fx.life <= 0) {
      slashFx.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.986;
    p.vy *= 0.986;
    p.vy += 0.018;
  }

  if (!isGameplayActive()) {
    return;
  }

  songClockFallbackSec += dt;
  if (!Number.isNaN(bgmAudio.currentTime) && bgmAudio.currentTime > 0) {
    songClockFallbackSec = bgmAudio.currentTime;
  }

  if (heroModeSec > 0) {
    heroModeSec = Math.max(0, heroModeSec - dt);
  }

  if (reviveShieldSec > 0) {
    reviveShieldSec = Math.max(0, reviveShieldSec - dt);
  }

  const beatFloat = getSongSeconds() / BEAT_SEC;
  const beatIndex = Math.floor(beatFloat);

  if (beatIndex > lastBeatIndex) {
    for (let beat = lastBeatIndex + 1; beat <= beatIndex; beat += 1) {
      handleBeat(beat);
    }
    lastBeatIndex = beatIndex;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * dt;
    enemy.phase += dt * 5.6;

    if (enemy.y > HERO_Y + 50) {
      enemies.splice(i, 1);
      loseHp();
    }
  }

  if (score > best) {
    best = score;
  }

  updateHud();
}

function drawBackground(songSec) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, heroModeSec > 0 ? '#31113b' : '#170f32');
  grad.addColorStop(0.44, '#0b1430');
  grad.addColorStop(1, '#060b16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const sunPulse = 0.5 + Math.sin(songSec * 0.9) * 0.07;
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.18, H * (0.1 + sunPulse * 0.015), 0, Math.PI * 2);
  ctx.fillStyle = heroModeSec > 0 ? 'rgba(255, 215, 99, 0.85)' : 'rgba(255, 102, 151, 0.72)';
  ctx.fill();

  const horizonY = H * 0.33;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.fillRect(0, horizonY, W, H - horizonY);

  const scroll = (songSec * 180) % 40;
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.23)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 26; i += 1) {
    const y = horizonY + i * i * 1.32 + scroll;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  for (let i = -4; i <= 4; i += 1) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 + t * 6, horizonY);
    ctx.lineTo(W * 0.5 + t * W * 0.52, H);
    ctx.stroke();
  }
}

function drawLanes(beatPulse) {
  for (let lane = 0; lane < LANES.length; lane += 1) {
    const x = LANES[lane];
    const flash = laneFlash[lane];

    ctx.strokeStyle = `rgba(${lane === 1 ? '255, 46, 151' : '0, 234, 255'}, ${0.22 + flash * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.35);
    ctx.lineTo(x, H - 30);
    ctx.stroke();
  }

  const lineAlpha = 0.26 + beatPulse * 0.5;
  ctx.strokeStyle = `rgba(0, 234, 255, ${lineAlpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(34, HIT_LINE_Y);
  ctx.lineTo(W - 34, HIT_LINE_Y);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 212, 99, ${0.58 + beatPulse * 0.3})`;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('NEON HIT', W / 2, HIT_LINE_Y - 10);
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.sin(enemy.phase) * 0.07);

    const glow = 0.4 + Math.sin(enemy.phase * 2.4) * 0.2;
    ctx.fillStyle = `rgba(255, 53, 141, ${0.74 + glow * 0.14})`;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(17, 2);
    ctx.lineTo(0, 22);
    ctx.lineTo(-17, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 234, 188, 0.9)';
    ctx.fillRect(-9, -4, 18, 6);
    ctx.restore();
  }
}

function drawHero(songSec) {
  const bob = Math.sin(songSec * 7.5) * 2;

  ctx.save();
  ctx.translate(heroX, HERO_Y + bob);

  const bodyGlow = heroModeSec > 0 ? 'rgba(255, 214, 102, 0.95)' : 'rgba(77, 211, 255, 0.95)';
  ctx.fillStyle = bodyGlow;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(18, -10);
  ctx.lineTo(12, 24);
  ctx.lineTo(-12, 24);
  ctx.lineTo(-18, -10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(12, 22, 44, 0.88)';
  ctx.beginPath();
  ctx.arc(0, -7, 9, 0, Math.PI * 2);
  ctx.fill();

  if (reviveShieldSec > 0) {
    const shieldPulse = 0.4 + Math.sin(songSec * 12) * 0.2;
    ctx.strokeStyle = `rgba(104, 249, 184, ${0.55 + shieldPulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -3, 34 + shieldPulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSlashFx() {
  for (const fx of slashFx) {
    const alpha = clamp(fx.life / fx.maxLife, 0, 1);
    const x = LANES[fx.lane];
    const color = fx.verdict === 'perfect'
      ? `rgba(255, 218, 114, ${alpha})`
      : fx.verdict === 'good'
        ? `rgba(125, 231, 255, ${alpha})`
        : `rgba(255, 116, 154, ${alpha})`;

    ctx.strokeStyle = color;
    ctx.lineWidth = 6 * alpha + 2;
    ctx.beginPath();
    ctx.moveTo(x - 34 - (1 - alpha) * 24, HIT_LINE_Y - 14);
    ctx.lineTo(x + 34 + (1 - alpha) * 24, HIT_LINE_Y + 14);
    ctx.stroke();
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color.replace('ALPHA', alpha.toFixed(3));
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
}

function drawOverlayText(title, subtitle) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f5f7ff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(title, W / 2, H * 0.46);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#d5e2ff';
  ctx.fillText(subtitle, W / 2, H * 0.5 + 14);
}

function render() {
  const beatFloat = getSongSeconds() / BEAT_SEC;
  const beatFrac = beatFloat - Math.floor(beatFloat);
  const beatPulse = Math.pow(1 - clamp(Math.abs(beatFrac) * 2, 0, 1), 2);

  ctx.save();
  if (shake > 0) {
    ctx.translate((random() - 0.5) * shake, (random() - 0.5) * shake);
  }

  const songSec = getSongSeconds();
  drawBackground(songSec);
  drawLanes(beatPulse);
  drawEnemies();
  drawHero(songSec);
  drawSlashFx();
  drawParticles();

  if (heroModeSec > 0) {
    ctx.fillStyle = 'rgba(255, 214, 102, 0.14)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255, 236, 183, 0.88)';
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`HERO x2 ${heroModeSec.toFixed(1)}s`, W - 16, 24);
  }

  if (reviveShieldSec > 0) {
    ctx.fillStyle = 'rgba(143, 255, 208, 0.8)';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`SHIELD ${reviveShieldSec.toFixed(1)}s`, W / 2, HIT_LINE_Y + 28);
  }

  if (state === 'idle') {
    drawOverlayText('TAP START', '레인을 눌러 비트 전투 시작');
  } else if (state === 'running' && pauseReason) {
    drawOverlayText('PAUSED', '돌아오면 즉시 이어집니다');
  }

  ctx.restore();
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

  if (!shouldShow) return;

  let buttonLabel = '광고 준비 중...';
  let hint = '광고를 불러오는 중입니다. 준비되면 이어하기를 사용할 수 있어요.';
  let disabled = true;

  if (rewardedContinueUsed) {
    buttonLabel = '이번 런은 이어하기 사용 완료';
    hint = '보상형 이어하기는 라운드당 1회만 제공됩니다.';
  } else if (rewardedAdStatus === 'ready') {
    buttonLabel = '광고 보고 이어하기';
    hint = '광고 시청 완료 시 HP 1 회복 + 잠깐 보호막으로 이어집니다.';
    disabled = false;
  } else if (rewardedAdStatus === 'showing') {
    buttonLabel = '광고 재생 중...';
    hint = '광고 종료 후 결과를 반영합니다.';
  } else if (rewardedAdStatus === 'failed') {
    buttonLabel = '광고 재시도 중...';
    hint = '광고 준비에 실패했어요. 잠시 후 자동으로 다시 시도합니다.';
  }

  btnRewardContinue.textContent = buttonLabel;
  btnRewardContinue.disabled = disabled;
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

function grantRewardedContinue() {
  if (state !== 'gameover' || rewardedContinueUsed) return;

  rewardedContinueUsed = true;
  rewardedAdRewardGranted = false;

  state = 'running';
  pauseReason = null;
  hp = Math.max(1, hp);
  combo = 0;
  heroModeSec = Math.max(heroModeSec, 2.2);
  reviveShieldSec = REVIVE_SHIELD_SEC;
  enemies.length = 0;

  addBurst(heroX, HERO_Y - 20, '#7fffd4', 26, 5.1);
  setStatus('광고 보상: 이어하기 성공!', 1.2);

  hideGameOverModal();
  updateStartButtonLabel();
  updateHud();
  void syncAudio();

  preloadRewardedContinueAd();
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
            setRewardedAdStatus('failed');
            scheduleRewardedAdReload();
          }
          break;
        case 'failedToShow':
          clearRewardedAdShowSubscription();
          rewardedAdRewardGranted = false;
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
      // Ignore and fallback to explicit load.
    }
  }

  preloadRewardedContinueAd();
}

function openInfoModal() {
  if (state === 'running' && !pauseReason) {
    pauseGame('info');
  }
  showElement(infoModal);
}

function closeInfoModal() {
  hideElement(infoModal);
  if (pauseReason === 'info') {
    resumeGame('info');
  }
}

function openExitModal() {
  if (state === 'running' && !pauseReason) {
    pauseGame('exit');
  }
  showElement(exitModal);
}

function closeExitModal() {
  hideElement(exitModal);
  if (pauseReason === 'exit') {
    resumeGame('exit');
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

  const closed = await toss.closeView();
  if (closed !== false) {
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = new URL('../', window.location.href).toString();
}

async function persistBest() {
  const value = String(best);
  safeLocalStorageSet(LEGACY_BEST_KEY, value);
  await toss.storage.setItem(getScopedStorageKey('best'), value);
}

async function persistBestCombo() {
  const value = String(bestCombo);
  safeLocalStorageSet(LEGACY_BEST_COMBO_KEY, value);
  await toss.storage.setItem(getScopedStorageKey('bestCombo'), value);
}

async function persistSettings() {
  const raw = JSON.stringify(settings);
  safeLocalStorageSet(LEGACY_SETTINGS_KEY, raw);
  await toss.storage.setItem(getScopedStorageKey('settings'), raw);
}

async function loadPersistedState() {
  const scopedBest = Number(await toss.storage.getItem(getScopedStorageKey('best')) || 0);
  const legacyBest = Number(safeLocalStorageGet(LEGACY_BEST_KEY) || 0);
  best = Math.max(scopedBest, legacyBest);

  const scopedBestCombo = Number(await toss.storage.getItem(getScopedStorageKey('bestCombo')) || 0);
  const legacyBestCombo = Number(safeLocalStorageGet(LEGACY_BEST_COMBO_KEY) || 0);
  bestCombo = Math.max(scopedBestCombo, legacyBestCombo);

  const scopedSettings = await toss.storage.getItem(getScopedStorageKey('settings'));
  const legacySettings = safeLocalStorageGet(LEGACY_SETTINGS_KEY);
  const settingsRaw = scopedSettings || legacySettings;

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
  if (best > 0) {
    void persistBest();
  }
  if (bestCombo > 0) {
    void persistBestCombo();
  }
  void persistSettings();
}

async function initializeTossBridge() {
  updateBridgeBadge('웹 미리보기', 'badge-preview');
  userKeyHintEl.textContent = '브라우저에서도 동일한 리듬 전투 흐름을 테스트할 수 있어요.';

  if (toss.isAvailable()) {
    try {
      const insets = await toss.safeArea.get();
      applySafeAreaInsets(insets);
    } catch (error) {
      applySafeAreaInsets(null);
    }

    unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
      applySafeAreaInsets(insets);
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
      pauseGame('background');
    }
  });

  const userKeyResult = await toss.getUserKeyForGame();

  if (userKeyResult && userKeyResult.type === 'HASH' && userKeyResult.hash) {
    userHash = userKeyResult.hash;
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '최고 기록과 사운드 설정이 토스 게임 계정 기준으로 저장됩니다.';
  } else if (typeof userKeyResult === 'string' && userKeyResult.trim()) {
    userHash = userKeyResult.trim();
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '토스 계정 키를 받아 개인 기록 저장을 활성화했습니다.';
  } else if (toss.isAvailable()) {
    updateBridgeBadge('토스 미리보기', 'badge-fallback');
    userKeyHintEl.textContent = '토스 브리지는 연결됐지만 유저 키를 받지 못해 로컬 저장소를 병행합니다.';
  }

  await loadPersistedState();
  await initializeRewardedAds();
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (state === 'running' && !pauseReason) {
      pauseGame('background');
    } else {
      void syncAudio();
    }
    return;
  }

  if (pauseReason === 'background') {
    resumeGame('background');
  } else {
    void syncAudio();
  }
}

function loop(timestamp) {
  if (!lastFrameTs) {
    lastFrameTs = timestamp;
  }

  const dt = clamp((timestamp - lastFrameTs) / 1000, 0, 0.05);
  lastFrameTs = timestamp;

  updateGame(dt);
  render();

  window.requestAnimationFrame(loop);
}

function handleStartButtonClick() {
  void unlockAudio();

  if (state === 'idle' || state === 'gameover') {
    startRun();
    return;
  }

  if (state === 'running' && !pauseReason) {
    pauseGame('manual');
    return;
  }

  if (state === 'running' && pauseReason === 'manual') {
    resumeGame('manual');
  }
}

function handleCanvasPointerDown(event) {
  event.preventDefault();

  const lane = getLaneFromClientX(event.clientX);

  if (state === 'idle') {
    startRun();
    return;
  }

  if (state === 'gameover') {
    return;
  }

  attemptAttack(lane);
}

function bindEvents() {
  window.addEventListener('resize', () => {
    // Stage ratio is fixed by CSS; no runtime resize needed.
  });

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => {
    if (state === 'running' && !pauseReason) {
      pauseGame('background');
    }
  });

  window.addEventListener('pageshow', () => {
    if (pauseReason === 'background') {
      resumeGame('background');
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      handleBackRequest();
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      if (state === 'idle') {
        startRun();
      } else if (state === 'running' && !pauseReason) {
        attemptAttack(targetLane);
      }
      return;
    }

    if (event.code === 'Digit1' || event.code === 'KeyA' || event.code === 'ArrowLeft') {
      event.preventDefault();
      attemptAttack(0);
      return;
    }

    if (event.code === 'Digit2' || event.code === 'KeyS' || event.code === 'ArrowUp') {
      event.preventDefault();
      attemptAttack(1);
      return;
    }

    if (event.code === 'Digit3' || event.code === 'KeyD' || event.code === 'ArrowRight') {
      event.preventDefault();
      attemptAttack(2);
    }
  });

  canvas.addEventListener('pointerdown', handleCanvasPointerDown, { passive: false });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  btnStart.addEventListener('click', handleStartButtonClick);
  btnMusic.addEventListener('click', async () => {
    await unlockAudio();
    settings.musicEnabled = !settings.musicEnabled;
    updateAudioButtons();
    void persistSettings();
    void syncAudio();
    sfx.ui();
  });

  btnSfx.addEventListener('click', async () => {
    await unlockAudio();
    settings.sfxEnabled = !settings.sfxEnabled;
    updateAudioButtons();
    void persistSettings();
    sfx.ui();
  });

  btnExit.addEventListener('click', () => {
    openExitModal();
  });

  btnInfo.addEventListener('click', () => {
    openInfoModal();
  });

  btnCloseInfo.addEventListener('click', () => {
    closeInfoModal();
  });

  infoModal.addEventListener('click', (event) => {
    if (event.target === infoModal) {
      closeInfoModal();
    }
  });

  btnCancelExit.addEventListener('click', () => {
    closeExitModal();
  });

  btnConfirmExit.addEventListener('click', () => {
    void leaveGame();
  });

  exitModal.addEventListener('click', (event) => {
    if (event.target === exitModal) {
      closeExitModal();
    }
  });

  btnRestart.addEventListener('click', () => {
    startRun();
  });

  btnGameOverExit.addEventListener('click', () => {
    void leaveGame();
  });

  btnRewardContinue.addEventListener('click', () => {
    void handleRewardContinueClick();
  });

  btnLane0.addEventListener('click', () => {
    if (state === 'idle') {
      startRun();
      return;
    }
    attemptAttack(0);
  });

  btnLane1.addEventListener('click', () => {
    if (state === 'idle') {
      startRun();
      return;
    }
    attemptAttack(1);
  });

  btnLane2.addEventListener('click', () => {
    if (state === 'idle') {
      startRun();
      return;
    }
    attemptAttack(2);
  });

  window.addEventListener('beforeunload', () => {
    unsubscribeSafeArea();
    unsubscribeBack();
    unsubscribeHome();
    clearRewardedAdRetry();
    clearRewardedAdLoadSubscription();
    clearRewardedAdShowSubscription();
    void persistBest();
    void persistBestCombo();
    void persistSettings();
  });
}

async function init() {
  updateAudioButtons();
  updateHud();
  updateStartButtonLabel();
  refreshStatusLine();
  bindEvents();
  window.requestAnimationFrame(loop);
  await initializeTossBridge();
}

void init();
