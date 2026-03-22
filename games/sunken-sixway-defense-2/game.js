const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlayEl = document.getElementById('overlay');

const stageTextEl = document.getElementById('stageText');
const hpTextEl = document.getElementById('hpText');
const goldTextEl = document.getElementById('goldText');
const killTextEl = document.getElementById('killText');
const phasePillEl = document.getElementById('phasePill');
const phaseTimerEl = document.getElementById('phaseTimer');
const hintTextEl = document.getElementById('hintText');

const btnMusic = document.getElementById('btnMusic');
const btnSfx = document.getElementById('btnSfx');
const btnExit = document.getElementById('btnExit');
const btnSellMode = document.getElementById('btnSellMode');

const exitModal = document.getElementById('exitModal');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');

const toss = window.SunkenSixwayDefense2Toss || {
  isAvailable: () => false,
  closeView: async () => false,
  getUserKeyForGame: async () => null,
  setDeviceOrientation: async () => false,
  setIosSwipeGestureEnabled: async () => false,
  safeArea: {
    get: async () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    subscribe: () => () => {},
  },
  events: {
    onBack: () => () => {},
    onHome: () => () => {},
  },
  ads: {
    isAvailable: () => false,
    isLoaded: async () => false,
    load: () => () => {},
    show: () => () => {},
  },
};

toss.ads = toss.ads || {
  isAvailable: () => false,
  isLoaded: async () => false,
  load: () => () => {},
  show: () => () => {},
};

const W = 720;
const H = 1280;
canvas.width = W;
canvas.height = H;

const GRID_CELL = 64;
const GRID = {
  cell: GRID_CELL,
  cols: Math.floor(W / GRID_CELL),
  rows: Math.floor(H / GRID_CELL),
};

const SPAWN = {
  c: Math.floor(GRID.cols / 2),
  r: 0,
};

const GOAL = {
  c: Math.floor(GRID.cols / 2),
  r: GRID.rows - 1,
};

const STORAGE_PREFIX = 'sunken-sixway-defense-2';
const AUDIO_SETTINGS_KEY = `${STORAGE_PREFIX}-audio-v1`;
const DEFAULT_TOSS_REWARDED_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const TOSS_REWARDED_AD_GROUP_ID = window.TapTapChoAds?.sunkenSixway2Rewarded || DEFAULT_TOSS_REWARDED_AD_GROUP_ID;

const TOWER_TYPES = {
  sunken: {
    id: 'sunken',
    name: '기본 선큰',
    cost: 45,
    range: 138,
    damage: 25,
    reload: 0.46,
    bulletSpeed: 500,
    hp: 280,
    color: '#8fd3ff',
  },
  speedSunken: {
    id: 'speedSunken',
    name: '속사 선큰',
    cost: 75,
    range: 152,
    damage: 13,
    reload: 0.24,
    bulletSpeed: 560,
    hp: 205,
    color: '#f4f7ff',
  },
  tankerSunken: {
    id: 'tankerSunken',
    name: '탱커 선큰',
    cost: 95,
    range: 118,
    damage: 11,
    reload: 0.94,
    bulletSpeed: 410,
    hp: 880,
    color: '#8af2b7',
  },
  sunkenSplash: {
    id: 'sunkenSplash',
    name: '광역 선큰',
    cost: 130,
    range: 150,
    damage: 28,
    reload: 0.84,
    bulletSpeed: 440,
    hp: 310,
    color: '#ffc78f',
    splashRadius: 64,
    splashFalloff: 0.48,
  },
  sunkenHammer: {
    id: 'sunkenHammer',
    name: '해머 선큰',
    cost: 120,
    range: 112,
    damage: 43,
    reload: 0.9,
    bulletSpeed: 390,
    hp: 360,
    color: '#ff9696',
    splashRadius: 54,
    splashFalloff: 0.58,
  },
};

const ENEMY_TYPES = {
  scout: {
    hp: 78,
    speed: 132,
    reward: 9,
    leak: 1,
    r: 15,
    color: '#7dc38d',
    tank: 'ghoul',
  },
  runner: {
    hp: 62,
    speed: 186,
    reward: 10,
    leak: 1,
    r: 13,
    color: '#8ac2ff',
    tank: 'raider',
  },
  brute: {
    hp: 180,
    speed: 92,
    reward: 18,
    leak: 2,
    r: 19,
    color: '#e0b388',
    tank: 'brute',
  },
  crusher: {
    hp: 268,
    speed: 84,
    reward: 23,
    leak: 2,
    r: 22,
    color: '#d5976a',
    tank: 'crusher',
  },
  lord: {
    hp: 1200,
    speed: 74,
    reward: 130,
    leak: 5,
    r: 30,
    color: '#f4c582',
    tank: 'lord',
    boss: true,
  },
};

const ENEMY_TANK_SOURCES = {
  ghoul: '../assets/kenney_tanks/png/tanks_tankGreen1.png',
  raider: '../assets/kenney_tanks/png/tanks_tankGrey4.png',
  brute: '../assets/kenney_tanks/png/tanks_tankDesert2.png',
  crusher: '../assets/kenney_tanks/png/tanks_tankDesert5.png',
  lord: '../assets/kenney_tanks/png/tanks_tankNavy5.png',
};

const ENEMY_TANK_IMAGES = Object.create(null);

const audioSettings = {
  bgmEnabled: true,
  sfxEnabled: true,
};

let bgmAudio = null;

const sfxCtx = window.AudioContext ? new AudioContext() : null;

function tone(freq, duration = 0.05, type = 'triangle', gainValue = 0.018) {
  if (!audioSettings.sfxEnabled) return;
  if (!sfxCtx) return;
  const osc = sfxCtx.createOscillator();
  const gain = sfxCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(sfxCtx.destination);
  const now = sfxCtx.currentTime;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore local storage errors.
  }
}

