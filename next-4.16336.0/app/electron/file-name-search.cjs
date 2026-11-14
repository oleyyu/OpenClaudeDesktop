const { spawn } = require('node:child_process');
const path = require('node:path');

const DEFAULT_LIMITS = Object.freeze({
  maxResults: 50, maxCandidates: 10000, maxEntries: 25000,
  maxDirectories: 2000, maxDepth: 24, maxPathBytes: 4096,
  maxGitBytes: 2 * 1024 * 1024, maxIndexBytes: 2 * 1024 * 1024, maxResultBytes: 96 * 1024,
  deadlineMs: 4000, maxConcurrent: 2, maxPending: 2,
  maxContentResults: 241, maxContentFileBytes: 2 * 1024 * 1024, maxContentBytes: 32 * 1024 * 1024,
});

function limitsFrom(overrides = {}) {
  const limits = { ...DEFAULT_LIMITS };
  for (const [key, value] of Object.entries(overrides)) {
    if (!(key in limits) || !Number.isInteger(value) || value < (key === 'maxResultBytes' ? 16384 : 1) || value > limits[key])
      throw new TypeError(`Invalid or excessive search limit: ${key}`);
    limits[key] = value;
  }
  return limits;
}

function envelope(request) {
  return {
    requestId: typeof request?.requestId === 'string' && request.requestId.length <= 128 ? request.requestId : null,
    scope: typeof request?.scope === 'string' && request.scope.length <= 128 ? request.scope : null,
    requestedRoot: typeof request?.root === 'string' && request.root.length <= 4096 ? request.root : null,
    root: null, query: typeof request?.query === 'string' && request.query.length <= 256 ? request.query.trim() : null,
    source: null, matches: [], truncated: false, complete: false, truncationReasons: [],
    warnings: [], error: null, scanned: { candidates: 0, entries: 0, directories: 0 },
  };
}

function invalid(request) {
  if (!request || typeof request !== 'object') return 'A search request is required.';
  if (typeof request.scope !== 'string' || !request.scope || request.scope.length > 128 || request.scope.includes('\0')) return 'Invalid search scope.';
  if (typeof request.requestId !== 'string' || !request.requestId || request.requestId.length > 128 || request.requestId.includes('\0')) return 'Invalid request identifier.';
  if (typeof request.root !== 'string' || !path.isAbsolute(request.root) || request.root.includes('\0') || Buffer.byteLength(request.root) > 4096) return 'An absolute workspace root is required.';
  if(request.mode!==undefined&&request.mode!=='content')return 'Invalid search mode.';
  if(request.mode==='content'&&request.options!==undefined&&(!request.options||typeof request.options!=='object'||Object.entries(request.options).some(([key,value])=>!['matchCase','wholeWord','regexp'].includes(key)||typeof value!=='boolean')))return 'Invalid content search options.';
  if (typeof request.query !== 'string' || request.query.length > 256 || request.query.trim().length > (request.mode==='content'?256:64) || /[\0\r\n]/.test(request.query)) return 'A valid single-line search query is required.';
  return null;
}

/**
 * Main-process-only service. A trusted caller supplies the session cwd and a
 * scope tied to the sender/pane. The renderer must not select arbitrary roots.
 * Each active request owns a separate Node process group; no shell is used.
 */
