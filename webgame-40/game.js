const hudEl = document.getElementById('hud');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlayEl = document.getElementById('overlay');
const controlsEl = document.getElementById('controls');
const quickBuildEl = document.getElementById('quickBuild');

const stageTextEl = document.getElementById('stageText');
const baseTextEl = document.getElementById('baseText');
const goldTextEl = document.getElementById('goldText');
const aliveTextEl = document.getElementById('aliveText');
const queueTextEl = document.getElementById('queueText');
const killsTextEl = document.getElementById('killsText');
const timeTextEl = document.getElementById('timeText');
const speedTextEl = document.getElementById('speedText');
const buildHintEl = document.getElementById('buildHint');
const modeHelpEl = document.getElementById('modeHelp');
const towerGuideEl = document.getElementById('towerGuide');
const rankNameEl = document.getElementById('rankName');
const rankSaveEl = document.getElementById('rankSave');
const rankServerUrlEl = document.getElementById('rankServerUrl');
const rankRefreshEl = document.getElementById('rankRefresh');
const rankListEl = document.getElementById('rankList');
const rankScopeEl = document.getElementById('rankScope');
const rankStatusEl = document.getElementById('rankStatus');
const rankPanelEl = document.getElementById('singleRankPanel');
const rankToggleBtn = document.getElementById('btnRankToggle');
const detailToggleBtn = document.getElementById('btnDetailToggle');
const singleTabEl = document.getElementById('tabSingle');
const rankAdsEl = document.getElementById('rankAds');
const detailPanelEl = document.getElementById('detailPanel');

const btnSellMode = document.getElementById('btnSellMode');
const btnSpeedUp = document.getElementById('btnSpeedUp');
const btnPause = document.getElementById('btnPause');
const btnMerge = document.getElementById('btnMerge');
const btnChoLotto = document.getElementById('btnChoLotto');
const btnCull = document.getElementById('btnCull');
const btnEmperorShield = document.getElementById('btnEmperorShield');
const btnSunken = document.getElementById('btnSunken');
try {
  const audioKey = 'taptapcho_neon_audio_v1';
  const raw = localStorage.getItem(audioKey);
  const parsed = raw ? JSON.parse(raw) : {};
  parsed.bgm = true;
  parsed.sfx = true;
  if (typeof parsed.volume !== 'number') parsed.volume = 0.32;
  localStorage.setItem(audioKey, JSON.stringify(parsed));
} catch (_) {}

const bgmAudio = window.TapTapNeonAudio?.create('webgame-40', null, {
  theme: 'rush',
  mediaSrc: '../assets/audio/battleThemeA.mp3',
  showThemeToggle: false,
  showSfxToggle: false,
});

const ENEMY_TANK_SOURCES = {
  ghoul: '../assets/kenney_tanks/png/tanks_tankGreen1.png',
  bat: '../assets/kenney_tanks/png/tanks_tankGrey1.png',
  hopper: '../assets/kenney_tanks/png/tanks_tankGrey1.png',
  brute: '../assets/kenney_tanks/png/tanks_tankDesert2.png',
  elder: '../assets/kenney_tanks/png/tanks_tankNavy3.png',
  raider: '../assets/kenney_tanks/png/tanks_tankGrey4.png',
  crusher: '../assets/kenney_tanks/png/tanks_tankDesert5.png',
  juggernaut: '../assets/kenney_tanks/png/tanks_tankNavy5.png',
  bulwark: '../assets/kenney_tanks/png/tanks_tankDesert5.png',
  behemoth: '../assets/kenney_tanks/png/tanks_tankNavy5.png',
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

function isSfxEnabled() {
  return true;
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

const isMobileView = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
const LOGICAL_W = isMobileView ? 720 : 960;
// Desktop canvas height should stay aligned to grid-cell multiples to avoid blocked bottom rows.
const LOGICAL_H = isMobileView ? 960 : 510;
const RENDER_SCALE = isMobileView ? 0.85 : 1;
canvas.width = Math.floor(LOGICAL_W * RENDER_SCALE);
canvas.height = Math.floor(LOGICAL_H * RENDER_SCALE);
const GRID_CELL = isMobileView ? 48 : 30;
const BALANCE_SCALE = GRID_CELL / 30;

const W = LOGICAL_W;
const H = LOGICAL_H;
const TAU = Math.PI * 2;
let battlefieldBackdrop = null;

const SINGLE_RANK = {
  profileKey: 'taptapcho_web40_single_rank_profile_v1',
  localKey: 'taptapcho_web40_single_rank_local_v1',
  serverKey: 'taptapcho_web40_single_rank_server_v1',
  maxSave: 30,
  showCount: 10,
};

const singleRankState = {
  playerId: '',
  playerName: '',
  localRows: [],
  remoteRows: [],
  ws: null,
  connected: false,
  serverUrl: '',
  connectTried: false,
};

const GRID = {
  cell: GRID_CELL,
  cols: Math.floor(W / GRID_CELL),
  rows: Math.floor(H / GRID_CELL),
};

const SPAWN = { c: 0, r: Math.floor(GRID.rows / 2) };
const GOAL = { c: GRID.cols - 1, r: Math.floor(GRID.rows / 2) };
const MAX_TOWER_LEVEL = 8;
const MAX_SIM_SUBSTEP = 1 / 120;

const TOWER_TYPES = {
  sunken: {
    id: 'sunken',
    name: 'Sunken',
    cost: 40,
    color: '#8f5bff',
    range: 105 * BALANCE_SCALE,
    damage: 30,
    reload: 0.5,
    bulletSpeed: 360 * BALANCE_SCALE,
    pierce: 0,
    hp: 250,
  },
  // Long Sunken removed
  sunkenSplash: {
    id: 'sunkenSplash',
    name: 'Splash Sunken',
    cost: 130,
    color: '#111214',
    range: 114 * BALANCE_SCALE,
    damage: 36,
    reload: 0.9,
    bulletSpeed: 320 * BALANCE_SCALE,
    pierce: 0,
    hp: 290,
    splashRadius: 66 * BALANCE_SCALE,
    splashFalloff: 0.42,
  },
  sunkenHammer: {
    id: 'sunkenHammer',
    name: 'Hammer Sunken',
    cost: 120,
    color: '#ff4d4d',
    range: 84 * BALANCE_SCALE,
    damage: 46,
    reload: 0.95,
    bulletSpeed: 300 * BALANCE_SCALE,
    pierce: 0,
    hp: 320,
    splashRadius: 74 * BALANCE_SCALE,
    splashFalloff: 0.5,
  },
  lottoSunken: {
    id: 'lottoSunken',
    name: 'Lotto Sunken',
    cost: 1000,
    color: '#63ff9a',
    range: 104 * BALANCE_SCALE,
    damage: 22,
    reload: 0.95,
    bulletSpeed: 300 * BALANCE_SCALE,
    pierce: 0,
    hp: 280,
    splashRadius: 80 * BALANCE_SCALE,
    splashFalloff: 0.45,
    poisonDuration: 3.6,
    poisonDps: 6.5,
  },
  sunkenNova: {
    id: 'sunkenNova',
    name: 'Nova Sunken',
    cost: 145,
    color: '#c69bff',
    range: 124 * BALANCE_SCALE,
    damage: 15,
    reload: 1.05,
    bulletSpeed: 330 * BALANCE_SCALE,
    pierce: 0,
    hp: 275,
  },
  sunkenStun: {
    id: 'sunkenStun',
    name: 'Stun Sunken',
    cost: 165,
    color: '#7cff8d',
    range: 120 * BALANCE_SCALE,
    damage: 20,
    reload: 1.12,
    bulletSpeed: 340 * BALANCE_SCALE,
    pierce: 0,
    hp: 300,
    stunDuration: 0.9,
    stunChain: 3,
    stunRadius: 74 * BALANCE_SCALE,
  },
  speedSunken: {
    id: 'speedSunken',
    name: 'Speed Sunken',
    cost: 70,
    color: '#ffffff',
    range: 124 * BALANCE_SCALE,
    damage: 18,
    reload: 0.28,
    bulletSpeed: 420 * BALANCE_SCALE,
    pierce: 0,
    hp: 190,
  },
  tankerSunken: {
    id: 'tankerSunken',
    name: 'Tanker Sunken',
    cost: 95,
    color: '#7fe0a7',
    range: 92 * BALANCE_SCALE,
    damage: 12,
    reload: 0.96,
    bulletSpeed: 300 * BALANCE_SCALE,
    pierce: 0,
    hp: 760,
    tauntRadius: 44 * BALANCE_SCALE,
    damageMitigation: 0.42,
  },
  // Obelisk removed
  // Snare removed
};

const state = {
  mode: 'menu',
  stage: 1,
  maxStage: 50,
  baseHp: 20,
  gold: 160,
  kills: 0,
  score: 0,
  selectedTower: 'sunken',
  selectedCell: null,
  sunkenFootprint: 1,
  sellMode: false,
  mergeMode: false,
  mergePick: null,
  paused: false,
  pauseUses: 0,
  cullUses: 0,
  choLottoActive: false,
  runTime: 0,
  simSpeed: 1,
  stageTimer: 0,
  stageStartAt: 0,
  spawnQueue: [],
  spawnTimer: 0,
  enemies: [],
  towers: [],
  nextTowerId: 1,
  spawnSerial: 0,
  bullets: [],
  particles: [],
  blocked: new Set(),
  dist: [],
  distJump: [],
  towerHpBonus: 0,
  rushDamageBonus: 0,
  pendingStage: 0,
  pendingStageBonusGold: 0,
  rewardUiUnlockAt: 0,
  emperorShieldTimer: 0,
  onboarding: {
    firstBuild: false,
    firstUpgrade: false,
    firstClear: false,
  },
  emperorShieldFx: 0,
  emperorShieldHitCooldown: 0,
  emperorShieldUses: 0,
  mergeCheckVersion: 0,
  mergeCheckSnapshotVersion: -1,
  mergeCheckResult: false,
  banner: { text: '', ttl: 0, warn: false },
};

const EMPEROR_SHIELD_COST = 1000;
const EMPEROR_SHIELD_DURATION = 10;
const EMPEROR_SHIELD_MAX_USES = 5;
const MERGE_FUSION_MAX = 5;

const CULL_COST = 10000;
const CULL_HP_MULT = 0.5;
const CULL_MAX_USES = 5;

const CHO_LOTTO_COST = 1000;
const CHO_LOTTO_CHANCE = 0.1;

const STUN_IMMUNE_BOSS_STAGES = [5, 15, 25, 35, 45];

const TURN_SLOW_DURATION = 0.35;
const TURN_SLOW_MUL = 0.82;

const MAX_PARTICLES = isMobileView ? 420 : 900;
const MAX_BULLETS = isMobileView ? 420 : 900;
const MAX_ENEMIES = isMobileView ? 160 : 260;

const sfxCtx = window.AudioContext ? new AudioContext() : null;

function sfx(freq, duration = 0.06, type = 'triangle', gain = 0.02) {
  if (!sfxCtx) return;
  if (sfxCtx.state === 'suspended') sfxCtx.resume();
  const now = sfxCtx.currentTime;
  const osc = sfxCtx.createOscillator();
  const amp = sfxCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(sfxCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pushParticle(p) {
  if (state.particles.length >= MAX_PARTICLES) return;
  if (isMobileView && Math.random() > 0.55) return;
  const life = p.life ?? 0.18;
  state.particles.push({
    ...p,
    life,
    ttl: p.ttl || life,
  });
}

function pushBullet(b) {
  if (state.bullets.length >= MAX_BULLETS) return;
  state.bullets.push(b);
}

function buildEnemyBuckets() {
  const buckets = new Map();
  for (const enemy of state.enemies) {
    const cell = worldToCell(enemy.x, enemy.y);
    const key = `${cell.c},${cell.r}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(enemy);
  }
  return buckets;
}

function buildTowerBuckets() {
  const buckets = new Map();
  for (const tower of state.towers) {
    const cell = worldToCell(tower.x, tower.y);
    const key = `${cell.c},${cell.r}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(tower);
  }
  return buckets;
}

function collectNearbyEnemies(buckets, c, r, radiusCells = 1) {
  const list = [];
  for (let dc = -radiusCells; dc <= radiusCells; dc += 1) {
    for (let dr = -radiusCells; dr <= radiusCells; dr += 1) {
      const key = `${c + dc},${r + dr}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      list.push(...bucket);
    }
  }
  return list;
}

function collectNearbyTowers(buckets, c, r, radiusCells = 1) {
  const list = [];
  for (let dc = -radiusCells; dc <= radiusCells; dc += 1) {
    for (let dr = -radiusCells; dr <= radiusCells; dr += 1) {
      const key = `${c + dc},${r + dr}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      list.push(...bucket);
    }
  }
  return list;
}

function randomPlayerId() {
  return `p-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function sanitizeRankName(raw) {
  return String(raw || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 14);
}

function normalizeRankName(raw) {
  const name = sanitizeRankName(raw);
  return name || `Player${Math.floor(rand(100, 999))}`;
}

function normalizeRankRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const stage = clamp(Math.floor(Number(raw.stage) || 0), 1, 999);
  const kills = clamp(Math.floor(Number(raw.kills) || 0), 0, 999999);
  const score = clamp(Math.floor(Number(raw.score) || 0), 0, 999999999);
  const timeSec = Math.max(0, Math.floor(Number(raw.timeSec) || 0));
  const updatedAt = Math.floor(Number(raw.updatedAt || Date.now()));
  const playerId = String(raw.playerId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
  if (!playerId) return null;
  return {
    playerId,
    playerName: normalizeRankName(raw.playerName || raw.name),
    stage,
    kills,
    score,
    timeSec,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

function compareRankRows(a, b) {
  if (a.stage !== b.stage) return b.stage - a.stage;
  if (a.kills !== b.kills) return b.kills - a.kills;
  if (a.score !== b.score) return b.score - a.score;
  return a.updatedAt - b.updatedAt;
}

function isBetterRankRow(next, prev) {
  return compareRankRows(next, prev) < 0;
}

function saveRankProfile() {
  try {
    localStorage.setItem(SINGLE_RANK.profileKey, JSON.stringify({
      playerId: singleRankState.playerId,
      playerName: singleRankState.playerName,
      serverUrl: singleRankState.serverUrl,
    }));
    localStorage.setItem(SINGLE_RANK.serverKey, singleRankState.serverUrl || '');
  } catch (_) {}
}

function loadRankProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SINGLE_RANK.profileKey) || '{}');
    const playerId = String(parsed.playerId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
    const playerName = sanitizeRankName(parsed.playerName || '');
    const serverUrl = String(parsed.serverUrl || '').trim();
    return { playerId, playerName, serverUrl };
  } catch (_) {
    return { playerId: '', playerName: '', serverUrl: '' };
  }
}

function saveLocalRankRows() {
  try {
    localStorage.setItem(SINGLE_RANK.localKey, JSON.stringify(singleRankState.localRows));
  } catch (_) {}
}

function loadLocalRankRows() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SINGLE_RANK.localKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRankRow)
      .filter(Boolean)
      .sort(compareRankRows)
      .slice(0, SINGLE_RANK.maxSave);
  } catch (_) {
    return [];
  }
}

function rankRowsToRender() {
  if (singleRankState.connected && singleRankState.remoteRows.length > 0) {
    return singleRankState.remoteRows;
  }
  return singleRankState.localRows;
}

function renderSingleRank() {
  if (!rankListEl) return;
  rankListEl.innerHTML = '';
  const rows = rankRowsToRender().slice(0, SINGLE_RANK.showCount);

  if (!rows.length) {
    const li = document.createElement('li');
    li.textContent = 'No records';
    rankListEl.appendChild(li);
    return;
  }

  rows.forEach((row, idx) => {
    const li = document.createElement('li');
    if (idx === 0) li.classList.add('top1');
    const meTag = row.playerId === singleRankState.playerId ? ' · YOU' : '';
    li.textContent = `${idx + 1}. ${row.playerName} · Stage ${row.stage} · Kills ${row.kills} · Time ${formatTime(row.timeSec)}${meTag}`;
    rankListEl.appendChild(li);
  });
}

function setRankStatus(text) {
  if (!rankStatusEl) return;
  rankStatusEl.textContent = text;
}

function setRankScope(text) {
  if (!rankScopeEl) return;
  rankScopeEl.textContent = text;
}

function defaultRankServerUrl() {
  const host = window.location.hostname;
  if (!host) return '';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${host}:9091`;
}

function updateLocalRank(row) {
  const idx = singleRankState.localRows.findIndex((it) => it.playerId === row.playerId);
  if (idx < 0) {
    singleRankState.localRows.push(row);
  } else {
    const prev = singleRankState.localRows[idx];
    if (isBetterRankRow(row, prev)) {
      singleRankState.localRows[idx] = row;
    } else {
      singleRankState.localRows[idx] = {
        ...prev,
        playerName: row.playerName,
        updatedAt: Math.max(prev.updatedAt, row.updatedAt),
      };
    }
  }
  singleRankState.localRows = singleRankState.localRows
    .map(normalizeRankRow)
    .filter(Boolean)
    .sort(compareRankRows)
    .slice(0, SINGLE_RANK.maxSave);
  saveLocalRankRows();
}

function normalizeRankServerUrl(raw) {
  const source = String(raw || '').trim();
  if (!source) return '';
  let candidate = source;
  if (/^https?:\/\//i.test(candidate)) {
    candidate = candidate.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
  } else if (!/^wss?:\/\//i.test(candidate)) {
    const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    candidate = `${proto}${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return '';
    const host = parsed.hostname;
    if (!host) return '';
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${host}${port}`;
  } catch (_) {
    return '';
  }
}

function fixedRankServerUrl() {
  const configured = window.TapTapChoConfig?.singleRankServer;
  return normalizeRankServerUrl(configured || '');
}

function syncRankInputs() {
  if (rankNameEl) rankNameEl.value = singleRankState.playerName || '';
  if (rankServerUrlEl) rankServerUrlEl.value = singleRankState.serverUrl || '';
}

function sendRankIdentityToServer(ws = singleRankState.ws) {
  if (!singleRankState.playerName) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const payload = {
    type: 'set_identity',
    playerId: singleRankState.playerId,
    name: singleRankState.playerName,
  };
  ws.send(JSON.stringify(payload));
  ws.send(JSON.stringify({ type: 'single_rank_register', ...payload }));
}

function ensureRankIdentityRegistered() {
  if (singleRankState.playerName) return true;
  setRankStatus('Set a name to save online.');
  flashBanner('Name required', 0.9, true);
  if (rankNameEl) {
    rankNameEl.focus();
    rankNameEl.select?.();
  }
  return false;
}

function applyRankProfileFromInput(connectNow = false) {
  const nextName = sanitizeRankName(rankNameEl ? rankNameEl.value : singleRankState.playerName);
  if (!nextName) {
    ensureRankIdentityRegistered();
    return false;
  }

  const fixedServer = fixedRankServerUrl();
  const rawServer = fixedServer || (rankServerUrlEl ? rankServerUrlEl.value : (singleRankState.serverUrl || defaultRankServerUrl()));
  const nextServer = normalizeRankServerUrl(rawServer || defaultRankServerUrl());

  singleRankState.playerName = nextName;
  singleRankState.serverUrl = nextServer || '';
  saveRankProfile();
  syncRankInputs();

  if (singleRankState.connected && singleRankState.ws && singleRankState.ws.readyState === WebSocket.OPEN) {
    sendRankIdentityToServer(singleRankState.ws);
    setRankStatus('Name saved · waiting for sync');
  } else {
    setRankStatus(singleRankState.serverUrl ? 'Name saved · connecting...' : 'Name saved · local mode');
  }

  if (connectNow) {
    singleRankState.connectTried = false;
    openRankSocket(true);
  }
  return true;
}

function openRankSocket(force = false) {
  if (!rankListEl) return;
  if (singleRankState.connected) return;
  if (singleRankState.connectTried && !force) return;
  singleRankState.connectTried = true;

  const url = fixedRankServerUrl() || singleRankState.serverUrl || defaultRankServerUrl();
  if (!url) {
    setRankScope('LOCAL');
    setRankStatus('No server URL · local mode');
    renderSingleRank();
    return;
  }

  if (singleRankState.ws) {
    try { singleRankState.ws.close(); } catch (_) {}
    singleRankState.ws = null;
  }

  let ws;
  try {
    ws = new WebSocket(url);
  } catch (_) {
    setRankScope('LOCAL');
    setRankStatus('Server connect failed · local mode');
    renderSingleRank();
    return;
  }

  singleRankState.ws = ws;
  setRankStatus('Connecting to rank server...');

  ws.addEventListener('open', () => {
    if (singleRankState.ws !== ws) return;
    singleRankState.connected = true;
    singleRankState.serverUrl = url;
    syncRankInputs();
    saveRankProfile();
    setRankScope('ONLINE');
    setRankStatus(singleRankState.playerName ? 'Online leaderboard connected' : 'Connected · set name');

    sendRankIdentityToServer(ws);
    ws.send(JSON.stringify({ type: 'single_rank_list', limit: SINGLE_RANK.showCount }));
  });

  ws.addEventListener('message', (event) => {
    if (singleRankState.ws !== ws) return;
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (_) {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'single_rank_list' && Array.isArray(msg.entries)) {
      singleRankState.remoteRows = msg.entries
        .map(normalizeRankRow)
        .filter(Boolean)
        .sort(compareRankRows)
        .slice(0, SINGLE_RANK.maxSave);
      renderSingleRank();
      setRankStatus(singleRankState.remoteRows.length ? 'Online leaderboard updated' : 'No online records');
      return;
    }

    if (msg.type === 'single_rank_registered') {
      if (typeof msg.playerId === 'string' && msg.playerId) {
        singleRankState.playerId = String(msg.playerId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36) || singleRankState.playerId;
      }
      if (typeof msg.name === 'string' && msg.name) {
        singleRankState.playerName = sanitizeRankName(msg.name);
      }
      saveRankProfile();
      syncRankInputs();
      setRankStatus('Player registered');
      return;
    }

    if (msg.type === 'single_rank_ack') {
      if (Array.isArray(msg.entries)) {
        singleRankState.remoteRows = msg.entries
          .map(normalizeRankRow)
          .filter(Boolean)
          .sort(compareRankRows)
          .slice(0, SINGLE_RANK.maxSave);
        renderSingleRank();
      }
      if (Number.isFinite(Number(msg.rank))) {
        setRankStatus(`Rank updated · #${Math.floor(Number(msg.rank))}`);
      }
    }
  });

  ws.addEventListener('close', () => {
    if (singleRankState.ws !== ws) return;
    singleRankState.connected = false;
    singleRankState.ws = null;
    setRankScope('LOCAL');
    setRankStatus('Offline · local leaderboard');
    renderSingleRank();
  });

  ws.addEventListener('error', () => {
    if (singleRankState.ws !== ws) return;
    singleRankState.connected = false;
    singleRankState.ws = null;
    setRankScope('LOCAL');
    setRankStatus('Server error · local leaderboard');
    renderSingleRank();
  });
}

function submitSingleRank(resultMode = 'defeat') {
  if (!ensureRankIdentityRegistered()) return;

  const stage = resultMode === 'victory'
    ? state.maxStage
    : clamp(Math.floor(state.stage || 1), 1, state.maxStage);

  const row = normalizeRankRow({
    playerId: singleRankState.playerId,
    playerName: singleRankState.playerName,
    stage,
    kills: state.kills,
    score: state.score,
    timeSec: Math.floor(state.runTime || 0),
    updatedAt: Date.now(),
  });
  if (!row) return;

  updateLocalRank(row);
  renderSingleRank();
  setRankStatus(`Local saved · Stage ${row.stage} / Kills ${row.kills}`);

  if (singleRankState.connected && singleRankState.ws && singleRankState.ws.readyState === WebSocket.OPEN) {
    singleRankState.ws.send(JSON.stringify({
      type: 'single_rank_submit',
      playerId: singleRankState.playerId,
      name: singleRankState.playerName,
      stage: row.stage,
      kills: row.kills,
      score: row.score,
      timeSec: row.timeSec,
      limit: SINGLE_RANK.showCount,
    }));
  }
}

function initSingleRank() {
  if (!rankListEl) return;
  const profile = loadRankProfile();
  let savedServerUrl = '';
  try {
    savedServerUrl = String(localStorage.getItem(SINGLE_RANK.serverKey) || '').trim();
  } catch (_) {}
  singleRankState.playerId = profile.playerId || randomPlayerId();
  singleRankState.playerName = sanitizeRankName(profile.playerName || '');
  singleRankState.serverUrl = fixedRankServerUrl()
    || normalizeRankServerUrl(profile.serverUrl || savedServerUrl || defaultRankServerUrl())
    || defaultRankServerUrl();
  singleRankState.localRows = loadLocalRankRows();
  const seededRow = normalizeRankRow({
    playerId: 'p-yujaeyoung',
    playerName: '유재영',
    stage: 35,
    kills: 34500,
    score: 28500000,
    timeSec: 754,
    updatedAt: Date.now(),
  });
  if (seededRow) updateLocalRank(seededRow);

  if (rankNameEl) {
    rankNameEl.addEventListener('blur', () => {
      rankNameEl.value = sanitizeRankName(rankNameEl.value);
    });
    rankNameEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyRankProfileFromInput(true);
      }
    });
  }

  if (rankSaveEl) {
    rankSaveEl.addEventListener('click', () => {
      applyRankProfileFromInput(true);
    });
  }

  if (rankRefreshEl) {
    rankRefreshEl.addEventListener('click', () => {
      if (singleRankState.connected && singleRankState.ws && singleRankState.ws.readyState === WebSocket.OPEN) {
        singleRankState.ws.send(JSON.stringify({ type: 'single_rank_list', limit: SINGLE_RANK.showCount }));
        setRankStatus('Refreshing online leaderboard...');
      } else {
        openRankSocket(true);
      }
    });
  }

  syncRankInputs();
  saveRankProfile();
  setRankScope('LOCAL');
  setRankStatus(singleRankState.playerName ? 'Profile loaded' : 'Set name and Save');
  renderSingleRank();
  openRankSocket(false);
}

function toIndex(c, r) {
  return r * GRID.cols + c;
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

function inBounds(c, r) {
  return c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows;
}

function isReserved(c, r) {
  return (c === SPAWN.c && r === SPAWN.r) || (c === GOAL.c && r === GOAL.r);
}

function keyOf(c, r) {
  return `${c}:${r}`;
}

function getTower(c, r) {
  return state.towers.find((tower) => (
    c >= tower.c
    && c < tower.c + (tower.footprint || 1)
    && r >= tower.r
    && r < tower.r + (tower.footprint || 1)
  ));
}

function getPlacementSpec(kind) {
  const base = TOWER_TYPES[kind];
  if (!base) return null;

  if (kind === 'sunken' && state.sunkenFootprint === 2) {
    return {
      kind,
      footprint: 2,
      cost: 120,
      range: base.range * 1.34,
      damage: base.damage * 1.62,
      reload: base.reload * 1.08,
      bulletSpeed: base.bulletSpeed * 1.03,
      pierce: base.pierce,
      hp: base.hp * 2.45,
      color: base.color,
      splashRadius: base.splashRadius || 0,
      splashFalloff: base.splashFalloff || 0,
      tauntRadius: base.tauntRadius || 0,
      damageMitigation: base.damageMitigation || 0,
    };
  }

  let cost = base.cost;

  return {
    kind,
    footprint: 1,
    cost,
    range: base.range,
    damage: base.damage,
    reload: base.reload,
    bulletSpeed: base.bulletSpeed,
    pierce: base.pierce,
    hp: base.hp,
    color: base.color,
    splashRadius: base.splashRadius || 0,
    splashFalloff: base.splashFalloff || 0,
    tauntRadius: base.tauntRadius || 0,
    damageMitigation: base.damageMitigation || 0,
  };
}

function getFootprintCells(c, r, footprint) {
  const cells = [];
  for (let ry = 0; ry < footprint; ry += 1) {
    for (let rx = 0; rx < footprint; rx += 1) {
      cells.push({ c: c + rx, r: r + ry });
    }
  }
  return cells;
}

function canUseFootprint(cells) {
  for (const cell of cells) {
    if (!inBounds(cell.c, cell.r)) return false;
    if (isReserved(cell.c, cell.r)) return false;
    if (getTower(cell.c, cell.r)) return false;
  }
  return true;
}

function passable(c, r) {
  if (!inBounds(c, r)) return false;
  if (isReserved(c, r)) return true;
  return !state.blocked.has(keyOf(c, r));
}

function passableForEnemy(enemy, c, r) {
  if (!inBounds(c, r)) return false;
  if (isReserved(c, r)) return true;
  return !state.blocked.has(keyOf(c, r));
}

function buildDistanceMap() {
  const size = GRID.cols * GRID.rows;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function buildDist(ignoreBlocks = false) {
    const dist = Array(size).fill(Infinity);
    const q = new Int32Array(size);
    let head = 0;
    let tail = 0;

    const goalIdx = toIndex(GOAL.c, GOAL.r);
    dist[goalIdx] = 0;
    q[tail++] = goalIdx;

    while (head < tail) {
      const idx = q[head++];
      const c = idx % GRID.cols;
      const r = Math.floor(idx / GRID.cols);
      const d = dist[idx] + 1;

      for (const [dc, dr] of dirs) {
        const nc = c + dc;
        const nr = r + dr;
        const canPass = ignoreBlocks ? inBounds(nc, nr) : passable(nc, nr);
        if (!canPass) continue;
        const nIdx = toIndex(nc, nr);
        if (dist[nIdx] <= d) continue;
        dist[nIdx] = d;
        q[tail++] = nIdx;
      }
    }

    return dist;
  }

  const dist = buildDist(false);
  state.dist = dist;
  state.distJump = buildDist(true);
  return Number.isFinite(dist[toIndex(SPAWN.c, SPAWN.r)]);
}

function neighborStep(c, r, enemy = null) {
  const distMap = (enemy?.jumper || enemy?.towerBreaker) ? state.distJump : state.dist;
  const current = distMap[toIndex(c, r)];
  let bestC = c;
  let bestR = r;
  let best = current;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const [dc, dr] of dirs) {
    const nc = c + dc;
    const nr = r + dr;
    if (!passableForEnemy(enemy, nc, nr)) continue;
    const d = distMap[toIndex(nc, nr)];
    if (d < best) {
      best = d;
      bestC = nc;
      bestR = nr;
    }
  }

  return { c: bestC, r: bestR, valid: Number.isFinite(best) };
}

function flashBanner(text, ttl = 1.2, warn = false) {
  if (isMobileView && state.mode === 'playing') {
    const noisyCombatBanner = (
      text.startsWith('BASE -')
      || text.includes('DESTROYED')
      || text.includes('Snare:')
    );
    if (noisyCombatBanner) return;
    ttl = Math.min(ttl, 0.58);
  }

  state.banner.text = text;
  state.banner.ttl = ttl;
  state.banner.warn = warn;
}

function makeTower(kind, c, r, spec = null) {
  const base = TOWER_TYPES[kind];
  const placement = spec || getPlacementSpec(kind);
  const footprint = placement?.footprint || 1;
  const center = cellCenter(c + (footprint - 1) * 0.5, r + (footprint - 1) * 0.5);
  const hpMul = 1 + state.towerHpBonus;
  return {
    id: state.nextTowerId++,
    kind,
    fusedKinds: [kind],
    fusedLevels: { [kind]: 1 },
    c,
    r,
    footprint,
    x: center.x,
    y: center.y,
    level: 1,
    baseCost: placement.cost,
    spent: placement.cost,
    range: placement.range,
    damage: placement.damage,
    reload: placement.reload,
    bulletSpeed: placement.bulletSpeed,
    pierce: placement.pierce,
    splashRadius: placement.splashRadius || 0,
    splashFalloff: placement.splashFalloff || 0,
    maxHp: placement.hp * hpMul,
    hp: placement.hp * hpMul,
    cooldown: rand(0.02, placement.reload),
    color: placement.color || base.color,
    snareDuration: base.snareDuration || 0,
    snareSlow: base.snareSlow || 1,
    weakenMul: base.weakenMul || 1,
    stunDuration: base.stunDuration || 0,
    stunChain: base.stunChain || 0,
    stunRadius: base.stunRadius || 0,
    poisonDuration: base.poisonDuration || 0,
    poisonDps: base.poisonDps || 0,
    laserWidth: base.laserWidth || 0,
    tauntRadius: placement.tauntRadius || 0,
    damageMitigation: clamp(placement.damageMitigation || 0, 0, 0.8),
    guardHitFx: 0,
    guardHitPulse: 0,
    guardHitCooldown: 0,
  };
}

function upgradeCost(tower) {
  const base = tower.baseCost || TOWER_TYPES[tower.kind].cost;
  // Late levels (4+, 6+) apply extra weight so upgrade cost ramps harder.
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
  tower.reload *= stats.reloadMul;
  tower.pierce = Math.min(3, tower.pierce + (kind === 'obelisk' ? 1 : 0));

  if (kind === 'sunkenSplash') {
    tower.splashRadius *= 1.15;
    tower.splashFalloff = clamp(tower.splashFalloff + 0.05, 0.3, 0.68);
  } else if (kind === 'sunkenHammer') {
    tower.splashRadius *= 1.12;
    tower.splashFalloff = clamp(tower.splashFalloff + 0.04, 0.32, 0.7);
  } else if (kind === 'lottoSunken') {
    tower.poisonDuration *= 1.15;
    tower.poisonDps *= 1.12;
  } else if (kind === 'tankerSunken') {
    tower.tauntRadius *= 1.08;
    tower.damageMitigation = clamp((tower.damageMitigation || 0) + 0.03, 0, 0.8);
  } else if (kind === 'sunkenStun') {
    tower.stunDuration = Math.min(2.1, tower.stunDuration * 1.1);
    tower.stunRadius *= 1.06;
    const chainLevel = levelForChain ?? tower.level;
    if (chainLevel === 3 || chainLevel === 5 || chainLevel === 7) {
      tower.stunChain = Math.min(6, (tower.stunChain || 3) + 1);
    }
  }
}

function upgradeTower(tower) {
  const fusedLevels = tower.fusedLevels || { [tower.kind]: tower.level };
  const upgradeableKinds = Object.entries(fusedLevels).filter(([, lv]) => lv < MAX_TOWER_LEVEL);
  if (upgradeableKinds.length === 0) return false;

  const cost = upgradeableKinds.reduce((sum, [kind, lv]) => (
    sum + upgradeCost({ level: lv, baseCost: TOWER_TYPES[kind]?.cost || tower.baseCost || 0 })
  ), 0);
  if (state.gold < cost) {
    flashBanner('Need Gold', 0.9, true);
    return false;
  }

  state.gold -= cost;
  tower.spent += cost;

  for (const [kind, lv] of upgradeableKinds) {
    const factors = getTowerUpgradeFactors(kind);
    fusedLevels[kind] = Math.min(MAX_TOWER_LEVEL, lv + 1);
    applyTowerUpgradeScaling(tower, factors, kind, fusedLevels[kind]);
  }

  tower.fusedLevels = fusedLevels;
  tower.level = Math.max(...Object.values(fusedLevels));
  tower.maxHp *= 1.34;
  tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.25);

  let banner = `UPGRADE Lv.${tower.level} (Fused)`;
  if (!state.onboarding.firstUpgrade) {
    state.onboarding.firstUpgrade = true;
    const bonus = 40;
    state.gold += bonus;
    banner = `UPGRADE Lv.${tower.level} +${bonus} GOLD`;
  }
  flashBanner(banner, 0.75);
  sfx(660, 0.07, 'triangle', 0.022);
  return true;
}

