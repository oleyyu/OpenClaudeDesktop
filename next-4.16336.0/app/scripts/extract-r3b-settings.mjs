// Extract the originals lane R3b-settings reuses (cov0-04, the desktop low-disk toast), without executing any desktop
// runtime. Two source contracts, one engine:
//
// 3.6556.2 (the production output, PRODUCTION_VERSION):
//   renderer  cf615570b DesktopLowDiskToast (the whole chunk: g, p, m, h and the compiler-hoisted no-op _), shared-3 FD
//             (the byte formatter it labels the free space with), shared-78 WW (bidi isolation of that label), shared-25
//             AH/DH/OH (the `LSS-persisted.*` localStorage record of the last warning) and the shared-0 helpers those
//             read (logger, lazy value, RTL set);
//   main      index.chunk-jPKPzV-P.js YUr (statfs of a folder, walking up to an existing parent: bavail * bsize), which
//             the official DeviceStorage.getFreeDiskSpace calls on app.getPath("userData") (cEa, pEa).
//   3.6556.2 is React Compiler output: the toast reads the memo cache (shared-frame J9 = vendor-frame `Oo`,
//   react/compiler-runtime `c`) and the J/K slot helpers; those are imported from view-tabs by their E3 semantic names.
//
// 4.16336.0 (official-4.16336.0.mjs; sharedGraph 'cds-core'):
//   renderer  cf615570b-Km8zsRDm g/p/m/h/_ (same toast; "Manage storage" id UMxPPH/sWm), shared-4 Yj/Jj (formatBytes),
//             shared-62 SN (bidi isolation, moved out of shared-78), shared-25 gH/RH/FH/IH, shared-0 Rc/N/Tl/M6;
//             CdsButton (shared-frame Id -> Xu) is imported from cds-core by its publicName; the 7 React Compiler helpers
//             the toast reads are pure shared-frame bindings cds-core holds without a publicName, so they are re-cut here
//             (compiler-helpers.mjs, every declaration checked whole by official.assertCompilerHelpers, recorded as
//             heldByCdsCore); shared-0 Tl (lazy value, 3.6556.2 linked it from routines-shared Pa) is re-cut in place.
//   main      index.chunk-Du-Wqi0E.js dai (YUr renamed), called by sto(app.getPath("userData")) and dto's
//             getFreeDiskSpace.
//   The 4.16336.0 output is written only to an explicit --out root while any 3.6556.2 generated area still links
//   r3b-settings by original identity (at 4.16336.0 batch 1: chat-renderer and code-transcript import it, pierre-changes
//   and queued-bar list it in linkedAreas; their linked-area version check requires this area on their own release);
//   productionBlockers() reads that from the generated manifests, so the refusal lifts once they move.
//
// Every emitted renderer binding is an original top-level declaration sliced from the minified chunk; each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. Imports resolve
// through the source chunk's export table to exactly one of: another module generated here, a verified React export of
// vendor-frame, a public (semantic) name of the shared graph (3.6556.2: view-tabs, D1; 4.16336.0: cds-core publicNames,
// version / snapshot / module bytes / source hash checked like the runSlicer engine's cfg.sharedGraph), or a named host
// adapter in src/source-r3b-settings-adapters.jsx. Roots, adapters and the main-process binding carry feature strings
// that must still appear in the original text, so a version bump that re-points a minified name fails here instead of
// silently binding the wrong value. Output is prettier-formatted after assembly.
//
// D0: own generator, own output (src/generated/r3b-settings/, electron/generated/r3b-settings-free-disk.cjs and its
// manifest), own scripts/verify-gen-r3b-settings.mjs.
//
// CLI: node scripts/extract-r3b-settings.mjs [--check] [--target <version>] [--out <root>]
//   --out <root> writes <root>/src/generated/r3b-settings and <root>/electron/generated (staging); default is the app.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
export const PRODUCTION_VERSION = '3.6556.2';
const AREA = 'r3b-settings';
const electronTarget = 'r3b-settings-free-disk.cjs', electronManifest = 'r3b-settings-free-disk-manifest.json';
const adapterModule = '../../source-r3b-settings-adapters.jsx';
const viewTabsModule = '../view-tabs/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const officialModules = { '3.6556.2': './official-3.6556.2.mjs', '4.16336.0': './official-4.16336.0.mjs' };

