// W14-code r8 frame: the Code nav without Projects (fr8-07), the Show more trailing awaiting glyph and drag-click swallow
// (fr8-01 / fr8-02), the sidebar empty states in bK / xK / Yz class strings (css8-sidebar-empty-states-handcopy), the Code
// title button as c9543da06 Mp (fr8-03), official descriptors for the lineage / delete / ⋮ / rename copy (fr8-06), the
// archived-with-changes and nested-session copy (fr8-04 / fr8-05) and the Computer use permission states (sh8-01).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const app = path.resolve(import.meta.dirname, '..');
const local = (file) => readFileSync(path.join(app, file), 'utf8');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = (name) => readFileSync(path.join(snapshot, 'ion-dist/assets/v1', name), 'utf8');
const enUS = JSON.parse(readFileSync(path.join(snapshot, 'ion-dist/i18n/en-US.json'), 'utf8'));
let server, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => { await server?.close(); });
const inZh = async (run) => { i18n.setLocale('zh-CN'); try { return await run(); } finally { i18n.setLocale('en-US'); } };

const now = Math.floor(Date.now() / 1000);
const sessions = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, name: `Session ${i}`, cwd: '/fixture/work', createdAt: now - i * 60, updatedAt: now - i * 60 }));
const showMore = (html) => html.match(/<div[^>]*data-drag-key="label:showmore:[^"]*"[^>]*>.*?<\/button>/s)?.[0];

test('fr8-07: Code has no Projects nav row (shared-21 hH projects is chat / cowork; epitaxy-projects needs amber_tributary_osprey)', async () => {
  const s21 = official('shared-21-R7LldJ05.js');
  assert.match(s21, /\{id:"projects",[^}]*modes:\["chat","cowork"\]\}/);
  assert.match(s21, /\{id:"epitaxy-projects",[^}]*gate:"epitaxy-projects",[^}]*modes:\["code"\]\}/);
  const { SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const html = renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: sessions.slice(0, 1), knownFolders: ['/fixture/work'] }));
  assert.doesNotMatch(html, /<span class="min-w-0 truncate">Projects<\/span>/);
  assert.doesNotMatch(local('src/source-sidebar.jsx'), /\["Projects", "Projects", "projects"\]|SidebarNavBadge/);
  const chat = renderToStaticMarkup(React.createElement(SourceSidebar, { mode: 'chat', sessions: sessions.slice(0, 1), knownFolders: ['/fixture/work'] }));
  assert.match(chat, /<span>Projects<\/span>/, 'Chat keeps its Projects row');
});

test('fr8-01: a hidden awaiting row puts MQ awaiting at the end of the in-list Show more; awaiting rows no longer stay visible', async () => {
  const s22 = official('shared-22-Bwn3sJTG.js'), s21 = official('shared-21-R7LldJ05.js');
  assert.ok(s22.includes('trailing:X&&Me>0&&lg(we,Re)?o(q_,{kind:"awaiting"}):void 0'));
  assert.ok(s21.includes('function kQ(e,t){let n=new Set(t);return e.some(e=>!n.has(e)&&xl(e))}'));
  assert.ok(s21.includes('className:"me-[calc(var(--df-row-ctl-inset,calc((var(--df-row-h)-var(--df-row-ctl))/2))-var(--df-row-px))] ms-auto flex size-[var(--df-row-ctl)] shrink-0 items-center justify-center"'));
  // shared-21 e7 keeps paneOpen / reveal / fetchFloor / landed rows only.
  assert.match(s21, /function e7\(\{sorted:e,truncateAt:t,extraRevealed:n,hiddenCount:r,isCollapsed:i,paneOpenKeys:a,revealRowKey:o,fetchFloorKeys:s,landedKeys:c\}\)/);
  const { SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const render = (threadId) => renderToStaticMarkup(React.createElement(SourceSidebar, { sessions, knownFolders: ['/fixture/work'], state: { approvals: [{ params: { threadId } }] } }));
  const hidden = render('s29');
  assert.ok(!hidden.includes('data-source-session-id="s29"'), 'the awaiting row is not pulled into view');
  assert.ok(showMore(hidden).endsWith('<span class="me-[calc(var(--df-row-ctl-inset,calc((var(--df-row-h)-var(--df-row-ctl))/2))-var(--df-row-px))] ms-auto flex size-[var(--df-row-ctl)] shrink-0 items-center justify-center"><span role="img" aria-label="A session in this group is waiting on you" class="flex items-center justify-center"><span class="status-dot" data-kind="awaiting"></span></span></span></button>'), showMore(hidden));
  // The awaiting row is shown: no trailing seat.
  assert.doesNotMatch(showMore(render('s1')), /ms-auto flex size-\[var\(--df-row-ctl\)\]/);
  assert.doesNotMatch(local('src/source-sidebar.jsx'), /sourceSessions\.filter\(needsInput\)/);
});

test('fr8-02: Show more swallows the click a drag ends with (gX onClickCapture uX)', () => {
  const s21 = official('shared-21-R7LldJ05.js');
  assert.ok(s21.includes('function uX(e){mo()&&(e.stopPropagation(),e.preventDefault())}'));
  assert.ok(s21.includes('"data-held":L,onClickCapture:uX,onClick:R'));
  const source = local('src/source-sidebar.jsx');
  assert.match(source, /export function SourceShowMoreButton\(\{[^}]*dragging = false[^}]*\}\)/);
  assert.match(source, /onClickCapture=\{\(event\) => \{ if \(dragging\) \{ event\.stopPropagation\(\); event\.preventDefault\(\); \} \}\}\n\s+data-row="" data-roving-item=""\n\s+aria-label=\{showLess/);
  assert.match(source, /trailing=\{hiddenAwaiting \? <SectionStatusGlyph kind="awaiting" \/> : undefined\} dragging=\{!!drag\}/);
});

