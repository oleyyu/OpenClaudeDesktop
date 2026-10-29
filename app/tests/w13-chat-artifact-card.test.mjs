import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { designStylesheets } from '../scripts/current-design-assets.mjs';
import { extractChatArtifactCard } from '../scripts/extract-chat-artifact-card.mjs';
import { JUMP_COMMANDS, PASS_THROUGH_REGIONS, REGION_ORDER } from '../src/focus-region-model.mjs';
import { paletteActions } from '../src/sidebar-palette-model.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

// w13-chatui-artifact-inline (research/w13-chatui.md chatui-C13): a Chat's `artifacts` call is the 3.6556.2 artifact
// block (cc1aae219 Y3 → shared-9 sO / oO, `artifact-block-cell`) that opens the artifact panel, and "Jump to artifact"
// (shared-1 SF) lands in the open panel. Official chunks are read as text, never executed; the block renders under Vite
// SSR with react-dom/server.
const app = path.resolve(import.meta.dirname, '..');
const official = (prefix) => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;

globalThis.window ??= { navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/', search: '', hash: '', href: 'app://local/' },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

let server, i18n, card;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  card = await server.ssrLoadModule('/src/source-chat-artifact-card.jsx');
});
after(() => server?.close());

const call = (id, args, patch = {}) => ({ id, type: 'mcpToolCall', server: 'code_desktop', tool: 'artifacts', turnId: 'turn1', status: 'completed',
  arguments: JSON.stringify(args), result: { content: [{ type: 'text', text: `${args.command === 'create' ? 'Created' : 'Updated'} artifact: ${args.id} (version ${patch.version ?? 1}, ${args.type ?? 'text/markdown'}).` }] }, ...patch });
const create = (patch) => call('c1', { command: 'create', id: 'report', title: 'Quarterly report', type: 'text/markdown', content: '# Hello\nBody' }, patch);
const answer = { id: 'a1', type: 'agentMessage', turnId: 'turn1', text: 'Here it is.' };
const render = (rows, index, props = {}) => renderToStaticMarkup(h(card.SourceChatArtifactCard, { rows, index, threadId: 't1', ...props }));

const BLOCK = 'group/artifact-block relative flex text-start font-sans rounded-lg overflow-hidden border-0.5 transition duration-300 w-full hover:bg-bg-000/50 px-4';

