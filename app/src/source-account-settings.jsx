import React,{useEffect,useRef,useState} from 'react';
import {SourceSettingsButton as Button} from './source-settings-button.jsx';
import {accountSettingsPlan,signInOptions} from './account-settings-model.mjs';
import {signOutConfirmText,engineMajor} from './settings-core-copy.mjs';
import {SourceSelect} from './source-select.jsx';
import {t} from '../electron/i18n/index.mjs';
import {planLabel} from './usage-model.mjs';
import {coreForEngine} from '../electron/core-registry.mjs';
import {signInBrand,keyBrand} from './account-brand-model.mjs';
import {SourceBrandLogo} from './source-brand-logo.jsx';
import {Icon} from './icons';
import {CLAUDE_PROVIDER,claudeAccountEntry,claudeDateText,claudeExpiry,claudeSignInNeed,claudeSignInText} from './claude-signin-model.mjs';
import './source-account-settings.css';

const PENDING_PHASES=['starting','waiting','cancelling'];
// A row's leading mark (SettingRow row.leading): the vendor's logo, or a glyph on the same tile where there is none
// (an API key type brand-logos.mjs has no logo for).
const Mark=({brand,glyph='Key'})=>brand?<SourceBrandLogo brand={brand} size={32}/>:<span className="sbl ss-account-glyph" style={{'--sbl-size':'32px'}} aria-hidden="true"><Icon name={glyph} size={16}/></span>;
// The key type select is as wide as its longest label, within 24–46ch: its menu is as wide as the select, so a
// narrower one cut Qwen Code's "Alibaba Cloud Model Studio key (Hong Kong)" short. A letter is about 0.8ch in the
// interface font and a CJK character 1.7ch; 9ch more for the padding, the caret and the chosen option's check mark.
const keyTypeWidth=labels=>`${Math.min(46,Math.max(24,Math.ceil(9+Math.max(0,...labels.map(label=>[...String(label)].reduce((n,c)=>n+(c.codePointAt(0)>0x2e7f?1.7:.8),0))))))}ch`;
// A row of the same group without a mark keeps the slot, so its copy lines up with the rows that have one.
const NO_MARK=<span aria-hidden="true"/>;

// What a pending sign-in (account-operations login) asks of the user, for Settings › Account and setup's Sign in step:
// a device code to enter; nothing (connecting: the core reuses a sign-in already on this Mac, so there is no page to
// reopen); the tab the agent opened itself (openedByAgent: reopen shows the manual page); else the browser.
export function pendingSignIn(login,core){
  const reopen=login?.connecting?null:login?.openedByAgent?t('Open sign-in page'):t('Open browser');
  const text=login?.userCode?t('Enter this code on the sign-in page.'):login?.connecting?t('Connecting with the sign-in already on this Mac. This can take a minute.')
    :login?.openedByAgent?t('Finish signing in in the browser tab {core} opened.',{core}):t('Finish signing in in your browser.');
  return {text,reopen};
}
// The Claude row's state (claude-signin-model.mjs): signed in as whom and until when, or why it needs a sign-in again
// (attention: shown under the row, and its Sign in becomes the accent 'Sign in again'). Null before Claude is connected.
export function claudeRow(snapshot,now=Date.now()){
  const entry=claudeAccountEntry(snapshot);
  if(!entry)return null;
  const need=claudeSignInNeed(entry,now),expiry=claudeExpiry(entry,now);
  const ends=expiry?claudeDateText(expiry.at):'';
  if(need){
    const again=need.reason!=='missing'&&need.reason!=='tooOld';
    return {state:need.reason,again,description:!again?t('Claude Code isn’t ready.'):need.reason==='signedOut'?t('Claude Code is signed out.'):t('Claude Code’s sign-in has ended.'),attention:claudeSignInText(need.reason,{expiresAt:expiry?.at??null})};
  }
  if(entry.checking)return {state:'checking',description:t('Checking Claude Code’s sign-in…')};
  const who=typeof entry.email==='string'&&entry.email?entry.email:'';
  // Claude Code's subscriptionType ('max', 'pro', 'team'…) as the plan's name.
  const plan=typeof entry.plan==='string'&&entry.plan?entry.plan.charAt(0).toUpperCase()+entry.plan.slice(1):'';
  const signed=who?(plan?t('Signed in as {email} ({plan})',{email:who,plan}):t('Signed in as {email}',{email:who})):t('Signed in with Claude Code');
  if(expiry?.soon)return {state:'soon',again:true,description:signed,attention:claudeSignInText('soon',{expiresAt:expiry.at})};
  return {state:'signedIn',description:ends?t('{account} · sign-in ends {date}',{account:signed,date:ends}):signed};
}
// A browser sign-in's device code (deviceCode: true), unless the running core's version is past deviceCodeBefore
// (OpenCode 2.x signs in to ChatGPT in the browser only).
const offersDeviceCode=(option,engine)=>{
  if(option.deviceCode!==true)return false;
  const before=option.deviceCodeBefore,major=engineMajor(engine);
  return !(Number.isFinite(before)&&major!==null&&major>=before);
};

