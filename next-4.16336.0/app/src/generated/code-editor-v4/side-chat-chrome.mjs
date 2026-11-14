// Original 4.16336.0 class constants of the side chat's turns and pane chrome (strings only).

// c9bd7af9c-Bvb7EG4D.js
const { VN: sideChatInsetClass } = (() => {
  var VN = "px-lg pt-md pb-[24px]";
  return { VN };
})();
// c2fd10b8d-DEwP4IO5.js
const { vd: sideChatUserTurnClass } = (() => {
  var gd = "epitaxy-user-turn";
  var _d = `${gd} flex w-full flex-col min-w-0 ms-auto items-end`;
  var vd = `${_d} gap-sm`;
  return { vd };
})();
// shared-2-CsjIBQD8.js
const { K8: userBubbleShapeClass, q8: userBubbleMeasureClass } = (() => {
  var K8 =
    "rounded-[var(--cds-message-bubble-radius)] px-[var(--cds-message-bubble-pad-x)] py-[var(--cds-message-bubble-pad-y)]";
  var q8 = "max-w-[var(--cds-message-bubble-measure)]";
  return { K8, q8 };
})();
// shared-38-DyF0_Fim.js
const {
  kt: paneHeaderLineClass,
  Pt: paneTitleClass,
  Lt: paneTrailingClass,
} = (() => {
  var St = "ps-[4px]";
  var kt =
    "relative flex items-center justify-between gap-sm h-[calc(2rem*var(--cds-rem-scale,1))] ps-[4px] pe-[4px] shrink-0";
  var Pt = `text-body font-normal font-control text-secondary select-none truncate ${St}`;
  var Lt = "relative z-[1] flex items-center gap-0.5 shrink-0 draggable-none";
  return { kt, Pt, Lt };
})();
// c4db265df-CHyZjtsm.js
const {
  tn: paneElevation,
  an: paneRootClass,
  sn: paneFlushRootClass,
  bn: paneBodyClass,
} = (() => {
  // shared-38-DyF0_Fim.js
  const $c_shared_38_DyF0_Fim = (() => {
    var vt =
      "dark:shadow-sm dark:not-forced-colors:outline dark:not-forced-colors:outline-1 dark:not-forced-colors:outline-alpha-2";
    return { vt };
  })();
  const { vt: V } = $c_shared_38_DyF0_Fim;
  var tn = "panel";
  var rn = "min-w-0 shrink-0 relative isolate flex flex-col";
  var an = `${rn} ${V}`;
  var sn = `${rn} rounded-none shadow-none`;
  var bn = "flex flex-col flex-1 min-h-0 overflow-hidden";
  return { tn, an, sn, bn };
})();

export {
  sideChatInsetClass,
  sideChatUserTurnClass,
  userBubbleShapeClass,
  userBubbleMeasureClass,
  paneHeaderLineClass,
  paneTitleClass,
  paneTrailingClass,
  paneElevation,
  paneRootClass,
  paneFlushRootClass,
  paneBodyClass,
};
