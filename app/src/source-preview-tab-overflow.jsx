import React, { useContext, useId, useLayoutEffect, useRef } from 'react';
import { TabOverflowItem, tabOverflowRtlKey, tabOverflowSizes, tabOverflowTypeaheadResetKeys } from './generated/code-current/terminal-tab-overflow.mjs';
import { CdsTooltipProvider } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { DirectionContext } from './generated/view-tabs/vendor-frame-DfPJ1QmD.js';
import { SourceMenu } from './source-menu.jsx';
import { t } from '../electron/i18n/index.mjs';

// The shared strip's overflow menu (cfe7c4b3b se): Preview passes its own labels by default; the terminal strip
// (cccc2cf0a Vy) passes "More terminals" / "Close terminal" / its delete hint. Each row is the original 2.42304.0 ce
// (R3-terminal FT-15, generated/code-current/terminal-tab-overflow.mjs): a close key (ArrowRight, Delete, Backspace;
// ArrowLeft in RTL) with Control, Meta or Alt is left alone, a held key's repeats do nothing, and the window swallows
// the key's repeats after the close (shared-19 dZ); a middle click closes; the label and caption are CdsOverflowTooltip.
// The menu itself is the host SourceMenu (se is the CDS dropdown), so its parts are restated here from se:
//   - h = useDirection() === "rtl" (vendor-frame Td: `N(wd)?.direction ?? "ltr"`, DirectionContext);
//   - onKeyDownCapture b: after typeahead the first Backspace only clears that gesture; L (through I in RTL) resets it;
//   - the rows sit in the CDS tooltip provider at delay 700 (T = kc);
//   - the "press right arrow to close" hint (RTL: left) exists only while some row can close (`g && _`).
export function SourcePreviewTabOverflow({ anchor, tabs, onActivate, onCloseTab, onClose, initialHighlight, labels = null, className = 'spv-overflow-menu' }) {
  const copy = labels ?? { moreTabs: t('More tabs'), closeTab: t('Close tab'), closeTabHint: t('press right arrow to close'), closeTabHintRtl: t('press left arrow to close'),
    closeTabDeleteHint: t('Press Delete or Backspace to close the tab'), previewTabHint: t('preview'), deletedTabHint: t('deleted') };
  const rtl = useContext(DirectionContext)?.direction === 'rtl';
  const closable = tabs.some(tab => tab.closable !== false);
  const hint = useId(), deleteHint = useId(), typed = useRef(false), rows = useRef(null), pendingFocus = useRef(null);
  const closeTab = id => {
    const focused = rows.current?.ownerDocument.activeElement?.closest('[data-preview-overflow-id]');
    if (focused?.dataset.previewOverflowId === id) pendingFocus.current = { id, index: tabs.findIndex(tab => tab.id === id) };
    onCloseTab(id);
  };
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || tabs.some(tab => tab.id === pending.id)) return;
    pendingFocus.current = null;
    const items = rows.current?.querySelectorAll('[role="menuitem"]');
    const next = items?.[Math.min(pending.index, items.length - 1)];
    // Local menu primitive keeps its highlighted state after removal; restore
    // DOM focus too so a second keyboard action stays in this source menu.
    next?.focus({ preventScroll: true });
  }, [tabs]);
  return <SourceMenu.Popup anchor={anchor} side="bottom" align="end" label={copy.moreTabs} className={className} contextMenuGuard="always"
    initialHighlight={initialHighlight} onClose={onClose}>
    <div ref={rows} onContextMenu={event => event.preventDefault()} onKeyDownCapture={event => {
      if (event.key === 'Backspace' && typed.current) {
        event.preventDefault();event.stopPropagation();typed.current = false;
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typed.current = true;
      else if (tabOverflowTypeaheadResetKeys.has(rtl ? tabOverflowRtlKey(event.key) : event.key)) typed.current = false;
    }}>
      {closable && <span id={hint} className="source-sr-only">{rtl ? copy.closeTabHintRtl ?? copy.closeTabHint : copy.closeTabHint}</span>}
      <span id={deleteHint} className="source-sr-only">{copy.closeTabDeleteHint}</span>
      <CdsTooltipProvider delay={700}>
        {tabs.map(tab => <div key={tab.id} data-preview-overflow-id={tab.id}>
          <TabOverflowItem tab={tab} sizes={tabOverflowSizes} hintIds={`${hint} ${deleteHint}`} closeLabel={copy.closeTab}
            previewHint={copy.previewTabHint} deletedHint={copy.deletedTabHint} rtl={rtl} onActivate={onActivate} onClose={closeTab} />
        </div>)}
      </CdsTooltipProvider>
    </div>
  </SourceMenu.Popup>;
}
