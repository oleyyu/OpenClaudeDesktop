// The packaged app carries its own DeepSeek Harness core: codex.cjs resolveCore() looks in
// <app>/Contents/Resources/harness first, so a copy of this checkout's harness (its installed node_modules
// included, relative symlinks kept) makes the app work on a Mac without the repository. Runs after
// electron-packager and before sign-local.mjs, so the signature covers the copied files.
import fs from 'node:fs';
import path from 'node:path';
const source = path.resolve(import.meta.dirname, '../../harness');
const app = path.resolve(import.meta.dirname, '../../releases/OpenClaude Desktop-darwin-arm64/OpenClaude Desktop.app');
const target = path.join(app, 'Contents/Resources/harness');
if (!fs.existsSync(path.join(source, 'node_modules'))) throw new Error('Run npm install in harness/ first: the bundled core needs its node_modules.');
if (!fs.existsSync(app)) throw new Error(`Package the app first: ${app} is missing.`);
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
// What the core reads at runtime: bin/codex-app-server.mjs, its package.json, the bridge packages, the profile
// template and the installed dependencies (whose file: links point into packages/).
for (const entry of ['package.json', 'bin', 'packages', 'profile', 'node_modules'])
  fs.cpSync(path.join(source, entry), path.join(target, entry), { recursive: true, verbatimSymlinks: true });
console.log(`Bundled the core into ${path.relative(process.cwd(), target)}`);
