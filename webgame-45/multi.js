const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const playerNameEl = document.getElementById('playerName');
const roomNameEl = document.getElementById('roomName');
const roomListEl = document.getElementById('roomList');
const statusTextEl = document.getElementById('statusText');
const overlayEl = document.getElementById('overlay');
const toastEl = document.getElementById('toast');

const roomTextEl = document.getElementById('roomText');
const roleTextEl = document.getElementById('roleText');
const levelTextEl = document.getElementById('levelText');
const timeTextEl = document.getElementById('timeText');
const deathTextEl = document.getElementById('deathText');
const playersTextEl = document.getElementById('playersText');
const stateTextEl = document.getElementById('stateText');

const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnRefreshRooms = document.getElementById('btnRefreshRooms');
const btnLeaveRoom = document.getElementById('btnLeaveRoom');
const btnReconnect = document.getElementById('btnReconnect');
const btnStartRun = document.getElementById('btnStartRun');
const btnRestartLevel = document.getElementById('btnRestartLevel');
const btnNextLevel = document.getElementById('btnNextLevel');

const touchButtons = Array.from(document.querySelectorAll('.touch-btn'));

const W = canvas.width;
const H = canvas.height;

const STORAGE = {
  playerId: 'twin-temple-player-id',
  playerName: 'twin-temple-player-name',
  roomId: 'twin-temple-room-id',
  roomName: 'twin-temple-room-name',
};

function rect(x, y, w, h) {
  return { x, y, w, h };
}

