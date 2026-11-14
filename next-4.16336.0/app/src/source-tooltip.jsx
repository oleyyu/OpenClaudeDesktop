import React, {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  TOOLTIP_TIMING,
  computeTooltipPosition,
  createTooltipGroupState,
  cursorAnchorRect,
  createTooltipRegistry,
  emptyTooltipContent,
  hoverExitCorridor,
  insideHoverHull,
  intersectRect,
  isDismissalInput,
  isHandedBackFocus,
  safeHoverHull,
} from "./source-tooltip-model.js";
import { SourceShortcut } from "./source-shortcut";
import { tooltipContentKey } from "./generated/code-current/tooltip-structure.mjs";
import "./source-tooltip.css";

const GroupContext = createContext(null);
const ExplicitTooltipContext = createContext(false);
const registry = createTooltipRegistry();
const documents = new WeakMap();
const portalAttributes = [
  "data-density",
  "data-mode",
  "data-chat-source-version", "data-cds-theme",
  "data-platform",
  "data-font",
  "data-page-bg",
];

function acquireDocument(document) {
  let state = documents.get(document);
  if (!state) {
    state = { count: 0, observedInput: false, lastInputDismissing: false };
    const input = (event) => {
      if (!event.isTrusted) return;
      state.observedInput = true;
      state.lastInputDismissing = isDismissalInput(event);
    };
    const blur = () => {
      state.observedInput = false;
      state.lastInputDismissing = false;
    };
    const window = document.defaultView;
    window?.addEventListener("keydown", input, true);
    window?.addEventListener("pointerdown", input, true);
    window?.addEventListener("blur", blur);
    state.cleanup = () => {
      window?.removeEventListener("keydown", input, true);
      window?.removeEventListener("pointerdown", input, true);
      window?.removeEventListener("blur", blur);
      documents.delete(document);
    };
    documents.set(document, state);
  }
  state.count++;
  return {
    state,
    release() {
      if (--state.count === 0) state.cleanup();
    },
  };
}

// git-chips A: a label is truncated when its content is wider than its box.
// shared-frame Fu (OverflowTooltip) additionally asks Jc, a Range over the
// contents that extends past the box by more than 0.1px (subpixel ellipsis).
export function textOverflows(node, { subpixel = false } = {}) {
  if (!node) return false;
  if (node.scrollWidth > node.clientWidth) return true;
  if (!subpixel) return false;
  const range = node.ownerDocument.createRange();
  range.selectNodeContents(node);
  const inner = range.getBoundingClientRect?.();
  if (!inner || inner.width === 0) return false;
  const box = node.getBoundingClientRect();
  return inner.right - box.right > 0.1 || box.left - inner.left > 0.1;
}

function assignRef(ref, value) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function contextAttributes(trigger) {
  const result = {};
  for (const name of portalAttributes) {
    const node =
      trigger.closest(`[${name}]`) || trigger.ownerDocument.documentElement;
    const value = node.getAttribute(name);
    if (value != null) result[name] = value;
  }
  return result;
}

function clippingBounds(trigger) {
  const window = trigger.ownerDocument.defaultView;
  const viewport = window.visualViewport;
  let bounds = {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    right: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth),
    bottom:
      (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
  };
  for (
    let node = trigger.parentElement;
    node && node !== trigger.ownerDocument.body;
    node = node.parentElement
  ) {
    const style = window.getComputedStyle(node);
    const clipX = /auto|scroll|hidden|clip/.test(style.overflowX);
    const clipY = /auto|scroll|hidden|clip/.test(style.overflowY);
    if (!clipX && !clipY) continue;
    const rect = node.getBoundingClientRect();
    bounds = intersectRect(bounds, {
      left: clipX ? rect.left + node.clientLeft : -Infinity,
      right: clipX ? rect.left + node.clientLeft + node.clientWidth : Infinity,
      top: clipY ? rect.top + node.clientTop : -Infinity,
      bottom: clipY ? rect.top + node.clientTop + node.clientHeight : Infinity,
    });
  }
  return bounds;
}

// shared-frame-C_2npUJq.js:4572-4580 Mu: tooltip shortcuts are key specs ("cmd+shift+d") drawn by the
// CDS Shortcut text variant at 12px with --cds-shortcut-cap-ink set to the muted ink.
function TooltipShortcut({ keys }) {
  return <SourceShortcut variant="text" keys={keys} className="source-tooltip-shortcut" />;
}

