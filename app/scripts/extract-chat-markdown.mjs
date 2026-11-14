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
import * as official4 from './official-4.16336.0.mjs';
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

export async function extractChatMarkdown({ check = false, version = referenceVersion } = {}) {
  if (version === official4.referenceVersion) return extractTarget(target4, { check });
  if (version !== referenceVersion) throw Error(`extract-chat-markdown has no ${version} source contract`);
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
// ---------------------------------------------------------------------------------------------------------------------
// 4.16336.0 (region batch 2b, region-plan cutover.oldConsumersAtGeneration = chat-renderer, code-transcript;
// productionSwitchNotBeforeBatch 10): a second source contract cuts the same semantic exports from
// snapshots/claude-4.16336.0-20261104 into the isolated graph src/generated/chat-markdown-v4. chat-renderer and
// code-transcript (still 3.6556.2) and src/source-chat-markdown.jsx link src/generated/chat-markdown by original identity,
// so that graph stays on 3.6556.2, byte for byte, until they move.
// Where the 4.16336.0 originals live (every root located by the chunk's export table, or null for a private root, and
// proved the only top-level declaration of its chunk carrying its features):
//   shared-11-CNsu0Zu8.js X_ (`on`)  ChatProse (3.6556.2 shared-10 lx `sn`): Prose with `font: i.font ?? q_`,
//                  q_ = `var(--font-claude-response, var(--cds-font-voice))`; W_ (`cn`) = Prose (H_) with its Lead (U_).
//   shared-11 Qg (`vn`)  the Markdown components (3.6556.2 Ab `gn`): h1 / p / li / ul / ol / blockQuote, pre = Jg and
//                  code (chip / plain). Changed: `code` keeps only the math / `language-<id>` classes (Zg / Xg / Si), draws
//                  a math class as a `span`, and strips citation directives from string children (shared-31 lv).
//   shared-11 Jg (private)  the code block (3.6556.2 Eb). Changed: strips citation directives and normalises CR / CRLF
//                  before drawing; `bare` blocks (`data-bare`, sticky end-aligned copy, `qg` frame); the header actions
//                  slot (shared-31 Tt) now gets `{ content, getContent, language }`; the copy button (Kg) reads the copy
//                  callback context (shared-31 wt) and the copy hook takes `{ trim: !1 }`; the caption is
//                  `text-caption-regular` and carries `data-find-omitted`; Mermaid takes `autoLabelDirection`.
//   shared-11 Ns (`$n`)  the code style pair (As dark / js light) and mode (3.6556.2 Bu): the mode is cds-core
//                  useCdsModeSnapshot (shared-frame Za, the CDS mode store) ?? the private context Ms ("light"); the
//                  3.6556.2 useChatColorScheme adapter (shared-frame Ga) is not used here.
//   shared-11 Dm (`Cn`) / Em  the code block's streaming flag hook and context (3.6556.2 xv / bv).
//   shared-31-C9BqSSuD.js lv / Kw / Ww / Gw / __ (`Ur` / `Et` / `Tt` / `wt` / `Wr`): citation directive strip, the
//                  find-omitted, header-actions and copy-callback contexts, "antCitation" (3.6556.2 shared-4 Aw / qO / GO /
//                  KO / RC).
//   vendor-all-0-uUCo-eCX.js Ht (`r`): tiny-invariant (3.6556.2 vendor-all-0 Et).
//   shared-1-D1bGaTaN.js J$ (`Ei`): the copy-to-clipboard hook (3.6556.2 shared-1 CR, linked from working-line). Changed:
//                  it writes through the CDS owner window (cds-core CdsOwnerWindowContext) unless given a node. Cut here:
//                  working-line has no 4.16336.0 graph yet; when working-line-v4 exports it, link it instead (one copy).
//   shared-0-CnnWnVrT.js Se (`NT`): a stable callback over the latest handler (the oversize notice reads it).
//   shared-frame-CJdE5Ria.js Ca (`Nf`, cdsSizeAttributes) / uo (`If`, CDS useDirection): Ca is held by cds-core without a
//                  publicName and is cut again only when pure and hash-equal (heldByCdsCore); uo is not in cds-core.
// Resolution (sharedGraph 'cds-core', as extract-approval-landing.mjs 4.16336.0): an import resolves to React
// (assertVendorAlias), a host answer (below; the replaced declaration's features are checked), a cds-core publicName (its
// raw declaration hash checked), or a module emitted earlier here. A binding cds-core holds without a publicName is cut
// again only when it is not module state and hashes as cds-core's (module state stops generation, D46). React Compiler
// helpers are proved by assertCompilerHelpers and cut once in compiler-helpers.mjs.
// Host answers (existing exports only; nothing here edits a host file):
//   shared-11 rl / Ug / Gg  -> src/source-chat-markdown-adapters.jsx ChatSyntaxHighlighter / ChatMermaidDiagram /
//                  spotlightLanguagesSchema (the shiki highlighter, the Mermaid diagram behind an off gate, the zod schema);
//   shared-25 as / IH       -> useChatDynamicConfigValue / setChatLocalValue (same adapter module);
//   shared-25 ko            -> src/source-routines-shared-adapters.jsx useFeatureIsOn (no GrowthBook: off);
//   vendor-intl q / Gt      -> src/cds-core-adapter.mjs useHostIntl / HostFormattedMessage (the adapter cds-core reads
//                  react-intl through).
const target4 = (() => {
  const official = official4, loose = official.looseFeature;
  const helpers = names => Object.fromEntries(names.map(name => {
    const helper = Object.values(official.compilerHelpers).find(h => h.name === name);
    if (!helper) throw Error(`no compiler helper ${name}`);
    return [helper.local, helper.name];
  }));
  const adapters = '../../source-chat-markdown-adapters.jsx';
  return {
    official, output: path.join(root, 'src/generated/chat-markdown-v4'), label: 'chat markdown 4.16336.0',
    sharedGraph: 'cds-core',
    isolatedGraph: { legacyOutput: 'src/generated/chat-markdown', productionSwitchNotBeforeBatch: 10,
      heldBy: ['chat-renderer', 'code-transcript', 'src/source-chat-markdown.jsx'],
      dependsOn: { 'working-line': 'no 4.16336.0 graph at generation; shared-1 J$ cut here (clipboard.mjs)' } },
    hostGlobals: new Set(['Math', 'Symbol', 'Blob', 'Date', 'Object', 'Error', 'RegExp', 'String', 'Set', 'globalThis',
      'setTimeout', 'clearTimeout', 'ClipboardItem']),
    // An import another chunk declares that the host answers: original file#local -> { from, name, features } (features
    // on the original's prettier-formatted declaration). `exportPattern` must be found in the host file.
    importHosts: {
      'shared-25-D-aF0gt9.js#ko': { from: '../../source-routines-shared-adapters.jsx', name: 'useFeatureIsOn',
        features: [loose('return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;', { keep: ['go'] })] },
      'shared-25-D-aF0gt9.js#as': { from: adapters, name: 'useChatDynamicConfigValue',
        features: ['{ type: "dynamic_config_value", name: e, key: t }', loose('(o = vs(a, t, n))', { keep: ['vs'] })] },
      'shared-25-D-aF0gt9.js#IH': { from: adapters, name: 'setChatLocalValue', features: [loose('kH(gH(e), t, !0);', { keep: ['kH', 'gH'] })] },
      'vendor-intl-BJgYK7RA.js#q': { from: '../../cds-core-adapter.mjs', name: 'useHostIntl', features: [loose('let e = l(K);'), loose('return (Mt(e), e);', { keep: ['Mt'] })] },
      'vendor-intl-BJgYK7RA.js#Gt': { from: '../../cds-core-adapter.mjs', name: 'HostFormattedMessage', features: [loose('Gt = a(Wt, Ut)', { keep: ['Gt', 'Wt', 'Ut'] })] },
    },
    modules: [
      // E3: every React Compiler helper this graph reads (cds-core publishes only memoStoreDeps4, which is not read).
      { target: 'compiler-helpers.mjs', source: official.sharedFrame, compilerHelpers: true,
        exports: helpers(['reactMemoCache', 'memoSentinel', 'memoIsEmpty', 'memoChanged1', 'memoChanged2', 'memoChanged3', 'memoChanged4',
          'memoChanged5', 'memoStore0', 'memoStore1', 'memoStore2', 'memoStore3', 'memoStore4', 'memoStore5', 'memoStoreValueFirst1',
          'memoStoreValueFirst5', 'memoStoreDeps1']) },
      // shared-frame Ca (cdsSizeAttributes, held by cds-core without a publicName: pure, cut again when hash-equal) and uo
      // (the CDS direction hook over vendor-frame useDirection, which cds-core publishes).
      { target: 'cds-parts.mjs', source: official.sharedFrame, exports: { Ca: 'cdsSizeAttributes', uo: 'useCdsDirection' },
        aliases: { Ca: 'Nf', uo: 'If' },
        features: { Ca: [loose('return e && e !== "base" ? { "data-size": e } : {};')], uo: [loose('return St();', { keep: ['St'] })] } },
      { target: 'invariant.mjs', source: 'vendor-all-0-uUCo-eCX.js', exports: { Ht: 'invariant' }, aliases: { Ht: 'r' },
        features: { Ht: [loose('if (!e) throw Error(Vt);', { keep: ['Vt'] })], Vt: ['"Invariant failed"'] } },
      { target: 'code-block-support.mjs', source: 'shared-31-C9BqSSuD.js',
        exports: { lv: 'stripCitationDirectives', Kw: 'CodeBlockFindOmittedContext', Ww: 'CodeBlockHeaderActionsContext',
          Gw: 'CodeBlockCopyCallbackContext', __: 'antCitationDirective' },
        aliases: { lv: 'Ur', Kw: 'Et', Ww: 'Tt', Gw: 'wt', __: 'Wr' },
        // The three contexts are told apart by the code block that reads them (code-block.mjs Jg / Kg features).
        features: { lv: [loose('return e.replace(y_, "");', { keep: ['y_'] })], y_: ['{citations="${v_}"\\}`'],
          Kw: [loose('Kw = w(!1)', { keep: ['Kw'] })], Ww: [loose('Ww = w(null)', { keep: ['Ww'] })], Gw: [loose('Gw = w(null)', { keep: ['Gw'] })],
          __: ['__ = "antCitation"'] } },
      { target: 'stable-callback.mjs', source: 'shared-0-CnnWnVrT.js', exports: { Se: 'useStableCallback' }, aliases: { Se: 'NT' },
        features: { Se: [loose('return t.current(...n);'), loose('be(t, e);', { keep: ['be'] }), loose('[r] = p(n);')], be: [loose('e.current = t;')] } },
      { target: 'clipboard.mjs', source: 'shared-1-D1bGaTaN.js', exports: { J$: 'useCopyToClipboard' }, aliases: { J$: 'Ei' },
        features: { J$: [loose('{ timeout: t, trim: n }'), loose('r = t === void 0 ? 2e3 : t,'), loose('{ didCopy: a, copyToClipboard: p }'),
          loose('p = await Y$(a, d, t ?? l);', { keep: ['Y$'] })],
          Y$: ['navigator?.clipboard', 'new ClipboardItem({', '"text/html": new Blob([t], { type: "text/html" }),', 'writeText(e)'] } },
      { target: 'chat-prose.mjs', source: 'shared-11-CNsu0Zu8.js', exports: { X_: 'ChatProse', W_: 'Prose' }, aliases: { X_: 'on', W_: 'cn' },
        features: {
          X_: [loose('let i = E(J_),', { keep: ['J_'] }), loose('a = i.font ?? q_,', { keep: ['q_'] }), 'o = i.size,',
            loose('c(W_, { ref: t, font: a, size: o, ...r, className: l })', { keep: ['W_'] })],
          W_: [loose('Object.assign(H_, { Lead: U_ })', { keep: ['H_', 'U_'] })],
          H_: ['"data-cds": "Prose"', '"data-prose-font": p,', '"data-prose-heading-font": g,', loose('Y("prose", V_, n)', { keep: ['V_'] })],
          U_: ['"data-cds": "ProseLead"'], q_: ['`var(${K_}, var(--cds-${G_}))`'], K_: ['"--font-claude-response"'], G_: ['"font-voice"'] } },
      { target: 'code-block.mjs', source: 'shared-11-CNsu0Zu8.js',
        exports: { Qg: 'ChatMarkdownComponents', Jg: 'ChatCodeBlock', Ns: 'useCodeBlockTheme', Dm: 'useCodeBlockStreaming' },
        aliases: { Qg: 'vn', Jg: null, Ns: '$n', Dm: 'Cn' },
        // Em: the streaming context a renderer's block shell provides (3.6556.2 bv); Ms: the mode Ns falls back to when no
        // CDS mode store is provided ("light"), exported so a host can provide it.
        reexports: { Em: 'CodeBlockStreamingContext', Ms: 'CodeBlockModeFallbackContext' },
        features: {
          Qg: ['blockQuote: (e) =>', '"border-s-2 border-border-100 ps-2"', loose('pre: Jg,', { keep: ['Jg'] }), loose('let o = a === void 0 ? "chip" : a,'),
            '"[&:not(:last-child)_ul]:pb-1 [&:not(:last-child)_ol]:pb-1 list-disc space-y-2.5 ps-7"', loose('let e = Zg(r);', { keep: ['Zg'] }),
            loose('typeof t == "string" ? vt(t) : t', { keep: ['vt'] })],
          Jg: ['flagShowCodeHeader: r,', 'renderMermaidAsCode: i,', 'bare: a,', '"data-sourcepos": o', '"CodeBlock children must be a string"',
            '/language-(\\w+)/.exec(t || "")', '"claude_ai_markdown_mermaid_render"', '"claude_code_spotlight_code_viewed_signal"',
            'defaultMessage: "{language} code"', 'id: "zftCccY1XC"', 'defaultMessage: "Code"', 'id: "/GfNmXqa0P"',
            '"code-block__code !my-0 !rounded-[var(--msg-block-radius,0.5rem)] !text-sm !leading-relaxed p-3.5"',
            '"bg-bg-000/50 border-0.5 border-border-400 rounded-[var(--msg-block-radius,0.5rem)]"',
            '"text-secondary text-caption-regular font-sans p-3.5 pb-0"', 'streamRenderTelemetry: "markdown"', '"data-bare": L',
            loose('T = E(_t),', { keep: ['_t'] }), loose('D = E(ht),', { keep: ['ht'] }), '"data-find-omitted": D ? "" : void 0',
            loose('T?.({ content: g, getContent: v, language: h })'), loose('(g = vt(g))', { keep: ['vt'] }), loose('v = Ee(_),', { keep: ['Ee'] })],
          Kg: ['"data-testid": "code-block-copy"', 'defaultMessage: "Copy to clipboard"', 'id: "aCdAsIsVv0"', 'defaultMessage: "Copy"',
            'defaultMessage: "Copied"', 'id: "p556q3uvbn"', 'variant: "ghost",', 'tooltipSide: "bottom",', loose('i = E(bt),', { keep: ['bt'] }),
            loose('(i?.(), s(t(), e.currentTarget))'), loose('= Ge(a),', { keep: ['Ge'] })],
          yi: ['"Syntax highlighting has been disabled due to code size."'],
          vi: ['"Only the beginning is shown: This text is too large to display in full."'],
          Ns: [loose('r = n === "dark" ? As : js;', { keep: ['As', 'js'] }), '{ codeStyle: r, mode: n }', loose('t = E(Ms),', { keep: ['Ms'] })],
          Ms: ['Ms = w("light")'], Dm: [loose('return E(Em);', { keep: ['Em'] })], Em: [loose('Em = w(!1)', { keep: ['Em'] })],
          ii: ['ii = 204800'], Yg: ['"bg-text-200/5 border border-0.5 border-border-300 text-danger-000 whitespace-pre-wrap rounded-[0.4rem] px-1 py-px text-[0.9rem]"'],
          Xg: ['new Set(["math", "math-inline", "math-display"])'] },
        // Same-chunk declarations the host answers: local -> { from, name, features } (features on the declaration).
        host: {
          // The shiki highlighter (worker / in-page engines, grammar registration, 2s in-page budget).
          rl: { from: adapters, name: 'ChatSyntaxHighlighter', features: ['PreTag: i,', 'codeTagClassName: u,', 'wrapLongLines: d,', 'streaming: f,',
            'streamRenderTelemetry: m,', 'formatter: "shiki"', 'tokenizeTimeLimit: 2e3'] },
          // The Mermaid diagram (only when claude_ai_markdown_mermaid_render is on and the fence is `mermaid`).
          Ug: { from: adapters, name: 'ChatMermaidDiagram', features: ['"use no memo";', '{ code: t, mode: n, autoLabelDirection: r = !1, onStatusChange: i } = e,'] },
          // The zod schema of the spotlight signal's languages list.
          Gg: { from: adapters, name: 'spotlightLanguagesSchema', features: [loose('Gg = n(() => t(e()))', { keep: ['Gg'] })] } } },
    ],
  };
})();
export const contractVersions = Object.freeze([referenceVersion, official4.referenceVersion]);
// The 4.16336.0 contract and its engine, for tests that prove generation stops (a renamed alias, a non-unique root, D46).
export { target4 as contract4, extractTarget as extractContract };

async function readSource4(name, cache, dir) {
  const key = `v4:${dir}:${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(dir, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, text: bytes.toString(), code, program, exported };
  cache.set(key, record);
  return record;
}
// A feature is a literal source string or a looseFeature() pattern (R2).
const featureMissing = (text, features = []) => features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
function assertFeatures4(label, text, features = []) {
  const missing = featureMissing(text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? f.source : JSON.stringify(f))).join(', ')}`);
}
// The root is the only top-level declaration of its chunk that carries every feature.
function assertUniqueRoot(label, src, name, features = []) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = Object.entries(src.program.scope.bindings)
    .filter(([, b]) => (b.path.isFunctionDeclaration() || b.path.isVariableDeclarator()) && !featureMissing(declarationText(src, b.path), features).length)
    .map(([n]) => n);
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
// A top-level declaration in the unformatted chunk bytes: the text a runSlicer graph (cds-core) hashes its bindings by.
function rawDeclarationText(src, name) {
  src.raw ??= new Map(parsers.babel.parse(src.text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
    : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : [])));
  const node = src.raw.get(name);
  if (!node) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(node.start, node.end);
}
// sharedGraph 'cds-core': the manifest is on this version and snapshot, every module's bytes equal its recorded sha256
// and its sourceSha256 equals the official chunk read here, and every publicName is a binding its target module exports
// under exportName (the runSlicer sharedGraph contract, as extract-approval-landing.mjs).
async function sharedGraph(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(root, 'src/generated', area);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, held, published };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set / WeakSet (D46).
function isModuleState(contract, src, p) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === contract.official.vendorFrame && contract.official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return true;
    }
  }
  return false;
}
// A host answer must be an export of its host module (the file is read, never imported here); `from` is relative to
// a module of src/generated/<area>.
const hostExports = new Map();
async function assertHostExport(label, from, name) {
  const file = path.resolve(root, 'src/generated/chat-markdown-v4', from);
  if (!hostExports.has(file)) hostExports.set(file, await fs.readFile(file, 'utf8'));
  const text = hostExports.get(file);
  if (!new RegExp(`^export (?:async )?(?:function|const|let|class) ${name}\\b`, 'm').test(text)) throw Error(`${label}: ${path.relative(root, file)} does not export ${name}`);
}

