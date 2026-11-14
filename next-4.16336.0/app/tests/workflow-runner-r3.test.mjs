// Workflow runner round-3 fixes: Claude Code 2.1.280's workflow-subagent instructions, agent() failure semantics
// (configuration errors and stalls throw), agentType lookup by `name:` with its `tools:` allowlist, and Claude model
// aliases on a custom Codex endpoint. Fixture app-servers only, with a fresh HOME/XDG/CODEX_HOME/TMPDIR sandbox.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BASE = fsSync.existsSync('/private/tmp/claude-501') ? '/private/tmp/claude-501' : os.tmpdir();
const SANDBOX = await fs.realpath(await fs.mkdtemp(path.join(BASE, 'wf-runner-r3-')));
for (const [key, name] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'xdg-config'], ['XDG_DATA_HOME', 'xdg-data'], ['XDG_CACHE_HOME', 'xdg-cache'], ['XDG_STATE_HOME', 'xdg-state'], ['CODEX_HOME', 'codex-home'], ['TMPDIR', 'tmp']]) {
  process.env[key] = path.join(SANDBOX, name);
  await fs.mkdir(process.env[key], { recursive: true });
}
test.after(() => fs.rm(SANDBOX, { recursive: true, force: true }));

const R = '../third-party/codex-workflows-runner/src/';
const { codexAgent, shutdownClient, AgentConfigError } = await import(R + 'codexAgent.js');
const { runWorkflowSource } = await import(R + 'runWorkflow.js');
const { loadAgentType, listAgentTypes, parseFrontmatter } = await import(R + 'agentTypes.js');
const { WORKFLOW_SUBAGENT_PROMPT, WORKFLOW_SUBAGENT_NOTE, WORKFLOW_STRUCTURED_PROMPT, WORKFLOW_JSON_PROMPT, workflowAgentInstructions } = await import(R + 'subagentPrompt.js');
const { resolveModel } = await import(R + 'modelMap.js');
const { allowlistExclusions, narrowThreadParams } = await import(R + 'toolNarrowing.js');

const FIXTURE = path.resolve(import.meta.dirname, 'fixtures/workflow-runner-server.cjs');
const header = 'export const meta={name:"r3",description:"Runner round 3"};\n';
const run = (body, options) => runWorkflowSource(header + body, options);
const dir = async name => fs.realpath(await fs.mkdtemp(path.join(SANDBOX, name + '-')));
const clientOptions = cwd => ({ command: process.execPath, args: [FIXTURE], cwd });
const starts = cwd => { try { return fsSync.readFileSync(path.join(cwd, 'workflow-wire.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(q => q.method === 'thread/start').map(q => q.params); } catch { return []; } };
const write = async (file, text) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); };

test('every workflow agent gets Claude\'s workflow-subagent instructions', async () => {
  assert.match(WORKFLOW_SUBAGENT_PROMPT, /^You are a subagent spawned by a workflow orchestration script\./);
  assert.match(WORKFLOW_SUBAGENT_PROMPT, /returned \*\*verbatim\*\* as a string to the calling script/);
  assert.equal(workflowAgentInstructions(undefined), WORKFLOW_SUBAGENT_PROMPT);
  assert.equal(workflowAgentInstructions('  Review.  '), 'Review.' + WORKFLOW_SUBAGENT_NOTE);
  assert.equal(workflowAgentInstructions(undefined, 'tool'), WORKFLOW_STRUCTURED_PROMPT);
  assert.match(workflowAgentInstructions('Review.', 'tool'), /^Review\.\n\n---\n\nNOTE: .*You MUST return your final answer by calling the StructuredOutput tool exactly once/s);
  assert.match(workflowAgentInstructions('Review.', 'json'), /^Review\.\n\n---\n\nNOTE: .*one JSON value/s);
  const cwd = await dir('instructions');
  await write(path.join(cwd, '.claude/agents/reviewer.md'), '---\nname: reviewer\n---\nYou review code.\n');
  try {
    assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd }), 'fixture result');
    assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, agentType: 'reviewer' }), 'fixture result');
    assert.deepEqual(await codexAgent('REPLIES:["{\\"a\\":1}"]', { clientOptions: clientOptions(cwd), cwd, structuredOutput: false, schema: { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] } }), { a: 1 });
    await assert.rejects(codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, retries: 0, schema: { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] } }), /without calling StructuredOutput/);
    const [plain, typed, json, tool] = starts(cwd);
    assert.equal(plain.developerInstructions, WORKFLOW_SUBAGENT_PROMPT);
    assert.equal(typed.developerInstructions, 'You review code.' + WORKFLOW_SUBAGENT_NOTE);
    assert.equal(json.developerInstructions, WORKFLOW_JSON_PROMPT);
    assert.equal(tool.developerInstructions, WORKFLOW_STRUCTURED_PROMPT, 'the StructuredOutput guidance is not repeated');
    assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, workflowInstructions: false }), 'fixture result');
    assert.equal(starts(cwd).at(-1).developerInstructions, undefined);
  } finally { await shutdownClient(); }
});

