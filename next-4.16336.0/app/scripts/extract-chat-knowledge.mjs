// w13-close-chat-projects-memory (G5, 3.6556.2 migration wave 13 closeout; closeout-items G5 chatfn-projects-04/05/06/07,
// chatfn-memory-02/03, E63 chatfn-projects-11): the claude.ai project knowledge and memory parts the Chat project page and
// Settings > Memory still drew by hand, extracted from 3.6556.2 without executing any desktop runtime (D0: own generator,
// own output folder src/generated/chat-knowledge, own scripts/verify-gen-chat-knowledge.mjs, host services in
// src/source-chat-knowledge-adapters.jsx). The engine is extract-chat-projects.mjs's (the code-routines one): every emitted
// binding is an original top-level declaration sliced from its 3.6556.2 chunk; a binding another graph holds is imported
// from that graph (D1). Roots and their services are listed below with the official evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/chat-knowledge');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-chat-knowledge-adapters.jsx';
// Other 3.6556.2 graphs whose slices this graph imports instead of copying (D1), in priority order.
const heldGraphs = ["routines-shared", "code-routines", "cowork-scheduled", "artifact-library", "cowork-home", "cowork-progress", "sessions-page", "chat-projects", "working-line", "proposal-group"];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. A root another 3.6556.2 graph already holds
// (cd75b47e6 l in code-routines, cf8745532 u in routines-shared) is re-exported from that graph's module (D1).

