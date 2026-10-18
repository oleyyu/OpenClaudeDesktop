import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { CoworkSdkChannel, sdkArguments, sdkLaunch } from '../electron/cowork-runtime/sdk-channel.mjs';
import { CoworkVmTransport } from '../electron/cowork-runtime/vm-transport.mjs';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture(options = {}) {
  const completion = deferred(), ready = deferred(), writes = [], kills = [], messages = [], failures = [];
  const process = { stdout: new PassThrough(), stderr: new PassThrough(), ready: ready.promise, completion: completion.promise,
    stdin: new Writable({ write(chunk, _encoding, done) { writes.push(JSON.parse(chunk.toString())); done(); } }),
    async kill(signal) { kills.push(signal); end({ code: null, signal }); },
  };
  const end = result => { process.stdout.end(); process.stderr.end(); completion.resolve(result); };
  const channel = new CoworkSdkChannel({ process, ...options });
  channel.on('message', record => messages.push(record)); channel.on('failure', error => failures.push(error));
  const receive = record => process.stdout.write(JSON.stringify(record) + '\n');
  const respond = (record, response = {}) => receive({ type: 'control_response', response: { subtype: 'success', request_id: record.request_id, response } });
  return { channel, process, ready, writes, kills, messages, failures, receive, respond, end };
}

test('SDK launch uses the source stream-json/stdio flags with explicit session ownership', () => {
  const args = sdkArguments({ model: 'my-model', effort: 'high', resume: 'saved-id' });
  assert.deepEqual(args, ['--output-format', 'stream-json', '--verbose', '--input-format', 'stream-json',
    '--permission-prompt-tool', 'stdio', '--include-partial-messages', '--permission-mode', 'default',
    '--setting-sources=', '--model', 'my-model', '--effort', 'high', '--resume=saved-id']);
  assert.throws(() => sdkArguments({ resume: 'old', sessionId: 'new' }), /either/);
  assert.throws(() => sdkArguments({ permissionMode: 'bypassPermissions' }), /Unsupported/);
});

test('initialization is single flight and messages wait for correlated acknowledgement', async () => {
  const f = fixture(), initialized = f.channel.initialize({ systemPrompt: 'Rules', appendSystemPrompt: 'More rules' });
  assert.equal(f.channel.initialize(), initialized);
  const sent = f.channel.sendUser('你好', { uuid: 'message-id', sessionId: 'session-id' });
  await setImmediate(); assert.equal(f.writes.length, 0);
  f.ready.resolve(); await setImmediate();
  assert.deepEqual(f.writes[0].request, { subtype: 'initialize', systemPrompt: ['Rules'], appendSystemPrompt: 'More rules' });
  assert.equal(f.writes.length, 1);
  f.respond(f.writes[0], { models: ['test'] });
  assert.deepEqual(await initialized, { models: ['test'] }); await sent;
  assert.deepEqual(f.writes[1], { type: 'user', session_id: 'session-id', uuid: 'message-id', message: { role: 'user', content: [{ type: 'text', text: '你好' }] }, parent_tool_use_id: null });
  f.channel.close(); await f.channel.finished;
});

test('parses split Unicode records, batches and final records while excluding stderr', async () => {
  const f = fixture(), diagnostics = [];
  f.channel.on('diagnostic', text => diagnostics.push(text));
  const bytes = Buffer.from(JSON.stringify({ type: 'assistant', message: { content: '你好' } }) + '\n');
  const split = bytes.indexOf(Buffer.from('你')) + 1;
  f.process.stdout.write(bytes.subarray(0, split)); f.process.stdout.write(bytes.subarray(split));
  f.process.stderr.write('diagnostic, not JSON\n');
  f.process.stdout.write('{"type":"keep_alive"}\n{"type":"result","is_error":false}');
  f.end({ code: 0, signal: null }); await f.channel.finished;
  assert.deepEqual(f.messages.map(item => item.type), ['assistant', 'result']);
  assert.equal(f.messages[0].message.content, '你好'); assert.equal(diagnostics.join(''), 'diagnostic, not JSON\n');
  assert.equal(f.failures.length, 0);
});

