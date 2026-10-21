// Chrome bridge acceptance, phase by phase:
//   npm run check:chrome-bridge            every phase
//   npm run check:chrome-bridge -- p2      one phase (p0, p1, p2)
// Runs in Electron's main process (no window, Dock icon hidden) with the same bridge-client.cjs the app uses. It starts
// a headless Chrome for Testing (Playwright's, or CHROME_PATH) on a throwaway profile with claude-ext/ loaded, registers
// the native host in that profile only (<profile>/NativeMessagingHosts, launcher run by this Electron as node), and
// points the host at a socket folder of its own — the user's Chrome and its settings are never touched.
//
// P0 the channel: the host's socket appears · get_status reports the extension's hello with the fixed ID · ping returns
//    pong · an unknown tool is {error: unknown_tool} · the host log shows both directions.
// P1 navigate / read_page / find: live https://example.com loads with its title · a local copy of the classic
//    example.com page (served here: the live one no longer has its heading or "More information..." link) reads as a
//    tree with the heading and a ref on the link only · find "More information" returns that link's ref · ref rules on
//    a local form page: exactly the interactive elements get refs · a ref from an earlier read_page is stale_ref · a
//    ref from another tab is ref_wrong_tab · a removed element's ref is stale_ref · a reload makes refs stale_ref.
// P2 form_input / computer by ref on a local sign-in form: username and password filled (not submitted), the page
//    saw each value with one input and one change event · checkbox, select · type and key (Backspace, Tab) · clicks by
//    ref and by coordinate, double, right, hover, scroll · a removed element's ref and a navigating click.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { app } from "electron";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const { installNativeHost } = require("../electron/browser/install.cjs");
const { ChromeBridgeClient, listSockets } = require("../electron/browser/bridge-client.cjs");
const { EXTENSION_ID, HOST_NAME } = require("../electron/browser/protocol.cjs");
const extensionDir = path.resolve(root, "..", "claude-ext");

app.dock?.hide();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (line) => console.log(line);

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  const builds = fs.existsSync(cache) ? fs.readdirSync(cache).filter((name) => /^chromium-\d+$/.test(name)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1])) : [];
  for (const build of builds) {
    const binary = path.join(cache, build, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
    if (fs.existsSync(binary)) return binary;
  }
  throw new Error("No Chrome for Testing found: run `npx playwright install chromium` or set CHROME_PATH (branded Google Chrome ignores --load-extension).");
}

async function until(what, test, timeoutMs = 20_000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const value = await test();
    if (value) return value;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await wait(200);
  }
}

/** Resolves to the tool's error code (the call must fail). */
async function failsWith(promise) {
  try { await promise; } catch (error) { return error.code; }
  throw new Error("the call succeeded but should have failed");
}

// ── fixtures ────────────────────────────────────────────────────────────────────────────────────────────────────────
// The classic example.com page, as it was before the 2025 redesign.
const EXAMPLE = `<!doctype html><html><head><title>Example Domain</title><meta charset="utf-8"></head><body><div>
<h1>Example Domain</h1>
<p>This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.</p>
<p><a href="https://www.iana.org/domains/example">More information...</a></p>
</div></body></html>`;
const FORM = (removeAfterMs) => `<!doctype html><html><head><title>Ref rules</title><meta charset="utf-8"></head><body>
<h2>Sign in</h2>
<form>
  <label for="user">Username</label> <input id="user" name="user">
  <input type="password" placeholder="Password">
  <input type="hidden" name="csrf" value="x">
  <select aria-label="Region"><option>EU</option><option selected>US</option></select>
  <textarea placeholder="Notes"></textarea>
  <button type="button" id="gone">Remove me</button>
</form>
<a href="/next">Next page</a> <a name="anchor">not a link</a>
<span role="button" tabindex="0">Fake button</span>
<div contenteditable="true">Editable</div>
<div onclick="void 0">Clickable div</div>
<div>Plain text only</div>
<div style="display:none"><button>Hidden button</button></div>
${removeAfterMs ? `<script>setTimeout(() => document.getElementById("gone").remove(), ${removeAfterMs});</script>` : ""}
</body></html>`;

