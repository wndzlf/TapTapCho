const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const foundEl = document.getElementById('found');
const listEl = document.getElementById('list');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-32', hudEl);

const size = 8;
const cell = 48;
const offsetX = Math.floor((canvas.width - size * cell) / 2);
const offsetY = 30;
const wordPool = [
  'CODE', 'DATA', 'GENE', 'CELL', 'NEON', 'PIXEL', 'TAP', 'RUSH', 'STACK', 'COLOR',
  'MATCH', 'LOOP', 'LASER', 'LIGHT', 'BOOST', 'SWAP', 'SPARK', 'GRID', 'SCORE', 'FLOW'
];

let grid = [];
let words = [];
let found = new Set();
let foundSegments = [];
let start = null;
let level = 1;
let score = 0;
let timeLeft = 90;
let timerId = null;

const levelEl = addHudStat('Level', 'level', '1');
const scoreEl = addHudStat('Score', 'score', '0');
const timeEl = addHudStat('Time', 'time', '90');
const btnHint = document.createElement('button');
btnHint.textContent = 'Hint';
hudEl.appendChild(btnHint);

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function randLetter() {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function inBounds(r, c) {
  return r >= 0 && c >= 0 && r < size && c < size;
}

function canPlaceWord(word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    if (!inBounds(rr, cc)) return false;
    const old = grid[rr][cc];
    if (old !== '' && old !== word[i]) return false;
  }
  return true;
}

function placeWord(word) {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
    [-1, 1]
  ];
  for (let tryCount = 0; tryCount < 140; tryCount++) {
    const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (!canPlaceWord(word, r, c, dr, dc)) continue;

    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      grid[rr][cc] = word[i];
    }
    return { word, r, c, dr, dc };
  }
  return null;
}

function pickWordsForLevel(levelValue) {
  const count = Math.min(8, 4 + Math.floor(levelValue / 2));
  const pool = [...wordPool];
  shuffle(pool);
  return pool.slice(0, count);
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
  foundEl.textContent = String(found.size);
  levelEl.textContent = String(level);
  scoreEl.textContent = String(score);
  timeEl.textContent = String(timeLeft);
}

function init(resetProgress = false) {
  if (resetProgress) {
    level = 1;
    score = 0;
  }

  grid = Array.from({ length: size }, () => Array(size).fill(''));
  found = new Set();
  foundSegments = [];
  start = null;

  const picked = pickWordsForLevel(level);
  const placed = [];
  picked.forEach((w) => {
    const entry = placeWord(w);
    if (entry) placed.push(entry);
  });

  words = placed.map((p) => p.word);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = randLetter();
    }
  }

  timeLeft = Math.max(45, 92 - level * 3);
  renderList();
  updateHud();
  startTimer();
}

function renderList() {
  listEl.innerHTML = words
    .map((w) => `<div>${found.has(w) ? '✅' : '⬜'} ${w}</div>`)
    .join('');
}

function getLine(startPos, endPos) {
  const dr = Math.sign(endPos.r - startPos.r);
  const dc = Math.sign(endPos.c - startPos.c);
  if (dr !== 0 && dc !== 0 && Math.abs(endPos.r - startPos.r) !== Math.abs(endPos.c - startPos.c)) {
    return null;
  }

  const out = [];
  let rr = startPos.r;
  let cc = startPos.c;
  while (inBounds(rr, cc)) {
    out.push({ r: rr, c: cc, ch: grid[rr][cc] });
    if (rr === endPos.r && cc === endPos.c) return out;
    rr += dr;
    cc += dc;
  }
  return null;
}

function onRoundClear() {
  clearInterval(timerId);
  score += Math.max(100, timeLeft * 2 + level * 20);
  level += 1;
  audio?.fx('win');
  updateHud();
  setTimeout(() => init(false), 850);
}

function onFail() {
  clearInterval(timerId);
  level = Math.max(1, level - 1);
  audio?.fx('fail');
  setTimeout(() => init(false), 450);
}

function handleClick(x, y) {
  const c = Math.floor((x - offsetX) / cell);
  const r = Math.floor((y - offsetY) / cell);
  if (r < 0 || c < 0 || r >= size || c >= size) return;

  if (!start) {
    start = { r, c };
    audio?.fx('ui');
    return;
  }

  const line = getLine(start, { r, c });
  if (!line) {
    start = null;
    audio?.fx('fail');
    return;
  }

  const letters = line.map((x0) => x0.ch).join('');
  const reversed = letters.split('').reverse().join('');
  const word = words.find((w) => w === letters || w === reversed);

  if (word && !found.has(word)) {
    found.add(word);
    foundSegments.push(line.map((p) => `${p.r},${p.c}`));
    score += 70 + level * 10;
    timeLeft = Math.min(120, timeLeft + 4);
    renderList();
    updateHud();
    audio?.fx('success');
    if (found.size === words.length) onRoundClear();
  } else {
    audio?.fx('fail');
  }

  start = null;
}

function useHint() {
  const remaining = words.filter((w) => !found.has(w));
  if (!remaining.length) return;
  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  found.add(pick);
  score = Math.max(0, score - 30);
  timeLeft = Math.max(0, timeLeft - 5);
  renderList();
  updateHud();
  audio?.fx('ui');
  if (found.size === words.length) onRoundClear();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const highlighted = new Set(foundSegments.flat());

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = offsetX + c * cell;
      const y = offsetY + r * cell;
      const key = `${r},${c}`;

      ctx.fillStyle = highlighted.has(key) ? '#18466a' : '#0f1d35';
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      if (start && start.r === r && start.c === c) {
        ctx.strokeStyle = '#7cffc5';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 5, y + 5, cell - 10, cell - 10);
        ctx.lineWidth = 1;
      }

      ctx.fillStyle = '#e6f0ff';
      ctx.font = '20px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(grid[r][c], x + cell / 2, y + cell / 2);
    }
  }
}

canvas.addEventListener('click', (e) => {
  audio?.unlock();
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
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
