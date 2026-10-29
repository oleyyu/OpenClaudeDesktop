import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

// w13-chatui-markdown-code (research/w13-chatui.md chatui-C11/C12): a Chat answer through the 3.6556.2 prose root and
// code block (scripts/extract-chat-markdown.mjs → src/generated/chat-markdown, src/source-chat-markdown.jsx). Source only:
// generator --check, official text, SSR markup; no browser, no network, the official chunks are read, never run.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const directory = path.join(app, 'src/generated/chat-markdown');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', language: 'en-US' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, i18n, chat;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  chat = await server.ssrLoadModule('/src/source-chat-markdown.jsx');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });

const render = (text) => renderToStaticMarkup(h(chat.SourceChatMarkdown, { text }));
const FENCE = '```python\nprint(1)\n```';

test('generator: --check passes and the manifest pins the 3.6556.2 originals, adapters and links', async () => {
  const { extractChatMarkdown } = await import('../scripts/extract-chat-markdown.mjs');
  await extractChatMarkdown({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source]), [
    ['invariant.mjs', 'vendor-all-0-DXM0MGjZ.js'], ['code-block-support.mjs', 'shared-4-DUB1Oi0O.js'],
    ['chat-prose.mjs', 'shared-10-D6FXWZph.js'], ['code-block.mjs', 'shared-10-D6FXWZph.js']]);
  assert.deepEqual(fs.readdirSync(directory).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    assert.equal(module.sourceSha256, sha(fs.readFileSync(path.join(v1, module.source))), module.source);
    assert.equal(module.sha256, sha(fs.readFileSync(path.join(directory, module.target))), module.target);
  }
  // w13-close-chat-renderer: bv / xv (the code block's streaming context) and shared-4 RC are exported for the chat-renderer graph.
  assert.deepEqual(manifest.modules.find(m => m.target === 'code-block.mjs').exports, { Ab: 'ChatMarkdownComponents', Eb: 'ChatCodeBlock', Bu: 'useCodeBlockTheme',
    bv: 'CodeBlockStreamingContext', xv: 'useCodeBlockStreaming' });
  assert.equal(manifest.modules.find(m => m.target === 'code-block-support.mjs').exports.RC, 'antCitationDirective');
  assert.deepEqual(manifest.modules.find(m => m.target === 'chat-prose.mjs').exports, { lx: 'ChatProse', rx: 'Prose' });
  assert.deepEqual(manifest.adapters.map(a => a.original), ['shared-10-D6FXWZph.js#Cb', 'shared-10-D6FXWZph.js#lf', 'shared-10-D6FXWZph.js#xb',
    'shared-25-DOWZRSlq.js#OH', 'shared-25-DOWZRSlq.js#zs', 'shared-frame-6jtSkIit.js#Ga']);
  assert.deepEqual(manifest.linked, [{ original: 'shared-1-BJhqMmkf.js#CR', graph: 'working-line', target: 'clipboard.mjs', name: 'CR' }]);
  assert.deepEqual(manifest.sharedAdapters.map(a => [a.original, a.name]).sort(), [['shared-25-DOWZRSlq.js#fs', 'useFeatureIsOn'],
    ['vendor-intl-DYfox5Co.js#Gt', 'FormattedMessage'], ['vendor-intl-DYfox5Co.js#q', 'useIntl']]);
  // The prose root is not sliced twice: code-block.mjs reaches no Prose binding.
  assert.ok(!manifest.modules.find(m => m.target === 'code-block.mjs').bindings.some(b => ['lx', 'rx', 'tx'].includes(b.name)));
  // Generated output imports view-tabs only by semantic name (R6) and never through the facade (E2).
  for (const module of manifest.modules) {
    const text = fs.readFileSync(path.join(directory, module.target), 'utf8');
    assert.doesNotMatch(text, /view-tabs\/index\.js/);
    for (const m of text.matchAll(/import \{([^}]*)\} from "\.\.\/view-tabs\/[^"]+";/g))
      for (const spec of m[1].split(',').map(s => s.trim()).filter(Boolean)) assert.ok(/^[A-Za-z]\w{3,} as /.test(spec) || /^\w{4,}$/.test(spec), spec);
  }
});

