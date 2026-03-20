const toss = window.ZigzagMemoryRunToss || {
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
        // Ignore preview storage errors.
      }
    },
  },
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageCard = document.getElementById('stageCard');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const roundLengthEl = document.getElementById('roundLength');
const statusLineEl = document.getElementById('statusLine');
const bridgeBadgeEl = document.getElementById('bridgeBadge');
const userKeyHintEl = document.getElementById('userKeyHint');

const btnStart = document.getElementById('btnStart');
const btnMusic = document.getElementById('btnMusic');
const btnSfx = document.getElementById('btnSfx');
const btnExit = document.getElementById('btnExit');
const btnInfo = document.getElementById('btnInfo');
const btnCloseInfo = document.getElementById('btnCloseInfo');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');
const btnRestart = document.getElementById('btnRestart');
const btnGameOverExit = document.getElementById('btnGameOverExit');

const gameOverModal = document.getElementById('gameOverModal');
const exitModal = document.getElementById('exitModal');
const infoModal = document.getElementById('infoModal');
const finalScoreEl = document.getElementById('finalScore');
const finalBestEl = document.getElementById('finalBest');
const finalStreakEl = document.getElementById('finalStreak');

const W = canvas.width;
const H = canvas.height;
const LEGACY_BEST_KEY = 'zigzag-memory-run-best';
const LEGACY_SETTINGS_KEY = 'zigzag-memory-run-settings';
const STORAGE_PREFIX = 'zigzag-memory-run';

const START_Y = H * 0.8;
const STEP_Y = 42;
const STEP_X = 38;
const MIN_GOAL_Y = 148;
const MAX_ROUND_LENGTH = 14;

const settings = {
  musicEnabled: true,
  sfxEnabled: true,
};

let state = 'idle'; // idle | preview | input | gameover
let pauseReason = null;
let score = 0;
let best = 0;
let streak = 0;
let maxStreakThisRun = 0;
let tick = 0;
let flash = 0;
let previewGlow = 0;
let roundLength = 4;
let inputIndex = 0;
let previewStep = 0;
let previewTimer = 0;
let userHash = null;
let lastInputAt = 0;

let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

let sequence = [];
const particles = [];

const audioCtx = window.AudioContext ? new AudioContext() : null;
const bgmAudio = new Audio('../assets/audio/zigzag-memory-run-pixabay-488126.mp3');
bgmAudio.loop = true;
bgmAudio.preload = 'auto';
bgmAudio.volume = 0.38;
bgmAudio.setAttribute('playsinline', '');

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

function isPlayableState() {
  return state === 'preview' || state === 'input';
}

function isGameActive() {
  return isPlayableState() && !pauseReason;
}

function toggleBodyModalLock() {
  const modalOpen = !isHidden(exitModal) || !isHidden(infoModal);
  document.body.classList.toggle('modal-open', modalOpen);
}

function showElement(element) {
  element?.classList.remove('hidden');
  toggleBodyModalLock();
}

function hideElement(element) {
  element?.classList.add('hidden');
  toggleBodyModalLock();
}

function showGameOverModal() {
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(best);
  finalStreakEl.textContent = String(maxStreakThisRun);
  gameOverModal.classList.remove('hidden');
}

function hideGameOverModal() {
  gameOverModal.classList.add('hidden');
}

function setButtonState(button, isActive, activeLabel, inactiveLabel) {
  button.dataset.active = isActive ? 'true' : 'false';
  button.setAttribute('aria-pressed', String(isActive));
  button.textContent = isActive ? activeLabel : inactiveLabel;
}

function updateAudioButtons() {
  setButtonState(btnMusic, settings.musicEnabled, 'BGM 켜짐', 'BGM 꺼짐');
  setButtonState(btnSfx, settings.sfxEnabled, '효과음 켜짐', '효과음 꺼짐');
}

function updateStartButtonLabel() {
  btnStart.textContent = isPlayableState() ? '다시 시작' : '시작';
}

function updateBridgeBadge(text, className) {
  bridgeBadgeEl.textContent = text;
  bridgeBadgeEl.className = `badge ${className}`;
}

