// W14-code r3 R2T-TS6: the Code transcript's AskUserQuestion card is the card presentation of 3.6556.2 — c2f6611a3 En
// (cc32965c2 `We = Ue !== "dock"`, `let e = We ? ho : xo`), not the dock's c9ed5627b dt. Source-only: the generator's
// --check, the official class strings and copy pinned in c2f6611a3, SSR markup of the En card driven by the host
// approval-draft runtime (preselect, pager, disabled reason, Skip, Other), and the dt card kept for every other surface.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ROOT = path.resolve(import.meta.dirname, '..');
const V1 = path.resolve(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const en = fs.readFileSync(path.join(V1, 'c2f6611a3-DBT6B0Bq.js'), 'utf8');
const cc = fs.readFileSync(path.join(V1, 'cc32965c2-BQu1bA_w.js'), 'utf8');
const plan = fs.readFileSync(path.join(V1, 'cb6930dae-Dw_4c1QI.js'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const source = fs.readFileSync(path.join(ROOT, 'src/source-question-card.jsx'), 'utf8');

let server, Card, Model, Async;
before(async () => {
  const [{ createServer }, { default: react }] = await Promise.all([import('vite'), import('@vitejs/plugin-react')]);
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  [Card, Model, Async] = await Promise.all(['/src/source-question-card.jsx', '/src/approval-draft-model.mjs', '/src/source-async-questions.jsx']
    .map(file => server.ssrLoadModule(file)));
});
after(() => server?.close());

function request(questions) {
  return { id: 7, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'c', instanceId: `ts6-${Math.random()}` },
    params: { threadId: 'T', turnId: 'turn', questions } };
}
const two = () => request([
  { id: 'q1', question: 'Which database?', isOther: true, options: [{ label: 'Postgres', description: 'Server' }, { label: 'SQLite' }] },
  { id: 'q2', question: 'Which tests?', isOther: true, multiSelect: true, options: [{ label: 'Unit' }, { label: 'E2E' }] },
]);
function mount(req, props = {}) {
  const runtime = Model.createApprovalDraftRuntime();
  runtime.reconcile([req]);
  const ticket = runtime.ticketFor(req);
  const html = (extra = {}) => renderToStaticMarkup(React.createElement(Card.SourceQuestionCard, { runtime, request: req,
    respond: async () => ({}), getVisibleThreadId: () => 'T', presentation: 'card', ...props, ...extra }));
  return { runtime, ticket, html };
}

test('the generator output is current and cuts En\'s rows (Tn / cn / Sn / Cn / bn / xn)', async () => {
  const { extractQuestionCard } = await import('../scripts/extract-question-card.mjs');
  const result = await extractQuestionCard({ check: true });
  const rows = result.modules.find(m => m.target === 'answer-option.mjs');
  assert.equal(rows.source, 'c2f6611a3-DBT6B0Bq.js');
  for (const name of ['Tn', 'cn', 'Sn', 'Cn', 'bn', 'xn', 'wn']) assert.ok(rows.bindings.some(b => b.name === name), name);
  assert.ok(!rows.bindings.some(b => b.name === 'En'), 'En itself is not cut (E84 2)');
});

test('official pins: cc32965c2 picks En off the dock, En\'s class strings and copy', () => {
  assert.equal(count(cc, 'We=Ue!=="dock"'), 1);
  assert.equal(count(cc, 'let e=We?ho:xo'), 1);
  for (const pin of [
    '"epitaxy-question-card max-w-[480px] outline-none"',
    '`bg-alpha-1 ${Cn} flex gap-md py-md ${',
    '`min-w-0 flex-1 text-body text-primary select-text break-words ${Ie}`',
    '"-my-xs -me-sm flex shrink-0 items-center gap-xs text-caption text-muted-as-secondary"',
    'defaultMessage:"Show previous question"', 'defaultMessage:"Show next question"', 'defaultMessage:"{position} of {count}"',
    'defaultMessage:"Question {n} is unanswered"', 'defaultMessage:"Choose an option or skip this question"',
    '`epitaxy-answer-option relative grid grid-cols-[auto_1fr] items-start gap-x-md gap-y-sm ${Cn} py-lg`',
    '"absolute inset-0 focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"',
    '"pointer-events-none contents text-body text-primary"', '"relative col-start-2 row-start-2 w-full"',
    '`epitaxy-approval-actions flex items-center justify-end gap-sm ${Cn} pb-lg pt-md`',
    'disabledReason:dn', 'icon:"CaretLeft"',
  ]) assert.ok(count(en, pin) >= 1, pin);
  // The same strings in the host card (the official ${Cn} / ${Ie} spelled through the generated bindings).
  for (const own of ['"epitaxy-question-card max-w-[480px] outline-none"', '`bg-alpha-1 ${answerOptionInset} flex gap-md py-md items-center`',
    '`min-w-0 flex-1 text-body text-primary select-text break-words ${bidiPlaintext}`',
    '"-my-xs -me-sm flex shrink-0 items-center gap-xs text-caption text-muted-as-secondary"',
    '`epitaxy-answer-option relative grid grid-cols-[auto_1fr] items-start gap-x-md gap-y-sm ${answerOptionInset} py-lg`',
    '"absolute inset-0 focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"',
    '"pointer-events-none contents text-body text-primary"', '"relative col-start-2 row-start-2 w-full"',
    '`epitaxy-approval-actions flex items-center justify-end gap-sm ${answerOptionInset} pb-lg pt-md`'])
    assert.ok(source.includes(own), own);
});

test('c031798b2: the answer-row divider and the radio mark rules are in the sheet verbatim', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/source-approval-card.css'), 'utf8');
  const cards = /\("c031798b2","([^"]+)"\)/.exec(plan)[1];
  const divider = '.epitaxy-root .epitaxy-answer-option+.epitaxy-answer-option{border-top:1px solid var(--cds-border)}';
  assert.ok(cards.includes(divider) && css.includes(divider));
  const radio = cards.slice(cards.indexOf('.epitaxy-root .epitaxy-radio-mark{'));
  assert.ok(radio.startsWith('.epitaxy-root .epitaxy-radio-mark{') && css.includes(radio), 'radio mark rules');
});

