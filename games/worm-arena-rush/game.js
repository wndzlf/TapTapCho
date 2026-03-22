const bgmAudio = window.TapTapNeonAudio?.create('webgame-37', document.querySelector('.hud'), {
  mediaSrc: './assets/audio/coffee-morning-coffee-shop-music.mp3',
  bgmLabels: { on: '배경음 켜짐', off: '배경음 꺼짐' },
  sfxLabels: { on: '효과음 켜짐', off: '효과음 꺼짐' },
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const zoneEl = document.getElementById('zone');
const speedEl = document.getElementById('speed');
const lengthEl = document.getElementById('length');
const bestLengthEl = document.getElementById('bestLength');
const aliveEl = document.getElementById('alive');
const btnStart = document.getElementById('btnStart');
const btnFullscreen = document.getElementById('btnFullscreen');
const turnPad = document.getElementById('turnPad');
const turnKnob = document.getElementById('turnKnob');
const wrap = document.querySelector('.wrap');
const arena = document.querySelector('.arena');

const W = canvas.width;
const H = canvas.height;

const WORLD_W = 2600;
const WORLD_H = 2600;
const SAFE_CENTER = { x: WORLD_W * 0.5, y: WORLD_H * 0.5 };
const FOOD_COUNT = 210;
const BOT_COUNT = 10;
const SEG_SPACING = 14;
const ROUND_DURATION = 90;
const SAFE_RADIUS_START = 1080;
const SAFE_RADIUS_END = 260;
const SPAWN_GRACE_DURATION = 3;
const TURN_PAD_MAX = 42;
const TURN_PAD_DEADZONE = 0.18;
const SCORE_MILESTONE_STEP = 20;
const LENGTH_MILESTONE_STEP = 6;
const KILL_SCORE_MIN = 10;
const KILL_SCORE_SCALE = 0.75;
const MAX_CELEBRATION_PARTICLES = 220;
const MAX_CELEBRATION_FLYOUTS = 8;
const MAX_CELEBRATION_BANNERS = 2;
const STORAGE_KEY = 'worm-arena-rush-best';
const BEST_LENGTH_KEY = 'worm-arena-rush-best-length';
const PSEUDO_FULLSCREEN_CLASS = 'is-pseudo-fullscreen';
const OPPONENT_BODY_START = 0;
const isTouchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || (navigator.maxTouchPoints || 0) > 0;

const FOOD_COLORS = ['#ff7b74', '#ffe08a', '#9df2ff', '#b8ffa2', '#f7b8ff'];

let state = 'idle'; // idle | running | gameover
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
let bestLength = Number(localStorage.getItem(BEST_LENGTH_KEY) || 0);
let tick = 0;
let roundElapsed = 0;
let roundProgress = 0;
let safeRadius = SAFE_RADIUS_START;
let speedMultiplier = 1;
let gameOverReason = 'idle';

let player;
let bots = [];
let foods = [];
let rocks = [];
let camera = { x: 0, y: 0 };
let celebrationParticles = [];
let celebrationFlyouts = [];
let celebrationBanners = [];
let screenPulse = 0;
let screenPulseTint = '255, 211, 114';
let nextScoreMilestone = SCORE_MILESTONE_STEP;
let nextLengthMilestone = LENGTH_MILESTONE_STEP;
let previousPlayerLength = 0;

const pointer = { x: W * 0.5, y: H * 0.5, hasMoved: false, active: false, pointerId: null };
const keys = Object.create(null);
const turnStick = {
  active: false,
  pointerId: null,
  dx: 0,
  dy: 0,
  strength: 0,
  angle: 0,
};

bestEl.textContent = String(best);

const audioCtx = window.AudioContext ? new AudioContext() : null;

function beep(freq, duration, gain = 0.02, delay = 0) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const startAt = now + Math.max(0, delay);
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(Math.max(0.0001, gain), startAt);
  amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function getNextMilestone(value, step) {
  return Math.max(step, (Math.floor(value / step) + 1) * step);
}

function stabilizeViewport() {
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  window.requestAnimationFrame(() => {
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  });
}

function preventBrowserGesture(event) {
  if (event?.cancelable) {
    event.preventDefault();
  }
  stabilizeViewport();
}

function angleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function pointSegmentDistanceSq(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 0.000001) return distSq(px, py, ax, ay);

  const apx = px - ax;
  const apy = py - ay;
  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  return distSq(px, py, closestX, closestY);
}

function orientation(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function isPointOnSegment(px, py, ax, ay, bx, by) {
  return (
    px >= Math.min(ax, bx) - 0.0001
    && px <= Math.max(ax, bx) + 0.0001
    && py >= Math.min(ay, by) - 0.0001
    && py <= Math.max(ay, by) + 0.0001
  );
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);

  const hasOppositeA = (o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0);
  const hasOppositeB = (o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0);
  if (hasOppositeA && hasOppositeB) return true;

  if (Math.abs(o1) <= 0.0001 && isPointOnSegment(cx, cy, ax, ay, bx, by)) return true;
  if (Math.abs(o2) <= 0.0001 && isPointOnSegment(dx, dy, ax, ay, bx, by)) return true;
  if (Math.abs(o3) <= 0.0001 && isPointOnSegment(ax, ay, cx, cy, dx, dy)) return true;
  if (Math.abs(o4) <= 0.0001 && isPointOnSegment(bx, by, cx, cy, dx, dy)) return true;

  return false;
}

function segmentSegmentDistanceSq(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;

  return Math.min(
    pointSegmentDistanceSq(ax, ay, cx, cy, dx, dy),
    pointSegmentDistanceSq(bx, by, cx, cy, dx, dy),
    pointSegmentDistanceSq(cx, cy, ax, ay, bx, by),
    pointSegmentDistanceSq(dx, dy, ax, ay, bx, by),
  );
}

function getSegmentRadius(worm, index) {
  const t = 1 - index / worm.segments.length;
  return worm.radius * (0.68 + t * 0.34);
}

function isInsideSafeZone(x, y, margin = 0) {
  const limit = Math.max(36, safeRadius - margin);
  return distSq(x, y, SAFE_CENTER.x, SAFE_CENTER.y) <= limit * limit;
}

function sampleSafePoint(margin = 40, minRadius = 0) {
  const maxRadius = Math.max(48, safeRadius - margin);
  const innerRadius = Math.max(0, Math.min(minRadius, maxRadius - 12));
  const innerSq = innerRadius * innerRadius;
  const outerSq = maxRadius * maxRadius;

  for (let i = 0; i < 28; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const radius = Math.sqrt(rand(innerSq, outerSq));
    const x = SAFE_CENTER.x + Math.cos(angle) * radius;
    const y = SAFE_CENTER.y + Math.sin(angle) * radius;
    if (x > 28 && x < WORLD_W - 28 && y > 28 && y < WORLD_H - 28) {
      return { x, y };
    }
  }

  return { x: SAFE_CENTER.x, y: SAFE_CENTER.y };
}

function updateHud() {
  scoreEl.textContent = String(score);
  lengthEl.textContent = String(player?.segments.length ?? 0);
  bestLengthEl.textContent = String(bestLength);
  aliveEl.textContent = String(bots.length);
  timeEl.textContent = `${Math.max(0, ROUND_DURATION - roundElapsed).toFixed(1)}초`;
  zoneEl.textContent = `${Math.round((safeRadius / SAFE_RADIUS_START) * 100)}%`;
  speedEl.textContent = `${Math.round(speedMultiplier * 100)}%`;
}

function syncBestLength() {
  const currentLength = player?.segments.length ?? 0;
  if (currentLength > bestLength) {
    bestLength = currentLength;
    localStorage.setItem(BEST_LENGTH_KEY, String(bestLength));
  }
}

function setScreenPulse(strength = 0.18, tint = '255, 211, 114') {
  screenPulse = Math.max(screenPulse, strength);
  screenPulseTint = tint;
}

function playCelebrationChord(rootFreq, gain = 0.024) {
  beep(rootFreq, 0.05, gain, 0);
  beep(rootFreq * 1.25, 0.08, gain * 0.85, 0.045);
  beep(rootFreq * 1.5, 0.12, gain * 0.72, 0.09);
}

function emitCelebrationBurst(x, y, options = {}) {
  const count = Math.max(1, Math.round(options.count ?? 14));
  const colors = options.colors || ['#ffd372', '#fff2a6', '#9df2ff', '#ffb36b'];
  const minSpeed = options.minSpeed ?? 68;
  const maxSpeed = options.maxSpeed ?? 220;
  const lifeMin = options.lifeMin ?? 0.32;
  const lifeMax = options.lifeMax ?? 0.74;
  const sizeMin = options.sizeMin ?? 3.2;
  const sizeMax = options.sizeMax ?? 7.6;
  const gravity = options.gravity ?? 22;
  const driftX = options.driftX ?? 0;
  const driftY = options.driftY ?? 0;

  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(minSpeed, maxSpeed);
    const life = rand(lifeMin, lifeMax);
    celebrationParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed + driftX,
      vy: Math.sin(angle) * speed + driftY,
      life,
      maxLife: life,
      size: rand(sizeMin, sizeMax),
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity,
      drag: rand(0.88, 0.94),
      shape: Math.random() < 0.34 ? 'diamond' : 'orb',
      rotation: rand(0, Math.PI * 2),
      spin: rand(-8, 8),
    });
  }

  if (celebrationParticles.length > MAX_CELEBRATION_PARTICLES) {
    celebrationParticles.splice(0, celebrationParticles.length - MAX_CELEBRATION_PARTICLES);
  }
}