function tryPlaceTower(c, r) {
  const existing = getTower(c, r);
  if (existing) {
    upgradeTower(existing);
    return;
  }

  const placement = getPlacementSpec(state.selectedTower);
  if (!placement) return;

  if (state.selectedTower === 'lottoSunken' && !state.choLottoActive) {
    flashBanner('Win Lotto Sunken first', 0.7, true);
    return;
  }

  if (state.gold < placement.cost) {
    flashBanner('Need Gold', 0.9, true);
    return;
  }

  const footprintCells = getFootprintCells(c, r, placement.footprint);
  if (!canUseFootprint(footprintCells)) {
    flashBanner('Invalid spot', 0.85, true);
    sfx(180, 0.06, 'sawtooth', 0.02);
    return;
  }

  for (const cell of footprintCells) {
    state.blocked.add(keyOf(cell.c, cell.r));
  }
  const ok = buildDistanceMap();
  if (!ok) {
    for (const cell of footprintCells) {
      state.blocked.delete(keyOf(cell.c, cell.r));
    }
    buildDistanceMap();
    flashBanner('Path blocked', 1.1, true);
    sfx(170, 0.08, 'sawtooth', 0.03);
    return;
  }

  const tower = makeTower(state.selectedTower, c, r, placement);
  state.towers.push(tower);
  invalidateMergeCache();
  state.gold -= placement.cost;
  if (state.selectedTower === 'lottoSunken') {
    state.choLottoActive = false;
    state.selectedTower = 'sunken';
  }

  impactSfx.play('build', { volume: 0.28, minGap: 0.045, rateMin: 0.96, rateMax: 1.04 });

  if (!state.onboarding.firstBuild) {
    state.onboarding.firstBuild = true;
    const bonus = 80;
    state.gold += bonus;
    flashBanner(`FIRST BUILD +${bonus} GOLD`, 0.9);
    sfx(520, 0.07, 'triangle', 0.02);
  }

  for (const enemy of state.enemies) {
    enemy.repath = 0;
  }
  refreshBuildHint();
  sfx(420 + rand(-20, 30), 0.04, 'triangle', 0.014);
}

function sellTower(c, r) {
  const tower = getTower(c, r);
  if (!tower) return;
  const refund = Math.floor(tower.spent);
  state.gold += refund;
  removeTower(tower);
  flashBanner(`SELL +${refund}`, 0.8);
  impactSfx.play('build', { volume: 0.2, minGap: 0.05, rateMin: 0.92, rateMax: 0.98 });
  sfx(340, 0.06, 'triangle', 0.018);
}