function loadAudioSettings() {
  const raw = safeLocalStorageGet(AUDIO_SETTINGS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    audioSettings.bgmEnabled = parsed.bgmEnabled !== false;
    audioSettings.sfxEnabled = parsed.sfxEnabled !== false;
  } catch (error) {
    audioSettings.bgmEnabled = true;
    audioSettings.sfxEnabled = true;
  }
}

function saveAudioSettings() {
  safeLocalStorageSet(AUDIO_SETTINGS_KEY, JSON.stringify(audioSettings));
}

function syncAudioButtons() {
  btnMusic.textContent = audioSettings.bgmEnabled ? 'BGM' : 'BGM OFF';
  btnMusic.setAttribute('aria-pressed', String(audioSettings.bgmEnabled));
  btnSfx.textContent = audioSettings.sfxEnabled ? 'FX' : 'FX OFF';
  btnSfx.setAttribute('aria-pressed', String(audioSettings.sfxEnabled));
}

function syncAudioRuntime() {
  if (!bgmAudio) return;
  bgmAudio.setBgmEnabled(audioSettings.bgmEnabled);
  bgmAudio.setSfxEnabled(audioSettings.sfxEnabled);
}

function initializeAudioSystem() {
  loadAudioSettings();
  bgmAudio = window.TapTapNeonAudio?.create('webgame-40-v2', null, {
    theme: 'rush',
    mediaSrc: '../assets/audio/battleThemeA.mp3',
    showThemeToggle: false,
    showSfxToggle: false,
  }) || null;
  syncAudioButtons();
  syncAudioRuntime();
}

function makeKindPerk() {
  return {
    damageMul: 1,
    reloadMul: 1,
    rangeMul: 1,
    hpMul: 1,
    splashMul: 1,
  };
}

function createDefaultPerks() {
  return {
    globalDamageMul: 1,
    globalReloadMul: 1,
    globalRangeMul: 1,
    globalHpMul: 1,
    startGoldAdd: 0,
    killGoldAdd: 0,
    buildDurationAdd: 0,
    baseMaxHpAdd: 0,
    byKind: {
      sunken: makeKindPerk(),
      speedSunken: makeKindPerk(),
      tankerSunken: makeKindPerk(),
      sunkenSplash: makeKindPerk(),
      sunkenHammer: makeKindPerk(),
    },
  };
}

const state = {
  mode: 'menu', // menu | running | card | defeat
  phase: 'build', // build | fight | card
  stage: 1,
  maxHp: 24,
  hp: 24,
  gold: 180,
  kills: 0,
  runTime: 0,
  selectedTower: 'sunken',
  sellMode: false,
  buildTimer: 8,
  spawnQueue: [],
  spawnTimer: 0,
  enemies: [],
  towers: [],
  bullets: [],
  particles: [],
  blocked: new Set(),
  dist: [],
  nextTowerId: 1,
  nextEnemyId: 1,
  selectedCellFx: null,
  perks: createDefaultPerks(),
  pendingCards: [],
  rewardedContinueUsed: false,
  ad: {
    supported: false,
    status: 'hidden', // hidden | loading | ready | showing | failed
    loadCleanup: () => {},
    showCleanup: () => {},
    rewardGranted: false,
    retryTimer: 0,
  },
};

let backgroundLayer = null;
let rafId = 0;
let lastAt = performance.now();
let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};
let backgroundPaused = false;

function toIndex(c, r) {
  return r * GRID.cols + c;
}

function keyOf(c, r) {
  return `${c}:${r}`;
}

function inBounds(c, r) {
  return c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows;
}

