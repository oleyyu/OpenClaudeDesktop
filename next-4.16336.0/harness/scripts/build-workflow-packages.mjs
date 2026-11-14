/** Rebuild the pinned workflow patch from its independent vendor checkout. */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';

const harness = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = resolve(harness, '../vendor/deepseek-harness');
const requireVendor = createRequire(join(vendor, 'package.json'));
const pnpm = resolve(harness, 'node_modules/.bin/pnpm');
const run = args => execFileSync(pnpm, args, { cwd: vendor, stdio: 'inherit' });
const runNode = args => execFileSync(process.execPath, args, { cwd: vendor, stdio: 'inherit' });
const packages = ['fs/fs', 'fs/fs-local', 'ssh/ssh', 'ssh/fs-ssh', 'hooks/hook-protocol', 'shell/tool-bash', 'jobs/jobs', 'jobs/jobs-local', 'jobs/tool-jobs', 'core/tools', 'core/scope', 'core/agent-loop', 'settings/claude-code-config', 'hooks/hooks-claude-code', 'mcp/mcp-client', 'mcp/mcp-resources', 'workflow/workflow', 'workflow/workflow-ptc', 'workflow/tool-workflow', 'workflow/tool-ralph', 'subagent/subagent', 'subagent/subagent-in-process-driver', 'subagent/subagent-dsh-sdk', 'subagent/subagent-spawn-in-process', 'core/session', 'extensions/tool-cordis'];
packages.push('core/agent', 'llm/llm', 'llm/llm-deepseek', 'llm/llm-retry', 'llm/token-meter', 'subagent/subagent-fork-in-process', 'sdk/client', 'subagent/tool-subagent');
// --pack-only is for verified, already compiled outputs (for example after doc-sync).
if (!process.argv.includes('--pack-only')) {
runNode(['node_modules/tsx/dist/cli.mjs', 'scripts/gen-workflow-guest.ts']);
runNode(['node_modules/typescript/bin/tsc', '-b', ...packages.map(p => `packages/${p}`), 'packages/typert/generator']);
const { build } = await import(pathToFileURL(requireVendor.resolve('tsdown')).href);
const { typertPlugin } = await import(pathToFileURL(join(vendor, 'packages/typert/generator/lib/types/tsdown-plugin.js')).href);
// One plugin owns one workspace emission, just as in the workspace tsdown config.
const typert = typertPlugin({ mode: 'workspace', faces: ['host'] });
for (const pkg of packages) {
  const directory = join(vendor, 'packages', pkg);
  // Session's package config builds its entry points independently; its published files exclude shared chunks.
  // Session's browser-safe leaves ship from lib/types, including streaming-assistant.
  const entries = pkg === 'subagent/tool-subagent' ? [['lib/types/index.js'], ['lib/types/invariant.js'], ['lib/types/model-selection-settings.js']] : pkg === 'ssh/ssh' ? [{ index: 'lib/types/index.js', protocol: 'lib/types/protocol.js', schemas: 'lib/types/schemas.js', helper: 'lib/types/helper-entry.js' }] : ['fs/fs', 'core/session', 'core/scope', 'core/tools', 'core/agent', 'core/agent-loop', 'llm/llm', 'jobs/jobs'].includes(pkg) ? [['lib/types/index.js'], ['lib/types/invariant.js']] : [['lib/types/{index,invariant}.js']];
  // scope's invariant must import the root carrier WeakMap, as its package config requires.
  const deps = pkg === 'core/scope' ? { neverBundle: ['@deepseek-ai/dsh-scope'] } : undefined;
  for (const entry of entries) await build({ cwd: directory, config: false, entry, outDir: 'lib', format: ['esm'], platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false, deps, plugins: [typert] });
}
}
const destination = join(harness, 'vendor-packages');
mkdirSync(destination, { recursive: true });
// Resolve the workspace once, retaining the same explicit package selection.
const packFilters = packages.flatMap(pkg => ['--filter', JSON.parse(readFileSync(join(vendor, 'packages', pkg, 'package.json'), 'utf8')).name]);
run(['pack', '--recursive', '--workspace-concurrency', '1', ...packFilters, '--pack-destination', destination]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = packages.flatMap(pkg => readdirSync(join(vendor, 'packages', pkg, 'src'), { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name))).sort();
const packageJsonPath = join(harness, 'package.json');
const application = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
application.overrides ??= {};
const manifest = {
  base: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: vendor, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: vendor, encoding: 'utf8' }).trim(),
  sourceSha256: sha(inputs.map(file => `${file.slice(vendor.length + 1)}\0${sha(readFileSync(file))}`).join('\n')),
  packages: packages.map(pkg => {
    const meta = JSON.parse(readFileSync(join(vendor, 'packages', pkg, 'package.json'), 'utf8'));
    const stem = `${meta.name.replace(/^@/, '').replace('/', '-')}-${meta.version}`;
    const hash = sha(readFileSync(join(destination, `${stem}.tgz`)));
    const file = `${stem}-${hash.slice(0, 12)}.tgz`;
    renameSync(join(destination, `${stem}.tgz`), join(destination, file));
    application.dependencies[meta.name] = `file:vendor-packages/${file}`;
    application.overrides[meta.name] = `$${meta.name}`;
    return { name: meta.name, version: meta.version, file, sha256: hash };
  }),
};
writeFileSync(packageJsonPath, JSON.stringify(application, null, 2) + '\n');
writeFileSync(join(destination, 'workflow-build.json'), JSON.stringify(manifest, null, 2) + '\n');
