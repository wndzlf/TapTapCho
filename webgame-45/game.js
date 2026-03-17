const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const btnNext = document.getElementById('btnNext');
const hudLevel = document.getElementById('hudLevel');
const hudTime = document.getElementById('hudTime');
const hudDeaths = document.getElementById('hudDeaths');
const hudStatus = document.getElementById('hudStatus');
const toast = document.getElementById('toast');
const bgmAudio = window.TapTapNeonAudio?.create('webgame-45-local', document.querySelector('.action-wrap'), {
  mediaSrc: '../assets/audio/twin-temple-escape-pixabay-358426.mp3',
  showSfxToggle: false,
  showThemeToggle: false,
});

const W = canvas.width;
const H = canvas.height;

const GRAVITY = 1850;
const MOVE_ACCEL = 2600;
const MOVE_DRAG = 2200;
const MAX_SPEED = 245;
const MAX_FALL = 1000;
const JUMP_SPEED = 880;
const COYOTE_TIME = 0.14;

const STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  RESPAWN: 'respawn',
  CLEAR: 'clear',
  DONE: 'done',
};

const input = {
  keys: Object.create(null),
  just: Object.create(null),
  touchHold: Object.create(null),
  touchTap: Object.create(null),
};

const world = {
  state: STATE.IDLE,
  levelIndex: 0,
  deaths: 0,
  timer: 0,
  respawnAt: 0,
  message: '',
  solids: [],
  hazards: [],
  buttons: [],
  doors: [],
  exits: [],
  particles: [],
  players: [],
};

function rect(x, y, w, h) {
  return { x, y, w, h };
}

const LEVELS = Array.isArray(window.TapTapTwinTempleShared?.levels)
  ? window.TapTapTwinTempleShared.levels
  : [];

function makePlayer(element, controls) {
  return {
    element,
    controls,
    x: 0,
    y: 0,
    w: 30,
    h: 42,
    vx: 0,
    vy: 0,
    onGround: false,
    coyote: COYOTE_TIME,
    inExit: false,
    deadFlash: 0,
  };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function showToast(text, ms = 1250) {
  if (!text) return;
  toast.textContent = text;
  toast.classList.add('show');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, ms);
}

const sfx = (() => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctxAudio = null;

  function ensure() {
    if (!Ctx) return;
    if (!ctxAudio) ctxAudio = new Ctx();
    if (ctxAudio.state === 'suspended') {
      ctxAudio.resume();
    }
  }

  function tone({ freq = 420, end = null, dur = 0.08, gain = 0.045, type = 'triangle' }) {
    if (!ctxAudio) return;
    const now = ctxAudio.currentTime;
    const osc = ctxAudio.createOscillator();
    const amp = ctxAudio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (end != null) osc.frequency.linearRampToValueAtTime(end, now + dur);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(amp);
    amp.connect(ctxAudio.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  return {
    ensure,
    jump() {
      tone({ freq: 510, end: 670, dur: 0.09, gain: 0.04 });
    },
    switchOpen() {
      tone({ freq: 290, end: 470, dur: 0.14, gain: 0.05, type: 'square' });
    },
    death() {
      tone({ freq: 180, end: 80, dur: 0.18, gain: 0.07, type: 'sawtooth' });
    },
    clear() {
      tone({ freq: 460, end: 720, dur: 0.15, gain: 0.05 });
      window.setTimeout(() => tone({ freq: 640, end: 920, dur: 0.13, gain: 0.05 }), 120);
    },
  };
})();

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0');
}

function hardBounds() {
  return [
    rect(-40, 0, 40, H),
    rect(W, 0, 40, H),
    rect(0, -40, W, 40),
    rect(0, H, W, 40),
  ];
}

function createDoor(data) {
  return {
    ...data,
    baseY: data.y,
    currentY: data.y,
    progress: 0,
    unlocked: false,
    openFxDone: false,
  };
}

