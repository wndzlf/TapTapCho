const bgmAudio = window.TapTapNeonAudio?.create('webgame-21', document.querySelector('.hud'), {
  mediaSrc: '../assets/audio/zigzag-memory-run-pixabay-488126.mp3',
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'zigzag-memory-run-best';

const START_Y = H * 0.8;
const STEP_Y = 42;
const STEP_X = 38;
const MIN_GOAL_Y = 148;

let state = 'idle'; // idle | preview | input | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let streak = 0;
let tick = 0;
let flash = 0;

let sequence = [];
let roundLength = 4;
let inputIndex = 0;

let previewStep = 0;
let previewTimer = 0;

const particles = [];

bestEl.textContent = String(best);

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  streakEl.textContent = String(streak);

  streakEl.parentElement?.classList.toggle('hot', streak >= 3);
  scoreEl.parentElement?.classList.toggle('warn', state === 'input' && inputIndex > 0 && inputIndex < sequence.length);
}

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

function addBurst(x, y, color, amount = 10) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 24 + Math.random() * 16,
      color,
    });
  }
}

function generateSequence(len) {
  const seq = [];
  let lane = 0;

  for (let i = 0; i < len; i += 1) {
    const options = [];
    if (lane > -3) options.push(-1);
    if (lane < 3) options.push(1);

    const pick = options[Math.floor(Math.random() * options.length)];
    lane += pick;
    seq.push(pick);
  }

  return seq;
}

function sequenceToPoints(seq) {
  const points = [{ x: W * 0.5, y: START_Y }];
  let lane = 0;
  const spanY = Math.max(1, START_Y - MIN_GOAL_Y);
  const stepY = Math.max(18, Math.min(STEP_Y, spanY / Math.max(1, seq.length)));

  for (let i = 0; i < seq.length; i += 1) {
    lane += seq[i];
    points.push({
      x: W * 0.5 + lane * STEP_X,
      y: START_Y - (i + 1) * stepY,
    });
  }
  return points;
}

function startRound() {
  sequence = generateSequence(roundLength);
  inputIndex = 0;
  previewStep = 0;
  previewTimer = 32;
  state = 'preview';
}

function resetGame() {
  state = 'idle';
  score = 0;
  streak = 0;
  tick = 0;
  flash = 0;
  roundLength = 4;
  sequence = [];
  inputIndex = 0;
  previewStep = 0;
  previewTimer = 0;
  particles.length = 0;
  updateHud();
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  startRound();
}

function endGame() {
  state = 'gameover';
  beep(170, 0.22, 0.06);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
  streak = 0;
  updateHud();
}

function inputDir(dir) {
  if (state === 'idle' || state === 'gameover') {
    startGame();
    return;
  }

  if (state !== 'input') {
    beep(220, 0.03, 0.01);
    return;
  }

  const expected = sequence[inputIndex];
  if (dir !== expected) {
    const points = sequenceToPoints(sequence.slice(0, Math.max(1, inputIndex + 1)));
    const last = points[points.length - 1];
    addBurst(last.x, last.y, '#ff7b74', 20);
    endGame();
    return;
  }

  inputIndex += 1;
  beep(560, 0.03, 0.016);

  const nowPoints = sequenceToPoints(sequence.slice(0, inputIndex));
  const p = nowPoints[nowPoints.length - 1];
  addBurst(p.x, p.y, '#7de3ff', 7);

  if (inputIndex >= sequence.length) {
    score += 1;
    streak += 1;
    score += Math.floor(streak / 3);
    updateHud();
    flash = 18;
    roundLength = Math.min(14, roundLength + 1);
    beep(980, 0.08, 0.03);
    startRound();
  }
}

function update() {
  tick += 1;
  if (flash > 0) flash -= 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.life -= 1;
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (state !== 'preview') return;

  previewTimer -= 1;
  if (previewTimer <= 0) {
    previewStep += 1;
    if (previewStep > sequence.length) {
      state = 'input';
      inputIndex = 0;
      beep(700, 0.05, 0.018);
    } else {
      previewTimer = 14;
    }
  }
}

function drawPath(points, color, width = 6) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function render() {
  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 89) % W;
    const y = (i * 41 + tick * 1.0) % H;
    ctx.fillStyle = 'rgba(143, 188, 255, 0.2)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = flash > 0 ? 'rgba(115,255,187,0.14)' : '#13203a';
  ctx.fillRect(36, 120, W - 72, H - 180);

  const fullPoints = sequenceToPoints(sequence);
  const entered = sequenceToPoints(sequence.slice(0, inputIndex));

  if (state === 'preview') {
    const show = Math.min(previewStep, sequence.length);
    const previewPoints = sequenceToPoints(sequence.slice(0, show));
    drawPath(previewPoints, '#7de3ff', 7);
  } else if (state === 'input' || state === 'gameover') {
    drawPath(entered, '#7de3ff', 7);
  }

  const start = fullPoints[0] || { x: W * 0.5, y: START_Y };
  const goal = fullPoints[fullPoints.length - 1] || { x: W * 0.5, y: START_Y - STEP_Y };

  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#b6ffcf';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, 12, 0, Math.PI * 2);
  ctx.stroke();

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 34);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = state === 'input' ? '#ffe2b0' : '#e8effb';
  ctx.textAlign = 'left';
  ctx.font = 'bold 19px system-ui';
  ctx.fillText(`Round Len: ${roundLength}`, 18, 62);

  if (state === 'preview') {
    ctx.fillText('Watch the pattern', 18, 88);
  } else if (state === 'input') {
    ctx.fillText(`Input: ${inputIndex}/${sequence.length}`, 18, 88);
  }

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Wrong Turn', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Remember zigzag, then repeat', W / 2, H / 2 + 20);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') inputDir(-1);
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') inputDir(1);
  if (event.key === ' ') startGame();
});

let lastTapAt = 0;
const swipeState = { active: false, startX: 0, startY: 0 };

canvas.addEventListener('pointerdown', (event) => {
  const now = performance.now();
  if (now - lastTapAt < 140) return;
  lastTapAt = now;

  swipeState.active = true;
  swipeState.startX = event.clientX;
  swipeState.startY = event.clientY;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  inputDir(x < W * 0.5 ? -1 : 1);
});

canvas.addEventListener('pointerup', (event) => {
  if (!swipeState.active) return;
  swipeState.active = false;
  const dx = event.clientX - swipeState.startX;
  const dy = event.clientY - swipeState.startY;
  if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 18) {
    inputDir(dx > 0 ? 1 : -1);
  }
});

btnStart.addEventListener('click', startGame);

resetGame();
loop();
