#!/usr/bin/env node
// Isolated protocol fixture. It never executes commands or enters production data.
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
if (!process.env.CODE_DESKTOP_DATA) throw new Error('Fixture requires an isolated CODE_DESKTOP_DATA');
const store = path.join(process.env.CODE_DESKTOP_DATA, 'fixture-threads.json');
let db = { next: 0, threads: {} };
try { db = JSON.parse(fs.readFileSync(store, 'utf8')); } catch {}
// Readers (the GUI suites) poll this file while turns complete, so the write
// must be atomic: writeFileSync truncates in place and a poller can observe a
// half-written object (permission-ui-test hit a torn read twice in a row).
const writeAtomic = (file, text) => { const temporary = `${file}.${process.pid}.tmp`; fs.writeFileSync(temporary, text); fs.renameSync(temporary, file); };
const persist = () => writeAtomic(store, JSON.stringify(db));
const send = m => process.stdout.write(JSON.stringify(m) + '\n');
const notify = (method, params) => send({ method, params });
const accountFixture=require('./account-fixture.cjs').createAccountFixture({profile:process.env.CODE_DESKTOP_DATA,send,notify});
const pending = new Map();
// R07 'fixture:input-steer': threads whose next turn/steer completes the held turn.
const steerCompletes = new WeakSet();
const loaded = new Set();
// Codex 0.155.1 creates paginated threads. Legacy history must be seeded
// explicitly; older GUI suites now exercise the same default as production.
const PAGINATED_FULL_HISTORY_DEPRECATION = 'Full-history hydration is deprecated for paginated threads; use `excludeTurns: true`, then page with `thread/turns/list` and `thread/items/list`.';
const PAGINATED_THREAD_READ_DEPRECATION = 'Full-history hydration is deprecated for paginated threads; omit `includeTurns` or set it to `false`, then page with `thread/turns/list` and `thread/items/list`.';
// History reads go to their own log so adding them cannot perturb a suite that
// counts entries in fixture-requests.jsonl.
const logHistory = (method, params, extra = {}) => fs.appendFileSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-history.jsonl'), JSON.stringify({ method, params, ...extra, at: new Date().toISOString() }) + '\n');
const historyMode = thread => thread?.historyMode === 'legacy' ? 'legacy' : 'paginated';
const newThreadHistoryMode = () => 'paginated';
const paginated = thread => historyMode(thread) === 'paginated';
const withMode = thread => thread ? { ...thread, historyMode: historyMode(thread) } : thread;
const metadataOnly = thread => thread ? { ...withMode(thread), turns: [] } : thread;
// thread/turns/list. sortDirection defaults to descending; itemsView "summary"
// withholds the items (TurnItemsView), "full" returns them.
function turnsPage(thread, p) {
  const limit = Math.max(1, Math.min(200, Number(p.limit) || 25));
  const view = p.itemsView === 'full' ? 'full' : 'summary';
  const ordered = p.sortDirection === 'asc' ? [...thread.turns] : [...thread.turns].reverse();
  const from = p.cursor ? Number(String(p.cursor).replace('turns:', '')) : 0;
  const slice = ordered.slice(from, from + limit);
  const data = slice.map(turn => {
    // A seeded turn may declare itemsView:"summary" to force the client onto
    // thread/items/list, exactly as the server does for an unloaded turn.
    const served = turn.itemsView === 'summary' ? 'summary' : view;
    return { id: turn.id, status: turn.status, error: turn.error || null, itemsView: served,
      items: served === 'full' ? structuredClone(turn.items || []) : [],
      startedAt: turn.startedAt ?? null, completedAt: turn.completedAt ?? null, durationMs: turn.durationMs ?? null };
  });
  const nextIndex = from + slice.length;
  return { data, nextCursor: nextIndex < ordered.length ? `turns:${nextIndex}` : null,
    backwardsCursor: slice.length ? `turns:${from}` : null };
}
// thread/items/list returns {turnId, item} entries in ascending order.
function itemsPage(thread, p) {
  const limit = Math.max(1, Math.min(500, Number(p.limit) || 100));
  const entries = [];
  for (const turn of thread.turns) for (const item of turn.items || []) entries.push({ turnId: turn.id, item: structuredClone(item) });
  const scoped = p.turnId ? entries.filter(entry => entry.turnId === p.turnId) : entries;
  const ordered = p.sortDirection === 'desc' ? [...scoped].reverse() : scoped;
  const from = p.cursor ? Number(String(p.cursor).replace('items:', '')) : 0;
  const slice = ordered.slice(from, from + limit);
  const nextIndex = from + slice.length;
  return { data: slice, nextCursor: nextIndex < ordered.length ? `items:${nextIndex}` : null,
    backwardsCursor: slice.length ? `items:${from}` : null };
}
// Deterministic gates used only inside an isolated GUI fixture profile.
const marker=name=>path.join(process.env.CODE_DESKTOP_DATA,'fixture-background-'+name);
const consumeMarker=name=>{try{fs.unlinkSync(marker(name));return true;}catch(error){if(error.code!=='ENOENT')throw error;return false;}};
const awaitMarker=(name,callback)=>{const timer=setInterval(()=>{if(consumeMarker(name)){clearInterval(timer);callback();}},20);};
const streams = new Map();
const pendingInterrupts = new Map();
// Composer-states acceptance: every turn/start, turn/steer and thread/queue/*
// request is appended verbatim so the GUI suite can verify real payloads.
const logRequest = (method, params, extra = {}) => fs.appendFileSync(path.join(process.env.CODEX_DESKTOP_DATA || process.env.CODE_DESKTOP_DATA, 'fixture-requests.jsonl'), JSON.stringify({ method, params, ...extra, at: new Date().toISOString() }) + '\n');
const queueChanged = thread => notify('thread/queue/changed', { threadId: thread.id });
// Customize (Skills / Connectors / Plugins) acceptance: an optional seed file in
// the isolated profile describes the catalog; "fixture-notify.json" lets the
// suite make the fixture emit server notifications (skills/changed,
// mcpServer/startupStatus/updated, mcpServer/oauthLogin/completed) at a time
// it records, and "customize-fail.marker" forces skills/config/write to fail.
const customizeStore = path.join(process.env.CODE_DESKTOP_DATA, 'fixture-customize.json');
function readCustomize() { try { return JSON.parse(fs.readFileSync(customizeStore, 'utf8')); } catch { return null; } }
function writeCustomize(data) { writeAtomic(customizeStore, JSON.stringify(data)); }
// Catalog load knobs in the same seed (skills-mcp-ui-test load states): skillsFail /
// pluginsFail / mcpFail make the list fail while set, and skillsDelayMs /
// pluginsDelayMs / mcpDelayMs (≤ 5000) hold the reply so the loading skeleton is
// observable. MCP knobs apply only to the Customize request shape (no `limit`);
// the Developer settings snapshot (main.cjs desktop-settings-read) is untouched.
function replyCustomize(m, delayMs, fail, message, result) {
  const reply = () => send(fail ? { id: m.id, error: { code: -32603, message } } : { id: m.id, result });
  const delay = Math.max(0, Math.min(5000, Number(delayMs) || 0));
  if (delay > 0) setTimeout(reply, delay); else reply();
}
const notifyFile = path.join(process.env.CODE_DESKTOP_DATA, 'fixture-notify.json');
setInterval(() => {
  let queued;
  try { queued = JSON.parse(fs.readFileSync(notifyFile, 'utf8')); fs.unlinkSync(notifyFile); } catch { return; }
  for (const entry of queued?.notifications || []) {
    if (typeof entry?.method !== 'string') continue;
    logRequest(`notify:${entry.method}`, entry.params || {});
    notify(entry.method, entry.params || {});
  }
}, 40);
process.stdin.on('end', () => process.exit(0));
// A held turn streams slowly until it is interrupted or the queue drains it.
// "fixture:hold-review" marks the turn non-steerable like a real review turn.
function sideToolsFixture(thread, turn) {
  const actions=[{type:'read',name:'README.md',path:path.join(thread.cwd,'README.md')},{type:'search',query:'needle',path:thread.cwd},{type:'listFiles',path:thread.cwd}];
  let index=0,timer,done=false;
  const finish=status=>{if(done)return;done=true;clearTimeout(timer);streams.delete(thread.id);complete(thread,status==='completed'?'SIDE_TOOL_REPLY':'',status);};
  const next=()=>{
    if(done)return;
    if(index>=actions.length){timer=setTimeout(()=>finish('completed'),1000);return;}
    const action=actions[index++],item={id:`side-tool-${turn.id}-${index}`,type:'commandExecution',status:'inProgress',command:'fixture inspection',commandActions:[action],cwd:thread.cwd,aggregatedOutput:''};
    turn.items.push(item);notify('item/started',{threadId:thread.id,turnId:turn.id,item});
    timer=setTimeout(()=>{if(done)return;item.status='completed';item.exitCode=0;notify('item/completed',{threadId:thread.id,turnId:turn.id,item});next();},1000);
  };
  streams.set(thread.id,{pause:()=>clearTimeout(timer),cancel:()=>finish('interrupted')});timer=setTimeout(next,100);
}
// README screenshots (scripts/readme-screenshots.mjs): an optional seed "fixture-demo-turns.json" in the isolated
// profile maps a user prompt to a scripted turn, so a demo session can show live states (running tools, the task list,
// an approval card) with made-up but real-shaped protocol traffic. {turns: {<prompt>: {startedAgo, steps: [...]}}}
// where each step waits `after` ms and then does one of:
//   start: item            push the item and send item/started (startedAgo: seconds -> startedAtMs)
//   complete: item         replace/push the item and send item/completed
//   delta: {id, text}      item/agentMessage/delta;   output: {id, text}  item/commandExecution/outputDelta
//   usage: {output, total, window}   thread/tokenUsage/updated for this turn
//   request: {method, params}        a server request (approval / question); the answer is recorded, nothing else
//   done: text             complete the turn with that reply
// A turn without `done` keeps running until it is interrupted.
function readDemoTurn(text) {
  try { return JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-demo-turns.json'), 'utf8'))?.turns?.[text] ?? null; } catch { return null; }
}
function demoTurn(thread, turn, script) {
  const steps = Array.isArray(script.steps) ? script.steps : [];
  let index = 0, timer, stopped = false, outputTotal = 0;
  const ids = { threadId: thread.id, turnId: turn.id };
  const put = item => { const at = turn.items.findIndex(entry => entry.id === item.id); if (at >= 0) turn.items[at] = item; else turn.items.push(item); persist(); };
  const run = step => {
    if (step.start) { const item = structuredClone(step.start); put(item); notify('item/started', { ...ids, item, ...(Number.isFinite(step.startedAgo) ? { startedAtMs: Date.now() - step.startedAgo * 1000 } : {}) }); }
    if (step.complete) { const item = structuredClone(step.complete); put(item); notify('item/completed', { ...ids, item }); }
    if (step.delta) { const item = turn.items.find(entry => entry.id === step.delta.id); if (item) item.text = (item.text || '') + step.delta.text; notify('item/agentMessage/delta', { ...ids, itemId: step.delta.id, delta: step.delta.text }); }
    if (step.output) { const item = turn.items.find(entry => entry.id === step.output.id); if (item) item.aggregatedOutput = (item.aggregatedOutput || '') + step.output.text; notify('item/commandExecution/outputDelta', { ...ids, itemId: step.output.id, delta: step.output.text }); }
    if (step.usage) {
      const last = Math.max(1, step.usage.output - outputTotal); outputTotal = step.usage.output;
      notify('thread/tokenUsage/updated', { ...ids, tokenUsage: { total: { totalTokens: step.usage.total, inputTokens: step.usage.total - outputTotal, outputTokens: outputTotal, cachedInputTokens: 0, reasoningOutputTokens: 0 },
        last: { totalTokens: step.usage.total, inputTokens: step.usage.total - outputTotal, outputTokens: last, cachedInputTokens: 0, reasoningOutputTokens: 0 }, modelContextWindow: step.usage.window || 128000 } });
    }
    if (step.request) { const id = `demo-request-${++db.next}`; pending.set(id, { thread, kind: 'command', onResponse: () => {} }); send({ id, method: step.request.method, params: { ...ids, ...step.request.params } }); }
    if (typeof step.done === 'string') { stopped = true; streams.delete(thread.id); complete(thread, step.done, 'completed', { usage: false }); }
  };
  const next = () => {
    if (stopped || index >= steps.length) return;
    const step = steps[index++];
    timer = setTimeout(() => { if (stopped) return; run(step); next(); }, Math.max(0, Number(step.after) || 0));
  };
  streams.set(thread.id, { pause: () => clearTimeout(timer), cancel: () => {
    stopped = true; clearTimeout(timer); streams.delete(thread.id); turn.status = 'interrupted'; persist(); notify('turn/completed', { threadId: thread.id, turn });
  } });
  next();
}
function holdFixture(thread, turn, nonSteerable) {
  const item = { id: `reply-${turn.id}`, type: 'agentMessage', text: '' };
  turn.items.push(item); turn.nonSteerable = !!nonSteerable;
  notify('item/started', { threadId: thread.id, turnId: turn.id, item });
  let tick = 0, timer, finished = false;
  function finish(status = 'completed') {
    if (finished) return;
    finished = true; clearTimeout(timer); streams.delete(thread.id);
    turn.status = status; thread.updatedAt = Math.floor(Date.now() / 1000); persist();
    notify('item/completed', { threadId: thread.id, turnId: turn.id, item });
    notify('turn/completed', { threadId: thread.id, turn });
    drainQueue(thread);
  }
  function next() {
    if (finished) return;
    tick++;
    const delta = `HOLD_CHUNK_${String(tick).padStart(2, '0')} the fixture keeps this turn running.\n\n`;
    item.text += delta;
    notify('item/agentMessage/delta', { threadId: thread.id, turnId: turn.id, itemId: item.id, delta });
    if (tick < 100) timer = setTimeout(next, 300); else finish();
  }
  streams.set(thread.id, { pause: () => clearTimeout(timer), cancel: () => finish('interrupted') });
  timer = setTimeout(next, 100);
}
// Real Codex drains the queue when the thread goes idle: the next queued
// submission becomes a new turn whose reply completes immediately.
function drainQueue(thread) {
  const queued = Array.isArray(thread.queue) ? thread.queue.shift() : null;
  if (!queued) return;
  persist(); queueChanged(thread);
  const turn = { id: `turn-${++db.next}`, status: 'inProgress', items: [{ id: `user-${db.next}`, type: 'userMessage', content: queued.input }] };
  thread.turns.push(turn); persist();
  notify('turn/started', { threadId: thread.id, turn });
  notify('item/completed', { threadId: thread.id, turnId: turn.id, item: turn.items[0] });
  setTimeout(() => complete(thread, `QUEUED_FIXTURE_REPLY ${queued.id}`), 50);
}
function streamFixture(thread, turn, needsApproval) {
  const item = { id: `reply-${turn.id}`, type: 'agentMessage', text: '' };
  turn.items.push(item);
  notify('item/started', { threadId: thread.id, turnId: turn.id, item });
  let tick = 0, timer, finished = false, streamed = false, approved = !needsApproval;
  const requestId = `scroll-approval-${turn.id}`;
  function finish(status = 'completed') {
    if (finished || status === 'completed' && (!streamed || !approved)) return;
    finished = true; clearTimeout(timer); streams.delete(thread.id);
    if (pending.delete(requestId)) notify('serverRequest/resolved', { threadId: thread.id, requestId });
    turn.status = status; thread.updatedAt = Math.floor(Date.now() / 1000); persist();
    notify('item/completed', { threadId: thread.id, turnId: turn.id, item });
    notify('turn/completed', { threadId: thread.id, turn });
  }
  function next() {
    if (finished) return;
    tick++;
    const delta = `SCROLL_CHUNK_${String(tick).padStart(2, '0')} A deterministic streamed paragraph grows below the current reading anchor without executing tools.\n\n`;
    item.text += delta;
    notify('item/agentMessage/delta', { threadId: thread.id, turnId: turn.id, itemId: item.id, delta });
    if (needsApproval && tick === 10) {
      pending.set(requestId, { thread, kind: 'command', onResponse: () => { approved = true; finish(); } });
      send({ id: requestId, method: 'item/commandExecution/requestApproval', params: { threadId: thread.id, turnId: turn.id, itemId: `command-${turn.id}`, command: 'printf scroll-fixture', reason: 'Isolated scrolling acceptance: a real protocol approval request.' } });
    }
    if (tick < 20) timer = setTimeout(next, 100);
    else { streamed = true; persist(); finish(); }
  }
  streams.set(thread.id, { pause: () => clearTimeout(timer), cancel: () => finish('interrupted') });
  timer = setTimeout(next, 100);
}
function complete(thread, text, status = 'completed', { usage = true } = {}) {
  const turn = thread.turns.at(-1);
  const item = { id: `reply-${turn.id}`, type: 'agentMessage', text };
  turn.items.push(item); turn.status = status; thread.updatedAt = Math.floor(Date.now() / 1000); persist();
  notify('item/completed', { threadId: thread.id, turnId: turn.id, item });
  if (usage) notify('thread/tokenUsage/updated', { threadId: thread.id, tokenUsage: { total: { totalTokens: thread.turns.length * 300 }, last: { totalTokens: 100 }, modelContextWindow: 128000 } });
  notify('turn/completed', { threadId: thread.id, turn });
  drainQueue(thread);
}
// Failed-turn acceptance (turn-errors-ui-test). ErrorNotification
// {error, willRetry, threadId, turnId} then TurnCompleted status "failed" with
// Turn.error {message, codexErrorInfo, additionalDetails} (ts/v2/TurnError.ts),
// persisted so thread/turns/list replays the failure after a relaunch.
// "usage": willRetry:true (rateLimitExceeded), a real hold, then usageLimitExceeded.
// "other": a partial reply, then CodexErrorInfo "other". The retry hold length
// comes from the isolated profile (fixture-turn-error.json {retryMs}).
// R08 knobs: "output-limit" is the DeepSeek bridge's max-tokens stop (a partial
// reply, then TurnCompleted status "completed" carrying Turn.error MAX_TOKENS and
// no ErrorNotification); "context" fails with contextWindowExceeded; "thread"
// completes the turn, then sends ErrorNotification turnId '' willRetry false.
function turnErrorFixture(thread, turn, kind) {
  let knob = {};
  try { knob = JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-turn-error.json'), 'utf8')); } catch {}
  const retryMs = Math.max(0, Math.min(10000, Number(knob.retryMs) || 1500));
  const fail = (error) => {
    streams.delete(thread.id);
    turn.status = 'failed'; turn.error = error; thread.updatedAt = Math.floor(Date.now() / 1000); persist();
    notify('error', { threadId: thread.id, turnId: turn.id, willRetry: false, error });
    notify('turn/completed', { threadId: thread.id, turn });
  };
  let timer;
  streams.set(thread.id, { pause: () => clearTimeout(timer), cancel: () => { clearTimeout(timer); streams.delete(thread.id); turn.status = 'interrupted'; persist(); notify('turn/completed', { threadId: thread.id, turn }); } });
  if (kind === 'thread') {
    timer = setTimeout(() => {
      streams.delete(thread.id);
      complete(thread, 'THREAD_ERROR_REPLY');
      notify('error', { threadId: thread.id, turnId: '', willRetry: false,
        error: { message: 'FIXTURE_THREAD_FAILURE: the agent stopped outside a turn.', codexErrorInfo: null, additionalDetails: null, misalignment: null } });
    }, 200);
    return;
  }
  if (kind === 'context') {
    timer = setTimeout(() => fail({ message: 'FIXTURE_CONTEXT_FULL: the conversation no longer fits the model context window.',
      codexErrorInfo: 'contextWindowExceeded', additionalDetails: 'CONTEXT_WINDOW_EXCEEDED', misalignment: null }), 200);
    return;
  }
  if (kind === 'output-limit') {
    const partial = { id: `reply-${turn.id}`, type: 'agentMessage', text: 'OUTPUT_LIMIT_PARTIAL: the answer stops in the middle of' };
    turn.items.push(partial);
    notify('item/completed', { threadId: thread.id, turnId: turn.id, item: partial });
    timer = setTimeout(() => {
      streams.delete(thread.id);
      turn.status = 'completed'; thread.updatedAt = Math.floor(Date.now() / 1000);
      turn.error = { message: 'Response exceeded the output limit', codexErrorInfo: null, additionalDetails: 'MAX_TOKENS', misalignment: null };
      persist(); notify('turn/completed', { threadId: thread.id, turn });
    }, 200);
    return;
  }
  if (kind === 'usage') {
    notify('error', { threadId: thread.id, turnId: turn.id, willRetry: true,
      error: { message: 'exceeded retry limit, last status: 429 Too Many Requests; retrying 1/5 in 1s…', codexErrorInfo: 'rateLimitExceeded', additionalDetails: null, misalignment: null } });
    timer = setTimeout(() => fail({ message: "You've hit your usage limit. Upgrade to Pro, or try again at 3:05 PM.",
      codexErrorInfo: 'usageLimitExceeded', additionalDetails: 'FIXTURE_USAGE_DETAILS plan=plus window=5h', misalignment: null }), retryMs);
    return;
  }
  const item = { id: `reply-${turn.id}`, type: 'agentMessage', text: 'Partial answer before the failure.' };
  turn.items.push(item);
  notify('item/completed', { threadId: thread.id, turnId: turn.id, item });
  timer = setTimeout(() => fail({ message: 'FIXTURE_OTHER_FAILURE: the model stream ended unexpectedly.', codexErrorInfo: 'other', additionalDetails: null, misalignment: null }), 200);
}
function codeFenceStream(thread, turn) {
  const item = { id: `reply-${turn.id}`, type: 'agentMessage', text: '' };
  turn.items.push(item);
  notify('item/started', { threadId: thread.id, turnId: turn.id, item });
  let timer, done = false, chunk = 0;
  const delta = text => {
    if (done) return;
    item.text += text;
    notify('item/agentMessage/delta', { threadId: thread.id, turnId: turn.id, itemId: item.id, delta: text });
  };
  function finish(status = 'completed') {
    if (done) return;
    done = true; clearTimeout(timer); streams.delete(thread.id);
    turn.status = status; thread.updatedAt = Math.floor(Date.now() / 1000); persist();
    notify('item/completed', { threadId: thread.id, turnId: turn.id, item });
    notify('turn/completed', { threadId: thread.id, turn });
  }
  function grow() {
    if (done) return;
    if (chunk === 0) delta('\nconst phase = "OPEN_FENCE_BODY";\n');
    delta(Array.from({length:10}, (_, row) => `const line${chunk * 10 + row} = "A_LONG_CODE_TOKEN_${'abcdef'.repeat(18)}";`).join('\n') + '\n');
    chunk++;
    if (chunk < 6) timer = setTimeout(grow, 400);
    else timer = setTimeout(() => { delta('\nconst final = "FENCE_STREAM_DONE";\n```\n'); finish(); }, 500);
  }
  streams.set(thread.id, { pause: () => clearTimeout(timer), cancel: () => finish('interrupted') });
  delta('Prior code:\n\n```js\nconst prior = "CLOSED_PRIOR";\n```\n\nStreaming code:\n\n```js');
  timer = setTimeout(grow, 800);
}
// 0.155.1 sub-agent fan-out. codex-rs lib.rs:1252-1266 -> thread_processor.rs
// :3609-3640 attach every initialized connection to a newly created thread, so
// a spawned sub-agent's thread/started, turn/* and item/* arrive on this same
// stdio connection keyed by the CHILD threadId. thread/list hides sub-agent
// sources unless asked for them (filters.rs:121-150).
function spawnSubagent(thread, { approval = false } = {}) {
  const childId = `fixture-subagent-${++db.next}`;
  const at = Math.floor(Date.now() / 1000);
  const child = { id: childId, sessionId: thread.id, parentThreadId: thread.id, cwd: thread.cwd, name: null,
    preview: 'Sub-agent fixture', createdAt: at, updatedAt: at, historyMode: 'paginated', model: 'fixture-2',
    agentNickname: 'quiet-otter', agentRole: 'explorer', canAcceptDirectInput: false, status: { type: 'idle' }, turns: [], archived: false };
  db.threads[childId] = child; persist();
  notify('thread/started', { thread: { ...child, turns: [] } });
  notify('thread/status/changed', { threadId: childId, status: { type: 'active', activeFlags: [] } });
  const turn = { id: `turn-${++db.next}`, status: 'inProgress', items: [] };
  child.turns.push(turn); persist();
  notify('turn/started', { threadId: childId, turn });
  const item = { id: `subagent-cmd-${db.next}`, type: 'commandExecution', command: 'printf SUBAGENT_CHILD_ITEM',
    status: 'inProgress', commandActions: [], aggregatedOutput: '' };
  turn.items.push(item); persist();
  notify('item/started', { threadId: childId, turnId: turn.id, item });
  const finish = () => {
    item.status = 'completed'; item.aggregatedOutput = 'SUBAGENT_CHILD_ITEM'; turn.status = 'completed'; persist();
    notify('item/completed', { threadId: childId, turnId: turn.id, item });
    notify('turn/completed', { threadId: childId, turn });
    notify('thread/status/changed', { threadId: childId, status: { type: 'idle' } });
    complete(thread, approval ? 'SUBAGENT_APPROVAL_FIXTURE_REPLY' : 'SUBAGENT_FIXTURE_REPLY');
  };
  if (!approval) { setTimeout(finish, 150); return; }
  // The sub-agent's own serverRequest: it carries the CHILD threadId, so the
  // client has to attribute it to the session that owns the child or the
  // sub-agent turn blocks with nothing on screen.
  const requestId = `subagent-approval-${db.next}`;
  pending.set(requestId, { thread: child, kind: 'command', onResponse: () => finish() });
  setTimeout(() => send({ id: requestId, method: 'item/commandExecution/requestApproval',
    params: { threadId: childId, turnId: turn.id, itemId: item.id, command: 'printf SUBAGENT_CHILD_ITEM',
      reason: 'SUBAGENT_APPROVAL_FIXTURE: a sub-agent thread asks the owning session for approval.' } }), 120);
}
// Run-a-command acceptance. Real 0.155.1 shapes only: ItemStartedNotification
// carries startedAtMs (the running footer counts from it), the output arrives
// as item/commandExecution/outputDelta, and the approval is a real
// item/commandExecution/requestApproval serverRequest naming the same itemId.
// Deterministic real-protocol agent lifecycle; phases are driven by turn/steer.
function agentDemo(thread,turn,description) {
  const id=`agent-child-${++db.next}`;
  const child={id,parentThreadId:thread.id,agentNickname:'nova',agentRole:'reviewer',model:'gpt-6-astra',cwd:thread.cwd,source:{subAgent:{thread_spawn:{parent_thread_id:thread.id,depth:1,agent_path:'nova'}}},historyMode:'paginated',createdAt:Date.now()/1000,updatedAt:Date.now()/1000,turns:[]};
  db.threads[id]=child;loaded.add(id);
  const childTurn={id:`agent-turn-${db.next}`,status:'inProgress',items:[]};child.turns.push(childTurn);
  const spawn={id:`agent-spawn-${db.next}`,type:'collabAgentToolCall',tool:'spawnAgent',senderThreadId:thread.id,receiverThreadIds:[id],prompt:'Audit the login flow',model:'gpt-6-astra',reasoningEffort:null,status:'completed',agentsStates:{[id]:{status:'running',message:null}},
    // -described: the DeepSeek core keeps the delegation's description on the item.
    ...(description?{description}:{})};
  turn.items.push(spawn);thread.agentDemo={id,spawnId:spawn.id};persist();
  notify('thread/started',{thread:child});notify('turn/started',{threadId:id,turn:childTurn});notify('item/completed',{threadId:thread.id,turnId:turn.id,item:spawn});
}
function agentDemoPhase(thread,phase) {
  const child=db.threads[thread.agentDemo?.id];if(!child)return;
  const turn=child.turns.at(-1),parentTurn=thread.turns.at(-1);
  if(phase==='activity') {
    const prompt={id:'agent-prompt',type:'userMessage',content:[{type:'text',text:'Audit the login flow'}]};turn.items.push(prompt);notify('item/completed',{threadId:child.id,turnId:turn.id,item:prompt});
    for(let i=0;i<3;i++) {
      const item={id:`agent-tool-${i}`,type:'commandExecution',command:'git status --short',commandActions:[],status:'completed',cwd:child.cwd,aggregatedOutput:`CHILD_TOOL_OUTPUT_${i}`,exitCode:0};
      turn.items.push(item);notify('item/started',{threadId:child.id,turnId:turn.id,item:{...item,status:'inProgress'}});notify('item/completed',{threadId:child.id,turnId:turn.id,item});
    }
  } else if(phase==='nested') {
    const id=`${child.id}-nested`,grand={id,parentThreadId:child.id,agentNickname:'echo',model:'gpt-6-astra',source:{subAgent:{thread_spawn:{parent_thread_id:child.id,depth:2,agent_path:'nova/echo'}}},cwd:child.cwd,historyMode:'paginated',turns:[{id:'nested-turn',status:'completed',items:[{id:'nested-answer',type:'agentMessage',text:'NESTED_AGENT_RESULT'}]}]};
    db.threads[id]=grand;loaded.add(id);notify('thread/started',{thread:grand});
    const item={id:'nested-spawn',type:'collabAgentToolCall',tool:'spawnAgent',senderThreadId:child.id,receiverThreadIds:[id],status:'completed',prompt:'Check tests',model:'gpt-6-astra',agentsStates:{[id]:{status:'completed',message:'NESTED_AGENT_RESULT'}}};
    turn.items.push(item);notify('item/completed',{threadId:child.id,turnId:turn.id,item});
  } else if(['completed','empty','interrupted','failed'].includes(phase)) {
    if(phase==='completed') {const item={id:'agent-answer',type:'agentMessage',text:'CHILD_FINAL_RESULT'};turn.items.push(item);notify('item/completed',{threadId:child.id,turnId:turn.id,item});}
    turn.status=phase==='empty'?'completed':phase;if(phase==='failed')turn.error={message:'Fixture child failure'};
    notify('turn/completed',{threadId:child.id,turn});notify('thread/status/changed',{threadId:child.id,status:{type:'idle'}});
    complete(thread,'PARENT_DONE');
  }
  persist();
}
function runCommandLive(thread, turn) {
  const at = Date.now();
  const slow = { id: `run-cmd-slow-${++db.next}`, type: 'commandExecution', command: 'git status --short',
    cwd: thread.cwd, processId: null, source: 'agent', status: 'inProgress', commandActions: [],
    aggregatedOutput: '', exitCode: null, durationMs: null };
  const fresh = { id: `run-cmd-fresh-${++db.next}`, type: 'commandExecution', command: 'npm test --silent',
    cwd: thread.cwd, processId: null, source: 'agent', status: 'inProgress', commandActions: [],
    aggregatedOutput: '', exitCode: null, durationMs: null };
  turn.items.push(slow, fresh); persist();
  // Eleven seconds ago: past the ten-second threshold of the running footer.
  notify('item/started', { threadId: thread.id, turnId: turn.id, item: slow, startedAtMs: at - 11000 });
  // One second ago: below the threshold, so no duration is shown.
  notify('item/started', { threadId: thread.id, turnId: turn.id, item: fresh, startedAtMs: at - 1000 });
  const chunks = ['RUN_COMMAND_ONE\n', '\x1b[31mRUN_COMMAND_RED\x1b[0m\n', 'RUN_COMMAND_THREE\n'];
  let index = 0;
  const step = () => {
    if (index >= chunks.length) { persist(); return; }
    const delta = chunks[index++];
    slow.aggregatedOutput += delta;
    notify('item/commandExecution/outputDelta', { threadId: thread.id, turnId: turn.id, itemId: slow.id, delta });
    setTimeout(step, 40);
  };
  setTimeout(step, 40);
  streams.set(thread.id, { pause: () => {}, cancel: () => {
    slow.status = 'interrupted'; fresh.status = 'interrupted'; turn.status = 'interrupted'; persist();
    notify('turn/completed', { threadId: thread.id, turn });
  } });
}
function runCommandApproval(thread, turn) {
  const item = { id: `run-cmd-approval-${++db.next}`, type: 'commandExecution', command: 'git push --force',
    cwd: thread.cwd, processId: null, source: 'agent', status: 'inProgress', commandActions: [],
    aggregatedOutput: '', exitCode: null, durationMs: null };
  turn.items.push(item); persist();
  notify('item/started', { threadId: thread.id, turnId: turn.id, item, startedAtMs: Date.now() - 11000 });
  const requestId = `run-command-approval-${db.next}`;
  pending.set(requestId, { thread, kind: 'command', onResponse: response => {
    const accepted = ['accept', 'acceptForSession'].includes(response.result?.decision);
    item.status = accepted ? 'completed' : 'declined';
    if (accepted) item.aggregatedOutput = 'RUN_COMMAND_APPROVED\n';
    turn.status = 'completed'; thread.updatedAt = Math.floor(Date.now() / 1000); persist();
    notify('item/completed', { threadId: thread.id, turnId: turn.id, item, completedAtMs: Date.now() });
    notify('turn/completed', { threadId: thread.id, turn });
  } });
  setTimeout(() => send({ id: requestId, method: 'item/commandExecution/requestApproval',
    params: { kind: 'command', threadId: thread.id, turnId: turn.id, itemId: item.id, startedAtMs: Date.now(),
      environmentId: null, command: item.command, cwd: thread.cwd, commandActions: [],
      reason: 'RUN_COMMAND_FIXTURE: the command needs your approval.' } }), 60);
}
// A review/compact sub-agent: the app-server classifies it through
// Thread.source {subAgent:"review"} and leaves parentThreadId null
// (work/protocol-0155-audit/probe.json threadListSub shows three real ones on
// this machine). It must not become a sidebar session either.
function spawnReviewSubagent(thread) {
  const childId = `fixture-review-subagent-${++db.next}`;
  const at = Math.floor(Date.now() / 1000);
  const child = { id: childId, sessionId: thread.id, parentThreadId: null, source: { subAgent: 'review' },
    cwd: thread.cwd, name: null, preview: 'Review sub-agent fixture', createdAt: at, updatedAt: at,
    historyMode: 'paginated', model: 'fixture-2', agentNickname: null, agentRole: null,
    status: { type: 'idle' }, turns: [], archived: false };
  db.threads[childId] = child; persist();
  notify('thread/started', { thread: { ...child, turns: [] } });
  const turn = { id: `turn-${++db.next}`, status: 'completed', items: [] };
  child.turns.push(turn); persist();
  notify('turn/started', { threadId: childId, turn });
  setTimeout(() => {
    notify('turn/completed', { threadId: childId, turn });
    complete(thread, 'REVIEW_SUBAGENT_FIXTURE_REPLY');
  }, 150);
}
readline.createInterface({ input: process.stdin }).on('line', line => {
  const m = JSON.parse(line);
  if (m.method === 'initialized') return;
  if (!m.method) {
    const entry = pending.get(m.id); if (!entry) return;
    const { thread, kind } = entry;
    const accepted = kind === 'elicitation' ? m.result?.action === 'accept' : kind === 'permissions' ? !!m.result?.permissions?.network : kind === 'input' ? Object.values(m.result?.answers || {}).some(a => a.answers?.length) : ['accept','acceptForSession'].includes(m.result?.decision);
    fs.appendFileSync(path.join(process.env.CODE_DESKTOP_DATA,'fixture-responses.jsonl'), JSON.stringify(m) + '\n');
    notify('serverRequest/resolved', { threadId: thread.id, requestId: m.id }); pending.delete(m.id);
    if (entry.onResponse) { entry.onResponse(m); return; }
    notify('turn/plan/updated', { threadId: thread.id, plan: [{ step: 'Review requested action', status: 'completed' }, { step: 'Respect user decision', status: 'completed' }] });
    notify('turn/diff/updated', { threadId: thread.id, diff: '--- a/example.txt\n+++ b/example.txt\n-old\n+new' });
    complete(thread, accepted ? 'APPROVAL_ACCEPTED' : 'APPROVAL_DENIED'); return;
  }
  const p = m.params || {}; let result;
  if(accountFixture?.(m))return;
  // Usage acceptance: readonly RPC replies captured at request time, including
  // errors and explicit release gates. Only the isolated fixture reads this file.
  // codeDesktop/stats/read is the DeepSeek bridge's home stats (harness usage.js codeStats); the app
  // only asks a core whose initialize lists capabilities.codeStats (fixture-core.json). Unseeded, it
  // is unknown here, as on a real Codex app-server.
  if (['account/read','account/rateLimits/read','account/usage/read','codeDesktop/stats/read','account/rateLimitResetCredit/consume','account/sendAddCreditsNudgeEmail'].includes(m.method)) {
    let overrides;try{overrides=JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA,'fixture-usage.json'),'utf8'));}catch{}
    if (overrides && Object.hasOwn(overrides,m.method)) {
      const reply=overrides[m.method];logRequest(m.method,p);
      const message={id:m.id,...(reply.error?{error:reply.error}:{result:reply.result})};
      if(reply.hold && /^[a-z0-9-]+$/.test(reply.hold)) {
        const gate=path.join(process.env.CODE_DESKTOP_DATA,'fixture-usage-'+reply.hold);
        writeAtomic(gate+'-held.json',JSON.stringify({method:m.method,requestId:m.id}));
        const timer=setInterval(()=>{try{fs.unlinkSync(gate+'-release');}catch(error){if(error.code==='ENOENT')return;throw error;}clearInterval(timer);send(message);writeAtomic(gate+'-sent.json',JSON.stringify({requestId:m.id}));},20);
      } else send(message);
      return;
    }
  }
  const thread = db.threads[p.threadId];
  switch (m.method) {
    case 'initialize': {
      result = { userAgent: 'codex-fixture/2',codexHome:process.env.CODEX_HOME||path.join(process.env.CODE_DESKTOP_DATA,'codex-home'),platformFamily:'unix',platformOs:'macos' };
      // CODE_DESKTOP_FIXTURE_CORE_FILE names another seed, so one profile can host two fixture cores (cores-ui-test).
      // Optional seed: bridge capabilities to advertise (main.cjs coreInfo), read per connection so a reconnect
      // can pick up a change; e.g. {capabilities:{livePermissions:true}} for codeDesktop/thread/permissions.
      try { const core = JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA, process.env.CODE_DESKTOP_FIXTURE_CORE_FILE || 'fixture-core.json'), 'utf8')); if (core?.capabilities) result.capabilities = core.capabilities; if (typeof core?.engine === 'string') result.engine = core.engine; } catch {}
      break;
    }
    // The DeepSeek bridge extension (harness index.js livePermissions), answered as the bridge does: applied to a
    // loaded thread only. Only a client told capabilities.livePermissions sends it.
    // README screenshots: the bridge's codeDesktop/contextUsage/read (capabilities.contextUsage) answered from the
    // isolated seed fixture-context-usage.json; without it the method is unknown, as on a core that never measures.
    case 'codeDesktop/contextUsage/read': {
      let seed=null;try{seed=JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA,'fixture-context-usage.json'),'utf8'));}catch{}
      if(!seed){send({id:m.id,error:{code:-32601,message:'No context usage fixture'}});return;}
      result=seed;break;
    }
    case 'codeDesktop/thread/permissions': logRequest(m.method, p); result = { applied: loaded.has(p.threadId) }; break;
    // The DeepSeek bridge's codeDesktop/tools/list (harness tool-gate.js toolsListResponse); fixture-core.json `tools`
    // replaces the default list. Only a client told capabilities.toolSelection asks.
    case 'codeDesktop/tools/list': {
      logRequest(m.method, p);
      let seed = null;
      try { seed = JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-core.json'), 'utf8'))?.tools ?? null; } catch {}
      result = seed || { tools: ['bash', 'edit', 'read', 'skill', 'write'].map(name => ({ name, kind: name === 'skill' ? 'skill' : 'builtin', description: `Fixture ${name} tool` })),
        servers: [{ name: 'git', tools: [{ name: 'mcp__git__log', tool: 'log', description: '' }, { name: 'mcp__git__status', tool: 'status', description: '' }] }] };
      break;
    }
    case 'config/read':case 'configRequirements/read':case 'account/usage/read': {
      logRequest(m.method,p);let seed={};try{seed=JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA,'fixture-settings.json'),'utf8'));}catch{}
      // R04 knob (fixture-customize.json mcpConfig {name: mcp_servers table}): without a settings seed,
      // config/read answers those tables so the Customize connector drill can draw its LocalConfig
      // (main.cjs mcpDefinitions forwards command/url/args and env NAMES only). Absent -> unchanged.
      if(m.method==='config/read'&&!seed[m.method]){const mcpConfig=readCustomize()?.mcpConfig;if(mcpConfig&&typeof mcpConfig==='object')seed[m.method]={config:{mcp_servers:JSON.parse(JSON.stringify(mcpConfig))},origins:{},layers:null};}
      if(!seed[m.method]){send({id:m.id,error:{code:-32601,message:'No settings fixture response'}});return;}
      result=seed[m.method];
      // config/read reflects accepted user-layer MCP writes. Returning the
      // original seed forever would conceal stale Developer refresh behavior.
      if (m.method === 'config/read') {
        for (const edit of readCustomize()?.configEdits || []) {
          const match = /^mcp_servers\.([^.]+)$/.exec(edit.keyPath || '');
          if (!match) continue;
          result.config ||= {}; result.config.mcp_servers ||= {};
          if (edit.value === null) delete result.config.mcp_servers[match[1]];
          else result.config.mcp_servers[match[1]] = edit.value;
        }
      }
      break;
    }
    case 'account/read': result = { account: { type: 'chatgpt' }, requiresOpenaiAuth: true }; break;
    case 'model/list': {
      // Optional isolated knob (fixture-model-list.json in the profile): a slow or empty catalog,
      // and fastTierModels: model ids that carry a Codex ModelServiceTier named Fast (id/name/description).
      let knob = {};
      try { knob = JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-model-list.json'), 'utf8')); } catch {}
      // ultraModels: model ids whose efforts end in Codex's top tier (…, 'xhigh', 'max', 'ultra').
      // A `models` array in the core seed (CODE_DESKTOP_FIXTURE_CORE_FILE / fixture-core.json) replaces the catalog,
      // so two fixture cores in one profile can list different models (cores-ui-test).
      const fastTierModels = Array.isArray(knob.fastTierModels) ? knob.fastTierModels : [];
      const ultraModels = Array.isArray(knob.ultraModels) ? knob.ultraModels : [];
      let seeded = null;
      try { seeded = JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA, process.env.CODE_DESKTOP_FIXTURE_CORE_FILE || 'fixture-core.json'), 'utf8'))?.models ?? null; } catch {}
      const data = knob.empty ? [] : Array.isArray(seeded) ? seeded : Array.from({length:6},(_,i)=>{
        const model = i?`fixture-${i}`:'fixture';
        const efforts = ultraModels.includes(model) ? ['low','medium','high','xhigh','max','ultra'] : ['low','medium','high','xhigh'];
        return {id:`fixture-${i}`,model,displayName:i?`Test model ${i+1}`:'Test model',isDefault:i===0,defaultReasoningEffort:'low',
          supportedReasoningEfforts:efforts.map(reasoningEffort=>reasoningEffort==='ultra'?{reasoningEffort,description:'Maximum reasoning with automatic task delegation'}:{reasoningEffort}),
          serviceTiers: fastTierModels.includes(model) ? [{ id: 'priority', name: 'Fast', description: '2x speed, increased usage' }] : []};
      });
      result = { data, nextCursor: null };
      const delay = Math.max(0, Math.min(10000, Number(knob.delayMs) || 0));
      if (delay > 0) { const snapshot = result; setTimeout(() => send({ id: m.id, result: snapshot }), delay); return; }
      break;
    }
    case 'thread/start': {
      // An ephemeral thread is Codex's hidden title turn (native-thread-title.cjs): the fixture refuses it without
      // logging, so a session's history and thread list stay as the UI tests expect (no generated title).
      if (p.ephemeral === true) { send({ id: m.id, error: { code: -32600, message: 'ephemeral threads are not supported by the fixture' } }); return; }
      const id = `fixture-thread-${++db.next}`;
      const createdAt = Math.floor(Date.now()/1000);
      const t = { id, cwd:p.cwd || process.cwd(), name:'Approval test',createdAt,updatedAt:createdAt,turns:[],archived:false,historyMode:newThreadHistoryMode() };
      db.threads[id] = t; loaded.add(id); persist();
      logHistory(m.method, { ...p, threadId: id }, { historyMode: historyMode(t) });
      result = { thread:withMode(t) }; break;
    }
    case 'thread/read': {
      if (!thread) { send({ id: m.id, error: { code: -32600, message: 'thread not found' } }); return; }
      logHistory(m.method, p, { historyMode: historyMode(thread) });
      if (p.includeTurns) {
        if (paginated(thread)) notify('deprecationNotice', { summary: PAGINATED_THREAD_READ_DEPRECATION, details: null });
        result = { thread: withMode(thread) };
      } else result = { thread: metadataOnly(thread) };
      break;
    }
    case 'thread/turns/list': {
      if (!thread) { send({ id: m.id, error: { code: -32600, message: 'thread not found' } }); return; }
      logHistory(m.method, p, { historyMode: historyMode(thread) });
      result = turnsPage(thread, p); break;
    }
    case 'thread/items/list': {
      if (!thread) { send({ id: m.id, error: { code: -32600, message: 'thread not found' } }); return; }
      logHistory(m.method, p, { historyMode: historyMode(thread) });
      // Real 0.155.1 answers a legacy thread with JSON-RPC -32601.
      if (!paginated(thread)) { send({ id: m.id, error: { code: -32601, message: 'thread/items/list is not supported yet' } }); return; }
      result = itemsPage(thread, p); break;
    }
    case 'thread/resume': {
      // Optional seeded knob (transcript-states-ui-test): the first resume of this
      // thread fails with an internal error; the flag is consumed so Retry succeeds.
      if (thread?.resumeFailOnce) {
        delete thread.resumeFailOnce; persist();
        logHistory(m.method, p, { historyMode: historyMode(thread), failed: true });
        send({ id: m.id, error: { code: -32603, message: 'fixture resume failure' } }); return;
      }
      loaded.add(p.threadId);
      logHistory(m.method, p, { historyMode: historyMode(thread) });
      if (paginated(thread)) {
        if (!p.excludeTurns) notify('deprecationNotice', { summary: PAGINATED_FULL_HISTORY_DEPRECATION, details: null });
        result = p.excludeTurns
          ? { thread: metadataOnly(thread), initialTurnsPage: p.initialTurnsPage ? turnsPage(thread, p.initialTurnsPage) : null,
              turnsBackwardsCursor: null, itemsBackwardsCursor: null }
          : { thread: withMode(thread) };
      } else result = { thread: withMode(thread) };
      if (Number.isFinite(thread?.resumeDelayMs) && thread.resumeDelayMs > 0) {
        const snapshot = structuredClone(result);
        setTimeout(() => send({ id: m.id, result: snapshot }), Math.min(5000, thread.resumeDelayMs));
        return;
      }
      break;
    }
    case 'thread/revert': {
      logRequest(m.method,p);
      const index=thread?.turns.findIndex(turn=>turn.id===p.beforeTurnId) ?? -1;
      if(!thread || !paginated(thread) || index<0 || thread.turns.some(turn=>turn.status==='inProgress')) {send({id:m.id,error:{code:-32600,message:'Cannot revert this thread'}});return;}
      thread.turns=thread.turns.slice(0,index);persist();result={thread:metadataOnly(thread),turnsBackwardsCursor:null,itemsBackwardsCursor:null};break;
    }
    case 'account/rateLimits/read': {
      logRequest(m.method,p);logHistory(m.method,p);
      try{result=JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA,'fixture-rate-limits.json'),'utf8'));}catch{result={};}break;
    }
    // Codex 0.155.1 account/rateLimitResetCredit/consume without a fixture-usage.json override: redeems the named (else
    // the soonest) available reset in fixture-rate-limits.json, clears the base bucket's windows and reached state, and
    // sends the rolling account/rateLimits/updated snapshot, as the backend does. No reset left: noCredit.
    case 'account/rateLimitResetCredit/consume': {
      logRequest(m.method,p);logHistory(m.method,p);
      const file=path.join(process.env.CODE_DESKTOP_DATA,'fixture-rate-limits.json');let limits={};try{limits=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
      const summary=limits.rateLimitResetCredits;
      if(!summary||!(summary.availableCount>0)){result={outcome:'noCredit'};break;}
      const credits=Array.isArray(summary.credits)?summary.credits:[];
      if(p.creditId&&!credits.some(credit=>credit.id===p.creditId&&credit.status==='available')){result={outcome:'noCredit'};break;}
      summary.availableCount-=1;summary.credits=credits.filter(credit=>credit.id!==(p.creditId||credits.find(entry=>entry.status==='available')?.id));
      const base=limits.rateLimitsByLimitId?.codex||limits.rateLimits;
      if(base){for(const slot of ['primary','secondary'])if(base[slot])base[slot]={...base[slot],usedPercent:0};base.rateLimitReachedType=null;}
      if(limits.ordinaryUsageAllowed===false)limits.ordinaryUsageAllowed=true;
      writeAtomic(file,JSON.stringify(limits));result={outcome:'reset'};
      if(base)setTimeout(()=>send({method:'account/rateLimits/updated',params:{rateLimits:{...base,limitId:'codex'}}}),10);
      break;
    }
    case 'account/sendAddCreditsNudgeEmail': logRequest(m.method,p);logHistory(m.method,p);result={status:'sent'};break;
    case 'thread/name/set': logRequest(m.method,p); thread.name=p.name; persist(); result={}; break;
    case 'thread/archive': logRequest(m.method, p); loaded.delete(p.threadId); thread.archived=true; persist(); result={}; break;
    case 'thread/unarchive': logRequest(m.method, p); thread.archived=false; persist(); result={thread:withMode(thread)}; break;
    // Protocol ThreadDeleteParams {threadId} -> {}: the record is removed for good.
    case 'thread/delete': {
      logRequest(m.method, p);
      if (!thread) { send({ id: m.id, error: { code: -32600, message: 'thread not found' } }); return; }
      delete db.threads[p.threadId]; loaded.delete(p.threadId); persist(); result = {}; break;
    }
    // Protocol ThreadForkParams: a new thread whose forkedFromId is the source
    // (Thread.ts:23) and whose turns are copied through lastTurnId.
    case 'thread/fork': {
      logRequest(m.method, p);
      if (!thread) { send({ id: m.id, error: { code: -32600, message: 'thread not found' } }); return; }
      const id = `fixture-thread-${++db.next}`;
      const at = Math.floor(Date.now()/1000);
      const stop = p.lastTurnId ? thread.turns.findIndex(turn => turn.id === p.lastTurnId) : thread.turns.length - 1;
      const turns = structuredClone(thread.turns.slice(0, stop < 0 ? thread.turns.length : stop + 1));
      const fork = { id, cwd: thread.cwd, name: thread.name, preview: thread.preview, forkedFromId: thread.id, createdAt: at, updatedAt: at, turns, archived: false, historyMode: historyMode(thread) };
      db.threads[id] = fork; loaded.add(id); persist();
      if (paginated(fork) && !p.excludeTurns) notify('deprecationNotice', { summary: PAGINATED_FULL_HISTORY_DEPRECATION, details: null });
      result = { thread: p.excludeTurns ? metadataOnly(fork) : withMode(fork) };
      const forkDelay=p.ephemeral?Math.max(0,Math.min(2000,Number(readCustomize()?.sideForkDelayMs)||0)):0;
      if(forkDelay){const response=result;setTimeout(()=>send({id:m.id,result:response}),forkDelay);return;}break;
    }
    case 'thread/backgroundTerminals/list': {
      logRequest(m.method,p);result={data:structuredClone(thread?.backgroundTerminals||[]),nextCursor:null};
      if(consumeMarker('hold-next-list')){const captured=result;writeAtomic(marker('list-held'),JSON.stringify({requestId:m.id,data:captured.data}));awaitMarker('release-list',()=>{send({id:m.id,result:captured});writeAtomic(marker('list-released'),JSON.stringify({requestId:m.id}));});return;}break;
    }
    case 'thread/backgroundTerminals/terminate': {
      logRequest(m.method,p);const found=thread?.backgroundTerminals?.find(t=>t.processId===p.processId);result={terminated:!!found};
      if(found){const finish=()=>{thread.backgroundTerminals=thread.backgroundTerminals.filter(t=>t!==found);const turn=thread.turns.find(t=>t.items.some(i=>i.id===found.itemId)),item=turn?.items.find(i=>i.id===found.itemId);if(item){item.status='completed';item.exitCode=143;item.durationMs=2500;notify('item/completed',{threadId:thread.id,turnId:turn.id,item});}persist();};if(consumeMarker('hold-completion'))awaitMarker('release-completion',finish);else setTimeout(finish,200);}break;
    }
    case 'thread/list': {
      // filters.rs:121-150: sub-agent sources are omitted unless requested.
      const wantsSubAgents = (p.sourceKinds || []).some(kind => String(kind).startsWith('subAgent'));
      result = { data: Object.values(db.threads).filter(t => !!t.archived === !!p.archived && (wantsSubAgents ? !!(t.parentThreadId || t.source?.subAgent) : !(t.parentThreadId || t.source?.subAgent))).map(withMode), nextCursor: null };
      break;
    }
    case 'turn/interrupt': {
      logRequest(m.method, p);
      // Optional seeded fixture timing only; default interrupt stays immediate.
      const delay = Math.max(0, Math.min(1000, Number(thread?.interruptDelayMs) || 0));
      if (delay > 0) {
        const turn = thread?.turns.at(-1), stream = streams.get(thread?.id);
        if (!turn || turn.id !== p.turnId || turn.status !== 'inProgress' || pendingInterrupts.has(thread.id)) {
          send({ id: m.id, error: { code: -32600, message: 'Invalid or duplicate delayed fixture interrupt' } }); return;
        }
        stream?.pause?.();
        const trace = phase => fs.appendFileSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-interrupts.jsonl'), JSON.stringify({ phase, threadId: thread.id, turnId: turn.id, requestId: m.id, at: new Date().toISOString() }) + '\n');
        trace('requested');
        pendingInterrupts.set(thread.id, setTimeout(() => {
          pendingInterrupts.delete(thread.id);
          if (thread.turns.at(-1) !== turn || turn.status !== 'inProgress') {
            trace('stale'); send({ id: m.id, error: { code: -32600, message: 'Delayed fixture interrupt became stale' } }); return;
          }
          if (stream) stream.cancel(); else complete(thread, 'Interrupted', 'interrupted');
          trace('completed'); send({ id: m.id, result: {} });
        }, delay));
        return;
      }
      if (streams.has(thread.id)) streams.get(thread.id).cancel();
      else complete(thread,'Interrupted','interrupted');
      result={}; break;
    }
    case 'turn/steer': {
      logRequest(m.method, p);
      const turn = thread?.turns.at(-1);
      if (!turn || turn.status !== 'inProgress') { send({ id: m.id, error: { code: -32600, message: 'no active turn' } }); return; }
      if (turn.id !== p.expectedTurnId) { send({ id: m.id, error: { code: -32600, message: `expected active turn id \`${p.expectedTurnId}\` but found \`${turn.id}\`` } }); return; }
      if (turn.nonSteerable) { send({ id: m.id, error: { code: -32600, message: 'active turn is not steerable', data: { codexErrorInfo: { activeTurnNotSteerable: { turnKind: 'review' } } } } }); return; }
      const agentPhase=p.input?.[0]?.text?.match(/^fixture:agent-phase:(activity|nested|completed|empty|interrupted|failed)$/)?.[1];
      if(agentPhase && thread.agentDemo) { agentDemoPhase(thread,agentPhase); result={turnId:turn.id}; break; }
      const item = { id: `steer-${++db.next}`, type: 'userMessage', content: p.input };
      turn.items.push(item); persist();
      notify('item/completed', { threadId: thread.id, turnId: turn.id, item });
      if (steerCompletes.has(thread)) { steerCompletes.delete(thread); setTimeout(() => complete(thread, 'DISMISSED_QUESTION_STEER_REPLY'), 30); }
      result = { turnId: turn.id }; break;
    }
    case 'thread/queue/list': result = { data: (thread?.queue || []).map(entry => ({ ...entry })), nextCursor: null }; break;
    case 'thread/queue/add': {
      logRequest(m.method, p);
      if (!thread) { send({ id: m.id, error: { code: -32600, message: 'thread not found' } }); return; }
      if (typeof p.clientUserMessageId !== 'string') { send({ id: m.id, error: { code: -32600, message: 'Invalid request: missing field `clientUserMessageId`' } }); return; }
      const entry = { id: `queued-${++db.next}`, input: p.input, clientUserMessageId: p.clientUserMessageId };
      thread.queue = [...(thread.queue || []), entry]; persist();
      queueChanged(thread);
      result = { queuedSubmission: entry };
      const active = thread.turns.at(-1);
      if (!active || active.status !== 'inProgress') setTimeout(() => drainQueue(thread), 20);
      break;
    }
    case 'thread/queue/delete': {
      logRequest(m.method, p);
      const before = (thread?.queue || []).length;
      thread.queue = (thread.queue || []).filter(entry => entry.id !== p.queuedSubmissionId);
      if (thread.queue.length === before) { send({ id: m.id, error: { code: -32600, message: 'queued submission not found' } }); return; }
      persist(); queueChanged(thread); result = {}; break;
    }
    case 'thread/queue/update': {
      logRequest(m.method, p);
      const entry = (thread?.queue || []).find(item => item.id === p.queuedSubmissionId);
      if (!entry) { send({ id: m.id, error: { code: -32600, message: 'queued submission not found' } }); return; }
      entry.input = p.input; persist(); queueChanged(thread); result = { queuedSubmission: entry }; break;
    }
    case 'thread/queue/reorder': {
      logRequest(m.method, p);
      const ids = Array.isArray(p.queuedSubmissionIds) ? p.queuedSubmissionIds : [];
      const byId = new Map((thread?.queue || []).map(entry => [entry.id, entry]));
      if (ids.length !== byId.size || ids.some(id => !byId.has(id))) { send({ id: m.id, error: { code: -32600, message: 'queued submission ids do not match the queue' } }); return; }
      thread.queue = ids.map(id => byId.get(id)); persist(); queueChanged(thread); result = {}; break;
    }
    case 'thread/queue/start': {
      logRequest(m.method, p);
      if (!(thread?.queue || []).length) { send({ id: m.id, error: { code: -32600, message: 'queue is empty' } }); return; }
      const active = thread.turns.at(-1);
      if (active && active.status === 'inProgress') { send({ id: m.id, error: { code: -32600, message: 'a turn is already active' } }); return; }
      drainQueue(thread); result = {}; break;
    }
    case 'turn/start': {
      logRequest(m.method, p);
      if(!loaded.has(p.threadId)){send({id:m.id,error:{code:-32600,message:'Thread not loaded; resume required'}});return;}
      const turn={id:`turn-${++db.next}`,status:'inProgress',items:[{id:`user-${db.next}`,type:'userMessage',content:p.input}]};
      // Runtime-stats acceptance: a real Turn.startedAt in seconds, persisted
      // for subsequent history reads. No renderer clock or DOM overrides.
      if(p.input[0]?.text==='fixture:status-stats')turn.startedAt=Math.floor(Date.now()/1000)-43;
      // Message-row timestamp acceptance (turn-timestamps-ui-test): a real
      // Turn.startedAt 125s in the past; completedAt is set at completion.
      if(p.input[0]?.text==='fixture:timestamps')turn.startedAt=Math.floor(Date.now()/1000)-125;
      // Background-tasks acceptance: a real Turn.startedAt (0.155.1 v2/Turn.ts:29) so the
      // status row's elapsed stat precedes the running-tasks button (Y5 :58615-58628).
      if(p.input[0]?.text?.startsWith('fixture:background-command'))turn.startedAt=Math.floor(Date.now()/1000);
      const demo=(p.input||[]).map(part=>readDemoTurn(part?.text)).find(Boolean)||null;
      if(demo&&Number.isFinite(demo.startedAgo))turn.startedAt=Math.floor(Date.now()/1000)-demo.startedAgo;
      thread.turns.push(turn);persist();
      // Optional seeded knob: delay only the turn/start response so the composer's
      // busy (sending) state is observable; the turn itself starts afterwards.
      // ('delayed-start' in the text does the same for one turn of any thread, e.g. one thread/start just made.)
      const startDelay = Math.max(0, Math.min(5000, Number(thread.turnStartDelayMs) || (/\bdelayed-start\b/.test(p.input[0]?.text || '') ? 1500 : 0)));
      const announce = () => { send({id:m.id,result:{turn}});notify('turn/started',{threadId:thread.id,turn});notify('item/completed',{threadId:thread.id,turnId:turn.id,item:turn.items[0]}); };
      if (startDelay > 0) { setTimeout(() => { announce(); if (!p.input[0].text.startsWith('fixture:')) complete(thread,'Delayed fixture response'); }, startDelay); if (!p.input[0].text.startsWith('fixture:')) return; }
      else announce();
      const text=p.input[0].text;
      if (startDelay > 0) { if (text==='disconnect') setTimeout(()=>process.exit(0),startDelay+100); else if (text.startsWith('fixture:complete')) setTimeout(()=>complete(thread,'Fixture response'),startDelay+20); return; }
      if(text==='disconnect'){setTimeout(()=>process.exit(0),100);return;}
      if(demo){demoTurn(thread,turn,demo);return;}
      if(text==='fixture:side-close'){
        const close=()=>{streams.delete(thread.id);loaded.delete(thread.id);delete db.threads[thread.id];persist();notify('thread/closed',{threadId:thread.id});};
        const timer=setTimeout(close,250);streams.set(thread.id,{pause:()=>clearTimeout(timer),cancel:()=>{clearTimeout(timer);close();}});return;
      }
      if(text==='fixture:side-tools'){sideToolsFixture(thread,turn);return;}
      if(text==='fixture:hold' || text==='fixture:hold-review') { holdFixture(thread, turn, text==='fixture:hold-review'); return; }
      if(text==='fixture:status-stats') { holdFixture(thread, turn, false); return; }
      if(text==='fixture:compact-reads') {
        let index=0,timer,stopped=false;
        const emit=item=>{turn.items.push(item);persist();notify('item/completed',{threadId:thread.id,turnId:turn.id,item});};
        const tick=()=>{
          if(stopped)return;
          if(index===6)emit({id:`compact-progress-${turn.id}`,type:'agentMessage',text:'COMPACT_READ_PROGRESS: the first file checks are complete.'});
          const prefix=index<6?'compact-same':'compact-distinct',name=index<6?'deploy.log':`file-${index-6}.ts`;
          emit({id:`${prefix}-${turn.id}-${index}`,type:'commandExecution',status:'completed',cwd:thread.cwd,command:`cat ${name}`,commandActions:[{type:'read',path:path.join(thread.cwd,name),name}],aggregatedOutput:`COMPACT_OUTPUT_${index}\n`,exitCode:0});
          emit({id:`compact-reasoning-${turn.id}-${index}`,type:'reasoning',summary:['Check the next result'],content:[]});
          if(index<6)emit({id:`compact-blank-${turn.id}-${index}`,type:'agentMessage',text:' \n'});
          index++;
          if(index<9)timer=setTimeout(tick,60);else{streams.delete(thread.id);complete(thread,'COMPACT_READ_DONE');}
        };
        streams.set(thread.id,{pause:()=>clearTimeout(timer),cancel:()=>{stopped=true;clearTimeout(timer);streams.delete(thread.id);complete(thread,'COMPACT_READ_STOPPED','interrupted');}});
        timer=setTimeout(tick,60);return;
      }
      if(text==='fixture:complete artifact') {
        const files = [{ path: path.join(thread.cwd, 'research-report.md'), description: 'Research findings' }, { path: path.join(thread.cwd, 'results.csv'), description: 'Result data' }, { path: path.join(thread.cwd, 'pixel.png'), description: 'Preview image' }];
        fs.writeFileSync(files[0].path, '# Research report\nVerified fixture output.\n');
        fs.writeFileSync(files[1].path, 'name,value\nfixture,42\n');
        fs.writeFileSync(files[2].path, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZkAAAAASUVORK5CYII=', 'base64'));
        const output = { id: `artifact-${turn.id}`, type: 'dynamicToolCall', status: 'completed', tool: 'present', arguments: {}, codeDesktop: { deliverables: files } };
        turn.items.push(output); persist(); notify('item/completed', { threadId: thread.id, turnId: turn.id, item: output });
        complete(thread,'Fixture artifact ready'); return;
      }
      if(text.startsWith('fixture:complete')){complete(thread,'Fixture response');return;}
      // Runs (a visible reply, no completion) until the suite drops the
      // 'timestamps-complete' marker, then completes with completedAt=now-120.
      if(text==='fixture:timestamps'){
        const progress={id:`progress-${turn.id}`,type:'agentMessage',text:'TIMESTAMP_RUNNING'};turn.items.push(progress);persist();
        notify('item/completed',{threadId:thread.id,turnId:turn.id,item:progress});
        awaitMarker('timestamps-complete',()=>{turn.completedAt=Math.floor(Date.now()/1000)-120;complete(thread,'TIMESTAMP_FIXTURE_REPLY');});return;
      }
      if(['usage','other','output-limit','context','thread'].some(kind=>text==='fixture:turn-error:'+kind)){turnErrorFixture(thread,turn,text.slice(19));return;}
      // Customize acceptance seeds autoCompleteTurns so ordinary text (with skill inputs) completes without an approval request.
      if(readCustomize()?.autoCompleteTurns){complete(thread,'CUSTOMIZE_FIXTURE_REPLY');return;}
      if(text==='fixture:plan'||text==='fixture:plan-document'){
        // R09: the proposed plan document is a persisted Codex `plan` item (ThreadItem {type:'plan', text};
        // the DeepSeek bridge projects exit_plan_mode this way); 'fixture:plan-document' sends it alone (no todos).
        const document={id:`plan-${turn.id}`,type:'plan',text:'# Plan fixture heading\n\nPLAN_DOCUMENT_BODY: dock the plan pane, then verify persistence.\n'};
        turn.items.push(document);persist();
        notify('item/started',{threadId:thread.id,turnId:turn.id,item:document});notify('item/completed',{threadId:thread.id,turnId:turn.id,item:document});
        // Pane layout acceptance: a real turn/plan/updated notification makes the Plan pane available.
        if(text==='fixture:plan')notify('turn/plan/updated',{threadId:thread.id,plan:[{step:'Inspect the tile layout',status:'completed'},{step:'Dock the plan pane',status:'inProgress'},{step:'Verify persistence',status:'pending'}]});
        complete(thread,'PLAN_FIXTURE_REPLY');return;
      }
      if(text==='fixture:subagent') { spawnSubagent(thread); return; }
      if(text==='fixture:subagent-approval') { spawnSubagent(thread, { approval: true }); return; }
      if(text==='fixture:subagent-review') { spawnReviewSubagent(thread); return; }
      if(text==='fixture:warning') {
        // WarningNotification {threadId, message}; a null threadId is connection-wide.
        notify('warning', { threadId: thread.id, message: 'FIXTURE_THREAD_WARNING' });
        notify('warning', { threadId: null, message: 'FIXTURE_GLOBAL_WARNING' });
        complete(thread, 'WARNING_FIXTURE_REPLY'); return;
      }
      if(text==='fixture:agent-approval') {
        // A DeepSeek-core subagent call awaiting its Ask-mode card: the dynamicToolCall item plus a
        // command approval naming it, with the bridge's "<tool> <json>" command (approval.js childApproval).
        const args = { description: 'Audit the parser', prompt: 'Read src/parse.js\nand list bugs' };
        const call = { id: `agent-approval-${db.next}`, type: 'dynamicToolCall', namespace: null, tool: 'subagent', arguments: args, status: 'inProgress', contentItems: null, success: null, durationMs: null };
        turn.items.push(call); persist(); notify('item/started', { threadId: thread.id, turnId: turn.id, item: call });
        const id = `agent-approval-request-${db.next}`;
        pending.set(id, { thread, kind: 'command', onResponse: message => {
          const accepted = ['accept','acceptForSession'].includes(message.result?.decision);
          Object.assign(call, accepted ? { status: 'completed', success: true, contentItems: [{ type: 'inputText', text: 'AGENT_DONE' }] } : { status: 'failed', success: false, contentItems: [{ type: 'inputText', text: 'the user rejected tool "subagent"' }] });
          persist(); notify('item/completed', { threadId: thread.id, turnId: turn.id, item: call }); complete(thread, 'AGENT_APPROVAL_DECISION');
        } });
        send({ id, method: 'item/commandExecution/requestApproval', params: { kind: 'command', threadId: thread.id, turnId: turn.id, itemId: call.id, command: `subagent ${JSON.stringify(args)}`, cwd: thread.cwd, commandActions: [{ type: 'unknown', command: 'subagent' }] } });
        return;
      }
      if(text==='fixture:file-tool-approval'||text==='fixture:file-tool-approval-multi') {
        const change = { id: `file-tool-${db.next}`, type: 'fileChange', status: 'inProgress', changes: [{path: `${thread.cwd}/created.ts`, kind: {type:'add'}, diff:'--- /dev/null\n+++ b/created.ts\n@@ -0,0 +1 @@\n+export const created = true;\n'}] };
        // -multi: a second real FileUpdateChange so the approval card keeps the generic multi-file title.
        if(text.endsWith('-multi')) change.changes.push({path:`${thread.cwd}/fixture.txt`, kind:{type:'update',move_path:null}, diff:'--- a/fixture.txt\n+++ b/fixture.txt\n@@ -1 +1 @@\n-APPROVAL_CARD_FIXTURE\n+APPROVAL_CARD_FIXTURE_EDITED\n'});
        turn.items.push(change); persist(); notify('item/started',{threadId:thread.id,turnId:turn.id,item:change});
        const id=`file-tool-request-${db.next}`;
        pending.set(id,{thread,kind:'file',onResponse: message => {
          change.status=['accept','acceptForSession'].includes(message.result?.decision)?'completed':'declined';
          persist(); notify('item/completed',{threadId:thread.id,turnId:turn.id,item:change}); complete(thread,'FILE_TOOL_DECISION');
        }});
        send({id,method:'item/fileChange/requestApproval',params:{threadId:thread.id,turnId:turn.id,itemId:change.id,reason:'Fixture file change'}}); return;
      }
      if(text==='fixture:patch') {
        // FileChangePatchUpdatedNotification replaces the whole change set while
        // the item is still inProgress; the turn stays open so the row can be
        // read in that state and is released with turn/interrupt.
        const change = { id:`patch-${db.next}`, type:'fileChange', status:'inProgress',
          changes:[{ path:`${thread.cwd}/patched-one.txt`, kind:'update', diff:'--- a/patched-one.txt\n+++ b/patched-one.txt\n-one\n+ONE' }] };
        turn.items.push(change); persist();
        notify('item/started', { threadId: thread.id, turnId: turn.id, item: change });
        setTimeout(() => {
          change.changes = ['one','two','three'].map(name => ({ path:`${thread.cwd}/patched-${name}.txt`, kind:'update', diff:`--- a/patched-${name}.txt\n+++ b/patched-${name}.txt\n-${name}\n+${name.toUpperCase()}` }));
          persist();
          notify('item/fileChange/patchUpdated', { threadId: thread.id, turnId: turn.id, itemId: change.id, changes: change.changes });
        }, 80);
        streams.set(thread.id, { pause: () => {}, cancel: () => {
          change.status = 'interrupted'; turn.status = 'interrupted'; persist();
          notify('item/completed', { threadId: thread.id, turnId: turn.id, item: change });
          notify('turn/completed', { threadId: thread.id, turn });
        } });
        return;
      }
      if(text==='fixture:computer-use') {
        // Computer use in the three shapes the app reads (src/computer-use-model.mjs): OpenClaude Desktop's computerUse item,
        // a computer-use MCP server's tool, the Anthropic computer tool. fixture-computer.png (profile) is the screenshot.
        let png=null;try{png=fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA,'fixture-computer.png')).toString('base64');}catch{}
        const shot=png?`data:image/png;base64,${png}`:undefined;
        const steps=[
          {id:`cu-${db.next}-1`,type:'computerUse',status:'inProgress',action:{kind:'screenshot'},app:'Finder',...(shot?{screenshot:shot}:{})},
          {id:`cu-${db.next}-2`,type:'mcpToolCall',server:'computer-use',tool:'left_click',arguments:{coordinate:[420,180]},status:'inProgress',result:png?{content:[{type:'image',mimeType:'image/png',data:png}]}:null},
          {id:`cu-${db.next}-3`,type:'dynamicToolCall',tool:'computer',arguments:{action:'type',text:'quarterly report'},status:'inProgress'},
          {id:`cu-${db.next}-4`,type:'computerUse',status:'inProgress',action:{kind:'drag',start_coordinate:[120,300],coordinate:[640,420]},...(shot?{screenshot:shot}:{})},
          {id:`cu-${db.next}-5`,type:'computerUse',status:'inProgress',action:{kind:'key',keys:['cmd+s']}},
        ];
        let at=0;
        steps.forEach((step,index)=>{
          setTimeout(()=>{turn.items.push(step);persist();notify('item/started',{threadId:thread.id,turnId:turn.id,item:step});},at+=80);
          // The last step holds ~2s so the live banner can be seen; the others finish at once.
          setTimeout(()=>{step.status='completed';persist();notify('item/completed',{threadId:thread.id,turnId:turn.id,item:step});
            if(index===steps.length-1)complete(thread,'COMPUTER_USE_FIXTURE_DONE');},index===steps.length-1?at+2000:at+=80);
        });
        return;
      }
      // 'fixture:workflow-tool <json>': the model calls OpenClaude Desktop's Workflow tool. Like a real core, the fixture starts the
      // app's agent-tools MCP server (CODE_DESKTOP_AGENT_TOOLS_SERVER), lists its tools, calls Workflow with the JSON
      // arguments (_meta.threadId names the session) and reports the tool's text as an mcpToolCall item and its reply.
      if(text.startsWith('fixture:workflow-tool')) {
        const call = { id:`mcp-${db.next}`, type:'mcpToolCall', server:'code_desktop', tool:'Workflow', status:'inProgress', arguments: JSON.parse(text.slice('fixture:workflow-tool'.length).trim() || '{}') };
        turn.items.push(call); persist();
        notify('item/started', { threadId: thread.id, turnId: turn.id, item: call });
        const server = JSON.parse(process.env.CODE_DESKTOP_AGENT_TOOLS_SERVER || 'null');
        if (!server) { call.status='failed'; notify('item/completed', { threadId: thread.id, turnId: turn.id, item: call }); complete(thread, 'NO_AGENT_TOOLS'); return; }
        const { spawn } = require('node:child_process');
        const child = spawn(server.command, server.args, { env: { ...process.env, ...server.env }, stdio: ['pipe', 'pipe', 'ignore'] });
        const waiting = new Map(); let buffer = '', seq = 0;
        child.stdout.on('data', chunk => { buffer += chunk; let n; while ((n = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, n); buffer = buffer.slice(n + 1); try { const message = JSON.parse(line); waiting.get(message.id)?.(message); } catch {} } });
        const rpc = (method, params) => new Promise(resolve => { const id = ++seq; waiting.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
        (async () => {
          await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fixture', version: '1' } });
          const listed = await rpc('tools/list', {});
          logRequest('mcp:tools/list', { tools: (listed.result?.tools || []).map(tool => tool.name), workflowDescription: listed.result?.tools?.find(tool => tool.name === 'Workflow')?.description ?? null });
          const result = (await rpc('tools/call', { name: 'Workflow', arguments: call.arguments, _meta: { threadId: thread.id } })).result;
          logRequest('mcp:tools/call', { name: 'Workflow', result });
          child.kill();
          call.status = result?.isError ? 'failed' : 'completed'; call.result = result; persist();
          notify('item/completed', { threadId: thread.id, turnId: turn.id, item: call });
          complete(thread, result?.content?.[0]?.text?.split('\n')[0] || 'WORKFLOW_TOOL_EMPTY');
        })();
        return;
      }
      if(text==='fixture:mcp-progress') {
        // McpToolCallProgressNotification {threadId, turnId, itemId, message}.
        const call = { id:`mcp-${db.next}`, type:'mcpToolCall', server:'fixture-server', tool:'probe', status:'inProgress' };
        turn.items.push(call); persist();
        notify('item/started', { threadId: thread.id, turnId: turn.id, item: call });
        setTimeout(() => notify('item/mcpToolCall/progress', { threadId: thread.id, turnId: turn.id, itemId: call.id, message: 'FIXTURE_MCP_PROGRESS' }), 60);
        setTimeout(() => { call.status='completed'; persist(); notify('item/completed', { threadId: thread.id, turnId: turn.id, item: call }); complete(thread, 'MCP_PROGRESS_FIXTURE_REPLY'); }, 200);
        return;
      }
      if(text==='fixture:background-command'||text==='fixture:background-command-disconnect') {
        const item={id:'background-'+turn.id,type:'commandExecution',processId:'process-'+turn.id,command:'sleep 30',cwd:thread.cwd,status:'inProgress',commandActions:[],aggregatedOutput:'\x1b[32mbackground output\x1b[0m\n'+Array.from({length:60},(_,i)=>'output line '+(i+1)).join('\n')+'\n\x1b[31m<script>literal output</script>\x1b[0m\n',exitCode:null,durationMs:null};turn.items.push(item);thread.backgroundTerminals=[{itemId:item.id,processId:item.processId,command:item.command,cwd:thread.cwd,osPid:null,cpuPercent:null,rssKb:null}];persist();notify('item/started',{threadId:thread.id,turnId:turn.id,item,startedAtMs:Date.now()});if(text.endsWith('-disconnect')){const settled={id:'background-neighbor-'+turn.id,type:'commandExecution',command:'printf settled',commandActions:[],status:'completed',aggregatedOutput:'settled\n',exitCode:0};turn.items.push(settled);persist();notify('item/completed',{threadId:thread.id,turnId:turn.id,item:settled});awaitMarker('disconnect',()=>process.exit(0));}return;
      }
      if(text==='fixture:agent-demo') { agentDemo(thread,turn); return; }
      if(text==='fixture:agent-demo-described') { agentDemo(thread,turn,'Audit the login flow'); return; }
      if(text==='fixture:run-command') { runCommandLive(thread, turn); return; }
      if(text==='fixture:run-command-approval') { runCommandApproval(thread, turn); return; }
      if(text==='fixture:scroll' || text==='fixture:scroll-approval') { streamFixture(thread, turn, text==='fixture:scroll-approval'); return; }
      if(text==='fixture:code-fence-stream') { codeFenceStream(thread, turn); return; }
      if(text.startsWith('fixture:reasoning')) {
        // A streamed reasoning item followed by a completed reply (transcript view acceptance).
        const reasoning={id:`reasoning-${db.next}`,type:'reasoning',summary:['STREAMED_REASONING_SUMMARY: the fixture considered the request.'],status:'completed'};
        turn.items.push(reasoning);persist();notify('item/started',{threadId:thread.id,turnId:turn.id,item:{...reasoning,summary:[]}});
        setTimeout(()=>{notify('item/completed',{threadId:thread.id,turnId:turn.id,item:reasoning});complete(thread,'REASONING_FIXTURE_REPLY\n\n```js\nfunction greet(name) { return "hi " + name; }\n```');},60);
        return;
      }
      // mcpServer/elicitation/request (codex-schema-0.155.1 McpServerElicitationRequestParams, as Codex
      // 0.155.1 sends it): 'fixture:elicitation-tool' an MCP tool-call approval (empty schema,
      // _meta.codex_approval_kind mcp_tool_call, persist session/always) after its in-progress
      // mcpToolCall item; '-form' a server form of primitive fields; '-url' url mode; '-unsupported'
      // an openai/form request that can only be declined. The response is logged to
      // fixture-responses.jsonl; accept completes with APPROVAL_ACCEPTED, decline/cancel APPROVAL_DENIED.
      if(text.startsWith('fixture:elicitation')){
        const id=`approval-${db.next}`;pending.set(id,{thread,kind:'elicitation'});
        const base={threadId:thread.id,turnId:turn.id,serverName:'probe'};
        let params;
        if(text.startsWith('fixture:elicitation-form'))params={...base,mode:'form',message:'Tell the probe server about this test run.',requestedSchema:{type:'object',required:['title','count'],properties:{
          title:{type:'string',title:'Title',description:'A short name for the run',minLength:2},
          count:{type:'integer',title:'Count',minimum:1,maximum:5},
          notify:{type:'boolean',title:'Notify me',default:false},
          tier:{type:'string',title:'Tier',oneOf:[{const:'basic',title:'Basic'},{const:'pro',title:'Pro'}]},
          tags:{type:'array',title:'Tags',items:{type:'string',enum:['unit','ui']}}}}};
        else if(text.startsWith('fixture:elicitation-url'))params={...base,mode:'url',elicitationId:`elicit-${id}`,message:'Sign in to the probe service to continue.',url:'https://probe.example.invalid/authorize'};
        else if(text.startsWith('fixture:elicitation-unsupported'))params={...base,mode:'openai/form',message:'An extended form this client cannot show.',requestedSchema:{type:'object',properties:{nested:{type:'object'}}}};
        else{
          const tool={id:`call-${id}`,type:'mcpToolCall',server:'probe',tool:'write_note',status:'inProgress',arguments:{text:'fixture note'}};
          turn.items.push(tool);persist();notify('item/started',{threadId:thread.id,turnId:turn.id,item:tool});
          params={...base,mode:'form',message:'Allow the probe MCP server to run tool "write_note"?',requestedSchema:{type:'object',properties:{},},
            _meta:{codex_approval_kind:'mcp_tool_call',persist:['session','always'],tool_params:{text:'fixture note'},tool_params_display:[{name:'text',value:'fixture note',display_name:'text'}]}};
        }
        send({id,method:'mcpServer/elicitation/request',params});return;
      }
      const kind=text.startsWith('fixture:permissions')?'permissions':text.startsWith('fixture:file')?'file':text.startsWith('fixture:input')||text.startsWith('fixture:plan-review')?'input':'command';
      const id=`approval-${db.next}`;pending.set(id,{thread,kind});
      const methods={permissions:'item/permissions/requestApproval',file:'item/fileChange/requestApproval',input:'item/tool/requestUserInput',command:'item/commandExecution/requestApproval'};
      const params={threadId:thread.id,turnId:turn.id,itemId:'command',reason:'Protocol fixture: wait for the user decision.'};
      if(kind==='command')params.command='printf approval-test';
      if(kind==='file')params.grantRoot=thread.cwd;
      if(kind==='permissions')params.permissions={network:{enabled:true}};
      if(kind==='input')params.questions=[{id:'approach',header:'Approach',question:'Choose a test approach',isOther:true,isSecret:false,options:[{label:'First',description:'First test choice'},{label:'Second',description:'Second test choice'}]}];
      // -multi: the bridge's multiSelect extension field (ask_user_question multi_select).
      if(kind==='input'&&text.startsWith('fixture:input-multi'))params.questions=[{id:'kinds',header:'Kinds',question:'Choose test kinds',isOther:true,isSecret:false,multiSelect:true,options:[{label:'Unit',description:'Unit tests'},{label:'UI',description:'UI suites'},{label:'Live',description:'Live smoke'}]}];
      if(kind==='command'||kind==='permissions'){
        // Optional isolated knob (fixture-approval-card.json {enrichCommand:true} in the profile) for
        // scripts/approval-card-ui-test.mjs: cwd/network context and a 150-line command. Absent -> unchanged.
        let knob = {};
        try { knob = JSON.parse(fs.readFileSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-approval-card.json'), 'utf8')); } catch {}
        if(knob.enrichCommand===true){
          if(kind==='command'){
            if(text==='fixture:command-card-long')params.command=Array.from({length:150},(_,i)=>`printf 'CARD_LINE_${String(i+1).padStart(3,'0')} synthetic fixture text'`).join('\n');
            params.cwd=thread.cwd;params.networkApprovalContext={protocol:'https',host:'approval-card.example.invalid:8443'};
          }
          if(kind==='permissions')params.cwd=thread.cwd;
        }
      }
      // R07 knobs. 'fixture:plan-review': the DeepSeek bridge's exit_plan_mode review (question id
      // 'plan-review', questions.js codexQuestions) after its plan item (projection.js `plan-<call id>`).
      // 'fixture:input-steer': the answer keeps the turn running and is also logged to
      // fixture-requests.jsonl, so its order against the following turn/steer (which completes the
      // turn) is visible. 'fixture:approval-pair': two command approvals at once; answering the first
      // keeps the turn, the second completes it.
      if(text.startsWith('fixture:plan-review')){
        const callId=`call-plan-${id}`,plan={id:`plan-${callId}`,type:'plan',text:'# Fixture plan\n\n1. Inspect the plan card\n2. Accept the plan'};
        turn.items.push(plan);persist();notify('item/completed',{threadId:thread.id,turnId:turn.id,item:plan});
        params.itemId=callId;delete params.reason;
        params.questions=[{id:'plan-review',header:'Plan review',question:'Approve this plan and leave plan mode?',isOther:true,isSecret:false,multiSelect:false,
          options:[{label:'Approve',description:'Leave plan mode; the plan is carried out from the next step.'},{label:'Keep planning',description:'Stay in plan mode; feedback goes back to the model.'}]}];
      }
      if(text.startsWith('fixture:input-steer'))pending.get(id).onResponse=m=>{logRequest('response:item/tool/requestUserInput',{id:m.id,result:m.result});steerCompletes.add(thread);};
      if(text==='fixture:approval-pair'){
        const second=`${id}-b`;pending.get(id).onResponse=()=>{};pending.set(second,{thread,kind});
        send({id,method:methods[kind],params});
        setTimeout(()=>send({id:second,method:methods[kind],params:{...params,itemId:'command-b',command:'printf approval-pair-b'}}),30);
        return;
      }
      send({id,method:methods[kind],params});return;
    }
    // ---- Customize catalog (isolated seed data; nothing is read from ~/.codex) ----
    case 'skills/list': {
      logRequest(m.method, p);
      const seed = readCustomize();
      replyCustomize(m, seed?.skillsDelayMs, !!seed?.skillsFail, 'skills unavailable in fixture', { data: seed?.skills || [] }); return;
    }
    case 'skills/config/write': {
      logRequest(m.method, p);
      if (fs.existsSync(path.join(process.env.CODE_DESKTOP_DATA, 'customize-fail.marker'))) { send({ id: m.id, error: { code: -32603, message: 'failed to update skill settings: fixture refused the write' } }); return; }
      if ((p.path && p.name) || (!p.path && !p.name)) { send({ id: m.id, error: { code: -32602, message: 'skills/config/write requires exactly one of path or name' } }); return; }
      const seed = readCustomize() || { skills: [] };
      let found = false;
      for (const entry of seed.skills || []) for (const skill of entry.skills || []) if (skill.path === p.path) { skill.enabled = !!p.enabled; found = true; }
      if (!found) { send({ id: m.id, error: { code: -32602, message: 'unknown skill path' } }); return; }
      writeCustomize(seed);
      result = { effectiveEnabled: !!p.enabled };
      setTimeout(() => { logRequest('notify:skills/changed', {}); notify('skills/changed', {}); }, 30);
      break;
    }
    case 'mcpServerStatus/list': {
      logRequest(m.method, p);
      const seed = readCustomize();
      const servers = (seed?.mcp?.servers || []).map(server => ({
        name: server.name, pluginId: server.pluginId ?? null, serverInfo: server.serverInfo ?? null,
        tools: server.tools || {}, resources: server.resources || [], resourceTemplates: [],
        authStatus: server.authStatus || 'unsupported',toolsError:server.toolsError??null,
        // Runtime state exists only for a loaded thread (mcp_processor.rs:263-315).
        runtimeStatus: p.threadId && db.threads[p.threadId] ? (server.runtimeStatus ?? null) : null,
      }));
      if (Object.hasOwn(p, 'limit')) { result = { data: servers, nextCursor: null }; break; }
      replyCustomize(m, seed?.mcpDelayMs, !!seed?.mcpFail, 'MCP status unavailable in fixture', { data: servers, nextCursor: null }); return;
    }
    case 'config/mcpServer/reload': logRequest(m.method, p); result = {}; break;
    case 'mcpServer/oauth/login': {
      logRequest(m.method, p);
      const seed = readCustomize();
      const server = (seed?.mcp?.servers || []).find(entry => entry.name === p.name);
      if (!server) { send({ id: m.id, error: { code: -32602, message: 'unknown MCP server' } }); return; }
      result = { authorizationUrl: `https://example.invalid/oauth?server=${encodeURIComponent(p.name)}` }; break;
    }
    case 'config/batchWrite': {
      logRequest(m.method, p);
      if (fs.existsSync(path.join(process.env.CODE_DESKTOP_DATA, 'fixture-mcp-write-error'))) {
        send({ id: m.id, error: { code: -32603, message: 'MCP configuration write refused by fixture' } }); return;
      }
      const seed = readCustomize() || {};
      seed.configEdits = [...(seed.configEdits || []), ...(p.edits || [])];
      for (const edit of p.edits || []) {
        const match = /^mcp_servers\.([^.]+)$/.exec(edit.keyPath || '');
        if (!match) continue;
        seed.mcp = seed.mcp || { servers: [] };
        seed.mcp.servers = seed.mcp.servers.filter(server => server.name !== match[1]);
        if (edit.value !== null) seed.mcp.servers.push({ name: match[1], config: edit.value, authStatus: 'unsupported', runtimeStatus: 'notStarted', tools: {} });
      }
      writeCustomize(seed);
      result = { status: 'ok', version: String(Date.now()) }; break;
    }
    case 'plugin/installed': {
      logRequest(m.method, p);
      const seed = readCustomize();
      replyCustomize(m, seed?.pluginsDelayMs, !!seed?.pluginsFail, 'plugins unavailable in fixture', { marketplaces: seed?.plugins?.marketplaces || [], marketplaceLoadErrors: [] }); return;
    }
    case 'plugin/read': {
      logRequest(m.method, p);
      const seed = readCustomize();
      const detail = (seed?.plugins?.details || []).find(entry => entry.summary?.name === p.pluginName);
      if (!detail) { send({ id: m.id, error: { code: -32602, message: 'unknown plugin' } }); return; }
      // pluginReadDelayMs (≤ 5000) holds the detail so the plugin-page skeleton is observable.
      if (Number(seed?.pluginReadDelayMs) > 0) { replyCustomize(m, seed.pluginReadDelayMs, false, '', { plugin: detail }); return; }
      result = { plugin: detail }; break;
    }
    case 'hooks/list': logRequest(m.method, p); result = { data: readCustomize()?.hooks || [] }; break;
    // Every request that reaches the fixture but matches no handler is logged
    // too, so a suite asserting "this method never reached the app-server" can
    // actually fail if it ever does (an unlogged default made that assertion
    // vacuous for deprecated methods such as thread/rollback).
    // CODE_DESKTOP_FIXTURE_UNKNOWN_METHOD=serde answers like a real Codex 0.155.1 app-server, whose
    // request enum rejects a method it doesn't know: -32600 "unknown variant `<method>`, expected one of …".
    default: logHistory(m.method, p, { unknownMethod: true }); send({id:m.id,error:process.env.CODE_DESKTOP_FIXTURE_UNKNOWN_METHOD==='serde'?{code:-32600,message:`Invalid request: unknown variant \`${m.method}\`, expected one of \`initialize\`, \`thread/start\``}:{code:-32601,message:'Unknown test method'}});return;
  }
  send({id:m.id,result});
});
