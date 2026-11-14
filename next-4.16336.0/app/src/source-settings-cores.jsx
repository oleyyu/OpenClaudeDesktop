import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SettingsGroup, settingRow } from './source-settings-kit.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { cleanErrorReason } from './action-error-model.mjs';
import { coreById, coreForEngine, coreName, registerCores } from '../electron/core-registry.mjs';
import { getAssistantName } from '../electron/i18n/index.mjs';
import { useExtensionImport, SourceExtensionDropZone } from './source-extension-import.jsx';
import { SourceBrandLogo } from './source-brand-logo.jsx';
import { t, tn } from '../electron/i18n/index.mjs';
import './source-profile-setting.css';
import './commands-settings.css';
import './cores-settings.css';

// Settings › Cores: OpenClaude Desktop is the frame, a core is the agent behind it (core-registry.mjs). Official
// open-source cores are downloaded on demand into the app's data folder, or used where the user installed them
// (core-manager.cjs); choosing one restarts the connection.

const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
const mb = bytes => `${Math.max(1, Math.round(bytes / 1048576))} MB`;
const tail = file => String(file || '').replace(/^\/Users\/[^/]+/, '~');

function useNestedDialogMark() {
  useEffect(() => {
    const parent = document.querySelector('.ss-settings-dialog');
    parent?.setAttribute('data-nested-dialog-open', '');
    return () => parent?.removeAttribute('data-nested-dialog-open');
  }, []);
}

// restart: the core runs now, so it restarts on the new copy (and stops a live turn when busy).
function InstallDialog({ core, restart, busy, onCancel, onConfirm }) {
  const confirm = useRef(null);
  useNestedDialogMark();
  const source = core.release?.url ? new URL(core.release.url) : null;
  const update = !!core.appInstall && core.updateAvailable === true;
  const description = [
    t('{size} from {host}. It is checked against the release checksum and kept in the app’s data folder; your own installs aren’t touched.', { size: mb(core.release.size), host: source ? `${source.host}${source.pathname.split('/').slice(0, 3).join('/')}` : '' }),
    restart ? t('{core} restarts on the new version once it is installed.', { core: core.name }) : null,
    restart && busy ? t('A response is running or waiting for your approval; restarting stops it.') : null,
  ].filter(Boolean).join(' ');
  return <SourceDialog open size="sm" layer={SETTINGS_LAYER} title={update ? t('Update {name} to {version}?', { name: core.name, version: core.release.version }) : t('Download {name} {version}?', { name: core.name, version: core.release.version })} initialFocusRef={confirm}
    description={description} onClose={onCancel}>
    <SourceDialogFooter>
      <SourceSettingsButton onClick={onCancel}>{t('Cancel')}</SourceSettingsButton>
      <SourceSettingsButton ref={confirm} variant="primary" onClick={onConfirm}>{update ? t('Update') : t('Download')}</SourceSettingsButton>
    </SourceDialogFooter>
  </SourceDialog>;
}

// A confirmation before an action that stops the running core: switching away while a turn or approval is live,
// or removing the running core's download or pack (it stops, and the app reconnects onto what is chosen next).
function ConfirmDialog({ title, description, action, danger, onCancel, onConfirm }) {
  const cancel = useRef(null);
  useNestedDialogMark();
  return <SourceDialog open size="sm" layer={SETTINGS_LAYER} title={title} description={description} initialFocusRef={cancel} onClose={onCancel}>
    <SourceDialogFooter>
      <SourceSettingsButton ref={cancel} onClick={onCancel}>{t('Cancel')}</SourceSettingsButton>
      <SourceSettingsButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{action}</SourceSettingsButton>
    </SourceDialogFooter>
  </SourceDialog>;
}

