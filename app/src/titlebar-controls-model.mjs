// R2-topbar TT-02: the Code titlebar's cluster controls, as 2.42304.0 draws them (cc43287c9 wW / lW / DW and
// c73f45bc3 Zh). Pure values so source-titlebar.jsx and its tests share them.
import { foldTitlebarToggles } from "./generated/code-current/titlebar-toggle-fold.mjs";
import { RAIL_TOGGLE_ICON } from "./generated/session-rail-kit/rail-icon-name.mjs";

// R3-topbar TT-03 (2.42304.0 c73f45bc3 Rh): the titlebar's pane toggles in their official order. A session lists
// Terminal, Changes, Preview/Browser, (iOS, Android: no local simulator), then Files; the landing (the Code New session
// page, no session) lists Terminal, Preview/Browser, Files. Each spec is { pane, icon, label, shortcut, active } with
// the local pane kinds (Rh's "diff" is the local "changes", "file" is "files"); the consumer attaches the toggle.
// Labels are catalog keys (English), translated where they render. The same list feeds the inline toggles (uW
// `jh(specs, hidden).inline`) and the View options rows for the folded ones (Vh `jh(specs, hidden).folded`), so both
// sides stay in one order. R4g-small SM1 (D36): Rh's preview row is `icon: e==="preview"&&C?"Globe":Io[e]`, label
// `C ? "Browser" (E3oB+tM0Ou) : "Preview" (TJo5E6JuIN)`, shortcut `G("togglePreview",S,{externalPreviewAvailable:C})`
// with `C=He(r?.type)` (shared-78 SU → hU: GrowthBook `frontend_preview_external_domains`). The host has no
// GrowthBook, so C is false: Io.preview "Play" (c26fb8b6b Cn), "Preview", and shared-19 W7's ungated togglePreview
// "cmd+shift+p" (the ⇧⌘B row is gated on externalPreviewAvailable). Other surfaces are not Rh: their toggle is the
// counterpart of the Cowork session view's yE (c21f11e6d: Globe, "Browser"), kept with the local ⇧⌘P binding
// (pane-shortcuts.mjs; yE's ⇧⌘B opens a separate built-in browser the host does not have). A folded row uses the
// toggle's own icon, as Vh does. Changes only exists for a Code session, Terminal and Files only on Code.
export function titlebarToggleSpecs({ surface = "code", session = false, terminalAvailable = false, previewAvailable = false, filesAvailable = false, panes = new Set() } = {}) {
  const code = surface === "code";
  const spec = (pane, shown, icon, label, shortcut) => (shown ? [{ pane, icon, label, shortcut, active: panes.has(pane) }] : []);
  const terminal = spec("terminal", code && terminalAvailable, "CommandLinePrompt", "Terminal", "cmd+j");
  const preview = spec("preview", previewAvailable, code ? "Play" : "Globe", code ? "Preview" : "Browser", "cmd+shift+p");
  const files = spec("files", code && (session || filesAvailable), "Folder", "Files", "cmd+shift+f");
  return session
    ? [...terminal, ...spec("changes", code, "ChangesPlusMinus", "Changes", "cmd+shift+d"), ...preview, ...files]
    : [...terminal, ...preview, ...files];
}

// c73f45bc3 Vh `p = jh(Rh(...), hiddenMainPaneCount).folded`: the toggles the titlebar folded away, in toggle order,
// for main.jsx's View options menu (each row `checked: active`, checkedRole "checkbox", the toggle's shortcut).
export function titlebarFoldedToggles(input, hiddenMainPanes = 0) {
  return foldTitlebarToggles(titlebarToggleSpecs(input), hiddenMainPanes).folded;
}

// The local activity dots (D15, kept as a host difference) move to ⋮ when the toggle that carries one is folded:
// a running dev server behind a closed Preview, a running command behind a closed Terminal.
export function foldedTogglesActive(folded, { previewRunning = false, terminalBusy = false } = {}) {
  return folded.some((spec) => !spec.active && ((spec.pane === "preview" && previewRunning) || (spec.pane === "terminal" && terminalBusy)));
}

// cc43287c9 wW `je = Dh(Ni())` (shared-20 UO): the Close pane Button's shortcut is "cmd+ctrl+w" on macOS
// ("ctrl+alt+w" elsewhere). The local chord is split-view-model.mjs splitShortcut "close" (⌃⌘W, Meta required),
// so the macOS spec is the one that names a working key.
export const CLOSE_PANE_SHORTCUT = "cmd+ctrl+w";
// shared-frame Button: `"aria-keyshortcuts": c && !u ? Js(c, me) : void 0`. Js sorts the modifiers in Fs order
// (ctrl, alt, shift, cmd), names cmd "Meta" on macOS and keeps a single-letter key as written.
export const CLOSE_PANE_KEYSHORTCUTS = "Control+Meta+w";