const LEVELS = [
  {
    name: 'Warm Gate',
    solids: [
      rect(0, 500, 960, 40),
      rect(70, 320, 230, 16),
      rect(342, 420, 210, 16),
      rect(608, 330, 250, 16),
      rect(774, 248, 130, 16),
    ],
    hazards: [
      { ...rect(214, 500, 94, 40), kind: 'water' },
      { ...rect(548, 500, 94, 40), kind: 'fire' },
      { ...rect(420, 500, 96, 40), kind: 'acid' },
    ],
    buttons: [
      { ...rect(150, 306, 54, 14), target: 'gate-blue', element: 'aqua' },
      { ...rect(668, 316, 54, 14), target: 'gate-red', element: 'ember' },
    ],
    exits: [
      { ...rect(892, 456, 34, 44), element: 'ember' },
      { ...rect(814, 286, 34, 44), element: 'aqua' },
    ],
  },
  {
    name: 'Layer Route',
    solids: [
      rect(0, 500, 960, 40),
      rect(174, 430, 140, 16),
      rect(332, 360, 170, 16),
      rect(540, 300, 166, 16),
      rect(734, 240, 164, 16),
      rect(766, 420, 160, 16),
    ],
    hazards: [
      { ...rect(286, 500, 96, 40), kind: 'water' },
      { ...rect(454, 500, 96, 40), kind: 'fire' },
      { ...rect(610, 500, 110, 40), kind: 'acid' },
      { ...rect(760, 500, 96, 40), kind: 'fire' },
    ],
    buttons: [
      { ...rect(558, 286, 54, 14), target: 'lift-center', element: 'aqua' },
      { ...rect(786, 406, 54, 14), target: 'lift-exit', element: 'ember' },
    ],
    exits: [
      { ...rect(896, 196, 34, 44), element: 'ember' },
      { ...rect(856, 376, 34, 44), element: 'aqua' },
    ],
  },
  {
    name: 'Acid Switch',
    solids: [
      rect(0, 500, 960, 40),
      rect(110, 400, 190, 16),
      rect(382, 350, 186, 16),
      rect(664, 300, 190, 16),
      rect(622, 430, 220, 16),
      rect(814, 220, 120, 16),
    ],
    hazards: [
      { ...rect(250, 500, 232, 40), kind: 'acid' },
      { ...rect(518, 500, 190, 40), kind: 'acid' },
      { ...rect(120, 500, 84, 40), kind: 'water' },
      { ...rect(834, 500, 82, 40), kind: 'fire' },
    ],
    buttons: [
      { ...rect(406, 336, 54, 14), target: 'gate-west', element: 'aqua' },
      { ...rect(688, 286, 54, 14), target: 'gate-east', element: 'ember' },
    ],
    exits: [
      { ...rect(904, 258, 34, 44), element: 'ember' },
      { ...rect(774, 386, 34, 44), element: 'aqua' },
    ],
  },
  {
    name: 'Cross Locks',
    solids: [
      rect(0, 500, 960, 40),
      rect(84, 450, 180, 16),
      rect(282, 390, 170, 16),
      rect(500, 330, 164, 16),
      rect(694, 270, 170, 16),
      rect(382, 260, 120, 16),
      rect(768, 420, 140, 16),
    ],
    hazards: [
      { ...rect(232, 500, 100, 40), kind: 'water' },
      { ...rect(430, 500, 104, 40), kind: 'fire' },
      { ...rect(620, 500, 124, 40), kind: 'acid' },
      { ...rect(812, 500, 90, 40), kind: 'water' },
    ],
    buttons: [
      { ...rect(304, 376, 54, 14), target: 'gate-alpha', element: 'aqua' },
      { ...rect(716, 256, 54, 14), target: 'gate-beta', element: 'ember' },
      { ...rect(786, 406, 54, 14), target: 'gate-final', element: 'aqua' },
    ],
    exits: [
      { ...rect(904, 376, 34, 44), element: 'ember' },
      { ...rect(538, 286, 34, 44), element: 'aqua' },
    ],
  },
  {
    name: 'Temple Finale',
    solids: [
      rect(0, 500, 960, 40),
      rect(64, 430, 156, 16),
      rect(258, 360, 154, 16),
      rect(450, 300, 150, 16),
      rect(642, 240, 150, 16),
      rect(812, 180, 126, 16),
      rect(318, 460, 122, 16),
      rect(530, 420, 122, 16),
      rect(742, 380, 122, 16),
    ],
    hazards: [
      { ...rect(136, 500, 94, 40), kind: 'water' },
      { ...rect(330, 500, 96, 40), kind: 'fire' },
      { ...rect(516, 500, 186, 40), kind: 'acid' },
      { ...rect(758, 500, 96, 40), kind: 'water' },
    ],
    buttons: [
      { ...rect(282, 346, 54, 14), target: 'gate-left', element: 'aqua' },
      { ...rect(470, 286, 54, 14), target: 'gate-mid', element: 'ember' },
      { ...rect(662, 226, 54, 14), target: 'gate-right', element: 'aqua' },
    ],
    exits: [
      { ...rect(916, 136, 32, 44), element: 'ember' },
      { ...rect(870, 336, 34, 44), element: 'aqua' },
    ],
  },
];

const client = {
  ws: null,
  connected: false,
  serverUrl: '',
  playerId: '',
  playerName: '',
  roomId: '',
  roomName: '',
  role: '',
  rooms: [],
  snapshot: null,
  shouldAutoReconnect: false,
  createAfterConnect: '',
  lastInputSentAt: 0,
  lastInputPayload: '',
};

const input = {
  keys: Object.create(null),
  touch: { left: false, right: false, jump: false },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function showToast(text, ms = 1300) {
  if (!text) return;
  toastEl.textContent = text;
  toastEl.classList.add('show');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toastEl.classList.remove('show');
  }, ms);
}

function setStatus(text, kind = '') {
  statusTextEl.textContent = text;
  statusTextEl.classList.remove('ok', 'bad');
  if (kind) statusTextEl.classList.add(kind);
}

function randomId(prefix = 'p') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeName(value) {
  const v = String(value || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 14);
  return v || `Player${Math.floor(Math.random() * 900 + 100)}`;
}

function normalizeRoomName(value) {
  const v = String(value || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 22);
  return v || 'Twin Temple Room';
}

function normalizeServerUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let candidate = raw;

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
    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') : '';
    return `${parsed.protocol}//${host}${port}${pathname}`;
  } catch (_) {
    return '';
  }
}

function fixedServerUrl() {
  const configured = window.TapTapChoConfig?.multiServer || '';
  return normalizeServerUrl(configured);
}

