const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nctx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK = 24;

const COLORS = {
  I: '#38bdf8',
  O: '#facc15',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#ef4444',
  J: '#3b82f6',
  L: '#f97316',
  X: '#e11d48'
};

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  X: [[0,1,0],[1,1,1],[0,1,0]]
};

let board = createMatrix(COLS, ROWS);
let score = 0;
let dropInterval = 650;
let lastTime = 0;
let dropCounter = 0;
let paused = false;
let gravity = 1; // 1 = down, -1 = up
let flipTimer = 0;

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const scoreEl = document.getElementById('score');
const flipEl = document.getElementById('flip');

const player = { pos: {x: 0, y: 0}, matrix: null, type: null };
let nextPiece = randomPiece();

function createMatrix(w, h) {
  return Array.from({length: h}, () => new Array(w).fill(0));
}

function drawMatrix(matrix, offset, context, blockSize = BLOCK) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = value;
        context.fillRect((x + offset.x) * blockSize, (y + offset.y) * blockSize, blockSize - 1, blockSize - 1);
      }
    });
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMatrix(board, {x:0, y:0}, ctx);
  drawMatrix(player.matrix, player.pos, ctx);

  nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const preview = nextPiece.matrix;
  const ox = Math.floor((4 - preview[0].length) / 2);
  const oy = Math.floor((4 - preview.length) / 2);
  drawMatrix(preview, {x: ox, y: oy}, nctx, 20);
}

function merge(board, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[y + player.pos.y][x + player.pos.x] = value;
    });
  });
}

function collide(board, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] && (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) return true;
    }
  }
  return false;
}

function rotate(matrix, dir) {
  const m = matrix.map(row => row.slice());
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < y; x++) [m[x][y], m[y][x]] = [m[y][x], m[x][y]];
  }
  if (dir > 0) m.forEach(row => row.reverse());
  else m.reverse();
  return m;
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  const rotated = rotate(player.matrix, dir);
  player.matrix = rotated;
  while (collide(board, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      player.matrix = rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = board.length - 1; y >= 0; y--) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === 0) continue outer;
    }
    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    y++;
    rowCount++;
  }
  if (rowCount > 0) {
    const scoreTable = [0, 120, 360, 700, 1100];
    score += scoreTable[rowCount];
    updateHUD();
  }
}

function playerDrop() {
  player.pos.y += gravity;
  if (collide(board, player)) {
    player.pos.y -= gravity;
    merge(board, player);
    arenaSweep();
    resetPlayer();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(board, player)) player.pos.y += gravity;
  player.pos.y -= gravity;
  merge(board, player);
  arenaSweep();
  resetPlayer();
  dropCounter = 0;
}

function resetPlayer() {
  player.matrix = nextPiece.matrix;
  player.type = nextPiece.type;
  nextPiece = randomPiece();
  player.pos.y = gravity === 1 ? 0 : ROWS - player.matrix.length;
  player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);

  if (collide(board, player)) gameOver();
}

function randomPiece() {
  const types = 'IOTSZJLX';
  const type = types[Math.floor(Math.random() * types.length)];
  return { type, matrix: SHAPES[type].map(row => row.map(v => v ? COLORS[type] : 0)) };
}

function update(time = 0) {
  if (!paused) {
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;
    flipTimer += delta;

    if (flipTimer > 12000) {
      flipGravity();
      flipTimer = 0;
    }

    if (dropCounter > dropInterval) playerDrop();
    draw();
  }
  requestAnimationFrame(update);
}

function updateHUD() {
  scoreEl.textContent = score;
  flipEl.textContent = gravity === 1 ? '↓' : '↑';
}

function flipGravity() {
  gravity *= -1;
  player.pos.y = gravity === 1 ? Math.max(0, player.pos.y) : Math.min(ROWS - player.matrix.length, player.pos.y);
  updateHUD();
}

function gameOver() {
  paused = true;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = 'Game Over';
}

function restart() {
  board = createMatrix(COLS, ROWS);
  score = 0;
  dropInterval = 650;
  gravity = 1;
  flipTimer = 0;
  updateHUD();
  paused = false;
  overlay.classList.add('hidden');
  resetPlayer();
}

// Input

document.addEventListener('keydown', (e) => {
  if (paused && e.code !== 'KeyR') return;
  if (e.code === 'ArrowLeft') player.pos.x--;
  if (e.code === 'ArrowRight') player.pos.x++;
  if (e.code === 'ArrowDown') playerDrop();
  if (e.code === 'ArrowUp') playerRotate(1);
  if (e.code === 'Space') hardDrop();
  if (e.code === 'KeyF') flipGravity();
  if (e.code === 'KeyR') restart();
  if (collide(board, player)) {
    if (e.code === 'ArrowLeft') player.pos.x++;
    if (e.code === 'ArrowRight') player.pos.x--;
  }
});

function bindButton(id, fn, hold=false) {
  const btn = document.getElementById(id);
  if (!btn) return;
  let interval;
  const start = (e) => {
    e.preventDefault();
    fn();
    if (hold) interval = setInterval(fn, 80);
  };
  const end = () => clearInterval(interval);
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start, {passive:false});
  btn.addEventListener('mouseup', end);
  btn.addEventListener('mouseleave', end);
  btn.addEventListener('touchend', end);
}

bindButton('btnLeft', () => { player.pos.x--; if (collide(board, player)) player.pos.x++; }, true);
bindButton('btnRight', () => { player.pos.x++; if (collide(board, player)) player.pos.x--; }, true);
bindButton('btnRotate', () => playerRotate(1));
bindButton('btnDown', () => playerDrop(), true);
bindButton('btnDrop', () => hardDrop());
bindButton('btnFlip', () => flipGravity());

document.getElementById('btnRestart').addEventListener('click', () => restart());
document.getElementById('btnResume').addEventListener('click', () => restart());

// Init
restart();
update();
