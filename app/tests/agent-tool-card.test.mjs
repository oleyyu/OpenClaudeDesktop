// OpenClaude Desktop's own agent-tool approvals (a terminal command, an outside site, a dev server, a workflow) on the
// session's in-app approval card: CodexClient.localApproval registers them with the approval ledger like a core's
// request and answers them locally (codex.cjs), and approval-card-model.mjs words them (agentToolCard).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { approvalCardModel } from '../src/approval-card-model.mjs';
import { approvalResponse } from '../electron/respond-approval.cjs';

const require = createRequire(import.meta.url);
const { CodexClient } = require('../electron/codex.cjs');

function connected() {
  const client = new CodexClient({ binary: '/nonexistent' });
  const events = [];
  client.on('event', (event) => events.push(event));
  client.connection = { approvalConnectionId: 'conn-1', approvalConnectionEpoch: 1, closed: false };
  client.approvalLedger.activate(client.connection);
  return { client, events };
}

test('localApproval: shown as a request, answered by respond() without reaching a core', async () => {
  const { client, events } = connected();
  const params = { threadId: 't1', turnId: '', itemId: 'call-1', command: 'npm run dev', codeDesktop: { agentTool: { kind: 'terminal-command' } } };
  const answer = client.localApproval('item/commandExecution/requestApproval', params);
  const request = events.find((event) => event.kind === 'request');
  assert.ok(request && request.id.startsWith('code-desktop-'));
  assert.deepEqual(request.params, params);
  const result = approvalResponse(request, { decision: 'accept' });
  client.respond(request.id, result, request.bridgeApproval);
  assert.deepEqual(await answer, { decision: 'accept' });
  assert.ok(events.some((event) => event.kind === 'resolved' && event.id === request.id), 'the card is resolved everywhere');
});

test('localApproval: a stopped turn (the signal) or a lost connection settles it with null; no connection gives undefined', async () => {
  const { client, events } = connected();
  const controller = new AbortController();
  const stopped = client.localApproval('item/commandExecution/requestApproval', { threadId: 't1', codeDesktop: { agentTool: { kind: 'preview-site', host: 'example.com' } } }, { signal: controller.signal });
  controller.abort();
  assert.equal(await stopped, null);
  assert.ok(events.some((event) => event.kind === 'resolved' && event.reason === 'cancelled'));
  const lost = client.localApproval('item/commandExecution/requestApproval', { threadId: 't1', codeDesktop: { agentTool: { kind: 'workflow' } } });
  client.approvalLedger.invalidate(client.connection, 'disconnected');
  assert.equal(await lost, null);
  const idle = new CodexClient({ binary: '/nonexistent' });
  assert.equal(await idle.localApproval('item/commandExecution/requestApproval', { threadId: 't1' }), undefined);
});

test('agentToolCard: the terminal, preview and workflow cards read as Claude’s, never a raw command card', () => {
  const card = (agentTool, extra = {}) => approvalCardModel({ method: 'item/commandExecution/requestApproval', params: { threadId: 't', cwd: '/w', ...extra, codeDesktop: { agentTool } } }, null);
  const terminal = card({ kind: 'terminal-command', tabTitle: 'dev' }, { command: 'npm run dev' });
  assert.equal(terminal.heading.action, 'run a command in your terminal');
  assert.equal(terminal.detail.text, 'npm run dev');
  assert.deepEqual(terminal.context.map((part) => part.text), ['In /w, in a tab named dev']);
  assert.deepEqual(terminal.allows.map((action) => action.key), ['accept'], 'no session grant for a command typed into the terminal');
  const site = card({ kind: 'preview-site', host: 'example.com', url: 'https://example.com/a' });
  assert.equal(site.heading.action, 'use example.com in the preview');
  const server = card({ kind: 'preview-server', name: 'web', port: 3000, portMayReassign: false }, { command: 'npm run dev' });
  // 2.42304.0 c96d752d0 Kk preview_start: "start" + the name as meta, and wA's line from the port main passes on.
  assert.deepEqual([server.heading.action, server.heading.meta, server.detail.text], ['start', 'web', 'npm run dev']);
  assert.deepEqual(server.context.map((part) => part.text), ['Runs in /w on port 3000']);
  // An approved site or server stays approved for the session (preview-service.cjs), and the button says so.
  assert.deepEqual([site.allows.map((action) => action.label), server.allows.map((action) => action.label)], [['Allow for this session'], ['Allow for this session']]);
  const workflow = card({ kind: 'workflow', name: 'review', description: 'Review the diff', phases: [{ title: 'Scan' }, { title: 'Fix' }], always: true });
  assert.deepEqual([workflow.heading.action, workflow.heading.meta], ['run a dynamic workflow', 'review']);
  assert.match(workflow.detail.text, /1\. Scan\n2\. Fix/);
  assert.match(workflow.reason, /Tasks pane/);
  assert.deepEqual(workflow.allows.map((action) => [action.key, action.label]), [['acceptForSession', 'Yes, and don’t ask again for review'], ['accept', 'Yes, run it']]);
  assert.equal(workflow.deny.label, 'No');
  const inline = card({ kind: 'workflow', name: 'one-off', always: false });
  assert.deepEqual(inline.allows.map((action) => action.key), ['accept'], 'an inline script is never remembered');
  // The script itself: shown outright without meta phases, behind "View raw script" with them (Claude's dialog).
  const bare = card({ kind: 'workflow', name: 'one-off', description: 'Do it', script: 'export const meta={name:"one-off",description:"Do it"};\nreturn await agent("go")' });
  assert.deepEqual([bare.detail.kind, bare.detail.scriptOpen, bare.detail.text], ['workflow', true, 'Do it']);
  assert.match(bare.detail.script, /agent\("go"\)/);
  const phased = card({ kind: 'workflow', name: 'review', phases: [{ title: 'Scan' }], script: 'x', scriptTruncated: true });
  assert.deepEqual([phased.detail.scriptOpen, phased.detail.scriptTruncated], [false, true]);
});

test('main.cjs agentToolCard passes the dev server’s launch.json port and portMayReassign to the card', async () => {
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const line = main.split('\n').find((text) => text.includes('if (kind === "preview-server") { const env = launchEnvSummary(request.env);'));
  assert.ok(line, 'the preview-server branch of agentToolCard');
  // A positive integer port only (preview-launch normalizes "port"); the reassign flag is a strict boolean.
  assert.ok(line.includes('...(Number.isInteger(request.port) && request.port > 0 ? { port: request.port } : {})'), line);
  assert.ok(line.includes('portMayReassign: request.portMayReassign === true'), line);
  // The card model reads exactly those two fields.
  const model = approvalCardModel({ method: 'item/commandExecution/requestApproval', params: { threadId: 't', cwd: '/w', command: 'npm run dev', codeDesktop: { agentTool: { kind: 'preview-server', name: 'web', port: 8080, portMayReassign: false } } } }, null);
  assert.deepEqual(model.context.map((part) => [part.key, part.text]), [['description', 'Runs in /w on port 8080']]);
});
