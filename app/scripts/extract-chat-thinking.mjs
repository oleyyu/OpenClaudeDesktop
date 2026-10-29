// w13-chatui-thinking-search (research/w13-chatui.md chatui-C9/C10, plan-w13.md "w13-chatui-thinking-search"): extract the
// 3.6556.2 labels the desktop Chat conversation (c21f11e6d CoworkSessionView → cc1aae219 timeline, nS = c734f318c
// TurnStatus) puts on a thought and on a search, so Chat stops borrowing Code's "Thought process" row. Own generator, own
// output folder src/generated/chat-thinking, own scripts/verify-gen-chat-thinking.mjs (D0). Nothing here executes
// desktop runtime code.
//
//   c05b96c7f zs   (export yr) the milliseconds between a block's start_timestamp and stop_timestamp, or undefined.
//   c05b96c7f Bs   (export vr) "Thought for {seconds}s" / "{minutes}m {seconds}s" / "{minutes}m" / "{hours}h {minutes}m" /
//                  "{hours}h" from a duration in ms, undefined under half a second.
//   c05b96c7f Gg   the label of a run of thinking blocks (a single block's title, else Bs over the summed durations,
//                  else "Thought process"): what B_ / R_ return for a group that holds only thinking.
//   c05b96c7f Wg   one thinking block's own title or duration label (the `duration` of its timeline entry).
//   shared-130 uq  (export Ir) a tool group's past-tense label by kind and count: "Searched the web", "Read a page",
//                  "Searched project knowledge", "Searched past chats", "Searched Google Drive", ….
//   shared-130 rq  the tool-name → kind table uq is keyed by (web_search → web, web_fetch → web_fetch,
//                  project_knowledge_search → project_knowledge, conversation_search → past_chats, …).
//
// All six are plain functions and tables over an injected intl (`e.formatMessage`): the output has no imports, so the pure
// model (src/chat-thinking-model.mjs) imports it under plain node (E42). Any import a root reaches stops generation.
// Features are matched through looseFeature() (R2/E5).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const { referenceVersion, referenceSnapshot, ionSource: source, looseFeature } = official;
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'src/generated/chat-thinking');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Globals the original code reads.
const hostGlobals = new Set(['Date', 'Math', 'Number']);
// `exports` maps original local binding -> exported name (its keys are the roots); `exported` lists the roots the chunk
// itself exports under that alias (checked), the rest are internal declarations reached by name.
const modules = [
  { target: 'thinking-labels.mjs', source: 'c05b96c7f-MPVkefMW.js',
    exports: { zs: 'thinkingDurationMs', Bs: 'thinkingDurationLabel', Gg: 'thinkingGroupLabel', Wg: 'thinkingBlockLabel' },
    exported: { zs: 'yr', Bs: 'vr' },
    features: {
      zs: ['if (!e || !t) return;', 'new Date(e).getTime()', 'r <= n ? void 0 : r - n'],
      Bs: ['Math.round(t / 1e3)', 'if (n <= 0) return;',
        'defaultMessage: "Thought for {seconds}s", id: "Jj0DasG7Mx"', 'defaultMessage: "Thought for {minutes}m {seconds}s", id: "4LM6AdGWNg"',
        'defaultMessage: "Thought for {minutes}m", id: "vFyvc213kN"', 'defaultMessage: "Thought for {hours}h {minutes}m", id: "voTuOb/ijW"',
        'defaultMessage: "Thought for {hours}h", id: "MFx4UWu2HS"'],
      Gg: ['t.length === 1 ? t[0]?.title : void 0', 'zs(e.start_timestamp, e.stop_timestamp) ?? 0',
        'defaultMessage: "Thought process", id: "zl6fNbo7RW"'],
      Wg: ['t.title ?? Bs(e, zs(t.start_timestamp, t.stop_timestamp) ?? 0)'] } },
  { target: 'tool-group-label.mjs', source: 'shared-130-dWztbTO1.js',
    exports: { uq: 'toolGroupLabel', rq: 'TOOL_KINDS' },
    exported: { uq: 'Ir' },
    features: {
      uq: ['case "web":', 'defaultMessage: "Searched the web", id: "4+310Bnuvz"', 'case "web_fetch":',
        'defaultMessage: "Read a page", id: "XJU1UZCozL"', 'case "project_knowledge":',
        'defaultMessage: "Searched project knowledge", id: "4GCi2qH3xL"', 'case "past_chats":',
        'defaultMessage: "Searched past chats", id: "kFCjIUtnx0"', 'case "drive_search":'],
      rq: ['project_knowledge_search: "project_knowledge"', 'web_fetch: "web_fetch"', 'web_search: "web"', 'web_search_fast: "web"',
        'conversation_search: "past_chats"', 'drive_search: "drive_search"'] } },
];

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
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !looseFeature(f).test(text));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

export async function extractChatThinking({ check = false } = {}) {
  const cache = new Map(), files = {};
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-thinking.mjs', modules: [] };
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    for (const [local, alias] of Object.entries(spec.exported ?? {}))
      if (src.exported.get(alias) !== local) throw Error(`${spec.target}: ${spec.source} no longer exports ${local} as ${alias}`);
    const selected = new Map(), seen = new Set();
    const add = name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      // The output stays import-free: a reached import means the official code changed shape.
      if (p.isImportSpecifier()) throw Error(`${spec.target}: ${name} is an import (${p.parent.source.value})`);
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-chat-thinking.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, referenceVersion, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      exports: spec.exports,
      features: spec.features,
    });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat thinking output set changed: ${present.join(',')}. Run scripts/extract-chat-thinking.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat thinking source mismatch: ${name}. Run scripts/extract-chat-thinking.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat thinking modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatThinking({ check: process.argv.includes('--check') });
