const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const shieldEl = document.getElementById('shield');
const dashEl = document.getElementById('dash');
const challengeTextEl = document.getElementById('challengeText');
const challengeFillEl = document.getElementById('challengeFill');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnSound = document.getElementById('btnSound');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnDash = document.getElementById('btnDash');

const W = canvas.width;
const H = canvas.height;

const BEST_KEY = 'lane-dash-best-v4';
const SOUND_KEY = 'lane-dash-sound-v4';

const lanes = [W * 0.23, W * 0.5, W * 0.77];

const player = {
  lane: 1,
  targetLane: 1,
  x: lanes[1],
  y: H - 120,
  w: 44,
  h: 58,
  moveSpeed: 16,
  invuln: 0,
  tilt: 0,
};

let state = 'idle'; // idle | running | paused | gameover
let scoreFloat = 0;
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let distance = 0;
let elapsed = 0;
let worldSpeed = 270;
let spawnTimer = 0;
let roadTick = 0;
let flash = 0;
let shake = 0;
let comboCount = 0;
let comboTimer = 0;
let shield = 0;
let coinCount = 0;
let slowTimer = 0;
let overdriveTimer = 0;
let scorePop = 0;
let dashCharge = 20;
let dashActive = 0;
let dashCooldown = 0;
let dashHits = 0;

let obstacles = [];
let pickups = [];
let particles = [];

const pointer = { active: false, downX: 0, swiped: false };

const challengePool = [
  { type: 'survive', label: '생존', base: 22 },
  { type: 'coins', label: '코인', base: 6 },
  { type: 'near', label: '근접회피', base: 5 },
  { type: 'dash', label: '대시 파괴', base: 4 },
];

let challenge = {
  type: 'survive',
  label: '생존',
  target: 22,
  progress: 0,
  done: false,
};

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

function createSfx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let enabled = localStorage.getItem(SOUND_KEY) !== 'off';

  function ensure() {
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone({ freq = 440, endFreq = null, type = 'triangle', gain = 0.05, duration = 0.08 }) {
    if (!enabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq != null) osc.frequency.linearRampToValueAtTime(endFreq, now + duration);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
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
    start() {
      tone({ freq: 510, endFreq: 740, gain: 0.05, duration: 0.12 });
    },
    move() {
      tone({ freq: 350, endFreq: 490, gain: 0.03, duration: 0.05 });
    },
    coin() {
      tone({ freq: 760, endFreq: 1040, gain: 0.04, duration: 0.09 });
    },
    hit() {
      tone({ freq: 180, endFreq: 90, type: 'sawtooth', gain: 0.07, duration: 0.14 });
    },
    shield() {
      tone({ freq: 420, endFreq: 880, type: 'triangle', gain: 0.05, duration: 0.12 });
    },
    challenge() {
      tone({ freq: 480, endFreq: 920, type: 'square', gain: 0.06, duration: 0.12 });
    },
    near() {
      tone({ freq: 640, endFreq: 540, gain: 0.03, duration: 0.05 });
    },
    dash() {
      tone({ freq: 240, endFreq: 920, type: 'square', gain: 0.06, duration: 0.14 });
    },
    over() {
      tone({ freq: 130, endFreq: 70, type: 'sawtooth', gain: 0.08, duration: 0.2 });
    },
  };
}

const sfx = createSfx();

function updateSoundButton() {
  btnSound.textContent = `사운드: ${sfx.isEnabled() ? '켜짐' : '꺼짐'}`;
}

function addParticleBurst(x, y, color, count = 12, spread = 3.2) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: rand(-spread, spread),
      vy: rand(-spread, spread),
      life: rand(20, 34),
      size: rand(2, 4),
      color,
    });
  }

  if (particles.length > 220) particles.splice(0, particles.length - 220);
}

function scoreMultiplier() {
  return 1 + Math.min(2.4, Math.floor(comboCount / 4) * 0.2 + (overdriveTimer > 0 ? 0.3 : 0) + (dashActive > 0 ? 0.2 : 0));
}

function addScore(points) {
  scoreFloat += points * scoreMultiplier();
  score = Math.floor(scoreFloat);
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);
  comboEl.textContent = `x${scoreMultiplier().toFixed(1)}`;
  shieldEl.textContent = String(shield);
  dashEl.textContent = `${Math.round(dashCharge)}%`;
}

function setChallenge() {
  const base = challengePool[Math.floor(Math.random() * challengePool.length)];
  const extra = Math.floor((level - 1) * 0.6);
  challenge = {
    type: base.type,
    label: base.label,
    target: base.base + extra,
    progress: 0,
    done: false,
  };
  updateChallengeUi();
}

