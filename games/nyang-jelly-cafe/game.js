const toss = window.NyangJellyCafeToss || {
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

const STORAGE_PREFIX = 'nyang-jelly-cafe';
const LEGACY_BEST_KEY = 'nyang-jelly-cafe-best';

const ROUND_SECONDS = 60;
const START_LIFE = 3;
const TAP_RADIUS = 72;

const JELLIES = [
  { id: 'berry', label: '딸기 젤리', icon: 'B', color: '#ff88b9', light: '#ffd6e9' },
  { id: 'mint', label: '민트 젤리', icon: 'M', color: '#8af0cf', light: '#d7ffef' },
  { id: 'lemon', label: '레몬 젤리', icon: 'L', color: '#ffe088', light: '#fff3cd' },
];

const SEATS = [
  { x: W * 0.28, y: 236 },
  { x: W * 0.72, y: 236 },
  { x: W * 0.28, y: 426 },
  { x: W * 0.72, y: 426 },
];

const AUDIO_PATHS = {
  bgm: './assets/audio/nyang-jelly-cafe-bgm.mp3',
  serve: './assets/audio/nyang-jelly-cafe-serve.mp3',
  miss: './assets/audio/nyang-jelly-cafe-miss.mp3',
  timeout: './assets/audio/nyang-jelly-cafe-timeout.mp3',
  tap: './assets/audio/nyang-jelly-cafe-tap.mp3',
  start: './assets/audio/nyang-jelly-cafe-start.mp3',
};

const audioCtx = window.AudioContext ? new AudioContext() : null;
const audioState = {
  bgm: null,
  sfx: {},
  ready: false,
};

let state = 'idle'; // idle | running | gameover
let pauseReason = null; // null | background | exit
let gameOverReason = 'time';

let score = 0;
let best = 0;
let timeLeft = ROUND_SECONDS;
let life = START_LIFE;
let combo = 0;
let currentJelly = 0;
let userHash = null;

let cats = [];
let popEffects = [];
let nextCatId = 1;
let spawnTimer = 0;
let spawnBase = 2.25;
let statusMessage = '요청 젤리와 같은 고양이를 바로 탭해서 서빙하세요.';

let lastFrameAt = performance.now();
let tick = 0;

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
  const availableWidth = Math.max(160, bounds.width - padding);
  const availableHeight = Math.max(280, bounds.height - padding);
  const ratio = W / H;

  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

function randomJelly(except = -1) {
  const options = [0, 1, 2].filter((index) => index !== except);
  return options[Math.floor(Math.random() * options.length)];
}

function findCatAtSeat(seatIndex) {
  return cats.find((cat) => cat.seatIndex === seatIndex) || null;
}

function freeSeatIndices() {
  const occupied = new Set(cats.map((cat) => cat.seatIndex));
  const free = [];

  for (let index = 0; index < SEATS.length; index += 1) {
    if (!occupied.has(index)) {
      free.push(index);
    }
  }

  return free;
}

function progressRatio() {
  return Math.min(1, (ROUND_SECONDS - timeLeft) / ROUND_SECONDS);
}

function spawnCat() {
  const free = freeSeatIndices();
  if (free.length <= 0) return;

  const seatIndex = free[Math.floor(Math.random() * free.length)];
  const progress = progressRatio();

  const maxPatience = Math.max(2.7, 6.2 - progress * 2.6 + Math.random() * 0.6);
  cats.push({
    id: nextCatId,
    seatIndex,
    want: randomJelly(-1),
    patience: maxPatience,
    maxPatience,
    wobble: Math.random() * Math.PI * 2,
  });

  nextCatId += 1;
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

function unlockAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  if (!audioState.ready) {
    const bgm = new Audio(AUDIO_PATHS.bgm);
    bgm.loop = true;
    bgm.preload = 'auto';
    bgm.volume = 0.35;
    bgm.setAttribute('playsinline', '');
    audioState.bgm = bgm;

    for (const key of ['serve', 'miss', 'timeout', 'tap', 'start']) {
      const clip = new Audio(AUDIO_PATHS[key]);
      clip.preload = 'auto';
      clip.volume = key === 'tap' ? 0.5 : 0.72;
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
  if (kind === 'serve') {
    fallbackTone(720, 0.07, 0.03, 'triangle');
    fallbackTone(960, 0.1, 0.018, 'triangle');
    return;
  }

  if (kind === 'miss') {
    fallbackTone(260, 0.12, 0.03, 'sawtooth');
    return;
  }

  if (kind === 'timeout') {
    fallbackTone(210, 0.16, 0.026, 'square');
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

function updateBridgeBadge(text, className) {
  bridgeBadgeEl.textContent = text;
  bridgeBadgeEl.className = `badge ${className}`;
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
    statusLineEl.textContent = '화면을 탭하면 카페 영업이 바로 시작됩니다.';
    return;
  }

  if (state === 'gameover') {
    if (gameOverReason === 'life') {
      statusLineEl.textContent = '고양이들이 기다리다 떠났어요. 탭해서 다시 시작해요.';
      return;
    }
    statusLineEl.textContent = '영업 시간이 종료됐어요. 탭해서 다시 시작해요.';
    return;
  }

  statusLineEl.textContent = statusMessage;
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
  safeLocalStorageSet(LEGACY_BEST_KEY, value);
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

function startGame() {
  unlockAudio();
  closeExitModal();

  state = 'running';
  pauseReason = null;
  gameOverReason = 'time';

  score = 0;
  timeLeft = ROUND_SECONDS;
  life = START_LIFE;
  combo = 0;
  currentJelly = randomJelly(-1);

  cats = [];
  popEffects = [];
  spawnTimer = 0.35;
  spawnBase = 2.25;

  updateStatus('요청 젤리와 같은 고양이를 탭해서 서빙하세요.');
  playSfx('start');
  syncBgm();
  updateHud();
}

function endGame(reason) {
  state = 'gameover';
  pauseReason = null;
  gameOverReason = reason;
  cats = [];
  spawnTimer = 0;

  if (score > best) {
    best = score;
    void persistBest();
  }

  syncBgm();
  updateHud();
}

function removeCat(catId) {
  const index = cats.findIndex((cat) => cat.id === catId);
  if (index >= 0) {
    cats.splice(index, 1);
  }
}

function onMiss(seat, text = '앗!') {
  life -= 1;
  combo = 0;
  addPopEffect(seat.x, seat.y - 34, text, '#ff7ea9');
  playSfx('miss');

  if (navigator.vibrate) navigator.vibrate([26, 24, 26]);

  if (life <= 0) {
    endGame('life');
  } else {
    updateStatus('메뉴가 달라요. 같은 색 젤리를 요청한 고양이를 탭해 주세요.');
  }

  updateHud();
}

function serveSeat(seatIndex) {
  if (!isRoundActive()) return;

  const seat = SEATS[seatIndex];
  const cat = findCatAtSeat(seatIndex);
  if (!cat) {
    playSfx('tap');
    addPopEffect(seat.x, seat.y - 30, '비어있음', '#8f6da7');
    updateStatus('손님이 있는 자리만 탭하면 됩니다.');
    updateHud();
    return;
  }

  if (cat.want === currentJelly) {
    const jelly = JELLIES[currentJelly];

    const gain = 1 + Math.floor(combo / 3);
    score += gain;
    combo += 1;

    removeCat(cat.id);
    addPopEffect(seat.x, seat.y - 34, `+${gain}`, jelly.color);
    addPopEffect(seat.x + 18, seat.y - 66, '냥!', '#ffffff');

    currentJelly = randomJelly(currentJelly);

    if (score > best) {
      best = score;
      void persistBest();
    }

    playSfx('serve');
    if (navigator.vibrate) navigator.vibrate(10);

    updateStatus(`${jelly.label} 서빙 성공! 콤보 x${combo}`);
    updateHud();
    return;
  }

  removeCat(cat.id);
  currentJelly = randomJelly(currentJelly);
  onMiss(seat, '메뉴 틀림');
}

function canvasSeatFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  for (let index = 0; index < SEATS.length; index += 1) {
    const seat = SEATS[index];
    const dx = x - seat.x;
    const dy = y - seat.y;
    if (dx * dx + dy * dy <= TAP_RADIUS * TAP_RADIUS) {
      return index;
    }
  }

  return -1;
}

function update(dt) {
  tick += 1;

  for (let i = popEffects.length - 1; i >= 0; i -= 1) {
    const fx = popEffects[i];
    fx.y += fx.vy;
    fx.life -= 1;
    if (fx.life <= 0) {
      popEffects.splice(i, 1);
    }
  }

  if (!isRoundActive()) return;

  timeLeft = Math.max(0, timeLeft - dt);
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame('time');
    return;
  }

  const progress = progressRatio();
  spawnBase = Math.max(0.88, 2.25 - progress * 1.2);
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnCat();
    spawnTimer = spawnBase;
  }

  for (let i = cats.length - 1; i >= 0; i -= 1) {
    const cat = cats[i];
    cat.wobble += dt * 2.4;

    const patienceDecay = 1 + progress * 0.8;
    cat.patience -= dt * patienceDecay;

    if (cat.patience > 0) continue;

    const seat = SEATS[cat.seatIndex];
    removeCat(cat.id);

    playSfx('timeout');
    addPopEffect(seat.x, seat.y - 34, '기다림 한계', '#ff9ca5');

    onMiss(seat, '떠남');
  }

  updateHud();
}

function drawSeat(seat, index) {
  const cat = findCatAtSeat(index);

  ctx.fillStyle = cat ? 'rgba(255, 231, 248, 0.95)' : 'rgba(252, 226, 245, 0.65)';
  ctx.beginPath();
  ctx.arc(seat.x, seat.y, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(122, 73, 156, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (!cat) {
    ctx.fillStyle = 'rgba(134, 99, 161, 0.45)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('빈 자리', seat.x, seat.y);
    return;
  }

  const bob = Math.sin(cat.wobble) * 2.2;
  const faceY = seat.y + bob;

  ctx.fillStyle = '#fffdfd';
  ctx.beginPath();
  ctx.arc(seat.x, faceY, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fffdfd';
  ctx.beginPath();
  ctx.moveTo(seat.x - 30, faceY - 18);
  ctx.lineTo(seat.x - 16, faceY - 50);
  ctx.lineTo(seat.x - 2, faceY - 20);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(seat.x + 30, faceY - 18);
  ctx.lineTo(seat.x + 16, faceY - 50);
  ctx.lineTo(seat.x + 2, faceY - 20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#4b365f';
  ctx.beginPath();
  ctx.arc(seat.x - 14, faceY - 4, 4, 0, Math.PI * 2);
  ctx.arc(seat.x + 14, faceY - 4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4b365f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(seat.x - 8, faceY + 14);
  ctx.quadraticCurveTo(seat.x, faceY + 20, seat.x + 8, faceY + 14);
  ctx.stroke();

  const jelly = JELLIES[cat.want];
  const bubbleY = seat.y - 74;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(seat.x - 38, bubbleY - 24, 76, 34, 14);
  ctx.fill();

  ctx.fillStyle = jelly.color;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(jelly.icon, seat.x, bubbleY - 7);

  const patienceRatio = Math.max(0, cat.patience / cat.maxPatience);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(seat.x - 36, seat.y + 56, 72, 10, 8);
  ctx.fill();

  const patienceWidth = 70 * patienceRatio;
  ctx.fillStyle = patienceRatio < 0.35 ? '#ff8fa1' : '#8af0cf';
  ctx.beginPath();
  ctx.roundRect(seat.x - 35, seat.y + 57, patienceWidth, 8, 8);
  ctx.fill();
}

function drawCurrentJelly() {
  const jelly = JELLIES[currentJelly];

  ctx.fillStyle = 'rgba(255, 240, 251, 0.95)';
  ctx.beginPath();
  ctx.roundRect(78, H - 176, W - 156, 132, 22);
  ctx.fill();

  ctx.fillStyle = '#583d71';
  ctx.font = '600 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('지금 만들 젤리', W * 0.5, H - 136);

  ctx.fillStyle = jelly.light;
  ctx.beginPath();
  ctx.arc(W * 0.5, H - 90, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = jelly.color;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(jelly.icon, W * 0.5, H - 90);

  ctx.fillStyle = '#5f456f';
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(jelly.label, W * 0.5, H - 52);
}

function drawHearts() {
  const startX = W - 34;
  const y = 52;

  for (let i = 0; i < START_LIFE; i += 1) {
    const x = startX - i * 28;
    const active = i < life;

    ctx.fillStyle = active ? '#ff7aa8' : 'rgba(182, 150, 176, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, y + 7);
    ctx.arc(x - 6, y + 1, 6, Math.PI, 0);
    ctx.arc(x + 6, y + 1, 6, Math.PI, 0);
    ctx.lineTo(x, y + 16);
    ctx.closePath();
    ctx.fill();
  }
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = 'rgba(33, 19, 52, 0.56)';
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
  bg.addColorStop(0, '#ffe8f5');
  bg.addColorStop(1, '#ffd8eb');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 30; i += 1) {
    const x = (i * 97) % W;
    const y = (i * 49 + tick * 0.9) % H;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 184, 209, 0.2)' : 'rgba(155, 245, 218, 0.2)';
    ctx.fillRect(x, y, 3, 3);
  }

  ctx.fillStyle = 'rgba(255, 247, 252, 0.82)';
  ctx.fillRect(20, 132, W - 40, H - 330);

  for (let seatIndex = 0; seatIndex < SEATS.length; seatIndex += 1) {
    drawSeat(SEATS[seatIndex], seatIndex);
  }

  drawCurrentJelly();
  drawHearts();

  for (const fx of popEffects) {
    ctx.globalAlpha = Math.max(0, fx.life / 32);
    ctx.fillStyle = fx.color;
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.text, fx.x, fx.y);
  }
  ctx.globalAlpha = 1;

  if (state === 'idle') {
    drawOverlay('냥젤리 카페 오픈!', '화면을 탭해서 바로 플레이');
    return;
  }

  if (state === 'gameover') {
    drawOverlay('영업 종료', `점수 ${score}점 · 다시 하려면 탭`);
    return;
  }

  if (pauseReason) {
    drawOverlay('일시정지', '토스 앱으로 돌아오면 이어서 플레이');
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
  const legacyBest = Number(safeLocalStorageGet(LEGACY_BEST_KEY) || 0);
  best = Math.max(scopedBest, legacyBest);

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
    return;
  }

  const seatIndex = canvasSeatFromPointer(event);
  if (seatIndex < 0) {
    playSfx('tap');
    updateStatus('고양이가 있는 테이블을 눌러주세요.');
    updateHud();
    return;
  }

  serveSeat(seatIndex);
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

    if (event.key === '1') serveSeat(0);
    if (event.key === '2') serveSeat(1);
    if (event.key === '3') serveSeat(2);
    if (event.key === '4') serveSeat(3);
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
