// '!' shell mode on a core without its own: the built-in terminal runs the command and its output goes to the model.
import test from "node:test";
import assert from "node:assert/strict";
import { shellModeActive, shellModeCommand, shellModeKind, shellOutputMessage } from "../src/shell-mode-model.mjs";

test("shell mode: Codex runs it itself; other cores through the terminal, only where there is one", () => {
  assert.equal(shellModeKind({ engine: "codex" }), "core");
  assert.equal(shellModeKind({ engine: "deepseek" }), null);
  assert.equal(shellModeKind({ engine: "deepseek" }, { terminal: true }), "terminal");
  assert.equal(shellModeCommand("!git status", { engine: "deepseek" }), null);
  assert.equal(shellModeCommand("  !git status ", { engine: "deepseek" }, { terminal: true }), "git status");
  assert.equal(shellModeActive("!", { engine: "kimi" }, { terminal: true }), true);
  assert.equal(shellModeActive("!", { engine: "kimi" }), false);
});

test("the message a terminal run sends names the command, its output and exit code", () => {
  assert.equal(shellOutputMessage("ls", { output: "a\nb\n", exitCode: 0 }), "I ran this shell command in the terminal:\n```console\n$ ls\na\nb\n```\nExit code: 0");
  assert.match(shellOutputMessage("cat x", { output: "```", exitCode: null, signal: "SIGINT" }), /^I ran[^\n]*\n````console\n\$ cat x\n```\n````\nEnded by SIGINT$/);
});
