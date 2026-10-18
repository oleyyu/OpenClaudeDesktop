// Regression tests for the vendored workflow runner fixes (R1–R9 and follow-ups).
// Real fixture app-servers only, with a fresh HOME/XDG/CODEX_HOME/TMPDIR sandbox.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, fork } from 'node:child_process';

const BASE = fsSync.existsSync('/private/tmp/claude-501') ? '/private/tmp/claude-501' : os.tmpdir();
const SANDBOX = await fs.realpath(await fs.mkdtemp(path.join(BASE, 'wf-runner-fixes-')));
for (const [key, name] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'xdg-config'], ['XDG_DATA_HOME', 'xdg-data'], ['XDG_CACHE_HOME', 'xdg-cache'], ['XDG_STATE_HOME', 'xdg-state'], ['CODEX_HOME', 'codex-home'], ['TMPDIR', 'tmp']]) {
  process.env[key] = path.join(SANDBOX, name);
  await fs.mkdir(process.env[key], { recursive: true });
}
test.after(() => fs.rm(SANDBOX, { recursive: true, force: true }));

const R = '../third-party/codex-workflows-runner/src/';
const { codexAgent, getClient, shutdownClient, parseSchemaResult, checkSchemaResult, strictifySchema, wireSchema, buildTurnParams, attachAgentMessageCollector, isThrottled, isRetryable } = await import(R + 'codexAgent.js');
const { runWorkflowSource } = await import(R + 'runWorkflow.js');
const { createRuntime } = await import(R + 'runtime.js');
const { Journal } = await import(R + 'journal.js');
const { recordTokenUsage, resetMeter, outputSpent } = await import(R + 'meter.js');
const { loadAgentType } = await import(R + 'agentTypes.js');
const { createWorktree } = await import(R + 'worktree.js');
const { default: service } = await import('../electron/workflow-service.cjs');

