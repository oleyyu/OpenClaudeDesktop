import {isGoToFileShortcut} from "./diff-go-to-file-model.mjs";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { SourceMenu } from "./source-menu";
import { SourceTooltip } from "./source-tooltip";
// E41: the pane cluster sits in the menu graph (source-menu), so CDS comes by semantic name from the view-tabs file.
import { CdsButton, CdsButtonGroup, CdsDropdown, CdsIcon, CdsPopover, CdsTooltip, cdsClassNames, cdsDropdownGroupLabelClass, cdsMenuItemClass } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { paneLayoutIcons, paneLayoutSplitOtherPane } from "./generated/code-current/pane-layout-icons.mjs";
import { isAtEdge } from "./tile-layout-model.mjs";
import { bodyFocusedElement, isKeyboardClick, paneBodyOf, pressFocusTarget } from "./pane-press-focus-model.mjs";
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
// Tooltip key specs; shared-frame Mu draws them in io modifier order (shift before cmd).
const TOGGLE_SHORTCUT_LABEL = "cmd+shift+\\";
const CLOSE_SHORTCUT_LABEL = "cmd+\\";
const LONG_PRESS_MS = 500; // touch/pen press that opens the popup instead of toggling
const LONG_PRESS_SLOP_PX = 10; // movement that cancels the press
const EDGES = [
  ["left", t("Move to left")],
  ["right", t("Move to right")],
  ["top", t("Move to top")],
  ["bottom", t("Move to bottom")],
];

// W14-code r2 fr2-19: every trailing control is the CDS ghost iconOnly Button, as 3.6556.2 draws them: c4db265df's close
// `n(h,{variant:"ghost",iconOnly:!0,icon:"X","aria-label":"Close" rbrahOGMC3,shortcut,onClick,onMouseDown,className:"shrink-0
// epitaxy-pane-close-control"})`, Tt's Expand / Collapse `{variant:"ghost",iconOnly:!0,icon:c,"aria-label"}` and ca5db7aaf
// H's unrolled item `{variant:"ghost",iconOnly:!0,icon,"aria-label",onClick,disabled}`; the label is the Button's own
// tooltip (shared-frame Uu `we = typeof s=="string" ? s : P`). The Expand / Collapse arrange trigger is mt's own
// `tooltip:!1` Button under a separate Tooltip (ArrangeTrigger, W14-code r3 fr3-07).
function GhostButton({ label, icon, shortcut, tooltip, onClick, className = "", buttonRef, ...rest }) {
  return (
    <CdsButton ref={buttonRef} variant="ghost" iconOnly icon={icon} aria-label={t(label)} shortcut={shortcut}
      tooltip={tooltip == null ? undefined : t(tooltip)} onClick={onClick}
      onMouseDown={(event) => event.preventDefault()} className={className || undefined} {...rest} />
  );
}

// One pick of the arrange popup: 3.6556.2 c4db265df lt. The glyph is the custom icon it[kind] (fizzy-lake "icons" off,
// so `Ee(ct[t])` is undefined), Tile ("split") it.split with at at opacity-50 over it, in
// `relative inline-flex` + (not pressed) `text-secondary-control group-hover/btn:text-primary
// group-focus-visible/btn:text-primary`; the button is the CDS ghost iconOnly Button with the label as its tooltip
// (side bottom), the shortcut only while not pressed, `pressed`, pressedVariant "selected", and no click while pressed.
const PICK_ICON_KIND = Object.freeze({ tile: "split" });
function PickGlyph({ kind, active }) {
  const icon = paneLayoutIcons[PICK_ICON_KIND[kind] ?? kind];
  return (
    <span className={active ? "relative inline-flex" : "relative inline-flex text-secondary-control group-hover/btn:text-primary group-focus-visible/btn:text-primary"}>
      <CdsIcon customIcon={icon} size="auto" />
      {kind === "tile" && <CdsIcon customIcon={paneLayoutSplitOtherPane} size="auto" className="absolute inset-0 opacity-50" />}
    </span>
  );
}
function PickButton({ kind, label, active, shortcut, onPick, ...rest }) {
  return (
    <CdsButton variant="ghost" iconOnly icon={<PickGlyph kind={kind} active={active} />} aria-label={label}
      shortcut={active ? undefined : shortcut} tooltipSide="bottom" pressed={active} pressedVariant="selected"
      onClick={active ? undefined : onPick} onMouseDown={(event) => event.preventDefault()} {...rest} />
  );
}