test('generator: --check reproduces src/generated/chat-artifact-card from the 3.6556.2 originals', async () => {
  const manifest = await extractChatArtifactCard({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.deepEqual(manifest.modules.map((m) => m.target), ['artifact-type.mjs', 'artifact-icons.mjs', 'transcript-layout.mjs', 'transcript-stays-put.mjs',
    'artifact-block.mjs', 'artifact-tool-block.mjs']);
  const bindings = Object.fromEntries(manifest.modules.map((m) => [m.target, m.bindings.map((b) => b.name)]));
  for (const name of ['sO', 'aO', 'oO', 'XD', 'VD', 'ZD', '$D', 'eO', 'cO', 'yO', '_O']) assert.ok(bindings['artifact-block.mjs'].includes(name), name);
  for (const name of ['Y3', 'q3', 'PB', 'jB', 'AB']) assert.ok(bindings['artifact-tool-block.mjs'].includes(name), name);
  // No second copy of what other graphs hold (D1): IconBase, zustand create, owner document / window are linked.
  assert.deepEqual(manifest.linked.map((l) => l.original).sort(), ['shared-25-DOWZRSlq.js#hf', 'shared-25-DOWZRSlq.js#mf', 'vendor-all-0-DXM0MGjZ.js#v',
    'vendor-icons-BplZ6UOJ.js#o']);
  assert.deepEqual(manifest.adapters.map((a) => a.name).sort(), ['chatArtifactsInputSchema', 'useChatArtifactDrawer', 'useChatArtifactDrawerSelected',
    'useChatArtifactEntry', 'useChatArtifactRecord', 'useChatTranscriptCapability']);
  // prepare-ui runs every verify-gen-*.mjs in its own process.
  assert.match(local('scripts/prepare-ui.mjs'), /\/\^verify-gen-\[a-z0-9-\]\+\\\.mjs\$\//);
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-chat-artifact-card.mjs')));
});

test('official: the Chat `artifacts` tool block is cc1aae219 Y3 over shared-9 sO, not the Cowork chip', () => {
  const cc1 = official('cc1aae219-');
  assert.ok(cc1.includes('case"artifacts":'), 'the tool-use switch case');
  assert.ok(cc1.includes('openTestId:"artifact-card-open",isExpanded:k'));
  assert.ok(cc1.includes('isEdit:ne,isNotLastEdit:G,onOpenArtifact:K'));
  // The "Created artifact: {id}" chip is the Cowork one: it selects a Cowork artifact.
  assert.ok(cc1.includes('a({type:"SELECT_COWORK_ARTIFACT",id:u,opener:"chip"})'));
  const s9 = official('shared-9-');
  assert.ok(s9.includes(`"${BLOCK}"`));
  assert.ok(s9.includes('className:"artifact-block-cell flex flex-1 justify-between w-full"'));
  assert.ok(s9.includes('{defaultMessage:"View {title}",id:"DJwNP60Awm"}') && s9.includes('{defaultMessage:"Open artifact",id:"b9eW0AZlJl"}'));
  assert.ok(s9.includes('sO as R'));
  // Jump to artifact: shared-1 SF in the command registry, ca1d33d05's region jump and region order.
  const s1 = official('shared-1-');
  assert.ok(s1.includes('SF=q({description:{defaultMessage:"Jump to artifact",id:"/+iiHUK8eg"}})'));
  assert.ok(s1.includes('jump_to_artifact:{description:SF.description,group:"general",bang:"!jr",icon:Q("Artifacts")}'));
  const ca1 = official('ca1d33d05-');
  assert.ok(ca1.includes('jump_to_artifact:Z("artifact")'));
  assert.ok(ca1.includes('"composer","sidePanel","artifact","overview"') && ca1.includes('Se=new Set(["question","artifact"])'));
  assert.ok(official('cbaae0d6d-').includes('(xe,{kind:"artifact",boxRef:Pe,name:oi,shown:si})'));
  // The block's utilities are in the stylesheets the app loads (index.html, current-design-assets): no host CSS.
  const css = designStylesheets.map((name) => fs.readFileSync(path.join(ionSource, name), 'utf8')).join('\n');
  for (const selector of ['.group-hover\\/artifact-block\\:scale-\\[1\\.035\\]', '.w-\\[52px\\]', '.h-\\[71px\\]', '.rotate-\\[0\\.1rad\\]',
    '.w-\\[68px\\]', '.text-\\[0\\.3rem\\]', '.translate-y-\\[120\\%\\]', '.has-\\[button\\]\\:ms-md', '.hover\\:bg-bg-000\\/50', '.border-accent-200'])
    assert.ok(css.includes(selector), selector);
});

test('block: a created markdown artifact — the Y3 wrapper, the oO block, the open button, title and type line', () => {
  const html = render([create()], 0);
  // Y3: first and last block of its message → pt-2 / pb-2, `data-transcript-stays-put`.
  assert.ok(html.startsWith('<div class="pt-2 pb-2" data-transcript-stays-put="">'), html);
  assert.ok(html.includes(`<div class="${BLOCK} border-border-300 hover:border-border-200">`), html);
  assert.match(html, /<button type="button" data-testid="artifact-card-open" class="absolute inset-0 cursor-pointer rounded-\[inherit\] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-200" aria-label="View Quarterly report"><\/button>/);
  assert.ok(html.includes('<div class="artifact-block-cell flex flex-1 justify-between w-full">'));
  assert.ok(html.includes('<div class="flex flex-col gap-1 py-4 min-w-0 flex-1"><div class="leading-tight text-sm line-clamp-1">Quarterly report</div>'), html);
  assert.ok(html.includes('<div class="text-xs line-clamp-1 text-text-400 opacity-100 transition-opacity duration-200">Document'), html);
  // cO: the tilted preview card shows the first characters of a text artifact.
  assert.match(html, /<div class="flex items-end w-\[68px\] relative shrink-0 pointer-events-none" aria-hidden="true"><div class="absolute right-2 flex flex-1 overflow-hidden w-\[52px\] h-\[71px\][^"]*bg-bg-000 text-text-500[^"]*">#?\s?Hello/);
});

test('block: versions, edits, streaming, stopped and the open panel', () => {
  // An update after an answer: Version 2 on the type line (the local tool's version is trusted), an edit (not a create).
  const update = call('c2', { command: 'update', id: 'report', old_str: 'Body', new_str: 'Text' }, { version: 2 });
  const rows = [create(), answer, update];
  const html = render(rows, 2);
  assert.match(html, /Document<span class="opacity-50"> ∙ <\/span>Version 2/);
  assert.ok(html.includes('aria-label="View Quarterly report"'), 'the title comes from the create call (the store record)');
  assert.ok(html.startsWith('<div class="pt-3 pb-2"'), html);
  // Two edits in a row: the first is multi_edit_not_last (h-0 wrapper, a hidden block), the last shows.
  const again = call('c3', { command: 'update', id: 'report', old_str: 'Text', new_str: 'More' }, { version: 3 });
  const pair = [create(), answer, update, again];
  assert.equal(card.artifactCellOf(pair, 2).cellType, 'multi_edit_not_last');
  assert.equal(card.artifactCellOf(pair, 3).cellType, 'multi_edit_last');
  assert.equal(card.artifactCellOf([create(), answer], 0).cellType, 'individual_cell_create');
  const hidden = render(pair, 2);
  assert.ok(hidden.startsWith('<div class="h-0" data-transcript-stays-put="">'), hidden);
  assert.ok(hidden.includes('opacity-0 pointer-events-none transition-none'));
  // Streaming without a title yet: "Drafting artifact..." in the shimmer, no type line text.
  const drafting = render([call('c4', { command: 'create', id: 'draft' }, { status: 'inProgress', result: null })], 0, { isStreaming: true });
  assert.match(drafting, /data-cds="ShimmerText"[^>]*>Drafting artifact\.\.\./);
  // Stopped: "Stopped", no open button.
  const stopped = render([create({ status: 'interrupted' })], 0);
  assert.ok(stopped.includes('Stopped') && !stopped.includes('artifact-card-open'), stopped);
  // The open panel's artifact (the clicked block's tool use) is drawn expanded.
  const open = render([create()], 0, { selected: { id: 'report', toolUseId: 'c1' } });
  assert.ok(open.includes(`<div class="${BLOCK} border-accent-200 duration-500">`), open);
  assert.ok(!render([create()], 0, { selected: { id: 'report', toolUseId: 'other' } }).includes('border-accent-200'));
  assert.ok(render([create()], 0, { selected: { id: 'report' } }).includes('border-accent-200'), 'opened elsewhere: every block of it');
});

test('block: zh-CN copy', () => {
  i18n.setLocale('zh-CN');
  try {
    const html = render([create()], 0);
    assert.ok(html.includes('aria-label="查看 Quarterly report"'), html);
    assert.ok(html.includes('>文档'));
  } finally { i18n.setLocale('en-US'); }
  for (const key of ['Text', 'Document', 'Interactive artifact', 'Image', 'Code', 'Diagram', 'View {title}', 'Open artifact', 'Stopped', 'Making edits...',
    'Drafting artifact...', 'Version {versionNum}', 'Jump to artifact']) assert.equal(typeof zh[key], 'string', key);
});

test('model: records, version and result of the rows', () => {
  const update = call('c2', { command: 'rewrite', id: 'report', title: 'Q3 report', content: 'x' }, { version: 2 });
  assert.deepEqual(card.chatArtifactRecords([create(), answer, update]), { report: { id: 'report', title: 'Q3 report', type: 'text/markdown', latestVersion: 2 } });
  // Opening an older block's artifact shows that version; the latest block leaves the panel on the latest.
  assert.deepEqual(card.artifactOpenRequest([create(), answer, update], 0, 'report', 'c1'), { id: 'report', toolUseId: 'c1', version: 1 });
  assert.deepEqual(card.artifactOpenRequest([create(), answer, update], 2, 'report', 'c2'), { id: 'report', toolUseId: 'c2' });
  assert.equal(card.artifactResultVersion(update), 2);
  assert.deepEqual(card.artifactToolUse(update).input, { command: 'rewrite', id: 'report', title: 'Q3 report', content: 'x', version_number: 2 });
  assert.deepEqual(card.artifactToolUse(answer), { type: 'agentMessage' });
  assert.equal(card.artifactToolResult({ status: 'inProgress' }), undefined);
  assert.deepEqual(card.artifactToolResult({ status: 'interrupted' }), { cancelled: true });
  assert.deepEqual(card.artifactToolResult({ status: 'completed' }), { is_error: false });
  // A failed call writes nothing.
  assert.deepEqual(card.chatArtifactRecords([create({ status: 'failed' })]), {});
});

test('wiring: main.jsx draws the block for a Chat artifacts row and restores focus on close; Jump to artifact lands in the panel', () => {
  const main = local('src/main.jsx');
  assert.ok(main.includes('import { SourceChatArtifactCard, restoreChatArtifactTrigger } from "./source-chat-artifact-card.jsx";'));
  assert.ok(main.includes('<SourceChatArtifactCard rows={displayedItems} index={index} threadId={current} isStreaming={isItemStreaming(state, current, item)}'));
  assert.ok(main.includes('onOpen={({ id, toolUseId, version }) => setChatArtifact({ threadId: current, id, toolUseId, version })}'));
  assert.ok(main.includes('threadId={current} artifactId={chatArtifact.id} initialVersion={chatArtifact.version} refreshKey='));
  assert.match(local('src/source-chat-artifact-panel.jsx'), /const \[version, setVersion\] = useState\(opened\);/);
  assert.ok(main.includes('onClose={() => { setChatArtifact(null); restoreChatArtifactTrigger(); }}'));
  assert.ok(!/<ChatArtifactToolCard\b/.test(main), 'the Cowork chip is not the Chat row');
  // E41: the host imports generated files directly, never the view-tabs facade.
  assert.ok(!/generated\/view-tabs\/index/.test(local('src/source-chat-artifact-card.jsx')));
  assert.ok(!/generated\/view-tabs\/index/.test(local('src/source-chat-artifact-card-adapters.jsx')));
  // The "artifact" region: the panel body, after sidePanel, passed through by F6; the jump command and its palette row.
  assert.match(local('src/source-chat-artifact-panel.jsx'), /className="flex-1 min-h-0 bg-surface-3 overflow-auto" data-focus-region="artifact"/);
  assert.deepEqual(REGION_ORDER.slice(REGION_ORDER.indexOf('sidePanel'), REGION_ORDER.indexOf('sidePanel') + 3), ['sidePanel', 'artifact', 'overview']);
  assert.ok(PASS_THROUGH_REGIONS.has('artifact'));
  const jump = JUMP_COMMANDS.find((command) => command.id === 'jump_to_artifact');
  assert.deepEqual(jump, { id: 'jump_to_artifact', regions: ['artifact'], icon: 'Artifacts' });
  const jumped = [];
  const row = paletteActions({ jumps: [jump], onJump: (regions) => jumped.push(regions) }).find((action) => action.id === 'jump_to_artifact');
  assert.equal(row.label, 'Jump to artifact');
  assert.equal(row.icon, 'Artifacts');
  row.run();
  assert.deepEqual(jumped, [['artifact']]);
});
