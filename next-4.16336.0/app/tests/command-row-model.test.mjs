import {connectionInterrupted} from "../src/item-observation.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  commandCopyText,
  commandOutput,
  commandRowLabel,
  commandRowState,
  elapsedSuffix,
  formatDuration,
  INTERRUPTED_OUTPUT,
  pendingCommandItemIds,
} from "../src/command-row-model.mjs";
import { describeVerb } from "../src/description-verb-model.mjs";

test("state follows the Codex status, and an unresolved approval blocks it", () => {
  assert.equal(commandRowState({ status: "inProgress" }), "busy");
  assert.equal(commandRowState({ status: "inProgress" }, true), "blocked");
  assert.equal(commandRowState({ status: "completed" }), "done");
  assert.equal(commandRowState({ status: "failed" }), "failed");
  assert.equal(commandRowState({ status: "declined" }), "denied");
  assert.equal(commandRowState({ status: "interrupted" }), "stopped");
  assert.equal(commandRowState({}), "done");
});

test("a non-zero exit code on a completed command is not a failure", () => {
  assert.equal(commandRowState({ status: "completed", exitCode: 1 }), "done");
  assert.equal(commandRowState({ status: "failed", exitCode: 0 }), "failed");
});

test("the verb is Running only while the row is live", () => {
  assert.deepEqual(commandRowLabel("git status", "busy"), { label: "Running", meta: "git status" });
  assert.deepEqual(commandRowLabel("git status", "blocked"), { label: "Running", meta: "git status" });
  assert.deepEqual(commandRowLabel("git status", "done"), { label: "Ran", meta: "git status" });
  // Classic PN approval-current:4140–4160,17105–17255 uses failedVerb.
  assert.deepEqual(commandRowLabel("git status", "failed"), { label: "Failed to run", meta: "git status" });
});

test("an unsummarisable command folds the plain meta into the label", () => {
  assert.deepEqual(commandRowLabel("printf hi", "done"), { label: "Ran a command", meta: null });
  assert.deepEqual(commandRowLabel("printf hi", "busy"), { label: "Running a command", meta: null });
  assert.deepEqual(commandRowLabel("", "done"), { label: "Ran a command", meta: null });
});

test("a model description is the label in the row's tense (approval-current.js:4142-4160, ZD :3766)", () => {
  const description = "List files in current directory";
  assert.deepEqual(commandRowLabel("ls -la", "busy", description), { label: "Listing files in current directory", meta: null });
  assert.deepEqual(commandRowLabel("ls -la", "done", description), { label: "Listed files in current directory", meta: null });
  assert.deepEqual(commandRowLabel("ls -la", "failed", description), { label: "Failed to list files in current directory", meta: null });
  assert.equal(commandRowLabel("git status", "done", "Show working tree status").label, "Showed working tree status");
  assert.equal(commandRowLabel("npm i", "busy", "Install package dependencies").label, "Installing package dependencies");
  // No known leading verb: the description verbatim, and the plain verb on failure.
  assert.deepEqual(commandRowLabel("git status", "busy", "Git status check"), { label: "Git status check", meta: null });
  assert.deepEqual(commandRowLabel("git status", "done", "Git status check"), { label: "Git status check", meta: null });
  assert.deepEqual(commandRowLabel("git status", "failed", "Git status check"), { label: "Failed to run", meta: "Git status check" });
  // Awaiting approval, stopped and denied keep the verb with the description as meta (:16926-16936, :17159).
  assert.deepEqual(commandRowLabel("ls", "blocked", description), { label: "Running", meta: description });
  assert.deepEqual(commandRowLabel("ls", "stopped", description), { label: "Ran", meta: description });
  assert.deepEqual(commandRowLabel("ls", "denied", description), { label: "Ran", meta: description });
  // No (or a blank) description: the summary path is unchanged.
  for (const missing of [undefined, null, "", "  "]) assert.deepEqual(commandRowLabel("git status", "done", missing), { label: "Ran", meta: "git status" });
});

