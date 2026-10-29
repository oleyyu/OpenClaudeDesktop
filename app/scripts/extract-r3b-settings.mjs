// Extract the 3.6556.2 originals lane R3b-settings reuses (cov0-04, the desktop low-disk toast), without executing any
// desktop runtime:
//   renderer  cf615570b DesktopLowDiskToast (the whole chunk: g, p, m, h and the compiler-hoisted no-op _), shared-3 FD
//             (the byte formatter it labels the free space with), shared-78 WW (bidi isolation of that label), shared-25
//             AH/DH/OH (the `LSS-persisted.*` localStorage record of the last warning) and the shared-0 helpers those
//             read (logger, lazy value, RTL set);
//   main      index.chunk-jPKPzV-P.js YUr (statfs of a folder, walking up to an existing parent: bavail * bsize), which
//             the official DeviceStorage.getFreeDiskSpace calls on app.getPath("userData") (cEa, pEa).
// 3.6556.2 is React Compiler output: the toast reads the memo cache (shared-frame J9 = vendor-frame `Oo`,
// react/compiler-runtime `c`) and the J/K slot helpers; those are imported from view-tabs by their E3 semantic names.
//
// Every emitted renderer binding is an original top-level declaration sliced from the minified chunk; each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. Imports resolve
// through the source chunk's export table to exactly one of: another module generated here, a verified React export of
// vendor-frame, a public (semantic) name of the shared view-tabs graph (D1: CdsButton, checked against its manifest), or
// a named host adapter in src/source-r3b-settings-adapters.jsx. Migration 3.6556.2: R1 constants from
// official-3.6556.2.mjs, React aliases checked with official.assertVendorAlias (R3), minified features through
// official.looseFeature (R2). Roots, adapters and the main-process binding carry
// feature strings that must still appear in the original text, so a version bump that re-points a minified name fails
// here instead of silently binding the wrong value. Output is prettier-formatted after assembly.
//
// D0: own generator, own output (src/generated/r3b-settings/, electron/generated/r3b-settings-free-disk.cjs and its
// manifest), own scripts/verify-gen-r3b-settings.mjs.
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
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const mainSource = official.asarSource;
const output = path.join(root, 'src/generated/r3b-settings');
const electronOutput = path.join(root, 'electron/generated');
const electronTarget = 'r3b-settings-free-disk.cjs', electronManifest = 'r3b-settings-free-disk-manifest.json';
const adapterModule = '../../source-r3b-settings-adapters.jsx';
const viewTabsModule = '../view-tabs/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked with official.assertVendorAlias (a top-level
// `local=<namespace>.<member>` of the right namespace; R3: `Co` is useRef and `Ha` jsx in 3.6556.2).
const vendor = {
  [official.vendorFrame]: Object.fromEntries(['Co', 'ho', 'go', 'Ha'].map(alias => [alias, official.reactAliases[alias]])),
};
// Host dependencies (file -> export alias -> adapter name). `features` must appear in the resolved local's top-level
// declaration (`{ loose }`: official.looseFeature); `{ in, has }` checks another top-level declaration of the same chunk.
const adapters = {
  // react-intl useIntl (q) / FormattedMessage (Gt = memo(Wt)) over the local catalog.
  [official.vendorIntl]: {
    p: { name: 'useIntl', features: [{ loose: 'return Mt(e),e' }, { in: 'Mt', has: '[React Intl] Could not find required `intl` object' }] },
    l: { name: 'FormattedMessage', features: [{ loose: 'c(Wt,Ut)' }, { in: 'Wt', has: 'textComponent:a=r' }] },
  },
  // shared-52 cB (exported `ha`): useContext(ErrorsProvider) -> { addWarning, clearToast, … }.
  'shared-52-uHFNjl7C.js': { ha: { name: 'useErrors', features: [{ loose: 'w(Qz)' }, '"Must be called within ErrorsProvider"'] } },
  // shared-0 jS (exported `Ym`): the desktop bridge's DeviceStorage namespace.
  'shared-0-DDOOdL6P.js': { Ym: { name: 'DeviceStorage', features: ['globalThis["claude.web"]?.DeviceStorage'] } },
};
// shared-frame bindings the view-tabs graph publishes (D1): imported from it by public name, never copied. The React
// Compiler helpers (E3) come from official.compilerHelpers: their whole declaration must match the frozen feature.
const viewTabs = {
  [official.sharedFrame]: {
    Eu: { name: 'CdsButton', features: ['iconPosition:o', 'o===void 0?"start":o'] },
    ...Object.fromEntries(Object.entries(official.compilerHelpers).map(([alias, helper]) => [alias, { name: helper.name, compiler: helper }])),
  },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name (its keys are the roots);
// `features` pins each root to strings of its original (minified) text.
const modules = [
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
];
// Main process: YUr, the CommonJS namespaces it reads and the official callers that fix its argument and result.
const main = {
  file: 'index.chunk-jPKPzV-P.js', binding: 'YUr', exportedAs: 'freeDiskSpace',
  features: ['await(0,p.statfs)(t)', 'return e.bavail*e.bsize', 'n.default.dirname(t)', 'if(r===t)throw e'],
  // `let p=require("node:fs/promises");p=e.a(p)`: rebuilt as the module itself (statfs is a named export of both).
  namespaces: { p: { require: 'node:fs/promises', members: ['statfs'], prelude: 'const p = require("node:fs/promises");' },
    n: { require: 'node:path', members: ['default'], prelude: 'const n = { default: require("node:path") };' } },
  callers: { cEa: ['return YUr(a.app.getPath("userData"))'], pEa: ['getFreeDiskSpace:async()=>await cEa()??null'] },
};

const exportTable = text => {
  const start = text.lastIndexOf('export{');
  if (start < 0) return new Map();
  const body = text.slice(start + 7, text.indexOf('}', start));
  return new Map(body.split(',').filter(Boolean).map(entry => {
    const [local, exported = local] = entry.split(' as ');
    return [exported.trim(), local.trim()];
  }));
};

async function readChunk(name, cache, { scope = false } = {}) {
  const cached = cache.get(name);
  if (cached && (!scope || cached.program)) return cached;
  const bytes = cached?.bytes ?? await fs.readFile(path.join(source, name));
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

function checkFeatures(chunk, local, features, label) {
  const text = declarationText(chunk, local);
  for (const feature of features) {
    if (typeof feature === 'string') { if (!text.includes(feature)) throw Error(`${label}: ${chunk.name}:${local} lacks ${JSON.stringify(feature)}`); continue; }
    if (feature.loose) { if (!official.looseFeature(feature.loose).test(text)) throw Error(`${label}: ${chunk.name}:${local} lacks loose ${JSON.stringify(feature.loose)}`); continue; }
    if (!declarationText(chunk, feature.in).includes(feature.has)) throw Error(`${label}: ${chunk.name}:${feature.in} lacks ${JSON.stringify(feature.has)}`);
  }
}

function vendorImport(chunk, alias) {
  const target = vendor[chunk.name]?.[alias];
  if (!target) throw Error(`Unmapped vendor import ${chunk.name}:${alias}`);
  official.assertVendorAlias(chunk.code, alias, target);
  return target;
}

// W13 G11 (D1): originals another generated 3.6556.2 graph already holds and exports, imported from it instead of cut
// again here: shared-0 Pa (lazyInit), held by routines-shared's shared-0 (no imports, plain node). The holder's manifest
// must list the binding for the same source bytes and its module text must match the manifest.
const linkedOriginals = { 'shared-0-DDOOdL6P.js#Pa': { area: 'routines-shared', target: 'shared-0-DDOOdL6P.mjs' } };
async function linkedImport(chunk, local) {
  const link = linkedOriginals[`${chunk.name}#${local}`];
  if (!link) return null;
  const dir = path.join(root, 'src/generated', link.area);
  const held = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const mod = held.modules.find(m => m.target === link.target && m.source === chunk.name);
  if (held.referenceVersion !== referenceVersion || !mod || mod.sourceSha256 !== sha(chunk.bytes) || !mod.bindings.some(b => b.name === local))
    throw Error(`${link.area}/${link.target} does not hold the ${referenceVersion} ${chunk.name}#${local}`);
  const text = await fs.readFile(path.join(dir, link.target), 'utf8');
  if (sha(text) !== mod.sha256) throw Error(`${link.area}/${link.target} differs from its manifest`);
  const names = [...text.matchAll(/^export \{([^}]*)\};/gm)].flatMap(m => m[1].split(',').map(x => x.trim()).filter(Boolean))
    .map(spec => spec.split(/\s+as\s+/)).filter(([l]) => l === local).map(([l, as]) => as ?? l);
  if (!names.length) throw Error(`${link.area}/${link.target} does not export ${local}`);
  return { from: `../${link.area}/${link.target}`, name: names[0] };
}

let viewTabsManifest;
async function viewTabsImport(chunk, alias, spec) {
  viewTabsManifest ??= await viewTabsManifestFor(referenceVersion);
  const local = chunk.exported.get(alias), entry = viewTabsManifest.publicNames?.[spec.name];
  if (viewTabsManifest.referenceVersion !== referenceVersion || !entry || entry.file !== chunk.name || entry.local !== local || entry.export !== alias)
    throw Error(`view-tabs ${spec.name} is not ${chunk.name}:${local} (${JSON.stringify(entry)}, ${viewTabsManifest.referenceVersion})`);
  if (spec.compiler) {
    // E3: the whole helper declaration (and J9 = the vendor-frame `Oo` import) is checked once per shared-frame.
    chunk.compilerHelpers ??= official.assertCompilerHelpers(chunk.code);
    if (chunk.compilerHelpers[spec.name]?.local !== local) throw Error(`view-tabs ${spec.name} is not compiler helper ${local}`);
  } else checkFeatures(chunk, local, spec.features, `view-tabs ${spec.name}`);
  return { from: `${viewTabsModule}${chunk.name}`, name: spec.name };
}

async function extractRenderer(cache) {
  const emitted = []; // { spec, src }
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-r3b-settings.mjs', adapterModule: 'src/source-r3b-settings-adapters.jsx', modules: [] };
  const files = {};
  for (const spec of modules) {
    const src = await readChunk(spec.source, cache, { scope: true });
    for (const [exported, local] of Object.entries(spec.officialExports ?? {}))
      if (src.exported.get(exported) !== local) throw Error(`${spec.source}: official export ${exported} is ${src.exported.get(exported)}, not ${local}`);
    for (const [local, features] of Object.entries(spec.features)) checkFeatures(src, local, features, spec.target);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const resolve = async (file, alias, via) => {
      const dep = await readChunk(file, cache);
      if (vendor[file]) { const [from, name] = vendorImport(dep, alias); return { from, name, via, kind: 'react' }; }
      if (adapters[file]?.[alias]) {
        const entry = adapters[file][alias], local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is no longer exported`);
        checkFeatures(dep, local, entry.features, `adapter ${entry.name}`);
        return { from: adapterModule, name: entry.name, via: `${via} (${local})`, kind: 'adapter' };
      }
      if (viewTabs[file]?.[alias]) return { ...await viewTabsImport(dep, alias, viewTabs[file][alias]), via, kind: 'view-tabs' };
      const local = dep.exported.get(alias);
      const link = local && await linkedImport(dep, local);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by scripts/extract-r3b-settings.mjs.\n// Edit the extractor or src/source-r3b-settings-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      exports: spec.exports,
    });
    emitted.push({ spec, src });
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
function mainFunction(code, name) {
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

async function extractMain() {
  const bytes = await fs.readFile(path.join(mainSource, main.file));
  const code = bytes.toString();
  const fn = mainFunction(code, main.binding);
  for (const feature of main.features) if (!fn.text.includes(feature)) throw Error(`${electronTarget}: ${main.binding} lacks ${JSON.stringify(feature)}`);
  for (const [caller, features] of Object.entries(main.callers)) {
    const text = mainFunction(code, caller).text;
    for (const feature of features) if (!text.includes(feature)) throw Error(`${electronTarget} caller: ${caller} lacks ${JSON.stringify(feature)}`);
  }
  const node = fn.node;
  if (!node.async) throw Error(`${main.file}: ${main.binding} is no longer an async function`);
  for (const [namespace, wanted] of Object.entries(main.namespaces)) {
    // Chunk prelude: `<ns>=require("<module>");<ns>=e.a(<ns>)` (the ESM interop wrapper), declared once by `let`.
    const required = `${namespace}=require(${JSON.stringify(wanted.require)});${namespace}=e.a(${namespace})`;
    const prelude = code.slice(0, code.indexOf('function '));
    if (!prelude.includes(required) || !new RegExp(`(?:let |,)${namespace.replace(/\$/g, '\\$')}=require\\(`).test(prelude))
      throw Error(`${main.file}: ${namespace} no longer requires ${wanted.require}`);
    for (const member of memberReads(node, namespace, main.file)) if (!wanted.members.includes(member)) throw Error(`${main.file}: ${main.binding} reads unmapped ${namespace}.${member}`);
  }
  const preludes = Object.entries(main.namespaces).map(([namespace, wanted]) => `// ${namespace} = e.a(require("${wanted.require}"))\n${wanted.prelude}`);
  const header = `// Original Claude Desktop ${referenceVersion} main-process binding; generated by scripts/extract-r3b-settings.mjs.\n// ${main.file} ${main.binding}: DeviceStorage.getFreeDiskSpace (pEa) returns \`await cEa() ?? null\`, cEa = ${main.binding}(app.getPath("userData")).\n`;
  const text = await format(`${header}"use strict";\n${preludes.join('\n')}\n${fn.text}\nmodule.exports = { ${main.exportedAs}: ${main.binding} };\n`, { parser: 'babel' });
  // The module must be closed: every identifier it reads is declared in it (CommonJS require/module aside).
  const parsed = babel.babelParse(text, electronTarget, false);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals).filter(name => !['require', 'module'].includes(name)); } });
  if (globals.length) throw Error(`${electronTarget}: unbound ${globals.join(', ')}`);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-r3b-settings.mjs', output: electronTarget,
    source: path.relative(root, path.join(mainSource, main.file)), sourceSha256: sha(bytes), binding: main.binding, exportedAs: main.exportedAs,
    bindingSha256: sha(fn.text), namespaces: Object.fromEntries(Object.entries(main.namespaces).map(([n, w]) => [n, { require: w.require, members: w.members }])),
    callers: main.callers, sha256: sha(text) };
  return { [electronTarget]: text, [electronManifest]: JSON.stringify(manifest, null, 2) + '\n' };
}

export async function extractR3bSettings({ check = false } = {}) {
  const cache = new Map();
  const files = await extractRenderer(cache);
  const electronFiles = await extractMain();
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
  const manifest = JSON.parse(files['manifest.json']);
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} r3b-settings modules (${count} original ${referenceVersion} bindings) and ${electronTarget}.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR3bSettings({ check: process.argv.includes('--check') });