function addCelebrationFlyout(text, x, y, options = {}) {
  celebrationFlyouts.push({
    text,
    x,
    y,
    life: options.life ?? 0.9,
    maxLife: options.life ?? 0.9,
    vy: options.vy ?? -34,
    color: options.color || '#fff0ba',
    accent: options.accent || 'rgba(9, 16, 34, 0.72)',
    size: options.size ?? 18,
  });

  if (celebrationFlyouts.length > MAX_CELEBRATION_FLYOUTS) {
    celebrationFlyouts.splice(0, celebrationFlyouts.length - MAX_CELEBRATION_FLYOUTS);
  }
}

function addCelebrationBanner(title, subtitle, tone = 'score') {
  celebrationBanners.push({
    title,
    subtitle,
    tone,
    life: 1.7,
    maxLife: 1.7,
  });

  if (celebrationBanners.length > MAX_CELEBRATION_BANNERS) {
    celebrationBanners.splice(0, celebrationBanners.length - MAX_CELEBRATION_BANNERS);
  }
}

function triggerScoreMilestone(targetScore, originX, originY) {
  emitCelebrationBurst(originX, originY, {
    count: 28,
    minSpeed: 110,
    maxSpeed: 260,
    lifeMin: 0.48,
    lifeMax: 0.92,
    colors: ['#ffd372', '#fff6c1', '#9df2ff', '#ff9b73'],
  });
  addCelebrationBanner(`점수 ${targetScore}`, '속도를 유지하면 더 크게 터집니다', 'score');
  addCelebrationFlyout(`Score ${targetScore}!`, originX, originY - 12, {
    color: '#fff1a7',
    size: 22,
    life: 1.08,
    vy: -42,
  });
  setScreenPulse(0.26, '255, 219, 128');
  playCelebrationChord(660, 0.028);
}

function triggerLengthGain(lengthValue, isMilestone = false) {
  emitCelebrationBurst(player.x, player.y, {
    count: isMilestone ? 24 : 10,
    minSpeed: isMilestone ? 96 : 54,
    maxSpeed: isMilestone ? 220 : 136,
    lifeMin: isMilestone ? 0.42 : 0.24,
    lifeMax: isMilestone ? 0.86 : 0.52,
    colors: isMilestone
      ? ['#ffcf70', '#ffe7a8', '#ff9d3a', '#fff5d3']
      : ['#ffd372', '#ffb96f', '#fff1c2'],
    gravity: isMilestone ? 20 : 14,
  });

  if (isMilestone) {
    addCelebrationBanner(`길이 ${lengthValue}`, '몸집이 커졌습니다. 급회전을 줄이세요', 'length');
    addCelebrationFlyout(`Length ${lengthValue}!`, player.x, player.y - 18, {
      color: '#ffd986',
      size: 21,
      life: 1,
      vy: -40,
    });
    setScreenPulse(0.18, '255, 196, 105');
    playCelebrationChord(560, 0.024);
  } else {
    setScreenPulse(0.08, '255, 196, 105');
  }
}

