const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlayEl = document.getElementById('overlay');

const stageTextEl = document.getElementById('stageText');
const hpTextEl = document.getElementById('hpText');
const goldTextEl = document.getElementById('goldText');
const killTextEl = document.getElementById('killText');
const phasePillEl = document.getElementById('phasePill');
const phaseTimerEl = document.getElementById('phaseTimer');
const hintTextEl = document.getElementById('hintText');

const btnMusic = document.getElementById('btnMusic');
const btnSfx = document.getElementById('btnSfx');
const btnExit = document.getElementById('btnExit');
const btnSellMode = document.getElementById('btnSellMode');

const exitModal = document.getElementById('exitModal');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');

const toss = window.SunkenSixwayDefense2Toss || {
  isAvailable: () => false,
  closeView: async () => false,
  getUserKeyForGame: async () => null,
  setDeviceOrientation: async () => false,
  setIosSwipeGestureEnabled: async () => false,
  safeArea: {
    get: async () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    subscribe: () => () => {},
  },
  events: {
    onBack: () => () => {},
    onHome: () => () => {},
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

const W = 720;
const H = 1280;
canvas.width = W;
canvas.height = H;
const TAU = Math.PI * 2;
const isCompactViewport = window.matchMedia('(max-width: 860px)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isMobileView = isCompactViewport || isCoarsePointer;
const MAX_BULLETS = 620;
const MAX_TOWER_LEVEL = 8;
const MIN_TOWER_RELOAD = isMobileView ? 0.2 : 0.15;

const GRID_CELL = 64;
const GRID = {
  cell: GRID_CELL,
  cols: Math.floor(W / GRID_CELL),
  rows: Math.floor(H / GRID_CELL),
};

const SPAWN = {
  c: Math.floor(GRID.cols / 2),
  r: 0,
};

const GOAL = {
  c: Math.floor(GRID.cols / 2),
  r: GRID.rows - 1,
};

const STORAGE_PREFIX = 'sunken-sixway-defense-2';
const AUDIO_SETTINGS_KEY = `${STORAGE_PREFIX}-audio-v1`;
const DEFAULT_TOSS_REWARDED_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const TOSS_REWARDED_AD_GROUP_ID = window.TapTapChoAds?.sunkenSixway2Rewarded || DEFAULT_TOSS_REWARDED_AD_GROUP_ID;

const TOWER_TYPES = {
  sunken: {
    id: 'sunken',
    name: '기본 선큰',
    cost: 45,
    range: 138,
    damage: 25,
    reload: 0.46,
    bulletSpeed: 500,
    hp: 280,
    color: '#8fd3ff',
  },
  speedSunken: {
    id: 'speedSunken',
    name: '속사 선큰',
    cost: 75,
    range: 152,
    damage: 13,
    reload: 0.24,
    bulletSpeed: 560,
    hp: 205,
    color: '#f4f7ff',
  },
  tankerSunken: {
    id: 'tankerSunken',
    name: '탱커 선큰',
    cost: 95,
    range: 118,
    damage: 11,
    reload: 0.94,
    bulletSpeed: 410,
    hp: 880,
    color: '#8af2b7',
  },
  sunkenSplash: {
    id: 'sunkenSplash',
    name: '광역 선큰',
    cost: 130,
    range: 150,
    damage: 28,
    reload: 0.84,
    bulletSpeed: 440,
    hp: 310,
    color: '#ffc78f',
    splashRadius: 64,
    splashFalloff: 0.48,
  },
  sunkenHammer: {
    id: 'sunkenHammer',
    name: '해머 선큰',
    cost: 120,
    range: 112,
    damage: 43,
    reload: 0.9,
    bulletSpeed: 390,
    hp: 360,
    color: '#ff9696',
    splashRadius: 54,
    splashFalloff: 0.58,
  },
};

const ENEMY_TYPES = {
  scout: {
    hp: 78,
    speed: 132,
    reward: 9,
    leak: 1,
    r: 15,
    color: '#7dc38d',
    tank: 'ghoul',
  },
  runner: {
    hp: 62,
    speed: 186,
    reward: 10,
    leak: 1,
    r: 13,
    color: '#8ac2ff',
    tank: 'raider',
  },
  brute: {
    hp: 180,
    speed: 92,
    reward: 18,
    leak: 2,
    r: 19,
    color: '#e0b388',
    tank: 'brute',
  },
  crusher: {
    hp: 268,
    speed: 84,
    reward: 23,
    leak: 2,
    r: 22,
    color: '#d5976a',
    tank: 'crusher',
  },
  lord: {
    hp: 1200,
    speed: 74,
    reward: 130,
    leak: 5,
    r: 30,
    color: '#f4c582',
    tank: 'lord',
    boss: true,
  },
};

const ENEMY_TANK_SOURCES = {
  ghoul: '../assets/kenney_tanks/png/tanks_tankGreen1.png',
  raider: '../assets/kenney_tanks/png/tanks_tankGrey4.png',
  brute: '../assets/kenney_tanks/png/tanks_tankDesert2.png',
  crusher: '../assets/kenney_tanks/png/tanks_tankDesert5.png',
  lord: '../assets/kenney_tanks/png/tanks_tankNavy5.png',
};

const ENEMY_TANK_IMAGES = Object.create(null);

const IMPACT_SFX_SOURCES = {
  build: [
    '../assets/audio/kenney_impact/impactWood_medium_000.ogg',
    '../assets/audio/kenney_impact/impactWood_medium_001.ogg',
    '../assets/audio/kenney_impact/impactWood_medium_002.ogg',
    '../assets/audio/kenney_impact/impactWood_medium_003.ogg',
    '../assets/audio/kenney_impact/impactWood_medium_004.ogg',
  ],
  enemyHit: [
    '../assets/audio/kenney_impact/impactMetal_light_000.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_001.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_002.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_003.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_004.ogg',
  ],
  enemyHitHeavy: [
    '../assets/audio/kenney_impact/impactBell_heavy_000.ogg',
    '../assets/audio/kenney_impact/impactBell_heavy_001.ogg',
    '../assets/audio/kenney_impact/impactBell_heavy_002.ogg',
    '../assets/audio/kenney_impact/impactBell_heavy_003.ogg',
    '../assets/audio/kenney_impact/impactBell_heavy_004.ogg',
  ],
  towerHit: [
    '../assets/audio/kenney_impact/impactPunch_heavy_000.ogg',
    '../assets/audio/kenney_impact/impactPunch_heavy_001.ogg',
    '../assets/audio/kenney_impact/impactPunch_heavy_002.ogg',
    '../assets/audio/kenney_impact/impactPunch_heavy_003.ogg',
    '../assets/audio/kenney_impact/impactPunch_heavy_004.ogg',
  ],
  towerBreak: [
    '../assets/audio/kenney_impact/impactMetal_light_000.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_001.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_002.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_003.ogg',
    '../assets/audio/kenney_impact/impactMetal_light_004.ogg',
  ],
  baseHit: [
    '../assets/audio/kenney_impact/impactPlate_heavy_000.ogg',
    '../assets/audio/kenney_impact/impactPlate_heavy_001.ogg',
    '../assets/audio/kenney_impact/impactPlate_heavy_002.ogg',
    '../assets/audio/kenney_impact/impactPlate_heavy_003.ogg',
    '../assets/audio/kenney_impact/impactPlate_heavy_004.ogg',
  ],
};

const audioSettings = {
  bgmEnabled: true,
  sfxEnabled: true,
};

let bgmAudio = null;

const sfxCtx = window.AudioContext ? new AudioContext() : null;

function tone(freq, duration = 0.05, type = 'triangle', gainValue = 0.018) {
  if (!audioSettings.sfxEnabled) return;
  if (!sfxCtx) return;
  const osc = sfxCtx.createOscillator();
  const gain = sfxCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(sfxCtx.destination);
  const now = sfxCtx.currentTime;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function isSfxEnabled() {
  return audioSettings.sfxEnabled;
}

const impactSfx = (() => {
  const pools = Object.create(null);
  const roundRobin = Object.create(null);
  const lastPlayed = Object.create(null);

  function ensurePool(name) {
    if (pools[name]) return pools[name];
    const sources = IMPACT_SFX_SOURCES[name] || [];
    const pool = [];
    for (const src of sources) {
      for (let i = 0; i < 2; i += 1) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.setAttribute('playsinline', '');
        pool.push(audio);
      }
    }
    pools[name] = pool;
    roundRobin[name] = 0;
    return pool;
  }

  function play(name, {
    volume = 0.36,
    minGap = 0.06,
    rateMin = 0.95,
    rateMax = 1.05,
  } = {}) {
    if (!isSfxEnabled()) return;
    const now = performance.now();
    const last = lastPlayed[name] || 0;
    if (now - last < minGap * 1000) return;
    lastPlayed[name] = now;

    const pool = ensurePool(name);
    if (!pool.length) return;

    const idx = roundRobin[name] % pool.length;
    roundRobin[name] += 1;
    const audio = pool[idx];
    if (!audio) return;

    audio.volume = clamp(volume, 0, 1);
    audio.playbackRate = rand(rateMin, rateMax);
    audio.currentTime = 0;
    const played = audio.play();
    if (played && typeof played.catch === 'function') {
      played.catch(() => {});
    }
  }

  return { play };
})();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
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
    // Ignore local storage errors.
  }
}

function loadAudioSettings() {
  const raw = safeLocalStorageGet(AUDIO_SETTINGS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    audioSettings.bgmEnabled = parsed.bgmEnabled !== false;
    audioSettings.sfxEnabled = parsed.sfxEnabled !== false;
  } catch (error) {
    audioSettings.bgmEnabled = true;
    audioSettings.sfxEnabled = true;
  }
}

function saveAudioSettings() {
  safeLocalStorageSet(AUDIO_SETTINGS_KEY, JSON.stringify(audioSettings));
}

function syncAudioButtons() {
  btnMusic.textContent = audioSettings.bgmEnabled ? 'BGM' : 'BGM OFF';
  btnMusic.setAttribute('aria-pressed', String(audioSettings.bgmEnabled));
  btnSfx.textContent = audioSettings.sfxEnabled ? 'FX' : 'FX OFF';
  btnSfx.setAttribute('aria-pressed', String(audioSettings.sfxEnabled));
}

function syncAudioRuntime() {
  if (!bgmAudio) return;
  bgmAudio.setBgmEnabled(audioSettings.bgmEnabled);
  bgmAudio.setSfxEnabled(audioSettings.sfxEnabled);
}

function initializeAudioSystem() {
  loadAudioSettings();
  bgmAudio = window.TapTapNeonAudio?.create('webgame-40-v2', null, {
    theme: 'rush',
    mediaSrc: '../assets/audio/battleThemeA.mp3',
    showThemeToggle: false,
    showSfxToggle: false,
  }) || null;
  syncAudioButtons();
  syncAudioRuntime();
}

function makeKindPerk() {
  return {
    damageMul: 1,
    reloadMul: 1,
    rangeMul: 1,
    hpMul: 1,
    splashMul: 1,
  };
}

function createDefaultPerks() {
  return {
    globalDamageMul: 1,
    globalReloadMul: 1,
    globalRangeMul: 1,
    globalHpMul: 1,
    startGoldAdd: 0,
    killGoldAdd: 0,
    buildDurationAdd: 0,
    baseMaxHpAdd: 0,
    byKind: {
      sunken: makeKindPerk(),
      speedSunken: makeKindPerk(),
      tankerSunken: makeKindPerk(),
      sunkenSplash: makeKindPerk(),
      sunkenHammer: makeKindPerk(),
    },
  };
}

const state = {
  mode: 'menu', // menu | running | card | defeat
  phase: 'build', // build | fight | card
  stage: 1,
  maxHp: 24,
  hp: 24,
  gold: 180,
  kills: 0,
  runTime: 0,
  selectedTower: 'sunken',
  sellMode: false,
  buildTimer: 8,
  spawnQueue: [],
  spawnTimer: 0,
  enemies: [],
  towers: [],
  bullets: [],
  particles: [],
  blocked: new Set(),
  dist: [],
  nextTowerId: 1,
  nextEnemyId: 1,
  selectedCellFx: null,
  perks: createDefaultPerks(),
  pendingCards: [],
  rewardedContinueUsed: false,
  ad: {
    supported: false,
    status: 'hidden', // hidden | loading | ready | showing | failed
    loadCleanup: () => {},
    showCleanup: () => {},
    rewardGranted: false,
    retryTimer: 0,
  },
};

let backgroundLayer = null;
let rafId = 0;
let lastAt = performance.now();
let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};
let backgroundPaused = false;

