import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { carryScope, requestCarry, bindCarry, carryFor, carryApplies } from '../electron/bypass-carry.mjs';

const on = { allowBypassPermissions: true }, off = { allowBypassPermissions: false };
// The real Codex 0.155.1 app-server (fresh CODEX_HOME, no managed config) answers configRequirements/read with this.
const CODEX_REQUIREMENTS = { requirements: null };
// The scope the user confirmed Bypass in (a draft in /tmp/scratch), as the switch sends it on its select and reconnect.
const SCRATCH = carryScope({ carryCwd: '/tmp/scratch', carrySession: null });

test('a core switch mints a token only with the opt-in on', () => {
  assert.deepEqual(requestCarry(on, SCRATCH), { pending: true, cwd: '/tmp/scratch', sessionId: null });
  assert.equal(requestCarry(on), null, 'no scope, no token');
  for (const config of [off, {}, null, undefined, { allowBypassPermissions: 'true' }]) assert.equal(requestCarry(config, SCRATCH), null);
  assert.deepEqual(carryScope({ carryCwd: '/r', carrySession: 'thr-1' }), { cwd: '/r', sessionId: 'thr-1' });
  for (const p of [undefined, null, {}, { carryCwd: 7, carrySession: '' }]) assert.deepEqual(carryScope(p), { cwd: '', sessionId: null });
});

test('the switch reconnect binds the token to its connection only when the new core allows Bypass', () => {
  const token = requestCarry(on, SCRATCH), bound = { connectionId: 'conn-1', cwd: '/tmp/scratch', sessionId: null };
  assert.deepEqual(bindCarry(token, 'conn-1', CODEX_REQUIREMENTS, SCRATCH), bound);
  assert.deepEqual(bindCarry(token, 'conn-1', { requirements: { allowedSandboxModes: ['workspace-write', 'danger-full-access'], allowedApprovalPolicies: ['never'] } }, SCRATCH), bound);
  for (const response of [undefined, null, {}, { requirements: [] }, { requirements: 'x' },
    { requirements: { allowedSandboxModes: ['workspace-write'] } }, { requirements: { allowedApprovalPolicies: ['on-request'] } }])
    assert.equal(bindCarry(token, 'conn-1', response, SCRATCH), null, JSON.stringify(response));
  for (const unpending of [null, undefined, {}, { pending: false }, { connectionId: 'conn-1' }]) assert.equal(bindCarry(unpending, 'conn-1', CODEX_REQUIREMENTS, SCRATCH), null);
  for (const id of [undefined, null, '', 7]) assert.equal(bindCarry(token, id, CODEX_REQUIREMENTS, SCRATCH), null);
  // The reconnect must name the scope the select did.
  for (const scope of [undefined, carryScope({ carryCwd: '/Users/x/important-repo' }), carryScope({ carryCwd: '/tmp/scratch', carrySession: 'thr-1' })])
    assert.equal(bindCarry(token, 'conn-1', CODEX_REQUIREMENTS, scope), null, JSON.stringify(scope));
});

test('init/reconnect hand out the carry only for the bound connection while the opt-in is on', () => {
  const carry = bindCarry(requestCarry(on, SCRATCH), 'conn-1', CODEX_REQUIREMENTS, SCRATCH);
  assert.deepEqual(carryFor(carry, 'conn-1', on), { connectionId: 'conn-1', cwd: '/tmp/scratch', sessionId: null });
  assert.equal(carryFor(carry, 'conn-2', on), null, 'another connection (a later reconnect) gets nothing');
  assert.equal(carryFor(carry, undefined, on), null);
  assert.equal(carryFor(carry, 'conn-1', off), null, 'turning the opt-in off drops it');
  assert.equal(carryFor(null, 'conn-1', on), null);
  assert.equal(carryFor({ pending: true }, 'conn-1', on), null, 'an unbound token is never handed out');
  // Only the connection and the confirmed scope travel with it; no permission or other state.
  assert.deepEqual(Object.keys(carryFor(carry, 'conn-1', on)), ['connectionId', 'cwd', 'sessionId']);
});

