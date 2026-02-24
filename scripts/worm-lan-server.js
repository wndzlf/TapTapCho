const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = Number(process.env.WORM_LAN_PORT || 9090);
const TICK_MS = 33;
const SNAPSHOT_MS = 66;
const ROOM_IDLE_MS = 2 * 60 * 1000;

const WORLD = { w: 2600, h: 2600 };
const FOOD_TARGET = 220;
const SEG_SPACING = 14;
const BASE_LENGTH = 18;

const FOOD_COLORS = ['#ff7b74', '#ffe08a', '#9df2ff', '#b8ffa2', '#f7b8ff'];
const WORM_COLORS = ['#ff932e', '#6df3ff', '#7effb6', '#ff9cf6', '#ffd372', '#9eb4ff', '#b6ff8f'];

const rooms = new Map();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function angleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function randomId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeName(name) {
  const v = String(name || '').trim();
  if (!v) return `Player-${Math.floor(rand(1000, 9999))}`;
  return v.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 14) || `Player-${Math.floor(rand(1000, 9999))}`;
}

function safeRoom(room) {
  const v = String(room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return v || 'ROOM1';
}

function randomWormColor() {
  return WORM_COLORS[Math.floor(Math.random() * WORM_COLORS.length)];
}

function makeFood() {
  return {
    x: rand(24, WORLD.w - 24),
    y: rand(24, WORLD.h - 24),
    r: rand(4.5, 7.5),
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
    value: 1,
  };
}

function fillFoods(room) {
  while (room.foods.length < FOOD_TARGET) {
    room.foods.push(makeFood());
  }
  while (room.foods.length > FOOD_TARGET + 120) {
    room.foods.pop();
  }
}

function createRoom(code) {
  const room = {
    code,
    players: new Map(),
    foods: [],
    lastSnapshotAt: 0,
    lastActiveAt: Date.now(),
  };
  fillFoods(room);
  rooms.set(code, room);
  return room;
}

function destroyRoom(code) {
  rooms.delete(code);
}

function spawnPlayer(player) {
  player.x = rand(120, WORLD.w - 120);
  player.y = rand(120, WORLD.h - 120);
  player.angle = rand(0, Math.PI * 2);
  player.targetAngle = player.angle;
  player.turnSpeed = 5;
  player.baseSpeed = 170;
  player.radius = 9.5;
  player.grow = 0;

  const len = BASE_LENGTH + Math.min(28, Math.floor(player.score / 8));
  player.segments = [];
  for (let i = 0; i < len; i += 1) {
    player.segments.push({
      x: player.x - Math.cos(player.angle) * i * SEG_SPACING,
      y: player.y - Math.sin(player.angle) * i * SEG_SPACING,
    });
  }
}

function createPlayer(name, ws) {
  const player = {
    id: randomId(),
    name,
    color: randomWormColor(),
    eyeColor: '#0d1a34',
    score: 0,
    alive: true,
    respawnAt: 0,
    boost: false,
    x: 0,
    y: 0,
    angle: 0,
    targetAngle: 0,
    turnSpeed: 5,
    baseSpeed: 170,
    radius: 9.5,
    grow: 0,
    segments: [],
    ws,
  };

  spawnPlayer(player);
  return player;
}

function dropFoodFromPlayer(room, player) {
  const stride = Math.max(2, Math.floor(player.segments.length / 20));
  for (let i = 3; i < player.segments.length; i += stride) {
    const seg = player.segments[i];
    room.foods.push({
      x: clamp(seg.x + rand(-8, 8), 24, WORLD.w - 24),
      y: clamp(seg.y + rand(-8, 8), 24, WORLD.h - 24),
      r: rand(4.5, 7.0),
      color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
      value: 1,
    });
  }
}

function killPlayer(room, player) {
  if (!player.alive) return;
  player.alive = false;
  player.respawnAt = Date.now() + 1700;
  player.boost = false;
  player.score = Math.max(0, player.score - 12);
  dropFoodFromPlayer(room, player);
}

function movePlayer(player, dt) {
  if (!player.alive) return;

  const turnStep = player.turnSpeed * dt;
  const diff = angleDiff(player.targetAngle, player.angle);
  player.angle += clamp(diff, -turnStep, turnStep);

  const speed = player.baseSpeed + (player.boost ? 92 : 0);
  player.x += Math.cos(player.angle) * speed * dt;
  player.y += Math.sin(player.angle) * speed * dt;

  player.x = clamp(player.x, 16, WORLD.w - 16);
  player.y = clamp(player.y, 16, WORLD.h - 16);

  player.segments[0].x = player.x;
  player.segments[0].y = player.y;

  for (let i = 1; i < player.segments.length; i += 1) {
    const prev = player.segments[i - 1];
    const seg = player.segments[i];
    const dx = seg.x - prev.x;
    const dy = seg.y - prev.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    if (dist > SEG_SPACING) {
      const k = (dist - SEG_SPACING) / dist;
      seg.x -= dx * k;
      seg.y -= dy * k;
    }
  }

  while (player.grow >= 1) {
    const tail = player.segments[player.segments.length - 1];
    player.segments.push({ x: tail.x, y: tail.y });
    player.grow -= 1;
  }

  if (player.segments.length > 200) {
    player.segments.pop();
  }
}

function consumeFood(room, player) {
  if (!player.alive) return;

  for (let i = 0; i < room.foods.length; i += 1) {
    const food = room.foods[i];
    const rr = player.radius + food.r + 2;
    if (distSq(player.x, player.y, food.x, food.y) > rr * rr) continue;

    room.foods[i] = makeFood();
    player.score += food.value;
    player.grow += 0.9;
  }
}

function collidesBody(player, other) {
  const hitRadiusSq = (player.radius + 6.5) * (player.radius + 6.5);
  const start = player.id === other.id ? 8 : 4;

  for (let i = start; i < other.segments.length; i += 2) {
    const seg = other.segments[i];
    if (distSq(player.x, player.y, seg.x, seg.y) < hitRadiusSq) {
      return true;
    }
  }

  return false;
}

function checkCollisions(room) {
  const players = Array.from(room.players.values()).filter((p) => p.alive);

  for (const player of players) {
    if (!player.alive) continue;

    if (collidesBody(player, player)) {
      killPlayer(room, player);
      continue;
    }

    for (const other of players) {
      if (other.id === player.id || !other.alive) continue;
      if (collidesBody(player, other)) {
        killPlayer(room, player);
        break;
      }
    }
  }
}

function serializeFood(food) {
  return {
    x: round1(food.x),
    y: round1(food.y),
    r: round1(food.r),
    color: food.color,
  };
}

function serializePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    eyeColor: player.eyeColor,
    score: player.score,
    alive: player.alive,
    x: round1(player.x),
    y: round1(player.y),
    angle: round1(player.angle),
    radius: round1(player.radius),
    segments: player.segments.map((seg) => ({ x: round1(seg.x), y: round1(seg.y) })),
  };
}