function toIndex(c, r) {
  return r * GRID.cols + c;
}

function keyOf(c, r) {
  return `${c}:${r}`;
}

function inBounds(c, r) {
  return c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows;
}

function isReserved(c, r) {
  return (c === SPAWN.c && r === SPAWN.r) || (c === GOAL.c && r === GOAL.r);
}

function cellCenter(c, r) {
  return {
    x: c * GRID.cell + GRID.cell * 0.5,
    y: r * GRID.cell + GRID.cell * 0.5,
  };
}

function worldToCell(x, y) {
  return {
    c: Math.floor(x / GRID.cell),
    r: Math.floor(y / GRID.cell),
  };
}

function getTowerAt(c, r) {
  return state.towers.find((tower) => tower.c === c && tower.r === r);
}

function applySafeAreaInsets({ top = 0, right = 0, bottom = 0, left = 0 }) {
  document.documentElement.style.setProperty('--safe-top', `${Math.max(0, Number(top) || 0)}px`);
  document.documentElement.style.setProperty('--safe-right', `${Math.max(0, Number(right) || 0)}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${Math.max(0, Number(bottom) || 0)}px`);
  document.documentElement.style.setProperty('--safe-left', `${Math.max(0, Number(left) || 0)}px`);
}

function rebuildBlocked() {
  state.blocked.clear();
  for (const tower of state.towers) {
    state.blocked.add(keyOf(tower.c, tower.r));
  }
}

function passable(c, r) {
  if (!inBounds(c, r)) return false;
  if (isReserved(c, r)) return true;
  return !state.blocked.has(keyOf(c, r));
}

function buildDistanceMap() {
  const size = GRID.cols * GRID.rows;
  const dist = new Array(size).fill(Infinity);
  const q = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const goalIdx = toIndex(GOAL.c, GOAL.r);
  dist[goalIdx] = 0;
  q[tail++] = goalIdx;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (head < tail) {
    const idx = q[head++];
    const c = idx % GRID.cols;
    const r = Math.floor(idx / GRID.cols);
    const nextD = dist[idx] + 1;
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (!passable(nc, nr)) continue;
      const nIdx = toIndex(nc, nr);
      if (dist[nIdx] <= nextD) continue;
      dist[nIdx] = nextD;
      q[tail++] = nIdx;
    }
  }

  state.dist = dist;
  return Number.isFinite(dist[toIndex(SPAWN.c, SPAWN.r)]);
}

function neighborStep(c, r) {
  const current = state.dist[toIndex(c, r)];
  let bestC = c;
  let bestR = r;
  let best = current;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (const [dc, dr] of dirs) {
    const nc = c + dc;
    const nr = r + dr;
    if (!passable(nc, nr)) continue;
    const d = state.dist[toIndex(nc, nr)];
    if (d < best) {
      best = d;
      bestC = nc;
      bestR = nr;
    }
  }

  return {
    c: bestC,
    r: bestR,
    valid: Number.isFinite(best),
  };
}

function canPlaceTower(c, r) {
  if (!inBounds(c, r)) return false;
  if (isReserved(c, r)) return false;
  if (getTowerAt(c, r)) return false;

  state.blocked.add(keyOf(c, r));
  const ok = buildDistanceMap();
  state.blocked.delete(keyOf(c, r));
  buildDistanceMap();
  return ok;
}

function makeTower(kind, c, r) {
  const base = TOWER_TYPES[kind];
  const perks = state.perks.byKind[kind] || makeKindPerk();
  const center = cellCenter(c, r);
  const damage = base.damage * state.perks.globalDamageMul * perks.damageMul;
  const reload = base.reload * state.perks.globalReloadMul * perks.reloadMul;
  const range = base.range * state.perks.globalRangeMul * perks.rangeMul;
  const hp = base.hp * state.perks.globalHpMul * perks.hpMul;

  return {
    id: state.nextTowerId++,
    kind,
    c,
    r,
    footprint: 1,
    x: center.x,
    y: center.y,
    level: 1,
    spent: base.cost,
    baseCost: base.cost,
    range,
    damage,
    reload,
    bulletSpeed: base.bulletSpeed,
    pierce: 0,
    splashRadius: (base.splashRadius || 0) * perks.splashMul,
    splashFalloff: base.splashFalloff || 0.5,
    maxHp: hp,
    hp,
    cooldown: rand(0.04, reload),
    color: base.color,
    tauntRadius: 0,
    damageMitigation: 0,
  };
}

function upgradeCost(tower) {
  const base = tower.baseCost || TOWER_TYPES[tower.kind].cost;
  const lv = Math.max(1, tower.level);
  const mid = Math.max(0, lv - 3);
  const late = Math.max(0, lv - 5);
  return Math.floor(base * (
    1.05
    + lv * 0.88
    + lv * lv * 0.2
    + mid * mid * 0.42
    + late * late * 0.85
  ));
}

function getTowerUpgradeFactors(kind) {
  const rangeMul = kind === 'sunken'
    ? 1.24
    : kind === 'tankerSunken'
      ? 1.08
    : kind === 'sunkenNova'
      ? 1.15
    : kind === 'sunkenStun'
      ? 1.14
    : kind === 'sunkenSplash'
      ? 1.18
    : kind === 'sunkenHammer'
      ? 1.12
    : kind === 'lottoSunken'
      ? 1.16
    : kind === 'speedSunken'
      ? 1.16
      : 1.2;

  const damageMul = kind === 'sunkenNova'
    ? 1.24
    : kind === 'tankerSunken'
      ? 1.16
    : kind === 'sunkenStun'
      ? 1.22
    : kind === 'sunkenSplash'
      ? 1.3
    : kind === 'sunkenHammer'
      ? 1.33
    : kind === 'lottoSunken'
      ? 1.28
      : 1.34;

  const reloadMul = kind === 'sunken'
    ? 0.88
    : kind === 'tankerSunken'
      ? 0.95
    : kind === 'sunkenNova'
      ? 0.9
    : kind === 'sunkenStun'
      ? 0.92
    : kind === 'sunkenSplash'
      ? 0.92
    : kind === 'sunkenHammer'
      ? 0.92
    : kind === 'lottoSunken'
      ? 0.9
      : 0.9;

  return { rangeMul, damageMul, reloadMul };
}

function applyTowerUpgradeScaling(tower, factors = null, kindOverride = null, levelForChain = null) {
  const kind = kindOverride || tower.kind;
  const stats = factors || getTowerUpgradeFactors(kind);
  tower.range *= stats.rangeMul;
  tower.damage *= stats.damageMul;
  tower.reload = Math.max(MIN_TOWER_RELOAD, tower.reload * stats.reloadMul);
  tower.pierce = Math.min(3, (Number.isFinite(tower.pierce) ? tower.pierce : 0) + (kind === 'obelisk' ? 1 : 0));

  if (kind === 'sunkenSplash') {
    tower.splashRadius *= 1.15;
    tower.splashFalloff = clamp(tower.splashFalloff + 0.05, 0.3, 0.68);
  } else if (kind === 'sunkenHammer') {
    tower.splashRadius *= 1.12;
    tower.splashFalloff = clamp(tower.splashFalloff + 0.04, 0.32, 0.7);
  } else if (kind === 'lottoSunken') {
    tower.poisonDuration = (tower.poisonDuration || 0) * 1.15;
    tower.poisonDps = (tower.poisonDps || 0) * 1.12;
  } else if (kind === 'tankerSunken') {
    tower.tauntRadius = (tower.tauntRadius || 0) * 1.08;
    tower.damageMitigation = clamp((tower.damageMitigation || 0) + 0.03, 0, 0.8);
  } else if (kind === 'sunkenStun') {
    tower.stunDuration = Math.min(2.1, (tower.stunDuration || 0) * 1.1);
    tower.stunRadius = (tower.stunRadius || 0) * 1.06;
    const chainLevel = levelForChain ?? tower.level;
    if (chainLevel === 3 || chainLevel === 5 || chainLevel === 7) {
      tower.stunChain = Math.min(6, (tower.stunChain || 3) + 1);
    }
  }
}

