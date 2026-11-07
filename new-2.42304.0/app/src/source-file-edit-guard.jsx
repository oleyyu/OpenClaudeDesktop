import React, { useEffect, useSyncExternalStore } from 'react';
import { pathBasename } from "./host-path-model.mjs";
import { SourceConfirmationDialog } from './source-dialog.jsx';
import { fileEditGuards } from './file-edit-store.mjs';
import { t } from '../electron/i18n/index.mjs';
export function SourceFileEditGuard() {
  const intent = useSyncExternalStore(fileEditGuards.subscribe, fileEditGuards.getSnapshot, fileEditGuards.getSnapshot);
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
  const name = intent.editors.map(editor => pathBasename(editor.path)).join(', ');
  return <SourceConfirmationDialog title={t('Discard unsaved changes?')}
    body={t(intent.leavesSession ? 'Your edits to {name} have not been saved. Leaving this session discards them.' : 'Your edits to {name} have not been saved. Leaving this tab discards them.', { name })}
    pending={intent.editors.some(editor => editor.getSnapshot().saving)} confirmLabel={t('Discard')} cancelLabel={t('Keep editing')} confirmVariant="danger" initialFocus="cancel"
    onCancel={fileEditGuards.cancel} onConfirm={fileEditGuards.discard} />;
}
