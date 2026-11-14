// W14-code renderer-core (plan-w14-code.md E86, GrowthBook 3413676205 code_unified_renderer): the Code transcript drawn
// by the 3.6556.2 CodeTranscriptRenderer (generated/code-transcript, scripts/extract-code-transcript.mjs) over the host's
// engine items (src/code-transcript-entries.mjs, src/source-code-transcript.jsx). SSR in middleware mode; the official
// chunks are only read as text (never executed).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
// W14-code r8 R8T-REG-02: a user entry's id is UUID-shaped (c96d752d0 jN / AN: Rewind / Fork need it); a non-UUID engine id
// is derived through userEntryId (code-transcript-entries), sourceUuid keeps the engine id.
import { codeTranscriptEntries, rendererDrawsRow, userEntryId, userEntryText } from '../src/code-transcript-entries.mjs';
import { HOST_GROWTHBOOK } from '../src/host-growthbook.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = (file) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', file), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const area = path.join(app, 'src/generated/code-transcript');
const manifest = JSON.parse(fs.readFileSync(path.join(area, 'manifest.json'), 'utf8'));
const strip = (html) => html.replace(/ class="[^"]*"/g, '').replace(/ (id|style|tabindex|aria-[a-z]+)="[^"]*"/g, '');

// The official app is client-rendered (no SSR): stores read with useSyncExternalStore and no getServerSnapshot, and a
// window. SSR here takes the client snapshot as the server one, with a minimal window / document (as
// tests/cowork-live-generated.test.mjs does).
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}


let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  // After the modules loaded (their module-load code runs as in a renderer without a window).
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const ITEMS = [
  { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'Fix the bug please' }] },
  { id: 'r1', type: 'reasoning', turnId: 't1', summary: ['Looking at the code'] },
  { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Let me **read** it.\n\n- one\n- two' },
  { id: 'c1', type: 'commandExecution', turnId: 't1', command: "/bin/zsh -lc 'ls'", status: 'completed', aggregatedOutput: 'a\nb' },
  { id: 'c2', type: 'commandExecution', turnId: 't1', command: "/bin/zsh -lc 'npm test'", status: 'failed', aggregatedOutput: 'FAIL' },
  { id: 'm2', type: 'agentMessage', turnId: 't1', text: 'Done.' },
  { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'Again' }] },
  { id: 'c3', type: 'commandExecution', turnId: 't2', command: 'sleep 5', status: 'inProgress' },
];
const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 's1', items: ITEMS, ...props }));

test('manifest: the 3.6556.2 renderer roots, their features, the desktop call sites and the gate', () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  const root = manifest.modules.find((m) => m.target === 'code-transcript.mjs');
  assert.equal(root.source, 'c96d752d0-CWv_7-n9.js');
  assert.deepEqual(Object.keys(root.exports).sort(), ['Cet', 'E3', 'E4e', 'GT', 'LSe', 'ON', 'R3', 'S2e', 'TN', 'Tet', 'U0', 'X3', 'cit', 'e7e', 'kN', 'l0', 'l3', 'lit', 'rat', 'tDe', 'kI', 'uD', 'F$', 'N$', 'GG', 'e9', 'Cat', 'c9', 'Nat', 'lP', 'hit', 'w4e', 'pN', 'VN', 'M7', 'TM', 'EM', 'UQ', 'i7', 'a7', 'TA', 'fO'].sort()
    /* fO: r7 复核 R7T-06 = gates-r7-02 (cf74bc599 dw `Os(a, He, Ue)`, the stream snapshot over the feed's entries);
       TA: r7 R7T-02 (c96d752d0 Aat mounts its list in TA, `f(TA, {children: f(n8, …)})`: xA.Provider + _De, the message menu);
       i7 / a7: r6 review fix R6T-01 = gates-r6-01 (c96d752d0 Aat's keepsFollow for ooe, `qe = (e) => i7(e, x) ? !0 :
       (a7(e, ze.current, Me.current), !1)`); M7 / TM / EM: r6 R6T-REG-01 (i9 `case "rendererItem"` wraps e7e in M7; TM names a part's item, EM Aat's pin anchor key);
       UQ: r6 for the panes lane's r6pa-03 (the Background tasks pane's Stop button, c96d752d0 UQ);
       lP / hit / w4e / pN / VN: r5 R5T-04 / gates-r5-04 (Aat's row model: d7 → lP with the renderer options, hit, w4e;
       Aat's articles name a part by pN and leave VN's rows out); Cat / c9 / Nat: r4 ct-feed R4T-09 (c96d752d0 Aat's feed keyboard map, the shared list's windowing and its initial
       viewport estimate); Cet / Tet: W14-code transcript-rest TM-1; tDe: r2 R2T-09; kI / uD: r2 R2T-07 / gates-r2-03 (c96d752d0 i9 → gat → kI under uD);
       F$ / N$: r4 ct-feed R4T-08b (the Workflow tool row, the workflow card); GG / e9: r4 shell sleep-band-slot (i9's
       "sessionNotice" row, t9 → e9 around GG) */);
  assert.equal(root.exports.R3, 'CodeTranscriptRenderer');
  // The parts registry and the inline hang-face CSS come with the module (c96d752d0's module-load statements).
  const text = read('src/generated/code-transcript/code-transcript.mjs');
  assert.match(text, /nf\("code-core", f8e\)/);
  assert.match(text, /nf\("code-dots-mark", X7e\)/);
  assert.match(text, /nf\(t4, y8e\)/);
  assert.match(text, /wVe\(r9e\)/);
  assert.deepEqual(manifest.callSites.map((site) => `${site.source}#${site.binding}`),
    ['cf74bc599-CRYqipWN.js#uw', 'cf74bc599-CRYqipWN.js#dw', 'c96d752d0-CWv_7-n9.js#bat', 'c96d752d0-CWv_7-n9.js#Zit']);
  assert.equal(manifest.gate.flag, '__gb__3413676205');
  // The spec the desktop offers (cf74bc599 uw `Tn(E3)`).
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('id:"code",parts:["code-core","code-dots-mark","code-step-pictures"],proseSize:"base"'));
});

