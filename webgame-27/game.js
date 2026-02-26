const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const leftEl = document.getElementById('left');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-27', hudEl);

const tiles = ['🀄', '🐉', '🎴', '🌸', '🎋', '🧧', '🪭', '🪷', '🀙', '🀚'];

let size = 6;
let cell = 60;
let offsetX = 0;
let offsetY = 42;

let grid = [];
let selected = null;
let pairsLeft = 0;
let level = 1;
let score = 0;
let streak = 0;
let timeLeft = 95;
let timerId = null;

const levelEl = addHudStat('Level', 'level', '1');
const scoreEl = addHudStat('Score', 'score', '0');
const streakEl = addHudStat('Streak', 'streak', '0');
const timeEl = addHudStat('Time', 'time', '95');
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
  cell = Math.floor(Math.min(62, (canvas.width - 24) / size));
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
  streakEl.textContent = String(streak);
  timeEl.textContent = String(timeLeft);
}

function init(resetProgress = false) {
  if (resetProgress) {
    level = 1;
    score = 0;
  }

  size = Math.min(8, 6 + Math.floor((level - 1) / 2));
  refreshGeometry();

  const total = size * size;
  const usableKinds = Math.min(tiles.length, 5 + Math.floor(level / 2));
  const arr = [];
  for (let i = 0; i < total / 2; i++) {
    const v = i % usableKinds;
    arr.push(v, v);
  }
  shuffle(arr);

  grid = [];
  for (let r = 0; r < size; r++) {
    grid.push(arr.slice(r * size, r * size + size));
  }

  selected = null;
  pairsLeft = total / 2;
  streak = 0;
  timeLeft = Math.max(55, 96 - level * 4);
  updateHud();
  startTimer();

  if (!findHintPair()) shuffleAliveTiles();
}

function isEmpty(r, c) {
  return grid[r][c] === -1;
}

function isEdgeFree(r, c) {
  return c === 0 || c === size - 1 || isEmpty(r, c - 1) || isEmpty(r, c + 1);
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

function allAlive() {
  const out = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== -1) out.push({ r, c, v: grid[r][c] });
    }
  }
  return out;
}

function findHintPair() {
  const alive = allAlive();
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      if (alive[i].v !== alive[j].v) continue;
      if (!isEdgeFree(alive[i].r, alive[i].c) || !isEdgeFree(alive[j].r, alive[j].c)) continue;
      if (canConnect(alive[i], alive[j])) return [alive[i], alive[j]];
    }
  }
  return null;
}

function shuffleAliveTiles() {
  const alive = allAlive();
  const values = alive.map((t) => t.v);
  shuffle(values);
  alive.forEach((t, i) => {
    grid[t.r][t.c] = values[i];
  });
  streak = 0;
  updateHud();
  audio?.fx('ui');
}

function onFail() {
  clearInterval(timerId);
  audio?.fx('fail');
  level = Math.max(1, level - 1);
  setTimeout(() => init(false), 450);
}

function handleMatch() {
  streak += 1;
  score += 35 + level * 5 + Math.min(6, streak) * 6;
  pairsLeft -= 1;
  audio?.fx('success');
  if (pairsLeft <= 0) {
    score += Math.max(90, timeLeft * 2);
    level += 1;
    audio?.fx('win');
    setTimeout(() => init(false), 700);
    return;
  }
  if (!findHintPair()) shuffleAliveTiles();
  updateHud();
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

  const freeA = isEdgeFree(a.r, a.c);
  const freeB = isEdgeFree(b.r, b.c);

  if (grid[a.r][a.c] === grid[b.r][b.c] && freeA && freeB && canConnect(a, b)) {
    grid[a.r][a.c] = -1;
    grid[b.r][b.c] = -1;
    selected = null;
    handleMatch();
  } else {
    streak = 0;
    selected = b;
    updateHud();
    audio?.fx('fail');
  }
}

function useHint() {
  const pair = findHintPair();
  if (!pair) {
    shuffleAliveTiles();
    return;
  }
  selected = { r: pair[0].r, c: pair[0].c };
  timeLeft = Math.max(0, timeLeft - 5);
  updateHud();
  audio?.fx('ui');
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;

      ctx.fillStyle = '#0f1d35';
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      ctx.strokeStyle = '#1f2a44';
      ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);

      if (isEmpty(r, c)) continue;

      ctx.fillStyle = '#e6f0ff';
      ctx.font = `${Math.floor(cell * 0.48)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tiles[grid[r][c] % tiles.length], x + cell / 2, y + cell / 2);

      if (selected && selected.r === r && selected.c === c) {
        ctx.strokeStyle = '#6df3ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 6, y + 6, cell - 12, cell - 12);
        ctx.lineWidth = 1;
      }

      if (isEdgeFree(r, c)) {
        ctx.fillStyle = 'rgba(124,255,197,0.65)';
        ctx.fillRect(x + cell - 10, y + 6, 4, 4);
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
  timeLeft = Math.max(0, timeLeft - 6);
  updateHud();
});

init(true);
(function loop() {
  draw();
  requestAnimationFrame(loop);
})();
