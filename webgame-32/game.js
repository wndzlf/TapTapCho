const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const foundEl = document.getElementById('found');
const listEl = document.getElementById('list');
const btnNew = document.getElementById('btnNew');

const size = 8;
const cell = 48;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 30;
const words = ['CODE', 'DATA', 'GENE', 'CELL', 'NEON'];

let grid = [];
let found = new Set();
let start = null;

function randLetter() {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function placeWord(word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    grid[r + dr * i][c + dc * i] = word[i];
  }
}

function init() {
  grid = Array.from({ length: size }, () => Array.from({ length: size }, randLetter));
  placeWord('CODE', 0, 0, 1, 0);
  placeWord('DATA', 2, 2, 0, 1);
  placeWord('GENE', 5, 0, 0, 1);
  placeWord('CELL', 7, 4, -1, 0);
  placeWord('NEON', 1, 7, 1, -1);
  found = new Set();
  foundEl.textContent = '0';
  renderList();
}

function renderList() {
  listEl.innerHTML = words.map(w => `<div>${found.has(w) ? '✅' : '⬜'} ${w}</div>`).join('');
}

function handleClick(x, y) {
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  if (!start) {
    start = { r, c };
    return;
  }
  const end = { r, c };
  const dr = Math.sign(end.r - start.r);
  const dc = Math.sign(end.c - start.c);
  if (dr !== 0 && dc !== 0 && Math.abs(end.r - start.r) !== Math.abs(end.c - start.c)) {
    start = null; return;
  }

  let letters = '';
  let rr = start.r;
  let cc = start.c;
  while (true) {
    letters += grid[rr][cc];
    if (rr === end.r && cc === end.c) break;
    rr += dr; cc += dc;
    if (rr < 0 || cc < 0 || rr >= size || cc >= size) break;
  }

  const word = words.find(w => w === letters || w === letters.split('').reverse().join(''));
  if (word && !found.has(word)) {
    found.add(word);
    foundEl.textContent = String(found.size);
    renderList();
  }
  start = null;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      ctx.fillStyle = '#0f1d35';
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      ctx.fillStyle = '#e6f0ff';
      ctx.font = '20px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(grid[r][c], x + cell / 2, y + cell / 2);
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
