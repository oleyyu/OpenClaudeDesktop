// w13-close-cowork-ui (coworkui-scheduled-02): the desktop preference keepAwakeEnabled behind the Scheduled page banner's
// "Keep awake" switch (3.6556.2 ccd3f68fe Na `action: Qe ? <go size="md" context="scheduled-task"/>`, go = c6ad19bb9 m,
// src/generated/cowork-scheduled KeepAwakeSwitch). Official store: c1e3f823e `i = _b("keepAwakeEnabled", !1)` over
// shared-78 MC, which hydrates from getPreferences() as `_hydrate(t[e] === !0, e in t)`; c1e3f823e o (n) is
// `i.useHasKey() && Sw()` (Sw: the desktop's keepAwake status, supported on this desktop build), a (r) is `i.useEnabled`,
// l (a) writes `i.write(e)`. Here the preference lives in the profile config (main.cjs "settings" patch
// `keepAwakeEnabled`, read back by "keep-awake-read"; electron/desktop-settings.cjs holds the computer awake while it is
// on), and every window follows the config-updated broadcast. Same shape as auto-open-files-model.mjs.

export const KEEP_AWAKE_KEY = "keepAwakeEnabled";

/** The saved preference read from a profile config: unset (or no config) reads as off, as the official default `!1`. */
export const keepAwakeEnabled = config => config?.[KEEP_AWAKE_KEY] === true;

/**
 * The window's copy of the preference. getState() is { enabled, hasKey, loadAttempted } (stable until it changes). The
 * first subscriber starts the read; config-updated keeps it current. set() saves through main and rolls back when the
 * save fails.
 */
export function createKeepAwakeStore({ desktop = () => globalThis.desktop ?? null } = {}) {
  const listeners = new Set();
  let state = { enabled: false, hasKey: false, loadAttempted: false };
  let started = false, revision = 0;
  const notify = () => { for (const listener of [...listeners]) listener(); };
  const update = patch => {
    const next = { ...state, ...patch };
    if (next.enabled === state.enabled && next.hasKey === state.hasKey && next.loadAttempted === state.loadAttempted) return;
    state = next;
    notify();
  };
  const start = () => {
    if (started) return;
    started = true;
    const api = desktop();
    if (typeof api?.call !== "function") { update({ loadAttempted: true }); return; }
    api.onEvent?.(event => {
      if (event?.kind !== "config-updated" || !event.config || typeof event.config !== "object") return;
      update({ enabled: keepAwakeEnabled(event.config), hasKey: true, loadAttempted: true });
    });
    const asked = revision;
    void Promise.resolve().then(() => api.call("keep-awake-read")).then(
      prefs => {
        if (asked !== revision) { update({ hasKey: true, loadAttempted: true }); return; }
        if (!prefs || typeof prefs !== "object") { update({ loadAttempted: true }); return; }
        // MC _hydrate(t[e] === !0, e in t).
        update({ enabled: prefs[KEEP_AWAKE_KEY] === true, hasKey: KEEP_AWAKE_KEY in prefs, loadAttempted: true });
      },
      () => update({ loadAttempted: true }));
  };
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      start();
      return () => listeners.delete(listener);
    },
    set(enabled) {
      const value = !!enabled, before = state.enabled, mine = ++revision;
      update({ enabled: value });
      const api = desktop();
      if (typeof api?.call !== "function") return;
      void Promise.resolve().then(() => api.call("settings", { [KEEP_AWAKE_KEY]: value })).catch(() => { if (mine === revision) update({ enabled: before }); });
    },
  };
}

export const keepAwakeStore = createKeepAwakeStore();
