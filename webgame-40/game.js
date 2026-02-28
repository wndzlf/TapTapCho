const hudEl = document.getElementById('hud');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlayEl = document.getElementById('overlay');
const controlsEl = document.getElementById('controls');

const stageTextEl = document.getElementById('stageText');
const baseTextEl = document.getElementById('baseText');
const goldTextEl = document.getElementById('goldText');
const aliveTextEl = document.getElementById('aliveText');
const queueTextEl = document.getElementById('queueText');
const killsTextEl = document.getElementById('killsText');

const btnSunken = document.getElementById('btnSunken');
const btnSpine = document.getElementById('btnSpine');
const btnObelisk = document.getElementById('btnObelisk');

const bgmAudio = window.TapTapNeonAudio?.create('webgame-40', hudEl, { theme: 'rush' });

const W = canvas.width;
const H = canvas.height;
const TAU = Math.PI * 2;

const GRID = {
  cell: 30,
  cols: Math.floor(W / 30),
  rows: Math.floor(H / 30),
};

const SPAWN = { c: 0, r: Math.floor(GRID.rows / 2) };
const GOAL = { c: GRID.cols - 1, r: Math.floor(GRID.rows / 2) };

const TOWER_TYPES = {
  sunken: {
    id: 'sunken',
    name: 'Sunken',
    cost: 40,
    color: '#8dd9ff',
    range: 96,
    damage: 24,
    reload: 0.55,
    bulletSpeed: 360,
    pierce: 0,
  },
  spine: {
    id: 'spine',
    name: 'Spine',
    cost: 70,
    color: '#b9e8ac',
    range: 124,
    damage: 18,
    reload: 0.28,
    bulletSpeed: 420,
    pierce: 0,
  },
  obelisk: {
    id: 'obelisk',
    name: 'Obelisk',
    cost: 110,
    color: '#e2b1ff',
    range: 150,
    damage: 52,
    reload: 1.1,
    bulletSpeed: 330,
    pierce: 1,
  },
};

const state = {
  mode: 'menu',
  stage: 1,
  maxStage: 10,
  baseHp: 20,
  gold: 160,
  kills: 0,
  score: 0,
  selectedTower: 'sunken',
  fastForward: false,
  stageTimer: 0,
  spawnQueue: [],
  spawnTimer: 0,
  enemies: [],
  towers: [],
  bullets: [],
  particles: [],
  blocked: new Set(),
  dist: [],
  banner: { text: '', ttl: 0, warn: false },
};

const sfxCtx = window.AudioContext ? new AudioContext() : null;

function sfx(freq, duration = 0.06, type = 'triangle', gain = 0.02) {
  if (!sfxCtx) return;
  if (sfxCtx.state === 'suspended') sfxCtx.resume();
  const now = sfxCtx.currentTime;
  const osc = sfxCtx.createOscillator();
  const amp = sfxCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(sfxCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function toIndex(c, r) {
  return r * GRID.cols + c;
}

function cellCenter(c, r) {
  return {
    x: c * GRID.cell + GRID.cell * 0.5,
    y: r * GRID.cell + GRID.cell * 0.5,
  };
}

function worldToCell(x, y) {
  return {
    c: Math.floor(x / GRID.cell),
    r: Math.floor(y / GRID.cell),
  };
}

function inBounds(c, r) {
  return c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows;
}

function isReserved(c, r) {
  return (c === SPAWN.c && r === SPAWN.r) || (c === GOAL.c && r === GOAL.r);
}

function keyOf(c, r) {
  return `${c}:${r}`;
}

function getTower(c, r) {
  return state.towers.find((t) => t.c === c && t.r === r);
}

function passable(c, r) {
  if (!inBounds(c, r)) return false;
  if (isReserved(c, r)) return true;
  return !state.blocked.has(keyOf(c, r));
}

function buildDistanceMap() {
  const size = GRID.cols * GRID.rows;
  const dist = Array(size).fill(Infinity);
  const q = new Int32Array(size);
  let head = 0;
  let tail = 0;

  const goalIdx = toIndex(GOAL.c, GOAL.r);
  dist[goalIdx] = 0;
  q[tail++] = goalIdx;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (head < tail) {
    const idx = q[head++];
    const c = idx % GRID.cols;
    const r = Math.floor(idx / GRID.cols);
    const d = dist[idx] + 1;

    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (!passable(nc, nr)) continue;
      const nIdx = toIndex(nc, nr);
      if (dist[nIdx] <= d) continue;
      dist[nIdx] = d;
      q[tail++] = nIdx;
    }
  }

  state.dist = dist;
  return Number.isFinite(dist[toIndex(SPAWN.c, SPAWN.r)]);
}

function neighborStep(c, r) {
  const current = state.dist[toIndex(c, r)];
  let bestC = c;
  let bestR = r;
  let best = current;

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const [dc, dr] of dirs) {
    const nc = c + dc;
    const nr = r + dr;
    if (!passable(nc, nr)) continue;
    const d = state.dist[toIndex(nc, nr)];
    if (d < best) {
      best = d;
      bestC = nc;
      bestR = nr;
    }
  }

  return { c: bestC, r: bestR, valid: Number.isFinite(best) };
}

