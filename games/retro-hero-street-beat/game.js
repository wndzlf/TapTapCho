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
const btnTrackPrev = document.getElementById('btnTrackPrev');
const btnTrackNext = document.getElementById('btnTrackNext');
const btnPreview = document.getElementById('btnPreview');
const btnSkin = document.getElementById('btnSkin');
const btnExit = document.getElementById('btnExit');
const btnDiffEasy = document.getElementById('btnDiffEasy');
const btnDiffNormal = document.getElementById('btnDiffNormal');
const btnDiffHard = document.getElementById('btnDiffHard');
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
const gameOverTitleEl = document.getElementById('gameOverTitle');
const finalScoreEl = document.getElementById('finalScore');
const finalBestEl = document.getElementById('finalBest');
const rewardContinueHintEl = document.getElementById('rewardContinueHint');
const trackTitleEl = document.getElementById('trackTitle');
const trackMetaEl = document.getElementById('trackMeta');
const trackDifficultyStarsEl = document.getElementById('trackDifficultyStars');
const resultAccuracyEl = document.getElementById('resultAccuracy');
const resultBreakdownEl = document.getElementById('resultBreakdown');
const resultHistogramEl = document.getElementById('resultHistogram');
const resultOffsetHintEl = document.getElementById('resultOffsetHint');

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

const SONG_LIBRARY = [
  {
    id: 'hero-80s',
    shortLabel: 'HERO 80S',
    title: 'A Hero Of The 80s',
    artist: 'Grand Project',
    audioSrc: './assets/audio/a-hero-of-the-80s-126684.mp3',
    bpm: 118,
    beatOffsetSec: 0.08,
    approachBeats: 4,
    judgeWindows: {
      perfect: 0.06,
      great: 0.11,
      good: 0.17,
      safe: 0.23,
    },
    beatmapSrc: './assets/beatmaps/a-hero-of-the-80s-126684.json',
  },
  {
    id: 'road-80s',
    shortLabel: 'ROAD 80S',
    title: 'On The Road To The Eighties',
    artist: 'Grand Project',
    audioSrc: './assets/audio/on-the-road-to-the-eighties-59sec-177566.mp3',
    bpm: 124,
    beatOffsetSec: 0.04,
    approachBeats: 4,
    judgeWindows: {
      perfect: 0.058,
      great: 0.108,
      good: 0.168,
      safe: 0.228,
    },
    beatmapSrc: './assets/beatmaps/on-the-road-to-the-eighties-59sec-177566.json',
  },
  {
    id: 'battle-chiptune',
    shortLabel: 'BATTLE',
    title: '80s Video Game Battle Chiptune',
    artist: 'NickPanekAIAssets',
    audioSrc: './assets/audio/80s-video-game-battle-chiptune-216255.mp3',
    bpm: 132,
    beatOffsetSec: 0.03,
    approachBeats: 4,
    judgeWindows: {
      perfect: 0.058,
      great: 0.108,
      good: 0.168,
      safe: 0.228,
    },
    beatmapSrc: './assets/beatmaps/80s-video-game-battle-chiptune-216255.json',
    durationSec: 205.752,
  },
  {
    id: 'happy-8bit',
    shortLabel: 'HAPPY 8BIT',
    title: 'Retro 8Bit Happy Videogame Music',
    artist: 'Niknet_Art',
    audioSrc: './assets/audio/retro-8bit-happy-videogame-music-418486.mp3',
    bpm: 128,
    beatOffsetSec: 0.04,
    approachBeats: 4,
    judgeWindows: {
      perfect: 0.06,
      great: 0.11,
      good: 0.17,
      safe: 0.23,
    },
    beatmapSrc: './assets/beatmaps/retro-8bit-happy-videogame-music-418486.json',
    durationSec: 145.632,
  },
];

const HERO_SKINS = [
  {
    id: 'neon-rider',
    label: 'NEON RIDER',
    trail: 'rgba(107, 229, 255, ALPHA)',
    trailHero: 'rgba(255, 220, 118, ALPHA)',
    boardLeft: 'rgba(72, 196, 255, 0.98)',
    boardRight: 'rgba(98, 255, 230, 0.98)',
    boardHeroLeft: 'rgba(255, 171, 72, 0.98)',
    boardHeroRight: 'rgba(255, 231, 128, 0.98)',
    suit: 'rgba(114, 236, 255, 0.96)',
    suitHero: 'rgba(255, 216, 110, 0.96)',
    helmet: 'rgba(18, 28, 55, 0.96)',
    visor: 'rgba(126, 242, 255, 0.95)',
    visorHero: 'rgba(255, 235, 148, 0.95)',
    accent: 'rgba(255, 76, 165, 0.82)',
  },
  {
    id: 'sunset-pilot',
    label: 'SUNSET PILOT',
    trail: 'rgba(255, 164, 122, ALPHA)',
    trailHero: 'rgba(255, 235, 150, ALPHA)',
    boardLeft: 'rgba(255, 133, 102, 0.98)',
    boardRight: 'rgba(255, 224, 136, 0.98)',
    boardHeroLeft: 'rgba(255, 196, 92, 0.98)',
    boardHeroRight: 'rgba(255, 244, 174, 0.98)',
    suit: 'rgba(255, 166, 123, 0.96)',
    suitHero: 'rgba(255, 224, 150, 0.96)',
    helmet: 'rgba(52, 24, 49, 0.96)',
    visor: 'rgba(255, 213, 164, 0.95)',
    visorHero: 'rgba(255, 242, 190, 0.95)',
    accent: 'rgba(255, 101, 168, 0.82)',
  },
  {
    id: 'midnight-cyan',
    label: 'MIDNIGHT CYAN',
    trail: 'rgba(121, 172, 255, ALPHA)',
    trailHero: 'rgba(146, 252, 240, ALPHA)',
    boardLeft: 'rgba(92, 136, 255, 0.98)',
    boardRight: 'rgba(109, 240, 255, 0.98)',
    boardHeroLeft: 'rgba(115, 237, 255, 0.98)',
    boardHeroRight: 'rgba(155, 255, 226, 0.98)',
    suit: 'rgba(146, 177, 255, 0.96)',
    suitHero: 'rgba(140, 247, 255, 0.96)',
    helmet: 'rgba(18, 26, 62, 0.96)',
    visor: 'rgba(152, 239, 255, 0.95)',
    visorHero: 'rgba(176, 255, 226, 0.95)',
    accent: 'rgba(255, 119, 212, 0.82)',
  },
];

const DIFFICULTY_PRESETS = [
  {
    id: 'easy',
    label: 'EASY',
    judgeScale: 1.18,
    spawnScale: 0.78,
    scoreScale: 0.92,
    approachScale: 1.1,
    missGaugeDrain: 0.65,
  },
  {
    id: 'normal',
    label: 'NORMAL',
    judgeScale: 1,
    spawnScale: 1,
    scoreScale: 1,
    approachScale: 1,
    missGaugeDrain: 1,
  },
  {
    id: 'hard',
    label: 'HARD',
    judgeScale: 0.86,
    spawnScale: 1.24,
    scoreScale: 1.18,
    approachScale: 0.9,
    missGaugeDrain: 1.35,
  },
];

const MAX_HP = 3;
const HERO_GAUGE_TARGET = 12;
const HERO_MODE_DURATION = 8;
const REVIVE_SHIELD_SEC = 2.2;
const DEFAULT_APPROACH_BEATS = 4;
const DEFAULT_JUDGE_WINDOWS_SEC = {
  perfect: 0.06,
  great: 0.11,
  good: 0.17,
  safe: 0.23,
};
const SAFE_PASS_GRACE_SEC = 0.07;
const SAFE_AUTOLANE_NUDGE_SEC = 0.09;
const PREVIEW_DURATION_SEC = 5;
const AD_RESULT_BONUS_RATIO = 0.15;
const MAX_BEATS_WITHOUT_SPAWN = 3.2;
const CHORD_LINK_SEC = 0.055;
const SPAWN_GUARD_CHECK_SEC = 0.2;

const ENEMY_SPAWN_Y = -82;
const HERO_Y = H - 134;
const HIT_LINE_Y = H - 228;
const LANES = [W * 0.21, W * 0.5, W * 0.79];

const audioCtx = window.AudioContext ? new AudioContext() : null;
const beatmapCache = new Map();
const impactAnalysisCache = new Map();

