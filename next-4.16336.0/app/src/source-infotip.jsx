import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { SourcePopover } from "./source-popover.jsx";
import { INFOTIP_DEFAULTS, INFOTIP_HOVER_CLOSE_MS, infoTipNext } from "./infotip-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-infotip.css";

/*
 * CDS InfoTip (2.31226.0 shared-frame-DVFSKIcx.js pw :13467-13521): an icon-only Popover.Trigger (data-cds="InfoTip",
 * aria-label "More info" unless given, Info glyph at size sm, uw "cds-reset inline-flex … text-muted … hover:text-secondary
 * focus-visible:shadow-focus data-[popup-open]:text-secondary") with openOnHover after `delay`; the Popover.Popup is
 * labelled the same, side top / align center / offset 6, padding none without scroll fade, and dw = the tooltip skin
 * (kf tooltip bg/fg + rounded 6px + shadow-sm, 13/18px; Mf max-w 240px whitespace-normal; jf scale/opacity snap),
 * its content an If dark-scope span "block px-2 py-1.5 min-w-0 break-words" (Pf/Ff). The popup is the local CDS
 * Popover (source-popover.jsx): Escape, outside press and focus-out close it and focus returns to the trigger.
 * `className` joins the trigger's class (callers keep their own, e.g. cz-infotip / ss-storage-tip).
 */
export function SourceInfoTip({ content, "aria-label": ariaLabel, icon = "Info", size = 16, side = INFOTIP_DEFAULTS.side,
  align = INFOTIP_DEFAULTS.align, sideOffset = INFOTIP_DEFAULTS.sideOffset, delay = INFOTIP_DEFAULTS.delay, className = "", popupClassName = "" }) {
  const label = ariaLabel || t("More info");
  const trigger = useRef(null), timers = useRef({ open: 0, close: 0 });
  const [open, setOpen] = useState(null), [layerBase, setLayerBase] = useState(0);
  const clearTimers = () => { clearTimeout(timers.current.open); clearTimeout(timers.current.close); };
  useEffect(() => clearTimers, []);
  const apply = (event) => {
    setOpen((state) => {
      const next = infoTipNext(state, event);
      if (next && !state && trigger.current) setLayerBase(Number.parseInt(getComputedStyle(trigger.current).getPropertyValue("--cds-layer-base"), 10) || 0);
      return next;
    });
  };
  const hoverOpen = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    clearTimeout(timers.current.close);
    if (open) return;
    clearTimeout(timers.current.open);
    timers.current.open = setTimeout(() => apply("hover-open"), delay);
  };
  const hoverLeave = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    clearTimeout(timers.current.open);
    clearTimeout(timers.current.close);
    timers.current.close = setTimeout(() => apply("hover-leave"), INFOTIP_HOVER_CLOSE_MS);
  };
  return <>
    <button ref={trigger} type="button" data-cds="InfoTip" aria-label={label} className={className || undefined}
      aria-haspopup="dialog" aria-expanded={!!open} data-popup-open={open ? "" : undefined}
      onPointerEnter={hoverOpen} onPointerLeave={hoverLeave}
      onClick={() => { clearTimers(); apply("click"); }}>
      <Icon name={icon} size={size} />
    </button>
    {open && <SourcePopover anchor={trigger.current} side={side} align={align} sideOffset={sideOffset} padding="none" scrollFade={false}
      label={label} dataCds="Popover" layerBase={layerBase} className={`sit-popup ${popupClassName}`.trim()}
      initialFocus={open === "hover" ? false : undefined}
      onClose={() => { clearTimers(); apply("dismiss"); }}>
      <div className="cds-dark-scope contents" data-mode="dark"
        onPointerEnter={() => clearTimeout(timers.current.close)} onPointerLeave={(event) => { if (open === "hover") hoverLeave(event); }}>
        <span className="sit-content">{content}</span>
      </div>
    </SourcePopover>}
  </>;
}
