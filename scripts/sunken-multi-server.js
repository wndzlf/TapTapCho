const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.SUNKEN_MULTI_PORT || 9091);
const TICK_MS = 100;
const SNAPSHOT_MS = 140;
const ROOMS_BROADCAST_MS = 1000;
const ROOM_IDLE_MS = 20 * 60 * 1000;
const OFFLINE_GRACE_MS = 3 * 60 * 1000;
const MAX_PLAYERS = 4;
const SLOT_COUNT = 8;
const ACTION_MEMORY = 240;
const SINGLE_RANK_MAX = 300;
const SINGLE_RANK_FILE = path.join(__dirname, '..', 'data', 'sunken-single-ranks.json');
const SINGLE_PLAYER_MAX = 2000;
const SINGLE_PLAYER_FILE = path.join(__dirname, '..', 'data', 'sunken-single-players.json');
const MULTI_STATE_MAX_ROOMS = 120;
const MULTI_STATE_FILE = path.join(__dirname, '..', 'data', 'sunken-multi-state.json');
const MULTI_STATE_SAVE_MS = 2000;

const LANES = ['north', 'east', 'south', 'west'];
const LANE_PRESETS = {
  2: ['east', 'west'],
  3: ['north', 'east', 'west'],
  4: [...LANES],
};
const ENEMY_KIND_ALIASES = {
  runner: 'bat',
  siege: 'crusher',
  boss: 'lord',
};
const ENEMY_KIND_SET = new Set(['ghoul', 'bat', 'hopper', 'brute', 'elder', 'raider', 'crusher', 'lord']);

const TOWER_TYPES = {
  sunken: {
    id: 'sunken',
    name: 'Sunken',
    cost: 60,
    refund: 0.55,
    damage: 28,
    reload: 0.55,
    range: 0.13,
    hp: 230,
  },
  spine: {
    id: 'spine',
    name: 'Spine',
    cost: 92,
    refund: 0.55,
    damage: 16,
    reload: 0.24,
    range: 0.18,
    hp: 170,
  },
  obelisk: {
    id: 'obelisk',
    name: 'Obelisk',
    cost: 138,
    refund: 0.58,
    damage: 58,
    reload: 1.08,
    range: 0.15,
    hp: 300,
    pierce: 1,
  },
  snare: {
    id: 'snare',
    name: 'Snare',
    cost: 118,
    refund: 0.58,
    damage: 8,
    reload: 0.7,
    range: 0.2,
    hp: 205,
    slowMul: 0.62,
    slowSec: 1.4,
    weakMul: 1.25,
  },
};

const rooms = new Map();
let multiStateDirty = false;

