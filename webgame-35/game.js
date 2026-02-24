const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const invEl = document.getElementById('inv');
const btnReset = document.getElementById('btnReset');

let hasKey = false;
let doorOpen = false;
let keyHidden = true;

const door = { x: 280, y: 120, w: 100, h: 220 };
const box = { x: 80, y: 300, w: 120, h: 70 };
const rug = { x: 170, y: 400, w: 140, h: 50 };

function reset() {
  hasKey = false;
  doorOpen = false;
  keyHidden = true;
  invEl.textContent = 'Empty';
}

function inside(obj, x, y) {
  return x >= obj.x && x <= obj.x + obj.w && y >= obj.y && y <= obj.y + obj.h;
}

function handleClick(x, y) {
  if (inside(door, x, y)) {
    if (hasKey) { doorOpen = true; }
    return;
  }
  if (inside(rug, x, y)) {
    if (keyHidden) {
      keyHidden = false;
    }
    return;
  }
  if (inside(box, x, y)) {
    if (!keyHidden && !hasKey) {
      hasKey = true;
      invEl.textContent = 'Key';
    }
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // room
  ctx.fillStyle = '#0f1d35';
  ctx.fillRect(40, 60, 340, 420);

  // door
  ctx.fillStyle = doorOpen ? '#7cffc5' : '#1f2a44';
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.fillStyle = '#e6f0ff';
  ctx.fillText(doorOpen ? 'OPEN' : 'LOCK', door.x + 18, door.y + 120);

  // box
  ctx.fillStyle = '#162847';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = '#e6f0ff';
  ctx.fillText('BOX', box.x + 35, box.y + 40);

  // rug
  ctx.fillStyle = '#2a1830';
  ctx.fillRect(rug.x, rug.y, rug.w, rug.h);
  ctx.fillStyle = '#e6f0ff';
  ctx.fillText('RUG', rug.x + 50, rug.y + 30);

  if (!keyHidden && !hasKey) {
    ctx.fillStyle = '#ffd86d';
    ctx.fillRect(box.x + 15, box.y - 18, 30, 12);
  }

  if (doorOpen) {
    ctx.fillStyle = 'rgba(5, 8, 15, 0.6)';
    ctx.fillRect(40, 60, 340, 420);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Escaped!', canvas.width/2, canvas.height/2);
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnReset.addEventListener('click', reset);

reset();
(function loop(){ draw(); requestAnimationFrame(loop); })();
