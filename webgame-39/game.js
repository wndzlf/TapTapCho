const hudEl = document.getElementById('hud');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const panelEl = document.getElementById('panel');

const hpFillEl = document.getElementById('hpFill');
const hpTextEl = document.getElementById('hpText');
const trialTextEl = document.getElementById('trialText');
const waveTextEl = document.getElementById('waveText');
const essenceTextEl = document.getElementById('essenceText');
const killTextEl = document.getElementById('killText');

const stickZoneEl = document.getElementById('stickZone');
const stickKnobEl = document.getElementById('stickKnob');
const btnDashEl = document.getElementById('btnDash');
const btnSigEl = document.getElementById('btnSig');

const bgmAudio = window.TapTapNeonAudio?.create('webgame-39', hudEl, { theme: 'mystic' });

const W = canvas.width;
const H = canvas.height;
const TAU = Math.PI * 2;

const THEME_BY_TRIAL = [
  { bgA: '#161022', bgB: '#0d0916', fog: '#3b2758' },
  { bgA: '#221322', bgB: '#120811', fog: '#5a2840' },
  { bgA: '#231713', bgB: '#140c09', fog: '#6b2d1f' },
];

const PLAYER_PRESETS = [
  {
    id: 'dawnblade',
    name: 'Dawnblade',
    icon: 'DB',
    hp: 112,
    speed: 232,
    fireRate: 7.6,
    bulletDamage: 15,
    bulletSpeed: 560,
    spread: 0.03,
    dashCd: 2.2,
    signatureCd: 9,
    signature: 'fan',
    color: '#8ed8ff',
  },
  {
    id: 'sanctum',
    name: 'Sanctum Guard',
    icon: 'SG',
    hp: 148,
    speed: 196,
    fireRate: 6.1,
    bulletDamage: 17,
    bulletSpeed: 520,
    spread: 0.01,
    dashCd: 2.8,
    signatureCd: 11,
    signature: 'nova',
    color: '#ffd889',
  },
  {
    id: 'hexrunner',
    name: 'Hex Runner',
    icon: 'HR',
    hp: 96,
    speed: 258,
    fireRate: 8.8,
    bulletDamage: 13,
    bulletSpeed: 610,
    spread: 0.045,
    dashCd: 2,
    signatureCd: 8,
    signature: 'lance',
    color: '#d2a4ff',
  },
];

const RELICS = [
  { id: 'silver_core', icon: 'ATK', name: '은빛 코어', desc: '탄환 피해 +22%', apply: (g) => { g.mods.damageMul *= 1.22; } },
  { id: 'quick_trigger', icon: 'SPD', name: '퀵 트리거', desc: '공격 속도 +20%', apply: (g) => { g.mods.fireMul *= 1.2; } },
  { id: 'hunter_boots', icon: 'MOV', name: '헌터 부츠', desc: '이동 속도 +18%', apply: (g) => { g.mods.speedMul *= 1.18; } },
  { id: 'warding_sigil', icon: 'HP', name: '워딩 시질', desc: '최대 HP +28 / 즉시 회복', apply: (g) => {
    g.player.maxHp += 28;
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 28);
  } },
  { id: 'echo_rune', icon: 'SIG', name: '에코 룬', desc: '시그니처 쿨다운 -24%', apply: (g) => { g.mods.signatureMul *= 0.76; } },
  { id: 'aegis_dash', icon: 'DSH', name: '아이기스 대시', desc: '대시 쿨다운 -28%', apply: (g) => { g.mods.dashMul *= 0.72; } },
  { id: 'blood_siphon', icon: 'LIFE', name: '블러드 사이폰', desc: '처치 시 HP +2', apply: (g) => { g.mods.onKillHeal += 2; } },
  { id: 'pierce_brand', icon: 'PEN', name: '관통 각인', desc: '탄환 관통 +1', apply: (g) => { g.mods.pierce += 1; } },
  { id: 'crit_seal', icon: 'CRIT', name: '크리트 씰', desc: '치명타 확률 +9%', apply: (g) => { g.mods.critChance += 0.09; } },
];

const state = {
  mode: 'select',
  trial: 1,
  wave: 1,
  isBossWave: false,
  kills: 0,
  essence: 0,
  score: 0,
  runTime: 0,
  player: null,
  enemies: [],
  projectiles: [],
  particles: [],
  pickups: [],
  obstacles: [],
  mods: null,
  shake: 0,
  flash: 0,
  freeze: 0,
  clearDelay: 0,
  pendingAction: '',
};

const input = {
  keys: Object.create(null),
  pointer: { x: W * 0.5, y: H * 0.5, active: false, hasAim: false },
  stick: { active: false, id: -1, x: 0, y: 0 },
};

const sfxCtx = window.AudioContext ? new AudioContext() : null;

