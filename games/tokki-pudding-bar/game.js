const toss = window.TokkiPuddingBarToss || {
  isAvailable: () => false,
  closeView: async () => false,
  setDeviceOrientation: async () => false,
  setIosSwipeGestureEnabled: async () => false,
  getUserKeyForGame: async () => null,
  safeArea: {
    get: async () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    subscribe: () => () => {},
  },
  events: {
    onBack: () => () => {},
    onHome: () => () => {},
  },
  storage: {
    getItem: async (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        // Ignore preview storage failures.
      }
    },
    removeItem: async (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        // Ignore preview storage failures.
      }
    },
  },
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageEl = document.getElementById('stage');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const nextPieceEl = document.getElementById('nextPiece');
const statusLineEl = document.getElementById('statusLine');
const userKeyHintEl = document.getElementById('userKeyHint');

const btnMusic = document.getElementById('btnMusic');
const btnExit = document.getElementById('btnExit');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const exitModal = document.getElementById('exitModal');

const W = canvas.width;
const H = canvas.height;

const STORAGE_PREFIX = 'tokki-pudding-bar';

const FIELD_LEFT = 56;
const FIELD_RIGHT = W - 56;
const FIELD_TOP = 178;
const FIELD_BOTTOM = 694;
const FIELD_CENTER_X = (FIELD_LEFT + FIELD_RIGHT) * 0.5;
const DROP_Y = 114;
const WARNING_Y = 214;

const GRAVITY = 1820;
const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.05;
const MAX_ACCUMULATOR = 0.12;
const DROP_COOLDOWN = 0.22;
const DANGER_LIMIT = 1.1;
const MERGE_CONTACT_TOLERANCE = 2.5;
const BGM_SRC = 'assets/audio/tokki-pudding-bar-bgm-puzzle-game-249202.mp3';
const BGM_VOLUME = 0.22;

const PIECES = [
  { label: '말랑 젤리', short: '젤리', fill: '#ffd6e7', rim: '#ff9dc0', accent: '#fff6fb', ear: '#ffc2d8', points: 10, radius: 24 },
  { label: '토끼 비즈', short: '비즈', fill: '#ffe9bf', rim: '#ffca77', accent: '#fff9ea', ear: '#ffd5a6', points: 18, radius: 30 },
  { label: '딸기 푸딩', short: '딸기', fill: '#ffbfd1', rim: '#ff7ea8', accent: '#fff4f8', ear: '#ffb1cc', points: 32, radius: 37 },
  { label: '민트 푸딩', short: '민트', fill: '#c9f7e6', rim: '#77d8b4', accent: '#eefdf8', ear: '#a5f1d4', points: 52, radius: 45 },
  { label: '크림 푸딩', short: '크림', fill: '#fff0cf', rim: '#ffc676', accent: '#fffaf0', ear: '#ffdba3', points: 82, radius: 54 },
  { label: '별 토끼볼', short: '별토끼', fill: '#e9d9ff', rim: '#bf8cff', accent: '#fbf6ff', ear: '#dcc6ff', points: 128, radius: 64 },
  { label: '구름 토끼', short: '구름', fill: '#d7ecff', rim: '#7cb7ff', accent: '#f4faff', ear: '#bfdcff', points: 192, radius: 75 },
  { label: '달토끼 푸딩', short: '달토끼', fill: '#fff3d1', rim: '#ffde78', accent: '#fffdf6', ear: '#ffe7b0', points: 300, radius: 87 },
];

const AudioContextCtor = window.AudioContext || window.webkitAudioContext || null;
const audioCtx = AudioContextCtor ? new AudioContextCtor() : null;
const bgmPlayer = typeof Audio === 'undefined' ? null : new Audio(BGM_SRC);

let state = 'idle';
let score = 0;
let best = 0;
let combo = 0;
let comboTimer = 0;
let maxTierReached = 0;
let dangerTimer = 0;
let dropCooldown = 0;
let userKey = null;
let storageScope = 'browser';
let statusMessage = '손가락으로 위치를 맞추고 놓으면 토끼푸딩이 말랑하게 떨어집니다.';

let bodies = [];
let sparkles = [];
let rings = [];
let floatTexts = [];

let currentPiece = null;
let queuedPiece = null;
let nextBodyId = 1;
let aimX = FIELD_CENTER_X;
let renderedAimX = FIELD_CENTER_X;
let pointerActive = false;
let pointerId = null;
let backgroundTick = 0;
let lastFrameAt = performance.now();
let accumulator = 0;
let resizeQueued = false;
let dangerNoticeLevel = 0;

let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};
let bgmEnabled = true;
let bgmFailed = false;

