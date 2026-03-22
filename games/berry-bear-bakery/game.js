const toss = window.BerryBearBakeryToss || {
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
const bridgeBadgeEl = document.getElementById('bridgeBadge');

const btnExit = document.getElementById('btnExit');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const exitModal = document.getElementById('exitModal');

const W = canvas.width;
const H = canvas.height;

const STORAGE_PREFIX = 'berry-bear-bakery';
const ROUND_SECONDS = 45;
const START_LIFE = 3;
const TAP_RADIUS = 72;
const TOP_H = 250;

const TREATS = [
  { id: 'strawberry', label: '딸기', short: '딸', jam: '#ff6f8f', glow: '#ffd1dc', crumb: '#fff0f3' },
  { id: 'blueberry', label: '블루베리', short: '블', jam: '#7f9dff', glow: '#dce6ff', crumb: '#f4f7ff' },
  { id: 'raspberry', label: '라즈베리', short: '라', jam: '#db6e9b', glow: '#ffe0ea', crumb: '#fff3f7' },
];

const STANDS = [
  { x: W * 0.18, y: 562 },
  { x: W * 0.5, y: 562 },
  { x: W * 0.82, y: 562 },
];

const AUDIO_PATHS = {
  bgm: './assets/audio/berry-bear-bakery-bgm.mp3',
  correct: './assets/audio/berry-bear-bakery-correct.mp3',
  wrong: './assets/audio/berry-bear-bakery-wrong.mp3',
  finish: './assets/audio/berry-bear-bakery-finish.mp3',
  tap: './assets/audio/berry-bear-bakery-tap.mp3',
  start: './assets/audio/berry-bear-bakery-start.mp3',
};

const AudioContextCtor = window.AudioContext || window.webkitAudioContext || null;
const audioCtx = AudioContextCtor ? new AudioContextCtor() : null;
const audioState = {
  bgm: null,
  sfx: {},
  ready: false,
};

let state = 'idle';
let pauseReason = null;
let gameOverReason = 'time';

let score = 0;
let best = 0;
let timeLeft = ROUND_SECONDS;
let life = START_LIFE;
let streak = 0;
let targetIndex = 0;
let mood = 'ready';
let orderPulse = 0;
let userHash = null;
let statusMessage = '딸기, 블루베리, 라즈베리 중 오늘 주문을 바로 탭하세요.';

let popEffects = [];
let sparkles = [];
let tick = 0;
let lastFrameAt = performance.now();

let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

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

function isHidden(element) {
  return element?.classList.contains('hidden');
}

function isRoundActive() {
  return state === 'running' && !pauseReason;
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
  if (!stageEl) return;

  const bounds = stageEl.getBoundingClientRect();
  const padding = 24;
  const availableWidth = Math.max(180, bounds.width - padding);
  const availableHeight = Math.max(280, bounds.height - padding);
  const ratio = W / H;

  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

function updateBridgeBadge(text, className) {
  bridgeBadgeEl.textContent = text;
  bridgeBadgeEl.className = `badge ${className}`;
}

function randomTreat(except = -1) {
  const options = [0, 1, 2].filter((index) => index !== except);
  return options[Math.floor(Math.random() * options.length)];
}

function addPopEffect(x, y, text, color) {
  popEffects.push({
    x,
    y,
    vy: -0.8,
    life: 32,
    text,
    color,
  });
}

function addSparkle(x, y, color) {
  for (let i = 0; i < 5; i += 1) {
    sparkles.push({
      x,
      y,
      vx: Math.cos((Math.PI * 2 * i) / 5) * (1.2 + i * 0.15),
      vy: Math.sin((Math.PI * 2 * i) / 5) * (1.1 + i * 0.16) - 0.5,
      life: 26 + i * 2,
      color,
    });
  }
}

function unlockAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  if (!audioState.ready) {
    const bgm = new Audio(AUDIO_PATHS.bgm);
    bgm.loop = true;
    bgm.preload = 'auto';
    bgm.volume = 0.28;
    bgm.setAttribute('playsinline', '');
    audioState.bgm = bgm;

    for (const key of ['correct', 'wrong', 'finish', 'tap', 'start']) {
      const clip = new Audio(AUDIO_PATHS[key]);
      clip.preload = 'auto';
      clip.volume = key === 'tap' ? 0.48 : 0.72;
      clip.setAttribute('playsinline', '');
      audioState.sfx[key] = clip;
    }

    audioState.ready = true;
  }

  syncBgm();
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
  if (kind === 'correct') {
    fallbackTone(760, 0.06, 0.03, 'triangle');
    fallbackTone(980, 0.08, 0.018, 'triangle');
    return;
  }

  if (kind === 'wrong') {
    fallbackTone(240, 0.13, 0.03, 'sawtooth');
    return;
  }

  if (kind === 'finish') {
    fallbackTone(200, 0.16, 0.025, 'square');
    return;
  }

  if (kind === 'start') {
    fallbackTone(540, 0.1, 0.025, 'triangle');
    return;
  }

  fallbackTone(420, 0.04, 0.013, 'sine');
}

function playSfx(kind) {
  const source = audioState.sfx[kind];
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

function syncBgm() {
  if (!audioState.bgm) return;

  const shouldPlay = isRoundActive() && !document.hidden;
  if (!shouldPlay) {
    audioState.bgm.pause();
    return;
  }

  audioState.bgm.play().catch(() => {
    // Autoplay policy fallback, unlocked on next gesture.
  });
}

function updateStatus(text = '') {
  if (text) {
    statusMessage = text;
  }

  if (pauseReason === 'background') {
    statusLineEl.textContent = '토스 앱 백그라운드 전환으로 잠시 일시정지되었습니다.';
    return;
  }

  if (pauseReason === 'exit') {
    statusLineEl.textContent = '종료 확인 중입니다.';
    return;
  }

  if (state === 'idle') {
    statusLineEl.textContent = statusMessage;
    return;
  }

  if (state === 'gameover') {
    statusLineEl.textContent = gameOverReason === 'life'
      ? '과자를 너무 많이 틀렸어요. 탭해서 다시 시작하세요.'
      : '베이커리가 닫혔어요. 탭해서 다시 시작하세요.';
    return;
  }

  statusLineEl.textContent = text || `콤보 x${streak}로 굽는 중입니다.`;
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  timeLeftEl.textContent = String(Math.ceil(timeLeft));
  updateStatus();
}

async function persistBest() {
  const value = String(best);
  await toss.storage.setItem(getScopedStorageKey('best'), value);
  safeLocalStorageSet(getScopedStorageKey('best'), value);
}

function setPauseReason(nextReason) {
  pauseReason = nextReason;
  syncBgm();
  updateHud();
}

function toggleBodyModalLock() {
  const modalOpen = !isHidden(exitModal);
  document.body.classList.toggle('modal-open', modalOpen);
}

function openExitModal() {
  if (isHidden(exitModal)) {
    exitModal.classList.remove('hidden');
  }
  toggleBodyModalLock();

  if (state === 'running') {
    setPauseReason('exit');
  }
}

function closeExitModal() {
  exitModal.classList.add('hidden');
  toggleBodyModalLock();

  if (pauseReason === 'exit') {
    setPauseReason(null);
  }
}

function chooseOrder(nextExcept = -1) {
  return randomTreat(nextExcept);
}

function startGame() {
  unlockAudio();
  closeExitModal();

  state = 'running';
  pauseReason = null;
  gameOverReason = 'time';

  score = 0;
  timeLeft = ROUND_SECONDS;
  life = START_LIFE;
  streak = 0;
  targetIndex = chooseOrder(-1);
  mood = 'focused';
  orderPulse = 0;
  popEffects = [];
  sparkles = [];
  statusMessage = '빵이 오븐에 들어갔습니다. 주문한 과자만 탭하세요.';

  updateStatus();
  playSfx('start');
  syncBgm();
  updateHud();
}

function endGame(reason) {
  state = 'gameover';
  pauseReason = null;
  gameOverReason = reason;
  mood = 'done';
  popEffects = [];
  sparkles = [];

  if (score > best) {
    best = score;
    void persistBest();
  }

  playSfx('finish');
  syncBgm();
  updateHud();
}

function randomPunchColor() {
  return ['#ff7b98', '#7ea5ff', '#e16d9d'][Math.floor(Math.random() * 3)];
}

function handleCorrect(stand) {
  const treat = TREATS[targetIndex];
  const bonus = 1 + Math.floor(streak / 5);

  score += bonus;
  streak += 1;
  timeLeft = Math.min(ROUND_SECONDS, timeLeft + 1.15);
  targetIndex = chooseOrder(targetIndex);
  mood = 'happy';
  orderPulse = 1;

  addPopEffect(stand.x, stand.y - 84, `+${bonus}`, treat.jam);
  addPopEffect(stand.x + 16, stand.y - 114, '좋아!', '#ffffff');
  addSparkle(stand.x, stand.y - 42, treat.glow);
  playSfx('correct');

  if (navigator.vibrate) navigator.vibrate(10);

  if (score > best) {
    best = score;
    void persistBest();
  }

  updateStatus(`${treat.label} 완성! 콤보 x${streak}`);
}

function handleWrong(stand) {
  life -= 1;
  streak = 0;
  mood = 'oops';
  orderPulse = 1;

  const treat = TREATS[targetIndex];
  addPopEffect(stand.x, stand.y - 84, '실수', randomPunchColor());
  playSfx('wrong');

  if (navigator.vibrate) navigator.vibrate([20, 20, 20]);

  if (life <= 0) {
    endGame('life');
    return;
  }

  targetIndex = chooseOrder(targetIndex);
  updateStatus(`${treat.label}가 아니라 다른 과자를 탭해야 해요.`);
}

function standFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  for (let index = 0; index < STANDS.length; index += 1) {
    const stand = STANDS[index];
    const dx = x - stand.x;
    const dy = y - stand.y;
    if (dx * dx + dy * dy <= TAP_RADIUS * TAP_RADIUS) {
      return index;
    }
  }

  return -1;
}

function handleChoiceTap(index) {
  const stand = STANDS[index];
  const isHit = index === targetIndex;

  if (isHit) {
    handleCorrect(stand);
  } else {
    handleWrong(stand);
  }

  updateHud();
}

function update(dt) {
  tick += 1;
  orderPulse = Math.max(0, orderPulse - dt * 1.8);

  for (let i = popEffects.length - 1; i >= 0; i -= 1) {
    const fx = popEffects[i];
    fx.y += fx.vy;
    fx.life -= 1;
    if (fx.life <= 0) {
      popEffects.splice(i, 1);
    }
  }

  for (let i = sparkles.length - 1; i >= 0; i -= 1) {
    const sparkle = sparkles[i];
    sparkle.x += sparkle.vx;
    sparkle.y += sparkle.vy;
    sparkle.vy += 0.02;
    sparkle.life -= 1;
    if (sparkle.life <= 0) {
      sparkles.splice(i, 1);
    }
  }

  if (!isRoundActive()) return;

  timeLeft = Math.max(0, timeLeft - dt);
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame('time');
    return;
  }

  if (streak >= 6) {
    mood = 'busy';
  }

  updateHud();
}