function upgradeTower(tower) {
  if (tower.level >= MAX_TOWER_LEVEL) {
    tone(210, 0.05, 'triangle', 0.014);
    return false;
  }

  const cost = upgradeCost(tower);
  if (state.gold < cost) {
    tone(180, 0.06, 'sawtooth', 0.022);
    return false;
  }

  state.gold -= cost;
  tower.spent += cost;
  tower.level = Math.min(MAX_TOWER_LEVEL, tower.level + 1);
  applyTowerUpgradeScaling(tower, getTowerUpgradeFactors(tower.kind), tower.kind, tower.level);
  tower.maxHp *= 1.34;
  tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.25);

  tone(660, 0.07, 'triangle', 0.022);
  return true;
}

function sellTower(tower) {
  const idx = state.towers.indexOf(tower);
  if (idx < 0) return false;
  state.towers.splice(idx, 1);
  const refund = Math.floor(tower.spent * 0.65);
  state.gold += refund;
  rebuildBlocked();
  buildDistanceMap();
  tone(240, 0.05, 'triangle', 0.016);
  return true;
}

function placeTower(c, r) {
  const kind = state.selectedTower;
  const spec = TOWER_TYPES[kind];
  if (!spec) return false;
  if (state.gold < spec.cost) {
    tone(170, 0.06, 'sawtooth', 0.023);
    return false;
  }
  if (!canPlaceTower(c, r)) {
    tone(190, 0.06, 'sawtooth', 0.023);
    return false;
  }

  const tower = makeTower(kind, c, r);
  state.gold -= spec.cost;
  state.towers.push(tower);
  rebuildBlocked();
  buildDistanceMap();
  impactSfx.play('build', { volume: 0.32, minGap: 0.04, rateMin: 0.95, rateMax: 1.05 });
  tone(360, 0.05, 'triangle', 0.017);
  return true;
}

function makeEnemy(type) {
  const base = ENEMY_TYPES[type];
  const stageFactor = 1 + (state.stage - 1) * 0.14;
  const bossBoost = base.boss ? 1 + Math.floor(state.stage / 5) * 0.18 : 1;
  const hp = Math.floor(base.hp * stageFactor * bossBoost);
  const speed = base.speed * (1 + (state.stage - 1) * (base.boss ? 0.004 : 0.007));
  const spawn = cellCenter(SPAWN.c, SPAWN.r);

  return {
    id: state.nextEnemyId++,
    type,
    x: spawn.x + rand(-GRID.cell * 0.36, GRID.cell * 0.36),
    y: -rand(24, 108),
    r: base.r,
    hp,
    maxHp: hp,
    speed,
    reward: Math.floor(base.reward * (1 + (state.stage - 1) * 0.08)),
    leak: base.leak,
    color: base.color,
    tank: base.tank,
    boss: Boolean(base.boss),
    fast: type === 'runner',
    threat: type === 'scout'
      ? 0.24
      : type === 'runner'
        ? 0.42
      : type === 'brute'
        ? 0.56
      : type === 'crusher'
        ? 0.72
        : 0.9,
    morph: Math.random() * TAU,
    targetC: SPAWN.c,
    targetR: SPAWN.r,
    targetX: spawn.x,
    targetY: spawn.y,
    repath: 0,
    vx: 0,
    vy: 1,
    stunTimer: 0,
  };
}

function makeStageQueue(stage) {
  const queue = [];
  const count = 14 + stage * 4;

  for (let i = 0; i < count; i += 1) {
    const roll = Math.random();
    let type = 'scout';
    if (roll > 0.78) type = 'runner';
    if (stage >= 3 && roll > 0.9) type = 'brute';
    if (stage >= 6 && roll > 0.965) type = 'crusher';
    queue.push(type);
  }

  if (stage >= 4) {
    queue.splice(Math.floor(queue.length * 0.55), 0, 'runner', 'runner');
  }
  if (stage >= 8) {
    queue.splice(Math.floor(queue.length * 0.7), 0, 'brute', 'crusher');
  }

  if (stage % 5 === 0) {
    queue.push('lord');
  }

  return queue;
}

function spawnOne() {
  const type = state.spawnQueue.shift();
  if (!type) return;
  const enemy = makeEnemy(type);
  state.enemies.push(enemy);
}

function removeEnemy(enemy) {
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) {
    state.enemies.splice(idx, 1);
  }
}

function damageEnemy(enemy, damage, sourceKind = '', secondary = false) {
  enemy.hp -= damage;

  if (sourceKind === 'sunken') {
    impactSfx.play('enemyHit', {
      volume: 0.28,
      minGap: 0.04,
      rateMin: 0.95,
      rateMax: 1.06,
    });
    if (!secondary && Math.random() < 0.35) tone(286 + rand(-22, 18), 0.04, 'triangle', 0.011);
  } else if (sourceKind === 'sunkenSplash') {
    impactSfx.play('enemyHit', {
      volume: 0.3,
      minGap: 0.05,
      rateMin: 0.93,
      rateMax: 1.02,
    });
    if (!secondary && Math.random() < 0.5) tone(270 + rand(-16, 14), 0.04, 'square', 0.012);
  } else if (sourceKind === 'speedSunken') {
    impactSfx.play('enemyHit', {
      volume: 0.24,
      minGap: 0.03,
      rateMin: 1.02,
      rateMax: 1.16,
    });
    if (!secondary && Math.random() < 0.55) tone(468 + rand(-34, 30), 0.03, 'triangle', 0.009);
  } else if (sourceKind) {
    impactSfx.play('enemyHit', { volume: 0.26, minGap: 0.045, rateMin: 0.95, rateMax: 1.04 });
  }

  if (enemy.hp > 0) return false;
  removeEnemy(enemy);
  state.kills += 1;
  state.gold += enemy.reward + state.perks.killGoldAdd;
  if (enemy.boss) {
    impactSfx.play('enemyHitHeavy', { volume: 0.46, minGap: 0.12, rateMin: 0.88, rateMax: 0.95 });
    tone(280, 0.2, 'sawtooth', 0.04);
  } else if (Math.random() < 0.35) {
    tone(560, 0.04, 'triangle', 0.013);
  }
  return true;
}

function findTargetsForSplash(centerX, centerY, radius) {
  const found = [];
  const rr = radius * radius;
  for (const enemy of state.enemies) {
    const dx = enemy.x - centerX;
    const dy = enemy.y - centerY;
    if ((dx * dx + dy * dy) <= rr) {
      found.push(enemy);
    }
  }
  return found;
}

function shootTower(tower, target) {
  if (state.bullets.length >= MAX_BULLETS) return;

  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const d = Math.hypot(dx, dy) || 1;
  const kind = tower.kind;
  const isSplash = kind === 'sunkenSplash' || kind === 'sunkenHammer';
  const isHammer = kind === 'sunkenHammer';
  const baseColor = TOWER_TYPES[kind]?.color || tower.color;

  state.bullets.push({
    x: tower.x,
    y: tower.y,
    vx: (dx / d) * tower.bulletSpeed,
    vy: (dy / d) * tower.bulletSpeed,
    r: isSplash ? 5.6 : 4,
    damage: tower.damage,
    ttl: 2,
    splashRadius: isSplash ? tower.splashRadius : 0,
    splashFalloff: isSplash ? tower.splashFalloff : 0,
    color: baseColor,
    sourceKind: kind,
    lightning: isHammer,
  });

  if (kind === 'sunken') {
    if (Math.random() < 0.4) tone(330 + rand(-24, 18), 0.03, 'triangle', 0.011);
  } else if (kind === 'sunkenSplash') {
    impactSfx.play('enemyHitHeavy', { volume: 0.26, minGap: 0.08, rateMin: 0.95, rateMax: 1.03 });
    if (Math.random() < 0.6) tone(290 + rand(-18, 14), 0.04, 'square', 0.012);
  } else if (kind === 'sunkenHammer') {
    impactSfx.play('enemyHitHeavy', { volume: 0.28, minGap: 0.05, rateMin: 0.96, rateMax: 1.05 });
    if (Math.random() < 0.58) tone(316 + rand(-20, 18), 0.04, 'square', 0.012);
  } else if (Math.random() < 0.35) {
    tone(430 + rand(-26, 28), 0.03, 'square', 0.01);
  }
}

function findClosestEnemy(x, y, range) {
  const rr = range * range;
  let picked = null;
  let best = rr;
  for (const enemy of state.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > best) continue;
    picked = enemy;
    best = d2;
  }
  return picked;
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const target = findClosestEnemy(tower.x, tower.y, tower.range);
    if (!target) {
      tower.cooldown = Math.min(0.22, tower.reload * 0.45);
      continue;
    }
    shootTower(tower, target);
    tower.cooldown = tower.reload;
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.ttl -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    if (
      bullet.ttl <= 0
      || bullet.x < -24
      || bullet.y < -24
      || bullet.x > W + 24
      || bullet.y > H + 24
    ) {
      state.bullets.splice(i, 1);
      continue;
    }

    let hit = null;
    for (const enemy of state.enemies) {
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const rr = enemy.r + bullet.r;
      if ((dx * dx + dy * dy) <= rr * rr) {
        hit = enemy;
        break;
      }
    }

    if (!hit) continue;

    if (bullet.splashRadius > 0) {
      const victims = findTargetsForSplash(hit.x, hit.y, bullet.splashRadius);
      for (const enemy of victims) {
        const dx = enemy.x - hit.x;
        const dy = enemy.y - hit.y;
        const dist = Math.hypot(dx, dy);
        const rawRate = 1 - (dist / Math.max(1, bullet.splashRadius));
        const rate = clamp(rawRate, bullet.splashFalloff || 0.35, 1);
        const splashDamage = bullet.damage * rate * 0.72;
        damageEnemy(enemy, splashDamage, bullet.sourceKind || '', enemy !== hit);
      }
    } else {
      damageEnemy(hit, bullet.damage, bullet.sourceKind || '', false);
    }

    state.bullets.splice(i, 1);
  }
}

