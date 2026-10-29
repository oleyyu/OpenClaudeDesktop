// w13-chatui-home (research/w13-chatui.md chatui-H2, plan-w13.md "w13-chatui-home"): extract the 3.6556.2 Chat new-page
// greeting choice, so the Chat home shows the official text instead of the host's old `{name} returns!` (that message
// does not exist in 3.6556.2: en-US has 0 hits). Own generator, own output folder src/generated/chat-home, own
// scripts/verify-gen-chat-home.mjs (D0). Nothing here executes desktop runtime code.
//
//   shared-23 Dy  the greeting hook Fy renders through My (`Dy({ incognito })` → text): "" before the client clock
//                 exists (`Ee(Oy, null)`), "You’re incognito" for an incognito chat, a static pre-painted greeting
//                 while it still agrees, the account bootstrap's personalized_greeting for the "chat" surface (dy),
//                 "" with the incognito search parameter, the cached greeting entries (Xe), else "You’re here!".
//   shared-23 dy  (personalized_greeting, surface, now) → the slot text: the surface's day entry (iy[now.getDay()]) or
//                 its default_slots, the first slot with `now.getHours() < until`; uy..ay validate the table shape.
//   shared-23 iy  the day keys ["sun", …, "sat"].
//   shared-0 BR   (export lu) the "incognito" search parameter.
//   shared-78 sO / cO (exports d_ / f_) the account generation counter Dy subscribes to (useSyncExternalStore); its
//                 writer oO (an account switch) is not reachable, so the copy stays at 0 here (no claude.ai account).
//
// Imports resolve, in this order, to: a vendor-frame React alias (official.reactAliases, checked by assertVendorAlias),
// a view-tabs compiler helper by semantic name (E3), a host adapter of this graph (src/source-chat-home-adapters.jsx;
// its original declaration must carry `features`), a host adapter routines-shared already answers the same binding
// with, a binding a linked 3.6556.2 graph holds and exports (D1: routines-shared shared-25 si, cowork-scheduled shared-52
// ly / ry), or a module emitted earlier here. Anything else stops generation. Features are matched through
// looseFeature() (R2/E5): literals stay exact, minified identifiers of ≤3 characters match any name.
//
// The host side (local greeting table as the personalized_greeting equivalent per E53, no claude.ai account, no static
// composer pre-paint, no incognito search parameter, no telemetry) lives in src/source-chat-home-adapters.jsx.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';

