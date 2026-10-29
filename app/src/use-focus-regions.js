import { useEffect } from "react";
import { LAST_MESSAGE_SELECTOR, PASS_THROUGH_REGIONS, labelLandingGroup, lastFeedArticle, orderStops, regionJumpStop, regionKeyAction } from "./focus-region-model.mjs";
import { isMacPlatform } from "./pane-keys-model.mjs";
import "./focus-regions.css";

// ca1d33d05-syscFDea.js bn / F / E / yn (readable :157-175 E visible landing, :348-460 F focus with a ring,
// :1512-1515 yn the toast region, :1516-1561 bn). One document listener per window (the primary split side mounts
// it); the stops are the data-focus-region markers (focus-region-model.mjs).

const LANDING = "data-focus-region-landing";
const AROUND = "data-focus-region-around";
const INSIDE = "data-focus-region-inside";
const MODIFIERS = new Set(["Alt", "AltGraph", "CapsLock", "Control", "Fn", "FnLock", "Hyper", "Meta", "NumLock", "OS", "ScrollLock", "Shift", "Super", "Symbol", "SymbolLock"]);
// shared-1 AR / jR: focus inside a modal layer (a menu, listbox or dialog that is not aria-modal=false) yields F6.
const MODAL_LAYERS = '[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],[data-radix-popper-content-wrapper]';
const TOAST_REGION = '[role="region"][aria-live][aria-relevant="additions text"]';

// E: connected, not inert, and rendered. A split side that is not focused still has its stops (D crosses panes;
// focusing one makes that side the focused one, source-split-view.jsx).
// modalRoot: the command palette's own inert #root (holdModalInert) does not count, so its jump rows can ask.
function visibleLanding(element, doc, { modalRoot = false } = {}) {
  if (!element || element.ownerDocument !== doc || !element.isConnected || element.closest(modalRoot ? "[inert]:not(#root)" : "[inert]")) return false;
  if (typeof element.checkVisibility === "function") return element.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true });
  return element.getClientRects().length > 0;
}

// H: a pane-placed landing's order — its split pane's rounded left / top, then its tile's index in the pane's
// reading order (a landing outside every tile, the session title, reads as the chat tile's). The instance gets the
// pane index (the reference's `pane${i}` instances).
function panePlacement(element) {
  const pane = element.closest(".split-pane");
  const rect = pane?.getBoundingClientRect();
  const tiles = pane ? [...pane.querySelectorAll("[data-tile-id]")] : [];
  const tile = element.closest("[data-tile-id]") ?? tiles.find((node) => node.getAttribute("data-tile-id") === "chat") ?? null;
  return {
    // source-split-view.jsx data-pane-index: 0 the primary pane, i the ith extra pane of the grid.
    pane: Number(pane?.getAttribute("data-pane-index")) || 0,
    order: [Math.round(rect?.left ?? 0), Math.round(rect?.top ?? 0), tile ? tiles.indexOf(tile) : -1],
  };
}

// D's conversation check: a code conversation's feed is on the page.
function conversationShown(doc) {
  return [...doc.querySelectorAll('[data-focus-region="conversation"]')].some((element) => element.matches('[role="feed"]') || !!element.querySelector('[role="feed"]'));
}

// The feed a "lastMessage" landing scrolls (its focus pins the conversation to the bottom).
const scrollers = new WeakMap();