// Review finding: config.cwd is /Users/x/important-repo, the user confirmed Bypass on a draft in /tmp/scratch (sidebar
// project, not saved), then switched cores; the reloaded draft opens in config.cwd and must stay on Auto.
test('the renderer applies the carry only to the scope it was confirmed for', () => {
  const draft = { connectionId: 'conn-1', cwd: '/tmp/scratch', sessionId: null };
  assert.equal(carryApplies(draft, { current: null, cwd: '/tmp/scratch' }), true);
  assert.equal(carryApplies(draft, { current: null, cwd: '/Users/x/important-repo' }), false, 'the reloaded draft in config.cwd');
  assert.equal(carryApplies(draft, { current: 'thr-9', cwd: '/tmp/scratch' }), false, 'a session never takes a draft carry');
  assert.equal(carryApplies({ ...draft, cwd: '' }, { current: null, cwd: undefined }), true, 'no folder on either side');
  const session = { connectionId: 'conn-1', cwd: '/tmp/scratch', sessionId: 'thr-1' };
  assert.equal(carryApplies(session, { current: 'thr-1', cwd: '/tmp/scratch' }), true, 'the same session (no reload)');
  assert.equal(carryApplies(session, { current: 'thr-2', cwd: '/tmp/scratch' }), false);
  assert.equal(carryApplies(session, { current: null, cwd: '/tmp/scratch' }), true, 'after the reload: a draft in the folder the dialog named');
  assert.equal(carryApplies(session, { current: null, cwd: '/Users/x/important-repo' }), false);
  for (const carry of [null, undefined, { connectionId: 'conn-1' }]) assert.equal(carryApplies(carry, { current: null, cwd: '' }), false);
});

// main.cjs wiring: the token is minted only after a successful select that asked for it, consumed (and cleared) by every
// reconnect, bound only by a reconnect that asked to carry, and dropped by an opt-out or the renderer's clear.
test('main.cjs binds the carry only on the switch reconnect and drops it everywhere else', () => {
  const main = fs.readFileSync(path.join(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  const block = name => { const at = main.indexOf(`case "${name}": {`); assert.ok(at > 0, name); return main.slice(at, main.indexOf('\n      case "', at + 10)); };
  const cores = block('cores');
  assert.ok(cores.indexOf('switchToken = bypassCarry = null') < cores.indexOf('await coreManager.run(p)'), 'select/uninstall clear first, so a failed select leaves nothing');
  assert.ok(cores.indexOf('await coreManager.run(p)') < cores.indexOf('requestCarry(config'), 'the token is minted only after select resolves');
  assert.match(cores, /p\.op === "select" && p\.carryBypass === true\) switchToken = requestCarry\(config, carryScope\(p\)\)/);
  const reconnect = block('reconnect');
  assert.match(reconnect, /const token = p\.carryBypass === true \? switchToken : null;\s*switchToken = null; bypassCarry = null;/);
  assert.ok(reconnect.indexOf('switchToken = null; bypassCarry = null;') < reconnect.indexOf('client.stop()'), 'cleared before the old connection goes');
  assert.match(reconnect, /bindCarry\(token, owner\.connection\?\.approvalConnectionId, await owner\.request\("configRequirements\/read", \{\}\), carryScope\(p\)\)/);
  assert.match(reconnect, /bypassCarry: carryFor\(bypassCarry, owner\.connection\?\.approvalConnectionId, config\)/);
  assert.match(block('init'), /bypassCarry: carryFor\(bypassCarry, owner\.connection\?\.approvalConnectionId, config\)/);
  assert.match(block('bypass-carry-clear'), /bypassCarry = null;\s*return true;/);
  assert.match(block('settings'), /if \(config\.allowBypassPermissions !== true\) switchToken = bypassCarry = null;/);
  // Bypass is never saved as a default and every request is still validated.
  assert.equal(/permission:\s*["']bypass["']/.test(main), false);
  // The desktop:call "rpc" case is now `return requestRpc(p, e.sender)`; the validation lives in requestRpc.
  assert.match(main, /case "rpc": return requestRpc\(p, e\.sender\);/);
  const rpc = main.slice(main.indexOf('async function requestRpc('), main.indexOf('ipcMain.handle("desktop:call"'));
  assert.match(rpc, /validateBypassRequest\(params, \(\) => config/);
});

// main.jsx wiring: the switch sends the confirmed scope (the Bypass scope key's cwd and session) on both calls, and the
// effect drops a carry whose scope isn't the current one instead of applying it.
test('main.jsx sends the confirmed scope and applies the carry only where it was confirmed', () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '../src/main.jsx'), 'utf8');
  const at = src.indexOf('async function switchCore('), sw = src.slice(at, src.indexOf('\n  }\n', at));
  assert.match(sw, /carryBypass: true, carryCwd: cwd \|\| "", carrySession: current \|\| null/);
  assert.match(sw, /call\("cores", \{ op: "select", id, \.\.\.carry \}\)/);
  assert.match(sw, /reconnect\(carry \|\| undefined\)/);
  assert.match(src, /call\("reconnect", options\?\.carryBypass === true \? \{ carryBypass: true, carryCwd: options\.carryCwd, carrySession: options\.carrySession \} : undefined\)/);
  assert.match(src, /if \(carryApplies\(carry, \{ current, cwd \}\) && !bypassMode\.carry\(\)\) return;\s*carriedBypass\.current = id;\s*call\("bypass-carry-clear"\)/);
});
