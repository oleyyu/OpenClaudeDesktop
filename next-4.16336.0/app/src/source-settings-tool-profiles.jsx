import React, { useEffect, useId, useRef, useState } from 'react';
import { SettingsGroup, settingRow } from './source-settings-kit.jsx';
import { SettingsEmptyState } from './source-settings-pages.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSwitch } from './source-switch.jsx';
// The checkboxes are the CDS Checkbox with its own label (3.6556.2 shared-frame xP, `label` prop), as the cleanup dialog's
// (c71860c77 `r(F,{checked,disabled,onCheckedChange,label})`); facade import (R6: not in the chat / composer / menu graphs).
import { CdsCheckbox } from './generated/view-tabs/index.js';
import { SourceSelect } from './source-select.jsx';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { isToolOff, newProfileId, normalizeProfiles, offCount, requiredToolOff, toggleInSelection } from '../electron/prefs/tool-profiles.mjs';
import { t } from '../electron/i18n/index.mjs';
import { coreName, coreSupports } from '../electron/core-registry.mjs';
import { settingsCore } from './settings-core-copy.mjs';
import './source-profile-setting.css';
import './commands-settings.css';
import './tool-profiles-settings.css';

// Settings › Profiles: named sets of turned-off tools and MCP servers, with an optional model,
// effort and permission mode (prefs/tool-profiles.mjs). Composer Add › Tools applies one to a
// session; the default one is what a new session starts with. Needs a core with
// capabilities.toolSelection (the DeepSeek bridge, harness tool-gate.js).

const SAVE_ERROR = t('Couldn’t save the setting. Try again.');
const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
const PERMISSION_ITEMS = [
  { value: '', label: t('Keep current') },
  { value: 'ask', label: t('Ask permissions') },
  { value: 'acceptEdits', label: t('Accept edits') },
  { value: 'auto', label: t('Auto') },
  { value: 'plan', label: t('Plan mode') },
];

function useNestedDialogMark() {
  useEffect(() => {
    const parent = document.querySelector('.ss-settings-dialog');
    parent?.setAttribute('data-nested-dialog-open', '');
    return () => parent?.removeAttribute('data-nested-dialog-open');
  }, []);
}

function ProfileEditor({ initial, catalog, models, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => ({ name: initial?.name || '', tools: initial?.tools ?? null, model: initial?.model || '', permission: initial?.permission || '' }));
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const nameRef = useRef(null), ids = { tools: useId() };
  useNestedDialogMark();
  const toggle = (name, server = false) => setForm(current => ({ ...current, tools: toggleInSelection(current.tools, name, { server }) }));
  const submit = async event => {
    event.preventDefault(); event.stopPropagation();
    if (!form.name.trim()) { setError(t('Enter a name for this profile.')); return; }
    setSaving(true);
    try { await onSubmit(form); }
    catch (failure) { setError(failure?.message || SAVE_ERROR); setSaving(false); }
  };
  const modelItems = [{ value: '', label: t('Keep current') }, ...models.map(model => ({ value: model.model, label: model.displayName || model.model }))];
  const tools = catalog?.tools ?? [], servers = catalog?.servers ?? [];
  return <SourceDialog open size="md" layer={SETTINGS_LAYER} title={initial?.id ? t('Edit profile') : t('New profile')} className="ccmd-dialog tprof-dialog"
    description={t('Turned-off tools are removed from the model’s tool list for sessions using this profile.')}
    initialFocusRef={nameRef} onClose={() => { if (!saving) onCancel(); }}>
    <form className="ccmd-form" onSubmit={submit} noValidate>
      <label className="ccmd-field"><span className="ccmd-label">{t('Name')}</span>
        <input ref={nameRef} data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Profile name')} value={form.name} maxLength={60}
          placeholder={t('e.g. Read-only review')} onChange={event => { setForm(current => ({ ...current, name: event.target.value })); setError(''); }}/>
      </label>
      <div className="ccmd-field"><span className="ccmd-label">{t('Model')}</span>
        <SourceSelect label={t('Model')} value={form.model} items={modelItems} onChange={value => setForm(current => ({ ...current, model: value }))}/>
      </div>
      <div className="ccmd-field"><span className="ccmd-label">{t('Permission mode')}</span>
        <SourceSelect label={t('Permission mode')} value={form.permission} items={PERMISSION_ITEMS} onChange={value => setForm(current => ({ ...current, permission: value }))}/>
      </div>
      <fieldset className="ccmd-field tprof-tools" aria-describedby={ids.tools}>
        <legend className="ccmd-label">{t('Tools')}</legend>
        <span id={ids.tools} className="ccmd-help">{t('Checked tools are available. {count} turned off.', { count: offCount(form.tools) })}</span>
        {catalog === null && <span className="ccmd-help">{t('Loading…')}</span>}
        {catalog?.supported === false && <span className="ccmd-help">{t('The running core can’t turn tools off.')}</span>}
        <div className="tprof-grid">
          {/* Off in the agent's own config (disabledReason), or stopped with a tool it requires that is off (tools/list
              requires): unchecked and fixed, the reason as its tooltip. */}
          {tools.map(tool => {
            const withTool = tool.disabledReason ? null : requiredToolOff(tool, form.tools);
            const reason = tool.disabledReason ? t(tool.disabledReason) : withTool ? t('Turned off with {tool}', { tool: withTool }) : null;
            return <CdsCheckbox key={tool.name} className="tprof-check" title={reason || (tool.description ? t(tool.description) : undefined)} data-tool-locked={reason ? '' : undefined}
              checked={!reason && !isToolOff(tool.name, form.tools)} disabled={!!reason} onCheckedChange={() => toggle(tool.name)} label={<span className="tprof-name">{tool.name}</span>}/>;
          })}
        </div>
        {servers.length > 0 && <><span className="ccmd-label tprof-sub">{t('MCP servers')}</span>
          <div className="tprof-grid">
            {servers.map(server => <CdsCheckbox key={server.name} className="tprof-check" checked={!form.tools?.disabledServers?.includes(server.name)}
              onCheckedChange={() => toggle(server.name, true)}
              label={<><span className="tprof-name">{server.name}</span>{server.tools.length > 0 && <span className="ccmd-muted"> {server.tools.length}</span>}</>}/>)}
          </div></>}
      </fieldset>
      {error && <p className="ccmd-error" role="alert">{error}</p>}
      <SourceDialogFooter>
        <SourceSettingsButton disabled={saving} onClick={onCancel}>{t('Cancel')}</SourceSettingsButton>
        <SourceSettingsButton type="submit" variant="primary" busy={saving}>{initial?.id ? t('Save') : t('Create profile')}</SourceSettingsButton>
      </SourceDialogFooter>
    </form>
  </SourceDialog>;
}

