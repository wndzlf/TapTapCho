const toss = window.HamjjiBobaShopToss || {
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
const lifeEl = document.getElementById('life');
const statusLineEl = document.getElementById('statusLine');
const userKeyHintEl = document.getElementById('userKeyHint');
const bridgeBadgeEl = document.getElementById('bridgeBadge');

const btnExit = document.getElementById('btnExit');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const exitModal = document.getElementById('exitModal');

const LOGICAL_WIDTH = canvas.width;
const LOGICAL_HEIGHT = canvas.height;
const STORAGE_PREFIX = 'hamjji-boba-shop';
const ROUND_SECONDS = 45;
const MAX_LIFE = 3;
const ORDER_TIMEOUT = 2.85;

const FLAVORS = [
  { id: 'strawberry', label: '딸기보바', short: '딸', cup: '#ff94b8', lid: '#ffe0ec', pearl: '#ff648f' },
  { id: 'matcha', label: '말차보바', short: '말', cup: '#8fd08c', lid: '#e7f8df', pearl: '#67b460' },
  { id: 'brown', label: '흑당보바', short: '흑', cup: '#c79258', lid: '#ffe3c1', pearl: '#8b5c31' },
];

const CUP_CENTERS = [
  { x: LOGICAL_WIDTH * 0.2, y: 575 },
  { x: LOGICAL_WIDTH * 0.5, y: 575 },
  { x: LOGICAL_WIDTH * 0.8, y: 575 },
];

const AUDIO_PATHS = {
  start: './assets/audio/hamjji-boba-shop-start.mp3',
  tap: './assets/audio/hamjji-boba-shop-tap.mp3',
  success: './assets/audio/hamjji-boba-shop-success.mp3',
  miss: './assets/audio/hamjji-boba-shop-miss.mp3',
  timeout: './assets/audio/hamjji-boba-shop-timeout.mp3',
};

const audioCtx = window.AudioContext ? new AudioContext() : null;
const audioState = {
  ready: false,
  clips: {},
};

let state = 'running'; // running | gameover
let gameOverReason = 'time';
let score = 0;
let best = 0;
let life = MAX_LIFE;
let combo = 0;
let timeLeft = ROUND_SECONDS;
let orderIndex = 0;
let orderTimeLeft = ORDER_TIMEOUT;
let userHash = null;
let lastFrameAt = performance.now();
let safeAreaUnsubscribe = () => {};
let backUnsubscribe = () => {};
let homeUnsubscribe = () => {};
let exitModalOpen = false;
let touchUnlocked = false;
let activeParticles = [];
let floatingTexts = [];
let steamPuffs = [];
let backgroundDots = [];
let bestPromise = Promise.resolve();
let idlePulse = 0;

for (let i = 0; i < 24; i += 1) {
  backgroundDots.push({
    x: Math.random(),
    y: Math.random(),
    r: 1.8 + Math.random() * 4.2,
    speed: 0.06 + Math.random() * 0.14,
    hue: Math.random() < 0.5 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 226, 238, 0.25)',
  });
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
  const scope = userHash ? `user:${userHash}` : 'browser';
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

function resizeCanvas() {
  const stageBounds = stageEl.getBoundingClientRect();
  const availableWidth = Math.max(220, stageBounds.width - 24);
  const availableHeight = Math.max(300, stageBounds.height - 24);
  const displayWidth = Math.min(availableWidth, availableHeight * (LOGICAL_WIDTH / LOGICAL_HEIGHT));
  const displayHeight = displayWidth * (LOGICAL_HEIGHT / LOGICAL_WIDTH);
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const targetWidth = Math.round(LOGICAL_WIDTH * dpr);
  const targetHeight = Math.round(LOGICAL_HEIGHT * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function updateBridgeBadge() {
  const live = toss.isAvailable();
  bridgeBadgeEl.textContent = live ? '토스 브리지 연결됨' : '웹 미리보기';
  bridgeBadgeEl.classList.toggle('badge-live', live);
  bridgeBadgeEl.classList.toggle('badge-preview', !live);
}

function setStatus(text) {
  statusLineEl.textContent = text;
}

function setUserHint(text) {
  userKeyHintEl.textContent = text;
}

function syncHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  timeLeftEl.textContent = String(Math.ceil(timeLeft));
  lifeEl.textContent = String(life);
}

function spawnFloatingText(text, x, y, color) {
  floatingTexts.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -0.8 - Math.random() * 0.35,
    life: 40,
    text,
    color,
  });
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 8; i += 1) {
    activeParticles.push({
      x,
      y,
      vx: Math.cos((Math.PI * 2 * i) / 8) * (0.8 + Math.random() * 1.7),
      vy: Math.sin((Math.PI * 2 * i) / 8) * (0.8 + Math.random() * 1.7) - 1,
      life: 22 + Math.random() * 8,
      color,
    });
  }
}

