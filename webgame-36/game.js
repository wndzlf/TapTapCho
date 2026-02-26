const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const foundEl = document.getElementById('found');
const listEl = document.getElementById('list');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-36', hudEl);

const objectPool = [
  { name: 'Key', w: 40, h: 14, color: '#ffd86d' },
  { name: 'Gem', w: 22, h: 22, color: '#7cffc5' },
  { name: 'Scroll', w: 46, h: 16, color: '#6df3ff' },
  { name: 'Potion', w: 18, h: 30, color: '#ff7bd0' },
  { name: 'Ring', w: 18, h: 18, color: '#ffb36d' },
  { name: 'Coin', w: 16, h: 16, color: '#ffe17a' },
  { name: 'Orb', w: 20, h: 20, color: '#8c7bff' },
  { name: 'Map', w: 34, h: 24, color: '#9dff7a' },
  { name: 'Mask', w: 24, h: 24, color: '#74e8ff' },
  { name: 'Feather', w: 32, h: 10, color: '#ffc2e8' }
];

const area = { x: 40, y: 80, w: 340, h: 380 };

let items = [];
let found = new Set();
let level = 1;
let score = 0;
let timeLeft = 80;
let timerId = null;
let highlightName = '';
let highlightUntil = 0;

const levelEl = addHudStat('Level', 'level', '1');
const scoreEl = addHudStat('Score', 'score', '0');
const timeEl = addHudStat('Time', 'time', '80');
const btnHint = document.createElement('button');
btnHint.textContent = 'Hint';
hudEl.appendChild(btnHint);

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
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

function overlap(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function randomPos(w, h) {
  return {
    x: area.x + 8 + Math.floor(Math.random() * (area.w - w - 16)),
    y: area.y + 8 + Math.floor(Math.random() * (area.h - h - 16))
  };
}

function init(resetProgress = false) {
  if (resetProgress) {
    level = 1;
    score = 0;
  }

  const itemCount = Math.min(8, 4 + Math.floor(level / 2));
  const shuffled = [...objectPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  items = [];
  const picked = shuffled.slice(0, itemCount);
  picked.forEach((base) => {
    let candidate = null;
    for (let i = 0; i < 70; i++) {
      const p = randomPos(base.w, base.h);
      candidate = { ...base, x: p.x, y: p.y };
      if (!items.some((old) => overlap(old, candidate))) break;
      candidate = null;
    }
    if (candidate) items.push(candidate);
  });

  found = new Set();
  highlightName = '';
  highlightUntil = 0;
  timeLeft = Math.max(35, 82 - level * 3);
  renderList();
  updateHud();
  startTimer();
}

function renderList() {
  listEl.innerHTML = items
    .map((i) => `<div>${found.has(i.name) ? '✅' : '⬜'} ${i.name}</div>`)
    .join('');
}

function onRoundClear() {
  clearInterval(timerId);
  score += Math.max(100, timeLeft * 2 + level * 20);
  level += 1;
  audio?.fx('win');
  updateHud();
  setTimeout(() => init(false), 820);
}

function onFail() {
  level = Math.max(1, level - 1);
  audio?.fx('fail');
  setTimeout(() => init(false), 450);
}

function handleClick(x, y) {
  const target = items.find((i) => {
    if (found.has(i.name)) return false;
    return x >= i.x && x <= i.x + i.w && y >= i.y && y <= i.y + i.h;
  });

  if (!target) {
    score = Math.max(0, score - 10);
    timeLeft = Math.max(0, timeLeft - 1);
    audio?.fx('fail');
    updateHud();
    return;
  }

  found.add(target.name);
  score += 60 + level * 8;
  timeLeft = Math.min(120, timeLeft + 2);
  renderList();
  updateHud();
  audio?.fx('success');

  if (found.size === items.length) onRoundClear();
}

function useHint() {
  const hidden = items.filter((i) => !found.has(i.name));
  if (!hidden.length) return;
  const pick = hidden[Math.floor(Math.random() * hidden.length)];
  highlightName = pick.name;
  highlightUntil = performance.now() + 1500;
  score = Math.max(0, score - 20);
  timeLeft = Math.max(0, timeLeft - 4);
  updateHud();
  audio?.fx('ui');
}

function drawItem(item) {
  if (found.has(item.name)) return;

  const pulse = highlightName === item.name && performance.now() < highlightUntil;
  const alpha = pulse ? 1 : 0.88;
  ctx.globalAlpha = alpha;

  ctx.fillStyle = item.color;
  ctx.fillRect(item.x, item.y, item.w, item.h);

  if (pulse) {
    ctx.strokeStyle = '#e6f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x - 3, item.y - 3, item.w + 6, item.h + 6);
    ctx.lineWidth = 1;
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f1d35';
  ctx.fillRect(area.x, area.y, area.w, area.h);

  ctx.fillStyle = '#1f2a44';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(60 + i * 40, 260, 18, 70);
  }
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(52 + i * 32, 142, 12, 36);
  }

  items.forEach(drawItem);

  if (found.size === items.length) {
    ctx.fillStyle = 'rgba(5,8,15,0.6)';
    ctx.fillRect(area.x, area.y, area.w, area.h);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Area Cleared!', canvas.width / 2, canvas.height / 2);
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
