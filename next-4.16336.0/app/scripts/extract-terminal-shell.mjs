// Extract the 3.6556.2 desktop terminal shell integration (startup scripts, launch planner, shell kind) without executing
// any desktop runtime. From asar index.chunk-B80dqaMC.js (2.31226.0 desktop/index.chunk-CiiI592G.js names in brackets):
//   m h g _ v [Pq Pjr Fq Fjr Ijr]  the CLAUDE_DESKTOP_* environment names; ee y b x [Ljr Rjr zjr Bjr] the script names;
//   te [Vjr] "spawn"; S ne re ie ae oe se ce le ue [Hjr Ujr Wjr Gjr Kjr qjr Jjr Yjr Xjr Zjr] the zsh / bash / fish / pwsh
//   scripts; de [Qjr] the script table;
//   C w T pe [Iq Lq $jr tMr] basename, pwsh test, shellKind, shellLaunch.
// 3.6556.2 changes against 2.31226.0: se [Jjr] keeps the nonce file in __claude_desktop_nf and empties it when Git Bash has
// no rm yet; T [$jr] drops a trailing .exe; pe [tMr] writes Windows Git Bash paths with forward slashes.
// pe's fish branch quotes through the chunk's `t = require("./index.chunk-jPKPzV-P.js")` as `t.P`, which that chunk's
// export table resolves to $Ba [2.31226.0 Mjr, then in the same chunk]: it is sliced from jPKPzV-P and the emitted module
// rebuilds `const t = { P: $Ba }`. B80dqaMC's `n = e.a(require("node:path"))` is rebuilt as `{ default: require("node:path") }`.
// A missing binding, a re-pointed require or export, or a free identifier in the emitted module fails generation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { referenceVersion, referenceSnapshot, asarSource } from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
// R1: version, snapshot and asar directory from the shared 3.6556.2 constants.
const build = asarSource;
const source = path.join(build, 'index.chunk-B80dqaMC.js');
const helperFile = 'index.chunk-jPKPzV-P.js';
const wantedNames = ['m', 'h', 'g', '_', 'v', 'ee', 'y', 'b', 'x', 'te', 'S', 'ne', 're', 'ie', 'ae', 'oe', 'se', 'ce', 'le', 'ue', 'de', 'C', 'w', 'T', 'pe'];
const exportsAs = { shellScripts: 'de', shellLaunch: 'pe', shellKind: 'T' };
// Stable strings each slice must still carry (R2), so a reused minified name fails instead of binding something else.
const features = {
  g: ['"CLAUDE_DESKTOP_TERMINAL_NONCE_FILE"'], y: ['"claude-desktop.bash"'], se: ['__claude_desktop_nf', 'Git Bash has no rm on PATH until /etc/profile has run'],
  de: ['"zsh/.zshenv"', '[`bash/${y}`]', '[`pwsh/${x}`]'], T: ['.replace(/\\.exe$/,"")', '"pwsh"'], pe: ['"--init-file"', 'replaceAll("\\\\","/")', '"-NoProfile","-NoExit","-Command"', 't.P('],
};
const sha = s => createHash('sha256').update(s).digest('hex');
const output = path.join(root, 'electron/generated/terminal-shell.cjs'), manifestFile = path.join(root, 'electron/generated/terminal-shell-manifest.json');

