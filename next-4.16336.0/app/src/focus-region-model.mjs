// F6 / Shift+F6 page-area focus cycling, the pure half of use-focus-regions.js. Claude 2.31226.0
// ca1d33d05-syscFDea.js (FocusRegionNavigationOn, readable :1-1563): y (:52-68 region order), Ee (:69 regions the
// cycle only leaves), D (:183-215 one visible stop per region instance, in region order), k (:247-252 the stop that
// holds the focus), He (:275-283 the next stop), bn (:1516-1561 the F6 listener) and the focus_next_region /
// focus_previous_region bindings (shared-1-BPVqFfwb.js :15304-15330, 'Focus next page area' / 'Focus previous page
// area'). The reference mounts it behind a GrowthBook gate (shared-21 ck '__gb__1686253244'); the local app has no
// remote flags and keeps it on.
//
// Local stops are DOM markers: data-focus-region="<region>" on the landing element, with
// data-focus-region-instance (one stop per instance: each side pane), data-focus-region-ring ("overlay" default,
// "box" for a ring drawn on the element itself, "none" for F's ring: false), data-focus-region-ring-on (a closest()
// selector for the element that draws the ring), data-focus-region-clear-on-input (F clearOnInput: typing clears
// the ring), data-focus-region-holds ("contains" or a closest() selector: the entry's holds(),
// focus anywhere inside counts as this stop; without it only the landing itself does, k's default), data-focus-region-order="pane" (the entry's order(): placed
// by its split pane and tile) and data-focus-region-fallback (kt: the collapsed sidebar's trigger stands in only
// while the sidebar itself shows nothing).

// w13-chatui-artifact-inline: 3.6556.2 ca1d33d05-DdOyUCec.js `xe` places "artifact" (the open Chat artifact's box,
// cbaae0d6d `xe({kind:"artifact",boxRef:Pe,…})`) after "sidePanel", and `Se = new Set(["question","artifact"])` passes it.
// w13-close-chat-messages: `xe` also places "lastMessage" after "conversation" — ca1d33d05 rn (the chatLayout region set
// ca2ef848d mounts, `f(Hs,{kind:"chatLayout",…,autoscrollRef:C,owns:Vt,…})`) registers it as
// `N("lastMessage",{landing:()=>…isFullscreen?null:me(t.current),focus:e=>{V(e,{ring:!1}),…setPinToBottom(!0),
// …scrollToBottom("auto",{onlyIfPinned:!0})}})`, me = c1f21cfe3 `i`: the feed article with the highest aria-posinset.
export const REGION_ORDER = Object.freeze([
  "navigation", "discoveryScreen", "header", "conversation", "lastMessage", "main", "question", "composer", "sidePanel", "artifact", "overview",
  "activity", "sessionDetails", "preview", "terminal", "tile", "projectKnowledge",
]);
// c1f21cfe3 `n` / `t` / `r`: the last message is the feed's article with the highest aria-posinset.
export const LAST_MESSAGE_SELECTOR = '[role="feed"] [role="article"][aria-posinset]';
/** c1f21cfe3 `i`: of `articles` (elements with aria-posinset), the one with the highest position, or null. */
export function lastFeedArticle(articles) {
  let last = null, position = -1;
  for (const article of articles ?? []) {
    const value = Number(article?.getAttribute?.("aria-posinset"));
    if (value > position) { last = article; position = value; }
  }
  return last;
}
// Ee: a question card is a stop only while it holds the focus (the cycle leaves it, never lands on it); so is the artifact.
export const PASS_THROUGH_REGIONS = new Set(["question", "artifact"]);

// w13-chatui-artifact-inline: 3.6556.2 ca1d33d05-DdOyUCec.js `en` — the artifact landing is a labelled group while
// the jump ring is on it (tn: `prepare:()=>en(e,a)`, a = the title trimmed or "Artifact"); V's clear runs the undo.
// Local landings name it with data-focus-region-label (use-focus-regions.js landStop).
export function labelLandingGroup(element, label) {
  element.setAttribute("role", "group");
  element.setAttribute("aria-label", label);
  return () => { element.removeAttribute("role"); element.removeAttribute("aria-label"); };
}
export const NOTIFICATIONS_STOP = "notifications";

// The side pane kinds (tile-layout-model.mjs PANE_KINDS) as reference regions: Preview and Terminal have their own,
// every other pane is a "tile".
export function tileRegion(tileId) {
  return tileId === "preview" ? "preview" : tileId === "terminal" ? "terminal" : "tile";
}

// focus_next_region: F6 (and Ctrl+F6 off macOS); focus_previous_region: Shift+F6 (Ctrl+Shift+F6 off macOS). The ⌘F6
// pair is the web app's only.
export function regionDirection(event, { mac = true } = {}) {
  if (event.key !== "F6" || event.altKey || event.metaKey) return null;
  if (event.ctrlKey && mac) return null;
  return event.shiftKey ? "backward" : "forward";
}

