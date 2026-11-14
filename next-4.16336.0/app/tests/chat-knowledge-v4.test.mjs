// account2 batch 6, region chat-knowledge: the 4.16336.0 project knowledge and memory parts (scripts/extract-chat-knowledge-v4.mjs
// -> src/generated/chat-knowledge-v4, which source-project-knowledge.jsx / source-settings-memory.jsx render since the round-3
// switch S5; the 3.6556.2 src/generated/chat-knowledge is still generated for its old consumer chat-renderer). Source checks (manifest, --check, pins, D1 links, adapter
// module) and SSR of the roots over the host adapters (ChatKnowledgeHostContext / ChatMemoryHostContext), through Vite.
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
import { extractChatKnowledgeV4, ROOTS, HOST_ADAPTERS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-chat-knowledge-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/chat-knowledge-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '', hash: '', origin: 'file://' }, history: { state: null } };

let server, gen, host;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  host = await server.ssrLoadModule('/src/source-chat-knowledge-adapters.jsx');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-chat-knowledge-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-chat-knowledge-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['chat-markdown-v4', 'code-routines-v4', 'sessions-page-v4', 'routines-shared-v4', 'working-line-v4']);
  // wave 7: shared-frame Qo (cdsRem) is cds-core's state_sharedframe_Qo; no import of it reaches files-changes-v4.
  assert.ok(manifest.modules.every(m => (m.imports ?? []).every(i => !/files-changes-v4/.test(i.from ?? ''))));
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const [area, digest] of Object.entries(provenance.linkedAreas)) assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), digest, area);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractChatKnowledgeV4({ check: true });
  // Production (round-3 switch S5): the host imports the 4.16336.0 graph; the 3.6556.2 graph stays generated for chat-renderer
  // (its old consumer, pure parts only) and no host file imports it.
  assert.equal(JSON.parse(local('src/generated/chat-knowledge/manifest.json')).referenceVersion, '3.6556.2');
  assert.match(local('src/source-project-knowledge.jsx'), /^import \{ KnowledgeFileThumbnail, KnowledgeFileTag, knowledgeFileTagName, formatKnowledgeFileSize, KnowledgeAddMenu, KnowledgeCapacityBar \} from '\.\/generated\/chat-knowledge-v4\/index\.mjs';$/m);
  assert.match(local('src/source-settings-memory.jsx'), /^import \{ MemoryPreviewContent \} from '\.\/generated\/chat-knowledge-v4\/index\.mjs';$/m);
  for (const file of fs.readdirSync(path.join(app, 'src')).filter(name => /\.(m?js|jsx)$/.test(name)))
    assert.doesNotMatch(local(`src/${file}`), /from ['"]\.\/generated\/chat-knowledge\//, `host ${file} imports the 3.6556.2 chat-knowledge graph`);
});

test('roots: the 3.6556.2 semantic names, AST-located and pinned in 4.16336.0, all exported by index.mjs', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'shared-36-fqRFYwOb.js#U_=KnowledgeFileThumbnail/Aa', 'shared-36-fqRFYwOb.js#rv=KnowledgeFileTag/Ma', 'shared-36-fqRFYwOb.js#b_=knowledgeFileTagName/Ha',
    'shared-4-C_EiQb9h.js#Yj=formatKnowledgeFileSize/xt', 'c52b32660-CmYsbpbF.js#be=KnowledgeCapacityBar',
    'cf2f34ee4-CGe8SQnD.js#vi=AddTextContentDialog', 'cf2f34ee4-CGe8SQnD.js#si=createTextContentDraft', 'cf2f34ee4-CGe8SQnD.js#oi=KnowledgeAddMenu/m',
    'cffc9ea71-Do_Jrd6d.js#C=MemoryPreviewContent/n']);
  const previous = Object.keys(JSON.parse(local('src/generated/chat-knowledge/manifest.json')).publicNames).sort();
  assert.deepEqual(Object.values(ROOTS).flatMap(r => Object.values(r).map(x => x.name)).sort(), previous, 'same public surface as the 3.6556.2 graph');
  for (const name of previous) assert.ok(gen[name] !== undefined, name);
  for (const r of provenance.roots) {
    const text = official(r.file);
    assert.ok(text.includes(ROOTS[r.file][r.local].probe), `${r.file}: ${ROOTS[r.file][r.local].probe}`);
  }
});

