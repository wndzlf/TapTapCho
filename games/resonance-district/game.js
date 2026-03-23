const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageCard = document.getElementById('stageCard');
const stageShell = document.getElementById('stageShell');
const wrap = document.querySelector('.app-shell');

const btnStart = document.getElementById('btnStart');
const btnFullscreen = document.getElementById('btnFullscreen');
const hudChapter = document.getElementById('hudChapter');
const hudDeaths = document.getElementById('hudDeaths');
const hudEchoes = document.getElementById('hudEchoes');
const hudStatus = document.getElementById('hudStatus');
const messageEl = document.getElementById('message');
const touchButtons = Array.from(document.querySelectorAll('.touch-button'));

const W = canvas.width;
const H = canvas.height;

const STEP = 1 / 60;
const MAX_FRAME = 0.05;
const GROUND_Y = 458;
const PSEUDO_FULLSCREEN_CLASS = 'is-pseudo-fullscreen';

const GRAVITY = 1850;
const MOVE_ACCEL = 3000;
const MOVE_DRAG = 2400;
const MAX_SPEED = 205;
const JUMP_SPEED = 670;
const COYOTE_TIME = 0.12;
const JUMP_BUFFER = 0.12;

const CHAPTER_DEFS = [
  { id: 'drain', label: '배수로', status: '잠행' },
  { id: 'dorm', label: '기숙동', status: '동기화' },
  { id: 'flood', label: '침수동', status: '우회' },
  { id: 'resonance', label: '공명실', status: '상승' },
  { id: 'inspection', label: '검사실', status: '반향' },
];

const input = {
  hold: Object.create(null),
  jumpBuffer: 0,
};

const player = {
  x: 96,
  y: GROUND_Y - 52,
  w: 24,
  h: 52,
  vx: 0,
  vy: 0,
  onGround: false,
  coyote: 0,
  facing: 1,
  hiddenBlend: 0,
};

const state = {
  mode: 'idle',
  chapterIndex: 0,
  chapterLabel: `1 / ${CHAPTER_DEFS.length} · ${CHAPTER_DEFS[0].label}`,
  status: '대기',
  deaths: 0,
  echoes: 0,
  message: '',
  messageUntil: 0,
  flash: 0,
  fade: 1,
  fadeDir: -1,
  respawnAt: 0,
  transitionAt: 0,
  endingAt: 0,
  now: 0,
  lastFrameAt: 0,
  accumulator: 0,
  cameraX: 0,
  cameraTargetX: 0,
  lastStageTouchAt: 0,
  foundEchoes: Object.create(null),
  unlocked: Object.create(null),
};

let chapter = null;

const audio = (() => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let stepAt = 0;

  function ensure() {
    if (!AudioContextCtor) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function tone({
    freq = 260,
    end = null,
    duration = 0.14,
    gain = 0.04,
    type = 'triangle',
    delay = 0,
  }) {
    const ctxAudio = ensure();
    if (!ctxAudio) return;
    const now = ctxAudio.currentTime + delay;
    const oscillator = ctxAudio.createOscillator();
    const amplifier = ctxAudio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, now);
    if (end != null) {
      oscillator.frequency.linearRampToValueAtTime(end, now + duration);
    }
    amplifier.gain.setValueAtTime(0.0001, now);
    amplifier.gain.linearRampToValueAtTime(gain, now + 0.01);
    amplifier.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(amplifier);
    amplifier.connect(ctxAudio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    jump() {
      tone({ freq: 208, end: 320, duration: 0.12, gain: 0.03, type: 'sine' });
    },
    land() {
      tone({ freq: 132, end: 98, duration: 0.08, gain: 0.028, type: 'triangle' });
    },
    collect() {
      tone({ freq: 520, end: 790, duration: 0.15, gain: 0.035, type: 'triangle' });
    },
    switch() {
      tone({ freq: 298, end: 520, duration: 0.18, gain: 0.04, type: 'triangle' });
    },
    alarm() {
      tone({ freq: 206, end: 150, duration: 0.18, gain: 0.044, type: 'sawtooth' });
      tone({ freq: 160, end: 126, duration: 0.16, gain: 0.03, delay: 0.06, type: 'square' });
    },
    door() {
      tone({ freq: 118, end: 178, duration: 0.22, gain: 0.042, type: 'triangle' });
    },
    end() {
      tone({ freq: 190, end: 260, duration: 0.28, gain: 0.05, type: 'sine' });
      tone({ freq: 312, end: 410, duration: 0.26, gain: 0.03, delay: 0.08, type: 'triangle' });
    },
    step(speedNorm) {
      const ctxAudio = ensure();
      if (!ctxAudio) return;
      const now = ctxAudio.currentTime;
      const interval = 0.28 - speedNorm * 0.12;
      if (now - stepAt < interval) return;
      stepAt = now;
      tone({
        freq: 180 + speedNorm * 40,
        end: 122,
        duration: 0.05,
        gain: 0.018,
        type: 'square',
      });
    },
  };
})();

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function distance(a, b) {
  return Math.abs(a - b);
}

function showMessage(text, duration = 1400) {
  state.message = text;
  state.messageUntil = state.now + duration;
  messageEl.textContent = text;
  messageEl.classList.add('show');
}

function clearMessage() {
  if (state.now < state.messageUntil) return;
  state.message = '';
  messageEl.classList.remove('show');
}

function updateHud() {
  hudChapter.textContent = state.chapterLabel;
  hudDeaths.textContent = String(state.deaths);
  hudEchoes.textContent = `${state.echoes} / ${CHAPTER_DEFS.length}`;
  hudStatus.textContent = state.status;
}

function createBaseChapter(id, worldWidth) {
  return {
    id,
    worldWidth,
    start: { x: 96, y: GROUND_Y - player.h },
    exit: rect(worldWidth - 88, GROUND_Y - 180, 70, 180),
    solids: [],
    shelters: [],
    searchlights: [],
    doors: [],
    levers: [],
    boxes: [],
    plates: [],
    bridge: null,
    crowd: null,
    scanner: null,
    elevator: null,
    projector: null,
    echo: null,
    flags: Object.create(null),
  };
}

function buildChapter(id) {
  switch (id) {
    case 'drain':
      return buildDrainChapter();
    case 'dorm':
      return buildDormChapter();
    case 'flood':
      return buildFloodChapter();
    case 'resonance':
      return buildResonanceChapter();
    case 'inspection':
      return buildInspectionChapter();
    default:
      return buildDrainChapter();
  }
}

