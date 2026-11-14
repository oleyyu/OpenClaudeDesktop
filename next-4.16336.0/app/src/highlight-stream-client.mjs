import { STREAM_LIMITS, splitChunk } from "./highlight-stream-model.mjs";

// Renderer-owned client for the incremental highlight worker (official YD).
// One long-lived module worker hosts every open stream; each stream sends one
// chunk (<= chunkUnits, cut after a newline) at a time and waits for its batch.
// A reply that misses the deadline while the document is visible, or any
// worker error, terminates the worker and fails every open stream (official
// VD); the next open() starts a fresh worker. Never Codex/main IPC.
export function createStreamHighlightClient({
  createWorker, limits = STREAM_LIMITS,
  schedule = setTimeout, cancelTimer = clearTimeout,
  isHidden = () => typeof document !== "undefined" && document.hidden === true,
} = {}) {
  let worker = null, listeners = null, nextId = 0, disposed = false, idleTimer = null;
  const streams = new Map();
  const clearIdle = () => { if (idleTimer !== null) { cancelTimer(idleTimer); idleTimer = null; } };
  const destroyWorker = () => {
    clearIdle();
    const old = worker;
    worker = null;
    if (old) {
      for (const [name, callback] of Object.entries(listeners ?? {})) old.removeEventListener(name, callback);
      try { old.terminate(); } catch { /* Already closed. */ }
    }
    listeners = null;
  };
  const post = (message) => { try { worker?.postMessage(message); return true; } catch { return false; } };
  const disarm = (stream) => { if (stream.timer !== null) { cancelTimer(stream.timer); stream.timer = null; } };
  const arm = (stream) => {
    disarm(stream);
    stream.timer = schedule(() => {
      stream.timer = null;
      if (stream.closed || !stream.inFlight) return;
      // Background tabs get throttled; only a visible document's silence counts.
      if (isHidden()) { arm(stream); return; }
      failAll("reply-timeout");
    }, limits.replyDeadlineMs);
  };
  const scheduleIdle = () => {
    if (streams.size === 0 && worker && idleTimer === null) idleTimer = schedule(() => { idleTimer = null; if (streams.size === 0) destroyWorker(); }, limits.idleMs);
  };
  const close = (stream) => {
    if (stream.closed) return;
    stream.closed = true;
    disarm(stream);
    streams.delete(stream.id);
    if (worker) post({ kind: "close", streamId: stream.id });
    scheduleIdle();
  };
  const fail = (stream, reason) => {
    if (stream.closed) return;
    close(stream);
    stream.onEnd(reason);
  };
  function failAll(reason) {
    destroyWorker();
    for (const stream of [...streams.values()]) fail(stream, reason);
  }
  const pump = (stream) => {
    if (stream.closed || stream.inFlight || stream.buffer === "") return;
    const { chunk, rest } = splitChunk(stream.buffer, limits.chunkUnits);
    stream.buffer = rest;
    stream.inFlight = true;
    stream.inFlightUnits = chunk.length;
    stream.seq += 1;
    if (!post({ kind: "push", streamId: stream.id, seq: stream.seq, text: chunk })) { failAll("worker-unavailable"); return; }
    arm(stream);
  };
  const accept = (owner, data) => {
    if (owner !== worker || !data || typeof data.kind !== "string") return;
    const stream = streams.get(data.streamId);
    if (!stream || stream.closed || !stream.inFlight || data.seq !== stream.seq) return;
    if (data.kind === "batch") {
      disarm(stream);
      stream.inFlight = false;
      stream.covered += stream.inFlightUnits;
      stream.inFlightUnits = 0;
      pump(stream);
      const caughtUp = !stream.inFlight && stream.buffer === "";
      stream.onBatch({ recall: data.recall, tokens: data.tokens, caughtUp, covered: stream.covered });
      if (!stream.closed && stream.closeWhenIdle && caughtUp) close(stream);
      return;
    }
    if (data.kind === "error") { fail(stream, `worker:${typeof data.reason === "string" ? data.reason.slice(0, 80) : "error"}`); return; }
  };
  const ensureWorker = () => {
    if (worker) return true;
    try {
      const owner = createWorker();
      worker = owner;
      listeners = { message: (event) => accept(owner, event.data), error: () => { if (owner === worker) failAll("worker-error"); }, messageerror: () => { if (owner === worker) failAll("worker-error"); } };
      for (const [name, callback] of Object.entries(listeners)) owner.addEventListener(name, callback);
      return true;
    } catch { worker = null; listeners = null; return false; }
  };
  return {
    // Returns null when the client cannot host another stream (caller stays plain).
    open({ language, onBatch, onEnd }) {
      if (disposed || typeof language !== "string" || streams.size >= limits.maxStreams) return null;
      clearIdle();
      if (!ensureWorker()) return null;
      const stream = { id: ++nextId, language, buffer: "", inFlight: false, inFlightUnits: 0, covered: 0, seq: 0, closed: false, closeWhenIdle: false, timer: null, onBatch, onEnd };
      streams.set(stream.id, stream);
      if (!post({ kind: "open", streamId: stream.id, language })) { streams.delete(stream.id); destroyWorker(); return null; }
      return {
        get id() { return stream.id; },
        get closed() { return stream.closed; },
        push(text) { if (stream.closed || typeof text !== "string" || text === "") return; stream.buffer += text; pump(stream); },
        closeWhenIdle() { stream.closeWhenIdle = true; if (!stream.closed && !stream.inFlight && stream.buffer === "") close(stream); },
        close() { close(stream); },
      };
    },
    failAll,
    inspect() {
      return { disposed, worker: Boolean(worker), streams: streams.size,
        inFlight: [...streams.values()].filter((stream) => stream.inFlight).length,
        buffered: [...streams.values()].reduce((sum, stream) => sum + stream.buffer.length, 0) };
    },
    dispose() { if (!disposed) { disposed = true; failAll("disposed"); } },
  };
}
