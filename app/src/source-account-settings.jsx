import React,{useEffect,useRef,useState} from 'react';
import {SourceSettingsButton as Button} from './source-settings-button.jsx';
import {accountSettingsPlan,signInOptions} from './account-settings-model.mjs';
import {signOutConfirmText} from './settings-core-copy.mjs';
import {SourceSelect} from './source-select.jsx';
import {t} from '../electron/i18n/index.mjs';
import {planLabel} from './usage-model.mjs';
import './source-account-settings.css';

const PENDING_PHASES=['starting','waiting','cancelling'];

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
  const accountRow=(description,searchText,showAlert=true)=>({id:'account',label:t('Account'),description,searchText,control:<div className="ss-account-controls">
    {refreshButton}
    {account&&onAccountAction&&<Button ref={signoutRef} size="sm" disabled={disabled||busy||confirm} onClick={()=>setConfirm(true)}>{t('Sign out')}</Button>}
  </div>,below:<>{notice}{account&&confirm&&<div className="ss-account-confirm"><p>{signOutConfirmText(engine)}</p><div className="ss-account-controls"><Button ref={cancelRef} size="sm" disabled={!!working||signingOut} onClick={()=>setConfirm(false)}>{t('Cancel')}</Button><Button size="sm" variant="primary" busy={signingOut} disabled={!!(working&&!signingOut)||busy||!connected} onClick={async()=>{if(await run(()=>onAccountAction({operation:'logout',confirmed:true}),'logout'))setConfirm(false);}}>{t('Confirm sign out')}</Button></div></div>}{showAlert&&alert}</>});
  // An API key (descriptor login.apiKey): a key type when there are several, the write-only field and Get a key.
  const keyId=(entry,index)=>entry.template??String(index);
  const apiKeyRow=keys=>{
    const index=Math.max(0,keys.findIndex((entry,i)=>keyId(entry,i)===keyTemplate)), template=keys[index];
    if(!template)return null;
    return {id:'apikey',label:t('API key'),searchText:`${name} API key ${keys.map(entry=>entry.label).join(' ')}`,description:<span className="ss-account-key">
      {keys.length>1&&<SourceSelect label={t('Key type')} value={keyId(template,index)} items={keys.map((entry,i)=>({value:keyId(entry,i),label:t(entry.label)}))} onChange={setKeyTemplate}/>}
      <input type="password" data-cds="TextInput" className="cds-input cds-reset ss-account-key-input" aria-label={t('API key')} placeholder={template.keyPlaceholder||t(template.label)} value={keyValue} autoComplete="off" spellCheck={false}
        onChange={event=>setKeyValue(event.target.value)}/>
      {template.keyUrl&&onOpenExternal&&<button type="button" className="ss-account-link" onClick={()=>onOpenExternal(template.keyUrl)}>{t('Get a key')} ↗</button>}
    </span>,control:<div className="ss-account-controls"><Button size="sm" variant="primary" busy={working==='apikey'} disabled={!connected||!onLogin||!keyValue.trim()||!!(working||active)}
      onClick={async()=>{if(await run(()=>onLogin('apiKey',{apiKey:keyValue,...(template.template?{codeDesktop:{template:template.template}}:{})}),'apikey'))setKeyValue('');}}>{t('Save key')}</Button></div>};
  };
  if(plan.kind==='bridge'){
    // Bridge core (e.g. ZCode, OpenCode, the ACP agents): who is signed in, its plan, browser sign-ins, device codes and API keys.
    const who=account?.email||(account?.type==='apiKey'?t('Signed in with an API key'):account?t('Signed in'):snapshot==null?t('Account unavailable'):t('Not signed in'));
    const rows=[accountRow(who,`${name} account Sign out Refresh`)];
    // The core's own next step while nothing is signed in (account/read codeDesktop.hint, e.g. how Qwen Code takes a provider).
    if(!account&&typeof snapshot?.codeDesktop?.hint==='string'&&snapshot.codeDesktop.hint.trim())rows.push({id:'hint',label:t('How to sign in'),description:t(snapshot.codeDesktop.hint.trim())});
    // planLabel: a Codex PlanType id reads as its product name, 'unknown' (an ACP sign-in without a plan) is no row; a
    // bridge's list of sign-in providers (OpenCode: 'OpenAI, GitHub Copilot') isn't a plan.
    if(planLabel(account?.planType))rows.push({id:'plan',label:/,\s/.test(account.planType)?t('Signed in with'):t('Plan'),description:planLabel(account.planType)});
    // While a sign-in is pending, the row that started it shows its next step: the one clicked here, else the one
    // account-operations names (login.provider, e.g. a sign-in started from setup); with neither, every row does.
    const startedRow=pendingRow||(login?.provider?`${login.type==='chatgptDeviceCode'?'device':'browser'}-${login.provider}`:null);
    const mine=row=>waiting&&(!startedRow||startedRow===row);
    const start=(row,type,provider)=>{setPendingRow(row);return run(()=>onLogin(type,provider?{codeDesktop:{provider}}:{}),row);};
    // login.openedByAgent: the agent opened its own sign-in tab, so the button reopens the manual page instead.
    const waitingControls=<><Button size="sm" disabled={!connected||!login?.url} onClick={()=>action('open')}>{login?.openedByAgent?t('Open sign-in page'):t('Open browser')}</Button><Button size="sm" busy={cancelling} onClick={()=>action('cancel')}>{t('Cancel sign-in')}</Button></>;
    const pasteCode=login?.acceptsCode?<form className="ss-account-key ss-account-paste" onSubmit={async event=>{event.preventDefault();if(codeValue.trim()&&await run(()=>onAccountAction({operation:'code',code:codeValue.trim()}),'code'))setCodeValue('');}}>
      <input data-cds="TextInput" className="cds-input cds-reset ss-account-key-input" aria-label={t('Code from the browser')} placeholder={t('If the page shows a code, paste it here')} value={codeValue} autoComplete="off" spellCheck={false}
        onChange={event=>setCodeValue(event.target.value)}/>
      <Button type="submit" size="sm" busy={working==='code'} disabled={!connected||!onAccountAction||!codeValue.trim()||!!(working&&working!=='code')}>{t('Submit code')}</Button>
    </form>:null;
    const codeBelow=row=>mine(row)&&login?.userCode?<code className="ss-account-code" aria-label={t('Sign-in code')}>{login.userCode}</code>:null;
    for(const option of options.browser){
      const key=option.provider||option.type||'browser', row=`browser-${key}`, deviceRow=`device-${key}`;
      const pendingHere=mine(row)||(option.deviceCode===true&&mine(deviceRow));
      rows.push({id:`signin-${key}`,label:t(option.label),searchText:`${option.label} sign in${option.deviceCode===true?' device code':''}`,
        description:pendingHere?(login?.userCode?t('Enter this code on the sign-in page.'):login?.openedByAgent?t('Finish signing in in the browser tab {core} opened.',{core:name}):t('Finish signing in in your browser.')):t('Opens your browser to sign in.'),control:<div className="ss-account-controls">
        {pendingHere?waitingControls:<>
          <Button size="sm" variant={account?'secondary':'primary'} busy={working===row} disabled={!connected||!onLogin||!!(working||active)} onClick={()=>start(row,option.type||'chatgpt',option.provider)}>{t('Sign in')}</Button>
          {option.deviceCode===true&&<Button size="sm" busy={working===deviceRow} disabled={!connected||!onLogin||!!(working||active)} onClick={()=>start(deviceRow,'chatgptDeviceCode',option.provider)}>{t('Use device code')}</Button>}
        </>}
      </div>,below:<>{codeBelow(deviceRow)}{mine(row)&&pasteCode}</>});
    }
    options.deviceCode.forEach((option,index)=>{
      const row=`device-${option.provider||index}`, pendingHere=mine(row);
      rows.push({id:`device-${option.provider||index}`,label:t(option.label),searchText:`${option.label} sign in device code`,
        description:pendingHere?(login?.userCode?t('Enter this code on the sign-in page.'):t('Finish signing in in your browser.')):t('Shows a code to enter on the sign-in page.'),control:<div className="ss-account-controls">
        {pendingHere?waitingControls:<Button size="sm" variant={account||options.browser.length?'secondary':'primary'} busy={working===row} disabled={!connected||!onLogin||!!(working||active)}
          onClick={()=>start(row,option.type||'chatgptDeviceCode',option.provider)}>{t('Sign in')}</Button>}
      </div>,below:codeBelow(row)});
    });
    const keyRow=apiKeyRow(options.apiKey);
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