function buildDrainChapter() {
  const current = createBaseChapter('drain', 1500);
  current.solids.push(rect(0, GROUND_Y, 1500, 120));
  current.shelters = [
    rect(286, 268, 112, 190),
    rect(566, 242, 142, 216),
    rect(868, 224, 152, 234),
  ];
  current.searchlights.push({
    x: 820,
    minX: 360,
    maxX: 1160,
    dir: 1,
    speed: 76,
    width: 176,
    height: 392,
  });
  current.doors.push({
    id: 'grate',
    x: 1392,
    y: 298,
    w: 48,
    h: 160,
    progress: 0,
    target: 0,
    retain: true,
  });
  current.levers.push({
    id: 'grate-chain',
    x: 1306,
    y: 316,
    w: 28,
    h: 84,
    activated: false,
  });
  current.echo = {
    x: 976,
    y: 418,
    r: 7,
    found: !!state.foundEchoes.drain,
  };
  return current;
}

function buildDormChapter() {
  const current = createBaseChapter('dorm', 1560);
  current.solids.push(rect(0, GROUND_Y, 1560, 120));
  current.crowd = {
    leadX: 940,
    width: 280,
    speed: 38,
    pause: 0,
    holdX: 1118,
    holdDuration: 2.25,
    holdUsed: false,
    count: 8,
    baseY: GROUND_Y - player.h,
    joined: false,
  };
  current.scanner = {
    left: 1188,
    right: 1278,
    top: 172,
    bottom: GROUND_Y,
    flash: 0,
  };
  current.doors.push({
    id: 'dorm-door',
    x: 1394,
    y: 304,
    w: 46,
    h: 154,
    progress: 0,
    target: 0,
    retain: true,
  });
  current.echo = {
    x: 1470,
    y: 418,
    r: 7,
    found: !!state.foundEchoes.dorm,
  };
  return current;
}

function buildFloodChapter() {
  const current = createBaseChapter('flood', 1560);
  current.solids.push(
    rect(0, GROUND_Y, 530, 120),
    rect(930, GROUND_Y, 630, 120),
  );
  current.bridge = {
    x: 530,
    y: 418,
    maxW: 400,
    h: 16,
    progress: 0,
    target: 0,
    latched: false,
  };
  current.boxes.push({
    id: 'service-cart',
    x: 232,
    y: GROUND_Y - 50,
    w: 78,
    h: 50,
    minX: 112,
    maxX: 462,
  });
  current.plates.push({
    id: 'pump-plate',
    x: 430,
    y: GROUND_Y - 14,
    w: 94,
    h: 14,
    kind: 'box',
  });
  current.doors.push({
    id: 'annex-door',
    x: 1412,
    y: 298,
    w: 48,
    h: 160,
    progress: 0,
    target: 0,
    retain: true,
  });
  current.levers.push({
    id: 'flood-valve',
    x: 1212,
    y: 338,
    w: 28,
    h: 70,
    activated: false,
  });
  current.echo = {
    x: 1238,
    y: 418,
    r: 7,
    found: !!state.foundEchoes.flood,
  };
  return current;
}

function buildResonanceChapter() {
  const current = createBaseChapter('resonance', 1640);
  current.solids.push(
    rect(0, GROUND_Y, 1640, 120),
    rect(866, 308, 508, 18),
    rect(882, 384, 38, 74),
  );
  current.boxes.push({
    id: 'weight-cart',
    x: 214,
    y: GROUND_Y - 52,
    w: 76,
    h: 52,
    minX: 108,
    maxX: 548,
  });
  current.plates.push({
    id: 'power-plate',
    x: 520,
    y: GROUND_Y - 14,
    w: 94,
    h: 14,
    kind: 'either',
  });
  current.elevator = {
    x: 748,
    y: 420,
    w: 118,
    h: 16,
    minY: 420,
    maxY: 300,
    active: false,
    prevY: 420,
  };
  current.doors.push({
    id: 'lab-door',
    x: 1360,
    y: 148,
    w: 48,
    h: 160,
    progress: 0,
    target: 0,
    retain: true,
  });
  current.levers.push({
    id: 'resonance-lever',
    x: 1220,
    y: 228,
    w: 28,
    h: 72,
    activated: false,
  });
  current.start = { x: 96, y: GROUND_Y - player.h };
  current.exit = rect(1470, 118, 100, 208);
  current.echo = {
    x: 1030,
    y: 268,
    r: 7,
    found: !!state.foundEchoes.resonance,
  };
  return current;
}

function buildInspectionChapter() {
  const current = createBaseChapter('inspection', 1700);
  current.solids.push(rect(0, GROUND_Y, 1700, 120));
  current.projector = {
    zone: rect(432, 168, 660, 290),
    axisX: 760,
    beamPulse: 0,
    active: false,
  };
  current.plates.push(
    {
      id: 'echo-left',
      x: 560,
      y: GROUND_Y - 14,
      w: 80,
      h: 14,
      kind: 'player',
    },
    {
      id: 'echo-right',
      x: 880,
      y: GROUND_Y - 14,
      w: 80,
      h: 14,
      kind: 'echo',
    },
  );
  current.doors.push({
    id: 'inspection-door',
    x: 1184,
    y: 298,
    w: 48,
    h: 160,
    progress: 0,
    target: 0,
    retain: true,
  });
  current.echo = {
    x: 470,
    y: 418,
    r: 7,
    found: !!state.foundEchoes.inspection,
  };
  current.exit = rect(1572, 278, 88, 180);
  return current;
}

function loadChapter(index, preserveProgress = true) {
  const def = CHAPTER_DEFS[index];
  if (!preserveProgress) {
    state.deaths = 0;
    state.foundEchoes = Object.create(null);
    state.echoes = 0;
    state.unlocked = Object.create(null);
  }

  chapter = buildChapter(def.id);
  player.x = chapter.start.x;
  player.y = chapter.start.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.coyote = 0;
  player.hiddenBlend = 0;
  input.jumpBuffer = 0;

  state.chapterIndex = index;
  state.chapterLabel = `${index + 1} / ${CHAPTER_DEFS.length} · ${def.label}`;
  state.status = def.status;
  state.cameraX = clamp(player.x - W * 0.3, 0, Math.max(0, chapter.worldWidth - W));
  state.cameraTargetX = state.cameraX;
  state.fade = 1;
  state.fadeDir = -1;
  state.flash = 0;
  updateHud();
  showMessage(def.label, 1200);
}

function startGame() {
  audio.unlock();
  loadChapter(0, false);
  state.mode = 'running';
}

