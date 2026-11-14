import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { SourceTooltip } from "./source-tooltip.jsx";
import { fileKindIcon } from "./file-kind-icon.mjs";
import { optionHighlights, mentionPopupGeometry, mentionWidth } from "./mention-model.mjs";
import "./source-mention-dropdown.css";
import { t } from "../electron/i18n/index.mjs";

// 2.2553.1 mention dropdown (shared-frame :13107-13300 Vx/Bx; c099c328d
// :6233 Ap widths, :6286-6330 Ip leading icons, :6246-6265 Pp matches):
// zero-size caret anchor, side top / align start, sideOffset 24, collision
// padding 16, max-h min(available, 384px), p-1 listbox "Mention suggestions",
// option buttons with data-option-index/aria-selected, 16px leading icon,
// truncated primary label and caption-muted description with lit matches.
// Leading icon per Ip su: isDirectory ? Folder : Li(label) (shared-14 cP).
// Bx :13140-13165 wraps each option in Nu (content = (tooltip ?? renderedText
// ?? label) with '/' -> '/\u200B', multiline + max-w-[360px] when described,
// side right, sideOffset 8, delay 200); no native title.
export const mentionTooltip = (option) => String(option.tooltip ?? option.renderedText ?? option.label).replaceAll("/", "/\u200B");
function Lit({ segments, text }) {
  if (!segments) return <bdi>{text}</bdi>;
  return <bdi>{segments.map((segment, index) => segment.lit ? <mark key={index} className="smd-match">{segment.text}</mark> : <React.Fragment key={index}>{segment.text}</React.Fragment>)}</bdi>;
}

export function SourceMentionDropdown({ options = [], highlighted = 0, caret, onSelect, onClose, container }) {
  const list = useRef(null);
  // Current shared-frame $T keeps hover separate from the editor's keyboard
  // selection. Leaving the list restores that selection; a fresh result list
  // drops the old hover without changing which option Enter will accept.
  const [hover, setHover] = useState(null);
  const paintedIndex = (hover?.options === options ? hover.index : null) ?? highlighted;
  const width = mentionWidth(options);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useLayoutEffect(() => {
    list.current?.querySelector(`[data-option-index="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);
  useEffect(() => {
    if (!onClose) return undefined;
    const outside = (event) => { if (!list.current?.contains(event.target)) onClose("outside"); };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [onClose]);
  if (!options.length || !caret) return null;
  const box = mentionPopupGeometry({ caret, width, viewport });
  const popup = (
    <div className="cds-root smd-positioner" role="presentation" data-testid="mention-dropdown"
      style={{ left: box.left, bottom: box.bottom, width: box.width, maxHeight: box.maxHeight }}>
      <div ref={list} data-cds="MentionDropdown" role="listbox" aria-label={t("Mention suggestions")} tabIndex={-1} className="smd-list"
        onMouseLeave={() => setHover(null)}>
        {options.map((option, index) => {
          const lit = optionHighlights(option);
          const selected = index === paintedIndex;
          return (
            <SourceTooltip key={option.id} content={mentionTooltip(option)} multiline={!!option.description}
              className={option.description ? "smd-tooltip-wide" : ""} side="right" sideOffset={8} delay={200}>
              <button type="button" role="option" aria-selected={selected} data-option-index={index}
                data-highlighted={selected ? "" : undefined} className="smd-option"
                onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(option)} onMouseEnter={() => setHover({ options, index })}>
                <span aria-hidden="true" className="smd-leading"><Icon name={option.icon || (option.isDirectory ? "Folder" : fileKindIcon(option.label))} size={16} /></span>
                <span className="smd-text">
                  <span className={`smd-label ${option.description ? "smd-label--shrink" : ""}`} data-has-matches={lit.label ? "" : undefined}><Lit segments={lit.label} text={option.label} /></span>
                  {option.description && <span className="smd-description"><Lit segments={lit.description} text={option.description} /></span>}
                </span>
              </button>
            </SourceTooltip>
          );
        })}
      </div>
    </div>
  );
  return createPortal(popup, container || document.body);
}