test('concurrent controls correlate by ID; timeouts and cancellation cannot settle another request', async () => {
  const f = fixture(); f.ready.resolve();
  const a = f.channel.request({ subtype: 'a' }), b = f.channel.request({ subtype: 'b' });
  await setImmediate(); f.respond(f.writes[1], { value: 'b' }); f.respond(f.writes[0], { value: 'a' });
  assert.equal((await a).response.value, 'a'); assert.equal((await b).response.value, 'b');
  const abort = new AbortController();
  const c = f.channel.request({ subtype: 'c' }, { signal: abort.signal });
  const rejected = assert.rejects(c, { name: 'AbortError' });
  await setImmediate(); const cRecord = f.writes.at(-1); abort.abort(); await rejected; await setImmediate();
  assert.deepEqual(f.writes.at(-1), { type: 'control_cancel_request', request_id: cRecord.request_id });
  f.respond(cRecord); await setImmediate(); assert.equal(f.channel.pending.size, 0);
  await assert.rejects(f.channel.request({ subtype: 'slow' }, { timeoutMs: 5 }), /timed out/);
  f.channel.close(); await f.channel.finished;
});

test('cancelled queued requests never dispatch after late spawn acknowledgement', async () => {
  const f = fixture(), abort = new AbortController();
  const request = f.channel.request({ subtype: 'interrupt' }, { signal: abort.signal });
  const rejected = assert.rejects(request, { name: 'AbortError' }); abort.abort(); await rejected;
  f.ready.resolve(); await setImmediate(); assert.deepEqual(f.writes, []);
  f.channel.close(); await f.channel.finished;
});

test('tool approval preserves edits and tool identity, suppresses duplicate in-flight prompts and replays a completed answer', async () => {
  const decision = deferred(); let calls = 0;
  const f = fixture({ handlers: { can_use_tool: async (request, context) => {
    calls++; assert.equal(request.tool_name, 'Write'); assert.equal(context.requestId, 'approval'); return decision.promise;
  } } }); f.ready.resolve();
  const request = { type: 'control_request', request_id: 'approval', request: { subtype: 'can_use_tool', tool_name: 'Write', tool_use_id: 'tool-1', input: { file_path: '/mnt/a' } } };
  f.receive(request); f.receive(request); await setImmediate(); assert.equal(calls, 1);
  decision.resolve({ behavior: 'allow', updatedInput: { file_path: '/mnt/b' } }); await setImmediate();
  assert.deepEqual(f.writes[0], { type: 'control_response', response: { subtype: 'success', request_id: 'approval', response: { behavior: 'allow', updatedInput: { file_path: '/mnt/b' }, toolUseID: 'tool-1' } } });
  f.receive(request); await setImmediate(); assert.equal(calls, 1); assert.deepEqual(f.writes[1], f.writes[0]);
  f.channel.close(); await f.channel.finished;
});

test('guest cancellation aborts host approval and suppresses a late approval result', async () => {
  const decision = deferred(); let signal;
  const f = fixture({ handlers: { can_use_tool: async (_request, context) => { signal = context.signal; return decision.promise; } } }); f.ready.resolve();
  f.receive({ type: 'control_request', request_id: 'p', request: { subtype: 'can_use_tool', tool_use_id: 't' } }); await setImmediate();
  f.receive({ type: 'control_cancel_request', request_id: 'p' }); await setImmediate(); assert.equal(signal.aborted, true);
  decision.resolve({ behavior: 'allow', updatedInput: {} }); await setImmediate(); assert.deepEqual(f.writes, []);
  f.channel.close(); await f.channel.finished;
});

test('missing approvals deny tools and unsupported controls return correlated errors', async () => {
  const f = fixture(); f.ready.resolve();
  f.receive({ type: 'control_request', request_id: 'p', request: { subtype: 'can_use_tool', tool_use_id: 't' } });
  f.receive({ type: 'control_request', request_id: 'q', request: { subtype: 'unknown' } }); await setImmediate();
  assert.equal(f.writes[0].response.response.behavior, 'deny');
  assert.equal(f.writes[1].response.subtype, 'error'); assert.equal(f.writes[1].response.request_id, 'q');
  f.channel.close(); await f.channel.finished;
});

test('initialize redelivers pending permissions once and interrupt uses the control protocol', async () => {
  let approvals = 0;
  const f = fixture({ handlers: { can_use_tool: async () => { approvals++; return { behavior: 'deny', message: 'No' }; } } });
  f.ready.resolve(); const init = f.channel.initialize(); await setImmediate();
  const request = { type: 'control_request', request_id: 'restored', request: { subtype: 'can_use_tool', tool_use_id: 't' } };
  f.receive({ type: 'control_response', response: { subtype: 'success', request_id: f.writes[0].request_id, response: {}, pending_permission_requests: [request] } });
  await init; await setImmediate(); assert.equal(approvals, 1);
  assert.equal(f.writes[1].response.request_id, 'restored');
  const interrupt = f.channel.interrupt(); await setImmediate();
  const record = f.writes.at(-1); assert.deepEqual(record.request, { subtype: 'interrupt' });
  f.respond(record, { still_queued: [] }); assert.deepEqual(await interrupt, { still_queued: [] });
  f.channel.close(); await f.channel.finished;
});

