// Code start card, Claude Desktop 4.16336.0 (surface migration "code-start"; pilot analysis/claude-4.16336.0-migrate-20261104/
// surface-pilots/code-start, review P1s fixed here). Sliced by the working line's runSlicer engine (scripts/extract-working-line.mjs)
// from the frozen snapshot (scripts/official-4.16336.0.mjs, snapshots/claude-4.16336.0-20261104) into src/generated/code-start-v4,
// linking the finalized cds-core graph (engine cfg.sharedGraph 'cds-core'): every CDS binding the closure reaches is imported
// from src/generated/cds-core under its publicName; a binding cds-core holds without one is re-sliced only when it is pure
// (module state stops generation, D46). The 3.6556.2 graph (extract-code-start.mjs -> src/generated/code-start) stays until
// its last consumer moves (home-path, environment menu, composer folder menu).
//
// Draft page call chain (cc43287c9 fAe, not sliced): U = shared-39 Nx (GrowthBook claudeai_cc_epitaxy_session_presets_main);
// face = shared-20 Ob({environments: U}); show = Tb(landing) && kb({face, inSplitWindow}); face === "start-card" ? MQ({slotRef})
// : hJ (greeting). The card is portalled into the slot by jye -> Nye (data assembly, task backlog q8) -> Aye. The host plays
// jye / Nye (src/source-code-start.jsx over the local task backlog) and renders the official Aye into the official MQ slot.
//
// Roots (start.mjs, cc43287c9-dzfX-J5i.js), each located on the official AST: it must be the only top-level declaration of its
// chunk carrying all its features, under the pinned local, and its raw declaration hashes to the pin below (reviewed).
//   MQ   StartSlot               the draft page's slot (`max-h-0 grow basis-0` spacer + the card's portal target)
//   DQ   useStartSlotMeasure     MQ's ref hook: `function DQ(){return OQ}` (3.6556.2 OK)
//   OQ   measureStartSlot        the slot measurement itself (3.6556.2 kK; review P1: not the hook)
//   Aye  StartCard               Recent folders / environments + Choose environment + Next steps (3.6556.2 ele)
//   Dve  StartNextSteps          Next steps: setup rows, waiting sessions, suggested tasks (3.6556.2 Bce)
//   kye  StartEnvironmentRow     one recent environment row (3.6556.2 X5)
//   s3   useStableEnvironmentOrder  stable order of the recent environments by activity (3.6556.2 s8)
//   Y6   clawdReplayStore        the Clawd replay token store (3.6556.2 B6)
//   m_e  clawdClassName          the ClawdLaptop className g_e passes (3.6556.2 jfe)
// face.mjs (shared-20-DUEo90UF.js): Ob startFace (exported ms), kb showStartSlot (exported fs).
// clawd-replay.mjs (artifact): ClawdLaptopInner's replayOnClick button classes, the one template literal of
// cc13f8cc7-COuBECEu.js that follows `${className ?? ""}` (the lottie chunk itself is the host's SourcePet).
//
// Host boundaries (report.json hostAdapterContract) answer from src/source-code-start-v4-adapters.jsx.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CODE_START_V4_OUTPUT = 'src/generated/code-start-v4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The finalized cds-core graph this area was reviewed against (cds-integrate/wave4/wave4-merged.json manifestSha256.production).
// The engine checks every cds-core module's bytes against that manifest; this pin makes a regenerated cds-core an explicit stop
// (re-run, review the closure, update the pin) instead of a silent relink. No cds-core generator config is read.
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const START = 'cc43287c9-dzfX-J5i.js';
const FACE = 'shared-20-DUEo90UF.js';
const CLAWD = 'cc13f8cc7-COuBECEu.js';
const OLD_START = 'cc43287c9-Me-M2ucD.js';

