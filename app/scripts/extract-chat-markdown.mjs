// w13-chatui-markdown-code (research/w13-chatui.md chatui-C11/C12, plan-w13.md "w13-chatui-markdown-code"): extract the
// 3.6556.2 parts a desktop Chat answer is drawn with, so a Chat reply stops borrowing the Code transcript's Markdown and
// fence. Own generator, own output folder src/generated/chat-markdown, own scripts/verify-gen-chat-markdown.mjs (D0).
// Nothing here executes desktop runtime code.
// w13-close-chat-renderer: a Chat answer is now drawn by the 3.6556.2 Chat text renderer itself (cc1aae219 OR → c89efce1a
// rc, scripts/extract-chat-renderer.mjs → src/generated/chat-renderer), which links the parts below from this area (D1):
// shared-10 Ab / Eb / Bu / lx and the code block's streaming context bv / xv, shared-4 RC.
//
//   c18fe02d2 Ua   (export ChatMarkdown) the Chat answer. Its renderer (`mi` over the incremental `set` address, the KaTeX
//                  and quote passes, 391 bindings over eight chunks) is not sliced; what it draws is:
//                    La   the prose root: `t === "detail" ? r(W, …) : r(G, { ref: o, children: i })`, G = shared-10 `sn`
//                         (lx below) — the font-claude-response prose;
//                    ca.codeBlock  `e === "" ? r("pre", { dir: "ltr", children: r(U.code, { variant: "plain", className: n }) })
//                         : r(U.pre, { className: n, children: e })`, U = shared-10 `gn` (Ab below), n = `language-${t}`;
//                    inlineCode    c89efce1a Ds → `Re.code` (the same Ab) with `variant: hs("prose")` = "plain".
//                  The host composes the same tree (src/source-chat-markdown.jsx).
//   shared-10 lx   (export sn) the Chat prose: Prose (tx, `data-cds: "Prose"`) with `font: i.font ?? ox`,
//                  ox = `var(--font-claude-response, var(--cds-font-voice))`; rx (export ln) = Prose with its Lead.
//   shared-10 Ab   (export gn) the Markdown components the Chat answer's slots take: h1, p, li, ul, ol, blockQuote,
//                  pre = Eb, code (chip / plain).
//   shared-10 Bu   the code style pair (Lu dark / Ru light, prism-shaped) and mode the highlighter colours text with;
//                  exported so the host hands it to the highlighter adapter (useCodeBlockTheme).
//   shared-10 Eb   the code block: `group/copy` frame, the language caption, `code-block__code` body over the highlighter
//                  (lf), the oversize notice (Gs), and the copy button wb (`data-testid: "code-block-copy"`, "Copy to
//                  clipboard" / "Copied").
//   shared-4  Aw   (export Kn) strips citation directives from code text; qO / GO / KO (exports Dt / Et / Tt) the code
//                  block's find-omitted flag, header-actions renderer and copy callback contexts (no provider here).
//   vendor-all-0 Et (export i) tiny-invariant.
//
// Host adapters (src/source-chat-markdown-adapters.jsx; the generator checks each original's features first):
//   shared-10 lf   the shiki highlighter (worker / in-page engines, grammar imports): the host's shiki service answers it.
//   shared-10 xb   the Mermaid diagram: behind `claude_ai_markdown_mermaid_render` (off here), never drawn.
//   shared-10 Cb   the zod schema of `claude_code_spotlight_code_viewed_signal`.languages (the dynamic config is empty).
//   shared-frame Ga (jd) the color-scheme store; the host's resolved light / dark mode answers it.
//   shared-25 zs (Hh) dynamic config value → the fallback; OH (In) localStorage write (the spotlight signal) → nothing.
// Shared with routines-shared (D1): vendor-intl q / Gt (useIntl / FormattedMessage), shared-25 fs (useFeatureIsOn, off).
// Linked 3.6556.2 graph (D1): working-line shared-1 CR (the copy-to-clipboard hook). shared-0 LS (useEventCallback) is a
// view-tabs public name.
//
// Imports resolve, in this order, to: a vendor-frame React alias (official.reactAliases, checked by assertVendorAlias),
// a view-tabs public name by its official file and export alias (compiler helpers, CdsButton, CdsIcon, cdsClassNames,
// cdsSizeAttributes, clsx; E3/R3), a host adapter, a shared adapter, a linked binding, a module emitted earlier here, or
// (for a local of the same chunk) the earlier module of that chunk that exports it. Anything else stops generation.
// Features are matched through looseFeature() (R2/E5).
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
const output = path.join(root, 'src/generated/chat-markdown');
const adapterModule = '../../source-chat-markdown-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Globals the original code reads.
const hostGlobals = new Set(['Math', 'Symbol', 'Blob', 'Date', 'Object', 'Error', 'RegExp', 'String', 'Set']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots), and
// `byExport` names roots by the chunk's export alias (both may be given). `internal: true` allows roots the chunk does
// not export. `adapters`: same-chunk original local -> { name, features } answered by the host adapter module (features
// on the prettier-formatted declaration).
const modules = [
  { target: 'invariant.mjs', source: 'vendor-all-0-DXM0MGjZ.js', byExport: { i: 'invariant' },
    features: { i: ['if (!e) throw Error(Tt);'] } },
  { target: 'code-block-support.mjs', source: 'shared-4-DUB1Oi0O.js',
    byExport: { Kn: 'stripCitationDirectives', Dt: 'CodeBlockFindOmittedContext', Et: 'CodeBlockHeaderActionsContext',
      Tt: 'CodeBlockCopyCallbackContext' },
    // w13-close-chat-renderer: the citation directive name (RC "antCitation") the chat-renderer graph's c18fe02d2 sa / jw read.
    exports: { RC: 'antCitationDirective' },
    features: { Kn: ['return e.replace(BC, "");'], Dt: ['R(!1)'], Et: ['R(null)'], Tt: ['R(null)'] } },
  { target: 'chat-prose.mjs', source: 'shared-10-D6FXWZph.js', byExport: { sn: 'ChatProse', ln: 'Prose' },
    features: { sn: ['let i = v(sx),', 'o = i.font ?? ox,', 'c = i.size,', 's(rx, { ref: t, font: o, size: c, ...r, className: l })'],
      ln: ['Object.assign(tx, { Lead: nx })'] } },
  { target: 'code-block.mjs', source: 'shared-10-D6FXWZph.js', internal: true,
    byExport: { gn: 'ChatMarkdownComponents' },
    // w13-close-chat-renderer: bv / xv (the code block's streaming context and its hook) for the chat-renderer graph,
    // whose c18fe02d2 blockShell is shared-10 Sv (`s(bv.Provider, { value: t, children: n })`).
    exports: { Eb: 'ChatCodeBlock', Bu: 'useCodeBlockTheme', bv: 'CodeBlockStreamingContext', xv: 'useCodeBlockStreaming' },
    features: {
      gn: ['blockQuote: (e) =>', '"border-s-2 border-border-100 ps-2"', 'pre: Eb,', 'let c = o === void 0 ? "chip" : o,',
        '"[&:not(:last-child)_ul]:pb-1 [&:not(:last-child)_ol]:pb-1 list-disc space-y-2.5 ps-7"'],
      Eb: ['flagShowCodeHeader: r,', 'renderMermaidAsCode: i,', 'bare: o,', '"data-sourcepos": c', '"CodeBlock children must be a string"',
        '/language-(\\w+)/.exec(t || "")', '"claude_ai_markdown_mermaid_render"', '"claude_code_spotlight_code_viewed_signal"',
        'defaultMessage: "{language} code"', 'id: "zftCccY1XC"', 'defaultMessage: "Code"', 'id: "/GfNmXqa0P"',
        '"code-block__code !my-0 !rounded-[var(--msg-block-radius,0.5rem)] !text-sm !leading-relaxed p-3.5"',
        '"bg-bg-000/50 border-0.5 border-border-400 rounded-[var(--msg-block-radius,0.5rem)]"',
        '"text-secondary font-small p-3.5 pb-0"', 'streamRenderTelemetry: "markdown"', '"data-bare": L'] },
    adapters: {
      // The shiki highlighter (Jd engine state, worker grammar registration, in-page tokens with a 2s budget).
      lf: { name: 'ChatSyntaxHighlighter', features: ['PreTag: i,', 'codeTagClassName: d,', 'wrapLongLines: f,', 'streaming: p,',
        'streamRenderTelemetry: m,', 'formatter: "shiki"', 'tokenizeTimeLimit: 2e3', 's("code", { ...J, ...oe, ref: V, style: le, children: q })'] },
      // The Mermaid diagram (only when claude_ai_markdown_mermaid_render is on and the fence is `mermaid`).
      xb: { name: 'ChatMermaidDiagram', features: ['"use no memo";', '{ code: t, mode: n, onStatusChange: r } = e,'] },
      // The zod schema of the spotlight signal's languages list.
      Cb: { name: 'spotlightLanguagesSchema', features: ['n(() => t(e()))'] } } },
];
// Feature checks on declarations a module must reach from its roots, by target (a reused minified name cannot pass).
const innerFeatures = {
  'chat-prose.mjs': {
  tx: ['"data-cds": "Prose"', '"data-prose-font": p,', '"data-prose-heading-font": g,', 'M("prose", n)'],
  ax: ['"--font-claude-response"'],
  ix: ['"font-voice"'] },
  'code-block.mjs': {
  wb: ['"data-testid": "code-block-copy"', 'defaultMessage: "Copy to clipboard"', 'id: "aCdAsIsVv0"',
    'defaultMessage: "Copy"', 'defaultMessage: "Copied"', 'id: "p556q3uvbn"', 'variant: "ghost",', 'tooltipSide: "bottom",'],
  Gs: ['"Only the beginning is shown: This text is too large to display in full."',
    '"Syntax highlighting has been disabled due to code size."'],
  Bu: ['r = n === "dark" ? Lu : Ru;', '{ codeStyle: r, mode: n }'],
  Ps: ['Ps = 204800'],
  Db: ['"bg-text-200/5 border border-0.5 border-border-300 text-danger-000 whitespace-pre-wrap rounded-[0.4rem] px-1 py-px text-[0.9rem]"'],
  },
  'invariant.mjs': { Tt: ['"Invariant failed"'] },
};
// Imports another chunk declares that the host answers: original chunk#local -> { name, features } (features on the
// original declaration's raw text through looseFeature).
const importAdapters = {
  'shared-frame-6jtSkIit.js#Ga': { name: 'useChatColorScheme', features: ['J(Sa)??Ca', 'e.subscribe,e.getSnapshot,e.getServerSnapshot'] },
  'shared-25-DOWZRSlq.js#zs': { name: 'useChatDynamicConfigValue', features: ['type:"dynamic_config_value",name:e,key:t'] },
  'shared-25-DOWZRSlq.js#OH': { name: 'setChatLocalValue', features: ['function OH(e,t){xH(fH(e),t,!0)}'] },
};
// Host adapters routines-shared already answers these bindings with (D1: one adapter per original binding).
const sharedAdapters = {
  'vendor-intl-DYfox5Co.js#q': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  'vendor-intl-DYfox5Co.js#Gt': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  'shared-25-DOWZRSlq.js#fs': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
};
// Bindings a linked 3.6556.2 graph holds and exports: original chunk#local -> graph directory.
const linkedBindings = {
  'shared-1-BJhqMmkf.js#CR': 'working-line',
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

export async function extractChatMarkdown({ check = false } = {}) {
  const cache = new Map(), files = {}, emitted = [];
  const vendorText = (await readRaw(official.vendorFrame, cache)).code;
  official.assertCompilerHelpers((await readRaw(official.sharedFrame, cache)).code);
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  // official file:export alias -> view-tabs public name (compiler helpers and CDS parts alike).
  const viewTabsNames = new Map(Object.entries(viewTabs.publicNames ?? {}).filter(([, e]) => e.export).map(([name, e]) => [`${e.file}:${e.export}`, name]));
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-markdown.mjs',
    adapterModule: 'src/source-chat-markdown-adapters.jsx', modules: [], adapters: [], sharedAdapters: [], linked: [] };
  const adapterRecords = new Map();

  // An import specifier of `src` (file:alias) → { from, name, kind, original }.
  async function resolveImport(target, file, alias) {
    const via = `${file}:${alias}`;
    if (file === official.vendorFrame && !official.reactAliases[alias] && viewTabsNames.has(via))
      return { from: `../view-tabs/${file}`, name: viewTabsNames.get(via), kind: 'view-tabs', original: alias };
    if (file === official.vendorFrame) {
      const member = official.reactAliases[alias];
      if (!member || member[0] === 'react/compiler-runtime') throw Error(`${target}: no React alias for ${via}`);
      official.assertVendorAlias(vendorText, alias);
      return { from: member[0], name: member[1], kind: 'react', original: alias };
    }
    if (file === official.sharedFrame && official.compilerHelpers[alias]) {
      const helper = official.compilerHelpers[alias];
      const entry = viewTabs.publicNames?.[helper.name];
      if (entry?.file !== official.sharedFrame || entry.export !== alias) throw Error(`${target}: ${via} is not a view-tabs compiler helper`);
      return { from: `../view-tabs/${official.sharedFrame}`, name: helper.name, kind: 'view-tabs', original: helper.local };
    }
    if (viewTabsNames.has(via)) {
      const dep = await readRaw(file, cache);
      return { from: `../view-tabs/${file}`, name: viewTabsNames.get(via), kind: 'view-tabs', original: dep.exported.get(alias) ?? alias };
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
    // byExport roots by export alias, plus `exports` roots by local (a chunk-internal root beside exported ones).
    const spec = raw.byExport ? { ...raw,
      exports: { ...Object.fromEntries(Object.entries(raw.byExport).map(([alias, name]) => [byLocal(alias), name])), ...raw.exports },
      features: Object.fromEntries(Object.entries(raw.features ?? {}).map(([key, list]) => [key in raw.byExport ? byLocal(key) : key, list])) } : raw;
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      // A local an earlier module of the same chunk already emits and exports: import it, never a second copy.
      const owner = emitted.find(m => m.source === spec.source && m.exports[name]);
      if (owner) {
        imports.set(name, { from: `./${owner.target}`, name: owner.exports[name], via: `${spec.source}#${name}`, kind: "generated", original: name });
        return;
      }
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
      const inner = innerFeatures[spec.target]?.[name];
      if (inner) assertFeatures(`${spec.target}: ${name}`, declarationText(src, p), inner);
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
    for (const name of Object.keys(innerFeatures[spec.target] ?? {}))
      if (!selected.has(name)) throw Error(`${spec.target}: ${spec.source}#${name} is no longer reached`);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-chat-markdown.mjs.\n// Edit the extractor or src/source-chat-markdown-adapters.jsx, never this file.\n`;
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat markdown output set changed: ${present.join(',')}. Run scripts/extract-chat-markdown.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat markdown source mismatch: ${name}. Run scripts/extract-chat-markdown.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat markdown modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatMarkdown({ check: process.argv.includes('--check') });
