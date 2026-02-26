const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const playersEl = document.getElementById('players');
const resultsEl = document.getElementById('results');
const rungsEl = document.getElementById('rungs');
const guessPlayerEl = document.getElementById('guessPlayer');
const guessResultEl = document.getElementById('guessResult');

const btnDraw = document.getElementById('btnDraw');
const btnShuffle = document.getElementById('btnShuffle');
const btnTraceAll = document.getElementById('btnTraceAll');
const btnResetScore = document.getElementById('btnResetScore');

const roundEl = document.getElementById('round');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const bestStreakEl = document.getElementById('bestStreak');

const BEST_STREAK_KEY = 'ladder-draw-best-streak-v2';

const state = {
  players: [],
  results: [],
  rungs: [], // {y, i}
  top: 84,
  bottom: canvas.height - 80,
  left: 60,
  right: canvas.width - 60,
  score: 0,
  round: 1,
  streak: 0,
  bestStreak: Number(localStorage.getItem(BEST_STREAK_KEY) || 0),
  trace: null,
  traceQueue: [],
  message: '생성 후 상단 이름을 클릭하세요',
  pulse: 0,
};

bestStreakEl.textContent = String(state.bestStreak);

function parseList(val) {
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateHud() {
  roundEl.textContent = String(state.round);
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
  bestStreakEl.textContent = String(state.bestStreak);
}

function laneX(index) {
  const cols = state.players.length;
  if (cols <= 1) return canvas.width * 0.5;
  const gap = (state.right - state.left) / (cols - 1);
  return state.left + gap * index;
}

function fillSelectOptions() {
  guessPlayerEl.innerHTML = '';
  guessResultEl.innerHTML = '';

  state.players.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${idx + 1}. ${name}`;
    guessPlayerEl.appendChild(opt);
  });

  state.results.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    guessResultEl.appendChild(opt);
  });
}

function normalizeInput() {
  let players = parseList(playersEl.value).slice(0, 6);
  let results = parseList(resultsEl.value);

  if (players.length < 2) players = ['A', 'B'];

  if (results.length < players.length) {
    while (results.length < players.length) results.push('Safe');
  }
  if (results.length > players.length) results = results.slice(0, players.length);

  playersEl.value = players.join(', ');
  resultsEl.value = results.join(', ');

  state.players = players;
  state.results = results;
}

function createRungs() {
  state.rungs = [];

  const cols = state.players.length;
  const rungCount = clamp(Number(rungsEl.value || 14), 6, 36);
  rungsEl.value = String(rungCount);

  for (let row = 0; row < rungCount; row += 1) {
    const y = state.top + ((state.bottom - state.top) / (rungCount + 1)) * (row + 1);
    const used = new Set();

    for (let i = 0; i < cols - 1; i += 1) {
      if (used.has(i) || used.has(i - 1) || used.has(i + 1)) continue;
      const density = 0.34 + Math.min(0.2, cols * 0.02);
      if (Math.random() < density) {
        state.rungs.push({ y, i });
        used.add(i);
      }
    }
  }

  state.rungs.sort((a, b) => a.y - b.y);
}

function mappingFor(startIdx) {
  let idx = startIdx;
  for (const r of state.rungs) {
    if (r.i === idx) idx += 1;
    else if (r.i === idx - 1) idx -= 1;
  }
  return idx;
}

function pathFor(startIdx) {
  const points = [];
  let idx = startIdx;
  let y = state.top;
  points.push({ x: laneX(idx), y });

  for (const r of state.rungs) {
    if (r.y < y) continue;

    points.push({ x: laneX(idx), y: r.y });

    if (r.i === idx) {
      idx += 1;
      points.push({ x: laneX(idx), y: r.y });
    } else if (r.i === idx - 1) {
      idx -= 1;
      points.push({ x: laneX(idx), y: r.y });
    }

    y = r.y;
  }

  points.push({ x: laneX(idx), y: state.bottom });
  return { points, endIdx: idx };
}

function startTrace(startIdx) {
  if (state.trace) return;

  const path = pathFor(startIdx);
  state.trace = {
    startIdx,
    endIdx: path.endIdx,
    points: path.points,
    seg: 0,
    segT: 0,
    speed: 260,
    done: false,
  };

  state.message = `${state.players[startIdx]} 경로 추적 중...`;
}

function evaluatePrediction(traceObj) {
  const guessedPlayer = Number(guessPlayerEl.value || 0);
  const guessedResult = guessResultEl.value || '';
  const actualResult = state.results[traceObj.endIdx] || '';

  const scoreBase = 60;
  state.score += scoreBase;

  if (traceObj.startIdx === guessedPlayer && guessedResult === actualResult) {
    state.score += 140;
    state.streak += 1;
    state.message = `예측 성공! ${state.players[traceObj.startIdx]} -> ${actualResult} (+200)`;
  } else {
    state.streak = 0;
    state.message = `${state.players[traceObj.startIdx]} -> ${actualResult} (+60)`;
  }

  if (state.streak > state.bestStreak) {
    state.bestStreak = state.streak;
    localStorage.setItem(BEST_STREAK_KEY, String(state.bestStreak));
  }

  state.round += 1;
  state.pulse = 1;
  updateHud();
}

function updateTrace(dt) {
  if (!state.trace) {
    if (state.traceQueue.length > 0) {
      const next = state.traceQueue.shift();
      startTrace(next);
    }
    return;
  }

  const tr = state.trace;
  const a = tr.points[tr.seg];
  const b = tr.points[tr.seg + 1];
  if (!a || !b) {
    tr.done = true;
  } else {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    tr.segT += (tr.speed * dt) / len;

    if (tr.segT >= 1) {
      tr.seg += 1;
      tr.segT = 0;
      if (tr.seg >= tr.points.length - 1) tr.done = true;
    }
  }

  if (tr.done) {
    evaluatePrediction(tr);
    state.trace = null;
  }
}

function regenerate() {
  normalizeInput();
  fillSelectOptions();
  createRungs();
  state.trace = null;
  state.traceQueue = [];
  state.message = '상단 이름을 클릭해 경로를 확인하세요';
}

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, '#17366d');
  grd.addColorStop(1, '#0a1735');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 58; i += 1) {
    const x = (i * 91 + state.round * 17) % canvas.width;
    const y = (i * 47 + state.round * 9) % canvas.height;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(160,210,255,0.15)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawLadder() {
  const cols = state.players.length;

  ctx.strokeStyle = '#7ceeff';
  ctx.lineWidth = 2;
  for (let i = 0; i < cols; i += 1) {
    const x = laneX(i);
    ctx.beginPath();
    ctx.moveTo(x, state.top);
    ctx.lineTo(x, state.bottom);
    ctx.stroke();
  }

  ctx.strokeStyle = '#ffab78';
  ctx.lineWidth = 3;
  for (const r of state.rungs) {
    const x1 = laneX(r.i);
    const x2 = laneX(r.i + 1);
    ctx.beginPath();
    ctx.moveTo(x1, r.y);
    ctx.lineTo(x2, r.y);
    ctx.stroke();
  }
}

function drawLabels() {
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';

  for (let i = 0; i < state.players.length; i += 1) {
    const x = laneX(i);
    const isGuess = Number(guessPlayerEl.value || 0) === i;
    ctx.fillStyle = isGuess ? '#9dffbe' : '#e8f3ff';
    ctx.fillText(state.players[i], x, state.top - 20);

    const map = mappingFor(i);
    const result = state.results[map] || '-';
    ctx.fillStyle = '#ffd8a9';
    ctx.fillText(result, x, state.bottom + 30);
  }
}

function drawTrace() {
  if (!state.trace) return;
  const tr = state.trace;

  ctx.strokeStyle = '#9dffbe';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(tr.points[0].x, tr.points[0].y);

  for (let i = 1; i <= tr.seg; i += 1) {
    ctx.lineTo(tr.points[i].x, tr.points[i].y);
  }

  const a = tr.points[tr.seg];
  const b = tr.points[tr.seg + 1];
  if (a && b) {
    const x = lerp(a.x, b.x, tr.segT);
    const y = lerp(a.y, b.y, tr.segT);
    ctx.lineTo(x, y);

    ctx.stroke();

    ctx.fillStyle = '#9dffbe';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

function drawMessage() {
  ctx.fillStyle = 'rgba(8, 18, 39, 0.36)';
  ctx.fillRect(12, 12, canvas.width - 24, 44);

  ctx.fillStyle = '#d5e9ff';
  ctx.font = '14px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(state.message, 20, 39);

  if (state.pulse > 0) {
    const alpha = Math.min(0.26, state.pulse * 0.22);
    ctx.fillStyle = `rgba(157, 255, 190, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    state.pulse = Math.max(0, state.pulse - 0.03);
  }
}

function render() {
  drawBackground();
  drawLadder();
  drawLabels();
  drawTrace();
  drawMessage();
}

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;

  updateTrace(dt);
  render();
  requestAnimationFrame(loop);
}

