import {isGoToFileShortcut} from "./diff-go-to-file-model.mjs";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceMenu, useMenuPopup } from "./source-menu";
import { SourceTooltip } from "./source-tooltip";
import { isAtEdge } from "./tile-layout-model.mjs";
import "./source-pane-controls.css";
import { t } from "../electron/i18n/index.mjs";

// Pane header trailing cluster, written from the traced 2.2553.1 behavior
// (panes-toggle-current.js ka :1448-1560, sa :1022-1194, ca :1194-1298;
// cd5e3435c z/P/L/R): [custom] + "{pane} settings" DotsVertical menu that
// only renders the pane-supplied sections (nothing when empty, a bare icon
// button for a single simple item) + the Expand/Collapse ghost button, which
// doubles as the arrange-popup trigger (click toggles Fill/Tile; hover,
// long-press, right-click or ArrowDown open a popup with the Move and
// "Fill and arrange" icon rows and "Open in new window") + Close.
export const TOGGLE_EXPAND_SHORTCUT = "Meta+Shift+\\";
export const CLOSE_PANE_SHORTCUT = "Meta+\\";
// Tooltip key specs; shared-frame Mu draws them in io modifier order (shift before cmd).
const TOGGLE_SHORTCUT_LABEL = "cmd+shift+\\";
const CLOSE_SHORTCUT_LABEL = "cmd+\\";
const LONG_PRESS_MS = 500; // touch/pen press that opens the popup instead of toggling
const LONG_PRESS_SLOP_PX = 10; // movement that cancels the press
const HOVER_OPEN_MS = 100; // Base UI Menu.Trigger openOnHover delay
const HOVER_LEAVE_GRACE_MS = 120; // time allowed to cross from the trigger into the popup
const EDGES = [
  ["left", t("Move to left")],
  ["right", t("Move to right")],
  ["top", t("Move to top")],
  ["bottom", t("Move to bottom")],
];

function GhostButton({ label, icon, shortcut, tooltip = label, tooltipOpen, onClick, className = "", children, buttonRef, ...rest }) {
  return (
    <SourceTooltip content={t(tooltip)} shortcut={shortcut} side="bottom" hoverable={false} open={tooltipOpen}>
      <button type="button" ref={buttonRef} className={`source-icon-button spc-ghost ${className}`.trim()} aria-label={t(label)} onClick={onClick}
        onMouseDown={(event) => event.preventDefault()} {...rest}>
        {children ?? <Icon name={icon} size={16} />}
      </button>
    </SourceTooltip>
  );
}

// Layout glyphs of the arrange popup: a 16px rounded frame with the region
// the pick would occupy filled in ("Tile" shows the other pane at half
// opacity). Drawn as plain rects on the same 16-unit grid as the icon font.
const GLYPH_REGIONS = {
  left: [4, 4, 4, 8],
  right: [8, 4, 4, 8],
  top: [4, 4, 8, 4],
  bottom: [4, 8, 8, 4],
  fill: [4, 4, 8, 8],
  tile: [8.5, 4, 3.5, 8],
};
function LayoutGlyph({ kind }) {
  const [x, y, width, height] = GLYPH_REGIONS[kind];
  return (
    <svg className="spc-glyph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" />
      <rect x={x} y={y} width={width} height={height} rx="0.5" fill="currentColor" />
      {kind === "tile" && <rect x="4" y="4" width="3.5" height="8" rx="0.5" fill="currentColor" opacity="0.5" />}
    </svg>
  );
}

// One icon button of the arrange popup (official ra): pressed = current
// state, and a pressed button is inert.
function PickButton({ kind, label, active, shortcut, onPick, ...rest }) {
  return (
    <SourceTooltip content={label} shortcut={active ? undefined : shortcut} side="bottom" hoverable={false}>
      <button type="button" className="source-icon-button spc-ghost spc-pick" aria-label={label} aria-pressed={active}
        onClick={active ? undefined : onPick} onMouseDown={(event) => event.preventDefault()} {...rest}>
        <LayoutGlyph kind={kind} />
      </button>
    </SourceTooltip>
  );
}

function PickGroup({ label, children }) {
  return (
    <div className="spc-group">
      <div role="presentation" className="smenu-group-label spc-group-label">{label}</div>
      <div role="group" aria-label={label} className="spc-row">{children}</div>
    </div>
  );
}