function updateEnemies(dt) {
  const goalCenter = cellCenter(GOAL.c, GOAL.r);

  for (const enemy of [...state.enemies]) {
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= dt;
      continue;
    }

    enemy.repath -= dt;
    const cell = worldToCell(enemy.x, enemy.y);

    if (!inBounds(cell.c, cell.r)) {
      const spawn = cellCenter(SPAWN.c, SPAWN.r);
      enemy.targetX = spawn.x;
      enemy.targetY = spawn.y;
    } else if (enemy.repath <= 0) {
      const next = neighborStep(cell.c, cell.r);
      enemy.repath = 0.12;
      if (next.valid) {
        enemy.targetC = next.c;
        enemy.targetR = next.r;
        const center = cellCenter(next.c, next.r);
        enemy.targetX = center.x;
        enemy.targetY = center.y;
      }
    }

    const dx = enemy.targetX - enemy.x;
    const dy = enemy.targetY - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(dist, enemy.speed * dt);
    const nx = dx / dist;
    const ny = dy / dist;

    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
    enemy.x += nx * step;
    enemy.y += ny * step;

    const gd = Math.hypot(enemy.x - goalCenter.x, enemy.y - goalCenter.y);
    if (gd <= enemy.r + GRID.cell * 0.26) {
      state.hp -= enemy.leak;
      removeEnemy(enemy);
      impactSfx.play('baseHit', { volume: 0.4, minGap: 0.06, rateMin: 0.9, rateMax: 1.01 });
      tone(160, 0.08, 'sawtooth', 0.028);
      if (state.hp <= 0) {
        state.hp = 0;
        setDefeat();
        return;
      }
    }
  }
}

function updateSpawning(dt) {
  if (state.spawnQueue.length <= 0) return;
  state.spawnTimer -= dt;
  const spawnDelay = clamp(0.54 - state.stage * 0.015, 0.14, 0.54);

  while (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
    spawnOne();
    state.spawnTimer += spawnDelay;
  }
}

function makeCardPool() {
  return [
    {
      id: 'global-dmg',
      title: '전체 화력 +12%',
      desc: '모든 선큰 공격력 증가',
      apply: () => {
        state.perks.globalDamageMul *= 1.12;
      },
    },
    {
      id: 'global-reload',
      title: '전체 연사 +10%',
      desc: '모든 선큰 재장전 단축',
      apply: () => {
        state.perks.globalReloadMul *= 0.9;
      },
    },
    {
      id: 'global-range',
      title: '사거리 +8%',
      desc: '모든 선큰 사거리 증가',
      apply: () => {
        state.perks.globalRangeMul *= 1.08;
      },
    },
    {
      id: 'sunken-core',
      title: '기본 선큰 강화',
      desc: '기본 선큰 공격 +20%',
      apply: () => {
        state.perks.byKind.sunken.damageMul *= 1.2;
      },
    },
    {
      id: 'speed-core',
      title: '속사 선큰 강화',
      desc: '속사 선큰 연사 +18%',
      apply: () => {
        state.perks.byKind.speedSunken.reloadMul *= 0.82;
      },
    },
    {
      id: 'tank-core',
      title: '탱커 선큰 강화',
      desc: '탱커 체력 +28%',
      apply: () => {
        state.perks.byKind.tankerSunken.hpMul *= 1.28;
      },
    },
    {
      id: 'splash-core',
      title: '광역 선큰 강화',
      desc: '광역 반경 +22%',
      apply: () => {
        state.perks.byKind.sunkenSplash.splashMul *= 1.22;
      },
    },
    {
      id: 'hammer-core',
      title: '해머 선큰 강화',
      desc: '해머 공격 +24%',
      apply: () => {
        state.perks.byKind.sunkenHammer.damageMul *= 1.24;
      },
    },
    {
      id: 'base-up',
      title: '황제 수호 +3',
      desc: '최대/현재 HP 증가',
      apply: () => {
        state.maxHp += 3;
        state.hp = Math.min(state.maxHp, state.hp + 3);
      },
    },
    {
      id: 'start-gold',
      title: '보급금 +60',
      desc: '즉시 +60 골드',
      apply: () => {
        state.gold += 60;
      },
    },
    {
      id: 'kill-gold',
      title: '현상금 +2',
      desc: '적 처치 골드 증가',
      apply: () => {
        state.perks.killGoldAdd += 2;
      },
    },
    {
      id: 'build-time',
      title: '배치 턴 +1초',
      desc: '매 스테이지 배치 시간 증가',
      apply: () => {
        state.perks.buildDurationAdd += 1;
      },
    },
  ];
}

function pickCards(count = 3) {
  const pool = makeCardPool();
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function showOverlay(html) {
  overlayEl.innerHTML = html;
  overlayEl.classList.remove('hidden');
}

function hideOverlay() {
  overlayEl.innerHTML = '';
  overlayEl.classList.add('hidden');
}

function showMenuOverlay() {
  showOverlay(`
    <div class="panel">
      <h1>선큰 식스웨이 디펜스 2</h1>
      <p>바로 시작해서 자동 전투, 배치 턴에서 전략만 선택하세요.</p>
      <div class="panel-actions">
        <button class="panel-btn" data-action="start">게임 시작</button>
        <button class="panel-btn subtle" data-action="tutorial">바로 플레이</button>
      </div>
    </div>
  `);
}

function renderDefeatOverlay() {
  const showReward = state.ad.supported && !state.rewardedContinueUsed;
  const rewardDisabled = state.ad.status !== 'ready';

  let rewardLabel = '광고 로딩 중';
  if (state.ad.status === 'ready') rewardLabel = '광고 보고 부활';
  if (state.ad.status === 'showing') rewardLabel = '광고 재생 중';
  if (state.ad.status === 'failed') rewardLabel = '광고 재시도 중';
  if (state.rewardedContinueUsed) rewardLabel = '이번 판 사용 완료';

  showOverlay(`
    <div class="panel">
      <h2>방어 실패</h2>
      <p>스테이지 ${state.stage} · 처치 ${state.kills}</p>
      <div class="panel-actions">
        <button class="panel-btn" data-action="restart">다시 시작</button>
        ${showReward ? `<button class="panel-btn reward" data-action="reward-continue" ${rewardDisabled ? 'disabled' : ''}>${rewardLabel}</button>` : ''}
      </div>
    </div>
  `);
}

function showCardOverlay(rewardGold) {
  const cards = state.pendingCards;
  const cardButtons = cards.map((card, idx) => (
    `<button class="card-btn" data-action="pick-card" data-card-index="${idx}">
      <b>${card.title}</b>
      <span>${card.desc}</span>
    </button>`
  )).join('');

  showOverlay(`
    <div class="panel">
      <h2>스테이지 ${state.stage} 클리어</h2>
      <p>보상 +${rewardGold} 골드 · 카드 1장 선택</p>
      <div class="card-grid">${cardButtons}</div>
    </div>
  `);
}

function refreshHud() {
  stageTextEl.textContent = String(state.stage);
  hpTextEl.textContent = `${Math.max(0, Math.floor(state.hp))}/${Math.max(1, Math.floor(state.maxHp))}`;
  goldTextEl.textContent = String(Math.max(0, Math.floor(state.gold)));
  killTextEl.textContent = String(state.kills);

  if (state.mode !== 'running') {
    phasePillEl.textContent = '대기';
    phasePillEl.classList.remove('fight');
    phaseTimerEl.textContent = '--';
  } else if (state.phase === 'build') {
    phasePillEl.textContent = '배치 턴';
    phasePillEl.classList.remove('fight');
    phaseTimerEl.textContent = state.buildTimer.toFixed(1);
  } else {
    phasePillEl.textContent = '전투 중';
    phasePillEl.classList.add('fight');
    phaseTimerEl.textContent = String(state.spawnQueue.length + state.enemies.length);
  }
}

function refreshBuildButtons() {
  for (const btn of document.querySelectorAll('.build-btn[data-kind]')) {
    btn.classList.toggle('active', btn.dataset.kind === state.selectedTower);
  }
  if (!btnSellMode) return;
  btnSellMode.classList.toggle('active', state.sellMode);
  const cost = btnSellMode.querySelector('.cost');
  if (cost) cost.textContent = state.sellMode ? 'ON' : 'OFF';
}

function resetRunState() {
  state.perks = createDefaultPerks();
  state.mode = 'running';
  state.phase = 'build';
  state.stage = 1;
  state.maxHp = 24 + state.perks.baseMaxHpAdd;
  state.hp = state.maxHp;
  state.gold = 180 + state.perks.startGoldAdd;
  state.kills = 0;
  state.runTime = 0;
  state.sellMode = false;
  state.selectedTower = 'sunken';
  state.enemies = [];
  state.towers = [];
  state.bullets = [];
  state.particles = [];
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.blocked.clear();
  state.dist = [];
  state.nextTowerId = 1;
  state.nextEnemyId = 1;
  state.selectedCellFx = null;
  state.pendingCards = [];
  state.rewardedContinueUsed = false;
  hideOverlay();
  refreshBuildButtons();
  refreshHud();
}

function startStage(stage) {
  state.stage = stage;
  state.mode = 'running';
  state.phase = 'build';
  state.buildTimer = clamp(8 + state.perks.buildDurationAdd, 4.5, 16);
  state.spawnQueue = makeStageQueue(stage);
  state.spawnTimer = 0.56;
  state.enemies = [];
  state.bullets = [];
  state.selectedCellFx = null;
  rebuildBlocked();
  buildDistanceMap();
  hintTextEl.textContent = '배치 턴: 타워 설치/강화/판매';
  tone(390, 0.06, 'triangle', 0.02);
}

function startRun() {
  resetRunState();
  buildDistanceMap();
  bgmAudio?.unlock();
  startStage(1);
}

function stageClear() {
  const rewardGold = Math.floor((80 + state.stage * 18) * (1 + state.stage * 0.01));
  state.gold += rewardGold;
  state.mode = 'card';
  state.phase = 'card';
  state.pendingCards = pickCards(3);
  showCardOverlay(rewardGold);
  tone(620, 0.08, 'triangle', 0.022);
}

function applyPickedCard(index) {
  const card = state.pendingCards[index];
  if (!card) return;
  card.apply();
  state.pendingCards = [];
  hideOverlay();
  startStage(state.stage + 1);
}

function setDefeat() {
  state.mode = 'defeat';
  state.phase = 'card';
  hintTextEl.textContent = '다시 시작하거나 광고 보상으로 1회 부활할 수 있습니다';
  renderDefeatOverlay();
  tone(170, 0.18, 'sawtooth', 0.04);
}

function parseAdEventType(event) {
  return String(
    event?.data?.eventType
      || event?.eventType
      || event?.type
      || ''
  ).toLowerCase();
}

function setAdStatus(status) {
  state.ad.status = status;
  if (state.mode === 'defeat') {
    renderDefeatOverlay();
  }
}

function clearAdTimers() {
  if (state.ad.retryTimer) {
    window.clearTimeout(state.ad.retryTimer);
    state.ad.retryTimer = 0;
  }
}

function cleanupAdListeners() {
  state.ad.loadCleanup();
  state.ad.showCleanup();
  state.ad.loadCleanup = () => {};
  state.ad.showCleanup = () => {};
}

function scheduleAdReload() {
  if (!state.ad.supported || state.ad.retryTimer) return;
  state.ad.retryTimer = window.setTimeout(() => {
    state.ad.retryTimer = 0;
    preloadRewardedAd(true);
  }, 2200);
}

async function preloadRewardedAd(force = false) {
  if (!state.ad.supported || !TOSS_REWARDED_AD_GROUP_ID) return;
  if (!force && (state.ad.status === 'loading' || state.ad.status === 'ready' || state.ad.status === 'showing')) {
    return;
  }

  clearAdTimers();
  state.ad.loadCleanup();
  state.ad.loadCleanup = () => {};
  setAdStatus('loading');

  state.ad.loadCleanup = toss.ads.load(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      const type = parseAdEventType(event);
      if (!type) return;
      if (type.includes('loaded') || type.includes('load') || type.includes('ready')) {
        setAdStatus('ready');
      }
      if (type.includes('error') || type.includes('fail')) {
        setAdStatus('failed');
        scheduleAdReload();
      }
    },
    onError: () => {
      setAdStatus('failed');
      scheduleAdReload();
    },
  });

  // Fallback check for runtimes that emit only isLoaded state.
  window.setTimeout(async () => {
    if (state.ad.status !== 'loading') return;
    try {
      if (typeof toss.ads.isLoaded === 'function') {
        const loaded = await toss.ads.isLoaded(TOSS_REWARDED_AD_GROUP_ID);
        if (loaded) {
          setAdStatus('ready');
          return;
        }
      }
      setAdStatus('failed');
      scheduleAdReload();
    } catch (error) {
      setAdStatus('failed');
      scheduleAdReload();
    }
  }, 1200);
}