function createFileNameSearch(options = {}) {
  const limits = limitsFrom(options.limits);
  const active = new Set(), pending = [], latest = new Map();
  let generation = 0, closed = false;

  function finish(job, result) {
    if (job.settled) return;
    job.settled = true;
    clearTimeout(job.timer);
    active.delete(job);
    const queued = pending.indexOf(job);
    if (queued >= 0) pending.splice(queued, 1);
    if (latest.get(job.request.scope) === job) latest.delete(job.request.scope);
    job.resolve({ ...result, generation: job.generation, elapsedMs: Date.now() - job.created });
    pump();
  }

  function fail(job, code, message) {
    if (job.settled) return;
    job.result = { ...envelope(job.request), error: { code, message } };
    if (!job.child) { finish(job, job.result); return; }
    // This negative PID is only the fresh detached group created below. Git,
    // when used, remains in this group. No global process matching or pkill.
    try { process.kill(-job.child.pid, 'SIGKILL'); }
    catch (error) { if (error.code !== 'ESRCH') job.child.kill('SIGKILL'); }
  }

  function launch(job) {
    active.add(job);
    let child;
    try {
      child = spawn(process.execPath, [path.join(__dirname, 'file-name-search-worker.cjs')], {
        // __dirname may be virtual (inside app.asar). The executable's physical
        // parent always exists; the worker accesses all project paths explicitly.
        cwd: path.dirname(process.execPath), detached: true, windowsHide: true,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '' },
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      });
    } catch {
      finish(job, { ...envelope(job.request), error: { code: 'WORKER_START_FAILED', message: 'Cannot start the local filename search worker.' } });
      return;
    }
    job.child = child;
    child.on('error', () => finish(job, job.result || {
      ...envelope(job.request), error: { code: 'WORKER_START_FAILED', message: 'Cannot start the local filename search worker.' },
    }));
    child.on('message', result => {
      if (job.result || job.settled) return;
      if (!result || Buffer.byteLength(JSON.stringify(result)) > limits.maxResultBytes - 256) {
        fail(job, 'OUTPUT_LIMIT', 'Filename search response exceeds its output limit.'); return;
      }
      job.result = result;
    });
    child.on('close', () => finish(job, job.result || {
      ...envelope(job.request), error: { code: 'WORKER_EXITED', message: 'Filename search stopped before producing a result.' },
    }));
    child.send({ request: job.request, limits }, error => {
      if (error && !job.settled) fail(job, 'WORKER_START_FAILED', 'Cannot send the filename search request.');
    });
  }

  function pump() {
    while (!closed && active.size < limits.maxConcurrent && pending.length) {
      const job = pending.shift();
      if (!job.settled) launch(job);
    }
  }

  function search(request) {
    const problem = invalid(request);
    if (problem || closed || process.platform === 'win32') return Promise.resolve({
      ...envelope(request), generation: ++generation, elapsedMs: 0,
      error: { code: closed ? 'CLOSED' : process.platform === 'win32' ? 'UNSUPPORTED_PLATFORM' : 'INVALID_REQUEST',
        message: closed ? 'Filename search is closed.' : process.platform === 'win32' ? 'Filename search requires macOS or POSIX process groups.' : problem },
    });
    // Supersede both running and waiting jobs for this trusted scope. The old
    // promise still settles with its own identifier; it cannot replace the new.
    const previous = latest.get(request.scope);
    if (previous) fail(previous, 'SUPERSEDED', 'A newer filename query replaced this request.');
    if (active.size >= limits.maxConcurrent && pending.length >= limits.maxPending) return Promise.resolve({
      ...envelope(request), generation: ++generation, elapsedMs: 0,
      error: { code: 'BUSY', message: 'Filename search capacity is occupied; retry the current query.' },
    });
    return new Promise(resolve => {
      // browse: an empty query lists the project's files (the composer's bare '@'), shallowest first.
      // folders (B33, the Files pane filter only): a query ending in '/' lists folders too.
      const job = { request: { ...request, query: request.query.trim(), browse: request.browse === true, folders: request.folders === true }, resolve,
        generation: ++generation, created: Date.now(), settled: false, child: null, result: null };
      latest.set(request.scope, job);
      job.timer = setTimeout(() => fail(job, 'TIMEOUT', 'Filename search exceeded its time limit.'), limits.deadlineMs);
      pending.push(job);
      pump();
    });
  }

  function cancel(scope, requestId) {
    const job = latest.get(scope);
    if (!job || (requestId !== undefined && requestId !== job.request.requestId)) return false;
    fail(job, 'CANCELLED', 'Filename search was cancelled.');
    return true;
  }

  async function cancelAll() {
    const jobs = [...active, ...pending];
    const done = jobs.map(job => new Promise(resolve => {
      const original = job.resolve;
      job.resolve = value => { original(value); resolve(); };
    }));
    for (const job of jobs) fail(job, 'CANCELLED', closed ? 'Filename search was closed.' : 'Filename search was cancelled.');
    await Promise.all(done);
  }

  async function close() { closed = true; await cancelAll(); }

  return { search, cancel, cancelAll, dispose: close, close, limits: { ...limits } };
}

module.exports = { createFileNameSearch, DEFAULT_LIMITS };
