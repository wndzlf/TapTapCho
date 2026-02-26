const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const tray = document.getElementById('tray');
const scoreEl = document.getElementById('score');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-28', hudEl);

const size = 10;
const cell = 40;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 10;

const shapes = [
  [[1, 1], [1, 1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1, 1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]]
];

const palette = ['#6df3ff', '#7cffc5', '#ffd86d', '#ff7bd0', '#8c7bff', '#ff9b6d'];

let board = [];
let currentShapes = [];
let selected = null;
let score = 0;
let level = 1;
let levelStartScore = 0;
let targetScore = 420;
let combo = 1;
let best = Number(localStorage.getItem('webgame-28-best') || 0);

const levelEl = addHudStat('Level', 'level', '1');
const targetEl = addHudStat('Target', 'target', '420');
const comboEl = addHudStat('Combo', 'combo', 'x1');
const bestEl = addHudStat('Best', 'best', String(best));
const btnRotate = document.createElement('button');
btnRotate.textContent = 'Rotate';
hudEl.appendChild(btnRotate);

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function cloneShape(shape) {
  return shape.map((row) => [...row]);
}

function rotateShape(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const out = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c][rows - 1 - r] = shape[r][c];
    }
  }
  return out;
}

function randShape(levelValue) {
  const maxIdx = Math.min(shapes.length, 5 + Math.floor(levelValue / 2));
  const template = shapes[Math.floor(Math.random() * maxIdx)];
  return {
    matrix: cloneShape(template),
    color: palette[Math.floor(Math.random() * palette.length)]
  };
}

function updateHud() {
  scoreEl.textContent = String(score);
  levelEl.textContent = String(level);
  targetEl.textContent = String(targetScore);
  comboEl.textContent = `x${combo}`;
  bestEl.textContent = String(best);
}

function init(resetProgress = false) {
  board = Array.from({ length: size }, () => Array(size).fill(0));
  selected = null;
  combo = 1;

  if (resetProgress) {
    score = 0;
    level = 1;
    levelStartScore = 0;
    targetScore = 420;
  }

  refillShapes();
  updateHud();
}

function refillShapes() {
  currentShapes = [randShape(level), randShape(level), randShape(level)];
  renderTray();
}

function renderTray() {
  tray.innerHTML = '';
  currentShapes.forEach((shapeObj, idx) => {
    const btn = document.createElement('button');
    const rows = shapeObj.matrix.length;
    const cols = shapeObj.matrix[0].length;
    btn.textContent = `S${idx + 1} ${rows}x${cols}`;
    btn.style.borderColor = shapeObj.color;
    btn.style.color = '#e6f0ff';
    btn.addEventListener('click', () => {
      selected = idx;
      audio?.fx('ui');
      renderTray();
    });

    if (selected === idx) {
      btn.style.boxShadow = `0 0 0 2px ${shapeObj.color}`;
    }
    tray.appendChild(btn);
  });
}

function canPlace(shape, r0, c0) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const rr = r0 + r;
      const cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) return false;
      if (board[rr][cc]) return false;
    }
  }
  return true;
}

function anyPlaceAvailable(shapeObj) {
  const shape = shapeObj.matrix;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (canPlace(shape, r, c)) return true;
    }
  }
  return false;
}

function place(shapeObj, r0, c0) {
  const shape = shapeObj.matrix;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c]) board[r0 + r][c0 + c] = shapeObj.color;
    }
  }

  const blockCount = shape.flat().filter(Boolean).length;
  score += blockCount * (6 + level);
  const linesCleared = clearLines();
  if (linesCleared > 0) {
    combo = Math.min(8, combo + 1);
    score += linesCleared * 90 * combo;
    audio?.fx('success');
  } else {
    combo = 1;
    audio?.fx('ui');
  }

  best = Math.max(best, score);
  localStorage.setItem('webgame-28-best', String(best));
  updateHud();
}

function clearLines() {
  const fullRows = [];
  const fullCols = [];
  for (let r = 0; r < size; r++) if (board[r].every((v) => !!v)) fullRows.push(r);
  for (let c = 0; c < size; c++) if (board.every((row) => !!row[c])) fullCols.push(c);

  fullRows.forEach((r) => board[r].fill(0));
  fullCols.forEach((c) => board.forEach((row) => (row[c] = 0)));

  return fullRows.length + fullCols.length;
}

function checkRoundState() {
  if (score - levelStartScore >= targetScore) {
    level += 1;
    levelStartScore = score;
    targetScore += 170 + level * 20;
    board = Array.from({ length: size }, () => Array(size).fill(0));
    refillShapes();
    combo = 1;
    updateHud();
    audio?.fx('win');
    return;
  }

  const hasPlayable = currentShapes.some((shapeObj) => anyPlaceAvailable(shapeObj));
  if (!hasPlayable) {
    audio?.fx('fail');
    level = Math.max(1, level - 1);
    levelStartScore = score;
    targetScore = Math.max(320, targetScore - 80);
    board = Array.from({ length: size }, () => Array(size).fill(0));
    refillShapes();
    combo = 1;
    updateHud();
  }
}

function drawShapeGhost(shapeObj, r0, c0) {
  const shape = shapeObj.matrix;
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = shapeObj.color;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const x = offsetX + (c0 + c) * cell;
      const y = offsetY + (r0 + r) * cell;
      ctx.fillRect(x + 6, y + 6, cell - 12, cell - 12);
    }
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      ctx.strokeStyle = '#1f2a44';
      ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      if (board[r][c]) {
        const color = board[r][c];
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillRect(x + 6, y + 6, cell - 12, cell - 12);
        ctx.shadowBlur = 0;
      }
    }
  }

  if (selected !== null && currentShapes[selected]) {
    const shapeObj = currentShapes[selected];
    if (lastHoverCell && canPlace(shapeObj.matrix, lastHoverCell.r, lastHoverCell.c)) {
      drawShapeGhost(shapeObj, lastHoverCell.r, lastHoverCell.c);
    }
  }
}

let lastHoverCell = null;
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) {
    lastHoverCell = null;
    return;
  }
  lastHoverCell = { r, c };
});

canvas.addEventListener('click', (e) => {
  if (selected === null) return;
  audio?.unlock();

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  const shapeObj = currentShapes[selected];
  if (!shapeObj) return;

  if (canPlace(shapeObj.matrix, r, c)) {
    place(shapeObj, r, c);
    currentShapes.splice(selected, 1);
    selected = null;
    if (!currentShapes.length) refillShapes();
    else renderTray();
    checkRoundState();
  } else {
    combo = 1;
    updateHud();
    audio?.fx('fail');
  }
});

btnRotate.addEventListener('click', () => {
  if (selected === null || !currentShapes[selected]) return;
  audio?.unlock();
  currentShapes[selected].matrix = rotateShape(currentShapes[selected].matrix);
  renderTray();
  audio?.fx('ui');
});

btnNew.addEventListener('click', () => {
  audio?.unlock();
  init(true);
});

init(true);
(function loop() {
  draw();
  requestAnimationFrame(loop);
})();
