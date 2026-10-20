// Builds cu-ax-helper (main.swift) into build/cu-ax-helper, which electron/computer-use/ax-helper.cjs runs; the package
// step unpacks build/ from app.asar (a binary inside the archive can't be executed).
// Run: node helpers/cu-ax/build.mjs   (from app/; part of `npm run build:native`)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const out = path.join(root, 'build', 'cu-ax-helper');
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync('swiftc', ['-O', '-target', 'arm64-apple-macos14', path.join(root, 'main.swift'), '-o', out], { stdio: 'inherit' });
console.log(`cu-ax-helper → ${path.relative(process.cwd(), out)}`);
