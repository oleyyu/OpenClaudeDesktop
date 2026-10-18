import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// The agent tools in the packaged app: the package script keeps electron/agent-tools-server.mjs, the host and the tool
// modules inside app.asar, and a core starts the server as `<OpenClaude Desktop binary> <…/app.asar/electron/agent-tools-server.mjs>`
// with ELECTRON_RUN_AS_NODE=1 (agent-tools-host.cjs serverCommand). A production-like app.asar is built with
// @electron/asar from what the package filter keeps; Electron (as Node) then loads the host and the real tool modules
// from inside it, starts the server exactly as a core would and speaks MCP to it over stdio (initialize, tools/list,
// tools/call relayed through the host's private socket).
const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
const packager = (file) => import(pathToFileURL(path.join(app, 'node_modules/@electron/packager/dist', file)).href);
const asar = () => import(pathToFileURL(path.join(app, 'node_modules/@electron/asar/lib/asar.js')).href);
const TMP = '/private/tmp/claude-501';

function packagerArgs(script) {
  const command = script.split('&&').map((part) => part.trim()).find((part) => part.startsWith('electron-packager'));
  const words = [];
  for (const match of command.matchAll(/'([^']*)'|(\S+)/g)) {
    if (match[1] !== undefined) words.push(match[1]);
    else words.push(match[2].replace(/'([^']*)'/g, '$1'));
  }
  return words.slice(1);
}

let filter, opts;
test.before(async () => {
  const { parseArgs } = await packager('cli.js');
  opts = parseArgs(packagerArgs(pkg.scripts.package));
  const { populateIgnoredPaths, userPathFilter } = await packager('copy-filter.js');
  opts.dir = app;
  populateIgnoredPaths(opts);
  filter = userPathFilter(opts);
});

const TOOL_FILES = ['agent-tools-server.mjs', 'agent-tools-host.cjs', 'agent-tools-instructions.cjs', 'agent-tool-approval.cjs', 'agent-tools/preview.mjs', 'agent-tools/terminal.mjs',
  'preview-launch.mjs', 'terminal-model.mjs',
  // preview-launch.mjs imports the official autoPort/port checks (R3b-preview, scripts/extract-r3b-preview.mjs).
  'generated/r3b-preview-launch-fields.mjs'];

test('the package script keeps the agent tools server, its host and the tool modules (inside app.asar, not unpacked)', async () => {
  for (const file of TOOL_FILES) assert.equal(await filter(path.join(app, 'electron', file)), true, `electron/${file} is packaged`);
  // Only node-pty's prebuilds are unpacked: the server is plain JavaScript read through Electron's asar support.
  assert.deepEqual(opts.asar, { unpackDir: 'node_modules/node-pty/prebuilds' });
});

test('from inside app.asar, Electron as Node runs the host with the real tool modules and the stdio server a core starts', { timeout: 60000 }, async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'agent-tools-asar-'));
  try {
    const stage = path.join(root, 'stage');
    const copy = async (relative) => {
      const from = path.join(app, relative);
      if (!(await filter(from))) return;
      const stat = fs.statSync(from);
      if (stat.isDirectory()) { for (const name of fs.readdirSync(from)) await copy(path.join(relative, name)); return; }
      fs.mkdirSync(path.dirname(path.join(stage, relative)), { recursive: true });
      fs.copyFileSync(from, path.join(stage, relative));
    };
    for (const file of TOOL_FILES) await copy(path.join('electron', file));
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ name: 'probe', main: 'probe.cjs' }));
    fs.writeFileSync(path.join(stage, 'probe.cjs'), `
      const path = require("node:path");
      const readline = require("node:readline");
      const { spawn } = require("node:child_process");
      const { createAgentToolsHost } = require("./electron/agent-tools-host.cjs");
      const folder = process.argv[2];
      const host = createAgentToolsHost({ tmpRoot: folder, logger: { warn: (text) => console.error(text), log() {} },
        resolveSession: (id, meta) => ((id ?? meta.threadId) === "thread-a" ? { id: "thread-a", cwd: folder } : null) });
      (async () => {
        await host.start();
        const env = host.launchEnv(), server = JSON.parse(env.CODE_DESKTOP_AGENT_TOOLS_SERVER);
        // Started the way a core starts it: the server definition's command, args and env, plus the channel variables.
        const child = spawn(server.command, server.args, { env: { PATH: "/usr/bin:/bin", HOME: folder, ...server.env,
          CODE_DESKTOP_AGENT_TOOLS_SOCKET: env.CODE_DESKTOP_AGENT_TOOLS_SOCKET, CODE_DESKTOP_AGENT_TOOLS_TOKEN: env.CODE_DESKTOP_AGENT_TOOLS_TOKEN,
          CODE_DESKTOP_AGENT_SESSION: "thread-a" }, stdio: ["pipe", "pipe", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        const pending = new Map();
        readline.createInterface({ input: child.stdout }).on("line", (line) => { const message = JSON.parse(line); pending.get(message.id)?.(message); });
        let seq = 0;
        const request = (method, params) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, resolve);
          setTimeout(() => reject(new Error(method + " timed out: " + stderr)), 15000).unref();
          child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\\n"); });
        const init = await request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "probe", version: "1" } });
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\\n");
        const listed = await request("tools/list", {});
        const called = await request("tools/call", { name: "list_terminal_tabs", arguments: {} });
        child.stdin.end();
        await host.stop();
        console.log(JSON.stringify({ asar: __dirname.endsWith(".asar"), command: server.command, args: server.args, env: server.env,
          protocol: init.result?.protocolVersion, tools: (listed.result?.tools ?? []).map((tool) => tool.name), called }));
      })().catch((error) => { console.error(error.stack); process.exit(1); });`);
    const { createPackageWithOptions } = await asar();
    const out = path.join(root, 'out');
    fs.mkdirSync(out);
    await createPackageWithOptions(stage, path.join(out, 'app.asar'), { unpackDir: opts.asar.unpackDir });
    assert.equal(fs.existsSync(path.join(out, 'app.asar.unpacked/electron')), false, 'nothing of the server is unpacked');
    const folder = fs.mkdtempSync(path.join(TMP, 'agent-tools-asar-cwd-'));
    const electron = require(path.join(app, 'node_modules/electron'));
    const run = spawnSync(electron, [path.join(out, 'app.asar/probe.cjs'), folder], {
      env: { PATH: '/usr/bin:/bin', HOME: folder, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 45000 });
    fs.rmSync(folder, { recursive: true, force: true });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const result = JSON.parse(run.stdout.trim().split('\n').pop());
    assert.equal(result.asar, true, 'the host ran from inside app.asar');
    assert.equal(result.command, electron, 'the server runs on the app binary');
    assert.deepEqual(result.args, [path.join(out, 'app.asar/electron/agent-tools-server.mjs')], 'the server script is the one inside app.asar');
    assert.deepEqual(result.env, { ELECTRON_RUN_AS_NODE: '1' });
    assert.equal(result.protocol, '2025-06-18');
    for (const name of ["list_terminal_tabs", "preview_start"]) assert.ok(result.tools.includes(name), `${name} is listed from the asar's tool modules`);
    // The call went through the relay to the host; with no terminal service in this probe the tool reports that itself.
    assert.ok(Array.isArray(result.called.result?.content), JSON.stringify(result.called));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