function drawCounter() {
  ctx.fillStyle = 'rgba(255, 247, 243, 0.88)';
  ctx.beginPath();
  ctx.roundRect(18, 126, W - 36, 552, 24);
  ctx.fill();

  ctx.fillStyle = 'rgba(125, 76, 94, 0.12)';
  ctx.beginPath();
  ctx.roundRect(28, 140, W - 56, 26, 13);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(0, 156, W, 20, 12);
  ctx.fill();
}

function drawBear() {
  const centerX = W * 0.5;
  const centerY = 322;
  const bob = Math.sin(tick * 0.035) * 4;
  const pulse = 1 + orderPulse * 0.06;

  ctx.save();
  ctx.translate(centerX, centerY + bob);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = '#b67856';
  ctx.beginPath();
  ctx.arc(-36, -54, 22, 0, Math.PI * 2);
  ctx.arc(36, -54, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d69b77';
  ctx.beginPath();
  ctx.arc(0, 0, 76, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff8f2';
  ctx.beginPath();
  ctx.arc(0, 10, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4f3a33';
  ctx.beginPath();
  ctx.arc(-18, -8, 4.6, 0, Math.PI * 2);
  ctx.arc(18, -8, 4.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4f3a33';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, 6);
  ctx.quadraticCurveTo(0, 12, 7, 6);
  ctx.stroke();

  ctx.fillStyle = mood === 'oops' ? '#f09ab0' : '#ff7aa0';
  ctx.beginPath();
  ctx.arc(-28, 8, 6, 0, Math.PI * 2);
  ctx.arc(28, 8, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff0e6';
  ctx.beginPath();
  ctx.roundRect(-32, 28, 64, 28, 14);
  ctx.fill();

  ctx.fillStyle = '#7b5361';
  ctx.font = '700 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('베리곰', 0, 42);

  ctx.restore();
}

function drawOrderBubble() {
  const treat = TREATS[targetIndex];
  const bubbleY = 178;

  ctx.fillStyle = 'rgba(255, 249, 246, 0.96)';
  ctx.beginPath();
  ctx.roundRect(72, 78, W - 144, 86, 24);
  ctx.fill();

  ctx.fillStyle = '#7d4c5f';
  ctx.font = '700 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('지금 주문', W * 0.5, 104);

  ctx.fillStyle = treat.glow;
  ctx.beginPath();
  ctx.arc(W * 0.5, bubbleY, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = treat.jam;
  ctx.beginPath();
  ctx.arc(W * 0.5, bubbleY, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '700 20px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(treat.short, W * 0.5, bubbleY + 1);

  ctx.fillStyle = '#7d4c5f';
  ctx.font = '600 14px sans-serif';
  ctx.fillText(`${treat.label} 타르트`, W * 0.5, 140);
}

function drawStands() {
  const current = TREATS[targetIndex];

  for (let index = 0; index < STANDS.length; index += 1) {
    const stand = STANDS[index];
    const treat = TREATS[index];
    const active = index === targetIndex;

    ctx.fillStyle = active ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 251, 250, 0.88)';
    ctx.beginPath();
    ctx.roundRect(stand.x - 64, stand.y - 76, 128, 180, 22);
    ctx.fill();

    ctx.fillStyle = active ? 'rgba(255, 186, 201, 0.55)' : 'rgba(149, 110, 127, 0.12)';
    ctx.beginPath();
    ctx.roundRect(stand.x - 58, stand.y - 70, 116, 36, 18);
    ctx.fill();

    ctx.fillStyle = treat.crumb;
    ctx.beginPath();
    ctx.arc(stand.x, stand.y - 8, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = treat.jam;
    ctx.beginPath();
    ctx.arc(stand.x, stand.y - 10, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '700 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(treat.short, stand.x, stand.y - 10);

    ctx.fillStyle = '#7d4c5f';
    ctx.font = '700 16px sans-serif';
    ctx.fillText(treat.label, stand.x, stand.y + 42);

    ctx.fillStyle = active ? '#6a3148' : 'rgba(122, 86, 105, 0.78)';
    ctx.font = '600 12px sans-serif';
    ctx.fillText(active ? '지금 탭' : '다음', stand.x, stand.y + 66);

    if (active) {
      ctx.strokeStyle = 'rgba(255, 109, 138, 0.46)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(stand.x - 68, stand.y - 80, 136, 188, 24);
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#7d4c5f';
  ctx.font = '700 14px sans-serif';
  ctx.fillText(`주문: ${current.label}`, W * 0.5, 534);
}

function drawLives() {
  const y = 52;
  const startX = 32;

  for (let i = 0; i < START_LIFE; i += 1) {
    const x = startX + i * 30;
    const active = i < life;

    ctx.fillStyle = active ? '#ff6b8b' : 'rgba(169, 125, 141, 0.42)';
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.arc(x - 6, y, 6, Math.PI, 0);
    ctx.arc(x + 6, y, 6, Math.PI, 0);
    ctx.lineTo(x, y + 18);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEffects() {
  for (const sparkle of sparkles) {
    ctx.globalAlpha = Math.max(0, sparkle.life / 26);
    ctx.fillStyle = sparkle.color;
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const fx of popEffects) {
    ctx.globalAlpha = Math.max(0, fx.life / 32);
    ctx.fillStyle = fx.color;
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.text, fx.x, fx.y);
  }

  ctx.globalAlpha = 1;
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = 'rgba(82, 37, 52, 0.54)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '700 34px sans-serif';
  ctx.fillText(title, W * 0.5, H * 0.5 - 24);

  ctx.font = '500 17px sans-serif';
  ctx.fillText(subtitle, W * 0.5, H * 0.5 + 20);
}

function render() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#ffe6ed');
  bg.addColorStop(0.55, '#fff3f6');
  bg.addColorStop(1, '#ffe9dc');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 26; i += 1) {
    const x = (i * 67 + tick * 0.28) % W;
    const y = (i * 41 + tick * 0.22) % H;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 123, 157, 0.12)' : 'rgba(122, 167, 255, 0.12)';
    ctx.fillRect(x, y, 4, 4);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillRect(16, 114, W - 32, 22);

  drawCounter();
  drawBear();
  drawOrderBubble();
  drawStands();
  drawLives();
  drawEffects();

  if (state === 'idle') {
    drawOverlay('베리베어 베이커리', '화면을 탭하면 바로 시작합니다');
    return;
  }

  if (state === 'gameover') {
    drawOverlay('베이커리 종료', `점수 ${score}점 · 다시 하려면 탭`);
    return;
  }

  if (pauseReason) {
    drawOverlay('일시정지', '토스 앱으로 돌아오면 이어서 플레이합니다');
  }
}

function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;

  update(dt);
  render();
  window.requestAnimationFrame(loop);
}

async function loadPersistedState() {
  const scopedBest = Number(await toss.storage.getItem(getScopedStorageKey('best')) || 0);
  best = Math.max(0, scopedBest);

  if (best > 0) {
    void persistBest();
  }

  updateHud();
}

async function initializeTossBridge() {
  updateBridgeBadge('웹 미리보기', 'badge-preview');
  userKeyHintEl.textContent = '브라우저에서도 같은 게임 화면을 미리 볼 수 있어요.';

  if (toss.isAvailable()) {
    try {
      applySafeAreaInsets(await toss.safeArea.get());
    } catch (error) {
      applySafeAreaInsets(null);
    }

    unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
      applySafeAreaInsets(insets);
      resizeStage();
    });
  } else {
    applySafeAreaInsets(null);
  }

  await toss.setDeviceOrientation('portrait');
  await toss.setIosSwipeGestureEnabled(false);

  unsubscribeBack = toss.events.onBack(() => {
    handleBackRequest();
  });

  unsubscribeHome = toss.events.onHome(() => {
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    }
  });

  const userKeyResult = await toss.getUserKeyForGame();
  if (userKeyResult && userKeyResult.type === 'HASH') {
    userHash = userKeyResult.hash;
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '최고 점수가 토스 게임 계정 단위로 저장됩니다.';
  } else if (toss.isAvailable()) {
    updateBridgeBadge('토스 미리보기', 'badge-fallback');
    userKeyHintEl.textContent = '토스 브리지는 연결됐지만 계정 키를 받지 못해 로컬 저장소를 함께 사용합니다.';
  }

  await loadPersistedState();
}

function handleBackRequest() {
  if (!isHidden(exitModal)) {
    closeExitModal();
    return;
  }

  openExitModal();
}

async function leaveGame() {
  await toss.setIosSwipeGestureEnabled(true);

  const closedInToss = await toss.closeView();
  if (closedInToss !== false) {
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = new URL('../', window.location.href).toString();
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    } else {
      syncBgm();
    }
    return;
  }

  if (pauseReason === 'background') {
    setPauseReason(null);
  } else {
    syncBgm();
  }
}

function handleCanvasPointer(event) {
  unlockAudio();

  if (pauseReason) return;

  if (state !== 'running') {
    startGame();
  }

  const standIndex = standFromPointer(event);
  if (standIndex < 0) {
    playSfx('tap');
    updateStatus('아래의 세 과자 중 하나를 탭하세요.');
    updateHud();
    return;
  }

  handleChoiceTap(standIndex);
}

function attachEventListeners() {
  window.addEventListener('resize', resizeStage);
  window.addEventListener('orientationchange', resizeStage);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => {
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    }
  });
  window.addEventListener('pageshow', () => {
    if (pauseReason === 'background' && !document.hidden) {
      setPauseReason(null);
    }
  });

  canvas.addEventListener('pointerdown', handleCanvasPointer);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleBackRequest();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (state !== 'running' && !pauseReason) {
        startGame();
      }
      return;
    }

    if (state !== 'running' || pauseReason) return;

    if (event.key === '1') handleChoiceTap(0);
    if (event.key === '2') handleChoiceTap(1);
    if (event.key === '3') handleChoiceTap(2);
  });

  btnExit.addEventListener('click', openExitModal);
  btnCancelExit.addEventListener('click', closeExitModal);
  btnConfirmExit.addEventListener('click', () => {
    void leaveGame();
  });

  exitModal.addEventListener('click', (event) => {
    if (event.target === exitModal) {
      closeExitModal();
    }
  });

  window.addEventListener('beforeunload', () => {
    unsubscribeSafeArea();
    unsubscribeBack();
    unsubscribeHome();
    void toss.setIosSwipeGestureEnabled(true);
  });
}

attachEventListeners();
updateHud();
resizeStage();
render();
loop();
void initializeTossBridge();
