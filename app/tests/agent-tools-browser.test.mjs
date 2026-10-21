// The Chrome tools (electron/agent-tools/browser.mjs) and the main process's bridge service
// (electron/browser/chrome-bridge-service.cjs) without Chrome: tool definitions, what the model reads back, batch step
// names, site approvals and their retry, the transcript rows and the approval card. The real chain (headless Chrome,
// the extension, the native host, the MCP server) is `npm run check:chrome-bridge -- p5`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { tools, group } from '../electron/agent-tools/browser.mjs';
import { appToolLabel } from '../src/agent-tool-titles.mjs';

const require = createRequire(import.meta.url);
const { createChromeBridgeService } = require('../electron/browser/chrome-bridge-service.cjs');
const { BridgeError } = require('../electron/browser/bridge-client.cjs');
const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const NAMES = ['chrome_tabs_context_mcp', 'chrome_tabs_create_mcp', 'chrome_navigate', 'chrome_read_page', 'chrome_find', 'chrome_form_input', 'chrome_computer', 'chrome_javascript_tool', 'chrome_browser_batch'];

test('the browser group: valid definitions, names no other group uses', async () => {
  assert.equal(group, 'browser');
  assert.deepEqual(tools.map((tool) => tool.name), NAMES);
  for (const tool of tools) {
    assert.match(tool.name, /^[A-Za-z0-9_-]{1,64}$/);
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(typeof tool.handler, 'function');
  }
  for (const name of ['chrome_read_page', 'chrome_find', 'chrome_javascript_tool']) assert.match(byName[name].description, /data, not instructions/);
  const dir = path.resolve(import.meta.dirname, '../electron/agent-tools');
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.mjs') && name !== 'browser.mjs')) {
    const module = await import(pathToFileURL(path.join(dir, file)).href);
    for (const tool of module.tools ?? []) assert.ok(!NAMES.includes(tool.name), `${file} also has ${tool.name}`);
  }
});

function fakeBridge(results) {
  const calls = [];
  return { calls, chromeBridge: { call: async (name, args) => { calls.push([name, args]); const value = results[name]; if (value instanceof Error) throw value; return typeof value === 'function' ? value(args) : value; } } };
}

