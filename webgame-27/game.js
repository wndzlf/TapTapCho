const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const leftEl = document.getElementById('left');
const btnNew = document.getElementById('btnNew');

const size = 6;
const cell = 60;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 40;
const tiles = ['🀄','🐉','🎴','🌸','🎋','🧧'];

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
  const arr = [];
  for (let i = 0; i < total / 2; i++) {
    const v = i % tiles.length;
    arr.push(v, v);
  }
  shuffle(arr);
  grid = [];
  for (let r = 0; r < size; r++) grid.push(arr.slice(r * size, r * size + size));
  pairsLeft = total / 2;
  leftEl.textContent = pairsLeft;
  selected = null;
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

  if (grid[a.r][a.c] === grid[b.r][b.c]) {
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
      ctx.fillStyle = '#0f1d35';
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      if (grid[r][c] === -1) continue;
      ctx.fillStyle = '#e6f0ff';
      ctx.font = '28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tiles[grid[r][c]], x + cell / 2, y + cell / 2);
      if (selected && selected.r === r && selected.c === c) {
        ctx.strokeStyle = '#6df3ff';
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