if (bgmPlayer) {
  bgmPlayer.loop = true;
  bgmPlayer.preload = 'auto';
  bgmPlayer.volume = BGM_VOLUME;
  bgmPlayer.playsInline = true;
  bgmPlayer.addEventListener('error', () => {
    bgmFailed = true;
    updateMusicButton();
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function approach(current, target, step) {
  if (current < target) {
    return Math.min(target, current + step);
  }
  return Math.max(target, current - step);
}

function getScopedStorageKey(name) {
  const scope = userKey ? `user:${userKey}` : storageScope;
  return `${STORAGE_PREFIX}:${scope}:${name}`;
}

function applySafeAreaInsets(insets) {
  if (!insets) {
    document.documentElement.style.removeProperty('--safe-top');
    document.documentElement.style.removeProperty('--safe-right');
    document.documentElement.style.removeProperty('--safe-bottom');
    document.documentElement.style.removeProperty('--safe-left');
    return;
  }

  document.documentElement.style.setProperty('--safe-top', `${Math.max(0, Number(insets.top || 0))}px`);
  document.documentElement.style.setProperty('--safe-right', `${Math.max(0, Number(insets.right || 0))}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${Math.max(0, Number(insets.bottom || 0))}px`);
  document.documentElement.style.setProperty('--safe-left', `${Math.max(0, Number(insets.left || 0))}px`);
}

function resizeStage() {
  if (!stageEl) {
    return;
  }

  const bounds = stageEl.getBoundingClientRect();
  const padding = 24;
  const availableWidth = Math.max(160, bounds.width - padding);
  const availableHeight = Math.max(280, bounds.height - padding);
  const ratio = W / H;
  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

function queueResize() {
  if (resizeQueued) {
    return;
  }

  resizeQueued = true;
  window.requestAnimationFrame(() => {
    resizeQueued = false;
    resizeStage();
  });
}

function setStatus(message) {
  statusMessage = message;
  if (statusLineEl) {
    statusLineEl.textContent = message;
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  nextPieceEl.textContent = queuedPiece ? PIECES[queuedPiece.tier].short : '-';
}

function updateMusicButton() {
  if (!btnMusic) {
    return;
  }

  const unavailable = !bgmPlayer || bgmFailed;
  btnMusic.disabled = unavailable;
  btnMusic.setAttribute('aria-pressed', bgmEnabled && !unavailable ? 'true' : 'false');
  btnMusic.textContent = unavailable ? 'BGM 오류' : (bgmEnabled ? 'BGM 켜짐' : 'BGM 꺼짐');
}

async function readBgmPreference() {
  const raw = await toss.storage.getItem(getScopedStorageKey('bgm-enabled'));
  if (raw === null) {
    bgmEnabled = true;
  } else {
    bgmEnabled = raw === 'true';
  }
  updateMusicButton();
}

async function saveBgmPreference() {
  await toss.storage.setItem(getScopedStorageKey('bgm-enabled'), String(bgmEnabled));
}

function pauseBgm() {
  if (!bgmPlayer || bgmPlayer.paused) {
    return;
  }
  bgmPlayer.pause();
}

async function ensureBgmPlayback() {
  if (!bgmPlayer || bgmFailed || !bgmEnabled) {
    return;
  }

  bgmPlayer.volume = BGM_VOLUME;

  try {
    await bgmPlayer.play();
  } catch (error) {
    // Ignore autoplay blocking and wait for the next gesture.
  }
}

async function setBgmEnabled(nextEnabled) {
  bgmEnabled = nextEnabled;
  updateMusicButton();
  await saveBgmPreference();

  if (!bgmEnabled) {
    pauseBgm();
    return;
  }

  await ensureBgmPlayback();
}

function showUserKeyHint(value) {
  if (!userKeyHintEl) {
    return;
  }

  if (value) {
    const display = String(value).trim();
    const suffix = display.length > 10 ? `…${display.slice(-6)}` : display;
    userKeyHintEl.textContent = `사용자 키 연결됨 · ${suffix}`;
    return;
  }

  userKeyHintEl.textContent = '웹 미리보기 모드입니다. 기록은 이 브라우저에 저장됩니다.';
}

function setExitModalOpen(isOpen) {
  exitModal.classList.toggle('hidden', !isOpen);
  document.body.classList.toggle('modal-open', isOpen);
}

function isExitModalOpen() {
  return !exitModal.classList.contains('hidden');
}

async function readBestScore() {
  const raw = await toss.storage.getItem(getScopedStorageKey('best'));
  const parsed = Number(raw);
  best = Number.isFinite(parsed) ? parsed : 0;
  updateHud();
}

async function saveBestScore() {
  await toss.storage.setItem(getScopedStorageKey('best'), String(best));
}

function createPreviewPiece(tier) {
  return {
    tier,
    bob: randomBetween(0, Math.PI * 2),
  };
}

function createBody(tier, x, y) {
  const piece = PIECES[tier];
  const body = {
    id: nextBodyId,
    tier,
    x,
    y,
    vx: 0,
    vy: 0,
    r: piece.radius,
    mass: piece.radius * piece.radius * 0.09,
    rotation: randomBetween(-0.18, 0.18),
    spin: randomBetween(-1.2, 1.2),
    squish: 0,
    mergeCooldown: 0.14,
    blinkAt: randomBetween(1.2, 3.8),
    blinkTime: 0,
  };
  nextBodyId += 1;
  return body;
}

function randomSpawnTier() {
  const progress = clamp(score / 900, 0, 1);
  const bag = progress < 0.25
    ? [0, 0, 0, 0, 1, 1, 2]
    : progress < 0.6
      ? [0, 0, 0, 1, 1, 2, 2, 3]
      : [0, 0, 1, 1, 2, 2, 3, 3, 4];

  return bag[Math.floor(Math.random() * bag.length)];
}

function updateBestIfNeeded() {
  if (score <= best) {
    return;
  }

  best = score;
  updateHud();
  void saveBestScore();
}

function resetRound() {
  state = 'running';
  score = 0;
  combo = 0;
  comboTimer = 0;
  maxTierReached = 0;
  dangerTimer = 0;
  dangerNoticeLevel = 0;
  dropCooldown = 0;
  nextBodyId = 1;
  bodies = [];
  sparkles = [];
  rings = [];
  floatTexts = [];
  aimX = FIELD_CENTER_X;
  renderedAimX = FIELD_CENTER_X;
  currentPiece = createPreviewPiece(randomSpawnTier());
  queuedPiece = createPreviewPiece(randomSpawnTier());
  updateHud();
  setStatus('손가락으로 위치를 잡고 떼면 푸딩이 떨어집니다. 같은 푸딩끼리 닿으면 더 커집니다.');
}

function restartGame() {
  resetRound();
  playTone('start');
}

function finishGame(reason = 'overflow') {
  state = 'gameover';
  pointerActive = false;
  pointerId = null;
  dropCooldown = 0;
  updateBestIfNeeded();
  setStatus(
    reason === 'overflow'
      ? '잔이 넘쳐서 마감했어요. 화면을 눌러 다시 정리하세요.'
      : '라운드가 끝났어요. 화면을 눌러 다시 시작하세요.',
  );
  playTone('finish');
}

function updateAim(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scale = W / rect.width;
  const x = (clientX - rect.left) * scale;
  const pieceRadius = currentPiece ? PIECES[currentPiece.tier].radius : PIECES[0].radius;
  aimX = clamp(x, FIELD_LEFT + pieceRadius + 8, FIELD_RIGHT - pieceRadius - 8);
}

function spawnSparkles(x, y, color, count = 12, spread = 1) {
  for (let i = 0; i < count; i += 1) {
    sparkles.push({
      x,
      y,
      vx: randomBetween(-120, 120) * spread,
      vy: randomBetween(-220, -60) * spread,
      life: randomBetween(0.35, 0.7),
      maxLife: 0,
      size: randomBetween(2, 5),
      color,
    });
  }
}

function spawnRing(x, y, color, radius = 16) {
  rings.push({
    x,
    y,
    radius,
    maxRadius: radius + randomBetween(22, 42),
    life: 0.32,
    maxLife: 0.32,
    color,
  });
}

function spawnFloatText(x, y, text, color) {
  floatTexts.push({
    x,
    y,
    vy: randomBetween(-28, -18),
    life: 0.9,
    maxLife: 0.9,
    text,
    color,
  });
}

function ensureAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

function addVoice(oscillators, type, start, end, startTime, duration, now, gainNode, filterNode) {
  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(start, now + startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(0.001, end), now + startTime + duration);
  osc.connect(filterNode);
  oscillators.push(osc);
  return osc;
}

function playTone(kind, tier = 0) {
  if (!audioCtx) {
    return;
  }

  ensureAudioContext();
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === 'finish' ? 0.12 : 0.1, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'finish' ? 0.72 : 0.32));
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  const oscillators = [];
  const base = 280 + tier * 32;

  if (kind === 'start') {
    addVoice(oscillators, 'triangle', 320, 480, 0, 0.16, now, gain, filter);
    addVoice(oscillators, 'triangle', 480, 720, 0.1, 0.16, now, gain, filter);
  } else if (kind === 'drop') {
    addVoice(oscillators, 'sine', base, base * 0.82, 0, 0.13, now, gain, filter);
  } else if (kind === 'merge') {
    addVoice(oscillators, 'triangle', base, base * 1.65, 0, 0.16, now, gain, filter);
    addVoice(oscillators, 'triangle', base * 1.3, base * 2.1, 0.05, 0.16, now, gain, filter);
  } else if (kind === 'legend') {
    addVoice(oscillators, 'triangle', 420, 960, 0, 0.2, now, gain, filter);
    addVoice(oscillators, 'sine', 640, 1280, 0.08, 0.2, now, gain, filter);
  } else if (kind === 'finish') {
    addVoice(oscillators, 'triangle', 420, 260, 0, 0.22, now, gain, filter);
    addVoice(oscillators, 'sine', 260, 180, 0.12, 0.34, now, gain, filter);
  }

  for (const osc of oscillators) {
    osc.start(now);
    osc.stop(now + 0.9);
  }
}

function dropCurrentPiece() {
  if (state !== 'running' || dropCooldown > 0 || !currentPiece) {
    return;
  }

  const radius = PIECES[currentPiece.tier].radius;
  const body = createBody(currentPiece.tier, aimX, DROP_Y);
  body.x = clamp(body.x, FIELD_LEFT + radius + 8, FIELD_RIGHT - radius - 8);
  body.vx = pointerActive ? 0 : randomBetween(-12, 12);
  body.vy = 18;
  bodies.push(body);
  maxTierReached = Math.max(maxTierReached, body.tier);
  dropCooldown = DROP_COOLDOWN;
  currentPiece = queuedPiece;
  queuedPiece = createPreviewPiece(randomSpawnTier());
  updateHud();
  setStatus(`${PIECES[body.tier].label}을(를) 톡 떨어뜨렸어요.`);
  spawnSparkles(body.x, body.y + 8, PIECES[body.tier].rim, 8, 0.55);
  playTone('drop', body.tier);
}

function resolveWorld(body) {
  const left = FIELD_LEFT + body.r + 6;
  const right = FIELD_RIGHT - body.r - 6;
  const floor = FIELD_BOTTOM - body.r;

  if (body.x < left) {
    body.x = left;
    if (body.vx < 0) {
      body.vx *= -0.36;
      body.spin += 0.22;
      body.squish = Math.max(body.squish, 0.08);
    }
  } else if (body.x > right) {
    body.x = right;
    if (body.vx > 0) {
      body.vx *= -0.36;
      body.spin -= 0.22;
      body.squish = Math.max(body.squish, 0.08);
    }
  }

  if (body.y > floor) {
    body.y = floor;
    if (body.vy > 0) {
      const impact = Math.abs(body.vy);
      body.vy *= -0.18;
      body.vx *= 0.97;
      body.spin *= 0.92;
      body.squish = Math.max(body.squish, Math.min(0.26, impact * 0.00018));
      if (Math.abs(body.vy) < 24) {
        body.vy = 0;
      }
      if (Math.abs(body.vx) < 3) {
        body.vx = 0;
      }
    }
  }
}

function resolvePair(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;

  if (dist === 0) {
    dist = 0.001;
  }

  if (dist >= minDist) {
    return;
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;
  const moveA = overlap * (b.mass / totalMass);
  const moveB = overlap * (a.mass / totalMass);

  a.x -= nx * moveA;
  a.y -= ny * moveA;
  b.x += nx * moveB;
  b.y += ny * moveB;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const normalSpeed = rvx * nx + rvy * ny;

  if (normalSpeed < 0) {
    const restitution = a.tier === b.tier ? 0.1 : 0.18;
    const impulse = (-(1 + restitution) * normalSpeed) / ((1 / a.mass) + (1 / b.mass));
    const ix = impulse * nx;
    const iy = impulse * ny;

    a.vx -= ix / a.mass;
    a.vy -= iy / a.mass;
    b.vx += ix / b.mass;
    b.vy += iy / b.mass;

    const tx = -ny;
    const ty = nx;
    const tangentSpeed = rvx * tx + rvy * ty;
    const tangentImpulse = clamp(
      (-tangentSpeed * 0.08) / ((1 / a.mass) + (1 / b.mass)),
      -Math.abs(impulse) * 0.4,
      Math.abs(impulse) * 0.4,
    );
    const fx = tangentImpulse * tx;
    const fy = tangentImpulse * ty;
    a.vx -= fx / a.mass;
    a.vy -= fy / a.mass;
    b.vx += fx / b.mass;
    b.vy += fy / b.mass;
  }

  const squishAmount = Math.min(0.26, overlap / minDist);
  a.squish = Math.max(a.squish, squishAmount);
  b.squish = Math.max(b.squish, squishAmount);
}

function mergeBodies(primary, secondary) {
  const newTier = primary.tier + 1;
  const merged = createBody(
    newTier,
    clamp(
      (primary.x * primary.mass + secondary.x * secondary.mass) / (primary.mass + secondary.mass),
      FIELD_LEFT + PIECES[newTier].radius + 6,
      FIELD_RIGHT - PIECES[newTier].radius - 6,
    ),
    (primary.y + secondary.y) * 0.5 - 2,
  );

  merged.vx = (primary.vx + secondary.vx) * 0.22;
  merged.vy = Math.min(primary.vy, secondary.vy) * 0.15 - 28;
  merged.spin = (primary.spin + secondary.spin) * 0.32;
  merged.squish = 0.24;
  merged.mergeCooldown = 0.24;
  maxTierReached = Math.max(maxTierReached, newTier);

  bodies = bodies.filter((body) => body.id !== primary.id && body.id !== secondary.id);
  bodies.push(merged);

  combo = comboTimer > 0 ? combo + 1 : 1;
  comboTimer = 1.08;

  const piece = PIECES[newTier];
  const comboBonus = combo > 1 ? combo * 6 : 0;
  score += piece.points + comboBonus;
  updateHud();
  updateBestIfNeeded();

  spawnRing(merged.x, merged.y, piece.rim, piece.radius * 0.45);
  spawnSparkles(merged.x, merged.y, piece.rim, 14 + combo * 2, 1 + combo * 0.08);
  spawnFloatText(merged.x, merged.y - piece.radius * 0.1, `+${piece.points + comboBonus}`, piece.rim);

  if (newTier === PIECES.length - 1) {
    setStatus('달토끼 푸딩 등장! 계속 쌓으면 더 오래 버틸 수 있어요.');
    playTone('legend', newTier);
  } else if (combo > 1) {
    setStatus(`${piece.label} 완성! 연쇄 ${combo}회.`);
    playTone('merge', newTier);
  } else {
    setStatus(`${piece.label} 완성!`);
    playTone('merge', newTier);
  }
}

function processMerges() {
  let mergedAny = false;
  let loopGuard = 0;

  while (loopGuard < 6) {
    loopGuard += 1;
    const candidates = [];

    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];

        if (a.tier !== b.tier || a.tier >= PIECES.length - 1) {
          continue;
        }
        if (a.mergeCooldown > 0 || b.mergeCooldown > 0) {
          continue;
        }

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.r + b.r;
        if (dist > minDist + MERGE_CONTACT_TOLERANCE) {
          continue;
        }

        const contactGap = dist - minDist;
        const relativeSpeed = Math.hypot(b.vx - a.vx, b.vy - a.vy);
        candidates.push({ a, b, contactGap, relativeSpeed });
      }
    }

    if (candidates.length === 0) {
      break;
    }

    candidates.sort((left, right) => {
      if (left.contactGap !== right.contactGap) {
        return left.contactGap - right.contactGap;
      }
      return left.relativeSpeed - right.relativeSpeed;
    });

    const used = new Set();
    let mergedThisPass = false;

    for (const candidate of candidates) {
      if (used.has(candidate.a.id) || used.has(candidate.b.id)) {
        continue;
      }

      used.add(candidate.a.id);
      used.add(candidate.b.id);
      mergeBodies(candidate.a, candidate.b);
      mergedThisPass = true;
      mergedAny = true;
    }

    if (!mergedThisPass) {
      break;
    }
  }

  return mergedAny;
}

function updateEffects(dt) {
  for (let i = sparkles.length - 1; i >= 0; i -= 1) {
    const sparkle = sparkles[i];
    sparkle.vy += 260 * dt;
    sparkle.x += sparkle.vx * dt;
    sparkle.y += sparkle.vy * dt;
    sparkle.life -= dt;
    if (sparkle.life <= 0) {
      sparkles.splice(i, 1);
    }
  }

  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    ring.radius = Math.min(ring.maxRadius, ring.radius + 86 * dt);
    ring.life -= dt;
    if (ring.life <= 0) {
      rings.splice(i, 1);
    }
  }

  for (let i = floatTexts.length - 1; i >= 0; i -= 1) {
    const label = floatTexts[i];
    label.y += label.vy * dt;
    label.life -= dt;
    if (label.life <= 0) {
      floatTexts.splice(i, 1);
    }
  }
}

