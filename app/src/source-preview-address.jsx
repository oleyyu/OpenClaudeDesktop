import React from 'react';
import { createPreviewAddressField, displayPreviewURL } from './generated/code-editor/preview-address-field.mjs';
import { createPreviewNavigation } from './generated/code-editor/preview-navigation.mjs';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip, useExplicitSourceTooltip } from './source-tooltip.jsx';
import { SourceSpinner } from './source-pane-states.jsx';
import { t } from '../electron/i18n/index.mjs';
import { useDefaultBrowserLabel } from './use-default-browser-label.mjs';

function AddressButton({ tooltip, tooltipSide, shortcut, pressed, ...props }) {
  const explicitTooltip = useExplicitSourceTooltip();
  const button = <SourceSettingsButton {...props} aria-pressed={pressed} iconSize="auto" />;
  return tooltip === false || explicitTooltip ? button : <SourceTooltip content={props['aria-label']} shortcut={shortcut} side={tooltipSide} hoverable={false}>{button}</SourceTooltip>;
}
// 3.6556.2 cf550b864 pe: the owner window comes from the CDS anchor context (view-tabs useCdsOwnerWindowAnchor) inside
// the generated field, so the host passes only its Button and Spinner primitives.
const AddressField = createPreviewAddressField({ Button: AddressButton, Spinner: SourceSpinner });

// 3.6556.2: the field has no reload button any more (oe has no `reload`, pe reads no onReload); Reload lives in the
// navigation row (c224804cc P), which SourcePreviewNavigation renders.
export function SourcePreviewAddress({ state, sessionId, focusRequest, pendingNewTabRef, onNavigate, onOpenExternal, pendingValue }) {
  const url = state?.url ?? '';
  // V3-w12b-settings-dialogs: 3.6556.2 cf580efe9 On() (c8ae173c6 p) names the default browser once known.
  const openExternal = useDefaultBrowserLabel();
  let value = url === 'about:blank' ? '' : displayPreviewURL(url);
  if (url.startsWith('file:')) {
    try { value = decodeURIComponent(new URL(url).pathname); } catch { /* keep the original URL */ }
  }
  return <AddressField className="spv-address min-w-0 flex-1" value={value} url={url}
    labels={{
      address: t('Page URL'),
      openExternal,
      loading: t('Loading page'),
    }} placeholder={t('Type a URL')} onNavigate={onNavigate}
    onOpenExternal={onOpenExternal} pendingValue={pendingValue}
    draftKey={`${sessionId}:${state?.activeTabId ?? 'seed'}`}
    liveDraftKeys={(state?.tabs ?? []).map(tab => `${sessionId}:${tab.id}`)}
    pendingNewTabRef={pendingNewTabRef} focusRequest={focusRequest} />;
}

export const SourcePreviewNavigation = createPreviewNavigation({ Button: AddressButton, Tooltip: SourceTooltip });
