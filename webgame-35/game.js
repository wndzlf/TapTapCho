const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const invEl = document.getElementById('inv');
const btnReset = document.getElementById('btnReset');
const hudEl = document.querySelector('.hud');

const audio = window.TapTapNeonAudio?.create('webgame-35', hudEl);

let level = 1;
let score = 0;
let timeLeft = 95;
let timerId = null;

let hasKeycard = false;
let hasKey = false;
let doorOpen = false;
let clueFound = false;
let rugMoved = false;
let drawerOpen = false;
let message = 'Find a way out.';

let code = [1, 2, 3];
let dials = [0, 0, 0];

const levelEl = addHudStat('Level', 'level', '1');
const scoreEl = addHudStat('Score', 'score', '0');
const timeEl = addHudStat('Time', 'time', '95');

const door = { x: 290, y: 120, w: 90, h: 220 };
const painting = { x: 72, y: 92, w: 120, h: 84 };
const drawer = { x: 82, y: 280, w: 130, h: 90 };
const rug = { x: 160, y: 402, w: 170, h: 58 };
const keycardSlot = { x: 188, y: 418, w: 34, h: 22 };
const keySlot = { x: 128, y: 310, w: 32, h: 14 };
const dialBoxes = [
  { x: 94, y: 218, w: 32, h: 42 },
  { x: 132, y: 218, w: 32, h: 42 },
  { x: 170, y: 218, w: 32, h: 42 }
];

function addHudStat(label, id, initialValue) {
  const box = document.createElement('div');
  box.innerHTML = `${label}: <span id="${id}">${initialValue}</span>`;
  hudEl.insertBefore(box, hudEl.firstChild);
  return box.querySelector(`#${id}`);
}

function updateHud() {
  levelEl.textContent = String(level);
  scoreEl.textContent = String(score);
  timeEl.textContent = String(timeLeft);
  const items = [];
  if (hasKeycard) items.push('Keycard');
  if (hasKey) items.push('Key');
  invEl.textContent = items.length ? items.join(', ') : 'Empty';
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    updateHud();
    if (timeLeft === 0) onFail();
  }, 1000);
}

function randomCode() {
  return [
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10)
  ];
}

function resetRound(resetProgress = false) {
  if (resetProgress) {
    level = 1;
    score = 0;
  }

  hasKeycard = false;
  hasKey = false;
  doorOpen = false;
  clueFound = false;
  rugMoved = false;
  drawerOpen = false;
  message = 'Find a way out.';

  code = randomCode();
  dials = [0, 0, 0];
  timeLeft = Math.max(45, 96 - level * 4);

  updateHud();
  startTimer();
}

function inside(obj, x, y) {
  return x >= obj.x && x <= obj.x + obj.w && y >= obj.y && y <= obj.y + obj.h;
}

function dialMatches() {
  return dials[0] === code[0] && dials[1] === code[1] && dials[2] === code[2];
}

function onClear() {
  clearInterval(timerId);
  score += Math.max(140, timeLeft * 3 + level * 25);
  level += 1;
  audio?.fx('win');
  updateHud();
  setTimeout(() => resetRound(false), 900);
}

function onFail() {
  level = Math.max(1, level - 1);
  audio?.fx('fail');
  resetRound(false);
}

function handleClick(x, y) {
  if (inside(door, x, y)) {
    if (hasKey && hasKeycard) {
      doorOpen = true;
      message = 'Door unlocked. Escaped!';
      onClear();
    } else {
      message = 'Door requires a key and keycard.';
      audio?.fx('fail');
    }
    return;
  }

  if (inside(painting, x, y)) {
    clueFound = true;
    message = `Code clue found: ${code.join('-')}`;
    audio?.fx('success');
    return;
  }

  if (inside(rug, x, y)) {
    rugMoved = true;
    message = 'You moved the rug. Something is hidden...';
    audio?.fx('ui');
    return;
  }

  if (rugMoved && !hasKeycard && inside(keycardSlot, x, y)) {
    hasKeycard = true;
    message = 'Picked up keycard.';
    audio?.fx('success');
    updateHud();
    return;
  }

  for (let i = 0; i < dialBoxes.length; i++) {
    if (inside(dialBoxes[i], x, y)) {
      dials[i] = (dials[i] + 1) % 10;
      message = 'Dial adjusted.';
      audio?.fx('ui');
      return;
    }
  }

  if (inside(drawer, x, y)) {
    if (!drawerOpen) {
      if (dialMatches()) {
        drawerOpen = true;
        message = 'Drawer opened.';
        audio?.fx('success');
      } else {
        message = 'Drawer locked. Wrong code.';
        audio?.fx('fail');
      }
      return;
    }

    if (!hasKey && inside(keySlot, x, y)) {
      hasKey = true;
      message = 'Picked up key.';
      audio?.fx('success');
      updateHud();
      return;
    }
  }
}

