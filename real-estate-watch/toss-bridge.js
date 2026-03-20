(() => {
  class NativeWindow {
    get _window() {
      if (typeof window !== "undefined") {
        return window;
      }

      return {
        ReactNativeWebView: {
          postMessage: () => {},
        },
        __GRANITE_NATIVE_EMITTER: {
          on: () => () => {},
        },
        __CONSTANT_HANDLER_MAP: {},
      };
    }

    postMessage(message) {
      const webView = this._window.ReactNativeWebView;
      if (!webView) {
        throw new Error("ReactNativeWebView is not available in browser environment");
      }
      webView.postMessage(JSON.stringify(message));
    }

    on(eventName, callback) {
      const emitter = this._window.__GRANITE_NATIVE_EMITTER;
      if (!emitter) {
        throw new Error("__GRANITE_NATIVE_EMITTER is not available");
      }
      return emitter.on(eventName, callback);
    }

    getConstant(name) {
      const constantHandlerMap = this._window.__CONSTANT_HANDLER_MAP;
      if (constantHandlerMap && name in constantHandlerMap) {
        return constantHandlerMap[name];
      }
      throw new Error(`${name} is not a constant handler`);
    }
  }

  const nativeWindow = new NativeWindow();
  const ADS_SDK_URL = "https://static.toss.im/ads/sdk/toss-ads-space-kit-1.3.0.js";
  const FEED_CARD_PADDING = "16px 20px";
  const LIST_CARD_PADDING = "20px";

  const openURLBridge = createAsyncBridge("openURL");
  const fetchTossAdBridge = createEventBridge("fetchTossAd");
  const fetchTossAdSupportedBridge = createConstantBridge("fetchTossAd_isSupported");
  const tossAdEventLogBridge = createAsyncBridge("tossAdEventLog");

  let adsSdkPromise = null;

  function createEventId() {
    return Math.random().toString(36).substring(2, 15);
  }

  function deserializeError(value) {
    if (value && value.__isError) {
      const error = new Error(value.message);
      Object.entries(value).forEach(([key, entryValue]) => {
        error[key] = entryValue;
      });
      return error;
    }
    return value;
  }

  function createAsyncBridge(method) {
    return (...args) => {
      const eventId = createEventId();
      const emitters = [];
      const unsubscribe = () => {
        emitters.forEach((remove) => remove());
      };

      return new Promise((resolve, reject) => {
        emitters.push(
          nativeWindow.on(`${method}/resolve/${eventId}`, (data) => {
            unsubscribe();
            resolve(data);
          })
        );

        emitters.push(
          nativeWindow.on(`${method}/reject/${eventId}`, (error) => {
            unsubscribe();
            reject(deserializeError(error));
          })
        );

        nativeWindow.postMessage({
          type: "method",
          functionName: method,
          eventId,
          args,
        });
      });
    };
  }

  function createEventBridge(method) {
    return ({ options, onEvent, onError }) => {
      const eventId = createEventId();
      const removes = [
        nativeWindow.on(`${method}/onEvent/${eventId}`, (data) => {
          onEvent(data);
        }),
        nativeWindow.on(`${method}/onError/${eventId}`, (error) => {
          onError(deserializeError(error));
        }),
      ];

      nativeWindow.postMessage({
        type: "addEventListener",
        functionName: method,
        eventId,
        args: options,
      });

      return () => {
        nativeWindow.postMessage({
          type: "removeEventListener",
          functionName: method,
          eventId,
        });
        removes.forEach((remove) => remove());
      };
    };
  }

  function createConstantBridge(method) {
    return () => nativeWindow.getConstant(method);
  }

  function hasNativeBridge() {
    return typeof window !== "undefined"
      && Boolean(window.ReactNativeWebView)
      && Boolean(window.__GRANITE_NATIVE_EMITTER);
  }

  function getAdsSdkGlobal() {
    if (typeof window === "undefined") {
      return null;
    }
    return window.TossAdsSpaceKit || null;
  }

  function logBridgeWarning(method, error) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(`[Real Estate Watch Toss Bridge] ${method} failed`, error);
    }
  }

  async function callAsyncBridge(method, bridgeCall, args = [], fallback = false) {
    if (!hasNativeBridge()) {
      return fallback;
    }

    try {
      return await bridgeCall(...args);
    } catch (error) {
      logBridgeWarning(method, error);
      return fallback;
    }
  }

  function callConstantBridge(method, bridgeCall, fallback = false) {
    if (!hasNativeBridge()) {
      return fallback;
    }

    try {
      return bridgeCall();
    } catch (error) {
      logBridgeWarning(method, error);
      return fallback;
    }
  }

  function subscribeToBridge(method, bridgeSubscribe, listener, options, errorListener) {
    if (!hasNativeBridge()) {
      return () => {};
    }

    try {
      return bridgeSubscribe({
        options,
        onEvent: (event) => {
          listener(event);
        },
        onError: (error) => {
          logBridgeWarning(method, error);
          errorListener?.(error);
        },
      });
    } catch (error) {
      logBridgeWarning(method, error);
      errorListener?.(error);
      return () => {};
    }
  }

  function normalizeExternalUrl(url) {
    if (typeof url !== "string") {
      return "";
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return `supertoss://web?url=${encodeURIComponent(url)}&external=true`;
    }

    return url;
  }

  async function openExternalUrl(url) {
    const normalizedUrl = normalizeExternalUrl(url);
    if (!normalizedUrl) {
      return false;
    }

    if (!hasNativeBridge()) {
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener");
        return true;
      }
      return false;
    }

    return callAsyncBridge("openURL", openURLBridge, [normalizedUrl], false);
  }

  function fetchTossAdSupported() {
    return hasNativeBridge()
      && callConstantBridge("fetchTossAd_isSupported", fetchTossAdSupportedBridge, false) === true;
  }

  function fetchTossAdOnce(options) {
    return new Promise((resolve, reject) => {
      if (fetchTossAdSupported() !== true) {
        reject(new Error("fetchTossAd is not supported in this environment."));
        return;
      }

      let settled = false;
      let cleanup = () => {};

      const finishResolve = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(value);
      };

      const finishReject = (error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      cleanup = subscribeToBridge(
        "fetchTossAd",
        fetchTossAdBridge,
        (event) => {
          finishResolve(event);
        },
        options,
        (error) => {
          finishReject(error);
        }
      );
    });
  }

  function normalizeFetchResult(payload) {
    const result = payload && typeof payload === "object" ? payload : {};

    if (result.resultType && result.resultType !== "SUCCESS") {
      return {
        resultType: "FAIL",
        error: result.error || { reason: "Unknown fetchTossAd error" },
      };
    }

    const successPayload = result.success && typeof result.success === "object"
      ? result.success
      : result;
    const supportedAds = Array.isArray(successPayload.ads)
      ? successPayload.ads.filter((ad) => ["1", "2"].includes(String(ad.styleId)))
      : [];

    if (!supportedAds.length) {
      return {
        resultType: "NO_FILL",
        error: {
          reason: successPayload.status || "No supported ad styles were returned.",
        },
      };
    }

    return {
      resultType: "SUCCESS",
      success: {
        requestId: successPayload.requestId || "",
        status: successPayload.status || "OK",
        ads: supportedAds,
        ext: successPayload.ext,
      },
    };
  }

  function createCustomAdFetcher() {
    return async (_request, context) => {
      try {
        const response = await fetchTossAdOnce({
          adGroupId: context.spaceUnitId,
          sdkId: "108",
          availableStyleIds: ["1", "2"],
        });
        return normalizeFetchResult(response);
      } catch (error) {
        return {
          resultType: "FAIL",
          error: {
            reason: error instanceof Error ? error.message : "Unknown fetchTossAd error",
          },
        };
      }
    };
  }

  function ensureAdsSdk() {
    if (typeof document === "undefined") {
      return Promise.reject(new Error("Ads SDK can only be loaded in a browser environment."));
    }

    const existingSdk = getAdsSdkGlobal();
    if (existingSdk) {
      return Promise.resolve(existingSdk);
    }

    if (adsSdkPromise) {
      return adsSdkPromise;
    }

    adsSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("Loading Toss Ads SDK timed out."));
      }, 15000);

      function cleanup() {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
        window.clearTimeout(timeoutId);
        adsSdkPromise = null;
      }

      function handleLoad() {
        const sdk = getAdsSdkGlobal();
        if (!sdk) {
          cleanup();
          reject(new Error("Toss Ads SDK loaded but window.TossAdsSpaceKit was not exposed."));
          return;
        }
        cleanup();
        resolve(sdk);
      }

      function handleError() {
        cleanup();
        reject(new Error(`Failed to load Toss Ads SDK from ${ADS_SDK_URL}.`));
      }

      script.async = true;
      script.src = ADS_SDK_URL;
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.head.appendChild(script);
    });

    return adsSdkPromise;
  }

  function ensureAttachStyle(documentRef) {
    if (!documentRef || documentRef.getElementById("real-estate-watch-toss-ad-style")) {
      return;
    }

    const style = documentRef.createElement("style");
    style.id = "real-estate-watch-toss-ad-style";
    style.textContent = `
      .rew-toss-ad-frame {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
      }

      .rew-toss-ad-surface {
        background: #ffffff;
      }

      .rew-toss-ad-surface.rew-toss-ad-tone-grey {
        background: #f2f4f7;
      }

      .rew-toss-ad-surface.rew-toss-ad-theme-light {
        background: #ffffff;
      }

      .rew-toss-ad-surface.rew-toss-ad-theme-light.rew-toss-ad-tone-grey {
        background: #f2f4f7;
      }

      .rew-toss-ad-surface.rew-toss-ad-theme-dark {
        background: #17171c;
      }

      .rew-toss-ad-surface.rew-toss-ad-theme-dark.rew-toss-ad-tone-grey {
        background: #101013;
      }
    `;

    const mountTarget = documentRef.head || documentRef.body || documentRef.documentElement;
    mountTarget?.appendChild(style);
  }

  function normalizeCallbackPayload(adGroupId, payload) {
    const event = payload && typeof payload === "object" ? { ...payload } : {};
    event.adGroupId = event.adGroupId || event.spaceId || adGroupId;
    delete event.spaceId;
    return event;
  }

  function trackAdImpression(requestId) {
    if (!requestId) {
      return;
    }

    void callAsyncBridge("tossAdEventLog", tossAdEventLogBridge, [{
      log_name: "display_ads_all::impression__1px_banner",
      log_type: "event",
      params: {
        event_type: "impression",
        schema_id: 1812034,
        request_id: requestId,
      },
    }], false);
  }

  function mapAttachCallbacks(adGroupId, callbacks) {
    if (!callbacks) {
      return undefined;
    }

    return {
      onAdRendered(event) {
        callbacks.onAdRendered?.(normalizeCallbackPayload(adGroupId, event));
      },
      onAdViewable(event) {
        callbacks.onAdViewable?.(normalizeCallbackPayload(adGroupId, event));
      },
      onAdClicked(event) {
        callbacks.onAdClicked?.(normalizeCallbackPayload(adGroupId, event));
      },
      onAdImpression(event) {
        const normalized = normalizeCallbackPayload(adGroupId, event);
        trackAdImpression(normalized.adMetadata?.requestId || "");
        callbacks.onAdImpression?.(normalized);
      },
      onAdFailedToRender(event) {
        callbacks.onAdFailedToRender?.({
          ...normalizeCallbackPayload(adGroupId, event),
          error: event?.error || { code: 0, message: "UNKNOWN" },
        });
      },
      onNoFill(event) {
        callbacks.onNoFill?.(normalizeCallbackPayload(adGroupId, event));
      },
    };
  }

  function getRenderPadding(styleId) {
    return String(styleId) === "1" ? FEED_CARD_PADDING : LIST_CARD_PADDING;
  }

  async function initializeAds({ onInitialized, onInitializationFailed } = {}) {
    if (fetchTossAdSupported() !== true) {
      const error = new Error("Toss ad slot is not supported in this environment.");
      onInitializationFailed?.(error);
      throw error;
    }

    try {
      const sdk = await ensureAdsSdk();
      if (typeof sdk.isInitialized === "function" && sdk.isInitialized() !== true) {
        await sdk.init({
          environment: "live",
          customAdFetcher: createCustomAdFetcher(),
          opener: openExternalUrl,
        });
      }
      onInitialized?.();
      return sdk;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      onInitializationFailed?.(normalizedError);
      throw normalizedError;
    }
  }

  function attachInlineBanner(adGroupId, target, {
    callbacks,
    theme = "light",
    tone = "grey",
    variant = "card",
  } = {}) {
    const sdk = getAdsSdkGlobal();
    if (!sdk || !sdk.banner) {
      throw new Error("Call ads.initialize() before attaching a Toss ad slot.");
    }

    const targetElement = typeof target === "string" ? document.querySelector(target) : target;
    if (!targetElement) {
      throw new Error(`Failed to find ad slot target: ${target}`);
    }

    ensureAttachStyle(targetElement.ownerDocument);

    const frame = document.createElement("div");
    frame.className = "rew-toss-ad-frame";

    const surface = document.createElement("div");
    surface.classList.add("rew-toss-ad-surface");

    if (tone === "grey") {
      surface.classList.add("rew-toss-ad-tone-grey");
    }

    if (theme === "light") {
      surface.classList.add("rew-toss-ad-theme-light");
    } else if (theme === "dark") {
      surface.classList.add("rew-toss-ad-theme-dark");
    }

    if (variant === "card") {
      frame.style.padding = "0 10px";
      surface.style.borderRadius = "16px";
      surface.style.overflow = "hidden";
    }

    frame.appendChild(surface);
    targetElement.innerHTML = "";
    targetElement.appendChild(frame);

    const slot = sdk.banner.createSlot(surface, {
      spaceId: adGroupId,
      autoLoad: true,
      theme: theme === "auto" ? undefined : theme,
      renderPadding: getRenderPadding,
      callbacks: mapAttachCallbacks(adGroupId, callbacks),
    });

    return {
      destroy() {
        slot?.destroy?.();
        if (frame.parentNode === targetElement) {
          targetElement.removeChild(frame);
        }
      },
    };
  }

  function destroyAllAds() {
    const sdk = getAdsSdkGlobal();
    sdk?.banner?.destroyAll?.();
  }

  window.RealEstateWatchToss = {
    isAvailable() {
      return hasNativeBridge();
    },
    ads: {
      isAvailable() {
        return fetchTossAdSupported();
      },
      initialize: initializeAds,
      attachInlineBanner,
      destroyAll: destroyAllAds,
    },
  };
})();