export function SourceTooltipGroup({
  children,
  delay = TOOLTIP_TIMING.groupOpen,
  closeDelay = TOOLTIP_TIMING.groupClose,
}) {
  // Nu's explicit default 300ms overrides this provider's nominal 600ms.
  const group = useMemo(
    () => ({ ...createTooltipGroupState({ closeDelay }), delay }),
    [delay, closeDelay],
  );
  useLayoutEffect(() => () => group.dispose(), [group]);
  return (
    <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
  );
}

export function useExplicitSourceTooltip() {
  return useContext(ExplicitTooltipContext);
}

// shared-frame-BfjMqbuN Uc's class (inline-flex + Vc, whose focus ring is dc).
const REASON_WRAPPER_CLASS =
  "inline-flex rounded outline-none focus-visible:outline-hidden [&[data-initial-focus]:focus]:outline-hidden transition-shadow duration-fast focus-visible:shadow-focus [&[data-initial-focus]:focus]:shadow-focus";

export function SourceTooltip({ children, disabledReason, wrapperClassName, keepReasonWrapper = false, ...props }) {
  const reasonId = useId();
  const child = Children.only(children);
  if (!isValidElement(child) || child.type === React.Fragment)
    throw new TypeError(
      "SourceTooltip needs one element that forwards its DOM ref, or an explicit DOM wrapper.",
    );
  // keepReasonWrapper (R4e-preview, preview-13): shared-frame Qp (DisabledReason) as the original renders it — the Uc
  // wrapper and the Yc reason span stay mounted with or without a reason (tabIndex 0 and aria-describedby only while
  // there is one), so the control inside is never re-parented and keeps its focus when the reason comes or goes. The
  // reason shows whenever it is given (Wc), as Qp's does, also around a child that is not itself the disabled control.
  if (keepReasonWrapper) {
    const reason = emptyTooltipContent(disabledReason) ? null : disabledReason;
    return (
      <TooltipCore
        {...props}
        content={reason}
        multiline={props.multiline ?? true}
        closeOnClick={false}
        openOnHandedBackFocus={true}
        descriptionId={reasonId}
      >
        <span
          tabIndex={reason ? 0 : -1}
          aria-describedby={reason ? reasonId : undefined}
          data-cds-disabled-reason-wrapper=""
          className={`${REASON_WRAPPER_CLASS} ${wrapperClassName ?? ""}`.trim()}
        >
          {child}
          <span key={tooltipContentKey(reason)} id={reasonId} hidden data-cds-disabled-reason="">
            {reason}
          </span>
        </span>
      </TooltipCore>
    );
  }
  // This path never enables or installs click behavior on the disabled action.
  // Keep the actual native disabled button and give only its reason a focus stop.
  const showReason =
    child.props.disabled === true && !emptyTooltipContent(disabledReason);
  if (showReason) {
    return (
      <TooltipCore
        {...props}
        content={disabledReason}
        multiline={props.multiline ?? true}
        closeOnClick={false}
        openOnHandedBackFocus={true}
        descriptionId={reasonId}
      >
        <span
          className={`source-tooltip-disabled-trigger ${wrapperClassName ?? ""}`.trim()}
          tabIndex={0}
          aria-describedby={reasonId}
        >
          {cloneElement(child, { title: undefined })}
          <span key={tooltipContentKey(disabledReason)} id={reasonId} hidden data-cds-disabled-reason="">
            {disabledReason}
          </span>
        </span>
      </TooltipCore>
    );
  }
  return <TooltipCore {...props}>{child}</TooltipCore>;
}

