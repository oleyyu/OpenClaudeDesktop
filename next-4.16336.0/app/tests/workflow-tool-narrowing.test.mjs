// agent() opts.disallowedTools / bashCommandClamp on OpenClaude Desktop's workflow engine (runner toolNarrowing.js):
// validated as Claude Code 2.1.280 validates them, mapped onto the core's real tool controls, refused otherwise.
// Real fixture app-server only, with a fresh HOME/XDG/CODEX_HOME/TMPDIR sandbox.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = fsSync.existsSync('/private/tmp/claude-501') ? '/private/tmp/claude-501' : os.tmpdir();
const SANDBOX = await fs.realpath(await fs.mkdtemp(path.join(BASE, 'wf-tool-narrowing-')));
for (const [key, name] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'xdg-config'], ['XDG_DATA_HOME', 'xdg-data'], ['XDG_CACHE_HOME', 'xdg-cache'], ['XDG_STATE_HOME', 'xdg-state'], ['CODEX_HOME', 'codex-home'], ['TMPDIR', 'tmp']]) {
  process.env[key] = path.join(SANDBOX, name);
  await fs.mkdir(process.env[key], { recursive: true });
}
test.after(() => fs.rm(SANDBOX, { recursive: true, force: true }));

const R = '../third-party/codex-workflows-runner/src/';
const { codexAgent, shutdownClient, isRetryable } = await import(R + 'codexAgent.js');
const { startCodexSession } = await import(R + 'codexSession.js');
const { runWorkflowSource } = await import(R + 'runWorkflow.js');
const { Journal } = await import(R + 'journal.js');
const { normalizeToolOptions, narrowThreadParams, coreToolControls, classifyTools, ToolNarrowingError } = await import(R + 'toolNarrowing.js');

