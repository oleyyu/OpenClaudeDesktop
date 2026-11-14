// R4g-sidebar SB2 (research-ext/X7-partial-gaps.md X7-03; research/sidebar-sections.md WI-6), moved to 3.6556.2 in the
// w4-sidebar-reorder lane (analysis/claude-3.6556.2-migrate-20261025 research/sidebar.md §1.1, §1.2, §3.4;
// data/sidebar-targets.json "sidebar-reorder/*"): extract the Code sidebar's section drag reorder without executing any
// desktop runtime. Officially the manual sections and the Sessions folder buckets each render shared-46 _M (exported
// `sr`; 2.42304.0 shared-19 S$): it gives every shared-46 gM below it a drag bridge (lM / uM, already generated in
// src/generated/sidebar-sections/section-sortable.mjs -- the same instance gM reads, never a second copy) and, once
// there are at least two positions, mounts the lazily loaded chunk mM (`sidebar_project_reorder_dnd`, 2.42304.0 b$) =
// c1afd40ea `ProjectReorderBindings`: a dnd-kit DndContext (PointerSensor with `activationConstraint: { distance: 8 }`,
// closestCenter grouped by position, vertical list strategy) whose sortables publish their listeners / transform into
// the bridge, a drag ghost (DragOverlay at the CDS layer base + 1) and onCommitDrag(activeKey, overKey) on drop.
//
//   dnd-kit.mjs                   c09f6b4e5 (dnd-kit core + sortable + utilities, 47657 bytes): copied byte for byte;
//                                 only its one import statement (vendor-frame's React / ReactDOM re-exports) is
//                                 rewritten to import React / ReactDOM, alias by alias, each alias checked against
//                                 vendor-frame's `local=<ns>.<member>` assignment (official-3.6556.2.mjs reactAliases).
//                                 3.6556.2 changed only that import statement against the 2.42304.0 copy (proven by
//                                 the E34 legacy view while session-rail lagged; removed in w10-cleanup-sidebar-legacy).
//   project-reorder-bindings.mjs  c1afd40ea (E ProjectReorderBindings, x the per-key sortable, C the drag ghost, w / T
//                                 the sensor and accessibility options), React Compiler output in 3.6556.2: copied
//                                 byte for byte, its imports rewritten to React / ReactDOM, dnd-kit.mjs,
//                                 reorder-support.mjs, drag-gesture.mjs and the view-tabs compiler helpers (E3/R3).
//   layer-base.mjs                shared-frame Ff (exported `au`; 2.42304.0 Bd): the CDS layer base z-index (9e3).
//   reorder-support.mjs           shared-46 tM (exported `_r`: swallow the click a drop would make; 2.42304.0 shared-19
//                                 u$) and kj (exported `yr`: the drag ghost's z-index, layer base + 1; 2.42304.0 JQ).
//   drag-gesture.mjs              shared-11 pl (exported `Yo`; 2.42304.0 qs): the drag gesture session the bindings
//                                 open on drag start (grabbing cursor chrome ol / sl / cl, selection block ll, the
//                                 live-drag count ul, the pointer type fl) and close on drop / cancel; its telemetry
//                                 client is a host adapter.
//   section-reorder.mjs           shared-46 _M (SectionReorder) and mM (the lazy chunk handle). mM is sliced verbatim
//                                 except its `load`: `n(() => import("./c1afd40ea-….js"), __vite__mapDeps([0, 1]))`
//                                 becomes `n(() => import("./project-reorder-bindings.mjs"))` -- the specifier points at
//                                 the generated copy and vite's own asset-dependency map (which this app's build makes
//                                 itself) is dropped; that is the only rewrite, recorded in the manifest. The lazy
//                                 loader (shared-104 ss / ts, shared-156 SK) and the preload helper are host adapters.
//
// Slices: every emitted binding is an original top-level declaration sliced from the prettier-formatted source; a
// module's bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. Every
// import resolves to exactly one of: another module generated here, a React / ReactDOM export of vendor-frame, a
// view-tabs public name (the React Compiler helpers, E3), an already generated module that holds the *same original
// binding* (sidebar-sections and code-current owner-window, both 3.6556.2, by their manifest exports; a producer on
// any other release fails generation), or a named host adapter in src/source-sidebar-reorder-adapters.jsx. Roots,
// adapters and externals carry feature strings (R2: literals, keys, class names; minified names only through
// looseFeature) that must still appear in the original text, so a version bump that re-points a minified name fails
// here instead of binding the wrong value.
//
// Its consumer session-rail (dnd-kit.mjs, reorder-support.mjs) reads this manifest as 3.6556.2 through
// scripts/sidebar-reorder-compat.mjs; the E34 legacy['2.42304.0'] view, its frozen JSON and the 2.42304.0
// alpha-equivalence checks are gone (w10-cleanup-sidebar-legacy).
//
// D0: own generator, own output folder (src/generated/sidebar-reorder), own scripts/verify-gen-sidebar-reorder.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { sidebarSectionsManifestFor, sidebarSectionsExportedLocal } from './sidebar-sections-compat.mjs';
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
const output = path.join(root, 'src/generated/sidebar-reorder');
const generatedRoot = path.join(root, 'src/generated');
const adapterFile = path.join(root, 'src/source-sidebar-reorder-adapters.jsx');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };
const loose = official.looseFeature;

