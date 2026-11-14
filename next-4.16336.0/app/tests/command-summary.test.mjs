import test from "node:test";
import assert from "node:assert/strict";
import {
  summarizeCommand,
  shellShapeIsSummarisable,
  touchesSensitivePath,
  carriesCredentials,
} from "../src/command-summary.mjs";

// Official Soe (reference/current-2.2553.1/readable/approval-current.js:6213-6255).

test("takes at most four safe words from the first line", () => {
  assert.equal(summarizeCommand("git status"), "git status");
  assert.equal(summarizeCommand("git log --oneline"), "git log…");
  assert.equal(summarizeCommand("ls a b c d e"), "ls a b c…");
});

test("strips a leading cd chain before counting words", () => {
  // roe:6029 removes `cd <dir> &&` hops; the dropped `--silent` then adds the ellipsis.
  assert.equal(summarizeCommand("cd /tmp && npm test --silent"), "npm test…");
  assert.equal(summarizeCommand("cd '/a b' ; ls"), "ls");
});

test("a second non-blank line marks the summary as truncated", () => {
  assert.equal(summarizeCommand("git status\ngit diff"), "git status…");
  assert.equal(summarizeCommand("git status\n   \n"), "git status");
});

test("only allow-listed command names are summarised", () => {
  // coe:6035-6047 - printf is not in the table, so the row shows "a command".
  assert.equal(summarizeCommand("printf hello"), null);
  assert.equal(summarizeCommand("git status | grep foo"), "git status…");
  assert.equal(summarizeCommand("git status | printf x"), null);
  // `nice` is a wrapper prefix and `FOO=1` an assignment, so the shape passes,
  // but `=` is outside the summarisable word class and stops the word loop.
  assert.equal(shellShapeIsSummarisable("FOO=1 nice git status"), true);
  assert.equal(summarizeCommand("FOO=1 nice git status"), null);
});

test("substitutions and subshells are never summarised", () => {
  assert.equal(shellShapeIsSummarisable("git log $(date)"), false);
  assert.equal(shellShapeIsSummarisable("git log `date`"), false);
  assert.equal(shellShapeIsSummarisable("(git status)"), false);
});

test("unsafe words stop the summary where they appear", () => {
  assert.equal(summarizeCommand("git clone https://example.com/x"), "git clone…");
  assert.equal(summarizeCommand("curl example.com/x"), null); // curl is not allow-listed
  assert.equal(summarizeCommand("cat a%2Fb"), "cat…");
  assert.equal(summarizeCommand("cat token.txt"), "cat…");
  assert.equal(summarizeCommand("cat api-key"), "cat…");
  assert.equal(summarizeCommand("cat abcdefghij0123456789xyz"), "cat…");
});

test("a leading dash never becomes a word", () => {
  assert.equal(summarizeCommand("ls -la"), "ls…");
});

test("control characters and empty input produce no summary", () => {
  assert.equal(summarizeCommand(""), null);
  assert.equal(summarizeCommand("   \n  "), null);
  assert.equal(summarizeCommand("git\u0007 status"), null);
  assert.equal(summarizeCommand("git\u202estatus"), null);
  assert.equal(summarizeCommand(undefined), null);
});

test("tabs fold to spaces inside the first line", () => {
  assert.equal(summarizeCommand("git\tstatus"), "git status");
});

test("a command longer than 8192 characters is truncated", () => {
  const long = `git status ${"a".repeat(9000)}`;
  assert.equal(summarizeCommand(long), "git status…");
});

test("credential-looking command lines fall back to the plain meta", () => {
  assert.equal(carriesCredentials("git clone https://user:pw@example.com/x"), true);
  assert.equal(carriesCredentials("git push --password=hunter2"), true);
  assert.equal(carriesCredentials("git status"), false);
  assert.equal(summarizeCommand("git clone https://user:pw@example.com/x"), null);
});

test("sensitive project paths fall back to the plain meta", () => {
  assert.equal(touchesSensitivePath("cat ~/.claude/projects/x/y"), true);
  assert.equal(touchesSensitivePath("cat ~/.claude/agent-memory"), true);
  assert.equal(touchesSensitivePath("cat notes.txt"), false);
  assert.equal(summarizeCommand("cat ~/.claude/agent-memory"), null);
});