// c4db265df q: `div.flex flex-col > [div[role=presentation] className T (shared-frame hT, the dropdown group label),
// div "flex px-1" > CdsButtonGroup (shared-frame lF, yi) {"aria-label": label}]` (W14-code r2 fr2-19).
function PickGroup({ label, children }) {
  return (
    <div className="flex flex-col">
      <div role="presentation" className={cdsDropdownGroupLabelClass}>{label}</div>
      <div className="flex px-1"><CdsButtonGroup aria-label={label}>{children}</CdsButtonGroup></div>
    </div>
  );
}

// W14-code r3 fr3-07: the arrange popup is the CDS Popover (shared-frame `ua`, local CdsPopover), as 3.6556.2 c4db265df
// draws it: mt `i(E.Root,{handle:j,open:O,onOpenChange:ce,children:[U,W]})`, the trigger `n(E.Trigger,{id:M,
// openOnHover:!0,…,render:n(h,{ref:N,variant:"ghost",iconOnly:!0,icon:a,"aria-label":c,shortcut:l,tooltip:!1,…})})` under
// `n(y,{content:fe,shortcut:l,delay:700,…})`, the popup `n(E.Popup,{ref:ue,initialFocus:B,onKeyDown:xe,side:"bottom",
// align:"end",padding:"xs",collisionPadding:ye,className:"flex min-w-44 flex-col gap-xs"})` (yt's popupClassName) and
// "Open in new window" an `E.Close`. Click toggles Fill/Tile; hover, long-press, right-click or ArrowDown open the popup.
const ARRANGE_COLLISION_PADDING = Object.freeze({ top: 48, right: 8, bottom: 8, left: 8 }); // shared-18 wU (c4db265df ye)
const ARRANGE_TOOLTIP_DELAY_MS = 700;
// isKeyboardClick: shared-8 pR (c4db265df Ce), now in pane-press-focus-model.mjs with ca5db7aaf z, which reads it too.
// c7037f09e t (c4db265df ke): the left/right arrows swap under rtl.
const logicalArrow = (key, rtl) => (rtl && key === "ArrowLeft" ? "ArrowRight" : rtl && key === "ArrowRight" ? "ArrowLeft" : key);
// c4db265df ut: the arrows step through the popup's enabled buttons, landing on the first / last from the popup itself.
function arrangeKeyDown(event) {
  const popup = event.currentTarget;
  const rtl = popup.ownerDocument?.defaultView?.getComputedStyle?.(popup)?.direction === "rtl";
  const key = logicalArrow(event.key, rtl);
  const step = key === "ArrowDown" || key === "ArrowRight" ? 1 : key === "ArrowUp" || key === "ArrowLeft" ? -1 : 0;
  if (step === 0) return;
  const picks = Array.from(popup.querySelectorAll("button:not(:disabled)"));
  const current = event.target instanceof Element ? event.target.closest("button") : null;
  const index = current === null ? -1 : picks.indexOf(current);
  const next = index === -1 ? picks[step === 1 ? 0 : picks.length - 1] : picks[index + step];
  if (next !== undefined) { event.preventDefault(); next.focus(); }
}

