// w13-chatfn-history (research/w13-chatfn.md H6 / H7, chatfn-16 cleanup and chatfn-48): what a chat leaves on this
// computer besides the core's thread, and incognito chats left over from an earlier run.
//
// cascade(threadId): after the app's own thread/delete (main.cjs requestRpc / requestCowork) the chat's local data goes
// too — its artifacts (chat-artifact-store.mjs <userData>/chat-artifacts/<id>), its history-index entry
// (chat-memory.mjs removeThread → <userData>/chat-index), its per-chat Memory switch (config.chatMemory.threads), its
// Good / Bad ratings (chat-feedback.mjs) and, when it was the version a branched conversation showed, the other
// versions (chat-branches.mjs prune, which deletes them through the same thread/delete). Every step is best effort: a
// failure is logged and never fails the delete the user asked for. The branch prune is started, not awaited, since its
// own thread/delete calls come back through here (awaiting would wait on the queue it runs in).
//
// sweepIncognito(): the incognito chats a crash or a quit left open (chat-incognito-model.mjs incognitoLeftovers) are
// deleted once the core is connected; the chats started in this run (`noteLive`) stay until their window leaves them.
//
// windowClosed(window, isShown): plan-w13 "离开或关窗后 thread/delete". The renderer deletes an incognito chat when its
// window moves away from it, but a closed window never gets to (macOS keeps the app running): once a window is gone,
// every incognito chat of this run that no remaining window shows is deleted, unless another window that is still open
// started it (its layout may not list the new chat yet).

import { incognitoLeftovers, isIncognitoSession } from './chat-incognito-model.mjs';
import { forgetChatTools } from './chat-tools-store.mjs';

/**
 * @param {object} deps
 * @param {() => object} deps.getConfig
 * @param {() => void} [deps.save]
 * @param {() => ({ deleteThread(id: string): Promise<unknown> }|null)} [deps.artifacts]
 * @param {() => ({ removeThread(id: string): unknown }|null)} [deps.memory]
 * @param {() => Promise<{ forget(id: string): Promise<unknown> }|null>} [deps.feedback]
 * @param {() => Promise<{ run(p: object): Promise<unknown> }|null>} [deps.branches]
 * @param {(id: string) => Promise<unknown>} [deps.deleteThread]  the app's own thread/delete (requestRpc)
 * @param {() => boolean} [deps.connected]
 * @param {(message: string, error?: unknown) => void} [deps.log]
 */