function isReserved(c, r) {
  return (c === SPAWN.c && r === SPAWN.r) || (c === GOAL.c && r === GOAL.r);
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

function getTowerAt(c, r) {
  return state.towers.find((tower) => tower.c === c && tower.r === r);
}

function applySafeAreaInsets({ top = 0, right = 0, bottom = 0, left = 0 }) {
  document.documentElement.style.setProperty('--safe-top', `${Math.max(0, Number(top) || 0)}px`);
  document.documentElement.style.setProperty('--safe-right', `${Math.max(0, Number(right) || 0)}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${Math.max(0, Number(bottom) || 0)}px`);
  document.documentElement.style.setProperty('--safe-left', `${Math.max(0, Number(left) || 0)}px`);
}

function rebuildBlocked() {
  state.blocked.clear();
  for (const tower of state.towers) {
    state.blocked.add(keyOf(tower.c, tower.r));
  }
}

function passable(c, r) {
  if (!inBounds(c, r)) return false;
  if (isReserved(c, r)) return true;
  return !state.blocked.has(keyOf(c, r));
}

function buildDistanceMap() {
  const size = GRID.cols * GRID.rows;
  const dist = new Array(size).fill(Infinity);
  const q = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const goalIdx = toIndex(GOAL.c, GOAL.r);
  dist[goalIdx] = 0;
  q[tail++] = goalIdx;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (head < tail) {
    const idx = q[head++];
    const c = idx % GRID.cols;
    const r = Math.floor(idx / GRID.cols);
    const nextD = dist[idx] + 1;
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (!passable(nc, nr)) continue;
      const nIdx = toIndex(nc, nr);
      if (dist[nIdx] <= nextD) continue;
      dist[nIdx] = nextD;
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
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

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

  return {
    c: bestC,
    r: bestR,
    valid: Number.isFinite(best),
  };
}

function canPlaceTower(c, r) {
  if (!inBounds(c, r)) return false;
  if (isReserved(c, r)) return false;
  if (getTowerAt(c, r)) return false;

  state.blocked.add(keyOf(c, r));
  const ok = buildDistanceMap();
  state.blocked.delete(keyOf(c, r));
  buildDistanceMap();
  return ok;
}

function makeTower(kind, c, r) {
  const base = TOWER_TYPES[kind];
  const perks = state.perks.byKind[kind] || makeKindPerk();
  const center = cellCenter(c, r);
  const damage = base.damage * state.perks.globalDamageMul * perks.damageMul;
  const reload = base.reload * state.perks.globalReloadMul * perks.reloadMul;
  const range = base.range * state.perks.globalRangeMul * perks.rangeMul;
  const hp = base.hp * state.perks.globalHpMul * perks.hpMul;

  return {
    id: state.nextTowerId++,
    kind,
    c,
    r,
    x: center.x,
    y: center.y,
    level: 1,
    spent: base.cost,
    baseCost: base.cost,
    range,
    damage,
    reload,
    bulletSpeed: base.bulletSpeed,
    splashRadius: (base.splashRadius || 0) * perks.splashMul,
    splashFalloff: base.splashFalloff || 0.5,
    maxHp: hp,
    hp,
    cooldown: rand(0.04, reload),
    color: base.color,
  };
}

function towerUpgradeCost(tower) {
  return Math.floor(tower.baseCost * (0.95 + tower.level * 0.9));
}

function upgradeTower(tower) {
  const cost = towerUpgradeCost(tower);
  if (state.gold < cost) {
    tone(180, 0.06, 'sawtooth', 0.022);
    return false;
  }

  state.gold -= cost;
  tower.spent += cost;
  tower.level += 1;
  tower.damage *= tower.kind === 'speedSunken' ? 1.12 : tower.kind === 'sunkenHammer' ? 1.28 : 1.2;
  tower.reload *= tower.kind === 'speedSunken' ? 0.84 : 0.9;
  tower.range *= tower.kind === 'sunkenHammer' ? 1.03 : 1.05;
  tower.maxHp *= tower.kind === 'tankerSunken' ? 1.35 : 1.26;
  tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * 0.25);
  if (tower.splashRadius > 0) {
    tower.splashRadius *= 1.1;
  }

  tone(430, 0.05, 'triangle', 0.018);
  return true;
}

function sellTower(tower) {
  const idx = state.towers.indexOf(tower);
  if (idx < 0) return false;
  state.towers.splice(idx, 1);
  const refund = Math.floor(tower.spent * 0.65);
  state.gold += refund;
  rebuildBlocked();
  buildDistanceMap();
  tone(240, 0.05, 'triangle', 0.016);
  return true;
}

function placeTower(c, r) {
  const kind = state.selectedTower;
  const spec = TOWER_TYPES[kind];
  if (!spec) return false;
  if (state.gold < spec.cost) {
    tone(170, 0.06, 'sawtooth', 0.023);
    return false;
  }
  if (!canPlaceTower(c, r)) {
    tone(190, 0.06, 'sawtooth', 0.023);
    return false;
  }

  const tower = makeTower(kind, c, r);
  state.gold -= spec.cost;
  state.towers.push(tower);
  rebuildBlocked();
  buildDistanceMap();
  tone(360, 0.05, 'triangle', 0.017);
  return true;
}

function makeEnemy(type) {
  const base = ENEMY_TYPES[type];
  const stageFactor = 1 + (state.stage - 1) * 0.14;
  const bossBoost = base.boss ? 1 + Math.floor(state.stage / 5) * 0.18 : 1;
  const hp = Math.floor(base.hp * stageFactor * bossBoost);
  const speed = base.speed * (1 + (state.stage - 1) * (base.boss ? 0.004 : 0.007));
  const spawn = cellCenter(SPAWN.c, SPAWN.r);

  return {
    id: state.nextEnemyId++,
    type,
    x: spawn.x + rand(-GRID.cell * 0.36, GRID.cell * 0.36),
    y: -rand(24, 108),
    r: base.r,
    hp,
    maxHp: hp,
    speed,
    reward: Math.floor(base.reward * (1 + (state.stage - 1) * 0.08)),
    leak: base.leak,
    color: base.color,
    tank: base.tank,
    boss: Boolean(base.boss),
    targetC: SPAWN.c,
    targetR: SPAWN.r,
    targetX: spawn.x,
    targetY: spawn.y,
    repath: 0,
    vx: 0,
    vy: 1,
    stunTimer: 0,
  };
}

function makeStageQueue(stage) {
  const queue = [];
  const count = 14 + stage * 4;

  for (let i = 0; i < count; i += 1) {
    const roll = Math.random();
    let type = 'scout';
    if (roll > 0.78) type = 'runner';
    if (stage >= 3 && roll > 0.9) type = 'brute';
    if (stage >= 6 && roll > 0.965) type = 'crusher';
    queue.push(type);
  }

  if (stage >= 4) {
    queue.splice(Math.floor(queue.length * 0.55), 0, 'runner', 'runner');
  }
  if (stage >= 8) {
    queue.splice(Math.floor(queue.length * 0.7), 0, 'brute', 'crusher');
  }

  if (stage % 5 === 0) {
    queue.push('lord');
  }

  return queue;
}

function spawnOne() {
  const type = state.spawnQueue.shift();
  if (!type) return;
  const enemy = makeEnemy(type);
  state.enemies.push(enemy);
}

function removeEnemy(enemy) {
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) {
    state.enemies.splice(idx, 1);
  }
}

function damageEnemy(enemy, damage) {
  enemy.hp -= damage;
  if (enemy.hp > 0) return false;
  removeEnemy(enemy);
  state.kills += 1;
  state.gold += enemy.reward + state.perks.killGoldAdd;
  tone(enemy.boss ? 560 : 490, 0.04, 'triangle', 0.015);
  return true;
}

function findTargetsForSplash(centerX, centerY, radius) {
  const found = [];
  const rr = radius * radius;
  for (const enemy of state.enemies) {
    const dx = enemy.x - centerX;
    const dy = enemy.y - centerY;
    if ((dx * dx + dy * dy) <= rr) {
      found.push(enemy);
    }
  }
  return found;
}