function summary(profile, models) {
  const parts = [];
  const off = offCount(profile.tools);
  parts.push(off ? t('{count} turned off', { count: off }) : t('All tools'));
  if (profile.model) parts.push(models.find(model => model.model === profile.model)?.displayName || profile.model);
  if (profile.permission) parts.push(PERMISSION_ITEMS.find(item => item.value === profile.permission)?.label || profile.permission);
  return parts.join(' · ');
}

export function SourceToolProfilesSettings({ config, boot, desktopCall, onSave }) {
  const profiles = normalizeProfiles(config?.toolProfiles);
  const defaultId = config?.defaultToolProfile || null;
  const models = boot?.models || [];
  // capabilities.toolSelection (reported, or implied by the descriptor: ZCode, OpenCode, MiMo). Without it a profile
  // is never applied (main.cjs only sends codeDesktop.tools to such a core), so nothing new can be created or made the
  // default; existing profiles can still be turned off as the default, edited or deleted.
  const core = settingsCore(boot, config), supported = coreSupports(core, 'toolSelection');
  const [catalog, setCatalog] = useState(null), [editor, setEditor] = useState(null);
  const [rowErrors, setRowErrors] = useState({}), [pending, setPending] = useState('');
  useEffect(() => {
    let live = true;
    Promise.resolve(desktopCall('tools-list')).then(result => { if (live) setCatalog(result); }, () => { if (live) setCatalog({ supported: false, tools: [], servers: [] }); });
    return () => { live = false; };
  }, [desktopCall, boot?.connected]);
  const act = async (id, run) => {
    setPending(id); setRowErrors(current => ({ ...current, [id]: undefined }));
    try { await run(); } catch (failure) { setRowErrors(current => ({ ...current, [id]: failure?.message || SAVE_ERROR })); }
    finally { setPending(''); }
  };
  const save = (patch) => Promise.resolve(onSave(patch));
  const rows = profiles.map(profile => settingRow(`profile-${profile.id}`, profile.name, summary(profile, models),
    <div className="ccmd-actions">
      <SourceSwitch label={t('Use for new sessions')} checked={profile.id === defaultId} disabled={!!pending || (!supported && profile.id !== defaultId)}
        onChange={on => act(`profile-${profile.id}`, () => save({ defaultToolProfile: on ? profile.id : null }))}/>
      <SourceSettingsButton size="sm" variant="ghost" icon="Edit" iconOnly aria-label={t('Edit {name}', { name: profile.name })} title={t('Edit')} disabled={!!pending} onClick={() => setEditor(profile)}/>
      <SourceSettingsButton size="sm" variant="ghost" icon="Trash" iconOnly aria-label={t('Delete {name}', { name: profile.name })} title={t('Delete')} disabled={!!pending}
        onClick={() => act(`profile-${profile.id}`, () => save({ toolProfiles: profiles.filter(entry => entry.id !== profile.id) }))}/>
    </div>));
  return <div className="ccmd-page">
    <SettingsGroup title={t('Profiles')} rowErrors={rowErrors} rows={[
      settingRow('profiles-new', t('Tool profiles'), supported
        ? t('Choose which tools and MCP servers a session can use, with an optional model and permission mode. Apply one from + › Tools in the composer.')
        : boot?.connected ? t('{core} can’t turn tools off, so profiles don’t apply to its sessions. Choose another core in Settings › Cores to use them.', { core: coreName(core) })
          : t('Profiles become available once the core is running.'),
        <SourceSettingsButton size="sm" disabled={!!pending || !supported} onClick={() => setEditor({})}>{t('New profile')}</SourceSettingsButton>),
    ]}/>
    {/* None yet: the centred settings empty state (illustration, secondary message, New profile), not a setting row. */}
    <SettingsGroup title={t('Your profiles')} rowErrors={rowErrors} rows={rows}>
      {!rows.length && <SettingsEmptyState data-setting-id="profiles-empty" lines={[t('No profiles yet'), t('Every session uses all tools until you create one.')]}
        actions={supported ? <SourceSettingsButton variant="primary" disabled={!!pending} onClick={() => setEditor({})}>{t('New profile')}</SourceSettingsButton> : null}/>}
    </SettingsGroup>
    {editor && <ProfileEditor key={editor.id || 'new'} initial={editor} catalog={catalog} models={models}
      onCancel={() => setEditor(null)}
      onSubmit={async form => {
        const next = { id: editor.id || newProfileId(profiles), name: form.name.trim(), tools: form.tools, ...(form.model ? { model: form.model } : {}), ...(form.permission ? { permission: form.permission } : {}) };
        await save({ toolProfiles: editor.id ? profiles.map(entry => entry.id === editor.id ? next : entry) : [...profiles, next] });
        setEditor(null);
      }}/>}
  </div>;
}
