// R4f-rail SR-1: extract the 2.42304.0 Code session rail's primitives and shell, without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/session-rail-kit, own scripts/verify-gen-session-rail-kit.mjs).
// Spec: analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1, §2, §8 SR-1, §10.
//
//   rail-layout.mjs        shared-18: the rail width class (dy, `w-[var(--session-rail-w,17.5rem)]`), the flat marker
//                          (fy, `data-session-rail-flat`) and the flat context (py, provided by the shell, read by every
//                          card), the card / stack / slot classes (my hy gy _y vy), the docked column (ky) and overlay
//                          (By / Vy) classes, the chat column geometry (Ty Sy Cy wy Ey Dy Oy xy), the fit thresholds
//                          (Ay = 611, jy = 771) with My / Ny / Py, zy (pickers under the prompt), Mb (the titlebar text
//                          class), GR (the popup collision padding) and Iy / Fy (the flat rail's composer-menu release).
//   rail-column.mjs        shared-6 lg (`data-epitaxy-rail-column`) and jh (the overlay titlebar shift class).
//   rail-shown-store.mjs   shared-20 zm (`persisted.epitaxy.sessionRailShown`, shown by default) and Bm, the panels
//                          part classes (Fm Am km Om Mm Nm Pm) and Sf (the toggle's icon element).
//   rail-sections-store.mjs c227f4d5e VZ (`epitaxy.sessionRailSections`: folds per session, hidden, order) with the
//                          section rules xZ / wZ / TZ / kZ / SZ and DZ / GZ / JZ / WZ / OZ / YZ / KZ.
//   rail-rows.mjs          c227f4d5e: the worktree mark dR, the row primitives (uR sR cR lR fR oR iR tR OR BL DR), the
//                          card presence jR / MR, the limits list QL, the settings rollup yR, the pct meter mR, the
//                          sessionKey context (MZ jZ AZ), the aside guard GL and the class / context bits the card reads.
//   branch-chip.mjs        c0a531389 A (= memo(k)) the branch chip, D (its face context, "mono" by default) and O (the
//                          Changes row layout context, "stacked" by default). `E` (head / tail split) is code-current's
//                          environment-name-parts.mjs, imported, not sliced again (D1).
//   rail-card.mjs          c73f45bc3 Xv: the rail card (group/railcard, collapsible header, caret, summary / rollup,
//                          header menu with Show / Reset to defaults, reorder grip), with wy (the flat gate) and Vv / Hv
//                          (the section titles).
//   rail-shell.mjs         cc43287c9: the titlebar toggle EH ("Hide session rail" / "Show session rail") with TH, the
//                          region opener DH, the docked column bH and overlay jH with AH / OH / kH (Escape and outside
//                          pointerdown close, focus back to the toggle), the wheel hand-off yH / vH / _H and the shown
//                          store context MH / PH / FH / NH.
//   …                      and the small originals those read (vendor-all-0 zustand create / persist / createJSONStorage,
//                          shared-52 $p localStorage guard, shared-0 logger, shared-78 xL, shared-frame Zi / $i / Nm / fh,
//                          c25d7186f design tokens, c30c42d34 u, cc5183ea5 r, c4008a6e7 A, shared-104 Dz / pz, shared-5 e_).
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk; c25d7186f (the design
// token table, a chunk of plain data plus three defineProperty statements) is emitted whole. A module's bindings are the
// reachable closure of its roots: a declaration's dependencies are its free variables (each declaration is parsed on its
// own; Babel's scope analysis names what it reads from outside). An import or same-chunk binding resolves, in this
// order, to: a host adapter in src/source-session-rail-kit-adapters.jsx (feature-checked against the original it
// replaces), an earlier module of this kit, a semantic public name of the shared view-tabs graph (D1/D24), React (a
// vendor-frame `X = <React namespace>.member`), or a code-current export of the same original binding (one copy: a
// binding code-current already slices is imported from there, never sliced again). Nothing else is accepted, and a
// context (createContext) that view-tabs or code-current already instantiates is refused instead of duplicated.
//
// The kit's manifest publishes `publicNames` (file#local -> module export) so the rail view generators (SR-2 … SR-4)
// import the one copy of each context, store and component from here.
//
// `callSites` pin the original text the host wiring follows but cannot import: jre's rail state machine and its mount
// points, the lazy rail host (hH / gH), the composer-menu raise (wH), the titlebar placement (wW) and the ⋮ menu's
// rail item (cf74bc599 tE).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/session-rail-kit');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-kit-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = 'vendor-frame-DfPJ1QmD.js';

// vendor-frame's React namespaces: `X = <ns>.member` is `import { member } from <module>`. Each namespace is proved by
// strings of the CommonJS factory its closure wraps.
const reactNamespaces = {
  o: { module: 'react', features: ['.useSyncExternalStore=function', '.forwardRef=function', '.useEffectEvent=function'] },
  fe: { module: 'react/jsx-runtime', features: ['.jsxs='] },
  Ln: { module: 'react-dom', features: ['.createPortal=function', '.flushSync=function'] },
};
// vendor-frame's ES namespace object of React (`a = t({ Activity: () => c, … })`): `import * as a from "react"`.
const reactNamespaceObjects = {
  a: { module: 'react', features: ['useInsertionEffect: () => B,', 'useSyncExternalStore: () => G,', 'version: () => re,'] },
};

// Host dependencies, keyed by the original binding (file:local) an import or same-chunk reference resolves to.
// `features` must appear in that binding's prettier form (`closure: true`: in its same-chunk closure).
const adapters = {
  // react-intl useIntl / FormattedMessage / defineMessages over the local catalog (useStartIntl / StartMessage).
  'vendor-intl-Db7hDWRO.js:q': { name: 'useIntl', features: ['let e = o(K);', 'return (Mt(e), e);'] },
  'vendor-intl-Db7hDWRO.js:Gt': { name: 'FormattedMessage', features: ['var Gt = u(Wt, Ut);'] },
  // shared-frame qa / Ya / Ja (exported _u / mu / gu): the CDS layer element, its window and the layer's portal container.
  // No layer element is provided in this host: undefined, the current window, undefined.
  'shared-frame-BfjMqbuN.js:qa': { name: 'useLayerElement', features: ['return W(Oa);'] },
  'shared-frame-BfjMqbuN.js:Ya': { name: 'useLayerOwnerWindow', features: ['return Ji(W(Oa));'] },
  'shared-frame-BfjMqbuN.js:Ja': { name: 'useLayerPortalContainer', features: ['let e = W(Oa),', 't = W(ka),', 'n = W(Aa);', 'return e ?? (n ? void 0 : t);'] },
  // shared-52 Sj (exported Ya): the ErrorsProvider; the host toasts.
  'shared-52-DGviI8xb.js:Sj': { name: 'useErrors', features: ['Error("Must be called within ErrorsProvider")'] },
  // shared-104 wR (exported rt): the account's GitHub sync setting; no claude.ai account here.
  'shared-104-Cqo2-vQh.js:wR': { name: 'useGithubSyncEnabled', features: ['return xr().vcs.github_sync;'] },
  // c68c4283d nn (exported fr): branch chip menu telemetry (D17: nothing is sent).
  'c68c4283d-CPuRD0vx.js:nn': { name: 'logLocalPrMenuAction', features: ['u("claudeai.code.local_pr.menu_action", e);'] },
  // shared-11 ms (exported fo): the presets gate's hook form; D10: on.
  'shared-11-BuQ3CK5I.js:ms': { name: 'useSessionPresetsFlat', closure: true, features: ['return fr(Zo)', 'Zo="claudeai_cc_epitaxy_session_presets_main"'] },
  // shared-4 NE (exported Z): a navigation region's registered body; no region registry here.
  'shared-4-CJsHhp5n.js:NE': { name: 'RegionEntry', features: ['let t = AE((e) => e.body);', 'return t === null ? null : z(t, e);'] },
  // cc43287c9 hH / gH: the lazy code_session_view rail host and its handle (`mc({ entry: cs, pick: (e) =>
  // e.EpitaxySessionRailHost, … })`); the host provides the rail content through SessionRailHostContext.
  'cc43287c9-DAfOi8yP.js:hH': { name: 'LazySessionRailHost', features: ['entry: cs,', 'pick: (e) => e.EpitaxySessionRailHost,', 'overlayHost: "LazyEpitaxySessionRail.EpitaxySessionRailHost",'] },
  'cc43287c9-DAfOi8yP.js:gH': { name: 'sessionRailLazyHandle', features: ['entry: cs,', 'pick: (e) => e.EpitaxySessionRailHost,', 'overlayHost: "LazyEpitaxySessionRail.EpitaxySessionRailHost",'] },
};

// Original bindings this kit must not slice although nothing else provides them. Each entry says why a second copy is
// harmless; anything that holds state is never listed here.
const duplicates = {
  // shared-frame fh / dh: whether a pointer offset lies on the element's scrollbar (the overlay's outside-click test).
  'shared-frame-BfjMqbuN.js:fh': 'pure function (no state)',
  'shared-frame-BfjMqbuN.js:dh': 'pure function (no state)',
};
// Contexts view-tabs also instantiates that a kit slice may own a second instance of, each with the reason no reader of
// this copy can sit under a provider of the other one.
const contextDuplicates = {};

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text.
const modules = [
  // ---- runtime the rail stores and parts are built on ----
  // vendor-all-0: zustand's React create (ee), the persist middleware (me), createJSONStorage (fe), the vanilla
  // createStore (v) and useStore (b). The rail section store (VZ) and the shown store (zm) persist through them; the
  // shell's non-persisted shown store (cc43287c9 PH) is createStore + useStore.
  { target: 'react-store.mjs', source: 'vendor-all-0-CTKbbUUg.js',
    exports: { ee: 'create', me: 'persist', fe: 'createJSONStorage', v: 'createStore', b: 'useStore' },
    features: { ee: ['ee = (e) => (e ? x(e) : x)'], me: ['version: 0,'], fe: ['getItem: (e) =>'], v: ['v = (e) => (e ? _(e) : _)'], b: ['c.useSyncExternalStore('] } },
  // shared-0: the console logger ($r), the log categories (I) and the guarded window storage getter (ZA) that the
  // localStorage guard below writes through.
  { target: 'logger.mjs', source: 'shared-0-ByI5P0CP.js', exports: { $r: 'logger', I: 'LOG_CATEGORIES', ZA: 'windowStorage' },
    features: { $r: ['console.warn(e, ...Qr(t));'], I: ['LOCAL_STORAGE: "[LOCAL_STORAGE]",'], ZA: ['return window[e] ?? XA;'] } },
  // shared-52 $p: the guarded localStorage (`Qp(() => On("localStorage"), "local_storage", Zp)`: every call in a try,
  // a quota error evicts the listed caches first) both rail stores persist into; W: a plain-object test (zm's merge).
  { target: 'local-storage.mjs', source: 'shared-52-DGviI8xb.js', exports: { $p: 'guardedLocalStorage', W: 'isPlainRecord' },
    features: { $p: ['$p = Qp(() => On("localStorage"), "local_storage", Zp)'], W: ['return typeof e == "object" && !!e && !Array.isArray(e);'] } },
  // shared-78 xL: the same plain-object test in its own chunk (VZ's merge reads this copy).
  { target: 'plain-object.mjs', source: 'shared-78-D6VXYXaQ.js', exports: { xL: 'isPlainObject' },
    features: { xL: ['return typeof e == "object" && !!e && !Array.isArray(e);'] } },
  // c25d7186f: the CDS design tokens (the row's `--cds-outset-x: Om.pad.md.cssVar`). The chunk is data plus three
  // defineProperty statements on its chart palettes, so it is emitted whole.
  { target: 'cds-tokens.mjs', source: 'c25d7186f-CHE_J2eY.js', whole: true, exports: { i: 'cdsTokens' },
    rawFeatures: ['md:{cssVar:"var(--cds-pad-md)",value:"0.5rem"', 'Object.defineProperty(e.chart.categorical,"byHue",{value:r});var i=e;export{i as t};'] },
  // shared-frame: clipboard write (Zi) and window open (`$i`) through the element's own window (the branch chip's Copy
  // branch name / Open branch on GitHub), and the reduced-motion subscription (Nm, the card presence's fade).
  { target: 'window-actions.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Zi: 'writeClipboardText', $i: 'openWindow', Nm: 'useReducedMotion' },
    features: { Zi: ['return (await n.navigator.clipboard.writeText(t), "written");'], $i: ['return i ? (i.open(t, n, r), !0) : !1;'], Nm: ['return yt(Am, jm, Mm);'] } },
  // shared-frame fh: whether a pointer offset lies on the element's scrollbar (the overlay ignores such a pointerdown).
  { target: 'scrollbar-hit.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { fh: 'pointOnScrollbar' },
    features: { fh: ['if (r.display === "inline") return !1;', 'o = i >= 1 && (r.direction === "rtl" ? e < i : e >= n.clientWidth),'] } },
  // shared-25 pp: the element window's ResizeObserver; shared-5 e_: the ResizeObserver size hook with `select` the fit
  // test (shared-18 Py) reads.
  { target: 'owner-resize-observer.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { pp: 'ownerResizeObserver' },
    features: { pp: ['return up(e)?.ResizeObserver ?? globalThis.ResizeObserver;'] } },
  { target: 'element-size.mjs', source: 'shared-5-kdJVRUsT.js', exports: { e_: 'useElementSize' },
    features: { e_: ['i = n && "select" in t ? t.select : null,', 'let e = t.getBoundingClientRect();', 'i.observe(t, { box: r }),'] } },
  // c30c42d34 u: when a rail menu (or the card's section) that holds focus unmounts, focus the nearest tabindex=-1
  // ancestor up to the aside (the card header menu and the limited list's Show more read it).
  { target: 'rail-focus-rescue.mjs', source: 'c30c42d34-DW_r0HJ_.js', exports: { u: 'useRailFocusRescue' },
    features: { u: ['{ sectionWide: t = !1, portaled: n } = {}', 'e.tagName !== "ASIDE"'] } },
  // cc5183ea5 r: the six-dot grip glyph of the card's reorder handle.
  { target: 'grip-dots.mjs', source: 'cc5183ea5-C51gdbsX.js', exports: { r: 'GripDots' },
    features: { r: ['"grid grid-cols-2 gap-[3px]"'] } },
  // vendor-intl tn: react-intl defineMessages, the identity (the section titles and the remote link labels).
  { target: 'define-messages.mjs', source: 'vendor-intl-Db7hDWRO.js', exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  // c4008a6e7 A: "Open branch on GitHub" / "Open branch on {host}" (and the repository forms) for a remote URL.
  { target: 'remote-link-label.mjs', source: 'c4008a6e7-DBeKwG0F.js', exports: { A: 'remoteLinkLabel' },
    features: { A: ['t === "repository" ? k.repositoryOnHost : k.branchOnHost,'] } },
  // shared-104 Dz: the lazy component's preload props (pointer enter / focus / pointer down call `preload("intent")`);
  // pz: pick named fields of a query result (wH's `lc("bridgeSessionUrl")`).
  { target: 'lazy-preload.mjs', source: 'shared-104-Cqo2-vQh.js', exports: { Dz: 'useLazyPreloadProps', pz: 'pickFields' },
    features: { Dz: ['e?.preload("intent");', 'return { onPointerEnter: t, onFocus: t, onPointerDown: t };'], pz: ['for (let r of e) n[r] = t[r];'] } },
  // shared-8 xM: a click that came from the keyboard (detail 0, no pointer type); zV / IV: a usage meter's severity
  // class and the severity a percentage reaches (the rail pct meter).
  { target: 'keyboard-click.mjs', source: 'shared-8-B5lJ8U5C.js', exports: { xM: 'isKeyboardClick', zV: 'severityFillClass', IV: 'usageSeverity' },
    features: { xM: ['return e.detail === 0 && !("pointerType" in e && e.pointerType);'], zV: ['return LV[e];'],
      IV: ['return e >= FV ? "critical" : e >= PV ? "warning" : "normal";'] } },
  // c81ea1931 e: the mouse-down guard that keeps focus where it is (the titlebar toggle's onMouseDown).
  { target: 'prevent-mouse-down.mjs', source: 'c81ea1931-ChuE7vym.js', exports: { e: 'preventMouseDown' }, features: { e: ['return e.preventDefault();'] } },
  // shared-1 yL: the toggle's icon name, "ListCard".
  { target: 'rail-icon-name.mjs', source: 'shared-1-CAAiD7E3.js', exports: { yL: 'RAIL_TOGGLE_ICON' }, features: { yL: ['yL = "ListCard"'] } },

  // ---- rail layout, column marker and the shown store ----
  // shared-6 lg / jh: the docked column marker (`data-epitaxy-rail-column`, which the overlay tile measures) and the
  // overlay titlebar shift class the docked column wears. Ih (exported Yf, c73f45bc3 `Yf as Bt`): the empty slot c73f45bc3
  // t_ draws instead of the origin box when its origin is null (`e===null?c("span",{className:o?Kt:Bt})`, o = shared-15 xn
  // false outside the fizzy panels scope), which is the session titlebar's lead in rail mode (w_ railMode, R4f-rail fix).
  { target: 'rail-column.mjs', source: 'shared-6-Cby4X-ms.js',
    exports: { lg: 'RAIL_COLUMN_ATTRIBUTE', jh: 'RAIL_OVERLAY_SHIFT_CLASS', Ih: 'LEAD_NO_ORIGIN_CLASS' },
    features: { lg: ['lg = "data-epitaxy-rail-column"'], jh: ['epitaxy-overlay-rail-shift'],
      Ih: ['"w-[max(0px,calc(1rem-var(--tiles-padding,0px)-var(--tiles-border,1px)))] shrink-0"'] } },
  { target: 'rail-layout.mjs', source: 'shared-18-D4XxL6Tg.js',
    exports: {
      dy: 'RAIL_WIDTH_CLASS', fy: 'RAIL_FLAT_ATTRIBUTE', py: 'RailFlatContext', my: 'RAIL_CARD_CLASS', hy: 'RAIL_STACK_CLASS',
      gy: 'RAIL_SECTION_ATTRIBUTE', _y: 'RAIL_SLOT_CLASS', vy: 'RAIL_SLOT_DIVIDER_CLASS', ky: 'RAIL_DOCKED_COLUMN_CLASS',
      Ay: 'RAIL_FIT_ALONE', jy: 'RAIL_FIT_BESIDE_PANE', My: 'railFit', Ny: 'railFits', Py: 'useRailFits', zy: 'railRaisesPickers',
      By: 'RAIL_OVERLAY_COLUMN_CLASS', Vy: 'RAIL_OVERLAY_CARD_CLASS', Ty: 'RAIL_CHAT_GEOMETRY_CLASS', Sy: 'RAIL_GUTTER_CLASS',
      Cy: 'RAIL_TITLEBAR_INSET_CLASS', wy: 'RAIL_CONTAINER_CLASS', Ey: 'RAIL_BAND_PADDING_CLASS', Dy: 'RAIL_SCROLL_BLEED_CLASS',
      Oy: 'RAIL_BAND_START_CLASS', xy: 'RAIL_OVERFLOW_ATTRIBUTE', Mb: 'titlebarTextClass', GR: 'RAIL_POPUP_COLLISION_PADDING',
      Iy: 'releaseFlatComposerMenu', Fy: 'FLAT_RELEASED_MENUS',
    },
    features: {
      dy: ['dy = "w-[var(--session-rail-w,17.5rem)]"'], fy: ['fy = "data-session-rail-flat"'], py: ['py = T(!1)'],
      my: ['[[data-session-rail-flat]_&]:shadow-none'], hy: ['[[data-session-rail-flat]_&]:gap-0'], gy: ['gy = "data-rail-section"'],
      _y: ['has-[[data-rail-section]]:flex'], vy: ['[[data-session-rail-flat]_:not(:empty):not([data-rail-slot-off])~&]:border-t'],
      ky: ['absolute inset-y-0 flex ${dy} flex-col pt-3 pb-0.75 end-[var(--session-rail-end)] ${vu}'],
      Ay: ['Ay = 320 + cy + ly - uy'], jy: ['jy = 760 + ly - uy'], My: ['e >= jy ? "beside-pane" : e >= Ay ? "alone" : "none"'],
      Ny: ['return t ? e === "beside-pane" : e !== "none";'], Py: ['box: "border-box",', 'select: My,', 'initial: "none",', 'sync: !0,'],
      zy: ['return !i && e && !t && !n && r;'], By: ['end-[var(--titlebar-end-inset,0.5rem)]'], Vy: ['shadow-panel-md'],
      Ty: ['[--session-rail-w:17.5rem]', '[--session-rail-column-start:'], Sy: ['[--session-rail-g:var(--session-rail-gutter,24px)]'],
      Cy: ['[--titlebar-end-inset:'], wy: ['wy = "@container"'], Ey: ['pe-[calc(var(--session-rail-w)+var(--session-rail-end))]'],
      Dy: ['-me-[calc(var(--session-rail-w)+var(--session-rail-end))]'], Oy: ['-start-[var(--session-rail-band-start,0px)]'],
      xy: ['xy = "data-session-rail-overflow"'], Mb: ['return jb() ? void 0 : e;'], GR: ['GR = { top: 48, right: 8, bottom: 8, left: 8 }'],
      Iy: ['!n.pickerRowMounted &&', 'e.setState({ openComposerMenu: null });'], Fy: ['new Set(["model", "mode", "permissions", "effort"])'],
    } },
  // shared-20 zm / Bm: the persisted shown store (`persisted.epitaxy.sessionRailShown`, version 1, shown by default)
  // and its selector; Fm .. Pm: the panels-part row classes the card reads; Sf: the titlebar toggle's icon element.
  { target: 'rail-shown-store.mjs', source: 'shared-20-B7UqYfsi.js',
    exports: { zm: 'sessionRailShownStore', Bm: 'selectRailShown', Fm: 'PANELS_ICON_SIZE', Am: 'PANELS_LINED_ROW_CLASS', km: 'PANELS_CARD_CLASS',
      Om: 'PANELS_USAGE_CARD_CLASS', Mm: 'PANELS_ROW_HEIGHT_CLASS', Nm: 'PANELS_LEADING_CLASS', Pm: 'PANELS_GAP_CLASS', Sf: 'titlebarIcon' },
    features: { zm: ['name: "persisted.epitaxy.sessionRailShown",', 'version: 1,', 'shown: !0,', 'shown: ya(e) && typeof e.shown == "boolean" ? e.shown : t.shown,'],
      Bm: ['Bm = (e) => e.shown'], Fm: ['Fm = { size: "auto" }'], Am: ['[.epitaxy-rail-lined_&]'], km: ['km = Dm.join(" ")'],
      Om: ['"[&_.flex-col.outline-none]:gap-0.5"'], Mm: ['Mm = "min-h-6"'], Nm: ['Nm = "leading-4"'], Pm: ['Pm = "gap-0.5"'], Sf: ['return f(Cf, { name: e });'] } },

  // ---- c227f4d5e: section store and rules, rows ----
  { target: 'rail-sections-store.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: { VZ: 'railSectionsStore', xZ: 'RAIL_SECTION_IDS', wZ: 'RAIL_SECTIONS_OFF', TZ: 'RAIL_SECTIONS_OFF_WHEN_FLAT',
      kZ: 'RAIL_SECTIONS_FOLDED_BY_DEFAULT', SZ: 'railSectionHideable', DZ: 'railSectionExcluded', GZ: 'railSectionHidden',
      JZ: 'railSectionOrder', OZ: 'railHideableSections', YZ: 'railSectionsCustomized', WZ: 'useRailSectionOpen', KZ: 'useRailSectionHidden',
      UZ: 'railSectionOpen' },
    features: {
      VZ: ['name: "epitaxy.sessionRailSections",', 'storage: ol(() => Oi),', 'partialize: ({ foldsBySession: e, hidden: t, order: n }) => ({',
        'hidden: RZ(n.hidden).filter(SZ),', 'resetSections: () => e(FZ),'],
      xZ: ['"environment",', '"backgroundTasks",'], wZ: ['wZ = ["progress"]'], TZ: ['TZ = ["settings", "usage"]'],
      kZ: ['kZ = ["connectors", "context", "usage", "backgroundTasks"]'], SZ: ['return e !== "environment";'],
      DZ: ['return EZ(e) || (t && TZ.includes(e));'], GZ: ['return SZ(t) ? (DZ(t, n) ? !0 : e.hidden.includes(t)) : !1;'],
      JZ: ['r.splice(r.indexOf(n), 0, e);'], OZ: ['return xZ.filter(SZ).filter((t) => !DZ(t, e));'],
      YZ: ['return OZ(t).some((n) => GZ(e, n, t)) || n(xZ).some((e, t) => r[t] !== e);'], WZ: ['return VZ((n) => UZ(n, e, t));'],
      KZ: ['return VZ((n) => GZ(n, e, t));'], UZ: ['return kZ.includes(n) ? r.expanded.includes(n) : !r.collapsed.includes(n);'],
    } },
  { target: 'rail-rows.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: {
      dR: 'RailWorktreeMark', uR: 'RailMarkedRow', sR: 'RailRow', lR: 'RailInteractiveRow', fR: 'RailFolderRow', oR: 'RailRowIcon',
      iR: 'RailRowText', tR: 'RailRowSeparator', OR: 'RailRowButton', BL: 'RAIL_ROW_BUTTON_CLASS', DR: 'RailNamedRow',
      jR: 'useRailCardPresence', MR: 'useRailCardLeave', QL: 'RailLimitedList', aR: 'RAIL_ICON_BOX_CLASS', GL: 'railAsideClickGuard',
      yR: 'railSettingsRollup', mR: 'RailPctMeter', kL: 'RAIL_CARD_PAD_CLASS', PL: 'RAIL_PANEL_TRANSITION_CLASS', NL: 'RAIL_PANEL_CLASS',
      AL: 'RailLiveSlotContext', MZ: 'useRailSessionKey', jZ: 'RailSessionKeyContext', AZ: 'DEFAULT_RAIL_SESSION_KEY',
      IL: 'RAIL_FOCUS_RING_CLASS', FL: 'RAIL_ROW_CLASS', jL: 'RAIL_ROW_GAP_CLASS', LL: 'RAIL_ROW_HOVER_CLASS',
      // R4i-rail RL2: JL (QL's Show more / Show less row) is also the rail PR rows' Show more (c96d752d0 oRe's ple).
      JL: 'RailShowMoreToggle',
    },
    features: {
      dR: ['"data-rail-worktree": n,', 'n === "preparing"', 'defaultMessage: "Preparing worktree\\u2026",', 'id: "TLlRYRP6LZ",',
        'defaultMessage: "Worktree on edit", id: "s6jTAlTXBc"', 'defaultMessage: "Not in worktree", id: "ik7GusaS8F"',
        'className: t ? "text-accent" : void 0,', 'defaultMessage: "Worktree", id: "Cqp4C6aPD2"',
        '"flex shrink-0 items-center gap-sm ps-sm pe-xs text-footnote text-secondary"', 'wrapperClassName: `shrink-0 ${IL}`'],
      uR: ['"flex w-full min-w-0 items-center"'], sR: ['return D(cR, { ...e });'],
      lR: ['"[&>button]:h-6.5 [&>button]:w-full [&>button]:max-w-none [&>button]:flex-1 [&>button]:justify-start [&>button]:ps-8 [&>button]:pe-xs"'],
      fR: ['D(lR, { icon: "Folder", trailing: t, children: r })', 'v(cR, { icon: "Folder", flushStart: !0, trailing: t, children: [r, n] })'],
      oR: ['Ni("panels") && (t = gu.size),'], iR: ['"flex min-w-0 flex-1 text-start text-primary"'], tR: ['children: "\\u00B7",'],
      OR: ['className: i = zL,', 'D(lo, { lazy: !0, content: n, detail: r, children: s })'], BL: ['BL = `${FL} ${IL} ${LL}`'],
      DR: ['className: `group/setting ${r === void 0 ? jL : FL}`,'], jR: ['return t', '{ content: e, leaving: !1, onLeft: l }'],
      MR: ['r?.closest("[data-rail-card]")', 'i.setAttribute("inert", "")'], QL: ['onKeyDownCapture: qL,', 'byPointer: !Tu(e.nativeEvent),'],
      aR: ['"flex size-5 shrink-0 items-center justify-center text-secondary"'],
      JL: ['defaultMessage: "Show more", id: "aWpBzjCXKS"', 'defaultMessage: "Show less", id: "qyJtWyZ0yt"', 'onKeyDown: qL,'], GL: ['e.detail <= 1 ? (WL = !1) : WL && (e.stopPropagation(), e.preventDefault());'],
      yR: ['e.querySelector(`[${gR}]`)'], mR: ['"flex h-2.5 w-6 shrink-0 rounded-full bg-alpha-2 p-0.5"'], kL: ['kL = "px-md"'],
      PL: ['data-[ending-style]:h-auto'], NL: ['NL = "epitaxy-rail-panel"'], AL: ['AL = F(void 0)'], MZ: ['return P(jZ);'], jZ: ['jZ = F(AZ)'],
      AZ: ['AZ = "session-rail"'], IL: ['IL = "rounded focus-visible:outline-hidden focus-visible:shadow-focus"'],
      FL: ['FL = "flex min-h-6.5 w-full min-w-0 items-center gap-sm px-xs text-body"'], jL: ['"flex min-h-6.5 w-full min-w-0 items-center gap-md px-xs text-body"'],
      LL: ['[&[aria-haspopup][aria-expanded=true]]:bg-fill-ghost-hover'],
    } },

  // ---- c0a531389: the branch chip and the two row contexts ----
  { target: 'branch-chip.mjs', source: 'c0a531389-TdrucM3-.js', exports: { A: 'BranchChip', D: 'BranchChipFaceContext', O: 'ChangesRowLayoutContext' },
    features: { A: ['A = c(k)'], D: ['D = s("mono")'], O: ['O = s("stacked")'] } },

  // ---- c73f45bc3: the rail card ----
  { target: 'rail-card.mjs', source: 'c73f45bc3-CFrHin0p.js', exports: { Xv: 'RailCard', wy: 'useRailFlat', Hv: 'railSectionTitle', Vv: 'RAIL_SECTION_TITLES', zv: 'RailCardGripContext' },
    features: {
      Xv: ['L = "group/railcard flex shrink-0 flex-col py-md",', 'hideCaret: !0,', 'group-data-[panel-open]/railhead:rotate-90', 'c($t, { name: "CaretRight", size: "xs" })',
        '"aria-labelledby": x,', 'keepMounted: d || p !== void 0,', 'if ((Vi(M, y, b), !g && (Ki(e, j) || D))) return null;', 'e.altKey && k(T, !E);'],
      wy: ['return Gr();'], Hv: ['return e.formatMessage(Vv[t]);'], Vv: ['pullRequests: { defaultMessage: "Changes", id: "dgqhUM6BxJ" },'], zv: ['zv = p(null)'],
    } },

  // ---- cc43287c9: the rail shell ----
  { target: 'rail-shell.mjs', source: 'cc43287c9-DAfOi8yP.js',
    exports: { EH: 'SessionRailToggle', TH: 'FLAT_TOGGLE_STYLE', DH: 'SessionRailOpener', bH: 'SessionRailDockedColumn', jH: 'SessionRailOverlay',
      AH: 'useRailOverlayDismiss', OH: 'outsideLayer', kH: 'onScrollbar', yH: 'useRailWheelHandoff', vH: 'wheelStaysInRail', _H: 'scrollsVertically',
      MH: 'RailShownStoreContext', PH: 'RailShownStoreProvider', FH: 'useRailShown', NH: 'selectSetRailShown' },
    features: {
      EH: ['defaultMessage: "Hide session rail",', 'id: "U0R7oYkTM1",', 'defaultMessage: "Show session rail",', 'id: "JYaBivMdHH",', 'a = ic(gH),',
        'variant: "ghost",', 'iconOnly: !0,', 'icon: Hh(an),', 'pressed: e.onScreen,', 'pressedVariant: "selected",', 'style: l ? TH : void 0,',
        '"aria-expanded": e.raises ? e.onScreen : void 0,', '"aria-controls": e.raises && e.onScreen ? e.panelId : void 0,', 'onMouseDown: oO,'],
      TH: ['"--cds-bg-accent": "var(--cds-fill-ghost-selected)",'], DH: ['kind: "opener", region: "sessionDetails"'],
      bH: ['[Zc]: "",', 'className: Gp,', 'onWheel: s,', 'v(_p.Provider, {'], jH: ['role: "group",', 'defaultMessage: "Session details",', 'id: "v52hoKcuPM",',
        'className: `${pm} outline-none`,', '[yp]: "",', 'className: zp,', 'className: "h-full w-full",'],
      AH: ['if (t.key !== "Escape" || t.defaultPrevented) return;', 'n.addEventListener("pointerdown", c, !0),'], OH: ['let r = t.ownerDocument.body;'],
      kH: ['return e.pointerType !== "touch" && wd(e.offsetX, e.offsetY, t);'], yH: ['e.current?.scrollBy({ top: t.deltaY });'],
      vH: ['if (n === null || !t.contains(n)) return !0;'], _H: ['return t === "auto" || t === "scroll";'], MH: ['MH = C(Gh)'],
      PH: ['np()((e) => ({ shown: !1, setShown: (t) => e({ shown: t }) })),'], FH: ['return { shown: tp(e, kh), setShown: tp(e, NH) };'], NH: ['NH = (e) => e.setShown'],
    } },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration).
