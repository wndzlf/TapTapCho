const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const levelEl = document.getElementById('level');
const waveEl = document.getElementById('wave');
const bossesEl = document.getElementById('bosses');
const comboEl = document.getElementById('combo');
const spEl = document.getElementById('sp');
const btnStart = document.getElementById('btnStart');
const btnSound = document.getElementById('btnSound');
const btnSpecial = document.getElementById('btnSpecial');

const W = canvas.width;
const H = canvas.height;
const STORAGE_KEY = 'air-striker-lite-best';

const DIFFICULTY_LABELS = [
  'Rookie',
  'Pilot',
  'Ace',
  'Elite',
  'Veteran',
  'Nightmare',
];

const PLANES = [
  {
    id: 'falcon',
    name: 'Falcon',
    role: 'Balanced',
    speedMul: 1.0,
    fireCadenceMul: 1.0,
    volleyBonus: 0,
    spreadMul: 1.0,
    damageBonus: 0,
    hpBonus: 0,
    startShield: 0,
    primary: '#ff9a36',
    accent: '#ffd372',
    cockpit: '#d9ecff',
    specialName: 'Carpet Bomb',
    specialDesc: '맵 전체 폭격 + 탄막 제거',
    specialId: 'carpet',
  },
  {
    id: 'viper',
    name: 'Viper',
    role: 'Assault',
    speedMul: 1.12,
    fireCadenceMul: 0.9,
    volleyBonus: 1,
    spreadMul: 1.2,
    damageBonus: 0,
    hpBonus: 0,
    startShield: 0,
    primary: '#6ce4ff',
    accent: '#8be8ff',
    cockpit: '#f0faff',
    specialName: 'Overdrive',
    specialDesc: '연사 강화 + 광역 샷',
    specialId: 'overdrive',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    role: 'Tank',
    speedMul: 0.9,
    fireCadenceMul: 1.08,
    volleyBonus: 0,
    spreadMul: 0.94,
    damageBonus: 1,
    hpBonus: 1,
    startShield: 1,
    primary: '#9ab7ff',
    accent: '#ffe08f',
    cockpit: '#eef5ff',
    specialName: 'Aegis Burst',
    specialDesc: '보호막 강화 + 근접 섬멸',
    specialId: 'aegis',
  },
];

const SPECIAL_KEYS = ['KeyX', 'ShiftLeft', 'ShiftRight'];

const player = {
  x: W * 0.5,
  y: H - 94,
  r: 15,
  speed: 345,
  baseFireCd: 0.14,
  fireCd: 0,
  invuln: 0,
  shield: 0,
  rapidTimer: 0,
  weaponTimer: 0,
};

const keys = Object.create(null);
const pointer = { x: player.x, y: player.y, active: false };

let state = 'idle'; // idle | running | gameover
let score = 0;
let hp = 3;
let maxHp = 3;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let tick = 0;
let survivalTime = 0;
let spawnTimer = 0;
let flash = 0;
let shake = 0;
let shotSfxCd = 0;
let combo = 0;
let comboTimer = 0;
let powerupSpawnCd = 0;
let level = 1;
let wave = 1;
let nextBossScore = 260;
let bossesDefeated = 0;
let bossWarning = 0;
let waveBanner = 0;
let waveBannerText = '';
let mission = null;
let droneFireCd = 0;
let selectedPlaneIndex = 0;
let specialCharge = 0;
let specialCooldown = 0;
let specialPulse = 0;

const perks = {
  fireRate: 0,
  damage: 0,
  shield: 0,
  drone: 0,
  combo: 0,
  magnet: 0,
};

