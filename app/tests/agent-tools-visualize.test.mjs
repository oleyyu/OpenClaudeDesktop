// R4g-mcp MA-2: agent-tools/visualize.mjs serves the official 2.42304.0 visualize tools (show_widget, read_me) through
// the agent-tools host, in the "visualize" group (main.cjs agentToolGroupEnabled, on by D35). In-process only: the host
// is never started (no socket, no child process); tools/list and tools/call go through host.listTools() / host.call().
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const TOOLS_DIR = path.join(app, 'electron', 'agent-tools');
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const generated = require('../electron/generated/visualize/imagine-server.cjs');
const visualize = await import('../electron/agent-tools/visualize.mjs');

const sessions = { 'thread-a': '/work/a' };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-visualize-'));
function makeHost(options = {}) {
  return createAgentToolsHost({
    tmpRoot: tmp(), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta?.threadId; return Object.hasOwn(sessions, key ?? '') ? { id: key, cwd: sessions[key] } : null; },
    ...options,
  });
}

test('the module is the official visualize server: group, names, descriptions, schemas and _meta unchanged', () => {
  assert.equal(visualize.group, 'visualize');
  assert.equal(visualize.serverDef.serverName, 'visualize');
  assert.equal(visualize.serverDef.isEnabled(), true);
  assert.deepEqual(visualize.tools.map((tool) => tool.name), generated.IMAGINE_TOOLS.map((tool) => tool.name));
  assert.deepEqual(visualize.tools.map((tool) => tool.name), ['show_widget', 'read_me']);
  for (const tool of visualize.tools) {
    const official = generated.IMAGINE_TOOLS.find((entry) => entry.name === tool.name);
    assert.equal(tool.description, official.description);
    assert.deepEqual(tool.inputSchema, official.inputSchema);
    assert.deepEqual(tool._meta, official._meta);
    assert.deepEqual(tool.annotations, { readOnlyHint: true });
    assert.equal(tool.alwaysLoad, true);
    assert.equal(typeof tool.handler, 'function');
  }
  assert.deepEqual(visualize.tools[0]._meta, { ui: { resourceUri: 'ui://imagine/show-widget.html' } });
  assert.equal(visualize.tools[1].maxResultSizeChars, 200000);
  // MA-4 reads the widget template from the same definition.
  const resource = visualize.serverDef.handleReadResource(generated.WIDGET_RESOURCE_URI);
  assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.equal(resource.contents[0].text, generated.widgetHtml());
});

test('tools/list offers show_widget and read_me while the group is on; tools/call returns the official text', async () => {
  const host = makeHost({ modules: [visualize], isGroupEnabled: () => true });
  await host.ready();
  const listed = host.listTools();
  assert.deepEqual(listed.map((tool) => tool.name), ['show_widget', 'read_me']);
  const show = listed.find((tool) => tool.name === 'show_widget');
  assert.deepEqual(show.inputSchema, generated.IMAGINE_TOOLS[0].inputSchema);
  assert.deepEqual(show.annotations, { readOnlyHint: true });

  const shown = await host.call('thread-a', { name: 'show_widget', arguments: { loading_messages: ['Drawing'], title: 'demo', widget_code: '<svg viewBox="0 0 10 10"></svg>' } });
  assert.deepEqual(shown, generated.handleImagineToolCall('show_widget', {}));
  assert.match(shown.content[0].text, /^Content rendered and shown to the user\./);
  assert.equal(shown.isError, undefined);

  const args = { modules: ['diagram', 'chart'], platform: 'desktop' };
  const readMe = await host.call('thread-a', { name: 'read_me', arguments: args });
  assert.deepEqual(readMe, generated.handleImagineToolCall('read_me', args));
  assert.ok(readMe.content[0].text.startsWith(generated.READ_ME_PREAMBLE));
  assert.ok(readMe.content[0].text.endsWith(generated.READ_ME_CLOSING));
  // Every module at once stays under the official 200 000-character result cap (no host truncation applies).
  const all = await host.call('thread-a', { name: 'read_me', arguments: { modules: generated.READ_ME_MODULES } });
  assert.deepEqual(all, generated.handleImagineToolCall('read_me', { modules: generated.READ_ME_MODULES }));
  assert.ok(all.content[0].text.length < generated.MAX_RESULT_SIZE_CHARS);
  const bare = await host.call('thread-a', { name: 'read_me', arguments: {} });
  assert.equal(bare.content[0].text, [generated.READ_ME_PREAMBLE, generated.READ_ME_CLOSING].join('\n\n'));
});