const FIXTURE = path.resolve(import.meta.dirname, 'fixtures/workflow-runner-server.cjs');
const CAP = Math.min(16, Math.max(1, os.availableParallelism() - 2));
const header = 'export const meta={name:"fixes",description:"Runner fixes"};\n';
const run = (body, options) => runWorkflowSource(header + body, options);
const plain = value => JSON.parse(JSON.stringify(value));
const dir = async name => fs.realpath(await fs.mkdtemp(path.join(SANDBOX, name + '-')));
const clientOptions = cwd => ({ command: process.execPath, args: [FIXTURE], cwd });
const wire = cwd => { try { return fsSync.readFileSync(path.join(cwd, 'workflow-wire.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };
const methods = (cwd, pattern = /^(thread\/start|turn\/start|turn\/interrupt)$/) => wire(cwd).map(q => q.method).filter(m => pattern.test(m));
async function until(check, ms = 10000) {
  const deadline = Date.now() + ms;
  while (!(await check())) { if (Date.now() > deadline) throw new Error('condition not reached'); await new Promise(r => setTimeout(r, 20)); }
}
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
async function repo(name) {
  const root = await dir(name);
  git(root, 'init', '-q'); git(root, '-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-q', '--allow-empty', '-m', 'init');
  return root;
}
const worktrees = root => git(root, 'worktree', 'list', '--porcelain').split('\n').filter(l => l.startsWith('worktree ')).length;
const tempWorktrees = async () => (await fs.readdir(process.env.TMPDIR)).filter(n => n.startsWith('wf-worktree-'));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('R1: an idle turn is interrupted before the retry starts a new thread', async () => {
  const cwd = await dir('r1');
  try {
    await assert.rejects(codexAgent('WAIT', { clientOptions: clientOptions(cwd), cwd, timeoutMs: 300, retries: 1 }), /timed out after 300ms without progress/);
    assert.deepEqual(methods(cwd), ['thread/start', 'turn/start', 'turn/interrupt', 'thread/start', 'turn/start', 'turn/interrupt']);
  } finally { await shutdownClient(); }
});

test('R1: a progressing turn has no wall-clock cap (the timeout is inactivity)', async () => {
  const cwd = await dir('r1b');
  try {
    assert.equal(await codexAgent('TRICKLE:900', { clientOptions: clientOptions(cwd), cwd, timeoutMs: 300, retries: 0 }), 'trickled');
    assert.deepEqual(methods(cwd), ['thread/start', 'turn/start']);
  } finally { await shutdownClient(); }
});

test('R5: an app-server that dies mid-turn is retried on a fresh client', async () => {
  const cwd = await dir('r5');
  try {
    assert.equal(await codexAgent('CRASH_ONCE', { clientOptions: clientOptions(cwd), cwd, retries: 2 }), 'recovered');
    const inits = wire(cwd).filter(q => q.method === 'initialize');
    assert.equal(inits.length, 2);
    assert.notEqual(inits[0].pid, inits[1].pid);
  } finally { await shutdownClient(); }
});

test('R6: callers that see a dead client at once share one replacement', async () => {
  const cwd = await dir('r6');
  const options = clientOptions(cwd);
  try {
    const first = await getClient(options);
    await new Promise(resolve => { first.once('transport', resolve); process.kill(first.pid, 'SIGKILL'); });
    const [a, b] = await Promise.all([getClient(options), getClient(options)]);
    assert.equal(a, b);
    const pid = a.pid;
    await shutdownClient();
    assert.equal(wire(cwd).filter(q => q.method === 'initialize').length, 2);
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally { await shutdownClient(); }
});

test('R8: shutdownClient fails waiting turns at once instead of hanging and respawning', async () => {
  const cwd = await dir('r8');
  const started = Date.now();
  const turn = codexAgent('WAIT', { clientOptions: clientOptions(cwd), cwd, timeoutMs: 5000, retries: 1 });
  turn.catch(() => {});
  await until(() => methods(cwd).includes('turn/start'));
  await shutdownClient();
  await assert.rejects(turn, /client shut down/);
  assert.ok(Date.now() - started < 3000);
  assert.equal(wire(cwd).filter(q => q.method === 'initialize').length, 1);
});

test('R7: structured output is validated against the author schema; optional props, nulls and array roots', () => {
  const S = { type: 'object', properties: { a: { type: 'string' }, opt: { type: 'string' } }, required: ['a'] };
  assert.equal(parseSchemaResult('sorry, cannot', S), null);
  assert.equal(parseSchemaResult('{"zzz":1}', S), null);
  assert.ok(checkSchemaResult('{"a":1}', S).errors.some(e => /\$\.a: expected string/.test(e)));
  assert.deepEqual(parseSchemaResult('{"a":"x"}', S), { a: 'x' });
  assert.deepEqual(parseSchemaResult('{"a":"x","opt":null}', S), { a: 'x' }, 'strict-mode null for an optional prop is dropped');
  const list = { type: 'array', items: { type: 'number' } };
  assert.deepEqual(parseSchemaResult('Here: [1,2]', list), [1, 2]);
  assert.deepEqual(parseSchemaResult('{"value":[1,2]}', list), [1, 2]);
  assert.equal(parseSchemaResult('["x"]', list), null);
  // Wire: strict mode needs every property required, so optional ones are nullable.
  const wireS = buildTurnParams({ threadId: 't', prompt: 'p', schema: S }).outputSchema;
  assert.deepEqual(wireS.required, ['a', 'opt']);
  assert.deepEqual(wireS.properties.opt, { anyOf: [{ type: 'string' }, { type: 'null' }] });
  assert.equal(wireS.additionalProperties, false);
  assert.deepEqual(plain(wireSchema(list)), { type: 'object', properties: { value: { type: 'array', items: { type: 'number' } } }, required: ['value'], additionalProperties: false });
  assert.deepEqual(strictifySchema({ type: 'object', properties: { x: { type: 'string' } } }).required, ['x'], 'no author required keeps the all-required wire');
});

test('R7: open required properties reach the provider; invalid and impossible schemas fail before spawn', async () => {
  let calls=0;
  const provider=async()=>{calls++;return {b:'ok'};};
  assert.deepEqual(plain(await run('return await agent("x",{schema:{type:"object",properties:{a:{type:"string"}},required:["b"]}})',{runAgent:provider})),{b:'ok'});
  await assert.rejects(run('return await agent("x",{schema:{type:"object",properties:{a:{type:"string"}},required:["b"],additionalProperties:false}})',{runAgent:provider}),/invalid schema/);
  await assert.rejects(run('return await agent("x",{schema:{type:"object",required:"b"}})',{runAgent:provider}),/invalid schema/);
  assert.equal(calls,1);
});

test('R3: pipeline resume follows native global call order, including cached stage completions', async () => {
  const file = path.join(await dir('r3'), 'journal.jsonl');
  const go = async (reuse, delays, first = 's1 ') => {
    const journal = new Journal(file, { reuse }); await journal.load(); const live = [], admitted = [];
    const value = await run(`const r=await pipeline(["a","b"], it=>agent((it==="a"?${JSON.stringify(first)}:"s1 ")+it), r=>agent("s2 "+r)); return [r, await agent("final")]`, { journal, onEvent: e => { if(e.type === "admission" && e.state === "queued") admitted.push(e.label); }, runAgent: async p => { live.push(p); await new Promise(r => setTimeout(r, delays[p] ?? 1)); return p.replace('s1 ', 'R'); } });
    return { live, admitted, value: plain(value) };
  };
  const first = await go(false, { 's1 a': 80, 's1 b': 5 });
  assert.deepEqual(first.live.slice(2, 4), ['s2 Rb', 's2 Ra'], 'stage 2 ran in completion order');
  const resumed = await go(true, { 's1 b': 80, 's1 a': 5 });
  assert.deepEqual(resumed.admitted, ['s2 Ra', 's2 Rb', 'final']);
  assert.deepEqual(resumed.live.slice().sort(), ['s2 Ra', 's2 Rb', 'final'].sort(), 'provider startup may reorder while journal writes settle');
  assert.deepEqual(resumed.value, first.value);
  const edited = await go(true, {}, 'S1 ');
  assert.deepEqual(edited.live.slice().sort(), ['S1 a', 's1 b', 's2 S1 a', 's2 Rb', 'final'].sort(), 'a changed call invalidates its global suffix, including item b');
});

test('R4: a failed parallel task invalidates its global suffix, as does a failed sequential call', async () => {
  const root = await dir('r4');
  const go = async (file, source, fail) => {
    const journal = new Journal(file, { reuse: fail === null }); await journal.load(); const live = [];
    const value = await run(source, { journal, runAgent: async p => { live.push(p); if (p === fail) throw new Error('boom'); return p.toLowerCase(); } });
    return { live: live.sort(), value: plain(value) };
  };
  const fanout = 'const r=await parallel(["A","B","C","D"].map(x=>()=>agent(x))); return [r, await agent("AFTER")]';
  const fanFile = path.join(root, 'fan.jsonl');
  assert.deepEqual((await go(fanFile, fanout, 'B')).value, [['a', null, 'c', 'd'], 'after']);
  const resumed = await go(fanFile, fanout, null);
  assert.deepEqual(resumed.live, ['AFTER', 'B', 'C', 'D']);
  assert.deepEqual(resumed.value, [['a', 'b', 'c', 'd'], 'after']);
  assert.deepEqual((await go(fanFile, fanout, null)).live, [], 'then everything hits');
  const sequence = 'const out=[];for(const x of ["1","2","3"]){try{out.push(await agent(x))}catch{out.push(null)}}return out';
  const seqFile = path.join(root, 'seq.jsonl');
  await go(seqFile, sequence, '2');
  assert.deepEqual((await go(seqFile, sequence, null)).live, ['2', '3']);
});

test('R9: nested child human() keys are scoped per child', async () => {
  const root = await dir('r9');
  const child = path.join(root, 'child.js'), file = path.join(root, 'journal.jsonl');
  await fs.writeFile(child, header + 'return await human("CHILD: deploy?")');
  const parent = 'const p=await human("PARENT: colour?"); const c=await workflow({scriptPath:args}); return {p,c}';
  const questions = new Map();
  const answering = { notify: q => questions.set(q.id, q.question), wait: async key => ({ answer: questions.get(key).startsWith('CHILD') ? 'child-answer' : 'parent-answer' }) };
  const silent = { notify() {}, wait: async () => undefined };
  let journal = new Journal(file); await journal.load();
  assert.deepEqual(plain(await run(parent, { args: child, journal, humanChannel: answering, runAgent: async () => 'x' })), { p: 'parent-answer', c: 'child-answer' });
  journal = new Journal(file, { reuse: true }); await journal.load();
  assert.deepEqual(plain(await run(parent, { args: child, journal, humanChannel: silent, runAgent: async () => 'x' })), { p: 'parent-answer', c: 'child-answer' });
  const keys = (await fs.readFile(file, 'utf8')).trim().split('\n').map(l => JSON.parse(l).key);
  assert.ok(keys.includes('human:q1#0') && keys.includes('human:/w0:q1#0'), keys.join());
});

test('R9: budget.spent() covers nested children and only this run', async () => {
  resetMeter();
  recordTokenUsage({ threadId: 'before-run', tokenUsage: { total: { outputTokens: 500 } } });
  const root = await dir('r9b'), child = path.join(root, 'child.js');
  await fs.writeFile(child, header + 'return await agent("child")');
  const value = await run('const before=budget.spent(); await workflow({scriptPath:args}); return [before, budget.spent(), budget.remaining()]', {
    args: child, budgetTotal: 1000,
    runAgent: async p => { recordTokenUsage({ threadId: p, tokenUsage: { total: { outputTokens: 70 } } }); return p; },
  });
  assert.deepEqual(plain(value), [0, 70, 930]);
});

test('R9: queued agents are withdrawn as soon as the budget ceiling is reached', async () => {
  resetMeter();
  const hold = deferred(), allStarted = deferred(), failed = [], calls = [];
  let starts = 0;
  const prompts = ['spend', ...Array.from({ length: CAP - 1 }, (_, i) => 'hold' + i), 'q1', 'q2', 'q3'];
  const timeout = setTimeout(() => hold.resolve(), 5000);
  const value = await run('return await parallel(args.map(p=>()=>agent(p)))', {
    args: prompts, budgetTotal: 100,
    onEvent: e => {
      if (e.type === 'start' && ++starts === CAP) allStarted.resolve();
      if (e.type === 'admission' && e.state === 'failed') { failed.push(e.label); if (failed.length === 3) hold.resolve('withdrawn'); }
    },
    runAgent: async (p, opts) => {
      calls.push(p);
      // Every slot is busy when the in-flight agent reports usage past the ceiling.
      if (p === 'spend') { await allStarted.promise; recordTokenUsage({ threadId: 'spend', tokenUsage: { total: { outputTokens: 200 } } }); opts.onActivity({ activeTools: 0 }); }
      await hold.promise; return p;
    },
  });
  clearTimeout(timeout);
  assert.equal(await hold.promise, 'withdrawn', 'queued agents did not wait for a slot');
  assert.deepEqual(failed.sort(), ['q1', 'q2', 'q3']);
  assert.ok(!calls.some(p => p.startsWith('q')));
  assert.deepEqual(plain(value).slice(-3), [null, null, null]);
});

test('a running agent\'s tokens reach its progress events (earlier attempts included) before it ends', async () => {
  resetMeter();
  const progress = [];
  await run('return await agent("p")', {
    onEvent: e => { if (e.type === 'progress' && Number.isFinite(e.tokens)) progress.push(e.tokens); },
    runAgent: async (p, opts) => { opts.onActivity({ activeTools: 0, tokens: 1200 }); opts.onActivity({ activeTools: 1, toolCalls: 1 }); opts.onActivity({ activeTools: 0, tokens: 3400 }); return p; },
  });
  assert.deepEqual(progress, [1200, 3400]);
});

test('the agent\'s reply is its own message, not a bridge\'s turn-end note (phase commentary)', async () => {
  const { EventEmitter } = await import('node:events');
  const client = new EventEmitter();
  const collector = attachAgentMessageCollector(client, 't1');
  const done = (item) => client.emit('notification', { method: 'item/completed', params: { threadId: 't1', item: { type: 'agentMessage', ...item } } });
  done({ id: 'a', text: 'the answer' });
  done({ id: 'note-1', text: '_The turn hit the agent\'s step limit._', phase: 'commentary' });
  assert.equal(collector.text(), 'the answer');
  collector.detach();
});

test('a failure whose code names nothing (OpenCode\'s "other") is judged by its message: a 429 is throttling', () => {
  const error = Object.assign(new Error('429 Too Many Requests'), { codexErrorInfo: 'other' });
  assert.equal(isThrottled(error), true);
  assert.equal(isRetryable(Object.assign(new Error('invalid model id'), { codexErrorInfo: 'other' })), false);
});

test('the output budget counts reasoning once: outputTokens already includes it', () => {
  resetMeter();
  recordTokenUsage({ threadId: 'r', tokenUsage: { total: { inputTokens: 1000, outputTokens: 300, reasoningOutputTokens: 200, totalTokens: 1300 } } });
  assert.equal(outputSpent(), 300);
  resetMeter();
});

test('budget ceiling (Claude 2.1.286 semantics): later agents inside a running combinator resolve null; new combinators and agent() throw', async () => {
  resetMeter();
  const value = await run('const l=await pipeline([1,2],v=>agent("s"+v),r=>agent("t"+r)); const errors=[]; for(const f of [()=>parallel([()=>1]),()=>pipeline([1],v=>v),()=>agent("d")]){try{await f()}catch(e){errors.push(e.message)}} return [l,errors]', {
    budgetTotal: 10, runAgent: async p => { await new Promise(r => setTimeout(r, 5)); recordTokenUsage({ threadId: p, tokenUsage: { total: { outputTokens: 20 } } }); return p; },
  });
  const [l, errors] = plain(value);
  assert.deepEqual(l, [null, null]);
  assert.equal(errors.length, 3);
  for (const message of errors) assert.match(message, /budget exceeded/);
});

test('R2: cancel interrupts in-flight turns, removes clean worktrees and admits no new agents', async () => {
  const root = await repo('r2'), server = await dir('r2-server');
  let runtime;
  const running = run('return await agent("WAIT",{isolation:"worktree"})', {
    onRuntime: value => { runtime = value; }, defaults: { cwd: root, clientOptions: clientOptions(server) },
    runAgent: (prompt, opts) => codexAgent(prompt, opts),
  });
  running.catch(() => {});
  try {
    await until(() => methods(server).includes('turn/start'));
    assert.equal(worktrees(root), 2);
    await runtime.cancel();
    assert.deepEqual(methods(server), ['thread/start', 'turn/start', 'turn/interrupt']);
    assert.equal(worktrees(root), 1);
    assert.deepEqual(await tempWorktrees(), []);
    await assert.rejects(running);
    const later = await Promise.race([runtime.agent('later').then(() => 'settled', () => 'settled'), new Promise(r => setTimeout(() => r('pending'), 50))]);
    assert.equal(later, 'pending', 'as in Claude, agent() after an abort never settles');
  } finally { await shutdownClient(); }
});

test('R2: cancel withdraws queued agents and aborts running ones', async () => {
  const calls = [], admitted = deferred();
  let runtime, starts = 0;
  const running = run('return await parallel(args.map(p=>()=>agent(p)))', {
    args: Array.from({ length: CAP + 2 }, (_, i) => 'p' + i), onRuntime: value => { runtime = value; },
    onEvent: e => { if (e.type === 'start' && ++starts === CAP) admitted.resolve(); },
    runAgent: (p, opts) => { calls.push(p); return new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })); },
  });
  await admitted.promise;
  await runtime.cancel();
  assert.equal(calls.length, CAP);
  await running.catch(() => {});
});

test('R2: stopping a service run interrupts cleanup in the child and leaves no worktree', async () => {
  const root = await repo('r2e');
  const runner = service.createWorkflowService({ root: path.join(await dir('r2e-runs'), 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), emit() {}, command: FIXTURE, version: 'test', spawn: (file, args, options) => fork(file, args, { ...options, env: { ...options.env, CODEX_HOME: process.env.CODEX_HOME } }) });
  try {
    const file = path.join(await dir('r2e-script'), 'wt.workflow.js');
    await fs.writeFile(file, header + 'return await agent("WAIT",{isolation:"worktree"});');
    const started = await runner.start({ threadId: 't', file, model: 'fixture' });
    await until(() => methods(root).includes('turn/start'));
    assert.equal(worktrees(root), 2);
    await runner.stop(started.id);
    assert.equal((await runner.list('t')).find(r => r.id === started.id).status, 'stopped');
    assert.equal(worktrees(root), 1);
    assert.deepEqual(await tempWorktrees(), []);
  } finally { await runner.dispose(); }
});

test('model: a per-call opts.model wins over the launch model', async () => {
  const root = await dir('model');
  const runner = service.createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), emit() {}, command: FIXTURE, version: 'test', spawn: (file, args, options) => fork(file, args, { ...options, env: { ...options.env, CODEX_HOME: process.env.CODEX_HOME } }) });
  try {
    const file = path.join(root, 'model.workflow.js');
    await fs.writeFile(file, header + 'return [await agent("FAST",{model:"fixture-b"}), await agent("FAST")];');
    let current = await runner.start({ threadId: 't', file, model: 'fixture' });
    await until(async () => { current = (await runner.list('t')).find(r => r.id === current.id); return current.status !== 'running'; });
    assert.equal(current.status, 'completed', JSON.stringify(current.error));
    assert.deepEqual(wire(root).filter(q => q.method === 'thread/start').map(q => q.params.model), ['fixture-b', 'fixture']);
  } finally { await runner.dispose(); }
});

