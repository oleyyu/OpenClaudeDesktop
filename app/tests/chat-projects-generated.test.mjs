import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractChatProjects } from '../scripts/extract-chat-projects.mjs';

// w10-curchat-projects: the 3.6556.2 projects page parts (cbef3b9e7 s empty state, c71dee58b id project header,
// c17beaa76 Fn space card, c444bcdd7 / c365fd3fe search hooks; cd75b47e6 l, cf8745532 u and shared-18 aC re-exported
// from code-routines / routines-shared) sliced by scripts/extract-chat-projects.mjs over src/source-project-v3-adapters.jsx,
// and the host page src/source-projects.jsx that composes them the way c17beaa76 cr does. SSR only; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/projects', search: '', hash: '', href: 'app://local/projects' },
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, gen, adapters, page, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  // w11-sweep-curchat: no entry-order workaround. generated/chat/vendor-intl no longer imports source-home-adapters
  // (tests/curchat-retired.test.mjs) and that file loads cowork-scheduled shared-18 through a dynamic import(), so the
  // project graph evaluates from its own index.
  gen =await server.ssrLoadModule('/src/generated/chat-projects/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-project-v3-adapters.jsx');
  page = await server.ssrLoadModule('/src/source-projects.jsx');
});
after(() => server?.close());

const now = Date.parse('2026-10-20T10:00:00Z');
const project = (id, patch = {}) => ({ id, name: `Project ${id}`, description: `About ${id}`, cwd: `/Users/me/work/${id}`,
  createdAt: new Date(now - 864e5 * 3).toISOString(), updatedAt: new Date(now - 36e5).toISOString(), ...patch });
const list = (initialProjects, props = {}) => renderToStaticMarkup(h(page.SourceProjects, { call: () => new Promise(() => {}), onOpen: async p => p, composer: null,
  sessions: [], sessionMetadata: {}, onSession() {}, onBack() {}, onUpdated() {}, initialProjects, ...props }));

const detail = patch => renderToStaticMarkup(h(page.ProjectDetail, { project: project('a', patch), call: async () => ({}), composer: null, sessions: [], sessionMetadata: {},
  onSession() {}, onBack() {}, onUpdated() {} }));
const strip = html => html.replace(/ d="[^"]*"/g, '');