const settings = {
  musicEnabled: true,
  sfxEnabled: true,
  songId: SONG_LIBRARY[0].id,
  skinId: HERO_SKINS[0].id,
  difficultyId: 'normal',
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
let selectedSongIndex = 0;
let activeSong = SONG_LIBRARY[0];
let selectedDifficultyId = 'normal';
let difficultyPreset = DIFFICULTY_PRESETS.find((item) => item.id === selectedDifficultyId) || DIFFICULTY_PRESETS[1];
let beatSec = 60 / activeSong.bpm;
let songBeatOffsetSec = Number(activeSong.beatOffsetSec || 0);
let approachBeats = Number(activeSong.approachBeats || DEFAULT_APPROACH_BEATS) * difficultyPreset.approachScale;
let approachSec = approachBeats * beatSec;
let impactLookaheadBeats = approachBeats;
let judgeWindowsSec = {
  perfect: DEFAULT_JUDGE_WINDOWS_SEC.perfect,
  great: DEFAULT_JUDGE_WINDOWS_SEC.great,
  good: DEFAULT_JUDGE_WINDOWS_SEC.good,
  safe: DEFAULT_JUDGE_WINDOWS_SEC.safe,
};
let activeBeatmap = null;
let activeBeatMarkers = new Map();
let activeBeatmapSections = [];
let bgmAudio = null;
let selectedSkinIndex = 0;
let activeSongDurationSec = 0;
let missCount = 0;
let lastSpawnBeat = -999;
let hudRefreshCooldownSec = 0;
let previewTimeoutId = 0;
let spawnGuardCooldownSec = 0;
let lastTouchInputAtMs = 0;

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
const timingFeedback = {
  label: '',
  color: 'rgba(255, 236, 183, ALPHA)',
  life: 0,
  maxLife: 0,
  x: W * 0.5,
};

const verdictStats = {
  perfect: 0,
  great: 0,
  good: 0,
  safe: 0,
  miss: 0,
};

const timingBuckets = [
  { key: 'EARLY+', count: 0 },
  { key: 'EARLY', count: 0 },
  { key: 'CENTER', count: 0 },
  { key: 'LATE', count: 0 },
  { key: 'LATE+', count: 0 },
];

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

function colorAlpha(color, alpha) {
  return color.replace('ALPHA', clamp(alpha, 0, 1).toFixed(3));
}

function beatToSongSec(beatIndex) {
  return beatIndex * beatSec;
}

function random() {
  const x = Math.sin(spawnSeed * 12.9898) * 43758.5453;
  spawnSeed += 1;
  return x - Math.floor(x);
}

function createBgmAudio(audioSrc) {
  const audio = new Audio(audioSrc);
  audio.loop = false;
  audio.preload = 'auto';
  audio.volume = 0.58;
  audio.setAttribute('playsinline', '');
  return audio;
}

function setBgmAudioSource(audioSrc) {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.src = '';
    bgmAudio.load();
  }

  bgmAudio = createBgmAudio(audioSrc);
}

function ensureBgmReadyForRun() {
  stopTrackPreview({ rewind: true });

  let expectedSrc = '';
  try {
    expectedSrc = new URL(activeSong.audioSrc, window.location.href).toString();
  } catch (error) {
    expectedSrc = activeSong.audioSrc;
  }

  if (!bgmAudio || !bgmAudio.src || bgmAudio.src !== expectedSrc) {
    setBgmAudioSource(activeSong.audioSrc);
    return;
  }

  bgmAudio.pause();
  try {
    bgmAudio.currentTime = 0;
  } catch (error) {
    setBgmAudioSource(activeSong.audioSrc);
  }
}

function getSongDifficultyStars(song, difficultyId) {
  const bpm = Number(song?.bpm || 120);
  const base = clamp(Math.round((bpm - 96) / 18) + 2, 2, 5);
  if (difficultyId === 'easy') return clamp(base - 1, 1, 5);
  if (difficultyId === 'hard') return clamp(base + 1, 1, 5);
  return base;
}

function starsText(count) {
  const full = '★'.repeat(clamp(Math.round(count), 0, 5));
  const empty = '☆'.repeat(Math.max(0, 5 - full.length));
  return `${full}${empty}`;
}

function updateTrackDifficultyStars() {
  if (!trackDifficultyStarsEl) return;
  const easy = getSongDifficultyStars(activeSong, 'easy');
  const normal = getSongDifficultyStars(activeSong, 'normal');
  const hard = getSongDifficultyStars(activeSong, 'hard');
  trackDifficultyStarsEl.textContent = `EASY ${starsText(easy)} · NORMAL ${starsText(normal)} · HARD ${starsText(hard)}`;
}

function setPreviewButtonState(active, label = '미리듣기 5초') {
  if (!btnPreview) return;
  btnPreview.dataset.active = active ? 'true' : 'false';
  btnPreview.textContent = label;
}

function clearPreviewTimer() {
  if (!previewTimeoutId) return;
  window.clearTimeout(previewTimeoutId);
  previewTimeoutId = 0;
}

function stopTrackPreview({ rewind = false } = {}) {
  clearPreviewTimer();
  if (!btnPreview) return;
  setPreviewButtonState(false, '미리듣기 5초');
  if (state === 'running') return;
  if (!bgmAudio) return;
  bgmAudio.pause();
  if (rewind) {
    bgmAudio.currentTime = 0;
  }
}

async function previewCurrentTrack() {
  if (!btnPreview || state === 'running') {
    return;
  }

  await unlockAudio();
  if (!bgmAudio) {
    setBgmAudioSource(activeSong.audioSrc);
  }

  const isActive = btnPreview.dataset.active === 'true';
  if (isActive) {
    stopTrackPreview({ rewind: true });
    setStatus('미리듣기 정지', 0.5);
    return;
  }

  clearPreviewTimer();
  let startSec = 6;
  if (Number.isFinite(bgmAudio.duration) && bgmAudio.duration > PREVIEW_DURATION_SEC + 6) {
    startSec = clamp(bgmAudio.duration * 0.18, 4, 16);
  }
  bgmAudio.currentTime = startSec;

  const playPromise = bgmAudio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }

  setPreviewButtonState(true, '미리듣기 중...');
  setStatus('트랙 미리듣기 5초', 0.7);

  previewTimeoutId = window.setTimeout(() => {
    previewTimeoutId = 0;
    stopTrackPreview({ rewind: true });
  }, PREVIEW_DURATION_SEC * 1000);
}

function updateTrackDisplay() {
  if (trackTitleEl) {
    trackTitleEl.textContent = activeSong.title || activeSong.shortLabel || 'Unknown Track';
  }
  if (trackMetaEl) {
    trackMetaEl.textContent = `${activeSong.artist || 'Unknown Artist'} · ${Math.round(60 / beatSec)} BPM · ${difficultyPreset.label}`;
  }
  updateTrackDifficultyStars();
}

function updateSkinButtonLabel() {
  if (!btnSkin) return;
  const skin = HERO_SKINS[selectedSkinIndex] || HERO_SKINS[0];
  btnSkin.textContent = `스킨: ${skin.label}`;
}

function updateDifficultyButtons() {
  const nextId = selectedDifficultyId;
  btnDiffEasy?.classList.toggle('is-active', nextId === 'easy');
  btnDiffNormal?.classList.toggle('is-active', nextId === 'normal');
  btnDiffHard?.classList.toggle('is-active', nextId === 'hard');
}

function getCurrentSkin() {
  return HERO_SKINS[selectedSkinIndex] || HERO_SKINS[0];
}

function normalizeBeatmap(rawBeatmap) {
  const markers = new Map();
  const sections = [];

  const markerWeightByStrength = {
    light: 0.7,
    accent: 1.0,
    strong: 1.2,
    drop: 1.35,
  };

  if (Array.isArray(rawBeatmap?.markers)) {
    for (const marker of rawBeatmap.markers) {
      const beat = Number(marker?.beat);
      if (!Number.isFinite(beat)) continue;

      let weight = Number(marker?.weight);
      if (!Number.isFinite(weight)) {
        weight = markerWeightByStrength[String(marker?.strength || '').toLowerCase()] || 1;
      }

      markers.set(Math.round(beat), {
        weight: clamp(weight, 0.35, 1.55),
        forceSpawn: marker?.forceSpawn === true,
        timeSec: Number.isFinite(Number(marker?.timeSec))
          ? Number(marker.timeSec)
          : undefined,
      });
    }
  }

  if (Array.isArray(rawBeatmap?.sections)) {
    for (const section of rawBeatmap.sections) {
      const fromBeat = Number(section?.fromBeat);
      const toBeat = Number(section?.toBeat);
      if (!Number.isFinite(fromBeat) || !Number.isFinite(toBeat)) continue;
      if (toBeat < fromBeat) continue;

      sections.push({
        fromBeat: Math.floor(fromBeat),
        toBeat: Math.floor(toBeat),
        density: Number(section?.density),
        doubleChance: Number(section?.doubleChance),
        burstChance: Number(section?.burstChance),
      });
    }
  }

  return {
    markerMap: markers,
    sections,
  };
}

