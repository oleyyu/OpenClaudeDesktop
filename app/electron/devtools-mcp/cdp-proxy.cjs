// A minimal CDP "browser" endpoint over the Preview pane's tabs, for Google's chrome-devtools-mcp (puppeteer.connect
// with browserWSEndpoint). It is the only way that server sees anything: the app never opens a remote-debugging port or
// pipe, so the app's own windows (which hold the API keys and sessions), other BrowserWindows and webviews are never
// reachable — only the preview tabs the host lists.
//
//   chrome-devtools-mcp ──ws://127.0.0.1:<port>/devtools/browser/<token>──▶ this proxy ──▶ webContents.debugger
//
// Targets: puppeteer (24.x, inside chrome-devtools-mcp 1.13.0) expects Chrome's tab model — a "tab" target per tab,
// auto-attached from the browser session (its filter excludes pages), and the "page" target auto-attached from the tab
// session. Each preview tab is listed as both; the tab session is the proxy's own, the page session is a real CDP session
// of the page: Target.attachToTarget({targetId: <the page's own id>, flatten: true}) sent through the debugger the
// Preview service already attached (never a second attach). Its commands are `debugger.sendCommand(method, params,
// sessionId)` and its events reach the proxy through the service's existing `message` listener (onMessage), which
// ignores messages of such sessions for its own console / network logs. A page session has its own domain state
// (Runtime.enable replays contexts and console for it alone), and detaching it on disconnect drops everything the client
// set up (bindings, init scripts, auto-attach, emulation). Child sessions (iframes, workers) keep Chrome's session ids.
//
// What a client may do through a page session is limited to that page: Target commands that would list or attach other
// targets (the app's own windows are targets of the same browser) are refused, Browser commands too, Page.navigate goes
// through the preview's own navigation rules (host.checkNavigation), and Page.bringToFront / Page.close become the
// preview's tab switch / close (no window is focused).
//
// The host (preview-service.cjs devtools) supplies:
//   targets()                 [{ key, sessionId, contents, active }] — the live preview tabs
//   onChange(fn)              tab list / address / title changed → fn(); returns an unsubscribe
//   onMessage(fn)             every debugger message of a preview page: fn(contents, method, params, sessionId)
//   checkNavigation(key, url) throws when the preview wouldn't open that address in that tab without asking
//   activate(key), close(key), create(url, nearKey) → key
//   enabled()                 false: connections are refused (Settings › the preview tools are off)
"use strict";
const http = require("node:http");
const crypto = require("node:crypto");
const { createWebSocketServer, refuse } = require("./ws-server.cjs");

const CONTEXT_ID = "OPENCLAUDE-PREVIEW";
const HELD = "The page can’t be inspected while its developer tools hold it. Close them and try again.";
const NOT_FOUND = -32601, INVALID = -32602, SERVER = -32000;
// Target commands a page (or child) session may send; anything else of the domain could reach other targets.
const PAGE_TARGET_COMMANDS = new Set(["Target.setAutoAttach", "Target.getTargetInfo", "Target.detachFromTarget", "Target.activateTarget", "Target.closeTarget"]);

