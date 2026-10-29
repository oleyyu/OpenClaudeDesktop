import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from './icons';
import { rateLimitRows } from './session-command-model.mjs';
import { planLabel, planUsageSummary } from './usage-model.mjs';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSelect } from './source-select.jsx';
import { SourceShortcut } from './source-shortcut';
import { shortcutsDialogSections } from './shortcuts-dialog-model.mjs';
import './source-session-actions.css';
import { getAssistantName, getLocale, t, tn } from '../electron/i18n/index.mjs';
import { coreCapabilities } from '../electron/core-registry.mjs';
import { permissionLabel } from './source-permission-menu.jsx';
import { effortName } from './model-menu-model.mjs';
import { signedOutAccountLabel } from './account-label-model.mjs';
import { GitCounts } from './source-git-counts.jsx';
import { rewindLabel, rewindPickerMove, rewindPickerStart, rewindRestoreItems, rewindTargetText } from './rewind-flow-model.mjs';

// The local action dialogs (Review code, Help, Rewind, Keyboard shortcuts, Run workflow, Bypass) on the
// shared CDS Dialog (source-dialog.jsx: shared-frame-C_2npUJq.js:5561-5574, :5738-5869). The props API is
// unchanged; open/onExited/size/alert/description/initialFocusRef/footer pass through to SourceDialog.
export function ActionDialog({ title, onClose, children, className = '', showClose = true, ...props }) {
  return <SourceDialog {...props} title={title} onClose={onClose} showClose={showClose} className={`session-action-dialog ${className}`.trim()}>
    {children}
  </SourceDialog>;
}

// 2.31226 shared-19 rZ: Dialog size md in comfortable density, fullHeight on the Code route (h-dvh under the popup's
// max-h) and initial focus on the popup; V3-w12b-settings-dialogs: 3.6556.2 shared-19 jM `c={showClose:!0}` through
// shared-78 va (`g(ae.Header,{...e.header,children:e.title})`), the standard Zc Header 'Keyboard shortcuts', not a bleed bar; c518a31cc ve: one focusable region
// that scrolls edge to edge (-mx/-mb-pad-xl, px/pb-xl, rounded-b-[inherit], an inset focus ring) holding Ce's
// sections (q: mt-5 py-2) and rows (Y: label text-sm text-secondary, keycap Shortcuts with 'or' between them).
// V3-w13-surfaces-shortcuts: `surface` (the sidebar mode) and `route` (the open chat's or task's surface) pick c518a31cc
// Me's Ne body off Code (shortcuts-dialog-model.mjs).
// w13-close-main-jsx-tests: `sidebarChord` (main.jsx: the window has the sidebar, whose app switch binds ⌥⌘←/→) lists
// c518a31cc Te's sidebar tab rows, swapped under RTL like Te's `n() === "rtl"`.
export function KeyboardShortcutsDialog({ fastMode = false, sideChat = false, rewind = true, surface = 'code', route = null, sidebarChord = false, onClose, ...dialog }) {
  const rtl = typeof document !== 'undefined' && document.documentElement?.dir === 'rtl';
  return <ActionDialog {...dialog} title={t("Keyboard shortcuts")} size="md" density="comfortable" className="shortcuts-dialog" onClose={onClose}>
    <div role="region" aria-label={t("Keyboard shortcuts")} tabIndex={0} className="shortcuts-region">
      {shortcutsDialogSections({ fastMode, sideChat, rewind, surface, route, sidebarChord, rtl }).map(section => <div key={section.title}>
        <div className="shortcuts-section">{section.title}</div>
        {section.rows.map(row => <div key={row.command} className="shortcuts-row" data-command={row.command}>
          <span className="shortcuts-label">{row.label}</span>
          <span className="shortcuts-keys">{row.keys.map((keys, index) => <React.Fragment key={keys}>
            {index > 0 && <span aria-hidden="true" className="shortcuts-or">{t("or")}</span>}
            <SourceShortcut keys={keys} />
          </React.Fragment>)}</span>
        </div>)}
      </div>)}
    </div>
  </ActionDialog>;
}

