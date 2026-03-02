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

const btnSellMode = document.getElementById('btnSellMode');
const btnSpeedUp = document.getElementById('btnSpeedUp');
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
if (isMobileView) {
  canvas.width = 720;
  canvas.height = 960;
} else {
  canvas.width = 960;
  // 데스크톱은 그리드 셀(30) 배수 높이로 맞춰야 하단 배치 불가 영역이 생기지 않는다.
  canvas.height = 510;
}
const GRID_CELL = isMobileView ? 48 : 30;
const BALANCE_SCALE = GRID_CELL / 30;

const W = canvas.width;
const H = canvas.height;
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
const MAX_TOWER_LEVEL = 7;
const MAX_SIM_SUBSTEP = 1 / 120;

const TOWER_TYPES = {
  sunken: {
    id: 'sunken',
    name: 'Sunken',
    cost: 40,
    color: '#8dd9ff',
    range: 105 * BALANCE_SCALE,
    damage: 30,
    reload: 0.5,
    bulletSpeed: 360 * BALANCE_SCALE,
    pierce: 0,
    hp: 250,
  },
  sunkenSlow: {
    id: 'sunkenSlow',
    name: 'Slow Sunken',
    cost: 85,
    color: '#91f4d6',
    range: 108 * BALANCE_SCALE,
    damage: 20,
    reload: 0.58,
    bulletSpeed: 350 * BALANCE_SCALE,
    pierce: 0,
    hp: 240,
    snareDuration: 1.45,
    snareSlow: 0.62,
  },
  longSunken: {
    id: 'longSunken',
    name: 'Long Sunken',
    cost: 220,
    color: '#8fb9ff',
    range: Math.hypot(W, H) * 1.2,
    damage: 58,
    reload: 1.42,
    bulletSpeed: 520 * BALANCE_SCALE,
    pierce: 0,
    hp: 270,
  },
  sunkenSplash: {
    id: 'sunkenSplash',
    name: 'Splash Sunken',
    cost: 130,
    color: '#ff9f6f',
    range: 114 * BALANCE_SCALE,
    damage: 36,
    reload: 0.9,
    bulletSpeed: 320 * BALANCE_SCALE,
    pierce: 0,
    hp: 290,
    splashRadius: 66 * BALANCE_SCALE,
    splashFalloff: 0.42,
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
    color: '#ffd96a',
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
  spine: {
    id: 'spine',
    name: 'Spine',
    cost: 70,
    color: '#b9e8ac',
    range: 124 * BALANCE_SCALE,
    damage: 18,
    reload: 0.28,
    bulletSpeed: 420 * BALANCE_SCALE,
    pierce: 0,
    hp: 190,
  },
  obelisk: {
    id: 'obelisk',
    name: 'Obelisk',
    cost: 110,
    color: '#e2b1ff',
    range: 150 * BALANCE_SCALE,
    damage: 52,
    reload: 1.1,
    bulletSpeed: 330 * BALANCE_SCALE,
    pierce: 1,
    hp: 320,
  },
  snare: {
    id: 'snare',
    name: 'Snare',
    cost: 90,
    color: '#9ae8ff',
    range: 132 * BALANCE_SCALE,
    damage: 12,
    reload: 0.72,
    bulletSpeed: 340 * BALANCE_SCALE,
    pierce: 0,
    hp: 210,
    snareDuration: 2.4,
    snareSlow: 0.48,
    weakenMul: 1.42,
  },
};

const TOWER_GUIDE_DETAILS = {
  sunken: {
    role: '기본 라인 딜러',
    summary: '저비용/고연사 단일 공격. 초반 길목을 빠르게 채우는 핵심 타워.',
    tips: '다수 배치에 강하지만, 후반 고체력 적은 단독 처리력이 낮음.',
  },
  sunkenSlow: {
    role: '단일 감속 제어',
    summary: '한 발마다 한 마리를 정확히 둔화시키는 제어형 성큰. 빠른 몹 카운터에 특화.',
    tips: '단일 타겟 제어이므로 군집 대응은 Splash/Spine과 함께 배치해야 효율이 높음.',
  },
  longSunken: {
    role: '초장거리 저격',
    summary: '맵 끝에서 끝까지 커버하는 초장거리 포격 성큰. 우회 없이 핵심 대상을 즉시 압박.',
    tips: '비용/공속 부담이 커서 초반 과투자는 위험. Spine/Splash와 함께 운영해야 안정적.',
  },
  spine: {
    role: '지속 화력 특화',
    summary: '중거리에서 빠른 탄막으로 잔몹과 러시 웨이브를 쓸어내는 타워.',
    tips: '한 방이 약해 보스는 Obelisk 계열과 조합해야 안정적.',
  },
  obelisk: {
    role: '장거리 중장갑 포격',
    summary: '긴 사거리와 높은 일격 대미지, 관통으로 탱커/보스 대응에 특화.',
    tips: '비용이 높고 연사력이 낮아 초반 과투자 시 라인이 무너질 수 있음.',
  },
  sunkenSplash: {
    role: '광역 압축 화력',
    summary: '피격 지점 주변에 스플래시 대미지를 주는 중후반 핵심 광역 타워.',
    tips: '좁은 길목, 몹이 뭉치는 구간에 배치하면 효율이 크게 상승.',
  },
  sunkenNova: {
    role: '360도 방사 화력',
    summary: '발사 시 전 방향으로 탄막을 뿌려 측면/후방 새는 몹까지 동시에 커버.',
    tips: '단일 대상 화력은 낮으므로 Long/Obelisk와 함께 보스 처리 라인을 구성해야 효율적.',
  },
  sunkenStun: {
    role: '제어형 단속 화력',
    summary: '명중 시 주변 최대 3마리를 잠깐 멈추게 만들어 러시 타이밍을 끊어낸다.',
    tips: '스턴 지속이 짧아 화력 타워와 같이 두면 훨씬 강력하다.',
  },
  snare: {
    role: '디버프/제어',
    summary: '러시몹 포함 전체 적에게 둔화/약화 디버프를 걸어 화력을 증폭.',
    tips: '단독 화력은 낮으므로 딜 타워와 반드시 함께 운용.',
  },
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
  sunkenFootprint: 1,
  sellMode: false,
  simSpeed: 1,
  stageTimer: 0,
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
  emperorShieldFx: 0,
  emperorShieldHitCooldown: 0,
  emperorShieldUses: 0,
  banner: { text: '', ttl: 0, warn: false },
};

const EMPEROR_SHIELD_COST = 1000;
const EMPEROR_SHIELD_DURATION = 10;
const EMPEROR_SHIELD_MAX_USES = 5;

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
  const updatedAt = Math.floor(Number(raw.updatedAt || Date.now()));
  const playerId = String(raw.playerId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
  if (!playerId) return null;
  return {
    playerId,
    playerName: normalizeRankName(raw.playerName || raw.name),
    stage,
    kills,
    score,
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
    li.textContent = '기록 없음';
    rankListEl.appendChild(li);
    return;
  }

  rows.forEach((row, idx) => {
    const li = document.createElement('li');
    if (idx === 0) li.classList.add('top1');
    const meTag = row.playerId === singleRankState.playerId ? ' · YOU' : '';
    li.textContent = `${idx + 1}. ${row.playerName} · Stage ${row.stage} · Kills ${row.kills}${meTag}`;
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
  setRankStatus('닉네임 등록 후 서버 기록 저장 가능');
  flashBanner('닉네임 등록 필요', 0.9, true);
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
    setRankStatus('닉네임 등록 완료 · 온라인 랭킹 반영 대기');
  } else {
    setRankStatus(singleRankState.serverUrl ? '닉네임 등록 완료 · 서버 연결 시도' : '닉네임 등록 완료 · 로컬 기록 모드');
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
    setRankStatus('서버 주소 없음 · 로컬 랭킹');
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
    setRankStatus('랭킹 서버 연결 실패 · 로컬 랭킹');
    renderSingleRank();
    return;
  }

  singleRankState.ws = ws;
  setRankStatus('랭킹 서버 연결 시도 중...');

  ws.addEventListener('open', () => {
    if (singleRankState.ws !== ws) return;
    singleRankState.connected = true;
    singleRankState.serverUrl = url;
    syncRankInputs();
    saveRankProfile();
    setRankScope('ONLINE');
    setRankStatus(singleRankState.playerName ? '온라인 랭킹 연결됨' : '온라인 연결됨 · 닉네임 등록 필요');

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
      setRankStatus(singleRankState.remoteRows.length ? '온라인 랭킹 갱신됨' : '온라인 랭킹 비어있음');
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
      setRankStatus('플레이어 등록 완료 · 서버 기록 유지됨');
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
        setRankStatus(`온라인 랭킹 반영 완료 · 현재 ${Math.floor(Number(msg.rank))}위`);
      }
    }
  });

  ws.addEventListener('close', () => {
    if (singleRankState.ws !== ws) return;
    singleRankState.connected = false;
    singleRankState.ws = null;
    setRankScope('LOCAL');
    setRankStatus('서버 미연결 · 로컬 랭킹');
    renderSingleRank();
  });

  ws.addEventListener('error', () => {
    if (singleRankState.ws !== ws) return;
    singleRankState.connected = false;
    singleRankState.ws = null;
    setRankScope('LOCAL');
    setRankStatus('서버 연결 실패 · 로컬 랭킹');
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
    updatedAt: Date.now(),
  });
  if (!row) return;

  updateLocalRank(row);
  renderSingleRank();
  setRankStatus(`로컬 랭킹 반영 · Stage ${row.stage} / Kills ${row.kills}`);

  if (singleRankState.connected && singleRankState.ws && singleRankState.ws.readyState === WebSocket.OPEN) {
    singleRankState.ws.send(JSON.stringify({
      type: 'single_rank_submit',
      playerId: singleRankState.playerId,
      name: singleRankState.playerName,
      stage: row.stage,
      kills: row.kills,
      score: row.score,
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
        setRankStatus('온라인 랭킹 새로고침 요청');
      } else {
        openRankSocket(true);
      }
    });
  }

  syncRankInputs();
  saveRankProfile();
  setRankScope('LOCAL');
  setRankStatus(singleRankState.playerName ? '프로필 로드 완료' : '닉네임 입력 후 등록/저장');
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
    };
  }

  let cost = base.cost;
  if (kind === 'sunken' && state.stage <= 3) {
    cost = Math.max(10, base.cost - 10);
  }

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
  if (enemy?.jumper) return true;
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
  const distMap = enemy?.jumper ? state.distJump : state.dist;
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
  };
}

