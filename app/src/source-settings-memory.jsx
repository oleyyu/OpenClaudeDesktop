import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SettingRow } from './source-settings-kit.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSwitch } from './source-switch.jsx';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { Icon } from './icons';
import { CdsRadioGroup } from './generated/view-tabs/index.js';
import { MemoryPreviewContent } from './generated/chat-knowledge/index.mjs';
import { ChatMemoryHostContext } from './source-chat-knowledge-adapters.jsx';
import { getLocale, t } from '../electron/i18n/index.mjs';

// w13-chatfn-memory: Settings › Memory (research/w13-chatfn.md M1–M3). The rows follow 3.6556.2 c6bba3086:
//   Sn  "Search and reference chats" (switch)
//   En  "Generate memory from chat history" (switch; turning it off opens kn "Turn off memory": Pause / Reset), with
//       yt below it: "Chat memory · No memory yet", or the "View and manage memory · Updated {time}" button that opens
//   O   (c274117ff) "Manage memory": the summary (cffc9ea71 w), "Tell Claude what to remember or forget" (E) and
//       "Manage edits" (D / O: Remove edit, Clear edits, Save changes, Back to memory).
// The official "<a>Learn more</a>" links go to claude.ai help pages about the account memory; this memory lives on the
// computer (main: chat-memory.mjs), so the sentences end before the link, as Settings › Code's bypass row does.
// The page is a Settings section ({id:'memory'}): official desktop nav lists "Memory" (shared-46: id memory,
// testId memory-settings) after Capabilities.

const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
export const MEMORY_COPY = Object.freeze({
  title: 'Memory',
  referenceLabel: 'Search and reference chats',
  referenceDescription: 'Allow Claude to search for relevant details in past chats.',
  generateLabel: 'Generate memory from chat history',
  // En vt description: userSetting undefined (never chosen) / chosen; `w` = Cowork available.
  generateFirst: 'Allow Claude to remember relevant context from your chats. Memory includes your entire chat history with Claude.',
  generateFirstCowork: 'Allow Claude to remember relevant context from your chats and Cowork sessions. Memory includes your entire chat history with Claude.',
  generateChosen: 'Allow Claude to remember relevant context from your chats. This setting controls memory for both chats and projects.',
  generateChosenCowork: 'Allow Claude to remember relevant context from your chats and Cowork sessions. This setting also applies to projects.',
  chatMemory: 'Chat memory',
  noMemory: 'No memory yet',
  viewAndManage: 'View and manage memory',
  updated: 'Updated {time}',
  turnOff: 'Turn off memory',
  pause: 'Pause memory',
  pauseDescription: 'Claude keeps its existing memory but won’t use memory or make new memories.',
  reset: 'Reset memory',
  resetDescription: 'This will permanently delete all memories, including project memories. This can’t be undone.',
  cancel: 'Cancel',
  manage: 'Manage memory',
  manageDescription: 'Here’s what Claude remembers about you! This summary is regenerated each night and does not include projects, which have their own specific memory.',
  // c274117ff O for a project.
  manageProject: 'Manage project memory',
  manageProjectDescription: 'Claude regenerates project memory every evening from your past chats in this project. Only you can see this memory, and it is not shared with other project users.',
  updating: 'Updating memory...',
  editLabel: 'Tell Claude what to remember or forget',
  editPlaceholder: 'Tell Claude what to remember or forget...',
  maxEdits: 'Maximum edits reached',
  submit: 'Submit',
  manageEdits: 'Manage edits',
  backToMemory: 'Back to memory',
  saveChanges: 'Save changes',
  clearEdits: 'Clear edits',
  removeEdit: 'Remove edit',
  allEditsCleared: 'All edits cleared',
  settingError: 'Couldn’t update memory setting. Please try again.',
  regenerateError: 'Couldn’t regenerate memory right now',
});
// Local edit limits (chat-memory.mjs MAX_CONTROLS / CONTROL_MAX_CHARS; the official ones come from the server).
export const MEMORY_MAX_EDITS = 30, MEMORY_EDIT_MAX_CHARS = 500;

export function generateDescription({ chosen, cowork }) {
  return t(chosen ? (cowork ? MEMORY_COPY.generateChosenCowork : MEMORY_COPY.generateChosen) : (cowork ? MEMORY_COPY.generateFirstCowork : MEMORY_COPY.generateFirst));
}
export function memoryUpdatedLabel(updatedAt, locale = getLocale()) {
  const date = typeof updatedAt === 'string' ? new Date(updatedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  let time;
  try { time = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date); } catch { time = date.toISOString().slice(0, 10); }
  return t(MEMORY_COPY.updated, { time });
}

