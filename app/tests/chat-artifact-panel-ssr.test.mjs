import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

// w13-chatfn-artifacts (research/w13-chatfn.md A3–A5, chatfn-27/28/31): the transcript chip, the artifact panel and the
// library's Chat items, rendered with react-dom/server under Vite SSR. Official chunks are read as text, never executed.
const app = path.resolve(import.meta.dirname, '..');
const official = (prefix) => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;

globalThis.window ??= { navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/', search: '', hash: '', href: 'app://local/' },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

let server, i18n, panel, gen;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  panel = await server.ssrLoadModule('/src/source-chat-artifact-panel.jsx');
  gen = await server.ssrLoadModule('/src/generated/artifact-library/index.mjs');
});
after(() => server?.close());

const pending = () => new Promise(() => {});
const artifact = (patch = {}) => ({ threadId: 't1', id: 'report', key: 'chat:t1:report', title: 'Quarterly report', type: 'text/markdown', extension: 'md',
  starred: false, version: 2, shown: 2, versions: [{ n: 1, command: 'create' }, { n: 2, command: 'update' }], content: '# Hello', inProject: false, ...patch });
const CHIP_CLASS = 'my-3 w-full border-0.5 rounded-[var(--msg-block-radius,0.5rem)] overflow-hidden font-sans flex items-center gap-2 px-3 py-2.5 text-start hover:bg-surface-0 transition-colors compact:my-1.5 compact:px-2 compact:py-1.5';

// w13-close-chat-messages (chatui-artifact-inline review low 4): the chip is cc1aae219's Cowork chip — its click selects a
// Cowork artifact — and Chat rows draw the artifact block, so the panel module no longer carries a copy of it.
test('chip: cc1aae219’s "Created / Updated artifact: {id}" chip is the Cowork one; the host keeps no dead copy', () => {
  const cc1 = official('cc1aae219-');
  assert.ok(cc1.includes(`className:"${CHIP_CLASS}"`), 'the official chip classes');
  assert.ok(cc1.includes('type:"SELECT_COWORK_ARTIFACT",id:u,opener:"chip"'), 'the chip opens a Cowork artifact');
  assert.equal(panel.ChatArtifactToolCard, undefined);
  assert.doesNotMatch(local('src/source-chat-artifact-panel.jsx'), /ChatArtifactToolCard|data-testid="chat-artifact-card"/);
  assert.doesNotMatch(local('src/main.jsx'), /ChatArtifactToolCard/);
});

test('panel: the file detail root and body classes, the title, Version {n} with its history label, the Copy split button and Close', () => {
  const ca2 = official('ca2ef848d-');
  assert.ok(ca2.includes('"flex h-full flex-col relative outline-none bg-surface-3"'));
  assert.ok(ca2.includes('className:"flex-1 min-h-0 bg-surface-3 overflow-auto"'));
  assert.ok(ca2.includes('"text-sm font-normal text-secondary min-w-0"'));
  assert.ok(ca2.includes('className:"flex items-center gap-1 text-sm text-success-200 ms-2 me-3 flex-shrink-0"'));
  const html = renderToStaticMarkup(h(panel.SourceChatArtifactPanel, { call: pending, threadId: 't1', artifactId: 'report', initialData: artifact() }));
  assert.ok(html.startsWith('<section tabindex="-1" aria-label="Quarterly report" data-testid="chat-artifact-panel" data-artifact-type="text/markdown" class="chat-artifact-panel flex h-full flex-col relative outline-none bg-surface-3">'), html.slice(0, 240));
  assert.match(html, /<h2 class="text-sm font-normal text-secondary min-w-0 truncate" title="Quarterly report">Quarterly report<\/h2>/);
  assert.match(html, /aria-label="Version history, 2 versions"/);
  assert.match(html, /<span class="truncate">Version 2<\/span>/);
  assert.match(html, />Copy</);
  assert.match(html, /aria-label="More options"/, 'the split button’s menu half (cF menuLabel default)');
  assert.match(html, /aria-label="Close"/);
  assert.match(html, /<div class="flex-1 min-h-0 bg-surface-3 overflow-auto" data-focus-region="artifact" data-focus-region-label="Quarterly report">/); // w13-chatui-artifact-inline: Jump to artifact (ca1d33d05 tn label)
  assert.doesNotMatch(html, /Publish artifact|Share artifact/);
  assert.doesNotMatch(html, /data-testid="chat-artifact-safety"/, 'the safety note is for HTML');
  const one = renderToStaticMarkup(h(panel.SourceChatArtifactPanel, { call: pending, threadId: 't1', artifactId: 'report', initialData: artifact({ versions: [{ n: 1 }], shown: 1, version: 1 }) }));
  assert.match(one, /aria-label="Version history, 1 version"/);
  const loading = renderToStaticMarkup(h(panel.SourceChatArtifactPanel, { call: pending, threadId: 't1', artifactId: 'report' }));
  assert.match(loading, /Loading artifact…/);
  assert.match(loading, /data-focus-region="artifact" data-focus-region-label="Artifact"/); // ca1d33d05 tn: no title → "Artifact" (07/fBlW5U3)
});