test('css8: the empty states use shared-21 bK / xK / Yz class strings; the hand-copied rules are gone', () => {
  const s21 = official('shared-21-R7LldJ05.js');
  for (const needle of ['className:"text-footnote text-muted-as-secondary"',
    'className:"text-footnote text-secondary underline-offset-2 hover:text-primary hover:underline hide-focus-ring focus-visible:shadow-focus"',
    'className:"flex flex-col items-center gap-2 px-4 py-6 text-center"',
    'className:"flex min-h-[200px] select-none flex-col last:flex-1 items-center justify-center gap-4 px-4 pb-10 text-center"',
    'className:"flex-1 min-h-0 flex flex-col items-center justify-center gap-2 px-2 text-center"',
    'className:"text-body text-secondary"']) assert.ok(s21.includes(needle), needle);
  const css = local('src/source-sidebar.css');
  assert.doesNotMatch(css, /source-sidebar-empty|source-sidebar-show-all|source-sidebar-failed|:has\(> \.source-sidebar-empty/);
  assert.doesNotMatch(local('src/source-sidebar.jsx'), /className="source-sidebar-(?:empty|show-all|failed)/);
});

test('fr8-03: the Code title button is c9543da06 Mp (Ap + jp, data-pane-title, Z444Es4IIr)', async () => {
  const mp = official('c9543da06-BaufrsQl.js'), s6 = official('shared-6-sd9jbJqs.js');
  assert.ok(mp.includes('function Ap(e,t){return`${t?At:Mt} mx-outset h-control ${e} rounded text-start bg-transparent border-0 hover:bg-fill-ghost-hover focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus cursor-text`}'));
  assert.ok(mp.includes('jp={pad:`px-xs`,style:{"--cds-outset-x":`var(--cds-pad-xs)`}}') || mp.includes('jp={pad:"px-xs",style:{"--cds-outset-x":"var(--cds-pad-xs)"}}'));
  assert.ok(mp.includes('defaultMessage:"{name}, rename session",id:"Z444Es4IIr"'));
  assert.ok(s6.includes('ig="truncate text-body font-medium font-control text-primary select-none"'));
  const T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  const html = renderToStaticMarkup(React.createElement(T.SourceTitlebar, { section: 'new', session: { id: 'a', name: 'A title', cwd: '/tmp/work' }, onRename() {} }));
  assert.ok(html.includes('data-pane-title="" aria-label="A title, rename session" class="truncate text-body font-medium font-control text-primary select-none mx-outset h-control px-xs rounded text-start bg-transparent border-0 hover:bg-fill-ghost-hover focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus cursor-text" style="--cds-outset-x:var(--cds-pad-xs)">A title</button>'), html);
  const zh = await inZh(() => renderToStaticMarkup(React.createElement(T.SourceTitlebar, { section: 'new', session: { id: 'a', name: 'A title', cwd: '/tmp/work' }, onRename() {} })));
  assert.match(zh, /aria-label="A title，重命名会话"/);
  // Chat / Cowork keep their own title (not in this wave).
  const chat = renderToStaticMarkup(React.createElement(T.SourceTitlebar, { surface: 'chat', section: 'new', session: { id: 'a', name: 'A title', cwd: '/tmp/work' }, onRename() {} }));
  assert.match(chat, /class="session-title st-title"/);
});

test('fr8-06: lineage, group delete, session delete and ⋮ labels use the official descriptors', async () => {
  for (const id of ['FuqQarRedf', '4D7Ot0hBpY', 'hcpszlrtjU', '4RK/3dvxuB', 'rKQPgfPvWS', 'Z444Es4IIr', 'ji3zTDJwY0']) assert.ok(enUS[id], id);
  const s21 = official('shared-21-R7LldJ05.js');
  assert.ok(s21.includes('defaultMessage:"Forked from {title}",id:"FuqQarRedf"'));
  const source = local('src/source-sidebar.jsx');
  assert.match(source, /t\("Forked from \{title\}", \{ title: sessionName\(parent\) \}\)/);
  assert.match(source, /intl\.formatMessage\(sidebarGroupMessages\.deleteBody, \{ groupName, count \}\)/);
  const { deleteGroupCopy, deleteConfirmCopy } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  assert.equal(deleteGroupCopy('Research', 2).body, '“Research” will be removed. The 2 items in it will no longer be grouped.');
  assert.equal(deleteConfirmCopy([{ id: 'x', name: 'Fix' }]).body, '“Fix” will be permanently deleted. This can’t be undone.');
  await inZh(async () => {
    assert.equal(deleteGroupCopy('Research', 0).body, '“Research”将被移除。其中没有内容。');
    assert.equal(deleteGroupCopy('Research', 0).title, '删除分组？');
    assert.equal(deleteConfirmCopy([{ id: 'x', name: 'Fix' }]).body, '“Fix”将被永久删除。此操作无法撤销。');
  });
  const model = await server.ssrLoadModule('/src/session-title-menu-model.mjs');
  assert.equal(model.sessionMenuTriggerLabel('Fix'), 'More options for Fix');
  assert.match(local('src/session-title-menu-model.mjs'), /t\("More options for \{label\}", \{ label \}\)/);
});

test('fr8-04 / fr8-05: generated inline descriptors equal en-US and the host formats them with intl', async () => {
  const groups = {
    'messages-shared-22.mjs': ['archivedWithChangesMessages', ['97BfxO8deN', 'XtKbRXFQoE', 'JdaR4uyvoG']],
    'messages-shared-20.mjs': ['nestedSessionsMessages', ['rRvonVlblb', 'sRMUaFT32i', 'RbpU5T0BsV', 'ORGsUuPnMo', 'wCLSAv7FiB', 'G1uB+fnj7o']],
    'messages-c48ea26ad.mjs': ['nestedMoveFailedMessages', ['3A4UmmpZB2', 'd8suG8Ad49']],
  };
  const zh = i18n.dictionary('zh-CN');
  for (const [file, [name, ids]] of Object.entries(groups)) {
    const messages = (await import(path.join(app, 'src/generated/sessions-page', file)))[name];
    assert.deepEqual(Object.values(messages).map((m) => m.id), ids, file);
    for (const m of Object.values(messages)) {
      assert.equal(m.defaultMessage, enUS[m.id], m.id);
      assert.ok(zh[m.defaultMessage], `zh-CN ${m.id}`);
    }
  }
  const main = local('src/main.jsx');
  assert.match(main, /createStartIntl\(\)\.formatMessage\(action === "delete" \? nestedMoveFailedMessages\.deleteFailed : nestedMoveFailedMessages\.archiveFailed, \{ count: failed \}\)/);
  assert.match(main, /description: intl\.formatMessage\(archivedWithChangesMessages\.description, \{ count \}\),/);
  assert.doesNotMatch(main, /tn\(count, "Session archived with uncommitted changes"|Couldn’t move a nested session to the top level/);
  const { nestedSessionsDescription } = await server.ssrLoadModule('/src/source-nested-sessions-confirm.jsx');
  assert.equal(nestedSessionsDescription({ action: 'archive', sessionTitle: 'Fix', nestedCount: 1, boundCount: 2, workingCount: 2 }),
    '“Fix” has a nested session. Archive only this one and it moves to the top level. 2 of them depend on this session’s checkout and can’t stay on their own. 2 nested sessions are still working and stop if you archive them too.');
  assert.equal(await inZh(() => nestedSessionsDescription({ action: 'delete', nestedCount: 3 })), '此会话有 3 个嵌套会话。只删除这个会话，嵌套会话会移到顶层。此操作无法撤销。');
});

test('sh8-01: tccState, R and the three-state badge (Not supported shows no Open System Settings)', async () => {
  const c71 = official('c71860c77-BH7EuJ1o.js');
  assert.ok(c71.includes('[J.NotSupported]:r(Y,{defaultMessage:"Not supported",id:"+FiyOTaUCW"})'));
  assert.ok(c71.includes('d.accessibility!==J.Granted&&d.accessibility!==J.NotSupported?r(_,{variant:"secondary",size:"sm"'));
  const cu = await server.ssrLoadModule('/src/source-settings-computer-use.jsx');
  assert.deepEqual(cu.computerUseTccState({ teachStatus: 'unavailable' }), { accessibility: 'notSupported', screenRecording: 'notSupported' });
  assert.equal(cu.computerUseTccState({ teachStatus: null }), null);
  assert.deepEqual(cu.computerUseTccState({ permissions: { accessibility: true, screenRecording: false } }), { accessibility: 'granted', screenRecording: 'notDetermined' });
  assert.equal(cu.computerUsePermissionRowsShown({ accessibility: 'notSupported', screenRecording: 'notSupported' }), false);
  assert.equal(cu.computerUsePermissionRowsShown({ accessibility: 'granted', screenRecording: 'notSupported' }), true);
  const badge = (status) => renderToStaticMarkup(React.createElement(cu.ComputerUsePermissionControl, { status, onOpen() {} }));
  assert.match(badge('notSupported'), /data-cds="Badge"[^>]*>.*Not supported.*<\/span><\/div>$/);
  assert.doesNotMatch(badge('notSupported'), /Open System Settings/);
  assert.match(badge('notDetermined'), /Not requested.*Open System Settings/s);
  assert.doesNotMatch(badge('granted'), /Open System Settings/);
  assert.equal(i18n.dictionary('zh-CN')['Not supported'], '不支持');
});
