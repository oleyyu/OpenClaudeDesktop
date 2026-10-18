import React, {useMemo, useSyncExternalStore} from 'react';
import {ViewTabBar as OriginalViewTabBar} from './generated/view-tabs/cfe7c4b3b-CP-IQXj8.js';
import {DirectionContext} from './generated/view-tabs/vendor-frame-DfPJ1QmD.js';
import {CdsDensityContext as DensityContext} from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import './source-view-tabs.css';

const directionSnapshot = () => globalThis.document?.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr';
const serverDirection = () => 'ltr';
function observeDirection(callback) {
  const doc=globalThis.document, Observer=doc?.defaultView?.MutationObserver;
  if(!Observer)return () => {};
  const observer=new Observer(callback);observer.observe(doc.documentElement,{attributes:true,attributeFilter:['dir']});
  return () => observer.disconnect();
}
// The view, menus, focus/overflow calculations and Base UI tabs are the
// installed source. Only the host's direction and density enter here.
export function SourceViewTabBar({direction, density='compact', className='', ...props}) {
  const rootDirection=useSyncExternalStore(observeDirection,directionSnapshot,serverDirection);
  const context=useMemo(()=>({direction:direction??rootDirection}),[direction,rootDirection]);
  return <DirectionContext value={context}><DensityContext value={density}>
    <OriginalViewTabBar {...props} className={`source-view-tabs ${className}`}/>
  </DensityContext></DirectionContext>;
}
