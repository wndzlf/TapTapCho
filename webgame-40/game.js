const hudEl = document.getElementById('hud');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlayEl = document.getElementById('overlay');
const controlsEl = document.getElementById('controls');

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
const rankRefreshEl = document.getElementById('rankRefresh');
const rankListEl = document.getElementById('rankList');
const rankScopeEl = document.getElementById('rankScope');
const rankStatusEl = document.getElementById('rankStatus');

const btnSunken = document.getElementById('btnSunken');
const btnSpine = document.getElementById('btnSpine');
const btnObelisk = document.getElementById('btnObelisk');
const btnSnare = document.getElementById('btnSnare');
const btnSellMode = document.getElementById('btnSellMode');
const btnSpeedUp = document.getElementById('btnSpeedUp');
const btnUltSunken = document.getElementById('btnUltSunken');

const bgmAudio = window.TapTapNeonAudio?.create('webgame-40', hudEl, {
  theme: 'rush',
  mediaSrc: '../assets/audio/battleThemeA.mp3',
  showThemeToggle: false,
});

const ENEMY_TANK_SOURCES = {
  ghoul: '../assets/kenney_tanks/png/tanks_tankGreen1.png',
  bat: '../assets/kenney_tanks/png/tanks_tankGrey1.png',
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
  ultReady: [
    '../assets/audio/kenney_impact/impactBell_heavy_001.ogg',
    '../assets/audio/kenney_impact/impactBell_heavy_002.ogg',
  ],
  ultPlace: [
    '../assets/audio/kenney_impact/impactBell_heavy_003.ogg',
    '../assets/audio/kenney_impact/impactBell_heavy_004.ogg',
  ],
  ultShot: [
    '../assets/audio/kenney_impact/impactBell_heavy_000.ogg',
    '../assets/audio/kenney_impact/impactBell_heavy_002.ogg',
  ],
};

function isSfxEnabled() {
  try {
    const raw = localStorage.getItem('taptapcho_neon_audio_v1');
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed?.sfx !== false;
  } catch (_) {
    return true;
  }
}