const upgradeMenu = {
  active: false,
  choices: [],
  selected: 0,
  pendingBossKill: false,
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let powerUps = [];
let boss = null;

bestEl.textContent = String(best);

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function createBgm() {
  const track = new Audio('../assets/audio/the_dawn_unfolds_v2.m4a');
  track.preload = 'auto';
  track.loop = true;
  track.volume = 0.34;
  track.playbackRate = 1;

  let enabled = true;
  let unlocked = false;

  function safePlay() {
    const p = track.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  }

  return {
    ensure() {
      if (!enabled) return;
      unlocked = true;
      safePlay();
    },
    setEnabled(next) {
      enabled = !!next;
      if (!enabled) {
        track.pause();
        return;
      }
      if (unlocked) safePlay();
    },
    isEnabled() {
      return enabled;
    },
    setTheme(themeId) {
      track.playbackRate = themeId === 'rush' ? 1.07 : 1;
    },
  };
}

const bgmAudio = createBgm();

function createSfx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let enabled = true;

  function ensure() {
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone({
    freq = 440,
    endFreq = null,
    gain = 0.04,
    duration = 0.08,
    type = 'square',
    attack = 0.005,
  }) {
    if (!enabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq != null) {
      osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
    }

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(env);
    env.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    ensure,
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    shoot() {
      tone({ freq: 840, endFreq: 520, gain: 0.02, duration: 0.045, type: 'triangle' });
    },
    hit() {
      tone({ freq: 500, endFreq: 220, gain: 0.028, duration: 0.06, type: 'square' });
    },
    kill() {
      tone({ freq: 290, endFreq: 760, gain: 0.035, duration: 0.08, type: 'triangle' });
    },
    bossSpawn() {
      tone({ freq: 110, endFreq: 70, gain: 0.08, duration: 0.22, type: 'sawtooth' });
    },
    bossHit() {
      tone({ freq: 190, endFreq: 140, gain: 0.045, duration: 0.08, type: 'sawtooth' });
    },
    bossDown() {
      tone({ freq: 220, endFreq: 60, gain: 0.09, duration: 0.3, type: 'square' });
    },
    playerHit() {
      tone({ freq: 160, endFreq: 70, gain: 0.08, duration: 0.16, type: 'sawtooth' });
    },
    powerUp() {
      tone({ freq: 620, endFreq: 980, gain: 0.04, duration: 0.13, type: 'triangle' });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  const enabled = sfx.isEnabled() && bgmAudio.isEnabled();
  btnSound.textContent = `Sound: ${enabled ? 'On' : 'Off'}`;
}

function selectedPlane() {
  return PLANES[selectedPlaneIndex] || PLANES[0];
}

function setSelectedPlane(index) {
  const normalized = (index + PLANES.length) % PLANES.length;
  selectedPlaneIndex = normalized;
  updateSpecialUi();
}

function canUseSpecial() {
  return state === 'running' && !upgradeMenu.active && specialCharge >= 100 && specialCooldown <= 0;
}

function updateSpecialUi() {
  const ready = canUseSpecial();
  if (spEl) spEl.textContent = `${Math.floor(specialCharge)}%`;
  if (btnSpecial) {
    btnSpecial.textContent = ready ? 'Special Ready (X)' : `Special ${Math.floor(specialCharge)}%`;
    btnSpecial.disabled = !ready;
  }
}

function addSpecialCharge(amount) {
  specialCharge = clamp(specialCharge + amount, 0, 100);
  updateSpecialUi();
}

function planeCardRect(index) {
  const cardW = 118;
  const cardH = 86;
  const gap = 12;
  const totalW = PLANES.length * cardW + (PLANES.length - 1) * gap;
  const baseX = (W - totalW) * 0.5;
  const y = H * 0.5 + 58;
  return { x: baseX + index * (cardW + gap), y, w: cardW, h: cardH };
}

function pickPlaneIndexAt(x, y) {
  for (let i = 0; i < PLANES.length; i += 1) {
    const r = planeCardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function getDifficulty() {
  const computedLevel = clamp(
    1 + Math.floor(survivalTime / 18) + Math.floor(score / 260),
    1,
    14,
  );
  level = computedLevel;
  return {
    level: computedLevel,
    label: DIFFICULTY_LABELS[clamp(Math.floor((computedLevel - 1) / 2), 0, DIFFICULTY_LABELS.length - 1)],
    enemySpeed: 1 + computedLevel * 0.075,
    spawnInterval: Math.max(0.17, 0.76 - computedLevel * 0.05),
    bulletSpeed: 1 + computedLevel * 0.06,
  };
}

function addBurst(x, y, color, count = 12, spread = 3.2) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: rand(-spread, spread),
      vy: rand(-spread, spread),
      life: rand(18, 34),
      color,
      size: rand(2, 4),
    });
  }
}

function updateHpUi() {
  hpEl.textContent = String(Math.max(0, hp));
}

function updateScoreUi() {
  scoreEl.textContent = String(score);
}

function updateLevelUi() {
  levelEl.textContent = String(level);
}

function updateWaveUi() {
  waveEl.textContent = String(wave);
}

function updateBossesUi() {
  bossesEl.textContent = String(bossesDefeated);
}

function updateComboUi(multiplier) {
  comboEl.textContent = `x${multiplier.toFixed(1)}`;
}

function resetCombo() {
  combo = 0;
  comboTimer = 0;
  updateComboUi(1);
}

function registerKill(baseScore) {
  combo = comboTimer > 0 ? combo + 1 : 1;
  comboTimer = 1.45 + perks.combo * 0.22;
  const multiplier = 1 + Math.min(1.6 + perks.combo * 0.06, Math.floor(combo / 4) * 0.2 + perks.combo * 0.05);
  score += Math.round(baseScore * multiplier);
  addSpecialCharge(4 + baseScore * 0.2 + Math.min(4, Math.floor(combo / 3)));
  updateScoreUi();
  updateComboUi(multiplier);
  if (mission && mission.type === 'kill') {
    mission.progress = Math.min(mission.target, mission.progress + 1);
  }
}

function pickEnemyType(difficulty) {
  const r = Math.random();
  if (difficulty.level >= 6 && r < 0.16) return 'kamikaze';
  if (difficulty.level >= 5 && r < 0.34) return 'splitter';
  if (difficulty.level >= 4 && r < 0.58) return 'zigzag';
  if (difficulty.level >= 2 && r < 0.8) return 'heavy';
  return 'normal';
}

function spawnEnemy(forcedType = null) {
  const difficulty = getDifficulty();
  const type = forcedType || pickEnemyType(difficulty);
  const scale = difficulty.enemySpeed;
  const baseX = rand(26, W - 26);
  const hpByType = {
    normal: 1,
    heavy: 3,
    zigzag: 2,
    kamikaze: 2,
    splitter: 2,
    mini: 1,
  };
  const radiusByType = {
    normal: 14,
    heavy: 18,
    zigzag: 15,
    kamikaze: 13,
    splitter: 16,
    mini: 10,
  };

  const hpBonus = Math.floor((difficulty.level - 1) / 4);
  const hpEnemy = hpByType[type] + hpBonus;

  enemies.push({
    type,
    x: baseX,
    y: -30,
    baseX,
    vx: rand(-30, 30),
    vy: rand(95, 170) * scale,
    speed: rand(130, 200) * scale,
    r: radiusByType[type],
    hp: hpEnemy,
    maxHp: hpEnemy,
    rot: rand(0, Math.PI * 2),
    t: rand(0, 9),
    seed: rand(-3, 3),
    fireCd: rand(0.8, 1.6),
  });
}

function spawnEnemyBullet(x, y, angle, speed, color = '#ff98a1', radius = 5) {
  enemyBullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: radius,
    life: 8,
    color,
  });
}

function spawnBoss() {
  const difficulty = getDifficulty();
  const hpMax = 460 + bossesDefeated * 190 + difficulty.level * 55;
  boss = {
    x: W * 0.5,
    y: 96,
    r: 56,
    hp: hpMax,
    maxHp: hpMax,
    phase: 1,
    vx: 120,
    fireCd: 1,
    patternCd: 2.4,
    summonCd: 4,
    chargeCd: 2.2,
    targetX: W * 0.5,
    time: 0,
    enraged: bossesDefeated >= 2 || difficulty.level >= 9,
  };
  bossWarning = 2.4;
  shake = 12;
  sfx.bossSpawn();
  addBurst(boss.x, boss.y, '#ffbf7e', 42, 4.5);
  bgmAudio.setTheme('rush');
}

function spawnPowerUp(x, y) {
  const roll = Math.random();
  let type = 'rapid';
  if (roll < 0.25) type = 'shield';
  else if (roll < 0.45) type = 'repair';
  else if (roll < 0.62) type = 'weapon';
  else if (roll < 0.78) type = 'burst';

  powerUps.push({
    x,
    y,
    vy: rand(90, 140),
    r: 12,
    type,
    rot: rand(0, Math.PI * 2),
    life: 7,
  });
}

const UPGRADE_POOL = [
  {
    id: 'fire',
    title: 'Overclock',
    desc: 'Fire rate +10%',
    apply() {
      perks.fireRate += 1;
    },
  },
  {
    id: 'damage',
    title: 'Core Cannon',
    desc: 'Bullet damage +1',
    apply() {
      perks.damage += 1;
    },
  },
  {
    id: 'shield',
    title: 'Aegis Cell',
    desc: 'Max HP +1 and shield +1',
    apply() {
      perks.shield += 1;
      maxHp = Math.min(9, maxHp + 1);
      hp = Math.min(maxHp, hp + 1);
      player.shield = Math.min(4, player.shield + 1);
      updateHpUi();
    },
  },
  {
    id: 'drone',
    title: 'Wing Drone',
    desc: 'Add support drone fire',
    apply() {
      perks.drone += 1;
    },
  },
  {
    id: 'combo',
    title: 'Combo Drive',
    desc: 'Combo duration and bonus up',
    apply() {
      perks.combo += 1;
    },
  },
  {
    id: 'magnet',
    title: 'Magnet Core',
    desc: 'Power-up pickup range up',
    apply() {
      perks.magnet += 1;
    },
  },
];

