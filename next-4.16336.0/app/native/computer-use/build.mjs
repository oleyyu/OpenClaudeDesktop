// Builds the computer-use native module: `swift build -c release`, then copies the dynamic library to
// build/computer_use.node (what electron/computer-use/native.cjs loads; the package step unpacks build/ from app.asar).
// Run: node native/computer-use/build.mjs   (from app/; `npm run build:native`)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
execFileSync('swift', ['build', '-c', 'release', '--package-path', root], { stdio: 'inherit' });
const bin = execFileSync('swift', ['build', '-c', 'release', '--package-path', root, '--show-bin-path'], { encoding: 'utf8' }).trim();
const out = path.join(root, 'build');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(bin, 'libcomputer_use.dylib'), path.join(out, 'computer_use.node'));
console.log(`computer_use.node → ${path.relative(process.cwd(), path.join(out, 'computer_use.node'))}`);