function flashBanner(text, ttl = 1.2, warn = false) {
  state.banner.text = text;
  state.banner.ttl = ttl;
  state.banner.warn = warn;
}

function makeTower(kind, c, r) {
  const base = TOWER_TYPES[kind];
  const center = cellCenter(c, r);
  return {
    kind,
    c,
    r,
    x: center.x,
    y: center.y,
    level: 1,
    spent: base.cost,
    range: base.range,
    damage: base.damage,
    reload: base.reload,
    bulletSpeed: base.bulletSpeed,
    pierce: base.pierce,
    cooldown: rand(0.02, base.reload),
    color: base.color,
  };
}

function upgradeCost(tower) {
  const base = TOWER_TYPES[tower.kind].cost;
  return Math.floor(base * (0.85 + tower.level * 0.75));
}

function upgradeTower(tower) {
  if (tower.level >= 3) return false;
  const cost = upgradeCost(tower);
  if (state.gold < cost) {
    flashBanner('Gold 부족', 0.9, true);
    return false;
  }

  state.gold -= cost;
  tower.level += 1;
  tower.spent += cost;
  tower.range *= 1.13;
  tower.damage *= 1.34;
  tower.reload *= 0.9;
  tower.pierce = Math.min(3, tower.pierce + (tower.kind === 'obelisk' ? 1 : 0));

  flashBanner(`UPGRADE Lv.${tower.level}`, 0.7);
  sfx(620, 0.07, 'triangle', 0.022);
  return true;
}

function tryPlaceTower(c, r) {
  if (!inBounds(c, r)) return;
  if (isReserved(c, r)) {
    flashBanner('출발/도착 지점은 배치 불가', 0.9, true);
    return;
  }

  const existing = getTower(c, r);
  if (existing) {
    upgradeTower(existing);
    return;
  }

  const type = TOWER_TYPES[state.selectedTower];
  if (state.gold < type.cost) {
    flashBanner('Gold 부족', 0.9, true);
    return;
  }

  const blockedKey = keyOf(c, r);
  state.blocked.add(blockedKey);
  const ok = buildDistanceMap();
  if (!ok) {
    state.blocked.delete(blockedKey);
    buildDistanceMap();
    flashBanner('길이 막혀 배치 불가', 1.1, true);
    sfx(170, 0.08, 'sawtooth', 0.03);
    return;
  }

  const tower = makeTower(state.selectedTower, c, r);
  state.towers.push(tower);
  state.gold -= type.cost;

  for (const enemy of state.enemies) {
    enemy.repath = 0;
  }

  flashBanner(`${type.name} 배치`, 0.7);
  sfx(460, 0.05, 'triangle', 0.018);
}

