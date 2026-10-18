// Local seams for the original 2.42304.0 shared-21 zF search field (2.37337.1 iI). The installed UI's
// account/growthbook stores are not loaded into OpenClaude.
import React, { createContext, useContext } from 'react';
import { SourceShortcut, useMacShortcuts } from './source-shortcut.jsx';
import { Icon } from './icons.jsx';
export const SidebarSearchContext = createContext({ open: undefined, shortcut: 'cmd+k' });
export function useSidebarSearchIntent(entry, source) {
  const context = useContext(SidebarSearchContext);
  return { open: () => context.open?.(entry, source) };
}
export function useSidebarSearchShortcut() { return { shortcutString: useContext(SidebarSearchContext).shortcut }; }
export const useSidebarShortcutPlatform = useMacShortcuts;
export function sidebarShortcutAria(keys, mac) {
  return keys.split('+').map(key => ({ cmd: mac ? 'Meta' : 'Control', ctrl: 'Control', shift: 'Shift', alt: 'Alt' })[key] ?? key).join('+');
}
export function SidebarSearchShortcut(props) { return <SourceShortcut {...props}/>; }
export const SidebarLabelInteraction = createContext(false);
export function useSidebarLabelInteraction() { return useContext(SidebarLabelInteraction); }
export function useSidebarOverlayState(selector) { return selector({ overflowMenuOpen: useContext(SidebarLabelInteraction) }); }
// shared-16 tf adds emoji shortcodes only behind the desktop's account gate.
// That optional capability has no local host integration yet.
export function SidebarRenameEnhancer() { return null; }

// The CDS Icon slot (shared-frame Jo) of the sidebar PR icon/card and row details, answered by the local icon host
// with the same size tokens and bold weight. The nav Badge no longer comes through here: it is the view-tabs CdsBadge.
export function SidebarCdsIcon({ size = 'sm', customSize, bold, alt, style, ...props }) {
  const pixels = customSize ?? ({ xs: 12, sm: 16, md: 20, lg: 24 }[size] ?? 16);
  return <Icon {...props} size={pixels} weight={bold ? 'strong' : 'regular'}
    {...(alt === undefined ? {} : { role: 'img', 'aria-label': alt, 'aria-hidden': undefined })}
    style={{ fontSize: `calc(${pixels / 16}rem * var(--cds-rem-scale, 1))`, ...style }} />;
}
