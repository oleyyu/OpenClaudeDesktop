// Quitting while an agent works (3.6556.2 index.chunk-jPKPzV-P.js updater guard e5t / c5t, counts W8t / U8t / G8t, wait
// J8t): when any session has a running turn, a running workflow or live background commands, the first quit shows a
// warning box. With agent work it is "DeepSeek is still working" (the running core's assistant) with Quit anyway, Wait
// for DeepSeek (the default: the app quits by itself once that work ends) and Cancel; with background commands only it
// is "Background commands are still running" with Quit anyway and Cancel (no Wait, cancelId 1). The detail is one
// paragraph per kind, joined by a blank line; Wait waits for the turns, not for background commands that were already
// running when the box opened. Quit anyway, or the wait finishing, quits without asking again.
// Does not import Electron so the decision flow is unit-testable; main.cjs feeds it the core's events.

const parentOf = (thread) => thread?.parentThreadId || thread?.source?.subAgent?.thread_spawn?.parent_thread_id || null;

/**
 * The sessions with live work, from the events main.cjs receives: turn/started … turn/completed per thread (a sub-agent
 * thread counts for the session that spawned it) and workflow runs while their status is running. Every core speaks
 * these notifications, so this needs no capability.
 */
function createLiveWork({ getConfig }) {
  const active = new Map(), parents = new Map(), workflows = new Map(), touched = new Set(), listeners = new Set();
  const changed = () => { for (const listener of [...listeners]) { try { listener(); } catch {} } };
  const threadIds = () => new Set(Array.isArray(getConfig()?.threadIds) ? getConfig().threadIds : []);
  // The sidebar session a thread belongs to: itself, or the nearest ancestor that is one (sub-agents nest).
  const ownerOf = (id, sessions) => {
    for (let current = id, depth = 0; current && depth < 8; current = parents.get(current), depth++) if (sessions.has(current)) return current;
    return null;
  };
  function observe(event) {
    if (!event || typeof event !== "object") return;
    if (event.kind === "workflow") {
      const run = event.run;
      if (!run || typeof run.id !== "string") return;
      if (run.status === "running") workflows.set(run.id, typeof run.threadId === "string" && run.threadId ? run.threadId : null);
      else if (!workflows.delete(run.id)) return;
      changed();
      return;
    }
    if (event.kind === "connection" && !event.connected) {
      if (!active.size) return;
      active.clear(); changed();
      return;
    }
    const p = event.params || {};
    if (event.method === "thread/started" && typeof p.thread?.id === "string") {
      const parent = parentOf(p.thread);
      if (typeof parent === "string" && parent) parents.set(p.thread.id, parent);
      return;
    }
    if (typeof p.threadId !== "string") return;
    if (event.method === "turn/started") { active.set(p.threadId, p.turn?.id ?? true); touched.add(p.threadId); changed(); }
    // Any completion ends the thread's turn: an inline review completes under its outer ID, and a turn held open by a
    // mismatched ID would keep "Wait" from ever quitting.
    else if (event.method === "turn/completed" && active.delete(p.threadId)) changed();
  }
  /** The session ids with a running turn (or a running sub-agent) or a running workflow. */
  function sessions() {
    const known = threadIds(), result = new Set();
    for (const id of active.keys()) { const owner = ownerOf(id, known); if (owner) result.add(owner); }
    for (const [runId, threadId] of workflows) result.add(threadId || `workflow:${runId}`);
    return result;
  }
  /** Sessions that ran a turn since launch: the only ones that can have background commands left running. */
  function touchedSessions() {
    const known = threadIds(), result = new Set();
    for (const id of touched) { const owner = ownerOf(id, known); if (owner) result.add(owner); }
    return [...result];
  }
  function onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  /** The id of the thread's running turn (turn/started), else null: the app's own approval cards carry it. */
  function turnOf(threadId) { const id = active.get(threadId); return typeof id === "string" && id ? id : null; }
  return { observe, sessions, touchedSessions, onChange, turnOf };
}

/**
 * Sessions whose background commands still run (thread/backgroundTerminals/list), asked only of a connected core and
 * only for sessions that ran a turn since launch. A core without the method, a timeout or an error counts as none:
 * a failed query never holds the quit.
 */