test('skip: a queued skip never starts; skipped agents end as skipped, not failed', async () => {
  const hold = deferred(), admitted = deferred(), events = [];
  let runtime, output, starts = 0;
  const prompts = [...Array.from({ length: CAP }, (_, i) => 'hold' + i), 'queued'];
  const running = run('return await parallel(args.map(p=>()=>agent(p)))', {
    args: prompts, onRuntime: value => { runtime = value; }, onOutput: text => { output = JSON.parse(text); },
    onEvent: e => { events.push(e); if (e.type === 'start' && ++starts === CAP) admitted.resolve(); },
    runAgent: (p, opts) => { assert.notEqual(p, 'queued'); return new Promise(resolve => { opts.signal.addEventListener('abort', () => resolve(null), { once: true }); hold.promise.then(() => resolve(p)); }); },
  });
  await admitted.promise;
  const id = label => events.find(e => e.type === 'admission' && e.label === label).id;
  assert.equal(runtime.controlMember(id('queued'), 'retry'), true, 'retry of a queued agent is accepted and keeps it queued');
  assert.equal(runtime.controlMember(id('queued'), 'skip'), true);
  assert.equal(runtime.controlMember(id('hold0'), 'skip'), true);
  await until(() => events.filter(e => e.type === 'end').length === 2);
  hold.resolve();
  const value = plain(await running);
  assert.equal(value[0], null); assert.equal(value.at(-1), null); assert.equal(value[1], 'hold1');
  for (const label of ['hold0', 'queued']) {
    const end = events.find(e => e.type === 'end' && e.label === label);
    assert.equal(end.status, 'skipped'); assert.equal(end.error, 'skipped by user');
    assert.equal(output.workflowProgress.find(row => row.label === label).state, 'skipped');
  }
  assert.equal(events.some(e => e.type === 'start' && e.label === 'queued'), false);
});

