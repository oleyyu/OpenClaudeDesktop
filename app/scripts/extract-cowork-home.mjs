// w10-curchat-home-gen (research/w10-curchat.md CC-02..CC-05, plan-w10.md "w10-curchat-home-gen"): extract the 3.6556.2
// Cowork / Chat home pieces that replace the 2.31226.0 current-chat slices of src/source-cowork-home.jsx and
// src/source-surfaces.jsx. Own generator, own output folder src/generated/cowork-home, own scripts/verify-gen-cowork-home.mjs.
//
//   shared-23  FS (the home root; not exported, `FS as It` is an import of shared-0's FS), xS (the Cowork task list wrapper, export un) over SS (the list, old GF),
//              MS (the lazily loaded Ideas, jS = the chorus_cowork_suggestions entry), My (the greeting, old CN),
//              rS (the setup card, export dn), _b (the plugin card, export xn); the home column / scroll classes (UC).
//   ce266b9be  Re (ChorusCoworkSuggestions, old shared-23 xI).
//   c2bf50d9e  o (COWORK_HOME_IDEAS_CATALOG).
//   shared-19  nS / rS (the layout table and its reader, export zi; old uj/lj), Rx (the banner offset, export Ji; old cj).
//   shared-5   HS (the dock height, export Ja; old fj), aC (the greeting phone seat, export to; old Dj).
//
// Bindings another 3.6556.2 graph already holds are imported from there (D1: one copy, so a React context stays one
// object): view-tabs by semantic public name, routines-shared, cowork-scheduled and code-routines by their chunk module
// (shared-18 AC, the home column, and NA/DA/qv come from cowork-scheduled; shared-25's router store G/Ku/... and shared-52
// $q/eJ/tJ from code-routines). Their host adapters are reused for the same bindings.
//
// The engine is the cowork-scheduled one (R1 constants from official-3.6556.2.mjs; R2/E5 features as text or
// looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias, `Oo` being
// react/compiler-runtime's c; E3 the React Compiler helpers come from view-tabs by semantic name). A binding resolves, in
// this order, to: a host adapter of this graph (src/source-cowork-home-v3-adapters.jsx; its original declaration must
// carry `features`), a host adapter a linked graph already uses for it, a React namespace / alias of vendor-frame, a
// semantic public name of view-tabs, a binding a linked graph holds, or a copy in this graph's module for its chunk.
// A service vendor binding, a class declaration, a dynamic import, a React context another graph holds, or a binding
// view-tabs holds without a semantic name stops generation. --survey prints the closure without writing anything.
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
const output = path.join(root, 'src/generated/cowork-home');
const adapterModule = '../../source-cowork-home-v3-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk when it has one.
const roots = {
  'shared-23-BZ6ZY5fu.js': {
    FS: { name: 'CoworkHome', features: ['{ target: t, surfaces: n } = gd(),', 'emptyFallback: b ? null : c(MS, { standalone: !0 })', 'c(_b, { source: "plugin", shown: !1 })', 'c(rS, { className: N("mt-4 first:mt-0", T, w), via: x })'] },
    PS: { name: 'homeSurfaceSlots', features: ['setupCard: "task_new", taskList: !0', 'setupCard: e === "chat" ? (t ? "hub" : n ? "chat" : null) : null, taskList: !1'] },
    xS: { name: 'CoworkTaskList', export: 'un', features: [] },
    SS: { name: 'CoworkActiveTasks', features: ['{ emptyFallback: t, afterActive: n, className: r } = e,'] },
    MS: { name: 'CoworkIdeas', features: ['MS = jS.Component'] },
    My: { name: 'HomeGreeting', features: ['{ text: t, isAgentRoute: n, layout: r, spark: i } = e,', '"data-new-page-greeting-spark": ""', '"data-new-page-greeting-text": ""'] },
    rS: { name: 'HomeSetupCard', export: 'dn', features: [] },
    _b: { name: 'HomePluginCard', export: 'xn', features: [] },
  },
  'ce266b9be-B5g-KDni.js': {
    Re: { name: 'ChorusCoworkSuggestions', export: 'ChorusCoworkSuggestions', features: [] },
  },
  'c2bf50d9e-TDPQZp_M.js': {
    o: { name: 'COWORK_HOME_IDEAS_CATALOG', export: 'COWORK_HOME_IDEAS_CATALOG', features: [] },
  },
  'shared-19-DIKJVT7c.js': {
    nS: { name: 'HOME_LAYOUTS', features: ['greetingLockup: "inline",', 'greetingPhoneSeat: "center",', 'greetingLockup: "compact",', 'greetingPhoneSeat: "top",'] },
    rS: { name: 'homeLayout', export: 'zi', features: ['return nS[e];'] },
    Rx: { name: 'homeBannerOffsetClass', export: 'Ji', features: ['"!mt-[calc(-1*min(var(--organization-banner-column-height,0px),var(--prerender-activation-viewport-height,100vh)*0.25))] h-[calc(100%+min(var(--organization-banner-column-height,0px),var(--prerender-activation-viewport-height,100vh)*0.25))]"'] },
  },
  'shared-5-Bg6ZMqvt.js': {
    HS: { name: 'homeDockHeightClass', export: 'Ja', features: ['"dock:h-auto dock:min-h-[calc(100%+min(var(--organization-banner-column-height,0px),var(--prerender-activation-viewport-height,100vh)*0.25))]"'] },
    aC: { name: 'homeGreetingSeatClass', export: 'to', features: ['return e === "center" ? iC : "";'] },
  },
  'shared-18-D3y8YMFN.js': {
    AC: { name: 'HomeColumn', export: 'gu', features: [] },
    NA: { name: 'TaskGlyph', features: [] },
    DA: { name: 'StatusLabel', features: [] },
    qv: { name: 'StatusDot', features: [] },
  },
};
// Class strings the host applies to its own elements, pinned in their official owner (exact value, once).
const literals = {
  homeColumnClass: { file: 'shared-23-BZ6ZY5fu.js', owner: 'UC', value: 'relative flex flex-col items-center gap-6 max-sm:!px-1 md:px-14',
    role: 'the new-page column (old XI "relative flex flex-col items-center gap-6")' },
  homeScrollClass: { file: 'shared-23-BZ6ZY5fu.js', owner: 'UC', value: 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]',
    role: 'the new-page scrolling viewport (old XI "min-h-0 flex-1 overflow-x-hidden overflow-y-auto")' },
};
// vendor-frame's CommonJS interop namespaces for React itself map to namespace imports, never to a copy.
const namespaceImports = { [`${official.vendorFrame}#c`]: 'react', [`${official.vendorFrame}#me`]: 'react/jsx-runtime', [`${official.vendorFrame}#Hn`]: 'react-dom' };
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = {
  // react-intl's defineMessage (identity), which ce266b9be's control ideas call around their copy.
  'vendor-intl-DYfox5Co.js#nn': ['function nn(e) {', 'return e;'],
};
// The UI library chunks view-tabs also copies from (Base UI, clsx, zustand): their declarations are copied like any
// other. Service / data vendors (react-query, zod, GrowthBook, Datadog, react-intl, the router) are never copied.
const copyableVendors = ['vendor-frame-', 'vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
// Host services of this graph: chunk -> original local -> { name, features, also, overridesShared }. Each one is
// documented where it is implemented (src/source-cowork-home-v3-adapters.jsx).
const adapters = {
  'shared-25-DOWZRSlq.js': {
    // The CurrentAccountProvider value: a local profile (no claude.ai account), so the uuid-keyed pieces (xS's list key,
    // ce266b9be's "an organization is active" check) behave as for a signed-in desktop user (E49), never a cloud account.
    Z: { name: 'useHomeAccount', features: ['"Must call inside CurrentAccountProvider"'] },
  },
  'shared-3-BCEbd8Fv.js': {
    iN: { name: 'useHomeSurface', features: ['return S(rN);'] },
    gR: { name: 'useHomeComposerRoute', features: ['return S(hR);'] },
    k6: { name: 'useHomeAttentionIds', features: ['C6(e[n] ?? f6, t.verdictsByToolUseId)'] },
    AK: { name: 'pendingHomeCreation', features: ['folderGrantWaitMs: n.folderGrantWaitMs,'] },
  },
  'shared-2-TF8v67kg.js': {
    hY: { name: 'useHomeSessions', features: ['{ sessions: r } = yJ(t);'] },
    nK: { name: 'useHomeReadState', features: ['return OG(rK);'] },
    XG: { name: 'clearHomeActive', features: ['let t = { sessions: {}, initializedAt: Date.now() };'] },
    Aw: { name: 'useHomeIncognito', features: ['return x(Ew);'] },
    BG: { name: 'useHomeReadStateSync', features: ['FG(t);'] },
    ih: { name: 'useHomeIdle', features: ['t ? ks : nh'] },
  },
  'shared-23-BZ6ZY5fu.js': {
    _S: { name: 'useHomeTasksReady', features: ['Math.min(Date.now(), r ?? 1 / 0) + dS'] },
    nS: { name: 'useHomeSetupCardGate', features: ['{ enabled: u, pending: d }', 'r.considerEnabledForNonUI'] },
    jS: { name: 'ChorusCoworkSuggestionsEntry', features: ['id: "chorus_cowork_suggestions",', 'pick: (e) => e.ChorusCoworkSuggestions,', 'loading: X("placeholder-would-mislead")'] },
    Xx: { name: 'PluginSetupCardEntry', features: ['id: "plugin_setup_card",', 'pick: (e) => e.PluginSetupCardBody,'] },
  },
  'shared-78-D5Fw2h0a.js': {
    gK: { name: 'useHomePinsEnabled', features: ['K4($, 0, r, t, e, n, (e) => !0)'] },
    yE: { name: 'useHomeScheduleAccess', features: ['hE("coworkScheduledTasksEnabled", t);'] },
    hT: { name: 'useDesktopHomeSupported', features: ['K()?.desktopHome?.status === "supported"'] },
    QJ: { name: 'useHomeServerGates', features: ['{ serverGateNames: e } = hr(),'] },
    GT: { name: 'useHomeBrowserPaired', features: ['pw() === "answered"'] },
    FC: { name: 'useHomeBrowserInitialized', features: ['FC = NC.useIsInitialized'] },
  },
  'shared-52-uHFNjl7C.js': {
    u_: { name: 'useHomeSidebarCollapsed', features: ['return q(l_);'] },
    eM: { name: 'subscribeHomeSessionEvents', features: ['U?.onOnEvent'] },
  },
  'shared-4-DUB1Oi0O.js': {
    // code-routines holds r_ (a plain query hook over its scheduled-tasks bridge, no state and no context): the home
    // answers it from the host's CoworkHomeV3Context instead (`overridesShared`); code-routines keeps its copy.
    r_: { name: 'useHomeSchedules', overridesShared: true, features: ['return Eg(e, n_(), t, !0);'] },
  },
  'shared-130-dWztbTO1.js': {
    JO: { name: 'useHomePluginsInChat', features: ['Me("claude_ai_plugins_in_chat")'] },
    SO: { name: 'useHomeSetupCards', features: ['classifyWebRows: r'] },
  },
  'shared-5-Bg6ZMqvt.js': {
    kw: { name: 'useHomeRemoteCoworkSession', features: ['{ isRemoteCoworkSession: e } = Pl(),'] },
    sw: { name: 'useHomePluginSkillFilter', features: ['Rt("claude_ai_plugins_in_chat")'] },
    BT: { name: 'useHomeSupportedCommands', features: ['enabled: !!Jn?.getSupportedCommands'] },
    uA: { name: 'useHomeIdeaTarget', features: ['projectScopeLocked: c'] },
    _C: { name: 'useHomeIdeasTracker', features: ['client_platform: t ? On.DESKTOP_APP : On.WEB_CLAUDE_AI'] },
    jT: { name: 'useHomeSkillNames', features: ['{ names: s, isLoading: c }'] },
  },
  'shared-21-R7LldJ05.js': {
    yT: { name: 'useHomeChalkSidebar', features: ['Xs("proj-chalk-sidebar")'] },
  },
  'shared-156-BLTosN8U.js': {
    pU: { name: 'useHomeChalkTeacher', features: ['return at("chalk_teacher");'] },
  },
  'shared-182-BI1KJccu.js': {
    dx: { name: 'useHomeIdeasPrompt', features: ['return Jb(fx, "useChatInputPrefill");'] },
    Db: { name: 'useHomeIdeasEditor', features: ['return Fo(t, ni(e));'] },
  },
  'shared-18-D3y8YMFN.js': {
    _j: { name: 'useHomePermissions', features: ['canShowReviewPopover:'] },
  },
  'shared-46-BIbZBGFq.js': {
    qb: { name: 'UnavailableInlineReview', features: ['default: e.InlineToolApproval'] },
  },
  'vendor-intl-DYfox5Co.js': {
    en: { name: 'HomeRelativeTime', features: ['unit: r = "second",', 'updateIntervalInSeconds: i,'] },
  },
  'cca63be39-DhRwwAZm.js': {
    n: { name: 'useHomeAgentModeAnalytics', features: ['claudeai.yukon_gold.${e}'] },
  },
  'ce266b9be-B5g-KDni.js': {
    Oe: { name: 'useHomeBrowserIdeas', features: ['return !e || t ? !1 : n ? r && i : a && !o && !s;'] },
    ke: { name: 'useHomeBrowserDevices', features: ['C(i.data.devices).length > 0'] },
    Fe: { name: 'useHomeSkillIdeas', features: ['icon: "SlashShortcutCommand",', '{ suggestions: p, isLoading: m }'] },
    Ae: { name: 'useHomeChipsVariant', features: ['return d(P, "variant", "control", j, e);'] },
    Pe: { name: 'loadHomeIdeasCatalog', features: ['import("./c2bf50d9e-TDPQZp_M.js")'] },
  },
};
// Raw minified text the host follows (each must occur exactly once; `{ loose }` through looseFeature).
const rawCallSites = [
];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'MessagePort', 'ClipboardItem', 'Blob', 'Float64Array', 'crypto', 'indexedDB', 'arguments']);

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
// A destructuring declarator (kind 'pattern') is emitted once, as the original `var {…}=…;`, and defines all its names.
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
// R2/E5: a feature is the declaration's text (whitespace-insensitive) or, failing that, its looseFeature() pattern.
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
// The 3.6556.2 graphs whose chunk modules export the original locals: the bindings they hold (with each declaration's
// sha256), their contexts, and the host adapters they answer with (reused here for the same original binding).
async function linkedGraphs() {
  const read = async dir => JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
  const graphs = [
    { dir: 'routines-shared', manifest: await routinesSharedManifestFor(referenceVersion) },
    { dir: 'cowork-scheduled', manifest: await read('cowork-scheduled') },
    // code-routines holds shared-25's router store (Nu/Lu/Ru/Hu/Ku/qu/Ju/G, module-level state) and shared-52 $q/eJ/tJ:
    // one store at runtime, so they are imported from there, never re-sliced (plan step 2, D1). Listed last so a
    // binding cowork-scheduled also holds keeps resolving to cowork-scheduled.
    { dir: 'code-routines', manifest: await read('code-routines') },
    // mcp-app-card holds shared-78 Cv (the useState-backed hook artifact-library also reaches; w11-sweep-curchat, D1).
    // Held only: its host adapters are not borrowed, and only what its modules export (by export name) is imported.
    { dir: 'mcp-app-card', manifest: await read('mcp-app-card'), heldOnly: true },
    // w12 viewtabs-cont (D1): working-line holds the stateful CDS Spark (shared-frame ZO over Jg / YO, YO's sprite loader qO
    // and the sprite chunk cf2613ee5 emitted under its own name, so `import("./cf2613ee5-Btwr9m9F.js")` resolves). The
    // greeting's ZO is imported from there (held only, by export name), never re-sliced and never a host stand-in.
    { dir: 'working-line', manifest: await read('working-line'), heldOnly: true },
  ];
  const held = new Map(), contexts = new Set(), shared = new Map();
  for (const { dir, manifest, heldOnly } of graphs) {
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
    for (const mod of manifest.modules) {
      const exported = await moduleExports(path.join(root, 'src/generated', dir, mod.target));
      for (const b of mod.bindings) {
        const key = `${mod.source}#${b.name}`;
        if (!held.has(key) && exported.has(b.name)) held.set(key, { dir, target: mod.target, sha256: b.sha256, exportName: exported.get(b.name) });
      }
    }
    for (const c of manifest.contexts ?? []) contexts.add(c);
    if (heldOnly) continue;
    const own = manifest.adapterModule;
    for (const a of manifest.adapters ?? []) if (!shared.has(a.original)) shared.set(a.original, { module: own, name: a.name });
    for (const a of manifest.sharedAdapters ?? []) if (!shared.has(a.original)) {
      // code-routines records its routines-shared adapters without a module; routines-shared (read first) answers them.
      if (!manifest.sharedAdapterModule) throw Error(`${dir}: shared adapter ${a.original} has no module and no earlier graph answers it`);
      shared.set(a.original, { module: manifest.sharedAdapterModule, name: a.name });
    }
  }
  return { held, contexts, adapters: shared };
}
// local -> exported name of a generated module's `export { … }` lists (a linked graph's module may export a binding under
// its official export alias, as mcp-app-card does, or keep it private).
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
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The vendor-frame export alias of `local` that official-3.6556.2.mjs knows as a React export, or undefined.
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];
const adapterFrom = module => `../../${module.replace(/^src\//, '')}`;

