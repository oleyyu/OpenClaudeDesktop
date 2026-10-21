// Live computer-use tests (CU_LIVE=1 only): they type into a fixture app on this Mac, so they need Accessibility and
// Screen Recording for the process running them, and nobody at the keyboard or mouse.
//   CU_LIVE=1 node --test tests/computer-use-type-live.test.mjs
//
// The presence gate (presenceSkip): every live computer-use test (tests/*-live.test.mjs, through liveSkip) and every
// live script (scripts/computer-use-*-live.mjs, scripts/computer-use-*-check.mjs) is skipped, with the reason, while the
// screen is locked or someone is using this Mac (HIDIdleTime < 120 s): live runs move the real cursor, post keys and
// bring windows forward, which would take the user's keyboard and mouse. CU_LIVE_FORCE=1 runs them anyway.
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

/** How long nobody may have touched the keyboard or mouse before a live run (seconds of HIDIdleTime). */
export const IDLE_REQUIRED_S = 120;

/** HIDIdleTime (IOHIDSystem, nanoseconds) in seconds: how long since the last keyboard / mouse / trackpad input; null when unreadable. */
export function hidIdleSeconds({ exec = execFileSync } = {}) {
  try {
    const out = exec('/usr/sbin/ioreg', ['-c', 'IOHIDSystem', '-d', '4', '-r', '-k', 'HIDIdleTime'], { encoding: 'utf8', timeout: 5000 });
    const match = /"HIDIdleTime" = (\d+)/.exec(String(out));
    return match ? Number(match[1]) / 1e9 : null;
  } catch { return null; }
}

/**
 * Whether the screen is locked: the native probe when the module is built, else the console session in the I/O
 * Registry (CGSSessionScreenIsLocked, present only while locked); null when neither answers.
 */
export async function screenLocked({ exec = execFileSync, probe = built ? () => native().call('probe') : null } = {}) {
  if (probe) {
    try { const answer = await probe(); if (typeof answer?.screenLocked === 'boolean') return answer.screenLocked; } catch {}
  }
  try {
    const out = String(exec('/usr/sbin/ioreg', ['-n', 'Root', '-d', '1'], { encoding: 'utf8', timeout: 5000 }));
    return /"CGSSessionScreenIsLocked"\s*=\s*(Yes|1|true)/i.test(out);
  } catch { return null; }
}

/**
 * The presence gate: why a live computer-use test or script must not run now, or null. CU_LIVE=1 is required; then,
 * unless CU_LIVE_FORCE=1, a locked screen (or one whose state can't be read) or someone using this Mac (HIDIdleTime
 * under IDLE_REQUIRED_S, or unreadable) skips it. `env`, `idle`, `locked`: tests only.
 */
export async function presenceSkip({ env = process.env, platform = process.platform, idle = hidIdleSeconds, locked = screenLocked } = {}) {
  if (env.CU_LIVE !== '1') return 'live test: set CU_LIVE=1 (it acts on apps on this Mac)';
  if (platform !== 'darwin') return 'macOS only';
  if (env.CU_LIVE_FORCE === '1') return null;
  const force = 'CU_LIVE_FORCE=1 runs it anyway';
  const isLocked = await locked();
  if (isLocked === null) return `blocked: it can't be told whether the screen is locked, so the run is skipped (${force})`;
  if (isLocked) return `blocked: the screen is locked — background and screen-wide actions are refused while it is, and the user may come back to it (${force})`;
  const seconds = idle();
  if (seconds === null) return `blocked: HIDIdleTime can't be read, so it isn't known whether someone is using this Mac (${force})`;
  if (seconds < IDLE_REQUIRED_S) return `blocked: someone is using this Mac (last keyboard / mouse input ${seconds.toFixed(1)} s ago, needs ≥ ${IDLE_REQUIRED_S} s): a live run would take their keyboard and mouse (${force})`;
  return null;
}

/** Why the live tests cannot run here, or null: the presence gate, then the module and this process's permissions. */
export async function liveSkip() {
  const presence = await presenceSkip();
  if (presence) return presence;
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

/** Launches the fixture; resolves with {pid, windowId, dump(), quit()} once its window is listed. background: no
 * activation and a window on every Space, a full-screen one included (CU_FIXTURE_BACKGROUND / CU_FIXTURE_ALL_SPACES).
 * notesLines: `notes` starts with that many numbered lines (CU_FIXTURE_NOTES_LINES). allSpaces: false keeps a background
 * window on one Space. minimize / space: the window minimizes itself / moves itself to that Space (CU_FIXTURE_MINIMIZE /
 * CU_FIXTURE_SPACE). */
export async function launchFixture({ bundle, dir }, { focus, background = false, allSpaces = background, notesLines, minimize = false, space } = {}) {
  const dumpFile = path.join(dir, `dump-${Date.now()}.json`);
  const env = { ...process.env, CU_FIXTURE_DUMP: dumpFile, ...(focus ? { CU_FIXTURE_FOCUS: focus } : {}),
    ...(background ? { CU_FIXTURE_BACKGROUND: '1' } : {}), ...(allSpaces ? { CU_FIXTURE_ALL_SPACES: '1' } : {}),
    ...(notesLines ? { CU_FIXTURE_NOTES_LINES: String(notesLines) } : {}), ...(minimize ? { CU_FIXTURE_MINIMIZE: '1' } : {}),
    ...(space ? { CU_FIXTURE_SPACE: String(space) } : {}) };
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
