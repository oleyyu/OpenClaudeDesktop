// Ordinary user bubble collapse (2.2553.1 scroll-messages-current.js:38897-38915).
// The non-aggressive branch compares the summed length of the drawn segments
// (trimmed text runs and fence bodies) against LQ = 1200; there is no
// ResizeObserver and no reply quote in the local adapter.
import { t } from "../electron/i18n/index.mjs";
export const USER_COLLAPSE_LIMIT = 1200;

export function userSegmentsTextLength(segments) {
  let total = 0;
  for (const segment of segments ?? []) {
    if (segment.kind === "text" || segment.kind === "code") total += segment.text.length;
  }
  return total;
}

export function isUserTextCollapsible(segments, limit = USER_COLLAPSE_LIMIT) {
  return userSegmentsTextLength(segments) > limit;
}

// Presentation state for one bubble: collapsed bodies mask their tail and
// render links/chips non-interactively until the user expands them.
export function userCollapseState({ collapsible, expanded }) {
  const collapsed = collapsible && !expanded;
  return { collapsible, collapsed, nonInteractive: collapsed, showToggle: collapsible,
    toggleLabel: collapsible ? (expanded ? t("Show less") : t("Show more")) : null };
}