// Cross-chunk host boundaries: chunk -> export alias -> { name (adapter export), local, features of the replaced declaration }.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl / StartMessage).
  [official.vendorIntl]: {
    p: { name: 'useStartIntl', local: 'q', features: ['let e = l(K);', 'return (Mt(e), e);'] },
    l: { name: 'StartMessage', local: 'Gt', features: ['Gt = a(Wt, Ut)'] },
  },
  // shared-5 Y_ / j_: a persisted per-account preference and "preferences loaded" (Dve's dismissals `startCardDismissals`).
  'shared-5-u8kha2eH.js': {
    wp: { name: 'useStartPref', local: 'Y_', features: ['legacyLocalStorageKey', 'seedFromPref', 'scope === "account"'] },
    Ep: { name: 'useStartPrefsSettled', local: 'j_', features: ['return l(w_, N_, M_);'] },
  },
  // c26fb8b6b K: useOpenLinkedSession (desktop router + session stores). Host: StartHostContext.onOpenSession(session.id).
  'c26fb8b6b-DXUqD5LQ.js': {
    i: { name: 'useStartNavigation', local: 'K', features: ['useOpenLinkedSession: the route built for a linked session does not parse as a session route'] },
  },
  // shared-123 YS: a session row's href under the desktop route base. Host rows are not links.
  'shared-123-1Hc1RTKl.js': {
    Vv: { name: 'useStartSessionHref', local: 'YS', features: ['encodeURIComponent(t)'] },
  },
  'shared-25-D-aF0gt9.js': {
    // vf: drag-to-split intent of a session row (desktop pane DnD); the host only asks vf(null) (no href).
    Tp: { name: 'startDragIntent', local: 'vf', features: ['if (e === null && t === void 0) return _f;'] },
    // No: a GrowthBook string flag (g_e's Clawd animation `__gb__816608852`, default "") from HOST_GROWTHBOOK.
    Pg: { name: 'useGrowthBookString', local: 'No', features: ['if (!t || !r?.growthbook) return n;', 'return typeof i == "string" ? i : n;'] },
  },
  // shared-38 Ln: the composer pane class OQ measures against (".epitaxy-chat-panel"); host: .source-chat-tile-content.
  'shared-38-DyF0_Fim.js': {
    Ot: { name: 'composerPaneClassName', local: 'Ln', features: ['Ln = "epitaxy-chat-panel"'] },
  },
  // c68c4283d: start-card row analytics (claudeai.desktop.code.landing.row_*). The host sends no product analytics.
  'c68c4283d-FxwfdZSA.js': {
    $f: { name: 'startRowShownEvent', local: 'ke', features: ['"claudeai.desktop.code.landing.row_shown"'] },
    Qf: { name: 'startRowPressedEvent', local: 'Ae', features: ['"claudeai.desktop.code.landing.row_pressed"'] },
    Zf: { name: 'startRowDismissedEvent', local: 'je', features: ['"claudeai.desktop.code.landing.row_dismissed"'] },
  },
};

// Same-chunk declarations of the start chunk that are host boundaries.
const localAdapters = {
  // fve: Home's sessions awaiting input (allSessions + live status + approvals). Host: code-start-host-model startWaitingSessions.
  [`${START}#fve`]: { name: 'useWaitingSessions', features: ['allSessions', 'isSsh: e.remote?.kind === "ssh"', '"permission" : "question"'] },
  // NW: the lazily loaded ClawdLaptop lottie (cc13f8cc7). Host: source-pet.jsx SourcePet via StartHostContext.ClawdLaptop.
  [`${START}#NW`]: { name: 'StartClawdLaptop', features: ['NW = MW.Component'] },
  // Gated branches (report.json gatedBranchDecisions): the host never passes their inputs; the adapters throw if rendered.
  [`${START}#aye`]: { name: 'StartRepoRowsGated', features: ['memberships_incomplete', 'githubConnected:', 'cloudDraft:', 'analyticsConsent:'] },
  [`${START}#Eve`]: { name: 'StartTaskOptionsGated', features: ['recheckCloud', 'Options for \\u201C{title}\\u201D'] },
};

