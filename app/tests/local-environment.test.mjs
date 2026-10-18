import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
// B28: Code › env pill › Local › settings → "Edit local environment" (2.31226.0 c3f9f1667 Ne/Pe, c66c54bc9, cbd210f48,
// c29df1c52; cc43287c9 dX Ft). The pure model, the encrypted store in main, the core spawn environment and the menu row.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  parseDotenv, unparseableLine, validateEnvironmentText, parseEnvironmentText, serializeEnvironment, normalizeEnvironment,
  isManagedEnvKey, ENVIRONMENT_PLACEHOLDER,
} from '../electron/prefs/local-environment.mjs';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');

test('cbd210f48 parser: KEY=value, export, colon form, quotes, multiline and escaped newlines, comments', () => {
  const values = parseDotenv([
    '# comment',
    'NODE_ENV=production',
    'export GIT_AUTHOR_NAME=Your Name',
    'COLON: yes',
    "SINGLE='a $b # c'",
    'DOUBLE="line1\\nline2"',
    'CONFIG="key1=val1',
    'key2=val2"',
    'TRAILING=value # note',
    'EMPTY=',
  ].join('\r\n'));
  assert.equal(Object.getPrototypeOf(values), null);
  assert.deepEqual({ ...values }, {
    NODE_ENV: 'production', GIT_AUTHOR_NAME: 'Your Name', COLON: 'yes', SINGLE: 'a $b # c', DOUBLE: 'line1\nline2',
    CONFIG: 'key1=val1\nkey2=val2', TRAILING: 'value', EMPTY: '',
  });
  assert.deepEqual(parseEnvironmentText('   \n'), {});
  assert.deepEqual(parseEnvironmentText(ENVIRONMENT_PLACEHOLDER), { NODE_ENV: 'production', GIT_AUTHOR_NAME: 'Your Name', CONFIG: 'key1=val1\nkey2=val2' });
});

test('cbd210f48 n: the first unreadable line; a trailing bare key passes only while typing', () => {
  assert.equal(unparseableLine(''), undefined);
  assert.equal(unparseableLine('A=1\n# x\n\nB=2'), undefined);
  assert.equal(unparseableLine('A=1\nnot a pair\nB=2'), 'not a pair');
  assert.equal(unparseableLine('A=1\nFOO'), 'FOO');
  assert.equal(unparseableLine('A=1\nFOO', { allowTrailingBareKey: true }), undefined);
  assert.equal(unparseableLine('FOO\nA=1', { allowTrailingBareKey: true }), 'FOO');
});

test('c66c54bc9 i: the field error and the Save gate (managed variables refused, in either case)', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  assert.equal(validateEnvironmentText(''), undefined);
  assert.equal(validateEnvironmentText('A=1\nB_2=x'), undefined);
  assert.equal(validateEnvironmentText('A=1\noops'), 'Couldn’t parse "oops". Use KEY=value format.');
  assert.equal(validateEnvironmentText('A=1\noops', { allowTrailingBareKey: true }), undefined);
  assert.equal(validateEnvironmentText('my.key=1'), 'Invalid key "my.key". Use letters, numbers, and underscores only.');
  assert.equal(validateEnvironmentText('__proto__=1'), '"__proto__" can’t be used as a variable name.');
  assert.equal(validateEnvironmentText('path=/bin'), undefined, 'managed keys pass without checkManagedVars');
  assert.equal(validateEnvironmentText('path=/bin', { checkManagedVars: true }), '"path" is managed by OpenClaude Desktop and cannot be overridden.');
  for (const key of ['ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'CODE_DESKTOP_AGENT_TOOLS_TOKEN', 'electron_run_as_node']) {
    assert.ok(isManagedEnvKey(key), key);
    assert.match(validateEnvironmentText(`${key}=x`, { checkManagedVars: true }), /is managed by OpenClaude Desktop/);
  }
  assert.equal(isManagedEnvKey('HTTPS_PROXY'), false);
  assert.equal(validateEnvironmentText('CLAUDE_CONFIG_DIR=/x', { reservedKeys: ['CLAUDE_CONFIG_DIR'] }), '"CLAUDE_CONFIG_DIR" can only be set for all sessions, not for one environment.');
  setLocale('zh-CN');
  assert.equal(validateEnvironmentText('A=1\noops'), '无法解析“oops”。请使用 KEY=value 格式。');
});