function defaultServerUrl() {
  const host = window.location.hostname || 'localhost';
  return `ws://${host}:9090/ws/twin`;
}

function saveStorage() {
  localStorage.setItem(STORAGE.playerId, client.playerId);
  localStorage.setItem(STORAGE.playerName, client.playerName);
  if (client.roomId) localStorage.setItem(STORAGE.roomId, client.roomId);
  else localStorage.removeItem(STORAGE.roomId);
  if (client.roomName) localStorage.setItem(STORAGE.roomName, client.roomName);
  else localStorage.removeItem(STORAGE.roomName);
}

function loadStorage() {
  const fixed = fixedServerUrl();
  client.serverUrl = fixed || defaultServerUrl();
  client.playerId = String(localStorage.getItem(STORAGE.playerId) || '').trim();
  if (!client.playerId) {
    client.playerId = randomId('p').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  }
  client.playerName = normalizeName(localStorage.getItem(STORAGE.playerName) || '');
  client.roomId = String(localStorage.getItem(STORAGE.roomId) || '').trim().toUpperCase();
  client.roomName = normalizeRoomName(localStorage.getItem(STORAGE.roomName) || '');
  client.shouldAutoReconnect = Boolean(client.roomId);

  playerNameEl.value = client.playerName;
  roomNameEl.value = client.roomName || 'Twin Temple Room';
  saveStorage();
}

function setOverlay(text, visible) {
  overlayEl.textContent = text;
  overlayEl.classList.toggle('hidden', !visible);
}

function updateReconnectVisibility() {
  const show = !client.connected;
  btnReconnect.classList.toggle('visible', show);
}

function sendMsg(payload) {
  if (!client.connected || !client.ws || client.ws.readyState !== WebSocket.OPEN) return false;
  client.ws.send(JSON.stringify(payload));
  return true;
}

function renderRooms() {
  roomListEl.innerHTML = '';

  if (!client.rooms.length) {
    const empty = document.createElement('div');
    empty.className = 'room-item';
    empty.innerHTML = '<h3>No open rooms</h3><div class="meta">Create a room to start co-op.</div>';
    roomListEl.appendChild(empty);
    return;
  }

  client.rooms.forEach((room) => {
    const item = document.createElement('div');
    item.className = 'room-item';
    const state = String(room.state || '-');
    const online = Number(room.online || 0);
    const level = Number(room.level || 1);
    item.innerHTML = `
      <h3>${room.name || room.id}</h3>
      <div class="meta">ID ${room.id} · Online ${online}/2 · Level ${level} · ${state}</div>
      <button type="button">Join</button>
    `;
    const btn = item.querySelector('button');
    btn.addEventListener('click', () => joinRoom(room.id));
    roomListEl.appendChild(item);
  });
}

function roleLabel(role) {
  if (role === 'ember') return 'Ember';
  if (role === 'aqua') return 'Aqua';
  return '-';
}

