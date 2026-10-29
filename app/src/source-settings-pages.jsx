import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import {SourceDisclosure} from './source-disclosure.jsx';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {SourceStorageMeter} from './source-storage-meter.jsx';
import {SourceTimestamp} from './source-timestamp.jsx';
import {SourceTooltip} from './source-tooltip.jsx';
import {SourceDialog} from './source-dialog.jsx';
import {SourceSegments} from './source-segments.jsx';
import {useSourceToasts} from './source-toast.jsx';
import {CLEANUP_WINDOWS,DEFAULT_CLEANUP_CHOICES,announcedProgress,cleanupAcknowledgeLabel,cleanupActionCount,cleanupCanConfirm,cleanupConfirmLabel,cleanupConfirmVariant,
  cleanupDeleteLabel,cleanupEmptyText,cleanupErrorText,cleanupHasAnything,cleanupOutcome,cleanupProgressLabel,cleanupSummary,cleanupUncommittedLabel,cleanupVerb} from './storage-cleanup-model.mjs';
import {storageKinds} from './storage-meter-model.mjs';
import mcpEmpty from './generated/mcp-empty.json';
import { joinArguments } from './customize-model.mjs';
import { mcpStatus } from './settings-model.mjs';
import { canRemoveDeveloperServer } from './developer-server-actions.mjs';
import { t, tn } from '../electron/i18n/index.mjs';
import { CdsBadge, CdsCheckbox } from './generated/view-tabs/index.js';
import './source-settings-pages.css';

// menus C5: 3.6556.2 moved Developer › Local MCP servers into c8828a060-Co46iXy1, whose header status is the CDS Badge
// (shared-frame Ps, exported ad = view-tabs CdsBadge) — `S = y === "running" ? "success" : y === "failed" ||
// y === "not_responding" ? "danger" : "neutral"`, `n(c,{variant:S,children:x})` — instead of the 2.42304.0 hand-styled
// pill (bg-fill-accent-hover / bg-fill-danger-hover / bg-brand-200). Starting is neutral now; the host has no
// not_responding state.
export const mcpStatusBadgeVariant = status => status === 'Running' ? 'success' : status === 'Failed' ? 'danger' : 'neutral';

