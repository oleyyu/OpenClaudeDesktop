// Windows x64 build of OpenClaude Desktop, made on a Mac: `npm run package:win`.
//
// 1. build/icon.ico from build/icon.iconset (PNG-compressed ICO entries, which Windows Vista and later read);
// 2. electron-packager for win32/x64 (resedit edits the exe's icon and version info in pure JS, no Wine), with
//    node-pty's win32-x64 ConPTY prebuilds unpacked beside app.asar; no Swift computer use and no Cowork VM disk,
//    both macOS only (computer-use/native.cjs and the Cowork runtime report them unavailable on Windows);
// 3. the DeepSeek Harness core in resources/harness: this checkout's harness (the Mac install the app ships with)
//    with its platform packages swapped for the win32-x64 ones of a `npm ci --os=win32 --cpu=x64` install
//    (releases/harness-win32-x64, made by this script when missing). Symlinks are copied as files: a zip
//    extracted by Explorer has none;
// 4. releases/OpenClaude-Desktop-<version>-win32-x64.zip (portable: unzip, run OpenClaude Desktop.exe).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { packager } from '@electron/packager';

const root = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(root, '..');
const releases = path.join(repo, 'releases');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const NAME = 'OpenClaude Desktop';
const step = (text) => console.log(`\n== ${text}`);

if (!fs.existsSync(path.join(root, 'dist/index.html'))) throw new Error('Run `npm run build` first: dist/ is missing.');

step('icon.ico');
const iconSet = path.join(root, 'build/icon.iconset');
const icons = [[16, 'icon_16x16.png'], [32, 'icon_32x32.png'], [48, 'icon_32x32@2x.png'], [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'], [256, 'icon_256x256.png']]
  .filter(([, file], index, all) => all.findIndex(([, other]) => other === file) === index)
  .map(([size, file]) => ({ size, data: fs.readFileSync(path.join(iconSet, file)) }))
  .map(({ data }) => ({ data, width: data.readUInt32BE(16), height: data.readUInt32BE(20) }));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icons.length, 4);
let offset = 6 + 16 * icons.length;
const entries = icons.map(({ data, width, height }) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0); entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6); entry.writeUInt32LE(data.length, 8); entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});
fs.writeFileSync(path.join(root, 'build/icon.ico'), Buffer.concat([header, ...entries, ...icons.map(({ data }) => data)]));
console.log(`build/icon.ico: ${icons.map(({ width }) => width).join(', ')}`);

