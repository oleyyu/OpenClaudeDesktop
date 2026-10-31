// The live preview behind the computer-use card (src/source-session-rail-computer-use.jsx; 2.42304.0 c21f11e6d P_ over
// c5f921d63 N, flag cowork_activity_panel_live_preview {fps: 1}). While a card subscribes and its session is using the
// computer (in-use.cjs), the window the session last looked at (service.lastTarget, a granted app's window) is captured
// every max(500, 1000 / fps) ms and sent as {kind: "computer-use-preview", sessionId, active, mode: "app", targetLabel,
// frame}. The app-scoped tools act in the background of one app, so the mode is the original's App ("Background ·
// {target}"); there is no full control (Display) mode here. A failed capture, no target, or the session leaving sends
// {active: false} once and the card falls back to the transcript's last screenshot, as the original's `frame ?? t`.
const FPS = 1;
const INTERVAL_MS = Math.max(500, 1000 / FPS);
const SCALE = 0.5;

/**
 * @param {{service: {lastTarget: Function, captureWindow: Function}, inUse: {sessions: () => string[], onChange: Function},
 *   emit: (event: object) => void, setTimer?: Function, clearTimer?: Function}} options
 */
function createPreview({ service, inUse, emit, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const subscribers = new Map(); // sessionId → count
  const loops = new Map();       // sessionId → { timer, active }
  const inUseNow = (sessionId) => inUse.sessions().includes(sessionId);

  function stop(sessionId) {
    const loop = loops.get(sessionId);
    if (!loop) return;
    loops.delete(sessionId);
    if (loop.timer) clearTimer(loop.timer);
    if (loop.active) emit({ kind: "computer-use-preview", sessionId, active: false });
  }
  async function tick(sessionId) {
    const loop = loops.get(sessionId);
    if (!loop) return;
    loop.timer = null;
    const target = service.lastTarget(sessionId);
    let frame = null;
    if (target) {
      try {
        frame = (await service.captureWindow(sessionId, { bundleId: target.bundleId, windowId: target.windowId, scale: SCALE }))?.dataUrl ?? null;
      } catch { frame = null; }
    }
    if (loops.get(sessionId) !== loop) return;
    if (frame) {
      loop.active = true;
      emit({ kind: "computer-use-preview", sessionId, active: true, mode: "app", targetLabel: target.name, frame });
    } else if (loop.active) {
      loop.active = false;
      emit({ kind: "computer-use-preview", sessionId, active: false });
    }
    loop.timer = setTimer(() => { void tick(sessionId); }, INTERVAL_MS);
  }
  function start(sessionId) {
    if (loops.has(sessionId) || !subscribers.get(sessionId) || !inUseNow(sessionId)) return;
    loops.set(sessionId, { timer: null, active: false });
    void tick(sessionId);
  }
  inUse.onChange((sessions) => {
    for (const sessionId of [...loops.keys()]) if (!sessions.includes(sessionId)) stop(sessionId);
    for (const sessionId of sessions) start(sessionId);
  });
  return {
    /** setSubscribed: a card counts while it is mounted and open; the last one leaving stops the captures. */
    subscribe(sessionId, on) {
      if (typeof sessionId !== "string" || !sessionId) return false;
      const count = Math.max(0, (subscribers.get(sessionId) ?? 0) + (on ? 1 : -1));
      if (count) subscribers.set(sessionId, count); else subscribers.delete(sessionId);
      if (count) start(sessionId); else stop(sessionId);
      return true;
    },
    dispose() { for (const sessionId of [...loops.keys()]) stop(sessionId); subscribers.clear(); },
  };
}

module.exports = { createPreview, INTERVAL_MS };
