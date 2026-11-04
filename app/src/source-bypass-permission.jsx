import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionDialog } from './source-session-actions.jsx';
// W14-code r6 R6DC-02: shared-frame Uu (E41 direct import), not the host replica.
import { CdsButton } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { SourceDialogFooter } from './source-dialog.jsx';
import './source-bypass-permission.css';
import { t } from '../electron/i18n/index.mjs';
import { assistantName } from './persona-store.mjs';
import { BYPASS_KEPT_ROW, BYPASS_KEPT_TOAST, dropBypassPick, hasBypassPick, keepBypassPick, keepsBypassPick, settleBypassPicks } from './permission-mode-kept-bypass.mjs';

// wr's securityLink target (ion-dist c936fcd42): the permission-mode and sandbox guidance Bypass skips. Claude's own page
// covers Claude Code only, so the dialog links the running core's guidance instead (bypassGuide).
export const SECURITY_GUIDE_URL = 'https://code.claude.com/docs/en/security';
/** The running core's Bypass guidance: its descriptor's securityUrl (a security guide), else its homepage, else null. */
export function bypassGuide(descriptor) {
  const https = (value) => typeof value === 'string' && /^https:\/\//.test(value) ? value : null;
  const name = typeof descriptor?.name === 'string' && descriptor.name ? descriptor.name : null;
  if (!name) return null;
  if (https(descriptor.securityUrl)) return { url: descriptor.securityUrl, name, label: 'security guide' };
  if (https(descriptor.homepage)) return { url: descriptor.homepage, name, label: 'documentation' };
  return null;
}

// The opt-in is a local preference. Confirming Bypass in the Mode menu remembers it as the mode like every other
// pick: with `layers` (permission-mode-resolution.mjs, composer-14) that is the opening's pick and its folder's pick
// (c227f4d5e gn), so new sessions in that folder keep it while the opt-in stays on; without layers, `permission` is
// the only mode. Settings' default may also be Bypass (preferences.mjs drops it back to Auto when the opt-in is turned
// off; main checks the core's requirements when it is saved and validates every Bypass request). A scope-bound
// selection still covers a Bypass carried by a core switch (carry) before a remembered mode exists.
// composer-05 (R4i-small SM2, permission-mode-kept-bypass.mjs): Bypass confirmed during a running turn on a core
// without live permissions (Codex: the mode rides the next turn/start) is kept like cef1e6037's picks: `kept` marks
// the Bypass row "Turns on when Claude finishes working." and onKept gets the info toast; the pick settles when that
// session's turn is over or its mode is no longer Bypass. Without running/livePermissions nothing is ever kept.
// W14-code composer-05/06: c227f4d5e xR / vR consent memory. Bypass is acknowledged per workspace
// (`epitaxy-perm-mode-acks-v2` holds `${folder}:bypassPermissions`; an empty folder is never remembered), Auto once
// (`epitaxy-auto-mode-consented`, or any `…:auto` ack): cR asks before either, unless it was acknowledged. Host: one
// local account, so the renderer's localStorage under the official keys (no account scope).
export const PERMISSION_ACKS_KEY = 'epitaxy-perm-mode-acks-v2';
export const AUTO_CONSENT_KEY = 'epitaxy-auto-mode-consented';
const storage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
export function readPermissionAcks(store = storage()) {
  try { const value = JSON.parse(store?.getItem(PERMISSION_ACKS_KEY) || '[]'); return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []; } catch { return []; }
}
export function bypassAcknowledged(folder, store = storage()) {
  return typeof folder === 'string' && folder !== '' && readPermissionAcks(store).includes(`${folder}:bypassPermissions`);
}
export function acknowledgeBypass(folder, store = storage()) {
  if (typeof folder !== 'string' || folder === '') return;
  const key = `${folder}:bypassPermissions`, acks = readPermissionAcks(store);
  if (!acks.includes(key)) try { store?.setItem(PERMISSION_ACKS_KEY, JSON.stringify([...acks, key])); } catch { /* no storage */ }
}
export function autoConsented(store = storage()) {
  try { if (JSON.parse(store?.getItem(AUTO_CONSENT_KEY) || 'false') === true) return true; } catch { /* unreadable */ }
  return readPermissionAcks(store).some((entry) => entry.endsWith(':auto'));
}
export function consentToAuto(store = storage()) { try { store?.setItem(AUTO_CONSENT_KEY, 'true'); } catch { /* no storage */ } }

