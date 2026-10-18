import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { SourceDialog, SourceDialogFooter, SourceConfirmationDialog } from './source-dialog.jsx';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
import { EnvironmentField as Field, EnvironmentLabel as Label, EnvironmentFieldError as FieldError, EnvironmentTextInput as TextInput } from './generated/code-current/environment-field-controls.mjs';
import { EnvironmentFooter } from './generated/code-current/environment-form-layout.mjs';
import { EnvironmentFolderField, EnvironmentFolderList, EnvironmentEmptyFolders, EnvironmentFolderRow, EnvironmentFolderControls, environmentAddFolderSelect } from './generated/code-current/environment-folder-view.mjs';
import { environmentDraft, environmentDraftDirty, environmentTarget, environmentBranchOrder, environmentDefaultBranch, environmentBranchLabel,
  environmentNotRepositoryNote, withoutFolderSettings, environmentDialogClass, environmentLabelClass, environmentFolderLabelClass,
  useCenteredEnvironmentHeight } from './generated/code-current/environment-dialog-model.mjs';
import { availableEnvironmentName, sameEnvironmentName } from '../electron/generated/environment-presets.mjs';
import { environmentBasename } from '../electron/generated/environment-basename.mjs';
import { environmentParent } from '../electron/generated/environment-parent.mjs';
import { environmentFolderRoot, environmentGitInfo } from './saved-environment-model.mjs';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { EnvironmentSelect } from './source-environment-folder-adapters.jsx';
import { t } from '../electron/i18n/index.mjs';
import './source-saved-environment-dialog.css';