function sfx(freq, duration = 0.08, type = 'triangle', gain = 0.03) {
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

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function len(x, y) {
  return Math.hypot(x, y);
}

function normalize(x, y) {
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.r + b.r;
  return dx * dx + dy * dy <= rr * rr;
}

function createPlayer(preset) {
  return {
    preset,
    x: W * 0.5,
    y: H * 0.66,
    r: 15,
    hp: preset.hp,
    maxHp: preset.hp,
    speed: preset.speed,
    fireRate: preset.fireRate,
    bulletDamage: preset.bulletDamage,
    bulletSpeed: preset.bulletSpeed,
    spread: preset.spread,
    dashCd: preset.dashCd,
    signatureCd: preset.signatureCd,
    fireCdLeft: 0,
    dashCdLeft: 0,
    signatureCdLeft: 0,
    dashTime: 0,
    invul: 0,
    dashDx: 0,
    dashDy: -1,
    aim: -Math.PI * 0.5,
    damageFlash: 0,
  };
}

function resetRun(preset) {
  state.mode = 'playing';
  state.trial = 1;
  state.wave = 1;
  state.isBossWave = false;
  state.kills = 0;
  state.essence = 0;
  state.score = 0;
  state.runTime = 0;
  state.enemies = [];
  state.projectiles = [];
  state.particles = [];
  state.pickups = [];
  state.clearDelay = 0;
  state.pendingAction = '';
  state.shake = 0;
  state.flash = 0;
  state.freeze = 0;
  state.player = createPlayer(preset);
  state.mods = {
    damageMul: 1,
    fireMul: 1,
    speedMul: 1,
    signatureMul: 1,
    dashMul: 1,
    onKillHeal: 0,
    pierce: 0,
    critChance: 0.08,
    critMul: 1.85,
  };

  buildArena();
  spawnEncounter();
  panelEl.classList.add('hidden');
  bgmAudio?.unlock();
  sfx(430, 0.09, 'triangle', 0.035);
  refreshHUD();
}

function buildArena() {
  state.obstacles = [];
  const amount = 5 + state.trial;
  for (let i = 0; i < amount; i += 1) {
    let tries = 0;
    while (tries < 20) {
      tries += 1;
      const r = rand(24, 48 + state.trial * 5);
      const x = rand(80, W - 80);
      const y = rand(70, H - 80);
      if (Math.hypot(x - W * 0.5, y - H * 0.56) < 120 + r) continue;
      state.obstacles.push({ x, y, r });
      break;
    }
  }
}

function makeEnemy(type, x, y) {
  if (type === 'thrall') {
    return {
      type,
      x,
      y,
      r: 12,
      hp: 34 + state.trial * 8,
      maxHp: 34 + state.trial * 8,
      speed: 86 + state.trial * 9,
      touch: 9 + state.trial,
      shotCd: 0,
      ai: rand(0.4, 1.5),
      touchCd: 0,
      vx: 0,
      vy: 0,
      tint: '#9f4b65',
    };
  }

  if (type === 'stalker') {
    return {
      type,
      x,
      y,
      r: 11,
      hp: 26 + state.trial * 7,
      maxHp: 26 + state.trial * 7,
      speed: 124 + state.trial * 10,
      touch: 8 + state.trial,
      shotCd: 0,
      ai: rand(0.2, 1.2),
      dashCd: rand(1.4, 2.4),
      touchCd: 0,
      vx: 0,
      vy: 0,
      tint: '#cf587d',
    };
  }

  if (type === 'acolyte') {
    return {
      type,
      x,
      y,
      r: 13,
      hp: 42 + state.trial * 10,
      maxHp: 42 + state.trial * 10,
      speed: 72 + state.trial * 8,
      touch: 10 + state.trial,
      shotCd: rand(0.8, 1.5),
      ai: rand(0.2, 0.8),
      touchCd: 0,
      vx: 0,
      vy: 0,
      tint: '#8350d1',
    };
  }

  return {
    type: 'boss',
    x,
    y,
    r: 34,
    hp: 560 + state.trial * 230,
    maxHp: 560 + state.trial * 230,
    speed: 62 + state.trial * 6,
    touch: 20 + state.trial * 2,
    shotCd: 1,
    burstCd: 2.4,
    summonCd: 5.6,
    touchCd: 0,
    vx: 0,
    vy: 0,
    tint: '#c9444d',
  };
}

function spawnAtEdge() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: rand(10, W - 10), y: -18 };
  if (side === 1) return { x: W + 18, y: rand(10, H - 10) };
  if (side === 2) return { x: rand(10, W - 10), y: H + 18 };
  return { x: -18, y: rand(10, H - 10) };
}

function spawnEncounter() {
  state.enemies = [];
  state.projectiles = [];
  state.pickups = [];
  state.clearDelay = 0;

  if (state.isBossWave) {
    state.enemies.push(makeEnemy('boss', W * 0.5, 90));
    bgmAudio?.fx('fail');
    return;
  }

  const count = 6 + state.trial * 3 + state.wave * 3;
  for (let i = 0; i < count; i += 1) {
    const p = spawnAtEdge();
    const roll = Math.random();
    const type = roll < 0.54 ? 'thrall' : roll < 0.82 ? 'stalker' : 'acolyte';
    state.enemies.push(makeEnemy(type, p.x, p.y));
  }
}

