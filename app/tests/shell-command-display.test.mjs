// Codex reports commands as the shlex-joined `<shell> -lc '<script>'` argv; the transcript row, the approval card
// and the background-task list show the script, as Codex's own TUI does (exec_command.rs strip_bash_lc_and_escape).
import test from "node:test";
import assert from "node:assert/strict";
import { displayCommand, shellScript, splitShellWords } from "../src/shell-command-model.mjs";
import { commandRowLabel } from "../src/command-row-model.mjs";
import { approvalCardModel } from "../src/approval-card-model.mjs";
import { signedOutAccountLabel } from "../src/account-label-model.mjs";
import { createSideChatStore } from "../src/side-chat-store.mjs";

test("displayCommand strips a login-shell wrapper and keeps the raw string", () => {
  assert.deepEqual(displayCommand("/bin/zsh -lc 'touch made-by-codex.txt'"), { text: "touch made-by-codex.txt", raw: "/bin/zsh -lc 'touch made-by-codex.txt'" });
  assert.equal(displayCommand("bash -c \"echo \\\"hi\\\" && ls\"").text, "echo \"hi\" && ls");
  assert.equal(displayCommand("/bin/bash -lc 'echo '\"'\"'quoted'\"'\"''").text, "echo 'quoted'");
  assert.equal(displayCommand("sh -c 'cd src && rg foo'").text, "cd src && rg foo");
  assert.equal(displayCommand("pwsh -NoProfile -Command 'Get-ChildItem'").text, "Get-ChildItem");
  assert.equal(displayCommand(["/bin/zsh", "-lc", "git status"]).text, "git status");
});

test("displayCommand leaves anything that is not exactly a wrapper alone", () => {
  for (const command of ["ls -la", "zsh -lc", "sh -x -c foo", "bash -lc 'a' extra", "bash -lc 'unterminated", "fish -c 'ls'", "bash -lc ''"])
    assert.deepEqual(displayCommand(command), { text: command, raw: null }, command);
  assert.deepEqual(displayCommand(undefined), { text: "", raw: null });
  assert.equal(shellScript(["bash", "-lc"]), null);
  assert.deepEqual(splitShellWords("a 'b c' \"d\\$e\" f\\ g"), ["a", "b c", "d$e", "f g"]);
  assert.equal(splitShellWords("'open"), null);
});

test("the row label summarises the script, not the wrapper", () => {
  const wrapped = commandRowLabel("/bin/zsh -lc 'git status'", "done");
  assert.deepEqual(wrapped, commandRowLabel("git status", "done"));
});

test("a Codex command approval shows the same command its Always allow button names", () => {
  const request = { method: "item/commandExecution/requestApproval", params: { itemId: "i1", command: "/bin/zsh -lc 'touch made-by-codex.txt'",
    availableDecisions: ["accept", { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["touch", "made-by-codex.txt"] } }, "cancel"] } };
  const model = approvalCardModel(request, { id: "i1", type: "commandExecution", command: request.params.command });
  assert.equal(model.detail.text, "touch made-by-codex.txt");
  assert.equal(model.detail.raw, "/bin/zsh -lc 'touch made-by-codex.txt'");
  assert.equal(model.detail.value, request.params.command);
  // With a description heading (DeepSeek bash tool) the box is unwrapped too.
  const described = approvalCardModel(request, { id: "i1", type: "commandExecution", description: "Create a file", command: request.params.command });
  assert.equal(described.detail.text, "touch made-by-codex.txt");
  // A plain command keeps its detail exactly.
  const plain = approvalCardModel({ ...request, params: { ...request.params, command: "npm test" } });
  assert.deepEqual(plain.detail, { kind: "command", text: "npm test", value: "npm test" });
});

