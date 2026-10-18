// R4f-popout F3 (layout-04): 'Add to prompt' from a popped-out pane (main.cjs popout-add-to-prompt → the main window's
// "add-to-prompt" event) lands in the composer the way 2.42304.0's bridged pane windows write into the main composer.
//
// 2.42304.0 renderer v1/c03935b01-CyJKQj4N.js, tile store zo: a pane window's store has host
// {kind:"popout",composer:"bridged"} (c5638815a yt), and its composer writes go through the relay
//   r=(e,n,r,i)=>{let{currentSessionId:a,lacksMessageBox:o}=r(),s=ua(t,a);if(!s)return!1;if(o)return!0;
//     let c=t=>{let r=t.getState()[e];r(...n)},
//     l=t=>{let n=X(s);n&&i&&!t&&(Ho(n,e)||Vo(n))?(i(n),Le()):n?c(n):i!==null&&Y&&(Fs(s,i??c),Y(s,{raise:i!==void 0}))},
//     u=i&&X(s),d=u&&(Ho(u,e)||Vo(u))?te?.getOnScreen?.():void 0;if(!d)return l(!0),!0;
//     let f=e=>{let t=r();t.currentSessionId===a&&!t.lacksMessageBox&&l(e)};return d.then(f,()=>f(!1)),!0}
// with X(s) the main composer's store showing session s (registered composer, Bo/Uo), Vo its live draft having text
// or attachments (`t.text.trim()!==""||t.hasAttachments`), Ho the session's stored draft for a seed, te.getOnScreen
// the main window's WindowState (main process: visible and not minimized), Le = shared-6 Jk (WindowControl show() +
// focus()) and Y the main window's navigator (cd377abb5 bi: push the session route, `r?.raise&&Se()`, Se = Jk).
// The text writes (setPendingComposerSeed / submitToChat) pass i = Ns(e); attachContextToChat (a terminal or file
// selection) does not use r: it attaches to X(l) at once, else keeps the snippet in the session's draft and opens
// the session without raising (`s===void 0&&l===a().currentSessionId&&l!=="landing"&&Y?.(l)`).
//
// Host mapping. Each pane window here is its own renderer, so main.cjs relays the text to the main window that shows
// the session (else the one that popped the pane out); that window decides here, and asks main.cjs about itself
// (window-on-screen = WindowState.getOnScreen, window-raise = WindowControl show + focus; popout-r4f-window.cjs).
// - A comment's Add to prompt (changed-line comment, plan comments) is the text write; a popped-out Terminal's
//   selection (main.cjs attaches its label / tab as meta) is attachContextToChat.
// - The write itself is the host's: promptAdditions queues the text and the side showing the session takes it as a
//   context snippet and focuses the composer. A snippet is added beside the draft and never replaces it, so the
//   off-screen draft case keeps the write (official Ns drops the seed there and only focuses the composer) — a host
//   difference that keeps the comment instead of losing it.
// - lacksMessageBox: every local session has a message box, so the host passes none (false).
// - The re-check after the wait (`t.currentSessionId===a`) is about the pane window's session, which never changes
//   for a local pane window; lacksMessageBox is checked again.

/** Which official write a relayed pane text is: "context" (attachContextToChat) or "seed" (the relayed text write). */
export function panePromptKind(event) {
  const meta = event?.meta;
  return meta && typeof meta === "object" && (typeof meta.terminalTabId === "string" || typeof meta.label === "string") ? "context" : "seed";
}

/** Vo: the composer showing the session holds a draft — text, or attachments. */
export function composerHasDraft(draft) {
  if (!draft || typeof draft !== "object") return false;
  const text = typeof draft.text === "string" ? draft.text : "";
  const attached = Array.isArray(draft.attachments) ? draft.attachments.length > 0 : draft.hasAttachments === true;
  return text.trim() !== "" || attached;
}