// A sign-in form that reports what reached it: each field's value and its input / change events, clicks, hover,
// and whether the form was submitted (it must not be). One "log …" line per thing, read back with find.
const LOGIN = `<!doctype html><html><head><title>Sign in</title><meta charset="utf-8"></head><body>
<form id="signin" action="/submitted">
  <label for="user">Username</label> <input id="user" name="user" autocomplete="username">
  <label for="pass">Password</label> <input id="pass" type="password" name="pass">
  <label><input type="checkbox" id="remember"> Remember me</label>
  <select id="plan" aria-label="Plan"><option value="free">Free</option><option value="pro">Pro</option></select>
  <textarea id="notes" aria-label="Notes"></textarea>
  <button type="submit">Sign in</button>
</form>
<button type="button" id="counter">Counter</button>
<span role="button" id="hover">Hover me</span>
<button type="button" id="vanish">Vanish</button>
<a href="/next">Next page</a>
<div id="logs"></div>
<div style="height:3000px"></div>
<script>
  const state = { submitted: "no", clicks: 0, dbl: 0, ctx: 0, hovered: "no" };
  const fields = { user: {}, pass: {}, notes: {} };
  for (const id of Object.keys(fields)) for (const type of ["input", "change"]) {
    document.getElementById(id).addEventListener(type, (event) => { fields[id][type] = (fields[id][type] ?? 0) + 1; fields[id].trusted = event.isTrusted; render(); });
  }
  const counter = document.getElementById("counter");
  counter.addEventListener("click", () => { state.clicks++; render(); });
  counter.addEventListener("dblclick", () => { state.dbl++; render(); });
  counter.addEventListener("contextmenu", (event) => { event.preventDefault(); state.ctx++; render(); });
  document.getElementById("hover").addEventListener("mouseenter", () => { state.hovered = "yes"; render(); });
  document.getElementById("vanish").addEventListener("click", (event) => event.target.remove());
  document.getElementById("signin").addEventListener("submit", (event) => { event.preventDefault(); state.submitted = "yes"; render(); });
  function render() {
    const lines = Object.entries(fields).map(([id, seen]) => \`log \${id} value="\${document.getElementById(id).value}" input=\${seen.input ?? 0} change=\${seen.change ?? 0}\`);
    lines.push(\`log clicks=\${state.clicks} dbl=\${state.dbl} ctx=\${state.ctx}\`, \`log hovered=\${state.hovered}\`, \`log submitted=\${state.submitted}\`);
    document.getElementById("logs").innerHTML = lines.map((line) => "<p></p>").join("");
    [...document.querySelectorAll("#logs p")].forEach((p, index) => { p.textContent = lines[index]; });
  }
  render();
</script>
</body></html>`;