// lW / Zh / DW and the Close pane Button add `rm("text-secondary")` (shared-18 Mb: "text-secondary" while fizzy
// `panels` is off, the local case). ToolButton's className replaces its default, so the local code-icon-button
// and the pressed is-selected classes are kept beside the official one. R4f-rail SR-6 topbar-09: a pressed one
// (aria-pressed) paints the official default pressed look, bg-accent under text-accent; source-titlebar.css says why
// pressedVariant "selected" changes nothing in 2.42304.0.
export function titlebarControlClass(active = false, extra = "") {
  return `code-icon-button${extra ? ` ${extra}` : ""} text-secondary${active ? " is-selected" : ""}`;
}

// R4f-rail SR-6 (2.42304.0 cc43287c9 wW): the session rail toggle. A railToggle is jre's model
// `bn = { onScreen, raises, panelId, onToggle }`, handed to the titlebar as `railToggle: on ? bn : void 0`; the
// titlebar draws it with the generated session-rail-kit SessionRailToggle (EH) at the head of the cluster:
// `y && !De && [EH, re && !_e && TI]`, i.e. after the trailing slot and before the pane toggles, followed by TI.
//
// TI is c467aa787 Q (`import{o as TI}from"./c467aa787-B4L-l_bi.js"`), a vertical rule: `function Q(){return
// o("span",{role:"separator","aria-orientation":"vertical",className:"h-4 w-px shrink-0 bg-border"})}`. wW draws it
// while `_e` is false (fizzy `panels` off, the local case) for a mounted cluster (`re`, a session).
export const TITLEBAR_RAIL_SEPARATOR = Object.freeze({ role: "separator", "aria-orientation": "vertical", className: "h-4 w-px shrink-0 bg-border" });

// wW `Te = y !== void 0 && e !== null && de.overflowMenuProps !== null && !Ce`: the rail toggle may fold into ⋮ when
// there is one, for a session whose titlebar has the ⋮ menu and no trailing slot. Locally the ⋮ menu is there exactly
// where the titlebar folds (a Code session's titlebar, source-titlebar.jsx `foldable`) and there is no trailing slot.
// With it, cd54a5401 en (generated titlebarFoldLimits) caps the fold at 7 instead of 6 and folds the rail toggle
// first: `railToggleFolded = e && t > 0`, the pane toggles get `t - 1`.
export function titlebarRailToggleFoldable({ foldable = false, railToggle } = {}) {
  return !!foldable && railToggle !== undefined && railToggle !== null;
}

// cf74bc599 tE: the ⋮ menu's first group, before the folded pane toggles (Kh viewItems), is the folded rail toggle,
// `k = XT(a, { icon: Oe, label: a?.onScreen ? "Hide session rail" : "Show session rail", onSelect: a?.onToggle })`
// (XT(e, t) = e ? [t] : []; Oe is shared-1 Wn = yL "ListCard"). wW hands ⋮ the toggle only while it is folded
// (`railToggle: De ? y : void 0`). No checked state. Labels are catalog keys (English), translated where they render.
export function titlebarRailMenuItems(railToggle) {
  return railToggle
    ? [{ icon: RAIL_TOGGLE_ICON, label: railToggle.onScreen ? "Hide session rail" : "Show session rail", onSelect: railToggle.onToggle }]
    : [];
}

// wW's fold focus hand-off: `Oe = _(!1), ke = A(() => { Oe.current = !0 }, [])` is EH's onUnmountFocused (the toggle
// unmounted while it had focus), and `P(() => { Oe.current && (Oe.current = !1, De && b?.current?.focus({ preventScroll:
// !0 })) }, [De, y, b])` moves that focus to the ⋮ trigger, which holds the same ref while the toggle is folded
// (`railToggleRef: De ? b : void 0`, c73f45bc3 Zh `te`). One instance per titlebar.
export function createRailFoldFocus() {
  let pending = false;
  return {
    unmountFocused() {
      pending = true;
    },
    commit(folded, ref) {
      if (!pending) return;
      pending = false;
      if (folded) ref?.current?.focus({ preventScroll: true });
    },
  };
}