function missionTarget(type) {
  if (type === 'kill') return 12 + Math.floor(level * 1.3);
  if (type === 'survive') return 14 + Math.floor(level * 1.2);
  return 2 + Math.floor(level / 3);
}

function missionLabel(type) {
  if (type === 'kill') return 'Eliminate';
  if (type === 'survive') return 'Survive';
  return 'Collect Powerups';
}

function createMission() {
  const pick = Math.random();
  let type = 'kill';
  if (pick < 0.34) type = 'survive';
  else if (pick < 0.56) type = 'powerup';
  mission = {
    type,
    target: missionTarget(type),
    progress: 0,
    reward: 80 + level * 20,
    done: false,
  };
}

function updateMission(dt) {
  if (!mission || mission.done) return;
  if (mission.type === 'survive') {
    mission.progress = Math.min(mission.target, mission.progress + dt);
  }
  if (mission.progress >= mission.target) {
    mission.done = true;
    score += mission.reward;
    hp = Math.min(maxHp, hp + 1);
    player.shield = Math.min(4, player.shield + 1);
    updateScoreUi();
    updateHpUi();
    addBurst(player.x, player.y, '#c6ff9d', 24, 3.8);
    sfx.powerUp();
    createMission();
  }
}

function openUpgradeMenu() {
  const shuffled = [...UPGRADE_POOL];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  upgradeMenu.choices = shuffled.slice(0, 3);
  upgradeMenu.selected = 0;
  upgradeMenu.active = true;
}

function applyUpgrade(index) {
  if (!upgradeMenu.active) return;
  const choice = upgradeMenu.choices[index];
  if (!choice) return;
  choice.apply();
  upgradeMenu.active = false;
  addBurst(player.x, player.y, '#b7efff', 26, 4.2);
  sfx.powerUp();
}

function resetGame() {
  const plane = selectedPlane();
  state = 'idle';
  score = 0;
  maxHp = 3 + plane.hpBonus;
  hp = maxHp;
  tick = 0;
  survivalTime = 0;
  spawnTimer = 0;
  flash = 0;
  shake = 0;
  shotSfxCd = 0;
  powerupSpawnCd = 0;
  level = 1;
  wave = 1;
  nextBossScore = 260;
  bossesDefeated = 0;
  bossWarning = 0;
  waveBanner = 0;
  waveBannerText = '';
  droneFireCd = 0;
  specialCharge = 40;
  specialCooldown = 0;
  specialPulse = 0;

  perks.fireRate = 0;
  perks.damage = 0;
  perks.shield = 0;
  perks.drone = 0;
  perks.combo = 0;
  perks.magnet = 0;
  upgradeMenu.active = false;
  upgradeMenu.choices = [];
  upgradeMenu.selected = 0;

  player.x = W * 0.5;
  player.y = H - 94;
  player.speed = 345 * plane.speedMul;
  player.baseFireCd = 0.14 * plane.fireCadenceMul;
  player.fireCd = 0;
  player.invuln = 0;
  player.shield = plane.startShield;
  player.rapidTimer = 0;
  player.weaponTimer = 0;

  bullets = [];
  enemies = [];
  enemyBullets = [];
  particles = [];
  powerUps = [];
  boss = null;
  bgmAudio.setTheme('neon');

  updateScoreUi();
  updateHpUi();
  updateLevelUi();
  updateWaveUi();
  updateBossesUi();
  resetCombo();
  createMission();
  updateSpecialUi();
}

function startGame() {
  sfx.ensure();
  bgmAudio.ensure();
  resetGame();
  state = 'running';
  updateSpecialUi();
}

function endGame() {
  state = 'gameover';
  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
  updateSpecialUi();
}

function currentFireCadence() {
  let fireCd = player.baseFireCd;
  if (player.rapidTimer > 0) fireCd *= 0.58;
  if (player.weaponTimer > 0) fireCd *= 0.86;
  if (level >= 7) fireCd *= 0.92;
  fireCd *= Math.max(0.58, 1 - perks.fireRate * 0.1);
  return fireCd;
}

function shoot() {
  const plane = selectedPlane();
  const baseVolley = player.weaponTimer > 0 ? 5 : 3;
  const volley = clamp(baseVolley + plane.volleyBonus, 1, 7);
  const spread = (player.weaponTimer > 0 ? 0.14 : 0.11) * plane.spreadMul;
  const speed = 610;
  const damageBoost = perks.damage + plane.damageBonus;

  for (let i = 0; i < volley; i += 1) {
    const offset = i - (volley - 1) / 2;
    const angle = -Math.PI / 2 + offset * spread;
    bullets.push({
      x: player.x + offset * 5,
      y: player.y - 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 4,
      damage: (player.weaponTimer > 0 ? 2 : 1) + damageBoost,
      life: 1.8,
    });
  }

  if (perks.drone > 0 && droneFireCd <= 0) {
    const drones = Math.min(2, perks.drone);
    for (let d = 0; d < drones; d += 1) {
      const side = d === 0 ? -1 : 1;
      bullets.push({
        x: player.x + side * 22,
        y: player.y - 8,
        vx: side * 60,
        vy: -540,
        r: 3,
        damage: 1 + Math.floor(perks.damage * 0.5),
        life: 1.4,
      });
    }
    droneFireCd = Math.max(0.1, 0.24 - perks.drone * 0.04);
  }

  if (shotSfxCd <= 0) {
    sfx.shoot();
    shotSfxCd = 0.08;
  }
}

function damagePlayer(amount = 1) {
  if (player.invuln > 0 || state !== 'running') return;

  if (player.shield > 0) {
    player.shield -= 1;
    player.invuln = 0.75;
    shake = 8;
    addBurst(player.x, player.y, '#7fe9ff', 22, 3.8);
    sfx.powerUp();
    return;
  }

  hp -= amount;
  updateHpUi();
  flash = 22;
  shake = 14;
  player.invuln = 1.1;
  sfx.playerHit();
  addBurst(player.x, player.y, '#ff7b74', 26, 4.4);

  if (hp <= 0) endGame();
}