function readAudioFlags() {
  try {
    const raw = localStorage.getItem('taptapcho_neon_audio_v1');
    if (!raw) return { bgm: true, sfx: true };
    const parsed = JSON.parse(raw);
    return {
      bgm: parsed?.bgm !== false,
      sfx: parsed?.sfx !== false,
    };
  } catch (_) {
    return { bgm: true, sfx: true };
  }
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
  canvas.height = 1280;
} else {
  canvas.width = 960;
  canvas.height = 540;
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

const TOWER_TYPES = {
  sunken: {
    id: 'sunken',
    name: 'Sunken',
    cost: 40,
    color: '#8dd9ff',
    range: 96 * BALANCE_SCALE,
    damage: 24,
    reload: 0.55,
    bulletSpeed: 360 * BALANCE_SCALE,
    pierce: 0,
    hp: 250,
  },
  sunkenSplash: {
    id: 'sunkenSplash',
    name: 'Splash Sunken',
    cost: 130,
    color: '#ffc184',
    range: 114 * BALANCE_SCALE,
    damage: 36,
    reload: 0.9,
    bulletSpeed: 320 * BALANCE_SCALE,
    pierce: 0,
    hp: 290,
    splashRadius: 66 * BALANCE_SCALE,
    splashFalloff: 0.42,
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
  snare: {
    role: '디버프/제어',
    summary: '공성몹 둔화와 약화 디버프를 걸어 다른 타워 딜을 증폭.',
    tips: 'Snare 단독 화력은 낮으므로 딜 타워와 반드시 함께 운용.',
  },
};

const state = {
  mode: 'menu',
  stage: 1,
  maxStage: 20,
  baseHp: 20,
  gold: 160,
  kills: 0,
  score: 0,
  selectedTower: 'sunken',
  sunkenFootprint: 1,
  ultSunkenCharges: 0,
  ultSunkenArmed: false,
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
  towerHpBonus: 0,
  siegeDamageBonus: 0,
  pendingStage: 0,
  pendingStageBonusGold: 0,
  banner: { text: '', ttl: 0, warn: false },
};

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

function normalizeRankName(raw) {
  const name = String(raw || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 14);
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
    const playerName = normalizeRankName(parsed.playerName || '');
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

function applyRankNameFromInput() {
  if (!rankNameEl) return;
  const normalized = normalizeRankName(rankNameEl.value);
  rankNameEl.value = normalized;
  singleRankState.playerName = normalized;
  saveRankProfile();

  if (singleRankState.connected && singleRankState.ws && singleRankState.ws.readyState === WebSocket.OPEN) {
    singleRankState.ws.send(JSON.stringify({
      type: 'set_identity',
      playerId: singleRankState.playerId,
      name: singleRankState.playerName,
    }));
  }
}

function openRankSocket(force = false) {
  if (!rankListEl) return;
  if (singleRankState.connected) return;
  if (singleRankState.connectTried && !force) return;
  singleRankState.connectTried = true;

  const url = singleRankState.serverUrl || defaultRankServerUrl();
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
    saveRankProfile();
    setRankScope('ONLINE');
    setRankStatus('온라인 랭킹 연결됨');

    ws.send(JSON.stringify({
      type: 'set_identity',
      playerId: singleRankState.playerId,
      name: singleRankState.playerName,
    }));
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
  singleRankState.playerName = profile.playerName || normalizeRankName('');
  singleRankState.serverUrl = profile.serverUrl || savedServerUrl || defaultRankServerUrl();
  singleRankState.localRows = loadLocalRankRows();

  if (rankNameEl) {
    rankNameEl.value = singleRankState.playerName;
    rankNameEl.addEventListener('change', applyRankNameFromInput);
    rankNameEl.addEventListener('blur', applyRankNameFromInput);
    rankNameEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        applyRankNameFromInput();
        rankNameEl.blur();
      }
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

  saveRankProfile();
  setRankScope('LOCAL');
  setRankStatus('로컬 랭킹 준비 완료');
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

  if (kind === 'sunken' && state.ultSunkenArmed && state.ultSunkenCharges > 0) {
    return {
      kind,
      footprint: 1,
      cost: 0,
      range: base.range * 2.2,
      damage: base.damage * 3.35,
      reload: base.reload * 0.58,
      bulletSpeed: base.bulletSpeed * 1.24,
      pierce: 3,
      hp: base.hp * 4.6,
      color: '#ffd77a',
      splashRadius: 0,
      splashFalloff: 0,
      ultimate: true,
    };
  }

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
      ultimate: false,
    };
  }

  return {
    kind,
    footprint: 1,
    cost: base.cost,
    range: base.range,
    damage: base.damage,
    reload: base.reload,
    bulletSpeed: base.bulletSpeed,
    pierce: base.pierce,
    hp: base.hp,
    color: base.color,
    splashRadius: base.splashRadius || 0,
    splashFalloff: base.splashFalloff || 0,
    ultimate: false,
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

function buildDistanceMap() {
  const size = GRID.cols * GRID.rows;
  const dist = Array(size).fill(Infinity);
  const q = new Int32Array(size);
  let head = 0;
  let tail = 0;

  const goalIdx = toIndex(GOAL.c, GOAL.r);
  dist[goalIdx] = 0;
  q[tail++] = goalIdx;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (head < tail) {
    const idx = q[head++];
    const c = idx % GRID.cols;
    const r = Math.floor(idx / GRID.cols);
    const d = dist[idx] + 1;

    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (!passable(nc, nr)) continue;
      const nIdx = toIndex(nc, nr);
      if (dist[nIdx] <= d) continue;
      dist[nIdx] = d;
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

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

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

  return { c: bestC, r: bestR, valid: Number.isFinite(best) };
}

function flashBanner(text, ttl = 1.2, warn = false) {
  if (isMobileView && state.mode === 'playing') {
    const noisyCombatBanner = (
      text.startsWith('BASE -')
      || text.includes('공성 몹이 건물 공격 중')
      || text.includes('DESTROYED')
      || text.includes('봉인 시전')
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
    ultimate: Boolean(placement.ultimate),
    sealTimer: 0,
    snareDuration: base.snareDuration || 0,
    snareSlow: base.snareSlow || 1,
    weakenMul: base.weakenMul || 1,
  };
}

function upgradeCost(tower) {
  const base = tower.baseCost || TOWER_TYPES[tower.kind].cost;
  return Math.floor(base * (0.85 + tower.level * 0.75));
}

function upgradeTower(tower) {
  if (tower.level >= 3) return false;
  const cost = upgradeCost(tower);
  if (state.gold < cost) {
    flashBanner('Gold 부족', 0.9, true);
    return false;
  }

  const rangeMul = tower.kind === 'sunken'
    ? 1.24
    : tower.kind === 'sunkenSplash'
      ? 1.18
    : tower.kind === 'spine'
      ? 1.16
      : tower.kind === 'obelisk'
        ? 1.15
        : 1.2;

  const damageMul = tower.kind === 'snare'
    ? 1.26
    : tower.kind === 'sunkenSplash'
      ? 1.3
      : 1.34;
  const reloadMul = tower.kind === 'sunken'
    ? 0.88
    : tower.kind === 'sunkenSplash'
      ? 0.92
      : 0.9;

  state.gold -= cost;
  tower.level += 1;
  tower.spent += cost;
  tower.range *= rangeMul;
  tower.damage *= damageMul;
  tower.reload *= reloadMul;
  tower.pierce = Math.min(3, tower.pierce + (tower.kind === 'obelisk' ? 1 : 0));
  if (tower.kind === 'snare') {
    tower.snareDuration *= 1.13;
    tower.snareSlow = Math.max(0.32, tower.snareSlow * 0.93);
    tower.weakenMul += 0.09;
    tower.pierce = 0;
  } else if (tower.kind === 'sunkenSplash') {
    tower.splashRadius *= 1.15;
    tower.splashFalloff = clamp(tower.splashFalloff + 0.05, 0.3, 0.68);
  }
  tower.maxHp *= 1.34;
  tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.25);

  const rangePercent = Math.round((rangeMul - 1) * 100);
  flashBanner(`UPGRADE Lv.${tower.level} · RANGE +${rangePercent}%`, 0.75);
  sfx(620, 0.07, 'triangle', 0.022);
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

  if (placement.ultimate) {
    state.ultSunkenCharges = Math.max(0, state.ultSunkenCharges - 1);
    if (state.ultSunkenCharges <= 0) state.ultSunkenArmed = false;
    flashBanner('ULT SUNKEN DEPLOY', 0.9);
    impactSfx.play('ultPlace', { volume: 0.44, minGap: 0.12, rateMin: 0.95, rateMax: 1.02 });
  } else {
    impactSfx.play('build', { volume: 0.28, minGap: 0.045, rateMin: 0.96, rateMax: 1.04 });
  }

  for (const enemy of state.enemies) {
    enemy.repath = 0;
  }
  refreshUltButton();
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
  // Stage 11~20 구간에서 폭증하던 배율을 완만하게 눌러 난이도 붕괴를 줄인다.
  const stageSpeedMul = 1 + earlyStageIndex * 0.12 + lateIndex * 0.07 + lateIndex * lateIndex * 0.0025;
  const stageHpMul = 1 + earlyStageIndex * 0.2 + earlyStageIndex * earlyStageIndex * 0.013 + lateIndex * 0.13 + lateIndex * lateIndex * 0.006;
  const radiusMul = 1 + stageIndex * 0.022;
  const threatBase = clamp(0.18 + s * 0.07, 0.2, 0.92);
  const typeThreat = {
    ghoul: 0.02,
    bat: 0.06,
    brute: 0.12,
    elder: 0.18,
    raider: 0.26,
    crusher: 0.32,
    lord: 0.3,
  };
  const defs = {
    ghoul: { hp: (58 + s * 12) * stageHpMul * 1.0, speed: (36 + s * 1.6) * stageSpeedMul, reward: 7, leak: 1, r: 10, color: '#c54f72' },
    bat: { hp: (36 + s * 8) * stageHpMul * 0.82, speed: (58 + s * 2.4) * stageSpeedMul, reward: 6, leak: 1, r: 8, color: '#d07ab4' },
    brute: { hp: (150 + s * 28) * stageHpMul * 1.18, speed: (29 + s * 1.3) * stageSpeedMul, reward: 12, leak: 2, r: 13, color: '#9e5a9c' },
    elder: { hp: (262 + s * 46) * stageHpMul * 1.32, speed: (37 + s * 1.5) * stageSpeedMul, reward: 25, leak: 3, r: 15, color: '#b86ec8' },
    raider: {
      hp: (120 + s * 24) * stageHpMul * 1.05,
      speed: (42 + s * 1.5) * stageSpeedMul,
      reward: 17,
      leak: 2,
      r: 12,
      color: '#ff9d7f',
      breaker: true,
      towerDamage: 24 + s * 6 + lateIndex * 3,
      attackInterval: 0.95,
      attackRange: 22,
    },
    crusher: {
      hp: (260 + s * 44) * stageHpMul * 1.28,
      speed: (30 + s * 1.1) * stageSpeedMul,
      reward: 28,
      leak: 3,
      r: 15,
      color: '#ffc17c',
      breaker: true,
      towerDamage: 46 + s * 9 + lateIndex * 5,
      attackInterval: 1.28,
      attackRange: 26,
    },
    lord: { hp: (700 + s * 140) * stageHpMul * 1.65, speed: (27 + s) * stageSpeedMul, reward: 58, leak: 5, r: 18, color: '#f26a84', boss: true },
  };
  const d = defs[type];
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const threat = clamp(threatBase + (typeThreat[type] || 0), 0.2, 1.2);
  const leakBonus = s >= 18 ? 3 : s >= 14 ? 2 : s >= 10 ? 1 : s >= 6 ? 1 : 0;
  const leak = d.leak + (d.boss ? leakBonus : Math.floor(leakBonus * 0.5));

  return {
    type,
    x: spawn.x,
    y: spawn.y,
    r: d.r * radiusMul * BALANCE_SCALE,
    hp: Math.floor(d.hp),
    maxHp: Math.floor(d.hp),
    speed: d.speed * BALANCE_SCALE,
    reward: d.reward + Math.floor(s * 1.3),
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
    breaker: Boolean(d.breaker),
    towerDamage: d.towerDamage || 0,
    attackInterval: Math.max(0.52, (d.attackInterval || 1) - s * 0.006 - lateIndex * 0.007),
    attackRange: (d.attackRange || 0) * BALANCE_SCALE,
    attackCd: rand(0.1, 0.6),
    targetTowerId: 0,
    snareTimer: 0,
    snareSlowMul: 1,
    weakenTimer: 0,
    weakenMul: 1,
    sealCd: d.boss ? Math.max(3.4, 6.8 - s * 0.11) : 0,
    sealInterval: d.boss ? Math.max(3.8, 7.5 - s * 0.12) : 0,
    sealDuration: d.boss ? Math.min(5.4, 1.8 + s * 0.11) : 0,
    sealCount: d.boss ? (s >= 18 ? 3 : s >= 12 ? 2 : 1) : 0,
  };
}

function makeStageQueue(stage) {
  const queue = [];
  const earlyStage = Math.min(stage, 10);
  const lateIndex = Math.max(0, stage - 10);
  const baseCount = 22 + earlyStage * 9 + Math.floor(Math.pow(earlyStage, 1.35) * 3) + lateIndex * 4 + Math.floor(lateIndex * lateIndex * 0.8);

  for (let i = 0; i < baseCount; i += 1) {
    const roll = Math.random();
    let type = 'ghoul';
    const batChance = stage >= 3 ? clamp(0.22 + stage * 0.004, 0.22, 0.34) : 0;
    const bruteChance = stage >= 4 ? clamp(0.14 + stage * 0.01, 0.14, 0.34) : 0;
    const elderChance = stage >= 7 ? clamp(0.08 + (stage - 7) * 0.014, 0.08, 0.32) : 0;
    const raiderChance = stage >= 5 ? clamp(0.1 + (stage - 5) * 0.012, 0.1, 0.3) : 0;
    const crusherChance = stage >= 8 ? clamp(0.06 + (stage - 8) * 0.011, 0.06, 0.24) : 0;

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
          else if (roll < threshold + batChance) type = 'bat';
        }
      }
    }
    queue.push(type);
  }

  const elderCount = 1 + Math.floor(stage * 0.75) + Math.floor(lateIndex * 0.4);
  for (let i = 0; i < elderCount; i += 1) {
    const pos = Math.floor(queue.length * (0.25 + Math.random() * 0.55));
    queue.splice(pos, 0, 'elder');
  }

  const bruteCount = Math.max(0, stage - 4) + Math.floor(lateIndex * 0.6);
  for (let i = 0; i < bruteCount; i += 1) {
    const pos = Math.floor(queue.length * (0.2 + Math.random() * 0.6));
    queue.splice(pos, 0, 'brute');
  }

  if (stage >= 8) {
    const surgePos = Math.floor(queue.length * 0.72);
    if (stage <= 12) {
      queue.splice(surgePos, 0, 'elder', 'elder', 'crusher');
    } else {
      queue.splice(surgePos, 0, 'elder', 'brute', Math.random() < 0.55 ? 'crusher' : 'raider');
    }
  }

  if (stage >= 6) {
    const breakerCount = 1 + Math.floor(stage * 0.46) + Math.floor(lateIndex * 0.38);
    const crusherPickChance = clamp(0.32 + lateIndex * 0.01, 0.32, 0.44);
    for (let i = 0; i < breakerCount; i += 1) {
      const pos = Math.floor(queue.length * (0.28 + Math.random() * 0.5));
      queue.splice(pos, 0, stage >= 8 && Math.random() < crusherPickChance ? 'crusher' : 'raider');
    }
  }

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
  state.ultSunkenCharges = 0;
  state.ultSunkenArmed = false;
  state.sellMode = false;
  state.towerHpBonus = 0;
  state.siegeDamageBonus = 0;
  state.pendingStage = 0;
  state.pendingStageBonusGold = 0;
  setSelectedButton();
  refreshUltButton();
  setSellMode(false);
  refreshBuildHint();

  buildDistanceMap();
  startStage(1);

  overlayEl.classList.add('hidden');
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
  const clearGold = 70 + state.stage * 14;
  state.pendingStage = state.stage + 1;
  state.pendingStageBonusGold = clearGold;
  state.gold += clearGold;
  state.mode = 'reward';

  overlayEl.classList.remove('banner-passive');
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Stage ${state.stage} 클리어</h2>
      <p>보상 +${clearGold} Gold · 다음 Stage 시작 전 강화 1개 선택</p>
      <div class="reward-grid">
        <button type="button" class="reward-btn" data-action="reward:towerhp">
          <strong>타워 내구 +15%</strong>
          <span>현재 배치 + 이후 배치 모두 내구 증가</span>
        </button>
        <button type="button" class="reward-btn" data-action="reward:siege">
          <strong>공성 대응 +25%</strong>
          <span>공성몹(raider/crusher) 대상 피해 증가</span>
        </button>
        <button type="button" class="reward-btn" data-action="reward:repair">
          <strong>리페어 즉시 복구</strong>
          <span>모든 타워 체력 60% 복구 + Base 2 회복</span>
        </button>
      </div>
    </div>
  `;
}

function applyStageReward(kind) {
  if (state.mode !== 'reward') return;

  if (kind === 'towerhp') {
    state.towerHpBonus += 0.15;
    for (const tower of state.towers) {
      tower.maxHp *= 1.15;
      tower.hp = Math.min(tower.maxHp, tower.hp * 1.15);
    }
    flashBanner('타워 내구 +15%', 0.9);
    sfx(520, 0.07, 'triangle', 0.028);
  } else if (kind === 'siege') {
    state.siegeDamageBonus += 0.25;
    flashBanner('공성 대응 +25%', 0.9);
    sfx(620, 0.07, 'triangle', 0.028);
  } else if (kind === 'repair') {
    for (const tower of state.towers) {
      tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.6);
    }
    state.baseHp = Math.min(20, state.baseHp + 2);
    flashBanner('리페어 완료', 0.9);
    sfx(420, 0.08, 'triangle', 0.03);
  } else {
    return;
  }

  state.mode = 'playing';
  overlayEl.classList.add('hidden');
  overlayEl.classList.remove('banner-passive');
  overlayEl.innerHTML = '';

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
  refreshUltButton();
}

function setSelectedButton() {
  for (const btn of controlsEl.querySelectorAll('.build-btn[data-kind]')) {
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

function refreshUltButton() {
  if (!btnUltSunken) return;
  const armed = state.ultSunkenArmed && state.ultSunkenCharges > 0;
  btnUltSunken.classList.toggle('active', armed);
  const nameEl = btnUltSunken.querySelector('.name');
  const costEl = btnUltSunken.querySelector('.cost');
  if (nameEl) nameEl.textContent = armed ? 'ULT ON' : 'ULT OFF';
  if (costEl) costEl.textContent = `필살 성큰 ${state.ultSunkenCharges}`;
}

function setUltSunkenArmed(enabled) {
  if (state.ultSunkenCharges <= 0) {
    state.ultSunkenArmed = false;
  } else {
    state.ultSunkenArmed = Boolean(enabled);
  }
  refreshUltButton();
  refreshBuildHint();
}

function grantUltSunkenCharge(count = 1, reason = '') {
  const before = state.ultSunkenCharges;
  state.ultSunkenCharges = clamp(state.ultSunkenCharges + count, 0, 3);
  if (state.ultSunkenCharges > before) {
    state.ultSunkenArmed = true;
    const suffix = reason ? ` (${reason})` : '';
    flashBanner(`ULT SUNKEN +${state.ultSunkenCharges - before}${suffix}`, 0.9);
    impactSfx.play('ultReady', { volume: 0.38, minGap: 0.15, rateMin: 0.96, rateMax: 1.02 });
  }
  refreshUltButton();
  refreshBuildHint();
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

function refreshBuildHint() {
  if (!buildHintEl) return;
  const footprint = state.sunkenFootprint === 2 ? '2x2' : '1x1';
  const ultState = state.ultSunkenArmed && state.ultSunkenCharges > 0 ? 'ON' : 'OFF';
  const sellState = state.sellMode ? 'ON' : 'OFF';
  const mobileTag = isMobileView ? '모바일 큰칸' : '일반';
  buildHintEl.textContent = `좌클릭 배치/업그레이드 · 우클릭 판매 · E 판매모드(${sellState}) · 1/2/3/4/5 선택 · Q 성큰크기(${footprint}) · R 필살성큰(${ultState}/${state.ultSunkenCharges}) · ${mobileTag} · F +0.25x`;
  refreshModeHelp();
  refreshTowerGuide();
}

function refreshModeHelp() {
  if (!modeHelpEl) return;
  const ultOn = state.ultSunkenArmed && state.ultSunkenCharges > 0;
  const ultTag = ultOn ? 'ULT ON' : 'ULT OFF';
  const audio = readAudioFlags();
  const sfxTag = audio.sfx ? 'SFX ON' : 'SFX OFF';

  let ultDesc = '';
  if (ultOn) {
    ultDesc = `다음 Sunken 1회가 필살 성큰으로 배치됩니다. 배치 즉시 충전 1개 소모 (${state.ultSunkenCharges}개 보유).`;
  } else if (state.ultSunkenCharges > 0) {
    ultDesc = `일반 성큰 모드입니다. R 키 또는 ULT 버튼으로 ON하면 다음 Sunken 1회가 필살 성큰이 됩니다 (${state.ultSunkenCharges}개 보유).`;
  } else {
    ultDesc = '일반 성큰 모드입니다. 보스/공성몹 처치로 ULT 충전을 얻을 수 있습니다.';
  }

  const sfxDesc = audio.sfx
    ? '타격/피격/건설 효과음이 재생됩니다. 상단 HUD의 SFX 버튼으로 끌 수 있습니다.'
    : '효과음이 음소거 상태입니다. 상단 HUD의 SFX 버튼으로 다시 켤 수 있습니다. (BGM은 별도)';

  modeHelpEl.innerHTML = `
    <div class="row"><span class="tag">${ultTag}</span>${ultDesc}</div>
    <div class="row"><span class="tag">${sfxTag}</span>${sfxDesc}</div>
  `;
}

function refreshTowerGuide() {
  if (!towerGuideEl) return;

  const tower = TOWER_TYPES[state.selectedTower];
  if (!tower) {
    towerGuideEl.textContent = '';
    return;
  }

  const guide = TOWER_GUIDE_DETAILS[state.selectedTower] || {
    role: '전술 타워',
    summary: '현재 상황에 맞게 운용하세요.',
    tips: '',
  };

  const attacksPerSec = tower.reload > 0 ? (1 / tower.reload) : 0;
  const dps = tower.reload > 0 ? tower.damage / tower.reload : tower.damage;
  const badges = [
    `비용 ${tower.cost}`,
    `사거리 ${Math.round(tower.range / BALANCE_SCALE)}`,
    `초당 ${attacksPerSec.toFixed(2)}발`,
    `기본 DPS ${Math.round(dps)}`,
  ];

  if (tower.pierce > 0) badges.push(`관통 ${tower.pierce}`);
  if (tower.splashRadius > 0) badges.push(`스플래시 ${Math.round(tower.splashRadius / BALANCE_SCALE)}`);
  if (tower.snareDuration && tower.snareSlow) badges.push(`둔화 ${Math.round((1 - tower.snareSlow) * 100)}%`);

  towerGuideEl.innerHTML = `
    <div class="line">
      <span class="name">${tower.name}</span>
      ${badges.map((label) => `<span class="badge">${label}</span>`).join('')}
    </div>
    <div class="meta">${guide.role}</div>
    <div class="desc">${guide.summary} ${guide.tips}</div>
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

function nearestEnemyFiltered(x, y, range, predicate) {
  let found = null;
  let best = range * range;
  for (const enemy of state.enemies) {
    if (!predicate(enemy)) continue;
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

function pickTowerTarget(tower) {
  if (tower.kind === 'snare') {
    const unsnared = nearestEnemyFiltered(
      tower.x,
      tower.y,
      tower.range,
      (enemy) => enemy.breaker && enemy.snareTimer <= 0.35
    );
    if (unsnared) return unsnared;
    return nearestEnemyFiltered(tower.x, tower.y, tower.range, (enemy) => enemy.breaker);
  }
  return nearestEnemy(tower.x, tower.y, tower.range);
}

function nearestTower(x, y) {
  let found = null;
  let best = Infinity;
  for (const tower of state.towers) {
    const dx = tower.x - x;
    const dy = tower.y - y;
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      found = tower;
    }
  }
  return found;
}

function castBossSeal(enemy) {
  const candidates = state.towers.filter((tower) => tower.sealTimer <= 0.22);
  if (candidates.length === 0) return false;

  candidates.sort((a, b) => (b.level - a.level) || (b.spent - a.spent));
  const count = Math.min(candidates.length, enemy.sealCount || 1);
  const picked = [];
  const offset = Math.floor(rand(0, candidates.length));

  for (let i = 0; i < count; i += 1) {
    const tower = candidates[(offset + i) % candidates.length];
    if (!tower) continue;
    picked.push(tower);
  }

  for (const tower of picked) {
    tower.sealTimer = Math.max(tower.sealTimer, enemy.sealDuration);
    tower.cooldown = Math.max(tower.cooldown, 0.25);

    for (let i = 0; i < 9; i += 1) {
      state.particles.push({
        x: tower.x + rand(-8, 8),
        y: tower.y + rand(-8, 8),
        vx: rand(-95, 95),
        vy: rand(-120, 40),
        life: rand(0.16, 0.36),
        size: rand(1.8, 3.6),
        color: '#ff92b2',
      });
    }
  }

  flashBanner(`BOSS 봉인 시전 x${picked.length}`, 0.9, true);
  sfx(140, 0.12, 'sawtooth', 0.035);
  return true;
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
    if (enemy.targetTowerId === tower.id) enemy.targetTowerId = 0;
  }
  return true;
}

function damageTower(tower, amount, sourceEnemy = null) {
  if (!tower) return;
  tower.hp -= amount;
  for (let i = 0; i < 8; i += 1) {
    state.particles.push({
      x: tower.x + rand(-6, 6),
      y: tower.y + rand(-6, 6),
      vx: rand(-120, 120),
      vy: rand(-130, 60),
      life: rand(0.08, 0.22),
      size: rand(1.7, 3.2),
      color: sourceEnemy?.color || '#ffb3c1',
    });
  }
  if (sourceEnemy) {
    impactSfx.play('towerHit', { volume: 0.36, minGap: 0.05, rateMin: 0.92, rateMax: 1.03 });
    const base = sourceEnemy.type === 'crusher' ? 128 : 164;
    const gain = sourceEnemy.type === 'crusher' ? 0.024 : 0.018;
    sfx(base + rand(-18, 14), 0.06, 'square', gain);
  } else if (Math.random() < 0.2) {
    sfx(220 + rand(-24, 16), 0.05, 'square', 0.016);
  }
  if (tower.hp > 0) return;

  removeTower(tower);
  impactSfx.play('towerBreak', { volume: 0.22, minGap: 0.08, rateMin: 0.86, rateMax: 0.95 });
  flashBanner(`${tower.kind.toUpperCase()} DESTROYED`, 0.9, true);
  sfx(170, 0.12, 'sawtooth', 0.04);
}

function emitBullet(tower, target) {
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const d = Math.hypot(dx, dy) || 1;
  const isSnare = tower.kind === 'snare';
  const isUltSunken = tower.kind === 'sunken' && tower.ultimate;
  const isSplashSunken = tower.kind === 'sunkenSplash';

  state.bullets.push({
    x: tower.x,
    y: tower.y,
    vx: (dx / d) * tower.bulletSpeed,
    vy: (dy / d) * tower.bulletSpeed,
    r: isUltSunken ? 6.5 : isSplashSunken ? 5.6 : tower.kind === 'obelisk' ? 5 : isSnare ? 4.5 : 4,
    damage: isUltSunken ? tower.damage * 1.12 : tower.damage,
    life: 2,
    color: tower.color,
    pierce: isSnare ? 0 : tower.pierce + (isUltSunken ? 1 : 0),
    towerKind: tower.kind,
    ult: isUltSunken,
    splashRadius: isSplashSunken ? tower.splashRadius : 0,
    splashFalloff: isSplashSunken ? tower.splashFalloff : 0,
    snareDuration: tower.snareDuration,
    snareSlow: tower.snareSlow,
    weakenMul: tower.weakenMul,
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
    if (isUltSunken) {
      impactSfx.play('ultShot', { volume: 0.42, minGap: 0.08, rateMin: 0.9, rateMax: 0.98 });
    }
    if (Math.random() < 0.4) sfx(330 + rand(-24, 18), 0.03, 'triangle', 0.011);
  } else if (tower.kind === 'sunkenSplash') {
    impactSfx.play('enemyHitHeavy', { volume: 0.26, minGap: 0.08, rateMin: 0.95, rateMax: 1.03 });
    if (Math.random() < 0.6) sfx(290 + rand(-18, 14), 0.04, 'square', 0.012);
  } else if (Math.random() < 0.35) {
    sfx(430 + rand(-26, 28), 0.03, 'square', 0.01);
  }
}

function hurtEnemy(enemy, damage, sourceKind = '', sourceUlt = false, secondary = false) {
  const weakenDamage = enemy.weakenTimer > 0 ? enemy.weakenMul : 1;
  const siegeDamage = enemy.breaker ? 1 + state.siegeDamageBonus : 1;
  enemy.hp -= damage * weakenDamage * siegeDamage;
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
    impactSfx.play(sourceUlt ? 'enemyHitHeavy' : 'enemyHit', {
      volume: sourceUlt ? 0.38 : 0.28,
      minGap: sourceUlt ? 0.08 : 0.04,
      rateMin: sourceUlt ? 0.9 : 0.95,
      rateMax: sourceUlt ? 0.99 : 1.06,
    });
    if (!secondary && Math.random() < 0.35) sfx(286 + rand(-22, 18), 0.04, 'triangle', 0.011);
  } else if (sourceKind === 'sunkenSplash') {
    impactSfx.play(sourceUlt ? 'enemyHitHeavy' : 'enemyHit', {
      volume: sourceUlt ? 0.42 : 0.3,
      minGap: sourceUlt ? 0.09 : 0.05,
      rateMin: sourceUlt ? 0.88 : 0.93,
      rateMax: sourceUlt ? 0.97 : 1.02,
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
      grantUltSunkenCharge(1, 'BOSS');
      bgmAudio?.fx('win');
      impactSfx.play('enemyHitHeavy', { volume: 0.46, minGap: 0.12, rateMin: 0.88, rateMax: 0.95 });
      sfx(280, 0.2, 'sawtooth', 0.04);
      flashBanner('BOSS DOWN', 0.9);
    } else {
      const dropChance = enemy.breaker ? 0.11 : 0.035;
      if (Math.random() < dropChance) {
        grantUltSunkenCharge(1, enemy.breaker ? '공성 처치' : '럭키');
      }
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
  }
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.sealTimer = Math.max(0, tower.sealTimer - dt);
    if (tower.sealTimer > 0) continue;

    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const target = pickTowerTarget(tower);
    if (!target) continue;

    emitBullet(tower, target);
    tower.cooldown = tower.reload;
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

      if (b.towerKind === 'snare') {
        if (enemy.breaker) {
          enemy.snareTimer = Math.max(enemy.snareTimer, b.snareDuration || 2);
          enemy.snareSlowMul = Math.min(enemy.snareSlowMul, b.snareSlow || 0.55);
          enemy.weakenTimer = Math.max(enemy.weakenTimer, (b.snareDuration || 2) + 0.6);
          enemy.weakenMul = Math.max(enemy.weakenMul, b.weakenMul || 1.25);
          spawnTowerHitVfx(enemy.x, enemy.y, b.towerKind, Boolean(b.ult), false);
          hurtEnemy(enemy, b.damage * 0.55, b.towerKind, Boolean(b.ult), false);
          if (Math.random() < 0.28) flashBanner('Snare: 공성몹 둔화/약화', 0.45);
        }
        state.bullets.splice(i, 1);
        removed = true;
      } else {
        spawnTowerHitVfx(enemy.x, enemy.y, b.towerKind, Boolean(b.ult), false);
        hurtEnemy(enemy, b.damage, b.towerKind, Boolean(b.ult), false);

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
            spawnTowerHitVfx(other.x, other.y, b.towerKind, Boolean(b.ult), true);
            hurtEnemy(other, splashDamage, b.towerKind, Boolean(b.ult), true);
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

function updateEnemy(enemy, dt) {
  enemy.repath -= dt;
  enemy.attackCd = Math.max(0, enemy.attackCd - dt);
  enemy.snareTimer = Math.max(0, enemy.snareTimer - dt);
  enemy.weakenTimer = Math.max(0, enemy.weakenTimer - dt);
  enemy.sealCd = Math.max(0, enemy.sealCd - dt);
  if (enemy.snareTimer <= 0) enemy.snareSlowMul = 1;
  if (enemy.weakenTimer <= 0) enemy.weakenMul = 1;

  if (enemy.boss && enemy.sealCd <= 0 && state.towers.length > 0) {
    const casted = castBossSeal(enemy);
    enemy.sealCd = casted
      ? enemy.sealInterval + rand(-0.35, 0.45)
      : 1.2;
  }

  const speed = enemy.speed * (enemy.snareTimer > 0 ? enemy.snareSlowMul : 1);

  if (enemy.breaker && state.towers.length > 0) {
    let targetTower = state.towers.find((t) => t.id === enemy.targetTowerId);
    if (!targetTower) {
      targetTower = nearestTower(enemy.x, enemy.y);
      enemy.targetTowerId = targetTower ? targetTower.id : 0;
    }

    if (targetTower) {
      const tdx = targetTower.x - enemy.x;
      const tdy = targetTower.y - enemy.y;
      const td = Math.hypot(tdx, tdy) || 1;
      const tx = tdx / td;
      const ty = tdy / td;

      if (td <= enemy.attackRange + GRID.cell * 0.28) {
        enemy.vx *= 0.72;
        enemy.vy *= 0.72;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.attackCd <= 0) {
          damageTower(targetTower, enemy.towerDamage, enemy);
          enemy.attackCd = enemy.attackInterval;
          if (Math.random() < 0.5) flashBanner('공성 몹이 건물 공격 중', 0.32, true);
        }
      } else {
        enemy.vx += tx * speed * dt * 3.3;
        enemy.vy += ty * speed * dt * 3.3;
        enemy.vx *= 0.89;
        enemy.vy *= 0.89;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }
      return;
    }
  }

  if (enemy.repath <= 0) {
    const cell = worldToCell(enemy.x, enemy.y);
    enemy.targetC = clamp(cell.c, 0, GRID.cols - 1);
    enemy.targetR = clamp(cell.r, 0, GRID.rows - 1);

    const step = neighborStep(enemy.targetC, enemy.targetR);
    if (step.valid) {
      enemy.targetC = step.c;
      enemy.targetR = step.r;
    }

    const center = cellCenter(enemy.targetC, enemy.targetR);
    enemy.targetX = center.x;
    enemy.targetY = center.y;
    enemy.repath = enemy.boss ? 0.14 : 0.2;
  }

  const dx = enemy.targetX - enemy.x;
  const dy = enemy.targetY - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;

  enemy.vx += nx * speed * dt * 3.2;
  enemy.vy += ny * speed * dt * 3.2;
  enemy.vx *= 0.9;
  enemy.vy *= 0.9;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  const goalCenter = cellCenter(GOAL.c, GOAL.r);
  if (Math.hypot(enemy.x - goalCenter.x, enemy.y - goalCenter.y) < GRID.cell * 0.38) {
    state.baseHp -= enemy.leak;
    const idx = state.enemies.indexOf(enemy);
    if (idx >= 0) state.enemies.splice(idx, 1);

    flashBanner(`BASE -${enemy.leak}`, 0.6, true);
    impactSfx.play('baseHit', { volume: 0.4, minGap: 0.06, rateMin: 0.9, rateMax: 1.01 });
    sfx(180, 0.09, 'sawtooth', 0.03);
    if (state.baseHp <= 0) {
      state.baseHp = 0;
      setDefeat();
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
  const yBands = [-0.95, -0.45, 0, 0.45, 0.95];
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
    const spawnDelay = Math.max(0.055, 0.4 - earlyStage * 0.02 - lateIndex * 0.011);
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

function drawEndpoints() {
  const sp = cellCenter(SPAWN.c, SPAWN.r);
  const gp = cellCenter(GOAL.c, GOAL.r);

  ctx.fillStyle = '#7df7be';
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, 11, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#ff8da2';
  ctx.beginPath();
  ctx.arc(gp.x, gp.y, 12, 0, TAU);
  ctx.fill();
}

function drawTowerSunken(tower, now) {
  const isSplash = tower.kind === 'sunkenSplash';
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
  } else {
    vortex.addColorStop(0, '#7ee8ff');
    vortex.addColorStop(0.65, '#3e8ab5');
    vortex.addColorStop(1, '#11273a');
  }
  ctx.fillStyle = vortex;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = isSplash ? 'rgba(255, 232, 171, 0.62)' : 'rgba(196, 242, 255, 0.62)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 2 + tower.level; i += 1) {
    const rot = now * (0.8 + i * 0.22) + i * 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 3.1 + i * 1.6, rot, rot + Math.PI * 0.95);
    ctx.stroke();
  }

  if (tower.level >= 2) {
    const orbitCount = 3 + tower.level;
    ctx.fillStyle = isSplash ? 'rgba(255, 216, 143, 0.84)' : 'rgba(197, 242, 255, 0.84)';
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
  ctx.fillStyle = isSplash ? 'rgba(255, 215, 142, 0.78)' : 'rgba(198, 246, 255, 0.78)';
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

  if (tower.ultimate) {
    ctx.strokeStyle = `rgba(255, 218, 130, ${0.55 + pulse * 0.32})`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, ringR + 8 + pulse * 2, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 236, 177, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 2.8 + pulse * 1.3, 0, TAU);
    ctx.fill();
  }

  if (tower.level >= 3) {
    ctx.strokeStyle = isSplash ? `rgba(255, 190, 115, ${0.66 + pulse * 0.2})` : `rgba(162, 236, 255, ${0.66 + pulse * 0.2})`;
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i += 1) {
      const beamA = now * 1.7 + i * (TAU / 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(beamA) * (ringR - 2.4), Math.sin(beamA) * (ringR - 2.4));
      ctx.lineTo(Math.cos(beamA) * (ringR + 10 + pulse * 2.4), Math.sin(beamA) * (ringR + 10 + pulse * 2.4));
      ctx.stroke();
    }
  }

  if (isSplash) {
    ctx.strokeStyle = `rgba(255, 169, 86, ${0.52 + pulse * 0.24})`;
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
      : tower.kind === 'sunkenSplash'
        ? 'rgba(255, 193, 132, 0.86)'
        : tower.kind === 'spine'
          ? 'rgba(185, 232, 172, 0.8)'
          : tower.kind === 'obelisk'
            ? 'rgba(226, 177, 255, 0.85)'
            : 'rgba(154, 232, 255, 0.88)';
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    if (tower.kind === 'sunken' || tower.kind === 'sunkenSplash') {
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

    if (tower.sealTimer > 0) {
      const alpha = 0.2 + Math.min(0.5, tower.sealTimer / 5) * 0.7;
      ctx.fillStyle = `rgba(255, 90, 134, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 11, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 190, 208, ${0.5 + alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tower.x - 7, tower.y - 7);
      ctx.lineTo(tower.x + 7, tower.y + 7);
      ctx.moveTo(tower.x + 7, tower.y - 7);
      ctx.lineTo(tower.x - 7, tower.y + 7);
      ctx.stroke();
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
  if (enemy.snareTimer > 0) ctx.globalAlpha = 0.84;
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

    if (enemy.breaker) {
      ctx.strokeStyle = 'rgba(255, 230, 180, 0.86)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(enemy.x - enemy.r * 0.55, enemy.y - enemy.r * 0.1);
      ctx.lineTo(enemy.x + enemy.r * 0.55, enemy.y + enemy.r * 0.1);
      ctx.moveTo(enemy.x + enemy.r * 0.28, enemy.y - enemy.r * 0.56);
      ctx.lineTo(enemy.x - enemy.r * 0.2, enemy.y + enemy.r * 0.5);
      ctx.stroke();
    }

    if (enemy.snareTimer > 0) {
      ctx.strokeStyle = 'rgba(155, 241, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 6, 0, TAU);
      ctx.stroke();
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
  if (state.mode !== 'playing') {
    draw();
    refreshHud();
    return;
  }

  const simDt = dt * state.simSpeed;

  state.banner.ttl = Math.max(0, state.banner.ttl - dt);
  if (state.banner.ttl <= 0 && overlayEl.querySelector('.banner')) {
    overlayEl.classList.add('hidden');
    overlayEl.classList.remove('banner-passive');
    overlayEl.innerHTML = '';
  }

  updateSpawning(simDt);
  updateTowers(simDt);
  updateBullets(simDt);
  updateEnemies(simDt);
  updateParticles(simDt);

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

controlsEl.addEventListener('click', (event) => {
  if (event.target.closest('[data-action="toggle-ult"]')) {
    if (state.ultSunkenCharges <= 0) {
      flashBanner('ULT 충전 없음', 0.7, true);
      sfx(180, 0.05, 'sawtooth', 0.018);
      return;
    }
    setUltSunkenArmed(!state.ultSunkenArmed);
    sfx(state.ultSunkenArmed ? 500 : 360, 0.05, 'triangle', 0.014);
    return;
  }

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

  const btn = event.target.closest('.build-btn[data-kind]');
  if (!btn) return;
  chooseTower(btn.dataset.kind);
});

hudEl?.addEventListener('click', () => {
  // HUD 내부 SFX/BGM 토글 클릭 후 상태 문구를 즉시 동기화한다.
  window.setTimeout(() => {
    refreshModeHelp();
  }, 0);
});

window.addEventListener('storage', (event) => {
  if (event.key === 'taptapcho_neon_audio_v1') {
    refreshModeHelp();
  }
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

canvas.addEventListener('pointerdown', (event) => {
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
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Digit1') chooseTower('sunken');
  if (event.code === 'Digit2') chooseTower('sunkenSplash');
  if (event.code === 'Digit3') chooseTower('spine');
  if (event.code === 'Digit4') chooseTower('obelisk');
  if (event.code === 'Digit5') chooseTower('snare');

  if (event.code === 'KeyQ') {
    state.sunkenFootprint = state.sunkenFootprint === 1 ? 2 : 1;
    refreshBuildHint();
    sfx(390, 0.05, 'triangle', 0.014);
  }

  if (event.code === 'KeyR') {
    if (state.ultSunkenCharges <= 0) {
      flashBanner('ULT 충전 없음', 0.7, true);
      sfx(180, 0.05, 'sawtooth', 0.018);
    } else {
      setUltSunkenArmed(!state.ultSunkenArmed);
      sfx(state.ultSunkenArmed ? 500 : 360, 0.05, 'triangle', 0.014);
    }
  }

  if (event.code === 'KeyE') {
    setSellMode(!state.sellMode);
    refreshBuildHint();
    sfx(state.sellMode ? 300 : 410, 0.05, 'triangle', 0.013);
  }

  if (event.code === 'KeyF') {
    changeSimSpeed(0.25);
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