function triggerDeath(reason) {
  if (state.mode !== 'running') return;
  state.mode = 'respawn';
  state.status = reason;
  state.deaths += 1;
  state.flash = 1;
  state.fade = 0;
  state.fadeDir = 1;
  state.respawnAt = state.now + 760;
  audio.alarm();
  updateHud();

  if (reason === '탐조등') {
    showMessage('빛이 지나가면 다음 엄폐물로', 1500);
  } else if (reason === '스캐너') {
    showMessage('군중 뒤에 붙으면 함께 통과한다', 1500);
  } else {
    showMessage(reason, 900);
  }
}

function completeChapter() {
  if (state.mode !== 'running') return;
  if (state.chapterIndex >= CHAPTER_DEFS.length - 1) {
    state.mode = 'ending';
    state.status = '탈출';
    state.endingAt = state.now + 2600;
    state.fade = 0;
    state.fadeDir = 0;
    audio.end();
    updateHud();
    showMessage('잔향동', 1800);
    return;
  }

  state.mode = 'transition';
  state.status = '이동';
  state.transitionAt = state.now + 900;
  state.fade = 0;
  state.fadeDir = 1;
  audio.end();
  updateHud();
}

function setDoorTarget(id, target) {
  const door = chapter.doors.find((item) => item.id === id);
  if (!door) return;
  door.target = target;
}

function isDoorOpen(id) {
  const door = chapter.doors.find((item) => item.id === id);
  return !!door && door.progress >= 0.98;
}

function doorSolid(door) {
  if (door.progress >= 0.98) return null;
  return {
    x: door.x,
    y: lerp(door.y, door.y - door.h - 18, door.progress),
    w: door.w,
    h: door.h,
  };
}

function bridgeSolid() {
  if (!chapter.bridge || chapter.bridge.progress <= 0.04) return null;
  return rect(
    chapter.bridge.x,
    chapter.bridge.y,
    chapter.bridge.maxW * chapter.bridge.progress,
    chapter.bridge.h,
  );
}

function elevatorSolid() {
  if (!chapter.elevator) return null;
  return rect(chapter.elevator.x, chapter.elevator.y, chapter.elevator.w, chapter.elevator.h);
}

function allSolids() {
  const solids = chapter.solids.slice();

  for (const box of chapter.boxes) {
    solids.push(rect(box.x, box.y, box.w, box.h));
  }

  const bridge = bridgeSolid();
  if (bridge) solids.push(bridge);

  const elevator = elevatorSolid();
  if (elevator) solids.push(elevator);

  for (const door of chapter.doors) {
    const solid = doorSolid(door);
    if (solid) solids.push(solid);
  }

  return solids;
}

function rectCenterX(target) {
  return target.x + target.w * 0.5;
}

function rectCenterY(target) {
  return target.y + target.h * 0.5;
}

function isPlayerSheltered() {
  return chapter.shelters.some((shelter) => overlap(player, shelter));
}

function crowdRange() {
  if (!chapter.crowd) return { first: 0, last: 0 };
  return {
    first: chapter.crowd.leadX - chapter.crowd.width,
    last: chapter.crowd.leadX,
  };
}

function isPlayerInCrowd() {
  if (!chapter.crowd) return false;
  const range = crowdRange();
  const center = player.x + player.w * 0.5;
  return center > range.first + 24
    && center < range.last - 24
    && player.y + player.h > chapter.crowd.baseY + 28;
}

function syncPlayerWithCrowd() {
  if (!chapter.crowd || !player.onGround) return;
  const range = crowdRange();
  const center = player.x + player.w * 0.5;
  const latchStart = range.first - 20;
  const latchEnd = range.last + 8;
  if (center < latchStart || center > latchEnd) return;
  const minCenter = range.first + 58;
  const maxCenter = range.last - 42;
  const targetCenter = clamp(center, minCenter, maxCenter);
  const targetX = targetCenter - player.w * 0.5;
  player.x = lerp(player.x, targetX, 0.16);
  if (chapter.crowd.pause > 0) {
    player.vx = Math.min(player.vx, 12);
  } else {
    player.vx = Math.min(player.vx, chapter.crowd.speed + 12);
  }
  chapter.crowd.joined = true;
}

function updateDoors(dt) {
  for (const door of chapter.doors) {
    const desired = door.retain && door.progress >= 0.98 ? 1 : door.target;
    if (door.progress === desired) continue;
    const dir = desired > door.progress ? 1 : -1;
    door.progress = clamp(door.progress + dir * dt * 1.9, 0, 1);
  }
}

function updateBridge(dt) {
  if (!chapter.bridge) return;
  if (chapter.bridge.latched) {
    chapter.bridge.target = 1;
  }
  chapter.bridge.progress = lerp(
    chapter.bridge.progress,
    chapter.bridge.target,
    clamp(dt * 4.2, 0, 1),
  );
}

function updateElevator(dt) {
  if (!chapter.elevator) return;
  const lift = chapter.elevator;
  lift.prevY = lift.y;
  const targetY = lift.active ? lift.maxY : lift.minY;
  lift.y = lerp(lift.y, targetY, clamp(dt * 2.6, 0, 1));

  const deltaY = lift.y - lift.prevY;
  if (Math.abs(deltaY) < 0.001) return;

  const wasStanding = player.y + player.h >= lift.prevY - 3
    && player.y + player.h <= lift.prevY + 6
    && player.x + player.w > lift.x + 6
    && player.x < lift.x + lift.w - 6;

  if (wasStanding) {
    player.y += deltaY;
  }
}

function updateSearchlights(dt) {
  if (!chapter.searchlights.length) return;
  for (const beam of chapter.searchlights) {
    beam.x += beam.dir * beam.speed * dt;
    if (beam.x <= beam.minX) {
      beam.x = beam.minX;
      beam.dir = 1;
    } else if (beam.x >= beam.maxX) {
      beam.x = beam.maxX;
      beam.dir = -1;
    }
  }
}

function updateCrowd(dt) {
  if (!chapter.crowd) return;
  const crowd = chapter.crowd;
  crowd.joined = false;

  if (!chapter.flags.dormPrompted && player.x > 200) {
    chapter.flags.dormPrompted = true;
    showMessage('군중 뒤에 붙으면 함께 통과한다', 1500);
  }

  if (crowd.pause > 0) {
    crowd.pause -= dt;
  } else if (!crowd.holdUsed && crowd.leadX >= crowd.holdX) {
    crowd.leadX = crowd.holdX;
    crowd.pause = crowd.holdDuration;
    crowd.holdUsed = true;
    showMessage('줄이 멈췄다', 1000);
  } else {
    crowd.leadX += crowd.speed * dt;
    if (crowd.leadX > 1440) {
      crowd.leadX = 920;
      crowd.holdUsed = false;
      crowd.pause = 1.0;
    }
  }

  if (chapter.scanner) {
    chapter.scanner.flash = Math.max(0, chapter.scanner.flash - dt * 2.2);
  }
}

