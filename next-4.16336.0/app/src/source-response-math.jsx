import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import { hasMathSyntax, mathFallback, renderMath, MATH_SOURCE_LIMIT } from './response-math-model.mjs';
import { createResponseMathLoader } from './response-math-loader.mjs';
import './source-response-math.css';

const mathLoader=createResponseMathLoader({
  loadEngine:()=>import('katex').then(module=>module.default),
  loadStyles:()=>import('katex/dist/katex.min.css'),
  events:typeof window==='undefined'?undefined:window,
});
let readinessMarked=false;

export function SourceResponseMath({ value = '', display = false, open = false, fenced = false }) {
  const enabled = !open && (fenced || hasMathSyntax(value)) && value.length <= MATH_SOURCE_LIMIT;
  const {katex:engine}=useSyncExternalStore(mathLoader.subscribe,
    enabled?mathLoader.getSnapshot:mathLoader.getDisabledSnapshot,mathLoader.getDisabledSnapshot);
  useEffect(() => {
    if(enabled)mathLoader.ensure().catch(()=>{});
  }, [enabled]);
  useEffect(()=>{
    if(engine && !readinessMarked){readinessMarked=true;try{performance.mark('chat:latex_plugins_ready');}catch{}}
  },[engine]);
  const html = useMemo(() => renderMath(engine, value, display, { open, fenced }), [engine, value, display, open, fenced]);
  const Tag = display ? 'div' : 'span';
  const props = { className: display ? 'math-display srm-display' : 'math-inline srm-inline', 'data-incomplete': open ? '' : undefined };
  return html === null ? <Tag {...props} data-math-fallback="">{mathFallback(value, display, open)}</Tag>
    : <Tag {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}
