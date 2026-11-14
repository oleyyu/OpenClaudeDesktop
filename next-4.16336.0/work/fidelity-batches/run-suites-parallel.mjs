// Parallel front end for the offscreen suites (Regression repair 1). Every suite still runs through
// work/offscreen-app-integration-20260922/run-suite.mjs, one process per suite, each with its own mkdtemp
// output, profile and launcher, so suites do not share state; git-rail's Vite fixture binds a free port.
// Failures from the parallel pass are re-run once, serially, to separate load flakiness from real failures:
// PASS = passed in parallel, LOAD = failed in parallel but passed serially, FAIL = failed both times.
// SERIAL_TAIL suites hold wall-clock windows frozen into a native baseline, so they run alone after the pool
// (a failure there is retried once, alone: RETRY = passed on that retry).
// Usage (after `cd app && npm run build`):
//   node work/fidelity-batches/run-suites-parallel.mjs [-j 4] [--logs DIR] (--all | suite ...)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ui029: stopIdentity needs the 350 ms delayed interrupt (ui029-fixtures.mjs:30 interruptDelayMs) to still be
// pending across several steps; that value is in fixtureDefinitionSha256, which must equal the frozen 0.2.8
// baseline (ui029-ui-test.mjs:146), so it cannot be widened. Under 4-way load it missed the window 2 of 5 runs.
const SERIAL_TAIL = new Set(['ui029']);
const runner = path.resolve(import.meta.dirname, '../offscreen-app-integration-20260922/run-suite.mjs');
const appRoot = path.resolve(import.meta.dirname, '../../app');
const args = process.argv.slice(2);
let jobs = 4, logs = null; const suites = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-j') jobs = Math.max(1, Number(args[++i]) || 1);
  else if (args[i] === '--logs') logs = path.resolve(args[++i]);
  else if (args[i] === '--all') suites.push(...Object.keys(JSON.parse(fs.readFileSync(runner, 'utf8').match(/const suites=(\{.*?\});/)[1].replaceAll("'", '"'))));
  else suites.push(args[i]);
}
if (!suites.length) { console.error('Name suites or pass --all'); process.exit(2); }
logs ??= fs.mkdtempSync(path.join(os.tmpdir(), 'offscreen-suites-'));
fs.mkdirSync(logs, { recursive: true });

function run(suite, tag) {
  const started = Date.now(), file = path.join(logs, `${suite}.${tag}.log`), out = fs.openSync(file, 'w');
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [runner, suite], { cwd: appRoot, stdio: ['ignore', out, out] });
    const timer = setTimeout(() => child.kill('SIGTERM'), 10 * 60 * 1000);
    child.on('exit', (code, signal) => {
      clearTimeout(timer); fs.closeSync(out);
      const text = fs.readFileSync(file, 'utf8'), error = text.match(/"error": "([^"\n]{0,300})/)?.[1] ?? null;
      resolve({ suite, passed: code === 0, code: code ?? signal, seconds: Math.round((Date.now() - started) / 1000), log: file, error });
    });
  });
}

const t0 = Date.now(), queue = suites.filter((suite) => !SERIAL_TAIL.has(suite)), first = new Map();
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  while (queue.length) { const suite = queue.shift(); const result = await run(suite, 'parallel'); first.set(suite, result); console.log(`${result.passed ? 'pass' : 'fail'} ${suite} ${result.seconds}s`); }
}));
for (const suite of suites.filter((name) => SERIAL_TAIL.has(name))) {
  const result = await run(suite, 'alone'); first.set(suite, { ...result, alone: true });
  console.log(`${result.passed ? 'pass' : 'fail'} ${suite} ${result.seconds}s (alone)`);
}
const summary = [];
for (const suite of suites) {
  const result = first.get(suite);
  if (result.passed) { summary.push({ ...result, status: 'PASS' }); continue; }
  const retry = await run(suite, 'serial');
  console.log(`${retry.passed ? 'pass' : 'fail'} ${suite} ${retry.seconds}s (serial retry)`);
  summary.push({ ...retry, status: retry.passed ? (result.alone ? 'RETRY' : 'LOAD') : 'FAIL', parallelError: result.error });
}
fs.writeFileSync(path.join(logs, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(`\n${suites.length} suites, -j ${jobs}, ${Math.round((Date.now() - t0) / 1000)}s, logs ${logs}`);
for (const row of summary) console.log(`${row.status.padEnd(4)} ${row.suite}${row.status === 'PASS' ? '' : `  ${row.parallelError ?? ''}${row.status === 'FAIL' ? `\n     serial: ${row.error ?? row.code}` : ''}`}`);
process.exitCode = summary.some((row) => row.status === 'FAIL') ? 1 : 0;
