// Extract the 3.6556.2 Code composer pieces (research/composer.md §1/§3.2, migration plan w2-composer-gen; first cut
// 2.42304.0, research/code-ui-migrate-20261017 composer §1.2/§4.1): the CDS class tokens of the presets card, row chin
// and environment bar (shared-6), the card/send-cell constants and the Send/Stop cell `KM` with its crossfade `bM`, hint
// rows `WM` and key labels `GM` (c227f4d5e), the focus-yield test `PM` over the overlay test `Ob` (shared-28), the /copy
// [N] argument parser `V$`, its reply reader `U$`/`H$` over the transcript predicates (c227f4d5e IE/NE/FE/UE/wE,
// cb27dab29 Fe, c06cf64bb jy, c4d199b75 ot), the environment bar `Dae`/`a8`/`Eae` (cc43287c9), and the row chin's
// pieces: the context ring `EX`/`ak` (shared-8) and the mode label `H6` with the row model trigger class `D$`
// (c227f4d5e), and the CDS ChatComposer shell shared-5 `vm` with its parts `Sm`, focus ref `hm` and form placeholder
// `mm` over its shared-26 / shared-5 / shared-2 / shared-1 / shared-frame closure, and the placeholder pieces shared-9's
// tiptap editor imports (shared-26 uo / fo / ho / go / _o, shared-5 Vm / Bm, shared-28 nw), with the minimal original
// closures they need, without executing any desktop runtime.
//
// 3.6556.2 is React Compiler output: every component opens with `let $ = J9(n)` and reads / writes its cache slots
// through shared-frame's helpers (J0…J5 / K0…K5 / I1…I5 / Z1…Z5). Those, and vendor-frame `Oo` (react/compiler-runtime
// `c`), are view-tabs semantic names (E3), so a sliced component imports them like any other published binding.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. Imports of the original
// modules resolve through the source chunk's export table to exactly one of:
//   - another module generated here (`generated`);
//   - a verified React / ReactDOM / compiler-runtime export of vendor-frame (`react`; the alias table is
//     official-3.6556.2.mjs reactAliases, each alias checked with assertVendorAlias, R1/R3);
//   - a semantic export of the rebuilt view-tabs graph (`view-tabs`: the components in `viewTabs` below with their
//     feature strings, and any other binding view-tabs publishes under a semantic name: same file — generated from this
//     very source, sourceSha256 — and same local), so one React context instance is shared with every other view-tabs
//     consumer; never a copy;
//   - an explicit substitute (`substitutes`: shared-2 th, which is eh itself after Object.assign of its tile members);
//   - a named host adapter in src/source-composer-current-adapters.jsx (`adapter`: react-intl) or the module an adapter
//     entry names.
// A binding view-tabs holds but publishes no name for is never imported by its minified name (D1): it is sliced into a
// `viewTabsSame` module of this generator, once (`oneCopy`). A React context among such copies is a second instance,
// so it must be listed in `contextCopies` with the reason the copy behaves like the view-tabs one in the host (the
// generator refuses any other, and refuses a listed one view-tabs has meanwhile named — import it then).
// Every root, adapter and view-tabs mapping carries feature strings that must still appear in the original text (a plain
// string is matched as is; `{ loose }` through official-3.6556.2.mjs looseFeature(), which generalizes identifiers of
// at most three characters, R2/E5), every root that the chunk exports is pinned to its official export alias, and a
// module can pin strings of the chunk that consume a root (e.g. `ignoreStrayEnter` adding `YP`), so a version bump
// that re-points a minified name stops here.
//
// D0: own generator, own output folder (src/generated/code-composer), own scripts/verify-gen-code-composer.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
// R1 / E6: version, snapshot and source directory come from the shared 3.6556.2 constants module.
export const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/code-composer');
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-composer-current-adapters.jsx';
// R4g-composer CP4 (X7-10): the attachment tiles' host answers (react-intl FormattedMessage, the path hover card, the tile
// set the c0fbbe82d tile wrappers read) live in their own module; an adapter entry names it with `module`.
const tileAdapterModule = '../../source-composer-attachment-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// The native (rolldown) parser for raw chunk bytes: positions of top-level declarations only (4.16336.0 hash checks).
const parseAst4 = text => createRequire(path.join(root, 'package.json'))('rolldown/parseAst').parseAst(text);

