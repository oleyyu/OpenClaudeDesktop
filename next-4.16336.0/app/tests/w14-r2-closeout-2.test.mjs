// W14-code r2 closeout-2: DC-03 / DC-05 / DC-06 (dead files, exports and generated modules), css2-chat-gutter-shave
// (the chat tile's data-chat-gutter-start / -end, 3.6556.2 cc43287c9 Ne / Pe over cf53e1812 Q / Z / te) and fr2-09
// (Delete environment with sessions started from it: ca690a791 onDeleteAsk, c6aeda0b7 runEnvironmentDelete, the
// cc3b500c8 question). Source text, plain-node models and Vite SSR only; nothing opens a window.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { chatGutters, leadingEdgeTileIds, trailingEdgeTileIds, topTrailingTileId } from '../src/tile-layout-model.mjs';
import { ENVIRONMENT_DELETE_BULK_MESSAGES, ENVIRONMENT_DELETE_MESSAGES, createEnvironmentDelete, environmentDeleteTargets, environmentDeleteTargetsChanged } from '../src/environment-delete-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.join(app, '..', 'reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (file) => fs.readFileSync(path.join(v3, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(app, file));

let server, Question, Intl;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  Question = await server.ssrLoadModule('/src/generated/code-current/environment-delete-question.mjs');
  Intl = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
});
after(async () => { await server?.close(); });