function createParticle(x, y, color, options = {}) {
  state.particles.push({
    x,
    y,
    vx: options.vx ?? rand(-140, 140),
    vy: options.vy ?? rand(-140, 140),
    life: options.life ?? rand(0.18, 0.38),
    maxLife: options.maxLife ?? options.life ?? rand(0.18, 0.38),
    size: options.size ?? rand(2, 4.5),
    color,
  });
}

function burst(x, y, color, amount, power = 1) {
  for (let i = 0; i < amount; i += 1) {
    const ang = rand(0, TAU);
    const spd = rand(50, 220) * power;
    createParticle(x, y, color, {
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: rand(0.12, 0.36),
      size: rand(1.8, 4.4),
    });
  }
}

function emitProjectile(data) {
  state.projectiles.push({
    x: data.x,
    y: data.y,
    vx: data.vx,
    vy: data.vy,
    r: data.r || 4,
    life: data.life || 1.3,
    team: data.team,
    dmg: data.dmg,
    color: data.color,
    pierce: data.pierce || 0,
  });
}

function nearestEnemy(x, y) {
  let found = null;
  let best = Infinity;
  for (const enemy of state.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      found = enemy;
    }
  }
  return found;
}

function getMoveVector() {
  let x = 0;
  let y = 0;
  if (input.keys.KeyW || input.keys.ArrowUp) y -= 1;
  if (input.keys.KeyS || input.keys.ArrowDown) y += 1;
  if (input.keys.KeyA || input.keys.ArrowLeft) x -= 1;
  if (input.keys.KeyD || input.keys.ArrowRight) x += 1;

  if (input.stick.active || Math.abs(input.stick.x) > 0.03 || Math.abs(input.stick.y) > 0.03) {
    x += input.stick.x;
    y += input.stick.y;
  }

  if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) return { x: 0, y: 0 };
  return normalize(x, y);
}

function getAimAngle(player, moveVec) {
  if (input.pointer.hasAim) {
    return Math.atan2(input.pointer.y - player.y, input.pointer.x - player.x);
  }

  const near = nearestEnemy(player.x, player.y);
  if (near) return Math.atan2(near.y - player.y, near.x - player.x);

  if (moveVec.x !== 0 || moveVec.y !== 0) return Math.atan2(moveVec.y, moveVec.x);
  return player.aim;
}

function triggerDash() {
  if (state.mode !== 'playing') return;
  const p = state.player;
  if (!p || p.dashCdLeft > 0 || p.dashTime > 0) return;

  const mv = getMoveVector();
  let dx = mv.x;
  let dy = mv.y;
  if (dx === 0 && dy === 0) {
    dx = Math.cos(p.aim);
    dy = Math.sin(p.aim);
  }
  const n = normalize(dx, dy);

  p.dashDx = n.x;
  p.dashDy = n.y;
  p.dashTime = 0.17;
  p.invul = 0.24;
  p.dashCdLeft = p.dashCd * state.mods.dashMul;

  state.shake = Math.max(state.shake, 8);
  burst(p.x, p.y, '#7fe6ff', 22, 1.2);
  sfx(820, 0.08, 'sawtooth', 0.032);
}

function triggerSignature() {
  if (state.mode !== 'playing') return;
  const p = state.player;
  if (!p || p.signatureCdLeft > 0) return;

  const baseDamage = p.bulletDamage * state.mods.damageMul;
  const aim = p.aim;

  if (p.preset.signature === 'fan') {
    for (let i = -4; i <= 4; i += 1) {
      const ang = aim + i * 0.12;
      emitProjectile({
        x: p.x + Math.cos(ang) * (p.r + 6),
        y: p.y + Math.sin(ang) * (p.r + 6),
        vx: Math.cos(ang) * (p.bulletSpeed + 120),
        vy: Math.sin(ang) * (p.bulletSpeed + 120),
        dmg: baseDamage * 1.24,
        team: 'player',
        color: '#a7e8ff',
        life: 1.2,
        r: 4.4,
        pierce: state.mods.pierce,
      });
    }
    burst(p.x, p.y, '#9ce7ff', 30, 1.4);
    sfx(940, 0.12, 'triangle', 0.04);
  } else if (p.preset.signature === 'nova') {
    const rays = 18;
    for (let i = 0; i < rays; i += 1) {
      const ang = (i / rays) * TAU;
      emitProjectile({
        x: p.x,
        y: p.y,
        vx: Math.cos(ang) * 440,
        vy: Math.sin(ang) * 440,
        dmg: baseDamage * 1.05,
        team: 'player',
        color: '#ffd98f',
        life: 0.85,
        r: 4,
        pierce: 1 + state.mods.pierce,
      });
    }
    p.invul = Math.max(p.invul, 0.26);
    p.hp = Math.min(p.maxHp, p.hp + 8);
    state.flash = 0.16;
    state.shake = Math.max(state.shake, 12);
    burst(p.x, p.y, '#ffdc9f', 42, 1.45);
    sfx(700, 0.13, 'square', 0.045);
  } else {
    for (let i = 0; i < 3; i += 1) {
      const ang = aim + (i - 1) * 0.06;
      emitProjectile({
        x: p.x + Math.cos(ang) * (p.r + 8),
        y: p.y + Math.sin(ang) * (p.r + 8),
        vx: Math.cos(ang) * 770,
        vy: Math.sin(ang) * 770,
        dmg: baseDamage * 1.95,
        team: 'player',
        color: '#d5a7ff',
        life: 0.62,
        r: 5.1,
        pierce: 3 + state.mods.pierce,
      });
    }
    state.shake = Math.max(state.shake, 10);
    burst(p.x, p.y, '#d0a0ff', 30, 1.4);
    sfx(1120, 0.09, 'sawtooth', 0.034);
  }

  p.signatureCdLeft = p.signatureCd * state.mods.signatureMul;
  bgmAudio?.fx('success');
}

