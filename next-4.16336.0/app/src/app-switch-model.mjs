// Host replica of the compact Chat/Code switch container (2.42304.0 shared-21 vC, exported `Ms`) and of the pressed
// mode hand-off it relies on (shared-6 Fk + shared-78 Vq). The container reads the desktop router, GrowthBook, the
// code-entitlement store and telemetry, so it is not extracted; generated/app-switch/manifest.json `callSites` pins the
// original lines each rule below follows. The original segment builder, frame and SegmentedControl render the result
// (src/source-app-switch.jsx).
// 3.6556.2 (generated/app-switch/manifest.json callSites): vC is shared-21 fT (exported `Sc`), Fk is shared-6 uM, Vq is
// shared-78 $Y and bC is mT; the rules below are unchanged by the React Compiler rewrite (the current mode is
// `r = lc()`, lc = $Y; the press is `i = ju()`, ju = uM). uM now also wraps the press in flushSync and, at the 0ms
// timeout, hands the mode to the shared-52 store as `pendingMode`, which $Y reads after the pressed one
// (`pressedMode ?? KY(t)`, KY = `pendingMode ?? route mode ?? lastKnownMode`) until the route reaches it (pM); the host
// keeps that value in the container (see createAppSwitchPress and source-app-switch.jsx).

import { adjacentSurface, shortcutBindingMatches, surfaceChordDirection, surfaceChordShortcuts } from './generated/code-current/surface-chord.mjs';
import { isMacUserAgent } from './generated/code-current/surface-chord-platform.mjs';
import { flushSync as reactFlushSync } from 'react-dom';

// D11: `sidebar_tab_activity_dots` (shared-8 N_) is a GrowthBook flag; the host has no GrowthBook and keeps it off,
// which is the original's answer while the flag is off: no dot, no "{tab}, working" tooltip.
export const SIDEBAR_TAB_ACTIVITY_DOTS = false;

// vC, with the host's two segments: `homeMode` is the local chat/cowork surface the home segment returns to (the
// installed app merges Chat and Cowork into one home mode, `dC()`), and Code is always available here (no
// `eC().reason`, no discovery card, so `T === null` and `g === null`).
//   i = to()                                   -> current = pressed ?? mode            (Vq: pressedMode ?? route mode)
//   M = i === "code" || T !== null ? "code" : p -> selected
//   I = i === "code" ? P : void 0              -> home.dot (P = Fv(p), the home mode's activity)
//   L = i !== "code" && g === null ? F : void 0 -> code.dot (F = Fv("code"))
//   R = +(i === "code"); z = (e, t) => bC(e, t, R, n, r, d), n = desktop, r = modes, d = rtl
// `chord` stands in for bC's desktop argument (n = B()), which also mounts the surface chord (AM: `if (!e) return`):
// the hint names the cmd+alt+left/right chord, so it is offered exactly where the host binds it (W3, below and
// source-app-switch.jsx useSurfaceChord). Without it no segment advertises a shortcut.
export function appSwitchProps({ mode, pressed = null, pending = null, homeMode, homeName, chord = false, rtl = false, attention,
  dots = SIDEBAR_TAB_ACTIVITY_DOTS, shortcutHint }) {
  // $Y: pressedMode ?? KY (pendingMode ?? the route's mode).
  const current = pressed ?? pending ?? mode;
  const modes = [homeMode, 'code'];
  const byMode = dots && attention ? attention : {};
  const index = +(current === 'code');
  const hint = (segment, position) => shortcutHint ? shortcutHint(segment, position, index, chord, modes, rtl) : undefined;
  return {
    homeMode,
    selected: current === 'code' ? 'code' : homeMode,
    home: { name: homeName, dot: current === 'code' ? byMode[homeMode] : undefined, shortcut: hint({ mode: homeMode }, 0) },
    code: { name: 'Code', dot: current !== 'code' ? byMode.code : undefined, shortcut: hint({ mode: 'code', discoveryUpsell: undefined }, 1) },
  };
}

