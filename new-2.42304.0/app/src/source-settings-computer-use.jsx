// Settings › This computer › System › Computer use. The official section (2.42304.0 c71860c77 `ii`, under the System
// group of /settings/desktop): the "Computer use" title with a neutral Beta badge, the section description, and the
// "Enable computer use" switch (config.agentComputerUse here; the official preference is chicagoEnabled). With it off,
// the computer-use tools leave every session's tool list (main.cjs agentToolGroupEnabled "computer-use").
//
// "Unhide apps when Claude finishes" (official chicagoAutoUnhide, Ess7TkMY61 / T7z5SKWO2K): the apps hidden before
// full-screen actions come back when the turn ends (config.computerUseAutoUnhide; unset reads as on).
//
// Two local rows the official section doesn't have (user's call, 2026-10-20):
//   Allowed apps  what sessions allowed right now ("Allow for this session" lasts until the app quits), each removable.
//                 Drawn exactly as the official Denied apps block (`Xr`): chips in flex flex-wrap gap-1.5, each with its
//                 name and a ghost xxs X button; the empty text in text-footnote text-secondary.
//   Teach mode    whether the guided walkthrough can run here (useComputerUseTeachStatus: the native module and the
//                 Accessibility / Screen Recording permissions, from computer-use:probe). No control: the official app has
//                 no teach entry in Settings at all — the agent offers a walkthrough (request_teach_access) when the user
//                 asks to be taught, and its card asks before it starts.
import React, { useCallback, useEffect, useState } from 'react';
import { t } from '../electron/i18n/index.mjs';
import { SourceSwitch as SettingSwitch } from './source-switch.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSegments } from './source-segments.jsx';

/** The apps every session has allowed right now (service.cjs allGrants) and a revoke that refreshes them. */
export function useComputerUseGrants(desktopCall, active) {
  const [apps, setApps] = useState(null);
  const load = useCallback(async () => {
    try {
      const answer = await desktopCall('computer-use:all-grants', {});
      setApps(answer?.ok && Array.isArray(answer.result?.apps) ? answer.result.apps : []);
    } catch { setApps([]); }
  }, [desktopCall]);
  useEffect(() => { if (active) void load(); }, [active, load]);
  const revoke = useCallback(async (bundleId) => {
    await desktopCall('computer-use:revoke', { bundleId });
    await load();
  }, [desktopCall, load]);
  return { apps, revoke, reload: load };
}

/**
 * Whether teach mode can run on this computer (computer-use:probe): "available", "permissions" (Accessibility or Screen
 * Recording is off) or "unavailable" (no native module); null while it is being read.
 */
export function useComputerUseTeachStatus(desktopCall, active) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!active) return undefined;
    let live = true;
    (async () => {
      let next = 'unavailable';
      try {
        const answer = await desktopCall('computer-use:probe', {});
        if (answer?.ok) next = answer.result?.axTrusted === true && answer.result?.screenCapture === true ? 'available' : 'permissions';
      } catch { next = 'unavailable'; }
      if (live) setStatus(next);
    })();
    return () => { live = false; };
  }, [desktopCall, active]);
  return status;
}

/** The teach row's text for a status (null — still reading — reads as available). */
export function computerUseTeachDescription(status) {
  if (status === 'permissions') return t('DeepSeek can guide you step by step through the apps you allow once this app has Accessibility and Screen Recording permission (System Settings › Privacy & Security).');
  if (status === 'unavailable') return t('Teach mode can’t run on this computer: computer use’s native part isn’t available.');
  return t('DeepSeek can guide you step by step through the apps you allow: ask it to teach you or show you how. A card asks before the walkthrough starts, and you can exit anytime.');
}