function spawnPlayerShot(player, angle, dmgScale = 1, spread = 0) {
  const crit = Math.random() < state.mods.critChance;
  emitProjectile({
    x: player.x + Math.cos(angle) * (player.r + 5),
    y: player.y + Math.sin(angle) * (player.r + 5),
    vx: Math.cos(angle + rand(-spread, spread)) * player.bulletSpeed,
    vy: Math.sin(angle + rand(-spread, spread)) * player.bulletSpeed,
    dmg: player.bulletDamage * state.mods.damageMul * dmgScale * (crit ? state.mods.critMul : 1),
    team: 'player',
    color: crit ? '#ffe7aa' : '#b8e9ff',
    life: 1.3,
    r: crit ? 4.4 : 3.6,
    pierce: state.mods.pierce,
  });
}

function updatePlayer(dt) {
  const p = state.player;
  if (!p) return;

  p.fireCdLeft = Math.max(0, p.fireCdLeft - dt);
  p.dashCdLeft = Math.max(0, p.dashCdLeft - dt);
  p.signatureCdLeft = Math.max(0, p.signatureCdLeft - dt);
  p.dashTime = Math.max(0, p.dashTime - dt);
  p.invul = Math.max(0, p.invul - dt);
  p.damageFlash = Math.max(0, p.damageFlash - dt);

  const mv = getMoveVector();
  p.aim = getAimAngle(p, mv);

  let speed = p.speed * state.mods.speedMul;
  let vx = mv.x * speed;
  let vy = mv.y * speed;

  if (p.dashTime > 0) {
    vx = p.dashDx * 620;
    vy = p.dashDy * 620;
  }

  p.x += vx * dt;
  p.y += vy * dt;

  resolveArenaCollision(p);

  if (p.fireCdLeft <= 0 && state.enemies.length > 0) {
    const fireDelay = 1 / (p.fireRate * state.mods.fireMul);

    if (p.preset.id === 'sanctum') {
      spawnPlayerShot(p, p.aim, 1.02, p.spread);
      spawnPlayerShot(p, p.aim + 0.08, 0.7, p.spread * 0.5);
      spawnPlayerShot(p, p.aim - 0.08, 0.7, p.spread * 0.5);
    } else if (p.preset.id === 'hexrunner') {
      spawnPlayerShot(p, p.aim, 0.95, p.spread * 1.8);
      spawnPlayerShot(p, p.aim + 0.02, 0.95, p.spread * 1.8);
    } else {
      spawnPlayerShot(p, p.aim, 1, p.spread);
    }

    p.fireCdLeft = fireDelay;
    if (Math.random() < 0.28) sfx(520 + Math.random() * 90, 0.03, 'square', 0.012);
  }
}

function resolveArenaCollision(body) {
  body.x = clamp(body.x, body.r + 2, W - body.r - 2);
  body.y = clamp(body.y, body.r + 2, H - body.r - 2);

  for (const ob of state.obstacles) {
    const dx = body.x - ob.x;
    const dy = body.y - ob.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = body.r + ob.r;
    if (d < min) {
      const push = min - d;
      body.x += (dx / d) * push;
      body.y += (dy / d) * push;
    }
  }
}

function damagePlayer(amount) {
  const p = state.player;
  if (!p || p.invul > 0) return;

  p.hp -= amount;
  p.damageFlash = 0.24;
  p.invul = 0.18;
  state.shake = Math.max(state.shake, 9);
  state.flash = Math.max(state.flash, 0.06);

  burst(p.x, p.y, '#ff7a96', 14, 1.15);
  sfx(190, 0.11, 'sawtooth', 0.04);
  bgmAudio?.fx('fail');

  if (p.hp <= 0) {
    p.hp = 0;
    setDefeat();
  }
}

