import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

const require = createRequire(import.meta.url);
const { MARKER, parseShellProxy, proxyEnv, readLoginShellProxy } = require('../electron/proxy-env.cjs');

test('Only the login shell proxy variables are read, between the markers', () => {
  const output = `rc noise\nHTTPS_PROXY=x\n${MARKER}HOME=/Users/a\nhttps_proxy=http://127.0.0.1:7890\nALL_PROXY=socks5://127.0.0.1:7891\nOPENAI_API_KEY=secret\nNO_PROXY=corp.example\nEMPTY_PROXY=\n${MARKER}trailing`;
  assert.deepEqual(parseShellProxy(output), {HTTPS_PROXY:'http://127.0.0.1:7890',ALL_PROXY:'socks5://127.0.0.1:7891',NO_PROXY:'corp.example'});
  assert.deepEqual(parseShellProxy('no markers HTTPS_PROXY=http://p'), {});
  assert.deepEqual(parseShellProxy(undefined), {});
});

test('The spawn environment gains the shell proxy in both spellings and keeps loopback direct', () => {
  assert.deepEqual(proxyEnv({}, {}), {});
  assert.deepEqual(proxyEnv({}, {NO_PROXY:'corp'}), {});
  assert.deepEqual(proxyEnv({PATH:'/bin'}, {HTTPS_PROXY:'http://127.0.0.1:7890'}), {
    HTTPS_PROXY:'http://127.0.0.1:7890', https_proxy:'http://127.0.0.1:7890',
    NO_PROXY:'localhost,127.0.0.1,::1', no_proxy:'localhost,127.0.0.1,::1', NODE_USE_ENV_PROXY:'1',
  });
  // The app's own environment (a launch from Terminal) wins; NO_PROXY keeps its entries and gains loopback.
  assert.deepEqual(proxyEnv({https_proxy:'http://own:1', NO_PROXY:'corp, localhost'}, {HTTPS_PROXY:'http://shell:2', HTTP_PROXY:'http://shell:3'}), {
    HTTP_PROXY:'http://shell:3', http_proxy:'http://shell:3',
    NO_PROXY:'corp,localhost,127.0.0.1,::1', no_proxy:'corp,localhost,127.0.0.1,::1', NODE_USE_ENV_PROXY:'1',
  });
  // Node only reads the proxy variables when NODE_USE_ENV_PROXY is set: added unless the environment already has it.
  assert.deepEqual(proxyEnv({HTTPS_PROXY:'http://own:1', NO_PROXY:'localhost,127.0.0.1,::1'}, {}), {NODE_USE_ENV_PROXY:'1'});
  assert.deepEqual(proxyEnv({HTTPS_PROXY:'http://own:1', NO_PROXY:'localhost,127.0.0.1,::1', NODE_USE_ENV_PROXY:'0'}, {}), {});
});

test('The login shell is read once as an interactive login shell, and fails closed to no proxy', async () => {
  const calls = [];
  const fake = (output, { error = false, hang = false } = {}) => (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.kill = () => { child.killed = true; };
    setImmediate(() => {
      if (error) return child.emit('error', new Error('ENOENT'));
      if (hang) return;
      child.stdout.end(output);
      child.emit('close', 0);
    });
    return child;
  };
  const read = await readLoginShellProxy({ platform:'darwin', env:{SHELL:'/bin/zsh', PATH:'/bin'}, spawnImpl: fake(`${MARKER}HTTP_PROXY=http://127.0.0.1:7890\n${MARKER}`) });
  assert.deepEqual(read, {HTTP_PROXY:'http://127.0.0.1:7890'});
  assert.equal(calls[0].command, '/bin/zsh');
  assert.deepEqual(calls[0].args.slice(0, 3), ['-i', '-l', '-c']);
  assert.equal(calls[0].options.env.CODE_DESKTOP_RESOLVING_ENVIRONMENT, '1');
  assert.deepEqual(calls[0].options.stdio, ['ignore', 'pipe', 'ignore']);
  assert.deepEqual(await readLoginShellProxy({ platform:'darwin', env:{SHELL:'zsh'}, spawnImpl: fake('', { error:true }) }), {});
  assert.equal(calls[1].command, '/bin/zsh');
  assert.deepEqual(await readLoginShellProxy({ platform:'linux', env:{}, timeout:20, spawnImpl: fake('', { hang:true }) }), {});
  assert.equal(calls[2].command, '/bin/sh');
  assert.deepEqual(await readLoginShellProxy({ platform:'win32', spawnImpl: () => { throw new Error('not called'); } }), {});
});

