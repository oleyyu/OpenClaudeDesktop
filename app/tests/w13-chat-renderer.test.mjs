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
import { installKatexMiniDom } from './support/katex-mini-dom.mjs';

// w13-close-chat-renderer (plan-w13-closeout.md E63 / G8; closeout chatui-markdown-code-02/-03, chatui-thinking-search-02):
// the 3.6556.2 Chat answer renderer itself (cc1aae219 OR → c89efce1a rc StandardMarkdown), sliced by
// scripts/extract-chat-renderer.mjs into src/generated/chat-renderer and drawn by src/source-chat-markdown.jsx. Source only:
// generator --check, official text, SSR markup, the KaTeX plugins run in node over a test-only DOM; no browser, no
// network, the official chunks are read, never run.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const directory = path.join(app, 'src/generated/chat-renderer');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', language: 'en-US' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/', origin: 'app://local' }, history: { state: null, replaceState() {} } };

let server, i18n, chat, adapters, restoreDom;
before(async () => {
  restoreDom = installKatexMiniDom();
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  chat = await server.ssrLoadModule('/src/source-chat-markdown.jsx');
  adapters = await server.ssrLoadModule('/src/source-chat-renderer-adapters.jsx');
});
after(async () => { i18n?.setLocale('en-US'); restoreDom?.(); await closeWhenSettled(server); await server?.close(); });

const render = (text, props = {}) => renderToStaticMarkup(h(chat.SourceChatMarkdown, { text, ...props }));

test('generator: --check passes; the manifest roots cc1aae219 OR and c89efce1a rc, pins its adapters and links', async () => {
  const { extractChatRenderer } = await import('../scripts/extract-chat-renderer.mjs');
  await extractChatRenderer({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  const text = manifest.modules.find(m => m.target === 'chat-text.mjs');
  assert.equal(text.source, 'cc1aae219-CeSwM-tp.js');
  assert.deepEqual(text.exports, { OR: 'ChatTextMarkdown' });
  assert.deepEqual(manifest.modules.find(m => m.source === 'c89efce1a-C_nlrFif.js').exports, { rc: 'StandardMarkdown' });
  assert.deepEqual(manifest.modules.find(m => m.source === 'ca129fbf3-CdfQB5sF.js').exports, { at: 'rehypeKatexGuardedAndChecked', it: 'rehypeKatexChecked' });
  assert.deepEqual(manifest.modules.find(m => m.source === 'c6369e48b-Cz3VPKCm.js').exports, { h: 'default' });
  // c18fe02d2 ChatMarkdown (the alluvium engine `mi`) is not a Chat answer's renderer and is not sliced.
  assert.ok(!manifest.modules.some(m => m.source.startsWith('c18fe02d2')));
  assert.deepEqual(fs.readdirSync(directory).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    assert.equal(module.sourceSha256, sha(fs.readFileSync(path.join(v1, module.source))), module.source);
    assert.equal(module.sha256, sha(fs.readFileSync(path.join(directory, module.target))), module.target);
  }
  const adapted = new Map();
  for (const module of manifest.modules) for (const entry of module.imports) if (entry.kind === 'adapter') adapted.set(entry.name, entry.via);
  assert.deepEqual([...adapted.keys()].sort(), ['ChatSourceFavicon', 'FormattedMessage', 'analyticsClient', 'decodeNamedCharacterReference', 'katexApi', 'loadLatexPluginChunks',
    'openChatLinkWindow', 'parseCitationAttributes', 'reportO11yError', 'trackAction', 'useFormatterTelemetry', 'useIntl']);
  // D1: the code block, prose root and streaming context are chat-markdown's; the copy hook working-line's.
  const linked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from));
  assert.ok(linked.some(from => from === '../chat-markdown/code-block.mjs'));
  assert.ok(linked.some(from => from === '../chat-markdown/chat-prose.mjs'));
  // The katex adapter is the version the official chunk inlines.
  const katexVersion = /,ka="([\d.]+)"/.exec(official('cf1a02a1a-A3V2xzb_.js'))?.[1];
  assert.equal(katexVersion, JSON.parse(local('node_modules/katex/package.json')).version);
  // No module touches the DOM at load (decode-named-character-reference's DOM build is the npm package): the graph loads
  // in node SSR without a document.
  for (const module of manifest.modules) assert.doesNotMatch(fs.readFileSync(path.join(directory, module.target), 'utf8'), /^var \w+ = document\./m, module.target);
  // Generated output imports view-tabs only by concrete file (never the facade).
  for (const module of manifest.modules) assert.doesNotMatch(fs.readFileSync(path.join(directory, module.target), 'utf8'), /view-tabs\/index\.js/);
  // Registered for prepare:ui by its verify-gen script.
  assert.match(local('scripts/verify-gen-chat-renderer.mjs'), /extractChatRenderer\(\{ check: true \}\)/);
});

