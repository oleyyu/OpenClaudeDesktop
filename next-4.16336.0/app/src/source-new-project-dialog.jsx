// w13-close-chat-projects-memory (G5): the New project dialog a session's project picker opens — 3.6556.2 shared-16 xf
// (yf / fm's move-to-space through Sf's create rows: "New project", "Create {name}", Enter in "Search or create a
// project") opens the create-project modal (shared-8 eN) with the typed name and, once the project exists, moves the
// session into it; c752b32f8 Es (the Chat + menu's Add to project) does the same through `setCreateProjectModalIsOpen({
// isOpen, initialName })`. The claude.ai modal (eN / tN: uploads, context section, folder upsell) is not sliced: a local
// project is the host's (electron/local-projects.mjs create: name, description, an optional working folder), drawn as the
// Projects page's own New project form (source-projects.jsx CreateProject), with the typed name filled in.
import React, { useState } from 'react';
import { CdsTextInput as TextInput } from './generated/view-tabs/index.js';
import { CdsTextArea as TextArea } from './generated/cowork-scheduled/index.mjs';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
import { SourceDialog } from './source-dialog.jsx';
import { t } from '../electron/i18n/index.mjs';

/** call: main's desktop call; onCreated(project) after local-projects create answered. */
export function SourceNewProjectDialog({ call, initialName = '', onClose, onCreated }) {
  const [name, setName] = useState(initialName), [description, setDescription] = useState(''), [folder, setFolder] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true); setError('');
    try { await onCreated(await call('local-projects', { action: 'create', name, description, folder })); }
    catch (failure) { setError(failure.message); setBusy(false); }
  }
  async function chooseFolder() {
    try { const value = await call('folder', { additional: true }); if (value) setFolder(value); }
    catch (failure) { setError(failure.message); }
  }
  return <SourceDialog title={t('New project')} density="comfortable" onClose={busy ? undefined : onClose}
    footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" busy={busy} disabled={busy || !name.trim()} onClick={create}>{t('Create project')}</Button></>}>
    <form className="surface-project-form flex flex-col gap-lg pt-3" onSubmit={event => { event.preventDefault(); create(); }} data-new-project-dialog="">
      <label className="flex flex-col gap-sm text-body">{t('Name')}<TextInput size="lg" autoFocus required maxLength={200} value={name} onChange={event => setName(event.target.value)} placeholder={t('Billing migration')} disabled={busy} /></label>
      <label className="flex flex-col gap-sm text-body">{t('Description')}<TextArea resize="y" rows={3} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} disabled={busy} /></label>
      <div className="flex flex-col gap-sm text-body"><span>{t('Working folder')}</span><Button variant="secondary" icon="Folder" disabled={busy} onClick={chooseFolder}>{folder || t('Choose folder…')}</Button></div>
      {error && <p role="alert" className="text-danger text-body">{error}</p>}
    </form>
  </SourceDialog>;
}
