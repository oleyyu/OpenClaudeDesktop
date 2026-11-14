import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const { coreInstructionFiles } = createRequire(import.meta.url)('../electron/instructions-service.cjs');

test('DeepSeek instruction files: the harness home AGENTS.md, then AGENTS/CLAUDE(.local).md from the repo root to the folder', () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'core-ins-')));
  const repo = path.join(base, 'repo'), sub = path.join(repo, 'pkg', 'app');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true }); fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'never run migrations');
  fs.writeFileSync(path.join(sub, 'AGENTS.local.md'), 'local');
  const files = coreInstructionFiles(sub, { home: base, env: { DSH_HOME: path.join(base, 'harness-home') } });
  assert.deepEqual(files.map((file) => [file.scope, path.relative(base, file.path), file.exists]), [
    ['global', 'harness-home/AGENTS.md', false], ['project', 'repo/CLAUDE.md', true], ['project', 'repo/pkg/app/AGENTS.local.md', true]]);
  fs.rmSync(base, { recursive: true, force: true });
});

test('MiniMax instruction files: <data dir>/AGENTS.md, then only the first of CLAUDE.md / AGENTS.md with text in the session folder', () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'core-ins-mm-')));
  const repo = path.join(base, 'repo'), sub = path.join(repo, 'pkg');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true }); fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'repo root, not read by MiniMax from pkg');
  fs.writeFileSync(path.join(sub, 'AGENTS.md'), 'agents');
  const names = (env = {}) => coreInstructionFiles(sub, { home: base, env, engine: 'minimax' }).map((file) => `${file.scope}:${path.relative(base, file.path)}`);
  assert.deepEqual(names(), ['global:.minimax/AGENTS.md', 'project:repo/pkg/AGENTS.md']);
  fs.writeFileSync(path.join(sub, 'CLAUDE.md'), '  \n');
  assert.deepEqual(names(), ['global:.minimax/AGENTS.md', 'project:repo/pkg/AGENTS.md'], 'a blank CLAUDE.md is skipped, as mcode does');
  fs.writeFileSync(path.join(sub, 'CLAUDE.md'), 'claude');
  assert.deepEqual(names(), ['global:.minimax/AGENTS.md', 'project:repo/pkg/CLAUDE.md']);
  assert.deepEqual(names({ MINIMAX_DATA_DIR: path.join(base, 'mm') }), ['global:mm/AGENTS.md', 'project:repo/pkg/CLAUDE.md']);
  assert.deepEqual(names({ MAVIS_DATA_DIR: path.join(base, 'mavis') }), ['global:mavis/AGENTS.md', 'project:repo/pkg/CLAUDE.md']);
  fs.rmSync(base, { recursive: true, force: true });
});

test('MiMo / OpenCode instruction files: the first existing global, every AGENTS.md up to the repo root, CLAUDE.md beside a sparse MiMo AGENTS.md', () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'core-ins-mimo-')));
  const repo = path.join(base, 'repo'), sub = path.join(repo, 'pkg');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true }); fs.mkdirSync(sub, { recursive: true });
  const names = (engine, env = {}) => coreInstructionFiles(sub, { home: base, env, engine }).map((file) => `${file.scope}:${path.relative(base, file.path)}${file.exists ? '' : '?'}`);
  // Nothing anywhere: the first global is where to create one.
  assert.deepEqual(names('mimo'), ['global:.config/mimocode/AGENTS.md?']);
  // ~/.claude/CLAUDE.md is read when the core's own global file is missing.
  fs.mkdirSync(path.join(base, '.claude')); fs.writeFileSync(path.join(base, '.claude', 'CLAUDE.md'), 'personal');
  assert.deepEqual(names('mimo'), ['global:.claude/CLAUDE.md']);
  assert.deepEqual(names('mimo', { MIMOCODE_DISABLE_CLAUDE_CODE_PROMPT: '1' }), ['global:.config/mimocode/AGENTS.md?']);
  assert.deepEqual(names('opencode'), ['global:.claude/CLAUDE.md']);
  // No AGENTS.md: every CLAUDE.md up to the repo root (the session folder first).
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'repo claude'); fs.writeFileSync(path.join(sub, 'CONTEXT.md'), 'old');
  assert.deepEqual(names('opencode'), ['global:.claude/CLAUDE.md', 'project:repo/CLAUDE.md']);
  // A short AGENTS.md: OpenCode reads it alone, MiMo adds the CLAUDE.md files too.
  fs.writeFileSync(path.join(sub, 'AGENTS.md'), 'short');
  assert.deepEqual(names('opencode'), ['global:.claude/CLAUDE.md', 'project:repo/pkg/AGENTS.md']);
  assert.deepEqual(names('mimo'), ['global:.claude/CLAUDE.md', 'project:repo/pkg/AGENTS.md', 'project:repo/CLAUDE.md']);
  fs.writeFileSync(path.join(sub, 'AGENTS.md'), 'x'.repeat(600));
  assert.deepEqual(names('mimo'), ['global:.claude/CLAUDE.md', 'project:repo/pkg/AGENTS.md']);
  fs.rmSync(base, { recursive: true, force: true });
});