test('agentType resolves by frontmatter name, stops at the git root and lists the available agents', async () => {
  const outer = await dir('agents-outer'), repo = path.join(outer, 'repo'), cwd = path.join(repo, 'pkg');
  await fs.mkdir(cwd, { recursive: true });
  execFileSync('git', ['init', '-q'], { cwd: repo });
  await write(path.join(repo, '.claude/agents/review/reviewer.md'), '---\nname: code-reviewer\ndescription: "Reviews"\ntools:\n  - Read\n  - Grep # comment\n  - "Glob"\nmodel: sonnet\n---\nYou review code. Never edit files.\n');
  await write(path.join(cwd, '.claude/agents/local.md'), '---\ndescription: no name\ntools: [Read, Bash]\n---\nLocal.\n');
  await write(path.join(cwd, '.claude/agents/override.md'), '---\nname: code-reviewer\n---\nCloser wins.\n');
  await write(path.join(outer, '.claude/agents/above.md'), '---\nname: above-root\n---\nAbove the git root.\n');
  const reviewer = await loadAgentType('code-reviewer', repo);
  assert.deepEqual(reviewer, { systemPrompt: 'You review code. Never edit files.', model: 'sonnet', tools: ['Read', 'Grep', 'Glob'], source: path.join(repo, '.claude/agents/review/reviewer.md') });
  assert.equal(await loadAgentType('reviewer', repo), null, 'the file name is not the agent type when name: is set');
  assert.equal((await loadAgentType('code-reviewer', cwd)).systemPrompt, 'Closer wins.');
  assert.deepEqual((await loadAgentType('local', cwd)).tools, ['Read', 'Bash']);
  assert.equal(await loadAgentType('above-root', cwd), null);
  assert.deepEqual(await listAgentTypes(cwd), ['local', 'code-reviewer', 'general-purpose', 'Explore', 'Plan']);
  assert.deepEqual(parseFrontmatter('---\ntools: "*"\nnote: |\n  a\n  b\n---\nbody').meta, { tools: '*', note: 'a\nb' });
  await assert.rejects(codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, agentType: 'reviewer' }),
    e => e instanceof AgentConfigError && e.message === "agent({agentType}): agent type 'reviewer' not found. Available agents: local, code-reviewer, general-purpose, Explore, Plan");
  assert.equal(starts(cwd).length, 0);
});

test('an agent definition\'s tools: allowlist without write or shell tools runs read-only on every core', async () => {
  const cwd = await dir('allowlist');
  execFileSync('git', ['init', '-q'], { cwd });
  await write(path.join(cwd, '.claude/agents/reviewer.md'), '---\nname: security-reviewer\ntools: Read, Grep, Glob\n---\nRead only.\n');
  await write(path.join(cwd, '.claude/agents/builder.md'), '---\nname: builder\ntools: Read, Edit, Bash\n---\nBuild.\n');
  await write(path.join(cwd, '.claude/agents/any.md'), '---\nname: any\ntools: "*"\n---\nAnything.\n');
  try {
    for (const agentType of ['security-reviewer', 'builder', 'any']) assert.equal(await codexAgent('FAST', { clientOptions: clientOptions(cwd), cwd, sandbox: 'workspace-write', agentType }), 'fixture result');
    assert.deepEqual(starts(cwd).map(p => p.sandbox), ['read-only', 'workspace-write', 'workspace-write']);
  } finally { await shutdownClient(); }
  assert.deepEqual(allowlistExclusions(['Read', 'Grep'], 'sandbox'), { exclude: ['Bash', 'Edit', 'MultiEdit', 'NotebookEdit', 'Write'], kept: ['web search', 'MCP tools'], mcp: [] });
  assert.deepEqual(allowlistExclusions(['Read', 'Bash(git:*)', 'WebFetch', 'mcp__docs'], 'codex'), { exclude: [], kept: [], mcp: ['mcp__docs'] });
  assert.deepEqual(allowlistExclusions(['*'], 'codex'), { exclude: [], kept: [] });
  // Native Codex: web search off and only the listed MCP servers kept.
  const client = { request: async () => ({ config: { mcp_servers: { docs: {}, github: {} } } }) };
  const narrowed = await narrowThreadParams(client, { sandbox: 'workspace-write', cwd }, { toolControls: 'codex', allowedTools: ['Read', 'mcp__docs__search'] });
  assert.equal(narrowed.sandbox, 'read-only');
  assert.equal(narrowed.config.web_search, 'disabled');
  assert.equal(narrowed.config['mcp_servers.github.enabled'], false);
  assert.equal(narrowed.config['mcp_servers.docs.enabled'], undefined);
  const none = await narrowThreadParams(client, { sandbox: 'workspace-write', cwd }, { toolControls: 'codex', allowedTools: ['Read'] });
  assert.equal(none.config['mcp_servers.docs.enabled'], false);
  assert.equal(none.config['features.apps'], false);
  // A bridge core: the allowlist never refuses the spawn; what it can't remove is logged.
  const logs = [];
  const bridge = await narrowThreadParams({}, { sandbox: 'workspace-write', cwd }, { toolControls: 'sandbox', allowedTools: ['Read'], log: l => logs.push(l) });
  assert.equal(bridge.sandbox, 'read-only');
  assert.match(logs.join('\n'), /web search and MCP tools left on/);
});