function grantRewardContinue() {
  if (state.rewardedContinueUsed) return;
  state.rewardedContinueUsed = true;
  state.hp = Math.max(1, Math.floor(state.maxHp * 0.5));
  state.enemies = [];
  state.spawnQueue = [];
  state.bullets = [];
  state.mode = 'running';
  state.phase = 'build';
  hideOverlay();
  startStage(Math.max(1, state.stage));
  hintTextEl.textContent = '광고 보상 부활! 배치 턴에서 전열을 다시 정비하세요';
}

function showRewardedContinue() {
  if (
    state.mode !== 'defeat'
    || !state.ad.supported
    || state.rewardedContinueUsed
    || state.ad.status !== 'ready'
  ) {
    return;
  }

  setAdStatus('showing');
  state.ad.rewardGranted = false;

  let settled = false;
  const settle = (granted) => {
    if (settled) return;
    settled = true;
    state.ad.showCleanup();
    state.ad.showCleanup = () => {};
    if (granted) {
      grantRewardContinue();
    }
    preloadRewardedAd(true);
    if (!granted && state.mode === 'defeat') {
      renderDefeatOverlay();
    }
  };

  state.ad.showCleanup = toss.ads.show(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      const type = parseAdEventType(event);
      if (!type) return;
      if (type.includes('reward')) {
        state.ad.rewardGranted = true;
      }
      if (
        type.includes('close')
        || type.includes('dismiss')
        || type.includes('complete')
        || type.includes('finish')
        || type.includes('end')
      ) {
        settle(state.ad.rewardGranted);
      }
      if (type.includes('error') || type.includes('fail')) {
        settle(false);
      }
    },
    onError: () => {
      settle(false);
    },
  });

  window.setTimeout(() => {
    settle(state.ad.rewardGranted);
  }, 10000);
}

async function initializeRewardedAd() {
  state.ad.supported = toss.isAvailable()
    && typeof toss.ads?.isAvailable === 'function'
    && toss.ads.isAvailable() === true;

  if (!state.ad.supported || !TOSS_REWARDED_AD_GROUP_ID) {
    state.ad.supported = false;
    setAdStatus('hidden');
    return;
  }

  try {
    if (typeof toss.ads.isLoaded === 'function') {
      const loaded = await toss.ads.isLoaded(TOSS_REWARDED_AD_GROUP_ID);
      if (loaded) {
        setAdStatus('ready');
        return;
      }
    }
  } catch (error) {
    // Ignore and fallback to load API.
  }

  preloadRewardedAd(true);
}

function makeBackgroundLayer() {
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const bx = layer.getContext('2d');

  const base = bx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#4e533f');
  base.addColorStop(0.55, '#3a402f');
  base.addColorStop(1, '#292f25');
  bx.fillStyle = base;
  bx.fillRect(0, 0, W, H);

  const laneX = cellCenter(SPAWN.c, SPAWN.r).x;
  const laneGrad = bx.createLinearGradient(laneX - GRID.cell * 1.4, 0, laneX + GRID.cell * 1.4, 0);
  laneGrad.addColorStop(0, 'rgba(49, 43, 31, 0.76)');
  laneGrad.addColorStop(0.5, 'rgba(86, 73, 48, 0.9)');
  laneGrad.addColorStop(1, 'rgba(49, 43, 31, 0.76)');
  bx.fillStyle = laneGrad;
  bx.fillRect(laneX - GRID.cell * 1.5, 0, GRID.cell * 3, H);

  for (let i = 0; i < 240; i += 1) {
    const x = rand(0, W);
    const y = rand(0, H);
    const r = rand(4, 16);
    bx.fillStyle = Math.random() < 0.5
      ? `rgba(82, 88, 69, ${rand(0.04, 0.13)})`
      : `rgba(24, 27, 21, ${rand(0.04, 0.11)})`;
    bx.beginPath();
    bx.arc(x, y, r, 0, Math.PI * 2);
    bx.fill();
  }

  for (let i = 0; i < 30; i += 1) {
    const y = rand(40, H - 40);
    const x = laneX + rand(-GRID.cell * 1.1, GRID.cell * 1.1);
    const r = rand(12, 28);
    bx.fillStyle = 'rgba(30, 28, 23, 0.52)';
    bx.beginPath();
    bx.ellipse(x, y, r * 1.15, r * 0.82, rand(0, Math.PI * 2), 0, Math.PI * 2);
    bx.fill();
  }

  bx.fillStyle = 'rgba(22, 64, 31, 0.6)';
  bx.fillRect(0, 0, GRID.cell * 1.05, H);
  bx.fillRect(W - GRID.cell * 1.05, 0, GRID.cell * 1.05, H);

  return layer;
}

function getBackgroundLayer() {
  if (!backgroundLayer) {
    backgroundLayer = makeBackgroundLayer();
  }
  return backgroundLayer;
}