// ---------------------------------------------------------------- 3.6556.2 contract (production)
const contract3 = official => ({
  // vendor-frame re-exports React; each alias is checked with official.assertVendorAlias (a top-level
  // `local=<namespace>.<member>` of the right namespace; R3: `Co` is useRef and `Ha` jsx in 3.6556.2).
  vendor: { [official.vendorFrame]: Object.fromEntries(['Co', 'ho', 'go', 'Ha'].map(alias => [alias, official.reactAliases[alias]])) },
  // Host dependencies (file -> export alias -> adapter name). `features` must appear in the resolved local's top-level
  // declaration (`{ loose }`: official.looseFeature); `{ in, has }` checks another top-level declaration of the same chunk.
  adapters: {
    // react-intl useIntl (q) / FormattedMessage (Gt = memo(Wt)) over the local catalog.
    [official.vendorIntl]: {
      p: { name: 'useIntl', features: [{ loose: 'return Mt(e),e' }, { in: 'Mt', has: '[React Intl] Could not find required `intl` object' }] },
      l: { name: 'FormattedMessage', features: [{ loose: 'c(Wt,Ut)' }, { in: 'Wt', has: 'textComponent:a=r' }] },
    },
    // shared-52 cB (exported `ha`): useContext(ErrorsProvider) -> { addWarning, clearToast, … }.
    'shared-52-uHFNjl7C.js': { ha: { name: 'useErrors', features: [{ loose: 'w(Qz)' }, '"Must be called within ErrorsProvider"'] } },
    // shared-0 jS (exported `Ym`): the desktop bridge's DeviceStorage namespace.
    'shared-0-DDOOdL6P.js': { Ym: { name: 'DeviceStorage', features: ['globalThis["claude.web"]?.DeviceStorage'] } },
  },
  // shared-frame bindings the view-tabs graph publishes (D1): imported from it by public name, never copied. The React
  // Compiler helpers (E3) come from official.compilerHelpers: their whole declaration must match the frozen feature.
  sharedGraph: {
    area: 'view-tabs',
    names: {
      [official.sharedFrame]: {
        Eu: { name: 'CdsButton', features: ['iconPosition:o', 'o===void 0?"start":o'] },
        ...Object.fromEntries(Object.entries(official.compilerHelpers).map(([alias, helper]) => [alias, { name: helper.name, compiler: helper }])),
      },
    },
  },
  // W13 G11 (D1): originals another generated 3.6556.2 graph already holds and exports, imported from it instead of cut
  // again here: shared-0 Pa (lazyInit), held by routines-shared's shared-0 (no imports, plain node). The holder's manifest
  // must list the binding for the same source bytes and its module text must match the manifest.
  linkedOriginals: { 'shared-0-DDOOdL6P.js#Pa': { area: 'routines-shared', target: 'shared-0-DDOOdL6P.mjs' } },
  // Emitted in dependency order. `exports` maps original local binding -> exported name (its keys are the roots);
  // `features` pins each root to strings of its original (minified) text.
  modules: [
    { target: 'shared-0.mjs', source: 'shared-0-DDOOdL6P.js',
      // W13 G11 (D1): Pa (lazyInit) is no longer a root here; bidi-isolate imports it from routines-shared (linkedOriginals).
      exports: { Ui: 'logger', F: 'logCategory', LL: 'rtlCharacterPattern' },
      features: { Ui: ['startGroup:', '__errorMarked:'], F: ['LOCAL_STORAGE:"[LOCAL_STORAGE]"'], Pa: [{ loose: 'n||=(t=e(),!0)' }], LL: ['\\u0590-\\u08FF'] } },
    { target: 'persisted-store.mjs', source: 'shared-25-DOWZRSlq.js',
      exports: { fH: 'persistedStorageKey', AH: 'readPersisted', DH: 'removePersisted', OH: 'writePersisted' },
      features: { fH: ['`LSS-${e}`'], AH: [{ loose: 'window.localStorage.getItem(fH(e))' }, 'acceptBareValue'], DH: [{ loose: 'xH(fH(e),pH,!0)' }, { in: 'pH', has: 'Symbol("absent")' }],
        OH: [{ loose: 'xH(fH(e),t,!0)' }, { in: 'xH', has: 'JSON.stringify({value:t,tabId:"",timestamp:Date.now()})' }] } },
    { target: 'bidi-isolate.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { WW: 'isolateDirection' },
      features: { WW: [{ loose: 'BW(e)==="ltr"?t:' }, '\\u2067', { in: 'BW', has: 'e==="en-XB"?"ltr"' }] } },
    { target: 'format-bytes.mjs', source: 'shared-3-BCEbd8Fv.js', exports: { FD: 'formatBytes', PD: 'byteUnits' },
      features: { FD: ['unitDisplay:n==="short"&&a===0?"long":n', 'maximumFractionDigits:a===0?0:1'], PD: ['["byte","kilobyte","megabyte","gigabyte"]'] } },
    // The whole chunk: `complete` asserts every top-level declaration of cf615570b is reached from the exports, and the
    // chunk's own export table must still name DesktopLowDiskToast / LOW_DISK_SPACE_BYTES.
    { target: 'low-disk-toast.mjs', source: 'cf615570b-BgBm9Y8P.js', complete: true,
      officialExports: { DesktopLowDiskToast: 'g', LOW_DISK_SPACE_BYTES: 'p' },
      exports: { g: 'DesktopLowDiskToast', p: 'LOW_DISK_SPACE_BYTES', m: 'lowDiskRemindAfterMs', h: 'lowDiskWarnedAtKey' },
      features: {
        g: ['defaultMessage:"Low disk space: {free} free",id:"3oiLa8/rQB"', 'defaultMessage:"Manage storage",id:"N1UcONKmyo"', 'uniqueKey:"desktop-low-disk"',
          { loose: 'e>=2*p&&a(h)' }, { loose: 'n>=0&&n<m' }, 'window.addEventListener("focus",t)', 'c?.getFreeDiskSpace?.()', 'size:"sm",variant:"secondary"'],
        p: ['p=10*1e3**3'], m: ['m=6048e5'], h: ['h="persisted.desktop-low-disk-warned-at"'],
      } },
  ],
  // Main process: YUr, the CommonJS namespaces it reads and the official callers that fix its argument and result.
  main: {
    file: 'index.chunk-jPKPzV-P.js', binding: 'YUr', exportedAs: 'freeDiskSpace', caller: 'cEa', getter: 'pEa',
    features: ['await(0,p.statfs)(t)', 'return e.bavail*e.bsize', 'n.default.dirname(t)', 'if(r===t)throw e'],
    // `let p=require("node:fs/promises");p=e.a(p)`: rebuilt as the module itself (statfs is a named export of both).
    namespaces: { p: { require: 'node:fs/promises', members: ['statfs'], prelude: 'const p = require("node:fs/promises");' },
      n: { require: 'node:path', members: ['default'], prelude: 'const n = { default: require("node:path") };' } },
    callers: { cEa: ['return YUr(a.app.getPath("userData"))'], pEa: ['getFreeDiskSpace:async()=>await cEa()??null'] },
  },
});