test('agent(): configuration errors and stalls throw; terminal errors and skips stay null', async () => {
  const cwd = await dir('semantics');
  try {
    // Unknown agentType: refused before admission (preflight), as Claude refuses it.
    const wrapped = Object.assign((prompt, opts) => codexAgent(prompt, { ...opts, cwd, clientOptions: clientOptions(cwd) }), { preflight: opts => codexAgent.preflight({ ...opts, cwd, clientOptions: clientOptions(cwd) }) });
    const events = [];
    assert.match(await run('try{await agent("FAST",{agentType:"code-reviewer"});return "ran"}catch(e){return e.message}', { runAgent: wrapped, onEvent: e => events.push(e.type) }),
      /^agent\(\{agentType\}\): agent type 'code-reviewer' not found\. Available agents: general-purpose, Explore, Plan$/);
    assert.ok(!events.includes('start'));
    // A seam without preflight still fails the call, after an end event that marks the agent failed.
    const bare = (prompt, opts) => codexAgent(prompt, { ...opts, cwd, clientOptions: clientOptions(cwd) });
    const ends = [];
    assert.match(await run('try{await agent("FAST",{agentType:"nope"});return "ran"}catch(e){return e.message}', { runAgent: bare, onEvent: e => { if (e.type === 'end') ends.push(e); } }), /agent type 'nope' not found/);
    assert.equal(ends[0].status, 'failed');
    // isolation:'worktree' outside a git repo.
    assert.match(await run('try{await agent("FAST",{isolation:"worktree"});return "ran"}catch(e){return e.message}', { runAgent: bare }), /isolation:'worktree' requires a Git repo/);
    assert.equal(starts(cwd).length, 0);
  } finally { await shutdownClient(); }
  // Stalls: five logged restarts, then Claude's error.
  const logs = [], stallEnds = [];
  let calls = 0;
  const hang = (_prompt, opts) => { calls++; return new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('Agent turn interrupted')), { once: true })); };
  assert.equal(await run('try{await agent("WAIT",{stallMs:40,label:"slow"});return "ran"}catch(e){return e.message}', { runAgent: hang, onLog: l => logs.push(String(l)), onEvent: e => { if (e.type === 'end') stallEnds.push(e); } }),
    'agent stalled on all 6 attempts (no progress for 40ms each)');
  assert.equal(calls, 6);
  assert.deepEqual(logs.filter(l => l.startsWith('[stall]')).map(l => l.replace(/after \d+s/, 'after Ns')), [1, 2, 3, 4, 5].map(k => `[stall] agent "slow" stalled (no progress) after Ns — retrying (${k}/5)`));
  assert.equal(stallEnds[0].status, 'failed');
  assert.equal(stallEnds[0].error, 'agent stalled on all 6 attempts (no progress for 40ms each)');
  // A terminal provider error stays null and is logged as Claude logs it.
  const failing = async () => { throw new Error('turn ended with status=failed'); };
  const failLogs = [];
  assert.equal(await run('return await agent("x",{label:"api"})', { runAgent: failing, onLog: l => failLogs.push(String(l)) }), null);
  assert.ok(failLogs.includes('[api] failed: turn ended with status=failed'));
});

test('Claude model aliases inherit the session model on a custom Codex endpoint', () => {
  const catalog = ['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'];
  const logs = [];
  assert.equal(resolveModel('haiku', catalog), 'gpt-5.6-luna');
  assert.equal(resolveModel('haiku', catalog, l => logs.push(l), { customProvider: true, sessionModel: 'relay-a' }), 'relay-a');
  assert.match(logs[0], /'haiku' \(Claude\) → the session's model 'relay-a'/);
  assert.equal(resolveModel('claude-sonnet-4-6', catalog, () => {}, { customProvider: true }), undefined);
  assert.equal(resolveModel('sonnet', catalog, () => {}, { sessionModel: 'relay-a' }), undefined, 'a session model the catalog lacks: the config default');
  assert.equal(resolveModel('opus', catalog, () => {}, { sessionModel: 'gpt-5.6-terra' }), 'gpt-5.6-sol', 'a catalog session model keeps the mapping');
  assert.equal(resolveModel('relay-b', catalog, () => {}, { customProvider: true }), 'relay-b');
  assert.equal(resolveModel('relay-b', catalog, () => {}), undefined);
});
