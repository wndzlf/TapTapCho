const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const playerNameEl = document.getElementById('playerName');
const roomNameEl = document.getElementById('roomName');
const roomListEl = document.getElementById('roomList');
const statusTextEl = document.getElementById('statusText');
const overlayEl = document.getElementById('overlay');
const toastEl = document.getElementById('toast');
const btnFullscreen = document.getElementById('btnFullscreen');

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
const bgmAudio = window.TapTapNeonAudio?.create('webgame-45-multi', document.querySelector('.actions'), {
  mediaSrc: '../assets/audio/twin-temple-escape-pixabay-358426.mp3',
  showSfxToggle: false,
  showThemeToggle: false,
});

const touchButtons = Array.from(document.querySelectorAll('.touch-btn'));

const W = canvas.width;
const H = canvas.height;
const isTouchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || (navigator.maxTouchPoints || 0) > 0;

let hasRunStarted = false;
let lastTouchEndAt = 0;

const STORAGE = {
  playerId: 'twin-temple-player-id',
  playerName: 'twin-temple-player-name',
  roomId: 'twin-temple-room-id',
  roomName: 'twin-temple-room-name',
};

const LEVELS = Array.isArray(window.TapTapTwinTempleShared?.levels)
  ? window.TapTapTwinTempleShared.levels.map((level) => ({ name: level.name }))
  : [];

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

const renderState = {
  key: '',
  actors: { ember: null, aqua: null },
  doors: [],
};

const input = {
  keys: Object.create(null),
  touch: { left: false, right: false, jump: false },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function cloneActor(actor) {
  return actor ? { ...actor } : null;
}

function cloneDoor(door) {
  return door ? { ...door } : null;
}

function syncRenderState(force = false) {
  const snap = client.snapshot;
  if (!snap) {
    renderState.key = '';
    renderState.actors.ember = null;
    renderState.actors.aqua = null;
    renderState.doors = [];
    return;
  }

  const nextKey = `${snap.id || ''}:${snap.levelIndex || 0}:${snap.state || ''}`;
  const shouldReset = force
    || renderState.key !== nextKey
    || !renderState.actors.ember
    || !renderState.actors.aqua
    || renderState.doors.length !== (snap.doors || []).length;

  if (!shouldReset) return;

  renderState.key = nextKey;
  renderState.actors.ember = cloneActor(snap.actors?.ember);
  renderState.actors.aqua = cloneActor(snap.actors?.aqua);
  renderState.doors = (snap.doors || []).map(cloneDoor);
}

function lerp(current, target, alpha) {
  return current + (target - current) * alpha;
}

function advanceRenderState() {
  const snap = client.snapshot;
  if (!snap) return;

  syncRenderState(false);

  ['ember', 'aqua'].forEach((role) => {
    const target = snap.actors?.[role];
    const actor = renderState.actors[role];
    if (!target || !actor) return;

    actor.x = lerp(actor.x, target.x, 0.34);
    actor.y = lerp(actor.y, target.y, 0.34);
    actor.vx = lerp(Number(actor.vx || 0), Number(target.vx || 0), 0.2);
    actor.vy = lerp(Number(actor.vy || 0), Number(target.vy || 0), 0.2);
    actor.inExit = !!target.inExit;
    actor.element = target.element;
    actor.w = target.w;
    actor.h = target.h;
  });

  const targetDoors = snap.doors || [];
  for (let i = 0; i < targetDoors.length; i += 1) {
    const target = targetDoors[i];
    const door = renderState.doors[i];
    if (!target || !door) continue;

    door.x = target.x;
    door.w = target.w;
    door.h = target.h;
    door.color = target.color;
    door.progress = lerp(Number(door.progress || 0), Number(target.progress || 0), 0.28);
    door.y = lerp(Number(door.y || target.y), Number(target.y || 0), 0.34);
  }
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
  const configured = window.TapTapChoServers?.twinTempleWs
    || window.TapTapChoConfig?.multiServer
    || '';
  return normalizeServerUrl(configured);
}

function isEditableTarget(target) {
  return !!(target && target.closest && target.closest('input, textarea, [contenteditable="true"]'));
}

function isNativeFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function isPseudoFullscreen() {
  return document.body.classList.contains('pseudo-fullscreen');
}

function enterPseudoFullscreen() {
  document.body.classList.add('pseudo-fullscreen');
  window.scrollTo(0, 0);
}

function exitPseudoFullscreen() {
  document.body.classList.remove('pseudo-fullscreen');
}

async function enterFullscreenMode() {
  const target = document.documentElement;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: 'hide' });
      return;
    }
    if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
      return;
    }
  } catch (_) {
    // Fall back to pseudo fullscreen for browsers like iOS Safari.
  }

  enterPseudoFullscreen();
}

async function exitFullscreenMode() {
  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  } catch (_) {
    // Ignore native fullscreen exit errors and clear fallback mode below.
  }

  exitPseudoFullscreen();
}

