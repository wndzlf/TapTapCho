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
const WORLD_W = 3560;
const FLOOR_Y = 470;
const PSEUDO_FULLSCREEN_CLASS = 'is-pseudo-fullscreen';

const GRAVITY = 2200;
const MOVE_ACCEL = 3200;
const MOVE_DRAG = 2600;
const MAX_SPEED = 230;
const JUMP_SPEED = 780;
const COYOTE_TIME = 0.12;
const JUMP_BUFFER = 0.12;
const FOOTSTEP_MIN_SPEED = 38;
const FOOTSTEP_SAMPLE_PATHS = Array.from(
  { length: 8 },
  (_, index) => `assets/audio/footsteps-metal/${index}.ogg`,
);

const CHAPTERS = [
  { minX: 0, label: '배수로' },
  { minX: 1160, label: '기숙동' },
  { minX: 2230, label: '공명실' },
];

const input = {
  hold: Object.create(null),
  jumpBuffer: 0,
};

const player = {
  x: 132,
  y: FLOOR_Y - 54,
  w: 26,
  h: 54,
  vx: 0,
  vy: 0,
  onGround: false,
  coyote: 0,
  facing: 1,
  checkpoint: { x: 132, y: FLOOR_Y - 54 },
  hiddenBlend: 0,
  groundSurface: 'concrete',
  stepTimer: 0,
};

const state = {
  mode: 'idle',
  chapter: '배수로',
  status: '대기',
  deaths: 0,
  echoes: 0,
  message: '',
  messageUntil: 0,
  flash: 0,
  fade: 1,
  fadeDir: -1,
  respawnAt: 0,
  endAt: 0,
  now: 0,
  lastFrameAt: 0,
  accumulator: 0,
  cameraX: 0,
  cameraTargetX: 0,
  sceneEnterAt: 0,
  lastStageTouchAt: 0,
  searchlightPrompted: false,
  searchlightHinted: false,
  scannerHinted: false,
};

