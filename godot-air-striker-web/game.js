const bgmAudio = window.TapTapNeonAudio?.create('godot-air-striker-web', document.querySelector('.hud'), { theme: 'arcade', showSfxToggle: false });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hpEl = document.getElementById('hp');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const btnStart = document.getElementById('btnStart');
const btnSound = document.getElementById('btnSound');

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
let nextBossScore = 260;
let bossesDefeated = 0;
let bossWarning = 0;

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
  btnSound.textContent = `Sound: ${sfx.isEnabled() ? 'On' : 'Off'}`;
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
  comboTimer = 1.45;
  const multiplier = 1 + Math.min(1.2, Math.floor(combo / 4) * 0.2);
  score += Math.round(baseScore * multiplier);
  updateScoreUi();
  updateComboUi(multiplier);
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
  const hpMax = 420 + bossesDefeated * 170 + difficulty.level * 45;
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
  };
  bossWarning = 2.4;
  shake = 12;
  sfx.bossSpawn();
  addBurst(boss.x, boss.y, '#ffbf7e', 42, 4.5);
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

function resetGame() {
  state = 'idle';
  score = 0;
  hp = 3;
  tick = 0;
  survivalTime = 0;
  spawnTimer = 0;
  flash = 0;
  shake = 0;
  shotSfxCd = 0;
  powerupSpawnCd = 0;
  level = 1;
  nextBossScore = 260;
  bossesDefeated = 0;
  bossWarning = 0;

  player.x = W * 0.5;
  player.y = H - 94;
  player.fireCd = 0;
  player.invuln = 0;
  player.shield = 0;
  player.rapidTimer = 0;
  player.weaponTimer = 0;

  bullets = [];
  enemies = [];
  enemyBullets = [];
  particles = [];
  powerUps = [];
  boss = null;

  updateScoreUi();
  updateHpUi();
  updateLevelUi();
  resetCombo();
}

function startGame() {
  sfx.ensure();
  resetGame();
  state = 'running';
}

function endGame() {
  state = 'gameover';
  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
}

function currentFireCadence() {
  let fireCd = player.baseFireCd;
  if (player.rapidTimer > 0) fireCd *= 0.58;
  if (player.weaponTimer > 0) fireCd *= 0.86;
  if (level >= 7) fireCd *= 0.92;
  return fireCd;
}