const FIXTURE = path.resolve(import.meta.dirname, 'fixtures/workflow-runner-server.cjs');
const header = 'export const meta={name:"narrowing",description:"Tool narrowing"};\n';
const run = (body, options) => runWorkflowSource(header + body, options);
const dir = async name => fs.realpath(await fs.mkdtemp(path.join(SANDBOX, name + '-')));
const clientOptions = cwd => ({ command: process.execPath, args: [FIXTURE], cwd });
const wire = cwd => { try { return fsSync.readFileSync(path.join(cwd, 'workflow-wire.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };
const starts = cwd => wire(cwd).filter(q => q.method === 'thread/start').map(q => q.params);

test('malformed disallowedTools / bashCommandClamp are refused with Claude\'s messages', () => {
  for (const bad of ['Bash', null, 7, {}]) assert.throws(() => normalizeToolOptions({ disallowedTools: bad }), new RegExp(`must be an array of non-empty tool-name strings \\(e\\.g\\. \\['Bash', 'Write'\\]\\); got ${bad === null ? 'object' : typeof bad}\\. Refusing the spawn rather than running it un-narrowed\\.`));
  for (const bad of [[''], [' Bash'], ['Bash '], [1], ['Write', null]]) assert.throws(() => normalizeToolOptions({ disallowedTools: bad }), /got an array with non-string, empty, or whitespace-padded entries\. Refusing the spawn rather than running it un-narrowed\./);
  assert.throws(() => normalizeToolOptions({ bashCommandClamp: 'Bash(ls)' }), /bashCommandClamp must be an array of non-empty strings; got string\. Refusing the spawn rather than running it un-clamped\./);
  assert.throws(() => normalizeToolOptions({ bashCommandClamp: ['Bash'] }), /entry 'Bash' must be a 'Bash\(<command or prefix>\)' permission rule .* it parses to tool 'Bash' with no rule content\. Refusing the spawn rather than running it with an inert clamp entry\./);
  assert.throws(() => normalizeToolOptions({ bashCommandClamp: ['Read(x)'] }), /it parses to tool 'Read'\. Refusing/);
  assert.throws(() => normalizeToolOptions({ bashCommandClamp: ['bash(ls)'] }), /it parses to tool 'bash'\./);
  assert.throws(() => normalizeToolOptions({ bashCommandClamp: ['Bash( ls)'] }), /with whitespace-padded rule content\./);
  assert.throws(() => normalizeToolOptions({ bashCommandClamp: ['Bash()'] }), /with no rule content\./);
  assert.deepEqual(normalizeToolOptions({ disallowedTools: ['Write', 'Bash', 'Write'], bashCommandClamp: ['Bash(npm test:*)', 'Bash(git status)'] }), { disallowedTools: ['Bash', 'Write'], bashCommandClamp: ['Bash(git status)', 'Bash(npm test:*)'] });
  assert.deepEqual(normalizeToolOptions({ disallowedTools: [], bashCommandClamp: [] }), { disallowedTools: undefined, bashCommandClamp: undefined });
});

test('tool classes and core detection', () => {
  assert.deepEqual(classifyTools(['Bash', 'Edit', 'WebFetch', 'Task', 'mcp__gh', 'Read', 'Nope']), { readOnly: ['Bash', 'Edit'], web: ['WebFetch'], agents: ['Task'], mcp: ['mcp__gh'], other: ['Read', 'Nope'] });
  const opts = { clientInfo: { name: 'code-desktop-workflows' } };
  assert.equal(coreToolControls({ serverInfo: { userAgent: 'code-desktop-workflows/0.155.1 (Mac OS 27.2.0; arm64) unknown (code-desktop-workflows; 1.0)' } }, opts), 'codex');
  for (const userAgent of ['code-desktop-deepseek-core/1.0 (dsh 2; darwin)', 'code-desktop-acp-bridge/1.0 (kimi 1; darwin)', 'code-desktop-zcode-bridge/1.0 (zcode 1; darwin)', 'code-desktop-mimo-core/1.0 (mimo 1; darwin)', 'fixture/0.155.1', ''])
    assert.equal(coreToolControls({ serverInfo: { userAgent } }, opts), 'sandbox', userAgent);
  assert.equal(coreToolControls({}, undefined), 'sandbox');
});

test('Codex narrowing: read-only, web search and sub-agents off, MCP servers and tools disabled from the effective config', async () => {
  const requests = [];
  const client = { request: async (method, params) => { requests.push({ method, params }); return { config: { mcp_servers: { github: { command: 'gh', disabled_tools: ['a'] }, 'my.srv': { command: 'x' } } } }; } };
  const logs = [];
  const params = await narrowThreadParams(client, { sandbox: 'danger-full-access', cwd: '/w', approvalPolicy: 'never' },
    { toolControls: 'codex', disallowedTools: ['WebSearch', 'Agent', 'Edit', 'mcp__github__create_issue', 'mcp__my_srv', 'TodoWrite'], label: 'rev', log: m => logs.push(m) });
  assert.deepEqual(params, { sandbox: 'read-only', cwd: '/w', approvalPolicy: 'never', config: { web_search: 'disabled', 'features.multi_agent': false, 'features.multi_agent_v2': false, 'features.default_mode_request_user_input': false,
    'mcp_servers.github.disabled_tools': ['a', 'create_issue'], 'mcp_servers.my.srv.enabled': false } });
  assert.deepEqual(requests, [{ method: 'config/read', params: { cwd: '/w' } }]);
  assert.match(logs[0], /^workflow agent \[rev\]: read-only \(Edit excluded\); compatibility: the core keeps its sandboxed shell for reads instead of removing Claude\x27s individual tools; web search off .*; sub-agents off .*; MCP narrowed .*; no separate tool to remove for TodoWrite$/);
  const all = await narrowThreadParams(client, { sandbox: 'workspace-write', cwd: '/w' }, { toolControls: 'codex', disallowedTools: ['mcp__*'] });
  assert.deepEqual(all.config, { 'features.multi_agent': false, 'features.multi_agent_v2': false, 'features.default_mode_request_user_input': false, 'mcp_servers.github.enabled': false, 'mcp_servers.my.srv.enabled': false, 'features.apps': false });
  assert.equal(all.sandbox, 'workspace-write');
  // A server the core doesn't have is a no-op (a bare `mcp_servers.<ghost>` override would break the Codex config).
  assert.deepEqual((await narrowThreadParams(client, { cwd: '/w' }, { toolControls: 'codex', disallowedTools: ['mcp__ghost'] })).config, { 'features.multi_agent': false, 'features.multi_agent_v2': false, 'features.default_mode_request_user_input': false });
  const failing = { request: async () => { throw new Error('nope'); } };
  await assert.rejects(narrowThreadParams(failing, { cwd: '/w' }, { toolControls: 'codex', disallowedTools: ['mcp__github'] }), /couldn't read the core's MCP servers .* refused rather than run un-narrowed/);
  // Never widened: a read-only run stays read-only, and nothing to narrow leaves the params untouched.
  const untouched = { sandbox: 'read-only' };
  assert.equal(await narrowThreadParams(client, untouched, {}), untouched);
  // Claude's workflow-subagent never starts sub-agents or asks the user: on Codex that holds with no disallowedTools too.
  assert.deepEqual(await narrowThreadParams(client, { cwd: '/w', config: { x: 1 } }, { toolControls: 'codex' }), { cwd: '/w', config: { x: 1, 'features.multi_agent': false, 'features.multi_agent_v2': false, 'features.default_mode_request_user_input': false } });
});

test('a bridge core runs write/shell exclusions read-only and refuses what it cannot remove', async () => {
  const cwd = await dir('bridge');
  try {
    assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, sandbox: 'workspace-write', disallowedTools: ['Write', 'Edit'] }), 'fixture result');
    assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, sandbox: 'danger-full-access', disallowedTools: ['Bash'] }), 'fixture result');
    assert.deepEqual(starts(cwd).map(p => [p.sandbox, p.config]), [['read-only', undefined], ['read-only', undefined]]);
    await assert.rejects(codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, sandbox: 'workspace-write', disallowedTools: ['Write', 'WebFetch', 'mcp__github'], retries: 3 }),
      e => e instanceof ToolNarrowingError && /this agent core can't remove WebFetch, mcp__github from its agents, so the spawn is refused rather than run un-narrowed\. Drop them from disallowedTools/.test(e.message) && !isRetryable(e));
    await assert.rejects(codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, bashCommandClamp: ['Bash(npm test:*)'] }), /bashCommandClamp \(Bash\(npm test:\*\)\) can't be enforced .* refused rather than run un-clamped/);
    await assert.rejects(codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, disallowedTools: 'Bash' }), /Refusing the spawn rather than running it un-narrowed/);
    assert.equal(starts(cwd).length, 2, 'a refused spawn never starts a thread');
  } finally { await shutdownClient(); }
});

