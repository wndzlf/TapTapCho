const boardEl = document.getElementById('board');
const padEl = document.getElementById('pad');
const errorsEl = document.getElementById('errors');
const timeEl = document.getElementById('time');
const btnNew = document.getElementById('btnNew');
const btnCheck = document.getElementById('btnCheck');

const puzzles = [
  {
    puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
  },
  {
    puzzle: "400000805030000000000700000020000060000080400000010000000603070500200000104000000",
    solution: "417369825836521947952748316325497168791685432648213759289136574573824691164957283"
  },
  {
    puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
    solution: "435269781682571493197834562826195347374682915951743628519326874248957136763418259"
  }
];

let current = null;
let selected = null;
let errors = 0;
let timeSec = 0;
let timerId = null;

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeSec += 1;
    const m = Math.floor(timeSec / 60);
    const s = String(timeSec % 60).padStart(2, '0');
    timeEl.textContent = `${m}:${s}`;
  }, 1000);
}

function buildBoard() {
  boardEl.innerHTML = '';
  selected = null;
  errors = 0;
  errorsEl.textContent = errors;
  timeSec = 0;
  timeEl.textContent = '0:00';
  startTimer();

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
    cell.addEventListener('click', () => selectCell(cell));
    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!cell.classList.contains('prefill')) setCellValue(cell, '0');
    });
    cell.addEventListener('touchstart', (e) => {
      cell._touchStart = Date.now();
    }, { passive: true });
    cell.addEventListener('touchend', () => {
      if (Date.now() - cell._touchStart > 400) {
        if (!cell.classList.contains('prefill')) setCellValue(cell, '0');
      }
    });
    boardEl.appendChild(cell);
  }
}

function selectCell(cell) {
  if (selected) selected.classList.remove('selected');
  selected = cell;
  selected.classList.add('selected');
}

function setCellValue(cell, value) {
  if (!cell || cell.classList.contains('prefill')) return;
  cell.textContent = value === '0' ? '' : value;
  cell.classList.remove('error');
}

function checkConflicts() {
  const values = Array.from(boardEl.children).map((cell) => cell.textContent || '0');
  let wrong = 0;
  values.forEach((v, i) => {
    const cell = boardEl.children[i];
    if (v !== '0' && v !== current.solution[i]) {
      cell.classList.add('error');
      wrong++;
    } else {
      cell.classList.remove('error');
    }
  });
  if (wrong > 0) {
    errors += wrong;
    errorsEl.textContent = errors;
  }
}

function isComplete() {
  const values = Array.from(boardEl.children).map((cell) => cell.textContent || '0');
  return values.join('') === current.solution;
}

padEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const num = btn.dataset.num;
  if (!selected) return;
  setCellValue(selected, num);
  if (num !== '0') {
    if (current.solution[selected.dataset.idx] !== num) {
      selected.classList.add('error');
      errors += 1;
      errorsEl.textContent = errors;
    } else {
      selected.classList.remove('error');
    }
  }
  if (isComplete()) {
    clearInterval(timerId);
    boardEl.querySelectorAll('.cell').forEach((c) => c.classList.add('selected'));
  }
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
  current = puzzles[Math.floor(Math.random() * puzzles.length)];
  buildBoard();
});

btnCheck.addEventListener('click', () => {
  checkConflicts();
});

current = puzzles[0];
buildBoard();
