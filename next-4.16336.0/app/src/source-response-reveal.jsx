import React, { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import { createResponseRevealLedger, rehypeResponseReveal, RESPONSE_SETTLE_MS } from './response-reveal-model.mjs';
import { createResponseRevealAnimations } from './response-reveal-animation.mjs';
const RevealContext = createContext(null);

export function useResponseReveal(text, isStreaming) {
  const [ledger] = useState(() => isStreaming ? createResponseRevealLedger(text) : null);
  const [settled,setSettled] = useState(false);
  const [animations] = useState(createResponseRevealAnimations);
  const active = settled ? null : ledger;
  active?.begin(text);
  useEffect(() => {
    if (!ledger || isStreaming || settled) return;
    const timer = setTimeout(() => { ledger.finish();setSettled(true); },RESPONSE_SETTLE_MS);
    return () => clearTimeout(timer);
  },[ledger,isStreaming,settled]);
  useLayoutEffect(() => {
    if (!active) animations.dispose();
    return () => animations.dispose();
  },[animations,active]);
  const plugins = useMemo(() => active ? [[rehypeResponseReveal,{ledger:active}]] : [],[active]);
  return { plugins, animations, ledger:active };
}
export function ResponseRevealScope({ animations, children }) {
  return <RevealContext.Provider value={animations}>{children}</RevealContext.Provider>;
}
export function ResponseRevealSpan({ node, children, ...props }) {
  const owner = useContext(RevealContext), ref = useRef(null), entry = node?.data?.responseReveal;
  useLayoutEffect(() => owner?.bind(ref.current,entry),[owner,entry]);
  return <span {...props} ref={ref}>{children}</span>;
}
