// Settings › Computer use › Computer use provider (electron/computer-use/provider.cjs, config.computerUseProvider): a core
// that lists "ComputerUse" in nativeTools keeps its own computer use unless the user picks OpenClaude Desktop's; every
// other core gets OpenClaude Desktop's computer-use group (agent-tools/computer-use.mjs, native "ComputerUse") either way.
// The host side runs without a socket: ready() + listTools(), as main.cjs agentToolServedToCore asks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { registerCodexPack } from './codex-pack.mjs';
import { coreCapabilities, allCores } from '../electron/core-registry.mjs';
import * as computerUseTools from '../electron/agent-tools/computer-use.mjs';
import * as files from '../electron/agent-tools/files.mjs';
import * as preview from '../electron/agent-tools/preview.mjs';

registerCodexPack();
const require = createRequire(import.meta.url);
const provider = require('../electron/computer-use/provider.cjs');
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const app = path.resolve(import.meta.dirname, '..');

test('the saved choice: unset or unknown reads as the agent’s own first', () => {
  assert.deepEqual(provider.PROVIDERS, ['core', 'openclaude']);
  assert.equal(provider.computerUseProvider(undefined), 'core');
  assert.equal(provider.computerUseProvider({}), 'core');
  assert.equal(provider.computerUseProvider({ computerUseProvider: 'bogus' }), 'core');
  assert.equal(provider.computerUseProvider({ computerUseProvider: 'core' }), 'core');
  assert.equal(provider.computerUseProvider({ computerUseProvider: 'openclaude' }), 'openclaude');
});

test('the three cases: a core with its own, and either choice', () => {
  assert.equal(provider.coreHasComputerUse({ nativeTools: ['AskUserQuestion', 'ComputerUse'] }), true, 'declared in nativeTools');
  assert.equal(provider.coreHasComputerUse({ nativeTools: ['AskUserQuestion'], ownComputerUse: true }), true, 'reported (the ZCode bridge)');
  assert.equal(provider.coreHasComputerUse({ nativeTools: ['AskUserQuestion'], ownComputerUse: false }), false);
  assert.equal(provider.coreHasComputerUse(undefined), false);
  // Agent’s own first.
  assert.equal(provider.servesOpenClaudeComputerUse({ provider: 'core', own: true }), false, 'its own, not ours');
  assert.equal(provider.coreComputerUseOff({ provider: 'core', own: true }), false, 'its own stays on');
  assert.equal(provider.servesOpenClaudeComputerUse({ provider: 'core', own: false }), true, 'none of its own: ours');
  // Always OpenClaude Desktop’s.
  assert.equal(provider.servesOpenClaudeComputerUse({ provider: 'openclaude', own: true }), true);
  assert.equal(provider.coreComputerUseOff({ provider: 'openclaude', own: true }), true, 'its own is turned off');
  assert.equal(provider.servesOpenClaudeComputerUse({ provider: 'openclaude', own: false }), true);
  assert.equal(provider.coreComputerUseOff({ provider: 'openclaude', own: false }), false, 'nothing to turn off');
});

test('Codex: the Codex app’s computer-use plugins or MCP server in config.toml, and the thread overrides that turn exactly those off', () => {
  assert.deepEqual(provider.codexComputerUse(null), { own: false, off: {} }, 'config/read failed: none');
  assert.deepEqual(provider.codexComputerUse({ plugins: { 'browser@openai-bundled': { enabled: true } } }), { own: false, off: {} });
  // This Mac's config.toml (2026-10-30): both plugins on, the MCP server off.
  assert.deepEqual(provider.codexComputerUse({
    plugins: { 'computer-use@openai-bundled': { enabled: true }, 'unified-computer-use@openai-bundled': { enabled: true } },
    mcp_servers: { 'computer-use': { command: 'SkyComputerUseClient', enabled: false } },
  }), { own: true, off: { 'plugins.computer-use@openai-bundled.enabled': false, 'plugins.unified-computer-use@openai-bundled.enabled': false } });
  assert.deepEqual(provider.codexComputerUse({ plugins: { 'unified-computer-use@openai-bundled': { enabled: false } }, mcp_servers: { 'computer-use': { command: 'x' } } }),
    { own: true, off: { 'mcp_servers.computer-use.enabled': false } }, 'a server without enabled counts as on');
});