test('with the group off the tools are not listed and a call is refused with the setting', async () => {
  const host = makeHost({ modules: [visualize], isGroupEnabled: (group) => group !== 'visualize' });
  await host.ready();
  assert.deepEqual(host.listTools().map((tool) => tool.name), []);
  await assert.rejects(host.call('thread-a', { name: 'show_widget', arguments: {} }), /show_widget is turned off/);
});

test('the real tool directory loads visualize.mjs next to the other modules, and it is never deferred', async () => {
  const host = makeHost({ toolsDir: TOOLS_DIR, deferredGroups: () => ['workflow', 'monitor', 'schedule', 'findings', 'notebook', 'window'] });
  await host.ready();
  const names = host.listTools().map((tool) => tool.name);
  for (const name of ['show_widget', 'read_me', 'PushNotification']) assert.ok(names.includes(name), name);
  assert.equal(names.filter((name) => name === 'read_me').length, 1, 'no other module defines read_me');
});

test('main.cjs agentToolGroupEnabled: visualize is on unless config.agentVisualize is false (D35); other groups unchanged', () => {
  const source = fs.readFileSync(path.join(app, 'electron', 'main.cjs'), 'utf8');
  const lines = source.split('\n').filter((line) => line.startsWith('const agentToolGroupEnabled = '));
  assert.equal(lines.length, 1);
  const expression = lines[0].slice('const agentToolGroupEnabled = '.length).replace(/;$/, '');
  const make = (config, workflow = { enabled: true }, engine = 'codeDesktop') =>
    new Function('config', 'workflowSettings', 'currentWorkflowEngine', `return (${expression});`)(config, () => workflow, () => engine);
  assert.equal(make(undefined)('visualize'), true);
  assert.equal(make({})('visualize'), true);
  assert.equal(make({ agentVisualize: true })('visualize'), true);
  assert.equal(make({ agentVisualize: false })('visualize'), false);
  assert.equal(make({ agentVisualize: false })('preview'), true);
  assert.equal(make({ agentPreview: false })('preview'), false);
  assert.equal(make({ agentPreview: false })('visualize'), true);
  assert.equal(make({}, { enabled: false })('workflow'), false);
  assert.equal(make({})('notify'), true);
});

test('the package filter keeps the visualize tool module, its adapter and the generated server', async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
  const packager = (file) => import(pathToFileURL(path.join(app, 'node_modules/@electron/packager/dist', file)).href);
  const command = pkg.scripts.package.split('&&').map((part) => part.trim()).find((part) => part.startsWith('electron-packager'));
  const words = [];
  for (const match of command.matchAll(/'([^']*)'|(\S+)/g)) words.push(match[1] !== undefined ? match[1] : match[2].replace(/'([^']*)'/g, '$1'));
  const { parseArgs } = await packager('cli.js');
  const opts = parseArgs(words.slice(1));
  const { populateIgnoredPaths, userPathFilter } = await packager('copy-filter.js');
  opts.dir = app;
  populateIgnoredPaths(opts);
  const filter = userPathFilter(opts);
  for (const file of ['agent-tools/visualize.mjs', 'visualize-adapters.cjs', 'generated/visualize/imagine-server.cjs'])
    assert.equal(await filter(path.join(app, 'electron', file)), true, `electron/${file} is packaged`);
});

test('R4g review fix: the settings call saves agentVisualize and re-lists the agent tools, like agentPreview', () => {
  const source = fs.readFileSync(path.join(app, 'electron', 'main.cjs'), 'utf8');
  const save = '        if (typeof p.agentVisualize === "boolean") config.agentVisualize = p.agentVisualize;\n';
  assert.equal(source.split(save).length - 1, 1);
  assert.ok(source.indexOf(save) > source.indexOf('        if (typeof p.agentPreview === "boolean") config.agentPreview = p.agentPreview;\n'), 'next to the Browser tools setting');
  const relist = source.split('\n').filter((line) => line.includes('typeof p.agentPreview === "boolean" || typeof p.agentVisualize === "boolean") {'));
  assert.equal(relist.length, 1, 'a change re-lists the tools (notifications/tools/list_changed, codeDesktop/appTools/changed)');
  const at = source.indexOf(relist[0]);
  assert.match(source.slice(at, at + 900), /agentTools\.notifyListChanged\(\);[\s\S]*codeDesktop\/appTools\/changed/);
});
