// R4g-sidebar SB2 (research-ext/X7-partial-gaps.md X7-03; research/sidebar-sections.md WI-6): extract the 2.42304.0
// Code sidebar's section drag reorder without executing any desktop runtime. Officially iO (the manual sections) and nT
// (the Sessions folder buckets) each render shared-19 S$ (exported `Fi`, imported as `Qt`): it gives every shared-19 x$
// below it a drag bridge (_$ / v$, already generated in src/generated/sidebar-sections/section-sortable.mjs -- the same
// instance x$ reads, never a second copy) and, once there are at least two positions, mounts the lazily loaded chunk
// b$ (`sidebar_project_reorder_dnd`) = c1afd40ea `ProjectReorderBindings`: a dnd-kit DndContext (PointerSensor with
// `activationConstraint: { distance: 8 }`, closestCenter grouped by position, vertical list strategy) whose sortables
// publish their listeners / transform into the bridge, a drag ghost (DragOverlay at the CDS layer base + 1) and
// onCommitDrag(activeKey, overKey) on drop.
//
//   dnd-kit.mjs                   c09f6b4e5 (dnd-kit core + sortable + utilities, 47657 bytes): copied byte for byte;
//                                 only its one import statement (vendor-frame's React / ReactDOM re-exports) is
//                                 rewritten to import React / ReactDOM, alias by alias, each alias checked against
//                                 vendor-frame's `local=<ns>.<member>` assignment.
//   project-reorder-bindings.mjs  c1afd40ea (E ProjectReorderBindings, S the per-key sortable, C the drag ghost, w / T
//                                 the sensor and accessibility options): copied byte for byte, its imports rewritten to
//                                 React / ReactDOM, dnd-kit.mjs, reorder-support.mjs and drag-gesture.mjs.
//   layer-base.mjs                shared-frame Bd (exported `Bc`): the CDS layer base z-index (9e3).
//   reorder-support.mjs           shared-19 u$ (exported `Gi`: swallow the click a drop would make) and JQ (exported
//                                 `Ki`: the drag ghost's z-index, Mf + 1 over layer-base.mjs).
//   drag-gesture.mjs              shared-11 qs (exported `Xa`): the drag gesture session the bindings open on drag start
//                                 (grabbing cursor chrome Bs / Vs / Hs, selection block Us, the live-drag count Ws, the
//                                 pointer type Ks) and close on drop / cancel; its telemetry client is a host adapter.
//   section-reorder.mjs           shared-19 S$ (SectionReorder) and b$ (the lazy chunk handle). b$ is sliced verbatim
//                                 except its `load`: `f(() => import("./c1afd40ea-….js"), __vite__mapDeps([0, 1]))`
//                                 becomes `f(() => import("./project-reorder-bindings.mjs"))` -- the specifier points at
//                                 the generated copy and vite's own asset-dependency map (which this app's build makes
//                                 itself) is dropped; that is the only rewrite, recorded in the manifest. The lazy
//                                 loader (shared-104 fh / ph, shared-156 Ir) and the preload helper are host adapters.
//
// Slices: every emitted binding is an original top-level declaration sliced from the prettier-formatted source; a
// module's bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. Every
// import resolves to exactly one of: another module generated here, a React / ReactDOM export of vendor-frame, an
// already generated module that holds the *same original binding* (sidebar-sections by its manifest exports,
// code-current by its manifest bindings, both 2.42304.0), or a named host adapter in
// src/source-sidebar-reorder-adapters.jsx. Roots, adapters and externals carry feature strings that must still appear
// in the original text, so a version bump that re-points a minified name fails here instead of binding the wrong value.
//
// D0: own generator, own output folder (src/generated/sidebar-reorder), own scripts/verify-gen-sidebar-reorder.mjs.
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
const output = path.join(root, 'src/generated/sidebar-reorder');
const generatedRoot = path.join(root, 'src/generated');
const adapterFile = path.join(root, 'src/source-sidebar-reorder-adapters.jsx');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

