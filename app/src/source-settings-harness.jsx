// Settings › Harness (C6): the DeepSeek core's profile — bundles and their
// plugins, MCP servers, skill folders and hooks — edited through an
// app-managed overlay (<userData>/harness/overlay.patch.yml) plus the power
// user's own user.patch.yml. main: electron/harness-profile.cjs ("harness-profile"
// desktop:call); bridge: harness codex-app-server src/profile.js.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SettingsGroup, settingRow } from './source-settings-kit.jsx';
import { SourceSwitch } from './source-switch.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSelect } from './source-select.jsx';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { normalizeHarnessProfile, toggleSafe, parseEnvLines, parseHeaderLines, splitArgs } from '../electron/prefs/harness-profile.mjs';
import { harnessView } from './harness-settings-model.mjs';
import { t, tn } from '../electron/i18n/index.mjs';
import './harness-settings.css';
import { coreSupports } from '../electron/core-registry.mjs';

const TRANSPORTS = [{ value: 'stdio', label: t('Local command (stdio)') }, { value: 'streamable-http', label: t('Remote URL (HTTP)') }];

export function AddServerDialog({ onClose, onAdd }) {
  const [draft, setDraft] = useState({ serverName: '', transport: 'stdio', command: '', args: '', env: '', url: '', headers: '', cwd: '', timeout: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = key => event => setDraft(current => ({ ...current, [key]: event.target.value }));
  const submit = async event => {
    event.preventDefault();
    setError('');
    let params;
    try {
      const seconds = draft.timeout.trim() ? Number(draft.timeout.trim()) : null;
      if (seconds !== null && !(Number.isFinite(seconds) && seconds > 0)) throw new Error(t('Enter a tool timeout between 1 and 3600 seconds.'));
      const timeout = seconds === null ? {} : { toolCallTimeoutMs: Math.round(seconds * 1000) };
      params = draft.transport === 'stdio'
        ? { serverName: draft.serverName.trim(), transport: 'stdio', command: draft.command.trim(), args: splitArgs(draft.args), env: parseEnvLines(draft.env), ...(draft.cwd.trim() ? { cwd: draft.cwd.trim() } : {}), ...timeout }
        : { serverName: draft.serverName.trim(), transport: 'streamable-http', url: draft.url.trim(), headers: parseHeaderLines(draft.headers), ...timeout };
    } catch (failure) { setError(failure.message); return; }
    setBusy(true);
    try { await onAdd(params); onClose(); } catch (failure) { setError(failure.message); setBusy(false); }
  };
  const ready = draft.serverName.trim() && (draft.transport === 'stdio' ? draft.command.trim() : draft.url.trim());
  return <SourceDialog title={t('Add server')} description={t('The server starts with the core. Restart the core to connect it.')} onClose={busy ? undefined : onClose} className="hs-dialog">
    <form className="hs-form" onSubmit={submit}>
      <label className="hs-field"><span>{t('Name')}</span>
        <input data-autofocus data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Server name')} placeholder="github" maxLength={32} value={draft.serverName} onChange={set('serverName')} disabled={busy}/></label>
      <div className="hs-field"><span>{t('Type')}</span>
        <SourceSelect label={t('Server type')} value={draft.transport} items={TRANSPORTS} disabled={busy} onChange={value => setDraft(current => ({ ...current, transport: value }))}/></div>
      {draft.transport === 'stdio' ? <>
        <label className="hs-field"><span>{t('Command')}</span>
          <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Command')} placeholder="npx" value={draft.command} onChange={set('command')} disabled={busy}/></label>
        <label className="hs-field"><span>{t('Arguments')}</span>
          <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Arguments')} placeholder="-y @modelcontextprotocol/server-github" value={draft.args} onChange={set('args')} disabled={busy}/></label>
        <label className="hs-field"><span>{t('Environment')}</span>
          <textarea data-cds="TextArea" className="hs-textarea" aria-label={t('Environment variables')} rows={3} placeholder="GITHUB_TOKEN=…" value={draft.env} onChange={set('env')} disabled={busy}/>
          <small>{t('One NAME=value per line. Values are stored in the app overlay file on this Mac.')}</small></label>
        <label className="hs-field"><span>{t('Working folder')}</span>
          <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Working folder')} placeholder={t('Optional, a full path')} value={draft.cwd} onChange={set('cwd')} disabled={busy}/></label>
      </> : <>
        <label className="hs-field"><span>URL</span>
          <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Server URL')} placeholder="https://example.com/mcp" value={draft.url} onChange={set('url')} disabled={busy}/></label>
        <label className="hs-field"><span>{t('Headers')}</span>
          <textarea data-cds="TextArea" className="hs-textarea" aria-label={t('HTTP headers')} rows={2} placeholder="Authorization: Bearer …" value={draft.headers} onChange={set('headers')} disabled={busy}/>
          <small>{t('One Name: value per line, for servers that need a token. Stored in the app overlay file on this Mac.')}</small></label>
      </>}
      <label className="hs-field"><span>{t('Tool timeout')}</span>
        <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Tool timeout in seconds')} inputMode="numeric" placeholder={t('Optional, in seconds')} value={draft.timeout} onChange={set('timeout')} disabled={busy}/></label>
      {error && <p className="ss-error" role="alert">{error}</p>}
      <SourceDialogFooter><SourceSettingsButton onClick={onClose} disabled={busy}>{t('Cancel')}</SourceSettingsButton>
        <SourceSettingsButton type="submit" variant="primary" busy={busy} disabled={!ready}>{t('Add server')}</SourceSettingsButton></SourceDialogFooter>
    </form>
  </SourceDialog>;
}

const required = <span className="hs-required">{t('Required')}</span>;
// Rows Settings › Code › Privacy controls (code-desktop-app cordis.patch.yml): never 'Required', they say where.
const PRIVACY_ROWS = new Set(['session-log-deepseek', 'plugin-package-inventory-deepseek', 'session-telemetry-otel']);
const privacy = <span className="hs-required">{t('Set in Code › Privacy')}</span>;
// This group is the Harness profile, not Preferences › Profile: its own key, English copy unchanged.
const PROFILE_TITLE = t('Harness profile') === 'Harness profile' ? 'Profile' : t('Harness profile');

// initialState: a profile read to paint before the first load (server-render tests).
export function SourceHarnessSettings({ config, boot, engine, busy, desktopCall, onSave, onReconnect, initialState = null }) {
  const [state, setState] = useState(initialState), [loadError, setLoadError] = useState('');
  const [rowErrors, setRowErrors] = useState({}), [working, setWorking] = useState(null);
  const [expanded, setExpanded] = useState({}), [adding, setAdding] = useState(false);
  // A restart this page started that left the core down (cleared once it connects).
  const [restartFailed, setRestartFailed] = useState(false);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);
  const prefs = normalizeHarnessProfile(config?.harnessProfile);
  const call = useCallback(params => Promise.resolve(desktopCall('harness-profile', params)), [desktopCall]);
  const load = useCallback(async () => {
    try { const next = await call({ op: 'read' }); if (live.current) { setState(next); setLoadError(''); } }
    catch (error) { if (live.current) setLoadError(error.message); }
  }, [call]);
  const connected = boot?.connected === true;
  // A core that failed to start reports no engine (coreEngine → 'codex'), so
  // while disconnected the page asks main which core is configured.
  const profileCore = coreSupports(boot?.core ?? engine, 'harnessProfile');
  useEffect(() => { if (profileCore || !connected) void load(); }, [profileCore, connected, load]);
  useEffect(() => { if (connected) setRestartFailed(false); }, [connected]);
  const harness = profileCore || (!connected && coreSupports(state?.configuredEngine, 'harnessProfile'));

  const act = async (id, run) => {
    setWorking(id);
    setRowErrors(current => { const next = { ...current }; delete next[id]; return next; });
    try {
      const next = await run();
      if (live.current && next && 'overlay' in next) setState(next);
      return next;
    } catch (error) {
      if (live.current) setRowErrors(current => ({ ...current, [id]: error.message }));
      return undefined;
    } finally { if (live.current) setWorking(null); }
  };
  const op = (id, params) => act(id, () => call(params));
  // Restart the core, then read; a core still down afterwards marks restartFailed.
  const restartAndRead = async () => {
    try { await onReconnect?.(); } catch (error) { if (live.current) setRestartFailed(true); throw error; }
    const next = await call({ op: 'read' });
    if (live.current) setRestartFailed(next?.connected === false);
    return next;
  };
  const restart = (id = 'harness-restart') => act(id, restartAndRead);

  if (!harness && !connected && !state && !loadError) return <p className="ss-connection-notice hs-notice" role="status">{t('Loading the Harness profile…')}</p>;
  if (!harness) return <p className="ss-connection-notice hs-notice" role="status">{t('Harness plugins, hooks and profile overlays apply with DeepSeek Harness.')}</p>;
  if (loadError && !state) return <p className="ss-connection-notice hs-notice" role="alert">{t('Couldn’t read the Harness profile.')} {loadError}</p>;
  if (!state) return <p className="ss-connection-notice hs-notice" role="status">{t('Loading the Harness profile…')}</p>;
  if (state.unsupported) return <p className="ss-connection-notice hs-notice" role="status">{t('This core doesn’t report its Harness profile. Update DeepSeek Harness to manage plugins here.')}</p>;

  const view = harnessView(state);
  const disabled = busy || working !== null;
  const button = (id, label, onClick, extra = {}) => <SourceSettingsButton variant="secondary" size="sm" busy={working === id} disabled={disabled} onClick={onClick} {...extra}>{label}</SourceSettingsButton>;
  const toggle = (entry, label) => toggleSafe(entry) || view.insertIds.has(entry.id)
    ? <SourceSwitch label={label} checked={!entry.disabled} disabled={disabled} onChange={enabled => op(`harness-row-${entry.id}`, { op: 'set-enabled', id: entry.id, enabled })}/>
    : PRIVACY_ROWS.has(entry.id) ? privacy : required;
  const failedNote = entry => entry.phase === 'failed' ? ` · ${t('Failed to start')}` : entry.pending ? ` · ${t('Applies after restart')}` : '';
  // Danger only when the overlays are the likely cause: a restart from this page
  // failed, or main saw them change since a core last ran with them.
  const brokenCore = !connected && prefs.overlayEnabled && (!view.overlayEmpty || state.paths?.userExists) && (restartFailed || state.overlaySuspect === true);

  const profileRows = [
    settingRow('harness-profile-folder', t('Profile folder'), state.profile?.profileDir || t('The profile the OpenClaude Desktop core ships with.'), button('harness-profile-folder', t('Open profile folder'), () => op('harness-profile-folder', { op: 'open-folder', which: 'profile' }))),
    settingRow('harness-user-patch', t('Profile patch'), t('Your own patches in user.patch.yml, applied after everything else.'), button('harness-user-patch', t('Edit profile patch'), () => op('harness-user-patch', { op: 'edit-user-patch' }))),
    settingRow('harness-app-overlay', t('App overlay'), t('The changes made on this page, kept in overlay.patch.yml.'), button('harness-app-overlay', t('Open app overlay'), () => op('harness-app-overlay', { op: 'open-folder', which: 'app' }))),
    settingRow('harness-overlay-enabled', t('Use overlays'), t('Start the core with the app overlay and your profile patch. Turn off to start with the shipped profile only.'),
      <SourceSwitch label={t('Use overlays')} checked={prefs.overlayEnabled} disabled={disabled} onChange={value => act('harness-overlay-enabled', async () => { await onSave({ harnessProfile: { ...prefs, overlayEnabled: value } }); return call({ op: 'sync' }); })}/>),
    settingRow('harness-restart', t('Restart core'), connected ? t('Restarts the DeepSeek core. Running sessions stop.') : t('The DeepSeek core isn’t running.'), button('harness-restart', t('Restart core'), () => restart())),
    settingRow('harness-reset', t('Reset overlay'), t('Remove every change made on this page.'), button('harness-reset', t('Reset overlay'), () => op('harness-reset', { op: 'reset-overlay' }), { disabled: disabled || view.overlayEmpty })),
  ];

  const pluginRows = [];
  for (const bundle of view.bundles) {
    const open = expanded[bundle.name] === true;
    pluginRows.push(settingRow(`harness-bundle-${bundle.name}`, bundle.name, `${tn(bundle.entries.length, '{count} plugin', '{count} plugins')} · ${t('{count} can be turned off', { count: bundle.switchable })}${bundle.version ? ` · ${bundle.version}` : ''}`,
      <SourceSettingsButton size="sm" aria-expanded={open} aria-label={open ? t('Hide plugins in {name}', { name: bundle.name }) : t('Show plugins in {name}', { name: bundle.name })} onClick={() => setExpanded(current => ({ ...current, [bundle.name]: !open }))}>{open ? t('Hide plugins') : t('Show plugins')}</SourceSettingsButton>));
    if (open) for (const entry of bundle.entries) pluginRows.push(settingRow(`harness-row-${entry.id}`, entry.id, `${entry.module}${failedNote(entry)}`, toggle(entry, entry.id), { indent: 1 }));
  }

  const mcpRows = view.mcp.map(entry => settingRow(`harness-row-${entry.id}`, entry.serverName || entry.id,
    `${entry.transport === 'streamable-http' ? 'HTTP' : entry.transport === 'stdio' ? t('Local command') : t('MCP server')} · ${entry.added ? t('Added in OpenClaude Desktop') : entry.bundle ? t('From {bundle}', { bundle: entry.bundle }) : t('From your profile patch')}${failedNote(entry)}`,
    <div className="hs-controls">{entry.added && button(`harness-row-${entry.id}`, t('Remove'), () => op(`harness-row-${entry.id}`, { op: 'mcp-remove', id: entry.id }))}{toggle(entry, t('Enable {name}', { name: entry.serverName || entry.id }))}</div>));

  const skillRows = view.skillDirs.map(dir => settingRow(`harness-skill-${dir}`, dir, t('Skill folder'), button(`harness-skill-${dir}`, t('Remove'), () => op('harness-skill-dirs', { op: 'skill-dirs', dirs: view.skillDirs.filter(item => item !== dir) }))));
  const addSkillDir = () => act('harness-skill-dirs', async () => {
    const picked = await call({ op: 'pick-skill-dir' });
    if (!picked?.path) return undefined;
    return call({ op: 'skill-dirs', dirs: [...view.skillDirs, picked.path] });
  });

  const hookRows = view.hooks.map(entry => settingRow(`harness-row-${entry.id}`, entry.id, `${entry.configPath || entry.module}${failedNote(entry)}`,
    <div className="hs-controls">{entry.added && button(`harness-row-${entry.id}`, t('Remove'), () => op(`harness-row-${entry.id}`, { op: 'remove-insert', id: entry.id }))}{toggle(entry, t('Enable {name}', { name: entry.id }))}</div>));
  const addHooks = format => act(`harness-hooks-${format}`, async () => {
    const picked = await call({ op: 'pick-hooks-file' });
    if (!picked?.path) return undefined;
    return call({ op: 'hooks-add', format, configPath: picked.path });
  });

  return <div className="hs-page">
    {brokenCore && <div className="hs-banner" role="alert" data-tone="danger"><span>{t('The core didn’t start with your profile changes.')}</span>
      <div className="hs-controls">{button('harness-recover-reset', t('Reset overlay'), () => act('harness-recover-reset', async () => { await call({ op: 'reset-overlay' }); return restartAndRead(); }))}
        {button('harness-recover-safe', t('Restart without overlay'), () => act('harness-recover-safe', async () => { await onSave({ harnessProfile: { ...prefs, overlayEnabled: false } }); await call({ op: 'sync' }); return restartAndRead(); }))}</div></div>}
    {state.pending && !brokenCore && <div className="hs-banner" role="status"><span>{t('Restart the core to apply your changes.')}</span>{button('harness-banner-restart', t('Restart'), () => restart('harness-banner-restart'))}</div>}
    {state.error && <p className="ss-connection-notice" role="status">{t('Couldn’t read the running profile.')} {state.error}</p>}
    {!connected && !brokenCore && <p className="ss-connection-notice" role="status">{t('The DeepSeek core isn’t connected. Changes apply when it starts.')}</p>}
    <SettingsGroup title={PROFILE_TITLE} rows={profileRows} rowErrors={rowErrors}/>
    <SettingsGroup title={t('Plugins and bundles')} rows={pluginRows} rowErrors={rowErrors}>
      {!pluginRows.length && <p className="hs-empty">{t('No plugins reported by the running core.')}</p>}
    </SettingsGroup>
    <SettingsGroup title={t('MCP servers')} rows={mcpRows} rowErrors={rowErrors}>
      {!mcpRows.length && <p className="hs-empty">{t('No servers in this profile.')}</p>}
      <div className="hs-group-actions">{button('harness-mcp-add', t('Add server'), () => setAdding(true))}</div>
    </SettingsGroup>
    <SettingsGroup title={t('Skill folders')} rows={skillRows} rowErrors={rowErrors}>
      <p className="hs-empty">{skillRows.length ? t('Extra folders the core reads skills from, besides ~/.dsh/skills and the project’s own.') : t('The core reads skills from ~/.dsh/skills and each project. Add more folders here.')}</p>
      <div className="hs-group-actions">{button('harness-skill-dirs', t('Add folder…'), addSkillDir)}</div>
      {rowErrors['harness-skill-dirs'] && <p className="ss-row-error" title={rowErrors['harness-skill-dirs']}>{t('Couldn’t save the setting. Try again.')}</p>}
    </SettingsGroup>
    <SettingsGroup title={t('Hooks')} rows={hookRows} rowErrors={rowErrors}>
      {!hookRows.length && <p className="hs-empty">{t('No hook plugins. Run your Claude Code or Codex command hooks on the Harness by adding their hooks file.')}</p>}
      <div className="hs-group-actions">{button('harness-hooks-claude-code', t('Add Claude Code hooks…'), () => addHooks('claude-code'))}{button('harness-hooks-codex', t('Add Codex hooks…'), () => addHooks('codex'))}</div>
      {['harness-hooks-claude-code', 'harness-hooks-codex'].map(id => rowErrors[id] && <p key={id} className="ss-row-error" title={rowErrors[id]}>{t('Couldn’t save the setting. Try again.')}</p>)}
    </SettingsGroup>
    {rowErrors['harness-mcp-add'] && <p className="ss-row-error" title={rowErrors['harness-mcp-add']}>{t('Couldn’t save the setting. Try again.')}</p>}
    {adding && <AddServerDialog onClose={() => setAdding(false)} onAdd={async params => { const next = await call({ op: 'mcp-add', ...params }); if (live.current) setState(next); }}/>}
  </div>;
}

