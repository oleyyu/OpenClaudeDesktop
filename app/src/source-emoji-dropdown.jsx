import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { emojiPopupGeometry, EMOJI_POPUP } from "./emoji-model.mjs";
import "./source-mention-dropdown.css";
import { t } from "../electron/i18n/index.mjs";

// 2.2553.1 emoji suggestions (c099c328d-CbkcmYSW.js:5132-5230 Kd/Gd): a popover-elevation listbox 'Emoji
// suggestions', 280px wide and at most 280px tall, placed 24px below the caret line (above it when there is more
// room there) and kept 16px inside the window; each option a menu row with the 14px emoji and ':name:' (truncate).
// Its rows reuse the mention dropdown's menu-row styling (Wd = rn(), the same row class).
const EMOJI_GLYPH_STYLE = Object.freeze({ fontSize: 14 });
export function SourceEmojiDropdown({ options = [], highlighted = 0, caret, onSelect, onHover, onClose }) {
  const list = useRef(null);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useLayoutEffect(() => { list.current?.querySelector(`[data-option-index="${highlighted}"]`)?.scrollIntoView({ block: "nearest" }); }, [highlighted]);
  useEffect(() => {
    if (!onClose) return undefined;
    const outside = (event) => { if (!list.current?.contains(event.target)) onClose("outside"); };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [onClose]);
  if (!options.length || !caret) return null;
  const box = emojiPopupGeometry({ caret, viewport });
  return createPortal(
    <div className="cds-root smd-positioner sed-positioner" role="presentation" data-testid="emoji-dropdown"
      style={{ left: box.left, top: box.top, width: EMOJI_POPUP.width, maxHeight: box.maxHeight, transform: box.up ? "translateY(-100%)" : undefined }}>
      <div ref={list} data-cds="EmojiSuggestions" role="listbox" aria-label={t("Emoji suggestions")} tabIndex={-1} className="smd-list">
        {options.map((option, index) => (
          <button key={option.name} type="button" role="option" aria-selected={index === highlighted} data-option-index={index}
            data-highlighted={index === highlighted ? "" : undefined} className="smd-option"
            onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(option)} onMouseEnter={() => onHover?.(index)}>
            {/* W14-code r8 css8-composer-leftover-handcopies: ceb864fac's glyph span, verbatim ("flex size-[14px] shrink-0
                items-center justify-center leading-none", style {fontSize: 14}); the host .sed-char copy is gone. */}
            <span className="flex size-[14px] shrink-0 items-center justify-center leading-none" style={EMOJI_GLYPH_STYLE}>{option.char}</span>
            <span className="smd-label">{`:${option.name}:`}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