// Fk (3.6556.2 shared-6 uM):
//   (_j(), x(() => Xo.setState(e => ({ pressedMode: t, pressId: e.pressId + 1 }))));      x = react-dom flushSync
//   let { pressId: r } = Xo.getState();
//   setTimeout(() => { let i = Xo.getState().pressId !== r;
//     (xi.setState({ pendingMode: i ? Xo.getState().pressedMode : t }), i || Xo.setState({ pressedMode: null }), e(Qa[t], n)); }, 0);
// A press is drawn at once (`pressedMode` under flushSync, so the thumb moves before the route renders); at the 0ms
// timeout the mode becomes `pendingMode` (a superseded press hands over the later pressed value instead and keeps it
// pressed) and the navigation runs. The pending value stands in for the route until the route shows that mode (pM
// clears it then, source-app-switch.jsx). The host's navigation is `switchMode` (main.jsx), which is async and may
// refuse: it keeps its own `sending` guard and returns without changing the mode. So the pending value is also
// dropped when that call settles, and a refused switch springs back to the real mode instead of the segments being
// drawn disabled (D11). Difference from uM, recorded: a superseded press does not navigate (uM still navigates it,
// then the later one; the end state is the same). `_j()` (html.product-switch-pending, which only animates
// .df-pill-indicator) has no element to act on in this host.
export function createAppSwitchPress({ setPressed, setPending = () => {}, flushSync = reactFlushSync, schedule = run => setTimeout(run, 0) }) {
  let latest = 0, latestPressed = null;
  return function press(value, onMode) {
    const id = ++latest;
    latestPressed = value;
    flushSync(() => setPressed(value));
    return new Promise((resolve, reject) => schedule(() => {
      const superseded = id !== latest;
      setPending(superseded ? latestPressed : value);
      if (superseded) { resolve(false); return; }
      setPressed(null);
      Promise.resolve().then(() => onMode?.(value)).finally(() => { if (id === latest) setPending(null); })
        .then(() => resolve(true), reject);
    }));
  };
}

// R2-appswitch W3: the ⌥⌘←/→ surface chord (2.42304.0 shared-22 AM, mounted by jM inside the frame sidebar DN).
// generated/code-current/surface-chord.mjs carries the originals: qL (direction), $L (next mode, no wrap), RL (the
// useShortcut binding matcher) and the jL.chorus_surface_prev/next binding tables.
//
// LL (shared-1, behind `it("chorus_surface_prev")`) keeps the command's bindings for this platform ("mac" by the shared-78
// Wa user-agent test, else "non-mac") and app ("desktop"); its matchShortcut is the first binding RL matches. LL also
// reports telemetry and honours user overrides (`t.override`, `Uo()`), which this host has neither of.
export function surfaceChordMatcher(command, { mac = isMacUserAgent(), app = 'desktop' } = {}) {
  const platform = mac ? 'mac' : 'non-mac';
  const bindings = (surfaceChordShortcuts[command] ?? [])
    .filter(binding => (!('platform' in binding) || binding.platform === platform) && (!('app' in binding) || binding.app === app));
  return event => bindings.some(binding => shortcutBindingMatches(event, binding));
}

// AM's keydown handler `s` and its navigation `o`:
//   if (!e || t.defaultPrevented) return;                        e = B(), the Claude desktop UA
//   let n = bt(t, r, i, a);                                       bt = qL, r/i = the prev/next matchers, a = rtl
//   n !== null && ((!Si() && extraPanesByMode[bi()].length > 0) || (o(n, "arrow_chord") && t.preventDefault()));
//   o = (e, r) => { let a = at(t, bi(), e); return a !== null && (track(...), n(a, "tab"), !0); }   at = $L, t = modes
// Returns the mode to switch to, or null when the event is not the chord (or nothing lies that way). Si is shared-78
// Wa (a Mac user agent), so the extra-panes guard only exists off a Mac; `extraPanes` stands for
// `extraPanesByMode[mode]` there. bi() is the current mode with the pressed one first (shared-78 Gq), `current` here.
export function surfaceChordTarget(event, { modes, current, rtl = false, desktop = true, mac = isMacUserAgent(), extraPanes = false, matchPrev, matchNext }) {
  if (!desktop || !event || event.defaultPrevented) return null;
  const direction = surfaceChordDirection(event, matchPrev, matchNext, rtl);
  if (direction === null) return null;
  if (!mac && extraPanes) return null;
  return adjacentSurface(modes, current, direction);
}

