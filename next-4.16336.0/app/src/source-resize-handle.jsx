// CDS ResizeHandle (shared-15 Kr): a separator with a focus ring and the resize pill. A press tracks the mouse on its
// document (col-resize / row-resize cursor, no text selection) and reports onResize(delta px from the press);
// onResizeEnd(moved) gets whether it moved more than 3px. Enter / Space is a start + end without a move; arrows
// step 8px (Shift 32px) as start, resize, end(true). The class strings are the reference's (the same utilities the
// sidebar's resize handle uses, source-sidebar.jsx).
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";

const MOVE_PX = 3, STEP = 8, STEP_LARGE = 32;
const cls = (...parts) => parts.filter(Boolean).join(" ");

export const SourceResizeHandle = forwardRef(function SourceResizeHandle({ orientation = "vertical", onResize, onResizeStart, onResizeEnd,
  onMouseDown, onKeyDown, className, children, ...props }, ref) {
  const vertical = orientation === "vertical";
  const [dragging, setDragging] = useState(false);
  const doc = useRef(null), origin = useRef(0), moved = useRef(false), ended = useRef(true);
  const callbacks = useRef({ onResize, onResizeStart, onResizeEnd });
  callbacks.current = { onResize, onResizeStart, onResizeEnd };
  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    setDragging(false);
    callbacks.current.onResizeEnd?.(moved.current);
  }, []);
  useEffect(() => {
    const target = doc.current;
    if (!dragging || target === null) return undefined;
    const move = (event) => {
      const delta = (vertical ? event.clientX : event.clientY) - origin.current;
      if (Math.abs(delta) > MOVE_PX) moved.current = true;
      callbacks.current.onResize?.(delta);
    };
    const style = target.body.style;
    style.cursor = vertical ? "col-resize" : "row-resize";
    style.userSelect = "none";
    target.addEventListener("mousemove", move);
    target.addEventListener("mouseup", end);
    return () => { target.removeEventListener("mousemove", move); target.removeEventListener("mouseup", end); style.cursor = ""; style.userSelect = ""; };
  }, [dragging, vertical, end]);
  useEffect(() => end, [end]);
  const mouseDown = (event) => {
    if (event.button === 0) {
      event.preventDefault();
      origin.current = vertical ? event.clientX : event.clientY;
      moved.current = false;
      ended.current = false;
      doc.current = event.currentTarget.ownerDocument;
      setDragging(true);
      callbacks.current.onResizeStart?.();
    }
    onMouseDown?.(event);
  };
  const keyDown = (event) => {
    if (!(event.metaKey || event.ctrlKey || event.altKey || !ended.current)) {
      if ((event.key === "Enter" || event.key === " ") && !event.shiftKey) {
        event.preventDefault();
        if (!event.repeat) { callbacks.current.onResizeStart?.(); callbacks.current.onResizeEnd?.(false); }
      } else {
        const step = event.shiftKey ? STEP_LARGE : STEP;
        const [less, more] = vertical ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
        const delta = event.key === less ? -step : event.key === more ? step : 0;
        if (delta !== 0) {
          event.preventDefault();
          callbacks.current.onResizeStart?.();
          callbacks.current.onResize?.(delta);
          callbacks.current.onResizeEnd?.(true);
        }
      }
    }
    onKeyDown?.(event);
  };
  return <div {...props} ref={ref} data-cds="ResizeHandle" role="separator" aria-orientation={vertical ? "vertical" : "horizontal"} tabIndex={0}
    data-dragging={dragging ? "" : undefined} onMouseDown={mouseDown} onKeyDown={keyDown}
    className={cls("cds-reset group/resize outline-none focus-visible:outline-hidden", vertical ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize",
      "relative", vertical ? "h-full" : "w-full", className)}>
    <div aria-hidden="true" className={cls("absolute rounded-full transition-shadow duration-fast group-focus-visible/resize:shadow-focus",
      vertical ? "inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-col-resize" : "inset-x-0 top-1/2 h-3 -translate-y-1/2 cursor-row-resize")} />
    <div aria-hidden="true" data-cds-part="resize-pill" className={cls("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-[opacity,color,background-color]",
      vertical ? "h-full max-h-12 w-[3px] group-focus-visible/resize:max-h-none" : "h-[3px] w-full max-w-12 group-focus-visible/resize:max-w-none",
      dragging ? "text-secondary opacity-100 duration-snap" : "text-muted opacity-[var(--cds-resize-pill-force,0)] delay-200 duration-base group-hover/resize:opacity-100",
      "group-focus-visible/resize:bg-fill-accent group-focus-visible/resize:opacity-100 group-focus-visible/resize:delay-0")} />
    {children}
  </div>;
});
