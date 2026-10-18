// Context card breakdown (2.42304.0 c2d611398 H, sliced into src/generated/session-rail-context): the host's
// get_context_usage-shaped report (src/context-breakdown-model.mjs) and the generated breakdown's bindings.
// Pure: no Electron, no browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildContextUsageReport, estimateTokens, estimateJsonTokens, CONTEXT_CATEGORY_ORDER } from '../src/context-breakdown-model.mjs';
import { flattenContextUsage, isFreeSpaceCategory, isBufferCategory, isDeferredCategory } from '../src/generated/session-rail-context/context-usage-shape.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const manifest = JSON.parse(read('src/generated/session-rail-context/manifest.json'));
const names = (report) => report.categories.map((c) => c.name);
const tokensOf = (report, name) => report.categories.find((c) => c.name === name)?.tokens;

test('report shape: the CLI order, names, colors and kinds; get_context_usage fields', () => {
  const report = buildContextUsageReport({
    totalTokens: 64400, window: 262100, autoCompactThreshold: 235890, model: 'deepseek-v4',
    categories: { skills: { tokens: 900 }, systemPrompt: { tokens: 6000 }, systemTools: { tokens: 12000, estimated: true },
      mcpTools: { tokens: 3000 }, memoryFiles: { tokens: 1500 }, mcpToolsDeferred: { tokens: 800 }, mcpServerInstructions: { tokens: 400 } },
    memoryFiles: [{ path: '/w/AGENTS.md', type: 'Project', tokens: 1500 }],
  });
  // Claude Code 2.1.299: MCP server instructions right after MCP tools, before the deferred rows
  assert.deepEqual(names(report), ['System prompt', 'System tools', 'MCP tools', 'MCP server instructions', 'MCP tools (deferred)', 'Memory files', 'Skills',
    'Messages', 'Autocompact buffer', 'Free space']);
  assert.deepEqual(report.categories.map((c) => c.kind), ['used', 'used', 'used', 'used', 'deferred', 'used', 'used', 'used', 'buffer', 'free']);
  assert.deepEqual(report.categories.map((c) => c.color), ['promptBorder', 'inactive', 'cyan_FOR_SUBAGENTS_ONLY', 'green_FOR_SUBAGENTS_ONLY', 'inactive', 'claude',
    'warning', 'purple_FOR_SUBAGENTS_ONLY', 'inactive', 'promptBorder']);
  assert.equal(tokensOf(report, 'Messages'), 64400 - (6000 + 12000 + 3000 + 400 + 1500 + 900));
  assert.equal(report.categories[1].estimated, true);
  assert.equal(report.totalTokens, 64400);
  assert.equal(report.rawMaxTokens, 262100);
  assert.equal(report.maxTokens, 262100);
  assert.equal(report.percentage, 25);
  assert.equal(report.autoCompactThreshold, 235890);
  assert.equal(report.isAutoCompactEnabled, true);
  assert.equal(report.model, 'deepseek-v4');
  assert.deepEqual(report.mcpTools, []);
  assert.deepEqual(report.agents, []);
  assert.equal(report.memoryFiles.length, 1);
  // the official predicates (shared-104 Bx / Vx / Ux) classify the rows the way H does
  assert.deepEqual(report.categories.filter(isFreeSpaceCategory).map((c) => c.name), ['Free space']);
  assert.deepEqual(report.categories.filter(isBufferCategory).map((c) => c.name), ['Autocompact buffer']);
  assert.deepEqual(report.categories.filter(isDeferredCategory).map((c) => c.name), ['MCP tools (deferred)']);
  assert.equal(flattenContextUsage(report).autocompactBufferTokens, 262100 - 235890);
  assert.deepEqual(CONTEXT_CATEGORY_ORDER, ['systemPrompt', 'systemTools', 'mcpTools', 'mcpServerInstructions', 'mcpToolsDeferred', 'systemToolsDeferred', 'customAgents',
    'memoryFiles', 'skills']);
});