function makeEnemy(type) {
  const s = state.stage;
  const stageIndex = s - 1;
  const earlyStageIndex = Math.min(stageIndex, 9);
  const lateIndex = Math.max(0, s - 10);
  const pressureIndex = Math.max(0, s - 14);
  const nightmareIndex = Math.max(0, s - 20);
  const brutalIndex = Math.max(0, s - 24);
  const overdriveIndex = Math.max(0, s - 35);
  const stageSpeedMul = (
    1
    + earlyStageIndex * 0.045
    + lateIndex * 0.03
    + lateIndex * lateIndex * 0.0014
    + pressureIndex * 0.02
    + nightmareIndex * 0.05
    + nightmareIndex * nightmareIndex * 0.006
  );
  const stageHpMul = (
    1
    + earlyStageIndex * 0.12
    + earlyStageIndex * earlyStageIndex * 0.006
    + lateIndex * 0.08
    + lateIndex * lateIndex * 0.0032
    + pressureIndex * 0.08
    + pressureIndex * pressureIndex * 0.004
    + nightmareIndex * 0.16
    + nightmareIndex * nightmareIndex * 0.012
  ) * 1.2 * (1 + s * 0.006) * (1 + Math.max(0, s - 2) * 0.02);
  const hardHpMul = (
    1
    + lateIndex * 0.01
    + pressureIndex * 0.018
    + nightmareIndex * 0.045
    + nightmareIndex * nightmareIndex * 0.0015
    + overdriveIndex * 0.055
  );
  const hardcoreHpMul = (
    1
    + pressureIndex * 0.16
    + pressureIndex * pressureIndex * 0.009
    + brutalIndex * 0.16
  );
  const pressureWallHpMul = (
    1
    + pressureIndex * 0.18
    + pressureIndex * pressureIndex * 0.01
    + nightmareIndex * 0.24
    + brutalIndex * 0.34
    + overdriveIndex * 0.28
  );
  const stageBandMul = s <= 8
    ? 0.72
    : s <= 15
      ? 0.86
      : s <= 25
        ? 1
        : s <= 35
          ? 1.12
          : 1.26;
  const endgameHpRamp = (
    1
    + Math.max(0, s - 28) * 0.045
    + Math.max(0, s - 40) * Math.max(0, s - 40) * 0.012
  );
  const finalHpMul = stageHpMul * hardHpMul * hardcoreHpMul * pressureWallHpMul * stageBandMul * endgameHpRamp;
  const eliteHpMul = 1 + Math.max(0, s - 14) * 0.065 + brutalIndex * 0.1 + nightmareIndex * 0.04;
  const radiusMul = (
    1
    + stageIndex * 0.012
    + lateIndex * 0.004
    + nightmareIndex * 0.01
  );
  const threatBase = clamp(0.18 + s * 0.07 + nightmareIndex * 0.04, 0.2, 1.35);
  const typeThreat = {
    ghoul: 0.02,
    bat: 0.06,
    hopper: 0.2,
    brute: 0.12,
    elder: 0.18,
    raider: 0.26,
    crusher: 0.32,
    juggernaut: 0.4,
    bulwark: 0.44,
    behemoth: 0.5,
    lord: 0.34,
  };
  const defs = {
    ghoul: { hp: (70 + s * 14) * finalHpMul * 1.2, speed: (34 + s * 1.5) * stageSpeedMul, reward: 7, leak: 1, r: 10, color: '#c54f72' },
    bat: { hp: (42 + s * 9) * finalHpMul * 1.04, speed: (62 + s * 2.8) * stageSpeedMul, reward: 7, leak: 1, r: 8, color: '#d07ab4', fast: true },
    hopper: { hp: (30 + s * 6) * finalHpMul * 0.72, speed: (96 + s * 3.4) * stageSpeedMul, reward: 10, leak: 2, r: 8.5, color: '#9ae8ff', fast: true, jumper: true },
    brute: { hp: (190 + s * 38) * finalHpMul * 1.42 * eliteHpMul, speed: (27 + s * 1.2) * stageSpeedMul, reward: 14, leak: 2, r: 13, color: '#9e5a9c' },
    elder: { hp: (320 + s * 58) * finalHpMul * 1.56 * eliteHpMul, speed: (34 + s * 1.4) * stageSpeedMul, reward: 28, leak: 3, r: 15, color: '#b86ec8' },
    raider: {
      hp: (132 + s * 29) * finalHpMul * 1.16 * eliteHpMul,
      speed: (55 + s * 2.25) * stageSpeedMul,
      reward: 20,
      leak: 2,
      r: 12,
      color: '#ff9d7f',
      fast: true,
    },
    crusher: {
      hp: (280 + s * 52) * finalHpMul * 1.42 * eliteHpMul,
      speed: (40 + s * 1.7) * stageSpeedMul,
      reward: 34,
      leak: 3,
      r: 16,
      color: '#ffc17c',
      fast: true,
    },
    juggernaut: {
      hp: (760 + s * 160) * finalHpMul * 2.2 * eliteHpMul,
      speed: (18 + s * 0.45) * stageSpeedMul * 0.74,
      reward: 55,
      leak: 5,
      r: 19,
      color: '#6f7a86',
      towerBreaker: true,
      siege: true,
      attackMul: 8.8,
      damageTakenMul: 0.58,
      stunResist: 0.35,
    },
    bulwark: {
      hp: (1400 + s * 290) * finalHpMul * 2.85 * eliteHpMul * (1 + pressureIndex * 0.07),
      speed: (12 + s * 0.28) * stageSpeedMul * 0.44,
      reward: 85,
      leak: 6,
      r: 22,
      color: '#8f7c62',
      towerBreaker: true,
      siege: true,
      attackMul: 12.5,
      damageTakenMul: 0.36,
      stunResist: 0.55,
    },
    behemoth: {
      hp: (2200 + s * 420) * finalHpMul * 4.1 * eliteHpMul * (1 + pressureIndex * 0.09 + nightmareIndex * 0.04),
      speed: (10 + s * 0.2) * stageSpeedMul * 0.36,
      reward: 125,
      leak: 8,
      r: 24,
      color: '#70798a',
      towerBreaker: true,
      attackMul: 15.5,
      siege: true,
      damageTakenMul: 0.27,
      stunResist: 0.7,
    },
    lord: {
      hp: (190 + s * 45) * finalHpMul * (
        s >= 45 ? 1.8
          : s >= 35 ? 1.35
            : s >= 25 ? 1
              : s >= 15 ? 0.7
                : 0.4
      ),
      speed: (20 + s * 0.45) * stageSpeedMul * 0.8,
      reward: 72,
      leak: 6,
      r: 20,
      color: '#f26a84',
      boss: true,
      stunImmune: true,
      towerBreaker: true,
      siege: true,
      attackMul: 9.2,
      damageTakenMul: 0.46,
    },
  };
  const d = defs[type];
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const threat = clamp(threatBase + (typeThreat[type] || 0), 0.2, 1.25);
  const leakBonus = s >= 28 ? 7 : s >= 24 ? 6 : s >= 21 ? 5 : s >= 18 ? 4 : s >= 14 ? 3 : s >= 10 ? 2 : s >= 6 ? 1 : 0;
  const leak = d.leak + (d.boss ? leakBonus : Math.floor(leakBonus * 0.6));
  const radiusRaw = d.r * radiusMul * BALANCE_SCALE;
  const radiusCap = d.boss
    ? 20 * BALANCE_SCALE
    : d.fast
      ? 13.5 * BALANCE_SCALE
      : 17.5 * BALANCE_SCALE;
  const radiusFloor = d.fast ? 7 * BALANCE_SCALE : 8.4 * BALANCE_SCALE;
  const radius = clamp(radiusRaw, radiusFloor, radiusCap);
  const adaptiveBreakerChance = s >= 20
    ? clamp(0.05 + Math.max(0, s - 20) * 0.018 + nightmareIndex * 0.024, 0.05, 0.56)
    : 0;
  const canAdaptiveBreaker = !d.towerBreaker && ['raider', 'crusher', 'elder', 'brute'].includes(type);
  const adaptiveBreaker = canAdaptiveBreaker && Math.random() < adaptiveBreakerChance;
  const towerBreaker = Boolean(d.towerBreaker || adaptiveBreaker);
  const siege = Boolean(d.siege || (towerBreaker && !d.fast));
  const stunImmune = Boolean(d.stunImmune);
  const adaptiveHpMul = adaptiveBreaker ? (1.4 + pressureIndex * 0.05) : 1;
  const adaptiveSpeedMul = adaptiveBreaker ? 0.86 : 1;
  const stunResist = clamp(
    (d.stunResist || 0) + Math.max(0, s - 15) * 0.008 + nightmareIndex * 0.006,
    0,
    d.boss ? 1 : 0.9
  );
  const damageTakenMul = clamp(
    d.damageTakenMul || (towerBreaker ? 0.82 - pressureIndex * 0.009 : 1),
    0.25,
    1
  );
  const attackBase = (1 + s * 0.035 + Math.max(0, s - 18) * 0.02) * (d.boss ? 2.2 : d.fast ? 1.25 : 1);
  const breakerAttackMul = towerBreaker ? (1.35 + pressureIndex * 0.06 + nightmareIndex * 0.05 + brutalIndex * 0.07) : 1;
  const siegeAttackMul = siege ? 1.15 : 1;
  const hp = Math.max(1, Math.floor(d.hp * adaptiveHpMul));

  return {
    type,
    x: spawn.x,
    y: spawn.y,
    r: radius,
    hp,
    maxHp: hp,
    speed: d.speed * adaptiveSpeedMul * BALANCE_SCALE,
    reward: d.reward + Math.floor(s * 1.6 + nightmareIndex * 4.4 + pressureIndex * 1.2),
    leak,
    color: d.color,
    boss: Boolean(d.boss),
    targetC: SPAWN.c,
    targetR: SPAWN.r,
    targetX: spawn.x,
    targetY: spawn.y,
    repath: 0,
    vx: 0,
    vy: 0,
    threat,
    morph: rand(0, TAU),
    fast: Boolean(d.fast),
    jumper: Boolean(d.jumper),
    snareTimer: 0,
    snareSlowMul: 1,
    slowSource: '',
    slowHitFx: 0,
    weakenTimer: 0,
    weakenMul: 1,
    stunTimer: 0,
    stunFx: 0,
    turnSlowTimer: 0,
    lastDirX: 0,
    lastDirY: 0,
    poisonTimer: 0,
    poisonDps: 0,
    stunImmune,
    stunResist,
    towerBreaker,
    siege,
    damageTakenMul,
    attack: attackBase * (d.attackMul || 1) * breakerAttackMul * siegeAttackMul,
  };
}

function makeStageQueue(stage) {
  const queue = [];
  const earlyStage = Math.min(stage, 10);
  const lateIndex = Math.max(0, stage - 10);
  const hardIndex = Math.max(0, stage - 20);
  const brutalIndex = Math.max(0, stage - 30);
  const nightmareIndex = Math.max(0, stage - 40);
  const baseCount = (
    14
    + earlyStage * 5
    + Math.floor(Math.pow(earlyStage, 1.25) * 1.6)
    + lateIndex * 2.6
    + Math.floor(lateIndex * lateIndex * 0.33)
    + hardIndex * 4.4
    + Math.floor(hardIndex * hardIndex * 0.56)
    + brutalIndex * 8
    + Math.floor(brutalIndex * brutalIndex * 0.9)
    + nightmareIndex * 11
  );

  for (let i = 0; i < baseCount; i += 1) {
    const roll = Math.random();
    let type = 'ghoul';
    const batChance = stage >= 3
      ? clamp(0.18 + stage * 0.003 - hardIndex * 0.004, 0.08, 0.28)
      : 0;
    const bruteChance = stage >= 4
      ? clamp(0.13 + stage * 0.008 + hardIndex * 0.01, 0.13, 0.4)
      : 0;
    const elderChance = stage >= 7
      ? clamp(0.08 + (stage - 7) * 0.01 + hardIndex * 0.015, 0.08, 0.38)
      : 0;
    const raiderChance = stage >= 5
      ? clamp(0.12 + (stage - 5) * 0.01 + hardIndex * 0.015, 0.12, 0.42)
      : 0;
    const crusherChance = stage >= 9
      ? clamp(0.06 + (stage - 9) * 0.01 + hardIndex * 0.012 + brutalIndex * 0.008, 0.06, 0.42)
      : 0;
    const hopperChance = stage >= 12
      ? clamp(0.03 + (stage - 12) * 0.006 + hardIndex * 0.01, 0.03, 0.24)
      : 0;
    const juggernautChance = stage >= 15
      ? clamp(0.02 + (stage - 15) * 0.009 + hardIndex * 0.008 + brutalIndex * 0.012, 0.02, 0.36)
      : 0;
    const bulwarkChance = stage >= 22
      ? clamp(0.01 + (stage - 22) * 0.009 + brutalIndex * 0.014 + nightmareIndex * 0.012, 0.01, 0.32)
      : 0;
    const behemothChance = stage >= 30
      ? clamp(0.008 + (stage - 30) * 0.012 + nightmareIndex * 0.022, 0.008, 0.34)
      : 0;

    let threshold = behemothChance;
    if (roll < threshold) type = 'behemoth';
    else {
      threshold += bulwarkChance;
      if (roll < threshold) type = 'bulwark';
      else {
        threshold += juggernautChance;
        if (roll < threshold) type = 'juggernaut';
        else {
          threshold += crusherChance;
          if (roll < threshold) type = 'crusher';
          else {
            threshold += elderChance;
            if (roll < threshold) type = 'elder';
            else {
              threshold += raiderChance;
              if (roll < threshold) type = 'raider';
              else {
                threshold += bruteChance;
                if (roll < threshold) type = 'brute';
                else {
                  threshold += hopperChance;
                  if (roll < threshold) type = 'hopper';
                  else if (roll < threshold + batChance) type = 'bat';
                }
              }
            }
          }
        }
      }
    }
    queue.push(type);
  }

  const elderCount = 1 + Math.floor(stage * 0.45) + Math.floor(hardIndex * 0.7) + Math.floor(brutalIndex * 0.4);
  for (let i = 0; i < elderCount; i += 1) {
    const pos = Math.floor(queue.length * (0.25 + Math.random() * 0.55));
    queue.splice(pos, 0, 'elder');
  }

  const bruteCount = Math.max(0, stage - 5) + Math.floor(hardIndex * 0.9) + Math.floor(brutalIndex * 1.4);
  for (let i = 0; i < bruteCount; i += 1) {
    const pos = Math.floor(queue.length * (0.2 + Math.random() * 0.62));
    queue.splice(pos, 0, 'brute');
  }

  if (stage >= 10) {
    const surgePos = Math.floor(queue.length * 0.7);
    if (stage <= 16) {
      queue.splice(surgePos, 0, 'elder', 'elder', 'crusher', 'raider');
    } else {
      queue.splice(surgePos, 0, 'elder', 'brute', Math.random() < 0.65 ? 'crusher' : 'raider', stage >= 13 ? 'hopper' : 'bat', 'crusher');
    }
  }

  if (stage >= 22) {
    const siegeCount = 1 + Math.floor((stage - 22) * 0.55) + Math.floor(brutalIndex * 0.9) + Math.floor(nightmareIndex * 0.5);
    for (let i = 0; i < siegeCount; i += 1) {
      const pos = Math.floor(queue.length * (0.3 + Math.random() * 0.5));
      const roll = Math.random();
      const pick = roll < 0.2
        ? 'behemoth'
        : roll < 0.5
          ? 'bulwark'
          : 'juggernaut';
      queue.splice(pos, 0, pick);
    }
  }

  if (stage >= 30) {
    const surgePos = Math.floor(queue.length * 0.55);
    queue.splice(surgePos, 0, 'behemoth', 'bulwark', 'crusher', 'hopper', 'raider', 'elder', 'brute', 'hopper', 'crusher', 'raider', 'juggernaut', 'behemoth');
  }

  if (stage >= 8) {
    const rushCount = 1 + Math.floor(stage * 0.36) + Math.floor(hardIndex * 0.62) + Math.floor(brutalIndex * 1.35) + Math.floor(nightmareIndex * 0.9);
    const crusherPickChance = clamp(0.26 + lateIndex * 0.012 + hardIndex * 0.014, 0.26, 0.62);
    for (let i = 0; i < rushCount; i += 1) {
      const pos = Math.floor(queue.length * (0.25 + Math.random() * 0.54));
      const pick = stage >= 14 && Math.random() < 0.18
        ? 'hopper'
        : (stage >= 8 && Math.random() < crusherPickChance ? 'crusher' : 'raider');
      queue.splice(pos, 0, pick);
    }
  }

  if (stage >= 30) {
    const behemothCount = 1 + Math.floor((stage - 30) * 0.58) + Math.floor(nightmareIndex * 1.1);
    for (let i = 0; i < behemothCount; i += 1) {
      const pos = Math.floor(queue.length * (0.34 + Math.random() * 0.46));
      queue.splice(pos, 0, 'behemoth');
    }
    queue.push('juggernaut');
    queue.push('bulwark');
  }
  if (stage >= 24) queue.push('juggernaut');
  if (stage >= 32) queue.push('bulwark');
  if (stage >= 40) queue.push('behemoth');

  if (STUN_IMMUNE_BOSS_STAGES.includes(stage)) {
    // 지정 스테이지에만 스턴 면역 보스를 1마리만 추가.
    queue.push('lord');
  }
  return queue;
}

function startStage(stage) {
  state.stage = stage;
  state.stageTimer = Math.max(0.2, 1.2 - stage * 0.05 - Math.max(0, stage - 10) * 0.025);
  state.spawnQueue = makeStageQueue(stage);
  state.spawnTimer = 0.45;
  state.stageStartAt = performance.now();
  flashBanner(`STAGE ${stage}`, 1.4);
  bgmAudio?.fx('success');
}

function startRun() {
  state.mode = 'playing';
  state.stage = 1;
  state.baseHp = 20;
  state.gold = 160;
  state.kills = 0;
  state.score = 0;
  state.stageTimer = 0;
  state.stageStartAt = 0;
  state.spawnQueue = [];
  state.enemies = [];
  state.towers = [];
  invalidateMergeCache();
  state.nextTowerId = 1;
  state.spawnSerial = 0;
  state.bullets = [];
  state.particles = [];
  state.blocked.clear();
  state.simSpeed = 1;
  state.selectedTower = 'sunken';
  state.sunkenFootprint = 1;
  state.sellMode = false;
  state.mergeMode = false;
  state.mergePick = null;
  state.pauseUses = 0;
  state.cullUses = 0;
  state.towerHpBonus = 0;
  state.rushDamageBonus = 0;
  state.pendingStage = 0;
  state.pendingStageBonusGold = 0;
  state.rewardUiUnlockAt = 0;
  state.emperorShieldTimer = 0;
  state.emperorShieldFx = 0;
  state.emperorShieldHitCooldown = 0;
  state.emperorShieldUses = 0;
  state.onboarding = {
    firstBuild: false,
    firstUpgrade: false,
    firstClear: false,
  };
  document.body.classList.add('playing');
  setSelectedButton();
  setSellMode(false);
  refreshBuildHint();

  buildDistanceMap();
  startStage(1);

  overlayEl.classList.add('hidden');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('banner-passive');
  overlayEl.innerHTML = '';
  bgmAudio?.unlock();
  sfx(400, 0.09, 'triangle', 0.025);
  refreshHud();
}

function setDefeat() {
  submitSingleRank('defeat');
  state.mode = 'defeat';
  document.body.classList.remove('playing');
  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Defeat</h2>
      <p>Stage ${state.stage} · Kills ${state.kills} · Gold ${state.gold}</p>
      <div class="actions">
        <button type="button" data-action="restart">Retry</button>
      </div>
    </div>
  `;
  bgmAudio?.fx('fail');
  sfx(170, 0.2, 'sawtooth', 0.05);
}

function setVictory() {
  submitSingleRank('victory');
  state.mode = 'victory';
  document.body.classList.remove('playing');
  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Victory</h2>
      <p>Stage ${state.maxStage} · Kills ${state.kills} · Base HP ${state.baseHp}</p>
      <div class="actions">
        <button type="button" data-action="restart">New Run</button>
      </div>
    </div>
  `;
  bgmAudio?.fx('win');
  sfx(520, 0.16, 'triangle', 0.04);
}

