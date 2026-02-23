const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'drift-one-tap-best';

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let shake = 0;
let pressed = false;

const player = {
  x: W * 0.5,
  y: H * 0.78,
  angle: 0,
};

let trackZ = 0;
let speed = 5.6;
const particles = [];

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

function roadCenter(z) {
  return W * 0.5 + Math.sin(z * 0.017) * 110 + Math.sin(z * 0.051) * 35;
}

function roadHalfWidth(z) {
  return 52 + Math.sin(z * 0.004) * 4;
}

function addSkid(color) {
  particles.push({
    x: player.x,
    y: player.y + 10,
    vx: (Math.random() - 0.5) * 2,
    vy: 1.2 + Math.random() * 2,
    life: 18 + Math.random() * 10,
    color,
  });
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  shake = 0;
  pressed = false;

  player.x = W * 0.5;
  player.angle = 0;

  trackZ = 0;
  speed = 5.6;
  particles.length = 0;

  scoreEl.textContent = '0';
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  shake = 12;
  beep(170, 0.22, 0.06);

  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function update() {
  tick += 1;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (state !== 'running') return;

  const steer = pressed ? 1 : -1;
  player.angle += steer * 0.036;
  player.angle *= 0.94;

  player.x += Math.sin(player.angle) * 4.6;
  trackZ += speed;
  speed = Math.min(9.5, speed + 0.0009);

  const targetX = roadCenter(trackZ + 120);
  const halfW = roadHalfWidth(trackZ + 120);
  const dist = Math.abs(player.x - targetX);

  if (pressed && tick % 4 === 0) addSkid('#7de3ff');
  if (!pressed && tick % 5 === 0) addSkid('#89a9d6');

  if (dist > halfW) {
    endGame();
    return;
  }

  score = Math.floor(trackZ / 10);
  scoreEl.textContent = String(score);

  if (score > 0 && score % 60 === 0 && tick % 10 === 0) {
    beep(640, 0.03, 0.015);
  }
}

function drawRoad() {
  const strips = 80;
  for (let i = strips; i >= 1; i -= 1) {
    const p = i / strips;
    const p0 = (i - 1) / strips;

    const z = trackZ + i * 11;
    const z0 = trackZ + (i - 1) * 11;

    const y = H * 0.18 + Math.pow(p, 1.55) * H * 0.82;
    const y0 = H * 0.18 + Math.pow(p0, 1.55) * H * 0.82;

    const center = roadCenter(z);
    const center0 = roadCenter(z0);

    const hw = roadHalfWidth(z) + p * 168;
    const hw0 = roadHalfWidth(z0) + p0 * 168;

    ctx.fillStyle = i % 2 === 0 ? '#1a263d' : '#152033';
    ctx.beginPath();
    ctx.moveTo(center0 - hw0, y0);
    ctx.lineTo(center0 + hw0, y0);
    ctx.lineTo(center + hw, y);
    ctx.lineTo(center - hw, y);
    ctx.closePath();
    ctx.fill();

    if (i % 8 === 0) {
      ctx.fillStyle = 'rgba(220,230,250,0.8)';
      const markW = Math.max(2, (hw + hw0) * 0.05);
      ctx.beginPath();
      ctx.moveTo(center0 - markW, y0);
      ctx.lineTo(center0 + markW, y0);
      ctx.lineTo(center + markW * 0.8, y);
      ctx.lineTo(center - markW * 0.8, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawCar() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle * 0.85);

  ctx.fillStyle = '#7de3ff';
  ctx.shadowColor = '#7de3ff';
  ctx.shadowBlur = 14;
  ctx.fillRect(-12, -20, 24, 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#0b1322';
  ctx.fillRect(-7, -10, 14, 13);
  ctx.fillStyle = '#ffad66';
  ctx.fillRect(-10, 14, 8, 5);
  ctx.fillRect(2, 14, 8, 5);

  ctx.restore();
}

function render() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    shake *= 0.85;
  }

  ctx.fillStyle = '#081123';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 44; i += 1) {
    const x = (i * 91) % W;
    const y = (i * 47 + tick * 1.2) % H;
    ctx.fillStyle = 'rgba(140,190,255,0.18)';
    ctx.fillRect(x, y, 2, 2);
  }

  drawRoad();

  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  drawCar();

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Drift' : 'Off Road', W / 2, H / 2 - 12);
    ctx.font = '16px system-ui';
    ctx.fillText('Hold to drift right, release to drift left', W / 2, H / 2 + 18);
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
    if (state !== 'running') {
      startGame();
    }
    pressed = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === ' ') pressed = false;
});

canvas.addEventListener('pointerdown', () => {
  if (state !== 'running') {
    startGame();
  }
  pressed = true;
  beep(520, 0.035, 0.015);
});

window.addEventListener('pointerup', () => {
  pressed = false;
});

btnStart.addEventListener('click', startGame);

resetGame();
loop();
