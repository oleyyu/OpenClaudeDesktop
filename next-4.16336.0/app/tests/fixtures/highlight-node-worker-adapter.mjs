import { Worker } from "node:worker_threads";
export function nodeWorkerFactory(records, { block = false, entry } = {}) {
  return () => {
    const raw = new Worker(new URL("./highlight-node-worker-host.mjs", import.meta.url), { workerData: { block, entry } });
    const callbacks = new Map();
    const record = { raw, terminated: false, ready: null, blocked: null, exit: null };
    record.ready = new Promise((resolve) => raw.on("message", (data) => { if (data.fixture === "ready") resolve(); }));
    record.blocked = new Promise((resolve) => raw.on("message", (data) => { if (data.fixture === "blocked") resolve(); }));
    record.exit = new Promise((resolve) => raw.once("exit", (code) => resolve(code)));
    records.push(record);
    return {
      postMessage: (data) => raw.postMessage(data),
      terminate() { record.terminated = true; return raw.terminate(); },
      addEventListener(name, callback) {
        const listener = name === "message" ? (data) => callback({ data }) : callback;
        callbacks.set(callback, listener); raw.on(name, listener);
      },
      removeEventListener(name, callback) { raw.off(name, callbacks.get(callback)); callbacks.delete(callback); },
    };
  };
}
