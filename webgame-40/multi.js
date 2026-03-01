const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const serverUrlEl = document.getElementById('serverUrl');
const playerNameEl = document.getElementById('playerName');
const roomNameEl = document.getElementById('roomName');
const roomSizeEl = document.getElementById('roomSize');
const roomListEl = document.getElementById('roomList');
const statusTextEl = document.getElementById('statusText');
const overlayEl = document.getElementById('overlay');

const roomTextEl = document.getElementById('roomText');
const laneTextEl = document.getElementById('laneText');
const waveTextEl = document.getElementById('waveText');
const coreTextEl = document.getElementById('coreText');
const goldTextEl = document.getElementById('goldText');
const queueTextEl = document.getElementById('queueText');
const playersTextEl = document.getElementById('playersText');
const pendingTextEl = document.getElementById('pendingText');
const hintTextEl = document.getElementById('hintText');

const btnConnect = document.getElementById('btnConnect');
const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnRefreshRooms = document.getElementById('btnRefreshRooms');
const btnLeaveRoom = document.getElementById('btnLeaveRoom');
const btnReconnect = document.getElementById('btnReconnect');

const btnSunken = document.getElementById('btnSunken');
const btnSpine = document.getElementById('btnSpine');
const btnObelisk = document.getElementById('btnObelisk');
const btnSnare = document.getElementById('btnSnare');
const btnSellMode = document.getElementById('btnSellMode');

const bgmAudio = window.TapTapNeonAudio?.create('webgame-40-multi', document.getElementById('hudPanel'), {
  theme: 'rush',
  mediaSrc: '../assets/audio/battleThemeA.mp3',
  showThemeToggle: false,
});

const isMobile = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
if (isMobile) {
  canvas.width = 720;
  canvas.height = 1000;
} else {
  canvas.width = 960;
  canvas.height = 640;
}

const W = canvas.width;
const H = canvas.height;
const CX = W * 0.5;
const CY = H * 0.5;

const STORAGE = {
  server: 'sunken-multi-server-url',
  playerId: 'sunken-multi-player-id',
  playerName: 'sunken-multi-player-name',
  roomSize: 'sunken-multi-room-size',
  roomId: 'sunken-multi-room-id',
  pending: 'sunken-multi-pending-actions',
};

const LANES = ['north', 'east', 'south', 'west'];
const SLOT_COUNT = 8;

const LANE_LABEL = {
  north: '12시',
  east: '3시',
  south: '6시',
  west: '9시',
};

const LANE_COLOR = {
  north: '#87d8ff',
  east: '#ffd27d',
  south: '#b8ffb2',
  west: '#e3b3ff',
};

const TOWER_TYPES = {
  sunken: { id: 'sunken', name: 'Sunken', cost: 60, color: '#86d9ff' },
  spine: { id: 'spine', name: 'Spine', cost: 92, color: '#b7e8a3' },
  obelisk: { id: 'obelisk', name: 'Obelisk', cost: 138, color: '#e6b8ff' },
  snare: { id: 'snare', name: 'Snare', cost: 118, color: '#9beaff' },
};

const ENEMY_COLORS = {
  ghoul: '#83e693',
  bat: '#ffbe6f',
  hopper: '#93e7ff',
  brute: '#ffdbe0',
  elder: '#d9b2ff',
  raider: '#91b8ff',
  crusher: '#ff8f8f',
  lord: '#ffa0f2',
  // 구버전 서버 상태와의 호환 색상.
  runner: '#ffbe6f',
  siege: '#ff8f8f',
  boss: '#ffa0f2',
};