function upgradeCost(tower) {
  const base = tower.baseCost || TOWER_TYPES[tower.kind].cost;
  // 레벨이 오를수록 비용이 가파르게 증가하도록 후반 구간(4+, 6+) 가중치를 추가한다.
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
    : kind === 'sunkenSlow'
      ? 1.19
    : kind === 'longSunken'
      ? 1.12
    : kind === 'sunkenNova'
      ? 1.15
    : kind === 'sunkenStun'
      ? 1.14
    : kind === 'sunkenSplash'
      ? 1.18
    : kind === 'spine'
      ? 1.16
      : kind === 'obelisk'
        ? 1.15
        : 1.2;

  const damageMul = kind === 'snare'
    ? 1.26
    : kind === 'longSunken'
      ? 1.32
    : kind === 'sunkenNova'
      ? 1.24
    : kind === 'sunkenStun'
      ? 1.22
    : kind === 'sunkenSlow'
      ? 1.28
    : kind === 'sunkenSplash'
      ? 1.3
      : 1.34;

  const reloadMul = kind === 'sunken'
    ? 0.88
    : kind === 'longSunken'
      ? 0.93
    : kind === 'sunkenNova'
      ? 0.9
    : kind === 'sunkenStun'
      ? 0.92
    : kind === 'sunkenSlow'
      ? 0.9
    : kind === 'sunkenSplash'
      ? 0.92
      : 0.9;

  return { rangeMul, damageMul, reloadMul };
}

function applyTowerUpgradeScaling(tower, factors = null) {
  const stats = factors || getTowerUpgradeFactors(tower.kind);
  tower.range *= stats.rangeMul;
  tower.damage *= stats.damageMul;
  tower.reload *= stats.reloadMul;
  tower.pierce = Math.min(3, tower.pierce + (tower.kind === 'obelisk' ? 1 : 0));

  if (tower.kind === 'snare') {
    tower.snareDuration *= 1.13;
    tower.snareSlow = Math.max(0.32, tower.snareSlow * 0.93);
    tower.weakenMul += 0.09;
    tower.pierce = 0;
  } else if (tower.kind === 'sunkenSlow') {
    tower.snareDuration *= 1.12;
    tower.snareSlow = Math.max(0.38, tower.snareSlow * 0.94);
  } else if (tower.kind === 'sunkenSplash') {
    tower.splashRadius *= 1.15;
    tower.splashFalloff = clamp(tower.splashFalloff + 0.05, 0.3, 0.68);
  } else if (tower.kind === 'sunkenStun') {
    tower.stunDuration = Math.min(2.1, tower.stunDuration * 1.1);
    tower.stunRadius *= 1.06;
    if (tower.level === 3 || tower.level === 5 || tower.level === 7) {
      tower.stunChain = Math.min(6, (tower.stunChain || 3) + 1);
    }
  }
}

function upgradeTower(tower) {
  if (tower.level >= MAX_TOWER_LEVEL) return false;
  const cost = upgradeCost(tower);
  if (state.gold < cost) {
    flashBanner('Gold 부족', 0.9, true);
    return false;
  }

  const factors = getTowerUpgradeFactors(tower.kind);

  state.gold -= cost;
  tower.level += 1;
  tower.spent += cost;
  applyTowerUpgradeScaling(tower, factors);
  tower.maxHp *= 1.34;
  tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.25);

  const rangePercent = Math.round((factors.rangeMul - 1) * 100);
  flashBanner(`UPGRADE Lv.${tower.level} · RANGE +${rangePercent}%`, 0.75);
  const upgradePitch = factors.reloadMul < 1 ? 680 : 620;
  sfx(upgradePitch, 0.07, 'triangle', 0.022);
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

  if (state.gold < placement.cost) {
    flashBanner('Gold 부족', 0.9, true);
    return;
  }

  const footprintCells = getFootprintCells(c, r, placement.footprint);
  if (!canUseFootprint(footprintCells)) {
    flashBanner('배치 불가(범위/지점)', 0.85, true);
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
    flashBanner('길이 막혀 배치 불가', 1.1, true);
    sfx(170, 0.08, 'sawtooth', 0.03);
    return;
  }

  const tower = makeTower(state.selectedTower, c, r, placement);
  state.towers.push(tower);
  state.gold -= placement.cost;

  impactSfx.play('build', { volume: 0.28, minGap: 0.045, rateMin: 0.96, rateMax: 1.04 });

  for (const enemy of state.enemies) {
    enemy.repath = 0;
  }
  refreshBuildHint();
  sfx(420 + rand(-20, 30), 0.04, 'triangle', 0.014);
}

