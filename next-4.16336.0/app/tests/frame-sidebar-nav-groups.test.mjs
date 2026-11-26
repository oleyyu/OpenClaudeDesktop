// Group by › Model in the Code sidebar (frame-sidebar-nav-groups.jsx over frame-sidebar-nav-groups-model.mjs): the official
// groupBy vocabularies the host now answers (4.16336.0 shared-92 by / xy), and the provider buckets of the list's rows.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { listToSectionGroupBy, modelSessionBuckets, sectionToListGroupBy } from "../src/frame-sidebar-nav-groups-model.mjs";

const app = new URL("..", import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, app), "utf8");

test("the official section and list vocabularies, as 4.16336.0 shared-92 by / xy map them", () => {
  assert.deepEqual(["custom", "none", "project", "environment", "coder", "state", "date", "model", "anything", undefined].map(listToSectionGroupBy),
    ["none", "none", "folder", "savedEnvironment", "savedEnvironment", "status", "date", "date", "date", undefined]);
  assert.deepEqual(["folder", "savedEnvironment", "status", "date", "none", null].map(sectionToListGroupBy), ["project", "environment", "state", "date", "none", null]);
});

const catalog = [
  { model: "opencode/free", provider: "opencode", description: "OpenCode Zen", isDefault: true },
  { model: "claude-agent/opus", provider: "claude-agent", description: "Claude Agent" },
  { model: "openai/gpt", provider: "openai", description: "OpenAI" },
];
// The official list row (nav-body): data normalized from the CCR session it keeps as _originalSession.
const row = (id, model, at) => ({ ref: { kind: "code", id }, source: { kind: "code", data: { id, lastWorkAtMs: at, _originalSession: { id, session_context: { model } } } } });

test("rows by provider in the catalog's provider order, unknown providers after, Other last; each with its latest model", () => {
  const rows = [row("a", "openai/gpt", 5), row("b", "claude-agent/opus", 9), row("c", null, 1), row("d", "claude-agent/sonnet", 12), row("e", "deepseek/chat", 3), row("f", "opencode/free", 2)];
  const buckets = modelSessionBuckets(rows, catalog, "其他");
  assert.deepEqual(buckets.map((bucket) => [bucket.key, bucket.provider, bucket.label, bucket.rows.map((entry) => entry.ref.id), bucket.recentModel]), [
    ["opencode", "opencode", "OpenCode Zen", ["f"], "opencode/free"],
    ["claude-agent", "claude-agent", "Claude", ["b", "d"], "claude-agent/sonnet"],
    ["openai", "openai", "OpenAI", ["a"], "openai/gpt"],
    ["deepseek", "deepseek", "deepseek", ["e"], "deepseek/chat"],
    ["other", null, "其他", ["c"], null],
  ]);
  assert.deepEqual(modelSessionBuckets([], catalog), []);
});

test("the five boundaries are answered by the host table through frame-sidebar-nav-groups.jsx", () => {
  const generator = read("scripts/extract-frame-sidebar-nav.mjs"), host = read("src/frame-sidebar-nav-host.jsx"), adapter = read("src/frame-sidebar-nav-adapter.mjs");
  const groups = read("src/frame-sidebar-nav-groups.jsx"), body = read("src/frame-sidebar-nav-body.jsx");
  for (const name of ["sessionsSectionGroupBy", "writeListGroupBy", "clearListGroupBy", "useGroupByOptions", "renderSessionGroups"]) {
    assert.match(generator, new RegExp(`name: '${name}'`));
    assert.match(adapter, new RegExp(`export function ${name}\\(`));
    assert.match(host, new RegExp(`${name}: \\["host", groupAnswer\\("${name}"\\)\\]`));
    assert.match(groups, new RegExp(`export function ${name}\\(`));
  }
  // The groups module reads nav exports, so it loads after the nav body and is provided to the table, never imported by it.
  assert.ok(body.indexOf('from "./frame-sidebar-nav-groups.jsx"') > body.indexOf('from "./generated/frame-sidebar-nav/nav-body.mjs"'));
  assert.match(body, /provideNavGroups\(NAV_GROUP_ANSWERS\);/);
  assert.doesNotMatch(host, /from "\.\/frame-sidebar-nav-groups/);
});