const client = {
  ws: null,
  connected: false,
  shouldAutoReconnect: false,
  joining: false,
  createAfterConnect: '',
  createMaxPlayers: 4,

  serverUrl: '',
  playerId: '',
  playerName: '',
  roomId: '',
  roomName: '',
  lane: '',

  rooms: [],
  snapshot: null,
  notices: [],

  selectedTower: 'sunken',
  sellMode: false,

  pending: [],
  lastRoomsAt: 0,
  lastPingAt: 0,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function randomId(prefix = 'a') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
    return `${parsed.protocol}//${host}${port}`;
  } catch (_) {
    return '';
  }
}

function fixedMultiServerUrl() {
  const configured = window.TapTapChoConfig?.multiServer || '';
  return normalizeServerUrl(configured);
}

function defaultMultiServerUrl() {
  const host = window.location.hostname || 'localhost';
  return `ws://${host}:9091`;
}

function normalizeName(value) {
  const v = String(value || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 14);
  return v || `Player${Math.floor(Math.random() * 900 + 100)}`;
}

function normalizeRoomName(value) {
  const v = String(value || '').trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 22);
  return v || 'Sunken Team Room';
}

function normalizeRoomSize(value) {
  const v = Math.floor(Number(value) || 4);
  if (v <= 2) return 2;
  if (v === 3) return 3;
  return 4;
}

function roomActiveLanes(room) {
  const lanes = Array.isArray(room?.activeLanes) ? room.activeLanes.filter((lane) => LANES.includes(lane)) : [];
  return lanes.length ? lanes : [...LANES];
}

function laneGroupText(room) {
  return roomActiveLanes(room)
    .map((lane) => LANE_LABEL[lane] || lane)
    .join('/');
}

function lanePoint(lane, progress) {
  const t = clamp(progress, 0, 1);

  if (lane === 'north') {
    return { x: CX, y: lerp(H * 0.08, CY, t) };
  }
  if (lane === 'east') {
    return { x: lerp(W * 0.92, CX, t), y: CY };
  }
  if (lane === 'south') {
    return { x: CX, y: lerp(H * 0.92, CY, t) };
  }
  return { x: lerp(W * 0.08, CX, t), y: CY };
}

function slotProgress(slot) {
  return clamp((slot + 1) / (SLOT_COUNT + 1), 0.08, 0.92);
}

function slotWorldPos(lane, slot) {
  return lanePoint(lane, slotProgress(slot));
}

function setStatus(text, kind = '') {
  statusTextEl.textContent = text;
  statusTextEl.classList.remove('ok', 'bad');
  if (kind) {
    statusTextEl.classList.add(kind);
  }
}

function pushNotice(text, ttl = 2.2) {
  client.notices.push({ text, ttl });
  if (client.notices.length > 4) client.notices.shift();
}

function saveInputs() {
  localStorage.setItem(STORAGE.server, client.serverUrl);
  localStorage.setItem(STORAGE.playerId, client.playerId);
  localStorage.setItem(STORAGE.playerName, client.playerName);
  localStorage.setItem(STORAGE.roomSize, String(client.createMaxPlayers || 4));
  if (client.roomId) {
    localStorage.setItem(STORAGE.roomId, client.roomId);
  } else {
    localStorage.removeItem(STORAGE.roomId);
  }
}

function savePending() {
  const out = client.pending.map((it) => ({
    actionId: it.actionId,
    roomId: it.roomId,
    action: it.action,
    sentAt: it.sentAt || 0,
  }));
  localStorage.setItem(STORAGE.pending, JSON.stringify(out));
}