test('the computer-use group stands in for ComputerUse; main.cjs asks the provider for it', () => {
  assert.equal(computerUseTools.group, 'computer-use');
  assert.equal(computerUseTools.native, provider.NATIVE_NAME);
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.match(main, /if \(tool\.native === computerUseProviders\.NATIVE_NAME\) return computerUseProviders\.servesOpenClaudeComputerUse\(\{ provider: computerUseProviders\.computerUseProvider\(config\), own: coreOwnComputerUse\(owner, session\) \}\);/);
  // Codex: recorded per session at thread/start|resume as it runs (own only while not turned off), the overrides added
  // with Always OpenClaude Desktop’s, and again on a fork or a resume that doesn’t come from the window.
  assert.match(main, /const found = computerUseProviders\.codexComputerUse\(codexConfig\);\n\s+const off = computerUseProviders\.coreComputerUseOff\(\{ provider: computerUseProviders\.computerUseProvider\(config\), own: found\.own \}\);\n\s+if \(off\) params\.config = \{ \.\.\.\(params\.config && typeof params\.config === "object" \? params\.config : \{\}\), \.\.\.found\.off \};\n\s+rememberCodexComputerUse\(params\.config\?\.\[AGENT_SESSION_KEY\], \{ own: found\.own && !off, off: found\.off \}\);/);
  assert.match(main, /const recorded = \["thread\/fork", "thread\/resume"\]\.includes\(method\) \? codexComputerUseOwn\.get\(params\.threadId\) : undefined;\n\s+if \(recorded\) \{\n\s+const off = [^\n]+\n\s+if \(off\) params\.config = \{ \.\.\.params\.config, \.\.\.recorded\.off \};\n\s+rememberCodexComputerUse\(identity, off \? \{ own: false, off: recorded\.off \} : recorded\);/);
  assert.match(main, /"codeDesktop\/appTools\/changed", \{ revision: agentTools\.revision, computerUse: computerUseProviders\.computerUseProvider\(config\) \}/, 'the bridges hear the new choice');
  assert.match(main, /return typeof session === "string" && codexComputerUseOwn\.get\(session\)\?\.own === true;/);
  // The bridges: the choice on every thread and turn request (the ZCode bridge withholds node_repl with "openclaude").
  assert.match(main, /params\.codeDesktop\.computerUse = computerUseProviders\.computerUseProvider\(config\);/);
  assert.match(main, /if \(computerUseProviders\.PROVIDERS\.includes\(p\.computerUseProvider\)\) config\.computerUseProvider = p\.computerUseProvider;/);
  assert.match(main, /computerUseProviders\.PROVIDERS\.includes\(p\.computerUseProvider\) \|\| [^\n]*\{\n\s+agentTools\.notifyListChanged\(\);/, 'a change re-lists the tools');
});

test('tool lists per core and choice, through the agent-tools host', async () => {
  const tmpRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cd-cu-provider-')));
  let config = {}, nativeTools = [];
  // main.cjs agentToolServedToCore / coreOwnComputerUse, for the two kinds of stand-in here.
  const isToolListed = (entry) => {
    if (!entry.native) return true;
    if (entry.native === provider.NATIVE_NAME) return provider.servesOpenClaudeComputerUse({ provider: provider.computerUseProvider(config), own: provider.coreHasComputerUse({ nativeTools }) });
    return !nativeTools.includes(entry.native);
  };
  const host = createAgentToolsHost({ modules: [computerUseTools, files], tmpRoot, logger: { warn() {}, log() {} }, resolveSession: () => null, isToolListed });
  try {
    await host.ready();
    const names = () => host.listTools().map((entry) => entry.name);
    const cu = ['request_access', 'screenshot', 'left_click', 'app_screenshot', 'app_click'];
    const has = (list) => cu.every((name) => list.includes(name));
    const none = (list) => cu.every((name) => !list.includes(name));

    nativeTools = ['ComputerUse'];
    config = {};
    assert.ok(none(names()), 'a core with its own, default: ours left out');
    assert.ok(names().includes('SendUserFile'), 'other tools stay');
    config = { computerUseProvider: 'openclaude' };
    assert.ok(has(names()), 'a core with its own, Always OpenClaude Desktop’s: ours');

    nativeTools = ['SendUserFile'];
    config = {};
    assert.ok(has(names()), 'a core without its own, default: ours');
    assert.ok(!names().includes('SendUserFile'), 'the other stand-in rule is unchanged');
    config = { computerUseProvider: 'openclaude' };
    assert.ok(has(names()), 'a core without its own, Always OpenClaude Desktop’s: ours');

    nativeTools = ['ComputerUse'];
    config = {};
    await assert.rejects(host.call('x', { name: 'screenshot', arguments: {} }), /isn’t offered to this agent/);
  } finally { fs.rmSync(tmpRoot, { recursive: true, force: true }); }
});

test('a shared name (screenshot): a core with its own keeps the preview one, even where the session prefers computer use’s', async () => {
  const tmpRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cd-cu-provider-')));
  let own = true;
  const isToolListed = (entry) => entry.native !== provider.NATIVE_NAME || provider.servesOpenClaudeComputerUse({ provider: 'core', own });
  const host = createAgentToolsHost({ modules: [preview, computerUseTools], tmpRoot, logger: { warn() {}, log() {} }, resolveSession: () => null, isToolListed,
    prefersSharedTool: (tool) => tool.group === 'computer-use' });
  try {
    await host.ready();
    const shot = () => host.listTools().find((entry) => entry.name === 'screenshot');
    assert.ok(shot(), 'screenshot is still listed');
    const previewShot = preview.tools.find((tool) => tool.name === 'screenshot'), cuShot = computerUseTools.tools.find((tool) => tool.name === 'screenshot');
    assert.notEqual(previewShot.description, cuShot.description);
    assert.equal(shot().description, previewShot.description, 'the preview one');
    own = false;
    assert.equal(shot().description, cuShot.description, 'none of its own: computer use’s, as the session prefers');
  } finally { fs.rmSync(tmpRoot, { recursive: true, force: true }); }
});

test('which cores have computer use of their own (capabilities)', () => {
  // None declares it: Codex's comes from the Codex app's plugins (per session, codexComputerUse) and ZCode's from its
  // plugin (the bridge reports ownComputerUse); DeepSeek Harness, Gemini and the rest have none of their own.
  const own = allCores().filter((core) => provider.coreHasComputerUse(coreCapabilities({ engine: core.engine }))).map((core) => core.id);
  assert.deepEqual(own, []);
  assert.equal(provider.coreHasComputerUse(coreCapabilities({ engine: 'zcode', capabilities: { ownComputerUse: true } })), true, 'the ZCode bridge’s report counts');
});
