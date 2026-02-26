const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

const itemsEl = document.getElementById('items');
const modeEl = document.getElementById('mode');
const resultEl = document.getElementById('result');
const historyEl = document.getElementById('history');

const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const bestStreakEl = document.getElementById('bestStreak');
const roundEl = document.getElementById('round');

const btnSpin = document.getElementById('btnSpin');
const btnShuffle = document.getElementById('btnShuffle');
const btnReset = document.getElementById('btnReset');
const btnSound = document.getElementById('btnSound');

const BEST_STREAK_KEY = 'party-roulette-best-streak-v2';
const SOUND_KEY = 'party-roulette-sound-v2';

let angle = 0;
let spinSpeed = 0;
let spinning = false;
let score = 0;
let streak = 0;
let bestStreak = Number(localStorage.getItem(BEST_STREAK_KEY) || 0);
let round = 1;
let lastPicked = '';
let history = [];
let pulse = 0;
let tickCooldown = 0;

let parsedItems = [];

bestStreakEl.textContent = String(bestStreak);

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function parseItems() {
  const raw = itemsEl.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 14);

  if (raw.length < 2) {
    raw.push('Safe', 'Shot');
  }

  parsedItems = raw.map((token) => {
    const m = token.match(/^(.*)\*(\d+)$/);
    if (m) {
      return { label: m[1].trim() || 'Item', weight: Math.max(1, Number(m[2])) };
    }
    return { label: token, weight: 1 };
  });

  itemsEl.value = parsedItems.map((i) => (i.weight > 1 ? `${i.label}*${i.weight}` : i.label)).join(', ');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function colorOf(index) {
  const palette = ['#7be4ff', '#ff95cb', '#ffd386', '#9dffbe', '#c1adff', '#a2f1d8', '#ffb79e'];
  return palette[index % palette.length];
}

