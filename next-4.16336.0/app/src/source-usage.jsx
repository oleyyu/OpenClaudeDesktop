import React,{useEffect,useId,useRef,useState} from 'react';
import {SourceSettingsButton} from './source-settings-button.jsx';
import {localUsagePresentation,usageEmptyText,usagePresentation,usageResetCountdown} from './usage-model.mjs';
// W12b: the minute clock the desktop's usage meters read (shared-156 fK, exported Rr; session-rail-sections slices it).
import {useMinuteNow} from './generated/session-rail-sections/minute-clock.mjs';
import {SourceTimestamp} from './source-timestamp.jsx';
import {formatDayKey,localDayKey} from './home-model.mjs';
import {COST_FOOTNOTE,CUSTOM_COST_FOOTNOTE,USAGE_RANGE_DAYS,compactTokens,formatMoney,formatTokenCount,usageCostPresentation,usageSpendPresentation} from './usage-cost-model.mjs';
import {SourceSegments} from './source-segments.jsx';
import {coreName} from '../electron/core-registry.mjs';
import './source-usage.css';
import {t,tn,getLocale} from '../electron/i18n/index.mjs';

// Keep the server reason, omitting only Electron's known transport wrapper.
const usageErrorText = value => String(value).replace(/^Error invoking remote method 'desktop:call': (?:Error: )?/gm, '');

