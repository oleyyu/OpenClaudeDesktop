// account2 batch 7, region chat-projects: the 4.16336.0 projects page parts (scripts/extract-chat-projects-v4.mjs ->
// src/generated/chat-projects-v4, over src/source-chat-projects-v4-adapters.jsx), which src/source-projects.jsx,
// src/source-chats-page.jsx and src/source-routines.jsx import since the round-3 switch S6 (the 3.6556.2
// src/generated/chat-projects is still generated for its old consumer cowork-approval). Source checks (manifest, --check,
// pins, D1 links, adapter module), SSR of the generated roots, and SSR of the host page as it is on disk (the cutover
// edits of account2/chat-projects/patches/source-projects.cutover.patch are asserted present, each exactly once).
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
import { extractChatProjectsV4, ROOTS, HOST_ADAPTERS, LINKED_ROOTS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-chat-projects-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const out = 'src/generated/chat-projects-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const h = React.createElement;

// The same DOM stand-ins as tests/sessions-page-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/projects', search: '', hash: '', href: 'app://local/projects', origin: 'app://local' },
  addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), history: { state: null } };

// The cutover patch's edits to src/source-projects.jsx: each result is in the host file exactly once, its anchor no more.
const CUTOVER_EDITS = [
  ['ProjectsLoadingSkeleton,\n', 'ProjectsLoadingSkeleton, projectsSearchMessages,\n'],
  ["from './generated/chat-projects/index.mjs';", "from './generated/chat-projects-v4/index.mjs';"],
  ['useProjectsSearchAnnouncement(rows.length, query, { singular: t(SEARCH_NOUNS.singular), plural: t(SEARCH_NOUNS.plural) });',
    'useProjectsSearchAnnouncement(rows.length, query, projectsSearchMessages);'],
];

let server, gen, page, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  page = await server.ssrLoadModule('/src/source-projects.jsx');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

const now = Date.parse('2026-10-20T10:00:00Z');
const project = (id, patch = {}) => ({ id, name: `Project ${id}`, description: `About ${id}`, cwd: `/Users/me/work/${id}`,
  createdAt: new Date(now - 864e5 * 3).toISOString(), updatedAt: new Date(now - 36e5).toISOString(), ...patch });
const list = initialProjects => renderToStaticMarkup(h(page.SourceProjects, { call: () => new Promise(() => {}), onOpen: async p => p, composer: null,
  sessions: [], sessionMetadata: {}, onSession() {}, onBack() {}, onUpdated() {}, initialProjects }));
const detail = patch => renderToStaticMarkup(h(page.ProjectDetail, { project: project('a', patch), call: async () => ({}), composer: null, sessions: [], sessionMetadata: {},
  onSession() {}, onBack() {}, onUpdated() {} }));
const strip = html => html.replace(/ d="[^"]*"/g, '');

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-chat-projects-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-chat-projects-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(a => (typeof a === 'string' ? a : a.area)), ['code-routines-v4', 'cowork-scheduled-v4', 'routines-shared-v4', 'working-line-v4',
    'cowork-runs-v4', 'sessions-page-v4', 'code-current-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const [area, digest] of Object.entries(provenance.linkedAreas))
    assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), digest, `linked ${area}`);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractChatProjectsV4({ check: true });
});

test('roots: the semantic names, AST-located and pinned, all exported by index.mjs; linked roots are one copy', () => {
  const names = provenance.roots.map(r => `${r.file}#${r.local}=${r.name}`);
  assert.equal(names.length, Object.values(ROOTS).reduce((n, rs) => n + Object.keys(rs).length, 0));
  for (const r of provenance.roots) {
    assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
    assert.notEqual(gen[r.name], undefined, r.name);
  }
  assert.ok(names.includes('c17beaa76-CF6cnZoR.js#Sr=projectsSearchMessages'));
  assert.ok(names.includes('shared-140-DfG6VwpK.js#ts=RenameChatDialog'));
  // 4.16336.0 c17beaa76 Sr: the page's announcement copy (the hook takes it from its caller).
  assert.equal(gen.projectsSearchMessages.noMatch.id, 'yZCgW45frU');
  assert.equal(gen.projectsSearchMessages.matching.id, 'QqdHdTRDWT');
  assert.equal(count(official('c17beaa76-CF6cnZoR.js'), 'fn(Y.length,f,Sr)'), 1);
  const index = local(`${out}/index.mjs`);
  for (const [name, l] of Object.entries(LINKED_ROOTS)) {
    assert.ok(index.includes(`export { ${l.key.split('#')[1]} as ${name} } from "../${l.area}/${l.target}";`), name);
    assert.equal(typeof gen[name], 'function', name);
    assert.ok(!fs.existsSync(path.join(app, out, l.target)), `no local copy of ${l.target}`);
  }
});

test('host boundaries: every adapted original pinned and used; imports only generated / react / cds-core / linked / adapter', () => {
  assert.equal(provenance.adapters.length, Object.keys(HOST_ADAPTERS).length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  for (const a of Object.values(HOST_ADAPTERS)) assert.ok(used.has(a.name), a.name);
  for (const a of provenance.adapters) assert.match(a.declarationSha256, /^[0-9a-f]{64}$/);
  for (const m of manifest.modules) for (const i of m.imports)
    assert.ok(['generated', 'react', 'shared-graph', 'linked', 'adapter'].includes(i.kind), `${m.target} ${i.local}: ${i.kind}`);
  // D1: shared-2's segmenter cache is code-current-v4's copy; shared-62 (errors / analytics state) is cowork-runs-v4's.
  const from = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from)));
  assert.ok(from.has('../code-current-v4/chunk-shared-2.mjs'));
  assert.ok(from.has('../cowork-runs-v4/shared-62.mjs'));
  // The host adapter module keeps the 3.6556.2 host context (one LocalProjectContext for both graphs).
  const adapters = local('src/source-chat-projects-v4-adapters.jsx');
  assert.match(adapters, /import \{ LocalProjectContext \} from '\.\/source-project-v3-adapters\.jsx';/);
  assert.doesNotMatch(adapters, /generated\/chat-projects\//);
});