function createSfx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let enabled = localStorage.getItem(SOUND_KEY) !== 'off';

  function ensure() {
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone({ freq = 440, end = null, type = 'triangle', gain = 0.04, dur = 0.08 }) {
    if (!enabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (end != null) osc.frequency.linearRampToValueAtTime(end, now + dur);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  return {
    ensure,
    toggle() {
      enabled = !enabled;
      localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    tick() {
      tone({ freq: 680, end: 520, dur: 0.03, gain: 0.015, type: 'square' });
    },
    spin() {
      tone({ freq: 320, end: 520, dur: 0.12, gain: 0.04 });
    },
    stop() {
      tone({ freq: 460, end: 880, dur: 0.14, gain: 0.05 });
    },
    bad() {
      tone({ freq: 180, end: 80, dur: 0.15, gain: 0.06, type: 'sawtooth' });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  btnSound.textContent = `사운드: ${sfx.isEnabled() ? '켜짐' : '꺼짐'}`;
}

function updateHud() {
  scoreEl.textContent = String(score);
  streakEl.textContent = String(streak);
  bestStreakEl.textContent = String(bestStreak);
  roundEl.textContent = String(round);
}

function weightedAngles() {
  const totalWeight = parsedItems.reduce((acc, item) => acc + item.weight, 0);
  let cursor = 0;
  return parsedItems.map((item) => {
    const span = (item.weight / totalWeight) * Math.PI * 2;
    const start = cursor;
    const end = cursor + span;
    cursor = end;
    return { start, end, item };
  });
}

function selectedIndexByPointer() {
  const TWO_PI = Math.PI * 2;
  const normalized = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const pointerAngle = (Math.PI * 1.5 - normalized + TWO_PI) % TWO_PI;

  const sectors = weightedAngles();
  for (let i = 0; i < sectors.length; i += 1) {
    if (pointerAngle >= sectors[i].start && pointerAngle < sectors[i].end) return i;
  }
  return sectors.length - 1;
}

function pushHistory(text) {
  history.unshift(text);
  history = history.slice(0, 8);
  historyEl.innerHTML = '';
  history.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    historyEl.appendChild(li);
  });
}

function spinResult(index) {
  const selected = parsedItems[index]?.label || 'Item';
  const mode = modeEl.value;

  let repeated = false;
  if (mode === 'norepeat' && selected === lastPicked && parsedItems.length > 1) {
    repeated = true;
    const alt = (index + 1) % parsedItems.length;
    return spinResult(alt);
  }

  lastPicked = selected;

  let gain = 70 + Math.min(120, streak * 14);
  if (selected.toLowerCase().includes('shot') || selected.toLowerCase().includes('skip')) {
    gain = Math.max(30, gain - 40);
    streak = 0;
    sfx.bad();
  } else {
    streak += 1;
  }

  if (repeated) gain -= 30;

  score += gain;
  round += 1;

  if (streak > bestStreak) {
    bestStreak = streak;
    localStorage.setItem(BEST_STREAK_KEY, String(bestStreak));
  }

  if (mode === 'elimination' && parsedItems.length > 2) {
    parsedItems.splice(index, 1);
    itemsEl.value = parsedItems.map((i) => (i.weight > 1 ? `${i.label}*${i.weight}` : i.label)).join(', ');
    resultEl.textContent = `결과: ${selected} (+${gain}) · 제거전: 항목 제거됨`;

    if (parsedItems.length === 1) {
      score += 250;
      pushHistory(`라운드 ${round}: 제거전 우승 보너스 +250`);
      parsedItems = parseItemsFromInput();
    }
  } else {
    resultEl.textContent = `결과: ${selected} (+${gain})`;
  }

  pushHistory(`라운드 ${round - 1}: ${selected} (+${gain})`);
  pulse = 1;
  updateHud();
}

function parseItemsFromInput() {
  const raw = itemsEl.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 14);

  if (raw.length < 2) {
    return [
      { label: 'Safe', weight: 1 },
      { label: 'Shot', weight: 1 },
      { label: 'Bonus', weight: 1 },
    ];
  }

  return raw.map((token) => {
    const m = token.match(/^(.*)\*(\d+)$/);
    if (m) {
      return { label: m[1].trim() || 'Item', weight: Math.max(1, Number(m[2])) };
    }
    return { label: token, weight: 1 };
  });
}

function resetSession() {
  score = 0;
  streak = 0;
  round = 1;
  history = [];
  lastPicked = '';
  parseItems();
  updateHud();
  historyEl.innerHTML = '';
  resultEl.textContent = '준비 완료';
}

function drawWheel() {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const r = Math.min(cx, cy) - 24;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#17356d');
  bg.addColorStop(1, '#0a1735');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sectors = weightedAngles();
  sectors.forEach((sector, i) => {
    const a0 = angle + sector.start;
    const a1 = angle + sector.end;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = colorOf(i);
    ctx.fill();

    const labelAngle = (a0 + a1) * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(labelAngle);
    ctx.fillStyle = '#12264a';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'right';
    const suffix = sector.item.weight > 1 ? ` x${sector.item.weight}` : '';
    ctx.fillText(`${sector.item.label}${suffix}`, r - 16, 6);
    ctx.restore();
  });

  ctx.fillStyle = '#0f264b';
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d8ebff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - 4);
  ctx.lineTo(cx - 16, cy - r - 30);
  ctx.lineTo(cx + 16, cy - r - 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d8ebff';
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`모드: ${modeEl.options[modeEl.selectedIndex].text}`, cx, 38);

  if (pulse > 0) {
    const alpha = Math.min(0.26, pulse * 0.22);
    ctx.fillStyle = `rgba(157, 255, 190, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pulse = Math.max(0, pulse - 0.03);
  }
}

function update(dt) {
  if (!spinning) return;

  angle += spinSpeed * dt;
  spinSpeed *= 0.986;

  tickCooldown -= dt;
  if (tickCooldown <= 0) {
    sfx.tick();
    tickCooldown = 0.06 + Math.random() * 0.03;
  }

  if (spinSpeed < 0.28) {
    spinSpeed *= 0.976;
  }

  if (spinSpeed < 0.045) {
    spinning = false;
    spinSpeed = 0;
    const idx = selectedIndexByPointer();
    spinResult(idx);
    sfx.stop();
  }
}

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;

  update(dt);
  drawWheel();
  requestAnimationFrame(loop);
}

btnSpin.addEventListener('click', () => {
  if (spinning) return;
  sfx.ensure();
  if (parsedItems.length < 2) parseItems();
  spinning = true;
  spinSpeed = rand(8.8, 12.8);
  tickCooldown = 0;
  resultEl.textContent = '스핀 중...';
  sfx.spin();
});

btnShuffle.addEventListener('click', () => {
  const raw = itemsEl.value.split(',').map((s) => s.trim()).filter(Boolean);
  shuffle(raw);
  itemsEl.value = raw.join(', ');
  parseItems();
  resultEl.textContent = '항목 순서를 섞었습니다';
});

btnReset.addEventListener('click', () => {
  resetSession();
});

btnSound.addEventListener('click', () => {
  sfx.ensure();
  sfx.toggle();
  updateSoundButton();
});

itemsEl.addEventListener('change', () => {
  parseItems();
});

modeEl.addEventListener('change', () => {
  resultEl.textContent = `모드 변경: ${modeEl.options[modeEl.selectedIndex].text}`;
});

parseItems();
updateHud();
updateSoundButton();
requestAnimationFrame(loop);
