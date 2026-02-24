const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const movesEl = document.getElementById('moves');
const btnNew = document.getElementById('btnNew');

const suits = ['♠','♥','♦','♣'];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

let deck = [];
let waste = [];
let foundations = [[],[],[],[]];
let moves = 0;

function buildDeck() {
  deck = [];
  suits.forEach((s, si) => {
    ranks.forEach((r, ri) => deck.push({ s, r, si, ri }));
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function init() {
  buildDeck();
  waste = [];
  foundations = [[],[],[],[]];
  moves = 0;
  movesEl.textContent = moves;
}

function drawCard(x, y, card, faceUp = true) {
  ctx.fillStyle = '#0f1d35';
  ctx.fillRect(x, y, 70, 95);
  ctx.strokeStyle = '#2a3f66';
  ctx.strokeRect(x, y, 70, 95);
  if (faceUp && card) {
    ctx.fillStyle = (card.s === '♥' || card.s === '♦') ? '#ff7b90' : '#e6f0ff';
    ctx.font = '16px system-ui';
    ctx.fillText(card.r + card.s, x + 8, y + 20);
  }
}

function canMoveToFoundation(card, f) {
  if (!card) return false;
  if (!foundations[f].length) return card.ri === 0; // Ace
  const top = foundations[f][foundations[f].length - 1];
  return top.s === card.s && card.ri === top.ri + 1;
}

function handleClick(x, y) {
  // deck area
  if (x >= 40 && x <= 110 && y >= 40 && y <= 135) {
    if (deck.length) waste.push(deck.pop());
    else { deck = waste.reverse(); waste = []; }
    moves++; movesEl.textContent = moves; return;
  }
  // waste area
  if (x >= 140 && x <= 210 && y >= 40 && y <= 135) {
    const card = waste[waste.length - 1];
    if (!card) return;
    for (let f = 0; f < 4; f++) {
      if (canMoveToFoundation(card, f)) {
        foundations[f].push(card);
        waste.pop();
        moves++; movesEl.textContent = moves; return;
      }
    }
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // deck + waste
  drawCard(40, 40, null, deck.length > 0);
  drawCard(140, 40, waste[waste.length - 1], !!waste.length);

  // foundations
  for (let i = 0; i < 4; i++) {
    const card = foundations[i][foundations[i].length - 1];
    drawCard(40 + i * 85, 170, card, !!card);
  }

  // status
  ctx.fillStyle = '#7cffc5';
  ctx.font = '14px system-ui';
  ctx.fillText(`Deck: ${deck.length}`, 40, 320);
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnNew.addEventListener('click', init);

init();
(function loop(){ draw(); requestAnimationFrame(loop); })();
