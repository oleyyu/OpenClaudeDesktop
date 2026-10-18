// R4f-rail SR-8: every message the Code session rail can show has a zh-CN entry. The rail's copy is the defaultMessage of
// the generated 2.42304.0 modules (src/generated/session-rail-kit, session-rail, session-rail-sections,
// session-rail-changes) and of the host stand-ins (src/source-session-rail*.jsx), all formatted through t() (the kit's
// useIntl adapter = source-code-start-adapters useStartIntl: the English message is looked up in zh-CN, then
// ICU-formatted). Source/AST only: no Vite, no DOM, no process, no network, no real configuration.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';
import zh from '../electron/i18n/zh-CN/index.mjs';
import { t, getLocale, setLocale } from '../electron/i18n/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const RAIL_DIRS = ['session-rail-kit', 'session-rail', 'session-rail-sections', 'session-rail-changes', 'session-rail-context'];
const HOST_FILES = ['source-session-rail.jsx', 'source-session-rail-kit-adapters.jsx', 'source-session-rail-adapters.jsx',
  'source-session-rail-sections-adapters.jsx', 'source-session-rail-changes-adapters.jsx', 'source-session-rail-context-adapters.jsx',
  'source-session-rail-context.jsx'];
const railFiles = () => [
  ...RAIL_DIRS.flatMap((dir) => fs.readdirSync(path.join(app, 'src/generated', dir)).filter((name) => name.endsWith('.mjs'))
    .map((name) => `src/generated/${dir}/${name}`)),
  ...HOST_FILES.map((name) => `src/${name}`),
];

// The defaultMessage literals of one module (object properties `defaultMessage: "…"`, as react-intl message descriptors).
function messagesOf(file) {
  const code = fs.readFileSync(path.join(app, file), 'utf8');
  const program = parseAst(code, { lang: file.endsWith('.jsx') ? 'jsx' : 'js' }, file);
  const found = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) visit(child); return; }
    if (node.type === 'Property' && !node.computed && (node.key?.name ?? node.key?.value) === 'defaultMessage') {
      const value = node.value;
      if (value.type === 'Literal' && typeof value.value === 'string') found.push(value.value);
      else if (value.type === 'TemplateLiteral' && value.expressions.length === 0) found.push(value.quasis[0].value.cooked);
      else found.push({ dynamic: code.slice(value.start, value.end) });
    }
    for (const [key, child] of Object.entries(node)) if (key !== 'type' && child && typeof child === 'object') visit(child);
  };
  visit(program);
  return found;
}
const railMessages = () => {
  const all = new Map();
  for (const file of railFiles()) for (const message of messagesOf(file)) {
    const key = typeof message === 'string' ? message : JSON.stringify(message);
    if (!all.has(key)) all.set(key, new Set());
    all.get(key).add(file);
  }
  return all;
};

test('every rail message has a zh-CN entry (generated 2.42304.0 rail modules and the rail host stand-ins)', () => {
  const all = railMessages();
  assert.ok(all.size > 100, `rail copy collected: ${all.size}`);
  const dynamic = [...all.keys()].filter((key) => key.startsWith('{"dynamic"'));
  assert.deepEqual(dynamic, [], 'every defaultMessage is a literal the catalog can key');
  const missing = [...all].filter(([message]) => !Object.hasOwn(zh, message)).map(([message, files]) => `${message}  [${[...files].join(', ')}]`);
  assert.deepEqual(missing, []);
});

test('the R4f-rail block in session.mjs holds rail copy only; D23 keeps "Claude"; no key is defined twice', () => {
  const source = fs.readFileSync(path.join(app, 'electron/i18n/zh-CN/session.mjs'), 'utf8');
  const open = source.indexOf('  // R4f-rail (SR-8):'), close = source.indexOf('  // R4f-rail end.');
  assert.ok(open > 0 && close > open, 'the block is marked');
  assert.equal(source.split('// R4f-rail (SR-8):').length, 2);
  const block = source.slice(open, close);
  const keys = [...block.matchAll(/^ {2}("(?:[^"\\]|\\.)*"): "/gm)].map((match) => JSON.parse(match[1]));
  assert.ok(keys.length >= 60, `entries: ${keys.length}`);
  const rail = railMessages();
  assert.deepEqual(keys.filter((key) => !rail.has(key)), [], 'each entry is a message a rail module shows');
  assert.equal(new Set(keys).size, keys.length);
  // Each block key is defined exactly once across all zh-CN area files.
  const dir = path.join(app, 'electron/i18n/zh-CN');
  const elsewhere = fs.readdirSync(dir).filter((name) => name.endsWith('.mjs') && name !== 'index.mjs' && name !== 'session.mjs')
    .flatMap((name) => keys.filter((key) => fs.readFileSync(path.join(dir, name), 'utf8').includes(JSON.stringify(key))).map((key) => `${name}: ${key}`));
  assert.deepEqual(elsewhere, []);
  for (const key of keys.filter((key) => key.includes('Claude'))) assert.ok(zh[key].includes('Claude'), `D23 keeps "Claude": ${key}`);
});

test('zh-CN lookups of the rail copy (t, as the kit useIntl adapter calls it)', () => {
  const previous = getLocale();
  try {
    setLocale('zh-CN');
    assert.equal(t('Session details'), '会话详情');
    assert.equal(t('Hide session rail'), '隐藏会话详情栏');
    assert.equal(t('Show session rail'), '显示会话详情栏');
    assert.equal(t('Not in worktree'), '不在工作树中');
    assert.equal(t('Local session'), '本地会话');
    assert.equal(t('Open changes, {added, number} added, {removed, number} removed'), '打开更改，新增 {added, number} 行，删除 {removed, number} 行');
    assert.equal(t('Claude hasn’t moved to this session’s worktree yet. Until it does, the folder and branch shown are your own.'),
      'Claude 尚未进入此会话的工作树。在此之前，显示的文件夹和分支是你自己的。');
    // Copy the rail shares with other surfaces keeps its existing wording.
    assert.equal(t('Worktree'), '工作树');
    assert.equal(t('Background tasks'), '后台任务');
    setLocale('en-US');
    assert.equal(t('Session details'), 'Session details');
  } finally {
    setLocale(previous);
  }
});