test('official evidence: a Chat text block is OR → rc; c18fe02d2 is loaded only for detail thoughts', () => {
  const content = official('cc1aae219-CeSwM-tp.js');
  for (const s of ['case"text":case"connector_text":', 's as gC', 'OR=M(e=>{let $=J9(21),{text:t,blockCitations:n,className:r,isStreaming:i,mountedTextShown',
    'useStreamingFadeIn:!0,onFirstPaint:g', 'm=s?"progressive-markdown":"standard-markdown"',
    'h(OR,{text:e,blockCitations:n,messageUuid:re,className:m,rootAttributes:g,isStreaming:s,mountedTextShown:Oe,holdBack:_,onOpenArtifact:oe,onLinkClick:J,unlinkHref:ye,headingLevelOffset:1,typography:dC',
    'te=Zw(),V=Yw()']) assert.ok(content.includes(s), s);
  assert.ok(official('c89efce1a-C_nlrFif.js').includes('rc as s'));
  assert.ok(official('c89efce1a-C_nlrFif.js').includes('us="prose"'));
  const transcript = official('ca2ef848d-ChLvq6yZ.js');
  assert.ok(transcript.includes('c(()=>import("./c18fe02d2-BCSL3uV9.js"),__vite__mapDeps([0,1]))'));
  assert.ok(transcript.includes('ne=C===!0&&r!==void 0&&a==="detail"'));
});