// Root features (prettier form). `probe`: a raw-text token of the declaration used to pick candidates before formatting.
const rootSpecs = {
  [START]: {
    MQ: { name: 'StartSlot', old: 'PK', probe: 'max-h-0 grow basis-0', features: ['"max-h-0 grow basis-0"', '"flex min-h-full w-full flex-col pb-6"', '"aria-hidden": !0', 'n = DQ()'] },
    DQ: { name: 'useStartSlotMeasure', old: 'OK', probe: 'return OQ', features: ['function DQ() {', 'return OQ;'] },
    OQ: { name: 'measureStartSlot', old: 'kK', probe: '.epitaxy-prompt', features: ['.epitaxy-prompt', '--cds-rem-scale', 'wQ.set(r, s)', 'e.toggleAttribute(_Q, !_)'] },
    Aye: { name: 'StartCard', old: 'ele', probe: 'epitaxy-start-card', features: ['"epitaxy-start-card"', '"Recent folders"', '"Recent environments"', '"start-card-environments"', '"start-card-choose"', '"Choose environment"', 'repoRows:', 'chooseAlone:'] },
    Dve: { name: 'StartNextSteps', old: 'Bce', probe: 'start-card-setup', features: ['"Next steps"', '"start-card-setup"', 'startContext', 'onDeleteAll', '"waiting-session"', '"suggested-task"'] },
    kye: { name: 'StartEnvironmentRow', old: 'X5', probe: 'start-card-environment"', features: ['"start-card-environment"', '"aria-current": d', '"px-1 pt-0.5 first:pt-1"'] },
    s3: { name: 'useStableEnvironmentOrder', old: 's8', probe: 'findIndex', features: ['let a = n.findIndex((t) => (e.get(t) ?? 0) < i);', 'n.splice(a === -1 ? n.length : a, 0, r);', 'a = [...e.keys()].join('] },
    // The recent environment rows dxe hands the card (Po): Dye over the environment items (3.6556.2 $ce, now with the
    // label context {home} for the ~-relative path), Oye over the recent folders when no environment row exists (new), V5
    // the folder row id, and B5 the last use per row id that s3 orders by (3.6556.2 Qce).
    Dye: { name: 'startEnvironmentRows', old: '$ce', probe: 'sshHosts', features: ['labelContext: t,', 'sshOffered: n,', 'where: { kind: "path", text: Yg(o.cwd, t) }', 'where: { kind: "host", text: c.label }'] },
    Oye: { name: 'startFolderRows', old: null, probe: 'Folder', features: ['icon: "Folder",', 'id: V5(e),', 'where: { kind: "path", text: Yg(e, t) },', 'folder: e,'] },
    V5: { name: 'folderRowId', old: null, probe: 'folder:', features: ['return `folder:${e}`;'] },
    B5: { name: 'environmentLastUsed', old: 'Qce', probe: 'autoStartedAt', features: ['autoStartedAt: n,', 'dateBy: r = "pick",', 'e.pickedAt !== 0'] },
    Y6: { name: 'clawdReplayStore', old: 'B6', probe: 'requestReplay', features: ['token: 0,', 'requestReplay:'] },
    m_e: { name: 'clawdClassName', old: 'jfe', probe: '-scale-x-100', features: ['right-[-13px]', 'w-[80px] h-[80px] -scale-x-100'] },
  },
  [FACE]: {
    Ob: { name: 'startFace', old: '$h', oldFile: 'shared-20-mUr7IqZY.js', alias: 'ms', probe: 'start-card', features: ['return e ? "start-card" : "greeting";'] },
    kb: { name: 'showStartSlot', old: 'eg', oldFile: 'shared-20-mUr7IqZY.js', alias: 'fs', probe: 'start-card', features: ['return e === "start-card" || !t;'] },
  },
};

// Reviewed pins: raw declaration sha256 of every root (official bytes), so a changed snapshot or a re-pointed local fails.
export const ROOT_PINS = {
  [`${START}#MQ`]: 'eae01f60351a44d68f6abca1a53b96e5b17d5aa1c3fe97b52ae3122e90ed748c',
  [`${START}#DQ`]: '512509d1fdc8b77f96f1f3b0397f0b816ac7cd4add3c3ea50e140b0ee70d1f24',
  [`${START}#OQ`]: '3158bda9296eb67f73aca7c20fdc1f94cf3442823f1e4666c6296ec430132134',
  [`${START}#Aye`]: '4372087015ec2b6c5bba7372e663533c81d7531847e752621c196344a6537764',
  [`${START}#Dve`]: 'fd092304106b3d0058abe925325636eb428416b41938062276cee8d7b6d2ac44',
  [`${START}#kye`]: '05842e6b3d1a75a1824d4326ca9c714b8cb293a1a4ec859d0efc9ea5e37d733f',
  [`${START}#s3`]: '6ca8337c38f384faf05dde22a5bf9bf5a4f307c12afa4728fddffe5437942d99',
  [`${START}#Dye`]: 'c7de5305d538d288b809295253f7b473fc36940b735f7d59ba409a62d1836b20',
  [`${START}#Oye`]: 'b0b1e32aa61ca2c6d262f2c7895fd91f0c12a40ddb7a2a7541a7630b0a09d482',
  [`${START}#V5`]: 'b8e175694fd4c25b9fc2162d4e44fcc431c1fa4113b0e44c4640c09195f22131',
  [`${START}#B5`]: 'a01042fa0607f56515e2410cf21e9c56acf5e1b043913127e3859b42f8419447',
  [`${START}#Y6`]: 'a8a8ecbcc1e61f5301299e8d010820d9b3882e330c80750b4e3be1019ba55dad',
  [`${START}#m_e`]: '6a11653e4bda53205fd3f36f5487ee220c377f52af77c05e7d61f8baf7e3e8cb',
  [`${FACE}#Ob`]: 'da8343cccf69f9a523f38617bbf3bed783229003910904c2930ce920321566d3',
  [`${FACE}#kb`]: '3d241798a8821ae7d99a7e86a218f3cca5034b0e95f99c1ffb457c3a71743ecd',
};

