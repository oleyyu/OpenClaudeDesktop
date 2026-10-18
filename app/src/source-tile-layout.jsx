import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SourceTooltip } from "./source-tooltip";
import { t } from "../electron/i18n/index.mjs";
import {
  CHAT_TILE_ID, TILE_CONFIG, adjustFlexes, chatContentInset, cloneNode, coveredWidth, distributeFlex, findStack, findTilePath, layoutsEqual, minSize, moveTile, nodeKey,
  orderedTileIds, parentAtPath, resolveLayout, withChatMinimum,
} from "./tile-layout-model.mjs";
import { createDragSnapshot, hitTest, indicatorOutset } from "./tile-drop-zones.mjs";
// 2.42304.0 cc43287c9 Rre / B9 over cf53e1812's tile math (generated): room for the chat when a pane opens.
import { fitOpenedLayout } from "./generated/code-current/tile-fit-opened.mjs";
import "./source-tile-layout.css";
import { tileRegion } from "./focus-region-model.mjs";

// Recursive tile layout host (independent implementation of the 2.2553.1
// pane engine: c360a9e1c-GPs-MV9u.js $m engine 8750-9552, gh renderer
// 9721-10030, _h stack 10031-10183, Sh tile wrap 10214-10405, Ah drag handle,
// Mh separator, Nh indicator). Layout data comes from tile-layout-model.mjs,
// drop geometry from tile-drop-zones.mjs.
const KEY_STEP = 24;
const KEY_STEP_LARGE = 120;
const NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);
const SIDE_LABEL = { left: t("Move left"), right: t("Move right"), up: t("Move up"), down: t("Move down") };
const SIDE_STATUS = {
  left: t("Press Enter to move left, or Escape to cancel."),
  right: t("Press Enter to move right, or Escape to cancel."),
  up: t("Press Enter to move up, or Escape to cancel."),
  down: t("Press Enter to move down, or Escape to cancel."),
};
const NO_HANDLES = Object.freeze({ left: null, right: null, top: null, bottom: null });
const isPlainKey = (event) => !event.ctrlKey && !event.metaKey && !event.altKey;
const boundaryKey = (boundary) => `${boundary.stackId}:${boundary.boundaryIndex}`;

function edgeFromPlacement(placement, direction) {
  const row = direction === "row";
  switch (placement) {
    case "main-start": return row ? "left" : "top";
    case "main-end": return row ? "right" : "bottom";
    case "cross-start": return row ? "top" : "left";
    default: return row ? "bottom" : "right";
  }
}

function DropIndicator({ edge, outset }) {
  const vertical = edge === "left" || edge === "right";
  const position =
    edge === "left" ? { left: -outset, top: 0, bottom: 0 }
      : edge === "right" ? { right: -outset, top: 0, bottom: 0 }
        : edge === "top" ? { top: -outset, left: 0, right: 0 }
          : { bottom: -outset, left: 0, right: 0 };
  return <div className="tiles-drop-indicator" data-edge={edge} style={{ ...position, ...(vertical ? { width: 3 } : { height: 3 }) }} />;
}

function DragHandle({ tileId, isActive, isDragging, previewSide, describedById, onPointerDown, onKeyDown, onBlur }) {
  const [hovered, setHovered] = useState(false);
  const label = previewSide ? SIDE_LABEL[previewSide] : t("Move");
  return (
    <SourceTooltip content={label} shortcut={previewSide ? "enter" : undefined} side="bottom" open={previewSide !== null || hovered}
      onOpenChange={setHovered} hoverable={false}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={describedById}
        data-tile-drag-handle={tileId}
        className={`tiles-drag-handle${isActive ? " is-active" : ""}`}
        data-dragging={isDragging || undefined}
        onPointerDown={onPointerDown}
        onMouseDown={(event) => event.preventDefault()}
        onKeyDown={(event) => { setHovered(false); onKeyDown(event); }}
        onBlur={onBlur}
      >
        <span aria-hidden="true" className="tiles-drag-handle-affordance" />
      </button>
    </SourceTooltip>
  );
}