// Popup body (official ca). Every pick closes the popup; the menu hands
// focus back to the trigger.
function ArrangePopupContent({ tileId, layout, expanded, onMoveToEdge, onToggleExpand, onPopOut }) {
  const popup = useMenuPopup();
  const done = () => popup?.close("item-click");
  const atEdge = (edge) => !!layout && !expanded && isAtEdge(layout, tileId, edge);
  const pickEdge = (edge) => {
    if (expanded && atEdge(edge)) onToggleExpand?.();
    else onMoveToEdge?.(edge);
    done();
  };
  const pickMode = (fill) => {
    if (fill !== expanded) onToggleExpand?.();
    done();
  };
  return (
    <>
      <PickGroup label={t("Move")}>
        {EDGES.map(([edge, label]) => (
          <PickButton key={edge} kind={edge} label={label} active={atEdge(edge)} data-pane-move={edge} onPick={() => pickEdge(edge)} />
        ))}
      </PickGroup>
      <PickGroup label={t("Fill and arrange")}>
        <PickButton kind="fill" label={t("Fill")} active={expanded} shortcut={TOGGLE_SHORTCUT_LABEL} data-pane-arrange="fill" onPick={() => pickMode(true)} />
        <PickButton kind="tile" label={t("Tile")} active={!expanded} shortcut={TOGGLE_SHORTCUT_LABEL} data-pane-arrange="tile" onPick={() => pickMode(false)} />
      </PickGroup>
      {onPopOut && (
        <>
          <SourceMenu.Separator />
          <button type="button" className="spc-open-window" data-pane-popout="" onClick={() => { onPopOut(); done(); }}>
            <Icon name="WindowNew" size={16} />
            <span className="spc-open-window-label">{t("Open in new window")}</span>
          </button>
        </>
      )}
    </>
  );
}