function connect(silent = false) {
  client.serverUrl = fixedServerUrl() || defaultServerUrl();
  client.playerName = normalizeName(playerNameEl.value);

  playerNameEl.value = client.playerName;
  saveStorage();

  if (client.ws) {
    try { client.ws.close(); } catch (_) { /* noop */ }
  }

  let ws;
  try {
    ws = new WebSocket(client.serverUrl);
  } catch (error) {
    setStatus('Invalid server URL', 'bad');
    updateReconnectVisibility();
    return;
  }

  client.ws = ws;
  client.connected = false;
  if (!silent) setStatus('Connecting...');

  ws.addEventListener('open', () => {
    if (client.ws !== ws) return;
    client.connected = true;
    setStatus('Connected', 'ok');

    ws.send(JSON.stringify({
      type: 'set_identity',
      playerId: client.playerId,
      name: client.playerName,
    }));
    ws.send(JSON.stringify({ type: 'list_rooms' }));

    if (client.createAfterConnect) {
      ws.send(JSON.stringify({
        type: 'create_room',
        roomName: client.createAfterConnect,
      }));
      client.createAfterConnect = '';
    } else if (client.roomId) {
      ws.send(JSON.stringify({
        type: 'join_room',
        roomId: client.roomId,
      }));
    }

    updateReconnectVisibility();
  });

  ws.addEventListener('message', (event) => {
    if (client.ws !== ws) return;

    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (_) {
      return;
    }

    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'welcome') {
      if (msg.playerId) client.playerId = String(msg.playerId);
      if (msg.name) client.playerName = normalizeName(msg.name);
      playerNameEl.value = client.playerName;
      saveStorage();
      return;
    }

    if (msg.type === 'rooms') {
      client.rooms = Array.isArray(msg.rooms) ? msg.rooms : [];
      renderRooms();
      return;
    }

    if (msg.type === 'joined') {
      client.roomId = String(msg.roomId || '').toUpperCase();
      client.roomName = String(msg.roomName || '');
      client.role = String(msg.role || '');
      client.shouldAutoReconnect = true;
      saveStorage();
      setStatus(`${client.roomName || client.roomId} joined`, 'ok');
      setOverlay('Waiting for snapshot...', true);
      showToast(`${roleLabel(client.role)} assigned`);
      updateReconnectVisibility();
      return;
    }

    if (msg.type === 'left') {
      client.roomId = '';
      client.roomName = '';
      client.role = '';
      client.snapshot = null;
      client.shouldAutoReconnect = false;
      saveStorage();
      setStatus('Left room');
      setOverlay('Connect and join room', true);
      updateReconnectVisibility();
      return;
    }

    if (msg.type === 'snapshot' && msg.room) {
      client.snapshot = msg.room;
      updateHud();
      setOverlay('', false);
      return;
    }

    if (msg.type === 'room_notice' && msg.message) {
      showToast(String(msg.message), 1100);
      return;
    }

    if (msg.type === 'error') {
      setStatus(msg.message || 'Server error', 'bad');
      if (msg.message) showToast(msg.message, 1500);
      return;
    }
  });

  ws.addEventListener('close', () => {
    if (client.ws !== ws) return;
    client.connected = false;
    setStatus('Disconnected', 'bad');
    updateReconnectVisibility();
    if (client.shouldAutoReconnect) {
      setOverlay('Disconnected - tap reconnect', true);
    }
  });

  ws.addEventListener('error', () => {
    if (client.ws !== ws) return;
    client.connected = false;
    setStatus('Connection error', 'bad');
    updateReconnectVisibility();
  });
}

function requestRooms() {
  if (!sendMsg({ type: 'list_rooms' })) {
    connect(true);
  }
}

function createRoom() {
  const roomName = normalizeRoomName(roomNameEl.value);
  roomNameEl.value = roomName;
  client.roomName = roomName;
  client.roomId = '';
  client.role = '';
  client.snapshot = null;
  client.createAfterConnect = roomName;
  client.shouldAutoReconnect = true;
  saveStorage();
  updateReconnectVisibility();

  if (!sendMsg({ type: 'create_room', roomName })) {
    connect();
  }
}

function joinRoom(roomId) {
  const clean = String(roomId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!clean) return;

  client.roomId = clean;
  client.shouldAutoReconnect = true;
  saveStorage();
  updateReconnectVisibility();

  if (!sendMsg({ type: 'join_room', roomId: clean })) {
    connect();
  }
}

function leaveRoom() {
  client.shouldAutoReconnect = false;
  sendMsg({ type: 'leave_room' });
  client.roomId = '';
  client.roomName = '';
  client.role = '';
  client.snapshot = null;
  saveStorage();
  updateReconnectVisibility();
  setOverlay('Connect and join room', true);
}

function formatTime(seconds) {
  const sec = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0');
}

