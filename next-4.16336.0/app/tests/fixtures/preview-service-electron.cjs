// Run by tests/preview-service-electron.test.mjs inside Electron (hidden windows only, no Dock icon): the real
// preview-service.cjs with a dev server from .claude/launch.json, and the preview tools through the real
// agent-tools-host.cjs + agent-tools-server.mjs MCP stdio path. Prints one JSON line {ok, results|error}.
const { app, BrowserWindow, WebContentsView, session, shell, nativeTheme } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");

const root = fs.mkdtempSync(path.join(process.env.PREVIEW_TEST_TMP || os.tmpdir(), "preview-electron-"));
app.setPath("userData", path.join(root, "user-data"));
app.dock?.hide();
// The service closes its hidden windows in dispose() while dev servers are still being stopped: the fixture keeps
// running until it reports, as the app does (main.cjs window-all-closed does nothing).
app.on("window-all-closed", () => {});
const work = path.join(root, "work");
fs.mkdirSync(path.join(work, ".claude"), { recursive: true });
fs.writeFileSync(path.join(work, "server.js"), `
const http = require("node:http");
const port = Number(process.env.PORT);
http.createServer((req, res) => {
  if (req.url === "/missing.json") { res.writeHead(404); res.end("no"); return; }
  if (req.url === "/confirm") { res.writeHead(200, { "content-type": "text/html" }); res.end('<!doctype html><title>Confirm</title><button onclick="document.title = confirm(\\'Delete it?\\') ? \\'yes\\' : \\'no\\'">Delete</button>'); return; }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(\`<!doctype html><title>Fixture app</title><main><h1>Fixture app</h1>
<form onsubmit="event.preventDefault(); document.getElementById('out').textContent = 'Hello ' + document.getElementById('name').value">
<label for=name>Name</label><input id=name><button type=submit>Greet</button></form>
<p id=out>Nobody yet</p><a href="/about">About</a></main>
<script>console.log("fixture ready"); console.error("fixture error line"); fetch("/missing.json");</script>\`);
}).listen(port, "127.0.0.1", () => console.log("listening on " + port));
`);
const freePort = () => new Promise((resolve) => { const s = require("node:net").createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

async function main() {
  await app.whenReady();
  const port = await freePort();
  // A dev server that ignores SIGTERM: quitting must still end it (preview-service.cjs dispose: TERM, a moment, KILL).
  const stubbornPort = await freePort();
  fs.writeFileSync(path.join(work, "stubborn.js"), `process.on("SIGTERM", () => console.log("ignoring TERM")); require("node:http").createServer((q, r) => r.end("ok")).listen(Number(process.env.PORT), "127.0.0.1", () => console.log("stubborn up"));`);
  fs.writeFileSync(path.join(work, ".claude/launch.json"), JSON.stringify({ version: "0.0.1", configurations: [{ name: "web", runtimeExecutable: process.env.PREVIEW_TEST_NODE || "node", runtimeArgs: ["server.js"], port },
    { name: "stubborn", runtimeExecutable: process.env.PREVIEW_TEST_NODE || "node", runtimeArgs: ["stubborn.js"], port: stubbornPort }] }, null, 2));
  const { createPreviewService } = require("../../electron/preview-service.cjs");
  const { createAgentToolsHost } = require("../../electron/agent-tools-host.cjs");
  const sessions = { "thread-1": { id: "thread-1", cwd: work } };
  const approvals = [];
  const service = createPreviewService({ electron: { WebContentsView, BrowserWindow, session, shell, nativeTheme }, getSession: (id) => sessions[id] ?? null,
    spawnEnv: async () => ({ ...process.env, ELECTRON_RUN_AS_NODE: undefined }), logger: { warn() {} } });
  const host = createAgentToolsHost({ toolsDir: path.join(__dirname, "../../electron/agent-tools"), tmpRoot: root, command: process.env.PREVIEW_TEST_NODE || "node", runAsNode: false,
    resolveSession: (id, meta) => sessions[id ?? meta.threadId] ?? null, requestApproval: async (s, request) => { approvals.push(request); return false; }, logger: { warn() {}, log() {} } });
  // The user approves the project's own launch.json server (preview-service.cjs approveServer asks once per configuration) and declines every outside site.
  host.provide("preview", (s) => service.forSession(s, { requestApproval: async (request) => { approvals.push(request); return request.kind === "preview-server"; } }));
  await host.start();
  const results = {};

  // The MCP server over stdio, as a core would run it.
  const child = spawn(process.env.PREVIEW_TEST_NODE || "node", [path.join(__dirname, "../../electron/agent-tools-server.mjs")], { env: { PATH: process.env.PATH, ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: "thread-1" }, stdio: ["pipe", "pipe", "inherit"] });
  const pending = new Map();
  let seq = 0;
  readline.createInterface({ input: child.stdout }).on("line", (line) => { const m = JSON.parse(line); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const rpc = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
  const tool = async (name, args = {}) => { const reply = await rpc("tools/call", { name, arguments: args }); return reply.result; };
  const text = (result) => result.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");

  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  results.tools = (await rpc("tools/list", {})).result.tools.map((t) => t.name);
  results.listBefore = text(await tool("preview_list"));
  const started = await tool("preview_start", { name: "web" });
  results.start = { isError: !!started.isError, text: text(started) };
  results.state = service.snapshot("thread-1");
  results.readPage = text(await tool("read_page", { filter: "interactive" }));
  results.pageText = text(await tool("get_page_text"));
  const ref = /textbox "Name"[^\n]*\[(ref_\d+)\]/.exec(results.readPage)?.[1];
  results.type = text(await tool("type", { ref, text: "Ada" }));
  const button = /button "Greet"[^\n]*\[(ref_\d+)\]/.exec(results.readPage)?.[1];
  results.click = text(await tool("click", { ref: button }));
  await new Promise((r) => setTimeout(r, 200));
  results.afterClick = text(await tool("get_page_text"));
  results.press = text(await tool("type", { selector: "#name", text: "Bob", clear: true, submit: true }));
  await new Promise((r) => setTimeout(r, 200));
  results.afterSubmit = text(await tool("get_page_text"));
  const shot = await tool("screenshot");
  results.screenshot = shot.content.map((part) => ({ type: part.type, mimeType: part.mimeType, bytes: part.data ? Buffer.from(part.data, "base64").length : 0 }));
  results.console = text(await tool("read_console_messages", { level: "all" }));
  results.networkFailed = text(await tool("read_network_requests", { filter: "failed" }));
  results.resize = text(await tool("resize_window", { preset: "mobile", colorScheme: "dark" }));
  results.mobileWidth = await service._previews.get("thread-1").view.webContents.executeJavaScript("matchMedia('(prefers-color-scheme: dark)').matches + ' ' + (navigator.userAgent.includes('Android'))");
  results.resizeBack = text(await tool("resize_window", { preset: "desktop", colorScheme: "system" }));
  results.logs = text(await tool("preview_logs", { name: "web" }));
  results.outside = await tool("navigate", { url: "https://example.com/" });
  results.approvals = approvals;
  results.fileOutside = await tool("navigate", { url: "file:///etc/hosts" });
  results.navigateAbout = text(await tool("navigate", { url: `http://localhost:${port}/about` }));
  // A confirm() the preview never shows: the click result and the console say what happened.
  await tool("navigate", { url: `http://localhost:${port}/confirm` });
  const confirmRef = /button "Delete"[^\n]*\[(ref_\d+)\]/.exec(text(await tool("read_page", { filter: "interactive" })))?.[1];
  results.dialogClick = text(await tool("click", { ref: confirmRef }));
  results.dialogTitle = text(await tool("get_page_text"));
  results.dialogConsole = text(await tool("read_console_messages", { level: "all" }));
  results.list = text(await tool("preview_list"));
  results.stop = text(await tool("preview_stop", { name: "web" }));
  results.stateAfterStop = service.snapshot("thread-1").servers;
  results.approvals = [...approvals];
  results.stubbornStart = text(await tool("preview_start", { name: "stubborn" }));
  child.stdin.end();
  host.stop();
  const disposeStarted = Date.now();
  await service.dispose();
  results.disposeMs = Date.now() - disposeStarted;
  // SIGKILL is sent when dispose resolves; the process is gone a moment later.
  const probe = () => new Promise((resolve) => { const socket = require("node:net").connect(stubbornPort, "127.0.0.1"); socket.once("connect", () => { socket.destroy(); resolve("listening"); }); socket.once("error", () => resolve("closed")); });
  for (let i = 0; i < 20 && (results.stubbornAfterQuit = await probe()) === "listening"; i++) await new Promise((r) => setTimeout(r, 50));
  return results;
}
main().then((results) => { process.stdout.write(JSON.stringify({ ok: true, results }) + "\n"); }, (error) => { process.stdout.write(JSON.stringify({ ok: false, error: String(error?.stack || error) }) + "\n"); })
  .finally(() => { try { fs.rmSync(root, { recursive: true, force: true }); } catch {} app.exit(0); });