test('En card: shell, header with the pager, Tn rows with the preselected radio, Other row, Skip / Next', () => {
  const { html } = mount(two());
  const root = /^<div class="([^"]+)" role="group" tabindex="-1" aria-label="Which database\?"/.exec(html());
  assert.ok(root, html().slice(0, 400));
  for (const cls of ['source-question-card', 'epitaxy-approval-card', 'epitaxy-card-outline', 'epitaxy-question-card', 'max-w-[480px]', 'outline-none'])
    assert.ok(root[1].split(' ').includes(cls), cls);
  const markup = html();
  assert.match(markup, /data-approval-presentation="card"/);
  assert.match(markup, /data-approval-card-root=""/);
  assert.match(markup, /<div class="bg-alpha-1 px-lg flex gap-md py-md items-center"><div class="min-w-0 flex-1 text-body text-primary select-text break-words \[unicode-bidi:plaintext\]">Which database\?<\/div><span class="-my-xs -me-sm flex shrink-0 items-center gap-xs text-caption text-muted-as-secondary">/);
  assert.match(markup, /aria-label="Show previous question"[^>]*disabled=""|disabled=""[^>]*aria-label="Show previous question"/);
  assert.match(markup, />1 of 2</);
  assert.match(markup, /aria-label="Show next question"/);
  // Tn rows: options[0] preselected (En `_n`), the radio mark's dot, the description in text-secondary.
  assert.match(markup, /<button type="button" aria-pressed="true" class="epitaxy-answer-option flex w-full items-start gap-md px-lg py-lg [^"]*"><span aria-hidden="true" data-checked="" class="epitaxy-radio-mark [^"]*"><span class="epitaxy-radio-mark-dot"><\/span><\/span>/);
  assert.match(markup, /class="text-body text-secondary [^"]*">Server</);
  assert.match(markup, /aria-pressed="false" class="epitaxy-answer-option/);
  // The Other row: the hit button, the hidden mark and label; no field until Other is chosen.
  assert.match(markup, /<div class="epitaxy-answer-option relative grid grid-cols-\[auto_1fr\] items-start gap-x-md gap-y-sm px-lg py-lg"><button type="button" aria-pressed="false" aria-label="Other" class="absolute inset-0 /);
  assert.match(markup, /<div aria-hidden="true" class="pointer-events-none contents text-body text-primary"><span aria-hidden="true" data-unchecked="" class="epitaxy-radio-mark /);
  assert.doesNotMatch(markup, /Type your own answer here/);
  // Actions: Skip and the primary Next inside the allow arming span; no Back, no digit keycaps, no collapse / dismiss.
  assert.match(markup, /<div class="epitaxy-approval-actions flex items-center justify-end gap-sm px-lg pb-lg pt-md"><span class="contents" data-approval-allow="">/);
  assert.match(markup, />Skip</);
  assert.match(markup, />Next</);
  for (const gone of ['>Back<', 'data-cds="Shortcut"><kbd[^>]*>[0-9]', 'View question options', 'Dismiss question', 'epitaxy-expanding-body'])
    assert.doesNotMatch(markup, new RegExp(gone), gone);
});

test('En card state: pager pages, a multiSelect page with nothing chosen holds Next with its reason, the last page names the open question', () => {
  const { runtime, ticket, html } = mount(two());
  runtime.setPage(ticket, 1);
  let markup = html();
  assert.match(markup, />2 of 2</);
  assert.match(markup, /Which tests\?/);
  // multiSelect rows wear the CDS checkbox indicator; nothing is preselected.
  assert.match(markup, /data-unchecked=""[^>]*class="flex shrink-0 size-\[var\(--cds-checkbox\)\]/);
  assert.match(markup, />Submit</);
  assert.match(markup, /Choose an option or skip this question/);
  runtime.selectOption(ticket, 'q2', 'E2E');
  markup = html();
  assert.doesNotMatch(markup, /Choose an option or skip this question/);
  // The first question, preselected, counts as answered: Submit is live.
  assert.doesNotMatch(markup, /is unanswered/);
  // A skipped first question still counts (gn), an unanswered one is named.
  const free = mount(request([
    { id: 'a', question: 'Name?', options: [] },
    { id: 'b', question: 'Colour?', isOther: true, options: [{ label: 'Red' }] },
  ]));
  free.runtime.setPage(free.ticket, 1);
  assert.match(free.html(), /Question 1 is unanswered/);
});

test('En card Other: chosen, the field shows (CdsTextArea with En\'s class and height cap); a free-form question draws its field outright', () => {
  const { runtime, ticket, html } = mount(two());
  runtime.selectOther(ticket, 'q1', { toggle: false });
  const markup = html();
  assert.match(markup, /aria-pressed="true" aria-label="Other"/);
  assert.match(markup, /placeholder="Type your own answer here"/);
  assert.match(markup, /aria-label="Other option"/);
  assert.match(markup, /relative col-start-2 row-start-2 w-full/);
  assert.match(markup, /max-height:calc\(4lh \+ 2 \* var\(--cds-pad-sm\)\)/);
  const free = mount(request([{ id: 'a', question: 'Name?', options: [] }]));
  const html2 = free.html();
  assert.match(html2, /placeholder="Write your answer"/);
  assert.doesNotMatch(html2, /aria-label="Other"/);
  assert.doesNotMatch(html2, /Show previous question/, 'one question: no pager');
  // A question that takes no custom answer (Codex isOther:false) draws no Other row.
  const fixed = mount(request([{ id: 'a', question: 'Pick', isOther: false, options: [{ label: 'X' }] }]));
  assert.doesNotMatch(fixed.html(), /aria-label="Other"/);
});

test('En card answers through the runtime: Next pages, Submit sends the draft, Skip skips (no Back button path needed)', async () => {
  const sent = [];
  const req = two();
  const runtime = Model.createApprovalDraftRuntime();
  runtime.reconcile([req]);
  const ticket = runtime.ticketFor(req);
  assert.ok(runtime.canAdvance(ticket), 'options[0] preselected answers page 1');
  runtime.setPage(ticket, 1);
  const respond = async (payload) => { sent.push(payload); return { ok: true, identity: req.bridgeApproval }; };
  const result = await runtime.skip(ticket, respond, { getVisibleThreadId: () => 'T' });
  assert.equal(result.status, 'answered');
  assert.deepEqual(sent[0].answers, { q1: { answers: ['Postgres'] } });
});

test('every other surface keeps the dt card; the Code transcript passes presentation "card"', () => {
  const { html } = mount(two(), { presentation: undefined });
  const markup = html();
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /View question options/);
  assert.doesNotMatch(markup, /epitaxy-question-card/);
  const main = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8');
  assert.match(main, /presentation=\{mode === "code" \? "card" : undefined\}/);
  assert.match(source, /props\.presentation === "card" \? <SourceQuestionCardEn \{\.\.\.props\} \/> : <SourceQuestionCardDt \{\.\.\.props\} \/>/);
});

test('En card keeps the runtime\'s error line and goes inert while sending (En m)', async () => {
  const req = request([{ id: 'q', question: 'Pick', isOther: true, options: [{ label: 'X' }, { label: 'Y' }] }]);
  const { runtime, ticket, html } = mount(req);
  const result = await runtime.submit(ticket, null, async () => ({ ok: false, error: { message: 'Bridge said no' } }), { getVisibleThreadId: () => 'T' });
  assert.equal(result.status, 'error');
  assert.match(html(), /<p class="text-footnote text-danger px-lg pt-md" role="alert">Bridge said no<\/p><div class="epitaxy-approval-actions/);
  let release;
  const pending = runtime.submit(ticket, null, () => new Promise((resolve) => { release = resolve; }), { getVisibleThreadId: () => 'T' });
  const busy = html();
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /<button type="button" disabled="" aria-pressed="true" class="epitaxy-answer-option/);
  release({ ok: true, identity: req.bridgeApproval });
  assert.equal((await pending).status, 'answered');
});

test('Codex async questions follow the Code card: En header, pager, Tn rows, Other row, En actions; elsewhere dt', () => {
  const item = { id: 'm1', type: 'agentMessage', delivery: 'async', questions: [
    { title: 'Which database should I target?', options: ['Postgres', 'SQLite'] }, { title: 'Anything else?', options: [] }] };
  const render = (presentation) => renderToStaticMarkup(React.createElement(Async.AsyncQuestionsContext.Provider,
    { value: { settled: new Set(), canAnswer: true, answer: async () => {}, skip: () => {}, presentation } }, React.createElement(Async.SourceAsyncQuestions, { item })));
  const code = render('card');
  assert.match(code, /^<div class="source-async-questions epitaxy-approval-card [^"]* epitaxy-card-outline epitaxy-question-card max-w-\[480px\] outline-none" role="group" aria-label="Which database should I target\?" data-async-questions="m1">/);
  assert.match(code, /<div class="bg-alpha-1 px-lg flex gap-md py-md items-center">/);
  assert.match(code, />1 of 2</);
  assert.match(code, /aria-pressed="false" class="epitaxy-answer-option flex w-full/);
  assert.match(code, /aria-label="Other" class="absolute inset-0 /);
  assert.match(code, /<div class="epitaxy-approval-actions flex items-center justify-end gap-sm px-lg pb-lg pt-md">/);
  assert.doesNotMatch(code, />Back</);
  const other = render(undefined);
  assert.match(other, /<span class="flex-1 select-text">Other<\/span>/);
  assert.doesNotMatch(other, /epitaxy-question-card/);
  const main = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8');
  assert.match(main, /presentation: mode === "code" \? "card" : undefined,\n  \}\), \[asyncQuestionsSettled, [^\]]*, mode\]\);/);
});