function getBeatmapMarker(beatIndex) {
  return activeBeatMarkers.get(beatIndex) || null;
}

function getBeatmapSectionProfile(beatIndex) {
  for (const section of activeBeatmapSections) {
    if (beatIndex >= section.fromBeat && beatIndex <= section.toBeat) {
      return section;
    }
  }
  return null;
}

function mergeBeatmaps(manualBeatmap, analyzedBeatmap) {
  const mergedMarkers = new Map();
  const mergedSections = [];

  for (const [beat, marker] of (manualBeatmap?.markerMap || new Map()).entries()) {
    mergedMarkers.set(beat, { ...marker });
  }

  for (const [beat, marker] of (analyzedBeatmap?.markerMap || new Map()).entries()) {
    const existing = mergedMarkers.get(beat);
    if (!existing || (existing.weight || 0) < (marker.weight || 0)) {
      mergedMarkers.set(beat, { ...marker });
    } else if (marker.forceSpawn) {
      existing.forceSpawn = true;
      if (!Number.isFinite(existing.timeSec) && Number.isFinite(marker.timeSec)) {
        existing.timeSec = marker.timeSec;
      }
    }
  }

  if (Array.isArray(manualBeatmap?.sections) && manualBeatmap.sections.length > 0) {
    mergedSections.push(...manualBeatmap.sections);
  } else if (Array.isArray(analyzedBeatmap?.sections) && analyzedBeatmap.sections.length > 0) {
    mergedSections.push(...analyzedBeatmap.sections);
  }

  return {
    markerMap: mergedMarkers,
    sections: mergedSections,
    durationSec: Number(analyzedBeatmap?.durationSec || manualBeatmap?.durationSec || 0),
  };
}

async function loadManualBeatmap(song) {
  if (!song?.beatmapSrc) {
    return { markerMap: new Map(), sections: [] };
  }

  try {
    const response = await fetch(song.beatmapSrc, { cache: 'no-store' });
    if (!response.ok) {
      return { markerMap: new Map(), sections: [] };
    }
    const json = await response.json();
    return normalizeBeatmap(json);
  } catch (error) {
    return { markerMap: new Map(), sections: [] };
  }
}

async function analyzeSongImpacts(song) {
  if (impactAnalysisCache.has(song.id)) {
    return impactAnalysisCache.get(song.id);
  }

  const fallback = { markerMap: new Map(), sections: [], durationSec: Number(song.durationSec || 0) };
  try {
    const response = await fetch(song.audioSrc, { cache: 'force-cache' });
    if (!response.ok) {
      impactAnalysisCache.set(song.id, fallback);
      return fallback;
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      impactAnalysisCache.set(song.id, fallback);
      return fallback;
    }

    let decodeContext = audioCtx;
    let temporaryContext = null;
    if (!decodeContext) {
      temporaryContext = new Ctx();
      decodeContext = temporaryContext;
    }

    const decoded = await decodeContext.decodeAudioData(audioArrayBuffer.slice(0));
    if (temporaryContext) {
      void temporaryContext.close();
    }

    const source = decoded.getChannelData(0);
    const sampleRate = decoded.sampleRate;
    const hopSize = Math.max(256, Math.floor(sampleRate / 110));
    const frames = Math.max(1, Math.floor(source.length / hopSize));
    const energies = new Float32Array(frames);

    for (let frame = 0; frame < frames; frame += 1) {
      const frameStart = frame * hopSize;
      let sum = 0;
      let count = 0;
      for (let offset = 0; offset < hopSize; offset += 4) {
        const idx = frameStart + offset;
        if (idx >= source.length) break;
        const sample = source[idx];
        sum += sample * sample;
        count += 1;
      }
      energies[frame] = count > 0 ? Math.sqrt(sum / count) : 0;
    }

    const markerMap = new Map();
    const refractoryFrames = Math.max(1, Math.round((0.11 * sampleRate) / hopSize));
    const movingWindow = 18;
    let cooldown = 0;

    for (let frame = 3; frame < frames - 3; frame += 1) {
      const energy = energies[frame];
      const from = Math.max(0, frame - movingWindow);
      const to = Math.min(frames - 1, frame + movingWindow);
      let mean = 0;
      for (let i = from; i <= to; i += 1) {
        mean += energies[i];
      }
      mean /= (to - from + 1);

      const threshold = mean * 1.35 + 0.009;
      const localPeak = energy >= energies[frame - 1]
        && energy >= energies[frame + 1]
        && energy >= energies[frame - 2]
        && energy >= energies[frame + 2];

      if (cooldown > 0) {
        cooldown -= 1;
        continue;
      }

      if (!localPeak || energy < threshold) {
        continue;
      }

      const timeSec = (frame * hopSize) / sampleRate - Number(song.beatOffsetSec || 0);
      const beat = Math.round(timeSec / (60 / Number(song.bpm || 120)));
      if (beat < 0) {
        cooldown = Math.max(1, Math.floor(refractoryFrames * 0.5));
        continue;
      }

      const ratio = (energy - mean) / Math.max(0.001, mean);
      const weight = clamp(0.72 + ratio * 0.46, 0.72, 1.5);
      const prev = markerMap.get(beat);
      if (!prev || prev.weight < weight) {
        markerMap.set(beat, {
          weight,
          forceSpawn: weight > 1.28,
          timeSec,
        });
      }

      cooldown = refractoryFrames;
    }

    const totalBeats = Math.max(1, Math.ceil((decoded.duration - Number(song.beatOffsetSec || 0)) / (60 / Number(song.bpm || 120))));
    const sections = [];
    for (let fromBeat = 0; fromBeat < totalBeats; fromBeat += 16) {
      const toBeat = Math.min(totalBeats - 1, fromBeat + 15);
      let hitCount = 0;
      let strongCount = 0;

      for (let beat = fromBeat; beat <= toBeat; beat += 1) {
        const marker = markerMap.get(beat);
        if (!marker) continue;
        hitCount += 1;
        if (marker.weight > 1.12) {
          strongCount += 1;
        }
      }

      const density = clamp(0.34 + hitCount * 0.043, 0.3, 0.96);
      const doubleChance = clamp(0.03 + strongCount * 0.04, 0.02, 0.58);
      const burstChance = clamp((strongCount - 1) * 0.022, 0, 0.24);

      sections.push({
        fromBeat,
        toBeat,
        density,
        doubleChance,
        burstChance,
      });
    }

    const analyzed = {
      markerMap,
      sections,
      durationSec: decoded.duration,
    };
    impactAnalysisCache.set(song.id, analyzed);
    return analyzed;
  } catch (error) {
    impactAnalysisCache.set(song.id, fallback);
    return fallback;
  }
}

async function loadBeatmapForSong(song) {
  if (beatmapCache.has(song.id)) {
    const cached = beatmapCache.get(song.id);
    activeBeatmap = cached;
    activeBeatMarkers = cached.markerMap;
    activeBeatmapSections = cached.sections;
    return;
  }

  const [manual, analyzed] = await Promise.all([
    loadManualBeatmap(song),
    analyzeSongImpacts(song),
  ]);

  const merged = mergeBeatmaps(manual, analyzed);
  beatmapCache.set(song.id, merged);

  if (activeSong.id === song.id) {
    activeBeatmap = merged;
    activeBeatMarkers = merged.markerMap;
    activeBeatmapSections = merged.sections;
    if (Number.isFinite(merged.durationSec) && merged.durationSec > 0) {
      activeSongDurationSec = merged.durationSec;
    }
  }
}

async function applySongByIndex(nextIndex) {
  if (SONG_LIBRARY.length === 0) return;
  const normalized = ((nextIndex % SONG_LIBRARY.length) + SONG_LIBRARY.length) % SONG_LIBRARY.length;
  selectedSongIndex = normalized;
  activeSong = SONG_LIBRARY[normalized];
  settings.songId = activeSong.id;
  refreshSongTimingRuntime();
  activeSongDurationSec = Number(activeSong.durationSec || 0);
  setBgmAudioSource(activeSong.audioSrc);
  bgmAudio.addEventListener('loadedmetadata', () => {
    if (activeSong.id === SONG_LIBRARY[selectedSongIndex].id && Number.isFinite(bgmAudio.duration) && bgmAudio.duration > 0) {
      activeSongDurationSec = bgmAudio.duration;
    }
  }, { once: true });
  updateTrackDisplay();
  await loadBeatmapForSong(activeSong);
}

function findSongIndexById(songId) {
  if (!songId) return -1;
  return SONG_LIBRARY.findIndex((song) => song.id === songId);
}