function killEnemy(index, enemy, options = {}) {
  enemies.splice(index, 1);

  if (enemy.type === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      enemies.push({
        type: 'mini',
        x: enemy.x + rand(-8, 8),
        y: enemy.y + rand(-4, 4),
        baseX: enemy.x,
        vx: i === 0 ? -90 : 90,
        vy: rand(120, 170),
        speed: rand(140, 180),
        r: 10,
        hp: 1,
        maxHp: 1,
        rot: rand(0, Math.PI * 2),
        t: rand(0, 3),
        seed: rand(-2, 2),
        fireCd: rand(9, 12),
      });
    }
  }

  addBurst(enemy.x, enemy.y, enemy.type === 'heavy' ? '#99f4ff' : '#83d9ff', enemy.type === 'heavy' ? 26 : 16, 3.5);
  sfx.kill();

  if (!options.noScore) {
    const baseScore = enemy.type === 'heavy' ? 20 : enemy.type === 'kamikaze' ? 16 : enemy.type === 'splitter' ? 18 : 10;
    registerKill(baseScore);
  }

  if (powerupSpawnCd <= 0 && Math.random() < 0.12) {
    powerupSpawnCd = 5.2;
    spawnPowerUp(enemy.x, enemy.y);
  }
}

function killBoss() {
  if (!boss) return;
  addBurst(boss.x, boss.y, '#ffd18d', 72, 5.6);
  addBurst(boss.x, boss.y, '#8feeff', 58, 4.8);
  sfx.bossDown();
  shake = 22;
  registerKill(260 + bossesDefeated * 40);
  bossesDefeated += 1;
  updateBossesUi();
  nextBossScore += 360 + bossesDefeated * 120;
  enemyBullets = [];
  boss = null;
  waveBannerText = `Boss Down! Choose Upgrade`;
  waveBanner = 2.2;
  openUpgradeMenu();
  bgmAudio.setTheme('neon');
}

function applyPowerUp(type) {
  if (type === 'rapid') {
    player.rapidTimer = Math.max(player.rapidTimer, 8);
  } else if (type === 'shield') {
    player.shield = Math.min(2 + perks.shield, player.shield + 1);
  } else if (type === 'repair') {
    hp = Math.min(maxHp, hp + 1);
    updateHpUi();
  } else if (type === 'weapon') {
    player.weaponTimer = Math.max(player.weaponTimer, 10);
  } else if (type === 'burst') {
    let cleared = 0;
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const e = enemies[i];
      if (e.type === 'mini') continue;
      enemies.splice(i, 1);
      addBurst(e.x, e.y, '#b7f7ff', 14, 3.2);
      cleared += 1;
    }
    enemyBullets = [];
    if (boss) {
      boss.hp -= 120;
      if (boss.hp <= 0) killBoss();
    }
    if (cleared > 0) registerKill(cleared * 8);
  }

  sfx.powerUp();
  addBurst(player.x, player.y, '#ffeb9e', 20, 3.2);
  if (mission && mission.type === 'powerup') {
    mission.progress = Math.min(mission.target, mission.progress + 1);
  }
}

function specialCarpetBomb() {
  enemyBullets = [];
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    e.hp -= 3 + perks.damage;
    if (e.hp <= 0) killEnemy(i, e);
    else addBurst(e.x, e.y, '#ffdc99', 12, 2.7);
  }
  if (boss) {
    boss.hp -= 220 + perks.damage * 22;
    addBurst(boss.x, boss.y, '#ffca91', 36, 4.2);
    if (boss.hp <= 0) killBoss();
  }
  flash = Math.max(flash, 28);
  shake = Math.max(shake, 18);
}

function specialOverdrive() {
  player.rapidTimer = Math.max(player.rapidTimer, 12);
  player.weaponTimer = Math.max(player.weaponTimer, 10);
  player.invuln = Math.max(player.invuln, 1.1);
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    bullets.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(a) * 360,
      vy: Math.sin(a) * 360,
      r: 3,
      damage: 2 + perks.damage,
      life: 0.9,
    });
  }
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    if (dist2(player.x, player.y, e.x, e.y) <= 160 * 160) {
      e.hp -= 2 + Math.floor(perks.damage * 0.5);
      if (e.hp <= 0) killEnemy(i, e);
      else addBurst(e.x, e.y, '#b9f1ff', 10, 2.6);
    }
  }
  flash = Math.max(flash, 20);
  shake = Math.max(shake, 14);
}

function specialAegisBurst() {
  enemyBullets = [];
  player.shield = Math.min(6, player.shield + 3);
  hp = Math.min(maxHp, hp + 1);
  updateHpUi();

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    if (dist2(player.x, player.y, e.x, e.y) <= 205 * 205) {
      killEnemy(i, e);
    } else {
      e.vy += 45;
    }
  }

  if (boss) {
    boss.hp -= 160 + perks.damage * 18;
    addBurst(boss.x, boss.y, '#bfe1ff', 30, 3.8);
    if (boss.hp <= 0) killBoss();
  }

  addBurst(player.x, player.y, '#9ee2ff', 46, 5);
  flash = Math.max(flash, 18);
  shake = Math.max(shake, 16);
}

function activateSpecial() {
  if (!canUseSpecial()) return;
  const plane = selectedPlane();

  specialCharge = 0;
  specialCooldown = 4.6;
  specialPulse = 0.9;
  waveBannerText = `${plane.name} SPECIAL: ${plane.specialName}`;
  waveBanner = Math.max(waveBanner, 1.2);

  if (plane.specialId === 'carpet') specialCarpetBomb();
  else if (plane.specialId === 'overdrive') specialOverdrive();
  else specialAegisBurst();

  sfx.powerUp();
  updateSpecialUi();
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;

  if (keys.ArrowLeft || keys.KeyA) mx -= 1;
  if (keys.ArrowRight || keys.KeyD) mx += 1;
  if (keys.ArrowUp || keys.KeyW) my -= 1;
  if (keys.ArrowDown || keys.KeyS) my += 1;

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my) || 1;
    player.x += (mx / len) * player.speed * dt;
    player.y += (my / len) * player.speed * dt;
  } else if (pointer.active) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1.6) {
      const step = Math.min(player.speed * dt, dist);
      player.x += (dx / dist) * step;
      player.y += (dy / dist) * step;
    }
  }

  player.x = clamp(player.x, 24, W - 24);
  player.y = clamp(player.y, 88, H - 24);

  player.fireCd -= dt;
  if (player.fireCd <= 0) {
    player.fireCd = currentFireCadence();
    shoot();
  }

  player.invuln = Math.max(0, player.invuln - dt);
  player.rapidTimer = Math.max(0, player.rapidTimer - dt);
  player.weaponTimer = Math.max(0, player.weaponTimer - dt);
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.y < -40 || b.x < -30 || b.x > W + 30) bullets.splice(i, 1);
  }
}

