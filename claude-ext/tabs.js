// Which tab a tool acts on, navigation, and running content.js in a page.
// A tool without tabId acts on the bridge's current tab (the last one navigate / read_page / find used), else on the
// active tab of the last focused window — the page the user has open. Nothing runs in a tab no tool named:
// content.js is injected on demand (no manifest content_scripts), so the extension never walks pages in the background.
// tabs_create opens a tab of the bridge's own; tabs_context lists the window's tabs (tab metadata only: nothing is
// injected to list them). A tool given a tabId makes that tab the current one, which is how the agent switches tabs;
// the tab the user is looking at stays as it is.
import { ToolError } from "./errors.js";
import { invalidateTab, forgetTab } from "./refs.js";
import { assertSite } from "./sites.js";

const LOAD_TIMEOUT_MS = 20_000;
let currentTabId = null;
const openedTabs = new Set(); // tabs the bridge opened (navigate without tabId, tabs_create)
let loaded = null;

function load() {
  loaded ??= chrome.storage.session.get(["currentTabId", "openedTabs"]).then(({ currentTabId: saved, openedTabs: opened }) => {
    if (Number.isInteger(saved) && currentTabId === null) currentTabId = saved;
    if (Array.isArray(opened)) for (const id of opened) openedTabs.add(id);
  }).catch(() => {});
  return loaded;
}
function markOpened(tabId) {
  openedTabs.add(tabId);
  chrome.storage.session.set({ openedTabs: [...openedTabs] }).catch(() => {});
}
export function setCurrentTab(tabId) {
  currentTabId = tabId;
  chrome.storage.session.set({ currentTabId: tabId }).catch(() => {});
}

// Any navigation of a tab (a tool's, the user's, a reload) voids its refs; a closed tab forgets them.
const loadStarted = new Map(); // tabId → when its latest page load began
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status !== "loading") return;
  invalidateTab(tabId);
  loadStarted.set(tabId, Date.now());
});
chrome.tabs.onRemoved.addListener((tabId) => {
  forgetTab(tabId);
  loadStarted.delete(tabId);
  if (openedTabs.delete(tabId)) chrome.storage.session.set({ openedTabs: [...openedTabs] }).catch(() => {});
  if (tabId === currentTabId) setCurrentTab(null);
});

const tabSummary = (tab) => ({ tabId: tab.id, url: tab.url ?? tab.pendingUrl ?? "", title: tab.title ?? "" });

export async function resolveTab(tabId) {
  if (tabId !== undefined && tabId !== null) {
    if (!Number.isInteger(tabId)) throw new ToolError("bad_request", "tabId must be a number.");
    try { return await chrome.tabs.get(tabId); } catch { throw new ToolError("no_such_tab", `There's no tab ${tabId}. It may have been closed.`); }
  }
  await load();
  if (currentTabId !== null) {
    try { return await chrome.tabs.get(currentTabId); } catch { setCurrentTab(null); }
  }
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: "normal" });
  if (active) return active;
  throw new ToolError("no_tab", "There's no tab to act on. Call navigate with a url first.");
}

/** http(s) URLs, or a bare host ("example.com" → https://example.com/). */
export function normalizeUrl(input) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) throw new ToolError("bad_request", "url is required.");
  if (raw === "about:blank") return raw;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^/:]+:\d+(\/|$)/.test(raw) ? raw : `https://${raw}`;
  let url;
  try { url = new URL(withScheme); } catch { throw new ToolError("bad_url", `${raw} isn't a URL.`); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ToolError("bad_url", `Only http and https pages can be opened (${url.protocol} isn't).`);
  return url.href;
}

/** Waits until the tab has finished loading; resolves "complete", or "loading" if it is still going after the timeout. */
function waitForLoad(tabId) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (status) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      resolve(status);
    };
    const onUpdated = (id, change) => { if (id === tabId && change.status === "complete") finish("complete"); };
    const onRemoved = (id) => { if (id === tabId) finish("closed"); };
    const timer = setTimeout(() => finish("loading"), LOAD_TIMEOUT_MS);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
    // Listening first, then looking: a load that finished in between is not missed.
    chrome.tabs.get(tabId).then((tab) => { if (tab.status === "complete" && !tab.pendingUrl) finish("complete"); }, () => finish("closed"));
  });
}

/** navigate(url, tabId?): url, or "back" / "forward". Without tabId a new background tab is opened (the user's own
 * tabs aren't navigated away unless the tool names one); it becomes the bridge's current tab. */
