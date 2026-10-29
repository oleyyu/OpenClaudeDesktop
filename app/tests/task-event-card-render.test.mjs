import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// A background task's event at the end of a turn, as 2.42304.0 draws it: the reply's "code.task_events" card (h3e) in
// its own transcript row, RZ / o$e's plain line inside. The TurnStatus.Step form is only the tool-run builder's "step"
// (an event between grouped tool steps), which this host never places.
const app = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(OFFICIAL, file), 'utf8');
let server, E, S;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  E = await server.ssrLoadModule('/src/source-task-event.jsx');
  S = await server.ssrLoadModule('/src/source-session.jsx');
});
after(() => server?.close());
const render = (props) => renderToStaticMarkup(React.createElement(E.SourceTaskEvent, props));

test('2.42304.0: a turn\'s task_event is a code.task_events card in its own row; only an event between grouped steps is a step', () => {
  const chunk = official('c96d752d0-BOCqU7c2.js');
  // The reply's item switch makes the turn-level event a card.
  assert.ok(chunk.includes('case"task_event":{let e=A?.get(n.id);if(e===void 0||wL(e,r.hiddenTaskIds??oK)===void 0)return;for(let t of e)k.add(t.taskId);g(s,UK(n.id,u,"code.task_events",e));return}'));
  // The tool-run builder: a card when both neighbours stand alone, a detached step (lKe/uKe -> X.Step) otherwise.
  assert.ok(chunk.includes('"code.task_events",sKe(t))),"card")'));
  assert.ok(chunk.includes('lKe(n,a.intl,a.hiddenTaskIds??oK):uKe(t,a.intl,a.hiddenTaskIds??oK)),"step")'));
  // h3e: the card's row, lp being c8ba53634's assistant text inset.
  assert.ok(chunk.includes('"code.task_events":h3e'));
  assert.ok(chunk.includes('h3e=M(function({card:e}){let t=e3e(e);return t===void 0?null:b("div",{className:`${lp} flex min-w-0 flex-col empty:hidden`,children:b(RZ,{events:t})})})'));
  assert.ok(official('c8ba53634-Qe339QHm.js').includes('t="ps-[var(--cds-assistant-message-text-inset,0px)]"'));
  // o$e's settled line and LZ's button / div.
  assert.ok(chunk.includes('className:`text-body shrink-0 ${a?"text-danger":"text-secondary group-hover/tool:text-primary"}`'));
  assert.ok(chunk.includes('className:"text-body text-secondary group-hover/tool:text-primary min-w-0 truncate",children:["\\u00B7 ",c?b(fx,{segments:c}):s]'));
  assert.ok(chunk.includes('className:"text-body text-secondary group-hover/tool:text-primary shrink-0 whitespace-nowrap tabular-nums",children:["\\u00B7 ",b(Z,{defaultMessage:"took {elapsed}",id:"SLlmAvczvk",values:{elapsed:h}})]'));
  assert.ok(chunk.includes('className:"group/tool flex flex-col gap-1 py-0 max-w-full items-start text-start focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm"'));
  assert.ok(chunk.includes('b("div",{className:"flex flex-col gap-1 py-0 max-w-full items-start",children:i})'));
  // LZ's [_y]: "" is c0fbbe82d's data-transcript-keeps-pin.
  assert.ok(chunk.includes('y as _y}from"./c0fbbe82d-BOWKSems.js"'));
  assert.ok(official('c0fbbe82d-BOWKSems.js').includes('$n="data-transcript-keeps-pin"'));
  // Within a turn the rows are spaced by --chat-item-gap (the host's .source-message adjacency).
  assert.ok(chunk.includes('className:"flex flex-col gap-[var(--chat-item-gap)]"'));
});

test('a finished command is the plain line in its own transcript row; with the pane it is LZ\'s keeps-pin button', () => {
  const html = render({ itemId: 'task-events:t1', onOpen: () => {}, events: [{ taskKey: 'b1', taskType: 'local_bash', status: 'completed', description: 'node app/scripts/landing-performance-preview.mjs', durationMs: 4000 }] });
  assert.match(html, /^<div class="source-message source-task-events"><button type="button" class="source-task-event" data-transcript-item-id="task-events:t1" data-task-event-status="completed" data-transcript-keeps-pin="">/);
  assert.match(html, /<span class="stev-label">Background command completed<\/span><span class="stev-description"><bdi>· node app\/scripts\/landing-performance-preview\.mjs<\/bdi><\/span><span class="stev-elapsed">· took 4s<\/span>/);
  assert.match(html, /<\/button><\/div>$/);
  // No pane: the same line as a div, still its own row.
  const plain = render({ itemId: 'x', events: [{ taskType: 'local_agent', status: 'failed', description: 'Explorer' }] });
  assert.match(plain, /^<div class="source-message source-task-events"><div class="source-task-event" data-transcript-item-id="x" data-task-event-status="failed" data-failed="true">/);
  assert.match(plain, /<span class="stev-label" data-danger="true">Background agent failed<\/span>/);
  assert.doesNotMatch(plain, /<button/);
  assert.equal(render({ itemId: 'none', events: [] }), '');
});

test('the row takes the transcript row gap below the turn\'s edits card (the screenshot: no gap under the file card)', () => {
  const css = fs.readFileSync(path.join(app, 'src/source-task-event.css'), 'utf8');
  assert.match(css, /\.source-task-events\.source-message \{ display: flex; flex-direction: column; min-width: 0; padding-inline-start: var\(--cds-assistant-message-text-inset, 0px\); \}/);
  assert.match(css, /\.source-task-events\.source-message:empty \{ display: none; \}/);
  assert.doesNotMatch(css, /\.source-task-events[^{]*\{[^}]*margin/, 'the row gap comes from .source-message adjacency');
  const session = fs.readFileSync(path.join(app, 'src/source-session.css'), 'utf8');
  assert.match(session, /\.source-message \+ \.source-message \{\n  margin-top: var\(--chat-item-gap\);\n\}/);
  // main.jsx: after the turn's edits card (a .source-message), in a reply row boundary like every feed row (u9).
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const events = main.indexOf('<SourceTaskEvent events={taskEventsByTurn.get(item.turnId)}');
  assert.ok(events > main.indexOf('<SourceTurnEdits edits={edits}'));
  assert.equal(main.slice(main.lastIndexOf('<', events - 1), events), '<SourceTranscriptRowBoundary sessionId={current} item={item} kind="reply">');
  const turnEdits = fs.readFileSync(path.join(app, 'src/source-turn-edits.jsx'), 'utf8');
  assert.match(turnEdits, /<div className="source-message" data-turn-edits=\{turnId\}/);
});

test('the workflow notices are rows of their own too', () => {
  const notice = (fields) => React.createElement(S.SourceMessage, { item: { type: 'userMessage', id: 'n1', content: [], workflowNotification: fields } });
  for (const fields of [{ kind: 'escalation', status: 'question', workflow: 'review', agent: 'checker', question: 'q?' }, { kind: 'settings', status: 'changed', workflow: 'review' },
    { kind: 'stall', status: 'stalled', workflow: 'review', stalledMs: 60000 }, { status: 'completed', summary: 'Dynamic workflow "review" completed', taskId: 'r1', durationMs: 253000 }]) {
    const html = renderToStaticMarkup(notice(fields));
    assert.match(html, /^<div class="source-message source-task-events">/, fields.kind ?? fields.status);
  }
});