function sellTower(c, r) {
  const idx = state.towers.findIndex((t) => t.c === c && t.r === r);
  if (idx < 0) return;

  const tower = state.towers[idx];
  const refund = Math.floor(tower.spent * 0.6);
  state.gold += refund;
  state.towers.splice(idx, 1);
  state.blocked.delete(keyOf(c, r));
  buildDistanceMap();
  flashBanner(`SELL +${refund}`, 0.8);
  sfx(340, 0.06, 'triangle', 0.018);
}

function makeEnemy(type) {
  const s = state.stage;
  const stageSpeedMul = 1 + (s - 1) * 0.11;
  const radiusMul = 1 + (s - 1) * 0.015;
  const threatBase = clamp(0.18 + s * 0.07, 0.2, 0.92);
  const typeThreat = {
    ghoul: 0.02,
    bat: 0.06,
    brute: 0.12,
    elder: 0.18,
    lord: 0.3,
  };
  const defs = {
    ghoul: { hp: 58 + s * 12, speed: (38 + s * 1.5) * stageSpeedMul, reward: 7, leak: 1, r: 10, color: '#c54f72' },
    bat: { hp: 36 + s * 8, speed: (62 + s * 2.1) * stageSpeedMul, reward: 6, leak: 1, r: 8, color: '#d07ab4' },
    brute: { hp: 150 + s * 28, speed: (30 + s * 1.2) * stageSpeedMul, reward: 12, leak: 2, r: 13, color: '#9e5a9c' },
    elder: { hp: 262 + s * 46, speed: (40 + s * 1.4) * stageSpeedMul, reward: 25, leak: 3, r: 15, color: '#b86ec8' },
    lord: { hp: 700 + s * 140, speed: (28 + s * 0.9) * stageSpeedMul, reward: 58, leak: 5, r: 18, color: '#f26a84', boss: true },
  };
  const d = defs[type];
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const threat = clamp(threatBase + (typeThreat[type] || 0), 0.2, 1.2);

  return {
    type,
    x: spawn.x + rand(-7, 7),
    y: spawn.y + rand(-7, 7),
    r: d.r * radiusMul,
    hp: d.hp,
    maxHp: d.hp,
    speed: d.speed,
    reward: d.reward,
    leak: d.leak,
    color: d.color,
    boss: Boolean(d.boss),
    targetC: SPAWN.c,
    targetR: SPAWN.r,
    targetX: spawn.x,
    targetY: spawn.y,
    repath: 0,
    vx: 0,
    vy: 0,
    threat,
    morph: rand(0, TAU),
  };
}

function makeStageQueue(stage) {
  const queue = [];
  const baseCount = 18 + stage * 8;

  for (let i = 0; i < baseCount; i += 1) {
    const roll = Math.random();
    let type = 'ghoul';
    if (stage >= 3 && roll < 0.28) type = 'bat';
    if (stage >= 4 && roll < 0.2) type = 'brute';
    if (stage >= 7 && roll < 0.12) type = 'elder';
    queue.push(type);
  }

  const elderCount = 1 + Math.floor(stage / 2);
  for (let i = 0; i < elderCount; i += 1) {
    const pos = Math.floor(queue.length * (0.25 + Math.random() * 0.55));
    queue.splice(pos, 0, 'elder');
  }

  queue.push('lord');
  return queue;
}

function startStage(stage) {
  state.stage = stage;
  state.stageTimer = 1.3;
  state.spawnQueue = makeStageQueue(stage);
  state.spawnTimer = 0.45;
  flashBanner(`STAGE ${stage}`, 1.4);
  bgmAudio?.fx('success');
}

function startRun() {
  state.mode = 'playing';
  state.stage = 1;
  state.baseHp = 20;
  state.gold = 160;
  state.kills = 0;
  state.score = 0;
  state.stageTimer = 0;
  state.spawnQueue = [];
  state.enemies = [];
  state.towers = [];
  state.bullets = [];
  state.particles = [];
  state.blocked.clear();
  state.fastForward = false;
  state.selectedTower = 'sunken';
  setSelectedButton();

  buildDistanceMap();
  startStage(1);

  overlayEl.classList.add('hidden');
  bgmAudio?.unlock();
  sfx(400, 0.09, 'triangle', 0.025);
  refreshHud();
}

