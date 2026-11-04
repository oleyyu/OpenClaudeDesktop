import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// Where 3.6556.2 draws a background task's event as TurnStatus.Step and where it doesn't. The user's screenshot (a
// command this turn's own command row ran in the background, completed after the reply) gets no event at all:
// c06cf64bb drops a task whose tool call the transcript shows and skips its completed notification (locked in
// task-event-model.test.mjs). The events that remain (failed / stopped, or a task no shown tool call started) go
// through Oe, which only absorbs one into a tools run when the last assistant message ends with that run; otherwise it
// is a turn-level task_event → the "code.task_events" card (J4e → fX → sXe), whose finished form is the plain line,
// not a step. The step (KBe / qBe → c4a9ee384 wu → c734f318c Et) is only the tool-run builder's L() "step", for an
// event between grouped tool steps. Official chunks only parsed; SSR in middleware mode.
const app = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(OFFICIAL, file), 'utf8');
let server, E;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  E = await server.ssrLoadModule('/src/source-task-event.jsx');
});
after(() => server?.close());

test('3.6556.2 c06cf64bb Oe: an event joins a tools run only when the reply ends with one; else a turn-level task_event', () => {
  const parse = official('c06cf64bb-CdJdJuVd.js');
  assert.ok(parse.includes('Oe=(e,t)=>{let n=i[i.length-1];if(n?.author!=="assistant")return"pushed";let r=n.items[n.items.length-1];return r?.kind==="tools"?t&&r.tools.some(e=>e.id===t)?"dropped":Vy(r)?((r.taskEvents??=[]).push({at:r.tools.length,ev:e})'));
  assert.ok(parse.includes('"pushed"&&M("assistant",[s],g)'), 'a pushed task_notification is a turn-level item');
  const chunk = official('c96d752d0-CWv_7-n9.js');
  // Turn-level → card; inside a tools run → step only when a neighbour is a grouped (not lone) tool.
  assert.ok(chunk.includes('g(s,KW(n.id,u,"code.task_events",e));return}'));
  assert.ok(chunk.includes('L=(e,t)=>{let n=t[0];if(n===void 0)return;let r=f[e-1],i=f[e];return(r===void 0||v(r)||x(r,e-1))&&(i===void 0||v(i)||x(i,e))?'));
  // sXe: a finished event (or one in a group) is dX's plain line; only a running one outside a group is the card.
  assert.ok(chunk.includes('if(r||!c){let e=!g&&!!l&&!!u,n=!c,'));
  assert.ok(chunk.includes('f(dX,{asCard:!1,finished:n,focusTaskId:t.taskId,inert:e,children:d})'));
  assert.ok(chunk.includes('f(dX,{asCard:!0,focusTaskId:t.taskId,children:D})'));
});

test('a turn-end event that remains is the card row\'s plain line, not TurnStatus.Step', () => {
  // The generated slice the step form would use exists (D1: no second copy), but this row does not mount it.
  const turnStatus = fs.readFileSync(path.join(app, 'src/generated/working-line/turn-status.mjs'), 'utf8');
  assert.match(turnStatus, /export \{ It as TurnStatus, Et as TurnStatusStep \}/);
  const source = fs.readFileSync(path.join(app, 'src/source-task-event.jsx'), 'utf8');
  assert.doesNotMatch(source, /turn-status|TurnStatus\b/);
  const html = renderToStaticMarkup(React.createElement(E.SourceTaskEvent, { itemId: 'task-events:t1', onOpen: () => {},
    // A task no shown tool call started (known only from the core's snapshot) still reads as this line.
    events: [{ taskKey: 'b1', taskType: 'local_bash', status: 'completed', description: 'node app/scripts/landing-performance-preview.mjs', durationMs: 4000 }] }));
  assert.doesNotMatch(html, /TurnStatusStep/);
  assert.match(html, /^<div class="source-message source-task-events"><button type="button" class="source-task-event"[^>]*data-transcript-keeps-pin="">/);
  assert.match(html, /Background command completed<\/span><span class="stev-description"><bdi>· node app\/scripts\/landing-performance-preview\.mjs<\/bdi><\/span><span class="stev-elapsed">· took 4s<\/span>/);
});
