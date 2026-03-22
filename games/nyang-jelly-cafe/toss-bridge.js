(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/@apps-in-toss/bridge-core/dist/index.js
  function createAsyncBridge(method) {
    return (...args) => {
      const eventId = createEventId();
      const emitters = [];
      const unsubscribe = () => {
        for (const remove of emitters) {
          remove();
        }
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
          args
        });
      });
    };
  }
  function createEventBridge(method) {
    return (args) => {
      const eventId = createEventId();
      const removes = [
        nativeWindow.on(`${method}/onEvent/${eventId}`, (data) => {
          args.onEvent(data);
        }),
        nativeWindow.on(`${method}/onError/${eventId}`, (error) => {
          args.onError(deserializeError(error));
        })
      ];
      nativeWindow.postMessage({
        type: "addEventListener",
        functionName: method,
        eventId,
        args: args.options
      });
      return () => {
        nativeWindow.postMessage({
          type: "removeEventListener",
          functionName: method,
          eventId
        });
        removes.forEach((remove) => remove());
      };
    };
  }
  function createConstantBridge(method) {
    return () => {
      return nativeWindow.getConstant(method);
    };
  }
  var NativeWindow, nativeWindow, createEventId, deserializeError;
  var init_dist = __esm({
    "node_modules/@apps-in-toss/bridge-core/dist/index.js"() {
      NativeWindow = class {
        get _window() {
          if (typeof window !== "undefined") {
            return window;
          }
          return {
            ReactNativeWebView: {
              postMessage: () => {
              }
            },
            __GRANITE_NATIVE_EMITTER: {
              on: () => () => {
              }
            },
            __CONSTANT_HANDLER_MAP: {}
          };
        }
        postMessage(message) {
          const webView = this._window.ReactNativeWebView;
          if (!webView) {
            throw new Error("ReactNativeWebView is not available in browser environment");
          }
          webView.postMessage(JSON.stringify(message));
        }
        on(event, callback) {
          const emitter = this._window.__GRANITE_NATIVE_EMITTER;
          if (!emitter) {
            throw new Error("__GRANITE_NATIVE_EMITTER is not available");
          }
          return emitter.on(event, callback);
        }
        getConstant(method) {
          const constantHandlerMap = this._window.__CONSTANT_HANDLER_MAP;
          if (constantHandlerMap && method in constantHandlerMap) {
            return constantHandlerMap[method];
          }
          throw new Error(`${method} is not a constant handler`);
        }
      };
      nativeWindow = new NativeWindow();
      createEventId = () => Math.random().toString(36).substring(2, 15);
      deserializeError = (value) => {
        if (value && value.__isError) {
          const err = new Error(value.message);
          for (const [key, val] of Object.entries(value)) {
            err[key] = val;
          }
          return err;
        }
        return value;
      };
    }
  });

  // games/nyang-jelly-cafe/toss-bridge-source.js
  var require_toss_bridge_source = __commonJS({
    "games/nyang-jelly-cafe/toss-bridge-source.js"() {
      init_dist();
      var closeViewBridge = createAsyncBridge("closeView");
      var getUserKeyForGameBridge = createAsyncBridge("getUserKeyForGame");
      var setDeviceOrientationBridge = createAsyncBridge("setDeviceOrientation");
      var setIosSwipeGestureEnabledBridge = createAsyncBridge("setIosSwipeGestureEnabled");
      var getStorageItemBridge = createAsyncBridge("getStorageItem");
      var setStorageItemBridge = createAsyncBridge("setStorageItem");
      var removeStorageItemBridge = createAsyncBridge("removeStorageItem");
      var getSafeAreaInsetsBridge = createConstantBridge("getSafeAreaInsets");
      var safeAreaInsetsChangeBridge = createEventBridge("safeAreaInsetsChange");
      var backEventBridge = createEventBridge("backEvent");
      var homeEventBridge = createEventBridge("homeEvent");
      function hasNativeBridge() {
        return typeof window !== "undefined" && Boolean(window.ReactNativeWebView) && Boolean(window.__GRANITE_NATIVE_EMITTER);
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
        }
      }
      function safeLocalStorageRemove(key) {
        try {
          window.localStorage.removeItem(key);
        } catch (error) {
        }
      }
      function logBridgeWarning(method, error) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(`[Nyang Jelly Cafe Toss Bridge] ${method} failed`, error);
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
          return () => {
          };
        }
        try {
          return bridgeSubscribe({
            options,
            onEvent: (event) => {
              listener(event);
            },
            onError: (error) => {
              logBridgeWarning(method, error);
            }
          });
        } catch (error) {
          logBridgeWarning(method, error);
          return () => {
          };
        }
      }
      var storage = {
        async getItem(key) {
          const nativeValue = await callAsyncBridge("getStorageItem", getStorageItemBridge, [key], null);
          if (nativeValue !== null && nativeValue !== false) {
            return nativeValue;
          }
          return safeLocalStorageGet(key);
        },
        async setItem(key, value) {
          await callAsyncBridge("setStorageItem", setStorageItemBridge, [key, value], true);
          safeLocalStorageSet(key, value);
        },
        async removeItem(key) {
          await callAsyncBridge("removeStorageItem", removeStorageItemBridge, [key], true);
          safeLocalStorageRemove(key);
        }
      };
      window.NyangJellyCafeToss = {
        isAvailable() {
          return hasNativeBridge();
        },
        async closeView() {
          return callAsyncBridge("closeView", closeViewBridge, [], false);
        },
        async getUserKeyForGame() {
          return callAsyncBridge("getUserKeyForGame", getUserKeyForGameBridge, [], null);
        },
        async setDeviceOrientation(type = "portrait") {
          return callAsyncBridge(
            "setDeviceOrientation",
            setDeviceOrientationBridge,
            [{ type }],
            false
          );
        },
        async setIosSwipeGestureEnabled(isEnabled) {
          return callAsyncBridge(
            "setIosSwipeGestureEnabled",
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
                top: Number((insets == null ? void 0 : insets.top) || 0),
                right: Number((insets == null ? void 0 : insets.right) || 0),
                bottom: Number((insets == null ? void 0 : insets.bottom) || 0),
                left: Number((insets == null ? void 0 : insets.left) || 0)
              };
            } catch (error) {
              logBridgeWarning("getSafeAreaInsets", error);
              return { top: 0, right: 0, bottom: 0, left: 0 };
            }
          },
          subscribe(listener) {
            return subscribeToBridge(
              "safeAreaInsetsChange",
              safeAreaInsetsChangeBridge,
              (insets) => {
                listener({
                  top: Number((insets == null ? void 0 : insets.top) || 0),
                  right: Number((insets == null ? void 0 : insets.right) || 0),
                  bottom: Number((insets == null ? void 0 : insets.bottom) || 0),
                  left: Number((insets == null ? void 0 : insets.left) || 0)
                });
              }
            );
          }
        },
        events: {
          onBack(listener) {
            return subscribeToBridge("backEvent", backEventBridge, listener);
          },
          onHome(listener) {
            return subscribeToBridge("homeEvent", homeEventBridge, listener);
          }
        },
        storage
      };
    }
  });
  require_toss_bridge_source();
})();