// R1 / R3: vendor-frame re-exports React / ReactDOM / react-jsx-runtime / react/compiler-runtime; every alias is the
// official-3.6556.2.mjs table entry, checked on this vendor-frame with assertVendorAlias (a top-level
// `local=<namespace>.<member>`; `Oo` through assertCompilerRuntime). Aliases were reused across versions (`Co` was
// useState and is useRef), so no 2.42304.0 alias is carried over by name.
const vendorFrame = official.vendorFrame;
// CDS components that live in the view-tabs graph (R1 SG-1). `name` is the view-tabs publicName; `features` must appear
// in the closure of the original binding the alias names. Any other published binding is imported by its semantic name
// too (viewTabsSemantic below), these entries only add the feature pins.
const viewTabs = {
  [official.sharedFrame]: {
    Eu: { name: 'CdsButton', features: ['hideShortcut:', '"Button")', 'iconPosition:'] },
    od: { name: 'CdsIcon', features: ['"data-cds": "Icon"', 'data-cds-mirror'] },
    ql: { name: 'CdsTooltipProvider', features: ['closeDelay', '.Provider'] },
    // R3-composer step 2 (D24): KM's tooltips and hint rows, a8's iconOnly tooltip and the coarse-pointer split Send are
    // the originals, sharing the view-tabs React contexts (tooltip delay group, CDS labels, layers). cdsClassNames
    // (twMerge(clsx)) is what the row chin's mode label H6 merges its classes with.
    Kl: { name: 'CdsTooltip', features: ['trackCursorAxis', 'openOnHandedBackFocus', 'hoverable', '"data-cds": "Tooltip"'] },
    Ku: { name: 'CdsShortcut', features: ['"keycap"', '"Shortcut"', '"sequenceThen"'] },
    bi: { name: 'CdsSplitDropdownButton', features: ['"data-cds": "SplitDropdownButton"', 'onPrimaryClick', 'menuTooltip'] },
    Hf: { name: 'cdsClassNames', features: ['conflictingClassGroups'] },
  },
  // The shell's class joins are vendor-frame's clsx.
  [vendorFrame]: {
    Ba: { name: 'clsx', features: ['(e = arguments[n]) &&', 'Array.isArray(e)'] },
  },
};
// Host dependencies (checked before the vendor and view-tabs tables): react-intl, answered by the local catalog every
// other Code surface reads (see the adapter module). 3.6556.2: the page-scope drop scrim's CDS portal root (shared-frame
// hp, 2.42304.0 gf / `Fc`) is view-tabs CdsPortalRoot now, so it is imported like every other published binding and the
// throwing ComposerPageDropSurface stand-in is gone.
const adapters = {
  [official.vendorIntl]: { p: { name: 'useComposerIntl', features: ['[React Intl]'] } },
};
// An import resolved to another original binding that is the same runtime value. shared-2 th (the shell's Attachments
// part) is `Object.assign(eh, { Image, Video, File, Quote })`: Object.assign returns eh itself, so the part the shell
// renders and matches children against is eh. The Code card passes the part only its shelf (`epitaxy-attachment-shelf`),
// never a tile, so the shell gets eh (the tiles are sliced for the c0fbbe82d wrappers, see chat-composer-attachments).
const substitutes = {
  'shared-2-TF8v67kg.js:ry': { local: 'eh', features: ['th = Object.assign(eh, { Image: Im, Video: Um, File: qm, Quote: $m })'] },
};
// React contexts this generator copies out of a view-tabs source (see the header). 3.6556.2: none. The layer base
// context the pane drop halo's z-index reads (2.42304.0 shared-frame Vd, held back in pendingNames for mcp-app-card) is
// view-tabs CdsLayerBaseContext now (E4: pendingNames all published), and the halo's useCdsLayerAwareZIndex with it.
// The table stays as the guard: a new context copy must be listed here with its reason, and the generator refuses one
// view-tabs has named.
const contextCopies = {};

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots.
// `officialExports` pins a root to the alias its chunk exports it under (the alias consumer chunks import).
// `features` pins each root to strings of its own original text; `chunkFeatures` to strings of the source chunk.
// 3.6556.2 (w2-composer-gen): roots re-mapped by data/composer-binding-map.json with the manual corrections of
// research/composer.md §1 (IM / YP / BM, a8 / r8 / Tae / $5, EX, eh / qm / Um, co / go, vm / hm, Vi / Wi / Hi / Ri / Bi,
// c / l, d); roots view-tabs now publishes are imported from it instead of sliced (owner-support: ownerWindow,
// getResizeObserverClass, getMutationObserverClass; chat-composer-frame: the 15 listed in its comment); official
// deletions dropped with their exports (card-tokens nM placeholderShapeResetClass, environment-bar s0
// environmentLineSurfaceClass, presence om).
const modules = [
  // DROPPED: -
  { target: "composer-tokens.mjs", source: "shared-6-sd9jbJqs.js",
    exports: { h_: "composerCardSizeClass", y_: "composerCardRootClass", Ng: "composerRowControlClass", Fg: "composerRowChinClass", Ig: "composerRowChinSlotClass", u_: "composerChinTrailingClass", g_: "composerTrailingControlsClass", __: "composerRowLeadingClass", v_: "composerRowTrailingInsetClass", Jg: "composerPetSlotClass", Mg: "environmentBarClass", zg: "environmentBarResponsive", Pg: "environmentBarInsetClass", jg: "environmentBarLineClass", Bg: "environmentBarLabelClass", Lg: "composerRingSlotClass", Vg: "environmentTriggerGivesWayClass" },
    officialExports: { y_: "$d", Ng: "Kd", Fg: "Rd", Ig: "Hd", u_: "Ld", g_: "Od", __: "Vd", v_: "zd", Jg: "Ad", Mg: "Wd", zg: "if", Pg: "Gd", jg: "nf", Bg: "af", Lg: "Ud", Vg: "rf" },
    features: {
      h_: ["[--cds-h-control:calc(1.75rem*var(--cds-rem-scale,1))]", "[--cds-radius-composer:calc(0.875rem*var(--cds-rem-scale,1))]"],
      y_: [{ loose: "${s_}" }, "[--cmp-font-size:var(--prompt-text-size)]", "[--cmp-line-height:var(--prompt-line-height)]"],
      Ng: ["[--cds-h-control:calc(1.5rem*var(--cds-rem-scale,1))]", "[--cds-leading-body:calc(1.25rem*var(--cds-rem-scale,1))]"],
      Fg: ["comfortable:-mt-1.5 -mb-2.5"],
      Ig: ["\"block h-6\""],
      u_: ["auto-cols-[minmax(0,max-content)]"],
      g_: ["\"flex items-center gap-2\""],
      __: ["\"flex items-center ms-0.5\""],
      v_: ["\"compact:me-1\""],
      Jg: ["comfortable:-mb-2"],
      Mg: ["comfortable:pt-0.5 -mb-0.5"],
      zg: ["@max-[28.75rem]:flex-wrap", "ghost:"],
      Pg: ["\"px-2.5\""],
      jg: ["bottom-1.5 ps-4 pe-20 text-footnote"],
      Bg: ["calc-size(max-content,min(size,5ch))"],
      Lg: ["\"flex shrink-0 ms-px\""],
      Vg: ["calc-size(max-content,min(size,10ch))"],
    }, },
  // DROPPED: -
  { target: "composer-testids.mjs", source: "shared-1-BJhqMmkf.js",
    exports: { O_: "sendTestId", k_: "stopTestId" },
    officialExports: { O_: "Kd", k_: "Jd" },
    features: {
      O_: ["\"code-prompt-send\""],
      k_: ["\"code-prompt-stop\""],
    }, },
  // DROPPED: -
  { target: "composer-glyph.mjs", source: "cfca6870a-Dn2eYjs8.js",
    exports: { p: "sendGlyphBoxClass", h: "dockGlyphProps", m: "DockGlyphBox", g: "dockGlyphIconClass", f: "autoGlyphSize" },
    officialExports: { p: "a", h: "r", m: "i", g: "t", f: "n" },
    features: {
      p: ["\"flex scale-90\""],
      h: ["size: \"base\"", "dockGlyph: !0"],
      m: [{ loose: "n === void 0 ? r : e(\"span\", { className: n, children: r })" }],
      g: ["\"text-secondary-control group-hover/btn:text-primary group-aria-pressed/btn:text-accent group-hover/btn:group-aria-pressed/btn:text-accent\""],
      f: [{ loose: "u = \"auto\"" }],
    }, },
  // DROPPED: up->pf ownerWindow (view-tabs ownerWindow); pp->gf ownerResizeObserver (view-tabs getResizeObserverClass); mp->_f ownerMutationObserver (view-tabs getMutationObserverClass)
  { target: "owner-support.mjs", source: "shared-25-DOWZRSlq.js",
    exports: { mf: "ownerWindowOrGlobal", ni: "noopSubscribe", hf: "ownerDocument" },
    officialExports: { mf: "lp", ni: "z_", hf: "ap" },
    features: {
      mf: ["globalThis.window"],
      ni: [{ loose: "return vi" }],
      hf: ["globalThis.document"],
    }, },
  // DROPPED: -
  { target: "placeholder-fit.mjs", source: "c1c6ea9ac-BDXpgHaF.js",
    exports: { a: "useOverflowing" },
    officialExports: { a: "t" },
    features: {
      a: ["e.scrollWidth > e.clientWidth", ".fonts?.ready?.then(", { loose: "l === \"y\"" }],
    }, },
  // DROPPED: -
  { target: "shortcut-caps.mjs", source: "shared-frame-6jtSkIit.js",
    exports: { wc: "shortcutCaps", Sc: "parseShortcutKeys", yc: "ownEntry" },
    officialExports: { wc: "qu" },
    features: {
      wc: ["spoken: n", "/^[A-Za-z0-9 ]+$/"],
      Sc: [".split(\"+\")", { loose: "Ps(e) ? r.push(e) : i.push(e)" }],
      yc: ["Object.hasOwn(e, t) ? e[t] : void 0"],
    }, },
  // W14-code composer-09: the keycap class Kbd sizes itself with (shared-frame ec, exported Yu: one character square, more
  // padded wide) and the CDS Kbd itself (cbd6db52c r, exported t: data-cds "Kbd", text-caption), which c227f4d5e NA
  // (the history hint, `Fp` from cbd6db52c) renders for ↑ / ↓ / esc and the "<kbd>↓</kbd> to restore your draft" value.
  { target: "composer-keycap.mjs", source: "shared-frame-6jtSkIit.js",
    exports: { ec: "keycapClass" },
    officialExports: { ec: "Yu" },
    features: {
      ec: ["Array.from(e ?? \"\").length === 1"],
    }, },
  { target: "composer-kbd.mjs", source: "cbd6db52c-BMnXAopb.js",
    exports: { r: "Kbd" },
    officialExports: { r: "t" },
    features: {
      r: ["\"data-cds\": \"Kbd\"", "\"text-caption\"", "[--cds-shortcut-cap-ink:currentColor]"],
    }, },
  // DROPPED: -
  { target: "transcript-surface.mjs", source: "c4a70913c-BfrWompY.js",
    exports: { d: "transcriptSurfaceClass" },
    officialExports: { d: "d" },
    features: {
      d: ["var(--epitaxy-transcript-surface,var(--cds-surface-1))"],
    }, },
  // DROPPED: -
  { target: "path-tooltip-placement.mjs", source: "cc5c56f5c-BoRtnbt1.js",
    exports: { t: "pathTooltipPlacement", n: "pathTooltipContent" },
    officialExports: { t: "t", n: "n" },
    features: {
      t: ["max-w-[min(480px,var(--available-width))]", "side: \"bottom\""],
      n: ["dir: \"ltr\"", "inline-block max-w-full whitespace-pre-wrap"],
    }, },
  // DROPPED: nM placeholderShapeResetClass (gone)
  { target: "composer-card-tokens.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { LM: "sendCellClass", RM: "sendCellLayerClass", zM: "bashModeRingClass", BM: "shelfStartInset", VM: "shelfStartProperty", HM: "shelfStartPaddingClass", UM: "suggestionGhostClass", _M: "submitLayerClass", vM: "submitLayerEnterClass", yM: "submitLayerExitClass", IM: "stopSendGuardMs", YP: "strayEnterWindowMs" },
    features: {
      LM: ["\"grid shrink-0 items-center justify-items-end\""],
      RM: ["\"col-start-1 row-start-1 flex\""],
      zM: ["inset-ring-pro"],
      BM: [{ loose: "rM = 4" }],
      VM: ["\"--epitaxy-shelf-start\""],
      HM: ["ltr:ps-[var(--epitaxy-shelf-start,0px)]"],
      UM: ["text-muted-as-secondary"],
      _M: ["cursor-default items-center justify-end"],
      vM: ["cds-fade-in_0.12s_ease-out_0.08s_backwards"],
      yM: ["[transition:visibility_0s_linear_80ms]"],
      IM: [{ loose: "Qj = 500" }],
      YP: [{ loose: "rP = 500" }],
    },
    chunkFeatures: [
      { loose: "Xr.current = Date.now() + rP;" },
      { loose: "Date.now() - h.current < Qj || f(p());" },
      ".style.setProperty(VM, `${Math.max(0, t - BM)}px`)",
      "\"epitaxy-prompt\"", "cardClassName:",
      "onClusterWidthsChange:",
      "dropScope:",
      { loose: "cardClassName: ut," },
      { loose: "ue(U && zM, Ee) || void 0" }, { loose: "It = he ? \"pad\" : void 0" }, { loose: "trailingNotch: It" }, { loose: "holdSendButton: () => hn({ until: Date.now() + XP, storeKey: o })" }, { loose: "XP = 1500" },
      "maxHeight: \"min(24rem, 40svh)\",",
      "className: \"epitaxy-prompt-input\",",
      "\"epitaxy-attachment-shelf w-full\",",
      { loose: "send: ht," },
      "className: \"truncate text-muted-as-secondary\",",
    ], },
  // DROPPED: -
  { target: "composer-dialog-focus.mjs", source: "shared-28-DNYlf4wu.js",
    exports: { Db: "overlaySurfaceSelector", Ob: "focusInsideOverlay" },
    officialExports: { Ob: "Ba" },
    features: {
      Db: ["[role=\"dialog\"]", "[data-cds=\"AskUserQuestion\"]"],
      Ob: [{ loose: "t.closest(Cv)" }, "!n.contains(e)"],
    }, },
  // DROPPED: -
  { target: "composer-focus-yield.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { NM: "editableFieldSelector", PM: "focusBelongsElsewhere" },
    features: {
      NM: ["[contenteditable=\"\"]", "[contenteditable=\"true\"]"],
      PM: [{ loose: "t.closest(Yj)" }, "checkVisibility({ visibilityProperty: !0 })"],
    },
    chunkFeatures: [
      "i = n?.yieldsToUser === !0;",
      { loose: "(!i || !Xj(r.view.dom)) && Fi()" },
      { loose: "((Kr.current = t ?? \"end\"), !r)" },
      "e.focus({ preventScroll: !0 });",
      { loose: "(X.commands.focus(Kr.current), !0)" },
      "(t.view.focus(), t.commands.focus(null, { scrollIntoView: !1 }));",
      { loose: "Xr = T(-1 / 0)" },
      "if (!(e.shiftKey || e.altKey)) {",
      { loose: "(e.repeat || Date.now() < Xr.current) &&" },
      { loose: "(e.metaKey || e.ctrlKey || zs())" },
    ], },
  // W14-code r7 gen-final-7 (review fix, composer bL finalFocus): c227f4d5e K6 (exported y; cc43287c9 imports it as
  // yte), the start card's popup finalFocus: Dle's `Qi = {onRequestComposerFocus: ht, isPanelActive: Mt, keyboardOnly:
  // !0}, $i = yte(Qi)` goes to bL (and the env / folder popups) as `finalFocus: $i`. A close that leaves focus on the
  // body or inside a menu / dialog hands it to the composer (on a fine-pointer host), and answers whether focus stayed.
  // DROPPED: -
  { target: "composer-final-focus.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { K6: "useComposerFinalFocus" },
    officialExports: { K6: "y" },
    features: {
      K6: ["{ onRequestComposerFocus: t, isPanelActive: n, keyboardOnly: r } = e,",
        "'[role=\"menu\"], [role=\"dialog\"], [role=\"alertdialog\"]'",
        { loose: "(t?.(), e.document.activeElement === r)" }, "return t ? s : void 0;"],
    }, },
  // DROPPED: -
  { target: "composer-key-label.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { GM: "shortcutLabel" },
    features: {
      GM: [".join(\"+\")", "e.spoken ?? e.label"],
    },
    chunkFeatures: [
      "import { t as qp } from \"./c1c6ea9ac-BDXpgHaF.js\";",
      { loose: "ze = !!V && !ge && Le && !A && !I && re === null," },
      { loose: "defaultMessage: \"{sendKey} to send, {queueKey} to queue for later\"," },
      "id: \"mZ6xnUz7iS\",",
      { loose: "{ sendKey: cM(\"enter\", Re, e), queueKey: cM(\"cmd+enter\", Re, e) }," },
      "{ defaultMessage: \"{queueKey} to queue\", id: \"FIL0bW8Kgx\" },",
      { loose: "{ queueKey: cM(\"cmd+enter\", Re) }," },
      { loose: "qe = (Kf(Ge, Ve) ? He : void 0) ?? Ve," },
      "\"aria-description\":",
      "placeholderFit:",
      { loose: "\"data-placeholder-fit-probe\": Ve," },
      "\"invisible me-px whitespace-nowrap before:content-[attr(data-placeholder-fit-probe)]\",",
    ], },
  // DROPPED: -
  // 3.6556.2: shared-8 HF (exported `Jr`), the Stop button's icon name KM reads: "StopFilled" only under the fizzy-lake
  // icons part, which is off (E12, shared-52 Qm = []), so it answers undefined and the Stop glyph stays the default.
  { target: "composer-stop-glyph.mjs", source: "shared-8-Db1QN4mf.js", exports: { HF: "stopGlyphName" },
    officialExports: { HF: "Jr" }, features: { HF: ['ks("icons") ? "StopFilled" : void 0'] } },
  // DROPPED: -
  { target: "composer-send-cell.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { KM: "ComposerSendCell", bM: "SubmitCrossfade", WM: "SendHintRow", gM: "IdleSendStateContext", mj: "preventFocusSteal", Gk: "useComposerHasText" },
    features: {
      KM: ["\"data-testid\": \"code-prompt-trailing-controls\"", "\"data-testid\": \"code-prompt-send-cell\"", "className: \"size-control\"", { loose: "Date.now() - h.current < Qj" }, "defaultMessage: \"Queue for later\"", "defaultMessage: \"Send and stay here\"", "keys: \"cmd+alt+enter\""],
      bM: ["e.propertyName === \"visibility\"", "inert: !0"],
      WM: [{ loose: "D(uo, { keys: t })" }],
      gM: [{ loose: "F(void 0)" }],
      mj: ["e.preventDefault()"],
      Gk: ["e.readOutsideRender", "e.subscribe("],
    },
    chunkFeatures: [
      { loose: "((Et.current = Date.now()), Di(), kt({ trigger: e }));" },
      { loose: "J.current && !wt.current && ln.current ? { priority: \"next\" } : void 0," },
      { loose: "Ki = _ !== void 0 && st && !Wi ? _ : void 0," },
      { loose: "zi = zt || !Le," },
      { loose: "Vi = B || Bi || zi," },
    ], },
  // DROPPED: -
  { target: "transcript-text-item.mjs", source: "cb27dab29-B4WyL7_M.js",
    exports: { Fe: "isTranscriptTextItem" },
    officialExports: { Fe: "y" },
    features: {
      Fe: ["e.kind === \"text\"", "\"narration_summary\""],
    }, },
  // DROPPED: -
  { target: "transcript-provisional.mjs", source: "c06cf64bb-CdJdJuVd.js",
    exports: { jy: "isEmptyProvisionalEntry" },
    officialExports: { jy: "Sr" },
    features: {
      jy: ["e.provisionalMessageId !== void 0 && e.items.length === 0"],
    }, },
  // DROPPED: -
  { target: "transcript-user-kind.mjs", source: "c4d199b75-D3cQB-UP.js",
    exports: { ot: "userEntryKind" },
    officialExports: { ot: "C" },
    features: {
      ot: ["case \"commentSummon\":", "\"bash\"", "\"bubble\""],
    }, },
  // DROPPED: -
  { target: "transcript-replies.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { IE: "isAssistantEntry", NE: "isUserTurnEntry", WE: "endsFinishedReply", UE: "replyItems", wE: "replyText" },
    officialExports: { IE: "cl", WE: "ll", UE: "pl", wE: "El" },
    features: {
      IE: [{ loose: "e.author === \"assistant\" && !r_(e)" }],
      NE: [{ loose: "e.author === \"user\" && gE(e) && Ih(e.items) !== \"bash\"" }],
      WE: [{ loose: "if (i === void 0 || i.synthetic === !0) return !1;" }, { loose: "t.synthetic !== !0 && t.aside !== !0" }, { loose: "if (FE(i)) return !0;" }, "return !n;"],
      UE: [{ loose: "TE(e, t, n).flat()" }],
      wE: [{ loose: "Sg(e) && e.text.length > 0 ? [e.text] : []" }],
    }, },
  // DROPPED: -
  { target: "copy-reply-arg.mjs", source: "cc43287c9-Me-M2ucD.js",
    exports: { V$: "parseCopyReplyCount" },
    features: {
      V$: ["e === \"\" ? 1", "/^[1-9]\\d*$/.test(e)"],
    },
    chunkFeatures: [
      "case \"copy-reply\": {",
      { loose: "let s = QX(i.arg);" },
    ], },
  // DROPPED: -
  { target: "copy-reply-replies.mjs", source: "cc43287c9-Me-M2ucD.js",
    exports: { H$: "copyableReplies", U$: "copyReplyTranscript" },
    features: {
      H$: ["i.localOutput === !0", "a !== \"\" && n.push({ entryId: i.id, text: a });"],
      U$: ["replying: e.responding", { loose: "$X(e.entries, e.responding)" }],
    },
    chunkFeatures: [
      { loose: "let { replying: c, replies: l } = eZ(e.transcriptTurns());" },
      "id: \"d6GVin8ZgF\",",
      "id: \"iAkUwGZZtY\",",
      "id: \"iZ+iUUQvSB\",",
      "id: \"kT+SiiA0vq\",",
      "{ count: l.length },",
      "let u = l[l.length - s];",
      "formats: \"plain_html\",",
      { loose: "Yb(u.text, n, o).then((n) => {" },
      "id: \"wSG94kLy28\",",
      "i.arg === \"\" ? `/${i.name}` : `/${i.name} ${i.arg}`,",
      "id: \"z7U1VhFXoU\",",
      { loose: "rZ = new Set([\"copy-reply\", \"effort\", \"fast\", \"no-app-ui\"]);" },
    ], },
  // DROPPED: s0 environmentLineSurfaceClass (gone)
  { target: "environment-bar.mjs", source: "cc43287c9-Me-M2ucD.js",
    exports: { Dae: "EnvironmentBar", a8: "EnvironmentChip", i8: "EnvironmentChipGroup", Eae: "useEnvironmentBarFit", n8: "environmentBarSignature", t8: "EnvironmentIconOnlyContext", Tae: "environmentBarHysteresis", r8: "environmentChipClass", Q5: "environmentTriggerClass", $5: "EnvironmentTriggerLabel" },
    features: {
      Dae: ["\"data-testid\": \"epitaxy-environment-bar\"", "\"data-testid\": \"environment-bar-mode\"", "flex shrink-0 empty:hidden", "\"text-muted-as-secondary\"", { loose: "n0.Provider" }],
      a8: ["\"data-icon-only\":", "name: \"CaretDown\"", "className: \"shrink-0 text-muted-as-secondary\"", "hoverable: !1", { loose: "className: rk.className" }],
      i8: [{ loose: "flex empty:hidden ${o0}" }],
      Eae: ["l.offsetTop >= c.offsetTop + c.offsetHeight", { loose: "n.width < e.need + r0" }, { loose: "d(() => t(i))" }],
      n8: [".join(\"|\")"],
      t8: [{ loose: "C(!1)" }],
      Tae: [{ loose: "r0 = 2" }],
      r8: ["`rounded ${", { loose: "${FP}" }],
      Q5: ["`${t ? \"shrink\" : \"min-w-0 shrink\"}${e ? \" text-secondary\" : \"\"}`"],
      $5: ["\"data-overridden\":", { loose: "flex min-w-0 items-center gap-1 ${n ? \"text-warning\" : t ? \"text-accent\" : \"\"}" }, { loose: "m = l ? nu : \"truncate\"" }],
    }, },
  // DROPPED: -
  { target: "usage-ring.mjs", source: "shared-8-Db1QN4mf.js",
    exports: { EX: "UsageRing", SX: "usageRingStroke" },
    officialExports: { EX: "O", SX: "A" },
    features: {
      EX: [{ loose: "a = r === void 0 ? CX : r" }, "className: \"-rotate-90\"", "\"data-ring-track\": \"\"", "\"data-ring-arc\": \"\"", { loose: "i ?? SX(t)" }],
      SX: [{ loose: "return HV(IV(e))" }],
    }, },
  // DROPPED: -
  { target: "composer-row-chin.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { H6: "ModeTriggerLabel", D$: "rowModelTriggerClass" },
    features: {
      H6: ["\"grid grid-cols-[minmax(0,1fr)]\"", "\"overflow-x-clip text-ellipsis whitespace-nowrap\"", { loose: "t && \"text-warning\"" }, "hidden: !0"],
      D$: [{ loose: "DK = \"text-secondary\"" }],
    },
    chunkFeatures: [
      { loose: "Le = Ne === \"row\"," },
      { loose: "Le && \"compact:me-1\"," },
      { loose: "m = l ? \"var(--cds-alpha-3)\" : \"var(--cds-alpha-2)\"" }, { loose: "y(_f, { pct: s, trackStroke: m, stroke: c, size: 14 })" }, "inComposerRow: et", "effortInModelMenu: bt", "\"compact:me-1\"", "EngineFooterStrip",
      "\"flex items-center ms-0.5 [--cds-h-control:calc(1.5rem*var(--cds-rem-scale,1))] [--cds-pad-md:calc(0.375rem*var(--cds-rem-scale,1))] [--cds-font-size-body:calc(0.8125rem*var(--cds-rem-scale,1))] [--cds-leading-body:calc(1.25rem*var(--cds-rem-scale,1))]\",",
      { loose: "labelTone: xt ? \"warning\" : void 0," },
      { loose: "description: xt ? bt : void 0," },
      { loose: "label: d && (!y || Ue) ? D(_Q, { label: vt, name: gt }) : vt," },
      "className: \"min-w-0 shrink\",",
      { loose: "\"aria-describedby\": y ? _ : void 0," },
      { loose: "y = a ? void 0 : m," },
      "className: \"inline-flex min-w-0\",",
      "className: \"relative block\",",
      { loose: "D(\"span\", { \"aria-hidden\": !0, className: \"invisible\", children: e })," },
      "className: \"absolute inset-0 flex items-center\",",
      { loose: "me = O === \"titlebar\" ? \"min-w-0 shrink\" : O === \"row\" ? D$ : void 0" },
      { loose: "X = O === \"composer\" || O === \"row\" ? \"top\" : \"bottom\"" },
      { loose: "he = O === \"composer\" || O === \"chin\" || O === \"row\" ? \"end\" : \"start\"" },
    ], },
  // DROPPED: -
  { target: "keyboard-activation.mjs", source: "shared-8-Db1QN4mf.js",
    exports: { pR: "isKeyboardActivation" },
    officialExports: { pR: "vr" },
    features: {
      pR: ["e.detail === 0", "!(\"pointerType\" in e && e.pointerType)"],
    }, },
  // DROPPED: -
  // W14-code r2 closeout-2 (DC-06): chat-composer-react-version.mjs (vendor-frame ae, the bundled React version
  // string) is retired, nothing imported it.
  // DROPPED: Mt->Mt textStaysSecondaryClass (view-tabs cdsStaysSecondaryTextClass); Q->Ln useIsomorphicLayoutEffect (view-tabs useCdsIsoLayoutEffect); Jm->qh inertProps (view-tabs inertProps); Oo resolveIconSize (gone); Yn->Tr guardedMutationObserver (view-tabs useLazyMutationObserver); aa->ga sizeAttribute (view-tabs cdsSizeAttributes); bu->ud ownerResizeObserver (view-tabs elementResizeObserverClass); Jn->wr guardedResizeObserver (view-tabs useLazyObserver); Ya->so useRootOwnerWindow (view-tabs useCdsOwnerWindow); ph->fg useClickToFocus (view-tabs useClickToFocus); Z useCdsLabel (gone); ch surfaceFocusShadowStyle (gone); Dn useMergedRefCallback (gone); Ms->lc useIsMac (view-tabs useIsMacPlatform); vr useFizzyLakePart (gone); wn->On useEventCallbackRef (view-tabs useLatestCallback); lc->Uc elementOrNull (view-tabs asElementNode); Js->Dc ariaKeyShortcuts (view-tabs ariaKeyShortcuts); dd->af CdsSkeleton (view-tabs CdsSkeleton); ja useRootDensity (gone); Jd->Uf useLayerAwareZIndex (view-tabs useCdsLayerAwareZIndex); an subscribePointerMedia (view-tabs subscribeInputMediaChanges) and tn prefersTouch (view-tabs matchesCoarseOrHoverlessPointer), published by w2-routines-shared (D46); rn->If isFinePointerHost (view-tabs canFocusComposerOnClick, published by w3-code-routines; chat-composer-attachments imports it from there)
  // w12-viewtabs (D1): aa ownerWindowOf and wh prefersReducedMotion are view-tabs cdsNodeOwnerWindow / prefersReducedMotion
  // now (published in W12), so they are imported from there instead of rooted here.
  // W14-code composer: shared-frame qf (the DOM node test) is view-tabs isDomNode since the W14 approvals lane published
  // it (extract-view-tabs.mjs roots, D46), so the shell imports it by that name and this module no longer slices it.
  { target: "chat-composer-frame.mjs", source: "shared-frame-6jtSkIit.js", viewTabsSame: true, oneCopy: true,
    // W14-code r6-composer-02: Wa (the CDS color mode, light unless CdsModeStoreContext answers dark), which the effort
    // slider's lit overlay (c227f4d5e y$ `n = ne()`) reads, and Br (exported rf, the named lazy-chunk loader shared-5 Od
    // starts the presence motion with) are exported for the effort-control area and the presence loader.
    exports: { Fn: "textDirectionOf", Pt: "afterFontsReady", sg: "useSurfaceFocusShadowStyle", Wo: "useResolvedIconSize", Jh: "isRenderable", Na: "useRootNaturalImageTiles", Dn: "useOptionalEventCallback", Xf: "isTextarea", Ao: "rootRemPx", Jf: "isHtmlElement", no: "isSurfaceToken", Zh: "afterAnimationsSettle", Ff: "dropScrimLayer", Qh: "isUnfocusedFrame", dn: "swallowEnterAfterFocusMove", Uh: "clickModifierSource", hn: "sanitizeLabelText", gn: "collapseControlText", _n: "isBlankLabelText", vn: "trimLeadingInvisible", yn: "tooltipSafeText", Wa: "useCdsColorMode", Br: "loadNamedChunk" },
    officialExports: { Fn: "vf", Pt: "Uf", sg: "Ol", Wo: "ld", Jh: "Pl", Na: "Md", Dn: "Cf", Xf: "iu", Ao: "dd", Jf: "eu", no: "xd", Zh: "Nl", Ff: "au", Qh: "Ml", dn: "Nf", Uh: "Bl", hn: "jf", gn: "Af", _n: "Df", vn: "Mf", yn: "kf", Br: "rf" },
    features: {
      Wa: [{ loose: "return Ga() ?? \"light\";" }],
      Br: [{ loose: "return Rr ? Promise.resolve(Rr(e, t)) : t();" }],
      Fn: ["/\\p{L}/u.exec(e)?.[0]", "? \"rtl\" : \"ltr\""], Pt: ["e?.fonts?.ready", "t.then(i, i)"],
      sg: ["\"--cds-focus-shadow\":", "\"--cds-focus-shadow-danger\":"], Wo: [{ loose: "t = e === void 0 ? Ho : e" }, { loose: "K2($, 0, t, n, Vo(t, n))" }],
      Jh: ["e != null && typeof e != \"boolean\""],
      Na: [{ loose: "return W(xa) ?? !1;" }],
      Dn: ["return e === void 0 ? void 0 : n;"],
      Xf: ["e.localName === \"textarea\""],
      Ao: [{ loose: "typeof document > \"u\" ? 16 : mo(po())" }],
      Jf: [{ loose: "return Zd(e) === Yd;" }],
      no: [{ loose: "return Wa.has(e);" }],
      Zh: ["Promise.allSettled(r.map((e) => e.finished))"],
      Ff: [{ loose: "Bd = 9e3" }],
      Qh: ["t.top !== t.self && !e.hasFocus()"],
      dn: ["e.key === \"Enter\" && (e.repeat || (t && performance.now() < n))"],
      Uh: ["modifierKey: e.metaKey || e.ctrlKey, source: t"],
      hn: [{ loose: "return e.replace(un(), dn);" }],
      gn: [".replace(/[\\t\\n\\v\\f\\r\\u0085\\u2028\\u2029]+/g, \" \")"],
      _n: [{ loose: "return hn(e) === \"\";" }],
      vn: ["return e.replace(/^(?:\\s|\\u200C|\\u200D|\\uFE0E|\\uFE0F)+/u, \"\");"],
      yn: [{ loose: "let t = fn(e);" }],
    },
    chunkFeatures: [
      { loose: "n = W(Xl);" },
      { loose: "function za() {\n  return W(Ea);\n}" },
    ], },
  // DROPPED: -
  { target: "chat-composer-attachments.mjs", source: "shared-2-TF8v67kg.js", viewTabsSame: true, oneCopy: true,
    exports: { eh: "MessageAttachments", Lp: "useAttachmentTransition", Fp: "AttachmentTransitionContext", bp: "scrollParentOf", Im: "AttachmentImage", qm: "AttachmentFile", $m: "AttachmentQuote", Um: "AttachmentVideo", wp: "attachmentAttribute", Tp: "attachmentRestoredAttribute", jp: "attachmentTransitionNameProperty", Vp: "attachmentTransitionName" },
    officialExports: { Lp: "ly", Fp: "sy", bp: "dy", wp: "iy", Tp: "oy", jp: "ay", Vp: "cy" },
    features: {
      eh: ["\"data-cds\": \"MessageAttachments\"", "thumbnailHeight:"],
      Lp: ["skipTransition()"],
      Fp: [{ loose: "Ef = y(null)" }],
      bp: [{ loose: "xu(e.ownerDocument.defaultView ?? void 0) ? uf(e) : null" }],
      Im: ["\"data-cds\": \"MessageAttachmentsImage\"", { loose: "state: l," }],
      qm: ["\"data-cds\": \"MessageAttachmentsFile\"", "shownBadge:", "dir: \"auto\"", "[text-align:match-parent]"],
      $m: ["\"data-cds\": \"MessageAttachmentsQuote\"", "w-[3px] shrink-0 self-stretch rounded-full bg-border"],
      Um: ["\"data-cds\": \"MessageAttachmentsVideo\"", { loose: "F(\"playVideo\", Hp.playVideo, b)" }, "preload: \"metadata\","],
      wp: [{ loose: "hf = \"data-cds-attachment\"" }],
      Tp: [{ loose: "gf = \"data-cds-attachment-restored\"" }],
      jp: [{ loose: "Sf = \"--cds-attachment-vt-name\"" }],
      Vp: ["return `cds-attachment-${e.replace(/[^a-zA-Z0-9_-]/g, \"-\")}`;"],
    },
    chunkFeatures: [
      { loose: "Hp = Object.assign(Vp, { Image: wp, Video: Ap, File: Pp, Quote: Bp })" },
    ], },
  // DROPPED: -
  { target: "chat-composer-dock.mjs", source: "shared-1-BJhqMmkf.js", oneCopy: true,
    exports: { hd: "ComposerDockContext", Sd: "dockGroupAttribute", jd: "dockMaskedClass" },
    officialExports: { hd: "oh", Sd: "ch", jd: "$m" },
    features: {
      hd: ["docked: !1, setComposerStartInset: void 0"],
      Sd: ["\"data-cds-dock-group\""],
      jd: ["in-data-cds-dock-masked:bg-page"],
    }, },
  // DROPPED: om usePresenceMotion (gone)
  // W14-code r6-composer-02: the lazy presence motion is loaded, as in the desktop (shared-50 tD/nD start Od at boot,
  // tier T1). Od (exported ql) fills bd through Br (`Je("cds_lazy_presence_motion", Dd)`); Dd's dynamic import of
  // cb6c4b462 is the host loader (loadPresenceMotionChunk: working-line/presence-motion.mjs over its one vendor-motion).
  // kd (exported Gl, `() => bd`) is the getter EffortControl's value label reads (`[ee] = useState(ae)`); the shell
  // imports it from here instead of holding a copy.
  { target: "chat-composer-presence.mjs", source: "shared-5-Bg6ZMqvt.js", oneCopy: true,
    localAdapters: {
      Dd: { name: 'loadPresenceMotionChunk', features: ['import("./cb6c4b462-Dl6QEgSL.js")'] },
    },
    exports: { Wd: "Presence", bd: "lazyPresenceMotion", kd: "presenceMotion", Od: "loadPresenceMotion" },
    officialExports: { Wd: "Hl", kd: "Gl", Od: "ql" },
    features: {
      Wd: [{ loose: "Object.assign(gm, { Div: bm(\"div\"), Span: bm(\"span\") })" }, "Div:", "Span:"],
      bd: ["bd = null"],
      kd: [{ loose: "kd = () => bd" }],
      Od: ["\"cds_lazy_presence_motion\"", "e?.AnimatePresence !== void 0"],
    }, },
  // DROPPED: -
  { target: "chat-composer-layout.mjs", source: "shared-26-CGuBxVt9.js", oneCopy: true,
    exports: { io: "ChatComposerLayoutContext", ao: "ChatComposerSendContext", oo: "SendPinContext", to: "startInsetClass", qa: "editorRowClass", Ya: "insetTransitionClass", ro: "multilineThreshold", $a: "hasMinLines", Ka: "composerTypeVariables", Ja: "insetDurationClass", co: "reserveTrailingClass", lo: "editorClass", Qa: "editorSizeStyle", yo: "proseMirrorContentClass", uo: "resolvePlaceholderFit", fo: "placeholderFitBox", ho: "placeholderGhostProps", go: "placeholderProps", _o: "stackedEditorClass" },
    officialExports: { io: "Cg", ao: "xg", oo: "Sg", to: "Bg", qa: "Eg", Ya: "jg", ro: "Pg", $a: "Ig", Ka: "Ng", Ja: "Tg", co: "kg", lo: "Gg", Qa: "Kg", yo: "Og", uo: "Jg", fo: "Lg", ho: "Rg", go: "zg", _o: "Ag" },
    features: {
      io: ["startInset: \"none\"", "columnReservesTrailing: !1"],
      ao: ["hasContent: !1, busy: !1, pinSend: !1, form: \"new\""],
      oo: [{ loose: "Wa = _(null)" }],
      to: [{ loose: "return e === \"none\" ? void 0 : Ra[e];" }],
      qa: ["py-[var(--cmp-row-py)]", "leading-[var(--cmp-leading)]"],
      Ya: ["motion-safe:transition-[padding-left,padding-right]"],
      ro: [{ loose: "Va = 0.3" }],
      $a: ["return e !== void 0 && e > 1;"],
      Ka: ["[--cmp-row-h:calc(var(--cmp-leading)+2*var(--cmp-row-py))]"],
      Ja: [{ loose: "Ma = \"motion-safe:duration-200\"" }],
      co: ["co = \"pe-[var(--cmp-trail-w,0px)]\""],
      lo: ["t && \"cursor-default opacity-60\""],
      Qa: ["calc(${e}lh + 2 * var(--cmp-row-py))"],
      yo: ["[&_.ProseMirror:focus]:outline-none", "[&_.is-editor-empty]:before:!content-['']"],
      uo: [{ loose: "return t ?? (La(e) ? \"grow\" : \"clamp\");" }],
      fo: ["line-clamp-[var(--cmp-placeholder-lines)] break-words", "{ lines: n, className: \"truncate\", style: void 0 }"],
      ho: ["\"invisible pointer-events-none select-none max-w-full self-start\"", "\"data-composer-placeholder-ghost\": e,"],
      go: ["\"pointer-events-none select-none absolute start-0 top-0 max-w-full max-h-96 overflow-hidden\"", "!o && \"transition-none motion-safe:transition-none\",", { loose: "Ga," }],
      _o: [{ loose: "eo = \"grid [&>*]:[grid-area:1/1] [&>*]:min-w-0\"" }],
    },
    chunkFeatures: [
      { loose: "Ha = _({" },
    ], },
  // DROPPED: -
  { target: "chat-composer-shell.mjs", source: "shared-5-Bg6ZMqvt.js", oneCopy: true,
    exports: { vm: "ChatComposerShell", Sm: "ChatComposerParts", hm: "useChatComposerFocusRef", mm: "chatComposerFormPlaceholder", Vm: "useResolvedPlaceholder", Bm: "placeholderGhostLines" },
    officialExports: { vm: "Ll", Sm: "Il", hm: "zl", mm: "Bl", Vm: "Pl", Bm: "Nl" },
    features: {
      vm: ["\"data-cds\": \"ChatComposer\"", { loose: "g.trailingNotch === \"float\"" }, "r.style.setProperty(\"--cmp-wrap-h\", e)", { loose: "qe({ disabled: We, onMeasureTarget: I, extraEditorAttributes: Ke })" }, { loose: "{ \"--cmp-lead-w\": nt, \"--cmp-trail-w\": rt }" }, { loose: "d.trailingNotch === \"pad\"" }, "\"data-end-column\":", "\"data-composer-size\":", "[&:dir(rtl)_.ProseMirror]:before:float-left", "\"ps-[var(--cmp-lead-w)]\""],
      Sm: [{ loose: "Header: Jd," }, { loose: "Attachments: Va," }, { loose: "Actions: Id," }, { loose: "PrimaryAction: Ou," }, { loose: "Chin: Kd," }, { loose: "Overlay: qd," }, { loose: "Tray: Xd," }],
      hm: [{ loose: "K0($, 0, () => t.current?.focus())" }, "handle:"],
      mm: [{ loose: "_o(\"replyPlaceholder\", Tf.replyPlaceholder)" }],
      Vm: ["i = n?.intervalMs ?? 5e3,", { loose: "if (!t || p <= 1 || l || Kf()) return;" }, "rotating: !1,"],
      Bm: ["if (typeof e == \"string\") return e === \"\" ? [] : [e];"],
    },
    chunkFeatures: [
      { loose: "u = s === void 0 ? \"float\" : s" },
      { loose: "handoffCard: va.div," },
      { loose: "storeCaret: l," },
      "hasDraftText:",
      "e.commands.setTextSelection(e.view.posAtDOM(t, n)), e.view.focus());",
      ], },
  // DROPPED: -
  { target: "chat-composer-placeholder-timing.mjs", source: "shared-28-DNYlf4wu.js",
    exports: { nw: "placeholderElementTiming" },
    officialExports: { nw: "Ea" },
    features: {
      nw: ["elementtiming: \"composer-placeholder-text\""],
    },
    chunkFeatures: [
      { loose: "Gx = \"data-doc-empty\"," },
      { loose: "[Gx]: Gd(e.doc) ? \"true\" : \"false\"" },
    ], },
  // DROPPED: -
  { target: "composer-add-menu.mjs", source: "c227f4d5e-B-FYKrwT.js",
    exports: { dM: "addTriggerSizes", fM: "addFilesMenuItem", sM: "imageFileAccept" },
    features: {
      dM: [{ loose: "Ej = { small: \"sm\", base: \"base\", large: \"lg\" }" }],
      fM: ["defaultMessage: \"Add files or photos\",", "id: \"vVSGqeakjA\",", "e.formatMessage({ defaultMessage: \"Add image\", id: \"jsBzHH0H/K\" })", "icon: \"Attachment\","],
      sM: [{ loose: "Sj = \"image/png,image/jpeg,image/gif,image/webp\"" }],
    },
    chunkFeatures: [
      { loose: "Oj as Zo," },
      { loose: "h = l ?? c === \"small\"," },
      { loose: "A = y ? x : void 0," },
      "formatMessage({ defaultMessage: \"Add\", id: \"alWu/MbgXB\" })", "\"epitaxy-root break-words\"", "glyphSize:", "supportsFileAttachments:",
      { loose: "V = s ?? \"Add\";" },
      ], },
  // DROPPED: -
  { target: "menu-collision-padding.mjs", source: "shared-18-D3y8YMFN.js",
    exports: { wU: "menuCollisionPadding" },
    officialExports: { wU: "Sn" },
    features: {
      wU: [{ loose: "GR = { top: 48, right: 8, bottom: 8, left: 8 }" }],
    }, },
  // DROPPED: -
  { target: "composer-object-url.mjs", source: "shared-7-DBAgAi5H.js",
    exports: { ME: "useFileObjectUrl" },
    officialExports: { ME: "ha" },
    features: {
      ME: [{ loose: "() => (e ? OE.get(e)?.url : void 0)" }, { loose: "return N(t, n, uC);" }],
    },
    chunkFeatures: [
      "url: URL.createObjectURL(e), subscribers: new Set()",
      { loose: "r.subscribers.size === 0 && (URL.revokeObjectURL(r.url), sC.delete(e))" },
    ], },
  // DROPPED: -
  { target: "composer-video-types.mjs", source: "shared-28-DNYlf4wu.js",
    exports: { iN: "videoFileNamePattern" },
    officialExports: { iN: "rr" },
    features: {
      iN: [{ loose: "bk = /\\.(mp4|webm|mov)$/i" }],
    }, },
  // DROPPED: -
  { target: "composer-attachment-tiles.mjs", source: "c0fbbe82d-COsmfHJY.js",
    adapters: {
      'shared-2-TF8v67kg.js': { ry: { name: 'ComposerAttachmentTiles', module: tileAdapterModule, features: ['th = Object.assign(eh, { Image: Im, Video: Um, File: qm, Quote: $m })'] } },
      'c856385e2-aEyDzrcK.js': { a: { name: 'ComposerPathHoverCard', module: tileAdapterModule, features: ['surface: a,', 'trigger: o,', 'beforeOpen'] } },
      [official.vendorIntl]: { l: { name: 'ComposerMessage', module: tileAdapterModule, features: ['[React Intl]'] } },
    },
    exports: { Vi: "ComposerImageTile", Ui: "ComposerFileTile", Wi: "ComposerQuoteTile", Hi: "ComposerVideoTile", Co: "videoMimeTypePattern", Bi: "attachmentTileAttributes", Ri: "useTileRemove", Ii: "tileFocusTarget" },
    features: {
      Vi: [{ loose: "f(U.Image, {" }, { loose: "v = a ? \"pending\" : void 0" }, "reorder:", "defaultMessage: \"Processing image\",", { loose: "f(Dt, { path: c, surface: \"composer\", attach: !1, trigger: h })," }],
      Ui: [{ loose: "f(U.File, {" }, "defaultMessage: \"Folder\", id: \"ukQpDs7M+0\"", { loose: "t.slice(m + 1).toUpperCase()" }],
      Wi: [{ loose: "f(U.Quote, {" }, { loose: "g = n.trim() === \"\" ? t : n" }, "asRow:"],
      Hi: [{ loose: "f(U.Video, {" }, { loose: "src: l," }, "onClick:"],
      Co: [{ loose: "Si = /^video\\/[a-z0-9.-]+$/" }],
      Bi: [{ loose: "{ [tt]: \"\", [rt]: n, style: i }" }],
      Ri: ["keepFocusOnPointerRemove:", "requestAnimationFrame", ],
      Ii: ["[data-cds=\"CardLink\"], .epitaxy-pill-body"],
    },
    chunkFeatures: [
      { loose: "Ri as o," },
      "\"flex flex-wrap items-end gap-xs [&_[data-reorder-lane]]:cursor-grab", "'button:not([data-cds=\"CardLink\"])'",
      { loose: "function Ki(e) {\n  let t = e.relativePath || e.fileName;\n  return Vt(t) ?? t;\n}" },
      { loose: "function qi(e) {\n  return e.file ? void 0 : e.relativePath;\n}" },
      { loose: "e.file !== void 0 && Ze.test(e.fileName) && Co.test(e.file.type)" },
    ], },
  // DROPPED: -
  // W14-code composer-15: Go's Saved draft dialog (c0fbbe82d ca, with its body sa): the held text in a 3xl CDS Dialog, the
  // Discard changes? and Remove saved draft? confirmations, Cancel / Save. sa's editor Hr is the lazily loaded
  // EpitaxyCodeMirrorText (cbd02b8f2 ka, `Vr = Qe({entry: Ir, …})`, a dynamic import): the host has no CodeMirror, so Hr is
  // a local adapter (ComposerHeldTextEditor) with ka's contract (getValue / focus / getContentElement, onDirty on the first
  // change, Mod-Enter onSubmit, onUnmount with the text getter).
  { target: "composer-held-text-dialog.mjs", source: "c0fbbe82d-COsmfHJY.js",
    adapters: {
      [official.vendorIntl]: { l: { name: 'ComposerMessage', module: tileAdapterModule, features: ['[React Intl]'] } },
    },
    localAdapters: {
      Hr: { name: 'ComposerHeldTextEditor', module: tileAdapterModule, features: ['Hr = Vr.Component'] },
    },
    exports: { ca: "HeldTextDialog" },
    features: {
      ca: ["defaultMessage: \"Saved draft\", id: \"dxXfrwuTJF\"", { loose: "defaultMessage: \"Discard changes?\", id: \"41zpq3nBvm\"" },
        { loose: "defaultMessage: \"Remove saved draft?\", id: \"Z6Mb9r9ele\"" }, { loose: "defaultMessage: \"This is the only copy of this text.\", id: \"tK3aS6EQE+\"" },
        { loose: "size: \"3xl\"" }],
    },
    chunkFeatures: [
      { loose: "defaultMessage: \"Saved draft text\", id: \"Ue/4lPBQAy\"" },
      { loose: "className: \"flex max-h-64 flex-col overflow-hidden rounded border border-alpha-3\"" },
      { loose: "pick: (e) => e.EpitaxyCodeMirrorText," },
    ], },
  // DROPPED: -
  { target: "code-pane-experimental.mjs", source: "shared-18-D3y8YMFN.js",
    exports: { lx: "codePaneExperimental" },
    officialExports: { lx: "Xd" },
    features: {
      lx: [{ loose: "Ub = { naturalImageTiles: \"sized\" }" }],
    },
    chunkFeatures: [
      { loose: "Wb = { ...Ub, shrinkWrapMemory: !0 }" },
    ], },
  // DROPPED: -
  { target: "composer-intake-split.mjs", source: "shared-52-uHFNjl7C.js",
    exports: { nP: "splitTransferItems", pb: "composerImageMimeTypes" },
    officialExports: { nP: "oc", pb: "Tp" },
    features: {
      nP: ["i.webkitGetAsEntry?.()?.isDirectory ? n.push(a) : r.push(a)", "return { folders: n, files: Array.from(t ?? []) };"],
      pb: [{ loose: "Dy = [\"image/jpeg\", \"image/png\", \"image/gif\", \"image/webp\"]" }],
    }, },
  // DROPPED: -
  { target: "composer-image-types.mjs", source: "cafc2a89b-CLdxe4l9.js",
    exports: { a: "acceptedImageTypes" },
    officialExports: { a: "i" },
    features: {
      a: [{ loose: "i = r" }],
    }, },
  // DROPPED: -
  { target: "composer-intake-route.mjs", source: "cc43287c9-Me-M2ucD.js",
    exports: { Kq: "routeComposerIntake" },
    features: {
      Kq: [{ loose: "let r = e.filter((e) => gj.includes(e.type))," }, "a = n.otherFiles ? [] : [...i, ...(n.folders ? [] : t)];", "n.folders !== void 0 && t.length > 0"],
    },
    chunkFeatures: [
      { loose: "Yh(e, \"drop\")," },
      { loose: "Yh({ files: e, folders: [] }, \"file_picker\")," },
      { loose: "Yh(mo(e.clipboardData?.items, e.clipboardData?.files), \"paste\") &&" },
    ], },
  // DROPPED: -
  { target: "composer-drop-target.mjs", source: "cc63499d2-BBo0dW2q.js",
    exports: { c: "useDropTarget", l: "DropHalo" },
    officialExports: { c: "n", l: "t" },
    features: {
      c: [{ loose: "l && e.stopPropagation()," }, { loose: "(e.dataTransfer.dropEffect = u ? \"none\" : s)" }, "let t = e.isDefaultPrevented();", { loose: "{ isDragOver: w, handlers: C }" }],
      l: [{ loose: "a = r === void 0 ? \"on-target\" : r" }, { loose: "s = o(40)" }, "shadow-[inset_0_0_0_2px_var(--cds-fill-accent)]", "motion-safe:animate-[cds-drop-ring-in_0.15s_cubic-bezier(0.215,0.61,0.355,1)]"],
    }, },
  // DROPPED: -
  { target: "composer-pane-drop-zone.mjs", source: "c4c113f6f-BtSWvkm7.js",
    exports: { d: "ComposerPaneDropZone", l: "useFileDropTarget", u: "droppedEntries" },
    officialExports: { d: "t", l: "r", u: "n" },
    features: {
      d: [{ loose: "onDropped: f," }, { loose: "let t = a(e.dataTransfer.items, e.dataTransfer.files);" }, { loose: "e(\"relative\", h)" }, ],
      l: [{ loose: "(!i && l(e)) || n?.accepts(e) === !0" }, { loose: "l(e) ? t(e) : n?.onDrop();" }, "dropEffect: \"copy\",", "claim: !0,"],
      u: ["n[e].kind === \"file\" ? n[e].webkitGetAsEntry?.() : null"],
    },
    chunkFeatures: [
      "return e.dataTransfer?.types?.includes(\"Files\") ?? !1;",
    ], },
];

