// Import Chat History worker (node:worker_threads; index.cjs createWorkerRunner starts it): ops.mjs over the real
// catalog / converters, so scanning and parsing other agents' histories (multi-MB JSONL, SQLite, zstd) never blocks the
// Electron main thread. Protocol: {id, op, args} in, {id, ok: true, value} | {id, ok: false, error: {message, code}} out.
// The catalog's per-file summary cache lives here for the worker's life.
import { parentPort } from 'node:worker_threads';
import * as catalog from './catalog.mjs';
import * as convert from './convert.mjs';
import * as targets from './targets.mjs';
import { createOps } from './ops.mjs';

const ops = createOps({ catalog, convert, targets });
parentPort.on('message', async ({ id, op, args } = {}) => {
  try {
    if (!Object.hasOwn(ops, op)) throw new Error('Unsupported operation.');
    parentPort.postMessage({ id, ok: true, value: await ops[op](args ?? {}) });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: { message: String(error?.message || error), code: typeof error?.code === 'string' ? error.code : null } });
  }
});
