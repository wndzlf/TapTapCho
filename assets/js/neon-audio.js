(() => {
  const SETTINGS_KEY = 'taptapcho_neon_audio_v1';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { bgm: true, sfx: true, volume: 0.32 };
      const parsed = JSON.parse(raw);
      return {
        bgm: parsed.bgm !== false,
        sfx: parsed.sfx !== false,
        volume: Math.max(0.05, Math.min(0.8, Number(parsed.volume || 0.32)))
      };
    } catch (_) {
      return { bgm: true, sfx: true, volume: 0.32 };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {}
  }

  function buildButton(text, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.style.minWidth = '88px';
    btn.addEventListener('click', onClick);
    return btn;
  }

  window.TapTapNeonAudio = {
    create(gameId, hudEl) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      let ctx = null;
      let beatTimer = null;
      let beatStep = 0;
      const settings = loadSettings();

      const sequence = [220.0, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94];

      function ensureCtx() {
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      }

      function playTone(freq, duration, type, volume, attack) {
        const audioCtx = ensureCtx();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        osc.type = type || 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(volume, now + (attack || 0.01));
        env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(env);
        env.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.03);
      }

      function bgmTick() {
        if (!settings.bgm) return;
        const root = sequence[beatStep % sequence.length];
        playTone(root, 0.28, 'triangle', settings.volume * 0.18, 0.01);
        if (beatStep % 2 === 0) {
          playTone(root * 0.5, 0.22, 'sine', settings.volume * 0.12, 0.01);
        }
        if (beatStep % 4 === 2) {
          playTone(root * 2.0, 0.16, 'square', settings.volume * 0.05, 0.005);
        }
        beatStep += 1;
      }

      function startBgm() {
        if (!settings.bgm || beatTimer) return;
        ensureCtx();
        beatTimer = setInterval(bgmTick, 320);
      }

      function stopBgm() {
        if (!beatTimer) return;
        clearInterval(beatTimer);
        beatTimer = null;
      }

      function updateButtons() {
        if (bgmBtn) bgmBtn.textContent = settings.bgm ? 'BGM ON' : 'BGM OFF';
        if (sfxBtn) sfxBtn.textContent = settings.sfx ? 'SFX ON' : 'SFX OFF';
      }

      function persist() {
        saveSettings(settings);
        updateButtons();
      }

      function unlock() {
        ensureCtx();
        if (settings.bgm) startBgm();
      }

      function fx(kind) {
        if (!settings.sfx) return;
        if (kind === 'success') {
          playTone(660, 0.09, 'triangle', settings.volume * 0.25, 0.004);
          playTone(880, 0.12, 'triangle', settings.volume * 0.2, 0.004);
          return;
        }
        if (kind === 'fail') {
          playTone(220, 0.16, 'sawtooth', settings.volume * 0.2, 0.004);
          return;
        }
        if (kind === 'win') {
          playTone(523.25, 0.11, 'triangle', settings.volume * 0.24, 0.004);
          playTone(659.25, 0.13, 'triangle', settings.volume * 0.22, 0.004);
          playTone(783.99, 0.16, 'triangle', settings.volume * 0.2, 0.004);
          return;
        }
        playTone(440, 0.06, 'sine', settings.volume * 0.15, 0.003);
      }

      let bgmBtn = null;
      let sfxBtn = null;
      if (hudEl) {
        bgmBtn = buildButton(settings.bgm ? 'BGM ON' : 'BGM OFF', () => {
          unlock();
          settings.bgm = !settings.bgm;
          if (settings.bgm) startBgm();
          else stopBgm();
          persist();
        });
        sfxBtn = buildButton(settings.sfx ? 'SFX ON' : 'SFX OFF', () => {
          unlock();
          settings.sfx = !settings.sfx;
          fx('ui');
          persist();
        });
        hudEl.appendChild(bgmBtn);
        hudEl.appendChild(sfxBtn);
      }

      const unlockOnce = () => {
        unlock();
        window.removeEventListener('pointerdown', unlockOnce);
        window.removeEventListener('keydown', unlockOnce);
      };
      window.addEventListener('pointerdown', unlockOnce, { passive: true });
      window.addEventListener('keydown', unlockOnce);

      return {
        id: gameId,
        unlock,
        fx,
        setVolume(v) {
          settings.volume = Math.max(0.05, Math.min(0.8, Number(v || 0.32)));
          persist();
        },
        destroy() {
          stopBgm();
        }
      };
    }
  };
})();