// Expand/Collapse toggle that also owns the arrange popup (official sa).
function ArrangeTrigger({ tileId, layout, expanded, onMoveToEdge, onToggleExpand, onPopOut }) {
  const [open, setOpen] = useState(null); // { reason: "hover" | "click" | "keyboard", token }
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const triggerId = useId();
  const timers = useRef({ hover: null, press: null, leave: null });
  const press = useRef({ origin: null, fired: false });
  const hoverSuppressed = useRef(false); // after a mouse click, until the pointer leaves
  const over = useRef({ trigger: false, popup: false });
  const clearTimer = (name) => {
    if (timers.current[name] !== null) { clearTimeout(timers.current[name]); timers.current[name] = null; }
  };
  useEffect(() => () => { for (const name of Object.keys(timers.current)) clearTimer(name); }, []);

  const openPopup = useCallback((reason) => {
    clearTimer("hover"); clearTimer("leave");
    setOpen((current) => (current ? { ...current, reason: current.reason === "hover" ? reason : current.reason } : { reason, token: Date.now() }));
  }, []);
  const closePopup = useCallback(() => { clearTimer("leave"); setOpen(null); }, []);

  // Keyboard, long-press and right-click opens focus the popup so the arrow
  // keys can reach the first/last pick; a hover open leaves focus alone.
  useEffect(() => {
    if (!open || open.reason === "hover") return;
    popupRef.current?.focus({ preventScroll: true });
  }, [open]);
  // A hover-opened popup closes once the pointer has left both the trigger
  // and the popup; an explicitly opened one stays until dismissed.
  const scheduleHoverClose = useCallback(() => {
    clearTimer("leave");
    timers.current.leave = setTimeout(() => {
      timers.current.leave = null;
      if (!over.current.trigger && !over.current.popup) setOpen((current) => (current && current.reason === "hover" ? null : current));
    }, HOVER_LEAVE_GRACE_MS);
  }, []);
  useEffect(() => {
    const popup = popupRef.current;
    if (!open || !popup) return undefined;
    const enter = () => { over.current.popup = true; clearTimer("leave"); };
    const leave = () => { over.current.popup = false; scheduleHoverClose(); };
    popup.addEventListener("pointerenter", enter);
    popup.addEventListener("pointerleave", leave);
    return () => { popup.removeEventListener("pointerenter", enter); popup.removeEventListener("pointerleave", leave); over.current.popup = false; };
  }, [open, scheduleHoverClose]);

  const label = expanded ? t("Collapse") : t("Expand");
  const cancelPress = () => { clearTimer("press"); press.current.origin = null; };
  return (
    <>
      <GhostButton
        buttonRef={triggerRef}
        id={triggerId}
        label={label}
        icon={expanded ? "Collapse" : "Expand"}
        shortcut={TOGGLE_SHORTCUT_LABEL}
        tooltipOpen={open ? false : undefined}
        aria-haspopup="menu"
        data-popup-open={open ? "" : undefined}
        data-pane-expand={expanded ? "collapse" : "expand"}
        data-pane-arrange-trigger=""
        onPointerEnter={(event) => {
          over.current.trigger = true;
          clearTimer("leave");
          if (event.pointerType !== "mouse" || hoverSuppressed.current || open) return;
          clearTimer("hover");
          timers.current.hover = setTimeout(() => { timers.current.hover = null; openPopup("hover"); }, HOVER_OPEN_MS);
        }}
        onPointerLeave={() => {
          over.current.trigger = false;
          hoverSuppressed.current = false;
          clearTimer("hover");
          cancelPress();
          if (open) scheduleHoverClose();
        }}
        onPointerDown={(event) => {
          cancelPress();
          press.current.fired = false;
          if (event.pointerType === "mouse") return;
          press.current.origin = { x: event.clientX, y: event.clientY };
          timers.current.press = setTimeout(() => {
            timers.current.press = null;
            press.current.fired = true;
            openPopup("click");
          }, LONG_PRESS_MS);
        }}
        onPointerMove={(event) => {
          const origin = press.current.origin;
          if (origin && (Math.abs(event.clientX - origin.x) > LONG_PRESS_SLOP_PX || Math.abs(event.clientY - origin.y) > LONG_PRESS_SLOP_PX)) cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onClick={(event) => {
          const keyboard = event.nativeEvent.detail === 0;
          if (press.current.fired && !keyboard) { press.current.fired = false; return; }
          // A hover-open timer armed on the way in must not open the popup after the click.
          if (!keyboard) clearTimer("hover");
          hoverSuppressed.current = !keyboard;
          onToggleExpand?.();
          if (open) closePopup();
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          event.preventDefault();
          openPopup("keyboard");
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          cancelPress();
          openPopup(event.nativeEvent.button === 0 ? "keyboard" : "click");
        }}
      />
      {open && (
        <SourceMenu.Popup
          key={open.token}
          anchor={triggerRef.current}
          trigger={triggerRef.current}
          side="bottom"
          align="end"
          labelledBy={triggerId}
          className="spc-arrange"
          initialHighlight={null}
          popupRef={popupRef}
          onClose={closePopup}
          onKeyDown={(event) => {
            // Arrows land on the first/last pick only while the popup itself
            // holds focus; inside a pick the buttons keep their own behavior.
            if (event.target.closest("button")) return;
            const picks = event.currentTarget.querySelectorAll("button:not(:disabled)");
            const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? picks[0] : event.key === "ArrowUp" || event.key === "ArrowLeft" ? picks[picks.length - 1] : undefined;
            if (next) { event.preventDefault(); next.focus(); }
          }}
        >
          <ArrangePopupContent tileId={tileId} layout={layout} expanded={expanded} onMoveToEdge={onMoveToEdge} onToggleExpand={onToggleExpand} onPopOut={onPopOut} />
        </SourceMenu.Popup>
      )}
    </>
  );
}

// "{pane} settings" menu (official cd5e3435c z): renders only the sections
// the pane supplies. Nothing renders when every section is empty; a single
// plain item (icon + action, no check/shortcut/submenu) unrolls into that
// item's own icon button.
// cd5e3435c U: hinted submenus open on click/ArrowRight, not hover.
function PaneSettingsItem({ item }) {
  if (item.items) return <SourceMenu.Submenu onOpenChange={item.onOpenChange}>
    <SourceMenu.SubmenuTrigger hint={item.hint} trailing={item.trailing} icon={item.icon} disabled={item.disabled}
      openOnHover={item.hint !== undefined || item.trailing !== undefined ? false : undefined}>{item.label}</SourceMenu.SubmenuTrigger>
    <SourceMenu.Popup label={item.label} side="right" align="start" sideOffset={-4}>
      {item.items.map((child, index) => <PaneSettingsItem key={child.value ?? index} item={child} />)}
    </SourceMenu.Popup>
  </SourceMenu.Submenu>;
  return <SourceMenu.Item icon={item.icon} checked={item.checked} checkedRole={item.checkedRole} keepOpen={item.keepOpen}
    shortcut={item.shortcut} disabled={item.disabled} disabledReason={item.disabledReason} variant={item.variant} description={item.description}
    hint={item.hint} onClick={item.onSelect}>{item.label}</SourceMenu.Item>;
}

export function PaneSettingsMenu({ paneName, sections = [], unroll = true }) {
  const [open, setOpen] = useState(null);
  const trigger = useRef(null);
  const filled = sections.filter((section) => section.items.length > 0);
  if (filled.length === 0) return null;
  const items = filled.flatMap((section) => section.items);
  const only = items.length === 1 ? items[0] : null;
  const simple = only && only.icon !== undefined && only.onSelect !== undefined && only.checked === undefined && !only.items && !only.shortcut && !only.disabledReason
    && typeof only.label === "string" && only.variant !== "danger";
  if (unroll && simple)
    return <GhostButton label={only.label} icon={only.icon} onClick={only.onSelect} disabled={only.disabled} data-pane-settings-unrolled="" />;
  const label = t("{pane} settings", { pane: t(paneName) });
  return (
    <>
      <SourceTooltip content={label} side="bottom" hoverable={false} open={open ? false : undefined}>
        <button ref={trigger} type="button" className="source-icon-button spc-ghost" aria-label={label} aria-haspopup="menu" aria-expanded={!!open}
          data-popup-open={open ? "" : undefined} data-pane-settings="" onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => setOpen(open ? null : { token: Date.now(), entry: event.detail === 0 ? "first" : undefined })}
          onKeyDown={(event) => {
            if (open || event.metaKey || event.ctrlKey || event.altKey || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
            event.preventDefault();
            setOpen({ token: Date.now(), entry: event.key === "ArrowDown" ? "first" : "last" });
          }}>
          <Icon name="DotsVertical" size={16} />
        </button>
      </SourceTooltip>
      {open && (
        <SourceMenu.Popup key={open.token} anchor={trigger.current} side="bottom" align="end" label={label} onClose={() => setOpen(null)} initialHighlight={open.entry} contextMenuGuard>
          {filled.map((section, index) => (
            <React.Fragment key={section.key ?? index}>
              {index > 0 && !section.noSeparator && <SourceMenu.Separator />}
              <SourceMenu.Group>
                {section.header && <SourceMenu.GroupLabel>{section.header}</SourceMenu.GroupLabel>}
                {section.items.map((item, itemIndex) => <PaneSettingsItem key={item.value ?? itemIndex} item={item} />)}
              </SourceMenu.Group>
            </React.Fragment>
          ))}
        </SourceMenu.Popup>
      )}
    </>
  );
}

// c_ (panes-tile-current.js:6791-6807): ghost iconOnly CDS Button, icon Search,
// aria-label "Search files", no native title; an iconOnly Button with an
// aria-label shows it as its tooltip (shared-frame ks oe/se).
export function SourceFilesSearchButton({ onClick }) {
  const trigger=useRef(null);
  useEffect(()=>{
    const root=trigger.current?.closest('.source-file-panel');if(!root)return;
    const key=event=>{if(!isGoToFileShortcut(event))return;event.preventDefault();event.stopPropagation();if(!event.repeat)onClick();};
    root.addEventListener('keydown',key);return()=>root.removeEventListener('keydown',key);
  },[onClick]);
  return <GhostButton buttonRef={trigger} label="Go to file or search" icon="Search" shortcut="cmd+p" aria-keyshortcuts="Meta+P" onClick={onClick} data-files-search="" />;
}

// `leading` is the pane's own first trailing control (c_ for the file pane,
// panes-tile-current.js:16366-16378), before the settings menu.
export function SourcePaneControls({ tileId, paneName, layout, expanded = false, menuSections, leading = null, onMoveToEdge, onToggleExpand, onPopOut, onClose, closeLabel = "Close panel" }) {
  return (
    <div className="spc-controls" data-pane-controls={tileId}>
      {leading}
      <PaneSettingsMenu paneName={paneName} sections={menuSections ?? []} />
      {onToggleExpand && (
        <ArrangeTrigger tileId={tileId} layout={layout} expanded={expanded} onMoveToEdge={onMoveToEdge} onToggleExpand={onToggleExpand} onPopOut={onPopOut} />
      )}
      {onClose && <GhostButton label={closeLabel} icon="X" shortcut={CLOSE_SHORTCUT_LABEL} onClick={onClose} className="epitaxy-pane-close-control" />}
    </div>
  );
}

// Popped-out window header (sidebar-support.js Sw): the pane's own settings
// menu plus the ghost "Open in main window" ArrowInSquare control that docks
// the pane back into its session layout (closing the window docks too), then
// (panes-toggle-current.js:1361-1371 ma: Et, Ot) the tE pin
// (sidebar-support.js:9509-9547): ghost icon-only Pin / PinFilled, pressed
// while the window stays on top, label and bottom tooltip "Keep window on
// top" / "Stop keeping window on top".
export function SourcePopoutControls({ paneName, menuSections, leading = null, onDock, alwaysOnTop = false, onToggleAlwaysOnTop }) {
  const pinLabel = alwaysOnTop ? t("Stop keeping window on top") : t("Keep window on top");
  return (
    <div className="spc-controls" data-pane-controls="popout">
      {leading}
      <PaneSettingsMenu paneName={paneName} sections={menuSections ?? []} />
      <GhostButton label="Open in main window" icon="ArrowInSquare" onClick={onDock} data-pane-dock="" />
      {onToggleAlwaysOnTop && <GhostButton label={pinLabel} icon={alwaysOnTop ? "PinFilled" : "Pin"} aria-pressed={alwaysOnTop}
        onClick={onToggleAlwaysOnTop} data-popout-pin="" />}
    </div>
  );
}