export function collectRegionStops(doc = document, { modalRoot = false } = {}) {
  const elements = new Map();
  const landings = [...doc.querySelectorAll("[data-focus-region]")].filter((element) => visibleLanding(element, doc, { modalRoot })).map((element, index) => {
    const placed = element.getAttribute("data-focus-region-order") === "pane" ? panePlacement(element) : null;
    const own = element.getAttribute("data-focus-region-instance") ?? "";
    const landing = { region: element.getAttribute("data-focus-region"), instance: placed ? `pane${placed.pane}:${own}` : own, index,
      order: placed?.order, fallback: element.hasAttribute("data-focus-region-fallback") };
    elements.set(`${landing.region}:${landing.instance}:${landing.fallback}`, element);
    return landing;
  });
  // w13-close-chat-messages: ca1d33d05 rn's "lastMessage" — the chat column's feed (data-focus-region-last-message,
  // source-transcript.jsx on a Chat conversation) lands on its last article (c1f21cfe3 `i`), one stop per split pane.
  for (const feed of doc.querySelectorAll("[data-focus-region-last-message]")) {
    if (!visibleLanding(feed, doc, { modalRoot })) continue;
    const article = lastFeedArticle(feed.querySelectorAll(LAST_MESSAGE_SELECTOR));
    if (!article) continue;
    const pane = feed.closest(".split-pane")?.getAttribute("data-pane-index");
    const landing = { region: "lastMessage", instance: pane == null ? "" : `pane${pane}`, index: landings.length, fallback: false };
    elements.set(`${landing.region}:${landing.instance}:false`, article);
    scrollers.set(article, feed);
    landings.push(landing);
  }
  return orderStops(landings, { conversation: conversationShown(doc) }).map((stop) => ({ ...stop, element: elements.get(`${stop.id}:${stop.fallback}`) }));
}

// k: the entry's holds() — data-focus-region-holds="contains": focus anywhere inside the landing; a selector: focus
// anywhere inside the landing's closest() match (the composer's whole form); none: only the landing itself.
function holdsFocus(stop, active) {
  if (!active) return false;
  const holds = stop.element.getAttribute("data-focus-region-holds");
  if (!holds) return stop.element === active;
  return (holds === "contains" ? stop.element : stop.element.closest(holds) ?? stop.element).contains(active);
}

// yn: the toast region while it shows a card.
function notificationRegion(doc) {
  for (const region of doc.querySelectorAll(TOAST_REGION)) if (region.querySelector('[aria-modal="false"]')) return region;
  return null;
}

function modalFocus(active) {
  const layer = active?.closest?.(MODAL_LAYERS);
  return !!layer && layer.getAttribute("aria-modal") !== "false" && !layer.closest("[data-ask-user-input-banner]");
}

let clearRing = null;
// F: focus the landing (a temporary tabindex=-1 when it is not focusable) and draw the region ring on it, or on
// ringOn; the ring goes with a pointer press on it or a focus that leaves it, and with clearOnInput also with the
// next non-modifier key or input. prepare (3.6556.2 ca1d33d05 V `prepare:i` … `a=i?.()`, cleared first by m): runs
// before the focus and returns its undo.
export function focusRegionLanding(element, { ring = "overlay", ringOn = element, clearOnInput = false, prepare } = {}) {
  clearRing?.();
  const undoPrepare = prepare?.();
  const doc = element.ownerDocument, view = doc.defaultView;
  let temporary = !element.hasAttribute("tabindex") && element.tabIndex < 0;
  const observer = new view.MutationObserver(() => { temporary = false; });
  if (temporary) {
    element.setAttribute("tabindex", "-1");
    observer.observe(element, { attributeFilter: ["tabindex"] });
  }
  const separate = ringOn !== element;
  if (ring !== "none") {
    const position = view.getComputedStyle(ringOn).position;
    ringOn.setAttribute(LANDING, ring === "overlay" && ["relative", "absolute", "fixed", "sticky"].includes(position) ? "overlay" : "");
    if (separate) { ringOn.setAttribute(AROUND, ""); element.setAttribute(INSIDE, ""); }
  }
  element.focus({ preventScroll: true, focusVisible: true });
  const key = (event) => { if (!MODIFIERS.has(event.key)) clear(); };
  const focusin = (event) => {
    if (event.target === element) return;
    const dialog = event.target instanceof view.Element ? event.target.closest('[role="dialog"], [role="alertdialog"]') : null;
    if (dialog === null || dialog.contains(ringOn) || ringOn.contains(dialog)) clear();
  };
  function clear() {
    undoPrepare?.();
    if (temporary && observer.takeRecords().length === 0) element.removeAttribute("tabindex");
    observer.disconnect();
    ringOn.removeAttribute(LANDING); ringOn.removeAttribute(AROUND); element.removeAttribute(INSIDE);
    doc.removeEventListener("focusin", focusin, true);
    ringOn.removeEventListener("pointerdown", clear);
    element.removeEventListener("keydown", key);
    element.removeEventListener("beforeinput", clear);
    if (clearRing === clear) clearRing = null;
  }
  if (doc.activeElement !== element && !element.contains(doc.activeElement)) { clear(); return false; }
  clearRing = clear;
  doc.addEventListener("focusin", focusin, true);
  ringOn.addEventListener("pointerdown", clear);
  if (clearOnInput) {
    element.addEventListener("keydown", key);
    element.addEventListener("beforeinput", clear);
  }
  return true;
}