function sellTower(c, r) {
  const tower = getTower(c, r);
  if (!tower) return;
  const refund = Math.floor(tower.spent * 0.6);
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
  const nightmareIndex = Math.max(0, s - 20);
  // Stage 21+ 구간은 별도 가중치를 더해 체감 난이도를 확실히 끌어올린다.
  const stageSpeedMul = (
    1
    + earlyStageIndex * 0.12
    + lateIndex * 0.07
    + lateIndex * lateIndex * 0.0025
    + nightmareIndex * 0.18
    + nightmareIndex * nightmareIndex * 0.016
  );
  const stageHpMul = (
    1
    + earlyStageIndex * 0.2
    + earlyStageIndex * earlyStageIndex * 0.013
    + lateIndex * 0.13
    + lateIndex * lateIndex * 0.006
    + nightmareIndex * 0.52
    + nightmareIndex * nightmareIndex * 0.044
  );
  const radiusMul = 1 + stageIndex * 0.022;
  const threatBase = clamp(0.18 + s * 0.07 + nightmareIndex * 0.04, 0.2, 1.28);
  const typeThreat = {
    ghoul: 0.02,
    bat: 0.06,
    hopper: 0.2,
    brute: 0.12,
    elder: 0.18,
    raider: 0.26,
    crusher: 0.32,
    lord: 0.3,
  };
  const defs = {
    ghoul: { hp: (58 + s * 12) * stageHpMul * 1.0, speed: (36 + s * 1.6) * stageSpeedMul, reward: 7, leak: 1, r: 10, color: '#c54f72' },
    bat: { hp: (34 + s * 7) * stageHpMul * 0.8, speed: (64 + s * 2.9) * stageSpeedMul, reward: 7, leak: 1, r: 8, color: '#d07ab4', fast: true },
    hopper: { hp: (24 + s * 5) * stageHpMul * 0.56, speed: (98 + s * 3.6) * stageSpeedMul, reward: 10, leak: 2, r: 8.5, color: '#9ae8ff', fast: true, jumper: true },
    brute: { hp: (150 + s * 28) * stageHpMul * 1.18, speed: (29 + s * 1.3) * stageSpeedMul, reward: 12, leak: 2, r: 13, color: '#9e5a9c' },
    elder: { hp: (262 + s * 46) * stageHpMul * 1.32, speed: (37 + s * 1.5) * stageSpeedMul, reward: 25, leak: 3, r: 15, color: '#b86ec8' },
    raider: {
      hp: (98 + s * 21) * stageHpMul * 0.98,
      speed: (56 + s * 2.2) * stageSpeedMul,
      reward: 18,
      leak: 2,
      r: 12,
      color: '#ff9d7f',
      fast: true,
    },
    crusher: {
      hp: (212 + s * 38) * stageHpMul * 1.1,
      speed: (44 + s * 1.9) * stageSpeedMul,
      reward: 30,
      leak: 3,
      r: 15,
      color: '#ffc17c',
      fast: true,
    },
    lord: { hp: (700 + s * 140) * stageHpMul * 1.65, speed: (27 + s) * stageSpeedMul, reward: 58, leak: 5, r: 18, color: '#f26a84', boss: true },
  };
  const d = defs[type];
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const threat = clamp(threatBase + (typeThreat[type] || 0), 0.2, 1.2);
  const leakBonus = s >= 28 ? 6 : s >= 24 ? 5 : s >= 21 ? 4 : s >= 18 ? 3 : s >= 14 ? 2 : s >= 10 ? 1 : s >= 6 ? 1 : 0;
  const leak = d.leak + (d.boss ? leakBonus : Math.floor(leakBonus * 0.5));

  return {
    type,
    x: spawn.x,
    y: spawn.y,
    r: d.r * radiusMul * BALANCE_SCALE,
    hp: Math.floor(d.hp),
    maxHp: Math.floor(d.hp),
    speed: d.speed * BALANCE_SCALE,
    reward: d.reward + Math.floor(s * 1.3 + nightmareIndex * 3.2),
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
  };
}

function makeStageQueue(stage) {
  const queue = [];
  const earlyStage = Math.min(stage, 10);
  const lateIndex = Math.max(0, stage - 10);
  const nightmareIndex = Math.max(0, stage - 20);
  const baseCount = (
    22
    + earlyStage * 9
    + Math.floor(Math.pow(earlyStage, 1.35) * 3)
    + lateIndex * 4
    + Math.floor(lateIndex * lateIndex * 0.8)
    + nightmareIndex * 4
    + Math.floor(nightmareIndex * nightmareIndex * 0.55)
  );

  for (let i = 0; i < baseCount; i += 1) {
    const roll = Math.random();
    let type = 'ghoul';
    const batChance = stage >= 3
      ? clamp(0.22 + stage * 0.004 - nightmareIndex * 0.006, 0.1, 0.34)
      : 0;
    const bruteChance = stage >= 4
      ? clamp(0.14 + stage * 0.01 + nightmareIndex * 0.012, 0.14, 0.45)
      : 0;
    const elderChance = stage >= 7
      ? clamp(0.08 + (stage - 7) * 0.014 + nightmareIndex * 0.018, 0.08, 0.42)
      : 0;
    const raiderChance = stage >= 5
      ? clamp(0.1 + (stage - 5) * 0.012 + nightmareIndex * 0.022, 0.1, 0.42)
      : 0;
    const crusherChance = stage >= 8
      ? clamp(0.06 + (stage - 8) * 0.011 + nightmareIndex * 0.024, 0.06, 0.38)
      : 0;
    const hopperChance = stage >= 13
      ? clamp(0.05 + (stage - 13) * 0.012 + nightmareIndex * 0.018, 0.05, 0.28)
      : 0;

    let threshold = crusherChance;
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
    queue.push(type);
  }

  const elderCount = 1 + Math.floor(stage * 0.75) + Math.floor(lateIndex * 0.4) + Math.floor(nightmareIndex * 1.1);
  for (let i = 0; i < elderCount; i += 1) {
    const pos = Math.floor(queue.length * (0.25 + Math.random() * 0.55));
    queue.splice(pos, 0, 'elder');
  }

  const bruteCount = Math.max(0, stage - 4) + Math.floor(lateIndex * 0.6) + Math.floor(nightmareIndex * 1.4);
  for (let i = 0; i < bruteCount; i += 1) {
    const pos = Math.floor(queue.length * (0.2 + Math.random() * 0.6));
    queue.splice(pos, 0, 'brute');
  }

  if (stage >= 8) {
    const surgePos = Math.floor(queue.length * 0.72);
    if (stage <= 12) {
      queue.splice(surgePos, 0, 'elder', 'elder', 'crusher');
    } else {
      queue.splice(surgePos, 0, 'elder', 'brute', Math.random() < 0.55 ? 'crusher' : 'raider', stage >= 13 ? 'hopper' : 'bat');
    }
  }

  if (stage >= 21) {
    const surgePos = Math.floor(queue.length * 0.56);
    queue.splice(surgePos, 0, 'crusher', 'hopper', 'raider', 'elder', 'brute', 'hopper', 'crusher', 'raider');
  }

  if (stage >= 6) {
    const rushCount = 1 + Math.floor(stage * 0.46) + Math.floor(lateIndex * 0.38) + Math.floor(nightmareIndex * 1.6);
    const crusherPickChance = clamp(0.32 + lateIndex * 0.01, 0.32, 0.44);
    for (let i = 0; i < rushCount; i += 1) {
      const pos = Math.floor(queue.length * (0.28 + Math.random() * 0.5));
      const pick = stage >= 13 && Math.random() < 0.28
        ? 'hopper'
        : (stage >= 8 && Math.random() < crusherPickChance ? 'crusher' : 'raider');
      queue.splice(pos, 0, pick);
    }
  }

  if (stage >= 21) queue.push('lord');
  if (stage >= 27) queue.push('lord');
  queue.push('lord');
  return queue;
}