function getStatusText() {
  if (pauseReason === 'background') {
    return '토스 앱이 백그라운드로 전환되어 자동으로 일시정지되었어요.';
  }

  if (pauseReason === 'info' || pauseReason === 'exit') {
    return '현재 라운드가 일시정지되어 있어요.';
  }

  if (state === 'preview') {
    return `패턴을 보는 중이에요. 제시가 끝나면 ${sequence.length}번 순서대로 입력해 주세요.`;
  }

  if (state === 'input') {
    return `입력 진행 중: ${inputIndex}/${sequence.length}. 왼쪽과 오른쪽 순서를 정확히 복기하세요.`;
  }

  if (state === 'gameover') {
    return '오답으로 종료됐어요. 다시 시작해서 더 긴 패턴에 도전해 보세요.';
  }

  return '패턴이 제시되면 순서를 기억하고, 입력 단계에서 같은 방향으로 복기하세요.';
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  streakEl.textContent = String(streak);
  roundLengthEl.textContent = String(roundLength);
  statusLineEl.textContent = getStatusText();

  scoreEl.closest('.hud-card')?.classList.toggle('warn', state === 'input' && inputIndex > 0);
  streakEl.closest('.hud-card')?.classList.toggle('hot', streak >= 3);
  roundLengthEl.closest('.hud-card')?.classList.toggle('warn', roundLength >= 8);
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
  if (!stageCard) return;

  const bounds = stageCard.getBoundingClientRect();
  const padding = 36;
  const availableWidth = Math.max(160, bounds.width - padding);
  const availableHeight = Math.max(240, bounds.height - padding);
  const ratio = W / H;
  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

async function unlockAudio() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (error) {
      // Ignore autoplay restrictions until the next gesture.
    }
  }
}

function shouldPlayMusic() {
  return isGameActive() && settings.musicEnabled && !document.hidden;
}

async function syncAudio() {
  if (shouldPlayMusic()) {
    try {
      await bgmAudio.play();
    } catch (error) {
      // Ignore autoplay restrictions until the next user gesture.
    }
  } else {
    bgmAudio.pause();
  }

  if (!audioCtx) return;

  const shouldSuspendSfx = document.hidden || pauseReason || !settings.sfxEnabled;
  if (shouldSuspendSfx && audioCtx.state === 'running') {
    audioCtx.suspend().catch(() => {});
  }
}

function beep(freq, duration, gain = 0.02, type = 'triangle') {
  if (!audioCtx || !settings.sfxEnabled || document.hidden || pauseReason) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const amplifier = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;
  amplifier.gain.setValueAtTime(gain, now);
  amplifier.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(amplifier);
  amplifier.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function vibrate(pattern) {
  if (!navigator.vibrate || !settings.sfxEnabled || document.hidden || pauseReason) return;
  navigator.vibrate(pattern);
}

function playCorrectSfx() {
  beep(580, 0.04, 0.018, 'square');
  beep(760, 0.03, 0.012, 'triangle');
}

function playRoundClearSfx() {
  beep(720, 0.05, 0.02, 'triangle');
  beep(960, 0.09, 0.028, 'triangle');
}

function playFailSfx() {
  beep(210, 0.17, 0.045, 'sawtooth');
  beep(150, 0.22, 0.025, 'square');
}

function playPromptSfx() {
  beep(680, 0.06, 0.017, 'triangle');
}

function playBlockedSfx() {
  beep(260, 0.04, 0.012, 'square');
}

function addBurst(x, y, color, amount = 10) {
  for (let index = 0; index < amount; index += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 24 + Math.random() * 16,
      color,
    });
  }
}

function generateSequence(length) {
  const nextSequence = [];
  let lane = 0;

  for (let index = 0; index < length; index += 1) {
    const options = [];
    if (lane > -3) options.push(-1);
    if (lane < 3) options.push(1);

    const pick = options[Math.floor(Math.random() * options.length)];
    lane += pick;
    nextSequence.push(pick);
  }

  return nextSequence;
}

function sequenceToPoints(currentSequence) {
  const points = [{ x: W * 0.5, y: START_Y }];
  let lane = 0;
  const spanY = Math.max(1, START_Y - MIN_GOAL_Y);
  const stepY = Math.max(18, Math.min(STEP_Y, spanY / Math.max(1, currentSequence.length)));

  for (let index = 0; index < currentSequence.length; index += 1) {
    lane += currentSequence[index];
    points.push({
      x: W * 0.5 + lane * STEP_X,
      y: START_Y - (index + 1) * stepY,
    });
  }

  return points;
}

function setPauseReason(nextReason) {
  pauseReason = nextReason;
  updateHud();
  void syncAudio();
}

function pauseForOverlay(reason) {
  if (isPlayableState() && !pauseReason) {
    setPauseReason(reason);
  }
}

function resumeFromOverlay(reason) {
  if (pauseReason === reason) {
    setPauseReason(null);
  }
}

function openInfoModal() {
  pauseForOverlay('info');
  showElement(infoModal);
}

function closeInfoModal() {
  hideElement(infoModal);
  resumeFromOverlay('info');
}