test('SSR: the answer is rc in prose typography — Prose root, the blocks grid, standard / progressive class, heading offset 1', () => {
  const html = render('# Title\n\nHello **world**');
  assert.match(html, /^<div class="contents"><div data-cds="Prose" class="prose" style="--_prose-font-body:var\(--font-claude-response, var\(--cds-font-voice\)\);--_prose-font-heading-display:var\(--_prose-font-heading\)">/);
  assert.match(html, /<div class="_blocks_4za3l_47 standard-markdown grid-cols-1 grid \[&amp;_&gt;_\*\]:min-w-0 whitespace-normal break-words print:block standard-markdown">/);
  assert.match(html, /<h2 dir="ltr">Title<\/h2>/);
  assert.match(html, /<p dir="ltr">Hello <strong>world<\/strong><\/p>/);
  assert.match(render('streaming', { isStreaming: true }), /print:block progressive-markdown">/);
});

test('SSR: markdown-code-02 — table frame, swatch inline code, the official link, the image placeholder', () => {
  const table = render('| a | b |\n|---|---|\n| 1 | 2 |');
  assert.match(table, /<div dir="ltr" class="md-table-scroll prose-scroll print:overflow-x-visible"><table><thead><tr><th scope="col">a<\/th>/);
  const swatch = render('Use `#ff0000` here');
  assert.match(swatch, /<code dir="ltr" class="inline-flex items-center h-5"><span class="inline-block w-3 h-3 border-\[0\.5px\] border-border-200 rounded-\[4px\] flex-shrink-0 shadow-sm mr-1 align-middle" style="background-color:#ff0000"><\/span>#ff0000<\/code>/);
  assert.match(render('Run `npm test`'), /<code dir="ltr">npm test<\/code>/);
  // c82d645d5 J: an untrusted external link is an underlined anchor (the click asks first); a relative path is dead text.
  assert.match(render('[docs](https://example.com/a)'), /<a class="underline" href="https:\/\/example\.com\/a">docs<\/a>/);
  assert.match(render('[file](./notes.md)'), /<p dir="ltr">file<\/p>/);
  const image = render('![chart](https://example.com/a.png)');
  assert.match(image, /<button type="button" class="bg-bg-300 border-border-300 font-sans text-text-300 inline-grid h-32 w-40 items-center justify-items-center rounded-xl border p-4">Show Image<\/button>/);
  assert.doesNotMatch(image, /<img/);
  // The code block is chat-markdown's Eb, with its copy button.
  assert.match(render('```python\nprint(1)\n```'), /aria-label="python code"[\s\S]*data-testid="code-block-copy"[\s\S]*<code class="language-python" style="[^"]*white-space:pre">print\(1\)<\/code>/);
});

test('SSR: thinking-search-02 — a citation directive draws the c89efce1a citation pill from blockCitations', () => {
  const citations = [{ uuid: 'c1', url: 'https://example.com/a', title: 'Example A', start_index: 0, end_index: 5, origin_tool_name: 'web_search',
    metadata: { type: 'webpage_metadata', site_name: 'Example', site_domain: 'example.com' } }];
  const html = render('Fact :antCitation[]{citations="c1"} here.', { blockCitations: citations, messageUuid: 'm1' });
  assert.match(html, /<span data-not-prose=""><span class="inline-flex"[^>]*><a href="https:\/\/example\.com\/a" target="_blank" rel="noopener noreferrer" class="group\/tag relative h-\[18px\] rounded-full inline-flex items-center overflow-hidden -translate-y-px cursor-pointer">/);
  assert.match(html, /<span dir="auto" class="text-nowrap text-text-300 font-normal group-hover\/tag:text-text-200 break-all truncate">Example<\/span>/);
  // Untitled when the page has no site name; nothing without the block's citations (the local cores return none).
  const untitled = [{ ...citations[0], metadata: { type: 'webpage_metadata', site_domain: 'example.com' } }];
  assert.match(render('Fact :antCitation[]{citations="c1"}.', { blockCitations: untitled }), />Untitled<\/span>/);
  assert.doesNotMatch(render('Fact :antCitation[]{citations="c1"}.'), /group\/tag/);
});

test('KaTeX: the loader resolves the official plugins over npm katex, and rehype-katex typesets a formula', async () => {
  const latex = await server.ssrLoadModule('/src/generated/chat-renderer/c851b27a8-BxvTOAx3.mjs');
  const markdown = await server.ssrLoadModule('/src/generated/chat-renderer/vendor-markdown-CTRWgQFt.mjs');
  // The font wait (c851b27a8 qr `.then(Hr)`): math on screen asks for it (ei → Gr), the stylesheet settling arms it
  // (the adapter calls Hr → Vr → Br, document.fonts.load of the eight KaTeX faces Fr), and Wr holds the plugins until
  // the fonts load (Ur), so Kr reports `loaded` rather than `plugins_ready_before_page_load`.
  const fontsLoaded = [];
  const saved = { fonts: Object.getOwnPropertyDescriptor(document, 'fonts'), readyState: Object.getOwnPropertyDescriptor(document, 'readyState') };
  Object.defineProperty(document, 'fonts', { configurable: true, value: { load: async (font) => { fontsLoaded.push(font); return [{}]; } } });
  Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' });
  let plugins;
  try {
    latex.requestLatexFontWait(() => true);
    assert.deepEqual(latex.Kr(), { fonts: 'still_waiting' });
    assert.deepEqual(fontsLoaded, [], 'no font load before the stylesheet settled (Rr)');
    plugins = await latex.loadLatexPlugins();
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(document, key, descriptor); else delete document[key];
    }
  }
  assert.deepEqual(fontsLoaded, ['1em KaTeX_Main', 'bold 1em KaTeX_Main', 'italic 1em KaTeX_Main', 'italic 1em KaTeX_Math', '1em KaTeX_AMS',
    '1em KaTeX_Size1', '1em KaTeX_Size2', '1em KaTeX_Size3']);
  assert.equal(latex.Kr().fonts, 'loaded');
  assert.equal(typeof latex.Kr().fonts_wait_ms, 'number');
  assert.match(official('c851b27a8-BxvTOAx3.js'), /\.catch\(e=>\{_r=\{error:e\}\}\)\.then\(Hr\)\]\)\}/);
  assert.match(local('src/source-chat-renderer-adapters.jsx'), /\.catch\(\(\) => undefined\)\.then\(settleKatexStylesheet\)/);
  assert.equal(plugins.status, 'ready');
  assert.equal(typeof plugins.remarkMath, 'function');
  assert.equal(typeof plugins.rehypeKatex, 'function');
  assert.equal(plugins.katex.version, '0.16.47');
  assert.equal(adapters.katexApi, plugins.katex);
  // rc's rehype chain: [rehypeKatex, { errorColor: "inherit", output: "htmlAndMathml", strict: !1 }], [Dt, { skipTabIndex }].
  const processor = markdown.lo().use([[plugins.rehypeKatex, { errorColor: 'inherit', output: 'htmlAndMathml', strict: false }], [latex.m, { skipTabIndex: false }]]);
  const math = { type: 'element', tagName: 'span', properties: { className: ['math', 'math-inline'] }, children: [{ type: 'text', value: 'x^2' }] };
  const tree = processor.runSync({ type: 'root', children: [{ type: 'element', tagName: 'p', properties: {}, children: [math] }] });
  const found = [];
  const walk = node => { if (node.type === 'element') { found.push(node); node.children?.forEach(walk); } else node.children?.forEach(walk); };
  walk(tree);
  const katex = found.find(node => node.tagName === 'span' && [node.properties?.className].flat().includes('katex'));
  assert.ok(katex, 'a .katex span');
  assert.equal(katex.properties.role, 'math');
  assert.equal(katex.properties.dir, 'ltr');
  assert.ok(found.some(node => node.tagName === 'math'), 'MathML output');
  // With the plugins ready, a streaming answer goes through the incremental renderer (shared-10 Fv): new text fades in
  // word by word (shared-styles `_animating_4za3l_10`, data-newtext-seq), the settled answer through the plain path.
  // (the trailing word is held back while it may still grow: Fv holdBack).
  assert.match(render('Hello there', { isStreaming: true }), /<p dir="ltr"><span class="_animating_4za3l_10" data-newtext-seq="0">Hello<\/span><span><\/span><\/p>/);
  assert.match(render('Hello there'), /<p dir="ltr">Hello there<\/p>/);
});

