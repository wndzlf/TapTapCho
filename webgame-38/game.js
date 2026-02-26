const bgmAudio = window.TapTapNeonAudio?.create('webgame-38', document.querySelector('.hud'), { theme: 'arcade' });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const lengthEl = document.getElementById('length');
const aliveEl = document.getElementById('alive');
const serverUrlEl = document.getElementById('serverUrl');
const roomCodeEl = document.getElementById('roomCode');
const playerNameEl = document.getElementById('playerName');
const statusEl = document.getElementById('status');
const btnHost = document.getElementById('btnHost');
const btnJoin = document.getElementById('btnJoin');
const btnLeave = document.getElementById('btnLeave');

const W = canvas.width;
const H = canvas.height;

const DEFAULT_WORLD = { w: 2600, h: 2600 };
const STORAGE_BEST = 'worm-arena-lan-best';
const STORAGE_SERVER = 'worm-arena-lan-server';
const STORAGE_ROOM = 'worm-arena-lan-room';
const STORAGE_NAME = 'worm-arena-lan-name';

const lan = {
  ws: null,
  connected: false,
  myId: '',
  room: '',
  world: { ...DEFAULT_WORLD },
  players: [],
  foods: [],
};

let tick = 0;
let flash = 0;
let best = Number(localStorage.getItem(STORAGE_BEST) || 0);
let camera = { x: 0, y: 0 };

const pointer = { x: W * 0.5, y: H * 0.5, moved: false };
const keys = Object.create(null);

let lastSendAngle = 0;
let lastSendBoost = false;
let lastSendAt = 0;

bestEl.textContent = String(best);

const rocks = [];
for (let i = 0; i < 220; i += 1) {
  rocks.push({
    x: Math.random() * DEFAULT_WORLD.w,
    y: Math.random() * DEFAULT_WORLD.h,
    r: 8 + Math.random() * 20,
    a: 0.06 + Math.random() * 0.1,
    rot: Math.random() * Math.PI * 2,
  });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function setStatus(text, kind = '') {
  statusEl.textContent = text;
  statusEl.classList.remove('ok', 'bad');
  if (kind) statusEl.classList.add(kind);
}

function defaultServerUrl() {
  const host = window.location.hostname || 'localhost';
  return `ws://${host}:9090`;
}

function defaultName() {
  return `Player${Math.floor(Math.random() * 900 + 100)}`;
}

function loadInputs() {
  serverUrlEl.value = localStorage.getItem(STORAGE_SERVER) || defaultServerUrl();
  roomCodeEl.value = localStorage.getItem(STORAGE_ROOM) || 'ARENA1';
  playerNameEl.value = localStorage.getItem(STORAGE_NAME) || defaultName();
}

function saveInputs() {
  localStorage.setItem(STORAGE_SERVER, serverUrlEl.value.trim());
  localStorage.setItem(STORAGE_ROOM, roomCodeEl.value.trim().toUpperCase());
  localStorage.setItem(STORAGE_NAME, playerNameEl.value.trim());
}

function normalizeRoom(value) {
  const room = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return room || 'ARENA1';
}

function normalizeName(value) {
  const name = String(value || '').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 14).trim();
  return name || defaultName();
}

function getMe() {
  return lan.players.find((p) => p.id === lan.myId);
}

function disconnect() {
  if (lan.ws) {
    lan.ws.close();
  }
  lan.ws = null;
  lan.connected = false;
  lan.myId = '';
  lan.players = [];
  lan.foods = [];
  setStatus('Disconnected', 'bad');
}