const VENDOR = official.vendorFrame, SF = official.sharedFrame;
const S46 = 'shared-46-BIbZBGFq.js', S11 = 'shared-11-_AVGLHEz.js', S25 = 'shared-25-DOWZRSlq.js';
const S104 = 'shared-104-CTONUSaz.js', S156 = 'shared-156-BLTosN8U.js', PRELOAD = 'preload-helper-D0dM6GpB.js';
const DND = 'c09f6b4e5-CLm8I7_i.js', BINDINGS = 'c1afd40ea-D9tUr40x.js';

// Original bindings (file:local) that already live in a generated module (the same instance, never a second copy).
const externals = {
  // E3/R3: the React Compiler helpers are view-tabs' (one copy); their declarations are checked by assertCompilerHelpers.
  ...Object.fromEntries(Object.values(official.compilerHelpers).map(({ local, name }) => [`${SF}:${local}`, { area: 'view-tabs', name, features: [] }])),
  // gM reads uM and keeps its drag state in lM: _M must provide that very context, so both come from the module gM is in.
  [`${S46}:lM`]: { area: 'sidebar-sections', target: 'section-sortable.mjs', name: 'SectionDragBridge', features: ['this.subscribers = new Map()', 'setDrag(e, t)'] },
  [`${S46}:uM`]: { area: 'sidebar-sections', target: 'section-sortable.mjs', name: 'SectionDragBridgeContext', features: [loose('uM = x(null)')] },
  // shared-11 ge = shared-25 mf (exported `lp`): a node's window, else the global one (code-current, 2.42304.0 dp).
  [`${S25}:mf`]: { area: 'code-current', target: 'owner-window.mjs', name: 'ownerWindowOrGlobal', features: ['?? globalThis.window'] },
};

// Host dependencies (src/source-sidebar-reorder-adapters.jsx), keyed by the original binding (file:local).
const adapters = {
  // shared-104 ss (exported `mm`; 2.42304.0 fh): the lazy chunk definition {entry, pick, options} -> {Component, handle}.
  [`${S104}:ss`]: { name: 'defineLazyChunk', features: ['loadForRender', '"fail-open"', 'return { Component: u, handle: t, annotateOpen: o.annotate };'] },
  // shared-104 ts (exported `hm`; 2.42304.0 ph): the "no fallback UI" loading marker.
  [`${S104}:ts`]: { name: 'noFallback', features: ['reason: e'] },
  // shared-156 SK (exported `Mr`; 2.42304.0 Ir): whether a lazy chunk is resident ("resident" / "pending" / "failed"),
  // loading it while enabled.
  [`${S156}:SK`]: { name: 'useLazyChunkStatus', features: ['reportWait', '"resident"', 'e.preload("open")'] },
  // preload-helper t: vite's dynamic-import wrapper (CSS / dependency preloading, chunk retry).
  [`${PRELOAD}:s`]: { name: 'preloadChunk', features: ['chunkLoadContext'] },
  // shared-25 w_ (exported `Rd`; 2.42304.0 Tv): the frame telemetry client; pl reports trackDragGesture on end (D17).
  [`${S25}:w_`]: { name: 'dragTelemetry', features: ['trackDragGesture(e)', '"page.drag_gesture"'] },
};