test('worktree: a failed `git worktree add` leaves no temp folder', async () => {
  const root = await repo('wt-fail');
  await fs.writeFile(path.join(root, '.git', 'worktrees'), 'not a directory');
  const before = await tempWorktrees();
  await assert.rejects(createWorktree(root));
  assert.deepEqual(await tempWorktrees(), before);
});

test('agentType: path-like names are rejected; built-ins resolve; project definitions override', async () => {
  const cwd = await dir('agents'), custom = await dir('agents-custom');
  for (const name of ['../x', 'a/b', 'a\\b', '..']) await assert.rejects(loadAgentType(name, cwd), /not a valid agent name/);
  assert.match((await loadAgentType('general-purpose', cwd)).systemPrompt, /general-purpose agent/);
  assert.equal((await loadAgentType('Explore', cwd)).sandbox, 'read-only');
  assert.equal((await loadAgentType('Plan', cwd)).sandbox, 'read-only');
  assert.equal(await loadAgentType('no-such-agent', cwd), null);
  await fs.mkdir(path.join(custom, '.claude', 'agents'), { recursive: true });
  await fs.writeFile(path.join(custom, '.claude', 'agents', 'Plan.md'), '---\nmodel: fixture-b\n---\ncustom plan\n');
  assert.deepEqual(await loadAgentType('Plan', custom), { systemPrompt: 'custom plan', model: 'fixture-b', source: path.join(custom, '.claude', 'agents', 'Plan.md') });
  try {
    assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, agentType: 'Explore', sandbox: 'workspace-write' }), 'fixture result');
    const start = wire(cwd).find(q => q.method === 'thread/start');
    assert.equal(start.params.sandbox, 'read-only');
    assert.match(start.params.developerInstructions, /read-only search agent/);
  } finally { await shutdownClient(); }
});