function shootTower(tower, target) {
  const baseAngle = Math.atan2(target.y - tower.y, target.x - tower.x);
  const spreadShots = tower.kind === 'sunkenSplash' ? 1 : tower.kind === 'speedSunken' ? 1 : 1;

  for (let i = 0; i < spreadShots; i += 1) {
    const angle = baseAngle + (spreadShots > 1 ? (i - (spreadShots - 1) * 0.5) * 0.08 : 0);
    const vx = Math.cos(angle) * tower.bulletSpeed;
    const vy = Math.sin(angle) * tower.bulletSpeed;

    state.bullets.push({
      x: tower.x,
      y: tower.y,
      vx,
      vy,
      r: tower.kind === 'sunkenHammer' ? 7 : 5,
      damage: tower.damage,
      ttl: 1.7,
      splashRadius: tower.splashRadius || 0,
      splashFalloff: tower.splashFalloff || 0.5,
      color: tower.color,
    });
  }

  tone(620 - Math.min(360, tower.level * 24), 0.028, 'triangle', 0.01);
}

function findClosestEnemy(x, y, range) {
  const rr = range * range;
  let picked = null;
  let best = rr;
  for (const enemy of state.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > best) continue;
    picked = enemy;
    best = d2;
  }
  return picked;
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const target = findClosestEnemy(tower.x, tower.y, tower.range);
    if (!target) {
      tower.cooldown = Math.min(0.22, tower.reload * 0.45);
      continue;
    }
    shootTower(tower, target);
    tower.cooldown = tower.reload;
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.ttl -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    if (
      bullet.ttl <= 0
      || bullet.x < -24
      || bullet.y < -24
      || bullet.x > W + 24
      || bullet.y > H + 24
    ) {
      state.bullets.splice(i, 1);
      continue;
    }

    let hit = null;
    for (const enemy of state.enemies) {
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const rr = enemy.r + bullet.r;
      if ((dx * dx + dy * dy) <= rr * rr) {
        hit = enemy;
        break;
      }
    }

    if (!hit) continue;

    if (bullet.splashRadius > 0) {
      const victims = findTargetsForSplash(hit.x, hit.y, bullet.splashRadius);
      for (const enemy of victims) {
        const dx = enemy.x - hit.x;
        const dy = enemy.y - hit.y;
        const dist = Math.hypot(dx, dy);
        const ratio = clamp(1 - (dist / Math.max(1, bullet.splashRadius)), 0.2, 1);
        const splashDamage = bullet.damage * (bullet.splashFalloff + (1 - bullet.splashFalloff) * ratio);
        damageEnemy(enemy, splashDamage);
      }
    } else {
      damageEnemy(hit, bullet.damage);
    }

    state.bullets.splice(i, 1);
  }
}

function updateEnemies(dt) {
  const goalCenter = cellCenter(GOAL.c, GOAL.r);

  for (const enemy of [...state.enemies]) {
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= dt;
      continue;
    }

    enemy.repath -= dt;
    const cell = worldToCell(enemy.x, enemy.y);

    if (!inBounds(cell.c, cell.r)) {
      const spawn = cellCenter(SPAWN.c, SPAWN.r);
      enemy.targetX = spawn.x;
      enemy.targetY = spawn.y;
    } else if (enemy.repath <= 0) {
      const next = neighborStep(cell.c, cell.r);
      enemy.repath = 0.12;
      if (next.valid) {
        enemy.targetC = next.c;
        enemy.targetR = next.r;
        const center = cellCenter(next.c, next.r);
        enemy.targetX = center.x;
        enemy.targetY = center.y;
      }
    }

    const dx = enemy.targetX - enemy.x;
    const dy = enemy.targetY - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(dist, enemy.speed * dt);
    const nx = dx / dist;
    const ny = dy / dist;

    enemy.vx = nx;
    enemy.vy = ny;
    enemy.x += nx * step;
    enemy.y += ny * step;

    const gd = Math.hypot(enemy.x - goalCenter.x, enemy.y - goalCenter.y);
    if (gd <= enemy.r + GRID.cell * 0.26) {
      state.hp -= enemy.leak;
      removeEnemy(enemy);
      tone(160, 0.08, 'sawtooth', 0.028);
      if (state.hp <= 0) {
        state.hp = 0;
        setDefeat();
        return;
      }
    }
  }
}

function updateSpawning(dt) {
  if (state.spawnQueue.length <= 0) return;
  state.spawnTimer -= dt;
  const spawnDelay = clamp(0.54 - state.stage * 0.015, 0.14, 0.54);

  while (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
    spawnOne();
    state.spawnTimer += spawnDelay;
  }
}

function makeCardPool() {
  return [
    {
      id: 'global-dmg',
      title: '전체 화력 +12%',
      desc: '모든 선큰 공격력 증가',
      apply: () => {
        state.perks.globalDamageMul *= 1.12;
      },
    },
    {
      id: 'global-reload',
      title: '전체 연사 +10%',
      desc: '모든 선큰 재장전 단축',
      apply: () => {
        state.perks.globalReloadMul *= 0.9;
      },
    },
    {
      id: 'global-range',
      title: '사거리 +8%',
      desc: '모든 선큰 사거리 증가',
      apply: () => {
        state.perks.globalRangeMul *= 1.08;
      },
    },
    {
      id: 'sunken-core',
      title: '기본 선큰 강화',
      desc: '기본 선큰 공격 +20%',
      apply: () => {
        state.perks.byKind.sunken.damageMul *= 1.2;
      },
    },
    {
      id: 'speed-core',
      title: '속사 선큰 강화',
      desc: '속사 선큰 연사 +18%',
      apply: () => {
        state.perks.byKind.speedSunken.reloadMul *= 0.82;
      },
    },
    {
      id: 'tank-core',
      title: '탱커 선큰 강화',
      desc: '탱커 체력 +28%',
      apply: () => {
        state.perks.byKind.tankerSunken.hpMul *= 1.28;
      },
    },
    {
      id: 'splash-core',
      title: '광역 선큰 강화',
      desc: '광역 반경 +22%',
      apply: () => {
        state.perks.byKind.sunkenSplash.splashMul *= 1.22;
      },
    },
    {
      id: 'hammer-core',
      title: '해머 선큰 강화',
      desc: '해머 공격 +24%',
      apply: () => {
        state.perks.byKind.sunkenHammer.damageMul *= 1.24;
      },
    },
    {
      id: 'base-up',
      title: '황제 수호 +3',
      desc: '최대/현재 HP 증가',
      apply: () => {
        state.maxHp += 3;
        state.hp = Math.min(state.maxHp, state.hp + 3);
      },
    },
    {
      id: 'start-gold',
      title: '보급금 +60',
      desc: '즉시 +60 골드',
      apply: () => {
        state.gold += 60;
      },
    },
    {
      id: 'kill-gold',
      title: '현상금 +2',
      desc: '적 처치 골드 증가',
      apply: () => {
        state.perks.killGoldAdd += 2;
      },
    },
    {
      id: 'build-time',
      title: '배치 턴 +1초',
      desc: '매 스테이지 배치 시간 증가',
      apply: () => {
        state.perks.buildDurationAdd += 1;
      },
    },
  ];
}