function updateDanger(dt) {
  const topMost = bodies.reduce((minY, body) => Math.min(minY, body.y - body.r), H);

  if (topMost < WARNING_Y) {
    dangerTimer = Math.min(DANGER_LIMIT + 0.4, dangerTimer + dt);
    if (dangerTimer > 0.35 && dangerNoticeLevel === 0) {
      dangerNoticeLevel = 1;
      setStatus('잔이 거의 넘쳐요. 바닥 쪽에서 같은 푸딩을 붙여 보세요.');
    }
  } else {
    dangerTimer = Math.max(0, dangerTimer - dt * 1.8);
    if (dangerTimer === 0) {
      dangerNoticeLevel = 0;
    }
  }

  if (dangerTimer >= DANGER_LIMIT) {
    finishGame('overflow');
  }
}

function updateBody(body, dt) {
  body.vy += GRAVITY * dt;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  body.vx *= 0.998;
  body.vy *= 0.9992;
  body.spin *= 0.997;
  body.rotation += body.spin * dt;
  body.squish = approach(body.squish, 0, dt * 1.7);
  body.mergeCooldown = Math.max(0, body.mergeCooldown - dt);
  body.blinkAt -= dt;
  if (body.blinkAt <= 0) {
    body.blinkTime = 0.12;
    body.blinkAt = randomBetween(1.4, 3.8);
  }
  if (body.blinkTime > 0) {
    body.blinkTime = Math.max(0, body.blinkTime - dt);
  }
}

