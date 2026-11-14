import React, { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SettingsGroup, settingRow } from './source-settings-kit.jsx';
import { SettingsEmptyState } from './source-settings-pages.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSwitch } from './source-switch.jsx';
import { SourceSelect } from './source-select.jsx';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { sessionCommands } from './session-command-model.mjs';
import { customCommandsStore } from './custom-commands-store.mjs';
import { mergeCommands, parseCommandFile, serializeCommandFile, validateCommandName, MAX_COMMAND_BYTES } from './custom-commands-model.mjs';
import { normalizeCustomCommands } from '../electron/prefs/custom-commands.mjs';
import { t } from '../electron/i18n/index.mjs';
import './source-profile-setting.css';
import './commands-settings.css';

// Settings › Commands (C3): user prompt templates run from '/' in the composer. Files live in
// <globalDir || userData/commands>/*.md and <project>/.code-desktop/commands/*.md; the folders are
// watched by the main process, so edits made in another editor show up here and in '/' on their own.

// Above Settings (.ss-backdrop z 500) and level with its stacked dialogs (520).
const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
const BUILTIN_IDS = sessionCommands.flatMap(entry => [entry.id, ...(entry.aliases || [])]);
const SCOPE_ITEMS = [{ value: 'global', label: t('Your commands') }, { value: 'project', label: t('This project') }];
const bytes = text => new TextEncoder().encode(text).length;
const tail = path => String(path || '').replace(/^\/Users\/[^/]+/, '~');

function useNestedDialogMark(open) {
  useEffect(() => {
    if (!open) return undefined;
    const parent = document.querySelector('.ss-settings-dialog');
    parent?.setAttribute('data-nested-dialog-open', '');
    return () => parent?.removeAttribute('data-nested-dialog-open');
  }, [open]);
}