function pickCards(count = 3) {
  const pool = makeCardPool();
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function showOverlay(html) {
  overlayEl.innerHTML = html;
  overlayEl.classList.remove('hidden');
}

function hideOverlay() {
  overlayEl.innerHTML = '';
  overlayEl.classList.add('hidden');
}

function showMenuOverlay() {
  showOverlay(`
    <div class="panel">
      <h1>선큰 식스웨이 디펜스 2</h1>
      <p>바로 시작해서 자동 전투, 배치 턴에서 전략만 선택하세요.</p>
      <div class="panel-actions">
        <button class="panel-btn" data-action="start">게임 시작</button>
        <button class="panel-btn subtle" data-action="tutorial">바로 플레이</button>
      </div>
    </div>
  `);
}

function renderDefeatOverlay() {
  const showReward = state.ad.supported && !state.rewardedContinueUsed;
  const rewardDisabled = state.ad.status !== 'ready';

  let rewardLabel = '광고 로딩 중';
  if (state.ad.status === 'ready') rewardLabel = '광고 보고 부활';
  if (state.ad.status === 'showing') rewardLabel = '광고 재생 중';
  if (state.ad.status === 'failed') rewardLabel = '광고 재시도 중';
  if (state.rewardedContinueUsed) rewardLabel = '이번 판 사용 완료';

  showOverlay(`
    <div class="panel">
      <h2>방어 실패</h2>
      <p>스테이지 ${state.stage} · 처치 ${state.kills}</p>
      <div class="panel-actions">
        <button class="panel-btn" data-action="restart">다시 시작</button>
        ${showReward ? `<button class="panel-btn reward" data-action="reward-continue" ${rewardDisabled ? 'disabled' : ''}>${rewardLabel}</button>` : ''}
      </div>
    </div>
  `);
}

function showCardOverlay(rewardGold) {
  const cards = state.pendingCards;
  const cardButtons = cards.map((card, idx) => (
    `<button class="card-btn" data-action="pick-card" data-card-index="${idx}">
      <b>${card.title}</b>
      <span>${card.desc}</span>
    </button>`
  )).join('');

  showOverlay(`
    <div class="panel">
      <h2>스테이지 ${state.stage} 클리어</h2>
      <p>보상 +${rewardGold} 골드 · 카드 1장 선택</p>
      <div class="card-grid">${cardButtons}</div>
    </div>
  `);
}

function refreshHud() {
  stageTextEl.textContent = String(state.stage);
  hpTextEl.textContent = `${Math.max(0, Math.floor(state.hp))}/${Math.max(1, Math.floor(state.maxHp))}`;
  goldTextEl.textContent = String(Math.max(0, Math.floor(state.gold)));
  killTextEl.textContent = String(state.kills);

  if (state.mode !== 'running') {
    phasePillEl.textContent = '대기';
    phasePillEl.classList.remove('fight');
    phaseTimerEl.textContent = '--';
  } else if (state.phase === 'build') {
    phasePillEl.textContent = '배치 턴';
    phasePillEl.classList.remove('fight');
    phaseTimerEl.textContent = state.buildTimer.toFixed(1);
  } else {
    phasePillEl.textContent = '전투 중';
    phasePillEl.classList.add('fight');
    phaseTimerEl.textContent = String(state.spawnQueue.length + state.enemies.length);
  }
}

function refreshBuildButtons() {
  for (const btn of document.querySelectorAll('.build-btn[data-kind]')) {
    btn.classList.toggle('active', btn.dataset.kind === state.selectedTower);
  }
  if (!btnSellMode) return;
  btnSellMode.classList.toggle('active', state.sellMode);
  const cost = btnSellMode.querySelector('.cost');
  if (cost) cost.textContent = state.sellMode ? 'ON' : 'OFF';
}

function resetRunState() {
  state.perks = createDefaultPerks();
  state.mode = 'running';
  state.phase = 'build';
  state.stage = 1;
  state.maxHp = 24 + state.perks.baseMaxHpAdd;
  state.hp = state.maxHp;
  state.gold = 180 + state.perks.startGoldAdd;
  state.kills = 0;
  state.runTime = 0;
  state.sellMode = false;
  state.selectedTower = 'sunken';
  state.enemies = [];
  state.towers = [];
  state.bullets = [];
  state.particles = [];
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.blocked.clear();
  state.dist = [];
  state.nextTowerId = 1;
  state.nextEnemyId = 1;
  state.selectedCellFx = null;
  state.pendingCards = [];
  state.rewardedContinueUsed = false;
  hideOverlay();
  refreshBuildButtons();
  refreshHud();
}

function startStage(stage) {
  state.stage = stage;
  state.mode = 'running';
  state.phase = 'build';
  state.buildTimer = clamp(8 + state.perks.buildDurationAdd, 4.5, 16);
  state.spawnQueue = makeStageQueue(stage);
  state.spawnTimer = 0.56;
  state.enemies = [];
  state.bullets = [];
  state.selectedCellFx = null;
  rebuildBlocked();
  buildDistanceMap();
  hintTextEl.textContent = '배치 턴: 타워 설치/강화/판매';
  tone(390, 0.06, 'triangle', 0.02);
}

function startRun() {
  resetRunState();
  buildDistanceMap();
  bgmAudio?.unlock();
  startStage(1);
}

function stageClear() {
  const rewardGold = Math.floor((80 + state.stage * 18) * (1 + state.stage * 0.01));
  state.gold += rewardGold;
  state.mode = 'card';
  state.phase = 'card';
  state.pendingCards = pickCards(3);
  showCardOverlay(rewardGold);
  tone(620, 0.08, 'triangle', 0.022);
}

function applyPickedCard(index) {
  const card = state.pendingCards[index];
  if (!card) return;
  card.apply();
  state.pendingCards = [];
  hideOverlay();
  startStage(state.stage + 1);
}

function setDefeat() {
  state.mode = 'defeat';
  state.phase = 'card';
  hintTextEl.textContent = '다시 시작하거나 광고 보상으로 1회 부활할 수 있습니다';
  renderDefeatOverlay();
  tone(170, 0.18, 'sawtooth', 0.04);
}

function parseAdEventType(event) {
  return String(
    event?.data?.eventType
      || event?.eventType
      || event?.type
      || ''
  ).toLowerCase();
}

function setAdStatus(status) {
  state.ad.status = status;
  if (state.mode === 'defeat') {
    renderDefeatOverlay();
  }
}

function clearAdTimers() {
  if (state.ad.retryTimer) {
    window.clearTimeout(state.ad.retryTimer);
    state.ad.retryTimer = 0;
  }
}

function cleanupAdListeners() {
  state.ad.loadCleanup();
  state.ad.showCleanup();
  state.ad.loadCleanup = () => {};
  state.ad.showCleanup = () => {};
}

function scheduleAdReload() {
  if (!state.ad.supported || state.ad.retryTimer) return;
  state.ad.retryTimer = window.setTimeout(() => {
    state.ad.retryTimer = 0;
    preloadRewardedAd(true);
  }, 2200);
}

async function preloadRewardedAd(force = false) {
  if (!state.ad.supported || !TOSS_REWARDED_AD_GROUP_ID) return;
  if (!force && (state.ad.status === 'loading' || state.ad.status === 'ready' || state.ad.status === 'showing')) {
    return;
  }

  clearAdTimers();
  state.ad.loadCleanup();
  state.ad.loadCleanup = () => {};
  setAdStatus('loading');

  state.ad.loadCleanup = toss.ads.load(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      const type = parseAdEventType(event);
      if (!type) return;
      if (type.includes('loaded') || type.includes('load') || type.includes('ready')) {
        setAdStatus('ready');
      }
      if (type.includes('error') || type.includes('fail')) {
        setAdStatus('failed');
        scheduleAdReload();
      }
    },
    onError: () => {
      setAdStatus('failed');
      scheduleAdReload();
    },
  });

  // Fallback check for runtimes that emit only isLoaded state.
  window.setTimeout(async () => {
    if (state.ad.status !== 'loading') return;
    try {
      if (typeof toss.ads.isLoaded === 'function') {
        const loaded = await toss.ads.isLoaded(TOSS_REWARDED_AD_GROUP_ID);
        if (loaded) {
          setAdStatus('ready');
          return;
        }
      }
      setAdStatus('failed');
      scheduleAdReload();
    } catch (error) {
      setAdStatus('failed');
      scheduleAdReload();
    }
  }, 1200);
}