async function backgroundSessions({ client, ids, timeoutMs = 1500 }) {
  if (!client?.connection || !client.serverInfo || !ids.length) return [];
  const results = await Promise.all(ids.slice(0, 50).map(async (threadId) => {
    try {
      const page = await client.request("thread/backgroundTerminals/list", { threadId, limit: 1 }, timeoutMs);
      return Array.isArray(page?.data) && page.data.length > 0 ? threadId : null;
    } catch { return null; }
  }));
  return results.filter(Boolean);
}

/**
 * W8t's two counts from the host's sources: `working` = sessions with a running turn or workflow (iw skipShells),
 * `withShells` = sessions with live background commands (U8t countSessionsWithShells), a session doing both counted
 * in each. main.cjs can pass `count: () => workCounts({ liveWork, client })`.
 */
async function workCounts({ liveWork, client, timeoutMs }) {
  const working = liveWork.sessions().size;
  const withShells = (await backgroundSessions({ client, ids: liveWork.touchedSessions(), timeoutMs })).length;
  return { working, withShells };
}

/**
 * count() may resolve W8t's { working, withShells } or, as main.cjs's older wiring does, one number: the sessions
 * with live work plus those idle sessions that have background commands. `now` is countNow() taken just before
 * count() ran, so the number splits into the agent-working part and the background-only part.
 */
function workSplit(result, now = 0) {
  if (result && typeof result === "object") {
    return { working: Math.max(0, Number(result.working) || 0), withShells: Math.max(0, Number(result.withShells) || 0) };
  }
  const total = Math.max(0, Number(result) || 0), working = Math.min(Math.max(0, Number(now) || 0), total);
  return { working, withShells: total - working };
}

/**
 * handle(event) runs first in before-quit and returns true when it held the quit (it then called event.preventDefault());
 * false lets the quit go on. countNow() is the number of sessions with live work known at once (turns, workflows);
 * count() resolves the counts with background commands too ({ working, withShells }, or one number: see workSplit),
 * which takes a core query, so it runs only when mayFindMore() says a session could have some. skip(): quit without
 * asking (automation).
 */