function UsageRow({row}) {
 const title=useId(),description=useId();
 // 3.6556.2's usage meters caption the reset with lU over the minute clock (c51de9054 A `r ? x(n.claim.resets_at, c, l)
 // : _(n.claim.resets_at, c, l)`, `_` = shared-156 lU, `l = y()` = fK; specCopy, fU, is the plan popover's copy; the
 // desktop's own Usage page, c71860c77 J: `me(… resetsAtMs …, t, r)`, me = lU, r = N() = fK): 'Resets in {minutes} min'
 // within the hour, 'Resets in {hours} hr {minutes} min' within the day, else cU.
 const now=useMinuteNow();
 const reset=usageResetCountdown(row.resetsAt,row.minutes,{now,locale:getLocale()});
 const detail=[row.description,reset].filter(Boolean).join(' · ');
 const value=t('{percent}% used',{percent:Math.round(row.used).toLocaleString(getLocale())});
 return <div className="su-row" data-variant={row.variant}>
  <div className="su-row-copy"><div id={title}>{row.label}</div>{detail&&<p id={description}>{detail}</p>}</div>
  <div className="su-meter" role="meter" aria-labelledby={title} aria-describedby={detail?description:undefined}
   aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.used} aria-valuetext={value} data-empty={row.used===0||undefined}>
   {row.used>0&&<div className="su-indicator" style={{'--usage-percent':`${row.used.toFixed(1)}%`}}/>}
  </div><span className="su-percent" aria-hidden="true">{value}</span>
 </div>;
}
// Daily table cells: a harness day key as "Sep 30" / "9月30日" in the app's locale (home-model formatDayKey, UTC so the key's day is kept;
// any other text stays as data) and grouped token counts.
const dayCell=key=>/^\d{4}-\d{2}-\d{2}$/.test(key)?formatDayKey(key,getLocale()):key;
const tokenCount=value=>new Intl.NumberFormat(getLocale()).format(value);
// A core's token breakdown (account/usage/read `deepseek` or the core-neutral `breakdown`, usage-cost-model.mjs) in
// the home stats tiles' language (source-home.css .sh-tile: alpha-2 surface, muted label, tabular value). Costs are
// estimates in the source's currency; a source without prices (cost.priced false) shows tokens only.
function CostTile({tile,cost}) {
 const money=formatMoney(tile.cost,cost.currency,getLocale());
 return <div className="su-tile" data-key={tile.key}>
  <span className="su-tile-label">{tile.label}</span>
  <span className="su-tile-value text-title-semibold" title={t('{count} tokens',{count:formatTokenCount(tile.tokens,getLocale())})}>{compactTokens(tile.tokens)}<span className="su-tile-unit"> {t('tokens')}</span></span>
  {cost.priced&&<span className="su-tile-cost">{tile.cost===null?money:`≈ ${money}`}{tile.partial&&<span title={t('Includes models without a published price')}>+</span>}</span>}
 </div>;
}
function CostBreakdown({cost}) {
 const money=value=>cost.priced&&<span className="su-legend-cost">{formatMoney(value,cost.currency,getLocale())}</span>;
 return <div className="su-cost-panels">
  <section className="su-panel" aria-label={cost.priced?t('Where the cost goes'):t('Where the tokens go')}>
   <div className="su-panel-heading"><h4 className="text-body-semibold">{cost.priced?t('Where the cost goes'):t('Where the tokens go')}</h4><span>{t('All time')}</span></div>
   <div className="su-stack" aria-hidden="true">{cost.categories.filter(entry=>entry.share>0).map(entry=><i key={entry.key} data-key={entry.key} style={{flexGrow:entry.share}}/>)}</div>
   <ul className="su-legend">{cost.categories.map(entry=><li key={entry.key} data-key={entry.key}>
    <span className="su-swatch" aria-hidden="true"/><span className="su-legend-name">{entry.label}</span>
    <span className="su-legend-tokens" title={t('{count} tokens',{count:formatTokenCount(entry.tokens,getLocale())})}>{compactTokens(entry.tokens)}</span>{money(entry.cost)}
   </li>)}</ul>
  </section>
  <section className="su-panel" aria-label={t('By model')}>
   <div className="su-panel-heading"><h4 className="text-body-semibold">{t('By model')}</h4><span>{t('All time')}</span></div>
   <ul className="su-models">{cost.models.map(entry=><li key={entry.key}>
    <span className="su-legend-name" title={entry.key}>{entry.name}</span>
    <span className="su-bar" aria-hidden="true"><i style={{width:`${(entry.share*100).toFixed(1)}%`}}/></span>
    <span className="su-legend-tokens" title={t('{count} tokens',{count:formatTokenCount(entry.tokens,getLocale())})}>{compactTokens(entry.tokens)}</span>{money(entry.cost)}
   </li>)}</ul>
  </section>
 </div>;
}
// The footnote: DeepSeek's own estimate wording (official or custom prices) with its Platform link for the `deepseek`
// source; a neutral estimate note for another priced source; none for tokens only.
function CostFootnote({cost,onOpenLink}) {
 if(cost.source==='deepseek')return <p className="su-footnote">{t(cost.customPrices?CUSTOM_COST_FOOTNOTE:COST_FOOTNOTE)}{' '}{cost.partial&&t('Models without a published price count tokens but no cost.')+' '}
  {onOpenLink&&cost.usageUrl&&<button type="button" className="su-link" onClick={()=>onOpenLink(cost.usageUrl)}>{t('DeepSeek Platform usage')}</button>}</p>;
 if(!cost.priced)return null;
 return <p className="su-footnote">{t('Costs are estimates from the prices the core records; your provider’s bill is authoritative.')}{cost.partial&&' '+t('Models without a published price count tokens but no cost.')}</p>;
}
// c71860c77-29nOu6oI W: 'Time range' (7d / 30d / 90d, B) over the core's per-day history, and on a priced source the
// 'Chart metric' Tokens / Cost (M), Cost disabled while no day in the range has an estimate. The metric sets what the
// per-day bars measure; both columns stay. onRange/onMetric absent: the 30-day table alone (as before).
export function CostUsage({cost,onOpenLink,onRange,metric='tokens',onMetric}) {
 const used=cost.tiles[0].tokens>0,range=cost.range??30;
 const shown=cost.dailyPriced&&metric==='cost'?'cost':'tokens';
 const empty=range===30?(cost.source==='deepseek'?t('No DeepSeek usage in the last 30 days.'):t('No usage in the last 30 days.'))
  :(cost.source==='deepseek'?t('No DeepSeek usage in the last {days} days.',{days:range}):t('No usage in the last {days} days.',{days:range}));
 return <>
  <div className="su-tiles">{cost.tiles.map(tile=><CostTile key={tile.key} tile={tile} cost={cost}/>)}</div>
  {used&&<CostBreakdown cost={cost}/>}
  <section className="su-section su-days-section" aria-label={t('Daily token usage')} data-metric={shown}>
   <div className="su-panel-heading"><h3 className="text-heading-semibold">{range===30?t('Last 30 days'):t('Last {days} days',{days:range})}</h3><span>{cost.priced?t('Tokens · est. cost'):t('Tokens')}</span></div>
   {(onRange||(cost.priced&&onMetric))&&<div className="su-days-controls">
    {cost.priced&&onMetric&&<SourceSegments label={t('Chart metric')} value={shown} onChange={onMetric}
     options={[{value:'tokens',label:t('Tokens')},{value:'cost',label:t('Cost'),disabled:!cost.dailyPriced}]}/>}
    {onRange&&<SourceSegments className="su-range" label={t('Time range')} value={range} onChange={value=>onRange(Number(value))}
     options={USAGE_RANGE_DAYS.map(days=>({value:days,label:t('{days}d',{days})}))}/>}
   </div>}
   {cost.daily.length?<table className="su-days"><thead className="su-days-head"><tr><th scope="col">{t('Date')}</th><th scope="col">{t('Share')}</th><th scope="col">{t('Tokens')}</th>{cost.priced&&<th scope="col">{t('Estimated cost')}</th>}</tr></thead>
    <tbody>{cost.daily.map(day=><tr key={day.date}><td className="su-day-date">{day.label}</td><td className="su-day-bar" aria-hidden="true"><span className="su-bar"><i style={{width:`${((shown==='cost'?day.costShare??0:day.share)*100).toFixed(1)}%`}}/></span></td>
     <td className="su-day-tokens" title={t('{count} tokens',{count:formatTokenCount(day.tokens,getLocale())})}>{compactTokens(day.tokens)}</td>{cost.priced&&<td className="su-day-cost">{formatMoney(day.cost,cost.currency,getLocale())}</td>}</tr>)}</tbody></table>
    :<p className="su-empty">{empty}</p>}
  </section>
  <CostFootnote cost={cost} onOpenLink={onOpenLink}/>
 </>;
}
// A bare all-time spend a core reports without a breakdown (usageSpendPresentation), in the limits layout.
export function SpendSection({spend,engine}) {
 const value=`≈ ${formatMoney(spend.allTime,spend.currency,getLocale())}`;
 return <section className="su-section" aria-label={t('Estimated spend')}>
  <div className="su-section-heading"><h3 className="text-heading-semibold">{t('Estimated spend')}</h3><strong>{value}</strong></div>
  <p>{t('All time, from the prices {core} records. Your provider’s bill is authoritative.',{core:coreName(engine)})}</p>
 </section>;
}
// A limit-reached or credits notice (usage-model usageLimitNotice) above the meters: Claude's inline callout, with
// Codex's remedies as buttons: use an earned reset, or (a workspace member) ask the owner for credits or a higher limit.
const NUDGE_RESULTS={credits:{sent:'Workspace owner notified.',cooldown_active:'Workspace owner was already notified recently.',error:'Couldn’t notify your workspace owner. Try again.'},
 usage_limit:{sent:'Limit increase requested.',cooldown_active:'A limit increase was already requested recently.',error:'Couldn’t request a limit increase. Try again.'}};
