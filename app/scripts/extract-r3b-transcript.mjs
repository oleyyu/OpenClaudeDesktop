// R3b-transcript: extract the transcript pieces this lane wires into the local Code transcript, without executing any
// desktop runtime (decision D0: own generator, own output folder src/generated/r3b-transcript, own
// scripts/verify-gen-r3b-transcript.mjs).
//
// w2-tr-r3b (3.6556.2 migration): step 1 below is sliced from 3.6556.2 under its new names (cf74bc599 Ab / Ob / kb /
// yC, c89efce1a Rs / Ls, c4a9ee384 ap / cp / Lp / Ip with shared-4 uk, shared-26 $l / Zl / Jl, shared-0 rO / tO / $C /
// s$, shared-52 Mf, c05b96c7f Ql, cc0a875c8 f / d, cf74bc599 Hb; shared-25 gf is now a view-tabs public name). The
// names in the list below are the 2.42304.0 ones; step 2 (toolcards-06/07) is sliced from 3.6556.2 too (w6-transcript-rows).
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
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
// w2-tr-r3b (3.6556.2 migration, R1/E6) moved step 1 (transcript-03, cov1-06, transcript-v01, cov2-05) to 3.6556.2;
// w6-transcript-rows moved step 2 (the Turn edits card and the session file access it reads, TR-T1 / CI-09). Every
// module and call site still names its version; the area is 3.6556.2 throughout, so only that snapshot is read (V2 is
// kept for the summary line). transcript-rows (3.6556.2 too) links session-file-access.mjs as a linked area.
const V3 = official.referenceVersion, V2 = official.previousVersion;
const versions = { [V3]: { snapshot: official.referenceSnapshot, source: official.ionSource } };
const referenceVersion = V3;
const referenceSnapshot = official.referenceSnapshot;
const output = path.join(root, 'src/generated/r3b-transcript');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-r3b-transcript-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React: every module is 3.6556.2, resolved through official.reactAliases (R3, vendorImport);
// no 2.42304.0 table is left.
const vendor = {};
// Host dependencies (checked first). `features` must appear in the same-chunk closure of the original binding.
const adapters = {
  // ---- 3.6556.2 (step 1: transcript-03, cov1-06, transcript-v01, cov2-05). A feature is a string (verbatim,
  // whitespace-insensitive) or { loose } (R2/E5 looseFeature: ≤3-character identifiers generalised).
  'vendor-intl-DYfox5Co.js': {
    p: { name: 'useIntl', features: ['[React Intl]'] },
    l: { name: 'FormattedMessage', features: ['textComponent'] },
    // r (sn = J("formatList")): react-intl's FormattedList (the +N −M counts' sr-only text). session-rail-changes already
    // slices and exports it (formatted-list.mjs); the adapter re-exports that one copy.
    r: { name: 'FormattedList', features: ['sn = J("formatList")'] },
  },
  // shared-0 bN (exported Id): the render-error report to the desktop's error telemetry. This host sends no telemetry
  // (D17); the adapter records nothing.
  'shared-0-DDOOdL6P.js': { Id: { name: 'reportRenderError', features: [{ loose: 'I(xN, F.O11Y_INTERNALS)' }] } },
  // c3320899b o (exported n): a GrowthBook value pinned for one view (`viewKey`); host value per flag (HOST_FLAGS).
  'c3320899b-CLmJTxEg.js': { n: { name: 'useViewPinnedFlag', features: [{ loose: 'let r = c(t);' }, 'r.pinned === null'] } },
  'shared-78-D5Fw2h0a.js': {
    // rC (exported Tb): "history may have expired under your organization's retention policy" (GrowthBook
    // __gb__2142364912 + org match). No organization or retention policy exists here: false.
    Tb: { name: 'useRetentionMayHaveExpired', features: ['("__gb__2142364912")', '=== "another"'] },
    // t3 (exported n): preload handlers for a lazy dialog trigger. No lazy dialog chunks here: no handlers.
    n: { name: 'useDialogPreloadProps', features: ['e?.preload("intent")', 'onPointerEnter: n, onFocus: n, onPointerDown: n'] },
  },
  // shared-11 Ps (exported Ss): the organization's local-sessions policy behind the Import CLI sessions button
  // (disableDesktopLocalSessions). No organization here: allowed, nothing to reread.
  'shared-11-_AVGLHEz.js': { Ss: { name: 'useLocalSessionsPolicy', features: ['disableDesktopLocalSessions?.value === !0', 'disabledByPolicy: !0,', 'knownAllowed: !1,', 'rereadPolicy: r,'] },
    // gc (exported us): the claudeai_cc_epitaxy_session_presets_main gate (step 2). Decision D10: the "on" branch, so the
    // card shows its 'See all' form (B0e `x = hd()`).
    us: { name: 'useSessionPresetsMain', features: ['"claudeai_cc_epitaxy_session_presets_main"', { loose: 'return L(hc);' }] } },
  'shared-20-mUr7IqZY.js': {
    // Ub (exported Ci): the desktop bridge's importAllCliSessions (3.6556.2: a plain check). No CLI session import here.
    Ci: { name: 'useCliSessionImport', features: [{ loose: 'return !!Ct?.importAllCliSessions;' }] },
    // Xb (exported wi): opens that import for the acting window (unreachable while Ci answers false).
    wi: { name: 'openCliSessionImport', features: ['submitAction', 'actingWindow: e'] },
    // rx (exported xi): the lazy epitaxy_cli_import_dialog descriptor whose `.handle` t3 preloads.
    xi: { name: 'cliImportDialog', features: ['id: "epitaxy_cli_import_dialog"', 'pick: (e) => e.EpitaxyCliImportDialogBody'] },
  },
  // c73f45bc3 jl (exported _r): after an archive or delete, leave the removed session (onSessionRemoved wins).
  'c73f45bc3-B7hbL7H9.js': { _r: { name: 'useSessionRemoved', features: ['{ sessionId: t, onSessionRemoved: n } = e,', { loose: '? (n(e), t !== void 0 && _i(t))' }] } },
  // c48ea26ad Xe (exported o): the session's archive / delete actions with their pending states.
  'c48ea26ad-DhTxpIFD.js': { o: { name: 'useSessionArchiveDelete', features: ['archiveSession: u,', 'deleteSession: v,', 'isArchiving: f,', 'isDeleting: h,'] } },
  // ---- 3.6556.2 (step 2, w6-transcript-rows: the Turn edits card, toolcards-06/07, TR-T1 / CI-09).
  // c03935b01 du / fu / Q (exported gt / vt / _t): the session pane store's state (the card calls openDiffPane), its
  // context (null outside a pane host) and a selector (hasSidePanes). Here the Changes pane is the host's (main.jsx
  // setPanel), answered from TurnEditsHost.
  'c03935b01-yhcY34vt.js': {
    gt: { name: 'usePaneStoreState', features: [{ loose: 'return (f(Z) ?? su).getState();' }] },
    vt: { name: 'usePaneStoreContext', features: [{ loose: 'function fu() {' }, { loose: 'return f(Z);' }] },
    _t: { name: 'usePaneStore', features: [{ loose: 'return Ye(t ?? su, e);' }] },
  },
  // cc6e9624e _ (exported l): [groups[key] ?? initial, setGroupExpanded(key, ·)] on the session's tool expansion store
  // (the card keeps its Show {count} more / Show less state there, keyed `turn-edits:<first call id>`). Here that store is
  // tool-group-expansion.mjs toolGroupExpansion, keyed by session.
  'cc6e9624e-CoHywWvV.js': { l: { name: 'useToolGroupExpanded', features: [{ loose: 't.groups[e] ?? r' }, { loose: 'i.getState().setGroupExpanded(e, t);' }] } },
  // c280f9bbb B (exported t): the file type icon. Its icon-set branch needs GrowthBook __gb__2954460583 (off here) unless
  // fizzy "icons" (off, E12); the off branch is CdsIcon named by shared-9 nw (generated file-icon-name.mjs).
  'c280f9bbb-CutcMso2.js': { t: { name: 'FileTypeIcon', features: ['F = "__gb__2954460583"', '!f("icons")',
    { loose: 'if (_ === null && u !== void 0) return u;' }, { loose: 'name: h, size: "auto", className: c' }] } },
  // c856385e2 Kn (exported a): the transcript file path context menu around `trigger`. This host's menu is
  // source-transcript.jsx's delegated [data-file-ref] menu (surface "transcript"); the adapter marks the trigger.
  'c856385e2-aEyDzrcK.js': { a: { name: 'FilePathMenu', features: ['popupProps:', { loose: 'trigger: o,' }, { loose: 'surface: a,' }, { loose: 'beforeOpen: f' }] } },
};
// Same-chunk declarations answered by the host (the declaration itself must carry `features`).
const chunkAdapters = {
  'c96d752d0-CWv_7-n9.js': {
    // s1: the Turn edits summary of a turn's transcript entries (their tool runs, cU / M0e). This host's edits are Codex
    // fileChange items, summarised by turn-edits-model.mjs turnEdits(); the adapter takes that summary.
    s1: { name: 'turnEditsSummary', features: [{ loose: 'for (let e of cU(a, t).runs) {' }, 'soleVisibleEditToolRow: n.size === 1 && r === 1 && i'] },
    // G0e: the claude.ai artifact row's label and opener (YY), W0e its glyph (JY). No artifacts here; never shown
    // (artifactPage is unset).
    G0e: { name: 'useArtifactPageLink', features: ['defaultMessage: "Untitled artifact"', { loose: 'i = YY(r, t),' }] },
    W0e: { name: 'ArtifactPageIcon', features: ['f(We, { name: "Artifacts", size: "sm" })', 'className: `flex ${n.inkClass}`'] },
  },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original text.
const modules = [
  // ---- Step 1, 3.6556.2.
  // (owner-resize-observer.mjs is gone: 3.6556.2 view-tabs publishes shared-25 gf, the element window's ResizeObserver,
  // so cf74bc599 Ab imports it from there, D1.)
  // cf74bc599 Ab: publish the element's bottom edge (plus an offset) on the transcript region as a CSS variable.
  { target: 'transcript-region-edge.mjs', source: 'cf74bc599-CRYqipWN.js', version: V3,
    exports: { Ab: 'useTranscriptRegionEdge', Ob: 'SUGGESTED_TASK_END', kb: 'STICKY_PROMPT_END', yC: 'SUGGESTED_TASK_EDGE_OFFSET' },
    features: {
      Ab: ['i?.closest("[data-epitaxy-transcript-region]") ??', 'i?.parentElement;', 'i.getBoundingClientRect().bottom - a.getBoundingClientRect().top + n',
        'a.style.getPropertyValue(e) !== t && a.style.setProperty(e, t)', 'a.style.removeProperty(e)', '(a = [e, t, n]),'],
      Ob: ['"--epitaxy-suggested-task-end"'], kb: ['"--epitaxy-sticky-prompt-end"'], yC: ['yC = 12'],
    } },
  // c89efce1a Rs: freeze the header cells' min-width while the table streams; Ls the re-measure stride.
  { target: 'table-column-freeze.mjs', source: 'c89efce1a-C_nlrFif.js', version: V3, exports: { Rs: 'useTableColumnFreeze', Ls: 'tableRemeasureStride' },
    features: {
      Rs: ['t?.tHead?.rows[0]?.cells', '(s.current = { rows: l, tail: u }),', 'd && d.rows === l && d.tail === u', { loose: 'if (f && l > 1 && !p && l - f.rows < Ls(f.rows)) {' },
        { loose: 'm.some((e, t) => Math.abs(e - _[t]) > Math.max(Ns, Ps * _[t]))' }],
      Ls: [{ loose: 'return Math.min(Is, Math.max(1, Math.floor(e / Fs)));' }],
    } },
  // vendor-intl tn (exported f): react-intl defineMessages, the identity.
  { target: 'define-messages.mjs', source: 'vendor-intl-DYfox5Co.js', version: V3, exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  // c05b96c7f Ql (exported Fn): the row-crash copy; 3.6556.2 adds partNeedsReload and reload (TR-T8).
  { target: 'row-crash-messages.mjs', source: 'c05b96c7f-MPVkefMW.js', version: V3, exports: { Ql: 'transcriptRowCrashMessages' },
    features: { Ql: ['defaultMessage: "Couldn\\u2019t load this.", id: "vHA8qpGWmW"', 'defaultMessage: "This response didn\\u2019t load.",', 'id: "qlw7hIBZl4"',
      'retry: { defaultMessage: "Try again", id: "FazwRldA7z" }', 'defaultMessage: "Couldn\\u2019t load this. Reload the page to continue.",', 'id: "BPi/T6wZmd"',
      'reload: { defaultMessage: "Reload", id: "fdCS5/bISp" }'] } },
  // shared-0 rO (exported Hp): a chunk-load failure; tO (exported Up): the literal it matched.
  { target: 'chunk-load-error.mjs', source: 'shared-0-DDOOdL6P.js', version: V3, exports: { rO: 'isChunkLoadError', tO: 'chunkLoadErrorLiteral' },
    features: { rO: ['e.name === "ChunkLoadError"'], tO: [{ loose: 'return $D.find((e) => (e === QD ? t.includes(e) : n.startsWith(e)));' }] } },
  // shared-0 $C (exported gm): carry the original error's stack frames over to its sanitised stand-in.
  { target: 'error-stack.mjs', source: 'shared-0-DDOOdL6P.js', version: V3, exports: { $C: 'withOriginalStack' },
    features: { $C: [{ loose: 'let { headed: n, frames: r } = ew(e);' }] } },
  // shared-52 Mf (exported e_): the page is unloading (a pagehide mark within 30 s) and shared-0 s$ (exported Vt): the
  // document is tearing down, the page-leave state the render-error report carries (shared-26 Xl). Nothing on this host
  // marks either (session-load-error's own chunk-reload-state.mjs copy of the shared-52 mark is never set either), so
  // both read false, as in the official app before a leave.
  { target: 'page-leave-state.mjs', source: 'shared-52-uHFNjl7C.js', version: V3, exports: { Mf: 'pageUnloading' },
    features: { Mf: [{ loose: 'return kf > 0 && Date.now() - kf < 3e4;' }] } },
  { target: 'document-teardown.mjs', source: 'shared-0-DDOOdL6P.js', version: V3, exports: { s$: 'documentTearingDown' },
    features: { s$: [{ loose: 'return e$;' }] } },
  // shared-26 $l (exported fh): the render-error boundary (fallback(error, reset), resetOn, terminalFallback after
  // repeated recommits); Zl (exported ph) its message sanitizer factory; Jl (exported hh) the render-error class.
  { target: 'render-error-boundary.mjs', source: 'shared-26-CGuBxVt9.js', version: V3,
    exports: { $l: 'RenderErrorBoundary', Zl: 'renderErrorSanitizer', Jl: 'renderErrorClass' },
    features: {
      $l: ['static getDerivedStateFromError(e) {', 'e.resetOn !== this.props.resetOn', 'return typeof r == "function" ? r(e, this.reset) : r;',
        'source: "render_error_boundary"', 'return this.props.terminalFallback ?? null;', 'tagsOf(e) {'],
      Zl: ['Error(n === void 0 ? `${e}: ${t.name}` : `${e}: ${t.name}: ${n}`)'], Jl: [{ loose: 'return ql(e)?.cls;' }],
    } },
  // shared-4 uk (exported ft): the per-part boundary the shared row form wraps a row in (rows "shared"; the host
  // renders the classic form, so it is only reached by the original's own branch).
  { target: 'row-part-boundary.mjs', source: 'shared-4-DUB1Oi0O.js', version: V3, exports: { uk: 'RowPartBoundary' },
    features: { uk: ['return { caught: !0, error: e };', { loose: '(this.state.caught && ik(this.state.error, this.props.part),' }] } },
  // c4a9ee384: ap (exported A) the row boundary, cp (exported k) its fallback with the new Reload branch and
  // aria-describedby (TR-T8), Lp (exported d) the per-view gate over Rp, Ip the flag.
  { target: 'transcript-row-boundary.mjs', source: 'c4a9ee384-RLCjceOL.js', version: V3,
    exports: { ap: 'TranscriptRowBoundary', cp: 'TranscriptRowCrashed', Lp: 'useTranscriptRowBoundaryGate', Ip: 'TRANSCRIPT_ROW_BOUNDARY_FLAG' },
    features: {
      ap: ['componentName: "TranscriptRow"', 'y = r === void 0 ? "classic" : r,', '{ ...i, surface: n, rows: y }', 'announce: y !== "shared",',
        { loose: 'if (ce(e) || h?.(e) === !0) throw e;' }, { loose: '(S(), p?.(), n());' }],
      cp: ['"data-transcript-row-crashed": t,', '"data-transcript-row-stage": m,', 'className: "py-sm",', 'name: "WarningCircle", size: "auto"',
        'variant: "secondary",', '"aria-describedby": f,', { loose: 'u = lp("[data-transcript-row-crashed]", r),' }, 'g = c ? void 0 : "none",',
        { loose: '? dn.partNeedsReload' }, { loose: 'l.formatMessage(dn.reload)' }],
      Lp: [{ loose: 'return Rp(Ip, e, t === void 0 || t);' }], Ip: ['"__gb__3525173228"'],
    } },
  // cc0a875c8 f (exported t): the CDS EmptyState; d (exported n) its icon.
  { target: 'empty-state.mjs', source: 'cc0a875c8-Ba9KI-Fw.js', version: V3, exports: { f: 'EmptyState', d: 'EmptyStateIcon' },
    features: { f: ['textRole: _,', { loose: 'f && e("p", { className: o, children: f })' }, { loose: 'h && e("div", { className: l, children: h })' },
      { loose: 't("div", { role: g, className: r, children: [y, C, w, T] })' }],
      d: ['size: "lg", className: i'] } },
  // c81ea1931 e (exported t): keep focus where it is on a button press (byte-identical in both versions).
  { target: 'prevent-mouse-down.mjs', source: 'c81ea1931-ChuE7vym.js', version: V3, exports: { e: 'preventMouseDown' }, features: { e: ['return e.preventDefault()'] } },
  // cf74bc599 Hb: the unavailable-transcript empty state.
  { target: 'transcript-unavailable.mjs', source: 'cf74bc599-CRYqipWN.js', version: V3, exports: { Hb: 'TranscriptUnavailable' },
    features: { Hb: ['defaultMessage: "Earlier messages may have expired"', 'defaultMessage: "Session not found on disk"',
      'defaultMessage: "Send a message to start fresh in this directory."', 'defaultMessage: "Import CLI sessions"',
      'r && !m', 'variant: v ? "ghost" : "secondary",', 'busy: m,', 'busy: h,', 'defaultMessage: "Archive session"', 'defaultMessage: "Delete session"',
      '{ sessionRef: t, sessionTitle: n, afterRemoval: c }', '{ sessionId: t.id, onSessionRemoved: i }', 'disabledByPolicy'] } },
  // ---- Step 2 (toolcards-06/07), 3.6556.2 since w6-transcript-rows (TR-T1, CI-09): the Turn edits card (c96d752d0
  // U0e = memo B0e) and the session file access it reads. transcript-rows (3.6556.2) links session-file-access.mjs as
  // one of its linkedAreas (extract-transcript-rows.mjs).
  // c60636ac6 Ze (exported i): the +N −M counts a file row and the card's totals show (Qe with shown = actual). Qe and Ke
  // are also sliced by session-rail-changes (its animated Xe); both are pure (its `duplicates` table names this copy).
  { target: 'diff-counts.mjs', source: 'c60636ac6-xYOM0GQX.js', version: V3, exports: { Ze: 'DiffCounts' },
    features: { Ze: [{ loose: 'shownAdded: e.added,' }, { loose: 'shownRemoved: e.removed' }] } },
  // cc5c56f5c t / n: the path tooltip's popup props and its text (path segments that wrap after each separator).
  { target: 'path-tooltip.mjs', source: 'cc5c56f5c-BoRtnbt1.js', version: V3, exports: { t: 'PATH_TOOLTIP_PROPS', n: 'pathTooltipText' },
    features: { t: ['className: "max-w-[min(480px,var(--available-width))]"'], n: ['dir: "ltr"', '"inline-block max-w-full whitespace-pre-wrap"'] } },
  // shared-frame hn: strip invisible and control characters from a path before the tooltip shows it.
  { target: 'invisible-characters.mjs', source: 'shared-frame-6jtSkIit.js', version: V3, exports: { hn: 'stripInvisibleCharacters' },
    features: { hn: [{ loose: 'return e.replace(pn(), mn);' }] } },
  // shared-9 yw / Sw: a fizzy "icons" icon override (off, E12) and the caret's drop style; cced621b6 n the disclosure
  // caret's override (CaretRightFilled under fizzy icons), which c425fb3cf Q reads (TR-O4: off, the caret is CaretRight).
  { target: 'icon-override.mjs', source: 'shared-9-CM21XrJw.js', version: V3, exports: { yw: 'fizzyIconOverride', Sw: 'CARET_DROP_STYLE' },
    features: { yw: ['Sr("icons") ? e : void 0'], Sw: ['translate: "0 0.5px"'] } },
  { target: 'caret-override.mjs', source: 'cced621b6-BqCKLL3Y.js', version: V3, exports: { n: 'useCaretIconOverride' },
    features: { n: ['t("CaretRightFilled")', 'headSize: "sm"'] } },
  // c425fb3cf: K the summary card list, G its divider, Q the disclosure caret (3.6556.2: `rotate` prop), V / U the card
  // classes (U is the See-all form's, with epitaxy-summary-card-control-text; inlineStyles carries that chunk's CSS).
  { target: 'summary-card.mjs', source: 'c425fb3cf-B-SGR6Na.js', version: V3,
    exports: { K: 'SummaryCardList', G: 'SummaryCardDivider', Q: 'DisclosureCaret', V: 'SUMMARY_CARD_CLASS', U: 'SUMMARY_CARD_SEE_ALL_CLASS' },
    features: {
      K: ['role: "list",', 'className: "flex w-full min-w-0 flex-col",'], G: ['className: "-mx-[calc(var(--cds-pad-md)-1px)] h-px shrink-0 bg-alpha-2",'],
      Q: ['customSize: 14,', '"transition-transform duration-fast motion-reduce:transition-none"', '?? "CaretRight"', { loose: 'u = n ? 90 : 0,' }],
      V: ['"flex w-full select-text flex-col gap-1 rounded-lg px-md py-xs shadow-[inset_0_0_0_1px_var(--cds-border)]"'],
      U: ['"epitaxy-summary-card-control-text flex w-full select-text flex-col gap-1 rounded-card px-md py-xs shadow-[inset_0_0_0_1px_var(--cds-border)]"'],
    } },
  // shared-52 nk (exported Ou): a path's last segment.
  { target: 'file-basename.mjs', source: 'shared-52-uHFNjl7C.js', version: V3, exports: { nk: 'fileBasename' },
    features: { nk: ['Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\\\"))'] } },
  // shared-26 jS / DS / OS (exported al / nl / tl): a Windows path test, the drive prefix and the UNC prefix shared-28 TM reads.
  { target: 'windows-path.mjs', source: 'shared-26-CGuBxVt9.js', version: V3, exports: { jS: 'isWindowsPath', DS: 'WINDOWS_DRIVE', OS: 'WINDOWS_UNC' },
    features: { jS: [{ loose: 'return kS(e) || AS(e);' }], DS: ['/^[A-Za-z]:[\\\\/]/'], OS: ['/^(?:[\\\\/]{2}|[\\\\/]\\?\\?[\\\\/])/'] } },
  // shared-28 TM (exported pr): a path with normalised separators, relative to a root when one is given.
  { target: 'relative-path.mjs', source: 'shared-28-DNYlf4wu.js', version: V3, exports: { TM: 'relativePath' }, features: { TM: ['if (!t) return r;'] } },
  // c219730b0 Jr (exported S): the muted action text classes the Undo button starts from (3.6556.2: text-muted-as-secondary).
  { target: 'muted-action-class.mjs', source: 'c219730b0-DGG9iA8k.js', version: V3, exports: { Jr: 'MUTED_ACTION_CLASS' },
    features: { Jr: ['"text-muted-as-secondary hover:text-secondary"'] } },
  // c19ad462c: the session's output files (path -> task id) context; empty unless provided.
  { target: 'session-output-files.mjs', source: 'c19ad462c-BZ8PamUY.js', version: V3, exports: { n: 'SessionOutputFilesContext', r: 'useSessionOutputFiles' },
    features: { n: ['e(new Map())'], r: ['return t(n);'] } },
  // shared-2 C2 (exported in): an extension's own CDS icon name (S2), else undefined.
  { target: 'file-icon-override.mjs', source: 'shared-2-TF8v67kg.js', version: V3, exports: { C2: 'fileIconOverride' },
    features: { C2: ['Object.hasOwn(S2, t) ? S2[t] : void 0'] } },
  // shared-6 DM (exported Oa) and shared-104 KI / fL (exported Yt / fn): the extension tables shared-9 nw reads.
  { target: 'source-extensions.mjs', source: 'shared-6-sd9jbJqs.js', version: V3, exports: { DM: 'SOURCE_EXTENSIONS' },
    features: { DM: ['"js.jsx.gs.ts.tsx.py.rb.go.rs.c.cpp.h.hpp.java.kt.swift.sh.bash.zsh.json.yaml.yml.toml.xml.html.css.scss.sql.graphql.proto.lua.r"'] } },
  { target: 'file-kind-tables.mjs', source: 'shared-104-CTONUSaz.js', version: V3, exports: { KI: 'RASTER_IMAGE_EXTENSIONS', fL: 'HIGHLIGHT_LANGUAGES' },
    features: { KI: ['["png", "jpg", "jpeg", "gif", "bmp", "webp"]'], fL: ['"python.javascript.typescript.java.csharp.go.rust'] } },
  // shared-9 nw (exported mt's sibling): the CDS icon name of a file name.
  { target: 'file-icon-name.mjs', source: 'shared-9-CM21XrJw.js', version: V3, exports: { nw: 'fileIconName' }, features: { nw: ['=== "skill" ? tw.skill'] } },
  // c856385e2: the session's file access contexts the Turn edits card reads — Y the Files opener (tt its provider), Ut
  // the Changes diff opener (Ht), Kt where the diff places a path (Gt), gt the read refusal provider, vt "outside this
  // session's folders" over them, ht the session's links block (mt) — and sr, the reason a file cannot be opened.
  { target: 'session-file-access.mjs', source: 'c856385e2-aEyDzrcK.js', version: V3,
    exports: { Y: 'useSessionFileOpener', tt: 'SessionFileOpenerProvider', Ut: 'useDiffOpener', Ht: 'DiffOpenerProvider', Kt: 'useDiffPlacement',
      Gt: 'DiffPlacementProvider', gt: 'ReadRefusalProvider', vt: 'useOutsideRootsCheck', ht: 'useSessionLinksBlock', mt: 'SessionLinksBlockProvider',
      sr: 'SessionFileBlock',
      // Read by the transcript rows area's file link (2.42304.0 c856385e2 In / Rn / Ln through the frozen view in
      // extract-transcript-rows.mjs): Z the read refusal context, Wt the diff placement context, qt the placement while a
      // refusal exists, _t "outside the session's folders".
      Z: 'ReadRefusalContext', Wt: 'DiffPlacementContext', qt: 'useDiffPlacementWhenRefusing', _t: 'isOutsideRoots' },
    features: {
      Z: [{ loose: 'Z = s(null)' }], Wt: [{ loose: 'Wt = s(null)' }], qt: [{ loose: 'return e === null ? null : c(Wt);' }], _t: ['if (t === null) return !1;'],
      Y: [{ loose: 'return c(et);' }], tt: [{ loose: 'tt = et.Provider' }], Ut: [{ loose: 'return c(Vt);' }], Ht: [{ loose: 'Ht = Vt.Provider' }],
      Kt: [{ loose: 'return c(Wt);' }], Gt: [{ loose: 'Gt = Wt.Provider' }], gt: [{ loose: 'gt = Z.Provider' }], ht: [{ loose: 'return c(pt);' }],
      mt: [{ loose: 'mt = pt.Provider' }],
      vt: [{ loose: '(a, o) => e !== null && _t(a, n, i, o && t !== null ? r : null)' }],
      sr: ['n === "outside_roots"', 'defaultMessage: "This file is outside this session\\u2019s folders, so it can\\u2019t be opened here.",'],
    } },
  // c96d752d0 U0e (memo B0e): the Turn edits card; S1 a file row's stop, K0e a file row's opener, R0e the folder hints of
  // repeated file names (exported for tests).
  { target: 'turn-edits-card.mjs', source: 'c96d752d0-CWv_7-n9.js', version: V3,
    exports: { U0e: 'TurnEditsCard', S1: 'useTurnEditStop', K0e: 'useTurnEditFileOpener', R0e: 'turnEditFolderHints' },
    features: {
      U0e: ['U0e = M(B0e)'],
      S1: ['if (e(i, !0)) return "outside_roots";', 'if (t === null && n?.(i) === !1) return r ?? "plain";'],
      K0e: ['if (!t?.(r)) {'],
      R0e: ['detail: n < 0 ? void 0 : t.slice(0, n) || "/",'],
    } },
];
// Original text the host wiring follows but cannot import. Each feature must appear in the whitespace-normalised
// declaration; each import must still resolve to the named declaration of the named chunk.
const callSites = [
  // ---- Step 1, 3.6556.2.
  { source: 'cf74bc599-CRYqipWN.js', version: V3, binding: 'CC', role: 'Suggested task card: title clamp 6, bottom edge published while shown',
    features: ['be = j && k,', { loose: 'xe = Ab(Ob, be, yC);' }, 'ref: xe,', 'absolute top-[12px] inset-x-0', '"text-body text-primary break-words line-clamp-6"',
      '`text-footnote text-secondary break-words ${w ? "line-clamp-6" : "line-clamp-3"}`'] },
  { source: 'cf74bc599-CRYqipWN.js', version: V3, binding: 'Bb', role: 'Sticky prompt bubble: the other publisher of the region edge (not in this host)',
    features: [{ loose: 'O = Ab(kb, D, 0)' }] },
  { source: 'c89efce1a-C_nlrFif.js', version: V3, binding: 'Bs', role: 'Markdown table: the freeze hook reads the streaming flag and the rows',
    features: [{ loose: 'u = Rs(We(), t),' }, { loose: 'r("table", { ref: u, className: p, ...i, children: t })' }] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'F7', role: 'Feed row wrapper: reply for assistant rows, row otherwise',
    features: ['t.kind === "assistant" || t.kind === "assistantItem"', '? "reply"', ': "row",', 'surface: n,', { loose: 'tagsOf: oG,' }, 'resetOn: r,', 'onRetry: i,', 'children: a,'],
    imports: { Wd: ['c4a9ee384-RLCjceOL.js', 'ap'] } },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'I7', role: 'Row retry: forget the session tool expansion',
    features: [{ loose: '($S(e), t !== null && ive(t));' }] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'R7', role: 'Code feed: gate per session, resetOn = the row is the live tail',
    features: [{ loose: 'yt = Xd(i, !rt),' }, { loose: 'bt = I7(Ze.toolExpansionStore, i),' }, 'x = t.kind === "loader" ? r : r && m,', 'e.codesOwnView === !0 ? "code" : "code_feed",'],
    imports: { Xd: ['c4a9ee384-RLCjceOL.js', 'Lp'] } },
  { source: 'cf74bc599-CRYqipWN.js', version: V3, binding: 'FT', role: 'Session pane: Hb when the transcript is unavailable',
    features: ['w?.transcriptUnavailable && n', { loose: 's(Hb, {' }, 'sessionRef: n,', 'title: w.title,', 'isArchived: w.isArchived === !0,', 'onSessionRemoved: d,'] },
  // ---- Step 2 (toolcards-06/07), 3.6556.2: what the card draws and where it mounts.
  // TR-T1: B0e is the card (the 'Edited N files' title row and Undo; See all / Total with the turn's totals in the
  // See-all form), z0e the file list (the first 3 files until expanded, kept per first call id), L0e the toggle row
  // ("Show {count} more" / "See all" / "Show less"). CI-09: the plural file count line of 2.42304.0 is gone.
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'B0e', role: 'Turn edits card: title row with Undo, file rows, See all / Total over the turn totals',
    features: ['defaultMessage: "{n, plural, one {Edited a file} other {Edited # files}}",', 'defaultMessage: "See all", id: "078WAre0KU"',
      'defaultMessage: "Total", id: "MJ2jZQxQnT"', 'defaultMessage: "Undo", id: "JkS37H8PlA"', 'defaultMessage: "Ask Claude to undo this turn\\u2019s file changes",',
      'defaultMessage: "View this turn\\u2019s changes", id: "00aRWTQr5k"', '"flex h-control min-w-0 items-center justify-between gap-sm px-xs"',
      { loose: 'O = x && D.length > 3,' }, { loose: 'G0e(r, "turn_edits_card")' }] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'z0e', role: 'Turn edits files: the first 3 until expanded; the expansion is kept per first call id',
    features: ['`turn-edits:${t[0]?.calls[0]?.id ?? ""}`', 'a ? t : t.slice(0, 3)', 'p = t.length - 3,', { loose: 'p > 0 && f(L0e, { count: p, expanded: a, onToggle: l, seeAllTotals: r })' }] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'L0e', role: 'Turn edits toggle row: Show {count} more / See all / Show less, aria-expanded',
    features: ['defaultMessage: "Show less", id: "qyJtWyZ0yt"', 'defaultMessage: "See all", id: "078WAre0KU"', 'defaultMessage: "Show {count} more", id: "Z184O6N3fq"',
      '"aria-expanded": n,', 'seeAllForm: !0'] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'T0', role: 'Turn edits card gate: drawn for the session (G_) at the finished turn tail (the GrowthBook gate of 2.42304.0 is gone)',
    features: ['turnEditsCardDrawn: u, turnEditsItems: d, turnEditsLayout: O', { loose: 'f = u && r && !i,' }] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'b0', role: 'Turn edits card row: data-find-omitted contents, at the finished turn tail; Undo only for the last entry',
    features: ['u = s && o && !i && t.synthetic !== !0', '"data-find-omitted": ""', 'className: "contents"', 'p = a ? n : void 0;'] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'C1', role: 'Turn edits card: hidden when the edit is the turn\'s sole visible edit row (o1)',
    features: ['C1 = M(function (e) {', { loose: 'return o1(a, r)' }] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'q0e', role: 'Undo: sends j0e as the next message (host: main.jsx sendUndoTurn with undoTurnText)',
    features: ['Yx("turn_edits_undo")', 'text: j0e(t)', 'source: "epitaxy_turn_edits_undo"'] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'j0e', role: 'Undo message text (host: turn-edits-model.mjs undoTurnText, in the UI language)',
    features: ['`Undo the changes you made to ${t[0]} in your last turn and restore it to its previous state.`',
      '`Undo the changes you made to these ${t.length} files in your last turn and restore them to their previous state:`'] },
  // Step 2, toolcards-16: the runningIds hold and the branch it lives in (transcript rows' turnStatusRows branch).
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'sD', role: 'Running mark: runningIds keep the mark across wire gaps (turnStatusRows candidates only)',
    features: ['t?.runningIds?.some(l) ?? !1', { loose: 'h = f || (s === !0 && t !== void 0 && !t.wireRunning && p === t.key),' }, 'tailHeld: C,'] },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'Z1e', role: 'Tool group: the candidate (with runningIds) under turnStatusRows; the running label holds 650 ms (rest key with the rows)',
    features: [{ loose: 'Ne = Pv(),' }, { loose: 'dt = EE(ut, 650, Ne ? qv : void 0),' }, 'runningIds: t.flatMap(e0e),'],
    imports: { Pv: ['c26fb8b6b-B7Friu61.js', 'Xe'] } },
  { source: 'c96d752d0-CWv_7-n9.js', version: V3, binding: 'EE', role: 'Held key: each shown key stays at least t ms',
    features: ['i = Math.max(t - r, f ? d - (n - (v.current ?? n)) : 0);'] },
  { source: 'c26fb8b6b-B7Friu61.js', version: V3, binding: 'Je', role: 'turnStatusRows: GrowthBook __gb__2846116625 unless a provider says otherwise',
    features: [{ loose: 'i = g(qe),' }, { loose: 'a = r ?? i;' }] },
  { source: 'c26fb8b6b-B7Friu61.js', version: V3, binding: 'qe', role: 'turnStatusRows flag', features: ['qe = "__gb__2846116625"'] },
];
// Style text a chunk injects with its `(function (e, t) { … })(id, css)` prelude, written out verbatim as CSS.
const inlineStyles = [
  { source: 'c425fb3cf-B-SGR6Na.js', version: V3, id: 'cbbd9b21e', target: 'summary-card.css',
    features: ['.epitaxy-root .epitaxy-summary-card-control-text{font-size:var(--cds-font-size-body--own,var(--cds-font-size-body));line-height:var(--cds-leading-body--own,var(--cds-leading-body))}'] },
];