test('official evidence: ChatMarkdown draws its prose root, code block and inline code from shared-10', () => {
  const markdown = official('c18fe02d2-BCSL3uV9.js');
  for (const s of ['Ua as ChatMarkdown', 't==="detail"?r(W,{ref:o,size:"inherit",children:i}):r(G,{ref:o,children:i})',
    'return e===""?r("pre",{dir:"ltr",children:r(U.code,{variant:"plain",className:n})}):r(U.pre,{className:n,children:e})',
    'let n=t?`language-${t}`:void 0;', 'gn as U', 'sn as G']) assert.ok(markdown.includes(s), s);
  const prose = official('c89efce1a-C_nlrFif.js');
  for (const s of ['inlineCode:Qs(({code:e})=>r(Ds,{children:e}))', 'hs=e=>e==="prose"?"plain":"chip"', 'gn as Re']) assert.ok(prose.includes(s), s);
  const shared = official('shared-10-D6FXWZph.js');
  for (const s of ['ax="--font-claude-response"', 'lx as sn', 'Ab as gn', 'pre:Eb', '"data-testid":"code-block-copy"', '"CodeBlock children must be a string"',
    '"code-block__code !my-0 !rounded-[var(--msg-block-radius,0.5rem)] !text-sm !leading-relaxed p-3.5"'])
    assert.ok(shared.includes(s), s);
});

test('SSR: the answer root is the Chat prose (Prose with the font-claude-response body font)', () => {
  // w13-close-chat-renderer: the answer is c89efce1a rc (src/generated/chat-renderer) inside the host's click boundary.
  const html = render('Hello **world**');
  assert.match(html, /^<div class="contents"><div data-cds="Prose"/);
  const root = html.match(/<div data-cds="Prose"[^>]*>/)?.[0] ?? '';
  assert.match(root, /data-cds="Prose"/);
  assert.match(root, /class="prose"/);
  // tx ex(): a custom body font also sets the heading display font to the heading variable.
  assert.match(root, /style="--_prose-font-body:var\(--font-claude-response, var\(--cds-font-voice\)\);--_prose-font-heading-display:var\(--_prose-font-heading\)"/);
  assert.match(html, /<p dir="ltr">Hello <strong>world<\/strong><\/p>/);
});

test('SSR: a fence is shared-10 Eb with its language caption, copy button and code-block__code body', () => {
  const html = render(FENCE);
  const frame = html.match(/<div [^>]*class="relative group\/copy[^"]*"[^>]*>/)?.[0] ?? '';
  assert.match(frame, /dir="ltr"/);
  assert.match(frame, /role="group"/);
  assert.match(frame, /aria-label="python code"/);
  assert.match(frame, /tabindex="0"/);
  assert.match(frame, /class="relative group\/copy bg-bg-000\/50 border-0\.5 border-border-400 rounded-\[var\(--msg-block-radius,0\.5rem\)\] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-100"/);
  assert.match(html, /<div class="text-secondary font-small p-3\.5 pb-0">python<\/div>/);
  assert.match(html, /class="sticky opacity-0 group-hover\/copy:opacity-100 group-focus-within\/copy:opacity-100 pointer-coarse:opacity-100 \[@media\(hover:none\)\]:opacity-100 top-2 py-2 h-12 w-0 float-right"/);
  const copy = html.match(/<button [^>]*data-testid="code-block-copy"[^>]*>/)?.[0] ?? '';
  assert.match(copy, /aria-label="Copy to clipboard"/);
  assert.match(copy, /data-cds="Button"/);
  assert.match(html, /<span role="status" class="sr-only"><\/span>/);
  assert.match(html, /<div class="overflow-x-auto"><pre class="code-block__code !my-0 !rounded-\[var\(--msg-block-radius,0\.5rem\)\] !text-sm !leading-relaxed p-3\.5"[^>]*><code class="language-python" style="[^"]*white-space:pre">print\(1\)<\/code><\/pre><\/div>/);
  // Bu's light code rule (Ru) colours the plain text until the host's shiki tokens arrive.
  assert.match(html, /<code class="language-python" style="color:hsl\(220, 20%, 10%\);background:transparent;font-family:var\(--font-mono\);white-space:pre">/);
  // No Code-transcript fence markup in a Chat answer.
  assert.doesNotMatch(html, /scb-block|scb-copy|data-code-text/);
});

test('SSR: a fence without a language wraps long lines and has no caption; an empty fence is a bare plain code', () => {
  const plain = render('```\nlong line\n```');
  assert.match(plain, /aria-label="Code"/);
  assert.doesNotMatch(plain, /text-secondary font-small p-3\.5 pb-0/);
  assert.match(plain, /<pre class="code-block__code [^"]*" style="color:hsl\(220, 20%, 10%\);background:transparent;font-family:var\(--font-mono\)"><code style="color:hsl\(220, 20%, 10%\);background:transparent;font-family:var\(--font-mono\);white-space:pre-wrap">long line<\/code><\/pre>/);
  const empty = render('```js\n```');
  assert.match(empty, /<pre dir="ltr"><code dir="ltr" class="language-js"><\/code><\/pre>/);
  assert.doesNotMatch(empty, /code-block-copy/);
});