test('panel: HTML shows the A5 note and runs in the sandboxed frame; React / Mermaid stay code with a note', () => {
  const s7 = official('shared-7-');
  assert.ok(s7.includes('defaultMessage:"Artifacts are user-generated and may contain unverified or potentially unsafe content."'));
  const page = renderToStaticMarkup(h(panel.SourceChatArtifactPanel, { call: pending, threadId: 't1', artifactId: 'page', initialData: artifact({ id: 'page', type: 'text/html', extension: 'html', content: '<h1>x</h1>' }) }));
  assert.match(page, /data-testid="chat-artifact-safety">Artifacts are user-generated and may contain unverified or potentially unsafe content\.<\/p>/);
  assert.match(page, /data-file-preview="html"/);
  const viewer = local('src/source-file-viewer.jsx');
  const frame = /<iframe ref=\{iframe\}[^>]*>/.exec(viewer)?.[0] ?? '';
  assert.match(frame, /sandbox="allow-scripts"/);
  assert.doesNotMatch(frame, /allow-same-origin/);
  assert.match(local('electron/file-preview-frame.cjs'), /"connect-src 'none'"/, 'the frame’s scripts cannot fetch');
  assert.match(local('src/source-chat-artifact-panel.jsx'), /previewFrame=\{renderer\?\.kind === 'html' \? previewFrame : null\}/);
  const jsx = renderToStaticMarkup(h(panel.SourceChatArtifactPanel, { call: pending, threadId: 't1', artifactId: 'app', initialData: artifact({ id: 'app', type: 'application/vnd.ant.react', extension: 'tsx', content: 'export default () => <p/>' }) }));
  assert.match(jsx, /data-testid="chat-artifact-code-only">React artifacts are shown as code here\.<\/p>/);
  const chart = renderToStaticMarkup(h(panel.SourceChatArtifactPanel, { call: pending, threadId: 't1', artifactId: 'flow', initialData: artifact({ id: 'flow', type: 'application/vnd.ant.mermaid', extension: 'mermaid', content: 'graph TD; A-->B' }) }));
  assert.match(chart, /Mermaid diagrams are shown as code here\./);
});

test('library: a Chat item (source "chat", markdown text) draws c69e9937a’s text cover; the host opens it in the panel', () => {
  const item = { key: 'chat:t1:report', source: 'chat', title: 'Quarterly report', description: '', artifactType: 'text/markdown', previewText: '# Revenue grew',
    href: '/artifacts/local/chat%3At1%3Areport', icon: 'Note', updatedAtMs: Date.now() - 36e5, starred: false, onNavigate() {}, onToggleStar() {} };
  const html = renderToStaticMarkup(h(gen.ArtifactLibraryPage, { title: 'Artifacts', items: [item], isLoading: false, searchQuery: '', layout: 'grid',
    search: { value: '', onChange() {}, onClear() {}, placeholder: 'Search artifacts...', label: 'Search your artifacts' }, viewToggle: { value: 'grid', onChange() {} } }));
  assert.match(html, /data-gallery-card="chat:t1:report"/);
  assert.match(html, /aria-label="Quarterly report"/);
  // The cover is drawn lazily (on view); its Chat branch is the official one: a published artifact, or markdown /
  // text / code with previewText, draws the text cover (generated c69e9937a `r.source === "chat" && Ot(r)`).
  const cards = local('src/generated/artifact-library/c69e9937a-BIwXoJBq.mjs');
  assert.ok(cards.includes('if (r.source === "chat" && Ot(r)) {'));
  assert.ok(cards.includes('preview: r.previewText,'));
  const library = local('src/source-artifact-library.jsx');
  assert.match(library, /source: record\.source === 'chat' \? 'chat' : 'cowork'/);
  assert.match(library, /selectedRecord\?\.source === 'chat' \? <SourceChatArtifactPanel key=\{selectedRecord\.key\}/);
});

test('main.jsx: the chip replaces an artifacts call’s row in a Chat, and the panel mounts beside the conversation', () => {
  const main = local('src/main.jsx');
  assert.ok(main.includes('transcriptView).flatMap((row) => (mode === "chat" ? withArtifactChips([row]) : [row]));'));
  assert.match(main, /artifactChip && !artifactChip\.failed \? <SourceTranscriptRowBoundary sessionId=\{current\} item=\{item\} kind="row">/);
  // w13-chatui-artifact-inline: the row is the official artifact block (tests/w13-chat-artifact-card.test.mjs), opening the panel.
  assert.match(main, /<SourceChatArtifactCard rows=\{displayedItems\} index=\{index\} threadId=\{current\}/);
  assert.match(main, /mode === 'chat' && current && section === 'new' && chatArtifact\?\.threadId === current && <SourceChatArtifactPanel/);
  // R6: the panel takes CDS by semantic name from the facade.
  assert.match(local('src/source-chat-artifact-panel.jsx'), /import \{ CdsButton, CdsDropdown, CdsIcon, CdsSplitDropdownButton \} from '\.\/generated\/view-tabs\/index\.js';/);
});
