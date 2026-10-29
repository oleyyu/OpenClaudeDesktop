// "Auto-open files Claude writes" (3.6556.2, menus:N1 / panes:C5-4): the desktop preference launchAutoOpenFiles.
// Official store: c22d6171c-C3t7W9JR.js `c = e("launchAutoOpenFiles", !0)` over shared-78 MC, which hydrates from
// getPreferences() as `_hydrate(t[e] === !0, e in t)` ({isEnabled, hasKey, loadAttempted}) and, with no desktop
// preference API, only marks the load attempted (`_setInitialized()`). The main process default is
// `launchAutoOpenFiles: !0` (asar index.chunk-jPKPzV-P.js), so on a desktop build the key is always known.
// Here the preference lives in the profile config (main.cjs "settings" patch `launchAutoOpenFiles`, read back by
// "auto-open-files-read"; unset reads as on), and every window follows the config-updated broadcast.
// Readers:
//   - Settings › Code › Browser row (c71860c77-C3tXoNVw Or): shown while Browser tools is on and `hasKey ||
//     !loadAttempted`, checked = enabled, disabled = !hasKey, change = write.
//   - Preview pane ⋯ menu (cf580efe9-BFcQCjF9 `autoOpenFiles: Y, onAutoOpenFilesChange: ki(Ae, oe)`, ki(e,t) =
//     `e && t ? write : void 0`): the item exists only when the key is known and the pane belongs to a local session.
//     The item itself is the 3.6556.2 slice's (generated/code-editor/preview-settings-menu.mjs, c224804cc ae `G`).
//   - The auto-open behaviour itself (asar index.chunk-DNPOm2Zc.js Fk `G0("launchAutoOpenFiles") === !1 → autoOpenOff`)
//     reads autoOpenFilesEnabled(config).

export const AUTO_OPEN_FILES_KEY = "launchAutoOpenFiles";
// c71860c77-C3tXoNVw Or: `r ? NShGei0Ifc : 4uNKbBb+5S`, r = He() = shared-78 JT (GrowthBook
// frontend_preview_external_domains). The host keeps that gate off (D36), so the Preview pane copy applies.
export const AUTO_OPEN_FILES_DESCRIPTION = "HTML, images, PDFs, and videos Claude writes open in the Preview pane.";

/** The saved preference read from a profile config: unset (or no config) reads as on, as the official default `!0`. */
export function autoOpenFilesEnabled(config) {
  return config?.[AUTO_OPEN_FILES_KEY] !== false;
}

/** The Settings row's visibility and state (c71860c77-C3tXoNVw Or: `p = d || !f`, `className: f ? void 0 : "invisible"`). */
export function autoOpenFilesSettingRow({ enabled, hasKey, loadAttempted }) {
  return { shown: hasKey || !loadAttempted, invisible: !loadAttempted, checked: enabled, disabled: !hasKey };
}

/**
 * The window's copy of the preference. `getState()` is { enabled, hasKey, loadAttempted } (stable until it changes);
 * `getSnapshot()` is `enabled`. The first subscriber starts the read; config-updated keeps it current. `set()` saves
 * through main (or a connected writer) and rolls back when the save fails. `connect(value, writer)` lets a caller that
 * already holds the profile config seed it (same shape as previewLinksStore.connect).
 */
export function createAutoOpenFilesStore({ desktop = () => globalThis.desktop ?? null } = {}) {
  const listeners = new Set();
  let state = { enabled: true, hasKey: false, loadAttempted: false };
  let started = false, writer = null, revision = 0;
  const notify = () => { for (const listener of [...listeners]) listener(); };
  const update = patch => {
    const next = { ...state, ...patch };
    if (next.enabled === state.enabled && next.hasKey === state.hasKey && next.loadAttempted === state.loadAttempted) return;
    state = next;
    notify();
  };
  const hydrate = prefs => {
    if (!prefs || typeof prefs !== "object") { update({ loadAttempted: true }); return; }
    // MC _hydrate(t[e] === !0, e in t).
    update({ enabled: prefs[AUTO_OPEN_FILES_KEY] === true, hasKey: AUTO_OPEN_FILES_KEY in prefs, loadAttempted: true });
  };
  const start = () => {
    if (started) return;
    started = true;
    const api = desktop();
    if (typeof api?.call !== "function") { update({ loadAttempted: true }); return; }
    // The broadcast config carries the key only once it was saved; unset reads as on (the main default).
    api.onEvent?.(event => {
      if (event?.kind !== "config-updated" || !event.config || typeof event.config !== "object") return;
      update({ enabled: autoOpenFilesEnabled(event.config), hasKey: true, loadAttempted: true });
    });
    const asked = revision;
    void Promise.resolve().then(() => api.call("auto-open-files-read")).then(
      prefs => { if (asked === revision) hydrate(prefs); else update({ hasKey: true, loadAttempted: true }); },
      () => update({ loadAttempted: true }));
  };
  return {
    getState: () => state,
    getSnapshot: () => state.enabled,
    subscribe(listener) {
      listeners.add(listener);
      start();
      return () => listeners.delete(listener);
    },
    connect(value, save = null) {
      writer = typeof save === "function" ? save : null;
      if (typeof value === "boolean") { revision += 1; update({ enabled: value, hasKey: true, loadAttempted: true }); }
    },
    set(enabled) {
      const value = !!enabled, before = state.enabled, mine = ++revision;
      update({ enabled: value });
      const api = desktop();
      const save = writer ?? (typeof api?.call === "function" ? next => api.call("settings", { [AUTO_OPEN_FILES_KEY]: next }) : null);
      if (!save) return;
      void Promise.resolve().then(() => save(value)).catch(() => { if (mine === revision) update({ enabled: before }); });
    },
  };
}

export const autoOpenFilesStore = createAutoOpenFilesStore();