function applySkinByIndex(nextIndex) {
  if (HERO_SKINS.length === 0) return;
  const normalized = ((nextIndex % HERO_SKINS.length) + HERO_SKINS.length) % HERO_SKINS.length;
  selectedSkinIndex = normalized;
  settings.skinId = HERO_SKINS[selectedSkinIndex].id;
  updateSkinButtonLabel();
}

function refreshSongTimingRuntime() {
  const baseWindows = {
    ...DEFAULT_JUDGE_WINDOWS_SEC,
    ...(activeSong.judgeWindows || {}),
  };
  const judgeScale = Number(difficultyPreset?.judgeScale || 1);
  beatSec = 60 / Number(activeSong.bpm || 120);
  songBeatOffsetSec = Number(activeSong.beatOffsetSec || 0);
  approachBeats = clamp(
    Number(activeSong.approachBeats || DEFAULT_APPROACH_BEATS) * Number(difficultyPreset?.approachScale || 1),
    2.6,
    5.4,
  );
  approachSec = approachBeats * beatSec;
  impactLookaheadBeats = approachBeats;
  judgeWindowsSec = {
    perfect: baseWindows.perfect * judgeScale,
    great: baseWindows.great * judgeScale,
    good: baseWindows.good * judgeScale,
    safe: baseWindows.safe * judgeScale,
  };
}

function applyDifficultyById(nextDifficultyId) {
  const found = DIFFICULTY_PRESETS.find((item) => item.id === nextDifficultyId) || DIFFICULTY_PRESETS[1];
  selectedDifficultyId = found.id;
  difficultyPreset = found;
  settings.difficultyId = found.id;
  refreshSongTimingRuntime();
  updateDifficultyButtons();
  updateTrackDisplay();
}

