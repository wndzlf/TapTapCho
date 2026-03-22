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
const timeLeftEl = document.getElementById('timeLeft');
const statusLineEl = document.getElementById('statusLine');
const userKeyHintEl = document.getElementById('userKeyHint');

const btnExit = document.getElementById('btnExit');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const exitModal = document.getElementById('exitModal');

const W = canvas.width;
const H = canvas.height;

const STORAGE_PREFIX = 'tokki-pudding-bar';
const ROUND_SECONDS = 45;
const MAX_MISSES = 3;
const TRACK_LEFT = 68;
const TRACK_RIGHT = W - 68;
const TRACK_Y = 212;
const SWEET_ZONE = 86;
const CURSOR_Y = 182;
const CUP_CENTER_X = W / 2;
const CUP_TOP = 470;
const CUP_BOTTOM = 670;
const MAX_LAYERS = 8;

const PALETTE = [
  { fill: '#ffd8e7', rim: '#ff9abd', label: '딸기' },
  { fill: '#d6f6ea', rim: '#80dfbf', label: '민트' },
  { fill: '#fff0b8', rim: '#ffd46c', label: '바나나' },
  { fill: '#ffe2c3', rim: '#ffba88', label: '복숭아' },
  { fill: '#f7e1ff', rim: '#d49df5', label: '포도' },
];

const AudioContextCtor = window.AudioContext || window.webkitAudioContext || null;
const audioCtx = AudioContextCtor ? new AudioContextCtor() : null;

let state = 'running';
let score = 0;
let best = 0;
let misses = 0;
let combo = 0;
let timeLeft = ROUND_SECONDS;
let userKey = null;
let storageScope = 'browser';
let statusMessage = '토끼가 기다립니다. 딱 맞는 순간에 탭하세요.';
let currentTargetX = randomBetween(TRACK_LEFT + 42, TRACK_RIGHT - 42);
let cursorX = TRACK_LEFT;
let cursorDirection = 1;
let cursorSpeed = 122;
let orderTimer = 2.25;
let orderWindow = 2.25;
let targetWobble = 0;
let layers = [];
let sparkles = [];
let bursts = [];
let pulse = 0;
let shake = 0;
let lastFrameAt = performance.now();
let resizeQueued = false;

let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
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
    // Ignore preview storage failures.
  }
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
  timeLeftEl.textContent = String(Math.max(0, Math.ceil(timeLeft)));
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

function resetRound() {
  score = 0;
  misses = 0;
  combo = 0;
  timeLeft = ROUND_SECONDS;
  cursorX = TRACK_LEFT;
  cursorDirection = 1;
  cursorSpeed = 122;
  orderTimer = orderWindow = 2.25;
  currentTargetX = randomBetween(TRACK_LEFT + 42, TRACK_RIGHT - 42);
  targetWobble = Math.random() * Math.PI * 2;
  layers = [
    { fill: '#ffe3cc', rim: '#d69268', wobble: 0.8 },
  ];
  sparkles = [];
  bursts = [];
  pulse = 0;
  shake = 0;
  state = 'running';
  setStatus('토끼가 기다립니다. 딱 맞는 순간에 탭하세요.');
  updateHud();
}

