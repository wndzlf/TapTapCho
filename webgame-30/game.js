const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');

const size = 5;
const cell = 80;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 20;

let grid = [];
let moves = 0;

function init() {
  grid = Array.from({ length: size }, () => Array.from({ length: size }, () => Math.random() > 0.5));
  moves = 0;
  movesEl.textContent = moves;
}

function toggle(r, c) {
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  grid[r][c] = !grid[r][c];
}

function handleClick(x, y) {
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  toggle(r, c); toggle(r-1,c); toggle(r+1,c); toggle(r,c-1); toggle(r,c+1);
  moves += 1;
  movesEl.textContent = moves;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      ctx.fillStyle = grid[r][c] ? '#6df3ff' : '#0b1326';
      ctx.fillRect(x + 6, y + 6, cell - 12, cell - 12);
      ctx.strokeStyle = '#1f2a44';
      ctx.strokeRect(x + 6, y + 6, cell - 12, cell - 12);
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