function getActiveSongDurationSec() {
  if (Number.isFinite(activeSongDurationSec) && activeSongDurationSec > 0) {
    return Math.max(0, activeSongDurationSec - songBeatOffsetSec);
  }
  if (bgmAudio && Number.isFinite(bgmAudio.duration) && bgmAudio.duration > 0) {
    return Math.max(0, bgmAudio.duration - songBeatOffsetSec);
  }
  return Math.max(0, Number(activeSong?.durationSec || 0) - songBeatOffsetSec);
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

function updateInteractionLock() {
  // Keep page scrolling available on mobile even during gameplay.
  document.body.classList.remove('interaction-lock');
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
  if (btnPreview) {
    btnPreview.disabled = state === 'running';
  }
  updateTrackDisplay();
  updateSkinButtonLabel();
  updateDifficultyButtons();
}

function updateStartButtonLabel() {
  if (state === 'running') {
    btnStart.textContent = pauseReason === 'manual' ? '재개' : '일시정지';
    updateInteractionLock();
    if (btnPreview) {
      btnPreview.disabled = true;
    }
    return;
  }

  btnStart.textContent = state === 'gameover' ? '다시 시작' : '시작';
  updateInteractionLock();
  if (btnPreview) {
    btnPreview.disabled = false;
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  comboEl.textContent = String(combo);
  hpEl.textContent = String(missCount);
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
    return '트랙과 난이도를 고른 뒤 시작. 곡 끝까지 점수를 누적합니다.';
  }

  if (state === 'gameover') {
    return '트랙이 종료되었습니다. 점수와 기록을 확인하고 다시 시작하세요.';
  }

  if (pauseReason) {
    return '일시정지 상태입니다. 복귀하면 바로 이어서 플레이할 수 있어요.';
  }

  return '미사일은 트랙 임팩트 포인트에 맞춰 등장합니다. 끝까지 리듬을 유지하세요.';
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
  great() {
    playTone({ freq: 640, endFreq: 900, gain: 0.052, duration: 0.09, type: 'triangle' });
  },
  good() {
    playTone({ freq: 560, endFreq: 780, gain: 0.045, duration: 0.08, type: 'triangle' });
  },
  safe() {
    playTone({ freq: 460, endFreq: 620, gain: 0.035, duration: 0.075, type: 'triangle' });
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
  if (!bgmAudio) return;
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
  if (bgmAudio && !Number.isNaN(bgmAudio.currentTime) && bgmAudio.currentTime > 0) {
    return Math.max(0, bgmAudio.currentTime - songBeatOffsetSec);
  }

  return Math.max(0, songClockFallbackSec - songBeatOffsetSec);
}

function getBeatBiasLabel(timeDeltaSec) {
  if (Math.abs(timeDeltaSec) <= 0.018) {
    return 'CENTER';
  }
  return timeDeltaSec < 0 ? 'EARLY' : 'LATE';
}

function pushTimingFeedback(verdict, lane, timeDeltaSec = 0, overrideLabel = '') {
  const feedbackColor = {
    perfect: 'rgba(255, 224, 114, ALPHA)',
    great: 'rgba(124, 236, 255, ALPHA)',
    good: 'rgba(167, 192, 255, ALPHA)',
    safe: 'rgba(125, 255, 196, ALPHA)',
    miss: 'rgba(255, 132, 170, ALPHA)',
  };

  timingFeedback.label = overrideLabel || `${verdict.toUpperCase()} ${getBeatBiasLabel(timeDeltaSec)}`;
  timingFeedback.color = feedbackColor[verdict] || feedbackColor.good;
  timingFeedback.life = verdict === 'perfect' ? 0.56 : 0.48;
  timingFeedback.maxLife = timingFeedback.life;
  timingFeedback.x = LANES[clamp(lane, 0, LANES.length - 1)] || W * 0.5;
}

function recordTimingBucket(timeDeltaSec) {
  if (!Number.isFinite(timeDeltaSec)) return;
  if (timeDeltaSec <= -0.1) {
    timingBuckets[0].count += 1;
  } else if (timeDeltaSec < -0.028) {
    timingBuckets[1].count += 1;
  } else if (timeDeltaSec <= 0.028) {
    timingBuckets[2].count += 1;
  } else if (timeDeltaSec < 0.1) {
    timingBuckets[3].count += 1;
  } else {
    timingBuckets[4].count += 1;
  }
}

function resetResultStats() {
  verdictStats.perfect = 0;
  verdictStats.great = 0;
  verdictStats.good = 0;
  verdictStats.safe = 0;
  verdictStats.miss = 0;
  for (const bucket of timingBuckets) {
    bucket.count = 0;
  }
}

function renderResultHistogram() {
  if (!resultHistogramEl) return;
  const maxCount = Math.max(1, ...timingBuckets.map((bucket) => bucket.count));
  resultHistogramEl.innerHTML = '';

  for (const bucket of timingBuckets) {
    const row = document.createElement('div');
    row.className = 'result-hist-row';
    row.innerHTML = `
      <span class="result-hist-label">${bucket.key}</span>
      <span class="result-hist-track"><span class="result-hist-fill" style="width:${(bucket.count / maxCount) * 100}%"></span></span>
      <span class="result-hist-count">${bucket.count}</span>
    `;
    resultHistogramEl.appendChild(row);
  }
}

function renderResultReport() {
  const totalJudged = verdictStats.perfect + verdictStats.great + verdictStats.good + verdictStats.safe + verdictStats.miss;
  const weighted = verdictStats.perfect
    + verdictStats.great * 0.86
    + verdictStats.good * 0.72
    + verdictStats.safe * 0.5;
  const accuracy = totalJudged > 0 ? Math.round((weighted / totalJudged) * 100) : 0;

  if (resultAccuracyEl) {
    resultAccuracyEl.textContent = `정확도 ${accuracy}% · 판정 ${totalJudged}개`;
  }
  if (resultBreakdownEl) {
    resultBreakdownEl.textContent = `PERFECT ${verdictStats.perfect} · GREAT ${verdictStats.great} · GOOD ${verdictStats.good} · SAFE ${verdictStats.safe} · MISS ${verdictStats.miss}`;
  }
  if (resultOffsetHintEl) {
    resultOffsetHintEl.textContent = '입력 타이밍 분포를 보고 다음 곡에서 EARLY/LATE를 보정하세요.';
  }
  renderResultHistogram();
}

function lockGameplayViewportMetrics() {
  const viewportHeight = Math.max(
    1,
    Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 1),
  );
  document.documentElement.style.setProperty('--gameplay-vh', `${viewportHeight}px`);

  const computedSafeBottom = window.getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom').trim();
  const safeBottom = computedSafeBottom || '0px';
  document.documentElement.style.setProperty('--safe-bottom-lock', safeBottom);
}

function unlockGameplayViewportMetrics() {
  document.documentElement.style.removeProperty('--gameplay-vh');
  document.documentElement.style.removeProperty('--safe-bottom-lock');
}

async function requestGameplayFullscreen() {
  lockGameplayViewportMetrics();
  document.body.classList.add('gameplay-immersive');
  const el = document.documentElement;
  if (!el?.requestFullscreen) return;
  if (document.fullscreenElement) return;
  try {
    await el.requestFullscreen();
  } catch (error) {
    // Ignore; fullscreen availability depends on browser policy.
  }
}

async function exitGameplayFullscreen() {
  document.body.classList.remove('gameplay-immersive');
  unlockGameplayViewportMetrics();
  if (!document.fullscreenElement || !document.exitFullscreen) return;
  try {
    await document.exitFullscreen();
  } catch (error) {
    // Ignore.
  }
}

function getSectionProfile(beatIndex) {
  const beatmapSection = getBeatmapSectionProfile(beatIndex);
  if (beatmapSection) {
    return {
      density: clamp(Number.isFinite(beatmapSection.density) ? beatmapSection.density : 0.68, 0.1, 0.98),
      doubleChance: clamp(Number.isFinite(beatmapSection.doubleChance) ? beatmapSection.doubleChance : 0.16, 0, 0.65),
      burstChance: clamp(Number.isFinite(beatmapSection.burstChance) ? beatmapSection.burstChance : 0.03, 0, 0.3),
    };
  }

  const songSec = beatToSongSec(beatIndex);

  if (songSec < 18) {
    return { density: 0.42, doubleChance: 0.02, burstChance: 0 };
  }
  if (songSec < 46) {
    return { density: 0.62, doubleChance: 0.12, burstChance: 0.02 };
  }
  if (songSec < 82) {
    return { density: 0.74, doubleChance: 0.2, burstChance: 0.05 };
  }
  if (songSec < 122) {
    return { density: 0.82, doubleChance: 0.27, burstChance: 0.08 };
  }
  return { density: 0.9, doubleChance: 0.34, burstChance: 0.12 };
}

function getBeatAccentWeight(beatIndex) {
  const quantizedBeat = Math.round(beatIndex);
  const inBar = ((quantizedBeat % 4) + 4) % 4;
  let weight = [1, 0.4, 0.82, 0.52][inBar];

  if (quantizedBeat % 16 === 0) {
    weight += 0.16;
  } else if (quantizedBeat % 8 === 4) {
    weight += 0.1;
  }

  return clamp(weight, 0.2, 1.25);
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

function spawnEnemy(targetBeat, forcedLane = null, accentWeight = 1, hitSecOverride = null) {
  const lane = forcedLane == null ? pickSpawnLane() : forcedLane;
  const hitSec = Number.isFinite(hitSecOverride) ? hitSecOverride : beatToSongSec(targetBeat);
  const spawnSec = hitSec - approachSec;
  lastSpawnBeat = Math.max(lastSpawnBeat, Number(targetBeat));

  enemies.push({
    id: enemyIdSeed,
    lane,
    x: LANES[lane],
    y: ENEMY_SPAWN_Y,
    phase: random() * Math.PI * 2,
    targetBeat,
    spawnSec,
    hitSec,
    accent: clamp(accentWeight, 0.35, 1.35),
    progress: 0,
  });

  enemyIdSeed += 1;
}

function primeOpeningSpawns() {
  const currentBeat = Math.floor(getSongSeconds() / beatSec);
  const firstBeat = Math.max(0, currentBeat + Math.floor(approachBeats));
  for (let i = 0; i < 3; i += 1) {
    const lane = (i + 1) % LANES.length;
    spawnEnemy(firstBeat + i, lane, 0.94);
  }
}

function spawnEmergencyEnemy(songSec) {
  if (!isGameplayActive()) return;
  if (songSec < 0.2) return;
  if (enemies.length > 0) return;

  const durationSec = getActiveSongDurationSec();
  if (durationSec > 0 && songSec >= durationSec - (beatSec * 1.2)) {
    return;
  }

  const targetBeat = Math.max(Math.ceil((songSec + approachSec) / beatSec), 0);
  if (targetBeat - lastSpawnBeat < 1) {
    return;
  }

  spawnEnemy(targetBeat, pickSpawnLane(), 0.96);
}

function getUpcomingEnemyCount(songSec) {
  let count = 0;
  for (const enemy of enemies) {
    if (enemy.hitSec >= songSec - (judgeWindowsSec.safe * 0.9)) {
      count += 1;
    }
  }
  return count;
}

function ensureMinimumSpawnPressure(songSec) {
  if (!isGameplayActive()) return;
  const durationSec = getActiveSongDurationSec();
  if (durationSec > 0 && songSec >= durationSec - (beatSec * 1.4)) {
    return;
  }

  const minUpcoming = selectedDifficultyId === 'hard' ? 2 : 1;
  const upcoming = getUpcomingEnemyCount(songSec);
  if (upcoming >= minUpcoming) {
    return;
  }

  const needed = minUpcoming - upcoming;
  let targetBeat = Math.max(Math.ceil((songSec + (approachSec * 0.78)) / beatSec), 0);
  if (targetBeat <= lastSpawnBeat) {
    targetBeat = lastSpawnBeat + 1;
  }

  for (let i = 0; i < needed; i += 1) {
    spawnEnemy(targetBeat + i, null, 0.92 + (i * 0.06));
  }
}

function updateWaveFromBeat(beatIndex) {
  wave = 1 + Math.floor(beatIndex / 16);
}

function handleBeat(beatIndex) {
  const targetBeat = beatIndex + impactLookaheadBeats;
  const targetBeatKey = Math.round(targetBeat);
  const targetSec = beatToSongSec(targetBeat);
  const songDurationSec = getActiveSongDurationSec();
  if (songDurationSec > 0 && targetSec > songDurationSec - 0.06) {
    return;
  }
  updateWaveFromBeat(targetBeatKey);

  const profile = getSectionProfile(targetBeatKey);
  const marker = getBeatmapMarker(targetBeatKey);
  const accentWeight = marker?.weight || getBeatAccentWeight(targetBeatKey);
  const markerHitSec = Number.isFinite(Number(marker?.timeSec)) ? Number(marker.timeSec) : null;
  const spawnScale = Number(difficultyPreset?.spawnScale || 1);
  const spawnChance = marker?.forceSpawn
    ? 1
    : clamp(profile.density * accentWeight * spawnScale, 0.06, 0.99);
  const beatsSinceSpawn = targetBeatKey - lastSpawnBeat;
  const forceSpawnByGap = beatsSinceSpawn >= MAX_BEATS_WITHOUT_SPAWN;

  if (!forceSpawnByGap && random() > spawnChance) {
    return;
  }

  const mainLane = pickSpawnLane();
  spawnEnemy(targetBeat, mainLane, accentWeight, markerHitSec);

  let sideLane = -1;
  if (accentWeight >= 0.86 && random() < profile.doubleChance) {
    sideLane = (mainLane + (random() < 0.5 ? 1 : 2)) % LANES.length;
    spawnEnemy(targetBeat, sideLane, accentWeight * 0.92, markerHitSec);
  }

  if (accentWeight > 1.04 && random() < profile.burstChance) {
    for (let lane = 0; lane < LANES.length; lane += 1) {
      if (lane === mainLane || lane === sideLane) continue;
      spawnEnemy(targetBeat, lane, accentWeight * 0.86, markerHitSec);
    }
  }
}

function loseHp() {
  if (reviveShieldSec > 0) {
    return;
  }

  missCount += 1;
  verdictStats.miss += 1;
  combo = 0;
  heroGauge = Math.max(0, heroGauge - (1.6 * Number(difficultyPreset?.missGaugeDrain || 1)));
  shake = Math.max(shake, 12);
  sfx.hurt();
  addBurst(heroX, HERO_Y - 24, '#ff8a9d', 18, 4.5);
  setStatus(`MISS x${missCount}`, 0.68);

  updateHud();
}

function findClosestEnemyInLane(lane, songSec) {
  let bestIndex = -1;
  let bestTimeDistance = Infinity;

  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (enemy.lane !== lane) continue;

    const timeDistance = Math.abs(songSec - enemy.hitSec);
    if (timeDistance < bestTimeDistance) {
      bestTimeDistance = timeDistance;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) {
    return { index: -1, enemy: null, timeDeltaSec: Infinity };
  }

  return {
    index: bestIndex,
    enemy: enemies[bestIndex],
    timeDeltaSec: songSec - enemies[bestIndex].hitSec,
  };
}

function resolveVerdict(timeDeltaSec) {
  const abs = Math.abs(timeDeltaSec);
  if (abs <= judgeWindowsSec.perfect) return 'perfect';
  if (abs <= judgeWindowsSec.great) return 'great';
  if (abs <= judgeWindowsSec.good) return 'good';
  if (abs <= judgeWindowsSec.safe) return 'safe';
  return 'miss';
}

function softenVerdictForChord(verdict) {
  if (verdict === 'perfect') return 'great';
  if (verdict === 'great') return 'good';
  if (verdict === 'good') return 'safe';
  return 'safe';
}

function registerInputMiss(lane, label = 'MISS') {
  verdictStats.miss += 1;
  combo = 0;
  heroGauge = Math.max(0, heroGauge - 1);
  shake = Math.max(shake, 4);
  setStatus(label, 0.45);
  sfx.miss();
  addSlash(lane, 'miss');
  pushTimingFeedback('miss', lane, 0, label);
  updateHud();
}

function awardHit(verdict, enemy, lane, timeDeltaSec, assistHit = false) {
  verdictStats[verdict] += 1;
  recordTimingBucket(timeDeltaSec);
  const scoreByVerdict = {
    perfect: 120,
    great: 96,
    good: 74,
    safe: 42,
  };
  const comboScaleByVerdict = {
    perfect: 1,
    great: 0.84,
    good: 0.64,
    safe: 0,
  };
  const heroGaugeGain = {
    perfect: 2,
    great: 1.6,
    good: 1,
    safe: 0.45,
  };

  const comboBefore = combo;
  const comboBonus = Math.round(Math.min(120, comboBefore * 6) * comboScaleByVerdict[verdict]);
  const scoreScale = Number(difficultyPreset?.scoreScale || 1);
  let earned = Math.round((scoreByVerdict[verdict] + comboBonus) * scoreScale);

  if (heroModeSec > 0) {
    earned = Math.round(earned * 2);
  }
  if (assistHit) {
    earned = Math.round(earned * 0.82);
  }

  score += earned;
  if (verdict === 'safe') {
    combo = 0;
  } else {
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
  }
  heroGauge = clamp(heroGauge + heroGaugeGain[verdict], 0, HERO_GAUGE_TARGET);

  const timingBias = getBeatBiasLabel(timeDeltaSec);
  const verdictText = verdict.toUpperCase();

  if (!assistHit) {
    if (heroModeSec <= 0 && heroGauge >= HERO_GAUGE_TARGET) {
      heroModeSec = HERO_MODE_DURATION;
      heroGauge = 0;
      setStatus(`HERO MODE ON! ${verdictText} +${earned}`, 1.35);
      sfx.hero();
      addBurst(heroX, HERO_Y - 18, '#ffd463', 24, 5.1);
    } else if (verdict === 'perfect') {
      setStatus(`PERFECT ${timingBias} +${earned}`, 0.68);
      sfx.perfect();
    } else if (verdict === 'great') {
      setStatus(`GREAT ${timingBias} +${earned}`, 0.63);
      sfx.great();
    } else if (verdict === 'good') {
      setStatus(`GOOD ${timingBias} +${earned}`, 0.58);
      sfx.good();
    } else {
      setStatus(`SAFE ${timingBias} +${earned}`, 0.62);
      sfx.safe();
    }
  } else {
    sfx.attack();
  }

  laneFlash[lane] = 1;
  addSlash(lane, verdict);
  if (!assistHit) {
    pushTimingFeedback(verdict, lane, timeDeltaSec);
  }

  const burstColorByVerdict = {
    perfect: '#ffe06c',
    great: '#98f1ff',
    good: '#8ad5ff',
    safe: '#8efac4',
  };
  addBurst(enemy.x, enemy.y, burstColorByVerdict[verdict], 10, 3.2);

  updateHud();
}

function resolveChordAssist(anchorHitSec, songSec, anchorLane) {
  const linkedTargets = [];

  for (const enemy of enemies) {
    if (enemy.lane === anchorLane) continue;
    if (Math.abs(enemy.hitSec - anchorHitSec) > CHORD_LINK_SEC) continue;

    const deltaSec = songSec - enemy.hitSec;
    const verdict = resolveVerdict(deltaSec);
    if (verdict === 'miss') continue;

    linkedTargets.push({
      enemy,
      lane: enemy.lane,
      timeDeltaSec: deltaSec,
      verdict: softenVerdictForChord(verdict),
    });
  }

  linkedTargets.sort((a, b) => Math.abs(a.timeDeltaSec) - Math.abs(b.timeDeltaSec));

  let cleared = 0;
  for (const target of linkedTargets) {
    const index = enemies.indexOf(target.enemy);
    if (index < 0) continue;
    enemies.splice(index, 1);
    awardHit(target.verdict, target.enemy, target.lane, target.timeDeltaSec, true);
    cleared += 1;
  }

  if (cleared > 0) {
    setStatus(`CHORD x${cleared + 1}`, 0.44);
  }
}

function attemptAttack(lane) {
  if (!isGameplayActive()) return;

  targetLane = clamp(lane, 0, LANES.length - 1);
  laneFlash[targetLane] = 1;
  sfx.attack();

  const songSec = getSongSeconds();
  const pick = findClosestEnemyInLane(targetLane, songSec);
  if (!pick.enemy) {
    registerInputMiss(targetLane, 'MISS');
    return;
  }

  const verdict = resolveVerdict(pick.timeDeltaSec);
  if (verdict === 'miss') {
    const missLabel = `MISS ${getBeatBiasLabel(pick.timeDeltaSec)}`;
    registerInputMiss(targetLane, missLabel);
    return;
  }

  if (verdict === 'safe' && Math.abs(pick.timeDeltaSec) <= SAFE_AUTOLANE_NUDGE_SEC) {
    heroX = lerp(heroX, LANES[targetLane], 0.82);
  }

  const anchorHitSec = pick.enemy.hitSec;
  enemies.splice(pick.index, 1);
  awardHit(verdict, pick.enemy, targetLane, pick.timeDeltaSec);
  resolveChordAssist(anchorHitSec, songSec, targetLane);
}

function startRun() {
  state = 'running';
  pauseReason = null;
  score = 0;
  combo = 0;
  hp = MAX_HP;
  missCount = 0;
  wave = 1;
  heroGauge = 0;
  heroModeSec = 0;
  reviveShieldSec = 0;

  targetLane = 1;
  heroX = LANES[1];
  lastBeatIndex = -1;
  songClockFallbackSec = 0;
  shake = 0;
  lastSpawnBeat = -999;
  hudRefreshCooldownSec = 0;
  spawnGuardCooldownSec = 0;
  messageTimer = 0;
  timingFeedback.life = 0;
  timingFeedback.maxLife = 0;
  timingFeedback.label = '';
  stopTrackPreview({ rewind: true });
  resetResultStats();

  rewardedContinueUsed = false;
  clearRewardedAdRetry();
  clearRewardedAdLoadSubscription();
  clearRewardedAdShowSubscription();

  enemies.length = 0;
  particles.length = 0;
  slashFx.length = 0;

  for (let i = 0; i < laneFlash.length; i += 1) {
    laneFlash[i] = 0;
  }

  ensureBgmReadyForRun();
  gameOverTitleEl.textContent = 'Stage Clear';

  hideGameOverModal();
  closeOverlays();
  primeOpeningSpawns();
  updateHud();
  updateStartButtonLabel();
  refreshStatusLine();
  setStatus(`TRACK ${activeSong.shortLabel} · ${difficultyPreset.label}`, 0.95);
  void requestGameplayFullscreen();
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
  spawnEmergencyEnemy(getSongSeconds());
  void syncAudio();
}

function showGameOverModal() {
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  renderResultReport();
  showElement(gameOverModal);
  updateRewardedContinueUi();
}

function hideGameOverModal() {
  hideElement(gameOverModal);
  updateRewardedContinueUi();
}

function endRun(reason = 'complete') {
  state = 'gameover';
  pauseReason = null;
  heroModeSec = 0;
  reviveShieldSec = 0;
  void exitGameplayFullscreen();
  updateStartButtonLabel();

  if (score > best) {
    best = score;
    void persistBest();
  }

  if (combo > bestCombo) {
    bestCombo = combo;
    void persistBestCombo();
  }

  if (reason === 'complete') {
    gameOverTitleEl.textContent = 'Stage Clear';
    setStatus('TRACK COMPLETE!', 1.2);
    sfx.hero();
  } else {
    gameOverTitleEl.textContent = 'Stage End';
    setStatus('RUN END', 1.1);
    sfx.over();
  }
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

  if (timingFeedback.life > 0) {
    timingFeedback.life = Math.max(0, timingFeedback.life - dt);
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
  if (bgmAudio && !Number.isNaN(bgmAudio.currentTime) && bgmAudio.currentTime > 0) {
    songClockFallbackSec = bgmAudio.currentTime;
  }

  if (heroModeSec > 0) {
    heroModeSec = Math.max(0, heroModeSec - dt);
  }

  if (reviveShieldSec > 0) {
    reviveShieldSec = Math.max(0, reviveShieldSec - dt);
  }

  const songSec = getSongSeconds();
  const durationSec = getActiveSongDurationSec();
  if (durationSec > 0 && songSec >= durationSec) {
    endRun('complete');
    return;
  }
  const beatFloat = songSec / beatSec;
  const beatIndex = Math.floor(beatFloat);

  if (beatIndex > lastBeatIndex) {
    for (let beat = lastBeatIndex + 1; beat <= beatIndex; beat += 1) {
      handleBeat(beat);
    }
    lastBeatIndex = beatIndex;
  }

  spawnEmergencyEnemy(songSec);
  spawnGuardCooldownSec -= dt;
  if (spawnGuardCooldownSec <= 0) {
    spawnGuardCooldownSec = SPAWN_GUARD_CHECK_SEC;
    ensureMinimumSpawnPressure(songSec);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const travelSec = Math.max(0.001, enemy.hitSec - enemy.spawnSec);
    const progress = (songSec - enemy.spawnSec) / travelSec;
    enemy.progress = progress;
    enemy.y = lerp(ENEMY_SPAWN_Y, HIT_LINE_Y, clamp(progress, 0, 1.28));
    enemy.phase += dt * (4.8 + enemy.accent * 1.6);

    if (songSec - enemy.hitSec > judgeWindowsSec.safe + SAFE_PASS_GRACE_SEC) {
      enemies.splice(i, 1);
      loseHp();
    }
  }

  if (score > best) {
    best = score;
  }

  hudRefreshCooldownSec -= dt;
  if (hudRefreshCooldownSec <= 0) {
    hudRefreshCooldownSec = 0.08;
    updateHud();
  }
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

function drawEnemies(songSec) {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.sin(enemy.phase + enemy.id * 0.17) * 0.08);

    const impactPulse = 0.48 + Math.sin(enemy.phase * 2.2) * 0.22;
    const hitFocus = 1 - clamp(Math.abs(songSec - enemy.hitSec) / (judgeWindowsSec.safe * 2.5), 0, 1);
    const glowAlpha = 0.34 + impactPulse * 0.2 + hitFocus * 0.36;
    const bodyW = 38 + enemy.accent * 4;
    const bodyH = 24 + enemy.accent * 2;

    ctx.fillStyle = `rgba(255, 73, 168, ${0.44 + glowAlpha * 0.38})`;
    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.68, 0);
    ctx.lineTo(-bodyW * 0.44, -bodyH * 0.68);
    ctx.lineTo(-bodyW * 0.36, bodyH * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bodyW * 0.68, 0);
    ctx.lineTo(bodyW * 0.44, -bodyH * 0.68);
    ctx.lineTo(bodyW * 0.36, bodyH * 0.68);
    ctx.closePath();
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(0, -bodyH * 0.5, 0, bodyH * 0.5);
    bodyGrad.addColorStop(0, `rgba(38, 26, 68, ${0.95 - hitFocus * 0.14})`);
    bodyGrad.addColorStop(1, 'rgba(15, 14, 36, 0.96)');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH);

    ctx.strokeStyle = `rgba(125, 226, 255, ${0.58 + hitFocus * 0.22})`;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH);

    ctx.fillStyle = `rgba(255, 214, 99, ${0.64 + impactPulse * 0.28})`;
    ctx.fillRect(-bodyW * 0.38, -bodyH * 0.1, bodyW * 0.76, bodyH * 0.2);

    ctx.fillStyle = `rgba(15, 22, 52, ${0.94 - hitFocus * 0.22})`;
    ctx.beginPath();
    ctx.arc(-bodyW * 0.2, 0, bodyH * 0.19, 0, Math.PI * 2);
    ctx.arc(bodyW * 0.2, 0, bodyH * 0.19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(117, 244, 255, ${0.8 + impactPulse * 0.16})`;
    ctx.beginPath();
    ctx.arc(-bodyW * 0.2, 0, bodyH * 0.09, 0, Math.PI * 2);
    ctx.arc(bodyW * 0.2, 0, bodyH * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 112, 180, ${0.55 + hitFocus * 0.4})`;
    ctx.fillRect(-2, bodyH * 0.5, 4, 6 + impactPulse * 5);

    ctx.restore();
  }
}

