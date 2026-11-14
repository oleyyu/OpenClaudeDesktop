// V3-w1-desktop-i18n (plan E29, R9): every message the generated 3.6556.2 output can show has a zh-CN entry. The copy is
// the defaultMessage of react-intl descriptors in the official modules the generators slice; the host formats them
// through t() (useIntl adapters look the English message up in zh-CN, then ICU-format it), so a missing key shows English.
// Scope: each src/generated/<area>/manifest.json and electron/generated/** manifest whose referenceVersion (terminal-shell:
// `reference`) is 3.6556.2 — the whole area directory, or the files it names — plus single modules of an older area
// that carry their own referenceVersion 3.6556.2 (code-current targets). Areas still on 2.42304.0 are out of scope until
// their lane migrates them. Source/AST only (rolldown parseAst): nothing is executed, no Vite, no DOM, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';
import zh from '../electron/i18n/zh-CN/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const VERSION = '3.6556.2';
const CODE = /\.(?:m?js|cjs|jsx)$/;

// Messages the scan may find without a zh-CN key of the same text, each with its reason. Keep this list short.
const ALLOWED = new Map([
  // D40 (host decision B03): the environment place chip's tooltip is shown as "Where DeepSeek runs" (the running core's
  // assistant), which is the key zh-CN carries (sidebar.mjs); the official "Where Claude runs" text is never looked up.
  ['Where Claude runs', 'D40: the host shows and translates "Where DeepSeek runs" instead'],
  // w2-mcp-host: shared-78 CG (generated/mcp-app-host/sandbox-frame.mjs) formats a message id the catalog may lack with a
  // blank placeholder; it is not copy, and tests/i18n.test.mjs forbids a blank zh-CN value.
  [' ', 'D5 (w2-mcp-host): shared-78 CG blank placeholder for a missing message id, not copy'],
]);

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const versionOf = (manifest) => manifest?.referenceVersion ?? manifest?.reference ?? null;
const codeFilesIn = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? codeFilesIn(full) : CODE.test(entry.name) ? [full] : [];
});
// A file a manifest names: relative to the manifest's directory, else to app/ (visualize writes app-relative paths).
const named = (dir, name) => [path.join(dir, name), path.join(app, name)].find((file) => fs.existsSync(file)) ?? path.join(dir, name);
const moduleTargets = (manifest, dir) => (Array.isArray(manifest?.modules) ? manifest.modules : [])
  .filter((module) => module?.referenceVersion === VERSION && typeof module.target === 'string').map((module) => named(dir, module.target));
// The outputs a single-file electron manifest names: `output`, the keys of `targets`, or its modules' targets.
const namedOutputs = (manifest, dir) => [
  ...(typeof manifest.output === 'string' ? [named(dir, manifest.output)] : []),
  ...(manifest.targets && typeof manifest.targets === 'object' && !Array.isArray(manifest.targets) ? Object.keys(manifest.targets).map((name) => named(dir, name)) : []),
  ...(Array.isArray(manifest.modules) ? manifest.modules.filter((module) => typeof module?.target === 'string').map((module) => named(dir, module.target)) : []),
];

/** The 3.6556.2 scopes: { scope, manifest, files } with app-relative paths. */
export function v3Scopes() {
  const scopes = [];
  const add = (manifestFile, files) => {
    const list = [...new Set(files)].filter((file) => fs.existsSync(file) && CODE.test(file)).map((file) => path.relative(app, file)).sort();
    scopes.push({ scope: path.relative(app, path.dirname(manifestFile)) || '.', manifest: path.relative(app, manifestFile), files: list });
  };
  const generated = path.join(app, 'src/generated');
  for (const area of fs.readdirSync(generated, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const dir = path.join(generated, area.name), file = path.join(dir, 'manifest.json'), manifest = readJson(file);
    if (!manifest) continue;
    if (versionOf(manifest) === VERSION) add(file, codeFilesIn(dir));
    else { const targets = moduleTargets(manifest, dir); if (targets.length) add(file, targets); }
  }
  const electron = path.join(app, 'electron/generated');
  const manifests = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? manifests(full) : /(?:^|-)manifest\.json$/.test(entry.name) ? [full] : [];
  });
  for (const file of manifests(electron)) {
    const manifest = readJson(file), dir = path.dirname(file);
    if (!manifest) continue;
    // A directory of its own (turn-plan/, visualize/) is that area's output; a root *-manifest.json names its files.
    const ownDir = path.basename(file) === 'manifest.json' && dir !== electron;
    if (versionOf(manifest) === VERSION) add(file, ownDir ? codeFilesIn(dir) : namedOutputs(manifest, dir));
    else { const targets = moduleTargets(manifest, dir); if (targets.length) add(file, targets); }
  }
  return scopes;
}

