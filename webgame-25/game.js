const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-25', hudEl);

const size = 8;
const cell = 52;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 20;
const colors = ['#6df3ff', '#7cffc5', '#ffd86d', '#ff7bd0', '#8c7bff'];

let grid = [];
let selected = null;
let score = 0;
let moves = 30;
let level = 1;
let target = 450;
let combo = 1;
let timeLeft = 75;
let timerId = null;

const levelEl = addHudStat('Level', 'level', '1');
const targetEl = addHudStat('Target', 'target', '450');
const comboEl = addHudStat('Combo', 'combo', 'x1');
const timeEl = addHudStat('Time', 'time', '75');
const btnShuffle = document.createElement('button');
btnShuffle.textContent = 'Shuffle';
hudEl.appendChild(btnShuffle);

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function randColor() {
  return Math.floor(Math.random() * colors.length);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function initGrid() {
  grid = Array.from({ length: size }, () => Array.from({ length: size }, randColor));
  while (findMatches().length) resolveMatches(false);
  if (!hasAnyValidMove()) hardShuffle();
}

function updateHud() {
  scoreEl.textContent = String(score);
  movesEl.textContent = String(moves);
  levelEl.textContent = String(level);
  targetEl.textContent = String(target);
  comboEl.textContent = `x${combo}`;
  timeEl.textContent = String(timeLeft);
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    updateHud();
    if (timeLeft === 0) {
      onRoundFail();
    }
  }, 1000);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      const color = colors[grid[r][c]];
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 11;
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      ctx.shadowBlur = 0;
      if (selected && selected.r === r && selected.c === c) {
        ctx.strokeStyle = '#e6f0ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      }
    }
  }

  if (score >= target) {
    ctx.fillStyle = 'rgba(5,8,15,0.52)';
    ctx.fillRect(offsetX, offsetY, size * cell, size * cell);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Level Clear!', canvas.width / 2, canvas.height / 2);
  }
}

function swap(a, b) {
  const tmp = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = tmp;
}

function findMatches() {
  const matches = [];
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c <= size; c++) {
      if (c < size && grid[r][c] === grid[r][c - 1]) run += 1;
      else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matches.push({ r, c: c - 1 - k });
        }
        run = 1;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r <= size; r++) {
      if (r < size && grid[r][c] === grid[r - 1][c]) run += 1;
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

function resolveMatches(allowCombo = true) {
  const matches = findMatches();
  if (!matches.length) return false;

  const set = new Set(matches.map((p) => `${p.r},${p.c}`));
  set.forEach((k) => {
    const [r, c] = k.split(',').map(Number);
    grid[r][c] = -1;
  });

  const cleared = set.size;
  const chainScore = cleared * (10 + level * 2) * combo;
  score += chainScore;
  if (allowCombo) combo = Math.min(9, combo + 1);
  audio?.fx('success');

  for (let c = 0; c < size; c++) {
    let write = size - 1;
    for (let r = size - 1; r >= 0; r--) {
      if (grid[r][c] !== -1) {
        grid[write][c] = grid[r][c];
        write -= 1;
      }
    }
    for (let r = write; r >= 0; r--) grid[r][c] = randColor();
  }

  updateHud();
  return true;
}

function resolveCascade() {
  let hadMatch = false;
  while (resolveMatches(true)) hadMatch = true;
  if (!hadMatch) combo = 1;
  if (!hasAnyValidMove()) hardShuffle();
  updateHud();
}

function hasAnyValidMove() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dirs = [
        [1, 0],
        [0, 1]
      ];
      for (const [dr, dc] of dirs) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= size || cc >= size) continue;
        swap({ r, c }, { r: rr, c: cc });
        const ok = findMatches().length > 0;
        swap({ r, c }, { r: rr, c: cc });
        if (ok) return true;
      }
    }
  }
  return false;
}

function hardShuffle() {
  const flat = grid.flat();
  shuffleArray(flat);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) grid[r][c] = flat[r * size + c];
  }
  while (findMatches().length || !hasAnyValidMove()) shuffleArray(flat);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) grid[r][c] = flat[r * size + c];
  }
  combo = 1;
  audio?.fx('ui');
}

function nextLevel() {
  clearInterval(timerId);
  audio?.fx('win');
  level += 1;
  target += 180 + level * 30;
  moves = Math.min(40, 24 + level * 2);
  timeLeft = Math.max(45, 75 - level * 2);
  combo = 1;
  selected = null;
  initGrid();
  updateHud();
  startTimer();
}

function onRoundFail() {
  clearInterval(timerId);
  audio?.fx('fail');
  level = Math.max(1, level - 1);
  target = Math.max(420, target - 120);
  moves = Math.min(40, 24 + level * 2);
  timeLeft = Math.max(45, 75 - level * 2);
  combo = 1;
  selected = null;
  initGrid();
  updateHud();
  startTimer();
}

function handleClick(x, y) {
  if (score >= target) return;
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;

  if (!selected) {
    selected = { r, c };
    audio?.fx('ui');
    return;
  }

  const dr = Math.abs(selected.r - r);
  const dc = Math.abs(selected.c - c);
  if (dr + dc === 1) {
    swap(selected, { r, c });
    if (findMatches().length) {
      moves = Math.max(0, moves - 1);
      resolveCascade();
      if (score >= target) {
        setTimeout(nextLevel, 700);
      } else if (moves === 0) {
        onRoundFail();
      }
    } else {
      swap(selected, { r, c });
      combo = 1;
      audio?.fx('fail');
    }
  }
  selected = null;
  updateHud();
}

canvas.addEventListener('click', (e) => {
  audio?.unlock();
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnShuffle.addEventListener('click', () => {
  audio?.unlock();
  hardShuffle();
  moves = Math.max(0, moves - 1);
  updateHud();
});

btnNew.addEventListener('click', () => {
  audio?.unlock();
  score = 0;
  level = 1;
  target = 450;
  moves = 30;
  combo = 1;
  timeLeft = 75;
  selected = null;
  initGrid();
  updateHud();
  startTimer();
});

btnNew.click();
(function loop() {
  draw();
  requestAnimationFrame(loop);
})();