function updateEnemies(dt, difficulty) {
  spawnTimer -= dt;
  if (spawnTimer <= 0 && !bossWarning && !boss) {
    spawnEnemy();
    spawnTimer = difficulty.spawnInterval * rand(0.85, 1.15);
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    e.t += dt;
    e.rot += dt * 1.4;

    if (e.type === 'normal' || e.type === 'heavy' || e.type === 'splitter' || e.type === 'mini') {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.r || e.x > W - e.r) e.vx *= -1;
    } else if (e.type === 'zigzag') {
      e.y += e.vy * dt;
      e.x += (Math.sin(e.t * 5.4 + e.seed) * 130 + e.vx * 0.6) * dt;
      e.x = clamp(e.x, e.r, W - e.r);
    } else if (e.type === 'kamikaze') {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const tx = (dx / d) * e.speed;
      const ty = (dy / d) * e.speed;
      e.vx = lerp(e.vx, tx, 0.045);
      e.vy = lerp(e.vy, ty, 0.045);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }

    e.fireCd -= dt;
    if (e.fireCd <= 0) {
      if (e.type === 'heavy') {
        spawnEnemyBullet(e.x, e.y + e.r * 0.6, Math.PI / 2, 190 * difficulty.bulletSpeed, '#ffabb0', 5);
        e.fireCd = rand(1.2, 1.9);
      } else if (e.type === 'zigzag' && difficulty.level >= 5) {
        spawnEnemyBullet(e.x, e.y, Math.PI / 2 + Math.sin(e.t * 3) * 0.22, 220 * difficulty.bulletSpeed, '#ff9198', 4);
        e.fireCd = rand(1, 1.5);
      } else if (e.type === 'kamikaze' && difficulty.level >= 7) {
        spawnEnemyBullet(e.x, e.y, Math.PI / 2, 235 * difficulty.bulletSpeed, '#ffa3a8', 4);
        e.fireCd = rand(0.9, 1.3);
      }
    }

    if (e.y > H + 38) {
      enemies.splice(i, 1);
      damagePlayer(1);
    }
  }
}

function spawnWavePack(waveNo) {
  const mod = waveNo % 4;
  if (mod === 1) {
    for (let i = 0; i < 3; i += 1) spawnEnemy('heavy');
  } else if (mod === 2) {
    for (let i = 0; i < 4; i += 1) spawnEnemy('zigzag');
  } else if (mod === 3) {
    for (let i = 0; i < 4; i += 1) spawnEnemy('splitter');
  } else {
    for (let i = 0; i < 5; i += 1) spawnEnemy('kamikaze');
  }

  if (waveNo % 6 === 0) {
    spawnPowerUp(rand(32, W - 32), rand(90, 180));
  }
}

function updateBoss(dt, difficulty) {
  if (!boss) return;

  boss.time += dt;
  const hpRatio = boss.hp / boss.maxHp;
  if (boss.enraged && hpRatio <= 0.16) boss.phase = 4;
  else boss.phase = hpRatio > 0.66 ? 1 : hpRatio > 0.33 ? 2 : 3;

  if (boss.phase === 1) {
    boss.x += boss.vx * dt;
    if (boss.x < boss.r || boss.x > W - boss.r) boss.vx *= -1;
    boss.y = 92 + Math.sin(boss.time * 1.8) * 8;
  } else if (boss.phase === 2) {
    boss.x += boss.vx * 1.1 * dt;
    if (boss.x < boss.r || boss.x > W - boss.r) boss.vx *= -1;
    boss.y = 98 + Math.sin(boss.time * 2.6) * 16;
  } else if (boss.phase === 3) {
    boss.chargeCd -= dt;
    if (boss.chargeCd <= 0) {
      boss.targetX = clamp(player.x + rand(-50, 50), boss.r, W - boss.r);
      boss.chargeCd = 1.7;
    }
    boss.x += (boss.targetX - boss.x) * Math.min(1, dt * 3.4);
    boss.y = 95 + Math.sin(boss.time * 3.9) * 18;
  } else {
    boss.chargeCd -= dt;
    if (boss.chargeCd <= 0) {
      boss.targetX = clamp(player.x + rand(-72, 72), boss.r, W - boss.r);
      boss.chargeCd = 1.15;
    }
    boss.x += (boss.targetX - boss.x) * Math.min(1, dt * 5.2);
    boss.y = 85 + Math.sin(boss.time * 5.4) * 26;
  }

  boss.fireCd -= dt;
  boss.patternCd -= dt;
  boss.summonCd -= dt;

  if (boss.phase === 1 && boss.fireCd <= 0) {
    for (let i = -2; i <= 2; i += 1) {
      spawnEnemyBullet(boss.x + i * 11, boss.y + 14, Math.PI / 2 + i * 0.18, 215 * difficulty.bulletSpeed, '#ff9ca4', 5);
    }
    boss.fireCd = 0.92;
  }

  if (boss.phase === 2 && boss.fireCd <= 0) {
    const base = boss.time * 2.5;
    for (let i = 0; i < 10; i += 1) {
      const angle = base + (i / 10) * Math.PI * 2;
      spawnEnemyBullet(boss.x, boss.y, angle, 170 * difficulty.bulletSpeed, '#ff8c95', 4);
    }
    boss.fireCd = 0.82;
  }

  if (boss.phase === 3 && boss.fireCd <= 0) {
    const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
    for (let i = -2; i <= 2; i += 1) {
      spawnEnemyBullet(boss.x, boss.y + 8, aim + i * 0.14, 260 * difficulty.bulletSpeed, '#ff808b', 4);
    }
    boss.fireCd = 0.42;
  }

  if (boss.phase === 4 && boss.fireCd <= 0) {
    const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
    for (let i = -3; i <= 3; i += 1) {
      spawnEnemyBullet(boss.x, boss.y + 8, aim + i * 0.12, 290 * difficulty.bulletSpeed, '#ff6f7e', 4);
    }
    boss.fireCd = 0.3;
  }

  if (boss.phase >= 2 && boss.summonCd <= 0) {
    spawnEnemy('kamikaze');
    if (Math.random() < 0.5) spawnEnemy('zigzag');
    if (boss.phase >= 4) {
      spawnEnemy('splitter');
      boss.summonCd = 2.2;
    } else {
      boss.summonCd = boss.phase === 2 ? 4.3 : 3.4;
    }
  }

  if (boss.phase === 3 && boss.patternCd <= 0) {
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      spawnEnemyBullet(boss.x, boss.y, angle, 180 * difficulty.bulletSpeed, '#ff707e', 4);
    }
    boss.patternCd = 2.2;
    shake = 10;
  }

  if (boss.phase === 4 && boss.patternCd <= 0) {
    const base = boss.time * 5.2;
    for (let i = 0; i < 24; i += 1) {
      const angle = base + (i / 24) * Math.PI * 2;
      spawnEnemyBullet(boss.x, boss.y, angle, 210 * difficulty.bulletSpeed, '#ff6576', 4);
    }
    boss.patternCd = 1.25;
    shake = 14;
  }
}