/**
 * The defaultMessage literals of one module: `defaultMessage: "…"` properties (react-intl descriptors, and props of
 * FormattedMessage-like calls). A descriptor whose id is `secret:`-prefixed is official secret copy no shipped catalog
 * carries (turn-box-next-actions TR1), so it is skipped. A non-literal value is reported as dynamic.
 */
export function messagesOf(code, file = 'module.js') {
  const program = parseAst(code, { lang: file.endsWith('.jsx') ? 'jsx' : 'js' }, file);
  const found = [];
  const keyOf = (property) => property.key?.name ?? property.key?.value;
  const secretId = (object) => object?.properties?.some((property) => property.type === 'Property' && !property.computed && keyOf(property) === 'id'
    && ((property.value.type === 'Literal' && typeof property.value.value === 'string' && property.value.value.startsWith('secret:'))
      || (property.value.type === 'TemplateLiteral' && property.value.quasis[0]?.value.cooked.startsWith('secret:'))));
  const visit = (node, parent) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) visit(child, parent); return; }
    if (node.type === 'ObjectExpression' && !secretId(node)) {
      for (const property of node.properties) {
        if (property.type !== 'Property' || property.computed || keyOf(property) !== 'defaultMessage') continue;
        const value = property.value;
        if (value.type === 'Literal' && typeof value.value === 'string') found.push(value.value);
        else if (value.type === 'TemplateLiteral' && value.expressions.length === 0) found.push(value.quasis[0].value.cooked);
        else found.push({ dynamic: code.slice(value.start, value.end) });
      }
    }
    for (const [key, child] of Object.entries(node)) if (key !== 'type' && child && typeof child === 'object') visit(child, node);
  };
  visit(program, null);
  return found;
}

/** message → Set of app-relative files, over every 3.6556.2 scope. */
function v3Messages() {
  const all = new Map(), dynamic = [];
  for (const { files } of v3Scopes()) for (const file of files) {
    for (const message of messagesOf(fs.readFileSync(path.join(app, file), 'utf8'), file)) {
      if (typeof message !== 'string') { dynamic.push(`${file}: defaultMessage: ${message.dynamic.slice(0, 120)}`); continue; }
      if (!all.has(message)) all.set(message, new Set());
      all.get(message).add(file);
    }
  }
  return { all, dynamic };
}

test('the collector: literal and template defaultMessages, secret ids skipped, non-literals reported', () => {
  const code = 'const a={id:"x1",defaultMessage:"Hello {name}"},b={defaultMessage:`Plain`,id:"x2"},'
    + 'c={id:"secret:abc",defaultMessage:"Hidden"},d={id:`secret:${q}`,defaultMessage:"Hidden too"},e={defaultMessage:n},'
    + 'f=g({"defaultMessage":"Quoted key"});';
  assert.deepEqual(messagesOf(code), ['Hello {name}', 'Plain', { dynamic: 'n' }, 'Quoted key']);
});

test('3.6556.2 scopes are found from the manifests (whole area directories and named electron outputs)', () => {
  const scopes = v3Scopes();
  for (const { scope, manifest, files } of scopes) {
    assert.ok(files.length > 0, `${scope} (${manifest}): names no code file that exists`);
  }
  // No file is counted under two scopes.
  const seen = new Map();
  for (const { manifest, files } of scopes) for (const file of files) {
    assert.equal(seen.has(file), false, `${file} in ${manifest} and ${seen.get(file)}`);
    seen.set(file, manifest);
  }
});

test('every defaultMessage of the generated 3.6556.2 output has a zh-CN entry', () => {
  const { all, dynamic } = v3Messages();
  assert.deepEqual(dynamic, [], 'every defaultMessage is a literal the catalog can key');
  const missing = [...all].filter(([message]) => !Object.hasOwn(zh, message) && !ALLOWED.has(message))
    .map(([message, files]) => `${message}  [${[...files].join(', ')}]`);
  assert.deepEqual(missing, []);
});

test('D23: official copy naming Claude keeps "Claude" in zh-CN; each allowance has a reason', () => {
  const { all } = v3Messages();
  const renamed = [...all.keys()].filter((message) => message.includes('Claude') && Object.hasOwn(zh, message) && !zh[message].includes('Claude'));
  assert.deepEqual(renamed, []);
  for (const [message, reason] of ALLOWED) {
    assert.ok(typeof reason === 'string' && /^D\d+|secret/.test(reason), `${message}: the reason names its decision`);
    assert.equal(Object.hasOwn(zh, message), false, `${message} has a zh-CN entry now: drop the allowance`);
  }
});