function startStage(stage) {
  state.stage = stage;
  state.stageTimer = Math.max(0.2, 1.2 - stage * 0.05 - Math.max(0, stage - 10) * 0.025);
  state.spawnQueue = makeStageQueue(stage);
  state.spawnTimer = 0.45;
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
  state.spawnQueue = [];
  state.enemies = [];
  state.towers = [];
  state.nextTowerId = 1;
  state.spawnSerial = 0;
  state.bullets = [];
  state.particles = [];
  state.blocked.clear();
  state.simSpeed = 1;
  state.selectedTower = 'sunken';
  state.sunkenFootprint = 1;
  state.sellMode = false;
  state.towerHpBonus = 0;
  state.rushDamageBonus = 0;
  state.pendingStage = 0;
  state.pendingStageBonusGold = 0;
  state.rewardUiUnlockAt = 0;
  state.emperorShieldTimer = 0;
  state.emperorShieldFx = 0;
  state.emperorShieldHitCooldown = 0;
  state.emperorShieldUses = 0;
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
  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>수비 실패</h2>
      <p>Stage ${state.stage} · Kills ${state.kills} · Gold ${state.gold}</p>
      <div class="actions">
        <button type="button" data-action="restart">다시 도전</button>
      </div>
    </div>
  `;
  bgmAudio?.fx('fail');
  sfx(170, 0.2, 'sawtooth', 0.05);
}

function setVictory() {
  submitSingleRank('victory');
  state.mode = 'victory';
  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Stage ${state.maxStage} 방어 성공</h2>
      <p>성큰 길막 수비 완료 · Kills ${state.kills} · Base HP ${state.baseHp}</p>
      <div class="actions">
        <button type="button" data-action="restart">새 게임</button>
      </div>
    </div>
  `;
  bgmAudio?.fx('win');
  sfx(520, 0.16, 'triangle', 0.04);
}