// Emitted in dependency order. Slices: `exports` maps original local binding -> exported name (its keys are the roots,
// pinned by `features`). Copies: the whole chunk, byte for byte after its import statements (pinned by `features`).
const modules = [
  { target: 'dnd-kit.mjs', copy: DND,
    features: ['activationConstraint', 'ct.activators=[{eventName:"onPointerDown"', 'st={cancel:{name:"pointercancel"},move:{name:"pointermove"},end:{name:"pointerup"}}',
      'function Yn(', 'export{de as _,Yn as a'] },
  { target: 'layer-base.mjs', source: SF, exports: { Ff: 'cdsLayerBase' }, features: { Ff: [loose('Ff = 9e3')] } },
  { target: 'reorder-support.mjs', source: S46, exports: { tM: 'suppressClickAfterDrag', kj: 'dragOverlayZIndex' },
    features: { tM: ['e.addEventListener("click", t, !0)', 'e.addEventListener("pointerdown", r, !0)'], kj: [loose('kj = U + 1')] } },
  { target: 'drag-gesture.mjs', source: S11, exports: { pl: 'beginDragGesture' },
    features: { pl: ['showCursor(', 'blockSelection()', '.trackDragGesture({', 'durationMs:', loose('(ul += 1)')] } },
  { target: 'project-reorder-bindings.mjs', copy: BINDINGS,
    features: ['activationConstraint:{distance:8}', '("sidebar_project_reorder",{downEvent:e.activatorEvent})', 'showCursor("grabbing")',
      loose('f(String(e.active.id),String(t))'), 'shadow-[var(--df-shadow-float)]', 'export{E as ProjectReorderBindings}'] },
  { target: 'section-reorder.mjs', source: S46, exports: { _M: 'SectionReorder', mM: 'projectReorderChunk' },
    features: {
      _M: [loose('a === void 0 ? i.length : new Set(i.map((e) => a.get(e) ?? e)).size'), '{ reportWait: !1 }', '"resident"', '.Component, { bridge: r, ...n })', '.Provider, { value: r, children: [t, d] }'],
      mM: ['id: "sidebar_project_reorder_dnd"', 'tier: "T3"', 'pick: (e) => e.ProjectReorderBindings', '("no-ui")', 'onChunkError: "fail-open"'],
    },
    lazy: { mM: { chunk: BINDINGS, target: 'project-reorder-bindings.mjs', helper: 'n', deps: '__vite__mapDeps' } } },
];

