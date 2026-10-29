// Original class constants of the side chat's turns and pane chrome (strings only).
var FF = "px-lg pt-md pb-[24px]";
var as = "epitaxy-user-turn";
var os = `${as} flex w-full flex-col min-w-0 ms-auto items-end`;
var ss = `${os} gap-sm`;
var C3 =
  "rounded-[var(--cds-message-bubble-radius)] px-[var(--cds-message-bubble-pad-x)] py-[var(--cds-message-bubble-pad-y)]";
var w3 = "max-w-[var(--cds-message-bubble-measure)]";
var eh =
  "dark:shadow-sm dark:not-forced-colors:outline dark:not-forced-colors:outline-1 dark:not-forced-colors:outline-alpha-2";
var ih = "ps-[4px]";
var fh =
  "relative flex items-center justify-between gap-sm h-[calc(2rem*var(--cds-rem-scale,1))] ps-[4px] pe-[4px] shrink-0";
var vh = `text-body font-normal font-control text-secondary select-none truncate ${ih}`;
var xh = "relative z-[1] flex items-center gap-0.5 shrink-0 draggable-none";
const z = eh;
var Nt = "panel";
var It = "min-w-0 shrink-0 relative isolate flex flex-col";
var Lt = `${It} ${z}`;
var zt = `${It} rounded-none shadow-none`;
var Qt = "flex flex-col flex-1 min-h-0 overflow-hidden";
export {
  FF as sideChatInsetClass,
  ss as sideChatUserTurnClass,
  C3 as userBubbleShapeClass,
  w3 as userBubbleMeasureClass,
  fh as paneHeaderLineClass,
  vh as paneTitleClass,
  xh as paneTrailingClass,
  Nt as paneElevation,
  Lt as paneRootClass,
  zt as paneFlushRootClass,
  Qt as paneBodyClass,
};