function updateInspectionProjector(dt) {
  if (!chapter.projector) return;
  chapter.projector.beamPulse += dt * 2.2;
  chapter.projector.active = overlap(player, chapter.projector.zone);

  if (chapter.projector.active && !chapter.flags.projectorPrompted) {
    chapter.flags.projectorPrompted = true;
    showMessage('빛 속에서 반향이 따라온다', 1500);
  }
}

function updateMovingMechanics(dt) {
  updateDoors(dt);
  updateBridge(dt);
  updateElevator(dt);
  updateSearchlights(dt);
  updateCrowd(dt);
  updateInspectionProjector(dt);
}

function isActionHeld(name) {
  return !!input.hold[name];
}

function pushBoxes(dx) {
  if (dx === 0 || !chapter.boxes.length) return;
  const direction = Math.sign(dx);

  for (const box of chapter.boxes) {
    const playerNext = { x: player.x + dx, y: player.y, w: player.w, h: player.h };
    if (!overlap(playerNext, box)) continue;
    if (player.y + player.h <= box.y + 8) continue;
    if (direction > 0 && player.x >= box.x + box.w) continue;
    if (direction < 0 && player.x + player.w <= box.x) continue;

    const movedX = clamp(box.x + dx, box.minX, box.maxX);
    if (Math.abs(movedX - box.x) < Math.abs(dx) * 0.35) continue;
    box.x = movedX;
  }
}

function resolveHorizontal(entity, solids) {
  const dx = entity.vx * STEP;
  pushBoxes(dx);
  entity.x += dx;

  for (const solid of solids) {
    if (!overlap(entity, solid)) continue;
    if (entity.vx > 0) {
      entity.x = solid.x - entity.w;
    } else if (entity.vx < 0) {
      entity.x = solid.x + solid.w;
    }
    entity.vx = 0;
  }
}

function resolveVertical(entity, solids) {
  const wasGrounded = entity.onGround;
  entity.y += entity.vy * STEP;
  entity.onGround = false;

  for (const solid of solids) {
    if (!overlap(entity, solid)) continue;
    if (entity.vy > 0) {
      entity.y = solid.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
      entity.coyote = COYOTE_TIME;
    } else if (entity.vy < 0) {
      entity.y = solid.y + solid.h;
      entity.vy = 0;
    }
  }

  if (entity.onGround && !wasGrounded) {
    audio.land();
  }
}

function updatePlayer() {
  const move = (isActionHeld('left') ? -1 : 0) + (isActionHeld('right') ? 1 : 0);
  if (move !== 0) {
    player.vx += move * MOVE_ACCEL * STEP;
    player.facing = move;
  } else {
    const drag = MOVE_DRAG * STEP;
    if (Math.abs(player.vx) <= drag) {
      player.vx = 0;
    } else {
      player.vx -= Math.sign(player.vx) * drag;
    }
  }

  player.vx = clamp(player.vx, -MAX_SPEED, MAX_SPEED);

  if (player.onGround) {
    player.coyote = COYOTE_TIME;
  } else {
    player.coyote = Math.max(0, player.coyote - STEP);
  }

  input.jumpBuffer = Math.max(0, input.jumpBuffer - STEP);
  if (input.jumpBuffer > 0 && (player.onGround || player.coyote > 0)) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
    player.coyote = 0;
    input.jumpBuffer = 0;
    audio.jump();
  }

  player.vy += GRAVITY * STEP;
  player.vy = Math.min(player.vy, 1180);

  const solids = allSolids();
  resolveHorizontal(player, solids);
  resolveVertical(player, solids);

  player.x = clamp(player.x, 0, chapter.worldWidth - player.w);

  if (player.y > H + 180) {
    triggerDeath('추락');
  }

  const speedNorm = clamp(Math.abs(player.vx) / MAX_SPEED, 0, 1);
  if (player.onGround && speedNorm > 0.35) {
    audio.step(speedNorm);
  }
}

function updateEchoOrb() {
  if (!chapter.echo || chapter.echo.found) return;
  const probe = rect(chapter.echo.x - 9, chapter.echo.y - 9, 18, 18);
  if (!overlap(player, probe)) return;
  chapter.echo.found = true;
  state.foundEchoes[chapter.id] = true;
  state.echoes = Object.keys(state.foundEchoes).length;
  audio.collect();
  updateHud();
  showMessage('잔향', 900);
}

function updateLevers() {
  for (const lever of chapter.levers) {
    if (lever.activated) continue;
    const near = distance(rectCenterX(player), rectCenterX(lever)) < 34
      && distance(rectCenterY(player), rectCenterY(lever)) < 82;
    if (!near || !player.onGround) continue;

    lever.activated = true;
    audio.switch();

    if (lever.id === 'grate-chain') {
      setDoorTarget('grate', 1);
      showMessage('빗장이 풀린다', 1000);
    } else if (lever.id === 'flood-valve') {
      setDoorTarget('annex-door', 1);
      showMessage('배수 밸브가 열린다', 1100);
    } else if (lever.id === 'resonance-lever') {
      setDoorTarget('lab-door', 1);
      showMessage('공명실이 깨어난다', 1100);
    }
  }
}

function platePressedByBox(plate) {
  for (const box of chapter.boxes) {
    const sensor = rect(plate.x, plate.y - 8, plate.w, plate.h + 10);
    if (overlap(box, sensor)) return true;
  }
  return false;
}

function platePressedByPlayer(plate) {
  const sensor = rect(plate.x, plate.y - 8, plate.w, plate.h + 10);
  return overlap(player, sensor) && player.y + player.h <= plate.y + 20;
}

function projectedEchoRect() {
  if (!chapter.projector || !chapter.projector.active) return null;
  const center = player.x + player.w * 0.5;
  const echoCenter = chapter.projector.axisX * 2 - center;
  return rect(echoCenter - player.w * 0.5, player.y, player.w, player.h);
}

