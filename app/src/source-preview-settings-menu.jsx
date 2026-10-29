import React, { createContext, useContext, useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPreviewSettingsMenu } from './generated/code-editor/preview-settings-menu.mjs';
import { createPreviewPaneMenu } from './generated/code-editor/preview-pane-menu.mjs';
import { SourceMenu, menuTriggerProps } from './source-menu.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceTooltip } from './source-tooltip.jsx';
import { CdsConfirmationDialog } from './generated/view-tabs/index.js';
import { useRoutineIntl } from './source-routine-adapters.jsx';
import { t } from '../electron/i18n/index.mjs';
import { autoOpenFilesStore } from './auto-open-files-model.mjs';
import { useDefaultBrowserLabel } from './use-default-browser-label.mjs';

const RootContext = createContext(null), NestedContext = createContext(false);
function Root({ children, onOpenChange }) {
  const [anchor, setAnchor] = useState(null), [highlight, setHighlight] = useState();
  const change = (node, highlight) => { setAnchor(node); setHighlight(highlight); onOpenChange?.(!!node); };
  return <RootContext.Provider value={{ anchor, change, highlight }}><NestedContext.Provider value={false}>{children}</NestedContext.Provider></RootContext.Provider>;
}
function Trigger({ render, disabled }) {
  const { anchor, change } = useContext(RootContext);
  return React.cloneElement(render, { disabled,
    ...menuTriggerProps({ open: !!anchor, onOpen: (highlight, event) => change(event.currentTarget, highlight) }),
    onClick: event => change(anchor ? null : event.currentTarget),
  });
}
function Popup({ container, collisionPadding, ...props }) {
  const { anchor, change, highlight } = useContext(RootContext), nested = useContext(NestedContext);
  if (nested) return <SourceMenu.Popup {...props} />;
  return anchor ? <SourceMenu.Popup {...props} anchor={anchor} label={anchor.getAttribute('aria-label')}
    initialHighlight={highlight} onClose={() => change(null)} /> : null;
}
function Submenu({ children, ...props }) {
  return <SourceMenu.Submenu {...props}><NestedContext.Provider value={true}>{children}</NestedContext.Provider></SourceMenu.Submenu>;
}
function useOptionalStable(callback) {
  const latest = useRef(callback);
  useLayoutEffect(() => { latest.current = callback; });
  const stable = useCallback((...args) => latest.current?.(...args), []);
  return callback === undefined ? undefined : stable;
}
const Button = ({ tooltip, ...props }) => <SourceSettingsButton iconSize="auto" {...props} />;
const MenuHost = { ...SourceMenu, Root, Trigger, Popup, Submenu };
// 3.6556.2 ca5db7aaf H: the sections sit in a Fragment and the popups use the official menu collision padding (shared-18
// Sn), so the factory no longer takes Provider / collisionPadding.
const { Menu: PaneMenu } = createPreviewPaneMenu({ Menu: MenuHost, Button, Tooltip: SourceTooltip,
  useIntl: useRoutineIntl, usePortal: () => undefined,
  isTextInput: node => !!node?.closest?.('input,textarea,[contenteditable=true]'), asElement: node => node?.nodeType === 1 ? node : null,
  useOwnerWindow: () => typeof window === 'undefined' ? null : window,
});
// 3.6556.2 c224804cc W: `t(u,{open:n,onOpenChange:s,onConfirm:a,title:c,description:l,confirmLabel:d,
// confirmVariant:"danger"})` with `Xc as u` — the view-tabs CdsConfirmationDialog itself (shared-frame `ab as Xc`).
const ConfirmDialog = CdsConfirmationDialog;
// V3-w11-sweep-shell-b: the 3.6556.2 slice (c224804cc ae) lists "Auto-open files Claude writes" itself from
// autoOpenFiles / onAutoOpenFilesChange (its `G` gate), so the sections go straight to the pane menu.
const source = createPreviewSettingsMenu({ useOptionalStable, PaneMenu, ConfirmDialog, useIntl: useRoutineIntl });
export const SourcePreviewClearDataDialog = source.ClearDataDialog;
// cf580efe9-BFcQCjF9: `autoOpenFiles: Y` (useEnabled) and `onAutoOpenFilesChange: ki(Ae, oe)` — the write only while the
// preference key is known (useHasKey) and the pane belongs to a local session (c5da7eb42 lR). Every host session is
// local, so a pane with a session id qualifies.
export function useAutoOpenFilesMenuProps(sessionId, store = autoOpenFilesStore) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return { autoOpenFiles: state.enabled, onAutoOpenFilesChange: state.hasKey && sessionId ? store.set : undefined };
}
export function SourcePreviewSettingsMenu({ labels, ...props }) {
  const translated = Object.fromEntries(Object.entries(source.labels).map(([key, value]) => [key, t(value)]));
  // V3-w12b-settings-dialogs: 3.6556.2 cf580efe9 passes the menu `openExternal: j` with `j = On()` (c8ae173c6 p).
  const openExternal = useDefaultBrowserLabel();
  return <source.Menu paneName={t('Preview')} {...props} labels={{ ...translated, openExternal, ...labels }} />;
}