test('adapters: citation attributes, the link opener, no analytics, the favicon fallback', () => {
  assert.deepEqual(adapters.parseCitationAttributes({ citations: 'a,b' }), { citationUuids: ['a', 'b'] });
  assert.deepEqual(adapters.parseCitationAttributes({ citations: 3 }), { citationUuids: [] });
  assert.deepEqual(adapters.parseCitationAttributes(undefined), { citationUuids: [] });
  assert.equal(adapters.openChatLinkWindow(null, 'https://example.com'), false);
  const opened = [];
  const off = adapters.registerChatLinkOpener((url) => opened.push(url));
  assert.equal(adapters.openChatLinkWindow(null, 'https://example.com/x', '_blank', 'noopener,noreferrer'), true);
  off();
  assert.deepEqual(opened, ['https://example.com/x']);
  assert.equal(adapters.openChatLinkWindow(null, 'https://example.com/y'), false);
  assert.equal(adapters.analyticsClient().track({}), undefined);
  assert.match(renderToStaticMarkup(h(adapters.ChatSourceFavicon, { url: 'https://example.com' })),
    /class="text-\[color:var\(--muted-as-secondary,var\(--cds-text-muted\)\)\]"/);
});

test('host: a click the renderer leaves to the browser opens through the transcript; a handled one does not', () => {
  const opened = [];
  const anchor = (href) => ({ closest: (selector) => (selector === 'a[href]' ? { getAttribute: () => href } : null) });
  const click = (href, prevented = false) => { const event = { defaultPrevented: prevented, target: anchor(href), preventDefault() { this.defaultPrevented = true; } };
    chat.openUnhandledAnchor(event, (url) => opened.push(url)); return event.defaultPrevented; };
  assert.equal(click('https://claude.com/docs'), true);
  assert.equal(click('mailto:a@b.c'), true);
  assert.equal(click('https://example.com', true), true);
  assert.equal(click('/settings'), false);
  assert.deepEqual(opened, ['https://claude.com/docs', 'mailto:a@b.c']);
});

test('zh-CN: the renderer reads in Chinese', () => {
  i18n.setLocale('zh-CN');
  try {
    assert.match(render('![chart](https://example.com/a.png)'), />显示图片<\/button>/);
    assert.match(render('```python\nprint(1)\n```'), /aria-label="python 代码"/);
    assert.equal(i18n.t('Google Doc'), 'Google 文档');
  } finally { i18n.setLocale('en-US'); }
});

test('wiring: ChatSurfaceAnswer draws the Chat renderer with the row\'s streaming state; Code rows keep their Markdown', () => {
  const host = local('src/source-chat-markdown.jsx');
  assert.match(host, /import \{ ChatTextMarkdown \} from '\.\/generated\/chat-renderer\/chat-text\.mjs';/);
  assert.doesNotMatch(host, /react-markdown|view-tabs\/index\.js/);
  const fallback = h('div', { 'data-code-markdown': '', isStreaming: true }, 'code');
  assert.equal(renderToStaticMarkup(h(chat.ChatSurfaceAnswer, { text: 'Hi', fallback: h('div', { 'data-code-markdown': '' }, 'code') })), '<div data-code-markdown="">code</div>');
  const inChat = renderToStaticMarkup(h(chat.ChatMarkdownSurface.Provider, { value: () => {} },
    h(chat.ChatSurfaceAnswer, { text: 'Hi', fallback: h(function Fallback() { return null; }, { isStreaming: true }) })));
  // The KaTeX test above loaded the plugins, so rc takes its streaming renderer (shared-10 Fv) for a streaming row.
  assert.match(inChat, /^<div class="contents"><div data-cds="Prose" class="prose"[^>]*><div class="[^"]*progressive-markdown"><p dir="ltr">/);
  assert.ok(fallback);
});
