// The presence gate in front of every live computer-use test and script (tests/computer-use-live-helpers.mjs
// presenceSkip / liveSkip): CU_LIVE=1, then — unless CU_LIVE_FORCE=1 — skipped while the screen is locked or someone has
// used this Mac in the last 120 s (HIDIdleTime). Nothing live runs here: the gate's inputs are faked, and the files are
// only read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { presenceSkip, hidIdleSeconds, screenLocked, IDLE_REQUIRED_S } from './computer-use-live-helpers.mjs';

const app = path.resolve(import.meta.dirname, '..');
const gate = (env, { idle = () => 600, locked = async () => false, platform = 'darwin' } = {}) => presenceSkip({ env, idle, locked, platform });

test('CU_LIVE=1 is required; macOS only', async () => {
  assert.match(await gate({}), /set CU_LIVE=1/);
  assert.match(await gate({ CU_LIVE: '0' }), /set CU_LIVE=1/);
  assert.equal(await gate({ CU_LIVE: '1' }, { platform: 'linux' }), 'macOS only');
  assert.equal(await gate({ CU_LIVE: '1' }), null, 'unlocked and idle for 10 minutes: runs');
});

test('someone at the Mac (HIDIdleTime < 120 s) or a locked screen skips, with the reason; CU_LIVE_FORCE=1 runs anyway', async () => {
  assert.equal(IDLE_REQUIRED_S, 120);
  const busy = await gate({ CU_LIVE: '1' }, { idle: () => 3.2 });
  assert.match(busy, /someone is using this Mac \(last keyboard \/ mouse input 3\.2 s ago, needs ≥ 120 s\)/);
  assert.match(busy, /CU_LIVE_FORCE=1/);
  assert.match(await gate({ CU_LIVE: '1' }, { idle: () => 119.9 }), /someone is using this Mac/);
  assert.equal(await gate({ CU_LIVE: '1' }, { idle: () => 120 }), null);
  const locked = await gate({ CU_LIVE: '1' }, { locked: async () => true, idle: () => 9000 });
  assert.match(locked, /the screen is locked/);
  // Unknown counts as "don't": an unreadable idle time or lock state skips too.
  assert.match(await gate({ CU_LIVE: '1' }, { idle: () => null }), /HIDIdleTime can't be read/);
  assert.match(await gate({ CU_LIVE: '1' }, { locked: async () => null }), /can't be told whether the screen is locked/);
  // The override, and only it.
  for (const options of [{ idle: () => 0 }, { locked: async () => true }, { idle: () => null, locked: async () => null }]) {
    assert.equal(await gate({ CU_LIVE: '1', CU_LIVE_FORCE: '1' }, options), null);
    assert.notEqual(await gate({ CU_LIVE: '1', CU_LIVE_FORCE: 'yes' }, options), null);
  }
  assert.match(await gate({ CU_LIVE_FORCE: '1' }), /set CU_LIVE=1/, 'the override never replaces CU_LIVE=1');
});

test('HIDIdleTime and the lock are read from the I/O Registry (nanoseconds; the console session\'s CGSSessionScreenIsLocked)', async () => {
  const runs = [];
  const exec = (file, args) => { runs.push([file, ...args]); return '| |   "HIDIdleTime" = 125000000000\n'; };
  assert.equal(hidIdleSeconds({ exec }), 125);
  assert.deepEqual(runs[0].slice(0, 3), ['/usr/sbin/ioreg', '-c', 'IOHIDSystem']);
  assert.equal(hidIdleSeconds({ exec: () => 'nothing here' }), null);
  assert.equal(hidIdleSeconds({ exec: () => { throw new Error('no ioreg'); } }), null);
  // The native probe first; the registry when there is none or it fails.
  assert.equal(await screenLocked({ probe: async () => ({ screenLocked: true }), exec: () => assert.fail('not asked') }), true);
  assert.equal(await screenLocked({ probe: async () => ({ screenLocked: false }), exec: () => assert.fail('not asked') }), false);
  assert.equal(await screenLocked({ probe: null, exec: () => '"IOConsoleUsers" = ({"kCGSSessionOnConsoleKey"=Yes,"CGSSessionScreenIsLocked"=Yes})' }), true);
  assert.equal(await screenLocked({ probe: async () => { throw new Error('x'); }, exec: () => '"IOConsoleUsers" = ({"kCGSSessionOnConsoleKey"=Yes})' }), false);
  assert.equal(await screenLocked({ probe: null, exec: () => { throw new Error('no ioreg'); } }), null);
});

test('every live test goes through liveSkip, and every live / check script through presenceSkip before it does anything', () => {
  const tests = fs.readdirSync(path.join(app, 'tests')).filter((name) => name.startsWith('computer-use-') && name.endsWith('-live.test.mjs'));
  assert.ok(tests.length >= 13, tests.join(', '));
  for (const name of tests) {
    const source = fs.readFileSync(path.join(app, 'tests', name), 'utf8');
    assert.match(source, /import \{[^}]*\bliveSkip\b[^}]*\} from '\.\/computer-use-live-helpers\.mjs'/, name);
    assert.match(source, /await liveSkip\(\)/, name);
    assert.doesNotMatch(source, /secondsSinceUserInput >= 120|HIDIdleTime/, `${name}: no gate of its own beside the shared one`);
  }
  const scripts = fs.readdirSync(path.join(app, 'scripts')).filter((name) => /^computer-use-.*-(live|check)\.mjs$/.test(name));
  assert.deepEqual(scripts.sort(), ['computer-use-ax-tools-check.mjs', 'computer-use-cursor-live.mjs', 'computer-use-m1-check.mjs', 'computer-use-m2-check.mjs',
    'computer-use-m3-check.mjs', 'computer-use-m4-click-check.mjs', 'computer-use-teach-live.mjs', 'computer-use-window-highlight-live.mjs']);
  for (const name of scripts) {
    const source = fs.readFileSync(path.join(app, 'scripts', name), 'utf8');
    assert.match(source, /presenceSkip\b[^\n]*from '\.\.\/tests\/computer-use-live-helpers\.mjs'/, name);
    // The gate is the first statement after the imports (comments aside): nothing runs before it.
    const body = source.split('\n').filter((line) => line.trim() && !line.trim().startsWith('//') && !line.startsWith('import '));
    assert.match(body[0], /await presenceSkip\(\)/, `${name}: ${body[0]}`);
    assert.doesNotMatch(source, /process\.env\.CU_LIVE\s*!==/, `${name}: no CU_LIVE check of its own`);
  }
});