function updatePlatesAndChapterLogic() {
  for (const plate of chapter.plates) {
    const playerPressed = platePressedByPlayer(plate);
    const boxPressed = platePressedByBox(plate);
    const echoRect = projectedEchoRect();
    const echoPressed = echoRect ? overlap(echoRect, rect(plate.x, plate.y - 8, plate.w, plate.h + 10)) : false;

    if (plate.id === 'pump-plate' && boxPressed) {
      if (!chapter.bridge.latched) {
        chapter.bridge.latched = true;
        chapter.bridge.target = 1;
        audio.door();
        showMessage('가교가 뻗어나간다', 1100);
      }
    }

    if (plate.id === 'power-plate') {
      const nextActive = playerPressed || boxPressed;
      if (nextActive !== chapter.elevator.active) {
        chapter.elevator.active = nextActive;
        if (nextActive) {
          audio.door();
          showMessage('승강기가 깨어난다', 1000);
        }
      }
    }

    if (plate.id === 'echo-left') {
      plate.active = playerPressed;
    } else if (plate.id === 'echo-right') {
      plate.active = echoPressed;
    }
  }

  if (chapter.id === 'inspection') {
    const left = chapter.plates.find((plate) => plate.id === 'echo-left');
    const right = chapter.plates.find((plate) => plate.id === 'echo-right');
    if (left?.active && right?.active) {
      if (!isDoorOpen('inspection-door') && !chapter.flags.echoSolved) {
        chapter.flags.echoSolved = true;
        showMessage('반향이 문을 연다', 1200);
        audio.door();
      }
      setDoorTarget('inspection-door', 1);
    }
  }

  if (chapter.id === 'dorm' && player.x > 1324) {
    setDoorTarget('dorm-door', 1);
  }
}

function updateChapterState() {
  if (chapter.id === 'drain') {
    if (player.x > 170 && !chapter.flags.drainPrompted) {
      chapter.flags.drainPrompted = true;
      showMessage('빛이 비면 다음 엄폐물로', 1400);
    }

    const beam = chapter.searchlights[0];
    const withinX = player.x + player.w * 0.5 > beam.x - beam.width * 0.5
      && player.x + player.w * 0.5 < beam.x + beam.width * 0.5;
    if (withinX && player.x > 190 && player.x < 1000 && !isPlayerSheltered()) {
      triggerDeath('탐조등');
      return;
    }
  }

  if (chapter.id === 'dorm') {
    syncPlayerWithCrowd();
    player.hiddenBlend = lerp(player.hiddenBlend, isPlayerInCrowd() ? 1 : 0, 0.12);

    const scanner = chapter.scanner;
    const insideGate = player.x + player.w > scanner.left && player.x < scanner.right;
    if (insideGate && !isPlayerInCrowd()) {
      scanner.flash = 1;
      triggerDeath('스캐너');
      return;
    }
    if (insideGate) {
      scanner.flash = Math.max(scanner.flash, 0.25);
    }
  } else {
    player.hiddenBlend = lerp(player.hiddenBlend, 0, 0.14);
  }

  if (chapter.id === 'flood' && !chapter.flags.floodPrompted && player.x > 160) {
    chapter.flags.floodPrompted = true;
    showMessage('서비스 카트가 가교를 올린다', 1500);
  }

  if (chapter.id === 'resonance' && !chapter.flags.resonancePrompted && player.x > 240) {
    chapter.flags.resonancePrompted = true;
    showMessage('무게가 승강기를 깨운다', 1500);
  }

  if (chapter.exit && overlap(player, chapter.exit)) {
    const entryDoorId = {
      drain: 'grate',
      dorm: 'dorm-door',
      flood: 'annex-door',
      resonance: 'lab-door',
      inspection: 'inspection-door',
    }[chapter.id];

    if (!entryDoorId || isDoorOpen(entryDoorId)) {
      completeChapter();
    }
  }
}

function updateCamera() {
  state.cameraTargetX = clamp(player.x - W * 0.36, 0, Math.max(0, chapter.worldWidth - W));
  state.cameraX = lerp(state.cameraX, state.cameraTargetX, 0.12);
}

function updateSceneStatus() {
  if (state.mode !== 'running') return;

  if (chapter.id === 'drain') {
    state.status = isDoorOpen('grate') ? '탈주' : '잠행';
  } else if (chapter.id === 'dorm') {
    state.status = isPlayerInCrowd() ? '동기화' : '잠입';
  } else if (chapter.id === 'flood') {
    state.status = chapter.bridge?.latched ? '가교' : '우회';
  } else if (chapter.id === 'resonance') {
    state.status = chapter.elevator?.active ? '상승' : '전력';
  } else if (chapter.id === 'inspection') {
    state.status = chapter.flags.echoSolved ? '개방' : '반향';
  }

  updateHud();
}

function update(dt) {
  state.now += dt * 1000;
  clearMessage();

  if (state.fadeDir !== 0) {
    state.fade = clamp(state.fade + state.fadeDir * dt * 1.5, 0, 1);
    if (state.fade === 0 || state.fade === 1) {
      state.fadeDir = 0;
    }
  }
  state.flash = Math.max(0, state.flash - dt * 1.6);

  if (state.mode === 'idle') {
    return;
  }

  if (state.mode === 'respawn') {
    if (state.now >= state.respawnAt) {
      loadChapter(state.chapterIndex, true);
      state.mode = 'running';
    }
    return;
  }

  if (state.mode === 'transition') {
    if (state.now >= state.transitionAt) {
      loadChapter(state.chapterIndex + 1, true);
      state.mode = 'running';
    }
    return;
  }

  if (state.mode === 'ending') {
    if (state.now >= state.endingAt) {
      state.status = '슬라이스 완료';
      updateHud();
    }
    return;
  }

  updateMovingMechanics(dt);
  updatePlayer();
  updateLevers();
  updatePlatesAndChapterLogic();
  updateEchoOrb();
  updateChapterState();
  updateSceneStatus();
  updateCamera();
}