test('E81: the renderer and the flags it reads are on (the desktop Uon defaults, always !0)', () => {
  for (const flag of ['__gb__3413676205', '__gb__101380594', '__gb__2714218019', '__gb__4175257006', '__gb__3019411446'])
    assert.equal(HOST_GROWTHBOOK[flag], true, flag);
});

test('generated output: no assignment to an imported binding, and the alluvium parser tables are filled', () => {
  const require = createRequire(path.join(app, 'package.json'));
  const babel = require(path.join(app, '../tools/node_modules/playwright/lib/transform/babelBundle.js'));
  for (const file of fs.readdirSync(area).filter((name) => /\.m?js$/.test(name))) {
    const ast = babel.babelParse(fs.readFileSync(path.join(area, file), 'utf8'), file, true);
    const hits = [];
    babel.traverse(ast, {
      AssignmentExpression(p) { const l = p.node.left; if (l.type === 'Identifier' && p.scope.getBinding(l.name)?.kind === 'module') hits.push(l.name); },
      UpdateExpression(p) { const a = p.node.argument; if (a.type === 'Identifier' && p.scope.getBinding(a.name)?.kind === 'module') hits.push(a.name); },
    });
    assert.deepEqual(hits, [], `${file} writes to an imported binding (its writer must come from the same area)`);
  }
  const parser = read('src/generated/code-transcript/c7b19a753-Damdv4oQ.mjs');
  assert.match(parser, /for \(let e of fe\) pe\[e\.charCodeAt\(0\)\] = 1;/);
  assert.match(parser, /for \(let e = 0; e < 128; e\+\+\)/);
});

