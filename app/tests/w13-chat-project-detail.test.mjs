// w13-chatui-project-detail (research/w13-chatui.md P1b / P2 / P3 / P4): the classic 3.6556.2 project page (c71dee58b Up,
// shown while yukon_silver_dramatic_shrimp_atrium is off), its knowledge rail (cf2f34ee4 Gr) with the sliced Instructions
// section (cf2f34ee4 ri) and dialog (c9b54eb90 ze), the conversations' Pinned / Recents sections (c71dee58b Zl / Ql) and
// the project card's overlay menu (c17beaa76 ir). Source-only: the generator's --check, SSR through Vite, the official
// chunks read as text (never executed), and the local-projects service on a temp directory.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { extractChatProjects } from '../scripts/extract-chat-projects.mjs';
import { localProjects, applyProjectContext } from '../electron/local-projects.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const read = prefix => { const [name] = fs.readdirSync(ionSource).filter(file => file.startsWith(prefix + '-') && file.endsWith('.js')); return fs.readFileSync(path.join(ionSource, name), 'utf8'); };
const official = { c71: read('c71dee58b'), cf2: read('cf2f34ee4'), c9b: read('c9b54eb90'), c17: read('c17beaa76'), s9: read('shared-9'), s78: read('shared-78'), s26: read('shared-26') };
const message = (text, id) => `defaultMessage:"${text}",id:"${id}"`;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const count = (haystack, needle) => haystack.split(needle).length - 1;

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/projects', search: '', hash: '', href: 'app://local/projects' },
  addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, page, gen, adapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/chat-projects/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-project-v3-adapters.jsx');
  page = await server.ssrLoadModule('/src/source-projects.jsx');
});
after(() => server?.close());

const never = () => new Promise(() => {});
const project = patch => ({ id: 'a', name: 'Billing', description: 'Invoices', cwd: '/tmp/a', createdAt: 1, updatedAt: 2, ...patch });
const detail = props => renderToStaticMarkup(h(page.ProjectDetail, { project: project(), call: never, composer: h('div', { 'data-test-composer': '' }), sessions: [], sessionMetadata: {},
  onSession() {}, onBack() {}, onUpdated() {}, initialKnowledge: { files: [], stats: null }, ...props }));
const session = (id, updatedAt) => ({ id, name: `Chat ${id}`, updatedAt });

test('official copy and markup the page composes are 3.6556.2 text', () => {
  // P2: Up is the page while the hub gate is off; its grid, columns, rail and conversation parts.
  assert.ok(official.s26.includes('e=W("yukon_silver_dramatic_shrimp_atrium")'));
  assert.ok(official.c71.includes('!i){let e=J2($,35,d,t)?K2($,35,d,t,l(Up,{uuid:t,composer:d})):$[37]'));
  for (const literal of ['l(Pr,{className:"grid grid-cols-7 xl:grid-cols-12"', '"col-span-7 flex flex-col gap-4"', '"col-span-7 xl:col-span-5 mt-4 xl:mt-0 xl:ps-12 xl:pe-4"',
    'className:"col-span-7 flex flex-col mt-2 gap-4",children:l(Su,', 'className:"pb-20"', 'Xl=20', 'name:"Chat",size:"xxl",className:"text-muted-as-secondary"'])
    assert.equal(count(official.c71, literal), 1, literal);
  assert.ok(official.c71.includes(message('Project knowledge', 'QzD1ze8R7g')));
  assert.ok(official.c71.includes(message('Claude references the same knowledge every time you talk to it in this project.', '8vqFHSl3AB')));
  assert.ok(official.c71.includes(message('Recents', 'CRKRWkBSJ8')) && official.c71.includes('b?l(Z,{...Pi.pinned}):l(Z,{defaultMessage:"Starred",id:"V7cUPvWFo3"})'));
  assert.ok(official.s9.includes('pinned:{defaultMessage:"Pinned",id:"A8GDlh2QW4"}') && official.s9.includes('showMore:{defaultMessage:"Show more",id:"aWpBzjCXKS"}'));
  // shared-78 gK (c71dee58b Ct, c17beaa76 Z): the selector is constant true, so the page and the card use the pin wording.
  assert.ok(official.s78.includes('K4($,0,r,t,e,n,e=>!0):$[4];return it(i)}'));
  assert.ok(official.cf2.includes('className:"border-0.5 border-border-300 rounded-2xl flex flex-col"'));
  // P3: ri and ze.
  for (const [copy, id] of [['Instructions', 'Cntk+3fYyG'], ['Edit instructions', 'n3KUHr3aw6'], ['Add instructions to tailor Claude\\u2019s responses', '4GjbhiCNw3']])
    assert.ok(official.cf2.includes(message(copy, id)), copy);
  for (const [copy, id] of [['Set project instructions', 'elABIID9nN'], ['Save instructions', 'Ds0H6Sqzyv'], ['Clear instructions', 'aHS9gkqH/s'],
    ['Error saving instructions, please try again later', 'WL3FdCcP2y']]) assert.ok(official.c9b.includes(message(copy, id)), copy);
  // P1b: ir.
  for (const literal of ['"data-testid":"star-space-trigger"', '"data-testid":"rename-space-trigger"', 'w=d?r?"PinSlash":"Pin":r?"StarSlash":"Star"',
    'icon:"DotsVertical",variant:"ghost",tooltip:!1,className:"pointer-events-auto"', message('More options for {label}', 'rKQPgfPvWS'), message('Edit details', 'h6iaDH57nU')])
    assert.equal(count(official.c17, literal), 1, literal);
});