const randomId = () => crypto.randomBytes(16).toString("hex").toUpperCase();
function safeEqual(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
const fail = (code, message) => Object.assign(new Error(message), { cdpCode: code });

/**
 * @param {object} options
 * @param {object} options.host        see the header
 * @param {object} [options.logger]
 * @param {string} [options.token]     tests only: a fixed token
 */
function createCdpProxy({ host, logger = console, token: fixedToken = null } = {}) {
  const token = fixedToken || crypto.randomBytes(32).toString("hex");
  const browserTargetId = randomId();
  const records = new Map(); // record id (tab key + contents id) → record
  const clients = new Set();
  const owners = new Map(); // real CDP session id (page or child) → { client, page }
  let server = null, port = 0, starting = null, unsubscribers = [];
  let refreshing = Promise.resolve(), refreshTimer = null;

  // ------------------------------------------------------------------ targets
  const recordId = (target) => `${target.key}|${target.contents.id}`;
  const tabInfo = (record) => ({ targetId: record.tabTargetId, type: "tab", title: record.title, url: record.url, attached: true, canAccessOpener: false, browserContextId: CONTEXT_ID });
  const pageInfo = (record) => ({ targetId: record.pageTargetId, type: "page", title: record.title, url: record.url, attached: true, canAccessOpener: false, browserContextId: CONTEXT_ID });
  const recordByTarget = (targetId) => [...records.values()].find((record) => record.tabTargetId === targetId || record.pageTargetId === targetId) ?? null;
  const live = (record) => record && records.get(record.id) === record && !record.contents.isDestroyed();

  async function pageTargetId(contents) {
    try { const { targetInfo } = await contents.debugger.sendCommand("Target.getTargetInfo"); if (targetInfo?.targetId) return targetInfo.targetId; } catch { /* the debugger is held or not yet attached */ }
    return null;
  }
  function addressOf(contents) {
    let url = "", title = "";
    try { url = contents.getURL(); title = contents.getTitle(); } catch { /* destroyed */ }
    return { url, title };
  }

  /** The host's list → records, and the target events every client asked for. Serialised. */
  function refresh() {
    refreshing = refreshing.then(refreshNow, refreshNow);
    return refreshing;
  }
  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => { refreshTimer = null; refresh().catch((error) => logger.warn?.(`devtools proxy: ${error.message}`)); }, 30);
    refreshTimer.unref?.();
  }
  async function refreshNow() {
    let listed = [];
    try { listed = (host.targets() || []).filter((target) => target?.contents && !target.contents.isDestroyed()); } catch (error) { logger.warn?.(`devtools proxy: ${error.message}`); }
    const seen = new Set();
    for (const target of listed) {
      const id = recordId(target);
      seen.add(id);
      const known = records.get(id);
      if (known) {
        known.sessionId = target.sessionId; known.active = !!target.active;
        const { url, title } = addressOf(target.contents);
        if (url !== known.url || title !== known.title) {
          known.url = url; known.title = title;
          for (const client of clients) if (client.discover) { client.event("Target.targetInfoChanged", { targetInfo: tabInfo(known) }); client.event("Target.targetInfoChanged", { targetInfo: pageInfo(known) }); }
        }
        continue;
      }
      const real = await pageTargetId(target.contents);
      if (target.contents.isDestroyed() || records.has(id)) continue;
      if (!real) { seen.delete(id); continue; } // listed once its page answers (a later change retries)
      const record = { id, key: target.key, sessionId: target.sessionId, active: !!target.active, contents: target.contents, tabTargetId: randomId(), pageTargetId: real, ...addressOf(target.contents) };
      records.set(id, record);
      target.contents.once("destroyed", scheduleRefresh);
      for (const client of clients) announce(client, record);
    }
    for (const record of [...records.values()]) if (!seen.has(record.id)) remove(record);
  }
  function announce(client, record) {
    if (client.discover) { client.event("Target.targetCreated", { targetInfo: tabInfo(record) }); client.event("Target.targetCreated", { targetInfo: pageInfo(record) }); }
    if (client.autoAttach) attachTab(client, record);
  }
  function remove(record) {
    records.delete(record.id);
    for (const client of clients) {
      for (const [tabSession, tab] of [...client.tabs]) if (tab.record === record) detachTab(client, tabSession, true);
      if (client.discover) { client.event("Target.targetDestroyed", { targetId: record.pageTargetId }); client.event("Target.targetDestroyed", { targetId: record.tabTargetId }); }
    }
  }

  // ------------------------------------------------------------------ sessions
  // Nothing the proxy lists ever waits for a debugger (waitingForDebugger false): the pages are already running.
  function attachTab(client, record, auto = true) {
    if (auto) for (const [existing, tab] of client.tabs) if (tab.record === record && tab.auto) return existing;
    const tabSession = randomId();
    client.tabs.set(tabSession, { record, page: null, auto });
    client.event("Target.attachedToTarget", { sessionId: tabSession, targetInfo: tabInfo(record), waitingForDebugger: false });
    return tabSession;
  }
  async function attachPage(client, record, parentSession) {
    if (!live(record)) throw fail(SERVER, "No target with given id found");
    if (!record.contents.debugger.isAttached()) throw fail(SERVER, HELD);
    const { sessionId } = await record.contents.debugger.sendCommand("Target.attachToTarget", { targetId: record.pageTargetId, flatten: true });
    const page = { record, sessionId, parentSession, children: new Map() }; // child session id → its target id
    owners.set(sessionId, { client, page });
    client.pages.set(sessionId, page);
    client.lastKey = record.key;
    client.event("Target.attachedToTarget", { sessionId, targetInfo: pageInfo(record), waitingForDebugger: false }, parentSession);
    return page;
  }
  function dropPage(client, page, { notify = true, release = true } = {}) {
    if (!client.pages.has(page.sessionId)) return;
    client.pages.delete(page.sessionId);
    for (const child of page.children.keys()) owners.delete(child);
    owners.delete(page.sessionId);
    for (const tab of client.tabs.values()) if (tab.page === page) tab.page = null;
    if (release && live(page.record) && page.record.contents.debugger.isAttached()) page.record.contents.debugger.sendCommand("Target.detachFromTarget", { sessionId: page.sessionId }).catch(() => {});
    if (notify) client.event("Target.detachedFromTarget", { sessionId: page.sessionId, targetId: page.record.pageTargetId }, page.parentSession);
  }
  function detachTab(client, tabSession, notify = true) {
    const tab = client.tabs.get(tabSession);
    if (!tab) return;
    if (tab.page) dropPage(client, tab.page, { notify });
    client.tabs.delete(tabSession);
    if (notify) client.event("Target.detachedFromTarget", { sessionId: tabSession, targetId: tab.record.tabTargetId });
  }

  // Every debugger message of every preview page (the service's existing listener fans them out).
  function onMessage(contents, method, params, sessionId) {
    if (!sessionId) {
      // A page session ended from the browser side (the page's developer tools took the debugger, the page is gone).
      if (method === "Target.detachedFromTarget" && params?.sessionId) {
        const owner = owners.get(params.sessionId);
        if (owner && owner.page.sessionId === params.sessionId) dropPage(owner.client, owner.page, { release: false });
      }
      return;
    }
    const owner = owners.get(sessionId);
    if (!owner) return;
    if (method === "Target.attachedToTarget" && params?.sessionId) { owner.page.children.set(params.sessionId, params.targetInfo?.targetId ?? null); owners.set(params.sessionId, owner); }
    else if (method === "Target.detachedFromTarget" && params?.sessionId) { owner.page.children.delete(params.sessionId); owners.delete(params.sessionId); }
    owner.client.event(method, params, sessionId);
  }

  // ------------------------------------------------------------------ commands
  function browserVersion() {
    let userAgent = "";
    for (const record of records.values()) { try { userAgent = record.contents.getUserAgent(); break; } catch { /* next */ } }
    return { protocolVersion: "1.3", product: `Chrome/${process.versions.chrome || "0"}`, revision: "", userAgent, jsVersion: process.versions.v8 || "" };
  }
  async function browserCommand(client, method, params = {}) {
    switch (method) {
      case "Browser.getVersion": return browserVersion();
      case "Target.getBrowserContexts": return { browserContextIds: [], defaultBrowserContextId: CONTEXT_ID };
      case "Target.setDiscoverTargets": {
        await refresh();
        const was = client.discover;
        client.discover = params.discover === true;
        if (client.discover && !was) for (const record of records.values()) { client.event("Target.targetCreated", { targetInfo: tabInfo(record) }); client.event("Target.targetCreated", { targetInfo: pageInfo(record) }); }
        return {};
      }
      case "Target.setAutoAttach": {
        if (params.autoAttach && params.flatten !== true) throw fail(INVALID, "Only flat sessions (flatten: true) are supported.");
        await refresh();
        client.autoAttach = params.autoAttach === true;
        if (client.autoAttach) for (const record of records.values()) attachTab(client, record);
        else for (const [tabSession, tab] of [...client.tabs]) if (tab.auto) detachTab(client, tabSession);
        return {};
      }
      case "Target.getTargets": await refresh(); return { targetInfos: [...records.values()].flatMap((record) => [tabInfo(record), pageInfo(record)]) };
      case "Target.getTargetInfo": {
        if (!params.targetId) return { targetInfo: { targetId: browserTargetId, type: "browser", title: "", url: "", attached: true, canAccessOpener: false } };
        const record = recordByTarget(params.targetId);
        if (!record) throw fail(INVALID, "No target with given id found");
        return { targetInfo: record.tabTargetId === params.targetId ? tabInfo(record) : pageInfo(record) };
      }
      case "Target.attachToTarget": {
        if (params.flatten !== true) throw fail(INVALID, "Only flat sessions (flatten: true) are supported.");
        const record = recordByTarget(params.targetId);
        if (!live(record)) throw fail(INVALID, "No target with given id found");
        if (record.tabTargetId === params.targetId) return { sessionId: attachTab(client, record, false) };
        return { sessionId: (await attachPage(client, record, null)).sessionId };
      }
      case "Target.detachFromTarget": return detachSession(client, params.sessionId);
      case "Target.activateTarget": {
        const record = recordByTarget(params.targetId);
        if (!live(record)) throw fail(INVALID, "No target with given id found");
        await host.activate(record.key);
        return {};
      }
      case "Target.createTarget": {
        const key = await host.create(typeof params.url === "string" && params.url ? params.url : "about:blank", client.lastKey ?? null);
        await refresh();
        let record = [...records.values()].find((candidate) => candidate.key === key);
        // The new page answers Target.getTargetInfo once its renderer exists.
        for (let tries = 0; !record && tries < 40; tries += 1) { await new Promise((resolve) => setTimeout(resolve, 50)); await refresh(); record = [...records.values()].find((candidate) => candidate.key === key); }
        if (!record) throw fail(SERVER, "The new preview tab didn’t open.");
        client.lastKey = key;
        return { targetId: record.pageTargetId };
      }
      case "Target.closeTarget": {
        const record = recordByTarget(params.targetId);
        if (!live(record)) throw fail(INVALID, "No target with given id found");
        await host.close(record.key);
        await refresh();
        return { success: true };
      }
      case "Target.getDevToolsTarget": return {};
      default: throw fail(NOT_FOUND, `'${method}' isn’t available on OpenClaude Desktop’s preview browser.`);
    }
  }
  function detachSession(client, sessionId) {
    if (client.tabs.has(sessionId)) { detachTab(client, sessionId); return {}; }
    const page = client.pages.get(sessionId);
    if (page) { dropPage(client, page); return {}; }
    throw fail(INVALID, "No session with given id found");
  }
  async function tabCommand(client, tabSession, method, params = {}) {
    const tab = client.tabs.get(tabSession);
    switch (method) {
      case "Target.setAutoAttach":
        if (params.autoAttach) {
          if (params.flatten !== true) throw fail(INVALID, "Only flat sessions (flatten: true) are supported.");
          if (!tab.page) tab.page = await attachPage(client, tab.record, tabSession);
        } else if (tab.page) dropPage(client, tab.page);
        return {};
      case "Runtime.runIfWaitingForDebugger": return {};
      case "Target.getTargetInfo": return { targetInfo: tabInfo(tab.record) };
      case "Target.detachFromTarget": return detachSession(client, params.sessionId);
      case "Target.activateTarget": await host.activate(tab.record.key); return {};
      default: throw fail(NOT_FOUND, `'${method}' isn’t available on a preview tab target.`);
    }
  }
  async function pageCommand(client, owner, sessionId, method, params = {}) {
    const record = owner.page.record;
    if (!live(record)) throw fail(SERVER, "The preview tab was closed.");
    const domain = method.slice(0, method.indexOf("."));
    if (domain === "Target") {
      if (!PAGE_TARGET_COMMANDS.has(method)) throw fail(SERVER, `'${method}' isn’t allowed on a preview page.`);
      if (method === "Target.activateTarget") { await host.activate(record.key); return {}; }
      if (method === "Target.closeTarget") {
        if (params.targetId !== record.pageTargetId) throw fail(SERVER, "Only this preview page can be closed from its session.");
        await host.close(record.key); return { success: true };
      }
      // Its own target, or a child (an iframe or worker) this session attached.
      if (method === "Target.getTargetInfo" && params.targetId && params.targetId !== record.pageTargetId && ![...owner.page.children.values()].includes(params.targetId))
        throw fail(SERVER, "Only this preview page’s own targets are visible.");
      if (method === "Target.detachFromTarget" && !owner.page.children.has(params.sessionId)) throw fail(SERVER, "No session with given id found");
    }
    if (domain === "Browser") {
      if (method === "Browser.getVersion") return browserVersion();
      throw fail(NOT_FOUND, `'${method}' isn’t available on OpenClaude Desktop’s preview browser.`);
    }
    if (method === "Page.bringToFront") { await host.activate(record.key); return {}; }
    if (method === "Page.close") { await host.close(record.key); return {}; }
    if (method === "Page.navigate") host.checkNavigation(record.key, params.url);
    if (!record.contents.debugger.isAttached()) throw fail(SERVER, HELD);
    client.lastKey = record.key;
    return record.contents.debugger.sendCommand(method, params, sessionId);
  }

  // ------------------------------------------------------------------ connections
  function connected(ws) {
    const client = {
      ws, discover: false, autoAttach: false, tabs: new Map(), pages: new Map(), lastKey: null,
      event(method, params, sessionId) { ws.send(JSON.stringify(sessionId ? { method, params, sessionId } : { method, params })); },
    };
    clients.add(client);
    ws.on("message", (text) => {
      let message;
      try { message = JSON.parse(text); } catch { ws.close(1003, "Invalid JSON"); return; }
      const { id, method, sessionId } = message ?? {};
      if (typeof id !== "number" || typeof method !== "string") return;
      const params = message.params && typeof message.params === "object" ? message.params : {};
      let work;
      if (!sessionId) work = browserCommand(client, method, params);
      else if (client.tabs.has(sessionId)) work = tabCommand(client, sessionId, method, params);
      else {
        const owner = owners.get(sessionId);
        work = owner && owner.client === client ? pageCommand(client, owner, sessionId, method, params) : Promise.reject(fail(SERVER, `Session with given id not found.`));
      }
      Promise.resolve(work).then(
        (result) => ws.send(JSON.stringify({ id, result: result ?? {}, ...(sessionId ? { sessionId } : {}) })),
        (error) => ws.send(JSON.stringify({ id, error: { code: error?.cdpCode ?? SERVER, message: String(error?.message || error) }, ...(sessionId ? { sessionId } : {}) })),
      );
    });
    ws.on("close", () => {
      clients.delete(client);
      for (const page of [...client.pages.values()]) dropPage(client, page, { notify: false });
      client.tabs.clear();
    });
  }
  const wss = createWebSocketServer({ onConnection: connected });

  function onRequest(request, response) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
  function onUpgrade(request, socket, head) {
    const expectedHost = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    let pathname = "";
    try { pathname = new URL(request.url, "http://127.0.0.1").pathname; } catch { /* refused below */ }
    const match = /^\/devtools\/browser\/([0-9a-f]{64})$/.exec(pathname);
    // A web page can open a WebSocket to 127.0.0.1 too: it always sends Origin; a CDP client doesn't.
    if (!match || !safeEqual(match[1], token) || request.headers.origin || !expectedHost.has(String(request.headers.host || ""))) { refuse(socket, "403", "Forbidden"); return; }
    let enabled = true;
    try { enabled = host.enabled?.() !== false; } catch { enabled = false; }
    if (!enabled) { refuse(socket, "403", "The preview tools are turned off in OpenClaude Desktop."); return; }
    wss.handleUpgrade(request, socket, head);
  }

  async function start() {
    if (server) return endpoint();
    if (starting) return starting;
    starting = (async () => {
      const created = http.createServer(onRequest);
      created.on("upgrade", onUpgrade);
      created.on("clientError", (_error, socket) => { try { socket.destroy(); } catch { /* gone */ } });
      await new Promise((resolve, reject) => { created.once("error", reject); created.listen(0, "127.0.0.1", () => { created.off("error", reject); resolve(); }); });
      created.unref?.();
      server = created;
      port = created.address().port;
      unsubscribers = [host.onChange(scheduleRefresh), host.onMessage(onMessage)].filter((fn) => typeof fn === "function");
      return endpoint();
    })();
    try { return await starting; } finally { starting = null; }
  }
  function endpoint() {
    return server ? { port, token, wsEndpoint: `ws://127.0.0.1:${port}/devtools/browser/${token}` } : null;
  }
  function stop() {
    for (const unsubscribe of unsubscribers) { try { unsubscribe(); } catch { /* gone */ } }
    unsubscribers = [];
    for (const client of [...clients]) for (const page of [...client.pages.values()]) dropPage(client, page, { notify: false });
    wss.closeAll(1001, "OpenClaude Desktop is quitting.");
    clearTimeout(refreshTimer); refreshTimer = null;
    try { server?.close(); } catch { /* closed */ }
    server = null; port = 0;
    records.clear(); owners.clear(); clients.clear();
  }
  return { start, stop, endpoint, refresh, get clientCount() { return clients.size; }, _records: records };
}

module.exports = { createCdpProxy, CONTEXT_ID, HELD };
