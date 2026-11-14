// Where a clicked web link opens (2.2553.1 c26fb8b6b ie() for the terminal, code-workspace.js ne() for replies,
// 'epitaxy-transcript-links-in-preview' on by default): a plain left-click on a link to a page on this computer opens
// in the session's Preview pane when it has one; a click with any modifier, a middle click, any other site, or the
// setting turned off goes to the default browser ("⌘-click a link to open it in your default browser").
// The setting ("Open links in preview", the Preview pane's Servers & settings menu) is a preference of the profile
// (config.previewLinks); on when never set.
import { isLoopbackHost } from "./transcript-context-menu-model.mjs";

export const PREVIEW_LINKS_KEY = "codeDesktop.previewLinks";

/** "preview" or "browser" for a click on `href`. `event` carries button and the modifier keys (absent: a plain click). */
export function webLinkRoute(href, event = null, { previewAvailable = false, enabled = true } = {}) {
  if (!previewAvailable || !enabled || typeof href !== "string") return "browser";
  if (event && ((event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)) return "browser";
  try {
    const url = new URL(href);
    return (url.protocol === "http:" || url.protocol === "https:") && isLoopbackHost(url.hostname) ? "preview" : "browser";
  } catch {
    return "browser";
  }
}

// A tiny store, so the menu's checkmark and every side's routing agree within the window. The choice is the profile's
// preference (config.previewLinks, saved through main like the other settings, so every window and a relaunch agree):
// connect() hands it over with the way to save a change. An earlier device-only "off" in the renderer's storage moves
// into the preference once. Until connected (or without a way to save), the storage is used as before.
function createPreviewLinksStore(storage = () => globalThis.localStorage ?? null) {
  const listeners = new Set();
  let cached = null, saved = undefined, save = null;
  const legacy = () => { try { return storage()?.getItem(PREVIEW_LINKS_KEY) !== "off"; } catch { return true; } };
  const forgetLegacy = () => { try { storage()?.removeItem(PREVIEW_LINKS_KEY); } catch {} };
  const notify = () => { for (const listener of [...listeners]) listener(); };
  const read = () => {
    if (cached !== null) return cached;
    cached = typeof saved === "boolean" ? saved : legacy();
    return cached;
  };
  return {
    getSnapshot: read,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    /** The saved preference (true, false, or undefined when never set) and how to save a change. */
    connect(value, writer = null) {
      save = typeof writer === "function" ? writer : null;
      if (typeof value === "boolean") {
        saved = value;
        forgetLegacy();
        if (cached !== value) { cached = value; notify(); }
        return;
      }
      saved = undefined;
      if (save && legacy() === false) void Promise.resolve().then(() => save(false)).then(forgetLegacy, () => {});
    },
    set(enabled) {
      cached = !!enabled;
      if (save) {
        const before = saved;
        void Promise.resolve().then(() => save(cached)).catch(() => { cached = typeof before === "boolean" ? before : legacy(); notify(); });
      } else {
        try { const target = storage(); if (cached) target?.removeItem(PREVIEW_LINKS_KEY); else target?.setItem(PREVIEW_LINKS_KEY, "off"); } catch {}
      }
      notify();
    },
  };
}
export const previewLinksStore = createPreviewLinksStore();
export { createPreviewLinksStore };