test('production (round-3 switch S6): the host imports the 4.16336.0 graph; the 3.6556.2 output is untouched and no host file imports it', () => {
  const old = JSON.parse(local('src/generated/chat-projects/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2');
  for (const m of old.modules) assert.equal(sha(local(`src/generated/chat-projects/${m.target}`)), m.sha256, m.target);
  const projects = local('src/source-projects.jsx');
  for (const [a, b] of CUTOVER_EDITS) {
    assert.equal(count(projects, b), 1, `cutover edit: ${b}`);
    if (!b.includes(a)) assert.equal(count(projects, a), 0, `cutover anchor left: ${a}`);
  }
  assert.doesNotMatch(projects, /SEARCH_NOUNS/);
  // The space card's link is shared-frame Card.Link (useCdsLinkProps): it navigates through the CDS router context the
  // official app root provides (shared-46 {navigate, resolveHref, intentHandlers}); the page provides it over its router.
  assert.equal(count(official('cf8745532-CfAsJsxA.js'), 't(i.Link,{dir:y,href:c,"data-primary":!0,className:b,children:l})'), 1);
  assert.equal(count(official('shared-46-Cx3Fc1bY.js'), '{navigate:n,resolveHref:r,intentHandlers:ee}'), 1);
  assert.equal(count(projects, 'const cdsRouter = useMemo(() => ({ navigate: href => router.navigate(href) }), [router]);'), 1);
  assert.equal(count(projects, '<RoutinesSharedHost.Provider value={router}><CdsRouterContext.Provider value={cdsRouter}>'), 1);
  // The Chats page's gallery layout and the Routines list's skeleton / search keys / announcement are the same bindings.
  assert.match(local('src/source-chats-page.jsx'), /^import \{ GalleryPageLayout \} from '\.\/generated\/chat-projects-v4\/index\.mjs';$/m);
  assert.match(local('src/source-routines.jsx'), /^import \{ ProjectsLoadingSkeleton as LoadingGrid, useProjectsSearchKeys as useSearchKeys, useProjectsSearchAnnouncement as useSearchAnnouncement \} from '\.\/generated\/chat-projects-v4\/index\.mjs';$/m);
  for (const file of fs.readdirSync(path.join(app, 'src')).filter(name => /\.(m?js|jsx)$/.test(name)))
    assert.doesNotMatch(local(`src/${file}`), /from ['"]\.\/generated\/chat-projects\//, `host ${file} imports the 3.6556.2 chat-projects graph`);
});

test('SSR roots: the 4.16336.0 empty state (error variant, no CTA) and the rail divider', () => {
  const error = strip(renderToStaticMarkup(h(gen.ProjectsEmptyState, { headline: 'Couldn’t load your projects', description: 'Refresh the page to try again.', variant: 'error' })));
  assert.match(error, /<h3 class="max-w-xs font-medium text-secondary">Couldn’t load your projects<\/h3>/);
  assert.match(error, /<p class="max-w-xs text-footnote text-secondary">Refresh the page to try again\.<\/p>/);
  assert.doesNotMatch(error, /<button/);
  assert.equal(renderToStaticMarkup(h(gen.ProjectRailDivider)), '<div class="h-[0.5px] w-full bg-border"></div>');
});

test('SSR host page over the 4.16336.0 graph (cutover edits): projects list as CDS Cards, pinned first; empty and loading states', () => {
  const html = list([project('a'), project('b', { isStarred: true })]);
  assert.match(html, /<h1 class="cds-reset min-w-0 font-voice font-medium[^"]*">Projects<\/h1>/);
  assert.match(html, /<main data-scrolls-under-page-header="" class="flex flex-1 flex-col"/);
  assert.equal(count(html, '<div data-cds="Card" data-grid-cell=""'), 2);
  assert.equal(count(html, 'data-cds="CardLink" data-primary="true"'), 2);
  assert.ok(html.indexOf('>Project b</a>') < html.indexOf('>Project a</a>'), 'pinned first');
  assert.equal(count(html, 'class="ms-2 shrink-0 text-muted-as-secondary"'), 1, 'only the pinned card has the pin mark');
  assert.match(html, /<span aria-hidden="true" class="truncate">a<\/span><span class="sr-only">\/Users\/me\/work\/a<\/span>/);
  const empty = strip(list([]));
  assert.match(empty, /<h3 class="max-w-xs font-medium text-secondary">Looking to start a project\?<\/h3>/);
  const loading = list(null);
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-label="Search projects"/);
  assert.doesNotMatch(loading, /data-grid-cell/);
});

test('SSR host page over the 4.16336.0 graph (cutover edits): project detail header, pin toggle, 4.16336.0 type tokens', () => {
  const pinned = detail({ isStarred: true });
  assert.match(pinned, /<h1 class="mt-0\.5 min-w-0 font-heading text-secondary gap-1\.5 text-start line-clamp-2 break-words">Project a<\/h1>/);
  assert.match(pinned, /aria-label="Unpin project"/);
  assert.match(pinned, /<div class="text-secondary text-body-regular break-words line-clamp-2">About a<\/div>/);
  assert.match(pinned, /<h3 class="text-secondary text-body-medium">Instructions<\/h3>/);
  assert.match(pinned, /data-cds="Toolbar" role="toolbar" aria-label="Page tools"/);
  assert.match(detail({}), /aria-label="Pin project"/);
});