function triggerKillCelebration(deadBot, bonusScore) {
  emitCelebrationBurst(deadBot.x, deadBot.y, {
    count: 30,
    minSpeed: 120,
    maxSpeed: 280,
    lifeMin: 0.46,
    lifeMax: 0.96,
    colors: [deadBot.bodyColor, '#fff6ca', '#ffcf70', '#9df2ff'],
  });
  addCelebrationFlyout(`격추 +${bonusScore}`, deadBot.x, deadBot.y - 10, {
    color: '#ffe88f',
    size: 22,
    life: 1.1,
    vy: -46,
  });
  setScreenPulse(0.22, '255, 209, 114');
  beep(920, 0.05, 0.022, 0);
  beep(1280, 0.09, 0.016, 0.04);
}

function awardPlayerScore(points, originX = player?.x ?? W * 0.5, originY = player?.y ?? H * 0.5) {
  if (!Number.isFinite(points) || points <= 0) return false;
  score += Math.round(points);
  updateHud();

  let hitMilestone = false;
  while (score >= nextScoreMilestone) {
    triggerScoreMilestone(nextScoreMilestone, originX, originY);
    nextScoreMilestone += SCORE_MILESTONE_STEP;
    hitMilestone = true;
  }

  return hitMilestone;
}

function updateCelebrationEffects(dt) {
  screenPulse = Math.max(0, screenPulse - dt * 1.28);

  celebrationParticles = celebrationParticles.filter((particle) => {
    particle.life -= dt;
    if (particle.life <= 0) return false;
    particle.vx *= particle.drag;
    particle.vy = particle.vy * particle.drag + particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rotation += particle.spin * dt;
    return true;
  });

  celebrationFlyouts = celebrationFlyouts.filter((flyout) => {
    flyout.life -= dt;
    if (flyout.life <= 0) return false;
    flyout.y += flyout.vy * dt;
    return true;
  });

  celebrationBanners = celebrationBanners.filter((banner) => {
    banner.life -= dt;
    return banner.life > 0;
  });
}

function updatePlayerProgressFeedback() {
  const currentLength = player?.segments.length ?? 0;
  if (currentLength <= 0) return;

  if (currentLength > previousPlayerLength) {
    for (let len = previousPlayerLength + 1; len <= currentLength; len += 1) {
      const milestoneHit = len >= nextLengthMilestone;
      triggerLengthGain(len, milestoneHit);
      if (milestoneHit) {
        while (len >= nextLengthMilestone) {
          nextLengthMilestone += LENGTH_MILESTONE_STEP;
        }
      }
    }
  }

  previousPlayerLength = currentLength;
  syncBestLength();
}

function updateRoundPressure() {
  roundProgress = clamp(roundElapsed / ROUND_DURATION, 0, 1);
  safeRadius = lerp(SAFE_RADIUS_START, SAFE_RADIUS_END, Math.pow(roundProgress, 1.08));
  speedMultiplier = lerp(1, 2.05, Math.pow(roundProgress, 1.08));
  updateHud();
}

function makeFood() {
  const point = sampleSafePoint(42);
  return {
    x: point.x,
    y: point.y,
    r: rand(4.5, 7.5),
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
    value: 1,
  };
}

function makeRocks() {
  rocks = [];
  for (let i = 0; i < 220; i += 1) {
    rocks.push({
      x: rand(0, WORLD_W),
      y: rand(0, WORLD_H),
      r: rand(8, 28),
      a: rand(0.05, 0.16),
      rot: rand(0, Math.PI * 2),
    });
  }
}

function makeBot(spawnGrace = 0) {
  const spawn = sampleSafePoint(140, Math.min(280, safeRadius * 0.3));
  return createWorm({
    x: spawn.x,
    y: spawn.y,
    angle: rand(0, Math.PI * 2),
    segCount: 12 + Math.floor(rand(0, 8)),
    turnSpeed: rand(2.2, 3.5),
    baseSpeed: rand(126, 156),
    radius: rand(7.4, 8.8),
    headColor: '#e6f3ff',
    bodyColor: `hsl(${Math.floor(rand(180, 340))} 78% 62%)`,
    eyeColor: '#0d1a34',
    isPlayer: false,
    spawnGrace,
  });
}

function createWorm(options) {
  const segCount = options.segCount;
  const segments = [];
  for (let i = 0; i < segCount; i += 1) {
    const x = options.x - Math.cos(options.angle) * i * SEG_SPACING;
    const y = options.y - Math.sin(options.angle) * i * SEG_SPACING;
    segments.push({
      x,
      y,
      prevX: x,
      prevY: y,
    });
  }

  return {
    x: options.x,
    y: options.y,
    prevX: options.x,
    prevY: options.y,
    angle: options.angle,
    targetAngle: options.angle,
    turnSpeed: options.turnSpeed,
    baseSpeed: options.baseSpeed,
    radius: options.radius,
    headColor: options.headColor,
    bodyColor: options.bodyColor,
    eyeColor: options.eyeColor,
    segments,
    grow: 0,
    isPlayer: Boolean(options.isPlayer),
    aiTimer: 0,
    targetFood: -1,
    seed: rand(0, 9999),
    spawnGrace: Math.max(0, Number(options.spawnGrace || 0)),
  };
}