test('c66c54bc9 t: serialization quotes what needs it and round-trips through the parser', () => {
  const values = { PLAIN: 'production', SPACE: 'Your Name', DOLLAR: 'a$b', HASH: 'a#b', MULTI: 'one\ntwo', APOS: "it's \"x\"", EDGE: ' padded ', EMPTY: '' };
  const text = serializeEnvironment(values);
  assert.equal(text, [
    'PLAIN=production', 'SPACE=Your Name', "DOLLAR='a$b'", "HASH='a#b'", "MULTI='one\ntwo'", 'APOS="it\'s \\"x\\""', "EDGE=' padded '", 'EMPTY=',
  ].join('\n'));
  const back = parseEnvironmentText(text);
  for (const key of ['PLAIN', 'SPACE', 'DOLLAR', 'HASH', 'MULTI', 'EDGE', 'EMPTY']) assert.equal(back[key], values[key], key);
  assert.equal(serializeEnvironment({}), '');
});

test('normalizeEnvironment: lenient for a stored file, strict for a save', () => {
  assert.deepEqual(normalizeEnvironment(null), {});
  assert.deepEqual(normalizeEnvironment({ A: '1', PATH: '/x', 'bad key': 'x', B: 2 }), { A: '1' });
  assert.deepEqual(normalizeEnvironment({ A: '1' }, { strict: true }), { A: '1' });
  assert.throws(() => normalizeEnvironment({ PATH: '/x' }, { strict: true }), /is managed by OpenClaude Desktop/);
  assert.throws(() => normalizeEnvironment({ 'a-b': '1' }, { strict: true }), /Invalid key/);
  assert.throws(() => normalizeEnvironment({ A: 1 }, { strict: true }), /Invalid environment variables/);
  assert.throws(() => normalizeEnvironment(['A'], { strict: true }), /Invalid environment variables/);
});

// A safeStorage stand-in: reversible, and the file never holds the plain text.
const fakeStorage = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: (text) => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`),
  decryptString: (data) => { const text = data.toString(); if (!text.startsWith('enc:')) throw new Error('bad'); return Buffer.from(text.slice(4), 'base64').toString(); },
});

test('local-environment.cjs: get/save through the encrypted file; launchEnv leaves out what the app manages', async (context) => {
  const { createLocalEnvironment } = require('../electron/local-environment.cjs');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-env-'));
  context.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'local-environment.bin');
  let managed = ['MY_PROVIDER_KEY'];
  const store = createLocalEnvironment({ file, safeStorage: fakeStorage(), managedKeys: () => managed });
  assert.deepEqual(await store.run({ op: 'get' }), { variables: {} });
  const saved = await store.run({ op: 'save', variables: { NODE_ENV: 'production', MY_PROVIDER_KEY: 'shadow', SECRET: 's3cret' } });
  assert.deepEqual(saved, { variables: { NODE_ENV: 'production', MY_PROVIDER_KEY: 'shadow', SECRET: 's3cret' }, changed: true });
  const raw = await fs.readFile(file, 'utf8');
  assert.doesNotMatch(raw, /s3cret/, 'stored encrypted');
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  assert.deepEqual(store.launchEnv(), { NODE_ENV: 'production', SECRET: 's3cret' }, 'a key the app sets for the launch is left out');
  managed = [];
  assert.deepEqual(store.launchEnv(), { NODE_ENV: 'production', MY_PROVIDER_KEY: 'shadow', SECRET: 's3cret' });
  // A fresh store (the next app run) reads the same file.
  const again = createLocalEnvironment({ file, safeStorage: fakeStorage() });
  assert.deepEqual((await again.run({ op: 'get' })).variables, { NODE_ENV: 'production', MY_PROVIDER_KEY: 'shadow', SECRET: 's3cret' });
  assert.equal((await again.run({ op: 'save', variables: { SECRET: 's3cret', NODE_ENV: 'production', MY_PROVIDER_KEY: 'shadow' } })).changed, false);
  await assert.rejects(again.run({ op: 'save', variables: { PATH: '/evil' } }), /is managed by OpenClaude Desktop/);
  await assert.rejects(again.run({ op: 'nope' }), /Unknown local environment operation/);
  // Saving nothing removes the file.
  assert.deepEqual(await again.run({ op: 'save', variables: {} }), { variables: {}, changed: true });
  await assert.rejects(fs.stat(file), /ENOENT/);
  // Without secure storage a save is refused; an unreadable file fails the load (the dialog's Try again) but not a spawn.
  const plain = createLocalEnvironment({ file, safeStorage: fakeStorage(false) });
  await assert.rejects(plain.run({ op: 'save', variables: { A: '1' } }), /Secure storage is unavailable/);
  await fs.writeFile(file, 'garbage');
  const broken = createLocalEnvironment({ file, safeStorage: fakeStorage() });
  await assert.rejects(broken.run({ op: 'get' }), /Couldn’t read the local environment/);
  const warn = console.warn; console.warn = () => {};
  try { assert.deepEqual(broken.launchEnv(), {}); } finally { console.warn = warn; }
});

test('codex.cjs: a core spawn gets the local environment under the app\'s own variables; an explicit binary gets none', { timeout: 10000 }, async (context) => {
  const { CodexClient, setLocalEnvironment, setAgentToolsLaunch, setCoreChoice } = require('../electron/codex.cjs');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'local-env-spawn-'));
  const binary = path.join(directory, 'codex'), log = path.join(directory, 'env.jsonl');
  await fs.writeFile(binary, `#!${process.execPath}
