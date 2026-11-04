import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  planMarkFromUpdate,
} from '../src/turn-box-plan-model.mjs';
import { emptyState, reduce } from '../src/state.js';

const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const readChunk = (prefix) => {
  const name = fs.existsSync(v1) ? fs.readdirSync(v1).find((file) => file.startsWith(prefix)) : undefined;
  return name ? fs.readFileSync(path.join(v1, name), 'utf8') : null;
};
const count = (text, needle) => text.split(needle).length - 1;

// Test oracle: cccc2cf0a rv, transcribed (the turn box card decision the tail feeds).
const RV_SOURCE = 'function rv({plan:e,planBeforeWrapUp:t,planTouchedThisTurn:n,planTurnEnded:r,compactedSincePlan:i,agentsRunning:a},o,s){let c=s&&t!==null?t:e;if(c===null||c.length===0)return null;if(r||!o)return(s||a>0)&&n?{todos:c,stale:!1,working:!1}:null;let l=c.every(e=>e.status==="completed");return!n&&l?null:{todos:c,stale:n?i?"compaction":!1:"prompt",working:!0}}';
function rv({ plan: e, planBeforeWrapUp: t, planTouchedThisTurn: n, planTurnEnded: r, compactedSincePlan: i, agentsRunning: a }, o, s) {
  const c = s && t !== null ? t : e;
  if (c === null || c.length === 0) return null;
  if (r || !o) return (s || a > 0) && n ? { todos: c, stale: false, working: false } : null;
  const l = c.every((todo) => todo.status === 'completed');
  return !n && l ? null : { todos: c, stale: n ? (i ? 'compaction' : false) : 'prompt', working: true };
}

const event = (method, params) => ({ kind: 'notification', method, params });
const apply = (state, method, params) => reduce(state, { event: event(method, params) });
const user = (id, turnId) => ({ id, type: 'userMessage', turnId, content: [{ type: 'text', text: id }] });

test('official source: N_ tail and rv still read as transcribed', (t) => {
  const tail = readChunk('c1ebb1aa4-');
  const card = readChunk('cccc2cf0a-');
  if (!tail || !card) return t.skip('2.42304.0 reference not on disk');
  assert.equal(count(tail, 'var Et={wrapUp:null,wrapUpCallId:null,wrapUpReceipt:null,plan:null,planBeforeWrapUp:null,planTouchedThisTurn:!1,planTurnEnded:!1,compactedSincePlan:!1,turnSettled:!1,agentsRunning:0,workedWithoutWrapUp:!1,proposedTaskIds:Object.freeze([])}'), 1);
  assert.equal(count(tail, 'if(i)return{wrapUp:null,wrapUpCallId:null,wrapUpReceipt:null,plan:n.length>0?n:null,planBeforeWrapUp:null,planTouchedThisTurn:c,planTurnEnded:m,compactedSincePlan:_,turnSettled:A,agentsRunning:O,workedWithoutWrapUp:!1,proposedTaskIds:L}'), 1);
  assert.equal(count(tail, 'l||(l=!0,m=u>0,_=!i&&g)'), 1);
  assert.equal(count(tail, 'function Wt(e,t){let n=B(e?.id??null),r=D(e),{todos:i}=_t(r?null:e)'), 1);
  assert.equal(count(card, 'n as N_'), 1);
  assert.equal(count(card, RV_SOURCE), 1);
  // W14-code r4 gen-final-4: the test-only TURN_BOX_EMPTY_TAIL / turnBoxTodos / runningAgentsSince / sameTurnBoxTodos
  // (left after closeout R4DC-N7 deleted turnBoxPlanTail) are deleted.
});

// W14-code r4 closeout R4DC-N7: turnBoxPlanTail / sameTurnBoxTail (test-only) are gone; the mark state.js records stays.
test('planMarkFromUpdate records the plan turn and the prompt it saw', () => {
  let state = apply(emptyState, 'turn/started', { threadId: 'P', turn: { id: 't1' } });
  state = apply(state, 'item/completed', { threadId: 'P', turnId: 't1', item: user('u1', 't1') });
  assert.deepEqual(planMarkFromUpdate('t1', state.items.P), { turnId: 't1', promptId: 'u1' });
  assert.deepEqual(planMarkFromUpdate('', []), { turnId: null, promptId: null });
});