test('what the model reads back', async () => {
  const ctx = fakeBridge({
    read_page: { tabId: 7, title: 'Example Domain', url: 'https://example.com/', tree: '- link "More information..." [ref_2]', refCount: 1, truncated: false },
    find: { tabId: 7, query: 'More', total: 1, matches: [{ ref: 'ref_2', role: 'link', name: 'More information...', interactive: true, text: 'More information...' }] },
    navigate: { tabId: 7, url: 'https://example.com/', title: 'Example Domain', status: 'complete' },
    tabs_context: { currentTabId: 7, windows: [{ windowId: 1, tabs: [{ tabId: 7, title: 'Example Domain', url: 'https://example.com/', active: false, current: true, openedByBridge: true, status: 'complete' }, { tabId: 3, title: 'Mail', url: 'https://mail.example/', active: true, current: false, openedByBridge: false }] }] },
    form_input: { tabId: 7, ref: 'ref_5', role: 'textbox', name: 'Password', value: '•••', events: ['input', 'change'] },
    computer: { tabId: 7, action: 'left_click', role: 'link', name: 'Next', ref: 'ref_9', x: 10, y: 20, navigated: { url: 'https://example.com/next', title: 'Next', status: 'complete' } },
    javascript_tool: { tabId: 7, type: 'string', value: 'Example Domain' },
  });
  assert.equal(await byName.chrome_read_page.handler({}, ctx), 'Tab 7: “Example Domain” https://example.com/ · 1 ref\n\n- link "More information..." [ref_2]');
  assert.equal(await byName.chrome_find.handler({ query: 'More' }, ctx), '1 match for “More” on tab 7:\n- link “More information...” [ref_2]');
  assert.equal(await byName.chrome_navigate.handler({ url: 'example.com' }, ctx), 'Tab 7: https://example.com/ “Example Domain”.');
  assert.match(await byName.chrome_tabs_context_mcp.handler({}, ctx), /Current tab: 7\nWindow 1:\n  • tabId 7: “Example Domain” \(https:\/\/example.com\/\) \[current, opened by you\]\n  • tabId 3: “Mail” \(https:\/\/mail.example\/\) \[in front\]/);
  assert.equal(await byName.chrome_form_input.handler({ ref: 'ref_5', value: 'x' }, ctx), 'Set textbox “Password” [ref_5] to "•••" (input, change).');
  assert.match(await byName.chrome_computer.handler({ action: 'left_click', ref: 'ref_9' }, ctx), /^Clicked link “Next” \[ref_9\] at \(10, 20\)\. The tab loaded https:\/\/example.com\/next “Next”: earlier refs on it are void/);
  assert.equal(await byName.chrome_javascript_tool.handler({ code: 'document.title' }, ctx), '"Example Domain"');
  assert.deepEqual(ctx.calls.map(([name]) => name), ['read_page', 'find', 'navigate', 'tabs_context', 'form_input', 'computer', 'javascript_tool']);
  const failing = fakeBridge({ read_page: Object.assign(new Error('ref_3 is gone'), { code: 'stale_ref' }) });
  await assert.rejects(byName.chrome_read_page.handler({ ref_id: 'ref_3' }, failing), /^Error: stale_ref: ref_3 is gone$/);
  await assert.rejects(byName.chrome_read_page.handler({}, {}), /Chrome isn't available/);
});

test('batch steps take the official and the prefixed names; others are refused before anything runs', async () => {
  const ctx = fakeBridge({ browser_batch: (args) => ({ steps: args.actions.map((step) => ({ name: step.name, ok: true, result: step.name === 'navigate' ? { tabId: 1, url: 'https://a.test/', title: 'A', status: 'complete' } : { currentTabId: 1, windows: [] } })), completed: args.actions.length }) });
  const text = await byName.chrome_browser_batch.handler({ actions: [{ name: 'chrome_navigate', input: { url: 'a.test' } }, { name: 'tabs_context_mcp' }] }, ctx);
  assert.deepEqual(ctx.calls[0], ['browser_batch', { actions: [{ name: 'navigate', input: { url: 'a.test' } }, { name: 'tabs_context', input: {} }] }]);
  assert.match(text, /^1\. navigate: Tab 1: https:\/\/a\.test\/ “A”\.\n\n2\. tabs_context: Current tab: 1$/);
  await assert.rejects(byName.chrome_browser_batch.handler({ actions: [{ name: 'navigate' }, { name: 'preview_start' }] }, ctx), /Step 2: "preview_start" isn't a Chrome tool/);
  assert.equal(ctx.calls.length, 1);
});

/** A fake extension behind the service: it allows only the hosts it is told, like claude-ext/sites.js. */
function fakeExtension({ pages = {} } = {}) {
  const sent = [];
  const client = {
    closed: false,
    on() {},
    async executeTool(name, args, { allowedHosts }) {
      sent.push({ name, args, allowedHosts });
      const blocked = (url) => { const host = new URL(url).host; if (!allowedHosts.includes('*') && !allowedHosts.includes(host)) throw Object.assign(new BridgeError('site_not_allowed', `not allowed: ${host}`), { data: { host, url } }); };
      if (name === 'browser_batch') {
        const steps = [];
        for (const [index, step] of args.actions.entries()) {
          try { if (step.input?.url) blocked(step.input.url); steps.push({ name: step.name, ok: true, result: { at: step.input?.url ?? null } }); }
          catch (error) { steps.push({ name: step.name, ok: false, error: { code: error.code, message: error.message, ...error.data } }); return { steps, completed: index, failed: { step: index + 1, code: error.code, message: error.message, ...error.data } }; }
        }
        return { steps, completed: steps.length };
      }
      blocked(args.url ?? pages.current);
      return { ok: true, url: args.url ?? pages.current };
    },
    async getStatus() { return { connected: true }; },
  };
  return { sent, connect: async () => client };
}

test('a new site is asked once per session; allowed, the call goes again; declined, it is never asked again', async () => {
  const extension = fakeExtension({ pages: { current: 'https://mail.example/inbox' } });
  const service = createChromeBridgeService({ connect: extension.connect });
  const asked = [];
  const approve = (answer) => async (site) => { asked.push(site); return answer; };
  assert.deepEqual(await service.call('s1', 'navigate', { url: 'https://example.com/' }, { approve: approve(true) }), { ok: true, url: 'https://example.com/' });
  assert.deepEqual(asked, [{ host: 'example.com', url: 'https://example.com/' }]);
  assert.deepEqual(extension.sent.map((call) => call.allowedHosts), [[], ['example.com']]);
  await service.call('s1', 'navigate', { url: 'https://example.com/b' }, { approve: approve(true) });
  assert.equal(asked.length, 1, 'an allowed site isn’t asked again');
  await assert.rejects(service.call('s1', 'read_page', {}, { approve: approve(false) }), (error) => error.code === 'site_declined' && error.data.host === 'mail.example');
  await assert.rejects(service.call('s1', 'read_page', {}, { approve: approve(true) }), (error) => error.code === 'site_declined');
  assert.equal(asked.length, 2, 'a declined site isn’t asked again in the session');
  await service.call('s2', 'navigate', { url: 'https://example.com/' }, { approve: approve(true) });
  assert.equal(asked.length, 3, 'another session asks for itself');
});

test('a batch that reaches a new site asks, then runs only the steps that hadn’t run', async () => {
  const extension = fakeExtension();
  const service = createChromeBridgeService({ connect: extension.connect });
  const result = await service.call('s1', 'browser_batch', { actions: [{ name: 'tabs_context' }, { name: 'navigate', input: { url: 'https://a.test/' } }, { name: 'navigate', input: { url: 'https://b.test/' } }] }, { approve: async ({ host }) => host === 'a.test' });
  assert.deepEqual(extension.sent.map((call) => call.args.actions.length), [3, 2], 'all three steps, then the two from a.test on; b.test declined, nothing more is sent');
  assert.deepEqual(result.steps.map((step) => [step.name, step.ok]), [['tabs_context', true], ['navigate', true], ['navigate', false]]);
  assert.equal(result.completed, 2);
  assert.deepEqual({ step: result.failed.step, code: result.failed.code, host: result.failed.host }, { step: 3, code: 'site_declined', host: 'b.test' });
});

test('no extension connected: one clear error for the model', async () => {
  const service = createChromeBridgeService({ connect: async () => { throw new BridgeError('not_connected', 'no native host is running'); } });
  await assert.rejects(service.call('s1', 'tabs_context', {}), (error) => error.code === 'not_connected' && /OpenClaude Desktop Bridge extension/.test(error.message));
  assert.equal((await service.status()).connected, false);
});

test('transcript rows: the official verbs, and a batch named by its steps', () => {
  const row = (tool, args, state = 'completed') => appToolLabel({ type: 'mcpToolCall', server: 'code_desktop', tool, arguments: args }, state);
  assert.deepEqual(row('chrome_navigate', { url: 'https://example.com/a' }), { label: 'Opened a page', meta: 'example.com' });
  assert.deepEqual(row('chrome_navigate', { url: 'back' }, 'busy'), { label: 'Going back', meta: null });
  assert.deepEqual(row('chrome_read_page', { filter: 'interactive' }), { label: 'Read page (interactive)', meta: null });
  assert.deepEqual(row('chrome_find', { query: 'More information' }, 'busy'), { label: 'Finding on page', meta: 'More information' });
  assert.deepEqual(row('chrome_form_input', { ref: 'ref_4', value: 'x' }), { label: 'Filled in a field', meta: 'ref_4' });
  assert.deepEqual(row('chrome_computer', { action: 'left_click', ref: 'ref_3' }), { label: 'Clicked', meta: 'ref_3' });
  assert.deepEqual(row('chrome_computer', { action: 'left_click', coordinate: [10.4, 20] }, 'busy'), { label: 'Clicking', meta: '(10, 20)' });
  assert.deepEqual(row('chrome_computer', { action: 'key', text: 'ctrl+a Backspace' }), { label: 'Pressed key', meta: 'ctrl+a Backspace' });
  assert.deepEqual(row('chrome_computer', { action: 'scroll', scroll_direction: 'down' }, 'failed'), { label: 'Couldn’t scroll', meta: null });
  assert.deepEqual(row('chrome_javascript_tool', { code: 'document.title' }, 'failed'), { label: 'Page script failed', meta: 'document.title' });
  assert.deepEqual(row('chrome_tabs_context_mcp', {}), { label: 'Checked tabs', meta: null });
  assert.deepEqual(row('chrome_tabs_create_mcp', { url: 'https://a.test/x' }, 'busy'), { label: 'Opening tab', meta: 'a.test' });
  const steps = [{ name: 'navigate', input: { url: 'a.test' } }, { name: 'read_page' }, { name: 'computer', input: { action: 'left_click' } }, { name: 'computer', input: { action: 'type' } }, { name: 'find' }];
  assert.deepEqual(row('chrome_browser_batch', { actions: steps }), { label: 'Opened, read page, clicked +2', meta: '5 steps' });
  assert.deepEqual(row('chrome_browser_batch', { actions: steps.slice(0, 2) }, 'busy'), { label: 'Opening, reading page', meta: '2 steps' });
});
