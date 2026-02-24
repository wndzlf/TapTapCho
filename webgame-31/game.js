const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');

const size = 3;
const cell = 120;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 40;

let grid = [];
let selected = null;
let moves = 0;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function init() {
  const arr = Array.from({ length: size * size }, (_, i) => i + 1);
  shuffle(arr);
  grid = [];
  for (let r = 0; r < size; r++) grid.push(arr.slice(r * size, r * size + size));
  selected = null;
  moves = 0;
  movesEl.textContent = moves;
}

function handleClick(x, y) {
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;

  if (!selected) { selected = { r, c }; return; }
  const a = selected;
  const b = { r, c };
  if (a.r === b.r && a.c === b.c) { selected = null; return; }
  [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
  moves += 1;
  movesEl.textContent = moves;
  selected = null;
}

function solved() {
  let n = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== n) return false;
      n++;
    }
  }
  return true;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      const val = grid[r][c];
      ctx.fillStyle = '#0f1d35';
      ctx.fillRect(x + 6, y + 6, cell - 12, cell - 12);
      ctx.fillStyle = '#6df3ff';
      ctx.font = 'bold 36px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val, x + cell / 2, y + cell / 2);
      if (selected && selected.r === r && selected.c === c) {
        ctx.strokeStyle = '#e6f0ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 8, y + 8, cell - 16, cell - 16);
        ctx.lineWidth = 1;
      }
    }
  }

  if (solved()) {
    ctx.fillStyle = 'rgba(5, 8, 15, 0.7)';
    ctx.fillRect(offsetX, offsetY, size*cell, size*cell);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Solved!', canvas.width/2, canvas.height/2);
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnNew.addEventListener('click', init);

init();
(function loop(){ draw(); requestAnimationFrame(loop); })();