test('host boundaries: every adapted original is pinned, used once, and answered by the adapter module', () => {
  assert.equal(provenance.adapters.length, Object.keys(HOST_ADAPTERS).length);
  const imported = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  for (const a of Object.values(HOST_ADAPTERS)) assert.ok(imported.has(a.name), a.name);
  const adapters = local('src/source-chat-knowledge-v4-adapters.jsx');
  for (const a of Object.values(HOST_ADAPTERS)) assert.match(adapters, new RegExp(`\\b${a.name.replace('$', '\\$')}\\b`), a.name);
  // The two 4.16336.0-only memory limits answer the official GrowthBook fallbacks.
  const s212 = official('shared-212-BHMAi0oa.js');
  assert.ok(s212.includes('Er("claudeai_saffron_frontend","max_control_chars",100,Qr)'));
  assert.ok(s212.includes('Er("claudeai_saffron_frontend","max_num_controls",10,Qr)'));
});

test('D1: no module state of another 4.16336.0 graph is sliced again; CDS names come from cds-core', async () => {
  const L = await import(path.resolve(app, '../analysis/claude-4.16336.0-migrate-20261104/d1/d1-lib.mjs'));
  const { graphs } = L.loadGraphs({ appOnly: true });
  const mine = graphs.find(g => g.name === 'chat-knowledge-v4');
  assert.ok(mine && mine.status === 'ok');
  const stateful = [];
  for (const g of graphs) if (g.status === 'ok' && g.name !== mine.name && (g.realm ?? 'renderer') === 'renderer')
    for (const key of g.sliced.keys()) if (mine.sliced.has(key) && L.classify(...key.split('#')).stateful) stateful.push(`${key} (${g.name})`);
  assert.deepEqual(stateful, []);
  const cds = manifest.modules.flatMap(m => m.imports.filter(i => i.from.startsWith('../cds-core/')).map(i => i.name));
  for (const name of ['CdsButton', 'CdsIcon', 'CdsTooltip', 'clsx']) assert.ok(cds.includes(name), name);
});

test('SSR: file tile and tag, capacity bar, "Add files" menu over a local project (ChatKnowledgeHostContext)', () => {
  const intl = { formatNumber: (n, o) => `${n} ${o.unit}`, locale: 'en-US' };
  assert.equal(gen.knowledgeFileTagName('notes.md'), 'md');
  assert.equal(gen.formatKnowledgeFileSize(intl, 1500, 'narrow', { isolate: false }), '1.5 kilobyte');
  const tile = renderToStaticMarkup(h(gen.KnowledgeFileThumbnail, { size: 'stretch', isEditable: false, isInSelectionMode: false, title: 'notes.md', subtitle: '12 lines',
    tag: h(gen.KnowledgeFileTag, { tagName: 'md' }), accessibleName: 'notes.md, md' }));
  assert.match(tile, /data-testid="file-thumbnail"/);
  assert.match(tile, /uppercase truncate font-sans text-text-300 text-\[11px\] leading-\[13px\]">md</);
  const value = { tokens: 50000, capacity: 200000, addText: async () => {}, uploadFiles: async () => {} };
  const bar = renderToStaticMarkup(h(host.ChatKnowledgeHostContext.Provider, { value }, h(gen.KnowledgeCapacityBar, { projectUuid: 'p' })));
  assert.match(bar, /25% of project capacity used/);
  assert.doesNotMatch(bar, /Search mode/, 'the search rollout (claude_ai_project_bananagrams) is off');
  const menu = renderToStaticMarkup(h(host.ChatKnowledgeHostContext.Provider, { value }, h(gen.KnowledgeAddMenu, { projectUuid: 'p', isStarterProject: false, isUploading: false,
    setIsUploadingDoc() {}, setIsUploadingGithubSync() {}, setIsUploadingMcpSync() {} })));
  assert.match(menu, /data-testid="project-doc-upload"/);
  assert.match(menu, /data-testid="project-doc-uploader-dropdown-trigger"/);
  assert.match(menu, /aria-label="Add files"/);
});

test('SSR: memory synthesis view over this machine\'s memory (ChatMemoryHostContext), with the host Markdown', () => {
  const html = renderToStaticMarkup(h(host.ChatMemoryHostContext.Provider, { value: { available: true, query: { data: { memory: '**Bold** fact', controls: [] } }, update() {}, pending: false } },
    h(gen.MemoryPreviewContent, { modalView: 'synthesis', setModalView() {}, isUpdating: false })));
  assert.match(html, /<strong>Bold<\/strong> fact/);
});