// ---------------------------------------------------------------- 4.16336.0 contract (staged until cutover)
// Root locations (AST, unique): cf615570b-Km8zsRDm.js is the only chunk with `uniqueKey:"desktop-low-disk"` and its export
// table names DesktopLowDiskToast=g / LOW_DISK_SPACE_BYTES=p; every other root is reached from its import table
// (shared-25 gr/hr/pr, shared-4 xt, shared-62 Wl via shared-4, shared-0 nS/wt via shared-62, IS/FS via shared-25) and
// pinned below by features of its own declaration. persistedStorageKey (gH) and writePersisted (IH) are the `LSS-` key
// and the write the toast and the host's session notices both use.
const COMPILER_HELPERS_V4 = ['reactMemoCache', 'memoIsEmpty', 'memoChanged1', 'memoChanged4', 'memoStore0', 'memoStore1', 'memoStore4'];
const contract4 = official => ({
  vendor: { [official.vendorFrame]: Object.fromEntries(['wo', '_o', 'go', 'Ga', official.compilerRuntimeAlias].map(alias => [alias, official.reactAliases[alias]])) },
  adapters: {
    [official.vendorIntl]: {
      p: { name: 'useIntl', features: [{ loose: 'return Mt(e),e' }, { in: 'Mt', has: '[React Intl] Could not find required `intl` object' }] },
      // Wt is the same react-intl FormattedMessage; only its minified default text component local moved (r -> i).
      l: { name: 'FormattedMessage', features: [{ loose: 'c(Wt,Ut)' }, { in: 'Wt', has: 'textComponent:a=i' }, { in: 'Wt', has: 'tagName:d=a,ignoreTag:f' }] },
    },
    // shared-62 rP (exported `zl`; 3.6556.2 shared-52 cB): useContext(ErrorsProvider) -> { addWarning, clearToast, … }.
    'shared-62-DoCqVpIq.js': { zl: { name: 'useErrors', features: [{ loose: 'let e=k(qN);if(!e)throw' }, '"Must be called within ErrorsProvider"'] } },
    // shared-0 dO (exported `Ah`; 3.6556.2 jS/Ym): the desktop bridge's DeviceStorage namespace.
    'shared-0-CnnWnVrT.js': { Ah: { name: 'DeviceStorage', features: ['globalThis["claude.web"]?.DeviceStorage'] } },
  },
  sharedGraph: {
    area: 'cds-core',
    names: { [official.sharedFrame]: { Id: { name: 'CdsButton', features: ['iconPosition:o', 'o===void 0?"start":o'] } } },
    // cds-core wave 5 (D1): module state the logger root Rc reads, owned once by cds-core and imported here (Oc, the mark
    // stack, is read only through Ac / jc, so it never enters this closure).
    locals: {
      'shared-0-CnnWnVrT.js': {
        Fc: { name: 'identity_shared0_Fc', features: ["Fc=typeof navigator<\"u\"&&navigator.userAgent.inc"] }, // W8A: published by the cds-wave8 addendum
        Ac: { name: 'pushLoggerErrorMark', features: ['let i=Oc.length;'] },
        jc: { name: 'truncateLoggerErrorMarks', features: ['Oc.length=e'] },
        Pc: { name: 'loggerTags', features: ['Pc=new Set(Object.values(N))'] },
      },
      'shared-62-DoCqVpIq.js': {
        pN: { name: 'rtlScripts', features: ['pN=new Set(["Adlm","Arab","Hebr"'] },
        mN: { name: 'localeRtlCache', features: ['mN=new Map'] },
      },
      // cds-core wave 5b (D1): the persisted-store value cache the readers / writers share (one copy).
      'shared-25-D-aF0gt9.js': {
        _H: { name: 'identity_shared25__H', features: ["_H=Symbol(\"absent\")"] }, // W8A: published by the cds-wave8 addendum
        yH: { name: 'localStorageValueCache', features: ['yH=new Map'] },
      },
    },
  },
  linkedOriginals: {},
  modules: [
    { target: 'shared-0.mjs', source: 'shared-0-CnnWnVrT.js',
      // Tl (lazy value): re-cut in place (pure; plan softEdge r3b-settings -> routines-shared, which is still 3.6556.2).
      exports: { Rc: 'logger', N: 'logCategory', Tl: 'lazyValue', M6: 'rtlCharacterPattern' },
      features: { Rc: ['startGroup:', '__errorMarked:'], N: ['LOCAL_STORAGE:"[LOCAL_STORAGE]"'], Tl: [{ loose: 'n||=(t=e(),!0)' }], M6: ['\\u0590-\\u08FF'] } },
    { target: 'persisted-store.mjs', source: 'shared-25-D-aF0gt9.js',
      exports: { gH: 'persistedStorageKey', RH: 'readPersisted', FH: 'removePersisted', IH: 'writePersisted' },
      features: { gH: ['`LSS-${e}`'], RH: [{ loose: 'window.localStorage.getItem(gH(e))' }, 'acceptBareValue'], FH: [{ loose: 'kH(gH(e),_H,!0)' }, { in: '_H', has: 'Symbol("absent")' }],
        IH: [{ loose: 'kH(gH(e),t,!0)' }, { in: 'kH', has: 'JSON.stringify({value:t,tabId:"",timestamp:Date.now()})' }] } },
    { target: 'bidi-isolate.mjs', source: 'shared-62-DoCqVpIq.js', exports: { SN: 'isolateDirection' },
      features: { SN: [{ loose: '_N(e)==="ltr"?t:' }, '\\u2067', { in: '_N', has: 'e==="en-XB"?"ltr"' }] } },
    { target: 'format-bytes.mjs', source: 'shared-4-C_EiQb9h.js', exports: { Yj: 'formatBytes', Jj: 'byteUnits' },
      features: { Yj: ['unitDisplay:n==="short"&&a===0?"long":n', 'maximumFractionDigits:a===0?0:1'], Jj: ['["byte","kilobyte","megabyte","gigabyte"]'] } },
    // E3: the compiler helpers the toast imports, re-cut from shared-frame (cds-core holds them as pure bindings without
    // a publicName); each must be official.compilerHelpers' local for its name and every export must be imported.
    { target: 'compiler-helpers.mjs', source: official.sharedFrame, compilerHelpers: true,
      exports: Object.fromEntries(COMPILER_HELPERS_V4.map(name => [Object.values(official.compilerHelpers).find(h => h.name === name).local, name])),
      features: {} },
    { target: 'low-disk-toast.mjs', source: 'cf615570b-Km8zsRDm.js', complete: true,
      officialExports: { DesktopLowDiskToast: 'g', LOW_DISK_SPACE_BYTES: 'p' },
      exports: { g: 'DesktopLowDiskToast', p: 'LOW_DISK_SPACE_BYTES', m: 'lowDiskRemindAfterMs', h: 'lowDiskWarnedAtKey' },
      features: {
        g: ['defaultMessage:"Low disk space: {free} free",id:"3oiLa8/rQB"', 'defaultMessage:"Manage storage",id:"UMxPPH/sWm"', 'uniqueKey:"desktop-low-disk"',
          { loose: 'e>=2*p&&a(h)' }, { loose: 'n>=0&&n<m' }, 'window.addEventListener("focus",t)', 'getFreeDiskSpace?.().then(n=>{t===e&&w(n)},_)', 'size:"sm",variant:"secondary"'],
        p: ['p=10*1e3**3'], m: ['m=6048e5'], h: ['h="persisted.desktop-low-disk-warned-at"'],
      } },
  ],
  main: {
    file: 'index.chunk-Du-Wqi0E.js', binding: 'dai', exportedAs: 'freeDiskSpace', caller: 'sto', getter: 'dto',
    features: ['await(0,h.statfs)(t)', 'return e.bavail*e.bsize', 'n.default.dirname(t)', 'if(r===t)throw e'],
    // `let h=require("node:fs/promises");h=e.a(h)` as before; node:path is now `let n=require("node:path"),r=e.a(n,1);n=e.a(n);`
    // (r, the default-only view, is another binding; dai's own `r` is a block local).
    namespaces: { h: { require: 'node:fs/promises', members: ['statfs'], prelude: 'const h = require("node:fs/promises");' },
      n: { require: 'node:path', members: ['default'], prelude: 'const n = { default: require("node:path") };', interop: 'let n=require("node:path"),r=e.a(n,1);n=e.a(n);' } },
    callers: { sto: ['return dai(u.app.getPath("userData"))'], dto: ['getFreeDiskSpace:async()=>await sto()??null'] },
  },
});
const contracts = { '3.6556.2': contract3, '4.16336.0': contract4 };

