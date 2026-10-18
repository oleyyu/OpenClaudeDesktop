import React from 'react';
import { createPreviewAddressField, displayPreviewURL } from './generated/code-editor/preview-address-field.mjs';
import { createPreviewNavigation } from './generated/code-editor/preview-navigation.mjs';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip, useExplicitSourceTooltip } from './source-tooltip.jsx';
import { SourceSpinner } from './source-pane-states.jsx';
import { t } from '../electron/i18n/index.mjs';

function AddressButton({ tooltip, tooltipSide, shortcut, pressed, ...props }) {
  const explicitTooltip = useExplicitSourceTooltip();
  const button = <SourceSettingsButton {...props} aria-pressed={pressed} iconSize="auto" />;
  return tooltip === false || explicitTooltip ? button : <SourceTooltip content={props['aria-label']} shortcut={shortcut} side={tooltipSide} hoverable={false}>{button}</SourceTooltip>;
}
const AddressField = createPreviewAddressField({ Button: AddressButton, Spinner: SourceSpinner, ownerDocument: () => typeof document === 'undefined' ? null : document });

export function SourcePreviewAddress({ state, sessionId, focusRequest, pendingNewTabRef, onNavigate, onReload, onOpenExternal, pendingValue }) {
  const url = state?.url ?? '';
  let value = url === 'about:blank' ? '' : displayPreviewURL(url);
  if (url.startsWith('file:')) {
    try { value = decodeURIComponent(new URL(url).pathname); } catch { /* keep the original URL */ }
  }
  return <AddressField className="spv-address min-w-0 flex-1" value={value} url={url}
    labels={{
      address: t('Page URL'),
      reload: t('Reload'),
      openExternal: t('Open in default browser'),
      loading: t('Loading page'),
    }} placeholder={t('Type a URL')} onNavigate={onNavigate}
    onReload={onReload} onOpenExternal={onOpenExternal} pendingValue={pendingValue}
    draftKey={`${sessionId}:${state?.activeTabId ?? 'seed'}`}
    liveDraftKeys={(state?.tabs ?? []).map(tab => `${sessionId}:${tab.id}`)}
    pendingNewTabRef={pendingNewTabRef} focusRequest={focusRequest} />;
}

export const SourcePreviewNavigation = createPreviewNavigation({ Button: AddressButton, Tooltip: SourceTooltip });