function loadBestScore() {
  const parsed = Number(bestEl.textContent || 0);
  best = Number.isFinite(parsed) ? parsed : 0;
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

function spawnSparkle(x, y, color) {
  sparkles.push({
    x,
    y,
    vx: randomBetween(-0.9, 0.9),
    vy: randomBetween(-1.8, -0.7),
    life: randomBetween(18, 34),
    color,
    size: randomBetween(1.8, 3.6),
  });
}

function spawnBurst(x, y, color) {
  bursts.push({
    x,
    y,
    radius: 8,
    maxRadius: 42,
    life: 16,
    color,
  });
}

function addLayer(color) {
  layers.push({
    fill: color.fill,
    rim: color.rim,
    wobble: randomBetween(0.4, 1.1),
  });

  if (layers.length > MAX_LAYERS) {
    layers.shift();
  }
}

function registerOutcome(kind) {
  if (kind === 'perfect') {
    const palette = PALETTE[score % PALETTE.length];
    score += 2;
    combo += 1;
    pulse = 1;
    shake = Math.max(shake, 2.2);
    cursorSpeed = Math.min(220, cursorSpeed + 8);
    addLayer(palette);
    spawnBurst(currentTargetX, TRACK_Y, palette.rim);
    for (let i = 0; i < 9; i += 1) {
      spawnSparkle(currentTargetX + randomBetween(-8, 8), TRACK_Y + randomBetween(-4, 4), palette.rim);
    }
    setStatus(combo >= 5 ? `연속 ${combo}개! 토끼가 좋아합니다.` : '완벽! 토끼푸딩이 반짝입니다.');
    playTone('perfect');
  } else if (kind === 'good') {
    const palette = PALETTE[(score + 1) % PALETTE.length];
    score += 1;
    combo += 1;
    pulse = Math.max(pulse, 0.6);
    cursorSpeed = Math.min(210, cursorSpeed + 5);
    addLayer(palette);
    spawnBurst(currentTargetX, TRACK_Y, palette.rim);
    for (let i = 0; i < 5; i += 1) {
      spawnSparkle(currentTargetX + randomBetween(-10, 10), TRACK_Y + randomBetween(-4, 6), palette.rim);
    }
    setStatus('좋아요. 조금만 더 맞추면 완성됩니다.');
    playTone('good');
  } else {
    misses += 1;
    combo = 0;
    shake = Math.max(shake, 6);
    pulse = 0.2;
    spawnBurst(currentTargetX, TRACK_Y, '#c46a34');
    setStatus(misses >= MAX_MISSES ? '토끼가 자리를 비웠어요.' : '조금 빗나갔어요. 다음 푸딩으로 갑니다.');
    playTone('miss');
  }

  if (score > best) {
    best = score;
    updateHud();
    void saveBestScore();
  }

  updateHud();
}

function nextOrder() {
  orderWindow = clamp(2.25 - score * 0.03, 1.15, 2.25);
  orderTimer = orderWindow;
  currentTargetX = randomBetween(TRACK_LEFT + 42, TRACK_RIGHT - 42);
  targetWobble = Math.random() * Math.PI * 2;
}

function finishGame() {
  state = 'gameover';
  setStatus(`완료! ${score}점으로 마감했어요. 화면을 탭하면 다시 시작됩니다.`);
  if (score > best) {
    best = score;
    updateHud();
    void saveBestScore();
  }
  playTone('finish');
}

function restartGame() {
  resetRound();
  playTone('start');
}

function tapGame() {
  if (state === 'gameover') {
    restartGame();
    return;
  }

  if (state !== 'running') {
    return;
  }

  const distance = Math.abs(cursorX - currentTargetX);
  if (distance <= SWEET_ZONE * 0.35) {
    registerOutcome('perfect');
  } else if (distance <= SWEET_ZONE * 0.78) {
    registerOutcome('good');
  } else {
    registerOutcome('miss');
  }

  if (misses >= MAX_MISSES) {
    finishGame();
    return;
  }

  nextOrder();
}

function onCanvasPointerDown(event) {
  event.preventDefault();
  unlockAudio();
  tapGame();
}

function drawRoundedRect(x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w / 2, h / 2);
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

function drawBackground(dt) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#fffdfb');
  gradient.addColorStop(0.55, '#fff0e2');
  gradient.addColorStop(1, '#f4d4bb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(58, 72, 22, 0, Math.PI * 2);
  ctx.arc(348, 92, 18, 0, Math.PI * 2);
  ctx.arc(384, 622, 26, 0, Math.PI * 2);
  ctx.arc(72, 620, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ff9abd';
  ctx.beginPath();
  ctx.arc(96, 120, 76, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe093';
  ctx.beginPath();
  ctx.arc(332, 560, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(0, Math.sin(performance.now() * 0.0012) * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.arc(36 + i * 68, 38 + (i % 2) * 12, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTrack() {
  const glow = ctx.createLinearGradient(TRACK_LEFT, 0, TRACK_RIGHT, 0);
  glow.addColorStop(0, 'rgba(196, 106, 52, 0.1)');
  glow.addColorStop(0.5, 'rgba(255, 143, 179, 0.28)');
  glow.addColorStop(1, 'rgba(196, 106, 52, 0.1)');
  ctx.fillStyle = glow;
  drawRoundedRect(TRACK_LEFT - 10, TRACK_Y - 14, TRACK_RIGHT - TRACK_LEFT + 20, 28, 14, glow);

  ctx.strokeStyle = 'rgba(75, 43, 29, 0.16)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(TRACK_LEFT, TRACK_Y);
  ctx.lineTo(TRACK_RIGHT, TRACK_Y);
  ctx.stroke();

  const zoneX = currentTargetX - SWEET_ZONE / 2;
  const zoneGradient = ctx.createLinearGradient(zoneX, 0, zoneX + SWEET_ZONE, 0);
  zoneGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  zoneGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.86)');
  zoneGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.fillStyle = zoneGradient;
  drawRoundedRect(zoneX, TRACK_Y - 20, SWEET_ZONE, 40, 20, zoneGradient);

  ctx.save();
  ctx.shadowColor = 'rgba(255, 143, 179, 0.65)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#fff6f9';
  drawRoundedRect(currentTargetX - 14, TRACK_Y - 18, 28, 36, 14, '#fff6f9');
  ctx.fillStyle = '#ff9abd';
  ctx.beginPath();
  ctx.arc(currentTargetX, TRACK_Y, 8 + Math.sin(targetWobble) * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(currentTargetX, TRACK_Y - 42);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb7d0';
  ctx.beginPath();
  ctx.arc(-7, 1, 2.6, 0, Math.PI * 2);
  ctx.arc(7, 1, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCursor() {
  const bob = Math.sin(performance.now() * 0.008) * 3;
  const x = cursorX;
  const y = CURSOR_Y + bob;

  ctx.save();
  ctx.shadowColor = 'rgba(196, 106, 52, 0.26)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fffdf8';
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fffdf8';
  ctx.beginPath();
  ctx.ellipse(x - 12, y - 22, 7, 16, -0.26, 0, Math.PI * 2);
  ctx.ellipse(x + 12, y - 22, 7, 16, 0.26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4b2b1d';
  ctx.beginPath();
  ctx.arc(x - 6, y - 2, 1.9, 0, Math.PI * 2);
  ctx.arc(x + 6, y - 2, 1.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4b2b1d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 3, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawPudding() {
  const cupX = CUP_CENTER_X - 104;
  const cupY = CUP_TOP;
  const cupW = 208;
  const cupH = CUP_BOTTOM - CUP_TOP;

  ctx.save();
  ctx.translate(0, shake ? Math.sin(performance.now() * 0.04) * shake : 0);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  drawRoundedRect(cupX - 10, cupY + 14, cupW + 20, cupH + 10, 36, 'rgba(255, 255, 255, 0.34)');

  ctx.fillStyle = '#fffaf5';
  drawRoundedRect(cupX, cupY, cupW, cupH, 34, '#fffaf5', 'rgba(196, 106, 52, 0.14)');

  ctx.fillStyle = 'rgba(196, 106, 52, 0.08)';
  drawRoundedRect(cupX + 14, cupY + 18, cupW - 28, 22, 12, 'rgba(196, 106, 52, 0.08)');

  const innerLeft = cupX + 22;
  const innerRight = cupX + cupW - 22;
  const innerWidth = innerRight - innerLeft;
  const layerHeight = 40;
  const maxVisibleLayers = Math.min(layers.length, 7);

  for (let i = 0; i < maxVisibleLayers; i += 1) {
    const layer = layers[layers.length - 1 - i];
    const y = cupY + cupH - 36 - i * (layerHeight - 4);
    const wobble = Math.sin(performance.now() * 0.001 + layer.wobble * i) * 3;
    const width = innerWidth - i * 6;
    const x = innerLeft + i * 3 + wobble * 0.15;
    const fill = layer.fill;
    const rim = layer.rim;

    ctx.save();
    ctx.shadowColor = rim;
    ctx.shadowBlur = 10;
    const layerGradient = ctx.createLinearGradient(x, y, x, y + layerHeight);
    layerGradient.addColorStop(0, '#fffdfb');
    layerGradient.addColorStop(0.25, fill);
    layerGradient.addColorStop(1, rim);
    drawRoundedRect(x, y, width, layerHeight, 16, layerGradient);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    drawRoundedRect(x + 8, y + 6, width - 16, 6, 4, 'rgba(255, 255, 255, 0.42)');
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 16 + pulse * 18;
  const topY = cupY + 48 - pulse * 4;
  const topGradient = ctx.createLinearGradient(innerLeft, topY, innerRight, topY + 66);
  topGradient.addColorStop(0, '#fffdfb');
  topGradient.addColorStop(1, '#ffe9dc');
  drawRoundedRect(innerLeft, topY, innerWidth, 72, 28, topGradient);
  ctx.fillStyle = '#fff8f2';
  ctx.beginPath();
  ctx.arc(CUP_CENTER_X - 38, topY + 20, 16, 0, Math.PI * 2);
  ctx.arc(CUP_CENTER_X, topY + 14, 18, 0, Math.PI * 2);
  ctx.arc(CUP_CENTER_X + 36, topY + 21, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(CUP_CENTER_X, cupY + 88);
  ctx.fillStyle = '#f7cc9f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 56, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.beginPath();
  ctx.ellipse(0, -2, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function updateParticles(dt) {
  const step = dt * 60;

  for (let i = sparkles.length - 1; i >= 0; i -= 1) {
    const sparkle = sparkles[i];
    sparkle.x += sparkle.vx * step;
    sparkle.y += sparkle.vy * step;
    sparkle.life -= step;
    if (sparkle.life <= 0) {
      sparkles.splice(i, 1);
    }
  }

  for (let i = bursts.length - 1; i >= 0; i -= 1) {
    const burst = bursts[i];
    burst.radius += 1.7 * step;
    burst.life -= step;
    if (burst.life <= 0) {
      bursts.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (const burst of bursts) {
    ctx.save();
    ctx.globalAlpha = clamp(burst.life / 16, 0, 1) * 0.6;
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const sparkle of sparkles) {
    ctx.save();
    ctx.globalAlpha = clamp(sparkle.life / 34, 0, 1);
    ctx.fillStyle = sparkle.color;
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawScoreBadge() {
  ctx.save();
  const badgeX = 18;
  const badgeY = 20;
  const badgeW = 132;
  const badgeH = 52;
  const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  badgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  badgeGradient.addColorStop(1, 'rgba(255, 244, 230, 0.84)');
  drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 18, badgeGradient, 'rgba(103, 63, 39, 0.08)');
  ctx.fillStyle = 'rgba(196, 106, 52, 0.92)';
  ctx.font = '800 14px "Noto Sans KR", sans-serif';
  ctx.fillText('현재 점수', badgeX + 14, badgeY + 20);
  ctx.fillStyle = '#4b2b1d';
  ctx.font = '900 20px "Noto Sans KR", sans-serif';
  ctx.fillText(String(score), badgeX + 14, badgeY + 41);
  ctx.restore();
}

function drawTimerBadge() {
  ctx.save();
  const badgeW = 130;
  const badgeH = 52;
  const badgeX = W - badgeW - 18;
  const badgeY = 20;
  const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  badgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  badgeGradient.addColorStop(1, 'rgba(255, 239, 212, 0.88)');
  drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 18, badgeGradient, 'rgba(103, 63, 39, 0.08)');
  ctx.fillStyle = 'rgba(196, 106, 52, 0.92)';
  ctx.font = '800 14px "Noto Sans KR", sans-serif';
  ctx.fillText('남은 시간', badgeX + 14, badgeY + 20);
  ctx.fillStyle = '#4b2b1d';
  ctx.font = '900 20px "Noto Sans KR", sans-serif';
  ctx.fillText(`${Math.max(0, Math.ceil(timeLeft))}초`, badgeX + 14, badgeY + 41);
  ctx.restore();
}

function drawCombo() {
  if (combo <= 1) {
    return;
  }

  ctx.save();
  const label = `연속 ${combo}`;
  ctx.font = '900 18px "Noto Sans KR", sans-serif';
  const width = ctx.measureText(label).width + 26;
  const x = (W - width) / 2;
  const y = 90;
  const gradient = ctx.createLinearGradient(x, y, x + width, y + 42);
  gradient.addColorStop(0, 'rgba(255, 143, 179, 0.94)');
  gradient.addColorStop(1, 'rgba(196, 106, 52, 0.9)');
  drawRoundedRect(x, y, width, 42, 21, gradient);
  ctx.fillStyle = '#fffdf8';
  ctx.fillText(label, x + 13, y + 27);
  ctx.restore();
}

function drawStatusChip() {
  ctx.save();
  const text = statusMessage;
  ctx.font = '700 14px "Noto Sans KR", sans-serif';
  const width = Math.min(W - 36, ctx.measureText(text).width + 24);
  const x = (W - width) / 2;
  const y = H - 88;
  const gradient = ctx.createLinearGradient(x, y, x + width, y + 38);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.86)');
  gradient.addColorStop(1, 'rgba(255, 242, 227, 0.96)');
  drawRoundedRect(x, y, width, 38, 19, gradient, 'rgba(103, 63, 39, 0.08)');
  ctx.fillStyle = '#4b2b1d';
  ctx.fillText(text, x + 12, y + 24);
  ctx.restore();
}

function drawGameOverOverlay() {
  if (state !== 'gameover') {
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(77, 48, 30, 0.24)';
  ctx.fillRect(0, 0, W, H);
  const panelW = 292;
  const panelH = 182;
  const x = (W - panelW) / 2;
  const y = 246;
  const gradient = ctx.createLinearGradient(x, y, x + panelW, y + panelH);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  gradient.addColorStop(1, 'rgba(255, 242, 229, 0.98)');
  drawRoundedRect(x, y, panelW, panelH, 26, gradient, 'rgba(103, 63, 39, 0.12)');
  ctx.fillStyle = 'rgba(196, 106, 52, 0.92)';
  ctx.font = '800 13px "Noto Sans KR", sans-serif';
  ctx.fillText('라운드 종료', x + 18, y + 28);
  ctx.fillStyle = '#4b2b1d';
  ctx.font = '900 28px "Noto Sans KR", sans-serif';
  ctx.fillText(`${score}점`, x + 18, y + 68);
  ctx.font = '700 16px "Noto Sans KR", sans-serif';
  ctx.fillText(`최고 기록 ${best}점`, x + 18, y + 100);
  ctx.fillStyle = 'rgba(75, 43, 29, 0.72)';
  ctx.font = '700 14px "Noto Sans KR", sans-serif';
  ctx.fillText('화면을 탭하면 바로 다시 시작합니다.', x + 18, y + 136);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawScoreBadge();
  drawTimerBadge();
  drawTrack();
  drawPudding();
  drawCursor();
  drawParticles();
  drawCombo();
  drawStatusChip();
  drawGameOverOverlay();
}

function update(delta) {
  if (state !== 'running') {
    updateParticles(delta);
    pulse *= Math.pow(0.001, delta * 0.18);
    shake *= Math.pow(0.001, delta * 0.18);
    return;
  }

  timeLeft -= delta;
  if (timeLeft <= 0) {
    timeLeft = 0;
    finishGame();
    updateParticles(delta);
    return;
  }

  cursorX += cursorDirection * cursorSpeed * delta;
  if (cursorX >= TRACK_RIGHT) {
    cursorX = TRACK_RIGHT;
    cursorDirection = -1;
  } else if (cursorX <= TRACK_LEFT) {
    cursorX = TRACK_LEFT;
    cursorDirection = 1;
  }

  orderTimer -= delta;
  if (orderTimer <= 0) {
    registerOutcome('miss');
    if (misses >= MAX_MISSES) {
      finishGame();
      updateParticles(delta);
      return;
    }
    nextOrder();
  }

  targetWobble += delta * 4.4;
  pulse *= Math.pow(0.001, delta * 0.12);
  shake *= Math.pow(0.001, delta * 0.24);
  updateParticles(delta);
}

function loop(now) {
  const delta = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  update(delta);
  render();
  window.requestAnimationFrame(loop);
}

function ensureAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

function playTone(kind) {
  if (!audioCtx) {
    return;
  }

  ensureAudioContext();
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1600, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === 'miss' ? 0.12 : 0.16, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'finish' ? 0.62 : 0.28));

  const voices = [];
  const addVoice = (type, start, stop, startTime, duration) => {
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(start, now + startTime);
    osc.frequency.exponentialRampToValueAtTime(stop, now + startTime + duration);
    osc.connect(filter);
    voices.push(osc);
  };

  if (kind === 'start') {
    addVoice('triangle', 340, 520, 0, 0.16);
    addVoice('triangle', 520, 780, 0.1, 0.16);
  } else if (kind === 'perfect') {
    addVoice('triangle', 520, 920, 0, 0.14);
    addVoice('triangle', 780, 1200, 0.04, 0.12);
  } else if (kind === 'good') {
    addVoice('sine', 400, 680, 0, 0.14);
  } else if (kind === 'miss') {
    addVoice('sawtooth', 240, 150, 0, 0.18);
  } else if (kind === 'finish') {
    addVoice('triangle', 480, 320, 0, 0.2);
    addVoice('sine', 320, 220, 0.1, 0.3);
  }

  filter.connect(gain);
  gain.connect(audioCtx.destination);

  for (const osc of voices) {
    osc.start(now);
    osc.stop(now + 0.7);
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

  const rawBest = await toss.storage.getItem(getScopedStorageKey('best'));
  const parsedBest = Number(rawBest);
  best = Number.isFinite(parsedBest) ? parsedBest : 0;
  updateHud();
  resetRound();
  playTone('start');
  window.requestAnimationFrame(loop);
}

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
window.addEventListener('resize', queueResize);
window.addEventListener('orientationchange', queueResize);
window.addEventListener('pointerdown', ensureAudioContext, { passive: true });
window.addEventListener('pagehide', () => {
  unsubscribeSafeArea();
  unsubscribeBack();
  unsubscribeHome();
});

queueResize();
void boot();