async function loadContract(target) {
  if (!officialModules[target]) throw Error(`r3b-settings has no source contract for ${target} (have ${Object.keys(officialModules).join(', ')})`);
  const official = await import(officialModules[target]);
  if (official.referenceVersion !== target) throw Error(`${officialModules[target]} is ${official.referenceVersion}, expected ${target}`);
  return { official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, mainSource: official.asarSource, ...contracts[target](official) };
}

const exportTable = text => {
  const start = text.lastIndexOf('export{');
  if (start < 0) return new Map();
  const body = text.slice(start + 7, text.indexOf('}', start));
  return new Map(body.split(',').filter(Boolean).map(entry => {
    const [local, exported = local] = entry.split(' as ');
    return [exported.trim(), local.trim()];
  }));
};

async function readChunk(c, name, cache, { scope = false } = {}) {
  const cached = cache.get(name);
  if (cached && (!scope || cached.program)) return cached;
  const bytes = cached?.bytes ?? await fs.readFile(path.join(c.source, name));
  const code = bytes.toString();
  const ast = cached?.ast ?? parsers.babel.parse(code, {});
  const record = { name, bytes, code, ast, exported: exportTable(code), program: null };
  if (scope) babel.traverse(ast, { Program(p) { record.program = p; p.stop(); } });
  cache.set(name, record);
  return record;
}