// ca690a791 fn, local kind (2.42304.0), with folderCheckouts off (the host saves no per-folder checkouts) and saveScoped
// off. The draft/target/dirty/branch models, the height hold Ot and the folder views (cd8823d73 U/he) are the original
// bindings; the native directory picker, persistence, the git info (workspace-info) and the menu/dialog primitives are
// host boundaries. The Folders field's "+ Add" is the official Select props (cd8823d73 ge) over the host Select adapter:
// the recent folders not yet listed (fn Er: basename labels, the parent folder as description when basenames collide),
// "No recent folders" when there are none, and the "Choose…" footer action opening the native picker; with no folder the
// field shows fn's empty box (cd8823d73 H without text, aria-hidden).
export function SourceSavedEnvironmentDialog({ editing = null, initialTarget, initialSettings = {}, environments = [], recentFolders = [], call, onSave, onDelete, onClose, onVariables }) {
  const [opening] = useState(() => environmentDraft(editing?.target ?? initialTarget, ['local'], editing?.settings ?? initialSettings, editing?.name));
  const [draft, setDraft] = useState(opening), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null), [repository, setRepository] = useState(null);
  const [popup, setPopup] = useState(null);
  // Ot's view is `${kind} ${page}`; the host has the main page only (environment variables open their own dialog).
  useCenteredEnvironmentHeight({ popup, open: true, view: `${draft.kind} main` });
  const nameRef = useRef(null), intl = useStartIntl(), descriptionId = useId();
  const change = next => { setDraft(previous => ({ ...previous, ...next })); setError(''); };
  const changeSettings = next => { setDraft(previous => ({ ...previous, settings: { ...previous.settings, ...next } })); setError(''); };
  const target = environmentTarget(draft, false, false);
  const takenNames = environments.filter(row => row.id !== editing?.id).map(row => row.name);
  const name = draft.nameDirty ? draft.name : availableEnvironmentName(environmentBasename(draft.folder ?? ''), target ?? { kind: 'local', cwd: '' }, takenNames);
  const duplicate = takenNames.some(other => sameEnvironmentName(other, name));
  const valid = !!target && !!name.trim() && !duplicate;
  const dirty = environmentDraftDirty(opening, draft);
  const repo = repository?.cwd === draft.folder ? repository : null;
  const gitInfo = environmentGitInfo(repo);
  const branches = useMemo(() => environmentBranchOrder(repo?.branches ?? [], draft.settings.branch), [repo, draft.settings.branch]);
  // fn li / di / fi / pi for a local folder (no variant, no WSL): the worktree choice, the "Not a Git repository" note
  // when the folder is known to be outside a repository, the inline branch picker and the Worktree checkbox.
  const worktree = draft.settings.worktree ?? false;
  const note = environmentFolderRoot(repo, draft.folder) === null && draft.settings.worktree !== true && !draft.settings.branch
    ? environmentNotRepositoryNote(intl) : undefined;
  const branch = note === undefined && branches.length > 0 ? {
    value: draft.settings.branch ?? '',
    ...environmentBranchLabel(intl, { worktree, defaultBranch: environmentDefaultBranch(gitInfo, repo?.branches ?? [], 'local'), headBranch: gitInfo?.branch }),
    branches, typed: false,
    searchLabel: intl.formatMessage({ defaultMessage: 'Search branches…', id: 'NNBHaPuMiG' }),
    emptyMessage: intl.formatMessage({ defaultMessage: 'No branches', id: 'clqEk9fhKZ' }),
    onChange: value => changeSettings({ branch: value || undefined }),
  } : undefined;
  const worktreeBox = note !== undefined ? undefined : { checked: worktree, onChange: checked => changeSettings({ worktree: checked }) };
  useEffect(() => {
    let live = true;
    setRepository(null);
    if (draft.folder) call('workspace-info', { cwd: draft.folder }).then(info => { if (live) setRepository({ ...info, cwd: draft.folder }); }, reason => { if (live) setError(reason.message); });
    return () => { live = false; };
  }, [draft.folder, call]);
  const requestClose = () => { if (!busy) dirty ? setConfirm('discard') : onClose(); };
  const save = async () => {
    if (!valid || busy) return;
    setBusy(true); setError('');
    try { await onSave({ name: name.trim(), target, settings: draft.settings }); onClose(); }
    catch (reason) { setError(reason.message); setConfirm(null); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await onDelete(editing.id); onClose(); }
    catch (reason) { setError(reason.message); setConfirm(null); }
    finally { setBusy(false); }
  };
  const addFolder = async path => {
    try {
      const folder = await call('folder', { additional: true, ...(path ? { path } : {}) });
      if (!folder) return;
      setDraft(previous => !previous.folder ? { ...previous, folder }
        : { ...previous, additionalFolders: [...new Set([...previous.additionalFolders, folder])].filter(dir => dir !== previous.folder) });
    } catch (reason) { setError(reason.message); }
  };
  // fn ji (primary) and St's onRemove (additional): the next folder is promoted with its own settings dropped; the
  // primary settings stay because folderCheckouts is off.
  const removeFolder = index => {
    if (index === 0) {
      const [next, ...rest] = draft.additionalFolders;
      change(next === undefined ? { folder: null } : { folder: next, additionalFolders: rest, folderSettings: withoutFolderSettings(draft.folderSettings, next) });
    } else {
      const folder = draft.additionalFolders[index - 1];
      change({ additionalFolders: draft.additionalFolders.filter((_, i) => i !== index - 1), folderSettings: withoutFolderSettings(draft.folderSettings, folder) });
    }
  };
  const folderName = path => environmentBasename(path) || path;
  // fn Er: the recent folders not already listed; a basename shared by two recent folders gets its parent folder as the
  // row's description (shared-18 An). The host rows carry no displayName.
  const addItems = useMemo(() => {
    const listed = [...(draft.folder ? [draft.folder] : []), ...draft.additionalFolders], counts = new Map();
    for (const { path } of recentFolders) { const name = environmentBasename(path); counts.set(name, (counts.get(name) ?? 0) + 1); }
    return recentFolders.filter(row => !listed.includes(row.path)).map(row => {
      const label = row.displayName ?? environmentBasename(row.path), shared = !row.displayName && (counts.get(label) ?? 0) > 1;
      return { value: row.path, label, description: shared ? environmentParent(row.path) ?? undefined : undefined };
    });
  }, [recentFolders, draft.folder, draft.additionalFolders]);
  return <>
    <SourceDialog title={t(editing ? 'Edit environment' : 'New environment')} size="md" density="comfortable" className={`saved-environment-dialog ${environmentDialogClass}`}
      popupRef={setPopup} initialFocusRef={editing ? nameRef : undefined} onClose={requestClose} showClose={!busy}>
      <form className="contents" onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="flex flex-1 flex-col pt-md in-data-cds-fizzy:pt-0 min-h-0">
          <div className="flex flex-1 flex-col gap-md min-h-0">
            <Field className="gap-sm" invalid={duplicate || undefined} disabled={busy}>
              <div className={environmentLabelClass}><Label>{t('Name')}</Label>{duplicate && <FieldError match role="alert" className="ms-auto">{t('Another environment has this name.')}</FieldError>}</div>
              <TextInput ref={nameRef} size="lg" value={name} placeholder={t('My app')} onChange={event => change({ name: event.target.value, nameDirty: true })}
                onFocus={editing ? event => event.currentTarget.select() : undefined} autoComplete="off" data-1p-ignore="true" data-lpignore="true" />
            </Field>
            <div className="flex flex-1 flex-col min-h-0" data-testid="environment-kind-fields" tabIndex={-1}>
              <div className="-mx-pad-xl flex min-h-[6rem] flex-1 flex-col overflow-y-auto overflow-x-hidden scroll-fade-y px-xl pt-3 supports-[min-height:calc-size(auto,size)]:min-h-[calc-size(min-content,min(size,6rem))] -mt-3 mb-0 gap-md pb-lg">
                <EnvironmentFolderField label={t('Folders')} labelClassName={environmentFolderLabelClass}
                  add={<EnvironmentSelect {...environmentAddFolderSelect} aria-label={intl.formatMessage({ defaultMessage: 'Add', id: '2/2yg+qAwp' })} items={addItems}
                    onChange={path => { if (path !== null) void addFolder(path); }} emptyMessage={intl.formatMessage({ defaultMessage: 'No recent folders', id: '3Y7pYU5W5A' })}
                    footer={({ close }) => <EnvironmentSelect.FooterAction icon="Folder" aria-label={intl.formatMessage({ defaultMessage: 'Choose a folder', id: 'YjjTU9NztP' })}
                      onClick={() => { close(); void addFolder(); }}><StartMessage defaultMessage="Choose…" id="8tJfYE1sr+" /></EnvironmentSelect.FooterAction>} />}>
                  {draft.folder ? <EnvironmentFolderList>
                    <EnvironmentFolderRow icon="Folder" name={environmentBasename(draft.folder)} title={draft.folder}
                      end={<EnvironmentFolderControls label={environmentBasename(draft.folder)} note={note} branch={branch} worktree={worktreeBox} onRemove={() => removeFolder(0)} />} />
                    {draft.additionalFolders.map((folder, index) => <EnvironmentFolderRow key={folder} icon="Folder" name={folderName(folder)} title={folder}
                      end={<EnvironmentFolderControls label={folderName(folder)} onRemove={() => removeFolder(index + 1)} />} />)}
                  </EnvironmentFolderList> : <EnvironmentEmptyFolders />}
                </EnvironmentFolderField>
                <div className="pt-xs text-footnote text-muted-as-secondary" id={descriptionId}>{t('Environment variables apply to every local session.')} <button type="button" className="saved-environment-link df-link-btn" onClick={onVariables}>{t('Edit')}</button></div>
                {error && <div className="text-footnote text-danger" role="alert">{error}</div>}
              </div>
              <EnvironmentFooter align={editing ? 'between' : 'end'}>
                {editing && <Button variant="ghost" className="text-danger" disabled={busy} onClick={() => setConfirm('delete')}>{t('Delete environment')}</Button>}
                <div className="flex gap-sm"><Button variant="secondary" disabled={busy} onClick={requestClose}>{t('Cancel')}</Button><Button variant="primary" busy={busy} disabled={!valid || busy} type="submit">{t(editing ? 'Save' : 'Create environment')}</Button></div>
              </EnvironmentFooter>
            </div>
          </div>
        </div>
      </form>
    </SourceDialog>
    {confirm === 'delete' && <SourceConfirmationDialog title={t('Delete environment?')} body={t('“{name}” will be deleted. Sessions started from it are kept. This can’t be undone.', { name: editing.name })}
      confirmLabel={t('Delete environment')} confirmVariant="danger" pending={busy} onCancel={() => setConfirm(null)} onConfirm={remove} layer={{ base: 100, z: 180 }} />}
    {confirm === 'discard' && <SourceDialog alert size="sm" density="compact" title={t(valid ? (editing ? 'Save changes?' : 'Add this environment?') : 'Discard unsaved changes?')}
      description={valid ? undefined : t('Your changes haven’t been saved and will be lost.')} showClose={false} onClose={() => { if (!busy) setConfirm(null); }} layer={{ base: 100, z: 180 }}>
      <SourceDialogFooter align="between"><Button variant="danger" disabled={busy} onClick={onClose}>{t('Discard')}</Button><div className="flex items-center gap-sm"><Button variant="secondary" data-autofocus="" disabled={busy} onClick={() => setConfirm(null)}>{t('Keep editing')}</Button>
        {valid && <Button variant="primary" busy={busy} disabled={busy} onClick={save}>{t(editing ? 'Save' : 'Add environment')}</Button>}</div></SourceDialogFooter></SourceDialog>}
  </>;
}