export function useBypassPermission({ permission, enabled, mode, sessionKey, cwd, connectionKey, layers = null, onChange,
  running = false, livePermissions = true, connected = true, activeSessions = null, onKept = null }) {
  const [selected, setSelected] = useState(() => new Set()), [pending, setPending] = useState(null);
  const [keptPicks, setKeptPicks] = useState(() => ({}));
  const scope = JSON.stringify([connectionKey, sessionKey ?? null, sessionKey ? null : cwd]);
  const live = useRef(null); live.current = { scope, enabled, mode, pending, sessionKey, running, livePermissions, connected, onKept };
  const previousConnection = useRef(connectionKey);
  useEffect(() => {
    if (!enabled || previousConnection.current !== connectionKey) { setSelected(new Set()); setPending(null); }
    previousConnection.current = connectionKey;
  }, [enabled, connectionKey]);
  useEffect(() => { setPending(null); }, [scope, mode]);
  const folder = typeof cwd === 'string' ? cwd : '';
  // The dialog keeps its copy while it fades out after the pick settles.
  const shownDialog = useRef('bypass'); if (pending) shownDialog.current = pending.mode ?? 'bypass';
  // The confirmed Bypass (the dialog's confirm, or an acknowledged workspace): this scope takes it, the workspace is
  // remembered (xR O), and a pick a running turn can't take yet is kept (permission-mode-kept-bypass.mjs).
  const applyBypass = (target) => {
    setSelected(current => new Set(current).add(target)); setPending(null);
    acknowledgeBypass(folder);
    onChange('bypass');
    // cef1e6037 mn + c227f4d5e gn's catch: keep the pick and say when it turns on (addInfo bypassKeptToast).
    const now = live.current;
    if (keepsBypassPick({ value: 'bypass', previous: shown, sessionId: now.sessionKey, running: now.running, livePermissions: now.livePermissions, connected: now.connected })) {
      setKeptPicks((picks) => keepBypassPick(picks, now.sessionKey, shown));
      now.onKept?.(t(BYPASS_KEPT_TOAST));
    }
  };
  const available = enabled && mode === 'code';
  const resolved = layers ? layers.mode : permission;
  const remembered = resolved === 'bypass', base = remembered ? 'auto' : resolved;
  const active = available && (remembered || (previousConnection.current === connectionKey && selected.has(scope)));
  const clear = () => setSelected(current => { const next = new Set(current); next.delete(scope); return next; });
  const forSession = (id, folder) => {
    const target = JSON.stringify([connectionKey, id ?? null, id ? null : folder]);
    const own = layers ? layers.modeFor(id) : resolved, ownRemembered = own === 'bypass';
    return available && (ownRemembered || (previousConnection.current === connectionKey && selected.has(target))) ? 'bypass' : ownRemembered ? 'auto' : own;
  };
  const shown = active ? 'bypass' : base;
  // cef1e6037 bn/yn: a kept pick settles once its session's turn is over or its mode left Bypass.
  const activeKey = JSON.stringify(Object.keys(activeSessions || {}).filter((id) => activeSessions[id]).sort());
  useEffect(() => {
    setKeptPicks((picks) => settleBypassPicks(picks, { active: activeSessions || {}, modeFor: (id) => id === sessionKey ? shown : forSession(id, null) }));
  }, [activeKey, sessionKey, shown, available]);
  return {
    permission: shown,
    available,
    remembered: available && remembered,
    kept: available && shown === 'bypass' && hasBypassPick(keptPicks, sessionKey),
    keptRow: BYPASS_KEPT_ROW,
    forSession,
    confirming: (pending?.mode === 'auto' ? mode === 'code' : available) && pending?.scope === scope,
    // composer-05: which dialog is up ('bypass' or 'auto'), for SourceBypassDialog's mode.
    confirmingMode: shownDialog.current,
    select(value) {
      if (value !== 'bypass' && sessionKey) setKeptPicks((picks) => dropBypassPick(picks, sessionKey));
      if (value === 'bypass') {
        if (!available || active) return;
        // xR: an acknowledged workspace takes Bypass without the dialog.
        if (bypassAcknowledged(folder)) applyBypass(scope); else setPending({ scope });
      }
      // cR `e === "auto"`: Auto asks once (vR), only when it changes the mode.
      else if (value === 'auto' && mode === 'code' && shown !== 'auto' && !autoConsented()) setPending({ scope, mode: 'auto' });
      else { clear(); setPending(null); onChange(value); }
    },
    confirm() {
      if (pending !== live.current.pending || pending?.scope !== live.current.scope || live.current.mode !== 'code') return;
      if (pending.mode === 'auto') { consentToAuto(); clear(); setPending(null); onChange('auto'); return; }
      if (!live.current.enabled) return;
      applyBypass(pending.scope);
    },
    cancel() { setPending(null); },
    // The plan card's 'Accept/Implement and bypass permissions' (approval-current.js Mk bypassPermissions): the
    // click on that explicitly labelled action is the confirmation, so it takes the current scope without the
    // dialog (main validated the opt-in and the core's requirements for that answer or turn). Other modes select.
    // The card's pick is how 'approval_card': it never becomes the folder's pick (gn).
    adopt(value) {
      if (value !== 'bypass') { clear(); setPending(null); onChange(value, 'approval_card'); return; }
      if (!live.current.enabled || live.current.mode !== 'code') return;
      setSelected(current => new Set(current).add(live.current.scope)); setPending(null);
      onChange('bypass', 'approval_card');
    },
    // A user core switch carried Bypass to this connection (main.cjs bypassCarry): the current scope takes it
    // without asking again; the caller checks it is the scope confirmed before the switch (bypass-carry.mjs
    // carryApplies). False when it can't apply here.
    carry() {
      if (!available || previousConnection.current !== connectionKey) return false;
      setSelected(current => new Set(current).add(scope)); setPending(null);
      return true;
    },
    // Called only after a successful thread/start, before changing the current id.
    adoptSession(id) {
      if (id) layers?.adoptSession(id);
      if (!active || !id || scope !== live.current.scope || !live.current.enabled || live.current.mode !== 'code') return;
      setSelected(current => { const next = new Set(current); next.delete(scope); next.add(JSON.stringify([connectionKey, id, null])); return next; });
    },
    clear,
  };
}
// shared-frame rp ConfirmationDialog layout (alert title, size sm, no close button) on the shared SourceDialog, with the
// body of 3.6556.2 c73f45bc3 Au (W14-code composer-05/06): the description, the workspace folder in c2d1aeb56 J's scroll
// clamp (labelled "Workspace folder" euTsu1GHzj, focusable only while it overflows), and the `mt-3 text-footnote
// text-muted-as-secondary` note — Bypass: "You won’t be asked again for this workspace. …" (faOd+43fuu; KX6RZT9VD4 without
// a folder), Auto: "You won’t be asked again. …" (Def34yNHlJ) — whose securityLink (ku, an external TextLink) opens the
// running core's guide (bypassGuide), else wr's page. Cancel takes the initial focus (initialFocus "cancel").
const WORKSPACE_CLASS = 'mt-3 max-h-24 overflow-y-auto font-mono-ui text-code text-primary break-all focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fill-accent focus-visible:-outline-offset-2 focus-visible:scroll-fade-hide-top focus-visible:scroll-fade-hide-bottom';
function WorkspaceFolder({ path }) {
  const node = useRef(null), [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => { const el = node.current; if (el) setOverflows(el.scrollHeight > el.clientHeight); }, [path]);
  return <div ref={node} dir="ltr" title={path} tabIndex={overflows ? 0 : undefined} role={overflows ? 'group' : undefined}
    aria-label={overflows ? t('Workspace folder') : undefined}
    className={`epitaxy-scroll-clamp scroll-fade-y focus-visible:outline-hidden focus-visible:shadow-focus ${WORKSPACE_CLASS}`}>{path}</div>;
}
function richNote(text, link) {
  const match = /<securityLink>(.*?)<\/securityLink>/.exec(text);
  if (!match) return text;
  return <>{text.slice(0, match.index)}{link(match[1])}{text.slice(match.index + match[0].length)}</>;
}
export function SourceBypassDialog({ cwd, guide = null, mode = 'bypass', onConfirm, onClose, open, onExited }) {
  const bypass = mode !== 'auto';
  const securityLink = (label) => <button key="link" type="button" data-cds="TextLink" className="source-bypass-link"
    onClick={() => void globalThis.desktop?.call?.("external", { url: guide?.url ?? SECURITY_GUIDE_URL })?.catch?.(() => {})}>{label}</button>;
  const note = bypass
    ? (cwd ? t("You won’t be asked again for this workspace. Read our <securityLink>security guide</securityLink> for details.")
      : t("Read our <securityLink>security guide</securityLink> for details."))
    : t("You won’t be asked again. Read our <securityLink>security guide</securityLink> for details.");
  return <ActionDialog open={open} onExited={onExited} alert size="sm" title={bypass ? t("Bypass all permissions?") : t("Enable auto mode?")}
    className="source-bypass-dialog epitaxy-root break-words" showClose={false} onClose={onClose}>
    <p>{bypass
      ? t("{name} will read, edit, and execute files without asking — including potentially destructive commands. Only use this in isolated or disposable environments.", { name: assistantName() })
      : t("{name} will decide which actions are safe to run without asking. Longer tasks run uninterrupted, with extra safeguards against prompt injection.", { name: assistantName() })}</p>
    {cwd && <WorkspaceFolder path={cwd} />}
    <p className="mt-3 text-footnote text-muted-as-secondary">{richNote(note, securityLink)}</p>
    <SourceDialogFooter><CdsButton data-autofocus onClick={onClose}>{t("Cancel")}</CdsButton><CdsButton variant="primary" onClick={onConfirm}>{bypass ? t("Bypass permissions") : t("Enable auto mode")}</CdsButton></SourceDialogFooter>
  </ActionDialog>;
}
