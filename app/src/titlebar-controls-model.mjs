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

// w10-shell-titlebar (notdone 20, TF-O1): the Code session titlebar's readiness, as 3.6556.2 cc43287c9 oG derives it.
//   G   `G=(te||!t&&!o)&&!N`                         live: the session is ready (te), or the landing (no session, no spawn)
//   ae  `ae=G||ie&&!o&&!re.origin&&!N`               seen: oG shows the session's cluster at all
//   le  `le=!ae&&!N&&ce?oe:void 0`                   starting: not seen yet, but the spawn's owner is starting
//   ue  `ue=!G&&le===void 0`                         held: the toggle group is inert
//   He / Ue `He=te&&!N,Ue=ae&&t!==null`              the fold measure's interactive / clusterMounted
//   FW  `(ae||o||re.origin)&&p(FW,{sessionRef:ae?t:null,…,held:ue,startingId:le,…})` mounts the pane toggles, and FW's
//       owner is `t??(u!==null&&i!==void 0?{id:i,type:"starting"}:u)` (u: the landing owner, eb = c5da7eb42 Pm).
// Host mapping: t is the open session (te = not loading); o is main.jsx's first-send spawn (`spawning`); N is the core's
// missing history for it (main.jsx historyUnavailable, the same not-found the rail gets); ie (c5da7eb42 fR: a local
// session of known kind) holds for every host session; the host keeps no pending-launch origin (re.origin); ce
// (`e.currentSessionId===oe&&(e.ownerStarting||ie)`) is the host's spawn phase for the draft (`starting`).
// toggleOwner is FW's owner kind: "session", "starting" or "landing" (null while FW is not mounted).
export function titlebarSessionState({ session = false, loading = false, spawning = false, sessionNotFound = false, starting = false } = {}) {
  const hasSession = !!session;
  const notFound = !!sessionNotFound;
  const ready = hasSession && !loading;
  const live = (ready || (!hasSession && !spawning)) && !notFound;
  const seen = live || (hasSession && !spawning && !notFound);
  const startingShown = !seen && !notFound && !!starting;
  const held = !live && !startingShown;
  const togglesMounted = seen || !!spawning;
  const toggleOwner = !togglesMounted ? null : seen && hasSession ? "session" : startingShown ? "starting" : "landing";
  return { live, seen, startingShown, held, togglesMounted, toggleOwner, interactive: ready && !notFound, clusterMounted: seen && hasSession };
}

// TF-O1 (3.6556.2 c73f45bc3 x_, FW's specs): a "starting" owner reads as the landing: `i=Mi(t)` with Mi = c5da7eb42
// Am `function Am(e){return e?.type==="starting"?Dm:e??null}` (Dm = `{id:nn,type:"landing"}`), so `s=i?.type==="landing"`
// takes the landing branch `[...a,...n,...o]` (Terminal, Preview, Files), and Files also stays for the starting owner
// through `y=Rs(t?.type==="starting")` (c0fbbe82d sr: the landing's trusted folder with listDirectoryAtCwd), the host's
// filesAvailable. So the specs take the session branch only for a "session" owner.
export function titlebarOwnerSpecs(owner, input = {}) {
  return titlebarToggleSpecs({ ...input, session: owner === "session" });
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

// w10-shell-titlebar (notdone 19, 3.6556.2 c73f45bc3 d_, exported `ot`, imported by cf74bc599 as I_):
// `function d_(e,t){…r=>{e!==void 0&&(e.raises?e.onScreen||ka("show_raised",t,n):ka(e.onScreen?"hide":"show",t,n),e.onToggle(r))}}`.
// A press goes to the model's onToggle with its event (the rail reads `e?.detail === 0` for keyboard focus) and only
// while there is a model. ka (c68c4283d hf) only logs `claudeai.epitaxy.session_rail.${e}_pressed` { via: t, in_popout: n };
// the host has no telemetry, so `via` ("overflow" for ⋮, "toolbar" for the titlebar toggle) names the caller and the
// log is a no-op here.
export function railToggleSelect(railToggle, via) {
  void via; // ka(…, via, inPopout): no host telemetry.
  return (event) => {
    if (railToggle === undefined || railToggle === null) return;
    railToggle.onToggle(event);
  };
}

// cf74bc599 tE (3.6556.2 DA): the ⋮ menu's first group, before the folded pane toggles (Kh / U_ viewItems), is the
// folded rail toggle. 2.42304.0 `k = XT(a, { icon: Oe, label: …, onSelect: a?.onToggle })`; 3.6556.2 DA
// `l = I_(a, "overflow")`, `R = CA(a, { icon: it, label: a?.onScreen ? "Hide session rail" : "Show session rail",
// onSelect: l })` (CA(e, t) = e ? [t] : []; it is shared-1 Vn = wV "ListCard"). wW / oG hand ⋮ the toggle only while
// it is folded (`railToggle: Qe ? x : void 0`). No checked state. Labels are catalog keys (English), translated where
// they render.
export function titlebarRailMenuItems(railToggle) {
  return railToggle
    ? [{ icon: RAIL_TOGGLE_ICON, label: railToggle.onScreen ? "Hide session rail" : "Show session rail", onSelect: railToggleSelect(railToggle, "overflow") }]
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