function send(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcastRoom(room, payload) {
  const text = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(text);
    }
  }
}

function broadcastSnapshot(room) {
  const payload = {
    type: 'snapshot',
    room: room.code,
    world: WORLD,
    foods: room.foods.map(serializeFood),
    players: Array.from(room.players.values()).map(serializePlayer),
  };
  broadcastRoom(room, payload);
  room.lastSnapshotAt = Date.now();
}

function updateRoom(room, now, dt) {
  if (room.players.size === 0 && now - room.lastActiveAt > ROOM_IDLE_MS) {
    destroyRoom(room.code);
    return;
  }

  for (const player of room.players.values()) {
    if (!player.alive) {
      if (now >= player.respawnAt) {
        player.alive = true;
        spawnPlayer(player);
      }
      continue;
    }

    movePlayer(player, dt);
  }

  for (const player of room.players.values()) {
    consumeFood(room, player);
  }

  checkCollisions(room);
  fillFoods(room);

  if (now - room.lastSnapshotAt >= SNAPSHOT_MS) {
    broadcastSnapshot(room);
  }
}

function leaveRoom(ws) {
  if (!ws.room || !ws.player) return;

  const room = ws.room;
  const player = ws.player;

  room.players.delete(player.id);
  room.lastActiveAt = Date.now();

  broadcastRoom(room, {
    type: 'info',
    message: `${player.name} left`,
  });

  ws.room = null;
  ws.player = null;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    ok: true,
    service: 'worm-lan-server',
    rooms: rooms.size,
    port: PORT,
  }));
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  send(ws, {
    type: 'info',
    message: 'Connected. Send join payload.',
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (error) {
      send(ws, { type: 'error', message: 'Bad JSON payload' });
      return;
    }

    if (!msg || typeof msg.type !== 'string') {
      send(ws, { type: 'error', message: 'Missing message type' });
      return;
    }

    if (msg.type === 'join') {
      const roomCode = safeRoom(msg.room);
      const name = safeName(msg.name);

      leaveRoom(ws);

      const room = rooms.get(roomCode) || createRoom(roomCode);
      const player = createPlayer(name, ws);

      room.players.set(player.id, player);
      room.lastActiveAt = Date.now();

      ws.room = room;
      ws.player = player;

      send(ws, {
        type: 'welcome',
        id: player.id,
        room: room.code,
        world: WORLD,
      });

      broadcastRoom(room, {
        type: 'info',
        message: `${player.name} joined`,
      });

      broadcastSnapshot(room);
      return;
    }

    if (msg.type === 'input') {
      const player = ws.player;
      if (!player) return;

      if (typeof msg.angle === 'number' && Number.isFinite(msg.angle)) {
        player.targetAngle = msg.angle;
      }
      player.boost = Boolean(msg.boost);
      return;
    }

    if (msg.type === 'ping') {
      send(ws, { type: 'pong', t: Date.now() });
      return;
    }

    send(ws, { type: 'error', message: `Unsupported type: ${msg.type}` });
  });

  ws.on('close', () => {
    leaveRoom(ws);
  });

  ws.on('error', () => {
    leaveRoom(ws);
  });
});

setInterval(() => {
  const now = Date.now();
  const dt = TICK_MS / 1000;
  for (const room of rooms.values()) {
    updateRoom(room, now, dt);
  }
}, TICK_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[worm-lan-server] listening on 0.0.0.0:${PORT}`);
});
