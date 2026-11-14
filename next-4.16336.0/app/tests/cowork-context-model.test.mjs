import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CONTEXT_OPERATIONS, NON_RESOURCE_OPERATIONS, coworkContextData, coworkContextEvents, isContextEvent, isMemoryPath, mcpCallOfItem }
  from '../src/cowork-context-model.mjs';

// w13-coworkui-context: the Context section's data (src/cowork-context-model.mjs) against the 3.6556.2 rules it follows —
// ccba96ec3's resource activity shapes, AT's Context filter (mr) and its lT / uT sets, shared-6 nw / iw (memory files),
// xw / bw (documents plugins). The official chunks are read as text, never executed.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const cwd = '/Users/me/Work';

test('the official sets and patterns the model copies', () => {
  const panel = official('c21f11e6d-Cyd8_HO8.js');
  const lt = /(\w+)=new Set\(\["mcp_tool","cli_tool","web_search","web_fetch","skill_invoked","command_invoked","memory"\]\)/.exec(panel);
  assert.ok(lt, 'AT lT');
  assert.deepEqual(CONTEXT_OPERATIONS, ['mcp_tool', 'cli_tool', 'web_search', 'web_fetch', 'skill_invoked', 'command_invoked', 'memory']);
  assert.ok(panel.includes('new Set(["device_commit","project_file"])'), 'AT uT');
  assert.deepEqual(NON_RESOURCE_OPERATIONS, ['device_commit', 'project_file']);
  assert.ok(panel.includes('bw=new Set(["documents","documents-mcp","clarkdown","clarkdown-mcp"])'));
  assert.ok(panel.includes('e.mcpServerUuid==="plugin:documents:Documents"'));
  const shared6 = official('shared-6-sd9jbJqs.js');
  assert.ok(shared6.includes('nw=[/\\/mnt\\/\\.auto-memory(\\/|$)/,/^\\/mnt\\/memory(\\/|$)/,/^\\/tmp\\/claude\\/memory(\\/|$)/,/\\/\\.claude\\/agent-memory(?:-local)?(\\/|$)/,'));
  assert.ok(shared6.includes('return n==="memory.md"||n==="claude.md"?!1:rw(t)'));
  // shared-130 oU: a path outside the Cowork VM mounts falls through to "working" (so local files are not Context).
  assert.ok(official('shared-130-dWztbTO1.js').includes('function _H(e){let t=UV(e);for(let{category:e,pathMatchers:n}of gH)for(let r of n)if(r(t))return e;return"working"}'));
  // ccba96ec3: the event shapes (mcp fallback by name, Skill, web search) and Bash only for plugin CLIs.
  const producer = official('ccba96ec3-BOycIJQ9.js');
  for (const s of ['operation:"mcp_tool",timestamp:t.receivedStreamAt,mcpServerUuid:v,mcpToolName:r,mcpToolDisplayName:r,mcpServer:{name:ee,uuid:v,iconType:"external"}',
    'filePath:`skill://${r}`,fileName:i,operation:"skill_invoked",skillName:r,pluginName:a?xe(r):void 0', 'operation:"web_search"',
    'if(i==="Bash"&&n?.size)'])
    assert.ok(producer.includes(s), s);
});