export function createChatHistory({ getConfig, save = () => {}, artifacts = () => null, memory = () => null, feedback = async () => null,
  branches = async () => null, deleteThread = null, connected = () => true, log = () => {} }) {
  const live = new Set(), owners = new Map();
  const step = async (name, run) => { try { await run(); } catch (error) { log(`chat-history: ${name} failed`, error); } };

  async function cascade(threadId) {
    if (typeof threadId !== 'string' || !threadId) return;
    live.delete(threadId); owners.delete(threadId);
    await step('artifacts', () => artifacts()?.deleteThread(threadId));
    await step('history index', () => memory()?.removeThread(threadId));
    await step('memory switch', () => {
      const config = getConfig(), threads = config?.chatMemory?.threads;
      if (!threads || typeof threads !== 'object' || !Object.hasOwn(threads, threadId)) return;
      const next = { ...threads };
      delete next[threadId];
      config.chatMemory = { ...config.chatMemory, threads: next };
      save();
    });
    await step('feedback', async () => (await feedback())?.forget(threadId));
    // w13-close-main-process (chatfn-tools review low 10): its Web search / Research / Extended thinking switches
    // (config.chatTools.threads, chat-tools-store.mjs forgetChatTools).
    await step('tool switches', () => {
      const config = getConfig(), threads = config?.chatTools?.threads;
      if (!threads || typeof threads !== 'object' || !Object.hasOwn(threads, threadId)) return;
      config.chatTools = forgetChatTools(config.chatTools, threadId);
      save();
    });
    // Not awaited: prune's own thread/delete calls run this cascade again.
    void step('versions', async () => (await branches())?.run({ operation: 'prune' }));
  }

  /** An incognito chat started in this run (by `owner`, the window that asked): the sweep leaves it to that window. */
  function noteLive(threadId, owner = null) {
    if (typeof threadId !== 'string' || !threadId) return;
    live.add(threadId);
    owners.set(threadId, owner ?? null);
  }

  /**
   * A window closed: delete the incognito chats of this run no remaining window shows (`isShown(id)`), except those an
   * open window started. Returns the ids it deleted and those whose delete failed (left to the next launch's sweep).
   */
  async function windowClosed(window, isShown = () => false) {
    const deleted = [], failed = [];
    if (!deleteThread) return { deleted, failed };
    const metadata = getConfig()?.sessionMetadata;
    for (const id of [...live]) {
      const owner = owners.get(id) ?? null;
      const ownerOpen = owner && owner !== window && !(typeof owner.isDestroyed === 'function' && owner.isDestroyed());
      if (ownerOpen || !isIncognitoSession(id, metadata)) continue;
      let shown = false;
      try { shown = isShown(id) === true; } catch { shown = false; }
      if (shown) continue;
      try { await deleteThread(id); deleted.push(id); live.delete(id); owners.delete(id); }
      catch (error) { failed.push(id); live.delete(id); owners.delete(id); log('chat-history: incognito delete on window close failed', error); }
    }
    return { deleted, failed };
  }

  /**
   * w13-close-main-process (plan-w13-closeout G6 「无痕会话在 before-quit 时立即删除」): the app is quitting — every
   * incognito chat of this run is deleted now, while the core still runs, at most `budgetMs` in all (the quit waits on
   * it; main.cjs shutdown stop). What isn't deleted in time stays for the next launch's sweep.
   */
  async function quit({ budgetMs = 1500, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    const deleted = [], failed = [];
    if (!deleteThread) return { deleted, failed };
    const metadata = getConfig()?.sessionMetadata;
    const ids = [...live].filter(id => isIncognitoSession(id, metadata));
    if (!ids.length) return { deleted, failed };
    let timer = null;
    const all = Promise.all(ids.map(async (id) => {
      try { await deleteThread(id); deleted.push(id); live.delete(id); owners.delete(id); }
      catch (error) { failed.push(id); log('chat-history: incognito delete on quit failed', error); }
    }));
    await Promise.race([all, new Promise((resolve) => { timer = setTimer(resolve, budgetMs); timer?.unref?.(); })]);
    if (timer) clearTimer(timer);
    return { deleted: [...deleted], failed: [...failed, ...ids.filter(id => !deleted.includes(id) && !failed.includes(id))] };
  }

  async function sweepIncognito() {
    const deleted = [], failed = [];
    if (!deleteThread) return { deleted, failed };
    for (const id of incognitoLeftovers(getConfig(), live)) {
      try { await deleteThread(id); deleted.push(id); } catch (error) { failed.push(id); log('chat-history: incognito sweep failed', error); }
    }
    return { deleted, failed };
  }

  /** Sweeps once the core is connected: tries every `intervalMs`, at most `attempts` times; returns a stop function. */
  function startSweep({ delayMs = 10_000, intervalMs = 30_000, attempts = 20, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    let timer = null, left = attempts, stopped = false;
    const tick = async () => {
      timer = null;
      if (stopped) return;
      if (!connected()) { if (--left > 0) arm(intervalMs); return; }
      if (!incognitoLeftovers(getConfig(), live).length) return;
      const { failed } = await sweepIncognito();
      if (failed.length && --left > 0) arm(intervalMs);
    };
    const arm = (ms) => { timer = setTimer(() => { void tick(); }, ms); timer?.unref?.(); };
    arm(delayMs);
    return () => { stopped = true; if (timer) clearTimer(timer); };
  }

  return { cascade, noteLive, windowClosed, quit, sweepIncognito, startSweep, live };
}
