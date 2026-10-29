// w13-chatfn-projects SSR: the project knowledge region, the Composer mode, a chat row's project items and the project
// instructions dialog, against the 3.6556.2 copy (c71dee58b, cf2f34ee4, c52b32660, cf8e2003d, c9b54eb90, shared-16).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const read = prefix => { const [name] = fs.readdirSync(ionSource).filter(file => file.startsWith(prefix + '-') && file.endsWith('.js')); return fs.readFileSync(path.join(ionSource, name), 'utf8'); };
const official = { c71: read('c71dee58b'), cf2: read('cf2f34ee4'), c52: read('c52b32660'), cf8: read('cf8e2003d'), c9b: read('c9b54eb90'), s16: read('shared-16'), s7: read('shared-7'), s3: read('shared-3') };
const message = (text, id) => `defaultMessage:"${text}",id:"${id}"`;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const count = (haystack, needle) => haystack.split(needle).length - 1;

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/projects', search: '', hash: '', href: 'app://local/projects' },
  addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, knowledge, page, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  await server.ssrLoadModule('/src/generated/chat-projects/index.mjs');
  knowledge = await server.ssrLoadModule('/src/source-project-knowledge.jsx');
  page = await server.ssrLoadModule('/src/source-projects.jsx');
});
after(() => server?.close());

const file = (id, name) => ({ id: `0000000${id}-0000-4000-8000-000000000000`, name, type: name.split('.').pop(), size: 10, chars: 10, tokens: 3 });
const stats = patch => ({ count: 1, tokens: 3, chars: 10, capacity: 200000, pctUsed: 1, over: false, searchMode: false, ...patch });
const never = () => new Promise(() => {});
const region = props => renderToStaticMarkup(h(knowledge.SourceProjectKnowledge, { project: { id: 'p', name: 'P' }, call: never, ...props }));

test('official copy: every string the region, the mode switch, the row items and the dialog show is 3.6556.2 text', () => {
  assert.ok(official.c71.includes(message('Project knowledge', 'QzD1ze8R7g')));
  assert.ok(official.cf8.includes(message('Project knowledge', 'QzD1ze8R7g')));
  assert.ok(official.cf8.includes(message('No files in project knowledge.', 'cpUhbF2I0P')));
  assert.ok(official.cf2.includes(message('Files', 'm4vqJl0/FT')));
  assert.ok(official.cf2.includes(message('Add files', 'xrAjmQ72mN')));
  assert.ok(official.cf2.includes(message('Upload from device', '4aqdIxqFMq')));
  assert.ok(official.cf2.includes('"data-testid":"project-doc-uploader-dropdown-trigger"'));
  assert.ok(official.cf2.includes(message('Project knowledge at capacity. Remove an existing file in order to add to knowledge', 'g3hx72ya32')));
  assert.ok(official.c52.includes(message('Add PDFs, documents, or other text to reference in this project.', 'bmd77gBQO4')));
  assert.ok(official.c52.includes(message('Project knowledge capacity', 'hlct7UzKxm')));
  assert.ok(official.c52.includes(message('{pctUsed}% of project capacity used', 'barvY20yMi')));
  assert.ok(official.c52.includes(message('Search mode', 'BIYQtyYBdw')));
  assert.ok(official.c52.includes(message('Remove an existing file in order to add to knowledge', 'mSQjDnX2IA')));
  assert.ok(official.c52.includes(message('Something went wrong while deleting. Refresh the page and try again', 'SXbqNqJyhG')) || official.c52.includes('"Something went wrong while deleting. Refresh the page and try again"'));
  assert.ok(official.c52.includes('className:"grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-3"'));
  assert.ok(official.s7.includes(message('Project knowledge exceeds maximum. Remove files to continue.', 'IqUMWBoy4d')));
  assert.ok(official.c71.includes(message('Chat', 'WTrOy36sdu')) && official.c71.includes('{value:"chat",icon:"ChatSimple"'));
  assert.ok(official.c71.includes(message('Cowork', '+MH0VdRCHz')) && official.c71.includes('{value:"cowork",icon:"Chat"'));
  assert.ok(official.c71.includes(message('Composer mode', '/p75N7ud08')));
  assert.ok(official.s16.includes('"data-testid":"move-to-project-trigger",icon:"Projects"'));
  assert.ok(official.s16.includes('"data-testid":"remove-from-project-trigger",onClick:c,icon:"ProjectsX"'));
  for (const [copy, id] of [['Add to project', 'VTbz0vOf5i'], ['Change project', 'NAUE4lcFmb'], ['Remove from project', 'a+HTCm73Ij'], ['No projects yet', 'gkvdf7tU5r']])
    assert.ok(official.s16.includes(message(copy, id)), copy);
  for (const [copy, id] of [['Set project instructions', 'elABIID9nN'], ['Save instructions', 'Ds0H6Sqzyv'], ['Clear instructions', 'aHS9gkqH/s'],
    ['Think step by step and show reasoning for complex problems. Use specific examples.', '4lrLKVRpl/'], ['Error saving instructions, please try again later', 'WL3FdCcP2y']])
    assert.ok(official.c9b.includes(message(copy, id)), copy);
  assert.ok(official.s3.includes('"Failed to upload file {filename}. Project knowledge exceeds maximum. Remove files to continue."'));
});