// The roots: chunk -> original local -> { name, export, features }.
const roots = {
  'shared-7-DBAgAi5H.js': {
    mD: { name: 'KnowledgeFileThumbnail', features: ['"data-testid": "file-thumbnail"', '"file-thumbnail-fade-in flex-1 min-w-0 overflow-hidden text-start"'] },
    OD: { name: 'KnowledgeFileTag', features: ['"uppercase truncate font-sans text-text-300 text-[11px] leading-[13px]"'] },
    GE: { name: 'knowledgeFileTagName', features: ['Tm({ imagesEnabled: !0 }).includes(t[0].toLowerCase()) ? t[0].slice(1) : "text"'] },
  },
  'shared-3-BCEbd8Fv.js': {
    FD: { name: 'formatKnowledgeFileSize', features: ['unitDisplay: n === "short" && a === 0 ? "long" : n,', 'return r ? gl(e.locale, o) : o;'] },
  },
  'c52b32660-DEFSqQOg.js': {
    // ge (exported o): the capacity bar the knowledge list (xe) leads with: progressbar, "{pctUsed}% of project capacity
    // used", the Info "Learn more about project knowledge" button, "Search mode", the at-capacity line.
    ge: { name: 'KnowledgeCapacityBar', features: ['defaultMessage: "{pctUsed}% of project capacity used", id: "barvY20yMi"', 'defaultMessage: "Learn more about project knowledge",',
      'href: "https://support.anthropic.com/en/articles/9517075-what-are-projects",', 'defaultMessage: "Search mode", id: "BIYQtyYBdw"'] },
  },
  'cf2f34ee4-uPxXNyjx.js': {
    kr: { name: 'AddTextContentDialog', features: ['defaultMessage: "Add text content", id: "wgxHbQ7D69"', 'size: "lg"'] },
    // _r's draft (`[S] = y(vr)`): a store of { title, content } the dialog edits and a save resets (S.setState(Or)).
    vr: { name: 'createTextContentDraft', features: ['return Te(yr);'] },
    _r: { name: 'KnowledgeAddMenu', features: ['callerIdentifier: "project", toggleGithubModalOpen: E', 'defaultMessage: "Error saving text content", id: "9U64gLEIVo"', '"data-testid": "project-doc-upload",'] },
  },
  'cffc9ea71-CxDp8J3U.js': {
    w: { name: 'MemoryPreviewContent', features: ['modalView: a,', 'bottomCTA: s,'] },
  },
};
const lazyImports = {};
const vendorCopies = {};
const linkedVendors = {
  'vendor-motion-DlXQpU4V.js#fd': { graph: 'working-line', target: 'vendor-motion.mjs' },
  'vendor-motion-DlXQpU4V.js#ul': { graph: 'working-line', target: 'vendor-motion.mjs' },
};
const adapterTable = {
  // cffc9ea71 w's memory services: this machine's memory (electron/chat-memory.mjs) through the host context the Settings
  // page and the project page provide (src/source-chat-knowledge-adapters.jsx ChatMemoryHostContext).
  'c274117ff-D-nlAnp_.js': {
    _: { name: 'useChatMemoryAvailable', features: ['e === "project" && n === "disabled_by_user" && r === !0'],
      boundary: 'Memory is available when this machine\'s memory (Settings > Memory: chat-memory enabled and not paused) is on; no claude.ai account memory status.' },
  },
  'shared-182-BI1KJccu.js': {
    $k: { name: 'useChatMemoryQuery', features: ['memory?project_uuid=${e}', 'includeProjectImport: c'],
      boundary: 'The memory ({memory, controls, updated_at}) is the local one (<userData>/memory, chat-memory state, the account or a project\'s) instead of /api/organizations/<org>/memory.' },
    QW: { name: 'useCreateKnowledgeText', features: ['["create_project_doc", { orgUuid: i, projectUuid: e }]'],
      boundary: '"Add text content" adds a text knowledge file through main (local-projects knowledge-add-text over project-knowledge.mjs addKnowledgeText) instead of the claude.ai project docs endpoint.' },
    yz: { name: 'useKnowledgeProject', features: ['placeholderFromLists: i,', 'defaultMessage: "Ask {name}", id: "bH47Z4hSE8"'],
      boundary: 'The project record _r reads is the local project: always private (a local project is never shared).' },
    iA: { name: 'useUpdateChatMemoryControls', features: ['skipAutoResynthesize: r,', 'defaultMessage: "Memory updated",', 'event_key: "claudeai.memory.edit_memory"'],
      boundary: 'An edit (controls) is saved and the memory regenerated by chat-memory (op controls: the core writes it in a hidden thread) instead of the claude.ai memory endpoints; no success toast.' },
  },
  // cf2f34ee4 _r (the knowledge rail's "Add files" control) and Sr (its dropdown): the local project's services.
  'cf2f34ee4-uPxXNyjx.js': {
    Er: { name: 'KnowledgeMcpSourceItems', features: ['mcpServers: t,', 'setIsUploadingMcpSync: l,', 'if (t.length === 0) return null;'],
      boundary: 'No MCP resource sources: Sr lists them only behind GrowthBook nebula_drift_enabled (off without GrowthBook, E49) and only for remote connectors with a url, read through claude.ai\'s in-browser MCP clients and kept as a claude.ai sync source; this machine\'s connectors run in the core (stdio), so the rows are not offered (closeout chatfn-projects-11).' },
  },
  'shared-156-BLTosN8U.js': {
    tj: { name: 'useKnowledgeGithubAvailable', features: ['return nj() === !0;'],
      boundary: 'GitHub is not offered as a knowledge source: its sync needs the claude.ai GitHub integration (OAuth through claude.ai, the org integrations query QA), which a local project has no account for — the branch the official takes when the integration is not enabled (E63 chatfn-projects-11).' },
    XA: { name: 'useKnowledgeGithubAuth', features: ['callerIdentifier: t,', 'toggleGithubModalOpen: n,'],
      boundary: 'No GitHub authentication (claude.ai OAuth): the GitHub row is never shown, so its click (check, then auth) never runs.' },
    wS: { name: 'useKnowledgeMcpServers', features: ['remoteServers: t ? e.remoteServers : xS,'],
      boundary: 'No claude.ai remote MCP clients: the server list Sr reads for MCP resource sources is empty.' },
  },
  'shared-4-DUB1Oi0O.js': {
    Nb: { name: 'useKnowledgeTokens', features: ['r = Xe(jb, !!e && !t && !n),'],
      boundary: 'The knowledge size is the local store\'s token estimate (project-knowledge.mjs statsOf tokens) instead of /kb/stats.' },
    kb: { name: 'useKnowledgeCapacity', features: ['ce("project_knowledge_limit", "limit", bb, q)'],
      boundary: 'maxKbTokens is the local MAX_KB_TOKENS (project-knowledge.mjs, Claude\'s context window) instead of the model list\'s hard_limit or a GrowthBook value.' },
    // c52b32660 ge's search-mode services (x / w / C).
    Db: { name: 'useKnowledgeSearchRollout', features: ['Y("claude_ai_project_bananagrams")', 'mt("project_knowledge_search").isAvailable;'],
      boundary: 'The project knowledge search UI rollout (GrowthBook claude_ai_project_bananagrams) is off without GrowthBook (E49): the capacity bar shows its Info "Learn more about project knowledge" button and no Search mode label or threshold mark. The local search itself (project_knowledge_search past INLINE_MAX_CHARS) still runs; turning the label on is this adapter returning true.' },
    Yb: { name: 'useKnowledgeSearchThreshold', features: ['return n.project_knowledge_search_threshold;'],
      boundary: 'No claude.ai project settings: the search threshold mark is not drawn (the rollout is off).' },
    Ob: { name: 'useKnowledgeSearchActive', features: ['return !!(t && n.use_project_knowledge_search);'],
      boundary: 'The "Search mode" label reads the rollout first (off), as the official does; the local store\'s searchMode is not shown.' },
    Qb: { name: 'useKnowledgeFileUpload', features: ['handleProjectFileUpload: R,', 'trackPendingDoc: z,'],
      boundary: 'Files picked in the hidden input are read in the renderer as { name, bytes } and added by main (local-projects knowledge-add-content: private copies, conversion, size / count / capacity refusals) instead of the claude.ai upload; no pending tiles or encoding picker.' },
  },
  'shared-7-DBAgAi5H.js': {
    qk: { name: 'KnowledgeGithubSyncModal', features: ['h(Gk.Component, { ...e })'],
      boundary: 'The GitHub sync modal (lazy c23f22bfb) is not loaded: the GitHub row is never shown.' },
  },
  // shared-7 mD's link resolution (oi = shared-52 hz: a claude.ai in-app route for the tile's url, else null).
  'shared-52-uHFNjl7C.js': {
    hz: { name: 'knowledgeTileAppRoute', features: ['let t = ri(e);', 'return t === null ? null : mz(t);'],
      boundary: 'No claude.ai in-app routes: a tile\'s url never resolves to one (null), and a local knowledge file\'s tile has no url (it opens nothing, as mD does with no handleClick and no url).' },
  },
  'c89efce1a-C_nlrFif.js': {
    rc: { name: 'ChatMemoryMarkdown', features: ['blockCitations: a,', 'normalizationMode: o,'],
      boundary: 'The memory text is drawn by the host SourceChatMarkdown (src/source-chat-markdown.jsx), which renders c89efce1a rc itself as w13-close-chat-renderer sliced it (src/generated/chat-renderer, ChatTextMarkdown: cc1aae219 OR → rc); this graph does not slice rc a second time (D1).' },
  },
};
const rawCallSites = [];
// Globals the emitted modules may read (browser and language built-ins the original declarations use).
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'NodeFilter', 'Event', 'BigInt', 'WeakRef', 'CSS', 'Float64Array', 'Image', 'matchMedia']);

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
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk.
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
// R2/E5: a feature is the declaration's text (whitespace-insensitive) or, failing that, its looseFeature() pattern.
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// Follow an import (and re-export chains) to the declaring chunk.
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
async function heldGraph(dir, label) {
  const manifest = label === 'view-tabs' ? await viewTabsManifestFor(referenceVersion) : label === 'routines-shared' ? await routinesSharedManifestFor(referenceVersion) : JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const adapterFrom = manifest.adapterModule ? `../../${path.basename(manifest.adapterModule)}` : null;
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${label} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  // A module with an `exports` map (sessions-page) publishes only those bindings, under those names; the rest are its own.
  const held = new Map();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) {
    const local = typeof b === 'string' ? b : b.name;
    if (mod.exports && !Object.hasOwn(mod.exports, local)) continue;
    held.set(`${mod.source}#${local}`, { target: mod.target ?? mod.source, name: mod.exports?.[local] ?? local });
  }
  const adapted = new Map();
  for (const a of manifest.adapters ?? []) adapted.set(a.original, a.name);
  // D46: names extract-view-tabs.mjs has settled but not published yet (other areas still slice those bindings).
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { label, published, held, adapted, adapterFrom, pending, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The vendor-frame export alias of `local` that official-3.6556.2.mjs knows as a React export, or undefined.
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

export async function extractChatKnowledge({ check = false, survey = false, extraAdapters = {} } = {}) {
  const cache = new Map();
  // extraAdapters (tests only, with check): merged into the table, so an adapter the closure never reaches stops generation.
  const adapters = Object.fromEntries([...new Set([...Object.keys(adapterTable), ...Object.keys(extraAdapters)])]
    .map(file => [file, { ...adapterTable[file], ...extraAdapters[file] }]));
  const vt = await heldGraph(viewTabs, 'view-tabs');
  const graphs = [];
  for (const label of heldGraphs) graphs.push(await heldGraph(path.join(root, 'src/generated', label), label));
  const heldBy = key => graphs.find(g => g.held.has(key));
  const adaptedBy = key => graphs.find(g => g.adapted.has(key));
  const resolved = new Map();
  const chunks = new Map(); // file -> Set(local)
  const edges = new Map();
  const viewTabsCopies = new Set();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), held: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      if (heldBy(key) || vt.held.has(key)) throw Error(`adapter ${key} replaces a binding another graph holds; import it instead`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (adaptedBy(key)) {
      const g = adaptedBy(key);
      result = { kind: 'shared-adapter', name: g.adapted.get(key), from: g.adapterFrom, graph: g.label };
    } else if (file === official.vendorFrame && !vt.published.has(key) && reactAlias(src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
      result = { kind: 'react', module, name: member };
    } else if (vt.published.has(key)) {
      result = { kind: 'view-tabs', name: vt.published.get(key), from: `../view-tabs/${file}` };
    } else if (heldBy(key)) {
      const g = heldBy(key);
      result = { kind: 'held', name: g.held.get(key).name, from: `../${g.label}/${g.held.get(key).target}`, graph: g.label };
    } else if (vt.held.has(key) && vt.pending.has(key)) {
      // D1/D46: a name view-tabs still holds back (`pendingNames`) is imported by its local until it is published.
      result = { kind: 'view-tabs-held', name: local, from: `../view-tabs/${file}`, pendingName: vt.pending.get(key) };
    } else if (linkedVendors[key]) {
      // The linked graph's manifest lists the binding in that module and the module exports it under its local name.
      const link = linkedVendors[key];
      const linked = JSON.parse(await fs.readFile(path.join(root, 'src/generated', link.graph, 'manifest.json'), 'utf8'));
      const mod = (linked.modules ?? []).find(m => m.target === link.target && m.source === file);
      if (linked.referenceVersion !== referenceVersion || !mod?.bindings?.some(b => (typeof b === 'string' ? b : b.name) === local)) throw Error(`${key}: ${link.graph}/${link.target} does not hold it`);
      const text = await fs.readFile(path.join(root, 'src/generated', link.graph, link.target), 'utf8');
      if (![...text.matchAll(/export\s*\{([^}]*)\}/g)].some(m => m[1].split(',').map(s => s.trim()).includes(local))) throw Error(`${key}: ${link.graph}/${link.target} does not export ${local}`);
      result = { kind: 'held', name: local, from: `../${link.graph}/${link.target}`, graph: link.graph };
    } else if (file.startsWith('vendor-') && !file.startsWith('vendor-frame-') && !vendorCopies[key]) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'pattern' || entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) {
        const pins = lazyImports[key];
        if (!pins) throw Error(`${key} has a dynamic import (${text.slice(0, 160)}); give it an adapter`);
        let rest = text;
        for (const target of Object.keys(pins)) {
          const spec = `import("./${target}")`;
          if (rest.split(spec).length - 1 !== 1) throw Error(`${key}: expected one ${spec}`);
          rest = rest.split(spec).join('');
        }
        if (/\bimport\s*\(/.test(rest)) throw Error(`${key}: unpinned dynamic import`);
      }
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      if (vt.held.has(key)) viewTabsCopies.add(key);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') {
      const bucket = { adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', held: 'held' }[cls.kind];
      used[bucket].add(key);
      return;
    }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(file, cache);
    const reads = new Set();
    edges.set(key, reads);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(entry, cache, key) : { file, local: dep };
      const depKey = `${target.file}#${target.local}`;
      reads.add(depKey);
      await visit(depKey, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      try { assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features); }
      catch (error) { if (!survey) throw error; problems.push(error.message); }
      if (survey && !spec.features.length) problems.push(`root ${file}#${local} has no features`);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }
  for (const [key, pins] of Object.entries(lazyImports)) {
    if (!edges.has(key)) { if (!survey) throw Error(`lazy declaration ${key} is not reached`); problems.push(`unreached lazy ${key}`); continue; }
    for (const [target, alias] of Object.entries(pins)) {
      const src = await readSource(target, cache);
      const local = src.exported.get(alias);
      if (!local || !chunks.get(target)?.has(local)) { if (!survey) throw Error(`lazy ${key}: ${target} ${alias} is not in this graph`); problems.push(`lazy ${key}: ${target} ${alias} missing`); }
    }
  }

  if (survey) {
    const size = async key => { const [f, l] = key.split('#'); const s = await readSource(f, cache); return declarationText(s, s.top.get(l)).length; };
    let total = 0;
    const rows = [];
    for (const [file, locals] of chunks) { let b = 0; for (const l of locals) b += await size(`${file}#${l}`); total += b; rows.push([b, file, locals.size]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const p of problems) console.log('PROBLEM', p);
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    for (const k of (process.env.SURVEY_SHOW ?? '').split(',').filter(Boolean)) { const [f, l] = k.split('#'); const s = await readSource(f, cache); console.log('SHOW', k, '\n' + (await featureText(s, s.top.get(l))).split('\n').slice(0, +(process.env.SURVEY_LINES ?? 1e9)).join('\n')); }
    for (const k of (process.env.SURVEY_DEPS ?? '').split(',').filter(Boolean)) {
      const [f, l] = k.split('#'); const s = await readSource(f, cache);
      const rows = [];
      for (const dep of declarationDeps(s, l)) {
        const e = s.top.get(dep);
        const t = e.kind === 'import' ? await resolveImport(e, cache, k) : { file: f, local: dep };
        const tk = `${t.file}#${t.local}`, c = resolved.get(tk);
        const ts = await readSource(t.file, cache), te = ts.top.get(t.local);
        rows.push(`${dep} -> ${tk} [${c?.kind ?? '?'}${c?.name ? ' ' + c.name : ''}] ${te ? declarationText(ts, te).slice(0, +(process.env.SURVEY_WIDTH ?? 140)).replace(/\s+/g, ' ') : ''}`);
      }
      console.log('DEPS', k, '\n  ' + rows.join('\n  '));
    }
    if (process.env.SURVEY_USED) for (const [k, v] of Object.entries(used)) console.log('USED', k, [...v].join(' '));
    console.log('total', total);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    return null;
  }
  // Emit one module per source chunk.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-knowledge.mjs', adapterModule: 'src/source-chat-knowledge-adapters.jsx', heldGraphs,
    publicNames: {}, modules: [], contexts: [], lazyImports: [], callSites: [], adapters: [], sharedAdapters: [], hostDifferences: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const lazyAliases = new Map(); // target chunk -> Map(alias -> local)
  for (const pins of Object.values(lazyImports)) for (const [target, alias] of Object.entries(pins)) {
    const src = await readSource(target, cache);
    if (!lazyAliases.has(target)) lazyAliases.set(target, new Map());
    lazyAliases.get(target).set(alias, src.exported.get(alias));
  }
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
        else if (cls.kind === 'shared-adapter') spec = { from: cls.from, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held' || cls.kind === 'held') spec = { from: cls.from, name: cls.name, kind: cls.kind };
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
      const calleeKey = `${target.file}#${target.local}`;
      const calleeSrc = await readSource(target.file, cache), calleeDecl = calleeSrc.top.get(target.local);
      const isCreateContext = createContextKeys.has(calleeKey)
        || (target.file.startsWith('vendor-frame-') && calleeDecl?.kind === 'var' && /^[\w$]+=[\w$]+\.createContext$/.test(declarationText(calleeSrc, calleeDecl)));
      if (isCreateContext) manifest.contexts.push(`${file}#${local}`);
    }
    const groups = new Map();
    for (const [local, spec] of imports) {
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const blocks = order.map(([local, entry]) => {
      let text = emittedText(src, entry);
      const pins = lazyImports[`${file}#${local}`];
      if (pins) for (const target of Object.keys(pins)) text = text.split(`import("./${target}")`).join(`import("./${moduleName(target)}")`);
      return text;
    });
    let exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const aliases = lazyAliases.get(file);
    if (aliases) {
      for (const alias of aliases.keys()) if (locals.has(alias)) throw Error(`${file}: export alias ${alias} collides with a local`);
      exportText += `\nexport { ${[...aliases].map(([alias, local]) => `${local} as ${alias}`).join(', ')} };`;
    }
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-chat-knowledge.mjs.\n// Edit the extractor or src/source-chat-knowledge-adapters.jsx, never this file.\n`;
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
  const copiedContexts = manifest.contexts.filter(k => viewTabsCopies.has(k));
  if (copiedContexts.length) throw Error(`view-tabs holds these contexts without a semantic name; publish them in extract-view-tabs.mjs (D46): ${copiedContexts.join(', ')}`);
  manifest.viewTabsCopies = [...viewTabsCopies].sort();
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
    // A root another graph holds is re-exported from that graph's module (D1: one copy); the rest from this graph.
    const bySource = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      if (cls.kind !== 'generated' && cls.kind !== 'held') throw Error(`root ${file}#${local} (${spec.name}) resolves to ${cls.kind}; only sliced or held roots are exported`);
      const from = cls.kind === 'held' ? cls.from : `./${moduleName(file)}`;
      manifest.publicNames[spec.name] = cls.kind === 'held' ? { file, local, heldBy: cls.graph } : { file, local };
      if (!bySource.has(from)) bySource.set(from, []);
      bySource.get(from).push(`${cls.kind === 'held' ? cls.name : local} as ${spec.name}`);
    }
    for (const [from, specs] of bySource) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the chat-knowledge roots; generated by extract-chat-knowledge.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals)) {
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
    if (spec.boundary) manifest.hostDifferences.push({ original: `${file}#${local}`, adapter: spec.name, difference: spec.boundary });
  }
  for (const key of [...used.sharedAdapters].sort()) manifest.sharedAdapters.push({ original: key, name: resolved.get(key).name, graph: resolved.get(key).graph, from: resolved.get(key).from });
  for (const [key, pins] of Object.entries(lazyImports)) for (const [target, alias] of Object.entries(pins))
    manifest.lazyImports.push({ declaration: key, target: moduleName(target), alias });
  for (const site of rawCallSites) {
    const bytes = (await readSource(site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Chat knowledge output set changed: ${present.join(',')}. Run scripts/extract-chat-knowledge.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Chat knowledge source mismatch: ${name}. Run scripts/extract-chat-knowledge.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat knowledge modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractChatKnowledge({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