const callSites = [
  // cc43287c9 wH: while the rail is off screen, a composer request to open a picker raises it. Flat (D10): the model /
  // mode / permissions / effort pickers are released (shared-18 Iy, rail-layout.mjs releaseFlatComposerMenu) and only
  // the context menu raises the rail; then TN (c73f45bc3 Oy, the composer menu shortcuts) and the bridge session query
  // (claude.ai Remote Control, not applicable here).
  { source: 'cc43287c9-DAfOi8yP.js', binding: 'wH', role: 'Composer picker request raises the off-screen rail (flat: only "context"); host: SR-7',
    features: ['let o = tp(t, (e) => e.openComposerMenu),', 'if (((s.current = o), c)) {', '(Np(t, o), o?.menu === "context" && a());',
      'o && SH.has(o.menu) && !(i && Tp.has(o.menu)) && a();', 'TN(t, n && !r && !i && !(c && l)));'] },
  // cf74bc599 tE: the session pane titlebar's ⋮ menu body. With the rail toggle folded into it, the first group is the
  // one item "Hide session rail" / "Show session rail" (icon ListCard), selecting railToggle.onToggle; host: SR-6.
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'tE', role: 'Titlebar ⋮ menu: the folded rail toggle is the first group (host: SR-6)',
    features: ['k = XT(a, {', 'icon: Oe,', 'label: a?.onScreen', 'defaultMessage: "Hide session rail",', 'defaultMessage: "Show session rail",',
      'onSelect: a?.onToggle,', 'k.length > 0 && u($T, { items: k, container: s }),'] },
];
// Pinned on the minified bytes (each must occur exactly once).
const rawCallSites = [
  // The presets gate the rail reads three times (cc43287c9 P_ = rail enabled, Y_ = environment bar, uN = flat):
  // shared-11 Qo / $o (exported do / ro) and ms (exported fo, hook form). D10: on.
  { source: 'shared-11-BuQ3CK5I.js', role: 'Presets gate: P_ (do = Qo), Y_ (ro = $o) and the flat hook (fo = ms) read one GrowthBook key; D10 on',
    features: ['var Zo="claudeai_cc_epitaxy_session_presets_main";function Qo(){return N(Zo)}function $o(){return Qo()}', 'function ms(){return fr(Zo)}',
      'Qo as do', '$o as ro', 'ms as fo'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Code session view imports the gate as P_ / Y_ and the flat test as uN (c73f45bc3 a = wy)',
    features: ['do as P_', 'ro as Y_', 'a as uN', 'ie=P_(),ae=Y_()'] },
  // shared-4 Su: the lazy chunk behind hH / gH (cf74bc599 exports EpitaxySessionRailHost = pO = memo(fO)).
  { source: 'shared-4-CJsHhp5n.js', role: 'Lazy entry code_session_view loads cf74bc599 (host: bundled, SessionRailHostContext)',
    features: ['var Su={id:"code_session_view",tier:"T2",largeClosure:!0,onUnrecoverable:"reload",load:()=>v(()=>import("./cf74bc599-D9NZWRyl.js")'] },
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Lazy rail host and handle (host adapters LazySessionRailHost / sessionRailLazyHandle)',
    features: ['{Component:hH,handle:gH}=mc({entry:cs,pick:e=>e.EpitaxySessionRailHost,options:{loading:()=>v(ON,{})},overlayHost:"LazyEpitaxySessionRail.EpitaxySessionRailHost"})'] },
  // cc43287c9 jre: the rail state machine of the Code session view (research §1.1.1). `ie` is the presets gate, `I` is
  // null in jre, `Ze` is the landing page, `Kt` landing-docked, `Zt` the row fits (shared-18 Py), `Qt` the shown store
  // (FH), `on` the rail mode (a session), `sn` docked on screen, `cn` render the docked column, `dn` the overlay raised,
  // `fn` on screen, `yn` raises (overlay semantics); `bn` is EH's model and the titlebar's railToggle. Host: SR-7.
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Code session view rail state machine (host: SR-7)',
    features: ['Gt=_h({environments:ie,environmentBar:ae}),Kt=Ze&&gh({face:Gt,inSplitWindow:Ot}),qt=Kt&&!I,Jt=ie&&!I,Yt=_(null);',
      'let Xt=AD($E),Zt=jp(Yt,Jt,Xt),{shown:Qt,setShown:$t}=FH(),en=Kt&&Jt&&!ae&&Qt&&Zt,tn=Jt&&(!Kt||en),nn=tn&&!Ee,rn=Jt&&!Ee,an=nn?ce:null,on=an!==null,sn=on&&Qt&&Zt,cn=(on||en||nn&&le==="spawning")&&Qt&&Zt;xH(cn&&!on,le==="spawning");',
      'let[ln,un]=f(null),dn=an!==null&&!sn&&ln?.id===an.id;ln!==null&&!dn&&un(null);let fn=sn||dn,pn=Sm({railMode:on,railOnScreen:fn,readOnly:Le||Rt,fits:!1,pickersUnderPrompt:ie});',
      '(e.railMode!==on||e.railActive!==cn)&&U.setState({railMode:on,railActive:cn})',
      'gn=A(()=>{un(an?{id:an.id,focus:!1}:null)},[an]),_n=A(()=>{un(null)},[]),vn=A(e=>{if(fn){un(null),sn&&$t(!1);return}$t(!0),Zt||un(an?{id:an.id,focus:e?.detail===0}:null)},[fn,sn,Zt,an,$t]),yn=dn||!fn&&!Zt,bn=x(()=>({onScreen:fn,raises:yn,panelId:hn,onToggle:vn}),[fn,yn,hn,vn])',
      'railToggle:on?bn:void 0'] },
  // Where jre mounts the pieces: the opener inside the chat region, the overlay after the transcript, wH while the
  // rail is off screen, and after the chat panel body the docked column (or the spawning draftRail slot).
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Code session view mount points of DH / jH / wH / bH (host: SR-7)',
    features: ['on&&!ne&&v(DH,{model:bn,scopeRef:ft})',
      'dn&&an&&v(jH,{sessionRef:an,scopeStore:U,mountKey:e,isPanelActive:kt,onRequestComposerFocus:Nn,readOnly:Le||Rt,scrollRef:ut,panelId:hn,toggleRef:mn,focusOnMount:ln?.focus===!0,onDismiss:_n})',
      'an&&!fn&&v(wH,{sessionRef:an,scopeStore:U,isPanelActive:kt,readOnly:Le||Rt,pickersElsewhere:pn,onRaise:gn})',
      'cn?an?v(bH,{sessionRef:an,scopeStore:U,mountKey:e,isPanelActive:kt,onRequestComposerFocus:Nn,readOnly:Le||Rt,scrollRef:ut}):v("div",{ref:Wt,[Zc]:"",className:Gp}):null'] },
  // cc43287c9 wW (the session pane titlebar): EH sits after the trailing slot and before the agent mark and the panel
  // toggles; it folds into the ⋮ menu (maxHidden 6 -> 7) when the titlebar runs out of room. Host: SR-6.
  { source: 'cc43287c9-DAfOi8yP.js', role: 'Session pane titlebar: rail toggle placement and fold into the ⋮ menu (host: SR-6)',
    features: ['Te=y!==void 0&&e!==null&&de.overflowMenuProps!==null&&!Ce',
      '{railToggleFolded:De,hiddenMainPanes:q}=YR({railToggleFoldable:Te,hiddenCount:G})',
      'Oe.current&&(Oe.current=!1,De&&b?.current?.focus({preventScroll:!0}))',
      'Pe=p(yd,{children:[v(KR,{value:we,children:m}),y&&!De&&p(u,{children:[v(EH,{model:y,buttonRef:b,onUnmountFocused:ke,inert:!B}),re&&!_e&&v(TI,{})]}),re&&o&&v(OW,{agent:o}),',
      'railToggle:De?y:void 0,railToggleRef:De?b:void 0'] },
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
  const viewTabs = await readJson(path.join(generatedRoot, 'view-tabs/manifest.json'));
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

