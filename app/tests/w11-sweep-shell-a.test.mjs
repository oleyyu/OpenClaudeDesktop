// w11-sweep-shell-a: the shell sweep over the w10-shell-* lanes' open items. Source-only checks: 3.6556.2 minified
// originals (read, never run), SSR of the host sidebar, and CSS text. Covers
//   - shared-22 IE / GC: the session list's local place bucket ("This computer") and a preset bucket get GC's "+"
//     (shared-21 H7) and an enabled New session (source-sidebar.jsx sessionsPlaceNewSession / sessionsPresetNewSession);
//   - dead host CSS removed after w11-frame-root-cont / w10-shell-model-menu (.df-collapsed-chrome, .df-collapsed-nav,
//     .sm-model-badge);
//   - the items judged matches-official, locked on the original text they rest on.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const chunk = (name) => readFileSync(path.join(v1, name), 'utf8');
const src = (file) => readFileSync(path.join(app, file), 'utf8');

let server, SourceSidebar;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
});
after(async () => { await server?.close(); });

const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
const render = (props) => renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [thread('s1')], knownFolders: ['/fixture/work'], ...props }));

test('3.6556.2 original: GC draws H7 for any onNewSession; IE hands one to the local place and to a preset bucket', () => {
  const s22 = chunk('shared-22-Bwn3sJTG.js');
  for (const feature of [
    'x?o(Ah,{groupLabel:n,onNewSession:x,target:w,kind:X?"group":Y}):null', // GC: the "+" whenever onNewSession is set
    'W=O===zE?"no_folder":oe?"other":N?"preset":t.unsaved?"place":"folder"', // IE bucket kinds
    'de=N?N.id:ue?lT:se||G?null:void 0', // IE: a preset starts in its environment, a local place with nothing (null)
    'v(U,void 0,de)', // IE Z: New session
    'N&&(v(U,void 0,N.id),Yv(N.id))', // IE fe: Edit environment starts there first
  ]) assert.ok(s22.includes(feature), feature);
  const s21 = chunk('shared-21-R7LldJ05.js');
  assert.ok(s21.includes('newSessionIn:{defaultMessage:"New session in {group}",id:"2F3XOf5s1W"}'));
});

test('the session list draws the "+" on This computer and on a preset bucket, not on Other', () => {
  const place = render({ sessions: [thread('s1', { cwd: '/tmp/plain' })], repoIdentities: { '/tmp/plain': { isRepo: false } },
    onProject() {}, onSessionAction() {}, onNew() {} });
  assert.match(place, /data-group-key="project:kind::local"/);
  assert.match(place, /aria-label="New session in This computer"/);
  // Without the sidebar's New session there is nothing to start: no "+".
  const bare = render({ sessions: [thread('s1', { cwd: '/tmp/plain' })], repoIdentities: { '/tmp/plain': { isRepo: false } }, onProject() {}, onSessionAction() {} });
  assert.doesNotMatch(bare, /New session in This computer/);
  const environments = [{ id: 'E1', name: 'App env', createdAt: 2, target: { kind: 'local', cwd: '/w/app' } }];
  const preset = render({ sessions: [thread('a', { cwd: '/w/app' })], knownFolders: ['/w/app'], savedEnvironments: environments,
    sessionMetadata: { a: { environmentId: 'E1' } }, repoIdentities: { '/w/app': { isRepo: true, owner: 'o', name: 'app' } },
    sidebarSections: [{ id: 'pinned', kind: 'pinned', order: 0 }, { id: 'sessions', kind: 'sessions', order: 1, groupBy: 'savedEnvironment' }],
    onSessionAction() {}, onProject() {}, onNewSessionInEnvironment() {} });
  assert.match(preset, /data-group-key="project:preset::E1"/);
  assert.match(preset, /aria-label="New session in App env"/);
  assert.doesNotMatch(preset, /New session in Other/);
});

test('source-sidebar.jsx wires the place and preset New session into folderMenu, groupActions and trailing', () => {
  const sidebar = src('src/source-sidebar.jsx');
  assert.match(sidebar, /const sessionsPlaceNewSession = \(group\) => group\?\.unsaved\?\.kind === "local" && onNew \? \(\) => onNew\(\) : undefined;/);
  assert.match(sidebar, /const sessionsPresetNewSession = \(group\) => group\?\.kind === "environment" && typeof group\.environmentId === "string" && onNewSessionInEnvironment/);
  assert.ok(sidebar.includes('newSession: group.cwd && onProject ? () => onProject(group.cwd) : sessionsPlaceNewSession(group),'));
  assert.ok(sidebar.includes('(group.cwd && onProject) || sessionsPlaceNewSession(group) || sessionsPresetNewSession(group) ||'));
});

