const toss = window.MineSweepSprintToss || {
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
const stageCard = document.getElementById('stageCard');
const controlRow = document.getElementById('controlRow');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const bestStreakEl = document.getElementById('bestStreak');
const comboEl = document.getElementById('combo');
const minesLeftEl = document.getElementById('minesLeft');
const roundEl = document.getElementById('round');
const timerEl = document.getElementById('timer');
const statusLineEl = document.getElementById('statusLine');
const bridgeBadgeEl = document.getElementById('bridgeBadge');
const userKeyHintEl = document.getElementById('userKeyHint');

const btnStart = document.getElementById('btnStart');
const btnMode = document.getElementById('btnMode');
const btnHint = document.getElementById('btnHint');
const btnExit = document.getElementById('btnExit');
const btnInfo = document.getElementById('btnInfo');
const btnCloseInfo = document.getElementById('btnCloseInfo');
const btnCancelExit = document.getElementById('btnCancelExit');
const btnConfirmExit = document.getElementById('btnConfirmExit');

const exitModal = document.getElementById('exitModal');
const infoModal = document.getElementById('infoModal');

const W = canvas.width;
const H = canvas.height;

const ROWS = 10;
const COLS = 8;
const CELL = 44;
const GAP = 2;

const BOARD_W = COLS * CELL + (COLS - 1) * GAP;
const BOARD_H = ROWS * CELL + (ROWS - 1) * GAP;
const BOARD_X = (W - BOARD_W) * 0.5;
const BOARD_Y = 182;

const BASE_MINES = 10;
const MAX_MINES = 24;
const MAX_HINTS = 4;
const START_HINTS = 2;
const COMBO_WINDOW_MS = 1800;

const LEGACY_BEST_KEY = 'mine-sweep-sprint-best';
const LEGACY_BEST_STREAK_KEY = 'mine-sweep-sprint-best-streak';
const STORAGE_PREFIX = 'mine-sweep-sprint';

const bgmAudio = window.TapTapNeonAudio?.create('webgame-mine-sweep-sprint', controlRow, {
  theme: 'mystic',
  bgmLabels: { on: 'BGM 켜짐', off: 'BGM 꺼짐' },
  sfxLabels: { on: '효과음 켜짐', off: '효과음 꺼짐' },
  themeButtonLabel: '트랙',
});

const sfxCtx = window.AudioContext ? new AudioContext() : null;

let state = 'idle'; // idle | running | gameover
let pauseReason = null; // null | info | exit | background
let gameOverReason = 'boom';
let mode = 'reveal'; // reveal | flag

let score = 0;
let best = 0;
let streak = 0;
let bestStreak = 0;
let combo = 0;
let maxCombo = 0;
let round = 1;
let mineCount = BASE_MINES;
let hintCharges = START_HINTS;
let timerLeft = 0;

let board = [];
let safeLeft = 0;
let firstMove = true;

let userHash = null;
let tick = 0;
let flash = 0;
let hintPulse = 0;
let hintedCellId = -1;
let lastRevealAt = 0;
let lastFrameAt = performance.now();

let touchHoldTimer = null;
let touchHoldActive = false;

let unsubscribeSafeArea = () => {};
let unsubscribeBack = () => {};
let unsubscribeHome = () => {};

function isSfxEnabled() {
  const neonState = bgmAudio?.getState?.();
  if (neonState && neonState.sfx === false) {
    return false;
  }
  return true;
}

function unlockAudio() {
  bgmAudio?.unlock?.();
  if (sfxCtx && sfxCtx.state === 'suspended') {
    sfxCtx.resume().catch(() => {});
  }
}

function beep(freq, duration, gain = 0.022, type = 'triangle') {
  if (!sfxCtx || !isSfxEnabled() || document.hidden || pauseReason) return;

  if (sfxCtx.state === 'suspended') {
    sfxCtx.resume().catch(() => {});
  }

  const now = sfxCtx.currentTime;
  const oscillator = sfxCtx.createOscillator();
  const amplifier = sfxCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;
  amplifier.gain.setValueAtTime(gain, now);
  amplifier.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(amplifier);
  amplifier.connect(sfxCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function vibrate(pattern) {
  if (!navigator.vibrate || !isSfxEnabled() || document.hidden || pauseReason) return;
  navigator.vibrate(pattern);
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

function isHidden(element) {
  return element?.classList.contains('hidden');
}

function isRoundActive() {
  return state === 'running' && !pauseReason;
}

function idx(r, c) {
  return r * COLS + c;
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function forEachNeighbor(r, c, callback) {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      callback(nr, nc);
    }
  }
}

function makeCell() {
  return {
    mine: false,
    revealed: false,
    flagged: false,
    count: 0,
    explode: false,
  };
}

function computeCounts() {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = board[idx(r, c)];
      if (cell.mine) {
        cell.count = -1;
        continue;
      }

      let count = 0;
      forEachNeighbor(r, c, (nr, nc) => {
        if (board[idx(nr, nc)].mine) count += 1;
      });
      cell.count = count;
    }
  }
}

function buildBoard(mines) {
  board = Array(ROWS * COLS).fill(0).map(makeCell);
  safeLeft = ROWS * COLS - mines;
  firstMove = true;
  hintedCellId = -1;
  hintPulse = 0;

  const taken = new Set();
  while (taken.size < mines) {
    const pick = Math.floor(Math.random() * board.length);
    if (taken.has(pick)) continue;
    taken.add(pick);
    board[pick].mine = true;
  }

  computeCounts();
}

function relocateMine(avoidId) {
  const source = board[avoidId];
  if (!source.mine) return;

  source.mine = false;

  for (let i = 0; i < board.length; i += 1) {
    if (i !== avoidId && !board[i].mine) {
      board[i].mine = true;
      break;
    }
  }

  computeCounts();
}

function flaggedCount() {
  let total = 0;
  for (const cell of board) {
    if (cell.flagged) total += 1;
  }
  return total;
}

function countCorrectFlags() {
  let correct = 0;
  for (const cell of board) {
    if (cell.flagged && cell.mine) correct += 1;
  }
  return correct;
}

function setMode(nextMode) {
  mode = nextMode;
  btnMode.textContent = mode === 'reveal' ? '모드: 열기' : '모드: 깃발';
  btnMode.dataset.active = mode === 'reveal' ? 'true' : 'false';
}

function calcRoundTime(roundNumber, mines) {
  const value = 54 - roundNumber * 1.8 - mines * 0.58;
  return Math.max(18, value);
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
  const padding = 28;
  const availableWidth = Math.max(160, bounds.width - padding);
  const availableHeight = Math.max(260, bounds.height - padding);
  const ratio = W / H;

  const displayWidth = Math.min(availableWidth, availableHeight * ratio);
  const displayHeight = displayWidth / ratio;

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
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

function setPauseReason(nextReason) {
  pauseReason = nextReason;
  updateHud();
}

function pauseForOverlay(reason) {
  if (state === 'running' && !pauseReason) {
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

function updateBridgeBadge(text, className) {
  bridgeBadgeEl.textContent = text;
  bridgeBadgeEl.className = `badge ${className}`;
}

function getStatusText() {
  if (pauseReason === 'background') {
    return '토스 앱이 백그라운드로 전환되어 자동으로 일시정지되었습니다.';
  }

  if (pauseReason === 'info' || pauseReason === 'exit') {
    return '게임이 일시정지 상태입니다.';
  }

  if (state === 'idle') {
    return '시작 버튼 또는 게임 화면 탭으로 바로 플레이할 수 있습니다.';
  }

  if (state === 'gameover') {
    if (gameOverReason === 'timeout') {
      return '시간이 종료되어 라운드가 끝났습니다. 더 빠른 판단으로 다시 도전하세요.';
    }
    return '지뢰를 밟았습니다. 깃발을 활용해 다음 라운드까지 이어가 보세요.';
  }

  const mineLeft = Math.max(0, mineCount - flaggedCount());
  return `라운드 ${round} 진행 중 · 남은 지뢰 ${mineLeft} · 콤보 x${Math.max(0, combo)}`;
}

function updateHud() {
  const minesLeft = Math.max(0, mineCount - flaggedCount());

  scoreEl.textContent = String(score);
  bestEl.textContent = String(Math.max(best, score));
  streakEl.textContent = String(streak);
  bestStreakEl.textContent = String(bestStreak);
  comboEl.textContent = String(combo);
  minesLeftEl.textContent = String(minesLeft);
  roundEl.textContent = String(round);
  timerEl.textContent = timerLeft.toFixed(1);
  btnHint.textContent = `힌트 ${hintCharges}`;
  statusLineEl.textContent = getStatusText();

  scoreEl.closest('.hud-card')?.classList.toggle('hot', score > 0 && score >= best);
  streakEl.closest('.hud-card')?.classList.toggle('hot', streak >= 2);
  comboEl.closest('.hud-card')?.classList.toggle('hot', combo >= 3);
  minesLeftEl.closest('.hud-card')?.classList.toggle('warn', minesLeft <= 2);
  timerEl.closest('.hud-card')?.classList.toggle('warn', timerLeft <= 12 && state === 'running');
  timerEl.closest('.hud-card')?.classList.toggle('danger', timerLeft <= 6 && state === 'running');
  btnHint.dataset.active = hintCharges > 0 ? 'true' : 'false';
}

function beginRound() {
  combo = 0;
  maxCombo = 0;
  lastRevealAt = 0;

  mineCount = Math.min(MAX_MINES, BASE_MINES + Math.floor((round - 1) * 1.1 + score * 0.2));
  timerLeft = calcRoundTime(round, mineCount);
  buildBoard(mineCount);
  setMode('reveal');
}

function resetRun() {
  pauseReason = null;
  gameOverReason = 'boom';
  score = 0;
  streak = 0;
  combo = 0;
  maxCombo = 0;
  round = 1;
  hintCharges = START_HINTS;
  flash = 0;
  tick = 0;

  beginRound();
  state = 'running';
  updateHud();
}

function startGame() {
  unlockAudio();
  closeInfoModal();
  closeExitModal();
  resetRun();
}

function applyRevealReward(openedCount) {
  if (openedCount <= 0) return;

  const now = performance.now();
  if (now - lastRevealAt <= COMBO_WINDOW_MS) {
    combo += 1;
  } else {
    combo = 1;
  }
  lastRevealAt = now;
  maxCombo = Math.max(maxCombo, combo);

  score += openedCount + Math.floor((combo - 1) / 2);
  if (score > best) {
    best = score;
  }
}

function revealFlood(startR, startC) {
  const queue = [[startR, startC]];
  const seen = new Set([idx(startR, startC)]);
  let opened = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift();

    forEachNeighbor(r, c, (nr, nc) => {
      const id = idx(nr, nc);
      if (seen.has(id)) return;
      seen.add(id);

      const cell = board[id];
      if (cell.revealed || cell.flagged || cell.mine) return;

      cell.revealed = true;
      safeLeft -= 1;
      opened += 1;

      if (cell.count === 0) {
        queue.push([nr, nc]);
      }
    });
  }

  return opened;
}

function revealCellInternal(r, c, options = {}) {
  if (!inBounds(r, c)) return { opened: 0, hitMine: false };

  const id = idx(r, c);
  const cell = board[id];
  if (cell.revealed || cell.flagged) return { opened: 0, hitMine: false };

  if (firstMove && !options.skipFirstMoveSafety) {
    firstMove = false;
    relocateMine(id);
  }

  cell.revealed = true;

  if (cell.mine) {
    cell.explode = true;
    return { opened: 0, hitMine: true };
  }

  safeLeft -= 1;
  let opened = 1;

  if (cell.count === 0) {
    opened += revealFlood(r, c);
  }

  return { opened, hitMine: false };
}

async function persistBest() {
  const value = String(best);
  await toss.storage.setItem(getScopedStorageKey('best'), value);
  safeLocalStorageSet(LEGACY_BEST_KEY, value);
}

async function persistBestStreak() {
  const value = String(bestStreak);
  await toss.storage.setItem(getScopedStorageKey('bestStreak'), value);
  safeLocalStorageSet(LEGACY_BEST_STREAK_KEY, value);
}

function endGame(reason) {
  state = 'gameover';
  pauseReason = null;
  gameOverReason = reason;

  flash = 14;
  combo = 0;
  hintPulse = 0;
  hintedCellId = -1;

  best = Math.max(best, score);
  void persistBest();

  streak = 0;
  void persistBestStreak();

  beep(reason === 'timeout' ? 180 : 160, 0.24, 0.05, 'sawtooth');
  vibrate([50, 50, 50]);
  updateHud();
}

function nextRound() {
  const timeBonus = Math.floor(Math.max(0, timerLeft) * 1.5);
  const correctFlags = countCorrectFlags();
  const wrongFlags = Math.max(0, flaggedCount() - correctFlags);
  const accuracyBonus = Math.max(0, correctFlags * 2 - wrongFlags * 2);
  const comboBonus = Math.max(0, Math.floor(maxCombo / 2));

  score += timeBonus + accuracyBonus + comboBonus;
  if (score > best) {
    best = score;
  }

  streak += 1;
  if (streak > bestStreak) {
    bestStreak = streak;
    void persistBestStreak();
  }

  round += 1;
  if (round % 3 === 0) {
    hintCharges = Math.min(MAX_HINTS, hintCharges + 1);
  }

  flash = 20;
  beep(980, 0.08, 0.03, 'triangle');
  vibrate([20, 28, 20]);

  beginRound();
  updateHud();
}

function revealCell(r, c) {
  if (!inBounds(r, c)) return;

  const current = board[idx(r, c)];
  if (current.revealed) {
    attemptChord(r, c);
    return;
  }

  const result = revealCellInternal(r, c);
  if (result.hitMine) {
    endGame('boom');
    return;
  }

  if (result.opened > 0) {
    applyRevealReward(result.opened);
    flash = Math.max(flash, 8);
    beep(520 + current.count * 80, 0.03, 0.018, 'square');
    vibrate(10);
  }

  if (safeLeft <= 0) {
    nextRound();
    return;
  }

  updateHud();
}

function attemptChord(r, c) {
  if (!inBounds(r, c)) return;

  const center = board[idx(r, c)];
  if (!center.revealed || center.count <= 0) return;

  let flagged = 0;
  const targets = [];

  forEachNeighbor(r, c, (nr, nc) => {
    const cell = board[idx(nr, nc)];
    if (cell.flagged) {
      flagged += 1;
      return;
    }
    if (!cell.revealed) {
      targets.push([nr, nc]);
    }
  });

  if (flagged !== center.count || targets.length === 0) {
    beep(250, 0.03, 0.012, 'square');
    return;
  }

  let openedTotal = 0;
  for (const [nr, nc] of targets) {
    const result = revealCellInternal(nr, nc, { skipFirstMoveSafety: true });
    if (result.hitMine) {
      endGame('boom');
      return;
    }
    openedTotal += result.opened;
  }

  if (openedTotal > 0) {
    applyRevealReward(Math.max(1, Math.floor(openedTotal * 0.9)));
    flash = Math.max(flash, 10);
    beep(860, 0.05, 0.022, 'triangle');
    vibrate([12, 8, 12]);
  }

  if (safeLeft <= 0) {
    nextRound();
    return;
  }

  updateHud();
}

function toggleFlag(r, c) {
  if (!inBounds(r, c)) return;

  const cell = board[idx(r, c)];
  if (cell.revealed) return;

  cell.flagged = !cell.flagged;
  beep(cell.flagged ? 770 : 430, 0.03, 0.014, 'square');
  vibrate(cell.flagged ? 12 : 8);
  updateHud();
}

function useHint() {
  if (pauseReason) return;
  if (state !== 'running') {
    startGame();
  }

  if (hintCharges <= 0) {
    beep(220, 0.05, 0.01, 'square');
    return;
  }

  const candidates = [];
  for (let i = 0; i < board.length; i += 1) {
    const cell = board[i];
    if (!cell.mine && !cell.revealed && !cell.flagged) {
      candidates.push(i);
    }
  }

  if (candidates.length === 0) return;

  candidates.sort((a, b) => {
    const diff = board[a].count - board[b].count;
    if (diff !== 0) return diff;
    return Math.random() - 0.5;
  });

  const targetId = candidates[0];
  const targetR = Math.floor(targetId / COLS);
  const targetC = targetId % COLS;

  hintCharges -= 1;

  const result = revealCellInternal(targetR, targetC);
  if (result.hitMine) {
    endGame('boom');
    return;
  }

  hintedCellId = targetId;
  hintPulse = 22;
  applyRevealReward(Math.max(1, Math.floor(result.opened * 0.8)));
  flash = Math.max(flash, 12);

  beep(900, 0.06, 0.024, 'triangle');
  vibrate([16, 22, 16]);

  if (safeLeft <= 0) {
    nextRound();
    return;
  }

  updateHud();
}

function playAt(r, c, forceFlag = false) {
  if (pauseReason) return;

  if (state !== 'running') {
    startGame();
  }

  if (forceFlag || mode === 'flag') {
    toggleFlag(r, c);
  } else {
    revealCell(r, c);
  }
}

function boardCellFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  const y = (event.clientY - rect.top) * (H / rect.height);

  if (x < BOARD_X || x > BOARD_X + BOARD_W || y < BOARD_Y || y > BOARD_Y + BOARD_H) {
    return null;
  }

  const c = Math.floor((x - BOARD_X) / (CELL + GAP));
  const r = Math.floor((y - BOARD_Y) / (CELL + GAP));

  if (!inBounds(r, c)) return null;
  return { r, c };
}

function update() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;

  tick += 1;
  if (flash > 0) flash -= 1;
  if (hintPulse > 0) hintPulse -= 1;

  if (!isRoundActive()) return;

  timerLeft = Math.max(0, timerLeft - dt);
  if (timerLeft <= 0) {
    timerLeft = 0;
    endGame('timeout');
    return;
  }

  updateHud();
}

function numberColor(number) {
  const colorMap = {
    1: '#8ec8ff',
    2: '#85f4c4',
    3: '#ffd789',
    4: '#ffb67d',
    5: '#ff9f9f',
    6: '#d69bff',
    7: '#d6e2ef',
    8: '#ffffff',
  };

  return colorMap[number] || '#ffffff';
}

function drawFlag(x, y) {
  ctx.strokeStyle = '#d3e7ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + CELL * 0.38, y + CELL * 0.77);
  ctx.lineTo(x + CELL * 0.38, y + CELL * 0.26);
  ctx.stroke();

  ctx.fillStyle = '#ff887f';
  ctx.beginPath();
  ctx.moveTo(x + CELL * 0.39, y + CELL * 0.29);
  ctx.lineTo(x + CELL * 0.76, y + CELL * 0.43);
  ctx.lineTo(x + CELL * 0.39, y + CELL * 0.57);
  ctx.closePath();
  ctx.fill();
}

function drawMine(x, y, exploded) {
  ctx.fillStyle = exploded ? '#ff6372' : '#2d2335';
  ctx.fillRect(x, y, CELL, CELL);

  ctx.fillStyle = exploded ? '#fff2f2' : '#ff9ea8';
  ctx.beginPath();
  ctx.arc(x + CELL * 0.5, y + CELL * 0.5, CELL * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = exploded ? '#ffe5e5' : '#f7c6ce';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const x1 = x + CELL * 0.5 + Math.cos(angle) * (CELL * 0.24);
    const y1 = y + CELL * 0.5 + Math.sin(angle) * (CELL * 0.24);
    const x2 = x + CELL * 0.5 + Math.cos(angle) * (CELL * 0.33);
    const y2 = y + CELL * 0.5 + Math.sin(angle) * (CELL * 0.33);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function renderOverlay(title, subtitle) {
  ctx.fillStyle = 'rgba(2, 6, 12, 0.58)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(title, W * 0.5, H * 0.5 - 20);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(238, 247, 255, 0.92)';
  ctx.fillText(subtitle, W * 0.5, H * 0.5 + 18);
}

function render() {
  const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
  bgGradient.addColorStop(0, '#0b1626');
  bgGradient.addColorStop(1, '#07111d');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 42; i += 1) {
    const x = (i * 83) % W;
    const y = (i * 47 + tick * 0.9) % H;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(118, 245, 210, 0.18)' : 'rgba(160, 203, 255, 0.14)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = flash > 0 ? 'rgba(121, 255, 203, 0.12)' : '#132540';
  ctx.fillRect(BOARD_X - 10, BOARD_Y - 10, BOARD_W + 20, BOARD_H + 20);

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const x = BOARD_X + c * (CELL + GAP);
      const y = BOARD_Y + r * (CELL + GAP);
      const id = idx(r, c);
      const cell = board[id];

      const showMine = state === 'gameover' && cell.mine;

      if (cell.revealed || showMine) {
        if (cell.mine) {
          drawMine(x, y, cell.explode);
        } else {
          ctx.fillStyle = '#214168';
          ctx.fillRect(x, y, CELL, CELL);

          if (cell.count > 0) {
            ctx.fillStyle = numberColor(cell.count);
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(cell.count), x + CELL * 0.5, y + CELL * 0.56);
          }
        }
      } else {
        ctx.fillStyle = mode === 'flag' ? '#1d2d4b' : '#182a47';
        ctx.fillRect(x, y, CELL, CELL);
        if (cell.flagged) {
          drawFlag(x, y);
        }
      }

      if (id === hintedCellId && hintPulse > 0) {
        ctx.strokeStyle = `rgba(255, 213, 131, ${0.2 + hintPulse * 0.03})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
      }

      ctx.strokeStyle = 'rgba(224, 239, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    }
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = timerLeft <= 6 && state === 'running' ? '#ff9a87' : '#eaf3ff';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(`시간 ${timerLeft.toFixed(1)}초`, 18, 58);

  ctx.fillStyle = '#d5e6ff';
  ctx.font = '15px sans-serif';
  ctx.fillText(`모드 ${mode === 'reveal' ? '열기' : '깃발'} · 힌트 ${hintCharges}`, 18, 84);
  ctx.fillText(`콤보 x${Math.max(0, combo)} · 라운드 ${round}`, 18, 108);

  if (state === 'idle') {
    renderOverlay('탭해서 시작', '시작 버튼이나 보드를 탭하면 라운드가 시작됩니다.');
    return;
  }

  if (state === 'gameover') {
    if (gameOverReason === 'timeout') {
      renderOverlay('시간 종료', `최종 점수 ${score}점 · 다시 시작해서 기록을 갱신하세요.`);
    } else {
      renderOverlay('지뢰 폭발', `최종 점수 ${score}점 · 깃발과 힌트를 더 활용해 보세요.`);
    }
    return;
  }

  if (pauseReason) {
    renderOverlay('일시정지', '토스 앱으로 돌아오면 이어서 플레이할 수 있습니다.');
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

  const storedBestStreak = Number(await toss.storage.getItem(getScopedStorageKey('bestStreak')) || 0);
  const legacyBestStreak = Number(safeLocalStorageGet(LEGACY_BEST_STREAK_KEY) || 0);
  bestStreak = Math.max(storedBestStreak, legacyBestStreak);

  if (best > 0) {
    void persistBest();
  }
  if (bestStreak > 0) {
    void persistBestStreak();
  }

  updateHud();
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
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    }
  });

  const userKeyResult = await toss.getUserKeyForGame();
  if (userKeyResult && userKeyResult.type === 'HASH') {
    userHash = userKeyResult.hash;
    updateBridgeBadge('토스 게임 연동', 'badge-live');
    userKeyHintEl.textContent = '최고 기록이 토스 게임 계정 단위로 저장됩니다.';
  } else if (toss.isAvailable()) {
    updateBridgeBadge('토스 미리보기', 'badge-fallback');
    userKeyHintEl.textContent = '토스 브리지는 연결되었지만 계정 키를 받지 못해 로컬 저장소를 병행 사용합니다.';
  }

  await loadPersistedState();
}

function handleVisibilityChange() {
  if (document.hidden) {
    if (state === 'running' && !pauseReason) {
      setPauseReason('background');
    }
    return;
  }

  if (pauseReason === 'background') {
    setPauseReason(null);
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

function handleCanvasPointerDown(event) {
  unlockAudio();

  const cell = boardCellFromPointer(event);
  if (!cell) {
    if (state !== 'running' && !pauseReason) {
      startGame();
    }
    return;
  }

  if (event.pointerType === 'touch') {
    touchHoldActive = false;
    if (touchHoldTimer) {
      clearTimeout(touchHoldTimer);
    }

    touchHoldTimer = setTimeout(() => {
      touchHoldActive = true;
      playAt(cell.r, cell.c, true);
    }, 280);
    return;
  }

  if (event.button === 2) {
    playAt(cell.r, cell.c, true);
    return;
  }

  playAt(cell.r, cell.c, false);
}

function handleCanvasPointerUp(event) {
  if (event.pointerType !== 'touch') return;

  if (touchHoldTimer) {
    clearTimeout(touchHoldTimer);
  }

  if (touchHoldActive) return;

  const cell = boardCellFromPointer(event);
  if (!cell) return;
  playAt(cell.r, cell.c, false);
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

    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      setMode(mode === 'reveal' ? 'flag' : 'reveal');
      updateHud();
      return;
    }

    if (event.key === 'h' || event.key === 'H') {
      event.preventDefault();
      useHint();
    }
  });

  canvas.addEventListener('pointerdown', handleCanvasPointerDown);
  canvas.addEventListener('pointerup', handleCanvasPointerUp);
  canvas.addEventListener('pointercancel', () => {
    if (touchHoldTimer) clearTimeout(touchHoldTimer);
  });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const cell = boardCellFromPointer(event);
    if (!cell) return;
    playAt(cell.r, cell.c, true);
  });

  btnStart.addEventListener('click', startGame);
  btnMode.addEventListener('click', () => {
    setMode(mode === 'reveal' ? 'flag' : 'reveal');
    updateHud();
  });
  btnHint.addEventListener('click', useHint);
  btnExit.addEventListener('click', openExitModal);

  btnInfo.addEventListener('click', openInfoModal);
  btnCloseInfo.addEventListener('click', closeInfoModal);
  infoModal.addEventListener('click', (event) => {
    if (event.target === infoModal) {
      closeInfoModal();
    }
  });

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