// What the review may do on the running core (capabilities.reviewReadOnly): Codex's review sub-agent runs in a
// read-only sandbox with no approval prompts ('sandbox'); a bridge that runs the review turn read-only reports
// 'noEdits'; any other core reviews with the session's own permission mode, and the dialog says so.
export function reviewNote(core, permission) {
  const readOnly = coreCapabilities(core).reviewReadOnly;
  if (readOnly === true || readOnly === 'sandbox') return t("DeepSeek reviews in a read-only sandbox without approval prompts. You can stop the review from this conversation.");
  if (readOnly === 'noEdits') return t("{core} reviews in read-only mode: it can read your files but can’t change them. You can stop the review from this conversation.", { core: getAssistantName() });
  return t("{core} reviews with this session’s permission mode ({mode}). You can stop the review from this conversation.", { core: getAssistantName(), mode: permissionLabel(permission) });
}

/** The Review target choices: the Git targets (a pull request only on a core that lists it), disabled with the reason
 * outside a repository, then Custom instructions. */
export function reviewTargetItems({ isRepo = false, pullRequests = false } = {}) {
  return [
    { value: 'uncommittedChanges', label: t("Uncommitted changes") },
    { value: 'baseBranch', label: t("Compare against a branch") },
    { value: 'commit', label: t("A commit") },
    ...(pullRequests ? [{ value: 'pullRequest', label: t("A pull request") }] : []),
  ].map(item => isRepo ? item : { ...item, disabled: true, description: t("Needs a Git repository") })
    .concat({ value: 'custom', label: t("Custom instructions") });
}

export function ReviewDialog({ initialInstructions='', workspaceInfo, core, permission, onSubmit, onClose, ...dialog }) {
  const [type,setType]=useState(initialInstructions || workspaceInfo?.isRepo === false ? 'custom':'uncommittedChanges'),[value,setValue]=useState(initialInstructions),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const submitting=useRef(false);
  const fields={baseBranch:'branch',commit:'sha',pullRequest:'pullRequest',custom:'instructions'};
  // A core whose review takes a pull request (capabilities.reviewTargets: OpenCode's and MiMo's /review run `gh pr diff`).
  const pullRequests=Array.isArray(coreCapabilities(core).reviewTargets)&&coreCapabilities(core).reviewTargets.includes('pullRequest');
  return <ActionDialog {...dialog} title={t("Review code")} onClose={onClose}>
    <form onSubmit={async e=>{e.preventDefault();if(submitting.current || type!=='uncommittedChanges'&&!value.trim())return;submitting.current=true;setBusy(true);setError('');try{await onSubmit({type,...(fields[type]?{[fields[type]]:value.trim()}:{})});}catch(e){setError(e.message);}finally{submitting.current=false;setBusy(false);}}}>
      <p>{reviewNote(core, permission)}</p>
      {/* The app's Claude-styled Combobox (SourceSelect), not the OS popup: a Git target outside a repository is
          disabled and says why. */}
      <div className="session-action-field"><span className="session-action-field-label">{t("Review target")}</span>
        <SourceSelect label={t("Review target")} value={type} disabled={busy} className="session-action-select" triggerProps={{ 'data-autofocus': '' }}
          onChange={next=>{setType(next);setValue('');setError('');}}
          items={reviewTargetItems({ isRepo: !!workspaceInfo?.isRepo, pullRequests })} /></div>
      {type==='baseBranch' && <label>{t("Base branch")}<input aria-label={t("Base branch")} list="review-branches" placeholder="main" value={value} disabled={busy} onChange={e=>setValue(e.target.value)}/><datalist id="review-branches">{workspaceInfo?.branches?.map(branch=><option key={branch} value={branch}/>)}</datalist></label>}
      {type==='commit' && <label>{t("Commit")}<input aria-label={t("Commit")} placeholder={t("Commit SHA or reference")} value={value} disabled={busy} onChange={e=>setValue(e.target.value)}/></label>}
      {type==='pullRequest' && <label>{t("Pull request")}<input aria-label={t("Pull request")} placeholder={t("Number or URL, e.g. 42")} value={value} disabled={busy} onChange={e=>setValue(e.target.value)}/>
        <small className="session-action-hint">{t("{core} reads the pull request with the GitHub CLI (gh), which must be installed and signed in.", { core: getAssistantName() })}</small></label>}
      {type==='custom' && <label>{t("Review instructions")}<textarea aria-label={t("Review instructions")} rows={5} maxLength={12000} value={value} disabled={busy} onChange={e=>setValue(e.target.value)}/></label>}
      {!workspaceInfo?.isRepo && type!=='custom' && <p>{t("Select custom instructions, or open a session in a Git repository.")}</p>}
      {error && <p role="alert" className="session-action-error">{error}</p>}
      {/* Qf footer with CDS Buttons: busy keeps Start review in place with its spinner (ks busy). */}
      <SourceDialogFooter><SourceSettingsButton onClick={onClose}>{t("Cancel")}</SourceSettingsButton><SourceSettingsButton type="submit" variant="primary" busy={busy}
        disabled={(type!=='custom'&&!workspaceInfo?.isRepo) || (type!=='uncommittedChanges'&&!value.trim())}>{t("Start review")}</SourceSettingsButton></SourceDialogFooter>
    </form>
  </ActionDialog>;
}

