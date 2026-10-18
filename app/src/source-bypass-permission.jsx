import React, { useEffect, useRef, useState } from 'react';
import { ActionDialog } from './source-session-actions.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
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
    confirming: available && pending?.scope === scope,
    select(value) {
      if (value !== 'bypass' && sessionKey) setKeptPicks((picks) => dropBypassPick(picks, sessionKey));
      if (value === 'bypass') { if (available && !active) setPending({ scope }); }
      else { clear(); setPending(null); onChange(value); }
    },
    confirm() {
      if (pending !== live.current.pending || pending?.scope !== live.current.scope || !live.current.enabled || live.current.mode !== 'code') return;
      setSelected(current => new Set(current).add(pending.scope)); setPending(null);
      onChange('bypass');
      // cef1e6037 mn + c227f4d5e gn's catch: keep the pick and say when it turns on (addInfo bypassKeptToast).
      const now = live.current;
      if (keepsBypassPick({ value: 'bypass', previous: shown, sessionId: now.sessionKey, running: now.running, livePermissions: now.livePermissions, connected: now.connected })) {
        setKeptPicks((picks) => keepBypassPick(picks, now.sessionKey, shown));
        now.onKept?.(t(BYPASS_KEPT_TOAST));
      }
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
// shared-frame rp ConfirmationDialog layout (alert title, size sm, no close button) on the shared
// SourceDialog; the warning body, workspace and note are its own children, and Cancel takes the
// initial focus (initialFocus "cancel").
export function SourceBypassDialog({ cwd, guide = null, onConfirm, onClose, open, onExited }) {
  return <ActionDialog open={open} onExited={onExited} alert size="sm" title={t("Bypass all permissions?")} className="source-bypass-dialog" showClose={false} onClose={onClose}>
    <p>{t("{name} will read, edit, and execute files without asking — including potentially destructive commands. Only use this in isolated or disposable environments.", { name: assistantName() })}</p>
    {cwd && <div className="source-bypass-workspace">{cwd}</div>}
    {/* wr: p.mt-3.text-footnote.text-muted ending 'Read our <securityLink>security guide</securityLink> for details.'
        (a TextLink, external). OpenClaude Desktop keeps its own persistence sentence: Bypass is remembered as this
        session's pick and its folder's pick (composer-14), not as the default for every folder. */}
    <p className="source-bypass-note">{t("Stays on for new sessions in this folder until you change the mode. You can change it at any time.")}
      {guide && <>{" "}{t("Read {core}’s {link} for details.", { core: guide.name, link: "{link}" }).split(/\{link\}/).flatMap((piece, index) => index ? [<button key="link" type="button" data-cds="TextLink" className="source-bypass-link"
        onClick={() => void globalThis.desktop?.call?.("external", { url: guide.url })?.catch?.(() => {})}>{guide.label === "security guide" ? t("security guide") : t("documentation")}</button>, piece] : [piece])}</>}</p>
    <SourceDialogFooter><SourceSettingsButton data-autofocus onClick={onClose}>{t("Cancel")}</SourceSettingsButton><SourceSettingsButton variant="primary" onClick={onConfirm}>{t("Bypass permissions")}</SourceSettingsButton></SourceDialogFooter>
  </ActionDialog>;
}
