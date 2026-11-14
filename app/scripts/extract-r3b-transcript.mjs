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
import * as official4 from './official-4.16336.0.mjs';

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
  // W14-code r2 closeout-2 (DC-06): transcript-region-edge.mjs (cf74bc599 Ab, the element's bottom edge published on the
  // transcript region as a CSS variable) is retired. Its two official callers are the floating suggested task card
  // (`xe=Ab(Ob,be,yC)`, not mounted with presets on, D10) and the sticky prompt bubble (`O=Ab(kb,D,0)`, under
  // claudeai_cc_epitaxy_sticky_prompt, off on the desktop, E81), so nothing imported it.
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

export async function extractR3bTranscript({ check = false, version = referenceVersion, ...options } = {}) {
  if (version === official4.referenceVersion) return extractR3bTranscriptV4({ check, ...options });
  if (version !== referenceVersion) throw Error(`extract-r3b-transcript has no ${version} source contract`);
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
// ---------------------------------------------------------------------------------------------------------------------
// 4.16336.0 (region batch 2b; region-plan G6, cutover.oldConsumersAtGeneration = chat-renderer, code-transcript,
// sessions-page, transcript-rows). Those four regions are still 3.6556.2 and link src/generated/r3b-transcript by
// original identity (session-file-access, page-leave-state, error-stack, invisible-characters, table-column-freeze), so
// that graph stays on 3.6556.2, byte for byte, until they move (productionSwitchNotBeforeBatch 10). A second source
// contract cuts the same semantic exports from snapshots/claude-4.16336.0-20261104 into the isolated graph
// src/generated/r3b-transcript-v4 (the retry-decision / approval-landing staging form).
//
// Where the 4.16336.0 originals live (every root names its chunk export alias, proved against the chunk's export table, or
// null for a private root, which the chunk must not export; every root must also be the only top-level declaration of its
// chunk carrying its features, `twins` naming byte-identical declarations a feature cannot tell apart):
//   c89efce1a-CleBUUAy.js cu (`f`) / su        the table column freeze, now with a third argument (hold the appended row
//                                               out of the measurement while streaming) and its re-measure stride.
//   c05b96c7f-3na38kSt.js $c (`nn`)            the row-crash copy (unchanged).
//   shared-0-CnnWnVrT.js $N / ZN / zk / dV     chunk-load classification, stack carry-over, document teardown.
//   shared-62-DoCqVpIq.js cf (`Z_`)            the page is unloading (3.6556.2 shared-52 Mf).
//   shared-26-B-POtn5S.js Ds / Ts / Ss         the render-error boundary (new: `unreported`, the console form through the
//                                               preload helper's o11y error text), its sanitizer and class.
//   preload-helper-BBljBeZo.js e (`n`)         the o11y error text a sanitised stand-in carries (cds-core holds it, pure).
//   shared-31-C9BqSSuD.js ST (`$`)             the per-part boundary (3.6556.2 shared-4 uk).
//   c4a9ee384-BWj_BT12.js Jd / Zd / yf / vf    the row boundary, its fallback, the per-view gate and its flag.
//   cc0a875c8-CEwFiq99.js f / d, c81ea1931 e    EmptyState and its icon; the mouse-down guard.
//   cf74bc599-BytvntCE.js vS                   the unavailable-transcript state, now memo() and with `ageLimitedByOrg`.
//   step 2 (toolcards-06/07): c60636ac6 Ze, shared-55 mV / gV (path tooltip, 3.6556.2 cc5c56f5c), shared-18 tP and
//   cced621b6 t (the caret drop style and the CaretRightFilled override, now a constant the caret reads unless atRowEnd),
//   c425fb3cf q / K / Q / H / W, shared-92 pk (file basename, 3.6556.2 shared-52 nk), shared-3 rN (relative path,
//   3.6556.2 shared-28 TM), c761aa8b9 ea (the muted action class, now a CSS variable colour), c19ad462c n / r, shared-9 MT
//   (file icon name), c856385e2 (the session file access contexts; providers are exported `.Provider` declarations) and
//   c96d752d0 nrt (memo $nt: the Turn edits card, with Created / Changed / Edited titles, the a$ / o$ rows and the Qnt
//   list), s$, art, Znt.
// Resolution (sharedGraph 'cds-core', the btw-pane / approval-landing 4.16336.0 rules): an import resolves to a host
// adapter (adapters4, feature-pinned), React (assertVendorAlias), a cds-core publicName (its raw declaration hash checked,
// linkedSha256) or a module emitted earlier here. A same-chunk binding cds-core publishes is linked (a published root is
// re-exported under its semantic name); one it holds without a publicName is cut again only when pure and hash-equal
// (heldByCdsCore); held module state stops generation (D46, stateConflicts with text and reachedBy). React Compiler
// helpers cds-core holds unnamed are cut once in compiler-helpers.mjs, proved by assertCompilerHelpers.
const V4 = official4.referenceVersion;
const output4 = path.join(root, 'src/generated/r3b-transcript-v4');
const loose4 = feature => ({ loose: feature });
// Host dependencies of the 4.16336.0 graph: chunk -> export alias -> { name, features } (features on the closure of the
// aliased declaration, as for 3.6556.2). The names are the ones src/source-r3b-transcript-adapters.jsx exports.
const adapters4 = {
  'vendor-intl-BJgYK7RA.js': {
    p: { name: 'useIntl', features: ['[React Intl]'] },
    l: { name: 'FormattedMessage', features: ['textComponent'] },
    // sn (exported r): react-intl's FormattedList (the +N −M counts' sr-only text); the host re-exports one copy.
    r: { name: 'FormattedList', features: ['sn = J("formatList")'] },
  },
  // shared-0 qB (exported zd; 3.6556.2 bN / Id): the render-error report (D17: this host sends no telemetry).
  'shared-0-CnnWnVrT.js': { zd: { name: 'reportRenderError', features: [loose4('I(xN, F.O11Y_INTERNALS)')] } },
  // c3320899b o (exported n): a GrowthBook value pinned for one view.
  'c3320899b-D8pnTMal.js': { n: { name: 'useViewPinnedFlag', features: [loose4('let r = c(t);'), loose4('r.pinned === null')] } },
  // shared-92 uk (exported xp; 3.6556.2 shared-78 rC / Tb): retention may have expired (GrowthBook + org match).
  'shared-92-BOgyxePb.js': { xp: { name: 'useRetentionMayHaveExpired', features: ['("__gb__2142364912")', '=== "another"'] } },
  // shared-123 v$ (exported It; 3.6556.2 shared-78 t3 / n): preload props of a lazy dialog trigger.
  'shared-123-1Hc1RTKl.js': { It: { name: 'useDialogPreloadProps', features: ['e?.preload("intent")', 'onPointerEnter: n, onFocus: n, onPointerDown: n'] } },
  'shared-39-ZCs0lAwB.js': {
    // Wc (exported $s; 3.6556.2 shared-11 Ps / Ss): the organization's local-sessions policy (now also off when sessions
    // do not run on this device).
    $s: { name: 'useLocalSessionsPolicy', features: ['disableDesktopLocalSessions?.value === !0', 'disabledByPolicy: !0,', 'knownAllowed: !1,', 'rereadPolicy: r,'] },
    // Ol (exported zs; 3.6556.2 shared-11 gc / us): the claudeai_cc_epitaxy_session_presets_main gate (D10: on).
    zs: { name: 'useSessionPresetsMain', features: ['"claudeai_cc_epitaxy_session_presets_main"', loose4('return Ke(Dl);')] },
  },
  'shared-20-DUEo90UF.js': {
    xa: { name: 'useCliSessionImport', features: [loose4('return !!Ce?.importAllCliSessions;')] },
    Sa: { name: 'openCliSessionImport', features: ['submitAction', 'actingWindow: e'] },
    _a: { name: 'cliImportDialog', features: ['id: "epitaxy_cli_import_dialog"', 'pick: (e) => e.EpitaxyCliImportDialogBody'] },
  },
  'c73f45bc3-C7dtUSq8.js': { Ar: { name: 'useSessionRemoved', features: ['{ sessionId: t, onSessionRemoved: n } = e,', loose4('? (n(e), t !== void 0 && Qr(t))')] } },
  'c48ea26ad-DTl74jog.js': { o: { name: 'useSessionArchiveDelete', features: ['archiveSession: d,', 'isArchiving: f,', 'sessionTitle: r,', 'afterRemoval: i,'] } },
  'c03935b01-BylKMWqe.js': {
    Tt: { name: 'usePaneStoreState', features: [loose4('return (u(vf) ?? yf).getState();')] },
    Dt: { name: 'usePaneStoreContext', features: [loose4('function wf() { return u(vf); }')] },
    Et: { name: 'usePaneStore', features: [loose4('let t = u(vf); return $e(t ?? yf, e);')] },
  },
  'cc6e9624e-QSsNXeYh.js': { l: { name: 'useToolGroupExpanded', features: [loose4('t.groups[e] ?? r'), loose4('i.getState().setGroupExpanded(e, t);')] } },
  'c280f9bbb-BOcpax9X.js': { t: { name: 'FileTypeIcon', features: ['{ fileName: n, size: i, className: a, fallback: o } = e,', loose4('if (v === null && o !== void 0) return o;')] } },
  'c856385e2-Cqx37C-b.js': { a: { name: 'FilePathMenu', features: [loose4('trigger: o,'), loose4('surface: a,'), loose4('beforeOpen: f')] } },
};
// Same-chunk declarations answered by the host (the declaration itself must carry `features`).
const chunkAdapters4 = {
  'c96d752d0-D9VB6ArX.js': {
    // KQ: the Turn edits summary of a turn's entries (3.6556.2 s1); host: turn-edits-model.mjs turnEdits().
    KQ: { name: 'turnEditsSummary', features: [loose4('for (let e of jW(a, t).runs) {'), 'soleVisibleEditToolRow: n.size === 1 && r === 1 && i'] },
    // irt / rrt: the artifact row's label and opener, and its glyph (3.6556.2 G0e / W0e). No artifacts here.
    irt: { name: 'useArtifactPageLink', features: ['defaultMessage: "Untitled artifact"', loose4('i = Hz(r, t),')] },
    rrt: { name: 'ArtifactPageIcon', features: ['f(qe, { name: "Artifacts", size: "sm" })', 'className: `flex ${n.inkClass}`'] },
  },
};
const helperNames4 = names => Object.fromEntries(names.map(name => {
  const helper = Object.values(official4.compilerHelpers).find(h => h.name === name);
  if (!helper) throw Error(`official-4.16336.0 has no compiler helper ${name}`);
  return [helper.local, name];
}));
// The React Compiler helpers this graph reads (cds-core holds them unnamed; memoStoreDeps4 is published).
const HELPERS4 = ['reactMemoCache', 'memoIsEmpty', 'memoChanged1', 'memoChanged2', 'memoChanged3', 'memoChanged4', 'memoChanged5',
  'memoStore0', 'memoStore1', 'memoStore2', 'memoStore3', 'memoStore4', 'memoStore5', 'memoStoreValueFirst1', 'memoStoreValueFirst2', 'memoStoreValueFirst3',
  'memoStoreValueFirst5', 'memoStoreDeps1'];
const contract4 = {
  official: official4, output: output4, label: 'R3b transcript 4.16336.0', sharedGraph: 'cds-core',
  adapterModule: '../../source-r3b-transcript-adapters.jsx',
  isolatedGraph: { legacyOutput: 'src/generated/r3b-transcript', productionSwitchNotBeforeBatch: 10,
    heldBy: ['chat-renderer', 'code-transcript', 'sessions-page', 'transcript-rows', 'src/source-r3b-transcript-adapters.jsx',
      'src/source-r3b-transcript.jsx', 'src/source-turn-edits.jsx', 'src/source-session-error-boundary.jsx', 'src/source-response-table.jsx',
      'src/source-code-transcript.jsx', 'src/source-file-tabs.jsx', 'src/source-preview-pane.jsx', 'src/source-terminal-pane.jsx',
      'src/source-session-rail.jsx', 'src/source-session-rail-adapters.jsx', 'src/source-transcript-tool-rows.jsx', 'src/turn-edits-model.mjs'] },
  // Every chunk is parsed as shipped: declarations are cut from (and hashed by, as cds-core does) the shipped bytes and
  // the module is prettier-formatted as a whole; features are matched on the prettier form of the one declaration they
  // name (featureText4), the uniqueness scan pre-filters the shipped text first.
  rawSources: { has: () => true },
  hostGlobals: new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
    'performance', 'globalThis', 'getComputedStyle', 'document', 'window', 'Infinity', 'undefined', 'RegExp', 'Date', 'decodeURIComponent', 'crypto',
    'Boolean']),
  adapters: adapters4, chunkAdapters: chunkAdapters4,
  // D1 (one copy): pure 4.16336.0 bindings another region's 4.16336.0 graph already cuts are linked from it, not cut
  // again. linkedArea4 proves the other manifest is this version and snapshot, the module's bytes and source chunk, and
  // that the binding there is byte for byte the declaration this chunk ships.
  linkedAreas: {
    // shared-0 Tl (exported nS): lazyValue, the region-plan resliceInsteadOfLink binding r3b-tasks owns (r4e-plugin's
    // allowed re-cut is not linked).
    'shared-0-CnnWnVrT.js#Tl': { area: 'r3b-tasks', target: 'lazy-value.mjs', exportName: 'lazyValue' },
    // (cds-wave8 addendum W8A: shared-0 T6 (exported St), the invisible / unassigned code point class, left this list.
    // r4e-plugin's url-safety cut it only for its link-text reader, which now links the published owner value
    // (identity_*, cds-core) and no longer reaches T6, so r4e-plugin neither cuts nor exports it; this graph cuts the
    // pure regex itself again (held by cds-core, unpublished; heldByCdsCore), one copy outside cds-core as before. Was:
    // 'shared-0-CnnWnVrT.js#T6': { area: 'r4e-plugin', target: 'url-safety.mjs', exportName: 'T6' }.)
  },
  // D1 / D46 outside cds-core: module state this graph cuts that another 4.16336.0 region also cuts is a split
  // instance. Each such copy must be listed here: `areas` = exactly the regions that may hold it, or `anyAreas` for a
  // copy that is interchangeable (a lazily built constant). Writing (no --check) fails closed on an unlisted copy, a
  // region outside `areas`, or a stale entry; --check (run by prepare-ui while other regions regenerate) reports
  // those on stderr instead, since they are caused by another region's output, and tests/r3b-transcript-v4.test.mjs
  // asserts them strictly. The manifest records only this contract's side (no other region's manifest sha), so
  // another region regenerating never changes these bytes.
  //
  // shared-62 af (the page-unloading timestamp) left this list in cds-core wave 5: cds-core holds af with its writer sf,
  // its reader cf and the official pagehide / pageshow registration, and publishes them (pageUnloadingAt,
  // markPageUnloading, isPageUnloading), so neither this graph nor session-load-error cuts a copy any more.
  foreignState: {
    // shared-frame zm (the RegExp Bm builds on first use) left this list in cds-core wave 5: cds-core holds and publishes
    // zm / Bm (invisibleCharsPatternCache, getInvisibleCharsPattern), so this graph links them instead of cutting a copy.
  },
  modules: [
    // E3: React Compiler helpers cds-core holds without a publicName (memoStoreDeps4 is published and linked instead).
    { target: 'compiler-helpers.mjs', source: official4.sharedFrame, compilerHelpers: true, exports: helperNames4(HELPERS4) },
    // ---- Step 1.
    { target: 'table-column-freeze.mjs', source: 'c89efce1a-CleBUUAy.js', exports: { cu: 'useTableColumnFreeze', su: 'tableRemeasureStride' },
      aliases: { cu: 'f', su: null },
      features: {
        cu: ['t?.tHead?.rows[0]?.cells', loose4('(c.current = { rows: u, tail: d }),'), loose4('f && f.rows === u && f.tail === d'),
          loose4('if (p && u > 1 && !m && u - p.rows < su(p.rows)) {'), loose4('_.some((e, t) => Math.abs(e - b[t]) > Math.max(ru, iu * b[t]))'),
          loose4('g = r && u > 1 && f !== null && u > f.rows ? l.rows[u - 1] : null;')],
        su: [loose4('return Math.min(ou, Math.max(1, Math.floor(e / au)));')],
      } },
    // vendor-intl tn (exported f): react-intl defineMessages, the identity; nn (exported d, defineMessage) is its twin.
    { target: 'define-messages.mjs', source: 'vendor-intl-BJgYK7RA.js', exports: { tn: 'defineMessages' }, aliases: { tn: 'f' },
      features: { tn: [loose4('function tn(e) { return e; }', )] }, twins: { tn: ['nn'] } },
    { target: 'row-crash-messages.mjs', source: 'c05b96c7f-3na38kSt.js', exports: { $c: 'transcriptRowCrashMessages' }, aliases: { $c: 'nn' },
      features: { $c: ['defaultMessage: "Couldn\\u2019t load this.", id: "vHA8qpGWmW"', 'defaultMessage: "This response didn\\u2019t load.",', 'id: "qlw7hIBZl4"',
        'retry: { defaultMessage: "Try again", id: "FazwRldA7z" }', 'defaultMessage: "Couldn\\u2019t load this. Reload the page to continue.",', 'id: "BPi/T6wZmd"',
        'reload: { defaultMessage: "Reload", id: "fdCS5/bISp" }'] } },
    // shared-0 T6 (exported St): the invisible / unassigned code point class shared-3 MM (relativePath's display form)
    // reads. cds-wave8 addendum W8A: r4e-plugin no longer cuts it (see linkedAreas), so this graph cuts the pure regex
    // itself; cds-core holds it unpublished (heldByCdsCore), one copy outside cds-core as before.
    { target: 'invisible-code-points.mjs', source: 'shared-0-CnnWnVrT.js', exports: { T6: 'invisibleCodePointPattern' }, aliases: { T6: 'St' },
      features: { T6: ['\\p{Default_Ignorable_Code_Point}', '\\uFDD0-\\uFDEF'] } },
    { target: 'chunk-load-error.mjs', source: 'shared-0-CnnWnVrT.js', exports: { $N: 'isChunkLoadError', ZN: 'chunkLoadErrorLiteral' }, aliases: { $N: 'Sm', ZN: 'Cm' },
      features: { $N: ['e.name === "ChunkLoadError"', loose4('return n ? ZN(n) !== void 0 : !1;')],
        ZN: [loose4('return YN.find((e) => (e === JN ? t.includes(e) : n.startsWith(e)));')] } },
    { target: 'error-stack.mjs', source: 'shared-0-CnnWnVrT.js', exports: { zk: 'withOriginalStack' }, aliases: { zk: 'Zm' },
      features: { zk: [loose4('let { headed: n, frames: r } = Bk(e);'), loose4('n || r.length === 0')] } },
    // shared-62 cf (exported Z_, a pagehide mark within 30 s; 3.6556.2 shared-52 Mf) is cds-core isPageUnloading since
    // cds-core wave 5 (which also carries the official pagehide / pageshow registration that writes af), so the former
    // page-leave-state.mjs had every root linked and is dropped: render-error-boundary imports cf from cds-core.
    // shared-0 dV (exported Id): the document is tearing down (3.6556.2 s$). Nothing on this host marks it.
    { target: 'document-teardown.mjs', source: 'shared-0-CnnWnVrT.js', exports: { dV: 'documentTearingDown' }, aliases: { dV: 'Id' },
      features: { dV: [loose4('function dV() { return iV; }'), { reads: ['"Document teardown was cancelled"', loose4('iV = !1')] }] } },
    // preload-helper e (exported n): the o11y error text the boundary's console form carries (Symbol.for("ant.o11y.errorText")).
    { target: 'error-text.mjs', source: 'preload-helper-BBljBeZo.js', exports: { e: 'withErrorText' }, aliases: { e: 'n' },
      features: { e: ['Symbol.for("ant.o11y.errorText")', 'value: { text: t, kind: n },'] } },
    { target: 'render-error-boundary.mjs', source: 'shared-26-B-POtn5S.js',
      exports: { Ds: 'RenderErrorBoundary', Ts: 'renderErrorSanitizer', Ss: 'renderErrorClass' }, aliases: { Ds: '$b', Ts: 'ex', Ss: 'nx' },
      features: {
        Ds: ['static getDerivedStateFromError(e) {', 'e.resetOn !== this.props.resetOn', 'return typeof r == "function" ? r(e, this.reset) : r;',
          'source: "render_error_boundary"', 'return this.props.terminalFallback ?? null;', 'tagsOf(e) {', 'if (this.props.unreported) return;',
          '"A part of the page failed to draw"'],
        Ts: ['Error(n === void 0 ? `${e}: ${t.name}` : `${e}: ${t.name}: ${n}`)'], Ss: [loose4('return xs(e)?.cls;')],
        ws: ['document_tearing_down:', 'visibility_state: document.visibilityState'],
      } },
    { target: 'row-part-boundary.mjs', source: 'shared-31-C9BqSSuD.js', exports: { ST: 'RowPartBoundary' }, aliases: { ST: '$' },
      features: { ST: ['return { caught: !0, error: e };', loose4('(this.state.caught && gT(this.state.error, this.props.part),')] } },
    { target: 'transcript-row-boundary.mjs', source: 'c4a9ee384-BWj_BT12.js',
      exports: { Jd: 'TranscriptRowBoundary', Zd: 'TranscriptRowCrashed', yf: 'useTranscriptRowBoundaryGate', vf: 'TRANSCRIPT_ROW_BOUNDARY_FLAG' },
      aliases: { Jd: 'T', Zd: 'w', yf: 'f', vf: null },
      features: {
        Jd: ['componentName: "TranscriptRow"', 'y = r === void 0 ? "classic" : r,', '{ ...i, surface: n, rows: y }', 'announce: y !== "shared",',
          loose4('if (K(e) || h?.(e) === !0) throw e;'), loose4('(S(), f?.(), n());')],
        Zd: ['"data-transcript-row-crashed": t,', '"data-transcript-row-stage": p,', 'className: "py-sm",', 'name: "WarningCircle", size: "auto"',
          'variant: "secondary",', '"aria-describedby": f,', loose4('u = Qd("[data-transcript-row-crashed]", r),'), 'h = c ? void 0 : "none",',
          loose4('? _n.partNeedsReload'), loose4('l.formatMessage(_n.reload)')],
        yf: [loose4('return bf(vf, e, t === void 0 || t);')], vf: ['vf = "__gb__3525173228"'],
      } },
    { target: 'empty-state.mjs', source: 'cc0a875c8-CEwFiq99.js', exports: { f: 'EmptyState', d: 'EmptyStateIcon' }, aliases: { f: 't', d: 'n' },
      features: { f: ['textRole: _,', loose4('f && e("p", { className: o, children: f })'), loose4('h && e("div", { className: l, children: h })'),
        loose4('t("div", { role: g, className: r, children: [y, C, w, T] })')],
        d: ['size: "lg", className: i'] } },
    { target: 'prevent-mouse-down.mjs', source: 'c81ea1931-ChuE7vym.js', exports: { e: 'preventMouseDown' }, aliases: { e: 't' },
      features: { e: ['return e.preventDefault()'] } },
    { target: 'transcript-unavailable.mjs', source: 'cf74bc599-BytvntCE.js', exports: { vS: 'TranscriptUnavailable' }, aliases: { vS: null },
      features: { vS: ['defaultMessage: "Earlier messages may have expired"', 'defaultMessage: "Session not found on disk"',
        'defaultMessage: "Send a message to start fresh in this directory."', 'defaultMessage: "Import CLI sessions"',
        'r && !g', 'variant: b ? "ghost" : "secondary",', 'busy: g,', 'busy: _,', 'defaultMessage: "Archive session"', 'defaultMessage: "Delete session"',
        '{ sessionRef: t, sessionTitle: n, afterRemoval: f }', '{ sessionId: t.id, onSessionRemoved: a }', 'disabledByPolicy', 'ageLimitedByOrg: i,', 'v = Sr() || s,'] } },
    // ---- Step 2 (toolcards-06/07).
    { target: 'diff-counts.mjs', source: 'c60636ac6-Qhz8qfr3.js', exports: { Ze: 'DiffCounts' }, aliases: { Ze: 'i' },
      features: { Ze: [loose4('shownAdded: e.added,'), loose4('shownRemoved: e.removed')] } },
    { target: 'path-tooltip.mjs', source: 'shared-55-BRv2XBP7.js', exports: { mV: 'PATH_TOOLTIP_PROPS', gV: 'pathTooltipText' }, aliases: { mV: 'D', gV: 'k' },
      features: { mV: ['className: "max-w-[min(480px,var(--available-width))]"'], gV: ['dir: "ltr"', '"inline-block max-w-full whitespace-pre-wrap"'] } },
    // shared-frame Hm (exported Wu) and Um (exported Uu, which relative-path's VM reads to collapse control characters).
    { target: 'invisible-characters.mjs', source: official4.sharedFrame, exports: { Hm: 'stripInvisibleCharacters', Um: 'collapseControlCharacters' },
      aliases: { Hm: 'Wu', Um: 'Uu' },
      features: { Hm: [loose4('return e.replace(Bm(), Vm);')], Um: ['.replace(/[\\t\\n\\v\\f\\r\\u0085\\u2028\\u2029]+/g, " ")'] } },
    { target: 'icon-override.mjs', source: 'shared-18-Cfqwgjc5.js', exports: { tP: 'CARET_DROP_STYLE' }, aliases: { tP: 'Xs' },
      features: { tP: [loose4('tP = { translate: "0 0.5px" }')] } },
    { target: 'caret-override.mjs', source: 'cced621b6-BzJn1GRx.js', exports: { t: 'CARET_ICON_OVERRIDE' }, aliases: { t: 't' },
      features: { t: ['name: "CaretRightFilled", headSize: "sm"'] } },
    // shared-33 aG (exported dt): the card keyline shadow the summary card classes now interpolate.
    { target: 'card-shadow.mjs', source: 'shared-33-DtdykY0y.js', exports: { aG: 'CARD_SHADOW_CLASS' }, aliases: { aG: 'dt' },
      features: { aG: ['"shadow-[inset_0_0_0_1px_var(--cds-border)]"'] } },
    { target: 'summary-card.mjs', source: 'c425fb3cf-Gc8R9PSy.js',
      exports: { q: 'SummaryCardList', K: 'SummaryCardDivider', Q: 'DisclosureCaret', H: 'SUMMARY_CARD_CLASS', W: 'SUMMARY_CARD_SEE_ALL_CLASS' },
      aliases: { q: 'A', K: 'k', Q: 'r', H: 'x', W: 'C' },
      features: {
        q: ['role: "list",', 'className: "flex w-full min-w-0 flex-col",'], K: ['className: "-mx-[calc(var(--cds-pad-md)-1px)] h-px shrink-0 bg-alpha-2",'],
        Q: ['customSize: 14,', '"transition-transform duration-fast motion-reduce:transition-none"', '?? "CaretRight"', loose4('u = n ? 90 : 0,'), loose4('s = a ? void 0 : v,')],
        H: [loose4('`flex w-full select-text flex-col gap-1 rounded-lg px-md py-xs ${m}`')],
        W: [loose4('`epitaxy-summary-card-control-text flex w-full select-text flex-col gap-1 rounded-card px-md py-xs ${m}`')],
      } },
    { target: 'file-basename.mjs', source: 'shared-92-BOgyxePb.js', exports: { pk: 'fileBasename' }, aliases: { pk: 'vp' },
      features: { pk: ['Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\\\"))'] } },
    // shared-26 IA / MA / NA (exported hu / fu / du; 3.6556.2 jS / DS / OS): a Windows path, its drive and UNC prefixes.
    { target: 'windows-path.mjs', source: 'shared-26-B-POtn5S.js', exports: { IA: 'isWindowsPath', MA: 'WINDOWS_DRIVE', NA: 'WINDOWS_UNC' },
      aliases: { IA: 'hu', MA: 'fu', NA: 'du' },
      features: { IA: [loose4('return PA(e) || FA(e);'), { reads: [loose4('return MA.test(e);')] }], MA: ['/^[A-Za-z]:[\\\\/]/'], NA: ['/^(?:[\\\\/]{2}|[\\\\/]\\?\\?[\\\\/])/'] } },
    // shared-3 rN (exported bt; 3.6556.2 shared-28 TM): a path relative to a root; YM (St) a URL-shaped path and VM (rn)
    // the displayed path, which c856385e2 Et (the path tooltip text) reads.
    { target: 'relative-path.mjs', source: 'shared-3-IQTrO7Gx.js', exports: { rN: 'relativePath', YM: 'isUrlPath', VM: 'displayPath' },
      aliases: { rN: 'bt', YM: 'St', VM: 'rn' },
      features: { rN: ['if (!t) return r;', 'a.startsWith(`${o}/`) ? r.slice(i.length + 1) : r'], YM: ['/^[a-z][a-z\\d+.-]+:\\/\\//i.test(e)', 'e === e.trimEnd()'],
        VM: [loose4('return BM(zM(e, t, n?.relative));')] } },
    { target: 'muted-action-class.mjs', source: 'c761aa8b9-CdRbeywV.js', exports: { ea: 'MUTED_ACTION_CLASS' }, aliases: { ea: 't' },
      features: { ea: ['"text-[color:var(--muted-as-secondary,var(--cds-text-muted))] hover:text-secondary"'] } },
    { target: 'session-output-files.mjs', source: 'c19ad462c-CtMio9hE.js', exports: { n: 'SessionOutputFilesContext', r: 'useSessionOutputFiles' },
      aliases: { n: 't', r: 'n' }, features: { n: [loose4('n = t(new Map())')], r: [loose4('function r() { return e(n); }')] } },
    { target: 'file-icon-override.mjs', source: 'shared-2-CsjIBQD8.js', exports: { S4: 'fileIconOverride' }, aliases: { S4: 'Ut' },
      features: { S4: ['t && Object.hasOwn(x4, t) ? x4[t] : void 0'] } },
    // source-extensions.mjs (shared-6 QE) dropped since cds-core wave 5b: its only root is the cds-core publicName
    // sourceCodeExtensions (one Set for every graph); file-icon-name.mjs links it from cds-core.
    { target: 'file-kind-tables.mjs', source: 'shared-153-DMw2VzSq.js', exports: { Fw: 'RASTER_IMAGE_EXTENSIONS', tT: 'HIGHLIGHT_LANGUAGES' }, aliases: { Fw: 'Uh', tT: 'og' },
      features: { Fw: ['["png", "jpg", "jpeg", "gif", "bmp", "webp"]'], tT: ['"python.javascript.typescript.java.csharp.go.rust'] } },
    { target: 'file-icon-name.mjs', source: 'shared-9-BgdM6Y1f.js', exports: { MT: 'fileIconName' }, aliases: { MT: 'j' }, features: { MT: [loose4('return t === "skill" ? jT.skill : (Ba(kT(e)) ?? jT[t]);')] } },
    // c856385e2: the session file access contexts the card, the transcript rows' file links and the host read.
    { target: 'session-file-access.mjs', source: 'c856385e2-Cqx37C-b.js',
      exports: { Z: 'useSessionFileOpener', Ot: 'SessionFileOpenerProvider', vn: 'useDiffOpener', _n: 'DiffOpenerProvider', xn: 'useDiffPlacement',
        bn: 'DiffPlacementProvider', Wt: 'ReadRefusalProvider', Kt: 'useOutsideRootsCheck', qt: 'usePathOutsideRoots', Ht: 'useSessionLinksBlock',
        Vt: 'SessionLinksBlockProvider', Rr: 'SessionFileBlock', Ut: 'ReadRefusalContext', yn: 'DiffPlacementContext', Sn: 'useDiffPlacementWhenRefusing',
        Gt: 'isOutsideRoots', Et: 'pathDisplayText' },
      aliases: { Z: 'F', Ot: 'u', vn: 'N', _n: 'o', xn: 'at', bn: 's', Wt: 'f', Kt: 'L', qt: 'Y', Ht: 'P', Vt: 'c', Rr: 't', Ut: null, yn: null, Sn: null, Gt: null, Et: 'ut' },
      aliasOnly: Object.fromEntries(['Z', 'Ot', 'vn', '_n', 'xn', 'bn', 'Wt', 'Ht', 'Vt'].map(name => [name, 'context getter / provider'])),
      features: {
        Z: [loose4('function Z() { return s(Dt); }')], Ot: [loose4('Ot = Dt.Provider')], vn: [loose4('function vn() { return s(gn); }')], _n: [loose4('_n = gn.Provider')],
        xn: [loose4('function xn() { return s(yn); }')], bn: [loose4('bn = yn.Provider')], Wt: [loose4('Wt = Ut.Provider')],
        Kt: [loose4('(a, o) => e !== null && Gt(a, n, i, o && t !== null ? r : null)')], qt: [loose4('e !== null && t !== null && Gt(e, n, r, null)')],
        Ht: [loose4('function Ht() { return s(Bt); }')], Vt: [loose4('Vt = Bt.Provider')],
        Rr: ['t === "outside_roots"', 'defaultMessage: "This file is outside this session\\u2019s folders, so it can\\u2019t be opened here.",'],
        Ut: [loose4('Ut = l(null)'), { readBy: [loose4('(a, o) => e !== null && Gt(a, n, i, o && t !== null ? r : null)')] }],
        yn: [loose4('yn = l(null)'), { readBy: [loose4('return e === null ? null : s(yn);')] }], Sn: [loose4('return e === null ? null : s(yn);')],
        Gt: ['if (t === null) return !1;', loose4('return t(e, i === void 0 ? void 0 : { taskId: i }) && !r?.(e);')],
        Et: ['if (r === "windows" && pe(e)) return e;', '{ ...t, style: "posix" }', loose4('return _(s) === s.replace(Tt, "") ? s : Se(e, o);')],
      } },
    // cd8a7d7c0 _ (exported a): the path display options a hovered path reads (h, default { dots: "keep" }); v (exported
    // t) provides them (and m, the label options) — one instance of both contexts. linkExports m: the label options
    // context itself, so a linking graph (code-current-upper-v4 cd2efac6e dd BreadcrumbBody -> g, official export o,
    // `t(m)`) reads this instance instead of cutting a second createContext (D1).
    { target: 'path-display-options.mjs', source: 'cd8a7d7c0-DuH0T8rm.js', exports: { _: 'usePathHoverOptions', v: 'PathDisplayOptionsProvider' },
      linkExports: ['m'],
      aliases: { _: 'a', v: 't' },
      features: { _: [loose4('return t(h);'), { reads: ['dots: "keep"'] }], v: ['{ ...a, dots: "keep" }', loose4('e(h.Provider, { value: o, children: i })')] } },
    // c96d752d0 nrt (memo $nt): the Turn edits card; s$ a file row's stop, art a file row's opener, Znt the folder hints.
    { target: 'turn-edits-card.mjs', source: 'c96d752d0-D9VB6ArX.js',
      exports: { nrt: 'TurnEditsCard', s$: 'useTurnEditStop', art: 'useTurnEditFileOpener', Znt: 'turnEditFolderHints' },
      aliases: { nrt: null, s$: null, art: null, Znt: null },
      features: {
        nrt: [/^(?:var\s+)?[\w$]{1,4}\s*=\s*[\w$]{1,3}\(\s*[\w$]{1,4}\s*\)\s*;?\s*$/, { reads: ['defaultMessage: "{n, plural, one {Edited a file} other {Edited # files}}",', 'defaultMessage: "Undo", id: "JkS37H8PlA"'] }],
        s$: ['if (e(i, !0)) return "outside_roots";', 'if (t === null && n?.(i) === !1) return r ?? "plain";'],
        art: ['if (!t?.(r)) {', loose4('{ openDiffPane: e } = hg(),')],
        Znt: ['detail: n < 0 ? void 0 : t.slice(0, n) || "/",'],
        $nt: ['defaultMessage: "{n, plural, one {Edited a file} other {Edited # files}}",', 'defaultMessage: "{n, plural, one {Created a file} other {Created # files}}",',
          'defaultMessage: "{n, plural, one {Changed a file} other {Changed # files}}",', 'defaultMessage: "See all", id: "078WAre0KU"',
          'defaultMessage: "Total", id: "MJ2jZQxQnT"', 'defaultMessage: "Undo", id: "JkS37H8PlA"', 'defaultMessage: "Ask Claude to undo this turn\\u2019s file changes",',
          'defaultMessage: "View this turn\\u2019s changes", id: "00aRWTQr5k"', '"flex h-control min-w-0 items-center justify-between gap-sm px-xs"',
          loose4('O = x && D.length > 3,'), loose4('irt(r, "turn_edits_card")')],
        Qnt: ['`turn-edits:${t[0]?.calls[0]?.id ?? ""}`', 'a ? t : t.slice(0, 3)', 'p = t.length - 3,'],
        Xnt: ['defaultMessage: "Show less", id: "qyJtWyZ0yt"', 'defaultMessage: "Show {count} more", id: "Z184O6N3fq"', '"aria-expanded": n,'],
        Unt: ['t?.name === "Write" && t.toolUseResult?.type === "create"', '"created"', '"changed"'],
      } },
  ],
  // Original 4.16336.0 text the host wiring follows but cannot import (the 3.6556.2 callSites, re-located). Each
  // feature must appear in the prettier form of the declaration, which must be the only top-level declaration of its
  // chunk carrying them all; each import must still resolve to the named declaration of the named chunk.
  callSites: [
    // ---- Step 1.
    { source: 'cf74bc599-BytvntCE.js', binding: 'eT', role: 'Suggested task card: title clamp 6, bottom edge published while shown',
      features: [loose4('xe = j && k,'), loose4('Se = oS(iS, xe, Xw);'), 'ref: Se,', 'absolute top-[12px] inset-x-0', '"text-body text-primary break-words line-clamp-6"',
        '`text-footnote text-secondary break-words ${C ? "line-clamp-6" : "line-clamp-3"}`'] },
    { source: 'cf74bc599-BytvntCE.js', binding: 'gS', role: 'Sticky prompt bubble: the other publisher of the region edge (not in this host)',
      features: [loose4('O = oS(aS, D, 0)')] },
    { source: 'c89efce1a-CleBUUAy.js', binding: 'uu', role: 'Markdown table: the freeze hook reads the streaming flag and the rows (no third argument here)',
      features: [loose4('d = cu(Ne(), t),'), loose4('n("table", { ref: d, className: p, ...i, children: t })')] },
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'oCt', role: 'Feed row wrapper: reply for assistant rows, row otherwise',
      features: ['t.kind === "assistant" || t.kind === "assistantItem"', '? "reply"', ': "row",', 'surface: n,', loose4('tagsOf: N3,'), 'resetOn: r,', 'onRetry: i,', 'children: a,'],
      imports: { Bf: ['c4a9ee384-BWj_BT12.js', 'Jd'] } },
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'sCt', role: 'Row retry: forget the session tool expansion',
      features: [loose4('(fC(e), t !== null && uTe(t));')] },
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'lCt', role: 'Code feed: gate per session, resetOn = the row is the live tail',
      features: [loose4('Ct = Uf(i, !st),'), loose4('wt = sCt(tt.toolExpansionStore, i),'), 'x = t.kind === "loader" ? r : r && m,', 'e.codesOwnView === !0 ? "code" : "code_feed",'],
      imports: { Uf: ['c4a9ee384-BWj_BT12.js', 'yf'] } },
    { source: 'cf74bc599-BytvntCE.js', binding: '_D', role: 'Session pane: vS when the transcript is unavailable (new: ageLimitedByOrg)',
      features: ['T?.transcriptUnavailable && n', loose4('o(vS, {'), 'sessionRef: n,', 'title: T.title,', 'isArchived: T.isArchived === !0,',
        'ageLimitedByOrg: T.transcriptAgeLimitedByOrg === !0,', 'onSessionRemoved: f,'] },
    // ---- Step 2 (toolcards-06/07): where the turn edits card mounts and what Undo sends.
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'c1', role: 'Turn edits card gate: Vw (c585d217d g) for the session at the finished turn tail',
      features: ['turnEditsCardDrawn: u', loose4('u = Vw(s),'), loose4('f = u && r && !i,')], imports: { Vw: ['c585d217d-C-1Lrrpr.js', 'g'] } },
    // New in 4.16336.0: the card is behind the GrowthBook gate claudeai_cc_epitaxy_turn_edits_card again, and not drawn
    // for a local session h (c5da7eb42 Ri) holds.
    { source: 'c585d217d-C-1Lrrpr.js', binding: 'g', role: 'Turn edits card gate: GrowthBook claudeai_cc_epitaxy_turn_edits_card, and not h(session)',
      features: [loose4('t = r("claudeai_cc_epitaxy_turn_edits_card"),'), loose4('n = h(e);'), loose4('return t && !n;')] },
    { source: 'c585d217d-C-1Lrrpr.js', binding: 'h', role: 'Turn edits card: the local sessions the card is not drawn for',
      features: [loose4('return l(e?.id) && e?.type === "local";')] },
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'n1', role: 'Turn edits card row: data-find-omitted contents, at the finished turn tail; Undo only for the last entry',
      features: ['u = s && o && !i && t.synthetic !== !0', '"data-find-omitted": ""', 'className: "contents"', 'p = a ? n : void 0;'] },
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'ort', role: 'Undo: sends Wnt as the next message (host: main.jsx sendUndoTurn with undoTurnText)',
      features: ['Gx("turn_edits_undo")', 'text: Wnt(t)', 'source: "epitaxy_turn_edits_undo"'] },
    // New in 4.16336.0: each path is QTe-sanitised (backticks / line breaks dropped, escaped) and wrapped in backticks.
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'Wnt', role: 'Undo message text (host: turn-edits-model.mjs undoTurnText, in the UI language)',
      features: ['`\\`${QTe(e.path)}\\``', '`Undo the changes you made to ${t[0]} in your last turn and restore it to its previous state.`',
        '`Undo the changes you made to these ${t.length} files in your last turn and restore them to their previous state:`'],
      imports: { QTe: ['cc8941b7b-C4hsxbbb.js', 'Re'] } },
    // Step 2, toolcards-16: the runningIds hold and the branch it lives in (transcript rows' turnStatusRows branch).
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'VM', role: 'Running mark: runningIds keep the mark across wire gaps (turnStatusRows candidates only)',
      features: ['t?.runningIds?.some(l) ?? !1', loose4('h = f || (s === !0 && t !== void 0 && !t.wireRunning && p === t.key),'), 'tailHeld: w,'] },
    { source: 'c96d752d0-D9VB6ArX.js', binding: 't1e', role: 'Tool group: the candidate (with runningIds) under turnStatusRows; the running label holds 650 ms (rest key with the rows)',
      features: [loose4('Ie = Rv(),'), loose4('mt = pP(pt, 650, Ie ? Cy : void 0),'), 'runningIds: t.flatMap(i1e),'],
      imports: { Rv: ['ca7b95e24-BFvFgBI_.js', 'p'] } },
    { source: 'c96d752d0-D9VB6ArX.js', binding: 'pP', role: 'Held key: each shown key stays at least t ms',
      features: ['i = Math.max(t - r, d ? u - (n - (_.current ?? n)) : 0);'] },
    { source: 'ca7b95e24-BFvFgBI_.js', binding: 'p', role: 'turnStatusRows: the provider value, false without one', features: [loose4('return t(u) ?? !1;')] },
    { source: 'ca7b95e24-BFvFgBI_.js', binding: 'd', role: 'turnStatusRows provider: an outer provider wins, else GrowthBook __gb__2846116625',
      features: [loose4('i = t(u),'), loose4('o = a(l),'), loose4('s = i ?? o;'), 'u.Provider'] },
    { source: 'ca7b95e24-BFvFgBI_.js', binding: 'l', role: 'turnStatusRows flag', features: ['l = "__gb__2846116625"'] },
  ],
  // Style text a chunk injects with its `(function (e, t) { … })(id, css)` prelude, written out verbatim as CSS (now
  // also carrying the task card surface rules).
  inlineStyles: [
    { source: 'c425fb3cf-Gc8R9PSy.js', id: 'cbbd9b21e', target: 'summary-card.css',
      features: ['.epitaxy-root .epitaxy-summary-card-control-text{font-size:var(--cds-font-size-body--own,var(--cds-font-size-body));line-height:var(--cds-leading-body--own,var(--cds-leading-body))}'] },
  ],
};