/** yt: the summary row under "Generate memory from chat history" (only while memory is on). */
export function MemorySummary({ loading, memory, onOpen }) {
  if (loading) return <div data-cds="Skeleton" role="status" className="relative max-w-full overflow-hidden bg-[var(--cds-skeleton-base)] !h-control-lg !w-full !rounded-lg"><span className="sr-only">{t('Loading')}</span></div>;
  if (!memory?.memory) return <div className="flex w-full items-center justify-between rounded-lg bg-surface-1 px-md py-sm text-start cursor-default" data-memory-summary="empty">
    <span className="min-w-0 truncate"><span className="text-body text-primary">{t(MEMORY_COPY.chatMemory)}</span><span className="text-footnote text-muted-as-secondary">{' · '}{t(MEMORY_COPY.noMemory)}</span></span>
  </div>;
  const updated = memoryUpdatedLabel(memory.updated_at);
  return <button type="button" onClick={onOpen} data-memory-summary="" className="cds-reset flex w-full items-center justify-between rounded-lg bg-alpha-1 px-md py-sm text-start transition-colors hover:bg-alpha-2 focus-visible:shadow-focus">
    <span className="min-w-0 truncate"><span className="text-body text-primary">{t(MEMORY_COPY.viewAndManage)}</span>{updated && <span className="text-footnote text-muted-as-secondary">{' · '}{updated}</span>}</span>
    <Icon name="CaretRight" size={16} className="shrink-0 text-secondary"/>
  </button>;
}

/** kn: "Turn off memory" — Pause (keep) or Reset (delete everything). */
export function MemoryTurnOffDialog({ open, onClose, onConfirm }) {
  const [choice, setChoice] = useState('pause'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (open) { setChoice('pause'); setError(''); } }, [open]);
  const options = [{ value: 'pause', label: t(MEMORY_COPY.pause), description: t(MEMORY_COPY.pauseDescription) },
    { value: 'reset', label: t(MEMORY_COPY.reset), description: t(MEMORY_COPY.resetDescription) }];
  return <SourceDialog open={open} size="md" layer={SETTINGS_LAYER} title={t(MEMORY_COPY.turnOff)} onClose={() => { if (!busy) onClose(); }} className="memory-turn-off-dialog">
    <div className="rounded-2xl bg-surface-0 p-4 flex flex-col gap-4"><CdsRadioGroup value={choice} onChange={setChoice} options={options}/></div>
    {error && <p className="ss-error" role="alert">{error}</p>}
    <SourceDialogFooter>
      <SourceSettingsButton variant="secondary" disabled={busy} onClick={onClose}>{t(MEMORY_COPY.cancel)}</SourceSettingsButton>
      <SourceSettingsButton variant={choice === 'reset' ? 'danger' : 'primary'} busy={busy} onClick={async () => {
        setBusy(true); setError('');
        try { await onConfirm(choice); onClose(); } catch { setError(t(MEMORY_COPY.settingError)); } finally { setBusy(false); }
      }}>{t(choice === 'pause' ? MEMORY_COPY.pause : MEMORY_COPY.reset)}</SourceSettingsButton>
    </SourceDialogFooter>
  </SourceDialog>;
}

/**
 * c274117ff O: "Manage memory" (lg dialog; its header names the view — "Manage memory" / "Manage project memory" for
 * a project, "Manage edits" — with the account or project description) around the sliced cffc9ea71 w
 * (MemoryPreviewContent, src/generated/chat-knowledge): the synthesis box (T: the memory as Chat Markdown, the clay
 * gradient, "Updating memory..."), the edit field (E: "Tell Claude what to remember or forget" with the c6bd2cd90
 * rotating placeholders, Submit, "Maximum edits reached"), "Manage edits" (D) and the edits view (O). Its services are
 * ChatMemoryHostContext (source-chat-knowledge-adapters.jsx): this memory, and onControls for an edit.
 */
export function MemoryManageDialog({ open, onClose, memory, busy, error, onControls, initialView = 'synthesis', projectId = null }) {
  const [view, setView] = useState(initialView);
  useEffect(() => { if (open) setView(initialView); }, [open]);
  const host = useMemo(() => ({ available: true, query: { data: memory ?? undefined }, pending: busy === true,
    update: ({ controls } = {}) => onControls?.(Array.isArray(controls) ? controls : []) }), [memory, busy, onControls]);
  if (!memory?.memory) return null;
  const title = view === 'synthesis' ? (projectId ? MEMORY_COPY.manageProject : MEMORY_COPY.manage) : MEMORY_COPY.manageEdits;
  return <SourceDialog open={open} size="lg" layer={SETTINGS_LAYER} title={t(title)}
    description={t(projectId ? MEMORY_COPY.manageProjectDescription : MEMORY_COPY.manageDescription)} showClose={!busy} onClose={() => { if (!busy) onClose(); }} className="memory-manage-dialog">
    <ChatMemoryHostContext.Provider value={host}>
      <MemoryPreviewContent projectUuid={projectId ?? undefined} modalView={view} setModalView={setView} isUpdating={busy === true} />
      {error && <p className="ss-error" role="alert">{error}</p>}
    </ChatMemoryHostContext.Provider>
  </SourceDialog>;
}

