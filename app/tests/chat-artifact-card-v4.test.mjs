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
import { extractChatArtifactCardV4, ROOTS, LINKED_ROOTS, HOST_ADAPTERS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-chat-artifact-card-v4.mjs';

// account2 batch 6, region chat-artifact-card: the 4.16336.0 Chat artifact block (scripts/extract-chat-artifact-card-v4.mjs ->
// src/generated/chat-artifact-card-v4, staged next to the 3.6556.2 src/generated/chat-artifact-card the host still renders).
// Source only: manifest, the generator's --check, the official chunk text, D1 links, and SSR of the block through Vite with
// the same host inputs src/source-chat-artifact-card.jsx computes from the transcript rows (no production switch).
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/chat-artifact-card-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

// The same DOM stand-ins as tests/cowork-progress-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

let server, gen, host, adapters, layout, old;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  host = await server.ssrLoadModule('/src/source-chat-artifact-card.jsx');
  adapters = await server.ssrLoadModule('/src/source-chat-artifact-card-adapters.jsx');
  layout = await server.ssrLoadModule('/src/generated/cds-core/shared-2.mjs');
  old = await server.ssrLoadModule('/src/generated/chat-artifact-card/artifact-tool-block.mjs');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-chat-artifact-card-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-chat-artifact-card-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['code-composer-v4', 'cowork-scheduled-v4', 'session-rail-kit-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractChatArtifactCardV4({ check: true });
});