function Separator({ direction, isActive, isDropTarget, isDisabled, size, depth, valueNow, ariaLabel, cornerStart, cornerEnd, onPointerDown, onDoubleClick, onKeyDown }) {
  const row = direction === "row";
  const [hovered, setHovered] = useState(false);
  return (
    <SourceTooltip content={t("Resize")} open={hovered && !isDisabled} onOpenChange={setHovered} hoverable={false}>
      <div
        role="separator"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled || undefined}
        aria-orientation={row ? "vertical" : "horizontal"}
        aria-valuenow={valueNow}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={`tiles-handle${isActive ? " is-active" : ""}`}
        data-drop-target={isDropTarget || undefined}
        style={{ zIndex: 1 + depth, ...(row ? { cursor: "col-resize", alignSelf: "stretch", width: size } : { cursor: "row-resize", height: size }), pointerEvents: isDisabled ? "none" : undefined }}
        onPointerDown={onPointerDown}
        onMouseDown={(event) => event.preventDefault()}
        onDoubleClick={onDoubleClick}
        onKeyDown={(event) => { if (isDisabled) return; setHovered(false); onKeyDown(event); }}
      >
        <span className="tiles-handle-affordance" style={row ? { width: 3, height: isDropTarget ? "100%" : 56 } : { width: isDropTarget ? "100%" : 56, height: 3 }} />
        {cornerStart && <span className="tiles-handle-corner" style={{ width: size, height: size, ...(row ? { left: 0, top: -size } : { top: 0, left: -size }) }}
          onPointerDown={cornerStart.onPointerDown} onDoubleClick={(event) => event.stopPropagation()} />}
        {cornerEnd && <span className="tiles-handle-corner" style={{ width: size, height: size, ...(row ? { left: 0, bottom: -size } : { top: 0, right: -size }) }}
          onPointerDown={cornerEnd.onPointerDown} onDoubleClick={(event) => event.stopPropagation()} />}
      </div>
    </SourceTooltip>
  );
}

function TileWrap({ node, flex, config, minWidthSize, edgeHandles, engine, tileById, hosts, isTop }) {
  const tile = tileById(node.tileId);
  const overflowMin = tile?.overflowMin ?? null;
  const target = engine.feedback.target;
  const wrapEdge = target?.kind === "wrap" && target.tileId === node.tileId
    ? edgeFromPlacement(target.index === 0 ? "main-start" : "main-end", target.direction)
    : null;
  const isDragged = engine.dragVisualTileId === node.tileId;
  // The part of an overflowing shell (2.2553.1 overflowMin) that its neighbour covers: the shell keeps its minimum
  // width. Its content is inset by the covered part (--tile-covered-content-end / -start, the side away from the
  // anchor) only while the transcript and composer keep a usable width (chatContentInset); below that they stay that
  // wide under the pane, as the official shell does, and only the titlebar takes the rest (--tile-covered-extra-*)
  // so its title and actions stay in the visible part.
  const [covered, setCovered] = useState(0);
  const wrapEl = useRef(null);
  const register = engine.registerNodeEl(node.tileId);
  const wrapRef = useCallback((element) => { wrapEl.current = element; register?.(element); }, [register]);
  const minimum = overflowMin?.width ?? 0;
  useLayoutEffect(() => {
    const element = wrapEl.current;
    if (!minimum || !element || typeof ResizeObserver !== "function") { setCovered(0); return undefined; }
    const measure = () => setCovered(coveredWidth(minimum, element.getBoundingClientRect().width, config.gap));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minimum, config.gap]);
  const inset = chatContentInset(covered, minimum);
  const coveredSide = overflowMin?.anchor === "right" ? "start" : "end";
  const shellStyle = overflowMin
    ? { position: "absolute", top: 0, bottom: 0, [overflowMin.anchor]: 0, width: "100%", minWidth: overflowMin.width, "--tile-overflow-min": `${overflowMin.width}px`,
      [`--tile-covered-content-${coveredSide}`]: `${inset.content}px`, [`--tile-covered-extra-${coveredSide}`]: `${inset.extra}px` }
    : undefined;
  const adopt = useCallback((element) => {
    if (element) hosts.adopt(node.tileId, element);
  }, [hosts, node.tileId]);
  return (
    <div
      ref={wrapRef}
      data-pane-root="" className={`tiles-tile-wrap ${node.tileId === "chat" ? "source-chat-tile" : "source-side-tile shadow-panel-sm"}`}
      data-tile-id={node.tileId}
      // ca1d33d05 Et (codeTile, focus-region-model.mjs tileRegion): each side pane is a stop placed by its pane and its
      // tile's reading order; the chat tile's are its title ("header") and composer.
      data-focus-region={node.tileId === "chat" ? undefined : tileRegion(node.tileId)} data-focus-region-instance={node.tileId === "chat" ? undefined : node.tileId}
      data-focus-region-order={node.tileId === "chat" ? undefined : "pane"}
      data-tile-active={isDragged || undefined}
      data-tile-top={isTop || undefined}
      style={{ zIndex: overflowMin ? 0 : 1, flexGrow: flex, flexShrink: 1, flexBasis: 0, minWidth: minWidthSize, minHeight: config.minTileBasePx }}
    >
      <div ref={adopt} className="tiles-shell" data-tile-overflow-anchor={overflowMin?.anchor} style={shellStyle} />
      {wrapEdge && <DropIndicator edge={wrapEdge} outset={indicatorOutset(config, edgeHandles, wrapEdge)} />}
    </div>
  );
}

