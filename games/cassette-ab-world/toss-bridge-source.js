import {
  createAsyncBridge,
  createConstantBridge,
  createEventBridge,
} from '@apps-in-toss/bridge-core';

const closeViewBridge = createAsyncBridge('closeView');
const getUserKeyForGameBridge = createAsyncBridge('getUserKeyForGame');
const setDeviceOrientationBridge = createAsyncBridge('setDeviceOrientation');
const setIosSwipeGestureEnabledBridge = createAsyncBridge('setIosSwipeGestureEnabled');
const getStorageItemBridge = createAsyncBridge('getStorageItem');
const setStorageItemBridge = createAsyncBridge('setStorageItem');
const removeStorageItemBridge = createAsyncBridge('removeStorageItem');
const getSafeAreaInsetsBridge = createConstantBridge('getSafeAreaInsets');
const safeAreaInsetsChangeBridge = createEventBridge('safeAreaInsetsChange');
const backEventBridge = createEventBridge('backEvent');
const homeEventBridge = createEventBridge('homeEvent');
const loadAppsInTossAdMobBridge = createEventBridge('loadAppsInTossAdMob');
const showAppsInTossAdMobBridge = createEventBridge('showAppsInTossAdMob');
const isAppsInTossAdMobLoadedBridge = createAsyncBridge('isAppsInTossAdMobLoaded');
const loadAppsInTossAdMobSupportedBridge = createConstantBridge('loadAppsInTossAdMob_isSupported');
const showAppsInTossAdMobSupportedBridge = createConstantBridge('showAppsInTossAdMob_isSupported');
const isAppsInTossAdMobLoadedSupportedBridge = createConstantBridge('isAppsInTossAdMobLoaded_isSupported');

function hasNativeBridge() {
  return typeof window !== 'undefined'
    && Boolean(window.ReactNativeWebView)
    && Boolean(window.__GRANITE_NATIVE_EMITTER);
}

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

function safeLocalStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore preview storage failures.
  }
}

function logBridgeWarning(method, error) {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[Cassette A/B World Toss Bridge] ${method} failed`, error);
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

const storage = {
  async getItem(key) {
    const nativeValue = await callAsyncBridge('getStorageItem', getStorageItemBridge, [key], null);
    if (nativeValue !== null && nativeValue !== false) {
      return nativeValue;
    }
    return safeLocalStorageGet(key);
  },

  async setItem(key, value) {
    await callAsyncBridge('setStorageItem', setStorageItemBridge, [key, value], true);
    safeLocalStorageSet(key, value);
  },

  async removeItem(key) {
    await callAsyncBridge('removeStorageItem', removeStorageItemBridge, [key], true);
    safeLocalStorageRemove(key);
  },
};

const ads = {
  isAvailable() {
    return hasNativeBridge()
      && callConstantBridge('loadAppsInTossAdMob_isSupported', loadAppsInTossAdMobSupportedBridge, false) === true
      && callConstantBridge('showAppsInTossAdMob_isSupported', showAppsInTossAdMobSupportedBridge, false) === true;
  },

  async isLoaded(adGroupId) {
    if (
      !hasNativeBridge()
      || callConstantBridge(
        'isAppsInTossAdMobLoaded_isSupported',
        isAppsInTossAdMobLoadedSupportedBridge,
        false,
      ) !== true
    ) {
      return false;
    }

    return callAsyncBridge(
      'isAppsInTossAdMobLoaded',
      isAppsInTossAdMobLoadedBridge,
      [{ adGroupId }],
      false,
    );
  },

  load(adGroupId, { onEvent = () => {}, onError } = {}) {
    if (this.isAvailable() !== true) {
      return () => {};
    }

    return subscribeToBridge(
      'loadAppsInTossAdMob',
      loadAppsInTossAdMobBridge,
      onEvent,
      { adGroupId },
      onError,
    );
  },

  show(adGroupId, { onEvent = () => {}, onError } = {}) {
    if (this.isAvailable() !== true) {
      return () => {};
    }

    return subscribeToBridge(
      'showAppsInTossAdMob',
      showAppsInTossAdMobBridge,
      onEvent,
      { adGroupId },
      onError,
    );
  },
};

window.CassetteABWorldToss = {
  isAvailable() {
    return hasNativeBridge();
  },

  async closeView() {
    return callAsyncBridge('closeView', closeViewBridge, [], false);
  },

  async getUserKeyForGame() {
    return callAsyncBridge('getUserKeyForGame', getUserKeyForGameBridge, [], null);
  },

  async setDeviceOrientation(type = 'portrait') {
    return callAsyncBridge(
      'setDeviceOrientation',
      setDeviceOrientationBridge,
      [{ type }],
      false,
    );
  },

  async setIosSwipeGestureEnabled(isEnabled) {
    return callAsyncBridge(
      'setIosSwipeGestureEnabled',
      setIosSwipeGestureEnabledBridge,
      [{ isEnabled }],
      false,
    );
  },

  safeArea: {
    async get() {
      if (!hasNativeBridge()) {
        return { top: 0, right: 0, bottom: 0, left: 0 };
      }

      try {
        const insets = getSafeAreaInsetsBridge();
        return {
          top: Number(insets?.top || 0),
          right: Number(insets?.right || 0),
          bottom: Number(insets?.bottom || 0),
          left: Number(insets?.left || 0),
        };
      } catch (error) {
        logBridgeWarning('getSafeAreaInsets', error);
        return { top: 0, right: 0, bottom: 0, left: 0 };
      }
    },

    subscribe(listener) {
      return subscribeToBridge(
        'safeAreaInsetsChange',
        safeAreaInsetsChangeBridge,
        (insets) => {
          listener({
            top: Number(insets?.top || 0),
            right: Number(insets?.right || 0),
            bottom: Number(insets?.bottom || 0),
            left: Number(insets?.left || 0),
          });
        },
      );
    },
  },

  events: {
    onBack(listener) {
      return subscribeToBridge('backEvent', backEventBridge, listener);
    },

    onHome(listener) {
      return subscribeToBridge('homeEvent', homeEventBridge, listener);
    },
  },

  storage,
  ads,
};
