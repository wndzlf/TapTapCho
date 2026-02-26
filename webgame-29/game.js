const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const winsEl = document.getElementById('wins');
const btnReset = document.getElementById('btnReset');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-29', hudEl);

let ball = null;
let wins = 0;
let winsThisLevel = 0;
let level = 1;
let timeLeft = 55;
let timerId = null;
let obstacles = [];
let goal = { x: 300, y: 470, r: 24 };

const levelEl = addHudStat('Level', 'level', '1');
const targetEl = addHudStat('Target', 'target', '3');
const timeEl = addHudStat('Time', 'time', '55');
const streakEl = addHudStat('Streak', 'streak', '0');

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function targetWinsForLevel() {
  return Math.min(6, 2 + Math.floor(level / 2));
}

function makeObstacles(levelValue) {
  const base = [
    { x: 70, y: 150, w: 120, h: 14, amp: 30, speed: 0.012 },
    { x: 220, y: 250, w: 120, h: 14, amp: 26, speed: 0.017 },
    { x: 90, y: 350, w: 130, h: 14, amp: 34, speed: 0.01 }
  ];

  if (levelValue >= 2) base.push({ x: 220, y: 430, w: 90, h: 12, amp: 22, speed: 0.02 });
  if (levelValue >= 4) base.push({ x: 40, y: 300, w: 80, h: 12, amp: 28, speed: 0.022 });

  return base.map((o, i) => ({
    ...o,
    baseX: o.x,
    dir: i % 2 ? -1 : 1
  }));
}

function updateHud() {
  winsEl.textContent = String(wins);
  levelEl.textContent = String(level);
  targetEl.textContent = String(targetWinsForLevel());
  timeEl.textContent = String(timeLeft);
  streakEl.textContent = String(winsThisLevel);
}

function resetBall() {
  ball = {
    x: canvas.width / 2,
    y: 62,
    vx: 0,
    vy: 0,
    r: 12,
    dropped: false
  };
}

function resetRound(resetProgress = false) {
  if (resetProgress) {
    wins = 0;
    level = 1;
    winsThisLevel = 0;
  }
  obstacles = makeObstacles(level);
  goal = {
    x: 90 + Math.random() * 240,
    y: 470 - Math.min(110, level * 10),
    r: Math.max(18, 24 - Math.floor(level / 2))
  };
  timeLeft = Math.max(30, 56 - level * 3);
  updateHud();
  resetBall();
  startTimer();
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    updateHud();
    if (timeLeft === 0) {
      onFail();
    }
  }, 1000);
}

function onFail() {
  audio?.fx('fail');
  winsThisLevel = Math.max(0, winsThisLevel - 1);
  level = Math.max(1, level - (winsThisLevel === 0 ? 1 : 0));
  resetRound(false);
}

function onScoreGoal() {
  wins += 1;
  winsThisLevel += 1;
  audio?.fx('success');
  if (winsThisLevel >= targetWinsForLevel()) {
    level += 1;
    winsThisLevel = 0;
    audio?.fx('win');
  }
  resetRound(false);
}

function dropBall(clickX) {
  if (!ball.dropped) {
    const centerOffset = (clickX - canvas.width / 2) / (canvas.width / 2);
    ball.vx = centerOffset * (1.2 + level * 0.08);
    ball.vy = -0.2;
    ball.dropped = true;
    audio?.fx('ui');
  }
}

function updateObstacles() {
  const t = performance.now();
  obstacles.forEach((o, i) => {
    o.x = o.baseX + Math.sin(t * o.speed + i) * o.amp;
  });
}

function update() {
  updateObstacles();
  if (!ball.dropped) return;

  ball.vy += 0.24 + level * 0.01;
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x < ball.r || ball.x > canvas.width - ball.r) {
    ball.vx *= -0.88;
    ball.x = Math.max(ball.r, Math.min(canvas.width - ball.r, ball.x));
  }
  if (ball.y > canvas.height - ball.r) {
    ball.vy *= -0.62;
    ball.y = canvas.height - ball.r;
    if (Math.abs(ball.vy) < 1.5 && Math.abs(ball.vx) < 0.3) {
      resetBall();
    }
  }

  obstacles.forEach((o) => {
    if (ball.x > o.x && ball.x < o.x + o.w && ball.y + ball.r > o.y && ball.y - ball.r < o.y + o.h) {
      if (ball.vy > 0) {
        ball.y = o.y - ball.r;
        ball.vy *= -0.74;
        ball.vx += (Math.random() * 2 - 1) * 0.2;
      }
    }
  });

  const dx = ball.x - goal.x;
  const dy = ball.y - goal.y;
  if (Math.hypot(dx, dy) < goal.r - 2) {
    onScoreGoal();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grd = ctx.createLinearGradient(0, 20, 0, canvas.height);
  grd.addColorStop(0, '#0e1830');
  grd.addColorStop(1, '#091122');
  ctx.fillStyle = grd;
  ctx.fillRect(12, 10, canvas.width - 24, canvas.height - 20);

  ctx.fillStyle = '#7cffc5';
  ctx.shadowColor = '#7cffc5';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#1f2a44';
  obstacles.forEach((o) => {
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = '#30476f';
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  });

  ctx.fillStyle = '#6df3ff';
  ctx.shadowColor = '#6df3ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!ball.dropped) {
    ctx.fillStyle = '#e6f0ff';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Tap position to set launch angle', canvas.width / 2, 28);
  }
}

canvas.addEventListener('click', (e) => {
  audio?.unlock();
  const rect = canvas.getBoundingClientRect();
  dropBall(e.clientX - rect.left);
});

btnReset.addEventListener('click', () => {
  audio?.unlock();
  resetRound(true);
});

resetRound(true);
(function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
})();