// What a resize handle's sides are called (2.2553.1 xh/Sh, 'Resize {left} and {right}'): each side's tile names
// (tiles[].name; a stack's joined with ", "), else — a side without names, or both the same — their positions.
function nodeName(node, tileById) {
  if (!node) return null;
  if (node.tileId !== undefined) return tileById(node.tileId)?.name?.trim() || null;
  const names = [];
  for (const child of node.children ?? []) { const name = nodeName(child, tileById); if (!name) return null; names.push(name); }
  return names.length ? names.join(t(", ")) : null;
}
function resizeLabel(node, index, tileById) {
  const left = nodeName(node.children[index], tileById), right = nodeName(node.children[index + 1], tileById);
  const named = left !== null && right !== null && left !== right;
  return t("Resize {left} and {right}", { left: named ? left : index + 1, right: named ? right : index + 2 });
}
function Stack({ node, depth, config, engine, resolved, tileById, hosts, parentDirection, edgeHandles, topTileId }) {
  const info = resolved.get(nodeKey(node));
  const flex = info?.resolvedFlex ?? node.flex;
  const rowMin = info?.rowMin ?? 0;
  if (node.kind === "tile") {
    if (!tileById(node.tileId)) return null;
    return <TileWrap node={node} flex={flex} config={config} minWidthSize={rowMin} edgeHandles={edgeHandles} engine={engine} tileById={tileById} hosts={hosts} isTop={topTileId === node.tileId} />;
  }
  const target = engine.feedback.target;
  const isRow = node.direction === "row";
  const cross = isRow ? "column" : "row";
  const mainIndex =
    (target?.kind === "split" && target.stackId === node.id && target.direction === node.direction) || (target?.kind === "insert" && target.stackId === node.id)
      ? target.index : null;
  const placement =
    target?.kind === "split" && target.stackId === node.id && target.direction === cross
      ? target.index === 0 ? "cross-start" : "cross-end"
      : mainIndex === 0 ? "main-start" : mainIndex === node.children.length ? "main-end" : null;
  const edge = placement === null ? null : edgeFromPlacement(placement, node.direction);
  const flexes = node.children.map((child) => resolved.get(nodeKey(child))?.resolvedFlex ?? child.flex);
  const boundaryAt = (index) => (index >= 0 && index < node.children.length - 1 ? { stackId: node.id, boundaryIndex: index } : null);
  const childHandles = (index) => {
    const last = node.children.length - 1;
    const start = index === 0 ? (isRow ? edgeHandles.left : edgeHandles.top) : boundaryAt(index - 1);
    const end = index === last ? (isRow ? edgeHandles.right : edgeHandles.bottom) : boundaryAt(index);
    return isRow ? { ...edgeHandles, left: start, right: end } : { ...edgeHandles, top: start, bottom: end };
  };
  const cornerStart = isRow ? edgeHandles.top : edgeHandles.left;
  const cornerEnd = isRow ? edgeHandles.bottom : edgeHandles.right;
  return (
    <div
      ref={engine.registerNodeEl(node.id)}
      className="tiles-stack"
      data-stack-id={node.id}
      data-direction={node.direction}
      style={{ flexDirection: node.direction, flex: depth === 0 ? "1 1 0" : `${flex} 1 0`, minWidth: parentDirection === "row" ? rowMin : 0 }}
    >
      {node.children.map((child, index) => (
        <React.Fragment key={nodeKey(child)}>
          <Stack node={child} depth={depth + 1} config={config} engine={engine} resolved={resolved} tileById={tileById} hosts={hosts}
            parentDirection={node.direction} edgeHandles={childHandles(index)} topTileId={topTileId} />
          {index < node.children.length - 1 && (
            <Separator
              direction={node.direction}
              isActive={engine.activeBoundaries.has(`${node.id}:${index}`)}
              isDropTarget={mainIndex === index + 1}
              isDisabled={engine.isDraggingTile}
              size={config.gap}
              depth={depth}
              valueNow={Math.round((flexes[index] / (flexes[index] + flexes[index + 1])) * 100)}
              ariaLabel={resizeLabel(node, index, tileById)}
              cornerStart={cornerStart ? engine.getCornerProps({ stackId: node.id, boundaryIndex: index }, cornerStart) : undefined}
              cornerEnd={cornerEnd ? engine.getCornerProps({ stackId: node.id, boundaryIndex: index }, cornerEnd) : undefined}
              {...engine.getHandleProps(node.id, index)}
            />
          )}
        </React.Fragment>
      ))}
      {edge && <DropIndicator edge={edge} outset={indicatorOutset(config, edgeHandles, edge)} />}
    </div>
  );
}

