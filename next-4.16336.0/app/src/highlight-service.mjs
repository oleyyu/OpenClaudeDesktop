import { HIGHLIGHT_LIMITS, highlightKey, plainResult, prepareHighlight, validateTokens } from "./highlight-model.mjs";

export const MAX_HIGHLIGHT_SUBSCRIBERS = 32;

// One renderer-owned worker; never Codex/main IPC or a subprocess. An active
// cancellation terminates the worker, which also interrupts synchronous regex.
export function createHighlightService({
  createWorker, deadlineMs = HIGHLIGHT_LIMITS.deadlineMs,
  maxQueued = HIGHLIGHT_LIMITS.maxQueued, maxSubscribers = MAX_HIGHLIGHT_SUBSCRIBERS, maxCacheBytes = HIGHLIGHT_LIMITS.maxCacheBytes,
  maxCacheEntries = HIGHLIGHT_LIMITS.maxCacheEntries, idleMs = HIGHLIGHT_LIMITS.idleMs,
  schedule = setTimeout, cancelTimer = clearTimeout,
} = {}) {
  let worker = null, workerListeners = null, nextId = 0, active = null, disposed = false;
  let idleTimer = null, cachedBytes = 0;
  const queue = [], cache = new Map(), inFlight = new Map();
  const clearIdle = () => { if (idleTimer !== null) { cancelTimer(idleTimer); idleTimer = null; } };
  const destroyWorker = () => {
    clearIdle();
    const old = worker;
    worker = null;
    if (old) {
      for (const [name, callback] of Object.entries(workerListeners ?? {})) old.removeEventListener(name, callback);
      try { old.terminate(); } catch { /* Already closed. */ }
    }
    workerListeners = null;
  };
  const settleSubscriber = (subscriber, result) => {
    if (subscriber.done) return;
    subscriber.done = true;
    subscriber.signal?.removeEventListener("abort", subscriber.onAbort);
    subscriber.resolve(result);
  };
  const finish = (job, result) => {
    if (job.done) return;
    job.done = true;
    if (job.timer !== null) cancelTimer(job.timer);
    if (inFlight.get(job.key) === job) inFlight.delete(job.key);
    const sharedResult = Object.isFrozen(result) ? result : Object.freeze({ ...result });
    for (const subscriber of job.subscribers) settleSubscriber(subscriber, sharedResult);
    job.subscribers.clear();
  };
  const remember = (job, result) => {
    const bytes = 2 * (job.key.length + JSON.stringify(result.tokens).length);
    if (bytes > maxCacheBytes || maxCacheEntries <= 0) return;
    const previous = cache.get(job.key);
    if (previous) { cachedBytes -= previous.bytes; cache.delete(job.key); }
    cache.set(job.key, { bytes, result }); cachedBytes += bytes;
    while (cachedBytes > maxCacheBytes || cache.size > maxCacheEntries) {
      const key = cache.keys().next().value;
      cachedBytes -= cache.get(key).bytes; cache.delete(key);
    }
  };
  const accept = (owner, data) => {
    if (owner !== worker || !active || data?.id !== active.id) return;
    const job = active;
    active = null;
    let result = plainResult("worker-protocol-error");
    if (data.status === "highlighted" && data.language === job.input.language && validateTokens(data.tokens, job.input.text)) {
      // Cache owns frozen structured data; callers cannot corrupt a later view.
      for (const token of data.tokens) {
        Object.freeze(token.light); Object.freeze(token.dark); Object.freeze(token);
      }
      Object.freeze(data.tokens);
      result = Object.freeze({ status: "highlighted", language: data.language, tokens: data.tokens });
      remember(job, result);
    } else if (data.status === "plain" && typeof data.reason === "string") {
      result = plainResult(data.reason.slice(0, 80));
    } else destroyWorker();
    finish(job, result);
    pump();
  };
  const fail = (owner) => {
    if (owner !== worker) return;
    destroyWorker();
    if (active) { const job = active; active = null; finish(job, plainResult("worker-error")); }
    pump();
  };
  const ensureWorker = () => {
    if (worker) return;
    const owner = createWorker();
    worker = owner;
    workerListeners = { message: (event) => accept(owner, event.data), error: () => fail(owner), messageerror: () => fail(owner) };
    for (const [name, callback] of Object.entries(workerListeners)) owner.addEventListener(name, callback);
  };
  function pump() {
    if (disposed || active) return;
    clearIdle();
    const job = queue.shift();
    if (!job) {
      if (worker) idleTimer = schedule(() => { idleTimer = null; destroyWorker(); }, idleMs);
      return;
    }
    active = job;
    try {
      ensureWorker();
      job.timer = schedule(() => {
        if (active !== job) return;
        active = null;
        destroyWorker();
        finish(job, plainResult("timeout"));
        pump();
      }, deadlineMs);
      worker.postMessage({ id: job.id, input: job.input });
    } catch {
      active = null; destroyWorker(); finish(job, plainResult("worker-unavailable")); pump();
    }
  }
  const cancelJob = (job, reason = "cancelled") => {
    if (job.done) return;
    if (active === job) { active = null; destroyWorker(); }
    else { const index = queue.indexOf(job); if (index !== -1) queue.splice(index, 1); }
    finish(job, plainResult(reason));
    pump();
  };
  const subscribe = (job, signal) => new Promise((resolve) => {
    const subscriber = { resolve, signal, done: false };
    subscriber.onAbort = () => {
      if (subscriber.done || job.done) return;
      job.subscribers.delete(subscriber);
      settleSubscriber(subscriber, plainResult("cancelled"));
      // A view owns only its subscription. Other views of the same exact code
      // retain the shared work; its final subscriber still interrupts regex.
      if (job.subscribers.size === 0) cancelJob(job);
    };
    job.subscribers.add(subscriber);
    signal?.addEventListener("abort", subscriber.onAbort, { once: true });
    if (signal?.aborted) subscriber.onAbort();
  });
  return {
    request(input, { signal } = {}) {
      if (disposed) return Promise.resolve(plainResult("disposed"));
      if (signal?.aborted) return Promise.resolve(plainResult("cancelled"));
      const prepared = prepareHighlight(input);
      if (prepared.status !== "eligible") return Promise.resolve(prepared);
      const key = highlightKey(prepared);
      const hit = cache.get(key);
      if (hit) { cache.delete(key); cache.set(key, hit); return Promise.resolve(hit.result); }
      const shared = inFlight.get(key);
      if (shared) {
        if (shared.subscribers.size >= maxSubscribers) return Promise.resolve(plainResult("subscriber-limit"));
        return subscribe(shared, signal);
      }
      if (active && queue.length >= maxQueued) return Promise.resolve(plainResult("queue-limit"));
      const job = { id: ++nextId, input: prepared, key, timer: null, done: false, subscribers: new Set() };
      inFlight.set(key, job); queue.push(job);
      const promise = subscribe(job, signal);
      pump();
      return promise;
    },
    cancelAll(reason = "cancelled") {
      const jobs = [...queue]; queue.length = 0;
      if (active) { jobs.unshift(active); active = null; }
      destroyWorker();
      for (const job of jobs) finish(job, plainResult(reason));
      cache.clear(); cachedBytes = 0;
    },
    dispose() { if (!disposed) { disposed = true; this.cancelAll("disposed"); } },
    inspect() { return { disposed, worker: Boolean(worker), active: Boolean(active), queued: queue.length, sharedJobs: inFlight.size, subscribers: [...inFlight.values()].reduce((count, job) => count + job.subscribers.size, 0), cacheEntries: cache.size, cacheBytes: cachedBytes }; },
  };
}
