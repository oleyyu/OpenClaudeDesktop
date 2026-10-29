// w13-close-chat-projects-memory (G5): project knowledge, the project pickers and memory, against 3.6556.2 (official chunks
// are read as text only). Main-process parts run on a temp user-data folder.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { localProjects } from '../electron/local-projects.mjs';
import { listKnowledge, readKnowledgeTexts } from '../electron/project-knowledge.mjs';
import { PALETTE_SETTINGS_SECTIONS, paletteActions } from '../src/sidebar-palette-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const raw = prefix => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find(name => name.startsWith(prefix + '-') && name.endsWith('.js'))), 'utf8');
const local = file => fs.readFileSync(path.join(app, file), 'utf8');
const once = (haystack, needle) => assert.equal(haystack.split(needle).length - 1, 1, needle);

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/', search: '', hash: '', href: 'app://local/' },
  addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, knowledge, generated;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  knowledge = await server.ssrLoadModule('/src/source-project-knowledge.jsx');
  generated = await server.ssrLoadModule('/src/generated/chat-knowledge/index.mjs');
});
after(() => server?.close());

// Every element of a React tree (no rendering): props.children and element-valued props.
function elements(node, out = []) {
  if (Array.isArray(node)) { for (const child of node) elements(child, out); return out; }
  if (!node || typeof node !== 'object' || !node.props) return out;
  out.push(node);
  for (const value of Object.values(node.props)) if (value && typeof value === 'object') elements(value, out);
  return out;
}

test('chatfn-projects-06: "Add text content" — kr / Ar / _r are sliced; local-projects knowledge-add-text adds a text file', async () => {
  const cf2 = raw('cf2f34ee4');
  assert.equal(cf2.split('defaultMessage:"Add text content",id:"wgxHbQ7D69"').length - 1, 2, 'Sr\'s item and kr\'s header');
  for (const pin of ['r(x.Item,{icon:"Prompt",onClick:o,children:te})', 'O({file_name:t,content:n})',
    'defaultMessage:"Add Content",id:"sl4oDC5LIS"', 'defaultMessage:"Error saving text content",id:"9U64gLEIVo"']) once(cf2, pin);
  const manifest = JSON.parse(local('src/generated/chat-knowledge/manifest.json'));
  for (const name of ['AddTextContentDialog', 'KnowledgeAddMenu', 'createTextContentDraft', 'KnowledgeCapacityBar', 'KnowledgeFileThumbnail', 'MemoryPreviewContent'])
    assert.ok(manifest.publicNames[name], name);
  assert.equal(manifest.generator, 'scripts/extract-chat-knowledge.mjs');
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-chat-knowledge.mjs')));
  // Sr's popup order: Upload from device, Add text content, (separator, GitHub, MCP), extra items.
  assert.match(local('src/generated/chat-knowledge/cf2f34ee4-uPxXNyjx.mjs'), /children: \[q, J, ne, re, ie, ae\]/);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'g5-knowledge-'));
  const config = { localProjects: [] };
  const project = await localProjects(config, { action: 'create', name: 'Launch' }, { dataDir });
  const added = await localProjects(config, { action: 'knowledge-add-text', id: project.id, title: 'Meeting notes', content: 'We ship in May.' }, { dataDir });
  assert.equal(added.added.length, 1);
  assert.deepEqual(added.files.map(file => [file.name, file.chars]), [['Meeting notes', 15]]);
  assert.deepEqual((await readKnowledgeTexts(dataDir, project.id)).map(entry => entry.text), ['We ship in May.']);
  for (const [title, content, reason] of [['a/b', 'x', 'invalid'], ['', 'x', 'invalid'], ['Empty', '   ', 'empty']]) {
    const refused = await localProjects(config, { action: 'knowledge-add-text', id: project.id, title, content }, { dataDir });
    assert.deepEqual(refused.failed.map(entry => entry.reason), [reason], title);
  }
  assert.equal((await listKnowledge(dataDir, project.id)).length, 1);
});