test("/status names the account state per core instead of 'Custom endpoint' everywhere", () => {
  // Codex on a relay: no account, no ChatGPT sign-in required.
  assert.equal(signedOutAccountLabel({ account: null, requiresOpenaiAuth: false }, { engine: "codex" }), "Custom endpoint");
  // DeepSeek with no key yet: where to add one.
  const deepseek = signedOutAccountLabel({ account: null, requiresOpenaiAuth: false, deepseek: { apiKey: { configured: false, source: null }, platform: "signed-out" } }, { engine: "deepseek" });
  assert.match(deepseek, /No API key/);
  // OpenCode Zen / MiMo Auto free tier.
  assert.equal(signedOutAccountLabel({ account: null, requiresOpenaiAuth: false, opencode: { freeTier: { provider: "opencode", name: "OpenCode Zen" } } }, "opencode"), "OpenCode Zen (free)");
  assert.equal(signedOutAccountLabel({ account: null, requiresOpenaiAuth: false, mimo: { freeTier: { provider: "mimo", name: "MiMo Auto" } } }, "mimo"), "MiMo Auto (free)");
  // A signed-out bridge on its paid providers.
  assert.equal(signedOutAccountLabel({ account: null, requiresOpenaiAuth: true, opencode: { freeTier: null } }, "opencode"), "Not signed in");
  assert.equal(signedOutAccountLabel(null, "codex"), "Unavailable");
});

test("a side question that fails keeps its text for Retry", () => {
  const store = createSideChatStore();
  store.ask("t", "what file did you read?", "r1");
  store.finish("t", "r1", { error: "rate limited" });
  assert.deepEqual(store.get("t").messages, [{ role: "user", text: "what file did you read?" }]);
  assert.equal(store.get("t").retry, "what file did you read?");
  // An empty answer without an error also keeps the question.
  store.ask("t", "again?", "r2");
  store.finish("t", "r2", {});
  assert.deepEqual(store.get("t").messages.map(message => message.text), ["again?"]);
  assert.equal(store.get("t").retry, "again?");
});

test("a workspace program named sh/bash/zsh is never unwrapped", () => {
  for (const command of ["./sh -c 'npm test'", "node_modules/.bin/bash -lc 'rm -rf x'", "scripts/zsh -c 'ls'", ".\\pwsh.exe -Command 'dir'"])
    assert.deepEqual(displayCommand(command), { text: command, raw: null }, command);
  assert.equal(shellScript(["./bash", "-lc", "echo hi"]), null);
  // Absolute paths and bare names still unwrap (Codex's own wrapper, the bridges).
  assert.equal(displayCommand("/usr/local/bin/bash -c 'ls'").text, "ls");
  assert.equal(displayCommand(["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command", "dir"]).text, "dir");
});

test("OpenClaude Desktop's terminal, dev server and Monitor cards show the command exactly as it runs", () => {
  const card = (agentTool, command) => approvalCardModel({ method: "item/commandExecution/requestApproval", params: { threadId: "t", cwd: "/w", command, codeDesktop: { agentTool } } }, null);
  for (const kind of ["terminal-command", "preview-server", "monitor"]) {
    for (const command of ["/bin/sh -c 'npm test'", "bash -lc 'npm run dev'", "./sh -c 'npm test'"]) {
      const detail = card({ kind, name: "web" }, command).detail;
      assert.equal(detail.text, command, `${kind}: ${command}`);
      assert.equal(detail.raw, undefined);
    }
  }
});

test("Codex's Always allow prefix drops the -lc wrapper and is not offered for a multi-line script", async () => {
  const { offeredDecisions } = await import("../src/approval-card-model.mjs");
  const wrapped = offeredDecisions(["accept", { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["/bin/zsh", "-lc", "echo hi > manual-cmd.txt"] } }, "cancel"]);
  assert.equal(wrapped.persistent.length, 1);
  assert.match(wrapped.persistent[0].label, /“echo hi > manual-cmd\.txt”/);
  assert.doesNotMatch(wrapped.persistent[0].label, /zsh/);
  assert.match(wrapped.persistent[0].title, /\/bin\/zsh -lc echo hi/);
  assert.equal(wrapped.persistent[0].prefix, "echo hi > manual-cmd.txt");
  const multiline = offeredDecisions(["accept", { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["/bin/zsh", "-lc", "cd x\nnpm test"] } }, "cancel"]);
  assert.deepEqual(multiline.persistent, []);
  assert.match(offeredDecisions([{ acceptWithExecpolicyAmendment: { execpolicy_amendment: ["npm", "test"] } }]).persistent[0].label, /“npm test”/);
});