// Content hosts: each tile renders once through a portal into a detached
// element that the current shell adopts, so structural moves keep React
// state and DOM (the official engine parks tile content the same way).
function useContentHosts() {
  const hosts = useRef(new Map());
  return useMemo(() => ({
    host(tileId) {
      let host = hosts.current.get(tileId);
      if (!host) {
        host = document.createElement("div");
        host.className = "tiles-content-host";
        hosts.current.set(tileId, host);
      }
      return host;
    },
    adopt(tileId, shell) {
      const host = this.host(tileId);
      if (host.parentNode !== shell) shell.appendChild(host);
    },
    release(tileId) {
      const host = hosts.current.get(tileId);
      if (host) { host.remove(); hosts.current.delete(tileId); }
    },
  }), []);
}

export function SourceTileLayout({ layout, onLayoutChange, tiles, renderTile, config = TILE_CONFIG, onTileTearOff, hasPane = true, dataAttributes, restoreKey = null, onRestoreLayout, tileHosts = null }) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const nodeEls = useRef(new Map());
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const interaction = useRef({ mode: "idle" });
  const [dragVisual, setDragVisual] = useState(null);
  const [isDraggingTile, setIsDraggingTile] = useState(false);
  const [feedback, setFeedback] = useState({ target: null });
  const [keyboardPreview, setKeyboardPreview] = useState(null);
  const [lastKeyboardMove, setLastKeyboardMove] = useState(null);
  const [activeBoundaries, setActiveBoundaries] = useState(() => new Set());
  const [containerSize, setContainerSize] = useState(null);
  const moveSeq = useRef(0);
  const focusAfterMove = useRef(null);
  const instructionsId = useId();
  const hosts = useContentHosts();
  const tileById = useCallback((id) => tiles.find((tile) => tile.id === id) ?? null, [tiles]);
  const changeLayout = useCallback((next, changedKeys) => {
    layoutRef.current = next;
    onLayoutChange(next, changedKeys);
  }, [onLayoutChange]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const read = () => {
      // Content box (clientWidth excludes any border), so the rounded pixel
      // resolution matches the CSS flex free space exactly.
      const styles = getComputedStyle(element);
      const width = element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const height = element.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
      setContainerSize((previous) => (previous && Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5 ? previous : { width, height }));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const resolved = useMemo(() => {
    const map = new Map();
    resolveLayout(layout.root, containerSize, tileById, config, (stack, child, index, resolvedFlex, box, rowMin) => {
      map.set(nodeKey(child), { resolvedFlex, rowMin });
    });
    return map;
  }, [layout, containerSize, tileById, config]);

  // Reopening a layout (another session, a relaunch: restoreKey changes) gives a chat dragged below its overflowMin
  // its width back, once per key and only once it has a neighbour, so a saved 100 px chat never comes back as a
  // stub composer. A drag in this view is left as the user made it.
  const restoredFor = useRef(undefined);
  useLayoutEffect(() => {
    if (!containerSize || restoredFor.current === restoreKey || interaction.current.mode !== "idle") return;
    if (!orderedTileIds(layout).some((id) => id !== CHAT_TILE_ID)) return;
    restoredFor.current = restoreKey;
    const next = withChatMinimum(layout, containerSize, tileById, config);
    if (next === layout) return;
    // Saved under the key it was read for: the host's own "current session" may not have caught up yet.
    layoutRef.current = next;
    if (onRestoreLayout) onRestoreLayout(next, restoreKey);
    else onLayoutChange(next, [CHAT_TILE_ID]);
  }, [restoreKey, layout, containerSize, tileById, config, onRestoreLayout, onLayoutChange]);

  // cc43287c9 `Ne = Lt((layout, rootRowOnly) => Rre({layout, containerWidth: root width, splitConfig: Me, tileById: G9,
  // rootRowOnly}))`, registered as the store's tileHost while mounted (removed only if it is still the one there). The
  // host reads the latest width, config and tiles when called (Lt). Me is the tile config with paddingEnd padding + the
  // inspector dock (none locally); the official container's 1px border (contentBox's default borderPx) is not drawn
  // here (source-tile-layout.css), so borderPx is 0. Locally the store is shared by the window's split panes: the host
  // is kept under this layout's owner (restoreKey).
  const fitOpened = useRef(null);
  fitOpened.current = (next, rootRowOnly) => {
    const element = containerRef.current;
    return element === null ? next : fitOpenedLayout({ layout: next, containerWidth: element.getBoundingClientRect().width,
      splitConfig: { ...config, borderPx: config.borderPx ?? 0 }, tileById, rootRowOnly });
  };
  const tileHost = useMemo(() => ({ fitOpenedLayout: (next, rootRowOnly) => fitOpened.current(next, rootRowOnly) }), []);
  useLayoutEffect(() => {
    if (!tileHosts) return undefined;
    tileHosts.setTileHost(restoreKey, tileHost);
    return () => { if (tileHosts.tileHost(restoreKey) === tileHost) tileHosts.setTileHost(restoreKey, null); };
  }, [tileHosts, restoreKey, tileHost]);

  const registerNodeEl = useCallback((key) => (element) => {
    if (element) nodeEls.current.set(key, element);
    else nodeEls.current.delete(key);
  }, []);
  const measure = useCallback((key) => nodeEls.current.get(key)?.getBoundingClientRect() ?? null, []);

  // Boundary arithmetic: normalized flexes, px per flex and the neighbour minima.
  const measureBoundary = useCallback((stack, index, options) => {
    const element = nodeEls.current.get(stack.id);
    const box = element?.getBoundingClientRect();
    const extent = box ? (stack.direction === "row" ? box.width : box.height) : 0;
    const usable = Math.max(0, extent - config.gap * Math.max(0, stack.children.length - 1));
    const reachable = stack.children.map((child) => minSize(child, stack.direction, tileById, config, { overflowMinReachable: true }));
    const count = stack.children.length;
    const pxPerFlex = usable > 0 ? usable / count : 1;
    const minPx = {
      before: options?.overflowMinReachable ? reachable[index] : minSize(stack.children[index], stack.direction, tileById, config),
      after: options?.overflowMinReachable ? reachable[index + 1] : minSize(stack.children[index + 1], stack.direction, tileById, config),
    };
    const normalized = distributeFlex(stack.children.map((child) => child.flex), reachable, usable);
    return { startFlexes: adjustFlexes(normalized, index, 0, pxPerFlex, minPx), pxPerFlex, minPx };
  }, [config, tileById]);

  const applyFlexStyles = useCallback((stack, flexes) => {
    stack.children.forEach((child, index) => {
      const element = nodeEls.current.get(nodeKey(child));
      if (element && flexes[index] !== undefined) element.style.flexGrow = String(flexes[index]);
    });
  }, []);
  const commitFlexes = useCallback((stackId, index, start, next) => {
    if (Math.abs(next[index] - start[index]) < 1e-6) return false;
    const root = cloneNode(layoutRef.current.root);
    const stack = findStack(root, stackId);
    if (!stack) return false;
    stack.children = stack.children.map((child, childIndex) => ({ ...child, flex: next[childIndex] ?? child.flex }));
    changeLayout({ root }, [nodeKey(stack.children[index]), nodeKey(stack.children[index + 1])]);
    return true;
  }, [changeLayout]);
  const equalize = useCallback((stackId, index) => {
    if (interaction.current.mode !== "idle") return;
    const stack = findStack(layoutRef.current.root, stackId);
    if (!stack || index + 1 >= stack.children.length) return;
    const measured = measureBoundary(stack, index);
    const a = measured.startFlexes[index], b = measured.startFlexes[index + 1];
    const next = adjustFlexes(measured.startFlexes, index, ((b - a) / 2) * measured.pxPerFlex, measured.pxPerFlex, measured.minPx);
    commitFlexes(stackId, index, measured.startFlexes, next);
  }, [measureBoundary, commitFlexes]);

  const finishInteraction = useCallback(() => {
    interaction.current = { mode: "idle" };
    setIsDraggingTile(false);
    setActiveBoundaries(new Set());
    setFeedback({ target: null });
  }, []);

  const startResize = useCallback((event, boundaries) => {
    if (event.button !== 0 || interaction.current.mode !== "idle") return;
    const prepared = [];
    for (const { stackId, boundaryIndex } of boundaries) {
      const stack = findStack(layoutRef.current.root, stackId);
      if (!stack || boundaryIndex + 1 >= stack.children.length) return;
      prepared.push({ stackId, boundaryIndex, direction: stack.direction, ...measureBoundary(stack, boundaryIndex, { overflowMinReachable: true }), live: null });
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    interaction.current = { mode: "resizing-boundary", pointerId: event.pointerId, startPointer: { x: event.clientX, y: event.clientY }, boundaries: prepared };
    setActiveBoundaries(new Set(prepared.map(boundaryKey)));
  }, [measureBoundary]);

  const getHandleProps = useCallback((stackId, index) => ({
    onPointerDown: (event) => startResize(event, [{ stackId, boundaryIndex: index }]),
    onDoubleClick: () => equalize(stackId, index),
    onKeyDown: (event) => {
      if (interaction.current.mode !== "idle") return;
      const stack = findStack(layoutRef.current.root, stackId);
      if (!stack) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) equalize(stackId, index);
        return;
      }
      if (!isPlainKey(event)) return;
      const row = stack.direction === "row";
      const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
      let delta = null;
      switch (event.key) {
        case "ArrowLeft": delta = row ? -step : null; break;
        case "ArrowRight": delta = row ? step : null; break;
        case "ArrowUp": delta = row ? null : -step; break;
        case "ArrowDown": delta = row ? null : step; break;
        case "Home": delta = -Infinity; break;
        case "End": delta = Infinity; break;
        default: delta = null;
      }
      if (delta === null) return;
      event.preventDefault();
      const measured = measureBoundary(stack, index);
      commitFlexes(stackId, index, measured.startFlexes, adjustFlexes(measured.startFlexes, index, delta, measured.pxPerFlex, measured.minPx));
    },
  }), [startResize, equalize, measureBoundary, commitFlexes]);
  const getCornerProps = useCallback((own, other) => ({
    onPointerDown: (event) => { event.stopPropagation(); startResize(event, [own, other]); },
  }), [startResize]);

  const commitKeyboardMove = useCallback((tileId, target) => {
    const next = moveTile(layoutRef.current, tileId, target);
    focusAfterMove.current = tileId;
    changeLayout(next);
    const path = findTilePath(next.root, tileId);
    const parent = path ? parentAtPath(next.root, path) : null;
    moveSeq.current += 1;
    setLastKeyboardMove({ position: path ? path[path.length - 1] + 1 : 1, total: parent?.children.length ?? 1, seq: moveSeq.current });
  }, [changeLayout]);

  const getTileDragProps = useCallback((tileId) => ({
    onPointerDown: (event) => {
      if (event.button !== 0 || interaction.current.mode !== "idle" || !tileById(tileId)) return;
      const container = containerRef.current;
      if (!container) return;
      event.preventDefault();
      const snapshot = createDragSnapshot({
        layout: layoutRef.current, containerRect: container.getBoundingClientRect(), measure, sourceTileId: tileId, gap: config.gap,
        startPointer: { x: event.clientX, y: event.clientY },
      });
      const element = nodeEls.current.get(tileId);
      const origin = element?.getBoundingClientRect() ?? null;
      setFeedback({ target: null });
      setKeyboardPreview(null);
      setLastKeyboardMove(null);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      interaction.current = {
        mode: "dragging-tile", tileId, pointerId: event.pointerId, startPointer: { x: event.clientX, y: event.clientY },
        startLayout: layoutRef.current, snapshot, pendingLayout: null, tearOff: null, delta: { x: 0, y: 0 },
        origin: origin ? { left: origin.left, top: origin.top } : null, slotShift: { x: 0, y: 0 },
      };
      if (element) { element.style.transition = "none"; element.style.transform = "translate(0px, 0px)"; }
      setDragVisual(tileId);
      setIsDraggingTile(true);
    },
    onKeyDown: (event) => {
      if (interaction.current.mode !== "idle") return;
      const current = feedbackRef.current.target;
      if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
        if (!current) return;
        event.preventDefault();
        setFeedback({ target: null });
        setKeyboardPreview(null);
        if (event.key !== "Escape") commitKeyboardMove(tileId, current);
        return;
      }
      if (!NAVIGATION_KEYS.has(event.key) || !isPlainKey(event)) return;
      event.preventDefault();
      const root = layoutRef.current.root;
      const path = findTilePath(root, tileId);
      const parent = path ? parentAtPath(root, path) : null;
      if (!path || !parent) return;
      const index = path[path.length - 1];
      const last = parent.children.length - 1;
      const row = parent.direction === "row";
      const cross = row ? "column" : "row";
      const split = (at) => ({ kind: "split", stackId: parent.id, direction: cross, index: at });
      const preview = (() => {
        switch (event.key) {
          case "ArrowLeft": return row ? null : { target: split(0), side: "left" };
          case "ArrowRight": return row ? null : { target: split(1), side: "right" };
          case "ArrowUp": return row ? { target: split(0), side: "up" } : null;
          case "ArrowDown": return row ? { target: split(1), side: "down" } : null;
          default: return null;
        }
      })();
      if (preview) {
        setFeedback({ target: preview.target });
        setKeyboardPreview({ tileId, side: preview.side });
        setLastKeyboardMove(null);
        return;
      }
      setFeedback({ target: null });
      setKeyboardPreview(null);
      const next = (() => {
        switch (event.key) {
          case "ArrowLeft": case "ArrowUp": return index - 1;
          case "ArrowRight": case "ArrowDown": return index + 1;
          case "Home": return 0;
          case "End": return last;
          default: return index;
        }
      })();
      const clamped = Math.max(0, Math.min(last, next));
      if (clamped !== index) commitKeyboardMove(tileId, { kind: "insert", stackId: parent.id, index: clamped });
    },
    onBlur: () => {
      if (interaction.current.mode === "idle") { setFeedback({ target: null }); setKeyboardPreview(null); }
    },
  }), [tileById, measure, config.gap, commitKeyboardMove]);
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;

  // Window-level pointer/keyboard lifecycle while an interaction is active.
  useEffect(() => {
    if (!isDraggingTile && activeBoundaries.size === 0) return undefined;
    const view = containerRef.current?.ownerDocument.defaultView ?? window;
    const settle = (tileId) => {
      const element = nodeEls.current.get(tileId);
      if (!element) return;
      element.style.transition = "";
      element.style.transform = "";
    };
    const move = (event) => {
      const current = interaction.current;
      if (current.mode === "idle" || event.pointerId !== current.pointerId) return;
      if (current.mode === "dragging-tile") {
        const dx = event.clientX - current.startPointer.x, dy = event.clientY - current.startPointer.y;
        current.delta = { x: dx, y: dy };
        const element = nodeEls.current.get(current.tileId);
        if (element) element.style.transform = `translate(${dx + current.slotShift.x}px, ${dy + current.slotShift.y}px)`;
        if (onTileTearOff) {
          const outside = event.clientX < 0 || event.clientY < 0 || event.clientX > view.innerWidth || event.clientY > view.innerHeight;
          current.tearOff = outside ? { tileId: current.tileId, screen: { x: event.screenX, y: event.screenY } } : null;
        }
        if (!current.snapshot) return;
        const result = hitTest(layoutRef.current, current.snapshot, current.tileId, { x: event.clientX, y: event.clientY });
        current.pendingLayout = result.pendingLayout;
        if (result.liveLayout && !layoutsEqual(result.liveLayout, layoutRef.current)) changeLayout(result.liveLayout);
        setFeedback(result.feedback);
        return;
      }
      const dx = event.clientX - current.startPointer.x, dy = event.clientY - current.startPointer.y;
      for (const boundary of current.boundaries) {
        const stack = findStack(layoutRef.current.root, boundary.stackId);
        if (!stack) continue;
        boundary.live = adjustFlexes(boundary.startFlexes, boundary.boundaryIndex, boundary.direction === "row" ? dx : dy, boundary.pxPerFlex, boundary.minPx);
        applyFlexStyles(stack, boundary.live);
      }
    };
    const up = (event) => {
      const current = interaction.current;
      if (current.mode === "idle" || event.pointerId !== current.pointerId) return;
      if (current.mode === "dragging-tile") {
        const tearOff = current.tearOff;
        current.tearOff = null;
        if (tearOff && tearOff.tileId === current.tileId && onTileTearOff?.(tearOff.tileId, tearOff.screen)) {
          settle(current.tileId);
          setDragVisual(null);
          finishInteraction();
          return;
        }
        if (current.pendingLayout && !layoutsEqual(current.pendingLayout, layoutRef.current)) changeLayout(current.pendingLayout);
        settle(current.tileId);
        setDragVisual(null);
        finishInteraction();
        return;
      }
      let committed = false;
      for (const boundary of current.boundaries) {
        if (!boundary.live) continue;
        if (commitFlexes(boundary.stackId, boundary.boundaryIndex, boundary.startFlexes, boundary.live)) committed = true;
      }
      if (!committed) for (const boundary of current.boundaries) {
        const stack = findStack(layoutRef.current.root, boundary.stackId);
        if (stack) applyFlexStyles(stack, boundary.startFlexes);
      }
      finishInteraction();
    };
    const cancel = () => {
      const current = interaction.current;
      if (current.mode === "idle") return;
      if (current.mode === "dragging-tile") {
        current.tearOff = null;
        current.pendingLayout = null;
        if (!layoutsEqual(current.startLayout, layoutRef.current)) changeLayout(current.startLayout);
        settle(current.tileId);
        setDragVisual(null);
        finishInteraction();
        return;
      }
      for (const boundary of current.boundaries) {
        const stack = findStack(layoutRef.current.root, boundary.stackId);
        if (stack) applyFlexStyles(stack, boundary.startFlexes);
      }
      finishInteraction();
    };
    const key = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || interaction.current.mode === "idle") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cancel();
    };
    const pointerCancel = (event) => {
      const current = interaction.current;
      if (current.mode !== "idle" && event.pointerId === current.pointerId) cancel();
    };
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", pointerCancel);
    view.addEventListener("keydown", key, true);
    return () => {
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerup", up);
      view.removeEventListener("pointercancel", pointerCancel);
      view.removeEventListener("keydown", key, true);
    };
  }, [isDraggingTile, activeBoundaries, onTileTearOff, changeLayout, finishInteraction, commitFlexes, applyFlexStyles]);

  // The preview tooltip owns Escape at document capture (it stops propagation
  // before the handle's React handler), so the preview cancels from the same
  // phase; Enter still reaches the handle.
  useEffect(() => {
    if (!keyboardPreview) return undefined;
    const doc = viewportRef.current?.ownerDocument ?? document;
    const key = (event) => {
      if (event.key !== "Escape" || event.isComposing || interaction.current.mode !== "idle") return;
      event.preventDefault();
      event.stopPropagation();
      setFeedback({ target: null });
      setKeyboardPreview(null);
    };
    doc.addEventListener("keydown", key, true);
    return () => doc.removeEventListener("keydown", key, true);
  }, [keyboardPreview]);

  // A live reorder moves the dragged tile's slot: keep it under the pointer.
  useLayoutEffect(() => {
    const current = interaction.current;
    if (current.mode !== "dragging-tile" || !current.origin) return;
    const element = nodeEls.current.get(current.tileId);
    if (!element) return;
    const saved = element.style.transform;
    element.style.transform = "none";
    const box = element.getBoundingClientRect();
    element.style.transform = saved;
    current.slotShift = { x: current.origin.left - box.left, y: current.origin.top - box.top };
    element.style.transform = `translate(${current.delta.x + current.slotShift.x}px, ${current.delta.y + current.slotShift.y}px)`;
  }, [layout]);

  // Keyboard moves re-focus the handle after the structure changes.
  useLayoutEffect(() => {
    const tileId = focusAfterMove.current;
    if (!tileId) return;
    focusAfterMove.current = null;
    viewportRef.current?.querySelector(`[data-tile-drag-handle="${CSS.escape(tileId)}"]`)?.focus({ preventScroll: true });
  }, [layout]);

  useEffect(() => () => { for (const tile of tiles) hosts.release(tile.id); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleIds = useMemo(() => orderedTileIds(layout), [layout]);
  const visibleTiles = useMemo(() => tiles.filter((tile) => visibleIds.includes(tile.id)), [tiles, visibleIds]);
  useEffect(() => {
    for (const tile of tiles) if (!visibleIds.includes(tile.id)) hosts.release(tile.id);
  }, [tiles, visibleIds, hosts]);
  const canDrag = visibleTiles.length > 1;
  const engine = useMemo(() => ({
    feedback, dragVisualTileId: dragVisual, isDraggingTile, activeBoundaries, registerNodeEl, getHandleProps, getCornerProps,
  }), [feedback, dragVisual, isDraggingTile, activeBoundaries, registerNodeEl, getHandleProps, getCornerProps]);
  const serialized = useMemo(() => JSON.stringify(layout.root, (key, value) => (key === "id" ? undefined : value)), [layout]);

  return (
    <div
      ref={viewportRef}
      className={`source-pane-layout tiles-viewport${isDraggingTile ? " tiles-dragging" : ""}`}
      data-has-pane={hasPane}
      data-dragging={isDraggingTile || undefined}
      data-resizing={activeBoundaries.size > 0 || undefined}
      data-tile-layout={serialized}
      {...dataAttributes}
    >
      <div ref={containerRef} className="tiles-container" style={{ padding: hasPane ? config.padding : undefined, "--tiles-gap": `${config.gap}px`, "--tiles-padding": `${config.padding}px` }}>
        <Stack node={layout.root} depth={0} config={config} engine={engine} resolved={resolved} tileById={tileById} hosts={hosts}
          parentDirection={undefined} edgeHandles={NO_HANDLES} topTileId={visibleIds[0]} />
      </div>
      {visibleTiles.map((tile) => createPortal(
        renderTile(tile.id, {
          dragHandle: canDrag && tile.id !== "chat"
            ? <DragHandle tileId={tile.id} isActive={dragVisual === tile.id} isDragging={isDraggingTile && dragVisual === tile.id}
              previewSide={keyboardPreview?.tileId === tile.id ? keyboardPreview.side : null} describedById={instructionsId} {...getTileDragProps(tile.id)} />
            : null,
          isActive: dragVisual === tile.id,
        }),
        hosts.host(tile.id),
        tile.id,
      ))}
      <span id={instructionsId} className="source-sr-only">
        {t("Arrow keys move the tile. Perpendicular arrows preview a split; press Enter to commit or Escape to cancel.")}
      </span>
      <span role="status" className="source-sr-only" data-tiles-status="">
        {keyboardPreview
          ? SIDE_STATUS[keyboardPreview.side]
          : lastKeyboardMove && <span key={lastKeyboardMove.seq}>{t("Tile moved to position {position} of {total}", { position: lastKeyboardMove.position, total: lastKeyboardMove.total })}</span>}
      </span>
    </div>
  );
}
