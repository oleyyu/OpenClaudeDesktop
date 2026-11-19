// Cowork activity panel — Runs and Upcoming sections, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104,
// account2 batch 6, region cowork-runs): the same semantic roots extract-cowork-runs.mjs cuts from 3.6556.2 into
// src/generated/cowork-runs, cut from the frozen 4.16336.0 snapshot into the isolated graph src/generated/cowork-runs-v4.
// The 3.6556.2 output is untouched (staged double output; no production switch: the host keeps reading
// src/generated/cowork-runs).
//
//   c21f11e6d-Cyj5xu_D  gT  CoworkRunsSection     (3.6556.2 Ew; chunk-internal: the Runs section of a session a
//                                                   scheduled task started, its task's sessions newest first, at most
//                                                   hT = 50; renders xT, the section with the "Run - {time}" rows, the
//                                                   "Unread completed run" dot and the task chip). New in 4.16336.0: the
//                                                   onListedChange prop (the panel learns whether the section lists runs)
//                                                   and the row origin badge (Ga / M_).
//                       WT  CoworkUpcomingSection (3.6556.2 eT; chunk-internal: the session's send_later triggers still in
//                                                   the future, "Upcoming"; flat layout rows through the panel's row
//                                                   classes). New in 4.16336.0: the panel layout context (flat / card).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CdsIcon / CdsTooltip / CdsBadge / CdsSkeleton / clsx / useDirection are cds-core
//     publicNames; cds-core module state without a publicName stops generation, D46); the reviewed cds-core manifest
//     sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2/plan.json cowork-runs `linked`): cowork-progress-v4 (the panel section, layout / merged
//     contexts and row classes of cc5a62f6f), cowork-scheduled-v4 (c1dd841c3 the run origin badge, shared-140 the
//     "open entity" messages), routines-shared-v4 (shared-2 XH the unread rule and $T the relative time, shared-183 _J the
//     "now" ticker, shared-62 "/scheduled-task", the React Compiler helpers) — every binding one of them holds and exports
//     is imported from it, never cut again (cowork-progress-v4 exports the cc5a62f6f card-surface class string ie under
//     its local via linkExports, so this graph cuts nothing of cc5a62f6f and has no linkedCopies);
//   - host boundaries as localAdapters (file#local): the same official services the 3.6556.2 graph adapts (now in their
//     4.16336.0 chunks/locals) plus the intl / link / desktop-frame hooks routines-shared-v4, cowork-scheduled-v4 and
//     cowork-progress-v4 adapt for the same bindings. src/source-cowork-runs-v4-adapters.jsx only re-exports those
//     existing host adapters. Each original is pinned by features and by its raw declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256
// pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COWORK_RUNS_V4_OUTPUT = 'src/generated/cowork-runs-v4';
const ADAPTER_FILE = 'src/source-cowork-runs-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, same pin as cowork-progress-v4).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const PANEL = 'c21f11e6d-Cyj5xu_D.js';
export const TRIGGERS = 'cb1e253a0-Ct0IcfPp.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [PANEL]: {
    gT: { name: 'CoworkRunsSection', export: null, probe: 'onListedChange:a}=e',
      features: ['onListedChange: a,', 'c = n === void 0 ? void 0 : ve(n) ? "remote" : "local",', '{ sessions: l, isLoading: u } = ts(t, c, o.enabled),',
        'let t = e.pendingToolPermissions?.length ?? 0,', 'n = !e.isRunning && t === 0 && e.lastActivityAt !== void 0;', 'origin: Ga(e),',
        'isCurrent: oi(e.sessionId) === f,', 'isCompletedUnread: n && nc(e, d),', '((v = m.slice(0, hT).map(e)), K3($, 11, f, d, m, v));'] },
    WT: { name: 'CoworkUpcomingSection', export: null, probe: 'id:"6/aEFZbs2i"',
      features: ['{ triggers: t, isExpanded: n, onToggle: r, now: i } = e,', '{ flat: o } = w(e_),', 'p(Q, { defaultMessage: "Upcoming", id: "6/aEFZbs2i" })',
        '? K1($, 19, l, (e) => e.fireAt.getTime() > l)', '(b = "12rem"),', 'children: Bc(e.fireAt, l, a, "future"),'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c21f11e6d-Cyj5xu_D.js#gT': '4130ba3c940cc3a181c14baca7e28ef0aa6234a13fd10ffaa177400b5b0181d9',
  'c21f11e6d-Cyj5xu_D.js#WT': '5056743457e41f46e0efd90d400dd32bdfdc261036e74f77e6301cfc9b722bc1',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ─────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there).
const V3 = 'src/source-cowork-runs-adapters.jsx', CP = 'src/source-cowork-progress-v3-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 shared-78 yE: whether scheduled tasks are on ({ loading, enabled, statusUnknown }); gT passes `enabled` to ts.
  'shared-123-1Hc1RTKl.js#By': { name: 'useCoworkScheduledTasksStatus', from: V3,
    features: ['{ yukonSilver: e, verdict: t, sessionHost: n } = Ry(),', 'Iy("coworkScheduledTasksEnabled", t);', '{ loading: !1, enabled: !0, statusUnknown: !1 }'] },
  // 3.6556.2 shared-4 l_: the scheduled task's display name.
  'shared-31-C9BqSSuD.js#Yp': { name: 'useScheduledTaskDisplayName', from: V3,
    features: ['{ scheduledTasks: t, didResolve: n } = Up(!!e),', 't.find((t) => t.id === e)?.displayName'] },
  // 3.6556.2 shared-4 R_: the sessions a scheduled task started ({ sessions, isLoading }; remote / local / neither).
  'shared-31-C9BqSSuD.js#Tm': { name: 'useScheduledTaskSessions', from: V3,
    features: ['s = a === "remote" && n === !0 && i,', '{ sessions: Xp, isLoading: !0 }', '{ sessions: Xp, isLoading: !1 }'] },
  // 3.6556.2 shared-2 OG: the zustand store of the session read state; gT reads it with the selector vT (e => e.readState).
  'shared-2-CsjIBQD8.js#wH': { name: 'useCoworkRunsReadState', from: V3, features: ['var wH = Ep()(() => ({ readState: null, viewingChats: CH, tracking: !1 }));'] },
  // 3.6556.2 shared-78 gK: whether the panel sits in the desktop frame (cowork-progress-v4 adapts the same binding).
  'shared-123-1Hc1RTKl.js#_L': { name: 'useDesktopFrame', from: CP, features: ['t = cL(),', 'i = J4($, 0, r, t, e, n) ? K4($, 0, r, t, e, n, (e) => !0) : $[4];', 'return gn(i);'] },
  // The router link of the run rows and the task chip (cowork-scheduled-v4 adapts the same binding).
  'shared-25-D-aF0gt9.js#Ky': { name: 'RouterLink', from: RS, features: ['href: t,', 'replace: a,', 'prefetch: r,'] },
  // Intl (routines-shared-v4 adapts the same bindings).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'shared-123-1Hc1RTKl.js#By': '4c89d9f4b89324048ca65aeae5cb23f0bbcc135e73fe215f5992b50da5e60131',
  'shared-31-C9BqSSuD.js#Yp': '30c88729979ea4279a0e1c724f05cb81b5f4c254bd39664f42dfda574c4604eb',
  'shared-31-C9BqSSuD.js#Tm': 'dc2c5196e227585b8d1f484fa3cee31069e7c9bd9cf5c539dc2fb14f9d0a8398',
  'shared-2-CsjIBQD8.js#wH': '5e501cfc80b27348e53b250409849de7b0401278881c707c388a438674a8630d',
  'shared-123-1Hc1RTKl.js#_L': '0783ed367cf5de2bfa80c4046f05108112d45505b9ebbd4d876a10e482a4fb2a',
  'shared-25-D-aF0gt9.js#Ky': '4884879fdd5f05cd45263c786ab487acc75ba4998798ae34e579b75402024130',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined) throw Error(`adapter ${key}: no reviewed pin`);