// Popup body (official bt). Every pick closes the popup through `close` (pt's `close`); "Open in new window" is the
// Popover's own Close. W14-code r3 补做 (pressFocus "body"): bt's `e = (e) => l(o.pressFocus === "body" ?
// G(s.current, {focused: c.current, pointerType: d.current}, e.nativeEvent) : null)` — the pick hands `close` the body
// element G (ca5db7aaf z) picks, with the pick's pointer type (`onPointerDown: f`, `d.current = e.pointerType`) and the
// body focus remembered when the popup opened (bodyFocusRef); null (keyboard) falls back to the trigger.
function ArrangePopupContent({ tileId, layout, expanded, onMoveToEdge, onToggleExpand, onPopOut, close, bodyOf, bodyFocusRef }) {
  const pickPointer = useRef(""); // d
  const onPickPointerDown = (event) => { pickPointer.current = event.pointerType; }; // f
  const picked = (event) => close(pressFocusTarget(bodyOf(), { focused: bodyFocusRef.current, pointerType: pickPointer.current }, event.nativeEvent)); // e
  const atEdge = (edge) => !!layout && !expanded && isAtEdge(layout, tileId, edge);
  const pickEdge = (edge, event) => {
    if (expanded && atEdge(edge)) onToggleExpand?.();
    else onMoveToEdge?.(edge);
    picked(event);
  };
  // bt x: the Fill / Tile picks only ever render enabled while not pressed, so a pick always toggles.
  const pickMode = (fill, event) => {
    if (fill !== expanded) onToggleExpand?.();
    picked(event);
  };
  return (
    <>
      <PickGroup label={t("Move")}>
        {EDGES.map(([edge, label]) => (
          <PickButton key={edge} kind={edge} label={label} active={atEdge(edge)} data-pane-move={edge} onPointerDown={onPickPointerDown} onPick={(event) => pickEdge(edge, event)} />
        ))}
      </PickGroup>
      <PickGroup label={t("Fill and arrange")}>
        <PickButton kind="fill" label={t("Fill")} active={expanded} shortcut={TOGGLE_SHORTCUT_LABEL} data-pane-arrange="fill" onPointerDown={onPickPointerDown} onPick={(event) => pickMode(true, event)} />
        <PickButton kind="tile" label={t("Tile")} active={!expanded} shortcut={TOGGLE_SHORTCUT_LABEL} data-pane-arrange="tile" onPointerDown={onPickPointerDown} onPick={(event) => pickMode(false, event)} />
      </PickGroup>
      {/* c4db265df bt: `div.flex flex-col > [v.Separator, E.Close {className: g(S(), "hover:bg-fill-ghost-hover
          focus-visible:bg-fill-ghost-hover")} > [C WindowNew (panels off: size "sm", shrink-0), span "min-w-0 flex-1 truncate
          text-start"]]`, v = shared-frame Jo (CdsDropdown), S = shared-frame cdsMenuItemClass (W14-code r2 fr2-19, r3 fr3-07). */}
      {onPopOut && (
        <div className="flex flex-col">
          <CdsDropdown.Separator />
          <CdsPopover.Close className={cdsClassNames(cdsMenuItemClass(), "hover:bg-fill-ghost-hover focus-visible:bg-fill-ghost-hover")} data-pane-popout="" onClick={() => onPopOut()}>
            <CdsIcon name="WindowNew" size="sm" className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-start">{t("Open in new window")}</span>
          </CdsPopover.Close>
        </div>
      )}
    </>
  );
}

