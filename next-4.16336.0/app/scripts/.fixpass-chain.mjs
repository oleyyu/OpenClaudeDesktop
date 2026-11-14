import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(root, "../analysis/protocol-0155-20260921/fixpass-20260921");
await fs.mkdir(out, { recursive: true });
const BLOCKED = new Set(["pane-layout-ui-test","highlight-coalescing-ui-test","scrollbar-mode-ui-test","transcript-fade-ui-test","ui029-ui-test"]);
const standard = ['protocol-0155-ui-test','settings-ui-test','skills-mcp-ui-test','settings-rest-ui-test','session-actions-ui-test','code-ui-test','permission-ui-test','menus-states-ui-test','tooltip-ui-test','sidebar-ui-test','sidebar-rest-ui-test','session-ui-test','approval-transport-ui-test','approval-card-ui-test','titlebar-ui-test','pane-ui-test','pane-layout-ui-test','file-search-ui-test','diff-ui-test','code-fence-ui-test','highlight-ui-test','highlight-coalescing-ui-test','stream-highlight-ui-test','turn-footer-ui-test','user-actions-ui-test','composer-states-ui-test','home-page-ui-test','user-markdown-ui-test','rich-copy-ui-test','transcript-scroll-ui-test','scrollbar-mode-ui-test','transcript-fade-ui-test','ui029-ui-test','integration-race-test','git-ui-test','git-rail-ui-test','connection-lifecycle-test','shutdown-ui-test','file-search-shutdown-test'];
const list = standard.filter(n => !BLOCKED.has(n));
const rows = [];
for (const name of list) {
  const startedAt = new Date().toISOString();
  let output = "";
  const child = spawn(process.execPath, [`scripts/${name}.mjs`], { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", d => output += d);
  child.stderr.on("data", d => output += d);
  const code = await new Promise((res, rej) => { child.once("error", rej); child.once("exit", res); });
  await fs.writeFile(path.join(out, `${name}.log`), output);
  const finishedAt = new Date().toISOString();
  rows.push({ name, exitCode: code, passed: code === 0, startedAt, finishedAt });
  await fs.writeFile(path.join(out, "chain.json"), JSON.stringify({ serial: true, oneAtATime: true, blocked: [...BLOCKED], rows }, null, 2));
  console.log(`${code === 0 ? "PASS" : "FAIL"} ${name} ${startedAt} -> ${finishedAt}`);
}
console.log(JSON.stringify({ total: rows.length, failed: rows.filter(r => !r.passed).map(r => r.name) }));
