import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { emptySessionEntry, sanitizeSessionEntry } from '../src/tile-layout-store.mjs';

// W14-code round 4, lane panes: Finished open by default (r4pa-01), the tasks EmptyState (r4pa-05), the Changed files
// coachmark (r4pa-02), the CDS list / viewer / Back buttons (css4-pane-toggle-icon-buttons), the error report queue
// behind "Error details were sent" (r4pa-c05) and the dead serverStatus (R4DC-01). Official chunks are read as text only.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((file) => file.startsWith(name) && file.endsWith('.js'))), 'utf8');
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const count = (text, part) => text.split(part).length - 1;
const h = React.createElement;

let server, B, A, diffFileListCoachmarkEligible, diffFileListNuxDismissed, dismissDiffFileListNux, DIFF_FILE_LIST_NUX_ID, createFailureReports, FAILURE_REPORT_ATTEMPTS, FAILURE_REPORT_BACKOFF_MS, previewSurface;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  B = await server.ssrLoadModule('/src/source-background-tasks.jsx');
  A = await server.ssrLoadModule('/src/source-agent.jsx');
  ({ diffFileListCoachmarkEligible, diffFileListNuxDismissed, dismissDiffFileListNux, DIFF_FILE_LIST_NUX_ID } = await server.ssrLoadModule('/src/file-tree-row-model.mjs'));
  ({ createFailureReports, FAILURE_REPORT_ATTEMPTS, FAILURE_REPORT_BACKOFF_MS, previewSurface } = await server.ssrLoadModule('/src/preview-model.mjs'));
});
after(() => server?.close());

test('r4pa-01: Finished is open by default while nothing runs or a finished row is open; the stored choice wins', () => {
  const chunk = official('cccc2cf0a-DhZC33Gc');
  assert.equal(count(chunk, 'be=E.length===0&&A.running.length===0'), 1);
  assert.equal(count(chunk, 'openByDefault:g&&be'), 1);
  assert.equal(count(chunk, 'I=T||(j??(w||F))'), 1);
  const sections = (running, finished) => ({ running, finished });
  const done = { id: 'bash:1', kind: 'bash', status: 'completed' }, live = { id: 'bash:2', kind: 'bash', status: 'running' };
  const none = new Map();
  assert.equal(B.finishedSectionOpen(undefined, sections([], [done]), none), true, 'nothing running: open');
  assert.equal(B.finishedSectionOpen(null, sections([live], [done]), none), false, 'something running: closed');
  assert.equal(B.finishedSectionOpen(null, sections([live], [done]), new Map([['bash:1', true]])), true, 'an open finished row keeps it open');
  assert.equal(B.finishedSectionOpen(null, sections([live], [{ ...done, kind: 'agent' }]), new Map([['bash:1', true]])), false, 'only expandable rows count');
  assert.equal(B.finishedSectionOpen(false, sections([], [done]), none), false, 'a stored close wins');
  assert.equal(B.finishedSectionOpen(true, sections([live], [done]), none), true, 'a stored open wins');
  // The tile store keeps "not chosen" (null) apart from a choice; main.jsx passes it through without `|| false`.
  assert.equal(emptySessionEntry().finishedExpanded, null);
  assert.equal(sanitizeSessionEntry({}).finishedExpanded, null);
  assert.equal(sanitizeSessionEntry({ finishedExpanded: false }).finishedExpanded, false);
  assert.equal(sanitizeSessionEntry({ finishedExpanded: true }).finishedExpanded, true);
  assert.match(local('src/main.jsx'), /finishedExpanded=\{tileEntry\?\.finishedExpanded\} onFinishedExpanded=/);
  const tasks = local('src/source-background-tasks.jsx');
  assert.match(tasks, /error,finishedExpanded,onFinishedExpanded,desktop=globalThis\.desktop\}\)/);
  // EN H: a click on a button or link inside the open list keeps it open (`V(e.target)?.closest("button, a") && L(O, !0)`).
  assert.equal(count(chunk, 'V(e.target)?.closest("button, a")&&L(O,!0)'), 1);
  assert.match(tasks, /const keepFinishedOpen=event=>\{if\(event\.target\?\.closest\?\.\('button, a'\)\)onFinishedExpanded\?\.\(true\);\};/);
  // W14-code r7 r7pa-07: the list is EN's own `div` (R("flex flex-col", !P && "gap-1")), no longer the host .sbt-list.
  assert.match(tasks, /\{finishedOpen&&<div className="flex flex-col gap-1" onClickCapture=\{keepFinishedOpen\}>/);
});