function grantRewardContinue() {
  if (state.rewardedContinueUsed) return;
  state.rewardedContinueUsed = true;
  state.hp = Math.max(1, Math.floor(state.maxHp * 0.5));
  state.enemies = [];
  state.spawnQueue = [];
  state.bullets = [];
  state.mode = 'running';
  state.phase = 'build';
  hideOverlay();
  startStage(Math.max(1, state.stage));
  hintTextEl.textContent = '광고 보상 부활! 배치 턴에서 전열을 다시 정비하세요';
}

function showRewardedContinue() {
  if (
    state.mode !== 'defeat'
    || !state.ad.supported
    || state.rewardedContinueUsed
    || state.ad.status !== 'ready'
  ) {
    return;
  }

  setAdStatus('showing');
  state.ad.rewardGranted = false;

  let settled = false;
  const settle = (granted) => {
    if (settled) return;
    settled = true;
    state.ad.showCleanup();
    state.ad.showCleanup = () => {};
    if (granted) {
      grantRewardContinue();
    }
    preloadRewardedAd(true);
    if (!granted && state.mode === 'defeat') {
      renderDefeatOverlay();
    }
  };

  state.ad.showCleanup = toss.ads.show(TOSS_REWARDED_AD_GROUP_ID, {
    onEvent: (event) => {
      const type = parseAdEventType(event);
      if (!type) return;
      if (type.includes('reward')) {
        state.ad.rewardGranted = true;
      }
      if (
        type.includes('close')
        || type.includes('dismiss')
        || type.includes('complete')
        || type.includes('finish')
        || type.includes('end')
      ) {
        settle(state.ad.rewardGranted);
      }
      if (type.includes('error') || type.includes('fail')) {
        settle(false);
      }
    },
    onError: () => {
      settle(false);
    },
  });

  window.setTimeout(() => {
    settle(state.ad.rewardGranted);
  }, 10000);
}

async function initializeRewardedAd() {
  state.ad.supported = toss.isAvailable()
    && typeof toss.ads?.isAvailable === 'function'
    && toss.ads.isAvailable() === true;

  if (!state.ad.supported || !TOSS_REWARDED_AD_GROUP_ID) {
    state.ad.supported = false;
    setAdStatus('hidden');
    return;
  }

  try {
    if (typeof toss.ads.isLoaded === 'function') {
      const loaded = await toss.ads.isLoaded(TOSS_REWARDED_AD_GROUP_ID);
      if (loaded) {
        setAdStatus('ready');
        return;
      }
    }
  } catch (error) {
    // Ignore and fallback to load API.
  }

  preloadRewardedAd(true);
}

