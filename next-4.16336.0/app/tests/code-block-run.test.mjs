import test from "node:test";
import assert from "node:assert/strict";
import {
  codeBlockRun, codeBlockRunId, createInlineOutput, diffSegments, feedInlineOutput, followsOutput, hasHiddenCharacters,
  inlineCommandDone, inlineOutputText, isPlainTextCommand, isRunLanguage, keptRunVisible, outputDiffMode, pickRunTab,
  promptAfterInput, runOpensPane,
} from "../src/code-block-run-model.mjs";
import fs from "node:fs";
import path from "node:path";

// B20 / P8: the pure half of a code block's "Run in terminal" (c19e90103 Bg/Lg/Pg, c7146e7f4, c26fb8b6b qn/Xn,
// ca41b3815 inline run, c03935b01 It/Vt).

test("bs/Ss: shell fences run; a text fence runs a leading-! line or one well-known command", () => {
  for (const lang of ["bash", "sh", "shell", "shellscript", "zsh", " Bash "]) assert.equal(isRunLanguage(lang), true, lang);
  for (const lang of ["console", "js", "text", "powershell"]) assert.equal(isRunLanguage(lang), false, lang);
  assert.equal(isRunLanguage("pwsh", true), true);
  assert.equal(isPlainTextCommand("npm install"), true);
  assert.equal(isPlainTextCommand("sudo FOO=1 git status"), true);
  assert.equal(isPlainTextCommand("FOO=1 sudo git status"), false, "sudo comes first or not at all");
  assert.equal(isPlainTextCommand("./build.sh"), true);
  assert.equal(isPlainTextCommand("make all"), false);
  assert.equal(isPlainTextCommand("git log | head"), false);
  assert.deepEqual(codeBlockRun("ls -la\n", "bash"), { command: "ls -la", shellish: true, runnable: true });
  assert.deepEqual(codeBlockRun("!  echo hi", "text"), { command: "echo hi", shellish: true, runnable: true });
  assert.deepEqual(codeBlockRun("git status", "text"), { command: "git status", shellish: true, runnable: true });
  assert.equal(codeBlockRun("hello world", "text").shellish, false);
  assert.equal(codeBlockRun("ls", "js").runnable, false);
  assert.equal(codeBlockRun("ls", "bash", { masked: true }).runnable, false, "masked secrets never run");
  assert.equal(codeBlockRun("ls", "bash", { masked: true }).shellish, true, "but the block keeps its run id");
});

test("qn/Xn: line breaks, tabs, control, invisible, odd-space and RTL-spoofing characters refuse Run; emoji don't", () => {
  assert.equal(codeBlockRun("cd app\nnpm test", "bash").runnable, false, "one-line commands only");
  for (const command of ["echo\ta", "rm -rf ‮/", "echo a​b", "ls -la", "echo א1", "echo \u0007", "echo שלום עולם"])
    assert.equal(hasHiddenCharacters(command), true, JSON.stringify(command));
  for (const command of ["echo 🎉 done", "git commit -m 'ok 👍🏽'", "ls -la", "echo שלום"])
    assert.equal(hasHiddenCharacters(command), false, command);
});

test("Zm: one run id per session, message and command", () => {
  assert.equal(codeBlockRunId("s1", "ls", "m1"), "block:s1:m1:ls");
  assert.equal(codeBlockRunId("s1", "ls", null), "block:s1::ls");
});

test("It/Vt: the active idle tab with a clean prompt, then the first, else a new one; plain runs open the pane", () => {
  const tabs = [{ id: "a", status: "running" }, { id: "b", status: "running" }, { id: "c", status: "running" }];
  const probe = { live: ["a", "b", "c"], busy: [], unknown: [] };
  assert.equal(pickRunTab({ tabs, activeId: "c", probe }), "c");
  assert.equal(pickRunTab({ tabs, activeId: "c", probe: { ...probe, busy: ["c"] } }), "a");
  assert.equal(pickRunTab({ tabs, activeId: "c", probe: { ...probe, busy: ["c"], unknown: ["a"] } }), "b");
  assert.equal(pickRunTab({ tabs, activeId: "c", probe, dirty: (id) => id !== "b" }), "b");
  assert.equal(pickRunTab({ tabs, activeId: "a", probe: { live: [], busy: [], unknown: [] } }), null);
  assert.equal(pickRunTab({ tabs, activeId: "a", probe: null }), null, "nothing known idle without a probe");
  assert.equal(runOpensPane({ captured: false, paneOpen: false }), true);
  assert.equal(runOpensPane({ captured: true, paneOpen: false }), false);
  assert.equal(runOpensPane({ captured: true, paneOpen: true }), true);
});