/** The preferred mode (background / full_control) and a setter that persists it (main.cjs computer-use:*-preferred-mode). */
export function useComputerUsePreferredMode(desktopCall, active) {
  const [mode, setModeState] = useState('background');
  const load = useCallback(async () => {
    try {
      const answer = await desktopCall('computer-use:preferred-mode', {});
      if (answer?.ok && (answer.result?.mode === 'background' || answer.result?.mode === 'full_control')) setModeState(answer.result.mode);
    } catch { /* leave the default */ }
  }, [desktopCall]);
  useEffect(() => { if (active) void load(); }, [active, load]);
  const setMode = useCallback(async (next) => {
    setModeState(next);
    try { await desktopCall('computer-use:set-preferred-mode', { mode: next }); } catch { await load(); }
  }, [desktopCall, load]);
  return { mode, setMode };
}

/**
 * The preferred-mode control (official c71860c77 `ii`): the segmented control Background / Full control in the row's
 * control slot, labelled by the row ("How Claude uses the apps you allow").
 */
export function ComputerUsePreferredMode({ mode, onChange, disabled }) {
  return <SourceSegments label={t('How Claude uses the apps you allow')} value={mode} disabled={disabled}
    options={[{ value: 'background', label: t('Background') }, { value: 'full_control', label: t('Full control') }]}
    onChange={onChange}/>;
}

/** The official Denied apps chips (`Xr`), for the allowed ones. */
export function ComputerUseAllowedApps({ apps, onRemove, busy }) {
  if (!apps?.length) {
    return <p className="text-footnote text-secondary">{t('No apps allowed right now. DeepSeek asks before it uses an app, and what you allow lasts until the app quits.')}</p>;
  }
  return <div className="flex flex-wrap gap-1.5" data-computer-use-allowed="">
    {apps.map((app) => {
      const name = app.displayName || app.bundleId;
      return <div key={app.bundleId} className="bg-surface-0 border-border-300 flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm" title={app.bundleId}>
        <span className="text-primary">{name}</span>
        <SourceSettingsButton variant="ghost" size="xxs" iconOnly icon="X" iconSize="auto-sm" flush="end" disabled={busy}
          aria-label={t('Remove {app} from allowed apps', { app: name })} onClick={() => onRemove(app.bundleId)}/>
      </div>;
    })}
  </div>;
}

/**
 * The group for source-settings.jsx `groups`: {tab, title, badge, description, rows}.
 * row(id, label, description, control) and the rest are source-settings.jsx's own helpers.
 */
export function computerUseSettingsGroup({ row, shownValue, config, save, grants, revoke, busy, preferredMode, onPreferredMode, teachStatus = null }) {
  const enabled = shownValue('agentComputerUse', config.agentComputerUse) !== false;
  return {
    tab: 'general', title: 'Computer use', badge: t('Beta'),
    description: t('Not available in cloud Code sessions, which don’t run on this computer.'),
    rows: [
      row('agentComputerUse', t('Enable computer use'), t('Let DeepSeek see and act in the apps you allow, working in the background.'),
        <SettingSwitch label={t('Enable computer use')} checked={enabled} onChange={(value) => save('agentComputerUse', value)}/>),
      ...(enabled ? [
        row('computerUseAutoUnhide', t('Unhide apps when Claude finishes'),
          t('When Claude has full control of your screen, apps hidden during a task are restored when Claude stops.'),
          <SettingSwitch label={t('Unhide apps when Claude finishes')} checked={shownValue('computerUseAutoUnhide', config.computerUseAutoUnhide) !== false}
            onChange={(value) => save('computerUseAutoUnhide', value)}/>),
        row('computer-use-preferred-mode', t('How Claude uses the apps you allow'),
          // Official c71860c77 `ii` (hlErDsqOX5): the whole sentence, both modes.
          t('Background: Claude works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: Claude takes control of your screen, mouse, and keyboard by default whenever Claude uses an app you allow, without asking again.'),
          <ComputerUsePreferredMode mode={preferredMode} disabled={busy} onChange={onPreferredMode}/>),
        { ...row('computer-use-allowed-apps', t('Allowed apps'), t('Apps a session allowed. Removing one takes it away from every session; DeepSeek has to ask again before it uses it.'), null),
          below: <ComputerUseAllowedApps apps={grants} busy={busy} onRemove={revoke}/> },
        row('computer-use-teach', t('Teach mode'), computerUseTeachDescription(teachStatus), null),
      ] : []),
    ],
  };
}
