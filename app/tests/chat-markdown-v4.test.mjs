// Region batch 2b (chat-markdown, region-plan cutover.oldConsumersAtGeneration = chat-renderer, code-transcript): the
// isolated 4.16336.0 graph of the Chat answer's prose root and code block (src/generated/chat-markdown-v4,
// scripts/extract-chat-markdown.mjs version 4.16336.0, sharedGraph cds-core). The 3.6556.2 graph
// (src/generated/chat-markdown) keeps serving src/source-chat-markdown.jsx and the 3.6556.2 graphs that link it by
// original identity until the cutover; tests/w13-chat-markdown and w13-chat-renderer keep pinning it. Official code is
// never executed: the generated modules are imported through Vite SSR, the chunks only read as text.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-4.16336.0.mjs';
import { contractVersions, contract4, extractChatMarkdown, extractContract } from '../scripts/extract-chat-markdown.mjs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';

const app = path.resolve(import.meta.dirname, '..');
const out = path.join(app, 'src/generated/chat-markdown-v4');
const legacyOut = path.join(app, 'src/generated/chat-markdown');
const coreDir = path.join(app, 'src/generated/cds-core');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const chunk = name => readFileSync(path.join(official.ionSource, name), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const core = JSON.parse(readFileSync(path.join(coreDir, 'manifest.json'), 'utf8'));
const mod = target => manifest.modules.find(m => m.target === target);
const exportTable = name => new Map([...chunk(name).matchAll(/export\{([^}]*)\}/g)].at(-1)[1].split(',').map(pair => pair.split(' as ')).map(([local, alias]) => [alias ?? local, local]));
const rawDeclarations = new Map();
function rawDeclaration(file, name) {
  if (!rawDeclarations.has(file)) {
    const text = chunk(file);
    rawDeclarations.set(file, { text, nodes: new Map(parsers.babel.parse(text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
      : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : []))) });
  }
  const { text, nodes } = rawDeclarations.get(file), node = nodes.get(name);
  assert.ok(node, `${file}: no top-level declaration ${name}`);
  return text.slice(node.start, node.end);
}
const h = React.createElement;

// cds-wave8 (c): shared-25 reads document.cookie at load (shared-0 CQ / Wo, the official consent-cookie read); stub contract only.
globalThis.document ??= { cookie: '', body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', language: 'en-US' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

// The host adapters and cds-core are .jsx / React graphs: Vite SSR, one module graph.
const server = await createServer({ configFile: false, root: app, plugins: [react()],
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server.close(); });
const load = target => server.ssrLoadModule(`/src/generated/chat-markdown-v4/${target}`);
const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
i18n.setLocale('en-US');
const prose = await load('chat-prose.mjs');
const block = await load('code-block.mjs');
const support = await load('code-block-support.mjs');
const { invariant } = await load('invariant.mjs');
const C = block.ChatMarkdownComponents;
const CITATION = ':antCitation[]{citations="0b7f2a52-1b4f-4b47-9e1f-3a7c2f1d0e9a"}';

test('both contracts regenerate byte for byte; the 3.6556.2 graph and its consumers stay on 3.6556.2', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', '4.16336.0']);
  for (const version of contractVersions) await extractChatMarkdown({ check: true, version });
  const legacy = JSON.parse(readFileSync(path.join(legacyOut, 'manifest.json'), 'utf8'));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  assert.deepEqual(legacy.modules.map(m => m.target), ['invariant.mjs', 'code-block-support.mjs', 'chat-prose.mjs', 'code-block.mjs']);
  // chat-renderer and code-transcript (3.6556.2) still link the legacy folder, never the isolated one.
  for (const area of ['chat-renderer', 'code-transcript']) {
    const dir = path.join(app, 'src/generated', area);
    const texts = readdirSync(dir).filter(f => f.endsWith('.mjs')).map(f => readFileSync(path.join(dir, f), 'utf8')).join('\n');
    assert.match(texts, /from "\.\.\/chat-markdown\//, area);
    assert.doesNotMatch(texts, /chat-markdown-v4/, area);
  }
  assert.match(readFileSync(path.join(app, 'src/source-chat-markdown.jsx'), 'utf8'), /from '\.\/generated\/chat-markdown\/code-block\.mjs'/);

  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.isolatedGraph, { legacyOutput: 'src/generated/chat-markdown', productionSwitchNotBeforeBatch: 10,
    heldBy: ['chat-renderer', 'code-transcript', 'src/source-chat-markdown.jsx'],
    dependsOn: { 'working-line': 'no 4.16336.0 graph at generation; shared-1 J$ cut here (clipboard.mjs)' } });
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source]), [
    ['compiler-helpers.mjs', official.sharedFrame], ['cds-parts.mjs', official.sharedFrame], ['invariant.mjs', 'vendor-all-0-uUCo-eCX.js'],
    ['code-block-support.mjs', 'shared-31-C9BqSSuD.js'], ['stable-callback.mjs', 'shared-0-CnnWnVrT.js'], ['clipboard.mjs', 'shared-1-D1bGaTaN.js'],
    ['chat-prose.mjs', 'shared-11-CNsu0Zu8.js'], ['code-block.mjs', 'shared-11-CNsu0Zu8.js']]);
  assert.deepEqual(readdirSync(out).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.sourceSha256, sha(readFileSync(path.join(official.ionSource, m.source))), m.source);
    const text = readFileSync(path.join(out, m.target), 'utf8');
    assert.equal(m.sha256, sha(text), m.target);
    assert.match(text, /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /);
    // Only React, cds-core, the named host adapters and modules of this graph: never a 3.6556.2 graph.
    for (const [, from] of text.matchAll(/^import [^;]*? from "([^"]+)";$/gms))
      assert.ok(/^(react|react\/jsx-runtime|react\/compiler-runtime)$|^\.\/[\w-]+\.mjs$|^\.\.\/cds-core\/[\w.-]+\.mjs$/.test(from)
        || ['../../source-chat-markdown-adapters.jsx', '../../source-routines-shared-adapters.jsx', '../../cds-core-adapter.mjs'].includes(from), `${m.target}: ${from}`);
  }
});