test('events: external MCP calls, the Skill tool, web search / fetch, memory files; own servers and plain files skipped', () => {
  const items = [
    { id: 'm1', type: 'mcpToolCall', server: 'github', tool: 'search_issues', status: 'completed', arguments: '{"q":"x"}', result: { content: [{ type: 'text', text: 'ok' }] } },
    { id: 'm2', type: 'dynamicToolCall', tool: 'mcp__linear__list_issues', status: 'failed', error: 'nope' },
    { id: 'own', type: 'mcpToolCall', server: 'code_desktop', tool: 'chrome_navigate' },
    { id: 'viz', type: 'mcpToolCall', server: 'visualize', tool: 'show_widget' },
    { id: 's1', type: 'dynamicToolCall', tool: 'skill', arguments: { name: 'anthropic-skills:pdf' } },
    { id: 'w1', type: 'webSearch', query: 'release notes', action: { type: 'search', query: 'release notes' } },
    { id: 'w2', type: 'webSearch', action: { type: 'openPage', url: 'https://example.com/a' } },
    { id: 'r1', type: 'commandExecution', commandActions: [{ type: 'read', path: '/Users/me/.claude/agent-memory/notes.md' }] },
    { id: 'r2', type: 'commandExecution', commandActions: [{ type: 'read', path: 'src/a.js' }] },
    { id: 'c1', type: 'commandExecution', command: 'ls' },
    { id: 'f1', type: 'fileChange', status: 'completed', changes: [{ path: 'out.md', kind: { type: 'add' } }] },
  ];
  const events = coworkContextEvents(items, { cwd });
  assert.deepEqual(events.map(e => `${e.operation}:${e.filePath}`), [
    'mcp_tool:mcp://github/search_issues', 'mcp_tool:mcp://linear/list_issues', 'skill_invoked:skill://anthropic-skills:pdf',
    'web_search:web_search://w1', 'web_fetch:web_fetch://w2', 'memory:/Users/me/.claude/agent-memory/notes.md']);
  assert.deepEqual(events[0].mcpServer, { name: 'github', uuid: 'github', iconType: 'external' });
  assert.equal(events[0].mcpToolWireName, 'mcp__github__search_issues');
  assert.deepEqual(events[0].mcpToolInput, { q: 'x' });
  assert.equal(events[1].mcpToolResult.isError, true);
  assert.equal(events[2].fileName, 'pdf');
  assert.equal(events[2].pluginName, 'anthropic-skills');
  assert.equal(events[3].searchQuery, 'release notes');
  assert.equal(events[4].host, 'example.com');
  assert.equal(events[5].fileOperation, 'read');
  assert.deepEqual(mcpCallOfItem({ type: 'dynamicToolCall', tool: 'skill' }), null);
  assert.equal(isMemoryPath('/Users/me/.claude/agent-memory/MEMORY.md'), false, 'index files are not memory (iw)');
  assert.equal(isMemoryPath('/tmp/claude/memory/a.md'), true);
});

test('AT mr: lT operations always; documents plugins and server out; plain local files never', () => {
  const folders = [cwd];
  assert.equal(isContextEvent({ operation: 'mcp_tool', mcpServerUuid: 'github' }, folders), true);
  assert.equal(isContextEvent({ operation: 'mcp_tool', mcpServerUuid: 'plugin:documents:Documents' }, folders), false);
  assert.equal(isContextEvent({ operation: 'skill_invoked', pluginName: 'Documents' }, folders), false);
  assert.equal(isContextEvent({ operation: 'device_commit' }, folders), false);
  assert.equal(isContextEvent({ operation: 'read', filePath: '/etc/hosts' }, folders), false);
  assert.equal(isContextEvent({ operation: 'read', filePath: `${cwd}/a.md` }, folders), false);
});

test('section data: a local session (not remote, no projects / uploads / lead rows / browser); card content follows activity', () => {
  const empty = coworkContextData({ cwd, sessionId: 's1', items: [] });
  assert.equal(empty.hasContextActivity, false);
  assert.equal(empty.hasContextCardContent, false);
  assert.equal(empty.groupContextByKind, false);
  assert.equal(empty.isRemote, false);
  assert.deepEqual(empty.userSelectedFolders, [cwd]);
  assert.equal(empty.contextLeadRows, undefined);
  const busy = coworkContextData({ cwd, sessionId: 's1', items: [{ id: 'm', type: 'mcpToolCall', server: 'github', tool: 't' }] });
  assert.equal(busy.hasContextActivity, true);
  assert.equal(busy.hasContextCardContent, true);
  assert.equal(busy.contextResourceActivity.length, 1);
  assert.deepEqual(coworkContextData({ items: [] }).userSelectedFolders, []);
});