test('r4pa-05: the empty task list is the official EmptyState (cc0a875c8), not the host .sbt-empty', () => {
  assert.equal(count(official('cccc2cf0a-DhZC33Gc'), 'FM=u(nd,{icon:"AgentsSimple",title:u(Z,{defaultMessage:"Background tasks appear here",id:"y+3yULewki"})})'), 1);
  const tasks = local('src/source-background-tasks.jsx');
  assert.match(tasks, /import \{f as EmptyState\} from '\.\/generated\/code-routines\/cc0a875c8-Ba9KI-Fw\.mjs';/);
  assert.match(tasks, /<EmptyState icon="AgentsSimple" title=\{t\('Background tasks appear here'\)\}\/>/);
  assert.doesNotMatch(tasks, /sbt-empty/);
  assert.doesNotMatch(local('src/source-background-tasks.css').replace(/\/\*[\s\S]*?\*\//g, ''), /\.sbt-empty/);
});

test('css4-pane-toggle-icon-buttons: the tasks Back is the CDS ghost iconOnly Button (c4db265df Q)', () => {
  assert.equal(count(official('c4db265df-fNhlkQCj'), 'variant:"ghost",iconOnly:!0,icon:"CaretLeft","aria-label":pe??G.formatMessage({defaultMessage:"Back",id:"cyR7KhiuaU"}),onClick:B,tooltip:me,className:"shrink-0"'), 1);
  const html = renderToStaticMarkup(h(A.SourceTasksPane, { state: { items: {} }, sessionId: 's', views: [{ kind: 'subagent', threadId: 't', toolId: 'x', description: 'Agent' }],
    onBack() {}, onClose() {}, onLoad: async () => {}, renderItem: () => null }));
  const back = html.match(/<button[^>]*aria-label="Back"[^>]*>/)?.[0];
  assert.ok(back, html.slice(0, 400));
  assert.match(back, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/);
  assert.match(back, / shrink-0"/);
  assert.doesNotMatch(html, /source-icon-button/);
  // No host .source-icon-button is left anywhere in the source or its sheets.
  for (const file of ['src/source-session.jsx', 'src/source-agent.jsx', 'src/source-file-viewer.jsx', 'src/source-session.css', 'src/style.css', 'src/source-file-viewer.css'])
    assert.doesNotMatch(local(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), /source-icon-button|sfv-view-toggle|SourceIconButton/, file);
  // kD / AC: the list toggles are F (shared-frame Uu) under ee (shared-frame Xm), with shortcut + pressed + pressedVariant.
  const chunk = official('cccc2cf0a-DhZC33Gc');
  assert.equal(count(chunk, 'variant:"ghost",iconOnly:!0,icon:"ListBullet",className:r?void 0:R("shrink-0",m),"aria-label":T,shortcut:v,pressed:f,pressedVariant:"selected"'), 1);
  assert.equal(count(chunk, 'variant:"ghost",iconOnly:!0,icon:"ListBullet",className:i?void 0:R("-ms-[var(--pane-title-step,4px)]",o),"aria-label":j,shortcut:T,pressed:m,pressedVariant:"selected"'), 1);
  assert.match(official('shared-frame-6jtSkIit'), /Uu as Eu,/);
  assert.match(official('shared-frame-6jtSkIit'), /Xm as Kl,/);
});

test('r4pa-02: the Changed files coachmark (c73f45bc3 Od) — eligibility, one-time storage and its wiring', () => {
  const chunk = official('c73f45bc3-B7hbL7H9');
  assert.equal(count(chunk, 'Td="epitaxy_diff_file_list_nux"'), 1);
  assert.equal(count(chunk, 'defaultMessage:"{count, plural, one {Browse the changed file} other {Browse all # changed files}}",id:"tGLHTyiKMd"'), 1);
  assert.equal(count(chunk, 'defaultMessage:"Open the file list to see everything this diff touches and jump between files.",id:"j6wj7c/ElG"'), 1);
  assert.equal(count(chunk, 't!=="coachmark"&&Dd()'), 1, 'kd: every toggle but the coachmark retires it');
  assert.equal(count(official('cccc2cf0a-DhZC33Gc'), 'M=w&&y&&!m&&p.fileCount>=2&&!s'), 1);
  assert.equal(DIFF_FILE_LIST_NUX_ID, 'epitaxy_diff_file_list_nux');
  const ok = { canFit: true, bodyEmpty: false, listShown: false, fileCount: 2 };
  assert.equal(diffFileListCoachmarkEligible(ok), true);
  for (const change of [{ canFit: false }, { bodyEmpty: true }, { listShown: true }, { fileCount: 1 }, { popout: true }])
    assert.equal(diffFileListCoachmarkEligible({ ...ok, ...change }), false, JSON.stringify(change));
  const store = new Map(), storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(diffFileListNuxDismissed(storage), false);
  dismissDiffFileListNux('shown', storage);
  assert.equal(diffFileListNuxDismissed(storage), true);
  assert.deepEqual([...store], [['code-desktop-nux:epitaxy_diff_file_list_nux', 'shown']]);
  const session = local('src/source-session.jsx');
  assert.match(session, /title=\{tn\(diffFileCount, "Browse the changed file", "Browse all \{count\} changed files"\)\} actionLabel=\{t\("Show files"\)\}/);
  assert.match(session, /label=\{t\("Changed files"\)\}/);
  assert.match(session, /const toggleDiffTree = useCallback\(\(\) => \{ retireDiffListNux\(\); setDiffShowTree/);
  assert.match(session, /onShownChange: setDiffShowTreeByHandle,/);
  assert.match(session, /onAction=\{\(\) => \{ dismissDiffFileListNux\("accepted"\); setDiffListNux\("done"\); setDiffShowTree\(true\); \}\}/);
  assert.match(session, /const diffListNuxCandidate = nuxAllowed && diffListNux !== "done" && diffListAvailable && !loading && !diffShowTree/);
  assert.doesNotMatch(session, /The lu coachmark is not ported/);
});

test('r4pa-c05: a failed Run\'s error report waits until the session takes it; the card always says it was sent', async () => {
  let clock = 0;
  const reports = createFailureReports({ now: () => clock });
  const sent = [];
  let busy = true;
  const send = async (text) => { sent.push(text); return !busy; };
  reports.queue('s1', { name: 'web', text: 'boom' });
  assert.deepEqual(await reports.flush('s1', null), { sent: false, retryIn: null }, 'no sender (disconnected): it waits');
  assert.deepEqual(await reports.flush('s1', send), { sent: false, retryIn: FAILURE_REPORT_BACKOFF_MS });
  assert.deepEqual(await reports.flush('s1', send), { sent: false, retryIn: FAILURE_REPORT_BACKOFF_MS }, 'not before the backoff');
  assert.equal(sent.length, 1);
  clock += FAILURE_REPORT_BACKOFF_MS;
  busy = false;
  assert.deepEqual(await reports.flush('s1', send), { sent: true, retryIn: null });
  assert.equal(reports.pending('s1'), null);
  assert.deepEqual(sent, ['boom', 'boom']);
  // A later Run of the server replaces or drops it; another session's report is its own.
  reports.queue('s1', { name: 'web', text: 'one' });
  reports.queue('s2', { name: 'api', text: 'two' });
  reports.drop('s1', 'other');
  assert.equal(reports.pending('s1').text, 'one');
  reports.drop('s1', 'web');
  assert.equal(reports.pending('s1'), null);
  assert.equal(reports.pending('s2').text, 'two');
  // At most FAILURE_REPORT_ATTEMPTS calls.
  busy = true;
  for (let index = 0; index < FAILURE_REPORT_ATTEMPTS; index++) { await reports.flush('s2', send); clock += 1e9; }
  assert.equal(reports.pending('s2'), null);
  assert.ok(count(official('cf580efe9-BFcQCjF9'), '"Error details were sent to Claude"') >= 1);
  const pane = local('src/source-preview-pane.jsx');
  assert.match(pane, /: t\("Error details were sent to \{assistant\}", \{ assistant: assistantName\(\) \}\);/);
  assert.doesNotMatch(pane, /failureNote/);
  assert.match(pane, /previewFailureReports\.queue\(sessionId, \{ name, text: startFailurePrompt\(startFailureText\(result, logs\?\.lines \?\? \[\]\)\) \}\);/);
});

test('r4pa-c04 / R4DC-01: no host error surface or overlay; serverStatus is gone', () => {
  assert.equal(previewSurface({ hasPage: true, url: 'http://localhost:3000/', error: { code: '-102', description: 'ERR_CONNECTION_REFUSED' } }), 'page');
  const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '');
  const pane = strip(local('src/source-preview-pane.jsx')), model = local('src/preview-model.mjs');
  assert.doesNotMatch(pane, /spv-error|refusedServer|data-preview-restart|pageError/);
  assert.doesNotMatch(local('src/source-preview-pane.css'), /spv-error/);
  assert.doesNotMatch(model, /export function (pageError|serverStatus)\b/);
  for (const key of ['Couldn’t load this preview', 'The page stopped working', 'Couldn’t open this address'])
    assert.ok(!local('electron/i18n/zh-CN/preview.mjs').includes(`"${key}"`), key);
  // The official page is the main process's (jPKPzV-P Pdi / Idi), English as in the original.
  const asar = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js');
  const main = fs.readFileSync(asar, 'utf8');
  assert.equal(count(main, 'function Idi(e,t,n="This site can\'t be reached",r=MM(e)?.host??e)'), 1);
  assert.equal(count(main, 'i(LF(t.getURL()),"Reload to try again","This page crashed")'), 1);
});
