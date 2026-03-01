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
const btnSnare = document.getElementById('btnSnare');

const bgmAudio = window.TapTapNeonAudio?.create('webgame-40', hudEl, {
  theme: 'rush',
  mediaSrc: '../assets/audio/battleThemeA.mp3',
  showThemeToggle: false,
});

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
    hp: 250,
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
    hp: 190,
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
    hp: 320,
  },
  snare: {
    id: 'snare',
    name: 'Snare',
    cost: 90,
    color: '#9ae8ff',
    range: 132,
    damage: 12,
    reload: 0.72,
    bulletSpeed: 340,
    pierce: 0,
    hp: 210,
    snareDuration: 2.4,
    snareSlow: 0.48,
    weakenMul: 1.42,
  },
};

const state = {
  mode: 'menu',
  stage: 1,
  maxStage: 20,
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
  nextTowerId: 1,
  bullets: [],
  particles: [],
  blocked: new Set(),
  dist: [],
  towerHpBonus: 0,
  siegeDamageBonus: 0,
  pendingStage: 0,
  pendingStageBonusGold: 0,
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
  const hpMul = 1 + state.towerHpBonus;
  return {
    id: state.nextTowerId++,
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
    maxHp: base.hp * hpMul,
    hp: base.hp * hpMul,
    cooldown: rand(0.02, base.reload),
    color: base.color,
    sealTimer: 0,
    snareDuration: base.snareDuration || 0,
    snareSlow: base.snareSlow || 1,
    weakenMul: base.weakenMul || 1,
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
  if (tower.kind === 'snare') {
    tower.snareDuration *= 1.13;
    tower.snareSlow = Math.max(0.32, tower.snareSlow * 0.93);
    tower.weakenMul += 0.09;
    tower.pierce = 0;
  }
  tower.maxHp *= 1.34;
  tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.25);

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
  const tower = getTower(c, r);
  if (!tower) return;
  const refund = Math.floor(tower.spent * 0.6);
  state.gold += refund;
  removeTower(tower);
  flashBanner(`SELL +${refund}`, 0.8);
  sfx(340, 0.06, 'triangle', 0.018);
}

