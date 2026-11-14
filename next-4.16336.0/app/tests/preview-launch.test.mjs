// .claude/launch.json parsing and the preview's address rules (electron/preview-launch.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { configUrl, insideFolder, isLocalHost, navigationAllowed, normalizeConfiguration, parseJsonc, parseLaunchConfig, parseUserUrl, portFromArgs } from '../electron/preview-launch.mjs';
import { candidateConfiguration, detectServerCandidates, launchConfigText, serverCandidateProblem, validateServerCandidate, withServerConfiguration } from '../electron/preview-launch.mjs';

const root = '/work/app';

test('JSONC: comments and trailing commas are accepted, strings are left alone', () => {
  assert.deepEqual(parseJsonc('{\n // a comment\n "a": "http://x//y", /* block */ "b": [1, 2,],\n}'), { a: 'http://x//y', b: [1, 2] });
  assert.deepEqual(parseJsonc('{"s": "a \\" // not a comment"}'), { s: 'a " // not a comment' });
});

test('a configuration becomes a command, a port and a url', () => {
  const parsed = parseLaunchConfig(JSON.stringify({ version: '0.0.1', configurations: [{ name: 'web', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 5173 }] }), root);
  assert.equal(parsed.exists, true);
  assert.equal(parsed.error, null);
  assert.equal(parsed.autoVerify, true);
  assert.deepEqual(parsed.configs, [{ name: 'web', command: 'npm', args: ['run', 'dev'], cwd: root, env: {}, port: 5173, autoPort: undefined, url: null, attach: false }]);
  assert.equal(configUrl(parsed.configs[0]), 'http://localhost:5173');
  assert.equal(configUrl(parsed.configs[0], 6000), 'http://localhost:6000');
});