function drawPathPreview() {
  let c = SPAWN.c;
  let r = SPAWN.r;
  const start = cellCenter(c, r);
  ctx.strokeStyle = 'rgba(148, 236, 191, 0.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  const maxStep = GRID.cols * GRID.rows;
  for (let i = 0; i < maxStep; i += 1) {
    if (c === GOAL.c && r === GOAL.r) break;
    const next = neighborStep(c, r);
    if (!next.valid || (next.c === c && next.r === r)) break;
    c = next.c;
    r = next.r;
    const p = cellCenter(c, r);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

function drawEndpoints(now) {
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const goal = cellCenter(GOAL.c, GOAL.r);
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);

  ctx.save();

  ctx.fillStyle = 'rgba(116, 232, 175, 0.18)';
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 26 + pulse * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8cf2be';
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(226, 255, 242, 0.82)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(spawn.x - 4, spawn.y - 6);
  ctx.lineTo(spawn.x + 6, spawn.y);
  ctx.lineTo(spawn.x - 4, spawn.y + 6);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = 'rgba(248, 203, 141, 0.2)';
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, 31 + pulse * 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4cc8c';
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7c4f2c';
  ctx.fillRect(goal.x - 8, goal.y - 13, 16, 26);
  ctx.fillStyle = '#ffedc4';
  ctx.fillRect(goal.x - 3, goal.y - 8, 6, 12);

  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(154, 174, 139, 0.15)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= GRID.cols; c += 1) {
    const x = c * GRID.cell + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let r = 0; r <= GRID.rows; r += 1) {
    const y = r * GRID.cell + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawTower(tower, now) {
  drawTowerSunken(tower, now);
}

function drawTowerSunken(tower, now) {
  const isSplash = tower.kind === 'sunkenSplash';
  const isLong = false;
  const isNova = tower.kind === 'sunkenNova';
  const isStun = tower.kind === 'sunkenStun';
  const isHammer = tower.kind === 'sunkenHammer';
  const isTanker = tower.kind === 'tankerSunken';
  const scale = 1 + ((tower.footprint || 1) - 1) * 0.86;
  const pulse = 0.5 + 0.5 * Math.sin(now * 4 + tower.c * 0.31 + tower.r * 0.17);
  const ringR = (8.4 + tower.level * 1.3) * scale;
  const levelPower = clamp((tower.level - 1) / 2, 0, 1);

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#131f2d';
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 2.8, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = isSplash
    ? `rgba(255, 201, 143, ${0.34 + pulse * 0.24})`
    : isLong
      ? `rgba(152, 194, 255, ${0.34 + pulse * 0.24})`
    : isNova
      ? `rgba(204, 163, 255, ${0.34 + pulse * 0.24})`
    : isStun
      ? `rgba(255, 215, 112, ${0.34 + pulse * 0.24})`
    : isTanker
      ? `rgba(170, 255, 201, ${0.34 + pulse * 0.24})`
    : `rgba(147, 225, 255, ${0.34 + pulse * 0.24})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 1.3, 0, TAU);
  ctx.stroke();

  const liteTowerDraw = isMobileView
    && (
      state.towers.length >= 52
      || state.bullets.length >= MAX_BULLETS * 0.78
    );
  if (liteTowerDraw) {
    ctx.fillStyle = isSplash
      ? '#ffb67f'
      : isNova
        ? '#cda4ff'
      : isStun
        ? '#ffd173'
      : isTanker
        ? '#9effc4'
        : '#8adfff';
    ctx.beginPath();
    ctx.arc(0, 0, ringR * 0.58, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(234, 245, 255, 0.82)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, ringR * 0.88, 0, TAU);
    ctx.stroke();

    if (isHammer) {
      ctx.fillStyle = '#ff6a6a';
      ctx.fillRect(-4.2, -2.4, 8.4, 4.8);
    } else if (isStun) {
      ctx.strokeStyle = '#fff0b2';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(-3.2, -4.2);
      ctx.lineTo(1.6, -1.1);
      ctx.lineTo(-1.2, 1.4);
      ctx.lineTo(3.8, 4.5);
      ctx.stroke();
    } else if (isTanker) {
      ctx.strokeStyle = 'rgba(226, 255, 238, 0.92)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4.4, 0);
      ctx.lineTo(4.4, 0);
      ctx.moveTo(0, -4.4);
      ctx.lineTo(0, 4.4);
      ctx.stroke();
    } else if (tower.kind === 'fusion') {
      ctx.strokeStyle = 'rgba(220, 255, 255, 0.92)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4.4, -4.4);
      ctx.lineTo(4.4, 4.4);
      ctx.moveTo(4.4, -4.4);
      ctx.lineTo(-4.4, 4.4);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  const aura = ctx.createRadialGradient(0, 0, ringR * 0.45, 0, 0, ringR + 12 + tower.level * 2.2);
  if (isSplash) {
    aura.addColorStop(0, 'rgba(255, 224, 156, 0.42)');
    aura.addColorStop(0.58, 'rgba(255, 171, 93, 0.24)');
    aura.addColorStop(1, 'rgba(255, 117, 42, 0)');
  } else if (isLong) {
    aura.addColorStop(0, 'rgba(206, 226, 255, 0.48)');
    aura.addColorStop(0.58, 'rgba(123, 171, 255, 0.27)');
    aura.addColorStop(1, 'rgba(56, 88, 156, 0)');
  } else if (isNova) {
    aura.addColorStop(0, 'rgba(229, 204, 255, 0.46)');
    aura.addColorStop(0.58, 'rgba(182, 129, 255, 0.26)');
    aura.addColorStop(1, 'rgba(85, 45, 138, 0)');
  } else if (isStun) {
    aura.addColorStop(0, 'rgba(255, 232, 157, 0.46)');
    aura.addColorStop(0.58, 'rgba(255, 196, 84, 0.26)');
    aura.addColorStop(1, 'rgba(146, 91, 24, 0)');
  } else if (isTanker) {
    aura.addColorStop(0, 'rgba(188, 255, 210, 0.46)');
    aura.addColorStop(0.58, 'rgba(100, 205, 156, 0.27)');
    aura.addColorStop(1, 'rgba(29, 86, 66, 0)');
  } else {
    aura.addColorStop(0, 'rgba(188, 245, 255, 0.4)');
    aura.addColorStop(0.58, 'rgba(122, 214, 255, 0.24)');
    aura.addColorStop(1, 'rgba(58, 135, 186, 0)');
  }
  ctx.globalAlpha = 0.24 + levelPower * 0.2 + pulse * 0.08;
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 10 + tower.level * 1.2 + pulse * 1.5, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  const vortex = ctx.createRadialGradient(0, 0, 1, 0, 0, ringR);
  if (isSplash) {
    vortex.addColorStop(0, '#ffd27e');
    vortex.addColorStop(0.65, '#b0763f');
    vortex.addColorStop(1, '#2e1e12');
  } else if (isLong) {
    vortex.addColorStop(0, '#d5e4ff');
    vortex.addColorStop(0.65, '#5e89d5');
    vortex.addColorStop(1, '#15203a');
  } else if (isNova) {
    vortex.addColorStop(0, '#e0c6ff');
    vortex.addColorStop(0.65, '#8962c5');
    vortex.addColorStop(1, '#28163d');
  } else if (isStun) {
    vortex.addColorStop(0, '#ffe9b0');
    vortex.addColorStop(0.65, '#c08933');
    vortex.addColorStop(1, '#35230d');
  } else if (isTanker) {
    vortex.addColorStop(0, '#c6ffd7');
    vortex.addColorStop(0.65, '#4f9f78');
    vortex.addColorStop(1, '#112d24');
  } else {
    vortex.addColorStop(0, '#7ee8ff');
    vortex.addColorStop(0.65, '#3e8ab5');
    vortex.addColorStop(1, '#11273a');
  }
  ctx.fillStyle = vortex;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = isSplash
    ? 'rgba(255, 232, 171, 0.62)'
    : isLong
      ? 'rgba(216, 232, 255, 0.68)'
    : isNova
      ? 'rgba(225, 208, 255, 0.68)'
    : isStun
      ? 'rgba(255, 230, 163, 0.68)'
    : isTanker
      ? 'rgba(205, 255, 219, 0.72)'
      : 'rgba(196, 242, 255, 0.62)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 2 + tower.level; i += 1) {
    const rot = now * (0.8 + i * 0.22) + i * 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 3.1 + i * 1.6, rot, rot + Math.PI * 0.95);
    ctx.stroke();
  }

  if (tower.level >= 2) {
    const orbitCount = 3 + tower.level;
    ctx.fillStyle = isSplash
      ? 'rgba(255, 216, 143, 0.84)'
      : isLong
        ? 'rgba(196, 221, 255, 0.86)'
      : isNova
        ? 'rgba(222, 204, 255, 0.86)'
      : isStun
        ? 'rgba(255, 226, 152, 0.86)'
      : isTanker
        ? 'rgba(205, 255, 224, 0.88)'
        : 'rgba(197, 242, 255, 0.84)';
    for (let i = 0; i < orbitCount; i += 1) {
      const orbitA = now * (1.2 + i * 0.07) + i * (TAU / orbitCount);
      const orbitR = ringR + 5.5 + tower.level * 1.7 + Math.sin(now * 2.5 + i) * 1.2;
      const size = 1.2 + levelPower * 0.9;
      ctx.beginPath();
      ctx.arc(Math.cos(orbitA) * orbitR, Math.sin(orbitA) * orbitR, size, 0, TAU);
      ctx.fill();
    }
  }

  const teeth = 5 + tower.level * 2;
  ctx.fillStyle = isSplash
    ? 'rgba(255, 215, 142, 0.78)'
    : isLong
      ? 'rgba(172, 206, 255, 0.82)'
    : isNova
      ? 'rgba(205, 179, 255, 0.82)'
    : isStun
      ? 'rgba(255, 219, 140, 0.82)'
    : isTanker
      ? 'rgba(179, 245, 203, 0.84)'
      : 'rgba(198, 246, 255, 0.78)';
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * TAU + now * 0.3;
    const inner = ringR + 0.4;
    const outer = ringR + 4.2 + tower.level * 0.7;
    const spread = 0.09;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - spread) * inner, Math.sin(a - spread) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a + spread) * inner, Math.sin(a + spread) * inner);
    ctx.closePath();
    ctx.fill();
  }

  if (isHammer) {
    ctx.fillStyle = 'rgba(255, 96, 96, 0.92)';
    ctx.fillRect(-5, -3, 10, 6);
    ctx.fillStyle = 'rgba(255, 210, 120, 0.9)';
    ctx.fillRect(-1, 3, 2, 8);
  }

  if (isNova) {
    ctx.strokeStyle = 'rgba(210, 170, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU + now * 0.6;
      const r1 = ringR * 0.35;
      const r2 = ringR * 0.7;
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.stroke();
  }

  if (isStun) {
    ctx.strokeStyle = 'rgba(140, 255, 170, 0.95)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(2, -2);
    ctx.lineTo(-1, 2);
    ctx.lineTo(5, 6);
    ctx.stroke();
  }

  if (isTanker) {
    const phaseSeed = Number.isFinite(tower.id) ? tower.id : (tower.c || 0) * 97 + (tower.r || 0) * 13;
    const shieldPulse = 0.5 + 0.5 * Math.sin(now * 3.6 + phaseSeed * 0.17);
    const baseShieldR = ringR + 7.5 + tower.level * 0.8 + shieldPulse * 1.2;
    const hitFx = clamp(tower.guardHitFx || 0, 0, 1);
    const hitPulse = clamp(tower.guardHitPulse || 0, 0, 1);

    ctx.strokeStyle = `rgba(167, 255, 207, ${0.28 + shieldPulse * 0.18})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, baseShieldR, 0, TAU);
    ctx.stroke();

    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU + now * 0.45;
      const r1 = baseShieldR - 2.4;
      const r2 = baseShieldR + 2.2;
      ctx.strokeStyle = `rgba(145, 241, 188, ${0.2 + shieldPulse * 0.18})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }

    if (hitFx > 0.001) {
      const burstR = baseShieldR + (1 - hitFx) * 13 + hitPulse * 3.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const shell = ctx.createRadialGradient(0, 0, ringR * 0.8, 0, 0, burstR + 10);
      shell.addColorStop(0, `rgba(225, 255, 236, ${0.16 + hitFx * 0.22})`);
      shell.addColorStop(0.56, `rgba(126, 236, 181, ${0.12 + hitFx * 0.2})`);
      shell.addColorStop(1, 'rgba(54, 134, 95, 0)');
      ctx.fillStyle = shell;
      ctx.beginPath();
      ctx.arc(0, 0, burstR + 10, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = `rgba(217, 255, 229, ${0.42 + hitFx * 0.4})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, burstR, 0, TAU);
      ctx.stroke();

      ctx.strokeStyle = `rgba(178, 255, 211, ${0.26 + hitFx * 0.34})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * TAU + now * 0.9;
        const r1 = baseShieldR * 0.6;
        const r2 = burstR + 4 + hitPulse * 4;
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(198, 255, 214, 0.92)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();
  }

  if (isSplash) {
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR * 0.55, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, ringR * 0.28, 0, TAU);
    ctx.stroke();
  }

  if (tower.kind === 'fusion') {
    if (isMobileView && state.towers.length >= 70) {
      ctx.strokeStyle = 'rgba(200, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ringR * 0.9, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150, 255, 230, 0.6)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-ringR * 0.7, 0);
      ctx.lineTo(ringR * 0.7, 0);
      ctx.moveTo(0, -ringR * 0.7);
      ctx.lineTo(0, ringR * 0.7);
      ctx.stroke();
      return;
    }

    const starR1 = ringR * 0.45;
    const starR2 = ringR * 0.75;
    ctx.strokeStyle = 'rgba(200, 255, 255, 0.95)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * TAU + now * 0.9;
      const r = i % 2 === 0 ? starR2 : starR1;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(120, 255, 230, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, ringR * 0.9, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR * 1.15, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU + now * 1.3;
      const r1 = ringR * 0.2;
      const r2 = ringR * 1.0;
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.stroke();
  }

  if (tower.level >= 3) {
    ctx.strokeStyle = isSplash
      ? `rgba(255, 190, 115, ${0.66 + pulse * 0.2})`
      : isLong
        ? `rgba(133, 182, 255, ${0.66 + pulse * 0.2})`
      : isNova
        ? `rgba(188, 146, 255, ${0.66 + pulse * 0.2})`
      : isStun
        ? `rgba(255, 204, 99, ${0.66 + pulse * 0.2})`
      : isTanker
        ? `rgba(172, 255, 199, ${0.66 + pulse * 0.2})`
        : `rgba(162, 236, 255, ${0.66 + pulse * 0.2})`;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i += 1) {
      const beamA = now * 1.7 + i * (TAU / 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(beamA) * (ringR - 2.4), Math.sin(beamA) * (ringR - 2.4));
      ctx.lineTo(Math.cos(beamA) * (ringR + 10 + pulse * 2.4), Math.sin(beamA) * (ringR + 10 + pulse * 2.4));
      ctx.stroke();
    }
  }

  if (isSplash || isLong || isNova || isStun || isTanker) {
    ctx.strokeStyle = isSplash
      ? `rgba(255, 169, 86, ${0.52 + pulse * 0.24})`
      : isLong
        ? `rgba(118, 170, 255, ${0.52 + pulse * 0.24})`
      : isNova
        ? `rgba(169, 117, 255, ${0.52 + pulse * 0.24})`
      : isTanker
        ? `rgba(113, 214, 154, ${0.52 + pulse * 0.24})`
      : `rgba(255, 195, 74, ${0.52 + pulse * 0.24})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR + 6 + pulse * 1.5, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}


