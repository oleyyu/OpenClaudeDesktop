// End-to-end check of the chrome-devtools MCP server on the preview (electron/devtools-mcp/). Not a unit test: it
// launches the app from source in an isolated profile (CODE_DESKTOP_DATA in a temp dir, removed afterwards), quietly —
// QUIET_HOOK (NODE_OPTIONS=--require) keeps every window invisible, unfocused and off the clipboard — with a fixture core
// that records the environment the app gave it, opens a local fixture page in the built-in browser, then:
//   A. starts the vendored chrome-devtools-mcp exactly as that definition says (the app's binary as Node, the harness path
//      scripts/bundle-harness.mjs packages) over stdio and runs its tools against the preview page;
//   B. (CODEX=1) runs the real Codex app-server through codex.cjs with the same server as `-c mcp_servers.chrome_devtools`
//      overrides (isolated HOME / CODEX_HOME, a 127.0.0.1 dummy model): mcpServerStatus/list and a list_pages call, one
//      direct, one by the model.
//
//   QUIET_HOOK=<quiet-hook.cjs> OUT=<dir> [CODEX=1] node scripts/devtools-mcp-e2e.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(import.meta.dirname, '..');
const out = path.resolve(process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'devtools-mcp-e2e-out-')));
fs.mkdirSync(out, { recursive: true });
const hook = process.env.QUIET_HOOK;
if (!hook || !fs.existsSync(hook)) throw new Error('QUIET_HOOK must name the quiet hook (windows invisible, no focus, no clipboard).');
const report = { steps: {}, tools: {}, errors: [] };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const step = (name, value) => { report.steps[name] = value; console.log(`[e2e] ${name}: ${typeof value === 'string' ? value : JSON.stringify(value).slice(0, 300)}`); };

// ---------------------------------------------------------------- fixture page (console.error with a source-mapped stack, a fetch, a button)
const original = ['function boom() {', '  console.error(new Error("fixture-error-123"));', '}', 'boom();', 'fetch("/api/data").then((r) => r.json()).then((d) => { document.title = "DevTools fixture " + d.value; });', ''];
const fixture = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>DevTools fixture</title><h1 id="h">Ready</h1><button id="go" onclick="document.getElementById(\'h\').textContent = \'Clicked \' + (window.n = (window.n || 0) + 1)">Press me</button><script src="/app.js"></script>'); return; }
  if (req.url === '/app.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(`${original.join('\n')}\n//# sourceMappingURL=/app.js.map\n`); return; }
  if (req.url === '/app.js.map') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ version: 3, file: 'app.js', sources: ['src/original-source.ts'], sourcesContent: [original.join('\n')], names: [], mappings: ['AAAA', ...original.slice(1).map(() => 'AACA')].join(';') })); return; }
  if (req.url === '/api/data') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ value: 'fixture-body-42' })); return; }
  res.writeHead(404); res.end();
});
await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
const pageUrl = `http://127.0.0.1:${fixture.address().port}/`;