// No linkedCopies: the one cc5a62f6f binding the Runs card reads (ie, the card-surface class string) is linked from
// cowork-progress-v4 (its linkExports), so no other 4.16336.0 graph holds cc5a62f6f bindings.
const linkedCopies = {};

const LINKED_AREAS = ['cowork-progress-v4', 'cowork-scheduled-v4', 'routines-shared-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation): shared-0 qc / Kc (remote session id), shared-62 Fd (cse_ -> session_) and ql ("/cowork"),
  // shared-92 xW (a row's origin), shared-120 Ze (the dir="auto" chooser).
  ...['shared-0-CnnWnVrT.js', 'shared-120-DCdTP1_5.js', 'shared-62-DoCqVpIq.js', 'shared-92-BOgyxePb.js']
    .map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): how the activity panel mounts both sections, the messages the run
// rows carry, and where the Upcoming triggers come from.
const rawCallSites = [
  { source: PANEL, role: 'The activity panel mounts Runs only for a session a scheduled task started (de), with the listed-change callback',
    features: ['de&&p(gT,{scheduledTaskId:de,currentSessionId:fe??q,isExpanded:fr,onToggle:()=>pr(!fr),onListedChange:Na})'] },
  { source: PANEL, role: 'The activity panel always mounts Upcoming with the session triggers (no `now`: WT ticks through _J)',
    features: ['p(WT,{triggers:H,isExpanded:mr,onToggle:Ls})'] },
  { source: PANEL, role: 'The run rows: "Run - {time}", the "Unread completed run" dot, the "Runs" title',
    features: ['{defaultMessage:"Run - {time}",id:"28KG348KqB"}', 'unreadCompletedRun:{defaultMessage:"Unread completed run",id:"gN5ix3ELxz"}',
      '{defaultMessage:"Runs",id:"pYmrK6Njpr"}'] },
  { source: TRIGGERS, role: 'Upcoming triggers are the successful send_later tool results not deleted or fired since',
    features: ['if(pi(r.name,"delete_trigger")||pi(r.name,"fire_trigger"))', 'if(!pi(r.name,"send_later"))continue;'] },
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

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  const body = text.replace(/\/\/[^\n]*/g, '').replace(/export \{[^}]*\} from "[^"]+";/g, '').trim();
  if (body) throw Error(`${ADAPTER_FILE}: only re-exports are allowed, found: ${body.slice(0, 120)}`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the cowork-runs-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function coworkRunsV4Config() {
  return {
    name: 'cowork runs (4.16336.0)', generator: 'extract-cowork-runs-v4.mjs', output: path.join(root, COWORK_RUNS_V4_OUTPUT),
    adapterModule: '../../source-cowork-runs-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/cowork-runs/prestage/tools/probe.mjs) explores the same configuration.
export const probeConfig = coworkRunsV4Config;

export async function extractCoworkRunsV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  for (const r of roots) if (!r.pinned) throw Error(`root ${r.file}#${r.local}: unpinned (review it with --locate)`);
  for (const a of adapters) if (!a.pinned) throw Error(`adapter ${a.original}: unpinned (review it with --locate)`);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...coworkRunsV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the cowork-runs roots (${official.referenceVersion}); generated by extract-cowork-runs-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-cowork-runs-v4.mjs',
          previous: { generator: 'scripts/extract-cowork-runs.mjs', output: 'src/generated/cowork-runs', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, removedRoots: [], adapters, linkedCopies,
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
  } else await extractCoworkRunsV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