function resetGame() {
  state = 'idle';
  score = 0;
  tick = 0;
  roundElapsed = 0;
  roundProgress = 0;
  safeRadius = SAFE_RADIUS_START;
  speedMultiplier = 1;
  gameOverReason = 'idle';
  celebrationParticles = [];
  celebrationFlyouts = [];
  celebrationBanners = [];
  screenPulse = 0;
  screenPulseTint = '255, 211, 114';
  nextScoreMilestone = SCORE_MILESTONE_STEP;

  player = createWorm({
    x: WORLD_W * 0.5,
    y: WORLD_H * 0.5,
    angle: -0.35,
    segCount: 18,
    turnSpeed: 4.7,
    baseSpeed: 170,
    radius: 9.5,
    headColor: '#ffb347',
    bodyColor: '#ff932e',
    eyeColor: '#fff',
    isPlayer: true,
  });

  bots = [];
  for (let i = 0; i < BOT_COUNT; i += 1) {
    bots.push(makeBot());
  }

  foods = Array.from({ length: FOOD_COUNT }, () => makeFood());
  if (rocks.length === 0) makeRocks();

  camera.x = clamp(player.x - W * 0.5, 0, WORLD_W - W);
  camera.y = clamp(player.y - H * 0.5, 0, WORLD_H - H);

  scoreEl.textContent = '0';
  previousPlayerLength = player.segments.length;
  nextLengthMilestone = getNextMilestone(previousPlayerLength, LENGTH_MILESTONE_STEP);
  syncBestLength();
  updateHud();
  updateFullscreenButton();
}

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  bgmAudio?.unlock();
  resetTurnStick();
  resetGame();
  state = 'running';
  stabilizeViewport();
  updateFullscreenButton();
}

function endGame(reason = 'crash') {
  if (state === 'gameover') return;
  state = 'gameover';
  gameOverReason = reason;
  beep(gameOverReason === 'time' ? 320 : 160, 0.24, 0.06);

  syncBestLength();
  best = Math.max(best, score);
  bestEl.textContent = String(best);
  localStorage.setItem(STORAGE_KEY, String(best));
  updateHud();
  updateFullscreenButton();
}

function updatePlayerTarget() {
  let inputX = 0;
  let inputY = 0;

  if (keys.ArrowUp || keys.KeyW) inputY -= 1;
  if (keys.ArrowDown || keys.KeyS) inputY += 1;
  if (keys.ArrowLeft || keys.KeyA) inputX -= 1;
  if (keys.ArrowRight || keys.KeyD) inputX += 1;

  if (inputX !== 0 || inputY !== 0) {
    player.targetAngle = Math.atan2(inputY, inputX);
    return;
  }

  if (turnStick.active || turnStick.strength > 0) {
    if (turnStick.strength >= TURN_PAD_DEADZONE) {
      player.targetAngle = turnStick.angle;
    }
    return;
  }

  if (!pointer.hasMoved) return;

  const tx = camera.x + pointer.x;
  const ty = camera.y + pointer.y;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 22) return;
  player.targetAngle = Math.atan2(dy, dx);
}

function updateBotTarget(bot, dt) {
  bot.aiTimer -= dt;

  if (bot.aiTimer <= 0 || !foods[bot.targetFood]) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < 18; i += 1) {
      const idx = Math.floor(Math.random() * foods.length);
      const f = foods[idx];
      const d = distSq(bot.x, bot.y, f.x, f.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    }

    bot.targetFood = bestIdx;
    bot.aiTimer = rand(0.18, 0.54);
  }

  const target = foods[bot.targetFood];
  if (!target) return;

  bot.targetAngle = Math.atan2(target.y - bot.y, target.x - bot.x) + rand(-0.14, 0.14);
}

function moveWorm(worm, dt) {
  for (const segment of worm.segments) {
    segment.prevX = segment.x;
    segment.prevY = segment.y;
  }

  const turnStep = worm.turnSpeed * dt;
  const diff = angleDiff(worm.targetAngle, worm.angle);
  worm.angle += clamp(diff, -turnStep, turnStep);

  let speed = worm.baseSpeed * speedMultiplier;
  if (!worm.isPlayer) {
    speed += Math.sin((tick + worm.seed) * 0.035) * (14 * speedMultiplier);
  }

  worm.prevX = worm.x;
  worm.prevY = worm.y;
  worm.x += Math.cos(worm.angle) * speed * dt;
  worm.y += Math.sin(worm.angle) * speed * dt;

  worm.x = clamp(worm.x, 14, WORLD_W - 14);
  worm.y = clamp(worm.y, 14, WORLD_H - 14);

  worm.segments[0].x = worm.x;
  worm.segments[0].y = worm.y;

  for (let i = 1; i < worm.segments.length; i += 1) {
    const prev = worm.segments[i - 1];
    const seg = worm.segments[i];
    const dx = seg.x - prev.x;
    const dy = seg.y - prev.y;
    const dist = Math.hypot(dx, dy) || 0.0001;

    if (dist > SEG_SPACING) {
      const k = (dist - SEG_SPACING) / dist;
      seg.x -= dx * k;
      seg.y -= dy * k;
    }
  }

  while (worm.grow >= 1) {
    const tail = worm.segments[worm.segments.length - 1];
    worm.segments.push({
      x: tail.x,
      y: tail.y,
      prevX: tail.prevX ?? tail.x,
      prevY: tail.prevY ?? tail.y,
    });
    worm.grow -= 1;
  }
}

function updateSpawnGrace(dt) {
  for (const bot of bots) {
    if (bot.spawnGrace > 0) {
      bot.spawnGrace = Math.max(0, bot.spawnGrace - dt);
    }
  }
}

function consumeFood(worm) {
  for (let i = 0; i < foods.length; i += 1) {
    const food = foods[i];
    const rr = worm.radius + food.r + 2;
    if (distSq(worm.x, worm.y, food.x, food.y) > rr * rr) continue;

    foods[i] = makeFood();
    worm.grow += worm.isPlayer ? 0.95 : 0.62;

    if (worm.isPlayer) {
      const hitMilestone = awardPlayerScore(food.value, food.x, food.y);

      if (hitMilestone) {
        continue;
      }

      if (score % 10 === 0) {
        beep(820, 0.045, 0.02);
      } else {
        beep(560, 0.018, 0.01);
      }
    }
  }
}

function headHitsHead(headWorm, otherWorm) {
  const headFromX = headWorm.prevX ?? headWorm.x;
  const headFromY = headWorm.prevY ?? headWorm.y;
  const headToX = headWorm.x;
  const headToY = headWorm.y;
  const otherFromX = otherWorm.prevX ?? otherWorm.x;
  const otherFromY = otherWorm.prevY ?? otherWorm.y;
  const otherToX = otherWorm.x;
  const otherToY = otherWorm.y;
  const hitRadius = headWorm.radius + otherWorm.radius + 2;

  return (
    segmentSegmentDistanceSq(
      headFromX,
      headFromY,
      headToX,
      headToY,
      otherFromX,
      otherFromY,
      otherToX,
      otherToY,
    ) <= hitRadius * hitRadius
  );
}