function updateChallengeUi() {
  const progress = Math.min(challenge.target, Math.floor(challenge.progress));
  challengeTextEl.textContent = `${challenge.label} ${progress}/${challenge.target}`;
  const ratio = clamp(challenge.progress / Math.max(1, challenge.target), 0, 1);
  challengeFillEl.style.width = `${ratio * 100}%`;
}

function addChallengeProgress(type, amount) {
  if (challenge.done || challenge.type !== type) return;
  challenge.progress += amount;
  if (challenge.progress >= challenge.target) {
    challenge.progress = challenge.target;
    challenge.done = true;
    const bonus = 190 + level * 30;
    addScore(bonus);
    shield = Math.min(2, shield + 1);
    dashCharge = Math.min(100, dashCharge + 15);
    scorePop = bonus;
    addParticleBurst(player.x, player.y - 30, '#ffd08e', 24, 3.9);
    sfx.challenge();
    setTimeout(() => {
      if (state === 'running') setChallenge();
    }, 700);
  }
  updateChallengeUi();
}

function obstacleSize(type) {
  if (type === 'fast') return { w: 34, h: 46 };
  if (type === 'gate') return { w: 46, h: 64 };
  if (type === 'drifter') return { w: 42, h: 52 };
  return { w: 46, h: 56 };
}

function spawnObstacle(laneIndex, type = 'normal') {
  const size = obstacleSize(type);
  const speedMul = type === 'fast' ? 1.35 : type === 'gate' ? 1.05 : type === 'drifter' ? 1.12 : 1;

  obstacles.push({
    lane: laneIndex,
    x: lanes[laneIndex],
    y: -size.h - rand(8, 30),
    w: size.w,
    h: size.h,
    type,
    speedMul,
    drift: type === 'drifter' ? rand(-0.9, 0.9) : 0,
    nearGiven: false,
  });
}

function spawnPickup(type, laneIndex) {
  pickups.push({
    type,
    lane: laneIndex,
    x: lanes[laneIndex],
    y: -26,
    r: 12,
    vyMul: rand(0.86, 1.08),
    spin: rand(0, Math.PI * 2),
  });
}

function spawnPattern() {
  const roll = Math.random();

  if (level < 3) {
    if (roll < 0.62) {
      spawnObstacle(Math.floor(Math.random() * 3), Math.random() < 0.23 ? 'fast' : 'normal');
    } else {
      const safe = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i += 1) {
        if (i !== safe) spawnObstacle(i, 'normal');
      }
    }
  } else if (level < 6) {
    if (roll < 0.45) {
      const lane = Math.floor(Math.random() * 3);
      spawnObstacle(lane, 'fast');
      if (Math.random() < 0.4) spawnObstacle((lane + 2) % 3, 'normal');
    } else if (roll < 0.82) {
      const safe = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i += 1) {
        if (i !== safe) spawnObstacle(i, 'gate');
      }
    } else {
      spawnObstacle(Math.floor(Math.random() * 3), 'drifter');
    }
  } else {
    if (roll < 0.36) {
      spawnObstacle(Math.floor(Math.random() * 3), 'fast');
      spawnObstacle(Math.floor(Math.random() * 3), 'drifter');
    } else if (roll < 0.7) {
      const safe = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i += 1) {
        if (i !== safe) spawnObstacle(i, Math.random() < 0.35 ? 'fast' : 'gate');
      }
    } else {
      spawnObstacle(Math.floor(Math.random() * 3), 'drifter');
      if (Math.random() < 0.55) spawnObstacle(Math.floor(Math.random() * 3), 'fast');
    }
  }

  if (Math.random() < 0.36) {
    const lane = Math.floor(Math.random() * 3);
    const p = Math.random();
    if (p < 0.66) spawnPickup('coin', lane);
    else if (p < 0.84) spawnPickup('shield', lane);
    else if (p < 0.94) spawnPickup('slow', lane);
    else spawnPickup('overdrive', lane);
  }
}

function resetGame() {
  state = 'idle';
  scoreFloat = 0;
  score = 0;
  level = 1;
  distance = 0;
  elapsed = 0;
  worldSpeed = 270;
  spawnTimer = 0.8;
  roadTick = 0;
  flash = 0;
  shake = 0;
  comboCount = 0;
  comboTimer = 0;
  shield = 0;
  coinCount = 0;
  slowTimer = 0;
  overdriveTimer = 0;
  scorePop = 0;
  dashCharge = 20;
  dashActive = 0;
  dashCooldown = 0;
  dashHits = 0;

  obstacles = [];
  pickups = [];
  particles = [];

  player.lane = 1;
  player.targetLane = 1;
  player.x = lanes[1];
  player.invuln = 0;
  player.tilt = 0;

  setChallenge();
  updateHud();
}

