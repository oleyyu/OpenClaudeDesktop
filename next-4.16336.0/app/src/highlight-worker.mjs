import { createTokenizer } from "./highlight-tokenizer.mjs";
const tokenize = createTokenizer();
// The service sends one request at a time. Refuse unexpected overlap rather
// than building a second unbounded async queue inside the worker.
let busy = false;
self.addEventListener("message", async ({ data }) => {
  if (!Number.isSafeInteger(data?.id) || busy) return;
  busy = true;
  try {
    const result = await tokenize(data.input);
    self.postMessage({ id: data.id, ...result });
  } catch {
    self.postMessage({ id: data.id, status: "plain", reason: "tokenizer-error" });
  } finally { busy = false; }
});