function landStop(stop) {
  const element = stop.element;
  // ca1d33d05 rn lastMessage focus: `V(e,{ring:!1})`, then setPinToBottom(!0) and scrollToBottom("auto",{onlyIfPinned:!0}).
  if (stop.region === "lastMessage") {
    focusRegionLanding(element, { ring: "none" });
    const feed = scrollers.get(element);
    if (feed) feed.scrollTop = feed.scrollHeight;
    return;
  }
  const ringOnSelector = element.getAttribute("data-focus-region-ring-on");
  const ringOn = (ringOnSelector && element.closest(ringOnSelector)) || element;
  // data-focus-region-label: the landing reads as a labelled group while it holds the jump (ca1d33d05 tn → en).
  const label = element.getAttribute("data-focus-region-label");
  focusRegionLanding(element, { ring: element.getAttribute("data-focus-region-ring") || "overlay", ringOn,
    clearOnInput: element.hasAttribute("data-focus-region-clear-on-input"),
    prepare: label ? () => labelLandingGroup(element, label) : undefined });
}

// Pe / Fe: a jump stays in the focused split pane (or lands outside every pane).
function inFocusedPane(stop, doc) {
  const pane = doc.querySelector(".split-pane[data-focused]");
  return pane === null || pane.contains(stop.element) || stop.element.closest(".split-pane") === null;
}

// Ve / cn: some of `regions` has a stop to jump to (asked while the palette holds #root inert).
export function regionJumpAvailable(regions, doc = typeof document === "undefined" ? null : document) {
  if (!doc) return false;
  const stops = collectRegionStops(doc, { modalRoot: true });
  return regions.some((region) => regionJumpStop(stops, region, (stop) => inFocusedPane(stop, doc)) !== null);
}

// fn / A (asRow): after the palette has closed and handed focus back, land on the first of `regions` that has a
// stop — the terminal's rowFocus (Tt) focuses its input directly — else leave the focus where it returned.
export function jumpToRegions(regions, doc = document) {
  doc.defaultView.setTimeout(() => {
    const stops = collectRegionStops(doc).filter((stop) => stop.region !== "conversation");
    for (const region of regions) {
      const stop = regionJumpStop(stops, region, (candidate) => inFocusedPane(candidate, doc));
      if (!stop) continue;
      if (region === "terminal") {
        const input = [...stop.element.querySelectorAll("textarea")].find((node) => node.checkVisibility?.() ?? true);
        if (input) { input.focus(); return; }
      }
      landStop(stop);
      return;
    }
  }, 0);
}

export function useFocusRegionNavigation(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const doc = document, mac = isMacPlatform();
    const onKey = (event) => {
      if (event.key !== "F6") return;
      const active = doc.activeElement;
      const stops = collectRegionStops(doc).filter((stop) => stop.region !== "conversation");
      const toasts = notificationRegion(doc);
      // k: the stop holding the focus (a pass-through region first gives way to the others).
      const holds = (stop) => holdsFocus(stop, active);
      const holding = stops.filter((stop) => !PASS_THROUGH_REGIONS.has(stop.region)).find(holds) ?? stops.find(holds);
      const current = toasts && active && toasts.contains(active) ? "notifications" : holding?.id ?? null;
      const action = regionKeyAction(event, {
        mac, stops, current, notifications: !!toasts,
        ownedFocus: modalFocus(active) || !!active?.closest?.('canvas, [role="application"]'),
        passThrough: stops.filter((stop) => PASS_THROUGH_REGIONS.has(stop.region)).map((stop) => stop.id),
      });
      if (!action || action.type === "notifications") return;
      event.preventDefault();
      event.stopPropagation();
      if (action.type === "focus") landStop(stops.find((stop) => stop.id === action.id));
    };
    doc.addEventListener("keydown", onKey, { capture: true });
    return () => { doc.removeEventListener("keydown", onKey, { capture: true }); clearRing?.(); };
  }, [enabled]);
}