test('an agentType definition\'s disallowedTools join the call\'s; sessions narrow the same way', async () => {
  const cwd = await dir('agent-type');
  await fs.mkdir(path.join(cwd, '.claude/agents'), { recursive: true });
  await fs.writeFile(path.join(cwd, '.claude/agents/reviewer.md'), '---\nname: reviewer\ndisallowedTools: Write, Edit\n---\nReview only.\n');
  await fs.writeFile(path.join(cwd, '.claude/agents/searcher.md'), '---\nname: searcher\ndisallowedTools: [WebSearch]\n---\nSearch.\n');
  try {
    assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, sandbox: 'workspace-write', agentType: 'reviewer' }), 'fixture result');
    assert.equal(starts(cwd).at(-1).sandbox, 'read-only');
    await assert.rejects(codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, agentType: 'searcher' }), /can't remove WebSearch/);
    const session = await startCodexSession({ clientOptions: clientOptions(cwd), cwd, sandbox: 'workspace-write', disallowedTools: ['Bash'] });
    assert.equal(starts(cwd).at(-1).sandbox, 'read-only');
    await session.cleanup?.();
    await assert.rejects(startCodexSession({ clientOptions: clientOptions(cwd), cwd, disallowedTools: ['Task'] }), /can't remove Task/);
    await assert.rejects(startCodexSession({ clientOptions: clientOptions(cwd), cwd, disallowedTools: [''] }), /un-narrowed/);
  } finally { await shutdownClient(); }
});