function makeBackgroundLayer() {
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const bx = layer.getContext('2d');

  const base = bx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#4e533f');
  base.addColorStop(0.55, '#3a402f');
  base.addColorStop(1, '#292f25');
  bx.fillStyle = base;
  bx.fillRect(0, 0, W, H);

  const laneX = cellCenter(SPAWN.c, SPAWN.r).x;
  const laneGrad = bx.createLinearGradient(laneX - GRID.cell * 1.4, 0, laneX + GRID.cell * 1.4, 0);
  laneGrad.addColorStop(0, 'rgba(49, 43, 31, 0.76)');
  laneGrad.addColorStop(0.5, 'rgba(86, 73, 48, 0.9)');
  laneGrad.addColorStop(1, 'rgba(49, 43, 31, 0.76)');
  bx.fillStyle = laneGrad;
  bx.fillRect(laneX - GRID.cell * 1.5, 0, GRID.cell * 3, H);

  for (let i = 0; i < 240; i += 1) {
    const x = rand(0, W);
    const y = rand(0, H);
    const r = rand(4, 16);
    bx.fillStyle = Math.random() < 0.5
      ? `rgba(82, 88, 69, ${rand(0.04, 0.13)})`
      : `rgba(24, 27, 21, ${rand(0.04, 0.11)})`;
    bx.beginPath();
    bx.arc(x, y, r, 0, Math.PI * 2);
    bx.fill();
  }

  for (let i = 0; i < 30; i += 1) {
    const y = rand(40, H - 40);
    const x = laneX + rand(-GRID.cell * 1.1, GRID.cell * 1.1);
    const r = rand(12, 28);
    bx.fillStyle = 'rgba(30, 28, 23, 0.52)';
    bx.beginPath();
    bx.ellipse(x, y, r * 1.15, r * 0.82, rand(0, Math.PI * 2), 0, Math.PI * 2);
    bx.fill();
  }

  bx.fillStyle = 'rgba(22, 64, 31, 0.6)';
  bx.fillRect(0, 0, GRID.cell * 1.05, H);
  bx.fillRect(W - GRID.cell * 1.05, 0, GRID.cell * 1.05, H);

  return layer;
}

function getBackgroundLayer() {
  if (!backgroundLayer) {
    backgroundLayer = makeBackgroundLayer();
  }
  return backgroundLayer;
}

