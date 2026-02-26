const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');

const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnRotate = document.getElementById('btnRotate');
const btnDown = document.getElementById('btnDown');
const btnDrop = document.getElementById('btnDrop');
const btnHold = document.getElementById('btnHold');
const btnPause = document.getElementById('btnPause');
const btnRestart = document.getElementById('btnRestart');
const btnSound = document.getElementById('btnSound');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayDesc = document.getElementById('overlayDesc');
const btnResume = document.getElementById('btnResume');

const COLS = 10;
const ROWS = 20;
const BLOCK = 24;
const BEST_KEY = 'taptap-tetris-best-v2';
const SOUND_KEY = 'taptap-tetris-sound-v2';

const COLORS = {
  I: '#4fd9ff',
  O: '#ffe37c',
  T: '#cf8cff',
  S: '#7ff1a4',
  Z: '#ff8fa8',
  J: '#80a8ff',
  L: '#ffbe7b',
  G: 'rgba(190,220,255,0.22)',
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

let arena = createMatrix(COLS, ROWS);
let queue = [];
let holdType = null;
let canHold = true;

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  type: null,
};

let state = 'running'; // running | paused | gameover
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let lines = 0;
let level = 1;
let combo = 0;
let comboTimer = 0;
let backToBack = false;

let dropCounter = 0;
let lastTime = 0;
let flash = 0;
let shake = 0;
let softDrop = false;

bestEl.textContent = String(best);

function createSfx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let enabled = localStorage.getItem(SOUND_KEY) !== 'off';

  function ensure() {
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone({ freq = 440, end = null, type = 'triangle', gain = 0.03, dur = 0.07 }) {
    if (!enabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (end != null) osc.frequency.linearRampToValueAtTime(end, now + dur);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  return {
    ensure,
    toggle() {
      enabled = !enabled;
      localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    move() {
      tone({ freq: 340, end: 430, dur: 0.04, gain: 0.02 });
    },
    rotate() {
      tone({ freq: 510, end: 690, dur: 0.05, gain: 0.025 });
    },
    lock() {
      tone({ freq: 240, end: 130, dur: 0.06, gain: 0.028, type: 'square' });
    },
    clear() {
      tone({ freq: 430, end: 880, dur: 0.14, gain: 0.05 });
    },
    hold() {
      tone({ freq: 620, end: 520, dur: 0.08, gain: 0.03 });
    },
    over() {
      tone({ freq: 170, end: 80, dur: 0.2, gain: 0.07, type: 'sawtooth' });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  btnSound.textContent = `사운드: ${sfx.isEnabled() ? '켜짐' : '꺼짐'}`;
}

function createMatrix(w, h) {
  const m = [];
  for (let y = 0; y < h; y += 1) m.push(new Array(w).fill(0));
  return m;
}

function createPiece(type) {
  return SHAPES[type].map((row) => row.map((v) => (v ? type : 0)));
}

function randomType() {
  const types = 'IOTSZJL';
  return types[Math.floor(Math.random() * types.length)];
}

function refillQueue() {
  const bag = 'IOTSZJL'.split('');
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  queue.push(...bag);
}

function nextType() {
  if (queue.length < 4) refillQueue();
  return queue.shift();
}

function collide(arenaM, p) {
  const m = p.matrix;
  const o = p.pos;

  for (let y = 0; y < m.length; y += 1) {
    for (let x = 0; x < m[y].length; x += 1) {
      if (!m[y][x]) continue;
      if (arenaM[y + o.y] && arenaM[y + o.y][x + o.x] === 0) continue;
      return true;
    }
  }
  return false;
}

function merge(arenaM, p) {
  p.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) arenaM[y + p.pos.y][x + p.pos.x] = value;
    });
  });
}

function rotate(matrix, dir) {
  const m = matrix.map((row) => row.slice());
  for (let y = 0; y < m.length; y += 1) {
    for (let x = 0; x < y; x += 1) {
      [m[x][y], m[y][x]] = [m[y][x], m[x][y]];
    }
  }
  if (dir > 0) m.forEach((row) => row.reverse());
  else m.reverse();
  return m;
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  const rotated = rotate(player.matrix, dir);
  player.matrix = rotated;

  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length + 1) {
      player.matrix = rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
  sfx.rotate();
}

