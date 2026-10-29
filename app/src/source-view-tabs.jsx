import React, {useMemo, useSyncExternalStore} from 'react';
import {ViewTabBar as OriginalViewTabBar,DirectionContext,CdsDensityContext as DensityContext} from './generated/view-tabs/index.js';
import {t} from '../electron/i18n/index.mjs';
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
// 3.6556.2 cds:C10 (cfe7c4b3b ViewTabBar): createBusy and the other new props
// pass straight through; when a caller sets createBusy (with onCreate and a
// createMenu) the role="status" text is labels.newTabBusy, so the host's
// translation of the official "Opening new tab…" is the default here and a
// caller's labels still win.
export function SourceViewTabBar({direction, density='compact', className='', labels, ...props}) {
  const rootDirection=useSyncExternalStore(observeDirection,directionSnapshot,serverDirection);
  const context=useMemo(()=>({direction:direction??rootDirection}),[direction,rootDirection]);
  const tabLabels=useMemo(()=>({newTabBusy:t('Opening new tab…'),...labels}),[labels]);
  return <DirectionContext value={context}><DensityContext value={density}>
    <OriginalViewTabBar {...props} labels={tabLabels} className={`source-view-tabs ${className}`}/>
  </DensityContext></DirectionContext>;
}