function showStageReward() {
  const nightmareIndex = Math.max(0, state.stage - 20);
  const clearGold = 70 + state.stage * 14 + nightmareIndex * 28 + Math.floor(nightmareIndex * nightmareIndex * 3);
  const autoRushBonus = 0.25;
  state.pendingStage = state.stage + 1;
  state.pendingStageBonusGold = clearGold;
  state.gold += clearGold;
  state.rushDamageBonus += autoRushBonus;
  state.mode = 'reward';
  state.rewardUiUnlockAt = performance.now() + 220;

  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.add('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal reward-modal">
      <h2>Stage ${state.stage} 클리어</h2>
      <p>보상 +${clearGold} Gold · 러시 대응 +25% 자동 적용 (누적 +${Math.round(state.rushDamageBonus * 100)}%)</p>
      <div class="actions">
        <button type="button" data-action="reward:next" disabled>다음 스테이지 시작</button>
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
  flashBanner(`러시 대응 누적 +${Math.round(state.rushDamageBonus * 100)}%`, 0.9);
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

function refreshHud() {
  stageTextEl.textContent = String(state.stage);
  baseTextEl.textContent = String(Math.max(0, state.baseHp));
  goldTextEl.textContent = String(Math.floor(state.gold));
  aliveTextEl.textContent = String(state.enemies.length);
  queueTextEl.textContent = String(state.spawnQueue.length);
  killsTextEl.textContent = String(state.kills);
  if (speedTextEl) speedTextEl.textContent = `${state.simSpeed.toFixed(2)}x`;
  if (btnSunken) {
    const sunkenCostEl = btnSunken.querySelector('.cost');
    const spec = getPlacementSpec('sunken');
    if (sunkenCostEl && spec) sunkenCostEl.textContent = `${spec.cost}`;
  }
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
    if (costEl) costEl.textContent = `${state.emperorShieldTimer.toFixed(1)}s · 남은 ${usesLeft}/${EMPEROR_SHIELD_MAX_USES}`;
    return;
  }
  btnEmperorShield.classList.remove('active');
  if (usesLeft <= 0) {
    btnEmperorShield.classList.add('locked');
    if (nameEl) nameEl.textContent = 'SHIELD END';
    if (costEl) costEl.textContent = `사용 완료 (${EMPEROR_SHIELD_MAX_USES}/${EMPEROR_SHIELD_MAX_USES})`;
    return;
  }
  const notEnoughGold = state.gold < EMPEROR_SHIELD_COST;
  btnEmperorShield.classList.toggle('locked', notEnoughGold);
  if (nameEl) nameEl.textContent = 'EMPEROR SHIELD';
  if (costEl) costEl.textContent = `${EMPEROR_SHIELD_COST} Gold / 10s · 남은 ${usesLeft}/${EMPEROR_SHIELD_MAX_USES}`;
}

function castEmperorShield() {
  if (state.mode !== 'playing') return;
  if (state.emperorShieldUses >= EMPEROR_SHIELD_MAX_USES) {
    flashBanner(`황제 보호막 사용 한도 도달 (${EMPEROR_SHIELD_MAX_USES}/${EMPEROR_SHIELD_MAX_USES})`, 0.75, true);
    sfx(160, 0.09, 'sawtooth', 0.022);
    return;
  }
  if (state.emperorShieldTimer > 0.001) {
    flashBanner('황제 보호막 활성 중', 0.45);
    sfx(500, 0.04, 'triangle', 0.013);
    return;
  }
  if (state.gold < EMPEROR_SHIELD_COST) {
    flashBanner(`Gold 부족 · ${EMPEROR_SHIELD_COST} 필요`, 0.6, true);
    sfx(180, 0.08, 'sawtooth', 0.022);
    return;
  }

  state.gold -= EMPEROR_SHIELD_COST;
  state.emperorShieldUses += 1;
  state.emperorShieldTimer = EMPEROR_SHIELD_DURATION;
  state.emperorShieldFx = Math.max(state.emperorShieldFx, 0.8);
  state.emperorShieldHitCooldown = 0;
  flashBanner(`황제 보호막 전개 · 10초 무적 (${state.emperorShieldUses}/${EMPEROR_SHIELD_MAX_USES})`, 0.95);
  impactSfx.play('build', { volume: 0.42, minGap: 0.08, rateMin: 0.88, rateMax: 0.95 });
  sfx(860, 0.12, 'triangle', 0.03);
  refreshHud();
}

function refreshBuildHint() {
  if (!buildHintEl) return;
  const footprint = state.sunkenFootprint === 2 ? '2x2' : '1x1';
  const sellState = state.sellMode ? 'ON' : 'OFF';
  const mobileTag = isMobileView ? '모바일 큰칸' : '일반';
  buildHintEl.textContent = `좌클릭 배치/업그레이드 · 우클릭 판매 · E 판매모드(${sellState}) · 1/2/3/4/5/6/7/8/9 선택 · Q 성큰크기(${footprint}) · R 황제보호막(1000/10초·최대5회) · ${mobileTag} · F +0.25x · G -0.25x`;
  refreshModeHelp();
  refreshTowerGuide();
}

function refreshModeHelp() {
  if (!modeHelpEl) return;
  modeHelpEl.innerHTML = `
    <div class="row"><span class="tag">AUDIO</span>BGM/SFX는 항상 ON으로 고정됩니다.</div>
    <div class="row"><span class="tag">SHIELD</span>R(또는 SHIELD 버튼)로 1000 Gold를 소모해 마지막 황제 보호막을 10초 전개합니다. (한 판 최대 5회)</div>
    <div class="row"><span class="tag">SPEED</span>F(+0.25x), G(-0.25x)로 웨이브 진행 속도를 조절할 수 있습니다.</div>
  `;
}

function buildTowerPerLevelChangeLine(kind) {
  const { rangeMul, damageMul, reloadMul } = getTowerUpgradeFactors(kind);
  const apsMul = 1 / reloadMul;

  const parts = [
    `피해 +${Math.round((damageMul - 1) * 100)}%`,
    `연사 +${Math.round((apsMul - 1) * 100)}%`,
    `사거리 +${Math.round((rangeMul - 1) * 100)}%`,
  ];

  if (kind === 'obelisk') {
    parts.push('관통 +1 (최대 3)');
  } else if (kind === 'sunkenSplash') {
    parts.push('스플래시 반경 +15%');
  } else if (kind === 'sunkenSlow') {
    parts.push('둔화시간 +12%');
    parts.push('둔화강도 강화');
  } else if (kind === 'snare') {
    parts.push('둔화시간 +13%');
    parts.push('둔화강도 강화');
    parts.push('약화 +9%p');
  } else if (kind === 'sunkenStun') {
    parts.push('스턴시간 +10%');
    parts.push('스턴반경 +6%');
    parts.push('스턴대상 +1 (Lv3/5/7)');
  }

  return parts.join(' · ');
}

function buildTowerUpgradeCostLine(baseCost) {
  const parts = [];
  for (let lv = 1; lv < MAX_TOWER_LEVEL; lv += 1) {
    const cost = upgradeCost({ level: lv, baseCost });
    parts.push(`Lv${lv}→${lv + 1} ${cost}`);
  }
  return parts.join(' · ');
}

function refreshTowerGuide() {
  if (!towerGuideEl) return;

  const tower = TOWER_TYPES[state.selectedTower];
  const placement = getPlacementSpec(state.selectedTower);
  if (!tower || !placement) {
    towerGuideEl.textContent = '';
    return;
  }

  const guide = TOWER_GUIDE_DETAILS[state.selectedTower] || {
    role: '전술 타워',
    summary: '현재 상황에 맞게 운용하세요.',
    tips: '',
  };

  const attacksPerSec = placement.reload > 0 ? (1 / placement.reload) : 0;
  const damagePerSec = placement.reload > 0 ? placement.damage / placement.reload : placement.damage;
  const badges = [
    `비용 ${placement.cost}`,
    `1발 피해 ${Math.round(placement.damage)}`,
    `초당 ${attacksPerSec.toFixed(2)}발`,
    `초당 피해 ${Math.round(damagePerSec)}`,
    `사거리 ${Math.round(placement.range / BALANCE_SCALE)}`,
    `최대 Lv${MAX_TOWER_LEVEL}`,
  ];

  if (placement.pierce > 0) badges.push(`관통 ${placement.pierce}`);
  if (placement.splashRadius > 0) badges.push(`스플래시 ${Math.round(placement.splashRadius / BALANCE_SCALE)}`);
  if (tower.snareDuration && tower.snareSlow) badges.push(`둔화 ${Math.round((1 - tower.snareSlow) * 100)}%`);
  if (tower.stunDuration && tower.stunChain) badges.push(`스턴 ${tower.stunChain}명`);

  const perLevelSummary = buildTowerPerLevelChangeLine(state.selectedTower);
  const upgradeCostSummary = buildTowerUpgradeCostLine(placement.cost);

  towerGuideEl.innerHTML = `
    <div class="line">
      <span class="name">${tower.name}</span>
      ${badges.map((label) => `<span class="badge">${label}</span>`).join('')}
    </div>
    <div class="meta">${guide.role}</div>
    <div class="desc">${guide.summary} ${guide.tips}</div>
    <div class="growth">레벨 +1당 변화: ${perLevelSummary}</div>
    <div class="growth">업그레이드 비용(+1): ${upgradeCostSummary}</div>
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
  if (tower.kind === 'snare' || tower.kind === 'sunkenSlow') {
    const refreshWindow = tower.kind === 'snare' ? 0.35 : 0.28;
    const unsnaredFast = fastestEnemyFiltered(
      tower.x,
      tower.y,
      tower.range,
      (enemy) => enemy.fast && enemy.snareTimer <= refreshWindow
    );
    if (unsnaredFast) return unsnaredFast;
    const unsnaredAny = fastestEnemyFiltered(
      tower.x,
      tower.y,
      tower.range,
      (enemy) => enemy.snareTimer <= refreshWindow
    );
    if (unsnaredAny) return unsnaredAny;
    return nearestEnemy(tower.x, tower.y, tower.range);
  }
  return nearestEnemy(tower.x, tower.y, tower.range);
}

function removeTower(tower) {
  const idx = state.towers.indexOf(tower);
  if (idx < 0) return false;
  state.towers.splice(idx, 1);
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

function emitNovaBurst(tower) {
  const burstCount = 8 + Math.floor((tower.level - 1) / 2) * 2;
  const spinOffset = performance.now() * 0.0018 + tower.id * 0.37;
  const perShotDamage = tower.damage * 0.55;

  for (let i = 0; i < burstCount; i += 1) {
    const ang = spinOffset + (i / burstCount) * TAU;
    state.bullets.push({
      x: tower.x,
      y: tower.y,
      vx: Math.cos(ang) * tower.bulletSpeed,
      vy: Math.sin(ang) * tower.bulletSpeed,
      r: 4.9,
      damage: perShotDamage,
      life: 1.6,
      color: tower.color,
      pierce: 0,
      towerKind: tower.kind,
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
    state.particles.push({
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

function emitBullet(tower, target) {
  if (tower.kind === 'sunkenNova') {
    emitNovaBurst(tower);
    return;
  }

  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const d = Math.hypot(dx, dy) || 1;
  const isSnare = tower.kind === 'snare';
  const isSlowSunken = tower.kind === 'sunkenSlow';
  const isSplashSunken = tower.kind === 'sunkenSplash';
  const isLongSunken = tower.kind === 'longSunken';
  const isNovaSunken = tower.kind === 'sunkenNova';
  const isStunSunken = tower.kind === 'sunkenStun';

  state.bullets.push({
    x: tower.x,
    y: tower.y,
    vx: (dx / d) * tower.bulletSpeed,
    vy: (dy / d) * tower.bulletSpeed,
    r: isSplashSunken ? 5.6 : (tower.kind === 'obelisk' || isLongSunken) ? 5.2 : (isSnare || isSlowSunken || isNovaSunken || isStunSunken) ? 4.8 : 4,
    damage: tower.damage,
    life: 2,
    color: tower.color,
    pierce: (isSnare || isSlowSunken || isNovaSunken || isStunSunken) ? 0 : tower.pierce,
    towerKind: tower.kind,
    splashRadius: isSplashSunken ? tower.splashRadius : 0,
    splashFalloff: isSplashSunken ? tower.splashFalloff : 0,
    snareDuration: tower.snareDuration,
    snareSlow: tower.snareSlow,
    weakenMul: tower.weakenMul,
    stunDuration: tower.stunDuration,
    stunChain: tower.stunChain,
    stunRadius: tower.stunRadius,
  });

  for (let i = 0; i < 3; i += 1) {
    state.particles.push({
      x: tower.x,
      y: tower.y,
      vx: rand(-80, 80),
      vy: rand(-80, 80),
      life: rand(0.08, 0.2),
      size: rand(1.8, 3.2),
      color: tower.color,
    });
  }

  if (tower.kind === 'sunken') {
    if (Math.random() < 0.4) sfx(330 + rand(-24, 18), 0.03, 'triangle', 0.011);
  } else if (tower.kind === 'longSunken') {
    impactSfx.play('enemyHitHeavy', { volume: 0.32, minGap: 0.06, rateMin: 0.88, rateMax: 0.97 });
    if (Math.random() < 0.5) sfx(214 + rand(-14, 12), 0.055, 'sawtooth', 0.012);
  } else if (tower.kind === 'sunkenSplash') {
    impactSfx.play('enemyHitHeavy', { volume: 0.26, minGap: 0.08, rateMin: 0.95, rateMax: 1.03 });
    if (Math.random() < 0.6) sfx(290 + rand(-18, 14), 0.04, 'square', 0.012);
  } else if (tower.kind === 'sunkenSlow') {
    impactSfx.play('enemyHit', { volume: 0.23, minGap: 0.045, rateMin: 0.92, rateMax: 1.02 });
    if (Math.random() < 0.55) sfx(258 + rand(-14, 14), 0.035, 'sine', 0.011);
  } else if (tower.kind === 'sunkenNova') {
    impactSfx.play('enemyHit', { volume: 0.26, minGap: 0.05, rateMin: 1.0, rateMax: 1.11 });
    if (Math.random() < 0.52) sfx(352 + rand(-20, 20), 0.04, 'square', 0.012);
  } else if (tower.kind === 'sunkenStun') {
    impactSfx.play('enemyHitHeavy', { volume: 0.28, minGap: 0.05, rateMin: 0.96, rateMax: 1.05 });
    if (Math.random() < 0.58) sfx(316 + rand(-20, 18), 0.04, 'square', 0.012);
  } else if (Math.random() < 0.35) {
    sfx(430 + rand(-26, 28), 0.03, 'square', 0.01);
  }
}

function hurtEnemy(enemy, damage, sourceKind = '', secondary = false) {
  const weakenDamage = enemy.weakenTimer > 0 ? enemy.weakenMul : 1;
  const rushDamage = enemy.fast ? 1 + state.rushDamageBonus : 1;
  enemy.hp -= damage * weakenDamage * rushDamage;
  enemy.vx += rand(-16, 16);
  enemy.vy += rand(-16, 16);

  for (let i = 0; i < 4; i += 1) {
    state.particles.push({
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
  } else if (sourceKind === 'longSunken') {
    impactSfx.play('enemyHitHeavy', {
      volume: 0.38,
      minGap: 0.06,
      rateMin: 0.84,
      rateMax: 0.96,
    });
    if (!secondary && Math.random() < 0.42) sfx(208 + rand(-16, 14), 0.05, 'sawtooth', 0.012);
  } else if (sourceKind === 'sunkenSplash') {
    impactSfx.play('enemyHit', {
      volume: 0.3,
      minGap: 0.05,
      rateMin: 0.93,
      rateMax: 1.02,
    });
    if (!secondary && Math.random() < 0.5) sfx(270 + rand(-16, 14), 0.04, 'square', 0.012);
  } else if (sourceKind === 'spine') {
    impactSfx.play('enemyHit', {
      volume: 0.24,
      minGap: 0.03,
      rateMin: 1.02,
      rateMax: 1.16,
    });
    if (!secondary && Math.random() < 0.55) sfx(468 + rand(-34, 30), 0.03, 'triangle', 0.009);
  } else if (sourceKind === 'obelisk') {
    impactSfx.play('enemyHitHeavy', {
      volume: 0.34,
      minGap: 0.055,
      rateMin: 0.86,
      rateMax: 0.95,
    });
    if (!secondary && Math.random() < 0.42) sfx(206 + rand(-18, 14), 0.05, 'sawtooth', 0.012);
  } else if (sourceKind === 'snare') {
    impactSfx.play('enemyHit', { volume: 0.24, minGap: 0.05, rateMin: 0.96, rateMax: 1.05 });
    if (!secondary && Math.random() < 0.28) sfx(248 + rand(-18, 16), 0.04, 'sine', 0.01);
  } else if (sourceKind === 'sunkenSlow') {
    impactSfx.play('enemyHit', {
      volume: 0.25,
      minGap: 0.045,
      rateMin: 0.9,
      rateMax: 1.01,
    });
    if (!secondary && Math.random() < 0.35) sfx(232 + rand(-16, 12), 0.04, 'triangle', 0.011);
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
  const push = (p) => {
    const life = p.life ?? 0.18;
    state.particles.push({
      ...p,
      life,
      ttl: p.ttl || life,
    });
  };

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

  if (towerKind === 'longSunken') {
    const burstCount = secondary ? 3 : 6;
    for (let i = 0; i < burstCount; i += 1) {
      const ang = rand(0, TAU);
      const speed = rand(100, 240);
      push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: rand(0.12, 0.24),
        size: rand(2, 3.6),
        color: '#a7c8ff',
      });
    }
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.11 : 0.22,
      size: secondary ? 5.2 : 7.4,
      expand: secondary ? 9 : 17,
      lineWidth: 2,
      color: '#78a6ff',
      render: 'ring',
    });
    return;
  }

  if (towerKind === 'spine') {
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

  if (towerKind === 'sunkenSlow') {
    push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: secondary ? 0.11 : 0.18,
      size: secondary ? 4.8 : 6.8,
      expand: secondary ? 8 : 14,
      lineWidth: 1.8,
      color: '#90f4d2',
      render: 'ring',
    });
    const shardCount = secondary ? 2 : 5;
    for (let i = 0; i < shardCount; i += 1) {
      const ang = rand(0, TAU);
      const speed = rand(90, 170);
      push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: rand(0.1, 0.2),
        size: rand(1.6, 2.8),
        color: '#97ffe2',
      });
    }
  }
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const target = pickTowerTarget(tower);
    if (!target) continue;

    emitBullet(tower, target);
    tower.cooldown = tower.reload;
  }
}

function applyStunChain(primaryEnemy, bullet) {
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
    victim.stunTimer = Math.max(victim.stunTimer || 0, stunDuration);
    victim.stunFx = Math.max(victim.stunFx || 0, 0.45);
    spawnTowerHitVfx(victim.x, victim.y, 'sunkenStun', false, i > 0);
  }
}

function updateBullets(dt) {
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
    for (const enemy of state.enemies) {
      const dx = enemy.x - b.x;
      const dy = enemy.y - b.y;
      const rr = enemy.r + b.r;
      if (dx * dx + dy * dy > rr * rr) continue;

      if (b.towerKind === 'sunkenStun') {
        applyStunChain(enemy, b);
        hurtEnemy(enemy, b.damage, b.towerKind, false);
        if (Math.random() < 0.08) flashBanner('Stun 연쇄 고정', 0.42);
        state.bullets.splice(i, 1);
        removed = true;
      } else if (b.towerKind === 'snare' || b.towerKind === 'sunkenSlow') {
        const snareDuration = b.snareDuration || (b.towerKind === 'sunkenSlow' ? 1.25 : 2);
        const snareSlow = b.snareSlow || (b.towerKind === 'sunkenSlow' ? 0.66 : 0.55);
        enemy.snareTimer = Math.max(enemy.snareTimer, snareDuration);
        enemy.snareSlowMul = Math.min(enemy.snareSlowMul, snareSlow);
        enemy.slowSource = b.towerKind;
        if (b.towerKind === 'sunkenSlow') {
          enemy.slowHitFx = Math.max(enemy.slowHitFx, 0.45);
        }
        if (b.towerKind === 'snare') {
          enemy.weakenTimer = Math.max(enemy.weakenTimer, snareDuration + 0.6);
          enemy.weakenMul = Math.max(enemy.weakenMul, b.weakenMul || 1.25);
        }
        spawnTowerHitVfx(enemy.x, enemy.y, b.towerKind, false, false);
        const damage = b.towerKind === 'snare' ? b.damage * 0.55 : b.damage;
        hurtEnemy(enemy, damage, b.towerKind, false);
        if (b.towerKind === 'snare' && Math.random() < 0.28) flashBanner('Snare: 둔화/약화', 0.45);
        state.bullets.splice(i, 1);
        removed = true;
      } else {
        spawnTowerHitVfx(enemy.x, enemy.y, b.towerKind, false, false);
        if (b.towerKind === 'sunken') {
          for (let p = 0; p < 4; p += 1) {
            const ang = rand(0, TAU);
            const dist = rand(2, 8);
            state.particles.push({
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
          for (const other of [...state.enemies]) {
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
            hurtEnemy(other, splashDamage, b.towerKind, true);
          }

          for (let p = 0; p < 8; p += 1) {
            const ang = rand(0, TAU);
            const dist = rand(4, splashRadius * 0.45);
            state.particles.push({
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
  const nightmareIndex = Math.max(0, s - 20);
  // 전체 몹 이동속도는 스테이지 상승에 따라 "조금씩" 누적 상승한다.
  return 1 + stageIndex * 0.008 + nightmareIndex * 0.014;
}

function updateEnemy(enemy, dt) {
  enemy.repath -= dt;
  enemy.snareTimer = Math.max(0, enemy.snareTimer - dt);
  enemy.slowHitFx = Math.max(0, (enemy.slowHitFx || 0) - dt);
  enemy.weakenTimer = Math.max(0, enemy.weakenTimer - dt);
  enemy.stunTimer = Math.max(0, (enemy.stunTimer || 0) - dt);
  enemy.stunFx = Math.max(0, (enemy.stunFx || 0) - dt);
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

  const speed = enemy.speed * stageMoveSpeedMultiplier(state.stage) * (enemy.snareTimer > 0 ? enemy.snareSlowMul : 1);

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
  keepEnemyInPassableCell(prevX, prevY);

  const goalCenter = cellCenter(GOAL.c, GOAL.r);
  if (Math.hypot(enemy.x - goalCenter.x, enemy.y - goalCenter.y) < GRID.cell * 0.38) {
    const idx = state.enemies.indexOf(enemy);
    if (idx >= 0) state.enemies.splice(idx, 1);
    if (state.emperorShieldTimer > 0.001) {
      state.emperorShieldFx = Math.max(state.emperorShieldFx, 0.62);
      if (state.emperorShieldHitCooldown <= 0) {
        flashBanner('황제 보호막이 공격을 흡수함', 0.45);
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
  const type = state.spawnQueue.shift();
  if (!type) return;
  const enemy = makeEnemy(type);
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const aroundSpawn = state.enemies.filter((e) => (
    Math.abs(e.x - spawn.x) < GRID.cell * 2.7
    && Math.abs(e.y - spawn.y) < GRID.cell * 1.8
  )).length;
  const lane = state.spawnSerial % 5;
  const yBands = [0, 0, 0, 0, 0];
  const spacing = enemy.r * 2.3 + 6;
  enemy.x = spawn.x - aroundSpawn * spacing;
  enemy.y = spawn.y + yBands[lane] * (enemy.r * 1.1 + 2);
  state.spawnSerial += 1;
  state.enemies.push(enemy);
  if (type === 'lord') {
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
    const spawnDelay = Math.max(0.038, 0.4 - earlyStage * 0.02 - lateIndex * 0.011 - nightmareIndex * 0.006);
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

  // 중앙 전투 라인(진흙길 + 전차 궤도)로 "전장" 인상을 강화.
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

  // 흙 얼룩/잔해 텍스처
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

  // 전장 분화구
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

  // 참호 라인
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

  // 상단/하단 철조망 느낌
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

  // 실시간 연기/포연 레이어
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

  // 그림자/바닥
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

  // 외곽 링
  ctx.strokeStyle = `rgba(255, 204, 148, ${0.52 + pulse * 0.3})`;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.arc(0, 1, 15.5 + pulse * 0.8, 0, TAU);
  ctx.stroke();

  // 요새 본체
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

  // 좌우 타워
  ctx.fillStyle = '#9f6c46';
  ctx.fillRect(-13.8, -5.5, 3.6, 9.8);
  ctx.fillRect(10.2, -5.5, 3.6, 9.8);
  ctx.fillStyle = '#d7aa73';
  ctx.fillRect(-14.6, -7.2, 5.2, 2.5);
  ctx.fillRect(9.4, -7.2, 5.2, 2.5);

  // 중앙 코어
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

  // 왕관 장식
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

  // 내구 인디케이터(텍스트 대신 5칸)
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
  const isSlow = tower.kind === 'sunkenSlow';
  const isLong = tower.kind === 'longSunken';
  const isNova = tower.kind === 'sunkenNova';
  const isStun = tower.kind === 'sunkenStun';
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
    : isSlow
      ? `rgba(145, 244, 214, ${0.34 + pulse * 0.24})`
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
  } else if (isSlow) {
    aura.addColorStop(0, 'rgba(203, 255, 239, 0.44)');
    aura.addColorStop(0.58, 'rgba(130, 234, 199, 0.24)');
    aura.addColorStop(1, 'rgba(49, 126, 112, 0)');
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
  } else if (isSlow) {
    vortex.addColorStop(0, '#c9ffe9');
    vortex.addColorStop(0.65, '#4fba95');
    vortex.addColorStop(1, '#113a2f');
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
    : isSlow
      ? 'rgba(201, 255, 238, 0.65)'
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
      : isSlow
        ? 'rgba(194, 255, 236, 0.84)'
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
    : isSlow
      ? 'rgba(191, 255, 229, 0.78)'
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

  if (tower.level >= 3) {
    ctx.strokeStyle = isSplash
      ? `rgba(255, 190, 115, ${0.66 + pulse * 0.2})`
      : isLong
        ? `rgba(133, 182, 255, ${0.66 + pulse * 0.2})`
      : isNova
        ? `rgba(188, 146, 255, ${0.66 + pulse * 0.2})`
      : isStun
        ? `rgba(255, 204, 99, ${0.66 + pulse * 0.2})`
      : isSlow
        ? `rgba(135, 248, 209, ${0.66 + pulse * 0.2})`
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

  if (isSplash || isSlow || isLong || isNova || isStun) {
    ctx.strokeStyle = isSplash
      ? `rgba(255, 169, 86, ${0.52 + pulse * 0.24})`
      : isLong
        ? `rgba(118, 170, 255, ${0.52 + pulse * 0.24})`
      : isNova
        ? `rgba(169, 117, 255, ${0.52 + pulse * 0.24})`
      : isStun
        ? `rgba(255, 195, 74, ${0.52 + pulse * 0.24})`
      : `rgba(92, 246, 208, ${0.52 + pulse * 0.24})`;
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
      ? 'rgba(141, 217, 255, 0.8)'
      : tower.kind === 'longSunken'
        ? 'rgba(143, 185, 255, 0.92)'
      : tower.kind === 'sunkenNova'
        ? 'rgba(198, 155, 255, 0.9)'
      : tower.kind === 'sunkenStun'
        ? 'rgba(255, 217, 106, 0.9)'
      : tower.kind === 'sunkenSlow'
        ? 'rgba(145, 244, 214, 0.88)'
      : tower.kind === 'sunkenSplash'
        ? 'rgba(255, 159, 111, 0.9)'
        : tower.kind === 'spine'
          ? 'rgba(185, 232, 172, 0.8)'
          : tower.kind === 'obelisk'
            ? 'rgba(226, 177, 255, 0.85)'
            : 'rgba(154, 232, 255, 0.88)';
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    if (
      tower.kind === 'sunken'
      || tower.kind === 'sunkenSplash'
      || tower.kind === 'sunkenSlow'
      || tower.kind === 'longSunken'
      || tower.kind === 'sunkenNova'
      || tower.kind === 'sunkenStun'
    ) {
      drawTowerSunken(tower, now);
    } else if (tower.kind === 'spine') {
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
      ctx.fillStyle = '#e8f2ff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`L${tower.level}`, tower.x - 7, tower.y + 18 + (footprint - 1) * 4);
    }
  }
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
  const sizeMul = enemy.boss ? 3.0 : 2.65;
  const size = enemy.r * sizeMul;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(ang);
  if (enemy.snareTimer > 0) {
    ctx.globalAlpha = enemy.slowSource === 'sunkenSlow' ? 0.76 : 0.84;
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
      const isSlowSunken = enemy.slowSource === 'sunkenSlow';
      ctx.strokeStyle = isSlowSunken
        ? `rgba(141, 255, 221, ${0.72 + slowIntensity * 0.35})`
        : 'rgba(155, 241, 255, 0.85)';
      ctx.lineWidth = isSlowSunken ? 2.2 : 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 6, 0, TAU);
      ctx.stroke();

      if (isSlowSunken) {
        const velLen = Math.hypot(enemy.vx, enemy.vy) || 1;
        const nx = enemy.vx / velLen;
        const ny = enemy.vy / velLen;
        const trailLen = 8 + slowIntensity * 18;
        ctx.strokeStyle = `rgba(171, 255, 230, ${0.32 + slowIntensity * 0.45})`;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i += 1) {
          const sideJitter = Math.sin(now * 8.5 + enemy.morph + i * 1.3) * (1.1 + i * 0.4);
          const ox = -ny * sideJitter;
          const oy = nx * sideJitter;
          const back = enemy.r * 0.25 + i * 4.2;
          const sx = enemy.x - nx * back + ox;
          const sy = enemy.y - ny * back + oy;
          const ex = sx - nx * (trailLen + i * 2.8);
          const ey = sy - ny * (trailLen + i * 2.8);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        ctx.save();
        ctx.setLineDash([4, 5]);
        ctx.lineDashOffset = -(now * 26 + enemy.morph * 5);
        ctx.strokeStyle = `rgba(132, 248, 211, ${0.4 + slowIntensity * 0.42})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 9 + Math.sin(now * 5 + enemy.morph) * 1.4, 0, TAU);
        ctx.stroke();
        ctx.restore();

        if (enemy.slowHitFx > 0.001) {
          const hitRatio = clamp(enemy.slowHitFx / 0.45, 0, 1);
          ctx.strokeStyle = `rgba(201, 255, 236, ${0.24 + hitRatio * 0.5})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.r + 10 + (1 - hitRatio) * 6, 0, TAU);
          ctx.stroke();
        }
      }
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
  drawBackground();
  drawGrid();
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

  const simDt = dt * state.simSpeed;

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
  if (event.code === 'Digit2') chooseTower('sunkenSlow');
  if (event.code === 'Digit3') chooseTower('longSunken');
  if (event.code === 'Digit4') chooseTower('sunkenSplash');
  if (event.code === 'Digit5') chooseTower('spine');
  if (event.code === 'Digit6') chooseTower('obelisk');
  if (event.code === 'Digit7') chooseTower('snare');
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

  if (event.code === 'KeyF') {
    changeSimSpeed(0.25);
  }

  if (event.code === 'KeyG') {
    changeSimSpeed(-0.25);
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
  if (action === 'start' || action === 'restart') startRun();
});

function showMenu() {
  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.remove('reward-mode');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Sunken Sixway Defense</h2>
      <p>건물을 배치해 길을 유도하고, 몰려오는 웨이브를 Stage ${state.maxStage}까지 막아내세요.</p>
      <div class="actions">
        <button type="button" data-action="start">시작</button>
      </div>
    </div>
  `;
}

showMenu();
setSelectedButton();
setSellMode(false);
refreshBuildHint();
buildDistanceMap();
refreshHud();
initSingleRank();
loadEnemySprites();
requestAnimationFrame(frame);