// Chunks parsed as shipped instead of prettier-formatted first (formatting the large ones dominated the check's time).
// Their declarations are still emitted through the final prettier pass, and every feature (roots, chunk adapters,
// call sites) is matched against the prettier form of the one declaration it names (featureText). A chunk that an
// import adapter pins by closure stays formatted.
const rawSources = new Set(['c96d752d0-CWv_7-n9.js', 'shared-frame-6jtSkIit.js']);
async function readSource(name, cache, version) {
  const key = `${version}/${name}`;
  if (!versions[version]) throw Error(`${name}: unknown reference version ${version}`);
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(versions[version].source, name));
  const raw = rawSources.has(name);
  const code = raw ? bytes.toString() : await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, version, bytes, code, ast, exported, program: null, raw, formatted: new Map() };
  cache.set(key, record);
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
  const missing = features.filter(f => typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !official.looseFeature(f.loose).test(text));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

function vendorImport(file, alias, src) {
  // R3: 3.6556.2 vendor-frame React exports through official.assertVendorAlias (top-level `local=<namespace>.<member>`).
  if (file === official.vendorFrame) {
    if (!official.reactAliases[alias]) return null;
    const { module, member } = official.assertVendorAlias(src.bytes.toString(), alias);
    return [module, member];
  }
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
// Both steps resolve against the 3.6556.2 graph (view-tabs serves that release only), keyed by file#local.
async function viewTabsPublic() {
  const byLocal = new Map();
  const manifest = await viewTabsManifestFor(V3);
  if (manifest.referenceVersion !== V3) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${V3}`);
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
    const src = await readSource(spec.source, cache, spec.version);
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
          const dep = await readSource(file, cache, spec.version);
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
        const dep = await readSource(file, cache, spec.version);
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
    const header = `// Original Claude Desktop ${spec.version} bindings from ${spec.source}; generated by extract-r3b-transcript.mjs.\n// Edit the extractor or src/source-r3b-transcript-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
      'performance', 'globalThis', 'getComputedStyle', 'document', 'window', 'Infinity', 'undefined', 'RegExp', 'Date']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion: spec.version,
      referenceSnapshot: versions[spec.version].snapshot,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache, site.version);
    const node = topLevelDeclaration(src, site.binding);
    const text = await featureText(src, node);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    const imports = {};
    for (const [local, [file, expected]] of Object.entries(site.imports ?? {})) {
      const resolved = importOf(src, local);
      const dep = await readSource(resolved.file, cache, site.version);
      const target = dep.exported.get(resolved.alias);
      if (resolved.file !== file || target !== expected)
        throw Error(`call site ${site.source}:${site.binding}: ${local} resolves to ${resolved.file}:${target}, expected ${file}:${expected}`);
      imports[local] = `${file}:${resolved.alias} (${expected})`;
    }
    manifest.callSites.push({ source: site.source, referenceVersion: site.version, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(text), features: site.features, imports });
  }
  manifest.inlineStyles = [];
  for (const style of inlineStyles) {
    const src = await readSource(style.source, cache, style.version);
    const hits = src.ast.program.body.filter(node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression'
      && node.expression.callee.type === 'FunctionExpression' && node.expression.arguments.length === 2
      && node.expression.arguments.every(arg => arg.type === 'StringLiteral') && node.expression.arguments[0].value === style.id);
    if (hits.length !== 1) throw Error(`${style.source}: expected one inline style ${style.id}, found ${hits.length}`);
    const call = hits[0].expression;
    assertFeatures(`${style.source}: inline style prelude`, src.code.slice(call.callee.start, call.callee.end),
      ['n.querySelector(\'style[data-inline-css="\' + e + \'"]\')', 'r.setAttribute("data-inline-css", e);', '(r.textContent = t), n.head.appendChild(r)']);
    const css = call.arguments[1].value;
    assertFeatures(`${style.source}: inline style ${style.id}`, css, style.features);
    files[style.target] = `/* Original Claude Desktop ${style.version} style text that ${style.source} injects as <style data-inline-css="${style.id}">;\n`
      + `   generated by extract-r3b-transcript.mjs. Edit the extractor, never this file. */\n${css}\n`;
    manifest.inlineStyles.push({ target: style.target, source: style.source, referenceVersion: style.version, id: style.id, sourceSha256: sha(src.bytes), sha256: sha(css), features: style.features });
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
  const v3 = manifest.modules.filter(m => m.referenceVersion === V3).length;
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} R3b transcript modules (${v3} from ${V3}, ${manifest.modules.length - v3} from ${V2}; ${count} original bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR3bTranscript({ check: process.argv.includes('--check') });
