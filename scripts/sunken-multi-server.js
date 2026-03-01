const http = require('http');
const crypto = require('crypto');
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

const LANES = ['north', 'east', 'south', 'west'];

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

function createRoom(name) {
  let id = shortRoomId();
  while (rooms.has(id)) id = shortRoomId();

  const now = Date.now();
  const room = {
    id,
    name: safeRoomName(name),
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
  return room;
}

function removeRoom(roomId) {
  rooms.delete(roomId);
}

function roomSummary(room) {
  const online = Array.from(room.players.values()).filter((p) => p.online).length;
  const total = room.players.size;
  return {
    id: room.id,
    name: room.name,
    online,
    total,
    cap: MAX_PLAYERS,
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

function getLaneSlotProgress(slot) {
  const base = (slot + 1) / (SLOT_COUNT + 1);
  return clamp(base, 0.08, 0.92);
}

function chooseEnemyArchetype(wave) {
  const roll = Math.random();
  if (wave < 3) {
    return roll < 0.76 ? 'ghoul' : 'runner';
  }
  if (wave < 6) {
    if (roll < 0.52) return 'ghoul';
    if (roll < 0.82) return 'runner';
    return 'brute';
  }
  if (wave < 10) {
    if (roll < 0.38) return 'ghoul';
    if (roll < 0.66) return 'runner';
    if (roll < 0.9) return 'brute';
    return 'siege';
  }

  if (roll < 0.3) return 'runner';
  if (roll < 0.58) return 'brute';
  if (roll < 0.82) return 'siege';
  return 'raider';
}

function makeEnemy(room, lane, kind) {
  const waveScaleHp = 1 + (room.wave - 1) * 0.16;
  const waveScaleSpeed = 1 + (room.wave - 1) * 0.032;

  const table = {
    ghoul: { hp: 74, speed: 0.08, reward: 11, coreDamage: 1, siegeDamage: 0, siegeRate: 0 },
    runner: { hp: 58, speed: 0.122, reward: 10, coreDamage: 1, siegeDamage: 0, siegeRate: 0 },
    brute: { hp: 160, speed: 0.064, reward: 20, coreDamage: 2, siegeDamage: 0, siegeRate: 0 },
    siege: { hp: 220, speed: 0.054, reward: 28, coreDamage: 3, siegeDamage: 24, siegeRate: 1.25 },
    raider: { hp: 130, speed: 0.095, reward: 22, coreDamage: 2, siegeDamage: 12, siegeRate: 1.4 },
    boss: { hp: 560, speed: 0.046, reward: 64, coreDamage: 8, siegeDamage: 34, siegeRate: 1.0 },
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
    reward: Math.round(base.reward * (1 + (room.wave - 1) * 0.05)),
    coreDamage: base.coreDamage,
    slowTimer: 0,
    slowMul: 1,
    weakTimer: 0,
    weakMul: 1,
    siegeDamage: Math.round(base.siegeDamage * (1 + (room.wave - 1) * 0.08)),
    siegeRate: base.siegeRate,
    siegeCooldown: rand(0.2, 0.8),
  };
}

function startWave(room, wave) {
  room.wave = wave;
  room.waveState = 'spawning';
  room.waveCooldown = 0;
  room.spawnTimer = 0;
  room.spawnInterval = clamp(1.05 - (wave - 1) * 0.032, 0.32, 1.05);

  const perLane = 5 + Math.floor(wave * 1.9);
  for (const lane of LANES) {
    room.laneSpawnRemain[lane] = perLane;
  }

  if (wave % 5 === 0) {
    for (const lane of LANES) {
      room.enemies.push(makeEnemy(room, lane, 'boss'));
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
  for (const lane of LANES) {
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

  const queue = LANES.reduce((acc, lane) => acc + room.laneSpawnRemain[lane], 0);

  return {
    id: room.id,
    name: room.name,
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

  if (!LANES.includes(lane)) {
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
    return { ok: true, actionId };
  }

  if (kind === 'sell') {
    const tower = slots[slot];
    if (!tower) return { ok: false, reason: '판매 대상 없음', actionId };

    const spec = TOWER_TYPES[tower.type] || TOWER_TYPES.sunken;
    room.teamGold += Math.round(spec.cost * spec.refund);
    slots[slot] = null;
    room.lastActiveAt = Date.now();
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
  for (const lane of LANES) {
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

  for (const lane of LANES) {
    if (room.laneSpawnRemain[lane] <= 0) continue;

    room.laneSpawnRemain[lane] -= 1;
    room.enemies.push(makeEnemy(room, lane, chooseEnemyArchetype(room.wave)));
    spawned = true;
  }

  if (!spawned) return;

  if (room.wave >= 8 && Math.random() < 0.34) {
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    room.enemies.push(makeEnemy(room, lane, 'siege'));
  }
}

function hasRemainingSpawn(room) {
  return LANES.some((lane) => room.laneSpawnRemain[lane] > 0);
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
  for (const player of room.players.values()) {
    if (player.online || player.offlineSince <= 0) continue;

    if (now - player.offlineSince <= OFFLINE_GRACE_MS) continue;

    room.players.delete(player.id);
    if (room.laneOwners[player.lane] === player.id) {
      room.laneOwners[player.lane] = null;
    }
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
    updateSiegeAttacks(room, dt);
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
  }

  broadcastRoom(room, {
    type: 'room_notice',
    message: player ? `${player.name} ${shouldDestroyPlayer ? '퇴장' : '오프라인'}` : '플레이어 상태 변경',
  });

  ws.roomId = '';
  ws.playerId = '';
}

function joinRoom(ws, roomId, playerId, playerName) {
  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', message: '방을 찾을 수 없습니다.' });
    return;
  }

  let player = room.players.get(playerId);

  if (!player) {
    if (room.players.size >= MAX_PLAYERS) {
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

  room.lastActiveAt = Date.now();
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
      send(ws, {
        type: 'welcome',
        playerId: ws.identity.playerId,
        name: ws.identity.name,
      });
      return;
    }

    if (msg.type === 'list_rooms') {
      send(ws, listRoomsPayload());
      return;
    }

    if (msg.type === 'create_room') {
      const room = createRoom(msg.roomName);
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[sunken-multi-server] listening on 0.0.0.0:${PORT}`);
});