test('program, args, cwd, env, ${workspaceFolder}, autoPort and the port fallbacks', () => {
  const { config } = normalizeConfiguration({ name: 'api', program: '${workspaceFolder}/server.js', args: ['--port', '8080'], cwd: 'api', env: { DEBUG: '1' }, autoPort: true }, root);
  assert.deepEqual(config, { name: 'api', command: 'node', args: ['/work/app/server.js', '--port', '8080'], cwd: '/work/app/api', env: { DEBUG: '1' }, port: 8080, autoPort: true, url: null, attach: false });
  assert.equal(normalizeConfiguration({ runtimeExecutable: 'vite', env: { PORT: '4100' } }, root).config.port, 4100);
  assert.equal(normalizeConfiguration({ runtimeExecutable: 'serve', runtimeArgs: ['-l', 'localhost:7000'] }, root).config.port, 7000);
  const defaulted = normalizeConfiguration({ runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'] }, root).config;
  assert.equal(defaulted.port, 3000, 'a command with no port anywhere defaults to 3000');
  assert.equal(defaulted.name, 'dev', 'the default name is the last argument');
  assert.equal(portFromArgs(['--port=5000']), 5000);
  assert.equal(portFromArgs(['-p', '3001']), 3001);
  assert.equal(portFromArgs(['dev']), null);
});

test('preview-04: "autoPort" is the JSON boolean and "port" a number (or its digits), with 2.42304.0\'s messages', () => {
  const config = (entry) => normalizeConfiguration({ name: 'web', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], ...entry }, root);
  assert.equal(config({ port: '3000' }).config.port, 3000, 'digits in a string are the port');
  assert.equal(config({ port: ' 4100 ' }).config.port, 4100);
  assert.equal(config({ port: 0 }).config.port, 3000, 'an empty or zero port counts as absent');
  assert.equal(config({ port: '' }).config.port, 3000);
  assert.equal(config({ port: 70000 }).problem, 'configuration 1: "port" must be a JSON number from 1 to 65535, not 70000');
  assert.equal(config({ port: '30x0' }).problem, 'configuration 1: "port" must be a JSON number from 1 to 65535, not "30x0"');
  assert.equal(config({ port: 3000.5 }).problem, 'configuration 1: "port" must be a JSON number from 1 to 65535, not 3000.5');
  assert.equal(config({ port: '123456' }).problem, 'configuration 1: "port" must be a JSON number from 1 to 65535, not "123456"');
  assert.equal(config({ autoPort: 'true' }).problem, 'configuration 1: "autoPort" must be the JSON boolean true or false (unquoted), not "true"');
  assert.equal(config({ autoPort: 1 }).problem, 'configuration 1: "autoPort" must be the JSON boolean true or false (unquoted), not 1');
  assert.deepEqual([true, false, undefined].map((autoPort) => config({ autoPort }).config.autoPort), [true, false, undefined], 'three states (preview-01)');
  // A localhost url and a string port of the same number agree.
  assert.equal(normalizeConfiguration({ url: 'http://localhost:4000', port: '4000', runtimeExecutable: 'x' }, root).config.port, 4000);
  const parsed = parseLaunchConfig(JSON.stringify({ configurations: [{ name: 'ok', runtimeExecutable: 'npm', port: '5173' }, { name: 'bad', runtimeExecutable: 'npm', autoPort: 'yes' }] }), root);
  assert.deepEqual(parsed.configs.map((entry) => [entry.name, entry.port]), [['ok', 5173]]);
  assert.deepEqual(parsed.problems, ['configuration 2: "autoPort" must be the JSON boolean true or false (unquoted), not "yes"']);
});

test('a url entry attaches to a running server; localhost urls are bare origins on the entry port', () => {
  const attach = normalizeConfiguration({ name: 'docs', url: 'http://localhost:4000' }, root).config;
  assert.deepEqual({ attach: attach.attach, command: attach.command, port: attach.port, url: attach.url }, { attach: true, command: null, port: 4000, url: 'http://localhost:4000' });
  assert.match(normalizeConfiguration({ url: 'http://localhost:4000/docs' }, root).problem, /bare origin/);
  assert.equal(normalizeConfiguration({ url: 'http://localhost:4000', port: 4001, runtimeExecutable: 'x' }, root).problem, 'configuration 1: "url" is "http://localhost:4000/" but this entry\'s server runs on port 4001. A localhost "url" must point at the entry\'s own server');
  assert.match(normalizeConfiguration({ url: 'ftp://example.com' }, root).problem, /http or https/);
  assert.match(normalizeConfiguration({ url: 'https://user:pw@example.com' }, root).problem, /credentials/);
  assert.equal(normalizeConfiguration({ url: 'https://staging.example.com/app' }, root).config.url, 'https://staging.example.com/app');
});

test('malformed entries are reported, the rest still load; names are unique ignoring case', () => {
  const parsed = parseLaunchConfig(JSON.stringify({ autoVerify: false, configurations: [
    { name: 'ok', runtimeExecutable: 'npm' }, { name: 'bad', runtimeArgs: 'nope', runtimeExecutable: 'npm' }, { name: 'OK', runtimeExecutable: 'yarn' }, { name: 'none' },
    { name: 'escape', runtimeExecutable: 'npm', cwd: '../elsewhere' }, { name: 'port', runtimeExecutable: 'npm', port: 70000 },
  ] }), root);
  assert.equal(parsed.autoVerify, false);
  assert.deepEqual(parsed.configs.map((config) => config.name), ['ok']);
  assert.equal(parsed.problems.length, 5);
  assert.ok(parsed.problems.some((problem) => /malformed "runtimeArgs"/.test(problem)));
  assert.ok(parsed.problems.some((problem) => /repeats the name/.test(problem)));
  assert.ok(parsed.problems.some((problem) => /outside the project/.test(problem)));
  assert.ok(parsed.problems.includes('configuration 6: "port" must be a JSON number from 1 to 65535, not 70000'));
  assert.equal(parseLaunchConfig(null, root).exists, false);
  assert.match(parseLaunchConfig('{ nope', root).error, /failed to parse/);
  assert.match(parseLaunchConfig('{"configurations": []}', root).error, /no configurations/);
  assert.match(parseLaunchConfig('{"configurations": [{"name": "x"}]}', root).error, /none of the 1 configuration/);
});

test('the preview opens http(s), about:blank and files inside the session folder only', () => {
  assert.equal(navigationAllowed('http://localhost:3000/a', root).ok, true);
  assert.equal(navigationAllowed('https://example.com', root).ok, true);
  assert.equal(navigationAllowed('about:blank', root).ok, true);
  assert.equal(navigationAllowed('file:///work/app/dist/index.html', root).ok, true);
  assert.equal(navigationAllowed('file:///work/app/../secrets.txt', root).ok, false);
  assert.equal(navigationAllowed('file:///etc/passwd', root).ok, false);
  for (const url of ['javascript:alert(1)', 'chrome://settings', 'devtools://x', 'data:text/html,hi', 'http://user:pw@localhost/', 'not a url'])
    assert.equal(navigationAllowed(url, root).ok, false, url);
  assert.equal(insideFolder('/work/app', '/work/app'), true);
  assert.equal(insideFolder('/work/app', '/work/application'), false);
  for (const host of ['localhost', '127.0.0.1', '[::1]', 'app.localhost']) assert.equal(isLocalHost(host), true, host);
  assert.equal(isLocalHost('example.com'), false);
});

test('the URL field understands localhost, ports, paths, domains and searches', () => {
  assert.equal(parseUserUrl('localhost:3000', root), 'http://localhost:3000');
  assert.equal(parseUserUrl(':5173/about', root), 'http://localhost:5173/about');
  assert.equal(parseUserUrl('https://example.com/x', root), 'https://example.com/x');
  assert.equal(parseUserUrl('example.com', root), 'https://example.com');
  assert.equal(parseUserUrl('myhost:8080', root), 'http://myhost:8080');
  assert.equal(parseUserUrl('./dist/index.html', root), 'file:///work/app/dist/index.html');
  assert.equal(parseUserUrl('~/site/a b.html', root, '/Users/me'), 'file:///Users/me/site/a%20b.html');
  assert.equal(parseUserUrl('how to center a div', root), 'https://www.google.com/search?q=how%20to%20center%20a%20div');
  assert.equal(parseUserUrl('   ', root), null);
});

test('a launch.json "cwd" that is a link to a folder outside the project is refused', async () => {
  const fs = (await import('node:fs')).default;
  const path = (await import('node:path')).default;
  fs.mkdirSync('/private/tmp/claude-501', { recursive: true });
  const base = fs.realpathSync(fs.mkdtempSync('/private/tmp/claude-501/preview-launch-'));
  try {
    const project = path.join(base, 'proj'), outside = path.join(base, 'outside');
    fs.mkdirSync(path.join(project, 'inner'), { recursive: true });
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(project, 'web'));
    fs.symlinkSync(path.join(project, 'inner'), path.join(project, 'inner-link'));
    assert.match(normalizeConfiguration({ name: 'clean', runtimeExecutable: 'npm', runtimeArgs: ['run', 'clean'], cwd: 'web' }, project).problem, /"cwd" is outside the project folder/);
    assert.equal(normalizeConfiguration({ name: 'dev', runtimeExecutable: 'npm', cwd: 'inner-link' }, project).config.cwd, path.join(project, 'inner-link'), 'a link that stays inside is fine');
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

// 2.31226.0 main (asar index.chunk-CiiI592G.js rUi / eUi / tUi / nUi / gatherProjectInfo / addServerConfiguration).
const project = (files) => ({ read: (name) => files[name] ?? null, exists: (name) => name in files });
test('static dev-server detection: dev/start/serve/develop scripts, the lockfile runner, the framework port, validation', () => {
  assert.deepEqual(detectServerCandidates(project({})), [], 'no package.json');
  assert.deepEqual(detectServerCandidates(project({ 'package.json': '{' })), [], 'unreadable package.json');
  const pkg = JSON.stringify({ scripts: { build: 'vite build', preview: 'vite preview', develop: 'x', dev: 'vite', start: 'node s.js', test: 'vitest' } });
  const found = detectServerCandidates(project({ 'package.json': pkg, 'pnpm-lock.yaml': '', 'vite.config.ts': '' }));
  assert.deepEqual(found.map((c) => c.name), ['dev', 'start', 'develop'], 'in the reference order; preview and build are not servers');
  assert.deepEqual(found[0], { name: 'dev', runtimeExecutable: 'pnpm', runtimeArgs: ['run', 'dev'], port: 5173, framework: 'vite', validation: { status: 'ok' } });
  assert.deepEqual(detectServerCandidates(project({ 'package.json': pkg, 'yarn.lock': '' }))[0], { name: 'dev', runtimeExecutable: 'yarn', runtimeArgs: ['run', 'dev'], port: 3000, framework: 'unknown', validation: { status: 'ok' } });
  assert.equal(detectServerCandidates(project({ 'package.json': pkg, 'bun.lockb': '' }))[0].runtimeExecutable, 'npm', 'bun is not a detected runner');
  assert.deepEqual(detectServerCandidates(project({ 'package.json': pkg, 'angular.json': '', 'next.config.js': '' }))[0].framework, 'next', 'the first framework in $Hi order');
  assert.equal(detectServerCandidates(project({ 'package.json': pkg, 'astro.config.mjs': '' }))[0].port, 4321);
});

test('candidate validation (nUi) and the checks before Use this writes', () => {
  const good = { runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 3000 };
  assert.deepEqual(validateServerCandidate(good), { status: 'ok' });
  assert.deepEqual(validateServerCandidate({ ...good, runtimeExecutable: 'bun' }), { status: 'blocked', reason: 'runner-not-allowed' });
  assert.deepEqual(validateServerCandidate({ ...good, runtimeArgs: ['run', 'dev && rm -rf /'] }), { status: 'blocked', reason: 'shell-metachar' });
  assert.deepEqual(validateServerCandidate({ ...good, runtimeArgs: ['dev'] }), { status: 'blocked', reason: 'shell-metachar' });
  assert.deepEqual(validateServerCandidate({ ...good, name: 'a b' }), { status: 'blocked', reason: 'shell-metachar' });
  assert.deepEqual(validateServerCandidate({ ...good, port: 70000 }), { status: 'blocked', reason: 'port-out-of-range' });
  assert.deepEqual(validateServerCandidate({ ...good, port: '3000' }), { status: 'blocked', reason: 'port-out-of-range' });
  const files = project({ 'package.json': JSON.stringify({ scripts: { dev: 'vite' } }) });
  assert.equal(serverCandidateProblem(good, files), null);
  assert.equal(serverCandidateProblem({ ...good, runtimeArgs: ['run', 'start'] }, files), 'script-not-found');
  assert.equal(serverCandidateProblem({ ...good, runtimeExecutable: 'sh' }, files), 'runner-not-allowed');
  assert.deepEqual(candidateConfiguration({ ...good, name: 'ignored' }), { name: 'dev', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 3000 });
  assert.deepEqual(parseJsonc(launchConfigText(good)), { version: '0.0.1', configurations: [{ name: 'dev', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 3000 }] });
});

test('addServerConfiguration: appended in place to an existing launch.json, name-exists ignoring case', () => {
  const entry = { name: 'dev', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 5173 };
  const text = '{\n  "version": "0.0.1",\n  // servers\n  "configurations": [\n    { "name": "api", "runtimeExecutable": "node", "runtimeArgs": ["s.js"], "port": 8080 } // the api\n  ],\n  "autoVerify": false\n}\n';
  const added = withServerConfiguration(text, entry);
  assert.equal(added.status, 'ok');
  assert.match(added.text, /\/\/ servers\n/);
  assert.match(added.text, /\/\/ the api/);
  const parsed = parseJsonc(added.text);
  assert.deepEqual(parsed.configurations.map((c) => c.name), ['api', 'dev']);
  assert.equal(parsed.autoVerify, false);
  assert.deepEqual(parsed.configurations[1], entry);
  assert.deepEqual(withServerConfiguration(added.text, { ...entry, name: 'DEV' }), { status: 'name-exists' });
  for (const source of ['{}', '{ "version": "0.0.1" }', '{\n  "configurations": []\n}', '{\n  "configurations": [{ "name": "x" },]\n}']) {
    const next = withServerConfiguration(source, entry);
    assert.equal(next.status, 'ok', source);
    assert.equal(parseJsonc(next.text).configurations.at(-1).name, 'dev', source);
  }
  assert.deepEqual(withServerConfiguration('[1]', entry), { status: 'error' });
  assert.deepEqual(withServerConfiguration('{ "configurations": {} }', entry), { status: 'error' });
  assert.deepEqual(withServerConfiguration('{ nope', entry), { status: 'error' });
});