function loadLevel(index) {
  world.levelIndex = clamp(index, 0, LEVELS.length - 1);
  const level = LEVELS[world.levelIndex];

  world.solids = level.solids.map((s) => ({ ...s }));
  world.hazards = level.hazards.map((h) => ({ ...h }));
  world.buttons = level.buttons.map((b) => ({ ...b, pressed: false }));
  world.doors = level.doors.map(createDoor);
  world.exits = level.exits.map((e) => ({ ...e }));
  world.particles = [];

  const ember = makePlayer('ember', {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['KeyW'],
    touchLeft: 'ember-left',
    touchRight: 'ember-right',
    touchJump: 'ember-jump',
  });
  const aqua = makePlayer('aqua', {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['ArrowUp'],
    touchLeft: 'aqua-left',
    touchRight: 'aqua-right',
    touchJump: 'aqua-jump',
  });

  const spawns = level.spawns;
  ember.x = spawns.ember.x;
  ember.y = spawns.ember.y;
  aqua.x = spawns.aqua.x;
  aqua.y = spawns.aqua.y;
  world.players = [ember, aqua];

  hudLevel.textContent = `${world.levelIndex + 1} / ${LEVELS.length}`;
  btnNext.disabled = true;
}

function resetRun() {
  world.deaths = 0;
  world.timer = 0;
  world.state = STATE.IDLE;
  world.message = 'Idle';
  loadLevel(0);
  showToast('Ready');
}

function isPressed(player, action) {
  const list = player.controls[action];
  for (let i = 0; i < list.length; i += 1) {
    if (input.keys[list[i]]) return true;
  }
  if (action === 'left' && input.touchHold[player.controls.touchLeft]) return true;
  if (action === 'right' && input.touchHold[player.controls.touchRight]) return true;
  return false;
}

function isJustJump(player) {
  const list = player.controls.jump;
  for (let i = 0; i < list.length; i += 1) {
    if (input.just[list[i]]) return true;
  }
  return !!input.touchTap[player.controls.touchJump];
}

function getDoorSolid(door) {
  return {
    x: door.x,
    y: door.currentY,
    w: door.w,
    h: door.h,
  };
}

function allSolids() {
  const solids = world.solids.slice();
  const bounds = hardBounds();
  for (let i = 0; i < bounds.length; i += 1) solids.push(bounds[i]);
  for (let i = 0; i < world.doors.length; i += 1) {
    const door = world.doors[i];
    if (door.progress < 0.98) solids.push(getDoorSolid(door));
  }
  return solids;
}

function resolveHorizontal(player, solids, prevX) {
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    if (!overlap(player, s)) continue;
    if (prevX + player.w <= s.x) {
      player.x = s.x - player.w;
      player.vx = 0;
    } else if (prevX >= s.x + s.w) {
      player.x = s.x + s.w;
      player.vx = 0;
    }
  }
}

function resolveVertical(player, solids, prevY) {
  player.onGround = false;
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    if (!overlap(player, s)) continue;
    if (prevY + player.h <= s.y) {
      player.y = s.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (prevY >= s.y + s.h) {
      player.y = s.y + s.h;
      if (player.vy < 0) player.vy = 0;
    }
  }
}

