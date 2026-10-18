import React, { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { createResponseTableStore, nearestTableHeading, observeTableOverflow, transitionMilliseconds } from './response-table-model.mjs';
import { holdModalInert } from './modal-inert.mjs';
import { useTableColumnFreeze } from './generated/r3b-transcript/table-column-freeze.mjs';
import './source-response-table.css';
import { t } from '../electron/i18n/index.mjs';

const TableStoreContext = createContext(null);
function tablePresentation(element) {
  const computed = element.ownerDocument.defaultView.getComputedStyle(element);
  return {
    typography: Object.fromEntries(['--chat-body', '--chat-leading', '--chat-item-gap'].map(name => [name, computed.getPropertyValue(name)]).filter(([, value]) => value)),
    appearance: Object.fromEntries(['density', 'font', 'mode', 'theme', 'platform'].map(name => [name, element.closest(`[data-${name}]`)?.getAttribute(`data-${name}`)])),
  };
}

// One store per transcript. Standalone/nested messages get the same lifecycle
// through the fallback scope, without adding any layout elements.
export function SourceTableScope({ children, scopeKey }) {
  const inherited = useContext(TableStoreContext);
  return inherited ? children : <OwnedTableScope key={scopeKey}>{children}</OwnedTableScope>;
}
function OwnedTableScope({ children }) {
  const [store] = useState(createResponseTableStore);
  return <TableStoreContext.Provider value={store}>{children}<ExpandedTable store={store}/></TableStoreContext.Provider>;
}

export function SourceResponseTable({ children, isStreaming, wrapSnapshot, ...props }) {
  const store = useContext(TableStoreContext);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const owner = useId(), scroller = useRef(null), trigger = useRef(null);
  const [overflow, setOverflow] = useState(false);
  // cov1-06 (2.42304.0 c89efce1a Mc `s = jc(Ze(), t)`): while the message streams, the header cells' min-width is frozen
  // at their measured widths and re-measured only when the table outgrows them, or after Ac(rows) more rows
  // (min(16, max(1, floor(rows / 16)))); it clears once the message settles. This replaces the fixed table layout the
  // host used while streaming.
  const tableRef = useTableColumnFreeze(isStreaming === true, children);
  useLayoutEffect(() => {
    if (isStreaming || !scroller.current) return;
    return observeTableOverflow(scroller.current, setOverflow);
  }, [isStreaming]);
  const selected = state.snapshot?.owner === owner;
  const expand = () => {
    const element = scroller.current;
    store.show({ owner, heading: nearestTableHeading(element.parentElement), rows: wrapSnapshot ? wrapSnapshot(children) : children,
      props, ...tablePresentation(element), source: element, trigger: trigger.current, document: element.ownerDocument });
  };
  return <div className="smd-table">
    <div ref={scroller} className="source-table-scroll"><table ref={tableRef} {...props}>{children}</table></div>
    {(!isStreaming && overflow || selected) && <span className="smd-table-action" data-not-prose=""><button type="button" ref={trigger} className="smd-table-button" aria-label={t("Expand table")} onClick={expand}><Icon name="Expand" size={16}/></button></span>}
  </div>;
}

function ExpandedTable({ store }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return state.snapshot ? <TableDialog key={state.version} store={store} state={state}/> : null;
}

function TableDialog({ store, state }) {
  const { snapshot, version, open } = state;
  const root = useRef(null), title = useId(), [entered, setEntered] = useState(false);
  const [presentation, setPresentation] = useState(snapshot);
  const doc = snapshot.document, view = doc.defaultView;
  useLayoutEffect(() => {
    // Rows are a snapshot; app typography and OS light/dark preferences remain
    // live, as in the source's CDS portal. No observers outlive the dialog.
    const observer = new view.MutationObserver(() => {
      const source = snapshot.source.isConnected ? snapshot.source : doc.querySelector('.source-transcript-content') || doc.documentElement;
      setPresentation(tablePresentation(source));
    });
    for (let node = snapshot.source; node; node = node.parentElement) observer.observe(node, {
      attributes: true, attributeFilter: ['style', 'class', 'data-density', 'data-font', 'data-mode', 'data-theme', 'data-platform', 'data-local-transcript-size'],
    });
    return () => observer.disconnect();
  }, [snapshot, doc, view]);
  useLayoutEffect(() => {
    const previous = snapshot.trigger || doc.activeElement, releaseInert = holdModalInert(doc.getElementById('root'));
    root.current?.focus({ preventScroll: true });
    const frame = view.requestAnimationFrame(() => setEntered(true));
    const keepFocus = event => {
      if (!root.current || root.current.contains(event.target)) return;
      // Source modal inert exclusions keep the shared notification viewport reachable.
      if (event.target.closest?.('[data-cds="Toast"]')) return;
      // A native menu can open Settings independently of DOM inertness. Yield
      // to that modal instead of fighting its focus during our exit residency.
      if (event.target.closest?.('[role="dialog"],[role="alertdialog"]')) { store.close(); return; }
      root.current.focus({ preventScroll: true });
    };
    doc.addEventListener('focusin', keepFocus);
    return () => {
      view.cancelAnimationFrame(frame);
      doc.removeEventListener('focusin', keepFocus);
      releaseInert();
      const focused = doc.activeElement;
      if (focused && focused !== doc.body && !root.current?.contains(focused)) return;
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true });
      else {
        const composer = doc.querySelector(`[aria-label="Message DeepSeek"], [aria-label="${t('Message DeepSeek')}"]`);
        if (composer && !composer.closest('[inert]')) composer.focus({ preventScroll: true });
      }
    };
  }, [doc, view, snapshot, store]);
  useEffect(() => {
    if (open || !root.current) return;
    // Native transitionend is preferred. The timer covers an occluded window,
    // disabled/reduced animation or an interrupted compositor transition.
    const timer = view.setTimeout(() => store.release(version), transitionMilliseconds(view.getComputedStyle(root.current)));
    return () => view.clearTimeout(timer);
  }, [open, store, version, view]);
  const keyDown = event => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); store.close(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...root.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')].filter(element => element.getClientRects().length && !element.closest('[inert]'));
    const first = controls[0], last = controls.at(-1), active = doc.activeElement;
    if (!controls.length) { event.preventDefault(); return; }
    if (event.shiftKey && (active === first || active === root.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || active === root.current)) { event.preventDefault(); first.focus(); }
  };
  return createPortal(<div className="smd-table-backdrop cds-root" data-density={presentation.appearance.density} data-font={presentation.appearance.font} data-mode={presentation.appearance.mode} data-theme={presentation.appearance.theme} data-platform={presentation.appearance.platform} data-open={open && entered} onMouseDown={event => {
    if (event.target === event.currentTarget && event.button === 0) { event.preventDefault(); store.close(); }
  }}>
    <section ref={root} className="smd-table-dialog" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title}
      data-open={open && entered} style={presentation.typography} onKeyDown={keyDown}
      onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === 'opacity' && !open) store.release(version); }}>
      <header><h2 id={title} className={snapshot.heading ? '' : 'source-sr-only'}>{snapshot.heading || t('Table')}</h2><button type="button" className="smd-table-button" aria-label={t("Close")} onClick={() => store.close()}><Icon name="X" size={16}/></button></header>
      <div className="source-markdown"><div className="source-table-scroll" dir={snapshot.props.dir}><table {...snapshot.props}>{snapshot.rows}</table></div></div>
    </section>
  </div>, doc.body);
}