async function toggleFullscreenMode() {
  if (isNativeFullscreen() || isPseudoFullscreen()) {
    await exitFullscreenMode();
  } else {
    await enterFullscreenMode();
  }
  updateFullscreenButton();
}

function updateFullscreenButton() {
  if (!btnFullscreen) return;

  const state = String(client.snapshot?.state || '');
  const shouldShow = isTouchDevice && (
    hasRunStarted
    || state === 'running'
    || state === 'respawn'
    || state === 'clear'
    || state === 'done'
  );
  const active = isNativeFullscreen() || isPseudoFullscreen();

  btnFullscreen.classList.toggle('visible', shouldShow);
  btnFullscreen.classList.toggle('active', active);
  btnFullscreen.setAttribute('aria-pressed', active ? 'true' : 'false');

  const labelEl = btnFullscreen.querySelector('span');
  if (labelEl) {
    labelEl.textContent = active ? 'EXIT' : 'FULL';
  }
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
  updateFullscreenButton();
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
      updateHud();
      updateReconnectVisibility();
      updateFullscreenButton();
      return;
    }

    if (msg.type === 'left') {
      client.roomId = '';
      client.roomName = '';
      client.role = '';
      client.snapshot = null;
      syncRenderState(true);
      client.shouldAutoReconnect = false;
      hasRunStarted = false;
      saveStorage();
      setStatus('Left room');
      setOverlay('Connect and join room', true);
      updateHud();
      updateReconnectVisibility();
      if (isPseudoFullscreen()) exitPseudoFullscreen();
      updateFullscreenButton();
      return;
    }

    if (msg.type === 'snapshot' && msg.room) {
      const prevLevel = client.snapshot?.levelIndex;
      const prevState = client.snapshot?.state;
      client.snapshot = msg.room;
      syncRenderState(prevLevel !== msg.room.levelIndex || prevState !== msg.room.state);
      updateHud();
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
    updateFullscreenButton();
  });

  ws.addEventListener('error', () => {
    if (client.ws !== ws) return;
    client.connected = false;
    setStatus('Connection error', 'bad');
    updateReconnectVisibility();
    updateFullscreenButton();
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
  syncRenderState(true);
  hasRunStarted = false;
  saveStorage();
  updateReconnectVisibility();
  setOverlay('Connect and join room', true);
  updateHud();
  if (isPseudoFullscreen()) exitPseudoFullscreen();
  updateFullscreenButton();
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
    updateFullscreenButton();
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

  updateFullscreenButton();
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
  advanceRenderState();

  (snap.solids || []).forEach(drawSolid);
  (snap.hazards || []).forEach((h) => drawHazard(h, now));
  (snap.buttons || []).forEach(drawButton);
  (renderState.doors.length ? renderState.doors : (snap.doors || [])).forEach(drawDoor);

  const actors = {
    ember: renderState.actors.ember || snap.actors?.ember,
    aqua: renderState.actors.aqua || snap.actors?.aqua,
  };
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
  if (!force && payload === client.lastInputPayload && now - client.lastInputSentAt < 45) {
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

function bindMobileBrowserGuards() {
  if (!isTouchDevice) return;

  ['gesturestart', 'gesturechange', 'gestureend'].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    }, { passive: false });
  });

  document.addEventListener('dblclick', (event) => {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchend', (event) => {
    if (isEditableTarget(event.target)) return;
    const now = Date.now();
    if (now - lastTouchEndAt < 320) {
      event.preventDefault();
    }
    lastTouchEndAt = now;
  }, { passive: false });

  document.addEventListener('contextmenu', (event) => {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener('selectstart', (event) => {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
    }
  });
}

function loop(now) {
  draw(now);
  sendInputIfNeeded(false);
  requestAnimationFrame(loop);
}

function bindUiEvents() {
  btnCreateRoom.addEventListener('click', () => createRoom());
  btnRefreshRooms.addEventListener('click', () => requestRooms());
  btnLeaveRoom.addEventListener('click', () => leaveRoom());
  btnReconnect.addEventListener('click', () => connect());
  btnFullscreen.addEventListener('click', (event) => {
    event.preventDefault();
    toggleFullscreenMode();
  });

  btnStartRun.addEventListener('click', () => {
    hasRunStarted = true;
    updateFullscreenButton();
    if (!sendMsg({ type: 'start_run' })) connect(true);
  });
  btnRestartLevel.addEventListener('click', () => {
    hasRunStarted = true;
    updateFullscreenButton();
    if (!sendMsg({ type: 'restart_level' })) connect(true);
  });
  btnNextLevel.addEventListener('click', () => {
    hasRunStarted = true;
    updateFullscreenButton();
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
  bindMobileBrowserGuards();
  renderRooms();
  updateHud();
  setOverlay('Connecting to server...', true);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  connect(true);
  requestAnimationFrame(loop);
}

init();