function openExitModal() {
  pauseForOverlay('exit');
  showElement(exitModal);
}

function closeExitModal() {
  hideElement(exitModal);
  resumeFromOverlay('exit');
}

function startRound() {
  sequence = generateSequence(roundLength);
  inputIndex = 0;
  previewStep = 0;
  previewTimer = 32;
  previewGlow = 22;
  state = 'preview';
  updateHud();
  updateStartButtonLabel();
  void syncAudio();
}

function resetGame() {
  state = 'idle';
  pauseReason = null;
  score = 0;
  streak = 0;
  maxStreakThisRun = 0;
  tick = 0;
  flash = 0;
  previewGlow = 0;
  roundLength = 4;
  inputIndex = 0;
  previewStep = 0;
  previewTimer = 0;
  sequence = [];
  particles.length = 0;
  hideGameOverModal();
  updateHud();
  updateStartButtonLabel();
  void syncAudio();
}

async function startGame() {
  await unlockAudio();
  closeInfoModal();
  closeExitModal();
  hideGameOverModal();
  resetGame();
  startRound();
}

async function persistBest() {
  const value = String(best);
  await toss.storage.setItem(getScopedStorageKey('best'), value);
  safeLocalStorageSet(LEGACY_BEST_KEY, value);
}

async function persistSettings() {
  const raw = JSON.stringify(settings);
  await toss.storage.setItem(getScopedStorageKey('settings'), raw);
  safeLocalStorageSet(LEGACY_SETTINGS_KEY, raw);
}

function endGame() {
  state = 'gameover';
  setPauseReason(null);
  flash = 14;
  playFailSfx();
  vibrate([40, 40, 50]);

  best = Math.max(best, score);
  void persistBest();
  showGameOverModal();
  updateHud();
  updateStartButtonLabel();
}

function inputDir(direction) {
  const now = performance.now();
  if (now - lastInputAt < 110) return;
  lastInputAt = now;

  if (pauseReason) return;

  if (state === 'idle' || state === 'gameover') {
    void startGame();
    return;
  }

  if (state !== 'input') {
    playBlockedSfx();
    return;
  }

  const expected = sequence[inputIndex];
  if (direction !== expected) {
    const points = sequenceToPoints(sequence.slice(0, Math.max(1, inputIndex + 1)));
    const lastPoint = points[points.length - 1];
    addBurst(lastPoint.x, lastPoint.y, '#ff8b7a', 24);
    endGame();
    return;
  }

  inputIndex += 1;
  playCorrectSfx();
  vibrate(10);

  const enteredPoints = sequenceToPoints(sequence.slice(0, inputIndex));
  const lastPoint = enteredPoints[enteredPoints.length - 1];
  addBurst(lastPoint.x, lastPoint.y, '#74f7d4', 7);

  if (inputIndex >= sequence.length) {
    streak += 1;
    maxStreakThisRun = Math.max(maxStreakThisRun, streak);
    score += 1 + Math.floor(streak / 3);
    flash = 18;
    previewGlow = 18;
    roundLength = Math.min(MAX_ROUND_LENGTH, roundLength + 1);
    playRoundClearSfx();
    vibrate([20, 30, 20]);
    updateHud();
    startRound();
    return;
  }

  updateHud();
}

function update() {
  tick += 1;
  if (flash > 0) flash -= 1;
  if (previewGlow > 0) previewGlow -= 1;

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.06;
    particle.life -= 1;
  }

  for (let index = particles.length - 1; index >= 0; index -= 1) {
    if (particles[index].life <= 0) {
      particles.splice(index, 1);
    }
  }

  if (!isGameActive()) return;

  if (state === 'preview') {
    previewTimer -= 1;
    if (previewTimer <= 0) {
      previewStep += 1;
      if (previewStep > sequence.length) {
        state = 'input';
        inputIndex = 0;
        previewGlow = 16;
        playPromptSfx();
        updateHud();
      } else {
        previewTimer = previewStep === sequence.length ? 18 : 14;
      }
    }
  }
}

