// The service worker's copy of the refs content.js handed out. content.js keeps ref → element, but that map is gone
// once the page reloads; this copy still knows which tab and which read_page a ref came from, so an old ref is
// answered as stale_ref (or as belonging to another tab), never as a silent miss.
//
// Names come from one counter for every tab (ref_1, ref_2 …, kept in storage.session across worker restarts), so no
// name is ever handed out twice: a ref can't quietly point at a new element after read_page ran again.
// Each tab has a generation: read_page and any navigation of the tab start a new one, and refs of an older one are void.
import { ToolError } from "./errors.js";

const MAX_ISSUED = 50_000;
const issued = new Map(); // "ref_N" → { tabId, generation, role, name }
const generations = new Map(); // tabId → current generation
let counter = 1; // the next ref number
let loaded = null;
let lock = Promise.resolve();

function load() {
  loaded ??= chrome.storage.session.get("refCounter").then(({ refCounter }) => { if (Number.isInteger(refCounter) && refCounter > counter) counter = refCounter; }).catch(() => {});
  return loaded;
}

/** Runs fn with the counter to itself (read_page and find on two tabs at once must not hand out the same names). */
export function withRefs(fn) {
  const run = lock.then(async () => { await load(); return fn(counter); });
  lock = run.catch(() => {});
  return run;
}

const generationOf = (tabId) => generations.get(tabId) ?? 0;

/** A navigation of the tab, or a read_page on it: every ref handed out for it before is void. */
export function invalidateTab(tabId) {
  generations.set(tabId, generationOf(tabId) + 1);
}
export function forgetTab(tabId) {
  generations.delete(tabId);
}

/** What content.js handed out; replace: read_page (a new generation), otherwise (find) they join the current one. */
export function record(tabId, handedOut, nextRef, { replace }) {
  if (replace) invalidateTab(tabId);
  const generation = generationOf(tabId);
  for (const [ref, info] of Object.entries(handedOut ?? {})) issued.set(ref, { tabId, generation, role: info?.role ?? null, name: info?.name ?? "" });
  if (Number.isInteger(nextRef) && nextRef > counter) {
    counter = nextRef;
    chrome.storage.session.set({ refCounter: counter }).catch(() => {});
  }
  while (issued.size > MAX_ISSUED) issued.delete(issued.keys().next().value);
}

/** Throws unless `ref` is from the latest read_page/find on this tab. content.js still checks the element is there. */
export function checkRef(tabId, ref) {
  if (typeof ref !== "string" || !/^ref_\d+$/.test(ref)) throw new ToolError("bad_request", `${JSON.stringify(ref)} isn't a ref (refs look like ref_12).`);
  const entry = issued.get(ref);
  if (!entry) {
    if (Number(ref.slice(4)) < counter) throw new ToolError("stale_ref", `${ref} is no longer valid. Call read_page for fresh refs.`);
    throw new ToolError("unknown_ref", `${ref} wasn't handed out by read_page or find.`);
  }
  if (entry.tabId !== tabId) throw new ToolError("ref_wrong_tab", `${ref} belongs to tab ${entry.tabId}, not tab ${tabId}. Refs only work on the tab whose read_page or find returned them.`);
  if (entry.generation !== generationOf(tabId)) throw new ToolError("stale_ref", `${ref} is from an earlier read_page, or the page has navigated since. Call read_page for fresh refs.`);
  return entry;
}
