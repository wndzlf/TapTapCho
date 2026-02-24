const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'color-switch-dot-best';
const TAU = Math.PI * 2;
const SEGMENT_ARC = TAU / 4;
const RING_GAP_ANGLE = 0.18;
const KEEP_COLOR_CHANCE = 0.7;

const COLORS = ['#ff5f6d', '#ffd166', '#4ecdc4', '#5f8cff'];

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let shake = 0;

const player = {
  x: W / 2,
  y: 560,
  vy: 0,
  r: 11,
  color: COLORS[0],
};

let cameraY = 0;
let obstacles = [];
let particles = [];

bestEl.textContent = String(best);

const audioCtx = window.AudioContext ? new AudioContext() : null;

function beep(freq, duration, gain = 0.02) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeAngle(a) {
  let n = a % TAU;
  if (n < 0) n += TAU;
  return n;
}

function randomColorExcept(current) {
  let candidate = current;
  while (candidate === current) {
    candidate = COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  return candidate;
}

function addBurst(x, y, color, amount = 10) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 26 + Math.random() * 20,
      color,
    });
  }
}

function makeObstacle(y) {
  return {
    y,
    r: rand(62, 80),
    thickness: 12,
    rot: rand(0, TAU),
    rotSpeed: (Math.random() > 0.5 ? 1 : -1) * rand(0.006, 0.013),
    cleared: false,
    checkedThisPass: false,
  };
}

function buildInitialObstacles() {
  obstacles = [];
  let y = 410;
  for (let i = 0; i < 10; i += 1) {
    obstacles.push(makeObstacle(y));
    y -= rand(260, 320);
  }
}

function extendObstacles() {
  while (obstacles[obstacles.length - 1].y > player.y - 1900) {
    const last = obstacles[obstacles.length - 1];
    obstacles.push(makeObstacle(last.y - rand(260, 320)));
  }
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;

  player.y = 560;
  player.vy = 0;
  player.color = COLORS[Math.floor(Math.random() * COLORS.length)];

  cameraY = 0;
  particles = [];
  buildInitialObstacles();

  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  shake = 10;
  addBurst(player.x, player.y, '#ff7b74', 24);
  beep(180, 0.22, 0.06);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function jump() {
  if (state !== 'running') {
    startGame();
    return;
  }

  player.vy = -8.2;
  addBurst(player.x, player.y, player.color, 8);
  beep(540, 0.04, 0.02);
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 1;
  }
  particles = particles.filter((p) => p.life > 0);

  if (state !== 'running') return;

  player.vy += 0.22;
  if (player.vy > 7.2) player.vy = 7.2;
  player.y += player.vy;

  if (player.y < cameraY + H * 0.42) {
    cameraY = player.y - H * 0.42;
  }

  if (player.y - cameraY > H + 90) {
    endGame();
    return;
  }

  extendObstacles();

  for (const obs of obstacles) {
    obs.rot += obs.rotSpeed;

    if (!obs.cleared && obs.checkedThisPass && player.y > obs.y + obs.r + 26) {
      obs.checkedThisPass = false;
    }

    if (obs.cleared) {
      continue;
    }

    const dy = player.y - obs.y;
    const radial = Math.abs(dy);
    const inner = obs.r - obs.thickness * 0.5;
    const outer = obs.r + obs.thickness * 0.5;

    const intersectsBand = radial + player.r > inner && radial - player.r < outer;

    // Easier and fairer: only judge while rising into the ring once per pass.
    if (!obs.checkedThisPass && intersectsBand && player.vy < 0 && dy > 0) {
      obs.checkedThisPass = true;
      const contactAngle = dy < 0 ? -Math.PI / 2 : Math.PI / 2;
      const localAngle = normalizeAngle(contactAngle - obs.rot);
      const angleInSegment = localAngle % SEGMENT_ARC;

      // Match render gap and collision gap so near-boundary hits feel fair.
      if (angleInSegment < RING_GAP_ANGLE || angleInSegment > SEGMENT_ARC - RING_GAP_ANGLE) {
        continue;
      }

      const segmentIndex = Math.floor(localAngle / SEGMENT_ARC) % 4;
      const segmentColor = COLORS[segmentIndex];

      if (segmentColor !== player.color) {
        endGame();
        return;
      }
    }

    if (!obs.cleared && player.y < obs.y - obs.r - 16) {
      obs.cleared = true;
      score += 1;
      scoreEl.textContent = String(score);
      player.color = Math.random() < KEEP_COLOR_CHANCE ? player.color : randomColorExcept(player.color);

      addBurst(player.x, player.y, '#ffffff', 10);
      beep(780, 0.045, 0.02);
    }
  }
}

function drawObstacle(obs) {
  const y = obs.y - cameraY;
  if (y < -120 || y > H + 120) return;

  ctx.lineCap = 'round';

  for (let i = 0; i < 4; i += 1) {
    const start = obs.rot + i * SEGMENT_ARC + RING_GAP_ANGLE;
    const end = obs.rot + (i + 1) * SEGMENT_ARC - RING_GAP_ANGLE;

    ctx.strokeStyle = COLORS[i];
    ctx.lineWidth = obs.thickness;
    ctx.shadowColor = COLORS[i];
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(W / 2, y, obs.r, start, end);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

function render() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.84;
  }

  ctx.fillStyle = '#091122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 40; i += 1) {
    const x = (i * 89) % W;
    const y = (i * 37 + tick * 1.1) % H;
    ctx.fillStyle = 'rgba(142, 188, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  for (const obs of obstacles) {
    drawObstacle(obs);
  }

  const py = player.y - cameraY;
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(player.x, py, player.r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  for (const p of particles) {
    const y = p.y - cameraY;
    if (y < -10 || y > H + 10) continue;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 38);
    ctx.fillRect(p.x, y, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#e7eefb';
  ctx.font = 'bold 15px system-ui';
  ctx.fillText('Current Color', 14, 30);
  ctx.fillStyle = player.color;
  ctx.fillRect(138, 18, 18, 18);

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Jump' : 'Wrong Color', W / 2, H / 2 - 14);
    ctx.font = '16px system-ui';
    ctx.fillText('Pass only through matching color', W / 2, H / 2 + 18);
  }

  ctx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') {
    jump();
  }
});

canvas.addEventListener('pointerdown', jump);
btnStart.addEventListener('click', startGame);

resetGame();
loop();
