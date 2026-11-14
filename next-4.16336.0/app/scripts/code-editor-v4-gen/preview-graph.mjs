// Renderer slicing for the code-editor-v4 areas preview-element and preview-sketch (round 2 unit code-editor:c), on top
// of common.mjs (4.16336.0 snapshot, AST closures). common.mjs slice() copies every producer chunk it reaches; a React
// component of the 4.16336.0 renderer reaches React, the CDS design system, other generated graphs' state and host
// services, so sliceLinked() resolves each import before it would copy it, in this order (the same order as the
// runSlicer engine of scripts/extract-working-line.mjs, which writes whole graph folders and so cannot write into this
// area-structured output):
//   1. a host binding the area names (`hosts`: `<chunk>:<export alias>` -> a factory parameter or an expression; its
//      official declaration must still carry the pinned features);
//   2. React: a vendor-frame alias of official-4.16336.0.mjs reactAliases (assertVendorAlias), imported from react,
//      react/jsx-runtime, react-dom or react/compiler-runtime;
//   3. a cds-core public name (sharedGraph 'cds-core': the reviewed manifest the driver pins), imported from
//      ../cds-core/<target> under its export name;
//   4. a binding a linked 4.16336.0 graph holds and exports (D1: `linkedGraphs`, each module's bytes checked against its
//      manifest), imported from ../<graph>/<target>;
//   5. otherwise the official declaration is copied: the producer chunk's closure of that local, in its own block scope
//      (common.mjs layout: `const $c_<chunk>=(()=>{…;return {…}})()`).
// Steps 3 and 4 apply to every top-level declaration a closure reaches, not only to imports: a declaration of a listed
// chunk that cds-core publishes or a linked graph exports is imported, never copied (closure `stop`). A copied declaration
// that is module state (a context, a module-level Map / Set / WeakMap / WeakSet, a zustand store) and that cds-core holds
// stops generation (D46: it needs a cds-core public name, recorded as a cdsCoreNeeds entry); module state held only here
// is returned so the area states why (manifest ownedStateReasons, the D1 gate's justification).
import babel from '../../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { fs, path, root, sha, chunk, closure, closureText, exportedLocal, declarationSha, namespaceOf } from './common.mjs';
import * as official from '../official-4.16336.0.mjs';

