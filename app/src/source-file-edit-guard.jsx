import React, { useEffect, useSyncExternalStore } from 'react';
import { SourceConfirmationDialog } from './source-dialog.jsx';
import { fileEditGuards, onDetachedSaveFailure } from './file-edit-store.mjs';
import { useSourceToasts } from './source-toast.jsx';
import { t } from '../electron/i18n/index.mjs';
// 3.6556.2 cd2efac6e Hy: the error toast of an auto-save that failed after its viewer detached, `{name}` the file's
// basename (yn); messageForLogging "file editor auto-save … after detach" is a log label, not shown.
export function detachedSaveFailureMessage(kind, name) {
  return kind === 'conflict' ? t('Your changes to {name} weren’t saved because the file changed on disk. Reopen the file to see the latest version.', { name })
    : kind === 'missing' ? t('Your changes to {name} weren’t saved because the file was deleted on disk.', { name })
      : kind === 'denied' ? t('Your changes to {name} weren’t saved because this session can’t write to that file. Edit it in your editor or terminal instead.', { name })
        : kind === 'hook_denied' ? t('Your changes to {name} weren’t saved because they change Git-hook tool settings (lint-staged, husky, commitlint, …), which can’t be saved from here. Make that change in your editor or terminal; other edits to the file save normally.', { name })
          : t('Your changes to {name} couldn’t be saved. Reopen the file and try again.', { name });
}
export function SourceFileEditGuard() {
  const intent = useSyncExternalStore(fileEditGuards.subscribe, fileEditGuards.getSnapshot, fileEditGuards.getSnapshot);
  const toasts = useSourceToasts();
  useEffect(() => onDetachedSaveFailure(({ editor, kind }) => {
    toasts?.add(detachedSaveFailureMessage(kind, editor.path.split('/').at(-1)), { variant: 'danger' });
  }), [toasts]);
  useEffect(() => {
    const protect = event => {
      if (fileEditGuards.dirty().length) { event.preventDefault(); event.returnValue = false; }
    };
    const flush = () => Promise.all(fileEditGuards.dirty().map(editor => editor.flushAutoSave()));
    const offFlush = window.desktop?.onFileAutosaveFlush?.(flush);
    const report = () => { const dirty = fileEditGuards.dirty(); window.desktop?.setFileEditDirty?.({ paths: dirty.map(editor => editor.path), autoSave: dirty.some(editor => editor.autoSave && !editor.getSnapshot().error) }); };
    report();
    const unsubscribe = fileEditGuards.subscribe(report);
    window.addEventListener('beforeunload', protect);
    return () => { offFlush?.(); unsubscribe(); window.removeEventListener('beforeunload', protect); };
  }, []);
  if (!intent) return null;
  const name = intent.editors.map(editor => editor.path.split('/').at(-1)).join(', ');
  return <SourceConfirmationDialog title={t('Discard unsaved changes?')}
    body={t(intent.leavesSession ? 'Your edits to {name} have not been saved. Leaving this session discards them.' : 'Your edits to {name} have not been saved. Leaving this tab discards them.', { name })}
    pending={intent.editors.some(editor => editor.getSnapshot().saving)} confirmLabel={t('Discard')} cancelLabel={t('Keep editing')} confirmVariant="danger" initialFocus="cancel"
    onCancel={fileEditGuards.cancel} onConfirm={fileEditGuards.discard} />;
}