function markMultiStateDirty() {
  multiStateDirty = true;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randomId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shortRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function safePlayerName(raw) {
  const v = String(raw || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 14);
  return v || `Player${Math.floor(rand(100, 999))}`;
}

function safeRoomName(raw) {
  const v = String(raw || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 22);
  return v || 'Sunken Team Room';
}

function safePlayerId(raw) {
  const v = String(raw || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
  return v || `p-${randomId().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)}`;
}

function laneLabel(lane) {
  if (lane === 'north') return '12시';
  if (lane === 'east') return '3시';
  if (lane === 'south') return '6시';
  return '9시';
}

function normalizeRoomMaxPlayers(raw) {
  const v = Math.floor(Number(raw) || MAX_PLAYERS);
  if (v <= 2) return 2;
  if (v === 3) return 3;
  return 4;
}

function getActiveLanes(maxPlayers) {
  const key = normalizeRoomMaxPlayers(maxPlayers);
  return [...(LANE_PRESETS[key] || LANE_PRESETS[4])];
}

function createLaneBoard() {
  const laneTowers = {};
  for (const lane of LANES) {
    laneTowers[lane] = Array.from({ length: SLOT_COUNT }, () => null);
  }
  return laneTowers;
}

function cloneLaneSlots(slots) {
  return slots.map((tower) => {
    if (!tower) return null;
    return {
      type: tower.type,
      hp: Math.round(tower.hp),
      maxHp: tower.maxHp,
      owner: tower.owner,
      cooldown: Number(tower.cooldown.toFixed(2)),
    };
  });
}

function roomLanes(room) {
  const lanes = Array.isArray(room?.activeLanes) ? room.activeLanes.filter((lane) => LANES.includes(lane)) : [];
  return lanes.length ? lanes : [...LANES];
}

function normalizeEnemyKind(raw) {
  const kindRaw = String(raw || 'ghoul').slice(0, 20).toLowerCase();
  const kind = ENEMY_KIND_ALIASES[kindRaw] || kindRaw;
  return ENEMY_KIND_SET.has(kind) ? kind : 'ghoul';
}

function createRoom(name, maxPlayers = MAX_PLAYERS) {
  let id = shortRoomId();
  while (rooms.has(id)) id = shortRoomId();

  const cap = normalizeRoomMaxPlayers(maxPlayers);
  const activeLanes = getActiveLanes(cap);
  const now = Date.now();
  const room = {
    id,
    name: safeRoomName(name),
    maxPlayers: cap,
    activeLanes,
    createdAt: now,
    lastActiveAt: now,
    players: new Map(),
    laneOwners: {
      north: null,
      east: null,
      south: null,
      west: null,
    },
    coreHp: 240,
    coreHpMax: 240,
    teamGold: 320,
    kills: 0,
    wave: 1,
    phase: 'running',
    waveState: 'spawning',
    waveCooldown: 0,
    spawnTimer: 0,
    spawnInterval: 1.05,
    laneSpawnRemain: {
      north: 0,
      east: 0,
      south: 0,
      west: 0,
    },
    enemies: [],
    nextEnemyId: 1,
    laneTowers: createLaneBoard(),
    lastSnapshotAt: 0,
  };

  startWave(room, 1);
  rooms.set(room.id, room);
  markMultiStateDirty();
  return room;
}

function removeRoom(roomId) {
  if (rooms.delete(roomId)) {
    markMultiStateDirty();
  }
}

function roomSummary(room) {
  const online = Array.from(room.players.values()).filter((p) => p.online).length;
  const total = room.players.size;
  return {
    id: room.id,
    name: room.name,
    online,
    total,
    cap: room.maxPlayers || MAX_PLAYERS,
    activeLanes: Array.isArray(room.activeLanes) && room.activeLanes.length
      ? room.activeLanes
      : [...LANES],
    wave: room.wave,
    phase: room.phase,
    coreHp: room.coreHp,
    coreHpMax: room.coreHpMax,
    createdAt: room.createdAt,
  };
}

function listRoomsPayload() {
  return {
    type: 'rooms',
    rooms: Array.from(rooms.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(roomSummary),
    t: Date.now(),
  };
}

function compareSingleRank(a, b) {
  if (a.stage !== b.stage) return b.stage - a.stage;
  if (a.kills !== b.kills) return b.kills - a.kills;
  if (a.score !== b.score) return b.score - a.score;
  return a.updatedAt - b.updatedAt;
}

function normalizeSingleRankRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const playerId = safePlayerId(raw.playerId);
  const playerName = safePlayerName(raw.name || raw.playerName);
  const stage = clamp(Math.floor(Number(raw.stage) || 0), 1, 999);
  const kills = clamp(Math.floor(Number(raw.kills) || 0), 0, 999999);
  const score = clamp(Math.floor(Number(raw.score) || 0), 0, 999999999);
  const updatedAt = Math.floor(Number(raw.updatedAt || Date.now()));
  return {
    playerId,
    playerName,
    stage,
    kills,
    score,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

function loadSingleRankRows() {
  try {
    if (!fs.existsSync(SINGLE_RANK_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(SINGLE_RANK_FILE, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSingleRankRow)
      .filter(Boolean)
      .sort(compareSingleRank)
      .slice(0, SINGLE_RANK_MAX);
  } catch (error) {
    console.warn('[sunken-multi-server] leaderboard load failed:', error?.message || error);
    return [];
  }
}

function saveSingleRankRows(rows) {
  try {
    fs.mkdirSync(path.dirname(SINGLE_RANK_FILE), { recursive: true });
    fs.writeFileSync(SINGLE_RANK_FILE, JSON.stringify(rows, null, 2));
  } catch (error) {
    console.warn('[sunken-multi-server] leaderboard save failed:', error?.message || error);
  }
}

function listSingleRankRows(limit = 10) {
  const lim = clamp(Math.floor(Number(limit) || 10), 1, 50);
  return singleRankRows.slice(0, lim);
}

function submitSingleRank(raw) {
  const row = normalizeSingleRankRow(raw);
  if (!row) return { ok: false, reason: 'invalid_payload', rank: 0 };

  const idx = singleRankRows.findIndex((it) => it.playerId === row.playerId);
  if (idx < 0) {
    singleRankRows.push(row);
  } else {
    const prev = singleRankRows[idx];
    const better = compareSingleRank(row, prev) < 0;
    singleRankRows[idx] = better
      ? row
      : {
          ...prev,
          playerName: row.playerName,
          updatedAt: Math.max(prev.updatedAt, row.updatedAt),
        };
  }

  singleRankRows = singleRankRows
    .map(normalizeSingleRankRow)
    .filter(Boolean)
    .sort(compareSingleRank)
    .slice(0, SINGLE_RANK_MAX);

  saveSingleRankRows(singleRankRows);
  const rank = singleRankRows.findIndex((it) => it.playerId === row.playerId) + 1;
  return { ok: true, rank: rank > 0 ? rank : 0 };
}

let singleRankRows = loadSingleRankRows();

function normalizeSinglePlayerRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const playerId = safePlayerId(raw.playerId);
  const playerName = safePlayerName(raw.playerName || raw.name);
  const createdAt = Math.floor(Number(raw.createdAt || Date.now()));
  const updatedAt = Math.floor(Number(raw.updatedAt || Date.now()));
  const lastSeenAt = Math.floor(Number(raw.lastSeenAt || updatedAt || Date.now()));
  return {
    playerId,
    playerName,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    lastSeenAt: Number.isFinite(lastSeenAt) ? lastSeenAt : Date.now(),
  };
}

function loadSinglePlayerRows() {
  try {
    if (!fs.existsSync(SINGLE_PLAYER_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(SINGLE_PLAYER_FILE, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSinglePlayerRow)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, SINGLE_PLAYER_MAX);
  } catch (error) {
    console.warn('[sunken-multi-server] single player registry load failed:', error?.message || error);
    return [];
  }
}

function saveSinglePlayerRows(rows) {
  try {
    fs.mkdirSync(path.dirname(SINGLE_PLAYER_FILE), { recursive: true });
    fs.writeFileSync(SINGLE_PLAYER_FILE, JSON.stringify(rows, null, 2));
  } catch (error) {
    console.warn('[sunken-multi-server] single player registry save failed:', error?.message || error);
  }
}

function registerSinglePlayer(raw) {
  const row = normalizeSinglePlayerRow(raw);
  if (!row) return null;
  const now = Date.now();
  row.updatedAt = now;
  row.lastSeenAt = now;

  const idx = singlePlayerRows.findIndex((it) => it.playerId === row.playerId);
  if (idx < 0) {
    row.createdAt = now;
    singlePlayerRows.push(row);
  } else {
    const prev = singlePlayerRows[idx];
    singlePlayerRows[idx] = {
      ...prev,
      playerName: row.playerName,
      updatedAt: now,
      lastSeenAt: now,
    };
  }

  singlePlayerRows = singlePlayerRows
    .map(normalizeSinglePlayerRow)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, SINGLE_PLAYER_MAX);

  saveSinglePlayerRows(singlePlayerRows);
  return singlePlayerRows.find((it) => it.playerId === row.playerId) || row;
}

let singlePlayerRows = loadSinglePlayerRows();

function toFiniteInt(raw, fallback = 0) {
  const v = Math.floor(Number(raw));
  return Number.isFinite(v) ? v : fallback;
}

function toFiniteNumber(raw, fallback = 0) {
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

function normalizeTowerState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = TOWER_TYPES[String(raw.type || '')] ? String(raw.type) : 'sunken';
  const spec = TOWER_TYPES[type] || TOWER_TYPES.sunken;
  const maxHp = clamp(toFiniteInt(raw.maxHp, spec.hp), 1, 999999);
  const hp = clamp(Number(raw.hp), 0, maxHp);
  const cooldown = clamp(Number(raw.cooldown), 0, 20);
  return {
    type,
    owner: safePlayerId(raw.owner),
    hp: Number.isFinite(hp) ? hp : maxHp,
    maxHp,
    cooldown: Number.isFinite(cooldown) ? cooldown : 0,
  };
}

function normalizeEnemyState(raw, activeLanes) {
  if (!raw || typeof raw !== 'object') return null;
  const lane = String(raw.lane || '');
  if (!activeLanes.includes(lane)) return null;
  const id = clamp(toFiniteInt(raw.id, 0), 1, 1_000_000_000);
  const kind = normalizeEnemyKind(raw.kind || 'ghoul');
  const maxHp = clamp(toFiniteInt(raw.maxHp, 1), 1, 9999999);
  const hp = clamp(Number(raw.hp), 0, maxHp);
  return {
    id,
    lane,
    kind,
    progress: clamp(toFiniteNumber(raw.progress, 0), 0, 1.5),
    hp: Number.isFinite(hp) ? hp : maxHp,
    maxHp,
    speed: clamp(toFiniteNumber(raw.speed, 0.08), 0.01, 5),
    reward: clamp(toFiniteInt(raw.reward, 0), 0, 1000000),
    coreDamage: clamp(toFiniteInt(raw.coreDamage, 1), 1, 1000),
    // 멀티는 싱글과 동일하게 "공성 타워 파괴 몹"을 쓰지 않는다.
    siegeDamage: 0,
    siegeRate: 0,
    siegeCooldown: 0,
    slowTimer: clamp(toFiniteNumber(raw.slowTimer, 0), 0, 30),
    slowMul: clamp(toFiniteNumber(raw.slowMul, 1), 0.05, 1),
    weakTimer: clamp(toFiniteNumber(raw.weakTimer, 0), 0, 30),
    weakMul: clamp(toFiniteNumber(raw.weakMul, 1), 1, 5),
  };
}

function normalizePlayerState(raw, activeLanes, now) {
  if (!raw || typeof raw !== 'object') return null;
  const id = safePlayerId(raw.id || raw.playerId);
  const name = safePlayerName(raw.name || raw.playerName);
  const laneRaw = String(raw.lane || '');
  const lane = activeLanes.includes(laneRaw) ? laneRaw : '';
  const actionQueueRaw = Array.isArray(raw.actionQueue) ? raw.actionQueue : [];
  const actionQueue = actionQueueRaw
    .map((v) => String(v || '').slice(0, 40))
    .filter(Boolean)
    .slice(-ACTION_MEMORY);
  return {
    id,
    name,
    lane,
    online: false,
    joinedAt: toFiniteInt(raw.joinedAt, now),
    lastSeenAt: toFiniteInt(raw.lastSeenAt, now),
    offlineSince: toFiniteInt(raw.offlineSince, now),
    ws: null,
    kills: clamp(toFiniteInt(raw.kills, 0), 0, 999999),
    builds: clamp(toFiniteInt(raw.builds, 0), 0, 999999),
    actionSet: new Set(actionQueue),
    actionQueue,
  };
}

function assignRecoveredPlayers(room, playerRows) {
  const lanes = roomLanes(room);
  const laneOwners = {
    north: null,
    east: null,
    south: null,
    west: null,
  };
  const players = new Map();

  for (const row of playerRows.slice(0, room.maxPlayers || MAX_PLAYERS)) {
    if (!row) continue;
    if (players.has(row.id)) continue;

    let lane = row.lane;
    if (!lane || laneOwners[lane]) {
      lane = lanes.find((it) => !laneOwners[it]) || '';
    }
    if (!lane) continue;

    const player = {
      ...row,
      lane,
      online: false,
      ws: null,
      offlineSince: row.offlineSince > 0 ? row.offlineSince : Date.now(),
    };
    players.set(player.id, player);
    laneOwners[lane] = player.id;
  }

  room.players = players;
  room.laneOwners = laneOwners;
}

function hydrateRoomState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const now = Date.now();
  let id = String(raw.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!id) id = shortRoomId();

  const maxPlayers = normalizeRoomMaxPlayers(raw.maxPlayers);
  const activeLanes = getActiveLanes(maxPlayers);
  const coreHpMax = clamp(toFiniteInt(raw.coreHpMax, 240), 60, 1000000);
  const coreHp = clamp(toFiniteInt(raw.coreHp, coreHpMax), 0, coreHpMax);

  const room = {
    id,
    name: safeRoomName(raw.name),
    maxPlayers,
    activeLanes,
    createdAt: toFiniteInt(raw.createdAt, now),
    lastActiveAt: toFiniteInt(raw.lastActiveAt, now),
    players: new Map(),
    laneOwners: {
      north: null,
      east: null,
      south: null,
      west: null,
    },
    coreHp,
    coreHpMax,
    teamGold: clamp(toFiniteInt(raw.teamGold, 320), 0, 1000000),
    kills: clamp(toFiniteInt(raw.kills, 0), 0, 100000000),
    wave: clamp(toFiniteInt(raw.wave, 1), 1, 9999),
    phase: raw.phase === 'defeat' ? 'defeat' : 'running',
    waveState: String(raw.waveState || 'spawning'),
    waveCooldown: clamp(toFiniteNumber(raw.waveCooldown, 0), 0, 60),
    spawnTimer: clamp(toFiniteNumber(raw.spawnTimer, 0), 0, 10),
    spawnInterval: clamp(toFiniteNumber(raw.spawnInterval, 1.05), 0.2, 2),
    laneSpawnRemain: {
      north: 0,
      east: 0,
      south: 0,
      west: 0,
    },
    enemies: [],
    nextEnemyId: 1,
    laneTowers: createLaneBoard(),
    lastSnapshotAt: 0,
  };

  for (const lane of LANES) {
    room.laneSpawnRemain[lane] = activeLanes.includes(lane)
      ? clamp(toFiniteInt(raw?.laneSpawnRemain?.[lane], 0), 0, 500000)
      : 0;
  }

  for (const lane of activeLanes) {
    const src = Array.isArray(raw?.laneTowers?.[lane]) ? raw.laneTowers[lane] : [];
    for (let i = 0; i < SLOT_COUNT; i += 1) {
      room.laneTowers[lane][i] = normalizeTowerState(src[i]);
    }
  }

  const parsedPlayers = Array.isArray(raw.players)
    ? raw.players.map((it) => normalizePlayerState(it, activeLanes, now)).filter(Boolean)
    : [];
  assignRecoveredPlayers(room, parsedPlayers);

  const parsedEnemies = Array.isArray(raw.enemies)
    ? raw.enemies.map((it) => normalizeEnemyState(it, activeLanes)).filter(Boolean)
    : [];
  room.enemies = parsedEnemies;
  const maxEnemyId = parsedEnemies.reduce((acc, enemy) => Math.max(acc, enemy.id), 0);
  room.nextEnemyId = Math.max(maxEnemyId + 1, clamp(toFiniteInt(raw.nextEnemyId, maxEnemyId + 1), 1, 1_000_000_000));

  if (room.waveState !== 'spawning' && room.waveState !== 'cooldown' && room.waveState !== 'ended') {
    room.waveState = room.phase === 'defeat' ? 'ended' : 'spawning';
  }
  if (room.phase === 'defeat') {
    room.waveState = 'ended';
    room.waveCooldown = 0;
  }

  return room;
}

function serializeTowerState(tower) {
  if (!tower) return null;
  return {
    type: tower.type,
    owner: tower.owner,
    hp: Number(tower.hp),
    maxHp: Number(tower.maxHp),
    cooldown: Number(tower.cooldown),
  };
}

function serializeEnemyState(enemy) {
  return {
    id: enemy.id,
    lane: enemy.lane,
    kind: enemy.kind,
    progress: Number(enemy.progress),
    hp: Number(enemy.hp),
    maxHp: Number(enemy.maxHp),
    speed: Number(enemy.speed),
    reward: enemy.reward,
    coreDamage: enemy.coreDamage,
    siegeDamage: enemy.siegeDamage,
    siegeRate: Number(enemy.siegeRate),
    siegeCooldown: Number(enemy.siegeCooldown),
    slowTimer: Number(enemy.slowTimer),
    slowMul: Number(enemy.slowMul),
    weakTimer: Number(enemy.weakTimer),
    weakMul: Number(enemy.weakMul),
  };
}

function serializePlayerState(player) {
  return {
    id: player.id,
    name: player.name,
    lane: player.lane,
    joinedAt: player.joinedAt,
    lastSeenAt: player.lastSeenAt,
    offlineSince: player.offlineSince,
    kills: player.kills,
    builds: player.builds,
    actionQueue: Array.isArray(player.actionQueue)
      ? player.actionQueue.slice(-ACTION_MEMORY)
      : [],
  };
}

function serializeRoomState(room) {
  const laneTowers = {};
  for (const lane of LANES) {
    laneTowers[lane] = (room.laneTowers[lane] || Array.from({ length: SLOT_COUNT }, () => null))
      .slice(0, SLOT_COUNT)
      .map(serializeTowerState);
  }

  return {
    id: room.id,
    name: room.name,
    maxPlayers: room.maxPlayers || MAX_PLAYERS,
    activeLanes: roomLanes(room),
    createdAt: room.createdAt,
    lastActiveAt: room.lastActiveAt,
    coreHp: room.coreHp,
    coreHpMax: room.coreHpMax,
    teamGold: room.teamGold,
    kills: room.kills,
    wave: room.wave,
    phase: room.phase,
    waveState: room.waveState,
    waveCooldown: room.waveCooldown,
    spawnTimer: room.spawnTimer,
    spawnInterval: room.spawnInterval,
    laneSpawnRemain: { ...room.laneSpawnRemain },
    nextEnemyId: room.nextEnemyId,
    enemies: room.enemies.map(serializeEnemyState),
    players: Array.from(room.players.values()).map(serializePlayerState),
    laneTowers,
  };
}

function loadMultiStateRows() {
  try {
    if (!fs.existsSync(MULTI_STATE_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(MULTI_STATE_FILE, 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.rooms) ? parsed.rooms : []);
    if (!Array.isArray(rows)) return [];

    const recovered = [];
    const usedIds = new Set();
    for (const row of rows) {
      const room = hydrateRoomState(row);
      if (!room) continue;

      let roomId = room.id;
      if (!roomId || usedIds.has(roomId) || rooms.has(roomId)) {
        do {
          roomId = shortRoomId();
        } while (usedIds.has(roomId) || rooms.has(roomId));
      }
      room.id = roomId;
      usedIds.add(roomId);
      recovered.push(room);
      if (recovered.length >= MULTI_STATE_MAX_ROOMS) break;
    }
    return recovered;
  } catch (error) {
    console.warn('[sunken-multi-server] multi state load failed:', error?.message || error);
    return [];
  }
}

function saveMultiStateRows(force = false) {
  if (!force && !multiStateDirty) return;
  try {
    const payload = {
      version: 1,
      savedAt: Date.now(),
      rooms: Array.from(rooms.values()).map(serializeRoomState).slice(0, MULTI_STATE_MAX_ROOMS),
    };
    fs.mkdirSync(path.dirname(MULTI_STATE_FILE), { recursive: true });
    fs.writeFileSync(MULTI_STATE_FILE, JSON.stringify(payload, null, 2));
    multiStateDirty = false;
  } catch (error) {
    console.warn('[sunken-multi-server] multi state save failed:', error?.message || error);
  }
}

function restoreMultiStateToRooms() {
  const loaded = loadMultiStateRows();
  for (const room of loaded) {
    rooms.set(room.id, room);
  }
  if (loaded.length) {
    console.log(`[sunken-multi-server] restored rooms: ${loaded.length}`);
  }
}

function getLaneSlotProgress(slot) {
  const base = (slot + 1) / (SLOT_COUNT + 1);
  return clamp(base, 0.08, 0.92);
}

function chooseEnemyArchetype(wave) {
  const stage = Math.max(1, Math.floor(Number(wave) || 1));
  const nightmareIndex = Math.max(0, stage - 20);
  const roll = Math.random();
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
  if (roll < threshold) return 'crusher';
  threshold += elderChance;
  if (roll < threshold) return 'elder';
  threshold += raiderChance;
  if (roll < threshold) return 'raider';
  threshold += bruteChance;
  if (roll < threshold) return 'brute';
  threshold += hopperChance;
  if (roll < threshold) return 'hopper';
  if (roll < threshold + batChance) return 'bat';
  return 'ghoul';
}

function makeEnemy(room, lane, kindRaw) {
  const kind = normalizeEnemyKind(kindRaw);
  const wave = Math.max(1, Math.floor(Number(room.wave) || 1));
  const stageIndex = wave - 1;
  const earlyStageIndex = Math.min(stageIndex, 9);
  const lateIndex = Math.max(0, wave - 10);
  const nightmareIndex = Math.max(0, wave - 20);
  const waveScaleHp = (
    1
    + earlyStageIndex * 0.12
    + lateIndex * 0.08
    + lateIndex * lateIndex * 0.001
    + nightmareIndex * 0.2
    + nightmareIndex * nightmareIndex * 0.012
  );
  const waveScaleSpeed = 1 + stageIndex * 0.018 + lateIndex * 0.006 + nightmareIndex * 0.014;
  const rewardScale = 1 + stageIndex * 0.048 + nightmareIndex * 0.03;
  const table = {
    ghoul: { hp: 74, speed: 0.08, reward: 11, coreDamage: 1 },
    bat: { hp: 56, speed: 0.125, reward: 10, coreDamage: 1 },
    hopper: { hp: 48, speed: 0.15, reward: 13, coreDamage: 2 },
    brute: { hp: 164, speed: 0.068, reward: 20, coreDamage: 2 },
    elder: { hp: 258, speed: 0.062, reward: 26, coreDamage: 3 },
    raider: { hp: 132, speed: 0.102, reward: 23, coreDamage: 2 },
    crusher: { hp: 224, speed: 0.092, reward: 31, coreDamage: 3 },
    lord: { hp: 620, speed: 0.056, reward: 68, coreDamage: 5 },
  };

  const base = table[kind] || table.ghoul;
  return {
    id: room.nextEnemyId++,
    lane,
    kind,
    progress: 0,
    hp: Math.round(base.hp * waveScaleHp),
    maxHp: Math.round(base.hp * waveScaleHp),
    speed: base.speed * waveScaleSpeed,
    reward: Math.round(base.reward * rewardScale),
    coreDamage: base.coreDamage,
    slowTimer: 0,
    slowMul: 1,
    weakTimer: 0,
    weakMul: 1,
    siegeDamage: 0,
    siegeRate: 0,
    siegeCooldown: 0,
  };
}

function startWave(room, wave) {
  room.wave = wave;
  room.waveState = 'spawning';
  room.waveCooldown = 0;
  room.spawnTimer = 0;
  const earlyWave = Math.min(wave, 10);
  const lateIndex = Math.max(0, wave - 10);
  const nightmareIndex = Math.max(0, wave - 20);
  room.spawnInterval = clamp(
    0.62 - earlyWave * 0.018 - lateIndex * 0.008 - nightmareIndex * 0.005,
    0.18,
    0.62,
  );
  const lanes = roomLanes(room);

  const perLane = (
    7
    + Math.floor(wave * 1.7)
    + Math.floor(lateIndex * 0.6)
    + Math.floor(nightmareIndex * 1.2)
  );
  for (const lane of LANES) {
    room.laneSpawnRemain[lane] = lanes.includes(lane) ? perLane : 0;
  }

  if (wave >= 21) {
    for (const lane of lanes) {
      room.enemies.push(makeEnemy(room, lane, 'lord'));
    }
  } else if (wave % 5 === 0) {
    for (const lane of lanes) {
      room.enemies.push(makeEnemy(room, lane, 'lord'));
    }
  }
  if (wave >= 27) {
    for (const lane of lanes) {
      room.enemies.push(makeEnemy(room, lane, 'lord'));
    }
  }
}

function startPlayerRecord(playerId, name, lane) {
  return {
    id: playerId,
    name,
    lane,
    online: false,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
    offlineSince: 0,
    ws: null,
    kills: 0,
    builds: 0,
    actionSet: new Set(),
    actionQueue: [],
  };
}

function attachPlayerSocket(player, ws) {
  player.online = true;
  player.lastSeenAt = Date.now();
  player.offlineSince = 0;
  player.ws = ws;
  ws.playerId = player.id;
}

function detachPlayerSocket(player) {
  player.online = false;
  player.offlineSince = Date.now();
  player.ws = null;
}

function pickOpenLane(room) {
  for (const lane of roomLanes(room)) {
    const ownerId = room.laneOwners[lane];
    if (!ownerId) return lane;

    const owner = room.players.get(ownerId);
    if (!owner) {
      room.laneOwners[lane] = null;
      return lane;
    }

    if (!owner.online && owner.offlineSince > 0 && Date.now() - owner.offlineSince > OFFLINE_GRACE_MS) {
      room.players.delete(owner.id);
      room.laneOwners[lane] = null;
      return lane;
    }
  }
  return null;
}

function send(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcastRoom(room, payload) {
  const text = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (!player.online || !player.ws) continue;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(text);
    }
  }
}

function serializeEnemy(enemy) {
  return {
    id: enemy.id,
    lane: enemy.lane,
    kind: enemy.kind,
    progress: Number(enemy.progress.toFixed(4)),
    hp: Math.max(0, Math.round(enemy.hp)),
    maxHp: enemy.maxHp,
  };
}

function serializePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    lane: player.lane,
    online: player.online,
    kills: player.kills,
    builds: player.builds,
  };
}

function serializeRoom(room) {
  const lanes = {};
  for (const lane of LANES) {
    lanes[lane] = cloneLaneSlots(room.laneTowers[lane]);
  }

  const activeLanes = roomLanes(room);
  const queue = activeLanes.reduce((acc, lane) => acc + room.laneSpawnRemain[lane], 0);

  return {
    id: room.id,
    name: room.name,
    maxPlayers: room.maxPlayers || MAX_PLAYERS,
    activeLanes,
    phase: room.phase,
    wave: room.wave,
    waveState: room.waveState,
    waveCooldown: Number(room.waveCooldown.toFixed(2)),
    coreHp: Math.max(0, Math.round(room.coreHp)),
    coreHpMax: room.coreHpMax,
    teamGold: Math.max(0, Math.floor(room.teamGold)),
    kills: room.kills,
    queue,
    lanes,
    enemies: room.enemies.map(serializeEnemy),
    players: Array.from(room.players.values()).map(serializePlayer),
  };
}

function broadcastSnapshot(room) {
  broadcastRoom(room, {
    type: 'snapshot',
    room: serializeRoom(room),
    t: Date.now(),
  });
  room.lastSnapshotAt = Date.now();
}

function markAction(player, actionId) {
  if (!actionId) return false;
  if (player.actionSet.has(actionId)) return true;

  player.actionSet.add(actionId);
  player.actionQueue.push(actionId);

  while (player.actionQueue.length > ACTION_MEMORY) {
    const removed = player.actionQueue.shift();
    if (removed) player.actionSet.delete(removed);
  }

  return false;
}

function withPlayerRoom(ws) {
  if (!ws.roomId || !ws.playerId) return null;
  const room = rooms.get(ws.roomId);
  if (!room) return null;
  const player = room.players.get(ws.playerId);
  if (!player) return null;
  return { room, player };
}

function createTower(towerType, ownerId) {
  const spec = TOWER_TYPES[towerType];
  if (!spec) return null;
  return {
    type: towerType,
    owner: ownerId,
    hp: spec.hp,
    maxHp: spec.hp,
    cooldown: rand(0.05, 0.22),
  };
}

function applyAction(room, player, action) {
  if (!action || typeof action !== 'object') {
    return { ok: false, reason: '잘못된 액션' };
  }

  const actionId = String(action.actionId || '').slice(0, 40);
  if (markAction(player, actionId)) {
    return { ok: true, duplicate: true, reason: '중복 액션', actionId };
  }

  if (room.phase !== 'running') {
    return { ok: false, reason: '게임 종료됨', actionId };
  }

  const lane = String(action.lane || '');
  const slot = Number(action.slot);

  const activeLanes = roomLanes(room);
  if (!activeLanes.includes(lane)) {
    return { ok: false, reason: 'lane 오류', actionId };
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) {
    return { ok: false, reason: 'slot 오류', actionId };
  }
  if (lane !== player.lane) {
    return { ok: false, reason: '본인 라인만 조작 가능', actionId };
  }

  const slots = room.laneTowers[lane];
  const kind = String(action.kind || '');

  if (kind === 'build') {
    const towerType = String(action.towerType || '');
    const spec = TOWER_TYPES[towerType];
    if (!spec) return { ok: false, reason: '타워 종류 오류', actionId };
    if (slots[slot]) return { ok: false, reason: '이미 타워가 있음', actionId };
    if (room.teamGold < spec.cost) return { ok: false, reason: '골드 부족', actionId };

    const tower = createTower(towerType, player.id);
    if (!tower) return { ok: false, reason: '타워 생성 실패', actionId };

    room.teamGold -= spec.cost;
    slots[slot] = tower;
    player.builds += 1;
    room.lastActiveAt = Date.now();
    markMultiStateDirty();
    return { ok: true, actionId };
  }

  if (kind === 'sell') {
    const tower = slots[slot];
    if (!tower) return { ok: false, reason: '판매 대상 없음', actionId };

    const spec = TOWER_TYPES[tower.type] || TOWER_TYPES.sunken;
    room.teamGold += Math.round(spec.cost * spec.refund);
    slots[slot] = null;
    room.lastActiveAt = Date.now();
    markMultiStateDirty();
    return { ok: true, actionId };
  }

  return { ok: false, reason: '지원되지 않는 액션', actionId };
}

function pickTargetInRange(enemies, slotProgress, range) {
  let target = null;
  for (const enemy of enemies) {
    if (Math.abs(enemy.progress - slotProgress) > range) continue;
    if (!target || enemy.progress > target.progress) {
      target = enemy;
    }
  }
  return target;
}

function findTowerNearProgress(slots, progress, within) {
  let bestIndex = -1;
  let bestDist = Infinity;

  for (let i = 0; i < slots.length; i += 1) {
    const tower = slots[i];
    if (!tower) continue;

    const sp = getLaneSlotProgress(i);
    const d = Math.abs(sp - progress);
    if (d <= within && d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function cleanupDeadEnemies(room) {
  if (room.enemies.length === 0) return;
  const alive = [];
  for (const enemy of room.enemies) {
    if (enemy.hp <= 0) {
      room.teamGold += enemy.reward;
      room.kills += 1;

      const ownerLane = enemy.lane;
      const owner = Array.from(room.players.values()).find((p) => p.lane === ownerLane);
      if (owner) owner.kills += 1;
      continue;
    }

    alive.push(enemy);
  }
  room.enemies = alive;
}

function updateTowers(room, dt) {
  for (const lane of roomLanes(room)) {
    const slots = room.laneTowers[lane];
    const enemies = room.enemies.filter((enemy) => enemy.lane === lane);

    for (let i = 0; i < slots.length; i += 1) {
      const tower = slots[i];
      if (!tower) continue;

      const spec = TOWER_TYPES[tower.type] || TOWER_TYPES.sunken;
      if (tower.hp <= 0) {
        slots[i] = null;
        continue;
      }

      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;

      const slotProgress = getLaneSlotProgress(i);
      const target = pickTargetInRange(enemies, slotProgress, spec.range);
      if (!target) {
        tower.cooldown = 0.08;
        continue;
      }

      const weakMul = target.weakTimer > 0 ? target.weakMul : 1;
      target.hp -= spec.damage * weakMul;

      if (tower.type === 'snare') {
        target.slowTimer = Math.max(target.slowTimer, spec.slowSec);
        target.slowMul = Math.min(target.slowMul, spec.slowMul);
        target.weakTimer = Math.max(target.weakTimer, spec.slowSec);
        target.weakMul = Math.max(target.weakMul, spec.weakMul);
      }

      if (spec.pierce && spec.pierce > 0) {
        const near = enemies
          .filter((enemy) => enemy.id !== target.id && Math.abs(enemy.progress - target.progress) < 0.055)
          .slice(0, spec.pierce);

        for (const other of near) {
          other.hp -= spec.damage * 0.62;
        }
      }

      tower.cooldown = spec.reload;
    }
  }

  cleanupDeadEnemies(room);
}

function updateSiegeAttacks(room, dt) {
  for (const enemy of room.enemies) {
    if (enemy.siegeDamage <= 0) continue;

    enemy.siegeCooldown -= dt;
    if (enemy.siegeCooldown > 0) continue;

    const slots = room.laneTowers[enemy.lane];
    const targetIndex = findTowerNearProgress(slots, enemy.progress, 0.09);
    if (targetIndex < 0) {
      enemy.siegeCooldown = enemy.siegeRate;
      continue;
    }

    const tower = slots[targetIndex];
    if (tower) {
      tower.hp -= enemy.siegeDamage;
      if (tower.hp <= 0) {
        slots[targetIndex] = null;
      }
    }

    enemy.siegeCooldown = enemy.siegeRate;
  }
}

function updateEnemies(room, dt) {
  if (room.enemies.length === 0) return;

  const next = [];
  for (const enemy of room.enemies) {
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) {
        enemy.slowTimer = 0;
        enemy.slowMul = 1;
      }
    }

    if (enemy.weakTimer > 0) {
      enemy.weakTimer -= dt;
      if (enemy.weakTimer <= 0) {
        enemy.weakTimer = 0;
        enemy.weakMul = 1;
      }
    }

    const speedMul = enemy.slowTimer > 0 ? enemy.slowMul : 1;
    enemy.progress += enemy.speed * speedMul * dt;

    if (enemy.progress >= 1) {
      room.coreHp -= enemy.coreDamage;
      continue;
    }

    next.push(enemy);
  }

  room.enemies = next;
}

function spawnStep(room) {
  let spawned = false;
  const lanes = roomLanes(room);

  for (const lane of lanes) {
    if (room.laneSpawnRemain[lane] <= 0) continue;

    room.laneSpawnRemain[lane] -= 1;
    room.enemies.push(makeEnemy(room, lane, chooseEnemyArchetype(room.wave)));
    spawned = true;
  }

  if (!spawned) return;

  if (room.wave >= 8 && Math.random() < 0.34 && lanes.length) {
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    let extraType = 'raider';
    if (room.wave >= 13 && Math.random() < 0.34) {
      extraType = 'hopper';
    } else if (room.wave >= 8 && Math.random() < 0.44) {
      extraType = 'crusher';
    }
    if (room.wave >= 18 && Math.random() < 0.22) {
      extraType = 'elder';
    }
    room.enemies.push(makeEnemy(room, lane, extraType));
  }
}

function hasRemainingSpawn(room) {
  return roomLanes(room).some((lane) => room.laneSpawnRemain[lane] > 0);
}

function updateWave(room, dt) {
  if (room.phase !== 'running') return;

  if (room.waveState === 'spawning') {
    room.spawnTimer -= dt;
    if (room.spawnTimer <= 0) {
      spawnStep(room);
      room.spawnTimer = room.spawnInterval;
    }

    if (!hasRemainingSpawn(room) && room.enemies.length === 0) {
      room.waveState = 'cooldown';
      room.waveCooldown = 3.8;
      room.teamGold += 46 + Math.round(room.wave * 3.5);
    }
    return;
  }

  if (room.waveState === 'cooldown') {
    room.waveCooldown -= dt;
    if (room.waveCooldown <= 0) {
      startWave(room, room.wave + 1);
    }
  }
}

function cleanupOfflinePlayers(room, now) {
  let removed = false;
  for (const player of room.players.values()) {
    if (player.online || player.offlineSince <= 0) continue;

    if (now - player.offlineSince <= OFFLINE_GRACE_MS) continue;

    room.players.delete(player.id);
    if (room.laneOwners[player.lane] === player.id) {
      room.laneOwners[player.lane] = null;
    }
    removed = true;
  }
  if (removed) {
    markMultiStateDirty();
  }
}

function updateRoom(room, now, dt) {
  cleanupOfflinePlayers(room, now);

  if (room.players.size === 0 && now - room.lastActiveAt > ROOM_IDLE_MS) {
    removeRoom(room.id);
    return;
  }

  if (room.phase === 'running') {
    updateWave(room, dt);
    updateTowers(room, dt);
    updateEnemies(room, dt);

    if (room.coreHp <= 0) {
      room.coreHp = 0;
      room.phase = 'defeat';
      room.waveState = 'ended';
      room.waveCooldown = 0;
    }
  }

  if (now - room.lastSnapshotAt >= SNAPSHOT_MS) {
    broadcastSnapshot(room);
  }

  // 진행 중인 라운드 상태는 끊김 복구를 위해 주기적으로 스냅샷 저장 대상에 포함한다.
  if (
    room.phase === 'running'
    && (room.players.size > 0 || room.enemies.length > 0 || hasRemainingSpawn(room) || room.waveState === 'cooldown')
  ) {
    markMultiStateDirty();
  }
}

function leaveRoom(ws, shouldDestroyPlayer = false) {
  if (!ws.roomId || !ws.playerId) return;

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.roomId = '';
    ws.playerId = '';
    return;
  }

  const player = room.players.get(ws.playerId);
  if (player) {
    if (shouldDestroyPlayer) {
      room.players.delete(player.id);
      if (room.laneOwners[player.lane] === player.id) {
        room.laneOwners[player.lane] = null;
      }
    } else {
      detachPlayerSocket(player);
    }
    room.lastActiveAt = Date.now();
    markMultiStateDirty();
  }

  broadcastRoom(room, {
    type: 'room_notice',
    message: player ? `${player.name} ${shouldDestroyPlayer ? '퇴장' : '오프라인'}` : '플레이어 상태 변경',
  });

  ws.roomId = '';
  ws.playerId = '';
}

function resetRoomForNewRun(room) {
  room.coreHp = room.coreHpMax;
  room.teamGold = 320;
  room.kills = 0;
  room.phase = 'running';
  room.waveState = 'spawning';
  room.waveCooldown = 0;
  room.spawnTimer = 0;
  room.enemies = [];

  for (const lane of LANES) {
    room.laneSpawnRemain[lane] = 0;
    room.laneTowers[lane] = Array.from({ length: SLOT_COUNT }, () => null);
  }

  for (const player of room.players.values()) {
    player.kills = 0;
    player.builds = 0;
  }

  startWave(room, 1);
  markMultiStateDirty();
}

function joinRoom(ws, roomId, playerId, playerName) {
  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', message: '방을 찾을 수 없습니다.' });
    return;
  }

  let player = room.players.get(playerId);

  if (!player) {
    if (room.players.size >= (room.maxPlayers || MAX_PLAYERS)) {
      send(ws, { type: 'error', message: '방이 가득 찼습니다.' });
      return;
    }

    const openLane = pickOpenLane(room);
    if (!openLane) {
      send(ws, { type: 'error', message: '빈 라인이 없습니다.' });
      return;
    }

    player = startPlayerRecord(playerId, playerName, openLane);
    room.players.set(player.id, player);
    room.laneOwners[openLane] = player.id;
  }

  if (player.ws && player.ws !== ws) {
    player.ws.roomId = '';
    player.ws.playerId = '';
    try {
      player.ws.close();
    } catch (error) {
      // ignore
    }
  }

  leaveRoom(ws, true);
  attachPlayerSocket(player, ws);

  ws.roomId = room.id;
  ws.playerId = player.id;

  // 패배 상태 방은 재입장 시 즉시 새 런으로 초기화해 "배치 불가" 상태를 없앤다.
  if (room.phase !== 'running' || room.coreHp <= 0) {
    resetRoomForNewRun(room);
    broadcastRoom(room, {
      type: 'room_notice',
      message: '방이 새 라운드로 초기화되었습니다.',
    });
  }

  room.lastActiveAt = Date.now();
  markMultiStateDirty();
  send(ws, {
    type: 'joined',
    roomId: room.id,
    roomName: room.name,
    playerId: player.id,
    lane: player.lane,
    laneLabel: laneLabel(player.lane),
  });

  broadcastRoom(room, {
    type: 'room_notice',
    message: `${player.name} 입장 (${laneLabel(player.lane)})`,
  });

  broadcastSnapshot(room);
}

const server = http.createServer((req, res) => {
  const payload = {
    ok: true,
    service: 'sunken-multi-server',
    port: PORT,
    rooms: Array.from(rooms.values()).map(roomSummary),
    singlePlayersCount: singlePlayerRows.length,
    singleLeaderboardTop: listSingleRankRows(10),
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
});

const wss = new WebSocket.Server({ server });

function broadcastRoomsToAll() {
  const payload = JSON.stringify(listRoomsPayload());
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(payload);
  }
}

function broadcastSingleRanksToAll(limit = 10) {
  const payload = JSON.stringify({
    type: 'single_rank_list',
    entries: listSingleRankRows(limit),
    t: Date.now(),
  });
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(payload);
  }
}

