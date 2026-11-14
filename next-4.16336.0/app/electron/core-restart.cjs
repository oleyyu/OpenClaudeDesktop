// W14-code r5-shared-01 / r5-shared-02: a change the running core loads only when it starts (the DeepSeek core runs
// without HMR: harness codex-app-server plugins.js ChangeResult `application: 'restart-required'`; a connector added to
// the profile overlay, harness-profile.cjs mcp-add) is applied by restarting the core before the next new session, when
// nothing runs on it. 3.6556.2 says so with one toast and no restart control: shared-104-CTONUSaz.js WV readyInNewSession
// "{pluginName} is installed. Start a new session to use it." (NHsmCWvJf8), c76f00e40
// `m(nn(f, p ? "readyInNewSession" : "ready", {pluginName: t}))`; its Customize has no restart banner.
//
// The flag belongs to the core client that saw the change: a client that replaced it (any reconnect, a core switch)
// started with the change already, so the flag is gone with it. Does not import Electron: main.cjs supplies the client,
// the idle check and the restart (its Reconnect path), so the decision is unit-testable.

// Customize operations (customize-operations.cjs) whose ChangeResult can say restart-required.
const PLUGIN_CHANGE_OPERATIONS = new Set(["plugin-install", "plugin-set-enabled", "plugin-remove", "plugin-update", "plugin-mcp-server"]);

/** Whether a finished Customize plugin operation left a change the running core loads only after a restart. */
function changeNeedsRestart(operation, result) {
  return PLUGIN_CHANGE_OPERATIONS.has(operation) && !!result && typeof result === "object" && !result.error
    && result.application === "restart-required" && result.changed !== false;
}

/**
 * getClient(): the current core client. idle(client): resolves true when no session, workflow, goal, starting
 * operation or background command runs on it. restart(client): replaces it with a new client (main.cjs Reconnect).
 */
function createCoreRestart({ getClient, idle, restart }) {
  let owner = null, running = null;
  const pending = (client = getClient()) => !!client && owner === client;
  function mark(client = getClient()) { if (client) owner = client; }
  function noteCustomize(operation, result, client = getClient()) {
    if (changeNeedsRestart(operation, result)) mark(client);
    return result;
  }
  /** Before a thread/start: restart the core when a change waits for it and nothing runs; true when it restarted. */
  async function beforeNewSession() {
    if (running) return running;
    const client = getClient();
    if (!pending(client)) return false;
    running = (async () => {
      if (!(await idle(client)) || getClient() !== client || !pending(client)) return false;
      owner = null;
      await restart(client);
      return true;
    })();
    try { return await running; } finally { running = null; }
  }
  return { mark, noteCustomize, pending, beforeNewSession };
}

module.exports = { PLUGIN_CHANGE_OPERATIONS, changeNeedsRestart, createCoreRestart };