function drawPath(points, color, width = 6) {
  if (points.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();
}

function drawNode(point, fill, radius) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function renderBoardBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#091626');
  gradient.addColorStop(1, '#06101a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  for (let index = 0; index < 40; index += 1) {
    const x = (index * 83) % W;
    const y = (index * 47 + tick * 0.9) % H;
    ctx.fillStyle = index % 3 === 0 ? 'rgba(116, 247, 212, 0.18)' : 'rgba(157, 201, 255, 0.16)';
    ctx.fillRect(x, y, 2, 2);
  }

  const boardX = 34;
  const boardY = 110;
  const boardWidth = W - 68;
  const boardHeight = H - 176;

  ctx.fillStyle = flash > 0 ? 'rgba(112, 255, 202, 0.12)' : '#102034';
  ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
  ctx.strokeStyle = 'rgba(135, 201, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boardX, boardY, boardWidth, boardHeight);

  for (let lane = -3; lane <= 3; lane += 1) {
    const x = W * 0.5 + lane * STEP_X;
    ctx.strokeStyle = lane === 0 ? 'rgba(116, 247, 212, 0.2)' : 'rgba(131, 176, 220, 0.12)';
    ctx.beginPath();
    ctx.moveTo(x, boardY + 12);
    ctx.lineTo(x, boardY + boardHeight - 12);
    ctx.stroke();
  }

  for (let y = boardY + 24; y <= boardY + boardHeight - 24; y += 52) {
    ctx.strokeStyle = 'rgba(160, 193, 228, 0.08)';
    ctx.beginPath();
    ctx.moveTo(boardX + 12, y);
    ctx.lineTo(boardX + boardWidth - 12, y);
    ctx.stroke();
  }
}

function renderOverlay(title, subtitle) {
  ctx.fillStyle = 'rgba(2, 6, 10, 0.52)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(title, W / 2, H / 2 - 12);
  ctx.font = '16px sans-serif';
  ctx.fillText(subtitle, W / 2, H / 2 + 20);
}

