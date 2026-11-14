// Terminal pane state for this window: the tabs of every owner (a session, or the New session page's folder) it has
// shown, the active tab per owner, and the xterm views kept alive across session switches. The PTYs live in the main
// process (electron/terminal-service.cjs); this module only mirrors their info and routes their output. Keyed per
// owner, never "the current session": a window may show two sessions side by side.
//
// The xterm views are created by the pane (source-terminal-pane.jsx) through a factory, so this module never imports
// xterm and stays testable. A view: { write(data), reset(), dispose(), element } — the store keeps at most
// MAX_CACHED_TERMINALS of them (least recently shown first out; they re-attach from the main process's kept output).
import { MAX_CACHED_TERMINALS, unseenData } from "./terminal-pane-model.mjs";
import { createInlineOutput, feedInlineOutput, inlineOutputText, pickRunTab, promptAfterInput, INLINE_SILENCE_MS, INLINE_START_MS } from "./code-block-run-model.mjs";
import { terminalErrorText, terminalStartError } from "./generated/code-current/terminal-errors.mjs";

// The text a code block shows when its terminal could not start (c6bf19e8f Ei: `let r = di(e?.error, k, c);
// (R.getState().setInlineError(k, li(r)), t || P(r))`): "Failed to spawn shell" reads "Couldn’t start the shell", any
// other message shows as is, none at all is startFailed. Like the pane (terminal-pane-model.mjs restartTerminalTab) the
// host passes the tab for both di keys, so a missing session is not mistaken for needsNewerApp (local tabs).
const SHELL_EXITED = "Shell exited";
function inlineStartErrorText(error, ptyKey) {
  const message = String(error?.message ?? error ?? "").replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "").trim();
  return terminalErrorText(terminalStartError(message || undefined, ptyKey, ptyKey));
}

export function ownerKeyOf(sessionId, homeWorkspace) {
  return sessionId ? sessionId : homeWorkspace ? `home:${homeWorkspace}` : null;
}