step('electron-packager win32/x64');
const keepSrc = '(workflow-progress-model|bridge-text-model|deliverable-records|agent-tool-titles|thread-history-model|turn-error-model|host-path-model)';
// Every src/ module the main process reaches through relative imports must be in keepSrc, or the packaged app stops
// in app.whenReady (ERR_MODULE_NOT_FOUND, no window). Walk electron/ and fail the build on a miss.
{
  const seen = new Set(), missing = new Set();
  const importRe = /(?:require\(|from\s+|import\(|import\s+)\s*["'](\.{1,2}\/[^"']+)["']/g;
  const visit = (file) => {
    if (seen.has(file) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return;
    seen.add(file);
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (rel.startsWith('src/') && !new RegExp(`^src/${keepSrc}\\.mjs$`).test(rel)) missing.add(rel);
    for (const match of fs.readFileSync(file, 'utf8').matchAll(importRe)) visit(path.resolve(path.dirname(file), match[1]));
  };
  const scripts = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? (entry.name === 'node_modules' ? [] : scripts(path.join(dir, entry.name))) : /\.(c|m)?js$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
  for (const file of scripts(path.join(root, 'electron'))) visit(file);
  if (missing.size) throw new Error(`electron/ imports src files the package leaves out; add them to keepSrc (and package.json's package --ignore): ${[...missing].join(', ')}`);
}
const [appDir] = await packager({
  dir: root, name: NAME, executableName: NAME, platform: 'win32', arch: 'x64', out: releases, overwrite: true, prune: false,
  icon: path.join(root, 'build/icon.ico'), appVersion: pkg.version, buildVersion: pkg.version,
  appCopyright: 'OpenClaude Desktop contributors',
  win32metadata: { CompanyName: 'OpenClaude', ProductName: NAME, FileDescription: NAME, InternalName: NAME, OriginalFilename: `${NAME}.exe` },
  ignore: [
    new RegExp(`^/src/(?!${keepSrc}\\.mjs$)`),
    /^\/(tests|scripts|public|build|vite\.config\.js|index\.html|composer-fixture\.html|package-lock\.json)(\/|$)/,
    /^\/node_modules\/(?!node-pty(\/|$))/,
    /^\/node_modules\/node-pty\/(?!(package\.json|LICENSE|lib|prebuilds)(\/|$))/,
    /^\/node_modules\/node-pty\/prebuilds\/(?!win32-x64(\/|$))/,
    /^\/node_modules\/node-pty\/lib\/.*\.(test\.js|map)$/,
    /^\/native(\/|$)/,
  ],
  // ConPTY needs conpty.node, conpty.dll and OpenConsole.exe as real files. One path, no braces: minimatch doesn't
  // expand a single-item {…}, so '{node_modules/node-pty/prebuilds}' matched nothing and packed them into the asar.
  asar: { unpackDir: 'node_modules/node-pty/prebuilds' },
});
console.log(appDir);

step('harness (DeepSeek core) for win32-x64');
const harness = path.join(repo, 'harness');
const winInstall = path.join(releases, 'harness-win32-x64');
if (!fs.existsSync(path.join(winInstall, 'node_modules'))) {
  fs.mkdirSync(winInstall, { recursive: true });
  for (const entry of ['package.json', 'package-lock.json', 'bin', 'packages', 'profile', 'vendor-packages'])
    fs.cpSync(path.join(harness, entry), path.join(winInstall, entry), { recursive: true });
  execFileSync('npm', ['ci', '--os=win32', '--cpu=x64', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: winInstall, stdio: 'inherit' });
}
const target = path.join(appDir, 'resources/harness');
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
for (const entry of ['package.json', 'bin', 'packages', 'profile', 'node_modules'])
  fs.cpSync(path.join(harness, entry), path.join(target, entry), { recursive: true, dereference: true,
    // .bin holds shell launchers of the Mac install; nothing in the core runs them, and on Windows they are dead files.
    // npm leaves .<name>-XXXX staging folders behind after an interrupted install; one here links back to its own
    // parent, which dereference would follow for ever. Skip every dot entry inside node_modules but the lockfile.
    filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}.bin`)
      && !/[\\/]node_modules[\\/](@[^\\/]+[\\/])?\.(?!package-lock\.json$)[^\\/]+/.test(source) });
// Swap every platform package: drop the Mac ones, copy the win32-x64 ones the Windows install chose.
const platformDir = /(darwin|linux|win32|win-x64|win-arm64)/;
const listPackages = (dir) => fs.readdirSync(dir).flatMap((name) => name.startsWith('@')
  ? fs.readdirSync(path.join(dir, name)).map((inner) => `${name}/${inner}`) : [name]);
const macModules = path.join(target, 'node_modules'), winModules = path.join(winInstall, 'node_modules');
const removed = listPackages(macModules).filter((name) => platformDir.test(name) && !fs.existsSync(path.join(winModules, name)));
for (const name of removed) fs.rmSync(path.join(macModules, name), { recursive: true, force: true });
const added = listPackages(winModules).filter((name) => /(win32|win-x64)/.test(name));
for (const name of added) fs.cpSync(path.join(winModules, name), path.join(macModules, name), { recursive: true, dereference: true });
console.log(`removed ${removed.join(', ')}\nadded ${added.join(', ')}`);
const leftovers = [];
const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  const file = path.join(dir, entry.name);
  if (entry.isSymbolicLink()) leftovers.push(file); else if (entry.isDirectory()) walk(file);
  else if (entry.name.endsWith('.node') && /darwin/.test(file)) leftovers.push(file);
} };
walk(appDir);
if (leftovers.length) console.warn(`Mac-only files or links left (harmless when unused):\n${leftovers.slice(0, 20).join('\n')}`);

step('zip');
const zip = path.join(releases, `OpenClaude-Desktop-${pkg.version}-win32-x64.zip`);
fs.rmSync(zip, { force: true });
execFileSync('ditto', ['-c', '-k', '--norsrc', '--noextattr', '--keepParent', appDir, zip], { stdio: 'inherit' });
console.log(`${zip} (${(fs.statSync(zip).size / 1048576).toFixed(1)} MB)`);