test('chatfn-projects-05 / 06: the Files section draws the sliced _r control, ge bar and mD cards (SSR)', () => {
  const html = renderToStaticMarkup(h(knowledge.SourceProjectKnowledge, { project: { id: 'p', name: 'P' }, call: () => new Promise(() => {}),
    initial: { files: [{ id: '00000001-0000-4000-8000-000000000000', name: 'notes.md', chars: 2048, tokens: 512 }], stats: { count: 1, tokens: 512, chars: 2048, capacity: 200000, pctUsed: 1, over: false, searchMode: false } } }));
  assert.match(html, /<input data-testid="project-doc-upload" type="file" class="hidden" multiple=""\/>/, '_r\'s hidden input');
  assert.match(html, /data-testid="project-doc-uploader-dropdown-trigger"/);
  assert.match(html, /<div class="mb-3 grid grid-rows-\[1fr\] animate-knowledge-expand"><div class="min-h-0 min-w-0 self-start"><div class=""><div role="progressbar"/);
  assert.match(html, /aria-label="Learn more about project knowledge"/);
  assert.match(html, /<div class="group\/thumbnail" data-testid="file-thumbnail">/);
  assert.match(html, />2kB<\/p>/, 'fe\'s subtitle: shared-3 FD over the text length');
  once(raw('c52b32660'), 'n("div",{className:"mb-3 grid grid-rows-[1fr] animate-knowledge-expand",children:n("div",{className:"min-h-0 min-w-0 self-start",children:n(ge,{projectUuid:t.uuid})})})');
});

test('E63 chatfn-projects-11 (locked): GitHub and MCP resource sources stay unavailable; Drive is not a knowledge source', () => {
  const cf2 = raw('cf2f34ee4');
  once(cf2, 'n&&r(Tr,{type:Y.GITHUB,isPrivateProject:l,onClick:i})');
  once(cf2, 'F=V("nebula_drift_enabled")');
  once(cf2, 'function Cr(e){return ie(e.resources).length>0&&e.url!==void 0}');
  assert.ok(!/GDRIVE|Google Drive/.test(cf2.slice(cf2.indexOf('function Sr('), cf2.indexOf('function Cr('))), 'Sr offers no Drive row');
  const manifest = JSON.parse(local('src/generated/chat-knowledge/manifest.json'));
  const adapted = Object.fromEntries(manifest.adapters.map(entry => [entry.original, entry.name]));
  assert.equal(adapted['shared-156-BLTosN8U.js#tj'], 'useKnowledgeGithubAvailable');
  assert.equal(adapted['cf2f34ee4-uPxXNyjx.js#Er'], 'KnowledgeMcpSourceItems');
  assert.equal(adapted['shared-156-BLTosN8U.js#wS'], 'useKnowledgeMcpServers');
  const adapters = local('src/source-chat-knowledge-adapters.jsx');
  assert.match(adapters, /export function useKnowledgeGithubAvailable\(\) \{\n  return false;\n\}/);
  assert.match(adapters, /export function KnowledgeMcpSourceItems\(\) \{\n  return null;\n\}/);
  assert.match(adapters, /export function useKnowledgeMcpServers\(\) \{\n  return noServers;\n\}/);
});

test('chatfn-projects-07 (blocked): cf8e2003d xe opens only from the Block scanner, a claude.ai server scan', () => {
  const cf8 = raw('cf8e2003d');
  once(cf8, 'd&&_==="project_knowledge_file"&&n(xe,{');
  once(raw('shared-5'), 'block_scanner",tier:"T3",unnamedInRum:!0,load:()=>d(()=>import("./cf8e2003d-BOtWQmFo.js")');
  const users = fs.readdirSync(ionSource).filter(name => name.endsWith('.js') && fs.readFileSync(path.join(ionSource, name), 'utf8').includes('cf8e2003d-BOtWQmFo'));
  assert.deepEqual(users, ['shared-5-Bg6ZMqvt.js']);
});

test('chatfn-projects-03: Composer mode follows c71dee58b td (Chat: chatIn3p && space && chatTab; Cowork unless blocked; two to draw)', () => {
  const c71 = raw('c71dee58b');
  once(c71, 'g=Nt&&!!n&&m,_=!h');
  assert.ok(c71.includes('if(x.length===0)return null') && c71.includes('x.length>1&&l('));
  once(raw('shared-78'), 'function mT(){return K()?.chatTab?.status==="supported"}');
  once(raw('shared-78'), 'function FJ(){let e=sE(),t=V("cowork").status;return!e&&t==="blocked_by_org_admin"}');
  assert.deepEqual(knowledge.composerModeSegments().map(entry => entry.value), ['chat', 'cowork']);
  assert.deepEqual(knowledge.composerModeSegments({ chatIn3p: false }).map(entry => entry.value), ['cowork']);
  assert.deepEqual(knowledge.composerModeSegments({ coworkBlocked: true }).map(entry => entry.value), ['chat']);
  assert.equal(knowledge.composerModeIn('cowork', knowledge.composerModeSegments({ coworkBlocked: true })), 'chat');
  assert.equal(renderToStaticMarkup(h(knowledge.SourceProjectComposerMode, { value: 'chat', onChange() {}, gates: { coworkBlocked: true } })), '', 'one segment: no control');
  assert.match(renderToStaticMarkup(h(knowledge.SourceProjectComposerMode, { value: 'chat', onChange() {} })), /aria-label="Composer mode"/);
});

