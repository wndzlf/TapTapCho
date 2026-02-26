const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-34', hudEl);

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
let waste = null;
let tableau = [];
let moves = 0;
let level = 1;
let score = 0;
let combo = 1;
let timeLeft = 100;
let timerId = null;

const levelEl = addHudStat('Level', 'level', '1');
const scoreEl = addHudStat('Score', 'score', '0');
const comboEl = addHudStat('Combo', 'combo', 'x1');
const timeEl = addHudStat('Time', 'time', '100');

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function buildDeck() {
  const out = [];
  suits.forEach((s, si) => {
    ranks.forEach((r, ri) => out.push({ s, r, si, ri }));
  });
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function rankNear(a, b) {
  if (!a || !b) return false;
  const d = Math.abs(a.ri - b.ri);
  return d === 1 || d === 12;
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
  scoreEl.textContent = String(score);
  comboEl.textContent = `x${combo}`;
  timeEl.textContent = String(timeLeft);
}

function init(resetProgress = false) {
  if (resetProgress) {
    level = 1;
    score = 0;
  }

  deck = buildDeck();
  waste = deck.pop();
  tableau = [];
  moves = 0;
  combo = 1;
  timeLeft = Math.max(45, 102 - level * 4);

  const rows = Math.min(5, 3 + Math.floor((level - 1) / 2));
  const cols = 7;
  const cardW = 50;
  const cardH = 70;
  const startX = Math.floor((canvas.width - cols * (cardW + 4)) / 2);
  const startY = 160;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!deck.length) break;
      tableau.push({
        card: deck.pop(),
        x: startX + c * (cardW + 4),
        y: startY + r * (cardH + 6),
        w: cardW,
        h: cardH,
        alive: true
      });
    }
  }

  updateHud();
  startTimer();
}

function aliveCards() {
  return tableau.filter((t) => t.alive);
}

function canAnyMove() {
  return aliveCards().some((slot) => rankNear(slot.card, waste));
}

function onRoundClear() {
  clearInterval(timerId);
  score += Math.max(120, timeLeft * 3 + combo * 15);
  level += 1;
  audio?.fx('win');
  updateHud();
  setTimeout(() => init(false), 700);
}

function onFail() {
  clearInterval(timerId);
  level = Math.max(1, level - 1);
  audio?.fx('fail');
  setTimeout(() => init(false), 450);
}

function drawCard(x, y, card, faceUp = true) {
  ctx.fillStyle = '#0f1d35';
  ctx.fillRect(x, y, 50, 70);
  ctx.strokeStyle = '#2a3f66';
  ctx.strokeRect(x, y, 50, 70);
  if (faceUp && card) {
    const red = card.s === '♥' || card.s === '♦';
    ctx.fillStyle = red ? '#ff7b90' : '#e6f0ff';
    ctx.font = '14px system-ui';
    ctx.fillText(`${card.r}${card.s}`, x + 6, y + 20);
    ctx.font = '20px system-ui';
    ctx.fillText(card.s, x + 18, y + 48);
  }
}

function handleDeckClick() {
  if (deck.length) {
    waste = deck.pop();
    combo = 1;
    moves += 1;
    audio?.fx('ui');
    updateHud();
    return;
  }

  if (!canAnyMove()) {
    onFail();
    return;
  }

  deck = buildDeck().slice(0, 14);
  combo = 1;
  moves += 1;
  updateHud();
}

function handleTableauClick(x, y) {
  const slot = tableau.find((t) => t.alive && x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h);
  if (!slot) return false;

  if (rankNear(slot.card, waste)) {
    waste = slot.card;
    slot.alive = false;
    moves += 1;
    combo = Math.min(10, combo + 1);
    score += 25 + combo * 6 + level * 2;
    timeLeft = Math.min(130, timeLeft + 1);
    audio?.fx('success');
    updateHud();

    if (aliveCards().length === 0) {
      onRoundClear();
    } else if (!deck.length && !canAnyMove()) {
      onFail();
    }
    return true;
  }

  combo = 1;
  audio?.fx('fail');
  updateHud();
  return false;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawCard(32, 52, null, deck.length > 0);
  ctx.fillStyle = '#7cffc5';
  ctx.font = '13px system-ui';
  ctx.fillText(`Deck ${deck.length}`, 32, 136);

  drawCard(112, 52, waste, true);
  ctx.fillStyle = '#6df3ff';
  ctx.fillText('Waste', 112, 136);

  aliveCards().forEach((slot) => {
    drawCard(slot.x, slot.y, slot.card, true);
  });

  if (aliveCards().length === 0) {
    ctx.fillStyle = 'rgba(5,8,15,0.62)';
    ctx.fillRect(20, 148, canvas.width - 40, canvas.height - 170);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Round Clear!', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
  }
}

canvas.addEventListener('click', (e) => {
  audio?.unlock();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (x >= 32 && x <= 82 && y >= 52 && y <= 122) {
    handleDeckClick();
    return;
  }

  handleTableauClick(x, y);
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