function ghostY() {
  const ghost = {
    pos: { x: player.pos.x, y: player.pos.y },
    matrix: player.matrix,
  };

  while (!collide(arena, ghost)) {
    ghost.pos.y += 1;
  }
  ghost.pos.y -= 1;
  return ghost.pos.y;
}

function drawMatrix(matrix, offset, context, block = BLOCK, alpha = 1) {
  context.globalAlpha = alpha;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      context.fillStyle = COLORS[value];
      context.fillRect((x + offset.x) * block, (y + offset.y) * block, block - 1, block - 1);
    });
  });
  context.globalAlpha = 1;
}

function drawPreview(type, context, canvasEl) {
  context.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (!type) return;
  const mat = createPiece(type);
  const ox = Math.floor((4 - mat[0].length) / 2);
  const oy = Math.floor((4 - mat.length) / 2);
  drawMatrix(mat, { x: ox, y: oy }, context, 20, 1);
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
  comboEl.textContent = `x${(1 + Math.min(1.5, combo / 4)).toFixed(1)}`;

  drawPreview(queue[0], nextCtx, nextCanvas);
  drawPreview(holdType, holdCtx, holdCanvas);
}

function dropInterval() {
  return Math.max(120, 900 - (level - 1) * 70);
}

function arenaSweep() {
  let rowCount = 0;

  outer: for (let y = arena.length - 1; y >= 0; y -= 1) {
    for (let x = 0; x < arena[y].length; x += 1) {
      if (arena[y][x] === 0) continue outer;
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    y += 1;
    rowCount += 1;
  }

  if (rowCount === 0) {
    combo = 0;
    backToBack = false;
    return;
  }

  const base = [0, 120, 360, 720, 1200][rowCount] || 0;
  let gained = base * level;

  if (rowCount === 4 && backToBack) gained = Math.floor(gained * 1.35);
  backToBack = rowCount === 4;

  combo += 1;
  comboTimer = 2.5;
  gained = Math.floor(gained * (1 + Math.min(1.5, combo / 5)));

  score += gained;
  lines += rowCount;
  level = 1 + Math.floor(lines / 10);

  flash = 18;
  shake = 8 + rowCount * 2;
  sfx.clear();
}

function playerReset() {
  player.type = nextType();
  player.matrix = createPiece(player.type);
  player.pos.y = 0;
  player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
  canHold = true;

  if (collide(arena, player)) {
    state = 'gameover';
    overlay.classList.remove('hidden');
    overlayTitle.textContent = '게임 오버';
    overlayDesc.textContent = '재시작 버튼으로 다시 도전하세요.';
    sfx.over();
  }
}

function playerMove(dir) {
  if (state !== 'running') return;
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
  else sfx.move();
}

function playerDrop() {
  if (state !== 'running') return;
  player.pos.y += 1;
  if (collide(arena, player)) {
    player.pos.y -= 1;
    merge(arena, player);
    sfx.lock();
    arenaSweep();
    playerReset();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (state !== 'running') return;
  while (!collide(arena, player)) player.pos.y += 1;
  player.pos.y -= 1;
  merge(arena, player);
  sfx.lock();
  arenaSweep();
  playerReset();
  dropCounter = 0;
}

function holdSwap() {
  if (state !== 'running' || !canHold) return;

  const current = player.type;
  if (!holdType) {
    holdType = current;
    playerReset();
  } else {
    player.type = holdType;
    holdType = current;
    player.matrix = createPiece(player.type);
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
      state = 'gameover';
      overlay.classList.remove('hidden');
      overlayTitle.textContent = '게임 오버';
      overlayDesc.textContent = '재시작 버튼으로 다시 도전하세요.';
      sfx.over();
    }
  }

  canHold = false;
  sfx.hold();
  updateHud();
}

function restart() {
  arena = createMatrix(COLS, ROWS);
  queue = [];
  holdType = null;
  canHold = true;

  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  comboTimer = 0;
  backToBack = false;
  dropCounter = 0;
  flash = 0;
  shake = 0;

  state = 'running';
  overlay.classList.add('hidden');

  refillQueue();
  refillQueue();
  playerReset();
  updateHud();
}

function togglePause() {
  if (state === 'gameover') return;
  if (state === 'running') {
    state = 'paused';
    overlay.classList.remove('hidden');
    overlayTitle.textContent = '일시정지';
    overlayDesc.textContent = '이어하기를 누르면 게임이 재개됩니다.';
  } else if (state === 'paused') {
    state = 'running';
    overlay.classList.add('hidden');
  }
}

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, '#152f64');
  grd.addColorStop(1, '#0b1530');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 44; i += 1) {
    const x = (i * 37 + lastTime * 0.03) % canvas.width;
    const y = (i * 61 + lastTime * 0.02) % canvas.height;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(170,210,255,0.16)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawArena() {
  drawMatrix(arena, { x: 0, y: 0 }, ctx);
}

function drawGhost() {
  const gy = ghostY();
  drawMatrix(player.matrix, { x: player.pos.x, y: gy }, ctx, BLOCK, 0.26);
}

function drawPlayer() {
  drawMatrix(player.matrix, player.pos, ctx);
}

function drawOverlayEffects() {
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 142, 192, ${0.05 + flash / 260})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = 'rgba(7, 14, 31, 0.36)';
  ctx.fillRect(8, 8, canvas.width - 16, 32);
  ctx.fillStyle = '#d3e7ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`레벨 ${level} · 드롭 ${Math.round(dropInterval())}ms`, 14, 29);

  ctx.textAlign = 'right';
  ctx.fillText(`콤보 x${(1 + Math.min(1.5, combo / 4)).toFixed(1)}`, canvas.width - 14, 29);
}

