import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

// round2 chat-renderer:a / :b: the 4.16336.0 Chat answer renderer graph (scripts/extract-chat-renderer-v4.mjs ->
// src/generated/chat-renderer-v4, staged; the host still renders with the 3.6556.2 graph src/generated/chat-renderer).
// Unit :a emits the LaTeX plugin group (ca129fbf3 it / at with the verbatim KaTeX bundle cf1a02a1a); ChatTextMarkdown,
// StandardMarkdown and loadLatexPlugins are located and pinned but pending (their closure writes cds-core-held module
// state). Unit :b adds remark-math (c6369e48b h, the third chunk c851b27a8 ki loads lazily), run here through the
// project's own unified / remark-parse. Source only: generator output, official chunk bytes and the plugins run on
// mdast / hast trees; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const OUT = 'src/generated/chat-renderer-v4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const local = rel => fs.readFileSync(path.join(app, rel));
const official = name => fs.readFileSync(path.join(v1, name));

// ca129fbf3 builds hast-util-from-dom's DOMParser at module load (`var pe = new DOMParser()`), as the renderer does in the
// desktop window. The KaTeX tree-to-hast fast path never parses HTML; this stand-in fails if anything does.
globalThis.DOMParser ??= class { parseFromString() { throw Error('DOMParser.parseFromString used'); } };

let server, generated;
before(async () => {
  server = await createServer({ configFile: false, root: app, server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'silent' });
  generated = await server.ssrLoadModule(`/${OUT}/index.mjs`);
});
after(() => server?.close());

test('the v4 graph pins the official 4.16336.0 roots, pending roots, adapter and cds-core; nothing reaches a 3.6556.2 graph', () => {
  const manifest = JSON.parse(local(`${OUT}/manifest.json`));
  const provenance = JSON.parse(local(`${OUT}/provenance.json`));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(provenance.sharedGraph.manifestSha256, sha(local('src/generated/cds-core/manifest.json')));
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}:${r.name}:${r.export}`).sort(), [
    'c6369e48b-jalMQaq2.js#h:remarkMath:default',
    'ca129fbf3-HnH_eJBK.js#at:rehypeKatexGuardedAndChecked:rehypeKatexGuardedAndChecked',
    'ca129fbf3-HnH_eJBK.js#it:rehypeKatexChecked:rehypeKatexChecked',
  ]);
  // c851b27a8 ki imports "./c6369e48b-jalMQaq2.js" and reads `.default`: the module keeps the chunk's name and alias.
  const remark = manifest.modules.find(m => m.source === 'c6369e48b-jalMQaq2.js');
  assert.equal(remark.target, 'c6369e48b-jalMQaq2.js');
  assert.deepEqual(remark.exports, { h: 'default' });
  assert.deepEqual(provenance.pendingRoots.map(r => `${r.file}#${r.local}:${r.name}`).sort(), [
    'c851b27a8-Chd9-72r.js#Ai:loadLatexPlugins', 'c89efce1a-CleBUUAy.js#Mu:StandardMarkdown', 'cc1aae219-BbSf__8R.js#EP:ChatTextMarkdown',
  ]);
  for (const r of [...provenance.roots, ...provenance.pendingRoots]) {
    assert.equal(r.pinned, true, `${r.file}#${r.local} pinned`);
    const src = official(r.file).toString();
    assert.ok(src.includes(r.local), `${r.file} has ${r.local}`);
  }
  for (const r of provenance.pendingRoots) assert.match(r.blockedBy, /cds-core/);
  assert.deepEqual(provenance.adapters.map(a => [a.original, a.name, a.pinned]), [['shared-0-CnnWnVrT.js#eP', 'reportHandledError', true]]);
  for (const m of manifest.modules) {
    assert.equal(m.sourceSha256, sha(official(path.basename(m.source))), `${m.target} source bytes`);
    assert.equal(m.sha256, sha(local(`${OUT}/${m.target}`)), `${m.target} bytes`);
    for (const i of m.imports ?? []) assert.doesNotMatch(i.from, /view-tabs|\/chat-renderer\/|\/chat-markdown\/|\/r3b-transcript\/|\/working-line\//, `${m.target} imports ${i.from}`);
  }
});

test('the KaTeX bundle and the bundler runtime are the official bytes, copied verbatim', () => {
  for (const file of ['cf1a02a1a-A3V2xzb_.js', 'rolldown-runtime-C3OYiQ02.js']) assert.equal(sha(local(`${OUT}/${file}`)), sha(official(file)), file);
  const manifest = JSON.parse(local(`${OUT}/manifest.json`));
  assert.deepEqual(manifest.modules.filter(m => m.verbatim).map(m => m.target).sort(), ['cf1a02a1a-A3V2xzb_.js', 'rolldown-runtime-C3OYiQ02.js']);
});

test('no emitted module assigns a binding it imports (read-only ES imports; state stays with its owner)', () => {
  for (const f of fs.readdirSync(path.join(app, OUT)).filter(f => /\.m?js$/.test(f))) {
    const ast = babel.babelParse(local(`${OUT}/${f}`).toString(), f, true);
    const imported = new Set(ast.program.body.filter(n => n.type === 'ImportDeclaration').flatMap(n => n.specifiers.map(s => s.local.name)));
    babel.traverse(ast, { 'AssignmentExpression|UpdateExpression'(p) {
      const t = p.node.type === 'AssignmentExpression' ? p.node.left : p.node.argument;
      assert.ok(!(t.type === 'Identifier' && imported.has(t.name) && p.scope.getBinding(t.name)?.kind === 'module'), `${f} writes imported ${t.name}`);
    } });
  }
});

