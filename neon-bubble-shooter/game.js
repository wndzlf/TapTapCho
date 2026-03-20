const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const bestStreakEl = document.getElementById('bestStreak');
const leftEl = document.getElementById('left');
const btnNew = document.getElementById('btnNew');

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

const cols = 8;
const rows = 10;
const radius = 18;
const offsetX = Math.floor((canvas.width - cols * radius * 2) / 2) + radius;
const offsetY = 30;
const colors = ['#6df3ff', '#7cffc5', '#ffd86d', '#ff7bd0', '#8c7bff'];

let grid = [];
let shooter = null;
let lane = null;
let laneDir = 1;
let score = 0;
let streak = 0;
let best = Number(localStorage.getItem('webgame-33-best-score') || 0);
const BEST_STREAK_KEY = 'webgame-33-best-streak';
let bestStreak = Number(localStorage.getItem(BEST_STREAK_KEY) || 0);
let laneManualUntil = 0;
let pointerActive = false;

function randColor() { return Math.floor(Math.random() * colors.length); }

function countBubbles() {
  let total = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== -1) total += 1;
    }
  }
  return total;
}

function resetBoard(keepScore) {
  grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() > 0.5 ? randColor() : -1)));
  shooter = { x: canvas.width / 2, y: canvas.height - 40, color: randColor(), vy: 0, active: false };
  lane = { x: canvas.width / 2, t: 0 };
  laneDir = 1;
  if (!keepScore) score = 0;
  streak = 0;
  scoreEl.textContent = score;
  bestEl.textContent = String(best);
  streakEl.textContent = String(streak);
  bestStreakEl.textContent = String(bestStreak);
  leftEl.textContent = String(countBubbles());
  streakEl.parentElement?.classList.toggle('hot', streak >= 3);
}

function init() {
  resetBoard(false);
}

function cellToPos(r, c) {
  return { x: offsetX + c * radius * 2, y: offsetY + r * radius * 2 };
}

function setLaneFromX(x) {
  const minX = offsetX + radius * 0.6;
  const maxX = offsetX + (cols - 1) * radius * 2 - radius * 0.6;
  const clamped = clamp(x, minX, maxX);
  lane.x = clamped;
  lane.t = (clamped - minX) / (maxX - minX);
  laneManualUntil = performance.now() + 1200;
}

function shoot() {
  if (shooter.active) return;
  if (lane) shooter.x = lane.x;
  shooter.vy = -6;
  shooter.active = true;
}

function findCluster(r, c, color, visited = new Set()) {
  const key = `${r},${c}`;
  if (visited.has(key)) return [];
  visited.add(key);
  const res = [{ r, c }];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  dirs.forEach(([dr, dc]) => {
    const rr = r + dr; const cc = c + dc;
    if (rr >= 0 && cc >= 0 && rr < rows && cc < cols && grid[rr][cc] === color) {
      res.push(...findCluster(rr, cc, color, visited));
    }
  });
  return res;
}

function attachBubble() {
  // find nearest cell
  let best = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const { x, y } = cellToPos(r, c);
      const d = Math.hypot(shooter.x - x, shooter.y - y);
      if (!best || d < best.d) best = { r, c, d };
    }
  }
  if (!best) return;
  grid[best.r][best.c] = shooter.color;
  const cluster = findCluster(best.r, best.c, shooter.color);
  if (cluster.length >= 3) {
    cluster.forEach(p => grid[p.r][p.c] = -1);
    score += cluster.length * 10;
    streak += 1;
    vibrate(15);
    if (streak > bestStreak) {
      bestStreak = streak;
      localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));
    }
    if (score > best) {
      best = score;
      localStorage.setItem('webgame-33-best-score', String(best));
    }
    scoreEl.textContent = score;
    bestEl.textContent = String(best);
    streakEl.textContent = String(streak);
    bestStreakEl.textContent = String(bestStreak);
  } else {
    streak = 0;
    streakEl.textContent = String(streak);
    vibrate(10);
  }
  const left = countBubbles();
  leftEl.textContent = String(left);
  if (left === 0) {
    score += 50;
    if (score > best) {
      best = score;
      localStorage.setItem('webgame-33-best-score', String(best));
    }
    scoreEl.textContent = score;
    bestEl.textContent = String(best);
    vibrate([20, 40, 20]);
    resetBoard(true);
    return;
  }
  shooter.active = false;
  shooter.y = canvas.height - 40;
  shooter.x = canvas.width / 2;
  shooter.color = randColor();
}

function update() {
  if (!shooter.active) {
    if (lane) {
      if (performance.now() < laneManualUntil) return;
      lane.t += 0.018 * laneDir;
      if (lane.t > 1 || lane.t < 0) laneDir *= -1;
      const t = clamp(lane.t, 0, 1);
      const minX = offsetX + radius * 0.6;
      const maxX = offsetX + (cols - 1) * radius * 2 - radius * 0.6;
      lane.x = minX + (maxX - minX) * t;
    }
    return;
  }
  shooter.y += shooter.vy;
  if (shooter.y < offsetY) {
    attachBubble();
    return;
  }
  // collision with grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === -1) continue;
      const { x, y } = cellToPos(r, c);
      if (Math.hypot(shooter.x - x, shooter.y - y) < radius * 2 - 2) {
        attachBubble();
        return;
      }
    }
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === -1) continue;
      const { x, y } = cellToPos(r, c);
      ctx.fillStyle = colors[grid[r][c]];
      ctx.shadowColor = colors[grid[r][c]];
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // aim guide
  if (!shooter.active) {
    const guideX = lane ? lane.x : shooter.x;
    ctx.save();
    ctx.strokeStyle = 'rgba(109, 243, 255, 0.35)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guideX, shooter.y - radius);
    ctx.lineTo(guideX, offsetY - 6);
    ctx.stroke();
    ctx.restore();
  }

  // shooter
  const drawX = shooter.active ? shooter.x : (lane ? lane.x : shooter.x);
  ctx.fillStyle = colors[shooter.color];
  ctx.shadowColor = colors[shooter.color];
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(drawX, shooter.y, radius - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function getPointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener('pointerdown', (event) => {
  pointerActive = true;
  const pos = getPointerPos(event);
  setLaneFromX(pos.x);
  shoot();
});

canvas.addEventListener('pointermove', (event) => {
  if (!pointerActive || shooter.active) return;
  const pos = getPointerPos(event);
  setLaneFromX(pos.x);
});

canvas.addEventListener('pointerup', () => {
  pointerActive = false;
});

canvas.addEventListener('pointercancel', () => {
  pointerActive = false;
});

btnNew.addEventListener('click', init);

init();
bestStreakEl.textContent = String(bestStreak);
(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
