const boardEl = document.getElementById('board');
const padEl = document.getElementById('pad');
const errorsEl = document.getElementById('errors');
const timeEl = document.getElementById('time');
const btnNew = document.getElementById('btnNew');
const btnCheck = document.getElementById('btnCheck');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-24', hudEl);

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

const solvedBoards = [
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  '417369825836521947952748316325497168791685432648213759289136574573824691164957283',
  '435269781682571493197834562826195347374682915951743628519326874248957136763418259'
];

let current = null;
let selected = null;
let errors = 0;
let timeSec = 0;
let timerId = null;
let level = 1;
let hints = 3;
let score = 0;
let bestScore = Number(localStorage.getItem('webgame-24-best-score') || 0);

const levelEl = addHudStat('Level', 'level', '1');
const hintsEl = addHudStat('Hints', 'hints', '3');
const scoreEl = addHudStat('Score', 'score', '0');
const bestEl = addHudStat('Best', 'best', String(bestScore));
const leftEl = addHudStat('Left', 'left', '0');
const btnHint = document.createElement('button');
btnHint.id = 'btnHint';
btnHint.textContent = 'Hint';
hudEl.appendChild(btnHint);

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildPuzzle(solution, levelValue) {
  const chars = solution.split('');
  const indices = Array.from({ length: 81 }, (_, i) => i);
  shuffle(indices);

  const removeCount = Math.min(58, 42 + levelValue * 2);
  for (let i = 0; i < removeCount; i++) chars[indices[i]] = '0';
  return chars.join('');
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeSec += 1;
    const m = Math.floor(timeSec / 60);
    const s = String(timeSec % 60).padStart(2, '0');
    timeEl.textContent = `${m}:${s}`;
  }, 1000);
}

function countEmpty() {
  return Array.from(boardEl.children).filter((cell) => !cell.textContent).length;
}

function updateHud() {
  levelEl.textContent = String(level);
  hintsEl.textContent = String(hints);
  scoreEl.textContent = String(score);
  bestEl.textContent = String(bestScore);
  errorsEl.textContent = String(errors);
  leftEl.textContent = String(countEmpty());
}

function startRound(useCurrentLevel = true) {
  if (!useCurrentLevel) level = 1;
  const solution = randPick(solvedBoards);
  current = {
    solution,
    puzzle: buildPuzzle(solution, level)
  };
  selected = null;
  errors = 0;
  timeSec = 0;
  timeEl.textContent = '0:00';
  hints = Math.max(1, 4 - Math.floor(level / 3));
  buildBoard();
  updateHud();
  startTimer();
}

function buildBoard() {
  boardEl.innerHTML = '';
  const { puzzle } = current;
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.idx = i;
    const val = puzzle[i];
    if (val !== '0') {
      cell.textContent = val;
      cell.classList.add('prefill');
    }

    cell.addEventListener('pointerdown', () => {
      audio?.unlock();
      selectCell(cell);
      audio?.fx('ui');
      vibrate(10);
    });

    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!cell.classList.contains('prefill')) setCellValue(cell, '0');
    });

    cell.addEventListener(
      'touchstart',
      () => {
        cell._touchStart = Date.now();
        audio?.unlock();
        selectCell(cell);
        audio?.fx('ui');
        vibrate(10);
      },
      { passive: true }
    );

    cell.addEventListener('touchend', () => {
      if (Date.now() - (cell._touchStart || 0) > 320) {
        if (!cell.classList.contains('prefill')) {
          setCellValue(cell, '0');
          vibrate(12);
        }
      }
    });

    boardEl.appendChild(cell);
  }
}

function clearSameHighlights() {
  boardEl.querySelectorAll('.cell.same').forEach((cell) => cell.classList.remove('same'));
}

function highlightSameValues(value) {
  if (!value) return;
  boardEl.querySelectorAll('.cell').forEach((cell) => {
    if (cell.textContent === value) cell.classList.add('same');
  });
}