test('Messages is the real total minus the known rows (deferred rows not counted), never below 0', () => {
  const report = buildContextUsageReport({ totalTokens: 50000, window: 200000, categories: {
    systemPrompt: { tokens: 10000 }, systemTools: { tokens: 5000 }, mcpToolsDeferred: { tokens: 9000 } } });
  assert.equal(tokensOf(report, 'Messages'), 35000);
  const over = buildContextUsageReport({ totalTokens: 8000, window: 200000, categories: { systemPrompt: { tokens: 10000 } } });
  assert.equal(tokensOf(over, 'Messages'), undefined, 'a zero Messages row is left out (the CLI pushes only > 0)');
  // 2.1.299: the total is the known rows plus what the real total has beyond them, so never below the known rows
  assert.equal(over.totalTokens, 10000);
  assert.equal(over.percentage, 5);
  // clamped to what the window leaves after the known rows and the buffer
  const full = buildContextUsageReport({ totalTokens: 300000, window: 200000, autoCompactThreshold: 180000, categories: { systemPrompt: { tokens: 10000 } } });
  assert.equal(tokensOf(full, 'Messages'), 200000 - 10000 - 20000);
  assert.equal(tokensOf(full, 'Free space'), 0);
});

test('missing data: unknown categories are left out; no window, no report; no real total, no Messages', () => {
  const only = buildContextUsageReport({ totalTokens: 1000, window: 100000 });
  assert.deepEqual(names(only), ['Messages', 'Free space']);
  assert.equal(tokensOf(only, 'Messages'), 1000);
  const zeros = buildContextUsageReport({ totalTokens: 1000, window: 100000, categories: { skills: { tokens: 0 }, mcpTools: { tokens: -3 }, memoryFiles: {} } });
  assert.deepEqual(names(zeros), ['Messages', 'Free space']);
  assert.equal(buildContextUsageReport({ totalTokens: 1000, window: 0 }), null);
  assert.equal(buildContextUsageReport({ totalTokens: 1000 }), null);
  assert.equal(buildContextUsageReport(null), null);
  const noTotal = buildContextUsageReport({ totalTokens: null, window: 100000, categories: { systemPrompt: { tokens: 4000 } } });
  assert.deepEqual(names(noTotal), ['System prompt', 'Free space']);
  assert.equal(noTotal.totalTokens, 4000);
  assert.equal(noTotal.percentage, 4);
});

test('Autocompact buffer = window − threshold; Free space = window − used − buffer; no threshold, no buffer', () => {
  const report = buildContextUsageReport({ totalTokens: 64400, window: 262100, autoCompactThreshold: 235890, categories: { systemPrompt: { tokens: 6000 } } });
  assert.equal(tokensOf(report, 'Autocompact buffer'), 26210);
  assert.equal(tokensOf(report, 'Free space'), 262100 - 64400 - 26210);
  const none = buildContextUsageReport({ totalTokens: 64400, window: 262100, autoCompactThreshold: null });
  assert.equal(tokensOf(none, 'Autocompact buffer'), undefined);
  assert.equal(none.isAutoCompactEnabled, undefined);
  assert.equal(tokensOf(none, 'Free space'), 262100 - 64400);
  // an engine-driven ("auto") compaction has no buffer row (the CLI's `!(hr && Xe === "auto")`)
  const auto = buildContextUsageReport({ totalTokens: 1000, window: 10000, autoCompactThreshold: 9000, autocompactSource: 'auto' });
  assert.equal(tokensOf(auto, 'Autocompact buffer'), undefined);
  assert.equal(auto.autocompactSource, 'auto');
  // a threshold at / above the window is no threshold
  assert.equal(tokensOf(buildContextUsageReport({ totalTokens: 1, window: 100, autoCompactThreshold: 100 }), 'Autocompact buffer'), undefined);
});

test('estimates: ceil(chars / 4), JSON for schemas', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcde'), 2);
  assert.equal(estimateTokens(undefined), 0);
  assert.equal(estimateJsonTokens({ a: 1 }), 2);
  assert.equal(estimateJsonTokens(undefined), 0);
});

