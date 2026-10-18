// Server rendering of the Preview pane (src/source-preview-pane.jsx) in each state it can paint first.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

let server, P;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  P = await server.ssrLoadModule('/src/source-preview-pane.jsx');
});
after(() => server?.close());

const base = { sessionId: 't1', cwd: '/work', url: '', title: '', loading: false, error: null, hasPage: false, canGoBack: false, canGoForward: false, devtools: false,
  viewport: { preset: 'responsive', width: null, height: null, colorScheme: 'system', setByAgent: false }, hostId: null, servers: [], consoleErrors: 0,
  launch: { exists: false, error: null, problems: [], configs: [], autoVerify: true } };
const render = (state, props = {}) => renderToStaticMarkup(React.createElement(P.SourcePreviewPane, { sessionId: 't1', desktop: null, initialState: state, ...props }));

test('header: Dev servers and Preview settings, the URL field and the navigation group', () => {
  const html = render(base, { onAttachScreenshot: () => {}, onAskAgent: () => {} });
  assert.match(html, /<aside class="source-file-panel detail-panel spv-pane" aria-label="Preview" data-preview-surface="start">/);
  assert.match(html, /aria-label="Preview settings"/);
  assert.match(html, /aria-label="Dev servers"/);
  assert.match(html, /aria-label="Page URL"/);
  assert.match(html, /role="group" aria-label="Navigation"/);
  for (const label of ['Back', 'Forward', 'Reload']) assert.match(html, new RegExp(`aria-label="${label}"`));
  assert.doesNotMatch(html, /cursor:\s*pointer/);
});

test('cf580efe9 Xr: the Dev servers trigger hides with no server to list and no Add server', () => {
  assert.doesNotMatch(render(base), /aria-label="Dev servers"/, 'no launch.json, nothing running, the agent cannot be asked');
  assert.match(render(base), /aria-label="Preview settings"/);
  const configured = { ...base, launch: { ...base.launch, exists: true, configs: [{ name: 'web', port: 5173, url: 'http://localhost:5173', attach: false }] } };
  assert.match(render(configured), /aria-label="Dev servers"/, 'a configured server keeps it');
  assert.match(render(base, { onAskAgent: () => {} }), /aria-label="Dev servers"/, 'Add server keeps it');
});

test('cf580efe9 gr: without a launch.json the start page is the Globe, Browse with, and the Detect dev server link', () => {
  const html = render(base, { onAskAgent: () => {} });
  assert.match(html, /data-preview-start="empty"/);
  assert.match(html, /<div role="status" class="flex h-full w-full items-center justify-center overflow-y-auto p-lg">/);
  assert.match(html, /class="flex w-full max-w-\[420px\] flex-col items-center gap-md text-center"/);
  assert.match(html, /<p class="m-0 max-w-\[36ch\] text-body text-primary">Browse with \S+<\/p>/);
  assert.match(html, /<p class="m-0 max-w-\[44ch\] text-footnote text-muted">Type a URL or ask \S+ to open a site\. \S+ can read, click, and type\.<\/p>/);
  assert.match(html, /<span>Preview your app instead\?<\/span><button type="button" data-cds="Button" data-variant="ghost" data-size="xxs"[^>]*>(?:(?!<\/button>).)*<span class="ssb-content">Detect dev server<\/span><\/button>/);
  assert.doesNotMatch(html, /Ask DeepSeek|Preview your app<|data-variant="primary"[^>]*>Detect/);
  // Si t.length === 0: a launch.json with no configurations is the same start page ("Use this" appends to it); one
  // that doesn't parse keeps the list view with its error.
  const empty = render({ ...base, launch: { ...base.launch, exists: true } }, { onAskAgent: () => {} });
  assert.match(empty, /data-preview-start="empty"/);
  assert.match(empty, /Detect dev server/);
  const broken = render({ ...base, launch: { ...base.launch, exists: true, error: 'Unexpected token' } });
  assert.match(broken, /data-preview-start="servers"/);
  assert.match(broken, /Unexpected token/);
  const noAgent = render(base);
  assert.match(noAgent, /Browse with/);
  assert.doesNotMatch(noAgent, /Preview your app instead\?|Detect dev server/, 'the link needs an agent to ask');
});