wss.on('connection', (ws) => {
  ws.identity = {
    playerId: safePlayerId(''),
    name: safePlayerName(''),
  };
  ws.roomId = '';
  ws.playerId = '';

  send(ws, {
    type: 'welcome',
    playerId: ws.identity.playerId,
    name: ws.identity.name,
  });

  send(ws, listRoomsPayload());
  send(ws, {
    type: 'single_rank_list',
    entries: listSingleRankRows(10),
    t: Date.now(),
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (error) {
      send(ws, { type: 'error', message: 'JSON 형식 오류' });
      return;
    }

    if (!msg || typeof msg.type !== 'string') {
      send(ws, { type: 'error', message: 'type 누락' });
      return;
    }

    if (msg.type === 'set_identity') {
      ws.identity.playerId = safePlayerId(msg.playerId);
      ws.identity.name = safePlayerName(msg.name);
      registerSinglePlayer({
        playerId: ws.identity.playerId,
        name: ws.identity.name,
      });
      send(ws, {
        type: 'welcome',
        playerId: ws.identity.playerId,
        name: ws.identity.name,
      });
      return;
    }

    if (msg.type === 'single_rank_register') {
      const registered = registerSinglePlayer({
        playerId: msg.playerId || ws.identity.playerId,
        name: msg.name || ws.identity.name,
      });
      if (!registered) {
        send(ws, { type: 'error', message: '플레이어 등록 실패' });
        return;
      }
      ws.identity.playerId = registered.playerId;
      ws.identity.name = registered.playerName;
      send(ws, {
        type: 'single_rank_registered',
        playerId: registered.playerId,
        name: registered.playerName,
        updatedAt: registered.updatedAt,
      });
      return;
    }

    if (msg.type === 'list_rooms') {
      send(ws, listRoomsPayload());
      return;
    }

    if (msg.type === 'single_rank_list') {
      send(ws, {
        type: 'single_rank_list',
        entries: listSingleRankRows(msg.limit),
        t: Date.now(),
      });
      return;
    }

    if (msg.type === 'single_rank_submit') {
      registerSinglePlayer({
        playerId: msg.playerId || ws.identity.playerId,
        name: msg.name || ws.identity.name,
      });
      const result = submitSingleRank({
        playerId: msg.playerId || ws.identity.playerId,
        name: msg.name || ws.identity.name,
        stage: msg.stage,
        kills: msg.kills,
        score: msg.score,
        updatedAt: Date.now(),
      });

      if (!result.ok) {
        send(ws, { type: 'error', message: '랭킹 제출 실패' });
        return;
      }

      send(ws, {
        type: 'single_rank_ack',
        ok: true,
        rank: result.rank,
        entries: listSingleRankRows(msg.limit),
        t: Date.now(),
      });
      broadcastSingleRanksToAll(10);
      return;
    }

    if (msg.type === 'create_room') {
      const room = createRoom(msg.roomName, msg.maxPlayers);
      joinRoom(ws, room.id, ws.identity.playerId, ws.identity.name);
      broadcastRoomsToAll();
      return;
    }

    if (msg.type === 'join_room') {
      const roomId = String(msg.roomId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!roomId) {
        send(ws, { type: 'error', message: 'roomId 오류' });
        return;
      }

      joinRoom(ws, roomId, ws.identity.playerId, ws.identity.name);
      broadcastRoomsToAll();
      return;
    }

    if (msg.type === 'leave_room') {
      leaveRoom(ws, true);
      send(ws, { type: 'left' });
      broadcastRoomsToAll();
      return;
    }

    if (msg.type === 'action') {
      const joined = withPlayerRoom(ws);
      if (!joined) {
        send(ws, { type: 'error', message: '먼저 방에 입장하세요.' });
        return;
      }

      const result = applyAction(joined.room, joined.player, msg.action);
      send(ws, {
        type: 'action_ack',
        actionId: result.actionId || '',
        ok: Boolean(result.ok),
        duplicate: Boolean(result.duplicate),
        reason: result.reason || '',
      });

      if (result.ok) {
        broadcastSnapshot(joined.room);
      }

      return;
    }

    if (msg.type === 'ping') {
      send(ws, { type: 'pong', t: Date.now() });
      return;
    }

    send(ws, { type: 'error', message: `지원하지 않는 type: ${msg.type}` });
  });

  ws.on('close', () => {
    leaveRoom(ws, false);
    broadcastRoomsToAll();
  });

  ws.on('error', () => {
    leaveRoom(ws, false);
    broadcastRoomsToAll();
  });
});

