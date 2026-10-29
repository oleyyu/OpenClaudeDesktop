import React, { useEffect, useRef, useState } from 'react';
import { SettingRow } from './source-settings-kit.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { useSourceToasts } from './source-toast.jsx';
import { CdsIcon, CdsSegmentedControl } from './generated/view-tabs/index.js';
import { DateRangeSelector } from './generated/chat-export/date-range-selector.mjs';
import { isValidDateRange } from './generated/chat-export/date-range.mjs';
import { loadThreadHistory, readParams } from './thread-history-model.mjs';
import { shownThread, shownTurns } from './composer-attachments-model.mjs';
import { transcriptMarkdown } from './slash-actions-model.mjs';
import { rpcResult } from './rpc-error.mjs';
import { t } from '../electron/i18n/index.mjs';

// w13-chatfn-history (research/w13-chatfn.md H8, chatfn-47): Settings › Privacy (shared-46 `e.push({id:"data-privacy-controls",
// …label "Privacy"…,icon:Dp,testId:"data-privacy-controls"})`, Dp = LockShield; ca25db325 lists "Export data" in that
// section) with the official export row and dialog, cf400e6a4:
//   uL   the row (va): label "Export data", control a secondary sm Button "Export data", busy while the export runs, and
//        the md Dialog: Header (showClose) "Export data", lYe, Footer Cancel / Export (data-testid export-confirm-button);
//        `onClick: () => { s(!1), a.submit() }` closes the dialog first; cYe's onSuccess toasts "Export started".
//   lYe  a member's own data (ownDataOnly): "Conversations from" (va) with the segmented control
//        (aria-label "Conversations period"; All / 30 days / 90 days / Custom; under it, for Custom, c1751bc30 qO = the
//        c71ba149d DateRangeSelector with maxDate only), then the section "Export will include" (h3 text-body
//        text-primary) and c1ec8a7a7's check list with "Your conversations".
//   cYe  the range starts 180 days before today and ends today (local days, shared-78 FD); while it is invalid
//        (c1751bc30 SIe) Export is disabled (uL `disabled: a.customRangeInvalid`).
// Local differences: the export is written to a folder the user picks (electron/chat-export.mjs), not mailed, so the
// dialog has no "A download link will be sent to your email…" description. The selector is imported directly
// (src/generated/chat-export, scripts/extract-chat-export.mjs), not through c1751bc30's lazy loader (skeleton height 68).
// The finished folder is shown in Finder.

export const PRIVACY_COPY = Object.freeze({
  title: 'Privacy',
  exportData: 'Export data',
  conversationsFrom: 'Conversations from',
  conversationsPeriod: 'Conversations period',
  willInclude: 'Export will include',
  yourConversations: 'Your conversations',
  cancel: 'Cancel',
  export: 'Export',
  started: 'Export started',
});
// lYe `_`: the conversation periods.
export const EXPORT_PERIOD_SEGMENTS = Object.freeze([
  Object.freeze({ value: 'all', label: 'All' }),
  Object.freeze({ value: '30d', label: '30 days' }),
  Object.freeze({ value: '90d', label: '90 days' }),
  Object.freeze({ value: 'custom', label: 'Custom' }),
]);
/** shared-78 FD: a date as the local day "YYYY-MM-DD" (cYe's today, s, and its default start, c). */
export function localDay(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** cYe `c`: 180 days before `today` (a local day). */
export function defaultRangeStart(today) {
  const date = new Date(`${today}T00:00:00`);
  date.setDate(date.getDate() - 180);
  return localDay(date);
}
const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });

/**
 * One export: main asks for the folder and lists the chats ("begin"); each chat's full history is read the way /export
 * reads it (thread/read, loadThreadHistory, shownThread / shownTurns, transcriptMarkdown) and handed over; "finish"
 * writes conversations.json, the artifacts and the memory. null when the folder picker was canceled.
 */
export async function runChatExport(desktopCall, { period = 'all', range = null, includeCowork = false, onStarted } = {}) {
  const begun = await desktopCall('chat-export', { op: 'begin', period, ...(period === 'custom' && range ? { from: range.from, to: range.to } : {}), includeCowork });
  if (!begun?.exportId) return null;
  onStarted?.(begun);
  const rpc = (method, params = {}) => Promise.resolve(desktopCall('rpc', { method, params })).then(rpcResult);
  for (const thread of begun.threads ?? []) {
    try {
      const read = await rpc('thread/read', readParams(thread.id, thread));
      const history = await loadThreadHistory(rpc, { threadId: thread.id, thread: read.thread });
      if (history.truncated || history.unavailable) throw new Error('Conversation history is incomplete.');
      const turns = shownTurns(history.turns);
      await desktopCall('chat-export', { op: 'conversation', exportId: begun.exportId, threadId: thread.id, markdown: transcriptMarkdown(shownThread(read.thread), turns), turns });
    } catch (error) {
      await desktopCall('chat-export', { op: 'fail', exportId: begun.exportId, threadId: thread.id, reason: error?.message || String(error) });
    }
  }
  return desktopCall('chat-export', { op: 'finish', exportId: begun.exportId });
}