test('failed initialization terminates the process and rejects a queued user message', async () => {
  const f = fixture(); f.ready.resolve();
  const init = f.channel.initialize(); const sent = f.channel.sendUser('must not be sent');
  const rejected = Promise.all([assert.rejects(init, /bad config/), assert.rejects(sent, /bad config/)]);
  await setImmediate(); f.receive({ type: 'control_response', response: { subtype: 'error', request_id: f.writes[0].request_id, error: 'bad config' } });
  await rejected; await f.channel.finished;
  assert.equal(f.writes.some(record => record.type === 'user'), false); assert.deepEqual(f.kills, ['SIGKILL']);
});

test('malformed/oversized output terminates only the owned process and rejects pending controls', async () => {
  for (const text of ['not-json\n', 'x'.repeat(201)]) {
    const f = fixture({ maxRecordBytes: 200 }); f.ready.resolve();
    const request = f.channel.request({ subtype: 'initialize' }); const rejected = assert.rejects(request, /invalid stream-json|too large/);
    await setImmediate(); f.process.stdout.write(text); await rejected; await f.channel.finished;
    assert.equal(f.failures.length, 1); assert.deepEqual(f.kills, ['SIGKILL']); assert.equal(f.channel.pending.size, 0);
  }
});

test('process failure retains exit metadata and close cancels outstanding host handlers', async () => {
  const decision = deferred(); let signal;
  const f = fixture({ handlers: { can_use_tool: async (_request, context) => { signal = context.signal; return decision.promise; } } });
  f.ready.resolve();
  f.receive({ type: 'control_request', request_id: 'p', request: { subtype: 'can_use_tool', tool_use_id: 't' } }); await setImmediate();
  const init = f.channel.initialize(); const rejected = assert.rejects(init, /exited/);
  f.end({ code: 137, signal: 'SIGKILL', oomKillCount: 1, peakBytes: 123 }); await rejected;
  assert.equal((await f.channel.finished).oomKillCount, 1); assert.equal(signal.aborted, true);
  decision.resolve({ behavior: 'deny', message: 'late' }); await setImmediate();
  assert.equal(f.writes.filter(record => record.type === 'control_response').length, 0);
});

test('SDK channel runs over the VM transport contract from spawn through init, message, approval and result', async () => {
  let callbacks; const stdin = [], spawn = [];
  const vm = { async setEventCallbacks(...values) { callbacks = values; }, async isGuestConnected() { return true; },
    async spawn(...values) { spawn.push(values); return {}; },
    async kill(id, signal) { callbacks[2](id, null, signal); },
    async writeStdin(id, text) {
      const record = JSON.parse(text); stdin.push(record);
      if (record.type === 'control_request') callbacks[0](id, JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id: record.request_id, response: {} } }) + '\n');
      if (record.type === 'user') callbacks[0](id, JSON.stringify({ type: 'control_request', request_id: 'approval', request: { subtype: 'can_use_tool', tool_name: 'Read', input: {}, tool_use_id: 'tool' } }) + '\n');
      if (record.type === 'control_response') callbacks[0](id, '{"type":"result","is_error":false,"result":"done"}\n');
    },
  };
  const transport = new CoworkVmTransport({ vm });
  const process = transport.spawn({ command: '/usr/local/bin/claude', processName: 'fixture-session', args: sdkArguments() });
  const channel = new CoworkSdkChannel({ process, handlers: { can_use_tool: async request => ({ behavior: 'allow', updatedInput: request.input }) } });
  const result = deferred(); channel.on('message', record => { if (record.type === 'result') result.resolve(record); });
  await channel.initialize(); await channel.sendUser('read my file');
  assert.equal((await result.promise).result, 'done');
  assert.equal(spawn.length, 1); assert.equal(stdin[2].response.response.toolUseID, 'tool');
  channel.close(); await channel.finished; await transport.close();
});