const helper = (source, target) => ({ source, target });
const startExports = Object.fromEntries(Object.entries(rootSpecs[START]).map(([local, spec]) => [local, spec.name]));
const modules = [
  { source: START, target: 'start.mjs', internal: true, exports: startExports,
    features: Object.fromEntries(Object.entries(rootSpecs[START]).map(([local, spec]) => [local, spec.features])) },
  { source: FACE, target: 'face.mjs', exports: { Ob: 'startFace', kb: 'showStartSlot' },
    features: { Ob: rootSpecs[FACE].Ob.features, kb: rootSpecs[FACE].kb.features } },
  helper('c73f45bc3-C7dtUSq8.js', 'focus.mjs'),
  helper('cc44b66a7-CBE7MOEW.js', 'surface.mjs'),
  helper('shared-55-BRv2XBP7.js', 'shared-55.mjs'),
  // shared-3 VM (Yg: a path as the user reads it, ~-relative under labelContext.home) and c3f9f1667 H (rV: recent folder
  // names with the parent that tells equal names apart), read by Dye / Oye.
  helper('shared-26-B-POtn5S.js', 'shared-26.mjs'),
  helper('shared-3-IQTrO7Gx.js', 'shared-3.mjs'),
  helper('c3f9f1667-Bbz13IQQ.js', 'folder-names.mjs'),
  helper('shared-123-1Hc1RTKl.js', 'shared-123.mjs'),
  helper('shared-25-D-aF0gt9.js', 'shared-25.mjs'),
  helper('vendor-all-0-uUCo-eCX.js', 'vendor-all-0.mjs'),
  // H8 / U8 / W8 (a suggested task's title, tldr and prompt text): the official plain-text / markdown helpers.
  helper('shared-92-BOgyxePb.js', 'shared-92.mjs'),
  helper('shared-62-DoCqVpIq.js', 'shared-62.mjs'),
  helper('shared-212-BHMAi0oa.js', 'shared-212.mjs'),
  // linkExports k (D1): proposal-group-v4 reads the same plain-text helper (its proposal titles and "Do this task here"
  // text) and links this module instead of cutting a second copy of ca0294fab's lazily built case-folding tables.
  { ...helper('c5b9e310e-BJQJokjQ.js', 'c5b9e310e.mjs'), linkExports: ['k'] },
  helper('ca0294fab-CRiPJlG5.js', 'ca0294fab.mjs'),
  // c8f38bf1f (r / i / a / c / l, the command-prefix checks): linked from r3b-tasks command-prefix.mjs since wave 8 (W8-RT),
  // so the chunk is no longer listed here (was: helper('c8f38bf1f-B4N4qS0l.js', 'c8f38bf1f.mjs')).
  helper('cd4fb5ac7-DCVeUpE6.js', 'cd4fb5ac7.mjs'),
  helper('shared-1-D1bGaTaN.js', 'shared-1.mjs'),
  helper('shared-0-CnnWnVrT.js', 'shared-0.mjs'),
  helper('preload-helper-BBljBeZo.js', 'browser-preload-helper.mjs'),
  // Pure shared-frame declarations cds-core holds without a publicName (compiler helpers, class constants), re-sliced.
  helper(official.sharedFrame, 'shared-frame.mjs'),
];