function render() {
  let sx = 0;
  let sy = 0;
  if (shake > 0) {
    sx = (Math.random() * 2 - 1) * shake;
    sy = (Math.random() * 2 - 1) * shake;
  }

  ctx.save();
  ctx.translate(sx, sy);

  drawBackground();
  drawArena();
  if (state !== 'gameover') drawGhost();
  drawPlayer();
  drawOverlayEffects();

  ctx.restore();
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (state === 'running') {
    dropCounter += delta;
    if (dropCounter > (softDrop ? dropInterval() * 0.08 : dropInterval())) {
      playerDrop();
    }

    if (comboTimer > 0) {
      comboTimer -= delta / 1000;
      if (comboTimer <= 0) combo = 0;
    }

    if (flash > 0) flash -= 1;
    if (shake > 0) shake = Math.max(0, shake - delta * 0.02);

    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }

    updateHud();
  }

  render();
  requestAnimationFrame(update);
}

function bindHoldButton(el, action, repeat = false) {
  let timer = null;
  const start = (e) => {
    e.preventDefault();
    action();
    if (repeat) timer = setInterval(action, 80);
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  el.addEventListener('mousedown', start);
  el.addEventListener('touchstart', start, { passive: false });
  el.addEventListener('mouseup', stop);
  el.addEventListener('mouseleave', stop);
  el.addEventListener('touchend', stop);
}

bindHoldButton(btnLeft, () => playerMove(-1), true);
bindHoldButton(btnRight, () => playerMove(1), true);
bindHoldButton(btnRotate, () => playerRotate(1));
bindHoldButton(btnDown, () => {
  softDrop = true;
  playerDrop();
}, true);
btnDown.addEventListener('mouseup', () => {
  softDrop = false;
});
btnDown.addEventListener('touchend', () => {
  softDrop = false;
});
bindHoldButton(btnDrop, hardDrop);
bindHoldButton(btnHold, holdSwap);

btnPause.addEventListener('click', togglePause);
btnRestart.addEventListener('click', restart);
btnSound.addEventListener('click', () => {
  sfx.ensure();
  sfx.toggle();
  updateSoundButton();
});

btnResume.addEventListener('click', () => {
  if (state === 'gameover') restart();
  else togglePause();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') {
    e.preventDefault();
    sfx.ensure();
    sfx.toggle();
    updateSoundButton();
    return;
  }

  if (e.code === 'KeyP') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (state !== 'running') {
    if ((e.code === 'Space' || e.code === 'Enter') && state === 'gameover') {
      e.preventDefault();
      restart();
    }
    return;
  }

  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    playerMove(-1);
  }
  if (e.code === 'ArrowRight') {
    e.preventDefault();
    playerMove(1);
  }
  if (e.code === 'ArrowDown') {
    e.preventDefault();
    softDrop = true;
    playerDrop();
  }
  if (e.code === 'ArrowUp') {
    e.preventDefault();
    playerRotate(1);
  }
  if (e.code === 'Space') {
    e.preventDefault();
    hardDrop();
  }
  if (e.code === 'KeyC') {
    e.preventDefault();
    holdSwap();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') softDrop = false;
});

restart();
updateSoundButton();
requestAnimationFrame(update);
