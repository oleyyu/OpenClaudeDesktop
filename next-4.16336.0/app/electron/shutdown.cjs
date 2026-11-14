/** Defer Electron's before-quit once while owned child processes stop.
 * Does not import Electron so the re-entry/deadline contract is unit-testable.
 * guard(event): runs before shutdown starts; true means it held this quit (quit-guard.cjs asks first while an agent
 * works) and nothing is stopped. onStart(): shutdown has begun (the quit is going ahead), called synchronously.
 */
function installShutdownHandler(app, { stop, timeoutMs = 3000, onError = () => {}, guard = null, onStart = () => {} } = {}) {
  if (typeof stop !== "function") throw new TypeError("shutdown stop must be a function");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new TypeError("shutdown timeout must be non-negative");
  let state = "idle", completion = null;
  const reportError = (error) => {
    try { onError(error); } catch { /* Reporting must not deadlock app shutdown. */ }
  };
  const beforeQuit = (event) => {
    if (state === "complete") return;
    if (state === "idle" && typeof guard === "function") {
      let held = false;
      try { held = guard(event) === true; } catch (error) { reportError(error); }
      if (held) return;
    }
    event.preventDefault();
    if (state === "waiting") return;
    state = "waiting";
    try { onStart(); } catch (error) { reportError(error); }
    completion = new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        state = "complete";
        resolve(result);
        app.quit();
      };
      const deadline = setTimeout(() => {
        const error = new Error(`Shutdown cleanup exceeded ${timeoutMs}ms.`);
        reportError(error);
        finish({ timedOut: true, error });
      }, timeoutMs);
      Promise.resolve().then(stop).then(
        (result) => finish({ timedOut: false, result }),
        (error) => { reportError(error); finish({ timedOut: false, error }); },
      );
    });
  };
  app.on("before-quit", beforeQuit);
  return {
    get state() { return state; },
    get completion() { return completion; },
    dispose() { app.removeListener("before-quit", beforeQuit); },
  };
}
module.exports = { installShutdownHandler };
