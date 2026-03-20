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
    console.warn(`[Sunken Defense Toss Bridge] ${method} failed`, error);
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

function subscribeToBridge(method, bridgeSubscribe, listener, options) {
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
      },
    });
  } catch (error) {
    logBridgeWarning(method, error);
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

window.SunkenDefenseToss = {
  isAvailable() {
    return hasNativeBridge();
  },

  async closeView() {
    return callAsyncBridge('closeView', closeViewBridge, [], false);
  },

  async getUserKeyForGame() {
    return callAsyncBridge('getUserKeyForGame', getUserKeyForGameBridge, [], null);
  },

  async setDeviceOrientation(type = 'landscape') {
    return callAsyncBridge(
      'setDeviceOrientation',
      setDeviceOrientationBridge,
      [{ type }],
      false
    );
  },

  async setIosSwipeGestureEnabled(isEnabled) {
    return callAsyncBridge(
      'setIosSwipeGestureEnabled',
      setIosSwipeGestureEnabledBridge,
      [{ isEnabled }],
      false
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
        }
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
};