test('generator: H and its chart kit are sliced; the breakdown adapter is gone', () => {
  const targets = manifest.modules.map((m) => m.target);
  for (const t of ['context-usage-shape.mjs', 'mcp-names.mjs', 'cds-frame-helpers.mjs', 'chart-kit.mjs', 'chart-meter.mjs', 'chart-legend.mjs', 'context-panel.mjs'])
    assert.ok(targets.includes(t), t);
  const panel = manifest.modules.find((m) => m.target === 'context-panel.mjs');
  const bindings = panel.bindings.map((b) => b.name);
  for (const b of ['H', 'le', 'B', 'ue', 'U', 'V', 'de', 'q', 'oe', 'se', 'z']) assert.ok(bindings.includes(b), b);
  assert.equal(panel.exports.H, 'ContextBreakdown');
  const via = (m, local) => m.imports.find((i) => i.local === local);
  assert.deepEqual([via(panel, 'L').name, via(panel, 'R').name, via(panel, 'ie').name], ['StackedMeterGroup', 'StackedMeter', 'ChartLegend']);
  assert.deepEqual([via(panel, 'E').name, via(panel, 'S').name, via(panel, 'T').name], ['isFreeSpaceCategory', 'isBufferCategory', 'isDeferredCategory']);
  assert.deepEqual([via(panel, 'h').kind, via(panel, 'h').name, via(panel, 'x').name], ['adapter', 'useMcpServerRegistry', 'findMcpToolForLabel']);
  assert.ok(!panel.imports.some((i) => i.name === 'ContextBreakdown'));
  const meter = manifest.modules.find((m) => m.target === 'chart-meter.mjs');
  assert.deepEqual([via(meter, 'l').kind, via(meter, 'l').name], ['view-tabs', 'CdsTooltip']);
  assert.deepEqual([via(meter, 'u').kind, via(meter, 'u').name], ['view-tabs', 'useInsideCdsTooltipProvider']);
  // the chart kit's two contexts and the meter's group context exist once, here (no other area slices these chunks)
  assert.equal((read('src/generated/session-rail-context/chart-kit.mjs').match(/^var [m_] = a\(null\);$/gm) ?? []).length, 2);
  assert.equal((read('src/generated/session-rail-context/chart-meter.mjs').match(/^var T = o\(null\);$/gm) ?? []).length, 1);
  const panelText = read('src/generated/session-rail-context/context-panel.mjs');
  for (const s of ['defaultMessage: "Other"', 'defaultMessage: "MCP tools"', 'defaultMessage: "Memory files"', 'defaultMessage: "Custom agents"',
    '"var(--cds-chart-reference-tint)"', '"var(--cds-chart-muted)"', 'style: "percent"', 'minimumFractionDigits: 1'])
    assert.ok(panelText.includes(s), s);
  assert.ok(!read('src/source-session-rail-context-adapters.jsx').includes('export function ContextBreakdown'));
});

// ---- the main process: electron/context-usage-service.cjs ----------------------------------------------------------
import { createRequire } from 'node:module';
const { createContextUsageService, hasSchema } = createRequire(import.meta.url)('../electron/context-usage-service.cjs');
const coreSupports = (info, capability) => info?.capabilities?.[capability] === true;
const config = { threadIds: ['t1'], archivedThreadIds: [], threadMetadata: { t1: { cwd: '/w' } } };
function service({ capabilities = {}, answers = {}, files = [], project = null, lists = { tools: [], deferred: [] }, fail = new Set(), serverText = null } = {}) {
  const requests = [];
  const client = { serverInfo: { engine: 'x', capabilities }, request: async (method, params) => { requests.push([method, params]); if (fail.has(method)) throw new Error('no'); return answers[method]; } };
  const svc = createContextUsageService({ getClient: () => client, getConfig: () => config, coreSupports,
    sessionToolLists: () => lists, appServerInstructions: () => serverText, systemPromptText: async () => answers.prompt, instructionFiles: async () => files,
    projectInstructions: async () => project, readFile: (file) => ({ '/w/AGENTS.md': 'a'.repeat(400), '/h/AGENTS.md': 'b'.repeat(40) })[file] ?? (() => { throw new Error('ENOENT'); })() });
  return { svc, requests };
}

test('main: a core that measures itself answers (source core); its categories are used as they are', async () => {
  const { svc, requests } = service({ capabilities: { contextUsage: true }, answers: { 'codeDesktop/contextUsage/read': { categories: { systemPrompt: { tokens: 5000 }, mcpTools: { tokens: 0 } }, memoryFiles: [{ path: 'AGENTS.md', type: 'Project', tokens: 10 }], mcpTools: [], measure: 'dsh-token-meter' } } });
  const result = await svc.read({ threadId: 't1' });
  assert.deepEqual(result.categories, { systemPrompt: { tokens: 5000 } });
  assert.deepEqual(result.sources, { systemPrompt: 'core' });
  assert.equal(result.measure, 'dsh-token-meter');
  assert.deepEqual(requests.map((r) => r[0]), ['codeDesktop/contextUsage/read']);
  await assert.rejects(svc.read({ threadId: 'nope' }), /Unknown session/);
});

