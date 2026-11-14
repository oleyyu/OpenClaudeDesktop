import test from "node:test";
import assert from "node:assert/strict";
import { createStreamHighlightBinding } from "../src/highlight-stream-binding.mjs";

// Fake client: records opened streams, lets the test deliver batches.
function fakeClient({ refuse = false } = {}) {
  const streams = [];
  return {
    streams,
    open({ language, onBatch, onEnd }) {
      if (refuse) return null;
      const stream = { language, pushed: "", closed: false, idle: false, onBatch, onEnd,
        push(text) { if (!stream.closed) stream.pushed += text; }, closeWhenIdle() { stream.idle = true; }, close() { stream.closed = true; } };
      streams.push(stream);
      return stream;
    },
  };
}
const tok = (text, color = "#14181f") => ({ text, light: { color, fontStyle: 0 }, dark: { color: "#eaecf0", fontStyle: 0 } });
const base = { language: "js", isFrontier: true, languageSettled: true, scopeKey: "k1" };
function harness(options) {
  const client = fakeClient(options), views = [];
  const binding = createStreamHighlightBinding({ client, onChange: (view) => views.push(view) });
  return { client, views, binding, last: () => views.at(-1) };
}

test("opens on the first frontier render, feeds only suffixes, and shows nothing before the first caught-up batch", () => {
  const { client, views, binding, last } = harness();
  binding.update({ ...base, text: "const a" });
  assert.equal(client.streams.length, 1); assert.equal(client.streams[0].language, "javascript"); assert.equal(client.streams[0].pushed, "const a");
  binding.update({ ...base, text: "const a = 1;" });
  assert.equal(client.streams[0].pushed, "const a = 1;"); assert.equal(client.streams.length, 1);
  client.streams[0].onBatch({ recall: 0, tokens: [tok("const"), tok(" a")], caughtUp: false, covered: 7 });
  assert.ok(views.every((view) => view.tokens === null && view.phase === "streaming"), "not caught up: plain stays visible");
  client.streams[0].onBatch({ recall: 2, tokens: [tok("const"), tok(" a = "), tok("1", "#008080"), tok(";")], caughtUp: true, covered: 12 });
  assert.equal(last().tokens.map((t) => t.text).join(""), "const a = 1;"); assert.equal(last().coveredText, "const a = 1;");
  assert.equal(last().phase, "streaming"); assert.equal(binding.isHeld(), false);
  binding.dispose(); assert.equal(client.streams[0].closed, true);
});

test("frontier end after a first render retains tokens, feeds the final suffix and closes when idle; later batches still apply", () => {
  const { client, binding, last } = harness();
  binding.update({ ...base, text: "let x" });
  client.streams[0].onBatch({ recall: 0, tokens: [tok("let"), tok(" x")], caughtUp: true, covered: 5 });
  binding.update({ ...base, isFrontier: false, text: "let x = 2;\n" });
  assert.equal(client.streams[0].pushed, "let x = 2;\n"); assert.equal(client.streams[0].idle, true); assert.equal(client.streams[0].closed, false);
  assert.equal(last().phase, "retained"); assert.equal(binding.isHeld(), true); assert.equal(last().retained, true);
  client.streams[0].onBatch({ recall: 2, tokens: [tok("let"), tok(" x = "), tok("2", "#008080"), tok(";"), tok("\n")], caughtUp: true, covered: 11 });
  assert.equal(last().tokens.map((t) => t.text).join(""), "let x = 2;\n"); assert.equal(last().retained, true);
  binding.update({ ...base, isFrontier: false, text: "let x = 2;\n" });
  assert.equal(last().retained, true, "repeat renders keep retention");
  binding.update({ ...base, isFrontier: false, text: "replaced" });
  assert.equal(last().phase, "ended"); assert.equal(binding.isHeld(), false); assert.equal(client.streams[0].closed, true);
  binding.dispose();
});

test("frontier end without a first render releases the fence to the settled path", () => {
  const { client, binding, last } = harness();
  binding.update({ ...base, text: "let x" });
  binding.update({ ...base, isFrontier: false, text: "let x;" });
  assert.equal(client.streams[0].closed, true); assert.equal(last().phase, "ended"); assert.equal(binding.isHeld(), false);
  binding.dispose();
});