test('the generator is current (--check): the instructions section / dialog, divider and heading are sliced; their services are adapters', async () => {
  const manifest = await extractChatProjects({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.deepEqual(manifest.publicNames.ProjectInstructionsDialog, { file: 'c9b54eb90-C9rXk4ZP.js', local: 'ze' });
  assert.deepEqual(manifest.publicNames.ProjectInstructionsSection, { file: 'cf2f34ee4-uPxXNyjx.js', local: 'ri' });
  assert.deepEqual(manifest.publicNames.ProjectRailDivider, { file: 'cf2f34ee4-uPxXNyjx.js', local: 'Yt' });
  assert.deepEqual(manifest.publicNames.ProjectSessionsHeading, { file: 'c71dee58b-CFm4FCDB.js', local: 'Ql' });
  const adapted = Object.fromEntries(manifest.adapters.map(entry => [entry.original, entry.name]));
  // w13-chatfn-tools (chatfn-23): De / je are sliced now; their claude.ai services pe / ye are the adapters.
  for (const [original, name] of [['c9b54eb90-C9rXk4ZP.js#pe', 'useProjectToolOptions'], ['c9b54eb90-C9rXk4ZP.js#ye', 'useRecommendedToolConfigs'],
    // review fix: Eu / qr / Jr's services (Zt itself is sliced now: Jr shows its "Only you" variant).
    ['shared-4-DUB1Oi0O.js#Xb', 'useProjectStarToggle'], ['cf2f34ee4-uPxXNyjx.js#ur', 'ExampleProjectTooltip'], ['cb4e4d5b7-JEa8C518.js#te', 'loadExtensionMimes'],
    ['c274117ff-D-nlAnp_.js#v', 'useProjectMemoryModal'], ['c274117ff-D-nlAnp_.js#_', 'useMemoryAvailable'], ['c274117ff-D-nlAnp_.js#O', 'ProjectMemoryDialog'],
    ['shared-182-BI1KJccu.js#SA', 'useMemoryResynthesizeEnabled'], ['shared-182-BI1KJccu.js#tA', 'useMemoryResynthesize'], ['shared-182-BI1KJccu.js#$k', 'useProjectMemoryQuery'],
    ['shared-156-BLTosN8U.js#ch', 'useSettingsLinkClick'], ['shared-182-BI1KJccu.js#Hz', 'useProjectQueriesInvalidate']]) {
    assert.equal(adapted[original], name, original);
    assert.ok(manifest.hostDifferences.some(entry => entry.original === original), original);
  }
  // D1: the dialog's copy table and latched-view hook stay sessions-page's single copy.
  const dialog = fs.readFileSync(path.join(app, 'src/generated/chat-projects/c9b54eb90-C9rXk4ZP.mjs'), 'utf8');
  assert.match(dialog, /import \{ sidebarMessages as ee \} from "\.\.\/sessions-page\/pure-shared-78\.mjs";/);
  assert.match(dialog, /import \{ useLatchedValue as E \} from "\.\.\/sessions-page\/pure-shared-52\.mjs";/);
  assert.ok(manifest.callSites.some(site => site.source === 'c71dee58b-CFm4FCDB.js' && site.features.includes('Xl=20')));
  assert.ok(manifest.callSites.some(site => site.source === 'c17beaa76-B-uF-Ixb.js' && site.features.includes('"data-testid":"star-space-trigger"')));
  for (const name of ['ProjectInstructionsDialog', 'ProjectInstructionsSection', 'ProjectRailDivider', 'ProjectSessionsHeading']) assert.equal(typeof gen[name], 'function', name);
});

test('SSR P2: Up’s grid — the left column (header, composer, conversations) and the knowledge rail region after it', () => {
  const html = detail();
  assert.match(html, /class="surface-project-detail cds-root relative flex h-full max-lg:flex-col max-lg:overflow-y-auto"/);
  // Review fix: Up's scroll column under the in-place title row (`!ee && "pt-frame-row"`, c8ad300b7 Dt's attribute).
  assert.match(html, /<div data-scrolls-under-page-header="" class="flex-1 min-w-0 overflow-y-auto h-full max-lg:flex-none max-lg:h-auto max-lg:overflow-y-visible \[scrollbar-gutter:stable\] pt-frame-row">/);
  assert.match(html, /class="mx-auto mt-4 w-full flex-1 px-md md:px-8 lg:mt-6 max-w-7xl grid grid-cols-7 xl:grid-cols-12"/);
  const left = html.indexOf('class="col-span-7 flex flex-col gap-4"'), rail = html.indexOf('role="region" aria-label="Project knowledge" class="col-span-7 xl:col-span-5 mt-4 xl:mt-0 xl:ps-12 xl:pe-4"');
  assert.ok(left > 0 && rail > left);
  assert.ok(html.indexOf('data-test-composer') > left && html.indexOf('data-test-composer') < rail);
  assert.ok(html.indexOf('class="col-span-7 flex flex-col mt-2 gap-4"><div class="pb-20">') > html.indexOf('data-test-composer'));
  // Gr: one bordered rail column — Instructions, Yt's divider, then the Files section (w13-chatfn-projects).
  const box = html.indexOf('class="border-0.5 border-border-300 rounded-2xl flex flex-col"');
  const instructions = html.indexOf('>Instructions</h3>'), divider = html.indexOf('class="h-[0.5px] w-full bg-border"'), files = html.indexOf('>Files</h3>');
  assert.ok(box > rail && instructions > box && divider > instructions && files > divider);
});

test('SSR P3: the rail’s Instructions section (cf2f34ee4 ri) — placeholder or the saved text, and the Edit / Add button', () => {
  const empty = detail();
  assert.match(empty, /<span class="opacity-60">Add instructions to tailor Claude’s responses<\/span>/);
  assert.match(empty, /<p class="text-muted-as-secondary font-small line-clamp-2">/);
  assert.match(empty, /aria-label="Edit instructions"/);
  assert.match(empty, /class="w-full px-\[1\.375rem\] py-4 flex flex-row items-center justify-between gap-4 mt-1"/);
  const saved = detail({ project: project({ instructions: 'Answer in bullet points.' }) });
  assert.ok(text(saved).includes('Answer in bullet points.'));
  assert.ok(!saved.includes('Add instructions to tailor'));
  assert.equal(count(saved, 'aria-label="Edit instructions"'), 1);
  // No shared badge, no recommended tools strip (nothing recommended: w13-chatfn-tools), and the host menu no longer carries the instructions.
  assert.ok(!saved.includes('Only you') && !saved.includes('All project users'));
  assert.ok(!fs.readFileSync(path.join(app, 'src/source-project-v3-adapters.jsx'), 'utf8').includes("host.edit('instructions')"));
});

test('SSR P3: the dialog closed renders nothing; the mutation maps prompt_template to the local instructions', async () => {
  const record = { uuid: 'a', name: 'Billing', prompt_template: '' };
  assert.equal(renderToStaticMarkup(h(gen.ProjectInstructionsDialog, { currentView: undefined, setCurrentView() {}, onClose() {}, project: record, hideRecommendedTools: true })), '');
  const saved = [];
  let mutation;
  const Probe = () => { mutation = adapters.useProjectMutation('a'); return null; };
  const updated = [];
  renderToStaticMarkup(h(adapters.LocalProjectContext.Provider, { value: { save: async patch => { saved.push(patch); return patch; }, update: async patch => { updated.push(patch); return patch; } } }, h(Probe)));
  await mutation.mutateAsync({ prompt_template: 'Be brief.' });
  await mutation.mutateAsync({ prompt_template: '' });
  await mutation.mutateAsync({ is_starred: true });
  // The dialog's save skips the page error line (ze toasts its own failure); the header's pin goes through update.
  assert.deepEqual(saved, [{ instructions: 'Be brief.' }, { instructions: '' }]);
  assert.deepEqual(updated, [{ isStarred: true }]);
  let prevented = false;
  let click;
  renderToStaticMarkup(h(() => { click = adapters.useSettingsLinkClick('/settings/general'); return null; }));
  click({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test('SSR P2: conversations — empty state, Pinned (collapsible) then Recents, 20 rows at a time behind Show more', () => {
  const empty = detail();
  assert.match(empty, /class="flex flex-col items-center justify-center gap-sm py-16 text-center"/);
  assert.ok(text(empty).includes('Claude references the same knowledge every time you talk to it in this project.'));
  assert.ok(!empty.includes('Give Claude a task'));
  const sessions = Array.from({ length: 23 }, (_, index) => session(`s${index}`, 100 - index));
  const sessionMetadata = Object.fromEntries(sessions.map(({ id }, index) => [id, { projectId: 'a', surface: 'chat', ...(index < 2 ? { pinned: true } : {}) }]));
  sessionMetadata.other = { projectId: 'b' };
  const html = detail({ sessions: [...sessions, session('other', 1)], sessionMetadata });
  const pinned = html.indexOf('>Pinned</h2>'), recents = html.indexOf('>Recents</h2>');
  assert.ok(pinned > 0 && recents > pinned);
  assert.match(html, /<button type="button" aria-expanded="true" class="group\/header flex items-center justify-between gap-2 text-start"><h2 class="text-sm text-muted-as-secondary">Pinned<\/h2>/);
  assert.match(html, /<h2 class="text-sm text-muted-as-secondary">Recents<\/h2>/);
  assert.ok(text(html.slice(pinned, recents)).includes('Chat s0') && text(html.slice(pinned, recents)).includes('Chat s1'));
  // w13-close-chat-project-rows: each section's rows are Ol's table rows (one row link each).
  assert.equal(count(html, 'data-row-link=""'), 2 + 20);
  assert.ok(!text(html).includes('Chat other') && !text(html.slice(recents)).includes('Chat s22'));
  assert.match(html, /class="self-center text-sm text-muted-as-secondary hover:text-secondary transition-colors py-2 disabled:opacity-50">Show more<\/button>/);
  const sections = page.projectSessionSections(sessions, sessionMetadata, 'a');
  assert.deepEqual([sections.pinned.length, sections.recents.length], [2, 21]);
});

test('SSR P1b: the project card carries ir’s overlay trigger; Pin / Unpin and Edit details, no Archive', () => {
  const space = { id: 'a', name: 'Billing', description: '', createdAt: 1, updatedAt: 2, folders: [] };
  const html = renderToStaticMarkup(h(gen.ProjectSpaceCard, { space, updatedAtMs: 2, overlay: h(page.ProjectCardMenu, { space, isStarred: false, onToggleStarred() {}, onEdit() {} }) }));
  assert.match(html, /class="absolute end-3 top-3 opacity-0 group-hover:opacity-100/);
  assert.match(html, /aria-label="More options for Billing"/);
  assert.match(html, /pointer-events-auto/);
  const source = fs.readFileSync(path.join(app, 'src/source-projects.jsx'), 'utf8');
  const menu = source.slice(source.indexOf('export function ProjectCardMenu('), source.indexOf('function CreateProject('));
  assert.ok(menu.includes(`data-testid="star-space-trigger" onClick={onToggleStarred} icon={isStarred ? 'PinSlash' : 'Pin'}>{t(isStarred ? 'Unpin' : 'Pin')}`));
  assert.ok(menu.includes(`data-testid="rename-space-trigger" onClick={() => setTimeout(onEdit, 100)} icon="Edit">{t('Edit details')}`));
  assert.ok(!menu.includes('archive-space-trigger'));
});

test('local projects: instructions save / clear and reach a session; knowledge files add / remove', async (t) => {
  const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'w13-project-detail-'));
  t.after(() => fsp.rm(dataDir, { recursive: true, force: true }));
  const config = {};
  const created = await localProjects(config, { action: 'create', name: 'Billing' }, { dataDir });
  const saved = await localProjects(config, { action: 'update', id: created.id, instructions: '  Answer in bullet points.  ' }, { dataDir });
  assert.equal(saved.instructions, 'Answer in bullet points.');
  const params = { cwd: created.cwd, codeDesktop: { projectId: created.id } };
  applyProjectContext(config, 'thread/start', params, 'chat');
  assert.equal(params.developerInstructions, 'Project instructions:\nAnswer in bullet points.');
  const pinnedProject = await localProjects(config, { action: 'update', id: created.id, isStarred: true }, { dataDir });
  assert.equal(pinnedProject.isStarred, true);
  const cleared = await localProjects(config, { action: 'update', id: created.id, instructions: '' }, { dataDir });
  assert.equal(cleared.instructions, '');
  const again = { cwd: created.cwd, codeDesktop: { projectId: created.id } };
  applyProjectContext(config, 'thread/start', again, 'chat');
  assert.equal(again.developerInstructions, undefined);
  const source = path.join(dataDir, 'notes.md');
  await fsp.writeFile(source, 'Invoices are due in 30 days.');
  const added = await localProjects(config, { action: 'knowledge-add', id: created.id }, { dataDir, pickFiles: async () => [source] });
  assert.deepEqual(added.files.map(file => file.name), ['notes.md']);
  const listed = await localProjects(config, { action: 'knowledge-list', id: created.id }, { dataDir });
  assert.equal(listed.files.length, 1);
  const removed = await localProjects(config, { action: 'knowledge-remove', id: created.id, fileId: added.files[0].id }, { dataDir });
  assert.deepEqual(removed.files, []);
});

test('zh-CN: the strings this lane shows are translated (R9)', () => {
  for (const key of ['Instructions', 'Edit instructions', 'View instructions', 'Add instructions to tailor Claude’s responses', 'Couldn’t load instructions.', 'Try again',
    'Set project instructions', 'Project instructions', 'Save instructions', 'Clear instructions', 'Cancel', 'Close', 'Power your project with tools',
    'Provide Claude with relevant instructions and information for chats within {projectName}.',
    'This will work alongside your <link>profile instructions</link> and the selected style in a chat.',
    'Claude references the same knowledge every time you talk to it in this project.', 'Pinned', 'Recents', 'Show more', 'Show', 'Hide',
    'More options for {label}', 'More options', 'Pin', 'Unpin', 'Edit details', 'Edit project', 'Project knowledge'])
    assert.equal(typeof zh[key], 'string', key);
  assert.ok(zh['More options for {label}'].includes('{label}'));
});

// Review fix (w13-chatui-project-detail.review.md items 1–4): Up's own header Eu and breadcrumb nc, Gr's drop zone qr and
// the project memory section Jr, sliced and composed the way Up / Gr place them.
test('review fix: Eu, nc, qr and Jr are the official parts, placed as Up / Gr place them (3.6556.2 text)', () => {
  for (const literal of ['xe=J1($,38,g)?K1($,38,g,l(Eu,{project:g})):$[39]', 'l(nc,{includeLinkToProjects:!0,allProjectsHref:G,plainCrumb:a,liftInto:H})', '!ee&&"pt-frame-row"',
    message('Example project', '4WeMw9ILKV'), '"mt-0.5 min-w-0 font-heading text-secondary gap-1.5 text-start line-clamp-2 break-words"'])
    assert.equal(count(official.c71, literal), 1, literal);
  assert.ok(official.c71.includes(message('All projects', 'NZLQi1PTsg')));
  assert.ok(official.c71.includes('"df-link-card inline-flex h-6 shrink-0 select-none items-center gap-1 rounded-md px-1.5 text-[13px] text-secondary-control transition-colors hover:bg-neutral-30 hover:text-primary"'));
  for (const literal of ['r(qr,{onFiles:R,className:"relative",disabled:N,control:P,message:_e,children:ke})',
    've=J5($,48,se,X,g,ge,fe)?K5($,48,se,X,g,ge,fe,!g&&r(Zr,{...ge,dividerBefore:!1,dividerAfter:X||se||!!fe})):$[53]',
    'D==="melange"?r($r,{project:t}):D==="saffron"?r(Jr,{projectUuid:t.uuid,canEditMemory:M})', message('Drop files here to add to project knowledge', 'Y0PcamE2yZ'),
    message('Only you', 'yaicSElWIF'), message('Edit memory', 'XjSodKcOXH')])
    assert.equal(count(official.cf2, literal), 1, literal);
  for (const name of ['ProjectPageHeader', 'ProjectBreadcrumb', 'ProjectKnowledgeDropZone', 'ProjectMemorySection']) assert.equal(typeof gen[name], 'function', name);
});

test('SSR review fix: nc’s "All projects" row in place over the scroll column, then Eu (h1, menu, Pin / Unpin, description)', () => {
  const html = detail();
  const row = html.indexOf('class="dframe-header group/title-row absolute inset-x-0 top-0 flex h-frame-row items-center');
  const crumb = html.indexOf('<a href="/projects" class="df-link-card inline-flex h-6 shrink-0 select-none items-center gap-1 rounded-md px-1.5 text-[13px] text-secondary-control transition-colors hover:bg-neutral-30 hover:text-primary">');
  const scroll = html.indexOf('data-scrolls-under-page-header=""');
  assert.ok(row > 0 && crumb > row && scroll > crumb);
  assert.ok(html.slice(crumb, scroll).includes('All projects</a>'));
  assert.match(html, /<h1 class="mt-0\.5 min-w-0 font-heading text-secondary gap-1\.5 text-start line-clamp-2 break-words">Billing<\/h1>/);
  assert.ok(html.indexOf('aria-label="More options for Billing"') > html.indexOf('>Billing</h1>'));
  assert.ok(html.indexOf('aria-label="Pin project"') > html.indexOf('aria-label="More options for Billing"'));
  assert.ok(html.includes('<div class="text-secondary font-base break-words line-clamp-2">Invoices</div>'));
  assert.ok(!html.includes('Example project') && !html.includes('>Projects</'));
  assert.ok(detail({ project: project({ isStarred: true }) }).includes('aria-label="Unpin project"'));
});

test('SSR review fix: qr wraps the bordered rail; with memory on, Jr leads it (Memory, Only you, the text, Edit memory) and Yt follows', () => {
  const plain = detail();
  assert.match(plain, /<div class="relative"><div class="border-0\.5 border-border-300 rounded-2xl flex flex-col">/);
  assert.ok(!plain.includes('Drop files here') && !plain.includes('>Memory<'));
  const on = { settings: { enabled: true, paused: false }, memory: { memory: 'Prefers short answers.', controls: [], updated_at: '2026-10-01T00:00:00.000Z' }, synthesizing: false };
  const html = detail({ initialMemory: on });
  const box = html.indexOf('rounded-2xl flex flex-col'), memory = html.indexOf('>Memory<'), badge = html.indexOf('Only you'), instructions = html.indexOf('>Instructions</h3>');
  assert.ok(box > 0 && memory > box && badge > memory && instructions > badge);
  assert.ok(html.slice(badge, instructions).includes('class="h-[0.5px] w-full bg-border"'));
  assert.ok(text(html).includes('Prefers short answers.') && html.includes('aria-label="Edit memory"') && text(html).includes('Last updated'));
  assert.match(html, /class="flex flex-row items-center font-small gap-1 ps-1\.5 pe-2 py-\[3px\] text-muted-as-secondary rounded-md border-0\.5 border-border-300"/);
  const empty = detail({ initialMemory: { ...on, memory: { memory: '', controls: [], updated_at: null } } });
  assert.ok(empty.includes('<span class="opacity-60">Project memory will show here after a few chats.</span>'));
  assert.ok(!empty.includes('aria-label="Edit memory"'));
  for (const off of [{ ...on, settings: { enabled: false, paused: false } }, { ...on, settings: { enabled: true, paused: true } }])
    assert.ok(!detail({ initialMemory: off }).includes('Only you'));
});

test('local projects: knowledge-add-content adds dropped files through private copies; unsafe names and non-bytes are refused', async (t) => {
  const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'w13-project-drop-'));
  t.after(() => fsp.rm(dataDir, { recursive: true, force: true }));
  const config = {};
  const created = await localProjects(config, { action: 'create', name: 'Billing' }, { dataDir });
  const temps = () => fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('openclaude-knowledge-'));
  const before = temps();
  const result = await localProjects(config, { action: 'knowledge-add-content', id: created.id, files: [
    { name: 'notes.md', bytes: new TextEncoder().encode('# Notes\nInvoices are due monthly.') },
    { name: '../escape.md', bytes: new Uint8Array([65]) }, { name: 'a/b.md', bytes: new Uint8Array([65]) }, { name: 'x.md', bytes: 'text' }] }, { dataDir });
  assert.deepEqual(result.added.map(entry => entry.name), ['notes.md']);
  assert.deepEqual(result.failed.map(entry => entry.reason), ['invalid', 'invalid', 'invalid']);
  assert.deepEqual(result.files.map(entry => entry.name), ['notes.md']);
  assert.deepEqual(temps(), before);
  assert.ok(!fs.existsSync(path.join(dataDir, 'escape.md')));
  await assert.rejects(localProjects(config, { action: 'knowledge-add-content', id: created.id, files: 'notes.md' }, { dataDir }));
});

test('zh-CN: the review fix’s strings are translated (R9)', () => {
  for (const key of ['All projects', 'Example project', 'Pin project', 'Unpin project', 'Show less', 'Memory', 'Only you', 'Edit memory', 'Couldn’t load project memory.',
    'Last updated {time}', 'Project memory will show here after a few chats.', 'Drop files here to add to project knowledge', 'Project name'])
    assert.equal(typeof zh[key], 'string', key);
});

// w13-close-chat-project-rows (G10): Zl's rows through Ol (c71dee58b, view-tabs' CdsDataTable = ce802b15a Mo), the chat cell
// Nl with its conversation menu (shared-16 Lf → Ff) and Rename dialog (shared-16 hu), the cowork cell Ml; E69 kG off; the
// review's low items (verified state key and raven gate, the profile instructions link, one starred rule).
const official2 = { s16: read('shared-16'), s0: read('shared-0'), ce8: read('ce802b15a') };
test('G10: Ol / Nl / Ff / hu are 3.6556.2 text; the generator slices Ol and hu over view-tabs’ CdsDataTable and the row adapters', async () => {
  for (const literal of ['l(bo,{data:t,columns:Tl,getRowKey:_l,getRowHref:vl,activeRowId:_,linkComponent:Sl,getRowLinkLabel:m,onRowClick:p,flush:!0})',
    'function vl(e){return e.kind==="chat"?`/chat/${e.conversation.uuid}`:`${et}/${e.session.sessionId}`}', 'l(jo,{title:c,titleAccessories:m,rail:C})',
    'cellClassName:"hover:has-[[data-row-link]:active]:bg-alpha-2"',
    '!w&&l(Ol,{items:N,onPreviewFile:v,analyticsSource:m,plainRows:_})', 'F.length>0&&l(Ol,{items:F,onPreviewFile:v,analyticsSource:m,plainRows:_})'])
    assert.equal(count(official.c71, literal), 1, literal);
  assert.ok(official.c71.includes(message('More options for {chatName}', 'ukZKEVU02W')) && official.c71.includes(message('Local task', 'LX4QnxZM3M')));
  assert.ok(official2.ce8.includes('Mo=f(d(To))') && official2.ce8.includes('Mo as t'));
  for (const literal of ['"data-testid":"star-chat-trigger",onClick:K,icon:t.is_starred?"PinSlash":"Pin",shortcut:"p"', '"data-testid":"rename-chat-trigger",onClick:C,icon:"Edit",shortcut:"r"',
    'variant:"danger","data-testid":"delete-chat-trigger",onClick:w,icon:"Trash",shortcut:"d"', '"data-testid":"name-chat"', '"data-testid":"name-chat-submit"'])
    assert.equal(count(official2.s16, literal), 1, literal);
  // The collapse key Zl reads (review low 7): shared-0 cu.COWORK_SPACE_STARRED_COLLAPSED.
  assert.ok(official2.s0.includes('COWORK_SPACE_STARRED_COLLAPSED="user-cowork-space-starred-collapsed"'));
  const manifest = await extractChatProjects({ check: true });
  assert.deepEqual(manifest.publicNames.ProjectSessionTable, { file: 'c71dee58b-CFm4FCDB.js', local: 'Ol' });
  assert.deepEqual(manifest.publicNames.RenameChatDialog, { file: 'shared-16-ByfgAyLr.js', local: 'hu' });
  const adapted = Object.fromEntries(manifest.adapters.map(entry => [entry.original, entry.name]));
  for (const [original, name] of [['shared-16-ByfgAyLr.js#Lf', 'ProjectConversationMenu'], ['shared-130-dWztbTO1.js#B_', 'useRenameConversation'],
    ['c71dee58b-CFm4FCDB.js#Ml', 'ProjectCoworkSessionRow'], ['c71dee58b-CFm4FCDB.js#xl', 'ProjectCoworkRowLink'], ['shared-182-BI1KJccu.js#kG', 'useIntegrationsAvailable']]) {
    assert.equal(adapted[original], name, original);
    assert.ok(manifest.hostDifferences.some(entry => entry.original === original), original);
  }
  const c71 = fs.readFileSync(path.join(app, 'src/generated/chat-projects/c71dee58b-CFm4FCDB.mjs'), 'utf8');
  // D1: the data table is view-tabs' one copy, published as CdsDataTable.
  assert.match(c71, /import \{ CdsDataTable as bo \} from "\.\.\/view-tabs\/ce802b15a-C7eXhKeI\.js";/);
  assert.ok(!fs.existsSync(path.join(app, 'src/generated/chat-projects/ce802b15a-C7eXhKeI.mjs')));
  const vt = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.deepEqual(vt.publicNames.CdsDataTable, { file: 'ce802b15a-C7eXhKeI.js', local: 'Mo', export: 't' });
  assert.equal(typeof gen.RenameChatDialog, 'function');
  assert.ok(gen.ProjectSessionTable && typeof gen.ProjectSessionTable === 'object', 'Ol = w(function (e) {…}), a memo component');
});

test('SSR G10: the sections render Ol’s table — row links /chat/<id> and /cowork/<id>, Nl’s title, pin mark, date and menu trigger, Ml’s Local task', () => {
  const sessions = [{ id: 's1', name: 'Chat one', updatedAt: 100 }, { id: 's2', name: '', preview: 'hello', updatedAt: 90 }, { id: 's3', name: '', updatedAt: 85 }, { id: 'c1', name: '', updatedAt: 80 }];
  const sessionMetadata = { s1: { projectId: 'a', surface: 'chat', pinned: true }, s2: { projectId: 'a', surface: 'chat' }, s3: { projectId: 'a', surface: 'chat' }, c1: { projectId: 'a', surface: 'cowork' } };
  const html = detail({ sessions, sessionMetadata });
  const pinned = html.indexOf('>Pinned</h2>'), recents = html.indexOf('>Recents</h2>');
  assert.ok(pinned > 0 && recents > pinned);
  // Ol's wrapper (El + Dl) around CdsDataTable's table.
  assert.equal(count(html, '<div class="w-full [&amp;_thead]:!border-0 [&amp;_thead_th]:!h-0 [&amp;_thead_th]:!p-0 [&amp;_thead_th]:!leading-[0] [&amp;_thead_th&gt;*]:hidden -mt-1 [&amp;_tbody_tr:first-child]:!bg-none"><div data-cds="DataTable"'), 2);
  assert.ok(html.slice(pinned, recents).includes('<a href="/chat/s1" aria-label="Chat one" class="cds-reset absolute inset-0 z-[1] cursor-[inherit] rounded outline-none focus-visible:outline-hidden focus-visible:shadow-focus df-link-card" data-row-link=""></a>'));
  // Nl: jo's title, the pinned conversation's mark (gK true: PinFilled), the date rail and the More options trigger.
  assert.match(html, /<span class="min-w-0 truncate text-body text-primary">Chat one<\/span><span data-cds="Icon"[^>]*class="flex-shrink-0 text-muted-as-secondary"/);
  assert.ok(html.includes('class="flex-shrink-0 text-body text-muted first-letter:capitalize min-w-8 text-end group-hover/cdsrow:opacity-0'));
  assert.ok(html.includes('aria-label="More options for Chat one"') && html.includes('aria-haspopup="menu"'));
  const rest = html.slice(recents);
  assert.ok(rest.includes('href="/chat/s2" aria-label="hello"') && rest.includes('href="/chat/s3" aria-label="Untitled"'));
  assert.ok(rest.includes('<span class="min-w-0 truncate text-body text-primary">Untitled</span>'));
  // Ml (host row): the cowork session's link and "Local task".
  assert.ok(rest.includes('<a href="/cowork/c1" aria-label="Local task"') && rest.includes('<span class="min-w-0 truncate text-body text-primary">Local task</span>'));
  assert.equal(count(rest, 'aria-label="More options for'), 2, 'chat rows only');
});

test('G10: row links open the session; the menu and Rename act on the local session; the profile instructions link opens Settings > Instructions', async () => {
  const page = fs.readFileSync(path.join(app, 'src/source-projects.jsx'), 'utf8');
  for (const piece of ['<ProjectSessionTable items={items(pinned)} />', '<ProjectSessionTable items={items(recents.slice(0, shown))} />',
    '<RenameChatDialog isOpen initialName={renaming.name} conversationUuid={renaming.uuid}', "<ChatDeleteDialog open conversation={deleting}",
    'const row = /^\\/(?:chat|cowork)\\/([^/?#]+)$/.exec(String(href));', 'splitStarredRows(rows, session => chatSessionStarred(sessionMetadata[session.id]))'])
    assert.ok(page.includes(piece), piece);
  assert.ok(!page.includes('surface-project-session'));
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const tag = main.slice(main.indexOf('<SourceProjects '), main.indexOf('/>', main.indexOf('<SourceProjects ')));
  assert.ok(tag.includes('onSessionAction={sessionAction}') && tag.includes('onOpenSettings={(page) => setSettings(page)}'));
  // hu's mutation (B_) and the menu's pin go to the host sessionAction with the session id.
  const calls = [];
  let rename, click;
  const host = { sessionAction: async (...args) => { calls.push(args); }, openSettings: pageId => calls.push(['settings', pageId]) };
  const Probe = () => { rename = adapters.useRenameConversation('s1'); click = adapters.useSettingsLinkClick('/settings/general'); return null; };
  renderToStaticMarkup(h(adapters.LocalProjectContext.Provider, { value: host }, h(Probe)));
  await rename.mutateAsync({ name: 'Renamed' });
  let prevented = false;
  click({ preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.deepEqual(calls, [['rename', 's1', { name: 'Renamed' }], ['settings', 'instructions']]);
  // Lf with Sl's contextMenuTrigger renders the link as is (no right-click menu here).
  const link = h('a', { href: '/chat/s1' });
  assert.equal(renderToStaticMarkup(h(adapters.ProjectConversationMenu, { conversation: { uuid: 's1' }, contextMenuTrigger: link })), '<a href="/chat/s1"></a>');
  const adaptersSource = fs.readFileSync(path.join(app, 'src/source-project-v3-adapters.jsx'), 'utf8');
  for (const piece of ['data-testid="star-chat-trigger"', "icon={starred ? 'PinSlash' : 'Pin'} shortcut=\"p\"", 'data-testid="rename-chat-trigger"', 'icon="Edit" shortcut="r"',
    'variant="danger" data-testid="delete-chat-trigger"', 'icon="Trash" shortcut="d"', '<CdsDropdown.Popup align="end" onKeyDownCapture={onKeyDownCapture}>'])
    assert.ok(adaptersSource.includes(piece), piece);
});

test('E69: shared-182 kG (haystack) is off, so the rail’s recommended tools strip (De) renders nothing', () => {
  assert.equal(adapters.HAYSTACK_AVAILABLE, false);
  const html = detail({ project: project({ settings: { enabled_web_search: true, recommended_mcp_servers: [] } }) });
  assert.ok(html.indexOf('>Instructions</h3>') < html.indexOf('<div class="mt-2"></div>'));
  assert.ok(!html.includes('Some tools are off') && !html.includes('Recommended Tools:'));
});

test('zh-CN: G10’s strings are translated (R9)', () => {
  for (const key of ['Local task', 'Untitled', 'More options for {chatName}', 'Rename chat', 'Name', 'Save', 'Rename', 'Delete', 'Delete chat', 'Are you sure you want to delete this chat?'])
    assert.equal(typeof zh[key], 'string', key);
});