test('Intl.DateTimeFormat without a date throws like Date.now(); explicit dates still format', async () => {
  for (const expression of ['new Intl.DateTimeFormat("en").format()', 'Intl.DateTimeFormat().formatToParts()', 'new Intl.DateTimeFormat("en").format(undefined)']) {
    await assert.rejects(run(`return ${expression}`), /breaks resume/, expression);
  }
  assert.deepEqual(plain(await run('const f=new Intl.DateTimeFormat("en",{timeZone:"UTC"}); return [f.format(new Date(0)), [new Date(0)].map(f.format)[0], f.formatToParts(0).length>0]')), ['1/1/1970', '1/1/1970', true]);
});

test('concurrency cap uses os.availableParallelism()', () => {
  assert.equal(createRuntime().CAP, CAP);
});

test('C2: a core-hosted result without outputFile completes and records the value', async () => {
  for (const [hosted, expected] of [['{"answer":42}', '{"answer":42}'], ['undefined', '']]) {
    const root = await dir('hosted');
    const runner = service.createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), emit() {}, command: FIXTURE, version: 'test', spawn: (file, args, options) => fork(file, args, { ...options, env: { ...options.env, CODEX_HOME: process.env.CODEX_HOME, WF_FIXTURE_HOSTED: hosted } }) });
    try {
      const file = path.join(root, 'hosted.workflow.js');
      await fs.writeFile(file, header + 'return 1;');
      let current = await runner.start({ threadId: 't', file, model: 'fixture' });
      await until(async () => { current = (await runner.list('t')).find(r => r.id === current.id); return current.status !== 'running'; });
      assert.equal(current.status, 'completed', JSON.stringify(current.error));
      assert.ok(wire(root).some(q => q.method === 'codeDesktop/workflow/scriptResult'), 'the hosted engine ran');
      const [resultFile] = (await fs.readdir(path.join(root, 'runs'), { recursive: true })).filter(f => f.endsWith('result.json'));
      assert.equal(await fs.readFile(path.join(root, 'runs', resultFile), 'utf8'), expected);
    } finally { await runner.dispose(); }
  }
});
