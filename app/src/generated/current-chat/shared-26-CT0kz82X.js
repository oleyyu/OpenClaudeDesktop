// Extracted from installed Claude Desktop 2.31226.0. Do not edit.
import { x as v } from "./vendor-frame-foKw4lFA.js";
import { X as gi } from "./shared-frame-DVFSKIcx.js";
var Sa="[--cmp-type-size:max(var(--cds-font-size-text-entry-floor,0px),var(--cmp-font-size,var(--cds-font-size-prose)))] [--cmp-leading:round(var(--cmp-type-size)*1.4,1px)] [--cmp-row-py:max(0px,(var(--cds-h-control)-var(--cmp-leading))/2)] [--cmp-row-h:calc(var(--cmp-leading)+2*var(--cmp-row-py))]";
var Ca=`${Sa} py-[var(--cmp-row-py)] text-[length:var(--cmp-type-size)] leading-[var(--cmp-leading)] font-normal`;
var wa="motion-safe:duration-200";
var Ta=`motion-safe:transition-[padding-left,padding-right] ${wa}`;
var Ea=`transition-opacity duration-200 motion-safe:transition-[opacity,padding-left,padding-right] ${wa}`;
var Da=`w-full max-h-96 min-h-[var(--cmp-row-h)] overflow-y-auto break-words ${Ca} ${Ea}`;
function Oa(e,t){let n=ka(e)?`calc(${e}lh + 2 * var(--cmp-row-py))`:void 0;if(n!==void 0||t!==void 0)return{...n===void 0?void 0:{minHeight:n},...t===void 0?void 0:{maxHeight:t}}}
function ka(e){return e!==void 0&&e>1}
var Aa={glyph:"pl-[6px] compact:pl-[6px] comfortable:pl-[8px]",text:"pl-[4px] compact:pl-[4px] comfortable:pl-[6px]"};
function ja(e){return e==="none"?void 0:Aa[e]}
var Na=.3;
var Pa=v({multiline:!1,startInset:"none",endInset:"none",glideArmed:!0,columnReservesTrailing:!1});
var Fa=v({hasContent:!1,busy:!1,pinSend:!1,form:"new"});
var Ia=v(null);
var Ra="pr-[var(--cmp-trail-w,0px)]";
function za({startInset:e,disabled:t,settled:n,className:r}){return gi(Da,ja(e),!n&&"transition-none motion-safe:transition-none",t&&"cursor-default opacity-60",r)}

export { Pa, ja, Aa, Fa, Ca, Sa, Ta, wa, Na, ka, Ra, Ia, za, Da, Ea, Oa, v, gi };