function updateRunning(dt) {
  renderedAimX += (aimX - renderedAimX) * Math.min(1, dt * 18);
  dropCooldown = Math.max(0, dropCooldown - dt);
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer === 0) {
    combo = 0;
  }

  for (const body of bodies) {
    updateBody(body, dt);
  }

  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (const body of bodies) {
      resolveWorld(body);
    }

    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        resolvePair(bodies[i], bodies[j]);
      }
    }
  }

  processMerges();
  updateDanger(dt);
  updateEffects(dt);
}

function update(dt) {
  backgroundTick += dt;

  if (state !== 'running') {
    renderedAimX += (aimX - renderedAimX) * Math.min(1, dt * 10);
    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer === 0) {
      combo = 0;
    }
    updateEffects(dt);
    return;
  }

  accumulator = Math.min(MAX_ACCUMULATOR, accumulator + dt);

  while (accumulator >= FIXED_DT) {
    updateRunning(FIXED_DT);
    accumulator -= FIXED_DT;
    if (state !== 'running') {
      accumulator = 0;
      break;
    }
  }
}

function drawRoundedRect(x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#fffdf9');
  gradient.addColorStop(0.55, '#ffe9d6');
  gradient.addColorStop(1, '#ffd2b1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(84, 96, 32, 0, Math.PI * 2);
  ctx.arc(120, 88, 22, 0, Math.PI * 2);
  ctx.arc(328, 122, 26, 0, Math.PI * 2);
  ctx.arc(354, 110, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffb7d1';
  ctx.beginPath();
  ctx.arc(82, 188, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe196';
  ctx.beginPath();
  ctx.arc(340, 590, 98, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c6f7e7';
  ctx.beginPath();
  ctx.arc(66, 642, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#fff7f1';
  for (let i = 0; i < 12; i += 1) {
    const x = 32 + i * 34;
    const y = 58 + Math.sin(backgroundTick * 1.4 + i * 0.8) * 8;
    ctx.beginPath();
    ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCounter() {
  const y = FIELD_BOTTOM + 10;
  const gradient = ctx.createLinearGradient(0, y, 0, H);
  gradient.addColorStop(0, '#f0b88e');
  gradient.addColorStop(1, '#d5834e');
  drawRoundedRect(20, y, W - 40, 110, 28, gradient);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  drawRoundedRect(28, y + 10, W - 56, 18, 10, 'rgba(255, 255, 255, 0.18)');
}

function drawJar() {
  const jarX = FIELD_LEFT - 8;
  const jarY = FIELD_TOP - 10;
  const jarW = FIELD_RIGHT - FIELD_LEFT + 16;
  const jarH = FIELD_BOTTOM - FIELD_TOP + 20;

  ctx.save();
  ctx.shadowColor = 'rgba(170, 95, 45, 0.18)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  drawRoundedRect(jarX, jarY + 12, jarW, jarH, 44, 'rgba(255, 255, 255, 0.45)');
  ctx.restore();

  const glassGradient = ctx.createLinearGradient(jarX, jarY, jarX, jarY + jarH);
  glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  glassGradient.addColorStop(1, 'rgba(255, 245, 236, 0.64)');
  drawRoundedRect(jarX, jarY, jarW, jarH, 44, glassGradient, 'rgba(147, 89, 49, 0.18)');

  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  drawRoundedRect(jarX + 12, jarY + 18, 18, jarH - 42, 10, 'rgba(255, 255, 255, 0.28)');

  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  drawRoundedRect(jarX + 18, jarY + 14, jarW - 36, 18, 12, 'rgba(255, 255, 255, 0.38)');

  ctx.save();
  ctx.fillStyle = '#fff9f5';
  ctx.beginPath();
  ctx.ellipse(jarX + jarW * 0.24, jarY - 8, 16, 28, -0.22, 0, Math.PI * 2);
  ctx.ellipse(jarX + jarW * 0.76, jarY - 8, 16, 28, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc7da';
  ctx.beginPath();
  ctx.ellipse(jarX + jarW * 0.24, jarY - 7, 8, 18, -0.22, 0, Math.PI * 2);
  ctx.ellipse(jarX + jarW * 0.76, jarY - 7, 8, 18, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDangerLine() {
  const pulse = dangerTimer / DANGER_LIMIT;

  ctx.save();
  ctx.strokeStyle = `rgba(226, 108, 74, ${0.12 + pulse * 0.68})`;
  ctx.lineWidth = 3 + pulse * 1.5;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(FIELD_LEFT + 18, WARNING_Y);
  ctx.lineTo(FIELD_RIGHT - 18, WARNING_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = `rgba(196, 95, 61, ${0.5 + pulse * 0.5})`;
  ctx.font = '800 13px "Noto Sans KR", sans-serif';
  ctx.fillText('넘침 라인', FIELD_LEFT + 22, WARNING_Y - 10);
  ctx.restore();
}

function drawPreviewPanel() {
  const panelX = 24;
  const panelY = 22;
  const panelW = 126;
  const panelH = 84;
  const gradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(1, 'rgba(255, 244, 234, 0.84)');
  drawRoundedRect(panelX, panelY, panelW, panelH, 20, gradient, 'rgba(103, 63, 39, 0.08)');

  ctx.fillStyle = 'rgba(196, 106, 52, 0.9)';
  ctx.font = '800 13px "Noto Sans KR", sans-serif';
  ctx.fillText('다음 토핑', panelX + 14, panelY + 22);

  if (!queuedPiece) {
    return;
  }

  drawPiece(queuedPiece.tier, panelX + 38, panelY + 56, {
    preview: true,
    bob: Math.sin(backgroundTick * 2.2 + queuedPiece.bob) * 1.5,
  });

  ctx.fillStyle = '#4b2b1d';
  ctx.font = '800 14px "Noto Sans KR", sans-serif';
  ctx.fillText(PIECES[queuedPiece.tier].short, panelX + 62, panelY + 58);
}

function drawAimGuide() {
  if (!currentPiece || state === 'gameover') {
    return;
  }

  const piece = PIECES[currentPiece.tier];
  const alpha = dropCooldown > 0 ? 0.28 : 0.88;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(196, 106, 52, 0.28)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(renderedAimX, DROP_Y + 18);
  ctx.lineTo(renderedAimX, FIELD_TOP + 10);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  drawPiece(currentPiece.tier, renderedAimX, DROP_Y + Math.sin(backgroundTick * 4 + currentPiece.bob) * 4, {
    preview: true,
    bob: Math.sin(backgroundTick * 4 + currentPiece.bob) * 4,
    alpha,
  });

  ctx.save();
  ctx.fillStyle = 'rgba(75, 43, 29, 0.78)';
  ctx.font = '700 13px "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dropCooldown > 0 ? '다음 드롭 준비 중' : '손을 떼면 드롭', renderedAimX, DROP_Y - piece.radius - 16);
  ctx.restore();
}

function drawPiece(tier, x, y, options = {}) {
  const piece = PIECES[tier];
  const squish = options.preview ? 0.04 : options.squish ?? 0;
  const stretch = clamp(squish + Math.abs(options.vy || 0) * 0.00008, 0, 0.24);
  const scaleX = 1 + stretch;
  const scaleY = 1 - stretch * 0.58;
  const blinkScale = options.blinkTime > 0 ? 0.15 : 1;

  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.translate(x, y + (options.bob || 0));
  ctx.rotate((options.rotation || 0) * 0.18);

  if (!options.preview) {
    ctx.save();
    ctx.fillStyle = 'rgba(110, 66, 38, 0.12)';
    ctx.scale(1.12, 0.36);
    ctx.beginPath();
    ctx.arc(0, piece.radius * 2.45, piece.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.scale(scaleX, scaleY);

  const gradient = ctx.createRadialGradient(-piece.radius * 0.34, -piece.radius * 0.52, piece.radius * 0.24, 0, 0, piece.radius * 1.08);
  gradient.addColorStop(0, piece.accent);
  gradient.addColorStop(0.56, piece.fill);
  gradient.addColorStop(1, piece.rim);

  ctx.shadowColor = options.preview ? 'rgba(255, 255, 255, 0.18)' : `${piece.rim}88`;
  ctx.shadowBlur = options.preview ? 8 : 16;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, piece.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, piece.radius - 2, 0.2, Math.PI * 1.75);
  ctx.stroke();

  ctx.fillStyle = '#fffaf6';
  ctx.beginPath();
  ctx.ellipse(-piece.radius * 0.22, -piece.radius * 1.02, piece.radius * 0.18, piece.radius * 0.34, -0.18, 0, Math.PI * 2);
  ctx.ellipse(piece.radius * 0.22, -piece.radius * 1.02, piece.radius * 0.18, piece.radius * 0.34, 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = piece.ear;
  ctx.beginPath();
  ctx.ellipse(-piece.radius * 0.22, -piece.radius * 1.02, piece.radius * 0.08, piece.radius * 0.22, -0.18, 0, Math.PI * 2);
  ctx.ellipse(piece.radius * 0.22, -piece.radius * 1.02, piece.radius * 0.08, piece.radius * 0.22, 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.ellipse(-piece.radius * 0.3, -piece.radius * 0.36, piece.radius * 0.22, piece.radius * 0.11, -0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4b2b1d';
  ctx.lineWidth = Math.max(2, piece.radius * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-piece.radius * 0.22, -piece.radius * 0.06);
  ctx.lineTo(-piece.radius * 0.1, -piece.radius * 0.06 * blinkScale);
  ctx.moveTo(piece.radius * 0.22, -piece.radius * 0.06);
  ctx.lineTo(piece.radius * 0.1, -piece.radius * 0.06 * blinkScale);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, piece.radius * 0.12, piece.radius * 0.16, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  if (tier >= 5) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.moveTo(0, -piece.radius * 0.26);
    ctx.lineTo(piece.radius * 0.08, -piece.radius * 0.06);
    ctx.lineTo(piece.radius * 0.24, -piece.radius * 0.06);
    ctx.lineTo(piece.radius * 0.12, piece.radius * 0.04);
    ctx.lineTo(piece.radius * 0.18, piece.radius * 0.2);
    ctx.lineTo(0, piece.radius * 0.1);
    ctx.lineTo(-piece.radius * 0.18, piece.radius * 0.2);
    ctx.lineTo(-piece.radius * 0.12, piece.radius * 0.04);
    ctx.lineTo(-piece.radius * 0.24, -piece.radius * 0.06);
    ctx.lineTo(-piece.radius * 0.08, -piece.radius * 0.06);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawBodies() {
  const sorted = [...bodies].sort((a, b) => a.y - b.y);
  for (const body of sorted) {
    drawPiece(body.tier, body.x, body.y, {
      rotation: body.rotation,
      squish: body.squish,
      vy: body.vy,
      blinkTime: body.blinkTime,
    });
  }
}

function drawEffects() {
  for (const ring of rings) {
    ctx.save();
    ctx.globalAlpha = ring.life / ring.maxLife;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const sparkle of sparkles) {
    ctx.save();
    ctx.globalAlpha = clamp(sparkle.life / 0.7, 0, 1);
    ctx.fillStyle = sparkle.color;
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const label of floatTexts) {
    ctx.save();
    ctx.globalAlpha = label.life / label.maxLife;
    ctx.fillStyle = label.color;
    ctx.font = '800 18px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label.text, label.x, label.y);
    ctx.restore();
  }
}

function drawComboChip() {
  if (combo < 2 || comboTimer <= 0) {
    return;
  }

  const text = `연쇄 ${combo}`;
  ctx.save();
  ctx.font = '900 18px "Noto Sans KR", sans-serif';
  const width = ctx.measureText(text).width + 26;
  const x = (W - width) * 0.5;
  const y = 118;
  const gradient = ctx.createLinearGradient(x, y, x + width, y + 42);
  gradient.addColorStop(0, 'rgba(255, 145, 178, 0.94)');
  gradient.addColorStop(1, 'rgba(196, 106, 52, 0.94)');
  drawRoundedRect(x, y, width, 42, 22, gradient);
  ctx.fillStyle = '#fffdf9';
  ctx.fillText(text, x + 13, y + 27);
  ctx.restore();
}

function drawStatusChip() {
  const text = statusMessage;
  ctx.save();
  ctx.font = '700 14px "Noto Sans KR", sans-serif';
  const width = Math.min(W - 34, ctx.measureText(text).width + 24);
  const x = (W - width) * 0.5;
  const y = H - 84;
  const gradient = ctx.createLinearGradient(x, y, x + width, y + 38);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
  gradient.addColorStop(1, 'rgba(255, 243, 230, 0.96)');
  drawRoundedRect(x, y, width, 38, 19, gradient, 'rgba(103, 63, 39, 0.08)');
  ctx.fillStyle = '#4b2b1d';
  ctx.fillText(text, x + 12, y + 24);
  ctx.restore();
}

function drawIdleOverlay() {
  if (state !== 'idle') {
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(82, 49, 27, 0.18)';
  ctx.fillRect(0, 0, W, H);
  const panelW = 306;
  const panelH = 210;
  const x = (W - panelW) * 0.5;
  const y = 218;
  const gradient = ctx.createLinearGradient(x, y, x + panelW, y + panelH);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  gradient.addColorStop(1, 'rgba(255, 242, 232, 0.98)');
  drawRoundedRect(x, y, panelW, panelH, 28, gradient, 'rgba(103, 63, 39, 0.12)');

  ctx.fillStyle = 'rgba(196, 106, 52, 0.9)';
  ctx.font = '800 13px "Noto Sans KR", sans-serif';
  ctx.fillText('말랑한 아케이드 물리', x + 20, y + 30);
  ctx.fillStyle = '#4b2b1d';
  ctx.font = '900 28px "Noto Sans KR", sans-serif';
  ctx.fillText('토끼푸딩 바', x + 20, y + 72);
  ctx.font = '700 15px "Noto Sans KR", sans-serif';
  ctx.fillText('손가락으로 위치를 잡고 놓아서 드롭하세요.', x + 20, y + 112);
  ctx.fillText('같은 푸딩끼리 닿으면 더 큰 디저트로 합체합니다.', x + 20, y + 140);
  ctx.fillText('넘침 라인을 오래 넘기면 게임 오버입니다.', x + 20, y + 168);
  ctx.fillStyle = '#c45f3d';
  ctx.font = '800 15px "Noto Sans KR", sans-serif';
  ctx.fillText('화면을 눌러 시작', x + 20, y + 194);
  ctx.restore();
}

function drawGameOverOverlay() {
  if (state !== 'gameover') {
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(82, 49, 27, 0.24)';
  ctx.fillRect(0, 0, W, H);
  const panelW = 296;
  const panelH = 194;
  const x = (W - panelW) * 0.5;
  const y = 236;
  const gradient = ctx.createLinearGradient(x, y, x + panelW, y + panelH);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  gradient.addColorStop(1, 'rgba(255, 242, 229, 0.98)');
  drawRoundedRect(x, y, panelW, panelH, 28, gradient, 'rgba(103, 63, 39, 0.12)');

  ctx.fillStyle = 'rgba(196, 106, 52, 0.92)';
  ctx.font = '800 13px "Noto Sans KR", sans-serif';
  ctx.fillText('라운드 종료', x + 20, y + 30);

  ctx.fillStyle = '#4b2b1d';
  ctx.font = '900 30px "Noto Sans KR", sans-serif';
  ctx.fillText(`${score}점`, x + 20, y + 72);
  ctx.font = '700 16px "Noto Sans KR", sans-serif';
  ctx.fillText(`최고 기록 ${best}점`, x + 20, y + 104);
  ctx.fillText(`가장 큰 푸딩 ${PIECES[maxTierReached]?.label || PIECES[0].label}`, x + 20, y + 134);
  ctx.fillStyle = 'rgba(75, 43, 29, 0.72)';
  ctx.font = '700 14px "Noto Sans KR", sans-serif';
  ctx.fillText('화면을 다시 누르면 바로 새 잔을 준비합니다.', x + 20, y + 168);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawPreviewPanel();
  drawDangerLine();
  drawCounter();
  drawJar();
  drawBodies();
  drawAimGuide();
  drawEffects();
  drawComboChip();
  drawStatusChip();
  drawIdleOverlay();
  drawGameOverOverlay();
}

function loop(now) {
  const delta = Math.min(MAX_FRAME, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  update(delta);
  render();
  window.requestAnimationFrame(loop);
}

function onCanvasPointerDown(event) {
  event.preventDefault();
  ensureAudioContext();
  void ensureBgmPlayback();
  updateAim(event.clientX);
  pointerActive = true;
  pointerId = event.pointerId;
  if (canvas.setPointerCapture) {
    canvas.setPointerCapture(event.pointerId);
  }

  if (state === 'idle' || state === 'gameover') {
    restartGame();
  }
}

function onCanvasPointerMove(event) {
  if (event.buttons === 0 && event.pointerType !== 'mouse' && !pointerActive) {
    return;
  }
  updateAim(event.clientX);
}

function onCanvasPointerUp(event) {
  event.preventDefault();
  updateAim(event.clientX);

  if (pointerId !== null && event.pointerId !== pointerId) {
    return;
  }

  pointerActive = false;
  pointerId = null;
  if (canvas.releasePointerCapture && canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  if (state === 'running') {
    dropCurrentPiece();
  }
}

function onCanvasPointerCancel(event) {
  if (pointerId !== null && event.pointerId !== pointerId) {
    return;
  }

  pointerActive = false;
  pointerId = null;
  if (canvas.releasePointerCapture && canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

async function boot() {
  try {
    await toss.setDeviceOrientation('portrait');
  } catch (error) {
    // Ignore bridge preview failures.
  }

  try {
    await toss.setIosSwipeGestureEnabled(false);
  } catch (error) {
    // Ignore bridge preview failures.
  }

  try {
    applySafeAreaInsets(await toss.safeArea.get());
  } catch (error) {
    applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  }

  unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
    applySafeAreaInsets(insets);
    queueResize();
  });

  unsubscribeBack = toss.events.onBack(() => {
    if (isExitModalOpen()) {
      void toss.closeView();
      return;
    }
    setExitModalOpen(true);
  });

  unsubscribeHome = toss.events.onHome(() => {
    if (isExitModalOpen()) {
      void toss.closeView();
      return;
    }
    setExitModalOpen(true);
  });

  try {
    userKey = await toss.getUserKeyForGame();
    storageScope = userKey ? `user:${String(userKey)}` : 'browser';
    showUserKeyHint(userKey);
  } catch (error) {
    storageScope = 'browser';
    showUserKeyHint(null);
  }

  currentPiece = createPreviewPiece(randomSpawnTier());
  queuedPiece = createPreviewPiece(randomSpawnTier());
  setStatus('손가락으로 위치를 맞추고 놓으면 토끼푸딩이 말랑하게 떨어집니다.');
  await readBgmPreference();
  await readBestScore();
  queueResize();
  window.requestAnimationFrame(loop);
}

btnMusic?.addEventListener('click', () => {
  void setBgmEnabled(!bgmEnabled);
});

btnExit.addEventListener('click', () => {
  setExitModalOpen(true);
});

btnCancelExit.addEventListener('click', () => {
  setExitModalOpen(false);
  canvas.focus?.();
});

btnConfirmExit.addEventListener('click', () => {
  void toss.closeView();
});

exitModal.addEventListener('click', (event) => {
  if (event.target === exitModal) {
    setExitModalOpen(false);
  }
});

canvas.addEventListener('pointerdown', onCanvasPointerDown, { passive: false });
canvas.addEventListener('pointermove', onCanvasPointerMove, { passive: false });
canvas.addEventListener('pointerup', onCanvasPointerUp, { passive: false });
canvas.addEventListener('pointercancel', onCanvasPointerCancel, { passive: true });

window.addEventListener('resize', queueResize);
window.addEventListener('orientationchange', queueResize);
window.addEventListener('pointerdown', ensureAudioContext, { passive: true });
window.addEventListener('pagehide', () => {
  unsubscribeSafeArea();
  unsubscribeBack();
  unsubscribeHome();
  pauseBgm();
});

updateMusicButton();
void boot();
