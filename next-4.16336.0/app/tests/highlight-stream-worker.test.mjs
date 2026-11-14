import test from "node:test";
import assert from "node:assert/strict";
import { createStreamHighlightClient } from "../src/highlight-stream-client.mjs";
import { createStreamHighlightBinding } from "../src/highlight-stream-binding.mjs";
import { nodeWorkerFactory } from "./fixtures/highlight-node-worker-adapter.mjs";

const entry = new URL("../src/highlight-stream-worker.mjs", import.meta.url).href;
const wait = (predicate, label, ms = 8000) => new Promise((resolve, reject) => {
  const deadline = Date.now() + ms;
  const tick = () => { if (predicate()) resolve(); else if (Date.now() > deadline) reject(new Error(`${label} exceeded ${ms}ms`)); else setTimeout(tick, 10); };
  tick();
});
function harness() {
  const records = [];
  const client = createStreamHighlightClient({ createWorker: nodeWorkerFactory(records, { entry }) });
  return { records, client };
}
const text = (tokens) => tokens.map((t) => t.text).join("");

test("actual stream worker: grammar state spans pushes, recall replaces the open line, CRLF and colors survive", { timeout: 20_000 }, async () => {
  const { records, client } = harness();
  const views = [];
  const binding = createStreamHighlightBinding({ client, onChange: (view) => views.push(view) });
  const base = { language: "js", isFrontier: true, languageSettled: true, scopeKey: "w" };
  try {
    binding.update({ ...base, text: "// c\nconst s = `open" });
    await wait(() => views.some((view) => view.tokens), "first caught-up batch");
    let view = views.at(-1);
    assert.equal(text(view.tokens), "// c\nconst s = `open");
    const openTemplate = view.tokens.find((t) => t.text.includes("open"));
    assert.equal(openTemplate.light.color, "#008000", "unterminated template literal is a string on the open line");
    assert.equal(view.tokens.find((t) => t.text === "const").light.color, "#8100c2");
    assert.equal(view.tokens.find((t) => t.text === "const").dark.color, "#cc7bf4");
    assert.equal(view.tokens.find((t) => t.text.startsWith("//")).light.color, "#6e7687");
    binding.update({ ...base, text: "// c\nconst s = `open\nstill` + f(1);\r\nlet n = 42;" });
    await wait(() => text(views.at(-1).tokens ?? []) === "// c\nconst s = `open\nstill` + f(1);\r\nlet n = 42;", "second batch applied");
    view = views.at(-1);
    const still = view.tokens.find((t) => t.text.includes("still"));
    assert.equal(still.light.color, "#008000", "grammar state carried the template literal across the line boundary");
    assert.equal(view.tokens.find((t) => t.text === "f").light.color, "#0051c2");
    assert.equal(view.tokens.find((t) => t.text === "42").light.color, "#008080");
    assert.ok(view.tokens.some((t) => t.text === "\r\n"), "CRLF separator preserved as its own token");
    binding.update({ ...base, isFrontier: false, text: "// c\nconst s = `open\nstill` + f(1);\r\nlet n = 42;\n" });
    await wait(() => text(views.at(-1).tokens ?? []).endsWith("42;\n"), "final suffix");
    assert.equal(views.at(-1).retained, true); assert.equal(binding.isHeld(), true);
    await wait(() => client.inspect().streams === 0, "stream closed when idle");
  } finally { binding.dispose(); client.dispose(); await Promise.all(records.map((record) => record.exit)); }
});

test("actual stream worker: 40k-unit delta is delivered as <=16384-unit newline-cut pushes with exact text", { timeout: 20_000 }, async () => {
  const records = [], pushes = [];
  const factory = nodeWorkerFactory(records, { entry });
  const client = createStreamHighlightClient({ createWorker: () => {
    const worker = factory();
    return { ...worker, postMessage: (data) => { if (data.kind === "push") pushes.push(data.text); worker.postMessage(data); } };
  } });
  const views = [];
  const binding = createStreamHighlightBinding({ client, onChange: (view) => views.push(view) });
  const lines = Array.from({ length: 800 }, (_, index) => `const v${index} = "${"x".repeat(60)}";`);
  const body = lines.join("\n");
  assert.ok(body.length > 40_000);
  try {
    binding.update({ language: "js", isFrontier: true, languageSettled: true, scopeKey: "big", text: body });
    await wait(() => views.some((view) => view.tokens && view.coveredText === body), "all chunks caught up", 15_000);
    assert.equal(text(views.at(-1).tokens), body);
    assert.ok(pushes.length >= 3, `expected several chunks, got ${pushes.length}`);
    assert.equal(pushes.join(""), body, "chunks concatenate to the fed text");
    for (const chunk of pushes) assert.ok(chunk.length <= 16_384, "chunk within the official limit");
    for (const chunk of pushes.slice(0, -1)) assert.ok(chunk.endsWith("\n"), "cut after a newline");
    assert.ok(views.filter((view) => view.tokens).length >= 1);
    assert.ok(views.every((view) => !view.tokens || view.coveredText === body), "nothing is shown before the first caught-up batch");
  } finally { binding.dispose(); client.dispose(); await Promise.all(records.map((record) => record.exit)); }
});

test("actual stream worker: a lazily loaded bundled grammar (go) streams more than one color", { timeout: 20_000 }, async () => {
  const { records, client } = harness();
  const views = [];
  const binding = createStreamHighlightBinding({ client, onChange: (view) => views.push(view) });
  const body = "package main\n\nfunc main() {\n\tfmt.Println(\"hi\", 42)\n}";
  try {
    binding.update({ language: "golang", isFrontier: true, languageSettled: true, scopeKey: "go", text: body });
    await wait(() => text(views.at(-1)?.tokens ?? []) === body, "go stream caught up");
    const tokens = views.at(-1).tokens;
    assert.ok(new Set(tokens.map((token) => token.light.color)).size > 1);
    assert.ok(new Set(tokens.map((token) => token.dark.color)).size > 1);
  } finally { binding.dispose(); client.dispose(); await Promise.all(records.map((record) => record.exit)); }
});

test("actual stream worker: unknown language errors the stream and a blocked worker is terminated on the deadline", { timeout: 20_000 }, async () => {
  const { records, client } = harness();
  const ends = [];
  const stream = client.open({ language: "notalang", onBatch: () => {}, onEnd: (reason) => ends.push(reason) });
  stream.push("fn main() {}");
  await wait(() => ends.length === 1, "unknown grammar error");
  assert.equal(ends[0], "worker:unknown-language");
  client.dispose(); await Promise.all(records.map((record) => record.exit));
  const blocked = [];
  const slow = createStreamHighlightClient({ createWorker: nodeWorkerFactory(blocked, { block: true }), limits: { chunkUnits: 16_384, replyDeadlineMs: 300, maxStreams: 4, idleMs: 30_000 } });
  const reasons = [];
  slow.open({ language: "javascript", onBatch: () => {}, onEnd: (reason) => reasons.push(reason) }).push("const x = 1;");
  await blocked[0].blocked;
  await wait(() => reasons.length === 1, "deadline");
  assert.equal(reasons[0], "reply-timeout"); assert.equal(slow.inspect().worker, false);
  await blocked[0].exit; assert.equal(blocked[0].raw.threadId, -1);
  slow.dispose();
});