function fillBackdrop(gradientStops) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  for (const stop of gradientStops) {
    gradient.addColorStop(stop[0], stop[1]);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function drawDrainBackdrop(cam) {
  fillBackdrop([
    [0, '#10171d'],
    [0.42, '#0a0e12'],
    [1, '#050608'],
  ]);

  for (let i = 0; i < 12; i += 1) {
    const x = i * 150 - (cam * 0.42 % 150);
    ctx.fillStyle = 'rgba(168, 186, 202, 0.05)';
    ctx.fillRect(x, 0, 2, 220);
  }

  ctx.fillStyle = '#0a1015';
  ctx.fillRect(-cam, 340, 1580, 200);
  ctx.fillStyle = 'rgba(25, 34, 41, 0.55)';
  ctx.fillRect(1040 - cam, 148, 168, 310);

  for (let i = 0; i < 8; i += 1) {
    const treeX = 60 + i * 170 - cam * 0.35;
    ctx.fillStyle = 'rgba(7, 10, 12, 0.65)';
    ctx.fillRect(treeX, 110, 18, 360);
    ctx.beginPath();
    ctx.arc(treeX + 9, 104, 52, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDormBackdrop(cam) {
  fillBackdrop([
    [0, '#11171f'],
    [0.4, '#0b0f13'],
    [1, '#050607'],
  ]);

  ctx.fillStyle = '#0c1116';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#141a21';
  ctx.fillRect(0, 108, W, 312);

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const x = 170 + col * 118 - cam * 0.48;
      const y = 138 + row * 80;
      ctx.fillStyle = 'rgba(198, 210, 222, 0.05)';
      ctx.fillRect(x, y, 52, 58);
      ctx.fillStyle = 'rgba(220, 230, 238, 0.05)';
      ctx.beginPath();
      ctx.arc(x + 26, y + 18, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + 18, y + 26, 16, 24);
    }
  }
}

function drawFloodBackdrop(cam) {
  fillBackdrop([
    [0, '#121920'],
    [0.42, '#0b1014'],
    [1, '#05080c'],
  ]);

  ctx.fillStyle = '#0d1319';
  ctx.fillRect(0, 122, W, 418);

  for (let i = 0; i < 9; i += 1) {
    const x = 110 + i * 132 - cam * 0.44;
    ctx.fillStyle = 'rgba(181, 196, 208, 0.04)';
    ctx.fillRect(x, 84, 22, 240);
    ctx.fillRect(x + 8, 118, 70, 12);
  }

  ctx.fillStyle = 'rgba(38, 72, 92, 0.48)';
  const waterX = 530 - cam;
  ctx.fillRect(waterX, 430, 400, 110);
  for (let i = 0; i < 8; i += 1) {
    const waveX = waterX + ((i * 60 + state.now * 0.04) % 400);
    ctx.fillStyle = 'rgba(190, 215, 228, 0.12)';
    ctx.fillRect(waveX, 438 + Math.sin(i + state.now * 0.004) * 4, 28, 2);
  }
}

function drawResonanceBackdrop(cam) {
  fillBackdrop([
    [0, '#151b23'],
    [0.38, '#0c1015'],
    [1, '#06080a'],
  ]);

  ctx.fillStyle = '#0f1318';
  ctx.fillRect(0, 76, W, 464);

  for (let i = 0; i < 7; i += 1) {
    const x = 140 + i * 180 - cam * 0.38;
    ctx.fillStyle = 'rgba(193, 209, 219, 0.04)';
    ctx.fillRect(x, 72, 14, 340);
    ctx.fillStyle = 'rgba(116, 167, 186, 0.08)';
    ctx.fillRect(x - 40, 150, 94, 10);
  }

  const pulse = Math.sin(state.now * 0.006) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(111, 167, 186, ${0.08 + pulse * 0.08})`;
  ctx.fillRect(998 - cam, 148, 180, 120);
}

function drawInspectionBackdrop(cam) {
  fillBackdrop([
    [0, '#15181c'],
    [0.42, '#0b0d10'],
    [1, '#040506'],
  ]);

  ctx.fillStyle = '#0f1216';
  ctx.fillRect(0, 120, W, 420);

  for (let i = 0; i < 9; i += 1) {
    const x = 140 + i * 126 - cam * 0.5;
    ctx.fillStyle = 'rgba(215, 223, 229, 0.05)';
    ctx.fillRect(x, 142, 68, 136);
  }
}

function drawBackground() {
  const cam = state.cameraX;

  if (chapter.id === 'drain') {
    drawDrainBackdrop(cam);
  } else if (chapter.id === 'dorm') {
    drawDormBackdrop(cam);
  } else if (chapter.id === 'flood') {
    drawFloodBackdrop(cam);
  } else if (chapter.id === 'resonance') {
    drawResonanceBackdrop(cam);
  } else {
    drawInspectionBackdrop(cam);
  }
}

function drawSearchlights() {
  const cam = state.cameraX;
  for (const beam of chapter.searchlights) {
    const beamX = beam.x - cam;
    const gradient = ctx.createLinearGradient(beamX, 0, beamX, beam.height);
    gradient.addColorStop(0, 'rgba(246, 247, 241, 0.22)');
    gradient.addColorStop(1, 'rgba(246, 247, 241, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(beamX - 26, 0);
    ctx.lineTo(beamX + 26, 0);
    ctx.lineTo(beamX + beam.width * 0.5, beam.height);
    ctx.lineTo(beamX - beam.width * 0.5, beam.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(228, 233, 238, 0.78)';
    ctx.fillRect(beamX - 10, 0, 20, 18);
  }
}

function drawScanner() {
  if (!chapter.scanner) return;
  const cam = state.cameraX;
  const scanner = chapter.scanner;
  const pulse = Math.sin(state.now * 0.012) * 0.5 + 0.5;
  const alpha = 0.14 + pulse * 0.06 + scanner.flash * 0.42;
  ctx.fillStyle = `rgba(212, 95, 84, ${alpha})`;
  ctx.fillRect(scanner.left - cam, scanner.top, scanner.right - scanner.left, scanner.bottom - scanner.top);
  ctx.strokeStyle = `rgba(233, 208, 203, ${0.22 + scanner.flash * 0.45})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(scanner.left - cam, scanner.top, scanner.right - scanner.left, scanner.bottom - scanner.top);
  ctx.lineWidth = 1;
}

function drawCrowd() {
  if (!chapter.crowd) return;
  const cam = state.cameraX;
  const crowd = chapter.crowd;
  for (let i = 0; i < crowd.count; i += 1) {
    const x = crowd.leadX - i * (crowd.width / (crowd.count - 1)) - cam;
    const sway = Math.sin(state.now * 0.004 + i * 0.7) * 1.6;
    ctx.fillStyle = 'rgba(214, 220, 226, 0.2)';
    ctx.beginPath();
    ctx.arc(x, crowd.baseY + 12 + sway, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 8, crowd.baseY + 20 + sway, 16, 32);
    ctx.fillRect(x - 6, crowd.baseY + 50 + sway, 4, 20);
    ctx.fillRect(x + 2, crowd.baseY + 50 + sway, 4, 20);
  }
}

function drawWorldGeometry() {
  const cam = state.cameraX;
  ctx.fillStyle = '#11171c';
  for (const solid of chapter.solids) {
    ctx.fillRect(solid.x - cam, solid.y, solid.w, solid.h);
  }

  if (chapter.shelters.length) {
    ctx.fillStyle = 'rgba(18, 23, 29, 0.96)';
    for (const shelter of chapter.shelters) {
      ctx.fillRect(shelter.x - cam, shelter.y, shelter.w, shelter.h);
      ctx.fillStyle = 'rgba(201, 214, 227, 0.06)';
      ctx.fillRect(shelter.x - cam + 10, shelter.y + 12, shelter.w - 20, 6);
      ctx.fillStyle = 'rgba(18, 23, 29, 0.96)';
    }
  }

  if (chapter.bridge) {
    const bridge = bridgeSolid();
    if (bridge) {
      ctx.fillStyle = 'rgba(81, 102, 118, 0.92)';
      ctx.fillRect(bridge.x - cam, bridge.y, bridge.w, bridge.h);
      for (let i = 0; i < bridge.w; i += 36) {
        ctx.fillStyle = 'rgba(204, 215, 224, 0.16)';
        ctx.fillRect(bridge.x - cam + i, bridge.y + 4, 18, 2);
      }
    }
  }

  if (chapter.elevator) {
    ctx.fillStyle = 'rgba(66, 79, 90, 0.96)';
    ctx.fillRect(chapter.elevator.x - cam, chapter.elevator.y, chapter.elevator.w, chapter.elevator.h);
    ctx.strokeStyle = 'rgba(206, 214, 220, 0.14)';
    ctx.strokeRect(chapter.elevator.x - cam, chapter.elevator.y, chapter.elevator.w, chapter.elevator.h);
  }

  for (const box of chapter.boxes) {
    ctx.fillStyle = 'rgba(77, 86, 94, 0.96)';
    ctx.fillRect(box.x - cam, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(217, 226, 233, 0.15)';
    ctx.fillRect(box.x - cam + 8, box.y + 10, box.w - 16, 4);
    ctx.strokeStyle = 'rgba(217, 226, 233, 0.14)';
    ctx.strokeRect(box.x - cam + 10, box.y + 16, box.w - 20, box.h - 26);
  }

  for (const plate of chapter.plates) {
    const active = !!plate.active || (plate.id === 'pump-plate' && chapter.bridge?.latched);
    ctx.fillStyle = active ? 'rgba(162, 198, 202, 0.85)' : 'rgba(106, 123, 138, 0.72)';
    ctx.fillRect(plate.x - cam, plate.y, plate.w, plate.h);
  }

  for (const lever of chapter.levers) {
    const active = lever.activated;
    ctx.strokeStyle = active ? 'rgba(197, 226, 228, 0.42)' : 'rgba(197, 226, 228, 0.24)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lever.x + lever.w * 0.5 - cam, lever.y);
    ctx.lineTo(lever.x + lever.w * 0.5 - cam, lever.y + lever.h);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = active ? 'rgba(207, 223, 230, 0.22)' : 'rgba(207, 223, 230, 0.12)';
    ctx.fillRect(lever.x - cam - 6, lever.y + lever.h, lever.w + 12, 8);
  }

  for (const door of chapter.doors) {
    const solid = doorSolid(door);
    if (!solid) continue;
    ctx.fillStyle = 'rgba(55, 63, 72, 0.98)';
    ctx.fillRect(solid.x - cam, solid.y, solid.w, solid.h);
  }
}

function drawProjector() {
  if (!chapter.projector) return;
  const cam = state.cameraX;
  const zone = chapter.projector.zone;
  const pulse = Math.sin(chapter.projector.beamPulse) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(210, 223, 230, ${0.03 + pulse * 0.03})`;
  ctx.fillRect(zone.x - cam, zone.y, zone.w, zone.h);

  const axis = chapter.projector.axisX - cam;
  ctx.fillStyle = 'rgba(217, 228, 235, 0.08)';
  ctx.fillRect(axis - 3, 120, 6, 340);

  if (!chapter.projector.active) return;
  ctx.fillStyle = `rgba(234, 244, 248, ${0.06 + pulse * 0.06})`;
  ctx.beginPath();
  ctx.moveTo(axis - 60, 128);
  ctx.lineTo(axis + 60, 128);
  ctx.lineTo(axis + 200, GROUND_Y);
  ctx.lineTo(axis - 200, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

function drawEchoOrb() {
  if (!chapter.echo || chapter.echo.found) return;
  const cam = state.cameraX;
  const pulse = Math.sin(state.now * 0.008 + chapter.echo.x * 0.01) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(218, 228, 236, ${0.14 + pulse * 0.18})`;
  ctx.beginPath();
  ctx.arc(chapter.echo.x - cam, chapter.echo.y, chapter.echo.r + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawProjectedEcho() {
  const echoRect = projectedEchoRect();
  if (!echoRect) return;
  const x = echoRect.x - state.cameraX;
  ctx.fillStyle = 'rgba(201, 218, 231, 0.16)';
  ctx.beginPath();
  ctx.arc(x + echoRect.w * 0.5, echoRect.y + 12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 5, echoRect.y + 22, 14, 20);
  ctx.fillRect(x + 6, echoRect.y + 42, 4, 10);
  ctx.fillRect(x + 14, echoRect.y + 42, 4, 10);
}

function drawPlayer() {
  const x = player.x - state.cameraX;
  const y = player.y;
  const blend = player.hiddenBlend;
  ctx.fillStyle = `rgba(${Math.round(216 - blend * 68)}, ${Math.round(222 - blend * 74)}, ${Math.round(228 - blend * 82)}, ${0.94 - blend * 0.4})`;
  ctx.beginPath();
  ctx.arc(x + player.w * 0.5, y + 12, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 4, y + 22, 16, 20);
  ctx.fillRect(x + 6, y + 42, 4, 10);
  ctx.fillRect(x + 14, y + 42, 4, 10);
  ctx.fillStyle = `rgba(232, 237, 242, ${0.18 - blend * 0.08})`;
  ctx.fillRect(x + 16, y + 28, 6, 8);
}

function drawForeground() {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.024)';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }

  const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, 180, W * 0.5, H * 0.5, 560);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.54)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(219, 106, 96, ${state.flash * 0.28})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.fade > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${state.fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawEndingPanel() {
  if (state.mode !== 'ending' || state.now < state.endingAt) return;
  ctx.fillStyle = 'rgba(4, 5, 6, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f0f3f6';
  ctx.textAlign = 'center';
  ctx.font = '700 34px Georgia, serif';
  ctx.fillText('수직 슬라이스 완료', W * 0.5, H * 0.4);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = 'rgba(232, 238, 244, 0.82)';
  ctx.fillText('배수로에서 검사실까지 5개의 장면을 이어 만든 프로토타입입니다.', W * 0.5, H * 0.49);
  ctx.fillText('다시 시작해 잔향 5개를 모을 수 있습니다.', W * 0.5, H * 0.55);
  ctx.textAlign = 'left';
}

function render() {
  drawBackground();
  drawSearchlights();
  drawScanner();
  drawProjector();
  drawWorldGeometry();
  drawCrowd();
  drawEchoOrb();
  drawProjectedEcho();
  drawPlayer();
  drawForeground();
  drawEndingPanel();
}

function stabilizeViewport() {
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  window.requestAnimationFrame(() => {
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  });
}

function preventBrowserGesture(event) {
  if (event?.cancelable) {
    event.preventDefault();
  }
  stabilizeViewport();
}

function installTouchZoomGuard() {
  if (!stageCard) return;

  const preventZoomGesture = (event) => {
    event.preventDefault();
  };

  const preventMultiTouchZoom = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  const preventDoubleTapZoom = (event) => {
    const now = performance.now();
    if (now - state.lastStageTouchAt < 280) {
      event.preventDefault();
    }
    state.lastStageTouchAt = now;
  };

  stageCard.addEventListener('touchstart', preventMultiTouchZoom, { passive: false });
  stageCard.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });
  stageCard.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
  document.addEventListener('gesturestart', preventZoomGesture, { passive: false });
  document.addEventListener('gesturechange', preventZoomGesture, { passive: false });
  document.addEventListener('gestureend', preventZoomGesture, { passive: false });
}

function isFullscreenActive() {
  return document.fullscreenElement === wrap;
}

function isPseudoFullscreenActive() {
  return document.body.classList.contains(PSEUDO_FULLSCREEN_CLASS);
}

function updateFullscreenButton() {
  const active = isFullscreenActive() || isPseudoFullscreenActive();
  btnFullscreen.setAttribute('aria-pressed', active ? 'true' : 'false');
  btnFullscreen.textContent = active ? '해제' : '전체';
}

function tryLockLandscape() {
  screen.orientation?.lock?.('landscape').catch(() => {});
}

function tryUnlockOrientation() {
  if (typeof screen.orientation?.unlock === 'function') {
    screen.orientation.unlock();
  }
}

async function toggleFullscreen() {
  if (!wrap) return;

  const shouldExit = isFullscreenActive() || isPseudoFullscreenActive();
  if (shouldExit) {
    if (isFullscreenActive() && typeof document.exitFullscreen === 'function') {
      try {
        await document.exitFullscreen();
      } catch (error) {
        document.body.classList.remove(PSEUDO_FULLSCREEN_CLASS);
      }
    } else {
      document.body.classList.remove(PSEUDO_FULLSCREEN_CLASS);
    }
    tryUnlockOrientation();
    stabilizeViewport();
    updateFullscreenButton();
    return;
  }

  const canUseNativeFullscreen = document.fullscreenEnabled && typeof wrap.requestFullscreen === 'function';
  if (canUseNativeFullscreen) {
    try {
      await wrap.requestFullscreen({ navigationUI: 'hide' });
    } catch (error) {
      document.body.classList.add(PSEUDO_FULLSCREEN_CLASS);
    }
  } else {
    document.body.classList.add(PSEUDO_FULLSCREEN_CLASS);
  }

  tryLockLandscape();
  stabilizeViewport();
  updateFullscreenButton();
}

function loop(timestamp) {
  if (!state.lastFrameAt) {
    state.lastFrameAt = timestamp;
  }

  const frameSeconds = Math.min(MAX_FRAME, Math.max(0, (timestamp - state.lastFrameAt) / 1000));
  state.lastFrameAt = timestamp;
  state.accumulator += frameSeconds;

  while (state.accumulator >= STEP) {
    update(STEP);
    state.accumulator -= STEP;
  }

  render();
  requestAnimationFrame(loop);
}

function setMoveAction(name, active) {
  input.hold[name] = active;
}

function pressJump() {
  input.jumpBuffer = JUMP_BUFFER;
}

function clearInputs() {
  input.hold.left = false;
  input.hold.right = false;
  input.jumpBuffer = 0;
}

btnStart.addEventListener('click', () => {
  startGame();
});

btnFullscreen.addEventListener('click', () => {
  audio.unlock();
  stabilizeViewport();
  toggleFullscreen();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
    event.preventDefault();
    setMoveAction('left', true);
  }
  if (event.code === 'ArrowRight' || event.code === 'KeyD') {
    event.preventDefault();
    setMoveAction('right', true);
  }
  if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') {
    event.preventDefault();
    audio.unlock();
    pressJump();
    if (state.mode === 'idle' || state.mode === 'ending') {
      startGame();
    }
  }
  if (event.code === 'KeyF') {
    event.preventDefault();
    toggleFullscreen();
  }
  if (event.code === 'Escape' && isPseudoFullscreenActive()) {
    document.body.classList.remove(PSEUDO_FULLSCREEN_CLASS);
    tryUnlockOrientation();
    stabilizeViewport();
    updateFullscreenButton();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
    setMoveAction('left', false);
  }
  if (event.code === 'ArrowRight' || event.code === 'KeyD') {
    setMoveAction('right', false);
  }
});