test('dead host CSS is gone: the collapsed chrome is laid out by its official classes, the model badge by CdsBadge', () => {
  const nav = src('src/source-nav-buttons.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(nav, /^\s*\.df-collapsed-chrome\s*\{|\.st-toolbar \.df-collapsed-chrome|^\s*\.df-collapsed-nav\s*\{/m);
  const styles = readFileSync(path.join(v1, 'shared-styles-D_GJawPO.css'), 'utf8');
  const navOffset = '.dframe-root[data-variant=web]:not([data-web]):not([data-wco])[data-collapsed] .dframe-sidebar:not([data-density=comfortable]) .df-collapsed-nav{margin-inline-start:-2px}';
  assert.ok(styles.includes(navOffset), 'the official -2px nav offset applies in the aside');
  // The selector only matches while the host root keeps data-variant="web" without data-web / data-wco, and the aside
  // stays a compact .dframe-sidebar (review #2): lock those host facts so the offset cannot silently stop applying.
  const main = src('src/main.jsx');
  assert.match(main, /\n\s+data-variant="web"\n\s+data-frame-mode=\{mode\}/);
  assert.doesNotMatch(main.replace(/\/\/.*$/gm, '').replace(/`[^`]*`/g, ''), /\sdata-(?:web|wco)=/);
  assert.match(src('src/source-sidebar.jsx'), /className="app-sidebar dframe-sidebar source-sidebar cds-root" aria-label=\{t\("Sidebar"\)\} data-variant="web" data-density="compact"/);
  assert.ok(readFileSync(path.join(v1, 'c6a992d55-Che1orl5.css'), 'utf8').includes('.draggable-none{-webkit-app-region:no-drag;app-region:no-drag}'));
  assert.doesNotMatch(src('src/source-model-menu.css'), /sm-model-badge/);
  assert.doesNotMatch(src('src/source-sidebar-resize-adapters.jsx'), /\.sidebar-collapsed \.dframe-resize-handle/);
});

test('matches-official locks: the panels fizzy-lake branch is off, so oG keeps its divider and uG never re-keys to "empty"', () => {
  const s4 = chunk('shared-4-DUB1Oi0O.js');
  // shared-4 np (cc43287c9 `es as ec`): the panels fizzy-lake flag, localStorage or data-cds-fizzy-lake (E12: off).
  assert.ok(s4.includes('ht.getItem(tp)==="1"||'));
  assert.ok(s4.includes('fr(document.documentElement.getAttribute("data-cds-fizzy-lake"),["panels"])'));
  const cc = chunk('cc43287c9-Me-M2ucD.js');
  assert.ok(cc.includes('ec()&&e.isSessionNotFound&&!e.onSessionRemoved&&!e.isInsidePopoutWindow?"empty":"held"'));
  // oG's divider gate Ee: false unless the panels branch is on.
  assert.ok(cc.includes('Ee=!1;'));
  assert.ok(cc.includes('Zs("panels")&&(Ee='));
});

test('matches-official locks: the Fast row tooltip side, the pill-pending class and the slash list virtualizer', () => {
  // shared-frame Vb (CdsEndSideTooltip, shared-7 aw `te`): right unless the direction is rtl; the host has no rtl locale.
  assert.ok(chunk('shared-frame-6jtSkIit.js').includes('C()==="rtl"?"left":"right"'));
  assert.match(src('src/source-model-menu.jsx'), /<SourceTooltip content=\{content\} side="right" multiline hoverable=\{false\}/);
  // shared-6 _j only adds html.product-switch-pending, which only animates the web pills' .df-pill-indicator (shared-21
  // fT draws df-pills for `(m||_==="web")`); the desktop titlebar switcher has no indicator.
  assert.ok(chunk('shared-6-sd9jbJqs.js').includes('function _j(){xj=performance.now(),document.documentElement.classList.add(pj)}'));
  assert.ok(chunk('shared-6-sd9jbJqs.js').includes('pj="product-switch-pending"'));
  assert.ok(chunk('shared-21-R7LldJ05.js').includes('(m||_==="web")&&H.length>=2'));
  assert.doesNotMatch(src('src/source-app-switch.jsx'), /df-pill-indicator|df-pills/);
});
