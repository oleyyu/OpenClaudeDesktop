// A draft outlives its viewer: temporary pane/split remounts must not lose edits.
// Explicit navigation runs the same discard intent used by the original pane.
const editors = new Map(), listeners = new Set(), detachedFailures = new Set();
let intent = null, navigation = 0;
const emit = () => { if (intent) intent = { ...intent }; listeners.forEach(fn => fn()); };
export const fileEditGuards = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getSnapshot: () => intent,
  dirty: () => [...editors.values()].filter(editor => editor.dirty),
  cancel() { navigation++; intent = null; emit(); },
  discard() {
    const pending = intent;
    if (!pending || pending.editors.some(editor => editor.getSnapshot().saving)) return;
    intent = null;
    pending.editors.forEach(editor => editor.discard());
    emit(); pending.run();
  },
};
// El pauseRefetch / skipWriteRefetch (cd2efac6e :3375-3376, c4e0cfada X): a file with unsaved edits in its viewer is
// never re-read under the editor by focus, staleness or an agent edit.
export function hasDirtyFileEdit({ sessionId, path } = {}) {
  return fileEditGuards.dirty().some(editor => (sessionId === undefined || editor.sessionId === sessionId) && editor.path === path);
}
export function guardFileEdits(run, { sessionId, key, paths, leavesSession = false } = {}) {
  const dirty = fileEditGuards.dirty().filter(editor =>
    (sessionId === undefined || editor.sessionId === sessionId) &&
    (key === undefined || editor.key === key) && (!paths || paths.includes(editor.path)));
  if (!dirty.length) { navigation++; return false; }
  if (dirty.some(editor => editor.autoSave && !editor.getSnapshot().error)) {
    const request = ++navigation;
    void Promise.all(dirty.map(editor => editor.flushAutoSave())).then(() => {
      if (request !== navigation) return;
      if (!guardFileEdits(run, { sessionId, key, paths, leavesSession })) run();
    });
    return true;
  }
  intent = { run, editors: dirty, leavesSession }; emit(); return true;
}
// 3.6556.2 cd2efac6e Hy: a draft whose viewer is gone (Ru.current is null after the view detaches) still auto-saves;
// a failed write then reports through an error toast, by kind: conflict, missing (changed on disk to deleted), denied,
// hook_denied (deniedReason "hook_manager_package_key") or failed. Listeners get { editor, kind }.
export function onDetachedSaveFailure(fn) { detachedFailures.add(fn); return () => detachedFailures.delete(fn); }
export function detachedSaveFailureKind(result) {
  const status = result?.status;
  if (status === 'conflict') return result.currentHash === null ? 'missing' : 'conflict';
  if (status === 'missing') return 'missing';
  if (status === 'denied') return result.deniedReason === 'hook_manager_package_key' ? 'hook_denied' : 'denied';
  return 'failed';
}
export function getFileEditor({ key, path, sessionId, text, hash, save }) {
  let editor = editors.get(key);
  if (editor) {
    editor.saveFile = save;
    if (!editor.dirty && editor.readHash !== hash) { editor.reset(text, hash); editor.readHash = hash; }
    return editor;
  }
  let state = { text, baseText: text, baseHash: hash, saving: false, error: null };
  let autoSave = false, timer = null, pending = null, views = 0;
  const clearTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const schedule = () => {
    clearTimer();
    if (autoSave && state.text !== state.baseText && !state.error) timer = setTimeout(() => { timer = null; void editor.save(); }, 1000);
  };
  const subscribers = new Set();
  const update = patch => { state = { ...state, ...patch }; subscribers.forEach(fn => fn()); emit(); };
  editor = {
    key, path, sessionId, readHash: hash, saveFile: save,
    get autoSave() { return autoSave; },
    // A mounted viewer of this draft; returns its detach.
    attachView() { views++; let attached = true; return () => { if (attached) { attached = false; views--; } }; },
    get attached() { return views > 0; },
    setAutoSave(enabled) { if (autoSave === enabled) return; autoSave = enabled; clearTimer(); emit(); if (enabled) void editor.save(); },
    flushAutoSave() { clearTimer(); return autoSave ? editor.save() : Promise.resolve(); },
    get dirty() { return state.text !== state.baseText || state.saving; },
    getSnapshot: () => state,
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    change(text) { update({ text, ...(text === state.baseText ? { error: null } : {}) }); schedule(); },
    reset(text, hash) { clearTimer(); update({ text, baseText: text, baseHash: hash, error: null }); },
    discard() { clearTimer(); if (!state.saving) update({ text: state.baseText, error: null }); },
    save({ override = false } = {}) {
      clearTimer();
      if (pending) return pending;
      if (!editor.dirty || state.error && !override) return Promise.resolve();
      const sent = state.text, expectedHash = override && state.error?.status === 'conflict' ? state.error.currentHash : state.baseHash;
      update({ saving: true });
      // The async boundary lets pending be assigned even for a synchronous adapter failure.
      pending = Promise.resolve().then(async () => {
        let result;
        try { result = await editor.saveFile(sent, expectedHash); } catch { result = { status: 'failed' }; }
        if (result?.status === 'saved') update({ saving: false, baseText: sent, baseHash: result.hash, error: null });
        else {
          update({ saving: false, error: result ?? { status: 'failed' } });
          if (views === 0) { const kind = detachedSaveFailureKind(result); detachedFailures.forEach(fn => fn({ editor, kind })); }
        }
        pending = null;
        // Original Bp/u: retain the newest draft during a write and chain against its returned hash.
        if (autoSave && result?.status === 'saved' && state.text !== state.baseText) return editor.save();
        return result;
      });
      return pending;
    },
  };
  editors.set(key, editor);
  return editor;
}