const { referenceVersion, referenceSnapshot, ionSource: source, looseFeature } = official;
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'src/generated/chat-home');
const adapterModule = '../../source-chat-home-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Globals the original code reads.
const hostGlobals = new Set(['Array', 'Number', 'Date', 'Set']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
// `byExport` names roots by the chunk's export alias; `internal: true` allows roots the chunk does not export.
// `adapters`: same-chunk original local -> { name, features } answered by the host adapter module.
const modules = [
  { target: 'incognito-param.mjs', source: 'shared-0-DDOOdL6P.js', byExport: { lu: 'INCOGNITO_SEARCH_PARAM' },
    features: { lu: ['"incognito"'] } },
  { target: 'account-generation.mjs', source: 'shared-78-D5Fw2h0a.js', byExport: { d_: 'accountGeneration', f_: 'subscribeAccountGeneration' },
    features: { d_: ['return iO;'], f_: ['aO.add(e)', 'aO.delete(e);'] } },
  // w13-close-chat-composer (chatui-home-02): shared-23 Fy wraps [planBadge, My] in `div { className: fg }`, fg being
  // shared-19 Wx (export Hi), the greeting frame.
  { target: 'greeting-frame.mjs', source: 'shared-19-DIKJVT7c.js', byExport: { Hi: 'greetingFrameClass' },
    features: { Hi: ['"mx-auto flex w-full flex-col items-center gap-7 max-md:pt-4 max-w-2xl"'] } },
  { target: 'greeting.mjs', source: 'shared-23-BZ6ZY5fu.js', internal: true,
    exports: { Dy: 'useChatGreeting', dy: 'personalizedGreeting', uy: 'isPersonalizedGreetingTable', iy: 'GREETING_DAYS' },
    features: {
      Dy: ['{ incognito: t } = e,', 'n = t !== void 0 && t,', '{ data: i } = dt(),', 'l = Ee(Oy, null),',
        'r.formatMessage({ defaultMessage: "You\\u2019re here!", id: "y1XRP1BJQF"',
        'dy(i.personalized_greeting, "chat", l) || u',
        'r.formatMessage({ defaultMessage: "You\\u2019re incognito", id: "PYLVhIC8DX"',
        'let e = Xe(py(r.locale));', 'w = dy(e, "chat", l) || u;', 's.has(mn)'],
      dy: ['if (!uy(e)) return;', 'e.find((e) => e.surface === t)', 'r?.days?.find((e) => e.day === iy[n.getDay()])',
        '(i ? i.slots : r?.default_slots)?.find((e) => n.getHours() < e.until)?.text || void 0'],
      uy: ['return Array.isArray(e) && e.every(ly);'],
      iy: ['["sun", "mon", "tue", "wed", "thu", "fri", "sat"]'] },
    adapters: {
      // The static composer boot greeting (#static-composer-greeting-text) the web build pre-paints on /new.
      Ey: { name: 'readStaticComposerGreeting', features: ['window.location.pathname !== "/new"', 'document.getElementById(lp)',
        'e.classList.contains("invisible") ? null : e.textContent || null'] } } },
];
// Imports another chunk declares that the host answers: original chunk#local -> { name, features } (features on the
// original declaration's raw text through looseFeature).
const importAdapters = {
  // The account bootstrap query (claude.ai /api/bootstrap): `data.personalized_greeting` is the local greeting table.
  'shared-25-DOWZRSlq.js#kB': { name: 'useChatGreetingBootstrap', features: ['"use no memo"', '{ bootstrapApiPrefix: a = DB, applicationType: o } = qn();', 'o === "claude-dot"'] },
  // The cached greeting entries a signed-in claude.ai account leaves in localStorage (static-composer-greeting-data-v2).
  'shared-25-DOWZRSlq.js#oA': { name: 'readCachedChatGreetings', features: ['localStorage.getItem(nA)', '{ accountUuid: r, sessionMarker: i, locale: a, entries: o } = n;'] },
  // The page's search parameters (the incognito flag).
  'shared-156-BLTosN8U.js#jB': { name: 'useChatGreetingSearchParams', features: ['n = e?.searchParamsString;', 'n === void 0 ? null : new kB(n)'] },
  // Datadog global context properties (fallback_greeting_painted / static_composer_greeting_kept).
  'shared-78-D5Fw2h0a.js#Gc': { name: 'setGreetingTelemetry', features: ['Hc?.has(e) ? Uc.set(e, t) : on.setGlobalContextProperty(e, t)'] },
  // The boot locale (stored choice or navigator.languages) the pre-painted greeting was written in.
  'shared-1-BJhqMmkf.js#dg': { name: 'chatBootLocale', features: ['dg = vi(ug)'] },
};
// Host adapters routines-shared already answers these bindings with (D1: one adapter per original binding).
const sharedAdapters = { 'vendor-intl-DYfox5Co.js#q': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' } };
// Bindings a linked 3.6556.2 graph holds and exports: original chunk#local -> graph directory.
const linkedBindings = {
  'shared-25-DOWZRSlq.js#si': 'routines-shared',
  'shared-52-uHFNjl7C.js#ly': 'cowork-scheduled',
  'shared-52-uHFNjl7C.js#ry': 'cowork-scheduled',
};

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}
// A chunk read without formatting, for export tables and the raw text of one top-level declaration.
async function readRaw(name, cache) {
  const key = `raw:${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const declarations = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration') declarations.set(node.id.name, code.slice(node.start, node.end));
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) if (d.id.type === 'Identifier') declarations.set(d.id.name, code.slice(d.start, d.end));
  }
  const record = { name, bytes, code, exported, declarations };
  cache.set(key, record);
  return record;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !looseFeature(f).test(text));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
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
const readManifest = async dir => JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));

export async function extractChatHome({ check = false } = {}) {
  const cache = new Map(), files = {}, emitted = [];
  const vendorText = (await readRaw(official.vendorFrame, cache)).code;
  official.assertCompilerHelpers((await readRaw(official.sharedFrame, cache)).code);
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-home.mjs',
    adapterModule: 'src/source-chat-home-adapters.jsx', modules: [], adapters: [], sharedAdapters: [], linked: [] };
  const adapterRecords = new Map();

  // An import specifier of `src` (file:alias) → { from, name, kind, original }.
  async function resolveImport(target, file, alias) {
    const via = `${file}:${alias}`;
    if (file === official.vendorFrame) {
      const member = official.reactAliases[alias];
      if (!member || member[0] === 'react/compiler-runtime') throw Error(`${target}: no React alias for ${via}`);
      official.assertVendorAlias(vendorText, alias);
      return { from: member[0], name: member[1], kind: 'react', original: alias };
    }
    if (file === official.sharedFrame) {
      const helper = official.compilerHelpers[alias];
      const entry = helper && viewTabs.publicNames?.[helper.name];
      if (!helper || entry?.file !== official.sharedFrame || entry.export !== alias) throw Error(`${target}: ${via} is not a view-tabs compiler helper`);
      return { from: `../view-tabs/${official.sharedFrame}`, name: helper.name, kind: 'view-tabs', original: helper.local };
    }
    const dep = await readRaw(file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${target}: ${via} is not exported`);
    const key = `${file}#${local}`;
    if (importAdapters[key]) {
      const { name, features } = importAdapters[key];
      const text = dep.declarations.get(local);
      if (!text) throw Error(`${target}: adapter original ${key} is not a top-level declaration`);
      assertFeatures(`${target}: adapter ${name} (${key})`, text, features);
      adapterRecords.set(key, { original: key, name, features });
      return { from: adapterModule, name, kind: 'adapter', original: local };
    }
    if (sharedAdapters[key]) {
      const { graph, module } = sharedAdapters[key];
      const linked = await readManifest(graph);
      const adapter = (linked.adapters ?? []).find(a => a.original === key);
      if (!adapter) throw Error(`${target}: ${graph} no longer answers ${key}`);
      if (!manifest.sharedAdapters.some(a => a.original === key)) manifest.sharedAdapters.push({ original: key, graph, name: adapter.name });
      return { from: module, name: adapter.name, kind: 'shared-adapter', original: local };
    }
    if (linkedBindings[key]) {
      const graph = linkedBindings[key];
      const linked = await readManifest(graph);
      if (linked.referenceVersion !== referenceVersion) throw Error(`${graph} is ${linked.referenceVersion}, expected ${referenceVersion}`);
      const mod = linked.modules.find(m => m.source === file && (m.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local));
      if (!mod) throw Error(`${target}: ${graph} no longer holds ${key}`);
      const exportName = (await moduleExports(path.join(root, 'src/generated', graph, mod.target))).get(local);
      if (!exportName) throw Error(`${target}: ${graph}/${mod.target} does not export ${local}`);
      if (!manifest.linked.some(l => l.original === key)) manifest.linked.push({ original: key, graph, target: mod.target, name: exportName });
      return { from: `../${graph}/${mod.target}`, name: exportName, kind: 'linked', original: local };
    }
    const owner = emitted.find(m => m.source === file && m.exports[local]);
    if (!owner) throw Error(`${target}: unresolved import ${via} (${local})`);
    return { from: `./${owner.target}`, name: owner.exports[local], kind: 'generated', original: local };
  }

  for (const raw of modules) {
    const src = await readSource(raw.source, cache);
    const byLocal = alias => {
      const local = src.exported.get(alias);
      if (!local) throw Error(`${raw.target}: ${raw.source} no longer exports ${alias}`);
      return local;
    };
    const spec = raw.byExport ? { ...raw,
      exports: Object.fromEntries(Object.entries(raw.byExport).map(([alias, name]) => [byLocal(alias), name])),
      features: Object.fromEntries(Object.entries(raw.features ?? {}).map(([alias, list]) => [byLocal(alias), list])) } : raw;
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      const adapter = spec.adapters?.[name];
      if (adapter) {
        if (p.isImportSpecifier()) throw Error(`${spec.target}: adapter ${name} is an import`);
        assertFeatures(`${spec.target}: adapter ${adapter.name} (${name})`, declarationText(src, p), adapter.features);
        const key = `${spec.source}#${name}`;
        adapterRecords.set(key, { original: key, name: adapter.name, features: adapter.features });
        imports.set(name, { from: adapterModule, name: adapter.name, via: key, kind: 'adapter', original: name });
        return;
      }
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name;
        imports.set(name, { ...await resolveImport(spec.target, file, alias), via: `${file}:${alias}` });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.internal && ![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of [...imports].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-chat-home.mjs.\n// Edit the extractor or src/source-chat-home-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, referenceVersion, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, original: e.original })),
      exports: spec.exports,
      features: spec.features,
    });
    emitted.push(spec);
  }
  manifest.adapters = [...adapterRecords.values()].sort((a, b) => (a.original < b.original ? -1 : 1));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat home output set changed: ${present.join(',')}. Run scripts/extract-chat-home.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat home source mismatch: ${name}. Run scripts/extract-chat-home.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat home modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatHome({ check: process.argv.includes('--check') });