// B39 (cf580efe9 Si pn = cf550b864 c): the New session page's browser ("home:<folder>") has no session, so no agent:
// "Browse the web" / "Type a URL to open a site.", no Detect dev server, and Browser tools off doesn't replace it.
test('cf580efe9 Si pn: the New session page browser says Browse the web', () => {
  const landing = { ...base, sessionId: 'home:/work' };
  const html = render(landing, { sessionId: 'home:/work' });
  assert.match(html, /data-preview-start="empty"/);
  assert.match(html, /<p class="m-0 max-w-\[36ch\] text-body text-primary">Browse the web<\/p>/);
  assert.match(html, /<p class="m-0 max-w-\[44ch\] text-footnote text-muted">Type a URL to open a site\.<\/p>/);
  assert.doesNotMatch(html, /Browse with|Detect dev server/);
  assert.match(html, /aria-label="Page URL"/);
  const off = render(landing, { sessionId: 'home:/work', agentUsesPreview: false });
  assert.match(off, /Browse the web/);
  assert.doesNotMatch(off, /data-preview-start="setting-off"/);
  assert.equal(P.isLandingPreview('home:/work'), true);
  assert.equal(P.isLandingPreview('t1'), false);
});

test('cf580efe9 Or setting-off: the preview setting off shows Browser tools are turned off with Turn on', () => {
  const html = render(base, { agentUsesPreview: false, onTurnOnAgentPreview: () => {} });
  assert.match(html, /data-preview-start="setting-off"/);
  assert.match(html, /<div role="status" class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state">/);
  assert.match(html, />Browser tools are turned off</);
  assert.match(html, /They let \S+ start your dev server and open pages here\./);
  assert.match(html, /<button type="button" data-cds="Button" data-variant="secondary"[^>]*>(?:(?!<\/button>).)*<span class="ssb-content">Turn on Browser tools<\/span><\/button>/);
  const configured = { ...base, launch: { ...base.launch, exists: true, configs: [{ name: 'web', port: 5173, url: 'http://localhost:5173', attach: false }] } };
  assert.match(render(configured, { agentUsesPreview: false }), /data-preview-start="setting-off"/);
});

test('cf580efe9 fr / dr: detected servers, a blocked one, the save error and Back to browsing', () => {
  const candidates = [
    { name: 'dev', runtimeExecutable: 'pnpm', runtimeArgs: ['run', 'dev'], port: 5173, framework: 'vite', validation: { status: 'ok' } },
    { name: 'start', runtimeExecutable: 'bun', runtimeArgs: ['run', 'start'], port: 3000, framework: 'unknown', validation: { status: 'blocked', reason: 'runner-not-allowed' } },
  ];
  const html = renderToStaticMarkup(React.createElement(P.PreviewServerDetection, { candidates, busy: false, addError: 'name-exists', onUse() {}, onBack() {} }));
  assert.match(html, /Dev server detected\. This command runs in your shell when the preview starts\./);
  assert.match(html, /class="flex w-full max-w-\[420px\] flex-col gap-1\.25"/);
  assert.match(html, /<div class="text-footnote text-muted">Vite · port 5173<\/div><code class="block break-words text-code text-primary select-all">pnpm run dev<\/code>/);
  assert.match(html, /<div class="text-footnote text-muted">port 3000<\/div><code class="block truncate text-code text-primary">bun run start<\/code><div class="mt-\[2px\] text-footnote text-danger">Runner isn’t a recognized package manager<\/div>/);
  assert.equal(html.match(/>Use this</g)?.length, 1, 'only the usable candidate has Use this');
  assert.match(html, /<p role="alert" class="text-footnote text-danger">A server with this name already exists in \.claude\/launch\.json\.<\/p>/);
  assert.match(html, /Your choice is saved to \.claude\/launch\.json in this project\./);
  assert.match(html, /<button type="button" class="group inline-flex items-center gap-0\.75 border-0 bg-transparent p-0 text-footnote text-muted">.*Back to browsing<\/span><\/button>/);
  const busy = renderToStaticMarkup(React.createElement(P.PreviewServerDetection, { candidates, busy: true, addError: null, onUse() {}, onBack() {} }));
  assert.match(busy, /<button disabled="" type="button" data-cds="Button" data-variant="secondary"[^>]*>(?:(?!<\/button>).)*<span class="ssb-content">Use this<\/span><\/button>/);
  assert.doesNotMatch(busy, /role="alert"/);
  const prompt = renderToStaticMarkup(React.createElement(P.PreviewStartPrompt, { onSetUp() {}, detectionActive: true, detection: 'DETECTION' }));
  assert.doesNotMatch(prompt, /Browse with|Detect dev server/, 'detectionActive replaces the prompt');
  assert.match(prompt, /DETECTION/);
});

test('configured servers list with Run / Stop and the launch.json hint', () => {
  const html = render({ ...base, launch: { ...base.launch, exists: true, configs: [{ name: 'web', port: 5173, url: 'http://localhost:5173', attach: false }, { name: 'api', port: 8080, url: 'http://localhost:8080', attach: false }] },
    servers: [{ name: 'api', port: 8080, url: 'http://localhost:8080', status: 'running', error: null }] });
  assert.match(html, /data-preview-start="servers"/);
  assert.match(html, /aria-label="Run web"/);
  assert.match(html, /aria-label="Stop api"/);
  assert.match(html, /:5173/);
  assert.match(html, /Open a server to preview your app, or enter a URL\./);
  assert.match(html, /Edit this list in \.claude\/launch\.json\./);
});

test('a page: the URL shows host and path, the skip link explains F6, the start page is gone', () => {
  const html = render({ ...base, hasPage: true, url: 'http://localhost:5173/about?x=1', title: 'App', canGoBack: true, viewport: { ...base.viewport, preset: 'mobile', width: 375, height: 812 } });
  assert.match(html, /data-preview-surface="page"/);
  assert.match(html, /aria-label="Page URL"/);
  assert.match(html, /<span class="text-primary">localhost:5173<\/span><span class="text-muted">\/about\?x=1<\/span>/);
  assert.match(html, /press F6 or Ctrl\+F6 to move back out/);
  assert.match(html, /Mobile · 375 × 812/);
  assert.doesNotMatch(html, /data-preview-start/);
});

test('a load failure, and a page another pane shows (an empty viewport, no notice — as 2.2553.1)', () => {
  const failed = render({ ...base, hasPage: true, url: 'http://localhost:3000/', error: { code: '-102', description: 'ERR_CONNECTION_REFUSED', url: 'http://localhost:3000/' } });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Couldn’t load this preview/);
  assert.match(failed, /Nothing is answering at http:\/\/localhost:3000\//);
  const elsewhere = render({ ...base, hasPage: true, url: 'http://localhost:3000/', hostId: 'another-pane' });
  assert.match(elsewhere, /data-preview-surface="page"/);
  assert.match(elsewhere, /<span class="text-primary">localhost:3000<\/span>/, 'the header still drives the shared page');
  assert.doesNotMatch(elsewhere, /another pane|Show here|data-preview-start/);
});

test('the loading state before main answers', () => {
  const html = render(null);
  assert.match(html, /data-preview-surface="loading"/);
  assert.match(html, /aria-label="Loading preview"/);
});

test('header: Select element follows navigation and needs a page and a composer', () => {
  const page = { ...base, hasPage: true, url: 'http://localhost:5173/' };
  const html = render(page, { onAttachElement: () => {} });
  assert.match(html, /aria-label="Select element"/);
  assert.ok(html.indexOf('aria-label="Forward"') < html.indexOf('aria-label="Select element"'));
  assert.doesNotMatch(html.match(/<button[^>]*aria-label="Select element"[^>]*>/)[0], /disabled/);
  assert.match(render(page).match(/<button[^>]*aria-label="Select element"[^>]*>/)[0], /disabled=""/);
  assert.match(render(base, { onAttachElement: () => {} }).match(/<button[^>]*aria-label="Select element"[^>]*>/)[0], /disabled=""/);
});

test('current sketch host renders the original canvas, text/white controls and source actions', async () => {
  const S = await server.ssrLoadModule('/src/source-preview-sketch.jsx');
  const html = renderToStaticMarkup(React.createElement(S.SourcePreviewSketch, { backdrop: null, onCancel() {}, onAttach() {} }));
  for (const label of ['Pen', 'Line', 'Arrow', 'Rectangle', 'Ellipse', 'Text', 'Red', 'Blue', 'Green', 'Black', 'White', 'Undo', 'Redo', 'Clear all']) assert.match(html, new RegExp(`aria-label="${label}"`));
  assert.match(html, /aria-label="Sketch canvas"/);
  assert.match(html, /data-layout="full"/);
  assert.match(html, /data-surface="panel"/);
  assert.match(html, /bg-surface-2 shadow-panel-sm/);
  assert.match(html, />Close</);
  assert.match(html, /Add to chat/);
  assert.match(html, /<button[^>]*aria-label="Undo"[^>]*disabled=""/);
});

test('cf580efe9 yr: the start failure card — Warning, title, the meta and last-line chip, Copy and Try again', () => {
  const failed = { ...base, launch: { ...base.launch, exists: true, configs: [{ name: 'web', port: 5173, url: 'http://localhost:5173', attach: false }] },
    servers: [{ name: 'web', port: 5173, url: 'http://localhost:5173', status: 'failed', error: { code: 'timeout', message: 'x' } }] };
  const html = render(failed);
  assert.match(html, /data-preview-surface="failed"/);
  assert.match(html, /<div role="status" class="flex h-full w-full items-center justify-center overflow-y-auto p-lg"><div class="flex w-full max-w-\[400px\] flex-col items-center gap-md text-center">/);
  assert.match(html, /class="text-disabled"/);
  assert.match(html, /<p class="m-0 text-body text-primary">Dev server failed to start<\/p>/);
  assert.match(html, /<div class="flex w-full min-w-0 items-center gap-\[4px\] rounded bg-alpha-1 py-xs pl-md pr-xs text-left"><span class="min-w-0 flex-1 truncate text-code text-muted"><span class="font-sans text-footnote text-muted">Error details were sent to \S+ · <\/span>The dev server didn’t answer in time\.<\/span>/,
    'the agent\'s own preview_start failed: the meta, then the last line');
  assert.match(html, /aria-label="Copy error log"/);
  assert.match(html, /data-variant="secondary"[^>]*>(?:(?!<\/button>).)*<span class="ssb-content">Try again<\/span>/);
  assert.doesNotMatch(html, /data-variant="primary"|Ask DeepSeek/);
  const held = render({ ...failed, servers: [{ ...failed.servers[0], error: { code: 'port-held', heldPort: 5173, message: 'x' } }] });
  assert.match(held, /<p class="m-0 text-footnote text-muted">Port 5173 is already in use by a dev server in another session\. Stop that server, then try again\.<\/p>/);
  assert.doesNotMatch(held, /Copy error log/, 'no chip for a held port');
});

test('cf580efe9 mr: the stopped card (name row, Restart, caption) and its nameless fallback', () => {
  const stopped = { ...base, hasPage: true, url: 'http://localhost:5173/', servers: [{ name: 'web', port: 5173, url: 'http://localhost:5173', status: 'stopped' }] };
  const html = render(stopped);
  assert.match(html, /data-preview-surface="stopped"/);
  // 2.42304.0 cf580efe9-b-DCvKJg Mr: logical insets and text-muted-as-secondary (no prior-snapshot pl-/pr- utilities).
  assert.match(html, /<div class="flex items-center gap-sm rounded bg-alpha-1 py-md ps-\[9px\] pe-md">/);
  assert.doesNotMatch(html, /pl-\[9px\]|text-muted">Stopped/);
  assert.match(html, /<span class="min-w-0 flex-1 truncate text-body text-secondary">web<\/span><span class="shrink-0 text-footnote text-muted-as-secondary">Stopped<\/span>/);
  assert.match(html, /data-variant="secondary" data-size="xxs"[^>]*aria-label="Restart web"|aria-label="Restart web"[^>]*data-variant="secondary"/);
  assert.match(html, /<p class="m-0 text-center text-caption text-muted-as-secondary">The dev server stopped\. Restart it, or close the preview\.<\/p>/);
  assert.doesNotMatch(html, /Show start page/);
  const nameless = renderToStaticMarkup(React.createElement(P.PreviewStoppedCard, { serverLabel: '', onClose() {} }));
  assert.match(nameless, />Preview server stopped</);
  assert.match(nameless, /Close and reopen the preview to start it again\./);
  assert.match(nameless, /<span class="ssb-content">Close<\/span>/);
});

test('cf580efe9 ri: the restored frame — grayscale image, backdrop, the stopped card on a panel with Show start page', () => {
  const html = renderToStaticMarkup(React.createElement(P.PreviewLastFrame, { jpegBase64: 'AAAA', serverLabel: 'web', onRestart() {}, onDismiss() {} }));
  assert.match(html, /data-testid="preview-last-frame"/);
  assert.match(html, /<img src="data:image\/jpeg;base64,AAAA" alt="The last page this preview showed before the app closed" draggable="false" class="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top opacity-60 grayscale"\/>/);
  assert.match(html, /<div aria-hidden="true" class="absolute inset-0 bg-backdrop"><\/div>/);
  assert.match(html, /class="flex w-full max-w-\[400px\] flex-col gap-sm rounded-card bg-surface-panel p-lg shadow-popover pb-md"/);
  assert.match(html, /Showing the page from before the app closed\./);
  assert.match(html, /data-variant="ghost" data-size="xs"[^>]*>(?:(?!<\/button>).)*<span class="ssb-content">Show start page<\/span>/);
  // The pane paints nothing for it until the frame is read (Pi loading).
  const pane = render({ ...base, lastFrame: { configName: 'web', savedAt: 1 } });
  assert.match(pane, /data-preview-surface="restored"/);
  assert.doesNotMatch(pane, /data-preview-start=|preview-last-frame/);
});

test('cf580efe9 bi / Or: a server the agent starts shows Setting up preview with its running tool', () => {
  const starting = { ...base, launch: { ...base.launch, exists: true, configs: [{ name: 'web', port: 5173, url: 'http://localhost:5173', attach: false }] },
    servers: [{ name: 'web', port: 5173, url: 'http://localhost:5173', status: 'starting' }] };
  const html = render(starting);
  assert.match(html, /data-preview-surface="starting"/);
  assert.match(html, /<div role="status" class="flex items-center gap-xs text-body text-secondary">.*<span>Setting up preview<\/span>/);
  assert.doesNotMatch(html, /data-preview-start="servers"/, 'the list is replaced');
  assert.match(render(starting, { runningToolLabel: 'Starting preview web' }), /<span>Starting preview web<\/span>/);
});