const audio = (() => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let sampleLoadStarted = false;
  const sampleBanks = {
    metalSteps: [],
  };

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

  async function fetchAndDecode(path) {
    const ctxAudio = ensure();
    if (!ctxAudio) return null;
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load sample: ${path}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return ctxAudio.decodeAudioData(arrayBuffer);
  }

  function primeSampleBanks() {
    if (sampleLoadStarted) return;
    sampleLoadStarted = true;
    for (const path of FOOTSTEP_SAMPLE_PATHS) {
      fetchAndDecode(path)
        .then((buffer) => {
          if (buffer) {
            sampleBanks.metalSteps.push(buffer);
          }
        })
        .catch(() => {});
    }
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

  function noiseBurst({
    duration = 0.05,
    gain = 0.02,
    highpass = 360,
    lowpass = 1800,
  }) {
    const ctxAudio = ensure();
    if (!ctxAudio) return;
    const frames = Math.max(1, Math.floor(ctxAudio.sampleRate * duration));
    const buffer = ctxAudio.createBuffer(1, frames, ctxAudio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }

    const source = ctxAudio.createBufferSource();
    const hp = ctxAudio.createBiquadFilter();
    const lp = ctxAudio.createBiquadFilter();
    const amplifier = ctxAudio.createGain();
    const now = ctxAudio.currentTime;

    source.buffer = buffer;
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(highpass, now);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(lowpass, now);
    amplifier.gain.setValueAtTime(0.0001, now);
    amplifier.gain.linearRampToValueAtTime(gain, now + 0.004);
    amplifier.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(amplifier);
    amplifier.connect(ctxAudio.destination);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  function randomFrom(list) {
    if (!list.length) return null;
    return list[(Math.random() * list.length) | 0];
  }

  function playBuffer(buffer, { gain = 0.16, rate = 1 } = {}) {
    const ctxAudio = ensure();
    if (!ctxAudio || !buffer) return false;
    const source = ctxAudio.createBufferSource();
    const amplifier = ctxAudio.createGain();
    const now = ctxAudio.currentTime;
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(rate, now);
    amplifier.gain.setValueAtTime(gain, now);
    source.connect(amplifier);
    amplifier.connect(ctxAudio.destination);
    source.start(now);
    return true;
  }

  return {
    unlock() {
      ensure();
      primeSampleBanks();
    },
    jump() {
      tone({ freq: 210, end: 310, duration: 0.12, gain: 0.03, type: 'sine' });
    },
    land(surface = 'concrete') {
      if (surface === 'metal') {
        const played = playBuffer(randomFrom(sampleBanks.metalSteps), {
          gain: 0.1,
          rate: 0.84 + Math.random() * 0.08,
        });
        if (played) {
          tone({ freq: 104, end: 84, duration: 0.05, gain: 0.015, type: 'triangle' });
          return;
        }
      }
      tone({ freq: 120, end: 96, duration: 0.08, gain: 0.028, type: 'triangle' });
    },
    collect() {
      tone({ freq: 520, end: 760, duration: 0.14, gain: 0.035, type: 'triangle' });
    },
    alarm() {
      tone({ freq: 210, end: 150, duration: 0.18, gain: 0.042, type: 'sawtooth' });
      tone({ freq: 170, end: 130, duration: 0.18, gain: 0.03, delay: 0.06, type: 'square' });
    },
    switch() {
      tone({ freq: 300, end: 540, duration: 0.16, gain: 0.04, type: 'triangle' });
    },
    footstep(surface = 'concrete', intensity = 0.5) {
      if (surface === 'metal') {
        const played = playBuffer(randomFrom(sampleBanks.metalSteps), {
          gain: 0.12 + intensity * 0.05,
          rate: 0.94 + Math.random() * 0.14,
        });
        if (played) {
          return;
        }
        tone({ freq: 180, end: 132, duration: 0.06, gain: 0.018, type: 'triangle' });
        noiseBurst({ duration: 0.028, gain: 0.012, highpass: 640, lowpass: 2600 });
        return;
      }
      tone({ freq: 148, end: 120, duration: 0.05, gain: 0.012, type: 'triangle' });
      noiseBurst({ duration: 0.022, gain: 0.008, highpass: 220, lowpass: 1200 });
    },
    end() {
      tone({ freq: 180, end: 260, duration: 0.3, gain: 0.05, type: 'sine' });
      tone({ freq: 320, end: 420, duration: 0.28, gain: 0.03, delay: 0.08, type: 'triangle' });
    },
  };
})();

function rect(x, y, w, h, extras = null) {
  return extras ? { x, y, w, h, ...extras } : { x, y, w, h };
}

const world = {
  solids: [
    rect(-120, FLOOR_Y, 1360, 220),
    rect(376, 356, 174, 20),
    rect(1160, FLOOR_Y, 1120, 220, { surface: 'metal' }),
    rect(1490, 404, 420, 20, { surface: 'metal' }),
    rect(2230, FLOOR_Y, 1410, 220, { surface: 'metal' }),
    rect(2430, 390, 120, 18, { surface: 'metal' }),
    rect(2578, 332, 120, 18, { surface: 'metal' }),
    rect(2722, 274, 200, 18, { surface: 'metal' }),
    rect(3084, 274, 170, 18, { surface: 'metal' }),
  ],
  shelters: [
    rect(388, 356, 150, 114),
    rect(732, 356, 150, 114),
  ],
  searchlight: {
    active: true,
    minX: 614,
    maxX: 1018,
    x: 710,
    dir: 1,
    speed: 168,
    width: 130,
    height: 388,
  },
  crowd: {
    active: false,
    leadX: 1320,
    width: 254,
    speed: 48,
    pause: 0,
    holdX: 1606,
    holdDuration: 1.6,
    holdUsed: false,
    phase: 0,
    count: 7,
    baseY: FLOOR_Y - 54,
  },
  scanner: {
    left: 1668,
    right: 1760,
    top: 152,
    bottom: FLOOR_Y,
    flash: 0,
  },
  door: {
    x: 3300,
    y: 258,
    w: 42,
    h: 212,
    progress: 0,
    opening: false,
    opened: false,
  },
  chain: {
    x: 2868,
    y: 130,
    active: true,
  },
  echoes: [
    { x: 982, y: 420, found: false },
    { x: 3152, y: 224, found: false },
  ],
  checkpoints: [
    { x: 132, y: FLOOR_Y - 54 },
    { x: 1198, y: FLOOR_Y - 54 },
    { x: 2288, y: FLOOR_Y - 54 },
  ],
};

function showMessage(text, duration = 1600) {
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

function isActionHeld(name) {
  return !!input.hold[name];
}

function queueRange() {
  const first = world.crowd.leadX - world.crowd.width;
  const last = world.crowd.leadX;
  return { first, last };
}

function isPlayerSheltered() {
  return world.shelters.some((shelter) => overlap(player, shelter));
}

function isPlayerInCrowd() {
  if (!world.crowd.active) return false;
  const range = queueRange();
  return player.x + player.w * 0.5 > range.first + 14
    && player.x + player.w * 0.5 < range.last - 12
    && player.y + player.h > world.crowd.baseY + 32;
}

function updateHud() {
  hudChapter.textContent = state.chapter;
  hudDeaths.textContent = String(state.deaths);
  hudEchoes.textContent = `${state.echoes} / ${world.echoes.length}`;
  hudStatus.textContent = state.status;
}

function resetWorldState() {
  world.searchlight.x = 710;
  world.searchlight.dir = 1;
  world.crowd.active = false;
  world.crowd.leadX = 1320;
  world.crowd.pause = 0;
  world.crowd.holdUsed = false;
  world.crowd.phase = 0;
  world.scanner.flash = 0;
  world.door.progress = 0;
  world.door.opening = false;
  world.door.opened = false;
  world.chain.active = true;
  for (const echo of world.echoes) {
    echo.found = false;
  }
  state.echoes = 0;
}

function respawnPlayer() {
  player.x = player.checkpoint.x;
  player.y = player.checkpoint.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.coyote = 0;
  player.groundSurface = 'concrete';
  player.stepTimer = 0;
  input.jumpBuffer = 0;
  state.flash = 0;
  state.fade = 1;
  state.fadeDir = -1;
  state.status = '도주';
  state.mode = 'running';
  updateHud();
}

function startGame() {
  audio.unlock();
  resetWorldState();
  player.checkpoint = { x: 132, y: FLOOR_Y - 54 };
  player.hiddenBlend = 0;
  state.deaths = 0;
  state.chapter = '배수로';
  state.status = '도주';
  state.mode = 'running';
  state.flash = 0;
  state.fade = 1;
  state.fadeDir = -1;
  state.endAt = 0;
  state.sceneEnterAt = state.now;
  state.cameraX = 0;
  state.cameraTargetX = 0;
  state.searchlightPrompted = false;
  state.searchlightHinted = false;
  state.scannerHinted = false;
  showMessage('배수로', 1200);
  respawnPlayer();
}

function markCheckpoint() {
  for (let i = world.checkpoints.length - 1; i >= 0; i -= 1) {
    const checkpoint = world.checkpoints[i];
    if (player.x >= checkpoint.x) {
      player.checkpoint = { x: checkpoint.x, y: checkpoint.y };
      break;
    }
  }
}

function setChapterFromPlayer() {
  let nextChapter = CHAPTERS[0].label;
  for (let i = 0; i < CHAPTERS.length; i += 1) {
    if (player.x >= CHAPTERS[i].minX) {
      nextChapter = CHAPTERS[i].label;
    }
  }

  if (nextChapter !== state.chapter) {
    state.chapter = nextChapter;
    showMessage(nextChapter, 1300);
  }
}

function currentDoorSolid() {
  const currentY = lerp(world.door.y, world.door.y - world.door.h - 18, world.door.progress);
  if (world.door.progress >= 0.98) return null;
  return {
    x: world.door.x,
    y: currentY,
    w: world.door.w,
    h: world.door.h,
    surface: 'metal',
  };
}

function allSolids() {
  const solids = world.solids.slice();
  const doorSolid = currentDoorSolid();
  if (doorSolid) solids.push(doorSolid);
  return solids;
}

function resolveHorizontal(entity, solids) {
  entity.x += entity.vx * STEP;
  for (let i = 0; i < solids.length; i += 1) {
    const solid = solids[i];
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
  entity.groundSurface = null;

  for (let i = 0; i < solids.length; i += 1) {
    const solid = solids[i];
    if (!overlap(entity, solid)) continue;
    if (entity.vy > 0) {
      entity.y = solid.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
      entity.coyote = COYOTE_TIME;
      entity.groundSurface = solid.surface || 'concrete';
    } else if (entity.vy < 0) {
      entity.y = solid.y + solid.h;
      entity.vy = 0;
    }
  }

  if (entity.onGround && !wasGrounded) {
    audio.land(entity.groundSurface || 'concrete');
    entity.stepTimer = 0.08;
  }
}

function updateFootsteps() {
  if (!player.onGround || Math.abs(player.vx) < FOOTSTEP_MIN_SPEED) {
    player.stepTimer = 0;
    return;
  }

  const intensity = clamp(Math.abs(player.vx) / MAX_SPEED, 0, 1);
  const cadence = lerp(0.34, 0.19, intensity);
  player.stepTimer -= STEP;

  if (player.stepTimer <= 0) {
    audio.footstep(player.groundSurface || 'concrete', intensity);
    player.stepTimer = cadence;
  }
}

function triggerDeath(reason) {
  if (state.mode !== 'running') return;
  state.mode = 'respawn';
  state.status = reason;
  state.deaths += 1;
  state.flash = 1;
  state.fade = 0;
  state.fadeDir = 1;
  state.respawnAt = state.now + 900;
  world.scanner.flash = 0.7;
  audio.alarm();
  updateHud();

  if (reason === '탐조등' && !state.searchlightHinted) {
    state.searchlightHinted = true;
    showMessage('빛이 지나가면 다음 엄폐물로', 1500);
  } else if (reason === '스캐너' && !state.scannerHinted) {
    state.scannerHinted = true;
    showMessage('군중에 섞여 스캐너를 통과한다', 1500);
  }
}

function updateSearchlight(dt) {
  if (!world.searchlight.active) return;
  const beam = world.searchlight;
  beam.x += beam.dir * beam.speed * dt;
  if (beam.x <= beam.minX) {
    beam.x = beam.minX;
    beam.dir = 1;
  } else if (beam.x >= beam.maxX) {
    beam.x = beam.maxX;
    beam.dir = -1;
  }

  if (player.x > 548 && !state.searchlightPrompted) {
    state.searchlightPrompted = true;
    showMessage('빛이 비면 엄폐물 사이로', 1400);
  }

  const withinX = player.x + player.w * 0.5 > beam.x - beam.width * 0.5
    && player.x + player.w * 0.5 < beam.x + beam.width * 0.5;
  const withinZone = player.x > 600 && player.x < 1090;
  if (withinX && withinZone && !isPlayerSheltered()) {
    triggerDeath('탐조등');
  }
}

function syncPlayerWithCrowd() {
  if (!world.crowd.active || !player.onGround) return;

  const range = queueRange();
  const center = player.x + player.w * 0.5;
  const latchStart = range.first - 28;
  const latchEnd = range.last + 16;
  if (center < latchStart || center > latchEnd) return;
  if (player.y + player.h <= world.crowd.baseY + 32) return;

  const minCenter = range.first + 52;
  const maxCenter = range.last - 34;
  const syncedCenter = clamp(center, minCenter, maxCenter);
  player.x = syncedCenter - player.w * 0.5;

  const syncedSpeed = world.crowd.pause > 0 ? 0 : world.crowd.speed;
  player.vx = Math.min(player.vx, syncedSpeed + 18);
  if (world.crowd.pause > 0 && player.vx > 0) {
    player.vx = 0;
  }
}

function updateCrowd(dt) {
  if (player.x > 1260 && !world.crowd.active) {
    world.crowd.active = true;
    world.crowd.leadX = Math.max(world.crowd.leadX, 1450);
    showMessage('군중 뒤에 붙으면 함께 통과한다', 1500);
  }

  if (!world.crowd.active) return;

  const crowd = world.crowd;
  crowd.phase += dt * 4.2;

  if (crowd.pause > 0) {
    crowd.pause -= dt;
  } else {
    if (!crowd.holdUsed && crowd.leadX >= crowd.holdX) {
      crowd.leadX = crowd.holdX;
      crowd.pause = crowd.holdDuration;
      crowd.holdUsed = true;
      showMessage('줄이 멈췄다', 1100);
    } else {
      crowd.leadX += crowd.speed * dt;
    }

    if (crowd.leadX > 1910) {
      crowd.leadX = 1320;
      crowd.pause = 1.15;
      crowd.holdUsed = false;
    }
  }

  syncPlayerWithCrowd();

  const scanner = world.scanner;
  scanner.flash = Math.max(0, scanner.flash - dt * 2.6);

  const insideGate = player.x + player.w > scanner.left && player.x < scanner.right;
  if (insideGate && !isPlayerInCrowd()) {
    scanner.flash = 1;
    triggerDeath('스캐너');
  } else if (insideGate) {
    scanner.flash = Math.max(scanner.flash, 0.18);
  }
}

function updateDoor(dt) {
  if (world.door.opening) {
    world.door.progress = Math.min(1, world.door.progress + dt * 0.75);
    if (world.door.progress >= 1) {
      world.door.opening = false;
      world.door.opened = true;
      state.status = '하강';
      updateHud();
      showMessage('문이 열렸다', 1200);
    }
  }
}

function updateEchoes() {
  for (const echo of world.echoes) {
    if (echo.found) continue;
    const probe = { x: echo.x - 9, y: echo.y - 9, w: 18, h: 18 };
    if (overlap(player, probe)) {
      echo.found = true;
      state.echoes += 1;
      audio.collect();
      updateHud();
      showMessage('잔향', 900);
    }
  }
}

function updateChainInteraction() {
  if (!world.chain.active) return;
  const nearChain = Math.abs(player.x + player.w * 0.5 - world.chain.x) < 30
    && Math.abs(player.y + player.h * 0.5 - 248) < 68;
  if (nearChain && player.onGround) {
    world.chain.active = false;
    world.door.opening = true;
    input.jumpBuffer = 0;
    state.status = '공명';
    audio.switch();
    updateHud();
    showMessage('저주파가 울린다', 1200);
  }
}

function updatePlayer() {
  const move = (isActionHeld('left') ? -1 : 0) + (isActionHeld('right') ? 1 : 0);
  if (move !== 0) {
    player.vx += move * MOVE_ACCEL * STEP;
    player.facing = move;
  } else {
    const drag = MOVE_DRAG * STEP;
    if (Math.abs(player.vx) <= drag) player.vx = 0;
    else player.vx -= Math.sign(player.vx) * drag;
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

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > WORLD_W) player.x = WORLD_W - player.w;
  if (player.y > H + 260) {
    triggerDeath('추락');
  }

  const blendTarget = isPlayerInCrowd() ? 1 : 0;
  player.hiddenBlend = lerp(player.hiddenBlend, blendTarget, 0.12);
  updateFootsteps();
}

function updateSceneStatus() {
  if (state.mode !== 'running') return;

  if (player.x < 1080) {
    state.status = '도주';
  } else if (player.x < 2220) {
    state.status = isPlayerInCrowd() ? '동기화' : '잠입';
  } else if (!world.door.opened) {
    state.status = '상층 진입';
  } else {
    state.status = '하강';
  }

  if (player.x > 3406 && world.door.opened) {
    state.mode = 'ending';
    state.status = '침묵';
    state.endAt = state.now + 2800;
    state.fade = 0;
    state.fadeDir = 0;
    audio.end();
    showMessage('잔향동', 1800);
    updateHud();
  } else {
    updateHud();
  }
}

function updateCamera() {
  state.cameraTargetX = clamp(player.x - W * 0.38, 0, WORLD_W - W);
  state.cameraX = lerp(state.cameraX, state.cameraTargetX, 0.12);
}

function update(dt) {
  state.now += dt * 1000;
  clearMessage();

  if (state.fadeDir !== 0) {
    state.fade = clamp(state.fade + state.fadeDir * dt * 1.65, 0, 1);
    if (state.fade === 0 || state.fade === 1) {
      state.fadeDir = 0;
    }
  }

  state.flash = Math.max(0, state.flash - dt * 1.6);

  if (state.mode === 'idle') {
    updateCamera();
    return;
  }

  if (state.mode === 'respawn') {
    if (state.now >= state.respawnAt) {
      respawnPlayer();
    }
    return;
  }

  if (state.mode === 'ending') {
    if (state.now >= state.endAt) {
      state.status = '슬라이스 완료';
      updateHud();
    }
    return;
  }

  updateChainInteraction();
  updateSearchlight(dt);
  updateCrowd(dt);
  updateDoor(dt);
  updatePlayer();
  updateEchoes();
  markCheckpoint();
  setChapterFromPlayer();
  updateSceneStatus();
  updateCamera();
}

function drawBackground() {
  const cam = state.cameraX;

  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#121920');
  sky.addColorStop(0.4, '#0b0f13');
  sky.addColorStop(1, '#030405');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 5; i += 1) {
    const x = 120 + i * 260 - cam * 0.16;
    ctx.fillStyle = `rgba(35, 44, 55, ${0.16 - i * 0.02})`;
    ctx.fillRect(x, 122, 94, 270);
  }

  for (let i = 0; i < 8; i += 1) {
    const x = i * 180 - (cam * 0.32 % 180);
    ctx.fillStyle = 'rgba(186, 203, 220, 0.06)';
    ctx.fillRect(x, 0, 2, 240);
  }

  ctx.fillStyle = '#081015';
  ctx.fillRect(-cam, 350, 1220, 190);
  ctx.fillStyle = '#0d1318';
  ctx.fillRect(1160 - cam, 108, 1060, 432);
  ctx.fillStyle = '#0b1014';
  ctx.fillRect(2230 - cam, 60, 1320, 480);

  drawFacilityWindows();
  drawFloodedWall();
}

function drawFacilityWindows() {
  const cam = state.cameraX;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const x = 1238 + col * 112 - cam;
      const y = 160 + row * 92;
      ctx.fillStyle = 'rgba(197, 211, 224, 0.04)';
      ctx.fillRect(x, y, 52, 70);
      if (col < 6) {
        const headBob = Math.sin(state.now * 0.0017 + col * 0.8 + row) * 2;
        ctx.fillStyle = 'rgba(214, 224, 232, 0.1)';
        ctx.beginPath();
        ctx.arc(x + 26, y + 18 + headBob, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + 18, y + 28 + headBob, 16, 28);
      }
    }
  }
}