function updateHud() {
  const snap = client.snapshot;
  if (!snap) {
    roomTextEl.textContent = '-';
    roleTextEl.textContent = roleLabel(client.role);
    levelTextEl.textContent = '-';
    timeTextEl.textContent = '00:00.00';
    deathTextEl.textContent = '0';
    playersTextEl.textContent = '0/2';
    stateTextEl.textContent = 'Idle';
    return;
  }

  roomTextEl.textContent = snap.name || snap.id || '-';
  roleTextEl.textContent = roleLabel(client.role);
  levelTextEl.textContent = `${Number(snap.levelIndex || 0) + 1}/${Number(snap.levelCount || LEVELS.length)}`;
  timeTextEl.textContent = formatTime(snap.timer);
  deathTextEl.textContent = String(Math.max(0, Number(snap.deaths || 0)));
  playersTextEl.textContent = `${Number(snap.playersOnline || 0)}/2`;
  stateTextEl.textContent = String(snap.state || '-');

  const state = String(snap.state || '');
  if (Number(snap.playersOnline || 0) < 2) {
    setOverlay('Waiting for second player', true);
  } else if (state === 'idle') {
    setOverlay('Press Start', true);
  } else if (state === 'clear') {
    setOverlay('Stage clear - press Next', true);
  } else if (state === 'done') {
    setOverlay('Temple complete', true);
  } else if (state === 'respawn') {
    setOverlay('Respawning...', true);
  } else {
    setOverlay('', false);
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0e1d3f');
  g.addColorStop(1, '#08102a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#2d3f73';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSolid(s) {
  ctx.fillStyle = '#273960';
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = '#374f86';
  ctx.fillRect(s.x, s.y, s.w, Math.min(4, s.h));
}

function drawHazard(h, now) {
  const phase = (now * 0.005 + h.x * 0.01) % (Math.PI * 2);
  let c0 = '#4f93ff';
  let c1 = '#88b9ff';
  if (h.kind === 'fire') {
    c0 = '#ff8c3d';
    c1 = '#ffd083';
  } else if (h.kind === 'acid') {
    c0 = '#5cf0a7';
    c1 = '#b4ffd7';
  }

  ctx.fillStyle = c0;
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.fillStyle = c1;
  for (let i = 0; i < h.w; i += 16) {
    const wave = Math.sin(phase + i * 0.2) * 3;
    ctx.fillRect(h.x + i, h.y + 4 + wave, 8, 6);
  }
}

function drawButton(b) {
  ctx.fillStyle = b.element === 'ember' ? '#f7a35e' : '#7ee0ff';
  ctx.globalAlpha = b.pressed ? 1 : 0.55;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#0e1a38';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
}

function drawDoor(d) {
  ctx.fillStyle = '#1c2e57';
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = d.color || '#9dbfff';
  ctx.globalAlpha = 0.4 + Number(d.progress || 0) * 0.6;
  ctx.fillRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
  ctx.globalAlpha = 1;
}

function drawExit(ex, active) {
  ctx.save();
  ctx.strokeStyle = ex.element === 'ember' ? '#ffb073' : '#8be4ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);
  ctx.fillStyle = ex.element === 'ember' ? '#ff8b3f' : '#67d9ff';
  ctx.globalAlpha = active ? 0.95 : 0.35;
  ctx.fillRect(ex.x + 6, ex.y + 6, ex.w - 12, ex.h - 12);
  ctx.restore();
}

function drawActor(actor, role) {
  const body = actor.element === 'ember' ? '#ff9c4a' : '#6fe0ff';
  const edge = actor.element === 'ember' ? '#ffcc9f' : '#d5f6ff';
  ctx.save();
  ctx.fillStyle = body;
  ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
  ctx.fillStyle = edge;
  ctx.fillRect(actor.x + 6, actor.y + 8, actor.w - 12, 9);
  ctx.fillStyle = '#0d1530';
  ctx.fillRect(actor.x + 8, actor.y + 26, 5, 5);
  ctx.fillRect(actor.x + actor.w - 13, actor.y + 26, 5, 5);

  if (actor.inExit) {
    ctx.strokeStyle = '#eafaff';
    ctx.lineWidth = 2;
    ctx.strokeRect(actor.x - 2, actor.y - 2, actor.w + 4, actor.h + 4);
  }

  if (client.role === role) {
    ctx.strokeStyle = '#fff39a';
    ctx.lineWidth = 2;
    ctx.strokeRect(actor.x - 4, actor.y - 4, actor.w + 8, actor.h + 8);
  }
  ctx.restore();
}

function draw(now) {
  drawBackground();
  const snap = client.snapshot;
  if (!snap) return;

  (snap.solids || []).forEach(drawSolid);
  (snap.hazards || []).forEach((h) => drawHazard(h, now));
  (snap.buttons || []).forEach(drawButton);
  (snap.doors || []).forEach(drawDoor);

  const actors = snap.actors || {};
  const ember = actors.ember;
  const aqua = actors.aqua;

  (snap.exits || []).forEach((ex) => {
    let active = false;
    if (ex.element === 'ember' && ember) active = !!ember.inExit;
    if (ex.element === 'aqua' && aqua) active = !!aqua.inExit;
    drawExit(ex, active);
  });

  if (ember) drawActor(ember, 'ember');
  if (aqua) drawActor(aqua, 'aqua');
}

function leftPressedByKeyboard() {
  return !!(input.keys.ArrowLeft || input.keys.KeyA);
}

function rightPressedByKeyboard() {
  return !!(input.keys.ArrowRight || input.keys.KeyD);
}

function jumpPressedByKeyboard() {
  return !!(input.keys.ArrowUp || input.keys.KeyW || input.keys.Space);
}

function currentInputState() {
  return {
    left: leftPressedByKeyboard() || input.touch.left,
    right: rightPressedByKeyboard() || input.touch.right,
    jump: jumpPressedByKeyboard() || input.touch.jump,
  };
}

function sendInputIfNeeded(force = false) {
  if (!client.role || !client.roomId) return;
  if (!client.connected || !client.ws || client.ws.readyState !== WebSocket.OPEN) return;

  const state = currentInputState();
  const payload = JSON.stringify(state);
  const now = performance.now();
  if (!force && payload === client.lastInputPayload && now - client.lastInputSentAt < 120) {
    return;
  }

  client.lastInputPayload = payload;
  client.lastInputSentAt = now;
  client.ws.send(JSON.stringify({ type: 'input', state }));
}

function bindInputEvents() {
  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'KeyA' || code === 'KeyD' || code === 'KeyW' || code === 'Space') {
      event.preventDefault();
      input.keys[code] = true;
      sendInputIfNeeded(true);
    }
  }, { passive: false });

  window.addEventListener('keyup', (event) => {
    const code = event.code;
    if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'KeyA' || code === 'KeyD' || code === 'KeyW' || code === 'Space') {
      input.keys[code] = false;
      sendInputIfNeeded(true);
    }
  });

  touchButtons.forEach((btn) => {
    const action = btn.dataset.action;
    const on = (e) => {
      e.preventDefault();
      btn.classList.add('active');
      input.touch[action] = true;
      sendInputIfNeeded(true);
    };
    const off = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      input.touch[action] = false;
      sendInputIfNeeded(true);
    };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

function refreshHudFrame() {
  updateHud();
}

function loop(now) {
  draw(now);
  refreshHudFrame();
  sendInputIfNeeded(false);
  requestAnimationFrame(loop);
}

function bindUiEvents() {
  btnCreateRoom.addEventListener('click', () => createRoom());
  btnRefreshRooms.addEventListener('click', () => requestRooms());
  btnLeaveRoom.addEventListener('click', () => leaveRoom());
  btnReconnect.addEventListener('click', () => connect());

  btnStartRun.addEventListener('click', () => {
    if (!sendMsg({ type: 'start_run' })) connect(true);
  });
  btnRestartLevel.addEventListener('click', () => {
    if (!sendMsg({ type: 'restart_level' })) connect(true);
  });
  btnNextLevel.addEventListener('click', () => {
    if (!sendMsg({ type: 'next_level' })) connect(true);
  });

  playerNameEl.addEventListener('blur', () => {
    playerNameEl.value = normalizeName(playerNameEl.value);
  });
  roomNameEl.addEventListener('blur', () => {
    roomNameEl.value = normalizeRoomName(roomNameEl.value);
  });
}

function init() {
  loadStorage();
  bindUiEvents();
  bindInputEvents();
  renderRooms();
  updateHud();
  setOverlay('Connecting to server...', true);
  connect(true);
  requestAnimationFrame(loop);
}

init();
