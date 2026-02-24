const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');

const size = 8;
const cell = 52;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 20;
const colors = ['#6df3ff', '#7cffc5', '#ffd86d', '#ff7bd0', '#8c7bff'];

let grid = [];
let selected = null;
let score = 0;
let moves = 30;

function randColor() {
  return Math.floor(Math.random() * colors.length);
}

function initGrid() {
  grid = Array.from({ length: size }, () => Array.from({ length: size }, randColor));
  while (findMatches().length) resolveMatches();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      ctx.fillStyle = colors[grid[r][c]];
      ctx.shadowColor = colors[grid[r][c]];
      ctx.shadowBlur = 10;
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      ctx.shadowBlur = 0;
      if (selected && selected.r === r && selected.c === c) {
        ctx.strokeStyle = '#e6f0ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      }
    }
  }
}

function swap(a, b) {
  const tmp = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = tmp;
}

function findMatches() {
  const matches = [];
  // rows
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c <= size; c++) {
      if (c < size && grid[r][c] === grid[r][c - 1]) run++;
      else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matches.push({ r, c: c - 1 - k });
        }
        run = 1;
      }
    }
  }
  // cols
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r <= size; r++) {
      if (r < size && grid[r][c] === grid[r - 1][c]) run++;
      else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matches.push({ r: r - 1 - k, c });
        }
        run = 1;
      }
    }
  }
  return matches;
}

function resolveMatches() {
  const matches = findMatches();
  if (!matches.length) return false;
  const key = (p) => `${p.r},${p.c}`;
  const set = new Set(matches.map(key));
  set.forEach((k) => {
    const [r, c] = k.split(',').map(Number);
    grid[r][c] = -1;
  });
  const cleared = set.size;
  score += cleared * 10;
  scoreEl.textContent = score;

  // drop
  for (let c = 0; c < size; c++) {
    let write = size - 1;
    for (let r = size - 1; r >= 0; r--) {
      if (grid[r][c] !== -1) {
        grid[write][c] = grid[r][c];
        write--;
      }
    }
    for (let r = write; r >= 0; r--) grid[r][c] = randColor();
  }
  return true;
}

function tickResolve() {
  while (resolveMatches()) {}
}

function handleClick(x, y) {
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;

  if (!selected) {
    selected = { r, c };
    return;
  }

  const dr = Math.abs(selected.r - r);
  const dc = Math.abs(selected.c - c);
  if (dr + dc === 1) {
    swap(selected, { r, c });
    if (findMatches().length) {
      moves = Math.max(0, moves - 1);
      movesEl.textContent = moves;
      tickResolve();
    } else {
      swap(selected, { r, c });
    }
  }
  selected = null;
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnNew.addEventListener('click', () => {
  score = 0;
  moves = 30;
  scoreEl.textContent = score;
  movesEl.textContent = moves;
  initGrid();
});

initGrid();
(function loop() {
  draw();
  requestAnimationFrame(loop);
})();
