const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const winsEl = document.getElementById('wins');
const btnReset = document.getElementById('btnReset');

let ball = null;
let wins = 0;

const obstacles = [
  { x: 80, y: 160, w: 120, h: 14 },
  { x: 220, y: 260, w: 120, h: 14 },
  { x: 60, y: 360, w: 100, h: 14 }
];

const goal = { x: 300, y: 470, r: 26 };

function resetBall() {
  ball = { x: canvas.width / 2, y: 60, vx: 0, vy: 0, r: 12, dropped: false };
}

function dropBall() {
  if (!ball.dropped) {
    ball.vx = (Math.random() * 2 - 1) * 1.2;
    ball.dropped = true;
  }
}

function update() {
  if (!ball.dropped) return;
  ball.vy += 0.25;
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x < ball.r || ball.x > canvas.width - ball.r) {
    ball.vx *= -0.9;
    ball.x = Math.max(ball.r, Math.min(canvas.width - ball.r, ball.x));
  }
  if (ball.y > canvas.height - ball.r) {
    ball.vy *= -0.6;
    ball.y = canvas.height - ball.r;
  }

  obstacles.forEach((o) => {
    if (ball.x > o.x && ball.x < o.x + o.w && ball.y + ball.r > o.y && ball.y - ball.r < o.y + o.h) {
      if (ball.vy > 0) {
        ball.y = o.y - ball.r;
        ball.vy *= -0.7;
        ball.vx += (Math.random() * 2 - 1) * 0.2;
      }
    }
  });

  const dx = ball.x - goal.x;
  const dy = ball.y - goal.y;
  if (Math.hypot(dx, dy) < goal.r - 4) {
    wins += 1;
    winsEl.textContent = wins;
    resetBall();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // goal
  ctx.fillStyle = '#7cffc5';
  ctx.shadowColor = '#7cffc5';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // obstacles
  ctx.fillStyle = '#1f2a44';
  obstacles.forEach((o) => ctx.fillRect(o.x, o.y, o.w, o.h));

  // ball
  ctx.fillStyle = '#6df3ff';
  ctx.shadowColor = '#6df3ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

canvas.addEventListener('click', dropBall);
btnReset.addEventListener('click', resetBall);

resetBall();
(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
