const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-31', hudEl);

let size = 3;
let cell = 120;
let offsetX = 0;
let offsetY = 40;

let grid = [];
let emptyPos = { r: 0, c: 0 };
let moves = 0;
let level = 1;
let timeLeft = 100;
let timerId = null;
let bestLevel = Number(localStorage.getItem('webgame-31-best-level') || 1);

const levelEl = addHudStat('Level', 'level', '1');
const timeEl = addHudStat('Time', 'time', '100');
const bestEl = addHudStat('Best', 'best', String(bestLevel));

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function refreshGeometry() {
  cell = Math.floor(Math.min(122, (canvas.width - 20) / size));
  offsetX = Math.floor((canvas.width - size * cell) / 2);
  offsetY = Math.max(20, Math.floor((canvas.height - size * cell) / 2));
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    updateHud();
    if (timeLeft === 0) onFail();
  }, 1000);
}

function updateHud() {
  movesEl.textContent = String(moves);
  levelEl.textContent = String(level);
  timeEl.textContent = String(timeLeft);
  bestEl.textContent = String(bestLevel);
}

function init(resetProgress = false) {
  if (resetProgress) level = 1;

  size = Math.min(5, 3 + Math.floor((level - 1) / 2));
  refreshGeometry();

  const vals = Array.from({ length: size * size - 1 }, (_, i) => i + 1);
  vals.push(0);
  grid = [];
  for (let r = 0; r < size; r++) {
    grid.push(vals.slice(r * size, r * size + size));
  }
  emptyPos = { r: size - 1, c: size - 1 };

  const shuffleSteps = 35 + level * 8;
  for (let i = 0; i < shuffleSteps; i++) {
    const n = neighbors(emptyPos.r, emptyPos.c);
    const picked = n[Math.floor(Math.random() * n.length)];
    swapTiles(emptyPos, picked);
    emptyPos = { r: picked.r, c: picked.c };
  }

  moves = 0;
  timeLeft = Math.max(35, 102 - level * 5);
  updateHud();
  startTimer();
}

function neighbors(r, c) {
  const list = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  dirs.forEach(([dr, dc]) => {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && cc >= 0 && rr < size && cc < size) list.push({ r: rr, c: cc });
  });
  return list;
}

function swapTiles(a, b) {
  [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
}

function solved() {
  let expected = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === size - 1 && c === size - 1) {
        if (grid[r][c] !== 0) return false;
      } else if (grid[r][c] !== expected++) {
        return false;
      }
    }
  }
  return true;
}

function onClear() {
  clearInterval(timerId);
  audio?.fx('win');
  level += 1;
  bestLevel = Math.max(bestLevel, level);
  localStorage.setItem('webgame-31-best-level', String(bestLevel));
  setTimeout(() => init(false), 650);
}

function onFail() {
  clearInterval(timerId);
  audio?.fx('fail');
  level = Math.max(1, level - 1);
  setTimeout(() => init(false), 450);
}

function handleClick(x, y) {
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  if (grid[r][c] === 0) return;

  const adjacent = Math.abs(r - emptyPos.r) + Math.abs(c - emptyPos.c) === 1;
  if (!adjacent) {
    audio?.fx('fail');
    return;
  }

  swapTiles({ r, c }, emptyPos);
  emptyPos = { r, c };
  moves += 1;
  updateHud();
  audio?.fx('ui');

  if (solved()) onClear();
}

function tileColor(val) {
  const hue = (val * 27) % 360;
  return `hsl(${hue} 92% 63%)`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      const val = grid[r][c];

      ctx.fillStyle = '#0f1d35';
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);

      if (val !== 0) {
        const color = tileColor(val);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 7;
        ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x + 8, y + 8, cell - 16, 10);

        ctx.fillStyle = '#071021';
        ctx.font = `bold ${Math.max(20, Math.floor(cell * 0.27))}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), x + cell / 2, y + cell / 2);
      } else {
        ctx.strokeStyle = '#2a3f66';
        ctx.strokeRect(x + 9, y + 9, cell - 18, cell - 18);
      }
    }
  }

  if (solved()) {
    ctx.fillStyle = 'rgba(5, 8, 15, 0.7)';
    ctx.fillRect(offsetX, offsetY, size * cell, size * cell);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Solved!', canvas.width / 2, canvas.height / 2);
  }
}

canvas.addEventListener('click', (e) => {
  audio?.unlock();
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
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
