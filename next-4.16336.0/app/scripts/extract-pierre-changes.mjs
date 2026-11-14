// Pierre Changes body (W14-code r6 pierre: R6DC-01 = r6pa-01 = gates-r6-11; E90 / E95 whole-block replacement): the
// 3.6556.2 Changes pane body, c44d00c7f qu (`var Ju = v(qu)`), the pierre CodeView (ca7ba268c Ba, exported `t`) that the
// main window's Jd draws when `pt = Le(!dt && !Ye)` holds (dt = W(), the pop-out window check; Ye = perFileList), with
// its custom file header (Xu, `var Zu = v(Xu)`), the screen-reader message "Show more lines" (lu, UT3lU03eUR, announced
// by qu's onPostRender over a partial diff), the line comments / drafts / review findings / PR comment store
// (cc8941b7b F and its action table I) and the patch prefetch scheduler (Vc). Nothing is executed (decision D0: own
// generator, own output folder src/generated/pierre-changes, own scripts/verify-gen-pierre-changes.mjs).
//
// It links every area the Code transcript renderer links plus that renderer itself (generated/code-transcript): pierre
// (ca7ba268c, the diffs-container custom element, Shiki and its themes), the CDS kit, TanStack Query (files-changes'
// file-browser-query.mjs, the app's one QueryClient) and the GrowthBook reader are imported from there, never sliced
// twice (D1). The bindings those areas slice for this closure are exported under their own names
// (scripts/code-transcript-links.json `linkExports['transcript-rows']` and `linkExports['code-transcript']`).
//
//   pierre-changes.mjs        c44d00c7f: Ju (PierreChanges), Zu (PierreChangesFileHeader), lu (pierreChangesMessages),
//                             mi (comparisonFileEntries: a comparison's files as the body's `files`, the content hash and
//                             order of Jd's `Q`), Vc (useDiffFetchScheduler: Jd's `St`, the four-slot patch / file-line
//                             read scheduler per session), Fc (PierreChangesCommentCard: Pc's line comment card).
//   pierre-cc8941b7b-*.mjs    cc8941b7b: F (useDiffAnnotationStore: annotationsBySession, draftsBySession,
//                             findingsBySession / findingsIndexBySession, activeBySession, scrollTargetBySession …) and
//                             I (diffAnnotationActions: addAnnotation, setReviewFindings, resolveReviewFindingPaths,
//                             dismissReviewFinding, scrollToAnnotation, clearScrollTarget …).
//   pierre-<chunk>.mjs        the originals the closure reaches in every other chunk, one module per chunk.
//
// The host (src/source-diff.jsx PierreChangesBody, behind src/host-growthbook.mjs local_pierre_changes_body) builds the
// comparison from its parsed patch, reads withheld patches through fetchFilePatch, sends a saved comment to the composer
// from the store (Jd's onAnnotationSaved is cccc2cf0a `requestComposerAction(submit ? "submit" : "focus")`) and writes
// its review findings into F (setReviewFindings / resolveReviewFindingPaths, Jd's Bt effect).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';
import { CODE_TRANSCRIPT } from './extract-code-transcript.mjs';

const root = path.resolve(import.meta.dirname, '..');
const C44 = 'c44d00c7f-Cr1FDL2F.js', CC89 = 'cc8941b7b-DAgMZRvX.js';