// ---- 4.16336.0 engine ----------------------------------------------------------------------------------------------
// A chunk record is light until a declaration of it is cut, matched or scope-analysed (`full`): the export table is read
// from the shipped bytes (checked against the parsed one once the chunk is parsed), and declarations by name from a raw
// parse that keeps only their offsets. Parsed chunks no later module or call site reads are released (`release`), which
// keeps the 1.9 MB feed chunk and the shared chunks from piling up.
function exportTable4(text) {
  const exported = new Map();
  for (const match of text.matchAll(/export\s*\{([^}]*)\}\s*(?!\s*from)/g))
    for (const part of match[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [local, alias = local] = part.split(/\s+as\s+/);
      exported.set(alias.replace(/^"|"$/g, ''), local);
    }
  return exported;
}
async function readSource4(contract, name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(contract.official.ionSource, name));
  const text = bytes.toString();
  const record = { name, bytes, text, exported: exportTable4(text), raw: contract.rawSources.has(name), code: null, ast: null, program: null, formatted: new Map() };
  cache.set(name, record);
  return record;
}
async function full(src) {
  if (src.ast) return src;
  src.code = src.raw ? src.text : await format(src.text, { parser: 'babel' });
  src.ast = parsers.babel.parse(src.code, {});
  const parsed = new Map(src.ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  if (JSON.stringify([...parsed].sort()) !== JSON.stringify([...src.exported].sort())) throw Error(`${src.name}: export table read from the bytes differs from the parsed one`);
  return src;
}
function release(src) {
  src.code = null; src.ast = null; src.program = null; src.formatted = new Map(); src.depsIndex = null;
}
// A top-level declaration in the unformatted chunk bytes: the text cds-core hashes its bindings by.
function rawDeclarationText4(src, name) {
  if (!src.rawDeclarations) {
    src.rawDeclarations = new Map();
    for (const node of parsers.babel.parse(src.text, {}).program.body) {
      if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) src.rawDeclarations.set(node.id.name, [node.start, node.end]);
      if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') src.rawDeclarations.set(d.id.name, [d.start, d.end]);
    }
  }
  const range = src.rawDeclarations.get(name);
  if (!range) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(...range);
}
const topLevel4 = src => src.ast.program.body.flatMap(node => (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' ? [[node.id.name, node]]
  : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : []));
