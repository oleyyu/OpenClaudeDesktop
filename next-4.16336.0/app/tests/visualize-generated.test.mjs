// R4g-mcp MA-1 (D35): the original 3.6556.2 main-process built-in visualize MCP server (asar index.chunk-CbnfBP-3.js
// getImagineServerDef, show_widget / read_me, ui://imagine/show-widget.html), extracted to
// electron/generated/visualize/imagine-server.cjs by scripts/extract-visualize.mjs and bound by
// electron/visualize-adapters.cjs. Migrated from 2.42304.0 (index.chunk-BaLvO2wi.js) by w1-routines-a (RC-19/RC-20).
// The official chunk is only read (R13): it is parsed with Babel and every top-level declaration is compared byte for
// byte with the generated module, so the generated behaviour is the official behaviour; the behaviour tests then run the
// generated module only. No Electron, no network, no external process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { extractVisualize } from '../scripts/extract-visualize.mjs';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const build = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build');
const officialPath = path.join(build, 'index.chunk-CbnfBP-3.js');
const official = readFileSync(officialPath, 'utf8');
const generatedDir = path.join(app, 'electron/generated/visualize');
const generatedText = readFileSync(path.join(generatedDir, 'imagine-server.cjs'), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(generatedDir, 'manifest.json'), 'utf8'));
const generated = require('../electron/generated/visualize/imagine-server.cjs');
const adapters = require('../electron/visualize-adapters.cjs');
const occurrences = (text, needle) => text.split(needle).length - 1;
const sha = text => createHash('sha256').update(text).digest('hex');

// Top-level declarations of the official chunk, sliced from its text (never executed).
function officialDeclarations() {
  const ast = babel.babelParse(official, 'index.chunk-CbnfBP-3.js', false);
  const slices = new Map();
  for (const statement of ast.program.body) {
    if (statement.type === 'FunctionDeclaration') slices.set(statement.id.name, official.slice(statement.start, statement.end));
    if (statement.type === 'VariableDeclaration' && statement.kind === 'var')
      for (const declarator of statement.declarations) slices.set(declarator.id.name, official.slice(declarator.start, declarator.end));
  }
  return slices;
}

test('3.6556.2 feature strings occur in the official chunk with the researched counts', () => {
  for (const [needle, count] of [
    ['data-keep-menu-clear', 16], ['menu-room', 13], ['data-draw-cards', 2], ['_drawCards', 2],
    ['var HOSTED_CARDS = "/libs/imagine/ui-cards-2/ui-cards.mjs";', 1], ['stripScripts: true', 2],
    ['const e=require("./index.chunk-jPKPzV-P.js"),t=require("./index.chunk-lgtvJrTy.js");', 1], ['e.ert.info(', 1], ['e.p5', 0], ['frame-held', 8], ['<title>Visualize Widget</title>', 1],
    ['/libs/imagine/streaming-helpers-1/streaming-helpers.mjs', 1], ['var v="ui://imagine/show-widget.html"', 1],
    ['name:"show_widget"', 1], ['name:"read_me"', 1], ['text/html;profile=mcp-app', 2], ['E="visualize"', 1],
    ['exports.getImagineServerDef=A', 1], ['Content rendered and shown to the user.', 1],
    ['connectDomains:["https://esm.sh","https://cdnjs.cloudflare.com","https://cdn.jsdelivr.net","https://unpkg.com"]', 1],
  ]) assert.equal(occurrences(official, needle), count, needle);
  const gate = readFileSync(path.join(build, 'index.chunk-lgtvJrTy.js'), 'utf8');
  assert.equal(occurrences(gate, 'n="3444158716"'), 1);
  assert.equal(occurrences(gate, 't="inline_visualizations"'), 1);
  assert.equal(occurrences(readFileSync(path.join(build, 'index.chunk-DBIg6EBr.js'), 'utf8'), 'require("./index.chunk-CbnfBP-3.js")'), 1);
});

test('every official top-level declaration is in the generated module byte for byte (the official chunk is not run)', () => {
  const slices = officialDeclarations();
  assert.deepEqual([...slices.keys()].sort(), manifest.bindings.map(binding => binding.name).sort());
  for (const binding of manifest.bindings) {
    const slice = slices.get(binding.name);
    assert.equal(sha(slice), binding.sha256, binding.name);
    assert.equal(slice.length, binding.length, binding.name);
    assert.ok(generatedText.includes(slice), `${binding.name} verbatim`);
  }
  // m (the widget template) is the binding that changed in 3.6556.2; widgetHtml() returns its literal text.
  assert.equal(manifest.bindings.find(binding => binding.name === 'm').length, 333849);
});