function drawPathPreview() {
  let c = SPAWN.c;
  let r = SPAWN.r;
  const start = cellCenter(c, r);
  ctx.strokeStyle = 'rgba(148, 236, 191, 0.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  const maxStep = GRID.cols * GRID.rows;
  for (let i = 0; i < maxStep; i += 1) {
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

function drawEndpoints(now) {
  const spawn = cellCenter(SPAWN.c, SPAWN.r);
  const goal = cellCenter(GOAL.c, GOAL.r);
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);

  ctx.save();

  ctx.fillStyle = 'rgba(116, 232, 175, 0.18)';
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 26 + pulse * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8cf2be';
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(226, 255, 242, 0.82)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(spawn.x - 4, spawn.y - 6);
  ctx.lineTo(spawn.x + 6, spawn.y);
  ctx.lineTo(spawn.x - 4, spawn.y + 6);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = 'rgba(248, 203, 141, 0.2)';
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, 31 + pulse * 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4cc8c';
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7c4f2c';
  ctx.fillRect(goal.x - 8, goal.y - 13, 16, 26);
  ctx.fillStyle = '#ffedc4';
  ctx.fillRect(goal.x - 3, goal.y - 8, 6, 12);

  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(154, 174, 139, 0.15)';
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

function drawTower(tower, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.008 + tower.id * 0.41);
  const ringR = 14 + tower.level * 1.8;

  ctx.save();
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = 'rgba(12, 19, 30, 0.82)';
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = tower.color;
  ctx.globalAlpha = 0.18 + pulse * 0.2;
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 11 + pulse * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const core = ctx.createRadialGradient(0, 0, 2, 0, 0, ringR);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.45, tower.color);
  core.addColorStop(1, '#1c2430');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(237, 247, 255, 0.78)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, ringR + 2.5 + pulse * 1.6, 0, Math.PI * 2);
  ctx.stroke();

  if (tower.kind === 'tankerSunken') {
    ctx.strokeStyle = 'rgba(220, 255, 234, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();
  }

  if (tower.kind === 'sunkenHammer') {
    ctx.fillStyle = '#ffdf9f';
    ctx.fillRect(-1.4, 2, 2.8, 8);
    ctx.fillStyle = '#ff6f6f';
    ctx.fillRect(-5.5, -3, 11, 6);
  }

  if (tower.level >= 3) {
    ctx.fillStyle = '#ffe4b2';
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + now * 0.002;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (ringR + 5), Math.sin(a) * (ringR + 5), 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawEnemy(enemy) {
  const img = ENEMY_TANK_IMAGES[enemy.tank];
  const angle = Math.atan2(enemy.vy || 1, enemy.vx || 0) + Math.PI * 0.5;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(angle);

  if (img && img.complete && img.naturalWidth > 0) {
    const scale = enemy.r * 0.075;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h);
  } else {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const barW = Math.max(24, enemy.r * 2.1);
  const barY = enemy.y - enemy.r - 11;
  ctx.fillStyle = 'rgba(8, 12, 17, 0.74)';
  ctx.fillRect(enemy.x - barW * 0.5, barY, barW, 4);
  ctx.fillStyle = enemy.boss ? '#ffb67f' : '#8df1b0';
  ctx.fillRect(enemy.x - barW * 0.5, barY, barW * hpRatio, 4);
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSelectedCell(now) {
  if (!state.selectedCellFx) return;
  const elapsed = now - state.selectedCellFx.at;
  if (elapsed > 420) {
    state.selectedCellFx = null;
    return;
  }

  const { c, r, ok } = state.selectedCellFx;
  const x = c * GRID.cell;
  const y = r * GRID.cell;
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.025);

  ctx.strokeStyle = ok
    ? `rgba(143, 248, 191, ${0.35 + pulse * 0.4})`
    : `rgba(255, 145, 162, ${0.35 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1.5, y + 1.5, GRID.cell - 3, GRID.cell - 3);
}

function draw() {
  const now = performance.now();
  const backdrop = getBackgroundLayer();
  ctx.drawImage(backdrop, 0, 0);
  drawPathPreview();
  drawGrid();
  drawEndpoints(now);

  for (const tower of state.towers) {
    drawTower(tower, now);
  }

  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  drawBullets();
  drawSelectedCell(now);
}

function transitionToFightPhase() {
  state.phase = 'fight';
  hintTextEl.textContent = '전투 중: 자동으로 공격합니다';
  tone(520, 0.05, 'triangle', 0.018);
}

function updateRunning(dt) {
  if (state.phase === 'build') {
    state.buildTimer -= dt;
    if (state.buildTimer <= 0) {
      transitionToFightPhase();
    }
  } else if (state.phase === 'fight') {
    updateSpawning(dt);
    updateEnemies(dt);
    if (state.mode !== 'running') return;
    updateTowers(dt);
    updateBullets(dt);

    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      stageClear();
      return;
    }
  }
}

function frame(now) {
  const dt = clamp((now - lastAt) / 1000, 0, 0.05);
  lastAt = now;

  if (!backgroundPaused && state.mode === 'running') {
    state.runTime += dt;
    updateRunning(dt);
  }

  draw();
  refreshHud();
  rafId = requestAnimationFrame(frame);
}

function setSellMode(on) {
  state.sellMode = Boolean(on);
  refreshBuildButtons();
}

function onCanvasPointerDown(event) {
  if (state.mode !== 'running' || state.phase !== 'build') return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const cell = worldToCell(x, y);
  if (!inBounds(cell.c, cell.r)) return;

  const tower = getTowerAt(cell.c, cell.r);

  let ok = false;
  if (tower) {
    if (state.sellMode) {
      ok = sellTower(tower);
    } else {
      ok = upgradeTower(tower);
    }
  } else if (!state.sellMode) {
    ok = placeTower(cell.c, cell.r);
  }

  state.selectedCellFx = {
    c: cell.c,
    r: cell.r,
    ok,
    at: performance.now(),
  };
}

function showExitModal() {
  exitModal.classList.remove('hidden');
}

function hideExitModal() {
  exitModal.classList.add('hidden');
}

async function closeCurrentView() {
  hideExitModal();
  await toss.setIosSwipeGestureEnabled(true);
  await toss.setDeviceOrientation('portrait');
  const closed = await toss.closeView();
  if (closed !== false) return;

  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '../index.html';
  }
}

function bindUiEvents() {
  canvas.addEventListener('pointerdown', onCanvasPointerDown);

  document.getElementById('buildStrip').addEventListener('click', (event) => {
    const towerBtn = event.target.closest('.build-btn[data-kind]');
    if (towerBtn) {
      state.selectedTower = towerBtn.dataset.kind;
      setSellMode(false);
      refreshBuildButtons();
      tone(380, 0.04, 'triangle', 0.015);
      return;
    }

    if (event.target.closest('#btnSellMode')) {
      setSellMode(!state.sellMode);
      tone(state.sellMode ? 250 : 360, 0.04, 'triangle', 0.015);
    }
  });

  overlayEl.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'start' || action === 'tutorial' || action === 'restart') {
      startRun();
      return;
    }

    if (action === 'pick-card') {
      const index = Number(event.target.closest('[data-card-index]')?.dataset.cardIndex);
      if (Number.isInteger(index)) {
        applyPickedCard(index);
      }
      return;
    }

    if (action === 'reward-continue') {
      showRewardedContinue();
    }
  });

  btnMusic.addEventListener('click', () => {
    audioSettings.bgmEnabled = !audioSettings.bgmEnabled;
    saveAudioSettings();
    syncAudioButtons();
    syncAudioRuntime();
    if (audioSettings.bgmEnabled) {
      bgmAudio?.unlock();
    }
  });

  btnSfx.addEventListener('click', () => {
    audioSettings.sfxEnabled = !audioSettings.sfxEnabled;
    saveAudioSettings();
    syncAudioButtons();
    syncAudioRuntime();
  });

  btnExit.addEventListener('click', () => {
    showExitModal();
  });

  btnCancelExit.addEventListener('click', () => {
    hideExitModal();
  });

  btnConfirmExit.addEventListener('click', () => {
    void closeCurrentView();
  });

  document.addEventListener('visibilitychange', () => {
    backgroundPaused = document.hidden;
  });
}

function preloadEnemyTankSprites() {
  for (const [key, src] of Object.entries(ENEMY_TANK_SOURCES)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    ENEMY_TANK_IMAGES[key] = image;
  }
}

async function initializeTossShell() {
  if (toss.isAvailable()) {
    try {
      applySafeAreaInsets(await toss.safeArea.get());
    } catch (error) {
      applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
    }

    unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
      applySafeAreaInsets(insets);
    });

    await toss.setDeviceOrientation('portrait');
    await toss.setIosSwipeGestureEnabled(false);

    unsubscribeBack = toss.events.onBack(() => {
      showExitModal();
    });

    unsubscribeHome = toss.events.onHome(() => {
      backgroundPaused = true;
    });
  } else {
    applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  }
}

function cleanup() {
  unsubscribeSafeArea();
  unsubscribeBack();
  unsubscribeHome();
  cleanupAdListeners();
  clearAdTimers();
  cancelAnimationFrame(rafId);
  void toss.setDeviceOrientation('portrait');
  void toss.setIosSwipeGestureEnabled(true);
}

async function init() {
  initializeAudioSystem();
  preloadEnemyTankSprites();
  bindUiEvents();
  refreshBuildButtons();
  refreshHud();
  buildDistanceMap();

  try {
    await initializeTossShell();
  } catch (error) {
    applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  }

  await initializeRewardedAd();
  showMenuOverlay();

  lastAt = performance.now();
  rafId = requestAnimationFrame(frame);
}

window.addEventListener('beforeunload', cleanup);

init();
