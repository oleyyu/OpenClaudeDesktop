// Live computer-use tests (CU_LIVE=1 only): they type into a fixture app on this Mac, so they need Accessibility and
// Screen Recording for the process running them and a few seconds without keyboard or mouse input.
//   CU_LIVE=1 node --test tests/computer-use-type-live.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const app = path.resolve(import.meta.dirname, '..');
export const FIXTURE = 'dev.openclaude.cu-text-fixture';
const built = fs.existsSync(path.join(app, 'native/computer-use/build/computer_use.node'));

export function native() {
  return require('../electron/computer-use/native.cjs').createNative();
}

/** Why the live tests cannot run here, or null. */
export async function liveSkip() {
  if (process.env.CU_LIVE !== '1') return 'live test: set CU_LIVE=1 (types into a fixture app on this Mac)';
  if (process.platform !== 'darwin') return 'macOS only';
  if (!built) return 'native module not built (npm run build:native)';
  const probe = await native().call('probe');
  if (!probe.axTrusted) return 'Accessibility is not granted to this process';
  if (!probe.screenCapture) return 'Screen Recording is not granted to this process';
  return null;
}

/** Builds the fixture .app (once per run) into a temp directory; returns the bundle path. */
export function buildFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-text-fixture-'));
  const bundle = path.join(dir, 'CUTextFixture.app'), macos = path.join(bundle, 'Contents/MacOS');
  fs.mkdirSync(macos, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'Contents/Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>${FIXTURE}</string>
<key>CFBundleName</key><string>CUTextFixture</string>
<key>CFBundleExecutable</key><string>CUTextFixture</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>`);
  const source = path.join(app, 'tests/fixtures/cu-text-fixture');
  try {
    execFileSync('swiftc', ['-O', '-o', path.join(macos, 'CUTextFixture'), path.join(source, 'main.swift')], { stdio: 'pipe' });
    execFileSync('swiftc', ['-O', '-o', path.join(dir, 'noise'), path.join(source, 'noise.swift')], { stdio: 'pipe' });
  } catch (error) { throw new Error(`fixture build failed:\n${error.stderr}`); }
  return { bundle, dir, noise: path.join(dir, 'noise') };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Launches the fixture; resolves with {pid, windowId, dump(), quit()} once its window is listed. */
export async function launchFixture({ bundle, dir }, { focus } = {}) {
  const dumpFile = path.join(dir, `dump-${Date.now()}.json`);
  const env = { ...process.env, CU_FIXTURE_DUMP: dumpFile, ...(focus ? { CU_FIXTURE_FOCUS: focus } : {}) };
  const n = native();
  // Another fixture instance may be running: this one's window is the one that was not there before.
  const ids = async () => { try { return (await n.call('listWindows', { bundleId: FIXTURE })).windows; } catch { return []; } };
  const existing = new Set((await ids()).map((w) => w.window_id));
  const child = spawn(path.join(bundle, 'Contents/MacOS/CUTextFixture'), [], { env, stdio: 'ignore' });
  let window;
  for (let i = 0; i < 50 && !window; i += 1) {
    await sleep(100);
    window = (await ids()).find((w) => w.title === 'CU Text Fixture' && !existing.has(w.window_id));
  }
  if (!window) { child.kill(); throw new Error('fixture window did not appear'); }
  await sleep(300);
  return {
    pid: child.pid, windowId: window.window_id, bounds: window.bounds, child,
    async dump() {
      fs.rmSync(dumpFile, { force: true });
      process.kill(child.pid, 'SIGUSR1');
      for (let i = 0; i < 40; i += 1) { await sleep(25); if (fs.existsSync(dumpFile)) return JSON.parse(fs.readFileSync(dumpFile, 'utf8')); }
      throw new Error('fixture did not dump');
    },
    async quit() { child.kill('SIGKILL'); await sleep(200); },
  };
}

/** The fixture's AX summary: {name → element} by accessibility label (the summary title). */
export async function summary(fixture) {
  const shot = await native().call('captureWindow', { bundleId: FIXTURE, windowId: fixture.windowId, listsElements: true });
  return Object.fromEntries((shot.elements ?? []).filter((e) => e.title).map((e) => [e.title, e]));
}

/** Simulated user input for `ms` (zero-distance HID mouse moves every 40 ms); resolves when it ends. */
export function userInputFor({ noise }, ms) {
  return new Promise((resolve) => spawn(noise, [String(Math.ceil(ms / 40)), '40'], { stdio: 'ignore' }).on('exit', resolve));
}

/** Seconds since the last user input, from the native probe. */
export async function idleSeconds() {
  return (await native().call('probe')).secondsSinceUserInput;
}