const count = value => Number.isFinite(value) && value>=0 ? Intl.NumberFormat(getLocale()).format(value) : t('Unavailable');
// A plain-text copy of the session info (Copy session info), for a bug report or a note.
export function sessionInfoText({ session, model, effort, permission, cwd, core, appVersion }) {
  return [
    session?.id ? `${t('Session ID')}: ${session.id}` : null,
    session ? `${t('Session')}: ${session.name || session.preview || t('Untitled session')}` : null,
    core?.name ? `${t('Core')}: ${core.name}${core.version ? ` ${core.version}` : ''}` : null,
    appVersion ? `OpenClaude Desktop: ${appVersion}` : null,
    model ? `${t('Model')}: ${model}${effort ? ` (${effort})` : ''}` : null,
    permission ? `${t('Permission mode')}: ${permission}` : null,
    cwd ? `${t('Workspace')}: ${cwd}` : null,
  ].filter(Boolean).join('\n');
}

export function SessionStatusDialog({ session, model, effort, efforts=null, serviceTier, permission, cwd, usage, connected, running, operation, account, readStatus, onClose, inline=false, core=null, appVersion=null }) {
  const [remote,setRemote]=useState(null),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0),[copied,setCopied]=useState('');
  const copy=async(kind,text)=>{try{await navigator.clipboard.writeText(text);setCopied(kind);setTimeout(()=>setCopied(value=>value===kind?'':value),1500);}catch{}};
  useEffect(()=>{let live=true;setLoading(true);setRemote(null);readStatus().then(value=>{if(live)setRemote(value);}).catch(error=>{if(live)setRemote({error:error.message});}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[revision,connected]);
  const rows=rateLimitRows(remote?.limits), currentAccount=remote?.account?.account || account?.account;
  // A sign-in with no email or plan: the core's own account name (account/read codeDesktop.label, e.g. 'Kimi account'),
  // 'ChatGPT' only on Codex.
  const accountName=(remote?.account||account)?.codeDesktop?.label || (getAssistantName()==='Codex'?'ChatGPT':t('Signed in'));
  // Codex /status also lists credits, the monthly credit limit and earned resets (tui status/rate_limits.rs).
  const extra=remote?.limits?planUsageSummary(remote.limits):null;
  const Frame=inline?InlineStatusFrame:ActionDialog;
  return <Frame title={t("Session status")} onClose={onClose}>
    <dl className="session-status-details">
      <dt>{t('Connection')}</dt><dd>{connected?t('Connected to local DeepSeek'):t('Disconnected')}</dd>
      <dt>{t('Account')}</dt><dd>{currentAccount?.type==='chatgpt' ? [currentAccount.email,planLabel(currentAccount.planType)].filter(Boolean).join(' · ') || accountName
        : currentAccount?.type==='apiKey' ? t('API key')
        // Codex's managed Bedrock login (AmazonBedrock account; tui status/card.rs: limits are managed by AWS).
        : currentAccount?.type==='amazonBedrock' ? t('Amazon Bedrock')
        // No account: Codex on a custom endpoint, the DeepSeek key state, a bridge's free tier, or not signed in.
        : !currentAccount ? signedOutAccountLabel(remote?.account||account, core) : t('Unavailable')}</dd>
      <dt>{t('Session')}</dt><dd>{session?.name || session?.preview || (session?t('Untitled session'):t('New session'))}{session && <small>{session.id}{' '}
        <button type="button" className="session-status-copy" data-copy-session-id="" onClick={()=>void copy('id',session.id)}>{copied==='id'?t('Copied'):t('Copy session ID')}</button></small>}</dd>
      {core?.name && <><dt>{t('Core')}</dt><dd>{core.name}{core.version?` · ${core.version}`:''}{appVersion?<small>{t('OpenClaude Desktop {version}',{version:appVersion})}</small>:null}</dd></>}
      <dt>{t('Task state')}</dt><dd>{session?.archived?t('Archived'):!connected?t('Unknown while disconnected'):operation?.phase==='unknown'?t('Awaiting DeepSeek confirmation'):running?t('Running'):operation?.phase==='starting'?t('Starting'):t('Idle')}</dd>
      <dt>{t('Next message model')}</dt><dd>{model || t('Unavailable')}{/* The effort menu's own translated level name (effortName: High, Extra high, Thinking on…), never the raw id. */}
        {effort ? ` · ${t('Effort: {name}', { name: effortName(effort, efforts) })}` : ''}</dd>
      <dt>{t("Next message speed")}</dt><dd>{serviceTier || t("Standard")}</dd>
      <dt>{t('Next message permissions')}</dt><dd>{permission==='bypass'?t('Bypass · full access without approval'):permission==='plan'?t('Plan · read-only'):permission==='ask'?t('Manual · every change requires approval'):permission==='acceptEdits'?t('Accept edits · file edits apply without approval'):t('Auto · DeepSeek requests approval when needed')}</dd>
      <dt>{t('Workspace')}</dt><dd>{cwd || t('Unavailable')}</dd>
      <dt>{t('Context tokens')}</dt><dd>{count(usage?.last?.totalTokens)}{Number.isFinite(usage?.modelContextWindow)&&usage.modelContextWindow>0?` / ${count(usage.modelContextWindow)}`:''}</dd>
      <dt>{t('Session tokens')}</dt><dd>{count(usage?.total?.totalTokens)}</dd>
    </dl>
    {/* A core billed per token has no plan limits: the section would only ever say Unavailable. */}
    {!core?.perTokenBilling && <section className="session-status-limits" aria-label={t("Account usage limits")}><h3>{t("Account usage limits")}</h3>
      {loading?<p role="status">{t("Loading usage limits")}</p>:rows.length?rows.map(row=><div className="session-limit" key={row.key}><span>{row.label}<strong>{t("{percent}% remaining", { percent: row.remaining.toLocaleString(getLocale()) })}</strong></span><progress max={100} value={row.remaining}/>{row.resetsAt!==null&&<small>{t("Resets {date}", { date: new Date(row.resetsAt*1000).toLocaleString(getLocale()) })}</small>}</div>):<p>{t("Unavailable for this account or connection.")}</p>}
      {!loading&&extra?.notice&&<p className="session-limit-notice" data-tone={extra.notice.tone}><strong>{extra.notice.title}</strong> {extra.notice.body}</p>}
      {!loading&&extra?.credit&&<div className="session-limit" data-credits=""><span>{t("Usage credits")}<strong>{extra.credit.balance}</strong></span></div>}
      {!loading&&extra?.spend&&<div className="session-limit"><span>{t("Monthly credit limit")}<strong>{extra.spend.detail}</strong></span>{extra.spend.percent!==null&&<progress max={100} value={100-extra.spend.percent}/>}</div>}
      {!loading&&extra?.resetCredits&&<p className="session-limit-resets">{extra.resetCredits.available>0?tn(extra.resetCredits.available,'You have {count} usage limit reset available. Use it from Usage.','You have {count} usage limit resets available. Use one from Usage.'):t('No usage limit resets available.')}</p>}
      {remote?.error&&<p role="alert" className="session-action-error">{remote.error}</p>}
    </section>}
    <footer><span className="session-action-hint">{Number.isFinite(usage?.last?.totalTokens)?'':t("Context appears after DeepSeek reports usage.")}</span>
      {/* The two actions sit together at the end; the hint (empty once usage is known) keeps the start. */}
      <span className="session-status-actions"><button type="button" data-copy-session-info="" onClick={()=>void copy('info',sessionInfoText({session,model,effort,permission,cwd,core,appVersion}))}>{copied==='info'?t('Copied'):t('Copy session info')}</button>
      <button type="button" data-autofocus disabled={loading||!connected} onClick={()=>setRevision(x=>x+1)}>{t("Refresh")}</button></span></footer>
  </Frame>;
}

function InlineStatusFrame({title,onClose,children}) {return <section className="slash-local-status" aria-label={title}><header><h3>{title}</h3><button aria-label={t("Dismiss session status")} onClick={onClose}><Icon name="X" size={14}/></button></header>{children}</section>;}
// /feedback on the DeepSeek core with feedback sharing on (Settings › Code › Privacy): dsh-command-feedback releases
// the session so far to DeepSeek's collector (dsh-session-telemetry-otel FEEDBACK_ONLY), so the user confirms what goes.
export function FeedbackShareDialog({ text, onConfirm, onClose, ...dialog }) {
  const [busy,setBusy]=useState(false);
  return <ActionDialog {...dialog} alert size="sm" title={t("Share feedback with DeepSeek?")} showClose={false} onClose={()=>!busy&&onClose()}>
    <p>{t("Your feedback and this session so far are uploaded to DeepSeek: your prompts, file contents the agent read, command output and the working folder, with an anonymous ID.")}</p>
    {text && <blockquote className="feedback-share-text">{text}</blockquote>}
    <SourceDialogFooter><SourceSettingsButton data-autofocus disabled={busy} onClick={onClose}>{t("Cancel")}</SourceSettingsButton>
      <SourceSettingsButton variant="primary" busy={busy} onClick={async()=>{setBusy(true);try{await onConfirm();}finally{setBusy(false);}}}>{t("Share feedback")}</SourceSettingsButton></SourceDialogFooter>
  </ActionDialog>;
}
// The running core's assistant is passed as {name}: the assistant-word rewrite skips "by DeepSeek" and 由…管理.
// /help: what the running core offers here (the slash commands of this session, matchCommands with the live context),
// then the places to learn more: Keyboard shortcuts, Settings › Cores / Models, What's new and the core's own docs.
export function SlashHelp({onClose,commands=[],coreLabel='',docsUrl=null,onShortcuts,onSettings,onWhatsNew,onOpenLink,...dialog}) {
  const go=action=>()=>{onClose();action();};
  return <ActionDialog {...dialog} title={t("Help and support")} onClose={onClose}>
    <p>{t("OpenClaude Desktop runs local {name} sessions. Slash commands open tools, settings and conversation actions.", { name: getAssistantName() })}</p>
    {commands.length>0&&<section className="slash-help-commands" aria-label={t("Slash commands")}>
      <h3>{t("Commands in this session")}</h3>
      <dl>{commands.map(command=><div key={`${command.kind??'app'}:${command.id}`}><dt>/{command.id}{command.argumentHint?<span className="slash-help-hint"> {command.argumentHint}</span>:null}</dt><dd>{command.description||command.label||''}</dd></div>)}</dl>
    </section>}
    <div className="slash-help-links">
      {onShortcuts&&<SourceSettingsButton size="sm" variant="secondary" onClick={go(onShortcuts)}>{t("Keyboard shortcuts")}</SourceSettingsButton>}
      {onSettings&&<SourceSettingsButton size="sm" variant="secondary" onClick={go(()=>onSettings('cores'))}>{t("Cores settings")}</SourceSettingsButton>}
      {onSettings&&<SourceSettingsButton size="sm" variant="secondary" onClick={go(()=>onSettings('models'))}>{t("Models settings")}</SourceSettingsButton>}
      {onWhatsNew&&<SourceSettingsButton size="sm" variant="secondary" onClick={go(onWhatsNew)}>{t("What’s new")}</SourceSettingsButton>}
      {docsUrl&&onOpenLink&&<SourceSettingsButton size="sm" variant="secondary" onClick={()=>onOpenLink(docsUrl)}>{coreLabel?t("{core} documentation",{core:coreLabel}):t("Documentation")}</SourceSettingsButton>}
    </div>
  </ActionDialog>;
}
// cc43287c9-Bchz60VT.js J1 (:30061-30231) / Y1: the Rewind picker (/rewind, Esc Esc). A listbox of the session's
// user messages (caec4a2d4 Ai, labels vi), the latest active; ArrowUp/ArrowDown move the active row (clamped) and
// focus the list, Enter on the list or a click picks it; the pointer makes a row active. Picking hands the message to
// the same request as the message menu's 'Rewind to here' (onSelect), which checks for file changes first.
export function RewindPicker({turns,onSelect,onClose,...dialog}) {
 const count=turns.length,prefix=useId(),list=useRef(null);
 const [active,setActive]=useState(()=>rewindPickerStart(count));
 const labels=useMemo(()=>turns.map(turn=>rewindLabel(turn.text)),[turns]);
 const pick=index=>{const turn=turns[index];if(turn)onSelect(turn);else onClose();};
 useEffect(()=>{list.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView?.({block:'nearest'});},[active]);
 const keyDown=event=>{
  const next=rewindPickerMove(event.key,active,count);
  if(next!==null){event.preventDefault();list.current?.focus({preventScroll:true});setActive(next);return;}
  if(event.key==='Enter'&&list.current?.contains(event.target)){event.preventDefault();pick(active);}
 };
 return <ActionDialog {...dialog} title={t("Rewind")} description={t("Restore the session to an earlier message.")} aria-label={t("Rewind session")}
  className="rewind-picker" initialFocusRef={list} onKeyDown={keyDown} onClose={onClose}>
  <ul ref={list} role="listbox" aria-activedescendant={count?`${prefix}-rewind-opt-${active}`:undefined} tabIndex={-1} className="rewind-picker-list">
   {count===0?<li role="presentation" className="rewind-picker-empty">{t("Nothing to rewind to yet")}</li>
    :turns.map((turn,index)=><li key={turn.id} id={`${prefix}-rewind-opt-${index}`} data-idx={index} role="option" aria-selected={active===index}
      className="rewind-picker-option" data-selected={active===index||undefined} onMouseEnter={()=>setActive(index)} onClick={()=>pick(index)}>
      <div className="rewind-picker-label">{labels[index]}</div></li>)}
  </ul>
 </ActionDialog>;
}

// cc43287c9-Bchz60VT.js K1 (:29899-30060): 'Rewind to this message?' — the message quoted (sr-only 'You', two lines),
// then, unless the file check found nothing (preview 'none'), the Restore select (Code and conversation /
// Conversation only; G4 confirmRewind) over the files the restore would put back ('{count} files · +a −d', or
// 'Checking for file changes…' while the check runs) and the shell-commands note. Cancel takes the initial focus;
// Rewind is busy ('Rewinding…') until onConfirm settles, and the dialog cannot be dismissed meanwhile.
export function RewindConfirmDialog({targetText,preview,restoreItems,onConfirm,onClose,...dialog}) {
 const [choice,setChoice]=useState('both'),[busy,setBusy]=useState(false),cancel=useRef(null),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const pending=preview==='pending',ready=!!preview&&typeof preview==='object';
 const items=restoreItems||rewindRestoreItems();
 const confirm=()=>{setBusy(true);Promise.resolve().then(()=>onConfirm(ready?choice:'conversation')).catch(()=>{}).finally(()=>{if(live.current)setBusy(false);});};
 return <ActionDialog {...dialog} size="sm" showClose={false} title={t("Rewind to this message?")} className="rewind-confirm" initialFocusRef={cancel}
  onClose={()=>{if(!busy)onClose();}}>
  <div className="rewind-confirm-body">
   <div className="rewind-confirm-quote"><span className="source-sr-only">{t("You")}</span><p>{rewindTargetText(targetText)}</p></div>
   {preview!=='none'&&<>
    <SourceSelect label={t("Restore")} items={items} value={choice} onChange={value=>{if(value!==null)setChoice(value);}} searchable={false} disabled={busy||pending}/>
    <div className="rewind-confirm-files" data-hidden={ready&&choice==='conversation'||undefined} aria-live="polite">
     <span>{ready?<>{tn(preview.filesChanged.length,'{count} file','{count} files',{count:preview.filesChanged.length})}{' · '}<GitCounts added={preview.insertions} removed={preview.deletions} className="rewind-confirm-diff" addedClassName="rewind-confirm-added" removedClassName="rewind-confirm-removed"/></>
      :t("Checking for file changes…")}</span>
     <span className="rewind-confirm-note" data-hidden={pending||undefined}>{t("Changes made through shell commands aren’t reverted. Commits stay in place.")}</span>
    </div>
   </>}
  </div>
  <SourceDialogFooter>
   <SourceSettingsButton ref={cancel} variant="secondary" disabled={busy} data-initial-focus="" onClick={onClose}>{t("Cancel")}</SourceSettingsButton>
   <SourceSettingsButton variant="primary" disabled={pending} busy={busy} aria-label={busy?t("Rewinding…"):undefined} onClick={confirm}>{t("Rewind")}</SourceSettingsButton>
  </SourceDialogFooter>
 </ActionDialog>;
}