test('each root is the 4.16336.0 binding its chunk exports under the proved alias, or the code block (private)', () => {
  const roots = Object.fromEntries(manifest.modules.filter(m => m.roots).map(m => [m.target, m.roots]));
  assert.deepEqual(roots, {
    'cds-parts.mjs': { Ca: 'Nf', uo: 'If' },
    'invariant.mjs': { Ht: 'r' },
    'code-block-support.mjs': { lv: 'Ur', Kw: 'Et', Ww: 'Tt', Gw: 'wt', __: 'Wr' },
    'stable-callback.mjs': { Se: 'NT' },
    'clipboard.mjs': { J$: 'Ei' },
    'chat-prose.mjs': { X_: 'on', W_: 'cn' },
    'code-block.mjs': { Qg: 'vn', Jg: null, Ns: '$n', Dm: 'Cn' },
  });
  for (const m of manifest.modules.filter(x => x.roots)) {
    const table = exportTable(m.source);
    for (const [local, alias] of Object.entries(m.roots)) {
      if (alias === null) assert.ok(![...table.values()].includes(local), `${m.source}#${local} is private`);
      else assert.equal(table.get(alias), local, `${m.source} exports ${alias} as ${local}`);
    }
  }
  // The semantic exports keep the 3.6556.2 names (chat-renderer / code-transcript link them by name at the cutover).
  assert.deepEqual(mod('code-block.mjs').exports, { Qg: 'ChatMarkdownComponents', Jg: 'ChatCodeBlock', Ns: 'useCodeBlockTheme', Dm: 'useCodeBlockStreaming',
    Em: 'CodeBlockStreamingContext', Ms: 'CodeBlockModeFallbackContext' });
  assert.deepEqual(mod('chat-prose.mjs').exports, { X_: 'ChatProse', W_: 'Prose' });
  assert.deepEqual(mod('code-block-support.mjs').exports, { lv: 'stripCitationDirectives', Kw: 'CodeBlockFindOmittedContext', Ww: 'CodeBlockHeaderActionsContext',
    Gw: 'CodeBlockCopyCallbackContext', __: 'antCitationDirective' });
  // Official evidence: Qg's `pre` is the code block, which reads the three shared-31 contexts and the shared-1 copy hook.
  const shared11 = chunk('shared-11-CNsu0Zu8.js');
  for (const s of ['pre:Jg', '"CodeBlock children must be a string"', 'Kg=y(function(e){', '"data-testid":"code-block-copy"', 'X_ as on', 'Qg as vn', 'Ns as $n',
    'Ms=w(`light`)', 'Em=w(!1)', 'Et as ht', 'Tt as _t', 'wt as bt', 'Ur as vt', 'Ei as Ge'])
    assert.ok(shared11.includes(s) || shared11.includes(s.replace(/`/g, '"')), s);
});

test('sharedGraph cds-core: linked by publicName, held copies equal, compiler helpers proved, no module state cut twice (D46 = 0)', () => {
  const held = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name}`, b.sha256])));
  const published = new Map(Object.entries(core.publicNames).map(([name, e]) => [`${e.file}#${e.local}`, { name, ...e }]));
  const linked = [];
  for (const m of manifest.modules) for (const i of m.imports.filter(x => x.kind === 'shared-graph')) {
    const [file] = i.via.split(/[:#]/), entry = published.get(`${file}#${i.original}`);
    assert.ok(entry, `${m.target}: ${i.via} is a cds-core publicName`);
    assert.equal(i.name, entry.exportName);
    assert.equal(i.publicName, entry.name);
    assert.equal(i.from, `../cds-core/${entry.target}`);
    assert.equal(i.linkedSha256, held.get(`${file}#${i.original}`));
    assert.equal(i.linkedSha256, sha(rawDeclaration(file, i.original)));
    linked.push(entry.name);
  }
  assert.deepEqual([...new Set(linked)].sort(), ['CdsBanner', 'CdsButton', 'CdsIcon', 'CdsOwnerWindowContext', 'cdsClassNames', 'clsx', 'useCdsModeSnapshot',
    'useDirection', 'useEventCallback'].sort());
  // Held by cds-core without a publicName: only the pure compiler helpers and cdsSizeAttributes, each hash-equal.
  const proved = official.assertCompilerHelpers(chunk(official.sharedFrame));
  assert.deepEqual(mod('compiler-helpers.mjs').bindings.map(b => b.name).sort(), Object.keys(mod('compiler-helpers.mjs').exports).sort());
  for (const [local, name] of Object.entries(mod('compiler-helpers.mjs').exports)) assert.equal(proved[name].local, local);
  for (const m of manifest.modules) for (const name of m.heldByCdsCore) assert.equal(held.get(`${m.source}#${name}`), sha(rawDeclaration(m.source, name)), `${m.target}#${name}`);
  assert.deepEqual(mod('cds-parts.mjs').heldByCdsCore, ['Ca']);
  const cut = manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)).filter(key => held.has(key));
  assert.deepEqual(cut.sort(), manifest.modules.flatMap(m => m.heldByCdsCore.map(n => `${m.source}#${n}`)).sort());
  // None of them is module state (a context or a module-level collection): functions, the runtime alias, the sentinel.
  for (const key of cut) {
    const [file, name] = key.split('#'), text = rawDeclaration(file, name);
    assert.ok(/^function /.test(text) || /^J9=[\w$]+$/.test(text) || /^J8=Symbol\.for\("react\.memo_cache_sentinel"\)$/.test(text), `${key}: ${text.slice(0, 60)}`);
  }
  // No dynamic import, no 3.6556.2 view-tabs / working-line / chat-markdown import.
  for (const m of manifest.modules) {
    const text = readFileSync(path.join(out, m.target), 'utf8');
    assert.doesNotMatch(text, /\bimport\(/, m.target);
    assert.doesNotMatch(text, /view-tabs|working-line|"\.\.\/chat-markdown\//, m.target);
  }
});

test('host answers: the replaced originals carry their features and the host files export the answers', () => {
  assert.deepEqual(manifest.hosts.map(x => [x.original, x.from, x.name]), [
    ['shared-11-CNsu0Zu8.js#Gg', '../../source-chat-markdown-adapters.jsx', 'spotlightLanguagesSchema'],
    ['shared-11-CNsu0Zu8.js#Ug', '../../source-chat-markdown-adapters.jsx', 'ChatMermaidDiagram'],
    ['shared-11-CNsu0Zu8.js#rl', '../../source-chat-markdown-adapters.jsx', 'ChatSyntaxHighlighter'],
    ['shared-25-D-aF0gt9.js#IH', '../../source-chat-markdown-adapters.jsx', 'setChatLocalValue'],
    ['shared-25-D-aF0gt9.js#as', '../../source-chat-markdown-adapters.jsx', 'useChatDynamicConfigValue'],
    ['shared-25-D-aF0gt9.js#ko', '../../source-routines-shared-adapters.jsx', 'useFeatureIsOn'],
    ['vendor-intl-BJgYK7RA.js#Gt', '../../cds-core-adapter.mjs', 'HostFormattedMessage'],
    ['vendor-intl-BJgYK7RA.js#q', '../../cds-core-adapter.mjs', 'useHostIntl']]);
  for (const x of manifest.hosts) {
    const text = readFileSync(path.resolve(out, x.from), 'utf8');
    assert.match(text, new RegExp(`^export (?:async )?(?:function|const) ${x.name}\\b`, 'm'), `${x.from} exports ${x.name}`);
    assert.match(x.replacedSha256, /^[0-9a-f]{64}$/);
  }
  // The highlighter, Mermaid diagram and zod schema are not cut: the code block reaches them only as host imports.
  const code = mod('code-block.mjs');
  for (const name of ['rl', 'Ug', 'Gg', 'Nc', 'cs', 'sc']) assert.ok(!code.bindings.some(b => b.name === name), name);
  // shared-11 Jg reads the Mermaid gate and the spotlight config by name (both off / empty without GrowthBook / Statsig).
  const jg = readFileSync(path.join(out, 'code-block.mjs'), 'utf8');
  assert.match(jg, /Fe\("claude_ai_markdown_mermaid_render"\)/);
  assert.match(jg, /Le\(\s*"claude_code_spotlight_code_viewed_signal",\s*"languages",\s*Wg,\s*Gg,?\s*\)/);
});

test('SSR: ChatProse is Prose with the font-claude-response body font', () => {
  const html = renderToStaticMarkup(h(prose.ChatProse, null, h('p', null, 'Hello')));
  assert.match(html, /^<div data-cds="Prose" class="prose[^"]*" style="--_prose-font-body:var\(--font-claude-response, var\(--cds-font-voice\)\);--_prose-font-heading-display:var\(--_prose-font-heading\)"><p>Hello<\/p><\/div>$/);
  assert.equal(typeof prose.Prose.Lead, 'object');
});

test('SSR: a fence is shared-11 Jg: caption, copy button, code-block__code body; CR / citation directives are dropped', () => {
  const html = renderToStaticMarkup(h(C.pre, { className: 'language-python' }, `print(1)\r\n${CITATION}\n`));
  assert.match(html, /^<div role="group" aria-label="python code" tabindex="0" dir="ltr" class="relative group\/copy bg-bg-000\/50 border-0\.5 border-border-400 rounded-\[var\(--msg-block-radius,0\.5rem\)\] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-100">/);
  const copy = html.match(/<button [^>]*data-testid="code-block-copy"[^>]*>/)?.[0] ?? '';
  assert.match(copy, /data-cds="Button"/);
  assert.match(copy, /aria-label="Copy to clipboard"/);
  assert.match(html, /<span role="status" class="sr-only"><\/span>/);
  assert.match(html, /<div class="text-secondary text-caption-regular font-sans p-3\.5 pb-0">python<\/div>/);
  assert.match(html, /<div class="overflow-x-auto"><pre class="code-block__code !my-0 !rounded-\[var\(--msg-block-radius,0\.5rem\)\] !text-sm !leading-relaxed p-3\.5"><code class="language-python" style="white-space:pre">print\(1\)\n<\/code><\/pre><\/div><\/div>$/);
  assert.doesNotMatch(html, /antCitation|data-find-omitted|\r/);
  // No language: no caption, long lines wrap.
  const plain = renderToStaticMarkup(h(C.pre, {}, 'long line'));
  assert.match(plain, /aria-label="Code"/);
  assert.doesNotMatch(plain, /text-caption-regular/);
  assert.match(plain, /<code style="white-space:pre-wrap">long line<\/code>/);
  // Bare (new in 4.16336.0): data-bare, the qg frame and the end-aligned sticky copy.
  const bare = renderToStaticMarkup(h(C.pre, { className: 'language-js', bare: true }, 'x'));
  assert.match(bare, /data-bare="" class="relative group\/copy py-1 \[background:inherit\] forced-colors:border/);
  assert.match(bare, /class="sticky opacity-0 pointer-events-none [^"]*float-end \[background:inherit\]"/);
  assert.match(bare, /<pre class="code-block__code w-max min-w-full pe-14"><code class="language-js !text-primary" style="white-space:pre">x<\/code><\/pre>/);
  // Find-omitted (shared-31 Et) marks the caption.
  const omitted = renderToStaticMarkup(h(support.CodeBlockFindOmittedContext.Provider, { value: true }, h(C.pre, { className: 'language-sh' }, 'ls')));
  assert.match(omitted, /<div class="text-secondary text-caption-regular font-sans p-3\.5 pb-0" data-find-omitted="">sh<\/div>/);
  // Header actions (shared-31 Tt) get the content, a getter and the language.
  let seen;
  const actions = renderToStaticMarkup(h(support.CodeBlockHeaderActionsContext.Provider, { value: arg => { seen = arg; return h('b', null, 'act'); } }, h(C.pre, { className: 'language-sh' }, 'ls')));
  assert.equal(seen.content, 'ls');
  assert.equal(seen.language, 'sh');
  assert.equal(typeof seen.getContent, 'function');
  assert.match(actions, /<b>act<\/b><button [^>]*data-testid="code-block-copy"/);
  // A bare block keeps room for the actions at the end of its body (pe-20 with actions, pe-14 without).
  const bareActions = renderToStaticMarkup(h(support.CodeBlockHeaderActionsContext.Provider, { value: () => null }, h(C.pre, { className: 'language-sh', bare: true }, 'ls')));
  assert.match(bareActions, /<pre class="code-block__code w-max min-w-full pe-20">/);
});

test('SSR: oversize code shows the shared-11 yi notice instead of highlighting', () => {
  const html = renderToStaticMarkup(h(C.pre, { className: 'language-txt' }, 'a'.repeat(204801)));
  assert.match(html, /Syntax highlighting has been disabled due to code size\./);
  assert.doesNotMatch(html, /<code class="language-txt"/);
});

test('SSR: inline code is Qg.code: plain, chip, a math class as a span, other classes dropped', () => {
  assert.equal(renderToStaticMarkup(h(C.code, { variant: 'plain' }, 'npm test')), '<code dir="ltr">npm test</code>');
  assert.equal(renderToStaticMarkup(h(C.code, { className: 'language-js foo' }, 'a')),
    '<code dir="ltr" class="bg-text-200/5 border border-0.5 border-border-300 text-danger-000 whitespace-pre-wrap rounded-[0.4rem] px-1 py-px text-[0.9rem] language-js">a</code>');
  assert.equal(renderToStaticMarkup(h(C.code, { className: 'math-inline' }, 'x^2')), '<span dir="ltr" class="math-inline">x^2</span>');
  assert.equal(renderToStaticMarkup(h(C.code, { variant: 'plain' }, `a${CITATION}b`)), '<code dir="ltr">ab</code>');
});

test('useCodeBlockTheme: the CDS mode store, else the fallback context ("light"); pure helpers', () => {
  const Theme = () => { const t = block.useCodeBlockTheme(); return h('i', null, `${t.mode}:${t.codeStyle['code[class*="language-"]'].color}`); };
  assert.equal(renderToStaticMarkup(h(Theme)), '<i>light:hsl(220, 20%, 10%)</i>');
  assert.equal(renderToStaticMarkup(h(block.CodeBlockModeFallbackContext.Provider, { value: 'dark' }, h(Theme))), '<i>dark:hsl(220, 15%, 93%)</i>');
  const Streaming = () => String(block.useCodeBlockStreaming());
  assert.equal(renderToStaticMarkup(h(block.CodeBlockStreamingContext.Provider, { value: true }, h(Streaming))), 'true');
  assert.equal(support.stripCitationDirectives(`x${CITATION}y`), 'xy');
  assert.equal(support.antCitationDirective, 'antCitation');
  assert.throws(() => invariant(false, 'm'), /^Error: Invariant failed$/);
});

test('zh-CN: the code block reads in Chinese through the host i18n', () => {
  i18n.setLocale('zh-CN');
  try {
    const html = renderToStaticMarkup(h(C.pre, { className: 'language-python' }, 'print(1)'));
    assert.match(html, /aria-label="python 代码"/);
    assert.match(html, /aria-label="复制到剪贴板" data-testid="code-block-copy"/);
  } finally { i18n.setLocale('en-US'); }
});

test('generation stops: a renamed alias, a root that is not unique, a cds-core publicName as a root, cds-core module state without a name (D46)', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'chat-markdown-v4-'));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const variant = (edit, upTo) => {
    const modules = contract4.modules.map(m => edit(m) ?? m);
    return { ...contract4, output: path.join(dir, 'out'), modules: upTo ? modules.slice(0, modules.findIndex(m => m.target === upTo) + 1) : modules };
  };
  await assert.rejects(extractContract(variant(m => (m.target === 'chat-prose.mjs' ? { ...m, aliases: { ...m.aliases, X_: 'cn' } } : null), 'chat-prose.mjs'), { check: false }),
    /chat-prose\.mjs: shared-11-CNsu0Zu8\.js exports cn as W_, not X_/);
  await assert.rejects(extractContract(variant(m => (m.target === 'code-block-support.mjs'
    ? { ...m, features: { ...m.features, Ww: [official.looseFeature('= w(null)')] } } : null), 'code-block-support.mjs'), { check: false }),
  /code-block-support\.mjs: root Ww is not the unique declaration with its features \([^)]*Gw[^)]*\)/);
  await assert.rejects(extractContract(variant(m => (m.target === 'cds-parts.mjs'
    ? { ...m, exports: { ...m.exports, Xu: 'CdsButton' }, aliases: { ...m.aliases, Xu: 'Id' }, features: { ...m.features, Xu: ['"data-cds": "Button"'] } } : null), 'cds-parts.mjs'), { check: false }),
  /root shared-frame-CJdE5Ria\.js#Xu is the cds-core publicName CdsButton; link it instead/);
  await assert.rejects(extractContract(variant(m => (m.target === 'code-block.mjs' ? { ...m, host: { ...m.host, rl: { ...m.host.rl, name: 'NoSuchHighlighter' } } } : null)), { check: false }),
    /source-chat-markdown-adapters\.jsx does not export NoSuchHighlighter/);
  // D46: a module-level WeakMap / Map / Set / WeakSet cds-core holds without a publicName stops generation. Proved on a
  // synthetic cds-core (the real manifest and the real shared-frame module bytes, with that state's publicName removed),
  // so the check keeps running however many states the real cds-core names.
  const shared = official.sharedFrame, table = exportTable(shared), aliasOf = new Map([...table].map(([alias, local]) => [local, alias]));
  const holder = core.modules.find(m => path.basename(m.source) === shared);
  assert.ok(holder, `cds-core holds ${shared}`);
  rawDeclaration(shared, 'J9');
  const isState = name => rawDeclarations.get(shared).nodes.has(name) && /^[\w$]+=new (?:WeakMap|Map|WeakSet|Set)$/.test(rawDeclaration(shared, name));
  const state = holder.bindings.map(b => b.name).find(isState);
  assert.ok(state, `cds-core holds a module-level WeakMap / Map / Set / WeakSet of ${shared}`);
  const fixtures = mkdtempSync(path.join(tmpdir(), 'chat-markdown-v4-d46-'));
  after(() => rmSync(fixtures, { recursive: true, force: true }));
  const synthetic = path.join(fixtures, 'cds-core');
  mkdirSync(synthetic);
  copyFileSync(path.join(coreDir, holder.target), path.join(synthetic, holder.target));
  const publicNames = Object.fromEntries(Object.entries(core.publicNames).filter(([, e]) => e.target === holder.target && !(e.file === shared && e.local === state)));
  writeFileSync(path.join(synthetic, 'manifest.json'), JSON.stringify({ ...core, modules: [holder], publicNames }));
  const area = path.relative(path.join(app, 'src/generated'), synthetic);
  const spec = { target: 'state.mjs', source: shared, exports: { [state]: 'state' }, aliases: { [state]: aliasOf.get(state) ?? null },
    features: { [state]: [`${state} = ${rawDeclaration(shared, state).split('=')[1]}()`] } };
  const escape = text => text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
  await assert.rejects(extractContract({ ...contract4, sharedGraph: area, output: path.join(dir, 'state'), modules: [spec] }, { check: false }),
    new RegExp(`module state ${escape(area)} holds without a semantic name \\(add it to ${escape(area)} publicNames, D46\\): state\\.mjs: ${escape(`${shared}#${state}`)}$`));
  const named = Object.entries(core.publicNames).find(([, e]) => e.file === shared && e.local === state);
  if (named) {
    writeFileSync(path.join(synthetic, 'manifest.json'), JSON.stringify({ ...core, modules: [holder], publicNames: { ...publicNames, [named[0]]: named[1] } }));
    await assert.rejects(extractContract({ ...contract4, sharedGraph: area, output: path.join(dir, 'state'), modules: [spec] }, { check: false }),
      new RegExp(`state\\.mjs: root ${escape(`${shared}#${state}`)} is the cds-core publicName ${escape(named[0])}; link it instead`));
  }
  assert.equal(existsSync(path.join(dir, 'out')) || existsSync(path.join(dir, 'state')), false, 'nothing is written when generation stops');
});