test('ZCode instruction files: ~/.zcode/AGENTS.md, then only the nearest AGENTS.md from the folder up to the repo root', () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'core-ins-zc-')));
  const repo = path.join(base, 'repo'), sub = path.join(repo, 'pkg', 'app');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true }); fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(base, 'AGENTS.md'), 'above the repo root: never read');
  const names = (cwd = sub) => coreInstructionFiles(cwd, { home: base, env: {}, engine: 'zcode' }).map((file) => `${file.scope}:${path.relative(base, file.path)}:${file.exists}`);
  assert.deepEqual(names(), ['global:.zcode/AGENTS.md:false'], 'the walk stops at the git root');
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), 'repo rules');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'not a ZCode priority file');
  assert.deepEqual(names(), ['global:.zcode/AGENTS.md:false', 'project:repo/AGENTS.md:true']);
  fs.writeFileSync(path.join(repo, 'pkg', 'AGENTS.md'), 'package rules');
  assert.deepEqual(names(), ['global:.zcode/AGENTS.md:false', 'project:repo/pkg/AGENTS.md:true'], 'only the nearest one');
  fs.mkdirSync(path.join(base, '.zcode')); fs.writeFileSync(path.join(base, '.zcode', 'AGENTS.md'), 'user rules');
  assert.deepEqual(names(), ['global:.zcode/AGENTS.md:true', 'project:repo/pkg/AGENTS.md:true']);
  assert.deepEqual(names(path.join(base, '.zcode')), ['global:.zcode/AGENTS.md:true'], 'the user file is listed once');
  const loose = path.join(base, 'loose', 'deep'); fs.mkdirSync(loose, { recursive: true });
  assert.deepEqual(names(loose), ['global:.zcode/AGENTS.md:true', 'project:AGENTS.md:true'], 'no git root: up to the filesystem root, as ZCode does');
  fs.rmSync(base, { recursive: true, force: true });
});

test('Qwen instruction files: context.fileName replaces QWEN.md/AGENTS.md, QWEN.local.md at the git root, and the rules folders', () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'core-ins-qwen-')));
  const repo = path.join(base, 'repo'), sub = path.join(repo, 'pkg'), qwen = path.join(base, '.qwen');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true }); fs.mkdirSync(sub, { recursive: true });
  fs.mkdirSync(path.join(qwen, 'rules'), { recursive: true }); fs.mkdirSync(path.join(repo, '.qwen', 'rules', 'web'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'QWEN.md'), 'shared');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'claude');
  fs.writeFileSync(path.join(repo, '.qwen', 'QWEN.local.md'), 'mine');
  fs.writeFileSync(path.join(qwen, 'rules', 'style.md'), 'Always answer briefly.');
  fs.writeFileSync(path.join(qwen, 'rules', 'empty.md'), '---\npaths: ["x"]\n---\n<!-- nothing -->\n');
  fs.writeFileSync(path.join(repo, '.qwen', 'rules', 'testing.md'), '---\ndescription: tests\npaths:\n  - "src/**/*.test.ts"\n  - tests/**\n---\nRun vitest.');
  fs.writeFileSync(path.join(repo, '.qwen', 'rules', 'web', 'css.md'), '---\npaths: [src/**/*.css, "styles/*"]\n---\nUse tokens.');
  const list = () => coreInstructionFiles(sub, { home: base, env: {}, engine: 'qwen' }).map((file) => [file.scope, path.relative(base, file.path), file.exists, file.local === true, file.rule ? file.paths : undefined]);
  assert.deepEqual(list(), [
    ['global', '.qwen/QWEN.md', false, false, undefined],
    ['global', '.qwen/rules/style.md', true, false, null],
    ['project', 'repo/QWEN.md', true, false, undefined],
    ['project', 'repo/.qwen/QWEN.local.md', true, true, undefined],
    ['project', 'repo/.qwen/rules/testing.md', true, false, ['src/**/*.test.ts', 'tests/**']],
    ['project', 'repo/.qwen/rules/web/css.md', true, false, ['src/**/*.css', 'styles/*']],
  ], 'the default names; an empty rule is not listed (Qwen skips it)');
  // context.fileName replaces the defaults, globally and per folder.
  fs.writeFileSync(path.join(qwen, 'settings.json'), JSON.stringify({ context: { fileName: ['CLAUDE.md', 'AGENTS.md'] } }));
  fs.writeFileSync(path.join(qwen, 'AGENTS.md'), 'global agents');
  const named = list().map(([scope, file]) => `${scope}:${file}`);
  assert.deepEqual(named.slice(0, 4), ['global:.qwen/CLAUDE.md', 'global:.qwen/AGENTS.md', 'global:.qwen/rules/style.md', 'project:repo/CLAUDE.md']);
  assert.ok(!named.includes('project:repo/QWEN.md'), 'QWEN.md is no longer read');
  // Without a git root there is no QWEN.local.md slot, and the rules come from the session folder.
  fs.rmSync(path.join(repo, '.git'), { recursive: true });
  assert.ok(!list().some(([, file]) => file.endsWith('QWEN.local.md')));
  fs.rmSync(base, { recursive: true, force: true });
});
