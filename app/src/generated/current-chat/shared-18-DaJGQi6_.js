// Extracted from installed Claude Desktop 2.31226.0. Do not edit.
import { me as O } from "./vendor-frame-foKw4lFA.js";
import { K as w } from "./vendor-frame-foKw4lFA.js";
import { ge as k } from "./vendor-frame-foKw4lFA.js";
import { yu as Y } from "./shared-frame-DVFSKIcx.js";
import { LocalizedMessage as Z } from "../../source-chat-adapters.jsx";
import { homeTone as wD } from "../../source-home-adapters.jsx";
import { HomeIcon as rd } from "../../source-home-adapters.jsx";
import { HomeStatusDot as _D } from "../../source-home-adapters.jsx";
import { useDesktopFrame as iE } from "../../source-chat-adapters.jsx";
import { HostTooltip as Zu } from "../../source-chat-adapters.jsx";
import { oc as Sr } from "./shared-25-B37c0AC9.js";
import { useDesktopFrame as Ru } from "../../source-chat-adapters.jsx";
import { bv as Ot } from "./shared-1-BPVqFfwb.js";
function Iy(e){return"getAnimations"in e&&typeof e.getAnimations=="function"}
function Ly(e){let t=e.target;if(!Iy(t))return;let n=Sr(t)?.performance.timeOrigin??performance.timeOrigin;for(let e of t.getAnimations()){let t=e.effect?.getTiming(),r=t?.duration;t?.iterations!==1/0||typeof r!="number"||r<=0||(e.startTime=-(n%r))}}
function Ry({kind:e}){return w("span",{className:"status-dot","data-kind":e,onAnimationStart:Ly})}
function Px({children:e,className:t,narrow:n}){let r=Ru()?"div":"main";return w(r,{className:k("mx-auto mt-4 w-full flex-1 px-md md:px-8 lg:mt-6",n?Ot:"max-w-7xl",t),children:e})}
var mT="./assets/v1/c25011d97-Dg-b7-mk.png";
function hT({className:e,size:t}){let n={backgroundImage:`url(${mT})`},r=t===void 0?n:{...n,width:t,height:t};return w("span",{className:k("status-dot",e),"data-kind":"clay",style:r,onAnimationStart:Ly})}
function lD(e){e.buttons===0&&e.stopPropagation()}
function uD({label:e,detail:t,live:n=!1,tooltip:r=!0,triggerClassName:i="",children:a}){let o=iE(),s=w("span",{role:n?"status":"img","aria-label":e,className:`flex min-h-3.5 min-w-3.5 shrink-0 items-center justify-center ${i}`,onPointerMove:lD,onPointerEnter:lD,onMouseMove:lD,children:a});return!r||!o?s:w(Zu,{content:e,detail:t,delay:500,closeDelay:0,hoverable:!1,lazy:!0,className:"pointer-events-none",children:s})}
var pD="[mask-image:radial-gradient(circle_at_calc(100%_-_1px)_4px,transparent_5px,black_5.5px)]";
var mD="[mask-image:radial-gradient(circle_at_calc(100%_-_1px)_4px,transparent_6.5px,black_7px)]";
var hD={ChatSimple:14};
function gD({name:e,dot:t,muted:n=!0}){let r=hD[e],i=t==="error",a=wD(SD);return O("span",{className:"relative inline-flex",children:[w(rd,{name:e,...r===void 0?{size:"auto"}:{customSize:r},className:k(n&&"text-muted",t&&(i?mD:pD))}),t&&(i?w("span",{"aria-hidden":!0,className:"absolute -top-px -right-1",children:w(rd,{name:"Warning",customSize:10,className:a})}):w("span",{"aria-hidden":!0,className:"absolute top-px -right-0.5",children:w(_D,{kind:t})}))]})}
var SD="text-warning";
function pI({count:e=6,columns:t="two",variant:n="text",silent:r=!1,gallery:i=!1,textCardHeightPx:a,className:o,gridClassName:s}){return O("div",{role:r?void 0:"status","aria-hidden":r||void 0,className:o,children:[!r&&w("span",{className:"sr-only",children:w(Z,{defaultMessage:"Loading",id:"iFsDVRnIHW"})}),w("div",{"aria-hidden":!0,className:s??(t==="three"?"grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3":"grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 md:gap-6"),children:Array.from({length:e}).map((e,t)=>n==="thumbnail"?i?w(mI,{},t):O("div",{className:"flex flex-col rounded-card bg-surface-1 shadow-card-ring [--cds-ring-inner:1px] [--cds-ring-outer:0px]",children:[w("div",{className:"h-[164px]"}),w("div",{className:"mx-px border-t border-alpha-1"}),O("div",{className:"flex flex-col gap-xs p-lg pt-md",children:[w("div",{className:"flex h-5 items-center",children:w(Y,{height:14,width:"70%"})}),w("div",{className:"flex h-4 items-center",children:w(Y,{height:11,width:"50%"})})]})]},t):O("div",{className:k("flex",a===void 0&&"h-[140px]","flex-col gap-md rounded-card bg-surface-1 p-lg shadow-card-ring [--cds-ring-inner:1px] [--cds-ring-outer:0px]"),style:a===void 0?void 0:{height:a},children:[w(Y,{height:16,width:"60%"}),O("div",{className:"flex flex-grow flex-col gap-xs",children:[w(Y,{height:12}),w(Y,{height:12,width:"85%"})]}),w(Y,{height:10,width:100,className:"mt-auto"})]},t))})]})}
function mI({blank:e=!1}){return O("div",{className:"flex h-full flex-col rounded-card bg-surface-2 shadow-card-ring [--cds-ring-inner:1px] [--cds-ring-outer:0px]",children:[w("div",{className:"h-[160px]"}),w("div",{className:k("mx-px border-t",e?"border-transparent":"border-alpha-1")}),O("div",{className:"flex flex-col gap-xs p-3.5",children:[w("div",{className:"flex h-[1lh] items-center text-body",children:e?null:w(Y,{height:14,width:"70%"})}),w("div",{className:"flex h-[1lh] items-center text-caption",children:e?null:w(Y,{height:11,width:"50%"})})]})]})}

export { mI, pI, gD, hD, SD, mD, pD, uD, lD, Ry, Ly, Iy, Px, hT, mT, O, w, k, Y, Z, wD, rd, _D, iE, Zu, Sr, Ru, Ot };
