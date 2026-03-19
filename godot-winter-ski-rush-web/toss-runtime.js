(function () {
  const toss = window.WinterSkiRushToss || {
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
  };

  const STORAGE_PREFIX = 'winter-ski-rush';
  const LEGACY_SETTINGS_KEY = 'winter-ski-rush-settings';

  const state = {
    musicEnabled: true,
    sfxEnabled: true,
    userHash: null,
    pauseReasons: new Set(),
    hostPaused: false,
    unsubscribeSafeArea: () => {},
    unsubscribeBack: () => {},
    unsubscribeHome: () => {},
    bridgeReadyTimer: 0,
  };

  const host = window.WinterSkiRushGodotHost || {};
  host.nativeBridge = false;
  host.storageSuffix = 'browser';
  host.musicEnabled = true;
  host.sfxEnabled = true;
  host.dispatchToGodot = null;
  window.WinterSkiRushGodotHost = host;

  function $(id) {
    return document.getElementById(id);
  }

  const bridgeBadgeEl = $('bridgeBadge');
  const statusHintEl = $('statusHint');
  const canvasEl = $('canvas');
  const canvasStageEl = document.querySelector('.canvas-stage');
  const btnMusic = $('btnMusic');
  const btnSfx = $('btnSfx');
  const btnInfo = $('btnInfo');
  const btnExit = $('btnExit');
  const btnCloseInfo = $('btnCloseInfo');
  const btnCancelExit = $('btnCancelExit');
  const btnConfirmExit = $('btnConfirmExit');
  const infoModal = $('infoModal');
  const exitModal = $('exitModal');
  let resizeObserver = null;

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

  function sanitizeStorageSuffix(value) {
    const cleaned = String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);

    if (cleaned) {
      return cleaned;
    }

    return toss.isAvailable() ? 'toss_preview' : 'browser';
  }

  function getScopedStorageKey(name) {
    const scope = state.userHash ? `user:${state.userHash}` : 'browser';
    return `${STORAGE_PREFIX}:${scope}:${name}`;
  }

  function setButtonState(button, isActive, activeLabel, inactiveLabel) {
    button.dataset.active = isActive ? 'true' : 'false';
    button.setAttribute('aria-pressed', String(isActive));
    button.textContent = isActive ? activeLabel : inactiveLabel;
  }

  function updateAudioButtons() {
    setButtonState(btnMusic, state.musicEnabled, 'BGM 켜짐', 'BGM 꺼짐');
    setButtonState(btnSfx, state.sfxEnabled, '효과음 켜짐', '효과음 꺼짐');
  }

  function updateBridgeBadge(text, className) {
    bridgeBadgeEl.textContent = text;
    bridgeBadgeEl.className = `badge ${className}`;
  }

  function isHidden(element) {
    return element?.classList.contains('hidden');
  }

  function toggleBodyModalLock() {
    const modalOpen = !isHidden(infoModal) || !isHidden(exitModal);
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

  function updateStatusHint() {
    if (state.pauseReasons.has('background')) {
      statusHintEl.textContent = '토스 앱이 백그라운드로 전환되어 게임과 사운드가 자동으로 일시정지되었어요.';
      return;
    }

    if (!isHidden(infoModal)) {
      statusHintEl.textContent = '안내를 확인하는 동안 현재 런은 일시정지돼요.';
      return;
    }

    if (!isHidden(exitModal)) {
      statusHintEl.textContent = '종료를 확인하는 동안 게임이 잠시 멈춰 있어요.';
      return;
    }

    if (state.userHash) {
      statusHintEl.textContent = '최고 기록은 토스 게임 계정 기준으로 분리 저장되고, 사운드 설정도 같은 계정 범위로 유지돼요.';
      return;
    }

    if (toss.isAvailable()) {
      statusHintEl.textContent = '토스 브리지는 연결됐지만 게임 계정 키를 받지 못해 로컬 설정을 함께 사용하고 있어요.';
      return;
    }

    statusHintEl.textContent = '브라우저 미리보기에서도 토스용 전체 화면 레이아웃과 종료 흐름을 그대로 확인할 수 있어요.';
  }

  function syncCanvasResolution() {
    if (!canvasEl || !canvasStageEl) {
      return;
    }

    const rect = canvasStageEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 1);
    const targetWidth = Math.max(1, Math.round(rect.width * devicePixelRatio));
    const targetHeight = Math.max(1, Math.round(rect.height * devicePixelRatio));

    if (canvasEl.width === targetWidth && canvasEl.height === targetHeight) {
      return;
    }

    canvasEl.width = targetWidth;
    canvasEl.height = targetHeight;
    window.dispatchEvent(new Event('resize'));
  }

  function queueCanvasResolutionSync() {
    window.requestAnimationFrame(() => {
      syncCanvasResolution();
    });
  }

  function installCanvasResolutionSync() {
    syncCanvasResolution();
    queueCanvasResolutionSync();

    window.addEventListener('resize', queueCanvasResolutionSync);

    if ('ResizeObserver' in window && canvasStageEl) {
      resizeObserver = new ResizeObserver(() => {
        queueCanvasResolutionSync();
      });
      resizeObserver.observe(canvasStageEl);
    }
  }

  function applySafeAreaInsets(insets) {
    const next = insets || { top: 0, right: 0, bottom: 0, left: 0 };
    const root = document.documentElement;
    root.style.setProperty('--safe-top', `${Number(next.top || 0)}px`);
    root.style.setProperty('--safe-right', `${Number(next.right || 0)}px`);
    root.style.setProperty('--safe-bottom', `${Number(next.bottom || 0)}px`);
    root.style.setProperty('--safe-left', `${Number(next.left || 0)}px`);
  }

  function persistSettings() {
    const payload = JSON.stringify({
      musicEnabled: state.musicEnabled,
      sfxEnabled: state.sfxEnabled,
    });

    safeLocalStorageSet(getScopedStorageKey('settings'), payload);
  }

  function loadPersistedSettings() {
    const raw = safeLocalStorageGet(getScopedStorageKey('settings'))
      || safeLocalStorageGet(LEGACY_SETTINGS_KEY);

    if (!raw) {
      updateAudioButtons();
      persistSettings();
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      state.musicEnabled = parsed.musicEnabled !== false;
      state.sfxEnabled = parsed.sfxEnabled !== false;
    } catch (error) {
      state.musicEnabled = true;
      state.sfxEnabled = true;
    }

    updateAudioButtons();
    persistSettings();
  }

  function syncHostBootstrapState() {
    host.nativeBridge = toss.isAvailable();
    host.userHash = state.userHash;
    host.storageSuffix = sanitizeStorageSuffix(state.userHash);
    host.musicEnabled = state.musicEnabled;
    host.sfxEnabled = state.sfxEnabled;
  }

  function dispatchToGodot(action, extra = {}) {
    const callback = host.dispatchToGodot;
    if (typeof callback !== 'function') {
      return false;
    }

    callback({
      action,
      ...extra,
    });
    return true;
  }

  function syncPauseState() {
    const shouldPause = state.pauseReasons.size > 0;
    if (state.hostPaused === shouldPause) {
      updateStatusHint();
      return;
    }

    state.hostPaused = shouldPause;
    if (shouldPause) {
      dispatchToGodot('pause', { reason: Array.from(state.pauseReasons)[0] || 'modal' });
    } else {
      dispatchToGodot('resume');
    }
    updateStatusHint();
  }

  function setPauseReason(reason, isActive) {
    const hadReason = state.pauseReasons.has(reason);
    if (isActive && !hadReason) {
      state.pauseReasons.add(reason);
      syncPauseState();
      return;
    }

    if (!isActive && hadReason) {
      state.pauseReasons.delete(reason);
      syncPauseState();
      return;
    }

    updateStatusHint();
  }

  function openInfoModal() {
    showElement(infoModal);
    setPauseReason('info', true);
  }

  function closeInfoModal() {
    hideElement(infoModal);
    setPauseReason('info', false);
  }

  function openExitModal() {
    showElement(exitModal);
    setPauseReason('exit', true);
  }

  function closeExitModal() {
    hideElement(exitModal);
    setPauseReason('exit', false);
  }

  function setMusicEnabled(nextValue) {
    state.musicEnabled = Boolean(nextValue);
    syncHostBootstrapState();
    updateAudioButtons();
    persistSettings();
    dispatchToGodot('set_music', { value: state.musicEnabled });
    updateStatusHint();
  }

  function setSfxEnabled(nextValue) {
    state.sfxEnabled = Boolean(nextValue);
    syncHostBootstrapState();
    updateAudioButtons();
    persistSettings();
    dispatchToGodot('set_sfx', { value: state.sfxEnabled });
    updateStatusHint();
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

  function handleVisibilityChange() {
    setPauseReason('background', document.hidden);
  }

  function attachUiEvents() {
    btnMusic.addEventListener('click', () => {
      setMusicEnabled(!state.musicEnabled);
    });

    btnSfx.addEventListener('click', () => {
      setSfxEnabled(!state.sfxEnabled);
    });

    btnInfo.addEventListener('click', () => {
      openInfoModal();
    });

    btnCloseInfo.addEventListener('click', () => {
      closeInfoModal();
    });

    btnExit.addEventListener('click', () => {
      openExitModal();
    });

    btnCancelExit.addEventListener('click', () => {
      closeExitModal();
    });

    btnConfirmExit.addEventListener('click', () => {
      void leaveGame();
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', () => {
      setPauseReason('background', true);
    });
  }

  async function initTossShell() {
    updateBridgeBadge('웹 미리보기', 'badge-preview');
    applySafeAreaInsets(null);

    if (toss.isAvailable()) {
      try {
        applySafeAreaInsets(await toss.safeArea.get());
      } catch (error) {
        applySafeAreaInsets(null);
      }

      state.unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
        applySafeAreaInsets(insets);
        queueCanvasResolutionSync();
      });
    }

    await toss.setDeviceOrientation('portrait');
    await toss.setIosSwipeGestureEnabled(false);

    state.unsubscribeBack = toss.events.onBack(() => {
      handleBackRequest();
    });

    state.unsubscribeHome = toss.events.onHome(() => {
      setPauseReason('background', true);
    });

    const userKeyResult = await toss.getUserKeyForGame();
    if (userKeyResult && userKeyResult.type === 'HASH') {
      state.userHash = userKeyResult.hash;
      updateBridgeBadge('토스 게임 연동', 'badge-live');
    } else if (toss.isAvailable()) {
      updateBridgeBadge('토스 미리보기', 'badge-fallback');
    }

    loadPersistedSettings();
    syncHostBootstrapState();
    updateStatusHint();
    queueCanvasResolutionSync();
  }

  function setStatusMode(mode) {
    const statusOverlay = $('status');
    const statusProgress = $('status-progress');
    const statusNotice = $('status-notice');

    if (mode === 'hidden') {
      statusOverlay.remove();
      return;
    }

    statusOverlay.style.visibility = 'visible';
    statusProgress.style.display = mode === 'progress' ? 'block' : 'none';
    statusNotice.style.display = mode === 'notice' ? 'block' : 'none';
  }

  function setStatusNotice(text) {
    const statusNotice = $('status-notice');
    while (statusNotice.lastChild) {
      statusNotice.removeChild(statusNotice.lastChild);
    }

    text.split('\n').forEach((line) => {
      statusNotice.appendChild(document.createTextNode(line));
      statusNotice.appendChild(document.createElement('br'));
    });
  }

  function displayFailureNotice(error) {
    console.error(error);
    if (error instanceof Error) {
      setStatusNotice(error.message);
    } else if (typeof error === 'string') {
      setStatusNotice(error);
    } else {
      setStatusNotice('알 수 없는 오류가 발생했습니다.');
    }
    setStatusMode('notice');
  }

  function beginBridgeReadyPolling() {
    if (state.bridgeReadyTimer) {
      window.clearInterval(state.bridgeReadyTimer);
    }

    let attempts = 0;
    state.bridgeReadyTimer = window.setInterval(() => {
      attempts += 1;
      if (typeof host.dispatchToGodot === 'function') {
        dispatchToGodot('set_music', { value: state.musicEnabled });
        dispatchToGodot('set_sfx', { value: state.sfxEnabled });
        syncPauseState();
        window.clearInterval(state.bridgeReadyTimer);
        state.bridgeReadyTimer = 0;
        return;
      }

      if (attempts >= 80) {
        window.clearInterval(state.bridgeReadyTimer);
        state.bridgeReadyTimer = 0;
      }
    }, 250);
  }

  async function startEngine(engine, config, threadsEnabled) {
    const statusProgress = $('status-progress');
    const missing = Engine.getMissingFeatures({
      threads: threadsEnabled,
    });

    if (missing.length !== 0) {
      if (config.serviceWorker && config.ensureCrossOriginIsolationHeaders && 'serviceWorker' in navigator) {
        let serviceWorkerRegistrationPromise;
        try {
          serviceWorkerRegistrationPromise = navigator.serviceWorker.getRegistration();
        } catch (error) {
          serviceWorkerRegistrationPromise = Promise.reject(new Error('서비스 워커 등록에 실패했습니다.'));
        }

        Promise.race([
          serviceWorkerRegistrationPromise.then((registration) => {
            if (registration != null) {
              return Promise.reject(new Error('서비스 워커가 이미 등록되어 있습니다.'));
            }
            return registration;
          }).then(() => engine.installServiceWorker()),
          new Promise((resolve) => {
            window.setTimeout(() => resolve(), 2000);
          }),
        ]).then(() => {
          window.location.reload();
        }).catch((error) => {
          console.error('Error while registering service worker:', error);
        });
        return;
      }

      displayFailureNotice(
        `오류\n웹에서 게임을 실행하는 데 필요한 기능이 없습니다:\n${missing.join('\n')}`
      );
      return;
    }

    setStatusMode('progress');
    beginBridgeReadyPolling();

    try {
      await engine.startGame({
        onProgress(current, total) {
          if (current > 0 && total > 0) {
            statusProgress.value = current;
            statusProgress.max = total;
          } else {
            statusProgress.removeAttribute('value');
            statusProgress.removeAttribute('max');
          }
        },
      });
      setStatusMode('hidden');
    } catch (error) {
      displayFailureNotice(error);
    }
  }

  window.WinterSkiRushRuntime = {
    async boot(engine, config, threadsEnabled) {
      attachUiEvents();
      installCanvasResolutionSync();

      try {
        await initTossShell();
      } catch (error) {
        console.warn('[Winter Ski Rush Runtime] Toss shell init failed', error);
        loadPersistedSettings();
        syncHostBootstrapState();
        updateStatusHint();
      }

      await startEngine(engine, config, threadsEnabled);
    },
  };
}());