export function createTerminalStore({ bridge = globalThis.desktop?.terminal ?? null } = {}) {
  const owners = new Map(); // owner → { tabs: info[], active: id|null, loaded, loading: Promise|null, error }
  const views = new Map(); // id → { view, written, queue: events[]|null, lastShown, info }
  const listeners = new Set();
  const openedListeners = new Set();
  const enterAt = new Map(); // id → last Enter keystroke time (auto-close on `exit`)
  // A code block's "Run in terminal" (B20, ca41b3815 inlineRun): at most one run is tracked, its output read from the
  // tab's stream into the block (code-block-run-model.mjs). records: finished runs whose output went to the model
  // (c26fb8b6b G byRunId), so their block keeps showing it after another run starts.
  let inline = null, inlineGeneration = 0, silenceTimer = null, startTimer = null;
  const inlineListeners = new Set();
  const records = new Map();
  const prompts = new Map(); // id → "clean" | "dirty": unsent input at the prompt (ca41b3815 promptLines)
  let version = 0;
  const notify = () => { version += 1; for (const listener of [...listeners]) { try { listener(); } catch {} } };

  const ownerState = (owner) => {
    if (!owners.has(owner)) owners.set(owner, { tabs: [], active: null, loaded: false, loading: null, error: null });
    return owners.get(owner);
  };
  function upsert(info) {
    if (!info?.id || !info.owner) return;
    const state = ownerState(info.owner);
    const index = state.tabs.findIndex((tab) => tab.id === info.id);
    const previous = index >= 0 ? state.tabs[index] : null;
    state.tabs = index >= 0 ? state.tabs.map((tab) => (tab.id === info.id ? info : tab)) : [...state.tabs, info];
    if (!state.active) state.active = info.id;
    const entry = views.get(info.id);
    if (entry) {
      entry.info = info;
      // A restart starts a fresh shell: the view starts over too.
      if (previous && previous.generation !== info.generation) { try { entry.view.reset(); } catch {} entry.written = 0; }
    }
  }
  function drop(id, owner, { keepView = false } = {}) {
    const state = owner ? owners.get(owner) : [...owners.values()].find((value) => value.tabs.some((tab) => tab.id === id));
    if (state) {
      const index = state.tabs.findIndex((tab) => tab.id === id);
      if (index >= 0) {
        state.tabs = state.tabs.filter((tab) => tab.id !== id);
        if (state.active === id) state.active = state.tabs[Math.min(index, state.tabs.length - 1)]?.id ?? null;
      }
    }
    if (keepView) return;
    const entry = views.get(id);
    if (entry) { try { entry.view.dispose(); } catch {} views.delete(id); }
    enterAt.delete(id);
  }
  function receive(event) {
    if (!event || typeof event !== "object") return;
    if (event.kind === "data") {
      // Before the run's tab is known (a dedicated run's "run" reply may come after its first output), every tab's
      // output waits in the queue; dispatched() keeps the run tab's.
      if (inline && !inline.settled && (event.id === inline.ptyKey || (inline.ptyKey === null && inline.queue))) inlineData(event);
      const entry = views.get(event.id);
      if (!entry) return;
      if (entry.queue) { entry.queue.push(event); return; }
      const data = unseenData(event, entry.written);
      if (data) { entry.view.write(data); entry.written = event.end; }
      return;
    }
    // ⌘K in some window: every other view of that terminal clears too (the kept output is gone: terminal-service "clear").
    if (event.kind === "cleared") { const entry = views.get(event.id); if (entry && !entry.queue) { try { entry.view.clear?.(); } catch {} entry.written = event.end; } return; }
    if (event.kind === "state") {
      upsert(event.info);
      const ended = event.info && event.info.status !== "running" && event.info.status !== "starting";
      if (inline && !inline.settled && ended && event.info.id === inline.ptyKey) inlineShellEnded(event.info);
      else if (inline && !inline.settled && ended && inline.ptyKey === null && inline.queue) inline.queue.push(event);
      notify();
      return;
    }
    // "moved": the terminal now belongs to another owner (a session the New session page started): its view stays.
    if (event.kind === "removed") {
      drop(event.id, event.owner, { keepView: event.reason === "moved" });
      if (event.reason !== "moved") prompts.delete(event.id);
      if (event.reason !== "moved" && inline && !inline.settled && event.id === inline.ptyKey) inlineShellEnded(null);
      notify();
      return;
    }
    if (event.kind === "opened") {
      const state = ownerState(event.owner);
      state.active = event.id;
      for (const listener of [...openedListeners]) { try { listener(event); } catch {} }
      notify();
    }
  }
  // ---- Inline run (code-block-run-model.mjs; ca41b3815 runInline / appendInlineOutput / settle) ----
  const emitInline = () => { for (const listener of [...inlineListeners]) { try { listener(); } catch {} } };
  const setInline = (patch) => { inline = inline ? { ...inline, ...patch } : null; emitInline(); };
  function clearInlineTimers() { clearTimeout(silenceTimer); clearTimeout(startTimer); silenceTimer = startTimer = null; }
  function settleInline(endedBy, extra = {}) {
    if (!inline || inline.settled) return;
    clearInlineTimers();
    setInline({ settled: true, endedBy: inline.endedBy ?? endedBy, prev: null, queue: null, ...extra });
  }
  // A plain run with no command marks settles once its output has been quiet for a moment (ca41b3815 gt "silence").
  // The same timer (ca41b3815 j / Y → xt) ends a run whose shell went away after it printed: xt settles "shell-exit"
  // when shellExited is set (setInlineError below).
  function armSilence() {
    clearTimeout(silenceTimer);
    const generation = inline?.generation;
    silenceTimer = setTimeout(() => {
      silenceTimer = null;
      if (inline?.generation !== generation || inline.settled) return;
      if (inline.shellExited) settleInline("shell-exit", { exitCode: inline.reader?.exitCode ?? inline.exitCode ?? null });
      else if (inline.quietSettles) settleInline("silence");
    }, INLINE_SILENCE_MS);
  }
  function inlineChunk(data) {
    const run = inline;
    feedInlineOutput(run.reader, data);
    const output = inlineOutputText(run.reader, run.command);
    const visible = output.replace(/\x1b\[[0-9;]*m/g, "").trim() !== "";
    inline = { ...run, output, hasVisibleOutput: visible, altScreen: run.reader.alt, ...(visible || run.reader.cleared ? { prev: null } : {}) };
  }
  function inlineData(event) {
    if (inline.at === null) { inline.queue?.push(event); return; }
    const start = Number.isFinite(event.end) ? event.end - event.data.length : inline.at;
    if (Number.isFinite(event.end) && event.end <= inline.at) return;
    inlineChunk(event.data.slice(Math.max(0, inline.at - start)));
    if (inline.reader.finished) { settleInline("idle", { exitCode: inline.reader.exitCode }); return; }
    if (inline.reader.started) { clearTimeout(silenceTimer); silenceTimer = null; inline.quietSettles = false; }
    else if (inline.quietSettles) armSilence();
    emitInline();
  }
  // The run's tab ended. `info` is its exited state, or null when the tab was closed ("removed"). A typed run that had
  // printed nothing ends as ca41b3815 Ct does: a shell that exited is c6bf19e8f jr's shell_pty_close
  // `R.getState().setInlineError(t.sessionId, t.reason ? `Shell disconnected: ${t.reason}` : "Shell exited")` (a local
  // PTY gives no disconnect reason), a closed tab is Er's `R.getState().noteShellClosed(e)` = `Ct(e, null)` (no error);
  // both `error: t, settled: !0, prev: null, endedBy: dispatched ? "shell-exit" : "cancel"`, after Kt forgets the prompt.
  // A typed run that already printed keeps its output and ends "shell-exit" after the settle delay, as Ct does
  // (`shellExited: !0`, `j === void 0 && Y(n.generation, H)`); Kt runs first either way. The dedicated bash-turn tab
  // (host-only) ends "exit" at once.
  function inlineShellEnded(info) {
    const exitCode = Number.isInteger(info?.exitCode) ? info.exitCode : inline.reader?.exitCode ?? null;
    if (inline.mode === "dedicated") { settleInline("exit", { exitCode }); return; }
    if (inline.ptyKey) prompts.delete(inline.ptyKey);
    if (inline.dispatched && inline.hasVisibleOutput) {
      inline = { ...inline, shellExited: true, exitCode };
      if (silenceTimer === null) armSilence();
      emitInline();
      return;
    }
    settleInline(inline.dispatched ? "shell-exit" : "cancel", { error: info ? SHELL_EXITED : null });
  }
  function startInline({ id, owner, command, mode }) {
    if (inline && !inline.settled) settleInline("superseded");
    clearInlineTimers();
    records.delete(id);
    const previous = inline?.id === id && inline.output ? { output: inline.output, altScreen: inline.altScreen } : null;
    inline = { id, generation: ++inlineGeneration, owner, command, mode, ptyKey: null, at: null, queue: [], reader: createInlineOutput(mode),
      output: "", hasVisibleOutput: false, altScreen: false, dispatched: false, settled: false, endedBy: null, exitCode: null,
      errorKind: null, error: null, shellExited: false, quietSettles: false, prev: previous };
    emitInline();
    return inline.generation;
  }
  const current = (generation) => inline?.generation === generation && !inline.settled;
  // The tab's output from offset `at` on belongs to the run; events that came before the offset was known replay now.
  function dispatched(generation, ptyKey, at, { quietSettles }) {
    if (!current(generation)) return false;
    const queued = inline.queue ?? [];
    inline = { ...inline, ptyKey, at: Number.isFinite(at) ? at : 0, queue: null, dispatched: true, quietSettles };
    for (const event of queued) {
      if (!current(generation)) break;
      if (event.kind === "state") { if (event.info?.id === ptyKey) inlineShellEnded(event.info); }
      else if (event.id === ptyKey) inlineData(event);
    }
    if (!current(generation)) return false;
    if (quietSettles) armSilence();
    emitInline();
    return true;
  }

  let unsubscribe = null, hello = null;
  function connect() {
    if (!bridge || unsubscribe) return;
    unsubscribe = bridge.onEvent(receive);
    hello = Promise.resolve().then(() => bridge.call("hello", {})).catch(() => null);
  }
  connect();

  const params = (sessionId, homeWorkspace) => (sessionId ? { sessionId } : { sessionId: null, homeWorkspace });
  const store = {
    available: !!bridge,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    version: () => version,
    /** Agent-opened tabs ({ owner, sessionId, id }): main.jsx shows the pane for that owner. */
    onOpened(listener) { openedListeners.add(listener); return () => openedListeners.delete(listener); },
    get(owner) { return owner ? owners.get(owner) ?? null : null; },
    async backend() { return hello ? await hello : null; },
    /** Load an owner's tabs once (re-listed after a window reload); resolves with its state. */
    load(owner, sessionId, homeWorkspace) {
      if (!bridge || !owner) return Promise.resolve(null);
      const state = ownerState(owner);
      if (state.loaded) return Promise.resolve(state);
      if (state.loading) return state.loading;
      state.loading = bridge.call("list", params(sessionId, homeWorkspace)).then((list) => {
        for (const info of Array.isArray(list) ? list : []) upsert(info);
        state.loaded = true;
        state.error = null;
        return state;
      }, (error) => { state.error = error?.message || String(error); throw error; }).finally(() => { state.loading = null; notify(); });
      return state.loading;
    },
    async create(owner, sessionId, homeWorkspace, size = {}, { cwd } = {}) {
      const info = await bridge.call("create", { ...params(sessionId, homeWorkspace), cols: size.cols, rows: size.rows, ...(typeof cwd === "string" && cwd ? { cwd } : {}) });
      upsert(info);
      ownerState(owner).active = info.id;
      notify();
      return info;
    },
    /** Shell mode ('!command' on a core without its own): a tab running the command; wait() returns its output. */
    async run(sessionId, command, { quiet = false } = {}) {
      const info = await bridge.call("run", { sessionId, command, ...(quiet ? { quiet: true } : {}) });
      upsert(info);
      ownerState(sessionId).active = info.id;
      notify();
      return info;
    },
    wait(sessionId, id, timeoutMs) { return bridge.call("wait", { sessionId, id, timeoutMs }); },
    /** The New session page's terminals (its folder) move to the session its first prompt started. */
    async adopt(sessionId, homeWorkspace) {
      if (!bridge || !sessionId || !homeWorkspace) return [];
      const moved = await bridge.call("adopt", { sessionId, homeWorkspace }).catch(() => []);
      const list = Array.isArray(moved) ? moved : [];
      for (const info of list) upsert(info);
      if (list.length) notify();
      return list;
    },
    select(owner, id) {
      const state = ownerState(owner);
      if (state.active === id || !state.tabs.some((tab) => tab.id === id)) return;
      state.active = id;
      notify();
    },
    move(owner, id, delta) {
      const state = ownerState(owner);
      const index = state.tabs.findIndex((tab) => tab.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= state.tabs.length) return;
      const tabs = [...state.tabs];
      tabs.splice(target, 0, ...tabs.splice(index, 1));
      state.tabs = tabs;
      notify();
    },
    async close(owner, sessionId, homeWorkspace, id) {
      drop(id, owner);
      notify();
      try { await bridge.call("close", { ...params(sessionId, homeWorkspace), id }); } catch {}
    },
    async rename(sessionId, homeWorkspace, id, title) {
      upsert(await bridge.call("rename", { ...params(sessionId, homeWorkspace), id, title }));
      notify();
    },
    async restart(sessionId, homeWorkspace, id) {
      upsert(await bridge.call("restart", { ...params(sessionId, homeWorkspace), id }));
      notify();
    },
    resize(sessionId, homeWorkspace, id, cols, rows) {
      return bridge.call("resize", { ...params(sessionId, homeWorkspace), id, cols, rows }).catch(() => null);
    },
    /** This window stopped showing the terminal: its size no longer limits the PTY (terminal-service.cjs viewers). */
    detach(sessionId, homeWorkspace, id) {
      return bridge.call("detach", { ...params(sessionId, homeWorkspace), id }).catch(() => null);
    },
    /** Which candidates are files, resolved from terminal `id`'s shell folder (then the session folder). */
    paths(sessionId, homeWorkspace, list, id = null) {
      return bridge.call("paths", { ...params(sessionId, homeWorkspace), paths: list, ...(id ? { id } : {}) }).catch(() => list.map(() => null));
    },
    /** ⌘K: the terminal's kept output is dropped too, so a reload, another window or read_terminal never brings it back. */
    clear(sessionId, homeWorkspace, id) {
      return bridge.call("clear", { ...params(sessionId, homeWorkspace), id }).catch(() => null);
    },
    input(id, data) {
      if (!bridge) return;
      prompts.set(id, promptAfterInput(prompts.get(id), data));
      if (data.includes("\r")) enterAt.set(id, Date.now());
      bridge.write(id, data);
    },
    lastEnter(id) { return enterAt.get(id) ?? 0; },
    /** The live view of a terminal, created through `factory(info)` and attached to its kept output on first use. */
    view(id, sessionId, homeWorkspace, factory) {
      let entry = views.get(id);
      if (entry) { entry.lastShown = Date.now(); return entry.view; }
      const info = [...owners.values()].flatMap((state) => state.tabs).find((tab) => tab.id === id) ?? null;
      entry = { view: factory(info), written: -1, queue: [], lastShown: Date.now(), info };
      views.set(id, entry);
      const current = entry;
      bridge.call("attach", { ...params(sessionId, homeWorkspace), id }).then((result) => {
        if (views.get(id) !== current) return;
        // The kept output was drawn at the PTY's size (another window's, maybe): replay it at that width, then fit the
        // pane again, so lines and prompts land where the shell put them.
        const term = current.view.term, size = result?.size;
        const replaySized = !!(result?.output && term && Number.isInteger(size?.cols) && Number.isInteger(size?.rows) && (term.cols !== size.cols || term.rows !== size.rows));
        if (replaySized) { try { term.resize(size.cols, size.rows); } catch {} }
        if (result?.output) current.view.write(result.output);
        if (replaySized) {
          const refit = () => { try { current.view.fit?.fit(); } catch {} if (views.get(id) === current && term.cols > 0) void store.resize(sessionId, homeWorkspace, id, term.cols, term.rows); };
          if (typeof term.write === "function" && result?.output) term.write("", refit); else refit();
        }
        current.written = Number.isFinite(result?.end) ? result.end : 0;
        const queued = current.queue;
        current.queue = null;
        for (const event of queued) {
          const data = unseenData(event, current.written);
          if (data) { current.view.write(data); current.written = event.end; }
        }
      }, () => { if (views.get(id) === current) { current.queue = null; current.written = 0; } });
      // Least recently shown views beyond the cap are disposed (their PTYs keep running).
      if (views.size > MAX_CACHED_TERMINALS) {
        const oldest = [...views.entries()].filter(([key]) => key !== id).sort((a, b) => a[1].lastShown - b[1].lastShown)[0];
        if (oldest) { try { oldest[1].view.dispose(); } catch {} views.delete(oldest[0]); }
      }
      return entry.view;
    },
    updateViewOptions(options) { for (const {view} of views.values()) for (const [key,value] of Object.entries(options)) if (view.term?.options[key] !== value && view.term) view.term.options[key]=value; },
    hasView(id) { return views.has(id); },
    /** Any tab of `owner` with a running command (the titlebar's "Terminal (command running)" dot). */
    busy(owner) { return !!owners.get(owner)?.tabs.some((tab) => tab.busy === true && tab.status === "running"); },
    /** The tracked code-block run (null when none), replaced on every change; subscribeInline() hears the changes. */
    inlineRun() { return inline; },
    subscribeInline(listener) { inlineListeners.add(listener); return () => inlineListeners.delete(listener); },
    /** A finished run whose output went to the model, kept for its block: { output, error } or undefined. */
    runRecord(id) { return records.get(id); },
    /** The tab a run was typed into, while that run is the tracked one and its tab is still open (c03935b01 Mt). */
    inlineTab(id) {
      if (!inline || inline.id !== id || !inline.ptyKey) return null;
      return ownerState(inline.owner).tabs.some((tab) => tab.id === inline.ptyKey) ? { owner: inline.owner, id: inline.ptyKey } : null;
    },
    /**
     * Type a code block's command at an idle prompt of the owner's terminals, or in a new tab (c11959232 run "plain",
     * c03935b01 It); its output is read into inlineRun(). Resolves { ptyKey, fresh } or null when superseded.
     */
    async runInline({ id, sessionId = null, homeWorkspace = null, command, onTab = null }) {
      if (!bridge) throw new Error("The terminal isn’t available.");
      const owner = ownerKeyOf(sessionId, homeWorkspace);
      const generation = startInline({ id, owner, command, mode: "typed" });
      try {
        await store.load(owner, sessionId, homeWorkspace).catch(() => null);
        const probe = await bridge.call("probe", params(sessionId, homeWorkspace)).catch(() => null);
        if (!current(generation)) return null;
        const state = ownerState(owner);
        const target = pickRunTab({ tabs: state.tabs, activeId: state.active, probe, dirty: (tab) => prompts.get(tab) === "dirty" });
        const info = target ? state.tabs.find((tab) => tab.id === target) : await store.create(owner, sessionId, homeWorkspace, {});
        if (!current(generation)) return null;
        store.select(owner, info.id);
        inline = { ...inline, ptyKey: info.id };
        try { onTab?.(info); } catch {}
        // A new shell first runs its startup files; the command is typed once its prompt is up ("ready": the main
        // process waits for the first output and a short quiet spell, and says where the output stood then).
        const ready = await bridge.call("ready", { ...params(sessionId, homeWorkspace), id: info.id });
        if (!current(generation)) return null;
        bridge.write(info.id, `${command}\r`);
        prompts.set(info.id, "clean");
        enterAt.set(info.id, Date.now());
        // A shell with the integration marks the command's start and end (OSC 133 C/D); one without settles on quiet,
        // as does an integrated one that never marks the start.
        if (!dispatched(generation, info.id, ready?.at, { quietSettles: !info.shellIntegration })) return null;
        if (info.shellIntegration) startTimer = setTimeout(() => { if (current(generation) && !inline.reader.started) { inline.quietSettles = true; armSilence(); } }, INLINE_START_MS);
        return { ptyKey: info.id, fresh: !target };
      } catch (error) {
        if (current(generation)) settleInline("error", { errorKind: "failed", error: inlineStartErrorText(error, inline.ptyKey) });
        throw error;
      }
    },
    /**
     * Run a code block's command in a tab of its own whose output goes to the model when it ends (the composer's
     * '!' run; c11959232 runCaptured): its output streams into inlineRun() too. Resolves the tab's info.
     */
    async runDedicated({ id, sessionId, command }) {
      if (!bridge) throw new Error("The terminal isn’t available.");
      const generation = startInline({ id, owner: ownerKeyOf(sessionId, null), command, mode: "dedicated" });
      try {
        const info = await store.run(sessionId, command, { quiet: true });
        if (current(generation)) { inline = { ...inline, ptyKey: info.id }; dispatched(generation, info.id, 0, { quietSettles: false }); }
        return info;
      } catch (error) {
        if (current(generation)) settleInline("error", { errorKind: "failed", error: inlineStartErrorText(error, inline.ptyKey) });
        throw error;
      }
    },
    /** Keep a finished run's output for its block (its output went to the model). */
    recordRun(id) {
      if (!inline || inline.id !== id) return;
      records.delete(id);
      records.set(id, { output: inline.output, error: inline.error, exitCode: inline.exitCode });
      while (records.size > 200) records.delete(records.keys().next().value);
      inline = { ...inline }; // a new snapshot, so blocks read the record
      emitInline();
    },
    /**
     * The terminal `ptyKey` failed (its pane's shell start, c6bf19e8f Ei `R.getState().setInlineError(k, li(r))`):
     * ca41b3815 `setInlineError: (e, t) => { (Kt(e), Ct(e, t)); }`. Kt forgets the tab's prompt state; Ct only touches
     * the unsettled run typed into that tab: one that already printed keeps its output and ends "shell-exit" after
     * the settle delay (`shellExited: !0`, `j === void 0 && Y(n.generation, H)`); any other settles now with
     * `error: t, settled: !0, prev: null, endedBy: dispatched ? "shell-exit" : "cancel"`. The code block card shows
     * that error (c19e90103 `t.inlineRun?.id === e ? t.inlineRun.error : null`). Returns the run after the change,
     * or null when there was none to change. (Ct waits for the pending capture dispose, G.then; the host has none.)
     */
    setInlineError(ptyKey, text) {
      prompts.delete(ptyKey);
      if (!inline || inline.ptyKey !== ptyKey || inline.settled) return null;
      if (inline.dispatched && inline.hasVisibleOutput) {
        inline = { ...inline, shellExited: true };
        if (silenceTimer === null) armSilence();
        emitInline();
      } else settleInline(inline.dispatched ? "shell-exit" : "cancel", { error: text });
      return inline;
    },
    /** Cancel: ^C to the command once typed, and the run ends (ca41b3815 cancelInlineRun; c11959232 cancel). */
    cancelInlineRun() {
      if (!inline || inline.settled) return;
      if (inline.dispatched && inline.ptyKey) bridge?.write(inline.ptyKey, "\x03");
      settleInline("cancel");
    },
    dismissInlineRun() { clearInlineTimers(); inline = null; emitInline(); },
    dispose() { clearInlineTimers(); unsubscribe?.(); unsubscribe = null; for (const entry of views.values()) { try { entry.view.dispose(); } catch {} } views.clear(); },
  };
  return store;
}

// One store per window; tests build their own with a fake bridge.
let shared = null;
export function terminalStore() {
  if (!shared) shared = createTerminalStore();
  return shared;
}
