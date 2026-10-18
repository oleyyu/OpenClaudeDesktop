// R3b-transcript: extract the 2.42304.0 transcript pieces this lane wires into the local Code transcript, without
// executing any desktop runtime (decision D0: own generator, own output folder src/generated/r3b-transcript, own
// scripts/verify-gen-r3b-transcript.mjs).
//
//   transcript-03  cf74bc599 Nv: the hook a floating card uses to publish its bottom edge on the nearest
//                  [data-epitaxy-transcript-region] (or its parent) as --epitaxy-suggested-task-end /
//                  --epitaxy-sticky-prompt-end; shared-25 pp (the element window's ResizeObserver) it reads.
//   cov1-06        c89efce1a jc: the streaming Markdown table's column-width freeze, with Ac (re-measure stride
//                  min(16, max(1, floor(rows / 16)))) and its tolerances.
//   transcript-v01 c4a9ee384 ap/ip/op/cp: the per-row crash boundary ("TranscriptRow"), its WarningCircle Banner
//                  fallback with Try again, and the __gb__3525173228 gate pinned per view; shared-26 kl/Dl/Tl (the
//                  render-error boundary it extends and its sanitizer), shared-0 vE/gE/xS (chunk-load
//                  classification and stack carry-over) and c05b96c7f sl (the row-crash copy).
//   cov2-05        cf74bc599 Wv: the "Session not found on disk" empty state (Archive hidden once the session is
//                  archived), over cc0a875c8 f (EmptyState) and c81ea1931 e (the mouse-down guard).
//   toolcards-06/07 (step 2) c96d752d0 N2e/M2e: the Turn edits card with its 'See all' form (gu() =
//                  claudeai_cc_epitaxy_session_presets_main) and the per-row stop of S0 ('outside_roots', the session's
//                  links block, 'plain'); the c856385e2 session file contexts it reads (W/X/Gt/xt/J with their
//                  providers) and Bn (the blocked-file reason); c425fb3cf G/W/Q/V/re (summary card list, divider,
//                  disclosure caret, card classes) plus the card text CSS that chunk injects; shared-52 n_, shared-28 HO,
//                  c219730b0 nn, c19ad462c (session output files) and shared-9 cg (the file icon name).
//   toolcards-16   (step 2, not applicable here) only pinned: c96d752d0 ZM's runningIds hold lives in the
//                  turnStatusRows branch of v2e (c26fb8b6b We, __gb__2846116625, or the next renderer's forced
//                  provider), which this host does not render; the classic branch keeps uM's 650 ms hold.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. An import (or a same-chunk
// binding) resolves, in this order, to: a named host adapter in src/source-r3b-transcript-adapters.jsx (feature-checked
// against the original it replaces), a verified React export of vendor-frame, a semantic public name of the shared
// view-tabs graph (D1: CdsButton / CdsIcon exist once, in src/generated/view-tabs), or another module generated here.
// Nothing else is accepted.
//
// `callSites` pins the original text the host wiring follows but cannot import (the suggested-task card, the table
// renderer, the feed's row wrapper u9 / d9 and the session pane's Wv branch), so a version bump that changes them
// stops here.
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
const output = path.join(root, 'src/generated/r3b-transcript');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-r3b-transcript-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], bo: ['react', 'useMemo'],
    yo: ['react', 'useLayoutEffect'], oo: ['react', 'memo'], qa: ['react', 'Component'], Ba: ['react', 'Fragment'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
    eo: ['react', 'createContext'], lo: ['react', 'use'], do: ['react', 'useContext'],
  },
};
// Host dependencies (checked first). `features` must appear in the same-chunk closure of the original binding.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useIntl', features: ['[React Intl]'] },
    l: { name: 'FormattedMessage', features: ['textComponent'] },
  },
  'shared-frame-BfjMqbuN.js': {
    // Ya (exported mu): the CDS layer's owner window, `Ji(W(Oa))`. This host renders every window's own React root
    // and mounts no layer element in another window, so the answer is the current window (Ji's fallback).
    mu: { name: 'useLayerOwnerWindow', features: ['return Ji(W(Oa));', 'e?.ownerDocument.defaultView ?? globalThis.window'] },
    // gT (exported oa): the CDS Banner. Its details path needs base-ui Collapsible (vendor-frame Vh/jh/kh), which the
    // view-tabs graph does not publish; the host replica covers the icon + children + action layout the row-crash
    // fallback uses and refuses details / dismiss / composer calibration. The features pin every class it copies.
    oa: { name: 'CdsBanner', features: [
      '"data-cds": "Banner"', '"data-prose-box": ""', '"data-icon-layout": B ? "first-line" : "centered"',
      '"data-cta-layout": R ? "stacked" : ie ? "wrapped" : "inline"', '"data-action-align": I ? "center" : "first-line"',
      'O = u ?? (D ? "none" : "status")', '"gap-xs py-md font-sans text-body font-normal break-words"', 'C ? "px-md" : "px-lg"',
      'ie && !R && "pb-lg"', 'C ? eh : "rounded-card"',
      'neutral: "bg-surface-1 text-primary shadow-card-ring [--cds-prose-code-color:var(--cds-text-danger)] [--cds-prose-marker-color:var(--cds-text-secondary)]"',
      'warning: "bg-warning text-warning shadow-ring-warning [--cds-prose-code-color:currentColor] [--cds-prose-marker-color:currentColor]"',
      'danger: "bg-danger text-danger shadow-ring-danger [--cds-prose-code-color:currentColor] [--cds-prose-marker-color:currentColor]"',
      'warning: "stacks:bg-page stacks:layers-1-warning stacks:shadow-none"', 'danger: "stacks:bg-page stacks:layers-1-danger stacks:shadow-none"',
      'fT = { neutral: "text-secondary", warning: "", danger: "" }', 'hT = { neutral: "Info", warning: "Warning", danger: "Warning" }',
      'B ? "flex min-h-[1lh] shrink-0 items-center" : "shrink-0"', 'w ? t : H(Jo, { name: hT[x], size: "auto" })',
      '"flex min-w-0 flex-wrap"', 'I ? "items-center" : "items-start"', '"gap-y-sm gap-x-md flex-1"', '"max-w-full min-w-0 flex-auto"',
      '"flex shrink-0 items-center gap-xs"', 'cT = "min-h-control my-[calc((1lh-var(--cds-h-control))/2)]"', '!ie && cT',
      '!ie && "-ms-[2px]"', '!C && !c && "-me-[calc(var(--cds-pad-md)-2px)]"', 'sT = { comfortable: "sm", compact: "base" }',
      'b = { "data-step": ca(v, sT[v]) }', 'oa = { compact: 2, comfortable: 4 }', 'sa = { xs: -2, sm: -1, base: 0, lg: 1 }',
      'let o = re ? i >= a.bottom - 1 : i - a.top > r / 2;', 'Number.parseFloat(getComputedStyle(t).lineHeight)', 'e?.ownerDocument.defaultView?.ResizeObserver',
    ] },
    // Qp (exported Ec): the CDS disabled-reason wrapper (a CdsTooltip over a focusable span that carries the reason in a
    // hidden described-by span). view-tabs does not publish it; the host replica copies Uc / Yc / Vc / dc, pinned here.
    Ec: { name: 'CdsDisabledReason', features: [
      'multiline: i = !0,', 'content: Wc(e) ? e : void 0,', 'closeOnClick: !1,', 'openOnHandedBackFocus: !0,', 'children: [u, H(Yc, { id: d, reason: e })],',
      'tabIndex: r ? 0 : -1,', '"aria-describedby": r ? t : void 0,', '"data-cds-disabled-reason-wrapper": "",', 'className: X("inline-flex", Vc, n),',
      'Vc = `rounded outline-none focus-visible:outline-hidden [&[data-initial-focus]:focus]:outline-hidden transition-shadow duration-fast ${dc}`',
      'dc = "focus-visible:shadow-focus [&[data-initial-focus]:focus]:shadow-focus"', 'Jc = "data-cds-disabled-reason"', 'hidden: !0,',
    ] },
    // Qw (exported ca): the CDS Collapsible { Root, Trigger, Panel }. The Turn edits card reads it only in its embedded
    // form, which this host never mounts; the adapter refuses to render.
    ca: { name: 'CdsCollapsible', features: ['Root: qw,', 'Trigger: Xw,', 'Panel: q('] },
  },
  // vendor-frame Td (exported Wn): base-ui useDirection, `N(wd)?.direction ?? "ltr"` over DirectionContext (view-tabs
  // publishes the context, not the hook). Pinned on the raw bytes: vendor-frame is not scope-analysed.
  'vendor-frame-DfPJ1QmD.js': { Wn: { name: 'useDirection', local: 'Td', rawFeatures: ['function Td(){return N(wd)?.direction??"ltr"}'] } },
  // c03935b01 gc / _c / Q (exported ft / mt / pt): the session pane store (getState().openDiffPane, the store context,
  // a selector such as hasSidePanes). Here the Changes pane is the host's (main.jsx setPanel), answered from
  // TurnEditsHost.
  'c03935b01-CyJKQj4N.js': {
    ft: { name: 'usePaneStoreState', features: ['return (f(Z) ?? fc).getState();'] },
    mt: { name: 'usePaneStoreContext', features: ['return f(Z);'] },
    pt: { name: 'usePaneStore', features: ['return Ye(t ?? fc, e);'] },
  },
  // shared-11 Qo (exported do): the claudeai_cc_epitaxy_session_presets_main gate. Decision D10: this host follows its
  // "on" branch.
  'shared-11-BuQ3CK5I.js': { do: { name: 'useSessionPresetsMain', features: ['return N(Zo);', 'Zo = "claudeai_cc_epitaxy_session_presets_main"'] } },
  // cc6e9624e v (exported l): [groups[key] ?? initial, setGroupExpanded] on the session's tool expansion store. Here
  // that store is tool-group-expansion.mjs toolGroupExpansion, keyed by session (the row Try again forgets it).
  'cc6e9624e-Dw5fc5HL.js': { l: { name: 'useToolGroupExpanded', features: ['n.groups[e] ?? t', 'i.getState().setGroupExpanded(e, t);'] } },
  // c280f9bbb B (exported t): the file type icon. Its icon-set branch needs GrowthBook __gb__2954460583 (unknown here,
  // so off) and a fetched icon JSON; the off branch is CdsIcon named by shared-9 cg (generated file-icon-name.mjs).
  'c280f9bbb-Dw5U-PIG.js': { t: { name: 'FileTypeIcon', features: [
    'F = "__gb__2954460583"', 'h = m(c(t))', 'if (_ === null && s !== void 0) return s;',
    'e(l, { name: h, size: i, className: a })', 'e(l, { name: h, size: "auto", className: a })',
  ] } },
  // c856385e2 On (exported i): the transcript file path context menu. This host's menu is source-transcript.jsx's
  // delegated [data-file-ref] menu (n_ surface "transcript"); the adapter marks the trigger with the path.
  'c856385e2-DVsjb2QL.js': { i: { name: 'FilePathMenu', features: ['trigger: i,', 'disabled: !l,', 'surface: r,'] } },
  // shared-0 LA (exported Ju): the render-error report to the desktop's error telemetry. This host sends no telemetry
  // (D17); the adapter records nothing.
  'shared-0-ByI5P0CP.js': { Ju: { name: 'reportRenderError', features: ['L(RA, I.O11Y_INTERNALS)', 'is_chunk_load_error: U(() => vE(e)) ?? !1'] } },
  // c3320899b i (exported n): a GrowthBook value pinned for one view (`viewKey`). This host has no GrowthBook; the adapter
  // answers the host's own value for the flag (source-r3b-transcript-adapters.jsx HOST_FLAGS).
  'c3320899b-D2hx0jCW.js': { n: { name: 'useViewPinnedFlag', features: ['viewKey: t', 'pinned === null', 'n(e, r && i.pinned === null)'] } },
  // shared-78 uV (exported Gs): "history may have expired under your organization's retention policy" (GrowthBook
  // __gb__2142364912 + org match). No organization or retention policy exists here: false.
  'shared-78-D6VXYXaQ.js': { Gs: { name: 'useRetentionMayHaveExpired', features: ['Ri("__gb__2142364912")', '=== "another"'] } },
  // shared-104 Dz (exported a): preload handlers for a lazy dialog trigger. No lazy dialog chunks here: no handlers.
  'shared-104-Cqo2-vQh.js': { a: { name: 'useDialogPreloadProps', features: ['e?.preload("intent")', 'onPointerEnter: t, onFocus: t, onPointerDown: t'] } },
  'shared-20-B7UqYfsi.js': {
    // Ib (exported Di): the desktop bridge's importAllCliSessions. This host has no Claude Code CLI session import.
    Di: { name: 'useCliSessionImport', features: ['!!V?.importAllCliSessions'] },
    // Ub (exported Oi): opens that import for the acting window (unreachable while Di answers false).
    Oi: { name: 'openCliSessionImport', features: ['submitAction', 'actingWindow: e'] },
    // Xb (exported Ti): the lazy epitaxy_cli_import_dialog descriptor whose `.handle` Dz preloads.
    Ti: { name: 'cliImportDialog', features: ['id: "epitaxy_cli_import_dialog"', 'pick: (e) => e.EpitaxyCliImportDialogBody'] },
  },
  // c73f45bc3 Ec (exported tr): after an archive or delete, leave the removed session (onSessionRemoved wins).
  'c73f45bc3-CFrHin0p.js': { tr: { name: 'useSessionRemoved', features: ['sessionId: e, onSessionRemoved: t', 't ? t(o)'] } },
  // c48ea26ad Ao (exported o): the session's archive / delete actions with their pending states.
  'c48ea26ad-B9mFPusd.js': { o: { name: 'useSessionArchiveDelete', features: ['archiveSession: l,', 'deleteSession: t(async () => {', 'isArchiving: u,', 'isDeleting: f,'] } },
};
// Same-chunk declarations answered by the host (the declaration itself must carry `features`).
const chunkAdapters = {
  'c96d752d0-BOCqU7c2.js': {
    // s0: the Turn edits summary of a turn's transcript entries (their tool runs, sG / Aye). This host's edits are
    // Codex fileChange items, summarised by turn-edits-model.mjs turnEdits(); the adapter takes that summary.
    s0: { name: 'turnEditsSummary', features: ['for (let e of sG(a, t).runs)', 'soleVisibleEditToolRow: n.size === 1 && r === 1 && i,'] },
    // P2e: the claude.ai artifact row's label and opener (SZ). No artifacts here; never shown (artifactPage is unset).
    P2e: { name: 'useArtifactPageLink', features: ['i = SZ(r, t);', 'defaultMessage: "Untitled artifact",'] },
  },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original text.
const modules = [
  // shared-25 pp (exported Nf): the element window's ResizeObserver, else the global one.
  { target: 'owner-resize-observer.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { pp: 'ownerResizeObserver' },
    features: { pp: ['up(e)?.ResizeObserver ?? globalThis.ResizeObserver'] } },
  // cf74bc599 Nv: publish the element's bottom edge (plus an offset) on the transcript region as a CSS variable.
  { target: 'transcript-region-edge.mjs', source: 'cf74bc599-D9NZWRyl.js',
    exports: { Nv: 'useTranscriptRegionEdge', jv: 'SUGGESTED_TASK_END', Mv: 'STICKY_PROMPT_END', ab: 'SUGGESTED_TASK_EDGE_OFFSET' },
    features: {
      Nv: ['i?.closest("[data-epitaxy-transcript-region]") ?? i?.parentElement', 'i.getBoundingClientRect().bottom - a.getBoundingClientRect().top + n',
        'a.style.getPropertyValue(e) !== t && a.style.setProperty(e, t)', 'a.style.removeProperty(e)', '[e, t, n]'],
      jv: ['"--epitaxy-suggested-task-end"'], Mv: ['"--epitaxy-sticky-prompt-end"'], ab: ['ab = 12'],
    } },
  // c89efce1a jc: freeze the header cells' min-width while the table streams; Ac the re-measure stride.
  { target: 'table-column-freeze.mjs', source: 'c89efce1a-8S3RzgR0.js', exports: { jc: 'useTableColumnFreeze', Ac: 'tableRemeasureStride' },
    features: {
      jc: ['t?.tHead?.rows[0]?.cells', '(a.current = { rows: l, tail: u }), d && d.rows === l && d.tail === u', 'f && l > 1 && !p && l - f.rows < Ac(f.rows)',
        'Math.abs(e - _[t]) > Math.max(Ec, Dc * _[t])', '[e, t]'],
      Ac: ['Math.min(kc, Math.max(1, Math.floor(e / Oc)))'],
    } },
  // vendor-intl tn (exported f): react-intl defineMessages, the identity.
  { target: 'define-messages.mjs', source: 'vendor-intl-Db7hDWRO.js', exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  // c05b96c7f sl (exported Tn): the row-crash copy.
  { target: 'row-crash-messages.mjs', source: 'c05b96c7f-DklIyA-P.js', exports: { sl: 'transcriptRowCrashMessages' },
    features: { sl: ['defaultMessage: "Couldn\\u2019t load this.", id: "vHA8qpGWmW"', 'defaultMessage: "This response didn\\u2019t load.",', 'id: "qlw7hIBZl4"',
      'retry: { defaultMessage: "Try again", id: "FazwRldA7z" }'] } },
  // shared-0 vE (exported np): a chunk-load failure; gE (exported rp): the literal it matched.
  { target: 'chunk-load-error.mjs', source: 'shared-0-ByI5P0CP.js', exports: { vE: 'isChunkLoadError', gE: 'chunkLoadErrorLiteral' },
    features: { vE: ['e.name === "ChunkLoadError"'], gE: ['mE.find((e) => (e === pE ? t.includes(e) : n.startsWith(e)))'] } },
  // shared-0 xS (exported Pp): carry the original error's stack frames over to its sanitised stand-in.
  { target: 'error-stack.mjs', source: 'shared-0-ByI5P0CP.js', exports: { xS: 'withOriginalStack' }, features: { xS: ['let { headed: n, frames: r } = SS(e);'] } },
  // shared-26 kl (exported Vp): the render-error boundary (fallback(error, reset), resetOn, terminalFallback after
  // three recommits); Dl (exported Hp) its message sanitizer factory; Tl (exported Up) the render-error class.
  { target: 'render-error-boundary.mjs', source: 'shared-26-CgdP_nTj.js',
    exports: { kl: 'RenderErrorBoundary', Dl: 'renderErrorSanitizer', Tl: 'renderErrorClass' },
    features: {
      kl: ['static getDerivedStateFromError(e) {', 'e.resetOn !== this.props.resetOn', 'return typeof r == "function" ? r(e, this.reset) : r;',
        'source: "render_error_boundary"', 'return this.props.terminalFallback ?? null;'],
      Dl: ['Error(n === void 0 ? `${e}: ${t.name}` : `${e}: ${t.name}: ${n}`)'], Tl: ['return wl(e)?.cls;'],
    } },
  // c4a9ee384: ap (exported u) the row boundary, op its fallback, cp (exported l) the per-view gate, sp the flag.
  { target: 'transcript-row-boundary.mjs', source: 'c4a9ee384-ZZIKqgNM.js',
    exports: { ap: 'TranscriptRowBoundary', op: 'TranscriptRowCrashed', cp: 'useTranscriptRowBoundaryGate', sp: 'TRANSCRIPT_ROW_BOUNDARY_FLAG' },
    features: {
      ap: ['componentName: "TranscriptRow"', 'tags: { surface: t, rows: "classic" }', 'e !== null && e.shown === r && performance.now() - e.at < ep',
        'if (oe(t)) throw t;', '((s.current = { at: performance.now(), shown: r }), i?.(), n());'],
      op: ['"data-transcript-row-crashed": e', 'className: "py-sm"', 'icon: d(Ve, { name: "WarningCircle", size: "auto" })', 'variant: "secondary"',
        '?.closest("[data-transcript-row-crashed]")', 'e?.focus({ preventScroll: !0 })', 'r.formatMessage(e === "reply" ? ln.reply : ln.part)'],
      cp: ['a = Qt(sp, e, n && i === void 0)', 'n && !lp.has(r) && lp.set(r, o)'], sp: ['"__gb__3525173228"'],
    } },
  // cc0a875c8 f (exported t): the CDS EmptyState; d (exported n) its icon.
  { target: 'empty-state.mjs', source: 'cc0a875c8-DJjH3aQ_.js', exports: { f: 'EmptyState', d: 'EmptyStateIcon' },
    features: { f: ['className: r', 'role: g', 'i && t("p", { className: o, children: i })', 'm && t("div", { className: l, children: m })'],
      d: ['size: "lg", className: i'] } },
  // c81ea1931 e (exported t): keep focus where it is on a button press.
  { target: 'prevent-mouse-down.mjs', source: 'c81ea1931-ChuE7vym.js', exports: { e: 'preventMouseDown' }, features: { e: ['return e.preventDefault()'] } },
  // cf74bc599 Wv: the unavailable-transcript empty state.
  { target: 'transcript-unavailable.mjs', source: 'cf74bc599-D9NZWRyl.js', exports: { Wv: 'TranscriptUnavailable' },
    features: { Wv: ['defaultMessage: "Earlier messages may have expired"', 'defaultMessage: "Session not found on disk"',
      'defaultMessage: "Send a message to start fresh in this directory."', 'defaultMessage: "Import CLI sessions"',
      'n && !d ? null', 'variant: m ? "ghost" : "secondary"', 'busy: d,', 'busy: f,', 'defaultMessage: "Archive session"', 'defaultMessage: "Delete session"',
      'c_({ sessionRef: e, sessionTitle: t, afterRemoval: s })', 'pg({ sessionId: e.id, onSessionRemoved: r })'] } },
  // c425fb3cf (step 2): G the summary card list, W its divider, Q the disclosure caret, V / re the card classes (re
  // is the See-all form's, with epitaxy-summary-card-control-text; inlineStyles carries that class's CSS).
  { target: 'summary-card.mjs', source: 'c425fb3cf-CEgSkv8l.js',
    exports: { G: 'SummaryCardList', W: 'SummaryCardDivider', Q: 'DisclosureCaret', V: 'SUMMARY_CARD_CLASS', re: 'SUMMARY_CARD_SEE_ALL_CLASS' },
    features: {
      G: ['role: "list",', 'className: "flex w-full min-w-0 flex-col",'], W: ['className: "-mx-[calc(var(--cds-pad-md)-1px)] h-px shrink-0 bg-alpha-2",'],
      Q: ['customSize: 14,', '`transition-transform duration-fast motion-reduce:transition-none ${e ? "rotate-90" : ""}`'],
      V: ['"flex w-full select-text flex-col gap-1 rounded-lg px-md py-xs shadow-[inset_0_0_0_1px_var(--cds-border)]"'],
      re: ['"epitaxy-summary-card-control-text flex w-full select-text flex-col gap-1 rounded-card px-md py-xs shadow-[inset_0_0_0_1px_var(--cds-border)]"'],
    } },
  // shared-52 n_ (exported wd): a path's last segment.
  { target: 'file-basename.mjs', source: 'shared-52-DGviI8xb.js', exports: { n_: 'fileBasename' },
    features: { n_: ['Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\\\"))'] } },
  // shared-26 (exported ac / nc / tc): a Windows path test, the drive prefix and the UNC prefix shared-28 HO reads.
  { target: 'windows-path.mjs', source: 'shared-26-CgdP_nTj.js', exports: { Jb: 'isWindowsPath', Wb: 'WINDOWS_DRIVE', Gb: 'WINDOWS_UNC' },
    features: { Jb: ['return Kb(e) || qb(e);'], Wb: ['Wb = /^[A-Za-z]:[\\\\/]/'], Gb: ['Gb = /^(?:[\\\\/]{2}|[\\\\/]\\?\\?[\\\\/])/'] } },
  // shared-28 HO (exported Kn): a path with normalised separators, relative to a root when one is given.
  { target: 'relative-path.mjs', source: 'shared-28-DcgD7xXH.js', exports: { HO: 'relativePath' }, features: { HO: ['if (!t) return r;'] } },
  // c219730b0 nn (exported T): the muted action text classes the Undo button starts from.
  { target: 'muted-action-class.mjs', source: 'c219730b0-B08P7Rqk.js', exports: { nn: 'MUTED_ACTION_CLASS' },
    features: { nn: ['nn = "text-muted hover:text-secondary"'] } },
  // c19ad462c: the session's output files (path -> task id) context; empty unless provided.
  { target: 'session-output-files.mjs', source: 'c19ad462c-Z3P--eUg.js', exports: { n: 'SessionOutputFilesContext', r: 'useSessionOutputFiles' },
    features: { n: ['e(new Map())'], r: ['return t(n);'] } },
  // shared-2 jq (exported Rt): an extension's own CDS icon name (Aq), else undefined.
  { target: 'file-icon-override.mjs', source: 'shared-2-Cb74JByF.js', exports: { jq: 'fileIconOverride' },
    features: { jq: ['return t && Object.hasOwn(Aq, t) ? Aq[t] : void 0;'] } },
  // shared-6 Yk (exported Va) and shared-104 dP / jP (exported Vn / ir): the extension tables shared-9 og reads.
  { target: 'source-extensions.mjs', source: 'shared-6-Cby4X-ms.js', exports: { Yk: 'SOURCE_EXTENSIONS' },
    features: { Yk: ['"js.jsx.gs.ts.tsx.py.rb.go.rs.c.cpp.h.hpp.java.kt.swift.sh.bash.zsh.json.yaml.yml.toml.xml.html.css.scss.sql.graphql.proto.lua.r"'] } },
  { target: 'file-kind-tables.mjs', source: 'shared-104-Cqo2-vQh.js', exports: { dP: 'RASTER_IMAGE_EXTENSIONS', jP: 'HIGHLIGHT_LANGUAGES' },
    features: { dP: ['dP = ["png", "jpg", "jpeg", "gif", "bmp", "webp"]'], jP: ['"python.javascript.typescript.java.csharp.go.rust'] } },
  // shared-9 cg (exported Y): the CDS icon name of a file name.
  { target: 'file-icon-name.mjs', source: 'shared-9-D7uuiUv7.js', exports: { cg: 'fileIconName' }, features: { cg: ['t === "skill" ? sg.skill'] } },
  // c856385e2: the session's file access contexts the Turn edits card reads — W the Files opener (st its provider), X the
  // Changes diff opener (Ht), Gt where the diff places a path (Wt), Y the read refusal (yt), xt "outside this session's
  // folders" over them, J the session's links block (vt) — and Bn, the reason a file cannot be opened.
  { target: 'session-file-access.mjs', source: 'c856385e2-DVsjb2QL.js',
    exports: { W: 'useSessionFileOpener', st: 'SessionFileOpenerProvider', X: 'useDiffOpener', Ht: 'DiffOpenerProvider', Gt: 'useDiffPlacement',
      Wt: 'DiffPlacementProvider', yt: 'ReadRefusalProvider', xt: 'useOutsideRootsCheck', J: 'useSessionLinksBlock', vt: 'SessionLinksBlockProvider',
      Bn: 'SessionFileBlock',
      // Read by the transcript rows area's file link (c856385e2 In / Rn / Ln, extract-transcript-rows.mjs links this module
      // instead of slicing the contexts a second time): Y the read refusal context, Ut the diff placement context, Kt the
      // placement while a refusal exists, bt "outside the session's folders".
      Y: 'ReadRefusalContext', Ut: 'DiffPlacementContext', Kt: 'useDiffPlacementWhenRefusing', bt: 'isOutsideRoots' },
    features: {
      Y: ['Y = c(null)'], Ut: ['Ut = c(null)'], Kt: ['return e === null ? null : l(Ut);'], bt: ['if (t === null) return !1;'],
      W: ['return l(ot);'], st: ['st = ot.Provider'], X: ['return l(Vt);'], Ht: ['Ht = Vt.Provider'], Gt: ['return l(Ut);'], Wt: ['Wt = Ut.Provider'],
      yt: ['yt = Y.Provider'], J: ['return l(_t);'], vt: ['vt = _t.Provider'],
      xt: ['(a, o) => e !== null && bt(a, n, i, o && t !== null ? r : null),'],
      Bn: ['e === "outside_roots"', 'defaultMessage: "This file is outside this session\\u2019s folders, so it can\\u2019t be opened here.",',
        '"inline rounded-sm focus-visible:outline-hidden focus-visible:shadow-focus",'],
    } },
  // c96d752d0 N2e (memo M2e): the Turn edits card; S0 a file row's stop, F2e a file row's opener, A2e the folder hints
  // of repeated file names (exported for tests).
  { target: 'turn-edits-card.mjs', source: 'c96d752d0-BOCqU7c2.js', exports: { N2e: 'TurnEditsCard', S0: 'useTurnEditStop', F2e: 'useTurnEditFileOpener', A2e: 'turnEditFolderHints' },
    features: {
      N2e: ['N2e = M(M2e)'],
      S0: ['if (e(i, !0)) return "outside_roots";', 'if (t === null && n?.(i) === !1) return r ?? "plain";'],
      F2e: ['!t && !n', 'if (!t?.(r)) {'],
      A2e: ['let t = bie(e.path, void 0),', 'detail: n < 0 ? void 0 : t.slice(0, n) || "/",'],
    } },
];
// Original text the host wiring follows but cannot import. Each feature must appear in the whitespace-normalised
// declaration; each import must still resolve to the named declaration of the named chunk.
const callSites = [
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'lb', role: 'Suggested task card: title clamp 6, bottom edge published while shown',
    features: ['me = k && D', 'ge = Nv(jv, me, ab)', 'ref: ge', 'absolute top-[12px] inset-x-0', '"text-body text-primary break-words line-clamp-6"',
      '`text-footnote text-secondary break-words ${C ? "line-clamp-6" : "line-clamp-3"}`'] },
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'Uv', role: 'Sticky prompt bubble: the other publisher of the region edge (not in this host)',
    features: ['w = Nv(Mv, C, 0)'] },
  { source: 'c89efce1a-8S3RzgR0.js', binding: 'Mc', role: 'Markdown table: the freeze hook reads the streaming flag and the rows',
    features: ['s = jc(Ze(), t)', 'c("table", { ref: s,'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'u9', role: 'Feed row wrapper: reply for assistant rows, row otherwise',
    features: ['e ? b(jce, { kind: t.kind === "assistant" || t.kind === "assistantItem" ? "reply" : "row", surface: n, tagsOf: t9, resetOn: r, onRetry: i, children: a, }) : a'],
    imports: { jce: ['c4a9ee384-ZZIKqgNM.js', 'ap'] } },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'd9', role: 'Row retry: forget the session tool expansion',
    features: ['(eS(e), t !== null && axe(t))'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'f9', role: 'Code feed: gate per session, resetOn = the row is the live tail',
    features: ['gt = Vd(i, !$e)', '_t = d9(qe.toolExpansionStore, i)', 'S = t.kind === "loader" ? r : r && f',
      'u9( gt, t, e.codesOwnView === !0 ? "code" : "code_feed", S, _t,'],
    imports: { Vd: ['c4a9ee384-ZZIKqgNM.js', 'cp'] } },
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'Xx', role: 'Session pane: Wv when the transcript is unavailable',
    features: ['T?.transcriptUnavailable && t ? u(Wv, { sessionRef: t, title: T.title, isArchived: T.isArchived === !0, onSessionRemoved: d, })'] },
  // Step 2, toolcards-06/07: where the card mounts and what feeds it.
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'v2', role: 'Turn edits card gate: claudeai_cc_epitaxy_turn_edits_card, not under a turn summary block',
    features: ['l = fe("claudeai_cc_epitaxy_turn_edits_card")', 'd = l && !u'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'p2', role: 'Turn edits card row: data-find-omitted contents, at the finished turn tail; Undo only for the last entry',
    features: ['u = o && !s && a && !r && e.synthetic !== !0', '"data-find-omitted": ""', 'className: "contents"', 'sessionRef: i ? t : void 0'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'C0', role: 'Turn edits card: hidden when the edit is the turn\'s sole visible edit row (o0)',
    features: ['return o0(a, n)', 'b(L2e, {'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'I2e', role: 'Undo: sends C2e as the next message (host: main.jsx sendUndoTurn with undoTurnText)',
    features: ['qb("turn_edits_undo")', 'text: C2e(t)'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'C2e', role: 'Undo message text (host: turn-edits-model.mjs undoTurnText, in the UI language)',
    features: ['`Undo the changes you made to ${t[0]} in your last turn and restore it to its previous state.`',
      '`Undo the changes you made to these ${t.length} files in your last turn and restore them to their previous state:`'] },
  // Step 2, toolcards-16 (not applicable): the runningIds hold and the branch it lives in.
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'ZM', role: 'Running mark: runningIds keep the mark across wire gaps (turnStatusRows candidates only)',
    features: ['s = e?.runningIds?.some(a) ?? !1', 'u = s || (r === !0 && e !== void 0 && !e.wireRunning && c === e.key)', 'tailHeld: p && !o && !u'],
    imports: { xv: ['cb6930dae-BD0W5ZM9.js', 'Ya'], tv: ['cb6930dae-BD0W5ZM9.js', 'Ra'], av: ['cb6930dae-BD0W5ZM9.js', '_o'] } },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'v2e', role: 'Tool group: the candidate (with runningIds) exists only under turnStatusRows; classic keeps uM 650 ms',
    features: ['ye = m_()', 'He = uM(Ve, 650, ye ? cv : void 0)', 'runningIds: e.flatMap((e) => e.status === "running" ? [e.id] : [],', 'if (ye) {',
      'b(XAe, { candidate: F,', 'morphKey: nt ? Ue : "settled"'],
    imports: { m_: ['c26fb8b6b-DfPeiuGP.js', 'We'] } },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'uM', role: 'Held key: each shown key stays at least t ms (no rest key in the classic branch)',
    features: ['i = Math.max(t - r, f ? u - (n - (v.current ?? n)) : 0);'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'nat', role: 'Next renderer feed: forces turnStatusRows on',
    features: ['b(p_, { value: !0, children: b(Ga, { children: En }), })'], imports: { p_: ['c26fb8b6b-DfPeiuGP.js', 'Ue'] } },
  { source: 'c26fb8b6b-DfPeiuGP.js', binding: 'He', role: 'turnStatusRows: GrowthBook __gb__2846116625 unless a provider says otherwise',
    features: ['n = f(Ve);', 'value: t ?? n'] },
  { source: 'c26fb8b6b-DfPeiuGP.js', binding: 'Ve', role: 'turnStatusRows flag', features: ['Ve = "__gb__2846116625"'] },
];
// Style text a chunk injects with its `(function (e, t) { … })(id, css)` prelude, written out verbatim as CSS.
const inlineStyles = [
  { source: 'c425fb3cf-CEgSkv8l.js', id: 'cbbd9b21e', target: 'summary-card.css',
    features: ['.epitaxy-root .epitaxy-summary-card-control-text{font-size:var(--cds-font-size-body--own,var(--cds-font-size-body));line-height:var(--cds-leading-body--own,var(--cds-leading-body))}'] },
];

// Chunks parsed as shipped instead of prettier-formatted first (formatting the large ones dominated the check's time).
// Their declarations are still emitted through the final prettier pass, and every feature (roots, chunk adapters,
// call sites) is matched against the prettier form of the one declaration it names (featureText). A chunk that an
// import adapter pins by closure stays formatted.
const rawSources = new Set(['c96d752d0-BOCqU7c2.js', 'c26fb8b6b-DfPeiuGP.js', 'shared-2-Cb74JByF.js', 'shared-6-Cby4X-ms.js',
  'shared-28-DcgD7xXH.js', 'shared-52-DGviI8xb.js', 'c219730b0-B08P7Rqk.js', 'shared-9-D7uuiUv7.js']);
async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const raw = rawSources.has(name);
  const code = raw ? bytes.toString() : await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, ast, exported, program: null, raw, formatted: new Map() };
  cache.set(name, record);
  return record;
}
// The text a declaration's features are matched against: its own text, or for a raw chunk its prettier form.
async function featureText(src, node) {
  const own = src.code.slice(node.start, node.end);
  if (!src.raw) return own;
  if (!src.formatted.has(node)) src.formatted.set(node, await format(node.type === 'VariableDeclarator' ? `var ${own};` : own, { parser: 'babel' }));
  return src.formatted.get(node);
}
// Scope analysis only for the chunks whose closures are walked (the large feed chunk is only read for call sites).
function scoped(src) {
  if (!src.program) babel.traverse(src.ast, { Program(p) { src.program = p; p.stop(); } });
  return src.program;
}

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
// Top-level bindings of the chunk that the declaration reads or writes (`x ??= …` only assigns x, yet needs it).
const declarationDeps = (src, p) => Object.entries(scoped(src).scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
const normalised = text => text.replace(/\s+/g, ' ');

function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = scoped(src).scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of declarationDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
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

// D1: the shared view-tabs graph publishes semantic names for (file, local). A binding it publishes is imported from
// there by that name, never sliced a second time.
async function viewTabsPublic() {
  const manifest = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const byLocal = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) byLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  return byLocal;
}

