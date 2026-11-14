// Settings › Dynamic workflows › Saved workflows: the workflows saved for this project and for every project, from the
// library the running engine reads (main.cjs 'saved-workflows': .claude/workflows for OpenClaude Desktop's engine, a core's own
// library such as ZCode's .zcode/workflows for its engine). Each shows what it is for and the arguments it declares;
// Show in Finder opens its file, and a core library's workflow can be deleted and its earlier runs listed
// ('saved-workflow-delete' / 'saved-workflow-runs'). Running one is /<name> in a session.
import React, { useEffect, useState } from 'react';
import { t } from '../electron/i18n/index.mjs';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { ActionDialog } from './source-session-actions.jsx';

const RUN_STATUS = { pending: 'Queued', running: 'Running', completed: 'Completed', errored: 'Failed', stopped: 'Stopped' };
const argList = (args) => Object.entries(args && typeof args === 'object' ? args : {}).filter(([, value]) => value && typeof value === 'object');
const runTime = (ms) => Number.isFinite(ms) ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function SavedWorkflowsList({ desktopCall, cwd, connected = true, revision = 0 }) {
  const [state, setState] = useState({ status: 'loading', list: [], error: '' });
  const [runs, setRuns] = useState({}), [confirm, setConfirm] = useState(null), [busy, setBusy] = useState(''), [rowError, setRowError] = useState(null), [reload, setReload] = useState(0);
  useEffect(() => {
    if (!cwd || !connected || typeof desktopCall !== 'function') { setState({ status: 'ready', list: [], error: '' }); return undefined; }
    let live = true;
    setState((current) => ({ ...current, status: 'loading' }));
    Promise.resolve(desktopCall('saved-workflows', { cwd })).then((list) => { if (live) setState({ status: 'ready', list: Array.isArray(list) ? list : [], error: '' }); },
      (error) => { if (live) setState({ status: 'error', list: [], error: error?.message || String(error) }); });
    return () => { live = false; };
  }, [cwd, connected, desktopCall, revision, reload]);
  const key = (entry) => `${entry.scope ?? entry.source}:${entry.name}`;
  const act = async (id, run) => {
    setBusy(id); setRowError(null);
    try { await run(); } catch (error) { setRowError({ id, message: error?.message || String(error) }); } finally { setBusy(''); }
  };
  const toggleRuns = (entry) => {
    const id = key(entry);
    if (runs[id]) { setRuns((all) => { const next = { ...all }; delete next[id]; return next; }); return; }
    void act(`runs:${id}`, async () => {
      const result = await desktopCall('saved-workflow-runs', { cwd, name: entry.name, scope: entry.scope });
      setRuns((all) => ({ ...all, [id]: Array.isArray(result?.runs) ? result.runs : [] }));
    });
  };
  const remove = (entry) => act(`delete:${key(entry)}`, async () => {
    await desktopCall('saved-workflow-delete', { cwd, name: entry.name, scope: entry.scope });
    setConfirm(null);
    setReload((n) => n + 1);
  });
  if (!cwd) return <p className="ss-saved-workflows-empty">{t('Open a project to see its saved workflows.')}</p>;
  if (state.status === 'error') return <p className="ss-row-error" role="alert">{state.error}</p>;
  if (state.status === 'loading' && !state.list.length) return <p className="ss-saved-workflows-empty" role="status">{t('Loading…')}</p>;
  if (!state.list.length) return <p className="ss-saved-workflows-empty">{t('No saved workflows yet. Ask for a workflow to be saved after it runs.')}</p>;
  return <>
    <ul className="ss-saved-workflows" aria-label={t('Saved workflows')}>{state.list.map((entry) => {
      const id = key(entry), args = argList(entry.args), core = entry.engine === 'core', shownRuns = runs[id];
      return <li key={id}>
        <div className="ss-saved-workflow-head">
          <span className="ss-workflow-rule-name">/{entry.name}</span>
          <span className="ss-workflow-rule-kind">{entry.source === 'project' || entry.scope === 'project' ? t('Project') : t('All projects')}</span>
          <span className="ss-saved-workflow-actions">
            {entry.path && <SourceSettingsButton size="sm" variant="ghost" disabled={!!busy} onClick={() => void act(`reveal:${id}`, () => desktopCall('saved-workflow-reveal', { path: entry.path }))}>{t('Show in Finder')}</SourceSettingsButton>}
            {core && <SourceSettingsButton size="sm" variant="ghost" aria-expanded={!!shownRuns} busy={busy === `runs:${id}`} disabled={!!busy} onClick={() => toggleRuns(entry)}>{t('Runs')}</SourceSettingsButton>}
            {core && <SourceSettingsButton size="sm" variant="secondary" disabled={!!busy} aria-label={t('Delete {name}', { name: entry.name })} onClick={() => setConfirm(entry)}>{t('Delete')}</SourceSettingsButton>}
          </span>
        </div>
        {entry.description && <p className="ss-saved-workflow-description">{entry.description}</p>}
        {args.length > 0 && <ul className="ss-saved-workflow-args" aria-label={t('Arguments')}>{args.map(([name, value]) => <li key={name}>
          <code>{name}</code> <span>{[value.type || 'string', value.required ? t('required') : t('optional')].join(' · ')}</span>{value.description && <span> — {value.description}</span>}
        </li>)}</ul>}
        {rowError?.id?.endsWith(id) && <p className="ss-row-error" role="alert">{rowError.message}</p>}
        {shownRuns && (shownRuns.length ? <ul className="ss-saved-workflow-runs" aria-label={t('Runs of {name}', { name: entry.name })}>{shownRuns.map((run) => <li key={run.runId}>
          <span>{t(RUN_STATUS[run.status] ?? 'Completed')}</span><span>{runTime(run.createdAt)}</span>{Number.isFinite(run.spentTokens) && <span>{t('{count} tokens', { count: run.spentTokens.toLocaleString() })}</span>}
        </li>)}</ul> : <p className="ss-saved-workflows-empty">{t('It hasn’t run in this project yet.')}</p>)}
      </li>;
    })}</ul>
    {confirm && <ActionDialog title={t('Delete {name}?', { name: confirm.name })} onClose={() => setConfirm(null)}>
      <p>{t('Its file is removed. Runs that already happened keep their results.')}</p>
      {rowError?.id === `delete:${key(confirm)}` && <p className="ss-row-error" role="alert">{rowError.message}</p>}
      <div className="ss-saved-workflow-confirm">
        <SourceSettingsButton size="sm" variant="secondary" onClick={() => setConfirm(null)}>{t('Cancel')}</SourceSettingsButton>
        <SourceSettingsButton size="sm" variant="danger" busy={busy === `delete:${key(confirm)}`} disabled={!!busy} onClick={() => void remove(confirm)}>{t('Delete')}</SourceSettingsButton>
      </div>
    </ActionDialog>}
  </>;
}