function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0 || b.x < -24 || b.x > W + 24 || b.y < -24 || b.y > H + 24) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (dist2(b.x, b.y, player.x, player.y) <= (b.r + player.r - 3) ** 2) {
      enemyBullets.splice(i, 1);
      addBurst(b.x, b.y, '#ffb2b8', 10, 2.8);
      damagePlayer(1);
    }
  }
}

function updatePowerUps(dt) {
  for (let i = powerUps.length - 1; i >= 0; i -= 1) {
    const p = powerUps[i];
    if (perks.magnet > 0) {
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const range = 120 + perks.magnet * 45;
      if (d < range) {
        const pull = (95 + perks.magnet * 50) * dt;
        p.x += (dx / d) * pull;
        p.y += (dy / d) * pull;
      }
    }
    p.y += p.vy * dt;
    p.rot += dt * 2.5;
    p.life -= dt;

    if (p.life <= 0 || p.y > H + 40) {
      powerUps.splice(i, 1);
      continue;
    }

    if (dist2(p.x, p.y, player.x, player.y) <= (p.r + player.r) ** 2) {
      const t = p.type;
      powerUps.splice(i, 1);
      applyPowerUp(t);
    }
  }
}

function hitCheck() {
  for (let ei = enemies.length - 1; ei >= 0; ei -= 1) {
    const e = enemies[ei];
    let removed = false;

    for (let bi = bullets.length - 1; bi >= 0; bi -= 1) {
      const b = bullets[bi];
      if (dist2(b.x, b.y, e.x, e.y) > (b.r + e.r) ** 2) continue;

      bullets.splice(bi, 1);
      e.hp -= b.damage;
      addBurst(b.x, b.y, '#ffe9a8', 5, 1.8);
      sfx.hit();

      if (e.hp <= 0) {
        killEnemy(ei, e);
        removed = true;
      }
      break;
    }

    if (removed) continue;
    const enemyAfterHit = enemies[ei];
    if (!enemyAfterHit) continue;

    if (dist2(player.x, player.y, enemyAfterHit.x, enemyAfterHit.y) <= (player.r + enemyAfterHit.r - 2) ** 2) {
      killEnemy(ei, enemyAfterHit, { noScore: true });
      damagePlayer(1);
    }
  }

  if (!boss) return;

  for (let bi = bullets.length - 1; bi >= 0; bi -= 1) {
    const b = bullets[bi];
    if (dist2(b.x, b.y, boss.x, boss.y) > (b.r + boss.r) ** 2) continue;

    bullets.splice(bi, 1);
    boss.hp -= b.damage;
    addBurst(b.x, b.y, '#ffd7ab', 6, 1.9);
    sfx.bossHit();
    shake = Math.max(shake, 4);

    if (boss.hp <= 0) {
      killBoss();
      return;
    }
  }

  if (boss && dist2(player.x, player.y, boss.x, boss.y) <= (player.r + boss.r - 8) ** 2) {
    damagePlayer(1);
    player.x = clamp(player.x + (player.x < boss.x ? -42 : 42), player.r, W - player.r);
    player.y = clamp(player.y + 30, 88, H - 24);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.085;
    p.life -= dt * 60;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function renderBackground(difficulty) {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#192e6b');
  grd.addColorStop(1, '#111e43');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  const starSpeed = 0.9 + difficulty.level * 0.25;
  for (let i = 0; i < 74; i += 1) {
    const x = (i * 67 + Math.sin(i * 9.7) * 8) % W;
    const y = (i * 41 + tick * starSpeed + i * 3) % H;
    const size = (i % 3) + 1;
    ctx.fillStyle = i % 5 === 0 ? 'rgba(255, 220, 150, 0.32)' : 'rgba(190, 218, 255, 0.28)';
    ctx.fillRect(x, y, size, size);
  }
}

function drawPlayer() {
  const plane = selectedPlane();
  const isViper = plane.id === 'viper';
  const isGuardian = plane.id === 'guardian';

  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.invuln > 0) {
    ctx.globalAlpha = 0.45 + Math.sin(tick * 0.3) * 0.2;
  }

  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(131, 236, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.r + 6 + Math.sin(tick * 0.25), 0, Math.PI * 2);
    ctx.stroke();
  }

  const wing = isGuardian ? 17 : isViper ? 12 : 14;
  const nose = isGuardian ? 20 : isViper ? 22 : 18;
  const tailY = isGuardian ? 12 : 14;

  ctx.fillStyle = plane.primary;
  ctx.beginPath();
  ctx.moveTo(0, -nose);
  ctx.lineTo(-wing, tailY);
  ctx.lineTo(0, 8);
  ctx.lineTo(wing, tailY);
  ctx.closePath();
  ctx.fill();

  if (isGuardian) {
    ctx.fillStyle = plane.primary;
    ctx.fillRect(-22, -3, 8, 15);
    ctx.fillRect(14, -3, 8, 15);
  } else if (isViper) {
    ctx.fillStyle = plane.accent;
    ctx.fillRect(-15, -8, 4, 15);
    ctx.fillRect(11, -8, 4, 15);
  }

  ctx.fillStyle = plane.cockpit;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(-6, 2);
  ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = plane.accent;
  ctx.fillRect(-4, 10, 8, 8);

  const flame = 8 + Math.sin(tick * 0.45) * 2 + (player.rapidTimer > 0 ? 2.5 : 0);
  ctx.fillStyle = '#ffde8d';
  ctx.beginPath();
  ctx.moveTo(-5, 14);
  ctx.lineTo(0, 14 + flame);
  ctx.lineTo(5, 14);
  ctx.closePath();
  ctx.fill();

  if (specialPulse > 0) {
    ctx.strokeStyle = `rgba(255, 240, 145, ${0.3 + specialPulse * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.r + 8 + Math.sin(tick * 0.4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBullets() {
  const plane = selectedPlane();
  const baseColor = plane.id === 'viper' ? '#dbfcff' : plane.id === 'guardian' ? '#fff0c0' : '#f7fbff';
  for (const b of bullets) {
    ctx.fillStyle = b.damage > 1 ? '#fff8c2' : baseColor;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemyBullets() {
  for (const b of enemyBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);

    let fill = '#61dfff';
    if (e.type === 'heavy') fill = '#8ff6ff';
    else if (e.type === 'zigzag') fill = '#7bd0ff';
    else if (e.type === 'kamikaze') fill = '#ff9aa6';
    else if (e.type === 'splitter') fill = '#be9cff';
    else if (e.type === 'mini') fill = '#95c7ff';

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -e.r);
    ctx.lineTo(-e.r, 0);
    ctx.lineTo(-e.r * 0.5, e.r * 0.9);
    ctx.lineTo(e.r * 0.5, e.r * 0.9);
    ctx.lineTo(e.r, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = e.type === 'kamikaze' ? '#ffc8ce' : '#ff7b74';
    ctx.beginPath();
    ctx.arc(0, -e.r * 0.2, e.type === 'heavy' ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();

    if (e.maxHp > 1) {
      const w = e.r * 1.5;
      const ratio = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(-w * 0.5, e.r + 6, w, 3);
      ctx.fillStyle = '#9dffbe';
      ctx.fillRect(-w * 0.5, e.r + 6, w * ratio, 3);
    }

    ctx.restore();
  }
}

function drawBoss() {
  if (!boss) return;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  const phaseColor = boss.phase === 1 ? '#ffb888' : boss.phase === 2 ? '#ff9f95' : boss.phase === 3 ? '#ff808d' : '#ff5f72';

  ctx.fillStyle = phaseColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, boss.r, boss.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a1733';
  ctx.beginPath();
  ctx.arc(0, -4, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffe082';
  ctx.beginPath();
  ctx.arc(-8, -6, 4, 0, Math.PI * 2);
  ctx.arc(8, -6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd6a7';
  ctx.fillRect(-boss.r + 6, -6, 12, 24);
  ctx.fillRect(boss.r - 18, -6, 12, 24);

  ctx.restore();

  const barW = W - 60;
  const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(12, 20, 44, 0.8)';
  ctx.fillRect(30, 26, barW, 12);
  ctx.fillStyle = '#ff7d89';
  ctx.fillRect(30, 26, barW * ratio, 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(30, 26, barW, 12);

  ctx.fillStyle = '#ffe3bd';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`BOSS PHASE ${boss.phase}`, 32, 22);
}

function drawPowerUps() {
  for (const p of powerUps) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    let fill = '#9be8ff';
    let label = 'R';
    if (p.type === 'shield') {
      fill = '#8ee8d4';
      label = 'S';
    } else if (p.type === 'repair') {
      fill = '#a8ff9b';
      label = 'H';
    } else if (p.type === 'weapon') {
      fill = '#ffe18e';
      label = 'W';
    } else if (p.type === 'burst') {
      fill = '#ffb89f';
      label = 'B';
    }

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0c1b38';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }

  ctx.textBaseline = 'alphabetic';
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawTopInfo(difficulty) {
  const plane = selectedPlane();
  ctx.fillStyle = 'rgba(7, 13, 27, 0.32)';
  ctx.fillRect(12, 48, 300, 102);
  ctx.fillStyle = '#d7e8ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`Difficulty: ${difficulty.label} (Lv.${difficulty.level})`, 18, 67);

  const status = [];
  if (player.rapidTimer > 0) status.push(`Rapid ${player.rapidTimer.toFixed(0)}s`);
  if (player.weaponTimer > 0) status.push(`Weapon ${player.weaponTimer.toFixed(0)}s`);
  if (player.shield > 0) status.push(`Shield ${player.shield}`);
  ctx.fillText(status.length ? status.join(' | ') : 'Status: Base Loadout', 18, 86);
  ctx.fillText(`Perk F${perks.fireRate} D${perks.damage} S${perks.shield} Dr${perks.drone}`, 18, 104);
  if (mission) {
    const p = mission.type === 'survive' ? Math.floor(mission.progress) : mission.progress;
    const t = mission.type === 'survive' ? Math.floor(mission.target) : mission.target;
    ctx.fillText(`Mission: ${missionLabel(mission.type)} ${p}/${t}`, 18, 122);
  }
  const cooldownText = specialCooldown > 0 ? ` (${specialCooldown.toFixed(1)}s)` : '';
  const readyText = specialCharge >= 100 && specialCooldown <= 0 ? ' READY' : '';
  ctx.fillText(`Plane: ${plane.name} · SP ${Math.floor(specialCharge)}%${cooldownText}${readyText}`, 18, 140);
}

function renderOverlay() {
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 123, 116, ${0.06 + flash / 280})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (bossWarning > 0) {
    const alpha = 0.45 + Math.sin(tick * 0.34) * 0.25;
    ctx.fillStyle = `rgba(255, 124, 124, ${alpha})`;
    ctx.fillRect(0, H * 0.38, W, 56);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px system-ui';
    ctx.fillText('WARNING: BOSS INCOMING', W / 2, H * 0.38 + 36);
  }

  if (waveBanner > 0) {
    const alpha = 0.3 + Math.sin(tick * 0.28) * 0.16;
    ctx.fillStyle = `rgba(106, 176, 255, ${alpha})`;
    ctx.fillRect(W * 0.25, 136, W * 0.5, 42);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(waveBannerText || `Wave ${wave}`, W / 2, 164);
  }

  if (state === 'idle' || state === 'gameover') {
    const plane = selectedPlane();
    ctx.fillStyle = 'rgba(0,0,0,0.46)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Game Over', W / 2, H / 2 - 26);

    ctx.font = '16px system-ui';
    ctx.fillText('Survive waves, defeat boss phases, stack combo', W / 2, H / 2 + 2);
    ctx.fillText('WASD/Arrow/Drag · X/Shift = Special · Space to restart', W / 2, H / 2 + 26);

    if (state === 'gameover') {
      ctx.fillStyle = '#ffe082';
      ctx.font = 'bold 19px system-ui';
      ctx.fillText(`Final Score: ${score}`, W / 2, H / 2 + 56);
    }

    ctx.fillStyle = '#b7d9ff';
    ctx.font = '13px system-ui';
    ctx.fillText(`기체 선택: 1/2/3 또는 ←/→ · 현재 ${plane.name} (${plane.specialName})`, W / 2, H * 0.5 + 46);

    for (let i = 0; i < PLANES.length; i += 1) {
      const p = PLANES[i];
      const r = planeCardRect(i);
      const selected = i === selectedPlaneIndex;

      ctx.fillStyle = selected ? 'rgba(119, 200, 255, 0.35)' : 'rgba(15, 28, 54, 0.8)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = selected ? '#8be6ff' : 'rgba(255,255,255,0.3)';
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = p.primary;
      ctx.beginPath();
      ctx.moveTo(r.x + r.w * 0.5, r.y + 22);
      ctx.lineTo(r.x + r.w * 0.5 - 14, r.y + 46);
      ctx.lineTo(r.x + r.w * 0.5, r.y + 38);
      ctx.lineTo(r.x + r.w * 0.5 + 14, r.y + 46);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f0f7ff';
      ctx.font = 'bold 14px system-ui';
      ctx.fillText(`${i + 1}. ${p.name}`, r.x + r.w * 0.5, r.y + 60);
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#bddbff';
      ctx.fillText(p.specialName, r.x + r.w * 0.5, r.y + 76);
    }
  }

  if (upgradeMenu.active) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px system-ui';
    ctx.fillText('Choose Upgrade', W / 2, 170);
    ctx.font = '14px system-ui';
    ctx.fillText('Press 1 / 2 / 3 or tap an option', W / 2, 194);

    const boxW = W - 56;
    const boxH = 92;
    for (let i = 0; i < upgradeMenu.choices.length; i += 1) {
      const y = 228 + i * 108;
      const selected = i === upgradeMenu.selected;
      ctx.fillStyle = selected ? 'rgba(102, 206, 255, 0.34)' : 'rgba(18, 32, 58, 0.82)';
      ctx.fillRect(28, y, boxW, boxH);
      ctx.strokeStyle = selected ? '#8ee8ff' : 'rgba(255,255,255,0.25)';
      ctx.strokeRect(28, y, boxW, boxH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${upgradeMenu.choices[i].title}`, 44, y + 34);
      ctx.font = '14px system-ui';
      ctx.fillText(upgradeMenu.choices[i].desc, 44, y + 60);
    }
    ctx.textAlign = 'left';
  }
}

