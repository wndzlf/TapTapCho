const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const leftEl = document.getElementById('left');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-26', hudEl);

const colors = ['#6df3ff', '#7cffc5', '#ffd86d', '#ff7bd0', '#8c7bff', '#ff9b6d', '#9dff7a', '#ff6de1'];

let size = 6;
let cell = 60;
let offsetX = 0;
let offsetY = 42;

let grid = [];
let selected = null;
let pairsLeft = 0;
let level = 1;
let score = 0;
let combo = 1;
let timeLeft = 90;
let timerId = null;
let lastMatchAt = 0;

const levelEl = addHudStat('Level', 'level', '1');
const scoreEl = addHudStat('Score', 'score', '0');
const comboEl = addHudStat('Combo', 'combo', 'x1');
const timeEl = addHudStat('Time', 'time', '90');
const btnHint = document.createElement('button');
btnHint.textContent = 'Hint';
const btnShuffle = document.createElement('button');
btnShuffle.textContent = 'Shuffle';
hudEl.appendChild(btnHint);
hudEl.appendChild(btnShuffle);

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function refreshGeometry() {
  cell = Math.floor(Math.min(64, (canvas.width - 24) / size));
  offsetX = Math.floor((canvas.width - size * cell) / 2);
  offsetY = Math.max(26, Math.floor((canvas.height - size * cell) / 2));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
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
  leftEl.textContent = String(pairsLeft);
  levelEl.textContent = String(level);
  scoreEl.textContent = String(score);
  comboEl.textContent = `x${combo}`;
  timeEl.textContent = String(timeLeft);
}

function init(roundReset = false) {
  if (roundReset) {
    score = 0;
    level = 1;
  }

  size = Math.min(8, 6 + Math.floor((level - 1) / 2));
  refreshGeometry();

  const total = size * size;
  const tiles = [];
  const colorCount = Math.min(colors.length, 4 + Math.floor(level / 2));
  for (let i = 0; i < total / 2; i++) {
    const v = i % colorCount;
    tiles.push(v, v);
  }
  shuffle(tiles);

  grid = [];
  for (let r = 0; r < size; r++) {
    grid.push(tiles.slice(r * size, r * size + size));
  }

  pairsLeft = total / 2;
  selected = null;
  combo = 1;
  lastMatchAt = 0;
  timeLeft = Math.max(50, 92 - level * 4);
  updateHud();
  startTimer();

  if (!findConnectablePair()) shuffleAliveTiles();
}

function isEmpty(r, c) {
  return grid[r][c] === -1;
}

function clearRow(r, c1, c2) {
  const min = Math.min(c1, c2) + 1;
  const max = Math.max(c1, c2) - 1;
  for (let c = min; c <= max; c++) if (!isEmpty(r, c)) return false;
  return true;
}

function clearCol(c, r1, r2) {
  const min = Math.min(r1, r2) + 1;
  const max = Math.max(r1, r2) - 1;
  for (let r = min; r <= max; r++) if (!isEmpty(r, c)) return false;
  return true;
}

function canConnect(a, b) {
  if (a.r === b.r && clearRow(a.r, a.c, b.c)) return true;
  if (a.c === b.c && clearCol(a.c, a.r, b.r)) return true;

  const p1 = { r: a.r, c: b.c };
  if (isEmpty(p1.r, p1.c) && clearRow(a.r, a.c, p1.c) && clearCol(b.c, a.r, b.r)) return true;

  const p2 = { r: b.r, c: a.c };
  if (isEmpty(p2.r, p2.c) && clearCol(a.c, a.r, p2.r) && clearRow(b.r, a.c, b.c)) return true;

  return false;
}

function allAliveTiles() {
  const out = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== -1) out.push({ r, c, v: grid[r][c] });
    }
  }
  return out;
}

function findConnectablePair() {
  const alive = allAliveTiles();
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      if (alive[i].v !== alive[j].v) continue;
      if (canConnect(alive[i], alive[j])) return [alive[i], alive[j]];
    }
  }
  return null;
}

function shuffleAliveTiles() {
  const alive = allAliveTiles();
  const values = alive.map((t) => t.v);
  shuffle(values);
  alive.forEach((t, i) => {
    grid[t.r][t.c] = values[i];
  });
  combo = 1;
  updateHud();
  audio?.fx('ui');
}

function onMatch() {
  const now = performance.now();
  if (now - lastMatchAt < 2300) combo = Math.min(7, combo + 1);
  else combo = 1;
  lastMatchAt = now;

  score += 30 + combo * 10 + level * 4;
  pairsLeft -= 1;
  if (pairsLeft <= 0) {
    audio?.fx('win');
    level += 1;
    score += Math.max(80, timeLeft * 2);
    setTimeout(() => init(false), 650);
    return;
  }

  if (!findConnectablePair()) {
    shuffleAliveTiles();
  }

  updateHud();
  audio?.fx('success');
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
  if (isEmpty(r, c)) return;

  if (!selected) {
    selected = { r, c };
    audio?.fx('ui');
    return;
  }

  const a = selected;
  const b = { r, c };
  if (a.r === b.r && a.c === b.c) {
    selected = null;
    return;
  }

  if (grid[a.r][a.c] === grid[b.r][b.c] && canConnect(a, b)) {
    grid[a.r][a.c] = -1;
    grid[b.r][b.c] = -1;
    selected = null;
    onMatch();
  } else {
    combo = 1;
    selected = b;
    updateHud();
    audio?.fx('fail');
  }
}

function useHint() {
  const pair = findConnectablePair();
  if (!pair) {
    shuffleAliveTiles();
    return;
  }
  selected = { r: pair[0].r, c: pair[0].c };
  timeLeft = Math.max(0, timeLeft - 4);
  updateHud();
  audio?.fx('ui');
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      ctx.strokeStyle = '#1f2a44';
      ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
      if (isEmpty(r, c)) continue;

      const color = colors[grid[r][c] % colors.length];
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 9;
      ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16);
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
  audio?.unlock();
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnNew.addEventListener('click', () => {
  audio?.unlock();
  init(true);
});

btnHint.addEventListener('click', () => {
  audio?.unlock();
  useHint();
});

btnShuffle.addEventListener('click', () => {
  audio?.unlock();
  shuffleAliveTiles();
  timeLeft = Math.max(0, timeLeft - 5);
  updateHud();
});

init(true);
(function loop() {
  draw();
  requestAnimationFrame(loop);
})();