// A feature is a string (whitespace-insensitive), { loose } (R2/E5 looseFeature), a RegExp, or { reads: [features] }: the
// declaration reads a top-level binding of its chunk whose declaration, or a top-level declaration that assigns it,
// carries those features (used where the declaration itself is too small to tell apart, e.g. `return iV`).
// The declaration-deps scan over a per-chunk index (top-level declaration -> the top-level bindings it reads or writes),
// built once: scanning every binding of the 1.9 MB feed chunk per declaration dominated the run.
function deps4(src, name) {
  if (!src.depsIndex) {
    const ranges = topLevel4(src).map(([n, node]) => [n, node.start, node.end]).sort((a, b) => a[1] - b[1]);
    const ownerOf = at => {
      let lo = 0, hi = ranges.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (ranges[mid][2] < at) lo = mid + 1; else if (ranges[mid][1] > at) hi = mid - 1; else return ranges[mid][0];
      }
      return null;
    };
    src.depsIndex = new Map();
    for (const [binding, b] of Object.entries(scoped(src).scope.bindings))
      for (const q of [...b.referencePaths, ...b.constantViolations]) {
        const owner = ownerOf(q.node.start);
        if (owner === null) continue;
        if (!src.depsIndex.has(owner)) src.depsIndex.set(owner, new Set());
        src.depsIndex.get(owner).add(binding);
      }
  }
  return [...(src.depsIndex.get(name) ?? [])];
}
const featureMissing4 = (text, features = [], context) => features.filter(f => (f instanceof RegExp ? !f.test(text)
  : typeof f === 'string' ? !text.includes(f) && !normalised(text).includes(normalised(f))
    : f.reads ? !context || !readsFeature(context.src, context.name, f.reads)
      : f.readBy ? !context || !readByFeature(context.src, context.name, f.readBy) : !official4.looseFeature(f.loose, f.options).test(text)));