function makeEnemy(type) {
  const s = state.stage;
  const stageIndex = s - 1;
  const lateIndex = Math.max(0, s - 10);
  const stageSpeedMul = 1 + stageIndex * 0.12 + lateIndex * 0.09 + lateIndex * lateIndex * 0.004;
  const stageHpMul = 1 + stageIndex * 0.2 + stageIndex * stageIndex * 0.013 + lateIndex * 0.12;
  const radiusMul = 1 + stageIndex * 0.022;
  const threatBase = clamp(0.18 + s * 0.07, 0.2, 0.92);
  const typeThreat = {
    ghoul: 0.02,
    bat: 0.06,
    brute: 0.12,
    elder: 0.18,
    raider: 0.26,
    crusher: 0.32,
    lord: 0.3,
  };
  const defs = {
    ghoul: { hp: (58 + s * 12) * stageHpMul * 1.0, speed: (36 + s * 1.6) * stageSpeedMul, reward: 7, leak: 1, r: 10, color: '#c54f72' },
    bat: { hp: (36 + s * 8) * stageHpMul * 0.82, speed: (58 + s * 2.4) * stageSpeedMul, reward: 6, leak: 1, r: 8, color: '#d07ab4' },
    brute: { hp: (150 + s * 28) * stageHpMul * 1.18, speed: (29 + s * 1.3) * stageSpeedMul, reward: 12, leak: 2, r: 13, color: '#9e5a9c' },
    elder: { hp: (262 + s * 46) * stageHpMul * 1.32, speed: (37 + s * 1.5) * stageSpeedMul, reward: 25, leak: 3, r: 15, color: '#b86ec8' },
    raider: {
      hp: (120 + s * 24) * stageHpMul * 1.05,
      speed: (42 + s * 1.5) * stageSpeedMul,
      reward: 17,
      leak: 2,
      r: 12,
      color: '#ff9d7f',
      breaker: true,
      towerDamage: 24 + s * 7 + lateIndex * 5,
      attackInterval: 0.95,
      attackRange: 22,
    },
    crusher: {
      hp: (260 + s * 44) * stageHpMul * 1.28,
      speed: (30 + s * 1.1) * stageSpeedMul,
      reward: 28,
      leak: 3,
      r: 15,
      color: '#ffc17c',
      breaker: true,
      towerDamage: 46 + s * 11 + lateIndex * 8,
      attackInterval: 1.28,
      attackRange: 26,
    },
    lord: { hp: (700 + s * 140) * stageHpMul * 1.65, speed: (27 + s) * stageSpeedMul, reward: 58, leak: 5, r: 18, color: '#f26a84', boss: true },
  };
  const d = defs[type];
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const threat = clamp(threatBase + (typeThreat[type] || 0), 0.2, 1.2);
  const leakBonus = s >= 17 ? 4 : s >= 13 ? 3 : s >= 9 ? 2 : s >= 6 ? 1 : 0;
  const leak = d.leak + (d.boss ? leakBonus : Math.floor(leakBonus * 0.5));

  return {
    type,
    x: spawn.x + rand(-7, 7),
    y: spawn.y + rand(-7, 7),
    r: d.r * radiusMul,
    hp: Math.floor(d.hp),
    maxHp: Math.floor(d.hp),
    speed: d.speed,
    reward: d.reward + Math.floor(s * 1.3),
    leak,
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
    breaker: Boolean(d.breaker),
    towerDamage: d.towerDamage || 0,
    attackInterval: Math.max(0.45, (d.attackInterval || 1) - s * 0.008 - lateIndex * 0.012),
    attackRange: d.attackRange || 0,
    attackCd: rand(0.1, 0.6),
    targetTowerId: 0,
    snareTimer: 0,
    snareSlowMul: 1,
    weakenTimer: 0,
    weakenMul: 1,
    sealCd: d.boss ? Math.max(2.8, 6.4 - s * 0.14) : 0,
    sealInterval: d.boss ? Math.max(3.2, 7.1 - s * 0.16) : 0,
    sealDuration: d.boss ? Math.min(6.2, 2.1 + s * 0.14) : 0,
    sealCount: d.boss ? (s >= 15 ? 3 : s >= 8 ? 2 : 1) : 0,
  };
}

function makeStageQueue(stage) {
  const queue = [];
  const lateIndex = Math.max(0, stage - 10);
  const baseCount = 22 + stage * 9 + Math.floor(Math.pow(stage, 1.35) * 3) + lateIndex * 10;

  for (let i = 0; i < baseCount; i += 1) {
    const roll = Math.random();
    let type = 'ghoul';
    const batChance = stage >= 3 ? clamp(0.22 + stage * 0.004, 0.22, 0.34) : 0;
    const bruteChance = stage >= 4 ? clamp(0.14 + stage * 0.01, 0.14, 0.34) : 0;
    const elderChance = stage >= 7 ? clamp(0.08 + (stage - 7) * 0.014, 0.08, 0.32) : 0;
    const raiderChance = stage >= 5 ? clamp(0.1 + (stage - 5) * 0.012, 0.1, 0.3) : 0;
    const crusherChance = stage >= 8 ? clamp(0.06 + (stage - 8) * 0.011, 0.06, 0.24) : 0;

    let threshold = crusherChance;
    if (roll < threshold) type = 'crusher';
    else {
      threshold += elderChance;
      if (roll < threshold) type = 'elder';
      else {
        threshold += raiderChance;
        if (roll < threshold) type = 'raider';
        else {
          threshold += bruteChance;
          if (roll < threshold) type = 'brute';
          else if (roll < threshold + batChance) type = 'bat';
        }
      }
    }
    queue.push(type);
  }

  const elderCount = 1 + Math.floor(stage * 1.0) + Math.floor(lateIndex * 0.8);
  for (let i = 0; i < elderCount; i += 1) {
    const pos = Math.floor(queue.length * (0.25 + Math.random() * 0.55));
    queue.splice(pos, 0, 'elder');
  }

  const bruteCount = Math.max(0, stage - 3) + Math.floor(lateIndex * 1.1);
  for (let i = 0; i < bruteCount; i += 1) {
    const pos = Math.floor(queue.length * (0.2 + Math.random() * 0.6));
    queue.splice(pos, 0, 'brute');
  }

  if (stage >= 8) {
    const surgePos = Math.floor(queue.length * 0.72);
    queue.splice(surgePos, 0, 'elder', 'elder', 'crusher');
  }

  if (stage >= 6) {
    const breakerCount = 1 + Math.floor(stage * 0.62) + Math.floor(lateIndex * 0.7);
    for (let i = 0; i < breakerCount; i += 1) {
      const pos = Math.floor(queue.length * (0.28 + Math.random() * 0.5));
      queue.splice(pos, 0, stage >= 8 && Math.random() < (0.45 + lateIndex * 0.015) ? 'crusher' : 'raider');
    }
  }

  queue.push('lord');
  return queue;
}

