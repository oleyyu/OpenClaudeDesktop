// Builds the sidebar-glass native module: `swift build -c release`, then copies the dynamic library to
// build/sidebar_glass.node (what electron/window-vibrancy.cjs loads; the package step unpacks build/ from app.asar).
// Run: node native/sidebar-glass/build.mjs   (from app/; part of `npm run build:native`)
// Extra arguments go to `swift build`, e.g. `node native/sidebar-glass/build.mjs --disable-sandbox` under a sandbox
// that forbids SwiftPM's own.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const extra = process.argv.slice(2);
execFileSync('swift', ['build', '-c', 'release', '--package-path', root, ...extra], { stdio: 'inherit' });
const bin = execFileSync('swift', ['build', '-c', 'release', '--package-path', root, ...extra, '--show-bin-path'], { encoding: 'utf8' }).trim();
const out = path.join(root, 'build');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(bin, 'libsidebar_glass.dylib'), path.join(out, 'sidebar_glass.node'));
console.log(`sidebar_glass.node → ${path.relative(process.cwd(), path.join(out, 'sidebar_glass.node'))}`);