function startGame() {
  sfx.ensure();
  resetGame();
  state = 'running';
  btnStart.textContent = '재시작';
  sfx.start();
}

function endGame() {
  state = 'gameover';
  best = Math.max(best, score);
  localStorage.setItem(BEST_KEY, String(best));
  updateHud();
  sfx.over();
}

function togglePause() {
  if (state === 'running') state = 'paused';
  else if (state === 'paused') state = 'running';
}

function moveLane(direction) {
  if (state !== 'running') return;
  const next = clamp(player.targetLane + direction, 0, 2);
  if (next === player.targetLane) return;
  player.targetLane = next;
  player.tilt = direction * 0.2;
  comboTimer = Math.max(0, comboTimer - 0.08);
  sfx.move();
}

function activateDash() {
  if (state !== 'running') return;
  if (dashCooldown > 0 || dashCharge < 35) return;
  dashCharge = Math.max(0, dashCharge - 35);
  dashActive = 0.95;
  dashCooldown = 1.1;
  player.invuln = Math.max(player.invuln, 0.95);
  scorePop = 60;
  addParticleBurst(player.x, player.y - 16, '#ffd08e', 22, 4.2);
  sfx.dash();
}

function difficultyUpdate(dt) {
  level = clamp(1 + Math.floor(distance / 860), 1, 12);
  const base = 260 + (level - 1) * 18;
  let mod = 1;
  if (slowTimer > 0) mod *= 0.72;
  if (overdriveTimer > 0) mod *= 1.1;
  if (dashActive > 0) mod *= 1.18;
  worldSpeed = base * mod;

  const spawnInterval = clamp(1.14 - level * 0.065, 0.4, 1.14);
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnPattern();
    spawnTimer = spawnInterval * rand(0.84, 1.16);
  }
}

function updatePlayer(dt) {
  const tx = lanes[player.targetLane];
  player.x = lerp(player.x, tx, clamp(dt * player.moveSpeed, 0, 1));
  player.tilt = lerp(player.tilt, 0, clamp(dt * 8, 0, 1));
  player.invuln = Math.max(0, player.invuln - dt);
}

function playerBox() {
  return {
    x: player.x - player.w * 0.5,
    y: player.y - player.h * 0.5,
    w: player.w,
    h: player.h,
  };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function damagePlayer() {
  if (player.invuln > 0) return;

  if (shield > 0) {
    shield -= 1;
    player.invuln = 1.0;
    flash = 10;
    shake = 7;
    addParticleBurst(player.x, player.y, '#9dffbe', 18, 3.4);
    sfx.shield();
    return;
  }

  flash = 18;
  shake = 14;
  addParticleBurst(player.x, player.y, '#ff96b4', 30, 4.6);
  sfx.hit();
  endGame();
}

function updateObstacles(dt) {
  const pBox = playerBox();

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];

    if (obstacle.type === 'drifter') {
      const laneFloat = obstacle.lane + obstacle.drift * dt;
      obstacle.drift = clamp(obstacle.drift + rand(-0.45, 0.45) * dt, -0.95, 0.95);
      obstacle.lane = clamp(laneFloat, 0, 2);
      obstacle.x = lerp(obstacle.x, lanes[Math.round(obstacle.lane)], clamp(dt * 6, 0, 1));
    }

    obstacle.y += worldSpeed * obstacle.speedMul * dt;

    const box = {
      x: obstacle.x - obstacle.w * 0.5,
      y: obstacle.y,
      w: obstacle.w,
      h: obstacle.h,
    };

    if (!obstacle.nearGiven) {
      const dx = Math.abs(obstacle.x - player.x);
      const dy = Math.abs((obstacle.y + obstacle.h * 0.5) - player.y);
      if (dx > 44 && dx < 92 && dy < 32) {
        obstacle.nearGiven = true;
        comboCount += 1;
        comboTimer = 2.3;
        addScore(16);
        dashCharge = Math.min(100, dashCharge + 6);
        addChallengeProgress('near', 1);
        sfx.near();
      }
    }

    if (overlap(pBox, box)) {
      if (dashActive > 0) {
        obstacles.splice(i, 1);
        comboCount += 1;
        dashHits += 1;
        addScore(42);
        addChallengeProgress('dash', 1);
        addParticleBurst(obstacle.x, obstacle.y + obstacle.h * 0.5, '#ffd08e', 16, 3.5);
        continue;
      }

      obstacles.splice(i, 1);
      damagePlayer();
      continue;
    }

    if (obstacle.y > H + 80) obstacles.splice(i, 1);
  }
}

