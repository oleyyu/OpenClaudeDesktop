import React, {
  createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect,
  useMemo, useRef, useState, useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { SourceTooltip } from "./source-tooltip";
import { SourceShortcut } from "./source-shortcut";
import { tooltipContentKey } from "./generated/code-current/tooltip-structure.mjs";
import { suppressNativeContextMenu } from "./generated/files-changes/menu-context-guard.mjs";
import { preventContextMenu } from "./generated/files-changes/diff-context-guard.mjs";
import { t } from "../electron/i18n/index.mjs";
import {
  CONTEXT_MENU_LAYER_OFFSET, MENU_LAYER_OFFSET, NESTED_SIDE_OFFSET, ROOT_SIDE_OFFSET, SAFE_POLYGON_LINGER,
  SUBMENU_HOVER_DELAY, isNumericText, menuLayer, moveHighlight, nestedAnchor, normalizeShortcut,
  pendingRows, positionMenu, restoreDecision, safePolygonStep, sheetBranch, skeletonPlan, typeaheadMatch, typeaheadState,
} from "./menu-model.mjs";
import "./source-menu.css";

/*
 * Shared CDS Menu (2.2553.1 shared-frame B_/Wr over Base UI xp), written
 * independently from the traced behavior:
 * - yl portal root carrying data-cds-portal / density / mode / theme / font
 *   with --cds-portal-z (al: layer base + 100, menu offset 20, cursor-anchored
 *   context menu offset 30).
 * - Positioner: root sideOffset 6, nested 2 (Filter passes 4), a cursor
 *   anchor uses the Base UI context-menu defaults (sideOffset -5, alignOffset
 *   2), collision shifting, --available-height / --available-width.
 * - Popup pg/sg: rounded-card, surface-3, shadow-panel, body padding 4px with
 *   the official scroll-fade-y mask; no transition on desktop. Base UI state
 *   attributes: data-open/closed,
 *   data-side/align, data-starting-style for one frame, data-ending-style
 *   until the element's animations finish (instant on desktop).
 * - One data-highlighted item that also owns DOM focus; data-disabled items are
 *   never highlighted. disabledReason (2.42304.0 shared-frame XS `ie`, `I = disabled && Wc(p)`, Wc = `!!e`) is any
 *   ReactNode — a string or the chunks' <FormattedMessage> element: an Item that is given one (even an enabled one)
 *   sits in a role="none" wrapper under a right-side multiline tooltip that does not close on click, next to the Yc
 *   hidden [data-cds-disabled-reason] span keyed by qc (tooltipContentKey); only a disabled Item with a truthy
 *   reason fills the tooltip and the span and joins the span's id into aria-describedby.
 * - Popup header / footer / maxVisibleItems (2.42304.0 shared-frame KS → Hx): with a header or a footer the body
 *   becomes Hx's flex column — the header (zx) and footer (Bx) stay put while only the list between them scrolls
 *   (Rx, `pt-0` under a header); SearchablePopup (yC) passes its search field as the header. maxVisibleItems caps
 *   the list at `calc(n * max(--cds-h-control, --cds-leading-body) + gutters)` (Vx).
 * - Close reasons (Cg/Id): escape-key restores the trigger, focus-out does
 *   not, outside-press restores only when focus is still inside/body,
 *   item-click goes to finalFocus (or the trigger). A pending outside-press
 *   close is dropped when the same popup instance is re-targeted (a
 *   contextmenu opening a new menu inside the mousedown task).
 * - SubmenuTrigger (Base UI, mouse only): opens 100ms after the pointer
 *   enters and rests, closes with closeDelay 0 through a safe polygon toward
 *   the child popup while the parent popup's other rows are pointer-inert.
 * - Popup onContextMenu is opt-in, as in 2.42304.0, where the CDS Popup has no handler of its own and only some
 *   call sites pass one (React events from a submenu's portal bubble to the root popup's handler):
 *   contextMenuGuard (true / "editable") = ca5db7aaf F — the pane settings, diff-scope, Files tree, Files search
 *   and file viewer menus: a right-click inside the open menu never opens the native menu over it, except in a text
 *   field (shared-156 KB, e.g. a menu's search box); contextMenuGuard="always" = c82eca2bd Be and its copies
 *   (c0cdf4a08 p, cfe7c4b3b F/V, c96d752d0 xNe …) — the Changes, commit, breadcrumb, terminal and tab-strip menus:
 *   always prevented. An explicit onContextMenu handler takes precedence over the guard.
 * - Sheet branch gated by matchMedia('(pointer: coarse)') (eh/mm); it is the
 *   only place a transition exists (ih/oh/lh classes, duration-sheet ease-out,
 *   motion-reduce none). The lazily-loaded official MenuSheetPopup module is
 *   not in the bundle, so only those traced classes are reproduced.
 */

const COARSE_QUERY = "(pointer: coarse)";
const PORTAL_ATTRIBUTES = ["data-mode", "data-chat-source-version", "data-cds-theme", "data-platform", "data-font", "data-page-bg"];
const subscribeCoarse = (listener) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(COARSE_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const readCoarse = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(COARSE_QUERY).matches;

/** Live coarse-pointer store (shared-frame mm). False on a Mac with a mouse. */
export function useCoarsePointer() {
  return useSyncExternalStore(subscribeCoarse, readCoarse, () => false);
}

const TreeContext = createContext(null);
const PopupContext = createContext(null);
const SubmenuContext = createContext(null);
const GroupContext = createContext(null);

export function useMenuPopup() {
  return useContext(PopupContext);
}

function portalContext(source) {
  const result = { "data-density": "compact" };
  const root = typeof document === "undefined" ? null : document.documentElement;
  for (const name of PORTAL_ATTRIBUTES) {
    const node = source?.closest?.(`[${name}]`) || root?.querySelector?.(`[${name}]`) || root;
    const value = node?.getAttribute?.(name);
    if (value != null) result[name] = value;
  }
  return result;
}

const menuItems = (popup) => popup
  ? [...popup.querySelectorAll('[role^="menuitem"]')].filter((node) => node.closest('[role="menu"]') === popup)
  : [];
const enabledItems = (popup) => menuItems(popup).filter((node) => !node.hasAttribute("data-disabled"));

// floating-ui useListNavigation focusItemOnOpen "auto" (vendor-frame-BmPfNbgY.js:20106, :20180-20190, :20357-20359):
// a root menu highlights its first row on open only when a key opened it (Enter / Space / an arrow on the
// trigger); a pointer press (click or right-click) leaves every row unhighlighted and focuses the popup, so
// the highlight follows hover and ArrowDown starts at the first row. The most recent input decides.
const KEYBOARD_OPEN_KEYS = new Set(["Enter", " ", "ArrowDown", "ArrowUp"]);
let lastKeyboardOpenAt = -Infinity;
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("keydown", (event) => {
    lastKeyboardOpenAt = KEYBOARD_OPEN_KEYS.has(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey ? performance.now() : -Infinity;
  }, true);
  document.addEventListener("pointerdown", () => { lastKeyboardOpenAt = -Infinity; }, true);
}
const keyboardOpened = () => typeof performance !== "undefined" && performance.now() - lastKeyboardOpenAt < 1000;

/**
 * Trigger contract (A_/zg/Button ghost): aria-haspopup, aria-expanded,
 * data-popup-open while open, and ArrowDown/ArrowUp on the focused closed
 * trigger opening the menu with the first/last item highlighted.
 */
export function menuTriggerProps({ open, onOpen, disabled = false }) {
  return {
    "aria-haspopup": "menu",
    "aria-expanded": !!open,
    "data-popup-open": open ? "" : undefined,
    onKeyDown: (event) => {
      if (open || disabled || event.nativeEvent?.isComposing || event.isComposing) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      onOpen?.(event.key === "ArrowDown" ? "first" : "last", event);
    },
  };
}

/**
 * The Popup's onContextMenu: an explicit handler wins; otherwise contextMenuGuard picks the generated original
 * (true / "editable": ca5db7aaf F, "always": c82eca2bd Be); otherwise none (the 2.42304.0 Popup default).
 */
export function menuContextMenuHandler(contextMenuGuard, onContextMenu) {
  if (onContextMenu !== undefined) return onContextMenu;
  if (contextMenuGuard === true || contextMenuGuard === "editable") return suppressNativeContextMenu;
  if (contextMenuGuard === "always") return preventContextMenu;
  return undefined;
}

// Hx (shared-frame): Vx row height, and the scroll body's max-height for maxVisibleItems.
const MENU_ROW_HEIGHT = "max(var(--cds-h-control), var(--cds-leading-body))";
export function menuListMaxHeight(maxVisibleItems, hasHeader) {
  if (maxVisibleItems === undefined) return undefined;
  return `calc(${maxVisibleItems} * ${MENU_ROW_HEIGHT} + ${hasHeader ? "var(--cds-menu-gutter, 0.25rem) + 0.25rem" : "2 * var(--cds-menu-gutter, 0.25rem)"})`;
}

function MenuPopup(props) {
  const submenu = useContext(SubmenuContext);
  if (submenu && !submenu.open) return null;
  return <PopupImpl {...props} submenu={submenu} />;
}

function PopupImpl({
  submenu, anchor: anchorProp, trigger: triggerProp, point, side, align = "start", sideOffset, alignOffset = 0, collisionPadding = 8,
  layer: layerKind = "menu", label, labelledBy, dataCds = "Menu", className = "", onClose, finalFocus, initialHighlight, children, id: idProp,
  onKeyDown: consumerKeyDown, style, popupRef: externalPopupRef, layerBase: rootLayerBase, onContextMenu: contextMenuHandler, contextMenuGuard,
  header, footer, maxVisibleItems,
}) {
  const onContextMenu = menuContextMenuHandler(contextMenuGuard, contextMenuHandler);
  const parentTree = useContext(TreeContext);
  const nested = !!submenu;
  const coarse = useCoarsePointer();
  const sheet = sheetBranch(coarse, parentTree?.sheet);
  // al(): a nested popup always takes the menu offset inside its parent band;
  // only a cursor-anchored root takes the contextmenu offset.
  // A root menu opened inside a modal surface passes that surface's layer base
  // (al() reads it from the enclosing layer context in the source); nested
  // popups inherit their parent's.
  const layer = menuLayer(parentTree?.layerBase ?? rootLayerBase ?? 0, !nested && layerKind === "contextmenu" ? CONTEXT_MENU_LAYER_OFFSET : MENU_LAYER_OFFSET);
  const depth = (parentTree?.depth ?? -1) + 1;
  const generatedId = useId();
  const id = idProp ?? (nested ? submenu.id : generatedId);
  const portalRef = useRef(null), positionerRef = useRef(null), popupRef = useRef(null), backdropRef = useRef(null);
  const [highlighted, setHighlightedState] = useState(null);
  const highlightedRef = useRef(null);
  highlightedRef.current = highlighted;
  const closing = useRef(false), alive = useRef(true), typing = useRef(null), outsideTimer = useRef(null);
  const [covered, setCovered] = useState(false);
  const popups = useMemo(() => parentTree?.popups ?? new Set(), [parentTree]);
  const anchor = nested ? submenu.triggerRef.current : anchorProp;
  const trigger = nested ? submenu.triggerRef.current : triggerProp === undefined ? (point ? null : anchorProp) : triggerProp;
  const resolvedSide = side ?? (nested ? "right" : "bottom");
  const resolvedOffset = sideOffset ?? (nested ? NESTED_SIDE_OFFSET : ROOT_SIDE_OFFSET);
  // Roots: "first" / "last" (keyboard entry), "popup" (focus the popup, nothing highlighted), null (leave focus
  // alone, e.g. a search field takes it); undefined follows focusItemOnOpen "auto" (keyboardOpened above).
  const [highlightOnOpen] = useState(() => initialHighlight !== undefined ? initialHighlight
    : nested ? (submenu.focusFirst.current ? "first" : null) : keyboardOpened() ? "first" : "popup");
  const latest = useRef({});
  latest.current = { onClose, finalFocus, consumerKeyDown, anchor, trigger };

  const highlight = useCallback((element, { focus = true } = {}) => {
    if (element && element.hasAttribute("data-disabled")) return;
    setHighlightedState(element);
    if (focus && element && document.activeElement !== element) element.focus({ preventScroll: true });
  }, []);

  const focusFirst = useCallback(() => {
    const first = enabledItems(popupRef.current)[0];
    if (first) highlight(first);
  }, [highlight]);

  const requestClose = useCallback((reason) => {
    if (closing.current || !alive.current) return;
    // A nested popup never closes alone through the close pipeline: item
    // activation, outside presses and Escape at the document level close the
    // whole tree from the root, whose trigger then receives focus.
    if (nested) { parentTree?.rootClose?.(reason); return; }
    closing.current = true;
    const popup = popupRef.current, backdrop = backdropRef.current;
    const active = document.activeElement;
    const decision = restoreDecision({
      reason,
      activeInsidePopup: !!active && (popup?.contains(active) || [...popups].some((node) => node.contains(active))),
      activeIsBody: !active || active === document.body,
      finalFocus: latest.current.finalFocus,
    });
    const restore = () => {
      const { trigger: owner, finalFocus: target } = latest.current;
      // Ag(): hand focus back only while it is lost (body) or still inside the
      // tree; an action that already moved focus elsewhere keeps it.
      const now = document.activeElement;
      const lost = !now || now === document.body || now === popup || popup?.contains(now) || [...popups].some((node) => node.contains(now));
      if (decision === "trigger") {
        if (lost && owner?.isConnected) owner.focus({ preventScroll: true });
      } else if (decision === "final") {
        const node = typeof target === "function" ? target() : target;
        if (lost && node?.isConnected) node.focus({ preventScroll: true });
      }
    };
    const finish = () => {
      latest.current.onClose?.(reason);
      // Item activation lets the parent's batched selection/close update land
      // before the editor or trigger takes focus (retained local behavior).
      if (reason === "item-click") requestAnimationFrame(restore);
      else restore();
    };
    if (!popup) { finish(); return; }
    popup.setAttribute("data-ending-style", "");
    popup.removeAttribute("data-open");
    popup.setAttribute("data-closed", "");
    backdrop?.setAttribute("data-ending-style", "");
    // Force style resolution so any CSS transition exists before it is queried
    // (Base UI Al/Ml: "ending" lasts until the element's own animations finish;
    // getAnimations() without subtree, so the sg body's scroll-timeline fade
    // animations never hold a close).
    void popup.offsetWidth;
    const animations = [popup, backdrop].filter(Boolean).flatMap((node) => node.getAnimations());
    if (!animations.length) { finish(); return; }
    let done = false;
    const settle = () => { if (!done) { done = true; finish(); } };
    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(settle);
    setTimeout(settle, 1000);
  }, [popups, nested, parentTree]);

  // Registry of every popup node in this tree (outside-press containment).
  useLayoutEffect(() => {
    const node = popupRef.current;
    popups.add(node);
    return () => { popups.delete(node); };
  }, [popups]);

  useEffect(() => () => { alive.current = false; clearTimeout(outsideTimer.current); }, []);

  // Re-targeting the same instance (new anchor or cursor point rendered from
  // the contextmenu event of the very mousedown that scheduled an outside
  // press) supersedes that pending close: the press belongs to the new menu.
  useLayoutEffect(() => { clearTimeout(outsideTimer.current); outsideTimer.current = null; }, [anchor, trigger, point?.x, point?.y]);

  // Base UI transition status: data-starting-style for exactly one frame.
  useLayoutEffect(() => {
    const popup = popupRef.current, backdrop = backdropRef.current;
    popup?.setAttribute("data-starting-style", "");
    backdrop?.setAttribute("data-starting-style", "");
    const frame = requestAnimationFrame(() => {
      popup?.removeAttribute("data-starting-style");
      backdrop?.removeAttribute("data-starting-style");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Positioner (desktop only): measure, place, expose --available-height, and
  // follow content growth or window resizes without closing.
  useLayoutEffect(() => {
    if (sheet) return undefined;
    const positioner = positionerRef.current, popup = popupRef.current;
    if (!positioner || !popup) return undefined;
    const place = () => {
      let anchorRect;
      if (point) anchorRect = { left: point.x, right: point.x, top: point.y, bottom: point.y, width: 0, height: 0 };
      else if (nested) {
        const row = submenu.triggerRef.current?.getBoundingClientRect();
        if (!row) return;
        anchorRect = nestedAnchor(submenu.triggerRef.current.closest('[role="menu"]')?.getBoundingClientRect(), row);
      } else anchorRect = anchor?.getBoundingClientRect();
      if (!anchorRect) return;
      const size = popup.getBoundingClientRect();
      const result = positionMenu({
        anchor: anchorRect, size: { width: size.width, height: size.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        side: resolvedSide, align, sideOffset: resolvedOffset, alignOffset, collisionPadding,
      });
      positioner.style.left = `${result.left}px`;
      positioner.style.top = `${result.top}px`;
      positioner.style.setProperty("--available-height", `${result.availableHeight}px`);
      positioner.style.setProperty("--available-width", `${result.availableWidth}px`);
      positioner.style.visibility = "";
      for (const node of [positioner, popup]) { node.setAttribute("data-side", result.side); node.setAttribute("data-align", result.align); }
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(popup);
    window.addEventListener("resize", place);
    return () => { observer?.disconnect(); window.removeEventListener("resize", place); };
  }, [sheet, anchor, point, nested, submenu, resolvedSide, align, resolvedOffset, alignOffset, collisionPadding]);

  // Initial highlight: first item (keyboard-opened root or submenu) or last
  // (ArrowUp from the trigger); "popup" focuses the popup with no highlighted
  // row. Focus lands on the next frame, as before.
  useLayoutEffect(() => {
    const list = enabledItems(popupRef.current);
    const target = highlightOnOpen === "last" ? list[list.length - 1] : highlightOnOpen === "first" ? list[0] : null;
    if (target) setHighlightedState(target);
    if (nested) submenu.focusFirst.current = false;
    if (!target && highlightOnOpen === null) return undefined;
    const frame = requestAnimationFrame(() => {
      if (!closing.current) (target ?? popupRef.current)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (highlighted && !highlighted.isConnected) setHighlightedState(enabledItems(popupRef.current)[0] ?? null);
  });

  // Root-only document listeners: outside press and Escape/Tab.
  useEffect(() => {
    if (nested) return undefined;
    const controlled = (owner, target) => {
      if (!owner) return false;
      if (owner.contains(target)) return true;
      const controls = owner.getAttribute("aria-controls");
      return !!(controls && owner.ownerDocument.getElementById(controls)?.contains(target));
    };
    const pointer = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if ([...popups].some((node) => node.contains(target))) return;
      // qg: a press on the trigger (or its aria-controls target) is the
      // trigger's own toggle, not an outside press.
      if (controlled(latest.current.trigger, target)) return;
      clearTimeout(outsideTimer.current);
      // Evaluate after the browser's mousedown focus change so the
      // skipRestoreOnOutsideFocus decision sees where focus actually went.
      outsideTimer.current = setTimeout(() => requestClose("outside-press"), 0);
    };
    const key = (event) => {
      if (event.defaultPrevented || event.isComposing) return;
      // Base UI useDismiss (vendor-frame-BmPfNbgY.js:16734-16748): the topmost popup consumes Escape,
      // so app-level window handlers never see it.
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); requestClose("escape-key"); }
      else if (event.key === "Tab") requestClose("focus-out");
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", key);
    };
  }, [nested, popups, requestClose]);

  // Nested popups inside a sheet tree cover their parent sheet (dh).
  useEffect(() => {
    if (!nested || !sheet || !parentTree?.setCovered) return undefined;
    parentTree.setCovered(true);
    return () => parentTree.setCovered(false);
  }, [nested, sheet, parentTree]);

  useEffect(() => {
    if (!nested) return undefined;
    submenu.childApi.current = { focusFirst };
    return () => { submenu.childApi.current = null; };
  }, [nested, submenu, focusFirst]);

  const onKeyDown = (event) => {
    if (event.target.closest('[role="menu"]') !== popupRef.current) return;
    latest.current.consumerKeyDown?.(event);
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const key = event.key;
    // A text field inside the menu (the model menu's search) keeps its typing: only the arrows (into the rows),
    // Enter and Escape reach the menu.
    if (event.target !== popupRef.current && event.target.matches?.("input,textarea") && !["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(key)) return;
    if (nested && (key === "ArrowLeft" || key === "Escape")) {
      event.preventDefault(); event.stopPropagation();
      submenu.close({ focusTrigger: true });
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const list = enabledItems(popupRef.current);
    const current = highlightedRef.current ?? document.activeElement;
    const at = list.indexOf(current);
    const next = moveHighlight({ count: list.length, current: at, key });
    if (next !== null) {
      event.preventDefault(); event.stopPropagation();
      if (list[next]) highlight(list[next]);
      return;
    }
    if (key === "Enter" || key === " ") {
      const target = highlightedRef.current;
      if (target && !target.hasAttribute("data-disabled") && popupRef.current.contains(target)) {
        event.preventDefault(); event.stopPropagation();
        target.click();
      }
      return;
    }
    if (/^[1-9]$/.test(key) && !event.shiftKey) {
      const target = list.find((node) => node.dataset.numberKey === key);
      if (target) { event.preventDefault(); event.stopPropagation(); target.click(); return; }
    }
    if (key.length === 1 && key !== " ") {
      typing.current = typeaheadState(typing.current, key, Date.now());
      const labels = list.map((node) => node.dataset.label ?? node.textContent ?? "");
      const match = typeaheadMatch(labels, at, typing.current.text);
      if (match !== null) { event.preventDefault(); highlight(list[match]); }
    }
  };

  const popupValue = useMemo(() => ({
    highlighted, highlight, requestClose, sheet, nested, node: popupRef, depth,
    close: (reason = "item-click") => requestClose(reason),
  }), [highlighted, highlight, requestClose, sheet, nested, depth]);
  const rootClose = nested ? parentTree?.rootClose : requestClose;
  const treeValue = useMemo(() => ({ layerBase: layer.layerBase, sheet, popups, setCovered, rootClose, depth }), [layer.layerBase, sheet, popups, rootClose, depth]);
  const portalAttributes = useMemo(() => portalContext(anchor ?? document.body), [anchor]);
  const portalStyle = { "--cds-portal-z": layer.z, "--cds-layer-base": layer.layerBase };
  const listMaxHeight = menuListMaxHeight(maxVisibleItems, !!header);
  const body = (
    <div className="smenu-body scroll-fade-y" data-after-header={header ? "" : undefined} data-cds-sheet-scroll={sheet ? "" : undefined}
      style={listMaxHeight === undefined ? undefined : { maxHeight: listMaxHeight }}>{children}</div>
  );

  const popup = (
    <div ref={(node) => { popupRef.current = node; if (externalPopupRef) externalPopupRef.current = node; }}
      id={id} role="menu" tabIndex={-1} aria-label={label} aria-labelledby={labelledBy}
      data-cds={dataCds} data-open="" data-nested={nested ? "" : undefined} data-menu-depth={depth} data-cds-sheet={sheet ? "" : undefined}
      data-cds-sheet-covered={sheet && covered ? "" : undefined}
      className={`smenu-popup cds-reset rounded-card shadow-panel ${sheet ? "smenu-sheet" : ""} ${className}`.trim()}
      style={style} onKeyDown={onKeyDown} onContextMenu={onContextMenu}>
      {header || footer
        // Hx with a header or footer: only the list scrolls; the header (zx) and footer (Bx) stay in place.
        ? <div className="smenu-frame">
            {header && <div className="smenu-frame-header">{header}</div>}
            {body}
            {footer && <div className="smenu-frame-footer">{footer}</div>}
          </div>
        : body}
    </div>
  );
  const portal = sheet
    ? <div ref={portalRef} className="smenu-portal cds-root" data-cds-portal="" data-cds-sheet-tree="" {...portalAttributes} style={portalStyle}>
        <div ref={backdropRef} role="presentation" className="smenu-sheet-backdrop" />
        {popup}
      </div>
    : <div ref={portalRef} className="smenu-portal cds-root" data-cds-portal="" {...portalAttributes} style={portalStyle}>
        <div ref={positionerRef} className="smenu-positioner" style={{ visibility: "hidden" }}>{popup}</div>
      </div>;
  return createPortal(
    <TreeContext.Provider value={treeValue}>
      <PopupContext.Provider value={popupValue}>{portal}</PopupContext.Provider>
    </TreeContext.Provider>,
    document.body,
  );
}

const MenuItem = forwardRef(function MenuItem({
  children, label, description, labelId, descriptionId, icon, leading, trailing, hint, shortcut, checked, checkedRole = "checkbox",
  disabled = false, disabledReason, keepOpen = false, variant = "default", digit, className = "", role: roleProp,
  onClick, onPointerEnter, onFocus, onKeyDown, ...rest
}, forwardedRef) {
  const popup = useContext(PopupContext);
  const nodeRef = useRef(null);
  const reasonId = useId();
  const setRef = (node) => {
    nodeRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };
  const role = roleProp ?? (checked === undefined ? "menuitem" : checkedRole === "radio" ? "menuitemradio" : "menuitemcheckbox");
  // XS: `I = E.disabled === !0 && Wc(p)` with Wc = `!!e` — a string or a ReactNode (<FormattedMessage>) reason.
  const showReason = !!disabled && !!disabledReason;
  const highlightedNow = !!popup && popup.highlighted !== null && popup.highlighted === nodeRef.current;
  const hasCheckSlot = checked !== undefined;
  const bareCheck = hasCheckSlot && !hint && !shortcut;
  const shortcutOnly = !!shortcut && !trailing && !hasCheckSlot && !hint;
  const textLabel = label ?? (typeof children === "string" ? children : undefined);
  const describedBy = [showReason ? reasonId : null, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const item = (
    <div {...rest} ref={setRef} role={role} tabIndex={-1}
      aria-checked={hasCheckSlot ? checked : rest["aria-checked"]}
      aria-disabled={disabled ? "true" : undefined}
      aria-keyshortcuts={shortcut ? normalizeShortcut(shortcut) : rest["aria-keyshortcuts"]}
      aria-describedby={describedBy}
      data-highlighted={highlightedNow ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-variant={variant !== "default" ? variant : undefined}
      data-description={description ? "" : undefined}
      data-number-key={digit ?? undefined}
      data-label={textLabel}
      data-cds-icon-row={icon !== undefined ? "" : undefined}
      className={`smenu-item ${className}`.trim()}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (!disabled && !event.defaultPrevented) popup?.highlight(nodeRef.current);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (!disabled && event.target === nodeRef.current) popup?.highlight(nodeRef.current, { focus: false });
      }}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (disabled) { event.preventDefault(); return; }
        onClick?.(event);
        if (!keepOpen && !event.defaultPrevented) popup?.requestClose("item-click");
      }}>
      {leading}
      {icon !== undefined && <span className="smenu-icon"><Icon name={icon} size={16} /></span>}
      {description
        ? <span className="smenu-copy"><span className="smenu-label" id={labelId}>{children}</span><span className="smenu-description" id={descriptionId}>{description}</span></span>
        : <span className="smenu-label smenu-copy-single" id={labelId}>{children}</span>}
      {(trailing || hasCheckSlot || hint || shortcut) && (
        <span className="smenu-trailing" data-shortcut-only={shortcutOnly ? "" : undefined}>
          {trailing}
          {hasCheckSlot && <span className="smenu-check" data-bare={bareCheck ? "" : undefined} data-coarse-bare={shortcut && !hint ? "" : undefined} aria-hidden="true">
            {checked && <Icon name="Check" size={16} weight="strong" />}
          </span>}
          {hint && <span className="smenu-hint" data-numeric={isNumericText(hint) ? "" : undefined}>{hint}</span>}
          {/* shared-frame c_ (:8874-8881): the Shortcut text variant, aria-hidden, text-footnote, tabular digits. */}
          {shortcut && <SourceShortcut variant="text" keys={shortcut} aria-hidden="true" className="smenu-shortcut" data-numeric={isNumericText(shortcut) ? "" : undefined} />}
        </span>
      )}
    </div>
  );
  // XS `ie`: no wrapper only when no disabledReason is given at all (`p === void 0`); otherwise Gv (the right-side
  // multiline Tooltip, closeOnClick false, Zp default hoverable = true) over a role="none" wrapper, because the item
  // itself has no pointer events, holding the item and Yc. The wrapper stays while the item toggles enabled, with an
  // empty tooltip and span.
  if (disabledReason === undefined) return item;
  const reason = showReason ? disabledReason : null;
  return (
    <SourceTooltip content={reason ?? undefined} side="right" multiline closeOnClick={false}>
      <div role="none" className="smenu-reason">
        {item}
        <span key={tooltipContentKey(reason)} id={reasonId} hidden data-cds-disabled-reason="">{reason}</span>
      </div>
    </SourceTooltip>
  );
});

function MenuSeparator() {
  return <div role="separator" className="smenu-separator" />;
}

function MenuGroup({ children, className = "", ...rest }) {
  const labelId = useId();
  const [hasLabel, setHasLabel] = useState(false);
  const value = useMemo(() => ({ labelId, declare: setHasLabel }), [labelId]);
  return (
    <GroupContext.Provider value={value}>
      <div role="group" aria-labelledby={hasLabel ? labelId : rest["aria-labelledby"]} className={className || undefined} {...rest}>{children}</div>
    </GroupContext.Provider>
  );
}

function MenuGroupLabel({ children, className = "", id: idProp }) {
  const group = useContext(GroupContext);
  useLayoutEffect(() => {
    if (!group || idProp) return undefined;
    group.declare(true);
    return () => group.declare(false);
  }, [group, idProp]);
  return <div id={idProp ?? group?.labelId} className={`smenu-group-label ${className}`.trim()}>{children}</div>;
}

function MenuHeader({ children, className = "" }) {
  return <div role="presentation" className={`smenu-header ${className}`.trim()}>{children}</div>;
}

const isMouse = (event) => !event.pointerType || event.pointerType === "mouse";

function MenuSubmenu({ children, onOpenChange }) {
  const parent = useContext(PopupContext);
  const tree = useContext(TreeContext);
  const [open, setOpenState] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;
  const triggerRef = useRef(null), focusFirst = useRef(false), childApi = useRef(null);
  // Hover machinery (Base UI SubmenuTrigger over floating-ui useHover +
  // safePolygon): open timer, corridor tracking and the pointer-inert parent.
  const hover = useRef({ openTimer: null, linger: null, move: null, blocked: null });
  const id = useId();
  const setOpen = useCallback((next) => {
    setOpenState((previous) => {
      if (previous !== next) onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);
  const cancelOpen = useCallback(() => { clearTimeout(hover.current.openTimer); hover.current.openTimer = null; }, []);
  const stopTracking = useCallback(() => {
    const state = hover.current;
    clearTimeout(state.linger); state.linger = null;
    if (state.move) { document.removeEventListener("pointermove", state.move, true); state.move = null; }
    if (state.blocked) {
      state.blocked.popup.style.pointerEvents = state.blocked.popupPrevious;
      state.blocked.trigger.style.pointerEvents = state.blocked.triggerPrevious;
      state.blocked = null;
    }
  }, []);
  // blockPointerEvents: while the child is open and the mouse is on its
  // trigger, the parent popup's other rows stop receiving pointer events so
  // a diagonal path to the child cannot re-highlight them (scope: the parent
  // popup rather than the whole document).
  const block = useCallback(() => {
    if (hover.current.blocked) return;
    const popup = parent?.node?.current, trigger = triggerRef.current;
    if (!popup || !trigger) return;
    hover.current.blocked = { popup, trigger, popupPrevious: popup.style.pointerEvents, triggerPrevious: trigger.style.pointerEvents };
    popup.style.pointerEvents = "none";
    trigger.style.pointerEvents = "auto";
  }, [parent]);
  const close = useCallback(({ focusTrigger = false } = {}) => {
    cancelOpen();
    stopTracking();
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus({ preventScroll: true });
  }, [cancelOpen, stopTracking, setOpen]);
  const startTracking = useCallback((leaveEvent) => {
    const trigger = triggerRef.current, child = document.getElementById(id);
    if (!trigger || !child) return;
    const depth = parent?.depth ?? 0;
    const deeper = () => [...(tree?.popups ?? [])].filter((node) => Number(node.getAttribute("data-menu-depth")) > depth);
    const state = { side: child.getAttribute("data-side") || "right", origin: { x: leaveEvent.clientX, y: leaveEvent.clientY }, landed: false };
    let previous = null;
    const sample = (event, leave) => {
      if (!isMouse(event)) return;
      clearTimeout(hover.current.linger); hover.current.linger = null;
      const target = event.target instanceof Node ? event.target : null;
      const popups = deeper();
      // Resting speed against the previous *evaluated* sample: the record only
      // advances when the corridor logic reaches the speed rule, so the
      // pointermove that follows the leave event at the same point (dt ~0)
      // cannot read as "resting".
      const speed = () => {
        const now = performance.now();
        const value = previous && now > previous.t ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y) / (now - previous.t) : Infinity;
        previous = { x: event.clientX, y: event.clientY, t: now };
        return value;
      };
      state.reference = trigger.getBoundingClientRect();
      state.floating = child.getBoundingClientRect();
      const result = safePolygonStep(state, {
        x: event.clientX, y: event.clientY, leave, speed,
        insideFloating: !!target && popups.some((node) => node.contains(target)),
        insideReference: !!target && trigger.contains(target),
        relatedInsideFloating: leave && event.relatedTarget instanceof Node && popups.some((node) => node.contains(event.relatedTarget)),
        descendantOpen: popups.some((node) => node !== child),
      });
      state.landed = result.landed;
      if (result.verdict === "close") close();
      else if (result.verdict === "linger") hover.current.linger = setTimeout(() => close(), SAFE_POLYGON_LINGER);
    };
    stopTracking();
    block();
    hover.current.move = (event) => sample(event, false);
    document.addEventListener("pointermove", hover.current.move, true);
    sample(leaveEvent, true);
  }, [id, block, parent, tree, close, stopTracking]);
  const value = useMemo(() => ({
    open, id, triggerRef, focusFirst, childApi,
    openChild: (focus = false) => {
      cancelOpen();
      focusFirst.current = focus;
      if (open && focus) childApi.current?.focusFirst();
      else setOpen(true);
    },
    close,
    hoverEnter: (event) => {
      if (!isMouse(event)) return;
      if (openRef.current) { block(); return; }
      cancelOpen();
      hover.current.openTimer = setTimeout(() => { hover.current.openTimer = null; if (!openRef.current) setOpen(true); }, SUBMENU_HOVER_DELAY);
    },
    hoverMove: (event) => { if (isMouse(event) && openRef.current) block(); },
    hoverLeave: (event) => {
      if (!isMouse(event)) return;
      cancelOpen();
      if (openRef.current) startTracking(event);
    },
  }), [open, id, setOpen, close, cancelOpen, block, startTracking]);
  // Moving the parent highlight to another row closes the child.
  useEffect(() => {
    if (open && parent?.highlighted && parent.highlighted !== triggerRef.current) close();
  }, [open, parent?.highlighted, close]);
  useEffect(() => { if (!open) stopTracking(); }, [open, stopTracking]);
  useEffect(() => () => { cancelOpen(); stopTracking(); }, [cancelOpen, stopTracking]);
  return <SubmenuContext.Provider value={value}>{children}</SubmenuContext.Provider>;
}

const MenuSubmenuTrigger = forwardRef(function MenuSubmenuTrigger({ children, trailing, hint, openOnHover: hoverOpens, className = "", onClick, onPointerEnter, onPointerMove, onPointerLeave, onKeyDown, ...rest }, forwardedRef) {
  const submenu = useContext(SubmenuContext);
  const popup = useContext(PopupContext);
  // cd5e3435c U: a trigger with a hint/trailing passes openOnHover:false (opens on click / ArrowRight only).
  const openOnHover = hoverOpens !== false && !popup?.sheet;
  const setRef = (node) => {
    submenu.triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };
  return (
    <MenuItem ref={setRef} keepOpen className={`smenu-submenu-trigger ${className}`.trim()}
      aria-haspopup="menu" aria-expanded={submenu.open} aria-controls={submenu.open ? submenu.id : undefined}
      data-popup-open={submenu.open ? "" : undefined} data-submenu-trigger=""
      // The hint (e.g. Viewport's "Mobile · 375 × 812") reads before the caret, which stays pinned to the row's end
      // like every other submenu row's.
      trailing={<>{trailing}{hint && <span className="smenu-hint" data-numeric={isNumericText(hint) ? "" : undefined}>{hint}</span>}<Icon name="CaretRight" size={12} className="smenu-caret" /></>}
      onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) submenu.openChild(true); }}
      onPointerEnter={(event) => { onPointerEnter?.(event); if (openOnHover && !event.defaultPrevented) submenu.hoverEnter(event); }}
      onPointerMove={(event) => { onPointerMove?.(event); if (openOnHover && !event.defaultPrevented) submenu.hoverMove(event); }}
      onPointerLeave={(event) => { onPointerLeave?.(event); if (openOnHover && !event.defaultPrevented) submenu.hoverLeave(event); }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); submenu.openChild(true); }
      }}
      {...rest}>{children}</MenuItem>
  );
});

/** R_: aria-busy container that keeps its measured size and draws yc skeleton rows while loading. */
function MenuPendingList({ pending = false, loading = false, placeholderRows = 3, icon = false, children }) {
  const ref = useRef(null), measured = useRef({ width: 0, height: 0 });
  const busy = pending || loading;
  const [retained, setRetained] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => { measured.current = { width: node.offsetWidth, height: node.offsetHeight }; });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!busy || !node) { setRetained({ width: 0, height: 0 }); return; }
    setRetained(loading && measured.current.height > 0 ? measured.current : { width: node.offsetWidth, height: node.offsetHeight });
  }, [busy, loading]);
  const keep = busy && retained.height > 0;
  const rows = pendingRows({ retainedHeight: keep ? retained.height : 0, placeholderRows });
  return (
    <div ref={ref} aria-busy={busy || undefined} className={keep ? "smenu-pending" : undefined}
      style={keep ? { minWidth: retained.width, height: retained.height } : undefined}>
      {loading ? <div className="smenu-skeleton-rows">{skeletonPlan(rows, icon).map((entry, index) => entry.separator
        ? <div key={`s${index}`} aria-hidden="true" data-slot="menu-skeleton-separator" className="smenu-separator" />
        : <div key={index} aria-hidden={entry.first ? undefined : true} className="smenu-skeleton-row">
            {entry.icon && <span className="smenu-skeleton" style={{ width: 20, height: 20 }} />}
            <span className="smenu-skeleton" style={{ width: entry.width, height: 16 }} role={entry.first ? "status" : undefined}>
              {entry.first && <span className="smenu-sr-only">{t("Loading")}</span>}
            </span>
          </div>)}</div> : children}
    </div>
  );
}