function setDefeat() {
  state.mode = 'defeat';
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>수비 실패</h2>
      <p>Stage ${state.stage} · Kills ${state.kills} · Gold ${state.gold}</p>
      <div class="actions">
        <button type="button" data-action="restart">다시 도전</button>
      </div>
    </div>
  `;
  bgmAudio?.fx('fail');
  sfx(170, 0.2, 'sawtooth', 0.05);
}

function setVictory() {
  state.mode = 'victory';
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Stage 10 방어 성공</h2>
      <p>성큰 길막 수비 완료 · Kills ${state.kills} · Base HP ${state.baseHp}</p>
      <div class="actions">
        <button type="button" data-action="restart">새 게임</button>
      </div>
    </div>
  `;
  bgmAudio?.fx('win');
  sfx(520, 0.16, 'triangle', 0.04);
}

function refreshHud() {
  stageTextEl.textContent = String(state.stage);
  baseTextEl.textContent = String(Math.max(0, state.baseHp));
  goldTextEl.textContent = String(Math.floor(state.gold));
  aliveTextEl.textContent = String(state.enemies.length);
  queueTextEl.textContent = String(state.spawnQueue.length);
  killsTextEl.textContent = String(state.kills);
}

function setSelectedButton() {
  for (const btn of controlsEl.querySelectorAll('.build-btn')) {
    btn.classList.toggle('active', btn.dataset.kind === state.selectedTower);
  }
}

function nearestEnemy(x, y, range) {
  let found = null;
  let best = range * range;
  for (const enemy of state.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d = dx * dx + dy * dy;
    if (d <= best) {
      best = d;
      found = enemy;
    }
  }
  return found;
}

function emitBullet(tower, target) {
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const d = Math.hypot(dx, dy) || 1;

  state.bullets.push({
    x: tower.x,
    y: tower.y,
    vx: (dx / d) * tower.bulletSpeed,
    vy: (dy / d) * tower.bulletSpeed,
    r: tower.kind === 'obelisk' ? 5 : 4,
    damage: tower.damage,
    life: 2,
    color: tower.color,
    pierce: tower.pierce,
  });

  for (let i = 0; i < 3; i += 1) {
    state.particles.push({
      x: tower.x,
      y: tower.y,
      vx: rand(-80, 80),
      vy: rand(-80, 80),
      life: rand(0.08, 0.2),
      size: rand(1.8, 3.2),
      color: tower.color,
    });
  }

  if (Math.random() < 0.4) sfx(440 + rand(-30, 40), 0.03, 'square', 0.011);
}

function hurtEnemy(enemy, damage) {
  enemy.hp -= damage;
  enemy.vx += rand(-16, 16);
  enemy.vy += rand(-16, 16);

  for (let i = 0; i < 4; i += 1) {
    state.particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: rand(-100, 100),
      vy: rand(-100, 100),
      life: rand(0.1, 0.26),
      size: rand(1.8, 3.4),
      color: enemy.color,
    });
  }

  if (enemy.hp <= 0) {
    state.gold += enemy.reward;
    state.kills += 1;
    state.score += enemy.reward * 10;
    const idx = state.enemies.indexOf(enemy);
    if (idx >= 0) state.enemies.splice(idx, 1);

    if (enemy.boss) {
      bgmAudio?.fx('win');
      sfx(280, 0.2, 'sawtooth', 0.04);
      flashBanner('BOSS DOWN', 0.9);
    } else if (Math.random() < 0.35) {
      sfx(560, 0.04, 'triangle', 0.013);
    }
  }
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const target = nearestEnemy(tower.x, tower.y, tower.range);
    if (!target) continue;

    emitBullet(tower, target);
    tower.cooldown = tower.reload;
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
      state.bullets.splice(i, 1);
      continue;
    }

    let removed = false;
    for (const enemy of state.enemies) {
      const dx = enemy.x - b.x;
      const dy = enemy.y - b.y;
      const rr = enemy.r + b.r;
      if (dx * dx + dy * dy > rr * rr) continue;

      hurtEnemy(enemy, b.damage);
      if (b.pierce > 0) {
        b.pierce -= 1;
        b.damage *= 0.78;
      } else {
        state.bullets.splice(i, 1);
        removed = true;
      }
      break;
    }

    if (removed) continue;
  }
}

