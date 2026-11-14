// The tabs' chrome.debugger sessions, shared by everything that needs one: javascript_tool (script.js) attaches for
// the call, console / network monitoring (monitor.js) holds the tab until it stops. A tab has one session at a time;
// it is detached when its last call releases it and no monitor holds it, so Chrome's "started debugging this browser"
// bar is up only while something uses the tab. Chrome detaches by itself when the tab closes or the user cancels that
// bar (chrome.debugger.onDetach): onDetached tells the holders. The DevTools protocol's events reach onEvent's
// listeners by tab. A session keeps the page's execution contexts once Runtime is enabled on it (enableRuntime), so a
// script can be pinned to the document it was checked against (script.js).
// Sessions live in this worker's memory: an attachment a previous worker left (it crashed, or was stopped while a
// monitor held a tab) is detached at start, and an attach that finds one detaches it and tries again.
import { ToolError } from "./errors.js";

const PROTOCOL = "1.3";
const sessions = new Map(); // tabId → { ready: Promise, users, held, runtime: Promise | null, contexts: Map<id, ExecutionContextDescription> }
const detaching = new Map(); // tabId → a detach in flight (an attach right after it waits for it)
const detachListeners = new Set();
const eventListeners = new Set();

chrome.debugger.onDetach.addListener((source, reason) => {
  if (!Number.isInteger(source?.tabId)) return;
  sessions.delete(source.tabId);
  for (const listener of detachListeners) listener(source.tabId, reason);
});
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (!Number.isInteger(source?.tabId)) return;
  const session = sessions.get(source.tabId);
  if (session) trackContexts(session, method, params ?? {});
  for (const listener of eventListeners) listener(source.tabId, method, params ?? {});
});

// Attachments a previous worker left behind: detached before this worker attaches anything (acquire waits for it).
// detach only ever ends this extension's own session: a tab DevTools or another extension debugs just fails here.
const leftovers = (async () => {
  let targets = [];
  try { targets = (await chrome.debugger.getTargets?.()) ?? []; } catch { targets = []; }
  await Promise.all(targets.filter((target) => target.attached && Number.isInteger(target.tabId)).map((target) => chrome.debugger.detach({ tabId: target.tabId }).catch(() => {})));
})();

function trackContexts(session, method, params) {
  if (method === "Runtime.executionContextCreated" && params.context) session.contexts.set(params.context.id, params.context);
  else if (method === "Runtime.executionContextDestroyed") {
    for (const [id, context] of session.contexts) if (id === params.executionContextId || (params.executionContextUniqueId && context.uniqueId === params.executionContextUniqueId)) session.contexts.delete(id);
  } else if (method === "Runtime.executionContextsCleared") session.contexts.clear();
}

/** (tabId, reason) when Chrome detached a tab: it closed ("target_closed") or the user cancelled ("canceled_by_user"). */
export const onDetached = (listener) => detachListeners.add(listener);
/** (tabId, method, params) for every protocol event of an attached tab. */
export const onEvent = (listener) => eventListeners.add(listener);

const alreadyAttached = (error) => /already attached/i.test(error?.message ?? String(error));
function attachError(tab, error) {
  const message = error?.message ?? String(error);
  if (/cannot access|chrome:\/\/|cannot attach/i.test(message)) return new ToolError("restricted_page", `Chrome doesn't allow scripts on ${tab.url || "this page"} (${message}).`);
  return new ToolError("debugger_busy", `Couldn't attach to tab ${tab.id}: ${message}`);
}

function settle(tabId, session) {
  if (session.users > 0 || session.held || sessions.get(tabId) !== session) return;
  sessions.delete(tabId);
  const done = chrome.debugger.detach({ tabId }).catch(() => {}).finally(() => { if (detaching.get(tabId) === done) detaching.delete(tabId); });
  detaching.set(tabId, done);
}

/** The tab's session for one use, attaching if nothing has it yet: → { target, release }. release() once done. */
export async function acquire(tab) {
  let session = sessions.get(tab.id);
  if (!session) {
    const created = { users: 0, held: false, ready: null, runtime: null, contexts: new Map() };
    const target = { tabId: tab.id };
    created.ready = Promise.all([leftovers, detaching.get(tab.id)])
      .then(() => chrome.debugger.attach(target, PROTOCOL))
      // Already attached, with no session here: this extension's own, from before a worker restart. Taken over.
      .catch(async (error) => {
        if (!alreadyAttached(error)) throw error;
        await chrome.debugger.detach(target).catch(() => {});
        await chrome.debugger.attach(target, PROTOCOL);
      })
      .catch((error) => { if (sessions.get(tab.id) === created) sessions.delete(tab.id); throw attachError(tab, error); });
    sessions.set(tab.id, created);
    session = created;
  }
  session.users += 1;
  try { await session.ready; } catch (error) { session.users -= 1; throw error; }
  let released = false;
  return { target: { tabId: tab.id }, session, release: () => { if (released) return; released = true; session.users -= 1; settle(tab.id, session); } };
}

/** Keeps the tab attached after its calls release it (a monitor), until unhold. */
export async function hold(tab) {
  const { session, release } = await acquire(tab);
  session.held = true;
  release();
}
export function unhold(tabId) {
  const session = sessions.get(tabId);
  if (!session) return;
  session.held = false;
  settle(tabId, session);
}
export const isAttached = (tabId) => sessions.has(tabId);

/** Runtime enabled on the tab's attached session, once for the session: it reports the page's execution contexts
 * (mainContext) and its console. replay (a monitor starting): if something enabled it before, it is enabled anew, so
 * V8 replays the console messages it holds for the monitor. */
export async function enableRuntime(tabId, { replay = false } = {}) {
  const session = sessions.get(tabId);
  if (!session) throw new ToolError("debugger_error", `Tab ${tabId} isn't attached.`);
  const target = { tabId };
  if (replay && session.runtime) {
    await session.runtime.catch(() => {});
    await chrome.debugger.sendCommand(target, "Runtime.disable").catch(() => {});
    session.runtime = null;
  }
  if (!session.runtime) {
    const enabling = chrome.debugger.sendCommand(target, "Runtime.enable");
    session.runtime = enabling;
    enabling.catch(() => { if (session.runtime === enabling) session.runtime = null; });
  }
  return session.runtime;
}

/** The default (page's own) execution context of a frame, as Runtime last reported it, or null. */
export function mainContext(tabId, frameId) {
  const session = sessions.get(tabId);
  let found = null;
  for (const context of session?.contexts.values() ?? []) if (context.auxData?.frameId === frameId && context.auxData?.isDefault === true) found = context;
  return found;
}