export async function extractCoworkHome({ check = false, survey = false } = {}) {
  const cache = new Map();
  const { published, held, pending } = await viewTabsGraph();
  const linked = await linkedGraphs();
  const resolved = new Map();
  const chunks = new Map();
  const edges = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), linked: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      // `overridesShared`: a plain hook or value a linked graph also holds, answered by the host here (never state or a
      // context, which stays one object: the next check, and module-level state is never adapted).
      if (linked.held.has(key) && !adapter.overridesShared) throw Error(`adapter ${key}: ${linked.held.get(key).dir} holds this binding; import it, do not replace it`);
      if (linked.held.has(key) && linked.contexts.has(key)) throw Error(`adapter ${key}: a context ${linked.held.get(key).dir} holds cannot be replaced`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (linked.adapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      const a = linked.adapters.get(key);
      result = { kind: 'shared-adapter', name: a.name, module: a.module };
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
    } else if (linked.held.has(key)) {
      const h = linked.held.get(key);
      if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: ${h.dir} holds a different declaration; rerun its generator`);
      result = { kind: 'linked', name: h.exportName, dir: h.dir, target: h.target };
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
  const bucket = kind => ({ adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', linked: 'linked' })[kind];
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
      assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }

  if (survey) {
    const size = async key => { const [f, l] = key.split('#'); const s = await readSource(f, cache); return declarationText(s, s.top.get(l)).length; };
    let total = 0;
    const rows = [];
    for (const [file, locals] of chunks) { let b = 0; for (const l of locals) b += await size(`${file}#${l}`); total += b; rows.push([b, file, locals.size]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const p of problems) console.log('PROBLEM', p);
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    console.log('total', total, 'linked', used.linked.size, 'sharedAdapters', [...used.sharedAdapters].join(' '));
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    if (process.env.SURVEY_CUT) {
      const sizes = new Map();
      for (const k of edges.keys()) sizes.set(k, await size(k));
      const rootKeys = Object.entries(roots).flatMap(([f, names]) => Object.keys(names).map(l => `${f}#${l}`));
      const reach = cut => { const seen = new Set(), st = [...rootKeys]; let b = 0; while (st.length) { const k = st.pop(); if (k === cut || seen.has(k) || !edges.has(k)) continue; seen.add(k); b += sizes.get(k); for (const d of edges.get(k)) st.push(d); } return b; };
      const all = reach(null);
      const candidates = [...edges.keys()].filter(k => !rootKeys.includes(k)).map(k => [k, subtree(k)]).sort((a, b) => b[1].size - a[1].size).slice(0, 400);
      const saved = [];
      for (const [k] of candidates) saved.push([all - reach(k), k]);
      saved.sort((a, b) => b[0] - a[0]);
      for (const [b, k] of saved.slice(0, +process.env.SURVEY_CUT)) { const [f, l] = k.split('#'); const s = await readSource(f, cache); console.log('  cut', b, k, '<-', [...cross.get(k) ?? []].slice(0, 3).join(' '), '|', declarationText(s, s.top.get(l)).slice(0, 110).replace(/\s+/g, ' ')); }
    }
    for (const k of (process.env.SURVEY_DIRECT ?? '').split(',').filter(Boolean)) {
      console.log('DIRECT', k);
      const rows = [];
      for (const d of edges.get(k) ?? []) {
        const cls = resolved.get(d);
        let b = 0; if (cls?.kind === 'generated') for (const x of subtree(d)) b += await size(x);
        const [f, l] = d.split('#'); const s = await readSource(f, cache); const e = s.top.get(l);
        rows.push([b, `${d} [${cls?.kind}${cls?.name ? ' ' + cls.name : ''}]`, e ? declarationText(s, e).slice(0, +(process.env.SURVEY_HEAD ?? 90)).replace(/\s+/g, ' ') : '']);
      }
      rows.sort((a, b) => b[0] - a[0]);
      for (const r of rows) console.log('   ', r[0], r[1], '|', r[2]);
    }
    return null;
  }
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-home.mjs', adapterModule: 'src/source-cowork-home-v3-adapters.jsx',
    publicNames: {}, literals: {}, modules: [], contexts: [], callSites: [],
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
        else if (cls.kind === 'shared-adapter') spec = { from: adapterFrom(cls.module), name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'linked') spec = { from: `../${cls.dir}/${cls.target}`, name: cls.name, kind: 'linked' };
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
        if (held.has(`${file}#${local}`) || linked.held.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-cowork-home.mjs.\n// Edit the extractor or src/source-cowork-home-v3-adapters.jsx, never this file.\n`;
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
    // A root a linked graph holds (shared-18 AC / NA / DA / qv) is re-exported from there under its semantic name.
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'linked' ? `../${cls.dir}/${cls.target}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      manifest.publicNames[spec.name] = { file, local, ...(spec.export !== undefined && { export: spec.export }), ...(cls.kind === 'linked' && { linked: `${cls.dir}/${cls.target}` }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${cls.kind === 'linked' ? cls.name : local} as ${spec.name}`);
    }
    for (const [from, specs] of groups) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  for (const [name, spec] of Object.entries(literals)) {
    const src = await readSource(spec.file, cache);
    const entry = src.top.get(spec.owner);
    if (!entry || entry.kind === 'import') throw Error(`literal ${name}: ${spec.file}#${spec.owner} is not a declaration`);
    const ast = babel.babelParse(emittedText(src, entry), `${spec.file}#${spec.owner}`, true);
    const hits = [];
    babel.traverse(ast, { StringLiteral(p) { if (p.node.value === spec.value) hits.push(p.node.value); } });
    if (hits.length !== (spec.count ?? 1)) throw Error(`literal ${name}: ${JSON.stringify(spec.value)} occurs ${hits.length} times in ${spec.owner}, expected ${spec.count ?? 1}`);
    manifest.literals[name] = { file: spec.file, owner: spec.owner, value: spec.value };
    indexLines.push(`// ${spec.file} ${spec.owner}: ${spec.role}\nexport var ${name} = ${JSON.stringify(spec.value)};`);
  }
  files['index.mjs'] = await format(`// Semantic names for the cowork-home roots; generated by extract-cowork-home.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  manifest.adapters = [];
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, ...linked.adapters.get(original) }));
  manifest.linkedImports = used.linked.size;
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Cowork home output set changed: ${present.join(',')}. Run scripts/extract-cowork-home.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Cowork home source mismatch: ${name}. Run scripts/extract-cowork-home.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name), { recursive: true });
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork home modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.linked.size} linked imports).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCoworkHome({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
