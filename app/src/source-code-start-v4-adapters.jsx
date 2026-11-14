// Host boundary of the 4.16336.0 start card (scripts/extract-code-start-v4.mjs -> src/generated/code-start-v4). Every export
// answers one import the generator maps here (adapters / localAdapters); analysis/claude-4.16336.0-migrate-20261104/
// surfaces-prod/code-start/report.json hostAdapterContract says what the host provides for each and what is missing.
// React is the host's one copy (bare 'react').
import { createContext, createElement, useCallback, useContext, useMemo } from 'react';
import { HOST_GROWTHBOOK, growthBookFlagKey } from './host-growthbook.mjs';

// vendor-intl q / Gt (react-intl useIntl / FormattedMessage) over the local catalog, and shared-5 Y_ / j_ (the persisted
// `startCardDismissals` preference, localStorage under the same key, synced across windows; always settled): the host's
// existing implementations, shared with the 3.6556.2 graph and every area that formats through StartMessage.
export { useStartIntl, StartMessage, useStartPref, useStartPrefsSettled } from './source-code-start-adapters.jsx';

/**
 * What the host feeds the 4.16336.0 start card (src/source-code-start.jsx provides it):
 *   sessions      fve: Home's sessions awaiting input, {id, type:'local', isSsh:false, title, ask, stamp}
 *                 (code-start-host-model.mjs startWaitingSessions over the local approvals)
 *   settled       whether the session list has loaded
 *   onOpenSession c26fb8b6b K (useOpenLinkedSession): open a session by id
 *   ClawdLaptop   NW (cc13f8cc7 ClawdLaptopInner): the host's player over the same animation (source-pet.jsx SourcePet)
 */
export const StartHostContext = createContext(null);
function useHost(what) {
  const host = useContext(StartHostContext);
  if (!host) throw Error(`code-start v4: ${what} needs a StartHostContext provider (SourceCodeStart)`);
  return host;
}

// c26fb8b6b K (useOpenLinkedSession): (event, session) => open it. Host: onOpenSession(session.id).
export function useStartNavigation() {
  const { onOpenSession } = useHost('useStartNavigation');
  return useCallback((_event, session) => onOpenSession(session.id), [onOpenSession]);
}
// shared-123 YS: a session's href under the desktop route base. The host has no session routes: rows carry no href.
const noHref = () => null;
export function useStartSessionHref() { return noHref; }
// shared-25 vf: drag-to-split intent. The host only ever asks `vf(null)` (no href, no options), which the official answers
// with `_f`, five inert handlers (shared-25 _f, same keys). Anything else needs desktop pane DnD, which this host lacks.
const NO_DRAG_INTENT = Object.freeze({ onPointerEnter: () => undefined, onPointerLeave: () => undefined, onPointerDown: () => undefined, onFocus: () => undefined, onBlur: () => undefined });
export function startDragIntent(href, options) {
  if (href === null && options === undefined) return NO_DRAG_INTENT;
  throw Error('code-start v4: drag-to-split intent needs a session href (desktop pane DnD); the host has none');
}
// shared-38 Ln ("epitaxy-chat-panel"): the composer pane OQ measures the slot against. The host composer pane class.
export const composerPaneClassName = 'source-chat-tile-content';
// shared-25 No (useGrowthBookString): a GrowthBook string flag from the host table; it serves no string flags, so the
// fallback answers (g_e's `__gb__816608852` -> "" -> h_e.get("") undefined -> ClawdLaptop's default animation).
export function useGrowthBookString(flag, enabled, fallback) {
  if (!enabled) return fallback;
  const value = HOST_GROWTHBOOK[growthBookFlagKey(flag)];
  return typeof value === 'string' ? value : fallback;
}
// c68c4283d ke / Ae / je: product analytics (claudeai.desktop.code.landing.row_shown / _pressed / _dismissed). The host
// sends no telemetry (no official service); the calls keep their shape and record nothing.
export function startRowShownEvent() {}
export function startRowPressedEvent() {}
export function startRowDismissedEvent() {}

// fve: Home's sessions awaiting input and whether the list has settled.
export function useWaitingSessions() {
  const host = useHost('useWaitingSessions');
  return useMemo(() => ({ sessions: host.sessions ?? [], settled: !!host.settled }), [host.sessions, host.settled]);
}
// NW (ClawdLaptop, lazily loaded cc13f8cc7): {animationUrl, replayToken, listeningLoop, className, replayOnClick} -> the
// host's player. animationUrl is `h_e.get(flag)`; h_e is an official Map nothing writes, so it is always undefined (the
// default animation, which SourcePet carries byte for byte).
export function StartClawdLaptop(props) {
  const { ClawdLaptop } = useHost('StartClawdLaptop');
  if (!ClawdLaptop) throw Error('code-start v4: StartHostContext.ClawdLaptop (the host lottie player) is required');
  return createElement(ClawdLaptop, props);
}
// Gated branches: the host contract never passes their inputs; rendering one is a contract break, so it throws.
export function StartRepoRowsGated() {
  throw Error('code-start v4: repo rows need the cloud account / GitHub / experiment inputs (StartCard repoRows); the host never passes repoRows');
}
export function StartTaskOptionsGated() {
  throw Error('code-start v4: suggested-task Options need tasks.startContext (model / effort / cloud recheck); the host never passes it');
}