function topLevel(chunk, name) {
  const hits = [];
  for (const node of chunk.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push({ kind: 'function', node });
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push({ kind: 'declarator', node: declarator });
  }
  if (hits.length !== 1) throw Error(`${chunk.name}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}
const declarationText = (chunk, name) => { const { node } = topLevel(chunk, name); return chunk.code.slice(node.start, node.end); };

function checkFeatures(c, chunk, local, features, label) {
  const text = declarationText(chunk, local);
  for (const feature of features) {
    if (typeof feature === 'string') { if (!text.includes(feature)) throw Error(`${label}: ${chunk.name}:${local} lacks ${JSON.stringify(feature)}`); continue; }
    if (feature.loose) { if (!c.official.looseFeature(feature.loose).test(text)) throw Error(`${label}: ${chunk.name}:${local} lacks loose ${JSON.stringify(feature.loose)}`); continue; }
    if (!declarationText(chunk, feature.in).includes(feature.has)) throw Error(`${label}: ${chunk.name}:${feature.in} lacks ${JSON.stringify(feature.has)}`);
  }
}

function vendorImport(c, chunk, alias) {
  const target = c.vendor[chunk.name]?.[alias];
  if (!target) throw Error(`Unmapped vendor import ${chunk.name}:${alias}`);
  c.official.assertVendorAlias(chunk.code, alias, target);
  return target;
}

async function linkedImport(c, chunk, local) {
  const link = c.linkedOriginals[`${chunk.name}#${local}`];
  if (!link) return null;
  const dir = path.join(root, 'src/generated', link.area);
  const held = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const mod = held.modules.find(m => m.target === link.target && m.source === chunk.name);
  if (held.referenceVersion !== c.referenceVersion || !mod || mod.sourceSha256 !== sha(chunk.bytes) || !mod.bindings.some(b => b.name === local))
    throw Error(`${link.area}/${link.target} does not hold the ${c.referenceVersion} ${chunk.name}#${local}`);
  const text = await fs.readFile(path.join(dir, link.target), 'utf8');
  if (sha(text) !== mod.sha256) throw Error(`${link.area}/${link.target} differs from its manifest`);
  const names = [...text.matchAll(/^export \{([^}]*)\};/gm)].flatMap(m => m[1].split(',').map(x => x.trim()).filter(Boolean))
    .map(spec => spec.split(/\s+as\s+/)).filter(([l]) => l === local).map(([l, as]) => as ?? l);
  if (!names.length) throw Error(`${link.area}/${link.target} does not export ${local}`);
  return { from: `../${link.area}/${link.target}`, name: names[0] };
}

