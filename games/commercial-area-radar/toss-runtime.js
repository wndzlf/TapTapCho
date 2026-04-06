(() => {
  const SAFE_AREA_KEYS = ["top", "right", "bottom", "left"];
  const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
  const RUNTIME_CLASS = "commercial-area-radar-runtime";
  const EXIT_MODAL_ID = "runtime-exit-modal";

  function hasNativeBridge() {
    return Boolean(window.ReactNativeWebView) && Boolean(window.__GRANITE_NATIVE_EMITTER);
  }

  function randomId() {
    return Math.random().toString(36).slice(2);
  }

  function reviveBridgeError(payload) {
    if (!payload || !payload.__isError) {
      return payload;
    }

    const error = new Error(payload.message || "Bridge call failed");
    Object.assign(error, payload);
    return error;
  }

  function postBridgeMessage(message) {
    if (!hasNativeBridge()) {
      return false;
    }

    window.ReactNativeWebView.postMessage(JSON.stringify(message));
    return true;
  }

  function onNativeEvent(name, listener) {
    if (!hasNativeBridge()) {
      return () => {};
    }

    return window.__GRANITE_NATIVE_EMITTER.on(name, listener);
  }

  async function callAsyncBridge(method, args = [], fallback = false) {
    if (!hasNativeBridge()) {
      return fallback;
    }

    return new Promise((resolve, reject) => {
      const eventId = randomId();
      const cleanupCallbacks = [];
      const cleanup = () => {
        cleanupCallbacks.splice(0).forEach((unsubscribe) => {
          try {
            unsubscribe();
          } catch {
            // Ignore cleanup errors.
          }
        });
      };

      cleanupCallbacks.push(
        onNativeEvent(`${method}/resolve/${eventId}`, (payload) => {
          cleanup();
          resolve(payload);
        }),
        onNativeEvent(`${method}/reject/${eventId}`, (payload) => {
          cleanup();
          reject(reviveBridgeError(payload));
        }),
      );

      try {
        postBridgeMessage({
          type: "method",
          functionName: method,
          eventId,
          args,
        });
      } catch (error) {
        cleanup();
        reject(error);
      }
    }).catch((error) => {
      console.warn(`[commercial-area-radar/toss-runtime] ${method} failed`, error);
      return fallback;
    });
  }

  function getConstantBridgeValue(name, fallback) {
    const handler = window.__CONSTANT_HANDLER_MAP?.[name];
    if (typeof handler !== "function") {
      return fallback;
    }

    try {
      return handler();
    } catch (error) {
      console.warn(`[commercial-area-radar/toss-runtime] ${name} failed`, error);
      return fallback;
    }
  }

  function subscribeToBridge(method, listener) {
    if (!hasNativeBridge()) {
      return () => {};
    }

    const eventId = randomId();
    const unsubscribeEvent = onNativeEvent(`${method}/onEvent/${eventId}`, (payload) => {
      listener(payload);
    });
    const unsubscribeError = onNativeEvent(`${method}/onError/${eventId}`, (payload) => {
      console.warn(`[commercial-area-radar/toss-runtime] ${method} event failed`, reviveBridgeError(payload));
    });

    postBridgeMessage({
      type: "addEventListener",
      functionName: method,
      eventId,
    });

    return () => {
      postBridgeMessage({
        type: "removeEventListener",
        functionName: method,
        eventId,
      });
      unsubscribeEvent();
      unsubscribeError();
    };
  }

  function normalizeInsets(insets) {
    return SAFE_AREA_KEYS.reduce((accumulator, key) => {
      accumulator[key] = Math.max(0, Number(insets?.[key] || 0));
      return accumulator;
    }, {});
  }

  const toss = {
    isAvailable() {
      return hasNativeBridge();
    },

    async closeView() {
      return callAsyncBridge("closeView", [], false);
    },

    async setDeviceOrientation(type = "portrait") {
      return callAsyncBridge("setDeviceOrientation", [{ type }], false);
    },

    async setIosSwipeGestureEnabled(isEnabled) {
      return callAsyncBridge("setIosSwipeGestureEnabled", [{ isEnabled }], false);
    },

    safeArea: {
      async get() {
        return normalizeInsets(getConstantBridgeValue("getSafeAreaInsets", ZERO_INSETS));
      },

      subscribe(listener) {
        return subscribeToBridge("safeAreaInsetsChange", (payload) => {
          listener(normalizeInsets(payload));
        });
      },
    },

    events: {
      onBack(listener) {
        return subscribeToBridge("backEvent", listener);
      },

      onHome(listener) {
        return subscribeToBridge("homeEvent", listener);
      },
    },
  };

  window.CommercialAreaRadarToss = toss;

  let exitModal = null;
  let runtimeBadge = null;
  let runtimeExitButton = null;
  let unsubscribeSafeArea = () => {};
  let unsubscribeBack = () => {};
  let unsubscribeHome = () => {};

  function applySafeAreaInsets(insets) {
    const normalized = normalizeInsets(insets || ZERO_INSETS);
    document.documentElement.style.setProperty("--safe-top", `${normalized.top}px`);
    document.documentElement.style.setProperty("--safe-right", `${normalized.right}px`);
    document.documentElement.style.setProperty("--safe-bottom", `${normalized.bottom}px`);
    document.documentElement.style.setProperty("--safe-left", `${normalized.left}px`);
  }

  function updateRuntimeBadge() {
    if (!runtimeBadge) {
      return;
    }

    runtimeBadge.textContent = toss.isAvailable() ? "토스 연결" : "웹 미리보기";
    runtimeBadge.classList.toggle("is-live", toss.isAvailable());
    runtimeBadge.classList.toggle("is-preview", !toss.isAvailable());
  }

  function closeExitModal() {
    if (!exitModal) {
      return;
    }

    exitModal.hidden = true;
    document.body.classList.remove("runtime-modal-open");
  }

  function openExitModal() {
    if (!exitModal) {
      return;
    }

    exitModal.hidden = false;
    document.body.classList.add("runtime-modal-open");
  }

  async function confirmExit() {
    await toss.setIosSwipeGestureEnabled(true);

    const closedInToss = await toss.closeView();
    if (closedInToss !== false) {
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    closeExitModal();
  }

  function ensureRuntimeControls() {
    if (document.body.classList.contains(RUNTIME_CLASS)) {
      return;
    }

    document.body.classList.add(RUNTIME_CLASS);
    const hero = document.querySelector(".hero");

    if (hero && !hero.querySelector(".hero-controls")) {
      const controls = document.createElement("div");
      controls.className = "hero-controls";
      controls.innerHTML = `
        <span class="hero-runtime-badge" id="runtime-bridge-badge">연결 확인 중</span>
        <button class="hero-exit-button" id="runtime-exit-button" type="button">종료</button>
      `;
      hero.prepend(controls);
    }

    runtimeBadge = document.getElementById("runtime-bridge-badge");
    runtimeExitButton = document.getElementById("runtime-exit-button");

    if (!document.getElementById(EXIT_MODAL_ID)) {
      const modal = document.createElement("div");
      modal.className = "runtime-modal";
      modal.id = EXIT_MODAL_ID;
      modal.hidden = true;
      modal.innerHTML = `
        <button class="runtime-modal-backdrop" type="button" aria-label="종료 확인 닫기"></button>
        <section class="runtime-sheet" role="dialog" aria-modal="true" aria-labelledby="runtime-exit-title">
          <div class="runtime-sheet-kicker">종료 확인</div>
          <h2 class="runtime-sheet-title" id="runtime-exit-title">동네상권레이더를 종료할까요?</h2>
          <p class="runtime-sheet-copy">
            토스 앱에서는 현재 화면을 닫고, 웹 미리보기에서는 이전 화면으로 돌아갑니다.
          </p>
          <div class="runtime-sheet-actions">
            <button class="runtime-sheet-button" id="runtime-exit-cancel" type="button">계속 보기</button>
            <button class="runtime-sheet-button runtime-sheet-button-danger" id="runtime-exit-confirm" type="button">종료</button>
          </div>
        </section>
      `;
      document.body.append(modal);
    }

    exitModal = document.getElementById(EXIT_MODAL_ID);

    runtimeExitButton?.addEventListener("click", openExitModal);
    exitModal?.querySelector(".runtime-modal-backdrop")?.addEventListener("click", closeExitModal);
    document.getElementById("runtime-exit-cancel")?.addEventListener("click", closeExitModal);
    document.getElementById("runtime-exit-confirm")?.addEventListener("click", () => {
      void confirmExit();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && exitModal && !exitModal.hidden) {
        closeExitModal();
      }
    });

    updateRuntimeBadge();
  }

  async function initRuntime() {
    ensureRuntimeControls();
    updateRuntimeBadge();
    applySafeAreaInsets(ZERO_INSETS);

    await toss.setDeviceOrientation("portrait");
    await toss.setIosSwipeGestureEnabled(false);
    applySafeAreaInsets(await toss.safeArea.get());

    unsubscribeSafeArea = toss.safeArea.subscribe((insets) => {
      applySafeAreaInsets(insets);
    });

    unsubscribeBack = toss.events.onBack(() => {
      openExitModal();
    });

    unsubscribeHome = toss.events.onHome(() => {
      openExitModal();
    });
  }

  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        void initRuntime();
      }, { once: true });
      return;
    }

    void initRuntime();
  }

  window.addEventListener("pagehide", () => {
    unsubscribeSafeArea();
    unsubscribeBack();
    unsubscribeHome();
  });

  boot();
})();