export function useAccountSettings({snapshot,auth,connected,busy,engine,onLogin,onAccountAction,onRefreshAccount,onOpenExternal}) {
  const [working,setWorking]=useState(null),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
  // An API key form (descriptor login.apiKey): the chosen key type and the typed key.
  const [keyTemplate,setKeyTemplate]=useState(null),[keyValue,setKeyValue]=useState('');
  // Which sign-in row started the pending sign-in (account-operations' login state names no provider), so only that
  // row turns into Open browser / Cancel and says what to do next.
  const [pendingRow,setPendingRow]=useState(null);
  // A sign-in page that ends on a one-time code to paste back (login.acceptsCode: MiMo's manual sign-in).
  const [codeValue,setCodeValue]=useState('');
  const locked=useRef(false),alive=useRef(true),cancelRef=useRef(null),signoutRef=useRef(null),wasConfirm=useRef(false);
  const scope=useRef(null);scope.current={connected,auth,snapshot};
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>setConfirm(false),[snapshot?.account]);
  useEffect(()=>{if(!connected){setConfirm(false);setError('');}},[connected]);
  useEffect(()=>{if(confirm)cancelRef.current?.focus();else if(wasConfirm.current)signoutRef.current?.focus();wasConfirm.current=confirm;},[confirm]);
  const phase=auth?.phase||'idle',login=auth?.login,account=snapshot?.account;
  useEffect(()=>{if(phase==='idle'){setPendingRow(null);setCodeValue('');}},[phase]);
  const waiting=phase==='waiting',active=phase!=='idle';
  async function run(fn,operation){
    if(locked.current)return;locked.current=true;setWorking(operation);setError('');const owner=scope.current;
    try{await fn();return true;}catch(e){if(alive.current&&scope.current.connected&&owner.snapshot===scope.current.snapshot)setError(e.message);return false;}
    finally{locked.current=false;if(alive.current)setWorking(null);}
  }
  const action=operation=>run(()=>onAccountAction({operation}),operation);
  const disabled=!connected||working||active;
  // ks busy owns the active action without replacing its label or disabling
  // the focused native button. Other actions remain genuinely unavailable.
  const refreshing=working==='refresh'||phase==='refreshing';
  const signingOut=working==='logout'||phase==='signingOut';
  const cancelling=working==='cancel'||phase==='cancelling';
  const signInBusy=working==='chatgpt',deviceBusy=working==='chatgptDeviceCode';
  const message=auth?.error||error;
  const alert=message?<p role="alert" className="ss-account-error">{message}</p>:null;
  // What a sign-out left signed in (account-operations notice, e.g. OpenCode 2.x's Claude Code): shown until the next operation.
  const notice=!message&&auth?.notice?<p role="status" className="ss-account-notice">{auth.notice}</p>:null;
  const refreshButton=<Button size="sm" busy={refreshing} disabled={!connected||!onRefreshAccount||!!((working||active)&&!refreshing)} onClick={()=>run(onRefreshAccount,'refresh')}>{t('Refresh')}</Button>;
  // DeepSeek core: one key row (Refresh, Manage keys); no ChatGPT sign-in, sign-out or device code.
  const plan=accountSettingsPlan(snapshot,{engine});
  if(plan.kind==='deepseek')return [{id:'account',label:plan.label,description:plan.description,searchText:`DeepSeek account API key ${plan.description} Manage keys Refresh`,control:<div className="ss-account-controls">
    {refreshButton}
    <Button size="sm" busy={working==='manage'} disabled={!onOpenExternal||!!(working&&working!=='manage')} onClick={()=>run(()=>onOpenExternal(plan.manageUrl),'manage')}>{t('Manage keys')}</Button>
  </div>,below:alert}];
  const options=plan.kind==='bridge'?plan:signInOptions(engine), name=options.name;
  // Who is signed in, Refresh, and a two-step Sign out: account-operations refuses a logout without confirmed:true, and
  // the confirmation says the core's own sign-in on this Mac goes too (signOutConfirmText).
  // A bridge that says its sign-out can't remove this account (ACP codeDesktop.canSignOut false: a Kimi or MiniMax key in the
  // agent's own config, Gemini's GEMINI_API_KEY) gets no Sign out, unless the core's sign-out removes keys (signOutRemovesKeys: Qwen).
  const signOutRemovesKeys=coreForEngine(typeof engine==='string'?engine:engine?.engine).login?.signOutRemovesKeys===true;
  const keptKey=!!account&&account.type==='apiKey'&&snapshot?.codeDesktop?.canSignOut===false&&!signOutRemovesKeys;
  const accountRow=(description,searchText,showAlert=true,leading=null)=>({id:'account',label:t('Account'),description,searchText,...(leading?{leading}:{}),control:<div className="ss-account-controls">
    {refreshButton}
    {account&&onAccountAction&&!keptKey&&<Button ref={signoutRef} size="sm" disabled={disabled||busy||confirm} onClick={()=>setConfirm(true)}>{t('Sign out')}</Button>}
  </div>,below:<>{notice}{keptKey&&<p role="status" className="ss-account-notice">{t('Signing out here can’t remove this key. Remove it where it is set to sign out of {core}.',{core:name})}</p>}{account&&confirm&&!keptKey&&<div className="ss-account-confirm"><p>{signOutConfirmText(engine)}</p><div className="ss-account-controls"><Button ref={cancelRef} size="sm" disabled={!!working||signingOut} onClick={()=>setConfirm(false)}>{t('Cancel')}</Button><Button size="sm" variant="primary" busy={signingOut} disabled={!!(working&&!signingOut)||busy||!connected} onClick={async()=>{if(await run(()=>onAccountAction({operation:'logout',confirmed:true}),'logout'))setConfirm(false);}}>{t('Confirm sign out')}</Button></div></div>}{showAlert&&alert}</>});
  // An API key (descriptor login.apiKey): Get a key beside the label; below it one line with the key type (when there
  // are several), the write-only field and Save key. marked: the row leads with the chosen key type's logo.
  const keyId=(entry,index)=>entry.template??String(index);
  const apiKeyRow=(keys,marked=false)=>{
    const index=Math.max(0,keys.findIndex((entry,i)=>keyId(entry,i)===keyTemplate)), template=keys[index];
    if(!template)return null;
    const save=async()=>{if(await run(()=>onLogin('apiKey',{apiKey:keyValue,...(template.template?{codeDesktop:{template:template.template}}:{})}),'apikey'))setKeyValue('');};
    const canSave=!!connected&&!!onLogin&&!!keyValue.trim()&&!(working||active);
    // The field's hint: the descriptor's own, else the key's name; beside a key type select, which already names it,
    // how such a key starts (keyPrefix, "sk-ant-…") or just "API key".
    const keyPlaceholder=template.keyPlaceholder||(keys.length>1?(template.keyPrefix?`${template.keyPrefix}…`:t('API key')):t(template.label));
    return {id:'apikey',label:t('API key'),searchText:`${name} API key ${keys.map(entry=>entry.label).join(' ')}`,...(marked?{leading:<Mark brand={keyBrand(template)}/>}:{}),
      control:template.keyUrl&&onOpenExternal?<button type="button" className="ss-account-link" onClick={()=>onOpenExternal(template.keyUrl)}>{t('Get a key')} ↗</button>:null,
      below:<form className="ss-account-key" style={{'--ss-key-type-width':keyTypeWidth(keys.map(entry=>t(entry.label)))}} onSubmit={event=>{event.preventDefault();if(canSave)void save();}}>
        {keys.length>1&&<SourceSelect label={t('Key type')} value={keyId(template,index)} items={keys.map((entry,i)=>({value:keyId(entry,i),label:t(entry.label)}))} onChange={setKeyTemplate}/>}
        <input type="password" data-cds="TextInput" className="cds-input cds-reset ss-account-key-input" aria-label={t('API key')} placeholder={keyPlaceholder} value={keyValue} autoComplete="off" spellCheck={false}
          onChange={event=>setKeyValue(event.target.value)}/>
        <Button size="sm" variant="primary" busy={working==='apikey'} disabled={!canSave} onClick={save}>{t('Save key')}</Button>
      </form>};
  };
  if(plan.kind==='bridge'){
    // Bridge core (e.g. ZCode, OpenCode, the ACP agents): who is signed in, its plan, browser sign-ins, device codes and API keys.
    // A key's detail (ACP codeDesktop.detail: "From GEMINI_API_KEY") says where it is set.
    const detail=account?.type==='apiKey'&&typeof snapshot?.codeDesktop?.detail==='string'&&snapshot.codeDesktop.detail.trim()?snapshot.codeDesktop.detail.trim():null;
    const who=account?.email||(account?.type==='apiKey'?(detail?t('Signed in with an API key ({detail})',{detail}):t('Signed in with an API key')):account?t('Signed in'):snapshot==null?t('Account unavailable'):t('Not signed in'));
    // Every row leads with a logo: the core's own on the account row, each sign-in's vendor on its row.
    const coreBrand=coreForEngine(typeof engine==='string'?engine:engine?.engine).brand??null;
    const rows=[accountRow(who,`${name} account Sign out Refresh`,true,<Mark brand={coreBrand} glyph="User"/>)];
    // The core's own next step while nothing is signed in (account/read codeDesktop.hint, e.g. how Qwen Code takes a provider).
    if(!account&&typeof snapshot?.codeDesktop?.hint==='string'&&snapshot.codeDesktop.hint.trim())rows.push({id:'hint',leading:NO_MARK,label:t('How to sign in'),description:t(snapshot.codeDesktop.hint.trim())});
    // planLabel: a Codex PlanType id reads as its product name, 'unknown' (an ACP sign-in without a plan) is no row; a
    // bridge's list of sign-in providers (OpenCode: 'OpenAI, GitHub Copilot') isn't a plan.
    if(planLabel(account?.planType))rows.push({id:'plan',leading:NO_MARK,label:/,\s/.test(account.planType)?t('Signed in with'):t('Plan'),description:planLabel(account.planType)});
    // While a sign-in is pending, the row that started it shows its next step: the one clicked here, else the one
    // account-operations names (login.provider, e.g. a sign-in started from setup); with neither, every row does.
    const startedRow=pendingRow||(login?.provider?`${login.type==='chatgptDeviceCode'?'device':'browser'}-${login.provider}`:null);
    const mine=row=>waiting&&(!startedRow||startedRow===row);
    const start=(row,type,provider)=>{setPendingRow(row);return run(()=>onLogin(type,provider?{codeDesktop:{provider}}:{}),row);};
    const next=pendingSignIn(login,name);
    const waitingControls=<>{next.reopen&&<Button size="sm" disabled={!connected||!login?.url} onClick={()=>action('open')}>{next.reopen}</Button>}<Button size="sm" busy={cancelling} onClick={()=>action('cancel')}>{t('Cancel sign-in')}</Button></>;
    const pasteCode=login?.acceptsCode?<form className="ss-account-key ss-account-paste" onSubmit={async event=>{event.preventDefault();if(codeValue.trim()&&await run(()=>onAccountAction({operation:'code',code:codeValue.trim()}),'code'))setCodeValue('');}}>
      <input data-cds="TextInput" className="cds-input cds-reset ss-account-key-input" aria-label={t('Code from the browser')} placeholder={t('If the page shows a code, paste it here')} value={codeValue} autoComplete="off" spellCheck={false}
        onChange={event=>setCodeValue(event.target.value)}/>
      <Button type="submit" size="sm" busy={working==='code'} disabled={!connected||!onAccountAction||!codeValue.trim()||!!(working&&working!=='code')}>{t('Submit code')}</Button>
    </form>:null;
    // One accent button at most: with several ways in, none is the obvious one, and a column of accent buttons shouts.
    const signInVariant=!account&&options.browser.length+options.deviceCode.length===1?'primary':'secondary';
    const codeBelow=row=>mine(row)&&login?.userCode?<code className="ss-account-code" aria-label={t('Sign-in code')}>{login.userCode}</code>:null;
    for(const option of options.browser){
      const key=option.provider||option.type||'browser', row=`browser-${key}`, deviceRow=`device-${key}`;
      const deviceCode=offersDeviceCode(option,engine), pendingHere=mine(row)||(deviceCode&&mine(deviceRow));
      // Claude (OpenCode's claude-agent, the user's own Claude Code): what its sign-in is now, from account/read.
      const claude=key===CLAUDE_PROVIDER?claudeRow(snapshot):null;
      rows.push({id:`signin-${key}`,leading:<Mark brand={signInBrand(option,coreBrand)} glyph="User"/>,label:t(option.label),searchText:`${option.label} sign in${deviceCode?' device code':''}`,
        description:pendingHere?next.text:claude?.description||t('Opens your browser to sign in.'),...(claude?.attention&&!pendingHere?{below:<p role="status" className="ss-account-notice" data-claude-signin={claude.state}>{claude.attention}</p>}:{}),control:<div className="ss-account-controls">
        {/* Sign in comes last, so every row's Sign in sits in one column at the right edge. */}
        {pendingHere?waitingControls:<>
          {deviceCode&&<Button size="sm" variant="ghost" busy={working===deviceRow} disabled={!connected||!onLogin||!!(working||active)} onClick={()=>start(deviceRow,'chatgptDeviceCode',option.provider)}>{t('Use device code')}</Button>}
          <Button size="sm" variant={claude?.attention?'primary':signInVariant} busy={working===row} disabled={!connected||!onLogin||!!(working||active)} onClick={()=>start(row,option.type||'chatgpt',option.provider)}>{claude?.again?t('Sign in again'):t('Sign in')}</Button>
        </>}
      </div>,...(pendingHere||!claude?.attention?{below:<>{codeBelow(deviceRow)}{mine(row)&&pasteCode}</>}:{})});
    }
    options.deviceCode.forEach((option,index)=>{
      const row=`device-${option.provider||index}`, pendingHere=mine(row);
      rows.push({id:`device-${option.provider||index}`,leading:<Mark brand={signInBrand(option,coreBrand)} glyph="User"/>,label:t(option.label),searchText:`${option.label} sign in device code`,
        description:pendingHere?(login?.userCode?t('Enter this code on the sign-in page.'):t('Finish signing in in your browser.')):t('Shows a code to enter on the sign-in page.'),control:<div className="ss-account-controls">
        {pendingHere?waitingControls:<Button size="sm" variant={signInVariant} busy={working===row} disabled={!connected||!onLogin||!!(working||active)}
          onClick={()=>start(row,option.type||'chatgptDeviceCode',option.provider)}>{t('Sign in')}</Button>}
      </div>,below:codeBelow(row)});
    });
    const keyRow=apiKeyRow(options.apiKey,true);
    if(keyRow)rows.push(keyRow);
    return rows;
  }
  // Codex on a custom endpoint (Settings › Models): no ChatGPT account applies, so no Sign in rows (unless one is under way).
  if(plan.customEndpoint&&!PENDING_PHASES.includes(phase))return [{id:'account',label:t('Account'),description:t('Using a custom endpoint (Settings › Models)'),searchText:`${name} account custom endpoint relay Refresh`,control:<div className="ss-account-controls">
    {refreshButton}
  </div>,below:alert}];
  const accountLabel=account?.email || ({chatgpt:t('Connected with ChatGPT'),chatgptAuthTokens:t('Connected with ChatGPT'),apiKey:t('API key authentication'),amazonBedrock:'Amazon Bedrock'})[account?.type] || (account?t('Connected'):snapshot==null?t('Account unavailable'):t('Not signed in'));
  const rows=[accountRow(accountLabel,`${name} account Sign out Refresh`,!!account)];
  if(planLabel(account?.planType))rows.push({id:'plan',label:t('Plan'),description:planLabel(account.planType)});
  if(!account||PENDING_PHASES.includes(phase))rows.push({id:'signin',label:t('Sign in with ChatGPT'),searchText:'Sign in with ChatGPT device code Cancel login',description:phase==='starting'?t('Starting sign-in…'):phase==='cancelling'?t('Cancelling sign-in…'):phase==='refreshing'?t('Checking account…'):waiting?(login?.userCode?t('Enter this code on the sign-in page.'):t('Complete sign-in in your browser.')):t('Sign in through your browser, or use a device code.'),control:<div className="ss-account-controls">
    {waiting||phase==='cancelling'?<><Button size="sm" busy={working==='open'} disabled={!connected||!!(working&&working!=='open')||!waiting||!onAccountAction||!login?.url} onClick={()=>action('open')}>{t('Open browser')}</Button><Button size="sm" busy={cancelling} disabled={!connected||!!(working&&!cancelling)||(!waiting&&!cancelling)||!onAccountAction} onClick={()=>action('cancel')}>{t('Cancel sign-in')}</Button></>:<><Button size="sm" variant="primary" busy={signInBusy} disabled={!connected||!onLogin||!!((working||active)&&!signInBusy)} onClick={()=>run(()=>onLogin('chatgpt'),'chatgpt')}>{t('Sign in')}</Button><Button size="sm" busy={deviceBusy} disabled={!connected||!onLogin||!!((working||active)&&!deviceBusy)} onClick={()=>run(()=>onLogin('chatgptDeviceCode'),'chatgptDeviceCode')}>{t('Use device code')}</Button></>}
  </div>,below:<>{login?.userCode&&<code className="ss-account-code" aria-label={t('Sign-in code')}>{login.userCode}</code>}{!account&&alert}</>});
  // The core's API key sign-in (descriptor login.apiKey, e.g. Codex's OpenAI API key), offered while signed out.
  const keyRow=!account&&!PENDING_PHASES.includes(phase)?apiKeyRow(options.apiKey):null;
  if(keyRow)rows.push(keyRow);
  return rows;
}