function updateEnemy(enemy, dt) {
  enemy.repath -= dt;

  if (enemy.repath <= 0) {
    const cell = worldToCell(enemy.x, enemy.y);
    enemy.targetC = clamp(cell.c, 0, GRID.cols - 1);
    enemy.targetR = clamp(cell.r, 0, GRID.rows - 1);

    const step = neighborStep(enemy.targetC, enemy.targetR);
    if (step.valid) {
      enemy.targetC = step.c;
      enemy.targetR = step.r;
    }

    const center = cellCenter(enemy.targetC, enemy.targetR);
    enemy.targetX = center.x;
    enemy.targetY = center.y;
    enemy.repath = enemy.boss ? 0.14 : 0.2;
  }

  const dx = enemy.targetX - enemy.x;
  const dy = enemy.targetY - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;

  enemy.vx += nx * enemy.speed * dt * 3.2;
  enemy.vy += ny * enemy.speed * dt * 3.2;
  enemy.vx *= 0.9;
  enemy.vy *= 0.9;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  const goalCenter = cellCenter(GOAL.c, GOAL.r);
  if (Math.hypot(enemy.x - goalCenter.x, enemy.y - goalCenter.y) < GRID.cell * 0.38) {
    state.baseHp -= enemy.leak;
    const idx = state.enemies.indexOf(enemy);
    if (idx >= 0) state.enemies.splice(idx, 1);

    flashBanner(`BASE -${enemy.leak}`, 0.6, true);
    sfx(180, 0.09, 'sawtooth', 0.03);
    if (state.baseHp <= 0) {
      state.baseHp = 0;
      setDefeat();
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of [...state.enemies]) {
    updateEnemy(enemy, dt);
    if (state.mode !== 'playing') return;
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.9;
    p.vy *= 0.9;
  }
}

function spawnOne() {
  const type = state.spawnQueue.shift();
  if (!type) return;
  state.enemies.push(makeEnemy(type));
  if (type === 'lord') {
    flashBanner(`STAGE ${state.stage} BOSS`, 1.2, true);
    bgmAudio?.fx('fail');
  }
}

function updateSpawning(dt) {
  if (state.stageTimer > 0) {
    state.stageTimer -= dt;
    return;
  }

  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    const spawnDelay = Math.max(0.12, 0.45 - state.stage * 0.022);
    while (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
      spawnOne();
      state.spawnTimer += spawnDelay;
    }
  }

  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    if (state.stage >= state.maxStage) {
      setVictory();
      return;
    }

    state.gold += 70 + state.stage * 14;
    startStage(state.stage + 1);
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#161d30');
  grad.addColorStop(1, '#0b101b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const pulse = Math.sin(performance.now() * 0.0012) * 0.5 + 0.5;

  ctx.fillStyle = `rgba(131, 176, 255, ${0.06 + pulse * 0.05})`;
  for (let i = 0; i < 7; i += 1) {
    const x = (i * 170 + performance.now() * 0.015) % (W + 220) - 110;
    const y = ((i * 137 + performance.now() * 0.008) % (H + 180)) - 90;
    ctx.beginPath();
    ctx.arc(x, y, 90 + (i % 3) * 26, 0, TAU);
    ctx.fill();
  }
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(90, 116, 157, 0.22)';
  ctx.lineWidth = 1;

  for (let c = 0; c <= GRID.cols; c += 1) {
    const x = c * GRID.cell + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let r = 0; r <= GRID.rows; r += 1) {
    const y = r * GRID.cell + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawPathPreview() {
  let c = SPAWN.c;
  let r = SPAWN.r;

  ctx.strokeStyle = 'rgba(117, 224, 175, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const start = cellCenter(c, r);
  ctx.moveTo(start.x, start.y);

  for (let i = 0; i < 140; i += 1) {
    if (c === GOAL.c && r === GOAL.r) break;
    const next = neighborStep(c, r);
    if (!next.valid || (next.c === c && next.r === r)) break;
    c = next.c;
    r = next.r;
    const p = cellCenter(c, r);
    ctx.lineTo(p.x, p.y);
  }

  ctx.stroke();
}

function drawEndpoints() {
  const sp = cellCenter(SPAWN.c, SPAWN.r);
  const gp = cellCenter(GOAL.c, GOAL.r);

  ctx.fillStyle = '#7df7be';
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, 11, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#ff8da2';
  ctx.beginPath();
  ctx.arc(gp.x, gp.y, 12, 0, TAU);
  ctx.fill();
}

function drawTowerSunken(tower, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 4 + tower.c * 0.31 + tower.r * 0.17);
  const ringR = 8.4 + tower.level * 1.3;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#131f2d';
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 2.8, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = `rgba(147, 225, 255, ${0.34 + pulse * 0.24})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 1.3, 0, TAU);
  ctx.stroke();

  const vortex = ctx.createRadialGradient(0, 0, 1, 0, 0, ringR);
  vortex.addColorStop(0, '#7ee8ff');
  vortex.addColorStop(0.65, '#3e8ab5');
  vortex.addColorStop(1, '#11273a');
  ctx.fillStyle = vortex;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(196, 242, 255, 0.62)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 2 + tower.level; i += 1) {
    const rot = now * (0.8 + i * 0.22) + i * 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 3.1 + i * 1.6, rot, rot + Math.PI * 0.95);
    ctx.stroke();
  }

  const teeth = 5 + tower.level * 2;
  ctx.fillStyle = 'rgba(198, 246, 255, 0.78)';
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * TAU + now * 0.3;
    const inner = ringR + 0.4;
    const outer = ringR + 4.2 + tower.level * 0.7;
    const spread = 0.09;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - spread) * inner, Math.sin(a - spread) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a + spread) * inner, Math.sin(a + spread) * inner);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawTowerSpine(tower, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 5 + tower.c * 0.27);
  const coreR = 5.8 + tower.level * 0.9;
  const spikes = 4 + tower.level * 2;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#152632';
  ctx.beginPath();
  ctx.arc(0, 0, coreR + 3.1, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#a6eac3';
  for (let i = 0; i < spikes; i += 1) {
    const a = (i / spikes) * TAU + now * 0.2;
    const inner = coreR - 1.2;
    const outer = coreR + 8 + tower.level * 1.2 + pulse * 1.5;
    const spread = 0.12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - spread) * inner, Math.sin(a - spread) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a + spread) * inner, Math.sin(a + spread) * inner);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#6fbe8b';
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, TAU);
  ctx.fill();

  if (tower.level >= 3) {
    ctx.strokeStyle = 'rgba(198, 255, 221, 0.88)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i += 1) {
      const a = now * 0.9 + i * (TAU / 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 2.5, Math.sin(a) * 2.5);
      ctx.lineTo(Math.cos(a) * (coreR + 7), Math.sin(a) * (coreR + 7));
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawTowerObelisk(tower, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 3.2 + tower.r * 0.29);
  const bodyH = 8.5 + tower.level * 1.8;
  const bodyW = 5.2 + tower.level * 0.9;
  const ringR = 9 + tower.level * 1.1;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#1e1a32';
  ctx.fillRect(-7, 5, 14, 6);

  ctx.fillStyle = '#d9b5ff';
  ctx.beginPath();
  ctx.moveTo(0, -bodyH - 2.4);
  ctx.lineTo(bodyW, -2);
  ctx.lineTo(0, bodyH * 0.38);
  ctx.lineTo(-bodyW, -2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(241, 216, 255, ${0.5 + pulse * 0.34})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -bodyH - 1.6);
  ctx.lineTo(bodyW - 0.8, -2);
  ctx.lineTo(0, bodyH * 0.32);
  ctx.lineTo(-bodyW + 0.8, -2);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(206, 164, 255, 0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -1, ringR + pulse * 1.3, 0, TAU);
  ctx.stroke();

  if (tower.level >= 2) {
    const angA = now * 0.85;
    const angB = angA + Math.PI;
    ctx.fillStyle = 'rgba(224, 190, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(Math.cos(angA) * ringR, -1 + Math.sin(angA) * ringR, 2.3, 0, TAU);
    ctx.arc(Math.cos(angB) * ringR, -1 + Math.sin(angB) * ringR, 2.3, 0, TAU);
    ctx.fill();
  }

  if (tower.level >= 3) {
    ctx.strokeStyle = `rgba(236, 208, 255, ${0.6 + pulse * 0.34})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -bodyH - 8);
    ctx.lineTo(0, -bodyH - 22 - pulse * 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTowers() {
  const now = performance.now() * 0.001;

  for (const tower of state.towers) {
    const x = tower.c * GRID.cell + 2;
    const y = tower.r * GRID.cell + 2;
    const w = GRID.cell - 4;
    const h = GRID.cell - 4;

    ctx.fillStyle = '#0f1727';
    ctx.fillRect(x, y, w, h);

    const border = tower.kind === 'sunken'
      ? 'rgba(141, 217, 255, 0.8)'
      : tower.kind === 'spine'
        ? 'rgba(185, 232, 172, 0.8)'
        : 'rgba(226, 177, 255, 0.85)';
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    if (tower.kind === 'sunken') {
      drawTowerSunken(tower, now);
    } else if (tower.kind === 'spine') {
      drawTowerSpine(tower, now);
    } else {
      drawTowerObelisk(tower, now);
    }

    if (tower.level > 1) {
      ctx.fillStyle = '#e8f2ff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`L${tower.level}`, tower.x - 7, tower.y + 18);
    }
  }
}

function drawEnemies() {
  const now = performance.now() * 0.001;
  for (const enemy of state.enemies) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 5 + enemy.morph);
    const auraRadius = enemy.r + 4 + enemy.threat * 6 + pulse * 2.6;
    const spikeCount = 6 + Math.floor(enemy.threat * 8);

    if (enemy.threat >= 0.35) {
      ctx.strokeStyle = enemy.boss
        ? `rgba(255, 154, 178, ${0.25 + pulse * 0.2})`
        : `rgba(195, 140, 255, ${0.2 + pulse * 0.16})`;
      ctx.lineWidth = 2 + enemy.threat;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, auraRadius, 0, TAU);
      ctx.stroke();
    }

    if (enemy.threat >= 0.55) {
      ctx.strokeStyle = enemy.boss ? 'rgba(255, 193, 143, 0.38)' : 'rgba(197, 150, 255, 0.32)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < spikeCount; i += 1) {
        const ang = (i / spikeCount) * TAU + now * (enemy.boss ? 0.8 : 1.3);
        const sx = enemy.x + Math.cos(ang) * (enemy.r + 1);
        const sy = enemy.y + Math.sin(ang) * (enemy.r + 1);
        const ex = enemy.x + Math.cos(ang) * (enemy.r + 4 + enemy.threat * 4);
        const ey = enemy.y + Math.sin(ang) * (enemy.r + 4 + enemy.threat * 4);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#100f19';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 235, 245, 0.72)';
    ctx.beginPath();
    ctx.arc(enemy.x - enemy.r * 0.24, enemy.y - enemy.r * 0.22, 1.4 + enemy.threat * 0.6, 0, TAU);
    ctx.arc(enemy.x + enemy.r * 0.24, enemy.y - enemy.r * 0.22, 1.4 + enemy.threat * 0.6, 0, TAU);
    ctx.fill();

    if (enemy.threat >= 0.74 || enemy.boss) {
      const horn = enemy.r * (enemy.boss ? 0.92 : 0.72);
      ctx.fillStyle = enemy.boss ? 'rgba(255, 208, 145, 0.8)' : 'rgba(228, 187, 255, 0.68)';
      ctx.beginPath();
      ctx.moveTo(enemy.x - enemy.r * 0.44, enemy.y - enemy.r * 0.55);
      ctx.lineTo(enemy.x - enemy.r * 0.14, enemy.y - horn);
      ctx.lineTo(enemy.x + enemy.r * 0.04, enemy.y - enemy.r * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(enemy.x + enemy.r * 0.44, enemy.y - enemy.r * 0.55);
      ctx.lineTo(enemy.x + enemy.r * 0.14, enemy.y - horn);
      ctx.lineTo(enemy.x - enemy.r * 0.04, enemy.y - enemy.r * 0.42);
      ctx.closePath();
      ctx.fill();
    }

    if (state.stage >= 6) {
      ctx.fillStyle = enemy.boss ? 'rgba(255, 150, 174, 0.15)' : 'rgba(215, 136, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(enemy.x - enemy.vx * 0.028, enemy.y - enemy.vy * 0.028, enemy.r * 0.85, 0, TAU);
      ctx.fill();
    }

    const barW = enemy.r * 2;
    const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(enemy.x - barW * 0.5, enemy.y - enemy.r - 10, barW, 4);
    ctx.fillStyle = enemy.boss ? '#ffd183' : '#f7a2bf';
    ctx.fillRect(enemy.x - barW * 0.5, enemy.y - enemy.r - 10, barW * ratio, 4);
  }
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life * 3, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBanner() {
  if (state.banner.ttl <= 0 || !state.banner.text) return;

  const cls = state.banner.warn ? 'banner warn' : 'banner';
  const html = `<div class="${cls}">${state.banner.text}</div>`;

  if (!overlayEl.classList.contains('hidden')) return;

  const current = overlayEl.querySelector('.banner');
  if (!current || current.textContent !== state.banner.text || current.className !== cls) {
    overlayEl.innerHTML = html;
  }

  overlayEl.classList.remove('hidden');
}

function draw() {
  drawBackground();
  drawGrid();
  drawPathPreview();
  drawEndpoints();
  drawTowers();
  drawBullets();
  drawEnemies();
  drawParticles();
}

function step(dt) {
  if (state.mode !== 'playing') {
    draw();
    refreshHud();
    return;
  }

  const simDt = dt * (state.fastForward ? 1.75 : 1);

  state.banner.ttl = Math.max(0, state.banner.ttl - dt);
  if (state.banner.ttl <= 0 && overlayEl.querySelector('.banner')) {
    overlayEl.classList.add('hidden');
    overlayEl.innerHTML = '';
  }

  updateSpawning(simDt);
  updateTowers(simDt);
  updateBullets(simDt);
  updateEnemies(simDt);
  updateParticles(simDt);

  draw();
  drawBanner();
  refreshHud();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  requestAnimationFrame(frame);
}

function chooseTower(kind) {
  if (!TOWER_TYPES[kind]) return;
  state.selectedTower = kind;
  setSelectedButton();
}

controlsEl.addEventListener('click', (event) => {
  const btn = event.target.closest('.build-btn');
  if (!btn) return;
  chooseTower(btn.dataset.kind);
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

canvas.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'playing') return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);
  const cell = worldToCell(x, y);

  if (event.button === 2) {
    sellTower(cell.c, cell.r);
  } else {
    tryPlaceTower(cell.c, cell.r);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Digit1') chooseTower('sunken');
  if (event.code === 'Digit2') chooseTower('spine');
  if (event.code === 'Digit3') chooseTower('obelisk');

  if (event.code === 'KeyF') {
    state.fastForward = !state.fastForward;
    flashBanner(state.fastForward ? 'x1.75' : 'x1.0', 0.6);
  }
});

overlayEl.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'start' || action === 'restart') startRun();
});

function showMenu() {
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Sunken Sixway Defense</h2>
      <p>건물을 배치해 길을 유도하고, 몰려오는 웨이브를 Stage 10까지 막아내세요.</p>
      <div class="actions">
        <button type="button" data-action="start">시작</button>
      </div>
    </div>
  `;
}

showMenu();
setSelectedButton();
buildDistanceMap();
refreshHud();
requestAnimationFrame(frame);
