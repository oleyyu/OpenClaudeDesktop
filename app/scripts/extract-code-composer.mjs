// Extract the 2.42304.0 Code composer pieces (research/composer.md §1.2/§4.1, work item composer-gen): the CDS class
// tokens of the presets card, row chin and environment bar (shared-6), the card/send-cell constants and the Send/Stop
// cell `lM` with its crossfade `Ij`, hint rows `sM` and key labels `cM` (c227f4d5e), the focus-yield test `Xj` over the
// overlay test `wv` (shared-28), the /copy [N] argument parser `QX`, its reply reader `eZ`/`$X` over the transcript
// predicates (c227f4d5e yE/_E/DE/EE/cE, cb27dab29 Pe, c06cf64bb yu, c4d199b75 ot), the environment bar `l0`/`u0`/`a0`
// (cc43287c9), and the row chin's pieces: the context ring `KV`/`UV` (shared-8) and the mode label `rQ` with the row model
// trigger class `DK` (c227f4d5e), and (R3-composer step 3, composer-shell) the CDS ChatComposer shell shared-5 `Af` with
// its parts `jf`, focus ref `Df` and form placeholder `Ef` over its shared-26 / shared-3 / shared-2 / shared-1 / shared-frame
// closure, and (R4g-composer CP2) the placeholder pieces shared-9's tiptap editor cm imports (shared-26 Ja / Ya / Qa / $a /
// eo, shared-5 Xf / Yf, shared-28 Jx), with the minimal original closures they need, without executing any desktop runtime.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. Imports of the original
// modules resolve through the source chunk's export table to exactly one of:
//   - another module generated here (`generated`);
//   - a verified React / ReactDOM export of vendor-frame (`react`);
//   - a semantic export of the rebuilt view-tabs graph (`view-tabs`, D1: CdsButton / CdsIcon / CdsTooltipProvider, and
//     since R3 / D24 CdsTooltip / CdsShortcut / CdsSplitDropdownButton / cdsClassNames), checked against
//     src/generated/view-tabs/manifest.json `publicNames` (same file, same official alias, same local) so one React
//     context instance is shared with every other view-tabs consumer;
//   - since R3-composer step 3, any other binding view-tabs publishes under a semantic name (manifest publicNames: same
//     file — generated from this very source, sourceSha256 — and same local), also `view-tabs`, never a copy;
//   - an explicit substitute (`substitutes`: shared-2 Hp, which is Vp itself after Object.assign of its tile members);
//   - a named host adapter in src/source-composer-current-adapters.jsx (`adapter`: react-intl, and the page drop scrim's
//     CDS surface root, unreachable in the host).
// A binding view-tabs holds but publishes no name for is never imported by its minified name (D1): it is sliced into a
// `viewTabsSame` module of this generator, once (`oneCopy`). A React context among such copies is a second instance,
// so it must be listed in `contextCopies` with the reason the copy behaves like the view-tabs one in the host (the
// generator refuses any other, and refuses a listed one view-tabs has meanwhile named — import it then).
// Every root, adapter and view-tabs mapping carries feature strings that must still appear in the original text, every
// root that the chunk exports is pinned to its official export alias, and a module can pin strings of the chunk that
// consume a root (e.g. `ignoreStrayEnter` adding `rP`), so a version bump that re-points a minified name stops here.
//
// D0: own generator, own output folder (src/generated/code-composer), own scripts/verify-gen-code-composer.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
export const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/code-composer');
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-composer-current-adapters.jsx';
// R4g-composer CP4 (X7-10): the attachment tiles' host answers (react-intl FormattedMessage, the path hover card, the tile
// set the c0fbbe82d tile wrappers read) live in their own module; an adapter entry names it with `module`.
const tileAdapterModule = '../../source-composer-attachment-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React / ReactDOM; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], eo: ['react', 'createContext'],
    do: ['react', 'useContext'], yo: ['react', 'useLayoutEffect'], wo: ['react', 'useSyncExternalStore'],
    co: ['react', 'startTransition'], Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
    Ca: ['react-dom', 'flushSync'], Sa: ['react-dom', 'createPortal'],
    // R3-composer (composer-row-chin): shared-8's context ring KV is a memo component.
    oo: ['react', 'memo'],
    // R3-composer composer-shell: the CDS ChatComposer shell (shared-5 Af / jf) and its shared-26 / shared-3 / shared-1 /
    // shared-2 closure.
    ro: ['react', 'forwardRef'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'], Ka: ['react', 'Children'],
    io: ['react', 'isValidElement'], Ja: ['react', 'Fragment'],
    go: ['react', 'useId'], Ba: ['react/jsx-runtime', 'Fragment'],
    // R3-composer step 3: the shared-frame / shared-2 / shared-3 copies of the shell's closure.
    vo: ['react', 'useInsertionEffect'],
  },
};
// CDS components that live in the view-tabs graph (R1 SG-1). `name` is the view-tabs publicName; `features` must appear
// in the closure of the original binding the alias names.
const viewTabs = {
  'shared-frame-BfjMqbuN.js': {
    cl: { name: 'CdsButton', features: ['iconPosition: i = "start"', 'hideShortcut:', '"Button")'] },
    Hl: { name: 'CdsIcon', features: ['"data-cds": "Icon"', 'data-cds-mirror'] },
    kc: { name: 'CdsTooltipProvider', features: ['closeDelay: t = 200', '.Provider'] },
    // R3-composer step 2 (D24): R3-graph named the CDS Tooltip (Zp), Shortcut (ks) and SplitDropdownButton (ej), so lM's
    // tooltips and hint rows, u0's iconOnly tooltip and the coarse-pointer split Send are the originals, sharing the
    // view-tabs React contexts (tooltip delay group, CDS labels, layers); the host stand-ins (SourceTooltip /
    // SourceShortcut / a CdsButton + CdsDropdown pair) are gone. cdsClassNames (X = twMerge(clsx)) is the c227f4d5e `Bo`
    // the row chin's mode label rQ merges its classes with.
    Oc: { name: 'CdsTooltip', features: ['trackCursorAxis', 'openOnHandedBackFocus: y = !1', 'hoverable: g = !0', '"data-cds": "Tooltip"'] },
    Ol: { name: 'CdsShortcut', features: ['"data-cds": "Shortcut"', 'variant: t = "keycap"', '"sequenceThen"'] },
    li: { name: 'CdsSplitDropdownButton', features: ['"data-cds": "SplitDropdownButton"', 'onPrimaryClick: _', 'menuTooltip: E = !1'] },
    xd: { name: 'cdsClassNames', features: ['return Gt(Y(e))', 'conflictingClassGroups'] },
  },
  // R3-composer composer-shell: the shell's class joins (shared-5 G / shared-2 j) are vendor-frame's clsx.
  'vendor-frame-DfPJ1QmD.js': {
    za: { name: 'clsx', features: ['(e = arguments[n]) && (t = he(e))', 'Array.isArray(e)'] },
  },
};
// Host dependencies (checked before the vendor and view-tabs tables): react-intl, answered by the local catalog every
// other Code surface reads (see the adapter module).
const adapters = {
  'vendor-intl-Db7hDWRO.js': { p: { name: 'useComposerIntl', features: ['[React Intl]'] } },
  // R3-composer composer-shell: shared-frame gf (exported `Fc`), the CDS surface root (density, platform, colour store,
  // fizzy flags, layer catcher …) that shared-5 yd, the page-scope drop scrim, portals into. The scrim renders only while a
  // file drag is over the page with `onFileDrop` given; the host card keeps its own drop / paste handling (it passes no
  // onFileDrop), so the adapter is a stand-in that throws if it is ever reached.
  'shared-frame-BfjMqbuN.js': { Fc: { name: 'ComposerPageDropSurface', features: ['companionModalCatcher: a = !1', 'closeOnActivityHide: o = !1', 'popup: s = !1'] } },
};
// R3-composer composer-shell: an import resolved to another original binding that is the same runtime value. shared-2 Hp
// (exported `zg`, the shell's Attachments part `Va`) is `Object.assign(Vp, { Image, Video, File, Quote })`: Object.assign
// returns Vp itself, so the part the shell renders and matches children against (ef's nf(c, Va)) is Vp. The Code card
// passes the part only its shelf (uM: `lc.Attachments` > `epitaxy-attachment-shelf`), never a tile, so the tiles (and the
// CDS Card / TextLink / Base UI Button they pull in) are not sliced; the shell gets Vp.
const substitutes = {
  'shared-2-Cb74JByF.js:zg': { local: 'Vp', features: ['Object.assign(Vp, { Image: wp, Video: Ap, File: Pp, Quote: Bp })'] },
};
// React contexts this generator copies out of a view-tabs source (see the header). R4g-composer CP1 (X7-07): none.
// The seven it used to copy (shared-frame xa / Oa / vn / da / hr, provided by CdsRoot Za, and Ea / Xl, provided by the
// shell itself) are view-tabs semantic names now (CdsNaturalImageTilesContext, CdsOwnerWindowContext, CdsLabelsContext,
// CdsModeStoreContext, CdsFizzyLakePartsContext, CdsSurfaceContext, CdsButtonIconSizeContext), so the copied readers
// (Sa, Ya, Z, Pa, gr, za, Zl) import them and share one instance with the host's CdsRoot (main.jsx wraps the Code
// composer in it) and with every view-tabs control. The table stays as the guard: a new context copy must be listed
// here with its reason, and the generator refuses one view-tabs has named.
// R4g-composer CP4 (X7-10) copied the two contexts the shared-2 tiles' Skeleton (dd / rd) reads (shared-frame xu / Su);
// R4i-graph GR3 named them in view-tabs (CdsSkeletonShimmerContext, CdsSkeletonElementContext), so the copied Skeleton
// imports them. R4i-graph GR3 (pane drop zone): the drop halo (cc63499d2 d) sizes its z-index with shared-frame Jd
// (useCdsLayerAwareZIndex) over the layer base context Vd; view-tabs names both but holds them back (pendingNames) until
// extract-mcp-app-card.mjs stops copying them, so Jd is copied here and Vd with it, as the one listed context copy.
const contextCopies = {
  'shared-frame-BfjMqbuN.js': {
    // Vd's providers are CDS layers (Hd, the popup / sheet / dialog surfaces): each sets its base for what it portals.
    // The Code session pane, the drop zone's host, is under none of them (here or in 2.42304.0), so it reads the
    // default 0 the view-tabs instance has there; the halo's z-index is 40, as the official one over the pane.
    Vd: 'Layer base: provided only by CDS layer surfaces (popups, sheets, dialogs), never above the Code session pane the drop halo covers; the default (0) is the view-tabs value there',
  },
};

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots.
// `officialExports` pins a root to the alias its chunk exports it under (the alias consumer chunks import).
// `features` pins each root to strings of its own original text; `chunkFeatures` to strings of the source chunk.
const modules = [
  // shared-6: presets card root (cc43287c9 Hc = Fd), row chin (Ua = xd, Sg = kd, Tg), chin trailing grid (Va = vd),
  // trailing controls (Ra = cd), row leading/trailing (l_/u_), Clawd slot (Nl = ud), environment bar (Vc/zc/Qc/tl/rl).
  { target: 'composer-tokens.mjs', source: 'shared-6-Cby4X-ms.js',
    exports: {
      s_: 'composerCardSizeClass', d_: 'composerCardRootClass', Sg: 'composerRowControlClass', wg: 'composerRowChinClass',
      Tg: 'composerRowChinSlotClass', n_: 'composerChinTrailingClass', c_: 'composerTrailingControlsClass',
      l_: 'composerRowLeadingClass', u_: 'composerRowTrailingInsetClass', Lg: 'composerPetSlotClass',
      xg: 'environmentBarClass', Og: 'environmentBarResponsive', Cg: 'environmentBarInsetClass',
      bg: 'environmentBarLineClass', kg: 'environmentBarLabelClass',
      // R3-composer composer-row-chin: Eg (c227f4d5e Fa), the span yZ wraps a sized usage ring's trigger in.
      Eg: 'composerRingSlotClass',
      // Ag (cc43287c9 Il): the givesWay name class of the environment bar's model trigger label (b6).
      Ag: 'environmentTriggerGivesWayClass',
    },
    officialExports: { d_: 'Fd', Sg: 'kd', wg: 'xd', Tg: 'Td', n_: 'vd', c_: 'cd', l_: 'wd', u_: 'Sd', Lg: 'ud', xg: 'Dd', Og: 'Bd', Cg: 'Od', bg: 'Rd', kg: 'Vd', Eg: 'Ed', Ag: 'zd' },
    features: {
      s_: ['[--cds-h-control:calc(1.75rem*var(--cds-rem-scale,1))]', '[--cds-radius-composer:calc(0.875rem*var(--cds-rem-scale,1))]'],
      d_: ['${s_}', '[--cmp-font-size:var(--prompt-text-size)]', '[--cmp-line-height:var(--prompt-line-height)]'],
      Sg: ['[--cds-h-control:calc(1.5rem*var(--cds-rem-scale,1))]', '[--cds-leading-body:calc(1.25rem*var(--cds-rem-scale,1))]'],
      wg: ['comfortable:-mt-1.5 -mb-2.5'], Tg: ['"block h-6"'], n_: ['auto-cols-[minmax(0,max-content)]'],
      c_: ['"flex items-center gap-2"'], l_: ['"flex items-center ms-0.5"'], u_: ['"compact:me-1"'],
      Lg: ['comfortable:-mb-2'], xg: ['comfortable:pt-0.5 -mb-0.5'], Og: ['@max-[28.75rem]:flex-wrap', 'ghost:'],
      Cg: ['"px-2.5"'], bg: ['bottom-1.5 ps-4 pe-20 text-footnote'], kg: ['calc-size(max-content,min(size,5ch))'],
      Eg: ['"flex shrink-0 ms-px"'], Ag: ['calc-size(max-content,min(size,10ch))'],
    } },
  // shared-1 ug/dg: the Send / Stop test ids (c227f4d5e Wt/Ft).
  { target: 'composer-testids.mjs', source: 'shared-1-CAAiD7E3.js', exports: { ug: 'sendTestId', dg: 'stopTestId' },
    officialExports: { ug: 'rd', dg: 'ad' }, features: { ug: ['"code-prompt-send"'], dg: ['"code-prompt-stop"'] } },
  // cfca6870a d/p: the md send-glyph box (c227f4d5e cy) and the dock glyph props of the in-card + (pv).
  // R4g-composer CP3 (X7-09): the rest of what the Add trigger c227f4d5e Oj imports from it — the glyph box `ry` (f: a span
  // only with a className), the dock glyph's icon tone `ay` (m) and the default glyph size `sy` (u, "auto").
  { target: 'composer-glyph.mjs', source: 'cfca6870a-BSNHbv0q.js',
    exports: { d: 'sendGlyphBoxClass', p: 'dockGlyphProps', f: 'DockGlyphBox', m: 'dockGlyphIconClass', u: 'autoGlyphSize' },
    officialExports: { d: 't', p: 'i', f: 'a', m: 'n', u: 'r' },
    features: { d: ['"flex scale-90"'], p: ['size: "base"', 'dockGlyph: !0'],
      f: ['return e === void 0 ? t : n("span", { className: e, children: t });'],
      m: ['"text-secondary-control group-hover/btn:text-primary group-aria-pressed/btn:text-accent group-hover/btn:group-aria-pressed/btn:text-accent"'],
      u: ['u = "auto"'] } },
  // shared-25: owner window / observer constructors (cc43287c9 ge/me/ue = Pf/Nf/Mf) and the no-op subscribe (QO's Pe).
  // The code-current owner-window.mjs carries up/dp only; pp/mp/_i are not there, so this lane slices its own copy.
  // fp (exported `Af`): the owner document c1c6ea9ac's overflow hook waits on (`fonts?.ready`).
  { target: 'owner-support.mjs', source: 'shared-25-DP8p7i1Z.js',
    exports: { up: 'ownerWindow', dp: 'ownerWindowOrGlobal', pp: 'ownerResizeObserver', mp: 'ownerMutationObserver', _i: 'noopSubscribe', fp: 'ownerDocument' },
    officialExports: { up: 'Ff', dp: 'Pf', pp: 'Nf', mp: 'Mf', _i: 'a_', fp: 'Af' },
    features: { up: ['.defaultView'], dp: ['globalThis.window'], pp: ['ResizeObserver'], mp: ['MutationObserver'], _i: ['return vi'], fp: ['globalThis.document'] } },
  // c1c6ea9ac o (exported `t`, imported by c227f4d5e as Kf): the overflow test uM runs on its placeholder fit probe
  // (`Kf(Ge, Ve)`, scrollWidth over clientWidth, re-measured on resize, on the text and once the fonts are ready).
  { target: 'placeholder-fit.mjs', source: 'c1c6ea9ac-D4q2aGJF.js', exports: { o: 'useOverflowing' },
    officialExports: { o: 't' }, features: { o: ['e.scrollWidth > e.clientWidth', '.fonts?.ready?.then(', 'l === "y"'] } },
  // shared-frame Gs (exported `kl`): the CDS shortcut cap table c227f4d5e cM labels keys with. Pure (no React).
  // R3-composer step 3: Us (the key parser) and Bs (an own-property read) are shared with chat-composer-frame.mjs, whose
  // aria-keyshortcuts Js parses keys the same way; one copy of each (oneCopy), exported here.
  { target: 'shortcut-caps.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Gs: 'shortcutCaps', Us: 'parseShortcutKeys', Bs: 'ownEntry' },
    officialExports: { Gs: 'kl' },
    features: { Gs: ['spoken: n', '/^[A-Za-z0-9 ]+$/'], Us: ['.split("+")', 'Ps(e) ? r.push(e) : i.push(e)'], Bs: ['Object.hasOwn(e, t) ? e[t] : void 0'] } },
  // c4a70913c f (cc43287c9 FP): the transcript surface behind landing-texture chips.
  { target: 'transcript-surface.mjs', source: 'c4a70913c-C9EYof6i.js', exports: { f: 'transcriptSurfaceClass' },
    officialExports: { f: 'u' }, features: { f: ['var(--epitaxy-transcript-surface,var(--cds-surface-1))'] } },
  // c0fbbe82d mn (cc43287c9 rk): the path tooltip placement the environment chip tooltip takes its className from.
  // R3-composer: hn (cc43287c9 ik) is the path tooltip body j2 gives the folder chip (`tooltip: pe ? ik(pe) : fe`):
  // an ltr span that lets the path wrap after each separator.
  { target: 'path-tooltip-placement.mjs', source: 'c0fbbe82d-BOWKSems.js', exports: { mn: 'pathTooltipPlacement', hn: 'pathTooltipContent' },
    officialExports: { mn: 'I', hn: 'L' },
    features: { mn: ['max-w-[min(480px,var(--available-width))]', 'side: "bottom"'], hn: ['dir: "ltr"', 'inline-block max-w-full whitespace-pre-wrap'] } },
  // c227f4d5e card and send-cell constants (uM / lM / Ij / OP).
  { target: 'composer-card-tokens.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: {
      $j: 'sendCellClass', eM: 'sendCellLayerClass', tM: 'bashModeRingClass', nM: 'placeholderShapeResetClass',
      rM: 'shelfStartInset', iM: 'shelfStartProperty', aM: 'shelfStartPaddingClass', oM: 'suggestionGhostClass',
      Nj: 'submitLayerClass', Pj: 'submitLayerEnterClass', Fj: 'submitLayerExitClass', Qj: 'stopSendGuardMs',
      rP: 'strayEnterWindowMs',
    },
    features: {
      $j: ['"grid shrink-0 items-center justify-items-end"'], eM: ['"col-start-1 row-start-1 flex"'], tM: ['inset-ring-pro'],
      nM: ['[shape-outside:none]'], rM: ['rM = 4'], iM: ['"--epitaxy-shelf-start"'], aM: ['ltr:ps-[var(--epitaxy-shelf-start,0px)]'],
      oM: ['text-muted-as-secondary'], Nj: ['cursor-default items-center justify-end'], Pj: ['cds-fade-in_0.12s_ease-out_0.08s_backwards'],
      Fj: ['[transition:visibility_0s_linear_80ms]'], Qj: ['Qj = 500'], rP: ['rP = 500'],
    },
    chunkFeatures: ['Xr.current = Date.now() + rP;', 'Date.now() - h.current < Qj || f(p());', 'st.current?.style.setProperty(iM, `${Math.max(0, e - rM)}px`)',
      // R3-composer step 3 (composer-shell): uM's card on lc (= shared-5 bp, the shell over its tiptap editor). The host
      // card (source-composer.jsx) transcribes these props and parts onto src/source-composer-shell.jsx.
      'className: Bo("epitaxy-prompt", ye),', 'multiline: !ve && void 0,', 'onClusterWidthsChange: ve ? ct : void 0,',
      'dropScope: Ee && "page",', 'cardClassName: ut,', 'ut = Bo(U && tM, ve && nM, ke) || void 0,', 'maxHeight: "min(24rem, 40svh)",',
      'className: "epitaxy-prompt-input",', '"epitaxy-attachment-shelf w-full",', 'leading: Oe ?? ft,',
      'mt && pt ? v(m, { children: [mt, pt] }) : (mt ?? pt),', 'send: ht,', 'className: "truncate text-muted-as-secondary",'] },
  // shared-28 wv (exported `Ji`): focus sits in another dialog/menu/listbox/AskUserQuestion surface.
  { target: 'composer-dialog-focus.mjs', source: 'shared-28-DcgD7xXH.js', exports: { Cv: 'overlaySurfaceSelector', wv: 'focusInsideOverlay' },
    officialExports: { wv: 'Ji' },
    features: { Cv: ['[role="dialog"]', '[data-cds="AskUserQuestion"]'], wv: ['t.closest(Cv)', '!n.contains(e)'] } },
  // c227f4d5e Xj: scheduleFocus(…, {yieldsToUser}) leaves focus in a visible field or overlay elsewhere.
  // The rest of OP's focus API is inline in its imperative handle and keydown handler, so the host editor
  // (source-composer-editor.jsx scheduleFocus / focusPreservingSelection / ignoreStrayEnter, composer-keys-model
  // strayEnterSwallowed) transcribes it; these chunk pins stop generation when that original text moves.
  { target: 'composer-focus-yield.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { Yj: 'editableFieldSelector', Xj: 'focusBelongsElsewhere' },
    features: { Yj: ['[contenteditable=""]', '[contenteditable="true"]'], Xj: ['t.closest(Yj)', 'checkVisibility({ visibilityProperty: !0 })'] },
    chunkFeatures: ['i = n?.yieldsToUser === !0;', '(!i || !Xj(r.view.dom)) && Fi()', '((Kr.current = t ?? "end"), !r)',
      'e.focus({ preventScroll: !0 });', '(X.commands.focus(Kr.current), !0)',
      '(t.view.focus(), t.commands.focus(null, { scrollIntoView: !1 }));', 'Xr = T(-1 / 0)',
      'if (!(e.shiftKey || e.altKey)) {', '(e.repeat || Date.now() < Xr.current) &&', '(e.metaKey || e.ctrlKey || zs())'] },
  // c227f4d5e cM: the key labels of the Send hint rows and of uM's running-turn placeholder ("{sendKey} to send,
  // {queueKey} to queue for later", compact "{queueKey} to queue" when the fit probe overflows). Its own module so the
  // pure placeholder model (composer-placeholder.mjs) reads it without loading the Send cell's React tree.
  { target: 'composer-key-label.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { cM: 'shortcutLabel' },
    features: { cM: ['.join("+")', 'e.spoken ?? e.label'] },
    chunkFeatures: ['import { t as Kf } from "./c1c6ea9ac-D4q2aGJF.js";',
      'ze = !!V && !ge && Le && !A && !I && re === null,', 'defaultMessage: "{sendKey} to send, {queueKey} to queue for later",',
      'id: "mZ6xnUz7iS",', '{ sendKey: cM("enter", Re, e), queueKey: cM("cmd+enter", Re, e) },',
      '{ defaultMessage: "{queueKey} to queue", id: "FIL0bW8Kgx" },', '{ queueKey: cM("cmd+enter", Re) },',
      'We = ze ? Be(!0) : U ? Ve : void 0,', 'qe = (Kf(Ge, Ve) ? He : void 0) ?? Ve,',
      '{ ...t, "aria-description": We, ...(qe === Ve ? {} : { title: Ve }) }', 'placeholder: K ? "" : Je ? Xe : qe,',
      'placeholderFit: He === void 0 || U ? "grow" : "clamp",', '"data-placeholder-fit-probe": Ve,',
      '"invisible me-px whitespace-nowrap before:content-[attr(data-placeholder-fit-probe)]",'] },
  // c227f4d5e lM: the Send/Stop cell (code-prompt-trailing-controls > code-prompt-send-cell with the invisible size
  // placeholder), Ij crossfade, sM hint rows, Mj idle-action state context, QO hasText store reader (cM comes from
  // composer-key-label.mjs).
  { target: 'composer-send-cell.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: {
      lM: 'ComposerSendCell', Ij: 'SubmitCrossfade', sM: 'SendHintRow', Mj: 'IdleSendStateContext',
      vA: 'preventFocusSteal', QO: 'useComposerHasText',
    },
    features: {
      lM: ['"data-testid": "code-prompt-trailing-controls"', '"data-testid": "code-prompt-send-cell"', 'className: "size-control"',
        'Date.now() - h.current < Qj', 'defaultMessage: "Queue for later"', 'defaultMessage: "Send and stay here"', 'keys: "cmd+alt+enter"'],
      Ij: ['e.propertyName === "visibility"', 'inert: !0'], sM: ['D(uo, { keys: t })'],
      Mj: ['F(void 0)'], vA: ['e.preventDefault()'], QO: ['e.readOutsideRender', 'e.subscribe('],
    },
    // OP's Stop press stamps the 500ms Send guard; its click options are a steer while a queueable turn runs.
    chunkFeatures: ['((Et.current = Date.now()), Di(), kt({ trigger: e }));',
      'J.current && !wt.current && ln.current ? { priority: "next" } : void 0,',
      'Ki = _ !== void 0 && st && !Wi ? _ : void 0,', 'zi = zt || !Le,', 'Vi = B || Bi || zi,'] },
  // R3-composer (composer-copy-command): the transcript predicates /copy reads replies with, pure functions over the
  // official transcript entries ({author, items, synthetic, derived, heldIn, channel, localOutput, provisionalMessageId}).
  // cb27dab29 Pe (c227f4d5e Sg): a text-bearing item (text or narration_summary).
  { target: 'transcript-text-item.mjs', source: 'cb27dab29-_H2_XKli.js', exports: { Pe: 'isTranscriptTextItem' },
    officialExports: { Pe: 'y' }, features: { Pe: ['e.kind === "text"', '"narration_summary"'] } },
  // c06cf64bb yu (c227f4d5e r_): an assistant placeholder entry that has no items yet.
  { target: 'transcript-provisional.mjs', source: 'c06cf64bb-BE5q2vSr.js', exports: { yu: 'isEmptyProvisionalEntry' },
    officialExports: { yu: '_r' }, features: { yu: ['e.provisionalMessageId !== void 0 && e.items.length === 0'] } },
  // c4d199b75 ot (c227f4d5e Ih): the kind of a user entry ("bubble", "bash", "event", "commentSummon", …).
  { target: 'transcript-user-kind.mjs', source: 'c4d199b75-BCsc0Miu.js', exports: { ot: 'userEntryKind' },
    officialExports: { ot: 'C' }, features: { ot: ['case "commentSummon":', '"bash"', '"bubble"'] } },
  // c227f4d5e yE / _E / DE / EE / cE (cc43287c9 gS / Kv / rb / gx): an assistant entry, a user turn boundary, the entry
  // that ends a finished reply, the reply's items back to its turn boundary, and its text items joined by blank lines.
  { target: 'transcript-replies.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: { yE: 'isAssistantEntry', _E: 'isUserTurnEntry', DE: 'endsFinishedReply', EE: 'replyItems', cE: 'replyText' },
    officialExports: { yE: 'zs', DE: 'Bs', EE: 'Ws', cE: 'nc' },
    features: {
      yE: ['e.author === "assistant" && !r_(e)'], _E: ['e.author === "user" && gE(e) && Ih(e.items) !== "bash"'],
      DE: ['if (i.channel !== void 0) return !0;', 'return !n;'], EE: ['TE(e, t, n).flat()'],
      cE: ['Sg(e) && e.text.length > 0 ? [e.text] : []'],
    } },
  // cc43287c9 QX: the /copy [N] argument (cc183b3ab argumentHint "[N]", terminalAction "copy-reply").
  { target: 'copy-reply-arg.mjs', source: 'cc43287c9-DAfOi8yP.js', exports: { QX: 'parseCopyReplyCount' },
    features: { QX: ['e === "" ? 1', '/^[1-9]\\d*$/.test(e)'] }, chunkFeatures: ['case "copy-reply": {', 'let s = QX(i.arg);'] },
  // cc43287c9 $X / eZ: the replies /copy can take (finished, not localOutput, non-empty text) and the replying flag.
  // The chunk pins hold the copy-reply case around them: the four refusals, l[l.length - s], the plain_html write with
  // its success toast, and restoreComposer('/copy N') with the failure toast (composer-copy-reply.mjs transcribes them).
  { target: 'copy-reply-replies.mjs', source: 'cc43287c9-DAfOi8yP.js', exports: { $X: 'copyableReplies', eZ: 'copyReplyTranscript' },
    features: { $X: ['i.localOutput === !0', 'a !== "" && n.push({ entryId: i.id, text: a });'], eZ: ['replying: e.responding', '$X(e.entries, e.responding)'] },
    chunkFeatures: ['let { replying: c, replies: l } = eZ(e.transcriptTurns());', 'id: "d6GVin8ZgF",', 'id: "iAkUwGZZtY",',
      'id: "iZ+iUUQvSB",', 'id: "kT+SiiA0vq",', '{ count: l.length },', 'let u = l[l.length - s];', 'formats: "plain_html",',
      'Yb(u.text, n, o).then((n) => {', 'id: "wSG94kLy28",', 'i.arg === "" ? `/${i.name}` : `/${i.name} ${i.arg}`,', 'id: "z7U1VhFXoU",',
      'rZ = new Set(["copy-reply", "effort", "fast", "no-app-ui"]);'] },
  // cc43287c9 l0/u0/a0: the environment bar under the presets draft card (StartCard rail) with the iconOnly fit.
  { target: 'environment-bar.mjs', source: 'cc43287c9-DAfOi8yP.js',
    exports: {
      l0: 'EnvironmentBar', u0: 'EnvironmentChip', c0: 'EnvironmentChipGroup', a0: 'useEnvironmentBarFit',
      i0: 'environmentBarSignature', n0: 'EnvironmentIconOnlyContext', r0: 'environmentBarHysteresis',
      o0: 'environmentChipClass', s0: 'environmentLineSurfaceClass',
      // x6 modelMenu "bar": y6, the bar triggers' class (shrink, text-secondary), and b6, their label (the truncating or
      // givesWay name, the overridden accent / warning tone, the hidden description, the model trigger's tail words).
      y6: 'environmentTriggerClass', b6: 'EnvironmentTriggerLabel',
    },
    features: {
      l0: ['"data-testid": "epitaxy-environment-bar"', '"data-testid": "environment-bar-mode"', 'flex shrink-0 empty:hidden',
        '"text-muted-as-secondary"', 'n0.Provider'],
      u0: ['"data-icon-only": l ? "" : void 0', 'hoverable: !1', 'className: rk.className'],
      c0: ['flex empty:hidden ${o0}'], a0: ['l.offsetTop >= c.offsetTop + c.offsetHeight', 'n.width < e.need + r0', 'd(() => t(i))'],
      i0: ['.join("|")'], n0: ['C(!1)'], r0: ['r0 = 2'], o0: ['[[data-landing-texture=canvas]~div_&]:rounded-none', '${FP}'],
      s0: ['[[data-landing-texture=canvas]~div_&]:bg-[var(--epitaxy-transcript-surface,var(--cds-surface-1))]'],
      y6: ['`${t ? "shrink" : "min-w-0 shrink"}${e ? " text-secondary" : ""}`'],
      b6: ['"data-overridden": t || void 0', 'flex min-w-0 items-center gap-1 ${n ? "text-warning" : t ? "text-accent" : ""}', 'className: a ? Il : "truncate"'],
    } },
  // R3-composer composer-row-chin: shared-8 KV (exported `v`, c227f4d5e Qu), the context ring svg yZ draws in the usage
  // trigger (size 12 by default, 14 in the row chin and the environment bar's ring; track and arc data attributes), and
  // UV (exported `b`, c227f4d5e Uu), its fill by threshold (accent / warning ≥ 75 / danger ≥ 90).
  { target: 'usage-ring.mjs', source: 'shared-8-B5lJ8U5C.js', exports: { KV: 'UsageRing', UV: 'usageRingStroke' },
    officialExports: { KV: 'v', UV: 'b' },
    features: { KV: ['size: n = WV', 'className: "-rotate-90"', '"data-ring-track": ""', '"data-ring-arc": ""', 'stroke: r ?? UV(e)'], UV: ['return HV(IV(e))'] } },
  // R3-composer composer-row-chin: c227f4d5e rQ, the mode trigger's label (tQ's CdsButton child: the truncating span,
  // text-warning for Manual, the hidden description its aria-describedby names), and DK, the row model trigger class
  // (LK `t === "row" ? DK`). The chunk pins hold the rest of bQ's row branch the host chin transcribes (only the mode
  // picker leading, in "flex items-center ms-0.5" + Sg; the trailing Bo(Va, "gap-1", Sg, "compact:me-1"); the 14px ring
  // without the composer's open request; no EngineFooterStrip), tQ / vQ / _Q around the label, yZ's sized ring (alpha-4
  // track, the Fa slot) and LK's row placement (side top, align end).
  { target: 'composer-row-chin.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { rQ: 'ModeTriggerLabel', DK: 'rowModelTriggerClass' },
    features: {
      rQ: ['"grid grid-cols-[minmax(0,1fr)]"', '"overflow-x-clip text-ellipsis whitespace-nowrap"', 't && "text-warning"', 'hidden: !0'],
      DK: ['DK = "text-secondary"'],
    },
    chunkFeatures: [
      'Le = Ne === "row",', 'className: Le ? Ua : void 0,', 'Le && "compact:me-1",', 'ringSize: Le ? 14 : void 0,',
      'openRequest: Le ? null : oe,', 'At !== null && !Le ? D(At.EngineFooterStrip, { sessionId: kt }) : null,',
      '"flex items-center ms-0.5 [--cds-h-control:calc(1.5rem*var(--cds-rem-scale,1))] [--cds-pad-md:calc(0.375rem*var(--cds-rem-scale,1))] [--cds-font-size-body:calc(0.8125rem*var(--cds-rem-scale,1))] [--cds-leading-body:calc(1.25rem*var(--cds-rem-scale,1))]",',
      'labelTone: xt ? "warning" : void 0,', 'description: xt ? bt : void 0,', 'label: d && (!y || Ue) ? D(_Q, { label: vt, name: gt }) : vt,',
      'content: r === !1 ? void 0 : (r ?? t),', 'className: "min-w-0 shrink",', '"aria-describedby": y ? _ : void 0,',
      'warning: p === "warning" && !a,', 'y = a ? void 0 : m,', 'className: "inline-flex min-w-0",', 'className: "relative block",',
      'D("span", { "aria-hidden": !0, className: "invisible", children: e }),', 'className: "absolute inset-0 flex items-center",',
      'c === void 0 ? "var(--cds-alpha-2)" : "var(--cds-alpha-4)",', 'c === void 0 ? S : D("span", { className: Fa, children: S }),',
      'className: t === "titlebar" ? "min-w-0 shrink" : t === "row" ? DK : void 0,',
      'side: t === "composer" || t === "row" ? "top" : "bottom",', 'align: t === "composer" || t === "chin" || t === "row" ? "end" : "start",',
    ] },
  // R3-composer step 3 (R2 review of the cc43287c9 focus call sites): shared-8 xM (exported `Cr`), the keyboard-activation
  // test the goal strip's Edit hands Rte (cf74bc599 `onClick: (e) => s(d, Da(e.nativeEvent))`, Da = Cr): a click with
  // detail 0 and no pointer type came from the keyboard, so the prefilled composer also ignores a stray Enter.
  { target: 'keyboard-activation.mjs', source: 'shared-8-B5lJ8U5C.js', exports: { xM: 'isKeyboardActivation' },
    officialExports: { xM: 'Cr' }, features: { xM: ['e.detail === 0', '!("pointerType" in e && e.pointerType)'] } },
  // ---- R3-composer step 3, composer-shell (research/composer.md §4.2, ledger composer-01 / composer-03): the CDS
  // ChatComposer shell shared-5 Af (exported `Ac`) with its parts table jf (`kc`: Header / Attachments / Actions /
  // PrimaryAction / Chin / Overlay / Tray), the focus ref Df (`Mc`) and the form placeholder Ef (`Nc`) — the roots the
  // official plain-text precedent cca4865c3 Hf imports; not bp (`bc`), whose editor lazy-loads tiptap (shared-9), and which
  // src/source-composer-shell.jsx transcribes for the local ProseMirror editor instead. The closure stays inside shared-5 /
  // shared-26 / shared-3 / shared-2 / shared-1 plus shared-frame and vendor-frame (no boundary, no dynamic import). What
  // view-tabs publishes is imported by its semantic name (CdsButton, CdsIcon, CdsTooltip, CdsDensityContext,
  // cdsClassNames, clsx); the rest of shared-frame / shared-2 / vendor-frame is copied once into the viewTabsSame modules
  // below (D1: no minified-name import of view-tabs). The page drop scrim's surface root gf is a host adapter.
  //
  // vendor-frame re (exported `Eo`): the React version the bundle shipped with; shared-frame qm turns it into the form of
  // the `inert` attribute (boolean from React 19 on — the host runs 19.3).
  { target: 'chat-composer-react-version.mjs', source: 'vendor-frame-DfPJ1QmD.js', viewTabsSame: true, oneCopy: true,
    exports: { re: 'bundledReactVersion' }, officialExports: { re: 'Eo' }, features: { re: ['re = "19.2.4"'] } },
  // shared-frame: every binding of the shell's closure that view-tabs holds but publishes no name for, copied (one copy):
  // the renderable test (Ym), the stays-secondary header tone (Mt), the CDS-root reads (Sa, Ya, Z, vr; their contexts are
  // view-tabs names since R4g-composer CP1),
  // the isomorphic layout effect (Q), inert props (Jm), the pointer / narrow media subscriptions (tn, Qt, en), the icon
  // size resolver (Oo) (the CdsButton icon-size context Xl is view-tabs CdsButtonIconSizeContext), the guarded observers (Yn, Jn, bu), callback refs (Cn, wn,
  // Dn), node tests (tf, $d, Qd, lc), the owner window (Ji), the rem probe (ho), reduced motion (Tm), click-to-focus (ph),
  // the surface token test and focus shadow (Ga, ch; the surface context Ea is view-tabs CdsSurfaceContext), animation settling (Qm), the drop scrim layer (Bd), the
  // platform test (Ms), the iframe focus test ($m), the stray-Enter guard after a focus move (cn), the click modifier
  // source (Wm) and aria-keyshortcuts (Js).
  { target: 'chat-composer-frame.mjs', source: 'shared-frame-BfjMqbuN.js', viewTabsSame: true, oneCopy: true,
    exports: {
      Ym: 'isRenderable', Mt: 'textStaysSecondaryClass', Sa: 'useRootNaturalImageTiles', Q: 'useIsomorphicLayoutEffect',
      Jm: 'inertProps', tn: 'subscribePointerMedia', Qt: 'prefersTouch', Oo: 'resolveIconSize', Yn: 'guardedMutationObserver',
      aa: 'sizeAttribute', bu: 'ownerResizeObserver', Jn: 'guardedResizeObserver',
      Cn: 'useOptionalEventCallback', tf: 'isTextarea', Ji: 'ownerWindowOf', ho: 'rootRemPx', Ya: 'useRootOwnerWindow',
      Qd: 'isDomNode', Tm: 'prefersReducedMotion', ph: 'useClickToFocus', $d: 'isHtmlElement', Z: 'useCdsLabel',
      Ga: 'isSurfaceToken', ch: 'surfaceFocusShadowStyle', Dn: 'useMergedRefCallback',
      Qm: 'afterAnimationsSettle', Bd: 'dropScrimLayer', Ms: 'useIsMac', vr: 'useFizzyLakePart', wn: 'useEventCallbackRef',
      lc: 'elementOrNull', $m: 'isUnfocusedFrame', cn: 'swallowEnterAfterFocusMove', en: 'isFinePointerHost', Wm: 'clickModifierSource',
      Js: 'ariaKeyShortcuts',
      // R4g-composer CP4 (X7-10): what the shared-2 Image / File / Quote tiles import from shared-frame — the label text
      // sanitizers (fn / pn / mn / hn), the tooltip-safe text (gn) and the Skeleton (dd, the pending tile's shimmer; the
      // TextLink the failed strip's Retry renders is a host adapter instead, see chat-composer-attachments.mjs).
      fn: 'sanitizeLabelText', pn: 'collapseControlText', mn: 'isBlankLabelText', hn: 'trimLeadingInvisible', gn: 'tooltipSafeText',
      dd: 'CdsSkeleton',
      // R4i-graph GR3: the density reader (ja, already copied for the shell's closure) the Video tile reads too, and the
      // layer-aware z-index (Jd, exported `Uc`) the pane drop halo reads (see contextCopies).
      ja: 'useRootDensity', Jd: 'useLayerAwareZIndex',
    },
    officialExports: {
      Ym: 'gc', Mt: 'Sd', Sa: 'pu', Q: 'Qu', Jm: '_c', tn: 'bd', Qt: '_d', Oo: 'Gl', Yn: 'Ku', aa: 'ou', bu: 'al',
      Jn: 'qu', Cn: 'nd', tf: 'zc', Ji: 'xu', ho: 'ql', Ya: 'mu', Qd: 'Rc', Tm: 'wc', ph: 'cc', $d: 'Ic', Z: 'ad',
      Ga: 'ru', ch: 'uc', Dn: '$u', Qm: 'hc', Bd: 'Bc', Ms: 'Nl', vr: 'Uu', wn: 'td', lc: 'vl', $m: 'mc', cn: 'fd', en: 'hd',
      Wm: 'Sc', Js: 'Ml',
      fn: 'ud', pn: 'ld', mn: 'od', hn: 'dd', gn: 'cd', dd: '$c', ja: 'su', Jd: 'Uc',
    },
    features: {
      Ym: ['e != null && typeof e != "boolean"'], Mt: ['text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))]'],
      Sa: ['return W(xa) ?? !1;'], Q: ['Q = typeof window < "u" ? wt : K'], Jm: ['inert: qm ? !0 : ""'],
      tn: ['[Kt, qt, Jt].map((e) => n.matchMedia(e))'], Qt: ['return Zt(Kt, e);'], Oo: ['return To(e, Do());'],
      Yn: ['takeRecords: () => n.observer?.takeRecords() ?? []'], aa: ['"data-size": e'],
      bu: ['e?.ownerDocument.defaultView?.ResizeObserver'], Jn: ['unobserve: (e) => n.observer?.unobserve(e)'],
      Cn: ['return e === void 0 ? void 0 : n;'], tf: ['e.localName === "textarea"'], Ji: ['e?.ownerDocument.defaultView ?? globalThis.window'],
      ho: ['typeof document > "u" ? 16 : mo(po())'], Ya: ['return Ji(W(Oa));'], Qd: ['typeof e?.nodeType == "number"'],
      Tm: ['window.matchMedia(Cm).matches', 'getAttribute(wm) === "true"'], ph: ['clickToFocusProps:', 'shouldIgnoreTarget: i'],
      $d: ['return Zd(e) === Yd;'], Z: ['return bn(W(vn), e, t, n);'], Ga: ['return Wa.has(e);'],
      ch: ['"--cds-focus-shadow": oh[t]', '"--cds-focus-shadow-danger": sh[t]'], Dn: ['return U(() => En(e, t, n), [e, t, n]);'],
      Qm: ['Promise.allSettled(r.map((e) => e.finished))'], Bd: ['Bd = 9e3'], Ms: ['As.test(navigator.userAgent)'],
      vr: ['return _r(gr(), e);'], wn: ['let [n] = f(() => xn(t));'], lc: ['return e?.nodeType === 1 ? e : null;'],
      $m: ['t.top !== t.self && !e.hasFocus()'], cn: ['e.key === "Enter" && (e.repeat || (t && performance.now() < n))'],
      en: ['navigator?.userAgent?.includes(Yt)'], Wm: ['modifierKey: e.metaKey || e.ctrlKey, source: t'], Js: ['let o = t ? "Meta" : "Control"'],
      fn: ['return e.replace(un(), dn);'], pn: [String.raw`.replace(/[\t\n\v\f\r\u0085\u2028\u2029]+/g, " ")`],
      mn: ['return hn(e) === "";'], hn: [String.raw`return e.replace(/^(?:\s|\u200C|\u200D|\uFE0E|\uFE0F)+/u, "");`],
      gn: ['let t = fn(e);'], dd: ['Object.assign(rd, { Rows: od, Chip: sd, Lines: ld, Block: ud })'], ja: ['return W(la);'], Jd: ['let t = W(Vd);', 'useCdsLayerAwareZIndex(${e})', 'return (Gd('],
    },
    // The two contexts the shell itself provides are the ones its readers mean: CdsButton's icon size (Zl reads Xl) and
    // the CDS surface (za reads Ea, CdsRoot provides it as pageBackground); both are view-tabs instances (R4g CP1).
    chunkFeatures: ['n = W(Xl);', 'function za() {\n  return W(Ea);\n}'] },
  // shared-2: the Attachments part MessageAttachments (Vp; the shell's `Va` is Hp = Vp, see substitutes), the view
  // transition hook the shell hands its attachments (Of, exported Gg), their context (Ef, Ug) and the drop scroll parent (df, qg).
  { target: 'chat-composer-attachments.mjs', source: 'shared-2-Cb74JByF.js', viewTabsSame: true, oneCopy: true,
    // A tile's failed strip renders shared-frame Cd (exported `Xc`) as its Retry: R4i-graph GR3 named it in view-tabs
    // (CdsTextLink), so it is imported like every other published binding; the R4g CP4 throwing stand-in is gone.
    exports: { Vp: 'MessageAttachments', Of: 'useAttachmentTransition', Ef: 'AttachmentTransitionContext', df: 'scrollParentOf',
      // R4g-composer CP4 (X7-10): Hp's Image / File / Quote tiles (wp / Pp / Bp) and the attachment attributes c0fbbe82d
      // mr stamps on a tile (hf, gf, Sf over jf). R4i-graph GR3: and its Video tile (Ap), so the tile set is all of Hp.
      wp: 'AttachmentImage', Pp: 'AttachmentFile', Bp: 'AttachmentQuote', Ap: 'AttachmentVideo',
      hf: 'attachmentAttribute', gf: 'attachmentRestoredAttribute', Sf: 'attachmentTransitionNameProperty', jf: 'attachmentTransitionName' },
    officialExports: { Of: 'Gg', Ef: 'Ug', df: 'qg', hf: 'Bg', gf: 'Hg', Sf: 'Vg', jf: 'Wg' },
    features: {
      Vp: ['"data-cds": "MessageAttachments"', 'thumbnailHeight: t = !1'], Of: ['skipTransition()'], Ef: ['Ef = y(null)'],
      df: ['xu(e.ownerDocument.defaultView ?? void 0) ? uf(e) : null'],
      wp: ['"data-cds": "MessageAttachmentsImage"', 'state: l,'], Pp: ['"data-cds": "MessageAttachmentsFile"', 'shownBadge: np(a ?? ap(l)[1].toUpperCase()),'],
      Bp: ['"data-cds": "MessageAttachmentsQuote"', 'w-[3px] shrink-0 self-stretch rounded-full bg-border'],
      Ap: ['"data-cds": "MessageAttachmentsVideo"', 'G("playVideo", Mf.playVideo, { item: m })', 'preload: "metadata",'],
      hf: ['hf = "data-cds-attachment"'], gf: ['gf = "data-cds-attachment-restored"'], Sf: ['Sf = "--cds-attachment-vt-name"'],
      jf: ['return `cds-attachment-${e.replace(/[^a-zA-Z0-9_-]/g, "-")}`;'],
    },
    chunkFeatures: ['Hp = Object.assign(Vp, { Image: wp, Video: Ap, File: Pp, Quote: Bp })'] },
  // shared-1: the composer dock context (docked, setComposerStartInset — no dock in the host, so its defaults), the dock
  // group attribute and the masked dock surface class.
  { target: 'chat-composer-dock.mjs', source: 'shared-1-CAAiD7E3.js', oneCopy: true,
    exports: { gu: 'ComposerDockContext', Cu: 'dockGroupAttribute', Mu: 'dockMaskedClass' },
    officialExports: { gu: 'dm', Cu: 'pm', Mu: 'im' },
    features: { gu: ['docked: !1, setComposerStartInset: void 0'], Cu: ['"data-cds-dock-group"'], Mu: ['in-data-cds-dock-masked:bg-page'] } },
  // shared-3: the CDS presence (xm = gm with Div / Span: the header row's enter / exit) and its reduced-motion hook om.
  { target: 'chat-composer-presence.mjs', source: 'shared-3-DnHYUZdJ.js', oneCopy: true,
    exports: { xm: 'Presence', om: 'usePresenceMotion' },
    officialExports: { xm: 'Am', om: 'Nm' },
    features: { xm: ['Object.assign(gm, { Div: bm("div"), Span: bm("span") })'], om: ['om = () => Zp'] } },
  // shared-26: the shell's layout context (Ha: multiline / startInset / endInset / glideArmed / columnReservesTrailing), its
  // send-state context (Ua) and send-pin context (Wa), the inset / row / transition classes the parts read, and the
  // editor-side helpers the host editor wears like shared-9's ChatComposerEditorImpl cm (Ot = qa editor class, Et = Ia
  // min / max height, St = no ProseMirror content classes).
  { target: 'chat-composer-layout.mjs', source: 'shared-26-CgdP_nTj.js', oneCopy: true,
    exports: {
      Ha: 'ChatComposerLayoutContext', Ua: 'ChatComposerSendContext', Wa: 'SendPinContext', za: 'startInsetClass', ja: 'editorRowClass',
      Na: 'insetTransitionClass', Va: 'multilineThreshold', La: 'hasMinLines', Aa: 'composerTypeVariables', Ma: 'insetDurationClass',
      Ka: 'reserveTrailingClass', qa: 'editorClass', Ia: 'editorSizeStyle', no: 'proseMirrorContentClass',
      // R4g-composer CP2 (X7-08): cm's placeholder — the fit (Ja = shared-9 Rt), its box (Ya), the grow ghost's props
      // (Qa = jt), the placeholder span's props ($a = Ft) and the editor box's stacking grid (eo, cm's literal).
      Ja: 'resolvePlaceholderFit', Ya: 'placeholderFitBox', Qa: 'placeholderGhostProps', $a: 'placeholderProps', eo: 'stackedEditorClass',
    },
    officialExports: {
      Ha: 'Jm', Ua: 'Km', Wa: 'qm', za: 'dh', ja: 'Zm', Na: 'nh', Va: 'ah', La: 'sh', Aa: 'ih', Ma: 'Xm', Ka: 'eh', qa: 'gh', Ia: '_h', no: '$m',
      Ja: 'yh', Ya: 'ch', Qa: 'lh', $a: 'uh', eo: 'th',
    },
    features: {
      Ha: ['startInset: "none"', 'columnReservesTrailing: !1'], Ua: ['hasContent: !1, busy: !1, pinSend: !1, form: "new"'], Wa: ['Wa = _(null)'],
      za: ['return e === "none" ? void 0 : Ra[e];'], ja: ['py-[var(--cmp-row-py)]', 'leading-[var(--cmp-leading)]'],
      Na: ['motion-safe:transition-[padding-left,padding-right]'], Va: ['Va = 0.3'], La: ['return e !== void 0 && e > 1;'],
      Aa: ['[--cmp-row-h:calc(var(--cmp-leading)+2*var(--cmp-row-py))]'], Ma: ['Ma = "motion-safe:duration-200"'],
      Ka: ['Ka = "pr-[var(--cmp-trail-w,0px)]"'], qa: ['t && "cursor-default opacity-60"'], Ia: ['calc(${e}lh + 2 * var(--cmp-row-py))'],
      no: ['[&_.ProseMirror:focus]:outline-none', "[&_.is-editor-empty]:before:!content-['']"],
      Ja: ['return t ?? (La(e) ? "grow" : "clamp");'],
      Ya: ['className: `line-clamp-[var(--cmp-placeholder-lines)] break-words ${Xa}`', '{ lines: n, className: "truncate", style: void 0 }'],
      Qa: ['"invisible pointer-events-none select-none max-w-full self-start"', '"data-composer-placeholder-ghost": e,'],
      $a: ['"pointer-events-none select-none absolute left-0 top-0 max-w-full max-h-96 overflow-hidden"', '!o && "transition-none motion-safe:transition-none",', 'Ga,'],
      eo: ['eo = "grid [&>*]:[grid-area:1/1] [&>*]:min-w-0"'],
    },
    // shared-9 cm wears them on its ChatComposerEditor box (the host editor transcribes it in source-composer-shell.jsx).
    chunkFeatures: ['Ha = _({'] },
  // shared-5: the shell and its parts (Af, jf), the focus ref (Df) and the form placeholder (Ef).
  { target: 'chat-composer-shell.mjs', source: 'shared-5-kdJVRUsT.js', oneCopy: true,
    exports: { Af: 'ChatComposerShell', jf: 'ChatComposerParts', Df: 'useChatComposerFocusRef', Ef: 'chatComposerFormPlaceholder',
      // R4g-composer CP2 (X7-08): what shared-9 cm imports for its placeholder — the resolved copy (Xf = cm Xi, rotating
      // phrases for an object placeholder) and the grow ghost lines (Yf = cm Qi).
      Xf: 'useResolvedPlaceholder', Yf: 'placeholderGhostLines' },
    officialExports: { Af: 'Ac', jf: 'kc', Df: 'Mc', Ef: 'Nc', Xf: 'Dc', Yf: 'Ec' },
    features: {
      Af: ['"data-cds": "ChatComposer"', 'g.trailingNotch === "float"', 'r.style.setProperty("--cmp-wrap-h", e)', 'qe({ disabled: We, onMeasureTarget: I, extraEditorAttributes: Ke })',
        '"--cmp-lead-w": `${ue}px`, "--cmp-trail-w": `${de}px`', 'enabled: e === void 0 && !Oe'],
      jf: ['Header: Jd,', 'Attachments: Va,', 'Actions: Id,', 'PrimaryAction: Ou,', 'Chin: Kd,', 'Overlay: qd,', 'Tray: Xd,'],
      Df: ['focus: H(() => t.current?.focus(), [])'], Ef: ['_o("replyPlaceholder", Tf.replyPlaceholder)'],
      Xf: ['i = n?.intervalMs ?? 5e3,', 'if (!t || p <= 1 || l || Kf()) return;', 'rotating: !1,'],
      Yf: ['if (typeof e == "string") return e === "" ? [] : [e];'],
    },
    // bp's editor contract (yp: the shell props it fills in for its tiptap editor, vp storeCaret) and the Code card's use
    // of it (c227f4d5e uM), both transcribed by src/source-composer-shell.jsx / source-composer.jsx.
    chunkFeatures: ['trailingNotch: "float",', 'handoffCard: va.div,', 'storeCaret: l,', 'hasDraftText: () => fi(n?.tipTapEditorState),',
      'e.commands.setTextSelection(e.view.posAtDOM(t, n)), e.view.focus());', 'render: (e) =>\n            O(_p, { ref: o, ...n, placeholder: n?.placeholder ?? u, ...e }),'] },
  // R4g-composer CP2 (X7-08): shared-28 Jx (exported `Fi`, shared-9 cm's `...Ja`), the element-timing mark cm spreads on
  // its placeholder span; the docEmptyAttribute extension next to it (Kx: data-doc-empty on the ProseMirror element, which
  // the official sheet's placeholder guard reads) is pinned, the host card renders the attribute (source-composer-shell.jsx).
  { target: 'chat-composer-placeholder-timing.mjs', source: 'shared-28-DcgD7xXH.js', exports: { Jx: 'placeholderElementTiming' },
    officialExports: { Jx: 'Fi' }, features: { Jx: ['elementtiming: "composer-placeholder-text"'] },
    chunkFeatures: ['Gx = "data-doc-empty",', '[Gx]: Gd(e.doc) ? "true" : "false"'] },
  // ---- R4g-composer CP3 (X7-09): the Add menu trigger c227f4d5e Oj (exported `Zo`; c73f45bc3 pv passes it as the presets
  // card's actionsLeading, `Fi` there). Oj itself runs on the CDS Dropdown (Po = shared-frame qa) with the cfca6870a `oy`
  // item renderer, the file_upload shortcut registry (shared-1 Ln) and a hidden file input; the host menu is the composer's
  // SourceMenu (D25) opened through main.jsx onMenu, so src/source-composer-add-menu.jsx transcribes the trigger and the
  // popup (pinned below), and these are the pure pieces it reads: the trigger size table (Ej), the first row's descriptor
  // (Dj, "Add files or photos" / "Add image") and the image-only accept list (Sj).
  { target: 'composer-add-menu.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: { Ej: 'addTriggerSizes', Dj: 'addFilesMenuItem', Sj: 'imageFileAccept' },
    features: {
      Ej: ['Ej = { small: "sm", base: "base", large: "lg" }'],
      Dj: ['defaultMessage: "Add files or photos",', 'id: "vVSGqeakjA",', 'e.formatMessage({ defaultMessage: "Add image", id: "jsBzHH0H/K" })', 'icon: "Attachment",'],
      Sj: ['Sj = "image/png,image/jpeg,image/gif,image/webp"'],
    },
    chunkFeatures: ['Oj as Zo,', 'icon: s = "Add",', 'size: c = "small",', 'glyphSize: u = sy,', 'let p = { size: u },', 'h = l ?? c === "small",',
      'A = y ? x : void 0,', 'if (!e) return n ?? Cj;', 'let r = Dj(_, { supportsFileAttachments: t, shortcut: A, onSelect: C });', 'return n ? [r, ...n] : [r];',
      'te = _.formatMessage({ defaultMessage: "Add", id: "alWu/MbgXB" }),', 'V = s ?? "Add";',
      'D(lo, {\n              content: te,\n              children: D(Po.Trigger, {\n                disabled: !r && j.length === 0,',
      'render: D(So, {\n                  variant: "ghost",\n                  size: Ej[c],\n                  iconOnly: !0,\n                  icon: h\n                    ? D(ry, {\n                        className: d,\n                        children: D(ro, { name: V, ...p, className: ay }),\n                      })\n                    : V,\n                  "aria-label": te,\n                  tooltip: !1,\n                  className: "shrink-0",',
      'accept: t ? void 0 : Sj,', 'function Aj({ items: e, renderItem: t }) {\n  return D(m, { children: e.map(t) });\n}',
      'return D(Po.Popup, {\n    side: e,\n    align: "start",\n    className: "epitaxy-root break-words",\n    container: t,\n    collisionPadding: zl,',
      'leading: Oe ?? ft,'] },
  // shared-18 GR (exported `xn`, c227f4d5e `zl`): the collision padding Oj's popup jj (and the oy submenus) keep from the
  // window edges, 48px under the titlebar.
  { target: 'menu-collision-padding.mjs', source: 'shared-18-D4XxL6Tg.js', exports: { GR: 'menuCollisionPadding' },
    officialExports: { GR: 'xn' }, features: { GR: ['GR = { top: 48, right: 8, bottom: 8, left: 8 }'] } },
  // ---- R4g-composer CP4 (X7-10, composer-12): the Code card's attachment tiles and its one intake route.
  // c0fbbe82d's tile wrappers (Ri's Bi / Vi / Hi render them): hr (an image: Hp.Image, pending while it loads, the "Processing
  // image" status, a press opens it), _r (a file or folder: Hp.File, the extension or "Folder" as its badge), vr (a quote
  // snippet: Hp.Quote), the restored / view-transition attributes mr, and pr's remove that hands focus to the next tile
  // (fr / dr). U (= shared-2 Hp, `Object.assign(Vp, { Image, Video, File, Quote })`) is answered by the tile set the
  // adapter module builds from the generated tiles (all four, .Image / .Video / .File / .Quote; since R4i-graph GR3 gr,
  // the Video wrapper, is sliced too: official Vi shows a Video tile only for an attachment that keeps its File, which a
  // local environment's _G attachments never do, so the host strip routes through the same test). Dt (c856385e2 On, the path hover card with open / reveal rows over shared-28 /
  // shared-104 / the file-preview services) and Y (react-intl FormattedMessage) are host adapters too.
  // R4i-graph GR3: what gr, the Video tile wrapper, and Vi's video branch read. shared-7 dC (exported `ci`, c0fbbe82d
  // `at`): the File's object URL, shared by every subscriber and revoked with the last one; shared-28 bk (exported `In`,
  // c0fbbe82d `Ze`): the video file name test.
  { target: 'composer-object-url.mjs', source: 'shared-7-B8UIMGDr.js', exports: { dC: 'useFileObjectUrl' },
    officialExports: { dC: 'ci' },
    features: { dC: ['n = j(() => (e ? sC.get(e)?.url : void 0), [e]);', 'return N(t, n, uC);'] },
    chunkFeatures: ['url: URL.createObjectURL(e), subscribers: new Set()', 'r.subscribers.size === 0 && (URL.revokeObjectURL(r.url), sC.delete(e))'] },
  { target: 'composer-video-types.mjs', source: 'shared-28-DcgD7xXH.js', exports: { bk: 'videoFileNamePattern' },
    officialExports: { bk: 'In' }, features: { bk: ['bk = /\\.(mp4|webm|mov)$/i'] } },
  { target: 'composer-attachment-tiles.mjs', source: 'c0fbbe82d-BOWKSems.js',
    adapters: {
      'shared-2-Cb74JByF.js': { zg: { name: 'ComposerAttachmentTiles', module: tileAdapterModule, features: ['Object.assign(Vp, { Image: wp, Video: Ap, File: Pp, Quote: Bp })'] } },
      'c856385e2-DVsjb2QL.js': { i: { name: 'ComposerPathHoverCard', module: tileAdapterModule, features: ['trigger: i,', 'disabled: !l,', 'surface: r,'] } },
      'vendor-intl-Db7hDWRO.js': { l: { name: 'ComposerMessage', module: tileAdapterModule, features: ['[React Intl]'] } },
    },
    // R4i-graph GR3: gr (the Video wrapper over U.Video) and Si (Vi's video MIME test, next to Ze = shared-28 bk).
    exports: { hr: 'ComposerImageTile', _r: 'ComposerFileTile', vr: 'ComposerQuoteTile', gr: 'ComposerVideoTile', Si: 'videoMimeTypePattern',
      mr: 'attachmentTileAttributes', pr: 'useTileRemove', dr: 'tileFocusTarget' },
    features: {
      hr: ['f(U.Image, {', 'state: r ? "pending" : void 0,', 'defaultMessage: "Processing image",', 'f(Dt, { path: c, surface: "composer", attach: !1, trigger: h }),'],
      _r: ['f(U.File, {', 'defaultMessage: "Folder", id: "ukQpDs7M+0"', 't.slice(m + 1).toUpperCase()'],
      vr: ['f(U.Quote, {', 'text: t.trim() === "" ? e : t,'],
      gr: ['f(U.Video, {', 'l = at(e);', 'src: l,', 'onClick: r && (() => r(null)),'],
      Si: ['Si = /^video\\/[a-z0-9.-]+$/'],
      mr: ['return { [Ae]: "", [Me]: e ? "" : void 0, style: { [Ne]: Pe(t) } };'],
      pr: ['keepFocusOnPointerRemove: {', 'button:not([data-cds="CardLink"])'],
      dr: ['[data-cds="CardLink"], .epitaxy-pill-body'],
    },
    // Ri (export `o`, cc43287c9 uk) lays them out: tiles, then the pills, in one wrapping row.
    chunkFeatures: ['Ri as o,', 'className: "flex flex-wrap items-end gap-xs",', 'return f(hr, {\n    src: e.previewUrl,\n    name: e.name,\n    pending: e.status === "loading",',
      'function Ki(e) {\n  let t = e.relativePath || e.fileName;\n  return Vt(t) ?? t;\n}', 'function qi(e) {\n  return e.file ? void 0 : e.relativePath;\n}',
      // Vi: a file attachment is a Video tile only while it keeps its File (remote / SSH staging), named like a video.
      'return e.file !== void 0 && Ze.test(e.fileName) && Si.test(e.file.type)\n    ? f(gr, {\n        file: e.file,'] },
  // shared-18 Ub (exported `Du`): the experimental flags a Code pane's CdsRoot passes (c11959232 / shared-20 `dm()`, Ub or
  // Wb = Ub plus shrinkWrapMemory): `naturalImageTiles: "sized"` is what the Image tile reads (shared-frame Sa over xa) to
  // draw a staged image at its natural aspect. main.jsx hands it to the Code composer's CdsRoot.
  { target: 'code-pane-experimental.mjs', source: 'shared-18-D4XxL6Tg.js', exports: { Ub: 'codePaneExperimental' },
    officialExports: { Ub: 'Du' }, features: { Ub: ['Ub = { naturalImageTiles: "sized" }'] },
    chunkFeatures: ['Wb = { ...Ub, shrinkWrapMemory: !0 }'] },
  // composer-12: the one route paste, drop and the file picker share. shared-52 mb (exported `Bl`, cc43287c9 `mo`) splits
  // clipboard / drag items into folders and files; Dy (exported `Tu`) is the image MIME list c98ab6e79 re-exports as `r`
  // (cc43287c9 `gj`); cc43287c9 aK routes {files, folders} to the images / otherFiles / folders lanes and reports whether
  // it took anything (paste's preventDefault).
  { target: 'composer-intake-split.mjs', source: 'shared-52-DGviI8xb.js', exports: { mb: 'splitTransferItems', Dy: 'composerImageMimeTypes' },
    officialExports: { mb: 'Bl', Dy: 'Tu' },
    features: { mb: ['i.webkitGetAsEntry?.()?.isDirectory ? n.push(a) : r.push(a)', 'return { folders: n, files: Array.from(t ?? []) };'],
      Dy: ['Dy = ["image/jpeg", "image/png", "image/gif", "image/webp"]'] } },
  { target: 'composer-image-types.mjs', source: 'c98ab6e79-DUMymJb9.js', exports: { i: 'acceptedImageTypes' },
    officialExports: { i: 'r' }, features: { i: ['i = r'] } },
  { target: 'composer-intake-route.mjs', source: 'cc43287c9-DAfOi8yP.js', exports: { aK: 'routeComposerIntake' },
    features: { aK: ['let r = e.filter((e) => gj.includes(e.type)),', 'a = n.otherFiles ? [] : [...i, ...(n.folders ? [] : t)];', 'n.folders !== void 0 && t.length > 0'] },
    // Yh feeds every intake through it: Xh (drop), $h (the file picker) and eg (paste, `mo(e.clipboardData?.items, …)`).
    chunkFeatures: ['Yh = A(\n      (e, t) =>\n        aK(e, {', 'Yh(e, "drop"),', 'Yh({ files: e, folders: [] }, "file_picker"),', 'Yh(mo(e.clipboardData?.items, e.clipboardData?.files), "paste") &&'] },
  // ---- R4i-graph GR3 (composer-12 follow-up): the Code pane's drop zone. cc43287c9 mounts c4c113f6f f (YI) as the
  // session pane's root (`p(YI, {onDropped: jn, appDrag: Mn, disabled: me || !Bt, className: …})`): a Finder drop anywhere
  // over the pane goes, split by shared-52 mb, to the composer's dropFiles (jn → Xh → Yh(e, "drop"), the same aK route as
  // paste and the picker), and an in-app drag the pane owns (appDrag, cd06fb298 g) commits; while a drag it accepts is
  // over the pane, cc63499d2 d draws the accent ring (on-target halo). cc63499d2 u is the drag-over state and handlers.
  { target: 'composer-drop-target.mjs', source: 'cc63499d2-BGjpsp_T.js', exports: { u: 'useDropTarget', d: 'DropHalo' },
    officialExports: { u: 'n', d: 't' },
    features: {
      u: ['l && e.stopPropagation(),', '(e.dataTransfer.dropEffect = u ? "none" : s)', 'let t = e.isDefaultPrevented();', 'return { isDragOver: f && !u, handlers: x };'],
      d: ['variant: t = "on-target"', 'let r = s(40);', 'shadow-[inset_0_0_0_2px_var(--cds-fill-accent)]', 'motion-safe:animate-[cds-drop-ring-in_0.15s_cubic-bezier(0.215,0.61,0.355,1)]'],
    } },
  { target: 'composer-pane-drop-zone.mjs', source: 'c4c113f6f-C_6eb8-V.js', exports: { f: 'ComposerPaneDropZone', u: 'useFileDropTarget', d: 'droppedEntries' },
    officialExports: { f: 't', u: 'r', d: 'n' },
    features: {
      f: ['onDropped: f,', 'let t = a(e.dataTransfer.items, e.dataTransfer.files);', 'className: i("relative", m),', 'children: [p, b && t(c, {})],'],
      u: ['(!i && l(e)) || n?.accepts(e) === !0', 'l(e) ? t(e) : n?.onDrop();', 'dropEffect: "copy",', 'claim: !0,'],
      d: ['n[e].kind === "file" ? n[e].webkitGetAsEntry?.() : null'],
    },
    chunkFeatures: ['return e.dataTransfer?.types?.includes("Files") ?? !1;'] },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
