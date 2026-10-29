// R4f-rail SR-1: extract the Code session rail's primitives and shell, without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/session-rail-kit, own scripts/verify-gen-session-rail-kit.mjs).
// Spec: analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1, §2, §8 SR-1, §10.
// w2-rail-kit (2026-10-25): the originals are Claude Desktop 3.6556.2 (analysis/claude-3.6556.2-migrate-20261025,
// research/panes.md §1.4 / §2.1 C1-1…C1-4, C1-15, C1-16, §2.2 C2-5, §3.2; plan R1–R15, E3/E5/E12/E13). Export names and
// target files are those of 2.42304.0 (R4/E7); new targets: rail-section-ids, fizzy-icon, rail-caret-icon, rail-repo-icon,
// lazy-body.
//
//   rail-layout.mjs        shared-18: the rail width class (Tx), the flat marker (Ex, `data-session-rail-flat`) and the
//                          flat context (Dx), the card / stack / slot classes, the docked column (Ux) and overlay (nS / rS)
//                          classes, the chat column geometry, the fit thresholds (Wx = 611, Gx = 771) with Kx / qx / Yx,
//                          tS (pickers under the prompt), Mb (the titlebar text class), wU (the popup collision padding)
//                          and Zx / Xx (the flat rail's composer-menu release).
//   rail-column.mjs        shared-6 xg (`data-epitaxy-rail-column`), Hh (the overlay titlebar shift class), qh.
//   rail-shown-store.mjs   shared-20 Ah (`persisted.epitaxy.sessionRailShown`, shown by default) and jh, the panels part
//                          classes and gp (the toggle's icon element).
//   rail-section-ids.mjs   c68c4283d g / _ (the section ids, moved out of c227f4d5e).
//   rail-sections-store.mjs c227f4d5e x6 (`epitaxy.sessionRailSections`: folds per session, startsOpen, hidden, order,
//                          plugin sections) with the section rules.
//   rail-rows.mjs          c227f4d5e: the worktree mark JB, the row primitives, the card presence gV / _V, the limited
//                          list MB and its Show more OB, the settings rollup nV, the pct meter ZB, the sessionKey context
//                          (l6 c6 s6), the aside guard TB with its pointer-press mark EB, kH (wheel forwarding).
//   branch-chip.mjs        c96d752d0 gL (= memo(Ske)) the branch chip with its lazy menu body (lazy-body.mjs, shared-16 xl),
//                          mL (its face context, "mono") and hL (the Changes row layout context, "stacked").
//   rail-card.mjs          c73f45bc3 xx: the rail card (group/railcard, header div, Icon rotate caret, summary / rollup,
//                          header menu with Show / Reset to defaults, the reorder grip and its [data-rail-grab] layer), with
//                          oS (the flat gate), lx / ux (the section titles), ix (grip context), ox (plugin sections), d_.
//   rail-shell.mjs         cc43287c9: the titlebar toggle TH (aria-label "Session rail", Hide / Show tooltip) with SH, the
//                          region opener EH, the docked column hH and overlay AH with kH / DH / OH (Escape and outside
//                          pointerdown close, focus back to the toggle), the wheel hand-off mH / pH / fH and the shown
//                          store context NH / FH / HH / PH.
//   …                      and the small originals those read.
//
// Every emitted binding is an original top-level declaration sliced from the 3.6556.2 chunk; c25d7186f (the design token
// table, byte-identical) is emitted whole. A module's bindings are the reachable closure of its roots: a declaration's
// dependencies are its free variables (each declaration is parsed on its own; Babel's scope analysis names what it reads
// from outside). An import or same-chunk binding resolves, in this order, to: a host adapter in
// src/source-session-rail-kit-adapters.jsx (feature-checked against the original it replaces), an earlier module of this
// kit, a semantic public name of the shared view-tabs graph (D1/D24; the React Compiler helpers by their E3 names), React
// (a vendor-frame export alias of official.reactAliases, react/compiler-runtime included), or a code-current export of the
// same 3.6556.2 binding (one copy). Nothing else is accepted, and a context (createContext) that view-tabs already
// instantiates is refused instead of duplicated. A root view-tabs publishes is re-exported under its kit name (R4).
//
// The kit's manifest publishes `publicNames` (file#local -> module export) so the rail view generators (SR-2 … SR-4)
// import the one copy of each context, store and component from here.
//
// `callSites` pin the original text the host wiring follows but cannot import: the session view's rail state machine and
// its mount points, the lazy rail host (uH / dH), the composer-menu raise (yH), the titlebar placement and the ⋮ menu's
// rail item (cf74bc599 DA). Raw pins go through official.looseFeature (R2).
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
// w2-rail-kit: 3.6556.2 (R1/E6). The constants come from official-3.6556.2.mjs.
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/session-rail-kit');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-kit-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = official.vendorFrame;
// React (R3): a vendor-frame import resolves through its export alias in official.reactAliases (measured on
// vendor-frame-CnSY1sxv.js; aliases were reused across versions, so never by the old name), each alias proved once by
// official.assertVendorAlias (the top-level `local=<namespace>.<member>` declarator; `Oo` is react/compiler-runtime c).

// Host dependencies, keyed by the original binding (file:local) an import or same-chunk reference resolves to.
// `features` must appear in that binding's prettier form (`closure: true`: in its same-chunk closure).
const adapters = {
  // react-intl useIntl / FormattedMessage / defineMessages over the local catalog (useStartIntl / StartMessage).
  'vendor-intl-DYfox5Co.js:q': { name: 'useIntl', features: ['return (Mt(e), e);'] },
  'vendor-intl-DYfox5Co.js:Gt': { name: 'FormattedMessage', features: ['var Gt = c(Wt, Ut);'] },
  // shared-52 cB (exported ha): the ErrorsProvider; the host toasts.
  'shared-52-uHFNjl7C.js:cB': { name: 'useErrors', features: ['Error("Must be called within ErrorsProvider")'] },
  // shared-78 L2 (exported ct): the account's GitHub sync setting; no claude.ai account here.
  'shared-78-D5Fw2h0a.js:L2': { name: 'useGithubSyncEnabled', features: ['return Ia().vcs.github_sync;'] },
  // c68c4283d un / _f / hf (exported Sr / Bd / zd): telemetry (D17: nothing is sent) for the branch chip menu, the rail
  // sections (expanded / collapsed / control_pressed / moved / hidden) and the rail toggle.
  'c68c4283d-CWbOoVxS.js:un': { name: 'logLocalPrMenuAction', features: ['d("claudeai.code.local_pr.menu_action", e);'] },
  'c68c4283d-CWbOoVxS.js:_f': { name: 'logRailSectionEvent', features: ['d("claudeai.epitaxy.session_rail.section_moved", { section: t });'] },
  'c68c4283d-CWbOoVxS.js:hf': { name: 'logRailTogglePressed', features: ['d(`claudeai.epitaxy.session_rail.${e}_pressed`, { via: t, in_popout: n });'] },
  // shared-11 Pc (exported ds): the presets gate's hook form; D10: on.
  'shared-11-_AVGLHEz.js:Pc': { name: 'useSessionPresetsFlat', closure: true, features: ['return Ut(hc)', 'hc="claudeai_cc_epitaxy_session_presets_main"'] },
  // shared-4 Sk (exported rt): a navigation region's registered body; no region registry here.
  'shared-4-DUB1Oi0O.js:Sk': { name: 'RegionEntry', features: ['t = vk(Ck);', 't === null ? null : P(t, e)'] },
  // shared-16 so / Na (exported so / Na): the pane layout store and the panes of a mode, which the split-window shown
  // map (cc43287c9 VH) subscribes to; this host has no official pane layout store (see the adapter).
  'shared-16-ByfgAyLr.js:Q': { name: 'paneLayoutStore', features: ['extraPanesByMode: {},', 'colWeightsByMode: {},', 'parkedPanes: null,'] },
  'shared-16-ByfgAyLr.js:Bo': { name: 'panesOfMode', features: ['let n = e.extraPanesByMode[t] ?? Ga,', 'r = e.parkedPanes?.[t] ?? Ga;'] },
  // cc43287c9 uH / dH: the lazy code_session_view rail host and its handle (`qc({ entry: nc, pick: (e) =>
  // e.EpitaxySessionRailHost, … })`); the host provides the rail content through SessionRailHostContext.
  'cc43287c9-Me-M2ucD.js:uH': { name: 'LazySessionRailHost', features: ['pick: (e) => e.EpitaxySessionRailHost,', 'overlayHost: "LazyEpitaxySessionRail.EpitaxySessionRailHost",'] },
  'cc43287c9-Me-M2ucD.js:dH': { name: 'sessionRailLazyHandle', features: ['pick: (e) => e.EpitaxySessionRailHost,', 'overlayHost: "LazyEpitaxySessionRail.EpitaxySessionRailHost",'] },
};