// Expand/Collapse toggle that also owns the arrange popup (official mt / yt).
function ArrangeTrigger({ tileId, layout, expanded, onMoveToEdge, onToggleExpand, onPopOut }) {
  const [open, setOpen] = useState(false); // O
  const [handle] = useState(() => CdsPopover.createHandle()); // j (ht)
  const triggerId = useId(); // M
  const triggerRef = useRef(null); // N
  const popupRef = useRef(null); // dt's popupRef
  const pointerType = useRef(null); // ne
  const hoverSuppressed = useRef(false); // re: after a mouse click, until the pointer leaves
  const keyboardOpen = useRef(false); // ae
  const explicit = useRef(false); // F: opened by click / keyboard / long-press, so a hover leave keeps it
  const press = useRef(null); // I: the pending long-press
  const pressFired = useRef(false); // oe
  const openVia = useRef(null); // ie: how the next open was asked for ("click" / "keyboard"); hover leaves it null
  // W14-code r3 补做 pressFocus "body" (c4db265df yt / Ct `pressFocus:"body"`): o (bodyFocusRef) is the body element last
  // seen focused around this trigger, s the pending press {focused, pointerType}; the body is the pane's content
  // (yt's contentRef), read off the trigger's pane (paneBodyOf).
  const bodyFocus = useRef(null); // o
  const pendingPress = useRef(null); // s
  const bodyOf = () => paneBodyOf(triggerRef.current);
  const cancelPress = useCallback(() => { if (press.current !== null) { press.current.cancel(); press.current = null; } }, []); // L
  useEffect(() => cancelPress, [cancelPress]);

  // mt ce: opening runs yt's onBeforeOpen c (`o.current = Ve(a.current) ?? o.current`) and, on a fresh open, onOpened f
  // (`e === "click" && (s.current = null)`: a long-press / right-click open drops the pending press); closing runs
  // onClosed l (`o.current = null`).
  const onOpenChange = (next, details) => {
    const hover = details?.reason === "trigger-hover";
    if (hover && (next ? hoverSuppressed.current : explicit.current)) { details.cancel?.(); return; }
    if (next) {
      bodyFocus.current = bodyFocusedElement(bodyOf()) ?? bodyFocus.current;
      if (!open) { explicit.current = !hover; if ((hover ? "hover" : (openVia.current ?? "keyboard")) === "click") pendingPress.current = null; }
    } else { bodyFocus.current = null; explicit.current = false; }
    openVia.current = null;
    setOpen(next);
  };
  const openPopup = (via) => { openVia.current = via; keyboardOpen.current = via === "keyboard"; explicit.current = true; handle.open(triggerId); }; // z
  const close = (target) => { bodyFocus.current = null; setOpen(false); (target ?? triggerRef.current)?.focus({ preventScroll: true }); }; // le (w = onClosed l)
  // dt initialFocus: a keyboard open focuses the popup itself (the arrows then reach the first / last pick); otherwise a
  // keyboard interaction drops focus held outside the popup, and touch focuses the popup.
  const initialFocus = (type) => {
    const popup = popupRef.current;
    if (keyboardOpen.current) return popup;
    const active = popup?.ownerDocument?.activeElement;
    if (type === "keyboard" && !popup?.contains(active)) active?.blur?.();
    return type !== "touch" || popup;
  };

  const label = expanded ? t("Collapse") : t("Expand");
  const trigger = (
    <CdsButton ref={triggerRef} variant="ghost" iconOnly icon={expanded ? "Collapse" : "Expand"} aria-label={label}
      shortcut={TOGGLE_SHORTCUT_LABEL} tooltip={false} data-pane-layout-popup-open={open ? "" : undefined}
      data-pane-expand={expanded ? "collapse" : "expand"} data-pane-arrange-trigger="" onMouseDown={(event) => event.preventDefault()} />
  );
  return (
    <CdsPopover.Root handle={handle} open={open} onOpenChange={onOpenChange}>
      <CdsTooltip content={open ? undefined : label} shortcut={TOGGLE_SHORTCUT_LABEL} delay={ARRANGE_TOOLTIP_DELAY_MS}>
        <CdsPopover.Trigger
          id={triggerId}
          openOnHover
          aria-expanded={undefined}
          render={trigger}
          onPointerDown={(event) => {
            // yt d (mt's onTriggerPointerDown): `let t=Ve(a.current);o.current=t??o.current;s.current={focused:t,pointerType:e.pointerType}`.
            const focused = bodyFocusedElement(bodyOf());
            bodyFocus.current = focused ?? bodyFocus.current;
            pendingPress.current = { focused, pointerType: event.pointerType };
            pointerType.current = event.pointerType;
            cancelPress();
            pressFired.current = false;
            if (event.pointerType === "mouse") return;
            const view = event.currentTarget.ownerDocument?.defaultView ?? globalThis;
            const timer = view.setTimeout(() => { press.current = null; pressFired.current = true; openPopup("click"); }, LONG_PRESS_MS);
            press.current = { x: event.clientX, y: event.clientY, cancel: () => view.clearTimeout(timer) };
          }}
          onPointerMove={(event) => {
            const origin = press.current;
            if (origin !== null && (Math.abs(event.clientX - origin.x) > LONG_PRESS_SLOP_PX || Math.abs(event.clientY - origin.y) > LONG_PRESS_SLOP_PX)) cancelPress();
          }}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onPointerLeave={() => { cancelPress(); hoverSuppressed.current = false; }}
          onClick={(event) => {
            event.preventBaseUIHandler?.();
            const type = pointerType.current;
            pointerType.current = null;
            const keyboard = isKeyboardClick(event.nativeEvent);
            const fired = pressFired.current;
            pressFired.current = false;
            if (fired && !keyboard) return;
            if (!keyboard && type === "mouse") hoverSuppressed.current = true;
            // yt p (onPress): `let t=s.current;s.current=null;let n=t===null?null:{focused:t.focused??o.current,pointerType:
            // t.pointerType};return o.current=null,r.onToggleExpand("button"),r.pressFocus==="body"?G(a.current,n,
            // e.nativeEvent):null`; mt then `O&&j.close(),i?.focus({preventScroll:!0})`.
            const pending = pendingPress.current;
            pendingPress.current = null;
            const pressed = pending === null ? null : { focused: pending.focused ?? bodyFocus.current, pointerType: pending.pointerType };
            bodyFocus.current = null;
            onToggleExpand?.();
            const target = pressFocusTarget(bodyOf(), pressed, event.nativeEvent);
            if (open) handle.close();
            target?.focus({ preventScroll: true });
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            event.preventDefault();
            openPopup("keyboard");
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            cancelPress();
            openPopup(isKeyboardClick(event.nativeEvent) ? "keyboard" : "click");
          }}
        />
      </CdsTooltip>
      <CdsPopover.Popup ref={popupRef} initialFocus={initialFocus} onKeyDown={arrangeKeyDown} side="bottom" align="end" padding="xs"
        collisionPadding={ARRANGE_COLLISION_PADDING} className="flex min-w-44 flex-col gap-xs">
        <ArrangePopupContent tileId={tileId} layout={layout} expanded={expanded} onMoveToEdge={onMoveToEdge} onToggleExpand={onToggleExpand} onPopOut={onPopOut} close={close}
          bodyOf={bodyOf} bodyFocusRef={bodyFocus} />
      </CdsPopover.Popup>
    </CdsPopover.Root>
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
      {/* ca5db7aaf H (W14-code r2 fr2-19): `t(f,{content:b, children: d.Trigger({render: t(c,{ref, variant:"ghost",
          iconOnly:!0, icon:"DotsVertical", "aria-label":b, tooltip:!1})})})`. */}
      <SourceTooltip content={label} hoverable={false} open={open ? false : undefined}>
        <CdsButton ref={trigger} variant="ghost" iconOnly icon="DotsVertical" aria-label={label} tooltip={false} aria-haspopup="menu" aria-expanded={!!open}
          data-popup-open={open ? "" : undefined} data-pane-settings="" onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => setOpen(open ? null : { token: Date.now(), entry: event.detail === 0 ? "first" : undefined })}
          onKeyDown={(event) => {
            if (open || event.metaKey || event.ctrlKey || event.altKey || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
            event.preventDefault();
            setOpen({ token: Date.now(), entry: event.key === "ArrowDown" ? "first" : "last" });
          }} />
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
// W14-code r2 fr2-19: the close label is c4db265df's "Close" (rbrahOGMC3), not a host "Close panel".
export function SourcePaneControls({ tileId, paneName, layout, expanded = false, menuSections, leading = null, onMoveToEdge, onToggleExpand, onPopOut, onClose, closeLabel = "Close" }) {
  return (
    <div className="spc-controls" data-pane-controls={tileId}>
      {leading}
      <PaneSettingsMenu paneName={paneName} sections={menuSections ?? []} />
      {onToggleExpand && (
        <ArrangeTrigger tileId={tileId} layout={layout} expanded={expanded} onMoveToEdge={onMoveToEdge} onToggleExpand={onToggleExpand} onPopOut={onPopOut} />
      )}
      {onClose && <GhostButton label={closeLabel} icon="X" shortcut={CLOSE_SHORTCUT_LABEL} onClick={onClose} className="shrink-0 epitaxy-pane-close-control" />}
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
// W14-code r3 fr3-02: both tooltips open below, as 3.6556.2 shared-18 bx / gx wrap the ghost Button in
// `m(Y,{content:r,side:"bottom",children:i})` (the Button's own label tooltip, side bottom).
export function SourcePopoutControls({ paneName, menuSections, leading = null, onDock, alwaysOnTop = false, onToggleAlwaysOnTop }) {
  const pinLabel = alwaysOnTop ? t("Stop keeping window on top") : t("Keep window on top");
  return (
    <div className="spc-controls" data-pane-controls="popout">
      {leading}
      <PaneSettingsMenu paneName={paneName} sections={menuSections ?? []} />
      <GhostButton label="Open in main window" icon="ArrowInSquare" tooltipSide="bottom" onClick={onDock} data-pane-dock="" />
      {onToggleAlwaysOnTop && <GhostButton label={pinLabel} icon={alwaysOnTop ? "PinFilled" : "Pin"} pressed={alwaysOnTop} tooltipSide="bottom"
        onClick={onToggleAlwaysOnTop} data-popout-pin="" />}
    </div>
  );
}