function CommandEditor({ initial, projectAvailable, onCancel, onSubmit }) {
  const editing = !!initial?.name;
  const [form, setForm] = useState(() => {
    const parsed = editing ? parseCommandFile(initial.text) : { description: '', argumentHint: '', body: '' };
    return { name: initial?.name || '', description: parsed.description, argumentHint: parsed.argumentHint, body: parsed.body, scope: initial?.scope || (projectAvailable ? 'project' : 'global') };
  });
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [touched, setTouched] = useState(false);
  const nameRef = useRef(null), ids = { name: useId(), help: useId(), error: useId() };
  useNestedDialogMark(true);
  const set = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setError(''); };
  const text = serializeCommandFile(form);
  const nameError = validateCommandName(form.name) || (BUILTIN_IDS.includes(form.name.toLowerCase()) ? t('/{name} is a built-in command. Choose another name.', { name: form.name }) : '');
  const problem = nameError || (!form.body.trim() ? t('Enter the prompt for this command.') : bytes(text) > MAX_COMMAND_BYTES ? t('Commands can be up to 64 KB.') : '');
  const submit = async event => {
    event.preventDefault(); event.stopPropagation();
    setTouched(true);
    if (problem || saving) return;
    setSaving(true);
    try { await onSubmit({ ...form, text }); }
    catch (failure) { setError(failure?.message || String(failure)); setSaving(false); }
  };
  const shownError = error || (touched ? problem : '');
  return <SourceDialog open size="md" layer={SETTINGS_LAYER} title={editing ? t('Edit /{name}', { name: initial.name }) : t('New command')} className="ccmd-dialog"
    description={t('Type / in the composer to run it. The text after the command replaces $ARGUMENTS or {{args}}; without a placeholder it is added at the end.')}
    initialFocusRef={nameRef} onClose={() => { if (!saving) onCancel(); }}>
    <form className="ccmd-form" onSubmit={submit} noValidate>
      <label className="ccmd-field"><span className="ccmd-label">{t('Name')}</span>
        <span className="ccmd-name-input"><span aria-hidden="true">/</span>
          <input ref={nameRef} data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Command name')} value={form.name} maxLength={64}
            spellCheck={false} autoCapitalize="off" autoComplete="off" placeholder="review-pr" aria-invalid={touched && !!nameError || undefined}
            onChange={event => set('name')({ target: { value: event.target.value.replace(/^\//, '').replace(/\s/g, '-') } })}/></span>
      </label>
      <label className="ccmd-field"><span className="ccmd-label">{t('Description')}</span>
        <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Description')} value={form.description} maxLength={300} placeholder={t('Shown next to the command in /')} onChange={set('description')}/>
      </label>
      <label className="ccmd-field"><span className="ccmd-label">{t('Argument hint')}</span>
        <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Argument hint')} value={form.argumentHint} maxLength={120} placeholder="[pr-number]" onChange={set('argumentHint')}/>
      </label>
      <label className="ccmd-field"><span className="ccmd-label">{t('Prompt')}</span>
        <textarea data-cds="TextArea" className="cds-input cds-reset ccmd-body" aria-label={t('Prompt')} aria-describedby={ids.help} rows={10} value={form.body} spellCheck={false}
          placeholder={t('Review pull request $ARGUMENTS. Summarize the changes and list risks.')} onChange={set('body')}/>
        <span id={ids.help} className="ccmd-help">{t('Use')} <code>$ARGUMENTS</code> {t('or')} <code>{'{{args}}'}</code> {t('where the text typed after the command should go.')}</span>
      </label>
      <div className="ccmd-field"><span className="ccmd-label">{t('Saved in')}</span>
        <SourceSelect label={t('Scope')} value={form.scope} disabled={editing || !projectAvailable} onChange={value => setForm(current => ({ ...current, scope: value }))}
          items={SCOPE_ITEMS.filter(item => item.value === 'global' || projectAvailable || form.scope === 'project')}/>
      </div>
      {shownError && <p id={ids.error} className="ccmd-error" role="alert">{shownError}</p>}
      <SourceDialogFooter>
        <SourceSettingsButton disabled={saving} onClick={onCancel}>{t('Cancel')}</SourceSettingsButton>
        <SourceSettingsButton type="submit" variant="primary" busy={saving}>{editing ? t('Save') : t('Create command')}</SourceSettingsButton>
      </SourceDialogFooter>
    </form>
  </SourceDialog>;
}

function DeleteDialog({ command, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), confirm = useRef(null);
  useNestedDialogMark(true);
  return <SourceDialog open alert size="sm" layer={SETTINGS_LAYER} title={t('Delete /{name}?', { name: command.name })} initialFocusRef={confirm}
    description={t('{path} will be moved to the Trash.', { path: tail(command.path) })} onClose={() => { if (!busy) onCancel(); }}>
    {error && <p className="ccmd-error" role="alert">{error}</p>}
    <SourceDialogFooter>
      <SourceSettingsButton disabled={busy} onClick={onCancel}>{t('Cancel')}</SourceSettingsButton>
      <SourceSettingsButton ref={confirm} variant="danger" busy={busy} onClick={async () => {
        setBusy(true);
        try { await onConfirm(); } catch (failure) { setError(failure?.message || String(failure)); setBusy(false); }
      }}>{t('Move to Trash')}</SourceSettingsButton>
    </SourceDialogFooter>
  </SourceDialog>;
}

function commandRow(command, { onEdit, onDelete, busy }) {
  const meta = command.argumentHint;
  return settingRow(`command-${command.scope}-${command.name}`, `/${command.name}`,
    <>{command.description || <span className="ccmd-muted">{t('No description')}</span>}{meta && <span className="ccmd-hint"> {meta}</span>}</>,
    <div className="ccmd-actions">
      {command.shadowedBy && <span className="ccmd-badge" title={command.shadowedBy === 'built-in' ? t('A built-in command has this name, so this file is not offered in /.') : t('A project command with this name is used instead.')}>
        {command.shadowedBy === 'built-in' ? t('Shadowed by built-in') : t('Shadowed by project')}</span>}
      {command.hidesSkill && <span className="ccmd-badge" title={t('A skill with this name is hidden from /.')}>{t('Hides skill')}</span>}
      <SourceSettingsButton size="sm" variant="ghost" icon="Edit" iconOnly aria-label={t('Edit /{name}', { name: command.name })} title={t('Edit')} disabled={busy} onClick={() => onEdit(command)}/>
      <SourceSettingsButton size="sm" variant="ghost" icon="Trash" iconOnly aria-label={t('Delete /{name}', { name: command.name })} title={t('Delete')} disabled={busy} onClick={() => onDelete(command)}/>
    </div>);
}

export function SourceCommandsSettings({ config, desktopCall, onSave, cwd }) {
  const prefs = normalizeCustomCommands(config?.customCommands);
  const snapshot = useSyncExternalStore(customCommandsStore.subscribe, customCommandsStore.getSnapshot, customCommandsStore.getSnapshot);
  const entry = snapshot.entries[cwd || ''] || null;
  const [editor, setEditor] = useState(null), [removing, setRemoving] = useState(null);
  const [rowErrors, setRowErrors] = useState({}), [pending, setPending] = useState('');
  const prefsKey = JSON.stringify(prefs);
  useEffect(() => { customCommandsStore.load(cwd, { force: true }); }, [cwd, prefsKey]);
  const rows = useMemo(() => entry ? mergeCommands({ global: entry.global, project: entry.project, builtinIds: BUILTIN_IDS }) : [], [entry]);
  const projectAvailable = prefs.projectEnabled && !!entry?.project;
  const reload = () => customCommandsStore.load(cwd, { force: true });
  const call = (op, params = {}) => Promise.resolve(desktopCall('custom-commands', { op, cwd: cwd || undefined, ...params }));
  const act = async (id, run) => {
    setPending(id); setRowErrors(current => ({ ...current, [id]: undefined }));
    try { await run(); } catch (failure) { console.error(failure); setRowErrors(current => ({ ...current, [id]: failure?.message || String(failure) })); }
    finally { setPending(''); }
  };
  const savePrefs = (id, next) => act(id, () => onSave({ customCommands: { ...prefs, ...next } }));
  const handlers = { onEdit: command => setEditor(command), onDelete: command => setRemoving(command), busy: !!pending };
  const project = rows.filter(row => row.scope === 'project'), global = rows.filter(row => row.scope === 'global');
  const loading = !entry || entry.status === 'loading';
  const listError = entry?.status === 'error' ? entry.error : '';
  const globalDir = entry?.global?.dir || prefs.globalDir || '';

  return <div className="ccmd-page">
    <SettingsGroup title={t('Commands')} rowErrors={rowErrors} rows={[
      settingRow('commands-new', t('Custom commands'), t('Reusable prompts you run by typing / in the composer. They appear under “Custom” in the menu.'),
        <SourceSettingsButton size="sm" onClick={() => setEditor({ name: '', scope: projectAvailable ? 'project' : 'global' })}>{t('New command')}</SourceSettingsButton>),
      settingRow('commands-folder', t('Commands folder'), <span className="ccmd-path" title={globalDir}>{globalDir ? tail(globalDir) : t('Default folder in the app data')}</span>,
        <div className="ccmd-actions">
          <SourceSettingsButton size="sm" variant="ghost" busy={pending === 'commands-folder'} disabled={!!pending} onClick={() => act('commands-folder', async () => {
            const picked = await call('pick-dir'); if (picked) await onSave({ customCommands: { ...prefs, globalDir: picked } });
          })}>{t('Change…')}</SourceSettingsButton>
          {prefs.globalDir && <SourceSettingsButton size="sm" variant="ghost" disabled={!!pending} onClick={() => savePrefs('commands-folder', { globalDir: '' })}>{t('Use default')}</SourceSettingsButton>}
          <SourceSettingsButton size="sm" variant="ghost" disabled={!!pending} onClick={() => act('commands-folder', () => call('reveal', { scope: 'global' }))}>{t('Reveal')}</SourceSettingsButton>
        </div>),
      settingRow('commands-project', t('Project commands'), t('Also load commands from .code-desktop/commands in the current project. Project commands win over yours when names match.'),
        <SourceSwitch label={t('Project commands')} checked={prefs.projectEnabled} disabled={!!pending} onChange={enabled => savePrefs('commands-project', { projectEnabled: enabled })}/>),
    ]}/>
    {listError && <p className="ss-connection-notice" role="status">{t('Couldn’t read the commands folders.')} {listError}</p>}
    {/* An empty list is the centred settings empty state (illustration, secondary message, actions), not a setting row. */}
    {prefs.projectEnabled && <SettingsGroup title={t('Project commands')} rowErrors={rowErrors} rows={entry?.project ? project.map(command => commandRow(command, handlers))
      : loading ? [settingRow('commands-project-none', t('Loading…'), '', null)] : []}>
      {!entry?.project && !loading && <SettingsEmptyState data-setting-id="commands-project-none" lines={[t('No project open'), t('Open a session in a project folder to add commands to it.')]}/>}
      {entry?.project && !project.length && !loading && <SettingsEmptyState data-setting-id="commands-project-empty" lines={[t('No project commands')]} error={rowErrors['commands-project-empty']} actions={<>
        <SourceSettingsButton variant="primary" disabled={!!pending} onClick={() => setEditor({ name: '', scope: 'project' })}>{t('New command')}</SourceSettingsButton>
        <SourceSettingsButton disabled={!!pending} title={entry.project.dir} onClick={() => act('commands-project-empty', () => call('reveal', { scope: 'project' }))}>{t('Reveal')}</SourceSettingsButton>
      </>}/>}
    </SettingsGroup>}
    <SettingsGroup title={t('Your commands')} rowErrors={rowErrors} rows={global.length ? global.map(command => commandRow(command, handlers))
      : loading ? [settingRow('commands-global-empty', t('Loading…'), '', null)] : []}>
      {!global.length && !loading && <SettingsEmptyState data-setting-id="commands-global-empty" lines={[t('No commands yet'), t('Create one with New command, or add .md files to the commands folder.')]} actions={
        <SourceSettingsButton variant="primary" disabled={!!pending} onClick={() => setEditor({ name: '', scope: 'global' })}>{t('New command')}</SourceSettingsButton>}/>}
    </SettingsGroup>
    {editor && <CommandEditor key={editor.path || 'new'} initial={editor} projectAvailable={projectAvailable}
      onCancel={() => setEditor(null)}
      onSubmit={async form => {
        await call('save', { scope: form.scope, name: form.name, previousName: editor.name || undefined, text: form.text });
        await reload(); setEditor(null);
      }}/>}
    {removing && <DeleteDialog command={removing} onCancel={() => setRemoving(null)}
      onConfirm={async () => { await call('delete', { scope: removing.scope, name: removing.name }); await reload(); setRemoving(null); }}/>}
  </div>;
}
