const clamp=(value,low,high)=>Math.min(Math.max(value,low),Math.max(low,high));
// BT floating branch: top-start, no flip, offset(10,-16), shift padding8,
// size(availableHeight-16), cap384. Width comes from the actual rendered menu.
export function slashMenuLayout({caret,width,height,viewport}) {
 const maxHeight=Math.max(0,Math.min(384,caret.top-34));
 return {left:clamp(caret.left-16,8,viewport.width-width-8),top:caret.top-10-Math.min(height,maxHeight),maxHeight};
}
// The active row's description is the CDS Tooltip (3.6556.2 c17e03edc d: side inline-end, align start, sideOffset 8,
// collisionAvoidance {fallbackAxisSide:"none"}); Base UI places it and hides it with the clipped row, so no
// description geometry lives here (source-menu.jsx skillDescriptionTooltipProps).
export function slashFilterFits({start,end,length,caretLeft,parentRight,width}) {
 return start===length&&end===length&&parentRight-(caretLeft+2)>=width+8;
}