function drawFloodedWall() {
  const cam = state.cameraX;
  ctx.fillStyle = 'rgba(32, 44, 54, 0.65)';
  ctx.fillRect(2380 - cam, 330, 1000, 210);
  ctx.fillStyle = 'rgba(169, 188, 205, 0.05)';
  for (let i = 0; i < 10; i += 1) {
    const x = 2380 + i * 94 - cam;
    ctx.fillRect(x, 152, 56, 138);
    const eye = Math.sin(state.now * 0.0018 + i * 0.5) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(236, 242, 247, ${0.08 + eye * 0.07})`;
    ctx.beginPath();
    ctx.arc(x + 28, 202 + Math.sin(i) * 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(169, 188, 205, 0.05)';
  }
}

function drawSearchlight() {
  const cam = state.cameraX;
  const beam = world.searchlight;
  const beamX = beam.x - cam;
  const gradient = ctx.createLinearGradient(beamX, 0, beamX, beam.height);
  gradient.addColorStop(0, 'rgba(245, 246, 240, 0.2)');
  gradient.addColorStop(1, 'rgba(245, 246, 240, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(beamX - 26, 0);
  ctx.lineTo(beamX + 26, 0);
  ctx.lineTo(beamX + beam.width * 0.5, beam.height);
  ctx.lineTo(beamX - beam.width * 0.5, beam.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(228, 233, 238, 0.7)';
  ctx.fillRect(beamX - 10, 0, 20, 18);
}

function drawCrowd() {
  if (!world.crowd.active) return;
  const cam = state.cameraX;
  const { leadX, count, width, phase } = world.crowd;
  for (let i = 0; i < count; i += 1) {
    const x = leadX - i * (width / (count - 1)) - cam;
    const sway = Math.sin(phase * 2.6 + i * 0.7) * 1.8;
    ctx.fillStyle = 'rgba(210, 216, 223, 0.18)';
    ctx.beginPath();
    ctx.arc(x, world.crowd.baseY + 12 + sway, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 9, world.crowd.baseY + 22 + sway, 18, 34);
    ctx.fillRect(x - 7, world.crowd.baseY + 56 + sway, 4, 22);
    ctx.fillRect(x + 3, world.crowd.baseY + 56 + sway, 4, 22);
  }
}

function drawScanner() {
  const cam = state.cameraX;
  const { left, right, top, bottom, flash } = world.scanner;
  const pulse = Math.sin(state.now * 0.012) * 0.5 + 0.5;
  const alpha = 0.14 + pulse * 0.06 + flash * 0.4;
  ctx.fillStyle = `rgba(212, 95, 84, ${alpha})`;
  ctx.fillRect(left - cam, top, right - left, bottom - top);

  ctx.strokeStyle = `rgba(233, 208, 203, ${0.18 + flash * 0.45})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(left - cam, top, right - left, bottom - top);
  ctx.lineWidth = 1;
}

function drawWorldGeometry() {
  const cam = state.cameraX;
  ctx.fillStyle = '#11171c';
  for (const solid of world.solids) {
    ctx.fillRect(solid.x - cam, solid.y, solid.w, solid.h);
  }

  ctx.fillStyle = 'rgba(24, 31, 39, 0.22)';
  for (const shelter of world.shelters) {
    ctx.fillRect(shelter.x - cam, shelter.y, shelter.w, shelter.h);
  }

  ctx.fillStyle = 'rgba(17, 22, 28, 0.96)';
  for (const shelter of world.shelters) {
    ctx.fillRect(shelter.x - cam, shelter.y, 12, shelter.h);
    ctx.fillRect(shelter.x + shelter.w - 12 - cam, shelter.y, 12, shelter.h);
    ctx.fillRect(shelter.x - cam, shelter.y, shelter.w, 12);
  }

  const doorSolid = currentDoorSolid();
  if (doorSolid) {
    ctx.fillStyle = 'rgba(55, 63, 72, 0.98)';
    ctx.fillRect(doorSolid.x - cam, doorSolid.y, doorSolid.w, doorSolid.h);
  }

  const chainX = world.chain.x - cam;
  ctx.strokeStyle = 'rgba(192, 202, 212, 0.34)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(chainX, world.chain.y);
  ctx.lineTo(chainX, 264);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = world.chain.active ? 'rgba(216, 224, 232, 0.24)' : 'rgba(216, 224, 232, 0.08)';
  ctx.fillRect(chainX - 16, 264, 32, 8);
}

function drawEchoes() {
  const cam = state.cameraX;
  for (const echo of world.echoes) {
    if (echo.found) continue;
    const pulse = Math.sin(state.now * 0.008 + echo.x * 0.01) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(218, 228, 236, ${0.14 + pulse * 0.18})`;
    ctx.beginPath();
    ctx.arc(echo.x - cam, echo.y, 7 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const x = player.x - state.cameraX;
  const y = player.y;
  const blend = player.hiddenBlend;
  ctx.fillStyle = `rgba(${Math.round(214 - blend * 68)}, ${Math.round(220 - blend * 74)}, ${Math.round(226 - blend * 80)}, ${0.92 - blend * 0.36})`;
  ctx.beginPath();
  ctx.arc(x + player.w * 0.5, y + 12, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 5, y + 22, 16, 20);
  ctx.fillRect(x + 6, y + 42, 5, 12);
  ctx.fillRect(x + 15, y + 42, 5, 12);
  ctx.fillStyle = `rgba(230, 236, 241, ${0.18 - blend * 0.08})`;
  ctx.fillRect(x + 18, y + 28, 6, 10);
}

function drawForeground() {
  const cam = state.cameraX;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 110 - cam * 0.55) % (W + 100) - 50;
    ctx.fillRect(x, 404 + (i % 4) * 8, 34, 136);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }

  const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, 170, W * 0.5, H * 0.5, 560);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
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
  if (state.mode !== 'ending' || state.now < state.endAt) return;
  ctx.fillStyle = 'rgba(3, 4, 5, 0.74)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f0f3f6';
  ctx.textAlign = 'center';
  ctx.font = '700 34px Georgia, serif';
  ctx.fillText('수직 슬라이스 종료', W * 0.5, H * 0.42);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = 'rgba(232, 238, 244, 0.82)';
  ctx.fillText('도주, 잠입, 공명 퍼즐까지의 첫 프로토타입입니다.', W * 0.5, H * 0.51);
  ctx.fillText('다시 시작해 잔향 2개를 모두 모을 수 있습니다.', W * 0.5, H * 0.56);
  ctx.textAlign = 'left';
}

function render() {
  drawBackground();
  drawSearchlight();
  drawScanner();
  drawWorldGeometry();
  drawCrowd();
  drawEchoes();
  drawPlayer();
  drawForeground();
  drawEndingPanel();
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
    if (state.mode === 'idle') {
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
      if (state.mode === 'idle') {
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
  if (state.mode === 'idle') {
    audio.unlock();
    startGame();
  }
});

installTouchZoomGuard();
updateHud();
updateFullscreenButton();
showMessage('배수로', 1200);
requestAnimationFrame(loop);
