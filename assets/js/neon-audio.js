(() => {
  const SETTINGS_KEY = 'taptapcho_neon_audio_v1';
  const THEMES = [
    { id: 'pulse', label: 'Pulse', stepMs: 320, lead: 'triangle', bass: 'sine', spark: 'square', seq: [220, 247, 262, 294, 330, 294, 262, 247] },
    { id: 'arcade', label: 'Arcade', stepMs: 300, lead: 'square', bass: 'triangle', spark: 'sawtooth', seq: [196, 220, 247, 262, 247, 220, 196, 175] },
    { id: 'drift', label: 'Drift', stepMs: 360, lead: 'sine', bass: 'triangle', spark: 'triangle', seq: [174, 196, 220, 247, 262, 247, 220, 196] },
    { id: 'neon', label: 'Neon', stepMs: 280, lead: 'triangle', bass: 'sine', spark: 'square', seq: [262, 294, 330, 349, 392, 349, 330, 294] },
    { id: 'mystic', label: 'Mystic', stepMs: 340, lead: 'sine', bass: 'sawtooth', spark: 'triangle', seq: [165, 185, 220, 247, 220, 185, 165, 147] },
    { id: 'rush', label: 'Rush', stepMs: 250, lead: 'square', bass: 'triangle', spark: 'square', seq: [247, 262, 294, 330, 349, 330, 294, 262] }
  ];

  const THEME_BY_ID = Object.fromEntries(THEMES.map((theme) => [theme.id, theme]));

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { bgm: true, sfx: true, volume: 0.32, themes: {} };
      const parsed = JSON.parse(raw);
      return {
        bgm: parsed.bgm !== false,
        sfx: parsed.sfx !== false,
        volume: Math.max(0.05, Math.min(0.8, Number(parsed.volume || 0.32))),
        themes: parsed.themes && typeof parsed.themes === 'object' ? parsed.themes : {}
      };
    } catch (_) {
      return { bgm: true, sfx: true, volume: 0.32, themes: {} };
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
    create(gameId, hudEl, options = {}) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      let ctx = null;
      let beatTimer = null;
      let beatStep = 0;
      const settings = loadSettings();
      const showSfxToggle = options.showSfxToggle !== false;
      const showThemeToggle = options.showThemeToggle !== false;

      function pickDefaultTheme() {
        if (options.theme && THEME_BY_ID[options.theme]) return options.theme;
        if (settings.themes && settings.themes[gameId] && THEME_BY_ID[settings.themes[gameId]]) {
          return settings.themes[gameId];
        }
        let hash = 0;
        for (let i = 0; i < String(gameId).length; i++) {
          hash = (hash * 31 + gameId.charCodeAt(i)) >>> 0;
        }
        return THEMES[hash % THEMES.length].id;
      }

      let themeId = pickDefaultTheme();

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
        const theme = THEME_BY_ID[themeId] || THEMES[0];
        const root = theme.seq[beatStep % theme.seq.length];
        playTone(root, 0.24, theme.lead, settings.volume * 0.17, 0.01);
        if (beatStep % 2 === 0) {
          playTone(root * 0.5, 0.2, theme.bass, settings.volume * 0.12, 0.01);
        }
        if (beatStep % 4 === 1 || beatStep % 4 === 3) {
          playTone(root * 2.0, 0.12, theme.spark, settings.volume * 0.05, 0.004);
        }
        beatStep += 1;
      }

      function startBgm() {
        if (!settings.bgm || beatTimer) return;
        ensureCtx();
        const theme = THEME_BY_ID[themeId] || THEMES[0];
        beatTimer = setInterval(bgmTick, theme.stepMs || 320);
      }

      function stopBgm() {
        if (!beatTimer) return;
        clearInterval(beatTimer);
        beatTimer = null;
      }

      function updateButtons() {
        if (bgmBtn) bgmBtn.textContent = settings.bgm ? 'BGM ON' : 'BGM OFF';
        if (sfxBtn) sfxBtn.textContent = settings.sfx ? 'SFX ON' : 'SFX OFF';
        if (themeBtn) {
          const theme = THEME_BY_ID[themeId] || THEMES[0];
          themeBtn.textContent = `TRACK ${theme.label}`;
        }
      }

      function persist() {
        settings.themes = settings.themes || {};
        settings.themes[gameId] = themeId;
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
      let themeBtn = null;
      if (hudEl) {
        bgmBtn = buildButton(settings.bgm ? 'BGM ON' : 'BGM OFF', () => {
          unlock();
          settings.bgm = !settings.bgm;
          if (settings.bgm) startBgm();
          else stopBgm();
          persist();
        });
        if (showSfxToggle) {
          sfxBtn = buildButton(settings.sfx ? 'SFX ON' : 'SFX OFF', () => {
            unlock();
            settings.sfx = !settings.sfx;
            fx('ui');
            persist();
          });
        }
        if (showThemeToggle) {
          themeBtn = buildButton('', () => {
            unlock();
            const idx = THEMES.findIndex((t) => t.id === themeId);
            const next = THEMES[(idx + 1) % THEMES.length];
            themeId = next.id;
            stopBgm();
            if (settings.bgm) startBgm();
            fx('ui');
            persist();
          });
        }
        hudEl.appendChild(bgmBtn);
        if (themeBtn) hudEl.appendChild(themeBtn);
        if (sfxBtn) hudEl.appendChild(sfxBtn);
        updateButtons();
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
        setTheme(nextThemeId) {
          if (!THEME_BY_ID[nextThemeId]) return;
          themeId = nextThemeId;
          stopBgm();
          if (settings.bgm) startBgm();
          persist();
        },
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