test('entries: the host items as the desktop entries (user / assistant, text / thinking / tools, user bash, host rows)', () => {
  const entries = codeTranscriptEntries(ITEMS, { view: 'thinking' });
  assert.deepEqual(entries.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:r1:reply', `user:${userEntryId('u2')}`, 'assistant:c3:reply']);
  assert.deepEqual(entries[0].items, [{ kind: 'text', id: 'u1:text', text: 'Fix the bug please' }]);
  assert.deepEqual(entries[1].items.map((i) => `${i.kind}:${i.id}`), ['thinking:r1', 'text:m1', 'tools:c1', 'text:m2']);
  assert.deepEqual(entries[1].items[2].tools.map((t) => [t.name, t.status, t.input.command]), [['Bash', 'completed', "/bin/zsh -lc 'ls'"], ['Bash', 'error', "/bin/zsh -lc 'npm test'"]]);
  // Thoughts hidden by the view leave no thinking item.
  assert.deepEqual(codeTranscriptEntries(ITEMS, { view: 'normal' })[1].items.map((i) => i.kind), ['text', 'tools', 'text']);
  // The user's own '!' command is a user entry with a bash item (c96d752d0 `km(t.items) === "bash"`).
  const shell = codeTranscriptEntries([{ id: 'sh', type: 'commandExecution', source: 'userShell', turnId: 't', command: "/bin/zsh -lc 'ls -la'", status: 'completed', aggregatedOutput: 'x\n' }]);
  assert.deepEqual(shell[0].items, [{ kind: 'bash', id: 'sh', command: 'ls -la', output: 'x' }]);
  // A host row splits the reply and stays the host's. (W14-code r2 R2T-04: a finished compaction is no longer one — it is
  // the reply's `compacted` item, c06cf64bb compact_boundary → `M("assistant", [{kind: "compacted", …}])`. W14-code r4
  // R4T-03: review mode is not one either — c06cf64bb has no review item; an item type with no entry kind stands for them.)
  const split = codeTranscriptEntries([ITEMS[0], ITEMS[2], { id: 'rv', type: 'subAgentActivity', turnId: 't1' }, ITEMS[5]], {});
  assert.deepEqual(split.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:m1:reply', 'host:rv', 'assistant:m2:reply']);
  const compacted = codeTranscriptEntries([ITEMS[0], ITEMS[2], { id: 'cc', type: 'contextCompaction', turnId: 't1' }, ITEMS[5]], {});
  assert.deepEqual(compacted.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:m1:reply']);
  assert.deepEqual(compacted[1].items.map((i) => `${i.kind}:${i.id}`), ['text:m1', 'compacted:cc', 'text:m2']);
  assert.equal(rendererDrawsRow(ITEMS[3]), true);
  assert.equal(rendererDrawsRow({ id: 'w', type: 'agentMessage', workflowRun: {} }), false);
  // W14-code r2 R2T-05 / r4 R4T-08e: a Codex plan is the renderer's (an ExitPlanMode call, c96d752d0 exit_plan_mode).
  assert.equal(rendererDrawsRow({ id: 'p', type: 'plan' }), true);
  assert.equal(rendererDrawsRow({ id: 'g', type: 'fileToolGroup', toolGroup: [ITEMS[3], ITEMS[4]] }), true);
  assert.equal(userEntryText({ content: [{ type: 'text', text: ' hi ' }, { type: 'image', url: 'x' }] }), 'hi');
});

test('RUNLOG 插单 10-29 (two spinners): a tool runs only while the live scope holds it; the running reply is provisional', () => {
  const both = [...ITEMS, { id: 'c4', type: 'commandExecution', turnId: 't2', command: 'npm run build', status: 'inProgress' }];
  const entries = codeTranscriptEntries(both, { responding: true, activeTurnId: 't2', liveRunningToolIds: new Set(['c4']) });
  const tools = entries.at(-1).items[0].tools;
  assert.deepEqual(tools.map((t) => [t.id, t.status]), [['c3', 'completed'], ['c4', 'running']]);
  assert.equal(entries.at(-1).provisionalMessageId, entries.at(-1).id);
  // Nothing responding: no call is running and no entry is provisional.
  const idle = codeTranscriptEntries(both, { liveRunningToolIds: new Set(['c4']) });
  assert.deepEqual(idle.at(-1).items[0].tools.map((t) => t.status), ['completed', 'completed']);
  assert.equal(idle.at(-1).provisionalMessageId, undefined);
  // SSR: one busy row only.
  const html = render({ items: both, responding: true, activeTurnId: 't2', liveRunningToolIds: new Set(['c4']) });
  assert.equal((html.match(/data-state="busy"/g) ?? []).length, 1);
  assert.match(html, /data-morph-key="busy\|Running npm run build"/);
  assert.equal((html.match(/data-shimmering="true"/g) ?? []).length, 1);
});

test('SSR: the official rows — UserMessage, AssistantMessage with alluvium prose, the TurnStatus tool group, thinking', () => {
  const html = render({ host: { transcriptView: 'thinking' } });
  const plain = strip(html);
  assert.match(plain, /<h2 data-find-omitted="">You said: Fix the bug please<\/h2>/);
  assert.match(html, new RegExp(`data-cds="UserMessage"[^>]*data-turn-key="${userEntryId('u1')}"`));
  assert.equal(codeTranscriptEntries(ITEMS)[0].sourceUuid, 'u1');
  assert.match(html, /data-cds="AssistantMessage"[^>]*data-testid="assistant-message"/);
  assert.match(plain, /<div data-alluvium="true"><p dir="ltr">Let me <strong>read<\/strong> it\.<\/p><ul dir="ltr"><li>one<\/li><li>two<\/li><\/ul><\/div>/);
  assert.match(plain, /<bdi>Ran 2 commands \(1 failed\)<\/bdi>/);
  assert.match(html, /data-cds="TurnStatus"[^>]*data-tool-anchor="c1 c2"/);
  assert.match(plain, /Looking at the code/);
  assert.match(html, /data-testid="message-actions" data-cds="MessageActions"/);
  // The host's markers for its context menu / find stay on each entry.
  // W14-code r7 R7T-02: the turn row is M7's child (c96d752d0 i9 `case "user"` with a rendererSlotKey): EA merges its
  // menu props (`style: {WebkitTouchCallout: "none"}`) onto it under TA, and the row is marked as TA's menu target.
  assert.match(html, /<div class="contents" data-transcript-item-id="u1" data-code-message-menu="" style="-webkit-touch-callout:none">/);
  // Official strings (c96d752d0 / c4a9ee384) the rows above show.
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('defaultMessage:"You said: {prompt}"'));
});

test('SSR: a turn error is the official card (c96d752d0 turn_error, error_during_execution)', () => {
  const html = strip(render({ turnErrors: { t2: { message: 'Something broke' } } }));
  assert.match(html, /Claude couldn’t process that message/);
  assert.match(html, /Try sending your message again\./);
  assert.match(html, /View details/);
});

test('host rows are drawn in place, and what the host draws after a row follows its entry', () => {
  // W14-code r2 R2T-04: a row with no entry kind stands for the host rows; a compaction is the reply's now (and r4 R4T-03:
  // review mode too, c06cf64bb has no review item).
  const items = [ITEMS[0], { id: 'rv', type: 'subAgentActivity', turnId: 't1' }, ITEMS[2]];
  const html = render({ items, hostRow: (row) => !rendererDrawsRow(row),
    renderHostRow: (row) => React.createElement('div', { 'data-host-row': row.id }),
    renderAfter: (row) => React.createElement('span', { 'data-after': row.id }) });
  const order = [...html.matchAll(/data-(?:host-row|after|turn-key)="([^"]+)"/g)].map((m) => m[0]);
  assert.deepEqual(order, [`data-turn-key="${userEntryId('u1')}"`, 'data-after="u1"', 'data-host-row="rv"', 'data-turn-key="m1:reply"', 'data-after="m1"']);
});

test('main.jsx: Code mode mounts the renderer (gated, with the legacy rows as the failure fallback); Chat / Cowork keep their rows', () => {
  const main = read('src/main.jsx');
  assert.match(main, /import \{ CodeTranscriptBoundary, SourceCodeTranscript, codeTranscriptRendererOn \} from "\.\/source-code-transcript\.jsx";/);
  assert.match(main, /const codeRendererOn = mode === "code" && !!current && codeTranscriptRendererOn\(current\);/);
  assert.match(main, /<CodeTranscriptBoundary sessionId=\{current\} fallback=\{\(\) => rows\.map\(render\)\}>/);
  assert.match(main, /\{codeTranscriptRows\(shownRows, \(item, index, displayedItems\) => \{/);
  // W14-code r2 R2T-06: after the renderer's answer row, only the host's own Codex additions (Used memory, async questions).
  assert.match(main, /: codeRendererDraws\(item\) \? \(item\.type === "agentMessage" \|\| item\.type === "plan" \? <SourceAgentMessageExtras item=\{item\} isStreaming=\{isItemStreaming\(state, current, item\)\} \/> : null\) \/\* W14-code E86: the renderer's row; r2 R2T-06: the host's Used memory \/ async questions after it \*\/ : <Message item=\{item\}/);
  // The background task rows (RUNLOG 插单 10-29) and the turn's error card stay the host's, after the turn's last row.
  assert.match(main, /taskEventsByTurn\.has\(item\.turnId\)/);
  assert.match(main, /turnErrorView\.get\(item\.turnId\)/);
  const source = read('src/source-code-transcript.jsx');
  assert.match(source, /hostGrowthBookFlag\("__gb__3413676205"\)/);
  assert.match(source, /CODE_TRANSCRIPT_SHEETS = Object\.freeze\(\["c4a9ee384-Br-fzuOs\.css", "c19e90103-CuNz46ca\.css"\]\)/);
  assert.match(read('scripts/prepare-ui.mjs'), /\["c4a9ee384-Br-fzuOs\.css", "c19e90103-CuNz46ca\.css"\]/);
});

// W14-code 复核修复 (renderer-core.review.md): the user message's Rewind / Fork, the reply's Fork, Good / Bad response and
// Pin as chapter are the renderer's (bat's host fields), over the host's own requests.
test('复核修复: the message actions map back to the host turn / reply (codeTranscriptActionHost)', () => {
  const all = codeTranscriptEntries(ITEMS, { view: 'normal' });
  const calls = [];
  const actions = { rewindServed: true, onRewindTo: (turnId) => calls.push(['rewind', turnId]), onForkFrom: (turnId) => calls.push(['fork', turnId]),
    onRate: (reply, value) => calls.push(['rate', reply, value]), onOpenRewindPicker: () => calls.push(['picker']) };
  const host = C.codeTranscriptActionHost('s1', all, all, 't2', actions);
  host.onRewindToMessage('u1', 'Fix the bug please');
  host.onForkAtMessage('u1', 'Fix the bug please');
  host.onRewindToMessage('u2', 'Again'); // the open turn: nothing
  host.onForkAtMessage('u2', 'Again');
  host.onForkAfterAssistantTurn(1);
  host.onRateMessage('m1:reply', 'positive'); // the turn's last reply (the host's rating key)
  host.onOpenRewindPicker();
  assert.deepEqual(calls, [['rewind', 't1'], ['fork', 't1'], ['fork', 't1'], ['rate', 'm2', 'positive'], ['picker']]);
  // cf74bc599 nT: Rewind stays offered while the session can't rewind now (responding), and does nothing.
  const busy = C.codeTranscriptActionHost('s1', all, all, null, { rewindServed: true, onRewindTo: null });
  assert.equal(typeof busy.onRewindToMessage, 'function');
  busy.onRewindToMessage('u1');
  assert.equal(busy.onForkAtMessage, undefined);
  assert.deepEqual(Object.keys(C.codeTranscriptActionHost('s1', all, all, null, null)), []);
  // The reply ratings as the renderer's l0 keys (entry id → the turn's rating).
  assert.deepEqual([...C.entryRatings(all, { m2: { rating: 'negative' } })], [['m1:reply', 'negative']]);
});

test('复核修复: the renderer host carries the actions; the turn toolbar reads them and its pressed states from GT / l0', () => {
  // The toolbars are deferred until pointer / focus (shared-2 w6 `defer`), so SSR draws only their placeholder: the
  // wiring is checked on the source and the generated renderer instead.
  const source = read('src/source-code-transcript.jsx');
  assert.match(source, /streamTelemetry: false, \.\.\.actions, lastReplyClosingLine: closingLine,/);
  assert.match(source, /epitaxyChapterStore\.setState\(\{ bySession: chapters\.bySession \}\)/);
  assert.match(source, /messageRatingStore\.setState\(/);
  const generated = read('src/generated/code-transcript/code-transcript.mjs');
  for (const field of ['onForkAtMessage: y,', 'onRewindToMessage: S,', 'onRateMessage: E,', 'onOpenRewindPicker: k,', 'onPinChapter: A,', 'onUnpinChapter: j,'])
    assert.ok(generated.includes(field), field);
  assert.ok(generated.includes('{ onForkAfterAssistantTurn: Ke } = t,'));
  assert.ok(generated.includes('(e.bySession[c]?.userChapters.some((e) => e.afterId === p) ?? !1)'));
  assert.ok(generated.includes('(n) => (e && t ? n.ratings.get(e)?.get(t) : void 0)'));
  assert.match(generated, /GT as epitaxyChapterStore,\n  l0 as messageRatingStore,/);
  // The toolbar's labels are the official ones (c96d752d0 zA / BA / u6e).
  const c96 = official('c96d752d0-CWv_7-n9.js');
  for (const label of ['Rewind to here', 'Fork from here', 'Pin as chapter', 'Thanks for the feedback.']) assert.ok(c96.includes(`defaultMessage:"${label}"`), label);
  // SSR still renders with every action offered.
  const html = render({ items: ITEMS.slice(0, 6), host: { actions: { rewindServed: true, onRewindTo() {}, onForkFrom() {}, onRate() {}, pins: true, ratings: { m2: { rating: 'positive' } } } } });
  assert.match(html, /data-testid="user-message-actions" data-cds="MessageActions"/);
  assert.match(html, /data-testid="message-actions" data-cds="MessageActions"/);
});

test('复核修复: a renderer failure draws the host rows at once (the session is off before the fallback renders)', () => {
  const boundary = new C.CodeTranscriptBoundary({ sessionId: 's-fail', fallback: () => C.codeTranscriptRendererOn('s-fail') });
  assert.equal(C.codeTranscriptRendererOn('s-fail'), true);
  boundary.state = C.CodeTranscriptBoundary.getDerivedStateFromError(new Error('boom'));
  assert.equal(boundary.render(), false);
  const main = read('src/main.jsx');
  assert.match(main, /onRewindTo: transcriptActions\.onRewindTo, onForkFrom: transcriptActions\.onForkFrom, pins: true,/);
  assert.match(main, /onRate: ratingsCore \? \(replyId, value\) => rateReply\(current, replyId, value\)/);
});