function applyPickup(type) {
  if (type === 'coin') {
    coinCount += 1;
    comboCount += 1;
    comboTimer = 2.8;
    addScore(24);
    dashCharge = Math.min(100, dashCharge + 4);
    addChallengeProgress('coins', 1);
    scorePop = 24;
    sfx.coin();
  } else if (type === 'shield') {
    shield = Math.min(2, shield + 1);
    addScore(20);
    sfx.shield();
  } else if (type === 'slow') {
    slowTimer = Math.max(slowTimer, 4.8);
    addScore(18);
    sfx.shield();
  } else if (type === 'overdrive') {
    overdriveTimer = Math.max(overdriveTimer, 6.5);
    dashCharge = Math.min(100, dashCharge + 10);
    addScore(30);
    sfx.challenge();
  }

  addParticleBurst(player.x, player.y - 10, '#ffe3a1', 14, 2.6);
}

function updatePickups(dt) {
  const pBox = playerBox();

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    pickup.y += worldSpeed * pickup.vyMul * dt;
    pickup.spin += dt * 6;

    const box = { x: pickup.x - 12, y: pickup.y - 12, w: 24, h: 24 };
    if (overlap(pBox, box)) {
      applyPickup(pickup.type);
      pickups.splice(i, 1);
      continue;
    }

    if (pickup.y > H + 40) pickups.splice(i, 1);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= dt * 60;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function update(dt) {
  updateParticles(dt);

  if (state !== 'running') return;

  elapsed += dt;
  distance += worldSpeed * dt;
  roadTick += worldSpeed * dt * 0.2;

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) comboCount = 0;
  }

  if (slowTimer > 0) slowTimer -= dt;
  if (overdriveTimer > 0) overdriveTimer -= dt;
  if (dashActive > 0) dashActive -= dt;
  if (dashCooldown > 0) dashCooldown -= dt;

  dashCharge = Math.min(100, dashCharge + dt * (7 + level * 0.25));

  addScore(dt * (5.9 + level * 1.2));

  difficultyUpdate(dt);
  updatePlayer(dt);
  updateObstacles(dt);
  updatePickups(dt);

  addChallengeProgress('survive', dt);

  score = Math.floor(scoreFloat);
  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  if (flash > 0) flash -= 1;
  if (shake > 0) shake = Math.max(0, shake - dt * 36);
  if (scorePop > 0) scorePop = Math.max(0, scorePop - dt * 90);

  updateChallengeUi();
  updateHud();
}

function drawRoad() {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#16366e');
  grd.addColorStop(1, '#0b1736');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  for (let i = 1; i < 3; i += 1) {
    const x = (W * i) / 3;
    ctx.strokeStyle = 'rgba(130, 180, 255, 0.28)';
    ctx.setLineDash([20, 18]);
    ctx.lineDashOffset = -roadTick * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (let i = 0; i < 52; i += 1) {
    const sx = (i * 83 + 17) % W;
    const sy = (i * 57 + roadTick * 1.4) % H;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(255, 255, 255, 0.21)' : 'rgba(150, 190, 255, 0.17)';
    ctx.fillRect(sx, sy, 2, 2);
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt);

  if (player.invuln > 0) ctx.globalAlpha = 0.45 + Math.sin(roadTick * 0.1) * 0.25;

  if (shield > 0) {
    ctx.strokeStyle = 'rgba(157, 255, 190, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 34 + Math.sin(roadTick * 0.12) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (dashActive > 0) {
    ctx.strokeStyle = 'rgba(255, 210, 140, 0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 30 + Math.sin(roadTick * 0.18) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = dashActive > 0 ? '#ffca84' : '#9dd8ff';
  ctx.fillRect(-22, -26, 44, 58);

  ctx.fillStyle = '#d7edff';
  ctx.fillRect(-12, -16, 24, 22);

  ctx.fillStyle = '#ffea9a';
  ctx.fillRect(-18, 28, 8, 4);
  ctx.fillRect(10, 28, 8, 4);

  ctx.fillStyle = '#83f2ff';
  ctx.fillRect(-18, -26, 8, 5);
  ctx.fillRect(10, -26, 8, 5);

  ctx.restore();
  ctx.globalAlpha = 1;
}

function obstacleColor(type) {
  if (type === 'fast') return '#79e6ff';
  if (type === 'gate') return '#ffd792';
  if (type === 'drifter') return '#b59dff';
  return '#9dd8ff';
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y + obstacle.h * 0.5);

    ctx.fillStyle = obstacleColor(obstacle.type);
    ctx.fillRect(-obstacle.w * 0.5, -obstacle.h * 0.5, obstacle.w, obstacle.h);

    ctx.fillStyle = '#16345f';
    ctx.fillRect(-obstacle.w * 0.3, -obstacle.h * 0.2, obstacle.w * 0.6, obstacle.h * 0.34);

    ctx.restore();
  }
}