// Every other chunk the body reaches that no linked area holds: one module each (pierre-<chunk>.mjs).
const CHUNKS = [
  // (W14-code r6 gen-final-6, D1: c784da984, c9bc99274, cd59309dc, ceb49ada3 and shared-16 left the list: everything the body reads
  // of them is imported from files-changes / code-current / session-rail-changes / session-rail-kit, see linkedAreas.)
  'c219730b0-DGG9iA8k.js', 'c227f4d5e-B-FYKrwT.js', 'c3e58cab4-Cre5kjNX.js', 'c4d5c642f-D_0CUva6.js', 'c6788c1cb-JwKmcYjb.js',
  'c6e73333a-DjPHi7Jv.js', 'c82eca2bd-CImI7zNG.js', 'c91a5e4a6-xMjQN7Gn.js',
  'ca6e98a55-Cuuxbadn.js', 'cb50b3202-Be3mtbm0.js', 'cb8c5a88f-h6ooJ7Al.js', 'cc8da1d42-BHUuvGrf.js', 'cd14a8022-Bt1HiRdE.js',
  'cda9b4504-DgNLQLRr.js', 'cf56e4ee1-BrlV7F0T.js',
  'shared-18-D3y8YMFN.js',
  'shared-0-DDOOdL6P.js', 'shared-1-BJhqMmkf.js', 'shared-182-BI1KJccu.js', 'shared-19-DIKJVT7c.js',
  'shared-3-BCEbd8Fv.js', 'shared-46-BIbZBGFq.js', 'shared-78-D5Fw2h0a.js',
];
const CHUNK_EXTRAS = {
  // W14-code r8 (r8pa-02): plus what cd2efac6e Hu (the Files editor's comments, `{ G as co, I as uo, K as fo, N as po, q as _o }`)
  // reads of F: k (uo, the card key: `file:${endLine}` for a file comment), A (po, is a file comment key), Ie (fo, a file's
  // annotations less the held marks) and St (_o, a file's drafts).
  [CC89]: { internal: true, exports: { F: 'useDiffAnnotationStore', I: 'diffAnnotationActions', k: 'diffAnnotationKey', A: 'isFileAnnotationKey',
    Ie: 'useFileAnnotations', St: 'useFileAnnotationDrafts' },
    features: { F: ['annotationsBySession: {},', 'findingsIndexBySession: {},', 'scrollTargetBySession: {},'],
      I: ['scrollToAnnotation: F.getState().scrollToAnnotation,', 'setReviewFindings: F.getState().setReviewFindings,'],
      k: ['e.source === "file" ?'], A: ['e.startsWith(Se)'], Ie: ['heldMarksBySession[e]'], St: ['draftsBySession[e]?.[t] ?? Fe'] } },
};
const modules = [
  { target: 'pierre-changes.mjs', source: C44, internal: true,
    exports: { Ju: 'PierreChanges', Zu: 'PierreChangesFileHeader', lu: 'pierreChangesMessages', mi: 'comparisonFileEntries', Vc: 'useDiffFetchScheduler',
      Yc: 'DiffImageViewerContext', Xc: 'DiffImageViewerShownContext', Fc: 'PierreChangesCommentCard' },
    features: {
      Ju: ['var Ju = v(qu)'],
      Zu: ['var Zu = v(Xu)'],
      lu: ['defaultMessage: "Show more lines", id: "UT3lU03eUR"'],
      mi: ['lazy_file_hunks === !0', 'contentHash: xe(o),'],
      Vc: ['t.views += 1'],
      // Jd provides both around the body (`Xc` true where the comparison can read images; `Yc` {open(path), stale}): the
      // file header's "View image" (il / rl, reserveImageAction) reads them.
      Yc: ['y(null)'], Xc: ['y(!1)'],
      // W14-code r8 (r8pa-02): Fc, the Changes line comment card Pc draws for a saved comment or a draft (c82eca2bd st with
      // isActive = the session's active card key for the file, and the "Tell Claude what to change" placeholder). The host
      // per-file rows (FileDiff, the rollback and the pop-out window: Jd's Md list draws the same Pc) render it.
      Fc: ['defaultMessage: "Tell Claude what to change"', 'isActive: r, placeholder: i'],
    } },
  { target: `pierre-${CC89.replace(/\.js$/, '')}.mjs`, source: CC89, ...CHUNK_EXTRAS[CC89] },
  ...CHUNKS.map((chunk) => ({ target: `pierre-${chunk.replace(/\.js$/, '')}.mjs`, source: chunk, ...CHUNK_EXTRAS[chunk] })),
];
// c44d00c7f wc (`var wc = v(Cc)`, the review finding card Pc draws for `r.kind === "finding"`): the host's card over its
// session review store (source-pane-review.jsx PierreReviewFindingCard: generated/review-findings' copy of wc with the
// review's current / status / Fix / Next / Dismiss), so the body's findings act on the same review as the findings bar.
const localAdapters = {
  [`${C44}#wc`]: { name: 'PierreReviewFindingCard', features: ['v(Cc)'] },
};
// The call site the host follows: Jd mounts Ju only outside a pop-out window and without perFileList, with these props.
const callSites = [
  { source: C44, binding: 'Jd', role: 'The Changes pane (Jd): `pt = Le(!dt && !Ye)`; with pt the body is Ju (CodeView), else the per-file list (Md). Host: src/source-diff.jsx PierreChangesBody (local_pierre_changes_body)',
    features: ['pt = Le(!dt && !Ye),', 'n(Ju, {', 'foldsProvisional: Z,', 'fetchScheduler: St,', 'onAnnotationSaved: ne,', 'onStepPrComment: Nt,'] },
];
const linkedCopies = {
  ...CODE_TRANSCRIPT.linkedCopies,
  // turn-box's shared-1 $S (is the node the focused element) is pure; turn-box slices it without an export.
  'shared-1-BJhqMmkf.js#$S': 'sliced by turn-box without an export (pure: activeElement === node)',
};