function render() {
  const difficulty = getDifficulty();

  let sx = 0;
  let sy = 0;
  if (shake > 0) {
    sx = rand(-shake, shake);
    sy = rand(-shake, shake);
  }

  ctx.save();
  ctx.translate(sx, sy);

  renderBackground(difficulty);
  drawBullets();
  drawEnemyBullets();
  drawEnemies();
  drawBoss();
  drawPowerUps();
  drawPlayer();
  drawParticles();
  drawTopInfo(difficulty);
  renderOverlay();

  ctx.restore();
}

function update(dt) {
  tick += 1;
  if (flash > 0) flash -= 1;
  if (shake > 0) shake = Math.max(0, shake - dt * 34);
  if (specialPulse > 0) specialPulse = Math.max(0, specialPulse - dt);
  if (specialCooldown > 0) specialCooldown = Math.max(0, specialCooldown - dt);
  if (shotSfxCd > 0) shotSfxCd -= dt;
  if (droneFireCd > 0) droneFireCd -= dt;
  if (powerupSpawnCd > 0) powerupSpawnCd -= dt;
  if (bossWarning > 0) bossWarning = Math.max(0, bossWarning - dt);
  if (waveBanner > 0) waveBanner = Math.max(0, waveBanner - dt);
  updateSpecialUi();

  updateParticles(dt);

  if (state !== 'running') return;
  if (upgradeMenu.active) return;

  survivalTime += dt;
  addSpecialCharge(dt * 2.3);
  const difficulty = getDifficulty();
  const nextWave = 1 + Math.floor(survivalTime / 12) + bossesDefeated * 2;
  if (nextWave > wave) {
    for (let wv = wave + 1; wv <= nextWave; wv += 1) {
      spawnWavePack(wv);
    }
    wave = nextWave;
    waveBannerText = `Wave ${wave}`;
    waveBanner = 1.5;
    updateWaveUi();
  }
  updateLevelUi();

  if (score >= nextBossScore && !boss && bossWarning <= 0) {
    spawnBoss();
  }

  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt, difficulty);
  updateBoss(dt, difficulty);
  updateEnemyBullets(dt);
  updatePowerUps(dt);
  hitCheck();
  updateMission(dt);

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) resetCombo();
  }

  if (score > best) {
    best = score;
    bestEl.textContent = String(best);
    localStorage.setItem(STORAGE_KEY, String(best));
  }
}

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) * (W / rect.width);
  pointer.y = (event.clientY - rect.top) * (H / rect.height);
}

