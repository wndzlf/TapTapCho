const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const bestStreakEl = document.getElementById('bestStreak');
const leftEl = document.getElementById('left');
const btnNew = document.getElementById('btnNew');

const cols = 8;
const rows = 10;
const radius = 18;
const offsetX = Math.floor((canvas.width - cols * radius * 2) / 2) + radius;
const offsetY = 30;
const colors = ['#6df3ff', '#7cffc5', '#ffd86d', '#ff7bd0', '#8c7bff'];

let grid = [];
let shooter = null;
let score = 0;
let streak = 0;
let best = Number(localStorage.getItem('webgame-33-best-score') || 0);
const BEST_STREAK_KEY = 'webgame-33-best-streak';
let bestStreak = Number(localStorage.getItem(BEST_STREAK_KEY) || 0);

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

function shoot() {
  if (shooter.active) return;
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
    resetBoard(true);
    return;
  }
  shooter.active = false;
  shooter.y = canvas.height - 40;
  shooter.x = canvas.width / 2;
  shooter.color = randColor();
}

function update() {
  if (!shooter.active) return;
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
    ctx.save();
    ctx.strokeStyle = 'rgba(109, 243, 255, 0.35)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shooter.x, shooter.y - radius);
    ctx.lineTo(shooter.x, offsetY - 6);
    ctx.stroke();
    ctx.restore();
  }

  // shooter
  ctx.fillStyle = colors[shooter.color];
  ctx.shadowColor = colors[shooter.color];
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(shooter.x, shooter.y, radius - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

canvas.addEventListener('click', shoot);
btnNew.addEventListener('click', init);

init();
bestStreakEl.textContent = String(bestStreak);
(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