test("noteUserInput: Enter or ^C leaves the prompt clean, typing leaves it dirty, cursor keys change nothing", () => {
  assert.equal(promptAfterInput(undefined, "gi"), "dirty");
  assert.equal(promptAfterInput("dirty", "\x1b[D"), "dirty");
  assert.equal(promptAfterInput("clean", "\x1b[C"), "clean");
  assert.equal(promptAfterInput("clean", "\x1b[A"), "dirty", "history recall puts a line at the prompt");
  assert.equal(promptAfterInput("dirty", "t status\r"), "clean");
  assert.equal(promptAfterInput("dirty", "\x03"), "clean");
  assert.equal(promptAfterInput("clean", "echo a \\\r"), "dirty", "a continued line is not run");
});

test("an integrated shell: the output is what lies between OSC 133 C and D, with its exit code", () => {
  const state = createInlineOutput("typed");
  feedInlineOutput(state, "\x1b]133;B;dn=x\x07ls\r\n\x1b]133;C;nonce=n\x07a.txt\r\n\x1b[31mb");
  feedInlineOutput(state, ".txt\x1b[0m\r\n\x1b]133;D;2;no"); // split OSC
  feedInlineOutput(state, "nce=n\x07\x1b]133;A;nonce=n\x07user@host % ");
  assert.equal(state.started, true);
  assert.equal(state.finished, true);
  assert.equal(state.exitCode, 2);
  assert.equal(inlineOutputText(state, "ls"), "a.txt\n\x1b[31mb.txt\x1b[0m");
});

test("a shell without the integration: the echoed command and the next prompt are dropped", () => {
  const state = createInlineOutput("typed");
  feedInlineOutput(state, "user@host app % git status\r\nOn branch main\r\nnothing to commit\r\nuser@host app % ");
  assert.equal(state.started, false);
  assert.equal(inlineOutputText(state, "git status"), "On branch main\nnothing to commit");
  const rprompt = createInlineOutput("typed");
  feedInlineOutput(rprompt, "$ echo hi       [main]\r\nhi\r\n$ ");
  assert.equal(inlineOutputText(rprompt, "echo hi"), "hi");
});

test("carriage returns, erase-line and cursor-up redraw progress in place; alt screen output is left out", () => {
  const state = createInlineOutput("dedicated");
  feedInlineOutput(state, "10%\r20%\r\x1b[K100%\r\nline1\r\nline2\x1b[1A\r\x1b[2Kmid\r\n");
  assert.equal(inlineOutputText(state), "100%\nmid\nline2");
  feedInlineOutput(state, "\x1b[?1049hFULLSCREEN");
  assert.equal(state.alt, true);
  assert.equal(inlineOutputText(state), "100%\nmid\nline2");
  feedInlineOutput(state, "\x1b[?1049lafter\r\n");
  assert.equal(inlineOutputText(state).endsWith("after"), true);
  feedInlineOutput(state, "\x1b[2J\x1b[Hfresh");
  assert.equal(state.cleared, true);
  assert.equal(inlineOutputText(state), "fresh");
});

test("c7146e7f4 O/k: git diff output colours its hunks' added and removed lines", () => {
  assert.equal(outputDiffMode("git diff --word-diff"), "words");
  assert.equal(outputDiffMode("git diff"), "lines");
  assert.equal(outputDiffMode(""), "either");
  const diff = "diff --git a/x b/x\n@@ -1,2 +1,2 @@\n-old\n+new\n same\n";
  const segments = diffSegments(diff, "lines");
  assert.deepEqual(segments.filter((segment) => segment.kind).map((segment) => [segment.kind, segment.text]), [["removed", "-old\n"], ["added", "+new\n"]]);
  assert.equal(segments.map((segment) => segment.text).join(""), diff);
  assert.equal(diffSegments("no hunks here", "lines"), null);
  const words = diffSegments("@@ -1 +1 @@\nthe [-old-]{+new+} word\n", "words");
  assert.deepEqual(words.filter((segment) => segment.kind).map((segment) => segment.text), ["[-old-]", "{+new+}"]);
});

