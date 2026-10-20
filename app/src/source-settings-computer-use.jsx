// Settings › This computer › System › Computer use. The official section (2.42304.0 c71860c77 `ii`, under the System
// group of /settings/desktop): the "Computer use" title with a neutral Beta badge, the section description, and the
// "Enable computer use" switch (config.agentComputerUse here; the official preference is chicagoEnabled). With it off,
// the computer-use tools leave every session's tool list (main.cjs agentToolGroupEnabled "computer-use").
//
// Two local rows the official section doesn't have (user's call, 2026-10-20):
//   Allowed apps  what sessions allowed right now ("Allow for this session" lasts until the app quits), each removable.
//                 Drawn exactly as the official Denied apps block (`Xr`): chips in flex flex-wrap gap-1.5, each with its
//                 name and a ghost xxs X button; the empty text in text-footnote text-secondary.
//   Teach mode    an entry and its empty state only: the official app has only teach mode's access card; the walkthrough
//                 itself waits for M4.
import React, { useCallback, useEffect, useState } from 'react';
import { t } from '../electron/i18n/index.mjs';
import { SourceSwitch as SettingSwitch } from './source-switch.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';

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
export function computerUseSettingsGroup({ row, shownValue, config, save, grants, revoke, busy }) {
  const enabled = shownValue('agentComputerUse', config.agentComputerUse) !== false;
  return {
    tab: 'general', title: 'Computer use', badge: t('Beta'),
    description: t('Not available in cloud Code sessions, which don’t run on this computer.'),
    rows: [
      row('agentComputerUse', t('Enable computer use'), t('Let DeepSeek see and act in the apps you allow, working in the background.'),
        <SettingSwitch label={t('Enable computer use')} checked={enabled} onChange={(value) => save('agentComputerUse', value)}/>),
      ...(enabled ? [
        { ...row('computer-use-allowed-apps', t('Allowed apps'), t('Apps a session allowed. Removing one takes it away from every session; DeepSeek has to ask again before it uses it.'), null),
          below: <ComputerUseAllowedApps apps={grants} busy={busy} onRemove={revoke}/> },
        row('computer-use-teach', t('Teach mode'), t('DeepSeek can guide you step by step through the apps you allow. Not available in this build yet.'), null),
      ] : []),
    ],
  };
}
