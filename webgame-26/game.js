const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const leftEl = document.getElementById('left');
const btnNew = document.getElementById('btnNew');

const size = 6;
const cell = 60;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 40;
const colors = ['#6df3ff', '#7cffc5', '#ffd86d', '#ff7bd0', '#8c7bff', '#ff9b6d'];

let grid = [];
let selected = null;
let pairsLeft = 0;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function init() {
  const total = size * size;
  const tiles = [];
  for (let i = 0; i < total / 2; i++) {
    const v = i % colors.length;
    tiles.push(v, v);
  }
  shuffle(tiles);
  grid = [];
  for (let r = 0; r < size; r++) {
    grid.push(tiles.slice(r * size, r * size + size));
  }
  pairsLeft = total / 2;
  leftEl.textContent = pairsLeft;
  selected = null;
}

function clearPath(a, b) {
  if (a.r === b.r) {
    const r = a.r;
    const min = Math.min(a.c, b.c) + 1;
    const max = Math.max(a.c, b.c) - 1;
    for (let c = min; c <= max; c++) if (grid[r][c] !== -1) return false;
    return true;
  }
  if (a.c === b.c) {
    const c = a.c;
    const min = Math.min(a.r, b.r) + 1;
    const max = Math.max(a.r, b.r) - 1;
    for (let r = min; r <= max; r++) if (grid[r][c] !== -1) return false;
    return true;
  }
  return false;
}

function handleClick(x, y) {
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  if (grid[r][c] === -1) return;

  if (!selected) {
    selected = { r, c };
    return;
  }

  const a = selected;
  const b = { r, c };
  if (a.r === b.r && a.c === b.c) { selected = null; return; }

  if (grid[a.r][a.c] === grid[b.r][b.c] && clearPath(a, b)) {
    grid[a.r][a.c] = -1;
    grid[b.r][b.c] = -1;
    pairsLeft -= 1;
    leftEl.textContent = pairsLeft;
  }
  selected = null;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      ctx.strokeStyle = '#1f2a44';
      ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
      if (grid[r][c] === -1) continue;
      ctx.fillStyle = colors[grid[r][c]];
      ctx.shadowColor = colors[grid[r][c]];
      ctx.shadowBlur = 10;
      ctx.fillRect(x + 10, y + 10, cell - 20, cell - 20);
      ctx.shadowBlur = 0;
      if (selected && selected.r === r && selected.c === c) {
        ctx.strokeStyle = '#e6f0ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 6, y + 6, cell - 12, cell - 12);
        ctx.lineWidth = 1;
      }
    }
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnNew.addEventListener('click', init);

init();
(function loop(){ draw(); requestAnimationFrame(loop); })();