test("description tenses follow the source conjugation rules", () => {
  const cases = [
    ["Run tests and then fix lint", "Running tests and then fixing lint", "Ran tests and then fixed lint", "run tests and then fix lint"],
    ["Stop the dev server", "Stopping the dev server", "Stopped the dev server", "stop the dev server"],
    ["Copy config", "Copying config", "Copied config", "copy config"],
    ["Commit changes", "Committing changes", "Committed changes", "commit changes"],
    ["Re-run the build", "Re-running the build", "Re-ran the build", "re-run the build"],
    ["Build and output results", "Building and output results", "Built and output results", "build and output results"],
    ["Check status and test results are fine", "Checking status and test results are fine", "Checked status and test results are fine", "check status and test results are fine"],
  ];
  for (const [text, running, done, infinitive] of cases) assert.deepEqual(describeVerb(text), { running, done, infinitive }, text);
  for (const text of ["Git status check", "Running tests", "Listed files", "NPM install", "Tests pass", "", "   ", null]) assert.equal(describeVerb(text), null, String(text));
});

test("durations format as Ns / Nm Ns / Nh Nm Ns", () => {
  assert.equal(formatDuration(0), "0s");
  assert.equal(formatDuration(11), "11s");
  assert.equal(formatDuration(75), "1m 15s");
  assert.equal(formatDuration(3725), "1h 2m 5s");
});

test("the elapsed suffix appears only from ten seconds on", () => {
  const start = 1_000_000;
  assert.equal(elapsedSuffix(start, start + 9_999), null);
  assert.equal(elapsedSuffix(start, start + 10_000), "· 10s");
  assert.equal(elapsedSuffix(start, start + 11_400), "· 11s");
  assert.equal(elapsedSuffix(undefined, start), null);
  assert.equal(elapsedSuffix(start, start - 5_000), null);
});

test("a stopped row keeps its partial output and adds the interrupt sentence", () => {
  assert.deepEqual(commandOutput({ aggregatedOutput: "half" }, "stopped"), {
    text: `half\n${INTERRUPTED_OUTPUT}`,
    isError: true,
  });
  assert.deepEqual(commandOutput({ aggregatedOutput: "half\n" }, "stopped"), {
    text: `half\n${INTERRUPTED_OUTPUT}`,
    isError: true,
  });
  assert.deepEqual(commandOutput({}, "stopped"), { text: INTERRUPTED_OUTPUT, isError: true });
});

test("only a failed row colours its output as an error", () => {
  assert.deepEqual(commandOutput({ aggregatedOutput: "x" }, "failed"), { text: "x", isError: true });
  assert.deepEqual(commandOutput({ aggregatedOutput: "x" }, "done"), { text: "x", isError: false });
  assert.deepEqual(commandOutput({}, "busy"), { text: "", isError: false });
});

test("the copy payload is the prompt line, a blank line and the stripped output", () => {
  assert.equal(commandCopyText("ls", "\x1b[31ma\x1b[0m"), "$ ls\n\na");
  assert.equal(commandCopyText("ls", ""), "$ ls");
  assert.equal(commandCopyText("", "out"), "out");
  assert.equal(commandCopyText("", ""), "");
});

test("pending approvals are keyed by item id and only for command requests", () => {
  const ids = pendingCommandItemIds([
    { method: "item/commandExecution/requestApproval", params: { itemId: "a" } },
    { method: "item/fileChange/requestApproval", params: { itemId: "b" } },
    { method: "item/commandExecution/requestApproval", params: {} },
    { params: { itemId: "c" } },
  ]);
  assert.deepEqual([...ids], ["a"]);
  assert.deepEqual([...pendingCommandItemIds()], []);
});

test('transport loss is unknown and never appends a fabricated interruption to captured output',()=>{
 const item={status:'interrupted',aggregatedOutput:'still waiting\n',[connectionInterrupted]:true};
 assert.equal(commandRowState(item),'unknown');assert.deepEqual(commandOutput(item,'unknown'),{text:'still waiting\n',isError:false});
 assert.equal(commandRowState({status:'interrupted'}),'stopped');
});

test("DeepSeek stopped and denied calls read as Stopped and Denied, never failed", () => {
  // harness projection: an aborted call has no output body; a declined one neither.
  const stopped = { status: "interrupted", aggregatedOutput: null, exitCode: null };
  assert.equal(commandRowState(stopped), "stopped");
  assert.deepEqual(commandOutput(stopped, "stopped"), { text: INTERRUPTED_OUTPUT, isError: true });
  assert.equal(commandRowLabel("sleep 9", "stopped").label, "Ran");
  const denied = { status: "declined", aggregatedOutput: null, exitCode: null };
  assert.equal(commandRowState(denied), "denied");
  assert.deepEqual(commandOutput(denied, "denied"), { text: "", isError: false });
});
