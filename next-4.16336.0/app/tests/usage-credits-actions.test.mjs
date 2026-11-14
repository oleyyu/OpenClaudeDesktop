import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

// Codex 0.155.1 earned resets and workspace nudges (account/rateLimitResetCredit/consume,
// account/sendAddCreditsNudgeEmail): main only forwards rebuilt params, and the protocol fixture redeems a reset in
// fixture-rate-limits.json and pushes the rolling account/rateLimits/updated, as the backend does.
const app = path.resolve(import.meta.dirname, '..');

test('main forwards the two credit actions with rebuilt, validated params only', async () => {
  const main = await fs.readFile(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.match(main, /\n  "account\/rateLimitResetCredit\/consume",\n/);assert.match(main, /\n  "account\/sendAddCreditsNudgeEmail",\n/);
  assert.match(main, /if \(typeof key !== "string" \|\| !\/\^\[A-Za-z0-9-\]\{8,128\}\$\/\.test\(key\)/);
  assert.match(main, /return client\.request\(p\.method, \{ idempotencyKey: key, \.\.\.\(credit != null \? \{ creditId: credit \} : \{\}\) \}\);/);
  assert.match(main, /if \(!\["credits", "usage_limit"\]\.includes\(params\.creditType\)\) throw new Error\("Unsupported operation\."\);/);
  // The renderer reaches them only through the Usage page actions.
  const renderer = await fs.readFile(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(renderer, /consumeResetCredit: \(params\) => rpc\("account\/rateLimitResetCredit\/consume", params\)/);
  assert.match(renderer, /sendCreditsNudge: \(creditType\) => rpc\("account\/sendAddCreditsNudgeEmail", \{ creditType \}\)/);
  assert.match(renderer, /if \(e\.method === "account\/rateLimits\/updated"\) setPlanLimits\(\(previous\) => mergeRateLimits\(previous, e\.params\?\.rateLimits\)\);/);
});

test('the protocol fixture redeems a reset once, clears the limit and sends the rolling update', async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'usage-credits-fixture-'));
  try {
    const limits = { ordinaryUsageAllowed: false, rateLimits: { primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: 1790035200 } },
      rateLimitsByLimitId: { codex: { limitId: 'codex', primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: 1790035200 }, secondary: { usedPercent: 40, windowDurationMins: 10080, resetsAt: 1790035200 }, rateLimitReachedType: 'rate_limit_reached', credits: { hasCredits: false, unlimited: false, balance: '0' } } },
      rateLimitResetCredits: { availableCount: 1, credits: [{ id: 'reset-1', resetType: 'codexRateLimits', status: 'available', grantedAt: 1, expiresAt: null, title: null, description: null }] } };
    await fs.writeFile(path.join(profile, 'fixture-rate-limits.json'), JSON.stringify(limits));
    const child = spawn(process.execPath, [path.join(app, 'tests/fixtures/codex-server.cjs')], { env: { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME: path.join(profile, 'codex-home') }, stdio: ['pipe', 'pipe', 'ignore'] });
    const messages = [], waiters = [];
    readline.createInterface({ input: child.stdout }).on('line', line => { let m; try { m = JSON.parse(line); } catch { return; } messages.push(m); for (const w of [...waiters]) if (w.test(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); } });
    const wait = test => new Promise((resolve, reject) => { const found = messages.find(test); if (found) return resolve(found); const timer = setTimeout(() => reject(Error('timeout')), 5000); waiters.push({ test, resolve: m => { clearTimeout(timer); resolve(m); } }); });
    let id = 0;
    const request = (method, params) => { const n = ++id; child.stdin.write(JSON.stringify({ id: n, method, params }) + '\n'); return wait(m => m.id === n); };
    try {
      await request('initialize', { clientInfo: { name: 'test', version: '0' } });
      assert.deepEqual((await request('account/rateLimitResetCredit/consume', { idempotencyKey: 'aaaaaaaa-1', creditId: 'missing' })).result, { outcome: 'noCredit' }, 'an unknown credit id is not redeemed');
      assert.deepEqual((await request('account/rateLimitResetCredit/consume', { idempotencyKey: 'aaaaaaaa-2', creditId: 'reset-1' })).result, { outcome: 'reset' });
      const update = await wait(m => m.method === 'account/rateLimits/updated');
      assert.equal(update.params.rateLimits.primary.usedPercent, 0);assert.equal(update.params.rateLimits.rateLimitReachedType, null);
      const after = (await request('account/rateLimits/read', {})).result;
      assert.equal(after.rateLimitResetCredits.availableCount, 0);assert.deepEqual(after.rateLimitResetCredits.credits, []);
      assert.equal(after.ordinaryUsageAllowed, true);assert.equal(after.rateLimitsByLimitId.codex.secondary.usedPercent, 0);
      assert.deepEqual((await request('account/rateLimitResetCredit/consume', { idempotencyKey: 'aaaaaaaa-3' })).result, { outcome: 'noCredit' });
      assert.deepEqual((await request('account/sendAddCreditsNudgeEmail', { creditType: 'credits' })).result, { status: 'sent' });
      // A fixture-usage.json override answers instead (usage-ui-test seeds outcomes and errors this way).
      await fs.writeFile(path.join(profile, 'fixture-usage.json'), JSON.stringify({ 'account/rateLimitResetCredit/consume': { result: { outcome: 'nothingToReset' } }, 'account/sendAddCreditsNudgeEmail': { error: { code: -32603, message: 'nudge failed' } } }));
      assert.deepEqual((await request('account/rateLimitResetCredit/consume', { idempotencyKey: 'aaaaaaaa-4' })).result, { outcome: 'nothingToReset' });
      assert.equal((await request('account/sendAddCreditsNudgeEmail', { creditType: 'usage_limit' })).error.message, 'nudge failed');
      const logged = (await fs.readFile(path.join(profile, 'fixture-requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.method.startsWith('account/'));
      assert.deepEqual(logged.map(x => x.method), ['account/rateLimitResetCredit/consume', 'account/rateLimitResetCredit/consume', 'account/rateLimits/read', 'account/rateLimitResetCredit/consume', 'account/sendAddCreditsNudgeEmail', 'account/rateLimitResetCredit/consume', 'account/sendAddCreditsNudgeEmail']);
    } finally { child.kill(); }
  } finally { await fs.rm(profile, { recursive: true, force: true }); }
});
