// The host's engine items as the SDK tool calls the 2.42304.0 tool rows read (src/transcript-sdk-tools.mjs): one row of the
// mapping table per case, the status flags of c06cf64bb qc / Bc, and the edit sidecar c254f7f8c reads its counts from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sdkToolName, sdkToolInput, sdkToolStatus, sdkTools, sdkToolRun, sdkToolOf, structuredPatch, DYNAMIC_TOOLS, APP_TOOLS } from '../src/transcript-sdk-tools.mjs';

const cmd = (extra = {}) => ({ id: 'c', type: 'commandExecution', command: 'ls -la', status: 'completed', aggregatedOutput: 'ok', ...extra });

test('engine item types map to the official SDK tool names', () => {
  const cases = [
    [cmd(), 'Bash'],
    [cmd({ commandActions: [{ type: 'read', path: '/w/a.js', name: 'a.js' }] }), 'Read'],
    [cmd({ commandActions: [{ type: 'search', query: 'foo', path: '/w' }] }), 'Grep'],
    [cmd({ commandActions: [{ type: 'search', query: '*.js', tool: 'glob' }] }), 'Glob'],
    [cmd({ commandActions: [{ type: 'listFiles', path: '/w' }] }), 'LS'],
    [{ type: 'fileChange', changes: [{ path: 'a', kind: { type: 'update' }, diff: '' }] }, 'Edit'],
    [{ type: 'fileChange', changes: [{ path: 'a', kind: { type: 'add' }, diff: 'x' }] }, 'Write'],
    [{ type: 'fileChange', changes: [{ path: 'a', kind: 'delete', diff: 'x' }] }, 'Edit'],
    [{ type: 'webSearch', query: 'q', action: { type: 'search', query: 'q' } }, 'WebSearch'],
    [{ type: 'webSearch', action: { type: 'openPage', url: 'https://a.b' } }, 'WebFetch'],
    [{ type: 'webSearch', action: { type: 'findInPage', url: 'https://a.b', pattern: 'x' } }, 'WebFetch'],
    [{ type: 'imageView', path: '/w/a.png' }, 'Read'],
    [{ type: 'collabAgentToolCall', tool: 'spawnAgent', prompt: 'p' }, 'Task'],
    [{ type: 'collabAgentToolCall', tool: 'sendInput' }, 'SendMessage'],
    [{ type: 'collabAgentToolCall', tool: 'wait' }, 'TaskOutput'],
    [{ type: 'collabAgentToolCall', tool: 'closeAgent' }, 'TaskStop'],
    [{ type: 'mcpToolCall', server: 'github', tool: 'list_issues' }, 'mcp__github__list_issues'],
    [{ type: 'mcpToolCall', server: 'My Server', tool: 'go' }, 'mcp__My_Server__go'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget' }, 'mcp__visualize__show_widget'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'update_plan' }, 'mcp__ccd_turn__update_plan'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'mark_chapter' }, 'mcp__ccd_session__mark_chapter'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'run_in_terminal' }, 'mcp__terminal__run_in_terminal'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'reveal_path' }, 'mcp__ccd_host__reveal_path'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'preview_start' }, 'mcp__code_desktop__preview_start'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'Workflow' }, 'Workflow'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'code_desktop_AskUserQuestion' }, 'AskUserQuestion'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'mcp__code_desktop__wrap_up' }, 'mcp__ccd_turn__wrap_up'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'mcp__linear__get_issue' }, 'mcp__linear__get_issue'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'todo_write' }, 'TodoWrite'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'todowrite' }, 'TodoWrite'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'skill' }, 'Skill'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'exit_plan_mode' }, 'ExitPlanMode'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'plan_exit' }, 'ExitPlanMode'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'ask_user_question' }, 'AskUserQuestion'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'job_output' }, 'TaskOutput'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'job_list' }, 'TaskList'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'job_kill' }, 'TaskStop'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'run_code' }, 'Bash'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'EnterWorktree' }, 'EnterWorktree'],
    [{ type: 'dynamicToolCall', namespace: null, tool: 'some_core_tool' }, 'some_core_tool'],
    [{ type: 'dynamicToolCall', namespace: 'codex', tool: 'apply' }, 'apply'],
    [{ type: 'computerUse', action: { type: 'click' } }, 'mcp__computer-use__click'],
    [{ type: 'imageGeneration' }, 'imageGeneration'],
  ];
  for (const [item, name] of cases) assert.equal(sdkToolName(item), name, JSON.stringify(item));
  assert.equal(sdkToolName({ type: 'agentMessage' }), null);
  assert.equal(sdkToolName({ type: 'reasoning' }), null);
  assert.equal(sdkToolName(null), null);
  // Every table value is an official name (bare CLI tool or mcp__server__tool).
  for (const name of [...Object.values(DYNAMIC_TOOLS), ...Object.values(APP_TOOLS)]) assert.match(name, /^(?:[A-Z][A-Za-z]+|mcp__[a-z_]+__[a-z_]+)$/, name);
});

test('inputs carry what the rows read (file_path, command, pattern, url, query, skill)', () => {
  assert.deepEqual(sdkToolInput(cmd({ description: 'List' })), { command: 'ls -la', description: 'List' });
  assert.deepEqual(sdkToolInput(cmd({ commandActions: [{ type: 'read', path: '/w/a.js', name: 'a.js' }] })), { file_path: '/w/a.js' });
  assert.deepEqual(sdkToolInput(cmd({ commandActions: [{ type: 'search', query: 'foo', path: '/w' }] })), { pattern: 'foo', path: '/w' });
  assert.deepEqual(sdkToolInput({ type: 'webSearch', action: { type: 'openPage', url: 'https://a.b' } }), { url: 'https://a.b' });
  assert.deepEqual(sdkToolInput({ type: 'webSearch', query: 'q', action: { type: 'search' } }), { query: 'q' });
  assert.deepEqual(sdkToolInput({ type: 'dynamicToolCall', namespace: null, tool: 'skill', arguments: { name: 'pdf' } }), { name: 'pdf', skill: 'pdf' });
  assert.deepEqual(sdkToolInput({ type: 'dynamicToolCall', namespace: null, tool: 'run_code', arguments: { code: 'x()' } }), { code: 'x()', command: 'x()' });
  assert.deepEqual(sdkToolInput({ type: 'mcpToolCall', server: 's', tool: 't', arguments: '{"a":1}' }), { a: 1 });
  assert.deepEqual(sdkToolOf(cmd()), { name: 'Bash', input: { command: 'ls -la' } });
});

test('status and Bc flags', () => {
  assert.deepEqual(sdkToolStatus({ status: 'inProgress' }), { status: 'running' });
  assert.deepEqual(sdkToolStatus({ status: 'inProgress' }, true), { status: 'awaiting_approval' });
  assert.deepEqual(sdkToolStatus({ status: 'completed' }), { status: 'completed', isError: false });
  assert.deepEqual(sdkToolStatus({ status: 'failed' }), { status: 'error', isError: true });
  assert.deepEqual(sdkToolStatus({ status: 'interrupted' }), { status: 'error', isError: true, interrupted: true });
  assert.deepEqual(sdkToolStatus({ status: 'declined' }), { status: 'error', isError: true, rejected: true });
  assert.deepEqual(sdkToolStatus({ type: 'dynamicToolCall', status: 'completed', success: false }), { status: 'error', isError: true });
  const [running] = sdkTools(cmd({ status: 'inProgress', aggregatedOutput: null }));
  assert.equal(running.output, undefined);
  const [done] = sdkTools(cmd());
  assert.equal(done.output, 'ok');
  assert.deepEqual(done.toolUseResult, { stdout: 'ok', stderr: '', interrupted: false });
  const [mcp] = sdkTools({ id: 'm', type: 'mcpToolCall', server: 's', tool: 't', status: 'completed',
    result: { content: [{ type: 'text', text: 'hi' }, { type: 'image', mimeType: 'image/png', data: 'AAAA' }] } });
  assert.equal(mcp.output, 'hi');
  assert.deepEqual(mcp.outputImages, [{ mimeType: 'image/png', data: 'AAAA' }]);
  assert.equal(mcp.rawResultContent.length, 2);
});

test('a fileChange is one Edit / Write per file with the CLI sidecar (structuredPatch) for the diff counts', () => {
  const item = { id: 'f', type: 'fileChange', status: 'completed', changes: [
    { path: '/w/a.js', kind: { type: 'update' }, diff: '@@ -1,2 +1,3 @@\n a\n-b\n+c\n+d\n' },
    { path: '/w/b.js', kind: { type: 'add' }, diff: 'one\ntwo\n' },
  ] };
  const [edit, write] = sdkTools(item);
  assert.equal(edit.id, 'f'); assert.equal(write.id, 'f#1');
  assert.equal(edit.name, 'Edit');
  assert.deepEqual(edit.input, { file_path: '/w/a.js', old_string: 'a\nb', new_string: 'a\nc\nd' });
  assert.deepEqual(edit.toolUseResult.structuredPatch, [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 3, lines: [' a', '-b', '+c', '+d'] }]);
  assert.equal(edit.toolUseResult.oldString, edit.input.old_string);
  assert.equal(write.name, 'Write');
  assert.deepEqual(write.input, { file_path: '/w/b.js', content: 'one\ntwo\n' });
  assert.deepEqual(write.hostItem.changes, [item.changes[1]]);
  assert.equal(edit.hostItem.changes.length, 1);
  // A running edit has no result yet: no sidecar.
  assert.equal(sdkTools({ ...item, status: 'inProgress' })[0].toolUseResult, undefined);
  assert.deepEqual(structuredPatch('--- a\n+++ b\n@@ -3 +3 @@\n-x\n+y').hunks, [{ oldStart: 3, oldLines: 1, newStart: 3, newLines: 1, lines: ['-x', '+y'] }]);
});

test('a run flattens coalesced reads and marks the awaited calls', () => {
  const a = cmd({ id: 'a', commandActions: [{ type: 'read', path: '/w/a.js' }] }), b = cmd({ id: 'b', status: 'inProgress', aggregatedOutput: null });
  const tools = sdkToolRun([{ ...a, fileRun: [a, { ...a, id: 'a2' }] }, b, { type: 'agentMessage', id: 'x' }], { awaitingIds: new Set(['b']) });
  assert.deepEqual(tools.map(tool => [tool.id, tool.name, tool.status]), [['a', 'Read', 'completed'], ['a2', 'Read', 'completed'], ['b', 'Bash', 'awaiting_approval']]);
});