function spawnSteam(x, y) {
  steamPuffs.push({
    x,
    y,
    vy: -0.25 - Math.random() * 0.2,
    life: 36 + Math.random() * 10,
    size: 6 + Math.random() * 6,
  });
}

function randomFlavor(exceptIndex = -1) {
  const candidates = [0, 1, 2].filter((index) => index !== exceptIndex);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function setNewOrder(animate = true) {
  const previous = orderIndex;
  orderIndex = randomFlavor(previous);
  orderTimeLeft = ORDER_TIMEOUT;

  if (animate) {
    const flavor = FLAVORS[orderIndex];
    const center = CUP_CENTERS[orderIndex];
    spawnFloatingText(`새 주문! ${flavor.label}`, center.x, 176, flavor.cup);
    spawnSteam(center.x, center.y - 80);
  }

  setStatus(`햄찌가 ${FLAVORS[orderIndex].label}을(를) 원해요.`);
}

function fallbackTone(freq, duration, gain = 0.02, type = 'triangle') {
  if (!audioCtx || document.hidden) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const amp = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(amp);
  amp.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function fallbackSfx(kind) {
  if (kind === 'success') {
    fallbackTone(720, 0.08, 0.03, 'triangle');
    fallbackTone(960, 0.1, 0.018, 'triangle');
    return;
  }

  if (kind === 'miss') {
    fallbackTone(260, 0.12, 0.03, 'sawtooth');
    return;
  }

  if (kind === 'timeout') {
    fallbackTone(180, 0.16, 0.03, 'square');
    return;
  }

  if (kind === 'start') {
    fallbackTone(540, 0.08, 0.02, 'triangle');
    return;
  }

  fallbackTone(420, 0.04, 0.012, 'sine');
}

function unlockAudio() {
  if (touchUnlocked) return;
  touchUnlocked = true;

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  if (!audioState.ready) {
    for (const [kind, src] of Object.entries(AUDIO_PATHS)) {
      const clip = new Audio(src);
      clip.preload = 'auto';
      clip.volume = kind === 'tap' ? 0.46 : 0.68;
      clip.setAttribute('playsinline', '');
      audioState.clips[kind] = clip;
    }
    audioState.ready = true;
  }
}

function playSfx(kind) {
  const source = audioState.clips[kind];
  if (!source) {
    fallbackSfx(kind);
    return;
  }

  const clip = source.cloneNode();
  clip.volume = source.volume;
  clip.play().catch(() => {
    fallbackSfx(kind);
  });
}

function setBestValue(value) {
  if (value <= best) return;
  best = value;
  bestEl.textContent = String(best);
  bestPromise = toss.storage.setItem(getScopedStorageKey('best'), String(best)).catch(() => {});
}

function openExitModal() {
  exitModalOpen = true;
  exitModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeExitModal() {
  exitModalOpen = false;
  exitModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

async function requestClose() {
  closeExitModal();
  const closed = await toss.closeView();
  if (!closed) {
    setStatus('토스 앱에서만 화면을 닫을 수 있어요.');
  }
}

function endGame(reason) {
  state = 'gameover';
  gameOverReason = reason;
  setBestValue(score);
  syncHud();

  if (reason === 'timeout') {
    setStatus('시간이 끝났어요. 화면을 탭하면 다시 시작합니다.');
  } else {
    setStatus('기회가 모두 끝났어요. 화면을 탭하면 다시 시작합니다.');
  }
}

function resetGame() {
  state = 'running';
  gameOverReason = 'time';
  score = 0;
  life = MAX_LIFE;
  combo = 0;
  timeLeft = ROUND_SECONDS;
  orderTimeLeft = ORDER_TIMEOUT;
  activeParticles = [];
  floatingTexts = [];
  steamPuffs = [];
  setNewOrder(false);
  setStatus(`햄찌가 ${FLAVORS[orderIndex].label}을(를) 원해요.`);
  playSfx('start');
  syncHud();
}

function cupBounds(index) {
  const center = CUP_CENTERS[index];
  return {
    left: center.x - 52,
    right: center.x + 52,
    top: center.y - 82,
    bottom: center.y + 56,
  };
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.clientX ?? (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
  const clientY = event.clientY ?? (event.touches && event.touches[0] ? event.touches[0].clientY : 0);

  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
  };
}

function hitTestCup(point) {
  for (let index = 0; index < CUP_CENTERS.length; index += 1) {
    const bounds = cupBounds(index);
    if (point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) {
      return index;
    }
  }
  return -1;
}

function handleSuccess(index, point) {
  const flavor = FLAVORS[index];
  combo += 1;
  score += 10 + Math.min(12, combo * 2);
  timeLeft = Math.min(ROUND_SECONDS, timeLeft + 1);
  setBestValue(score);
  playSfx('success');
  spawnParticles(point.x, point.y, flavor.cup);
  spawnFloatingText(`+${10 + Math.min(12, combo * 2)}`, point.x, point.y - 24, flavor.cup);
  spawnSteam(point.x, point.y - 34);
  setStatus(`좋아요! ${flavor.label}이(가) 딱 맞아요.`);
  setNewOrder(true);
}

function handleMiss(point) {
  combo = 0;
  life -= 1;
  playSfx('miss');
  spawnParticles(point.x, point.y, '#ff6d95');
  spawnFloatingText('-1', point.x, point.y - 24, '#ff5f8b');
  setStatus('햄찌가 고개를 절레절레 했어요.');

  if (life <= 0) {
    endGame('life');
    return;
  }

  timeLeft = Math.max(0, timeLeft - 1);
  setNewOrder(true);
}

function handleTimeout() {
  life -= 1;
  combo = 0;
  playSfx('timeout');
  const center = CUP_CENTERS[orderIndex];
  spawnFloatingText('지각!', center.x, center.y - 70, '#ff6d95');
  spawnSteam(center.x, center.y - 84);
  setStatus(`${FLAVORS[orderIndex].label} 주문이 늦었어요.`);

  if (life <= 0) {
    endGame('life');
    return;
  }

  setNewOrder(true);
}

function handleTap(event) {
  event.preventDefault();
  unlockAudio();
  playSfx('tap');

  if (exitModalOpen) {
    closeExitModal();
    return;
  }

  if (state === 'gameover') {
    resetGame();
    return;
  }

  if (state !== 'running') {
    return;
  }

  const point = pointFromEvent(event);
  const cupIndex = hitTestCup(point);
  if (cupIndex === -1) {
    handleMiss(point);
    return;
  }

  if (cupIndex === orderIndex) {
    handleSuccess(cupIndex, point);
    return;
  }

  handleMiss(point);
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBackground(now) {
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  gradient.addColorStop(0, '#fff9fe');
  gradient.addColorStop(0.55, '#fff0f6');
  gradient.addColorStop(1, '#ffe1eb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.85;
  for (const dot of backgroundDots) {
    const x = (dot.x * LOGICAL_WIDTH + now * dot.speed * 0.03) % LOGICAL_WIDTH;
    const y = dot.y * LOGICAL_HEIGHT;
    ctx.fillStyle = dot.hue;
    ctx.beginPath();
    ctx.arc(x, y, dot.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.beginPath();
  ctx.ellipse(LOGICAL_WIDTH * 0.16, 118, 42, 24, -0.12, 0, Math.PI * 2);
  ctx.ellipse(LOGICAL_WIDTH * 0.82, 124, 58, 28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeaderCard() {
  const x = 20;
  const y = 24;
  const width = LOGICAL_WIDTH - 40;
  const height = 184;

  ctx.save();
  ctx.shadowColor = 'rgba(96, 45, 64, 0.12)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  drawRoundedRect(x, y, width, height, 26);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ff7aa8';
  ctx.font = '700 18px "Pretendard", sans-serif';
  ctx.fillText('오늘의 주문', x + 20, y + 34);

  const flavor = FLAVORS[orderIndex];
  const bubbleX = x + 20;
  const bubbleY = y + 52;
  const bubbleWidth = width - 40;
  const bubbleHeight = 64;
  ctx.fillStyle = 'rgba(255, 242, 247, 0.98)';
  drawRoundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 22);
  ctx.fill();

  ctx.fillStyle = flavor.cup;
  ctx.font = '800 30px "Pretendard", sans-serif';
  ctx.fillText(flavor.label, bubbleX + 20, bubbleY + 41);
  ctx.fillStyle = 'rgba(75, 47, 61, 0.62)';
  ctx.font = '600 14px "Pretendard", sans-serif';
  ctx.fillText('정답 컵을 탭하면 바로 다음 주문이 열려요.', bubbleX + 20, bubbleY + 56);

  const meterX = bubbleX + 20;
  const meterY = y + 128;
  const meterWidth = bubbleWidth - 40;
  ctx.fillStyle = 'rgba(75, 47, 61, 0.1)';
  drawRoundedRect(meterX, meterY, meterWidth, 14, 999);
  ctx.fill();
  ctx.fillStyle = flavor.cup;
  drawRoundedRect(meterX, meterY, meterWidth * Math.max(0.08, orderTimeLeft / ORDER_TIMEOUT), 14, 999);
  ctx.fill();

  ctx.fillStyle = 'rgba(75, 47, 61, 0.76)';
  ctx.font = '700 13px "Pretendard", sans-serif';
  ctx.fillText('손님 기다리는 시간', meterX, meterY + 31);

  const hamsterX = x + width - 88;
  const hamsterY = y + 130;
  ctx.save();
  ctx.translate(hamsterX, hamsterY);
  ctx.shadowColor = 'rgba(96, 45, 64, 0.14)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff7ef';
  ctx.beginPath();
  ctx.arc(28, 18, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd7e4';
  ctx.beginPath();
  ctx.arc(10, 2, 10, 0, Math.PI * 2);
  ctx.arc(46, 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#5a3342';
  ctx.beginPath();
  ctx.arc(20, 16, 3, 0, Math.PI * 2);
  ctx.arc(36, 16, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a3342';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(28, 22, 7, 0.1, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawCup(index, now) {
  const flavor = FLAVORS[index];
  const center = CUP_CENTERS[index];
  const pulse = index === orderIndex ? 1 + Math.sin(now * 0.008 + index) * 0.045 : 1;
  const selected = index === orderIndex;
  const cupWidth = 92 * pulse;
  const cupHeight = 122 * pulse;
  const x = center.x - cupWidth / 2;
  const y = center.y - cupHeight / 2;

  ctx.save();
  if (selected) {
    ctx.shadowColor = flavor.cup;
    ctx.shadowBlur = 22;
  } else {
    ctx.shadowColor = 'rgba(96, 45, 64, 0.12)';
    ctx.shadowBlur = 12;
  }
  ctx.shadowOffsetY = 6;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  drawRoundedRect(x - 4, y + 20, cupWidth + 8, cupHeight - 6, 24);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = flavor.cup;
  drawRoundedRect(x + 10, y + 22, cupWidth - 20, cupHeight - 20, 18);
  ctx.fill();

  ctx.fillStyle = flavor.lid;
  drawRoundedRect(x + 2, y + 6, cupWidth - 4, 30, 16);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
  drawRoundedRect(x + 26, y + 10, cupWidth - 52, 10, 999);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(x + 20, y + 30, 4, 60);

  const pearls = [
    [x + 22, y + cupHeight - 32],
    [x + 38, y + cupHeight - 24],
    [x + 54, y + cupHeight - 34],
    [x + 70, y + cupHeight - 24],
  ];
  for (const [px, py] of pearls) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flavor.pearl;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.font = '800 28px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(flavor.short, center.x, y + 76);
  ctx.textAlign = 'start';

  if (selected) {
    ctx.strokeStyle = flavor.cup;
    ctx.lineWidth = 4;
    drawRoundedRect(x - 6, y + 18, cupWidth + 12, cupHeight - 2, 24);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(75, 47, 61, 0.7)';
  ctx.font = '700 13px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(flavor.label, center.x, y + 144);
  ctx.textAlign = 'start';
}

function drawSteam(now) {
  for (const puff of steamPuffs) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, puff.life / 50);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.ellipse(puff.x, puff.y - (50 - puff.life) * 0.22, puff.size, puff.size * 1.25, Math.sin(now * 0.004) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of activeParticles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / 30);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const text of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, text.life / 40);
    ctx.fillStyle = text.color;
    ctx.font = '800 18px "Pretendard", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text.text, text.x, text.y);
    ctx.restore();
  }
}

function drawFooterHint() {
  ctx.save();
  ctx.fillStyle = 'rgba(75, 47, 61, 0.7)';
  ctx.font = '700 13px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('햄찌가 기다리기 전에 맞는 컵을 탭하세요.', LOGICAL_WIDTH / 2, 710);
  ctx.restore();
}

function drawHearts() {
  const baseX = 32;
  const baseY = 214;
  for (let i = 0; i < MAX_LIFE; i += 1) {
    const filled = i < life;
    ctx.save();
    ctx.translate(baseX + i * 26, baseY);
    ctx.fillStyle = filled ? '#ff6d95' : 'rgba(75, 47, 61, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.bezierCurveTo(-8, -12, -18, -1, -18, 9);
    ctx.bezierCurveTo(-18, 18, -8, 24, 0, 32);
    ctx.bezierCurveTo(8, 24, 18, 18, 18, 9);
    ctx.bezierCurveTo(18, -1, 8, -12, 0, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawGameOverOverlay() {
  if (state !== 'gameover') return;

  ctx.save();
  ctx.fillStyle = 'rgba(45, 24, 32, 0.38)';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.fillStyle = 'rgba(255, 250, 252, 0.98)';
  drawRoundedRect(36, 250, LOGICAL_WIDTH - 72, 220, 28);
  ctx.fill();

  ctx.fillStyle = '#ff7aa8';
  ctx.font = '800 30px "Pretendard", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('장사가 끝났어요', LOGICAL_WIDTH / 2, 304);

  ctx.fillStyle = 'rgba(75, 47, 61, 0.78)';
  ctx.font = '700 16px "Pretendard", sans-serif';
  ctx.fillText(`점수 ${score} · 최고 ${best}`, LOGICAL_WIDTH / 2, 344);

  ctx.font = '600 14px "Pretendard", sans-serif';
  const message = gameOverReason === 'timeout'
    ? '화면을 탭하면 바로 다시 시작합니다.'
    : '화면을 탭하면 바로 다시 시작합니다.';
  ctx.fillText(message, LOGICAL_WIDTH / 2, 374);
  ctx.fillStyle = 'rgba(255, 122, 168, 0.16)';
  drawRoundedRect(LOGICAL_WIDTH / 2 - 68, 400, 136, 42, 18);
  ctx.fill();
  ctx.fillStyle = '#ff5f8b';
  ctx.font = '800 15px "Pretendard", sans-serif';
  ctx.fillText('탭해서 재시작', LOGICAL_WIDTH / 2, 427);
  ctx.restore();
}

function update(dt) {
  idlePulse += dt;

  for (const dot of backgroundDots) {
    dot.x += dt * dot.speed * 0.02;
    if (dot.x > 1.05) dot.x = -0.05;
  }

  for (const particle of activeParticles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.02;
    particle.life -= 1;
  }
  activeParticles = activeParticles.filter((particle) => particle.life > 0);

  for (const text of floatingTexts) {
    text.x += text.vx;
    text.y += text.vy;
    text.life -= 1;
  }
  floatingTexts = floatingTexts.filter((text) => text.life > 0);

  for (const puff of steamPuffs) {
    puff.y += puff.vy;
    puff.life -= 1;
  }
  steamPuffs = steamPuffs.filter((puff) => puff.life > 0);

  if (state !== 'running') {
    return;
  }

  timeLeft = Math.max(0, timeLeft - dt);
  orderTimeLeft = Math.max(0, orderTimeLeft - dt);

  if (orderTimeLeft <= 0) {
    handleTimeout();
  }

  if (timeLeft <= 0 && state === 'running') {
    endGame('timeout');
  }

  syncHud();
}

function draw(now) {
  drawBackground(now);
  drawHeaderCard();
  drawHearts();
  drawSteam(now);

  for (let index = 0; index < CUP_CENTERS.length; index += 1) {
    drawCup(index, now);
  }

  drawParticles();
  drawFooterHint();
  drawGameOverOverlay();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  update(dt);
  draw(now);
  requestAnimationFrame(loop);
}

function normalizeUserKey(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, 16);
}

async function loadBestForCurrentUser() {
  const storedBest = Number(await toss.storage.getItem(getScopedStorageKey('best')) || 0);
  best = Number.isFinite(storedBest) ? storedBest : 0;
  syncHud();
}

async function bootstrapProfile() {
  const userKeyResult = await toss.getUserKeyForGame();
  userHash = normalizeUserKey(userKeyResult);
  setUserHint(userHash ? `게임 계정: ${userHash}` : '게스트 모드로 플레이 중입니다.');
  await loadBestForCurrentUser();
  setStatus(`햄찌가 ${FLAVORS[orderIndex].label}을(를) 원해요.`);
}

async function configureBridge() {
  updateBridgeBadge();

  try {
    await toss.setDeviceOrientation('portrait');
  } catch (error) {
    // Ignore preview failures.
  }

  try {
    await toss.setIosSwipeGestureEnabled(false);
  } catch (error) {
    // Ignore preview failures.
  }

  try {
    applySafeAreaInsets(await toss.safeArea.get());
  } catch (error) {
    applySafeAreaInsets({ top: 0, right: 0, bottom: 0, left: 0 });
  }

  safeAreaUnsubscribe = toss.safeArea.subscribe((insets) => {
    applySafeAreaInsets(insets);
  });

  backUnsubscribe = toss.events.onBack(() => {
    openExitModal();
  });

  homeUnsubscribe = toss.events.onHome(() => {
    openExitModal();
  });
}

async function init() {
  resizeCanvas();
  syncHud();
  setStatus('화면을 탭해서 맞는 보바 컵을 골라 주세요.');
  setUserHint('토스 게임 계정 연결 상태를 확인 중입니다.');

  await configureBridge();
  await bootstrapProfile();

  setNewOrder(false);
  playSfx('start');
  requestAnimationFrame(loop);
}

btnExit.addEventListener('click', () => {
  openExitModal();
});

btnCancelExit.addEventListener('click', () => {
  closeExitModal();
});

btnConfirmExit.addEventListener('click', () => {
  void requestClose();
});

exitModal.addEventListener('click', (event) => {
  if (event.target === exitModal) {
    closeExitModal();
  }
});

canvas.addEventListener('pointerdown', handleTap, { passive: false });
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
window.addEventListener('beforeunload', () => {
  safeAreaUnsubscribe();
  backUnsubscribe();
  homeUnsubscribe();
});

init();
