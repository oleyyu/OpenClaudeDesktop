// Code title bar session menus and the Rename session dialog (batch B09).
//
// c593f7513 wm (readable 7520-7540): the CaretDown trigger beside the title is labelled from the trimmed title,
// "More options for {label}" (bare "More options" without one), and the DotsVertical overflow is "View options".
// c593f7513 vm (7270-7300): the title button's tooltip is the full title while the title is truncated
// (scrollWidth > clientWidth), "Rename" otherwise. shared-16 Jd (5027-5120): the dialog saves the trimmed name,
// skips the rename when it equals the name it opened with, and does nothing for a blank name (Save is disabled).
import { t } from "../electron/i18n/index.mjs";
import { sessionMenuTooltipLabel } from "./generated/code-current/session-menu-tooltip.mjs";

export function sessionMenuTriggerLabel(title) {
  const label = typeof title === "string" ? title.trim() : "";
  // The reference message is "More options for {label}"; the local catalog holds the same English under {name}.
  return label ? t("More options for {name}", { name: label }) : t("More options");
}

// R2-topbar TT-02 (2.42304.0 cc43287c9 _W): the caret's tooltip `Ge` words the same message around `Ue`, the
// trimmed title cut to gW = 80 graphemes (79 + "…", generated session-menu-tooltip.mjs); the aria-label (`He`,
// sessionMenuTriggerLabel) keeps the full title. `Ge` wraps the label in <bdi> only under an RTL direction; the
// local locales are LTR, so the tooltip is plain text.
export function sessionMenuTriggerTooltip(title) {
  const label = typeof title === "string" ? title.trim() : "";
  return label ? t("More options for {name}", { name: sessionMenuTooltipLabel(label) }) : t("More options");
}

// zt's trigger; the local cramped titlebar folds Preview/Terminal into it, so their activity dot names itself here.
export function viewOptionsLabel(foldedActivity = false) {
  return foldedActivity ? t("View options (a dev server or command is running)") : t("View options");
}

export function titleOverflows(node) {
  return !!node && node.scrollWidth > node.clientWidth;
}

export function titleTooltipContent(node, title) {
  return titleOverflows(node) ? title : t("Rename");
}

// Jd b(): { close: false } keeps the dialog open (blank name); { close: true } closes it, with `name` set only when
// a rename should be sent.
export function renameSubmission(value, initialName = "") {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return { close: false };
  return name !== initialName ? { close: true, name } : { close: true };
}

// Jd keeps Save disabled until the field holds something other than whitespace.
export const renameSubmittable = (value) => typeof value === "string" && value.trim() !== "";

// shared-21 IV m(): the header menu's Rename starts the inline title edit (onRenameStart) after the menu closes,
// through a 100ms (xV) deferral so the closing menu's focus return lands first.
export const RENAME_START_DELAY_MS = 100;