test('SDK enters the selected mount and retains the enforcing VM proxy without a shell', () => {
  const launch=sdkLaunch({cwd:'/sessions/cw-test/mnt/work',model:'model; echo unexpected'});
  assert.equal(launch.command,'/usr/bin/env');
  assert.deepEqual(launch.args.slice(0,7),['-u','NO_PROXY','-u','no_proxy','--chdir=/sessions/cw-test/mnt/work','--','/usr/local/bin/claude']);
  assert.equal(launch.args.at(-1),'model; echo unexpected');
  for(const cwd of ['/tmp','/sessions/../../etc','/sessions/cw-test/mnt/work\0'])assert.throws(()=>sdkLaunch({cwd}),/working directory/);
});

test('closing retains a completion barrier until native exit, including repeated closes', async () => {
  const done=deferred();let exited=false;const stdout=new PassThrough(),stderr=new PassThrough();
  const process={stdout,stderr,stdin:new PassThrough(),ready:Promise.resolve(),completion:done.promise,kill:async()=>{}};
  const channel=new CoworkSdkChannel({process});
  const first=channel.close();assert.equal(channel.close(),first);
  first.then(()=>{exited=true});await setImmediate();assert.equal(exited,false);
  stdout.end();stderr.end();done.resolve({code:null,signal:'SIGTERM'});
  await first;assert.equal(exited,true);
});

test('SDK completion preserves native string errors instead of an empty failure event', async () => {
  const f = fixture();
  f.end({ code: null, signal: null, error: 'RPC error: useradd: invalid user name' });
  await f.channel.finished;
  assert.equal(f.failures.length, 1);
  assert.ok(f.failures[0] instanceof Error);
  assert.match(f.failures[0].message, /useradd: invalid user name/);
});

// R4i-cowork CW2 (X2 CW-2): rewind forks resume at the fork point under a new, host-named session.
import { sdkSessionOptions } from '../electron/cowork-runtime/runtime-worker.mjs';

test('a rewind fork passes --resume, --fork-session, --resume-session-at and --session-id in the SDK transport order', () => {
  const base = ['--output-format', 'stream-json', '--verbose', '--input-format', 'stream-json',
    '--permission-prompt-tool', 'stdio', '--include-partial-messages', '--permission-mode', 'default', '--setting-sources='];
  assert.deepEqual(sdkArguments({ model: 'm', ...sdkSessionOptions({ sdkSessionId: 'new-id', fork: { from: 'old-id', at: 'assistant-uuid' } }) }),
    [...base, '--model', 'm', '--resume=old-id', '--fork-session', '--resume-session-at=assistant-uuid', '--session-id=new-id']);
  assert.deepEqual(sdkSessionOptions({ sdkSessionId: 's', resume: true }), { resume: 's' });
  assert.deepEqual(sdkSessionOptions({ sdkSessionId: 's' }), { sessionId: 's' });
  assert.deepEqual(sdkArguments({ resume: 'old', forkSession: true }), [...base, '--resume=old', '--fork-session']);
  assert.throws(() => sdkArguments({ resume: 'old', sessionId: 'new' }), /either/, 'a new id beside --resume still needs --fork-session');
  assert.throws(() => sdkArguments({ forkSession: true, sessionId: 'new' }), /fork needs/);
  assert.throws(() => sdkArguments({ resumeSessionAt: 'a', sessionId: 'new' }), /fork needs/);
  assert.throws(() => sdkArguments({ resume: 'old', resumeSessionAt: 'a\0b', forkSession: true }), /resumeSessionAt/);
  assert.throws(() => sdkArguments({ resume: 'old', forkSession: 'yes' }), /forkSession/);
  const launch = sdkLaunch({ cwd: '/sessions/cw-test/mnt/work', ...sdkSessionOptions({ sdkSessionId: 'n', fork: { from: 'o', at: 'a' } }) });
  assert.deepEqual(launch.args.slice(-4), ['--resume=o', '--fork-session', '--resume-session-at=a', '--session-id=n']);
});

test('the runtime forwards only the fixed fork-refusal marker from CLI diagnostics', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../electron/cowork-runtime/runtime-worker.mjs', import.meta.url), 'utf8');
  assert.equal(source.split("send({ event: 'failure', sessionId: params.sessionId, turnId: params.turnId, error: REWIND_FORK_REFUSED })").length - 1, 1);
  assert.equal(source.split('isResume: !!params.resume || !!params.fork').length - 1, 1);
  assert.equal(source.split('...sdkSessionOptions(params)').length - 1, 1);
});