// w13-surfaces-modes (3.6556.2): the host's mode model follows the official desktop surface list, home mode and home
// segment name, so the switch, the sidebar and the startup restore never offer a surface the original does not have.
//
// shared-78 mY (exported `Is`), desktop branch (`e = A()`):
//   let u = t ? ["chat"] : [];
//   (a && u.push("cowork"), r !== !1 && u.push("code"), u.includes("chat") && (a || !s || c || l || f || p || h))
//     ? _ = i(["cowork", ...u.filter(hY)])                       hY(e){ return e !== "chat" && e !== "cowork" }
//     : _ = i(u);
// `a` is Cowork's availability (kE(): supported and gate on), `t` the chat entitlement, `r` Code's. The other merge
// conditions (`!s` signed out, `c` blocked_by_entitlement, `l`/`f`/`p`/`h` account and GrowthBook states) have no
// counterpart in this host (local user, no GrowthBook), so they read false; Chat and Code are always entitled here.
// Cowork available -> ["cowork", "code"] (the merged home); otherwise ["chat", "code"].
export function desktopSurfaces({ coworkEnabled = false } = {}) {
  const surfaces = ['chat'];
  if (coworkEnabled) surfaces.push('cowork');
  surfaces.push('code');
  return surfaces.includes('chat') && coworkEnabled
    ? ['cowork', ...surfaces.filter(surface => surface !== 'chat' && surface !== 'cowork')]
    : surfaces;
}

// shared-21 rT(){ return _s() ? "cowork" : "chat" } with _s = shared-78 DY:
//   !e.includes("chat") && e.includes("cowork") && (t.isAvailable || t.status === "blocked_by_entitlement")   e = mY's list
export function homeModeFor({ coworkEnabled = false } = {}) {
  const surfaces = desktopSurfaces({ coworkEnabled });
  return !surfaces.includes('chat') && surfaces.includes('cowork') && coworkEnabled ? 'cowork' : 'chat';
}

// shared-21 cT: `t === "cowork" ? n : e.formatMessage({ defaultMessage: "Chat", id: "WTrOy36sdu" })`, t = rT(), n = Vw().
// Vw is "Claude" (4PjoX4rZSt) here: its other answer "Chat and Cowork" needs account / GrowthBook conditions this host
// does not have (D11). Without an intl the English default is returned.
export function homeNameFor(homeMode, intl) {
  const message = homeMode === 'cowork'
    ? { defaultMessage: 'Claude', id: '4PjoX4rZSt' }
    : { defaultMessage: 'Chat', id: 'WTrOy36sdu' };
  return intl ? intl.formatMessage(message) : message.defaultMessage;
}

// The surface a saved or requested mode lands on. With Cowork unavailable the original has no cowork surface (mY gives
// ["chat", "code"]), so a saved 'cowork' opens the Chat home. With Cowork available the official merged home no longer
// has a separate chat surface: chat sessions open under the Home segment (Recents), so 'chat' is kept as is for an
// existing chat session while New on the merged home goes to cowork. Every other value is returned unchanged.
export function resolveSurface(mode, { coworkEnabled = false } = {}) {
  if (mode === 'cowork' && !desktopSurfaces({ coworkEnabled }).includes('cowork')) return 'chat';
  return mode;
}