// ---------------------------------------------------------------- reading the original chunks
const formatted = new Map();
async function readSource(name, dir = source) {
  const key = path.join(dir, name);
  if (formatted.has(key)) return formatted.get(key);
  const bytes = await fs.readFile(key);
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const record = { name, bytes, code, program, exported: chunkExports(bytes.toString()) };
  formatted.set(key, record);
  return record;
}
const raw = new Map();
async function readRaw(name, dir = source) {
  const key = path.join(dir, name);
  if (!raw.has(key)) {
    const bytes = await fs.readFile(key);
    raw.set(key, { name, bytes, text: bytes.toString(), exported: chunkExports(bytes.toString()) });
  }
  return raw.get(key);
}
// The chunk's export table (alias -> local) from its trailing `export{…}`.
function chunkExports(text) {
  const at = text.lastIndexOf('export{');
  if (at < 0) throw Error('chunk without an export table');
  const map = new Map();
  for (const part of text.slice(at + 7, text.indexOf('}', at)).split(',')) {
    const [local, alias] = part.trim().split(/\s+as\s+/);
    map.set(alias ?? local, local);
  }
  return map;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const nodeDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = src.program.scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of nodeDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
// A feature is a literal substring or (R2/E5) a looseFeature() RegExp.
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? String(f) : JSON.stringify(f))).join(', ')}`);
}
async function vendorImport(alias) {
  const target = official.reactAliases[alias];
  if (!target) return null;
  official.assertVendorAlias((await readRaw(VENDOR)).text, alias);
  return target;
}
async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
function exportedLocal(text, name) {
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      if ((as ?? local) === name) return local;
    }
  return null;
}

// Proves `entry` (a generated module export) is the original binding file:local of this version; returns its path.
async function resolveExternal(file, local, entry) {
  const area = path.join(generatedRoot, entry.area);
  if (entry.area === 'view-tabs') {
    const manifest = await viewTabsManifestFor(referenceVersion);
    const pub = manifest.publicNames?.[entry.name];
    if (manifest.referenceVersion !== referenceVersion || !pub || pub.file !== file || pub.local !== local)
      throw Error(`view-tabs public name ${entry.name} is not ${file}:${local}`);
    return path.join(area, pub.file);
  }
  const sections = entry.area === 'sidebar-sections';
  const manifest = sections ? await sidebarSectionsManifestFor(referenceVersion) : await readJson(path.join(area, 'manifest.json'));
  const module = manifest.modules.find(m => m.target === entry.target);
  if (!module) throw Error(`${entry.area}/${entry.target} is not generated`);
  const modulePath = path.join(area, entry.target);
  const names = module.bindings.map(b => (typeof b === 'string' ? b : b.name));
  const version = module.referenceVersion ?? manifest.referenceVersion;
  const sourceName = path.basename(module.source);
  const theirs = sections ? await sidebarSectionsExportedLocal(referenceVersion, entry.target, entry.name) : exportedLocal(await fs.readFile(modulePath, 'utf8'), entry.name);
  if (!theirs || !names.includes(theirs) || (module.exports && module.exports[theirs] !== entry.name)) throw Error(`${entry.area}/${entry.target} does not export ${entry.name}`);
  if (version !== referenceVersion) throw Error(`${entry.area}/${entry.target} is ${version}, expected ${referenceVersion}`);
  if (sourceName !== file || theirs !== local) throw Error(`${entry.area}/${entry.target}: ${entry.name} is ${sourceName}:${theirs}, not ${file}:${local}`);
  return modulePath;
}

// ---------------------------------------------------------------- resolving one original import
async function resolveImport({ self, file, alias, emitted, via }) {
  if (file === VENDOR) {
    const react = await vendorImport(alias);
    if (!react) throw Error(`${via}: vendor-frame ${alias} is not a React / ReactDOM export`);
    return { from: react[0], name: react[1], via, kind: 'react' };
  }
  const copied = emitted.find(m => m.spec.copy === file);
  if (copied) {
    if (!copied.exported.has(alias)) throw Error(`${via}: ${file} does not export ${alias}`);
    return { from: rel(self, path.join(output, copied.spec.target)), name: alias, via, kind: 'generated' };
  }
  const chunk = await readRaw(file);
  const local = chunk.exported.get(alias);
  if (!local) throw Error(`${via} is not exported`);
  return (await resolveLocal({ self, file, local, emitted, via })) ?? (() => { throw Error(`${via}: unresolved ${file}:${local}`); })();
}
// A binding of another chunk (or of the slice's own chunk, before slicing it): a sibling, an external or an adapter.
async function resolveLocal({ self, file, local, emitted, via }) {
  const key = `${file}:${local}`;
  const sibling = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
  if (sibling) return { from: rel(self, path.join(output, sibling.spec.target)), name: sibling.spec.exports[local], via, kind: 'generated', original: key };
  if (externals[key]) {
    const entry = externals[key];
    if (entry.features.length) assertFeatures(`external ${key}`, closureText(await readSource(file), local), entry.features);
    const target = await resolveExternal(file, local, entry);
    return { from: rel(self, target), name: entry.name, via, kind: 'external', area: entry.area, original: key };
  }
  if (adapters[key]) {
    const entry = adapters[key];
    assertFeatures(`adapter ${key}`, closureText(await readSource(file), local), entry.features);
    return { from: rel(self, adapterFile), name: entry.name, via, kind: 'adapter', original: key };
  }
  return null;
}

// ---------------------------------------------------------------- copies
// `import{A as x,…}from"./F";` statements at the very start of the chunk; the rest is kept byte for byte.
const IMPORT = /^import\{([^}]*)\}from"\.\/([^"]+)";/;
async function copyModule(spec, emitted) {
  const chunk = await readRaw(spec.copy);
  const self = path.join(output, spec.target);
  let rest = chunk.text;
  const imports = [];
  for (let m; (m = IMPORT.exec(rest)); rest = rest.slice(m[0].length)) {
    for (const part of m[1].split(',')) {
      const [alias, local = alias] = part.split(' as ');
      imports.push({ local, ...(await resolveImport({ self, file: m[2], alias, emitted, via: `${m[2]}:${alias}` })) });
    }
  }
  if (/(^|[;}])import[{(\s]|\bimport\(|__vite__/.test(rest)) throw Error(`${spec.copy}: unexpected import after the leading statements`);
  if (!rest.endsWith(';') || !/export\{[^}]*\};$/.test(rest)) throw Error(`${spec.copy}: body does not end with its export table`);
  assertFeatures(spec.target, rest, spec.features);
  const groups = new Map();
  for (const entry of imports) {
    if (!groups.has(entry.from)) groups.set(entry.from, []);
    groups.get(entry.from).push(entry.name === 'default' ? { def: entry.local } : `${entry.name} as ${entry.local}`);
  }
  const importText = [...groups].map(([from, names]) => {
    const def = names.find(n => typeof n === 'object');
    const named = names.filter(n => typeof n === 'string');
    return `import ${[def ? def.def : null, named.length ? `{ ${named.join(', ')} }` : null].filter(Boolean).join(', ')} from ${JSON.stringify(from)};`;
  }).join('\n');
  const header = `// Original Claude Desktop ${referenceVersion} chunk ${spec.copy}, copied byte for byte after its import statements;\n// generated by extract-sidebar-reorder.mjs. Edit the extractor or src/source-sidebar-reorder-adapters.jsx, never this file.\n`;
  const text = `${header}${importText}\n${rest}\n`;
  const exported = chunkExports(rest);
  emitted.push({ spec, exported });
  return {
    text,
    record: {
      target: spec.target, source: spec.copy, sourceSha256: sha(chunk.bytes), sha256: sha(text), referenceVersion, kind: 'copy',
      bodySha256: sha(Buffer.from(rest)), bodyBytes: Buffer.byteLength(rest),
      imports: imports.map(({ local, from, name, via, kind, original }) => ({ local, from, name, via, kind, ...(original ? { original } : {}) })),
      exports: Object.fromEntries(exported),
    },
  };
}