test('the adapter module answers shared-0 eP without telemetry and imports no generated code', () => {
  const text = local('src/source-chat-renderer-v4-adapters.jsx').toString();
  assert.doesNotMatch(text, /from ["']\.\/generated\//);
  assert.match(text, /^export function reportHandledError\(\) \{\}$/m);
  const ca = local(`${OUT}/ca129fbf3-HnH_eJBK.js`).toString();
  assert.match(ca, /import \{ reportHandledError as r \} from "\.\.\/\.\.\/source-chat-renderer-v4-adapters\.jsx";/);
  assert.match(ca, /r\("katex_refuse_failed", nt\(e\), \{ recovered: !0 \}\)/);
});

test('the 3.6556.2 renderer graph is still on 3.6556.2 and matches its own manifest', () => {
  const manifest = JSON.parse(local('src/generated/chat-renderer/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  for (const m of manifest.modules) assert.equal(sha(local(`src/generated/chat-renderer/${m.target}`)), m.sha256, m.target);
});

const math = (value, display) => ({ type: 'element', tagName: display ? 'pre' : 'p', properties: {}, children: [
  { type: 'element', tagName: 'code', properties: { className: ['language-math', display ? 'math-display' : 'math-inline'] }, children: [{ type: 'text', value }] }] });
const find = (node, pred, out = []) => { if (pred(node)) out.push(node); for (const c of node.children ?? []) find(c, pred, out); return out; };
const classes = n => n.properties?.className ?? [];

test('rehypeKatexChecked renders inline and display math with the official KaTeX 0.16.47 and reports a bad formula as a file message', async () => {
  const katex = await server.ssrLoadModule(`/${OUT}/cf1a02a1a-A3V2xzb_.js`);
  assert.equal(katex.t.version, '0.16.47');
  const tree = { type: 'root', children: [math('x^2+\\frac{1}{2}', false), math('\\int_0^1 x\\,dx', true), math('\\frac{1}{', false)] };
  const messages = [];
  const file = { message: (reason, options) => { messages.push({ reason, options }); return {}; }, value: '' };
  generated.rehypeKatexChecked({})(tree, file);
  const rendered = find(tree, n => classes(n).includes('katex'));
  assert.ok(rendered.length >= 2, 'inline and display formulas rendered');
  assert.equal(find(tree, n => classes(n).includes('katex-display')).length, 1);
  assert.ok(find(tree, n => n.tagName === 'annotation' && n.children?.[0]?.value === 'x^2+\\frac{1}{2}').length === 1);
  assert.ok(find(tree, n => n.tagName === 'mfrac').length >= 1);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].reason, 'Could not render math with KaTeX');
  assert.equal(messages[0].options.source, 'rehype-katex');
});

// c851b27a8 Ai calls it as `n.rehypeKatexGuardedAndChecked(t => $r(t, e, i))`: the guard gets the plugin module (Ze, its
// `default` the rehype-katex attacher) and returns the guarded attacher, or nothing when the export is missing.
test('rehypeKatexGuardedAndChecked hands the guard the plugin module and wraps the attacher it returns', () => {
  let seen = null;
  const wrapped = generated.rehypeKatexGuardedAndChecked(module => { seen = module; return module.default; });
  assert.equal(typeof seen?.default, 'function');
  assert.equal(typeof wrapped, 'function');
  const tree = { type: 'root', children: [math('a+b', false)] };
  wrapped({})(tree, { message() { return {}; }, value: '' });
  assert.equal(find(tree, n => classes(n).includes('katex')).length, 1);
  assert.equal(generated.rehypeKatexGuardedAndChecked(() => null), null);
});

// c851b27a8 Ai hands it to the processor as `remarkMath: r.default`: the attacher registers the micromark math syntax and
// the mdast handlers, so `$…$` and `$$` fences parse to inlineMath / math nodes carrying the hast hints rehype-katex reads.
test('remarkMath (official c6369e48b) parses inline and display math through unified / remark-parse', async () => {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const processor = unified().use(remarkParse).use(generated.remarkMath).freeze();
  const data = processor.data();
  assert.equal(data.micromarkExtensions.length, 1);
  assert.ok(data.micromarkExtensions[0].flow[36] && data.micromarkExtensions[0].text[36], 'math syntax on "$"');
  const tree = processor.parse('Euler: $e^{i\\pi}+1=0$ and $$\\frac{1}{2}$$\n\n$$\n\\int_0^1 x\\,dx\n$$\n');
  const inline = find(tree, n => n.type === 'inlineMath');
  const display = find(tree, n => n.type === 'math');
  assert.deepEqual(inline.map(n => n.value), ['e^{i\\pi}+1=0', '\\frac{1}{2}']);
  assert.deepEqual(display.map(n => n.value), ['\\int_0^1 x\\,dx']);
  assert.deepEqual(inline[0].data.hProperties.className, ['language-math', 'math-inline']);
  assert.equal(display[0].data.hName, 'pre');
  assert.deepEqual(display[0].data.hChildren[0].properties.className, ['language-math', 'math-display']);
  // A lone dollar amount is text, not math (singleDollarTextMath only pairs balanced runs).
  assert.equal(find(processor.parse('It costs $5 today.'), n => n.type === 'inlineMath').length, 0);
});