function statusText(core) {
  if (core.download) {
    const { phase, received, total } = core.download;
    if (phase === 'download') return total ? t('Downloading… {done} of {total}', { done: mb(received || 0), total: mb(total) }) : t('Downloading…');
    return phase === 'verify' ? t('Checking the download…') : t('Installing…');
  }
  if (!core.installed) return core.kind === 'builtin' ? t('Not found') : core.missingBridge ? t('Adapter missing') : t('Not installed');
  if (core.source === 'built-in') return t('Built in');
  const where = core.source === 'app' ? t('Downloaded by OpenClaude Desktop') : t('Your install');
  // updateAvailable (core-manager list()): the app's copy is older than the release this build pins.
  const update = core.appInstall && core.updateAvailable === true && core.release?.version ? t('Update available: {version}', { version: core.release.version }) : null;
  // Your own install of another version than the release this build pins (core-manager systemVsRelease): requests that
  // changed between versions may fail, so say which version OpenClaude Desktop is tested with.
  const tested = core.source === 'system' && core.release?.version && (core.systemVsRelease === 1 || core.systemVsRelease === -1)
    ? t('OpenClaude Desktop is tested with {version}', { version: core.release.version }) : null;
  return [where, core.version, core.source === 'app' && core.appInstall ? mb(core.appInstall.size) : null, update, tested].filter(Boolean).join(' · ');
}

/**
 * The Download button's label next to a core that is installed (your own copy) or not, or null when the pinned
 * release is the version you already have (core-manager systemVsRelease 0: nothing to download).
 */
export function downloadLabel(core) {
  if (!core.installed) return t('Install');
  if (core.systemVsRelease === 0) return null;
  if (core.systemVsRelease === 1) return t('Download {version} (newer)', { version: core.release.version });
  if (core.systemVsRelease === -1) return t('Use the tested version ({version})', { version: core.release.version });
  return t('Download {version}', { version: core.release.version });
}