test('DC-03: the orphan files and the code-current re-export only they read are gone', () => {
  for (const file of ['src/use-pointer-resize.js', 'src/source-preview-tab-overflow.jsx', 'src/generated/code-current/terminal-tab-overflow.mjs', 'tests/terminal-tab-overflow-current.test.mjs'])
    assert.equal(exists(file), false, file);
  const manifest = JSON.parse(read('src/generated/code-current/manifest.json'));
  assert.ok(!manifest.modules.some((entry) => entry.target === 'terminal-tab-overflow.mjs'));
  assert.doesNotMatch(read('scripts/extract-code-ui-current.mjs'), /await emit\([^\n]*'terminal-tab-overflow\.mjs'/);
  assert.doesNotMatch(read('scripts/code-current-terminal-pins.mjs'), /'terminal-tab-overflow\.mjs': \{/);
});

test('DC-05: the dead host exports are gone', () => {
  const gone = { 'src/source-session.jsx': ['SourceWorking'], 'src/source-preview-pane.jsx': ['usePreviewActivity'], 'src/source-chapters.jsx': ['useSessionChapterState'],
    'src/source-approval-card.jsx': ['useAllowArming'], 'src/tile-layout-model.mjs': ['cloneLayout', 'stripIds', 'parentOfStack', 'CHAT_OVERFLOW_MIN'],
    'src/code-ui.jsx': ['SIDEBAR_TOGGLE_TOOLTIP'], 'src/source-diff.jsx': ['SourceDiffImageDialog'] };
  for (const [file, names] of Object.entries(gone)) for (const name of names) assert.doesNotMatch(read(file), new RegExp(`\\b${name}\\b`), `${file} ${name}`);
  // SourceWorking's own .source-working-time rule went with it; .source-working stays (the status row's busy marker).
  assert.doesNotMatch(read('src/source-session.css'), /\.source-working-time/);
  assert.match(read('src/source-transcript-status.jsx'), / source-working/);
});

test('DC-06: the unimported generated modules are retired from their generators', () => {
  const retired = ['src/generated/code-transcript/c3ffe0a17-BkUIZcqx.js', 'src/generated/turn-box/spinner.mjs', 'src/generated/r3b-transcript/transcript-region-edge.mjs',
    'src/generated/code-current/cds-badge.mjs', 'src/generated/code-current/cds-merge-props.mjs', 'src/generated/files-changes/attribute-escape.mjs',
    'src/generated/files-changes/coarse-pointer.mjs', 'src/generated/files-changes/error-text.mjs', 'src/generated/files-changes/shimmer-text.mjs',
    'src/generated/sidebar-sections/cds-helpers.mjs', 'src/generated/sidebar-sections/define-messages.mjs', 'src/generated/sidebar-sections/error-text.mjs',
    'src/generated/r4e-findings/element-node.mjs', 'src/generated/code-composer/chat-composer-react-version.mjs'];
  for (const file of retired) {
    assert.equal(exists(file), false, file);
    const manifest = JSON.parse(read(path.join(path.dirname(file), 'manifest.json')));
    assert.ok(!(manifest.modules ?? []).some((entry) => (entry.target ?? entry.file) === path.basename(file)), file);
  }
  // The code highlight entry Yc loads is transcript-rows' copy, the one the renderer links.
  assert.match(read('src/generated/transcript-rows/outside-handlers.mjs'), /load: \(\) => n\(\(\) => import\("\.\/c3ffe0a17-BkUIZcqx\.js"\), \[\]\)/);
  assert.ok(exists('src/generated/transcript-rows/c3ffe0a17-BkUIZcqx.js'));
  // code-editor-current's rolldown-runtime / vendor-prosemirror are not orphans: the copied chunks import them (minified
  // `import{…}from"./…"`, which the audit's graph regex missed).
  assert.match(read('src/generated/code-editor-current/c148e7537-CAXQJmwB.js'), /from"\.\/vendor-prosemirror-SdeAXoBV\.js"/);
  assert.match(read('src/generated/code-editor-current/c477e0dc6-2uiBUH57.js'), /from"\.\/rolldown-runtime-C3OYiQ02\.js"/);
});

const tile = (tileId) => ({ kind: 'tile', tileId, flex: 1 });
const stack = (direction, ...children) => ({ kind: 'stack', id: `s-${direction}-${children.length}`, direction, flex: 1, children });
test('css2-chat-gutter-shave: cf53e1812 Q / Z / te and cc43287c9 Ne / Pe', () => {
  const edges = official('cf53e1812-CX9VqRuk.js');
  for (const text of ['function Q(e){let t=new Set,n=e=>{if(e.kind==="tile"){t.add(e.tileId);return}e.children.length!==0&&(e.direction==="row"?n(e.children[0]):e.children.forEach(n))};return n(e.root),t}',
    'function Z(e){let t=new Set,n=e=>{if(e.kind==="tile"){t.add(e.tileId);return}e.children.length!==0&&(e.direction==="row"?n(e.children[e.children.length-1]):e.children.forEach(n))};return n(e.root),t}',
    'function te(e){let t=e.root;for(;t.kind==="stack";){if(t.children.length===0)return null;t=t.direction==="row"?t.children[t.children.length-1]:t.children[0]}return t.tileId}'])
    assert.ok(edges.includes(text), text.slice(0, 40));
  const shell = official('cc43287c9-Me-M2ucD.js');
  assert.ok(shell.includes('Ne=Ee?void 0:"shave",Pe=je?"bleed":Aw(we).has("chat")?void 0:"shave"'));
  assert.ok(shell.includes('"data-chat-gutter-start":m,"data-chat-gutter-end":h'));
  const only = { root: stack('row', tile('chat')) };
  assert.deepEqual(chatGutters(only), { start: undefined, end: 'bleed' });
  const right = { root: stack('row', tile('chat'), tile('files')) };
  assert.deepEqual([...leadingEdgeTileIds(right)], ['chat']);
  assert.deepEqual([...trailingEdgeTileIds(right)], ['files']);
  assert.equal(topTrailingTileId(right), 'files');
  assert.deepEqual(chatGutters(right), { start: undefined, end: 'shave' });
  const left = { root: stack('row', tile('files'), tile('chat')) };
  assert.deepEqual(chatGutters(left), { start: 'shave', end: 'bleed' });
  // A column on the trailing side: chat under a pane is on the trailing edge but not the top-trailing tile.
  const under = { root: stack('row', tile('files'), stack('column', tile('terminal'), tile('chat'))) };
  assert.deepEqual(chatGutters(under), { start: 'shave', end: undefined });
  const middle = { root: stack('row', tile('files'), tile('chat'), tile('terminal')) };
  assert.deepEqual(chatGutters(middle), { start: 'shave', end: 'shave' });
});

// W14-code r4 fr4-13 (E95): every layout writes the gutters, "bleed" included (cc43287c9 Pe), with no container end
// padding while chat is top-trailing (cc43287c9 `nt = … je ? 0 : void 0`) and the chat-only start padding (cf53e1812 t).
test('css2-chat-gutter-shave: the chat tile carries the attributes (bleed drops the container end padding) and the host columns read them', () => {
  const layout = read('src/source-tile-layout.jsx');
  assert.match(layout, /data-chat-gutter-start=\{node\.tileId === "chat" \? gutters\?\.start : undefined\}/);
  assert.match(layout, /data-chat-gutter-end=\{node\.tileId === "chat" \? gutters\?\.end : undefined\}/);
  assert.match(layout, /const gutters = useMemo\(\(\) => chatGutters\(layout\), \[layout\]\);/);
  assert.match(layout, /paddingRight: gutters\.end === "bleed" \? 0 : config\.padding/);
  assert.match(layout, /: \{ paddingLeft: config\.padding \};/);
  assert.doesNotMatch(layout, /if \(!hasPane\) return null;/);
  const shaveCalc = 'calc(var(--chat-gutter) - (var(--tiles-gap) - var(--tiles-padding)))';
  // shared-6 vg, the official classes the CSS compiles (c6a992d55).
  const vg = official('shared-6-sd9jbJqs.js');
  assert.ok(vg.includes('[--chat-column-gutter-start:var(--chat-gutter-start,var(--chat-gutter,32px))] [--chat-column-gutter-end:var(--chat-gutter-end,var(--chat-gutter,32px))] [[data-chat-gutter-start=shave]_&]:[--chat-column-gutter-start:var(--chat-gutter-start,calc(var(--chat-gutter)-(var(--tiles-gap)-var(--tiles-padding))))]'));
  assert.ok(official('c6a992d55-Che1orl5.css').includes('.epitaxy-root{--prompt-text-code:.928571em;--prompt-leading-code:1.53846;--chat-gutter:32px;'));
  const transcript = read('src/source-transcript.css');
  assert.ok(transcript.includes('--chat-column-gutter-start: var(--chat-gutter-start, var(--chat-gutter, 32px));'));
  assert.ok(transcript.includes(`[data-chat-gutter-start=shave] .source-transcript-content { --chat-column-gutter-start: var(--chat-gutter-start, ${shaveCalc}); }`));
  assert.ok(transcript.includes(`[data-chat-gutter-end=shave] .source-transcript-content { --chat-column-gutter-end: var(--chat-gutter-end, ${shaveCalc}); }`));
  assert.match(transcript, /@container \(max-width: 560px\) \{\n  \.source-transcript-content \{\n    --chat-gutter: 16px;\n  \}\n\}/);
  assert.doesNotMatch(transcript, /max\(32px, calc\(\(100% - 768px\) \/ 2\)\)|source-transcript-content\.source-transcript-content/);
  const composer = read('src/source-composer.css');
  assert.ok(composer.includes('max-width: calc(var(--local-transcript-width, 768px) + var(--chat-column-gutter-start) + var(--chat-column-gutter-end));'));
  assert.ok(composer.includes(`[data-chat-gutter-start=shave] .sc-zone.composer-zone { --chat-column-gutter-start: var(--chat-gutter-start, ${shaveCalc}); }`));
  const titlebar = read('src/source-titlebar.css');
  assert.ok(titlebar.includes(`[data-chat-gutter-start=shave] .st-origin { width: var(--chat-gutter-start, ${shaveCalc}); }`));
  assert.ok(titlebar.includes(`[data-chat-gutter-start=shave] .st-toolbar .st-section-title { padding-left: var(--chat-gutter-start, ${shaveCalc}); }`));
  // The width setting's column rules read the measure in place; the old duplicates are gone.
  assert.doesNotMatch(read('src/source-settings.css'), /html\[data-transcript-width\] \.source-transcript-content|html\[data-transcript-width\] \.composer-zone/);
  // vg's bleed rule: the end gutter takes --tiles-padding back.
  const bleedCalc = 'calc(var(--chat-gutter) + var(--tiles-padding))';
  assert.ok(vg.includes('[[data-chat-gutter-end=bleed]_&]:[--chat-column-gutter-end:var(--chat-gutter-end,calc(var(--chat-gutter)+var(--tiles-padding)))]'));
  assert.ok(transcript.includes(`[data-chat-gutter-end=bleed] .source-transcript-content { --chat-column-gutter-end: var(--chat-gutter-end, ${bleedCalc}); }`));
  assert.ok(composer.includes(`[data-chat-gutter-end=bleed] .sc-zone.composer-zone { --chat-column-gutter-end: var(--chat-gutter-end, ${bleedCalc}); }`));
  assert.ok(composer.includes(`[data-chat-gutter-end=bleed] :is(.composer-error:not(.inline-error), .ssn-list, .sqm-band) { --chat-column-gutter-end: var(--chat-gutter-end, ${bleedCalc}); }`));
  assert.ok(official('cc43287c9-Me-M2ucD.js').includes('tt=je?0:Ve.padding,nt=Qe>0?tt+Qe:je?0:void 0'));
});

test('closeout-2 review fix: the titlebar trailing padding is shared-6 tg (mp), shaved to 0 at the end gutter', () => {
  const s6 = official('shared-6-sd9jbJqs.js');
  // shared-6 tg, exported as mp; shared-19 Gb (the Code epitaxy-titlebar) carries it as ts.
  assert.ok(s6.includes('tg="pe-[var(--titlebar-end-inset,12px)] [[data-chat-gutter-end=shave]_&]:pe-[var(--titlebar-end-inset,0px)]"'));
  assert.match(s6, /[{,]tg as mp[,}]/);
  // shared-18 Rb sets --titlebar-end-inset only behind the "panels" gate (closed here), so the fallbacks apply.
  assert.ok(official('shared-18-D3y8YMFN.js').includes('function Rb(e){return e&&Qc("panels")?Ob??={"--titlebar-end-inset":Ku,'));
  const titlebar = read('src/source-titlebar.css');
  assert.match(titlebar, /\.st-toolbar \.st-inner \{[^}]*padding-right: var\(--titlebar-end-inset, 12px\);/);
  assert.ok(titlebar.includes('[data-chat-gutter-end=shave] .st-toolbar .st-inner { padding-right: var(--titlebar-end-inset, 0px); }'));
  assert.doesNotMatch(titlebar, /\.st-toolbar \.st-inner \{[^}]*padding-right: 12px;/);
});

test('css2-chat-gutter-shave: with equal 32px gutters the column padding is the old max(32px, (100% - 768px) / 2)', () => {
  const pad = (width, start, end, measure = 768) => [Math.max(start, (width - measure + start - end) / 2), Math.max(end, (width - measure - start + end) / 2)];
  for (const width of [400, 832, 1000, 1600]) assert.deepEqual(pad(width, 32, 32), [Math.max(32, (width - 768) / 2), Math.max(32, (width - 768) / 2)]);
  // yg: a centred box of 768 + both gutters, padded by them.
  const yg = (width, start, end, measure = 768) => { const box = Math.min(width, measure + start + end), margin = (width - box) / 2; return [margin + start, margin + end]; };
  for (const width of [400, 900, 1600]) assert.deepEqual(pad(width, 28, 32), yg(width, 28, 32));
});

test('fr2-09: the runner copy is c6aeda0b7 T / shared-78 WS verbatim; the question is the generated cc3b500c8', () => {
  const runner = official('c6aeda0b7-BY70ugai.js');
  const escape = (text) => text.replace(/[’“”]/g, (c) => `\\u${c.charCodeAt(0).toString(16).toUpperCase()}`);
  for (const [key, message] of Object.entries(ENVIRONMENT_DELETE_MESSAGES))
    assert.ok(runner.includes(`${key}:{defaultMessage:"${escape(message.defaultMessage)}",id:"${message.id}"}`), key);
  const bulk = official('shared-78-D5Fw2h0a.js');
  for (const [key, message] of Object.entries(ENVIRONMENT_DELETE_BULK_MESSAGES))
    assert.ok(bulk.includes(`${key}:{defaultMessage:"${escape(message.defaultMessage)}",id:"${message.id}"}`), key);
  assert.ok(runner.includes('if(b.size===0)return!1'), 'no session started from it: the dialog asks its own confirm');
  const generated = read('src/generated/code-current/environment-delete-question.mjs');
  assert.match(generated, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
  assert.match(generated, /export \{\s*x as EnvironmentDeleteQuestionHost,\s*b as askEnvironmentDelete,\s*g as environmentDeleteQuestionText,\s*h as environmentDeleteQuestionMessages,?\s*\}/);
  const manifest = JSON.parse(read('src/generated/code-current/manifest.json'));
  const entry = manifest.modules.find((module) => module.target === 'environment-delete-question.mjs');
  assert.equal(entry.referenceVersion, '3.6556.2');
  assert.match(entry.source, /cc3b500c8-DUhT14Si\.js$/);
});

test('fr2-09: cc3b500c8 g joins the question body; the dialog renders Cancel / Delete environment / Delete # sessions too', async () => {
  const intl = Intl.createStartIntl('en-US');
  assert.equal(Question.environmentDeleteQuestionText(intl, { name: 'Web', count: 2, pinnedCount: 1, runningCount: 2, someRanElsewhere: false }),
    '“Web” will be permanently deleted. Keep the 2 sessions started from it, or delete them too. One of them is pinned, but deleting the sessions deletes it anyway. Both of them are still running.');
  assert.equal(Question.environmentDeleteQuestionText(intl, { name: 'Web', count: 1, pinnedCount: 0, runningCount: 0 }),
    '“Web” will be permanently deleted. Keep the session started from it, or delete both.');
  const answer = Question.askEnvironmentDelete({ name: 'Web', count: 2, pinnedCount: 0, runningCount: 0, someRanElsewhere: false });
  // The host mounts with nothing to draw on the server (the CDS alert dialog's popup portals once mounted); w's tree is
  // the original: Header (no close, the joined body), Footer between Close(ghost Cancel) and secondary / danger.
  assert.equal(typeof renderToStaticMarkup(React.createElement(Question.EnvironmentDeleteQuestionHost)), 'string');
  const generated = read('src/generated/code-current/environment-delete-question.mjs');
  for (const text of ['t(s.Header, { showClose: !1, description: b, children: x })', 'variant: "ghost",', '"data-initial-focus": "",',
    't(o, { variant: "secondary", onClick: T, children: E })', 't(o, { variant: "danger", onClick: O, children: k })', 'n(s.Footer, { align: "between", children: [w, j] })',
    'n(s.Popup, { size: "md", initialFocus: l, children: [S, M] })', 'className: "flex flex-wrap justify-end gap-sm"'])
    assert.ok(generated.includes(text), text);
  assert.equal(intl.formatMessage(Question.environmentDeleteQuestionMessages.deleteSessionsToo, { count: 2 }), 'Delete 2 sessions too');
  // A second question replaces the first, which answers null (b: `pending?.resolve(null)`).
  const second = Question.askEnvironmentDelete({ name: 'Other', count: 1, pinnedCount: 0, runningCount: 0 });
  assert.equal(await answer, null);
  void second;
});

const sessions = [{ id: 'a' }, { id: 'b' }, { id: 'c', archived: true }, { id: 'd' }, { id: 'e' }];
const sessionMetadata = { a: { environmentId: 'env' }, b: { environmentId: 'env' }, c: { environmentId: 'env' }, d: { environmentId: 'other' }, e: { environmentId: 'env', surface: 'cowork' } };
test('fr2-09: c6aeda0b7 k / A / j over the host sessions', () => {
  const targets = environmentDeleteTargets('env', { sessions, sessionMetadata, pinnedIds: ['b'], isRunning: (id) => id === 'a' });
  assert.deepEqual([...targets.keys()], ['a', 'b'], 'local Code sessions started there, not archived');
  assert.deepEqual([targets.get('a').running, targets.get('a').pinned, targets.get('b').pinned], [true, false, true]);
  assert.deepEqual([...environmentDeleteTargets('env', { sessions, sessionMetadata, recordedEnvironment: (id) => (id === 'b' ? 'moved' : undefined) }).keys()], ['a']);
  assert.equal(environmentDeleteTargets('none', { sessions, sessionMetadata }).size, 0);
  const before = environmentDeleteTargets('env', { sessions, sessionMetadata });
  assert.equal(environmentDeleteTargetsChanged(before, environmentDeleteTargets('env', { sessions, sessionMetadata })), false);
  assert.equal(environmentDeleteTargetsChanged(before, environmentDeleteTargets('env', { sessions, sessionMetadata, isRunning: () => true })), true);
  assert.equal(environmentDeleteTargetsChanged(before, environmentDeleteTargets('env', { sessions: sessions.slice(1), sessionMetadata })), true);
});

function runnerHost(choice, { deleteResult = () => true, sessionList = sessions } = {}) {
  const log = [];
  let environments = ['env'];
  const host = {
    readTargets: (id) => environmentDeleteTargets(id, { sessions: sessionList, sessionMetadata }),
    ask: async (question) => { log.push(['ask', question]); return choice; },
    deleteSession: async (target) => { log.push(['delete', target.id]); return deleteResult(target); },
    removeEnvironment: async (environment, result) => { log.push(['remove', environment.id, result]); environments = []; },
    environmentExists: (id) => environments.includes(id),
    format: (message, values) => `${message.id}${values ? JSON.stringify(values) : ''}`,
    toast: (message, variant) => log.push(['toast', message, variant]),
  };
  return { host, log };
}
test('fr2-09: c6aeda0b7 M — no sessions, cancel, environment only, with sessions, a refusal', async () => {
  const environment = { id: 'env', name: 'Web' };
  let { host, log } = runnerHost(null, { sessionList: [] });
  assert.equal(await createEnvironmentDelete(host)({ environment }), false, 'none started there: the plain confirm follows');
  ({ host, log } = runnerHost(null));
  let chosen = 0;
  assert.equal(await createEnvironmentDelete(host)({ environment, onChosen: () => { chosen += 1; } }), true);
  assert.deepEqual([log.length, chosen], [1, 0], 'a cancel closes nothing');
  assert.deepEqual(log[0][1], { name: 'Web', count: 2, pinnedCount: 0, runningCount: 0, someRanElsewhere: false });
  ({ host, log } = runnerHost('environmentOnly'));
  assert.equal(await createEnvironmentDelete(host)({ environment, onChosen: () => { chosen += 1; } }), true);
  assert.deepEqual(log.slice(1), [['remove', 'env', { deleteChoice: 'environment_only', deletedSessionCount: 0 }]]);
  assert.equal(chosen, 1);
  ({ host, log } = runnerHost('withSessions'));
  await createEnvironmentDelete(host)({ environment });
  assert.deepEqual(log.slice(1), [['delete', 'a'], ['delete', 'b'], ['toast', '2tQzCPSbi0{"count":2}', 'neutral'], ['remove', 'env', { deleteChoice: 'with_sessions', deletedSessionCount: 2 }]]);
  ({ host, log } = runnerHost('withSessions', { deleteResult: (target) => { if (target.id === 'b') throw new Error('running'); return true; } }));
  await createEnvironmentDelete(host)({ environment });
  assert.deepEqual(log.slice(1), [['delete', 'a'], ['delete', 'b'], ['toast', '2tQzCPSbi0{"count":1}', 'neutral'], ['toast', 'CL1XOKy91Y{"name":"Web","count":1}', 'danger']],
    'environmentKept, as an error when a delete failed; the environment stays');
});

test('fr2-09: the dialog asks first (busy "Checking sessions…"), main and the rail hand it the runner', () => {
  const dialog = read('src/source-saved-environment-dialog.jsx');
  assert.match(dialog, /busy=\{checking\}\n\s+busyLabel=\{intl\.formatMessage\(\{ defaultMessage: 'Checking sessions…', id: 'lWUSXi8ySN' \}\)\} onClick=\{askDelete\}>/);
  assert.match(dialog, /onDeleteAsk\(editing, onClose, current\)\.then\(settle, \(\) => settle\(false\)\)/);
  assert.ok(official('ca690a791-C6pAwzdL.js').includes('busyLabel:j.formatMessage({defaultMessage:"Checking sessions\\u2026",id:"lWUSXi8ySN"}),onClick:Ii'));
  const main = read('src/main.jsx');
  assert.match(main, /<EnvironmentDeleteQuestionHost \/>/);
  assert.match(main, /onDelete=\{id => savedEnvironments\.run\(\{ op: 'delete', id \}\)\} onDeleteAsk=\{askDeleteEnvironment\} \/>\}/);
  assert.match(read('src/source-session-rail.jsx'), /onDeleteAsk=\{y && typeof host\.askDeleteEnvironment === "function" \? host\.askDeleteEnvironment : undefined\}/);
});
