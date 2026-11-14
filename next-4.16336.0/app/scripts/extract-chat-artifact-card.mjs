// w13-chatui-artifact-inline (research/w13-chatui.md chatui-C13, plan-w13.md "w13-chatui-artifact-inline"): extract the
// 3.6556.2 parts a desktop Chat draws an `artifacts` tool call with, so a Chat artifact shows as the official artifact
// block (shared-9 oO, `artifact-block-cell`) that opens the artifact panel beside the conversation. Own generator, own
// output folder src/generated/chat-artifact-card, own scripts/verify-gen-chat-artifact-card.mjs (D0). Nothing here
// executes desktop runtime code.
//
//   cc1aae219 Y3   the Chat transcript's `artifacts` tool block (the tool-use switch `case "artifacts": … h(Y3, { input,
//                  conversationUuid, toolResult, isStreaming, onOpenArtifact, message, toolUseId, artifactCellType,
//                  isFirstBlockOfMessage, isLastBlockOfMessage })`): the wrapper `div` (pt-2/pt-3, pb-2/pb-3, h-0 for an
//                  edit that is not the last, `data-transcript-stays-put`) around Eh = shared-9 sO, with the artifact's
//                  properties ({isClosed, ...stored artifact, ...input}), its version number / count, the stopped state
//                  (a cancelled result), isEdit (a cell that is not individual_cell_create), isExpanded (the open drawer
//                  item is this artifact) and onOpenArtifact(id, messageUuid, versionUuid, {toolUseId}). q3 drops
//                  undefined input fields.
//   cc1aae219 PB   the cell type of an `artifacts` tool use from the blocks two before / two after it
//                  (individual_cell_create|update|rewrite, multi_edit_last, multi_edit_not_last); jB reads its id.
//   shared-9 sO    (export R) the memoised artifact block: aO (a layout's own Card, shared-2 x2, else oO), oO the block
//                  (`group/artifact-block … rounded-lg … border-0.5 … px-4`, the open button ZD "View {title}" / "Open
//                  artifact", the title line $D ("Drafting artifact..." / "Making edits..." / "Stopped"), the type line eO
//                  ("{type} · Version {versionNum}"), cO the tilted preview card and its type glyph), XD the state, VD the
//                  type names (Text, Document, Interactive artifact, Image, Code, Diagram).
//   shared-9 yO    (export F) whether the block sits inside a grouped summary (_O, no provider here: false).
//   shared-2 y2/b2/x2/_2 (exports an / sn / on) the transcript layout ("classic" without a provider) and its Card.
//   shared-2 vT    (export ah) the drawer trigger store: the block's open button is remembered so closing the artifact
//                  returns focus to it.
//   shared-104 Q   (export Pt) the artifact MIME types.
//   c7f8992b4 l    (export d) `data-transcript-stays-put`.
//   vendor-icons V / z / I (exports n / r / i) the Phosphor Image, Code and Atom glyphs of the preview card.
//
// Host adapters (src/source-chat-artifact-card-adapters.jsx; the generator checks each original's features first):
//   shared-104 VI  the zod schema of the tool input → the same fields, invalid ones dropped (`.optional().catch(void 0)`).
//   shared-4 DS    a transcript capability (`toolResultMarkersTrusted`): the local tool reports its own version numbers.
//   shared-2 tE    the drawer context → closeDrawer closes the Chat artifact panel.
//   shared-130 AY / kY  the conversation's artifact store → the artifacts this Chat's tool calls wrote.
//   c7d03f0bf s    the drawer's selected item → the Chat artifact panel's open artifact.
// Shared with routines-shared (D1): vendor-intl q / Gt (useIntl / FormattedMessage); with chat-markdown: shared-25 OH
// (the localStorage write, a no-op here). Linked 3.6556.2 graphs (D1): cowork-scheduled vendor-icons o / a (IconBase and
// its context), sidebar-sections zustand `create`, code-composer shared-25 hf / mf (owner document / window).
//
// Imports resolve, in this order, to: a vendor-frame React alias, a view-tabs public name by its official file and
// export alias (compiler helpers, clsx, CdsShimmer; E3/R3), a host adapter, a shared adapter, a linked binding, a module
// emitted earlier here, or (for a local of the same chunk) the earlier module of that chunk that exports it. Anything
// else stops generation. Features are matched through looseFeature() (R2/E5).
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
const output = path.join(root, 'src/generated/chat-artifact-card');
const adapterModule = '../../source-chat-artifact-card-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Globals the original code reads.
const hostGlobals = new Set(['Object', 'Date', 'RegExp', 'requestAnimationFrame', 'globalThis', 'String', 'Array', 'Number', 'Set', 'Map', 'Error', 'Boolean']);
// Emitted in dependency order; `byExport` names roots by the chunk's export alias, `exports` by original local (both may
// be given). `internal: true` allows roots the chunk does not export. `adapters`: same-chunk original local -> { name,
// features } answered by the host adapter module (features on the prettier-formatted declaration).
const modules = [
  { target: 'artifact-type.mjs', source: 'shared-104-CTONUSaz.js', byExport: { Pt: 'ArtifactType' },
    features: { Pt: ['(e.Text = "text/plain")', '(e.Markdown = "text/markdown")', '(e.Html = "text/html")', '(e.Code = "application/vnd.ant.code")',
      '(e.Svg = "image/svg+xml")', '(e.Mermaid = "application/vnd.ant.mermaid")', '(e.React = "application/vnd.ant.react")'] } },
  { target: 'artifact-icons.mjs', source: 'vendor-icons-BplZ6UOJ.js', byExport: { n: 'ImageIcon', r: 'CodeIcon', i: 'AtomIcon' },
    features: { n: ['weights: B'], r: ['z = R'], i: ['I = F'] } },
  { target: 'transcript-layout.mjs', source: 'shared-2-TF8v67kg.js',
    byExport: { an: 'useTranscriptLayoutName', sn: 'useTranscriptLayoutIsCustom', on: 'useTranscriptLayoutCard', ah: 'drawerTriggerStore' },
    features: { an: ['return x(_2)?.name ?? "classic";'], sn: ['return y2() !== "classic";'], on: ['return x(_2)?.Card;'],
      ah: ['triggerElement: null,', 'focusRequestId: 0,', 't?.closest("[data-no-chat-drawer]")', 'restoreFocusToTrigger: (n) =>', 'r.focus({ preventScroll: !0 })'] } },
  { target: 'transcript-stays-put.mjs', source: 'c7f8992b4-DUZwS58e.js', byExport: { d: 'transcriptStaysPutAttribute' },
    features: { d: ['l = "data-transcript-stays-put"'] } },
  { target: 'artifact-block.mjs', source: 'shared-9-CM21XrJw.js', byExport: { R: 'ArtifactBlock', F: 'useArtifactBlockGrouped', N: 'ArtifactBlockGroupedContext' },
    features: {
      R: ['n.id === r.id &&', 'e.isNotLastEdit === t.isNotLastEdit &&', 'e.titleIsFileName === t.titleIsFileName &&'],
      F: ['return v(_O);'], N: ['_O = k(!1)'] } },
  { target: 'artifact-tool-block.mjs', source: 'cc1aae219-CeSwM-tp.js', internal: true,
    exports: { Y3: 'ChatArtifactToolBlock', PB: 'artifactCellType', jB: 'artifactToolUseId' },
    features: {
      Y3: ['artifactCellType: c,', 'isFirstBlockOfMessage: l,', 'isLastBlockOfMessage: u,', 'q3(vo.parse(t))', 'Xa("toolResultMarkersTrusted")',
        'c !== "multi_edit_not_last"', '(R ? "hidden" : "h-0")', '"ps-[var(--msg-block-inset,0.5rem)]"', 'openTestId: "artifact-card-open",', 'isExpanded: k,',
        'a?.(e, o.uuid, d.version_uuid, { toolUseId: s });'],
      PB: ['c = "individual_cell_create"', 'create: "individual_cell_create",', 'update: "individual_cell_update",', 'rewrite: "individual_cell_rewrite"',
        '"multi_edit_last"', '"multi_edit_not_last"'],
      jB: ['e?.type !== "tool_use" || e.name !== "artifacts"', 'e.input?.id ?? e.partial_json?.match(AB)?.[1]'] } },
];
// Feature checks on declarations a module must reach from its roots, by target (a reused minified name cannot pass).
const innerFeatures = {
  'artifact-block.mjs': {
    oO: ['"group/artifact-block relative flex text-start font-sans rounded-lg overflow-hidden border-0.5 transition duration-300 w-full hover:bg-bg-000/50 px-4"',
      '"border-accent-200 duration-500"', '"border-border-300 hover:border-border-200"', '"artifact-block-cell flex flex-1 justify-between w-full"',
      '"flex flex-col gap-1 py-4 min-w-0 flex-1"', '"opacity-0 pointer-events-none transition-none"'],
    ZD: ['"absolute inset-0 cursor-pointer rounded-[inherit] focus-visible:outline-none"', 'defaultMessage: "View {title}"', 'id: "DJwNP60Awm"',
      'defaultMessage: "Open artifact"', 'id: "b9eW0AZlJl"', 'wi.getState().setTriggerElement(e.currentTarget)'],
    VD: ['defaultMessage: "Document"', 'defaultMessage: "Interactive artifact"', 'defaultMessage: "Diagram"', 'defaultMessage: "Image"'],
    $D: ['defaultMessage: "Making edits..."', 'defaultMessage: "Drafting artifact..."'],
    QD: ['defaultMessage: "Stopped"'],
    eO: ['defaultMessage: "Version {versionNum}"', 'id: "iMMX+ZCJ/I"'],
    cO: ['"absolute right-2 flex flex-1 overflow-hidden w-[52px] h-[71px]"', '"flex items-end w-[68px] relative shrink-0 pointer-events-none"'],
  },
  'artifact-tool-block.mjs': { q3: ['Object.fromEntries(Object.entries(e).filter(([, e]) => e !== void 0))'] },
};
// Imports another chunk declares that the host answers: original chunk#local -> { name, features } (features on the
// original declaration's raw text through looseFeature).
const importAdapters = {
  'shared-104-CTONUSaz.js#VI': { name: 'chatArtifactsInputSchema', features: ['command:s(["create","update","rewrite"]).optional().catch(void 0)',
    'version_number:u().int().optional().catch(void 0)', 'type:a(Q).optional().catch(void 0)'] },
  'shared-4-DUB1Oi0O.js#DS': { name: 'useChatTranscriptCapability', features: ['function DS(e){return j(ES)[e]===!0}'] },
  'shared-2-TF8v67kg.js#tE': { name: 'useChatArtifactDrawer', features: ['function tE(){return x(eE)}'] },
  'shared-130-dWztbTO1.js#AY': { name: 'useChatArtifactRecord', features: ['DY(n,e).artifacts[t]'] },
  'shared-130-dWztbTO1.js#kY': { name: 'useChatArtifactEntry', features: ['let{artifacts:r,streamingArtifacts:i}=DY(n,e);return t in i?i[t]:r[t]'] },
  'c7d03f0bf-_kWSkIg-.js#s': { name: 'useChatArtifactDrawerSelected', features: ['t(e.selectedDrawerItem)'] },
};
// Host adapters other graphs already answer these bindings with (D1: one adapter per original binding).
const sharedAdapters = {
  'vendor-intl-DYfox5Co.js#q': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  'vendor-intl-DYfox5Co.js#Gt': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  'shared-25-DOWZRSlq.js#OH': { graph: 'chat-markdown', module: '../../source-chat-markdown-adapters.jsx' },
};
// Bindings a linked 3.6556.2 graph holds and exports: original chunk#local -> graph directory.
const linkedBindings = {
  'vendor-icons-BplZ6UOJ.js#o': 'cowork-scheduled',
  'vendor-all-0-DXM0MGjZ.js#v': 'sidebar-sections',
  'shared-25-DOWZRSlq.js#hf': 'code-composer',
  'shared-25-DOWZRSlq.js#mf': 'code-composer',
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

export async function extractChatArtifactCard({ check = false } = {}) {
  const cache = new Map(), files = {}, emitted = [];
  const vendorText = (await readRaw(official.vendorFrame, cache)).code;
  official.assertCompilerHelpers((await readRaw(official.sharedFrame, cache)).code);
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  // official file:export alias -> view-tabs public name (compiler helpers and CDS parts alike).
  const viewTabsNames = new Map(Object.entries(viewTabs.publicNames ?? {}).filter(([, e]) => e.export).map(([name, e]) => [`${e.file}:${e.export}`, name]));
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-artifact-card.mjs',
    adapterModule: 'src/source-chat-artifact-card-adapters.jsx', modules: [], adapters: [], sharedAdapters: [], linked: [] };
  const adapterRecords = new Map();

  // A binding a linked 3.6556.2 graph holds and exports (D1: one copy per original binding).
  async function linkedImport(target, file, local) {
    const key = `${file}#${local}`, graph = linkedBindings[key];
    const linked = await readManifest(graph);
    if (linked.referenceVersion !== referenceVersion) throw Error(`${graph} is ${linked.referenceVersion}, expected ${referenceVersion}`);
    const mod = linked.modules.find(m => m.source === file && (m.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local));
    if (!mod) throw Error(`${target}: ${graph} no longer holds ${key}`);
    const exportName = (await moduleExports(path.join(root, 'src/generated', graph, mod.target))).get(local);
    if (!exportName) throw Error(`${target}: ${graph}/${mod.target} does not export ${local}`);
    if (!manifest.linked.some(l => l.original === key)) manifest.linked.push({ original: key, graph, target: mod.target, name: exportName });
    return { from: `../${graph}/${mod.target}`, name: exportName, kind: 'linked', original: local };
  }

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
    if (linkedBindings[key]) return linkedImport(target, file, local);
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
      // A local of this chunk a linked graph already emits: import it from there.
      if (linkedBindings[`${spec.source}#${name}`] && !p.isImportSpecifier()) {
        imports.set(name, { ...await linkedImport(spec.target, spec.source, name), via: `${spec.source}#${name}` });
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-chat-artifact-card.mjs.\n// Edit the extractor or src/source-chat-artifact-card-adapters.jsx, never this file.\n`;
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat artifact card output set changed: ${present.join(',')}. Run scripts/extract-chat-artifact-card.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat artifact card source mismatch: ${name}. Run scripts/extract-chat-artifact-card.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat artifact card modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatArtifactCard({ check: process.argv.includes('--check') });