// coreBusy: a turn runs or an approval waits in any session (source-settings.jsx falls back to the open session's busy).
export function SourceCoresSettings({ boot, busy = false, coreBusy = busy, desktopCall, onReconnect, onSwitchCore }) {
  const [state, setState] = useState(null), [rowErrors, setRowErrors] = useState({}), [pending, setPending] = useState(''), [asking, setAsking] = useState(null);
  // confirming: {title, description, action, danger, run} for ConfirmDialog; packRestart: an imported pack replaced
  // the running core's files while it was busy, so it restarts when the user says so.
  const [confirming, setConfirming] = useState(null), [packRestart, setPackRestart] = useState(null);
  const running = coreForEngine(boot?.connected ? boot?.core?.engine : undefined).id;
  const runningNow = id => !!boot?.connected && running === id;
  const call = useCallback((op, extra = {}) => Promise.resolve(desktopCall('cores', { op, ...extra })), [desktopCall]);
  const refresh = useCallback(() => call('list').then(setState, failure => setRowErrors(current => ({ ...current, cores: cleanErrorReason(failure?.message || String(failure)) }))), [call]);
  useEffect(() => { void refresh(); }, [refresh]);
  // Extension Packs (extension-packs.cjs): installed packs, and importing more.
  // bundled: the packs this app ships (Codex) not added yet, each added through the same confirmation as an import.
  const [packs, setPacks] = useState([]), [bundled, setBundled] = useState([]);
  const refreshPacks = useCallback(() => Promise.resolve(desktopCall('extensions', { op: 'list' })).then(result => { setPacks(result.packs); setBundled(result.bundled ?? []); registerCores(result.cores); }, () => {}), [desktopCall]);
  useEffect(() => { void refreshPacks(); }, [refreshPacks]);
  // A newer pack for the running core replaced the files its bridge runs from: restart it on them (at once when
  // nothing is live, else from the row below, so a running turn isn't cut off).
  const importer = useExtensionImport({ desktopCall, onInstalled: (id, cores) => {
    registerCores(cores); void refreshPacks(); void refresh();
    if (!runningNow(id)) return;
    if (coreBusy) setPackRestart(id);
    else void restartRunning(id);
  } });
  // Poll while a download runs: list() carries its progress.
  const downloading = !!state?.cores?.some(core => core.download);
  useEffect(() => {
    if (!downloading) return undefined;
    const timer = setInterval(() => { void refresh(); }, 400);
    return () => clearInterval(timer);
  }, [downloading, refresh]);
  const act = async (id, run) => {
    setPending(id); setRowErrors(current => ({ ...current, [id]: undefined }));
    try { const next = await run(); if (next?.cores) setState(next); }
    catch (failure) { setRowErrors(current => ({ ...current, [id]: cleanErrorReason(failure?.message || String(failure)) })); }
    finally { setPending(''); void refresh(); }
  };
  const install = core => {
    setAsking(null);
    const id = `core-${core.id}`, restart = runningNow(core.id);
    setRowErrors(current => ({ ...current, [id]: undefined }));
    // The install call resolves when the download ends; progress comes from polling meanwhile.
    const done = call('install', { id: core.id });
    setTimeout(() => { void refresh(); }, 50);
    // An update of the running core swapped its files: it restarts on the new version.
    done.then(next => { if (next?.cores) setState(next); if (restart) return onReconnect?.(); }, failure => setRowErrors(current => ({ ...current, [id]: cleanErrorReason(failure?.message || String(failure)) }))).finally(() => { void refresh(); });
  };
  // The copy names the running core's assistant ("Message Codex"); like a language change, a new name reloads the window.
  const reloadForAssistant = (next) => { const id = next?.selected; const name = coreById(id)?.assistant || 'DeepSeek'; if (name !== getAssistantName()) setTimeout(() => location.reload(), 150); };
  // The app's switchCore (main.jsx) selects, reconnects (carrying an active Bypass) and reloads for a new assistant name.
  const switchTo = async id => {
    if (onSwitchCore) return (await onSwitchCore(id))?.next;
    const next = await call('select', { id }); await onReconnect?.(); reloadForAssistant(next); return next;
  };
  // After the running core's files went (Remove download, pack Remove, a newer pack): reconnect onto the core chosen
  // now — the same core from another copy, or the fallback core-manager / extension-packs picked.
  const restartRunning = async (id, next) => {
    setPackRestart(null);
    const selected = next?.selected ?? (await call('list'))?.selected ?? id;
    if (selected !== id) return switchTo(selected);
    await onReconnect?.(); reloadForAssistant({ selected });
    return next;
  };
  const busyNote = () => coreBusy ? ` ${t('A response is running or waiting for your approval; it stops.')}` : '';
  // Switching stops the running core; with a live turn or approval that is asked first.
  const use = core => {
    const go = () => act(`core-${core.id}`, () => switchTo(core.id));
    if (!coreBusy || !boot?.connected) return go();
    const from = coreForEngine(boot?.core?.engine).name;
    setConfirming({ title: t('Switch to {core}?', { core: core.name }), action: t('Switch'),
      description: t('A response is running or waiting for your approval. Switching stops {from} and ends it.', { from }), run: go });
  };
  const fallbackName = coreById('deepseek')?.name ?? '';
  // Remove download: the running core is stopped and the app reconnects (onto your own install, or the fallback).
  const removeDownload = core => {
    const id = `core-${core.id}`;
    const go = () => act(id, async () => {
      const wasRunning = runningNow(core.id);
      const next = await call('uninstall', { id: core.id });
      if (wasRunning) { await restartRunning(core.id, next); return next; }
      reloadForAssistant(next); return next;
    });
    if (!runningNow(core.id)) return go();
    setConfirming({ title: t('Remove the {core} download?', { core: core.name }), action: t('Remove download'), danger: true,
      description: (core.systemInstall ? t('{core} is running. It stops and restarts from your own install at {path}.', { core: core.name, path: tail(core.systemInstall) })
        : t('{core} is running. It stops, and OpenClaude Desktop switches to {fallback}.', { core: core.name, fallback: fallbackName })) + busyNote(), run: go });
  };
  // Pack Remove: the running core's bridge goes with it, so it stops and the app switches to the core chosen next.
  const removePack = pack => {
    const go = () => act(`pack-${pack.id}`, async () => {
      const wasRunning = runningNow(pack.id);
      const result = await desktopCall('extensions', { op: 'remove', id: pack.id }); registerCores(result.cores); await refreshPacks();
      const next = await call('list');
      if (wasRunning) await restartRunning(pack.id, next);
      else reloadForAssistant(next);
      return next;
    });
    if (!runningNow(pack.id)) return go();
    setConfirming({ title: t('Remove the {core} pack?', { core: pack.name }), action: t('Remove'), danger: true,
      description: t('{core} is running from this pack. It stops, and OpenClaude Desktop switches to the core chosen next.', { core: pack.name }) + busyNote(), run: go });
  };

  // The running core's own import of an older install (capabilities.legacyMigration: Kimi Code's `kimi migrate`, which
  // its terminal offers on first launch and ACP never does): settings only, or settings and the old conversations.
  const migrates = !!boot?.connected && boot?.core?.capabilities?.legacyMigration === true;
  const [migration, setMigration] = useState(null), [migrated, setMigrated] = useState(null);
  useEffect(() => {
    if (!migrates) { setMigration(null); return undefined; }
    let live = true;
    Promise.resolve(desktopCall('rpc', { method: 'codeDesktop/migration/read', params: {} })).then(result => { if (live) setMigration(result?.migration ?? null); }, () => { if (live) setMigration(null); });
    return () => { live = false; };
  }, [migrates, desktopCall, migrated]);
  const migrate = configOnly => act('core-migration', async () => {
    const result = await desktopCall('rpc', { method: 'codeDesktop/migration/run', params: { configOnly } });
    setMigrated(result?.complete === false ? 'incomplete' : 'done');
    await onReconnect?.();
  });
  const coreLabel = coreName(boot?.core);
  const migrationRow = migrates && (migration || migrated) ? [settingRow('core-migration', t('Bring over your kimi-cli setup'),
    migrated ? (migrated === 'done' ? t('Done. {core} now has your kimi-cli settings.', { core: coreLabel }) : t('{core} brought over what it could. Some items were skipped; its migration-report.json in {core}’s folder lists them.', { core: coreLabel }))
      : migration.sessions > 0 ? tn(migration.sessions, '{core} found the settings, connectors and {count} conversation of the older kimi-cli on this Mac.', '{core} found the settings, connectors and {count} conversations of the older kimi-cli on this Mac.', { core: coreLabel })
        : t('{core} found the settings and connectors of the older kimi-cli on this Mac.', { core: coreLabel }),
    migrated ? null : <div className="ccmd-actions">
      <SourceSettingsButton size="sm" variant="ghost" busy={pending === 'core-migration'} disabled={!!pending} data-core-migrate="config" onClick={() => migrate(true)}>{t('Settings only')}</SourceSettingsButton>
      {migration.sessions > 0 && <SourceSettingsButton size="sm" variant="primary" busy={pending === 'core-migration'} disabled={!!pending} data-core-migrate="all" onClick={() => migrate(false)}>{tn(migration.sessions, 'Settings + {count} conversation', 'Settings + {count} conversations', { count: migration.sessions })}</SourceSettingsButton>}
    </div>)] : [];
  const rows = (state?.cores ?? []).map(core => {
    const id = `core-${core.id}`, isRunning = running === core.id && boot?.connected;
    return settingRow(id, <span className="cores-title"><SourceBrandLogo brand={core.brand} size={28} className="cores-logo" />{core.name}<span className="cores-vendor">{core.vendor}</span>
      {core.selected && <span className="ccmd-badge">{isRunning ? t('Running') : t('Selected')}</span>}</span>,
      <span className="cores-desc"><span>{t(core.models)}</span><span className="cores-status" data-core-status={core.id}>{statusText(core)}</span>
        {core.download?.phase === 'download' && core.download.total ? <span className="cores-progress" role="progressbar" aria-label={t('Download progress')} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(100 * (core.download.received || 0) / core.download.total)}><span style={{ width: `${Math.min(100, 100 * (core.download.received || 0) / core.download.total)}%` }} /></span> : null}
        {core.path && !core.download && <span className="ccmd-path" title={core.path}>{tail(core.path)}</span>}</span>,
      <div className="ccmd-actions">
        {core.download ? <SourceSettingsButton size="sm" variant="ghost" onClick={() => call('cancel', { id: core.id })}>{t('Cancel')}</SourceSettingsButton> : <>
          {core.kind !== 'builtin' && !core.appInstall && core.release && downloadLabel(core) && <SourceSettingsButton size="sm" variant={core.installed ? 'ghost' : 'secondary'} icon="Download" disabled={!!pending} data-core-install={core.id}
            onClick={() => setAsking(core)}>{downloadLabel(core)}</SourceSettingsButton>}
          {core.appInstall && core.updateAvailable === true && core.release && <SourceSettingsButton size="sm" variant="secondary" icon="Download" disabled={!!pending} data-core-update={core.id}
            onClick={() => setAsking(core)}>{t('Update')}</SourceSettingsButton>}
          {core.appInstall && <SourceSettingsButton size="sm" variant="ghost" disabled={!!pending} data-core-remove={core.id} onClick={() => removeDownload(core)}>{t('Remove download')}</SourceSettingsButton>}
          {core.installed && !core.selected && <SourceSettingsButton size="sm" variant="primary" busy={pending === id} disabled={!!pending} data-core-use={core.id} onClick={() => use(core)}>{t('Use')}</SourceSettingsButton>}
          {core.selected && !isRunning && core.installed && onReconnect && <SourceSettingsButton size="sm" busy={pending === id} disabled={!!pending} onClick={() => act(id, () => onReconnect())}>{t('Start')}</SourceSettingsButton>}
        </>}
      </div>);
  });

  return <div className="ccmd-page cores-page">
    <SettingsGroup title={t('Cores')} rowErrors={rowErrors} rows={[
      settingRow('cores-intro', t('Agent cores'), t('OpenClaude Desktop is the frame; the core is the agent that runs your sessions. Download only the cores you use. Your instructions, tools and permission modes apply to whichever core is running.'), null),
      ...(state ? rows : [settingRow('cores-loading', t('Loading…'), '', null)]),
      ...migrationRow,
    ]}/>
    <SettingsGroup title={t('Extension packs')} rowErrors={rowErrors} rows={[
      ...packs.map(pack => settingRow(`pack-${pack.id}`, <span className="cores-title"><SourceBrandLogo brand={coreForEngine(pack.id).brand} size={28} className="cores-logo" />{pack.name}<span className="cores-vendor">{pack.vendor}</span><span className="ccmd-badge">{pack.version}</span></span>,
        <span className="cores-desc"><span>{pack.description || pack.models}</span><span className="ccmd-path" title={pack.dir}>{tail(pack.dir)}</span></span>,
        <div className="ccmd-actions"><SourceSettingsButton size="sm" variant="ghost" disabled={!!pending} data-pack-remove={pack.id}
          onClick={() => removePack(pack)}>{t('Remove')}</SourceSettingsButton></div>)),
      ...bundled.map(offer => settingRow(`bundled-${offer.id}`, <span className="cores-title"><SourceBrandLogo brand={offer.brand} size={28} className="cores-logo" />{offer.name}<span className="cores-vendor">{offer.vendor}</span><span className="ccmd-badge">{t('Included')}</span></span>,
        <span className="cores-desc"><span>{t(offer.models)}</span></span>,
        <div className="ccmd-actions"><SourceSettingsButton size="sm" variant="secondary" disabled={!!pending} data-bundled-add={offer.id}
          onClick={() => importer.inspectPath(offer.path)}>{t('Add')}</SourceSettingsButton></div>)),
      ...(packRestart ? [settingRow('pack-restart', t('Restart {core} to use the new pack', { core: coreById(packRestart)?.name ?? packRestart }),
        t('A response is running or waiting for your approval; restarting stops it.'),
        <div className="ccmd-actions"><SourceSettingsButton size="sm" variant="primary" busy={pending === 'pack-restart'} disabled={!!pending}
          onClick={() => act('pack-restart', () => restartRunning(packRestart))}>{t('Restart core')}</SourceSettingsButton></div>)] : []),
      settingRow('pack-import', packs.length || bundled.length ? t('Add another agent') : t('No extension packs yet'), <SourceExtensionDropZone importer={importer} compact />, null),
    ]}/>
    {importer.dialog}
    {state?.dataDir && <p className="cores-note">{t('Downloaded cores are kept in {dir}.', { dir: tail(state.dataDir) })}</p>}
    {asking && <InstallDialog core={asking} restart={runningNow(asking.id)} busy={coreBusy} onCancel={() => setAsking(null)} onConfirm={() => install(asking)}/>}
    {confirming && <ConfirmDialog title={confirming.title} description={confirming.description} action={confirming.action} danger={confirming.danger}
      onCancel={() => setConfirming(null)} onConfirm={() => { const run = confirming.run; setConfirming(null); void run(); }}/>}
  </div>;
}