function connect() {
  const serverUrl = serverUrlEl.value.trim() || defaultServerUrl();
  const room = normalizeRoom(roomCodeEl.value);
  const name = normalizeName(playerNameEl.value);

  serverUrlEl.value = serverUrl;
  roomCodeEl.value = room;
  playerNameEl.value = name;
  saveInputs();

  disconnect();

  let ws;
  try {
    ws = new WebSocket(serverUrl);
  } catch (error) {
    setStatus('Invalid server URL', 'bad');
    return;
  }

  lan.ws = ws;
  setStatus('Connecting...');

  ws.addEventListener('open', () => {
    if (lan.ws !== ws) return;
    lan.connected = true;
    setStatus('Connected. Joining room...');
    ws.send(JSON.stringify({ type: 'join', room, name }));
  });

  ws.addEventListener('message', (event) => {
    if (lan.ws !== ws) return;

    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    if (msg.type === 'welcome') {
      lan.myId = msg.id;
      lan.room = msg.room;
      if (msg.world) lan.world = msg.world;
      setStatus(`Room ${lan.room} joined`, 'ok');
      return;
    }

    if (msg.type === 'snapshot') {
      if (msg.world) lan.world = msg.world;
      lan.players = Array.isArray(msg.players) ? msg.players : [];
      lan.foods = Array.isArray(msg.foods) ? msg.foods : [];
      const me = getMe();
      if (me && me.score > best) {
        best = me.score;
        bestEl.textContent = String(best);
        localStorage.setItem(STORAGE_BEST, String(best));
      }
      return;
    }

    if (msg.type === 'info') {
      setStatus(msg.message || 'Info');
      return;
    }

    if (msg.type === 'error') {
      setStatus(msg.message || 'Server error', 'bad');
    }
  });

  ws.addEventListener('close', () => {
    if (lan.ws !== ws) return;
    lan.connected = false;
    lan.myId = '';
    lan.players = [];
    lan.foods = [];
    setStatus('Connection closed', 'bad');
  });

  ws.addEventListener('error', () => {
    if (lan.ws !== ws) return;
    setStatus('Connection error', 'bad');
  });
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) * (W / rect.width);
  pointer.y = (event.clientY - rect.top) * (H / rect.height);
  pointer.moved = true;
}

function getTargetAngle(me) {
  let ix = 0;
  let iy = 0;

  if (keys.ArrowUp || keys.KeyW) iy -= 1;
  if (keys.ArrowDown || keys.KeyS) iy += 1;
  if (keys.ArrowLeft || keys.KeyA) ix -= 1;
  if (keys.ArrowRight || keys.KeyD) ix += 1;

  if (ix !== 0 || iy !== 0) {
    return Math.atan2(iy, ix);
  }

  if (!pointer.moved) return me.angle;

  const tx = camera.x + pointer.x;
  const ty = camera.y + pointer.y;
  return Math.atan2(ty - me.y, tx - me.x);
}

function sendInput() {
  if (!lan.connected || !lan.ws || lan.ws.readyState !== WebSocket.OPEN) return;

  const me = getMe();
  if (!me) return;

  const angle = getTargetAngle(me);
  const boost = Boolean(keys.ShiftLeft || keys.ShiftRight || keys.Space);
  const now = Date.now();

  const needSend = Math.abs(angle - lastSendAngle) > 0.01 || boost !== lastSendBoost || now - lastSendAt > 220;
  if (!needSend) return;

  lan.ws.send(JSON.stringify({
    type: 'input',
    angle,
    boost,
  }));

  lastSendAngle = angle;
  lastSendBoost = boost;
  lastSendAt = now;
}