/** Settings › Memory. `initialState` (tests): a chat-memory state instead of reading it from main. */
export function SourceSettingsMemory({ desktopCall, boot, initialState = null }) {
  const [state, setState] = useState(initialState), [errors, setErrors] = useState({}), [turnOff, setTurnOff] = useState(false), [manage, setManage] = useState(false);
  const [updating, setUpdating] = useState(false), [manageError, setManageError] = useState('');
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    if (!initialState) Promise.resolve(desktopCall?.('chat-memory', { op: 'state' })).then(value => { if (live.current && value?.settings) setState(value); }, () => {});
    return () => { live.current = false; };
  }, []);
  // While main writes a memory (the first one after turning memory on), read the state again until it is done.
  useEffect(() => {
    if (initialState || !state?.synthesizing) return undefined;
    const timer = setTimeout(() => { Promise.resolve(desktopCall?.('chat-memory', { op: 'state' })).then(value => { if (live.current && value?.settings) setState(value); }, () => {}); }, 3000);
    return () => clearTimeout(timer);
  }, [state]);
  const settings = state?.settings ?? null;
  const active = !!settings && settings.enabled === true && settings.paused !== true;
  const cowork = boot?.coworkEnabled !== false;
  // c6bba3086 En `C.userSetting===void 0`: the generate switch was never chosen (chat-memory settings.userSetting).
  const chosen = settings?.userSetting !== undefined && settings?.userSetting !== null;
  const change = async (rowId, payload) => {
    setErrors(value => ({ ...value, [rowId]: null }));
    try { const next = await desktopCall('chat-memory', payload); if (live.current && next?.settings) setState(next); return next; }
    catch (error) { if (live.current) setErrors(value => ({ ...value, [rowId]: error?.message || String(error) })); throw error; }
  };
  const controls = async next => {
    setUpdating(true); setManageError('');
    try { const value = await desktopCall('chat-memory', { op: 'controls', controls: next }); if (live.current && value?.settings) setState(value); }
    catch { if (live.current) setManageError(t(MEMORY_COPY.regenerateError)); }
    finally { if (live.current) setUpdating(false); }
  };
  const rowError = id => errors[id] ? t(MEMORY_COPY.settingError) : null;
  const rows = [
    { id: 'memory-reference-chats', label: t(MEMORY_COPY.referenceLabel), description: t(MEMORY_COPY.referenceDescription),
      control: <SourceSwitch label={t(MEMORY_COPY.referenceLabel)} checked={settings?.referenceChats === true} disabled={!settings}
        onChange={value => { void change('memory-reference-chats', { op: 'settings', referenceChats: value }).catch(() => {}); }}/>,
      below: rowError('memory-reference-chats') && <span className="ss-row-error">{rowError('memory-reference-chats')}</span> },
    { id: 'memory-generate', label: t(MEMORY_COPY.generateLabel), description: generateDescription({ chosen, cowork }),
      control: <SourceSwitch label={t(MEMORY_COPY.generateLabel)} checked={active} disabled={!settings}
        onChange={value => { if (value) void change('memory-generate', { op: 'settings', enabled: true }).catch(() => {}); else setTurnOff(true); }}/>,
      below: <>{rowError('memory-generate') && <span className="ss-row-error">{rowError('memory-generate')}</span>}
        {active && <div className="flex flex-col gap-4 pt-md w-full"><MemorySummary loading={!state} memory={state?.memory} onOpen={() => setManage(true)}/></div>}</> },
  ];
  return <section className="ss-group" data-settings-memory="">
    <h3 tabIndex={-1} className="text-heading-semibold settings-row-title">{t(MEMORY_COPY.title)}</h3>
    <div className="settings-group-dividers">{rows.map(row => <SettingRow key={row.id} row={row}/>)}</div>
    <MemoryTurnOffDialog open={turnOff} onClose={() => setTurnOff(false)} onConfirm={choice => change('memory-generate', { op: 'turn-off', reset: choice === 'reset' })}/>
    <MemoryManageDialog open={manage} onClose={() => setManage(false)} memory={state?.memory} busy={updating || state?.synthesizing === true} error={manageError} onControls={controls}/>
  </section>;
}
