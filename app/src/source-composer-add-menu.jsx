// R4g-composer CP3 (X7-09; ledger composer-01): the Code card's in-card + and its Add menu as 2.42304.0 draws them.
//
// Official: cc43287c9 hands the presets card `actionsLeading: Uo` (`Uo = zo ? $ee({scopeStore, sessionRef, mountKey,
// isPanelActive})`, with `chin: Vo ? void 0 : Bo`), so uM's `leading: Oe ?? ft` takes Oe and its own `ft` (Oj with icon
// "Attachment", for a composer without chin or actionsLeading) never shows in Code. $ee is c73f45bc3 pv (exported `S`):
// `Fi` (= c227f4d5e Oj, exported `Zo`) with `side: "top", isPanelActive, ...rc, glyphSize: "md", glyphBoxClassName: ic`,
// rc / ic being cfca6870a p `{size: "base", dockGlyph: !0}` / d `"flex scale-90"`, then the coordinator-mode toggle (only
// with onCoordinatorModeChange) and the footerAccessoryEl portal slot. Oj draws
//   CdsTooltip {content: "Add"} > Menu.Trigger > CdsButton {variant "ghost", size Ej[size], iconOnly, icon: dockGlyph ?
//   ry{className: glyphBoxClassName} > CdsIcon {name: icon ?? "Add", size: glyphSize, className: ay} : icon,
//   "aria-label": "Add", tooltip: false, className: "shrink-0"}
// and its popup jj: Menu.Popup {side, align "start", className "epitaxy-root break-words", collisionPadding zl (shared-18
// GR)} listing Dj ("Add files or photos", icon Attachment, the file_upload shortcut while the pane is active) and then the
// plus-menu items (xj: folder, GitHub / Linear issue in a draft, pj: Slash commands, Connectors, Plugins). The pure pieces
// (Ej, Dj, ry, ay, sy, GR) are generated originals (scripts/extract-code-composer.mjs: composer-glyph.mjs,
// composer-add-menu.mjs, menu-collision-padding.mjs, which also pin the trigger and popup text above).
//
// Host adapters and differences:
//   - The menu is the composer's SourceMenu (D25), opened through main.jsx onMenu("add", …) like every chin menu, so the
//     trigger carries menuTriggerProps (aria-haspopup / aria-expanded / data-popup-open, ArrowDown / ArrowUp open) instead
//     of the Base UI Menu.Trigger, and the tooltip is held closed while a composer menu is open (as the chin triggers).
//   - The rows are main.jsx's (menuContent "add"), each on a real host capability: Dj's row (ComposerAddFilesItem below)
//     opens the native file dialog (`call("attachments")`, so a non-image keeps its path and becomes a mention) instead
//     of Oj's hidden <input type=file>, and ⌘U (file_upload) reaches it the same way; Add folder, Import GitHub issue (gh),
//     Slash commands, Connectors, Plugins follow xj / pj; Import Linear issue (no Linear in the host), the coordinator-mode
//     toggle and the footerAccessoryEl slot (nothing to portal) take the official absent branch and render nothing. The
//     host's own Tools and Skills submenus stay (local features).
//   - Oj never disables the trigger in Code (`disabled: !r && j.length === 0` with a plus-menu scope), so neither does
//     the host (the former host + was disabled while a turn/start was in flight).
import React from "react";
import { CdsButton, CdsIcon, CdsTooltip, cdsClassNames } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { DockGlyphBox, autoGlyphSize, dockGlyphIconClass, dockGlyphProps, sendGlyphBoxClass } from "./generated/code-composer/composer-glyph.mjs";
import { addFilesMenuItem, addTriggerSizes } from "./generated/code-composer/composer-add-menu.mjs";
import { menuCollisionPadding } from "./generated/code-composer/menu-collision-padding.mjs";
import { useComposerIntl } from "./source-composer-current-adapters.jsx";
import { SourceMenu, menuTriggerProps } from "./source-menu";
import { t } from "../electron/i18n/index.mjs";

// Oj's trigger className and jj's popup className, verbatim.
export const ADD_TRIGGER_CLASS = "shrink-0";
export const ADD_MENU_POPUP_CLASS = "epitaxy-root break-words";
// c73f45bc3 pv: the presets card's + (`...rc, glyphSize: "md", glyphBoxClassName: ic`).
export const CARD_ADD_TRIGGER = Object.freeze({ ...dockGlyphProps, glyphSize: "md", glyphBoxClassName: sendGlyphBoxClass });
// R4i-graph GR3: c73f45bc3 tv, the classic layout's chin + (`c(Fi, {…, side: "top", isPanelActive: t, ...rc})`): rc alone,
// so the auto glyph size and no glyph box.
export const CHIN_ADD_TRIGGER = Object.freeze({ ...dockGlyphProps });

/**
 * Oj's trigger (c227f4d5e). `onOpen(entry, event)` opens the host Add menu: entry is "first" / "last" for ArrowDown /
 * ArrowUp on the closed trigger (menuTriggerProps), undefined for a press (SourceMenu then follows the last input).
 */
export function ComposerAddTrigger({ open = false, onOpen, tooltipOpen, icon = "Add", size = "small", dockGlyph, glyphSize = autoGlyphSize, glyphBoxClassName }) {
  const label = t("Add");
  // Oj `h = l ?? c === "small"`, `p = {size: u}`.
  const glyph = dockGlyph ?? size === "small";
  return (
    <CdsTooltip content={label} open={tooltipOpen}>
      <CdsButton variant="ghost" size={addTriggerSizes[size]} iconOnly
        icon={glyph ? <DockGlyphBox className={glyphBoxClassName}><CdsIcon name={icon} size={glyphSize} className={dockGlyphIconClass} /></DockGlyphBox> : icon}
        aria-label={label} tooltip={false} className={ADD_TRIGGER_CLASS}
        {...menuTriggerProps({ open, onOpen })}
        onClick={(event) => onOpen?.(undefined, event)} />
    </CdsTooltip>
  );
}

/** jj: the Add menu popup on the host SourceMenu (side top, align start, the official class and collision padding). */
export function ComposerAddMenuPopup({ className, side = "top", ...props }) {
  return <SourceMenu.Popup side={side} align="start" collisionPadding={menuCollisionPadding} {...props}
    className={cdsClassNames(ADD_MENU_POPUP_CLASS, className)} />;
}

/** Dj's row, the first of Oj's list: "Add files or photos" (or "Add image" without file attachments), icon Attachment. */
export function ComposerAddFilesItem({ supportsFileAttachments = true, shortcut, onSelect }) {
  const item = addFilesMenuItem(useComposerIntl(), { supportsFileAttachments, shortcut, onSelect });
  return <SourceMenu.Item icon={item.icon} shortcut={item.shortcut} onClick={item.onSelect}>{item.label}</SourceMenu.Item>;
}
