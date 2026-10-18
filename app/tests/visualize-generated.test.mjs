// R4g-mcp MA-1 (D35): the original 2.42304.0 main-process built-in visualize MCP server (asar index.chunk-BaLvO2wi.js
// getImagineServerDef, show_widget / read_me, ui://imagine/show-widget.html), extracted to
// electron/generated/visualize/imagine-server.cjs by scripts/extract-visualize.mjs and bound by
// electron/visualize-adapters.cjs. The official chunk itself is evaluated in a node:vm context with stub imports to
// compare behaviour; no Electron, no network, no external process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { extractVisualize } from '../scripts/extract-visualize.mjs';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const build = path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build');
const officialPath = path.join(build, 'index.chunk-BaLvO2wi.js');
const official = readFileSync(officialPath, 'utf8');
const generatedDir = path.join(app, 'electron/generated/visualize');
const generatedText = readFileSync(path.join(generatedDir, 'imagine-server.cjs'), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(generatedDir, 'manifest.json'), 'utf8'));
const generated = require('../electron/generated/visualize/imagine-server.cjs');
const adapters = require('../electron/visualize-adapters.cjs');
const occurrences = (text, needle) => text.split(needle).length - 1;
const sha = text => createHash('sha256').update(text).digest('hex');

// Evaluate the official chunk with stub module-level imports e (logger) and t (gate / policy).
function officialModule({ withheld = false, enabled = true, logs = [] } = {}) {
  const exports = {};
  const stubs = {
    './index.chunk-D4B44ehk.js': {},
    './index.chunk-muI2IV6k.js': { p5: { info: message => logs.push(message) } },
    './index.chunk-D89SZXs4.js': { n: () => withheld, t: () => enabled },
  };
  vm.runInNewContext(official, { exports, require: name => { if (!(name in stubs)) throw Error(`unexpected require ${name}`); return stubs[name]; } });
  return exports;
}

test('2.42304.0 feature strings occur in the official chunk with the researched counts', () => {
  for (const [needle, count] of [
    ['data-keep-menu-clear', 16], ['menu-room', 12], ['frame-held', 8], ['<title>Visualize Widget</title>', 1],
    ['/libs/imagine/streaming-helpers-1/streaming-helpers.mjs', 1], ['var v="ui://imagine/show-widget.html"', 1],
    ['name:"show_widget"', 1], ['name:"read_me"', 1], ['text/html;profile=mcp-app', 2], ['E="visualize"', 1],
    ['exports.getImagineServerDef=A', 1], ['Content rendered and shown to the user.', 1],
    ['connectDomains:["https://esm.sh","https://cdnjs.cloudflare.com","https://cdn.jsdelivr.net","https://unpkg.com"]', 1],
  ]) assert.equal(occurrences(official, needle), count, needle);
  const gate = readFileSync(path.join(build, 'index.chunk-D89SZXs4.js'), 'utf8');
  assert.equal(occurrences(gate, 'n="3444158716"'), 1);
  assert.equal(occurrences(gate, 't="inline_visualizations"'), 1);
  assert.equal(occurrences(readFileSync(path.join(build, 'index.chunk-B5tintml.js'), 'utf8'), 'require("./index.chunk-BaLvO2wi.js")'), 1);
});