function showStageReward() {
  const nightmareIndex = Math.max(0, state.stage - 20);
  let clearGold = 70 + state.stage * 14 + nightmareIndex * 28 + Math.floor(nightmareIndex * nightmareIndex * 3);
  let bonusTag = '';
  if (state.stage === 1 && !state.onboarding.firstClear) {
    state.onboarding.firstClear = true;
    const bonus = 120;
    clearGold += bonus;
    bonusTag = ` · First Clear +${bonus}`;
  }
  const autoRushBonus = 0.25;
  state.pendingStage = state.stage + 1;
  state.pendingStageBonusGold = clearGold;
  state.gold += clearGold;
  state.rushDamageBonus += autoRushBonus;
  state.mode = 'reward';
  state.rewardUiUnlockAt = performance.now() + 220;

  const stageTimeSec = Math.max(1, Math.floor((performance.now() - (state.stageStartAt || performance.now())) / 1000));
  const towerCount = state.towers.length;
  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.add('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal reward-modal">
      <h2>Mission Success</h2>
      <p>Stage ${state.stage} · Time ${formatTime(stageTimeSec)} · Kills ${state.kills}</p>
      <p>Towers ${towerCount} · +${clearGold} Gold${bonusTag}</p>
      <div class="actions">
        <button type="button" data-action="reward:next" disabled>Next Stage</button>
      </div>
    </div>
  `;
  const unlockAt = state.rewardUiUnlockAt;
  window.setTimeout(() => {
    if (state.mode !== 'reward' || state.rewardUiUnlockAt !== unlockAt) return;
    for (const btn of overlayEl.querySelectorAll('[data-action=\"reward:next\"][disabled]')) {
      btn.disabled = false;
    }
  }, 230);
}

function applyStageReward(kind) {
  if (state.mode !== 'reward') return;
  if (performance.now() < state.rewardUiUnlockAt) return;
  if (kind !== 'next') return;
  flashBanner(`Rush total +${Math.round(state.rushDamageBonus * 100)}%`, 0.9);
  sfx(620, 0.07, 'triangle', 0.028);

  state.mode = 'playing';
  overlayEl.classList.add('hidden');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('banner-passive');
  overlayEl.innerHTML = '';
  state.rewardUiUnlockAt = 0;

  const nextStage = state.pendingStage || state.stage + 1;
  state.pendingStage = 0;
  state.pendingStageBonusGold = 0;
  startStage(nextStage);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function formatCompactNumber(value, digits = 1) {
  const n = Math.max(0, Number(value) || 0);
  if (n < 1000) return String(Math.floor(n));
  const units = ['K', 'M', 'B', 'T'];
  let unitIndex = -1;
  let compact = n;
  while (compact >= 1000 && unitIndex < units.length - 1) {
    compact /= 1000;
    unitIndex += 1;
  }
  const precision = compact >= 100 ? 0 : digits;
  const shown = Number(compact.toFixed(precision)).toString();
  return `${shown}${units[unitIndex]}`;
}

function formatHudNumber(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return isMobileView ? formatCompactNumber(n, 1) : String(n);
}

function refreshHud() {
  stageTextEl.textContent = String(state.stage);
  baseTextEl.textContent = `${formatHudNumber(Math.max(0, state.baseHp))}/20`;
  goldTextEl.textContent = formatHudNumber(state.gold);
  aliveTextEl.textContent = formatHudNumber(state.enemies.length);
  queueTextEl.textContent = formatHudNumber(state.spawnQueue.length);
  killsTextEl.textContent = formatHudNumber(state.kills);
  if (timeTextEl) timeTextEl.textContent = formatTime(state.runTime);
  if (speedTextEl) speedTextEl.textContent = `${state.simSpeed.toFixed(2)}x`;
  if (btnSunken) {
    const sunkenCostEl = btnSunken.querySelector('.cost');
    const spec = getPlacementSpec('sunken');
    if (sunkenCostEl && spec) sunkenCostEl.textContent = `${spec.cost}`;
  }
  if (btnCull) {
    const nameEl = btnCull.querySelector('.name');
    const costEl = btnCull.querySelector('.cost');
    if (nameEl && isMobileView) nameEl.textContent = '-50% ENEMY HP';
    if (costEl) costEl.textContent = isMobileView
      ? `${formatCompactNumber(CULL_COST)} (${state.cullUses}/${CULL_MAX_USES})`
      : `${CULL_COST} Gold (${state.cullUses}/${CULL_MAX_USES})`;
  }
  if (btnChoLotto) {
    const nameEl = btnChoLotto.querySelector('.name');
    const costEl = btnChoLotto.querySelector('.cost');
    if (nameEl && isMobileView) nameEl.textContent = 'Lotto';
    if (costEl) costEl.textContent = isMobileView
      ? formatCompactNumber(CHO_LOTTO_COST)
      : `${CHO_LOTTO_COST} Gold`;
  }
  refreshMergeButton();
  refreshEmperorShieldButton();
}

function setSelectedButton() {
  for (const btn of document.querySelectorAll('.build-btn[data-kind]')) {
    btn.classList.toggle('active', btn.dataset.kind === state.selectedTower);
  }
}

function setSellMode(enabled) {
  state.sellMode = Boolean(enabled);
  if (!btnSellMode) return;
  btnSellMode.classList.toggle('active', state.sellMode);
  const nameEl = btnSellMode.querySelector('.name');
  if (nameEl) nameEl.textContent = state.sellMode ? 'SELL ON' : 'SELL OFF';
  const costEl = btnSellMode.querySelector('.cost');
  if (costEl && isMobileView) costEl.textContent = 'Sell';
}

function setPaused(enabled) {
  const next = Boolean(enabled);
  if (next && !state.paused) {
    if (state.pauseUses >= 5) {
      flashBanner('Pause limit reached', 0.7, true);
      return;
    }
    state.pauseUses += 1;
  }
  state.paused = next;
  if (!btnPause) return;
  btnPause.classList.toggle('active', state.paused);
  const nameEl = btnPause.querySelector('.name');
  if (nameEl) nameEl.textContent = state.paused ? 'PAUSED' : 'PAUSE';
  const costEl = btnPause.querySelector('.cost');
  if (costEl) costEl.textContent = state.paused ? `On (${state.pauseUses}/5)` : `Use (${state.pauseUses}/5)`;
}

function getFusionTowerCount() {
  let count = 0;
  for (const tower of state.towers) {
    if (tower.kind === 'fusion') count += 1;
  }
  return count;
}

function invalidateMergeCache() {
  state.mergeCheckVersion += 1;
}

function getTowerKindsForMerge(tower) {
  if (Array.isArray(tower?.fusedKinds) && tower.fusedKinds.length) return tower.fusedKinds;
  return [tower?.kind].filter(Boolean);
}

function hasBlockedMergeKind(kinds) {
  return kinds.includes('sunkenStun')
    || kinds.includes('lottoSunken')
    || kinds.includes('tankerSunken');
}

function isTowerKindMergeable(kind) {
  if (!kind) return false;
  return !hasBlockedMergeKind([kind]);
}

function refreshMergeableTowerBadge() {
  for (const btn of document.querySelectorAll('.build-btn[data-kind]')) {
    const kind = btn.dataset.kind || '';
    const mergeable = isTowerKindMergeable(kind);
    btn.classList.toggle('mergeable', mergeable);
  }
}

function projectedFusionCountAfterMerge(baseTower, targetTower, currentFusionCount = null) {
  const current = currentFusionCount == null ? getFusionTowerCount() : currentFusionCount;
  let next = current;
  if (baseTower.kind !== 'fusion') next += 1;
  if (targetTower.kind === 'fusion') next -= 1;
  return next;
}

function canMergePair(baseTower, targetTower, currentFusionCount = null) {
  if (!baseTower || !targetTower || baseTower === targetTower) return false;
  if ((baseTower.footprint || 1) > 1 || (targetTower.footprint || 1) > 1) return false;

  const baseKinds = getTowerKindsForMerge(baseTower);
  const targetKinds = getTowerKindsForMerge(targetTower);
  if (!baseKinds.length || !targetKinds.length) return false;
  if (hasBlockedMergeKind(baseKinds) || hasBlockedMergeKind(targetKinds)) return false;
  if (targetKinds.some((kind) => baseKinds.includes(kind))) return false;
  if (baseKinds.length + targetKinds.length > 5) return false;

  const projectedCount = projectedFusionCountAfterMerge(baseTower, targetTower, currentFusionCount);
  return projectedCount <= MERGE_FUSION_MAX;
}

function hasAnyValidMergePair() {
  if (state.mergeCheckSnapshotVersion === state.mergeCheckVersion) {
    return state.mergeCheckResult;
  }

  const fusionCount = getFusionTowerCount();
  const towers = state.towers;
  let canMerge = false;
  for (let i = 0; i < towers.length && !canMerge; i += 1) {
    const baseTower = towers[i];
    for (let j = 0; j < towers.length; j += 1) {
      if (i === j) continue;
      if (canMergePair(baseTower, towers[j], fusionCount)) {
        canMerge = true;
        break;
      }
    }
  }

  state.mergeCheckSnapshotVersion = state.mergeCheckVersion;
  state.mergeCheckResult = canMerge;
  return canMerge;
}

function isFusionTowerSaturated(tower) {
  if (!tower || tower.kind !== 'fusion') return false;
  const kinds = getTowerKindsForMerge(tower);
  if (!kinds.length) return true;
  if (hasBlockedMergeKind(kinds)) return true;
  return kinds.length >= 5;
}

// Merge 잠금은 "fusion 5개가 모두 포화"일 때만 걸린다.
function isMergeSystemSaturated() {
  const fusionTowers = state.towers.filter((tower) => (
    tower.kind === 'fusion' && (tower.footprint || 1) === 1
  ));
  if (fusionTowers.length < MERGE_FUSION_MAX) return false;
  return fusionTowers.every((tower) => isFusionTowerSaturated(tower));
}

function refreshMergeButton(selectionCount = null) {
  if (!btnMerge) return;
  const merged = getFusionTowerCount();
  const selected = selectionCount == null ? (state.mergePick ? 1 : 0) : selectionCount;
  const lockedByCap = merged >= MERGE_FUSION_MAX && isMergeSystemSaturated();

  btnMerge.classList.toggle('active', state.mergeMode);
  btnMerge.classList.toggle('locked', lockedByCap && !state.mergeMode);

  const nameEl = btnMerge.querySelector('.name');
  if (nameEl) nameEl.textContent = state.mergeMode ? 'Merging' : 'Merge';

  const costEl = btnMerge.querySelector('.cost');
  if (!costEl) return;
  if (state.mergeMode) {
    costEl.textContent = isMobileView
      ? `${selected}/2 · ${merged}/${MERGE_FUSION_MAX}`
      : `Pick ${selected}/2 · Merge ${merged}/${MERGE_FUSION_MAX}`;
  } else {
    costEl.textContent = isMobileView
      ? `${merged}/${MERGE_FUSION_MAX}`
      : `Merge ${merged}/${MERGE_FUSION_MAX}`;
  }
}

function setMergeMode(enabled) {
  const next = Boolean(enabled);
  if (next && getFusionTowerCount() >= MERGE_FUSION_MAX && isMergeSystemSaturated()) {
    flashBanner(`Merge cap ${MERGE_FUSION_MAX}/${MERGE_FUSION_MAX}`, 0.75, true);
    state.mergeMode = false;
    state.mergePick = null;
    refreshMergeButton(0);
    return;
  }
  state.mergeMode = next;
  if (!state.mergeMode) state.mergePick = null;
  refreshMergeButton(0);
}

function setSimSpeed(nextSpeed) {
  state.simSpeed = clamp(Math.round(nextSpeed * 100) / 100, 1, 3);
  refreshBuildHint();
  refreshHud();
}

function changeSimSpeed(delta) {
  const before = state.simSpeed;
  setSimSpeed(state.simSpeed + delta);
  if (Math.abs(state.simSpeed - before) > 0.001) {
    flashBanner(`Speed ${state.simSpeed.toFixed(2)}x`, 0.55);
    sfx(430 + state.simSpeed * 40, 0.05, 'triangle', 0.013);
  }
}

function refreshEmperorShieldButton() {
  if (!btnEmperorShield) return;
  const nameEl = btnEmperorShield.querySelector('.name');
  const costEl = btnEmperorShield.querySelector('.cost');
  const usesLeft = Math.max(0, EMPEROR_SHIELD_MAX_USES - state.emperorShieldUses);
  const active = state.emperorShieldTimer > 0.001;
  if (active) {
    btnEmperorShield.classList.add('active');
    btnEmperorShield.classList.remove('locked');
    if (nameEl) nameEl.textContent = 'SHIELD ON';
    if (costEl) costEl.textContent = isMobileView
      ? `${state.emperorShieldTimer.toFixed(1)}s · ${usesLeft}/${EMPEROR_SHIELD_MAX_USES}`
      : `${state.emperorShieldTimer.toFixed(1)}s · Left ${usesLeft}/${EMPEROR_SHIELD_MAX_USES}`;
    return;
  }
  btnEmperorShield.classList.remove('active');
  if (usesLeft <= 0) {
    btnEmperorShield.classList.add('locked');
    if (nameEl) nameEl.textContent = 'SHIELD END';
    if (costEl) costEl.textContent = isMobileView
      ? `${EMPEROR_SHIELD_MAX_USES}/${EMPEROR_SHIELD_MAX_USES}`
      : `Used (${EMPEROR_SHIELD_MAX_USES}/${EMPEROR_SHIELD_MAX_USES})`;
    return;
  }
  const notEnoughGold = state.gold < EMPEROR_SHIELD_COST;
  btnEmperorShield.classList.toggle('locked', notEnoughGold);
  if (nameEl) nameEl.textContent = isMobileView ? 'SHIELD' : 'EMPEROR SHIELD';
  if (costEl) costEl.textContent = isMobileView
    ? `${formatCompactNumber(EMPEROR_SHIELD_COST)} /10s · ${usesLeft}/${EMPEROR_SHIELD_MAX_USES}`
    : `${EMPEROR_SHIELD_COST} Gold / 10s · Left ${usesLeft}/${EMPEROR_SHIELD_MAX_USES}`;
}

function castEmperorShield() {
  if (state.mode !== 'playing') return;
  if (state.emperorShieldUses >= EMPEROR_SHIELD_MAX_USES) {
    flashBanner(`Shield cap ${EMPEROR_SHIELD_MAX_USES}/${EMPEROR_SHIELD_MAX_USES}`, 0.75, true);
    sfx(160, 0.09, 'sawtooth', 0.022);
    return;
  }
  if (state.emperorShieldTimer > 0.001) {
    flashBanner('Shield active', 0.45);
    sfx(500, 0.04, 'triangle', 0.013);
    return;
  }
  if (state.gold < EMPEROR_SHIELD_COST) {
    flashBanner(`Need ${EMPEROR_SHIELD_COST} Gold`, 0.6, true);
    sfx(180, 0.08, 'sawtooth', 0.022);
    return;
  }

  state.gold -= EMPEROR_SHIELD_COST;
  state.emperorShieldUses += 1;
  state.emperorShieldTimer = EMPEROR_SHIELD_DURATION;
  state.emperorShieldFx = Math.max(state.emperorShieldFx, 0.8);
  state.emperorShieldHitCooldown = 0;
  flashBanner(`Shield ON 10s (${state.emperorShieldUses}/${EMPEROR_SHIELD_MAX_USES})`, 0.95);
  impactSfx.play('build', { volume: 0.42, minGap: 0.08, rateMin: 0.88, rateMax: 0.95 });
  sfx(860, 0.12, 'triangle', 0.03);
  refreshHud();
}

function castCull() {
  if (state.mode !== 'playing') return;
  if (state.cullUses >= CULL_MAX_USES) {
    flashBanner(`Cull used (${CULL_MAX_USES}/${CULL_MAX_USES})`, 0.7, true);
    sfx(160, 0.09, 'sawtooth', 0.022);
    return;
  }
  if (state.gold < CULL_COST) {
    flashBanner(`Need ${CULL_COST} Gold`, 0.6, true);
    sfx(180, 0.08, 'sawtooth', 0.022);
    return;
  }
  state.gold -= CULL_COST;
  state.cullUses += 1;
  for (const enemy of state.enemies) {
    enemy.hp = Math.max(1, Math.floor(enemy.hp * CULL_HP_MULT));
  }
  flashBanner(`Enemy HP -${(1 - CULL_HP_MULT) * 100 | 0}% (${state.cullUses}/${CULL_MAX_USES})`, 0.7);
  impactSfx.play('enemyHitHeavy', { volume: 0.32, minGap: 0.06, rateMin: 0.9, rateMax: 1.0 });
  sfx(520, 0.08, 'triangle', 0.02);
  refreshHud();
}

function refreshBuildHint() {
  if (buildHintEl) {
    buildHintEl.textContent = '';
  }
  refreshModeHelp();
  refreshTowerGuide();
}

function showChoLottoWin() {
  overlayEl.classList.remove('hidden');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('banner-passive');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Lotto Sunken!</h2>
      <div class="actions">
        <button type="button" data-action="cho-ack">Place</button>
      </div>
    </div>
  `;
}

function refreshModeHelp() {
  if (!modeHelpEl) return;
  modeHelpEl.textContent = '';
}

function buildTowerPerLevelChangeLine(kind) {
  const { rangeMul, damageMul, reloadMul } = getTowerUpgradeFactors(kind);
  const apsMul = 1 / reloadMul;

  const parts = [
    `Damage +${Math.round((damageMul - 1) * 100)}%`,
    `Rate +${Math.round((apsMul - 1) * 100)}%`,
    `Range +${Math.round((rangeMul - 1) * 100)}%`,
  ];

  if (kind === 'sunkenSplash') {
    parts.push('Splash +15%');
  } else if (kind === 'sunkenHammer') {
    parts.push('Splash +12%');
  } else if (kind === 'tankerSunken') {
    parts.push('Taunt +8%');
    parts.push('DR +3%');
  } else if (kind === 'lottoSunken') {
    parts.push('Poison Time +15%');
    parts.push('Poison DPS +12%');
  } else if (kind === 'sunkenStun') {
    parts.push('Stun Time +10%');
    parts.push('Stun Range +6%');
    parts.push('Stun Count +1 (Lv3/5/7)');
  }

  return parts.join(' · ');
}

function buildTowerUpgradeCostLine(baseCost) {
  const upgradeCosts = [];
  for (let lv = 1; lv < MAX_TOWER_LEVEL; lv += 1) {
    const cost = upgradeCost({ level: lv, baseCost });
    upgradeCosts.push(cost);
  }
  const parts = [`${baseCost}(Lv2)`];
  if (upgradeCosts.length <= 1) return parts.join(', ');

  let prev = upgradeCosts[0];
  for (let i = 1; i < upgradeCosts.length; i += 1) {
    const inc = upgradeCosts[i] - prev;
    const targetLv = i + 2;
    parts.push(`${inc}(Lv${targetLv})`);
    prev = upgradeCosts[i];
  }
  return parts.join(', ');
}

function refreshTowerGuide() {
  if (!towerGuideEl) return;

  const tower = TOWER_TYPES[state.selectedTower];
  const placement = getPlacementSpec(state.selectedTower);
  if (!tower || !placement) {
    towerGuideEl.textContent = '';
    return;
  }

  const attacksPerSec = placement.reload > 0 ? (1 / placement.reload) : 0;
  const damagePerSec = placement.reload > 0 ? placement.damage / placement.reload : placement.damage;
  const badges = [
    `Cost ${placement.cost}`,
    `Damage/Shot ${Math.round(placement.damage)}`,
    `Shots/s ${attacksPerSec.toFixed(2)}`,
    `Damage/s ${Math.round(damagePerSec)}`,
    `Range ${Math.round(placement.range / BALANCE_SCALE)}`,
    `Max Lv${MAX_TOWER_LEVEL}`,
  ];

  if (placement.pierce > 0) badges.push(`Pierce ${placement.pierce}`);
  if (placement.splashRadius > 0) badges.push(`Splash ${Math.round(placement.splashRadius / BALANCE_SCALE)}`);
  if (placement.tauntRadius > 0) badges.push(`Taunt ${Math.round(placement.tauntRadius / BALANCE_SCALE)}`);
  if (placement.damageMitigation > 0) badges.push(`DR ${Math.round(placement.damageMitigation * 100)}%`);
  if (tower.snareDuration && tower.snareSlow) badges.push(`Slow ${Math.round((1 - tower.snareSlow) * 100)}%`);
  if (tower.stunDuration && tower.stunChain) badges.push(`Stun ${tower.stunChain}`);

  const perLevelSummary = buildTowerPerLevelChangeLine(state.selectedTower);
  const upgradeCostSummary = buildTowerUpgradeCostLine(placement.cost);

  towerGuideEl.innerHTML = `
    <div class="line">
      <span class="name">${tower.name}</span>
      ${badges.map((label) => `<span class="badge">${label}</span>`).join('')}
    </div>
    <div class="growth">Per Lv +1: ${perLevelSummary}</div>
    <div class="growth">Upgrade Cost (+1): ${upgradeCostSummary}</div>
  `;
}

function nearestEnemy(x, y, range) {
  let found = null;
  let best = range * range;
  for (const enemy of state.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d = dx * dx + dy * dy;
    if (d <= best) {
      best = d;
      found = enemy;
    }
  }
  return found;
}

function fastestEnemyFiltered(x, y, range, predicate) {
  let found = null;
  let bestSpeed = -1;
  let bestDist = range * range;
  for (const enemy of state.enemies) {
    if (!predicate(enemy)) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d = dx * dx + dy * dy;
    if (d > bestDist) continue;
    if (enemy.speed > bestSpeed || (Math.abs(enemy.speed - bestSpeed) < 0.0001 && d < bestDist)) {
      bestSpeed = enemy.speed;
      bestDist = d;
      found = enemy;
    }
  }
  return found;
}

function pickTowerTarget(tower) {
  return nearestEnemy(tower.x, tower.y, tower.range);
}

function removeTower(tower) {
  const idx = state.towers.indexOf(tower);
  if (idx < 0) return false;
  state.towers.splice(idx, 1);
  invalidateMergeCache();
  const footprint = tower.footprint || 1;
  for (let ry = 0; ry < footprint; ry += 1) {
    for (let rx = 0; rx < footprint; rx += 1) {
      state.blocked.delete(keyOf(tower.c + rx, tower.r + ry));
    }
  }
  buildDistanceMap();
  for (const enemy of state.enemies) {
    enemy.repath = 0;
  }
  return true;
}

function emitNovaBurst(tower, colorOverride = null, kindOverride = null) {
  const burstCount = 8 + Math.floor((tower.level - 1) / 2) * 2;
  const spinOffset = performance.now() * 0.0018 + tower.id * 0.37;
  const perShotDamage = tower.damage * 0.55;
  const shotColor = colorOverride || tower.color;
  const shotKind = kindOverride || tower.kind;

  for (let i = 0; i < burstCount; i += 1) {
    const ang = spinOffset + (i / burstCount) * TAU;
    pushBullet({
      x: tower.x,
      y: tower.y,
      vx: Math.cos(ang) * tower.bulletSpeed,
      vy: Math.sin(ang) * tower.bulletSpeed,
      r: 4.9,
      damage: perShotDamage,
      life: 1.6,
      color: shotColor,
      pierce: 0,
      towerKind: shotKind,
      splashRadius: 0,
      splashFalloff: 0,
      snareDuration: 0,
      snareSlow: 1,
      weakenMul: 1,
    });
  }

  for (let i = 0; i < 10; i += 1) {
    const ang = rand(0, TAU);
    const speed = rand(90, 180);
    pushParticle({
      x: tower.x,
      y: tower.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: rand(0.1, 0.24),
      size: rand(1.8, 3.2),
      color: '#d8bcff',
    });
  }

  impactSfx.play('enemyHitHeavy', { volume: 0.3, minGap: 0.06, rateMin: 0.9, rateMax: 1.01 });
  if (Math.random() < 0.65) sfx(346 + rand(-24, 22), 0.045, 'square', 0.012);
}

function emitBulletForKind(tower, target, kind) {
  const baseColor = TOWER_TYPES[kind]?.color || tower.color;
  if (kind === 'sunkenNova') {
    emitNovaBurst(tower, baseColor, 'sunkenNova');
    return;
  }

  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const d = Math.hypot(dx, dy) || 1;

  const isSplash = kind === 'sunkenSplash' || kind === 'sunkenHammer' || kind === 'lottoSunken';
  const isNova = kind === 'sunkenNova';
  const isStun = kind === 'sunkenStun';
  const isHammer = kind === 'sunkenHammer';

  pushBullet({
    x: tower.x,
    y: tower.y,
    vx: (dx / d) * tower.bulletSpeed,
    vy: (dy / d) * tower.bulletSpeed,
    r: isSplash ? 5.6 : (isNova || isStun) ? 4.8 : 4,
    damage: tower.damage,
    life: 2,
    color: baseColor,
    pierce: (isNova || isStun) ? 0 : tower.pierce,
    towerKind: kind,
    splashRadius: isSplash ? tower.splashRadius : 0,
    splashFalloff: isSplash ? tower.splashFalloff : 0,
    snareDuration: tower.snareDuration,
    snareSlow: tower.snareSlow,
    weakenMul: tower.weakenMul,
    stunDuration: tower.stunDuration,
    stunChain: tower.stunChain,
    stunRadius: tower.stunRadius,
    poisonDuration: tower.poisonDuration,
    poisonDps: tower.poisonDps,
    lightning: isHammer,
  });

  for (let i = 0; i < 3; i += 1) {
    pushParticle({
      x: tower.x,
      y: tower.y,
      vx: rand(-80, 80),
      vy: rand(-80, 80),
      life: rand(0.08, 0.2),
      size: rand(1.8, 3.2),
      color: baseColor,
    });
  }

  if (kind === 'sunken') {
    if (Math.random() < 0.4) sfx(330 + rand(-24, 18), 0.03, 'triangle', 0.011);
  } else if (kind === 'sunkenSplash') {
    impactSfx.play('enemyHitHeavy', { volume: 0.26, minGap: 0.08, rateMin: 0.95, rateMax: 1.03 });
    if (Math.random() < 0.6) sfx(290 + rand(-18, 14), 0.04, 'square', 0.012);
  } else if (kind === 'sunkenNova') {
    impactSfx.play('enemyHit', { volume: 0.26, minGap: 0.05, rateMin: 1.0, rateMax: 1.11 });
    if (Math.random() < 0.52) sfx(352 + rand(-20, 20), 0.04, 'square', 0.012);
  } else if (kind === 'sunkenStun') {
    impactSfx.play('enemyHitHeavy', { volume: 0.28, minGap: 0.05, rateMin: 0.96, rateMax: 1.05 });
    if (Math.random() < 0.58) sfx(316 + rand(-20, 18), 0.04, 'square', 0.012);
  } else if (Math.random() < 0.35) {
    sfx(430 + rand(-26, 28), 0.03, 'square', 0.01);
  }
}

function emitBullet(tower, target) {
  if (tower.kind === 'fusion') {
    const kinds = tower.fusedKinds || [];
    for (const kind of kinds) {
      emitBulletForKind(tower, target, kind);
    }
    return;
  }

  emitBulletForKind(tower, target, tower.kind);
}

function hurtEnemy(enemy, damage, sourceKind = '', secondary = false) {
  const weakenDamage = enemy.weakenTimer > 0 ? enemy.weakenMul : 1;
  const rushDamage = enemy.fast ? 1 + state.rushDamageBonus : 1;
  const damageTakenMul = enemy.damageTakenMul || 1;
  enemy.hp -= damage * weakenDamage * rushDamage * damageTakenMul;
  enemy.vx += rand(-16, 16);
  enemy.vy += rand(-16, 16);

  for (let i = 0; i < 4; i += 1) {
    pushParticle({
      x: enemy.x,
      y: enemy.y,
      vx: rand(-100, 100),
      vy: rand(-100, 100),
      life: rand(0.1, 0.26),
      size: rand(1.8, 3.4),
      color: enemy.color,
    });
  }

  if (sourceKind === 'sunken') {
    impactSfx.play('enemyHit', {
      volume: 0.28,
      minGap: 0.04,
      rateMin: 0.95,
      rateMax: 1.06,
    });
    if (!secondary && Math.random() < 0.35) sfx(286 + rand(-22, 18), 0.04, 'triangle', 0.011);
  } else if (sourceKind === 'sunkenSplash') {
    impactSfx.play('enemyHit', {
      volume: 0.3,
      minGap: 0.05,
      rateMin: 0.93,
      rateMax: 1.02,
    });
    if (!secondary && Math.random() < 0.5) sfx(270 + rand(-16, 14), 0.04, 'square', 0.012);
  } else if (sourceKind === 'speedSunken') {
    impactSfx.play('enemyHit', {
      volume: 0.24,
      minGap: 0.03,
      rateMin: 1.02,
      rateMax: 1.16,
    });
    if (!secondary && Math.random() < 0.55) sfx(468 + rand(-34, 30), 0.03, 'triangle', 0.009);
  } else if (sourceKind === 'sunkenNova') {
    impactSfx.play('enemyHit', {
      volume: 0.25,
      minGap: 0.035,
      rateMin: 1.01,
      rateMax: 1.14,
    });
    if (!secondary && Math.random() < 0.36) sfx(356 + rand(-24, 20), 0.032, 'square', 0.01);
  } else if (sourceKind === 'sunkenStun') {
    impactSfx.play('enemyHit', {
      volume: 0.23,
      minGap: 0.04,
      rateMin: 0.98,
      rateMax: 1.08,
    });
    if (!secondary && Math.random() < 0.3) sfx(302 + rand(-20, 16), 0.03, 'triangle', 0.01);
  } else if (sourceKind) {
    impactSfx.play('enemyHit', { volume: 0.26, minGap: 0.045, rateMin: 0.95, rateMax: 1.04 });
  }

  if (enemy.hp <= 0) {
    state.gold += enemy.reward;
    state.kills += 1;
    state.score += enemy.reward * 10;
    const idx = state.enemies.indexOf(enemy);
    if (idx >= 0) state.enemies.splice(idx, 1);

    if (enemy.boss) {
      bgmAudio?.fx('win');
      impactSfx.play('enemyHitHeavy', { volume: 0.46, minGap: 0.12, rateMin: 0.88, rateMax: 0.95 });
      sfx(280, 0.2, 'sawtooth', 0.04);
      flashBanner('BOSS DOWN', 0.9);
    } else {
      if (Math.random() < 0.35) {
        sfx(560, 0.04, 'triangle', 0.013);
      }
    }
  }
}

function spawnTowerHitVfx(x, y, towerKind, isUlt = false, secondary = false) {
  const push = (p) => pushParticle(p);

  if (towerKind === 'sunken') {
    const burstCount = secondary ? 2 : (isUlt ? 7 : 5);
    for (let i = 0; i < burstCount; i += 1) {
      const ang = rand(0, TAU);
      const speed = rand(60, isUlt ? 220 : 170);
      push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: rand(0.12, 0.26),
        size: rand(1.8, 3.8),
        color: isUlt ? '#ffe7a8' : '#9fe9ff',
      });
    }
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.14 : (isUlt ? 0.3 : 0.22),
      size: isUlt ? 8 : 6,
      expand: isUlt ? 26 : 18,
      lineWidth: isUlt ? 2.5 : 1.8,
      color: isUlt ? '#ffd681' : '#90e9ff',
      render: 'ring',
    });
    return;
  }

  if (towerKind === 'sunkenHammer') {
    const burstCount = secondary ? 3 : 6;
    for (let i = 0; i < burstCount; i += 1) {
      const ang = rand(0, TAU);
      const speed = rand(70, 190);
      push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: rand(0.12, 0.26),
        size: rand(2.2, 4.2),
        color: '#ffb36b',
      });
    }
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.16 : 0.26,
      size: 8,
      expand: 22,
      lineWidth: 2.2,
      color: '#ff6b6b',
      render: 'ring',
    });
    return;
  }

  if (towerKind === 'sunkenNova') {
    const rayCount = secondary ? 4 : 7;
    for (let i = 0; i < rayCount; i += 1) {
      const ang = rand(0, TAU);
      const speed = rand(90, 210);
      push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: rand(0.1, 0.22),
        size: rand(1.9, 3.2),
        color: '#d6b7ff',
      });
    }
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.11 : 0.2,
      size: secondary ? 5.2 : 7.2,
      expand: secondary ? 9 : 15,
      lineWidth: 1.9,
      color: '#b88bff',
      render: 'ring',
    });
    return;
  }

  if (towerKind === 'sunkenStun') {
    const sparkCount = secondary ? 3 : 6;
    for (let i = 0; i < sparkCount; i += 1) {
      const ang = rand(0, TAU);
      const speed = rand(110, 240);
      push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: rand(0.08, 0.18),
        size: rand(1.8, 2.9),
        color: '#ffe38a',
      });
    }
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.1 : 0.18,
      size: secondary ? 4.8 : 6.6,
      expand: secondary ? 8 : 13,
      lineWidth: 1.9,
      color: '#ffd14f',
      render: 'ring',
    });
    return;
  }

  if (towerKind === 'speedSunken') {
    const shardCount = secondary ? 3 : 8;
    for (let i = 0; i < shardCount; i += 1) {
      const ang = rand(0, TAU);
      const speed = rand(180, 330);
      push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: rand(0.08, 0.18),
        size: rand(2.1, 3.4),
        length: rand(8, 14),
        lineWidth: rand(1.2, 2),
        color: '#c9ffd2',
        render: 'shard',
      });
    }
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.1 : 0.15,
      size: secondary ? 4 : 6,
      expand: secondary ? 8 : 12,
      lineWidth: 1.4,
      color: '#b7ffcb',
      render: 'ring',
    });
    return;
  }

  if (towerKind === 'obelisk') {
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.12 : 0.22,
      size: secondary ? 5.5 : 8,
      expand: secondary ? 10 : 18,
      lineWidth: 2.1,
      color: '#e9c4ff',
      render: 'ring',
    });

    const rayCount = secondary ? 3 : 5;
    for (let i = 0; i < rayCount; i += 1) {
      push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: rand(0.12, 0.24),
        length: rand(11, 18),
        lineWidth: rand(1.4, 2.3),
        rot: (i / rayCount) * TAU + rand(-0.2, 0.2),
        rotSpeed: rand(-5.5, 5.5),
        color: '#dcb0ff',
        render: 'ray',
      });
    }
    return;
  }

  if (towerKind === 'sunkenSplash') {
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.12 : 0.2,
      size: secondary ? 5 : 7.5,
      expand: secondary ? 9 : 16,
      lineWidth: 1.8,
      color: '#ffc48d',
      render: 'ring',
    });
    return;
  }

}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.guardHitFx = Math.max(0, (tower.guardHitFx || 0) - dt * 2.9);
    tower.guardHitPulse = Math.max(0, (tower.guardHitPulse || 0) - dt * 4.6);
    tower.guardHitCooldown = Math.max(0, (tower.guardHitCooldown || 0) - dt);

    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const target = pickTowerTarget(tower);
    if (!target) continue;

    emitBullet(tower, target);
    tower.cooldown = tower.reload;
  }
}