// ---------------------------------------------------------------- slices
// mM's load: `<helper>(() => import("./<chunk>"), <deps>([…]))` -> `<helper>(() => import("./<target>"))`.
function lazyLoadRewrite(src, p, name, lazy) {
  const hits = [];
  p.traverse({
    CallExpression(c) {
      const [load, deps] = c.node.arguments;
      if (c.node.callee.type !== 'Identifier' || c.node.callee.name !== lazy.helper || c.node.arguments.length !== 2) return;
      const body = load?.type === 'ArrowFunctionExpression' ? load.body : null;
      const dynamic = body?.type === 'ImportExpression' ? body.source : body?.type === 'CallExpression' && body.callee.type === 'Import' ? body.arguments[0] : null;
      if (dynamic?.type !== 'StringLiteral' || dynamic.value !== `./${lazy.chunk}`) return;
      if (deps?.type !== 'CallExpression' || deps.callee.type !== 'Identifier' || deps.callee.name !== lazy.deps) return;
      hits.push(c.node);
    },
  });
  if (hits.length !== 1) throw Error(`${name}: expected one ${lazy.helper}(() => import("./${lazy.chunk}"), ${lazy.deps}(…)), found ${hits.length}`);
  const call = hits[0];
  const helperBinding = src.program.scope.getBinding(lazy.helper);
  if (!helperBinding?.path.isImportSpecifier() || !helperBinding.path.parent.source.value.startsWith('./preload-helper-'))
    throw Error(`${name}: ${lazy.helper} is no longer the preload helper import`);
  const depsBinding = src.program.scope.getBinding(lazy.deps);
  const depsRefs = depsBinding ? depsBinding.referencePaths.filter(q => within(p, q)) : [];
  if (depsRefs.length !== 1 || depsRefs[0].node.start < call.start || depsRefs[0].node.end > call.end) throw Error(`${name}: ${lazy.deps} is read outside its load`);
  const original = src.code.slice(call.start, call.end);
  const replacement = `${lazy.helper}(() => import(${JSON.stringify(`./${lazy.target}`)}))`;
  const text = declarationText(src, p);
  const offset = call.start - p.node.start;
  return { text: text.slice(0, offset) + replacement + text.slice(offset + original.length), drop: lazy.deps, record: { binding: name, original, replacement } };
}