test('generated module is current (--check), closed and carries every slice verbatim', async () => {
  await extractVisualize({ check: true });
  assert.deepEqual(readdirSync(generatedDir).sort(), ['imagine-server.cjs', 'manifest.json']);
  assert.equal(manifest.sourceSha256, sha(readFileSync(officialPath)));
  assert.equal(manifest.sha256, sha(generatedText));
  assert.deepEqual(manifest.hostParams, { e: ['p5'], t: ['n', 't'] });
  // The root entry keeps the template's feature strings with the official counts.
  for (const [needle, count] of [['data-keep-menu-clear', 16], ['menu-room', 12], ['frame-held', 8], ['ui://imagine/show-widget.html', 1],
    ['name:"show_widget"', 1], ['text/html;profile=mcp-app', 2], ['<title>Visualize Widget</title>', 1]])
    assert.equal(occurrences(generatedText, needle), count, needle);
  // No runtime imports, no Sentry preamble, no CommonJS exports of the chunk.
  assert.doesNotMatch(generatedText, /\brequire\(/);
  assert.doesNotMatch(generatedText, /SENTRY_RELEASE|_sentryDebugIds|exports\.getImagineServerDef/);
  for (const binding of manifest.bindings) assert.equal(binding.sha256.length, 64, binding.name);
});

test('tool and resource definitions equal the official values', () => {
  const o = officialModule();
  const def = o.getImagineServerDef();
  assert.equal(generated.IMAGINE_SERVER_NAME, 'visualize');
  assert.equal(generated.WIDGET_RESOURCE_URI, 'ui://imagine/show-widget.html');
  assert.equal(generated.MAX_RESULT_SIZE_CHARS, 2e5);
  assert.deepEqual(generated.READ_ME_MODULES, ['diagram', 'mockup', 'interactive', 'data_viz', 'art', 'chart', 'elicitation']);
  assert.deepEqual(generated.READ_ME_PLATFORMS, ['mobile', 'desktop', 'unknown']);
  assert.deepEqual(generated.IMAGINE_TOOLS.map(tool => tool.name), ['show_widget', 'read_me']);
  assert.deepEqual(generated.IMAGINE_TOOLS[0]._meta, { ui: { resourceUri: 'ui://imagine/show-widget.html' } });
  assert.deepEqual(generated.IMAGINE_TOOLS[0].inputSchema.required, ['loading_messages', 'title', 'widget_code']);
  assert.deepEqual(generated.IMAGINE_TOOLS[1]._meta, { 'claude.ai/hidden_in_chat': true, 'anthropic/maxResultSizeChars': 200000 });
  assert.deepEqual(generated.IMAGINE_RESOURCES, [{ uri: 'ui://imagine/show-widget.html', name: 'visualize widget',
    description: 'Renders SVG or HTML content progressively as it streams for the show_widget tool', mimeType: 'text/html;profile=mcp-app' }]);
  const bound = adapters.createVisualizeServer().getImagineServerDef();
  // vm objects come from another realm: compare structurally through JSON.
  assert.deepEqual(JSON.parse(JSON.stringify(bound.tools)), JSON.parse(JSON.stringify(def.tools)));
  assert.deepEqual(bound.tools.map(tool => [tool.name, tool.alwaysLoad, tool.maxResultSizeChars]), [['show_widget', true, undefined], ['read_me', true, 200000]]);
  assert.equal(bound.serverName, def.serverName);
  assert.deepEqual(JSON.parse(JSON.stringify(bound.handleListResources())), JSON.parse(JSON.stringify(def.handleListResources())));
});

test('read_me concatenates the official guides exactly, for every module and platform', async () => {
  const def = officialModule().getImagineServerDef();
  const bound = adapters.createVisualizeServer().getImagineServerDef();
  const cases = [{ modules: ['chart'], platform: 'desktop' }, { modules: ['chart', 'data_viz'], platform: 'mobile' }, {},
    { modules: ['diagram', 'art'] }, { modules: ['nope'] }, ...generated.READ_ME_MODULES.flatMap(module => generated.READ_ME_PLATFORMS.map(platform => ({ modules: [module], platform })))];
  for (const args of cases) {
    const ours = await bound.handleToolCall('read_me', args);
    assert.deepEqual(JSON.parse(JSON.stringify(ours)), JSON.parse(JSON.stringify(await def.handleToolCall('read_me', args))), JSON.stringify(args));
  }
  const chart = (await bound.handleToolCall('read_me', { modules: ['chart'], platform: 'desktop' })).content[0].text;
  const { READ_ME_PREAMBLE, uiComponentsGuide, COLOR_PALETTE_GUIDE, CHARTS_GUIDE, DATA_VIZ_GUIDE, READ_ME_CLOSING } = generated;
  assert.equal(chart, [READ_ME_PREAMBLE, uiComponentsGuide(680), COLOR_PALETTE_GUIDE, CHARTS_GUIDE, DATA_VIZ_GUIDE, READ_ME_CLOSING].join('\n\n'));
  assert.equal(generated.widthForPlatform('mobile'), 380);
  assert.equal(generated.widthForPlatform('desktop'), 680);
  // chart and data_viz share guides; the de-duplicated join keeps each once.
  const both = (await bound.handleToolCall('read_me', { modules: ['chart', 'data_viz'], platform: 'mobile' })).content[0].text;
  assert.equal(occurrences(both, CHARTS_GUIDE), 1);
  assert.match(both, /The widget container is 380px wide\./);
});

test('show_widget and unknown tools answer with the official text', async () => {
  const bound = adapters.createVisualizeServer().getImagineServerDef();
  assert.deepEqual(await bound.handleToolCall('show_widget', { title: 'x', loading_messages: ['a'], widget_code: '<svg/>' }), { content: [{ type: 'text',
    text: "Content rendered and shown to the user. Please do not duplicate the shown content in text because it's already visually represented." }] });
  assert.deepEqual(await bound.handleToolCall('draw', {}), { content: [{ type: 'text', text: 'Unknown tool: draw' }], isError: true });
});

test('the widget resource returns the official template, CSP and permissions', () => {
  const def = officialModule().getImagineServerDef();
  const bound = adapters.createVisualizeServer().getImagineServerDef();
  const ours = bound.handleReadResource('ui://imagine/show-widget.html');
  const theirs = def.handleReadResource('ui://imagine/show-widget.html');
  assert.equal(ours.contents.length, 1);
  assert.equal(ours.contents[0].text, theirs.contents[0].text);
  assert.equal(ours.contents[0].text, generated.widgetHtml());
  assert.deepEqual(JSON.parse(JSON.stringify(ours.contents[0]._meta)), JSON.parse(JSON.stringify(theirs.contents[0]._meta)));
  assert.deepEqual(ours.contents[0]._meta, { ui: { permissions: { clipboardWrite: {} }, csp: {
    connectDomains: ['https://esm.sh', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
    resourceDomains: ['https://esm.sh', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'] } } });
  assert.equal(ours.contents[0].mimeType, 'text/html;profile=mcp-app');
  const html = ours.contents[0].text;
  assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="en">'));
  assert.equal(occurrences(html, 'data-keep-menu-clear'), 16);
  assert.match(html, /applyKeepMenuClear/);
  assert.throws(() => bound.handleReadResource('ui://imagine/other.html'), /Unknown resource: ui:\/\/imagine\/other\.html/);
});

test('host adapter: enabled by default (D35), switchable, never withheld by org policy (D17)', async () => {
  assert.deepEqual(adapters.HOST_GATES.visualize, { gate: '3444158716', host: true, basis: 'D35' });
  assert.equal(adapters.HOST_GATES.inlineVisualizationsPolicy.host, false);
  assert.equal(adapters.createVisualizeServer().getImagineServerDef().isEnabled(), true);
  let on = false;
  const def = adapters.createVisualizeServer({ enabled: () => on }).getImagineServerDef();
  assert.equal(def.isEnabled(), false);
  on = true;
  assert.equal(def.isEnabled(), true);
  assert.equal(adapters.createVisualizeServer().refuseWhenWithheld('x'), false);
  assert.throws(() => adapters.createVisualizeServer({ enabled: true }), /enabled must be a function/);
});

test('the withheld branch matches the official chunk (refusal text, unavailable reason, one log line)', async () => {
  const logs = [], officialLogs = [];
  const ours = generated.bindImagineServer({ p5: { info: message => logs.push(message) } }, { n: () => true, t: () => false }).getImagineServerDef();
  const theirs = officialModule({ withheld: true, enabled: false, logs: officialLogs }).getImagineServerDef();
  for (const def of [ours, theirs]) {
    assert.equal(def.isEnabled(), false);
    assert.deepEqual(JSON.parse(JSON.stringify(await def.handleToolCall('show_widget', {}))), { content: [{ type: 'text', text: generated.POLICY_REFUSAL_TEXT }], isError: true });
    assert.deepEqual(JSON.parse(JSON.stringify(def.handleReadResource(generated.WIDGET_RESOURCE_URI))), { contents: [], unavailable: 'blocked_by_policy' });
    assert.deepEqual(JSON.parse(JSON.stringify(def.handleListResources())), []);
  }
  assert.deepEqual(logs, officialLogs);
  assert.deepEqual(logs, ['[imagine] show_widget refused — withheld by the org\'s Inline visualizations answer']);
  assert.deepEqual({ ...generated.ResourceUnavailable }, { BlockedByPolicy: 'blocked_by_policy', NeedsSignIn: 'needs_sign_in', NotConnected: 'not_connected', ReadFailed: 'read_failed' });
});