test('main: host estimates — preview prompt minus project instructions, app tools (deferred too), MCP schemas, skills, memory files', async () => {
  const lists = { tools: [{ name: 'notify', description: 'n', inputSchema: { type: 'object' } }], deferred: [{ name: 'workflow', description: 'w', inputSchema: { type: 'object' } }] };
  const answers = {
    prompt: 'p'.repeat(4000) + 'PROJECT RULES' + 'APP TOOLS GUIDE',
    'mcpServerStatus/list': { data: [{ name: 'code_desktop', tools: { notify: {} } }, { name: 'github', tools: { search: { name: 'search', description: 'Search', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } }, bare: { inputSchema: { type: 'object' } } } }] },
    'skills/list': { data: [{ skills: [{ name: 'deploy', description: 'Deploy it', enabled: true }, { name: 'off', description: 'x', enabled: false }] }] },
  };
  const { svc } = service({ capabilities: { systemPromptPreview: true }, answers, lists, serverText: 'APP TOOLS GUIDE', project: { text: 'PROJECT RULES', path: '/w/.code-desktop/instructions.md' },
    files: [{ path: '/h/AGENTS.md', scope: 'global', exists: true }, { path: '/w/AGENTS.md', scope: 'project', exists: true }, { path: '/w/CLAUDE.md', scope: 'project', exists: false }] });
  const result = await svc.read({ threadId: 't1' });
  assert.equal(result.measure, 'host-estimate');
  assert.equal(result.categories.systemPrompt.tokens, 1000);
  assert.equal(result.categories.systemPrompt.estimated, true);
  assert.equal(result.categories.mcpServerInstructions.tokens, Math.ceil('## code_desktop\nAPP TOOLS GUIDE'.length / 4));
  assert.ok(result.categories.mcpTools.tokens > 0);
  assert.ok(result.categories.mcpToolsDeferred.tokens > 0);
  assert.deepEqual(result.mcpTools.map((t) => `${t.serverName}/${t.name}/${t.isLoaded}`), ['code_desktop/notify/true', 'code_desktop/workflow/false', 'github/search/true']);
  assert.equal(result.categories.skills.tokens, Math.ceil('- deploy: Deploy it\n'.length / 4));
  assert.deepEqual(result.memoryFiles.map((f) => [f.path, f.type, f.tokens]), [['/h/AGENTS.md', 'User', 10], ['/w/AGENTS.md', 'Project', 100], ['/w/.code-desktop/instructions.md', 'Project', 4]]);
  assert.equal(result.categories.memoryFiles.tokens, 114);
  assert.equal(result.categories.systemTools, undefined, 'no schemas for built-in tools: no row');
  assert.ok(Object.values(result.sources).every((s) => s === 'host'));
  assert.equal(hasSchema({ inputSchema: { type: 'object' } }), false);
});

test('main: missing data drops only that category; a failing core read falls back to the host; no core, no report', async () => {
  const { svc } = service({ capabilities: { contextUsage: true }, fail: new Set(['codeDesktop/contextUsage/read', 'mcpServerStatus/list', 'skills/list']) });
  const result = await svc.read({ threadId: 't1' });
  assert.equal(result.measure, 'host-estimate');
  assert.deepEqual(result.categories, {});
  const native = service({ serverText: null });
  assert.equal((await native.svc.read({ threadId: 't1' })).categories.mcpServerInstructions, undefined, 'no instructions known to reach the model: no row');
  const none = createContextUsageService({ getClient: () => null, getConfig: () => config, coreSupports });
  assert.equal(await none.read({ threadId: 't1' }), null);
});

test('wiring: main serves "context-usage"; the rail context carries the read; agent-tools-host lists a session\'s tools', () => {
  const main = read('electron/main.cjs');
  assert.equal(main.split('case "context-usage": return contextUsageService.read({ threadId: p.threadId, cwd: p.cwd });').length - 1, 1);
  assert.ok(main.includes('sessionToolLists: (threadId) => agentTools.sessionToolLists(threadId),'));
  assert.ok(main.includes('appServerInstructions: (owner) => { try { return coreForEngine(owner?.serverInfo?.engine).kind === "native" ? null : require("./agent-tools-instructions.cjs").INSTRUCTIONS; }'));
  assert.ok(read('src/main.jsx').includes('contextUsageId: current, readContextUsage: (id) => call("context-usage", { threadId: id, cwd: workdir }),'));
  assert.ok(read('electron/agent-tools-host.cjs').includes('function sessionToolLists(threadId) {'));
  assert.ok(read('src/source-session-rail-context.jsx').includes('const report = useRailContextReport(host, w && u);'));
  const zh = read('electron/i18n/zh-CN/session.mjs');
  for (const s of ['"MCP tools": "MCP 工具",', '"Memory files": "记忆文件",', '"Custom agents": "自定义代理",', '"Context window": "上下文窗口",']) assert.ok(zh.includes(s), s);
});