function borderColorForTowerKind(kind) {
  if (kind === 'sunken') return 'rgba(77, 163, 255, 0.9)';
  if (kind === 'tankerSunken') return 'rgba(127, 224, 167, 0.95)';
  if (kind === 'sunkenNova') return 'rgba(198, 155, 255, 0.9)';
  if (kind === 'sunkenStun') return 'rgba(255, 205, 92, 0.95)';
  if (kind === 'sunkenSplash') return 'rgba(30, 30, 30, 0.95)';
  if (kind === 'sunkenHammer') return 'rgba(255, 77, 77, 0.95)';
  if (kind === 'fusion') return 'rgba(174, 240, 255, 0.95)';
  if (kind === 'speedSunken') return 'rgba(255, 255, 255, 0.95)';
  return 'rgba(154, 232, 255, 0.88)';
}

function isFxHeavyLoad() {
  if (!isMobileView) return state.bullets.length >= MAX_BULLETS * 0.7;
  return state.bullets.length >= MAX_BULLETS * 0.48 || state.towers.length + state.enemies.length >= 90;
}

function isFxSevereLoad() {
  if (!isMobileView) return state.bullets.length >= MAX_BULLETS * 0.88;
  return state.bullets.length >= MAX_BULLETS * 0.72 || state.enemies.length >= 56;
}

function drawEnemyTankSprite(enemy) {
  const img = ENEMY_TANK_IMAGES[enemy.tank];
  if (!img || !img.complete || !img.naturalWidth) return false;

  const velLen = Math.hypot(enemy.vx, enemy.vy);
  let dx = enemy.vx;
  let dy = enemy.vy;
  if (velLen < 6) {
    dx = enemy.targetX - enemy.x;
    dy = enemy.targetY - enemy.y;
    if (Math.hypot(dx, dy) < 1) {
      const goal = cellCenter(GOAL.c, GOAL.r);
      dx = goal.x - enemy.x;
      dy = goal.y - enemy.y;
    }
  }
  const ang = Math.atan2(dy, dx);

  let sizeMul = 2.2;
  let sizeCap = 34;
  if (enemy.fast) sizeMul = 2.05;
  if (enemy.type === 'brute' || enemy.tank === 'brute') sizeMul = 2.35;
  if (enemy.type === 'crusher' || enemy.tank === 'crusher') {
    sizeMul = 2.6;
    sizeCap = 45;
  }
  if (enemy.type === 'lord' || enemy.boss) {
    sizeMul = 2.4;
    sizeCap = 44;
  }
  const size = clamp(enemy.r * sizeMul, 18, sizeCap);

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(ang);
  if (enemy.snareTimer > 0) {
    ctx.globalAlpha = 0.84;
  } else if ((enemy.stunTimer || 0) > 0) {
    ctx.globalAlpha = 0.72;
  }
  ctx.drawImage(img, -size * 0.5, -size * 0.5, size, size);
  ctx.globalAlpha = 1;
  ctx.restore();
  return true;
}

function drawEnemy(enemy, now) {
  const severe = isFxSevereLoad();
  const heavy = severe ? true : isFxHeavyLoad();
  const threat = Number.isFinite(enemy.threat) ? enemy.threat : (enemy.boss ? 0.9 : 0.45);
  const morph = Number.isFinite(enemy.morph) ? enemy.morph : 0;
  const pulse = 0.5 + 0.5 * Math.sin(now * 5 + morph);
  const auraRadius = enemy.r + 4 + threat * 6 + pulse * 2.6;
  const spikeCount = 6 + Math.floor(threat * 8);

  if (!heavy && threat >= 0.35) {
    ctx.strokeStyle = enemy.boss
      ? `rgba(255, 154, 178, ${0.25 + pulse * 0.2})`
      : `rgba(195, 140, 255, ${0.2 + pulse * 0.16})`;
    ctx.lineWidth = 2 + threat;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, auraRadius, 0, TAU);
    ctx.stroke();
  }

  if (!heavy && threat >= 0.55) {
    ctx.strokeStyle = enemy.boss ? 'rgba(255, 193, 143, 0.38)' : 'rgba(197, 150, 255, 0.32)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < spikeCount; i += 1) {
      const ang = (i / spikeCount) * TAU + now * (enemy.boss ? 0.8 : 1.3);
      const sx = enemy.x + Math.cos(ang) * (enemy.r + 1);
      const sy = enemy.y + Math.sin(ang) * (enemy.r + 1);
      const ex = enemy.x + Math.cos(ang) * (enemy.r + 4 + threat * 4);
      const ey = enemy.y + Math.sin(ang) * (enemy.r + 4 + threat * 4);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(10, 14, 22, 0.62)';
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + enemy.r * 0.15, enemy.r * 1.05, enemy.r * 0.72, 0, 0, TAU);
  ctx.fill();

  if (!drawEnemyTankSprite(enemy)) {
    ctx.fillStyle = '#100f19';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, TAU);
    ctx.fill();
  }

  if (!severe && enemy.fast) {
    const fastMarkAlpha = enemy.snareTimer > 0 ? 0.42 : 0.86;
    ctx.strokeStyle = `rgba(255, 230, 180, ${fastMarkAlpha})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.r * 0.55, enemy.y - enemy.r * 0.1);
    ctx.lineTo(enemy.x + enemy.r * 0.55, enemy.y + enemy.r * 0.1);
    ctx.moveTo(enemy.x + enemy.r * 0.28, enemy.y - enemy.r * 0.56);
    ctx.lineTo(enemy.x - enemy.r * 0.2, enemy.y + enemy.r * 0.5);
    ctx.stroke();
  }

  if (!severe && (enemy.stunTimer || 0) > 0) {
    const stunRatio = clamp((enemy.stunTimer || 0) / 1.2, 0, 1);
    const stunPulse = 0.4 + 0.6 * Math.sin(now * 11 + morph * 1.9);
    ctx.strokeStyle = `rgba(255, 220, 120, ${0.58 + stunRatio * 0.24})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 7 + stunPulse * 1.6, 0, TAU);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 235, 245, 0.72)';
  ctx.beginPath();
  ctx.arc(enemy.x - enemy.r * 0.24, enemy.y - enemy.r * 0.22, 1.4 + threat * 0.6, 0, TAU);
  ctx.arc(enemy.x + enemy.r * 0.24, enemy.y - enemy.r * 0.22, 1.4 + threat * 0.6, 0, TAU);
  ctx.fill();

  if (threat >= 0.74 || enemy.boss) {
    const horn = enemy.r * (enemy.boss ? 0.92 : 0.72);
    ctx.fillStyle = enemy.boss ? 'rgba(255, 208, 145, 0.8)' : 'rgba(228, 187, 255, 0.68)';
    ctx.beginPath();
    ctx.moveTo(enemy.x - enemy.r * 0.44, enemy.y - enemy.r * 0.55);
    ctx.lineTo(enemy.x - enemy.r * 0.14, enemy.y - horn);
    ctx.lineTo(enemy.x + enemy.r * 0.04, enemy.y - enemy.r * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.r * 0.44, enemy.y - enemy.r * 0.55);
    ctx.lineTo(enemy.x + enemy.r * 0.14, enemy.y - horn);
    ctx.lineTo(enemy.x - enemy.r * 0.04, enemy.y - enemy.r * 0.42);
    ctx.closePath();
    ctx.fill();
  }

  if (state.stage >= 6) {
    ctx.fillStyle = enemy.boss ? 'rgba(255, 150, 174, 0.15)' : 'rgba(215, 136, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(enemy.x - enemy.vx * 0.028, enemy.y - enemy.vy * 0.028, enemy.r * 0.85, 0, TAU);
    ctx.fill();
  }

  const barW = enemy.r * 2;
  const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(enemy.x - barW * 0.5, enemy.y - enemy.r - 10, barW, 4);
  ctx.fillStyle = enemy.boss ? '#ffd183' : '#f7a2bf';
  ctx.fillRect(enemy.x - barW * 0.5, enemy.y - enemy.r - 10, barW * ratio, 4);
}