const generatedRoot = path.join(root, 'src/generated');
const ion = 'ion';
const compact = text => text.replace(/\s+/g, '');
export const hasFeatures = (text, features) => features.every(f => (f instanceof RegExp ? f.test(text) : compact(text).includes(compact(f))));
export function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !(f instanceof RegExp ? f.test(text) : compact(text).includes(compact(f))));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? String(f) : JSON.stringify(f))).join(', ')}`);
}

// ---------------------------------------------------------------- link tables
// The names a generated module exports (local -> exported), read from its own `export { a as b }` statements.
function moduleExports(text, label) {
  const ast = babel.babelParse(text, label, true), out = new Map();
  for (const node of ast.program.body) {
    if (node.type !== 'ExportNamedDeclaration' || node.source) continue;
    for (const s of node.specifiers ?? []) out.set(s.local.name, s.exported.name ?? s.exported.value);
    if (node.declaration?.id) out.set(node.declaration.id.name, node.declaration.id.name);
    for (const d of node.declaration?.declarations ?? []) if (d.id.type === 'Identifier') out.set(d.id.name, d.id.name);
  }
  return out;
}
let cdsTable = null;
// cds-core: public names (file#local -> { module, name }) and every binding it copies (D46 state check).
export async function cdsCore() {
  if (cdsTable) return cdsTable;
  const manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`cds-core is ${manifest.referenceVersion}`);
  const published = new Map(), held = new Set();
  for (const m of manifest.modules) for (const b of m.bindings ?? []) held.add(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`);
  for (const [name, e] of Object.entries(manifest.publicNames)) published.set(`${e.file}#${e.local}`, { module: `../cds-core/${e.target}`, name: e.exportName, publicName: name });
  cdsTable = { published, held };
  return cdsTable;
}
// Linked 4.16336.0 graphs: file#local -> { module, name, graph } for every binding a listed graph copies and exports
// (its module bytes must equal the sha256 its manifest records). `only` (graph -> [targets]) limits a graph to the
// named modules.
export async function linkedTable(graphs) {
  const out = new Map();
  for (const entry of graphs) {
    const graph = typeof entry === 'string' ? entry : entry.graph;
    const only = typeof entry === 'string' ? null : new Set(entry.modules);
    const dir = path.join(generatedRoot, graph);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== official.referenceVersion) throw Error(`linked graph ${graph} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
    if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`linked graph ${graph} snapshot is ${manifest.referenceSnapshot}`);
    for (const target of only ?? []) if (!manifest.modules.some(m => m.target === target)) throw Error(`linked module ${graph}/${target} is not in its manifest`);
    for (const m of manifest.modules) {
      if (only && !only.has(m.target)) continue;
      if (typeof m.source !== 'string') continue;
      const bytes = await fs.readFile(path.join(dir, m.target));
      if (m.sha256 && sha(bytes) !== m.sha256) throw Error(`${graph}/${m.target} differs from its manifest`);
      const exported = moduleExports(bytes.toString(), `${graph}/${m.target}`);
      for (const b of m.bindings ?? []) {
        const local = typeof b === 'string' ? b : b.name;
        const file = typeof b === 'object' && b.file ? path.basename(b.file) : path.basename(m.source);
        const name = exported.get(local);
        if (!name) continue;
        const key = `${file}#${local}`;
        if (!out.has(key)) out.set(key, { module: `../${graph}/${m.target}`, name, graph });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- module state
const stateCtors = new Set(['Map', 'Set', 'WeakMap', 'WeakSet']);
// A context (vendor-frame createContext alias), a module-level collection, or a zustand-style store (`create(` /
// `createStore(` of vendor-all-0, recognised as an import whose producer text carries `getState` and `subscribe`).
export function moduleState(file, local) {
  const c = chunk(file, ion), entry = c.top.get(local);
  if (!entry?.kind) return null;
  // A module-level binding some statement reassigns (d1-lib `reassigned`).
  if (c.scope.bindings[local] && !c.scope.bindings[local].constant) return 'reassigned';
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && stateCtors.has(init.callee.name)) return 'collection';
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const imp = c.imports.get(init.callee.name);
    if (imp?.from === official.vendorFrame && official.reactAliases[imp.imported]?.[1] === 'createContext') return 'context';
    if (imp && imp.from.startsWith('vendor-all-0')) return 'store';
  }
  return null;
}