function shoot() {
  const volley = player.weaponTimer > 0 ? 5 : 3;
  const spread = player.weaponTimer > 0 ? 0.14 : 0.11;
  const speed = 610;

  for (let i = 0; i < volley; i += 1) {
    const offset = i - (volley - 1) / 2;
    const angle = -Math.PI / 2 + offset * spread;
    bullets.push({
      x: player.x + offset * 5,
      y: player.y - 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 4,
      damage: player.weaponTimer > 0 ? 2 : 1,
      life: 1.8,
    });
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
  nextBossScore += 360 + bossesDefeated * 120;
  enemyBullets = [];
  boss = null;
}

function applyPowerUp(type) {
  if (type === 'rapid') {
    player.rapidTimer = Math.max(player.rapidTimer, 8);
  } else if (type === 'shield') {
    player.shield = Math.min(2, player.shield + 1);
  } else if (type === 'repair') {
    hp = Math.min(6, hp + 1);
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

function updateBoss(dt, difficulty) {
  if (!boss) return;

  boss.time += dt;
  const hpRatio = boss.hp / boss.maxHp;
  boss.phase = hpRatio > 0.66 ? 1 : hpRatio > 0.33 ? 2 : 3;

  if (boss.phase === 1) {
    boss.x += boss.vx * dt;
    if (boss.x < boss.r || boss.x > W - boss.r) boss.vx *= -1;
    boss.y = 92 + Math.sin(boss.time * 1.8) * 8;
  } else if (boss.phase === 2) {
    boss.x += boss.vx * 1.1 * dt;
    if (boss.x < boss.r || boss.x > W - boss.r) boss.vx *= -1;
    boss.y = 98 + Math.sin(boss.time * 2.6) * 16;
  } else {
    boss.chargeCd -= dt;
    if (boss.chargeCd <= 0) {
      boss.targetX = clamp(player.x + rand(-50, 50), boss.r, W - boss.r);
      boss.chargeCd = 1.7;
    }
    boss.x += (boss.targetX - boss.x) * Math.min(1, dt * 3.4);
    boss.y = 95 + Math.sin(boss.time * 3.9) * 18;
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

  if (boss.phase >= 2 && boss.summonCd <= 0) {
    spawnEnemy('kamikaze');
    if (Math.random() < 0.5) spawnEnemy('zigzag');
    boss.summonCd = boss.phase === 2 ? 4.3 : 3.4;
  }

  if (boss.phase === 3 && boss.patternCd <= 0) {
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      spawnEnemyBullet(boss.x, boss.y, angle, 180 * difficulty.bulletSpeed, '#ff707e', 4);
    }
    boss.patternCd = 2.2;
    shake = 10;
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

  ctx.fillStyle = '#ff9a36';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-14, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(14, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9ecff';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(-6, 2);
  ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffd372';
  ctx.fillRect(-4, 10, 8, 8);

  const flame = 8 + Math.sin(tick * 0.45) * 2 + (player.rapidTimer > 0 ? 2 : 0);
  ctx.fillStyle = '#ffde8d';
  ctx.beginPath();
  ctx.moveTo(-5, 14);
  ctx.lineTo(0, 14 + flame);
  ctx.lineTo(5, 14);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = b.damage > 1 ? '#fff8c2' : '#f7fbff';
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

  const phaseColor = boss.phase === 1 ? '#ffb888' : boss.phase === 2 ? '#ff9f95' : '#ff808d';

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
  ctx.fillStyle = 'rgba(7, 13, 27, 0.32)';
  ctx.fillRect(12, 48, 182, 48);
  ctx.fillStyle = '#d7e8ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`Difficulty: ${difficulty.label} (Lv.${difficulty.level})`, 18, 67);

  const status = [];
  if (player.rapidTimer > 0) status.push(`Rapid ${player.rapidTimer.toFixed(0)}s`);
  if (player.weaponTimer > 0) status.push(`Weapon ${player.weaponTimer.toFixed(0)}s`);
  if (player.shield > 0) status.push(`Shield ${player.shield}`);
  ctx.fillText(status.length ? status.join(' | ') : 'Status: Base Loadout', 18, 86);
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

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.46)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Game Over', W / 2, H / 2 - 26);

    ctx.font = '16px system-ui';
    ctx.fillText('Survive waves, defeat boss phases, stack combo', W / 2, H / 2 + 2);
    ctx.fillText('WASD/Arrow/Drag · Space to restart', W / 2, H / 2 + 26);

    if (state === 'gameover') {
      ctx.fillStyle = '#ffe082';
      ctx.font = 'bold 19px system-ui';
      ctx.fillText(`Final Score: ${score}`, W / 2, H / 2 + 56);
    }
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
  if (shotSfxCd > 0) shotSfxCd -= dt;
  if (powerupSpawnCd > 0) powerupSpawnCd -= dt;
  if (bossWarning > 0) bossWarning = Math.max(0, bossWarning - dt);

  updateParticles(dt);

  if (state !== 'running') return;

  survivalTime += dt;
  const difficulty = getDifficulty();
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

btnStart.addEventListener('click', () => {
  sfx.ensure();
  startGame();
});

btnSound.addEventListener('click', () => {
  sfx.ensure();
  sfx.toggle();
  updateSoundButton();
});

canvas.addEventListener('pointerdown', (event) => {
  sfx.ensure();
  updatePointer(event);
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
  keys[event.code] = true;
  if ((event.code === 'Space' || event.code === 'Enter') && state !== 'running') {
    event.preventDefault();
    sfx.ensure();
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

updateSoundButton();
resetGame();
requestAnimationFrame(loop);