async function sliceModule(spec, emitted) {
  const src = await readSource(spec.source);
  const self = path.join(output, spec.target);
  const selected = new Map(), imports = new Map(), seen = new Set(), rewrites = [];
  const add = async name => {
    if (seen.has(name)) return;
    seen.add(name);
    const via = `${spec.source}:${name}`;
    if (!spec.exports[name]) {
      const resolved = await resolveLocal({ self, file: spec.source, local: name, emitted, via });
      if (resolved) { imports.set(name, resolved); return; }
    }
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${spec.target}: unbound ${name}`);
    const p = binding.path;
    if (p.isImportSpecifier()) {
      const file = p.parent.source.value.replace(/^\.\//, '');
      imports.set(name, await resolveImport({ self, file, alias: p.node.imported.name, emitted, via: `${file}:${p.node.imported.name}` }));
      return;
    }
    if (!p.isFunctionDeclaration() && !p.isVariableDeclarator() && !p.isClassDeclaration()) throw Error(`${spec.target}: unsupported declaration ${name}`);
    const lazy = spec.lazy?.[name];
    const rewrite = lazy ? lazyLoadRewrite(src, p, name, lazy) : null;
    if (!rewrite) p.traverse({
      ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
      CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
    });
    if (rewrite) rewrites.push(rewrite.record);
    selected.set(name, { p, text: rewrite?.text ?? declarationText(src, p) });
    for (const dep of nodeDeps(src, p)) if (dep !== rewrite?.drop) await add(dep);
  };
  for (const name of Object.keys(spec.exports)) {
    const binding = src.program.scope.getBinding(name);
    if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
    assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
    await add(name);
  }
  const order = [...selected].sort((a, b) => a[1].p.node.start - b[1].p.node.start);
  const blocks = order.map(([, { p, text }]) => (p.isVariableDeclarator() ? `var ${text};` : text));
  const groups = new Map();
  for (const [local, entry] of imports) {
    if (!groups.has(entry.from)) groups.set(entry.from, []);
    groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
  }
  const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
  const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
  const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-sidebar-reorder.mjs.\n// Edit the extractor or src/source-sidebar-reorder-adapters.jsx, never this file.\n`;
  const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
  emitted.push({ spec });
  return {
    text,
    record: {
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion, kind: 'slice',
      bindings: order.map(([name, { p }]) => ({ name, sha256: sha(declarationText(src, p)) })),
      ...(rewrites.length ? { rewrites } : {}),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    },
  };
}

export async function extractSidebarReorder({ check = false } = {}) {
  official.assertCompilerHelpers((await readRaw(SF)).text);
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-sidebar-reorder.mjs',
    adapterModule: 'src/source-sidebar-reorder-adapters.jsx', modules: [],
  };
  const files = {}, emitted = [];
  for (const spec of modules) {
    const { text, record } = spec.copy ? await copyModule(spec, emitted) : await sliceModule(spec, emitted);
    files[spec.target] = text;
    manifest.modules.push(record);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  const own = Object.keys(files);
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort();
    if (JSON.stringify(present) !== JSON.stringify([...own].sort())) throw Error(`Sidebar reorder output set changed: ${present.join(',')}. Run scripts/extract-sidebar-reorder.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8').catch(() => null) !== text) throw Error(`Sidebar reorder source mismatch: ${name}. Run scripts/extract-sidebar-reorder.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!own.includes(name)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + (m.bindings?.length ?? 0), 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} sidebar reorder modules (${count} sliced bindings, ${manifest.modules.filter(m => m.kind === 'copy').length} copied chunks, ${referenceVersion}).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractSidebarReorder({ check: process.argv.includes('--check') });