// ---------------------------------------------------------------- slicing
const anchors = { react: '__COMPILER_RUNTIME', 'react/jsx-runtime': 'jsxs', 'react-dom': 'flushSync' };
const nsCache = new Map();
// vendor-frame namespace local -> React module (the one declaration family `<x>=<ns>.<anchor>` names each namespace).
function vendorNamespaces(base) {
  if (nsCache.has(base)) return nsCache.get(base);
  const c = chunk(official.vendorFrame, base), out = new Map();
  for (const [module, anchor] of Object.entries(anchors)) {
    const owners = new Set();
    for (const e of c.top.values()) { const init = e.node.init; if (init?.type === 'MemberExpression' && !init.computed && init.object.type === 'Identifier' && init.property.name === anchor) owners.add(init.object.name); }
    if (owners.size !== 1) throw Error(`vendor-frame ${module} namespace is ambiguous (${[...owners].join(', ') || 'none'})`);
    out.set([...owners][0], module);
  }
  nsCache.set(base, out);
  return out;
}
const identifier = text => text.replace(/^\.\.\//, '').replace(/\.m?js$/, '').replace(/[^\w$]/g, '_');
// The import binding a generated adapter reads a module member under (unique per module and member).
export const importAlias = (module, name) => `$${identifier(module)}_${name === '*' ? 'ns' : name}`;

// sliceLinked(name, roots, { hosts, linked, base }): the closure of `roots` in chunk `name` with imports resolved as the
// header describes. Returns { text, imports (module -> Map(member -> alias)), sources, bindings, links, hostUsed, params,
// state (copied module state: file#local -> kind), cdsState (copied module state cds-core also holds) }.
// pure: a plain-node target (no React, no CDS): pure declarations are copied even where cds-core or a linked graph holds
// them; module state is still imported from its holder.
// forceLink: `file#local` keys linked even in a pure target (a pure declaration that reads module state its holder
// graph owns, e.g. code-current-v4's cycleBracketDirection over the keyboard-layout probe).
export async function sliceLinked(name, roots, { hosts = {}, linked = new Map(), base = ion, forceCopy = [], forceLink = [], localHosts = {}, pure = false } = {}) {
  const cds = await cdsCore();
  const vendorText = chunk(official.vendorFrame, base).text;
  const imports = new Map(), links = [], hostUsed = new Set(), params = new Map();
  const use = (module, member) => {
    if (!imports.has(module)) imports.set(module, new Map());
    const alias = importAlias(module, member);
    imports.get(module).set(member, alias);
    return alias;
  };
  // A declaration another graph answers for (cds-core public name, then a linked graph's export), as an import alias.
  const forced = new Set(forceCopy), alwaysLinked = new Set(forceLink);
  for (const key of alwaysLinked) if (!linked.has(key) && !cds.published.has(key)) throw Error(`${name}: forceLink ${key} has no holder`);
  const lookupLocal = (file, local) => {
    const key = `${file}#${local}`;
    if (forced.has(key)) return undefined;
    if (pure && !moduleState(file, local) && !alwaysLinked.has(key)) return undefined;
    return cds.published.get(key) ?? linked.get(key);
  };
  const bindShared = (key, shared) => {
    links.push({ binding: key, module: shared.module, name: shared.name, kind: shared.graph ? 'linked' : 'cds-core' });
    return use(shared.module, shared.name);
  };
  // vendor-frame's own code reads React through module namespaces (`c=e(i())`, `P=c.useCallback`): a declaration
  // `<local>=<namespace>.<member>` is that React member, the namespace itself is `import * as`, so React is never
  // copied (the namespaces are the ones carrying each module's anchor member, as official-4.16336.0.mjs checks aliases).
  const reactLocal = (file, local) => {
    if (file !== official.vendorFrame) return undefined;
    const ns = vendorNamespaces(base);
    if (ns.has(local)) return { module: ns.get(local), member: '*' };
    const init = chunk(file, base).top.get(local)?.node.init;
    if (init?.type === 'MemberExpression' && !init.computed && init.object.type === 'Identifier' && ns.has(init.object.name)) return { module: ns.get(init.object.name), member: init.property.name };
    return undefined;
  };
  // localHosts: `<chunk>#<local>` -> { param | expr, features } for a top-level declaration of a sliced chunk the host
  // answers (it is not copied; features are pinned on its raw text).
  const localHost = (file, local) => localHosts[`${file}#${local}`];
  const resolveLocal = (file, local) => {
    const lh = localHost(file, local);
    if (lh) {
      assertFeatures(`local host ${file}#${local}`, chunk(file, base).top.get(local)?.text ?? '', lh.features ?? []);
      hostUsed.add(`${file}#${local}`);
      if (lh.param) { params.set(lh.param, null); return lh.param; }
      return `(${lh.expr})`;
    }
    const react = reactLocal(file, local);
    if (react) { if (pure) throw Error(`${name}: pure target reads React (${file}#${local})`); return use(react.module, react.member); }
    const shared = lookupLocal(file, local);
    return shared ? bindShared(`${file}#${local}`, shared) : undefined;
  };
  const resolveImport = (from, imported) => {
    const host = hosts[`${from}:${imported}`];
    if (host) {
      const producerLocal = exportedLocal(from, base, imported);
      // Features are pinned on the official declaration the host stands in for (raw text), and on `also` declarations
      // of the same chunk (local -> features) it reads.
      const decl = chunk(from, base).top.get(producerLocal);
      if (!decl) throw Error(`host ${from}:${imported}: ${producerLocal} is not a declaration`);
      assertFeatures(`host ${from}:${imported} (${producerLocal})`, decl.text, host.features ?? []);
      for (const [other, features] of Object.entries(host.also ?? {})) assertFeatures(`host ${from}:${imported} also ${other}`, chunk(from, base).top.get(other)?.text ?? '', features);
      hostUsed.add(`${from}:${imported}`);
      if (host.param) { params.set(host.param, host.fallback ?? null); return host.param; }
      if (host.module) { links.push({ binding: `${from}#${producerLocal}`, module: host.module, name: host.name, kind: 'host-link' }); return use(host.module, host.name); }
      return `(${host.expr})`;
    }
    if (from === official.vendorFrame && official.reactAliases[imported]) {
      if (pure) throw Error(`${name}: pure target reads React (${imported})`);
      const { module, member } = official.assertVendorAlias(vendorText, imported);
      return use(module, member);
    }
    const producerLocal = exportedLocal(from, base, imported);
    const producer = chunk(from, base);
    if (producer.imports.has(producerLocal)) return undefined; // a re-export: followed into the producer's own import
    return resolveLocal(from, producerLocal);
  };

  const wanted = new Map([[name, new Set(roots)]]), closures = new Map(), deps = new Map(), bound = new Map(), wantedBy = new Map();
  for (let changed = true; changed;) {
    changed = false;
    for (const [file, set] of [...wanted]) {
      const c = chunk(file, base);
      const stop = [];
      for (const local of c.top.keys()) if (!set.has(local) && (localHost(file, local) || reactLocal(file, local) || lookupLocal(file, local))) stop.push(local);
      const cl = closure(file, base, [...set], { stop });
      closures.set(file, cl);
      const head = new Map();
      for (const local of cl.stopped.keys()) head.set(local, resolveLocal(file, local));
      const uses = new Map();
      for (const [local, { from, imported }] of cl.imports) {
        const alias = resolveImport(from, imported);
        if (alias !== undefined) { head.set(local, alias); continue; }
        if (imported === '*' || imported === 'default') throw Error(`${file}: ${imported} import of ${from} is not supported`);
        const producerLocal = exportedLocal(from, base, imported);
        const producer = chunk(from, base), binding = producer.scope.bindings[producerLocal];
        if (binding && !binding.constant) throw Error(`${from}#${producerLocal} is reassigned at run time; a copied snapshot would not be a live binding`);
        if (!uses.has(from)) uses.set(from, []);
        uses.get(from).push([local, producerLocal]);
        if (!wanted.has(from)) wanted.set(from, new Set());
        if (!wanted.get(from).has(producerLocal)) { wanted.get(from).add(producerLocal); changed = true; wantedBy.set(`${from}#${producerLocal}`, `${file} (${local})`); }
      }
      deps.set(file, uses);
      bound.set(file, head);
    }
  }
  const order = [], state = new Map();
  (function visit(file, trail) {
    if (state.get(file) === 'done') return;
    if (state.get(file) === 'active') throw Error(`Chunk import cycle: ${[...trail, file].join(' -> ')}`);
    state.set(file, 'active');
    for (const from of deps.get(file).keys()) visit(from, [...trail, file]);
    state.set(file, 'done');
    order.push(file);
  })(name, []);
  const bindings = [], sources = [], blocks = [], copiedState = {}, cdsState = [];
  for (const file of order) {
    const cl = closures.get(file), c = cl.chunk;
    sources.push(c.source);
    for (const local of cl.locals) {
      const key = `${file}#${local}`;
      bindings.push({ name: local, file, sha256: declarationSha(c, local) });
      const kind = moduleState(file, local);
      if (kind) { copiedState[key] = kind; if (cds.held.has(key)) cdsState.push(key); }
    }
    const head = [];
    for (const [local, alias] of bound.get(file)) head.push(`const ${local}=${alias};`);
    for (const [from, pairs] of deps.get(file)) head.push(`const {${pairs.map(([local, l]) => (local === l ? local : `${l}:${local}`)).join(',')}}=${namespaceOf(from)};`);
    const body = [...head, closureText(cl)].join('\n');
    if (!process.env.PREVIEW_GRAPH_EXPLORE && /\bimport\s*\(/.test(closureText(cl))) throw Error(`${file}: a copied declaration has a dynamic import`);
    if (file === name) blocks.push(body);
    else blocks.push(`// ${file}\nconst ${namespaceOf(file)}=(()=>{\n${body}\n${'return'} {${[...wanted.get(file)].sort().join(',')}};\n})();`);
  }
  // (an import of a React member is no copy: `$react___CLIENT_INTERNALS…` aliases are skipped)
  for (const block of blocks) if (!process.env.PREVIEW_GRAPH_EXPLORE && /react\.transitional\.element|(?<!\$react_)__CLIENT_INTERNALS_DO_NOT_USE/.test(block)) throw Error(`${name}: a copy of React itself would be emitted (${block.slice(0, 60).split('\n')[0]}; ${block.match(/.{0,80}(?:react\.transitional\.element|(?<!\$react_)__CLIENT_INTERNALS_DO_NOT_USE).{0,40}/)?.[0]})`);
  if (cdsState.length) throw Error(`${name}: module state cds-core holds without a public name would be copied (D46): ${cdsState.join(', ')}`);
  for (const key of Object.keys(localHosts)) if (!hostUsed.has(key)) throw Error(`${name}: local host ${key} is no longer read`);
  for (const key of Object.keys(hosts)) if (!hostUsed.has(key)) throw Error(`${name}: host binding ${key} is no longer read`);
  const keptLinks = links.filter((l, i) => links.findIndex(x => x.binding === l.binding) === i);
  return { text: blocks.join('\n'), imports, sources, bindings, links: keptLinks, hostUsed, params, state: copiedState, wantedBy };
}

export function importText(imports) {
  const sorted = list => list.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return sorted([...imports]).flatMap(([module, members]) => {
    const named = sorted([...members].filter(([member]) => member !== '*'));
    return [
      ...(members.has('*') ? [`import * as ${members.get('*')} from ${JSON.stringify(module)};`] : []),
      ...(named.length ? [`import {${named.map(([member, alias]) => (member === 'default' ? `default as ${alias}` : `${member} as ${alias}`)).join(',')}} from ${JSON.stringify(module)};`] : []),
    ];
  }).join('\n');
}
export function mergeImports(...all) {
  const out = new Map();
  for (const imports of all) for (const [module, members] of imports) {
    if (!out.has(module)) out.set(module, new Map());
    for (const [member, alias] of members) out.get(module).set(member, alias);
  }
  return out;
}

// Free names of a finished adapter must be platform globals (or `allow`).
const GLOBALS = new Set(['Array', 'Boolean', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'JSON', 'Map', 'Math', 'Number', 'Object', 'Promise', 'RegExp', 'Set',
  'String', 'Symbol', 'WeakMap', 'WeakSet', 'WeakRef', 'Reflect', 'Proxy', 'Intl', 'Date', 'BigInt', 'isNaN', 'isFinite', 'parseFloat', 'parseInt', 'undefined',
  'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'performance', 'console', 'queueMicrotask', 'structuredClone', 'arguments',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
  'getComputedStyle', 'matchMedia', 'devicePixelRatio', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'atob', 'btoa',
  'CSS', 'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLCanvasElement', 'HTMLImageElement', 'SVGElement', 'Node', 'NodeFilter',
  'Event', 'CustomEvent', 'KeyboardEvent', 'PointerEvent', 'MouseEvent', 'FocusEvent', 'ResizeObserver', 'MutationObserver', 'IntersectionObserver',
  'AbortController', 'DOMRect', 'DOMMatrix', 'DOMException', 'Path2D', 'Image', 'ImageData', 'OffscreenCanvas', 'createImageBitmap', 'CanvasRenderingContext2D',
  'Blob', 'File', 'FileReader', 'URL', 'URLSearchParams', 'ClipboardItem', 'fetch', 'Headers', 'Request', 'Response', 'TextEncoder', 'TextDecoder',
  'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView',
  'reportError', 'self', 'location', 'localStorage', 'sessionStorage', 'Range', 'Text', 'Document', 'ShadowRoot', 'EventTarget', 'MessageChannel',
  'AggregateError', 'FinalizationRegistry', 'process', 'ErrorEvent', 'Function', 'escape', 'unescape']);
export function assertBound(label, text, allow = []) {
  const ast = babel.babelParse(text, label, true);
  let globals = [];
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const free = globals.filter(name => !GLOBALS.has(name) && !allow.includes(name));
  if (free.length) throw Error(`${label}: unbound ${free.join(', ')}`);
}

// Root pins: { probe | pattern, features?, alias?, sha256 } -> the located local (common.mjs locatePinned).
export function pinnedRoots(ctx, file, pins, base = ion) {
  const out = {};
  for (const [name, spec] of Object.entries(pins)) out[name] = { file, local: ctx.locatePinned(file, base, spec), sha256: spec.sha256, ...(spec.previous ? { previous: spec.previous } : {}) };
  return out;
}