test('SSR: the knowledge region — header, Add files trigger, empty card, tiles, capacity, Search mode, over capacity', () => {
  const empty = region({ initial: { files: [], stats: stats({ count: 0, tokens: 0, chars: 0, pctUsed: 0 }) } });
  // cf2f34ee4 ni is a plain Jt container: the region is the page rail (c71dee58b Wp), never this section (G5).
  assert.match(empty, /^<div class="w-full px-\[1\.375rem\] py-4 flex flex-col gap-2 mb-1" data-project-knowledge="">/);
  assert.ok(!empty.includes('role="region"'));
  assert.ok(official.cf2.includes('s(Jt,{className:"flex flex-col gap-2 mb-1",children:[W,G,q,Y]})'));
  assert.match(empty, /<div class="h-6 w-full flex flex-row items-center justify-between gap-4"><h3 class="text-secondary font-base-bold">Files<\/h3>/);
  assert.match(empty, /data-testid="project-doc-uploader-dropdown-trigger"/);
  assert.match(empty, /aria-label="Add files"/);
  assert.match(empty, /<div class="max-w-\[14\.5rem\]">Add PDFs, documents, or other text to reference in this project\.<\/div>/);
  assert.ok(!empty.includes('role="progressbar"'));
  const loading = region({});
  assert.ok(loading.includes('<div class="h-[10rem] w-full bg-surface-0 rounded-2xl"></div>'));
  // G5: the bar is the sliced c52b32660 ge: its percentage is ceil(tokens / maxKbTokens), as the official computes it.
  const listed = region({ initial: { files: [file(1, 'pricing.md'), file(2, 'brief.pdf')], stats: stats({ tokens: 84000, pctUsed: 42 }) } });
  // G5 (chatfn-projects-05): c52b32660 fe over the sliced shared-7 mD thumbnail (not the Code composer tile).
  assert.equal(count(listed, 'data-testid="file-thumbnail"'), 2);
  assert.ok(!listed.includes('data-knowledge-file='));
  assert.match(listed, /<div data-find-omitted="" class="relative"><div class="group\/thumbnail" data-testid="file-thumbnail">/);
  assert.match(listed, /class="uppercase truncate font-sans text-text-300 text-\[11px\] leading-\[13px\]">(md|text)</);
  assert.match(listed, /<h3 id="([^"]+)" class="file-thumbnail-fade-in text-\[12px\] break-words text-text-100 line-clamp-3">pricing\.md<\/h3>[\s\S]*?<button aria-label="Remove" aria-describedby="\1"/);
  assert.ok(official.s7.includes('defaultMessage:"Remove {name}",id:"T0e6Lh8loG"') && official.c52.includes('{size:"stretch",isEditable:d,isInSelectionMode:L}'));
  assert.match(listed, /<ul class="grid grid-cols-\[repeat\(auto-fill,minmax\(120px,1fr\)\)\] gap-3 mt-3">/);
  assert.ok(official.c52.includes('n("ul",{className:"grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-3",'));
  assert.ok(text(listed).includes('pricing.md') && text(listed).includes('brief.pdf'));
  assert.match(listed, /role="progressbar" aria-valuenow="42" aria-valuemin="0" aria-valuemax="100" aria-label="Project knowledge capacity"/);
  assert.match(listed, /translateX\(calc\(var\(--_dir, -1\) \* 58%\)\)/);
  assert.ok(text(listed).includes('42% of project capacity used'));
  assert.ok(!text(listed).includes('Search mode'));
  // G5: shared-4 Db (GrowthBook claude_ai_project_bananagrams) is off without GrowthBook (E49): ge shows its Info "Learn
  // more about project knowledge" link and no Search mode label, even while the local store is in search mode.
  assert.match(listed, /aria-label="Learn more about project knowledge" href="https:\/\/support\.anthropic\.com\/en\/articles\/9517075-what-are-projects" target="_blank"/);
  const searching = region({ initial: { files: [file(1, 'big.txt')], stats: stats({ tokens: 180000, pctUsed: 90, searchMode: true }) } });
  assert.ok(!text(searching).includes('Search mode'));
  assert.ok(searching.includes('bg-fill-warning-hover'));
  assert.match(read('shared-4'), /function Db\(\)\{let e=Y\("claude_ai_project_bananagrams"\)/);
  const full = region({ initial: { files: [file(1, 'big.txt')], stats: stats({ tokens: 210000, pctUsed: 105, over: true }) } });
  assert.ok(full.includes('flex-1 text-danger font-medium'));
  assert.ok(text(full).includes('Remove an existing file in order to add to knowledge'));
  assert.ok(text(full).includes('Project knowledge exceeds maximum. Remove files to continue.'));
  assert.match(full, /data-testid="project-doc-uploader-dropdown-trigger"[^>]*disabled=""|disabled=""[^>]*data-testid="project-doc-uploader-dropdown-trigger"/);
  assert.equal(knowledge.knowledgeFailureMessage({ name: 'a.md', reason: 'capacity' }), 'Failed to upload file a.md. Project knowledge exceeds maximum. Remove files to continue.');
  assert.equal(knowledge.knowledgeFailureMessage({ name: 'a.png', reason: 'unsupported' }), 'File type not supported here');
  assert.equal(knowledge.knowledgeFailureMessage({ name: 'a.md', reason: 'unreadable' }), 'Failed to upload file');
});