function drawRoom() {
  ctx.fillStyle = '#0f1d35';
  ctx.fillRect(40, 60, 340, 420);

  ctx.fillStyle = '#162847';
  ctx.fillRect(40, 440, 340, 40);

  ctx.fillStyle = '#1f2a44';
  ctx.fillRect(40, 60, 340, 16);
}

function drawDoor() {
  ctx.fillStyle = doorOpen ? '#7cffc5' : '#1f2a44';
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.fillStyle = '#e6f0ff';
  ctx.font = '16px system-ui';
  ctx.fillText(doorOpen ? 'OPEN' : 'LOCK', door.x + 22, door.y + 118);
}

function drawPainting() {
  ctx.fillStyle = '#2a1830';
  ctx.fillRect(painting.x, painting.y, painting.w, painting.h);
  ctx.strokeStyle = '#6df3ff';
  ctx.strokeRect(painting.x + 6, painting.y + 6, painting.w - 12, painting.h - 12);
  ctx.fillStyle = '#e6f0ff';
  ctx.fillText('Painting', painting.x + 22, painting.y + 50);

  if (clueFound) {
    ctx.fillStyle = '#ffd86d';
    ctx.fillRect(painting.x + 10, painting.y + painting.h + 8, 100, 22);
    ctx.fillStyle = '#071021';
    ctx.font = '14px system-ui';
    ctx.fillText(`Code ${code.join('-')}`, painting.x + 16, painting.y + painting.h + 24);
  }
}

function drawDrawer() {
  ctx.fillStyle = '#162847';
  ctx.fillRect(drawer.x, drawer.y, drawer.w, drawer.h);
  ctx.fillStyle = '#e6f0ff';
  ctx.fillText('DRAWER', drawer.x + 34, drawer.y + 76);

  dialBoxes.forEach((d, i) => {
    ctx.fillStyle = '#0b1326';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = '#6df3ff';
    ctx.strokeRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#e6f0ff';
    ctx.font = '18px system-ui';
    ctx.fillText(String(dials[i]), d.x + 11, d.y + 27);
  });

  if (drawerOpen && !hasKey) {
    ctx.fillStyle = '#ffd86d';
    ctx.fillRect(keySlot.x, keySlot.y, keySlot.w, keySlot.h);
  }
}

function drawRug() {
  ctx.fillStyle = rugMoved ? '#3a2245' : '#2a1830';
  ctx.fillRect(rug.x, rug.y, rug.w, rug.h);
  ctx.fillStyle = '#e6f0ff';
  ctx.fillText('RUG', rug.x + 70, rug.y + 34);

  if (rugMoved && !hasKeycard) {
    ctx.fillStyle = '#7cffc5';
    ctx.fillRect(keycardSlot.x, keycardSlot.y, keycardSlot.w, keycardSlot.h);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoom();
  drawDoor();
  drawPainting();
  drawDrawer();
  drawRug();

  ctx.fillStyle = '#e6f0ff';
  ctx.font = '14px system-ui';
  ctx.fillText(message, 48, 468);
}

canvas.addEventListener('click', (e) => {
  audio?.unlock();
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnReset.addEventListener('click', () => {
  audio?.unlock();
  resetRound(true);
});

resetRound(true);
(function loop() {
  draw();
  requestAnimationFrame(loop);
})();