// c71860c77-CCdfSDER j/N: real configured servers on the left, the selected
// server's transport and runtime facts on the right. Missing status is unknown.
export function DeveloperServers({ desktop, connected, pending, onEditConfig, onDocs, onRemove, error }) {
  const [selected, setSelected] = useState(null);
  const [removal, setRemoval] = useState({ name: null, error: '' });
  const removing = useRef(false), live = useRef(true);
  const root = useRef(null), actionFocus = useRef(null);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    if (removal.name || !actionFocus.current) return;
    const previous = actionFocus.current; actionFocus.current = null;
    if (![document.body, document.documentElement].includes(document.activeElement)) return;
    const target = previous.isConnected && !previous.disabled ? previous : root.current?.querySelector('.ss-mcp-list [aria-current], .ssp-button:not(:disabled)');
    target?.focus({ preventScroll: true });
  }, [removal.name]);
  const definitions = desktop?.mcpDefinitions || [];
  const statuses = desktop?.servers || [];
  const names = [...new Set([...definitions.map(server => server.name), ...statuses.map(server => server.name)])];
  const selectedName = names.includes(selected) ? selected : names[0];
  const definition = definitions.find(server => server.name === selectedName);
  const server = statuses.find(server => server.name === selectedName);
  const status = mcpStatus(server || {});
  // The fast first read (serversPending) has no statuses yet: keep the skeleton until there is something to list.
  const loading = !desktop || (desktop.serversPending === true && names.length === 0);
  const busy = pending || !!removal.name;
  const edit = <SourceSettingsButton className="ssp-button" variant={names.length ? "secondary" : "primary"} disabled={!connected || busy} onClick={onEditConfig}>{t('Edit config')}</SourceSettingsButton>;
  const remove = async event => {
    if (!connected || busy || removing.current || !onRemove || !canRemoveDeveloperServer(definition, server)) return;
    removing.current = true;
    actionFocus.current = event.currentTarget;
    setRemoval({ name: selectedName, error: '' });
    let message = '';
    try { await onRemove(selectedName); }
    // c4fa092cc K5b1jjmNX7 "Couldn’t remove {serverName}." (raw reason logged, mcp_server_remove_failed).
    catch (reason) { console.warn('Couldn’t remove MCP server:', reason); message = t('Couldn’t remove {serverName}.', { serverName: selectedName }); }
    finally { removing.current = false; if (live.current) setRemoval({ name: null, error: message }); }
  };
  return <section ref={root} className="ss-group ss-developer" aria-labelledby="ss-mcp-heading">
    <h3 id="ss-mcp-heading" className="text-heading-semibold settings-row-title">{t('Local MCP servers')}<span className="ss-mcp-heading-description">{t('Add and manage MCP servers that you’re working on.')}</span></h3>
    <div className="ss-developer-body">
      {names.length > 0 && <div className="ss-developer-actions" data-setting-id="mcp-config">{edit}</div>}
      {error && <p role="alert" className="ss-error">{error}</p>}
      {removal.error && <p role="alert" className="ss-error">{removal.error}</p>}
      {loading ? <div className="ss-mcp-skeleton" aria-label={t('Loading MCP servers')} aria-busy="true"><div/><div/></div> : names.length > 0 ?
        <div className="ss-mcp-frame">
          <nav className="ss-mcp-list" aria-label={t('Local MCP servers')}><ul>{names.map(name => {
            const member = statuses.find(row => row.name === name);
            return <li key={name}><button type="button" aria-current={name === selectedName ? 'true' : undefined} onClick={() => setSelected(name)}>
              <span>{name}</span>{mcpStatus(member || {}) === 'Failed' && <Icon name="Warning" size={16} className="ss-error"/>}
            </button></li>;
          })}</ul></nav>
          <div className="ss-mcp-detail" key={selectedName} data-setting-id={'mcp-' + selectedName}>
            <header><div className="ss-mcp-title"><h2>{selectedName}</h2><CdsBadge variant={mcpStatusBadgeVariant(status)}>{t(status)}</CdsBadge></div>
              {onRemove && canRemoveDeveloperServer(definition, server) && <SourceSettingsButton className="ssp-button ss-mcp-delete" variant="ghost" size="sm" iconOnly icon="Trash" iconSize={16} aria-label={t('Delete')} title={t('Delete')} disabled={!connected || busy} onClick={remove}/>}
            </header>
            {server?.pluginId && <p>{t('This server is managed by a plugin')}</p>}
            {definition?.command && <Detail label={t('Command')}>{definition.command}</Detail>}
            {definition?.url && <Detail label="URL">{definition.url}</Detail>}
            {definition?.args?.length > 0 && <Detail label={t('Arguments')}>{joinArguments(definition.args)}</Detail>}
            {!definition?.command && !definition?.url && <Detail label={t('Configuration')}>{t('Configuration details are unavailable.')}</Detail>}
            {/* A bridge's known hints (zcode-bridge officialAuthHint) are dictionary keys; other errors show as sent. */}
            {server?.toolsError && <Detail label={t('Error')} danger>{t(server.toolsError)}</Detail>}
            {definition?.environmentNames?.length > 0 && <SourceDisclosure key={selectedName} className="ss-mcp-advanced" label={t('Advanced options')}><section><h3>{t('Environment variables')}</h3><div className="ss-mcp-environment">{definition.environmentNames.map(name=><p key={name}>{name}</p>)}</div></section></SourceDisclosure>}
          </div>
        </div> : <div className="ss-mcp-empty">
          <McpEmptyIllustration/>
          <p>{desktop?.errors?.servers || desktop?.errors?.policy ? t('MCP servers are unavailable.') : t('No servers added')}</p>
          <div>{edit}<SourceSettingsButton className="ssp-button" icon="ArrowUpRight" iconPosition="end" onClick={onDocs}>{t('Developer docs')}</SourceSettingsButton></div>
        </div>}
      {desktop?.serversTruncated && <p className="ss-mcp-note">{t('Some server statuses could not be loaded.')}</p>}
    </div>
  </section>;
}
// An empty settings list (c71860c77 :342-358, as Developer › Local MCP servers' "No servers added"): the illustration,
// a max-w-[60%] text-secondary message (lines: one block each), then the primary and secondary actions in gap-3.
export function SettingsEmptyState({ lines = [], actions = null, error = '', ...rest }) {
 return <div className="ss-mcp-empty ss-list-empty" {...rest}><McpEmptyIllustration/>
  <p>{lines.filter(Boolean).map((line,index)=><span key={index}>{line}</span>)}</p>
  {actions&&<div>{actions}</div>}
  {error&&<p role="alert" className="ss-error">{error}</p>}</div>;
}
export function McpEmptyIllustration(){
 return <svg className="ss-mcp-empty-illustration" width={mcpEmpty.width} height={mcpEmpty.height} viewBox={mcpEmpty.viewBox} fill="none" aria-hidden="true" focusable="false">{mcpEmpty.paths.map((path,index)=><path key={index} d={path.d} style={{'--mcp-path-light':path.light,'--mcp-path-dark':path.dark}}/>)}</svg>;
}
function Detail({ label, children, danger }) {
  return <section className={danger ? 'ss-error' : ''}><h3>{label}</h3><p>{children}</p></section>;
}