test('chatfn-projects-04 / 08: the project picker — Sf search (and create), Cf / gm rows, a Cowork row\'s move-to-space', () => {
  const s16 = raw('shared-16');
  for (const pin of ['"data-testid":"move-to-space-trigger",icon:"Projects"', '"data-testid":"remove-from-space-trigger"', 'defaultMessage:"Search or create a project",id:"x1GW6kgtFG"',
    'defaultMessage:"Search projects",id:"C1IFDydllb"', 'defaultMessage:"Create project {projectName}",id:"I4jzCXCljs"', 'a(O.SearchablePopup,{className:"min-w-60",maxVisibleItems:zr,searchLabel:c,onSubmitQuery:l,children:u})'])
    assert.ok(s16.includes(pin), pin);
  const projects = [{ id: 'a', name: 'Billing', updatedAt: '2026-10-01T00:00:00Z' }, { id: 'b', name: 'Design', updatedAt: '2026-10-20T00:00:00Z' }];
  const created = [], moved = [];
  const tree = elements(knowledge.SourceChatProjectMenuItems({ kind: 'cowork', projects, currentProjectId: 'a', onMove: id => moved.push(id), onCreateProject: name => created.push(name), onRemove() {} }));
  assert.ok(tree.some(node => node.props['data-testid'] === 'move-to-space-trigger'));
  assert.ok(tree.some(node => node.props['data-testid'] === 'remove-from-space-trigger'));
  const popup = tree.find(node => typeof node.props.searchLabel === 'string');
  assert.equal(popup.props.searchLabel, 'Search or create a project');
  assert.equal(popup.props.maxVisibleItems, 8.5);
  assert.equal(popup.props.className, 'min-w-60');
  popup.props.onSubmitQuery('  Launch ');
  const idle = elements(popup.props.children('', ''));
  const rows = idle.filter(node => node.props.checkedRole === 'radio');
  assert.deepEqual(rows.map(node => [node.props.children, node.props.checked]), [['Billing', true], ['Design', false]], 'the current project first');
  rows[1].props.onClick(); rows[0].props.onClick();
  assert.deepEqual(moved, ['b']);
  const newRow = idle.find(node => node.type === knowledge.ProjectCreateRow);
  assert.equal(newRow.props.name, undefined);
  const typing = elements(popup.props.children('zzz', 'Zzz'));
  assert.equal(typing.find(node => node.type === knowledge.ProjectCreateRow).props.name, 'Zzz');
  assert.ok(!typing.some(node => node.props.children === 'No matches'));
  assert.deepEqual(created, ['Launch']);
  // nf's rows (SSR).
  assert.match(renderToStaticMarkup(h(knowledge.ProjectCreateRow, { onClick() {} })), /data-testid="picker-create-project"[\s\S]*New project/);
  assert.match(renderToStaticMarkup(h(knowledge.ProjectCreateRow, { name: 'Zzz', onClick() {} })), /aria-label="Create project Zzz"[\s\S]*Create[\s\S]*data-cds="Badge"[\s\S]*Zzz/);
  // Without create: "Search projects".
  const plain = elements(knowledge.SourceChatProjectMenuItems({ projects, currentProjectId: null })).find(node => typeof node.props.searchLabel === 'string');
  assert.equal(plain.props.searchLabel, 'Search projects');
  assert.equal(plain.props.onSubmitQuery, undefined);
  // Wiring: the Cowork row's menu (after Rename), the chat row's create, main's New project dialog.
  const sidebar = local('src/source-sidebar.jsx');
  assert.match(sidebar, /projectItems=\{mode === "cowork" && !menu\.multi && Array\.isArray\(localProjects\) \? <SourceChatProjectMenuItems kind="cowork"/);
  assert.match(sidebar, /<Choice shortcut="r" onClick=\{\(\) => \{ onClose\(\); onRename\(\); \}\}>\{t\("Rename"\)\}<\/Choice>\n    \{!header && projectItems\}/);
  assert.equal(sidebar.split('runAction("create-project", menu.session, { name })').length - 1, 2);
  const main = local('src/main.jsx');
  assert.match(main, /case "create-project": setNewProjectFor\(\{ sessionId: target\.id,/);
  assert.match(main, /\{newProjectFor && <SourceNewProjectDialog /);
  assert.match(main, /action: "assign", id: project\.id, threadId: newProjectFor\.sessionId/);
});

test('chatfn-projects-09: main approves every local project folder at startup', () => {
  const main = local('electron/main.cjs');
  const at = main.indexOf('approvedWorkspaceRoots.add(config.cwd);');
  const block = main.slice(at, at + 700);
  assert.match(block, /for \(const project of Array\.isArray\(config\.localProjects\) \? config\.localProjects : \[\]\)\n    if \(typeof project\?\.cwd === "string" && path\.isAbsolute\(project\.cwd\) && fs\.existsSync\(project\.cwd\)\) \{ approvedWorkspaceRoots\.add\(project\.cwd\); observedThreadCwds\.add\(project\.cwd\); \}/);
});

test('E63 chatfn-memory-08 (locked): the gated / account memory entries stay off, with their official conditions', () => {
  const c6b = raw('c6bba3086');
  once(c6b, 'var en="__gb__3358828110";function tn(){let e=W(en),{melangeBody:t}=Qe(),n=E(),{canExportData:r,ownDataOnly:i}=B();return e&&t&&r&&(!n||i)}');
  once(c6b, 'defaultMessage:"Turn on memory to bring your history over from another AI.",id:"rtQS/PT9/Y"');
  once(c6b, '"aria-label":"Resynthesize memory",tooltip:"Resynthesize memory (team only)"');
  once(raw('shared-182'), 'function SA(){return N("claudeai_saffron_frontend","resynthesize_enabled",!1,pt)}');
  assert.ok(raw('c57fe132c').includes('What Claude remembers'));
  for (const file of ['src/source-settings-memory.jsx', 'src/source-chat-knowledge-adapters.jsx'])
    for (const absent of ['Resynthesize', 'bring your history over', 'What Claude remembers', '/customize/memory', 'Export memory'])
      assert.ok(!local(file).includes(absent), `${file}: ${absent}`);
  assert.match(local('src/source-project-v3-adapters.jsx'), /export const useMemoryResynthesizeEnabled = \(\) => false;/);
  // The "<a>Learn more</a>" help links are left out of the Settings sentences (rendered copy has no link).
  assert.ok(!/<a[ >]/.test(Object.values((local('src/source-settings-memory.jsx').match(/export const MEMORY_COPY = Object\.freeze\(\{[\s\S]*?\}\);/) ?? [''])[0]).join('')));
});

test('memory-01 + Privacy: the ⌘K Settings rows list Privacy, Memory and Cowork as the nav does', () => {
  const ids = PALETTE_SETTINGS_SECTIONS.map(([id]) => id);
  assert.deepEqual(ids.slice(0, 4), ['preferences', 'privacy', 'usage', 'memory']);
  assert.ok(ids.includes('cowork'));
  assert.deepEqual(PALETTE_SETTINGS_SECTIONS.find(([id]) => id === 'privacy'), ['privacy', 'Privacy', 'LockShield']);
  const labels = paletteActions({ onOpenSettings() {} }).map(action => action.label);
  assert.ok(labels.includes('Settings → Privacy') && labels.includes('Settings → Memory'));
  assert.match(local('src/source-settings.jsx'), /\{id:'privacy',label:'Privacy',icon:'LockShield',group:'Settings'/);
  assert.ok(raw('shared-46').includes('id:"data-privacy-controls"'));
});

test('the sliced memory content: w / E / c6bd2cd90 x, with the host Markdown and edits (SSR)', async () => {
  const ctx = await server.ssrLoadModule('/src/source-chat-knowledge-adapters.jsx');
  const updates = [];
  const html = renderToStaticMarkup(h(ctx.ChatMemoryHostContext.Provider, { value: { available: true, query: { data: { memory: '**Bold** fact', controls: [] } }, update: value => updates.push(value), pending: false } },
    h(generated.MemoryPreviewContent, { modalView: 'synthesis', setModalView() {}, isUpdating: false })));
  assert.match(html, /<strong>Bold<\/strong> fact/);
  assert.match(html, /maxLength="100" aria-label="Tell Claude what to remember or forget"/, 'E: shared-182 EA max_control_chars (dynamic config fallback 100)');
  assert.doesNotMatch(html, /Manage edits/, 'D: no row without edits');
  once(raw('cffc9ea71'), 'import{t as x}from"./c6bd2cd90-dF7Ex-7c.js"');
});