test('RC-19: the host never asks the widget to draw ui-cards (no _drawCards, no data-draw-cards outside generated code)', () => {
  const hits = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (!['generated', 'node_modules'].includes(entry.name)) walk(full); continue; }
      if (!/\.(c?js|mjs|jsx|html)$/.test(entry.name)) continue;
      const text = readFileSync(full, 'utf8');
      if (/_drawCards|data-draw-cards|ui-cards-2/.test(text) && !text.includes('RC-19')) hits.push(path.relative(app, full));
    }
  };
  for (const dir of ['src', 'electron']) walk(path.join(app, dir));
  assert.deepEqual(hits, []);
  // The template only loads the hosted cards module when the host context turns _drawCards on.
  const html = generated.widgetHtml();
  assert.match(html, /applyDrawCards\(hostContext\._drawCards\);/);
  assert.match(html, /function applyDrawCards\(value\) \{\n {4}if \(typeof value === "boolean"\) \{\n {6}drawCardsRoot\.toggleAttribute\("data-draw-cards", value\);/);
});

test('generated module is current (--check), closed and carries every slice verbatim', async () => {
  await extractVisualize({ check: true });
  assert.deepEqual(readdirSync(generatedDir).sort(), ['imagine-server.cjs', 'manifest.json']);
  assert.equal(manifest.sourceSha256, sha(readFileSync(officialPath)));
  assert.equal(manifest.sha256, sha(generatedText));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.hostParams, { e: ['ert'], t: ['n', 't'] });
  // The root entry keeps the template's feature strings with the official counts.
  for (const [needle, count] of [['data-keep-menu-clear', 16], ['menu-room', 13], ['data-draw-cards', 2], ['frame-held', 8], ['ui://imagine/show-widget.html', 1],
    ['name:"show_widget"', 1], ['text/html;profile=mcp-app', 2], ['<title>Visualize Widget</title>', 1]])
    assert.equal(occurrences(generatedText, needle), count, needle);
  // No runtime imports, no Sentry preamble, no CommonJS exports of the chunk.
  assert.doesNotMatch(generatedText, /\brequire\(/);
  assert.doesNotMatch(generatedText, /SENTRY_RELEASE|_sentryDebugIds|exports\.getImagineServerDef/);
  for (const binding of manifest.bindings) assert.equal(binding.sha256.length, 64, binding.name);
});

test('tool and resource definitions equal the official values', () => {
  const def = generated.bindImagineServer({ ert: { info() {} } }, { n: () => false, t: () => true }).getImagineServerDef();
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
  // The adapter binds the same official A: same tool list (alwaysLoad, maxResultSizeChars from _meta) as the bare binding.
  assert.deepEqual(JSON.parse(JSON.stringify(bound.tools)), JSON.parse(JSON.stringify(def.tools)));
  assert.deepEqual(bound.tools.map(tool => tool.description), generated.IMAGINE_TOOLS.map(tool => tool.description));
  assert.deepEqual(bound.tools.map(tool => [tool.name, tool.alwaysLoad, tool.maxResultSizeChars]), [['show_widget', true, undefined], ['read_me', true, 200000]]);
  assert.equal(bound.serverName, def.serverName);
  assert.deepEqual(JSON.parse(JSON.stringify(bound.handleListResources())), JSON.parse(JSON.stringify(def.handleListResources())));
});

test('read_me concatenates the official guides exactly, for every module and platform', async () => {
  const def = generated.bindImagineServer({ ert: { info() {} } }, { n: () => false, t: () => true }).getImagineServerDef();
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
  const bound = adapters.createVisualizeServer().getImagineServerDef();
  const ours = bound.handleReadResource('ui://imagine/show-widget.html');
  assert.equal(ours.contents.length, 1);
  assert.equal(ours.contents[0].text, generated.widgetHtml());
  // The template is m's single expression-free template literal: its cooked value is the official text.
  const m = officialDeclarations().get('m');
  const literal = babel.babelParse(m, 'm.js', false).program.body[0].body.body[0].argument;
  assert.equal(ours.contents[0].text, literal.quasis[0].value.cooked);
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

test('the withheld branch keeps the official refusal text, unavailable reason and one log line', async () => {
  const logs = [];
  const ours = generated.bindImagineServer({ ert: { info: message => logs.push(message) } }, { n: () => true, t: () => false }).getImagineServerDef();
  for (const def of [ours]) {
    assert.equal(def.isEnabled(), false);
    assert.deepEqual(JSON.parse(JSON.stringify(await def.handleToolCall('show_widget', {}))), { content: [{ type: 'text', text: generated.POLICY_REFUSAL_TEXT }], isError: true });
    assert.deepEqual(JSON.parse(JSON.stringify(def.handleReadResource(generated.WIDGET_RESOURCE_URI))), { contents: [], unavailable: 'blocked_by_policy' });
    assert.deepEqual(JSON.parse(JSON.stringify(def.handleListResources())), []);
  }
  // O latches: one line however many calls were refused (official k: O||(O=!0,e.ert.info(…))).
  assert.deepEqual(logs, ['[imagine] show_widget refused — withheld by the org\'s Inline visualizations answer']);
  assert.deepEqual({ ...generated.ResourceUnavailable }, { BlockedByPolicy: 'blocked_by_policy', NeedsSignIn: 'needs_sign_in', NotConnected: 'not_connected', ReadFailed: 'read_failed' });
});