// ---------------------------------------------------------------- isolated profile and a recording fixture core
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'devtools-mcp-e2e-'));
const work = path.join(profile, 'work');
fs.mkdirSync(work);
fs.writeFileSync(path.join(profile, 'preferences.json'), JSON.stringify({ cwd: work, mode: 'code', theme: 'light', locale: 'en-US', model: 'fixture', effort: 'high', permission: 'auto', threadIds: [], sidebarWidth: 288, displayName: 'Local user', onboardingComplete: true }));
fs.writeFileSync(path.join(profile, 'fixture-threads.json'), JSON.stringify({ next: 100, threads: {} }));
const dump = path.join(profile, 'core-env.json');
const core = path.join(profile, 'recording-core.cjs');
fs.writeFileSync(core, `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(dump)}, JSON.stringify({ argv: process.argv.slice(2), devtools: process.env.CODE_DESKTOP_DEVTOOLS_MCP_SERVER || null }));\nrequire(${JSON.stringify(path.join(appRoot, 'tests/fixtures/codex-server.cjs'))});\n`);
fs.chmodSync(core, 0o755);
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODE_DESKTOP_OFFSCREEN_LAUNCH: '1', CODEX_BINARY: core, CODE_DESKTOP_COWORK: '0', CODEX_HOME: path.join(profile, 'codex-home'), };
fs.mkdirSync(env.CODEX_HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;

let app = null, mcp = null;
try {
  app = await electron.launch({ executablePath: path.join(appRoot, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: ['-r', hook, appRoot], env, timeout: 60000, colorScheme: null });
  const page = await app.firstWindow();
  page.on('pageerror', (error) => report.errors.push(`page: ${String(error.message).slice(0, 200)}`));
  const quiet = await app.evaluate(({ BrowserWindow }) => ({ hook: global.__quietHook === true, windows: BrowserWindow.getAllWindows().map((w) => ({ visible: w.isVisible(), focused: w.isFocused(), opacity: w.getOpacity() })) }));
  step('quiet', quiet);
  if (!quiet.hook || quiet.windows.some((w) => w.focused || w.opacity > 0)) throw new Error('Not quiet: stopping before anything else.');
  // No clipboard writes from the app while the probe runs.
  await app.evaluate(({ clipboard }) => { clipboard.writeText = () => {}; clipboard.write = () => {}; clipboard.writeHTML = () => {}; clipboard.writeImage = () => {}; });
  for (let i = 0; i < 120 && !fs.existsSync(dump); i += 1) await sleep(250);
  const recorded = JSON.parse(fs.readFileSync(dump, 'utf8'));
  const definition = JSON.parse(recorded.devtools);
  step('definition', { name: definition.name, command: definition.command, args: definition.args.map((arg) => arg.replace(/[0-9a-f]{64}/, '<token>')), env: definition.env });

  // The built-in browser opens the fixture (the New session page's preview of the work folder).
  const sessionId = `home:${work}`;
  await page.evaluate(({ sessionId, url }) => window.desktop.call('preview-navigate', { sessionId, url }), { sessionId, url: pageUrl });
  let state = null;
  for (let i = 0; i < 60; i += 1) { state = await page.evaluate((sessionId) => window.desktop.call('preview-state', { sessionId }), sessionId); if (state?.title?.startsWith('DevTools fixture ')) break; await sleep(250); }
  step('previewOpened', { url: state?.url, title: state?.title, tabs: state?.tabs?.length });
  const appWindowUrl = page.url();

  // ---------------------------------------------------------------- A. chrome-devtools-mcp over stdio
  mcp = spawn(definition.command, definition.args, { env: { PATH: process.env.PATH, HOME: profile, TMPDIR: os.tmpdir(), ...definition.env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  mcp.stderr.on('data', (chunk) => { stderr += chunk; });
  const pending = new Map();
  let buffer = '', nextId = 0;
  mcp.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      if (message.id !== undefined && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    }
  });
  const rpc = (method, params = {}) => { nextId += 1; const id = nextId; mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 120000); pending.set(id, (message) => { clearTimeout(timer); resolve(message); }); }); };
  const text = (result) => (result?.content ?? []).filter((part) => part.type === 'text').map((part) => part.text).join('\n');
  let currentPage = null;
  const call = async (name, args = {}) => {
    if (currentPage !== null && tools[name]?.inputSchema?.properties?.pageId && args.pageId === undefined) args = { pageId: currentPage, ...args };
    const reply = await rpc('tools/call', { name, arguments: args });
    const value = reply.error ? `ERROR ${reply.error.message}` : `${reply.result?.isError ? 'ISERROR ' : ''}${text(reply.result)}`;
    report.tools[name] = (report.tools[name] ? `${report.tools[name]}\n---\n` : '') + value.slice(0, 3000);
    console.log(`[e2e] tool ${name}(${JSON.stringify(args)}) → ${value.slice(0, 400).replace(/\n/g, ' ⏎ ')}`);
    return { ok: !reply.error && !reply.result?.isError, value };
  };
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'devtools-mcp-e2e', version: '1' } });
  step('initialize', init.result?.serverInfo);
  mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const listed = await rpc('tools/list');
  const tools = Object.fromEntries((listed.result?.tools ?? []).map((tool) => [tool.name, tool]));
  step('toolCount', Object.keys(tools).length);
  fs.writeFileSync(path.join(out, 'tools.json'), JSON.stringify(listed.result?.tools ?? [], null, 2));

  const pages = await call('list_pages');
  step('list_pages.onlyPreview', pages.ok && pages.value.includes(pageUrl) && !pages.value.includes(appWindowUrl) && !/app:\/\/|index\.html|localhost:4331/.test(pages.value));
  const pageId = Number(/(\d+): .*?127\.0\.0\.1/.exec(pages.value)?.[1] ?? 1);
  const selectArgs = tools.select_page?.inputSchema?.properties?.pageId ? { pageId } : { pageIdx: pageId };
  step('select_page', (await call('select_page', selectArgs)).ok);
  currentPage = pageId;
  const snapshot = await call('take_snapshot');
  const uid = /uid=(\S+) button "Press me"/.exec(snapshot.value)?.[1];
  step('take_snapshot', snapshot.ok && !!uid);
  // Like Chrome's own DevTools, the server collects console and network from when it attached: reload to capture the load.
  step('navigate_page.reload', (await call('navigate_page', { type: 'reload' })).ok);
  await sleep(800);
  const consoleList = await call('list_console_messages');
  step('list_console_messages', consoleList.ok && consoleList.value.includes('fixture-error-123'));
  const msgid = /msgid=(\d+)[^\n]*fixture-error-123/.exec(consoleList.value)?.[1];
  if (msgid && tools.get_console_message) {
    const message = await call('get_console_message', { msgid: Number(msgid) });
    step('get_console_message.sourceMapped', message.ok && message.value.includes('original-source.ts'));
  }
  const network = await call('list_network_requests');
  const reqid = /reqid=(\d+)[^\n]*\/api\/data/.exec(network.value)?.[1];
  step('list_network_requests', network.ok && !!reqid);
  const request = await call('get_network_request', { reqid: Number(reqid) });
  step('get_network_request.body', request.ok && request.value.includes('fixture-body-42'));
  const evaluated = await call('evaluate_script', { function: '() => document.title' });
  step('evaluate_script', evaluated.ok && evaluated.value.includes('DevTools fixture fixture-body-42'));
  // The reload above replaced the document: a fresh snapshot names the button again.
  const fresh = /uid=(\S+) button "Press me"/.exec((await call('take_snapshot')).value)?.[1];
  const clicked = await call('click', { uid: fresh });
  const after = await call('evaluate_script', { function: '() => document.getElementById("h").textContent' });
  step('click', clicked.ok && after.value.includes('Clicked 1'));
  const traceStart = await call('performance_start_trace', { reload: false, autoStop: false });
  await sleep(1500);
  const traceStop = await call('performance_stop_trace');
  step('performance_trace', traceStart.ok && traceStop.ok && /trace|Insight|LCP|INP|CLS/i.test(traceStop.value));
  // A new page is a new preview tab (in the same browser), and closing it closes the tab.
  if (tools.new_page) {
    const opened = await call('new_page', { url: `${pageUrl}?second` });
    const tabs = (await page.evaluate((sessionId) => window.desktop.call('preview-state', { sessionId }), sessionId))?.tabs?.length;
    step('new_page', { ok: opened.ok, previewTabs: tabs });
    const listedAgain = await call('list_pages');
    const secondId = Number(/(\d+): [^\n]*\?second/.exec(listedAgain.value)?.[1] ?? 0);
    if (secondId && tools.close_page) {
      const closed = await call('close_page', { pageId: secondId });
      const left = (await page.evaluate((sessionId) => window.desktop.call('preview-state', { sessionId }), sessionId))?.tabs?.length;
      step('close_page', { ok: closed.ok, previewTabs: left });
    }
  }
  // An outside site the preview wasn't allowed to open stays closed to it.
  const outside = await call('navigate_page', { type: 'url', url: 'https://example.com/' });
  step('navigate_page.outsideRefused', !outside.ok || /isn’t allowed|not allowed/i.test(outside.value));
  step('mcpStderrTail', stderr.split('\n').filter(Boolean).slice(-5));

  // ---------------------------------------------------------------- B. the real Codex core with the same server
  if (process.env.CODEX === '1') {
    const binary = process.env.CODEX_INTEGRATION_BINARY || path.join(os.homedir(), '.local/bin/codex');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'devtools-mcp-codex-'));
    for (const dir of ['home', 'codex', 'xdg/config', 'xdg/data', 'xdg/cache', 'xdg/state', 'work']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    Object.assign(process.env, { HOME: path.join(root, 'home'), CODEX_HOME: path.join(root, 'codex'), XDG_CONFIG_HOME: path.join(root, 'xdg/config'), XDG_DATA_HOME: path.join(root, 'xdg/data'),
      XDG_CACHE_HOME: path.join(root, 'xdg/cache'), XDG_STATE_HOME: path.join(root, 'xdg/state'), CODE_DESKTOP_CORE: 'codex', CODE_DESKTOP_CORE_SYSTEM_PATHS: '', DUMMY_KEY: 'dummy' });
    for (const key of ['CODEX_BINARY', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'NODE_OPTIONS']) delete process.env[key];
    const modelRequests = [];
    const model = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const json = body ? JSON.parse(body) : {};
        const input = JSON.stringify(json.input ?? []);
        const namespace = (json.tools || []).find((tool) => tool.type === 'namespace' && tool.name === 'mcp__chrome_devtools');
        modelRequests.push({ namespaceTools: namespace ? (namespace.tools || []).map((tool) => tool.name) : null, input });
        if (req.method !== 'POST' || !req.url.endsWith('/responses')) { res.writeHead(404); res.end('{}'); return; }
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const n = modelRequests.length;
        const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
        event('response.created', { response: { id: `r${n}`, object: 'response', status: 'in_progress', output: [] } });
        const item = namespace && !input.includes('function_call_output')
          ? { id: `fc${n}`, type: 'function_call', status: 'completed', name: 'list_pages', namespace: 'mcp__chrome_devtools', call_id: `call_${n}`, arguments: '{}' }
          : { id: `m${n}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'done', annotations: [] }] };
        event('response.output_item.added', { output_index: 0, item });
        event('response.output_item.done', { output_index: 0, item });
        event('response.completed', { response: { id: `r${n}`, object: 'response', status: 'completed', output: [], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } } });
        res.end();
      });
    });
    await new Promise((resolve) => model.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${model.address().port}/v1`;
    // Codex is an Extension Pack core here (core-registry.mjs): registered as the app does once the pack is added.
    const registry = await import('../electron/core-registry.mjs');
    registry.registerCores([(await import('../electron/cores/codex.mjs')).default]);
    const { CodexClient, setCoreChoice, setCodexLaunch, setAgentToolsLaunch } = require('../electron/codex.cjs');
    const { codexArgsFor } = require('../electron/devtools-mcp/index.cjs');
    setCoreChoice({ core: 'codex', agents: { codex: { path: binary } } });
    setCodexLaunch({ args: ['-c', 'model_provider="dummy"', '-c', `model_providers.dummy={name="dummy",base_url="${base}",wire_api="responses",env_key="DUMMY_KEY"}`, '-c', 'model="dummy-model"'], env: {} });
    setAgentToolsLaunch(() => ({ env: { CODE_DESKTOP_DEVTOOLS_MCP_SERVER: JSON.stringify(definition) }, codexArgs: codexArgsFor(definition) }));
    const client = new CodexClient({ serverCwd: path.join(root, 'work'), initializeTimeout: 30000, shellProxy: () => ({}) });
    try {
      await client.start();
      step('codex.spawnArgs', client.child.spawnargs.filter((arg) => arg.startsWith('mcp_servers.chrome_devtools.')).map((arg) => arg.replace(/[0-9a-f]{64}/, '<token>')));
      const started = await client.request('thread/start', { cwd: path.join(root, 'work'), approvalPolicy: 'on-request', sandbox: 'workspace-write' });
      const threadId = started.thread.id;
      let status = null;
      for (let i = 0; i < 80; i += 1) {
        status = (await client.request('mcpServerStatus/list', { threadId })).data.find((entry) => entry.name === 'chrome_devtools');
        if (status?.runtimeStatus === 'connected' && Object.keys(status.tools ?? {}).length) break;
        await sleep(250);
      }
      step('codex.mcpServerStatus', { name: status?.name, runtimeStatus: status?.runtimeStatus, tools: Object.keys(status?.tools ?? {}).length, hasListPages: !!status?.tools?.list_pages });
      const direct = await client.request('mcpServer/tool/call', { threadId, server: 'chrome_devtools', tool: 'list_pages', arguments: {} });
      const directText = (direct.content ?? []).map((part) => part.text).join('\n');
      step('codex.list_pages.direct', directText.includes(pageUrl) ? directText.slice(0, 300) : `FAILED ${JSON.stringify(direct).slice(0, 300)}`);
      const items = [];
      const done = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('turn/completed did not arrive')), 90000);
        client.on('event', (event) => {
          if (event.method === 'item/completed' && event.params?.item?.type === 'mcpToolCall') items.push(event.params.item);
          if (event.method === 'turn/completed' && event.params?.threadId === threadId) { clearTimeout(timer); resolve(event.params); }
        });
      });
      await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'list the pages', text_elements: [] }] });
      const completed = await done;
      step('codex.turn', { status: completed.turn?.status, modelSawTools: modelRequests.some((r) => r.namespaceTools?.includes('list_pages')),
        call: items.map((item) => ({ server: item.server, tool: item.tool, status: item.status, text: String(item.result?.content?.[0]?.text ?? '').slice(0, 200) })) });
    } finally {
      await client.stopAndWait().catch(() => {});
      model.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
} catch (error) {
  report.errors.push(String(error?.stack || error).slice(0, 2000));
  console.error(error);
} finally {
  try { mcp?.stdin.end(); mcp?.kill(); } catch {}
  try { await app?.close(); } catch {}
  fixture.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  fs.rmSync(profile, { recursive: true, force: true });
  console.log(`[e2e] report: ${path.join(out, 'report.json')}`);
}
