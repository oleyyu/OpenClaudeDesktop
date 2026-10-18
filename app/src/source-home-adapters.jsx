import React, { createContext, useContext, useEffect, useState } from 'react';
import { Icon } from './icons';
import { gD as TaskGlyph, uD as StatusLabel, Ry as StatusDot } from './generated/current-chat/shared-18-DaJGQi6_.js';
import { t, getLocale } from '../electron/i18n/index.mjs';
import { useStartIntl } from './source-code-start-adapters.jsx';

export const CoworkHomeContext = createContext(null);
const useHome = () => useContext(CoworkHomeContext);
export const useHomeIntl = useStartIntl;
export const useHomePins = () => true;
export const useHomeSessions = () => useHome().rows;
export const useHomeReadState = () => useHome().readState;
export const useHomeReady = () => useHome().ready;
export const useHomeAttentionIds = () => useHome().attentionIds;
// Local tasks already have real thread IDs when published.
export const pendingHomeCreation = () => null;
export const useHomeScheduleAccess = () => ({ enabled: true });
export const useHomeSchedules = () => ({ scheduledTasks: useHome().scheduledTasks });
export const useHomeMotion = () => undefined;
const noAnalytics = { track() {} };
export const useHomeAnalytics = () => noAnalytics;
export const homeSessionOpened = () => {};
export const homeTone = value => value;
export const HOME_CLEAR_EVENT = 'local-cowork:clear-active';
// The source read-state service is account-wide. Every mounted local home uses
// the same session metadata; its clear action also preserves pins and live work.
export const clearHomeActive = () => window.dispatchEvent(new Event(HOME_CLEAR_EVENT));
export function useHomePermissions(id) {
  const pending = useHome().permissions.get(id) ?? [];
  return { pending, needsUserAction: pending.length > 0,
    hasOnlyInputRequests: pending.length > 0 && pending.every(item => /requestUserInput/.test(item.method)),
    canShowReviewPopover: false };
}
export const useHomeNeedsAttention = id => useHome().attentionIds.has(id);
// Local permission requests open their session instead of a cloud review popover.
export const homeSessionHasInlineReview = () => false;
export const useHomeReviewDelay = () => false;
// Reviews open the real session approval controls through the row link. The
// cloud InlineToolApproval boundary is unreachable (canShowReviewPopover=false).
export const UnavailableInlineReview = () => null;
export function HomeLink({ href, onClick, children, ...props }) {
  const host = useHome();
  return <a {...props} href={href} onClick={event => {
    event.preventDefault();
    onClick?.(event);
    if (href?.startsWith('/cowork/')) host.onOpen(decodeURIComponent(href.slice('/cowork/'.length)));
    else if (href?.startsWith('/scheduled-task/')) host.onOpenRoutine(decodeURIComponent(href.slice('/scheduled-task/'.length)));
  }}>{children}</a>;
}
export function HomeIcon({ size, customSize, ...props }) {
  return <Icon {...props} size={customSize ?? ({ auto: 16, sm: 16, md: 20 }[size] ?? size ?? 16)} />;
}
export const HomePin = props => <Icon {...props} name="Pin" />;
export const HomeStar = props => <Icon {...props} name="Star" />;
export const HomeClock = props => <Icon {...props} name="Clock" />;
export const HomePause = props => <Icon {...props} name="Pause" />;
export const HomeArrow = props => <Icon {...props} name="ArrowRight" />;
export const HomeStatusDot = StatusDot;
export function HomeSessionStatus({ liveStatus, isUnread, isDone, hasError }) {
  const dot = liveStatus === 'awaiting' ? 'awaiting' : hasError ? 'error' : liveStatus === 'running' ? 'running' : isUnread ? 'ready' : undefined;
  const label = t({ awaiting: 'Awaiting input', error: 'Something went wrong', running: 'Running', ready: 'Unread response' }[dot] ?? (isDone ? 'Done' : 'Idle'));
  return <StatusLabel label={label} live={!!dot}><TaskGlyph name="Tasks" dot={dot} /></StatusLabel>;
}
export function useHomeNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  return now;
}
// Unit selection and timed refresh belong to the extracted vendor-intl $t.
export function HomeRelativeTime({ value, unit = 'second', numeric = 'auto' }) {
  return new Intl.RelativeTimeFormat(getLocale(), { numeric }).format(value, unit);
}
export function homeDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const useHomeToday = () => homeDateKey(new Date(useHomeNow()));
export const homeTaskName = id => id;