function loadStorage() {
  const fixedServer = fixedMultiServerUrl();
  client.serverUrl = fixedServer
    || normalizeServerUrl(localStorage.getItem(STORAGE.server) || '')
    || defaultMultiServerUrl();
  client.playerId = String(localStorage.getItem(STORAGE.playerId) || '').trim();
  if (!client.playerId) {
    client.playerId = randomId('p').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
  }

  client.playerName = normalizeName(localStorage.getItem(STORAGE.playerName) || '');
  client.createMaxPlayers = normalizeRoomSize(localStorage.getItem(STORAGE.roomSize) || '4');
  client.roomId = String(localStorage.getItem(STORAGE.roomId) || '').trim().toUpperCase();

  let pending = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE.pending) || '[]');
    if (Array.isArray(parsed)) pending = parsed;
  } catch (error) {
    pending = [];
  }

  client.pending = pending
    .filter((it) => it && typeof it === 'object' && it.action && typeof it.action === 'object')
    .map((it) => ({
      actionId: String(it.actionId || randomId('a')).slice(0, 40),
      roomId: String(it.roomId || '').toUpperCase(),
      action: it.action,
      sentAt: Number(it.sentAt || 0),
    }));

  serverUrlEl.value = client.serverUrl;
  serverUrlEl.readOnly = Boolean(fixedServer);
  serverUrlEl.title = fixedServer ? '고정 서버 모드' : '';
  playerNameEl.value = client.playerName;
  roomNameEl.value = 'Sunken Team Room';
  if (roomSizeEl) roomSizeEl.value = String(client.createMaxPlayers);

  saveInputs();
  savePending();
}

function updateReconnectVisibility() {
  const shouldShow = !client.connected && client.shouldAutoReconnect && Boolean(client.roomId);
  btnReconnect.classList.toggle('visible', shouldShow);
}

function setOverlay(text, visible) {
  overlayEl.textContent = text;
  overlayEl.classList.toggle('hidden', !visible);
}

function connect(silent = false) {
  const fixedServer = fixedMultiServerUrl();
  client.serverUrl = fixedServer
    || normalizeServerUrl(serverUrlEl.value)
    || defaultMultiServerUrl();
  client.playerName = normalizeName(playerNameEl.value);
  serverUrlEl.value = client.serverUrl;
  serverUrlEl.readOnly = Boolean(fixedServer);
  playerNameEl.value = client.playerName;
  saveInputs();

  if (client.ws) {
    try {
      client.ws.close();
    } catch (error) {
      // ignore
    }
  }

  let ws;
  try {
    ws = new WebSocket(client.serverUrl);
  } catch (error) {
    setStatus('서버 주소가 올바르지 않습니다.', 'bad');
    updateReconnectVisibility();
    return;
  }

  client.ws = ws;
  if (!silent) setStatus('서버 연결 중...');

  ws.addEventListener('open', () => {
    if (client.ws !== ws) return;
    client.connected = true;
    setStatus('서버 연결됨', 'ok');

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
        maxPlayers: client.createMaxPlayers,
      }));
      client.createAfterConnect = '';
      return;
    }

    if (client.roomId) {
      ws.send(JSON.stringify({
        type: 'join_room',
        roomId: client.roomId,
      }));
      client.joining = true;
    }

    updateReconnectVisibility();
  });

  ws.addEventListener('message', (event) => {
    if (client.ws !== ws) return;

    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'welcome') {
      if (msg.playerId) {
        client.playerId = String(msg.playerId);
        saveInputs();
      }
      if (msg.name) {
        client.playerName = normalizeName(msg.name);
        playerNameEl.value = client.playerName;
        saveInputs();
      }
      return;
    }

    if (msg.type === 'rooms') {
      client.rooms = Array.isArray(msg.rooms) ? msg.rooms : [];
      client.lastRoomsAt = Date.now();
      renderRooms();
      return;
    }

    if (msg.type === 'joined') {
      client.roomId = String(msg.roomId || '').toUpperCase();
      client.roomName = String(msg.roomName || '');
      client.lane = String(msg.lane || '');
      client.joining = false;
      saveInputs();

      setStatus(`${client.roomName || client.roomId} 입장`, 'ok');
      pushNotice(`${msg.laneLabel || LANE_LABEL[client.lane] || '-'} 담당 배정`);
      setOverlay('스냅샷 수신 대기 중...', true);

      flushPending();
      updateReconnectVisibility();
      return;
    }

    if (msg.type === 'left') {
      client.roomId = '';
      client.roomName = '';
      client.lane = '';
      client.snapshot = null;
      saveInputs();
      setStatus('방에서 나왔습니다.', 'ok');
      setOverlay('방 목록에서 입장하면 시작됩니다.', true);
      return;
    }

    if (msg.type === 'snapshot') {
      client.snapshot = msg.room || null;
      if (client.snapshot) {
        setOverlay('', false);
      }
      refreshHud();
      return;
    }

    if (msg.type === 'action_ack') {
      const actionId = String(msg.actionId || '');
      if (!actionId) return;

      const idx = client.pending.findIndex((it) => it.actionId === actionId && it.roomId === client.roomId);
      if (idx >= 0) {
        client.pending.splice(idx, 1);
        savePending();
        refreshHud();

        if (!msg.ok && msg.reason) {
          pushNotice(`작업 반려: ${msg.reason}`);
        }
      }
      return;
    }

    if (msg.type === 'room_notice') {
      if (msg.message) pushNotice(String(msg.message));
      return;
    }

    if (msg.type === 'error') {
      setStatus(msg.message || '서버 오류', 'bad');
      if (msg.message) pushNotice(msg.message);
      return;
    }
  });

  ws.addEventListener('close', () => {
    if (client.ws !== ws) return;
    client.connected = false;
    setStatus('오프라인: 새로고침/재연결 버튼으로 복구 가능', 'bad');
    updateReconnectVisibility();
  });

  ws.addEventListener('error', () => {
    if (client.ws !== ws) return;
    client.connected = false;
    setStatus('연결 오류', 'bad');
    updateReconnectVisibility();
  });
}