function damageEnemy(enemy, amount, hitAng = 0) {
  enemy.hp -= amount;
  enemy.vx += Math.cos(hitAng) * 48;
  enemy.vy += Math.sin(hitAng) * 48;

  burst(enemy.x, enemy.y, enemy.type === 'boss' ? '#ff9977' : '#ff6f94', enemy.type === 'boss' ? 9 : 5, 0.8);
  state.shake = Math.max(state.shake, enemy.type === 'boss' ? 10 : 4);
  state.freeze = Math.max(state.freeze, enemy.type === 'boss' ? 0.02 : 0.008);

  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

function killEnemy(enemy) {
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) state.enemies.splice(idx, 1);

  state.kills += 1;
  const essence = enemy.type === 'boss' ? 45 + state.trial * 20 : 5 + state.trial;
  state.essence += essence;
  state.score += essence * 10;

  if (state.mods.onKillHeal > 0) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.mods.onKillHeal);
  }

  const orbCount = enemy.type === 'boss' ? 16 : 4;
  for (let i = 0; i < orbCount; i += 1) {
    state.pickups.push({
      x: enemy.x,
      y: enemy.y,
      r: enemy.type === 'boss' ? 4.4 : 3.2,
      value: enemy.type === 'boss' ? 3 : 1,
      vx: rand(-90, 90),
      vy: rand(-90, 90),
      life: 12,
    });
  }

  burst(enemy.x, enemy.y, enemy.type === 'boss' ? '#ffc38a' : '#ff8fa8', enemy.type === 'boss' ? 40 : 12, 1.3);
  if (enemy.type === 'boss') {
    sfx(320, 0.22, 'square', 0.055);
    bgmAudio?.fx('win');
  } else {
    sfx(420 + rand(-40, 40), 0.05, 'triangle', 0.018);
  }
}

function updateEnemyAI(enemy, dt) {
  const p = state.player;
  if (!p) return;

  enemy.touchCd = Math.max(0, enemy.touchCd - dt);

  if (enemy.type === 'thrall') {
    const dir = normalize(p.x - enemy.x, p.y - enemy.y);
    enemy.vx += dir.x * enemy.speed * dt * 2.4;
    enemy.vy += dir.y * enemy.speed * dt * 2.4;
  } else if (enemy.type === 'stalker') {
    const to = normalize(p.x - enemy.x, p.y - enemy.y);
    enemy.ai -= dt;
    enemy.dashCd -= dt;

    const side = Math.sin((performance.now() * 0.001 + enemy.x * 0.01) * 2);
    enemy.vx += (to.x * 0.82 - to.y * side * 0.38) * enemy.speed * dt * 2.2;
    enemy.vy += (to.y * 0.82 + to.x * side * 0.38) * enemy.speed * dt * 2.2;

    if (enemy.dashCd <= 0) {
      enemy.vx += to.x * 140;
      enemy.vy += to.y * 140;
      enemy.dashCd = rand(1.2, 2.4);
    }
  } else if (enemy.type === 'acolyte') {
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;

    if (d > 220) {
      enemy.vx += nx * enemy.speed * dt * 1.8;
      enemy.vy += ny * enemy.speed * dt * 1.8;
    } else if (d < 150) {
      enemy.vx -= nx * enemy.speed * dt * 2.1;
      enemy.vy -= ny * enemy.speed * dt * 2.1;
    }

    enemy.ai += dt;
    enemy.vx += -ny * Math.sin(enemy.ai * 1.7) * 24 * dt;
    enemy.vy += nx * Math.sin(enemy.ai * 1.7) * 24 * dt;

    enemy.shotCd -= dt;
    if (enemy.shotCd <= 0) {
      const ang = Math.atan2(dy, dx);
      emitProjectile({
        x: enemy.x + Math.cos(ang) * (enemy.r + 4),
        y: enemy.y + Math.sin(ang) * (enemy.r + 4),
        vx: Math.cos(ang) * 300,
        vy: Math.sin(ang) * 300,
        dmg: 8 + state.trial * 1.5,
        team: 'enemy',
        color: '#c27bff',
        life: 2,
        r: 4.4,
      });
      enemy.shotCd = rand(1.1, 1.9);
      sfx(240, 0.05, 'square', 0.012);
    }
  } else if (enemy.type === 'boss') {
    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;

    enemy.vx += nx * enemy.speed * dt * 1.2;
    enemy.vy += ny * enemy.speed * dt * 1.2;

    enemy.shotCd -= dt;
    enemy.burstCd -= dt;
    enemy.summonCd -= dt;

    if (enemy.shotCd <= 0) {
      const ang = Math.atan2(dy, dx);
      for (let i = -2; i <= 2; i += 1) {
        const a = ang + i * 0.13;
        emitProjectile({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(a) * 320,
          vy: Math.sin(a) * 320,
          dmg: 12 + state.trial * 2,
          team: 'enemy',
          color: '#ff7896',
          life: 2,
          r: 5,
        });
      }
      enemy.shotCd = 1.35;
      sfx(180, 0.08, 'sawtooth', 0.024);
    }

    if (enemy.burstCd <= 0) {
      const n = 14;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * TAU + rand(-0.06, 0.06);
        emitProjectile({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(a) * 240,
          vy: Math.sin(a) * 240,
          dmg: 10 + state.trial * 1.5,
          team: 'enemy',
          color: '#ff95a9',
          life: 2.5,
          r: 4.2,
        });
      }
      enemy.burstCd = 2.8;
      state.shake = Math.max(state.shake, 7);
      burst(enemy.x, enemy.y, '#ffb1c2', 28, 1.1);
    }

    if (enemy.summonCd <= 0) {
      for (let i = 0; i < 3 + state.trial; i += 1) {
        const a = rand(0, TAU);
        const rr = rand(70, 150);
        state.enemies.push(makeEnemy('stalker', enemy.x + Math.cos(a) * rr, enemy.y + Math.sin(a) * rr));
      }
      enemy.summonCd = 6.8;
      burst(enemy.x, enemy.y, '#ffc38a', 24, 1.2);
    }
  }

  enemy.vx *= 0.89;
  enemy.vy *= 0.89;

  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  resolveArenaCollision(enemy);

  if (circleHit(enemy, p) && enemy.touchCd <= 0) {
    damagePlayer(enemy.touch);
    enemy.touchCd = 0.45;
    const push = normalize(enemy.x - p.x, enemy.y - p.y);
    enemy.vx += push.x * 120;
    enemy.vy += push.y * 120;
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) updateEnemyAI(enemy, dt);
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const b = state.projectiles[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40 || b.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (b.team === 'player') {
      let removed = false;
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const e = state.enemies[j];
        if (!circleHit(b, e)) continue;

        const ang = Math.atan2(b.vy, b.vx);
        damageEnemy(e, b.dmg, ang);

        if (b.pierce > 0) {
          b.pierce -= 1;
          b.dmg *= 0.82;
        } else {
          state.projectiles.splice(i, 1);
          removed = true;
        }
        break;
      }
      if (removed) continue;
    } else {
      if (circleHit(b, state.player)) {
        damagePlayer(b.dmg);
        state.projectiles.splice(i, 1);
      }
    }
  }
}