function spawnBurst(x, y, color, count = 12) {
  for (let i = 0; i < count; i += 1) {
    world.particles.push({
      x,
      y,
      vx: (Math.random() * 2 - 1) * 220,
      vy: (Math.random() * 2 - 1) * 220,
      life: 0.35 + Math.random() * 0.35,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  if (world.particles.length > 220) {
    world.particles.splice(0, world.particles.length - 220);
  }
}

function killPlayers(reasonText) {
  if (world.state !== STATE.RUNNING) return;
  world.deaths += 1;
  world.state = STATE.RESPAWN;
  world.respawnAt = performance.now() + 680;
  world.message = 'Respawn';
  sfx.death();
  spawnBurst(world.players[0].x + 15, world.players[0].y + 21, '#ffb27a', 10);
  spawnBurst(world.players[1].x + 15, world.players[1].y + 21, '#8ee8ff', 10);
  showToast(reasonText || 'Defeated');
}

function updateButtonsAndDoors(dt) {
  for (let i = 0; i < world.buttons.length; i += 1) {
    const b = world.buttons[i];
    const wasPressed = b.pressed;
    b.pressed = false;

    for (let p = 0; p < world.players.length; p += 1) {
      const pl = world.players[p];
      if (pl.element !== b.element) continue;
      const feet = { x: pl.x + 4, y: pl.y + pl.h - 8, w: pl.w - 8, h: 10 };
      if (overlap(feet, b)) {
        b.pressed = true;
        break;
      }
    }

    if (!wasPressed && b.pressed) {
      spawnBurst(b.x + b.w * 0.5, b.y + 2, b.element === 'ember' ? '#ffad6a' : '#84e8ff', 8);
    }
  }

  for (let i = 0; i < world.doors.length; i += 1) {
    const door = world.doors[i];
    let active = false;
    for (let j = 0; j < world.buttons.length; j += 1) {
      const b = world.buttons[j];
      if (b.target === door.id && b.pressed) {
        active = true;
        break;
      }
    }

    if (active) door.unlocked = true;
    const target = door.unlocked ? 1 : 0;
    const speed = 2.9;
    door.progress += (target - door.progress) * Math.min(1, speed * dt);
    door.currentY = door.baseY - door.lift * door.progress;

    if (door.unlocked && !door.openFxDone) {
      door.openFxDone = true;
      sfx.switchOpen();
      spawnBurst(door.x + door.w * 0.5, door.currentY + 20, door.color, 16);
    }
  }
}

function updatePlayers(dt) {
  const solids = allSolids();
  for (let i = 0; i < world.players.length; i += 1) {
    const p = world.players[i];
    p.coyote = Math.max(0, Number(p.coyote || 0) - dt);
    const left = isPressed(p, 'left');
    const right = isPressed(p, 'right');
    const move = (right ? 1 : 0) - (left ? 1 : 0);

    if (move !== 0) {
      p.vx += move * MOVE_ACCEL * dt;
    } else {
      const d = MOVE_DRAG * dt;
      if (Math.abs(p.vx) <= d) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * d;
    }
    p.vx = clamp(p.vx, -MAX_SPEED, MAX_SPEED);

    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);

    const prevX = p.x;
    p.x += p.vx * dt;
    resolveHorizontal(p, solids, prevX);

    const prevY = p.y;
    p.y += p.vy * dt;
    resolveVertical(p, solids, prevY);
    if (p.onGround) p.coyote = COYOTE_TIME;

    p.deadFlash = Math.max(0, p.deadFlash - dt * 3.4);
  }
}

function checkHazards() {
  for (let i = 0; i < world.players.length; i += 1) {
    const p = world.players[i];
    for (let j = 0; j < world.hazards.length; j += 1) {
      const h = world.hazards[j];
      if (!overlap(p, h)) continue;
      if (h.kind === 'acid') {
        killPlayers('Acid trap');
        return;
      }
      if (h.kind !== p.element) {
        killPlayers(h.kind === 'fire' ? 'Aqua hit by fire' : 'Ember hit by water');
        return;
      }
    }
  }
}

function checkExits() {
  const exitMap = { ember: false, aqua: false };
  for (let i = 0; i < world.players.length; i += 1) {
    const p = world.players[i];
    p.inExit = false;
    for (let j = 0; j < world.exits.length; j += 1) {
      const ex = world.exits[j];
      if (ex.element !== p.element) continue;
      if (overlap(p, ex)) {
        p.inExit = true;
        exitMap[p.element] = true;
      }
    }
  }

  if (exitMap.ember && exitMap.aqua) {
    if (world.levelIndex >= LEVELS.length - 1) {
      world.state = STATE.DONE;
      world.message = 'Completed';
      btnNext.disabled = true;
      sfx.clear();
      showToast('Temple cleared');
    } else {
      world.state = STATE.CLEAR;
      world.message = 'Level clear';
      btnNext.disabled = false;
      sfx.clear();
      showToast('Stage clear');
    }
  }
}

function updateParticles(dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.life <= 0) world.particles.splice(i, 1);
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0e1d3f');
  g.addColorStop(1, '#08102a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#2d3f73';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSolid(s) {
  ctx.fillStyle = '#273960';
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = '#374f86';
  ctx.fillRect(s.x, s.y, s.w, Math.min(4, s.h));
}

function drawHazard(h, t) {
  const phase = (t * 0.005 + h.x * 0.01) % (Math.PI * 2);
  let c0 = '#4f93ff';
  let c1 = '#88b9ff';
  if (h.kind === 'fire') {
    c0 = '#ff8c3d';
    c1 = '#ffd083';
  } else if (h.kind === 'acid') {
    c0 = '#5cf0a7';
    c1 = '#b4ffd7';
  }

  ctx.fillStyle = c0;
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.fillStyle = c1;
  for (let i = 0; i < h.w; i += 16) {
    const wave = Math.sin(phase + i * 0.2) * 3;
    ctx.fillRect(h.x + i, h.y + 4 + wave, 8, 6);
  }
}

function drawButton(b) {
  ctx.fillStyle = b.element === 'ember' ? '#f7a35e' : '#7ee0ff';
  ctx.globalAlpha = b.pressed ? 1 : 0.55;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#0e1a38';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
}

function drawDoor(door) {
  const x = door.x;
  const y = door.currentY;
  const p = door.progress;
  ctx.fillStyle = '#1c2e57';
  ctx.fillRect(x, y, door.w, door.h);

  ctx.fillStyle = door.color;
  ctx.globalAlpha = 0.4 + p * 0.6;
  ctx.fillRect(x + 4, y + 4, door.w - 8, door.h - 8);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, door.w - 1, door.h - 1);
}

function drawExit(ex, active) {
  ctx.save();
  ctx.strokeStyle = ex.element === 'ember' ? '#ffb073' : '#8be4ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);
  ctx.fillStyle = ex.element === 'ember' ? '#ff8b3f' : '#67d9ff';
  ctx.globalAlpha = active ? 0.95 : 0.35;
  ctx.fillRect(ex.x + 6, ex.y + 6, ex.w - 12, ex.h - 12);
  ctx.restore();
}

function drawPlayer(p) {
  const body = p.element === 'ember' ? '#ff9c4a' : '#6fe0ff';
  const edge = p.element === 'ember' ? '#ffcc9f' : '#d5f6ff';
  ctx.save();
  ctx.fillStyle = body;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = edge;
  ctx.fillRect(p.x + 6, p.y + 8, p.w - 12, 9);
  ctx.fillStyle = '#0d1530';
  ctx.fillRect(p.x + 8, p.y + 26, 5, 5);
  ctx.fillRect(p.x + p.w - 13, p.y + 26, 5, 5);

  if (p.inExit) {
    ctx.strokeStyle = '#eafaff';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
  }
  ctx.restore();
}

function drawParticles() {
  for (let i = 0; i < world.particles.length; i += 1) {
    const p = world.particles[i];
    ctx.globalAlpha = clamp(p.life * 2.4, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (world.state === STATE.RUNNING) return;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 9, 20, 0.48)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e6f0ff';
  ctx.textAlign = 'center';
  ctx.font = '700 42px system-ui, sans-serif';

  const level = LEVELS[world.levelIndex];
  if (world.state === STATE.IDLE) {
    ctx.fillText('Twin Temple Escape', W * 0.5, 228);
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillStyle = '#a7bcdf';
    ctx.fillText(level.name, W * 0.5, 264);
    return;
  }

  if (world.state === STATE.RESPAWN) {
    ctx.fillText('Respawning...', W * 0.5, 248);
    return;
  }

  if (world.state === STATE.CLEAR) {
    ctx.fillText('Level Clear', W * 0.5, 226);
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillStyle = '#9ad8ff';
    ctx.fillText('Press Next to continue', W * 0.5, 262);
    return;
  }

  if (world.state === STATE.DONE) {
    ctx.fillText('Temple Complete', W * 0.5, 220);
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillStyle = '#96ffbf';
    ctx.fillText(`Total time ${formatTime(world.timer)} · deaths ${world.deaths}`, W * 0.5, 258);
  }
}

function draw(now) {
  drawBackground();

  for (let i = 0; i < world.solids.length; i += 1) drawSolid(world.solids[i]);
  for (let i = 0; i < world.hazards.length; i += 1) drawHazard(world.hazards[i], now);
  for (let i = 0; i < world.buttons.length; i += 1) drawButton(world.buttons[i]);
  for (let i = 0; i < world.doors.length; i += 1) drawDoor(world.doors[i]);

  for (let i = 0; i < world.exits.length; i += 1) {
    const ex = world.exits[i];
    const active = world.players.some((p) => p.element === ex.element && p.inExit);
    drawExit(ex, active);
  }

  drawParticles();
  for (let i = 0; i < world.players.length; i += 1) drawPlayer(world.players[i]);
  drawOverlay();
}

function updateHud() {
  hudTime.textContent = formatTime(world.timer);
  hudDeaths.textContent = String(world.deaths);
  hudLevel.textContent = `${world.levelIndex + 1} / ${LEVELS.length}`;

  if (world.state === STATE.RUNNING) world.message = 'Running';
  if (world.state === STATE.IDLE) world.message = 'Idle';
  if (world.state === STATE.DONE) world.message = 'Complete';
  hudStatus.textContent = world.message;
}

function step(now, dt) {
  if (world.state === STATE.RUNNING) {
    world.timer += dt;
    updateButtonsAndDoors(dt);
    updatePlayers(dt);
    checkHazards();
    if (world.state === STATE.RUNNING) checkExits();
  } else if (world.state === STATE.RESPAWN) {
    if (now >= world.respawnAt) {
      loadLevel(world.levelIndex);
      world.state = STATE.RUNNING;
      world.message = 'Running';
    }
  }

  updateParticles(dt);
  updateHud();
}

function flushInput() {
  input.just = Object.create(null);
  input.touchTap = Object.create(null);
}

let last = performance.now();
function loop(now) {
  const rawDt = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.033, rawDt);

  step(now, dt);
  draw(now);
  flushInput();
  requestAnimationFrame(loop);
}

function touchSet(action, active) {
  if (!action) return;
  if (action.endsWith('-jump')) {
    if (active) input.touchTap[action] = true;
    return;
  }
  input.touchHold[action] = active;
}

function bindEvents() {
  window.addEventListener('keydown', (event) => {
    if (!input.keys[event.code]) input.just[event.code] = true;
    input.keys[event.code] = true;
    if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyD'].includes(event.code)) {
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('keyup', (event) => {
    input.keys[event.code] = false;
  });

  const touchButtons = Array.from(document.querySelectorAll('.touch-btn'));
  touchButtons.forEach((btn) => {
    const action = btn.dataset.touch;
    const on = () => {
      btn.classList.add('is-on');
      touchSet(action, true);
    };
    const off = () => {
      btn.classList.remove('is-on');
      touchSet(action, false);
    };

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sfx.ensure();
      on();
    });
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  canvas.addEventListener('pointerdown', () => {
    sfx.ensure();
  });

  btnStart.addEventListener('click', () => {
    sfx.ensure();
    if (world.state === STATE.DONE) {
      resetRun();
    }
    world.state = STATE.RUNNING;
    world.message = 'Running';
    showToast('Run started');
  });

  btnRestart.addEventListener('click', () => {
    sfx.ensure();
    loadLevel(world.levelIndex);
    if (world.state === STATE.DONE) {
      world.timer = 0;
      world.deaths = 0;
    }
    world.state = STATE.RUNNING;
    world.message = 'Running';
    btnNext.disabled = true;
    showToast('Restarted');
  });

  btnNext.addEventListener('click', () => {
    if (world.state !== STATE.CLEAR) return;
    const next = world.levelIndex + 1;
    loadLevel(next);
    world.state = STATE.RUNNING;
    world.message = 'Running';
    btnNext.disabled = true;
    showToast('Next stage');
  });
}

function init() {
  bindEvents();
  resetRun();
  requestAnimationFrame(loop);
}

init();