function headHitsBody(headWorm, bodyWorm, bodyStart = OPPONENT_BODY_START) {
  const headFromX = headWorm.prevX ?? headWorm.x;
  const headFromY = headWorm.prevY ?? headWorm.y;
  const headToX = headWorm.x;
  const headToY = headWorm.y;

  for (let i = bodyStart; i < bodyWorm.segments.length - 1; i += 1) {
    const segA = bodyWorm.segments[i];
    const segB = bodyWorm.segments[i + 1];
    const bodyRadius = Math.max(getSegmentRadius(bodyWorm, i), getSegmentRadius(bodyWorm, i + 1));
    const hitRadius = headWorm.radius + bodyRadius + 2.5;
    const distanceSq = Math.min(
      segmentSegmentDistanceSq(
        headFromX,
        headFromY,
        headToX,
        headToY,
        segA.x,
        segA.y,
        segB.x,
        segB.y,
      ),
      segmentSegmentDistanceSq(
        headFromX,
        headFromY,
        headToX,
        headToY,
        segA.prevX ?? segA.x,
        segA.prevY ?? segA.y,
        segB.prevX ?? segB.x,
        segB.prevY ?? segB.y,
      ),
    );

    if (distanceSq <= hitRadius * hitRadius) {
      return true;
    }
  }
  return false;
}

function scatterFoodFromWorm(worm, density = 14) {
  const stride = Math.max(2, Math.floor(worm.segments.length / density));
  for (let i = 4; i < worm.segments.length; i += stride) {
    const seg = worm.segments[i];
    let x = clamp(seg.x + rand(-8, 8), 32, WORLD_W - 32);
    let y = clamp(seg.y + rand(-8, 8), 32, WORLD_H - 32);

    if (!isInsideSafeZone(x, y, 24)) {
      const safeDrop = sampleSafePoint(40);
      x = safeDrop.x;
      y = safeDrop.y;
    }

    foods.push({
      x,
      y,
      r: rand(4.5, 7.0),
      color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
      value: 1,
    });
  }

  while (foods.length > FOOD_COUNT + 120) {
    foods.shift();
  }
}

function resolveCollisions() {
  for (const bot of bots) {
    if (bot.spawnGrace > 0) continue;
    if (headHitsHead(player, bot) || headHitsBody(player, bot, OPPONENT_BODY_START)) {
      endGame();
      return;
    }
  }

  const deadBots = [];

  for (let i = 0; i < bots.length; i += 1) {
    const bot = bots[i];
    if (bot.spawnGrace > 0) continue;
    const crashedIntoPlayer = headHitsHead(bot, player) || headHitsBody(bot, player, OPPONENT_BODY_START);
    let crashed = crashedIntoPlayer;

    if (!crashed) {
      for (let j = 0; j < bots.length; j += 1) {
        if (i === j) continue;
        if (bots[j].spawnGrace > 0) continue;
        if (headHitsHead(bot, bots[j]) || headHitsBody(bot, bots[j], OPPONENT_BODY_START)) {
          crashed = true;
          break;
        }
      }
    }

    if (crashed) {
      deadBots.push({
        index: i,
        byPlayer: crashedIntoPlayer,
      });
    }
  }

  if (deadBots.length === 0) return;

  deadBots.sort((a, b) => b.index - a.index);
  let hadNonPlayerCrash = false;

  for (const entry of deadBots) {
    const deadBot = bots[entry.index];
    if (!deadBot) continue;

    if (entry.byPlayer) {
      const bonusScore = Math.max(KILL_SCORE_MIN, Math.round(deadBot.segments.length * KILL_SCORE_SCALE));
      awardPlayerScore(bonusScore, deadBot.x, deadBot.y);
      triggerKillCelebration(deadBot, bonusScore);
    } else {
      hadNonPlayerCrash = true;
    }

    scatterFoodFromWorm(deadBot, 16);
    bots.splice(entry.index, 1);
  }

  if (hadNonPlayerCrash) {
    beep(760, 0.05, 0.02);
  }
}

function resolveSafeZone() {
  if (!isInsideSafeZone(player.x, player.y, player.radius + 6)) {
    endGame('zone');
    return;
  }

  const deadBotIndexes = [];
  for (let i = 0; i < bots.length; i += 1) {
    const bot = bots[i];
    if (!isInsideSafeZone(bot.x, bot.y, bot.radius + 6)) {
      deadBotIndexes.push(i);
    }
  }

  if (deadBotIndexes.length === 0) return;

  deadBotIndexes.sort((a, b) => b - a);
  for (const idx of deadBotIndexes) {
    const deadBot = bots[idx];
    scatterFoodFromWorm(deadBot, 14);
    bots.splice(idx, 1);
  }

  beep(240, 0.03, 0.02);
}