export function formatStorage(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toLocaleString(undefined, { maximumFractionDigits: index ? 1 : 0 })} ${units[index]}`;
}

// shared-21 Av: a settings row (label, description, control) with an optional below slot.
function StorageRow({ label, description, control, below }) {
  const labelId = useId(), descriptionId = useId();
  return <div className="ss-row ss-storage-row" role="group" aria-labelledby={labelId} aria-describedby={description ? descriptionId : undefined} data-settings-row="">
    <div className="ss-row-top"><div className="ss-row-copy"><div id={labelId} className="text-body"><span className="settings-row-title">{label}</span></div>
      {description && <div id={descriptionId} data-settings-desc="">{description}</div>}</div>
      {control && <div className="ss-control">{control}</div>}</div>
    {below && <div className="ss-row-below">{below}</div>}
  </div>;
}
// shared-frame AS (InfoTip): a muted Info glyph whose hover/focus popup carries the tip, max-w 320px.
function StorageTip({ content }) {
  return <SourceTooltip content={content} side="top" multiline className="ss-storage-tip-popup">
    <button type="button" data-cds="InfoTip" aria-label={t('More info')} className="ss-storage-tip"><Icon name="Info" size={16}/></button>
  </SourceTooltip>;
}
// c71860c77-B72Ova_w X: a 4px bar of the counted kinds (role=img) above a dot legend on the opacity ramp;
// an outside kind keeps its tip and stays out of the bar.
const MUTED_CHART = 'var(--cds-chart-muted)';
export function StorageKinds({ label, color, items }) {
  const kinds = storageKinds(items, { color, mutedColor: MUTED_CHART });
  if (!kinds.items.length) return null;
  return <div className="ss-storage-kinds">
    {kinds.total > 0 && <div role="img" aria-label={`${label}: ${kinds.bar.map(item => `${item.label} ${formatStorage(item.bytes)}`).join('; ')}`} className="ss-storage-kind-bar">
      {kinds.bar.map(item => <div key={item.id} style={{ width: `${item.width}%`, ...item.paint }}/>)}
    </div>}
    <ul role="list" className="ss-storage-kind-legend">{kinds.items.map(item => <li key={item.id}>
      <span aria-hidden="true" className="ss-storage-kind-dot" style={item.paint}/>
      <span className="ss-storage-kind-label">{item.label}</span>
      <span className="ss-storage-kind-size">{item.unmeasured === true && !(item.bytes > 0) ? t('Not measured') : formatStorage(item.bytes)}</span>
      {item.tip && <StorageTip content={item.tip}/>}
    </li>)}</ul>
  </div>;
}
// c71860c77-B72Ova_w Z: the 'Details' disclosure (footnote trigger named for its area; flex-col gap-sm pt-sm).
const StorageDetails = ({ label, children }) => <SourceDisclosure className="ss-storage-details" label={t('Details')} ariaLabel={label}>{children}</SourceDisclosure>;
// ht/mt colours: Cowork takes categorical 1, so Code sessions is categorical 2 and Runtime categorical 3;
// App caches is muted (the area meter uses the same paints).
const AREA_COLORS = { code: 'var(--cds-chart-categorical-2)', runtime: 'var(--cds-chart-categorical-3)', app: MUTED_CHART };

// c71860c77-B72Ova_w dt/ft/ht: nested lg dialog, retained data during refresh, request ownership,
// lower-bound reporting, the Disk space used meter, then the Code sessions and worktrees / Runtime /
// App caches and logs rows, each with a Details kind bar; no paths.
export function StorageDialog({ call, settingsRoot, onClose }) {
  const [state, setState] = useState({ value: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  // c71860c77-C_7Gqn1u Kt: the nested Clean up inactive sessions dialog.
  const [cleanup, setCleanup] = useState(false);
  const root = useRef(null), title = useId(), description = useId(), callRef = useRef(call);
  callRef.current = call;
  useEffect(() => {
    let live = true;
    setState(current => ({ ...current, loading: true, error: '' }));
    Promise.resolve().then(() => callRef.current('desktop-storage')).then(value => {
      if (live) setState({ value, loading: false, error: '' });
    }, error => { if (live) setState(current => ({ ...current, loading: false, error: error.message || String(error) })); });
    return () => { live = false; };
  }, [revision]);
  useEffect(() => {
    const previous = document.activeElement, parent = settingsRoot.current, wasInert = parent?.inert;
    if (parent) parent.inert = true;
    // shared-frame :5619-5620 Ef/Df: the Settings popup dims and blurs itself while this nested dialog is open.
    parent?.setAttribute('data-nested-dialog-open', '');
    root.current?.focus({ preventScroll: true });
    return () => { if (parent) { parent.inert = wasInert; parent.removeAttribute('data-nested-dialog-open'); } if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [settingsRoot]);
  const value = state.value;
  const keyboard = event => {
    if (event.nativeEvent.isComposing || cleanup) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = [...root.current.querySelectorAll('button:not(:disabled), summary, [tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = controls[0], last = controls.at(-1), active = document.activeElement;
    if (event.shiftKey && (active === first || active === root.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (active === last || active === root.current)) { event.preventDefault(); first?.focus(); }
  };
  const codeActions = storageCodeActions(value?.areas?.find(item => item?.id === 'code'), () => setCleanup(true));
  const clearCache = () => { Promise.resolve().then(() => callRef.current('clear-cache-restart')).catch(error => setState(current => ({ ...current, error: error.message }))); };
  return <>{createPortal(<div className="ss-backdrop ss-storage-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !cleanup) onClose(); }}>
    <section className="ss-storage-dialog" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title} aria-describedby={description} onKeyDown={keyboard}>
      <header className="ss-storage-header"><h2 id={title}>{t('Storage')}</h2><p id={description}>{t('Space Claude uses on this computer.')}</p><button className="ss-close" aria-label={t('Close')} onClick={onClose}><Icon name="X" size={16}/></button></header>
      <div className="ss-storage-content" aria-busy={state.loading || undefined}>
        {state.error && <p role="alert" className="ss-error">{t('Couldn’t calculate storage. Try again.')} {state.error}</p>}
        {!value && state.loading ? <div className="ss-storage-skeleton" aria-label={t('Calculating storage')}><i/><i/><i/><i/></div> : value && <StorageRows value={value} refreshing={state.loading} codeActions={codeActions} onClearCache={clearCache}/>}
      </div>
      <footer><SourceSettingsButton className="ssp-button" variant="ghost" icon="Folder" onClick={() => { Promise.resolve().then(() => callRef.current('reveal-settings')).catch(error => setState(current => ({ ...current, error: error.message }))); }}>{t('Open folder')}</SourceSettingsButton><SourceSettingsButton className="ssp-button" icon="ArrowClockwise" disabled={state.loading} onClick={() => { root.current?.focus({ preventScroll: true }); setRevision(value => value + 1); }}>{t('Refresh')}</SourceSettingsButton></footer>
    </section>
  </div>, document.body)}
  <StorageCleanupDialog open={cleanup} call={call} onClose={() => setCleanup(false)} onDone={() => setRevision(current => current + 1)}/></>;
}

// 3.6556.2 c71860c77-BH7EuJ1o: the Code session details carry one action. `k = ji()` (`ki = !1`, gate __gb__1522555277)
// picks it: `j = o && ((k ? A?.worktrees.count : A?.sessionCount) ?? 0) > 0`, then a secondary sm Button reading
// `k ? "Remove unused worktrees" : "Clean up inactive sessions…"`. With the gate off only Clean up inactive sessions…
// shows, and only with a session; the host's extra Remove unused worktrees button is gone (main's worktrees-clean stays).
export function storageCodeActions(code, onCleanup) {
  if (!onCleanup || !((code?.sessionCount ?? 0) > 0)) return null;
  return <SourceSettingsButton className="ssp-button" variant="secondary" size="sm" onClick={onCleanup}>{t('Clean up inactive sessions…')}</SourceSettingsButton>;
}

// c71860c77-C_7Gqn1u Nt/Lt/Jt/Kt: Clean up inactive sessions, nested over Storage (V.Popup md, no close button). The
// 30/60/90-day segmented control re-runs the preview (main code-cleanup-preview); the summary names the worktrees and
// their size ('at least' when a folder couldn't be measured) with up to five examples; checkboxes add the worktrees
// with uncommitted changes and the sessions themselves, each asking for an acknowledgement. Confirm runs the preview's
// token once, with 'Removing/Deleting N of M…' progress (main code-cleanup-progress) and Stop; while it runs the
// dialog can't be dismissed. An expired preview is fetched again; the outcome goes to a toast (inline without one).
const STORAGE_CLEANUP_LAYER = Object.freeze({ base: 540, z: 540 });
export function StorageCleanupDialog({ open, call, onClose, onDone }) {
  const toasts = useSourceToasts();
  const [days, setDays] = useState(CLEANUP_WINDOWS[0]);
  const [state, setState] = useState({ status: 'loading' });
  const [choices, setChoices] = useState({ ...DEFAULT_CLEANUP_CHOICES, token: null });
  const [acknowledged, setAcknowledged] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState('');
  const request = useRef(0), callRef = useRef(call), running = useRef(false), cancel = useRef(null);
  callRef.current = call;
  const preview = state.status === 'ready' ? state.preview : null;
  // Choices belong to the preview they were made on (Kt l(e)): a new preview starts from none.
  const current = preview && choices.token === preview.token ? choices : DEFAULT_CLEANUP_CHOICES;
  const load = windowDays => {
    const mine = ++request.current;
    Promise.resolve().then(() => callRef.current('code-cleanup-preview', { window: windowDays })).then(value => {
      if (mine !== request.current) return;
      if (value?.preview) { setState({ status: 'ready', preview: value.preview }); setAcknowledged(false); }
      else setState({ status: 'error', errorCode: value?.errorCode });
    }, () => { if (mine === request.current) setState({ status: 'error' }); });
  };
  const reset = () => { request.current++; setDays(CLEANUP_WINDOWS[0]); setState({ status: 'loading' }); setAcknowledged(false); setProgress(null); setChoices({ ...DEFAULT_CLEANUP_CHOICES, token: null }); };
  useEffect(() => { if (!open) return undefined; reset(); setNotice(''); load(CLEANUP_WINDOWS[0]); return () => { request.current++; }; }, [open]);
  // A run still going when this unmounts (Settings closed) is stopped (Nt O/w.current.cancel).
  useEffect(() => () => { if (running.current) Promise.resolve().then(() => callRef.current('code-cleanup-cancel')).catch(() => {}); }, []);
  const report = (message, variant) => { if (!message) return; if (toasts) toasts.add(message, { variant }); else setNotice(message); };
  const close = () => { if (!running.current) onClose(); };
  const changeDays = value => { const next = Number(value); setDays(next); setState({ status: 'loading' }); setAcknowledged(false); load(next); };
  const confirm = () => {
    if (!preview || running.current || !cleanupCanConfirm(preview, current, acknowledged)) return;
    const used = { includeUncommitted: current.includeUncommitted, deleteSessions: current.deleteSessions };
    running.current = true;
    setProgress({ done: 0, total: cleanupActionCount(preview, used) });
    cancel.current = window.desktop?.onEvent?.(event => {
      if (event?.kind === 'code-cleanup-progress' && Number.isFinite(event.done) && Number.isFinite(event.total)) setProgress({ done: event.done, total: event.total });
    }) ?? null;
    const finish = () => { running.current = false; cancel.current?.(); cancel.current = null; };
    Promise.resolve().then(() => callRef.current('code-cleanup-run', { token: preview.token, ...used })).then(result => {
      finish();
      const outcome = cleanupOutcome(result || {}, used);
      if (outcome.retry) { setProgress(null); setAcknowledged(false); setState({ status: 'loading' }); load(days); return; }
      if (outcome.keepOpen) { setProgress(null); report(outcome.error, 'danger'); return; }
      report(outcome.success, 'neutral'); report(outcome.error, 'danger');
      setProgress(null); onClose(); onDone();
    }, () => {
      finish();
      report(t('Cleanup didn’t finish. Try again.'), 'danger');
      setProgress(null); onDone();
    });
  };
  const stop = () => { Promise.resolve().then(() => callRef.current('code-cleanup-cancel')).catch(() => {}); };
  const pending = progress !== null, verb = cleanupVerb(current);
  const acknowledgement = cleanupAcknowledgeLabel(current);
  const size = preview ? (preview.incomplete ? t('at least {size}', { size: formatStorage(preview.bytes) }) : formatStorage(preview.bytes)) : '';
  const summary = preview && cleanupHasAnything(preview) ? cleanupSummary(preview, current, size) : null;
  const example = entry => t('{title} · {size}', { title: entry.title || t('Untitled'), size: formatStorage(entry.bytes) });
  const choose = patch => { setChoices({ ...current, ...patch, token: preview?.token ?? null }); setAcknowledged(false); };
  const cancelButton = useRef(null), summaryId = useId();
  // Lt: the summary is the popup's V.Description.
  return <SourceDialog open={open} size="md" showClose={false} title={t('Clean up inactive sessions')} layer={STORAGE_CLEANUP_LAYER} className="ss-cleanup-dialog"
    aria-describedby={summary ? summaryId : undefined}
    initialFocusRef={cancelButton} onClose={close}
    footer={<>
      {pending ? <SourceSettingsButton variant="secondary" onClick={stop}>{t('Stop')}</SourceSettingsButton>
        : <SourceSettingsButton ref={cancelButton} variant="secondary" data-autofocus="" onClick={close}>{t('Cancel')}</SourceSettingsButton>}
      <SourceSettingsButton variant={cleanupConfirmVariant(current)} busy={pending} aria-label={pending ? (verb === 'remove' ? t('Removing…') : t('Deleting…')) : undefined}
        disabled={!pending && !cleanupCanConfirm(preview, current, acknowledged)} onClick={confirm}>{cleanupConfirmLabel(preview, current)}</SourceSettingsButton>
    </>}>
    <div className="ss-cleanup-body" aria-busy={state.status === 'loading' || undefined}>
      <SourceSegments size="sm" label={t('Inactive for at least')} value={days} onChange={changeDays}
        options={CLEANUP_WINDOWS.map(value => ({ value, label: t('{days} days', { days: value }), disabled: pending }))}/>
      {state.status === 'loading' && <div className="ss-cleanup-loading"><p className="ss-cleanup-loading-label">{t('Checking inactive sessions…')}</p><div className="ss-cleanup-skeleton" aria-hidden="true"><i/><i/></div></div>}
      {/* Lt error → Jt Xt: only 'not-loaded' has copy of its own; any other code reads as the generic failure. */}
      {state.status === 'error' && <p className="ss-cleanup-text">{state.errorCode === 'not-loaded' ? cleanupErrorText(state.errorCode) : t('Couldn’t work out what to clean up. Try again.')}</p>}
      {preview && !summary && <p className="ss-cleanup-text">{cleanupEmptyText(days)}</p>}
      {preview && summary && <>
        <p id={summaryId} className="ss-cleanup-summary">{summary.headline}{summary.note && <span>{summary.note}</span>}</p>
        {preview.examples.length > 0 && <ul role="list" className="ss-cleanup-examples">
          {preview.examples.map((entry, index) => <li key={index}>{example(entry)}</li>)}
          {preview.count > preview.examples.length && <li>{t('and {count} more', { count: preview.count - preview.examples.length })}</li>}
        </ul>}
        <div className="ss-cleanup-choices">
          {preview.uncommittedCount > 0 && <>
            {/* c71860c77 `r(F,{checked:t.includeUncommitted,disabled:u,onCheckedChange:e=>i({...t,includeUncommitted:e===!0}),label:…})`, F = shared-frame xP (CdsCheckbox with its own label). */}
            <CdsCheckbox checked={current.includeUncommitted} disabled={pending} onCheckedChange={checked => choose({ includeUncommitted: checked === true })} label={cleanupUncommittedLabel(preview, formatStorage(preview.uncommittedBytes))}/>
            <ul role="list" className="ss-cleanup-uncommitted">{preview.uncommitted.map((entry, index) => <li key={index}>{example(entry)}</li>)}</ul>
          </>}
          <CdsCheckbox checked={current.deleteSessions} disabled={pending} onCheckedChange={checked => choose({ deleteSessions: checked === true })} label={cleanupDeleteLabel(preview, current)}/>
        </div>
        {/* `T!==null&&r(F,{checked:u,disabled:H,onCheckedChange:e=>d(e===!0),label:T})` */}
        {acknowledgement !== null && <CdsCheckbox checked={acknowledged} disabled={pending} onCheckedChange={checked => setAcknowledged(checked === true)} label={acknowledgement}/>}
      </>}
    </div>
    {progress && <><p aria-hidden="true" className="ss-cleanup-progress">{cleanupProgressLabel(progress, verb)}</p>
      <p role="status" className="ss-sr-only">{cleanupProgressLabel({ done: announcedProgress(progress), total: progress.total }, verb)}</p></>}
    {notice && <p role="status" className="ss-cleanup-notice">{notice}</p>}
  </SourceDialog>;
}

// The report body: Disk space used with the area meter, then one row per area with its Details kind bar.
// menus C10: 3.6556.2 c71860c77-BH7EuJ1o's Disk space used row reads "Calculated {when}." and, while a refresh runs over
// the shown report, "Calculated {when}. Refreshing…" (1fxFuk2hWl); an incomplete report adds a line break and "Some
// folders couldn’t be measured, so this is a lower bound." after it rather than replacing it.
const withWhen = (text, when) => { const at = text.indexOf('{when}'); return at < 0 ? text : <>{text.slice(0, at)}{when}{text.slice(at + 6)}</>; };
export function StorageRows({ value, refreshing = false, codeActions = null, onClearCache }) {
  // Area and kind labels are main's English copy; shown translated.
  const areas = (value.areas || []).map(item => ({ ...item, label: t(item.label), kinds: (item.kinds || []).map(kind => ({ ...kind, label: kind.template ? t(kind.template, kind.values) : t(kind.label) })) })), area = id => areas.find(item => item.id === id);
  const code = area('code'), runtime = area('runtime'), app = area('app');
  const size = bytes => <span className="ss-storage-size">{formatStorage(bytes)}</span>;
  // The shared kind (all of a core's history in its own database, these sessions included) gets a tip of its own; any
  // other kind kept outside OpenClaude Desktop the generic one.
  const kindsOf = (item, extra = {}) => item.kinds.map(kind => kind.shared && runtime?.name ? { ...kind, tip: t('Kept in {name}’s own database together with its other sessions; not counted above.', { name: runtime.name }) } : kind.outside ? { ...kind, ...extra } : kind);
  const outside = code ? code.kinds.filter(kind => kind.outside).reduce((sum, kind) => sum + kind.bytes, 0) : 0;
  return <div className="settings-group-dividers ss-storage-rows">
    <StorageRow label={t('Disk space used')}
      description={<>{withWhen(refreshing ? t('Calculated {when}. Refreshing…') : t('Calculated {when}.'), <SourceTimestamp dateMs={value.computedAt} className="ss-storage-when"/>)}{value.incomplete && <>{' '}<br/>{t('Some folders couldn’t be measured, so this is a lower bound.')}</>}</>}
      control={<span className="ss-storage-size ss-storage-total-size">{formatStorage(value.bytes)}</span>}
      below={<div className="ss-storage-meter">
        <SourceStorageMeter areas={areas} formatValue={formatStorage}/>
        <ul role="list" className="ss-storage-legend">{areas.map(item => <li key={item.id}><i data-area={item.id}/><span>{item.label}</span><span>{formatStorage(item.bytes)}</span></li>)}</ul>
      </div>}/>
    {code && <StorageRow label={code.label}
      description={code.worktreeCount > 0 ? t('{sessions} and {worktrees}.', { sessions: tn(code.sessionCount, '{count} session', '{count} sessions'), worktrees: tn(code.worktreeCount, '{count} worktree', '{count} worktrees') }) : t('{sessions}.', { sessions: tn(code.sessionCount, '{count} session', '{count} sessions') })}
      // A core whose sessions share one database (historyUnmeasured: ZCode, MiniMax, OpenCode, MiMo) can't size them.
      control={code.historyUnmeasured && !(code.bytes > 0) ? <span className="ss-storage-size">{t('Not measured')}</span> : size(code.bytes)}
      below={(code.bytes > 0 || outside > 0 || code.historyUnmeasured || codeActions) && <StorageDetails label={t('Code session details')}><StorageKinds label={t('Code storage by kind')} color={AREA_COLORS.code}
        items={kindsOf(code, { tip: runtime?.name ? t('History from {name} outside OpenClaude Desktop. Shown for completeness; not counted above and never removed from here.', { name: runtime.name }) : t('History kept outside OpenClaude Desktop. Shown for completeness; not counted above and never removed from here.') })}/>
        {codeActions && <div className="ss-storage-actions">{codeActions}</div>}</StorageDetails>}/>}
    {runtime && <StorageRow label={runtime.label}
      description={runtime.versionCount === 0 ? t('{name} downloads.', { name: runtime.name }) : tn(runtime.versionCount, '{count} installed {name} version.', '{count} installed {name} versions.', { name: runtime.name })}
      control={size(runtime.bytes)}
      below={runtime.bytes > 0 && <StorageDetails label={t('Runtime details')}><StorageKinds label={t('Runtime storage by kind')} color={AREA_COLORS.runtime} items={runtime.kinds}/></StorageDetails>}/>}
    {app && <StorageRow label={app.label} description={t('Web cache, browser panes and logs.')} control={size(app.bytes)}
      below={(app.bytes > 0 || onClearCache) && <StorageDetails label={t('App cache details')}><StorageKinds label={t('App storage by kind')} color={AREA_COLORS.app} items={app.kinds}/>
        {/* bn :2321-2333: a secondary sm 'Clear cache and restart…' under the kinds; main confirms natively first. */}
        {onClearCache && <div><SourceSettingsButton className="ssp-button" size="sm" onClick={onClearCache}>{t('Clear cache and restart…')}</SourceSettingsButton></div>}</StorageDetails>}/>}
  </div>;
}