const pick = ['B28_LOCAL', 'B28_SHARED', 'B28_TOOLS'];
require('node:fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify(Object.fromEntries(pick.map(key => [key, process.env[key] ?? null]))) + '\\n');
require('node:readline').createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') process.stdout.write(JSON.stringify({ id: message.id, result: {} }) + '\\n');
});
`, { mode: 0o755 });
  const saved = { core: process.env.CODE_DESKTOP_CORE, override: process.env.CODEX_BINARY, system: process.env.CODE_DESKTOP_CORE_SYSTEM_PATHS };
  Object.assign(process.env, { CODE_DESKTOP_CORE: 'codex', CODE_DESKTOP_CORE_SYSTEM_PATHS: '' });
  delete process.env.CODEX_BINARY;
  setCoreChoice({ core: 'codex', agents: { codex: { path: binary } } });
  setLocalEnvironment(() => ({ B28_LOCAL: 'local', B28_SHARED: 'local', NOT_A_STRING: 3 }));
  setAgentToolsLaunch(() => ({ env: { B28_SHARED: 'tools', B28_TOOLS: 'tools' } }));
  const client = new CodexClient({ initializeTimeout: 3000, shutdownTimeout: 80 });
  const direct = new CodexClient({ binary, initializeTimeout: 3000, shutdownTimeout: 80 });
  context.after(async () => {
    await client.stopAndWait(); await direct.stopAndWait();
    setLocalEnvironment(null); setAgentToolsLaunch(null); setCoreChoice({});
    for (const [key, value] of [['CODE_DESKTOP_CORE', saved.core], ['CODEX_BINARY', saved.override], ['CODE_DESKTOP_CORE_SYSTEM_PATHS', saved.system]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await fs.rm(directory, { recursive: true, force: true });
  });
  await client.start();
  await direct.start();
  const lines = (await fs.readFile(log, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(lines[0], { B28_LOCAL: 'local', B28_SHARED: 'tools', B28_TOOLS: 'tools' });
  assert.deepEqual(lines[1], { B28_LOCAL: null, B28_SHARED: null, B28_TOOLS: null });
});

test('main.cjs wires the store to every core spawn and to desktop:call local-environment', async () => {
  const main = await fs.readFile(path.join(root, 'electron/main.cjs'), 'utf8');
  assert.match(main, /require\("\.\/codex\.cjs"\)\.setLocalEnvironment\(\(\) => localEnvironment\.launchEnv\(\)\);/);
  assert.match(main, /case "local-environment": return localEnvironment\.run\(p\);/);
  assert.match(main, /managedKeys: \(\) => \{ let tools = \{\}; try \{ tools = agentTools\.launchEnv\(\) \?\? \{\}; \} catch \{ tools = \{\}; \} return \[\.\.\.coreSecretEnvKeys\(\), \.\.\.Object\.keys\(tools\)\]; \}/);
});

test('local environment menu opens the real environment editor and persists through the host store', async () => {
  const main = await fs.readFile(path.join(root, 'src/main.jsx'), 'utf8');
  const local = main.slice(main.indexOf('      case "local": {'), main.indexOf('      case "home-folder":'));
  assert.match(local, /const openEnvironment = \(\) => \{ closeMenu\(\); setLocalEnvOpen\(true\); \};/);
  assert.match(local, /<SourceLocalEnvironmentMenu onOpenSettings=\{openEnvironment\} \/>/);
  assert.match(main, /\{localEnvOpen && <SourceLocalEnvironmentDialog onClose=\{\(\) => setLocalEnvOpen\(false\)\}/);
  assert.match(main, /load=\{\(\) => call\("local-environment", \{ op: "get" \}\)\}/);
  assert.match(main, /save=\{\(variables\) => call\("local-environment", \{ op: "save", variables \}\)\}/);
});

test('c3f9f1667 Pe/Oe markup: the field, its hint and error, and the footer (SSR)', async (context) => {
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ configFile: false, root, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  context.after(() => server.close());
  const D = await server.ssrLoadModule('/src/source-local-environment-dialog.jsx');
  const { SourceLocalEnvironmentMenu } = await server.ssrLoadModule('/src/source-environment-menu.jsx');
  const { EnvironmentAction } = await server.ssrLoadModule('/src/generated/code-current/environment-menu-controls.mjs');
  const noop = () => {};
  const form = (props) => renderToStaticMarkup(React.createElement(D.EnvironmentForm, {
    loadedText: '', onDirtyChange: noop, onClose: noop, pending: false, setPending: noop, save: async () => ({}), ...props }));
  const html = form({ loadedText: 'NODE_ENV=production' });
  assert.match(html, /<form class="sle-form">/);
  assert.match(html, /<label class="sle-label" for="[^"]+">Environment variables<\/label>/);
  assert.match(html, /<textarea id="[^"]+" data-cds="TextArea" class="sle-textarea cds-reset" rows="8" placeholder="NODE_ENV=production\nGIT_AUTHOR_NAME=Your Name/);
  assert.match(html, /autoComplete="off"|autocomplete="off"/);
  assert.match(html, /data-1p-ignore="true" data-lpignore="true"/);
  assert.match(html, />NODE_ENV=production<\/textarea>/);
  assert.match(html, /<div class="sle-hint" id="[^"]+">In <a href="https:\/\/github\.com\/motdotla\/dotenv#[^"]+" class="sle-link">\.env format<\/a>\. These are stored securely and passed to your sessions\.<\/div>/);
  assert.doesNotMatch(html, /sle-error/);
  assert.match(html, /<button type="submit" hidden="" aria-hidden="true" tabindex="-1"><\/button>/);
  assert.match(html, /<div class="-mx-pad-xl mt-auto border-t px-xl pt-lg"><footer class="sdlg-footer mt-0"><button type="button" data-cds="Button" data-variant="secondary"[^>]*>.*?<span class="ssb-content">Cancel<\/span><\/button><button type="button" data-cds="Button" data-variant="primary"[^>]*>.*?<span class="ssb-content">Save changes<\/span><\/button><\/footer><\/div>/);
  assert.match(html, /scroll-fade-y px-xl pt-3 pb-sm supports-\[min-height:calc-size\(auto,size\)\]:min-h-\[calc-size\(min-content,min\(size,6rem\)\)\]/);
  // A managed key: the error under the field (aria-invalid, described by it) and Save disabled.
  const invalid = form({ loadedText: 'PATH=/bin' });
  assert.match(invalid, /aria-invalid="true"/);
  assert.match(invalid, /<div class="sle-error" id="[^"]+" role="alert">.*<span>&quot;PATH&quot; is managed by OpenClaude Desktop and cannot be overridden\.<\/span><\/div>/);
  assert.match(invalid, /<button disabled="" type="button" data-cds="Button" data-variant="primary"/);
  // The bare key being typed shows no error, but Save waits for a value.
  const typing = form({ loadedText: 'A=1\nFOO' });
  assert.doesNotMatch(typing, /sle-error/);
  assert.match(typing, /<button disabled="" type="button" data-cds="Button" data-variant="primary"/);
  // Saving: both buttons disabled, Save busy.
  const pending = form({ loadedText: 'A=1', pending: true });
  assert.match(pending, /<button disabled="" type="button" data-cds="Button" data-variant="secondary"/);
  assert.match(pending, /<button disabled="" type="button" data-cds="Button" data-variant="primary"[^>]*aria-busy="true"|aria-busy="true"[^>]*data-variant="primary"/);

  // Exercise the actual source controls through the host menu. Keyboard and
  // pointer activation must open once, without selecting the enclosing row.
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  context.after(() => {
    if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument);
    else delete globalThis.document;
  });
  let opens = 0, stops = 0, prevents = 0;
  const onOpenSettings = () => { opens += 1; };
  for (const dir of ['ltr', 'rtl']) {
    Object.defineProperty(globalThis, 'document', { value: { documentElement: { dir } }, configurable: true });
    const menu = SourceLocalEnvironmentMenu({ onOpenSettings });
    const html = renderToStaticMarkup(menu);
    assert.match(html, /role="menuitemradio"[^>]*aria-checked="true"|aria-checked="true"[^>]*role="menuitemradio"/);
    // 2.42304.0 c227f4d5e zK mutes the row actions as secondary text (2.37337.1 ca80fca8d tX: text-muted-control).
    assert.match(html, /text-muted-as-secondary opacity-0/); assert.doesNotMatch(html, /text-muted-control/);
    assert.match(html, /pointer-coarse:opacity-100/);
    assert.ok(html.includes(`, environment settings, ${dir === 'rtl' ? 'left' : 'right'} arrow`));
    const key = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    for (const pressed of ['ArrowUp', key]) menu.props.onKeyDown({ key: pressed, preventDefault() { prevents += 1; }, stopPropagation() { stops += 1; } });
  }
  assert.deepEqual({ opens, stops, prevents }, { opens: 2, stops: 2, prevents: 2 });
  EnvironmentAction({ icon: 'Settings', onPress: onOpenSettings }).props.onClick({ stopPropagation() { stops += 1; } });
  assert.equal(opens, 3);
  assert.equal(stops, 3);
});