test('the generated graph is current (--check); roots, adapters, held re-exports and no 2.31226.0 imports', async () => {
  const manifest = await extractChatProjects({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  // w13-chatui-project-detail adds the instructions section / dialog, the rail divider and the conversations heading; its
  // review fix the classic header Eu, the breadcrumb nc, the drop zone qr and the memory section Jr; w13-chatfn-tools
  // (chatfn-23) the recommendations hook _e and the tools view je; w13-close-chat-project-rows the row table Ol and the
  // conversation Rename dialog hu.
  assert.deepEqual(Object.keys(manifest.publicNames).sort(), ['GalleryPageLayout', 'ProjectBreadcrumb', 'ProjectCard', 'ProjectHeader', 'ProjectInstructionsDialog', 'ProjectInstructionsSection',
    'ProjectKnowledgeDropZone', 'ProjectMemorySection', 'ProjectPageHeader', 'ProjectRailDivider', 'ProjectSessionTable', 'ProjectSessionsHeading', 'ProjectSpaceCard', 'ProjectToolsView', 'ProjectsEmptyState',
    'ProjectsLoadingSkeleton', 'RenameChatDialog', 'useProjectRecommendations', 'useProjectsSearchAnnouncement', 'useProjectsSearchKeys'].sort());
  for (const name of Object.keys(manifest.publicNames)) assert.equal(typeof gen[name] === 'function' || typeof gen[name] === 'object', true, 'index.mjs exports ' + name);
  // D1: the gallery layout, ProjectCard, the skeleton and the announcement hook stay one copy in the graph that holds them.
  assert.equal(manifest.publicNames.GalleryPageLayout.heldBy, 'code-routines');
  assert.equal(manifest.publicNames.ProjectCard.heldBy, 'routines-shared');
  const index = local('src/generated/chat-projects/index.mjs');
  assert.match(index, /export \{ l as GalleryPageLayout \} from "\.\.\/code-routines\/cd75b47e6-D74qtVoh\.mjs";/);
  assert.match(index, /export \{ u as ProjectCard \} from "\.\.\/routines-shared\/cf8745532-5Ehsv_zP\.mjs";/);
  assert.ok(!fs.existsSync(path.join(app, 'src/generated/chat-projects/cf8745532-5Ehsv_zP.mjs')));
  assert.ok(!fs.existsSync(path.join(app, 'src/generated/chat-projects/cd75b47e6-D74qtVoh.mjs')));
  for (const { name } of manifest.adapters) assert.ok(name in adapters, 'adapter ' + name);
  assert.equal(manifest.hostDifferences.length, manifest.adapters.length, 'every adapter states its host difference');
  for (const key of manifest.viewTabsCopies) assert.ok(!manifest.contexts.includes(key), key);
  for (const file of fs.readdirSync(path.join(app, 'src/generated/chat-projects')))
    assert.doesNotMatch(local('src/generated/chat-projects/' + file), /current-chat|generated\/chat\/|\.\.\/chat\//, file);
});

test('the official 3.6556.2 evidence: empty state, header pin labels, space card, and the cr composition the host follows', () => {
  const empty = official('cbef3b9e7-D1tReYw7.js');
  assert.equal(count(empty, '"items-center justify-center px-md py-12 text-center"'), 1);
  assert.equal(count(empty, 'projects:"HandBlocks"'), 1);
  assert.equal(count(empty, 'export{s as t}'), 1);
  const header = local('src/generated/chat-projects/c71dee58b-CFm4FCDB.mjs');
  // w13-chatui-project-detail review fix: the module holds both headers — id (the hub page jp's) and Eu (the classic page
  // Up's, which the host renders) — so the pin labels appear once in each.
  for (const needle of ['defaultMessage: "Unpin project"', 'defaultMessage: "Pin project"'])
    assert.equal(count(header, needle), 2, needle);
  for (const needle of ['icon: "PinFilled"', '"font-heading text-primary line-clamp-2 break-words min-w-0"', 'icon: t.is_starred ? "PinFilled" : "Pin"',
    '"mt-0.5 min-w-0 font-heading text-secondary gap-1.5 text-start line-clamp-2 break-words"'])
    assert.equal(count(header, needle), 1, needle);
  const cr = official('c17beaa76-B-uF-Ixb.js');
  for (const needle of ['className:"grid grid-cols-1 gap-x-3 md:grid-cols-2 md:gap-x-6"', 'className:"row-span-2 mb-3 grid grid-rows-subgrid md:mb-6"',
    'contentGap:"lg",title:je,search:Le,iconActions:Be,primaryAction:Ve,status:He', 'sr=["recent","created","alphabetical"]', 'P("persisted.cowork-projects-sort","recent")'])
    assert.equal(count(cr, needle), 1, needle);
  assert.ok(count(cr, 'className:"mt-10 text-center text-body text-muted-as-secondary"') >= 1);
  // w11-sweep-curchat: each li's second child is c052e7232 M (`on`, the import-twin merge hint), null unless the space
  // came from an import with a twin; local projects have no `origin`, so the host li holds the card alone.
  assert.equal(count(cr, 'n(on,{space:t.space,compact:!0})'), 1);
  assert.match(cr, /\bt as on\b[^}]*\}from"\.\/c052e7232-DGmjnP-D\.js"/);
  const twin = official('c052e7232-DGmjnP-D.js');
  assert.equal(count(twin, 'a=t.origin==="import"?i.find(e=>e.twinSpaceId===t.id):void 0;return a?e(N,{twin:a,openExistingOnMerge:n,compact:r}):null'), 1);
  assert.equal(count(twin, 'export{k as i,A as n,C as r,M as t}'), 1);
  assert.doesNotMatch(local('electron/local-projects.mjs'), /\borigin\b/);
  // The 2.31226.0 classes the host used to render are gone from the 3.6556.2 parts.
  assert.equal(count(empty, 'items-start pb-12 text-left'), 0);
  assert.equal(count(official('cf8745532-5Ehsv_zP.js'), 'absolute right-3 top-3'), 0);
});

test('the host page imports only 3.6556.2 parts (no current-chat), view-tabs through the facade', () => {
  const source = local('src/source-projects.jsx');
  assert.doesNotMatch(source, /generated\/current-chat\//);
  assert.doesNotMatch(source, /generated\/chat\//);
  assert.match(source, /from '\.\/generated\/chat-projects\/index\.mjs';/);
  assert.match(source, /from '\.\/generated\/view-tabs\/index\.js';/);
  assert.ok(source.includes("import { CdsTextArea as TextArea } from './generated/cowork-scheduled/index.mjs';"));
  assert.doesNotMatch(source, /band="tall-frame"|primaryActionCompactIcon/);
  assert.ok(source.includes('className="mt-10 text-center text-body text-muted-as-secondary"'));
  // The 2.31226.0 header adapters (src/source-project-adapters.jsx) had no importer after w10-curchat-retire;
  // w10-cleanup-final deleted them. The host context is the 3.6556.2 one (source-project-v3-adapters.jsx).
  assert.equal(fs.existsSync(new URL('../src/source-project-adapters.jsx', import.meta.url)), false);
});

test('SSR: loading paints the official skeleton; an empty list the projects empty state (cbef3b9e7 s)', () => {
  const loading = list(null);
  assert.match(loading, /role="status"/);
  assert.match(loading, /<h1 [^>]*>Projects<\/h1>/);
  assert.match(loading, /aria-label="Search projects"/);
  assert.match(loading, /aria-label="Sort projects"/);
  assert.doesNotMatch(loading, /data-grid-cell/);
  const empty = strip(list([]));
  assert.match(empty, /<div class="cds-root text-primary flex flex-col gap-md whitespace-normal text-body items-center justify-center px-md py-12 text-center"/);
  assert.match(empty, /<svg data-cds="Pictogram" width="96" height="96"[^>]*class="text-primary" aria-hidden="true">/);
  assert.match(empty, /<h3 class="max-w-xs font-medium text-secondary">Looking to start a project\?<\/h3>/);
  assert.match(empty, /<p class="max-w-xs text-footnote text-secondary">Give Claude a folder you already work from<\/p>/);
  assert.equal(count(text(empty), 'New project'), 2, 'the page primary action and the empty state CTA');
  const error = strip(renderToStaticMarkup(h(gen.ProjectsEmptyState, { headline: 'Couldn’t load your projects', description: 'Refresh the page to try again.', variant: 'error' })));
  assert.match(error, /<h3 class="max-w-xs font-medium text-secondary">Couldn’t load your projects<\/h3>/);
  assert.doesNotMatch(error, /<button/);
});

test('SSR: projects render as 3.6556.2 space cards in the cr grid, pinned first, with the folder chip and pin mark', () => {
  const html = list([project('a', { updatedAt: new Date(now - 864e5).toISOString() }), project('b', { isStarred: true })]);
  assert.match(html, /<ul id="[^"]+" role="list" aria-label="Projects" class="grid grid-cols-1 gap-x-3 md:grid-cols-2 md:gap-x-6">/);
  assert.equal(count(html, '<li class="row-span-2 mb-3 grid grid-rows-subgrid md:mb-6">'), 2);
  assert.ok(html.indexOf('>Project b</a>') < html.indexOf('>Project a</a>'), 'pinned first');
  assert.match(html, /<a href="\/space\/b" data-primary="true" class="min-w-0 truncate text-body font-medium text-primary outline-none [^"]*df-link-card">Project b<\/a>/);
  assert.equal(count(html, 'class="ms-2 shrink-0 text-muted-as-secondary"'), 1, 'only the pinned card has the pin mark');
  assert.equal(count(html, 'class="flex justify-between text-footnote text-muted-as-secondary mt-auto items-center"'), 2);
  assert.equal(count(html, 'data-cds="RelativeTime"'), 2);
  assert.match(html, /<span aria-hidden="true" class="truncate">a<\/span><span class="sr-only">\/Users\/me\/work\/a<\/span>/);
  assert.match(html, /<div data-grid-cell="" class="group relative flex h-full flex-col gap-xs rounded-card bg-surface-1 p-lg shadow-card-ring/);
});

// w13-chatui-project-detail review fix: the classic page Up renders its own header c71dee58b Eu (id is the hub page jp's).
test('SSR: the project detail header is c71dee58b Eu (h1, project menu, pin toggle, description), without share or subtitle', () => {
  const pinned = detail({ isStarred: true });
  assert.match(pinned, /<div class="mb-3"><div class="mb-2 flex items-start gap-3"><h1 class="mt-0\.5 min-w-0 font-heading text-secondary gap-1\.5 text-start line-clamp-2 break-words">Project a<\/h1><div class="h-8 flex items-center gap-1"><\/div><div class="flex items-center gap-1 ms-auto">/);
  assert.match(pinned, /aria-label="Unpin project"/);
  assert.match(pinned, /<div class="text-secondary font-base break-words line-clamp-2">About a<\/div>/);
  assert.doesNotMatch(text(pinned), /\bShare\b|Private|Shared with/);
  assert.doesNotMatch(pinned, /font-small text-muted-as-secondary/);
  const unpinned = detail({ isStarred: false });
  assert.match(unpinned, /aria-label="Pin project"/);
  // Eu's actions: the project menu trigger (shared-19 wI, Ui) then the pin toggle.
  const controls = unpinned.slice(unpinned.indexOf('flex items-center gap-1 ms-auto'));
  assert.equal(count(controls.slice(0, controls.indexOf('</h1>') === -1 ? controls.length : controls.indexOf('</h1>')), 'data-cds="Button"') >= 2, true);
});
