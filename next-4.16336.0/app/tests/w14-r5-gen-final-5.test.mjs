// W14-code r5 gen-final-5: the last lane's own fixes (bulk unarchive toast, D1 of cc3bc2027's layout tokens).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { bulkActionPayload, runBulkSessions } from "../src/sidebar-bulk-model.mjs";
import { sidebarListMessages } from "../src/generated/sessions-page/pure-shared-78.mjs";
import zhSidebar from "../electron/i18n/zh-CN/sidebar.mjs";

const root = path.resolve(import.meta.dirname, "..");
const official = path.join(root, "../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const chunk = (prefix) => fs.readFileSync(path.join(official, fs.readdirSync(official).find((n) => n.startsWith(prefix) && n.endsWith(".js"))), "utf8");

test("bulk unarchive: each session is silent and the bulk bar says it once (c39a247c4 gn / zt)", async () => {
  const c39 = chunk("c39a247c4-");
  // gn: the bulk actions' unarchive mutation is silent; zt names the summary and failure messages.
  assert.ok(c39.includes("d=J0($,1)?K0($,1,{silent:!0}):$[1],{mutateAsync:f}=Ye(d)"));
  assert.ok(c39.includes("unarchive:{success:R.bulkRestored,failure:R.bulkRestoreFailed}"));
  assert.ok(c39.includes("let t=i.formatMessage(zt[e].success,{count:x});h?.undo?.offer(t)||a(t,{timeout:3e3})"));
  assert.deepEqual(bulkActionPayload("unarchive", undefined), { silent: true });
  assert.deepEqual(bulkActionPayload("unarchive", { a: 1 }), { a: 1, silent: true });
  assert.deepEqual(bulkActionPayload("delete", undefined), { bulk: true });
  assert.equal(bulkActionPayload("pin", undefined), undefined);
  const seen = [];
  const { done, failed } = await runBulkSessions("unarchive", [{ id: "a" }, { id: "b" }], undefined, {
    current: null, run: async (action, session, payload) => { seen.push(payload); if (session.id === "b") throw new Error("x"); return true; },
    present: () => true, archived: () => true });
  assert.deepEqual(seen, [{ silent: true }, { silent: true }]);
  assert.deepEqual({ done, failed }, { done: 1, failed: 1 });
  // The sidebar formats the official messages (Code only) and zh-CN carries both.
  const sidebar = read("src/source-sidebar.jsx");
  assert.match(sidebar, /if \(action === "unarchive" && mode === "code"\) \{\n\s+if \(done > 0\) notify\(intl\.formatMessage\(sidebarListMessages\.bulkRestored, \{ count: done \}\), \{ variant: "neutral", key: "group-bulk-unarchive", timeout: 3000 \}\);\n\s+if \(failed > 0\) notify\(intl\.formatMessage\(sidebarListMessages\.bulkRestoreFailed, \{ count: failed \}\), \{ variant: "danger" \}\);/);
  assert.ok(zhSidebar[sidebarListMessages.bulkRestored.defaultMessage]);
  assert.ok(zhSidebar[sidebarListMessages.bulkRestoreFailed.defaultMessage]);
  // main.jsx's per-session toast stays off for a silent caller.
  assert.match(read("src/main.jsx"), /if \(action === "unarchive" && mode === "code" && toasts && payload\.silent !== true\)/);
});

test("D1: cc3bc2027's layout tokens are one copy (transcript-rows), re-exported by code-editor-current", async () => {
  const tokens = read("src/generated/code-editor-current/layout-tokens.mjs");
  assert.match(tokens, /from "\.\.\/transcript-rows\/rows-cc3bc2027-CqmDBxcX\.mjs"/);
  assert.doesNotMatch(tokens, /var n =/);
  const editor = await import("../src/generated/code-editor-current/layout-tokens.mjs");
  const rows = await import("../src/generated/transcript-rows/rows-cc3bc2027-CqmDBxcX.mjs");
  assert.equal(editor.editorLayout, rows.editorLayout);
  assert.equal(editor.lineNumberLayout, rows.lineNumberLayout);
  assert.deepEqual(rows.editorLayout, { padBlock: "8px", linePadStart: "4px", linePadEnd: "12px", numberPadStart: "18px", foldColumnWidth: "12px" });
  assert.deepEqual(rows.lineNumberLayout(true), { minWidth: "2rem", padEnd: "0px" });
  assert.match(rows.fileGutterCss(false, 3), /\[data-line-number-content\]\{min-width:max\(calc\(2\.5rem - 18px - 8px\),3ch\)\}/);
});

test("Customize › Connectors' add dialog drops the host's restart line (the core restarts itself, r5-shared-02)", () => {
  const harness = read("src/source-settings-harness.jsx"), customize = read("src/source-customize.jsx");
  // W14-code sh6-05: Settings › Harness drops it too (same mcp-add → coreRestart.mark; en-US.json has no such line).
  assert.match(harness, /export function AddServerDialog\(\{ onClose, onAdd, description = null \}\)/);
  assert.doesNotMatch(harness, /The server starts with the core/);
  assert.match(harness, /<SourceDialog title=\{t\('Add server'\)\} description=\{description\}/);
  assert.match(customize, /<AddServerDialog description=\{null\} onClose=\{\(\) => setHarnessAdding\(false\)\}/);
  // Settings › Harness mounts it with the default (no description).
  assert.match(harness, /<AddServerDialog onClose=\{\(\) => setAdding\(false\)\}/);
  assert.match(read("electron/main.cjs"), /if \(p\.op === "mcp-add" && coreSupports\(owner\?\.serverInfo, "harnessProfile"\)\) coreRestart\.mark\(owner\)/);
});

test("R5DC-03 residue: no pause / pausable / member control left on the host side (E95, R4T-08b Tasks has only Stop)", async () => {
  assert.doesNotMatch(read("electron/workflow-harness.mjs"), /controlMember|codeDesktop\/workflow\/member/);
  assert.doesNotMatch(read("electron/workflow-child.mjs"), /type:'pausable'/);
  assert.doesNotMatch(read("src/workflow-progress-model.mjs"), /event\.type==='pausable'|next\.paused/);
  assert.doesNotMatch(read("src/source-workflow.jsx"), /run\.paused/);
  const { workflowEvent } = await import("../src/workflow-progress-model.mjs");
  const run = workflowEvent({ id: "r", startedAt: 0, agents: [], progress: [] }, { type: "paused", paused: true }, 1);
  assert.equal(run.paused, undefined);
  assert.equal(workflowEvent(run, { type: "pausable", pausable: false }, 2).pausable, undefined);
});
