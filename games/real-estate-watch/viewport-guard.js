(() => {
  const LOCKED_VIEWPORT_CONTENT =
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
  let lastTouchEndAt = 0;

  function syncViewportMeta() {
    let viewportMeta = document.querySelector('meta[name="viewport"]');

    if (!viewportMeta) {
      viewportMeta = document.createElement("meta");
      viewportMeta.setAttribute("name", "viewport");
      document.head.appendChild(viewportMeta);
    }

    viewportMeta.setAttribute("content", LOCKED_VIEWPORT_CONTENT);
  }

  function lockTouchBehavior() {
    document.documentElement.style.touchAction = "pan-x pan-y";
    document.documentElement.style.overscrollBehavior = "none";

    if (document.body) {
      document.body.style.touchAction = "pan-x pan-y";
      document.body.style.overscrollBehavior = "none";
    }
  }

  const preventZoomGesture = (event) => {
    event.preventDefault();
  };

  const preventMultiTouchZoom = (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  const preventRapidDoubleTapZoom = (event) => {
    const now = performance.now();
    const target = event.target;
    const isFormControl = Boolean(target?.closest?.("input, textarea, select"));

    if (!isFormControl && now - lastTouchEndAt < 320) {
      event.preventDefault();
    }

    lastTouchEndAt = now;
  };

  const preventCtrlWheelZoom = (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  };

  syncViewportMeta();
  lockTouchBehavior();

  document.addEventListener("DOMContentLoaded", () => {
    syncViewportMeta();
    lockTouchBehavior();
  }, { once: true });

  window.addEventListener("pageshow", () => {
    syncViewportMeta();
    lockTouchBehavior();
  });

  document.addEventListener("touchstart", preventMultiTouchZoom, { passive: false, capture: true });
  document.addEventListener("touchmove", preventMultiTouchZoom, { passive: false, capture: true });
  document.addEventListener("touchend", preventRapidDoubleTapZoom, { passive: false, capture: true });
  document.addEventListener("gesturestart", preventZoomGesture, { passive: false, capture: true });
  document.addEventListener("gesturechange", preventZoomGesture, { passive: false, capture: true });
  document.addEventListener("gestureend", preventZoomGesture, { passive: false, capture: true });
  document.addEventListener("dblclick", preventZoomGesture, { passive: false, capture: true });
  document.addEventListener("wheel", preventCtrlWheelZoom, { passive: false, capture: true });
})();