export const PIERRE_CHANGES = {
  name: 'pierre changes', generator: 'extract-pierre-changes.mjs', output: path.join(root, 'src/generated/pierre-changes'),
  // The host boundaries are code-transcript's (useIntl / FormattedMessage over the host catalogue, the GrowthBook readers
  // over host-growthbook.mjs, datadog / telemetry, …), re-exported by src/source-pierre-changes-adapters.jsx, plus the one
  // stand-in of this area (localAdapters above).
  adapterModule: '../../source-pierre-changes-adapters.jsx', adapterFile: 'src/source-pierre-changes-adapters.jsx', adapters: CODE_TRANSCRIPT.adapters,
  localAdapters: { ...CODE_TRANSCRIPT.localAdapters, ...localAdapters },
  modules, callSites, stateCopies: CODE_TRANSCRIPT.stateCopies, linkedCopies,
  // code-current's string-count.mjs holds shared-78 Ky (countOccurrences, the one copy the sidebar hover card imports too).
  linkedAreas: [{ area: 'code-current', modules: ['string-count.mjs', 'pane-focus-target.mjs', 'terminal-action-bar.mjs'] }, ...CODE_TRANSCRIPT.linkedAreas, 'code-transcript',
    // W14-code r6 gen-final-6 (D1): the Changes pane's own small slices of c44d00c7f / shared-1 / shared-18 / c91a5e4a6 /
    // c6e73333a / c784da984 (files-changes: change anchors, the whitespace pause, the widget background, path segments,
    // the file order, the pane body's focus root), the review finding card's (review-findings), and the rail's PR bar
    // labels / context-menu marker (session-rail-changes): one copy each, imported from those areas.
    { area: 'files-changes', modules: ['diff-change-nav.mjs', 'node-hidden.mjs', 'diff-whitespace-pause.mjs', 'diff-widget-background.mjs', 'path-segments.mjs', 'file-entry-order.mjs', 'diff-pane-body.mjs'] },
    { area: 'review-findings', modules: ['review-finding-card.mjs', 'pane-focus-return.mjs'] },
    { area: 'session-rail-changes', modules: ['pr-bar-labels.mjs', 'context-menu-marker.mjs'] },
    // shared-16 xl (the lazily mounted menu body): session-rail-kit's one exported copy.
    { area: 'session-rail-kit', modules: ['lazy-body.mjs'] }],
  gate: { flag: 'local_pierre_changes_body', name: 'local_pierre_changes_body', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK; src/source-diff.jsx pierreChangesBodyOn' },
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractPierreChanges(options) {
  return runSlicer(PIERRE_CHANGES, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractPierreChanges({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