test('SSR: Composer mode (Chat first, cowork by default) above the composer, knowledge after it, on the project page', () => {
  const mode = renderToStaticMarkup(h(knowledge.SourceProjectComposerMode, { value: 'chat', onChange() {} }));
  assert.match(mode, /data-cds="SegmentedControl"/);
  assert.match(mode, /aria-label="Composer mode"/);
  assert.ok(mode.indexOf('Chat') < mode.indexOf('Cowork'));
  assert.equal(knowledge.composerModeOf('code'), 'cowork');
  assert.equal(knowledge.composerModeOf('chat'), 'chat');
  const project = { id: 'a', name: 'Billing', description: '', cwd: '/Users/me/work/a', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z' };
  const html = renderToStaticMarkup(h(page.ProjectDetail, { project, call: never, composer: h('div', { 'data-test-composer': '' }), sessions: [], sessionMetadata: {},
    onSession() {}, onBack() {}, onUpdated() {}, composerMode: 'chat', onComposerMode() {}, initialKnowledge: { files: [], stats: stats({ count: 0, tokens: 0, chars: 0, pctUsed: 0 }) } }));
  const at = needle => { const index = html.indexOf(needle); assert.ok(index >= 0, needle); return index; };
  assert.ok(at('data-cds="SegmentedControl"') < at('data-test-composer') && at('data-test-composer') < at('data-project-knowledge'));
  // Without a handler (no Composer mode wiring) the switch is not drawn.
  const plain = renderToStaticMarkup(h(page.ProjectDetail, { project, call: never, composer: null, sessions: [], sessionMetadata: {}, onSession() {}, onBack() {}, onUpdated() {} }));
  assert.ok(!plain.includes('data-cds="SegmentedControl"'));
});

test('SSR: a chat row’s project items — Add to project / Change project, the radio rows, Remove from project', () => {
  const projects = [{ id: 'a', name: 'Billing' }, { id: 'b', name: 'Research' }];
  const none = renderToStaticMarkup(h(knowledge.SourceChatProjectMenuItems, { projects, currentProjectId: null }));
  assert.match(none, /data-testid="move-to-project-trigger"/);
  assert.ok(text(none).includes('Add to project'));
  assert.ok(!none.includes('remove-from-project-trigger'));
  const inside = renderToStaticMarkup(h(knowledge.SourceChatProjectMenuItems, { projects, currentProjectId: 'b' }));
  assert.ok(text(inside).includes('Change project'));
  assert.match(inside, /data-testid="remove-from-project-trigger"/);
  assert.ok(text(inside).includes('Remove from project'));
  assert.equal(count(inside, 'data-cds-icon-row=""'), 2);
  // A project that no longer exists reads as none.
  assert.ok(text(renderToStaticMarkup(h(knowledge.SourceChatProjectMenuItems, { projects, currentProjectId: 'gone' }))).includes('Add to project'));
});

// w13-chatui-project-detail replaced the host dialog with the sliced c9b54eb90 ze (generated/chat-projects), opened from
// the rail's Instructions section (cf2f34ee4 ri); tests/w13-chat-project-detail.test.mjs renders it.
test('the project instructions dialog takes c9b54eb90 ze / pe copy (SourceDialog is a portal: read from the source)', () => {
  const source = fs.readFileSync(path.join(app, 'src/source-projects.jsx'), 'utf8');
  // w13-chatfn-tools (chatfn-23): the rail shows the recommended tools strip (no hideRecommendedTools).
  assert.ok(source.includes('<ProjectInstructionsSection project={record} canEditKnowledgeBase isProjectShared={false} onConnectorClick={noop} />'));
  const dialog = fs.readFileSync(path.join(app, 'src/generated/chat-projects/c9b54eb90-C9rXk4ZP.mjs'), 'utf8').replace(/\s+/g, ' ');
  for (const copy of ['Set project instructions', 'Clear instructions', 'Save instructions', 'Think step by step and show reasoning for complex problems. Use specific examples.',
    'Error saving instructions, please try again later']) assert.ok(dialog.includes(`defaultMessage: "${copy}"`), copy);
  assert.ok(dialog.includes('"data-testid": "custom-instructions-textarea"') && dialog.includes('rows: 16'));
  // pe: "Clear instructions" when saved text is emptied (x = r.length > 0 && y.length === 0); Save disabled while unchanged (r === y).
  assert.ok(official.c9b.includes('x = r.length > 0 && y.length === 0') || /x=r\.length>0&&y\.length===0/.test(official.c9b));
  assert.ok(/disabled:r===y/.test(official.c9b));
});

test('zh-CN: every string this lane renders is translated (R9)', () => {
  for (const key of ['Project knowledge', 'Files', 'Add files', 'Upload from device', 'Project knowledge at capacity. Remove an existing file in order to add to knowledge',
    'Add PDFs, documents, or other text to reference in this project.', 'Project knowledge capacity', '{pctUsed}% of project capacity used', 'Search mode',
    'Remove an existing file in order to add to knowledge', 'Project knowledge exceeds maximum. Remove files to continue.',
    'Failed to upload file {filename}. Project knowledge exceeds maximum. Remove files to continue.', 'Failed to upload file', 'File type not supported here',
    'Something went wrong while deleting. Refresh the page and try again', 'Chat', 'Cowork', 'Composer mode', 'Add to project', 'Change project', 'No projects yet',
    'Remove from project', 'Set project instructions', 'Save instructions', 'Clear instructions',
    'Think step by step and show reasoning for complex problems. Use specific examples.', 'Error saving instructions, please try again later', 'Project instructions'])
    assert.equal(typeof zh[key], 'string', key);
  assert.equal(zh['{pctUsed}% of project capacity used'].includes('{pctUsed}'), true);
  assert.equal(zh['Failed to upload file {filename}. Project knowledge exceeds maximum. Remove files to continue.'].includes('{filename}'), true);
});