function drawWorm(player, me) {
  const segs = Array.isArray(player.segments) ? player.segments : [];
  const alpha = player.alive ? 1 : 0.25;

  for (let i = segs.length - 1; i >= 0; i -= 1) {
    const seg = segs[i];
    const sx = seg.x - camera.x;
    const sy = seg.y - camera.y;
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

    const t = segs.length > 0 ? 1 - i / segs.length : 1;
    const r = player.radius * (0.68 + t * 0.34);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = me ? '#ff932e' : player.color;
    ctx.shadowColor = me ? '#ff932e' : player.color;
    ctx.shadowBlur = me ? 10 : 5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  const hx = player.x - camera.x;
  const hy = player.y - camera.y;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = me ? '#ffb347' : '#e6f3ff';
  ctx.beginPath();
  ctx.arc(hx, hy, player.radius + 2, 0, Math.PI * 2);
  ctx.fill();

  const nx = Math.cos(player.angle);
  const ny = Math.sin(player.angle);
  const lx = -ny;
  const ly = nx;

  const eyeOffset = player.radius * 0.45;
  const eyeForward = player.radius * 0.55;

  ctx.fillStyle = me ? '#fff' : (player.eyeColor || '#0d1a34');
  ctx.beginPath();
  ctx.arc(hx + nx * eyeForward + lx * eyeOffset, hy + ny * eyeForward + ly * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.arc(hx + nx * eyeForward - lx * eyeOffset, hy + ny * eyeForward - ly * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0b1225';
  ctx.beginPath();
  ctx.arc(hx + nx * eyeForward + lx * eyeOffset, hy + ny * eyeForward + ly * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.arc(hx + nx * eyeForward - lx * eyeOffset, hy + ny * eyeForward - ly * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (hx > -80 && hx < W + 80 && hy > -40 && hy < H + 40) {
    ctx.fillStyle = '#f8fbff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, hx, hy - (player.radius + 10));
  }
}

function drawMiniMap(me) {
  const size = 108;
  const x = W - size - 12;
  const y = 12;

  ctx.fillStyle = 'rgba(4, 8, 24, 0.72)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(230, 240, 255, 0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  for (let i = 0; i < lan.foods.length; i += 8) {
    const f = lan.foods[i];
    const mx = x + (f.x / lan.world.w) * size;
    const my = y + (f.y / lan.world.h) * size;
    ctx.fillStyle = '#dce6ff';
    ctx.fillRect(mx, my, 1.6, 1.6);
  }

  for (const p of lan.players) {
    const mx = x + (p.x / lan.world.w) * size;
    const my = y + (p.y / lan.world.h) * size;
    ctx.fillStyle = p.id === lan.myId ? '#7effb6' : '#ff7b74';
    ctx.fillRect(mx - 1, my - 1, 2.2, 2.2);
  }

  if (me) {
    const cw = (W / lan.world.w) * size;
    const ch = (H / lan.world.h) * size;
    const cx = x + (camera.x / lan.world.w) * size;
    const cy = y + (camera.y / lan.world.h) * size;
    ctx.strokeStyle = 'rgba(126, 255, 182, 0.55)';
    ctx.strokeRect(cx, cy, cw, ch);
  }
}

function render() {
  const me = getMe();

  if (me) {
    camera.x = clamp(me.x - W * 0.5, 0, lan.world.w - W);
    camera.y = clamp(me.y - H * 0.5, 0, lan.world.h - H);
  }

  ctx.fillStyle = '#2d448f';
  ctx.fillRect(0, 0, W, H);

  for (const rock of rocks) {
    const x = rock.x - camera.x;
    const y = rock.y - camera.y;
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rock.rot);
    ctx.fillStyle = `rgba(154, 181, 255, ${rock.a})`;
    ctx.beginPath();
    ctx.moveTo(-rock.r, -rock.r * 0.2);
    ctx.lineTo(-rock.r * 0.25, -rock.r * 0.8);
    ctx.lineTo(rock.r * 0.9, -rock.r * 0.14);
    ctx.lineTo(rock.r * 0.5, rock.r * 0.8);
    ctx.lineTo(-rock.r * 0.45, rock.r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const food of lan.foods) {
    const x = food.x - camera.x;
    const y = food.y - camera.y;
    if (x < -12 || x > W + 12 || y < -12 || y > H + 12) continue;

    ctx.fillStyle = food.color;
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, food.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  for (const player of lan.players) {
    drawWorm(player, player.id === lan.myId);
  }

  if (flash > 0) {
    ctx.fillStyle = 'rgba(255, 235, 149, 0.08)';
    ctx.fillRect(0, 0, W, H);
    flash -= 1;
  }

  drawMiniMap(me);

  const alive = lan.players.filter((p) => p.alive).length;
  const score = me ? me.score : 0;
  const length = me && Array.isArray(me.segments) ? me.segments.length : 0;

  scoreEl.textContent = String(score);
  lengthEl.textContent = String(length);
  aliveEl.textContent = String(alive);

  if (me && score > best) {
    best = score;
    bestEl.textContent = String(best);
    localStorage.setItem(STORAGE_BEST, String(best));
  }

  ctx.fillStyle = '#eaf1ff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px system-ui';
  ctx.fillText(`Room ${lan.room || '-'}`, 14, 26);

  if (!lan.connected) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText('LAN Not Connected', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Host or Join using same Wi-Fi', W / 2, H / 2 + 18);
  } else if (me && !me.alive) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px system-ui';
    ctx.fillText('Respawning...', W / 2, H / 2);
  }
}

function update() {
  tick += 1;
  if (tick % 3 === 0) sendInput();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

btnHost.addEventListener('click', () => {
  if (!roomCodeEl.value.trim()) {
    roomCodeEl.value = `R${Math.floor(Math.random() * 8999 + 1000)}`;
  }
  connect();
});

btnJoin.addEventListener('click', connect);
btnLeave.addEventListener('click', disconnect);

canvas.addEventListener('pointerdown', (event) => {
  updatePointer(event);
});

canvas.addEventListener('pointermove', (event) => {
  updatePointer(event);
});

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

loadInputs();
setStatus('Not connected');
loop();
