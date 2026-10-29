import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w13-coworkui-session-states (research/w13-coworkui.md cwui-26): an archived or ended Cowork task shows the 3.6556.2
// ended notice (c21f11e6d EM, src/generated/cowork-session-states) in place of the composer. Source only: generator
// output text, official chunk text and SSR in local states; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, host, generated, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  host = await server.ssrLoadModule('/src/source-cowork-session-states.jsx');
  generated = await server.ssrLoadModule('/src/generated/cowork-session-states/index.mjs');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

const NOTICE_CLASS = 'flex flex-col gap-4 rounded-t-xl border-0.5 bg-surface-1 p-6 font-sans text-secondary sm:flex-row sm:items-center sm:justify-between';
const renderHost = (session, props = {}) => renderToStaticMarkup(h(host.SourceCoworkSessionStates, { session, onUnarchive: async () => {}, onNewTask() {}, ...props }));

test('the official notice and its call sites are the 3.6556.2 text the generator pins', () => {
  const c21 = official('c21f11e6d-Cyd8_HO8.js'), ca2 = official('ca2ef848d-ChLvq6yZ.js');
  for (const s of ['"data-testid":"cowork-session-ended-notice"', 'defaultMessage:"This task is archived",id:"4X+u5HHdgl"',
    'defaultMessage:"This task has ended",id:"POtKzYuLZu"', 'defaultMessage:"Unarchive task",id:"AXO+OS7yXO"', '"cowork ended-notice unarchive failed"'])
    assert.equal(c21.split(s).length - 1, 1, s);
  // CoworkSessionView passes the notice as endedNotice; the transcript renders it instead of the composer.
  assert.ok(c21.includes('endedNotice:oo,'));
  assert.ok(ca2.includes('f("div",{ref:Wn,className:"px-2 md:px-0 in-data-cds-dock-masked:bg-page",children:hn})'));
  // c8529cf9f f: the reason a session's endedReason / isArchived gives.
  assert.ok(official('c8529cf9f-S2u3cgXw.js').includes('function f(e,t){return e==="failed"?"failed":t||e==="archived"?"archived":void 0}'));
  const manifest = JSON.parse(local('src/generated/cowork-session-states/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.deepEqual(Object.keys(manifest.publicNames).sort(), ['CoworkSessionEndedNotice', 'coworkEndedReason']);
  assert.deepEqual(manifest.adapters, [{ original: 'shared-78-D5Fw2h0a.js#Uy', name: 'useNewTaskHref' }]);
  assert.ok(official('shared-52-uHFNjl7C.js').includes('ml="/new?surface=cowork"'));
});

test('archived: "This task is archived", the archived body, Unarchive task (primary) and New task (secondary)', () => {
  const html = renderHost({ id: 'cw-1', archived: true });
  assert.match(html, /^<div class="px-2 md:px-0 in-data-cds-dock-masked:bg-page"><div data-testid="cowork-session-ended-notice" data-composer-stand-in=""/);
  assert.ok(html.includes(`class="${NOTICE_CLASS}"`));
  assert.ok(html.includes('<div class="text-heading font-medium text-primary">This task is archived</div>'));
  assert.ok(html.includes('<div class="text-pretty">It can’t take new messages while archived. Unarchive it to keep working here, or start a new task.</div>'));
  assert.equal(text(html), 'This task is archived It can’t take new messages while archived. Unarchive it to keep working here, or start a new task. Unarchive task New task');
  // CdsButton: Unarchive task is a primary button, New task a secondary link to the official new-task route.
  assert.match(html, /<button type="button" data-cds="Button"(?:(?!<\/button>).)* bg-fill-primary (?:(?!<\/button>).)*Unarchive task<\/span><\/button>/);
  assert.match(html, /<a data-cds="Button"[^>]* href="\/new\?surface=cowork">(?:(?!<\/a>).)* bg-fill-secondary (?:(?!<\/a>).)*New task<\/span><\/a>/);
});

test('archived without an unarchive handler: the official body without onRestore and only New task', () => {
  const html = renderHost({ id: 'cw-1', archived: true }, { onUnarchive: undefined });
  assert.equal(text(html), 'This task is archived It can’t take new messages any more. Start a new task to continue. New task');
});

test('ended (the core reports systemError): "This task has ended" with New task', () => {
  for (const status of [{ type: 'systemError' }, 'systemError']) {
    const html = renderHost({ id: 'cw-2', status });
    assert.equal(text(html), 'This task has ended It can’t take new messages any more. Start a new task to continue. New task');
    assert.doesNotMatch(html, /Unarchive task/);
    // New task is the primary action here (`variant: t === "archived" && n ? "secondary" : "primary"`).
    assert.match(html, /<a data-cds="Button"[^>]* href="\/new\?surface=cowork">(?:(?!<\/a>).)* bg-fill-primary (?:(?!<\/a>).)*New task<\/span><\/a>/);
  }
  // c8529cf9f f: failed wins over archived.
  assert.equal(host.coworkSessionEndedReason({ archived: true, status: { type: 'systemError' } }), 'failed');
});

test('read-only (organization / role off, never reached locally): "This task is read-only", the official text, no buttons', () => {
  const cases = {
    cowork_off: 'Cowork is turned off for your organization. Ask your admin to turn it back on.',
    cowork_off_role: 'Cowork is turned off for your role. Ask your admin if you need it back.',
    cowork_cloud_off_role: 'Cowork in the cloud is turned off for your role. Ask your admin if you need it back.',
    hub_off_role: 'This task needs a feature that’s turned off for your role. Ask your admin if you need it back.',
  };
  for (const [reason, body] of Object.entries(cases)) {
    const html = renderToStaticMarkup(h(generated.CoworkSessionEndedNotice, { reason }));
    assert.equal(text(html), `This task is read-only ${body}`, reason);
    assert.doesNotMatch(html, /<button|<a /, reason);
  }
  // TM: a read_only reason without the plan's secret message falls back to failed.
  assert.equal(generated.coworkEndedReason('read_only', false), 'failed');
  assert.equal(generated.coworkEndedReason('archived', false), 'archived');
});

test('a running or idle session keeps the composer: no notice', () => {
  assert.equal(renderHost({ id: 'cw-3', status: { type: 'idle' } }), '');
  assert.equal(renderHost({ id: 'cw-3', status: { type: 'active' } }), '');
  assert.equal(renderHost(undefined), '');
  assert.equal(host.coworkSessionEndedReason(null), undefined);
  // w13-close-cowork-ui (session-states-01): the thread's latest thread/status/changed wins over the listed row's status.
  assert.equal(host.coworkSessionEndedReason({ id: 'cw-3', status: { type: 'idle' } }, { type: 'systemError' }), 'failed');
  assert.equal(host.coworkSessionEndedReason({ id: 'cw-3', status: { type: 'systemError' } }, { type: 'active' }), undefined);
  assert.match(text(renderHost({ id: 'cw-3', status: { type: 'idle' } }, { status: { type: 'systemError' } })), /^This task has ended/);
});

test('zh-CN: the notice reads the V3 block', () => {
  i18n.setLocale('zh-CN');
  try {
    assert.equal(text(renderHost({ id: 'cw-1', archived: true })), '此任务已归档 归档期间无法接收新消息。取消归档即可继续在这里工作，或新建一个任务。 取消归档任务 新建任务');
    assert.equal(text(renderHost({ id: 'cw-2', status: { type: 'systemError' } })), '此任务已结束 它无法再接收新消息。请新建一个任务以继续。 新建任务');
  } finally { i18n.setLocale('en-US'); }
});

test('main.jsx: the Cowork composer slot is wrapped; Code and Chat pass no session and keep the host archived band', () => {
  const main = local('src/main.jsx');
  assert.equal(main.split("import { SourceCoworkSessionStates } from './source-cowork-session-states.jsx';").length - 1, 1);
  const open = "<SourceCoworkSessionStates session={mode === 'cowork' ? session : undefined} status={current ? state.threadStatus?.[current] : undefined}\n                  onUnarchive={(row) => sessionAction(\"unarchive\", row)} onNewTask={() => navigate(null)}>";
  assert.equal(main.split(open).length - 1, 1);
  const start = main.indexOf(open), end = main.indexOf('</SourceCoworkSessionStates>', start);
  assert.ok(end > start && main.indexOf('</SourceCoworkSessionStates>', end + 1) === -1);
  // The slot: the auto-resume status, the turn box region, the composer and the Cowork home; the boundary closes after it.
  const slot = main.slice(start, end);
  for (const piece of ['<SourceAutoResumeStatus ', '{turnBoxSession && <SourceTurnBoxRegion ', '{renderMainComposer()}', "{!current && mode === 'cowork' && <SourceCoworkHome "])
    assert.equal(slot.split(piece).length - 1, 1, piece);
  assert.match(main.slice(end), /^<\/SourceCoworkSessionStates>\n\s+<\/SourceSessionErrorBoundary>/);
  assert.ok(main.includes(`{mode !== 'cowork' && session?.archived && <div className="archive-notice">{t("This session is archived.")}`));
});

test('a session that can take messages (or no Cowork session) renders the wrapped slot unchanged', () => {
  const child = h('div', { id: 'composer' }, 'composer');
  for (const session of [undefined, { id: 'cw-3', status: { type: 'idle' } }])
    assert.equal(renderToStaticMarkup(h(host.SourceCoworkSessionStates, { session }, child)), '<div id="composer">composer</div>');
  assert.doesNotMatch(renderToStaticMarkup(h(host.SourceCoworkSessionStates, { session: { id: 'cw-1', archived: true } }, child)), /id="composer"/);
});

test('the host notice turns the New task link into the host navigation', () => {
  const src = local('src/source-cowork-session-states.jsx');
  assert.match(src, /link\.getAttribute\('href'\) !== COWORK_NEW_TASK_HREF/);
  assert.match(src, /event\.preventDefault\(\);\n\s+onNewTask\?\.\(\);/);
  assert.equal(local('src/source-cowork-session-states-adapters.jsx').includes("export const COWORK_NEW_TASK_HREF = '/new?surface=cowork';"), true);
});