function requestRooms() {
  if (client.connected && client.ws && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({ type: 'list_rooms' }));
    return;
  }

  connect(true);
}

function createRoom() {
  const roomName = normalizeRoomName(roomNameEl.value);
  roomNameEl.value = roomName;
  client.createMaxPlayers = normalizeRoomSize(roomSizeEl ? roomSizeEl.value : client.createMaxPlayers);
  if (roomSizeEl) roomSizeEl.value = String(client.createMaxPlayers);

  client.shouldAutoReconnect = true;
  client.roomId = '';
  client.roomName = '';
  client.lane = '';
  client.snapshot = null;
  client.createAfterConnect = roomName;
  saveInputs();
  updateReconnectVisibility();

  if (!client.connected || !client.ws || client.ws.readyState !== WebSocket.OPEN) {
    connect();
    return;
  }

  client.ws.send(JSON.stringify({
    type: 'create_room',
    roomName: client.createAfterConnect,
    maxPlayers: client.createMaxPlayers,
  }));
  client.createAfterConnect = '';
}

function joinRoom(roomId) {
  const clean = String(roomId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!clean) return;

  client.createAfterConnect = '';
  client.roomId = clean;
  client.shouldAutoReconnect = true;
  saveInputs();
  updateReconnectVisibility();

  if (!client.connected || !client.ws || client.ws.readyState !== WebSocket.OPEN) {
    connect();
    return;
  }

  client.ws.send(JSON.stringify({
    type: 'join_room',
    roomId: clean,
  }));
}

function leaveRoom() {
  client.shouldAutoReconnect = false;
  client.createAfterConnect = '';

  if (client.connected && client.ws && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({ type: 'leave_room' }));
  }

  client.pending = client.pending.filter((it) => it.roomId !== client.roomId);
  savePending();
  client.roomId = '';
  client.roomName = '';
  client.lane = '';
  client.snapshot = null;
  saveInputs();
  updateReconnectVisibility();
  refreshHud();
  setOverlay('방 목록에서 입장하면 시작됩니다.', true);
}