function selectCell(cell) {
  if (selected) selected.classList.remove('selected');
  selected = cell;
  selected.classList.add('selected');
  clearSameHighlights();
  highlightSameValues(selected.textContent);
}

function setCellValue(cell, value) {
  if (!cell || cell.classList.contains('prefill')) return;
  cell.textContent = value === '0' ? '' : value;
  cell.classList.remove('error');
  if (selected === cell) {
    clearSameHighlights();
    highlightSameValues(cell.textContent);
  }
}

function selectNextEmpty(fromIdx) {
  const cells = Array.from(boardEl.children);
  for (let i = fromIdx + 1; i < cells.length; i += 1) {
    const next = cells[i];
    if (!next.classList.contains('prefill') && !next.textContent) {
      selectCell(next);
      return true;
    }
  }
  return false;
}

function checkConflicts() {
  const values = Array.from(boardEl.children).map((cell) => cell.textContent || '0');
  let wrong = 0;
  values.forEach((v, i) => {
    const cell = boardEl.children[i];
    if (v !== '0' && v !== current.solution[i]) {
      cell.classList.add('error');
      wrong += 1;
    } else {
      cell.classList.remove('error');
    }
  });
  clearSameHighlights();
  if (selected) highlightSameValues(selected.textContent);
  if (wrong > 0) {
    errors += wrong;
    audio?.fx('fail');
    vibrate([20, 30, 20]);
    updateHud();
  } else {
    audio?.fx('success');
    vibrate(15);
  }
}

function isComplete() {
  const values = Array.from(boardEl.children).map((cell) => cell.textContent || '0');
  return values.join('') === current.solution;
}

function onRoundClear() {
  clearInterval(timerId);
  let bonus = Math.max(220, 1300 - timeSec * 4 - errors * 30 + level * 90);
  if (errors === 0) bonus += 160;
  score += bonus;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('webgame-24-best-score', String(bestScore));
  }
  level += 1;
  updateHud();
  audio?.fx('win');
  vibrate([20, 40, 20]);

  boardEl.querySelectorAll('.cell').forEach((c) => c.classList.add('selected'));
  setTimeout(() => {
    startRound(true);
  }, 950);
}

function useHint() {
  if (hints <= 0) {
    audio?.fx('fail');
    return;
  }
  const empties = Array.from(boardEl.children).filter(
    (cell) => !cell.classList.contains('prefill') && !cell.textContent
  );
  if (!empties.length) return;
  const target = randPick(empties);
  const idx = Number(target.dataset.idx);
  target.textContent = current.solution[idx];
  target.classList.remove('error');
  target.classList.add('selected');
  hints -= 1;
  updateHud();
  audio?.fx('success');
  if (isComplete()) onRoundClear();
}

padEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !selected) return;
  audio?.unlock();

  const num = btn.dataset.num;
  setCellValue(selected, num);

  if (num !== '0') {
    const idx = Number(selected.dataset.idx);
    if (current.solution[idx] !== num) {
      selected.classList.add('error');
      errors += 1;
      audio?.fx('fail');
      vibrate(20);
    } else {
      selected.classList.remove('error');
      audio?.fx('success');
      vibrate(12);
    }
    updateHud();
    if (!selected.classList.contains('error')) {
      selectNextEmpty(idx);
    }
  }

  if (isComplete()) onRoundClear();
});

window.addEventListener('keydown', (e) => {
  if (!selected) return;
  if (e.key >= '1' && e.key <= '9') {
    setCellValue(selected, e.key);
  }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    setCellValue(selected, '0');
  }
});

btnNew.addEventListener('click', () => {
  audio?.unlock();
  score = 0;
  level = 1;
  startRound(false);
  updateHud();
  audio?.fx('ui');
});

btnCheck.addEventListener('click', () => {
  audio?.unlock();
  checkConflicts();
});

btnHint.addEventListener('click', () => {
  audio?.unlock();
  useHint();
});

startRound(true);