function drawHeroBoardLayer(skin, enginePulse) {
  const heroBoosted = heroModeSec > 0;
  const trailColor = heroBoosted ? skin.trailHero : skin.trail;
  ctx.fillStyle = colorAlpha(trailColor, 0.42);
  ctx.beginPath();
  ctx.moveTo(-15, 18);
  ctx.quadraticCurveTo(0, 28 + enginePulse * 18, 15, 18);
  ctx.lineTo(10, 26);
  ctx.quadraticCurveTo(0, 38 + enginePulse * 18, -10, 26);
  ctx.closePath();
  ctx.fill();

  const boardGrad = ctx.createLinearGradient(-20, 0, 20, 0);
  boardGrad.addColorStop(0, heroBoosted ? skin.boardHeroLeft : skin.boardLeft);
  boardGrad.addColorStop(1, heroBoosted ? skin.boardHeroRight : skin.boardRight);
  ctx.fillStyle = boardGrad;
  ctx.beginPath();
  ctx.ellipse(0, 20, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeroBodyLayer(skin) {
  const heroBoosted = heroModeSec > 0;
  ctx.fillStyle = 'rgba(12, 20, 42, 0.92)';
  ctx.fillRect(-6, -4, 12, 18);

  ctx.fillStyle = heroBoosted ? skin.suitHero : skin.suit;
  ctx.fillRect(-12, -25, 24, 24);
  ctx.fillRect(-18, -19, 6, 16);
  ctx.fillRect(12, -19, 6, 16);
}

function drawHeroHeadLayer(skin) {
  const heroBoosted = heroModeSec > 0;
  ctx.fillStyle = skin.helmet;
  ctx.beginPath();
  ctx.arc(0, -30, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = heroBoosted ? skin.visorHero : skin.visor;
  ctx.fillRect(-7, -32, 14, 5);
  ctx.fillStyle = skin.accent;
  ctx.fillRect(-5, -12, 10, 3);
}

function drawHero(songSec) {
  const skin = getCurrentSkin();
  const bob = Math.sin(songSec * 7.2) * 2.2;
  const laneOffset = (LANES[targetLane] - heroX) / 40;
  const tilt = clamp(laneOffset * 0.08, -0.18, 0.18);
  const enginePulse = 0.46 + Math.sin(songSec * 18) * 0.24;

  ctx.save();
  ctx.translate(heroX, HERO_Y + bob);
  ctx.rotate(tilt);

  drawHeroBoardLayer(skin, enginePulse);
  drawHeroBodyLayer(skin);
  drawHeroHeadLayer(skin);

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
      : fx.verdict === 'great'
        ? `rgba(124, 236, 255, ${alpha})`
      : fx.verdict === 'good'
        ? `rgba(125, 231, 255, ${alpha})`
        : fx.verdict === 'safe'
          ? `rgba(125, 255, 196, ${alpha})`
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
    ctx.fillStyle = colorAlpha(p.color, alpha);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
}

function drawTimingFeedback() {
  if (timingFeedback.life <= 0 || !timingFeedback.label) {
    return;
  }

  const ratio = clamp(timingFeedback.life / Math.max(0.01, timingFeedback.maxLife), 0, 1);
  const rise = (1 - ratio) * 20;
  const alpha = ratio * ratio;

  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = colorAlpha(timingFeedback.color, alpha);
  ctx.fillText(timingFeedback.label, timingFeedback.x, HIT_LINE_Y - 36 - rise);
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
  const beatFloat = getSongSeconds() / beatSec;
  const beatFrac = beatFloat - Math.floor(beatFloat);
  const beatPulse = Math.pow(1 - clamp(Math.abs(beatFrac) * 2, 0, 1), 2);

  ctx.save();
  if (shake > 0) {
    ctx.translate((random() - 0.5) * shake, (random() - 0.5) * shake);
  }

  const songSec = getSongSeconds();
  drawBackground(songSec);
  drawLanes(beatPulse);
  drawEnemies(songSec);
  drawHero(songSec);
  drawSlashFx();
  drawParticles();
  drawTimingFeedback();

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
    drawOverlayText('TAP START', '좌우로 트랙 선택 · 난이도 선택 후 시작');
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
  let hint = '광고를 불러오는 중입니다. 준비되면 결과 보너스를 받을 수 있어요.';
  let disabled = true;

  if (rewardedContinueUsed) {
    buttonLabel = '보상 수령 완료';
    hint = '보상형 광고 보너스는 트랙당 1회만 받을 수 있어요.';
  } else if (rewardedAdStatus === 'ready') {
    buttonLabel = '광고 보고 +15%';
    hint = '광고 시청 완료 시 최종 점수에 +15% 보너스를 적용합니다.';
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

  const bonus = Math.round(score * AD_RESULT_BONUS_RATIO);
  score += bonus;
  if (score > best) {
    best = score;
    void persistBest();
  }
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  setStatus(`광고 보상: 점수 +${bonus}`, 1.2);
  updateHud();
  renderResultReport();
  updateRewardedContinueUi();

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
  setRewardedAdStatus('idle');
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
  void exitGameplayFullscreen();
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
  let requestedSongId = settings.songId;
  let requestedSkinId = settings.skinId;
  let requestedDifficultyId = settings.difficultyId;

  if (settingsRaw) {
    try {
      const parsed = JSON.parse(settingsRaw);
      settings.musicEnabled = parsed.musicEnabled !== false;
      settings.sfxEnabled = parsed.sfxEnabled !== false;
      if (typeof parsed.songId === 'string' && parsed.songId.trim()) {
        requestedSongId = parsed.songId.trim();
      }
      if (typeof parsed.skinId === 'string' && parsed.skinId.trim()) {
        requestedSkinId = parsed.skinId.trim();
      }
      if (typeof parsed.difficultyId === 'string' && parsed.difficultyId.trim()) {
        requestedDifficultyId = parsed.difficultyId.trim().toLowerCase();
      }
    } catch (error) {
      settings.musicEnabled = true;
      settings.sfxEnabled = true;
      requestedSongId = SONG_LIBRARY[0].id;
      requestedSkinId = HERO_SKINS[0].id;
      requestedDifficultyId = 'normal';
    }
  }

  applyDifficultyById(requestedDifficultyId);

  const preferredSongIndex = findSongIndexById(requestedSongId);
  if (preferredSongIndex >= 0 && preferredSongIndex !== selectedSongIndex) {
    await applySongByIndex(preferredSongIndex);
  } else {
    settings.songId = activeSong.id;
  }

  const preferredSkinIndex = HERO_SKINS.findIndex((skin) => skin.id === requestedSkinId);
  applySkinByIndex(preferredSkinIndex >= 0 ? preferredSkinIndex : 0);

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

async function shiftTrack(direction) {
  await unlockAudio();
  stopTrackPreview({ rewind: true });
  if (SONG_LIBRARY.length <= 1) {
    setStatus('트랙이 1개만 등록되어 있습니다.', 0.8);
    return;
  }

  const wasRunning = state === 'running';
  if (wasRunning) {
    pauseGame('track');
  }

  const nextSongIndex = (selectedSongIndex + direction + SONG_LIBRARY.length) % SONG_LIBRARY.length;
  setStatus('트랙/파형 분석 로딩 중...', 0.55);
  await applySongByIndex(nextSongIndex);
  updateAudioButtons();
  void persistSettings();

  if (wasRunning) {
    startRun();
    setStatus(`TRACK CHANGE: ${activeSong.shortLabel}`, 1);
  } else {
    setStatus(`트랙 선택: ${activeSong.title}`, 0.9);
    void syncAudio();
  }

  sfx.ui();
}

function cycleSkin() {
  applySkinByIndex(selectedSkinIndex + 1);
  void persistSettings();
  setStatus(`스킨 변경: ${getCurrentSkin().label}`, 0.75);
  sfx.ui();
}

function changeDifficulty(nextDifficultyId) {
  if (nextDifficultyId === selectedDifficultyId) return;
  applyDifficultyById(nextDifficultyId);
  updateAudioButtons();
  void persistSettings();
  setStatus(`난이도: ${difficultyPreset.label}`, 0.8);

  if (state === 'running') {
    startRun();
  }
}

function handleStartButtonClick() {
  void unlockAudio();
  stopTrackPreview({ rewind: true });

  if (state === 'idle' || state === 'gameover') {
    startRun();
    return;
  }

  if (state === 'running' && !pauseReason) {
    pauseGame('manual');
    return;
  }

  if (state === 'running' && pauseReason) {
    resumeGame(pauseReason);
  }
}

function handleCanvasPointerDown(event) {
  if (event.pointerType === 'touch') {
    return;
  }

  if (!isGameplayActive()) {
    if (state === 'idle') {
      startRun();
    }
    return;
  }

  event.preventDefault();

  const lane = getLaneFromClientX(event.clientX);
  attemptAttack(lane);
}

function handleCanvasTouchStart(event) {
  if (!isGameplayActive()) {
    return;
  }

  event.preventDefault();
  lastTouchInputAtMs = performance.now();

  const lanes = new Set();
  for (const touch of event.changedTouches) {
    lanes.add(getLaneFromClientX(touch.clientX));
  }

  for (const lane of lanes) {
    attemptAttack(lane);
  }
}

function handleLaneButtonPointerDown(event, lane) {
  if (event.pointerType === 'touch') {
    return;
  }
  if (!isGameplayActive()) {
    return;
  }
  if (performance.now() - lastTouchInputAtMs < 280) {
    return;
  }
  event.preventDefault();

  attemptAttack(lane);
}

function handleLaneButtonTouchStart(event, lane) {
  if (!isGameplayActive()) {
    return;
  }

  event.preventDefault();
  lastTouchInputAtMs = performance.now();

  attemptAttack(lane);
}

function bindEvents() {
  const shouldBlockInteractionGesture = () => document.body.classList.contains('interaction-lock');
  const blockInteractionGesture = (event) => {
    if (!shouldBlockInteractionGesture()) return;
    event.preventDefault();
  };
  let lastTouchEndTs = 0;

  document.addEventListener('gesturestart', blockInteractionGesture, { passive: false });
  document.addEventListener('gesturechange', blockInteractionGesture, { passive: false });
  document.addEventListener('gestureend', blockInteractionGesture, { passive: false });
  document.addEventListener('selectstart', blockInteractionGesture, { passive: false });
  document.addEventListener('dblclick', blockInteractionGesture, { passive: false });
  document.addEventListener('touchend', (event) => {
    if (!shouldBlockInteractionGesture()) return;
    const now = performance.now();
    if (now - lastTouchEndTs < 320) {
      event.preventDefault();
    }
    lastTouchEndTs = now;
  }, { passive: false });

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

    if (event.code === 'BracketLeft') {
      event.preventDefault();
      if (state !== 'running') {
        void shiftTrack(-1);
      }
      return;
    }

    if (event.code === 'BracketRight') {
      event.preventDefault();
      if (state !== 'running') {
        void shiftTrack(1);
      }
      return;
    }

    if (event.code === 'KeyZ' && state !== 'running') {
      event.preventDefault();
      changeDifficulty('easy');
      return;
    }

    if (event.code === 'KeyX' && state !== 'running') {
      event.preventDefault();
      changeDifficulty('normal');
      return;
    }

    if (event.code === 'KeyC' && state !== 'running') {
      event.preventDefault();
      changeDifficulty('hard');
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
  canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
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

  btnTrackPrev?.addEventListener('click', () => {
    void shiftTrack(-1);
  });

  btnTrackNext?.addEventListener('click', () => {
    void shiftTrack(1);
  });

  btnPreview?.addEventListener('click', () => {
    void previewCurrentTrack();
  });

  btnSkin?.addEventListener('click', () => {
    cycleSkin();
  });

  btnDiffEasy?.addEventListener('click', () => {
    changeDifficulty('easy');
  });

  btnDiffNormal?.addEventListener('click', () => {
    changeDifficulty('normal');
  });

  btnDiffHard?.addEventListener('click', () => {
    changeDifficulty('hard');
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

  btnLane0.addEventListener('pointerdown', (event) => {
    handleLaneButtonPointerDown(event, 0);
  }, { passive: false });
  btnLane0.addEventListener('touchstart', (event) => {
    handleLaneButtonTouchStart(event, 0);
  }, { passive: false });

  btnLane1.addEventListener('pointerdown', (event) => {
    handleLaneButtonPointerDown(event, 1);
  }, { passive: false });
  btnLane1.addEventListener('touchstart', (event) => {
    handleLaneButtonTouchStart(event, 1);
  }, { passive: false });

  btnLane2.addEventListener('pointerdown', (event) => {
    handleLaneButtonPointerDown(event, 2);
  }, { passive: false });
  btnLane2.addEventListener('touchstart', (event) => {
    handleLaneButtonTouchStart(event, 2);
  }, { passive: false });

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
  applyDifficultyById('normal');
  await applySongByIndex(0);
  applySkinByIndex(0);
  updateAudioButtons();
  updateHud();
  updateStartButtonLabel();
  refreshStatusLine();
  bindEvents();
  window.requestAnimationFrame(loop);
  await initializeTossBridge();
}

void init();
