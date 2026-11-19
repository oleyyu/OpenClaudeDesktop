// Cowork progress panel, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 5, region
// cowork-progress): the same semantic roots extract-cowork-progress.mjs cuts from 3.6556.2 into
// src/generated/cowork-progress, cut from the frozen 4.16336.0 snapshot into the isolated graph
// src/generated/cowork-progress-v4. The 3.6556.2 output is untouched (staged double output; no production switch:
// src/source-surfaces.jsx SourceCoworkProgress keeps reading src/generated/cowork-progress).
//
//   c21f11e6d-Cyj5xu_D  lE  CoworkProgressSection          (3.6556.2 vT; chunk-internal, rendered by xE)
//                       uE  CoworkEmptyOutputs             (3.6556.2 yT; the illustrated empty Outputs body)
//                       fE  CoworkOutputsSection           (3.6556.2 xT; the Outputs / Working folder(s) section)
//                       bE  CoworkFolderInstructionsDialog (3.6556.2 kT; renders SC, the CLAUDE.md editor modal)
//   cc5a62f6f-CsfnfFRu  I   CoworkPanel (export h; 3.6556.2 F)       R  CoworkPanelSection (export n; 3.6556.2 L)
//                       O   coworkPanelRow (export a; 3.6556.2 T)   ne CoworkPanelMergedContext (export _)
//                       re  CoworkPanelSectionToggleContext (export g)  E CoworkPanelLayoutContext (export m; 3.6556.2 w)
//                       w   coworkPanelFlatLayout (export d; 3.6556.2 C)  C coworkPanelCardLayout (export u; 3.6556.2 S)
//   Removed upstream: 3.6556.2 Bb CoworkFileBrowserDialog (the "Browse files" dialog behind the GrowthBook gate
//   claudeai_cowork_file_explorer_main). 4.16336.0 has no "cowork.file_explorer.opened" event, no gate key and no
//   "Browse files" (LPKxPHsYaQ) action in the Outputs section (fE): there is nothing to cut, so this graph does not
//   export the name (recorded in provenance.json `removedRoots`).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, plan.json cowork-progress `linked`): cowork-scheduled-v4, files-changes-v4, routines-shared-v4 —
//     every binding one of them already holds and exports is imported from it, never cut again; the ten pure bindings
//     files-changes-v4 cuts without exporting are cut again here (linkedCopies, each with its reason);
//   - host boundaries as localAdapters (file#local): the same official services the 3.6556.2 graph adapts (now in their
//     4.16336.0 chunks/locals) plus the account / analytics / config hooks routines-shared-v4 and cowork-scheduled-v4
//     adapt for the same bindings. src/source-cowork-progress-v4-adapters.jsx only re-exports those existing host
//     adapters. Each original is pinned by features and by its raw declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256
// pinned (ROOT_PINS). No pin is ever refreshed by a script.
//
// Illustrations: lE / uE render the empty-state art at "/images/illustrations/session-{progress,artifacts}[-dark].svg"
// (byte-identical to 3.6556.2 and to the served copies in public/images/illustrations, recorded in provenance.json).
// runSlicer has no rewrite for that root-relative path (the 3.6556.2 own engine rewrote it to "./images/…" for file://);
// the emitted text keeps the original path — a cutover item, not handled by editing generated text.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COWORK_PROGRESS_V4_OUTPUT = 'src/generated/cowork-progress-v4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, same pin as composer-env-v4 / code-start-v4).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const PANEL = 'c21f11e6d-Cyj5xu_D.js';
export const COLUMN = 'cc5a62f6f-CsfnfFRu.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [PANEL]: {
    lE: { name: 'CoworkProgressSection', export: null, probe: 'id:"sIMS7iH+wa"',
      features: ['p(Q, { defaultMessage: "Progress", id: "sIMS7iH+wa" })', 'disableTodoCommentAttachment: u,', 'disableCommentAttachment: u,',
        'defaultMessage: "{count} of {count}",', 'id: "BYBvgncezG",', 'values: { count: t.length },', 'headerHostedToggle: o,', 'contentClassName: _,',
        'collapsible: v,', 'headerLeftAction: y,', 'maxContentHeight: f,', 'shrinkTo: m,'] },
    uE: { name: 'CoworkEmptyOutputs', export: null, probe: 'id:"p41Nenxyun"',
      features: ['e = J0($, 0) ? K0($, 0, p(oE, {})) : $[0];', 'className: "flex flex-col items-start gap-3",',
        'defaultMessage: "View and open files created during this task.",', 'id: "p41Nenxyun",'] },
    fE: { name: 'CoworkOutputsSection', export: null, probe: 'id:"LtMr5Lrv6p"',
      features: ['p(Q, { defaultMessage: "Working folders", id: "LtMr5Lrv6p" })', 'p(Q, { defaultMessage: "Working folder", id: "jNSi3V9hUE" })',
        'defaultMessage: "Go to folder",', 'id: "EAUt85Zlu/",', 'Te?.writeLocalFile &&', 'children: " \\u00B7 CLAUDE.md",', 'isExpanded: S("__ungrouped__", 0),',
        'outputsByFolder: y,', 'userSelectedFolders: j,', 'enableAdditionalDirectoriesClaudeMd: m,'] },
    bE: { name: 'CoworkFolderInstructionsDialog', export: null, probe: 'setIsOpen:n,folderPath:r,sessionId:i',
      features: ['{ isOpen: t, setIsOpen: n, folderPath: r, sessionId: i } = e,', 'p(SC, { isOpen: t, onClose: a, folderPath: r, sessionId: i }),'] },
  },
  [COLUMN]: {
    I: { name: 'CoworkPanel', export: 'h', probe: 'shrinkSections:c',
      features: ['shrinkSections: c,', '{ flat: f } = s(E),', '"min-h-0 overflow-visible"', '"divide-y divide-alpha-1"', 'm = u ? "hidden" : "flex",'] },
    R: { name: 'CoworkPanelSection', export: 'n', probe: '"data-section-header":""',
      features: ['"data-section-header": "",', '"aria-expanded": h,', 't(u, { name: "CaretRight", size: G, rotate: K })', 'ae = s(re);', 'ce = ee(),',
        'maxContentHeight: C,', 'shrinkTo: w,'] },
    O: { name: 'coworkPanelRow', export: 'a', probe: 'glyph:"flex h-5 w-5',
      features: ['"can-focus -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded px-2 py-1.5 text-start hover:bg-fill-ghost-hover",',
        'glyph: "flex h-5 w-5 shrink-0 items-center justify-center text-secondary",', 'kind: "shrink-0 text-caption text-muted-as-secondary",'] },
    ne: { name: 'CoworkPanelMergedContext', export: '_', probe: 'ne=o(!1)', features: ['var ne = o(!1);'] },
    re: { name: 'CoworkPanelSectionToggleContext', export: 'g', probe: 're=o("always")', features: ['var re = o("always");'] },
    E: { name: 'CoworkPanelLayoutContext', export: 'm', probe: 'E=o(C)', features: ['var E = o(C);'] },
    w: { name: 'coworkPanelFlatLayout', export: 'd', probe: 'w={tooltipSide:"left"', features: ['var w = { tooltipSide: "left", tooltipSideOffset: 52, flat: !0 };'] },
    C: { name: 'coworkPanelCardLayout', export: 'u', probe: 'C={tooltipSide:"top"', features: ['var C = { tooltipSide: "top", tooltipSideOffset: 4, flat: !1 };'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c21f11e6d-Cyj5xu_D.js#lE': '06b5a8e65d32beef13047ab02ad74f771906bc18884a66338a290b5969f1fae7',
  'c21f11e6d-Cyj5xu_D.js#uE': '76912217689842ea27033b8e6795644644da309aff8ba3ea846e2a2ac4b805e2',
  'c21f11e6d-Cyj5xu_D.js#fE': '98616f8919ba729d3a6d779e804d34d251e60f1f262c219790384ba9d3ac03d3',
  'c21f11e6d-Cyj5xu_D.js#bE': '76e78c8e67acce9d1bc5fb012b228cbebeb3bfc7b1d03b95a8db8341ba45d1a2',
  'cc5a62f6f-CsfnfFRu.js#I': 'e46cf8881e3424315b5a50ecfae3bf72a20b5b6779d34d1d56032359dd064e34',
  'cc5a62f6f-CsfnfFRu.js#R': 'dbaee7d1067bfeb3d69e190dd68e2925cfb9258f941df60653b7167fff4c461f',
  'cc5a62f6f-CsfnfFRu.js#O': '015ea6a37c2e5a85b7107d14542f5a884dd8c44f8bc2ce191b4afcd37e030a5c',
  'cc5a62f6f-CsfnfFRu.js#ne': '2bb2e743171194bc43724b3bf535098ac7eb3c5ea99d4935e81f4f26bf3bd5af',
  'cc5a62f6f-CsfnfFRu.js#re': 'f56c18c6f02154f1d93342e7d6bcdcb0eac04d54104198237919b734e03c2808',
  'cc5a62f6f-CsfnfFRu.js#E': 'b8f9f49a15434403ebf12ea78b4069517e52c3c3307718ec2e8de0c06d568894',
  'cc5a62f6f-CsfnfFRu.js#w': '31489c39e7098a1a53bcbe4a2612918ab7765205ca8ec6c6abfc8e1ebc839e50',
  'cc5a62f6f-CsfnfFRu.js#C': '0bc636e95268e2a7bf1c0b274d321372c8e4fbd19ed05e0a15bad466c25498bb',
};
// 3.6556.2 roots with no 4.16336.0 counterpart (see the header).
export const REMOVED_ROOTS = [
  { name: 'CoworkFileBrowserDialog', previous: 'c21f11e6d-Cyd8_HO8.js#Bb', evidence: ['"cowork.file_explorer.opened"', '"claudeai_cowork_file_explorer_main"', 'id:"LPKxPHsYaQ"'],
    why: 'no 4.16336.0 chunk carries the file explorer event, its GrowthBook gate or the Outputs section\'s "Browse files" action' },
];

// ── Host boundaries: file#local -> { name (export of the adapter module), features, why } ───────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there).
const V3 = 'src/source-cowork-progress-v3-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx', RC = 'src/source-routine-cowork-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 shared-78 gK (useDesktopFrame): the section's dframe-card surface (R `ce = ee()` -> `ce ? m : ie`).
  'shared-123-1Hc1RTKl.js#_L': { name: 'useDesktopFrame', from: V3, features: ['t = cL(),', 'i = J4($, 0, r, t, e, n) ? K4($, 0, r, t, e, n, (e) => !0) : $[4];', 'return gn(i);'] },
  // 3.6556.2 c4038fd41 L (same local): a todo row's "Comment on this item" (the composer's pending attachment store).
  'c4038fd41-DJ01Davd.js#L': { name: 'useTodoCommentAttachment', from: V3, features: ['event_key: "activity_panel.feedback",', 'file_name: "todo_item.txt",', 'a = b(R);'] },
  // 3.6556.2 shared-0 oC: window["claude.web"].FileSystem.
  'shared-0-CnnWnVrT.js#BO': { name: 'FileSystem', from: V3, features: ['BO = globalThis["claude.web"]?.FileSystem'] },
  // Analytics (cowork-scheduled-v4 adapts the same shared-0 binding).
  'shared-0-CnnWnVrT.js#H': { name: 'trackEvent', from: RC, features: ['var H = P(Zw, N.O11Y_INTERNALS);'] },
  // Account / GrowthBook / analytics / errors / intl (routines-shared-v4 adapts the same bindings).
  'shared-25-D-aF0gt9.js#Z': { name: 'useCurrentAccount', from: RS, features: ['Error("Must call inside CurrentAccountProvider"),'] },
  'shared-25-D-aF0gt9.js#ko': { name: 'useFeatureIsOn', from: RS, features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
  'shared-62-DoCqVpIq.js#OT': { name: 'useAnalytics', from: RS, features: ['return ZS;'] },
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: RS, features: ['let e = k(qN);', 'Error("Must be called within ErrorsProvider"),'] },
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
  // 3.6556.2 shared-156 iw: the connector lookup over the claude.ai MCP store (cowork-scheduled-v4 adapts shared-183 GT).
  'shared-183-B2N6Zy4J.js#GT': { name: 'useConnectorLookup', from: RC, features: ['return X(WT);'] },
  'shared-36-fqRFYwOb.js#Db': { name: 'ConnectorServerIcon', from: RC, features: ['"connector-icon-globe-fallback"'] },
  // 3.6556.2 c21f11e6d by / ox / Sx: the working-documents funnel and the non-file output rows / thumbnail frame.
  'c21f11e6d-Cyj5xu_D.js#Ly': { name: 'CoworkWorkingDocuments', from: V3, features: ['localSessionId: t,', 'Ef(f, f?.readWorkingFile ?? null, u, s),', 'f === null'] },
  'c21f11e6d-Cyj5xu_D.js#Bx': { name: 'CoworkNonFileOutputRow', from: V3, features: ['{ item: t, handlers: n } = e,', 'switch (t.kind) {'] },
  'c21f11e6d-Cyj5xu_D.js#nS': { name: 'CoworkNonFileOutputsFrame', from: V3, features: ['{ outputs: t, handlers: n, children: r } = e,', 'o = J0($, 0) ? K0($, 0, { onlyForThumbs: !0 }) : $[0],'] },
  // The lazily loaded activity detail panes a row preloads (3.6556.2 c41de644f i, ca2ef848d e4 / O4): handles, not sliced.
  'ca2ef848d-DA54buzo.js#d6': { name: 'unavailableActivityDetail', from: V3, features: ['var d6 = l6.handle;'] },
  'ca2ef848d-DA54buzo.js#J6': { name: 'unavailableActivityDetail', from: V3, features: ['var J6 = K6.handle;'] },
  'c41de644f-DBYnEfUW.js#i': { name: 'unavailableActivityDetail', from: V3, features: ['var i = n.handle;'] },
  // 3.6556.2 ca2ef848d o1: the Office add-in bridge.
  'ca2ef848d-DA54buzo.js#Y1': { name: 'useConnectedOfficeFiles', from: V3, features: ['e = J0($, 0) ? K0($, 0, []) : $[0];', 'return (w(W1, e), N1(Dd(X1)));'] },
  // 3.6556.2 shared-6 lb / db: download one output / a batch.
  'shared-6-2QYRw_Wv.js#Sf': { name: 'useDownloadOutput', from: V3, features: ['bf(e, i, "files_api"),', 's = a.replace("computer://", "");'] },
  'shared-6-2QYRw_Wv.js#wf': { name: 'useDownloadOutputs', from: V3, features: ['{ track: e } = X(),', 'pf(i.servedUrl, {', 'return n && xe?.writeFileDownload ? r : null;'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'shared-123-1Hc1RTKl.js#_L': '0783ed367cf5de2bfa80c4046f05108112d45505b9ebbd4d876a10e482a4fb2a',
  'c4038fd41-DJ01Davd.js#L': '36756251cab773dc7db2b36b47c83c5d4041ad4d6f897c16c6972df9b7918ab2',
  'shared-0-CnnWnVrT.js#BO': '488875013f25e15f8cb15e1e79a7a68302af07c36824f9bc9b36b345672313d8',
  'shared-0-CnnWnVrT.js#H': 'e13bfb51ca0c80f098c73bedd739282ad7ea49e70db956178d06103fc7ca872b',
  'shared-25-D-aF0gt9.js#Z': '65456efed4ffae1a16e739336c231a59f0f8fd4f0523de0d58b1ae8c18f0eb74',
  'shared-25-D-aF0gt9.js#ko': 'e464cf91ab4b3e69b54bd9ab46a2b248691395fd4fb7d28be593006226268ffa',
  'shared-62-DoCqVpIq.js#OT': '3c633717a8860b212c950b6eae2980d9f443be740871672219540c921d1525e1',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'shared-183-B2N6Zy4J.js#GT': '60aac22a6b69a7f2ba3f06ce5889debcdd70f931cb83eb4fd43b39b6ba952e4e',
  'shared-36-fqRFYwOb.js#Db': '9c394533d20e4a6fbbe28762552bb5868d66398c282cbea4f004122870745482',
  'c21f11e6d-Cyj5xu_D.js#Ly': 'd54c5915da3f621ab262862d3c162938f3a122643e33e9c401f41dae12564518',
  'c21f11e6d-Cyj5xu_D.js#Bx': '50a49834ea857c697dd9293887e26511a33b3a2762e1fc88588268515fc7e942',
  'c21f11e6d-Cyj5xu_D.js#nS': 'ce2cdbf5a8130913273bbc62e3bc61cd9b0ad3cfd4ff8e756ceea0a005862998',
  'ca2ef848d-DA54buzo.js#d6': 'f7373a3c77513f29dda9e8024809511cb3e72d4023d4fc3b2a4b572d5e2d9708',
  'ca2ef848d-DA54buzo.js#J6': 'f48ded72cd2175ac64b59d5feff1eb70f29dd64b61e5c7fe74bbb89963ddce98',
  'c41de644f-DBYnEfUW.js#i': 'a046900903c95f4c08f6f46b212434cf7c592571aa360f2d53b6cf5ef0d15468',
  'ca2ef848d-DA54buzo.js#Y1': '064ebfa1c5d21d633527cdb5e64143ef2f4abc030f26ae693ec8a6bde62d7016',
  'shared-6-2QYRw_Wv.js#Sf': 'bdf3c0f65f134b4306627f70d3e4a68fc399570596e4fc37e7bb892c8ab557f4',
  'shared-6-2QYRw_Wv.js#wf': '7b2b138bfa0e0bdafa3897f02cbb21ea74ad13b3d954a978b6aee3e523e3ce9d',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

// Pure bindings files-changes-v4 cuts without exporting (its file-browser-query.mjs / file-kind-icon-name.mjs export
// tables are semantic); cut again here, each hashing as the official declaration (no module state: functions, the
// hasOwnProperty alias and a constant name table).
const linkedCopies = {
  'vendor-query-Bl2Kfzgk.js#E': 'TanStack replaceEqualDeep (structural sharing of the output rows), a pure function',
  'vendor-query-Bl2Kfzgk.js#te': 'isPlainArray, pure', 'vendor-query-Bl2Kfzgk.js#O': 'isPlainObject, pure', 'vendor-query-Bl2Kfzgk.js#ne': 'hasObjectPrototype, pure',
  'vendor-query-Bl2Kfzgk.js#ee': 'Object.prototype.hasOwnProperty alias, immutable',
  'shared-9-BgdM6Y1f.js#mT': 'file name -> file kind, pure', 'shared-9-BgdM6Y1f.js#kT': 'file extension, pure', 'shared-9-BgdM6Y1f.js#AT': 'extension -> icon kind, pure',
  'shared-9-BgdM6Y1f.js#jT': 'icon kind -> icon name table, a constant object no declaration writes', 'shared-9-BgdM6Y1f.js#ET': 'file name -> icon kind, pure',
};

const LINKED_AREAS = ['cowork-scheduled-v4', 'files-changes-v4', 'routines-shared-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
    // linkExports ie (D1): cowork-runs-v4 (Runs card, xT) reads the same card-surface class string of cc5a62f6f, so it
    // links it from here instead of cutting cc5a62f6f again (no other 4.16336.0 graph holds cc5a62f6f bindings).
    ...(file === COLUMN ? { linkExports: ['ie'] } : {}),
    // linkExports eC / iE (D1): cowork-context-v4 (the Context section gE, round2) renders the same activity list eC
    // (= memo(QS); its closure holds the contexts nx / rx / ix and the collections AS / cx) and the light/dark
    // illustration frame iE (its empty body sE), so it links them from here instead of cutting c21f11e6d again.
    ...(file === PANEL ? { linkExports: ['eC', 'iE'] } : {}),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation).
  ...[
    'c1373296b-gC0Js3QC.js', 'c2105d154-C-zdMoZ6.js', 'c4038fd41-DJ01Davd.js', 'c83ff2dc8-3fRg4SBd.js', 'ca2ef848d-DA54buzo.js', 'cc81dcab6-CqMU1nx_.js',
    'shared-0-CnnWnVrT.js', 'shared-1-D1bGaTaN.js', 'shared-120-DCdTP1_5.js', 'shared-123-1Hc1RTKl.js', 'shared-153-DMw2VzSq.js', 'shared-183-B2N6Zy4J.js',
    'shared-2-CsjIBQD8.js', 'shared-212-BHMAi0oa.js', 'shared-25-D-aF0gt9.js', 'shared-3-IQTrO7Gx.js', 'shared-31-C9BqSSuD.js', 'shared-33-DtdykY0y.js',
    'shared-36-fqRFYwOb.js', 'shared-38-DyF0_Fim.js', 'shared-4-C_EiQb9h.js', 'shared-5-u8kha2eH.js', 'shared-6-2QYRw_Wv.js', 'shared-62-DoCqVpIq.js',
    'shared-8-BqfCbkJd.js', 'shared-9-BgdM6Y1f.js', 'shared-92-BOgyxePb.js', official.sharedFrame, 'vendor-query-Bl2Kfzgk.js',
  ].map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): the contexts and layouts the host provides / reads by name.
const rawCallSites = [
  { source: COLUMN, role: 'The merged / section-toggle / layout contexts (createContext = vendor-frame no) and the card / flat layouts, with their export aliases',
    features: ['no as o,', 'ne=o(!1),re=o("always"),C={tooltipSide:"top",tooltipSideOffset:4,flat:!1},w={tooltipSide:"left",tooltipSideOffset:52,flat:!0},T={...w,tooltipSideOffset:64,square:!0},E=o(C),D=o(!0),O={button:"can-focus',
      'I as h,', 'R as n,', 'O as a,', 'ne as _,', 're as g,', 'E as m,', 'w as d,', 'C as u,'] },
  { source: PANEL, role: 'xE (the activity panel CoworkSessionView renders) renders lE with the todo comment branch and the reveal request',
    features: ['p(lE,{todos:t,allTodosCompleted:', 'disableTodoCommentAttachment:ge,revealTodo:xr,', 'HF as CoworkSessionView'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The removed roots stay removed: none of their evidence strings occurs in any 4.16336.0 renderer chunk.
async function assertRemoved() {
  const names = (await fs.readdir(official.ionSource)).filter(n => n.endsWith('.js'));
  const out = [];
  for (const removed of REMOVED_ROOTS) {
    for (const name of names) {
      const text = await fs.readFile(path.join(official.ionSource, name), 'utf8');
      for (const ev of removed.evidence) if (text.includes(ev)) throw Error(`${removed.name}: ${ev} occurs in ${name}; the root is no longer removed upstream`);
    }
    out.push({ ...removed, checkedChunks: names.length });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, 'src/source-cowork-progress-v4-adapters.jsx'), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`source-cowork-progress-v4-adapters.jsx: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`source-cowork-progress-v4-adapters.jsx: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the cowork-progress-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function coworkProgressV4Config() {
  return {
    name: 'cowork progress (4.16336.0)', generator: 'extract-cowork-progress-v4.mjs', output: path.join(root, COWORK_PROGRESS_V4_OUTPUT),
    adapterModule: '../../source-cowork-progress-v4-adapters.jsx', adapterFile: 'src/source-cowork-progress-v4-adapters.jsx', adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2 prestage tools/probe.mjs) explores the same configuration.
export const probeConfig = coworkProgressV4Config;

export async function extractCoworkProgressV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const removedRoots = await assertRemoved();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const illustrations = [];
  for (const name of ['session-progress.svg', 'session-progress-dark.svg', 'session-artifacts.svg', 'session-artifacts-dark.svg']) {
    const bytes = await fs.readFile(path.join(official.snapshotRoot, 'ion-dist/images/illustrations', name));
    const served = await fs.readFile(path.join(root, 'public/images/illustrations', name)).catch(() => null);
    illustrations.push({ url: `/images/illustrations/${name}`, sha256: sha(bytes), servedCopyIdentical: served !== null && served.equals(bytes) });
  }
  const cfg = {
    ...coworkProgressV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the cowork-progress roots (${official.referenceVersion}); generated by extract-cowork-progress-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-cowork-progress-v4.mjs',
          previous: { generator: 'scripts/extract-cowork-progress.mjs', output: 'src/generated/cowork-progress', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, removedRoots, adapters, linkedCopies,
          illustrations: { items: illustrations, note: 'root-relative URLs kept as in the official text (no runSlicer rewrite); cutover item for file:// loading' },
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractCoworkProgressV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