test('roots: AST-located and pinned; ao is a linked root held by session-rail-kit-v4, ro the cds-core publicName ctx_shared38_ro', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.linkedFrom ? `<${r.linkedFrom}` : ''}`), [
    'cc1aae219-BbSf__8R.js#c1=ChatArtifactToolBlock', 'cc1aae219-BbSf__8R.js#oI=artifactCellType', 'cc1aae219-BbSf__8R.js#rI=artifactToolUseId',
    'shared-38-DyF0_Fim.js#qa=ArtifactBlock', 'shared-2-CsjIBQD8.js#v4=useTranscriptLayoutName', 'shared-2-CsjIBQD8.js#y4=useTranscriptLayoutIsCustom',
    'shared-2-CsjIBQD8.js#b4=useTranscriptLayoutCard', 'shared-31-C9BqSSuD.js#Zw=transcriptStaysPutAttribute', 'shared-153-DMw2VzSq.js#J=ArtifactType',
    'shared-38-DyF0_Fim.js#ao=useArtifactBlockGrouped<session-rail-kit-v4', 'shared-38-DyF0_Fim.js#ro=ArtifactBlockGroupedContext<cds-core']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const [file, rs] of Object.entries(ROOTS)) for (const spec of Object.values(rs)) assert.ok(official(file).includes(spec.probe), `${file} ${spec.name}`);
  for (const [key, spec] of Object.entries(LINKED_ROOTS)) assert.ok(official(key.split('#')[0]).includes(spec.probe), key);
  for (const r of provenance.roots) assert.notEqual(gen[r.name], undefined, r.name);
  // The linked roots are the very binding the shared rail kit renders with (one context instance): ao is held by
  // session-rail-kit-v4; ro by cds-core (wave 7), which session-rail-kit-v4 links instead of cutting it again.
  const kit = JSON.parse(local('src/generated/session-rail-kit-v4/manifest.json')).modules.find(m => m.source === 'shared-38-DyF0_Fim.js');
  const core = JSON.parse(local('src/generated/cds-core/manifest.json'));
  assert.deepEqual(core.publicNames.ctx_shared38_ro, { file: 'shared-38-DyF0_Fim.js', local: 'ro', target: 'shared-38.mjs', exportName: 'ro' });
  const coreMod = core.modules.find(m => m.target === 'shared-38.mjs');
  for (const r of provenance.roots.filter(r => r.linkedFrom)) {
    const holder = r.linkedFrom === 'cds-core' ? coreMod : kit;
    assert.equal(holder.bindings.find(b => b.name === r.local).sha256, r.declarationSha256, r.local);
  }
  assert.equal(kit.bindings.some(b => b.name === 'ro'), false, 'session-rail-kit-v4 no longer cuts ro');
  assert.match(local(`${out}/index.mjs`), /export \{ ro as ArtifactBlockGroupedContext \} from "\.\.\/cds-core\/shared-38\.mjs";/);
});

test('host boundaries: each adapted original pinned, re-exported unchanged from an existing host adapter', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'shared-153#Aw=chatArtifactsInputSchema', 'shared-31#Jm=useChatTranscriptCapability', 'shared-2#_y=useChatArtifactDrawer',
    'shared-153#IY=useChatArtifactRecord', 'shared-153#FY=useChatArtifactEntry', 'c7d03f0bf#s=useChatArtifactDrawerSelected',
    'shared-25#IH=setChatLocalValue', 'vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage', 'shared-0#qB=reportRenderError']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-chat-artifact-card-v4-adapters.jsx');
  const adapterText = local('src/source-chat-artifact-card-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    ['./source-chat-artifact-card-adapters.jsx', './source-routines-shared-adapters.jsx', './source-chat-markdown-adapters.jsx', './source-r3b-transcript-adapters.jsx']);
  // c1 `wr.safeParse(t)`: the existing host schema answers zod's safeParse contract over its parse.
  const schema = adapters.chatArtifactsInputSchema;
  assert.deepEqual(schema.safeParse({ id: 'a', command: 'create', type: 'text/markdown', version_number: 2 }).data,
    schema.parse({ id: 'a', command: 'create', type: 'text/markdown', version_number: 2 }));
  assert.equal(schema.safeParse({ id: 'a' }).success, true);
  assert.equal(schema.safeParse({ id: 5 }).success, false);
  assert.equal(schema.safeParse(null).success, false);
});

test('D1: bindings the linked areas hold are imported from them; no other 4.16336.0 graph cuts the block', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'nothing a linked area holds is cut again');
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
  assert.ok(linked.has('code-composer-v4') && linked.has('session-rail-kit-v4'), [...linked].join(','));
  assert.equal(local(`${out}/shared-38.mjs`).includes('createContext'), false, 'the grouped-summary context is not declared here');
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'chat-artifact-card-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    const m = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    if (m.referenceVersion !== '4.16336.0') continue;
    for (const mod of m.modules ?? []) {
      const names = new Set((mod.bindings ?? []).map(b => (typeof b === 'string' ? b : b.name)));
      if (path.basename(mod.source ?? '') === 'cc1aae219-BbSf__8R.js') assert.ok(!names.has('c1'), dir);
      if (path.basename(mod.source ?? '') === 'shared-38-DyF0_Fim.js') assert.ok(!names.has('qa'), dir);
    }
  }
});

test('the official text: the tool-use switch, c1 and the shared-38 block copy', () => {
  const cc1 = official('cc1aae219-BbSf__8R.js'), s38 = official('shared-38-DyF0_Fim.js');
  assert.ok(cc1.includes('case"artifacts":return'));
  assert.ok(cc1.includes('openTestId:"artifact-card-open",isExpanded:P'));
  assert.ok(cc1.includes('"Artifact tool input has an unexpected shape"'));
  for (const s of ['{defaultMessage:"View {title}",id:"DJwNP60Awm"}', '{defaultMessage:"Open artifact",id:"b9eW0AZlJl"}',
    '{defaultMessage:"Drafting artifact...",id:', '{defaultMessage:"Stopped",id:"1LBny5MvRa"}', 'artifact-block-cell flex flex-1 justify-between w-full'])
    assert.ok(s38.includes(s), s);
  // The 3.6556.2 cell-type rules are unchanged: the v4 oI and the old PB agree on every neighbour combination.
  const blocks = [undefined, { type: 'text' }, { type: 'tool_use', name: 'artifacts', id: 'x', input: { id: 'a', command: 'update' } },
    { type: 'tool_use', name: 'artifacts', id: 'y', input: { id: 'b', command: 'rewrite' } }];
  const self = { type: 'tool_use', name: 'artifacts', id: 's', input: { id: 'a', command: 'update' } };
  for (const p of blocks) for (const n of blocks) assert.equal(gen.artifactCellType(p, n, self), old.artifactCellType(p, n, self));
  assert.equal(gen.artifactToolUseId({ type: 'tool_use', name: 'artifacts', partial_json: '{"id": "z"' }), 'z');
});

// The host inputs src/source-chat-artifact-card.jsx computes from the rows, drawn with the 4.16336.0 block.
const call = (id, args, patch = {}) => ({ id, type: 'mcpToolCall', server: 'code_desktop', tool: 'artifacts', turnId: 'turn1', status: 'completed',
  arguments: JSON.stringify(args), result: { content: [{ type: 'text', text: `${args.command === 'create' ? 'Created' : 'Updated'} artifact: ${args.id} (version ${patch.version ?? 1}, ${args.type ?? 'text/markdown'}).` }] }, ...patch });
const create = patch => call('c1', { command: 'create', id: 'report', title: 'Quarterly report', type: 'text/markdown', content: '# Hello\nBody' }, patch);
const answer = { id: 'a1', type: 'agentMessage', turnId: 'turn1', text: 'Here it is.' };
function block(rows, index, { selected = null, isStreaming = false, input, grouped, sheet } = {}) {
  const item = rows[index];
  const use = host.artifactToolUse(item);
  const { cellType, first, last } = host.artifactCellOf(rows, index);
  const value = { artifacts: host.chatArtifactRecords(rows), closeDrawer() {}, selected: selected ? { type: 'artifact', ...selected } : null };
  let el = h(gen.ChatArtifactToolBlock, { input: input ?? use.input, conversationUuid: 't1', toolResult: host.artifactToolResult(item), isStreaming,
    onOpenArtifact() {}, message: { uuid: item.turnId }, toolUseId: item.id, artifactCellType: cellType, isFirstBlockOfMessage: first, isLastBlockOfMessage: last });
  if (grouped) el = h(gen.ArtifactBlockGroupedContext.Provider, { value: true }, el);
  if (sheet) el = h(layout.g4.Provider, { value: { name: 'sheet' } }, el);
  return renderToStaticMarkup(h(adapters.ChatArtifactCardContext.Provider, { value }, el));
}
const BLOCK = 'group/artifact-block relative flex text-start font-sans rounded-lg overflow-hidden border-0.5 transition duration-300 w-full hover:bg-bg-000/50 px-4';

test('SSR: a created markdown artifact: the c1 wrapper, the qa block, the open button, title and type line', () => {
  const html = block([create()], 0);
  assert.ok(html.startsWith('<div class="pt-2 pb-2" data-transcript-stays-put="">'), html);
  assert.ok(html.includes(`<div class="${BLOCK} border-border-300 hover:border-border-200">`), html);
  assert.match(html, /data-testid="artifact-card-open"[^>]*aria-label="View Quarterly report"/);
  assert.ok(html.includes('artifact-block-cell flex flex-1 justify-between w-full'));
  assert.ok(html.includes('Quarterly report') && html.includes('>Document'), html);
  assert.ok(html.includes('Hello'), 'the preview card shows the first characters');
});

test('SSR: versions, edits, streaming, stopped and the open panel', () => {
  const update = call('c2', { command: 'update', id: 'report', old_str: 'Body', new_str: 'Text' }, { version: 2 });
  const html = block([create(), answer, update], 2);
  assert.match(html, /Version 2/);
  assert.ok(html.includes('aria-label="View Quarterly report"'), 'the title comes from the store record');
  assert.ok(html.startsWith('<div class="pt-3 pb-2"'), html);
  const again = call('c3', { command: 'update', id: 'report', old_str: 'Text', new_str: 'More' }, { version: 3 });
  const hidden = block([create(), answer, update, again], 2);
  assert.ok(hidden.startsWith('<div class="h-0" data-transcript-stays-put="">'), hidden);
  const drafting = block([call('c4', { command: 'create', id: 'draft' }, { status: 'inProgress', result: null })], 0, { isStreaming: true });
  assert.match(drafting, /Drafting artifact\.\.\./);
  const stopped = block([create({ status: 'interrupted' })], 0);
  assert.ok(stopped.includes('Stopped') && !stopped.includes('artifact-card-open'), stopped);
  assert.ok(block([create()], 0, { selected: { id: 'report', toolUseId: 'c1' } }).includes(`<div class="${BLOCK} border-accent-200 duration-500">`));
  assert.ok(!block([create()], 0, { selected: { id: 'report', toolUseId: 'other' } }).includes('border-accent-200'));
});

test('SSR: 4.16336.0 behaviour: invalid input draws nothing, grouped summary, sheet layout', () => {
  assert.equal(block([create()], 0, { input: { id: 5, command: 'create' } }), '', 'safeParse failure: null');
  const grouped = block([create()], 0, { grouped: true });
  assert.ok(grouped.startsWith('<div class="" data-transcript-stays-put="">'), grouped);
  const update = call('c2', { command: 'update', id: 'report', old_str: 'Body', new_str: 'Text' }, { version: 2 });
  const again = call('c3', { command: 'update', id: 'report', old_str: 'Text', new_str: 'More' }, { version: 3 });
  assert.ok(block([create(), answer, update, again], 2, { grouped: true }).startsWith('<div class="hidden"'), 'grouped: a not-last edit is hidden');
  const sheet = block([create(), answer, update], 2, { sheet: true });
  assert.ok(sheet.startsWith('<div class="pt-4 pb-2 ps-[var(--msg-block-inset,0.5rem)]"'), sheet);
});
