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
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
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
  { target: "chat-composer-react-version.mjs", source: "vendor-frame-CnSY1sxv.js", viewTabsSame: true, oneCopy: true,
    exports: { ae: "bundledReactVersion" },
    officialExports: { ae: "Do" },
    features: {
      ae: [{ loose: "re = \"19.2.4\"" }],
    }, },
  // DROPPED: Mt->Mt textStaysSecondaryClass (view-tabs cdsStaysSecondaryTextClass); Q->Ln useIsomorphicLayoutEffect (view-tabs useCdsIsoLayoutEffect); Jm->qh inertProps (view-tabs inertProps); Oo resolveIconSize (gone); Yn->Tr guardedMutationObserver (view-tabs useLazyMutationObserver); aa->ga sizeAttribute (view-tabs cdsSizeAttributes); bu->ud ownerResizeObserver (view-tabs elementResizeObserverClass); Jn->wr guardedResizeObserver (view-tabs useLazyObserver); Ya->so useRootOwnerWindow (view-tabs useCdsOwnerWindow); ph->fg useClickToFocus (view-tabs useClickToFocus); Z useCdsLabel (gone); ch surfaceFocusShadowStyle (gone); Dn useMergedRefCallback (gone); Ms->lc useIsMac (view-tabs useIsMacPlatform); vr useFizzyLakePart (gone); wn->On useEventCallbackRef (view-tabs useLatestCallback); lc->Uc elementOrNull (view-tabs asElementNode); Js->Dc ariaKeyShortcuts (view-tabs ariaKeyShortcuts); dd->af CdsSkeleton (view-tabs CdsSkeleton); ja useRootDensity (gone); Jd->Uf useLayerAwareZIndex (view-tabs useCdsLayerAwareZIndex); an subscribePointerMedia (view-tabs subscribeInputMediaChanges) and tn prefersTouch (view-tabs matchesCoarseOrHoverlessPointer), published by w2-routines-shared (D46); rn->If isFinePointerHost (view-tabs canFocusComposerOnClick, published by w3-code-routines; chat-composer-attachments imports it from there)
  // w12-viewtabs (D1): aa ownerWindowOf and wh prefersReducedMotion are view-tabs cdsNodeOwnerWindow / prefersReducedMotion
  // now (published in W12), so they are imported from there instead of rooted here.
  { target: "chat-composer-frame.mjs", source: "shared-frame-6jtSkIit.js", viewTabsSame: true, oneCopy: true,
    exports: { Fn: "textDirectionOf", Pt: "afterFontsReady", sg: "useSurfaceFocusShadowStyle", Wo: "useResolvedIconSize", Jh: "isRenderable", Na: "useRootNaturalImageTiles", Dn: "useOptionalEventCallback", Xf: "isTextarea", Ao: "rootRemPx", qf: "isDomNode", Jf: "isHtmlElement", no: "isSurfaceToken", Zh: "afterAnimationsSettle", Ff: "dropScrimLayer", Qh: "isUnfocusedFrame", dn: "swallowEnterAfterFocusMove", Uh: "clickModifierSource", hn: "sanitizeLabelText", gn: "collapseControlText", _n: "isBlankLabelText", vn: "trimLeadingInvisible", yn: "tooltipSafeText" },
    officialExports: { Fn: "vf", Pt: "Uf", sg: "Ol", Wo: "ld", Jh: "Pl", Na: "Md", Dn: "Cf", Xf: "iu", Ao: "dd", qf: "nu", Jf: "eu", no: "xd", Zh: "Nl", Ff: "au", Qh: "Ml", dn: "Nf", Uh: "Bl", hn: "jf", gn: "Af", _n: "Df", vn: "Mf", yn: "kf" },
    features: {
      Fn: ["/\\p{L}/u.exec(e)?.[0]", "? \"rtl\" : \"ltr\""], Pt: ["e?.fonts?.ready", "t.then(i, i)"],
      sg: ["\"--cds-focus-shadow\":", "\"--cds-focus-shadow-danger\":"], Wo: [{ loose: "t = e === void 0 ? Ho : e" }, { loose: "K2($, 0, t, n, Vo(t, n))" }],
      Jh: ["e != null && typeof e != \"boolean\""],
      Na: [{ loose: "return W(xa) ?? !1;" }],
      Dn: ["return e === void 0 ? void 0 : n;"],
      Xf: ["e.localName === \"textarea\""],
      Ao: [{ loose: "typeof document > \"u\" ? 16 : mo(po())" }],
      qf: ["typeof e?.nodeType == \"number\""],
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
  { target: "chat-composer-presence.mjs", source: "shared-5-Bg6ZMqvt.js", oneCopy: true,
    exports: { Wd: "Presence", bd: "lazyPresenceMotion" },
    officialExports: { Wd: "Hl" },
    features: {
      Wd: [{ loose: "Object.assign(gm, { Div: bm(\"div\"), Span: bm(\"span\") })" }, "Div:", "Span:"],
      bd: ["bd = null"],
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
export async function extractCodeComposer({ check = false, dry = false } = {}) {
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
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractCodeComposer({ check: process.argv.includes('--check'), dry: process.argv.includes('--dry') });