/* Cr (c752b32f8 :616-653) + the i() card (c17e03edc): a skill row shows a
   hover popover to the right of the item with its description and, for a
   plugin skill, a "{pluginName} plugin" line. The card is pointer-events:none
   and is not part of the menu's accessibility tree. */
function MenuSkillItem({ item, onSelect }) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  const description = item.description || "";
  const pluginName = item.sourcePluginName || "";
  const hasCard = !!(description || pluginName);
  return (
    <>
      <MenuItem ref={ref} icon={item.icon || "Scroll"} data-skill-path={item.path}
        onMouseEnter={() => { if (hasCard && ref.current) setBox(ref.current.getBoundingClientRect()); }}
        onMouseLeave={() => setBox(null)}
        onClick={() => onSelect(item)}>{item.label}</MenuItem>
      {box && createPortal(
        <div className="smenu-hovercard" data-skill-card={item.path}
          style={{ top: `${Math.round(box.top)}px`, left: `${Math.round(box.right + 8)}px`,
            maxWidth: `min(26rem, max(10rem, ${Math.max(0, Math.floor(window.innerWidth - box.right - 16))}px))` }}>
          {description && <div className="smenu-hovercard-text">{description}</div>}
          {pluginName && <div className="smenu-hovercard-source" data-first={description ? undefined : ""}>{t("{name} plugin", { name: pluginName })}</div>}
        </div>, document.body)}
    </>
  );
}

export const SourceMenu = Object.freeze({
  Popup: MenuPopup, Item: MenuItem, Separator: MenuSeparator, Group: MenuGroup, GroupLabel: MenuGroupLabel,
  Header: MenuHeader, Submenu: MenuSubmenu, SubmenuTrigger: MenuSubmenuTrigger, PendingList: MenuPendingList, SkillItem: MenuSkillItem,
});
