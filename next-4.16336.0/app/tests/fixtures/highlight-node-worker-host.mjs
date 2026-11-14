// Test-only Node bridge. The production module is still a browser Web Worker.
import { parentPort, workerData } from "node:worker_threads";
if (workerData?.block) {
  parentPort.on("message", () => {
    parentPort.postMessage({ fixture: "blocked" });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  });
} else {
  globalThis.self = {
    postMessage: (data) => parentPort.postMessage(data),
    addEventListener: (name, callback) => {
      if (name === "message") parentPort.on("message", (data) => callback({ data }));
    },
  };
  await import(workerData?.entry ?? "../../src/highlight-worker.mjs");
}
parentPort.postMessage({ fixture: "ready" });