// Ne: compare two order keys element by element, a missing element counting as -Infinity.
export function compareOrderKeys(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? -Infinity, y = b[i] ?? -Infinity;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * D: the stops, one per region instance (the last visible landing of that instance; a `fallback` landing only
 * when the instance has no other), sorted by the reference key: [0, region rank] for a landing without an order
 * (the sidebar, the content area), [1, ...order, region rank] for one placed by its pane (order = pane left, pane
 * top, reading index of its tile) — then document order. `landings` are {region, instance, index, order?,
 * fallback?} in document order; unknown regions are dropped. `conversation`: a code conversation (its feed) is on
 * the page, so "main" gives way to the conversation's "header" stop when there is one.
 */
export function orderStops(landings, { conversation = false } = {}) {
  const byKey = new Map(), fallbacks = new Map();
  for (const landing of landings) {
    const rank = REGION_ORDER.indexOf(landing.region);
    if (rank < 0) continue;
    const id = `${landing.region}:${landing.instance ?? ""}`;
    const key = Array.isArray(landing.order) ? [1, ...landing.order, rank] : [0, rank];
    (landing.fallback ? fallbacks : byKey).set(id, { ...landing, id, rank, key });
  }
  for (const [id, stop] of fallbacks) if (!byKey.has(id)) byKey.set(id, stop);
  if (conversation && [...byKey.values()].some((stop) => stop.region === "header"))
    for (const [id, stop] of byKey) if (stop.region === "main") byKey.delete(id);
  return [...byKey.values()].sort((a, b) => compareOrderKeys(a.key, b.key) || a.index - b.index);
}

/**
 * He: the stop after (or before) `current` among `ids`, wrapping; a pass-through stop is skipped unless it is the
 * current one. With no current stop the cycle starts at the first (or, backward, the last) stop. Null: nowhere to go.
 */
export function nextRegionStop(current, direction, ids, passThrough = new Set()) {
  const ring = ids.filter((id) => id === current || !passThrough.has(id));
  const index = current === null ? -1 : ring.indexOf(current);
  const next = index === -1
    ? ring.at(direction === "forward" ? 0 : -1)
    : ring[(index + (direction === "forward" ? 1 : -1) + ring.length) % ring.length];
  return next === undefined || passThrough.has(next) ? null : next;
}

/**
 * bn: what one F6 keydown does.
 *   null                     — not ours (the event is left alone)
 *   {type: "swallow"}        — a held F6 repeats nothing (preventDefault + stopPropagation)
 *   {type: "focus", id}      — land on that stop
 *   {type: "notifications"}  — the next stop is the toast region: its own F6 handler takes the event
 */
export function regionKeyAction(event, { mac = true, ownedFocus = false, stops = [], current = null, notifications = false, passThrough = [] } = {}) {
  if (event.key !== "F6" || event.altKey || event.isComposing || ownedFocus) return null;
  if (event.repeat) return { type: "swallow" };
  const direction = regionDirection(event, { mac });
  if (direction === null) return null;
  const ids = stops.map((stop) => stop.id);
  if (notifications) ids.push(NOTIFICATIONS_STOP);
  const next = nextRegionStop(current, direction, ids, new Set(passThrough));
  if (next === null) return null;
  if (next === NOTIFICATIONS_STOP) return { type: "notifications" };
  return stops.some((stop) => stop.id === next) ? { type: "focus", id: next } : null;
}

// gn's jump_to_* commands (ca1d33d05 :1374-1390 Q, shared-1-BPVqFfwb.js :15217-15302): each names the regions it
// jumps to, first available first. Only commands whose regions this app has are listed (no question, side panel,
// overview, activity, session details or project knowledge regions locally).
export const JUMP_COMMANDS = Object.freeze([
  { id: "jump_to_navigation", regions: ["navigation"], icon: "Sidebar" },
  { id: "jump_to_main_content", regions: ["header", "main"], icon: "BookText" },
  // w13-close-chat-messages: shared-1 `jump_to_last_message:{description:vF.description,group:"general",bang:"!jlm",
  // icon:Q("ChatSimple")}` ("Jump to last message", KoKXeDvWmu), ca1d33d05 `jump_to_last_message:Z("lastMessage")`.
  { id: "jump_to_last_message", regions: ["lastMessage"], icon: "ChatSimple" },
  { id: "jump_to_input", regions: ["composer"], icon: "Prompt" },
  // w13-chatui-artifact-inline: shared-1 SF "Jump to artifact" (`jump_to_artifact: {…, bang: "!jr", icon: Q("Artifacts")}`),
  // ca1d33d05 `jump_to_artifact: Z("artifact")` — the Chat artifact panel's body (source-chat-artifact-panel.jsx).
  { id: "jump_to_artifact", regions: ["artifact"], icon: "Artifacts" },
  { id: "jump_to_preview", regions: ["preview"], icon: "Globe" },
  { id: "jump_to_terminal", regions: ["terminal"], icon: "CommandLinePrompt" },
  { id: "jump_to_pane", regions: ["tile"], icon: "Grid" },
]);

/**
 * O: the stop a jump to `region` lands on — of that region's stops, the first one in the focused split pane or
 * outside every pane (`inScope(stop)`); null when the region has none.
 */
export function regionJumpStop(stops, region, inScope = () => true) {
  return stops.find((stop) => stop.region === region && inScope(stop)) ?? null;
}