function updatePickups(dt) {
  const p = state.player;

  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const orb = state.pickups[i];
    orb.life -= dt;
    if (orb.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }

    const dx = p.x - orb.x;
    const dy = p.y - orb.y;
    const d = Math.hypot(dx, dy) || 1;

    if (d < 180) {
      const pull = clamp((180 - d) / 180, 0.06, 1);
      orb.vx += (dx / d) * 260 * pull * dt;
      orb.vy += (dy / d) * 260 * pull * dt;
    }

    orb.vx *= 0.94;
    orb.vy *= 0.94;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;

    if (d < p.r + orb.r + 3) {
      state.essence += orb.value;
      state.score += orb.value * 2;
      state.pickups.splice(i, 1);
      if (Math.random() < 0.3) sfx(860, 0.02, 'triangle', 0.01);
    }
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
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
}

function handleEncounterClear(dt) {
  if (state.enemies.length > 0) {
    state.clearDelay = 0;
    return;
  }

  state.clearDelay += dt;
  if (state.clearDelay < 0.35) return;
  state.clearDelay = 0;

  if (state.isBossWave) {
    if (state.trial >= 3) {
      setVictory();
      return;
    }

    state.trial += 1;
    state.wave = 1;
    state.isBossWave = false;
    state.pendingAction = 'next-trial';
    showRelicPanel('시련 돌파! 다음 지역으로 이동하기 전 강화를 선택하세요.');
    return;
  }

  if (state.wave >= 3) {
    state.isBossWave = true;
    spawnEncounter();
    refreshHUD();
    return;
  }

  state.wave += 1;
  state.pendingAction = 'next-wave';
  showRelicPanel('사냥 보상. 하나를 선택하면 다음 웨이브가 시작됩니다.');
}

function applyRelic(id) {
  const relic = RELICS.find((r) => r.id === id);
  if (!relic) return;
  relic.apply(state);
  state.score += 50;
  bgmAudio?.fx('success');
  sfx(540, 0.07, 'triangle', 0.024);
}