function applyStunChain(primaryEnemy, bullet) {
  if (primaryEnemy.stunImmune) return;
  const stunDuration = bullet.stunDuration || 0.85;
  const stunRadius = bullet.stunRadius || (72 * BALANCE_SCALE);
  const stunRadiusSq = stunRadius * stunRadius;
  const stunMax = Math.max(1, Math.floor(bullet.stunChain || 3));

  const nearby = state.enemies
    .filter((enemy) => enemy !== primaryEnemy && enemy.hp > 0)
    .map((enemy) => {
      const dx = enemy.x - primaryEnemy.x;
      const dy = enemy.y - primaryEnemy.y;
      return { enemy, d2: dx * dx + dy * dy };
    })
    .filter((item) => item.d2 <= stunRadiusSq)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, Math.max(0, stunMax - 1))
    .map((item) => item.enemy);

  const victims = [primaryEnemy, ...nearby];
  for (let i = 0; i < victims.length; i += 1) {
    const victim = victims[i];
    if (victim.stunImmune) continue;
    const resist = clamp(victim.stunResist || 0, 0, 0.95);
    const appliedDuration = Math.max(0.12, stunDuration * (1 - resist));
    victim.stunTimer = Math.max(victim.stunTimer || 0, appliedDuration);
    victim.stunFx = Math.max(victim.stunFx || 0, 0.45);
    spawnTowerHitVfx(victim.x, victim.y, 'sunkenStun', false, i > 0);
  }
}