// terminalsNow(): the built-in terminal tabs whose foreground program is still running (terminal-service.cjs); they join
// the same confirmation (a terminal-only quit asks Quit anyway / Cancel).
function createQuitGuard({ app, dialog, getWindow = () => null, t, count, countNow, mayFindMore = () => false, onChange, skip = () => false, pollMs = 5000, onError = () => {}, terminalsNow = () => 0 }) {
  let allowed = false, prompting = false, checking = false, stopWaiting = null;
  const quit = () => { cancelWait(); allowed = true; app.quit(); };
  function cancelWait() { if (stopWaiting) { const stop = stopWaiting; stopWaiting = null; stop(); } }
  const counted = async () => { const now = countNow(); return workSplit(await count(), now); };
  // Wait for DeepSeek (J8t): quit by itself once no session has agent work (rechecked on every change, and on a timer
  // for background commands, which report no end event). With background commands running when the box opened
  // (skipShells), those do not hold the quit, but a session that starts new ones meanwhile does (shellsAtOpen; the
  // host counts sessions, not shell keys). Commands still running in the built-in terminal then get the terminal-only
  // question (Quit anyway / Cancel) instead of being hung up without asking.
  function wait({ skipShells = false, shellsAtOpen = 0 } = {}) {
    cancelWait();
    let busy = false, done = false;
    const check = async () => {
      if (busy || done) return;
      busy = true;
      try {
        const { working, withShells } = await counted();
        const left = working + (skipShells ? (withShells > shellsAtOpen ? 1 : 0) : withShells);
        if (left === 0 && !done) {
          done = true;
          let terminals = 0;
          try { terminals = Number(terminalsNow()) || 0; } catch (error) { onError(error); }
          if (terminals > 0) { cancelWait(); void prompt({ working: 0, withShells: 0 }, terminals); } else quit();
        }
      }
      catch (error) { onError(error); }
      finally { busy = false; }
    };
    const off = onChange(() => { if (countNow() === 0) void check(); });
    const timer = setInterval(() => void check(), pollMs);
    timer.unref?.();
    stopWaiting = () => { done = true; off(); clearInterval(timer); };
    void check();
  }
  const plural = (count, one, other) => t(count === 1 ? one : other, { count });
  // c5t: s = working (or, when neither count has anything, the sessions the guard saw running), c = s > 0.
  async function prompt({ working, withShells }, terminals = 0) {
    prompting = true;
    // t() names the running core's assistant in place of DeepSeek (i18n setAssistantName).
    const terminalNote = terminals > 0 ? plural(terminals, "A command is also running in {count} terminal.", "Commands are also running in {count} terminals.") : "";
    const agent = working > 0;
    const options = !agent && withShells === 0 ? {
      type: "warning",
      message: t("A command is still running in a terminal"),
      detail: plural(terminals, "Quitting now will stop the command running in {count} terminal.", "Quitting now will stop the commands running in {count} terminals."),
      buttons: [t("Quit anyway"), t("Cancel")],
      defaultId: 0, cancelId: 1, noLink: true,
    } : {
      type: "warning",
      message: agent ? t("DeepSeek is still working") : t("Background commands are still running"),
      detail: [
        agent && plural(working, "DeepSeek is working in {count} session. Quitting now will interrupt that work.", "DeepSeek is working in {count} sessions. Quitting now will interrupt that work."),
        withShells > 0 && (agent
          ? plural(withShells, "Background commands are running in {count} session. Quitting will stop them, even if you wait for DeepSeek.", "Background commands are running in {count} sessions. Quitting will stop them, even if you wait for DeepSeek.")
          : plural(withShells, "Background commands are running in {count} session. Quitting will stop them.", "Background commands are running in {count} sessions. Quitting will stop them.")),
        terminalNote,
      ].filter(Boolean).join("\n\n"),
      buttons: [t("Quit anyway"), ...(agent ? [t("Wait for DeepSeek")] : []), t("Cancel")],
      defaultId: 1, cancelId: agent ? 2 : 1, noLink: true,
    };
    const window = getWindow();
    const parent = window && !window.isDestroyed?.() && window.isVisible?.() ? window : undefined;
    let response;
    try { ({ response } = parent ? await dialog.showMessageBox(parent, options) : await dialog.showMessageBox(options)); }
    catch (error) {
      // A prompt that cannot be shown never traps the user in a running app.
      onError(error); prompting = false; quit(); return;
    }
    prompting = false;
    if (response === 0) quit();
    else if (agent && response === 1) wait({ skipShells: withShells > 0, shellsAtOpen: withShells });
    else cancelWait();
  }
  function handle(event) {
    if (allowed) return false;
    try { if (skip()) return false; } catch {}
    const now = countNow();
    let terminals = 0;
    try { terminals = Number(terminalsNow()) || 0; } catch (error) { onError(error); }
    // Nothing running and no session that could hold background commands: quit at once.
    if (now === 0 && terminals === 0 && !mayFindMore()) return false;
    event.preventDefault();
    if (prompting || checking) return true;
    if (!mayFindMore()) { void prompt({ working: now, withShells: 0 }, terminals); return true; }
    // A session could have background commands: ask the core first, so the box names both kinds (W8t).
    checking = true;
    Promise.resolve().then(count).then(
      (result) => {
        checking = false;
        const counts = workSplit(result, now);
        // c5t's fallback: work the guard saw running that neither count names still counts as agent work.
        if (counts.working === 0 && counts.withShells === 0 && now > 0) counts.working = now;
        if (counts.working > 0 || counts.withShells > 0 || terminals > 0) void prompt(counts, terminals); else quit();
      },
      (error) => {
        checking = false; onError(error);
        // A failed lookup never holds the quit, but never drops a known turn either.
        if (now > 0 || terminals > 0) void prompt({ working: now, withShells: 0 }, terminals); else quit();
      },
    );
    return true;
  }
  return { handle, get waiting() { return stopWaiting !== null; }, get prompting() { return prompting; } };
}

module.exports = { createLiveWork, backgroundSessions, workCounts, workSplit, createQuitGuard };