// Wave 8 (cds-integrate/wave8 W8-RT, round3 integrate-gates notFixed r3b-tasks-subtask:98): the r3b-tasks bindings this
// closure reaches (shared-0 Tl, shared-212 j_ / M_ / yv / Cv / Dv / kv, c8f38bf1f r / i / a / c / l) are linked from r3b-tasks, their one 4.16336.0
// owner (D1 survey: converge on r3b-tasks; r3b-tasks exports them, roots under their semantic names, the rest as linkExports),
// never cut again here.
const R3B_TASKS_LINK = 'r3b-tasks';
export const CODE_START_V4 = {
  name: 'code start (4.16336.0)', generator: 'extract-code-start-v4.mjs', output: path.join(root, CODE_START_V4_OUTPUT),
  adapterModule: '../../source-code-start-v4-adapters.jsx', adapterFile: 'src/source-code-start-v4-adapters.jsx', adapters, localAdapters, modules,
  sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: [R3B_TASKS_LINK],
  referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
  vendor: { [official.vendorFrame]: official.reactAliases },
};

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}
// AST location of every root: the only top-level declaration of its chunk carrying its features, under the pinned local, with
// the pinned export alias and the pinned raw declaration hash. Also records the 3.6556.2 counterpart (review only).
export async function locateRoots() {
  const cache = new Map(), oldCache = new Map(), rows = [];
  for (const [file, locals] of Object.entries(rootSpecs)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(locals)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${spec.name}: ${hits.length} top-level declarations carry its features, expected 1`);
      const found = [...src.top].find(([, entry]) => entry === hits[0])[0];
      if (found !== local) throw Error(`${file} ${spec.name}: the declaration is ${found}, expected ${local}`);
      const exported = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (exported !== (spec.alias ?? null)) throw Error(`${file} ${spec.name}: official export is ${exported}, expected ${spec.alias ?? null}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file} ${spec.name}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      const oldFile = spec.oldFile ?? OLD_START;
      let oldCounterpart = null;
      if (spec.old !== null) {
        const old = await readSource(oldFile, oldCache, official.previousIonSource);
        const oldEntry = old.top.get(spec.old);
        if (!oldEntry || oldEntry.kind === 'import') throw Error(`${spec.name}: 3.6556.2 ${oldFile}#${spec.old} is not a declaration`);
        oldCounterpart = { version: official.previousVersion, file: oldFile, local: spec.old, declarationSha256: sha(rawText(old, oldEntry)) };
      }
      rows.push({ semantic: spec.name, file, local, export: exported, sourceSha256: sha(src.bytes), declarationSha256, pinned: pin !== null, oldCounterpart });
    }
  }
  return rows;
}

// ClawdLaptopInner's replayOnClick button classes: the one `let x = `${className ?? ""} …`;` template of the lottie chunk.
const CLAWD_REPLAY = /let [\w$]+=`\$\{[\w$]+\?\?""\} ([^`]+)`;/g;
export async function clawdReplayFragment() {
  const bytes = await fs.readFile(path.join(official.ionSource, CLAWD));
  const text = bytes.toString();
  const hits = [...text.matchAll(CLAWD_REPLAY)];
  if (hits.length !== 1) throw Error(`${CLAWD}: ${hits.length} replay button class templates, expected 1`);
  const classes = hits[0][1];
  for (const feature of ['hide-focus-ring', 'pointer-events-none', "[&_path:not([fill-opacity='0'])]:pointer-events-auto"])
    if (!classes.includes(feature)) throw Error(`${CLAWD}: replay button classes lack ${feature}`);
  if (!text.includes('replayOnClick:')) throw Error(`${CLAWD}: no replayOnClick prop`);
  return { file: CLAWD, sourceSha256: sha(bytes), classes };
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the code-start-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export async function extractCodeStartV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const roots = await locateRoots();
  const clawd = await clawdReplayFragment();
  const clawdModule = `// Original Claude Desktop ${official.referenceVersion} text from ${clawd.file}; generated by extract-code-start-v4.mjs.\n`
    + `// ClawdLaptopInner replayOnClick: the button classes after \`\${className ?? ""}\`. Edit the extractor, never this file.\n`
    + `export const clawdReplayButtonClassName = ${JSON.stringify(clawd.classes)};\n`;
  const cfg = {
    ...CODE_START_V4,
    async artifacts(m) {
      const kinds = {};
      for (const mod of m.modules) for (const i of mod.imports) kinds[i.kind] = (kinds[i.kind] ?? 0) + 1;
      const held = m.modules.filter(mod => mod.heldByViewTabs.length).map(mod => ({ module: mod.target, source: mod.source, bindings: mod.heldByViewTabs }));
      return {
        'clawd-replay.mjs': clawdModule,
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-code-start-v4.mjs',
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, roots, clawdReplay: { file: clawd.file, sourceSha256: clawd.sourceSha256 },
          importKinds: kinds, heldByCdsCore: held,
          adapters: m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'adapter').map(i => ({ module: mod.target, local: i.local, adapter: i.name, via: i.via }))),
          sharedGraphImports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'shared-graph').map(i => ({ module: mod.target, local: i.local, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCodeStartV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