// cds-core (4.16336.0): the same strict reading as the runSlicer engine's cfg.sharedGraph (extract-working-line.mjs
// sharedGraphFor): manifest version and snapshot, every module's referenceVersion and file bytes against its manifest,
// every module's sourceSha256 against the official chunk this area reads, and every publicName exported by its target
// under exportName. `held` is every binding the graph slices (a copy here of one that is module state is refused, D46).
async function cdsCoreGraph(c) {
  const area = c.sharedGraph.area, dir = path.join(root, 'src/generated', area);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== c.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${c.referenceVersion}`);
  if (manifest.referenceSnapshot !== c.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${c.referenceSnapshot}`);
  const byTarget = new Map(), held = new Set(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== c.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${c.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const officialBytes = await fs.readFile(path.join(c.source, path.basename(m.source))).catch(() => null);
    if (!officialBytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(officialBytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.add(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`);
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, published, held };
}

async function sharedGraphImport(c, graph, chunk, alias, spec) {
  if (c.sharedGraph.area === 'view-tabs') {
    graph.viewTabs ??= await viewTabsManifestFor(c.referenceVersion);
    const local = chunk.exported.get(alias), entry = graph.viewTabs.publicNames?.[spec.name];
    if (graph.viewTabs.referenceVersion !== c.referenceVersion || !entry || entry.file !== chunk.name || entry.local !== local || entry.export !== alias)
      throw Error(`view-tabs ${spec.name} is not ${chunk.name}:${local} (${JSON.stringify(entry)}, ${graph.viewTabs.referenceVersion})`);
    if (spec.compiler) {
      // E3: the whole helper declaration (and J9 = the vendor-frame `Oo` import) is checked once per shared-frame.
      chunk.compilerHelpers ??= c.official.assertCompilerHelpers(chunk.code);
      if (chunk.compilerHelpers[spec.name]?.local !== local) throw Error(`view-tabs ${spec.name} is not compiler helper ${local}`);
    } else checkFeatures(c, chunk, local, spec.features, `view-tabs ${spec.name}`);
    return { from: `${viewTabsModule}${chunk.name}`, name: spec.name, kind: 'view-tabs' };
  }
  const local = chunk.exported.get(alias), entry = local && graph.published.get(`${chunk.name}#${local}`);
  if (!entry || entry.name !== spec.name) throw Error(`${graph.area} publicName ${spec.name} is not ${chunk.name}:${local} (${JSON.stringify(entry)})`);
  checkFeatures(c, chunk, local, spec.features, `${graph.area} ${spec.name}`);
  return { from: `../${graph.area}/${entry.target}`, name: entry.exportName, kind: 'shared-graph' };
}

// Module state a second copy would split (D46): a module-level Map / Set / WeakMap / WeakSet, or a React context.
function isModuleState(c, src, p) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const binding = src.program.scope.getBinding(init.callee.name);
    if (binding?.path.isImportSpecifier()) {
      const file = binding.path.parent.source.value.replace(/^\.\//, ''), alias = binding.path.node.imported.name;
      const react = c.vendor[file]?.[alias] ?? (file === c.official.vendorFrame ? c.official.reactAliases[alias] : undefined);
      if (react?.[1] === 'createContext') return true;
    }
  }
  return false;
}

async function extractRenderer(c, cache) {
  const emitted = []; // { spec, src }
  const graph = c.sharedGraph.area === 'view-tabs' ? { area: 'view-tabs', published: new Map(), held: new Set() } : await cdsCoreGraph(c);
  const viaGraph = c.sharedGraph.area !== 'view-tabs';
  const manifest = { referenceVersion: c.referenceVersion, referenceSnapshot: c.referenceSnapshot, generator: 'scripts/extract-r3b-settings.mjs', adapterModule: 'src/source-r3b-settings-adapters.jsx',
    ...(viaGraph ? { sharedGraph: graph.area } : {}), modules: [] };
  const files = {};
  for (const spec of c.modules) {
    const src = await readChunk(c, spec.source, cache, { scope: true });
    for (const [exported, local] of Object.entries(spec.officialExports ?? {}))
      if (src.exported.get(exported) !== local) throw Error(`${spec.source}: official export ${exported} is ${src.exported.get(exported)}, not ${local}`);
    for (const [local, features] of Object.entries(spec.features)) checkFeatures(c, src, local, features, spec.target);
    if (spec.compilerHelpers) {
      // E3: every helper declaration matches its frozen feature whole and J9 is the vendor-frame compiler-runtime import.
      const helpers = c.official.assertCompilerHelpers(src.code);
      for (const [local, name] of Object.entries(spec.exports))
        if (helpers[name]?.local !== local) throw Error(`${spec.target}: ${local} is not compiler helper ${name}`);
    }
    const selected = new Map(), imports = new Map(), seen = new Set(), heldCopies = [];
    const resolve = async (file, alias, via) => {
      const dep = await readChunk(c, file, cache);
      if (c.vendor[file]) { const [from, name] = vendorImport(c, dep, alias); return { from, name, via, kind: 'react' }; }
      if (c.adapters[file]?.[alias]) {
        const entry = c.adapters[file][alias], local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is no longer exported`);
        checkFeatures(c, dep, local, entry.features, `adapter ${entry.name}`);
        return { from: adapterModule, name: entry.name, via: `${via} (${local})`, kind: 'adapter' };
      }
      if (c.sharedGraph.names[file]?.[alias]) return { ...await sharedGraphImport(c, graph, dep, alias, c.sharedGraph.names[file][alias]), via };
      const local = dep.exported.get(alias);
      if (local && graph.published.has(`${file}#${local}`)) throw Error(`${spec.target}: ${via} (${local}) is ${graph.area} publicName ${graph.published.get(`${file}#${local}`).name}; name it in sharedGraph.names`);
      const link = local && await linkedImport(c, dep, local);
      if (link) return { ...link, via, kind: 'linked' };
      const owner = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
      if (!owner) throw Error(`${spec.target}: unresolved import ${via}`);
      return { from: `./${owner.spec.target}`, name: owner.spec.exports[local], via, kind: 'generated' };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      // A binding of the same chunk already emitted by an earlier module is imported, never duplicated.
      const sibling = emitted.find(m => m.spec.source === spec.source && m.spec.exports[name]);
      if (sibling) { imports.set(name, { from: `./${sibling.spec.target}`, name: sibling.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name;
        imports.set(name, await resolve(file, alias, `${file}:${alias}`));
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      if ((p.isVariableDeclarator() ? p.parentPath.parentPath : p.parentPath)?.node !== src.program.node) throw Error(`${spec.target}: ${name} is not top-level`);
      if (graph.published.has(`${spec.source}#${name}`)) {
        // A same-chunk declaration the shared graph publishes is imported only when named here (sharedGraph.locals: the
        // publicName and features of the official declaration, checked), never cut again and never linked by guess.
        const entry = graph.published.get(`${spec.source}#${name}`), named = c.sharedGraph.locals?.[spec.source]?.[name];
        if (!named || Object.hasOwn(spec.exports, name)) throw Error(`${spec.target}: ${spec.source}#${name} is ${graph.area} publicName ${entry.name}; import it instead of cutting it again (name it in sharedGraph.locals)`);
        if (entry.name !== named.name) throw Error(`${spec.target}: ${spec.source}#${name} is ${graph.area} publicName ${entry.name}, not ${named.name}`);
        checkFeatures(c, src, name, named.features, `${graph.area} ${named.name}`);
        imports.set(name, { from: `../${graph.area}/${entry.target}`, name: entry.exportName, via: `${spec.source}#${name}`, kind: 'shared-graph', original: name });
        return;
      }
      if (graph.held.has(`${spec.source}#${name}`)) {
        if (isModuleState(c, src, p)) throw Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${spec.target}: ${spec.source}#${name}`);
        heldCopies.push(name);
      }
      selected.set(name, p);
      const within = q => q.node.start >= p.node.start && q.node.end <= p.node.end;
      let dynamic = false;
      p.traverse({ ImportExpression() { dynamic = true; }, CallExpression(r) { if (r.node.callee.type === 'Import') dynamic = true; } });
      if (dynamic) throw Error(`${spec.target}: ${name} has a dynamic import`);
      const deps = Object.entries(src.program.scope.bindings)
        .filter(([, b]) => b.referencePaths.some(within) || b.constantViolations.some(within)).map(([n]) => n);
      for (const dep of deps) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) await add(name);
    if (spec.complete) {
      const declared = src.ast.program.body.flatMap(n => n.type === 'FunctionDeclaration' ? [n.id.name]
        : n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name ?? '<pattern>') : []);
      const missing = declared.filter(n => !selected.has(n));
      if (missing.length) throw Error(`${spec.target}: unreachable original bindings ${missing.join(',')}`);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => { const text = src.code.slice(p.node.start, p.node.end); return p.isVariableDeclarator() ? `var ${text};` : text; });
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${c.referenceVersion} bindings from ${spec.source}; generated by scripts/extract-r3b-settings.mjs.\n// Edit the extractor or src/source-r3b-settings-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion: c.referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      exports: spec.exports,
      ...(viaGraph ? { heldByCdsCore: [...heldCopies].sort() } : {}),
    });
    emitted.push({ spec, src });
  }
  // Every root of a re-cut helper module is imported by another module here (no unused copies).
  for (const spec of c.modules.filter(m => m.compilerHelpers)) {
    const used = new Set(manifest.modules.flatMap(m => m.imports).filter(i => i.from === `./${spec.target}`).map(i => i.name));
    const unused = Object.values(spec.exports).filter(name => !used.has(name));
    if (unused.length) throw Error(`${spec.target}: exported but not imported: ${unused.join(', ')}`);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  return files;
}

// Members of `namespace` read inside the declaration (only `namespace.member` reads are accepted).
function memberReads(node, namespace, file) {
  const reads = new Set();
  const visit = (value, parent) => {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'Identifier' && value.name === namespace) {
      if (parent?.type !== 'MemberExpression' || parent.object !== value || parent.computed) throw Error(`${file}: ${namespace} is used other than as a member read`);
      reads.add(parent.property.name);
    }
    for (const child of Object.values(value)) if (Array.isArray(child)) child.forEach(item => visit(item, value)); else if (child && typeof child === 'object' && child.type) visit(child, value);
  };
  visit(node, null);
  return reads;
}

// The 7 MB main chunk is not parsed whole (that alone takes ~15 s): each wanted top-level function is located by its
// unique `function <name>(` text and cut at the first closing brace where the slice parses as exactly that one
// declaration (an earlier brace leaves the body unbalanced, so the first parse that succeeds is the real end). A name
// that occurs as a declaration more than once, or is ever reassigned, fails generation.
function mainFunction(main, code, name) {
  const marker = `function ${name}(`;
  const at = code.indexOf(marker);
  if (at < 0 || code.indexOf(marker, at + 1) >= 0) throw Error(`${main.file}: expected one ${marker}`);
  if (new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\s*=(?!=)`).test(code)) throw Error(`${main.file}: ${name} is reassigned`);
  const start = code.startsWith('async ', at - 6) ? at - 6 : at;
  if (!/[;}{)]$|^$/.test(code.slice(Math.max(0, start - 1), start))) throw Error(`${main.file}: ${name} is not a statement-level declaration`);
  for (let end = code.indexOf('}', at); end >= 0; end = code.indexOf('}', end + 1)) {
    const text = code.slice(start, end + 1);
    let ast;
    try { ast = parsers.babel.parse(text, {}); } catch { continue; }
    const [node, ...rest] = ast.program.body;
    if (rest.length || node?.type !== 'FunctionDeclaration' || node.id?.name !== name) throw Error(`${main.file}: ${name} does not slice as one declaration`);
    return { text, node, start };
  }
  throw Error(`${main.file}: ${name} never closes`);
}

async function extractMain(c) {
  const { main } = c;
  const bytes = await fs.readFile(path.join(c.mainSource, main.file));
  const code = bytes.toString();
  const fn = mainFunction(main, code, main.binding);
  for (const feature of main.features) if (!fn.text.includes(feature)) throw Error(`${electronTarget}: ${main.binding} lacks ${JSON.stringify(feature)}`);
  for (const [caller, features] of Object.entries(main.callers)) {
    const text = mainFunction(main, code, caller).text;
    for (const feature of features) if (!text.includes(feature)) throw Error(`${electronTarget} caller: ${caller} lacks ${JSON.stringify(feature)}`);
  }
  const node = fn.node;
  if (!node.async) throw Error(`${main.file}: ${main.binding} is no longer an async function`);
  for (const [namespace, wanted] of Object.entries(main.namespaces)) {
    // Chunk prelude: `<ns>=require("<module>");<ns>=e.a(<ns>)` (the ESM interop wrapper), declared once by `let`; a
    // contract may name the exact interop text instead (`interop`, matched once in the prelude).
    const required = wanted.interop ?? `${namespace}=require(${JSON.stringify(wanted.require)});${namespace}=e.a(${namespace})`;
    const prelude = code.slice(0, code.indexOf('function '));
    if (!prelude.includes(required) || (wanted.interop && prelude.split(required).length !== 2) || !new RegExp(`(?:let |,)${namespace.replace(/\$/g, '\\$')}=require\\(`).test(prelude))
      throw Error(`${main.file}: ${namespace} no longer requires ${wanted.require}`);
    for (const member of memberReads(node, namespace, main.file)) if (!wanted.members.includes(member)) throw Error(`${main.file}: ${main.binding} reads unmapped ${namespace}.${member}`);
  }
  const preludes = Object.entries(main.namespaces).map(([namespace, wanted]) => `// ${namespace} = e.a(require("${wanted.require}"))\n${wanted.prelude}`);
  const header = `// Original Claude Desktop ${c.referenceVersion} main-process binding; generated by scripts/extract-r3b-settings.mjs.\n// ${main.file} ${main.binding}: DeviceStorage.getFreeDiskSpace (${main.getter}) returns \`await ${main.caller}() ?? null\`, ${main.caller} = ${main.binding}(app.getPath("userData")).\n`;
  const text = await format(`${header}"use strict";\n${preludes.join('\n')}\n${fn.text}\nmodule.exports = { ${main.exportedAs}: ${main.binding} };\n`, { parser: 'babel' });
  // The module must be closed: every identifier it reads is declared in it (CommonJS require/module aside).
  const parsed = babel.babelParse(text, electronTarget, false);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals).filter(name => !['require', 'module'].includes(name)); } });
  if (globals.length) throw Error(`${electronTarget}: unbound ${globals.join(', ')}`);
  const manifest = { referenceVersion: c.referenceVersion, referenceSnapshot: c.referenceSnapshot, generator: 'scripts/extract-r3b-settings.mjs', output: electronTarget,
    source: path.relative(root, path.join(c.mainSource, main.file)), sourceSha256: sha(bytes), binding: main.binding, exportedAs: main.exportedAs,
    bindingSha256: sha(fn.text), namespaces: Object.fromEntries(Object.entries(main.namespaces).map(([n, w]) => [n, { require: w.require, members: w.members }])),
    callers: main.callers, sha256: sha(text) };
  return { [electronTarget]: text, [electronManifest]: JSON.stringify(manifest, null, 2) + '\n' };
}

// Generated areas still on another release that link r3b-settings by original identity (their linkedAreas / imports):
// writing `target` into the production tree would fail their --check, so it is refused until they move too.
export async function productionBlockers(target) {
  const generated = path.join(root, 'src/generated'), blockers = [];
  for (const area of (await fs.readdir(generated)).sort()) {
    if (area === AREA) continue;
    const manifest = await fs.readFile(path.join(generated, area, 'manifest.json'), 'utf8').then(JSON.parse, () => null);
    if (!manifest || manifest.referenceVersion === target) continue;
    // linkedAreas comes in two forms: an array (area names or { area, ... } entries) or an object keyed by area name
    // (area -> manifest sha256, e.g. files-changes-v4 / session-rail-kit-v4).
    const linked = Array.isArray(manifest.linkedAreas) ? manifest.linkedAreas : Object.keys(manifest.linkedAreas ?? {});
    const links = linked.some(entry => (typeof entry === 'string' ? entry : entry?.area) === AREA)
      || (manifest.modules ?? []).some(m => (m.imports ?? []).some(i => typeof i.from === 'string' && i.from.startsWith(`../${AREA}/`)));
    if (links) blockers.push(`${area} (${manifest.referenceVersion})`);
  }
  return blockers;
}

export async function extractR3bSettings({ check = false, target = PRODUCTION_VERSION, outRoot = root, dryRun = false } = {}) {
  const c = await loadContract(target);
  const out = path.resolve(outRoot);
  const output = path.join(out, 'src/generated', AREA), electronOutput = path.join(out, 'electron/generated');
  if (out === root && !dryRun) {
    const blockers = await productionBlockers(c.referenceVersion);
    if (blockers.length) throw Error(`r3b-settings ${c.referenceVersion} cannot replace the production output: ${blockers.join(', ')} link it by original identity. Use --out <staging root>.`);
  }
  const cache = new Map();
  const files = await extractRenderer(c, cache);
  const electronFiles = await extractMain(c);
  const manifest = JSON.parse(files['manifest.json']);
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  if (dryRun) return { files, electronFiles, manifest, count };
  if (check) {
    const present = (await fs.readdir(output)).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`r3b-settings output set changed: ${present.join(',')}. Run scripts/extract-r3b-settings.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`r3b-settings source mismatch: ${name}. Run scripts/extract-r3b-settings.mjs.`);
    for (const [name, text] of Object.entries(electronFiles))
      if (await fs.readFile(path.join(electronOutput, name), 'utf8') !== text) throw Error(`r3b-settings main-process mismatch: ${name}. Run scripts/extract-r3b-settings.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
    await fs.mkdir(electronOutput, { recursive: true });
    for (const [name, text] of Object.entries(electronFiles)) await fs.writeFile(path.join(electronOutput, name), text);
  }
  const where = out === root ? '' : ` into ${out}`;
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} r3b-settings modules (${count} original ${c.referenceVersion} bindings) and ${electronTarget}${where}.`);
  return { files, electronFiles, manifest, count };
}

function cliOption(argv, name) {
  const at = argv.findIndex(arg => arg === name || arg.startsWith(`${name}=`));
  if (at < 0) return undefined;
  const value = argv[at].includes('=') ? argv[at].slice(name.length + 1) : argv[at + 1];
  if (!value || value.startsWith('--')) throw Error(`${name} needs a value`);
  return value;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const out = cliOption(argv, '--out');
  await extractR3bSettings({ check: argv.includes('--check'), target: cliOption(argv, '--target') ?? PRODUCTION_VERSION, outRoot: out ? path.resolve(out) : root });
}