test('SSR: inline code is Ab.code in its prose ("plain") variant, without the chip classes', () => {
  const html = render('Run `npm test` now');
  assert.match(html, /<code dir="ltr">npm test<\/code>/);
  assert.doesNotMatch(html, /bg-text-200\/5 border border-0\.5 border-border-300 text-danger-000/);
});

test('SSR: links are c82d645d5 J (an external link asks before it opens; tests/w13-chat-renderer.test.mjs covers the click)', () => {
  const html = render('[docs](https://example.com/a)');
  assert.match(html, /<a class="underline" href="https:\/\/example\.com\/a">docs<\/a>/);
});

test('zh-CN: the code block copy reads in Chinese', () => {
  i18n.setLocale('zh-CN');
  try {
    const html = render(FENCE);
    assert.match(html, /aria-label="python 代码"/);
    assert.match(html, /aria-label="复制到剪贴板" data-testid="code-block-copy"/);
    assert.equal(i18n.t('Syntax highlighting has been disabled due to code size.'), '代码过大，已停用语法高亮。');
    assert.equal(i18n.t('Only the beginning is shown: This text is too large to display in full.'), '仅显示开头部分：文本过大，无法完整显示。');
  } finally { i18n.setLocale('en-US'); }
});

test('wiring: the transcript marks Chat rows for ChatMarkdown; Code rows keep their own Markdown', () => {
  const transcript = local('src/source-transcript.jsx');
  assert.match(transcript, /import \{ ChatMarkdownSurface \} from "\.\/source-chat-markdown\.jsx";/);
  assert.match(transcript, /const openChatLink = useCallback\(\(href\) => actions\.current\?\.onOpenLink\?\.\(href\), \[\]\);/);
  assert.match(transcript, /<ChatMarkdownSurface\.Provider value=\{messageActions\?\.surface === "chat" \? openChatLink : null\}>\{children\}<\/ChatMarkdownSurface\.Provider><\/TranscriptRowsScope>/);
  let seen;
  const Probe = () => { seen = chat.useChatMarkdownSurface(); return null; };
  renderToStaticMarkup(h(Probe));
  assert.equal(seen, null);
  // ChatSurfaceAnswer: the Code fallback outside Chat, ChatMarkdown (with the transcript's link opener) inside it.
  const fallback = h('div', { 'data-code-markdown': '' }, 'code');
  assert.equal(renderToStaticMarkup(h(chat.ChatSurfaceAnswer, { text: 'Hi', fallback })), '<div data-code-markdown="">code</div>');
  const opened = [];
  const inChat = renderToStaticMarkup(h(chat.ChatMarkdownSurface.Provider, { value: href => opened.push(href) },
    h(chat.ChatSurfaceAnswer, { text: 'Hi', fallback })));
  assert.match(inChat, /^<div class="contents"><div data-cds="Prose" class="prose"[^>]*><div class="[^"]*standard-markdown"><p dir="ltr">Hi<\/p><\/div><\/div><\/div>$/);
  // The assistant row (source-session.jsx SourceMessage, agentMessage/plan branch) answers through ChatSurfaceAnswer; the
  // Chat answer and the Code fallback read the same text, localized by localizeBridgeNote once the row has settled.
  const session = local('src/source-session.jsx');
  assert.match(session, /import \{ ChatSurfaceAnswer \} from "\.\/source-chat-markdown\.jsx";/);
  assert.match(session, /const answerText = isStreaming \? item\.text \|\| "" : localizeBridgeNote\(item\.text \|\| ""\);/);
  assert.match(session, /<ChatSurfaceAnswer text=\{answerText\} fallback=\{<SourceMarkdown text=\{answerText\} isStreaming=\{isStreaming\} paceReveal=\{item\.type === "agentMessage"\}/);
  assert.equal(session.match(/<SourceMarkdown text=\{[^}]*\}/g)?.filter(m => /item\.text|answerText/.test(m)).length, 1);
  // E41: the chat-graph host file takes concrete generated files, never the view-tabs facade.
  assert.doesNotMatch(local('src/source-chat-markdown.jsx'), /view-tabs\/index\.js/);
  assert.doesNotMatch(local('src/source-chat-markdown-adapters.jsx'), /from '\.\/generated\//);
});
