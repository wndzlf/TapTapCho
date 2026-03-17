const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');
const { levels: LEVELS } = require('../webgame-45/shared-levels.js');

const PORT = Number(process.env.TWIN_TEMPLE_PORT || 9092);
const TICK_MS = 33;
const SNAPSHOT_MS = 50;
const ROOMS_BROADCAST_MS = 1200;
const ROOM_IDLE_MS = 20 * 60 * 1000;
const OFFLINE_GRACE_MS = 4 * 60 * 1000;

const WIDTH = 960;
const HEIGHT = 540;
const GRAVITY = 1850;
const MOVE_ACCEL = 2600;
const MOVE_DRAG = 2200;
const MAX_SPEED = 245;
const MAX_FALL = 1000;
const JUMP_SPEED = 880;
const COYOTE_TIME = 0.14;
const RESPAWN_MS = 680;

const STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  RESPAWN: 'respawn',
  CLEAR: 'clear',
  DONE: 'done',
};

function rect(x, y, w, h) {
  return { x, y, w, h };
}

const rooms = new Map();
let lastRoomsBroadcastAt = 0;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function nowMs() {
  return Date.now();
}

function randomId(prefix = 'id') {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 14)}`;
}

function shortRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function safeName(raw) {
  const name = String(raw || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 14);
  return name || `Player${Math.floor(100 + Math.random() * 900)}`;
}

function safeRoomName(raw) {
  const room = String(raw || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 22);
  return room || 'Twin Temple Room';
}

function safePlayerId(raw) {
  const id = String(raw || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
  return id || randomId('p');
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function makeActor(element, spawn) {
  return {
    element,
    x: spawn.x,
    y: spawn.y,
    w: 30,
    h: 42,
    vx: 0,
    vy: 0,
    onGround: false,
    coyote: COYOTE_TIME,
    inExit: false,
  };
}

function createDoor(data) {
  return {
    ...data,
    baseY: data.y,
    currentY: data.y,
    progress: 0,
    unlocked: false,
  };
}

function hardBounds() {
  return [
    rect(-40, 0, 40, HEIGHT),
    rect(WIDTH, 0, 40, HEIGHT),
    rect(0, -40, WIDTH, 40),
    rect(0, HEIGHT, WIDTH, 40),
  ];
}

function send(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcastRoom(room, payload) {
  for (const player of room.players.values()) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(payload));
    }
  }
}

function roomSummary(room) {
  const online = Array.from(room.players.values()).filter((p) => p.online).length;
  return {
    id: room.id,
    name: room.name,
    online,
    total: room.players.size,
    cap: 2,
    level: room.levelIndex + 1,
    state: room.state,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      online: p.online,
    })),
  };
}

function broadcastRooms() {
  const payload = {
    type: 'rooms',
    rooms: Array.from(rooms.values())
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
      .map(roomSummary),
  };

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }
}

function loadLevel(room, index) {
  room.levelIndex = clamp(Math.floor(index || 0), 0, LEVELS.length - 1);
  const level = LEVELS[room.levelIndex];
  room.solids = level.solids.map((s) => ({ ...s }));
  room.hazards = level.hazards.map((h) => ({ ...h }));
  room.buttons = level.buttons.map((b) => ({ ...b, pressed: false }));
  room.doors = level.doors.map(createDoor);
  room.exits = level.exits.map((e) => ({ ...e }));
  room.actors = {
    ember: makeActor('ember', level.spawns.ember),
    aqua: makeActor('aqua', level.spawns.aqua),
  };

  for (const player of room.players.values()) {
    player.prevJump = false;
    player.input = { left: false, right: false, jump: false };
  }
}

function allSolids(room) {
  const solids = room.solids.slice();
  const bounds = hardBounds();
  for (let i = 0; i < bounds.length; i += 1) solids.push(bounds[i]);
  for (let i = 0; i < room.doors.length; i += 1) {
    const d = room.doors[i];
    if (d.progress < 0.98) {
      solids.push({ x: d.x, y: d.currentY, w: d.w, h: d.h });
    }
  }
  return solids;
}

function resolveHorizontal(actor, solids, prevX) {
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    if (!overlap(actor, s)) continue;
    if (prevX + actor.w <= s.x) {
      actor.x = s.x - actor.w;
      actor.vx = 0;
    } else if (prevX >= s.x + s.w) {
      actor.x = s.x + s.w;
      actor.vx = 0;
    }
  }
}

function resolveVertical(actor, solids, prevY) {
  actor.onGround = false;
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    if (!overlap(actor, s)) continue;
    if (prevY + actor.h <= s.y) {
      actor.y = s.y - actor.h;
      actor.vy = 0;
      actor.onGround = true;
    } else if (prevY >= s.y + s.h) {
      actor.y = s.y + s.h;
      if (actor.vy < 0) actor.vy = 0;
    }
  }
}

function updateButtonsAndDoors(room, dt) {
  const actors = [room.actors.ember, room.actors.aqua];
  for (let i = 0; i < room.buttons.length; i += 1) {
    const b = room.buttons[i];
    b.pressed = false;
    for (let j = 0; j < actors.length; j += 1) {
      const actor = actors[j];
      if (actor.element !== b.element) continue;
      const feet = { x: actor.x + 4, y: actor.y + actor.h - 8, w: actor.w - 8, h: 10 };
      if (overlap(feet, b)) {
        b.pressed = true;
        break;
      }
    }
  }

  for (let i = 0; i < room.doors.length; i += 1) {
    const door = room.doors[i];
    let active = false;
    for (let j = 0; j < room.buttons.length; j += 1) {
      const b = room.buttons[j];
      if (b.target === door.id && b.pressed) {
        active = true;
        break;
      }
    }
    if (active) door.unlocked = true;
    const target = door.unlocked ? 1 : 0;
    const speed = 2.9;
    door.progress += (target - door.progress) * Math.min(1, speed * dt);
    door.currentY = door.baseY - door.lift * door.progress;
  }
}

function inputForRole(room, role) {
  const playerId = room.roleOwners[role];
  if (!playerId) return { left: false, right: false, jump: false, prevJump: false };
  const player = room.players.get(playerId);
  if (!player || !player.online) return { left: false, right: false, jump: false, prevJump: false };
  return {
    left: !!player.input.left,
    right: !!player.input.right,
    jump: !!player.input.jump,
    prevJump: !!player.prevJump,
  };
}

function updateActors(room, dt) {
  const solids = allSolids(room);
  const roles = ['ember', 'aqua'];

  for (let i = 0; i < roles.length; i += 1) {
    const role = roles[i];
    const actor = room.actors[role];
    const control = inputForRole(room, role);
    const move = (control.right ? 1 : 0) - (control.left ? 1 : 0);
    if (move !== 0) {
      actor.vx += move * MOVE_ACCEL * dt;
    } else {
      const drag = MOVE_DRAG * dt;
      if (Math.abs(actor.vx) <= drag) actor.vx = 0;
      else actor.vx -= Math.sign(actor.vx) * drag;
    }

    actor.vx = clamp(actor.vx, -MAX_SPEED, MAX_SPEED);

    actor.vy = Math.min(MAX_FALL, actor.vy + GRAVITY * dt);

    const prevX = actor.x;
    actor.x += actor.vx * dt;
    resolveHorizontal(actor, solids, prevX);

    const prevY = actor.y;
    actor.y += actor.vy * dt;
    resolveVertical(actor, solids, prevY);
  }

  for (const role of roles) {
    const playerId = room.roleOwners[role];
    if (!playerId) continue;
    const player = room.players.get(playerId);
    if (!player) continue;
    player.prevJump = !!player.input.jump;
  }
}

function killRun(room, message) {
  if (room.state !== STATE.RUNNING) return;
  room.deaths += 1;
  room.state = STATE.RESPAWN;
  room.message = message || 'Respawn';
  room.respawnAt = nowMs() + RESPAWN_MS;
}

function checkHazards(room) {
  const actors = [room.actors.ember, room.actors.aqua];
  for (let i = 0; i < actors.length; i += 1) {
    const actor = actors[i];
    for (let j = 0; j < room.hazards.length; j += 1) {
      const h = room.hazards[j];
      if (!overlap(actor, h)) continue;
      if (h.kind === 'acid') {
        killRun(room, 'Acid trap');
        return;
      }
      if (h.kind !== actor.element) {
        killRun(room, h.kind === 'fire' ? 'Aqua hit by fire' : 'Ember hit by water');
        return;
      }
    }
  }
}

function checkExits(room) {
  const map = { ember: false, aqua: false };
  const actors = [room.actors.ember, room.actors.aqua];

  for (let i = 0; i < actors.length; i += 1) {
    const actor = actors[i];
    actor.inExit = false;
    for (let j = 0; j < room.exits.length; j += 1) {
      const ex = room.exits[j];
      if (ex.element !== actor.element) continue;
      if (overlap(actor, ex)) {
        actor.inExit = true;
        map[actor.element] = true;
      }
    }
  }

  if (map.ember && map.aqua) {
    if (room.levelIndex >= LEVELS.length - 1) {
      room.state = STATE.DONE;
      room.message = 'Temple complete';
      return;
    }
    room.state = STATE.CLEAR;
    room.message = 'Stage clear';
  }
}

function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    state: room.state,
    message: room.message,
    levelIndex: room.levelIndex,
    levelCount: LEVELS.length,
    levelName: LEVELS[room.levelIndex].name,
    timer: Number(room.timer.toFixed(2)),
    deaths: room.deaths,
    playersOnline: Array.from(room.players.values()).filter((p) => p.online).length,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      online: p.online,
    })),
    solids: room.solids,
    hazards: room.hazards,
    buttons: room.buttons,
    doors: room.doors.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.currentY,
      w: d.w,
      h: d.h,
      progress: Number(d.progress.toFixed(3)),
      color: d.color,
      unlocked: !!d.unlocked,
    })),
    exits: room.exits,
    actors: {
      ember: room.actors.ember,
      aqua: room.actors.aqua,
    },
  };
}

function broadcastSnapshot(room) {
  broadcastRoom(room, { type: 'snapshot', room: serializeRoom(room) });
  room.lastSnapshotAt = nowMs();
}

function roleLabel(role) {
  if (role === 'ember') return 'Ember (fire)';
  return 'Aqua (water)';
}

function createRoom(roomName) {
  let id = shortRoomId();
  while (rooms.has(id)) id = shortRoomId();

  const room = {
    id,
    name: safeRoomName(roomName),
    createdAt: nowMs(),
    lastActiveAt: nowMs(),
    state: STATE.IDLE,
    message: 'Waiting for 2 players',
    levelIndex: 0,
    timer: 0,
    deaths: 0,
    respawnAt: 0,
    players: new Map(),
    roleOwners: { ember: null, aqua: null },
    solids: [],
    hazards: [],
    buttons: [],
    doors: [],
    exits: [],
    actors: { ember: makeActor('ember', { x: 0, y: 0 }), aqua: makeActor('aqua', { x: 0, y: 0 }) },
    lastSnapshotAt: 0,
  };

  loadLevel(room, 0);
  rooms.set(id, room);
  return room;
}

function pickRole(room, playerId) {
  if (room.roleOwners.ember === playerId) return 'ember';
  if (room.roleOwners.aqua === playerId) return 'aqua';
  if (!room.roleOwners.ember) return 'ember';
  if (!room.roleOwners.aqua) return 'aqua';
  return '';
}

function joinedBySocket(ws) {
  if (!ws.roomId || !ws.playerId) return null;
  const room = rooms.get(ws.roomId);
  if (!room) return null;
  const player = room.players.get(ws.playerId);
  if (!player) return null;
  return { room, player };
}

function setRoomWaitingIfNeeded(room) {
  const both = room.roleOwners.ember && room.roleOwners.aqua;
  if (!both && room.state !== STATE.DONE) {
    room.state = STATE.IDLE;
    room.message = 'Waiting for 2 players';
  }
}

function joinRoom(ws, roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', message: 'Room not found' });
    return;
  }

  const identity = ws.identity || { playerId: randomId('p'), name: safeName('') };
  let player = room.players.get(identity.playerId);

  if (!player) {
    if (room.players.size >= 2) {
      send(ws, { type: 'error', message: 'Room full (2/2)' });
      return;
    }

    const role = pickRole(room, identity.playerId);
    if (!role) {
      send(ws, { type: 'error', message: 'No role slot left' });
      return;
    }

    player = {
      id: identity.playerId,
      name: safeName(identity.name),
      role,
      online: true,
      ws,
      lastSeenAt: nowMs(),
      input: { left: false, right: false, jump: false },
      prevJump: false,
    };

    room.players.set(player.id, player);
    room.roleOwners[role] = player.id;
  } else {
    player.online = true;
    player.ws = ws;
    player.name = safeName(identity.name || player.name);
    player.lastSeenAt = nowMs();
  }

  ws.roomId = room.id;
  ws.playerId = player.id;
  room.lastActiveAt = nowMs();
  setRoomWaitingIfNeeded(room);

  send(ws, {
    type: 'joined',
    roomId: room.id,
    roomName: room.name,
    role: player.role,
    roleLabel: roleLabel(player.role),
  });

  broadcastRoom(room, {
    type: 'room_notice',
    message: `${player.name} joined as ${player.role}`,
  });
  broadcastSnapshot(room);
  broadcastRooms();
}

function leaveCurrentRoom(ws, markOffline = true) {
  const joined = joinedBySocket(ws);
  if (!joined) {
    ws.roomId = '';
    ws.playerId = '';
    return;
  }

  const { room, player } = joined;
  if (markOffline) {
    player.online = false;
    player.ws = null;
    player.lastSeenAt = nowMs();
    player.input = { left: false, right: false, jump: false };
  } else {
    room.players.delete(player.id);
    if (room.roleOwners[player.role] === player.id) {
      room.roleOwners[player.role] = null;
    }
  }

  ws.roomId = '';
  ws.playerId = '';
  room.lastActiveAt = nowMs();
  setRoomWaitingIfNeeded(room);

  broadcastRoom(room, {
    type: 'room_notice',
    message: `${player.name} left`,
  });
  broadcastSnapshot(room);
  broadcastRooms();
}

function handleInput(ws, msg) {
  const joined = joinedBySocket(ws);
  if (!joined) return;
  const { room, player } = joined;
  const state = msg.state && typeof msg.state === 'object' ? msg.state : {};
  player.input = {
    left: !!state.left,
    right: !!state.right,
    jump: !!state.jump,
  };
  player.lastSeenAt = nowMs();
  room.lastActiveAt = nowMs();
}

function handleStartRun(ws) {
  const joined = joinedBySocket(ws);
  if (!joined) return;
  const { room } = joined;
  const hasBoth = room.roleOwners.ember && room.roleOwners.aqua;
  if (!hasBoth) {
    send(ws, { type: 'error', message: 'Need 2 players (Ember + Aqua)' });
    return;
  }
  if (room.state === STATE.DONE) {
    room.timer = 0;
    room.deaths = 0;
    loadLevel(room, 0);
  }
  room.state = STATE.RUNNING;
  room.message = 'Running';
  room.lastActiveAt = nowMs();
  broadcastSnapshot(room);
}

function handleRestartLevel(ws) {
  const joined = joinedBySocket(ws);
  if (!joined) return;
  const { room } = joined;
  if (!(room.roleOwners.ember && room.roleOwners.aqua)) {
    send(ws, { type: 'error', message: 'Need 2 players to restart' });
    return;
  }
  loadLevel(room, room.levelIndex);
  room.state = STATE.RUNNING;
  room.message = 'Running';
  room.lastActiveAt = nowMs();
  broadcastSnapshot(room);
}

function handleNextLevel(ws) {
  const joined = joinedBySocket(ws);
  if (!joined) return;
  const { room } = joined;
  if (room.state !== STATE.CLEAR) {
    send(ws, { type: 'error', message: 'Next level is available after clear' });
    return;
  }
  loadLevel(room, room.levelIndex + 1);
  room.state = STATE.RUNNING;
  room.message = 'Running';
  room.lastActiveAt = nowMs();
  broadcastSnapshot(room);
}

function updateRoom(room, now, dt) {
  for (const player of room.players.values()) {
    if (!player.online && now - player.lastSeenAt > OFFLINE_GRACE_MS) {
      room.players.delete(player.id);
      if (room.roleOwners[player.role] === player.id) {
        room.roleOwners[player.role] = null;
      }
    }
  }

  if (room.players.size === 0 && now - room.lastActiveAt > ROOM_IDLE_MS) {
    rooms.delete(room.id);
    return;
  }

  const hasBoth = room.roleOwners.ember && room.roleOwners.aqua;
  if (!hasBoth) {
    setRoomWaitingIfNeeded(room);
  }

  if (room.state === STATE.RUNNING && hasBoth) {
    room.timer += dt;
    updateButtonsAndDoors(room, dt);
    updateActors(room, dt);
    checkHazards(room);
    if (room.state === STATE.RUNNING) {
      checkExits(room);
    }
  } else if (room.state === STATE.RESPAWN && now >= room.respawnAt) {
    loadLevel(room, room.levelIndex);
    room.state = STATE.RUNNING;
    room.message = 'Running';
  }

  if (now - room.lastSnapshotAt >= SNAPSHOT_MS) {
    broadcastSnapshot(room);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const payload = {
      service: 'twin-temple-multi-server',
      rooms: Array.from(rooms.values()).map(roomSummary),
      now: new Date().toISOString(),
    };
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Twin Temple multi server');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.identity = { playerId: randomId('p'), name: safeName('') };
  ws.roomId = '';
  ws.playerId = '';

  send(ws, {
    type: 'welcome',
    playerId: ws.identity.playerId,
    name: ws.identity.name,
  });
  send(ws, {
    type: 'rooms',
    rooms: Array.from(rooms.values()).map(roomSummary),
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (error) {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'set_identity') {
      ws.identity = {
        playerId: safePlayerId(msg.playerId),
        name: safeName(msg.name),
      };
      send(ws, {
        type: 'welcome',
        playerId: ws.identity.playerId,
        name: ws.identity.name,
      });
      return;
    }

    if (msg.type === 'list_rooms') {
      send(ws, {
        type: 'rooms',
        rooms: Array.from(rooms.values()).map(roomSummary),
      });
      return;
    }

    if (msg.type === 'create_room') {
      leaveCurrentRoom(ws, false);
      const room = createRoom(msg.roomName);
      joinRoom(ws, room.id);
      return;
    }

    if (msg.type === 'join_room') {
      const roomId = String(msg.roomId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!roomId) {
        send(ws, { type: 'error', message: 'roomId is required' });
        return;
      }
      leaveCurrentRoom(ws, true);
      joinRoom(ws, roomId);
      return;
    }

    if (msg.type === 'leave_room') {
      leaveCurrentRoom(ws, false);
      send(ws, { type: 'left' });
      return;
    }

    if (msg.type === 'input') {
      handleInput(ws, msg);
      return;
    }

    if (msg.type === 'start_run') {
      handleStartRun(ws);
      return;
    }

    if (msg.type === 'restart_level') {
      handleRestartLevel(ws);
      return;
    }

    if (msg.type === 'next_level') {
      handleNextLevel(ws);
      return;
    }

    if (msg.type === 'ping') {
      send(ws, { type: 'pong', t: nowMs() });
    }
  });

  ws.on('close', () => {
    leaveCurrentRoom(ws, true);
  });
});

setInterval(() => {
  const now = nowMs();
  const dt = TICK_MS / 1000;
  for (const room of Array.from(rooms.values())) {
    updateRoom(room, now, dt);
  }

  if (now - lastRoomsBroadcastAt >= ROOMS_BROADCAST_MS) {
    lastRoomsBroadcastAt = now;
    broadcastRooms();
  }
}, TICK_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[twin-temple-multi-server] listening on 0.0.0.0:${PORT}`);
});
