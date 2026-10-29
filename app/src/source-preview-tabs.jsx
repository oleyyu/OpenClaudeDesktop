import React, { useEffect, useMemo, useRef } from 'react';
import { SourceViewTabBar } from './source-view-tabs.jsx';
import { CdsRoot } from './generated/view-tabs/index.js';
import { codePaneExperimental } from './generated/code-composer/code-pane-experimental.mjs';
import { PreviewTabFavicon, PreviewTabOpenInBrowserItem, createPreviewCloseTabsDialog, createPreviewTabStripLabels, isWebOrigin, previewSeedTabId,
  previewTabLabel, previewTabsAtCap } from './generated/code-editor/preview-tab-strip.mjs';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { holdModalInert } from './modal-inert.mjs';
import { useDefaultBrowserLabel } from './use-default-browser-label.mjs';

// w12b-terminal-preview-tabs (TPT-1): the Preview strip is 3.6556.2 cf580efe9 Oa's — the shared ViewTabBar (cfe7c4b3b t,
// through SourceViewTabBar like the terminal and side chat strips) with Oa's props, its tab rows, labels and tab menu:
//   r(Qn,{ref:fe,className:"min-w-0 flex-1 outline-none focus-visible:shadow-focus focus-visible:outline-hidden",
//     "aria-label":T?"Browser tabs":"Preview tabs",tabs:ee,activeId:E.length===0?_t:D,onActivate:Ve,onReselect:Le,
//     onClose:rt,onCreate:ue,newTabShortcut:a?"cmd+t":void 0,createDisabled:mr(E.length),
//     renderTabMenuItems:B?.openPreviewInBrowser?kt:void 0,onCloseOthers:At,onReorder:A?O:void 0,labels:It})
// The pieces (Ca, wa, Ta, c224804cc G/K over c25e47851 a, c155b6b71 l, c62dc633f t, va) are generated
// (generated/code-editor/preview-tab-strip.mjs). Host facts:
//   - "Preview tabs": T is shared-78 JT (GrowthBook qT, the Browser naming), off here (R15, D15 keeps Preview).
//   - A tab's origin is its address (preview-service tab.url); a blank tab ("" / about:blank) has none and reads "New
//     tab" (Oa's `t.tabId==="seed"?e:N` — the host never makes a "seed" tab).
//   - busy is the page loading; the host has no per-tab toolActive.
//   - The strip's own variant only: Oa's "menu" variant (ya, the "{# tabs}" count badge) renders under wo's dialogBar,
//     which the host's Preview never has.
//   - "Open in {browserName}" (c8ae173c6 On) is w12b-settings-dialogs' store (use-default-browser-label.mjs).
const usePreviewTabStripLabels = createPreviewTabStripLabels({ useIntl: useStartIntl });

// c03935b01 bt (the modal presence va registers): the page under a dialog stays out of reach, as the link chooser does.
function useModalPresence(open) {
  useEffect(() => (open ? holdModalInert(globalThis.document?.getElementById('root')) : undefined), [open]);
}
// shared-18 fx (va's Pe): the Code pane's CdsRoot — density compact, experimental lx, className contents.
function CodePaneRoot({ children }) {
  return <CdsRoot density="compact" experimental={codePaneExperimental} className="contents">{children}</CdsRoot>;
}
// cf580efe9 va (TPT-2): "Close {host}?" with Cancel at the start and Stop server / Keep running at the end
// (`E.Footer,{align:"between"}`), on the view-tabs CdsAlertDialog (shared-frame ib, published as Yc).
export const SourcePreviewCloseTabsDialog = createPreviewCloseTabsDialog({ useIntl: useStartIntl, FormattedMessage: StartMessage, useModalPresence, CodePaneRoot });

const originOf = (tab) => (tab?.url && tab.url !== 'about:blank' ? tab.url : '');
// cf580efe9 Da: whether the focused element shows a keyboard focus ring.
const focusVisible = (element) => { try { return element.matches(':focus-visible'); } catch { return false; } };

export function SourcePreviewTabs({ tabs = [], activeId, onSelect, onCreate, onClose, onCloseOthers, onExternal, onReorder, onFocusPage }) {
  const strip = useRef(null);
  const intl = useStartIntl();
  const base = usePreviewTabStripLabels();
  const openInBrowser = useDefaultBrowserLabel();
  const newTab = base.newTab;
  // Oa I: the placeholder row while there are no tabs, else each tab's title (or Ca of its origin), its origin as the
  // detail, the favicon (gr) and closable; a tab without an origin is just "New tab".
  const stripTabs = useMemo(() => (tabs.length === 0 ? [{ id: previewSeedTabId, label: newTab, closable: false }] : tabs.map((tab) => {
    const origin = originOf(tab);
    return origin ? { id: tab.id, label: tab.title?.trim() || previewTabLabel(origin), detail: origin,
      icon: <PreviewTabFavicon key={tab.faviconUrl ?? undefined} src={tab.faviconUrl ?? undefined} busy={tab.loading === true} />, closable: true }
      : { id: tab.id, label: newTab };
  })), [tabs, newTab]);
  // Oa It: c62dc633f's labels and "Close other tabs".
  const labels = useMemo(() => ({ ...base, closeOtherTabs: intl.formatMessage({ defaultMessage: 'Close other tabs', id: 'kcQzEk8MkX' }) }), [base, intl]);
  // Oa kt: the tab menu's "Open in {browserName}" (Ta), only for a website.
  const openInBrowserItem = (id) => {
    const origin = tabs.find((tab) => tab.id === id)?.url;
    return !origin || !isWebOrigin(origin) ? null : <PreviewTabOpenInBrowserItem tabId={id} label={openInBrowser} onOpenInBrowser={onExternal} />;
  };
  // Oa Ve: the main process has no placeholder tab to activate (the seed row only stands in for an empty strip).
  const activate = (id) => { if (id !== previewSeedTabId) onSelect(id); };
  // Oa Le/Ie: pressing the open tab again while focus is in the strip (not from the keyboard) hands focus to its page.
  const reselect = (id) => {
    const node = strip.current, focused = node?.ownerDocument.activeElement;
    if (!node || !focused || !node.contains(focused) || focusVisible(focused) || !onFocusPage) return;
    if (id === activeId && originOf(tabs.find((tab) => tab.id === id))) onFocusPage();
  };
  return <SourceViewTabBar ref={strip} className="min-w-0 flex-1 outline-none focus-visible:shadow-focus focus-visible:outline-hidden"
    aria-label={intl.formatMessage({ defaultMessage: 'Preview tabs', id: 'QU/W+eha/0' })} tabs={stripTabs}
    activeId={tabs.length === 0 ? previewSeedTabId : activeId} onActivate={activate} onReselect={reselect} onClose={onClose}
    onCreate={onCreate} newTabShortcut="cmd+t" createDisabled={previewTabsAtCap(tabs.length)} renderTabMenuItems={openInBrowserItem}
    onCloseOthers={onCloseOthers} onReorder={onReorder} labels={labels} />;
}