// The 3.6556.2 contract's module table, read by the 4.16336.0 port's tests and locate tooling (no effect on output).
export { modules as contract3Modules };

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
// A feature is a plain string (matched as is) or { loose } (official.looseFeature: identifiers of at most three
// characters generalized, string literals and longer names kept, R2/E5).
const featureMatches = (text, f) => typeof f === 'string' ? text.includes(f) : official.looseFeature(f.loose).test(text);
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !featureMatches(text, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// R1 / R3: a vendor-frame alias is a React import when the official table names it, and only after assertVendorAlias
// found it on this vendor-frame (top-level `local=<namespace>.<member>`, or the compiler-runtime shape for `Oo`).
function vendorImport(file, alias, src) {
  const target = file === vendorFrame ? official.reactAliases[alias] : undefined;
  if (!target) return null;
  official.assertVendorAlias(src.bytes.toString(), alias, target);
  return target;
}

// `dry`: build every module and the manifest without reading or writing the output folder (generator development).
export async function extractCodeComposer({ check = false, dry = false, version = referenceVersion, survey = false } = {}) {
  if (version === official4.referenceVersion) return extractTarget4(contract4, { check, dry, survey });
  if (version !== referenceVersion) throw Error(`extract-code-composer has no ${version} source contract`);
  const cache = new Map();
  const viewTabsManifest = await viewTabsManifestFor(referenceVersion);
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
      // W14-code composer-15: a same-chunk binding the host answers (localAdapters), pinned to its own declaration text.
      const localAdapter = spec.localAdapters?.[name];
      if (localAdapter) {
        const declared = src.program.scope.getBinding(name)?.path;
        if (!declared || declared.isImportSpecifier()) throw Error(`${spec.target}: local adapter ${name} is not a declaration of ${spec.source}`);
        assertFeatures(`${spec.target}: local adapter ${name}`, declarationText(src, declared), localAdapter.features);
        imports.set(name, { from: localAdapter.module ?? adapterModule, name: localAdapter.name, via: `${spec.source}:${name}`, kind: 'adapter', original: name });
        return;
      }
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
          const react = calleeFile === vendorFrame && vendorImport(calleeFile, callee.node.imported.name, await readSource(calleeFile, cache));
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
  if (dry) {
    // nothing written
  } else if (check) {
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
  console.log(`${dry ? 'Built' : check ? 'Verified' : 'Extracted'} ${manifest.modules.length} Code composer modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
// ---------------------------------------------------------------------------------------------------------------------
// 4.16336.0 source contract (see the engine below). Adapters: react-intl useIntl / FormattedMessage are answered by the
// composer's host intl (as 3.6556.2); the GrowthBook reader shared-0 Uu (exported Rx) by the one host table cds-core reads.
const CONTRACT4_ADAPTERS = {
  [official4.vendorIntl]: {
    p: { name: 'useComposerIntl', module: '../../source-composer-current-adapters.jsx', features: ['[React Intl]'] },
    l: { name: 'ComposerMessage', module: '../../source-composer-attachment-adapters.jsx', features: ['[React Intl]'] },
  },
};
const CONTRACT4_GLOBALS = new Set(['window', 'document', 'globalThis', 'navigator', 'performance', 'queueMicrotask', 'requestAnimationFrame',
  'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', 'Symbol', 'Object', 'Array', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'WeakRef', 'Math', 'Number', 'String', 'Boolean', 'Date', 'JSON', 'Error', 'TypeError', 'RegExp', 'Infinity', 'NaN',
  'undefined', 'Intl', 'URL', 'Reflect', 'Proxy', 'console', 'isNaN', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent',
  'getComputedStyle', 'matchMedia', 'CSS', 'Element', 'HTMLElement', 'Node', 'DOMException', 'ResizeObserver', 'MutationObserver',
  'IntersectionObserver', 'AbortController', 'Event', 'KeyboardEvent', 'CustomEvent', 'DataTransfer', 'File', 'Blob', 'Uint8Array', 'BigInt', 'arguments', 'NodeFilter']);
// Semantic modules: the 3.6556.2 file and export names, re-located in 4.16336.0 (roots by export alias or as private
// declarations, features on their own prettier text, uniqueness or `readBy`). 3.6556.2 roots with no 4.16336.0 binding are
// dropped with a DROPPED note; roots cds-core now publishes are dropped too (consumers link cds-core), noted LINKED.
const L = (loose, keep) => (keep ? { loose, keep } : { loose });
const CONTRACT4_MODULES = [
  // shared-6 -> shared-38 (the composer / environment class tokens moved). DROPPED: __ composerRowLeadingClass ("flex
  // items-center ms-0.5", no 4.16336.0 binding). Changed values: the chin class is "-mt-1.5 -mb-2.5 md:-my-2" and the
  // environment bar "pt-0.5 -mb-0.5 md:pt-0 md:mb-0" (density variants became md: breakpoints); the line class lost ps-4 pe-20.
  { target: 'composer-tokens.mjs', source: 'shared-38-DyF0_Fim.js',
    exports: { Hr: 'composerCardSizeClass', Gr: 'composerCardRootClass', ar: 'composerRowControlClass', sr: 'composerRowChinClass',
      cr: 'composerRowChinSlotClass', Lr: 'composerChinTrailingClass', Ur: 'composerTrailingControlsClass', Wr: 'composerRowTrailingInsetClass',
      xr: 'composerPetSlotClass', ir: 'environmentBarClass', dr: 'environmentBarResponsive', or: 'environmentBarInsetClass',
      rr: 'environmentBarLineClass', fr: 'environmentBarLabelClass', lr: 'composerRingSlotClass', pr: 'environmentTriggerGivesWayClass' },
    aliases: { Hr: null, Gr: 'hn', ar: 'sn', sr: 'en', cr: 'rn', Lr: '$t', Ur: 'Wt', Wr: 'tn', xr: 'Kt', ir: 'an', dr: 'bn', or: 'on', rr: 'vn',
      fr: 'xn', lr: 'in', pr: 'yn' },
    features: {
      Hr: ['"[--cds-h-control:calc(1.75rem*var(--cds-rem-scale,1))] [--cds-radius-composer:calc(0.875rem*var(--cds-rem-scale,1))]"'],
      Gr: [L('${Hr}', ['Hr']), '[--cmp-font-size:var(--prompt-text-size)]', '[--cmp-line-height:var(--prompt-line-height)]'],
      ar: ['"[--cds-h-control:calc(1.5rem*var(--cds-rem-scale,1))] [--cds-pad-md:calc(0.375rem*var(--cds-rem-scale,1))]', '[--cds-leading-body:calc(1.25rem*var(--cds-rem-scale,1))]"'],
      sr: ['"-mt-1.5 -mb-2.5 md:-my-2"'], cr: ['"block h-6"'], Lr: ['"grid min-w-0 grid-flow-col auto-cols-[minmax(0,max-content)] items-center"'],
      Ur: ['"flex items-center gap-2"'], Wr: ['"compact:me-1"'], xr: ['"-mb-1.5 compact:-mb-1.5 comfortable:-mb-2"'],
      ir: ['"pt-0.5 -mb-0.5 md:pt-0 md:mb-0"'], dr: ['row: "@max-[28.75rem]:flex-wrap"', 'ghost: "h-6 @max-[28.75rem]:h-13.5"'],
      or: ['"px-2.5"'], rr: ['"pointer-events-none absolute inset-x-0 bottom-1.5 px-4 text-footnote"'],
      fr: ['min-w-[calc-size(max-content,min(size,5ch))]"'], lr: ['"flex shrink-0 ms-px"'], pr: ['min-w-[calc-size(max-content,min(size,10ch))]"'],
    } },
  { target: 'composer-testids.mjs', source: 'shared-1-D1bGaTaN.js', exports: { ap: 'sendTestId', op: 'stopTestId' }, aliases: { ap: 'Rb', op: 'Vb' },
    features: { ap: ['"code-prompt-send"'], op: ['"code-prompt-stop"'] } },
  // DROPPED: p sendGlyphBoxClass, m DockGlyphBox (the fizzy-lake "icons" glyph box is gone from cfca6870a).
  { target: 'composer-glyph.mjs', source: 'cfca6870a-CdqZXIck.js', exports: { f: 'dockGlyphProps', p: 'dockGlyphIconClass', d: 'autoGlyphSize' },
    aliases: { f: 'r', p: 't', d: 'n' },
    features: { f: ['size: "base"', 'dockGlyph: !0'],
      p: ['"text-secondary-control group-hover/btn:text-primary group-aria-pressed/btn:text-accent group-hover/btn:group-aria-pressed/btn:text-accent"'],
      d: [L('d = "auto"')] },
    chunkFeatures: ['dockGlyph'] },
  // LINKED: shared-25 _d (ownerWindow) is cds-core's. DROPPED: ni noopSubscribe (nothing in this graph reads it).
  { target: 'owner-support.mjs', source: 'shared-25-D-aF0gt9.js', exports: { vd: 'ownerWindowOrGlobal', yd: 'ownerDocument' }, aliases: { vd: 'Wp', yd: 'Bp' },
    features: { vd: ['?? globalThis.window'], yd: ['globalThis.document', 'e.ownerDocument ?? globalThis.document'] } },
  { target: 'placeholder-fit.mjs', source: 'c1c6ea9ac-BbaFmNAA.js', exports: { a: 'useOverflowing' }, aliases: { a: 't' },
    features: { a: ['e.scrollWidth > e.clientWidth', '.fonts?.ready?.then(', L('l === "y"')] } },
  { target: 'shortcut-caps.mjs', source: 'shared-frame-CJdE5Ria.js', exports: { Sc: 'shortcutCaps', bc: 'parseShortcutKeys', _c: 'ownEntry' },
    aliases: { Sc: 'if', bc: null, _c: null },
    features: { Sc: ['spoken: n', '/^[A-Za-z0-9 ]+$/'], bc: ['.split("+")', L('dc(e) ? r.push(e) : i.push(e)')], _c: ['Object.hasOwn(e, t) ? e[t] : void 0'] } },
  { target: 'composer-keycap.mjs', source: 'shared-frame-CJdE5Ria.js', exports: { Qs: 'keycapClass' }, aliases: { Qs: 'of' },
    features: { Qs: ['Array.from(e ?? "").length === 1'] } },
  { target: 'composer-kbd.mjs', source: 'cbd6db52c-CNwL7yiy.js', exports: { r: 'Kbd' }, aliases: { r: 't' },
    features: { r: ['"text-caption"', '[--cds-shortcut-cap-ink:currentColor]', 'onFill'] } },
  // c4a70913c -> cc44b66a7.
  { target: 'transcript-surface.mjs', source: 'cc44b66a7-CBE7MOEW.js', exports: { f: 'transcriptSurfaceClass' }, aliases: { f: 'g' },
    features: { f: ['"bg-[var(--epitaxy-transcript-surface,var(--cds-surface-1))]"'] } },
  // cc5c56f5c -> shared-55.
  { target: 'path-tooltip-placement.mjs', source: 'shared-55-BRv2XBP7.js', exports: { mV: 'pathTooltipPlacement', gV: 'pathTooltipContent' },
    aliases: { mV: 'D', gV: 'k' },
    features: { mV: ['max-w-[min(480px,var(--available-width))]', 'side: "bottom"'], gV: ['dir: "ltr"', 'inline-block max-w-full whitespace-pre-wrap'] } },
  { target: 'composer-card-tokens.mjs', source: 'c227f4d5e-DGDdGBTz.js',
    exports: { eY: 'sendCellClass', tY: 'sendCellLayerClass', nY: 'bashModeRingClass', rY: 'shelfStartInset', iY: 'shelfStartProperty',
      aY: 'shelfStartPaddingClass', sY: 'suggestionGhostClass', OJ: 'submitLayerClass', kJ: 'submitLayerEnterClass', AJ: 'submitLayerExitClass',
      $J: 'stopSendGuardMs', vZ: 'strayEnterWindowMs' },
    aliases: { eY: null, tY: null, nY: null, rY: null, iY: null, aY: null, sY: null, OJ: null, kJ: null, AJ: null, $J: null, vZ: null },
    readBy: { rY: 'mY', $J: 'pY', vZ: 'QZ' },
    features: {
      eY: ['"grid shrink-0 items-center justify-items-end"'], tY: ['"col-start-1 row-start-1 flex"'], nY: ['"inset-ring-1 inset-ring-pro"'],
      rY: [L('rY = 4', ['rY'])], iY: ['"--epitaxy-shelf-start"'], aY: ['"ltr:ps-[var(--epitaxy-shelf-start,0px)]"'],
      sY: ['"italic text-muted-as-secondary"'], OJ: ['"col-start-1 row-start-1 flex cursor-default items-center justify-end"'],
      kJ: ['cds-fade-in_0.12s_ease-out_0.08s_backwards'], AJ: ['[transition:visibility_0s_linear_80ms]'],
      $J: [L('$J = 500', ['$J'])], vZ: [L('vZ = 500', ['vZ'])],
    },
    chunkFeatures: [
      L('Date.now() - v.current < $J || m(h())', ['$J']), L('jo.current = Date.now() + vZ', ['vZ']),
      '.style.setProperty(iY, `${Math.max(0, t - rY)}px`)', '"epitaxy-prompt"', 'cardClassName:', 'onClusterWidthsChange:', 'dropScope:',
      L('trailingNotch: It'), L('holdSendButton: () => Tn({ until: Date.now() + yZ, storeKey: o })'),
      'maxHeight: "min(24rem, 40svh)",', 'className: "epitaxy-prompt-input",', '"epitaxy-attachment-shelf w-full",',
      'className: "truncate text-muted-as-secondary",',
    ] },
  // shared-28 -> shared-5.
  { target: 'composer-dialog-focus.mjs', source: 'shared-5-u8kha2eH.js', exports: { oY: 'overlaySurfaceSelector', sY: 'focusInsideOverlay' },
    aliases: { oY: null, sY: '_' },
    features: { oY: ['[role="dialog"]', '[data-cds="AskUserQuestion"]'], sY: [L('t.closest(oY)', ['oY']), '!n.contains(e)'] } },
  { target: 'composer-focus-yield.mjs', source: 'c227f4d5e-DGDdGBTz.js', exports: { GJ: 'editableFieldSelector', KJ: 'focusBelongsElsewhere' },
    aliases: { GJ: null, KJ: 'Gn' },
    features: { GJ: ['[contenteditable=""]', '[contenteditable="true"]'], KJ: [L('t.closest(GJ)', ['GJ']), 'checkVisibility({ visibilityProperty: !0 })'] },
    chunkFeatures: [
      'i = n?.yieldsToUser === !0;', 'e.focus({ preventScroll: !0 });', '(t.view.focus(), t.commands.focus(null, { scrollIntoView: !1 }));',
      'if (!(e.shiftKey || e.altKey)) {', L('(e.metaKey || e.ctrlKey || zs())'),
    ] },
  { target: 'composer-final-focus.mjs', source: 'c227f4d5e-DGDdGBTz.js', exports: { R6: 'useComposerFinalFocus' }, aliases: { R6: 'y' },
    features: { R6: ['{ onRequestComposerFocus: t, isPanelActive: n, keyboardOnly: r } = e,', "'[role=\"menu\"], [role=\"dialog\"], [role=\"alertdialog\"]'"] } },
  { target: 'composer-key-label.mjs', source: 'c227f4d5e-DGDdGBTz.js', exports: { lY: 'shortcutLabel' }, aliases: { lY: null },
    features: { lY: ['.join("+")', 'e.spoken ?? e.label'] },
    chunkFeatures: [
      'import { t as um } from "./c1c6ea9ac-BbaFmNAA.js";', L('defaultMessage: "{sendKey} to send, {queueKey} to queue for later",'),
      'id: "mZ6xnUz7iS",', '{ defaultMessage: "{queueKey} to queue", id: "FIL0bW8Kgx" },', '"aria-description":', 'placeholderFit:',
      '"invisible me-px whitespace-nowrap before:content-[attr(data-placeholder-fit-probe)]",',
    ] },
  // DROPPED: shared-8 HF stopGlyphName (pY now names "StopFilled" itself); mj preventFocusSteal (c227f4d5e Cq, exported Qn, is
  // shape-equal to eleven other `e.preventDefault()` helpers and nothing in this graph or its consumers reads it).
  { target: 'composer-send-cell.mjs', source: 'c227f4d5e-DGDdGBTz.js',
    exports: { pY: 'ComposerSendCell', jJ: 'SubmitCrossfade', cY: 'SendHintRow', DJ: 'IdleSendStateContext', $G: 'useComposerHasText' },
    aliases: { pY: null, jJ: null, cY: null, DJ: null, $G: 'or' }, readBy: { DJ: 'pY' },
    features: {
      pY: ['"data-testid": "code-prompt-trailing-controls"', '"data-testid": "code-prompt-send-cell"', 'className: "size-control"',
        L('Date.now() - v.current < $J', ['$J']), 'defaultMessage: "Queue for later"', 'defaultMessage: "Send and stay here"', 'keys: "cmd+alt+enter"', '"StopFilled"'],
      jJ: ['e.propertyName === "visibility"', 'inert: !0'], cY: ['"inline-flex items-center justify-between gap-xs"', 'keys: n'],
      DJ: [L('F(void 0)')], $G: ['e.readOutsideRender', 'e.subscribe('],
    } },
  { target: 'transcript-text-item.mjs', source: 'cb27dab29-Cw2yQaFh.js', exports: { Fe: 'isTranscriptTextItem' }, aliases: { Fe: 'S' },
    features: { Fe: ['e.kind === "text"', '"narration_summary"'] } },
  { target: 'transcript-provisional.mjs', source: 'c06cf64bb-CoZso5N4.js', exports: { Hy: 'isEmptyProvisionalEntry' }, aliases: { Hy: 'ni' },
    features: { Hy: ['e.provisionalMessageId !== void 0 && e.items.length === 0'] } },
  { target: 'transcript-user-kind.mjs', source: 'c4d199b75-BFt-qsGU.js', exports: { ot: 'userEntryKind' }, aliases: { ot: 'w' },
    features: { ot: ['case "commentSummon":', '"bash"', '"bubble"'] } },
  // c227f4d5e IE / NE / WE / UE -> cee0f6656 (u / s / v / _); wE -> c227f4d5e II.
  { target: 'transcript-replies.mjs', source: 'cee0f6656--wXNpyCQ.js',
    exports: { u: 'isAssistantEntry', s: 'isUserTurnEntry', v: 'endsFinishedReply', _: 'replyItems' }, aliases: { u: 'a', s: 'f', v: 'o', _: 'u' },
    features: { u: [L('e.author === "assistant" && !n(e)')], s: [L('e.author === "user" && o(e) && t(e.items) !== "bash"')],
      v: [L('if (i === void 0 || i.synthetic === !0) return !1;'), L('t.synthetic !== !0 && t.aside !== !0'), 'return !n;'],
      _: [L('return g(e, t, n).flat();')] } },
  { target: 'transcript-reply-text.mjs', source: 'c227f4d5e-DGDdGBTz.js', exports: { II: 'replyText' }, aliases: { II: 'vo' },
    features: { II: [L('e.text.length > 0 ? [e.text] : []')] } },
  { target: 'copy-reply-arg.mjs', source: 'cc43287c9-dzfX-J5i.js', exports: { kue: 'parseCopyReplyCount' }, aliases: { kue: null },
    features: { kue: ['e === "" ? 1', '/^[1-9]\\d*$/.test(e)'] },
    chunkFeatures: ['case "copy-reply": {'] },
  { target: 'copy-reply-replies.mjs', source: 'cc43287c9-dzfX-J5i.js', exports: { Aue: 'copyableReplies', jue: 'copyReplyTranscript' },
    aliases: { Aue: null, jue: null },
    features: { Aue: ['i.localOutput === !0', 'a !== "" && n.push({ entryId: i.id, text: a });'], jue: ['replying: e.responding', L('Aue(e.entries, e.responding)', ['Aue'])] },
    chunkFeatures: ['id: "d6GVin8ZgF",', 'id: "iAkUwGZZtY",', 'id: "iZ+iUUQvSB",', 'id: "kT+SiiA0vq",', '{ count: l.length },', 'let u = l[l.length - s];',
      'formats: "plain_html",', 'id: "wSG94kLy28",', 'i.arg === "" ? `/${i.name}` : `/${i.name} ${i.arg}`,', 'id: "z7U1VhFXoU",'] },
  { target: 'environment-bar.mjs', source: 'cc43287c9-dzfX-J5i.js',
    exports: { vge: 'EnvironmentBar', d8: 'EnvironmentChip', u8: 'EnvironmentChipGroup', _ge: 'useEnvironmentBarFit', c8: 'environmentBarSignature',
      s8: 'EnvironmentIconOnlyContext', gge: 'environmentBarHysteresis', l8: 'environmentChipClass', Y5: 'environmentTriggerClass', X5: 'EnvironmentTriggerLabel' },
    aliases: { vge: null, d8: null, u8: null, _ge: null, c8: null, s8: null, gge: null, l8: null, Y5: null, X5: null },
    readBy: { s8: 'vge', gge: '_ge' },
    features: {
      vge: ['"data-testid": "epitaxy-environment-bar"', '"data-testid": "environment-bar-mode"', 'flex shrink-0 empty:hidden', L('s8.Provider', ['s8'])],
      d8: ['"data-icon-only":', 'name: "CaretDown"', 'className: "shrink-0 text-muted-as-secondary"', 'hoverable: !1'],
      u8: [L('flex empty:hidden ${l8}', ['l8'])],
      _ge: [L('n.width < e.need + gge', ['gge'])],
      c8: ['.join("|")', 'getBoundingClientRect().width'],
      s8: [L('s8 = O(!1)', ['s8'])], gge: [L('gge = 2', ['gge'])], l8: ['`rounded ${'],
      Y5: ['`${t ? "shrink" : "min-w-0 shrink"}${e ? " text-secondary" : ""}`'],
      X5: ['"data-overridden":', L('flex min-w-0 items-center gap-1 ${c ? "text-warning" : n ? "text-accent" : ""}')],
    } },
  { target: 'usage-ring.mjs', source: 'shared-8-BqfCbkJd.js', exports: { RZ: 'UsageRing', PZ: 'usageRingStroke' }, aliases: { RZ: 'k', PZ: 'j' }, readBy: { PZ: 'RZ' },
    features: { RZ: ['className: "-rotate-90"', '"data-ring-track": ""', '"data-ring-arc": ""'], PZ: [L('return NZ(DZ(e));')] } },
  { target: 'composer-row-chin.mjs', source: 'c227f4d5e-DGDdGBTz.js', exports: { j6: 'ModeTriggerLabel', Wz: 'rowModelTriggerClass' },
    aliases: { j6: null, Wz: null }, readBy: { Wz: 'rB' },
    features: { j6: ['"grid grid-cols-[minmax(0,1fr)]"', '"overflow-x-clip text-ellipsis whitespace-nowrap"', 'hidden: !0'], Wz: ['"text-secondary"'] },
    chunkFeatures: [
      'inComposerRow:', 'effortInModelMenu:', '"compact:me-1"', 'EngineFooterStrip',
      L('label: Ie && (!ze || st) ? p(J6, { label: en, name: Qt }, Me?.id) : en,'), 'className: "min-w-0 shrink",', 'className: "inline-flex min-w-0",',
      'className: "relative block",', 'className: "absolute inset-0 flex items-center",',
    ],
    // relink rl-composer (round 3, C1): the X6 row layout — the empty aria-hidden leading, the mode picker after the model
    // selector (On), the trailing children order — and J6's placeholder label are now cut from the official text by
    // scripts/extract-composer-chin-v4.mjs (src/generated/composer-chin-v4 ComposerSessionChin); O3 (w3's ring trigger:
    // its tracks, the "shrink-0" trigger, the row slot gp) is that graph's host boundary, which the host ring follows.
    // These seven chunk strings became the raw declaration sha256 of X6 / J6 / O3 (the composer-chin-v4 pin scheme),
    // which must also be the ones composer-chin-v4's provenance records.
    declarationPins: { X6: 'f54d3bebfa1bd432c0305e7038e7b1822f9bb7d10b1b9a936d373c41859d8378',
      J6: '0c47a2d7ce4be786a3d9d14ef85818165946a6761c7eb5d5a2b692d7feb30756', O3: 'd30a7b7450e5f7eed266400973f016e6c329a66acfe2354d30405435598003df' },
    declarationPinsMirror: 'src/generated/composer-chin-v4/provenance.json' },
  { target: 'keyboard-activation.mjs', source: 'shared-8-BqfCbkJd.js', exports: { UI: 'isKeyboardActivation' }, aliases: { UI: 'oi' },
    features: { UI: ['e.detail === 0', '!("pointerType" in e && e.pointerType)'] } },
  // The shared-frame helpers this graph exports for its consumers (3.6556.2 viewTabsSame copies). cds-core holds most of
  // them without a publicName: cut again here (pure, raw declaration hash equal). LINKED: Wa useCdsColorMode -> cds-core
  // useCdsMode (shared-frame Xa).
  { target: 'chat-composer-frame.mjs', source: 'shared-frame-CJdE5Ria.js',
    exports: { Zm: 'textDirectionOf', ld: 'afterFontsReady', Em: 'useSurfaceFocusShadowStyle', Es: 'useResolvedIconSize', wn: 'isRenderable',
      La: 'useRootNaturalImageTiles', Mn: 'useOptionalEventCallback', Md: 'isTextarea', rs: 'rootRemPx', Ad: 'isHtmlElement', co: 'isSurfaceToken',
      Dn: 'afterAnimationsSettle', _d: 'dropScrimLayer', Rn: 'isUnfocusedFrame', Hn: 'swallowEnterAfterFocusMove', yn: 'clickModifierSource',
      Hm: 'sanitizeLabelText', Um: 'collapseControlText', Wm: 'isBlankLabelText', Gm: 'trimLeadingInvisible', Km: 'tooltipSafeText', An: 'loadNamedChunk' },
    aliases: { Zm: 'Iu', ld: 'Nd', Em: 'td', Es: 'ff', wn: 'Rp', La: 'Hf', Mn: 'Pp', Md: 'Cd', rs: 'vf', Ad: 'yd', co: 'Af', Dn: 'Lp', _d: 'wd', Rn: 'Ap',
      Hn: 'kp', yn: 'Wp', Hm: 'Wu', Um: 'Uu', Wm: 'Bu', Gm: 'Gu', Km: 'Hu', An: 'Fp' },
    features: {
      Zm: ['/\\p{L}/u.exec(e)?.[0]', '? "rtl" : "ltr"'], ld: ['e?.fonts?.ready', 't.then(i, i)'],
      Em: ['"--cds-focus-shadow":', '"--cds-focus-shadow-danger":', L('t = Xa()', ['Xa'])], Es: [L('t = e === void 0 ? ws : e', ['ws']), L('return J2($, 0, t, n) ? K2($, 0, t, n, Cs(t, n)) : $[2];', ['Cs'])],
      wn: ['e != null && typeof e != "boolean"'], La: [L('return X(Ia) ?? !1;', ['Ia'])], Mn: ['return e === void 0 ? void 0 : r;', 't.current?.(...n)'],
      Md: ['e.localName === "textarea"', L('return Ad(e) &&', ['Ad'])], rs: [L('typeof document > "u" ? 16 : ns(ts())')], Ad: [L('return Od(e) === Ed;', ['Od', 'Ed'])],
      Ed: ['"http://www.w3.org/1999/xhtml"'], co: [L('return so.has(e);', ['so'])], Dn: ['Promise.allSettled(r.map((e) => e.finished))'],
      _d: [L('_d = 9e3', ['_d'])], Rn: ['t.top !== t.self && !e.hasFocus()'], Hn: ['e.key === "Enter" && (e.repeat || (t && performance.now() < n))'],
      yn: ['modifierKey: e.metaKey || e.ctrlKey, source: t'], Hm: [L('return e.replace(Bm(), Vm);', ['Bm', 'Vm'])],
      Um: ['.replace(/[\\t\\n\\v\\f\\r\\u0085\\u2028\\u2029]+/g, " ")'], Wm: [L('return Gm(e) === "";', ['Gm'])],
      Gm: ['return e.replace(/^(?:\\s|\\u200C|\\u200D|\\uFE0E|\\uFE0F)+/u, "");'], Km: [L('let t = Hm(e);', ['Hm'])],
      An: [L('return On ? Promise.resolve(On(e, t)) : t();', ['On'])],
    } },
  // shared-2 -> shared-2 (transition, attributes) + shared-3 (MessageAttachments and its tiles). The shell's Attachments
  // part is shared-3's own `Object.assign(Al, { Image, Video, File, Quote })` (cut as is, no substitute any more).
  { target: 'chat-composer-attachments.mjs', source: 'shared-3-IQTrO7Gx.js',
    exports: { Al: 'MessageAttachments', dl: 'AttachmentImage', Sl: 'AttachmentFile', Ol: 'AttachmentQuote', vl: 'AttachmentVideo', BN: 'videoFileNamePattern' },
    aliases: { Al: null, dl: null, Sl: null, Ol: null, vl: null, BN: 'ct' },
    features: {
      Al: ['"data-cds": "MessageAttachments"', 'thumbnailHeight:'], dl: ['"data-cds": "MessageAttachmentsImage"'],
      Sl: ['"data-cds": "MessageAttachmentsFile"', 'shownBadge:', 'dir: "auto"', '[text-align:match-parent]'],
      Ol: ['"data-cds": "MessageAttachmentsQuote"'], vl: ['"data-cds": "MessageAttachmentsVideo"', 'preload: "metadata",'],
      BN: [L('BN = /\\.(mp4|webm|mov)$/i', ['BN'])],
    } },
  { target: 'chat-composer-attachment-transition.mjs', source: 'shared-2-CsjIBQD8.js',
    exports: { jm: 'useAttachmentTransition', dm: 'scrollParentOf', _m: 'attachmentAttribute', vm: 'attachmentRestoredAttribute',
      Tm: 'attachmentTransitionNameProperty', Hm: 'attachmentTransitionName' },
    aliases: { jm: 'Oy', dm: 'Ny', _m: 'by', vm: 'Sy', Tm: 'xy', Hm: 'wy' },
    features: { jm: ['skipTransition()'], dm: ['e.ownerDocument.defaultView'], _m: ['"data-cds-attachment"'], vm: ['"data-cds-attachment-restored"'],
      Tm: ['"--cds-attachment-vt-name"'], Hm: ['return `cds-attachment-${e.replace(/[^a-zA-Z0-9_-]/g, "-")}`;'] } },
  // shared-1 hd / Sd / jd -> shared-26 Qp / am / mm. Qp (ComposerDockContext) is a cds-core publicName since wave 5b (one
  // Context for every graph): no longer a root here; chat-composer-shell.mjs links it from cds-core under the same name.
  { target: 'chat-composer-dock.mjs', source: 'shared-26-B-POtn5S.js', exports: { am: 'dockGroupAttribute', mm: 'dockMaskedClass' },
    aliases: { am: 'yy', mm: 'dy' },
    features: { am: ['"data-cds-dock-group"'], mm: ['"in-data-cds-dock-masked:bg-page"'] } },
  { target: 'chat-composer-presence.mjs', source: 'shared-5-u8kha2eH.js',
    localAdapters: { Ed: { name: 'loadPresenceMotionChunk', module: '../../source-composer-current-adapters.jsx', features: ['import("./cb6c4b462-DQhtu8Uk.js")'] } },
    exports: { Ud: 'Presence', yd: 'lazyPresenceMotion', Od: 'presenceMotion', Dd: 'loadPresenceMotion' },
    aliases: { Ud: 'Bm', yd: null, Od: 'Um', Dd: 'Gm' }, readBy: { yd: 'Od' },
    features: { Ud: [L('Object.assign(Rd, { Div: Hd("div"), Span: Hd("span") })')], yd: [L('yd = null', ['yd'])], Od: [L('Od = () => yd', ['Od', 'yd'])],
      Dd: ['"cds_lazy_presence_motion"', 'e?.AnimatePresence !== void 0'] } },
  // Mp (ChatComposerLayoutContext) is a cds-core publicName since wave 5b: no longer a root here (linked from cds-core).
  { target: 'chat-composer-layout.mjs', source: 'shared-26-B-POtn5S.js',
    exports: { Np: 'ChatComposerSendContext', Pp: 'SendPinContext', kp: 'startInsetClass', Cp: 'insetTransitionClass',
      jp: 'multilineThreshold', Dp: 'hasMinLines', yp: 'composerTypeVariables', Sp: 'insetDurationClass', Ip: 'reserveTrailingClass', Lp: 'editorClass',
      Ep: 'editorSizeStyle', Kp: 'proseMirrorContentClass', Rp: 'resolvePlaceholderFit', zp: 'placeholderFitBox', Hp: 'placeholderGhostProps',
      Up: 'placeholderProps', Wp: 'stackedEditorClass', xp: 'editorRowClass' },
    aliases: { xp: 'ky', Np: 'wy', Pp: 'Ty', kp: 'Uy', Cp: 'Py', jp: 'Ly', Dp: 'zy', yp: 'Iy', Sp: 'Oy', Ip: 'My', Lp: 'Jy', Ep: 'Yy', Kp: 'jy', Rp: 'Zy',
      zp: 'By', Hp: 'Vy', Up: 'Hy', Wp: 'Ny' },
    features: {
      xp: [L('xp = `${yp} py-[var(--cmp-row-py)] ${bp}`')],
      Np: ['hasContent: !1', 'busy: !1', 'pinSend: !1'], Pp: [L('Pp = b(null)', ['Pp'])],
      kp: [L('return e === "none" ? void 0 : ')], Cp: ['motion-safe:transition-[padding-left,padding-right]'], jp: [L('jp = 0.3', ['jp'])],
      Dp: ['return e !== void 0 && e > 1;'], yp: ['[--cmp-row-h:calc(var(--cmp-leading)+2*var(--cmp-row-py))]'], Sp: ['"motion-safe:duration-200"'],
      Ip: [L('Ip = "pe-[var(--cmp-trail-w,0px)]"', ['Ip'])], Lp: ['t && "cursor-default opacity-60"'], Ep: ['lh + 2 * var(--cmp-row-py))'],
      Kp: ['[&_.ProseMirror:focus]:outline-none', "[&_.is-editor-empty]:before:!content-['']"], Rp: [L('(Fp(e) ? "grow" : "clamp")')],
      zp: ['line-clamp-[var(--cmp-placeholder-lines)] break-words', '{ lines: n, className: "truncate", style: void 0 }'],
      Hp: ['"invisible pointer-events-none select-none max-w-full self-start"', '"data-composer-placeholder-ghost": e,'],
      Up: ['"pointer-events-none select-none absolute start-0 top-0 max-w-full max-h-96 overflow-hidden"', '!o && "transition-none motion-safe:transition-none",'],
      Wp: ['"grid [&>*]:[grid-area:1/1] [&>*]:min-w-0"'],
    } },
  { target: 'chat-composer-shell.mjs', source: 'shared-5-u8kha2eH.js',
    exports: { _m: 'ChatComposerShell', xm: 'ChatComposerParts', mm: 'useChatComposerFocusRef', pm: 'chatComposerFormPlaceholder', Bm: 'useResolvedPlaceholder',
      zm: 'placeholderGhostLines',
      // marlin-chin (U-MARLIN): Bp (exported Pm) marks a wrapper component as the shell's Chin part — shared-8 `Df(GQ)` — so
      // the Chat conversation's GQ-equivalent chin lands in the chin slot (Vp: `e.type[zp] === "Chin"`).
      Bp: 'markChatComposerChin' },
    aliases: { _m: 'Nm', xm: 'Mm', mm: 'Fm', pm: 'Im', Bm: 'Am', zm: 'km', Bp: 'Pm' },
    features: {
      _m: ['"data-cds": "ChatComposer"', 'r.style.setProperty("--cmp-wrap-h", e)', '"data-end-column":', '"data-composer-size":', '[&:dir(rtl)_.ProseMirror]:before:float-left', '"ps-[var(--cmp-lead-w)]"'],
      xm: [L('Header:'), L('Attachments:'), L('Actions:'), L('PrimaryAction:'), L('Chin:'), L('Overlay:'), L('Tray:')],
      mm: ['handle:', '.current?.focus()'], pm: ['"replyPlaceholder"'],
      Bm: ['n?.intervalMs ?? 5e3', 'rotating: !1,'], zm: ['if (typeof e == "string") return e === "" ? [] : [e];'],
      Bp: ['(e[zp] = "Chin")'],
    },
    chunkFeatures: [L('handoffCard:'), L('storeCaret:'), 'hasDraftText:', 'e.commands.setTextSelection(e.view.posAtDOM(t, n)), e.view.focus());'] },
  // shared-28 -> shared-5 (placeholder timing).
  { target: 'chat-composer-placeholder-timing.mjs', source: 'shared-5-u8kha2eH.js', exports: { UQ: 'placeholderElementTiming' }, aliases: { UQ: 'n' },
    features: { UQ: ['elementtiming: "composer-placeholder-text"'] }, chunkFeatures: [L('BQ = "data-doc-empty"', ['BQ'])] },
  { target: 'composer-add-menu.mjs', source: 'c227f4d5e-DGDdGBTz.js', exports: { SJ: 'addTriggerSizes', CJ: 'addFilesMenuItem', vJ: 'imageFileAccept' },
    aliases: { SJ: null, CJ: null, vJ: null },
    features: { SJ: ['{ small: "sm", base: "base", large: "lg" }'],
      CJ: ['defaultMessage: "Add files or photos",', 'id: "vVSGqeakjA",', 'e.formatMessage({ defaultMessage: "Add image", id: "jsBzHH0H/K" })', 'icon: "Attachment",'],
      vJ: ['"image/png,image/jpeg,image/gif,image/webp"'] },
    chunkFeatures: ['formatMessage({ defaultMessage: "Add", id: "alWu/MbgXB" })', '"epitaxy-root break-words"', 'glyphSize:', 'supportsFileAttachments:'] },
  { target: 'menu-collision-padding.mjs', source: 'shared-18-Cfqwgjc5.js', exports: { OJ: 'menuCollisionPadding' }, aliases: { OJ: 'Cn' },
    features: { OJ: ['{ top: 48, right: 8, bottom: 8, left: 8 }'] } },
  // shared-7 -> shared-36.
  { target: 'composer-object-url.mjs', source: 'shared-36-fqRFYwOb.js', exports: { mg: 'useFileObjectUrl' }, aliases: { mg: 'eo' },
    features: { mg: [L('(e ? ug.get(e)?.url : void 0)', ['ug'])] },
    chunkFeatures: ['url: URL.createObjectURL(e), subscribers: new Set()', L('r.subscribers.size === 0 && (URL.revokeObjectURL(r.url), ug.delete(e))', ['ug'])] },
  // c0fbbe82d -> c0a74d72b. Bi attachmentTileAttributes -> Wo, Ri useTileRemove -> Ho.
  { target: 'composer-attachment-tiles.mjs', source: 'c0a74d72b-BELp4TMv.js',
    // c856385e2 br (exported `a`): the path hover card a tile is the trigger of; the host answers it as in 3.6556.2.
    adapters: { 'c856385e2-Cqx37C-b.js': { a: { name: 'ComposerPathHoverCard', module: '../../source-composer-attachment-adapters.jsx',
      features: ['surface: a,', 'trigger: o,', 'beforeOpen', 'reveal: l,'] } } },
    exports: { Go: 'ComposerImageTile', qo: 'ComposerFileTile', Jo: 'ComposerQuoteTile', Ko: 'ComposerVideoTile', Oc: 'videoMimeTypePattern',
      Wo: 'attachmentTileAttributes', Ho: 'useTileRemove', Po: 'tileFocusTarget' },
    aliases: { Go: null, qo: null, Jo: null, Ko: null, Oc: null, Wo: null, Ho: null, Po: null }, readBy: { Wo: 'Ko' },
    features: {
      Go: ['defaultMessage: "Processing image",', 'surface: "composer"', 'reorder:'], qo: ['isDirectory: a', 'fileName: r'],
      Jo: ['badgeTooltip: a', 'asRow: s'], Ko: ['file: t', 'qt.Video'], Oc: ['/^video\\/[a-z0-9.-]+$/'], Wo: [L('return { [Pt]: e ? "" : void 0 };', ['Pt'])],
      Ho: ['keepFocusOnPointerRemove:', 'requestAnimationFrame'], Po: ['[data-cds="CardLink"], .epitaxy-pill-body'],
    } },
  // Na (`Ma.Component`, Ma = Xe({entry: Da, pick: (e) => e.EpitaxyCodeMirrorText, …}), Da a dynamic import of cbd02b8f2):
  // the host has no CodeMirror, so Na is the 3.6556.2 local adapter ComposerHeldTextEditor (4.16336.0 no longer passes
  // autoFocus; the adapter defaults it to false).
  { target: 'composer-held-text-dialog.mjs', source: 'c0a74d72b-BELp4TMv.js', exports: { fs: 'HeldTextDialog' }, aliases: { fs: null },
    localAdapters: { Na: { name: 'ComposerHeldTextEditor', module: '../../source-composer-attachment-adapters.jsx', features: ['Na = Ma.Component'] } },
    features: { fs: ['defaultMessage: "Saved draft"', 'defaultMessage: "Discard changes?"', 'defaultMessage: "Remove saved draft?"', 'size: "3xl"'] },
    chunkFeatures: ['pick: (e) => e.EpitaxyCodeMirrorText,', 'overlayHost: "held_text_sheet",'] },
  { target: 'code-pane-experimental.mjs', source: 'shared-18-Cfqwgjc5.js', exports: { BC: 'codePaneExperimental' }, aliases: { BC: 'wp' },
    features: { BC: ['{ naturalImageTiles: "sized" }'] } },
  // shared-52 -> shared-62. DROPPED: cafc2a89b acceptedImageTypes (its re-export of the image list is gone; shared-62 Eh is it).
  { target: 'composer-intake-split.mjs', source: 'shared-62-DoCqVpIq.js', exports: { bg: 'splitTransferItems', Eh: 'composerImageMimeTypes' },
    aliases: { bg: 'Ph', Eh: 'Cg' },
    features: { bg: ['i.webkitGetAsEntry?.()?.isDirectory ? n.push(a) : r.push(a)', 'return { folders: n, files: Array.from(t ?? []) };'],
      Eh: ['["image/jpeg", "image/png", "image/gif", "image/webp"]'] } },
  { target: 'composer-intake-route.mjs', source: 'cc43287c9-dzfX-J5i.js', exports: { K$: 'routeComposerIntake' }, aliases: { K$: null },
    features: { K$: ['n.refuseFiles', 'a = n.otherFiles ? [] : [...i, ...(n.folders ? [] : t)];', 'n.folders !== void 0 && t.length > 0'] },
    chunkFeatures: [L('sx(Yo(e.clipboardData?.items, e.clipboardData?.files), "paste",')] },
  { target: 'composer-drop-target.mjs', source: 'cc63499d2-BD7iFRH4.js', exports: { c: 'useDropTarget', l: 'DropHalo' }, aliases: { c: 'n', l: 't' },
    features: { c: ['claim: c', 'dropEffect: o', 'disabled: l'], l: ['"on-target"', 'motion-safe:animate-[cds-fade-in_0.15s_cubic-bezier(0.215,0.61,0.355,1)]'] } },
  { target: 'composer-pane-drop-zone.mjs', source: 'c4c113f6f-B-i6bpoH.js', exports: { v: 'ComposerPaneDropZone', h: 'useFileDropTarget', g: 'droppedEntries' },
    aliases: { v: 't', h: 'r', g: 'n' },
    features: { v: ['onDropped: u', 'onEntriesDropped: l'], h: ['dropEffect: "copy",', 'claim: !0,', L('r?.accepts(e) === !0')],
      g: ['n[e].kind === "file" ? n[e].webkitGetAsEntry?.() : null'] },
    chunkFeatures: ['return e.dataTransfer?.types?.includes("Files") ?? !1;'] },
];
// ---------------------------------------------------------------------------------------------------------------------
// 4.16336.0 (region batch 2b, region-plan G6 / cutover.oldConsumersAtGeneration): a second source contract cut from
// snapshots/claude-4.16336.0-20261104 into the isolated graph src/generated/code-composer-v4. Ten 3.6556.2 areas
// (chat-artifact-card, chat-side-chat, code-current, code-editor, code-transcript, composer-notices, cowork-approval,
// effort-control, session-rail-context, sidebar-hover-card) and 18 host files link src/generated/code-composer by original
// identity, so that graph stays 3.6556.2, byte for byte, until they move (productionSwitchNotBeforeBatch 11).
//
// Engine (sharedGraph 'cds-core', the extract-approval-landing.mjs 4.16336.0 contract plus this generator's adapters):
//   - semantic modules (`contract4.modules`) keep the 3.6556.2 file names and export names; every root is pinned by its
//     chunk export alias (`aliases`, null for a private root, which the chunk must not export), by feature strings of its
//     own prettier declaration, and by uniqueness: the only top-level declaration of its chunk carrying every feature, or
//     (`readBy`) the only dependency of a located declaration carrying them. `chunkFeatures` pin strings of the source
//     chunk that consume the roots (call sites the host contract relies on).
//   - every binding reached from a root is the original top-level declaration, sliced once (D1): a same-chunk dependency
//     goes into the module that reaches it first; a binding of another chunk that no module roots goes into that chunk's
//     own module (`chunk-<chunk>.mjs`), so nothing is hand-picked and every cross-chunk edge is the original import.
//   - an import resolves, in order, to: an adapter entry (host answer, its original pinned by features), a React export of
//     vendor-frame (official-4.16336.0.mjs assertVendorAlias), a cds-core publicName (linked, its raw declaration hash equal
//     to cds-core's), a root of a semantic module, or a slice as above. A declaration cds-core replaces by a host adapter
//     (cds-core manifest `kind: adapter`, e.g. vendor-frame's React CJS loader) is replaced by the same adapter here.
//   - a binding cds-core holds without a publicName is cut again only when pure and its raw declaration hashes as
//     cds-core's; module state (a context, a module-level WeakMap / Map / Set / WeakSet, or a reassigned module binding)
//     stops generation (D46) with its stateConflicts (binding, text, reachedBy).
//   - module state the linked area (btw-pane-v4) holds without exporting it stops generation (a second instance). Other
//     4.16336.0 areas are regenerated concurrently and are not link targets of this graph: `--survey` lists the
//     bindings this graph shares with them (overlapWithOtherV4Areas) for the cutover, and generation never reads them.
//   - every emitted module is closed apart from `hostGlobals`; dynamic import() inside a sliced declaration stops generation
//     unless a `localAdapters` entry answers that declaration.
const contract4 = (() => {
  const official = official4, loose = (f, o) => ({ loose: f, ...(o ? { keep: o.keep } : {}) });
  return {
    official, output: path.join(root, 'src/generated/code-composer-v4'), label: 'Code composer 4.16336.0',
    sharedGraph: 'cds-core',
    // The dependency region already on 4.16336.0 whose module state this graph reaches (shared-1 vI modifier keys, the
    // focus guard, the shown-session store): linked, one instance.
    linkedAreas: ['btw-pane-v4'],
    isolatedGraph: { legacyOutput: 'src/generated/code-composer', productionSwitchNotBeforeBatch: 11,
      heldBy: ['chat-artifact-card', 'chat-side-chat', 'code-current', 'code-editor', 'code-transcript', 'composer-notices',
        'cowork-approval', 'effort-control', 'session-rail-context', 'sidebar-hover-card', 'src/composer-copy-reply.mjs',
        'src/composer-final-focus-model.mjs', 'src/composer-focus-api.mjs', 'src/composer-focus-handoff.mjs', 'src/composer-placeholder.mjs',
        'src/main.jsx', 'src/source-branch-switch-dialog.jsx', 'src/source-btw-pane.jsx', 'src/source-chat-composer.jsx',
        'src/source-composer-add-menu.jsx', 'src/source-composer-attachment-adapters.jsx', 'src/source-composer-environment-bar.jsx',
        'src/source-composer-pane-drop.jsx', 'src/source-composer-row-chin.jsx', 'src/source-composer-shell.jsx',
        'src/source-composer-tiles.jsx', 'src/source-composer.jsx', 'src/source-diff-scope.jsx', 'src/source-preview-tabs.jsx'] },
    adapterModules: ['src/source-composer-current-adapters.jsx', 'src/source-composer-attachment-adapters.jsx', 'src/cds-core-adapter.mjs'],
    // Import-level host answers: file -> alias -> { name, module, features (on the original's same-chunk closure) }.
    adapters: CONTRACT4_ADAPTERS,
    hostGlobals: CONTRACT4_GLOBALS,
    modules: CONTRACT4_MODULES,
  };
})();

const featureMatches4 = (text, f) => typeof f === 'string' ? text.includes(f) : official4.looseFeature(f.loose, { keep: f.keep ?? [] }).test(text);
function assertFeatures4(label, text, features = []) {
  const missing = features.filter(f => !featureMatches4(text, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// Parsed chunks are kept in a small LRU (a parsed 1 MB chunk holds hundreds of MB): selections keep their text, not paths.
const sourceCacheSize4 = 6;
// `declarationPins` (local -> raw declaration sha256 of the chunk's shipped bytes: the declarator, or the function
// declaration, as the chunk spells it) and `declarationPinsMirror` (a generated provenance.json that must record the same
// sha256 for each of them, as a root or in pinnedDeclarations). Assertions only: nothing of them reaches the manifest.
function rawDeclarationSha4(src, local) {
  src.rawAst ??= parsers.babel.parse(src.text, {});
  for (const n of src.rawAst.program.body) {
    if (n.type === 'FunctionDeclaration' && n.id?.name === local) return sha(src.text.slice(n.start, n.end));
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id?.name === local) return sha(src.text.slice(d.start, d.end));
  }
  return null;
}
async function assertDeclarationPins4(spec, src) {
  const pins = Object.entries(spec.declarationPins ?? {});
  if (!pins.length) return;
  const problems = [];
  for (const [local, pin] of pins) {
    const now = rawDeclarationSha4(src, local);
    if (now !== pin) problems.push(`${spec.source}#${local} is ${now ?? 'not a top-level declaration'}, pinned ${pin}`);
  }
  if (spec.declarationPinsMirror) {
    const recorded = JSON.parse(await fs.readFile(path.join(root, spec.declarationPinsMirror), 'utf8'));
    const seen = new Map([...(recorded.roots ?? []).map(r => [`${r.file}#${r.local}`, r.declarationSha256]), ...Object.entries(recorded.pinnedDeclarations ?? {})]);
    for (const [local, pin] of pins) if (seen.get(`${spec.source}#${local}`) !== pin)
      problems.push(`${spec.declarationPinsMirror} records ${spec.source}#${local} as ${seen.get(`${spec.source}#${local}`) ?? 'nothing'}, pinned ${pin}`);
  }
  if (problems.length) throw Error(`${spec.target}: declaration pins: ${problems.join('; ')}`);
}
async function readSource4(name, cache) {
  if (cache.has(name)) { const hit = cache.get(name); cache.delete(name); cache.set(name, hit); return hit; }
  while (cache.size >= sourceCacheSize4) cache.delete(cache.keys().next().value);
  if (process.env.CODE_COMPOSER_TRACE) console.error(`read ${name} (${cache.size} cached, heap ${Math.round(process.memoryUsage().heapUsed / 1e6)}MB)`);
  const bytes = await fs.readFile(path.join(official4.ionSource, name));
  const text = bytes.toString();
  const code = await format(text, { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, text, code, program, exported };
  cache.set(name, record);
  return record;
}
// A top-level declaration in the unformatted chunk bytes: the text cds-core (a runSlicer graph) hashes its bindings by.
function rawDeclarationText4(src, name) {
  if (!src.raw) {
    src.raw = new Map();
    for (const node of parseAst4(src.text).body) {
      if (node.type === 'FunctionDeclaration' && node.id) src.raw.set(node.id.name, [node.start, node.end]);
      if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') src.raw.set(d.id.name, [d.start, d.end]);
    }
  }
  const at = src.raw.get(name);
  if (!at) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(...at);
}
// sharedGraph 'cds-core': version, snapshot, every module's bytes and source hash, every publicName exported by its module.
async function cdsCoreGraph4(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(root, 'src/generated', area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map(), adapters = new Map(), aliasAdapters = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${area}/${m.target} was sliced from other ${m.source} bytes`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
    // A declaration cds-core answers by a host adapter (its import `via` names the declaration, file#local).
    for (const i of m.imports ?? []) if (i.kind === 'adapter' && /#/.test(i.via ?? '')) adapters.set(i.via, { from: i.from, name: i.name });
    // An import cds-core answers by a host adapter (its `via` names the chunk export, file:alias; e.g. shared-0 Rx, the
    // GrowthBook feature reader, -> hostGrowthBookFeature): the same import here gets the same host answer.
    for (const i of m.imports ?? []) if (i.kind === 'adapter' && /^[^#]+:[^:#]+$/.test(i.via ?? '')) {
      const seen = aliasAdapters.get(i.via);
      if (seen && (seen.from !== i.from || seen.name !== i.name)) throw Error(`${area}: ${i.via} is answered by two host adapters`);
      aliasAdapters.set(i.via, { from: i.from, name: i.name, original: i.original });
    }
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, held, published, adapters, aliasAdapters, manifestSha256: sha(manifestBytes) };
}
// A dependency region's 4.16336.0 graph this one links (btw-pane-v4): same version, snapshot and shared graph; each module
// cut from the very chunk bytes read here and equal to its manifest. Its exported bindings are linked, never cut again (one
// instance, D1); one it holds without exporting is cut again only when pure and its declaration hashes equal.
async function linkedArea4(contract, area, cache) {
  const dir = path.join(root, 'src/generated', area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== contract.official.referenceVersion || manifest.referenceSnapshot !== contract.official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} (${manifest.referenceSnapshot}), expected ${contract.official.referenceVersion}`);
  if (manifest.sharedGraph !== contract.sharedGraph) throw Error(`${area} links ${manifest.sharedGraph}, expected ${contract.sharedGraph}`);
  const exported = new Map(), held = new Map();
  for (const m of manifest.modules) {
    const src = await readSource4(m.source, cache);
    if (sha(src.bytes) !== m.sourceSha256) throw Error(`${area} ${m.target} was cut from other ${m.source} bytes`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area} ${m.target} differs from its manifest`);
    for (const b of m.bindings) {
      held.set(`${m.source}#${b.name}`, { area, target: m.target, sha256: b.sha256 });
      if (m.exports?.[b.name]) exported.set(`${m.source}#${b.name}`, { area, target: m.target, name: m.exports[b.name], sha256: b.sha256 });
    }
  }
  return { area, exported, held, manifestSha256: sha(manifestBytes) };
}
// Survey only (never part of generation, whose output must not depend on concurrently regenerated areas): bindings this
// graph cuts that another 4.16336.0 area also holds; module state among them must be linked at the production cutover.
async function otherV4Areas(contract, self, linked) {
  const base = path.join(root, 'src/generated'), held = new Map();
  for (const area of (await fs.readdir(base)).sort()) {
    if (area === contract.sharedGraph || area === self || linked.includes(area)) continue;
    const manifest = await fs.readFile(path.join(base, area, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (manifest?.referenceVersion !== contract.official.referenceVersion) continue;
    for (const m of manifest.modules ?? []) if (m.source) for (const b of m.bindings ?? [])
      held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, `${area}/${m.target}`);
  }
  return held;
}
// Module state a second copy would split (D46 / D1): a React context (vendor-frame createContext), a module-level
// WeakMap / Map / Set / WeakSet, or a module binding some declaration reassigns.
function moduleStateKind4(contract, src, p) {
  if (!p.isVariableDeclarator()) return null;
  const binding = src.program.scope.getBinding(p.node.id.name);
  if (binding?.constantViolations.length) return 'module-level binding written elsewhere';
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return `new ${init.callee.name}`;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === contract.official.vendorFrame && contract.official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return 'context';
    }
  }
  return null;
}
const chunkModuleName = file => `chunk-${(/^(shared-[^-]+|vendor-[a-z]+(?:-[a-z]+)*?|[^-]+)-/.exec(file) ?? [, file.replace(/\.js$/, '')])[1]}.mjs`;

// `survey`: resolve everything and return the stateConflicts / problems instead of throwing or writing.
async function extractTarget4(contract, { check = false, dry = false, survey = false } = {}) {
  const { official, output, label } = contract;
  const cache = new Map();
  const graph = await cdsCoreGraph4(contract);
  const linkedAreas = [];
  for (const area of contract.linkedAreas ?? []) linkedAreas.push(await linkedArea4(contract, area, cache));
  const linkedExport = key => linkedAreas.map(a => a.exported.get(key)).find(Boolean);
  const linkedHeld = key => linkedAreas.map(a => a.held.get(key)).find(Boolean);
  const linkedImport = (src, name, key, via) => {
    const l = linkedExport(key);
    if (!l) return null;
    if (l.sha256 !== sha(declarationText(src, src.program.scope.getBinding(name).path))) throw Error(`${key} differs from the declaration ${l.area}/${l.target} exports`);
    return { from: `../${l.area}/${l.target}`, name: l.name, via, kind: 'linked', original: name };
  };
  const sharedFrame = await readSource4(official.sharedFrame, cache);
  official.assertCompilerHelpers(sharedFrame.text);
  const modules = new Map(); // target -> module record
  const order = [];
  const newModule = (spec, kind) => {
    const m = { spec, kind, target: spec.target, source: spec.source, selected: new Map(), imports: new Map(), seen: new Set(),
      rootNames: new Map(Object.entries(spec.exports ?? {})), reexports: new Set(), extraExports: new Set(), heldByCdsCore: [], heldByLinked: [] };
    if (modules.has(m.target)) throw Error(`${m.target} is declared twice`);
    modules.set(m.target, m); order.push(m);
    return m;
  };
  const rootOwner = new Map(), holder = new Map(), parent = new Map(), stateConflicts = [], problems = [];
  const exportFrom = (m, local) => m.rootNames.get(local) ?? (m.extraExports.add(local), local);
  const reachedBy = key => { const chain = []; for (let k = key; k && chain.length < 12; k = parent.get(k)) chain.push(k); return chain.join(' <- '); };
  const fail = message => { if (survey) problems.push(message); else throw Error(message); };
  const linkedSha = (src, file, local, shared) => {
    const held = graph.held.get(`${file}#${local}`);
    if (!held?.sha256 || held.sha256 !== sha(rawDeclarationText4(src, local))) throw Error(`${file}#${local} differs from the declaration ${graph.area} publishes as ${shared.name}`);
    return held.sha256;
  };
  const sharedImport = (src, file, local, via) => {
    const shared = graph.published.get(`${file}#${local}`);
    return shared ? { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via, kind: 'shared-graph', original: local, linkedSha256: linkedSha(src, file, local, shared) } : null;
  };

  // Phase 1: claim and locate every root of the semantic modules (every failure is reported, then generation stops).
  const locateErrors = [];
  for (const spec of contract.modules) {
    const src = await readSource4(spec.source, cache);
    const m = newModule(spec, 'semantic');
    try { assertFeatures4(`${spec.target}: chunk ${spec.source}`, src.code, spec.chunkFeatures); } catch (e) { locateErrors.push(e.message); }
    try { await assertDeclarationPins4(spec, src); } catch (e) { locateErrors.push(e.message); }
    for (const [local, name] of Object.entries(spec.exports)) try {
      const binding = src.program.scope.getBinding(local);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${local} is not a declaration of ${spec.source}`);
      const alias = spec.aliases?.[local];
      if (alias === undefined) throw Error(`${spec.target}: root ${local} names no export alias (null for a private root)`);
      if (alias !== null && src.exported.get(alias) !== local) throw Error(`${spec.target}: ${spec.source} exports ${alias} as ${src.exported.get(alias) ?? 'nothing'}, not ${local}`);
      if (alias === null && [...src.exported.values()].includes(local)) throw Error(`${spec.target}: private root ${local} is exported by ${spec.source}`);
      const features = spec.features?.[local];
      if (!features?.length) throw Error(`${spec.target}: root ${local} has no feature strings`);
      assertFeatures4(`${spec.target}: root ${local}`, declarationText(src, binding.path), features);
      const top = Object.entries(src.program.scope.bindings).filter(([, b]) => b.path.isFunctionDeclaration() || b.path.isVariableDeclarator());
      const readBy = spec.readBy?.[local];
      const pool = readBy ? declarationDeps(src, src.program.scope.getBinding(readBy)?.path ?? (() => { throw Error(`${spec.target}: readBy ${readBy} is not a declaration`); })())
        .map(n => [n, src.program.scope.getBinding(n)]).filter(([, b]) => b && !b.path.isImportSpecifier()) : top;
      const hits = pool.filter(([, b]) => features.every(f => featureMatches4(declarationText(src, b.path), f))).map(([n]) => n);
      if (hits.length !== 1 || hits[0] !== local)
        throw Error(`${spec.target}: root ${local} is not the unique ${readBy ? `dependency of ${readBy}` : 'declaration'} with its features (${hits.join(', ') || 'none'})`);
      const key = `${spec.source}#${local}`;
      if (rootOwner.has(key)) throw Error(`${spec.target}: root ${key} is already a root of ${rootOwner.get(key).target}`);
      if (graph.published.has(key)) throw Error(`${spec.target}: root ${key} is the cds-core publicName ${graph.published.get(key).name}; link it instead`);
      // A root the linked dependency region exports is linked and re-exported here under its semantic name (one instance).
      if (linkedExport(key)) m.reexports.add(local);
      rootOwner.set(key, m);
    } catch (e) { locateErrors.push(e.message); }
  }
  if (locateErrors.length) throw Error(`${label}: ${locateErrors.length} root / feature failures:\n  ${locateErrors.join('\n  ')}`);

  // Phase 2: slice the closures.
  const resolveDecl = async (file, local, via, from) => {
    const key = `${file}#${local}`;
    const owner = rootOwner.get(key);
    if (owner) return { module: owner, name: exportFrom(owner, local), kind: 'generated' };
    const src = await readSource4(file, cache);
    const shared = sharedImport(src, file, local, via);
    if (shared) return shared;
    const linked = linkedImport(src, local, key, via);
    if (linked) return linked;
    const replaced = graph.adapters.get(key);
    // cds-core's module sits at the same depth (src/generated/<area>/), so its adapter path is valid here as is.
    if (replaced) return { from: replaced.from, name: replaced.name, via: key, kind: 'adapter', original: local, sameAs: graph.area };
    const held = holder.get(key);
    if (held) return { module: held, name: exportFrom(held, local), kind: 'generated' };
    const target = chunkModuleName(file);
    const m = modules.get(target) ?? newModule({ target, source: file }, 'chunk');
    if (m.source !== file) throw Error(`${target} would hold bindings of ${m.source} and ${file}`);
    if (!parent.has(key)) parent.set(key, from);
    await visit(m, local, from);
    if (!m.selected.has(local) && !m.imports.has(local)) throw Error(`${key} was not sliced`);
    if (m.imports.has(local)) return { ...m.imports.get(local), via };
    return { module: m, name: exportFrom(m, local), kind: 'generated' };
  };
  const visit = async (m, name, from) => {
    if (m.seen.has(name)) return;
    m.seen.add(name);
    const src = await readSource4(m.source, cache);
    const key = `${m.source}#${name}`;
    if (!parent.has(key)) parent.set(key, from);
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${m.target}: unbound ${name}`);
    const p = binding.path;
    if (p.isImportSpecifier()) {
      const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
      const adapter = m.spec.adapters?.[file]?.[alias] ?? contract.adapters[file]?.[alias];
      if (adapter) {
        const dep = await readSource4(file, cache);
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${m.target}: adapter alias ${via} is no longer exported`);
        assertFeatures4(`${m.target}: adapter ${via} (${local})`, closureText(dep, local), adapter.features);
        m.imports.set(name, { from: adapter.module, name: adapter.name, via, kind: 'adapter', original: local });
        return;
      }
      const hostAnswer = graph.aliasAdapters.get(via);
      if (hostAnswer) {
        const dep = await readSource4(file, cache);
        if (dep.exported.get(alias) !== hostAnswer.original) throw Error(`${m.target}: ${via} is ${dep.exported.get(alias) ?? 'not exported'}, not the ${hostAnswer.original} ${graph.area} answers by ${hostAnswer.name}`);
        m.imports.set(name, { from: hostAnswer.from, name: hostAnswer.name, via, kind: 'adapter', original: hostAnswer.original, sameAs: graph.area });
        return;
      }
      if (file === official.vendorFrame && official.reactAliases[alias]) {
        const dep = await readSource4(file, cache);
        const { module, member } = official.assertVendorAlias(dep.text, alias);
        m.imports.set(name, { from: module, name: member, via, kind: 'react' });
        return;
      }
      const dep = await readSource4(file, cache);
      const local = dep.exported.get(alias);
      if (!local) throw Error(`${m.target}: ${file} does not export ${alias}`);
      const r = await resolveDecl(file, local, via, key);
      m.imports.set(name, r.module ? { from: `./${r.module.target}`, name: r.name, via, kind: 'generated', original: local } : { ...r, via });
      return;
    }
    const localAdapter = m.spec.localAdapters?.[name];
    if (localAdapter) {
      assertFeatures4(`${m.target}: local adapter ${name}`, declarationText(src, p), localAdapter.features);
      m.imports.set(name, { from: localAdapter.module, name: localAdapter.name, via: key, kind: 'adapter', original: name });
      return;
    }
    const owner = rootOwner.get(key);
    if (owner && owner !== m) { m.imports.set(name, { from: `./${owner.target}`, name: exportFrom(owner, name), via: key, kind: 'generated', original: name }); return; }
    const shared = sharedImport(src, m.source, name, key);
    if (shared) { m.imports.set(name, shared); return; }
    const linked = linkedImport(src, name, key, key);
    if (linked) { m.imports.set(name, linked); return; }
    const replaced = graph.adapters.get(key);
    if (replaced) { m.imports.set(name, { from: replaced.from, name: replaced.name, via: key, kind: 'adapter', original: name, sameAs: graph.area }); return; }
    const held = holder.get(key);
    if (held && held !== m) { m.imports.set(name, { from: `./${held.target}`, name: exportFrom(held, name), via: key, kind: 'generated', original: name }); return; }
    if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${m.target}: unsupported declaration ${name}`);
    const state = moduleStateKind4(contract, src, p);
    const cds = graph.held.get(key);
    if (cds) {
      if (state) {
        stateConflicts.push({ binding: key, kind: state, text: declarationText(src, p).slice(0, 160), reachedBy: reachedBy(key) });
        if (!survey) throw Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${m.target}: ${key} (${state}); reached by ${reachedBy(key)}`);
      } else if (cds.sha256 !== sha(rawDeclarationText4(src, name))) fail(`${m.target}: ${key} differs from the declaration ${graph.area}/${cds.target} holds`);
      else m.heldByCdsCore.push(name);
    }
    const lheld = linkedHeld(key);
    if (lheld) {
      if (state) fail(`${m.target}: module state ${key} (${state}) is held by ${lheld.area}/${lheld.target} without an export; a second copy would split it`);
      else if (lheld.sha256 !== sha(declarationText(src, p))) fail(`${m.target}: ${key} differs from the declaration ${lheld.area}/${lheld.target} holds`);
      else m.heldByLinked.push(name);
    }
    holder.set(key, m);
    m.selected.set(name, { start: p.node.start, text: declarationText(src, p), isVar: p.isVariableDeclarator(), state });
    p.traverse({
      ImportExpression() { fail(`${m.target}: dynamic import inside ${name} (${reachedBy(key)})`); },
      CallExpression(r) { if (r.node.callee.type === 'Import') fail(`${m.target}: dynamic import inside ${name}`); },
    });
    for (const dep of declarationDeps(src, p)) await visit(m, dep, key);
  };
  for (const m of [...order]) for (const name of Object.keys(m.spec.exports)) await visit(m, name, `${m.target}`);
  for (const m of order) {
    if (m.kind !== 'semantic') continue;
    const unreached = Object.keys(m.spec.features ?? {}).filter(n => !m.spec.exports[n] && !m.selected.has(n));
    if (unreached.length) fail(`${m.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
  }
  if (survey) {
    const others = await otherV4Areas(contract, path.basename(output), contract.linkedAreas ?? []), overlap = [];
    for (const m of order) for (const [name, rec] of m.selected) {
      const other = others.get(`${m.source}#${name}`);
      if (other) overlap.push({ binding: `${m.source}#${name}`, module: m.target, alsoIn: other, state: rec.state });
    }
    return { stateConflicts, problems, overlapWithOtherV4Areas: overlap, modules: order.map(m => ({ target: m.target, source: m.source, bindings: m.selected.size })) };
  }

  // Phase 3: emit.
  const files = {}, unbound = [];
  const manifest = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-code-composer.mjs',
    sharedGraph: graph.area, sharedGraphManifestSha256: graph.manifestSha256, linkedGraphs: Object.fromEntries(linkedAreas.map(a => [a.area, a.manifestSha256])),
    isolatedGraph: contract.isolatedGraph,
    adapterModules: contract.adapterModules, modules: [] };
  const semantic = order.filter(m => m.kind === 'semantic'), chunks = order.filter(m => m.kind === 'chunk').sort((a, b) => a.target.localeCompare(b.target));
  for (const m of [...semantic, ...chunks]) {
    const src = await readSource4(m.source, cache);
    const sorted = [...m.selected].sort((a, b) => a[1].start - b[1].start);
    const blocks = sorted.map(([, r]) => (r.isVar ? `var ${r.text};` : r.text));
    const groups = new Map();
    for (const [local, entry] of m.imports) {
      const from = entry.from;
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const exportsAll = { ...Object.fromEntries(m.rootNames), ...Object.fromEntries([...m.extraExports].map(n => [n, n])) };
    const names = Object.values(exportsAll);
    if (new Set(names).size !== names.length) throw Error(`${m.target}: duplicate export names ${names.join(', ')}`);
    for (const n of Object.keys(exportsAll)) if (!m.selected.has(n) && !(m.reexports.has(n) && m.imports.get(n)?.kind === 'linked')) throw Error(`${m.target}: exports ${n}, which it does not hold`);
    const importText = [...groups].map(([from, list]) => `import { ${list.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(exportsAll).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${official.referenceVersion} bindings from ${m.source}; generated by extract-code-composer.mjs.\n// Edit the extractor or its adapter modules, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, m.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(n => !contract.hostGlobals.has(n));
    if (foreign.length) { unbound.push(`${m.target}: unbound ${foreign.join(', ')}`); continue; }
    files[m.target] = text;
    manifest.modules.push({
      target: m.target, source: m.source, kind: m.kind, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion: official.referenceVersion,
      bindings: sorted.map(([name, r]) => ({ name, sha256: sha(r.text) })),
      imports: [...m.imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}),
        ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}), ...(e.sameAs ? { sameAdapterAs: e.sameAs } : {}) })),
      exports: exportsAll,
      ...(m.kind === 'semantic' ? { roots: Object.fromEntries(Object.keys(m.spec.exports).map(n => [n, m.spec.aliases[n]])) } : {}),
      ...(m.reexports.size ? { reexports: [...m.reexports] } : {}), heldByCdsCore: m.heldByCdsCore, heldByLinked: m.heldByLinked,
    });
  }
  if (unbound.length) throw Error(unbound.join('\n'));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (dry) {
    // nothing written
  } else if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-code-composer.mjs --release=4.16336.0.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-code-composer.mjs --release=4.16336.0.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${dry ? 'Built' : check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${count} original ${official.referenceVersion} bindings, cds-core ${graph.manifestSha256.slice(0, 8)}).`);
  return manifest;
}
export const contractVersions = Object.freeze([referenceVersion, official4.referenceVersion]);
// The 4.16336.0 contract and its engine, for tests that prove generation stops (a renamed alias, a non-unique root, D46).
export { contract4, extractTarget4 as extractContract4 };

// CLI: no --release runs every contract; --release=<version> one of them; --survey prints the 4.16336.0 D46 stateConflicts.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = process.argv.find(a => a.startsWith('--release='))?.slice('--release='.length);
  const opts = { check: process.argv.includes('--check'), dry: process.argv.includes('--dry'), survey: process.argv.includes('--survey') };
  for (const version of release ? [release] : contractVersions) {
    const result = await extractCodeComposer({ ...opts, version });
    if (opts.survey && version === official4.referenceVersion) console.log(JSON.stringify({ stateConflicts: result.stateConflicts, problems: result.problems, overlapWithOtherV4Areas: result.overlapWithOtherV4Areas }, null, 1));
  }
}