// Before the next test: its stopAllCodexClients shuts every client down for the rest of the file.
test('A core spawn carries its declared shell variables (options.shellEnv for a fixture)', async (t) => {
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { CodexClient } = require('../electron/codex.cjs');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'shell-env-test-'));
  const binary = path.join(directory, 'env-server.cjs'), log = path.join(directory, 'env.json');
  await fs.writeFile(binary, `#!${process.execPath}
const fs = require('node:fs');
fs.writeFileSync(process.env.ENV_LOG, JSON.stringify({ key: process.env.CD_TEST_GEMINI_KEY ?? null, project: process.env.CD_TEST_PROJECT ?? null }));
require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + '\\n');
});
`, { mode: 0o755 });
  const saved = process.env.CD_TEST_PROJECT;
  process.env.CD_TEST_PROJECT = 'electron-own';
  t.after(async () => { if (saved === undefined) delete process.env.CD_TEST_PROJECT; else process.env.CD_TEST_PROJECT = saved; await fs.rm(directory, { recursive: true, force: true }); });
  const client = new CodexClient({ binary, env: { ENV_LOG: log }, shellProxy: async () => ({}), shellEnv: async () => ({ CD_TEST_GEMINI_KEY: 'from-zshrc', CD_TEST_PROJECT: 'from-zshrc' }) });
  await client.start();
  assert.deepEqual(JSON.parse(await fs.readFile(log, 'utf8')), { key: 'from-zshrc', project: 'electron-own' });
  await client.stop();
});

test('A core spawn carries the login shell proxy; an explicit binary never runs the shell itself', async (t) => {
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { CodexClient, stopAllCodexClients } = require('../electron/codex.cjs');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'proxy-env-test-'));
  const binary = path.join(directory, 'env-server.cjs'), log = path.join(directory, 'env.json');
  await fs.writeFile(binary, `#!${process.execPath}
const fs = require('node:fs');
const pick = Object.fromEntries(['HTTPS_PROXY', 'https_proxy', 'NO_PROXY'].map(key => [key, process.env[key] ?? null]));
fs.writeFileSync(process.env.ENV_LOG, JSON.stringify(pick));
require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + '\\n');
});
`, { mode: 0o755 });
  const own = ['HTTPS_PROXY', 'https_proxy', 'NO_PROXY', 'no_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy'].filter(key => process.env[key]);
  const saved = Object.fromEntries(own.map(key => [key, process.env[key]]));
  for (const key of own) delete process.env[key];
  t.after(async () => { Object.assign(process.env, saved); await stopAllCodexClients(); await fs.rm(directory, { recursive: true, force: true }); });
  let reads = 0;
  const client = new CodexClient({ binary, env: { ENV_LOG: log }, shellProxy: async () => { reads += 1; return { HTTPS_PROXY: 'http://127.0.0.1:7890' }; } });
  await client.start();
  assert.equal(reads, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(log, 'utf8')), { HTTPS_PROXY: 'http://127.0.0.1:7890', https_proxy: 'http://127.0.0.1:7890', NO_PROXY: 'localhost,127.0.0.1,::1' });
  await client.stop();
  // No shellProxy option and an explicit binary: the user's shell is not run, nothing is added.
  const plain = new CodexClient({ binary, env: { ENV_LOG: log } });
  await plain.start();
  assert.deepEqual(JSON.parse(await fs.readFile(log, 'utf8')), { HTTPS_PROXY: null, https_proxy: null, NO_PROXY: null });
  await plain.stop();
});

// A core's declared shell variables (descriptor shellEnv: Gemini's key, Vertex and Workspace settings) come from the same
// login-shell read; Electron's own environment wins, other names never leave proxy-env.cjs.
test('shellVariables: only the declared names the base lacks, never proxy keys or empty values', () => {
  const { shellVariables } = require('../electron/proxy-env.cjs');
  const shell = { GEMINI_API_KEY: 'shell-key', GOOGLE_CLOUD_PROJECT: 'proj', SECRET_TOKEN: 'x', HTTPS_PROXY: 'http://p', GOOGLE_CLOUD_LOCATION: '' };
  assert.deepEqual(shellVariables({}, shell, ['GEMINI_API_KEY', 'GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION', 'HTTPS_PROXY', 'bad-name']), { GEMINI_API_KEY: 'shell-key', GOOGLE_CLOUD_PROJECT: 'proj' });
  assert.deepEqual(shellVariables({ GEMINI_API_KEY: 'own' }, shell, ['GEMINI_API_KEY']), {}, 'Electron’s own value wins');
  assert.deepEqual(shellVariables({}, shell, []), {});
});
