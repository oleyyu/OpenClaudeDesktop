// A session ledger shared by the main model and independently forked runners.
// Each turn captures a baseline; older agents finishing later still count.
// Each producer owns one counter, atomically replaced. Reading at admission
// avoids IPC-delivery races and lost read/modify/write increments. Running
// agents can exceed the target, as with Claude's admission-only budget.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid workflow budget counter');
  return value;
}
function writeCounter(file, value) {
  writeFileSync(file + '.tmp', String(count(value)), { mode: 0o600 });
  renameSync(file + '.tmp', file);
}
function readCounter(file) {
  const text = readFileSync(file, 'utf8');
  if (!/^\d+$/.test(text)) throw new Error('Invalid workflow budget counter');
  return count(Number(text));
}
function totalSpent(directory) {
  let total = 0;
  for (const name of readdirSync(directory)) {
    if (name !== 'main.tokens' && !/^run-[0-9a-f-]+\.tokens$/.test(name)) continue;
    total += readCounter(join(directory, name));
  }
  return count(total);
}
export function createSharedBudget(parent, initialSpent = 0) {
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(join(parent, 'session-'));
  const main = join(directory, 'main.tokens');
  writeCounter(main, initialSpent);
  return { descriptor: { directory }, spent: () => totalSpent(directory), recordMain: value => writeCounter(main, value) };
}
export function joinSharedBudget(descriptor) {
  if (!descriptor || typeof descriptor.directory !== 'string' || resolve(descriptor.directory) !== descriptor.directory)
    throw new Error('Invalid shared workflow budget');
  const directory = descriptor.directory;
  const baseline = count(descriptor.baseline ?? 0);
  // Children may join an existing pool only; they never silently start over.
  readCounter(join(directory, 'main.tokens'));
  const own = join(directory, `run-${randomUUID()}.tokens`);
  writeCounter(own, 0);
  let failure;
  return {
    record(value) {
      try { writeCounter(own, value); } catch (error) { failure = error; }
    },
    spent() {
      if (failure) throw failure;
      return Math.max(0, totalSpent(directory) - baseline);
    },
  };
}
