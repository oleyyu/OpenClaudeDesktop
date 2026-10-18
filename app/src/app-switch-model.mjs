// Host replica of the compact Chat/Code switch container (2.42304.0 shared-21 vC, exported `Ms`) and of the pressed
// mode hand-off it relies on (shared-6 Fk + shared-78 Vq). The container reads the desktop router, GrowthBook, the
// code-entitlement store and telemetry, so it is not extracted; generated/app-switch/manifest.json `callSites` pins the
// original lines each rule below follows. The original segment builder, frame and SegmentedControl render the result
// (src/source-app-switch.jsx).

import { adjacentSurface, shortcutBindingMatches, surfaceChordDirection, surfaceChordShortcuts } from './generated/code-current/surface-chord.mjs';
import { isMacUserAgent } from './generated/code-current/surface-chord-platform.mjs';

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
export function appSwitchProps({ mode, pressed = null, homeMode, homeName, chord = false, rtl = false, attention,
  dots = SIDEBAR_TAB_ACTIVITY_DOTS, shortcutHint }) {
  const current = pressed ?? mode;
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

// Fk: a press is shown at once (`pressedMode`, so the thumb moves before the route renders), the navigation runs after
// a 0ms timeout, and a later press supersedes an earlier one. The host's navigation is `switchMode` (main.jsx), which is
// async and may refuse: it keeps its own `sending` guard and returns without changing the mode. The pressed value is
// therefore held until that call settles and then dropped, so a refused switch springs back to the real mode instead
// of the segments being drawn disabled (D11). Differences from Fk, recorded: a superseded press does not navigate
// (Fk still navigates it, then the later one), and the pressed value is dropped when the host call settles rather
// than at the timeout (the host has no `pendingMode` to bridge the gap).
export function createAppSwitchPress({ setPressed, schedule = run => setTimeout(run, 0) }) {
  let latest = 0;
  return function press(value, onMode) {
    const id = ++latest;
    setPressed(value);
    return new Promise((resolve, reject) => schedule(() => {
      if (id !== latest) { resolve(false); return; }
      Promise.resolve().then(() => onMode?.(value)).finally(() => { if (id === latest) setPressed(null); })
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
