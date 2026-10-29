import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPreviewLinkChooser } from './generated/code-editor/preview-link-chooser.mjs';
import { createPreviewLinkRadio } from './generated/code-editor/preview-link-radio.mjs';
import { previewLinksStore } from './preview-links-model.mjs';
import { previewChooserStore } from './preview-link-routing.mjs';
import { useRoutineIntl } from './source-routine-adapters.jsx';
import { SourceDialog } from './source-dialog.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { useSourceToasts } from './source-toast.jsx';
import { holdModalInert } from './modal-inert.mjs';
import { Icon } from './icons.jsx';
import { t } from '../electron/i18n/index.mjs';
import { useDefaultBrowserLabel } from './use-default-browser-label.mjs';
import './source-preview-link-chooser.css';

function useModalPresence(open) { useEffect(() => open ? holdModalInert(document.getElementById('root')) : undefined, [open]); }

const RadioContext = createContext(null), CheckedContext = createContext(false);
function RadioRoot({ value, onValueChange, children, ...props }) {
  return <RadioContext.Provider value={{ value, onValueChange }}><div {...props} data-cds="RadioGroup" role="radiogroup" className="flex flex-col gap-2 font-sans">{children}</div></RadioContext.Provider>;
}
const Radio = React.forwardRef(function Radio({ value, children, onMouseDown, ...props }, ref) {
  const group = useContext(RadioContext), checked = value === group.value;
  return <button {...props} ref={ref} type="button" role="radio" aria-checked={checked} data-checked={checked ? '' : undefined}
    tabIndex={checked ? 0 : -1} onClick={() => group.onValueChange(value)}
    onKeyDown={event => {
      if (!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const items = [...event.currentTarget.parentElement.querySelectorAll('[role=radio]:not(:disabled)')], index = items.indexOf(event.currentTarget);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1) + items.length) % items.length;
      items[next]?.click(); items[next]?.focus();
    }}><CheckedContext.Provider value={checked}>{children}</CheckedContext.Provider></button>;
});
function Indicator() {
  const checked = useContext(CheckedContext);
  return <span className="preview-link-radio-indicator" data-checked={checked ? '' : undefined} aria-hidden="true">{checked && <span/>}</span>;
}
const Card = createPreviewLinkRadio({ Radio, Indicator, useWrap: () => false, onMouseDown: () => undefined });
function ConfirmationDialog({ open, onOpenChange, onConfirm, title, description, confirmLabel, disabled, children, className }) {
  const cancel = useRef(null);
  return <SourceDialog open={open} alert size="sm" showClose={false} title={title} description={description}
    initialFocusRef={cancel} onClose={() => onOpenChange(false)} className={`preview-link-chooser ${className}`}
    footer={<><SourceSettingsButton ref={cancel} variant="secondary" onClick={() => onOpenChange(false)}>{t('Cancel')}</SourceSettingsButton>
      <SourceSettingsButton variant="primary" disabled={disabled} onClick={onConfirm}>{confirmLabel}</SourceSettingsButton></>}>
    {children}
  </SourceDialog>;
}
function useChooserSeen() {
  const toasts = useSourceToasts();
  const seen = useSyncExternalStore(previewChooserStore.subscribe, previewChooserStore.getSnapshot, previewChooserStore.getSnapshot);
  return [seen, value => { void previewChooserStore.set(value).catch(() => toasts?.add(t('Couldn’t save your changes. Try again.'), { variant: 'danger' })); }];
}
function useLinksPreference() {
  return [useSyncExternalStore(previewLinksStore.subscribe, previewLinksStore.getSnapshot, previewLinksStore.getSnapshot), previewLinksStore.set];
}
export const SourcePreviewLinkChooser = createPreviewLinkChooser({
  RadioGroup: { Root: RadioRoot, Card }, Icon: ({ name }) => <Icon name={name} size={20}/>, ConfirmationDialog,
  useIntl: useRoutineIntl, useChooserSeen, useLinksPreference, useModalPresence,
  useShortcut: () => [typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'],
  platform: () => typeof navigator !== 'undefined' ? navigator.platform : '',
  // V3-w12b-settings-dialogs: 3.6556.2 cf580efe9 On() (c8ae173c6 p): the named browser once known.
  useBrowserLabel: useDefaultBrowserLabel,
});
