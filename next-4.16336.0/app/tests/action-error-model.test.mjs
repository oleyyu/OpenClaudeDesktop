import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACTION_ERROR_COPY, actionErrorMessage, cleanErrorReason, reportActionError, sessionActionErrorKind } from "../src/action-error-model.mjs";

const catalog = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../reference/current-2.2553.1/ion-dist/i18n/en-US.json"), "utf8"));
const IDS = {
  rename: "7ck8ciIf0O", archive: "NAJOCQ+6Ax", unarchive: "dqliJPGcDN", delete: "x1taMCWebd", fork: "nGtjMsYWZD",
  pin: "L7j7nu8EU0", unpin: "v5/fMMduyr", "mark-unread": "kBqUwOwe7e", reveal: "X0Ntx9olgx", "reveal-file": "8Kiu8ZnCtS",
  "open-link": "XE6tFsxNtw", "save-preference": "7a1I3aH5Fd", "dismiss-recent": "7a1I3aH5Fd",
};

test("every action kind uses the exact 2.2553.1 catalog string for its call site", () => {
  for (const [kind, id] of Object.entries(IDS)) assert.equal(ACTION_ERROR_COPY[kind], catalog[id], kind);
  assert.equal(actionErrorMessage("rename"), "Couldn’t rename this task. Try again.");
  assert.equal(actionErrorMessage("archive"), "Couldn’t archive this session. Try again.");
  assert.equal(actionErrorMessage("reveal"), "Couldn’t show this folder in the file manager.");
  for (const message of Object.values(ACTION_ERROR_COPY)) if (message) assert.doesNotMatch(message, /Could not|Error invoking/);
});

test("a failed read is silent (shared-16 Oh raises only for unread); unknown kinds fall back to the save copy", () => {
  assert.equal(actionErrorMessage("mark-read"), null);
  assert.equal(actionErrorMessage("move-to-group"), "Couldn’t save that change. Try again.");
});

test("session menu actions map onto copy kinds", () => {
  assert.equal(sessionActionErrorKind("reveal-folder"), "reveal");
  for (const action of ["rename", "archive", "unarchive", "pin", "unpin", "mark-read", "mark-unread", "fork", "delete"]) assert.equal(sessionActionErrorKind(action), action);
  assert.equal(sessionActionErrorKind("open-terminal"), "other");
  assert.equal(actionErrorMessage(sessionActionErrorKind("pinned-order")), "Couldn’t save that change. Try again.");
});

test("the Electron IPC wrapper is stripped; clean reasons pass through unchanged", () => {
  assert.equal(cleanErrorReason(new Error("Error invoking remote method 'desktop:call': Error: Folder is gone")), "Folder is gone");
  assert.equal(cleanErrorReason("Error invoking remote method 'desktop:call': Thread not found"), "Thread not found");
  assert.equal(cleanErrorReason("Error invoking remote method 'other:channel': Error: x"), "x");
  assert.equal(cleanErrorReason("Stop the running task before archiving it."), "Stop the running task before archiving it.");
  assert.equal(cleanErrorReason({ message: "plain" }), "plain");
  assert.equal(cleanErrorReason(undefined), "");
});

test("reportActionError adds one keyed danger toast and logs only the cleaned reason", () => {
  const added = [], logged = [];
  const toasts = { add: (message, options) => added.push([message, options]) };
  const warn = (...args) => logged.push(args);
  const shown = reportActionError(toasts, "archive", new Error("Error invoking remote method 'desktop:call': Error: refused"), { warn });
  assert.equal(shown, "Couldn’t archive this session. Try again.");
  assert.deepEqual(added, [["Couldn’t archive this session. Try again.", { variant: "danger", key: "action-error:archive" }]]);
  assert.deepEqual(logged, [["Action failed (archive):", "refused"]]);
  assert.equal(reportActionError(toasts, "mark-read", new Error("x"), { warn }), null);
  assert.equal(added.length, 1, "a silent kind adds no toast");
  assert.equal(logged.length, 2, "but still logs");
  assert.doesNotThrow(() => reportActionError(null, "pin", new Error("x"), { warn }));
});