function showRelicPanel(message) {
  state.mode = 'upgrade';
  panelEl.classList.remove('hidden');

  const picks = [];
  const pool = [...RELICS];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }

  panelEl.innerHTML = `
    <div class="modal">
      <h2>Relic Choice</h2>
      <p>${message}</p>
      <div class="choice-grid">
        ${picks.map((r) => `
          <button class="choice" type="button" data-action="relic" data-id="${r.id}">
            <span class="tag">${r.icon}</span>
            <strong>${r.name}</strong>
            <small>${r.desc}</small>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function showClassPanel() {
  state.mode = 'select';
  panelEl.classList.remove('hidden');
  panelEl.innerHTML = `
    <div class="modal">
      <h2>Vampire Hunt</h2>
      <p>헌터를 선택하면 즉시 전투가 시작됩니다.</p>
      <div class="choice-grid">
        ${PLAYER_PRESETS.map((preset) => `
          <button class="choice" type="button" data-action="class" data-id="${preset.id}">
            <span class="tag">${preset.icon}</span>
            <strong>${preset.name}</strong>
            <small>HP ${preset.hp} · SPD ${Math.round(preset.speed)} · SIG ${(preset.signatureCd).toFixed(1)}s</small>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function setDefeat() {
  state.mode = 'dead';
  panelEl.classList.remove('hidden');
  panelEl.innerHTML = `
    <div class="modal">
      <h2>사냥 실패</h2>
      <p>Trial ${state.trial} · 처치 ${state.kills} · 에센스 ${state.essence}</p>
      <div class="choice-grid">
        <button class="choice" type="button" data-action="restart">
          <span class="tag">RST</span>
          <strong>다시 시작</strong>
          <small>헌터 선택 화면으로 돌아갑니다.</small>
        </button>
      </div>
    </div>
  `;
}

function setVictory() {
  state.mode = 'victory';
  panelEl.classList.remove('hidden');
  panelEl.innerHTML = `
    <div class="modal">
      <h2>사냥 성공</h2>
      <p>최종 기록: Trial 3 클리어 · 처치 ${state.kills} · 에센스 ${state.essence}</p>
      <div class="choice-grid">
        <button class="choice" type="button" data-action="restart">
          <span class="tag">NEW</span>
          <strong>새 런 시작</strong>
          <small>다른 헌터 조합으로 다시 도전합니다.</small>
        </button>
      </div>
    </div>
  `;
  bgmAudio?.fx('win');
  sfx(510, 0.14, 'triangle', 0.034);
}

function refreshHUD() {
  const p = state.player;
  if (!p) return;

  const hpRatio = clamp(p.hp / p.maxHp, 0, 1);
  hpFillEl.style.width = `${(hpRatio * 100).toFixed(1)}%`;
  hpTextEl.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
  trialTextEl.textContent = String(state.trial);
  waveTextEl.textContent = state.isBossWave ? `${state.wave} (BOSS)` : String(state.wave);
  essenceTextEl.textContent = String(Math.floor(state.essence));
  killTextEl.textContent = String(state.kills);

  updateSkillButton(btnDashEl, p.dashCdLeft, p.dashCd * state.mods.dashMul, '#6dd6ff');
  updateSkillButton(btnSigEl, p.signatureCdLeft, p.signatureCd * state.mods.signatureMul, '#ffd88f');
}

function updateSkillButton(button, cdLeft, cdMax, color) {
  const ratio = cdMax > 0 ? clamp(1 - cdLeft / cdMax, 0, 1) : 1;
  const angle = Math.round(ratio * 360);
  button.style.background = `conic-gradient(${color} ${angle}deg, rgba(19,15,38,0.8) ${angle}deg 360deg)`;
  button.classList.toggle('ready', ratio >= 1);
  button.classList.toggle('cooling', ratio < 1);
}

function drawBackground() {
  const theme = THEME_BY_TRIAL[state.trial - 1] || THEME_BY_TRIAL[0];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.bgA);
  grad.addColorStop(1, theme.bgB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = theme.fog;
  for (let i = 0; i < 8; i += 1) {
    const x = (i * 127 + state.runTime * 23) % (W + 240) - 120;
    const y = ((i * 191 + state.runTime * 14) % (H + 180)) - 90;
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.arc(x, y, 90 + (i % 3) * 26, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawObstacles() {
  for (const ob of state.obstacles) {
    const g = ctx.createRadialGradient(ob.x - ob.r * 0.2, ob.y - ob.r * 0.2, 4, ob.x, ob.y, ob.r);
    g.addColorStop(0, 'rgba(100,75,122,0.78)');
    g.addColorStop(1, 'rgba(26,20,40,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ob.r, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(190,156,235,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ob.r - 3, 0, TAU);
    ctx.stroke();
  }
}

function drawPickups() {
  for (const orb of state.pickups) {
    ctx.fillStyle = '#f6d97e';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawProjectiles() {
  for (const b of state.projectiles) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    if (e.type === 'boss') {
      ctx.fillStyle = '#2f0f14';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8, 0, TAU);
      ctx.fill();

      ctx.fillStyle = e.tint;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#ffd9b0';
      ctx.beginPath();
      ctx.arc(e.x - 10, e.y - 8, 3.2, 0, TAU);
      ctx.arc(e.x + 10, e.y - 8, 3.2, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#26112a';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 3, 0, TAU);
      ctx.fill();

      ctx.fillStyle = e.tint;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#ffd6df';
      ctx.beginPath();
      ctx.arc(e.x - e.r * 0.28, e.y - e.r * 0.2, 1.8, 0, TAU);
      ctx.arc(e.x + e.r * 0.28, e.y - e.r * 0.2, 1.8, 0, TAU);
      ctx.fill();
    }
  }

  const boss = state.enemies.find((e) => e.type === 'boss');
  if (boss) {
    const bw = 380;
    const bh = 14;
    const x = (W - bw) * 0.5;
    const y = 16;
    const ratio = clamp(boss.hp / boss.maxHp, 0, 1);

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = '#ff6b8a';
    ctx.fillRect(x, y, bw * ratio, bh);
    ctx.strokeStyle = '#ffbfd0';
    ctx.strokeRect(x, y, bw, bh);
  }
}

function drawPlayer() {
  const p = state.player;
  if (!p) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.aim + Math.PI * 0.5);

  if (p.invul > 0) {
    ctx.globalAlpha = 0.55;
  }

  ctx.fillStyle = '#12223a';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(13, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(-13, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = p.preset.color;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(9, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fill();

  if (p.damageFlash > 0) {
    ctx.fillStyle = 'rgba(255,130,150,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 8, 0, TAU);
    ctx.fill();
  }

  ctx.restore();

  if (state.mode === 'playing') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.aim) * 24, p.y + Math.sin(p.aim) * 24);
    ctx.stroke();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFx() {
  if (state.flash > 0) {
    ctx.globalAlpha = clamp(state.flash * 3.2, 0, 0.5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function render() {
  ctx.save();

  if (state.shake > 0) {
    const power = state.shake;
    ctx.translate(rand(-power, power), rand(-power, power));
  }

  drawBackground();
  drawObstacles();
  drawPickups();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawFx();

  ctx.restore();
}

function step(dt) {
  if (state.mode !== 'playing') {
    render();
    return;
  }

  state.runTime += dt;
  state.shake = Math.max(0, state.shake - dt * 24);
  state.flash = Math.max(0, state.flash - dt * 2.4);
  state.freeze = Math.max(0, state.freeze - dt);

  const simDt = state.freeze > 0 ? dt * 0.2 : dt;

  updatePlayer(simDt);
  updateEnemies(simDt);
  updateProjectiles(simDt);
  updatePickups(simDt);
  updateParticles(simDt);
  handleEncounterClear(simDt);

  refreshHUD();
  render();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  requestAnimationFrame(frame);
}

function onRelicChosen(id) {
  applyRelic(id);

  if (state.pendingAction === 'next-trial') {
    buildArena();
    state.isBossWave = false;
    state.pendingAction = '';
    state.mode = 'playing';
    spawnEncounter();
    panelEl.classList.add('hidden');
    refreshHUD();
    return;
  }

  if (state.pendingAction === 'next-wave') {
    state.pendingAction = '';
    state.mode = 'playing';
    spawnEncounter();
    panelEl.classList.add('hidden');
    refreshHUD();
  }
}

panelEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  if (action === 'class') {
    const preset = PLAYER_PRESETS.find((p) => p.id === button.dataset.id);
    if (preset) resetRun(preset);
    return;
  }

  if (action === 'relic') {
    onRelicChosen(button.dataset.id);
    return;
  }

  if (action === 'restart') {
    showClassPanel();
  }
});

window.addEventListener('keydown', (event) => {
  input.keys[event.code] = true;

  if (event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    event.preventDefault();
    triggerDash();
  }
  if (event.code === 'KeyQ' || event.code === 'KeyE') {
    event.preventDefault();
    triggerSignature();
  }
});

window.addEventListener('keyup', (event) => {
  input.keys[event.code] = false;
});

function syncPointer(event) {
  const rect = canvas.getBoundingClientRect();
  input.pointer.x = (event.clientX - rect.left) * (W / rect.width);
  input.pointer.y = (event.clientY - rect.top) * (H / rect.height);
  input.pointer.hasAim = true;
}

canvas.addEventListener('pointermove', (event) => {
  syncPointer(event);
});

canvas.addEventListener('pointerdown', (event) => {
  syncPointer(event);
  bgmAudio?.unlock();
});

canvas.addEventListener('pointerleave', () => {
  input.pointer.hasAim = false;
});

function updateStick(clientX, clientY) {
  const rect = stickZoneEl.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const max = 40;
  const d = Math.hypot(dx, dy);
  if (d > max) {
    dx = (dx / d) * max;
    dy = (dy / d) * max;
  }

  input.stick.x = dx / max;
  input.stick.y = dy / max;
  stickKnobEl.style.left = `${44 + dx}px`;
  stickKnobEl.style.top = `${44 + dy}px`;
}

function resetStick() {
  input.stick.active = false;
  input.stick.id = -1;
  input.stick.x = 0;
  input.stick.y = 0;
  stickKnobEl.style.left = '44px';
  stickKnobEl.style.top = '44px';
}

stickZoneEl.addEventListener('pointerdown', (event) => {
  input.stick.active = true;
  input.stick.id = event.pointerId;
  updateStick(event.clientX, event.clientY);
  stickZoneEl.setPointerCapture(event.pointerId);
  bgmAudio?.unlock();
});

stickZoneEl.addEventListener('pointermove', (event) => {
  if (!input.stick.active || input.stick.id !== event.pointerId) return;
  updateStick(event.clientX, event.clientY);
});

stickZoneEl.addEventListener('pointerup', (event) => {
  if (input.stick.id !== event.pointerId) return;
  resetStick();
});

stickZoneEl.addEventListener('pointercancel', (event) => {
  if (input.stick.id !== event.pointerId) return;
  resetStick();
});

btnDashEl.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  triggerDash();
  bgmAudio?.unlock();
});

btnSigEl.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  triggerSignature();
  bgmAudio?.unlock();
});

showClassPanel();
refreshHUD();
requestAnimationFrame(frame);