function startStage(stage) {
  state.stage = stage;
  state.stageTimer = Math.max(0.2, 1.2 - stage * 0.05 - Math.max(0, stage - 10) * 0.025);
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
  state.nextTowerId = 1;
  state.bullets = [];
  state.particles = [];
  state.blocked.clear();
  state.fastForward = false;
  state.selectedTower = 'sunken';
  state.towerHpBonus = 0;
  state.siegeDamageBonus = 0;
  state.pendingStage = 0;
  state.pendingStageBonusGold = 0;
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
      <h2>Stage ${state.maxStage} 방어 성공</h2>
      <p>성큰 길막 수비 완료 · Kills ${state.kills} · Base HP ${state.baseHp}</p>
      <div class="actions">
        <button type="button" data-action="restart">새 게임</button>
      </div>
    </div>
  `;
  bgmAudio?.fx('win');
  sfx(520, 0.16, 'triangle', 0.04);
}

function showStageReward() {
  const clearGold = 70 + state.stage * 14;
  state.pendingStage = state.stage + 1;
  state.pendingStageBonusGold = clearGold;
  state.gold += clearGold;
  state.mode = 'reward';

  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Stage ${state.stage} 클리어</h2>
      <p>보상 +${clearGold} Gold · 다음 Stage 시작 전 강화 1개 선택</p>
      <div class="reward-grid">
        <button type="button" class="reward-btn" data-action="reward:towerhp">
          <strong>타워 내구 +15%</strong>
          <span>현재 배치 + 이후 배치 모두 내구 증가</span>
        </button>
        <button type="button" class="reward-btn" data-action="reward:siege">
          <strong>공성 대응 +25%</strong>
          <span>공성몹(raider/crusher) 대상 피해 증가</span>
        </button>
        <button type="button" class="reward-btn" data-action="reward:repair">
          <strong>리페어 즉시 복구</strong>
          <span>모든 타워 체력 60% 복구 + Base 2 회복</span>
        </button>
      </div>
    </div>
  `;
}

function applyStageReward(kind) {
  if (state.mode !== 'reward') return;

  if (kind === 'towerhp') {
    state.towerHpBonus += 0.15;
    for (const tower of state.towers) {
      tower.maxHp *= 1.15;
      tower.hp = Math.min(tower.maxHp, tower.hp * 1.15);
    }
    flashBanner('타워 내구 +15%', 0.9);
    sfx(520, 0.07, 'triangle', 0.028);
  } else if (kind === 'siege') {
    state.siegeDamageBonus += 0.25;
    flashBanner('공성 대응 +25%', 0.9);
    sfx(620, 0.07, 'triangle', 0.028);
  } else if (kind === 'repair') {
    for (const tower of state.towers) {
      tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.6);
    }
    state.baseHp = Math.min(20, state.baseHp + 2);
    flashBanner('리페어 완료', 0.9);
    sfx(420, 0.08, 'triangle', 0.03);
  } else {
    return;
  }

  state.mode = 'playing';
  overlayEl.classList.add('hidden');
  overlayEl.innerHTML = '';

  const nextStage = state.pendingStage || state.stage + 1;
  state.pendingStage = 0;
  state.pendingStageBonusGold = 0;
  startStage(nextStage);
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