// Top-level bindings of the chunk that the declaration reads or writes (`x ??= …` only assigns x, yet needs it).
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
// The same-chunk closure text of a binding (imports are not followed): what adapter feature strings are matched against.
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = src.program.scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of declarationDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !text.includes(f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}

export async function extractCodeComposer({ check = false } = {}) {
  const cache = new Map();
  const viewTabsManifest = JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  if (viewTabsManifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabsManifest.referenceVersion}, not ${referenceVersion}`);
  const viewTabsExports = new Map();
  const viewTabsImport = async (file, alias, via, target) => {
    const entry = viewTabs[file]?.[alias];
    if (!entry) return null;
    const dep = await readSource(file, cache);
    const local = dep.exported.get(alias);
    const pub = viewTabsManifest.publicNames?.[entry.name];
    if (!local || !pub || pub.file !== file || pub.local !== local || (pub.export ?? alias) !== alias)
      throw Error(`${target}: ${via} (${local}) is not view-tabs publicName ${entry.name} (${JSON.stringify(pub)})`);
    assertFeatures(`${target}: view-tabs ${via} (${local})`, closureText(dep, local), entry.features);
    if (!viewTabsExports.has(file)) viewTabsExports.set(file, await fs.readFile(path.join(viewTabsDir, file), 'utf8'));
    if (!new RegExp(`(?<![\\w$])${local.replace(/\$/g, '\\$')} as ${entry.name}\\b`).test(viewTabsExports.get(file)))
      throw Error(`${target}: src/generated/view-tabs/${file} does not export ${entry.name}`);
    return { from: `../view-tabs/${file}`, name: entry.name, via, kind: 'view-tabs', original: local };
  };
  // R3-composer step 3 (D1): a binding view-tabs publishes under a semantic name is imported by that name wherever this
  // generator meets it (an import of the chunk, or a same-chunk dependency of a viewTabsSame copy), never copied. Its
  // identity is the manifest's: the publicName names this file and local, the view-tabs module was generated from this very
  // source (sourceSha256) and lists the local, and the generated file exports `local as Name`. Nothing is ever imported
  // from view-tabs by its minified name (tests/view-tabs-manifest.test.mjs guards that).
  const semanticByLocal = new Map(Object.entries(viewTabsManifest.publicNames ?? {}).map(([name, v]) => [`${v.file}:${v.local}`, name]));
  const viewTabsChecked = new Map();
  const viewTabsSemantic = async (file, local, via) => {
    const name = semanticByLocal.get(`${file}:${local}`);
    if (!name) return null;
    if (!viewTabsChecked.has(file)) {
      const entry = viewTabsManifest.modules.find(m => m.source === file);
      const dep = await readSource(file, cache);
      if (!entry || entry.sourceSha256 !== sha(dep.bytes)) throw Error(`view-tabs ${file} was not generated from this ${referenceVersion} source`);
      viewTabsChecked.set(file, { bindings: new Set(entry.bindings), text: await fs.readFile(path.join(viewTabsDir, file), 'utf8') });
    }
    const graph = viewTabsChecked.get(file);
    if (!graph.bindings.has(local) || !new RegExp(`(?<![\\w$])${local.replace(/\$/g, '\\$')} as ${name}\\b`).test(graph.text))
      throw Error(`view-tabs ${file} does not export ${local} as ${name}`);
    return { from: `../view-tabs/${file}`, name, via, kind: 'view-tabs', original: local };
  };
  const viewTabsSources = new Set(viewTabsManifest.modules.map(m => m.source));
  const viewTabsHolds = (file, local) => !!viewTabsManifest.modules.find(m => m.source === file)?.bindings.includes(local);
  const contextsUsed = new Set();
  const emitted = []; // modules already generated in this run: { spec }
  // oneCopy modules (the composer shell): a binding is sliced into one module only, so no context or module state is
  // duplicated between them; a second module needing it imports it from the first, which must export it.
  const slicedBy = new Map();
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-code-composer.mjs',
    adapterModule: 'src/source-composer-current-adapters.jsx',
    // R4g-composer CP4: adapter entries that name their own module (`module`).
    adapterModules: ['src/source-composer-attachment-adapters.jsx'], modules: [],
  };
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const sibling = local => emitted.find(m => m.spec.source === spec.source && m.spec.exports[local]);
    const adapterFor = async (file, alias, via) => {
      const entry = spec.adapters?.[file]?.[alias] ?? adapters[file]?.[alias];
      if (!entry) return null;
      const dep = await readSource(file, cache);
      const local = dep.exported.get(alias);
      if (!local) throw Error(`${spec.target}: adapter alias ${via} is no longer exported`);
      assertFeatures(`${spec.target}: adapter ${via} (${local})`, closureText(dep, local), entry.features);
      return { from: entry.module ?? adapterModule, name: entry.name, via, kind: 'adapter', original: local };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const owner = sibling(name);
      if (owner) { imports.set(name, { from: `./${owner.spec.target}`, name: owner.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const adapter = await adapterFor(file, alias, via);
        if (adapter) { imports.set(name, adapter); return; }
        const tabs = await viewTabsImport(file, alias, via, spec.target);
        if (tabs) { imports.set(name, tabs); return; }
        const dep = await readSource(file, cache);
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        let local = dep.exported.get(alias), substitute = null;
        const semantic = local && await viewTabsSemantic(file, local, via);
        if (semantic) { imports.set(name, semantic); return; }
        if (substitutes[via]) {
          const entry = substitutes[via], declared = local && dep.program.scope.getBinding(local)?.path;
          if (!declared || declared.isImportSpecifier()) throw Error(`${spec.target}: substitute ${via} is not a declaration`);
          assertFeatures(`${spec.target}: substitute ${via} (${local})`, declarationText(dep, declared), entry.features);
          substitute = `${local} → ${entry.local}`;
          local = entry.local;
        }
        const generated = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated', ...(substitute ? { substitute } : {}) });
        return;
      }
      // viewTabsSame: a module sliced from a view-tabs source imports the same-chunk bindings view-tabs publishes by their
      // semantic names and copies the rest; a copied React context must be a listed contextCopies entry.
      if (viewTabsSources.has(spec.source)) {
        const semantic = await viewTabsSemantic(spec.source, name, `${spec.source}:${name}`);
        if (semantic) {
          if (spec.exports[name]) throw Error(`${spec.target}: root ${name} is view-tabs ${semantic.name} now; import it instead of slicing a copy`);
          imports.set(name, semantic); return;
        }
        const init = p.isVariableDeclarator() ? p.node.init : null;
        const callee = init?.type === 'CallExpression' && init.callee.type === 'Identifier' ? src.program.scope.getBinding(init.callee.name)?.path : null;
        if (callee?.isImportSpecifier()) {
          const calleeFile = callee.parent.source.value.replace(/^\.\//, '');
          const react = vendor[calleeFile] && vendorImport(calleeFile, callee.node.imported.name, await readSource(calleeFile, cache));
          // A context view-tabs does not hold is the only instance in the host; one it holds would be a second.
          if (react?.[1] === 'createContext' && viewTabsHolds(spec.source, name)) {
            if (!contextCopies[spec.source]?.[name]) throw Error(`${spec.target}: ${spec.source} context ${name} would be a second instance; list it in contextCopies with the reason, or have view-tabs name it`);
            contextsUsed.add(`${spec.source}:${name}`);
          }
        }
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      const key = `${spec.source}:${name}`, other = slicedBy.get(key);
      if (other && (spec.oneCopy || other.oneCopy)) throw Error(`${spec.target}: ${name} is already sliced into ${other.target}; export it there and import it`);
      if (!other) slicedBy.set(key, spec);
      p.traverse({
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    assertFeatures(`${spec.target}: chunk ${spec.source}`, src.code, spec.chunkFeatures);
    for (const [name, alias] of Object.entries(spec.officialExports ?? {}))
      if (src.exported.get(alias) !== name) throw Error(`${spec.target}: ${spec.source} exports ${alias} as ${src.exported.get(alias)}, not ${name}`);
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (spec.viewTabsSame && semanticByLocal.has(`${spec.source}:${name}`))
        throw Error(`${spec.target}: root ${name} is view-tabs ${semanticByLocal.get(`${spec.source}:${name}`)} now; import it from there instead of slicing a copy`);
      // R3-composer step 2: every root must carry its own feature strings, so re-pointing a root to another minified
      // binding (e.g. DK → EK in composer-row-chin) cannot pass on another root's pins.
      if (!spec.features?.[name]?.length) throw Error(`${spec.target}: root ${name} has no feature strings`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features[name]);
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-code-composer.mjs.\n// Edit the extractor or src/source-composer-current-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}), ...(e.substitute ? { substitute: e.substitute } : {}) })),
      ...(Object.keys(contextCopies[spec.source] ?? {}).some(n => selected.has(n))
        ? { contextCopies: Object.fromEntries(Object.entries(contextCopies[spec.source]).filter(([n]) => selected.has(n))) } : {}),
      exports: spec.exports,
      ...(spec.officialExports ? { officialExports: spec.officialExports } : {}),
    });
    emitted.push({ spec });
  }
  // Every listed context copy must still be one (a stale entry would excuse a later, different copy).
  for (const [file, entries] of Object.entries(contextCopies)) for (const name of Object.keys(entries))
    if (!contextsUsed.has(`${file}:${name}`)) throw Error(`contextCopies ${file}:${name} is no longer copied; drop the entry`);
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Code composer output set changed: ${present.join(',')}. Run scripts/extract-code-composer.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Code composer source mismatch: ${name}. Run scripts/extract-code-composer.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} Code composer modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractCodeComposer({ check: process.argv.includes('--check') });