// vendor-frame re-exports React / ReactDOM; each alias is checked against its `local=<ns>.<member>` assignment.
const VENDOR = 'vendor-frame-DfPJ1QmD.js';
const vendor = {
  $a: ['react', 'cloneElement'], Co: ['react', 'useState'], So: ['react', 'useRef'], bo: ['react', 'useMemo'],
  do: ['react', 'useContext'], eo: ['react', 'createContext'], mo: ['react', 'useEffect'], oo: ['react', 'memo'],
  ro: ['react', 'forwardRef'], so: ['react', 'default'], uo: ['react', 'useCallback'], xo: ['react', 'useReducer'],
  yo: ['react', 'useLayoutEffect'], wo: ['react', 'useSyncExternalStore'],
  Sa: ['react-dom', 'createPortal'], Ta: ['react-dom', 'unstable_batchedUpdates'],
  Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
};

// Original bindings (file:local) that already live in a generated module (the same instance, never a second copy).
const externals = {
  // x$ reads v$ and keeps its drag state in _$: S$ must provide that very context, so both come from the module x$ is in.
  'shared-19-CkPOiIKm.js:_$': { area: 'sidebar-sections', target: 'section-sortable.mjs', name: 'SectionDragBridge', features: ['this.subscribers = new Map()', 'setDrag(e, t)'] },
  'shared-19-CkPOiIKm.js:v$': { area: 'sidebar-sections', target: 'section-sortable.mjs', name: 'SectionDragBridgeContext', features: ['v$ = O(null)'] },
  // shared-11 se = shared-25 dp (exported `Pf`): a node's window, else the global one.
  'shared-25-DP8p7i1Z.js:dp': { area: 'code-current', target: 'owner-window.mjs', name: 'ownerWindowOrGlobal', features: ['up(e) ?? globalThis.window'] },
};

// Host dependencies (src/source-sidebar-reorder-adapters.jsx), keyed by the original binding (file:local).
const adapters = {
  // shared-104 fh (Fo): the lazy chunk definition {entry, pick, options} -> {Component, handle}.
  'shared-104-Cqo2-vQh.js:Fo': { name: 'defineLazyChunk', features: ['loadForRender', '"fail-open"', 'return { Component: u, handle: t };'] },
  // shared-104 ph (ko): the "no fallback UI" loading marker.
  'shared-104-Cqo2-vQh.js:ko': { name: 'noFallback', features: ['reason: e'] },
  // shared-156 Ir (dB): whether a lazy chunk is resident ("resident" / "pending" / "failed"), loading it while enabled.
  'shared-156-Bikz018e.js:dB': { name: 'useLazyChunkStatus', features: ['reportWait', '"resident"', 'e.preload("open")'] },
  // preload-helper t: vite's dynamic-import wrapper (CSS / dependency preloading, chunk retry).
  'preload-helper-D0dM6GpB.js:s': { name: 'preloadChunk', features: ['chunkLoadContext'] },
  // shared-25 id (Tv): the frame telemetry client; qs reports trackDragGesture on end (D17: not migrated).
  'shared-25-DP8p7i1Z.js:Tv': { name: 'dragTelemetry', features: ['trackDragGesture(e)', '"page.drag_gesture"'] },
};