// { readBy: [features] }: a top-level declaration of the chunk that reads this one directly carries those features.
function readByFeature(src, name, features) {
  const program = scoped(src), b = program.scope.getBinding(name);
  if (!b) return false;
  const owners = new Set(b.referencePaths.map(q => { let x = q; while (x.parentPath && !x.parentPath.isProgram()) x = x.parentPath; return x.node; }));
  return [...owners].some(node => (src.raw ? rawCarries(src.code.slice(node.start, node.end), features) : !featureMissing4(src.code.slice(node.start, node.end), features).length));
}
function readsFeature(src, name, features) {
  const program = scoped(src), p = program.scope.getBinding(name)?.path;
  if (!p) return false;
  const owner = q => { let x = q; while (x && x.parentPath && !x.parentPath.isProgram()) x = x.parentPath; return x; };
  return deps4(src, name).some(dep => {
    const b = program.scope.getBinding(dep);
    if (!b || b.path.isImportSpecifier()) return false;
    const texts = [declarationText(src, b.path), ...b.constantViolations.map(q => owner(q)).filter(Boolean).map(x => src.code.slice(x.node.start, x.node.end))];
    return texts.some(text => (src.raw ? rawCarries(text, features) : !featureMissing4(text, features).length));
  });
}
// On a chunk parsed as shipped: string features squeezed, loose features without `;` / parentheses (see assertUniqueRoot4).
function rawCarries(raw, features) {
  const bare = text => text.replace(/[;()]/g, ' ');
  return features.every(f => (f instanceof RegExp ? f.test(raw) : typeof f === 'string' ? squeeze(raw).includes(squeeze(f))
    : f.loose ? official4.looseFeature(bare(f.loose), f.options).test(bare(raw)) : false));
}
function assertFeatures4(label, text, features = [], context) {
  const missing = featureMissing4(text, features, context);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f instanceof RegExp ? f.source : f)).join(', ')}`);
}
// A necessary condition on the shipped text of a declaration for its prettier form to carry `features`: every string
// literal and long identifier of each feature, with whitespace, parentheses, quotes, commas and semicolons removed.
const squeeze = text => text.replace(/[\s()'";,]/g, '');
function featureTokens(features) {
  return features.flatMap(f => (f instanceof RegExp || f.reads || f.readBy ? [] : typeof f === 'string' ? [squeeze(f)]
    : [...f.loose.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|[A-Za-z_$][\w$]{3,}/g)].map(m => squeeze(m[0])))).filter(Boolean);
}
// The root is the only top-level declaration of its chunk carrying every feature (byte-identical `twins` aside).
async function assertUniqueRoot4(label, src, name, features = [], twins = []) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const tokens = featureTokens(features), hits = [];
  for (const [local, node] of topLevel4(src)) {
    if (src.raw) {
      // Shipped text: string tokens squeezed, loose / RegExp features as written (both are whitespace-flexible); a
      // feature only the prettier form satisfies fails here loudly (the root itself would be missing), never silently.
      const raw = src.code.slice(node.start, node.end);
      if (!tokens.every(t => squeeze(raw).includes(t))) continue;
      const bare = text => text.replace(/[;()]/g, ' ');
      if (features.some(f => (f instanceof RegExp ? !f.test(raw) : f.loose ? !official4.looseFeature(bare(f.loose), f.options).test(bare(raw)) : false))) continue;
    }
    if (!featureMissing4(await featureText4(src, node), features, { src, name: local }).length) hits.push(local);
  }
  const expected = [name, ...twins].sort();
  if (JSON.stringify(hits.sort()) !== JSON.stringify(expected))
    throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
  const rootText = rawDeclarationText4(src, name).replace(/^(function |class )?[\w$]+/, '');
  for (const twin of twins) if (rawDeclarationText4(src, twin).replace(/^(function |class )?[\w$]+/, '') !== rootText)
    throw Error(`${label}: ${twin} is not a byte-identical twin of ${name}`);
}
async function featureText4(src, node) {
  const own = src.code.slice(node.start, node.end);
  if (!src.raw) return own;
  if (!src.formatted.has(node)) src.formatted.set(node, await format(node.type === 'VariableDeclarator' ? `var ${own};` : own, { parser: 'babel' }));
  return src.formatted.get(node);
}
// The prettier form of a declaration's same-chunk closure (what an adapter's features are pinned on).
async function closureText4(src, name) {
  const seen = new Set(), parts = [];
  const visit = async n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = scoped(src).scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(await featureText4(src, p.node));
    for (const dep of deps4(src, n)) await visit(dep);
  };
  await visit(name);
  return parts.join('\n');
}
function importOf4(src, local) {
  const p = scoped(src).scope.getBinding(local)?.path;
  if (!p?.isImportSpecifier()) throw Error(`${src.name}: ${local} is not an import`);
  return { file: p.parent.source.value.replace(/^\.\//, ''), alias: p.node.imported.name };
}
// sharedGraph 'cds-core': the manifest is on this version and snapshot, every module's bytes equal its recorded sha256
// and its sourceSha256 equals the official chunk read here, and every publicName is a binding its target module exports
// under exportName (the runSlicer sharedGraph contract, as extract-btw-pane.mjs / extract-approval-landing.mjs).
async function sharedGraph4(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(root, 'src/generated', area);
  const manifestText = await fs.readFile(path.join(dir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, held, published, manifestSha256: sha(manifestText) };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set / WeakSet (D46), or a
// module-level `let`/`var` binding some declaration reassigns.
function isModuleState4(contract, src, p) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = scoped(src).scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === contract.official.vendorFrame && contract.official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return true;
    }
  }
  return (scoped(src).scope.getBinding(p.node.id.name)?.constantViolations.length ?? 0) > 0;
}
const contractVersions4 = Object.freeze([V3, V4]);
// Every other 4.16336.0 region manifest's cut bindings, `${chunk}#${name}` -> regions (cds-core and this area's two
// outputs excluded).
async function foreignCuts4(contract) {
  const generated = path.join(root, 'src/generated'), own = new Set([path.basename(contract.output), contract.sharedGraph, 'r3b-transcript']);
  const cuts = new Map();
  for (const dirent of await fs.readdir(generated, { withFileTypes: true })) {
    if (!dirent.isDirectory() || own.has(dirent.name)) continue;
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(path.join(generated, dirent.name, 'manifest.json'), 'utf8')); } catch { continue; }
    for (const m of Array.isArray(manifest.modules) ? manifest.modules : []) {
      if ((m.referenceVersion ?? manifest.referenceVersion) !== contract.official.referenceVersion || typeof m.source !== 'string') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!cuts.has(key)) cuts.set(key, new Set());
        cuts.get(key).add(dirent.name);
      }
    }
  }
  return cuts;
}
async function linkedArea4(contract, key, src, local, linkedManifests) {
  const link = contract.linkedAreas?.[key];
  if (!link) return null;
  const { official } = contract, dir = path.join(root, 'src/generated', link.area);
  if (!linkedManifests.has(link.area)) {
    const text = await fs.readFile(path.join(dir, 'manifest.json'), 'utf8');
    linkedManifests.set(link.area, { text, manifest: JSON.parse(text) });
  }
  const { manifest } = linkedManifests.get(link.area);
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`linked ${link.area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
  if (manifest.sharedGraph !== contract.sharedGraph) throw Error(`linked ${link.area} does not link ${contract.sharedGraph}`);
  const m = manifest.modules.find(entry => entry.target === link.target);
  if (!m || (m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion || path.basename(m.source) !== src.name)
    throw Error(`linked ${link.area}/${link.target} is not a ${official.referenceVersion} slice of ${src.name}`);
  if (m.sourceSha256 !== sha(src.bytes)) throw Error(`linked ${link.area}/${link.target} was sliced from another ${src.name}`);
  if (sha(await fs.readFile(path.join(dir, link.target))) !== m.sha256) throw Error(`linked ${link.area}/${link.target} differs from its manifest`);
  const binding = m.bindings.find(b => (typeof b === 'string' ? b : b.name) === local);
  if (!binding?.sha256 || binding.sha256 !== sha(rawDeclarationText4(src, local))) throw Error(`linked ${link.area}/${link.target} ${key} is not the declaration ${src.name} ships`);
  if (m.exports?.[local] !== link.exportName) throw Error(`linked ${link.area}/${link.target} does not export ${local} as ${link.exportName}`);
  return { from: `../${link.area}/${link.target}`, name: link.exportName, kind: 'linked-area', area: link.area, original: local, linkedSha256: binding.sha256 };
}

async function extractR3bTranscriptV4({ check = false, contract = contract4, survey = false } = {}) {
  const { official, output, label } = contract;
  const cache = new Map(), files = {}, emitted = [], unresolved = [], stateConflicts = [], linkedManifests = new Map();
  const graph = await sharedGraph4(contract);
  const foreign = await foreignCuts4(contract), foreignStateSeen = new Set(), foreignStateCopies = [], foreignProblems = [];
  const manifest = {
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-r3b-transcript.mjs',
    adapterModule: 'src/source-r3b-transcript-adapters.jsx', sharedGraph: graph.area, cdsCoreManifestSha256: graph.manifestSha256,
    isolatedGraph: contract.isolatedGraph, modules: [], callSites: [], inlineStyles: [],
  };
  const sharedImport = (file, local) => {
    const shared = graph.published.get(`${file}#${local}`);
    return shared ? { from: `../${graph.area}/${shared.target}`, name: shared.exportName, kind: 'shared-graph', publicName: shared.name } : null;
  };
  const linkedSha = (src, file, local, shared) => {
    const held = graph.held.get(`${file}#${local}`);
    if (!held?.sha256 || held.sha256 !== sha(rawDeclarationText4(src, local))) throw Error(`${file}#${local} differs from the declaration ${graph.area} publishes as ${shared.publicName}`);
    return held.sha256;
  };
  for (const spec of contract.modules) {
    if (process.env.R3B_DEBUG) console.error(`[r3b-v4] ${spec.target} ${Math.round(process.memoryUsage().heapUsed / 1e6)}MB ${Math.round(performance.now())}ms`);
    const src = await full(await readSource4(contract, spec.source, cache));
    const program = scoped(src);
    if (spec.compilerHelpers) {
      const proved = official.assertCompilerHelpers(src.text);
      for (const [local, name] of Object.entries(spec.exports)) if (proved[name]?.local !== local) throw Error(`${spec.target}: ${local} is not the proved compiler helper ${name}`);
    }
    const roots = Object.keys(spec.exports);
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [];
    const add = async (name, chain) => {
      if (seen.has(name)) return;
      seen.add(name);
      const key = `${spec.source}#${name}`;
      const binding = program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const adapter = contract.adapters[file]?.[alias];
        const dep = await readSource4(contract, file, cache);
        if (adapter) {
          const local = dep.exported.get(alias);
          if (!local) throw Error(`${spec.target}: adapter alias ${via} is no longer exported`);
          assertFeatures4(`${spec.target}: adapter ${via} (${local})`, await closureText4(await full(dep), local), adapter.features);
          if (!contract.modules.some(m => m.source === file) && !contract.callSites.some(c => c.source === file)) release(dep);
          imports.set(name, { from: contract.adapterModule, name: adapter.name, via, kind: 'adapter', original: local,
            replacedSha256: sha(rawDeclarationText4(dep, local)) });
          return;
        }
        if (file === official.vendorFrame && official.reactAliases[alias]) {
          const { module, member } = official.assertVendorAlias(dep.text, alias);
          imports.set(name, { from: module, name: member, via, kind: 'react' });
          return;
        }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${file} does not export ${alias}`);
        const shared = sharedImport(file, local);
        if (shared) { imports.set(name, { ...shared, via, original: local, linkedSha256: linkedSha(dep, file, local, shared) }); return; }
        const linked = await linkedArea4(contract, `${file}#${local}`, await full(dep), local, linkedManifests);
        if (linked) { imports.set(name, { ...linked, via }); return; }
        const owner = emitted.find(m => m.source === file && m.exports[local]);
        if (owner) { imports.set(name, { from: `./${owner.target}`, name: owner.exports[local], via, kind: 'generated', original: local }); return; }
        if (!survey) throw Error(`${spec.target}: unresolved import ${via} (${local}) reached by ${chain.join(' <- ')}`);
        unresolved.push({ module: spec.target, via, local, held: graph.held.has(`${file}#${local}`), reachedBy: chain.join(' <- ') });
        imports.set(name, { from: '(unresolved)', name: local, via, kind: 'unresolved' });
        return;
      }
      const own = contract.chunkAdapters[spec.source]?.[name];
      if (own) {
        assertFeatures4(`${spec.target}: chunk adapter ${key}`, await featureText4(src, p.node), own.features);
        imports.set(name, { from: contract.adapterModule, name: own.name, via: key, kind: 'adapter', original: name, replacedSha256: sha(rawDeclarationText4(src, name)) });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator() && !p.isClassDeclaration()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      // One instance: a same-chunk binding an earlier module of this graph exports is imported from it.
      const holder = !roots.includes(name) && emitted.find(m => m.source === spec.source && m.exports[name]);
      if (holder) { imports.set(name, { from: `./${holder.target}`, name: holder.exports[name], via: key, kind: 'generated', original: name }); return; }
      const shared = sharedImport(spec.source, name);
      if (shared) { imports.set(name, { ...shared, via: key, original: name, linkedSha256: linkedSha(src, spec.source, name, shared) }); return; }
      const linked = !roots.includes(name) && await linkedArea4(contract, key, src, name, linkedManifests);
      if (linked) { imports.set(name, { ...linked, via: key }); return; }
      if (isModuleState4(contract, src, p)) {
        const silent = emitted.find(m => m.source === spec.source && m.selectedNames.includes(name));
        if (silent) throw Error(`${spec.target}: module state ${key} is held by ${silent.target} but not exported there`);
      }
      const held = graph.held.get(key);
      if (held) {
        if (isModuleState4(contract, src, p)) {
          stateConflicts.push({ binding: key, text: rawDeclarationText4(src, name).slice(0, 160), reachedBy: chain.join(' <- '), module: spec.target });
          if (!survey) throw Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${spec.target}: ${key} reached by ${chain.join(' <- ')}`);
        } else if (held.sha256 !== sha(rawDeclarationText4(src, name))) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area}/${held.target} holds`);
        heldByCdsCore.push(name);
      }
      if (isModuleState4(contract, src, p)) {
        const areas = [...(foreign.get(key) ?? [])].sort(), listed = contract.foreignState?.[key];
        if (areas.length || listed) {
          const problem = !listed ? `module state ${key} is also cut by ${areas.join(', ')} (D1: link it from there, or list it in foreignState)`
            : !areas.length ? `foreignState ${key} is no longer cut by another region; drop it`
              : !listed.anyAreas && JSON.stringify([...listed.areas].sort()) !== JSON.stringify(areas) ? `module state ${key} is cut by ${areas.join(', ')}, foreignState lists ${listed.areas.join(', ')}` : null;
          if (problem) foreignProblems.push({ module: spec.target, binding: key, areas, problem, reachedBy: chain.join(' <- ') });
          if (listed) {
            foreignStateSeen.add(key);
            foreignStateCopies.push({ binding: key, module: spec.target, ...(listed.anyAreas ? { anyAreas: true } : { areas: [...listed.areas].sort() }), reason: listed.reason,
              ...(listed.blocked ? { blocked: listed.blocked } : {}) });
          }
        }
      }
      if (!roots.includes(name) && spec.features?.[name]) assertFeatures4(`${spec.target}: ${name}`, await featureText4(src, p.node), spec.features[name]);
      selected.set(name, p);
      p.traverse({
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of deps4(src, name)) await add(dep, [key, ...chain]);
    };
    for (const name of roots) {
      const binding = program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.compilerHelpers) {
        const alias = spec.aliases?.[name];
        if (alias === undefined) throw Error(`${spec.target}: root ${name} names no export alias (null for a private root)`);
        if (alias !== null && src.exported.get(alias) !== name) throw Error(`${spec.target}: ${spec.source} exports ${alias} as ${src.exported.get(alias) ?? 'nothing'}, not ${name}`);
        if (alias === null && [...src.exported.values()].includes(name)) throw Error(`${spec.target}: private root ${name} is exported by ${spec.source}`);
        assertFeatures4(`${spec.target}: root ${name}`, await featureText4(src, binding.path.node), spec.features?.[name], { src, name });
        // aliasOnly: a same-shaped family (context getters / providers) the features cannot tell apart; the export alias
        // is the identity, and its role is pinned where it is read (callSites imports, the consumers' features).
        if (spec.aliasOnly?.[name]) { if (alias === null) throw Error(`${spec.target}: aliasOnly root ${name} must be exported`); }
        else await assertUniqueRoot4(spec.target, src, name, spec.features?.[name], spec.twins?.[name]);
      }
      await add(name, [`${spec.source}#${name} (root of ${spec.target})`]);
    }
    const unreached = Object.keys(spec.features ?? {}).filter(name => !selected.has(name) && !roots.includes(name));
    if (unreached.length) throw Error(`${spec.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
    // linkExports: selected bindings a linking graph imports from this one under their own names (D1: one instance; e.g.
    // cd8a7d7c0 m, the path label options context code-current-upper-v4's BreadcrumbBody reads), recorded in the manifest.
    for (const name of spec.linkExports ?? []) if (!selected.has(name) || spec.exports[name]) throw Error(`${spec.target}: linkExports ${name} is not a selected, unexported binding of ${spec.source}`);
    // A root cds-core publishes is linked and re-exported under this module's semantic name.
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    if (!order.length && !spec.compilerHelpers) throw Error(`${spec.target}: every root is linked; drop the module`);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${[...Object.entries(spec.exports), ...(spec.linkExports ?? []).map(name => [name, name])].map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${official.referenceVersion} bindings from ${spec.source}; generated by extract-r3b-transcript.mjs.\n// Edit the extractor or src/source-r3b-transcript-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unboundGlobals = globals.filter(name => !contract.hostGlobals.has(name));
    if (unboundGlobals.length) throw Error(`${spec.target}: unbound ${unboundGlobals.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion: official.referenceVersion,
      referenceSnapshot: official.referenceSnapshot,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}),
        ...(e.area ? { area: e.area } : {}), ...(e.replacedSha256 ? { replacedSha256: e.replacedSha256 } : {}),
        ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: spec.exports,
      ...(spec.linkExports?.length ? { linkExports: [...spec.linkExports].sort() } : {}),
      ...(spec.compilerHelpers ? {} : { roots: Object.fromEntries(roots.map(name => [name, spec.aliases[name]])) }),
      ...(spec.aliasOnly ? { locatedByAliasOnly: Object.keys(spec.aliasOnly) } : {}),
      heldByCdsCore,
    });
    emitted.push({ target: spec.target, source: spec.source, exports: spec.exports, selectedNames: [...selected.keys()] });
    const later = new Set([...contract.modules.slice(contract.modules.indexOf(spec) + 1).map(m => m.source), ...contract.callSites.map(c => c.source),
      ...contract.inlineStyles.map(c => c.source)]);
    for (const record of cache.values()) if (record.ast && !later.has(record.name)) release(record);
  }
  for (const site of contract.callSites) {
    const src = await full(await readSource4(contract, site.source, cache));
    const node = topLevel4(src).find(([n]) => n === site.binding)?.[1];
    if (!node) throw Error(`call site ${site.source}: no top-level ${site.binding}`);
    const text = await featureText4(src, node);
    assertFeatures4(`call site ${site.source}:${site.binding}`, text, site.features);
    await assertUniqueRoot4(`call site ${site.source}`, src, site.binding, site.features);
    const imports = {};
    for (const [local, [file, expected]] of Object.entries(site.imports ?? {})) {
      const resolved = importOf4(src, local);
      const dep = await readSource4(contract, resolved.file, cache);
      const target = dep.exported.get(resolved.alias);
      if (resolved.file !== file || target !== expected)
        throw Error(`call site ${site.source}:${site.binding}: ${local} resolves to ${resolved.file}:${target}, expected ${file}:${expected}`);
      imports[local] = `${file}:${resolved.alias} (${expected})`;
    }
    manifest.callSites.push({ source: site.source, referenceVersion: official.referenceVersion, binding: site.binding, role: site.role,
      sourceSha256: sha(src.bytes), sha256: sha(rawDeclarationText4(src, site.binding)), features: site.features, imports });
  }
  for (const style of contract.inlineStyles) {
    const src = await full(await readSource4(contract, style.source, cache));
    const hits = src.ast.program.body.filter(node => node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression'
      && node.expression.callee.type === 'FunctionExpression' && node.expression.arguments.length === 2
      && node.expression.arguments.every(arg => arg.type === 'StringLiteral') && node.expression.arguments[0].value === style.id);
    if (hits.length !== 1) throw Error(`${style.source}: expected one inline style ${style.id}, found ${hits.length}`);
    const call = hits[0].expression;
    assertFeatures4(`${style.source}: inline style prelude`, await format(`(${src.code.slice(call.callee.start, call.callee.end)});`, { parser: 'babel' }),
      ['n.querySelector(\'style[data-inline-css="\' + e + \'"]\')', 'r.setAttribute("data-inline-css", e);', '(r.textContent = t), n.head.appendChild(r)']);
    const css = call.arguments[1].value;
    assertFeatures4(`${style.source}: inline style ${style.id}`, css, style.features);
    files[style.target] = `/* Original Claude Desktop ${official.referenceVersion} style text that ${style.source} injects as <style data-inline-css="${style.id}">;\n`
      + `   generated by extract-r3b-transcript.mjs. Edit the extractor, never this file. */\n${css}\n`;
    manifest.inlineStyles.push({ target: style.target, source: style.source, referenceVersion: official.referenceVersion, id: style.id, sourceSha256: sha(src.bytes), sha256: sha(css), features: style.features });
  }
  for (const key of Object.keys(contract.foreignState ?? {}).filter(key => !foreignStateSeen.has(key)))
    foreignProblems.push({ binding: key, problem: `foreignState ${key} is no longer module state this graph cuts; drop it` });
  if (foreignProblems.length && !survey) {
    const text = foreignProblems.map(f => `${f.module ? `${f.module}: ` : ''}${f.problem}${f.reachedBy ? ` reached by ${f.reachedBy}` : ''}`).join('\n  ');
    if (!check) { const error = Error(`D1 module-state copies:\n  ${text}`); error.foreignProblems = foreignProblems; throw error; }
    console.warn(`[r3b-transcript-v4] D1 module-state copies another region changed (regenerate to fail closed):\n  ${text}`);
  }
  manifest.foreignStateCopies = foreignStateCopies;
  // The array form other generators read (extract-r3b-settings productionBlockers: strings or { area }).
  manifest.linkedAreas = [...linkedManifests.keys()].sort().map(area => ({ area, modules: [...new Set(Object.values(contract.linkedAreas)
    .filter(link => link.area === area).map(link => link.target))].sort() }));
  if (survey) return { unresolved, stateConflicts, foreignProblems, modules: manifest.modules.map(m => ({ target: m.target, bindings: m.bindings.map(b => b.name), heldByCdsCore: m.heldByCdsCore, imports: m.imports.map(i => `${i.local}<${i.kind}:${i.via}`) })) };
  if (stateConflicts.length) { const error = Error(`D46: ${stateConflicts.length} cds-core module states without publicName`); error.stateConflicts = stateConflicts; throw error; }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-r3b-transcript.mjs --release=${official.referenceVersion}.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-r3b-transcript.mjs --release=${official.referenceVersion}.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${count} original ${official.referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
export { contract4, extractR3bTranscriptV4, contractVersions4 as contractVersions };

// CLI: no flag = the 3.6556.2 production graph only (unchanged); --release=4.16336.0 = the isolated graph only; --all =
// both. verify-gen-r3b-transcript.mjs checks both contracts.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const release = process.argv.find(a => a.startsWith('--release='))?.slice('--release='.length);
  if (process.argv.includes('--survey')) console.log(JSON.stringify(await extractR3bTranscriptV4({ survey: true }), null, 1));
  else for (const version of process.argv.includes('--all') ? contractVersions4 : [release ?? V3]) await extractR3bTranscript({ check, version });
}