export async function navigate({ url, tabId } = {}, ctx = {}) {
  let tab;
  if (url === "back" || url === "forward") {
    tab = await resolveTab(tabId);
    assertSite(tab.url, ctx);
    invalidateTab(tab.id);
    try { await (url === "back" ? chrome.tabs.goBack(tab.id) : chrome.tabs.goForward(tab.id)); }
    catch { throw new ToolError("bad_request", `Tab ${tab.id} has no page to go ${url} to.`); }
  } else {
    const target = normalizeUrl(url);
    assertSite(target, ctx);
    if (tabId !== undefined && tabId !== null) {
      tab = await resolveTab(tabId);
      invalidateTab(tab.id);
      tab = await chrome.tabs.update(tab.id, { url: target });
    } else {
      tab = await chrome.tabs.create({ url: target, active: false });
      markOpened(tab.id);
    }
  }
  const status = await waitForLoad(tab.id);
  if (status === "closed") throw new ToolError("no_such_tab", `Tab ${tab.id} was closed while loading.`);
  setCurrentTab(tab.id);
  return { ...tabSummary(await chrome.tabs.get(tab.id)), status };
}

/** After a click or key: if the tab started loading a page, wait for it and say where it went (its refs are void). */
export async function settleAfterAction(tabId, urlBefore, startedAt) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch { return { closed: true }; }
  const loaded = (loadStarted.get(tabId) ?? 0) >= startedAt;
  if (!loaded) return tab.url === urlBefore ? null : { url: tab.url ?? "", title: tab.title ?? "", status: "complete", sameDocument: true };
  const status = tab.status === "loading" ? await waitForLoad(tabId) : "complete";
  if (status === "closed") return { closed: true };
  const after = await chrome.tabs.get(tabId);
  return { url: after.url ?? "", title: after.title ?? "", status, note: "The page changed: call read_page for fresh refs." };
}

/** tabs_create(url?, active?): a new tab in the last focused window, in the background unless active; it becomes the
 * bridge's current tab. Without url it is about:blank (Chrome's own New Tab page can't be read). */
export async function tabsCreate({ url, active = false } = {}, ctx = {}) {
  if (typeof active !== "boolean") throw new ToolError("bad_request", "active is true or false.");
  const target = url === undefined || url === null || url === "" ? "about:blank" : normalizeUrl(url);
  assertSite(target, ctx);
  await load();
  const tab = await chrome.tabs.create({ url: target, active });
  markOpened(tab.id);
  const status = await waitForLoad(tab.id);
  if (status === "closed") throw new ToolError("no_such_tab", `Tab ${tab.id} was closed while loading.`);
  setCurrentTab(tab.id);
  return { ...tabSummary(await chrome.tabs.get(tab.id)), status, active };
}

/** tabs_context(): the tabs of the last focused window (and of the current tab's window, if that is another one). */
export async function tabsContext() {
  await load();
  let current = null;
  if (currentTabId !== null) { try { current = await chrome.tabs.get(currentTabId); } catch { setCurrentTab(null); } }
  const windowIds = [];
  try { windowIds.push((await chrome.windows.getLastFocused({ windowTypes: ["normal"] })).id); } catch {}
  if (current && !windowIds.includes(current.windowId)) windowIds.push(current.windowId);
  const windows = [];
  for (const windowId of windowIds) {
    const tabs = await chrome.tabs.query({ windowId });
    windows.push({
      windowId,
      tabs: tabs.map((tab) => ({ ...tabSummary(tab), active: tab.active, current: tab.id === currentTabId, openedByBridge: openedTabs.has(tab.id), status: tab.status ?? "complete" })),
    });
  }
  return { currentTabId: current ? current.id : null, windows };
}

const RESTRICTED = /cannot access|cannot be scripted|chrome:\/\/|extensions gallery|missing host permission|error page/i;

/** Runs a content.js operation in the tab's top frame: { result, refs, nextRef } or { error }. */
export async function inPage(tab, op, args) {
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    const [frame] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (name, input) => globalThis.__openclaudeBridge.run(name, input), args: [op, args] });
    return frame?.result ?? { error: { code: "page_error", message: "The page didn't answer." } };
  } catch (error) {
    const message = error?.message ?? String(error);
    if (RESTRICTED.test(message)) throw new ToolError("restricted_page", `Chrome doesn't let extensions read ${tab.url || "this page"} (${message}).`);
    throw new ToolError("page_error", message);
  }
}