// A top-level declaration by name without scope analysis (call sites in the large feed chunk).
function topLevelDeclaration(src, name) {
  const hits = [];
  for (const node of src.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push(node);
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push(declarator);
  }
  if (hits.length !== 1) throw Error(`${src.name}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}
function importOf(src, local) {
  for (const node of src.ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const specifier = node.specifiers.find(s => s.local.name === local);
    if (specifier) return { file: node.source.value.replace(/^\.\//, ''), alias: specifier.imported.name };
  }
  throw Error(`${src.name}: ${local} is not an import`);
}

export async function extractR3bTranscript({ check = false } = {}) {
  const cache = new Map();
  const published = await viewTabsPublic();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-r3b-transcript.mjs',
    adapterModule: 'src/source-r3b-transcript-adapters.jsx', modules: [], callSites: [],
  };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const program = scoped(src);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const sibling = local => emitted.find(m => m.spec.source === spec.source && m.spec.exports[local]);
    const viewTab = (file, local, via) => {
      const entry = published.get(`${file}#${local}`);
      return entry ? { from: `../view-tabs/${file}`, name: entry.name, via, kind: 'view-tabs', original: local } : null;
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const owner = sibling(name);
      if (owner) { imports.set(name, { from: `./${owner.spec.target}`, name: owner.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const adapter = adapters[file]?.[alias];
        if (adapter) {
          const dep = await readSource(file, cache);
          const local = dep.exported.get(alias);
          if (!local) throw Error(`${spec.target}: adapter alias ${via} is no longer exported`);
          if (adapter.local !== undefined && adapter.local !== local) throw Error(`${spec.target}: adapter alias ${via} is ${local}, expected ${adapter.local}`);
          // rawFeatures: pinned on the minified bytes (for chunks too large to scope-analyse); features: on the closure.
          assertFeatures(`${spec.target}: adapter ${via} (${local}) raw`, dep.bytes.toString(), adapter.rawFeatures);
          if (adapter.features && dep.raw) throw Error(`${spec.target}: adapter ${via} pins a closure of a raw chunk`);
          if (adapter.features) assertFeatures(`${spec.target}: adapter ${via} (${local})`, closureText(dep, local), adapter.features);
          imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
          return;
        }
        const dep = await readSource(file, cache);
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const shared = viewTab(file, local, via);
        if (shared) { imports.set(name, shared); return; }
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated' });
        return;
      }
      const own = chunkAdapters[spec.source]?.[name];
      if (own) {
        assertFeatures(`${spec.target}: chunk adapter ${spec.source}:${name}`, await featureText(src, p.node), own.features);
        imports.set(name, { from: adapterModule, name: own.name, via: `${spec.source}:${name}`, kind: 'adapter', original: name });
        return;
      }
      const shared = viewTab(spec.source, name, `${spec.source}:${name}`);
      if (shared) { imports.set(name, shared); return; }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, await featureText(src, binding.path.node), spec.features?.[name]);
      await add(name);
    }
    if (!selected.size) throw Error(`${spec.target}: every root is published by view-tabs; drop the module`);
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-r3b-transcript.mjs.\n// Edit the extractor or src/source-r3b-transcript-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
      'performance', 'globalThis', 'getComputedStyle', 'document', 'window', 'Infinity', 'undefined', 'RegExp']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const node = topLevelDeclaration(src, site.binding);
    const text = await featureText(src, node);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    const imports = {};
    for (const [local, [file, expected]] of Object.entries(site.imports ?? {})) {
      const resolved = importOf(src, local);
      const dep = await readSource(resolved.file, cache);
      const target = dep.exported.get(resolved.alias);
      if (resolved.file !== file || target !== expected)
        throw Error(`call site ${site.source}:${site.binding}: ${local} resolves to ${resolved.file}:${target}, expected ${file}:${expected}`);
      imports[local] = `${file}:${resolved.alias} (${expected})`;
    }
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(text), features: site.features, imports });
  }
  manifest.inlineStyles = [];
  for (const style of inlineStyles) {
    const src = await readSource(style.source, cache);
    const hits = src.ast.program.body.filter(node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression'
      && node.expression.callee.type === 'FunctionExpression' && node.expression.arguments.length === 2
      && node.expression.arguments.every(arg => arg.type === 'StringLiteral') && node.expression.arguments[0].value === style.id);
    if (hits.length !== 1) throw Error(`${style.source}: expected one inline style ${style.id}, found ${hits.length}`);
    const call = hits[0].expression;
    assertFeatures(`${style.source}: inline style prelude`, src.code.slice(call.callee.start, call.callee.end),
      ['n.querySelector(\'style[data-inline-css="\' + e + \'"]\')', 'r.setAttribute("data-inline-css", e);', '(r.textContent = t), n.head.appendChild(r)']);
    const css = call.arguments[1].value;
    assertFeatures(`${style.source}: inline style ${style.id}`, css, style.features);
    files[style.target] = `/* Original Claude Desktop ${referenceVersion} style text that ${style.source} injects as <style data-inline-css="${style.id}">;\n`
      + `   generated by extract-r3b-transcript.mjs. Edit the extractor, never this file. */\n${css}\n`;
    manifest.inlineStyles.push({ target: style.target, source: style.source, id: style.id, sourceSha256: sha(src.bytes), sha256: sha(css), features: style.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`R3b transcript output set changed: ${present.join(',')}. Run scripts/extract-r3b-transcript.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`R3b transcript source mismatch: ${name}. Run scripts/extract-r3b-transcript.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} R3b transcript modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR3bTranscript({ check: process.argv.includes('--check') });
