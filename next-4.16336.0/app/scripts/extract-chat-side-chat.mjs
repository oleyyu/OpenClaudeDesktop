// w13-close-chat-sidechat (G9; plan-w13-closeout.md E63 chatfn-branches-09): extract the 3.6556.2 Chat side chat, the
// claude.ai "btw" panel a Chat conversation mounts beside its transcript (ca2ef848d `lc = f(T1, { organizationUuid,
// conversationUuid, parentMessageUuid, inheritedMessageCount })`), with its "Branch to new chat" answer action. Own
// generator, own output folder src/generated/chat-side-chat, own scripts/verify-gen-chat-side-chat.mjs (D0). The Code
// side chat (cccc2cf0a, source-side-chat.jsx) is a different panel and is not touched. Nothing here executes desktop
// runtime code.
//
//   shared-2 i2 (export hn)  the per-conversation side chat store: open / openWith / close / toggle, messages, status,
//                            error, pending question; s2 / c2 / l2 / u2 (exports dn / fn / mn / pn) select one
//                            conversation's open flag, messages, status and pending question. The two `gu(…)` reload
//                            blockers next to it are top-level calls, not declarations, and are not emitted.
//   ca2ef848d T1             the panel: an `aside` fixed at the bottom end of the window ("Side chat" header with the
//                            ⌘; shortcut, Clear side chat, Close side chat), x1 ("Sees N messages from main chat ·
//                            read-only"), b1 (the Q&A list: Copy answer, and Branch to new chat → router push
//                            `/new?q=…` "Continuing from a side question."), the error line and y1 (the composer).
//                            v1 / _1 send a question with the earlier Q&A pairs as btwHistory.
//
// Host adapters (src/source-chat-side-chat-adapters.jsx): p1 (the open / close / toggle hook behind GrowthBook
// claudified_btw_side_chat and ⌘;), shared-1 WV (useShortcut, for btw_side_chat only) and c9451a5b2 o (the claude.ai
// side_question SSE stream; locally codeDesktop/sideQuestion on the conversation's own thread, E59).
// Imports resolve, in this order, to: a vendor-frame React alias (official.reactAliases, checked by assertVendorAlias),
// a view-tabs public name by its official file and export alias (compiler helpers and CDS parts, E3/R3), a host
// adapter of this graph (its original declaration must carry `features`), a host adapter another 3.6556.2 graph
// already answers the same binding with (D1: one adapter per original binding), a binding a linked 3.6556.2 graph
// holds and exports (D1), or a module emitted earlier here. Anything else stops generation. Features are matched
// through looseFeature() (R2/E5).
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
const output = path.join(root, 'src/generated/chat-side-chat');
const adapterModule = '../../source-chat-side-chat-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Globals the original code reads.
const hostGlobals = new Set(['Math', 'document', 'Map', 'Set', 'Symbol', 'clearTimeout', 'setTimeout', 'RegExp', 'Object', 'Error',
  'AbortController', 'requestAnimationFrame', 'encodeURIComponent']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
// `byExport` names roots by the chunk's export alias; `internal: true` allows roots the chunk does not export.
// `adapters`: same-chunk original local -> { name, features } answered by the host adapter module (features on the
// prettier-formatted declaration).
const modules = [
  { target: 'side-chat-store.mjs', source: 'shared-2-TF8v67kg.js',
    byExport: { hn: 'chatSideChatStore', dn: 'useChatSideChatOpen', fn: 'useChatSideChatMessages', mn: 'useChatSideChatStatus',
      pn: 'useChatSideChatPendingQuestion' },
    features: {
      hn: ['openByConversation: {},', 'messagesByConversation: {},', 'pendingQuestionByConversation: {},', 'openWith: (t, n) =>',
        'clearPendingQuestion: (t) =>', 'popLastIfUser: (t) =>', 'appendAssistantDelta: (t, n) =>', '[...r, { role: "assistant", text: n }]'],
      dn: ['t.openByConversation[e] ?? !1'],
      fn: ['t.messagesByConversation[e] ?? o2'],
      mn: ['t.statusByConversation[e] ?? "idle"'],
      pn: ['t.pendingQuestionByConversation[e]'] } },
  { target: 'side-chat-panel.mjs', source: 'ca2ef848d-ChLvq6yZ.js', internal: true,
    exports: { T1: 'ChatSideChat', b1: 'ChatSideChatMessages' },
    features: {
      T1: ['organizationUuid: t,', 'conversationUuid: n,', 'parentMessageUuid: r,', 'inheritedMessageCount: i', 's = Ld() ?? o,',
        '{ shortcutString: p } = Ar("btw_side_chat"),', 'defaultMessage: "Side chat", id: "0MBP0bdWwx"',
        'defaultMessage: "Clear side chat", id: "1vPf0BAKqe"', 'defaultMessage: "Close side chat", id: "fyPrl4HbZ6"',
        'defaultMessage: "Follow up\\u2026", id: "D6oMwpWrX4"', 'defaultMessage: "Ask a quick question\\u2026", id: "SUYgJ2XuFk"',
        'id: "UAw9rsyXsu"', 's.push(`/new?q=${encodeURIComponent(r)}`);', 'f("aside", {',
        '"fixed bottom-4 end-4 flex w-[400px] max-w-[calc(100vw-2rem)] max-h-[min(560px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border-0.5 border-strong bg-surface-3 shadow-[0_24px_60px_color-mix(in_srgb,var(--cds-black)_18%,transparent),0_4px_16px_color-mix(in_srgb,var(--cds-black)_8%,transparent)] transition-[opacity,transform] duration-200 ease-out origin-bottom-right [&:where(:root[dir=rtl]_:dir(rtl))]:origin-bottom-left opacity-0 scale-95 pointer-events-none data-[open]:opacity-100 data-[open]:scale-100 data-[open]:pointer-events-auto"',
        '"flex shrink-0 items-center gap-1 border-b-0.5 px-3 py-2"'],
      b1: ['messages: t,', 'onBranch: r,', 'renderUrlsAsText: i',
        'defaultMessage:\n                  "Ask on the side without touching the main chat. Claude sees the full context, and nothing here is added to it.",',
        'id: "ctWkktQM0M"', 'defaultMessage: "Copy answer", id: "9Kp4ZgNuBk"', 'icon: "GitBranch",', 'onClick: () => r(i),',
        'defaultMessage: "Branch to new chat",', 'id: "9904KlI+jU",', 'defaultMessage: "Thinking\\u2026", id: "P1QHV0AhYD"',
        '"flex gap-0.5 px-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100"',
        '"max-w-[85%] rounded-xl bg-neutral-30 px-3 py-2 font-base text-primary whitespace-pre-wrap break-words"',
        '"flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-3"'] },
    adapters: {
      // The open / close / toggle hook: GrowthBook claudified_btw_side_chat, off on the Code routes (/epitaxy, /code) and
      // in a Cowork local agent context, and the document-level btw_side_chat key listener. The host answers it for a
      // Chat conversation (E63 G9), with the same store actions and the same key listener.
      p1: { name: 'useChatSideChatToggle', features: ['t = Tt("claudified_btw_side_chat"),', '{ matchShortcut: n } = Ar("btw_side_chat"),',
        'e.startsWith("/epitaxy") || e.startsWith("/code")', 'Aa() === "cowork"', 'r.addEventListener("keydown", i, !0)',
        'enabled: t,', 'isOpen: s,', 'toggle: p'] } } },
];
// Feature checks on declarations a root reaches (the panel's parts), so a reused minified name cannot pass.
const innerFeatures = {
  'ca2ef848d-ChLvq6yZ.js#x1': ['defaultMessage: "Sees {count, plural, one {# message} other {# messages}} from main chat",', 'id: "3XI+xKIxnt",',
    'defaultMessage: "read-only", id: "GX8+SGUXDd"', 'name: "Eye", size: "xs"', '"flex w-full items-center gap-1.5 px-3 py-2 border-b-0.5 bg-bg-100/60"'],
  'ca2ef848d-ChLvq6yZ.js#y1': ['"flex-1 resize-none bg-transparent outline-none font-base py-1.5 placeholder:text-text-500/70 min-h-[20px] max-h-[120px]"',
    'defaultMessage: "Send", id: "9WRlF4R2gm"', 'icon: "ArrowUp",', 'e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing'],
  'ca2ef848d-ChLvq6yZ.js#_1': ['btwHistory: c,', 'o.popLastIfUser(t),', 'source: "btw_side_question_stream"',
    'defaultMessage: "Something went wrong", id: "JqiqNj0Ooi"', '(u || n.popLastIfUser(t), n.setStatus(t, "idle"));'],
  'ca2ef848d-ChLvq6yZ.js#v1': ['parentMessageUuid: r', '{ send: l, abort: c }'],
  'ca2ef848d-ChLvq6yZ.js#w1': ['let n = t.closest(S1);'],
};
// Imports another chunk declares that the host answers: original chunk#local -> { name, features } (features on the
// original declaration's raw text through looseFeature).
const importAdapters = {
  // shared-1 WV (useShortcut): the platform's bindings of a command in the shortcut table RV, its "cmd+;" string and a
  // keydown matcher. The panel asks only for btw_side_chat (shared-1 LV: ";" with cmd on mac, ctrl elsewhere).
  'shared-1-BJhqMmkf.js#WV': { name: 'useShortcut', features: ['o=RV[e]', 'l=n?"mac":"non-mac"', '{description:h,shortcutString:m,matchShortcut:p,bindings:g}'] },
  // c9451a5b2 o: POST /api/organizations/{org}/chat_conversations/{id}/side_question as an event stream of text deltas.
  // No claude.ai account here (E59): the host asks the conversation's own core through codeDesktop/sideQuestion, the
  // read-only side question Code's side chat already uses, with the same earlier Q&A pairs.
  'c9451a5b2-Dri8I3GN.js#o': { name: 'streamChatSideQuestion', features: ['/chat_conversations/${s}/side_question', 'btw_history:l',
    'parent_message_uuid:u??null', 't.delta?.type==="text_delta"&&t.delta.text&&m(t.delta.text)'] },
};
// Host adapters another 3.6556.2 graph already answers these bindings with (D1: one adapter per original binding).
const sharedAdapters = {
  'vendor-intl-DYfox5Co.js#q': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  'vendor-intl-DYfox5Co.js#Gt': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  // shared-25 Jd (useRouter): T1's `Ld() ?? gn()` push; the host provides RoutinesSharedHost's navigate for `/new?q=`.
  'shared-25-DOWZRSlq.js#Jd': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  // shared-0 bN (the error reporter _1 calls when the stream fails): console only (D17).
  'shared-0-DDOOdL6P.js#bN': { graph: 'cowork-scheduled', module: '../../source-routine-cowork-adapters.jsx' },
  // c89efce1a rc (DA, the answer's markdown): the host Chat Markdown, as the memory and knowledge views draw it.
  'c89efce1a-C_nlrFif.js#rc': { graph: 'chat-knowledge', module: '../../source-chat-knowledge-adapters.jsx' },
};
// Bindings a linked 3.6556.2 graph holds and exports: original chunk#local -> graph directory.
const linkedBindings = {
  'vendor-all-0-DXM0MGjZ.js#v': 'session-rail-kit',
  'shared-25-DOWZRSlq.js#hf': 'code-composer',
  'shared-frame-6jtSkIit.js#ca': 'session-rail-kit',
  'shared-2-TF8v67kg.js#A_': 'routines-shared',
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

export async function extractChatSideChat({ check = false } = {}) {
  const cache = new Map(), files = {}, emitted = [];
  const vendorText = (await readRaw(official.vendorFrame, cache)).code;
  official.assertCompilerHelpers((await readRaw(official.sharedFrame, cache)).code);
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  // official file:export alias -> view-tabs public name (compiler helpers and CDS parts alike).
  const viewTabsNames = new Map(Object.entries(viewTabs.publicNames ?? {}).filter(([, e]) => e.export).map(([name, e]) => [`${e.file}:${e.export}`, name]));
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-side-chat.mjs',
    adapterModule: 'src/source-chat-side-chat-adapters.jsx', modules: [], adapters: [], sharedAdapters: [], linked: [] };
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
      const inner = innerFeatures[`${spec.source}#${name}`];
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
    // `inner`: the innerFeatures keys this module must reach (default: every key of its chunk).
    for (const key of spec.inner ?? Object.keys(innerFeatures))
      if (key.startsWith(`${spec.source}#`) && !selected.has(key.slice(spec.source.length + 1))) throw Error(`${spec.target}: ${key} is no longer reached`);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-chat-side-chat.mjs.\n// Edit the extractor or src/source-chat-side-chat-adapters.jsx, never this file.\n`;
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat side chat output set changed: ${present.join(',')}. Run scripts/extract-chat-side-chat.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat side chat source mismatch: ${name}. Run scripts/extract-chat-side-chat.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat side chat modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatSideChat({ check: process.argv.includes('--check') });