// Original bindings this kit must not slice although nothing else provides them. Each entry says why a second copy is
// harmless; anything that holds state is never listed here.
const duplicates = {
  // shared-frame dg / ug: whether a pointer offset lies on the element's scrollbar (the overlay's outside-click test).
  'shared-frame-6jtSkIit.js:dg': 'pure function (no state)',
  'shared-frame-6jtSkIit.js:ug': 'pure function (no state)',
};
// Contexts view-tabs also instantiates that a kit slice may own a second instance of, each with the reason no reader of
// this copy can sit under a provider of the other one.
const contextDuplicates = {};

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text (R2: literals, keys, classes, ids).
// 3.6556.2 bodies are React Compiler output: their cache helpers (J9 J0…J5 K0…K5 I1…I5 Z1…Z5) resolve to the view-tabs
// semantic names (E3), never sliced again. Export names are those of 2.42304.0 (R4/E7).
const modules = [
  // ---- runtime the rail stores and parts are built on ----
  // vendor-all-0: zustand's React create (v), the persist middleware (ue), createJSONStorage (le), the vanilla
  // createStore (m) and useStore (g). The rail section store (c227f4d5e x6) and the shown store (shared-20 Ah) persist
  // through them; the shell's non-persisted shown store (cc43287c9 IH / LH) is createStore + useStore.
  { target: 'react-store.mjs', source: 'vendor-all-0-DXM0MGjZ.js',
    exports: { v: 'create', ue: 'persist', le: 'createJSONStorage', m: 'createStore', g: 'useStore' },
    features: { v: ['(e) => (e ? _(e) : _)'], ue: ['version: 0,'], le: ['getItem: (e) =>'], m: ['(e) => (e ? p(e) : p)'],
      g: ['.useSyncExternalStore(', 'e.subscribe,', '() => t(e.getInitialState()),'] } },
  // shared-0: the console logger (Ui), the log categories (F) and the guarded window storage getter (Xr, view-tabs'
  // getWindowStorage in 3.6556.2: re-exported, one copy) that the localStorage guard below writes through.
  { target: 'logger.mjs', source: 'shared-0-DDOOdL6P.js', exports: { Ui: 'logger', F: 'LOG_CATEGORIES', Xr: 'windowStorage' },
    features: { Ui: ['debug: (e, ...t) => {},', 'console.warn(e, ...', '__errorMarked: (e, t, ...n) => {'], F: ['LOCAL_STORAGE: "[LOCAL_STORAGE]",'],
      Xr: ['if (typeof window > "u") return', 'return window[e] ??'] } },
  // shared-52 Qh: the guarded localStorage (`Zh(() => cn("localStorage"), "local_storage", Xh)`: every call in a try,
  // a quota error evicts the listed caches first) both rail stores persist into; K: a plain-object test (Ah's merge).
  { target: 'local-storage.mjs', source: 'shared-52-uHFNjl7C.js', exports: { Qh: 'guardedLocalStorage', K: 'isPlainRecord' },
    features: { Qh: ['("localStorage"), "local_storage",'], K: ['return typeof e == "object" && !!e && !Array.isArray(e);'] } },
  // shared-0 sW (moved from shared-78 xL): the same plain-object test in its own chunk (x6's merge reads this copy).
  { target: 'plain-object.mjs', source: 'shared-0-DDOOdL6P.js', exports: { sW: 'isPlainObject' },
    features: { sW: ['return typeof e == "object" && !!e && !Array.isArray(e);'] } },
  // c25d7186f: the CDS design tokens (the row's `--cds-outset-x`). Byte-identical in 3.6556.2; the chunk is data plus
  // three defineProperty statements on its chart palettes, so it is emitted whole.
  { target: 'cds-tokens.mjs', source: 'c25d7186f-CHE_J2eY.js', whole: true, exports: { i: 'cdsTokens' },
    rawFeatures: ['md:{cssVar:"var(--cds-pad-md)",value:"0.5rem"', 'Object.defineProperty(e.chart.categorical,"byHue",{value:r});var i=e;export{i as t};'] },
  // shared-frame: clipboard write (ca) and window open (ua) through the element's own window (the branch chip's Copy
  // branch name / Open branch on GitHub), the reduced-motion subscription (Mh, the card presence's fade) and whether
  // the CDS owner window is another window than this one (co, the rail toggle telemetry's in_popout).
  { target: 'window-actions.mjs', source: 'shared-frame-6jtSkIit.js',
    exports: { ca: 'writeClipboardText', ua: 'openWindow', Mh: 'useReducedMotion', co: 'useInOtherWindow' },
    features: { ca: ['.navigator.clipboard.writeText(t), "written");'], ua: ['.open(t, n, r), !0) : !1;'], Mh: ['function Mh()'],
      co: ['e !== void 0 && e !== globalThis.window;'] },
    closureFeatures: { Mh: ['typeof window.matchMedia=="function"?window.matchMedia(', 'attributeFilter:['] } },
  // shared-frame dg: whether a pointer offset lies on the element's scrollbar (the overlay ignores such a pointerdown).
  { target: 'scrollbar-hit.mjs', source: 'shared-frame-6jtSkIit.js', exports: { dg: 'pointOnScrollbar' },
    features: { dg: ['if (r.display === "inline") return !1;', 'r.direction === "rtl" ?'] } },
  // shared-25 gf: the element window's ResizeObserver (view-tabs' getResizeObserverClass in 3.6556.2: re-exported);
  // shared-5 Cy: the ResizeObserver size hook with `select` the fit test (shared-18 Yx) reads.
  { target: 'owner-resize-observer.mjs', source: 'shared-25-DOWZRSlq.js', exports: { gf: 'ownerResizeObserver' },
    features: { gf: ['?.ResizeObserver ?? globalThis.ResizeObserver;'] } },
  { target: 'element-size.mjs', source: 'shared-5-Bg6ZMqvt.js', exports: { Cy: 'useElementSize' },
    features: { Cy: ['"select" in n ? n.select : null,', 'let e = t.getBoundingClientRect();', 'r.observe(t, { box: i }),'] } },
  // c30c42d34 u: when a rail menu (or the card's section) that holds focus unmounts, focus the nearest tabindex=-1
  // ancestor up to the aside (3.6556.2: or the first button of `successorIn`).
  { target: 'rail-focus-rescue.mjs', source: 'c30c42d34-B0SRB643.js', exports: { u: 'useRailFocusRescue' },
    features: { u: ['sectionWide: n,', 'portaled: r,', 'successorIn: a,', 'e.tagName !== "ASIDE"'] } },
  // cc5183ea5 r: the six-dot grip glyph of the card's reorder handle.
  { target: 'grip-dots.mjs', source: 'cc5183ea5-B0t0M3XC.js', exports: { r: 'GripDots' },
    features: { r: ['"grid grid-cols-2 gap-[3px]"'] } },
  // vendor-intl tn: react-intl defineMessages, the identity (the section titles and the remote link labels).
  { target: 'define-messages.mjs', source: 'vendor-intl-DYfox5Co.js', exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  // c5da7eb42 Up (c4008a6e7 A merged into it): "Open branch on GitHub" / "Open branch on {host}" (and the repository
  // forms) for a remote URL.
  { target: 'remote-link-label.mjs', source: 'c5da7eb42-XijZdwf1.js', exports: { Up: 'remoteLinkLabel' },
    features: { Up: ['t === "repository" ?', '{ host: i },'] } },
  // shared-78 t3 (from shared-104 Dz): the lazy component's preload props (pointer enter / focus / pointer down call
  // `preload("intent")`); L4 (from shared-104 pz): pick named fields of a query result.
  { target: 'lazy-preload.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { t3: 'useLazyPreloadProps', L4: 'pickFields' },
    features: { t3: ['?.preload("intent");', 'onPointerEnter: n, onFocus: n, onPointerDown: n'], L4: ['for (let r of e) n[r] = t[r];'] } },
  // shared-8 pR: a click that came from the keyboard (detail 0, no pointer type); vX / hX: a usage meter's severity
  // class and the severity a percentage reaches (the rail pct meter).
  { target: 'keyboard-click.mjs', source: 'shared-8-Db1QN4mf.js', exports: { pR: 'isKeyboardClick', vX: 'severityFillClass', hX: 'usageSeverity' },
    features: { pR: ['return e.detail === 0 && !("pointerType" in e && e.pointerType);'], vX: ['function vX(e)'],
      hX: ['? "critical" :', '? "warning" : "normal";'] } },
  // c81ea1931 e (byte-identical): the mouse-down guard that keeps focus where it is (the titlebar toggle's onMouseDown).
  { target: 'prevent-mouse-down.mjs', source: 'c81ea1931-ChuE7vym.js', exports: { e: 'preventMouseDown' }, features: { e: ['return e.preventDefault();'] } },
  // shared-1 wV: the toggle's icon name, "ListCard".
  { target: 'rail-icon-name.mjs', source: 'shared-1-BJhqMmkf.js', exports: { wV: 'RAIL_TOGGLE_ICON' }, features: { wV: ['= "ListCard"'] } },

  // ---- rail layout, column marker and the shown store ----
  // shared-6 xg / Hh: the docked column marker (`data-epitaxy-rail-column`, which the overlay tile measures) and the
  // overlay titlebar shift class the docked column wears. qh: the empty slot c73f45bc3 draws instead of the origin box
  // when its origin is null, the session titlebar's lead in rail mode (R4f-rail fix).
  { target: 'rail-column.mjs', source: 'shared-6-sd9jbJqs.js',
    exports: { xg: 'RAIL_COLUMN_ATTRIBUTE', Hh: 'RAIL_OVERLAY_SHIFT_CLASS', qh: 'LEAD_NO_ORIGIN_CLASS' },
    features: { xg: ['= "data-epitaxy-rail-column"'], Hh: ['epitaxy-overlay-rail-shift'],
      qh: ['"w-[max(0px,calc(1rem-var(--tiles-padding,0px)-var(--tiles-border,1px)))] shrink-0"'] } },
  { target: 'rail-layout.mjs', source: 'shared-18-D3y8YMFN.js',
    exports: {
      Tx: 'RAIL_WIDTH_CLASS', Ex: 'RAIL_FLAT_ATTRIBUTE', Dx: 'RailFlatContext', Ox: 'RAIL_CARD_CLASS', kx: 'RAIL_STACK_CLASS',
      Ax: 'RAIL_SECTION_ATTRIBUTE', jx: 'RAIL_SLOT_CLASS', Mx: 'RAIL_SLOT_DIVIDER_CLASS', Ux: 'RAIL_DOCKED_COLUMN_CLASS',
      Wx: 'RAIL_FIT_ALONE', Gx: 'RAIL_FIT_BESIDE_PANE', Kx: 'railFit', qx: 'railFits', Yx: 'useRailFits', tS: 'railRaisesPickers',
      nS: 'RAIL_OVERLAY_COLUMN_CLASS', rS: 'RAIL_OVERLAY_CARD_CLASS', zx: 'RAIL_CHAT_GEOMETRY_CLASS', Ix: 'RAIL_GUTTER_CLASS',
      Lx: 'RAIL_TITLEBAR_INSET_CLASS', Rx: 'RAIL_CONTAINER_CLASS', Bx: 'RAIL_BAND_PADDING_CLASS', Vx: 'RAIL_SCROLL_BLEED_CLASS',
      Hx: 'RAIL_BAND_START_CLASS', Fx: 'RAIL_OVERFLOW_ATTRIBUTE', Mb: 'titlebarTextClass', wU: 'RAIL_POPUP_COLLISION_PADDING',
      Zx: 'releaseFlatComposerMenu', Xx: 'FLAT_RELEASED_MENUS',
    },
    features: {
      Tx: ['= "w-[var(--session-rail-w,17.5rem)]"'], Ex: ['= "data-session-rail-flat"'], Dx: ['(!1);'],
      Ox: ['[[data-session-rail-flat]_&]:shadow-none'], kx: ['[[data-session-rail-flat]_&]:gap-0'], Ax: ['= "data-rail-section"'],
      jx: ['has-[[data-rail-section]]:flex'], Mx: ['[[data-session-rail-flat]_:not(:empty):not([data-rail-slot-off])~&]:border-t'],
      Ux: ['flex-col pt-3 pb-0.75 end-[var(--session-rail-end)]'],
      Wx: ['= 320 +'], Gx: ['= 760 +'], Kx: ['? "beside-pane" :', '? "alone" : "none";'],
      qx: ['return t ? e === "beside-pane" : e !== "none";'], Yx: ['box: "border-box",', 'initial: "none",', 'sync: !0'],
      tS: ['return !i && e && !t && !n && r;'], nS: ['end-[var(--titlebar-end-inset,0.5rem)]'], rS: ['shadow-panel-md'],
      zx: ['[--session-rail-w:17.5rem]', '[--session-rail-column-start:'], Ix: ['[--session-rail-g:var(--session-rail-gutter,24px)]'],
      Lx: ['[--titlebar-end-inset:'], Rx: ['= "@container"'], Bx: ['pe-[calc(var(--session-rail-w)+var(--session-rail-end))]'],
      Vx: ['-me-[calc(var(--session-rail-w)+var(--session-rail-end))]'], Hx: ['-start-[var(--session-rail-band-start,0px)]'],
      Fx: ['= "data-session-rail-overflow"'], Mb: ['() ? void 0 : e;'], wU: ['{ top: 48, right: 8, bottom: 8, left: 8 }'],
      Zx: ['!n.pickerRowMounted &&', '.setState({ openComposerMenu: null });'], Xx: ['new Set(["model", "mode", "permissions", "effort"])'],
    } },
  // shared-20 Ah / jh: the persisted shown store (`persisted.epitaxy.sessionRailShown`, version 1, shown by default)
  // and its selector; Th .. wh: the panels-part row classes the card reads; gp: the titlebar toggle's icon element.
  { target: 'rail-shown-store.mjs', source: 'shared-20-mUr7IqZY.js',
    exports: { Ah: 'sessionRailShownStore', jh: 'selectRailShown', Th: 'PANELS_ICON_SIZE', bh: 'PANELS_LINED_ROW_CLASS', yh: 'PANELS_CARD_CLASS',
      vh: 'PANELS_USAGE_CARD_CLASS', Sh: 'PANELS_ROW_HEIGHT_CLASS', Ch: 'PANELS_LEADING_CLASS', wh: 'PANELS_GAP_CLASS', gp: 'titlebarIcon' },
    features: { Ah: ['name: "persisted.epitaxy.sessionRailShown",', 'version: 1,', 'shown: !0,', 'typeof e.shown == "boolean" ? e.shown : t.shown,'],
      jh: ['return e.shown;'], Th: ['= { size: "auto" }'], bh: ['[.epitaxy-rail-lined_&]'], yh: ['.join(" ")'],
      vh: ['"[&_.flex-col.outline-none]:gap-0.5"'], Sh: ['= "min-h-6"'], Ch: ['= "leading-4"'], wh: ['= "gap-0.5"'], gp: ['{ name: e }'] } },

  // ---- c68c4283d / shared-9 / cced621b6 / cccebaa3a: section ids, the fizzy icon picks, the repo icon ----
  // c68c4283d g / _ (exported pp / mp): the rail section ids (moved here from c227f4d5e xZ in 3.6556.2) and the id test.
  { target: 'rail-section-ids.mjs', source: 'c68c4283d-CWbOoVxS.js', exports: { g: 'RAIL_SECTION_IDS', _: 'isRailSectionId' },
    features: { g: ['"environment",', '"backgroundTasks",'], _: ['.some((t) => t === e);'] } },
  // shared-9 yw / Sw (exported wt / Ct): an icon name only while the fizzy-lake "icons" part is on (E12: Qm = [], never),
  // and the drop style of the filled caret.
  { target: 'fizzy-icon.mjs', source: 'shared-9-CM21XrJw.js', exports: { yw: 'fizzyIconName', Sw: 'FIZZY_CARET_DROP_STYLE' },
    features: { yw: ['("icons") ? e : void 0;'] } },
  // cced621b6 n (exported t): the rail card caret, `CaretRightFilled` (sm) under the fizzy icons part, else undefined
  // (the card draws CaretRight xs, C1-2).
  { target: 'rail-caret-icon.mjs', source: 'cced621b6-BqCKLL3Y.js', exports: { n: 'railCaretIcon' },
    features: { n: ['("CaretRightFilled")', 'headSize: "sm",'] } },
  // cccebaa3a e (exported t): the add-folder button's icon when the session has a repository (C1-7).
  { target: 'rail-repo-icon.mjs', source: 'cccebaa3a-DQt76PcF.js', exports: { e: 'RAIL_REPO_ICON' }, features: { e: ['= "BookClosed";'] } },

  // ---- c227f4d5e: section store and rules, rows ----
  // x6: `epitaxy.sessionRailSections` (folds per session, startsOpen by hand, hidden, order; plugin sections `plugin:`).
  // RAIL_SECTIONS_FOLDED_BY_DEFAULT is o6 (connectors / context / usage; 2.42304.0 kZ also folded backgroundTasks).
  { target: 'rail-sections-store.mjs', source: 'c227f4d5e-B-FYKrwT.js', reexports: { 'rail-section-ids.mjs': ['RAIL_SECTION_IDS'] },
    exports: { x6: 'railSectionsStore', Q3: 'isRailPluginSection', t6: 'RAIL_SECTIONS_OFF', n6: 'RAIL_SECTIONS_OFF_WHEN_FLAT',
      o6: 'RAIL_SECTIONS_FOLDED_BY_DEFAULT', $3: 'railSectionHideable', i6: 'railSectionExcluded', E6: 'railSectionHidden',
      k6: 'railSectionOrder', a6: 'railHideableSections', A6: 'railSectionsCustomized', T6: 'useRailSectionOpen', D6: 'useRailSectionHidden',
      w6: 'railSectionOpen' },
    features: {
      x6: ['name: "epitaxy.sessionRailSections",', 'setOpenByHand: (t, n, r) =>', 't === "session-rail" ? void 0 : r,', 'startsOpen: t,',
        'resetSections: (t) =>'],
      Q3: ['e.startsWith("plugin:")'], t6: ['= ["progress"]'], n6: ['= ["settings", "usage"]'], o6: ['= ["connectors", "context", "usage"]'],
      $3: ['return e !== "environment";'], i6: ['return r6(e) || (t && e6(n6, e));'], E6: ['e.hidden.includes(t)) : !1;'],
      k6: ['.splice(a.indexOf(t), 0, e);', '{ id: t, before: n }'], a6: ['function a6(e = !1)'],
      A6: ['e.startsOpen[n] ==='], T6: ['(n) => w6(n, e, t)'], D6: ['(n) => E6(n, e, t)'], w6: ['e.startsOpen[n] ?? i'],
    } },
  { target: 'rail-rows.mjs', source: 'c227f4d5e-B-FYKrwT.js',
    exports: {
      JB: 'RailWorktreeMark', qB: 'RailMarkedRow', WB: 'RailRow', KB: 'RailInteractiveRow', YB: 'RailFolderRow', UB: 'RailRowIcon',
      VB: 'RailRowText', LB: 'RailRowSeparator', fV: 'RailRowButton', bB: 'RAIL_ROW_BUTTON_CLASS', dV: 'RailNamedRow',
      gV: 'useRailCardPresence', _V: 'useRailCardLeave', MB: 'RailLimitedList', HB: 'RAIL_ICON_BOX_CLASS', TB: 'railAsideClickGuard',
      nV: 'railSettingsRollup', ZB: 'RailPctMeter', sB: 'RAIL_CARD_PAD_CLASS', fB: 'RAIL_PANEL_TRANSITION_CLASS', dB: 'RAIL_PANEL_CLASS',
      cB: 'RailLiveSlotContext', l6: 'useRailSessionKey', c6: 'RailSessionKeyContext', s6: 'DEFAULT_RAIL_SESSION_KEY',
      hB: 'RAIL_FOCUS_RING_CLASS', pB: 'RAIL_ROW_CLASS', lB: 'RAIL_ROW_GAP_CLASS', gB: 'RAIL_ROW_HOVER_CLASS',
      // R4i-rail RL2: OB (MB's Show more / Show less row) is also the rail PR rows' Show more.
      OB: 'RailShowMoreToggle',
      // 3.6556.2: the overlay forwards a wheel it does not scroll to the transcript (cc43287c9 mH, C1-15).
      kH: 'forwardWheel',
      // V3-w6-rail-host: EB marks a pointer press for TB's flag wB (one copy here); the Context card's pV calls it for a row
      // action with onPress, now that the host hands TN's openers (session-rail-context imports it from this module).
      EB: 'markRailPointerPress',
    },
    features: {
      JB: ['"data-rail-worktree": r,', 'r === "preparing"', 'defaultMessage: "Preparing worktree\\u2026",', 'id: "TLlRYRP6LZ",',
        'defaultMessage: "Worktree on edit",', 'id: "s6jTAlTXBc",', 'defaultMessage: "Not in worktree",', 'id: "ik7GusaS8F",',
        '? "text-accent" : void 0,', 'defaultMessage: "Worktree", id: "Cqp4C6aPD2"',
        '"flex shrink-0 items-center gap-sm ps-sm text-footnote text-secondary"', 'wrapperClassName: `shrink-0 ${'],
      qB: ['"flex w-full min-w-0 items-center"'], WB: ['{ ...e }'],
      KB: ['"[&>button]:h-6.5 [&>button]:w-full [&>button]:max-w-none [&>button]:flex-1 [&>button]:justify-start [&>button]:ps-8 [&>button]:pe-xs"'],
      YB: ['repository: n,', ': "Folder";', 'flushStart: !0,'],
      UB: ['("panels") &&', 'size: n'], VB: ['"flex min-w-0 flex-1 text-start text-primary"'], LB: ['children: "\\u00B7",'],
      fV: ['type: "button",', '"aria-label": i,', 'lazy: !0, content: n, detail: r,'], bB: ['`${pB} ${hB} ${gB}`'],
      dV: ['`group/setting ${', 'htmlFor: n,', 'cursor-interactive truncate'], gV: ['{ content: e, leaving: !1, onLeft: u }'],
      _V: ['?.closest("[data-rail-card]")', '.setAttribute("inert", "")'], MB: ['onKeyDownCapture: w,', 'byPointer: !If(e.nativeEvent),', 'role: "presentation",'],
      HB: ['"flex size-5 shrink-0 items-center justify-center text-secondary"'],
      OB: ['defaultMessage: "Show more", id: "aWpBzjCXKS"', 'defaultMessage: "Show less", id: "qyJtWyZ0yt"', '"aria-expanded": t,'],
      TB: ['e.detail <= 1 ?', '(e.stopPropagation(), e.preventDefault());'],
      EB: ['If(e.nativeEvent) || (wB = !0);'],
      nV: ['.querySelector(`[${', 'return typeof t == "string" ? { text: n, warning: t } : n;'],
      ZB: ['"flex h-2.5 w-6 shrink-0 rounded-full bg-alpha-2 p-0.5"'], sB: ['= "px-md"'],
      fB: ['data-[ending-style]:h-auto'], dB: ['= "epitaxy-rail-panel"'], cB: ['(void 0);'], l6: ['function l6()'], c6: ['(s6);'],
      s6: ['= "session-rail"'], hB: ['= "rounded focus-visible:outline-hidden focus-visible:shadow-focus"'],
      pB: ['= "flex min-h-6.5 w-full min-w-0 items-center gap-sm px-xs text-body"'],
      lB: ['"flex min-h-6.5 w-full min-w-0 items-center gap-md px-xs text-body"'],
      gB: ['[&[aria-haspopup][aria-expanded=true]]:bg-fill-ghost-hover'],
      kH: ['?.WheelEvent ?? WheelEvent;', 'new n("wheel", {', 't.deltaMode === 1 ? 16 : t.deltaMode === 2 ? 800 : 1;'],
    } },

  // shared-16 xl (exported ui): a lazily built menu body (the branch chip's requestBody / triggerProps, C2-5).
  { target: 'lazy-body.mjs', source: 'shared-16-ByfgAyLr.js', exports: { xl: 'useLazyBody' },
    features: { xl: ['requestBody: u,', 'triggerProps: h,', 'onPointerDownCapture: l,', 'openOnHover === !0'] } },

  // ---- c96d752d0 (3.6556.2; c0a531389 merged into it): the branch chip and the two row contexts ----
  // gL = memo(Ske): the chip reads its face from mL ("mono" by default), builds its menu body lazily (lazyTooltip /
  // requestBody / triggerProps, C2-5); hL: the Changes row layout context ("stacked" by default). The head / tail split
  // (pL) is code-current environment-name-parts.mjs (3.6556.2 c96d752d0 pL since the W9 gate), imported, not sliced again (D1).
  { target: 'branch-chip.mjs', source: 'c96d752d0-CWv_7-n9.js', exports: { gL: 'BranchChip', mL: 'BranchChipFaceContext', hL: 'ChangesRowLayoutContext' },
    features: { gL: ['(Ske);'], mL: ['("mono");'], hL: ['("stacked");'] } },

  // ---- c73f45bc3: the rail card ----
  // xx: the card (C1-1 header div, C1-2 caret `rotate`, C1-3 the `[data-rail-grab]` layer, C1-4 open changes by reason:
  // a trigger press opens by hand, Alt sets all); oS: the flat gate; ux / lx: the section titles; ix: the grip context;
  // d_: the toggle's press handler (telemetry, then onToggle); ox: the engine plugin sections ({ id, title }[], [] by
  // default; the rail view provides them, panes:C1-5 not-applicable-host).
  { target: 'rail-card.mjs', source: 'c73f45bc3-B7hbL7H9.js',
    exports: { xx: 'RailCard', oS: 'useRailFlat', ux: 'railSectionTitle', lx: 'RAIL_SECTION_TITLES', ix: 'RailCardGripContext', d_: 'useRailToggleHandler',
      ox: 'RailPluginSectionsContext' },
    features: {
      xx: ['"group/railcard flex shrink-0 flex-col py-md"', 'n.reason !== "trigger-press"', 'n.event.altKey ?', '?.closest("[data-rail-grab]")',
        '"aria-hidden": !0,', '"data-rail-grab": "",', 'name: f?.name ?? "CaretRight",', 'size: f?.headSize ?? "xs",', 'rotate: g,',
        'hideCaret: !0,', '"flex min-w-0 flex-1 rounded group-data-[rail-menu-open]/railtop:bg-alpha-1"', '"aria-labelledby": O,',
        'keepMounted: de,'],
      oS: ['function oS()'], ux: ['.formatMessage(lx[t]);'], lx: ['pullRequests: { defaultMessage: "Changes", id: "dgqhUM6BxJ" },'], ix: ['(null);'],
      d_: ['e.onScreen ||', '"show_raised"', 'e.onToggle(r)'], ox: ['([]);'],
    } },

  // ---- cc43287c9: the rail shell ----
  // TH: the titlebar toggle (Hide / Show session rail tooltip, aria-label "Session rail", `unseen` → opacity 0); EH: the
  // region opener; hH / AH: the docked column and the overlay with kH / DH / OH (Escape and outside pointerdown close,
  // focus back to the toggle) and mH / pH / fH (a vertical wheel the rail does not scroll goes to the transcript); NH /
  // FH / HH / PH: the shown store context (a split window holds per-session shown values), its provider, hook, setter.
  { target: 'rail-shell.mjs', source: 'cc43287c9-Me-M2ucD.js',
    exports: { TH: 'SessionRailToggle', SH: 'FLAT_TOGGLE_STYLE', EH: 'SessionRailOpener', hH: 'SessionRailDockedColumn', AH: 'SessionRailOverlay',
      kH: 'useRailOverlayDismiss', DH: 'outsideLayer', OH: 'onScrollbar', mH: 'useRailWheelHandoff', pH: 'wheelStaysInRail', fH: 'scrollsVertically',
      NH: 'RailShownStoreContext', FH: 'RailShownStoreProvider', HH: 'useRailShown', PH: 'selectSetRailShown' },
    features: {
      TH: ['defaultMessage: "Hide session rail",', 'id: "U0R7oYkTM1",', 'defaultMessage: "Show session rail",', 'id: "JYaBivMdHH",',
        'defaultMessage: "Session rail", id: "FUvHAfJy+j"', 'unseen: a', 'variant: "ghost",', 'iconOnly: !0,', 'pressed: t.onScreen,',
        'pressedVariant: "selected",', '"aria-expanded": C,', '"aria-controls": w,', '"aria-label": h,', '(t, "titlebar")'],
      SH: ['"--cds-bg-accent": "var(--cds-fill-ghost-selected)",'], EH: ['kind: "opener",', 'region: "sessionDetails",', '(t, "command_palette")'],
      hH: ['onWheel: c,', 'sessionRef: t,', 'scrollRef: s,'], AH: ['role: "group",', 'defaultMessage: "Session details",', 'id: "v52hoKcuPM",',
        'outline-none`,', 'className: "h-full w-full",', 'focusOnMount: u,', 'onDismiss: d,'],
      kH: ['if (n.key !== "Escape" || n.defaultPrevented) return;', 'e.addEventListener("pointerdown", c, !0),'], DH: ['.ownerDocument.body;'],
      OH: ['e.pointerType !== "touch" &&', '(e.offsetX, e.offsetY, t);'],
      mH: ['t.ctrlKey ||', 't.deltaY === 0 ||', 'Math.abs(t.deltaY) <= Math.abs(t.deltaX) ||', '{ deltaY: t.deltaY, deltaX: 0, deltaMode: t.deltaMode }'],
      pH: ['if (n === null || !t.contains(n)) return !0;'], fH: ['return t === "auto" || t === "scroll";'],
      NH: ['holdsInSplit: !0'], FH: ['.Provider, { value: n, children: t }'], HH: ['holdsInSplit: r', 'e.shown.get(s)', '{ shown: l, setShown: f }'],
      PH: ['return e.setShown;'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  // cc43287c9 yH: while the rail is off screen, a composer request to open a picker raises it. Flat (D10): the model /
  // mode / permissions / effort pickers are released (shared-18 Zx, rail-layout.mjs releaseFlatComposerMenu) and only
  // the context menu raises the rail; then the composer menu shortcuts and the bridge session query (claude.ai Remote
  // Control, not applicable here).
  { source: 'cc43287c9-Me-M2ucD.js', binding: 'yH', role: 'Composer picker request raises the off-screen rail (flat: only "context"); host: SR-7',
    features: ['pickersElsewhere: a,', 'onRaise: o,', '?.menu === "context" && o());', '.has(c.menu) && !(s &&', 'bridgeSessionUrl'] },
  // cf74bc599 DA: the session pane titlebar's ⋮ menu body. With the rail toggle folded into it, the first group is the
  // one item "Hide session rail" / "Show session rail" (icon ListCard), selecting the toggle's press handler; host: SR-6.
  { source: 'cf74bc599-CRYqipWN.js', binding: 'DA', role: 'Titlebar ⋮ menu: the folded rail toggle is the first group (host: SR-6)',
    features: ['label: a?.onScreen', 'defaultMessage: "Hide session rail",', 'defaultMessage: "Show session rail",', 'onSelect: l,'] },
];
// Pinned on the minified bytes: each must occur exactly once. `loose` features go through official.looseFeature (R2:
// identifiers of up to three characters generalized, literals and keys kept).
const rawCallSites = [
  // The presets gate the rail reads (shared-11 gc, exported us; _c, exported ns; the hook form Pc, exported ds). D10:
  // on. `cai_epitaxy_worktree` (bc = presets ∧ worktree) is a new GrowthBook gate, off in this host (E13).
  { source: 'shared-11-_AVGLHEz.js', role: 'Presets gate (us = gc, ns = _c, rs = vc; the hook form ds = Pc is the useSessionPresetsFlat adapter) read one GrowthBook key; D10 on. Worktree gate bc off (E13)',
    loose: true, keep: ['hc'],
    features: ['var hc="claudeai_cc_epitaxy_session_presets_main";function gc(){return L(hc)}function _c(){return gc()}function vc(){return Ut(hc)}',
      'var yc="cai_epitaxy_worktree";function bc(){let e=gc(),t=L(yc);return e&&t}'] },
  // shared-4 nd: the lazy chunk behind uH / dH (cf74bc599 exports EpitaxySessionRailHost).
  { source: 'shared-4-DUB1Oi0O.js', role: 'Lazy entry code_session_view loads cf74bc599 (host: bundled, SessionRailHostContext)', loose: true,
    features: ['={id:"code_session_view",tier:"T2",largeClosure:!0,onUnrecoverable:"reload",load:()=>v(()=>import("./cf74bc599-CRYqipWN.js")'] },
  { source: 'cc43287c9-Me-M2ucD.js', role: 'Lazy rail host and handle (host adapters LazySessionRailHost / sessionRailLazyHandle)', loose: true,
    features: ['var{Component:uH,handle:dH}=qc({entry:nc,pick:e=>e.EpitaxySessionRailHost,options:{loading:()=>p(pF,{})},overlayHost:"LazyEpitaxySessionRail.EpitaxySessionRailHost"})'] },
  // The rail state machine of the Code session view: the fit test, the shown store hook read with the session key and
  // the split-window flag (HH(pe, Nt); the host's useRailShown() passes neither), rail mode / docked / overlay. Host: SR-7.
  { source: 'cc43287c9-Me-M2ucD.js', role: 'Code session view rail state machine (host: SR-7)', loose: true,
    features: ['{shown:dn,setShown:fn}=HH(pe,Nt),pn=an&&sn&&!ee&&dn&&un,mn=sn&&(!an||pn),hn=mn&&!xe,gn=sn&&!xe,_n=hn?ie:null,vn=_n!==null,yn=vn&&dn&&un,bn=(vn||pn||hn&&ae==="spawning")&&dn&&un;gH(bn&&!vn,ae==="spawning");let[xn,Sn]=M(null),Cn=_n!==null&&!yn&&xn?.id===_n.id;xn!==null&&!Cn&&Sn(null);let wn=yn||Cn'] },
  // Where the session view mounts the pieces: the opener inside the chat region, the overlay, yH while the rail is off
  // screen, and after the chat panel body the docked column (or the spawning draftRail slot).
  { source: 'cc43287c9-Me-M2ucD.js', role: 'Code session view mount points of EH / AH / yH / hH (host: SR-7)', loose: true,
    features: ['vn&&!B&&p(EH,{model:Fn,scopeRef:dt})',
      'Cn&&_n&&p(AH,{sessionRef:_n,scopeStore:G,mountKey:t,isPanelActive:Pt,onRequestComposerFocus:Qn,readOnly:Me||Xt,scrollRef:lt,panelId:An,toggleRef:kn,focusOnMount:xn?.focus===!0,onDismiss:Mn})',
      '_n&&!wn&&p(yH,{sessionRef:_n,scopeStore:G,isPanelActive:Pt,readOnly:Me||Xt,pickersElsewhere:En,onRaise:jn})',
      'bn?_n?p(hH,{sessionRef:_n,scopeStore:G,mountKey:t,isPanelActive:Pt,onRequestComposerFocus:Qn,readOnly:Me||Xt,scrollRef:lt}):p("div",{ref:tn,[au]:"",className:Sp}):null'] },
  // The session pane titlebar: TH sits before the agent mark and the panel toggles (`unseen` while the session is not
  // active, new in 3.6556.2); it folds into the ⋮ menu when the titlebar runs out of room. Host: SR-6.
  { source: 'cc43287c9-Me-M2ucD.js', role: 'Session pane titlebar: rail toggle placement and fold into the ⋮ menu (host: SR-6)', loose: true,
    features: ['{railToggleFolded:Qe,hiddenMainPanes:$e}=', 'K2($,57,Ye,Be,IR({railToggleFoldable:Be,hiddenCount:Ye}))',
      'x&&!Qe&&v(y,{children:[p(TH,{model:x,buttonRef:C,onUnmountFocused:tt,inert:!G,unseen:!ae})',
      'railToggle:Qe?x:void 0,railToggleRef:Qe?C:void 0'] },
];

const cache = new Map();
async function readSource(name) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
// The raw text of a binding's same-chunk closure (imports excluded).
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const entry = src.top.get(n);
    if (!entry || entry.kind === 'import') return;
    parts.push(declarationText(src, entry));
    for (const dep of declarationDeps(src, n)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
const normalised = text => text.replace(/\s+/g, ' ');
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

// ---- other generated areas ------------------------------------------------------------------------------------------
const jsonCache = new Map();
async function readJson(file) {
  if (!jsonCache.has(file)) jsonCache.set(file, JSON.parse(await fs.readFile(file, 'utf8')));
  return jsonCache.get(file);
}
function exportedNames(text) {
  const out = new Map();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      out.set(local, [...(out.get(local) ?? []), as ?? local]);
    }
  return out;
}
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const publicByLocal = new Map();
  for (const [name, entry] of Object.entries(viewTabs.publicNames ?? {})) publicByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const viewTabsBindings = new Map();
  for (const m of viewTabs.modules) viewTabsBindings.set(m.source, new Set(m.bindings));
  // code-current mixes versions; only its modules sliced from this snapshot count.
  const codeCurrent = await readJson(path.join(generatedRoot, 'code-current/manifest.json'));
  const codeCurrentByLocal = new Map();
  for (const m of codeCurrent.modules) {
    if (m.referenceVersion !== referenceVersion || !m.source.includes(`/${referenceSnapshot}/`)) continue;
    const file = path.basename(m.source);
    const names = (m.bindings ?? []).map(b => (typeof b === 'string' ? b : b.name));
    for (const local of names) {
      const key = `${file}#${local}`;
      if (!codeCurrentByLocal.has(key)) codeCurrentByLocal.set(key, []);
      codeCurrentByLocal.get(key).push(m.target);
    }
  }
  areas = { publicByLocal, viewTabsBindings, codeCurrentByLocal };
  return areas;
}
const codeCurrentExports = new Map();
async function codeCurrentExport(target) {
  if (!codeCurrentExports.has(target)) codeCurrentExports.set(target, exportedNames(await fs.readFile(path.join(generatedRoot, 'code-current', target), 'utf8')));
  return codeCurrentExports.get(target);
}

// vendor-frame: the export alias of `local` that official.reactAliases lists, proved once (R3).
const provedAliases = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const alias = [...src.exported].find(([name, l]) => l === local && Object.hasOwn(official.reactAliases, name))?.[0];
  if (!alias) return null;
  if (!provedAliases.has(alias)) { official.assertVendorAlias(src.code, alias); provedAliases.add(alias); }
  const [module, member] = official.reactAliases[alias];
  return { from: module, name: member };
}
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

export async function extractSessionRailKit({ check = false, explore = null } = {}) {
  const { publicByLocal, viewTabsBindings, codeCurrentByLocal } = await loadAreas();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-rail-kit.mjs',
    adapterModule: 'src/source-session-rail-kit-adapters.jsx', modules: [], publicNames: {}, callSites: [],
  };
  const files = {};
  const exploring = explore;
  const kitOwner = (file, local) => emitted.find(m => m.spec.source === file && Object.hasOwn(m.spec.exports, local));
  // Resolves the original binding file:local to an import, or null when it is to be sliced (same chunk only).
  const resolveBinding = async (spec, file, local, via) => {
    const self = path.join(output, spec.target);
    const adapter = spec.adapters?.[`${file}:${local}`] ?? adapters[`${file}:${local}`];
    if (adapter) {
      const dep = await readSource(file);
      const original = dep.top.get(local);
      if (!original || original.kind === 'import') throw Error(`${spec.target}: adapter ${via} (${local}) is not a declaration of ${file}`);
      assertFeatures(`${spec.target}: adapter ${via} (${local})`, adapter.closure ? closureText(dep, local) : await featureText(dep, original), adapter.features);
      return { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: `${file}:${local}` };
    }
    const owner = kitOwner(file, local);
    if (owner) return { from: `./${owner.spec.target}`, name: owner.spec.exports[local], via, kind: 'generated', original: `${file}:${local}` };
    const pub = publicByLocal.get(`${file}#${local}`);
    if (pub) return { from: rel(self, path.join(generatedRoot, 'view-tabs', pub.file)), name: pub.name, via, kind: 'view-tabs', original: `${file}:${local}` };
    const react = await reactMember(file, local);
    if (react) return { ...react, via, kind: 'react' };
    const current = codeCurrentByLocal.get(`${file}#${local}`);
    if (current) {
      for (const target of current) {
        const names = (await codeCurrentExport(target)).get(local);
        if (names?.length) return { from: rel(self, path.join(generatedRoot, 'code-current', target)), name: names[0], via, kind: 'code-current', original: `${file}:${local}` };
      }
      if (!duplicates[`${file}:${local}`]) {
        const message = `${spec.target}: ${via} (${local}) is sliced by code-current (${current.join(', ')}) but not exported; it must not be sliced twice`;
        if (!exploring) throw Error(message);
        exploring.push({ target: spec.target, via: 'DUPLICATE', local: `${file}:${local}`, size: current.join(', ') });
      }
    }
    return null;
  };
  for (const spec of modules) {
    const src = await readSource(spec.source);
    const self = path.join(output, spec.target);
    if (spec.whole) {
      // A self-contained chunk emitted as it is (no imports; its exports renamed).
      if (src.ast.program.body.some(n => n.type === 'ImportDeclaration')) throw Error(`${spec.target}: ${spec.source} has imports`);
      assertFeatures(`${spec.target}: ${spec.source}`, src.code, spec.rawFeatures);
      const body = src.code.replace(/export\s*\{[^}]*\}\s*;?\s*$/, '');
      if (body === src.code) throw Error(`${spec.target}: no trailing export in ${spec.source}`);
      for (const local of Object.keys(spec.exports)) if (!src.top.has(local)) throw Error(`${spec.target}: ${local} is not a declaration of ${spec.source}`);
      const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
      const header = `// Original Claude Desktop ${referenceVersion} chunk ${spec.source} (whole, bytes as installed but the export line);\n// generated by extract-session-rail-kit.mjs. Edit the extractor, never this file.\n`;
      const text = `${header}${body}\n${exportText}\n`;
      babel.babelParse(text, spec.target, true);
      files[spec.target] = text;
      manifest.modules.push({ target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion, whole: true, bindings: [], imports: [], exports: spec.exports });
      emitted.push({ spec });
      for (const [local, name] of Object.entries(spec.exports)) manifest.publicNames[name] = { file: spec.source, local, target: spec.target };
      continue;
    }
    const selected = new Map(), imports = new Map(), seen = new Set(), contexts = [];
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const dep = await readSource(entry.file);
        const local = dep.exported.get(entry.alias);
        const via = `${entry.file}:${entry.alias}`;
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const resolved = await resolveBinding(spec, entry.file, local, via);
        if (resolved) { imports.set(name, resolved); return; }
        if (explore) {
          explore.push({ target: spec.target, via, local, size: closureText(dep, local).length });
          imports.set(name, { from: '__unresolved__', name: local, via, kind: 'unresolved' });
          return;
        }
        throw Error(`${spec.target}: unresolved import ${via} (${local})`);
      }
      const isRoot = Object.hasOwn(spec.exports, name);
      if (!isRoot) {
        const resolved = await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`);
        if (resolved) { imports.set(name, resolved); return; }
      } else {
        const adapter = spec.adapters?.[`${spec.source}:${name}`] ?? adapters[`${spec.source}:${name}`];
        if (adapter) throw Error(`${spec.target}: root ${name} is provided elsewhere`);
        // R4 (w2-rail-kit): a root view-tabs publishes in 3.6556.2 keeps its kit export name as a re-export of the one
        // view-tabs copy (D1), never a second slice.
        if (publicByLocal.has(`${spec.source}#${name}`)) {
          imports.set(name, await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`));
          return;
        }
      }
      if (entry.kind === 'pattern' && explore) { explore.push({ target: spec.target, via: 'PATTERN', local: name, size: 0 }); imports.set(name, { from: '__unresolved__', name, via: 'pattern', kind: 'unresolved' }); return; }
      if (entry.kind === 'pattern') throw Error(`${spec.target}: ${spec.source}:${name} is a destructured declaration; it needs an adapter`);
      if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${spec.target}: unsupported declaration ${name}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
      // A context: its creator resolves to React's createContext. One instance only.
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
        const callee = imports.get(init.callee.name);
        if (callee?.kind === 'react' && callee.name === 'createContext') {
          if (viewTabsBindings.get(spec.source)?.has(name) && !contextDuplicates[`${spec.source}:${name}`]) {
            const message = `${spec.target}: context ${spec.source}:${name} already lives in view-tabs; slicing it would make a second instance`;
            if (!explore) throw Error(message);
            explore.push({ target: spec.target, via: 'CONTEXT', local: name, size: message });
          }
          contexts.push(name);
        }
      }
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      try {
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
        // `closureFeatures`: strings of the root's same-chunk closure (raw text), for a root whose own body is only calls.
        assertFeatures(`${spec.target}: root ${name} (closure)`, closureText(src, name), spec.closureFeatures?.[name]);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'FEATURE', local: name, size: error.message });
      }
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, entry]) => emittedText(src, entry));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => {
      const star = names.filter(n => n.startsWith('* as ')), named = names.filter(n => !n.startsWith('* as '));
      return [...star.map(n => `import ${n} from ${JSON.stringify(from)};`),
        ...(named.length ? [`import { ${named.join(', ')} } from ${JSON.stringify(from)};`] : [])].join('\n');
    }).join('\n');
    // `reexports` (R4): a kit export name whose original moved to another kit module in 3.6556.2 is re-exported from it.
    const reexportText = Object.entries(spec.reexports ?? {}).map(([target, names]) => {
      const owner = emitted.find(m => m.spec.target === target);
      if (!owner) throw Error(`${spec.target}: re-export from ${target}, which is not an earlier kit module`);
      for (const n of names) if (!Object.values(owner.spec.exports).includes(n)) throw Error(`${spec.target}: ${target} does not export ${n}`);
      return `\nexport { ${names.join(', ')} } from "./${target}";`;
    }).join('');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };${reexportText}`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-session-rail-kit.mjs.\n// Edit the extractor or src/source-session-rail-kit-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    if (!explore) {
      // The module must be closed: every identifier it reads is imported or declared in it.
      const closed = babel.babelParse(text, spec.target, true);
      let globals;
      babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
      const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'JSON', 'Symbol', 'Promise', 'RegExp',
        'globalThis', 'setTimeout', 'clearTimeout', 'parseFloat', 'Date', 'Intl', 'undefined', 'Infinity', 'WeakMap', 'WeakSet', 'Boolean',
        'window', 'document', 'console', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'TypeError', 'Reflect',
        'navigator', 'queueMicrotask', 'performance', 'getComputedStyle', 'NaN', 'isNaN', 'Element', 'HTMLElement', 'Node',
        'reportError', 'ResizeObserver', 'URL', 'Event', 'WheelEvent']);
      const unbound = globals.filter(name => !allowed.has(name));
      if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
      ...(spec.reexports ? { reexports: spec.reexports } : {}),
      ...(contexts.length ? { contexts } : {}),
    });
    emitted.push({ spec });
    for (const [local, name] of Object.entries(spec.exports)) {
      if (manifest.publicNames[name]) throw Error(`public name ${name} is used twice`);
      manifest.publicNames[name] = { file: spec.source, local, target: spec.target };
    }
  }
  if (explore) return manifest;
  for (const site of callSites) {
    const src = await readSource(site.source);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  for (const site of rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = site.loose ? [...text.matchAll(official.looseFeature(feature, { flags: 'g', keep: site.keep ?? [] }))].length : text.split(feature).length - 1;
      if (count !== (site.count ?? 1)) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected ${site.count ?? 1}`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, ...(site.loose ? { loose: true } : {}), features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Session rail kit output set changed: ${present.join(',')}. Run scripts/extract-session-rail-kit.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Session rail kit source mismatch: ${name}. Run scripts/extract-session-rail-kit.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session rail kit modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--explore')) {
    const found = [];
    const manifest = await extractSessionRailKit({ explore: found });
    for (const m of manifest.modules) console.log(`${m.target}\t${m.bindings.length} bindings\t${m.imports.filter(i => i.kind !== 'unresolved').map(i => `${i.local}=${i.kind}:${i.name}`).join(' ')}`);
    for (const f of found) console.log(`UNRESOLVED ${f.target}\t${f.via}\t${f.local}\t${f.size}`);
  } else await extractSessionRailKit({ check: process.argv.includes('--check') });
}