function TooltipCore({
  children,
  content,
  detail,
  secondaryHint,
  // A third label + shortcut row (the composer Send tooltip's ⌘⌥⏎ fork lane, ca80fca8d vP _P rows).
  tertiaryHint,
  shortcut,
  multiline = false,
  side = "top",
  align = "center",
  sideOffset = 4,
  collisionPadding,
  delay = TOOLTIP_TIMING.open,
  closeDelay,
  hoverable = true,
  closeOnClick = true,
  open,
  onOpenChange,
  openOnHandedBackFocus = false,
  triggerRef,
  container,
  className = "",
  automatic = false,
  descriptionId,
  layerBase,
  trackCursorAxis = "none",
}) {
  const id = useId();
  const group = useContext(GroupContext);
  const inExplicitTooltip = useContext(ExplicitTooltipContext);
  const suppressed = automatic && inExplicitTooltip;
  const [trigger, setTrigger] = useState(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [resolvedContent, setResolvedContent] = useState(null);
  const [phase, setPhase] = useState("absent");
  const [position, setPosition] = useState(null);
  const [portalContext, setPortalContext] = useState({});
  const [reducedMotion, setReducedMotion] = useState(false);
  const popupRef = useRef(null),
    portalRef = useRef(null);
  const alive = useRef(true),
    actions = useRef(null),
    history = useRef(null);
  const timers = useRef({ open: null, close: null, blur: null, exit: null });
  const enterFrames = useRef([]);
  const corridor = useRef(null),
    reason = useRef(null),
    instantExit = useRef(false),
    wasOpen = useRef(false),
    cursor = useRef(null);
  const contentValue =
    typeof content === "function" ? resolvedContent : content;
  const hasContent =
    !suppressed &&
    (typeof content === "function" || !emptyTooltipContent(content));
  const logicalOpen =
    !!(open ?? internalOpen) &&
    hasContent &&
    !emptyTooltipContent(contentValue);
  const current = useRef(null);
  current.current = {
    trigger,
    group,
    content,
    logicalOpen,
    open,
    delay,
    closeDelay,
    hoverable,
    closeOnClick,
    openOnHandedBackFocus,
    reducedMotion,
    phase,
    onOpenChange,
    trackCursorAxis,
  };
  const owner = useMemo(
    () => ({ closeInstant: (cause) => actions.current?.close(cause, true) }),
    [],
  );
  const setTriggerRef = useCallback(
    (node) => {
      assignRef(children.props.ref, node);
      assignRef(triggerRef, node);
      setTrigger(node);
    },
    [children.props.ref, triggerRef],
  );

  function cancel(name) {
    if (timers.current[name] != null) clearTimeout(timers.current[name]);
    timers.current[name] = null;
  }
  function cancelEnterFrames() {
    enterFrames.current.forEach((frame) => cancelAnimationFrame(frame));
    enterFrames.current = [];
  }
  function finishExit() {
    if (!alive.current) return;
    cancel("exit");
    cancelEnterFrames();
    setPhase("absent");
    setPosition(null);
    registry.release(owner);
  }
  function show(cause) {
    const options = current.current;
    cancel("open");
    cancel("close");
    cancel("blur");
    if (
      !alive.current ||
      !options.trigger?.isConnected ||
      options.open === false ||
      !hasContent
    )
      return;
    const next =
      typeof options.content === "function"
        ? options.content()
        : options.content;
    if (emptyTooltipContent(next)) return;
    reason.current = cause;
    instantExit.current = false;
    setPortalContext(contextAttributes(options.trigger));
    setResolvedContent(next);
    setInternalOpen(true);
    options.onOpenChange?.(true, { reason: cause });
  }
  function close(cause, instant = false) {
    if (!alive.current) return;
    cancel("open");
    cancel("close");
    cancel("blur");
    corridor.current = null;
    instantExit.current = instant;
    setInternalOpen(false);
    if (current.current.logicalOpen)
      current.current.onOpenChange?.(false, { reason: cause });
    // A new owner must also remove a previous tooltip's exiting DOM immediately.
    if (!current.current.logicalOpen && instant) finishExit();
  }
  function scheduleOpen() {
    cancel("close");
    cancel("blur");
    corridor.current = null;
    if (
      current.current.logicalOpen ||
      current.current.open === false ||
      !hasContent
    )
      return;
    cancel("open");
    const wait =
      current.current.group?.openingDelay(current.current.delay) ??
      current.current.delay;
    if (wait <= 0) show("hover");
    else timers.current.open = setTimeout(() => show("hover"), wait);
  }
  function focusInside() {
    const node = trigger?.ownerDocument.activeElement;
    return (
      !!node && (trigger?.contains(node) || popupRef.current?.contains(node))
    );
  }
  function scheduleClose(cause) {
    cancel("open");
    cancel("close");
    if (
      cause === "pointer-leave" &&
      reason.current === "focus" &&
      focusInside()
    )
      return;
    const wait =
      current.current.closeDelay ?? current.current.group?.closeDelay ?? 0;
    if (wait <= 0) close(cause);
    else timers.current.close = setTimeout(() => close(cause), wait);
  }
  function beginCrossing(event, target) {
    cancel("open");
    const destination = target === "popup" ? popupRef.current : trigger;
    const source = target === "popup" ? trigger : popupRef.current;
    if (
      !current.current.hoverable ||
      !current.current.logicalOpen ||
      !destination ||
      !source
    ) {
      scheduleClose("pointer-leave");
      return;
    }
    const origin = hoverExitCorridor(
      { x: event.clientX, y: event.clientY },
      source.getBoundingClientRect(),
      destination.getBoundingClientRect(),
    );
    if (!origin) {
      corridor.current = null;
      scheduleClose("pointer-leave");
      return;
    }
    cancel("close");
    corridor.current = {
      origin,
      target,
    };
  }
  actions.current = { close };

  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      Object.keys(timers.current).forEach(cancel);
      cancelEnterFrames();
      corridor.current = null;
      registry.release(owner);
      current.current.group?.removed(owner);
    };
  }, [owner]);
  useLayoutEffect(() => {
    if (!trigger || !hasContent) return;
    const environment = acquireDocument(trigger.ownerDocument);
    history.current = environment.state;
    const media = trigger.ownerDocument.defaultView.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const change = () => setReducedMotion(media.matches);
    change();
    media.addEventListener("change", change);
    return () => {
      environment.release();
      history.current = null;
      media.removeEventListener("change", change);
    };
  }, [trigger, hasContent]);
  useLayoutEffect(() => {
    if (!hasContent) {
      cancel("open");
      cancel("close");
      corridor.current = null;
      setInternalOpen(false);
    }
  }, [hasContent]);
  useLayoutEffect(() => {
    if (open === false) {
      cancel("open");
      setInternalOpen(false);
    } else if (open === true && typeof content === "function")
      setResolvedContent(content());
  }, [open, content]);
  useLayoutEffect(() => {
    cancel("exit");
    cancelEnterFrames();
    if (logicalOpen) {
      wasOpen.current = true;
      if (trigger) setPortalContext(contextAttributes(trigger));
      registry.claim(owner);
      group?.opened(owner);
      setPhase(reducedMotion ? "open" : "starting");
      if (!reducedMotion) {
        const first = requestAnimationFrame(() => {
          const second = requestAnimationFrame(() => {
            if (alive.current) setPhase("open");
          });
          enterFrames.current.push(second);
        });
        enterFrames.current.push(first);
      }
    } else {
      if (wasOpen.current) {
        group?.closed(owner);
        wasOpen.current = false;
      }
      if (current.current.phase === "absent") return;
      if (instantExit.current || reducedMotion) finishExit();
      else {
        setPhase("ending");
        timers.current.exit = setTimeout(finishExit, TOOLTIP_TIMING.transition);
      }
    }
  }, [logicalOpen, group, owner, reducedMotion]);

  const present = phase !== "absent" && hasContent;
  useLayoutEffect(() => {
    if (!present || !trigger) return;
    const document = trigger.ownerDocument,
      window = document.defaultView;
    let disposed = false,
      frame = 0;
    const measure = () => {
      if (
        disposed ||
        !popupRef.current ||
        !portalRef.current ||
        !trigger.isConnected
      )
        return;
      const theme = contextAttributes(trigger);
      setPortalContext((old) =>
        JSON.stringify(old) === JSON.stringify(theme) ? old : theme,
      );
      const inset =
        Number.parseFloat(
          window
            .getComputedStyle(document.documentElement)
            .getPropertyValue("--desktop-titlebar-inset"),
        ) || 0;
      const padding = collisionPadding ?? {
        top: 5 + Math.max(0, inset),
        right: 5,
        bottom: 5,
        left: 5,
      };
      const root = portalRef.current.getBoundingClientRect();
      // Od registers the positioner as the floating element; Ec measures its
      // complete box, including the inline-flex popup's baseline line box.
      // The positioner itself does not animate, so its fractional dimensions
      // stay stable while its popup child enters/exits with scale.
      const floating = popupRef.current.parentElement.getBoundingClientRect();
      // Nu trackCursorAxis (Bu -> Ns): a hover-opened tooltip anchors to the
      // latest pointer on that axis; a focus-opened one to the trigger.
      const next = computeTooltipPosition(
        cursorAnchorRect(
          trigger.getBoundingClientRect(),
          reason.current === "focus" ? null : cursor.current,
          current.current.trackCursorAxis,
        ),
        {
          width: floating.width,
          height: floating.height,
        },
        // wd/Rs defaults: elementContext=floating, altBoundary=false. The
        // body portal escapes toolbar clipping; reference hiding is separate.
        clippingBounds(portalRef.current),
        {
          side,
          align,
          sideOffset,
          collisionPadding: padding,
          referenceBounds: clippingBounds(trigger),
        },
      );
      const base =
        layerBase ??
        (Number.parseInt(
          window.getComputedStyle(trigger).getPropertyValue("--cds-layer-base"),
          10,
        ) ||
          0);
      const position = {
        ...next,
        x: next.x - root.left,
        y: next.y - root.top,
        layer: base + 100 + 30,
        layerBase: base + 100,
      };
      setPosition((old) =>
        old && Object.keys(position).every((key) => old[key] === position[key])
          ? old
          : position,
      );
    };
    const track = () => {
      if (disposed) return;
      measure();
      frame = requestAnimationFrame(track);
    };
    measure();
    frame = requestAnimationFrame(track);
    const onScroll = (event) => {
      const target = event.target;
      if (
        target === document ||
        (target?.contains?.(trigger) && target !== trigger)
      ) {
        if (reason.current === "hover") close("ancestor-scroll", true);
        else measure();
      }
    };
    const pointer = (event) => {
      // Ns: while open, document mousemoves outside the popup move the
      // cursor anchor (the rAF measure loop applies it).
      if (
        event.pointerType === "mouse" &&
        current.current.trackCursorAxis !== "none" &&
        !popupRef.current?.contains(event.target)
      )
        cursor.current = { x: event.clientX, y: event.clientY };
      if (event.pointerType !== "mouse" || !corridor.current) return;
      if (
        trigger.contains(event.target) ||
        popupRef.current?.contains(event.target)
      ) {
        corridor.current = null;
        cancel("close");
        return;
      }
      const cross = corridor.current;
      const target = cross.target === "popup" ? popupRef.current : trigger;
      if (
        !target ||
        !insideHoverHull(
          { x: event.clientX, y: event.clientY },
          safeHoverHull(cross.origin, target.getBoundingClientRect()),
        )
      ) {
        corridor.current = null;
        scheduleClose("pointer-leave");
      }
    };
    const outside = (event) => {
      if (
        !trigger.contains(event.target) &&
        !popupRef.current?.contains(event.target)
      )
        close("outside-press");
    };
    // Base UI useDismiss (vendor-frame-BmPfNbgY.js:16731-16745 M, attached at :16960 `ra(V, "keydown", M)` with no
    // capture flag; tooltip root Bu :20789): the owner document hears Escape in the bubble phase, after the focused
    // target and React's root/portal handlers, and then stops it there (escapeKey bubbles false), as source-menu.jsx
    // and source-popover.jsx do. A capture listener swallowed Escape before a focused modal saw it whenever a hint
    // was still open (Regression repair 1: session-actions /usage under load).
    const key = (event) => {
      if (
        event.key !== "Escape" ||
        !current.current.logicalOpen ||
        !registry.isCurrent(owner)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      close("escape");
    };
    const onBlur = () => close("window-blur", true);
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", key);
    window.addEventListener("blur", onBlur);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("pointermove", pointer);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    present,
    trigger,
    side,
    align,
    sideOffset,
    collisionPadding,
    layerBase,
    owner,
  ]);

  const onFocus = (event) => {
    cancel("blur");
    cancel("close");
    if (
      !event.target.matches?.(":focus-visible") &&
      !trigger?.matches(":focus-visible")
    )
      return;
    if (
      !current.current.openOnHandedBackFocus &&
      isHandedBackFocus(event, history.current)
    )
      return;
    show("focus");
  };
  const onBlur = () => {
    cancel("blur");
    timers.current.blur = setTimeout(() => {
      timers.current.blur = null;
      if (!focusInside()) close("blur");
    }, 0);
  };
  const child = Children.only(children);
  function compose(name, handler) {
    return (event) => {
      child.props[name]?.(event);
      if (!event.defaultPrevented) handler(event);
    };
  }
  const describedBy =
    [child.props["aria-describedby"], !descriptionId && logicalOpen ? id : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const cloned = !hasContent
    ? child
    : cloneElement(child, {
        ref: setTriggerRef,
        title: undefined,
        "aria-describedby": describedBy,
        onPointerEnter: compose("onPointerEnter", (event) => {
          if (event.pointerType !== "mouse") return;
          if (trackCursorAxis !== "none")
            cursor.current = { x: event.clientX, y: event.clientY };
          scheduleOpen();
        }),
        ...(trackCursorAxis !== "none" && {
          // Ns reference onMouseMove: the point is recorded before opening.
          onPointerMove: compose("onPointerMove", (event) => {
            if (event.pointerType === "mouse")
              cursor.current = { x: event.clientX, y: event.clientY };
          }),
        }),
        onPointerLeave: compose("onPointerLeave", (event) => {
          if (event.pointerType === "mouse") beginCrossing(event, "popup");
        }),
        onPointerDown: compose("onPointerDown", () => {
          if (current.current.closeOnClick) close("trigger-press");
        }),
        onClick: compose("onClick", () => {
          if (current.current.closeOnClick) close("trigger-click");
        }),
        onFocus: compose("onFocus", onFocus),
        onBlur: compose("onBlur", onBlur),
      });
  const portal =
    present &&
    trigger &&
    createPortal(
      <div
        ref={portalRef}
        className="cds-root source-tooltip-scope"
        data-cds-portal=""
        {...portalContext}
        style={{
          "--cds-layer-base": position?.layerBase,
          "--cds-portal-z": position?.layer,
        }}
      >
        <div
          data-cds="Tooltip"
          className="source-tooltip-positioner"
          data-side={position?.side ?? side}
          data-anchor-hidden={position?.anchorHidden || undefined}
          style={{
            left: position?.x ?? 0,
            top: position?.y ?? 0,
            visibility:
              !position || position.anchorHidden ? "hidden" : undefined,
            zIndex: position?.layer,
            "--transform-origin": position?.origin,
          }}
        >
          <div
            ref={popupRef}
            id={id}
            role="tooltip"
            className={`source-tooltip-popup ${multiline || detail || secondaryHint || tertiaryHint ? "source-tooltip-multiline" : "source-tooltip-single"} ${className}`}
            data-state={phase}
            data-instant={instantExit.current || undefined}
            data-hoverable={hoverable}
            data-has-shortcut={!!shortcut || undefined}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse" && hoverable) {
                corridor.current = null;
                cancel("close");
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse")
                beginCrossing(event, "trigger");
            }}
            onFocusCapture={() => {
              cancel("blur");
              cancel("close");
            }}
            onBlurCapture={onBlur}
            onTransitionEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.propertyName === "opacity" &&
                current.current.phase === "ending"
              )
                finishExit();
            }}
          >
            <div className="cds-dark-scope source-tooltip-ink" data-mode="dark">
              <span className="source-tooltip-label-line">
                <span key={tooltipContentKey(contentValue)} className="source-tooltip-label">{contentValue}</span>
                {shortcut && <TooltipShortcut keys={shortcut} />}
              </span>
              {secondaryHint && (
                <span className="source-tooltip-label-line">
                  <span key={tooltipContentKey(secondaryHint.label)} className="source-tooltip-label">
                    {secondaryHint.label}
                  </span>
                  {secondaryHint.shortcut && (
                    <TooltipShortcut keys={secondaryHint.shortcut} />
                  )}
                </span>
              )}
              {tertiaryHint && (
                <span className="source-tooltip-label-line">
                  <span key={tooltipContentKey(tertiaryHint.label)} className="source-tooltip-label">{tertiaryHint.label}</span>
                  {tertiaryHint.shortcut && <TooltipShortcut keys={tertiaryHint.shortcut} />}
                </span>
              )}
              {detail && (
                <span key={tooltipContentKey(detail)} className="source-tooltip-detail">{detail}</span>
              )}
            </div>
          </div>
        </div>
      </div>,
      container ?? trigger.ownerDocument.body,
    );
  return (
    <ExplicitTooltipContext.Provider value={hasContent || inExplicitTooltip}>
      {cloned}
      {portal}
    </ExplicitTooltipContext.Provider>
  );
}