/** c1ec8a7a7 m / f: the check list ("inline-flex flex-col gap-1 text-start", rows "flex gap-2"). */
function ExportPoints({ points }) {
  return <ul role="list" className="inline-flex flex-col gap-1 text-start">
    {points.map(point => <li key={point} className="flex gap-2"><span className="flex h-lh shrink-0 items-center"><CdsIcon name="Check" size="sm" className="text-muted-as-secondary"/></span>{point}</li>)}
  </ul>;
}

/** uL's Dialog with lYe's member form. onExport(period, range) runs after the dialog closes (range for "custom"). */
export function ExportDataDialog({ open, onClose, onExport, today: todayProp }) {
  const today = todayProp ?? localDay(new Date());
  const [period, setPeriod] = useState('all'), [fromDate, setFromDate] = useState(null), [toDate, setToDate] = useState(null);
  useEffect(() => { if (open) { setPeriod('all'); setFromDate(null); setToDate(null); } }, [open]);
  // cYe: p = l ?? c (180 days back), m = d ?? s (today); S = custom && !SIe({ fromDate: p, toDate: m, maxDate: s }).
  const from = fromDate ?? defaultRangeStart(today), to = toDate ?? today;
  const customRangeInvalid = period === 'custom' && !isValidDateRange({ fromDate: from, toDate: to, maxDate: today });
  return <SourceDialog open={open} size="md" layer={SETTINGS_LAYER} title={t(PRIVACY_COPY.exportData)} onClose={onClose} className="export-data-dialog">
    <div className="flex flex-col">
      <div className="flex flex-col gap-sm">
        <SettingRow row={{ id: 'export-conversations-from', label: t(PRIVACY_COPY.conversationsFrom),
          control: <CdsSegmentedControl aria-label={t(PRIVACY_COPY.conversationsPeriod)} segments={EXPORT_PERIOD_SEGMENTS.map(entry => ({ value: entry.value, label: t(entry.label) }))}
            value={period} onChange={setPeriod}/> }}/>
        {period === 'custom' && <DateRangeSelector fromDate={from} toDate={to} onFromDateChange={setFromDate} onToDateChange={setToDate} maxDate={today}/>}
      </div>
      <section className="flex flex-col gap-sm py-md">
        <h3 className="text-body text-primary">{t(PRIVACY_COPY.willInclude)}</h3>
        <ExportPoints points={[t(PRIVACY_COPY.yourConversations)]}/>
      </section>
    </div>
    <SourceDialogFooter>
      <SourceSettingsButton variant="secondary" onClick={onClose}>{t(PRIVACY_COPY.cancel)}</SourceSettingsButton>
      <SourceSettingsButton variant="primary" disabled={customRangeInvalid} data-testid="export-confirm-button" onClick={() => { onClose(); onExport(period, period === 'custom' ? { from, to } : null); }}>{t(PRIVACY_COPY.export)}</SourceSettingsButton>
    </SourceDialogFooter>
  </SourceDialog>;
}

/** Settings › Privacy: the "Export data" row. Cowork tasks are exported with the chats while Cowork is on. */
export function SourceSettingsPrivacy({ desktopCall, boot, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const toasts = useSourceToasts?.() ?? null;
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const exportData = async (period, range) => {
    setBusy(true); setError('');
    try {
      await runChatExport(desktopCall, { period, range, includeCowork: boot?.coworkEnabled !== false, onStarted: () => toasts?.add(t(PRIVACY_COPY.started)) });
    } catch (failure) {
      if (live.current) setError(t(failure?.message || 'The request failed.'));
    } finally { if (live.current) setBusy(false); }
  };
  const row = { id: 'export-data', label: t(PRIVACY_COPY.exportData),
    control: <SourceSettingsButton variant="secondary" size="sm" busy={busy} onClick={() => setOpen(true)}>{t(PRIVACY_COPY.exportData)}</SourceSettingsButton>,
    below: error ? <span className="ss-row-error" role="alert">{error}</span> : null };
  return <section className="ss-group" data-settings-privacy="">
    <h3 tabIndex={-1} className="text-heading-semibold settings-row-title">{t(PRIVACY_COPY.title)}</h3>
    <div className="settings-group-dividers"><SettingRow row={row}/></div>
    <ExportDataDialog open={open} onClose={() => setOpen(false)} onExport={(period, range) => { void exportData(period, range); }}/>
  </section>;
}
