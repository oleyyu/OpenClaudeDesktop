import test from "node:test";
import assert from "node:assert/strict";
import { sessionEngine, coreEngine, bootEngine, partitionSessions, hiddenSessionsNotice } from "../src/session-engine-model.mjs";

// Thread metadata as main.cjs records it (thread minus turns): a real Codex
// 0.155.1 rollout and a DeepSeek bridge session.
const codexMeta = (id, fields = {}) => ({ id, name: "Codex " + id, cwd: "/work", cliVersion: "0.155.1", modelProvider: "openai", updatedAt: 10, ...fields });
const dshMeta = (id, fields = {}) => ({ id, name: "DeepSeek " + id, cwd: "/work", cliVersion: "dsh 0.2.0-rc.2", modelProvider: "deepseek-official", updatedAt: 20, ...fields });
const read = (thread) => ({ status: "fulfilled", value: { thread } });
const notFound = (id) => ({ status: "rejected", reason: Object.assign(new Error("This session is not available in DeepSeek Harness."), { code: -32602, data: { codexErrorInfo: "threadNotFound", threadId: id } }) });

test("sessionEngine reads the Thread cliVersion / modelProvider; coreEngine reads boot.core", () => {
  assert.equal(sessionEngine({ cliVersion: "0.155.1", modelProvider: "openai" }), "codex");
  assert.equal(sessionEngine({ cliVersion: "dsh 0.2.0-rc.2", modelProvider: "deepseek-official" }), "deepseek");
  assert.equal(sessionEngine({ cliVersion: "0.200.0" }), "codex");
  assert.equal(sessionEngine({ modelProvider: "openai" }), "codex");
  for (const unknown of [undefined, null, {}, { cliVersion: "" }, { modelProvider: "deepseek-official" }]) assert.equal(sessionEngine(unknown), null);
  assert.equal(coreEngine({ engine: "deepseek-harness", engineVersion: "0.2.0-rc.2", capabilities: {} }), "deepseek");
  // A Codex app-server (and every UI fixture) reports no engine: Codex.
  for (const core of [undefined, null, {}, { engine: "codex" }]) assert.equal(coreEngine(core), "codex");
});

test("DeepSeek core: Codex ids are counted, not listed; archived Codex rows are excluded", () => {
  const metadata = { c1: codexMeta("c1"), c2: codexMeta("c2"), d1: dshMeta("d1"), d2: dshMeta("d2"), a1: codexMeta("a1"), a2: dshMeta("a2", { updatedAt: 5 }), gone: dshMeta("gone") };
  const ids = ["c1", "d1", "c2", "d2", "gone", "bare"];
  const results = [notFound("c1"), read(dshMeta("d1", { updatedAt: 30 })), notFound("c2"), read(dshMeta("d2", { updatedAt: 40 })), notFound("gone"), notFound("bare")];
  const config = JSON.stringify({ ids, metadata });
  const out = partitionSessions({ ids, results, metadata, archivedIds: ["a1", "a2", "no-meta"], engine: "deepseek" });
  assert.deepEqual(out.active.map((thread) => thread.id), ["d2", "d1"], "read threads, newest first");
  assert.deepEqual(out.archived.map((thread) => [thread.id, thread.archived]), [["a2", true]]);
  assert.ok(![...out.active, ...out.archived].some((thread) => ["c1", "c2", "a1"].includes(thread.id)));
  assert.equal(out.otherEngine, 3, "c1, c2 and the archived a1");
  assert.equal(out.missing, 2, "a DeepSeek session gone from ~/.dsh, and an id with no metadata");
  assert.equal(JSON.stringify({ ids, metadata }), config, "config ids and metadata are never mutated");
});

test("Codex core keeps the previous behaviour; DeepSeek sessions become the other engine", () => {
  const metadata = { c1: codexMeta("c1"), d1: dshMeta("d1"), old: { id: "old", name: "Untagged", cwd: "/work" }, ad: dshMeta("ad") };
  const out = partitionSessions({ ids: ["c1", "d1"], results: [read(codexMeta("c1")), { status: "rejected", reason: new Error("thread not found") }], metadata, archivedIds: ["old", "ad"], engine: "codex" });
  assert.deepEqual(out.active.map((thread) => thread.id), ["c1"]);
  assert.deepEqual(out.archived.map((thread) => thread.id), ["old"], "an untagged archived row is still shown under Codex");
  assert.deepEqual({ otherEngine: out.otherEngine, missing: out.missing }, { otherEngine: 2, missing: 0 });
  // Fixture servers carry no cliVersion: nothing is attributed, reads that fail are just missing.
  const fixture = partitionSessions({ ids: ["x", "y"], results: [read({ id: "x", updatedAt: 1 }), { status: "rejected", reason: new Error("boom") }], metadata: { x: { id: "x" }, y: { id: "y" } }, archivedIds: [] });
  assert.deepEqual({ active: fixture.active.map((thread) => thread.id), otherEngine: fixture.otherEngine, missing: fixture.missing, missingIds: fixture.missingIds }, { active: ["x"], otherEngine: 0, missing: 1, missingIds: ["y"] });
  assert.deepEqual(partitionSessions(), { active: [], archived: [], otherEngine: 0, missing: 0, missingIds: [] });
});

test("hidden-sessions notice copy: other-core sessions stay silent, only load failures are noted", () => {
  assert.equal(hiddenSessionsNotice({ otherEngine: 10, missing: 0 }, "deepseek"), "");
  assert.equal(hiddenSessionsNotice({ otherEngine: 1, missing: 2 }, "deepseek"), "2 sessions could not be loaded.");
  assert.equal(hiddenSessionsNotice({ otherEngine: 0, missing: 1 }, "codex"), "1 session could not be loaded.");
  for (const none of [undefined, null, {}, { otherEngine: 0, missing: 0 }, { otherEngine: 3 }]) assert.equal(hiddenSessionsNotice(none, "deepseek"), "");
});

test("bootEngine: a reported core wins; a failed start names the chosen core (else DeepSeek); no boot or no report is Codex", () => {
  assert.equal(bootEngine({ connected: true, core: { engine: "deepseek" } }), "deepseek");
  assert.equal(bootEngine({ connected: false, core: { engine: "zcode" }, config: { core: "kimi" } }), "zcode");
  assert.equal(bootEngine({ connected: false, config: { core: "kimi" } }), "kimi");
  assert.equal(bootEngine({ connected: false, config: {} }), "deepseek");
  assert.equal(bootEngine({ connected: false, config: { core: "my-pack-core" } }), "my-pack-core");
  assert.equal(bootEngine({ connected: true, config: { core: "kimi" } }), "codex");
  assert.equal(bootEngine(null), "codex");
});
// W14-code r4 复核 (E95): the sidebar footer's Connection settings menu (the former user of engine here) is gone, as
// official hL df-footer-aux is empty in code mode; main.jsx still derives engine from bootEngine(boot).
test("main.jsx derives the running engine from bootEngine(boot)", async () => {
  const fs = await import("node:fs/promises"), path = await import("node:path");
  const main = await fs.readFile(path.resolve(import.meta.dirname, "../src/main.jsx"), "utf8");
  assert.match(main, /const engine = bootEngine\(boot\);/);
});