function updateBullets(dt) {
  const buckets = buildEnemyBuckets();
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
      state.bullets.splice(i, 1);
      continue;
    }

    let removed = false;
    const bulletCell = worldToCell(b.x, b.y);
    const candidates = collectNearbyEnemies(buckets, bulletCell.c, bulletCell.r, 1);
    for (const enemy of candidates) {
      const dx = enemy.x - b.x;
      const dy = enemy.y - b.y;
      const rr = enemy.r + b.r;
      if (dx * dx + dy * dy > rr * rr) continue;

      if (b.poisonDuration) {
        enemy.poisonTimer = Math.max(enemy.poisonTimer || 0, b.poisonDuration);
        enemy.poisonDps = Math.max(enemy.poisonDps || 0, b.poisonDps || 0);
      }

      if (b.towerKind === 'sunkenStun') {
        if (!enemy.stunImmune) {
          applyStunChain(enemy, b);
          if (Math.random() < 0.08) flashBanner('Stun chain', 0.42);
        }
        hurtEnemy(enemy, b.damage, b.towerKind, false);
        state.bullets.splice(i, 1);
        removed = true;
      } else if (b.towerKind === 'snare') {
        const snareDuration = b.snareDuration || 2;
        const snareSlow = b.snareSlow || 0.55;
        enemy.snareTimer = Math.max(enemy.snareTimer, snareDuration);
        enemy.snareSlowMul = Math.min(enemy.snareSlowMul, snareSlow);
        enemy.slowSource = b.towerKind;
        enemy.weakenTimer = Math.max(enemy.weakenTimer, snareDuration + 0.6);
        enemy.weakenMul = Math.max(enemy.weakenMul, b.weakenMul || 1.25);
        spawnTowerHitVfx(enemy.x, enemy.y, b.towerKind, false, false);
        const damage = b.damage * 0.55;
        hurtEnemy(enemy, damage, b.towerKind, false);
        if (Math.random() < 0.28) flashBanner('Snare: slow/weaken', 0.45);
        state.bullets.splice(i, 1);
        removed = true;
      } else {
        spawnTowerHitVfx(enemy.x, enemy.y, b.towerKind, false, false);
        if (b.towerKind === 'sunken') {
          for (let p = 0; p < 4; p += 1) {
            const ang = rand(0, TAU);
            const dist = rand(2, 8);
            pushParticle({
              x: enemy.x + Math.cos(ang) * dist,
              y: enemy.y + Math.sin(ang) * dist,
              vx: Math.cos(ang) * rand(60, 140),
              vy: Math.sin(ang) * rand(60, 140),
              life: rand(0.08, 0.16),
              size: rand(1.4, 2.6),
              color: '#bfe9ff',
            });
          }
        }
        hurtEnemy(enemy, b.damage, b.towerKind, false);

        if (b.splashRadius > 0) {
          const splashRadius = b.splashRadius;
          const splashSq = splashRadius * splashRadius;
          const splashCell = worldToCell(enemy.x, enemy.y);
          const radiusCells = Math.ceil((splashRadius + GRID.cell) / GRID.cell);
          const splashCandidates = collectNearbyEnemies(buckets, splashCell.c, splashCell.r, radiusCells);
          for (const other of splashCandidates) {
            if (other === enemy) continue;
            const sdx = other.x - enemy.x;
            const sdy = other.y - enemy.y;
            const sDistSq = sdx * sdx + sdy * sdy;
            if (sDistSq > splashSq) continue;

            const sDist = Math.sqrt(sDistSq);
            const rawRate = 1 - (sDist / Math.max(1, splashRadius));
            const rate = clamp(rawRate, b.splashFalloff || 0.35, 1);
            const splashDamage = b.damage * rate * 0.72;
            spawnTowerHitVfx(other.x, other.y, b.towerKind, false, true);
            if (b.poisonDuration) {
              other.poisonTimer = Math.max(other.poisonTimer || 0, b.poisonDuration);
              other.poisonDps = Math.max(other.poisonDps || 0, b.poisonDps || 0);
            }
            hurtEnemy(other, splashDamage, b.towerKind, true);
          }

          for (let p = 0; p < 8; p += 1) {
            const ang = rand(0, TAU);
            const dist = rand(4, splashRadius * 0.45);
            pushParticle({
              x: enemy.x + Math.cos(ang) * dist,
              y: enemy.y + Math.sin(ang) * dist,
              vx: Math.cos(ang) * rand(40, 140),
              vy: Math.sin(ang) * rand(40, 140),
              life: rand(0.12, 0.24),
              size: rand(2.2, 4.1),
              color: '#ffc48d',
            });
          }
        }

        if (b.pierce > 0) {
          b.pierce -= 1;
          b.damage *= 0.78;
        } else {
          state.bullets.splice(i, 1);
          removed = true;
        }
      }
      break;
    }

    if (removed) continue;
  }
}

function stageMoveSpeedMultiplier(stage = state.stage) {
  const s = Math.max(1, Math.floor(stage || 1));
  const stageIndex = s - 1;
  const midIndex = Math.max(0, s - 15);
  const hardIndex = Math.max(0, s - 30);
  const extremeIndex = Math.max(0, s - 40);
  return (
    1
    + Math.min(stageIndex, 10) * 0.003
    + midIndex * 0.008
    + hardIndex * 0.018
    + extremeIndex * 0.032
  );
}

function updateEnemy(enemy, dt) {
  enemy.repath -= dt;
  enemy.snareTimer = Math.max(0, enemy.snareTimer - dt);
  enemy.turnSlowTimer = Math.max(0, (enemy.turnSlowTimer || 0) - dt);
  enemy.slowHitFx = Math.max(0, (enemy.slowHitFx || 0) - dt);
  enemy.weakenTimer = Math.max(0, enemy.weakenTimer - dt);
  enemy.stunTimer = Math.max(0, (enemy.stunTimer || 0) - dt);
  enemy.stunFx = Math.max(0, (enemy.stunFx || 0) - dt);
  enemy.poisonTimer = Math.max(0, (enemy.poisonTimer || 0) - dt);
  if (enemy.poisonTimer > 0 && enemy.poisonDps > 0) {
    enemy.hp -= enemy.poisonDps * dt;
  }
  if (enemy.snareTimer <= 0) {
    enemy.snareSlowMul = 1;
    enemy.slowSource = '';
  }
  if (enemy.weakenTimer <= 0) enemy.weakenMul = 1;

  if (enemy.stunTimer > 0) {
    enemy.vx *= 0.2;
    enemy.vy *= 0.2;
    return;
  }

  const dynamicTurnSlowMul = clamp(
    0.68
    + state.stage * 0.005
    + Math.max(0, state.stage - 25) * 0.005,
    0.7,
    0.95
  );
  const turnSlowMul = enemy.turnSlowTimer > 0 ? dynamicTurnSlowMul : 1;
  const speed = enemy.speed * stageMoveSpeedMultiplier(state.stage) * (enemy.snareTimer > 0 ? enemy.snareSlowMul : 1) * turnSlowMul;

  function keepEnemyInPassableCell(prevX, prevY) {
    const nowCell = worldToCell(enemy.x, enemy.y);
    if (passableForEnemy(enemy, nowCell.c, nowCell.r)) return;

    const prevCell = worldToCell(prevX, prevY);
    if (passableForEnemy(enemy, prevCell.c, prevCell.r)) {
      enemy.x = prevX;
      enemy.y = prevY;
    } else {
      const clampedC = clamp(prevCell.c, 0, GRID.cols - 1);
      const clampedR = clamp(prevCell.r, 0, GRID.rows - 1);
      const center = cellCenter(clampedC, clampedR);
      enemy.x = center.x;
      enemy.y = center.y;
    }
    enemy.vx *= 0.22;
    enemy.vy *= 0.22;
    enemy.repath = 0;
  }

  if (enemy.repath <= 0 || Math.hypot(enemy.targetX - enemy.x, enemy.targetY - enemy.y) <= GRID.cell * 0.12) {
    const cell = worldToCell(enemy.x, enemy.y);
    enemy.targetC = clamp(cell.c, 0, GRID.cols - 1);
    enemy.targetR = clamp(cell.r, 0, GRID.rows - 1);

    const step = neighborStep(enemy.targetC, enemy.targetR, enemy);
    if (step.valid) {
      enemy.targetC = step.c;
      enemy.targetR = step.r;
    }

    const center = cellCenter(enemy.targetC, enemy.targetR);
    enemy.targetX = center.x;
    enemy.targetY = center.y;
    enemy.repath = enemy.fast ? 0.08 : enemy.boss ? 0.12 : 0.16;
  }

  const dx = enemy.targetX - enemy.x;
  const dy = enemy.targetY - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const prevX = enemy.x;
  const prevY = enemy.y;
  const nx = dx / d;
  const ny = dy / d;
  if (enemy.lastDirX !== 0 || enemy.lastDirY !== 0) {
    const dot = nx * enemy.lastDirX + ny * enemy.lastDirY;
    if (dot < 0.1 && enemy.turnSlowTimer <= 0) {
      enemy.turnSlowTimer = TURN_SLOW_DURATION;
    }
  }
  const travel = speed * dt;

  if (travel >= d) {
    enemy.x = enemy.targetX;
    enemy.y = enemy.targetY;
    enemy.vx = nx * speed;
    enemy.vy = ny * speed;
    enemy.repath = 0;
  } else {
    enemy.x += nx * travel;
    enemy.y += ny * travel;
    enemy.vx = nx * speed;
    enemy.vy = ny * speed;
  }
  enemy.lastDirX = nx;
  enemy.lastDirY = ny;
  keepEnemyInPassableCell(prevX, prevY);

  if (currentTowerBuckets) {
    const cell = worldToCell(enemy.x, enemy.y);
    const towers = collectNearbyTowers(currentTowerBuckets, cell.c, cell.r, 1);
    let targetTower = null;
    let targetDistSq = Infinity;
    let targetPriority = -1;

    for (const tower of towers) {
      const dxT = tower.x - enemy.x;
      const dyT = tower.y - enemy.y;
      const d2 = dxT * dxT + dyT * dyT;
      const isTanker = tower.kind === 'tankerSunken';
      const tauntBonus = isTanker ? (tower.tauntRadius || 0) : 0;
      const rr = enemy.r + GRID.cell * (enemy.towerBreaker ? 0.9 : 0.45) + tauntBonus;
      if (d2 > rr * rr) continue;

      const priority = isTanker ? 2 : 1;
      if (
        priority > targetPriority
        || (priority === targetPriority && d2 < targetDistSq)
      ) {
        targetTower = tower;
        targetDistSq = d2;
        targetPriority = priority;
      }
    }

    if (targetTower) {
      const towerBreakMul = enemy.towerBreaker
        ? (2.2 + Math.max(0, state.stage - 20) * 0.14 + Math.max(0, state.stage - 35) * 0.2)
        : enemy.siege
          ? 1.7
          : 1;
      const mitigation = clamp(targetTower.damageMitigation || 0, 0, 0.8);
      targetTower.hp -= enemy.attack * towerBreakMul * (1 - mitigation) * dt;
      if (targetTower.kind === 'tankerSunken' && targetTower.guardHitCooldown <= 0) {
        targetTower.guardHitFx = 1;
        targetTower.guardHitPulse = Math.max(targetTower.guardHitPulse || 0, 1);
        targetTower.guardHitCooldown = 0.11;
      }
      if (targetTower.hp <= 0) {
        removeTower(targetTower);
        flashBanner('TOWER DESTROYED', 0.6, true);
        impactSfx.play('enemyHitHeavy', { volume: 0.32, minGap: 0.05, rateMin: 0.9, rateMax: 1.02 });
        sfx(220, 0.06, 'sawtooth', 0.02);
        for (const e of state.enemies) e.repath = 0;
      }
    }
  }

  const goalCenter = cellCenter(GOAL.c, GOAL.r);
  if (Math.hypot(enemy.x - goalCenter.x, enemy.y - goalCenter.y) < GRID.cell * 0.38) {
    const idx = state.enemies.indexOf(enemy);
    if (idx >= 0) state.enemies.splice(idx, 1);
    if (state.emperorShieldTimer > 0.001) {
      state.emperorShieldFx = Math.max(state.emperorShieldFx, 0.62);
      if (state.emperorShieldHitCooldown <= 0) {
        flashBanner('Shield blocked hit', 0.45);
        impactSfx.play('towerHit', { volume: 0.35, minGap: 0.05, rateMin: 1.02, rateMax: 1.12 });
        sfx(760, 0.05, 'triangle', 0.02);
        state.emperorShieldHitCooldown = 0.12;
      }
    } else {
      state.baseHp -= enemy.leak;
      flashBanner(`BASE -${enemy.leak}`, 0.6, true);
      impactSfx.play('baseHit', { volume: 0.4, minGap: 0.06, rateMin: 0.9, rateMax: 1.01 });
      sfx(180, 0.09, 'sawtooth', 0.03);
      if (state.baseHp <= 0) {
        state.baseHp = 0;
        setDefeat();
      }
    }
  }
}

let currentTowerBuckets = null;

function updateEnemies(dt) {
  for (const enemy of [...state.enemies]) {
    updateEnemy(enemy, dt);
    if (state.mode !== 'playing') return;
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag || 0.9;
    p.vy *= p.drag || 0.9;
    if (p.rotSpeed) p.rot = (p.rot || 0) + p.rotSpeed * dt;
  }
}

function spawnOne() {
  if (state.enemies.length >= MAX_ENEMIES) return;
  const type = state.spawnQueue.shift();
  if (!type) return;
  const enemy = makeEnemy(type);
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const aroundSpawn = state.enemies.filter((e) => (
    Math.abs(e.x - spawn.x) < GRID.cell * 4.6
    && Math.abs(e.y - spawn.y) < GRID.cell * 2.7
  )).length;
  const lane = state.spawnSerial % 5;
  const yBands = [0, -0.75, 0.75, -1.55, 1.55];
  const spacing = enemy.r * 3.2 + 12 * BALANCE_SCALE;
  enemy.x = spawn.x - aroundSpawn * spacing - lane * (enemy.r * 0.42);
  enemy.y = clamp(
    spawn.y + yBands[lane] * (enemy.r * 0.95 + 3 * BALANCE_SCALE),
    GRID.cell * 0.5,
    H - GRID.cell * 0.5
  );
  state.spawnSerial += 1;
  state.enemies.push(enemy);
  if (enemy.boss) {
    flashBanner(`STAGE ${state.stage} BOSS`, 1.2, true);
    bgmAudio?.fx('fail');
  }
}

function updateSpawning(dt) {
  if (state.stageTimer > 0) {
    state.stageTimer -= dt;
    return;
  }

  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    const earlyStage = Math.min(state.stage, 10);
    const lateIndex = Math.max(0, state.stage - 10);
    const nightmareIndex = Math.max(0, state.stage - 20);
    const spawnDelay = Math.max(0.052, 0.43 - earlyStage * 0.018 - lateIndex * 0.009 - nightmareIndex * 0.004);
    while (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
      spawnOne();
      state.spawnTimer += spawnDelay;
    }
  }

  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    if (state.stage >= state.maxStage) {
      setVictory();
      return;
    }

    showStageReward();
  }
}

function getBattlefieldBackdrop() {
  if (battlefieldBackdrop) return battlefieldBackdrop;

  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const bx = layer.getContext('2d');

  const baseGrad = bx.createLinearGradient(0, 0, 0, H);
  baseGrad.addColorStop(0, '#4a503f');
  baseGrad.addColorStop(0.45, '#3e4536');
  baseGrad.addColorStop(1, '#2c3128');
  bx.fillStyle = baseGrad;
  bx.fillRect(0, 0, W, H);

  // Central battle lane (mud road + tank tracks) to reinforce a battlefield feel.
  const battleLineY = cellCenter(Math.floor(GRID.cols / 2), SPAWN.r).y;
  const roadGrad = bx.createLinearGradient(0, battleLineY - GRID.cell * 1.1, 0, battleLineY + GRID.cell * 1.1);
  roadGrad.addColorStop(0, 'rgba(44, 40, 30, 0.78)');
  roadGrad.addColorStop(0.5, 'rgba(72, 62, 43, 0.86)');
  roadGrad.addColorStop(1, 'rgba(45, 40, 31, 0.78)');
  bx.fillStyle = roadGrad;
  bx.fillRect(0, battleLineY - GRID.cell * 1.2, W, GRID.cell * 2.4);

  bx.strokeStyle = 'rgba(96, 86, 61, 0.54)';
  bx.lineWidth = 2.4;
  for (let lane = -1; lane <= 1; lane += 1) {
    const y = battleLineY + lane * (GRID.cell * 0.45);
    bx.beginPath();
    bx.moveTo(0, y);
    bx.lineTo(W, y);
    bx.stroke();
  }

  // Dirt and debris texture
  for (let i = 0; i < 220; i += 1) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 4 + Math.random() * 16;
    bx.fillStyle = Math.random() < 0.5
      ? `rgba(66, 71, 56, ${0.08 + Math.random() * 0.1})`
      : `rgba(22, 24, 19, ${0.05 + Math.random() * 0.1})`;
    bx.beginPath();
    bx.arc(x, y, r, 0, TAU);
    bx.fill();
  }

  // Crater marks
  const craterCount = Math.max(18, Math.floor((W * H) / 32000));
  for (let i = 0; i < craterCount; i += 1) {
    const x = rand(36, W - 36);
    const y = rand(34, H - 34);
    const r = rand(14, 34);
    bx.fillStyle = 'rgba(29, 26, 22, 0.6)';
    bx.beginPath();
    bx.ellipse(x, y, r * 1.1, r * 0.82, rand(0, TAU), 0, TAU);
    bx.fill();

    bx.strokeStyle = 'rgba(107, 96, 72, 0.45)';
    bx.lineWidth = 1.4;
    bx.beginPath();
    bx.arc(x, y, r * 0.86, 0, TAU);
    bx.stroke();

    bx.strokeStyle = 'rgba(18, 16, 14, 0.34)';
    bx.lineWidth = 2;
    bx.beginPath();
    bx.arc(x + 1.3, y + 1.1, r * 0.62, 0, TAU);
    bx.stroke();
  }

  // Trench lines
  const trenchLines = Math.max(3, Math.floor(H / 220));
  for (let i = 0; i < trenchLines; i += 1) {
    const y = ((i + 1) / (trenchLines + 1)) * H + rand(-22, 22);
    bx.strokeStyle = 'rgba(31, 35, 27, 0.68)';
    bx.lineWidth = 10 + Math.random() * 6;
    bx.beginPath();
    bx.moveTo(-20, y + rand(-8, 8));
    bx.bezierCurveTo(W * 0.22, y + rand(-30, 30), W * 0.58, y + rand(-26, 26), W + 20, y + rand(-10, 10));
    bx.stroke();

    bx.strokeStyle = 'rgba(88, 80, 58, 0.45)';
    bx.lineWidth = 2.2;
    bx.beginPath();
    bx.moveTo(-20, y - 4 + rand(-6, 6));
    bx.bezierCurveTo(W * 0.28, y + rand(-20, 20), W * 0.64, y + rand(-18, 18), W + 20, y + rand(-8, 8));
    bx.stroke();
  }

  // Top/bottom barbed-wire style lines
  for (const yy of [18, H - 18]) {
    bx.strokeStyle = 'rgba(78, 84, 71, 0.56)';
    bx.lineWidth = 1.3;
    bx.beginPath();
    bx.moveTo(0, yy);
    bx.lineTo(W, yy);
    bx.stroke();
    for (let x = 10; x < W; x += 36) {
      bx.beginPath();
      bx.moveTo(x, yy - 5);
      bx.lineTo(x + 6, yy + 5);
      bx.moveTo(x + 10, yy - 5);
      bx.lineTo(x + 16, yy + 5);
      bx.stroke();
    }
  }

  battlefieldBackdrop = layer;
  return battlefieldBackdrop;
}

function drawBackground() {
  const backdrop = getBattlefieldBackdrop();
  ctx.drawImage(backdrop, 0, 0);

  // Real-time smoke/fog layer
  const t = performance.now() * 0.001;
  const plumes = [
    { x: W * 0.14, y: H * 0.18, r: 70 },
    { x: W * 0.84, y: H * 0.22, r: 86 },
    { x: W * 0.27, y: H * 0.78, r: 74 },
    { x: W * 0.73, y: H * 0.72, r: 92 },
  ];
  for (let i = 0; i < plumes.length; i += 1) {
    const puff = plumes[i];
    const px = puff.x + Math.sin(t * (0.52 + i * 0.08) + i * 1.4) * 12;
    const py = puff.y + Math.cos(t * (0.42 + i * 0.06) + i * 0.9) * 9;
    const radius = puff.r + Math.sin(t * 0.9 + i * 2.2) * 8;
    const smoke = ctx.createRadialGradient(px, py, radius * 0.08, px, py, radius);
    smoke.addColorStop(0, 'rgba(128, 122, 106, 0.16)');
    smoke.addColorStop(0.55, 'rgba(76, 74, 67, 0.12)');
    smoke.addColorStop(1, 'rgba(20, 21, 19, 0)');
    ctx.fillStyle = smoke;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, TAU);
    ctx.fill();
  }
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(126, 143, 109, 0.2)';
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

function drawSelectedCell() {
  if (!state.selectedCell) return;
  const { c, r, at } = state.selectedCell;
  if (!inBounds(c, r)) return;
  const x = c * GRID.cell;
  const y = r * GRID.cell;
  const pulse = 0.5 + 0.5 * Math.sin((performance.now() - at) * 0.012);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 214, 117, ${0.45 + pulse * 0.35})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, GRID.cell - 2, GRID.cell - 2);
  ctx.fillStyle = `rgba(255, 214, 117, ${0.08 + pulse * 0.06})`;
  ctx.fillRect(x + 2, y + 2, GRID.cell - 4, GRID.cell - 4);
  ctx.restore();
}

