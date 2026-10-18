// Extracted from Claude Desktop 2.2553.1 caaf77b85-DdXwb3ur.js. Only asset URLs are made relative. Do not edit.
import { jsxs as l } from "react/jsx-runtime";
import { classNames as c } from "../../source-chat-adapters.jsx";
import { jsx as s } from "react/jsx-runtime";
import { Pa as C } from "./shared-frame-C_2npUJq.js";
import { useRoutineIntl as D } from "../../source-routine-adapters.jsx";
import { D_ as g } from "./shared-3-YXRuSVZn.js";
import { RoutineSwitch as x } from "../../source-routine-detail-adapters.jsx";
import { j_ as h } from "./shared-3-YXRuSVZn.js";
import { $ as T } from "./shared-frame-C_2npUJq.js";
import { xo as b } from "./shared-frame-C_2npUJq.js";
import { rU as m } from "./shared-7-DsClUbcz.js";
import { en as E } from "./vendor-intl-Cf4IuK3L.js";
import { useMemo as r } from "react";
import { identity as j } from "../../source-routine-form-adapters.jsx";
import { useCallback as o } from "react";
import { FormCatalogPicker as k } from "../../source-routine-form-adapters.jsx";
import { formModelName as A } from "../../source-routine-form-adapters.jsx";
import { formModelName as d } from "../../source-routine-form-adapters.jsx";
import { Hx as O } from "./shared-14-BOJVa-jT.js";
import { Fragment as a } from "react";
import { FormSelect as S } from "../../source-routine-form-adapters.jsx";
import { CdsTextInput as w } from "../view-tabs/shared-frame-BfjMqbuN.js";
import { useId as t } from "react";
import { useState as i } from "react";
import { useRef as n } from "react";
import { HostCollapsible as y } from "../../source-chat-adapters.jsx";
var F=E({frequency:{defaultMessage:"Frequency",id:"vAW30j/jo6"},dayOfWeek:{defaultMessage:"Day of week",id:"gD6r6xvYQ0"},time:{defaultMessage:"Time",id:"ug01MkZy2v"},pickerTriggerName:{defaultMessage:"{label}: {value}",id:"TZPy/C/d14"}});
function I(e,t,n){return e.formatMessage(F.pickerTriggerName,{label:t,value:n})}
var L="rounded-card shadow-card-ring";
var R="flex items-center gap-2 px-lg py-3.5 [&+&]:border-t-0.5";
var z="mr-2 text-body text-primary";
var B="text-footnote text-muted";
var V="mt-6 flex flex-col gap-3";
function G({icon:e,label:t,mono:n=!1,trailing:r,onRemove:i,removeAriaLabel:a,disabled:o=!1}){return l(C,{variant:"neutral",icon:e,onRemove:o?void 0:i,removeLabel:a,className:"max-w-full",children:[s("span",{className:c("block max-w-[200px] truncate",n&&"font-mono"),children:t}),r]})}
function K({children:e,icon:t,id:n,tone:r="muted"}){return l("div",{className:c(R,"items-start py-3"),children:[t,s("div",{id:n,role:r==="danger"?"alert":void 0,className:c("min-w-0 flex-1 text-footnote",r==="danger"?"text-danger":"text-muted"),children:e})]})}
function q({checked:e,onCheckedChange:t,lockReason:n,disabled:r=!1,title:i,help:a,className:o,children:u}){let d=D(),f=n!=null,p=i??"nknq81";return l("div",{className:c(L,"px-lg py-3.5",o),children:[l("div",{className:"flex items-start justify-between gap-4",children:[l("div",{className:"flex min-w-0 flex-col gap-1",children:[s("span",{className:"text-body font-medium text-primary",children:s(g,{id:p})}),s("span",{className:c(B,"max-w-[420px]"),children:a??s(g,{id:"18af8qg"})})]}),s(x,{"aria-label":h({id:p,intl:d}),checked:f?!0:e,onCheckedChange:t,disabled:f||r})]}),f&&l("div",{className:"mt-2 flex items-center gap-1.5 text-footnote text-secondary",children:[s(T,{name:"Lock",size:"xs"}),n]}),u!=null&&u!==!1&&s("div",{className:"mt-3 flex flex-wrap items-center gap-2 border-t-0.5 pt-3",children:u})]})}
function J({drafting:e,empty:t,placeholder:n,className:r}){return{placeholder:e&&t?"":n,className:c(r,e&&!t&&"opacity-60"),"aria-busy":e}}
function Y({children:e,toolbarStart:t,toolbarEnd:n,drafting:r=!1,drafted:i=!1,empty:a=!1,invalid:o=!1,className:u}){let d=D(),f=r&&a,p=r&&!a;return l("div",{className:c("relative rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:transition-shadow after:content-[''] focus-within:after:shadow-focus",o?"after:shadow-field-invalid":"after:shadow-card-ring",u),children:[l("div",{className:"relative",children:[e,f&&l("div",{className:"pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 px-3 py-2.5 font-sans text-body text-muted",children:[s(b,{size:"sm",label:h({id:"jg048k",intl:d})}),s(m,{variant:"muted","aria-hidden":!0,className:"min-w-0 truncate",children:s(g,{id:"jg048k"})})]})]}),l("div",{className:"flex items-center justify-between gap-2 rounded-b-[inherit] border-t-0.5 bg-surface-0 px-3 py-2",children:[l("div",{className:"flex min-w-0 items-center gap-1",children:[t,s("span",{role:"status","data-testid":"routine-composer-status",className:c("min-w-0 truncate px-2 text-caption",!p&&"sr-only"),children:p?s(m,{variant:"muted",children:s(g,{id:"jg048k"})}):i&&!r&&s(g,{id:"1tptmj9"})})]}),s("div",{className:"flex min-w-0 items-center gap-1",children:n})]})]})}
function X({value:e,options:t,onChange:n,icon:r,ariaLabel:i,popupClassName:a}){let o=D(),c=t.find(t=>t.value===e)?.label??e;return s(S,{size:"sm",fullWidth:!1,searchable:!1,items:t,value:e,onChange:e=>{e!==null&&n(e)},"aria-label":I(o,i,c),renderTriggerValue:e=>r?l("span",{className:"flex min-w-0 items-center gap-1.5",children:[s(T,{name:r,size:"sm",className:"shrink-0"}),s("span",{className:"min-w-0 truncate",children:e?.label??c})]}):e?.label??c,renderItem:e=>e.suffix?l("span",{className:"inline-flex items-center gap-2",children:[e.label,e.suffix]}):e.label,popupClassName:a??"min-w-[200px]"})}
function Z({value:e,onChange:t,ariaLabel:n}){return l(a,{children:[s("span",{className:c(B,"mx-0.5"),children:s(g,{id:"95oan6"})}),s(w,{size:"sm",type:"time",fullWidth:!1,"aria-label":n,value:e,onChange:e=>t(e.target.value),className:"w-[128px] font-mono [&::-webkit-calendar-picker-indicator]:hidden"})]})}
function Q({frequency:e,frequencyOptions:t,onFrequencyChange:n,day:r,startsOn:i,time:o,icon:c="Clock"}){let u=D();return l(a,{children:[s(X,{icon:c??void 0,ariaLabel:u.formatMessage(F.frequency),value:e,options:t,onChange:n}),r&&s(X,{ariaLabel:u.formatMessage(F.dayOfWeek),value:String(r.value),options:r.names.map((e,t)=>({value:String(t),label:e})),onChange:e=>r.onChange(parseInt(e,10)),popupClassName:"min-w-[160px]"}),i,o&&s(Z,{ariaLabel:u.formatMessage(F.time),value:o.value,onChange:o.onChange})]})}
function ee({ariaLabel:e,value:n,onChange:r,placeholder:i="0 9 * * 1-5",tag:a,badge:o,error:u,hint:d}){let f=u||d,p=f!=null&&f!=="",m=t(),h=t();return l("div",{className:c(R,"flex-wrap gap-y-1.5 py-3"),children:[s("span",{className:c(B,"w-[56px]"),children:s(g,{id:"1roqoot"})}),s(w,{size:"sm",fullWidth:!1,"aria-label":e,"aria-invalid":u?!0:void 0,"aria-describedby":p?`${m} ${h}`:h,value:n,onChange:e=>r(e.target.value),placeholder:i,className:"min-w-[170px] flex-1 font-mono"}),s(C,{id:h,variant:"neutral",size:"xs",children:a}),o,p&&s("span",{id:m,className:c("basis-full pl-[64px] text-footnote",u?"text-danger":"text-muted"),role:u?"alert":void 0,children:f})]})}
function te({children:e}){let[t,r]=i(!1),a=n(null),u=o(e=>{t&&e.target===e.currentTarget&&e.propertyName==="height"&&a.current?.scrollIntoView?.({behavior:"smooth",block:"nearest"})},[t]);return l(y.Root,{ref:a,open:t,onOpenChange:r,className:L,children:[l(y.Trigger,{hideCaret:!0,className:"flex w-full justify-between rounded-card px-lg py-3.5 text-left text-primary hover:text-primary",children:[s(g,{id:"152u9ht"}),s(T,{name:"CaretDown",size:"sm",className:c("text-muted transition-transform",t&&"rotate-180")})]}),s(y.Panel,{className:"border-t-0.5",onTransitionEnd:u,children:e})]})}
function re({title:e,description:t,trailing:n}){return l("div",{className:c(R,"items-start"),children:[l("div",{className:"flex min-w-0 flex-1 flex-col gap-0.5",children:[s("span",{className:"text-body text-primary",children:e}),t!=null&&s("span",{className:"text-footnote text-muted",children:t})]}),s("div",{className:"flex shrink-0 items-center gap-2",children:n})]})}
function ie(){return l("div",{className:"flex items-start gap-2.5 rounded-card bg-surface-0 px-3.5 py-3 text-footnote text-secondary shadow-card-ring",children:[s(T,{name:"Laptop",size:"sm",className:"mt-px shrink-0 text-muted"}),s("span",{children:s(g,{id:"m66eaq"})})]})}
var $="__default";
var ae={overflowSearch:!0,overflowRowPresentation:O};
function oe({options:e,value:t,onChange:n,selectedLabel:i,qualifier:a,disabled:c=!1,internalCatalog:l=!1}){let u=t||$,f=r(()=>{let t=e.map(e=>({id:e.model||$,name:e.name,description:e.description??null,section:e.section==="overflow"?"overflow":"main",disabled:e.disabledReason!==void 0,disabled_reason:e.disabledReason===void 0?null:{type:"model_disabled",message:e.disabledReason},thinking:{type:"none"}})),n=l?j(t):t;return n.some(e=>e.id===u)||n.push({id:u,name:i??u,section:"deprecated",disabled:!0,thinking:{type:"none"}}),{models:n}},[e,u,i,l]),p=r(()=>({model:u}),[u]),m=o(e=>{n(e.model===$?void 0:e.model)},[n]);return s(k,{size:"sm",align:"end",catalog:f,state:p,onStateChange:m,triggerQualifier:a,triggerName:A(t,d(t??"")),disabled:c,config:l?ae:void 0})}

export { re, R, G, q, L, B, Y, I, F, oe, $, ae, J, V, z, Q, X, Z, ee, K, te, ie, l, c, s, C, D, g, x, h, T, b, m, E, r, j, o, k, A, d, O, a, S, w, t, i, n, y };