function serveFixtures() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const body = url.pathname === "/example" ? EXAMPLE : url.pathname === "/form" ? FORM(Number(url.searchParams.get("remove")) || 0)
      : url.pathname === "/login" ? LOGIN : url.pathname === "/next" ? "<!doctype html><title>Next</title><h1>Next page</h1>" : null;
    response.writeHead(body ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
    response.end(body ?? "not found");
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ── phases ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const phases = {
  async p0({ client, sockets }) {
    const pong = await client.executeTool("ping", {}, { timeoutMs: 5000 });
    assert.equal(pong.pong, true, "ping answered with pong");
    assert.equal(pong.extensionId, EXTENSION_ID);
    say(`ping → ${JSON.stringify(pong)}`);
    assert.equal(await failsWith(client.executeTool("no_such_tool", {}, { timeoutMs: 5000 })), "unknown_tool");
    say("no_such_tool → error unknown_tool");
    await wait(100);
    const hostLog = fs.readFileSync(path.join(sockets, "host.log"), "utf8").trim().split("\n");
    say(`host log (${sockets}/host.log):`);
    for (const line of hostLog) say(`  ${line}`);
    for (const direction of ["electron→host execute_tool ping", "host→ext execute_tool ping", "ext→host tool_response ok", "host→electron tool_response ok", "ext→host notification hello"]) {
      assert.ok(hostLog.some((line) => line.includes(direction)), `host log shows "${direction}"`);
    }
  },

  async p1({ client, base }) {
    const tool = (name, args = {}) => client.executeTool(name, args, { timeoutMs: 30_000 });

    // Live example.com: a real network load and its title.
    const live = await tool("navigate", { url: "example.com" });
    say(`navigate example.com → tab ${live.tabId} ${live.status} "${live.title}" ${live.url}`);
    assert.equal(live.status, "complete");
    assert.equal(live.title, "Example Domain");
    assert.equal(live.url, "https://example.com/");

    // The classic page: title, heading, and a ref on the link only.
    const a = await tool("navigate", { url: `${base}/example`, tabId: live.tabId });
    assert.equal(a.tabId, live.tabId);
    const page = await tool("read_page", {});
    say(`read_page (tab ${page.tabId}, ${page.refCount} ref):\n${page.tree.replace(/^/gm, "  ")}`);
    assert.equal(page.title, "Example Domain");
    assert.match(page.tree, /^- heading "Example Domain" \[level=1\]$/m);
    const link = /^\s*- link "More information\.\.\." \[(ref_\d+)\] href="https:\/\/www\.iana\.org\/domains\/example"$/m.exec(page.tree);
    assert.ok(link, "the link has a ref and its href");
    assert.equal(page.refCount, 1, "only the link is interactive");
    assert.doesNotMatch(page.tree, /heading[^\n]*\[ref_|paragraph[^\n]*\[ref_/, "no ref on text");

    const found = await tool("find", { query: "More information" });
    say(`find "More information" → ${JSON.stringify(found.matches)}`);
    assert.equal(found.matches.length, 1);
    assert.equal(found.matches[0].ref, link[1], "find points at the same ref read_page gave the link");
    assert.equal(found.matches[0].role, "link");

    // Ref rules on the form page, in a tab of its own.
    const b = await tool("navigate", { url: `${base}/form` });
    assert.notEqual(b.tabId, a.tabId, "navigate without tabId opens a new tab");
    const first = await tool("read_page", { tabId: b.tabId, filter: "interactive" });
    say(`read_page interactive (tab ${b.tabId}):\n${first.tree.replace(/^/gm, "  ")}`);
    // The ref on the first line matching `pattern` (a regular expression source).
    const refOf = (tree, pattern) => {
      const line = tree.split("\n").find((text) => new RegExp(pattern).test(text));
      const ref = line && /\[(ref_\d+)\]/.exec(line);
      assert.ok(ref, `a ref for ${pattern}`);
      return ref[1];
    };
    for (const pattern of ['textbox "Username"', 'textbox "Password".*type=password', 'combobox "Region".*value="US"', 'textbox "Notes"', 'button "Remove me"', 'link "Next page"', 'button "Fake button"', 'textbox .*value="Editable"', 'generic "Clickable div"']) refOf(first.tree, pattern);
    assert.equal(first.refCount, 9, "exactly the interactive elements have refs");
    for (const text of ["csrf", "not a link", "Plain text only", "Hidden button"]) assert.ok(!first.tree.includes(text), `no ref for ${text}`);

    const oldRef = refOf(first.tree, 'button "Remove me"');
    const second = await tool("read_page", { tabId: b.tabId, filter: "interactive" });
    const newRef = refOf(second.tree, 'button "Remove me"');
    assert.notEqual(newRef, oldRef, "read_page hands out new names");
    assert.equal(await failsWith(tool("read_page", { tabId: b.tabId, ref_id: oldRef })), "stale_ref");
    say(`old ${oldRef} after a new read_page → stale_ref`);

    const sub = await tool("read_page", { tabId: b.tabId, ref_id: refOf(second.tree, 'combobox "Region"') });
    assert.match(sub.tree, /^- combobox "Region" \[ref_\d+\] value="US"/);
    say(`read_page ref_id (select) → ${sub.tree.split("\n")[0]}`);

    const fresh = await tool("read_page", { tabId: a.tabId });
    const linkRef = refOf(fresh.tree, 'link "More information..."');
    assert.equal(await failsWith(tool("read_page", { tabId: b.tabId, ref_id: linkRef })), "ref_wrong_tab");
    say(`tab ${a.tabId}'s ${linkRef} used on tab ${b.tabId} → ref_wrong_tab`);

    await tool("navigate", { url: `${base}/form?remove=1500`, tabId: b.tabId });
    const before = await tool("read_page", { tabId: b.tabId, filter: "interactive" });
    const goneRef = refOf(before.tree, 'button "Remove me"');
    // Background tabs' timers are throttled: wait until the page has really dropped the button.
    await until("the page to remove the button", async () => (await tool("find", { tabId: b.tabId, query: "Remove me" })).matches.length === 0, 15_000);
    assert.equal(await failsWith(tool("read_page", { tabId: b.tabId, ref_id: goneRef })), "stale_ref");
    say(`${goneRef} after its element was removed → stale_ref`);

    await tool("navigate", { url: `${base}/example`, tabId: a.tabId });
    assert.equal(await failsWith(tool("read_page", { tabId: a.tabId, ref_id: linkRef })), "stale_ref");
    say(`${linkRef} after the page reloaded → stale_ref`);

    assert.equal(await failsWith(tool("navigate", { url: "chrome://version" })), "bad_url");
    assert.equal(await failsWith(tool("read_page", { tabId: 999999 })), "no_such_tab");
  },

  async p2({ client, base }) {
    const tool = (name, args = {}) => client.executeTool(name, args, { timeoutMs: 30_000 });
    const refOf = (tree, pattern) => {
      const line = tree.split("\n").find((text) => new RegExp(pattern).test(text));
      const ref = line && /\[(ref_\d+)\]/.exec(line);
      assert.ok(ref, `a ref for ${pattern}`);
      return ref[1];
    };
    // The page's own report: { user: 'value="…" input=1 change=1', clicks: 'clicks=…', … }.
    const logs = async (tabId) => {
      const { matches } = await tool("find", { tabId, query: "log " });
      return Object.fromEntries(matches.map(({ text }) => { const [, key, rest] = /^log (\w+)[ =](.*)$/.exec(text); return [key, rest]; }));
    };

    const { tabId } = await tool("navigate", { url: `${base}/login` });
    const page = await tool("read_page", { tabId, filter: "interactive" });
    say(`read_page interactive (tab ${tabId}):\n${page.tree.replace(/^/gm, "  ")}`);
    const ref = Object.fromEntries(Object.entries({ user: 'textbox "Username"', pass: 'textbox "Password"', remember: 'checkbox "Remember me"', plan: 'combobox "Plan"', notes: 'textbox "Notes"',
      signIn: 'button "Sign in"', counter: 'button "Counter"', hover: 'button "Hover me"', vanish: 'button "Vanish"', next: 'link "Next page"' }).map(([key, pattern]) => [key, refOf(page.tree, pattern)]));

    // The acceptance: username and password filled, not submitted, the page saw the values and an input event each.
    const user = await tool("form_input", { tabId, ref: ref.user, value: "alice" });
    const pass = await tool("form_input", { tabId, ref: ref.pass, value: "s3cret-pw" });
    say(`form_input Username → ${JSON.stringify(user)}`);
    say(`form_input Password → ${JSON.stringify(pass)}`);
    assert.equal(user.value, "alice");
    assert.equal(pass.value, "•••••••••", "a password isn't echoed back");
    let seen = await logs(tabId);
    say(`page report: ${JSON.stringify(seen)}`);
    assert.equal(seen.user, 'value="alice" input=1 change=1');
    assert.equal(seen.pass, 'value="s3cret-pw" input=1 change=1');
    assert.equal(seen.submitted, "no");
    const filled = await tool("read_page", { tabId, filter: "interactive" });
    assert.match(filled.tree, /textbox "Username" \[ref_\d+\] value="alice"/);
    assert.match(filled.tree, /textbox "Password" \[ref_\d+\] type=password value=\(hidden\)/);
    Object.assign(ref, Object.fromEntries(Object.entries({ user: 'textbox "Username"', pass: 'textbox "Password"', remember: 'checkbox "Remember me"', plan: 'combobox "Plan"', notes: 'textbox "Notes"',
      signIn: 'button "Sign in"', counter: 'button "Counter"', hover: 'button "Hover me"', vanish: 'button "Vanish"', next: 'link "Next page"' }).map(([key, pattern]) => [key, refOf(filled.tree, pattern)])));

    // Checkbox and select.
    assert.equal((await tool("form_input", { tabId, ref: ref.remember, value: true })).checked, true);
    assert.deepEqual((await tool("form_input", { tabId, ref: ref.plan, value: "Pro" })).value, ["Pro"]);
    assert.equal(await failsWith(tool("form_input", { tabId, ref: ref.plan, value: "Gold" })), "bad_request");
    assert.equal(await failsWith(tool("form_input", { tabId, ref: ref.counter, value: "x" })), "not_a_form_control");

    // type and key into the notes field.
    const typed = await tool("computer", { tabId, action: "type", ref: ref.notes, text: "hi there" });
    assert.equal(typed.value, "hi there");
    const keys = await tool("computer", { tabId, action: "key", text: "Backspace Backspace" });
    say(`type "hi there", key "Backspace Backspace" → ${JSON.stringify(keys.emulated)}`);
    seen = await logs(tabId);
    assert.match(seen.notes, /^value="hi the" input=10 change=0$/, "eight typed characters and two deletions, each an input event");
    const tab = await tool("computer", { tabId, action: "key", text: "Tab" });
    assert.equal(tab.focused.name, "Sign in", "Tab moves the focus on");

    // Clicks: by ref, then by the coordinate that click reported, then double and right clicks.
    const clicked = await tool("computer", { tabId, action: "left_click", ref: ref.counter });
    assert.ok(Number.isInteger(clicked.x) && Number.isInteger(clicked.y));
    const byPoint = await tool("computer", { tabId, action: "left_click", coordinate: [clicked.x, clicked.y] });
    assert.equal(byPoint.name, "Counter", "the coordinate hit the same button");
    const both = await tool("computer", { tabId, action: "left_click", ref: ref.counter, coordinate: [0, 0] });
    assert.equal(both.name, "Counter");
    assert.match(both.note, /coordinate ignored/);
    await tool("computer", { tabId, action: "double_click", ref: ref.counter });
    await tool("computer", { tabId, action: "right_click", ref: ref.counter });
    await tool("computer", { tabId, action: "hover", ref: ref.hover });
    seen = await logs(tabId);
    say(`clicks / hover → ${JSON.stringify({ clicks: seen.clicks, hovered: seen.hovered })}`);
    assert.equal(seen.clicks, "5 dbl=1 ctx=1");
    assert.equal(seen.hovered, "yes");
    assert.equal(seen.submitted, "no", "nothing submitted the form");

    const scrolled = await tool("computer", { tabId, action: "scroll", scroll_direction: "down", scroll_amount: 5 });
    say(`scroll down 5 → ${JSON.stringify(scrolled)}`);
    assert.ok(scrolled.scrollY > 0);

    // A ref whose element went away, and a click that navigates.
    const vanished = await tool("computer", { tabId, action: "left_click", ref: ref.vanish });
    assert.equal(vanished.stillOnPage, false);
    assert.equal(await failsWith(tool("computer", { tabId, action: "left_click", ref: ref.vanish })), "stale_ref");
    const away = await tool("computer", { tabId, action: "left_click", ref: ref.next });
    say(`left_click "Next page" → ${JSON.stringify(away.navigated)}`);
    assert.equal(away.navigated?.url, `${base}/next`);
    assert.equal(away.navigated.sameDocument, undefined, "a new page, not a same-document change");
    assert.equal(await failsWith(tool("form_input", { tabId, ref: ref.user, value: "bob" })), "stale_ref");
    assert.equal(await failsWith(tool("computer", { tabId, action: "left_click" })), "bad_request");
  },
};

// ── run ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const requested = process.argv.slice(2).filter((arg) => /^p\d$/.test(arg));
const selected = requested.length ? requested : Object.keys(phases);
for (const name of selected) if (!phases[name]) { console.error(`No phase ${name}: ${Object.keys(phases).join(", ")}`); process.exit(2); }

let chrome = null, client = null, server = null, exitCode = 1, chromeErr = "";
const work = fs.mkdtempSync(path.join(os.tmpdir(), "ocb-"));
const profile = path.join(work, "profile");
const sockets = path.join(work, "s");
// Not a top-level await: Electron fires ready only after the ESM entry module has finished evaluating.
app.whenReady().then(run);

async function run() {
  try {
    say(`runtime: electron ${process.versions.electron} (main process) · phases ${selected.join(", ")}`);
    const installed = installNativeHost({ manifestDir: path.join(profile, "NativeMessagingHosts"), launcherPath: path.join(work, "native-host.sh"), socketDir: sockets });
    say(`host manifest: ${installed.manifestPath}`);
    server = await serveFixtures();
    const base = `http://127.0.0.1:${server.address().port}`;

    const binary = findChrome();
    // Headless Chrome can't answer a proxy's sign-in prompt: use the shell's proxy (loopback is never proxied).
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || "";
    say(`chrome: ${binary}${proxy ? ` · proxy ${proxy}` : ""}`);
    chrome = spawn(binary, [
      "--headless=new", `--user-data-dir=${profile}`, `--load-extension=${extensionDir}`, `--disable-extensions-except=${extensionDir}`,
      "--no-first-run", "--no-default-browser-check", "--disable-features=DisableLoadExtensionCommandLineSwitch",
      ...(proxy ? [`--proxy-server=${proxy}`] : []), "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"] });
    chrome.stderr.on("data", (chunk) => { chromeErr = (chromeErr + chunk).slice(-4000); });

    const socket = await until("the native host's socket (Chrome → connectNative → host)", () => listSockets(sockets)[0]);
    say(`host socket: ${socket.file}`);
    client = await ChromeBridgeClient.connect({ file: socket.file, log: process.env.BRIDGE_VERBOSE ? (line) => say(`  [electron] ${line}`) : undefined });
    const status = await until("the extension's hello", async () => { const value = await client.getStatus(); return value.connected ? value : null; });
    assert.equal(status.extension.extensionId, EXTENSION_ID, "the extension's ID is the fixed one");
    assert.equal(status.host.origin, `chrome-extension://${EXTENSION_ID}/`, "Chrome started the host for the bridge extension");
    say(`status: extension ${status.extension.extensionId} v${status.extension.version}, host pid ${status.host.pid}`);

    for (const name of selected) {
      say(`\n── ${name.toUpperCase()} ──`);
      await phases[name]({ client, sockets, base });
      say(`${name.toUpperCase()} PASS`);
    }
    say(`\nPASS: ${selected.map((name) => name.toUpperCase()).join(", ")} over ${HOST_NAME}.`);
    exitCode = 0;
  } catch (error) {
    say(`FAIL: ${error.stack ?? error.message}`);
    const hostLog = path.join(sockets, "host.log");
    if (fs.existsSync(hostLog)) say(`host log (tail):\n${fs.readFileSync(hostLog, "utf8").split("\n").slice(-30).join("\n")}`);
    if (chromeErr) say(`chrome stderr (tail):\n${chromeErr}`);
  } finally {
    client?.close();
    server?.close();
    if (chrome && chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", () => resolve(true)));
      chrome.kill("SIGTERM");
      if (!(await Promise.race([exited, wait(3000)]))) { chrome.kill("SIGKILL"); await Promise.race([exited, wait(2000)]); }
    }
    await wait(300);
    if (exitCode === 0) fs.rmSync(work, { recursive: true, force: true });
    else say(`kept ${work} for inspection`);
    app.exit(exitCode);
  }
}
