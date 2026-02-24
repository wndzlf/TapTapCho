const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');

const cols = 20;
const rows = 30;
const cell = 20;
const gridW = cols * cell;
const gridH = rows * cell;
const offsetX = Math.floor((canvas.width - gridW) / 2);
const offsetY = Math.floor((canvas.height - gridH) / 2);

let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 10, y: 10 };
let score = 0;
let best = Number(localStorage.getItem('neon-snake-best') || 0);
let running = false;
let paused = false;
let tickMs = 120;
let lastTick = 0;

bestEl.textContent = best;

function reset() {
  snake = [
    { x: 7, y: 15 },
    { x: 6, y: 15 },
    { x: 5, y: 15 },
    { x: 4, y: 15 }
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  tickMs = 120;
  placeFood();
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
}

function placeFood() {
  while (true) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (!snake.some(s => s.x === x && s.y === y)) {
      food = { x, y };
      return;
    }
  }
}

function setDir(x, y) {
  if (running === false) return;
  if (x === -dir.x && y === -dir.y) return;
  nextDir = { x, y };
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    gameOver();
    return;
  }
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    if (score % 50 === 0 && tickMs > 70) tickMs -= 5;
    placeFood();
  } else {
    snake.pop();
  }
  updateHud();
}

function gameOver() {
  running = false;
  paused = false;
  if (score > best) {
    best = score;
    localStorage.setItem('neon-snake-best', best);
  }
  updateHud();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(80, 120, 180, 0.15)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    const x = offsetX + c * cell;
    ctx.beginPath();
    ctx.moveTo(x, offsetY);
    ctx.lineTo(x, offsetY + gridH);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = offsetY + r * cell;
    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + gridW, y);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  // Food
  ctx.fillStyle = '#ff7bd0';
  ctx.shadowColor = '#ff7bd0';
  ctx.shadowBlur = 12;
  ctx.fillRect(
    offsetX + food.x * cell + 3,
    offsetY + food.y * cell + 3,
    cell - 6,
    cell - 6
  );
  ctx.shadowBlur = 0;

  // Snake
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#7cffc5' : '#6df3ff';
    ctx.shadowColor = i === 0 ? '#7cffc5' : '#6df3ff';
    ctx.shadowBlur = i === 0 ? 16 : 8;
    ctx.fillRect(
      offsetX + seg.x * cell + 2,
      offsetY + seg.y * cell + 2,
      cell - 4,
      cell - 4
    );
  });
  ctx.shadowBlur = 0;

  if (!running) {
    ctx.fillStyle = 'rgba(4, 10, 20, 0.7)';
    ctx.fillRect(offsetX, offsetY, gridW, gridH);
    ctx.fillStyle = '#e5f1ff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Tap Start', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '16px system-ui';
    ctx.fillText('Avoid walls and yourself', canvas.width / 2, canvas.height / 2 + 18);
  } else if (paused) {
    ctx.fillStyle = 'rgba(4, 10, 20, 0.6)';
    ctx.fillRect(offsetX, offsetY, gridW, gridH);
    ctx.fillStyle = '#e5f1ff';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
  }
}

function loop(ts) {
  if (running && !paused && ts - lastTick >= tickMs) {
    lastTick = ts;
    step();
  }
  draw();
  requestAnimationFrame(loop);
}

btnStart.addEventListener('click', () => {
  reset();
  running = true;
  paused = false;
});

btnPause.addEventListener('click', () => {
  if (!running) return;
  paused = !paused;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w') setDir(0, -1);
  if (e.key === 'ArrowDown' || e.key === 's') setDir(0, 1);
  if (e.key === 'ArrowLeft' || e.key === 'a') setDir(-1, 0);
  if (e.key === 'ArrowRight' || e.key === 'd') setDir(1, 0);
  if (e.key === ' ') {
    if (running) paused = !paused;
  }
});

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 20) setDir(1, 0);
    if (dx < -20) setDir(-1, 0);
  } else {
    if (dy > 20) setDir(0, 1);
    if (dy < -20) setDir(0, -1);
  }
  touchStart = null;
});

reset();
requestAnimationFrame(loop);