test('agent(): malformed options and core refusals reject before admission; normalized lists reach the core and the journal identity', async () => {
  const seen = [], events = [];
  const runAgent = async (_prompt, opts) => { seen.push({ disallowedTools: opts.disallowedTools, bashCommandClamp: opts.bashCommandClamp }); return 'ok'; };
  assert.equal(await run('return await agent("x",{disallowedTools:["Write","Bash","Write"]})', { runAgent }), 'ok');
  assert.equal(await run('return await agent("x",{disallowedTools:[]})', { runAgent }), 'ok');
  assert.deepEqual(seen, [{ disallowedTools: ['Bash', 'Write'], bashCommandClamp: undefined }, { disallowedTools: undefined, bashCommandClamp: undefined }]);
  assert.match(await run('try{await agent("x",{disallowedTools:"Bash"});return "ran"}catch(e){return e.message}', { runAgent }), /^agent\(\) opts\.disallowedTools must be an array .* got string\. Refusing the spawn rather than running it un-narrowed\.$/);
  assert.match(await run('try{await agent("x",{bashCommandClamp:["Bash"]});return "ran"}catch(e){return e.message}', { runAgent }), /inert clamp entry/);
  assert.equal(seen.length, 2, 'a malformed spawn never reaches the core');
  const refusing = Object.assign(async () => { seen.push('ran'); return 'ok'; }, { preflight: async opts => { if (opts.disallowedTools?.includes('WebFetch')) throw new ToolNarrowingError('refused: WebFetch'); } });
  assert.equal(await run('try{await agent("x",{disallowedTools:["WebFetch"]});return "ran"}catch(e){return e.message}', { runAgent: refusing, onEvent: e => events.push(e.type) }), 'refused: WebFetch');
  assert.equal(seen.length, 2);
  assert.ok(!events.includes('start') && !events.includes('admission'), 'a refused spawn is never admitted');
  assert.equal(await run('return await agent("x",{disallowedTools:["Write"]})', { runAgent: refusing }), 'ok');
  // A wrapped seam without preflight (as workflow-child.mjs wraps codexAgent): the refusal still rejects agent(),
  // is not retried as a stall and isn't returned as null.
  const cwd = await dir('wrapped');
  try {
    const failed = [];
    const wrapped = (prompt, opts) => codexAgent(prompt, { ...opts, cwd, clientOptions: clientOptions(cwd) });
    assert.match(await run('try{await agent("FAST",{disallowedTools:["WebFetch"]});return "ran"}catch(e){return e.message}', { runAgent: wrapped, onEvent: e => { if (e.state === 'failed') failed.push(e.error); } }), /can't remove WebFetch/);
    assert.equal(starts(cwd).length, 0);
    assert.equal(failed.length, 1);
  } finally { await shutdownClient(); }
  // Order and duplicates don't change the resume identity (Claude sorts and de-duplicates before hashing).
  const a = new Journal(path.join(await dir('journal-a'), 'j.jsonl')), b = new Journal(path.join(await dir('journal-b'), 'j.jsonl'));
  assert.equal(a.nextKey('p', { disallowedTools: normalizeToolOptions({ disallowedTools: ['Write', 'Bash'] }).disallowedTools }),
    b.nextKey('p', { disallowedTools: normalizeToolOptions({ disallowedTools: ['Bash', 'Write', 'Bash'] }).disallowedTools }));
});