function render() {
  renderBoardBackground();

  const fullPoints = sequenceToPoints(sequence);
  const enteredPoints = sequenceToPoints(sequence.slice(0, inputIndex));
  const previewPoints = sequenceToPoints(sequence.slice(0, Math.min(previewStep, sequence.length)));

  if (state === 'preview') {
    drawPath(previewPoints, '#9cc9ff', 4);
    drawPath(previewPoints, '#74f7d4', 7);

    for (let index = 0; index < previewPoints.length; index += 1) {
      const point = previewPoints[index];
      const alpha = index === previewPoints.length - 1 ? 0.9 : 0.55;
      drawNode(point, `rgba(255, 212, 121, ${alpha})`, index === previewPoints.length - 1 ? 8 : 5);
    }
  } else if (state === 'input' || state === 'gameover') {
    drawPath(enteredPoints, '#74f7d4', 7);
    drawPath(enteredPoints, 'rgba(156, 201, 255, 0.55)', 3);

    for (let index = 0; index < enteredPoints.length; index += 1) {
      const point = enteredPoints[index];
      drawNode(point, index === enteredPoints.length - 1 ? '#ffd479' : '#74f7d4', index === enteredPoints.length - 1 ? 7 : 4);
    }
  }

  const startPoint = fullPoints[0] || { x: W * 0.5, y: START_Y };
  const goalPoint = fullPoints[fullPoints.length - 1] || { x: W * 0.5, y: START_Y - STEP_Y };
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.18);

  drawNode(startPoint, '#ffd479', 8);
  ctx.strokeStyle = `rgba(116, 247, 212, ${0.45 + pulse * 0.28 + previewGlow * 0.008})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(goalPoint.x, goalPoint.y, 12 + pulse * 2.4, 0, Math.PI * 2);
  ctx.stroke();

  for (const particle of particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life / 34);
    ctx.fillRect(particle.x, particle.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = state === 'input' ? '#ffe4b0' : '#e8f2ff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`Pattern ${roundLength}`, 18, 56);
  ctx.font = '15px sans-serif';

  if (state === 'preview') {
    ctx.fillText('Watch the route', 18, 82);
  } else if (state === 'input') {
    ctx.fillText(`Input ${inputIndex}/${sequence.length}`, 18, 82);
  } else if (state === 'gameover') {
    ctx.fillText('Wrong turn', 18, 82);
  } else {
    ctx.fillText('Ready to start', 18, 82);
  }

  if (state === 'idle') {
    renderOverlay('패턴 기억 준비', '시작 버튼이나 화면 탭으로 바로 도전할 수 있어요.');
  }

  if (pauseReason && isPlayableState()) {
    renderOverlay('일시정지', '토스 앱으로 돌아오면 이어서 플레이할 수 있어요.');
  }
}

function loop() {
  update();
  render();
  window.requestAnimationFrame(loop);
}

async function loadPersistedState() {
  const storedBest = Number(await toss.storage.getItem(getScopedStorageKey('best')) || 0);
  const legacyBest = Number(safeLocalStorageGet(LEGACY_BEST_KEY) || 0);
  best = Math.max(storedBest, legacyBest);

  const storedSettingsRaw = await toss.storage.getItem(getScopedStorageKey('settings'));
  const legacySettingsRaw = safeLocalStorageGet(LEGACY_SETTINGS_KEY);
  const settingsRaw = storedSettingsRaw || legacySettingsRaw;

  if (settingsRaw) {
    try {
      const parsed = JSON.parse(settingsRaw);
      settings.musicEnabled = parsed.musicEnabled !== false;
      settings.sfxEnabled = parsed.sfxEnabled !== false;
    } catch (error) {
      settings.musicEnabled = true;
      settings.sfxEnabled = true;
    }
  }

  updateAudioButtons();
  updateHud();

  if (best > 0) {
    void persistBest();
  }
  void persistSettings();
}

async function initializeTossBridge() {
  updateBridgeBadge('웹 미리보기', 'badge-preview');
  userKeyHintEl.textContent = '브라우저 미리보기에서도 동일한 게임 화면을 확인할 수 있어요.';

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
    if (isPlayableState() && !pauseReason) {
      setPauseReason('background');
    }
  });

  const userKeyResult = await toss.getUserKeyForGame();
  if (userKeyResult && userKeyResult.type === 'HASH') {
    userHash = userKeyResult.hash;
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '최고 기록과 사운드 설정이 토스 게임 계정 기준으로 저장돼요.';
  } else if (toss.isAvailable()) {
    updateBridgeBadge('토스 미리보기', 'badge-fallback');
    userKeyHintEl.textContent = '토스 브리지는 연결됐지만 게임 계정 키를 받지 못해 로컬 저장소를 함께 사용해요.';
  }

  await loadPersistedState();
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (isPlayableState() && !pauseReason) {
      setPauseReason('background');
    } else {
      void syncAudio();
    }
    return;
  }

  if (pauseReason === 'background') {
    setPauseReason(null);
  } else {
    void syncAudio();
  }
}

function handleBackRequest() {
  if (!isHidden(infoModal)) {
    closeInfoModal();
    return;
  }

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

function getPointerDirection(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  return x < W * 0.5 ? -1 : 1;
}

function handleCanvasPointer(event) {
  void unlockAudio();

  if (pauseReason) return;

  if (state === 'input') {
    inputDir(getPointerDirection(event));
    return;
  }

  if (state === 'idle' || state === 'gameover') {
    void startGame();
    return;
  }

  if (state === 'preview') {
    playBlockedSfx();
  }
}

function attachEventListeners() {
  window.addEventListener('resize', resizeStage);
  window.addEventListener('orientationchange', resizeStage);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => {
    if (isPlayableState() && !pauseReason) {
      setPauseReason('background');
    } else {
      void syncAudio();
    }
  });
  window.addEventListener('pageshow', () => {
    if (pauseReason === 'background' && !document.hidden) {
      setPauseReason(null);
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleBackRequest();
      return;
    }

    if (event.key === 'Enter' && !isPlayableState()) {
      event.preventDefault();
      void startGame();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      event.preventDefault();
      inputDir(-1);
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      inputDir(1);
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      if (!isPlayableState()) {
        void startGame();
      }
    }
  });

  canvas.addEventListener('pointerdown', handleCanvasPointer);
  btnStart.addEventListener('click', () => {
    void startGame();
  });
  btnRestart.addEventListener('click', () => {
    void startGame();
  });
  btnGameOverExit.addEventListener('click', openExitModal);
  btnExit.addEventListener('click', openExitModal);
  btnCancelExit.addEventListener('click', closeExitModal);
  btnConfirmExit.addEventListener('click', () => {
    void leaveGame();
  });

  btnInfo.addEventListener('click', openInfoModal);
  btnCloseInfo.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', (event) => {
    if (event.target === infoModal) {
      closeInfoModal();
    }
  });
  exitModal.addEventListener('click', (event) => {
    if (event.target === exitModal) {
      closeExitModal();
    }
  });

  btnMusic.addEventListener('click', async () => {
    settings.musicEnabled = !settings.musicEnabled;
    updateAudioButtons();
    await unlockAudio();
    await persistSettings();
    await syncAudio();
  });

  btnSfx.addEventListener('click', async () => {
    settings.sfxEnabled = !settings.sfxEnabled;
    updateAudioButtons();
    await unlockAudio();
    await persistSettings();
    await syncAudio();
  });

  window.addEventListener('beforeunload', () => {
    unsubscribeSafeArea();
    unsubscribeBack();
    unsubscribeHome();
    void toss.setIosSwipeGestureEnabled(true);
  });
}

attachEventListeners();
updateAudioButtons();
updateHud();
updateStartButtonLabel();
resizeStage();
resetGame();
loop();
void initializeTossBridge();