/** Bo/Uo: the composers mounted in this renderer, by the session they show; the newest registration answers. */
export function createPaneComposerRegistry() {
  const bySession = new Map();
  return {
    register(sessionId, getDraft) {
      if (typeof sessionId !== "string" || !sessionId || typeof getDraft !== "function") return () => {};
      const entry = { getDraft };
      bySession.set(sessionId, [...(bySession.get(sessionId) ?? []), entry]);
      return () => {
        const list = (bySession.get(sessionId) ?? []).filter((item) => item !== entry);
        if (list.length) bySession.set(sessionId, list); else bySession.delete(sessionId);
      };
    },
    has: (sessionId) => bySession.has(sessionId),
    draft(sessionId) {
      const list = bySession.get(sessionId);
      return list?.length ? list[list.length - 1].getDraft() : undefined;
    },
  };
}
export const paneComposers = createPaneComposerRegistry();

const settled = (outcome) => ({ handled: true, done: Promise.resolve(outcome) });

/**
 * The relay for one relayed pane text. host:
 *   shown(sessionId)      a side of this window shows the session (X(s) has a composer)
 *   draft(sessionId)      that composer's live draft ({ text, attachments }), for Vo
 *   write(sessionId, text, meta)   the host write (promptAdditions.queue); false when nothing was written
 *   open(sessionId)       open the session in the focused side (Y)
 *   getOnScreen()         Promise<boolean>: this window is visible and not minimized (te.getOnScreen)
 *   raise()               show and focus this window (Le / Se)
 *   lacksMessageBox(sessionId)  optional; the host has none
 * Returns { handled, done }: done resolves to "written", "raised", "opened", "opened-raised", "dropped" or "ignored".
 */
export function relayPanePrompt(event, host = {}) {
  const sessionId = typeof event?.sessionId === "string" && event.sessionId ? event.sessionId : undefined;
  const text = typeof event?.text === "string" ? event.text : "";
  // ua(t,a): only a pane window's own session; nothing to write is nothing relayed.
  if (!sessionId || !text.trim()) return { handled: false, done: Promise.resolve("ignored") };
  const lacksMessageBox = () => host.lacksMessageBox?.(sessionId) === true;
  // if(o)return!0 — and attachContextToChat's `if(a().lacksMessageBox)return`: taken, not written.
  if (lacksMessageBox()) return settled("dropped");
  const meta = event.meta && typeof event.meta === "object" ? event.meta : undefined;
  const write = () => host.write?.(sessionId, text, meta) !== false;
  const shown = () => host.shown?.(sessionId) === true;
  const conflict = () => composerHasDraft(host.draft?.(sessionId));
  if (panePromptKind(event) === "context") {
    // attachContextToChat: X(l) attaches; else the session's draft keeps it and the session opens, not raised.
    if (!write()) return settled("ignored");
    if (shown()) return settled("written");
    host.open?.(sessionId);
    return settled("opened");
  }
  // l(t): t is "on screen".
  const land = (onScreen) => {
    if (shown()) {
      if (!onScreen && conflict()) {
        // (i(n),Le()): the composer takes it and focuses, and the window comes forward.
        if (!write()) return "ignored";
        host.raise?.();
        return "raised";
      }
      // c(n): written straight into the composer.
      return write() ? "written" : "ignored";
    }
    // Fs(s,i??c),Y(s,{raise:i!==void 0}): queued for the session, which opens in a window brought forward.
    if (!write()) return "ignored";
    host.open?.(sessionId);
    host.raise?.();
    return "opened-raised";
  };
  // d=u&&(Ho(u,e)||Vo(u))?te?.getOnScreen?.():void 0;if(!d)return l(!0)
  const pending = shown() && conflict() ? host.getOnScreen?.() : undefined;
  if (pending == null) return settled(land(true));
  const after = (onScreen) => (lacksMessageBox() ? "dropped" : land(!!onScreen));
  // d.then(f,()=>f(!1)): a failed question counts as off screen.
  return { handled: true, done: Promise.resolve(pending).then(after, () => after(false)) };
}