function drawWorm(worm) {
  const isInactive = !worm.isPlayer && worm.spawnGrace > 0;

  ctx.save();
  if (isInactive) {
    ctx.globalAlpha = 0.45;
  }

  for (let i = worm.segments.length - 1; i >= 0; i -= 1) {
    const seg = worm.segments[i];
    const sx = seg.x - camera.x;
    const sy = seg.y - camera.y;

    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;

    const t = 1 - i / worm.segments.length;
    const r = worm.radius * (0.68 + t * 0.34);

    ctx.fillStyle = worm.bodyColor;
    ctx.shadowColor = worm.bodyColor;
    ctx.shadowBlur = worm.isPlayer ? 10 : 5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  const hx = worm.x - camera.x;
  const hy = worm.y - camera.y;

  ctx.fillStyle = worm.headColor;
  ctx.beginPath();
  ctx.arc(hx, hy, worm.radius + 2, 0, Math.PI * 2);
  ctx.fill();

  const nx = Math.cos(worm.angle);
  const ny = Math.sin(worm.angle);
  const lx = -ny;
  const ly = nx;

  const eyeOffset = worm.radius * 0.45;
  const eyeForward = worm.radius * 0.55;

  ctx.fillStyle = worm.eyeColor;
  ctx.beginPath();
  ctx.arc(hx + nx * eyeForward + lx * eyeOffset, hy + ny * eyeForward + ly * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.arc(hx + nx * eyeForward - lx * eyeOffset, hy + ny * eyeForward - ly * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0b1225';
  ctx.beginPath();
  ctx.arc(hx + nx * eyeForward + lx * eyeOffset, hy + ny * eyeForward + ly * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.arc(hx + nx * eyeForward - lx * eyeOffset, hy + ny * eyeForward - ly * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.fill();

  if (isInactive) {
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(hx, hy, worm.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f5fbff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px "Noto Sans KR", system-ui';
    ctx.fillText(`비활성 ${worm.spawnGrace.toFixed(1)}초`, hx, hy - worm.radius - 12);
  }

  ctx.restore();
}

function renderTurnStick() {
  if (!turnKnob || !turnPad) return;
  turnKnob.style.transform = `translate(${turnStick.dx}px, ${turnStick.dy}px)`;
  turnPad.classList.toggle('is-active', turnStick.active || turnStick.strength > TURN_PAD_DEADZONE);
}

function resetTurnStick() {
  turnStick.active = false;
  turnStick.pointerId = null;
  turnStick.dx = 0;
  turnStick.dy = 0;
  turnStick.strength = 0;
  renderTurnStick();
}

function updateTurnStickFromEvent(event) {
  if (!turnPad) return;

  const rect = turnPad.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const rawDx = event.clientX - centerX;
  const rawDy = event.clientY - centerY;
  const rawDistance = Math.hypot(rawDx, rawDy);
  const clampedDistance = Math.min(TURN_PAD_MAX, rawDistance);
  const scale = rawDistance > 0 ? clampedDistance / rawDistance : 0;

  turnStick.dx = rawDx * scale;
  turnStick.dy = rawDy * scale;
  turnStick.strength = TURN_PAD_MAX > 0 ? clampedDistance / TURN_PAD_MAX : 0;

  if (clampedDistance > 0.0001) {
    turnStick.angle = Math.atan2(turnStick.dy, turnStick.dx);
  }

  renderTurnStick();
}

function drawSafeZone() {
  const x = SAFE_CENTER.x - camera.x;
  const y = SAFE_CENTER.y - camera.y;

  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 18, 0.48)';
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(x, y, safeRadius, 0, Math.PI * 2, true);
  ctx.fill('evenodd');

  ctx.lineWidth = 4;
  ctx.strokeStyle = `rgba(255, 109, 82, ${0.62 + Math.sin(tick * 0.18) * 0.12})`;
  ctx.shadowColor = 'rgba(255, 130, 92, 0.45)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMiniMap() {
  const size = 108;
  const x = W - size - 12;
  const y = 12;

  ctx.fillStyle = 'rgba(4, 8, 24, 0.72)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(230, 240, 255, 0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(255, 109, 82, 0.78)';
  ctx.beginPath();
  ctx.arc(
    x + (SAFE_CENTER.x / WORLD_W) * size,
    y + (SAFE_CENTER.y / WORLD_H) * size,
    (safeRadius / WORLD_W) * size,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < foods.length; i += 8) {
    const f = foods[i];
    const mx = x + (f.x / WORLD_W) * size;
    const my = y + (f.y / WORLD_H) * size;
    ctx.fillStyle = '#dce6ff';
    ctx.fillRect(mx, my, 1.6, 1.6);
  }

  for (const bot of bots) {
    const mx = x + (bot.x / WORLD_W) * size;
    const my = y + (bot.y / WORLD_H) * size;
    ctx.fillStyle = '#ff7b74';
    ctx.fillRect(mx - 1, my - 1, 2.2, 2.2);
  }

  const px = x + (player.x / WORLD_W) * size;
  const py = y + (player.y / WORLD_H) * size;
  ctx.fillStyle = '#7effb6';
  ctx.beginPath();
  ctx.arc(px, py, 3.2, 0, Math.PI * 2);
  ctx.fill();

  const cw = (W / WORLD_W) * size;
  const ch = (H / WORLD_H) * size;
  const cx = x + (camera.x / WORLD_W) * size;
  const cy = y + (camera.y / WORLD_H) * size;
  ctx.strokeStyle = 'rgba(126, 255, 182, 0.55)';
  ctx.strokeRect(cx, cy, cw, ch);
}

function drawCelebrationParticles() {
  ctx.save();
  for (const particle of celebrationParticles) {
    const x = particle.x - camera.x;
    const y = particle.y - camera.y;
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;

    const alpha = particle.life / particle.maxLife;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = particle.color;

    if (particle.shape === 'diamond') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size * 0.5, -particle.size * 0.5, particle.size, particle.size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, particle.size * (0.44 + alpha * 0.56), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCelebrationFlyouts() {
  ctx.save();
  ctx.textAlign = 'center';

  for (const flyout of celebrationFlyouts) {
    const x = flyout.x - camera.x;
    const y = flyout.y - camera.y;
    if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;

    const alpha = flyout.life / flyout.maxLife;
    const textSize = Math.round(flyout.size + (1 - alpha) * 6);
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${textSize}px "Noto Sans KR", system-ui`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = flyout.accent;
    ctx.strokeText(flyout.text, x, y);
    ctx.fillStyle = flyout.color;
    ctx.fillText(flyout.text, x, y);
  }

  ctx.restore();
}

function drawCelebrationBanners() {
  if (celebrationBanners.length === 0) return;

  ctx.save();
  ctx.textAlign = 'center';
  const centerX = W * 0.5;

  for (let i = 0; i < celebrationBanners.length; i += 1) {
    const banner = celebrationBanners[i];
    const alpha = clamp(banner.life / banner.maxLife, 0, 1);
    const enter = easeOutCubic((banner.maxLife - banner.life) / 0.18);
    const panelY = 136 + i * 58 - (1 - enter) * 18;
    const panelW = 256;
    const panelH = 44;
    const left = centerX - panelW * 0.5;
    const top = panelY - panelH * 0.5;

    let fillStyle = 'rgba(31, 35, 70, 0.82)';
    let strokeStyle = 'rgba(255, 223, 126, 0.72)';
    let titleColor = '#fff1b0';
    if (banner.tone === 'length') {
      fillStyle = 'rgba(59, 34, 12, 0.84)';
      strokeStyle = 'rgba(255, 183, 92, 0.78)';
      titleColor = '#ffd987';
    }

    ctx.globalAlpha = alpha;
    ctx.shadowColor = strokeStyle;
    ctx.shadowBlur = 24;
    ctx.fillStyle = fillStyle;
    ctx.fillRect(left, top, panelW, panelH);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeStyle;
    ctx.strokeRect(left, top, panelW, panelH);

    ctx.font = '800 18px "Noto Sans KR", system-ui';
    ctx.fillStyle = titleColor;
    ctx.fillText(banner.title, centerX, panelY - 3);

    ctx.font = '12px "Noto Sans KR", system-ui';
    ctx.fillStyle = '#dfe9ff';
    ctx.fillText(banner.subtitle, centerX, panelY + 14);
  }

  ctx.restore();
}

function drawScreenPulse() {
  if (screenPulse <= 0.001) return;

  const playerScreenX = player.x - camera.x;
  const playerScreenY = player.y - camera.y;
  const glow = ctx.createRadialGradient(
    playerScreenX,
    playerScreenY,
    18,
    playerScreenX,
    playerScreenY,
    Math.max(W, H) * 0.9,
  );
  glow.addColorStop(0, `rgba(${screenPulseTint}, ${screenPulse * 0.18})`);
  glow.addColorStop(0.4, `rgba(${screenPulseTint}, ${screenPulse * 0.08})`);
  glow.addColorStop(1, `rgba(${screenPulseTint}, 0)`);

  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `rgba(${screenPulseTint}, ${screenPulse * 0.42})`;
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, W - 5, H - 5);
  ctx.restore();
}

function render() {
  ctx.fillStyle = '#2d448f';
  ctx.fillRect(0, 0, W, H);

  for (const rock of rocks) {
    const x = rock.x - camera.x;
    const y = rock.y - camera.y;
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rock.rot);
    ctx.fillStyle = `rgba(154, 181, 255, ${rock.a})`;
    ctx.beginPath();
    ctx.moveTo(-rock.r, -rock.r * 0.2);
    ctx.lineTo(-rock.r * 0.25, -rock.r * 0.8);
    ctx.lineTo(rock.r * 0.9, -rock.r * 0.14);
    ctx.lineTo(rock.r * 0.5, rock.r * 0.8);
    ctx.lineTo(-rock.r * 0.45, rock.r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const food of foods) {
    const x = food.x - camera.x;
    const y = food.y - camera.y;
    if (x < -12 || x > W + 12 || y < -12 || y > H + 12) continue;

    ctx.fillStyle = food.color;
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, food.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  for (const bot of bots) {
    drawWorm(bot);
  }
  drawWorm(player);

  drawSafeZone();
  drawCelebrationParticles();
  drawCelebrationFlyouts();
  drawMiniMap();

  ctx.fillStyle = '#eaf1ff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px "Noto Sans KR", system-ui';
  ctx.fillText(`점수 ${score}`, 14, 26);
  ctx.fillText(`길이 ${player.segments.length}`, 14, 48);
  ctx.fillText(`남은 시간 ${Math.max(0, ROUND_DURATION - roundElapsed).toFixed(1)}초`, 14, 70);
  ctx.fillText(`안전 구역 ${Math.round((safeRadius / SAFE_RADIUS_START) * 100)}%`, 14, 92);
  ctx.fillText(`속도 ${Math.round(speedMultiplier * 100)}%`, 14, 114);
  drawScreenPulse();
  drawCelebrationBanners();

  if (state === 'idle' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "Noto Sans KR", system-ui';
    let title = `${ROUND_DURATION}초 웜 러시`;
    if (state === 'gameover') {
      if (gameOverReason === 'time') {
        title = '시간 종료';
      } else if (gameOverReason === 'zone') {
        title = '안전 구역 이탈';
      } else {
        title = '충돌로 탈락';
      }
    }
    ctx.fillText(title, W / 2, H / 2 - 12);
    ctx.font = '16px "Noto Sans KR", system-ui';
    if (state === 'idle') {
      ctx.fillText('좁아지는 원 안에서 버티며 최고 점수를 노리세요.', W / 2, H / 2 + 18);
      ctx.fillText('시간이 갈수록 모든 지렁이 속도가 더 빨라집니다.', W / 2, H / 2 + 42);
    } else {
      const scoreLine = score === best && score > 0 ? `신기록 ${score}` : `이번 점수 ${score}  최고 점수 ${best}`;
      ctx.fillText(scoreLine, W / 2, H / 2 + 18);
      ctx.fillText('화면을 누르거나 시작 버튼, 스페이스바로 다시 시작하세요.', W / 2, H / 2 + 42);
    }
  }
}

function update(dt) {
  tick += 1;
  updateCelebrationEffects(dt);

  if (state !== 'running') return;

  roundElapsed = Math.min(ROUND_DURATION, roundElapsed + dt);
  updateRoundPressure();

  updatePlayerTarget();
  for (const bot of bots) updateBotTarget(bot, dt);

  updateSpawnGrace(dt);
  moveWorm(player, dt);
  for (const bot of bots) moveWorm(bot, dt);
  updatePlayerProgressFeedback();

  resolveSafeZone();
  if (state !== 'running') return;

  consumeFood(player);
  for (const bot of bots) consumeFood(bot);

  resolveCollisions();
  if (state !== 'running') return;

  if (roundElapsed >= ROUND_DURATION) {
    endGame('time');
    return;
  }

  if (bots.length < BOT_COUNT && tick % 48 === 0) {
    bots.push(makeBot(SPAWN_GRACE_DURATION));
  }

  camera.x = clamp(player.x - W * 0.5, 0, WORLD_W - W);
  camera.y = clamp(player.y - H * 0.5, 0, WORLD_H - H);

  updateHud();
}

let lastTime = 0;
function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min(0.033, (ts - lastTime) / 1000);
  lastTime = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) * (W / rect.width);
  pointer.y = (event.clientY - rect.top) * (H / rect.height);
  pointer.hasMoved = true;
}

function clearPointerInput() {
  pointer.active = false;
  pointer.pointerId = null;
}

function isTouchPointerEvent(event) {
  return event.pointerType === 'touch' || event.pointerType === 'pen';
}

function isFullscreenActive() {
  return document.fullscreenElement === wrap;
}

function isPseudoFullscreenActive() {
  return document.body.classList.contains(PSEUDO_FULLSCREEN_CLASS);
}

function updateFullscreenButton() {
  if (!btnFullscreen) return;
  const active = isFullscreenActive() || isPseudoFullscreenActive();
  const shouldShow = isTouchDevice || state !== 'idle' || active;
  const label = btnFullscreen.querySelector('span');

  btnFullscreen.classList.toggle('visible', shouldShow);
  btnFullscreen.classList.toggle('active', active);
  btnFullscreen.setAttribute('aria-pressed', active ? 'true' : 'false');
  if (label) {
    label.textContent = active ? '해제' : '전체';
  }
}

function tryLockPortrait() {
  screen.orientation?.lock?.('portrait').catch(() => {});
}

function tryUnlockOrientation() {
  if (typeof screen.orientation?.unlock === 'function') {
    screen.orientation.unlock();
  }
}

async function toggleFullscreen() {
  if (!wrap) return;

  const shouldExit = isFullscreenActive() || isPseudoFullscreenActive();
  if (shouldExit) {
    if (isFullscreenActive() && typeof document.exitFullscreen === 'function') {
      try {
        await document.exitFullscreen();
      } catch (error) {
        document.body.classList.remove(PSEUDO_FULLSCREEN_CLASS);
      }
    } else {
      document.body.classList.remove(PSEUDO_FULLSCREEN_CLASS);
    }
    tryUnlockOrientation();
    stabilizeViewport();
    updateFullscreenButton();
    return;
  }

  const canUseNativeFullscreen = document.fullscreenEnabled && typeof wrap.requestFullscreen === 'function';
  if (canUseNativeFullscreen) {
    try {
      await wrap.requestFullscreen({ navigationUI: 'hide' });
    } catch (error) {
      document.body.classList.add(PSEUDO_FULLSCREEN_CLASS);
    }
  } else {
    document.body.classList.add(PSEUDO_FULLSCREEN_CLASS);
  }

  tryLockPortrait();
  stabilizeViewport();
  updateFullscreenButton();
}

btnStart.addEventListener('click', startGame);
btnFullscreen?.addEventListener('click', () => {
  bgmAudio?.unlock();
  stabilizeViewport();
  toggleFullscreen();
});

turnPad?.addEventListener('pointerdown', (event) => {
  preventBrowserGesture(event);
  event.stopPropagation();
  bgmAudio?.unlock();
  turnStick.active = true;
  turnStick.pointerId = event.pointerId;
  turnPad.setPointerCapture(event.pointerId);
  updateTurnStickFromEvent(event);
});

turnPad?.addEventListener('pointermove', (event) => {
  if (!turnStick.active || event.pointerId !== turnStick.pointerId) return;
  preventBrowserGesture(event);
  event.stopPropagation();
  updateTurnStickFromEvent(event);
});

turnPad?.addEventListener('pointerup', (event) => {
  if (event.pointerId !== turnStick.pointerId) return;
  preventBrowserGesture(event);
  event.stopPropagation();
  if (turnPad.hasPointerCapture(event.pointerId)) {
    turnPad.releasePointerCapture(event.pointerId);
  }
  resetTurnStick();
});

turnPad?.addEventListener('pointercancel', (event) => {
  if (event.pointerId !== turnStick.pointerId) return;
  preventBrowserGesture(event);
  event.stopPropagation();
  if (turnPad.hasPointerCapture(event.pointerId)) {
    turnPad.releasePointerCapture(event.pointerId);
  }
  resetTurnStick();
});

turnPad?.addEventListener('lostpointercapture', () => {
  resetTurnStick();
});

canvas.addEventListener('pointerdown', (event) => {
  preventBrowserGesture(event);
  pointer.active = true;
  pointer.pointerId = event.pointerId;
  canvas.setPointerCapture?.(event.pointerId);
  updatePointer(event);
  if (state !== 'running') {
    startGame();
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (pointer.active && event.pointerId !== pointer.pointerId) return;
  if (isTouchPointerEvent(event)) preventBrowserGesture(event);
  updatePointer(event);
});

canvas.addEventListener('pointerup', (event) => {
  if (event.pointerId !== pointer.pointerId) return;
  preventBrowserGesture(event);
  if (canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  clearPointerInput();
});

canvas.addEventListener('pointercancel', (event) => {
  if (event.pointerId !== pointer.pointerId) return;
  preventBrowserGesture(event);
  if (canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  clearPointerInput();
});

canvas.addEventListener('lostpointercapture', clearPointerInput);

document.addEventListener('fullscreenchange', () => {
  if (!isFullscreenActive()) {
    tryUnlockOrientation();
  }
  stabilizeViewport();
  updateFullscreenButton();
});
document.addEventListener('touchmove', (event) => {
  if (arena && event.target instanceof Node && arena.contains(event.target)) {
    event.preventDefault();
    stabilizeViewport();
  }
}, { passive: false });

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') {
    event.preventDefault();
    if (state !== 'running') startGame();
  }
  if (event.code === 'Escape' && isPseudoFullscreenActive()) {
    document.body.classList.remove(PSEUDO_FULLSCREEN_CLASS);
    tryUnlockOrientation();
    stabilizeViewport();
    updateFullscreenButton();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

window.addEventListener('blur', () => {
  clearPointerInput();
  resetTurnStick();
  for (const code of Object.keys(keys)) {
    keys[code] = false;
  }
});

window.addEventListener('resize', stabilizeViewport);
window.visualViewport?.addEventListener('resize', stabilizeViewport);
window.addEventListener('scroll', stabilizeViewport, { passive: true });

resetGame();
updateFullscreenButton();
requestAnimationFrame(loop);