test("non-append mutation while frontier restarts; token mismatch, limits and refusal end the stream", () => {
  const { client, binding, last } = harness();
  binding.update({ ...base, text: "const a" });
  client.streams[0].onBatch({ recall: 0, tokens: [tok("const"), tok(" a")], caughtUp: true, covered: 7 });
  binding.update({ ...base, text: "let b" });
  assert.equal(client.streams[0].closed, true); assert.equal(client.streams.length, 2); assert.equal(client.streams[1].pushed, "let b");
  assert.equal(last().tokens, null, "old tokens are dropped after a restart");
  client.streams[1].onBatch({ recall: 0, tokens: [tok("let"), tok(" b")], caughtUp: true, covered: 5 });
  assert.equal(last().tokens.map((t) => t.text).join(""), "let b");
  client.streams[1].onBatch({ recall: 2, tokens: [tok("let"), tok(" c")], caughtUp: true, covered: 5 });
  assert.equal(last().phase, "ended"); assert.equal(last().reason, "token-mismatch"); assert.equal(client.streams[1].closed, true);
  assert.equal(last().tokens, null, "an ended stream shows no tokens (settled/plain path owns the block)");
  const grown = harness();
  grown.binding.update({ ...base, text: "const short = 1;" });
  grown.client.streams[0].onBatch({ recall: 0, tokens: [tok("const"), tok(" short = 1;")], caughtUp: true, covered: 16 });
  assert.equal(grown.last().tokens.length, 2);
  grown.binding.update({ ...base, text: "const short = 1;\n" + "x".repeat(1001) });
  assert.equal(grown.last().phase, "ended"); assert.equal(grown.last().reason, "line-length-limit"); assert.equal(grown.last().tokens, null);
  const limits = harness();
  limits.binding.update({ ...base, text: "x".repeat(1001) });
  assert.equal(limits.last().reason, "line-length-limit"); assert.equal(limits.client.streams[0].closed, true);
  const refused = harness({ refuse: true });
  refused.binding.update({ ...base, text: "x" });
  assert.equal(refused.last().reason, "stream-limit");
  const unknown = harness();
  unknown.binding.update({ ...base, language: "notalang", text: "fn main() {}" });
  assert.equal(unknown.client.streams.length, 0); assert.equal(unknown.last().reason, "unknown-language");
  const unsettled = harness();
  unsettled.binding.update({ ...base, languageSettled: false, text: "" });
  assert.equal(unsettled.client.streams.length, 0); assert.equal(unsettled.views.length, 0);
});

test("client-side end (worker death) ends the fence; a new scope key starts over; never-frontier blocks never stream", () => {
  const { client, binding, last } = harness();
  binding.update({ ...base, text: "const a" });
  client.streams[0].onEnd("worker-error");
  assert.equal(last().phase, "ended"); assert.equal(last().reason, "worker-error");
  binding.update({ ...base, text: "const ab" });
  assert.equal(client.streams.length, 1, "an ended fence does not reopen while its identity is unchanged");
  binding.update({ ...base, scopeKey: "k2", text: "const z" });
  assert.equal(client.streams.length, 2); assert.equal(last().phase, "streaming");
  const settled = harness();
  settled.binding.update({ ...base, isFrontier: false, text: "done" });
  assert.equal(settled.client.streams.length, 0); assert.equal(settled.views.length, 0);
  binding.dispose();
});

test("a new code theme pair releases a retained fence (and a fence finishing under a changed pair) to the settled path", () => {
  const claude = { light: "claude-light", dark: "claude-dark" }, github = { light: "claude-light", dark: "github-dark" };
  const { client, binding, last } = harness();
  binding.update({ ...base, text: "let x", themes: claude });
  client.streams[0].onBatch({ recall: 0, tokens: [tok("let"), tok(" x")], caughtUp: true, covered: 5 });
  binding.update({ ...base, text: "let x = 2;", themes: github });
  assert.equal(client.streams.length, 1, "a pair change while streaming neither restarts nor ends the stream");
  assert.equal(client.streams[0].pushed, "let x = 2;"); assert.equal(last().phase, "streaming");
  binding.update({ ...base, isFrontier: false, text: "let x = 2;\n", themes: github });
  assert.equal(last().phase, "ended"); assert.equal(last().reason, "theme-changed"); assert.equal(binding.isHeld(), false);
  assert.equal(client.streams[0].closed, true); assert.equal(client.streams[0].pushed, "let x = 2;", "the final suffix is not fed to a stream that is being released");
  binding.dispose();

  const second = harness();
  second.binding.update({ ...base, text: "let y", themes: claude });
  second.client.streams[0].onBatch({ recall: 0, tokens: [tok("let"), tok(" y")], caughtUp: true, covered: 5 });
  second.binding.update({ ...base, isFrontier: false, text: "let y;\n", themes: claude });
  assert.equal(second.last().phase, "retained"); assert.equal(second.binding.inspect().themes, "claude-light\0claude-dark");
  second.binding.update({ ...base, isFrontier: false, text: "let y;\n", themes: claude });
  assert.equal(second.last().retained, true, "the same pair keeps retention");
  second.binding.update({ ...base, isFrontier: false, text: "let y;\n", themes: github });
  assert.equal(second.last().phase, "ended"); assert.equal(second.last().reason, "theme-changed"); assert.equal(second.last().tokens, null);
  assert.equal(second.binding.isHeld(), false); assert.equal(second.client.streams[0].closed, true);
  second.binding.update({ ...base, isFrontier: false, text: "let y;\n", themes: claude });
  assert.equal(second.last().phase, "ended", "a released fence does not reopen when the pair returns");
  assert.equal(second.client.streams.length, 1);
  second.binding.dispose();
});