function hitTopLabel(x, y) {
  if (y > state.top - 38 && y < state.top - 6) {
    for (let i = 0; i < state.players.length; i += 1) {
      const lx = laneX(i);
      if (Math.abs(x - lx) < 44) return i;
    }
  }
  return -1;
}

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  const idx = hitTopLabel(x, y);
  if (idx >= 0) {
    startTrace(idx);
  }
});

btnDraw.addEventListener('click', regenerate);

btnShuffle.addEventListener('click', () => {
  const p = parseList(playersEl.value);
  const r = parseList(resultsEl.value);
  shuffle(p);
  shuffle(r);
  playersEl.value = p.join(', ');
  resultsEl.value = r.join(', ');
  regenerate();
});

btnTraceAll.addEventListener('click', () => {
  if (state.trace) return;
  state.traceQueue = [];
  for (let i = 0; i < state.players.length; i += 1) {
    state.traceQueue.push(i);
  }
});

btnResetScore.addEventListener('click', () => {
  state.score = 0;
  state.round = 1;
  state.streak = 0;
  state.bestStreak = 0;
  localStorage.setItem(BEST_STREAK_KEY, '0');
  updateHud();
  state.message = '점수가 초기화되었습니다';
});

playersEl.addEventListener('change', regenerate);
resultsEl.addEventListener('change', regenerate);
rungsEl.addEventListener('change', regenerate);

regenerate();
updateHud();
requestAnimationFrame(loop);
