const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const tray = document.getElementById('tray');
const scoreEl = document.getElementById('score');
const btnNew = document.getElementById('btnNew');

const size = 10;
const cell = 40;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 10;

const shapes = [
  [[1,1],[1,1]],
  [[1,1,1]],
  [[1],[1],[1]],
  [[1,1,1,1]],
  [[1,0],[1,0],[1,1]],
  [[0,1],[0,1],[1,1]],
  [[1,1,1],[0,1,0]]
];

let board = [];
let currentShapes = [];
let selected = null;
let score = 0;

function randShape() {
  return shapes[Math.floor(Math.random() * shapes.length)];
}

function init() {
  board = Array.from({ length: size }, () => Array(size).fill(0));
  score = 0;
  scoreEl.textContent = score;
  refillShapes();
}

function refillShapes() {
  currentShapes = [randShape(), randShape(), randShape()];
  renderTray();
}

function renderTray() {
  tray.innerHTML = '';
  currentShapes.forEach((shape, idx) => {
    const btn = document.createElement('button');
    btn.textContent = `Shape ${idx + 1}`;
    btn.addEventListener('click', () => { selected = idx; renderTray(); });
    if (selected === idx) btn.style.borderColor = '#6df3ff';
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

function place(shape, r0, c0) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c]) board[r0 + r][c0 + c] = 1;
    }
  }
  score += 10;
  clearLines();
  scoreEl.textContent = score;
}

function clearLines() {
  const fullRows = [];
  const fullCols = [];
  for (let r = 0; r < size; r++) if (board[r].every(v => v)) fullRows.push(r);
  for (let c = 0; c < size; c++) if (board.every(row => row[c])) fullCols.push(c);

  fullRows.forEach(r => board[r].fill(0));
  fullCols.forEach(c => board.forEach(row => row[c] = 0));

  if (fullRows.length || fullCols.length) score += (fullRows.length + fullCols.length) * 50;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      ctx.strokeStyle = '#1f2a44';
      ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      if (board[r][c]) {
        ctx.fillStyle = '#6df3ff';
        ctx.shadowColor = '#6df3ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(x + 6, y + 6, cell - 12, cell - 12);
        ctx.shadowBlur = 0;
      }
    }
  }
}

canvas.addEventListener('click', (e) => {
  if (selected === null) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  const shape = currentShapes[selected];
  if (!shape) return;
  if (canPlace(shape, r, c)) {
    place(shape, r, c);
    currentShapes.splice(selected, 1);
    selected = null;
    if (!currentShapes.length) refillShapes();
    else renderTray();
  }
});

btnNew.addEventListener('click', init);

init();
(function loop(){ draw(); requestAnimationFrame(loop); })();