test("c7146e7f4 b: the box follows output within 24px of its end, and within 4px once scrolled up", () => {
  assert.equal(followsOutput({ following: true, scrollTop: 100, lastTop: 100, scrollHeight: 300, clientHeight: 180 }), true);
  assert.equal(followsOutput({ following: true, scrollTop: 50, lastTop: 100, scrollHeight: 300, clientHeight: 180 }), false);
  assert.equal(followsOutput({ following: true, scrollTop: 118, lastTop: 119, scrollHeight: 300, clientHeight: 180 }), true);
  assert.equal(followsOutput({ following: false, scrollTop: 95, lastTop: 100, scrollHeight: 300, clientHeight: 180 }), false);
});

test('noteUserInput (B20 review): xterm replies to the shell (zn) leave the prompt as it was', async () => {
  const { promptAfterInput, isTerminalReply } = await import('../src/code-block-run-model.mjs');
  for (const reply of ['\x1b[?1;2c', '\x1b[>0;276;0c', '\x1b[12;5R', '\x1b[I', '\x1b[O', '\x1b]11;rgb:1a1a/1a1a/1919\x1b\\', '\x1bP1$r0m\x1b\\'])
    assert.equal(isTerminalReply(reply), true, JSON.stringify(reply));
  assert.equal(promptAfterInput('clean', '\x1b[?1;2c'), 'clean');
  assert.equal(promptAfterInput('dirty', '\x1b[I'), 'dirty');
  assert.equal(promptAfterInput('clean', 'ls'), 'dirty');
});

// TT-10 / FT-13 (toolcards-04 / terminal-15): 2.42304.0 c19e90103-muBq-gyt.js Ng (≡ 2.37337.1 sy) and Bg (≡ py).
const OFFICIAL = path.resolve(import.meta.dirname, "../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c19e90103-muBq-gyt.js");

test("the official source: commandDone is endedBy === \"idle\" only; the kept box is (!tracked || commandDone) && showsRun", () => {
  const source = fs.readFileSync(OFFICIAL, "utf8");
  assert.match(source, /t\.inlineRun\?\.id===e&&t\.inlineRun\.endedBy==="idle"\);return\{tracked:n,/);
  assert.match(source, /commandDone:l\}/);
  assert.match(source, /me=\(!se\|\|fe\)&&ae\?ie:void 0/);
  assert.match(source, /defaultMessage:"\(no output\)",id:"pndT4iky5F"\}\),altScreen:!1,error:me\.error\|\|null,onOpenInTerminal:se\?De:null/);
});

test("Ng commandDone: only a run that ended at an idle prompt", () => {
  assert.equal(inlineCommandDone({ endedBy: "idle" }), true);
  for (const endedBy of ["exit", "silence", "cancel", "shell-exit", "error", "superseded", null, undefined])
    assert.equal(inlineCommandDone({ endedBy }), false, String(endedBy));
  assert.equal(inlineCommandDone(null), false);
});

test("Bg me: the kept record shows untracked, or tracked once done at the prompt; never before the block shows runs", () => {
  assert.equal(keptRunVisible({ tracked: true, commandDone: true, showsRun: true }), true, "tracked + idle");
  assert.equal(keptRunVisible({ tracked: true, commandDone: inlineCommandDone({ endedBy: "exit" }), showsRun: true }), false, "tracked + exit");
  assert.equal(keptRunVisible({ tracked: true, commandDone: inlineCommandDone({ endedBy: null }), showsRun: true }), false, "tracked + running");
  assert.equal(keptRunVisible({ tracked: false, commandDone: false, showsRun: true }), true, "not tracked, with a record");
  assert.equal(keptRunVisible({ tracked: false, commandDone: false, showsRun: false }), false, "a growing fence that has not shown runs");
  assert.equal(keptRunVisible({ tracked: true, commandDone: true, showsRun: false }), false);
  assert.equal(keptRunVisible(), false);
});

test("source-code-block.jsx: useBlockRun exposes commandDone, kept uses keptRunVisible, the kept box opens the terminal while tracked", () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, "../src/source-code-block.jsx"), "utf8");
  assert.match(source, /commandDone: inlineCommandDone\(mine\),/);
  assert.match(source, /const kept = keptRunVisible\(\{ tracked: live\.tracked, commandDone: live\.commandDone, showsRun \}\) \? live\.record : undefined;/);
  const keptBox = source.slice(source.indexOf(': kept === undefined ? null'));
  assert.match(keptBox, /output=\{kept\.output \|\| t\("\(no output\)"\)\}/);
  assert.match(keptBox, /onOpenInTerminal=\{live\.tracked && actions \? \(\) => actions\.openInTerminal\(runId\) : null\}/);
  assert.doesNotMatch(source, /onOpenInTerminal=\{null\}/);
});
