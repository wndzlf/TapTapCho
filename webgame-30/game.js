const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-30', hudEl);

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

let size = 5;
let cell = 80;
let offsetX = 0;
let offsetY = 20;

let grid = [];
let moves = 0;
let level = 1;
let bestLevel = Number(localStorage.getItem('webgame-30-best-level') || 1);
let timeLeft = 75;
let timerId = null;
let solutionMoves = [];
let streak = 0;
let bestStreak = Number(localStorage.getItem('webgame-30-best-streak') || 0);

const levelEl = addHudStat('Level', 'level', '1');
const bestEl = addHudStat('Best', 'best', String(bestLevel));
const timeEl = addHudStat('Time', 'time', '75');
const leftEl = addHudStat('Left', 'left', '0');
const streakEl = addHudStat('Streak', 'streak', '0');
const bestStreakEl = addHudStat('Best Streak', 'bestStreak', String(bestStreak));
const btnHint = document.createElement('button');
btnHint.textContent = 'Hint';
hudEl.appendChild(btnHint);

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function refreshGeometry() {
  cell = Math.floor(Math.min(86, (canvas.width - 20) / size));
  offsetX = Math.floor((canvas.width - size * cell) / 2);
  offsetY = Math.max(16, Math.floor((canvas.height - size * cell) / 2));
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    updateHud();
    if (timeLeft === 0) onFail();
  }, 1000);
}

function countOn() {
  let total = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r]?.[c]) total += 1;
    }
  }
  return total;
}

function updateHud() {
  movesEl.textContent = String(moves);
  levelEl.textContent = String(level);
  bestEl.textContent = String(bestLevel);
  timeEl.textContent = String(timeLeft);
  leftEl.textContent = String(countOn());
  streakEl.textContent = String(streak);
  bestStreakEl.textContent = String(bestStreak);
}

function toggle(r, c) {
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  grid[r][c] = !grid[r][c];
}

function applyMove(r, c) {
  toggle(r, c);
  toggle(r - 1, c);
  toggle(r + 1, c);
  toggle(r, c - 1);
  toggle(r, c + 1);
}

function randomMoveList(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      r: Math.floor(Math.random() * size),
      c: Math.floor(Math.random() * size)
    });
  }
  return list;
}

function init(resetProgress = false) {
  if (resetProgress) {
    level = 1;
    streak = 0;
  }
  bestStreak = Number(localStorage.getItem('webgame-30-best-streak') || 0);

  size = Math.min(7, 4 + Math.floor((level - 1) / 2));
  refreshGeometry();
  grid = Array.from({ length: size }, () => Array(size).fill(false));

  const scrambleCount = Math.min(24, 7 + level * 2);
  solutionMoves = randomMoveList(scrambleCount);
  solutionMoves.forEach((m) => applyMove(m.r, m.c));

  moves = 0;
  const baseTime = Math.max(35, 78 - level * 4);
  const bonusTime = Math.min(12, streak * 2);
  timeLeft = baseTime + bonusTime;
  updateHud();
  startTimer();
}

function solved() {
  return grid.every((row) => row.every((v) => !v));
}

function onClear() {
  clearInterval(timerId);
  audio?.fx('win');
  vibrate([20, 30, 20]);
  level += 1;
  streak += 1;
  if (streak > bestStreak) {
    bestStreak = streak;
    localStorage.setItem('webgame-30-best-streak', String(bestStreak));
  }
  bestLevel = Math.max(bestLevel, level);
  localStorage.setItem('webgame-30-best-level', String(bestLevel));
  setTimeout(() => init(false), 700);
}

function onFail() {
  clearInterval(timerId);
  audio?.fx('fail');
  vibrate([40, 40, 40]);
  level = Math.max(1, level - 1);
  streak = 0;
  setTimeout(() => init(false), 450);
}

function handleClick(x, y) {
  const pad = 14;
  const maxX = offsetX + size * cell - 1;
  const maxY = offsetY + size * cell - 1;
  if (x < offsetX - pad || x > maxX + pad || y < offsetY - pad || y > maxY + pad) return;

  const clampedX = clamp(x, offsetX, maxX);
  const clampedY = clamp(y, offsetY, maxY);
  const c = Math.floor((clampedX - offsetX) / cell);
  const r = Math.floor((clampedY - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;
  applyMove(r, c);
  moves += 1;
  updateHud();
  audio?.fx('ui');
  vibrate(12);
  if (solved()) onClear();
}

function useHint() {
  if (!solutionMoves.length) {
    timeLeft = Math.max(0, timeLeft - 2);
    updateHud();
    return;
  }
  const hintMove = solutionMoves.pop();
  applyMove(hintMove.r, hintMove.c);
  moves += 1;
  timeLeft = Math.max(0, timeLeft - 1);
  updateHud();
  audio?.fx('success');
  vibrate(15);
  if (solved()) onClear();
}

function getPointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      const on = grid[r][c];
      ctx.fillStyle = on ? '#6df3ff' : '#0b1326';
      ctx.fillRect(x + 5, y + 5, cell - 10, cell - 10);
      ctx.strokeStyle = on ? '#9ddfff' : '#1f2a44';
      ctx.strokeRect(x + 5, y + 5, cell - 10, cell - 10);

      if (on) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 10, y + 10, cell - 20, 8);
      }
    }
  }

  if (solved()) {
    ctx.fillStyle = 'rgba(5,8,15,0.6)';
    ctx.fillRect(offsetX, offsetY, size * cell, size * cell);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Grid Cleared!', canvas.width / 2, canvas.height / 2);
  }
}

let lastTouchAt = 0;

canvas.addEventListener('click', (e) => {
  if (lastTouchAt && performance.now() - lastTouchAt < 320) return;
  audio?.unlock();
  const pos = getPointerPos(e);
  handleClick(pos.x, pos.y);
});

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  lastTouchAt = performance.now();
  audio?.unlock();
  const pos = getPointerPos(e);
  handleClick(pos.x, pos.y);
});

btnHint.addEventListener('click', () => {
  audio?.unlock();
  useHint();
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