function nearestEnemyFiltered(x, y, range, predicate) {
  let found = null;
  let best = range * range;
  for (const enemy of state.enemies) {
    if (!predicate(enemy)) continue;
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

function pickTowerTarget(tower) {
  if (tower.kind === 'snare') {
    const unsnared = nearestEnemyFiltered(
      tower.x,
      tower.y,
      tower.range,
      (enemy) => enemy.breaker && enemy.snareTimer <= 0.35
    );
    if (unsnared) return unsnared;
    return nearestEnemyFiltered(tower.x, tower.y, tower.range, (enemy) => enemy.breaker);
  }
  return nearestEnemy(tower.x, tower.y, tower.range);
}

function nearestTower(x, y) {
  let found = null;
  let best = Infinity;
  for (const tower of state.towers) {
    const dx = tower.x - x;
    const dy = tower.y - y;
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      found = tower;
    }
  }
  return found;
}

function castBossSeal(enemy) {
  const candidates = state.towers.filter((tower) => tower.sealTimer <= 0.22);
  if (candidates.length === 0) return false;

  candidates.sort((a, b) => (b.level - a.level) || (b.spent - a.spent));
  const count = Math.min(candidates.length, enemy.sealCount || 1);
  const picked = [];
  const offset = Math.floor(rand(0, candidates.length));

  for (let i = 0; i < count; i += 1) {
    const tower = candidates[(offset + i) % candidates.length];
    if (!tower) continue;
    picked.push(tower);
  }

  for (const tower of picked) {
    tower.sealTimer = Math.max(tower.sealTimer, enemy.sealDuration);
    tower.cooldown = Math.max(tower.cooldown, 0.25);

    for (let i = 0; i < 9; i += 1) {
      state.particles.push({
        x: tower.x + rand(-8, 8),
        y: tower.y + rand(-8, 8),
        vx: rand(-95, 95),
        vy: rand(-120, 40),
        life: rand(0.16, 0.36),
        size: rand(1.8, 3.6),
        color: '#ff92b2',
      });
    }
  }

  flashBanner(`BOSS 봉인 시전 x${picked.length}`, 0.9, true);
  sfx(140, 0.12, 'sawtooth', 0.035);
  return true;
}

function removeTower(tower) {
  const idx = state.towers.indexOf(tower);
  if (idx < 0) return false;
  state.towers.splice(idx, 1);
  state.blocked.delete(keyOf(tower.c, tower.r));
  buildDistanceMap();
  for (const enemy of state.enemies) {
    enemy.repath = 0;
    if (enemy.targetTowerId === tower.id) enemy.targetTowerId = 0;
  }
  return true;
}

function damageTower(tower, amount, sourceEnemy = null) {
  if (!tower) return;
  tower.hp -= amount;
  for (let i = 0; i < 8; i += 1) {
    state.particles.push({
      x: tower.x + rand(-6, 6),
      y: tower.y + rand(-6, 6),
      vx: rand(-120, 120),
      vy: rand(-130, 60),
      life: rand(0.08, 0.22),
      size: rand(1.7, 3.2),
      color: sourceEnemy?.color || '#ffb3c1',
    });
  }
  if (Math.random() < 0.35) sfx(220 + rand(-30, 20), 0.05, 'square', 0.018);
  if (tower.hp > 0) return;

  removeTower(tower);
  flashBanner(`${tower.kind.toUpperCase()} DESTROYED`, 0.9, true);
  sfx(170, 0.12, 'sawtooth', 0.04);
}

function emitBullet(tower, target) {
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const d = Math.hypot(dx, dy) || 1;
  const isSnare = tower.kind === 'snare';

  state.bullets.push({
    x: tower.x,
    y: tower.y,
    vx: (dx / d) * tower.bulletSpeed,
    vy: (dy / d) * tower.bulletSpeed,
    r: tower.kind === 'obelisk' ? 5 : isSnare ? 4.5 : 4,
    damage: tower.damage,
    life: 2,
    color: tower.color,
    pierce: isSnare ? 0 : tower.pierce,
    towerKind: tower.kind,
    snareDuration: tower.snareDuration,
    snareSlow: tower.snareSlow,
    weakenMul: tower.weakenMul,
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
  const weakenDamage = enemy.weakenTimer > 0 ? enemy.weakenMul : 1;
  const siegeDamage = enemy.breaker ? 1 + state.siegeDamageBonus : 1;
  enemy.hp -= damage * weakenDamage * siegeDamage;
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
    tower.sealTimer = Math.max(0, tower.sealTimer - dt);
    if (tower.sealTimer > 0) continue;

    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const target = pickTowerTarget(tower);
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

      if (b.towerKind === 'snare') {
        if (enemy.breaker) {
          enemy.snareTimer = Math.max(enemy.snareTimer, b.snareDuration || 2);
          enemy.snareSlowMul = Math.min(enemy.snareSlowMul, b.snareSlow || 0.55);
          enemy.weakenTimer = Math.max(enemy.weakenTimer, (b.snareDuration || 2) + 0.6);
          enemy.weakenMul = Math.max(enemy.weakenMul, b.weakenMul || 1.25);
          hurtEnemy(enemy, b.damage * 0.55);
          if (Math.random() < 0.28) flashBanner('Snare: 공성몹 둔화/약화', 0.45);
        }
        state.bullets.splice(i, 1);
        removed = true;
      } else {
        hurtEnemy(enemy, b.damage);
        if (b.pierce > 0) {
          b.pierce -= 1;
          b.damage *= 0.78;
        } else {
          state.bullets.splice(i, 1);
          removed = true;
        }
      }
      break;
    }

    if (removed) continue;
  }
}

function updateEnemy(enemy, dt) {
  enemy.repath -= dt;
  enemy.attackCd = Math.max(0, enemy.attackCd - dt);
  enemy.snareTimer = Math.max(0, enemy.snareTimer - dt);
  enemy.weakenTimer = Math.max(0, enemy.weakenTimer - dt);
  enemy.sealCd = Math.max(0, enemy.sealCd - dt);
  if (enemy.snareTimer <= 0) enemy.snareSlowMul = 1;
  if (enemy.weakenTimer <= 0) enemy.weakenMul = 1;

  if (enemy.boss && enemy.sealCd <= 0 && state.towers.length > 0) {
    const casted = castBossSeal(enemy);
    enemy.sealCd = casted
      ? enemy.sealInterval + rand(-0.35, 0.45)
      : 1.2;
  }

  const speed = enemy.speed * (enemy.snareTimer > 0 ? enemy.snareSlowMul : 1);

  if (enemy.breaker && state.towers.length > 0) {
    let targetTower = state.towers.find((t) => t.id === enemy.targetTowerId);
    if (!targetTower) {
      targetTower = nearestTower(enemy.x, enemy.y);
      enemy.targetTowerId = targetTower ? targetTower.id : 0;
    }

    if (targetTower) {
      const tdx = targetTower.x - enemy.x;
      const tdy = targetTower.y - enemy.y;
      const td = Math.hypot(tdx, tdy) || 1;
      const tx = tdx / td;
      const ty = tdy / td;

      if (td <= enemy.attackRange + GRID.cell * 0.28) {
        enemy.vx *= 0.72;
        enemy.vy *= 0.72;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.attackCd <= 0) {
          damageTower(targetTower, enemy.towerDamage, enemy);
          enemy.attackCd = enemy.attackInterval;
          if (Math.random() < 0.5) flashBanner('공성 몹이 건물 공격 중', 0.32, true);
        }
      } else {
        enemy.vx += tx * speed * dt * 3.3;
        enemy.vy += ty * speed * dt * 3.3;
        enemy.vx *= 0.89;
        enemy.vy *= 0.89;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }
      return;
    }
  }

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

  enemy.vx += nx * speed * dt * 3.2;
  enemy.vy += ny * speed * dt * 3.2;
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
    const lateIndex = Math.max(0, state.stage - 10);
    const spawnDelay = Math.max(0.035, 0.4 - state.stage * 0.02 - lateIndex * 0.012);
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

    showStageReward();
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

function drawTowerSnare(tower, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 6.2 + tower.c * 0.21);
  const ringR = 8 + tower.level * 1.1;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = '#132538';
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 2.2, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = `rgba(154, 232, 255, ${0.46 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ringR + pulse * 1.8, 0, TAU);
  ctx.stroke();

  const bands = 4 + tower.level;
  ctx.strokeStyle = 'rgba(176, 242, 255, 0.8)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < bands; i += 1) {
    const a = (i / bands) * TAU + now * 0.45;
    const inner = ringR * 0.28;
    const outer = ringR + 4.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a + 0.34) * outer, Math.sin(a + 0.34) * outer);
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
        : tower.kind === 'obelisk'
          ? 'rgba(226, 177, 255, 0.85)'
          : 'rgba(154, 232, 255, 0.88)';
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    if (tower.kind === 'sunken') {
      drawTowerSunken(tower, now);
    } else if (tower.kind === 'spine') {
      drawTowerSpine(tower, now);
    } else if (tower.kind === 'obelisk') {
      drawTowerObelisk(tower, now);
    } else {
      drawTowerSnare(tower, now);
    }

    const hpRatio = clamp(tower.hp / tower.maxHp, 0, 1);
    if (hpRatio < 0.999) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(tower.x - 11, tower.y - 18, 22, 4);
      ctx.fillStyle = hpRatio > 0.4 ? '#92f0b3' : '#ff8aa5';
      ctx.fillRect(tower.x - 11, tower.y - 18, 22 * hpRatio, 4);
    }

    if (tower.level > 1) {
      ctx.fillStyle = '#e8f2ff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`L${tower.level}`, tower.x - 7, tower.y + 18);
    }

    if (tower.sealTimer > 0) {
      const alpha = 0.2 + Math.min(0.5, tower.sealTimer / 5) * 0.7;
      ctx.fillStyle = `rgba(255, 90, 134, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 11, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 190, 208, ${0.5 + alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tower.x - 7, tower.y - 7);
      ctx.lineTo(tower.x + 7, tower.y + 7);
      ctx.moveTo(tower.x + 7, tower.y - 7);
      ctx.lineTo(tower.x - 7, tower.y + 7);
      ctx.stroke();
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

    if (enemy.breaker) {
      ctx.strokeStyle = 'rgba(255, 230, 180, 0.86)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(enemy.x - enemy.r * 0.55, enemy.y - enemy.r * 0.1);
      ctx.lineTo(enemy.x + enemy.r * 0.55, enemy.y + enemy.r * 0.1);
      ctx.moveTo(enemy.x + enemy.r * 0.28, enemy.y - enemy.r * 0.56);
      ctx.lineTo(enemy.x - enemy.r * 0.2, enemy.y + enemy.r * 0.5);
      ctx.stroke();
    }

    if (enemy.snareTimer > 0) {
      ctx.strokeStyle = 'rgba(155, 241, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 6, 0, TAU);
      ctx.stroke();
    }

    if (enemy.weakenTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 237, 170, 0.82)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(enemy.x - enemy.r * 0.34, enemy.y + enemy.r * 0.24);
      ctx.lineTo(enemy.x, enemy.y + enemy.r * 0.62);
      ctx.lineTo(enemy.x + enemy.r * 0.36, enemy.y + enemy.r * 0.24);
      ctx.stroke();
    }

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
  if (event.code === 'Digit4') chooseTower('snare');

  if (event.code === 'KeyF') {
    state.fastForward = !state.fastForward;
    flashBanner(state.fastForward ? 'x1.75' : 'x1.0', 0.6);
  }
});

overlayEl.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action.startsWith('reward:')) {
    applyStageReward(action.split(':')[1]);
    return;
  }
  if (action === 'start' || action === 'restart') startRun();
});

function showMenu() {
  overlayEl.classList.remove('hidden');
  overlayEl.innerHTML = `
    <div class="modal">
      <h2>Sunken Sixway Defense</h2>
      <p>건물을 배치해 길을 유도하고, 몰려오는 웨이브를 Stage ${state.maxStage}까지 막아내세요.</p>
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