function drawPickups() {
  for (const pickup of pickups) {
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(pickup.spin);

    let fill = '#ffe4a0';
    let label = '$';
    if (pickup.type === 'shield') {
      fill = '#9dffbe';
      label = 'S';
    } else if (pickup.type === 'slow') {
      fill = '#9fd8ff';
      label = 'T';
    } else if (pickup.type === 'overdrive') {
      fill = '#ffb0e0';
      label = 'O';
    }

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, pickup.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d2048';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 30);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawTopInfo() {
  ctx.fillStyle = 'rgba(3, 10, 26, 0.35)';
  ctx.fillRect(12, 12, 240, 74);
  ctx.fillStyle = '#d5e7ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`속도 ${Math.round(worldSpeed)} · 레벨 ${level}`, 18, 34);
  ctx.fillText(`코인 ${coinCount} · 대시 파괴 ${dashHits}`, 18, 52);
  ctx.fillText(`거리 ${Math.round(distance / 10)}m · 대시 ${Math.round(dashCharge)}%`, 18, 70);

  if (scorePop > 0) {
    ctx.fillStyle = '#ffd08e';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`+${Math.round(scorePop)}`, W - 14, 32);
  }
}

function drawOverlay() {
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 126, 168, ${0.05 + flash / 200})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state === 'paused') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText('일시정지', W / 2, H / 2 - 6);
    ctx.font = '16px system-ui';
    ctx.fillText('일시정지 버튼으로 재개', W / 2, H / 2 + 24);
  }

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px system-ui';
    ctx.fillText(state === 'idle' ? 'Tap to Start' : 'Game Over', W / 2, H / 2 - 20);

    ctx.font = '16px system-ui';
    ctx.fillText('스와이프/버튼으로 레인 전환', W / 2, H / 2 + 8);
    ctx.fillText('대시로 장애물을 파괴하고 점수를 가속', W / 2, H / 2 + 30);

    if (state === 'gameover') {
      ctx.fillStyle = '#ffe29f';
      ctx.font = 'bold 20px system-ui';
      ctx.fillText(`최종 점수 ${score}`, W / 2, H / 2 + 62);
    }
  }
}

function render() {
  let sx = 0;
  let sy = 0;
  if (shake > 0) {
    sx = rand(-shake, shake);
    sy = rand(-shake, shake);
  }

  ctx.save();
  ctx.translate(sx, sy);

  drawRoad();
  drawObstacles();
  drawPickups();
  drawPlayer();
  drawParticles();
  drawTopInfo();
  drawOverlay();

  ctx.restore();
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

function startOrRestart() {
  if (state === 'running') {
    startGame();
    return;
  }
  if (state === 'paused') {
    state = 'running';
    return;
  }
  startGame();
}

btnStart.addEventListener('click', startOrRestart);

btnPause.addEventListener('click', () => {
  if (state === 'idle' || state === 'gameover') return;
  togglePause();
});

btnSound.addEventListener('click', () => {
  sfx.ensure();
  sfx.toggle();
  updateSoundButton();
});

btnLeft.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  moveLane(-1);
});

btnRight.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  moveLane(1);
});

btnDash.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  activateDash();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    e.preventDefault();
    moveLane(-1);
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    e.preventDefault();
    moveLane(1);
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') {
    e.preventDefault();
    activateDash();
  }
  if ((e.code === 'Space' || e.code === 'Enter') && state !== 'running') {
    e.preventDefault();
    startGame();
  }
  if (e.code === 'KeyP') {
    e.preventDefault();
    if (state === 'running' || state === 'paused') togglePause();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  sfx.ensure();
  pointer.active = true;
  pointer.downX = e.clientX;
  pointer.swiped = false;

  if (state === 'idle' || state === 'gameover') {
    startGame();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x < rect.width * 0.4) moveLane(-1);
  else if (x > rect.width * 0.6) moveLane(1);
  else activateDash();
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointer.active || state !== 'running') return;
  const dx = e.clientX - pointer.downX;
  if (Math.abs(dx) < 44 || pointer.swiped) return;
  pointer.swiped = true;
  moveLane(dx > 0 ? 1 : -1);
});

window.addEventListener('pointerup', () => {
  pointer.active = false;
});

updateSoundButton();
resetGame();
requestAnimationFrame(loop);