async function extractTarget(contract, { check }) {
  const { official, output: out, label } = contract, dir = official.ionSource;
  const cache = new Map(), files = {}, emitted = [], hostAnswers = new Set();
  const graph = await sharedGraph(contract);
  const manifest = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-chat-markdown.mjs',
    sharedGraph: graph.area, isolatedGraph: contract.isolatedGraph, modules: [] };
  const sharedImport = (file, local) => {
    const shared = graph.published.get(`${file}#${local}`);
    return shared ? { from: `../${graph.area}/${shared.target}`, name: shared.exportName, kind: 'shared-graph', publicName: shared.name } : null;
  };
  // The declaration a cds-core publicName stands for must hash as the one cds-core holds (a re-pointed alias fails).
  const linkedSha = (src, file, local, shared) => {
    const held = graph.held.get(`${file}#${local}`);
    if (!held?.sha256 || held.sha256 !== sha(rawDeclarationText(src, local))) throw Error(`${file}#${local} differs from the declaration ${graph.area} publishes as ${shared.publicName}`);
    return held.sha256;
  };
  for (const spec of contract.modules) {
    const src = await readSource4(spec.source, cache, dir);
    if (spec.compilerHelpers) {
      const proved = official.assertCompilerHelpers(src.text);
      for (const [local, name] of Object.entries(spec.exports))
        if (proved[name]?.local !== local) throw Error(`${spec.target}: ${local} is not the proved compiler helper ${name}`);
    }
    const roots = Object.keys(spec.exports);
    const exportsAll = { ...spec.exports, ...spec.reexports };
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [];
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      const host = spec.host?.[name];
      if (host) {
        // A same-chunk declaration the host answers.
        if (p.isImportSpecifier() || (!p.isVariableDeclarator() && !p.isFunctionDeclaration())) throw Error(`${spec.target}: host binding ${name} is not a declaration of ${spec.source}`);
        if (roots.includes(name) || spec.reexports?.[name]) throw Error(`${spec.target}: host binding ${name} is a root`);
        assertFeatures4(`${spec.target}: host ${host.name} (${name})`, declarationText(src, p), host.features);
        await assertHostExport(`${spec.target}: host ${name}`, host.from, host.name);
        imports.set(name, { from: host.from, name: host.name, via: `${spec.source}#${name}`, kind: 'host', original: name, hostOf: `${spec.source}#${name}`, replacedSha256: sha(declarationText(src, p)) });
        return;
      }
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource4(file, cache, dir);
        if (file === official.vendorFrame && official.reactAliases[alias]) {
          const { module, member } = official.assertVendorAlias(dep.text, alias);
          imports.set(name, { from: module, name: member, via, kind: 'react' });
          return;
        }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${file} does not export ${alias}`);
        const answer = contract.importHosts?.[`${file}#${local}`];
        if (answer) {
          const replaced = dep.program.scope.getBinding(local)?.path;
          if (!replaced || (!replaced.isVariableDeclarator() && !replaced.isFunctionDeclaration())) throw Error(`${spec.target}: host ${answer.name} replaces ${file}#${local}, which is not a declaration`);
          assertFeatures4(`${spec.target}: host ${answer.name} (${file}#${local})`, declarationText(dep, replaced), answer.features);
          await assertHostExport(`${spec.target}: host ${file}#${local}`, answer.from, answer.name);
          imports.set(name, { from: answer.from, name: answer.name, via, kind: 'host', original: local, hostOf: `${file}#${local}`, replacedSha256: sha(declarationText(dep, replaced)) });
          return;
        }
        const shared = sharedImport(file, local);
        if (shared) { imports.set(name, { ...shared, via, original: local, linkedSha256: linkedSha(dep, file, local, shared) }); return; }
        const owner = emitted.find(m => m.source === file && m.exports[local]);
        if (!owner) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: `./${owner.target}`, name: owner.exports[local], via, kind: 'generated', original: local });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      const key = `${spec.source}#${name}`;
      // One copy: a same-chunk binding an earlier module here exports is imported from it.
      const holder = !exportsAll[name] && emitted.find(m => m.source === spec.source && m.exports[name]);
      if (holder) {
        imports.set(name, { from: `./${holder.target}`, name: holder.exports[name], via: key, kind: 'generated', original: name });
        return;
      }
      const silent = emitted.find(m => m.source === spec.source && m.selectedNames.includes(name));
      if (silent) throw Error(`${spec.target}: ${name} is held by ${silent.target} but not exported there`);
      // A binding cds-core publishes is linked, never cut again, roots included; one it holds without a publicName is
      // cut again only when it is not module state and is equal (D46).
      const shared = sharedImport(spec.source, name), held = graph.held.get(key);
      if (shared) {
        if (roots.includes(name) || spec.reexports?.[name]) throw Error(`${spec.target}: root ${key} is the cds-core publicName ${shared.publicName}; link it instead`);
        imports.set(name, { ...shared, via: key, original: name, linkedSha256: linkedSha(src, spec.source, name, shared) });
        return;
      }
      if (held) {
        if (isModuleState(contract, src, p)) throw Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${spec.target}: ${key}`);
        if (held.sha256 !== sha(rawDeclarationText(src, name))) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area}/${held.target} holds`);
        heldByCdsCore.push(name);
      }
      if (!roots.includes(name) && spec.features?.[name]) assertFeatures4(`${spec.target}: ${name}`, declarationText(src, p), spec.features[name]);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of roots) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.compilerHelpers) {
        const alias = spec.aliases?.[name];
        if (alias === undefined) throw Error(`${spec.target}: root ${name} names no export alias (null for a private root)`);
        if (alias !== null && src.exported.get(alias) !== name) throw Error(`${spec.target}: ${spec.source} exports ${alias} as ${src.exported.get(alias) ?? 'nothing'}, not ${name}`);
        if (alias === null && [...src.exported.values()].includes(name)) throw Error(`${spec.target}: private root ${name} is exported by ${spec.source}`);
        assertFeatures4(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
        assertUniqueRoot(spec.target, src, name, spec.features?.[name]);
      }
      await add(name);
    }
    const unreached = [...Object.keys(spec.reexports ?? {}), ...Object.keys(spec.features ?? {})].filter(name => !selected.has(name));
    if (unreached.length) throw Error(`${spec.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
    const unusedHosts = Object.keys(spec.host ?? {}).filter(name => !imports.has(name));
    if (unusedHosts.length) throw Error(`${spec.target}: host answers ${unusedHosts.join(', ')} are no longer reached`);
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of [...imports].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(exportsAll).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${official.referenceVersion} bindings from ${spec.source}; generated by extract-chat-markdown.mjs.\n// Edit the extractor or the host adapter it names, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !contract.hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}),
        ...(e.publicName ? { publicName: e.publicName } : {}), ...(e.replacedSha256 ? { replacedSha256: e.replacedSha256 } : {}),
        ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: exportsAll,
      ...(spec.compilerHelpers ? {} : { roots: Object.fromEntries(roots.map(name => [name, spec.aliases[name]])) }),
      heldByCdsCore,
    });
    emitted.push({ ...spec, exports: exportsAll, selectedNames: [...selected.keys()] });
    for (const entry of imports.values()) if (entry.kind === 'host') hostAnswers.add(entry);
  }
  // Every host answer once, by the original declaration it replaces (file#local).
  manifest.hosts = [...new Map([...hostAnswers].map(e => [e.hostOf, { original: e.hostOf, from: e.from, name: e.name, replacedSha256: e.replacedSha256 }])).values()]
    .sort((a, b) => (a.original < b.original ? -1 : 1));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(out).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-chat-markdown.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(out, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-chat-markdown.mjs.`);
  } else {
    await fs.mkdir(out, { recursive: true });
    for (const name of await fs.readdir(out)) if (!(name in files)) await fs.rm(path.join(out, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(out, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${count} original ${official.referenceVersion} bindings).`);
  return manifest;
}

// CLI: every contract (3.6556.2 -> src/generated/chat-markdown, 4.16336.0 -> src/generated/chat-markdown-v4); `--version
// <v>` runs one.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--version');
  const versions = at > 0 ? [process.argv[at + 1]] : contractVersions;
  for (const version of versions) await extractChatMarkdown({ check: process.argv.includes('--check'), version });
}