function drawBullets() {
  const severe = isFxSevereLoad();
  const stride = severe ? 2 : 1;
  for (let i = 0; i < state.bullets.length; i += stride) {
    const b = state.bullets[i];
    if (b.lightning) {
      const ang = Math.atan2(b.vy, b.vx);
      const len = 16;
      const sx = b.x - Math.cos(ang) * len * 0.5;
      const sy = b.y - Math.sin(ang) * len * 0.5;
      const ex = b.x + Math.cos(ang) * len * 0.6;
      const ey = b.y + Math.sin(ang) * len * 0.6;
      const nx = Math.cos(ang + Math.PI / 2);
      const ny = Math.sin(ang + Math.PI / 2);

      ctx.strokeStyle = '#f7e7a6';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + nx * 3, sy + ny * 3);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(ex - nx * 3, ey - ny * 3);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.strokeStyle = '#fff6cc';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
  }
}

function drawSelectedCell(now) {
  if (!state.selectedCellFx) return;
  const elapsed = now - state.selectedCellFx.at;
  if (elapsed > 420) {
    state.selectedCellFx = null;
    return;
  }

  const { c, r, ok } = state.selectedCellFx;
  const x = c * GRID.cell;
  const y = r * GRID.cell;
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.025);

  ctx.strokeStyle = ok
    ? `rgba(143, 248, 191, ${0.35 + pulse * 0.4})`
    : `rgba(255, 145, 162, ${0.35 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1.5, y + 1.5, GRID.cell - 3, GRID.cell - 3);
}

function draw() {
  const nowMs = performance.now();
  const now = nowMs * 0.001;
  const backdrop = getBackgroundLayer();
  ctx.drawImage(backdrop, 0, 0);
  drawPathPreview();
  drawGrid();
  drawEndpoints(nowMs);

  for (const tower of state.towers) {
    const footprint = tower.footprint || 1;
    const x = tower.c * GRID.cell + 2;
    const y = tower.r * GRID.cell + 2;
    const w = GRID.cell * footprint - 4;
    const h = GRID.cell * footprint - 4;

    ctx.fillStyle = '#0f1727';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = borderColorForTowerKind(tower.kind);
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    drawTower(tower, now);

    const hpRatio = clamp(tower.hp / tower.maxHp, 0, 1);
    if (hpRatio < 0.999) {
      const hpBarW = 22 + (footprint - 1) * 18;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(tower.x - hpBarW * 0.5, tower.y - 18 - (footprint - 1) * 4, hpBarW, 4);
      ctx.fillStyle = hpRatio > 0.4 ? '#92f0b3' : '#ff8aa5';
      ctx.fillRect(tower.x - hpBarW * 0.5, tower.y - 18 - (footprint - 1) * 4, hpBarW * hpRatio, 4);
    }

    if (tower.level > 1) {
      const badgeR = 7 + (footprint - 1) * 2;
      const label = `L${tower.level}`;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${10 + (footprint - 1) * 2}px sans-serif`;
      ctx.fillStyle = 'rgba(7, 13, 24, 0.78)';
      ctx.strokeStyle = 'rgba(255, 209, 97, 0.92)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, badgeR, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = 'rgba(8, 15, 27, 0.95)';
      ctx.strokeText(label, tower.x, tower.y + 0.4);
      ctx.fillStyle = '#ffe8a6';
      ctx.fillText(label, tower.x, tower.y + 0.4);
      ctx.restore();
    }
  }

  for (const enemy of state.enemies) {
    drawEnemy(enemy, now);
  }

  drawBullets();
  drawSelectedCell(nowMs);
}

function transitionToFightPhase() {
  state.phase = 'fight';
  hintTextEl.textContent = '전투 중: 자동으로 공격합니다';
  tone(520, 0.05, 'triangle', 0.018);
}

function updateRunning(dt) {
  if (state.phase === 'build') {
    state.buildTimer -= dt;
    if (state.buildTimer <= 0) {
      transitionToFightPhase();
    }
  } else if (state.phase === 'fight') {
    updateSpawning(dt);
    updateEnemies(dt);
    if (state.mode !== 'running') return;
    updateTowers(dt);
    updateBullets(dt);

    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      stageClear();
      return;
    }
  }
}

function frame(now) {
  const dt = clamp((now - lastAt) / 1000, 0, 0.05);
  lastAt = now;

  if (!backgroundPaused && state.mode === 'running') {
    state.runTime += dt;
    updateRunning(dt);
  }

  draw();
  refreshHud();
  rafId = requestAnimationFrame(frame);
}

function setSellMode(on) {
  state.sellMode = Boolean(on);
  refreshBuildButtons();
}

function onCanvasPointerDown(event) {
  if (state.mode !== 'running' || state.phase !== 'build') return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const cell = worldToCell(x, y);
  if (!inBounds(cell.c, cell.r)) return;

  const tower = getTowerAt(cell.c, cell.r);

  let ok = false;
  if (tower) {
    if (state.sellMode) {
      ok = sellTower(tower);
    } else {
      ok = upgradeTower(tower);
    }
  } else if (!state.sellMode) {
    ok = placeTower(cell.c, cell.r);
  }

  state.selectedCellFx = {
    c: cell.c,
    r: cell.r,
    ok,
    at: performance.now(),
  };
}

function showExitModal() {
  exitModal.classList.remove('hidden');
}

function hideExitModal() {
  exitModal.classList.add('hidden');
}

async function closeCurrentView() {
  hideExitModal();
  await toss.setIosSwipeGestureEnabled(true);
  await toss.setDeviceOrientation('portrait');
  const closed = await toss.closeView();
  if (closed !== false) return;

  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '../index.html';
  }
}

function bindUiEvents() {
  canvas.addEventListener('pointerdown', onCanvasPointerDown);

  document.getElementById('buildStrip').addEventListener('click', (event) => {
    const towerBtn = event.target.closest('.build-btn[data-kind]');
    if (towerBtn) {
      state.selectedTower = towerBtn.dataset.kind;
      setSellMode(false);
      refreshBuildButtons();
      tone(380, 0.04, 'triangle', 0.015);
      return;
    }

    if (event.target.closest('#btnSellMode')) {
      setSellMode(!state.sellMode);
      tone(state.sellMode ? 250 : 360, 0.04, 'triangle', 0.015);
    }
  });

  overlayEl.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'start' || action === 'tutorial' || action === 'restart') {
      startRun();
      return;
    }

    if (action === 'pick-card') {
      const index = Number(event.target.closest('[data-card-index]')?.dataset.cardIndex);
      if (Number.isInteger(index)) {
        applyPickedCard(index);
      }
      return;
    }

    if (action === 'reward-continue') {
      showRewardedContinue();
    }
  });

  btnMusic.addEventListener('click', () => {
    audioSettings.bgmEnabled = !audioSettings.bgmEnabled;
    saveAudioSettings();
    syncAudioButtons();
    syncAudioRuntime();
    if (audioSettings.bgmEnabled) {
      bgmAudio?.unlock();
    }
  });

  btnSfx.addEventListener('click', () => {
    audioSettings.sfxEnabled = !audioSettings.sfxEnabled;
    saveAudioSettings();
    syncAudioButtons();
    syncAudioRuntime();
  });

  btnExit.addEventListener('click', () => {
    showExitModal();
  });

  btnCancelExit.addEventListener('click', () => {
    hideExitModal();
  });

  btnConfirmExit.addEventListener('click', () => {
    void closeCurrentView();
  });

  document.addEventListener('visibilitychange', () => {
    backgroundPaused = document.hidden;
  });
}

function preloadEnemyTankSprites() {
  for (const [key, src] of Object.entries(ENEMY_TANK_SOURCES)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    ENEMY_TANK_IMAGES[key] = image;
  }
}

async function initializeTossShell() {
  if (toss.isAvailable()) {
    try {
      applySafeAreaInsets(await toss.safeArea.get());
    } catch (error) {
      applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
    }

    unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
      applySafeAreaInsets(insets);
    });

    await toss.setDeviceOrientation('portrait');
    await toss.setIosSwipeGestureEnabled(false);

    unsubscribeBack = toss.events.onBack(() => {
      showExitModal();
    });

    unsubscribeHome = toss.events.onHome(() => {
      backgroundPaused = true;
    });
  } else {
    applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  }
}

function cleanup() {
  unsubscribeSafeArea();
  unsubscribeBack();
  unsubscribeHome();
  cleanupAdListeners();
  clearAdTimers();
  cancelAnimationFrame(rafId);
  void toss.setDeviceOrientation('portrait');
  void toss.setIosSwipeGestureEnabled(true);
}

async function init() {
  initializeAudioSystem();
  preloadEnemyTankSprites();
  bindUiEvents();
  refreshBuildButtons();
  refreshHud();
  buildDistanceMap();

  try {
    await initializeTossShell();
  } catch (error) {
    applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  }

  await initializeRewardedAd();
  showMenuOverlay();

  lastAt = performance.now();
  rafId = requestAnimationFrame(frame);
}

window.addEventListener('beforeunload', cleanup);

init();