function renderRooms() {
  roomListEl.innerHTML = '';

  if (!client.rooms.length) {
    const empty = document.createElement('div');
    empty.className = 'room-item';
    empty.innerHTML = '<h3>열린 방이 없습니다</h3><div class="meta">방 만들기를 눌러 멀티를 시작하세요.</div>';
    roomListEl.appendChild(empty);
    return;
  }

  for (const room of client.rooms) {
    const item = document.createElement('div');
    item.className = 'room-item';

    const joined = client.roomId && client.roomId === room.id;
    const full = room.total >= room.cap && !joined;

    item.innerHTML = `
      <h3>${room.name}</h3>
      <div class="meta">ID ${room.id} · 인원 ${room.online}/${room.cap}</div>
      <div class="meta">라인 ${laneGroupText(room)}</div>
      <div class="meta">Wave ${room.wave} · Core ${room.coreHp}/${room.coreHpMax}</div>
      <div class="meta">상태 ${room.phase === 'defeat' ? '패배' : '진행중'}</div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = joined ? '참가 중' : (full ? '가득 참' : '참가');
    btn.disabled = Boolean(full || joined);
    btn.addEventListener('click', () => joinRoom(room.id));
    item.appendChild(btn);

    roomListEl.appendChild(item);
  }
}

function cloneLanesFromSnapshot() {
  const out = {
    north: Array.from({ length: SLOT_COUNT }, () => null),
    east: Array.from({ length: SLOT_COUNT }, () => null),
    south: Array.from({ length: SLOT_COUNT }, () => null),
    west: Array.from({ length: SLOT_COUNT }, () => null),
  };

  if (!client.snapshot || !client.snapshot.lanes) return out;

  for (const lane of LANES) {
    const src = client.snapshot.lanes[lane];
    if (!Array.isArray(src)) continue;

    out[lane] = src.map((tower) => {
      if (!tower) return null;
      return {
        type: String(tower.type || 'sunken'),
        hp: Number(tower.hp || 0),
        maxHp: Number(tower.maxHp || 1),
        owner: String(tower.owner || ''),
      };
    });
  }

  return out;
}

function mergedLanesWithPending() {
  const lanes = cloneLanesFromSnapshot();
  const active = roomActiveLanes(client.snapshot);

  const pending = client.pending.filter((it) => it.roomId === client.roomId);
  for (const item of pending) {
    const action = item.action;
    if (!action || !active.includes(action.lane)) continue;
    const slot = Number(action.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) continue;

    if (action.kind === 'build') {
      const towerType = String(action.towerType || 'sunken');
      lanes[action.lane][slot] = {
        type: towerType,
        hp: 1,
        maxHp: 1,
        owner: client.playerId,
        ghost: true,
      };
    } else if (action.kind === 'sell') {
      lanes[action.lane][slot] = null;
    }
  }

  return lanes;
}

function refreshHud() {
  const room = client.snapshot;
  const playerCount = room && Array.isArray(room.players) ? room.players.length : 0;

  roomTextEl.textContent = client.roomName || client.roomId || '-';
  laneTextEl.textContent = client.lane ? (LANE_LABEL[client.lane] || client.lane) : '-';
  waveTextEl.textContent = room ? `${room.wave}${room.waveState === 'cooldown' ? ' (준비)' : ''}` : '-';
  coreTextEl.textContent = room ? `${room.coreHp}/${room.coreHpMax}` : '-';
  goldTextEl.textContent = room ? String(room.teamGold) : '-';
  queueTextEl.textContent = room ? String(room.queue) : '-';
  playersTextEl.textContent = room ? String(playerCount) : '-';

  const pendingCount = client.pending.filter((it) => it.roomId === client.roomId).length;
  pendingTextEl.textContent = String(pendingCount);

  if (client.lane) {
    const sellText = client.sellMode ? 'ON' : 'OFF';
    hintTextEl.textContent = `내 라인(${LANE_LABEL[client.lane]}) 슬롯 터치로 배치 · E 판매모드(${sellText}) · 오프라인 작업은 Pending 유지`;
  }
}

function setSelectedTower(towerId) {
  client.selectedTower = towerId;

  const all = [btnSunken, btnSpine, btnObelisk, btnSnare];
  for (const btn of all) {
    btn.classList.toggle('active', btn.dataset.tower === towerId);
  }
}

function setSellMode(enabled) {
  client.sellMode = enabled;
  btnSellMode.classList.toggle('active', enabled);
  btnSellMode.querySelector('.name').textContent = enabled ? 'SELL ON' : 'SELL OFF';
  refreshHud();
}

function enqueueAction(action) {
  if (!client.roomId || !client.lane) {
    pushNotice('먼저 방에 참가하세요.');
    return;
  }

  const actionId = randomId('act').slice(0, 38);
  client.pending.push({
    actionId,
    roomId: client.roomId,
    action,
    sentAt: 0,
  });

  savePending();
  refreshHud();
  flushPending();
}

function flushPending() {
  if (!client.connected || !client.ws || client.ws.readyState !== WebSocket.OPEN) return;
  if (!client.roomId) return;

  const now = Date.now();
  for (const item of client.pending) {
    if (item.roomId !== client.roomId) continue;
    if (item.sentAt && now - item.sentAt < 1100) continue;

    client.ws.send(JSON.stringify({
      type: 'action',
      action: {
        ...item.action,
        actionId: item.actionId,
      },
    }));
    item.sentAt = now;
  }

  savePending();
}

function getMyLaneSlotByPointer(x, y) {
  if (!client.lane) return null;

  let best = null;
  let bestD = Infinity;

  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    const p = slotWorldPos(client.lane, slot);
    const d = distSq(x, y, p.x, p.y);

    if (d < bestD) {
      bestD = d;
      best = slot;
    }
  }

  const maxRadius = isMobile ? 36 : 28;
  if (best === null || bestD > maxRadius * maxRadius) return null;
  return best;
}

function issueBuildOrSell(slot) {
  if (client.sellMode) {
    enqueueAction({
      kind: 'sell',
      lane: client.lane,
      slot,
    });
    return;
  }

  enqueueAction({
    kind: 'build',
    lane: client.lane,
    slot,
    towerType: client.selectedTower,
  });
}

function drawBackgroundGrid() {
  ctx.fillStyle = '#0b1426';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(95, 124, 173, 0.2)';
  ctx.lineWidth = 1;

  const gap = isMobile ? 34 : 30;
  for (let x = 0; x <= W; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
}

function drawLanes() {
  ctx.lineCap = 'round';
  const active = roomActiveLanes(client.snapshot);

  for (const lane of active) {
    const start = lanePoint(lane, 0);
    const end = lanePoint(lane, 1);

    ctx.strokeStyle = `${LANE_COLOR[lane]}88`;
    ctx.lineWidth = isMobile ? 20 : 24;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.strokeStyle = `${LANE_COLOR[lane]}bb`;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const spawn = lanePoint(lane, 0);
    ctx.fillStyle = LANE_COLOR[lane];
    ctx.beginPath();
    ctx.arc(spawn.x, spawn.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dbe9ff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(LANE_LABEL[lane], spawn.x, spawn.y - 16);
  }

  if (client.lane) {
    const lane = client.lane;
    const start = lanePoint(lane, 0);
    const end = lanePoint(lane, 1);

    ctx.strokeStyle = '#f5d27c';
    ctx.lineWidth = isMobile ? 4 : 5;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

function drawSlots(lanes) {
  const active = roomActiveLanes(client.snapshot);
  for (const lane of active) {
    const slots = lanes[lane] || [];

    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const pos = slotWorldPos(lane, i);
      const tower = slots[i];

      if (tower) {
        const color = TOWER_TYPES[tower.type]?.color || '#b7d4ff';
        ctx.fillStyle = color;
        ctx.strokeStyle = tower.ghost ? 'rgba(255,255,255,0.5)' : '#152641';
        ctx.lineWidth = tower.ghost ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isMobile ? 14 : 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (tower.type === 'obelisk') {
          ctx.fillStyle = '#0e1730';
          ctx.fillRect(pos.x - 2.2, pos.y - 9, 4.4, 18);
        } else if (tower.type === 'spine') {
          ctx.fillStyle = '#17311f';
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - 9);
          ctx.lineTo(pos.x + 8, pos.y + 7);
          ctx.lineTo(pos.x - 8, pos.y + 7);
          ctx.closePath();
          ctx.fill();
        } else if (tower.type === 'snare') {
          ctx.strokeStyle = '#0f2f49';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        continue;
      }

      const mine = client.lane === lane;
      ctx.fillStyle = mine ? 'rgba(240, 202, 119, 0.14)' : 'rgba(196, 212, 240, 0.07)';
      ctx.strokeStyle = mine ? '#f0ca77' : 'rgba(180, 196, 224, 0.26)';
      ctx.lineWidth = mine ? 2 : 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isMobile ? 12 : 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawEnemies(room) {
  if (!room || !Array.isArray(room.enemies)) return;

  for (const enemy of room.enemies) {
    const p = lanePoint(enemy.lane, enemy.progress);
    const color = ENEMY_COLORS[enemy.kind] || '#ffb6b6';

    ctx.fillStyle = color;
    ctx.strokeStyle = '#111f3d';
    ctx.lineWidth = 1.5;

    const isBossLike = enemy.kind === 'lord' || enemy.kind === 'boss';
    const w = isBossLike ? 26 : 18;
    const h = isBossLike ? 18 : 12;

    const rx = p.x - w * 0.5;
    const ry = p.y - h * 0.5;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(rx, ry, w, h, 4);
      ctx.fill();
    } else {
      ctx.fillRect(rx, ry, w, h);
    }
    ctx.stroke();

    const hpRate = clamp(enemy.hp / Math.max(1, enemy.maxHp), 0, 1);
    ctx.fillStyle = 'rgba(10, 16, 28, 0.8)';
    ctx.fillRect(p.x - 12, p.y - h * 0.5 - 8, 24, 4);
    ctx.fillStyle = hpRate > 0.35 ? '#90f4b5' : '#ff9797';
    ctx.fillRect(p.x - 12, p.y - h * 0.5 - 8, 24 * hpRate, 4);
  }
}

function drawCore(room) {
  const coreHp = room ? room.coreHp : 0;
  const coreMax = room ? room.coreHpMax : 1;
  const hpRate = clamp(coreHp / Math.max(1, coreMax), 0, 1);

  const radius = isMobile ? 34 : 40;
  const aura = 62;

  ctx.fillStyle = 'rgba(171, 205, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(CX, CY, aura, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hpRate > 0.36 ? '#7af3a8' : '#ff9ab2';
  ctx.beginPath();
  ctx.arc(CX, CY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0a1426';
  ctx.font = 'bold 18px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(coreHp)), CX, CY + 6);
}

function drawTopHud() {
  ctx.fillStyle = 'rgba(8, 14, 28, 0.68)';
  ctx.fillRect(12, 12, 280, 58);

  ctx.fillStyle = '#dbe9ff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`Room ${client.roomId || '-'}`, 20, 34);
  ctx.fillText(`Lane ${LANE_LABEL[client.lane] || '-'}`, 20, 56);

  const pendingCount = client.pending.filter((it) => it.roomId === client.roomId).length;
  if (pendingCount > 0) {
    ctx.fillStyle = '#f5d27c';
    ctx.fillText(`Pending ${pendingCount}`, 168, 56);
  }
}

function drawNotices(dt) {
  if (!client.notices.length) return;

  for (let i = client.notices.length - 1; i >= 0; i -= 1) {
    const n = client.notices[i];
    n.ttl -= dt;
    if (n.ttl <= 0) {
      client.notices.splice(i, 1);
    }
  }

  if (!client.notices.length) return;

  const line = client.notices[client.notices.length - 1];
  ctx.fillStyle = 'rgba(8, 13, 24, 0.75)';
  ctx.fillRect(W * 0.5 - 240, H - 56, 480, 36);
  ctx.fillStyle = '#e8f2ff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(line.text, W * 0.5, H - 32);
}

function render(dt) {
  drawBackgroundGrid();
  drawLanes();

  const mergedLanes = mergedLanesWithPending();
  drawSlots(mergedLanes);

  drawEnemies(client.snapshot);
  drawCore(client.snapshot);
  drawTopHud();
  drawNotices(dt);

  if (client.snapshot && client.snapshot.phase === 'defeat') {
    setOverlay('코어가 파괴되었습니다. 방 새로 만들기 또는 재참가 하세요.', true);
  }
}

let prevFrameAt = performance.now();

function loop(now) {
  const dt = clamp((now - prevFrameAt) / 1000, 0.001, 0.05);
  prevFrameAt = now;

  render(dt);
  requestAnimationFrame(loop);
}

function handleCanvasPointer(event) {
  if (!client.roomId || !client.lane) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  const slot = getMyLaneSlotByPointer(x, y);
  if (slot === null) return;

  issueBuildOrSell(slot);
}

function setupEvents() {
  btnConnect.addEventListener('click', () => {
    client.shouldAutoReconnect = true;
    connect();
    updateReconnectVisibility();
  });

  roomSizeEl?.addEventListener('change', () => {
    client.createMaxPlayers = normalizeRoomSize(roomSizeEl.value);
    roomSizeEl.value = String(client.createMaxPlayers);
    saveInputs();
  });

  btnCreateRoom.addEventListener('click', createRoom);
  btnRefreshRooms.addEventListener('click', requestRooms);
  btnLeaveRoom.addEventListener('click', leaveRoom);
  btnReconnect.addEventListener('click', () => connect());

  btnSunken.addEventListener('click', () => setSelectedTower('sunken'));
  btnSpine.addEventListener('click', () => setSelectedTower('spine'));
  btnObelisk.addEventListener('click', () => setSelectedTower('obelisk'));
  btnSnare.addEventListener('click', () => setSelectedTower('snare'));
  btnSellMode.addEventListener('click', () => setSellMode(!client.sellMode));

  canvas.addEventListener('pointerdown', (event) => {
    handleCanvasPointer(event);
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Digit1') setSelectedTower('sunken');
    if (event.code === 'Digit2') setSelectedTower('spine');
    if (event.code === 'Digit3') setSelectedTower('obelisk');
    if (event.code === 'Digit4') setSelectedTower('snare');
    if (event.code === 'KeyE') {
      setSellMode(!client.sellMode);
      event.preventDefault();
    }
  });

  window.addEventListener('online', () => {
    if (client.shouldAutoReconnect) connect(true);
  });
}

setInterval(() => {
  if (client.connected) {
    flushPending();

    if (client.ws && client.ws.readyState === WebSocket.OPEN) {
      const now = Date.now();
      if (now - client.lastPingAt > 8000) {
        client.ws.send(JSON.stringify({ type: 'ping' }));
        client.lastPingAt = now;
      }
    }
    return;
  }

  if (!client.shouldAutoReconnect || !client.roomId) return;

  const now = Date.now();
  if (now - client.lastRoomsAt > 3500) {
    connect(true);
    client.lastRoomsAt = now;
  }
}, 700);

loadStorage();
setupEvents();
setSelectedTower('sunken');
setSellMode(false);
refreshHud();
renderRooms();
updateReconnectVisibility();
setOverlay(client.roomId ? '재연결 중...' : '방 목록에서 입장하면 시작됩니다.', true);
connect(true);
requestAnimationFrame(loop);
