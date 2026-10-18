import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { t, getLocale } from '../electron/i18n/index.mjs';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { SourcePictogram } from './source-pictogram.jsx';
import { SourceMenu } from './source-menu.jsx';

export const HostButton = SourceSettingsButton;
export const HostTooltip = SourceTooltip;
export const HostPictogram = SourcePictogram;
// Accessible host boundary for the original Banner's optional details disclosure.
const CollapsibleContext = React.createContext(null);
function CollapsibleRoot({ open, defaultOpen = false, onOpenChange, children, ...props }) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const id = React.useId(), expanded = open ?? localOpen;
  const toggle = () => { setLocalOpen(!expanded); onOpenChange?.(!expanded); };
  return <CollapsibleContext.Provider value={{ id, expanded, toggle }}><div {...props} data-cds="Collapsible">{children}</div></CollapsibleContext.Provider>;
}
function CollapsibleTrigger({ render, hideCaret, children, ...props }) {
  const { id, expanded, toggle } = React.useContext(CollapsibleContext);
  const element = render ?? <button {...props} type="button">{children}</button>;
  return React.cloneElement(element, { 'aria-expanded': expanded, 'aria-controls': id,
    onClick: event => { element.props.onClick?.(event); if (!event.defaultPrevented) toggle(); } });
}
function CollapsiblePanel(props) {
  const { id, expanded } = React.useContext(CollapsibleContext);
  return expanded ? <div {...props} id={id} /> : null;
}
export const HostCollapsible = { Root: CollapsibleRoot, Trigger: CollapsibleTrigger, Panel: CollapsiblePanel };
// The desktop host reloads on language changes; it has no pending locale transition.
export const GreetingLocaleTransitionContext = React.createContext({ target: null });
export const useGreetingLocale = () => ({ locale: getLocale() });
export function DisabledReasonTooltip({ reason, children }) { return <SourceTooltip content={reason}>{children}</SourceTooltip>; }
export const useDesktopPlatform = () => 'desktop';
export const usePageLayer = level => level;
export const useLocalizedCopy = (_key, fallback) => t(fallback);
export function LocalLink({ href, onClick, ...props }) {
  return <a {...props} href={href} onClick={event => { event.preventDefault(); onClick?.(event); }} />;
}
export function HostMenuButton({ items, align, ...props }) {
  const [anchor, setAnchor] = useState(null);
  return <><HostButton {...props} aria-haspopup="menu" aria-expanded={!!anchor} onClick={event => setAnchor(event.currentTarget)} />
    {anchor && <SourceMenu.Popup anchor={anchor} align={align} onClose={() => setAnchor(null)} label={props['aria-label']}>
      {items.map((item, index) => <SourceMenu.Item key={item.key ?? index} icon={item.icon} checked={item.checked} checkedRole={item.checkedRole} disabled={item.disabled}
        onClick={() => { setAnchor(null); item.onSelect?.(); }}>{item.label}</SourceMenu.Item>)}
    </SourceMenu.Popup>}</>;
}

export const useDesktopFrame = () => true;
export function DensityRoot({ density, children, ...props }) {
  return <div {...props} data-density={density}>{children}</div>;
}
// Native conversation annotations require the original attachment service. The host
// always passes disableCommentAttachment; these callbacks never render an action.
export const useDisabledTodoComment = () => undefined;
export const DisabledTodoComment = () => null;
export function useScopedState(scope, initialize) {
  const [state, setState] = useState(() => ({ scope, value: initialize(scope) }));
  const setValue = useCallback(value => setState(old => {
    const next = typeof value === 'function' ? value(old.value) : value;
    return old.scope === scope && Object.is(next, old.value) ? old : { scope, value: next };
  }), [scope]);
  if (state.scope !== scope) {
    const next = { scope, value: initialize(scope) };
    setState(next);
    return [next.value, setValue];
  }
  return [state.value, setValue];
}
// The ICU formatter (StartMessage, R4h-intl I1) lives in source-code-start-adapters.jsx. Its generated/chat vendor-intl
// imports source-home-adapters.jsx, which reaches generated/current-chat and comes back here through current-chat's
// vendor-frame; a static import closes that cycle and leaves vendor-frame half-evaluated (forwardRef undefined) whenever
// current-chat loads first. So source-code-start-adapters.jsx registers the formatter (main.jsx loads it through
// SourceCodeStart before anything renders); until then a message falls back to t() with {name} values.
let RegisteredMessage = null;
export function registerLocalizedMessage(component) { RegisteredMessage = component; }
export function LocalizedMessage({ values, ...message }) {
  return RegisteredMessage ? <RegisteredMessage {...message} values={values} /> : t(message.defaultMessage, values);
}

// Host-only boundaries for the extracted layout. Service/account providers are not imported.
export function classNames(...values) {
  return values.flat(Infinity).filter(Boolean).map(value => typeof value === 'object'
    ? Object.entries(value).filter(([,on]) => on).map(([key]) => key).join(' ') : value).join(' ');
}
export const AttachmentAnchorContext = React.createContext(null);
export const Attachments = React.forwardRef(function Attachments({ children, ...props }, ref) {
  return <div ref={ref} data-cds="ChatComposerAttachments" {...props}>{children}</div>;
});
export function useAttachmentAnchor(ref) { return ref; }
export function ThemePortal({ children }) { return children; }
export function SourceIcon({ size, customSize, ...props }) {
  return <Icon {...props} size={customSize ?? ({ xs:12, sm:16, md:20, lg:24, xl:32 }[size] ?? size)} />;
}
// The shell only uses Presence for the expanding header and drag veil. Keep exits mounted.
export function Presence({ children, onExitComplete }) {
  const [retained, setRetained] = useState(children);
  const latest = useRef(onExitComplete); latest.current = onExitComplete;
  useEffect(() => {
    if (children) { setRetained(children); return; }
    const timer = setTimeout(() => { setRetained(null); latest.current?.(); }, 200);
    return () => clearTimeout(timer);
  }, [children]);
  const shown = children || retained;
  return shown ? React.cloneElement(shown, { 'data-leaving': !children || undefined }) : null;
}
Presence.Div = React.forwardRef(function PresenceDiv({ enterClassName, exit, initial, animate, transition, className, ...props }, ref) {
  return <div ref={ref} className={classNames(className, enterClassName, 'source-chat-presence')} {...props} />;
});