// vendor-frame `var X = ns.member` with ns a proved React namespace.
const provedNamespaces = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const entry = src.top.get(local);
  if (entry?.kind !== 'var') return null;
  const object = reactNamespaceObjects[local];
  if (object) {
    assertFeatures(`React namespace object ${local}`, await featureText(src, entry), object.features);
    return { from: object.module, name: '*' };
  }
  const init = entry.node.init;
  if (init?.type !== 'MemberExpression' || init.computed || init.object.type !== 'Identifier' || init.property.type !== 'Identifier') return null;
  const ns = reactNamespaces[init.object.name];
  if (!ns) return null;
  if (!provedNamespaces.has(init.object.name)) {
    assertFeatures(`React namespace ${init.object.name}`, closureText(src, init.object.name), ns.features);
    provedNamespaces.add(init.object.name);
  }
  const react = await import(ns.module === 'react/jsx-runtime' ? 'react/jsx-runtime' : ns.module);
  if (!(init.property.name in react)) throw Error(`${ns.module} has no ${init.property.name} (vendor-frame ${local})`);
  return { from: ns.module, name: init.property.name };
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
        if (adapter || publicByLocal.has(`${spec.source}#${name}`)) throw Error(`${spec.target}: root ${name} is provided elsewhere`);
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
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
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
        'reportError', 'ResizeObserver', 'URL', 'Event']);
      const unbound = globals.filter(name => !allowed.has(name));
      if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
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
      const count = text.split(feature).length - 1;
      if (count !== (site.count ?? 1)) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected ${site.count ?? 1}`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
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