function pickUpgradeIndexAt(x, y) {
  const boxW = W - 56;
  const boxH = 92;
  for (let i = 0; i < upgradeMenu.choices.length; i += 1) {
    const top = 228 + i * 108;
    if (x >= 28 && x <= 28 + boxW && y >= top && y <= top + boxH) return i;
  }
  return -1;
}

btnStart.addEventListener('click', () => {
  startGame();
});

btnSound.addEventListener('click', () => {
  const enabled = sfx.toggle();
  if (enabled) {
    sfx.ensure();
    bgmAudio.ensure();
  }
  bgmAudio.setEnabled(enabled);
  updateSoundButton();
});

btnSpecial.addEventListener('click', () => {
  sfx.ensure();
  bgmAudio.ensure();
  activateSpecial();
});

canvas.addEventListener('pointerdown', (event) => {
  sfx.ensure();
  bgmAudio.ensure();
  updatePointer(event);
  if (upgradeMenu.active) {
    const idx = pickUpgradeIndexAt(pointer.x, pointer.y);
    if (idx >= 0) applyUpgrade(idx);
    return;
  }

  if (state !== 'running') {
    const planeIdx = pickPlaneIndexAt(pointer.x, pointer.y);
    if (planeIdx >= 0) {
      setSelectedPlane(planeIdx);
      return;
    }
  }

  pointer.active = true;
  if (state !== 'running') startGame();
});

canvas.addEventListener('pointermove', (event) => {
  updatePointer(event);
});

window.addEventListener('pointerup', () => {
  pointer.active = false;
});

window.addEventListener('keydown', (event) => {
  if (upgradeMenu.active) {
    if (event.code === 'Digit1') applyUpgrade(0);
    if (event.code === 'Digit2') applyUpgrade(1);
    if (event.code === 'Digit3') applyUpgrade(2);
    if (event.code === 'ArrowUp') {
      event.preventDefault();
      upgradeMenu.selected = (upgradeMenu.selected + 2) % 3;
    }
    if (event.code === 'ArrowDown') {
      event.preventDefault();
      upgradeMenu.selected = (upgradeMenu.selected + 1) % 3;
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      applyUpgrade(upgradeMenu.selected);
    }
    return;
  }

  if (event.code === 'ArrowLeft' && state !== 'running') {
    event.preventDefault();
    setSelectedPlane(selectedPlaneIndex - 1);
    return;
  }
  if (event.code === 'ArrowRight' && state !== 'running') {
    event.preventDefault();
    setSelectedPlane(selectedPlaneIndex + 1);
    return;
  }
  if (event.code === 'Digit1' && state !== 'running') {
    setSelectedPlane(0);
    return;
  }
  if (event.code === 'Digit2' && state !== 'running') {
    setSelectedPlane(1);
    return;
  }
  if (event.code === 'Digit3' && state !== 'running') {
    setSelectedPlane(2);
    return;
  }

  keys[event.code] = true;

  if (SPECIAL_KEYS.includes(event.code) && state === 'running') {
    event.preventDefault();
    if (!event.repeat) activateSpecial();
    return;
  }

  if ((event.code === 'Space' || event.code === 'Enter') && state !== 'running') {
    event.preventDefault();
    sfx.ensure();
    bgmAudio.ensure();
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

updateSoundButton();
resetGame();
requestAnimationFrame(loop);
