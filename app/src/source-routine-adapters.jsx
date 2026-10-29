import React, { createContext, useContext, useMemo, useState } from 'react';
import { createIntl } from './generated/chat/vendor-intl-DYfox5Co.js';
import { t, getLocale } from '../electron/i18n/index.mjs';
import { SourceMenu, menuTriggerProps } from './source-menu.jsx';

export const RoutineContext = createContext(null);
const MenuContext = createContext(null);
function MenuRoot({ open, onOpenChange, children }) {
  const [anchor, setAnchor] = useState(null);
  const [highlight, setHighlight] = useState(undefined);
  const change = (value, highlight) => { setAnchor(value); setHighlight(highlight); onOpenChange?.(!!value); };
  return <MenuContext.Provider value={{ anchor: open === false ? null : anchor, change, highlight }}>{children}</MenuContext.Provider>;
}
function MenuTrigger({ render }) {
  const { anchor, change } = useContext(MenuContext);
  const trigger = menuTriggerProps({ open: !!anchor, onOpen: (highlight, event) => change(event.currentTarget, highlight) });
  return React.cloneElement(render, { ...trigger, onClick: event => { render.props.onClick?.(event); change(anchor ? null : event.currentTarget); } });
}
function MenuPopup(props) {
  const { anchor, change, highlight } = useContext(MenuContext);
  return anchor ? <SourceMenu.Popup {...props} anchor={anchor} initialHighlight={highlight} onClose={() => change(null)} /> : null;
}
export const RoutineSourceMenu = { ...SourceMenu, Root: MenuRoot, Trigger: MenuTrigger, Popup: MenuPopup };
export function useRoutineIntl() {
  const locale = getLocale();
  return useMemo(() => {
    const intl = createIntl({ locale, defaultLocale: locale, messages: {} });
    return { ...intl, formatMessage: (message, values) => intl.formatMessage({ ...message, defaultMessage: t(message.defaultMessage) }, values) };
  }, [locale]);
}
// The 2.31226.0 routine detail / form adapter exports (noRemoteModel, UnavailableRoutineBadge, CurrentRoutineMenu,
// useRoutineErrors, useRoutineBridge, ...) had no importer after w10-curchat-retire; w10-cleanup-final removed them.

// Only data shape changes here. Card markup, text sanitization, status formatting,
// hover actions and the pause/edit/delete menu come from the original modules.
export function sourceRoutine(task) {
  return { ...task, displayName: task.name, source: 'local', surface: 'cowork',
    model: task.options.model, permissionMode: task.options.permission, cronExpression: task.cron,
    nextRunAt: task.nextRunAt ? new Date(task.nextRunAt).toISOString() : undefined,
    fireAt: task.fireAt ? new Date(task.fireAt).getTime() : undefined,
    lastRunAt: task.lastRunAt ? new Date(task.lastRunAt).toISOString() : undefined };
}