restoreMultiStateToRooms();

setInterval(() => {
  const now = Date.now();
  const dt = TICK_MS / 1000;
  for (const room of rooms.values()) {
    updateRoom(room, now, dt);
  }
}, TICK_MS);

setInterval(() => {
  broadcastRoomsToAll();
}, ROOMS_BROADCAST_MS);

setInterval(() => {
  saveMultiStateRows(false);
}, MULTI_STATE_SAVE_MS);

let shuttingDown = false;
function shutdownWithFlush(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[sunken-multi-server] ${signal} received, flushing state...`);
  saveMultiStateRows(true);
  saveSingleRankRows(singleRankRows);
  saveSinglePlayerRows(singlePlayerRows);
  for (const client of wss.clients) {
    try {
      client.close();
    } catch (error) {
      // ignore
    }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 450).unref();
}

process.on('SIGINT', () => shutdownWithFlush('SIGINT'));
process.on('SIGTERM', () => shutdownWithFlush('SIGTERM'));
process.on('beforeExit', () => {
  saveMultiStateRows(true);
});
process.on('uncaughtException', (error) => {
  console.error('[sunken-multi-server] uncaughtException:', error);
  saveMultiStateRows(true);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[sunken-multi-server] listening on 0.0.0.0:${PORT}`);
});