window.addEventListener('blur', clearInputs);
window.addEventListener('resize', stabilizeViewport);
window.addEventListener('orientationchange', stabilizeViewport);
window.visualViewport?.addEventListener('resize', stabilizeViewport);
window.addEventListener('scroll', stabilizeViewport, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInputs();
    state.lastFrameAt = performance.now();
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!isFullscreenActive()) {
    tryUnlockOrientation();
  }
  stabilizeViewport();
  updateFullscreenButton();
});

document.addEventListener('touchmove', (event) => {
  if (stageShell && event.target instanceof Node && stageShell.contains(event.target)) {
    event.preventDefault();
    stabilizeViewport();
  }
}, { passive: false });

for (const button of touchButtons) {
  const { action } = button.dataset;
  const activate = (event) => {
    preventBrowserGesture(event);
    audio.unlock();
    button.classList.add('is-on');
    if (action === 'jump') {
      pressJump();
      if (state.mode === 'idle' || state.mode === 'ending') {
        startGame();
      }
    } else {
      setMoveAction(action, true);
    }
  };

  const deactivate = (event) => {
    preventBrowserGesture(event);
    button.classList.remove('is-on');
    if (action !== 'jump') {
      setMoveAction(action, false);
    }
  };

  button.addEventListener('pointerdown', activate);
  button.addEventListener('pointerup', deactivate);
  button.addEventListener('pointercancel', deactivate);
  button.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') {
      deactivate(event);
    }
  });
}

stageCard.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    preventBrowserGesture(event);
  }
  if (state.mode === 'idle' || state.mode === 'ending') {
    audio.unlock();
    startGame();
  }
});

installTouchZoomGuard();
updateHud();
updateFullscreenButton();
showMessage('배수로', 1200);
requestAnimationFrame(loop);