function exportTable(ast, file) {
  const table = new Map();
  for (const statement of ast.program.body) {
    if (statement.type !== 'ExpressionStatement') continue;
    const list = statement.expression.type === 'SequenceExpression' ? statement.expression.expressions : [statement.expression];
    for (const node of list) {
      if (node.type !== 'CallExpression' || node.callee?.object?.name !== 'Object' || node.callee.property?.name !== 'defineProperty' || node.arguments[0]?.name !== 'exports') continue;
      const returned = node.arguments[2]?.properties?.find(p => p.key?.name === 'get')?.value?.body?.body?.[0]?.argument;
      if (returned?.type !== 'Identifier') throw Error(`${file}: export ${node.arguments[1]?.value} has an unexpected getter`);
      table.set(node.arguments[1].value, returned.name);
    }
  }
  return table;
}
const topLevel = (ast, name) => {
  const hits = [];
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push({ kind: 'function', node });
    for (const d of node.declarations ?? []) if (d.id?.name === name) hits.push({ kind: 'declarator', node: d });
  }
  if (hits.length !== 1) throw Error(`expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
};
const emit = (text, { kind, node }) => (kind === 'function' ? text.slice(node.start, node.end) : 'var ' + text.slice(node.start, node.end) + ';');
const requireOf = (text, ast, name) => {
  const { kind, node } = topLevel(ast, name);
  if (kind !== 'declarator' || node.init?.callee?.name !== 'require') throw Error(`${name} is no longer a require()`);
  return node.init.arguments[0].value.replace(/^\.\//, '');
};

export async function extractTerminalShell({ check = false } = {}) {
  const text = await fs.readFile(source, 'utf8'), ast = parsers.babel.parse(text, {});
  // `t` in pe is the main chunk's namespace and `t.P` the shell quote.
  if (requireOf(text, ast, 't') !== helperFile) throw Error(`index.chunk-B80dqaMC.js: t no longer requires ${helperFile}`);
  const helperText = await fs.readFile(path.join(build, helperFile), 'utf8'), helperAst = parsers.babel.parse(helperText, {});
  const quote = exportTable(helperAst, helperFile).get('P');
  if (!quote) throw Error(`${helperFile}: no export P`);
  const quoteHit = topLevel(helperAst, quote), quoteText = emit(helperText, quoteHit);
  if (quoteHit.kind !== 'function' || !quoteText.includes('.replace(/[\\\\\']/g,"\\\\$&")')) throw Error(`${helperFile}: ${quote} is no longer the single-quote shell quote`);
  const parts = [];
  // Source order, as the chunk evaluates them.
  const hits = wantedNames.map(name => ({ name, ...topLevel(ast, name) })).sort((a, b) => a.node.start - b.node.start);
  for (const hit of hits) {
    const part = emit(text, hit);
    for (const feature of features[hit.name] ?? []) if (!part.includes(feature)) throw Error(`index.chunk-B80dqaMC.js: ${hit.name} lacks ${JSON.stringify(feature)}`);
    parts.push(part);
  }
  const code = `// Generated from Claude ${referenceVersion} desktop shell integration (asar index.chunk-B80dqaMC.js, ${quote} from ${helperFile}); do not edit.\n"use strict";\nconst n={default:require("node:path")};\n${quoteText}\nconst t={P:${quote}};\n`
    + parts.join('\n') + `\nmodule.exports={${Object.entries(exportsAs).map(([name, local]) => `${name}:${local}`).join(',')}};\n`;
  const parsed = babel.babelParse(code, 'terminal-shell.cjs', false);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals).filter(name => !['require', 'module'].includes(name)); } });
  if (globals.length) throw Error(`terminal-shell.cjs: unbound ${globals.join(', ')}`);
  const manifest = JSON.stringify({ reference: referenceVersion, referenceSnapshot, source: path.relative(root, source), sourceSha256: sha(text), bindings: wantedNames, exports: exportsAs,
    helpers: [{ file: path.relative(root, path.join(build, helperFile)), sourceSha256: sha(helperText), export: 'P', binding: quote, as: 't.P' }], output: 'terminal-shell.cjs', sha256: sha(code) }, null, 2) + '\n';
  if (check) {
    if (await fs.readFile(output, 'utf8').catch(() => null) !== code) throw Error('terminal-shell.cjs mismatch. Run scripts/extract-terminal-shell.mjs.');
    if (await fs.readFile(manifestFile, 'utf8').catch(() => null) !== manifest) throw Error('terminal-shell-manifest.json mismatch. Run scripts/extract-terminal-shell.mjs.');
  } else {
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, code);
    await fs.writeFile(manifestFile, manifest);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  await extractTerminalShell({ check });
  console.log(check ? 'Original shell scripts and launch planner verified.' : 'Extracted original shell scripts and launch planner.');
}