// Emitted in dependency order. Slices: `exports` maps original local binding -> exported name (its keys are the roots,
// pinned by `features`). Copies: the whole chunk, byte for byte after its import statements (pinned by `features`).
const modules = [
  { target: 'dnd-kit.mjs', copy: 'c09f6b4e5-DErbwtLQ.js',
    features: ['activationConstraint', 'ct.activators=[{eventName:"onPointerDown"', 'st={cancel:{name:"pointercancel"},move:{name:"pointermove"},end:{name:"pointerup"}}',
      'function Yn(', 'export{de as _,Yn as a'] },
  { target: 'layer-base.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Bd: 'cdsLayerBase' }, features: { Bd: ['Bd = 9e3'] } },
  { target: 'reorder-support.mjs', source: 'shared-19-CkPOiIKm.js', exports: { u$: 'suppressClickAfterDrag', JQ: 'dragOverlayZIndex' },
    features: { u$: ['e.addEventListener("click", t, !0)', 'e.addEventListener("pointerdown", r, !0)'], JQ: ['JQ = Mf + 1'] } },
  { target: 'drag-gesture.mjs', source: 'shared-11-BuQ3CK5I.js', exports: { qs: 'beginDragGesture' },
    features: { qs: ['showCursor(e, t)', 'blockSelection()', 've.trackDragGesture({', '(Ws += 1)'] } },
  { target: 'project-reorder-bindings.mjs', copy: 'c1afd40ea-iYz9kai5.js',
    features: ['activationConstraint:{distance:8}', 'u("sidebar_project_reorder",{downEvent:e.activatorEvent})', 'showCursor("grabbing")',
      'f(String(e.active.id),String(t))', 'shadow-[var(--df-shadow-float)]', 'export{E as ProjectReorderBindings}'] },
  { target: 'section-reorder.mjs', source: 'shared-19-CkPOiIKm.js', exports: { S$: 'SectionReorder', b$: 'projectReorderChunk' },
    features: {
      S$: ['let [n] = h(() => new _$())', '(i === void 0 ? r.length : new Set(r.map((e) => i.get(e) ?? e)).size) > 1', '{ reportWait: !1 }', 'a === "resident" ? x(b$.Component, { bridge: n, ...t }) : null'],
      b$: ['id: "sidebar_project_reorder_dnd"', 'pick: (e) => e.ProjectReorderBindings', 'loading: Uu("no-ui")', 'onChunkError: "fail-open"'],
    },
    lazy: { b$: { chunk: 'c1afd40ea-iYz9kai5.js', target: 'project-reorder-bindings.mjs', helper: 'f', deps: '__vite__mapDeps' } } },
];

// ---------------------------------------------------------------- reading the original chunks
const formatted = new Map();
async function readSource(name) {
  if (formatted.has(name)) return formatted.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const record = { name, bytes, code, program, exported: chunkExports(bytes.toString()) };
  formatted.set(name, record);
  return record;
}
const raw = new Map();
async function readRaw(name) {
  if (!raw.has(name)) {
    const bytes = await fs.readFile(path.join(source, name));
    raw.set(name, { name, bytes, text: bytes.toString(), exported: chunkExports(bytes.toString()) });
  }
  return raw.get(name);
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
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !text.includes(f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
async function vendorImport(alias) {
  const target = vendor[alias];
  if (!target) return null;
  const chunk = await readRaw(VENDOR);
  const local = chunk.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(chunk.text))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
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
  const manifest = await readJson(path.join(area, 'manifest.json'));
  const module = manifest.modules.find(m => m.target === entry.target);
  if (!module) throw Error(`${entry.area}/${entry.target} is not generated`);
  const modulePath = path.join(area, entry.target);
  const names = module.bindings.map(b => (typeof b === 'string' ? b : b.name));
  const version = module.referenceVersion ?? manifest.referenceVersion;
  if (version !== referenceVersion || path.basename(module.source) !== file || !names.includes(local))
    throw Error(`${entry.area}/${entry.target} does not hold ${referenceVersion} ${file}:${local}`);
  const theirs = exportedLocal(await fs.readFile(modulePath, 'utf8'), entry.name);
  if (theirs !== local || (module.exports && module.exports[local] !== entry.name)) throw Error(`${entry.area}/${entry.target} does not export ${file}:${local} as ${entry.name}`);
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
    assertFeatures(`external ${key}`, closureText(await readSource(file), local), entry.features);
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
// b$'s load: `<helper>(() => import("./<chunk>"), <deps>([…]))` -> `<helper>(() => import("./<target>"))`.
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
