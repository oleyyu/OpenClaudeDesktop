// V3-W14-approvals (plan-w14-code.md, lane approvals, item appr-09): extract the 3.6556.2 form an MCP server's
// elicitation asks with (cc32965c2 bs, the "{serverName} requests your input" card): c9e77b76c A (cc32965c2 `t as Wr`,
// one field from its JSON-schema property: the label, the control, its hint and the submit-time error), cd359c6df t
// (`t as oa`, the form element: id, size, submit on ⌘↵ off), ce3d4614c t / n (`t as Do` the initial values from the
// schema's defaults, `n as Eo` the submit-time read and validation of the form's controls). The card around them stays the
// host's (source-approval-card.jsx, cc32965c2 bs's structure); this graph holds only the form.
//
// Same engine as extract-cowork-approval.mjs (3.6556.2 rules: R1 constants from official-3.6556.2.mjs; R2/E5 features as
// text or looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias; E3 the React
// Compiler helpers come from view-tabs by semantic name). A binding resolves, in this order, to: a host adapter of this
// graph, a host adapter routines-shared already uses for it (useIntl / FormattedMessage), a React alias of vendor-frame, a
// semantic public name of view-tabs, a binding routines-shared holds, a binding a linked graph holds and exports (D1), or a
// copy in this graph's module for its chunk. Own output folder src/generated/approval-elicitation, own
// scripts/verify-gen-approval-elicitation.mjs. --survey prints the closure without writing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/approval-elicitation');
// This graph has no host adapters of its own (adapters below is empty); the shared useIntl is routines-shared's.
const adapterModule = null;
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk.
const roots = {
  'c9e77b76c-BbGxr8n3.js': {
    A: { name: 'ElicitationField', export: 't', features: ['let $ = J9(225),', 'fieldSchema: n,', 'hasSubmitError: a,', 'clearSubmitError: o,', 'S = `${y}-error`,'] },
  },
  'cd359c6df-Dv3ZEbLT.js': {
    b: { name: 'ElicitationForm', export: 't', features: ['submitOnModEnter: u,', '"data-cds": "Form",', 'e.currentTarget.requestSubmit()'] },
  },
  'ce3d4614c-WVBm4FYv.js': {
    a: { name: 'elicitationInitialValues', export: 't', features: ['if ("default" in n && n.default !== void 0) {'] },
    o: { name: 'readElicitationForm', export: 'n', features: ['let o = new FormData(t),', '{ data: s, invalidFields: c }'] },
  },
};
const namespaceImports = { [`${official.vendorFrame}#c`]: 'react', [`${official.vendorFrame}#me`]: 'react/jsx-runtime', [`${official.vendorFrame}#Hn`]: 'react-dom' };
const vendorCopies = {};
const copyableVendors = ['vendor-frame-', 'vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
const adapters = {};

const rawCallSites = [
  { source: 'cc32965c2-BQu1bA_w.js', role: 'bs: the elicitation card renders the form (oa) with one field (Wr) per requested property, seeded by Do and validated by Eo',
    features: ['import{t as Wr}from"./c9e77b76c-BbGxr8n3.js"', 'import{t as oa}from"./cd359c6df-Dv3ZEbLT.js"', 'import{n as Eo,t as Do}from"./ce3d4614c-WVBm4FYv.js"',
      'n(oa,{id:u,size:"sm",submitOnModEnter:!1,disabled:d,onSubmitCapture:D,onSubmit:O,"data-testid":"epitaxy-elicitation-form","data-owns-typing-and-pastes":!0,children:M})'] },
];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'arguments', 'WeakRef', 'crypto', 'Uint8Array', 'FormData']);

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
async function resolveImport(entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
async function viewTabsGraph() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  const held = new Set();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) held.add(`${mod.source}#${typeof b === 'string' ? b : b.name}`);
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { published, held, pending };
}
// Graphs that already hold bindings this closure reaches (D1: imported, never sliced twice): cowork-progress (the
// cc5a62f6f panel Section L, row classes T, the flat / shrink contexts w / ne, the card surface ie), cowork-scheduled
// (c1dd841c3 o the run origin badge, shared-16 Xp the open-entity messages), cowork-home (shared-0 ia / ra, the remote
// session id test), proposal-group (shared-52 rd, the cse_ → session_ id normaliser). Only held bindings the linked module
// exports are imported (by its export name); their host adapters are not borrowed.
async function linkedGraphs() {
  const held = new Map();
  // The graphs this closure reaches (fixed, so a graph added later never moves a binding under a regenerated graph's
  // feet); the first one holding a binding answers it.
  const dirs = ['approval-landing', 'approval-titles', 'chat-projects', 'code-composer', 'code-routines', 'cowork-scheduled', 'files-changes',
    'cowork-approval', 'mcp-app-card', 'mcp-app-host', 'proposal-group', 'question-card', 'r4e-findings', 'session-rail', 'session-rail-context', 'session-rail-kit',
    'sessions-page', 'transcript-rows'];
  for (const dir of dirs) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
    for (const mod of manifest.modules) {
      const target = mod.target ?? mod.file ?? mod.source;
      if (typeof target !== 'string' || typeof mod.source !== 'string') continue;
      const file = path.join(root, 'src/generated', dir, target);
      const exported = await moduleExports(file).catch(() => new Map());
      for (const b of mod.bindings ?? []) {
        if (typeof b !== 'object' || !b.sha256) continue;
        const key = `${mod.source}#${b.name}`;
        if (!held.has(key) && exported.has(b.name)) held.set(key, { dir, target, sha256: b.sha256, sourceSha256: mod.sourceSha256, exportName: exported.get(b.name) });
      }
    }
  }
  return held;
}
// local -> exported name of a generated module's `export { … }` lists.
async function moduleExports(file) {
  const text = await fs.readFile(file, 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/^export \{([^}]*)\};/gm))
    for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [local, as] = spec.split(/\s+as\s+/);
      if (!out.has(local)) out.set(local, as ?? local);
    }
  return out;
}
async function routinesSharedGraph() {
  const manifest = await routinesSharedManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`routines-shared is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const held = new Map();
  for (const mod of manifest.modules) for (const b of mod.bindings) held.set(`${mod.source}#${b.name}`, { target: mod.target, sha256: b.sha256 });
  const shared = new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
  return { held, adapters: shared, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

export async function extractApprovalElicitation({ check = false, survey = false } = {}) {
  const cache = new Map();
  const { published, held, pending } = await viewTabsGraph();
  const rs = await routinesSharedGraph();
  const linked = await linkedGraphs();
  const resolved = new Map();
  const chunks = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), routinesShared: new Set(), linked: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (rs.held.has(key)) throw Error(`adapter ${key}: routines-shared holds this binding; import it, do not replace it`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (rs.adapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      result = { kind: 'shared-adapter', name: rs.adapters.get(key) };
    } else if (namespaceImports[key]) {
      result = { kind: 'react', module: namespaceImports[key], name: '*' };
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(src, local)) {
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
      result = { kind: 'react', module, name: member };
    } else if (published.has(key)) {
      result = { kind: 'view-tabs', name: published.get(key), file };
    } else if (held.has(key)) {
      if (!pending.has(key)) throw Error(`${key} is held by view-tabs without a semantic name; name it in extract-view-tabs.mjs (D46)`);
      result = { kind: 'view-tabs-held', name: local, file, pendingName: pending.get(key) };
    } else if (rs.held.has(key)) {
      const h = rs.held.get(key);
      if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: routines-shared holds a different declaration; rerun its generator`);
      result = { kind: 'routines-shared', name: local, target: h.target };
    } else if (linked.has(key)) {
      const h = linked.get(key);
      // Generators hash a binding over the raw or the prettier-formatted chunk; the same source bytes name the same binding.
      if (!entry || (sha(declarationText(src, entry)) !== h.sha256 && h.sourceSha256 !== sha(src.bytes))) throw Error(`${key}: ${h.dir} holds a different declaration; rerun its generator`);
      result = { kind: 'linked', name: h.exportName, from: `../${h.dir}/${h.target}` };
    } else if (file.startsWith('vendor-') && !vendorCopies[key] && !copyableVendors.some(prefix => file.startsWith(prefix))) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const bucket = kind => ({ adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'routines-shared': 'routinesShared', linked: 'linked' })[kind];
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[bucket(cls.kind)].add(key); return; }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(file, cache);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(entry, cache, key) : { file, local: dep };
      await visit(`${target.file}#${target.local}`, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }

  if (survey) {
    for (const p of problems) console.log('PROBLEM', p);
    for (const [file, locals] of chunks) console.log('CHUNK', file, [...locals].join(' '));
    for (const [k, set] of Object.entries(used)) console.log('USED', k, [...set].map(key => `${key}=>${resolved.get(key).name}`).join(' '));
    return null;
  }
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-approval-elicitation.mjs',
    sharedAdapterModule: 'src/source-routines-shared-adapters.jsx', publicNames: {}, modules: [], contexts: [], callSites: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local] of order) {
      for (const dep of declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'routines-shared') spec = { from: `../routines-shared/${cls.target}`, name: cls.name, kind: 'routines-shared' };
        else if (cls.kind === 'linked') spec = { from: cls.from, name: cls.name, kind: 'linked' };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${dep} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(dep);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${dep} resolves two ways`);
        imports.set(dep, { ...spec, via: key });
      }
    }
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (held.has(`${file}#${local}`) || rs.held.has(`${file}#${local}`) || linked.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
        manifest.contexts.push(`${file}#${local}`);
      }
    }
    const groups = new Map();
    const namespaceLines = [];
    for (const [local, spec] of imports) {
      if (spec.name === '*') { namespaceLines.push(`import * as ${local} from ${JSON.stringify(spec.from)};`); continue; }
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).concat(namespaceLines.sort()).join('\n');
    const emittedNodes = new Set();
    const blocks = order.filter(([, entry]) => !emittedNodes.has(entry.node) && emittedNodes.add(entry.node)).map(([, entry]) => emittedText(src, entry));
    const exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-approval-elicitation.mjs.\n// Edit the extractor, never this file.\n`;
    const target = moduleName(file);
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length) unboundGlobals.push(`${target}: ${unbound.join(', ')}`);
    files[target] = text;
    manifest.modules.push({
      target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via })),
    });
  }
  if (unboundGlobals.length) throw Error(`unbound globals:\n${unboundGlobals.join('\n')}`);
  const state = new Map();
  const walk = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') throw Error(`module cycle: ${[...trail, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const next of moduleGraph.get(name) ?? []) walk(next, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of moduleGraph.keys()) walk(name, []);
  const indexLines = [];
  for (const [file, names] of Object.entries(roots)) {
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'routines-shared' ? `../routines-shared/${cls.target}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      manifest.publicNames[spec.name] = { file, local, ...(spec.export !== undefined && { export: spec.export }), ...(cls.kind === 'routines-shared' && { routinesShared: cls.target }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${local} as ${spec.name}`);
    }
    for (const [from, specs] of groups) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the approval-elicitation roots; generated by extract-approval-elicitation.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  manifest.adapters = [];
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: rs.adapters.get(original) }));
  manifest.routinesSharedImports = used.routinesShared.size;
  manifest.linkedImports = [...used.linked].sort().map(key => ({ original: key, from: resolved.get(key).from, name: resolved.get(key).name }));
  for (const site of rawCallSites) {
    const bytes = (await readSource(site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  // pendingDedupe: copies of this graph that another 3.6556.2 generated graph also holds without exporting them (D1 debt for
  // a later cleanup lane; empty means every held binding this closure reaches is imported).
  manifest.pendingDedupe = [];
  const copies = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const dir of (await fs.readdir(path.join(root, 'src/generated'))).sort()) {
    if (dir === 'approval-elicitation') continue;
    const other = await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8').then(JSON.parse, () => null);
    if (other?.referenceVersion !== referenceVersion) continue;
    for (const mod of other.modules ?? []) for (const b of mod.bindings ?? []) {
      const key = `${mod.source}#${typeof b === 'string' ? b : b.name}`;
      if (copies.has(key)) manifest.pendingDedupe.push({ original: key, heldBy: dir });
    }
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Approval elicitation output set changed: ${present.join(',')}. Run scripts/extract-approval-elicitation.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Approval elicitation source mismatch: ${name}. Run scripts/extract-approval-elicitation.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} approval elicitation modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports, ${used.linked.size} linked imports).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractApprovalElicitation({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