function drawPathPreview() {
  let c = SPAWN.c;
  let r = SPAWN.r;

  ctx.strokeStyle = 'rgba(117, 224, 175, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const start = cellCenter(c, r);
  ctx.moveTo(start.x, start.y);

  for (let i = 0; i < 140; i += 1) {
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

function drawSpawnBeacon(x, y, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
  const haloR = 14 + pulse * 3.5;

  ctx.save();
  const halo = ctx.createRadialGradient(x, y, 2, x, y, haloR + 6);
  halo.addColorStop(0, 'rgba(184, 255, 219, 0.68)');
  halo.addColorStop(0.55, 'rgba(112, 232, 179, 0.3)');
  halo.addColorStop(1, 'rgba(79, 190, 140, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, haloR + 6, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#89f2be';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = `rgba(201, 255, 224, ${0.48 + pulse * 0.35})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, haloR, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = '#d9ffe7';
  ctx.beginPath();
  ctx.moveTo(x - 3.8, y - 5.2);
  ctx.lineTo(x + 5.6, y);
  ctx.lineTo(x - 3.8, y + 5.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEmperorFortress(x, y, now) {
  const hpRatio = clamp(state.baseHp / 20, 0, 1);
  const lowHp = hpRatio < 0.45;
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
  const warnPulse = 0.5 + 0.5 * Math.sin(now * 0.018);

  ctx.save();
  ctx.translate(x, y);

  // Shadow/base
  ctx.fillStyle = 'rgba(8, 12, 20, 0.52)';
  ctx.beginPath();
  ctx.ellipse(0, 11.5, 20, 6.5, 0, 0, TAU);
  ctx.fill();

  const baseGlow = ctx.createRadialGradient(0, 1, 2, 0, 1, 28);
  baseGlow.addColorStop(0, 'rgba(255, 226, 174, 0.36)');
  baseGlow.addColorStop(0.6, 'rgba(184, 109, 130, 0.2)');
  baseGlow.addColorStop(1, 'rgba(55, 28, 40, 0)');
  ctx.fillStyle = baseGlow;
  ctx.beginPath();
  ctx.arc(0, 1, 28, 0, TAU);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = `rgba(255, 204, 148, ${0.52 + pulse * 0.3})`;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.arc(0, 1, 15.5 + pulse * 0.8, 0, TAU);
  ctx.stroke();

  // Fortress body
  const bodyGrad = ctx.createLinearGradient(0, -12, 0, 12);
  bodyGrad.addColorStop(0, '#f6d89a');
  bodyGrad.addColorStop(0.55, '#bc8e58');
  bodyGrad.addColorStop(1, '#6f4c32');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-9.5, 8.8);
  ctx.lineTo(-11.2, -3);
  ctx.lineTo(-5.2, -9.4);
  ctx.lineTo(5.2, -9.4);
  ctx.lineTo(11.2, -3);
  ctx.lineTo(9.5, 8.8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3c2619';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Side towers
  ctx.fillStyle = '#9f6c46';
  ctx.fillRect(-13.8, -5.5, 3.6, 9.8);
  ctx.fillRect(10.2, -5.5, 3.6, 9.8);
  ctx.fillStyle = '#d7aa73';
  ctx.fillRect(-14.6, -7.2, 5.2, 2.5);
  ctx.fillRect(9.4, -7.2, 5.2, 2.5);

  // Core
  const coreGrad = ctx.createRadialGradient(0, -0.6, 1, 0, -0.6, 6.3);
  coreGrad.addColorStop(0, hpRatio > 0.45 ? '#fff8d6' : '#ffe0b6');
  coreGrad.addColorStop(0.5, hpRatio > 0.45 ? '#ffcf79' : '#ff9d87');
  coreGrad.addColorStop(1, hpRatio > 0.45 ? '#cc7c2b' : '#9f3f46');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, -0.6, 5.7, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 243, 212, 0.76)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -0.6, 3.1 + pulse * 0.6, 0, TAU);
  ctx.stroke();

  // Crown decoration
  ctx.fillStyle = '#ffdd91';
  ctx.beginPath();
  ctx.moveTo(-6.8, -10.1);
  ctx.lineTo(-4.3, -15.2);
  ctx.lineTo(-1.2, -11.1);
  ctx.lineTo(0, -16.2);
  ctx.lineTo(1.2, -11.1);
  ctx.lineTo(4.3, -15.2);
  ctx.lineTo(6.8, -10.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6b4727';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Durability indicator (5 slots instead of text)
  const pipCount = 5;
  const alivePips = Math.round(hpRatio * pipCount);
  for (let i = 0; i < pipCount; i += 1) {
    const px = -10 + i * 5;
    ctx.fillStyle = i < alivePips ? '#ffd68f' : 'rgba(98, 68, 53, 0.88)';
    ctx.fillRect(px, 11.8, 3.4, 1.8);
  }

  if (lowHp) {
    ctx.strokeStyle = `rgba(255, 105, 123, ${0.42 + warnPulse * 0.44})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 1, 19 + warnPulse * 1.8, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEndpoints() {
  const sp = cellCenter(SPAWN.c, SPAWN.r);
  const gp = cellCenter(GOAL.c, GOAL.r);
  const now = performance.now();

  drawSpawnBeacon(sp.x, sp.y, now);
  drawEmperorFortress(gp.x, gp.y, now);

  if (state.emperorShieldTimer > 0.001) {
    const remainRatio = clamp(state.emperorShieldTimer / EMPEROR_SHIELD_DURATION, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
    const shieldR = 17 + pulse * 3 + (1 - remainRatio) * 3;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const shell = ctx.createRadialGradient(gp.x, gp.y, 3, gp.x, gp.y, shieldR + 10);
    shell.addColorStop(0, 'rgba(255, 247, 184, 0.62)');
    shell.addColorStop(0.5, 'rgba(132, 220, 255, 0.26)');
    shell.addColorStop(1, 'rgba(72, 146, 255, 0)');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, shieldR + 10, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = `rgba(157, 225, 255, ${0.58 + pulse * 0.25})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, shieldR, 0, TAU);
    ctx.stroke();

    const fxBoost = clamp(state.emperorShieldFx / 0.9, 0, 1);
    if (fxBoost > 0.001) {
      ctx.strokeStyle = `rgba(255, 238, 170, ${0.25 + fxBoost * 0.65})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, shieldR + 6 + fxBoost * 4, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
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

function drawTowerSpine(tower, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 5 + tower.c * 0.27);
  const coreR = 5.8 + tower.level * 0.9;
  const spikes = 4 + tower.level * 2;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#152632';
  ctx.beginPath();
  ctx.arc(0, 0, coreR + 3.1, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#a6eac3';
  for (let i = 0; i < spikes; i += 1) {
    const a = (i / spikes) * TAU + now * 0.2;
    const inner = coreR - 1.2;
    const outer = coreR + 8 + tower.level * 1.2 + pulse * 1.5;
    const spread = 0.12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - spread) * inner, Math.sin(a - spread) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a + spread) * inner, Math.sin(a + spread) * inner);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#6fbe8b';
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, TAU);
  ctx.fill();

  if (tower.level >= 3) {
    ctx.strokeStyle = 'rgba(198, 255, 221, 0.88)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i += 1) {
      const a = now * 0.9 + i * (TAU / 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 2.5, Math.sin(a) * 2.5);
      ctx.lineTo(Math.cos(a) * (coreR + 7), Math.sin(a) * (coreR + 7));
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawTowerObelisk(tower, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 3.2 + tower.r * 0.29);
  const bodyH = 8.5 + tower.level * 1.8;
  const bodyW = 5.2 + tower.level * 0.9;
  const ringR = 9 + tower.level * 1.1;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#1e1a32';
  ctx.fillRect(-7, 5, 14, 6);

  ctx.fillStyle = '#d9b5ff';
  ctx.beginPath();
  ctx.moveTo(0, -bodyH - 2.4);
  ctx.lineTo(bodyW, -2);
  ctx.lineTo(0, bodyH * 0.38);
  ctx.lineTo(-bodyW, -2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(241, 216, 255, ${0.5 + pulse * 0.34})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -bodyH - 1.6);
  ctx.lineTo(bodyW - 0.8, -2);
  ctx.lineTo(0, bodyH * 0.32);
  ctx.lineTo(-bodyW + 0.8, -2);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(206, 164, 255, 0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -1, ringR + pulse * 1.3, 0, TAU);
  ctx.stroke();

  if (tower.level >= 2) {
    const angA = now * 0.85;
    const angB = angA + Math.PI;
    ctx.fillStyle = 'rgba(224, 190, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(Math.cos(angA) * ringR, -1 + Math.sin(angA) * ringR, 2.3, 0, TAU);
    ctx.arc(Math.cos(angB) * ringR, -1 + Math.sin(angB) * ringR, 2.3, 0, TAU);
    ctx.fill();
  }

  if (tower.level >= 3) {
    ctx.strokeStyle = `rgba(236, 208, 255, ${0.6 + pulse * 0.34})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -bodyH - 8);
    ctx.lineTo(0, -bodyH - 22 - pulse * 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTowerSnare(tower, now) {
  const scale = 1 + ((tower.footprint || 1) - 1) * 0.86;
  const pulse = 0.5 + 0.5 * Math.sin(now * 6.2 + tower.c * 0.21);
  const ringR = (8 + tower.level * 1.1) * scale;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#132538';
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 2.2, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = `rgba(154, 232, 255, ${0.46 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ringR + pulse * 1.8, 0, TAU);
  ctx.stroke();

  const bands = 4 + tower.level;
  ctx.strokeStyle = 'rgba(176, 242, 255, 0.8)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < bands; i += 1) {
    const a = (i / bands) * TAU + now * 0.45;
    const inner = ringR * 0.28;
    const outer = ringR + 4.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a + 0.34) * outer, Math.sin(a + 0.34) * outer);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTowers() {
  const now = performance.now() * 0.001;

  for (const tower of state.towers) {
    const footprint = tower.footprint || 1;
    const x = tower.c * GRID.cell + 2;
    const y = tower.r * GRID.cell + 2;
    const w = GRID.cell * footprint - 4;
    const h = GRID.cell * footprint - 4;

    ctx.fillStyle = '#0f1727';
    ctx.fillRect(x, y, w, h);

    const border = tower.kind === 'sunken'
      ? 'rgba(77, 163, 255, 0.9)'
      : tower.kind === 'tankerSunken'
        ? 'rgba(127, 224, 167, 0.95)'
      : tower.kind === 'sunkenNova'
        ? 'rgba(198, 155, 255, 0.9)'
      : tower.kind === 'sunkenStun'
        ? 'rgba(124, 255, 141, 0.9)'
      : tower.kind === 'sunkenSplash'
        ? 'rgba(30, 30, 30, 0.95)'
      : tower.kind === 'sunkenHammer'
        ? 'rgba(255, 77, 77, 0.95)'
      : tower.kind === 'fusion'
        ? 'rgba(174, 240, 255, 0.95)'
        : tower.kind === 'speedSunken'
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(154, 232, 255, 0.88)';
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    if (
      tower.kind === 'sunken'
      || tower.kind === 'sunkenSplash'
      || tower.kind === 'sunkenNova'
      || tower.kind === 'sunkenHammer'
      || tower.kind === 'sunkenStun'
      || tower.kind === 'tankerSunken'
      || tower.kind === 'fusion'
    ) {
      drawTowerSunken(tower, now);
    } else if (tower.kind === 'speedSunken') {
      drawTowerSpine(tower, now);
    } else if (tower.kind === 'obelisk') {
      drawTowerObelisk(tower, now);
    } else {
      drawTowerSnare(tower, now);
    }

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

      // 밝은 이펙트 위에서도 읽히도록 중앙 배지 + 외곽선 텍스트를 고정으로 사용.
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

function drawTowerPreviewIcon(towerKind, x, y, size, now) {
  const placement = getPlacementSpec(towerKind);
  if (!placement) return;

  const tower = makeTower(towerKind, 0, 0, placement);
  tower.c = 0;
  tower.r = 0;
  tower.x = x;
  tower.y = y;
  tower.level = Math.min(3, MAX_TOWER_LEVEL);
  tower.cooldown = 0;

  const boxX = x - size * 0.5 + 2;
  const boxY = y - size * 0.5 + 2;
  const boxW = size - 4;
  const boxH = size - 4;

  ctx.fillStyle = '#0f1727';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = borderColorForTowerKind(towerKind);
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);

  if (
    tower.kind === 'sunken'
    || tower.kind === 'sunkenSplash'
    || tower.kind === 'sunkenNova'
    || tower.kind === 'sunkenHammer'
    || tower.kind === 'sunkenStun'
    || tower.kind === 'tankerSunken'
    || tower.kind === 'fusion'
  ) {
    drawTowerSunken(tower, now);
  } else if (tower.kind === 'speedSunken') {
    drawTowerSpine(tower, now);
  } else if (tower.kind === 'obelisk') {
    drawTowerObelisk(tower, now);
  } else {
    drawTowerSnare(tower, now);
  }
}

function setBuildButtonIcon(kind, dataUrl) {
  const btn = document.querySelector(`.build-btn[data-kind="${kind}"]`);
  if (!btn) return;
  const iconEl = btn.querySelector('.icon');
  if (!iconEl) return;
  iconEl.textContent = '';
  iconEl.style.backgroundImage = `url("${dataUrl}")`;
}

function setDetailIcon(kind, dataUrl) {
  const iconEl = document.querySelector(`.detail-icon[data-kind="${kind}"]`);
  if (!iconEl) return;
  iconEl.style.backgroundImage = `url("${dataUrl}")`;
}

function renderBuildButtonIcons() {
  const towerButtons = [...document.querySelectorAll('.build-btn[data-kind]')];
  if (!towerButtons.length) return;

  const iconSize = 58;
  const gap = 12;
  const startX = 10;
  const startY = 10;
  const neededW = startX * 2 + towerButtons.length * iconSize + (towerButtons.length - 1) * gap;
  const neededH = startY * 2 + iconSize;
  if (neededW > W || neededH > H) return;

  const snap = document.createElement('canvas');
  snap.width = iconSize;
  snap.height = iconSize;
  const snapCtx = snap.getContext('2d');
  if (!snapCtx) return;

  const prevNextTowerId = state.nextTowerId;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const now = performance.now() * 0.001;
  for (let i = 0; i < towerButtons.length; i += 1) {
    const kind = towerButtons[i].dataset.kind;
    if (!kind || !TOWER_TYPES[kind]) continue;

    const left = startX + i * (iconSize + gap);
    const top = startY;
    const centerX = left + iconSize * 0.5;
    const centerY = top + iconSize * 0.5;
    drawTowerPreviewIcon(kind, centerX, centerY, iconSize, now + i * 0.13);

    snapCtx.clearRect(0, 0, iconSize, iconSize);
    snapCtx.drawImage(canvas, left, top, iconSize, iconSize, 0, 0, iconSize, iconSize);
    const iconUrl = snap.toDataURL('image/png');
    setBuildButtonIcon(kind, iconUrl);
    setDetailIcon(kind, iconUrl);
  }

  ctx.clearRect(0, 0, W, H);
  ctx.restore();
  state.nextTowerId = prevNextTowerId;
}

function loadEnemySprites() {
  for (const [type, src] of Object.entries(ENEMY_TANK_SOURCES)) {
    const img = new Image();
    img.src = src;
    ENEMY_TANK_IMAGES[type] = img;
  }
}

function drawEnemyTankSprite(enemy) {
  const img = ENEMY_TANK_IMAGES[enemy.type];
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
  let sizeCap = 34 * BALANCE_SCALE;
  if (enemy.fast) sizeMul = 2.05;
  if (enemy.type === 'juggernaut') sizeMul = 2.35;
  if (enemy.type === 'bulwark') {
    sizeMul = 2.6;
    sizeCap = 45 * BALANCE_SCALE;
  }
  if (enemy.type === 'behemoth') {
    sizeMul = 2.75;
    sizeCap = 48 * BALANCE_SCALE;
  }
  if (enemy.boss) {
    sizeMul = 2.4;
    sizeCap = 44 * BALANCE_SCALE;
  }
  const size = clamp(enemy.r * sizeMul, 18 * BALANCE_SCALE, sizeCap);

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

function drawEnemies() {
  const now = performance.now() * 0.001;
  for (const enemy of state.enemies) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 5 + enemy.morph);
    const auraRadius = enemy.r + 4 + enemy.threat * 6 + pulse * 2.6;
    const spikeCount = 6 + Math.floor(enemy.threat * 8);

    if (enemy.threat >= 0.35) {
      ctx.strokeStyle = enemy.boss
        ? `rgba(255, 154, 178, ${0.25 + pulse * 0.2})`
        : `rgba(195, 140, 255, ${0.2 + pulse * 0.16})`;
      ctx.lineWidth = 2 + enemy.threat;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, auraRadius, 0, TAU);
      ctx.stroke();
    }

    if (enemy.threat >= 0.55) {
      ctx.strokeStyle = enemy.boss ? 'rgba(255, 193, 143, 0.38)' : 'rgba(197, 150, 255, 0.32)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < spikeCount; i += 1) {
        const ang = (i / spikeCount) * TAU + now * (enemy.boss ? 0.8 : 1.3);
        const sx = enemy.x + Math.cos(ang) * (enemy.r + 1);
        const sy = enemy.y + Math.sin(ang) * (enemy.r + 1);
        const ex = enemy.x + Math.cos(ang) * (enemy.r + 4 + enemy.threat * 4);
        const ey = enemy.y + Math.sin(ang) * (enemy.r + 4 + enemy.threat * 4);
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

    if (enemy.fast) {
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

    if (enemy.jumper) {
      const jumpPulse = 0.45 + 0.55 * Math.sin(now * 9 + enemy.morph * 1.6);
      ctx.strokeStyle = `rgba(148, 246, 255, ${0.58 + jumpPulse * 0.35})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - enemy.r * 0.45, enemy.r * 0.75 + jumpPulse * 1.8, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }

    if ((enemy.stunTimer || 0) > 0) {
      const stunRatio = clamp((enemy.stunTimer || 0) / 1.2, 0, 1);
      const pulse = 0.4 + 0.6 * Math.sin(now * 11 + enemy.morph * 1.9);
      ctx.strokeStyle = `rgba(255, 220, 120, ${0.58 + stunRatio * 0.24})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 7 + pulse * 1.6, 0, TAU);
      ctx.stroke();

      const sparkCount = 3;
      ctx.fillStyle = `rgba(255, 233, 168, ${0.7 + pulse * 0.22})`;
      for (let i = 0; i < sparkCount; i += 1) {
        const a = now * 4.4 + i * (TAU / sparkCount);
        const sx = enemy.x + Math.cos(a) * (enemy.r + 11);
        const sy = enemy.y + Math.sin(a) * (enemy.r + 7);
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8 + pulse * 0.8, 0, TAU);
        ctx.fill();
      }

      if ((enemy.stunFx || 0) > 0.001) {
        const hitRatio = clamp((enemy.stunFx || 0) / 0.45, 0, 1);
        ctx.strokeStyle = `rgba(255, 239, 186, ${0.3 + hitRatio * 0.55})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 10 + (1 - hitRatio) * 6, 0, TAU);
        ctx.stroke();
      }
    }

    if (enemy.snareTimer > 0) {
      const slowIntensity = clamp(1 - enemy.snareSlowMul, 0, 0.8);
      ctx.strokeStyle = 'rgba(155, 241, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 6, 0, TAU);
      ctx.stroke();

      if (enemy.slowHitFx > 0.001) {
        const hitRatio = clamp(enemy.slowHitFx / 0.45, 0, 1);
        ctx.strokeStyle = `rgba(201, 255, 236, ${0.24 + hitRatio * 0.5})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 10 + (1 - hitRatio) * 6, 0, TAU);
        ctx.stroke();
      }
    }

    if (enemy.poisonTimer > 0.001) {
      ctx.fillStyle = 'rgba(120, 255, 170, 0.9)';
      ctx.font = '10px sans-serif';
      ctx.fillText('☠', enemy.x - 4, enemy.y - enemy.r - 6);
    }

    if (enemy.weakenTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 237, 170, 0.82)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(enemy.x - enemy.r * 0.34, enemy.y + enemy.r * 0.24);
      ctx.lineTo(enemy.x, enemy.y + enemy.r * 0.62);
      ctx.lineTo(enemy.x + enemy.r * 0.36, enemy.y + enemy.r * 0.24);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 235, 245, 0.72)';
    ctx.beginPath();
    ctx.arc(enemy.x - enemy.r * 0.24, enemy.y - enemy.r * 0.22, 1.4 + enemy.threat * 0.6, 0, TAU);
    ctx.arc(enemy.x + enemy.r * 0.24, enemy.y - enemy.r * 0.22, 1.4 + enemy.threat * 0.6, 0, TAU);
    ctx.fill();

    if (enemy.threat >= 0.74 || enemy.boss) {
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
}

function drawBullets() {
  for (const b of state.bullets) {
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

function drawParticles() {
  ctx.lineCap = 'butt';
  for (const p of state.particles) {
    const ratio = p.ttl ? clamp(p.life / p.ttl, 0, 1) : clamp(p.life * 3, 0, 1);
    ctx.globalAlpha = clamp(ratio * (p.alphaMul || 1.15), 0, 1);

    if (p.render === 'ring') {
      const r = (p.size || 5) + (1 - ratio) * (p.expand || 12);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = (p.lineWidth || 1.6) * (0.85 + ratio * 0.45);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.stroke();
      continue;
    }

    if (p.render === 'shard') {
      const len = (p.length || 9) * (0.55 + ratio * 0.95);
      const ang = Math.atan2(p.vy || 0, p.vx || 1);
      const tx = p.x - Math.cos(ang) * len;
      const ty = p.y - Math.sin(ang) * len;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.lineWidth || 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      continue;
    }

    if (p.render === 'ray') {
      const ang = p.rot || 0;
      const len = (p.length || 12) * (0.58 + (1 - ratio) * 0.8);
      const sx = p.x - Math.cos(ang) * len * 0.22;
      const sy = p.y - Math.sin(ang) * len * 0.22;
      const ex = p.x + Math.cos(ang) * len;
      const ey = p.y + Math.sin(ang) * len;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.lineWidth || 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

function drawBanner() {
  if (state.banner.ttl <= 0 || !state.banner.text) return;

  const cls = state.banner.warn ? 'banner warn' : 'banner';
  const html = `<div class="${cls}">${state.banner.text}</div>`;

  if (!overlayEl.classList.contains('hidden')) return;
  overlayEl.classList.add('banner-passive');

  const current = overlayEl.querySelector('.banner');
  if (!current || current.textContent !== state.banner.text || current.className !== cls) {
    overlayEl.innerHTML = html;
  }

  overlayEl.classList.remove('hidden');
}

function draw() {
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
  drawBackground();
  drawGrid();
  drawSelectedCell();
  drawPathPreview();
  drawEndpoints();
  drawTowers();
  drawBullets();
  drawEnemies();
  drawParticles();
}

function step(dt) {
  state.emperorShieldTimer = Math.max(0, state.emperorShieldTimer - dt);
  state.emperorShieldFx = Math.max(0, state.emperorShieldFx - dt);
  state.emperorShieldHitCooldown = Math.max(0, state.emperorShieldHitCooldown - dt);

  if (state.mode !== 'playing') {
    draw();
    refreshHud();
    return;
  }

  if (state.paused) {
    draw();
    refreshHud();
    return;
  }

  const simDt = dt * state.simSpeed;
  state.runTime += dt;

  state.banner.ttl = Math.max(0, state.banner.ttl - dt);
  if (state.banner.ttl <= 0 && overlayEl.querySelector('.banner')) {
    overlayEl.classList.add('hidden');
    overlayEl.classList.remove('reward-mode');
    overlayEl.classList.remove('banner-passive');
    overlayEl.innerHTML = '';
  }

  let remain = simDt;
  let guard = 0;
  while (remain > 0 && guard < 32) {
    const subDt = Math.min(MAX_SIM_SUBSTEP, remain);
    updateSpawning(subDt);
    currentTowerBuckets = buildTowerBuckets();
    updateTowers(subDt);
    updateBullets(subDt);
    updateEnemies(subDt);
    updateParticles(subDt);
    remain -= subDt;
    guard += 1;
    if (state.mode !== 'playing') break;
  }

  draw();
  drawBanner();
  refreshHud();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  requestAnimationFrame(frame);
}

function chooseTower(kind) {
  if (!TOWER_TYPES[kind]) return;
  state.selectedTower = kind;
  if (state.sellMode) setSellMode(false);
  setSelectedButton();
  refreshBuildHint();
}

function handleControlsClick(event) {
  const sellToggle = event.target.closest('[data-action="toggle-sell"]');
  if (sellToggle) {
    setSellMode(!state.sellMode);
    refreshBuildHint();
    sfx(state.sellMode ? 310 : 390, 0.05, 'triangle', 0.013);
    return;
  }

  if (event.target.closest('[data-action="speed-up"]')) {
    changeSimSpeed(0.25);
    return;
  }

  if (event.target.closest('[data-action="speed-down"]')) {
    changeSimSpeed(-0.25);
    return;
  }

  if (event.target.closest('[data-action="toggle-merge"]')) {
    setMergeMode(!state.mergeMode);
    return;
  }

  if (event.target.closest('[data-action="toggle-pause"]')) {
    setPaused(!state.paused);
    if (state.paused) flashBanner('PAUSED', 0.5);
    return;
  }

  if (event.target.closest('[data-action="cho-lotto"]')) {
    if (state.gold < CHO_LOTTO_COST) {
      flashBanner(`Need ${CHO_LOTTO_COST} Gold`, 0.6, true);
      return;
    }
    state.gold -= CHO_LOTTO_COST;
    if (Math.random() < CHO_LOTTO_CHANCE) {
      state.selectedTower = 'lottoSunken';
      state.choLottoActive = true;
      showChoLottoWin();
    } else {
      flashBanner('Miss...', 0.6, true);
    }
    refreshHud();
    return;
  }

  if (event.target.closest('[data-action="cull-enemies"]')) {
    castCull();
    return;
  }

  if (event.target.closest('[data-action="emperor-shield"]')) {
    castEmperorShield();
    return;
  }

  const btn = event.target.closest('.build-btn[data-kind]');
  if (!btn) return;
  chooseTower(btn.dataset.kind);
}

controlsEl.addEventListener('click', handleControlsClick);
if (quickBuildEl) quickBuildEl.addEventListener('click', handleControlsClick);

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

function handleCanvasAction(event) {
  if (state.mode !== 'playing') return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);
  const cell = worldToCell(x, y);

  if (inBounds(cell.c, cell.r)) {
    state.selectedCell = { c: cell.c, r: cell.r, at: performance.now() };
  }

  if (state.mergeMode) {
    if (getFusionTowerCount() >= MERGE_FUSION_MAX && isMergeSystemSaturated()) {
      flashBanner(`Merge cap ${MERGE_FUSION_MAX}/${MERGE_FUSION_MAX}`, 0.75, true);
      setMergeMode(false);
      return;
    }

    const tapped = getTower(cell.c, cell.r);
    if (!tapped) {
      flashBanner('Pick tower', 0.55);
      return;
    }

    if (!state.mergePick) {
      state.mergePick = tapped;
      refreshMergeButton(1);
      flashBanner('Pick second tower', 0.55);
      return;
    }

    const baseTower = state.mergePick;
    const targetTower = tapped;
    if (baseTower === targetTower) {
      flashBanner('Pick different tower', 0.55, true);
      return;
    }

    const baseKinds = baseTower.fusedKinds || [baseTower.kind];
    const targetKinds = targetTower.fusedKinds || [targetTower.kind];

    if (baseKinds.includes('sunkenStun') || targetKinds.includes('sunkenStun')) {
      flashBanner('Stun Sunken cannot merge', 0.75, true);
      return;
    }

    if (baseKinds.includes('lottoSunken') || targetKinds.includes('lottoSunken')) {
      flashBanner('Lotto Sunken cannot merge', 0.75, true);
      return;
    }

    if (baseKinds.includes('tankerSunken') || targetKinds.includes('tankerSunken')) {
      flashBanner('Tanker Sunken cannot merge', 0.75, true);
      return;
    }

    const overlap = targetKinds.some((k) => baseKinds.includes(k));
    if (overlap) {
      refreshMergeButton(1);
      flashBanner('Same type blocked', 0.7, true);
      return;
    }

    if ((baseTower.footprint || 1) > 1 || (targetTower.footprint || 1) > 1) {
      flashBanner('Merge only 1x1', 0.7, true);
      return;
    }

    if (baseKinds.length + targetKinds.length > 5) {
      flashBanner('One Fusion max 5 types', 0.7, true);
      return;
    }

    const projectedFusionCount = projectedFusionCountAfterMerge(baseTower, targetTower);
    if (projectedFusionCount > MERGE_FUSION_MAX) {
      flashBanner(`Merge cap ${MERGE_FUSION_MAX}/${MERGE_FUSION_MAX}`, 0.75, true);
      return;
    }

    const mergeCost = Math.floor(baseTower.spent * 0.5);
    const totalCost = mergeCost + targetTower.spent;
    if (state.gold < totalCost) {
      flashBanner('Not enough Gold', 0.9, true);
      return;
    }

    state.gold -= totalCost;
    baseTower.fusedKinds = [...baseKinds, ...targetKinds];
    baseTower.fusedLevels = {
      ...(baseTower.fusedLevels || { [baseTower.kind]: baseTower.level || 1 }),
      ...(targetTower.fusedLevels || { [targetTower.kind]: targetTower.level || 1 }),
    };
    baseTower.kind = 'fusion';
    baseTower.spent += totalCost;

    baseTower.range = Math.max(baseTower.range, targetTower.range);
    baseTower.damage += targetTower.damage;
    baseTower.reload = Math.min(baseTower.reload, targetTower.reload);
    baseTower.bulletSpeed = Math.max(baseTower.bulletSpeed, targetTower.bulletSpeed);
    baseTower.splashRadius = Math.max(baseTower.splashRadius || 0, targetTower.splashRadius || 0);
    baseTower.splashFalloff = Math.max(baseTower.splashFalloff || 0, targetTower.splashFalloff || 0);
    baseTower.maxHp += targetTower.maxHp;
    baseTower.hp = Math.min(baseTower.maxHp, baseTower.hp + targetTower.maxHp * 0.35);

    baseTower.snareDuration = Math.max(baseTower.snareDuration || 0, targetTower.snareDuration || 0);
    baseTower.snareSlow = Math.min(baseTower.snareSlow || 1, targetTower.snareSlow || 1);
    baseTower.weakenMul = Math.max(baseTower.weakenMul || 1, targetTower.weakenMul || 1);
    baseTower.stunDuration = Math.max(baseTower.stunDuration || 0, targetTower.stunDuration || 0);
    baseTower.stunChain = (baseTower.stunChain || 0) + (targetTower.stunChain || 0);
    baseTower.stunRadius = Math.max(baseTower.stunRadius || 0, targetTower.stunRadius || 0);

    // Fusion balance: overall nerf so merged sunken isn't overpowering
    baseTower.damage *= 0.8;
    baseTower.reload *= 1.15;
    baseTower.range *= 0.95;

    baseTower.color = '#aef0ff';
    baseTower.baseCost = Math.max(baseTower.baseCost || baseTower.spent, targetTower.baseCost || targetTower.spent);
    invalidateMergeCache();

    removeTower(targetTower);
    for (const enemy of state.enemies) {
      enemy.repath = 0;
    }

    flashBanner(`Merge done`, 0.7);
    impactSfx.play('build', { volume: 0.32, minGap: 0.05, rateMin: 0.96, rateMax: 1.06 });
    state.mergePick = null;
    setMergeMode(false);
    refreshMergeButton(0);
    refreshBuildHint();
    return;
  }

  if (event.button === 2 || state.sellMode) {
    sellTower(cell.c, cell.r);
  } else {
    tryPlaceTower(cell.c, cell.r);
  }
}

const MOBILE_TAP_MAX_MOVE = 10;
const MOBILE_TAP_MAX_MS = 220;
const MOBILE_SCROLL_GUARD_MS = 140;

const mobileTapState = {
  active: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
  startAt: 0,
  moved: false
};

let lastScrollAt = 0;
window.addEventListener('scroll', () => {
  lastScrollAt = performance.now();
}, { passive: true });

function clearMobileTap() {
  mobileTapState.active = false;
  mobileTapState.pointerId = -1;
  mobileTapState.startX = 0;
  mobileTapState.startY = 0;
  mobileTapState.startAt = 0;
  mobileTapState.moved = false;
}

function tapMovedTooFar(event) {
  const dx = event.clientX - mobileTapState.startX;
  const dy = event.clientY - mobileTapState.startY;
  return dx * dx + dy * dy > MOBILE_TAP_MAX_MOVE * MOBILE_TAP_MAX_MOVE;
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') {
    handleCanvasAction(event);
    return;
  }

  mobileTapState.active = true;
  mobileTapState.pointerId = event.pointerId;
  mobileTapState.startX = event.clientX;
  mobileTapState.startY = event.clientY;
  mobileTapState.startAt = performance.now();
  mobileTapState.moved = false;
});

canvas.addEventListener('pointermove', (event) => {
  if (!mobileTapState.active || event.pointerId !== mobileTapState.pointerId) return;
  if (tapMovedTooFar(event)) mobileTapState.moved = true;
});

canvas.addEventListener('pointerup', (event) => {
  if (!mobileTapState.active || event.pointerId !== mobileTapState.pointerId) return;

  const elapsed = performance.now() - mobileTapState.startAt;
  const moved = mobileTapState.moved || tapMovedTooFar(event);
  const justScrolled = performance.now() - lastScrollAt < MOBILE_SCROLL_GUARD_MS;

  if (!moved && elapsed <= MOBILE_TAP_MAX_MS && !justScrolled) {
    handleCanvasAction(event);
  }

  clearMobileTap();
});

canvas.addEventListener('pointercancel', (event) => {
  if (mobileTapState.active && event.pointerId === mobileTapState.pointerId) {
    clearMobileTap();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Digit1') chooseTower('sunken');
  if (event.code === 'Digit4') chooseTower('sunkenSplash');
  if (event.code === 'Digit5') chooseTower('speedSunken');
  if (event.code === 'Digit6') chooseTower('tankerSunken');
  if (event.code === 'Digit7') chooseTower('sunkenHammer');
  if (event.code === 'Digit8') chooseTower('sunkenNova');
  if (event.code === 'Digit9') chooseTower('sunkenStun');

  if (event.code === 'KeyQ') {
    state.sunkenFootprint = state.sunkenFootprint === 1 ? 2 : 1;
    refreshBuildHint();
    sfx(390, 0.05, 'triangle', 0.014);
  }

  if (event.code === 'KeyE') {
    setSellMode(!state.sellMode);
    refreshBuildHint();
    sfx(state.sellMode ? 300 : 410, 0.05, 'triangle', 0.013);
  }

  if (event.code === 'KeyM') {
    setMergeMode(!state.mergeMode);
  }

  if (event.code === 'KeyF') {
    changeSimSpeed(0.25);
  }

  if (event.code === 'KeyG') {
    changeSimSpeed(-0.25);
  }

  if (event.code === 'KeyP') {
    setPaused(!state.paused);
  }

  if (event.code === 'KeyR') {
    castEmperorShield();
  }

});

overlayEl.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action.startsWith('reward:')) {
    applyStageReward(action.split(':')[1]);
    return;
  }
  if (action === 'cho-ack') {
    overlayEl.classList.add('hidden');
    overlayEl.innerHTML = '';
    return;
  }
  if (action === 'start' || action === 'restart') startRun();
});

function showMenu() {
  document.body.classList.remove('playing');
  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Sunken Sixway Defense</h2>
      <div class="actions">
        <button type="button" data-action="start">Start</button>
      </div>
    </div>
  `;
}

showMenu();
renderBuildButtonIcons();
refreshMergeableTowerBadge();
setSelectedButton();
setSellMode(false);
refreshBuildHint();
buildDistanceMap();
refreshHud();
if (rankToggleBtn && rankPanelEl) {
  const setRankVisible = (show) => {
    rankPanelEl.classList.toggle('rank-hidden', !show);
    rankToggleBtn.classList.toggle('active', show);
    if (detailToggleBtn) detailToggleBtn.classList.toggle('active', false);
    if (detailPanelEl) detailPanelEl.classList.toggle('detail-hidden', true);
    if (singleTabEl) singleTabEl.classList.toggle('active', !show);
    document.body.classList.toggle('rank-mode', show);
    document.body.classList.toggle('detail-mode', false);
  };
  setRankVisible(false);
  rankToggleBtn.addEventListener('click', () => {
    const show = rankPanelEl.classList.contains('rank-hidden');
    setRankVisible(show);
  });
}

if (detailToggleBtn && detailPanelEl) {
  const setDetailVisible = (show) => {
    detailPanelEl.classList.toggle('detail-hidden', !show);
    detailToggleBtn.classList.toggle('active', show);
    if (rankToggleBtn) rankToggleBtn.classList.toggle('active', false);
    if (rankPanelEl) rankPanelEl.classList.toggle('rank-hidden', true);
    if (singleTabEl) singleTabEl.classList.toggle('active', !show);
    document.body.classList.toggle('detail-mode', show);
    document.body.classList.toggle('rank-mode', false);
  };
  setDetailVisible(false);
  detailToggleBtn.addEventListener('click', () => {
    const show = detailPanelEl.classList.contains('detail-hidden');
    setDetailVisible(show);
  });
}

if (singleTabEl) {
  singleTabEl.addEventListener('click', () => {
    if (rankToggleBtn) rankToggleBtn.classList.toggle('active', false);
    if (rankPanelEl) rankPanelEl.classList.toggle('rank-hidden', true);
    if (detailToggleBtn) detailToggleBtn.classList.toggle('active', false);
    if (detailPanelEl) detailPanelEl.classList.toggle('detail-hidden', true);
    singleTabEl.classList.toggle('active', true);
    document.body.classList.toggle('rank-mode', false);
    document.body.classList.toggle('detail-mode', false);
  });
}
initSingleRank();

const rankAdUrls = {
  1: 'https://iksu-cheers.com/',
  2: '',
  3: '',
  4: '',
  5: '',
};

if (rankAdsEl) {
  rankAdsEl.addEventListener('click', (event) => {
    const slot = event.target.closest('.ad-slot');
    if (!slot) return;
    const key = slot.getAttribute('data-ad-slot');
    const url = key ? (rankAdUrls[key] || '') : '';
    if (url) window.open(url, '_blank', 'noopener');
  });
}

const onScroll = () => {
  document.body.classList.toggle('scrolled', window.scrollY > 4);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

loadEnemySprites();
requestAnimationFrame(frame);