export function UsageNotice({notice,canReset,onReset,onNudge}) {
 // done: the owner has the request (sent, or already within Codex's cooldown), so the button is spent; an error can retry.
 const [nudge,setNudge]=useState({busy:false,message:'',done:false});
 const send=async()=>{setNudge({busy:true,message:'',done:false});let result='error';try{const value=await onNudge(notice.nudge);if(['sent','cooldown_active'].includes(value?.status))result=value.status;}catch{}setNudge({busy:false,message:t(NUDGE_RESULTS[notice.nudge][result]),done:result!=='error'});};
 return <div className="su-notice" role="status" data-tone={notice.tone} data-kind={notice.kind}>
  <div className="su-notice-copy"><strong className="text-body-semibold">{notice.title}</strong><p>{notice.body}</p>{nudge.message&&<p className="su-notice-result">{nudge.message}</p>}</div>
  {((notice.reset&&canReset)||(notice.nudge&&onNudge))&&<div className="su-notice-actions">
   {notice.reset&&canReset&&<SourceSettingsButton size="sm" onClick={onReset}>{t('Use a reset…')}</SourceSettingsButton>}
   {notice.nudge&&onNudge&&<SourceSettingsButton size="sm" busy={nudge.busy} disabled={nudge.done} onClick={()=>{if(!nudge.busy&&!nudge.done)void send();}}>{notice.nudge==='credits'?t('Notify owner'):t('Request increase')}</SourceSettingsButton>}
  </div>}
 </div>;
}
// Codex credits (CreditsSnapshot + SpendControlLimitSnapshot) as Claude's 'Usage credits' group: the balance with
// 'Current balance' beneath, then the monthly credit limit as a meter row ('{used} of {limit} credits used').
export function CreditsSection({entry}) {
 const {credit,spend}=entry,name=credit?.name??spend?.name??null;
 const now=useMinuteNow(),spendReset=spend?usageResetCountdown(spend.resetsAt,null,{now,locale:getLocale()}):null;
 const title=name?t('{name} usage credits',{name}):t('Usage credits');
 const caption=credit?.state==='unlimited'?t('Your plan includes unlimited credits.'):credit?.state==='none'?t('No credits are available for this account.'):credit?t('Current balance'):null;
 return <section className="su-section su-credits" aria-label={title}>
  <div className="su-section-heading"><h3 className="text-heading-semibold">{title}</h3>{credit&&<strong data-state={credit.state}>{credit.balance}</strong>}</div>
  {caption&&<p>{caption}</p>}
  {spend&&(spend.percent===null
   ?<p className="su-credit-limit">{t('Monthly credit limit')}: {spend.detail}{spendReset?` · ${spendReset}`:''}</p>
   :<div className="su-limits su-credit-limit"><UsageRow row={{key:spend.key,label:t('Monthly credit limit'),used:spend.percent,minutes:null,resetsAt:spend.resetsAt,variant:spend.variant,description:spend.detail}}/></div>)}
 </section>;
}
// Earned usage-limit resets (codex-rs tui chatwidget/usage.rs: Usage › Redeem usage limit reset → pick → 'Use this
// reset?' → account/rateLimitResetCredit/consume with one idempotency key per attempt, reused on Try again). The
// confirmation is inline (the Usage page is itself a dialog); Cancel takes focus first, as Codex selects 'No, go back'.
const newKey=()=>globalThis.crypto?.randomUUID?.()??`${Date.now().toString(16)}-${Math.random().toString(16).slice(2,10)}`;
export function ResetCreditsSection({summary,eligible,open,onOpen,onClose,onConsume,onConsumed,refreshing}) {
 const [choice,setChoice]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null);
 const attempt=useRef(null),cancelRef=useRef(null),startRef=useRef(null),headingId=useId(),wasOpen=useRef(false);
 const options=summary.options,picked=options[Math.min(choice,options.length-1)]??null;
 useEffect(()=>{if(open){setChoice(0);setError('');attempt.current=null;cancelRef.current?.focus();}else if(wasOpen.current)startRef.current?.focus();wasOpen.current=open;},[open]);
 const confirm=async()=>{
  if(busy||!picked)return;
  attempt.current??={key:newKey(),creditId:picked.creditId};setBusy(true);setError('');
  try{
   const value=await onConsume({idempotencyKey:attempt.current.key,...(attempt.current.creditId?{creditId:attempt.current.creditId}:{})});
   const outcome=value?.outcome,named=!!attempt.current.creditId;attempt.current=null;
   if(outcome==='reset'||outcome==='alreadyRedeemed'){setResult('reset');onClose();onConsumed();}
   else if(outcome==='nothingToReset'){setResult('nothing');onClose();}
   else if(outcome==='noCredit'){setResult(named?'gone':'none');onClose();onConsumed();}
   else throw Error('unexpected outcome');
  }catch{setError(t('Couldn’t reset usage. Try again.'));}
  finally{setBusy(false);}
 };
 const message=result==='reset'?(refreshing?t('Usage reset. Checking your remaining resets…'):tn(summary.available,'Usage reset. You have {count} usage limit reset left.','Usage reset. You have {count} usage limit resets left.'))
  :result==='nothing'?t('Your usage doesn’t need a reset right now.'):result==='gone'?t('That reset is no longer available. Your current resets are shown above.'):result==='none'?t('No usage limit resets are available.'):'';
 return <section className="su-section su-resets" aria-label={t('Usage limit resets')}>
  <div className="su-section-heading"><h3 className="text-heading-semibold">{t('Usage limit resets')}</h3><strong>{summary.available.toLocaleString(getLocale())}</strong></div>
  <p>{summary.available>0?tn(summary.available,'You have {count} usage limit reset available. A reset clears your current usage limits right away.','You have {count} usage limit resets available. A reset clears your current usage limits right away.'):t('No usage limit resets available.')}</p>
  {!open&&<div className="su-reset-start"><SourceSettingsButton ref={startRef} disabled={!eligible||summary.available===0} onClick={()=>{setResult(null);onOpen();}}>{t('Use a reset…')}</SourceSettingsButton>{!eligible&&summary.available>0&&<span className="su-reset-hint">{t('Sign in with ChatGPT to use a reset.')}</span>}</div>}
  {open&&<div className="su-reset-confirm" role="group" aria-labelledby={headingId} onKeyDown={event=>{if(event.key==='Escape'&&!busy){event.preventDefault();event.stopPropagation();onClose();}}}>
   <h4 id={headingId} className="text-body-semibold">{t('Use this reset?')}</h4>
   {options.length>1?<div className="su-reset-options" role="radiogroup" aria-label={t('Available resets')}>{options.map((option,index)=><label key={option.creditId??index} className="su-reset-option" data-checked={index===choice||undefined}>
     <input type="radio" name={headingId} checked={index===choice} disabled={busy} onChange={()=>{setChoice(index);attempt.current=null;}}/>
     <span className="su-reset-option-copy"><span className="su-reset-option-title">{option.title}</span>{option.detail&&<span className="su-reset-option-detail">{option.detail}</span>}<span className="su-reset-option-detail">{option.description}</span></span>
    </label>)}</div>
   :picked&&<div className="su-reset-option" data-single=""><span className="su-reset-option-copy"><span className="su-reset-option-title">{picked.title}</span>{picked.detail&&<span className="su-reset-option-detail">{picked.detail}</span>}<span className="su-reset-option-detail">{picked.description}</span></span></div>}
   <p className="su-reset-note">{t('This uses one earned reset and can’t be undone.')}</p>
   {error&&<p className="su-reset-error" role="alert">{error}</p>}
   <div className="su-reset-actions"><SourceSettingsButton ref={cancelRef} disabled={busy} onClick={onClose}>{t('Cancel')}</SourceSettingsButton><SourceSettingsButton variant="primary" busy={busy} onClick={()=>void confirm()}>{error?t('Try again'):t('Use reset')}</SourceSettingsButton></div>
  </div>}
  {message&&<p className="su-reset-result" role="status">{message}</p>}
 </section>;
}
// Tokens OpenClaude Desktop counted on this Mac (usage-model localUsagePresentation), for a core that reports no usage of its
// own: by model, then per day, with the total. Its provider's bill may differ, and the note says so.
// modelNames: the core's model/list ids → displayName, so a row reads as the model menu does (the id stays in the tooltip).
export function LocalUsage({local,modelNames}) {
 return <section className="su-section" aria-label={t('Tokens counted on this Mac')} data-local-usage="">
  <h3 className="text-heading-semibold">{t('Tokens counted on this Mac')}</h3>
  <p className="su-note">{t('Counted by OpenClaude Desktop from your sessions on this Mac. Your provider’s bill may differ.')}</p>
  <ul className="su-models su-local-models">{local.models.map(entry=><li key={entry.model}>
   <span className="su-legend-name" title={entry.model}>{modelNames?.get(entry.model)||entry.model}</span>
   <span className="su-meter" aria-hidden="true"><span className="su-indicator" style={{'--usage-percent':`${(entry.share*100).toFixed(1)}%`}}/></span>
   <span className="su-legend-tokens" title={t('{count} tokens',{count:formatTokenCount(entry.tokens,getLocale())})}>{compactTokens(entry.tokens)}</span>
  </li>)}</ul>
  {local.daily.length>0&&<table className="su-daily"><caption className="su-local-caption">{t(local.dailyLabel)}</caption><thead><tr><th scope="col">{t('Date')}</th><th scope="col">{t('Tokens')}</th></tr></thead>
   <tbody>{local.daily.map(bucket=><tr key={bucket.startDate}><td>{dayCell(bucket.startDate)}</td><td>{tokenCount(bucket.tokens)}</td></tr>)}</tbody>
   <tfoot><tr><th scope="row">{t('All time')}</th><td>{tokenCount(local.total)}</td></tr></tfoot></table>}
 </section>;
}
// A core's daily token usage that failed to load. One state per section (Claude's usage page never shows raw backend
// text): nothing when a daily view is drawn anyway (the core's buckets, the cost view or the counted-on-this-Mac
// fallback), else a translated line naming the core, with its own reason in the tooltip.
export function TokenUsageNote({error,shown,engine}) {
 if(!error||shown)return null;
 return <p className="su-note" title={usageErrorText(error)}>{t('Couldn’t load daily usage from {core}.',{core:coreName(engine)})}</p>;
}
// The parent keys this component by account/connection; each request also has
// The core the usage copy describes: engine, plus perTokenBilling when this answer says so. main marks a per-token
// account's refused limits (or usage) with codeDesktop.perTokenBilling (account-operations perTokenRefusal); main.jsx
// copies it into boot.core too, but that lands a render later, so the page reads it from the answer itself.
export function usageCore(engine,data) {
 const marked=[data?.limits,data?.tokenUsage].some(part=>part?.codeDesktop?.perTokenBilling===true);
 if(!marked)return engine;
 const core=engine&&typeof engine==='object'?engine:{engine:typeof engine==='string'&&engine?engine:'codex'};
 return {...core,capabilities:{...(core.capabilities??{}),perTokenBilling:true}};
}
// an unmount fence. An inline callback changing identity must not refetch forever. engine: the running core (boot.core,
// whose reported capabilities win, or its id) for the empty-limits copy and the spend note.
// Model ids a core's model/list names (displayName, else the id), for the local usage rows.
export function usageModelNames(models) {
 const names=new Map();
 for(const entry of Array.isArray(models)?models:[]){
  const name=typeof entry?.displayName==='string'&&entry.displayName.trim()?entry.displayName.trim():null;
  if(!name)continue;
  for(const id of [entry.model,entry.id])if(typeof id==='string'&&id&&!names.has(id))names.set(id,name);
 }
 return names;
}
export function SourceUsage({readUsage,engine:runningCore,onOpenLink,consumeResetCredit,sendCreditsNudge,models}) {
 const [data,setData]=useState(null),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0),[failure,setFailure]=useState(''),[updatedAt,setUpdatedAt]=useState(null);
 const reader=useRef(readUsage);reader.current=readUsage;
 useEffect(()=>{
  let alive=true;setBusy(true);setFailure('');
  Promise.resolve().then(()=>{if(typeof reader.current!=='function')throw Error(t('Reconnect to load account usage limits.'));return reader.current();})
   .then(value=>{if(alive){setData(value);setUpdatedAt(Date.now());}})
   .catch(error=>{if(alive)setFailure(error instanceof Error?error.message:String(error));})
   .finally(()=>{if(alive)setBusy(false);});
  return()=>{alive=false;};
 },[revision]);
 const [resetOpen,setResetOpen]=useState(false);
 // W r / y: the time range (30 days first) and the chart metric, kept while the page is open.
 const [range,setRange]=useState(30),[metric,setMetric]=useState('tokens');
 const todayKey=localDayKey(new Date());
 const engine=usageCore(runningCore,data);
 const {rows,credits,spending,resetCredits,notice,plan,daily,dailyLabel,lifetimeTokens}=usagePresentation(data,{todayKey,core:coreName(engine),locale:getLocale()});
 const cost=usageCostPresentation(data,{todayKey,locale:getLocale(),days:range}),spend=cost?null:usageSpendPresentation(data);
 // No buckets from the core: what OpenClaude Desktop counted on this Mac (Home's stats), labelled as such.
 const local=!cost&&!daily.length?localUsagePresentation(data?.localStats,{todayKey}):null;
 // One credits group per bucket: its balance and its monthly credit limit together.
 const creditGroups=[];for(const credit of credits)creditGroups.push({key:credit.key,credit,spend:spending.find(entry=>entry.key===credit.key)??null});
 for(const entry of spending)if(!credits.some(credit=>credit.key===entry.key))creditGroups.push({key:entry.key,credit:null,spend:entry});
 // Codex offers a reset only to a ChatGPT sign-in (usage_menu_params reset_eligible = has_chatgpt_account).
 const resetEligible=data?.account?.account?.type==='chatgpt'&&typeof consumeResetCredit==='function';
 return <section className="source-usage" aria-label={t('Your usage')} aria-busy={busy} data-cost={cost?true:undefined}>
  <div className="su-heading"><h3 className="text-heading-semibold">{t('Your usage')}</h3>{plan&&<span>{plan}</span>}</div>
  {notice&&data&&<UsageNotice notice={notice} canReset={resetEligible&&(resetCredits?.available??0)>0} onReset={()=>setResetOpen(true)} onNudge={typeof sendCreditsNudge==='function'?sendCreditsNudge:undefined}/>}
  {busy&&!data?<div className="su-loading" role="status"><span>{t('Loading usage limits')}</span>{[0,1,2].map(i=><div className="su-skeleton" aria-hidden="true" key={i}><i/><i/></div>)}</div>:<>
   {cost?rows.length>0&&<div className="su-limits">{rows.map(row=><UsageRow key={row.key} row={row}/>)}</div>
    :<div className="su-limits">{rows.map(row=><UsageRow key={row.key} row={row}/>)}{!rows.length&&<p className="su-empty">{usageEmptyText(engine)}</p>}</div>}
   {cost&&<CostUsage cost={cost} onOpenLink={onOpenLink} onRange={setRange} metric={metric} onMetric={setMetric}/>}
   {spend&&<SpendSection spend={spend} engine={engine}/>}
   {creditGroups.map(entry=><CreditsSection key={entry.key} entry={entry}/>)}
   {resetCredits&&<ResetCreditsSection summary={resetCredits} eligible={resetEligible} open={resetOpen} onOpen={()=>setResetOpen(true)} onClose={()=>setResetOpen(false)}
    onConsume={consumeResetCredit} refreshing={busy} onConsumed={()=>{setBusy(true);setFailure('');setRevision(r=>r+1);}}/>}
   {/* The bridge's daily buckets, newest first over the last 30 days (catalog Rfvi9/BMNS), with the all-time total. */}
   {!cost&&daily.length>0&&<section className="su-section" aria-label={t('Daily token usage')}><h3 className="text-heading-semibold">{t(dailyLabel)}</h3><table className="su-daily"><thead><tr><th scope="col">{t('Date')}</th><th scope="col">{t('Tokens')}</th></tr></thead><tbody>{daily.map((bucket,index)=><tr key={`${bucket.startDate}:${index}`}><td>{dayCell(bucket.startDate)}</td><td>{tokenCount(bucket.tokens)}</td></tr>)}</tbody>
    {lifetimeTokens!==null&&<tfoot><tr><th scope="row">{t('All time')}</th><td>{tokenCount(lifetimeTokens)}</td></tr></tfoot>}</table></section>}
   {local&&<LocalUsage local={local} modelNames={usageModelNames(models)}/>}
  </>}
  {(failure||data?.error)&&<p className="su-error" role="alert">{usageErrorText(failure||data.error)}{failure&&data?' '+t('Showing the previous usage snapshot.'):''}</p>}
  <TokenUsageNote error={data?.tokenUsageError} shown={!!cost||daily.length>0||!!local} engine={engine}/>
  {/* Muted 'Last updated: {when}' / 'Last updated: just now' (catalog IZL4XAsgrO / ncXJ+kb4mp) beside Refresh. */}
  <footer className="su-footer">{busy&&data?<span role="status">{t('Refreshing usage…')}</span>:updatedAt!==null&&<span className="su-updated">{t('Last updated:')} <SourceTimestamp dateMs={updatedAt}/></span>}<SourceSettingsButton disabled={busy} onClick={()=>{setBusy(true);setFailure('');setRevision(r=>r+1);}}>{t('Refresh usage')}</SourceSettingsButton></footer>
 </section>;
}
